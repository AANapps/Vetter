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

// Run only when Vetter tries a new app out of sight: once it has settled, click every visible control that isn't greyed
// out, one at a time, and report the ones that changed nothing on the page and saved nothing. Native checkboxes, radios,
// selects and text fields are left out, since the browser makes those work on its own
const AUDIT = `<script>
(function () {
  var saves = 0;
  var current = '';
  var errors = [];
  window.addEventListener('error', function (e) { if (current) errors.push(current + ': ' + String(e.message || e).slice(0, 120)); });
  var save = window.vetter.save;
  window.vetter.save = function (s) { saves++; save(s); };
  function label(el) {
    var t = (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').replace(/\\s+/g, ' ').trim();
    return (t || el.tagName.toLowerCase()).slice(0, 40);
  }
  function usable(el) {
    if (el.disabled || el.getAttribute('aria-disabled') === 'true' || el.closest('[aria-disabled="true"],fieldset[disabled]')) return false;
    var r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.45 && cs.pointerEvents !== 'none' && cs.cursor !== 'not-allowed';
  }
  function run() {
    var sel = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="link"], [onclick], summary';
    var els = Array.prototype.slice.call(document.querySelectorAll(sel)).filter(usable).slice(0, 80);
    var dead = [];
    var i = 0;
    function next() {
      if (i >= els.length) {
        current = '';
        parent.postMessage({ source: 'vetter-app', audit: { checked: els.length, dead: dead.slice(0, 20), errors: errors.slice(0, 10) } }, '*');
        return;
      }
      var el = els[i++];
      if (!el.isConnected || !usable(el)) return next();
      var changed = 0;
      var obs = new MutationObserver(function (m) { changed += m.length; });
      obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
      var before = saves;
      var hash = location.hash;
      current = label(el);
      try { el.click(); } catch (e) { errors.push(current + ': ' + String(e && e.message || e).slice(0, 120)); }
      setTimeout(function () {
        obs.disconnect();
        if (!changed && saves === before && location.hash === hash) dead.push(label(el));
        next();
      }, 120);
    }
    next();
  }
  window.addEventListener('load', function () { setTimeout(run, 500); });
})();
</script>`;

// What the page starts with: the work to resume, a save that reports to Vetter, and errors reported too
function bootstrap(saved: unknown) {
  const json = JSON.stringify(saved ?? null).replace(/</g, '\\u003c');
  return `<meta http-equiv="Content-Security-Policy" content="${CSP}">
<style>
/* Whatever the page sets, it scrolls when it's taller or wider than the window, and a sideways swipe at its edge never
   reaches the browser's back gesture */
html, body { overflow: auto !important; overscroll-behavior: none !important; }
* { overscroll-behavior-x: none; }
/* No scroll bars: panels still scroll by wheel, trackpad and touch, but charts and dashboards look clean, without a bar
   down the side of every card */
* { scrollbar-width: none !important; -ms-overflow-style: none !important; }
*::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
</style>
<script>
window.vetterSaved = ${json};
window.vetter = { saved: window.vetterSaved, save: function (state) { parent.postMessage({ source: 'vetter-app', state: JSON.parse(JSON.stringify(state)) }, '*'); } };
window.addEventListener('error', function (e) { parent.postMessage({ source: 'vetter-app', error: String(e.message || e) }, '*'); });
// A link never takes the frame away from the page: in a frame made from text, even href="#" would load Vetter itself.
// In-page links still move the #fragment, and download links still download
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
  if (!a || a.hasAttribute('download')) return;
  var href = a.getAttribute('href') || '';
  if (/^(blob:|data:)/i.test(href)) return;
  e.preventDefault();
  if (href.charAt(0) === '#' && href.length > 1) { try { location.hash = href; } catch (err) {} }
}, true);
</script>`;
}

// The page to load: Vetter's head first, so the policy covers everything the AI wrote. audit adds the control check
export function appDocument(html: string, saved?: unknown, audit = false): string {
  const head = bootstrap(saved) + (audit ? AUDIT : '');
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (tag) => `${tag}\n${head}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${head}</head>`);
  return `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${html}</body></html>`;
}

export type AppAudit = { checked: number; dead: string[]; errors?: string[] };
export type AppMessage = { state?: Record<string, unknown>; error?: string; audit?: AppAudit };

// A message from an app frame, or null for anything else posted to the window
export function readAppMessage(e: MessageEvent, frame: HTMLIFrameElement | null): AppMessage | null {
  if (!frame || e.source !== frame.contentWindow || e.data?.source !== 'vetter-app') return null;
  const audit = e.data.audit && Array.isArray(e.data.audit.dead) ? (e.data.audit as AppAudit) : undefined;
  return { state: e.data.state && typeof e.data.state === 'object' ? e.data.state : undefined, error: e.data.error, audit };
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
// that state mustn't already pass the checks. With audit, every visible control is also clicked to find any that do
// nothing. Resolves with the starting state (and the audit), or why the app was turned down.
export function probeApp(
  html: string,
  checks: { input: string; expectedOutput: string }[],
  timeoutMs = 6000,
  audit = false
): Promise<{ state?: Record<string, unknown>; problem?: string; audit?: AppAudit }> {
  if (typeof document === 'undefined') return Promise.resolve({ problem: 'No browser to try the app in' });
  return new Promise((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1280px;height:800px;border:0;visibility:hidden';
    let done = false;
    let started: Record<string, unknown> | undefined;
    const finish = (result: { state?: Record<string, unknown>; problem?: string; audit?: AppAudit }) => {
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
      // An error once the audit is clicking about is a broken control, not a page that won't load
      if (msg.error && !started) return finish({ problem: `The app hit an error: ${msg.error}` });
      if (msg.audit && started) return finish({ state: started, audit: msg.audit });
      if (!msg.state || started) return;
      const first = msg.state;
      // Wait a moment for errors from code that runs just after the first save
      setTimeout(() => {
        if (done) return;
        const passing = checks.filter((c) => matchesExpected(readPath(first, c.input), c.expectedOutput)).length;
        if (passing === checks.length) return finish({ problem: 'The checks pass before the candidate does anything' });
        started = first;
        if (!audit) finish({ state: first });
      }, 400);
    };
    // The audit clicks up to 80 controls, so it gets longer
    const timer = setTimeout(() => finish(started ? { state: started } : { problem: "The app didn't report its state" }), audit ? Math.max(timeoutMs, 20000) : timeoutMs);
    window.addEventListener('message', onMessage);
    frame.srcdoc = appDocument(html, undefined, audit);
    document.body.appendChild(frame);
  });
}
