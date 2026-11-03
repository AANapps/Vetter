/**
 * Integrity monitoring during a test: what the browser can see the candidate do that might be cheating, and how
 * suspicious it looks overall. The report is saved with the result and shown to the company as a coloured label
 * (green clean → red highly suspicious) that opens to every count. It flags for a person to judge; it never fails
 * anyone on its own.
 */

export type IntegrityEventType =
  | 'tab-hidden'
  | 'window-blur'
  | 'resize'
  | 'split-screen'
  | 'copy'
  | 'cut'
  | 'paste-external'
  | 'paste-internal'
  | 'right-click'
  | 'screenshot-key'
  | 'screens-changed';

export interface IntegrityEvent {
  // Seconds from the start of the test
  t: number;
  type: IntegrityEventType;
  // The question on screen at the time
  questionId?: string;
  detail?: string;
}

export interface IntegrityReport {
  // The tab was hidden: another tab, minimised, or the screen locked
  tabSwitches: number;
  // The window lost focus while still visible: another app or window, often on a second screen
  windowSwitches: number;
  // Seconds away from the test, hidden or unfocused
  secondsAway: number;
  // The window changed size noticeably
  resizes: number;
  // Seconds with the window under 60% of the screen's width, leaving room for something beside it
  secondsSplitScreen: number;
  copies: number;
  cuts: number;
  // Pastes of text that wasn't copied inside the test, and how many characters they brought in
  externalPastes: number;
  pastedCharacters: number;
  // Pastes of text copied inside the test, e.g. moving cells around a spreadsheet; not suspicious
  internalPastes: number;
  rightClicks: number;
  screenshotKeys: number;
  // Screens connected: a number when the browser could count them; extended says more than one, when it could tell
  screens: number | null;
  extendedDisplay: boolean | null;
  // The first events in order, for the timeline
  events: IntegrityEvent[];
}

export const emptyIntegrity = (): IntegrityReport => ({
  tabSwitches: 0,
  windowSwitches: 0,
  secondsAway: 0,
  resizes: 0,
  secondsSplitScreen: 0,
  copies: 0,
  cuts: 0,
  externalPastes: 0,
  pastedCharacters: 0,
  internalPastes: 0,
  rightClicks: 0,
  screenshotKeys: 0,
  screens: null,
  extendedDisplay: null,
  events: [],
});

const MAX_EVENTS = 150;

// ---------- How suspicious it looks ----------

export type IntegrityLevel = 'clean' | 'low' | 'some' | 'suspicious' | 'high';

export const LEVELS: Record<IntegrityLevel, { label: string; text: string; badge: string; dot: string; bar: string }> = {
  clean: { label: 'Clean', text: 'No signs of cheating', badge: 'bg-emerald-50 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500', bar: 'bg-emerald-500' },
  low: { label: 'Low risk', text: 'A little activity, most likely harmless', badge: 'bg-lime-50 text-lime-800 border-lime-300', dot: 'bg-lime-500', bar: 'bg-lime-500' },
  some: { label: 'Some concern', text: 'Worth a look before you rely on the score', badge: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-500', bar: 'bg-amber-500' },
  suspicious: { label: 'Suspicious', text: 'Several signs of outside help', badge: 'bg-orange-50 text-orange-800 border-orange-300', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  high: { label: 'Highly suspicious', text: 'Strong signs of cheating: check before trusting the score', badge: 'bg-rose-50 text-rose-800 border-rose-300', dot: 'bg-rose-600', bar: 'bg-rose-600' },
};

// What each signal adds to the suspicion score, out of 100. Pasting answers in and leaving the test count most
export function suspicionPoints(r: IntegrityReport): { signal: string; points: number }[] {
  const parts = [
    { signal: 'Pasted from outside the test', points: r.externalPastes * 10 + (r.pastedCharacters >= 200 ? 10 : 0) },
    { signal: 'Switched tabs', points: r.tabSwitches * 8 },
    { signal: 'Switched to another window or app', points: r.windowSwitches * 6 },
    { signal: 'Time away from the test', points: Math.min(25, Math.floor(r.secondsAway / 10)) },
    { signal: 'More than one screen', points: r.extendedDisplay || (r.screens ?? 1) > 1 ? 15 : 0 },
    { signal: 'Window sized to leave room beside it', points: Math.min(15, Math.floor(r.secondsSplitScreen / 30) * 3) },
    { signal: 'Resized the window', points: Math.min(12, r.resizes * 3) },
    { signal: 'Copied from the test', points: Math.min(15, (r.copies + r.cuts) * 3) },
    { signal: 'Screenshot key', points: r.screenshotKeys * 8 },
    { signal: 'Right-clicks', points: Math.min(5, r.rightClicks) },
  ];
  return parts.filter((p) => p.points > 0);
}

export const suspicionScore = (r: IntegrityReport) => Math.min(100, suspicionPoints(r).reduce((n, p) => n + p.points, 0));

export const levelFor = (score: number): IntegrityLevel => (score < 10 ? 'clean' : score < 25 ? 'low' : score < 45 ? 'some' : score < 70 ? 'suspicious' : 'high');

// Several tests' reports as one, for an application made of a job's tests
export function combineReports(reports: IntegrityReport[]): IntegrityReport {
  const out = emptyIntegrity();
  for (const r of reports) {
    out.tabSwitches += r.tabSwitches;
    out.windowSwitches += r.windowSwitches;
    out.secondsAway += r.secondsAway;
    out.resizes += r.resizes;
    out.secondsSplitScreen += r.secondsSplitScreen;
    out.copies += r.copies;
    out.cuts += r.cuts;
    out.externalPastes += r.externalPastes;
    out.pastedCharacters += r.pastedCharacters;
    out.internalPastes += r.internalPastes;
    out.rightClicks += r.rightClicks;
    out.screenshotKeys += r.screenshotKeys;
    if (r.screens !== null) out.screens = Math.max(out.screens ?? 0, r.screens);
    if (r.extendedDisplay !== null) out.extendedDisplay = !!out.extendedDisplay || r.extendedDisplay;
  }
  return out;
}

// ---------- Watching a test ----------

type ScreenDetails = { screens: unknown[]; addEventListener: (type: 'screenschange', fn: () => void) => void };

// Counts the screens connected. Chrome and Edge can count them with the candidate's permission (asked once, when they
// press Begin); otherwise most can at least say whether there's more than one
export async function countScreens(ask: boolean): Promise<{ screens: number | null; extended: boolean | null; details?: ScreenDetails }> {
  const scr = window.screen as Screen & { isExtended?: boolean };
  const extended = typeof scr.isExtended === 'boolean' ? scr.isExtended : null;
  const getDetails = (window as Window & { getScreenDetails?: () => Promise<ScreenDetails> }).getScreenDetails;
  if (ask && getDetails) {
    try {
      const details = await getDetails.call(window);
      return { screens: details.screens.length, extended: details.screens.length > 1, details };
    } catch {
      // Permission refused: fall back to what the browser says without it
    }
  }
  return { screens: extended === false ? 1 : null, extended };
}

/**
 * Starts watching. currentQuestion says what's on screen when something happens. Returns a function that stops
 * watching and hands back the report.
 */
export function startIntegrityMonitor(currentQuestion: () => string | undefined, onEvent?: (e: IntegrityEvent, r: IntegrityReport) => void) {
  const report = emptyIntegrity();
  const start = Date.now();
  const now = () => Math.round((Date.now() - start) / 1000);
  const log = (type: IntegrityEventType, detail?: string) => {
    const e: IntegrityEvent = { t: now(), type, questionId: currentQuestion(), ...(detail && { detail }) };
    if (report.events.length < MAX_EVENTS) report.events.push(e);
    onEvent?.(e, report);
  };

  // Away: hidden or unfocused, timed until they're back
  let awaySince: number | null = null;
  const goneAway = () => {
    if (awaySince === null) awaySince = Date.now();
  };
  const cameBack = () => {
    if (awaySince !== null) report.secondsAway += Math.round((Date.now() - awaySince) / 1000);
    awaySince = null;
  };

  // A paste counts as from inside the test when something was copied in the test and the window hasn't lost focus since
  let copiedInside = false;

  const onVisibility = () => {
    if (document.hidden) {
      report.tabSwitches++;
      log('tab-hidden');
      goneAway();
    } else if (document.hasFocus()) cameBack();
  };
  const onBlur = () => {
    // A hidden tab is counted by onVisibility; this is focus moving to another window while the test stays visible.
    // Clicking into the test's own app simulation (an iframe) blurs the window too, but the page still has focus
    setTimeout(() => {
      if (document.hasFocus()) return;
      copiedInside = false;
      goneAway();
      if (!document.hidden) {
        report.windowSwitches++;
        log('window-blur');
      }
    }, 150);
  };
  const onFocus = () => cameBack();

  const onCopy = (cut: boolean) => () => {
    copiedInside = true;
    const chars = window.getSelection()?.toString().length ?? 0;
    if (cut) report.cuts++;
    else report.copies++;
    log(cut ? 'cut' : 'copy', chars ? `${chars} characters` : undefined);
  };
  const onPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData('text/plain') ?? '';
    if (copiedInside) {
      report.internalPastes++;
      log('paste-internal', `${text.length} characters`);
    } else {
      report.externalPastes++;
      report.pastedCharacters += text.length;
      log('paste-external', `${text.length} characters`);
    }
  };
  const onContextMenu = () => {
    report.rightClicks++;
    log('right-click');
  };
  const onKey = (e: KeyboardEvent) => {
    // Print Screen, and the Mac and Windows screenshot shortcuts
    const mac = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key);
    const win = e.metaKey && e.shiftKey && e.key.toLowerCase() === 's';
    if (e.key === 'PrintScreen' || mac || win) {
      report.screenshotKeys++;
      log('screenshot-key');
    }
  };

  // Resizes: one per settled change of more than 10% either way
  let size = { w: window.innerWidth, h: window.innerHeight };
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (Math.abs(w - size.w) / size.w > 0.1 || Math.abs(h - size.h) / size.h > 0.1) {
        report.resizes++;
        log('resize', `${size.w}×${size.h} → ${w}×${h}`);
      }
      size = { w, h };
    }, 400);
  };

  // Split screen: checked every few seconds
  let wasSplit = false;
  const splitTimer = setInterval(() => {
    const split = window.outerWidth < window.screen.availWidth * 0.6;
    if (split) report.secondsSplitScreen += 5;
    if (split && !wasSplit) log('split-screen', `window ${window.outerWidth}px of a ${window.screen.availWidth}px screen`);
    wasSplit = split;
  }, 5000);

  // Screens: counted at the start and whenever one is plugged in or out
  const recordScreens = (s: { screens: number | null; extended: boolean | null }, changed: boolean) => {
    report.screens = s.screens;
    report.extendedDisplay = s.extended;
    if (changed) log('screens-changed', s.screens !== null ? `${s.screens} screens` : s.extended ? 'more than one screen' : 'one screen');
  };
  const onScreenChange = () => countScreens(false).then((s) => recordScreens(s, true));
  countScreens(false).then((s) => recordScreens(s, false));
  (window.screen as Screen & EventTarget).addEventListener?.('change', onScreenChange);

  const copy = onCopy(false);
  const cut = onCopy(true);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  document.addEventListener('copy', copy, true);
  document.addEventListener('cut', cut, true);
  document.addEventListener('paste', onPaste, true);
  document.addEventListener('contextmenu', onContextMenu, true);
  window.addEventListener('keyup', onKey, true);
  window.addEventListener('resize', onResize);

  return {
    report,
    // Called when the candidate allowed screen counting on Begin
    setScreens: (s: { screens: number | null; extended: boolean | null; details?: ScreenDetails }) => {
      recordScreens(s, false);
      s.details?.addEventListener('screenschange', () => recordScreens({ screens: s.details!.screens.length, extended: s.details!.screens.length > 1 }, true));
    },
    stop: (): IntegrityReport => {
      cameBack();
      clearInterval(splitTimer);
      clearTimeout(resizeTimer);
      (window.screen as Screen & EventTarget).removeEventListener?.('change', onScreenChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('copy', copy, true);
      document.removeEventListener('cut', cut, true);
      document.removeEventListener('paste', onPaste, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('resize', onResize);
      return { ...report, events: [...report.events] };
    },
  };
}

// ---------- A job application's sittings ----------

export interface IntegritySitting {
  testTitle: string;
  completedAt: string;
  report: IntegrityReport;
}

type ResultLike = { testId: string; completedAt: string; completedTime?: string; referredBy?: string; integrity?: IntegrityReport };

// What the monitor saw on the tests behind an application: the latest try at each of the job's tests, or when the job
// has none, the tests the candidate took from the company's links
export function jobSittings(results: ResultLike[], job: { testIds: string[]; businessId?: string }, testTitles: Record<string, string> = {}): IntegritySitting[] {
  const ids = job.testIds.length > 0 ? job.testIds : [...new Set(results.filter((r) => r.referredBy && r.referredBy === job.businessId).map((r) => r.testId))];
  return ids.flatMap((id) => {
    const at = (r: ResultLike) => r.completedTime ?? r.completedAt;
    const latest = results
      .filter((r) => r.testId === id && r.integrity)
      .sort((a, b) => at(a).localeCompare(at(b)))
      .at(-1);
    return latest?.integrity ? [{ testTitle: testTitles[id] ?? 'Test', completedAt: at(latest), report: latest.integrity }] : [];
  });
}

// The overall view of one or more sittings: the worst single test counts, as well as everything together
export function integrityOf(sittings: IntegritySitting[]) {
  const combined = combineReports(sittings.map((s) => s.report));
  const score = Math.max(suspicionScore(combined), ...sittings.map((s) => suspicionScore(s.report)));
  return { combined, score, level: levelFor(score) };
}

// An application is rejected automatically, set aside without telling the candidate, when it looks highly suspicious
export const isAutoRejected = (sittings: IntegritySitting[]) => sittings.length > 0 && integrityOf(sittings).level === 'high';

// ---------- Demo data ----------

// A steady, made-up report for a seeded result: most candidates are clean, a few are not
export function seedIntegrity(rand: () => number): IntegrityReport {
  const r = emptyIntegrity();
  const roll = rand();
  const tier = roll < 0.6 ? 0 : roll < 0.8 ? 1 : roll < 0.92 ? 2 : roll < 0.97 ? 3 : 4;
  const n = (max: number) => Math.floor(rand() * (max + 1));
  r.screens = tier >= 3 && rand() < 0.7 ? 2 : 1;
  r.extendedDisplay = r.screens > 1;
  r.tabSwitches = [0, n(1), 1 + n(2), 2 + n(3), 4 + n(5)][tier];
  r.windowSwitches = [0, n(1), n(2), 1 + n(3), 2 + n(4)][tier];
  r.secondsAway = r.tabSwitches * (5 + n(25)) + r.windowSwitches * (3 + n(15));
  r.resizes = [0, n(1), n(2), n(3), 1 + n(3)][tier];
  r.copies = [0, n(1), n(2), 1 + n(2), 2 + n(3)][tier];
  r.externalPastes = [0, 0, n(1), 1 + n(2), 3 + n(4)][tier];
  r.pastedCharacters = r.externalPastes * (20 + n(180));
  r.internalPastes = n(3);
  r.rightClicks = n(tier);
  r.secondsSplitScreen = tier >= 3 ? n(240) : 0;
  return r;
}
