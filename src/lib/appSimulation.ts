import { APP_KIT_CSS } from '../../server/appKit';
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
  // Labels in drawings that can't be read: a filled shape drawn after a label on top of it, two labels on top of each
  // other, or a label running off the edge of its drawing. Checked as the page first shows, before anything is clicked
  var SHAPES = { rect: 1, circle: 1, ellipse: 1, path: 1, polygon: 1, image: 1, use: 1 };
  var SKIP = 'defs, clipPath, mask, marker, pattern, symbol, linearGradient, radialGradient, filter';
  function shown(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      var cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.3) return false;
    }
    return true;
  }
  function overlap(a, b) {
    var w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    var h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  }
  function labelProblems() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll('svg'), function (svg) {
      if (svg.closest(SKIP) || !shown(svg)) return;
      var box = svg.getBoundingClientRect();
      if (box.width < 20 || box.height < 20) return;
      var all = Array.prototype.slice.call(svg.querySelectorAll('*')).filter(function (el) { return !el.closest(SKIP); });
      var texts = [];
      all.forEach(function (el, i) {
        if (el.tagName.toLowerCase() !== 'text' || !shown(el)) return;
        var words = (el.textContent || '').replace(/\\s+/g, ' ').trim();
        var r = el.getBoundingClientRect();
        if (!words || r.width < 2 || r.height < 2) return;
        texts.push({ el: el, i: i, words: words.slice(0, 40), r: r });
      });
      texts.forEach(function (t) {
        var area = t.r.width * t.r.height;
        // Off the edge of the drawing
        var inside = overlap(t.r, box) / area;
        if (inside < 0.85) return out.push('The label "' + t.words + '" runs off the edge of the drawing and is cut off');
        // A filled shape painted over it (drawn later, so on top)
        for (var j = t.i + 1; j < all.length; j++) {
          var el = all[j];
          if (!SHAPES[el.tagName.toLowerCase()] || el.contains(t.el) || !shown(el)) continue;
          var cs = getComputedStyle(el);
          var tag = el.tagName.toLowerCase();
          var painted = tag === 'image' || tag === 'use' || (cs.fill !== 'none' && parseFloat(cs.fillOpacity) > 0.35 && !/rgba\\([^)]*,\\s*0(\\.[0-2])?\\)/.test(cs.fill));
          if (!painted) continue;
          if (overlap(t.r, el.getBoundingClientRect()) / area > 0.35) return out.push('The label "' + t.words + '" is hidden behind a shape drawn on top of it');
        }
        // Two labels on top of each other
        for (var k = 0; k < texts.length; k++) {
          var o = texts[k];
          if (o === t || o.i < t.i || o.el.contains(t.el) || t.el.contains(o.el)) continue;
          if (overlap(t.r, o.r) / Math.min(area, o.r.width * o.r.height) > 0.3) return out.push('The labels "' + t.words + '" and "' + o.words + '" sit on top of each other');
        }
      });
    });
    return out.filter(function (p, i) { return out.indexOf(p) === i; }).slice(0, 12);
  }
  var labels = [];
  function run() {
    try { labels = labelProblems(); } catch (e) {}
    var sel = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], [role="link"], [onclick], summary';
    var els = Array.prototype.slice.call(document.querySelectorAll(sel)).filter(usable).slice(0, 80);
    var dead = [];
    var i = 0;
    function next() {
      if (i >= els.length) {
        current = '';
        parent.postMessage({ source: 'vetter-app', audit: { checked: els.length, dead: dead.slice(0, 20), errors: errors.slice(0, 10), labels: labels } }, '*');
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
<style>${APP_KIT_CSS}</style>
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

// Tips pinned to the app, one at a time: the element marked data-ref="<ref>" gets a glowing ring, and a pop-up beside it
// with the tip and an x to close it, which brings up the next. They follow the element as the page scrolls and changes, hide while it's off screen or on
// another view, and the window's Tips button (a 'vetter-tips' message) brings closed ones back
const callouts = (tips: { ref: string; text: string }[]) => `<style>
#vetter-tips { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; font: 12px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; }
#vetter-tips .vt-ring { position: fixed; border: 2px solid #6366f1; border-radius: 8px; box-shadow: 0 0 0 3px rgba(99,102,241,.25), 0 0 16px 2px rgba(99,102,241,.55); animation: vt-glow 1.8s ease-in-out infinite; }
#vetter-tips .vt-pop { position: fixed; max-width: 240px; pointer-events: auto; display: flex; gap: 8px; align-items: flex-start; padding: 8px 8px 8px 10px; background: #fff; color: #0f172a; border: 2px solid #6366f1; border-radius: 10px; box-shadow: 0 0 0 3px rgba(99,102,241,.2), 0 0 18px rgba(99,102,241,.5), 0 6px 20px rgba(15,23,42,.18); animation: vt-glow 1.8s ease-in-out infinite; }
#vetter-tips .vt-n { flex: none; width: 18px; height: 18px; border-radius: 50%; background: #6366f1; color: #fff; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; }
#vetter-tips .vt-x { flex: none; border: 0; background: none; color: #64748b; font-size: 16px; line-height: 1; padding: 0 2px; cursor: pointer; }
#vetter-tips .vt-x:hover { color: #0f172a; }
@keyframes vt-glow { 50% { box-shadow: 0 0 0 4px rgba(99,102,241,.15), 0 0 24px 4px rgba(99,102,241,.7); } }
</style>
<script>
(function () {
  var tips = ${JSON.stringify(tips).replace(/</g, '\\u003c')};
  var closed = {};
  var layer;
  var lastKey = '';
  function find(ref) {
    var all = document.querySelectorAll('[data-ref]');
    for (var i = 0; i < all.length; i++) if (all[i].getAttribute('data-ref') === ref) return all[i];
    return null;
  }
  function draw() {
    if (!document.body) return;
    if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.id = 'vetter-tips'; document.body.appendChild(layer); }
    var W = window.innerWidth, H = window.innerHeight;
    // Only redrawn when something moved, so the glow keeps pulsing smoothly
    var shown = tips.map(function (t, i) {
      if (closed[t.ref]) return null;
      var el = find(t.ref);
      if (!el) return null;
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return null;
      return { t: t, i: i, r: r };
    });
    // One at a time, in order: closing a tip brings up the next one that's on screen
    var first = shown.findIndex(function (x) { return !!x; });
    shown = shown.map(function (x, j) { return j === first ? x : null; });
    var key = W + 'x' + H + ':' + shown.map(function (s) { return s ? [s.i, Math.round(s.r.left), Math.round(s.r.top), Math.round(s.r.width), Math.round(s.r.height)].join(',') : '-'; }).join('|');
    if (key === lastKey && layer.childNodes.length) return;
    lastKey = key;
    layer.innerHTML = '';
    shown.forEach(function (s) {
      if (!s) return;
      var t = s.t, i = s.i, r = s.r;
      var ring = document.createElement('div');
      ring.className = 'vt-ring';
      ring.style.left = (r.left - 4) + 'px'; ring.style.top = (r.top - 4) + 'px';
      ring.style.width = (r.width + 8) + 'px'; ring.style.height = (r.height + 8) + 'px';
      layer.appendChild(ring);
      var pop = document.createElement('div');
      pop.className = 'vt-pop';
      var n = document.createElement('span'); n.className = 'vt-n'; n.textContent = String(i + 1);
      var text = document.createElement('span'); text.textContent = t.text; text.style.flex = '1';
      var left = tips.filter(function (u) { return !closed[u.ref]; }).length - 1;
      if (left > 0) { var more = document.createElement('span'); more.style.cssText = 'display:block;margin-top:2px;color:#6366f1;font-size:11px;font-weight:600'; more.textContent = 'Close for the next tip (' + left + ' more)'; text.appendChild(more); }
      var x = document.createElement('button'); x.className = 'vt-x'; x.type = 'button'; x.setAttribute('aria-label', 'Close tip'); x.textContent = '\u00d7';
      x.addEventListener('click', function (e) { e.stopPropagation(); closed[t.ref] = true; lastKey = ''; draw(); });
      pop.appendChild(n); pop.appendChild(text); pop.appendChild(x);
      layer.appendChild(pop);
      // Below the element when there's room, otherwise above, otherwise beside it; always inside the window
      var pw = pop.offsetWidth, ph = pop.offsetHeight;
      var top = r.bottom + 10 + ph <= H ? r.bottom + 10 : r.top - 10 - ph >= 0 ? r.top - 10 - ph : Math.min(Math.max(r.top, 4), H - ph - 4);
      var x0 = Math.min(Math.max(r.left, 4), W - pw - 4);
      if (top === Math.min(Math.max(r.top, 4), H - ph - 4) && r.right + 10 + pw <= W) x0 = r.right + 10;
      pop.style.top = top + 'px'; pop.style.left = x0 + 'px';
    });
  }
  var queued = false;
  function soon() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; draw(); }); }
  window.addEventListener('scroll', soon, true);
  window.addEventListener('resize', soon);
  document.addEventListener('click', function () { setTimeout(soon, 50); }, true);
  window.addEventListener('message', function (e) { if (e.data && e.data.source === 'vetter-tips') { closed = {}; lastKey = ''; soon(); } });
  window.addEventListener('load', function () { draw(); setInterval(soon, 700); });
})();
</script>`;

// The page to load: Vetter's head first, so the policy covers everything the AI wrote. audit adds the control check;
// tips adds the pop-ups pinned to the page
export function appDocument(html: string, saved?: unknown, audit = false, tips?: { ref: string; text: string }[]): string {
  const head = bootstrap(saved) + (audit ? AUDIT : '') + (tips?.length ? callouts(tips) : '');
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (tag) => `${tag}\n${head}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (tag) => `${tag}<head>${head}</head>`);
  return `<!doctype html><html><head><meta charset="utf-8">${head}</head><body>${html}</body></html>`;
}

export type AppAudit = { checked: number; dead: string[]; errors?: string[]; labels?: string[] };
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
