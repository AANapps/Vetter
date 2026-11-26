// Checks billing against real Stripe TEST mode (needs STRIPE_SECRET_KEY=sk_test_... in .env.local). Run from the repo root:
//   npx esbuild scripts/stripe-check.ts --bundle --platform=node --format=esm --outfile=/tmp/stripe-check.mjs && node /tmp/stripe-check.mjs [companyId] [auto|links|status]
// auto: 16 automatic checks on a new throwaway company. links: Checkout links (Starter, job pass, £10 top-up) to pay with 4242 4242 4242 4242.
// status: the company's plan, passes, AI allowance/credit, and a billing portal link.
import { readFileSync } from 'fs';
import { billingFor, subscribe, buyPass, portal, forget, aiLeft } from '../server/billing';
import { stripe, charge, grantCredit, startTopUp, usageFor } from '../server/credits';
const env: Record<string, string> = { ...process.env } as any;
for (const f of ['.env', '.env.local']) { try { for (const l of readFileSync(f, 'utf8').split('\n')) { const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/); if (m) env[m[1]] = m[2]; } } catch {} }
delete env.SITE_URL; // keep test links pointing at localhost
const co = process.argv[2] || `stripe-test-${Date.now()}`;
const step = process.argv[3] || 'auto';
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); if (!c) fails++; };
const fresh = async () => { forget(co); return billingFor(env, co, 'none'); };
(async () => {
  if (!env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw new Error('need sk_test key');
  console.log('company:', co);
  if (step === 'auto') {
    let b = await fresh();
    ok(b.plan === 'free' && b.ai.allowance === 200 && b.ai.used === 0, `free plan, £2 trial (plan=${b.plan} allowance=${b.ai.allowance} used=${b.ai.used})`);
    await charge(env, co, 150, 'generate', 'test', { pence: 150, period: b.period });
    b = await fresh();
    ok(b.ai.used === 150 && b.ai.credit === 0, `trial use counted (used=${b.ai.used} credit=${b.ai.credit})`);
    await charge(env, co, 50, 'generate', 'test', { pence: 50, period: b.period });
    b = await fresh();
    ok(aiLeft(b) === 0, `trial used up, nothing left (left=${aiLeft(b)})`);
    await grantCredit(env, co, 500, 'test');
    b = await fresh();
    ok(b.ai.credit === 500, `Corprax-granted credit shows (credit=${b.ai.credit})`);
    const r = await subscribe(env, co, b, 'starter', 'month', 'http://localhost:3000');
    ok(!!r.url?.includes('checkout.stripe.com'), 'Starter checkout link made');
    // simulate the paid checkout: card on file + subscription on the billing customer
    const price = (await stripe(env, 'GET', '/prices', { 'lookup_keys[]': 'praxa_starter_month', active: 'true' })).data[0];
    ok(price?.unit_amount === 9900, `Starter price £99 (${price?.unit_amount})`);
    const pm = await stripe(env, 'POST', '/payment_methods/pm_card_visa/attach', { customer: b.customer.id });
    await stripe(env, 'POST', `/customers/${b.customer.id}`, { 'invoice_settings[default_payment_method]': pm.id });
    await stripe(env, 'POST', '/subscriptions', { customer: b.customer.id, 'items[0][price]': price.id, 'metadata[plan]': 'starter', 'metadata[companyId]': co });
    b = await fresh();
    ok(b.plan === 'starter' && b.ai.allowance === 1000 && b.ai.used === 0 && b.jobLimit === 3, `Starter active (plan=${b.plan} allowance=${b.ai.allowance} used=${b.ai.used} jobs=${b.jobLimit})`);
    await charge(env, co, 300, 'generate', 'test', { pence: 300, period: b.period });
    b = await fresh();
    ok(b.ai.used === 300 && b.ai.credit === 500, `Starter allowance used before credit (used=${b.ai.used} credit=${b.ai.credit})`);
    const sw = await subscribe(env, co, b, 'growth', 'month', 'http://localhost:3000');
    b = await fresh();
    ok(!!sw.switched && b.plan === 'growth' && b.ai.allowance === 2500 && b.jobLimit === 10, `switched to Growth (plan=${b.plan} allowance=${b.ai.allowance} jobs=${b.jobLimit})`);
    const inv = (await stripe(env, 'GET', '/invoices', { customer: b.customer.id, limit: 5 })).data;
    ok(inv.length >= 2 && inv.every((i: any) => i.status === 'paid'), `invoices paid: ${inv.map((i: any) => `£${i.amount_paid / 100} ${i.status}`).join(', ')}`);
    const cr = (await stripe(env, 'GET', `/customers/${b.customer.id}`)).balance;
    ok(cr === 0, `AI credit did not pay the subscription (billing customer balance=${cr})`);
    const pu = await portal(env, b, 'http://localhost:3000').catch((e) => 'ERR ' + e.message);
    ok(pu.startsWith('https://billing.stripe.com'), `billing portal link: ${pu.slice(0, 90)}`);
    await stripe(env, 'POST', `/subscriptions/${b.subscription!.id}`, { cancel_at_period_end: 'true' });
    b = await fresh();
    ok(b.plan === 'growth' && b.cancelsAtEnd === true, `cancel keeps plan to period end (cancelsAtEnd=${b.cancelsAtEnd})`);
    const pass = await buyPass(env, co, b, 'http://localhost:3000');
    ok(pass.includes('checkout.stripe.com'), 'job pass checkout link made');
    const top = await startTopUp(env, co, 1000, 'http://localhost:3000');
    ok(top.includes('checkout.stripe.com'), 'top-up checkout link made');
    const u = await usageFor(env, co);
    ok(u.length >= 4, `usage list (${u.length} lines)`);
    await stripe(env, 'DELETE' as any, `/subscriptions/${b.subscription!.id}`).catch(() => {});
  }
  if (step === 'links') {
    const b = await fresh();
    console.log('PLAN', b.plan, 'credit', b.ai.credit, 'allowance', b.ai.allowance, 'used', b.ai.used, 'passes', b.passes.length);
    if (!b.subscription) console.log('SUB  ', (await subscribe(env, co, b, 'starter', 'month', 'http://localhost:3000')).url);
    console.log('PASS ', await buyPass(env, co, b, 'http://localhost:3000'));
    console.log('TOPUP', await startTopUp(env, co, 1000, 'http://localhost:3000'));
  }
  if (step === 'status') {
    const b = await fresh();
    console.log(JSON.stringify({ plan: b.plan, interval: b.interval, cancelsAtEnd: b.cancelsAtEnd, passes: b.passes.length, jobLimit: b.jobLimit, ai: b.ai }, null, 1));
    if (b.subscription) console.log('PORTAL', await portal(env, b, 'http://localhost:3000').catch((e) => 'ERR ' + e.message));
  }
  console.log(fails ? `${fails} failed` : 'done');
})().catch((e) => { console.error('ERROR', e.message); process.exit(1); });
