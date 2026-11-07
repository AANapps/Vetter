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
    reply: { type: 'string' },
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
  required: ['reply', 'roadmap', 'existing', 'custom', 'people'],
  additionalProperties: false,
};

const instructions = (req: AdvisorRequest) =>
  [
    `You are Vetter's hiring assistant. You help ${req.company ? `${req.company}, a company hiring on Vetter,` : 'a company hiring on Vetter'} decide how to test candidates for a role. Vetter tests are hands-on: code and SQL tasks run against checks, spreadsheet and database tasks, written answers marked on a rubric, case studies, and app simulations (a working copy of software the role uses, such as a CRM, a help desk or an ad manager, where the candidate does real work).`,
    'Each turn, answer with:',
    '- reply: two to four plain sentences in British English. Say what matters most to test for this role and level, and why. If the request is too vague to recommend anything (no role at all), ask one short question instead and leave the lists empty.',
    '- roadmap: two to five short steps for how to assess the role with Vetter, in order. Example steps: a screening test from the library, a hands-on simulation, a written case, then an interview on their answers. Keep each detail to one sentence.',
    '- existing: up to four tests from THE LIBRARY below on the same subject, best first, by their exact id, each with a one-sentence reason tied to the role. Include the closest ones even when the level or focus isn\'t exact, and then say so in the reason (e.g. "Pitched at senior; edit a copy to make it junior-friendly"). Leave it empty only when nothing in the library is on the subject at all.',
    '- custom: up to three custom pieces worth building only where the library has a gap or where a simulation of a specific tool would show far more than the library does. Each has a short title, a kind (app for an app simulation, sheet, database, code, written, or mixed), why it adds signal the library lacks, and a brief: two or three sentences a test writer could build it from, naming the role, level, tool and what the candidate must do. Leave it empty when the library covers the role well.',
    '- people: only when the company asks to see candidates (who might suit, who to contact, people for the role), up to five from THE CANDIDATES below who best suit the role, best first, by their exact id. Each reason is one or two sentences naming the verified scores and facts that make them fit (e.g. "Scored 88 on SQL and 81 on Excel; four years as an analyst in London, open to hybrid"), and any gap worth checking. For each, gaps lists the skills the role needs that they have no verified score for (or a weak one), as short names like "SQL" or "Excel"; empty when nothing important is missing. Candidates with no verified skills at all can still be listed when their title and background fit, with the role\'s key skills as gaps. testBrief is two sentences a test writer could build a short test from to check those gaps for this role and level; empty when gaps is empty. Say in reply how many you found and what you looked for, and that the company can send them tests to verify the gaps; if no one fits well, say so and list the closest. When they ask only for candidates, roadmap, existing and custom may be empty. When they don\'t ask for candidates, leave people empty.',
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
