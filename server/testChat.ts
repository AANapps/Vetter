import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { APP_KINDS, APP_TASK_RULES, DEPTH_STYLE_RULES, EMAIL_RULES, ASSISTANT_RULES, GAMIFIED_TEST_RULES, QUALITY_RULES, SKILLS_TEST_RULES, STANDALONE_RULES, TRAINING_RULES, SimulationCompany, sectorSimulationRules, simulationRules, TASK_RULES, WORKSPACE_RULES, MAX_PROMPT, PRICES, apiFailure, questionSchema, researchSoftware } from './generateTest.js';

/**
 * Building a test by talking to Vetter: the company says what it wants, Vetter writes a draft, and every message after
 * that changes the draft (harder, shorter, more Excel, drop question 3). Each turn gets the conversation and the draft
 * as it stands, and sends back a reply plus the draft's new version, or nothing when it doesn't change.
 * Questions Vetter leaves as they are come back as { keep: id }, so a long app simulation isn't rewritten each turn.
 * The browser checks every new question (src/lib/testChat.ts) before it joins the draft.
 */

export type TestKind = 'test' | 'simulation' | 'standalone' | 'training';

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; text: string }[];
  // The job the test is for, written out, when it's built from one
  job?: string;
  jobTitle?: string;
  // A skills test, a gamified test (questions mixed with simulations), one standalone simulation, or training
  kind?: TestKind;
  // The company hiring, where the job simulation is set
  company?: SimulationCompany;
  // What the company already said in the home chat before opening this one (its messages and the choices it picked):
  // settled, so not asked again
  background?: string;
  // The draft as it stands, with app pages left out (see draftForModel in src/lib/testChat.ts)
  draft?: Record<string, unknown>;
  // Library tests already picked, when picking from the library
  existing: string[];
  wantExisting: boolean;
  // The question types the company picked: only these may be used
  styles?: string[];
  // How many questions the company asked for, counting sub-questions, and the level it picked
  questionCount?: number;
  // Several counts ticked: anywhere from the first to the second
  questionRange?: [number, number];
  difficulty?: string;
  // Several levels ticked, lowest first
  difficulties?: string[];
  // The timer: minutes for the whole test, or 'none'
  timeLimit?: number | 'none';
  // The task the company has open beside the chat, when it's an app simulation
  viewing?: { id: string; label: string; app: string };
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

export const responseSchema = {
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
    // Changes to app pages already in the draft, made in place by the page builder: one a line, "id ## change ## new
    // task text or empty" (made into objects by appEditsOf). One string, not a list: a list here, of objects or even of
    // strings, makes the output grammar too large to compile and every request fails
    appEdits: { type: 'string' },
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
        // Also the blueprint: one competency a line, "skill | weight | why | how". A separate field makes the output
        // grammar too large to compile
        questions: { type: 'array', items: questionSchema },
      },
      required: ['title', 'description', 'category', 'difficulty', 'passingScore', 'skillsTested', 'questions'],
      additionalProperties: false,
    },
  },
  required: ['reply', 'existing', 'software', 'lookUp', 'appEdits'],
  additionalProperties: false,
};

// How every question is written and how a test is put together: shared by the chat, the planner (server/planTest.ts)
// and the section writer (server/writeQuestions.ts)
export interface GuideRequest {
  kind?: TestKind;
  company?: SimulationCompany;
  jobTitle?: string;
  styles?: string[];
  levels: string[];
  tables: { name: string; columns: string[] }[];
  categories: string[];
  roles: string[];
}
type Picks = { styles?: string[]; questionCount?: number; questionRange?: [number, number]; difficulty?: string; difficulties?: string[]; timeLimit?: number | 'none' };

// What the "difficulty is one of" line says the level is
export const levelPick = (req: Picks) =>
  req.difficulty
    ? `it is ${req.difficulty}, as the company picked`
    : req.difficulties?.length
    ? `it is ${req.difficulties[req.difficulties.length - 1]}, the highest of the levels the company picked`
    : 'pick it from the job unless told';

export const stylesNote = (req: Picks) =>
  [
    req.styles?.length
      ? `QUESTION TYPES: the company has picked these styles, and ONLY these: ${req.styles.join(', ')}. Every question in the test must be one of them, even if the company asks in the chat for another style (tell them to tick it at the top first). Where the rules below call for a style that isn't picked (a case study, a hands-on task), leave that part out and use the picked styles instead; the hands-on rule applies only if a hands-on style is picked, and a case or task section only if its style is. Whenever you change the draft, rewrite any question in a style that isn't picked into one that is.`
      : '',
    req.questionCount
      ? `NUMBER OF QUESTIONS: the company wants exactly ${req.questionCount} questions, counting sub-questions but not case study material. This replaces the size given below; the time adds up to whatever those questions take. Whenever you change the draft, bring it to exactly ${req.questionCount}.`
      : req.questionRange
      ? `NUMBER OF QUESTIONS: the company wants between ${req.questionRange[0]} and ${req.questionRange[1]} questions, counting sub-questions but not case study material: pick the number in that range the job really needs. This replaces the size given below. Whenever you change the draft, keep it in that range.`
      : '',
    typeof req.timeLimit === 'number'
      ? `TIME LIMIT: the candidate gets ${req.timeLimit} minutes for the whole test. Size the test to fit: the questions' timeLimitMinutes add up to about ${req.timeLimit}, not the 45 to 75 given below${req.questionCount || req.questionRange ? '; if the number of questions asked for cannot be answered well in that time, say so in your reply' : ''}.`
      : req.timeLimit === 'none'
      ? `TIME LIMIT: the test has no time limit. Still give every question a realistic timeLimitMinutes, as a guide for the candidate.`
      : '',
    req.difficulties?.length
      ? `DIFFICULTY: the company picked these levels: ${req.difficulties.join(', ')}. Pitch the questions across them, from the easier ones up to the hardest, whatever the job ad suggests. The test's difficulty is "${req.difficulties[req.difficulties.length - 1]}".`
      : req.difficulty
      ? `DIFFICULTY: the company picked ${req.difficulty} level. The test's difficulty is "${req.difficulty}" and every question is pitched at that level, whatever the job ad suggests.`
      : '',
  ]
    .filter(Boolean)
    .map((line) => `${line}\n\n`)
    .join('');

export function styleGuide(req: GuideRequest): string {
  const sim = req.kind !== 'test';
  return `${sim ? simulationRules(req.company, req.jobTitle) : SKILLS_TEST_RULES}${req.kind === 'training' ? TRAINING_RULES : ''}${req.kind === 'simulation' ? GAMIFIED_TEST_RULES : ''}${sectorSimulationRules(req.company?.sector)}
- Every question must be answerable from its prompt alone, and check what the job really needs, not trivia.${QUALITY_RULES}
- Styles: choice, multi, text, written, order, match for any job; email for replying to work email; case for a case
  study with sub-questions; sheet, database and app are hands-on tasks in a working window.
${
    sim
      ? `  Unless told otherwise, a desk job's simulation has 2 to 4 email tasks, some standing alone and some about a hands-on
  task; a hands-on job's has at most one, only if the job really writes emails (see JOB FIT).
  assistant is an AI-assisted task: the candidate prompts an AI assistant through real work. Include one when the job
  uses AI tools day to day or the company asks for it (unless told otherwise, most office, analyst, marketing,
  developer and customer roles now do; hands-on jobs don't).`
      : `  email and assistant (an AI-assisted task) are there if the company asks for them or the skill is communication or
  working with AI; otherwise a skills test sticks to the other styles.`
  }
  Unless told otherwise, every test has hands-on tasks that match how the job is really done (JOB FIT above decides which
  fit): sheet for Excel work (finance, ops, analysts; never for trades, clinical or floor jobs), database for SQL work, app for any other software the job names (a CRM, helpdesk, design
  tool, accounting package...), app for physical and trade work (a mock-up of the device or equipment, e.g. a specific
  phone for a repair technician), code for developers, and an app of your own design (kind (c) below) for any other
  skill best shown by doing it. Fast formats for the basics, hands-on for the hardest work.
  Prefer database to sql (sql is a single query on a fixed sample database).
- If the company asks for something interactive that no style fits, build it as an app of kind (c): anything they can
  describe can be made into a working page the candidate uses, checked on what they leave behind.
Every question has every field: "" for text, [] for lists and -1 for correctOption where its style doesn't use them, and keep is "" on a new question.
Style rules (testCases is an empty list for choice, multi, text, order and match):
- choice: 4 options, exactly one right; correctOption is its 0-based index.
- multi: 4 to 6 options; correctOptions lists every right index (at least 2).
- text: a short factual answer (a word, number or short phrase); acceptedAnswers lists every acceptable wording.
- order: 4 to 6 items listed in the RIGHT order (candidates see them shuffled).
- match: 3 to 5 pairs; each left prompt with its right answer, all distinct.
- code: JavaScript. starterCode defines "function solution(...)". solutionCode is a correct reference implementation. 3 to 5 testCases; input is a JSON array of the arguments, e.g. "[[3,1,2]]" calls solution([3,1,2]); expectedOutput is the JSON result.
- sql: query only these tables: ${req.tables.map((t) => `${t.name}(${t.columns.join(', ')})`).join('; ')}. List the tables used in "tables". solutionCode is a correct SQLite query; starterCode is a comment and "SELECT ".${DEPTH_STYLE_RULES}${EMAIL_RULES}${ASSISTANT_RULES}${WORKSPACE_RULES}${APP_KINDS}
  In this conversation appHtml is NOT the page: a separate page builder writes each page from the spec you put in appHtml,
  then the page is tried out. appHtml holds the complete spec for the builder, in plain text, 250 to 600 words: which kind it is and what it copies or shows; the layout
  and screens (or the item drawn and its views); every piece of realistic data or detail it holds, spelled out (names,
  figures, records, messages); every interaction the task needs and what it does, including wrong moves and their
  consequences; and the state object it keeps, with its exact key names and starting values, so the checks below match.
  A kept app keeps its page; to change one, write it again with a new spec.${APP_TASK_RULES}
timeLimitMinutes is realistic for the question (2 to 4 for answer styles, as the scenario takes reading, 4 to 8 for written, 3 to 6 reading time for case, 5 to 10 for code, sql, sheet and database, 6 to 12 for app), and across the test they add up to 45 to 75 unless the company asks for a different length. points reflect importance; a task counts for more than a question about it.
${TASK_RULES}${req.kind === 'standalone' ? STANDALONE_RULES : ''}
category must be one of: ${req.categories.join(', ')}. passingScore between 60 and 80. roles: pick from ${req.roles.join(', ')}.`;
}

function instructions(req: ChatRequest, research: string): string {
  return `You are Vetter's test designer, talking with a company on Vetter, a skills-based hiring platform. Together you build one skills test for a job, refining it over the conversation.

HOW TO TALK
- Reply like a sharp, friendly hiring consultant: short, plain British English, no em dashes, no markdown headings. 1 to 4 sentences usually.
- If the first message is too vague to write a useful test (no idea of the role or what matters), ask up to 2 short questions instead of writing. Otherwise write a first draft straight away; don't interrogate.
- ALREADY SETTLED below is what the company told Vetter before this chat. Never ask again about anything it covers (the role, level, what to build, what to focus on); use it, and write straight away.
- After writing or changing the draft, say in a sentence what you did, then offer one or two specific ways to sharpen it (e.g. "Want a task in Xero itself?").
- When asked to change something, change exactly that and keep the rest. Questions are numbered from 1 in the order of the draft.
- The company can edit the draft by hand between messages. The draft you're given is always the latest: treat their edits as deliberate, keep them, and don't undo them unless asked.
- If asked something you can't do (a style not listed below, uploading files), say so and offer the nearest thing.

${stylesNote(req)}THE DRAFT
- ${req.kind === 'training' ? "This is training for the company's own people: keep it teaching (clear steps, worked answers), set in the draft's scenario with its people." : req.kind === 'simulation' ? "The draft's scenario is the job simulation's setting and its people: keep to them, and use those people in anything new." : req.kind === 'standalone' ? 'This is one standalone simulation: keep it a single app question, its tasks one per check, and change the page with appEdits.' : 'This is a skills test, not a job simulation: keep it one, unless the company asks for a simulation (then send lookUp "REPLAN").'}
- Include "test" whenever the draft is new or changes, with every question in order. skillsTested IS the blueprint: one line per competency, written "skill | weight | why it matters | how the test proves it". For a question that stays exactly as it is, set keep to its id and type to its type, and leave every other field empty ("", [], 0, -1). Leave "test" out when nothing changes (a question, a chat).
- A sheet or database question can only be kept whole or written again from scratch.
- APP CHANGES: to change an app page already in the draft (a new screen, a button that should do something, different
  data, a fix, a different look), don't rewrite it: keep the question (keep its id) and add a line to "appEdits" (one line per page),
  written "<question id> ## <change> ## <new task text>": the change is a precise, complete description of what to change
  on the page for the page builder (it sees the page's code, not this conversation); the new task text is what the
  candidate now reads, if the change means the task should read differently, otherwise leave it empty (end the line
  with "##"). Don't use "##" anywhere else in the line. Change the questions about it in "test" too if they no longer fit. Vetter's
  page builder makes the change and tries the page out. appEdits is "" when no app page changes. Write an app again from
  scratch only when asked for a different product or a new task.
- If the change means rewriting more than about half of the test (a different level, a different job, "start again"),
  don't write it here: send lookUp "REPLAN", reply "" and no test. Vetter plans and writes the test afresh from the
  conversation, section by section.
- The size and sections are set out under BLUEPRINT and SECTIONS below. difficulty is one of: ${req.levels.join(', ')}; ${levelPick(req)}.
${styleGuide(req)}
software: the one product, device or equipment the app simulations copy (e.g. "Xero" or "iPhone 13"), or "" when the draft has none.
lookUp: when this turn should add (or rewrite) an app simulation of a product, device or equipment that the RESEARCH below doesn't cover${research ? '' : ' (there is no research yet)'}, put its name here (with the procedure for a device, e.g. "iPhone 13 screen replacement") and send only reply "" and existing, with no test; Vetter researches it and asks you again. Otherwise "".

${
  req.wantExisting
    ? `LIBRARY PICKS: "existing" lists up to 4 tests from the LIBRARY that genuinely fit the job alongside the new test, best first, each with a one-sentence reason a hiring manager would find useful. Only ids from the library. Keep the current picks unless the conversation changes what fits.`
    : 'Return an empty "existing" list.'
}

${research ? `RESEARCH on the job and what the simulations copy. Every task, figure, term and step in the simulations must match how the job is really done, as these notes say: never work that belongs to another role, a step in the wrong order, a made-up term or a value no one in the job would see.\n${research}\n\n` : ''}LIBRARY:
${req.library.map((t) => `- ${t.id}: ${t.title} (${t.category}, ${t.difficulty}; skills: ${t.skills.join(', ')}; roles: ${t.roles.join(', ')}). ${t.description}`).join('\n')}`;
}

// The conversation as Claude sees it; the latest message carries the job and the draft as they stand
// The home chat's answers, for the planner and the chat alike
export const backgroundNote = (req: { background?: string }) =>
  req.background?.trim() ? `ALREADY SETTLED (the company's earlier chat with Vetter; don't ask about any of it again):\n${req.background.slice(0, MAX_PROMPT)}` : '';

function conversation(req: ChatRequest): Anthropic.Beta.BetaMessageParam[] {
  const turns = req.messages.slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.text.slice(0, MAX_TEXT) }));
  // Claude's turns must alternate and start with the company's
  while (turns.length && turns[0].role !== 'user') turns.shift();
  const last = turns[turns.length - 1];
  const context = [
    req.job ? `THE JOB:\n${req.job.slice(0, MAX_PROMPT)}` : '',
    backgroundNote(req),
    req.draft ? `THE DRAFT AS IT STANDS:\n${JSON.stringify(req.draft)}` : 'THERE IS NO DRAFT YET.',
    req.viewing
      ? `THE COMPANY HAS OPEN BESIDE THE CHAT: ${req.viewing.label}, the app "${req.viewing.app}" (question id ${req.viewing.id}). Unless they say otherwise, "this", "it", "here", "the app", a screen, button or field they mention means this page, so change it through appEdits.`
      : '',
    req.wantExisting ? `LIBRARY TESTS PICKED SO FAR: ${req.existing.length ? req.existing.join(', ') : 'none'}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
  return [...turns.slice(0, -1), { role: 'user', content: `${context}\n\nTHE COMPANY SAYS:\n${last.content}` }];
}

// The model's appEdits lines as the browser takes them: { id, change, taskPrompt }
export function appEditsOf(text: unknown): { id: string; change: string; taskPrompt: string }[] {
  if (typeof text !== 'string') return [];
  return text.split('\n').flatMap((line) => {
    const [id, change, ...task] = String(line).split('##').map((part) => part.trim());
    return id && change ? [{ id, change, taskPrompt: task.join('##').trim() }] : [];
  });
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
    meter(model, message.usage);
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
    // A rewrite of most of the test: the browser runs the planner and the section writer instead
    if (out.lookUp === 'REPLAN') return { status: 200, json: { ...out, appEdits: appEditsOf(out.appEdits), research, researchedFor } };
    if (out.lookUp && !sameProduct(out.lookUp, researchedFor)) {
      const brief = [`The software: ${out.lookUp}`, req.job, ...req.messages.filter((m) => m.role === 'user').map((m) => m.text)].filter(Boolean).join('\n\n');
      const found = await researchSoftware(client, model, brief).catch((err) => (console.error('[test-chat] research failed', err), ''));
      // Without research the app is built from what Claude already knows, with a note so it doesn't ask again
      // Added to any notes on the job, which stay
      research = [research, found ? `${out.lookUp.toUpperCase()}:\n${found}` : `Nothing could be found on the web about ${out.lookUp}; build it from what you know.`].filter(Boolean).join('\n\n');
      researchedFor = out.lookUp;
      message = await turn(client, model, req, research);
      if (message.stop_reason === 'refusal') return { status: 422, json: { error: 'Vetter declined to write this. Try describing the job differently.' } };
      if (message.stop_reason === 'max_tokens') return { status: 502, json: { error: 'The test came back incomplete. Try asking for fewer questions.' } };
      out = parse(message);
    }
    return { status: 200, json: { ...out, appEdits: appEditsOf(out.appEdits), research, researchedFor } };
  } catch (err) {
    return apiFailure('test-chat', err);
  }
}
