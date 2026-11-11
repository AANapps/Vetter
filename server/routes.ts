import { generateTest } from './generateTest.js';
import { gradeAnswers } from './gradeAnswers.js';
import { testChat } from './testChat.js';
import { buildApp } from './buildApp.js';
import { planTest } from './planTest.js';
import { writeQuestions } from './writeQuestions.js';
import { checkSpec } from './checkSpec.js';
import { testAdvisor } from './testAdvisor.js';
import { taskAssistant } from './taskAssistant.js';
import { metered } from './meter.js';
import { PACKS, balanceFor, billingOn, charge, confirmTopUp, hasEnough, penceFor, startTopUp, usageFor, whoIsAsking } from './credits.js';

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
  // The test a request is for (the X-Vetter-For header), named in the company's usage
  purpose?: string;
}

// The X-Vetter-For header as sent (URI-encoded, so any title fits in a header)
export const purposeOf = (header: string | string[] | undefined) => {
  try {
    return decodeURIComponent(String(Array.isArray(header) ? header[0] : header ?? '')).replace(/\s+/g, ' ').trim().slice(0, 120);
  } catch {
    return '';
  }
};
type Handler = (body: unknown, env: Env, meta?: RequestMeta) => Promise<{ status: number; json: unknown }>;

const BUSY = "Vetter's AI is busy right now. Nothing is lost: try again in a little while.";

// Failures are logged with their reason, so a request that didn't work can be traced
const logged =
  (name: string, handler: Handler): Handler =>
  async (body, env, meta) => {
    const result = await handler(body, env, meta);
    if (result.status >= 400) console.error(`[${name}] ${result.status}: ${JSON.stringify(result.json)}`);
    return result;
  };

// Writing tests is paid for from the company's credit (server/credits.ts): it needs some left to start, and is charged
// what it really cost once it's done. The Vetter team isn't charged; with no Stripe key set up, nobody is
const billed =
  (name: string, handler: Handler): Handler =>
  async (body, env, meta) => {
    if (!billingOn(env)) return handler(body, env, meta);
    const caller = await whoIsAsking(meta?.authorization, env);
    if (caller.kind === 'none') return { status: 401, json: { error: caller.reason } };
    if (caller.kind === 'admin') return handler(body, env, meta);
    try {
      const balance = await balanceFor(env, caller.companyId);
      if (!hasEnough(balance)) return { status: 402, json: { error: 'no-credit', balance } };
    } catch (err) {
      console.error(`[${name}] couldn't read the credit balance`, err);
      return { status: 503, json: { error: BUSY } };
    }
    const { result, usd } = await metered(() => handler(body, env, meta));
    const pence = penceFor(usd, env);
    try {
      await charge(env, caller.companyId, pence, name, meta?.purpose ?? '');
      console.log(`[${name}] ${caller.companyId} charged ${pence}p ($${usd.toFixed(3)} at cost)`);
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
      const pence = Number(req.pence);
      if (!PACKS.includes(pence)) return { status: 400, json: { error: 'Pick one of the credit packs.' } };
      return { status: 200, json: { url: await startTopUp(env, caller.companyId, pence, meta?.origin ?? '') } };
    }
    if (req.action === 'usage') return { status: 200, json: { billing: true, usage: await usageFor(env, caller.companyId) } };
    if (req.action === 'confirm' && req.sessionId)
      return { status: 200, json: { billing: true, packs: PACKS, ...(await confirmTopUp(env, caller.companyId, req.sessionId)) } };
    return { status: 200, json: { billing: true, packs: PACKS, balance: await balanceFor(env, caller.companyId) } };
  } catch (err) {
    console.error('[credits]', err);
    return { status: 502, json: { error: "Couldn't reach the payment service. Try again in a moment." } };
  }
}

export const API_ROUTES: Record<string, Handler> = {
  '/api/credits': logged('credits', credits),
  '/api/generate-test': logged('generate-test', billed('generate-test', (body, env) => generateTest(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  '/api/test-chat': logged('test-chat', billed('test-chat', (body, env) => testChat(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  // A new test in stages, each request short enough for the host's time limit: the plan, then every section written in
  // parallel, then every interactive page built in parallel
  '/api/plan-test': logged('plan-test', billed('plan-test', (body, env) => planTest(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  '/api/write-questions': logged('write-questions', billed('write-questions', (body, env) => writeQuestions(body, env.ANTHROPIC_API_KEY, testModel(env), specModel(env)))),
  // Each app simulation's spec checked against how the job is really done, before its page is built
  '/api/check-spec': logged('check-spec', billed('check-spec', (body, env) => checkSpec(body, env.ANTHROPIC_API_KEY, specModel(env)))),
  // Each interactive page of a test, built in its own request so a long test fits the host's time limit
  '/api/build-app': logged('build-app', billed('build-app', (body, env) => buildApp(body, env.ANTHROPIC_API_KEY, testModel(env)))),
  // The company home's chat recommends tests and plans; it writes nothing, so a quicker model is enough by default
  // (and it's free, so companies can ask before they buy)
  '/api/test-advisor': logged('test-advisor', (body, env) => testAdvisor(body, env.ANTHROPIC_API_KEY, env.ADVISOR_MODEL || 'claude-sonnet-5-5')),
  // The assistant candidates work with in an AI-assisted task: Vetter's cost, like marking, on a quick model by default
  '/api/task-assistant': logged('task-assistant', (body, env) => taskAssistant(body, env.ANTHROPIC_API_KEY, env.ASSISTANT_MODEL || 'claude-haiku-5-5')),
  // Marking a candidate's answers is Vetter's cost, not the company's credit
  '/api/grade-answers': logged('grade-answers', (body, env) => gradeAnswers(body, env.ANTHROPIC_API_KEY, env.GRADING_MODEL || testModel(env))),
};
