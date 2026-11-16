import { runProgram } from './codeRunner';
import { languageById } from './languages';

/**
 * The desktop's Code app: a small JavaScript project (its files, and the tests the candidate can run) and Praxa's own
 * checks, run on the candidate's files when the work is marked. Tests are written with test(name, fn) and
 * expect(value).toBe(expected) / .toEqual(expected) / .toBeCloseTo(expected).
 */

export interface DeskProject {
  name: string;
  // The files, in the order they load; a file named in tests is the candidate's test file
  files: { name: string; content: string; readonly?: boolean }[];
  // The file holding the tests the candidate runs and adds to
  testFile: string;
  // Praxa's checks, run on the candidate's code when marked: each is a test body using the project's functions
  checks?: { id: string; code: string }[];
}

const HARNESS = `
const __results = [];
function expect(actual) {
  const fail = (msg) => { throw new Error(msg); };
  const show = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };
  return {
    toBe: (e) => { if (actual !== e) fail('expected ' + show(e) + ', got ' + show(actual)); },
    toEqual: (e) => { if (show(actual) !== show(e)) fail('expected ' + show(e) + ', got ' + show(actual)); },
    toBeCloseTo: (e, d = 2) => { if (!(Math.abs(actual - e) < Math.pow(10, -d) / 2)) fail('expected about ' + e + ', got ' + show(actual)); },
    toThrow: () => { let threw = false; try { actual(); } catch { threw = true; } if (!threw) fail('expected it to throw'); },
  };
}
function test(name, fn) {
  try { fn(); __results.push({ name, pass: true }); } catch (e) { __results.push({ name, pass: false, error: String(e && e.message || e) }); }
}
`;

export interface TestRun {
  results: { name: string; pass: boolean; error?: string }[];
  error?: string;
}

// The project's code (every file but the test file), then tests: the candidate's own, or Praxa's checks
export async function runDeskTests(project: DeskProject, files: Record<string, string>, which: 'mine' | 'checks'): Promise<TestRun> {
  const code = project.files.filter((f) => f.name !== project.testFile).map((f) => files[f.name] ?? f.content).join('\n;\n');
  const tests = which === 'mine' ? files[project.testFile] ?? project.files.find((f) => f.name === project.testFile)?.content ?? '' : (project.checks ?? []).map((c) => `test(${JSON.stringify(c.id)}, () => {\n${c.code}\n});`).join('\n');
  const program = `${HARNESS}\n${code}\n;\n${tests}\nconsole.log('__RESULTS__' + JSON.stringify(__results));`;
  const [run] = await runProgram(languageById('javascript')!, program, ['']);
  const line = (run?.stdout ?? '').split('\n').find((l) => l.startsWith('__RESULTS__'));
  if (!line) return { results: [], error: run?.error || run?.stderr || 'The code didn’t run.' };
  return { results: JSON.parse(line.slice('__RESULTS__'.length)), error: run.error };
}
