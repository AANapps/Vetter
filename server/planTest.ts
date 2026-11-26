import { curveballGuide } from './curveballs.js';
import Anthropic from '@anthropic-ai/sdk';
import { streamJson } from './streamJson.js';
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

const ITEM_TYPES = ['part', 'choice', 'multi', 'text', 'written', 'order', 'match', 'email', 'assistant', 'case', 'code', 'sql', 'sheet', 'database', 'app', 'desktop'];

// The plan's item types are held to the styles the company picked (a case or task needs its own style picked too)
const schemaFor = (styles?: string[], jobSim = false) => {
  const types = ITEM_TYPES.filter((t) => t !== 'part');
  const allowed = jobSim ? ['part'] : styles?.length ? types.filter((t) => styles.includes(t) || (t === 'desktop' && styles.includes('app'))) : types;
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
              // The software it's done in (app items; a job simulation's parts), and the library app used for it
              software: { type: 'string' },
              softwareKind: { type: 'string' },
              appId: { type: 'string' },
            },
            required: ['ref', 'taskRef', 'type', 'title', 'brief', 'points', 'minutes', 'software', 'softwareKind', 'appId'],
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

// Granyt's app library: apps already built (help desks, CRMs...) that a simulation can be done in, filled with its own
// data. One that fits is used: it's ready, quicker and cheaper than building one
type AppsRequest = { apps?: { id: string; name: string; product: string; summary: string }[] };
const appLibrary = (req: AppsRequest, jobSim: boolean) => {
  const apps = (req.apps ?? []).slice(0, 40);
  return `SOFTWARE: for every ${jobSim ? 'part done in the job\'s own software (a help desk, a CRM, a booking system)' : 'app item'}, software names the product it's done in, as the
company would say it ("Zendesk", "Xero", "NinjaOne"; the kind, e.g. "a help desk", when no product is named), and appId
is the id of the app from GRANYT'S APP LIBRARY below that it's done in. You decide whether one fits:
- When the company named the product (in its messages, the job description or what it said earlier, e.g. "we use
  NinjaOne"), only a library app that IS that product fits: candidates are tested in what they'll really use. If the
  library has no copy of it, appId is "" and Granyt builds an exact copy (the company can still pick a ready app of the
  same kind instead, to save time and credit).
- When it only described the work ("handles support tickets"), another app of the same kind fits when the work done
  in it is the same (ticket triage works in any help desk), since it's ready, quicker and cheaper. One missing the
  screens or the way of working the job depends on doesn't fit.
appId "" when none fits, and Granyt builds the software. softwareKind: the kind of software in one to three words, as the library names kinds ("help desk",
"CRM", "ads manager"). Every other item has software "", softwareKind "" and appId "".${jobSim ? ' Parts in the Spreadsheet, Browser, Database or Code apps: software "", softwareKind "" and appId "".' : ''}
GRANYT'S APP LIBRARY:
${apps.length ? apps.map((a) => `- ${a.id}: ${String(a.name).slice(0, 80)} (${String(a.product).slice(0, 60)}). ${String(a.summary).slice(0, 240)}`).join('\n') : '(empty)'}`;
};

function instructions(req: ChatRequest, research: string): string {
  return `You are Granyt's test designer, talking with a company on Granyt, a skills-based hiring platform. You are planning
one skills test for a job, so that whoever passes it can really do the job and whoever can't is found out.

HOW TO TALK
- Reply like a sharp, friendly hiring consultant: short, plain British English, no em dashes, no markdown. 1 to 4 sentences.
- If the conversation is too vague to plan a useful test (no idea of the role or what matters), ask up to 2 short
  questions in reply and leave out "plan". Otherwise plan straight away; don't interrogate.
- ALREADY SETTLED, when given, is what the company told Granyt before this chat: never ask again about anything it covers; plan straight away.
${
    req.kind === 'training'
      ? `- This is TRAINING for the company's own people. Until the company has said which areas they want training in,
  don't plan: in reply, ask which areas to cover, listing 4 to 6 likely areas of that app or work as a short numbered
  list (e.g. "1. Raising and assigning tickets 2. Refunds 3. Macros and saved replies 4. Reports"), and say they can
  pick several or add their own. If they haven't named the app or work either, ask for that in the same message. Once
  they've said, plan the training around exactly those areas, easiest first.
`
      : ''
  }- With a plan, say in a sentence or two what the test covers and why, then offer one specific way to sharpen it. The
  company sees every item listed under your reply and presses Build once it's happy, so never say it has been built.

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
${appLibrary(req as AppsRequest, false)}
lookUp: when the plan needs an app copying a product, device or equipment that the RESEARCH below doesn't cover${research ? '' : ' (there is no research yet)'}, put its name here (with the procedure for a device, e.g. "iPhone 13 screen replacement") and send only reply "" and existing, with no plan; Granyt researches it and asks you again. Otherwise "".

${
  req.wantExisting
    ? `LIBRARY PICKS: "existing" lists up to 4 tests from the LIBRARY that genuinely fit the job alongside the new test, best first, each with a one-sentence reason a hiring manager would find useful. Only ids from the library.`
    : 'Return an empty "existing" list.'
}

${research ? `RESEARCH on the job and what the simulations copy. Every task, figure, term and step in the simulations must match how the job is really done, as these notes say: never work that belongs to another role, a step in the wrong order, a made-up term or a value no one in the job would see.\n${research}\n\n` : ''}LIBRARY:
${req.library.map((t) => `- ${t.id}: ${t.title} (${t.category}, ${t.difficulty}; skills: ${t.skills.join(', ')}; roles: ${t.roles.join(', ')}). ${t.description}`).join('\n')}`;
}

// A job simulation is planned as the one shape every Granyt job simulation has (src/data/modules/jobSimKit.ts): a day on
// the desktop in five timed parts, made for this company and this job. server/writeJobSim.ts writes it out
function jobSimInstructions(req: ChatRequest, research: string): string {
  return `You are Granyt's job simulation designer, talking with a company on Granyt, a skills-based hiring platform. You
are planning one job simulation: a 40-minute working day on a desktop computer (Mail, Files, an AI assistant, and the
job's own work apps) for someone applying to this job, so whoever does well can really do it and whoever can't is found out.

HOW TO TALK
- Reply like a sharp, friendly hiring consultant: short, plain British English, no em dashes, no markdown. 1 to 4 sentences.
- If the conversation is too vague to plan (no idea of the role or what matters), ask up to 2 short questions in reply
  and leave out "plan". Otherwise plan straight away; don't interrogate.
- ALREADY SETTLED, when given, is what the company told Granyt before this chat: never ask again about anything it covers.
- With a plan, say in a sentence or two what the day covers and why, then offer one specific way to sharpen it. The
  company sees the plan under your reply and presses Build once it's happy, so never say it has been built.

THE PLAN: always exactly these five items, in this order, every one type "part", taskRef "", points 0:
  ref "briefing", minutes 2: "Briefing" (not marked): who they are, the company, their manager, their tools.
  ref "core", minutes 12: "Core task": the most important work of THIS job, simple first, then harder.
  ref "curveball", minutes 6: "Curveball": something changes or goes wrong and they adapt their work. Start from
    the CURVEBALL LIBRARY below for the job's kind of work, adapted to the company and its data; invent one only
    when none fits.
  ref "juggling", minutes 10: "Juggling and judgement": two or three demands at once, plus one grey-area decision
    with no perfect answer, where they decide and give a reason.
  ref "report", minutes 7: "Report back": summarise the work for the manager or another team.
(Plus 3 minutes to read and switch apps: 40 in all.)
CURVEBALL LIBRARY (proven, markable curveballs by kind of job):
${curveballGuide()}
title: the item's name above plus a colon and what happens, e.g. "Core task: Q1 sales against target for every store".
brief: 2 to 4 sentences: exactly what the candidate does, with whom (from the cast), in which app, on what data, and
what a strong answer shows. Plant one or two issues nobody mentions (duplicate rows, a wrong figure, a missing detail,
a failing edge case): say in the brief where they are; the report back is marked on naming them.

MADE FOR THIS COMPANY AND THIS JOB
- The day is set AT the hiring company (company = its name), using what the company told you: its products, customers,
  sector, location, tools and teams, and the duties, tools and seniority in the job description. Every task is work
  the job description says this person does, done the way it's really done.
- setting: 2 to 3 sentences: the candidate's role there, the day (e.g. Monday morning before a board meeting), and the
  work apps on the desktop: two (three at most) of Spreadsheet, Browser (an intranet, client portal, supplier site or
  documentation), Database (SQL) and Code (a small JavaScript project with tests), whichever the job really uses. The
  data is pre-loaded, so the candidate works rather than sets up.
- people: the cast, 3 to 6 colleagues, each "Name | Role | first.last@domain" (the company's email domain).
- inbox: [] (the day's emails are written with it).
- title: "<Role> Job Simulation: A Day at <company>". description: 1 to 2 sentences for the company.
- blueprint: one line per competency, written "skill | weight | why it matters | how the day proves it".
- difficulty is one of: ${req.levels.join(', ')}; usually the middle one, or what the job's seniority says. passingScore 70.
- category and roles: from the job.

software and lookUp: "" (the response's; each part has its own software and appId).
${appLibrary(req as AppsRequest, true)}
${req.wantExisting ? `LIBRARY PICKS: "existing" lists up to 4 tests from the LIBRARY that genuinely fit the job alongside the simulation, best first, each with a one-sentence reason. Only ids from the library.` : 'Return an empty "existing" list.'}

${research ? `RESEARCH on how the job is really done. Every task, term, figure and step must match it.\n${research}\n\n` : ''}LIBRARY:
${req.library.map((t) => `- ${t.id}: ${t.title} (${t.category}, ${t.difficulty}; skills: ${t.skills.join(', ')}). ${t.description}`).join('\n')}`;
}

// The plan the company is looking over in the chat, when it asks for a change to it before anything is written
type PlanRequest = ChatRequest & { currentPlan?: Record<string, unknown> };

function conversation(req: PlanRequest): Anthropic.Beta.BetaMessageParam[] {
  const turns = req.messages.slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.text.slice(0, MAX_TEXT) }));
  while (turns.length && turns[0].role !== 'user') turns.shift();
  const last = turns[turns.length - 1];
  const context = [req.job ? `THE JOB:\n${req.job.slice(0, MAX_PROMPT)}` : '', backgroundNote(req), req.draft ? `THE DRAFT BEING REPLACED (for reference):\n${JSON.stringify(req.draft).slice(0, 20000)}` : '',
    req.currentPlan
      ? `THE PLAN SO FAR, which the company has been shown question by question and is now changing: send the whole plan again with exactly the changes it asks for, keeping every other item, the cast and the inbox as they are. In reply, say in a sentence what you changed. If the message is only a question about the plan, answer it in reply and send the plan back unchanged.\n${JSON.stringify(req.currentPlan).slice(0, 20000)}`
      : '']
    .filter(Boolean)
    .join('\n\n');
  return [...turns.slice(0, -1), { role: 'user', content: `${context}${context ? '\n\n' : ''}THE COMPANY SAYS:\n${last.content}` }];
}

const sameProduct = (a = '', b = '') => a.trim().toLowerCase() === b.trim().toLowerCase();

async function turn(client: Anthropic, model: string, req: PlanRequest, research: string) {
  const message = await streamJson(client, {
      model,
      max_tokens: 32000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: schemaFor(req.styles, req.kind === 'simulation') } },
      ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
      system: [{ type: 'text', text: req.kind === 'simulation' ? jobSimInstructions(req, research) : instructions(req, research), cache_control: { type: 'ephemeral' } }],
      messages: conversation(req),
    });
    meter(model, message.usage);
  const price = PRICES[model];
  const { input_tokens, output_tokens } = message.usage;
  if (price) console.log(`[plan-test] ${input_tokens} in, ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(3)}`);
  return message;
}

export async function planTest(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as PlanRequest;
  if (!req || !Array.isArray(req.messages) || req.messages[req.messages.length - 1]?.role !== 'user') return { status: 400, json: { error: 'Say what you want the test to check.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const client = new Anthropic({ apiKey });
  try {
    let research = req.research ?? '';
    let researchedFor = req.researchedFor ?? '';
    const parse = (m: Anthropic.Beta.BetaMessage) => JSON.parse(m.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join(''));
    const failed = (m: Anthropic.Beta.BetaMessage) =>
      m.stop_reason === 'refusal'
        ? { status: 422, json: { error: 'Granyt declined to write this. Try describing the job differently.' } }
        : m.stop_reason === 'max_tokens'
        ? { status: 502, json: { error: 'The plan came back incomplete. Try again.' } }
        : null;

    // A test with app simulations is planned from how the job is really done, researched first, so every task is one
    // the job really involves, done the way it's really done
    const wantsApps = req.kind === 'simulation' || !req.styles?.length || req.styles.includes('app');
    if (wantsApps && !research) {
      const company = req.company ? `The company: ${[req.company.name, req.company.industry, req.company.headquarters].filter(Boolean).join(', ')}` : '';
      const brief = [req.jobTitle ? `The role: ${req.jobTitle}` : '', company, req.job, req.background, ...req.messages.filter((m) => m.role === 'user').map((m) => m.text)].filter(Boolean).join('\n\n');
      const found = await researchJob(client, model, brief).catch((err) => (console.error('[plan-test] job research failed', err), ''));
      if (found) research = `HOW THE JOB IS REALLY DONE:\n${found}`;
    }

    let message = await turn(client, model, req, research);
    if (failed(message)) return failed(message)!;
    let out = parse(message);
    if (req.kind !== 'simulation' && out.lookUp && !sameProduct(out.lookUp, researchedFor)) {
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
