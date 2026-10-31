import Anthropic from '@anthropic-ai/sdk';

/**
 * Writes a test from a prompt or job description with Claude, and picks tests from the library that fit.
 * When app simulations are asked for, Claude first researches the software the job uses on the web, then builds a
 * working copy of its interface from what it found.
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
  // What the web research found about the software, added here on the server
  research?: string;
}

export const MAX_PROMPT = 6000;

export const questionSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['choice', 'multi', 'text', 'order', 'match', 'code', 'sql', 'app'] },
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
    appHtml: { type: 'string' },
    timeLimitMinutes: { type: 'integer' },
    points: { type: 'integer' },
  },
  // testCases is always asked for, as an empty list where a style has none, so it isn't skipped where it's needed
  required: ['type', 'title', 'prompt', 'testCases', 'timeLimitMinutes', 'points'],
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

export const APP_RULES = `
- app: a working copy of the software the job uses, in which the candidate does a real task. Write at most 2, and when the
  job names software, make at least one. Base it on the RESEARCH, so someone who uses the product daily recognises it.
  appHtml: ONE self-contained HTML page, under 60KB:
  • Mimic the real product: its layout and navigation, colour scheme, typography, terminology, menu and button labels, and
    the screens the task needs, with icons drawn in inline SVG. Add enough of the surrounding interface that it feels like
    the product, but only the parts the task touches need to work.
  • Its <title> is the product's name alone, e.g. <title>ClickData</title>.
  • Everything inline: no external scripts, stylesheets, images or requests of any kind (Google Fonts are the only exception).
    No <form> submission and no alert/prompt/confirm: use buttons and in-page dialogs. It runs in a sandbox with no network.
  • Fill it with realistic made-up data for a made-up company, enough rows that the task takes real work.
  • The controls the task needs must really work: filters filter, charts redraw, fields save, rows can be added or edited.
  • Put all the script inside one (function () { ... })(), so no name clashes with the browser's own globals (top, name,
    parent, status, open, close and so on). Plain ES2020, no modules or libraries.
  • Keep everything the candidate can change in ONE plain JSON object. On load, start from window.vetterSaved when it isn't
    null (the candidate coming back to the task), otherwise from the starting state. Call vetter.save(state) once on load
    and again after every change. Never show which values are checked or what they should be.
  prompt: the task, as a manager would ask for it: the outcome wanted in 3 to 5 concrete steps, not which buttons to press.
  testCases (REQUIRED for app: an app question without them is thrown away): 3 to 6 checks on the final state. input is a dotted path into the state object, e.g. "dashboard.widgets.0.type"
  or "filters.region"; expectedOutput is its value once the task is done right ("|" between acceptable forms; a list as a
  JSON array, compared in any order; numbers to 2 decimal places). description says what's checked without giving the
  answer. The starting state must fail every check. Leave starterCode and solutionCode empty.
  Other questions may ask about what the candidate finds in the app, as long as the app shows it.`;

function instructions(req: GenerateRequest): string {
  return `You help companies on Vetter, a skills-based hiring platform, choose and write tests for a job.

${req.wantExisting ? `Pick up to 4 tests from the LIBRARY that genuinely fit the job, best first, each with a one-sentence reason a hiring manager would find useful. Only use ids from the library. Return an empty list if none fit.` : 'Return an empty "existing" list.'}

${
  req.wantNewTest
    ? `Write one new test of exactly ${req.questionCount} questions at ${req.level} level that checks what the job really needs, without repeating what the picked library tests already cover.
Use only these question styles: ${req.styles.join(', ')}. Mix them where it suits the job. Every question must be answerable from its prompt alone.
Style rules (testCases is an empty list for choice, multi, text, order and match):
- choice: 4 options, exactly one right; correctOption is its 0-based index.
- multi: 4 to 6 options; correctOptions lists every right index (at least 2).
- text: a short factual answer (a word, number or short phrase); acceptedAnswers lists every acceptable wording.
- order: 4 to 6 items listed in the RIGHT order (candidates see them shuffled).
- match: 3 to 5 pairs; each left prompt with its right answer, all distinct.
- code: JavaScript. starterCode defines "function solution(...)". solutionCode is a correct reference implementation. 3 to 5 testCases; input is a JSON array of the arguments, e.g. "[[3,1,2]]" calls solution([3,1,2]); expectedOutput is the JSON result.
- sql: query only these tables: ${req.tables.map((t) => `${t.name}(${t.columns.join(', ')})`).join('; ')}. List the tables used in "tables". solutionCode is a correct SQLite query; starterCode is a comment and "SELECT ".${req.styles.includes('app') ? APP_RULES : ''}
timeLimitMinutes is realistic for the question (2 to 5 for answer styles, 10 to 20 for code, sql and app). points reflect importance.
category must be one of: ${req.categories.join(', ')}. passingScore between 60 and 80. roles: pick from ${req.roles.join(', ')}.
Write plainly, in British English, with no em dashes.`
    : 'Do not include "test".'
}

${req.research ? `RESEARCH on the software the job uses:\n${req.research}\n\n` : ''}LIBRARY:
${req.library.map((t) => `- ${t.id}: ${t.title} (${t.category}, ${t.difficulty}; skills: ${t.skills.join(', ')}; roles: ${t.roles.join(', ')}). ${t.description}`).join('\n')}`;
}

// Dollars per million tokens for the model used, to log what each test costs
export const PRICES: Record<string, { input: number; output: number }> = {
  'claude-opus-5-5': { input: 4, output: 20 },
  'claude-sonnet-5-5': { input: 2, output: 10 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
};

// Researches the software the job uses, for app simulations to copy: plain notes, or empty when no product is named.
// Web search runs on Anthropic's side; a long search pauses the turn, which is resumed a few times at most
export async function researchSoftware(client: Anthropic, model: string, prompt: string): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: `The job or test the company described:\n\n${prompt.slice(0, MAX_PROMPT)}` }];
  for (let turn = 0; turn < 4; turn++) {
    const message = await client.beta.messages
      .stream({
        model,
        max_tokens: 16000,
        output_config: { effort: 'low' },
        // Dynamic filtering needs the larger models; Haiku has the basic search
        tools: [model.includes('haiku') ? { type: 'web_search_20250305', name: 'web_search', max_uses: 6 } : { type: 'web_search_20260209', name: 'web_search', max_uses: 6 }],
        ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
        system: `A skills test is being written for this job, including a simulation that copies the interface of the software the job uses, so candidates can show they can really use it.
Find the main software product the job or test names (one, the most central). If none is named, reply with exactly NONE.
Otherwise search the web (official docs, help centre, screenshots described in reviews and tutorials) and write compact notes for a developer rebuilding its interface:
- what the product is for, and who uses it
- the overall layout: top bar, sidebars, panels, where the main navigation sits, and what each main screen is called
- the look: colour scheme (hex values if you can find them), typography, density, how buttons, tables and cards look
- exact terminology: menu items, button labels, object names (e.g. what a "dashboard", "widget" or "data flow" is called)
- the core workflows a person in this job does in it, step by step, as the product does them
- example data the product typically holds
Only facts you found or can be confident of. Under 900 words. No preamble.`,
        messages,
      })
      .finalMessage();
    if (message.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: message.content });
      continue;
    }
    const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('').trim();
    const searches = message.usage.server_tool_use?.web_search_requests ?? 0;
    console.log(`[generate-test] researched the software: ${searches} searches, ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`);
    return message.stop_reason === 'refusal' || /^NONE\b/.test(text) ? '' : text;
  }
  return '';
}

export async function generateTest(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as GenerateRequest;
  if (!req || typeof req.prompt !== 'string' || !req.prompt.trim()) return { status: 400, json: { error: 'Describe the job or the test you want.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const client = new Anthropic({ apiKey });
  const wantsApp = req.wantNewTest && Array.isArray(req.styles) && req.styles.includes('app');
  try {
    // Research is a help, not a must: without it the app is built from what Claude already knows
    const research = wantsApp ? await researchSoftware(client, model, req.prompt).catch((err) => (console.error('[generate-test] research failed', err), '')) : '';
    // Streamed so a long test can't hit a request timeout; the finished message is all that's needed
    const message = await client.beta.messages
      .stream({
        model,
        // An app is a whole page of code, so it needs more room
        max_tokens: wantsApp ? 64000 : 32000,
        // Effort sets how much Claude thinks first; medium suits writing a test
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: responseSchema } },
        // If Claude declines on safety grounds, Anthropic re-runs the request on its recommended fallback model.
        // Haiku has no fallback, so it's only asked for on the larger models
        ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
        system: instructions({ ...req, research, questionCount: Math.min(15, Math.max(1, Math.round(req.questionCount || 6))) }),
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
    return apiFailure('generate-test', err);
  }
}

// A failed call to Claude, as the response the browser gets
export function apiFailure(name: string, err: unknown): { status: number; json: unknown } {
  if (err instanceof Anthropic.AuthenticationError) return { status: 503, json: { error: 'The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.' } };
  if (err instanceof Anthropic.RateLimitError) return { status: 429, json: { error: 'Too many requests to Claude right now. Try again in a minute.' } };
  if (err instanceof Anthropic.APIError) console.error(`[${name}] ${err.message}`);
  if (err instanceof Anthropic.APIError) return { status: 502, json: { error: `Claude returned an error (${err.status}).` } };
  return { status: 502, json: { error: err instanceof Error ? err.message : 'The AI request failed.' } };
}
