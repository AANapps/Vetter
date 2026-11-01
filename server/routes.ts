import { generateTest } from './generateTest.js';
import { gradeAnswers } from './gradeAnswers.js';
import { testChat } from './testChat.js';
import { buildApp } from './buildApp.js';
import { planTest } from './planTest.js';
import { writeQuestions } from './writeQuestions.js';

// The AI endpoints, answered by server.ts in production and the Vite dev server in development
type Env = Record<string, string | undefined>;
// Opus by default: writing a test that really tests someone is worth the most capable model
const testModel = (env: Env) => env.CLAUDE_MODEL || 'claude-opus-5-5';

type Handler = (body: unknown, env: Env) => Promise<{ status: number; json: unknown }>;

// Failures are logged with their reason, so a request that didn't work can be traced
const logged =
  (name: string, handler: Handler): Handler =>
  async (body, env) => {
    const result = await handler(body, env);
    if (result.status >= 400) console.error(`[${name}] ${result.status}: ${JSON.stringify(result.json)}`);
    return result;
  };

export const API_ROUTES: Record<string, Handler> = {
  '/api/generate-test': logged('generate-test', (body, env) => generateTest(body, env.ANTHROPIC_API_KEY, testModel(env))),
  '/api/test-chat': logged('test-chat', (body, env) => testChat(body, env.ANTHROPIC_API_KEY, testModel(env))),
  // A new test in stages, each request short enough for the host's time limit: the plan, then every section written in
  // parallel, then every interactive page built in parallel
  '/api/plan-test': logged('plan-test', (body, env) => planTest(body, env.ANTHROPIC_API_KEY, testModel(env))),
  '/api/write-questions': logged('write-questions', (body, env) => writeQuestions(body, env.ANTHROPIC_API_KEY, testModel(env))),
  // Each interactive page of a test, built in its own request so a long test fits the host's time limit
  '/api/build-app': logged('build-app', (body, env) => buildApp(body, env.ANTHROPIC_API_KEY, testModel(env))),
  // Marking can use its own model; by default the same one
  '/api/grade-answers': logged('grade-answers', (body, env) => gradeAnswers(body, env.ANTHROPIC_API_KEY, env.GRADING_MODEL || testModel(env))),
};
