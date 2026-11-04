import { auth, firebaseEnabled } from './firebase';

// Every request to Vetter's AI carries who's asking, so the server can charge the company's credit
// (server/credits.ts). Without accounts (the demo) there's nobody to name, and nothing is charged
// The test being worked on, so each charge in the company's usage says what it was for
let purpose = '';
export const setAiPurpose = (name: string) => (purpose = name.trim().slice(0, 120));

export async function aiFetch(path: string, payload: unknown): Promise<Response> {
  const user = firebaseEnabled ? auth().currentUser : null;
  const token = user ? await user.getIdToken().catch(() => '') : '';
  return fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(purpose && { 'X-Vetter-For': encodeURIComponent(purpose) }),
    },
    body: JSON.stringify(payload),
  });
}

// One line of the company's usage: credit used (positive pence) or bought (negative)
export interface UsageEntry {
  amount: number;
  at: string;
  step: string;
  for: string;
}

// The usage as the company reads it: the steps of one piece of work (a test written, a change made) joined into one
// line, since a single message can make a dozen requests
export interface UsageLine {
  for: string;
  what: string;
  amount: number;
  at: string;
  steps: number;
}
const SAME_WORK_MS = 15 * 60 * 1000;
// A piece of work named by its steps: planned or written from scratch is a test written; otherwise a change
const workName = (steps: string[]) =>
  steps.includes('Planning the test') || steps.includes('Writing a test') ? 'Writing the test' : steps.length > 1 ? 'Changing the test' : steps[0];

// entries come newest first; steps of the same test close together in time are one piece of work
export function usageLines(entries: UsageEntry[]): UsageLine[] {
  const groups: UsageEntry[][] = [];
  for (const e of entries) {
    const group = groups[groups.length - 1];
    const prev = group?.[group.length - 1];
    const sameWork = prev && e.amount > 0 && prev.amount > 0 && prev.for === e.for && Date.parse(prev.at) - Date.parse(e.at) < SAME_WORK_MS;
    if (sameWork) group.push(e);
    else groups.push([e]);
  }
  return groups.map((g) => ({
    for: g[0].for,
    what: g[0].amount < 0 ? 'Credit bought' : workName(g.map((e) => e.step)),
    amount: g.reduce((sum, e) => sum + e.amount, 0),
    // When the work started
    at: g[g.length - 1].at,
    steps: g.length,
  }));
}

export async function loadUsage(): Promise<UsageEntry[] | null> {
  try {
    const res = await aiFetch('/api/credits', { action: 'usage' });
    const body = await res.json().catch(() => ({}));
    return res.ok && Array.isArray(body.usage) ? body.usage : null;
  } catch {
    return null;
  }
}

// What writing a test is likely to cost, in pence, from what's been picked: the plan, each question, and each
// interactive task (the biggest part: a whole working page, often built twice to fix what the first try missed).
// A rough range, from what these steps typically use on Vetter's default model at the default markup
export function estimateTest(questionCount: number, handsOn: boolean, apps: boolean): { low: number; high: number } {
  const tasks = handsOn ? Math.max(1, Math.round(questionCount / 10)) : 0;
  const appTasks = apps ? tasks : 0;
  const pence = 12 + questionCount * 4 + (tasks - appTasks) * 10 + appTasks * 50 + (apps ? 15 : 0);
  return { low: Math.round((pence * 0.7) / 5) * 5, high: Math.round((pence * 1.5) / 5) * 5 };
}

// The company's AI credit, in pence. billing is false when the site doesn't charge (no Stripe set up) or for the
// Vetter team
export interface Credit {
  billing: boolean;
  balance?: number;
  packs?: number[];
  // On confirming a payment: what it added
  added?: number;
  error?: string;
}

async function credits(payload: Record<string, unknown>): Promise<Credit> {
  try {
    const res = await aiFetch('/api/credits', payload);
    // A static host with no endpoint: no billing either
    if (res.status === 404) return { billing: false };
    const body = await res.json().catch(() => ({}));
    return res.ok ? body : { billing: true, error: body.error || "Couldn't check your credit." };
  } catch {
    return { billing: true, error: "Couldn't check your credit. Check your connection." };
  }
}

export const loadCredit = () => credits({ action: 'balance' });
export const confirmTopUp = (sessionId: string) => credits({ action: 'confirm', sessionId });
// A Stripe Checkout page for one of the packs
export async function topUpUrl(pence: number): Promise<{ url?: string; error?: string }> {
  try {
    const res = await aiFetch('/api/credits', { action: 'top-up', pence });
    const body = await res.json().catch(() => ({}));
    return res.ok && body.url ? { url: body.url } : { error: body.error || "Couldn't open the payment page." };
  } catch {
    return { error: "Couldn't open the payment page. Check your connection." };
  }
}

export const pounds = (pence: number) => `£${(Math.max(0, pence) / 100).toFixed(2)}`;
