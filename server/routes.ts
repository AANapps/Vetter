import { generateTest } from './generateTest.js';
import { gradeAnswers } from './gradeAnswers.js';
import { testChat } from './testChat.js';
import { buildApp } from './buildApp.js';
import { designApp } from './designApp.js';
import { planTest } from './planTest.js';
import { writeQuestions } from './writeQuestions.js';
import { checkSpec } from './checkSpec.js';
import { writeJobSim } from './writeJobSim.js';
import { readCv } from './readCv.js';
import { testAdvisor } from './testAdvisor.js';
import { suggestTests } from './suggestTests.js';
import { taskAssistant } from './taskAssistant.js';
import { crmAssistant } from './crmAssistant.js';
import { writeFormula } from './writeFormula.js';
import { fitApp } from './fitApp.js';
import { editApp } from './editApp.js';
import { changePlan } from './changePlan.js';
import { writeTraining } from './writeTraining.js';
import { runCode } from './runCode.js';
import { matchEnvironment } from './matchEnvironment.js';
import { metered } from './meter.js';
import { PACKS, adjustAllowance, billingOn, charge, confirmTopUp, grantCredit, hasEnough, penceFor, startTopUp, usageFor, whoIsAsking } from './credits.js';
import { aiLeft, billingFor, buyPass, canTopUp, forget, loadTiers, portal, publicStatus, spent, subscribe } from './billing.js';
import { PLANS, PlanId, PlanPreview, RANK, SUBSCRIPTIONS, hasFeature } from './plans.js';

// The AI endpoints, answered by server.ts in production and the Vite dev server in development
type Env = Record<string, string | undefined>;
// Sonnet by default, at about half Opus's cost; set CLAUDE_MODEL=claude-opus-5-5 for the most capable model
const testModel = (env: Env) => env.CLAUDE_MODEL || 'claude-sonnet-5-5';
// App simulations are written and checked on Opus: their spec decides every task, and a task that isn't how the job
// is really done ruins the simulation. SPEC_MODEL sets another
const specModel = (env: Env) => env.SPEC_MODEL || 'claude-opus-5-5';

// What the server passes along from the request: who's asking (their Firebase ID token) and the site's address
export interface RequestMeta {
  authorization?: string;
  origin?: string;
  // The test a request is for (the X-Praxa-For header), named in the company's usage
  purpose?: string;
  // An admin trying a plan (the X-Praxa-Preview header): AI requests act as that plan would, and nothing is charged
  preview?: PlanPreview;
}

export const previewOf = (header: string | string[] | undefined): PlanPreview | undefined => {
  try {
    const v = JSON.parse(String(Array.isArray(header) ? header[0] : header ?? ''));
    return (RANK as string[]).includes(v?.plan) ? { plan: v.plan, used: Number(v.used) || 0, credit: Number(v.credit) || 0 } : undefined;
  } catch {
    return undefined;
  }
};

// The X-Praxa-For header as sent (URI-encoded, so any title fits in a header)
export const purposeOf = (header: string | string[] | undefined) => {
  try {
    return decodeURIComponent(String(Array.isArray(header) ? header[0] : header ?? '')).replace(/\s+/g, ' ').trim().slice(0, 120);
  } catch {
    return '';
  }
};
type Handler = (body: unknown, env: Env, meta?: RequestMeta) => Promise<{ status: number; json: unknown }>;

const BUSY = "Praxa's AI is busy right now. Nothing is lost: try again in a little while.";

// Failures are logged with their reason, so a request that didn't work can be traced
const logged =
  (name: string, handler: Handler): Handler =>
  async (body, env, meta) => {
    const result = await handler(body, env, meta);
    if (result.status >= 400) console.error(`[${name}] ${result.status}: ${JSON.stringify(result.json)}`);
    return result;
  };

// Writing tests is paid for from the company's credit (server/credits.ts): it needs some left to start, and is charged
// what it really cost once it's done. The Praxa team isn't charged; with no Stripe key set up, nobody is
const billed =
  (name: string, handler: Handler): Handler =>
  async (body, env, meta) => {
    // An admin trying a plan: refused as that plan would be once its AI is used up, never charged
    if (meta?.preview) {
      const caller = await whoIsAsking(meta.authorization, env);
      if (caller.kind === 'admin') {
        await loadTiers(env);
        const p = meta.preview;
        const left = Math.max(0, PLANS[p.plan].aiAllowance - p.used) + Math.max(0, p.credit);
        if (!hasEnough(left)) return { status: 402, json: { error: 'no-credit', balance: left, plan: p.plan, canTopUp: hasFeature(p.plan, 'ai-top-ups') } };
        return handler(body, env, meta);
      }
    }
    if (!billingOn(env)) return handler(body, env, meta);
    const caller = await whoIsAsking(meta?.authorization, env);
    if (caller.kind === 'none') return { status: 401, json: { error: caller.reason } };
    if (caller.kind === 'admin') return handler(body, env, meta);
    // The plan's included AI is spent first (server/billing.ts), then bought credit
    let period = '';
    let included = 0;
    try {
      const plan = await billingFor(env, caller.companyId, caller.token);
      const left = aiLeft(plan);
      if (!hasEnough(left)) return { status: 402, json: { error: 'no-credit', balance: left, plan: plan.plan, canTopUp: canTopUp(plan) } };
      period = plan.period;
      included = Math.max(0, plan.ai.allowance - plan.ai.used);
    } catch (err) {
      console.error(`[${name}] couldn't read the plan or credit`, err);
      return { status: 503, json: { error: BUSY } };
    }
    const { result, usd } = await metered(() => handler(body, env, meta));
    const pence = penceFor(usd, env);
    try {
      await charge(env, caller.companyId, pence, name, meta?.purpose ?? '', { pence: included, period });
      spent(caller.companyId, pence);
      console.log(`[${name}] ${caller.companyId} charged ${pence}p (${Math.min(pence, included)}p included; $${usd.toFixed(3)} at cost)`);
    } catch (err) {
      console.error(`[${name}] couldn't charge ${caller.companyId} ${pence}p`, err);
    }
    return result;
  };

// The company's credit: its balance, a Checkout page to buy more, and confirming a payment once Stripe sends it back
async function credits(body: unknown, env: Env, meta?: RequestMeta): Promise<{ status: number; json: unknown }> {
  if (!billingOn(env)) return { status: 200, json: { billing: false } };
  const req = (body ?? {}) as { action?: string; pence?: number; sessionId?: string };
  const caller = await whoIsAsking(meta?.authorization, env);
  if (caller.kind === 'admin') return { status: 200, json: { billing: false } };
  if (caller.kind === 'none') return { status: 401, json: { error: caller.reason } };
  try {
    if (req.action === 'top-up') {
      if (!canTopUp(await billingFor(env, caller.companyId, caller.token)))
        return { status: 403, json: { error: 'Buying AI credit comes with a paid plan. The free plan includes a £2 trial.' } };
      const pence = Number(req.pence);
      if (!PACKS.includes(pence)) return { status: 400, json: { error: 'Pick one of the credit packs.' } };
      return { status: 200, json: { url: await startTopUp(env, caller.companyId, pence, meta?.origin ?? '') } };
    }
    if (req.action === 'usage') return { status: 200, json: { billing: true, usage: await usageFor(env, caller.companyId) } };
    if (req.action === 'confirm' && req.sessionId) {
      forget(caller.companyId);
      return { status: 200, json: { billing: true, packs: PACKS, ...(await confirmTopUp(env, caller.companyId, req.sessionId)) } };
    }
    // What's left to spend: the plan's included AI, then bought credit
    const plan = await billingFor(env, caller.companyId, caller.token);
    return { status: 200, json: { billing: true, packs: PACKS, balance: aiLeft(plan), credit: plan.ai.credit, included: Math.max(0, plan.ai.allowance - plan.ai.used) } };
  } catch (err) {
    console.error('[credits]', err);
    return { status: 502, json: { error: "Couldn't reach the payment service. Try again in a moment." } };
  }
}

// The company's plan: what it has, and paying for one (a subscription, a job pass, Stripe's billing page). Only the
// company's owner can pay or change it
async function billing(body: unknown, env: Env, meta?: RequestMeta): Promise<{ status: number; json: unknown }> {
  if (!billingOn(env))
    return (body as { action?: string })?.action?.startsWith('admin-')
      ? { status: 400, json: { error: 'Stripe isn’t set up on this server (STRIPE_SECRET_KEY), so there’s no plan or credit to change.' } }
      : { status: 200, json: { billing: false } };
  const req = (body ?? {}) as { action?: string; plan?: string; interval?: string; companyId?: string; pence?: number; used?: number; note?: string };
  const caller = await whoIsAsking(meta?.authorization, env);
  if (caller.kind === 'admin') return req.action?.startsWith('admin-') ? adminBilling(req, env, caller.token) : { status: 200, json: { billing: false } };
  if (caller.kind === 'none') return { status: 401, json: { error: caller.reason } };
  try {
    if (req.action === 'refresh') forget(caller.companyId);
    const plan = await billingFor(env, caller.companyId, caller.token);
    if (['subscribe', 'pass', 'portal'].includes(req.action ?? '') && plan.ownerUid && plan.ownerUid !== caller.uid)
      return { status: 403, json: { error: 'Only the person who set up your company’s account can change its plan. Ask them to do it.' } };
    const origin = meta?.origin ?? '';
    if (req.action === 'subscribe') {
      if (!(SUBSCRIPTIONS as string[]).includes(req.plan ?? '')) return { status: 400, json: { error: 'Pick one of the plans.' } };
      const out = await subscribe(env, caller.companyId, plan, req.plan as PlanId, req.interval === 'year' ? 'year' : 'month', origin);
      return { status: 200, json: out.switched ? { switched: true, ...publicStatus(await billingFor(env, caller.companyId, caller.token)) } : out };
    }
    if (req.action === 'pass') return { status: 200, json: { url: await buyPass(env, caller.companyId, plan, origin) } };
    if (req.action === 'portal') return { status: 200, json: { url: await portal(env, plan, origin) } };
    return { status: 200, json: publicStatus(plan) };
  } catch (err) {
    console.error('[billing]', err);
    return { status: 502, json: { error: "Couldn't reach the payment service. Try again in a moment." } };
  }
}

// The Praxa team, for any company: its plan and AI as Stripe has them, credit given, and this period's AI usage set
// (to try a company at different levels)
async function adminBilling(
  req: { action?: string; companyId?: string; pence?: number; used?: number; note?: string },
  env: Env,
  token: string
): Promise<{ status: number; json: unknown }> {
  const companyId = String(req.companyId ?? '');
  if (!companyId) return { status: 400, json: { error: 'Pick a company.' } };
  try {
    if (req.action === 'admin-grant') {
      const pence = Math.round(Number(req.pence));
      if (!(pence > 0 && pence <= 100000)) return { status: 400, json: { error: 'Give between 1p and £1,000.' } };
      await grantCredit(env, companyId, pence, String(req.note ?? '').slice(0, 100));
      forget(companyId);
    }
    if (req.action === 'admin-usage') {
      const plan = await billingFor(env, companyId, token);
      const used = Math.max(0, Math.round(Number(req.used) || 0));
      await adjustAllowance(env, companyId, used - plan.ai.used, plan.period);
      forget(companyId);
    }
    if (req.action === 'admin-refresh-tiers') await loadTiers(env, true);
    forget(companyId);
    return { status: 200, json: publicStatus(await billingFor(env, companyId, token)) };
  } catch (err) {
    console.error('[billing admin]', err);
    return { status: 502, json: { error: err instanceof Error ? err.message : "Couldn't reach Stripe." } };
  }
}

export const API_ROUTES: Record<string, Handler> = {
  '/api/credits': logged('credits', credits),
  '/api/billing': logged('billing', billing),
  '/api/generate-test': logged('generate-test', billed('generate-test', (body, env) => generateTest(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  '/api/test-chat': logged('test-chat', billed('test-chat', (body, env) => testChat(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  // A new test in stages, each request short enough for the host's time limit: the plan, then every section written in
  // parallel, then every interactive page built in parallel
  '/api/plan-test': logged('plan-test', billed('plan-test', (body, env) => planTest(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  '/api/write-questions': logged('write-questions', billed('write-questions', (body, env) => writeQuestions(body, env.ANTHROPIC_API_KEY, testModel(env), specModel(env)))),
  // A job simulation written whole: one 40-minute day on the desktop in five timed parts. JOB_SIM_MODEL sets another
  // model (it must finish inside the host's five-minute limit)
  '/api/write-job-sim': logged('write-job-sim', billed('write-job-sim', (body, env) => writeJobSim(body, env.ANTHROPIC_API_KEY, env.JOB_SIM_MODEL || testModel(env)))),
  // Each app simulation's spec checked against how the job is really done, before its page is built
  '/api/check-spec': logged('check-spec', billed('check-spec', (body, env) => checkSpec(body, env.ANTHROPIC_API_KEY, specModel(env)))),
  // Each interactive page is designed first at high effort (its own request, so the thinking gets its own time limit),
  // then built from that design. DESIGN_MODEL sets another model
  '/api/design-app': logged('design-app', billed('design-app', (body, env) => designApp(body, env.ANTHROPIC_API_KEY, env.DESIGN_MODEL || testModel(env)))),
  // A saved simulation from Praxa's environment library to build a new page on, when one is the same kind of product;
  // a quick model reading short summaries
  '/api/match-environment': logged('match-environment', billed('match-environment', (body, env) => matchEnvironment(body, env.ANTHROPIC_API_KEY, env.MATCH_MODEL || 'claude-haiku-5-5'))),
  // A test built on an app from Praxa's app library: only the test's data and, when it needs more, small edits to the app
  '/api/fit-app': logged('fit-app', billed('fit-app', (body, env) => fitApp(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  // A change to an app page already in a test (a colour, a fix, a missing button), as small edits to its code
  '/api/edit-app': logged('edit-app', billed('edit-app', (body, env) => editApp(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  // The first step of a message about a written draft: an answer, or a checklist of changes made only once the company
  // presses Build
  // Guided training (not a test): the lessons, their steps and the spec of the app to build them in
  '/api/write-training': logged('write-training', billed('write-training', (body, env) => writeTraining(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  '/api/change-plan': logged('change-plan', billed('change-plan', (body, env) => changePlan(body, env.ANTHROPIC_API_KEY, env.ADVISOR_MODEL || 'claude-sonnet-5-5'))),
  // Each interactive page of a test, built in its own request so a long test fits the host's time limit
  '/api/build-app': logged('build-app', billed('build-app', (body, env) => buildApp(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  // The company home's chat recommends tests and plans; it writes nothing, so a quicker model is enough by default
  // (and it's free, so companies can ask before they buy)
  '/api/test-advisor': logged('test-advisor', (body, env) => testAdvisor(body, env.ANTHROPIC_API_KEY, env.ADVISOR_MODEL || 'claude-sonnet-5-5')),
  // The library tests that fit a job being posted, from its description; free, like the home chat
  '/api/suggest-tests': logged('suggest-tests', (body, env) => suggestTests(body, env.ANTHROPIC_API_KEY, env.ADVISOR_MODEL || 'claude-sonnet-5-5')),
  // The assistant candidates work with in an AI-assisted task: Praxa's cost, like marking, on a quick model by default
  '/api/task-assistant': logged('task-assistant', (body, env, meta) => taskAssistant(body, env, meta?.authorization, env.ASSISTANT_MODEL || 'claude-haiku-5-5')),
  // Programs in languages the browser can't run (Java, C#, C++, Go...), on Judge0; signed-in people only, rate-limited
  '/api/run-code': logged('run-code', (body, env, meta) => runCode(body, env, meta?.authorization)),
  // Ask AI on the company's project and CRM boards: questions about the board and the process; the company's credit
  '/api/crm-assistant': logged('crm-assistant', billed('crm-assistant', (body, env) => crmAssistant(body, env.ANTHROPIC_API_KEY, env.ADVISOR_MODEL || 'claude-sonnet-5-5'))),
  // A board's formula column written from what the person says it should do; the company's credit
  '/api/write-formula': logged('write-formula', billed('write-formula', (body, env) => writeFormula(body, env.ANTHROPIC_API_KEY, env.ADVISOR_MODEL || 'claude-sonnet-5-5'))),
  // A candidate's CV read into their profile, for them to check: Praxa's cost, signed-in people only, a few an hour
  '/api/read-cv': logged('read-cv', (body, env, meta) => readCv(body, env, meta?.authorization, env.CV_MODEL || 'claude-haiku-5-5')),
  // Marking a candidate's answers is Praxa's cost, not the company's credit
  '/api/grade-answers': logged('grade-answers', (body, env) => gradeAnswers(body, env.ANTHROPIC_API_KEY, env.GRADING_MODEL || testModel(env))),
};
