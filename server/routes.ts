import { generateTest } from './generateTest';
import { gradeAnswers } from './gradeAnswers';
import { testChat } from './testChat';

// The AI endpoints, answered by server.ts in production and the Vite dev server in development
type Env = Record<string, string | undefined>;
const testModel = (env: Env) => env.CLAUDE_MODEL || 'claude-haiku-5-5';

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
  // Marking can use its own model; by default the same one
  '/api/grade-answers': logged('grade-answers', (body, env) => gradeAnswers(body, env.ANTHROPIC_API_KEY, env.GRADING_MODEL || testModel(env))),
};
