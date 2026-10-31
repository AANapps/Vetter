import Anthropic from '@anthropic-ai/sdk';
import { APP_RULES, MAX_PROMPT, PRICES, apiFailure, questionSchema, researchSoftware } from './generateTest';

/**
 * Building a test by talking to Vetter: the company says what it wants, Vetter writes a draft, and every message after
 * that changes the draft (harder, shorter, more Excel, drop question 3). Each turn gets the conversation and the draft
 * as it stands, and sends back a reply plus the draft's new version, or nothing when it doesn't change.
 * Questions Vetter leaves as they are come back as { keep: id }, so a long app simulation isn't rewritten each turn.
 * The browser checks every new question (src/lib/testChat.ts) before it joins the draft.
 */

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; text: string }[];
  // The job the test is for, written out, when it's built from one
  job?: string;
  // The draft as it stands, with app pages left out (see draftForModel in src/lib/testChat.ts)
  draft?: Record<string, unknown>;
  // Library tests already picked, when picking from the library
  existing: string[];
  wantExisting: boolean;
  library: { id: string; title: string; category: string; difficulty: string; skills: string[]; roles: string[]; description: string }[];
  roles: string[];
  categories: string[];
  levels: string[];
  tables: { name: string; columns: string[] }[];
  // Notes on the software the app simulations copy, from an earlier turn, and which product they're about
  research?: string;
  researchedFor?: string;
}

const MAX_TURNS = 24;
const MAX_TEXT = 4000;

const responseSchema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    existing: {
      type: 'array',
      items: { type: 'object', properties: { testId: { type: 'string' }, reason: { type: 'string' } }, required: ['testId', 'reason'], additionalProperties: false },
    },
    // The main software product the app simulations copy, or "" when there are none
    software: { type: 'string' },
    // A product to research before an app simulation of it is written, or ""
    lookUp: { type: 'string' },
    test: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        difficulty: { type: 'string' },
        passingScore: { type: 'integer' },
        skillsTested: { type: 'array', items: { type: 'string' } },
        roles: { type: 'array', items: { type: 'string' } },
        questions: {
          type: 'array',
          items: {
            anyOf: [{ type: 'object', properties: { keep: { type: 'string' } }, required: ['keep'], additionalProperties: false }, questionSchema],
          },
        },
      },
      required: ['title', 'description', 'category', 'difficulty', 'passingScore', 'skillsTested', 'questions'],
      additionalProperties: false,
    },
  },
  required: ['reply', 'existing', 'software', 'lookUp'],
  additionalProperties: false,
};

function instructions(req: ChatRequest, research: string): string {
  return `You are Vetter's test designer, talking with a company on Vetter, a skills-based hiring platform. Together you build one skills test for a job, refining it over the conversation.

HOW TO TALK
- Reply like a sharp, friendly hiring consultant: short, plain British English, no em dashes, no markdown headings. 1 to 4 sentences usually.
- If the first message is too vague to write a useful test (no idea of the role or what matters), ask up to 2 short questions instead of writing. Otherwise write a first draft straight away; don't interrogate.
- After writing or changing the draft, say in a sentence what you did, then offer one or two specific ways to sharpen it (e.g. "Want a task in Xero itself?").
- When asked to change something, change exactly that and keep the rest. Questions are numbered from 1 in the order of the draft.
- If asked something you can't do (a style not listed below, uploading files), say so and offer the nearest thing.

THE DRAFT
- Include "test" whenever the draft is new or changes, with every question in order. For a question that stays exactly as it is, send only { "keep": "<its id>" }. Leave "test" out when nothing changes (a question, a chat).
- An app question can only be kept whole or written again from scratch.
- 4 to 12 questions unless the company asks otherwise (never more than 15). Default 6. difficulty is one of: ${req.levels.join(', ')}; pick it from the job unless told.
- Every question must be answerable from its prompt alone, and check what the job really needs, not trivia.
- Styles: choice, multi, text, order, match, app for any job; code and sql only for technical or data roles, or when asked.
Style rules (testCases is an empty list for choice, multi, text, order and match):
- choice: 4 options, exactly one right; correctOption is its 0-based index.
- multi: 4 to 6 options; correctOptions lists every right index (at least 2).
- text: a short factual answer (a word, number or short phrase); acceptedAnswers lists every acceptable wording.
- order: 4 to 6 items listed in the RIGHT order (candidates see them shuffled).
- match: 3 to 5 pairs; each left prompt with its right answer, all distinct.
- code: JavaScript. starterCode defines "function solution(...)". solutionCode is a correct reference implementation. 3 to 5 testCases; input is a JSON array of the arguments, e.g. "[[3,1,2]]" calls solution([3,1,2]); expectedOutput is the JSON result.
- sql: query only these tables: ${req.tables.map((t) => `${t.name}(${t.columns.join(', ')})`).join('; ')}. List the tables used in "tables". solutionCode is a correct SQLite query; starterCode is a comment and "SELECT ".${APP_RULES}
timeLimitMinutes is realistic for the question (2 to 5 for answer styles, 10 to 20 for code, sql and app). points reflect importance.
category must be one of: ${req.categories.join(', ')}. passingScore between 60 and 80. roles: pick from ${req.roles.join(', ')}.
software: the one product the app simulations copy (e.g. "Xero"), or "" when the draft has none.
lookUp: when this turn should add (or rewrite) an app simulation of a product that the RESEARCH below doesn't cover${research ? '' : ' (there is no research yet)'}, put the product's name here and send only reply "" and existing, with no test; Vetter researches it and asks you again. Otherwise "".

${
  req.wantExisting
    ? `LIBRARY PICKS: "existing" lists up to 4 tests from the LIBRARY that genuinely fit the job alongside the new test, best first, each with a one-sentence reason a hiring manager would find useful. Only ids from the library. Keep the current picks unless the conversation changes what fits.`
    : 'Return an empty "existing" list.'
}

${research ? `RESEARCH on the software the job uses:\n${research}\n\n` : ''}LIBRARY:
${req.library.map((t) => `- ${t.id}: ${t.title} (${t.category}, ${t.difficulty}; skills: ${t.skills.join(', ')}; roles: ${t.roles.join(', ')}). ${t.description}`).join('\n')}`;
}

// The conversation as Claude sees it; the latest message carries the job and the draft as they stand
function conversation(req: ChatRequest): Anthropic.Beta.BetaMessageParam[] {
  const turns = req.messages.slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.text.slice(0, MAX_TEXT) }));
  // Claude's turns must alternate and start with the company's
  while (turns.length && turns[0].role !== 'user') turns.shift();
  const last = turns[turns.length - 1];
  const context = [
    req.job ? `THE JOB:\n${req.job.slice(0, MAX_PROMPT)}` : '',
    req.draft ? `THE DRAFT AS IT STANDS:\n${JSON.stringify(req.draft)}` : 'THERE IS NO DRAFT YET.',
    req.wantExisting ? `LIBRARY TESTS PICKED SO FAR: ${req.existing.length ? req.existing.join(', ') : 'none'}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  return [...turns.slice(0, -1), { role: 'user', content: `${context}\n\nTHE COMPANY SAYS:\n${last.content}` }];
}

const sameProduct = (a = '', b = '') => a.trim().toLowerCase() === b.trim().toLowerCase();

async function turn(client: Anthropic, model: string, req: ChatRequest, research: string) {
  const message = await client.beta.messages
    .stream({
      model,
      max_tokens: 64000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: responseSchema } },
      ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
      // The instructions and library stay the same across a conversation, so they're cached
      system: [{ type: 'text', text: instructions(req, research), cache_control: { type: 'ephemeral' } }],
      messages: conversation(req),
    })
    .finalMessage();
  const price = PRICES[model];
  const { input_tokens, output_tokens, cache_read_input_tokens } = message.usage;
  if (price) console.log(`[test-chat] ${input_tokens} in (${cache_read_input_tokens ?? 0} cached), ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(3)}`);
  return message;
}

export async function testChat(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as ChatRequest;
  if (!req || !Array.isArray(req.messages) || req.messages[req.messages.length - 1]?.role !== 'user' || !req.messages[req.messages.length - 1].text?.trim())
    return { status: 400, json: { error: 'Say what you want the test to check.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const client = new Anthropic({ apiKey });
  try {
    let research = req.research ?? '';
    let researchedFor = req.researchedFor ?? '';
    const parse = (m: Anthropic.Beta.BetaMessage) => JSON.parse(m.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join(''));

    let message = await turn(client, model, req, research);
    if (message.stop_reason === 'refusal') return { status: 422, json: { error: 'Vetter declined to write this. Try describing the job differently.' } };
    if (message.stop_reason === 'max_tokens') return { status: 502, json: { error: 'The test came back incomplete. Try asking for fewer questions.' } };
    let out = parse(message);

    // An app simulation of software not looked up yet: research it on the web, then write the turn with what was found
    if (out.lookUp && !sameProduct(out.lookUp, researchedFor)) {
      const brief = [`The software: ${out.lookUp}`, req.job, ...req.messages.filter((m) => m.role === 'user').map((m) => m.text)].filter(Boolean).join('\n\n');
      const found = await researchSoftware(client, model, brief).catch((err) => (console.error('[test-chat] research failed', err), ''));
      // Without research the app is built from what Claude already knows, with a note so it doesn't ask again
      research = found || `Nothing could be found on the web about ${out.lookUp}; build it from what you know.`;
      researchedFor = out.lookUp;
      message = await turn(client, model, req, research);
      if (message.stop_reason === 'refusal') return { status: 422, json: { error: 'Vetter declined to write this. Try describing the job differently.' } };
      if (message.stop_reason === 'max_tokens') return { status: 502, json: { error: 'The test came back incomplete. Try asking for fewer questions.' } };
      out = parse(message);
    }
    return { status: 200, json: { ...out, research, researchedFor } };
  } catch (err) {
    return apiFailure('test-chat', err);
  }
}
