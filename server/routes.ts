import { generateTest } from './generateTest';
import { gradeAnswers } from './gradeAnswers';

// The AI endpoints, answered by server.ts in production and the Vite dev server in development
type Env = Record<string, string | undefined>;
const testModel = (env: Env) => env.CLAUDE_MODEL || 'claude-haiku-5-5';

export const API_ROUTES: Record<string, (body: unknown, env: Env) => Promise<{ status: number; json: unknown }>> = {
  '/api/generate-test': (body, env) => generateTest(body, env.ANTHROPIC_API_KEY, testModel(env)),
  // Marking can use its own model; by default the same one
  '/api/grade-answers': (body, env) => gradeAnswers(body, env.ANTHROPIC_API_KEY, env.GRADING_MODEL || testModel(env)),
};
