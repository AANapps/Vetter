/**
 * Taking a library test before signing up: a visitor picks a test and starts straight away. The marked result is kept
 * in this browser (not shown) until they create an account, then saved to their new profile like any other result.
 */
import { AssessmentTest, ResultBreakdown } from '../types';
import type { IntegrityReport } from './integrity';
import { languageById } from './languages';

export interface GuestResult {
  testId: string;
  testTitle: string;
  score: number;
  durationSeconds: number;
  startedAt: string;
  completedTime: string;
  integrity?: IntegrityReport;
  breakdown?: ResultBreakdown;
}

const KEY = 'praxa-guest-result';
// Kept a day: long enough to sign up and verify the email, short enough not to surprise someone sharing the computer
const KEEP_MS = 24 * 60 * 60 * 1000;

// Parts that need an account: the AI assistant and the server code runner are signed-in only (Granyt pays for them)
export const guestCanTake = (test: AssessmentTest) =>
  !test.questions.some(
    (q) => q.aiAllowed || q.type === 'assistant' || (!!q.language && q.language !== 'any' && (languageById(q.language)?.runtime ?? 'browser') === 'server')
  );

// A visitor's copy of the test: a simulation's desktop has no AI assistant (it needs an account)
export const guestVersion = (test: AssessmentTest): AssessmentTest => ({
  ...test,
  questions: test.questions.map((q) => (q.type === 'desktop' && q.desktop ? { ...q, desktop: { ...q.desktop, apps: q.desktop.apps.filter((a) => a !== 'ai') } } : q)),
});

export function saveGuestResult(r: GuestResult) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* private mode: the result is lost, as if they'd closed the tab */
  }
}

export function peekGuestResult(): GuestResult | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || 'null') as GuestResult | null;
    if (!r || Date.now() - new Date(r.completedTime).getTime() > KEEP_MS) return null;
    return r;
  } catch {
    return null;
  }
}

// The waiting result, removed so it's saved once
export function takeGuestResult(): GuestResult | null {
  const r = peekGuestResult();
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing kept */
  }
  return r;
}
