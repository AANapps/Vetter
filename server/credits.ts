import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Companies pay for Vetter's AI with credit they buy in advance. The balance lives in Stripe, as the credit on the
 * company's Stripe customer (one per company, found by its companyId), so only the server can change it: there's no
 * Firebase admin key to write it anywhere else, and the browser must never be trusted with it.
 *
 * - Who's asking: the browser sends the person's Firebase ID token; it's checked against Google's keys here, and their
 *   user record is read from Firestore with that same token (so Firestore's rules decide what it says).
 * - Each billed request runs only with credit left, and is charged what it really cost Vetter in Claude usage, times
 *   CREDIT_MARKUP, in pence (server/meter.ts adds it up).
 * - Topping up is a Stripe Checkout payment, opened in a new tab so the chat stays where it was. Paid sessions are
 *   credited when the tab comes back, and again whenever the balance is looked at, in case it never did; each session
 *   is credited once (an idempotency key and a mark on its payment).
 *
 * Without STRIPE_SECRET_KEY nothing is charged, as before.
 */

export type Env = Record<string, string | undefined>;

// The packs a company can buy, in pence
export const PACKS = [1000, 2500, 5000];
// What a request needs left to start
const MIN_PENCE = 10;
const USD_TO_GBP = 0.8;

const STRIPE = 'https://api.stripe.com/v1';

export const billingOn = (env: Env) => !!env.STRIPE_SECRET_KEY;

// --- Who's asking ---

export type Caller =
  | { kind: 'company'; uid: string; companyId: string }
  // The Vetter team isn't charged
  | { kind: 'admin'; uid: string }
  | { kind: 'none'; reason: string };

const projectOf = (env: Env) => env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '';
const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));

export async function whoIsAsking(authorization: string | undefined, env: Env): Promise<Caller> {
  const token = authorization?.match(/^Bearer (.+)$/)?.[1];
  const project = projectOf(env);
  if (!token) return { kind: 'none', reason: 'Sign in with your company account to use Vetter’s AI.' };
  if (!project) return { kind: 'none', reason: 'Vetter’s sign-in isn’t set up on this server.' };
  let uid: string;
  try {
    const { payload } = await jwtVerify(token, keys, { issuer: `https://securetoken.google.com/${project}`, audience: project });
    uid = String(payload.sub ?? '');
  } catch {
    return { kind: 'none', reason: 'Your sign-in has expired. Refresh the page and try again.' };
  }
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { kind: 'none', reason: 'Your account couldn’t be found. Refresh the page and try again.' };
  const fields = ((await res.json()) as { fields?: Record<string, { stringValue?: string }> }).fields ?? {};
  const field = (name: string) => fields[name]?.stringValue ?? '';
  if (field('role') === 'admin') return { kind: 'admin', uid };
  if (field('role') === 'recruiter' && field('status') === 'active' && field('companyId')) return { kind: 'company', uid, companyId: field('companyId') };
  return { kind: 'none', reason: 'Vetter’s AI is for company accounts. Finish setting up your company first.' };
}

// --- Stripe ---

const form = (data: Record<string, string | number>) => new URLSearchParams(Object.entries(data).map(([k, v]) => [k, String(v)])).toString();

async function stripe<T = any>(env: Env, method: 'GET' | 'POST', path: string, data?: Record<string, string | number>, idempotencyKey?: string): Promise<T> {
  const res = await fetch(`${STRIPE}${path}${method === 'GET' && data ? `?${form(data)}` : ''}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey }),
    },
    ...(method === 'POST' && data && { body: form(data) }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path}: ${json?.error?.message ?? res.status}`);
  return json as T;
}

type Customer = { id: string; balance: number };

// The company's Stripe customer, made the first time it's needed. Search can lag a minute behind a new customer, and
// for a day the idempotency key hands back the same one, so a company never gets two
async function customerFor(env: Env, companyId: string): Promise<Customer> {
  const found = await stripe<{ data: Customer[] }>(env, 'GET', '/customers/search', { query: `metadata['companyId']:'${companyId.replace(/'/g, "\\'")}'` });
  if (found.data[0]) return found.data[0];
  return stripe<Customer>(env, 'POST', '/customers', { name: companyId, 'metadata[companyId]': companyId }, `vetter-company-${companyId}`);
}

// Credit is a negative customer balance (money Stripe owes the customer), in pence
const creditOf = (customer: Customer) => -customer.balance;

// Paid top-ups that weren't credited yet, e.g. when the payment tab was closed before it came back
async function creditPaid(env: Env, customer: Customer): Promise<Customer> {
  const sessions = await stripe<{ data: Session[] }>(env, 'GET', '/checkout/sessions', { customer: customer.id, status: 'complete', limit: 20, 'expand[]': 'data.payment_intent' });
  let credited = false;
  for (const session of sessions.data) credited = (await creditSession(env, session)) || credited;
  return credited ? stripe<Customer>(env, 'GET', `/customers/${customer.id}`) : customer;
}

type Session = {
  id: string;
  customer: string;
  payment_status: string;
  amount_total: number;
  metadata?: Record<string, string>;
  payment_intent?: { id: string; metadata?: Record<string, string> } | string | null;
  url?: string;
};

// A paid session's credit added to its company, once
async function creditSession(env: Env, session: Session): Promise<boolean> {
  const intent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
  if (session.payment_status !== 'paid' || session.metadata?.vetterCredit !== 'true' || !intent || intent.metadata?.credited === 'true') return false;
  await stripe(env, 'POST', `/customers/${session.customer}/balance_transactions`, { amount: -session.amount_total, currency: 'gbp', description: 'Vetter AI credit' }, `vetter-topup-${session.id}`);
  await stripe(env, 'POST', `/payment_intents/${intent.id}`, { 'metadata[credited]': 'true' });
  return true;
}

// --- What routes.ts and the credits endpoint use ---

export async function balanceFor(env: Env, companyId: string): Promise<number> {
  const customer = await creditPaid(env, await customerFor(env, companyId));
  return creditOf(customer);
}

export const hasEnough = (pence: number) => pence >= MIN_PENCE;

// What a request cost Vetter, as the company is charged for it
export const penceFor = (usd: number, env: Env) => Math.ceil(usd * USD_TO_GBP * Math.max(1, Number(env.CREDIT_MARKUP) || 2) * 100);

export async function charge(env: Env, companyId: string, pence: number, what: string): Promise<void> {
  if (pence <= 0) return;
  const customer = await customerFor(env, companyId);
  await stripe(env, 'POST', `/customers/${customer.id}/balance_transactions`, { amount: pence, currency: 'gbp', description: `Vetter AI: ${what}` });
}

// A Stripe Checkout page to buy one of the packs; it comes back to the site, which confirms it
export async function startTopUp(env: Env, companyId: string, pence: number, origin: string): Promise<string> {
  const customer = await customerFor(env, companyId);
  const back = (env.SITE_URL || origin || 'https://vetter.dev').replace(/\/+$/, '');
  const session = await stripe<Session>(env, 'POST', '/checkout/sessions', {
    mode: 'payment',
    customer: customer.id,
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'gbp',
    'line_items[0][price_data][unit_amount]': pence,
    'line_items[0][price_data][product_data][name]': `Vetter AI credit (£${(pence / 100).toFixed(2)})`,
    'metadata[vetterCredit]': 'true',
    'metadata[companyId]': companyId,
    'payment_intent_data[metadata][companyId]': companyId,
    success_url: `${back}/?credits=paid&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${back}/?credits=cancelled`,
  });
  return session.url ?? '';
}

// The page Stripe came back to: the session credited if it's paid and belongs to this company
export async function confirmTopUp(env: Env, companyId: string, sessionId: string): Promise<{ added: number; balance: number }> {
  const session = await stripe<Session>(env, 'GET', `/checkout/sessions/${encodeURIComponent(sessionId)}`, { 'expand[]': 'payment_intent' });
  const ours = session.metadata?.companyId === companyId;
  if (ours) await creditSession(env, session);
  // Credited now or already, by an earlier look at the balance
  const added = ours && session.payment_status === 'paid' ? session.amount_total : 0;
  return { added, balance: await balanceFor(env, companyId) };
}
