import { Question } from '../types';

/**
 * App simulations: a working copy of a real product's interface (a BI tool, a CRM, an ad platform), written by the AI
 * as one HTML page. It runs in a sandboxed iframe with no network and no access to Vetter, keeps its state in an
 * object, and hands that object to Vetter with vetter.save(state) whenever it changes. The candidate's answer is that
 * state as JSON; each check reads one value from it.
 */

// No requests out of the frame: inline code and styles, Google Fonts, and images made in the page
const CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: blob:; form-action 'none'";

// What the page starts with: the work to resume, a save that reports to Vetter, and errors reported too
function bootstrap(saved: unknown) {
  const json = JSON.stringify(saved ?? null).replace(/</g, '\\u003c');
  return `<meta http-equiv="Content-Security-Policy" content="${CSP}">
<script>
window.vetterSaved = ${json};
window.vetter = { saved: window.vetterSaved, save: function (state) { parent.postMessage({ source: 'vetter-app', state: JSON.parse(JSON.stringify(state)) }, '*'); } };
window.addEventListener('error', function (e) { parent.postMessage({ source: 'vetter-app', error: String(e.message || e) }, '*'); });
</script>`;
}

// The page to load: Vetter's head first, so the policy covers everything the AI wrote
export function appDocument(html: string, saved?: unknown): string {
  const head = bootstrap(saved);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (tag) => `${tag}\n${head}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${head}</head>`);
  return `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${html}</body></html>`;
}

export type AppMessage = { state?: Record<string, unknown>; error?: string };

// A message from an app frame, or null for anything else posted to the window
export function readAppMessage(e: MessageEvent, frame: HTMLIFrameElement | null): AppMessage | null {
  if (!frame || e.source !== frame.contentWindow || e.data?.source !== 'vetter-app') return null;
  return { state: e.data.state && typeof e.data.state === 'object' ? e.data.state : undefined, error: e.data.error };
}

export function parseAppState(answer: string): Record<string, unknown> | null {
  try {
    const state = JSON.parse(answer);
    return state && typeof state === 'object' ? state : null;
  } catch {
    return null;
  }
}

// A value in the state by its path, e.g. "filters.region" or "charts.0.type"
export function readPath(state: unknown, path: string): unknown {
  return path
    .split('.')
    .filter(Boolean)
    .reduce<unknown>((at, key) => (at && typeof at === 'object' ? (at as Record<string, unknown>)[key] : undefined), state);
}

const shown = (v: unknown) => (v === undefined ? '(not set)' : typeof v === 'string' ? v : JSON.stringify(v));
const plain = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// A check's expected value: any of the forms split by "|". Numbers match to 2 decimal places, words ignoring case,
// lists when they hold the same items in any order
export function matchesExpected(actual: unknown, expected: string): boolean {
  return expected.split('|').some((form) => {
    const want = form.trim();
    if (Array.isArray(actual)) {
      let list: unknown;
      try {
        list = JSON.parse(want);
      } catch {
        list = want.split(',');
      }
      if (!Array.isArray(list)) return false;
      const norm = (xs: unknown[]) => xs.map((x) => plain(String(x))).sort();
      return JSON.stringify(norm(actual)) === JSON.stringify(norm(list));
    }
    if (actual === undefined || actual === null) return want === '' || plain(want) === 'null';
    const n = Number(want);
    if (want !== '' && !Number.isNaN(n) && (typeof actual === 'number' || /^-?[\d.]+$/.test(String(actual).trim())))
      return Math.abs(Number(actual) - n) < 0.005;
    return plain(String(actual)) === plain(want);
  });
}

// Every check run on the state the candidate left the app in
export function checkAppState(q: Question, answer: string) {
  const state = parseAppState(answer) ?? {};
  return q.testCases.map((tc) => {
    const actual = readPath(state, tc.input);
    return { id: tc.id, description: tc.description, passed: matchesExpected(actual, tc.expectedOutput), input: tc.input, expected: tc.expectedOutput, actual: shown(actual), executionMs: 0 };
  });
}

// Loads an AI-written app out of sight to see that it runs: it must report its starting state without an error, and
// that state mustn't already pass the checks. Resolves with the starting state, or why the app was turned down.
export function probeApp(html: string, checks: { input: string; expectedOutput: string }[], timeoutMs = 6000): Promise<{ state?: Record<string, unknown>; problem?: string }> {
  if (typeof document === 'undefined') return Promise.resolve({ problem: 'No browser to try the app in' });
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1280px;height:800px;border:0;visibility:hidden';
    let done = false;
    const finish = (result: { state?: Record<string, unknown>; problem?: string }) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      frame.remove();
      resolve(result);
    };
    const onMessage = (e: MessageEvent) => {
      const msg = readAppMessage(e, frame);
      if (!msg) return;
      if (msg.error) return finish({ problem: `The app hit an error: ${msg.error}` });
      if (!msg.state) return;
      // Wait a moment for errors from code that runs just after the first save
      setTimeout(() => {
        const passing = checks.filter((c) => matchesExpected(readPath(msg.state, c.input), c.expectedOutput)).length;
        finish(passing === checks.length ? { problem: 'The checks pass before the candidate does anything' } : { state: msg.state });
      }, 400);
    };
    const timer = setTimeout(() => finish({ problem: "The app didn't report its state" }), timeoutMs);
    window.addEventListener('message', onMessage);
    frame.srcdoc = appDocument(html);
    document.body.appendChild(frame);
  });
}
