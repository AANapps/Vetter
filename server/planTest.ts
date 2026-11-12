import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { MAX_PROMPT, PRICES, apiFailure, researchJob, researchSoftware } from './generateTest.js';
import { ChatRequest, backgroundNote, levelPick, styleGuide, stylesNote } from './testChat.js';

/**
 * The first step of writing a test from the conversation: what the hire needs (the blueprint) and an outline of every
 * question, case and task, without writing them out. It's quick, so the company hears back fast; the browser then has
 * each section written in parallel (server/writeQuestions.ts) and each interactive page built (server/buildApp.ts),
 * every request short enough for the host's time limit.
 */

const MAX_TURNS = 24;
const MAX_TEXT = 4000;

const ITEM_TYPES = ['choice', 'multi', 'text', 'written', 'order', 'match', 'email', 'assistant', 'case', 'code', 'sql', 'sheet', 'database', 'app'];

// The plan's item types are held to the styles the company picked (a case or task needs its own style picked too)
const schemaFor = (styles?: string[]) => {
  const allowed = styles?.length ? ITEM_TYPES.filter((t) => styles.includes(t)) : ITEM_TYPES;
  const plan = schema.properties.plan;
  return {
    ...schema,
    properties: {
      ...schema.properties,
      plan: { ...plan, properties: { ...plan.properties, items: { ...plan.properties.items, items: { ...plan.properties.items.items, properties: { ...plan.properties.items.items.properties, type: { type: 'string', enum: allowed.length ? allowed : ITEM_TYPES } } } } } },
    },
  };
};

const schema = {
  type: 'object',
  properties: {
    reply: { type: 'string' },
    existing: {
      type: 'array',
      items: { type: 'object', properties: { testId: { type: 'string' }, reason: { type: 'string' } }, required: ['testId', 'reason'], additionalProperties: false },
    },
    software: { type: 'string' },
    lookUp: { type: 'string' },
    plan: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
        difficulty: { type: 'string' },
        passingScore: { type: 'integer' },
        roles: { type: 'array', items: { type: 'string' } },
        // The job simulation: the company, the candidate's setting there, and the people they work with, "Name | Role | email"
        company: { type: 'string' },
        setting: { type: 'string' },
        people: { type: 'array', items: { type: 'string' } },
        // Emails already in the candidate's inbox when the day starts, each written out "From: ...\nTo: ...\n...\n\nbody"
        inbox: { type: 'array', items: { type: 'string' } },
        // One competency a line: "skill | weight | why it matters | how the test proves it"
        blueprint: { type: 'array', items: { type: 'string' } },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ref: { type: 'string' },
              taskRef: { type: 'string' },
              type: { type: 'string', enum: ITEM_TYPES },
              title: { type: 'string' },
              // What the item is about and what it tests, for the writer: the situation, the trap, the skill
              brief: { type: 'string' },
              points: { type: 'integer' },
              minutes: { type: 'integer' },
            },
            required: ['ref', 'taskRef', 'type', 'title', 'brief', 'points', 'minutes'],
            additionalProperties: false,
          },
        },
      },
      required: ['title', 'description', 'category', 'difficulty', 'passingScore', 'roles', 'company', 'setting', 'people', 'inbox', 'blueprint', 'items'],
      additionalProperties: false,
    },
  },
  required: ['reply', 'existing', 'software', 'lookUp'],
  additionalProperties: false,
};

function instructions(req: ChatRequest, research: string): string {
  return `You are Vetter's test designer, talking with a company on Vetter, a skills-based hiring platform. You are planning
one skills test for a job, so that whoever passes it can really do the job and whoever can't is found out.

HOW TO TALK
- Reply like a sharp, friendly hiring consultant: short, plain British English, no em dashes, no markdown. 1 to 4 sentences.
- If the conversation is too vague to plan a useful test (no idea of the role or what matters), ask up to 2 short
  questions in reply and leave out "plan". Otherwise plan straight away; don't interrogate.
- ALREADY SETTLED, when given, is what the company told Vetter before this chat: never ask again about anything it covers; plan straight away.
${
    req.kind === 'training'
      ? `- This is TRAINING for the company's own people. Until the company has said which areas they want training in,
  don't plan: in reply, ask which areas to cover, listing 4 to 6 likely areas of that app or work as a short numbered
  list (e.g. "1. Raising and assigning tickets 2. Refunds 3. Macros and saved replies 4. Reports"), and say they can
  pick several or add their own. If they haven't named the app or work either, ask for that in the same message. Once
  they've said, plan the training around exactly those areas, easiest first.
`
      : ''
  }- With a plan, say in a sentence or two what the test covers and why, then offer one specific way to sharpen it.

THE PLAN
Plan every item of the test, in order, without writing it out: a separate writer turns each item into a full question
from your brief. In the plan EVERY item has its own short unique ref, plain questions and sub-questions too ("q1", "c1",
"c1a", "t1", "t1b"...), whatever the rules below say about refs on written questions; a question about a case or task sets taskRef
to that case or task's ref, and every other item has taskRef "". brief: 2 to 4 sentences: the situation, the specific
detail or trap it turns on, what a strong answer shows, and which competency it serves. Vary the situations, so no two
items test the same thing. points and minutes as the rules below say (minutes is timeLimitMinutes; a case is 0 points).
blueprint: one line per competency, written "skill | weight | why it matters | how the test proves it".
${
    req.kind === 'standalone'
      ? `company, setting and people: the simulation's company, setting and cast, as the rules below say; inbox is []. The
plan has exactly one item: the app, its brief listing every task in order.`
      : req.kind !== 'test'
      ? `company, setting and people: the job simulation's company, setting and cast, as the rules below say. Every brief names
the people involved, from that cast, so the writers keep the test one connected working day.
inbox: the candidate works in a real-feeling workspace with an Inbox tab beside the apps. Write 3 to 8 emails already in
their inbox when the day starts, each exactly "From: Name <address>\nTo: Name <address>, ...\nCc: ...\nDate: Tue 4 Mar,
08:47\nSubject: ...\n\n<body>", from the cast: the requests behind the hands-on tasks and the details they need
(account numbers, the policy, figures, deadlines, an approval limit, a customer's complaint), plus one or two ordinary
ones that don't matter, as a real inbox has. The hands-on tasks then point to them ("Priya's email has the account
details") instead of repeating everything, so the candidate has to go and find what they need. An app task's brief names
the inbox email it relies on. Email tasks' own threads are separate: they arrive with their task. For a hands-on job
(see JOB FIT) the inbox is the job's own paperwork instead, and smaller (2 to 4): job sheets, the appointment or call-out
list, a supplier's note, a message from the manager or a customer, never office or spreadsheet requests.`
      : `company, setting, people and inbox: "", "", [] and [] (this is a skills test).`
  } An email item's brief says who it's from, what it turns on, and who the reply should go to, be copied to, and must
not go to.
difficulty is one of: ${req.levels.join(', ')}; ${levelPick(req)}.

${stylesNote(req)}${styleGuide(req)}
software: the one product, device or equipment the app items copy (e.g. "Xero" or "iPhone 13"), or "".
lookUp: when the plan needs an app copying a product, device or equipment that the RESEARCH below doesn't cover${research ? '' : ' (there is no research yet)'}, put its name here (with the procedure for a device, e.g. "iPhone 13 screen replacement") and send only reply "" and existing, with no plan; Vetter researches it and asks you again. Otherwise "".

${
  req.wantExisting
    ? `LIBRARY PICKS: "existing" lists up to 4 tests from the LIBRARY that genuinely fit the job alongside the new test, best first, each with a one-sentence reason a hiring manager would find useful. Only ids from the library.`
    : 'Return an empty "existing" list.'
}

${research ? `RESEARCH on the job and what the simulations copy. Every task, figure, term and step in the simulations must match how the job is really done, as these notes say: never work that belongs to another role, a step in the wrong order, a made-up term or a value no one in the job would see.\n${research}\n\n` : ''}LIBRARY:
${req.library.map((t) => `- ${t.id}: ${t.title} (${t.category}, ${t.difficulty}; skills: ${t.skills.join(', ')}; roles: ${t.roles.join(', ')}). ${t.description}`).join('\n')}`;
}

function conversation(req: ChatRequest): Anthropic.Beta.BetaMessageParam[] {
  const turns = req.messages.slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.text.slice(0, MAX_TEXT) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  const last = turns[turns.length - 1];
  const context = [req.job ? `THE JOB:\n${req.job.slice(0, MAX_PROMPT)}` : '', backgroundNote(req), req.draft ? `THE DRAFT BEING REPLACED (for reference):\n${JSON.stringify(req.draft).slice(0, 20000)}` : '']
    .filter(Boolean)
    .join('\n\n');
  return [...turns.slice(0, -1), { role: 'user', content: `${context}${context ? '\n\n' : ''}THE COMPANY SAYS:\n${last.content}` }];
}

const sameProduct = (a = '', b = '') => a.trim().toLowerCase() === b.trim().toLowerCase();

async function turn(client: Anthropic, model: string, req: ChatRequest, research: string) {
  const message = await client.beta.messages
    .stream({
      model,
      max_tokens: 32000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: schemaFor(req.styles) } },
      ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
      system: [{ type: 'text', text: instructions(req, research), cache_control: { type: 'ephemeral' } }],
      messages: conversation(req),
    })
    .finalMessage();
    meter(model, message.usage);
  const price = PRICES[model];
  const { input_tokens, output_tokens } = message.usage;
  if (price) console.log(`[plan-test] ${input_tokens} in, ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(3)}`);
  return message;
}

export async function planTest(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as ChatRequest;
  if (!req || !Array.isArray(req.messages) || req.messages[req.messages.length - 1]?.role !== 'user') return { status: 400, json: { error: 'Say what you want the test to check.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const client = new Anthropic({ apiKey });
  try {
    let research = req.research ?? '';
    let researchedFor = req.researchedFor ?? '';
    const parse = (m: Anthropic.Beta.BetaMessage) => JSON.parse(m.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join(''));
    const failed = (m: Anthropic.Beta.BetaMessage) =>
      m.stop_reason === 'refusal'
        ? { status: 422, json: { error: 'Vetter declined to write this. Try describing the job differently.' } }
        : m.stop_reason === 'max_tokens'
        ? { status: 502, json: { error: 'The plan came back incomplete. Try again.' } }
        : null;

    // A test with app simulations is planned from how the job is really done, researched first, so every task is one
    // the job really involves, done the way it's really done
    const wantsApps = !req.styles?.length || req.styles.includes('app');
    if (wantsApps && !research) {
      const company = req.company ? `The company: ${[req.company.name, req.company.industry, req.company.headquarters].filter(Boolean).join(', ')}` : '';
      const brief = [req.jobTitle ? `The role: ${req.jobTitle}` : '', company, req.job, req.background, ...req.messages.filter((m) => m.role === 'user').map((m) => m.text)].filter(Boolean).join('\n\n');
      const found = await researchJob(client, model, brief).catch((err) => (console.error('[plan-test] job research failed', err), ''));
      if (found) research = `HOW THE JOB IS REALLY DONE:\n${found}`;
    }

    let message = await turn(client, model, req, research);
    if (failed(message)) return failed(message)!;
    let out = parse(message);
    if (out.lookUp && !sameProduct(out.lookUp, researchedFor)) {
      const brief = [`The software: ${out.lookUp}`, req.job, ...req.messages.filter((m) => m.role === 'user').map((m) => m.text)].filter(Boolean).join('\n\n');
      const found = await researchSoftware(client, model, brief).catch((err) => (console.error('[plan-test] research failed', err), ''));
      // Added to the notes on the job, which stay
      research = [research, found ? `${out.lookUp.toUpperCase()}:\n${found}` : `Nothing could be found on the web about ${out.lookUp}; build it from what you know.`].filter(Boolean).join('\n\n');
      researchedFor = out.lookUp;
      message = await turn(client, model, req, research);
      if (failed(message)) return failed(message)!;
      out = parse(message);
    }
    return { status: 200, json: { ...out, research, researchedFor } };
  } catch (err) {
    return apiFailure('plan-test', err);
  }
}
