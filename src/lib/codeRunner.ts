import { TestCase } from '../types';
import { CodeExecutionResult } from './codeEngine';
import { Language, sameOutput } from './languages';
import { auth, firebaseEnabled } from './firebase';

/**
 * Runs a whole program in any language against a task's test cases: each case's input on standard input, what it
 * prints compared with the expected output. JavaScript runs in a worker in the browser, Python in Pyodide (Python
 * compiled for the browser, loaded the first time it's needed), and every other language on Granyt's code runner
 * (server/runCode.ts). A program that runs too long is stopped.
 */

export interface ProgramRun {
  stdout: string;
  stderr: string;
  // Why it didn't finish: a compile error, a crash, running out of time
  error?: string;
  ms: number;
}

const TIME_LIMIT_MS = 8000;
// Pyodide is about 10MB the first time, so the first Python run gets longer
const PYTHON_FIRST_LOAD_MS = 60000;

// --- JavaScript: a worker per run, with Node's ways of reading input (fs.readFileSync(0), readline, process.stdin) ---

const JS_WORKER = `
self.onmessage = async (e) => {
  const { code, input } = e.data;
  const out = [];
  let partial = '';
  const err = [];
  const fmt = (a) => (typeof a === 'string' ? a : (() => { try { return JSON.stringify(a); } catch { return String(a); } })());
  const console = {
    log: (...a) => out.push(partial + a.map(fmt).join(' ')) && (partial = ''),
    info: (...a) => console.log(...a),
    warn: (...a) => err.push(a.map(fmt).join(' ')),
    error: (...a) => err.push(a.map(fmt).join(' ')),
  };
  const lines = input.replace(/\\r\\n?/g, '\\n').replace(/\\n$/, '').split('\\n');
  const readline = {
    createInterface() {
      const handlers = { line: [], close: [] };
      const rl = {
        on(ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); return rl; },
        close() {},
        question(_q, fn) { fn(lines.shift() ?? ''); },
        async *[Symbol.asyncIterator]() { for (const l of lines) yield l; },
      };
      setTimeout(() => { if (input !== '') lines.forEach((l) => handlers.line.forEach((f) => f(l))); handlers.close.forEach((f) => f()); }, 0);
      return rl;
    },
  };
  const process = {
    argv: ['node', 'main.js'],
    env: {},
    exit() { throw { __exit: true }; },
    stdout: { write: (s) => { const parts = (partial + String(s)).split('\\n'); partial = parts.pop(); out.push(...parts); return true; } },
    stderr: { write: (s) => { err.push(String(s)); return true; } },
    stdin: { setEncoding() {}, on(ev, fn) { if (ev === 'data') setTimeout(() => fn(input), 0); if (ev === 'end') setTimeout(fn, 0); return this; }, resume() {} },
  };
  const require = (name) => {
    if (name === 'fs') return { readFileSync: () => input };
    if (name === 'readline') return readline;
    if (name === 'process') return process;
    throw new Error("Module '" + name + "' isn't available in this test");
  };
  let error;
  try {
    // An async function, so the program can use await at the top level as a Node module can
    const AsyncFunction = (async () => {}).constructor;
    const run = new AsyncFunction('console', 'require', 'process', 'module', 'exports', code);
    const module = { exports: {} };
    await run(console, require, process, module, module.exports);
    // Let input handlers and timers finish
    await new Promise((r) => setTimeout(r, 30));
  } catch (x) {
    if (!(x && x.__exit)) error = (x && x.name ? x.name + ': ' : '') + (x && x.message ? x.message : String(x));
  }
  if (partial) out.push(partial);
  self.postMessage({ stdout: out.join('\\n'), stderr: err.join('\\n'), error });
};`;

function runInWorker(source: string, message: unknown, limitMs: number): Promise<Omit<ProgramRun, 'ms'>> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    const worker = new Worker(url);
    const timer = setTimeout(() => {
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ stdout: '', stderr: '', error: `Stopped: it ran for more than ${limitMs / 1000} seconds` });
    }, limitMs);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(e.data);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve({ stdout: '', stderr: '', error: e.message || 'The program crashed' });
    };
    worker.postMessage(message);
  });
}

const runJavaScript = (code: string, input: string) => runInWorker(JS_WORKER, { code, input }, TIME_LIMIT_MS);

// --- Python: one Pyodide worker kept between runs, replaced if a run goes over time ---

const PYODIDE = 'https://cdn.jsdelivr.net/pyodide/v0.27.2/full/';
const PY_WORKER = `
importScripts('${PYODIDE}pyodide.js');
const ready = loadPyodide({ indexURL: '${PYODIDE}' });
self.onmessage = async (e) => {
  const { id, code, input } = e.data;
  const py = await ready;
  // pandas, numpy and the like load the first time a program imports them
  try { await py.loadPackagesFromImports(code); } catch (x) { /* a package Pyodide doesn't have fails at import, below */ }
  const out = [];
  const err = [];
  let given = false;
  py.setStdin({ stdin: () => { if (given) return undefined; given = true; return input; } });
  py.setStdout({ batched: (s) => out.push(s) });
  py.setStderr({ batched: (s) => err.push(s) });
  let error;
  try {
    const globals = py.globals.get('dict')();
    globals.set('__name__', '__main__');
    await py.runPythonAsync(code, { globals });
    globals.destroy();
  } catch (x) {
    const msg = String(x && x.message || x);
    // Keep the last lines of the traceback: the error itself, not Pyodide's internals
    const lines = msg.trim().split('\\n');
    const start = lines.findIndex((l) => l.includes('File "<exec>"'));
    error = (start >= 0 ? lines.slice(start) : lines.slice(-3)).join('\\n');
    if (/SystemExit/.test(msg) && !/SystemExit: [1-9]/.test(msg)) error = undefined;
  }
  self.postMessage({ id, stdout: out.join('\\n'), stderr: err.join('\\n'), error });
};`;

let python: { worker: Worker; loaded: boolean; packages: Set<string> } | null = null;
let nextId = 0;

function runPython(code: string, input: string): Promise<Omit<ProgramRun, 'ms'>> {
  if (!python) {
    const url = URL.createObjectURL(new Blob([PY_WORKER], { type: 'text/javascript' }));
    python = { worker: new Worker(url), loaded: false, packages: new Set() };
  }
  const current = python;
  const id = ++nextId;
  // Loading Python, or a package such as pandas the first time, takes longer than a run
  const wanted = [...code.matchAll(/^\s*(?:import|from)\s+(pandas|numpy|scipy|matplotlib)\b/gm)].map((m) => m[1]);
  const fresh = !current.loaded || wanted.some((p) => !current.packages.has(p));
  const limit = fresh ? PYTHON_FIRST_LOAD_MS : TIME_LIMIT_MS;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      current.worker.terminate();
      if (python === current) python = null;
      resolve({ stdout: '', stderr: '', error: !fresh ? `Stopped: it ran for more than ${limit / 1000} seconds` : "Python couldn't be loaded. Check your connection and run it again." });
    }, limit);
    const onMessage = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      clearTimeout(timer);
      current.loaded = true;
      wanted.forEach((p) => current.packages.add(p));
      current.worker.removeEventListener('message', onMessage);
      resolve({ stdout: e.data.stdout, stderr: e.data.stderr, error: e.data.error });
    };
    current.worker.addEventListener('message', onMessage);
    current.worker.postMessage({ id, code, input });
  });
}

// --- Every other language: Granyt's code runner ---

async function runOnServer(language: Language, code: string, inputs: string[]): Promise<Omit<ProgramRun, 'ms'>[]> {
  const user = firebaseEnabled ? auth().currentUser : null;
  const token = user ? await user.getIdToken().catch(() => '') : '';
  try {
    const res = await fetch('/api/run-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify({ language: language.id, runner: language.runner, code, inputs }),
    });
    const body = (await res.json().catch(() => ({}))) as { runs?: Omit<ProgramRun, 'ms'>[]; error?: string };
    if (!res.ok || !body.runs) {
      const error =
        body.error === 'not-configured'
          ? `${language.label} can't be run on Granyt yet: its code runner isn't set up. Tell the company that set this test.`
          : body.error || `Couldn't run ${language.label} just now. Try again in a moment.`;
      return inputs.map(() => ({ stdout: '', stderr: '', error }));
    }
    return body.runs;
  } catch {
    return inputs.map(() => ({ stdout: '', stderr: '', error: `Couldn't reach Granyt's code runner. Check your connection and try again.` }));
  }
}

// Runs the program once per input
export async function runProgram(language: Language, code: string, inputs: string[]): Promise<ProgramRun[]> {
  if (language.runtime === 'server') {
    const start = performance.now();
    const runs = await runOnServer(language, code, inputs);
    const each = Math.round((performance.now() - start) / Math.max(1, inputs.length));
    return runs.map((r) => ({ ...r, ms: each }));
  }
  const out: ProgramRun[] = [];
  for (const input of inputs) {
    const start = performance.now();
    const run = language.runtime === 'python' ? await runPython(code, input) : await runJavaScript(code, input);
    out.push({ ...run, ms: Math.max(1, Math.round(performance.now() - start)) });
  }
  return out;
}

// A program marked on its test cases, in the same shape as a JavaScript function's results
export async function runProgramTests(language: Language, code: string, testCases: TestCase[]): Promise<CodeExecutionResult> {
  const start = performance.now();
  const runs = await runProgram(language, code, testCases.map((tc) => tc.input ?? ''));
  const testCaseResults = testCases.map((tc, i) => {
    const run = runs[i] ?? { stdout: '', stderr: '', error: 'Not run', ms: 0 };
    const passed = !run.error && sameOutput(run.stdout, tc.expectedOutput ?? '');
    return {
      id: tc.id,
      description: tc.description,
      passed,
      input: tc.input,
      expected: tc.expectedOutput,
      actual: run.stdout,
      executionMs: run.ms,
      ...(run.error && { error: run.error }),
    };
  });
  const passedCount = testCaseResults.filter((r) => r.passed).length;
  const logs = runs.flatMap((r, i) => (r.stderr ? [`[case ${i + 1}] ${r.stderr}`] : []));
  return {
    allPassed: passedCount === testCases.length,
    score: testCases.length ? Math.round((passedCount / testCases.length) * 100) : 100,
    testCaseResults,
    logs,
    totalExecutionTimeMs: Math.round(performance.now() - start),
  };
}

// Whether a language can't be run here at all right now (its runner said it isn't set up), so the AI's checks on its
// own solution can't be trusted either way
export const runnerMissing = (result: CodeExecutionResult) => result.testCaseResults.length > 0 && result.testCaseResults.every((r) => /isn't set up/.test(r.error ?? ''));
