import { Env, allowanceUsed, balanceFor, billingOn, ledger, stripe } from './credits.js';
import { Interval, PASS_DAYS, PLANS, PlanId, PlanStatus, RANK, SUBSCRIPTIONS, TierSettings, applyTiers, hasFeature, higher, planFromRecord, pricePence } from './plans.js';

/**
 * Plans paid online with Stripe: Starter, Growth and Scale as subscriptions, Per job as a one-off 30-day pass.
 *
 * Nothing is copied into Firestore (the server has no Firebase admin key): each request reads the company's plan from
 * Stripe, so a company can't give itself a plan, and there's no webhook to miss. The plan the Granyt team sets on the
 * company record (an Enterprise deal, a free month) counts too, whichever is higher.
 *
 * Subscriptions live on their own Stripe customer per company, apart from the one holding AI credit: Stripe spends a
 * customer's credit on its next invoice and that can't be switched off, so bought AI credit would pay the subscription.
 */

const SITE = (env: Env, origin: string) => (env.SITE_URL || origin || 'https://vetter.dev').replace(/\/+$/, '');

type Customer = { id: string; metadata?: Record<string, string> };

async function billingCustomer(env: Env, companyId: string, name = companyId): Promise<Customer> {
  const found = await stripe<{ data: Customer[] }>(env, 'GET', '/customers/search', { query: `metadata['praxaBilling']:'${companyId.replace(/'/g, "\\'")}'` });
  if (found.data[0]) return found.data[0];
  return stripe<Customer>(env, 'POST', '/customers', { name, 'metadata[praxaBilling]': companyId, 'metadata[companyId]': companyId }, `praxa-billing-${companyId}`);
}

// A plan's Stripe price, made the first time it's sold. Found by its lookup key; when the price in plans.ts changes a
// new one takes the key, and existing subscribers stay on what they signed up at until they change plan
async function priceFor(env: Env, plan: PlanId, interval: Interval): Promise<string> {
  const key = `praxa_${plan}_${interval}`;
  const amount = pricePence(plan, interval);
  const found = await stripe<{ data: { id: string; unit_amount: number }[] }>(env, 'GET', '/prices', { 'lookup_keys[]': key, active: 'true' });
  if (found.data[0]?.unit_amount === amount) return found.data[0].id;
  const price = await stripe<{ id: string }>(
    env,
    'POST',
    '/prices',
    {
      currency: 'gbp',
      unit_amount: amount,
      'recurring[interval]': interval,
      'product_data[name]': `Granyt ${PLANS[plan].name}`,
      'product_data[metadata][plan]': plan,
      lookup_key: key,
      transfer_lookup_key: 'true',
      'metadata[plan]': plan,
    },
    `praxa-price-${key}-${amount}`
  );
  return price.id;
}

type Subscription = {
  id: string;
  status: string;
  cancel_at_period_end: boolean;
  // When it's set to end: Stripe's billing page cancels this way now (cancel_at_period_end stays false)
  cancel_at?: number | null;
  metadata?: Record<string, string>;
  current_period_start?: number;
  current_period_end?: number;
  items: { data: { id: string; current_period_start?: number; current_period_end?: number; price: { recurring?: { interval: Interval } } }[] };
};
const LIVE = ['active', 'trialing', 'past_due'];

async function subscriptionOf(env: Env, customer: Customer): Promise<Subscription | null> {
  const list = await stripe<{ data: Subscription[] }>(env, 'GET', '/subscriptions', { customer: customer.id, status: 'all', limit: 10 });
  const live = list.data.filter((s) => LIVE.includes(s.status) && (SUBSCRIPTIONS as string[]).includes(s.metadata?.plan ?? ''));
  // Two at once only if a switch went wrong: the higher one counts
  return live.sort((a, b) => RANK.indexOf(b.metadata!.plan as PlanId) - RANK.indexOf(a.metadata!.plan as PlanId))[0] ?? null;
}
// Newer Stripe API versions keep the period on the subscription's item
const periodOf = (s: Subscription) => ({
  start: s.current_period_start ?? s.items.data[0]?.current_period_start ?? 0,
  end: s.current_period_end ?? s.items.data[0]?.current_period_end ?? 0,
});

type Session = { id: string; created: number; payment_status: string; metadata?: Record<string, string> };

async function passesOf(env: Env, customer: Customer): Promise<{ id: string; endsAt: number }[]> {
  const list = await stripe<{ data: Session[] }>(env, 'GET', '/checkout/sessions', { customer: customer.id, status: 'complete', limit: 100 });
  const now = Date.now() / 1000;
  return list.data
    .filter((s) => s.metadata?.praxaPass === 'true' && s.payment_status === 'paid')
    .map((s) => ({ id: s.id, endsAt: s.created + PASS_DAYS * 86400 }))
    .filter((p) => p.endsAt > now);
}

// The plan the Granyt team set on the company's record, read with the person's own sign-in
async function recordOf(env: Env, token: string, companyId: string): Promise<{ plan: PlanId; ownerUid: string; name: string }> {
  const project = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '';
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/companies/${encodeURIComponent(companyId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const fields = res.ok ? (((await res.json()) as { fields?: Record<string, { stringValue?: string }> }).fields ?? {}) : {};
  return { plan: planFromRecord(fields.plan?.stringValue), ownerUid: fields.ownerUid?.stringValue ?? '', name: fields.name?.stringValue ?? companyId };
}

export interface Billing extends PlanStatus {
  // Which allowance period charges now count against ('' when there's nothing included left to track)
  period: string;
  ownerUid: string;
  name: string;
  subscription: Subscription | null;
  customer: Customer;
}

// The Granyt team's changes to the tiers (settings/plans, readable by anyone), a minute at a time
let tiersAt = 0;
type Value = { stringValue?: string; integerValue?: string; doubleValue?: number; nullValue?: null; booleanValue?: boolean; arrayValue?: { values?: Value[] }; mapValue?: { fields?: Record<string, Value> } };
const decode = (v: Value): unknown =>
  v.mapValue ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, decode(x)]))
  : v.arrayValue ? (v.arrayValue.values ?? []).map(decode)
  : v.integerValue !== undefined ? Number(v.integerValue)
  : v.doubleValue !== undefined ? Number(v.doubleValue)
  : v.stringValue ?? v.booleanValue ?? null;
export async function loadTiers(env: Env, fresh = false) {
  if (!fresh && Date.now() - tiersAt < 60_000) return;
  const project = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID || '';
  try {
    const res = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/settings/plans`);
    const fields = res.ok ? (((await res.json()) as { fields?: Record<string, Value> }).fields ?? {}) : {};
    applyTiers(fields.tiers ? (decode(fields.tiers) as TierSettings) : null);
    tiersAt = Date.now();
  } catch (err) {
    console.error('[billing] couldn’t read the tier settings', err);
  }
}

// A few seconds' memory per company: one test makes a dozen AI requests, each checking the plan
const cache = new Map<string, { at: number; value: Billing }>();
const CACHE_MS = 20_000;
export const forget = (companyId: string) => cache.delete(companyId);

export async function billingFor(env: Env, companyId: string, token: string): Promise<Billing> {
  await loadTiers(env);
  const hit = cache.get(companyId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const record = await recordOf(env, token, companyId);
  const customer = await billingCustomer(env, companyId, record.name);
  const [subscription, passes, credit] = await Promise.all([subscriptionOf(env, customer), passesOf(env, customer), balanceFor(env, companyId)]);
  const subPlan = (subscription?.metadata?.plan as PlanId | undefined) ?? 'free';
  // The plan a month is counted on: a subscription or the team's; passes add jobs (and their own AI) on top
  const base = higher(record.plan, subPlan);
  const plan = passes.length && base === 'free' ? 'per-job' : base;
  const period = subscription ? periodOf(subscription) : null;

  // The allowance: a subscription's resets each period; the team's plan each calendar month; passes together while
  // the same ones are open; the free trial once
  let allowance: number;
  let key: string;
  let since = 0;
  let resets: number | undefined;
  if (base !== 'free') {
    allowance = PLANS[base].aiAllowance;
    if (period && subPlan === base) {
      key = `sub:${subscription!.id}:${period.start}`;
      since = period.start;
      resets = period.end;
    } else {
      const now = new Date();
      key = `plan:${base}:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
      since = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000;
      resets = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) / 1000;
    }
  } else if (passes.length) {
    allowance = PLANS['per-job'].aiAllowance * passes.length;
    key = `passes:${passes.map((p) => p.id.slice(-8)).sort().join(',')}`;
    since = Math.min(...passes.map((p) => p.endsAt)) - PASS_DAYS * 86400;
  } else {
    allowance = PLANS.free.aiAllowance;
    key = 'free';
  }
  const used = allowanceUsed(await ledger(env, companyId, since), key);

  const value: Billing = {
    billing: true,
    plan,
    ...(subscription && {
      interval: subscription.items.data[0]?.price.recurring?.interval ?? 'month',
      renewsAt: new Date((subscription.cancel_at || period!.end) * 1000).toISOString(),
      cancelsAtEnd: subscription.cancel_at_period_end || !!subscription.cancel_at,
      pastDue: subscription.status === 'past_due',
    }),
    passes: passes.map((p) => ({ id: p.id, endsAt: new Date(p.endsAt * 1000).toISOString() })),
    jobLimit: PLANS[base].jobs + passes.length,
    ai: { allowance, used, credit, ...(resets && { resets: new Date(resets * 1000).toISOString() }) },
    period: key,
    ownerUid: record.ownerUid,
    name: record.name,
    subscription,
    customer,
  };
  cache.set(companyId, { at: Date.now(), value });
  return value;
}

// What's left to spend on AI: the allowance first, then bought credit
export const aiLeft = (b: Billing) => Math.max(0, b.ai.allowance - b.ai.used) + Math.max(0, b.ai.credit);
export const canTopUp = (b: Billing) => hasFeature(b.plan, 'ai-top-ups');

// After a charge, the cached figures follow it, so the next request in a build sees what's left
export function spent(companyId: string, pence: number) {
  const hit = cache.get(companyId)?.value;
  if (!hit) return;
  const covered = Math.min(pence, Math.max(0, hit.ai.allowance - hit.ai.used));
  hit.ai.used += covered;
  hit.ai.credit -= pence - covered;
}

export const publicStatus = (b: Billing): PlanStatus => ({
  billing: b.billing,
  plan: b.plan,
  ...(b.interval && { interval: b.interval }),
  ...(b.renewsAt && { renewsAt: b.renewsAt }),
  ...(b.cancelsAtEnd && { cancelsAtEnd: true }),
  ...(b.pastDue && { pastDue: true }),
  passes: b.passes,
  jobLimit: b.jobLimit,
  ai: b.ai,
});

// --- Paying ---

// A subscription: a Checkout page for a new one, or the plan changed in place (charged or credited the difference
// for the rest of the period)
export async function subscribe(env: Env, companyId: string, b: Billing, plan: PlanId, interval: Interval, origin: string): Promise<{ url?: string; switched?: boolean }> {
  const price = await priceFor(env, plan, interval);
  if (b.subscription) {
    await stripe(env, 'POST', `/subscriptions/${b.subscription.id}`, {
      'items[0][id]': b.subscription.items.data[0].id,
      'items[0][price]': price,
      proration_behavior: 'always_invoice',
      // Choosing a plan undoes a cancellation, whichever way it was made (Stripe takes only one of the two at once)
      ...(b.subscription.cancel_at ? { cancel_at: '' } : { cancel_at_period_end: 'false' }),
      'metadata[plan]': plan,
    });
    forget(companyId);
    return { switched: true };
  }
  const back = SITE(env, origin);
  const session = await stripe<{ url: string }>(env, 'POST', '/checkout/sessions', {
    mode: 'subscription',
    customer: b.customer.id,
    'line_items[0][price]': price,
    'line_items[0][quantity]': 1,
    'subscription_data[metadata][plan]': plan,
    'subscription_data[metadata][companyId]': companyId,
    'metadata[companyId]': companyId,
    allow_promotion_codes: 'true',
    billing_address_collection: 'required',
    'tax_id_collection[enabled]': 'true',
    'customer_update[name]': 'auto',
    'customer_update[address]': 'auto',
    success_url: `${back}/?billing=paid&plan=${plan}`,
    cancel_url: `${back}/?billing=cancelled`,
  });
  forget(companyId);
  return { url: session.url };
}

// A per-job pass: one more open job for 30 days, with full reports and its own AI allowance
export async function buyPass(env: Env, companyId: string, b: Billing, origin: string): Promise<string> {
  const back = SITE(env, origin);
  const session = await stripe<{ url: string }>(env, 'POST', '/checkout/sessions', {
    mode: 'payment',
    customer: b.customer.id,
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': 'gbp',
    'line_items[0][price_data][unit_amount]': PLANS['per-job'].monthly * 100,
    'line_items[0][price_data][product_data][name]': `Granyt job pass (${PASS_DAYS} days)`,
    'metadata[praxaPass]': 'true',
    'metadata[companyId]': companyId,
    'invoice_creation[enabled]': 'true',
    billing_address_collection: 'required',
    'tax_id_collection[enabled]': 'true',
    'customer_update[name]': 'auto',
    'customer_update[address]': 'auto',
    success_url: `${back}/?billing=paid&plan=per-job`,
    cancel_url: `${back}/?billing=cancelled`,
  });
  forget(companyId);
  return session.url;
}

// Stripe's own billing page: card, invoices, cancelling. Needs the customer portal switched on in the Stripe dashboard
export async function portal(env: Env, b: Billing, origin: string): Promise<string> {
  const session = await stripe<{ url: string }>(env, 'POST', '/billing_portal/sessions', { customer: b.customer.id, return_url: `${SITE(env, origin)}/?billing=back` });
  return session.url;
}

export { billingOn };
