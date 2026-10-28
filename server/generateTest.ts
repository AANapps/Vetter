import Anthropic from '@anthropic-ai/sdk';

/**
 * Writes a test from a prompt or job description with Claude, and picks tests from the library that fit.
 * Runs on the server so the API key never reaches the browser. The browser checks everything that comes back
 * (src/lib/testGeneration.ts) before anyone sees it.
 */

export interface GenerateRequest {
  prompt: string;
  wantNewTest: boolean;
  wantExisting: boolean;
  questionCount: number;
  styles: string[];
  level: string;
  // The tests already on Vetter the company could use, and roles a library test can be filed under
  library: { id: string; title: string; category: string; difficulty: string; skills: string[]; roles: string[]; description: string }[];
  roles: string[];
  categories: string[];
  // Sample tables SQL questions can query
  tables: { name: string; columns: string[] }[];
}

const MAX_PROMPT = 6000;

const questionSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['choice', 'multi', 'text', 'order', 'match', 'code', 'sql'] },
    title: { type: 'string' },
    prompt: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    correctOption: { type: 'integer' },
    correctOptions: { type: 'array', items: { type: 'integer' } },
    acceptedAnswers: { type: 'array', items: { type: 'string' } },
    items: { type: 'array', items: { type: 'string' } },
    pairs: { type: 'array', items: { type: 'object', properties: { left: { type: 'string' }, right: { type: 'string' } }, required: ['left', 'right'], additionalProperties: false } },
    starterCode: { type: 'string' },
    solutionCode: { type: 'string' },
    testCases: {
      type: 'array',
      items: {
        type: 'object',
        properties: { description: { type: 'string' }, input: { type: 'string' }, expectedOutput: { type: 'string' } },
        required: ['description', 'input', 'expectedOutput'],
        additionalProperties: false,
      },
    },
    tables: { type: 'array', items: { type: 'string' } },
    timeLimitMinutes: { type: 'integer' },
    points: { type: 'integer' },
  },
  required: ['type', 'title', 'prompt', 'timeLimitMinutes', 'points'],
  additionalProperties: false,
};

const responseSchema = {
  type: 'object',
  properties: {
    existing: {
      type: 'array',
      items: { type: 'object', properties: { testId: { type: 'string' }, reason: { type: 'string' } }, required: ['testId', 'reason'], additionalProperties: false },
    },
    test: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        passingScore: { type: 'integer' },
        skillsTested: { type: 'array', items: { type: 'string' } },
        roles: { type: 'array', items: { type: 'string' } },
        questions: { type: 'array', items: questionSchema },
      },
      required: ['title', 'description', 'category', 'passingScore', 'skillsTested', 'questions'],
      additionalProperties: false,
    },
  },
  required: ['existing'],
  additionalProperties: false,
};

function instructions(req: GenerateRequest): string {
  return `You help companies on Vetter, a skills-based hiring platform, choose and write tests for a job.

${req.wantExisting ? `Pick up to 4 tests from the LIBRARY that genuinely fit the job, best first, each with a one-sentence reason a hiring manager would find useful. Only use ids from the library. Return an empty list if none fit.` : 'Return an empty "existing" list.'}

${
  req.wantNewTest
    ? `Write one new test of exactly ${req.questionCount} questions at ${req.level} level that checks what the job really needs, without repeating what the picked library tests already cover.
Use only these question styles: ${req.styles.join(', ')}. Mix them where it suits the job. Every question must be answerable from its prompt alone.
Style rules:
- choice: 4 options, exactly one right; correctOption is its 0-based index.
- multi: 4 to 6 options; correctOptions lists every right index (at least 2).
- text: a short factual answer (a word, number or short phrase); acceptedAnswers lists every acceptable wording.
- order: 4 to 6 items listed in the RIGHT order (candidates see them shuffled).
- match: 3 to 5 pairs; each left prompt with its right answer, all distinct.
- code: JavaScript. starterCode defines "function solution(...)". solutionCode is a correct reference implementation. 3 to 5 testCases; input is a JSON array of the arguments, e.g. "[[3,1,2]]" calls solution([3,1,2]); expectedOutput is the JSON result.
- sql: query only these tables: ${req.tables.map((t) => `${t.name}(${t.columns.join(', ')})`).join('; ')}. List the tables used in "tables". solutionCode is a correct SQLite query; starterCode is a comment and "SELECT ".
timeLimitMinutes is realistic for the question (2 to 5 for answer styles, 10 to 20 for code and sql). points reflect importance.
category must be one of: ${req.categories.join(', ')}. passingScore between 60 and 80. roles: pick from ${req.roles.join(', ')}.
Write plainly, in British English, with no em dashes.`
    : 'Do not include "test".'
}

LIBRARY:
${req.library.map((t) => `- ${t.id}: ${t.title} (${t.category}, ${t.difficulty}; skills: ${t.skills.join(', ')}; roles: ${t.roles.join(', ')}). ${t.description}`).join('\n')}`;
}

// Dollars per million tokens for the model used, to log what each test costs
const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
};

export async function generateTest(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as GenerateRequest;
  if (!req || typeof req.prompt !== 'string' || !req.prompt.trim()) return { status: 400, json: { error: 'Describe the job or the test you want.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const client = new Anthropic({ apiKey });
  try {
    // Streamed so a long test can't hit a request timeout; the finished message is all that's needed
    const message = await client.beta.messages
      .stream({
        model,
        max_tokens: 32000,
        // Effort sets how much Claude thinks first; medium suits writing a test
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: responseSchema } },
        // If Claude declines on safety grounds, Anthropic re-runs the request on its recommended fallback model.
        // Haiku has no fallback, so it's only asked for on the larger models
        ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
        system: instructions({ ...req, questionCount: Math.min(15, Math.max(1, Math.round(req.questionCount || 6))) }),
        messages: [{ role: 'user', content: `The job or test the company described:\n\n${req.prompt.slice(0, MAX_PROMPT)}` }],
      })
      .finalMessage();

    const price = PRICES[model];
    const { input_tokens, output_tokens } = message.usage;
    if (price) console.log(`[generate-test] ${input_tokens} in, ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(3)}`);

    if (message.stop_reason === 'refusal') return { status: 422, json: { error: "Claude declined to write this test. Try describing the job differently." } };
    if (message.stop_reason === 'max_tokens') return { status: 502, json: { error: 'The test came back incomplete. Try fewer questions.' } };
    const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
    return { status: 200, json: JSON.parse(text) };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return { status: 503, json: { error: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.' } };
    if (err instanceof Anthropic.RateLimitError) return { status: 429, json: { error: 'Too many requests to Claude right now. Try again in a minute.' } };
    if (err instanceof Anthropic.APIError) return { status: 502, json: { error: `Claude returned an error (${err.status}).` } };
    return { status: 502, json: { error: err instanceof Error ? err.message : 'The AI request failed.' } };
  }
}
