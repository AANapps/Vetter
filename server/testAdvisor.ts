import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { PRICES, apiFailure } from './generateTest.js';

/**
 * The company home's chat: a company says who it's hiring, and Vetter answers with a short roadmap, the library tests
 * that fit, and any custom pieces worth building (an app simulation of a tool the role uses, say). It recommends only;
 * writing a custom test is the test chat's job (server/testChat.ts), and that part needs a paid plan.
 * Asked for candidates, it also picks the ones on Vetter who suit the role and says why, from their verified scores.
 */

export interface AdvisorRequest {
  messages: { role: 'user' | 'assistant'; text: string }[];
  library: { id: string; title: string; category: string; difficulty: string; skills: string[]; roles: string[]; description: string; minutes: number; types: string[] }[];
  company?: string;
  // Candidates' public profiles, cut down to what judging fit needs
  candidates?: { id: string; title: string; location: string; stage?: string; years: number; work: string; studied?: string; skills: { name: string; score: number; level: string }[]; tests: number; jobs?: string[] }[];
}

const MAX_CANDIDATES = 150;

const MAX_TURNS = 20;
const MAX_TEXT = 3000;

const responseSchema = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['candidates', 'test', 'both', 'unclear'] },
    reply: { type: 'string' },
    options: { type: 'array', items: { type: 'string' } },
    brief: { type: 'string' },
    roadmap: {
      type: 'array',
      items: { type: 'object', properties: { step: { type: 'string' }, detail: { type: 'string' } }, required: ['step', 'detail'], additionalProperties: false },
    },
    existing: {
      type: 'array',
      items: { type: 'object', properties: { testId: { type: 'string' }, reason: { type: 'string' } }, required: ['testId', 'reason'], additionalProperties: false },
    },
    custom: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          kind: { type: 'string', enum: ['app', 'sheet', 'database', 'code', 'written', 'mixed'] },
          why: { type: 'string' },
          brief: { type: 'string' },
        },
        required: ['title', 'kind', 'why', 'brief'],
        additionalProperties: false,
      },
    },
    people: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          candidateId: { type: 'string' },
          reason: { type: 'string' },
          gaps: { type: 'array', items: { type: 'string' } },
          testBrief: { type: 'string' },
        },
        required: ['candidateId', 'reason', 'gaps', 'testBrief'],
        additionalProperties: false,
      },
    },
  },
  required: ['intent', 'reply', 'options', 'brief', 'roadmap', 'existing', 'custom', 'people'],
  additionalProperties: false,
};

const instructions = (req: AdvisorRequest) =>
  [
    `You are Vetter's hiring assistant for ${req.company ? `${req.company}, a company hiring on Vetter` : 'a company hiring on Vetter'}. You do two jobs: find candidates on Vetter who suit a role, and help the company test for a role, with tests from Vetter's library or a custom test Vetter's AI writes for them. Vetter tests are hands-on: code and SQL tasks run against checks, spreadsheet and database tasks, written answers marked on a rubric, case studies, and app simulations (a working copy of software the role uses, such as a CRM, a help desk or an ad manager, where the candidate does real work).`,
    'First decide what the company wants from its latest message, read with the conversation so far, and set intent:',
    '- "candidates": they want people. "I\'m looking for a data analyst", "we need a React developer", "who could do this job", "any good marketers?", "find me someone" all mean candidates: looking for or needing a person is a search for people, not a test.',
    '- "test": they want to make or pick a test. "I want to create a test", "make me an assessment", "how should I test a data analyst", "what test should I send" all mean test. Wanting to create or make a test means writing a custom one with Vetter\'s AI.',
    '- "both": they plainly ask for people and a test in one go.',
    '- "unclear": you can\'t tell which, or there\'s no role to work from at all (e.g. "hi", "help", "data"). Then ask one short question in reply and give two to four quick answers in options, written as the company would say them (e.g. "Find me data analysts", "Create a data analyst test"). Leave every list empty.',
    'Follow-ups keep the intent of the conversation unless they change it ("now make a test for them" moves from candidates to test).',
    'Then answer with:',
    '- reply: two to four plain sentences in British English. For candidates, say how many you found, what you looked for, and that they can send tests to verify any gaps. For test, say what matters most to test for this role and level, and why, then end by asking whether they\'d like a skills test (separate questions on the skills) or a job simulation (a working day at their company, with colleagues, emails and the real tools); they choose with the two buttons shown under your reply, so don\'t add options for it. If the role or level is missing for a test, ask for it in reply, give options, and leave the lists empty.',
    '- options: quick answers for a question you ask in reply; otherwise empty.',
    '- brief: for test or both, two or three sentences Vetter\'s AI could write the custom test from: the role, level, tools, what the candidate must do and roughly how long. Empty for candidates or unclear, or when you are still asking for the role.',
    '- roadmap: for test or both, two to five short steps for how to assess the role with Vetter, in order (e.g. a screening test from the library, a hands-on simulation, a written case, then an interview on their answers), one sentence each. Empty otherwise.',
    '- existing: for test or both, up to four tests from THE LIBRARY below on the same subject, best first, by their exact id, each with a one-sentence reason tied to the role. Include the closest even when the level or focus isn\'t exact, and say so in the reason (e.g. "Pitched at senior; edit a copy to make it junior-friendly"). Empty otherwise.',
    '- custom: for test or both, up to three custom pieces worth building where the library has a gap or a simulation of a specific tool would show far more. Each has a short title, a kind (app for an app simulation, sheet, database, code, written, or mixed), why it adds signal the library lacks, and a brief of two or three sentences naming the role, level, tool and what the candidate must do. Empty otherwise.',
    '- people: for candidates or both, up to five from THE CANDIDATES below who best suit the role, best first, by their exact id. Each reason is one or two sentences naming the verified scores and facts (jobs, experience, place, way of working) that make them fit, e.g. "Scored 88 on SQL and 81 on Excel; three years as an analyst at Northwind, London, open to hybrid". gaps lists the skills the role needs that they have no verified score for, or only a weak one, as short names like "SQL" or "Excel"; empty when nothing important is missing. Candidates with no verified skills can still be listed when their title and jobs fit, with the role\'s key skills as gaps. testBrief is two sentences Vetter\'s AI could write a short test from to check those gaps for this role and level; empty when gaps is empty. If no one fits well, say so and list the closest. Empty for test or unclear.',
    'Recommend; never write questions. Never invent library tests, candidates or ids. Don\'t mention prices or plans.',
    `THE LIBRARY:\n${JSON.stringify(req.library)}`,
    `THE CANDIDATES:\n${JSON.stringify((req.candidates ?? []).slice(0, MAX_CANDIDATES))}`,
  ].join('\n\n');

export async function testAdvisor(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as AdvisorRequest;
  const last = req?.messages?.[req.messages.length - 1];
  if (!req || !Array.isArray(req.messages) || last?.role !== 'user' || !last.text?.trim()) return { status: 400, json: { error: 'Say who you are hiring.' } };
  if (!Array.isArray(req.library)) return { status: 400, json: { error: 'No library sent.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const client = new Anthropic({ apiKey });
  try {
    const message = await client.beta.messages.create({
      model,
      max_tokens: 4000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: responseSchema } },
      system: [{ type: 'text', text: instructions(req), cache_control: { type: 'ephemeral' } }],
      messages: req.messages.slice(-MAX_TURNS).map((m) => ({ role: m.role, content: String(m.text).slice(0, MAX_TEXT) })),
    });
    meter(model, message.usage);
    if (message.stop_reason === 'refusal') return { status: 422, json: { error: 'Vetter couldn’t help with that. Try describing the role differently.' } };
    const price = PRICES[model];
    const { input_tokens, output_tokens } = message.usage;
    if (price) console.log(`[test-advisor] ${input_tokens} in, ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(4)}`);
    const out = JSON.parse(message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join(''));
    const ids = new Set(req.library.map((t) => t.id));
    const people = new Set((req.candidates ?? []).map((c) => c.id));
    return {
      status: 200,
      json: {
        ...out,
        existing: (out.existing ?? []).filter((e: { testId: string }) => ids.has(e.testId)),
        people: (out.people ?? []).filter((p: { candidateId: string }) => people.has(p.candidateId)).slice(0, 5),
      },
    };
  } catch (err) {
    return apiFailure('test-advisor', err);
  }
}
