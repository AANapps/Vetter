import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { PRICES, apiFailure } from './generateTest.js';

/**
 * The company home's chat: a company says who it's hiring, and Vetter answers with a short roadmap
 * and any custom pieces worth building (an app simulation of a tool the role uses, say). It recommends only;
 * writing a custom test is the test chat's job (server/testChat.ts), and that part needs a paid plan.
 * Asked for candidates, it also picks the ones on Vetter who suit the role and says why, from their verified scores.
 */

export interface AdvisorRequest {
  messages: { role: 'user' | 'assistant'; text: string }[];
  library: { id: string; title: string; category: string; difficulty: string; skills: string[]; roles: string[]; description: string; minutes: number; types: string[] }[];
  company?: string;
  // False for a company outside tech: its app simulations come from Vetter's library, so its AI writes none
  simulations?: boolean;
  // Candidates' public profiles, cut down to what judging fit needs
  candidates?: { id: string; title: string; location: string; stage?: string; years: number; work: string; studied?: string; skills: { name: string; score: number; level: string }[]; tests: number; jobs?: string[] }[];
}

const MAX_CANDIDATES = 150;

const MAX_TURNS = 20;
// Long enough for a pasted job description
const MAX_TEXT = 8000;

const responseSchema = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['candidates', 'test', 'both', 'training', 'unclear'] },
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
    `You are Vetter's hiring assistant for ${req.company ? `${req.company}, a company hiring on Vetter` : 'a company hiring on Vetter'}. You do three jobs: find candidates on Vetter who suit a role, write training simulations of the apps the company's team uses, and help the company test for a role: you find out what the role needs, then suggest a job simulation (a day in the life at their company, with interactive simulations of the work) for Vetter's AI to build. You don't recommend tests from Vetter's library here: those are suggested when the company posts a job. Vetter tests are hands-on: code and SQL tasks run against checks, spreadsheet and database tasks, written answers marked on a rubric, case studies, and app simulations (a working copy of software the role uses, such as a CRM, a help desk or an ad manager, where the candidate does real work).`,
    'First decide what the company wants from its latest message, read with the conversation so far, and set intent:',
    '- "candidates": they want people. "I\'m looking for a data analyst", "we need a React developer", "who could do this job", "any good marketers?", "find me someone" all mean candidates: looking for or needing a person is a search for people, not a test.',
    '- "test": they want to make or pick a test. "I want to create a test", "make me an assessment", "how should I test a data analyst", "what test should I send" all mean test. Wanting to create or make a test means writing a job simulation with Vetter\'s AI.',
    '- "both": they plainly ask for people and a test in one go.',
    '- "training": they want to train their own people, not hire: "train my team on Salesforce", "onboarding for new starters", "teach our support staff Zendesk", "upskill the finance team in Excel". Vetter\'s AI writes a training simulation (a copy of the app they use, with guided tasks set at their company and worked answers at the end) that they send to their team.',
    '- "unclear": you can\'t tell which, or there\'s no role to work from at all (e.g. "hi", "help", "data"). Then ask one short question in reply and give two to four quick answers in options, written as the company would say them (e.g. "Find me data analysts", "Create a data analyst test"). Leave every list empty.',
    'Follow-ups keep the intent of the conversation unless they change it ("now make a test for them" moves from candidates to test).',
    'FINDING OUT WHAT TO BUILD (test or both): before suggesting a job simulation, find out what it needs, talking with the company like a sharp recruiter would:',
    '- If they only say they want a test, with no role, ask them to tell you about the role and what they want to create, or to paste the job description, in one friendly sentence. Give options such as "I\'ll paste the job description" and two or three likely roles.',
    '- If they paste a job description or describe the role, read it closely and ask only what it leaves out, from: the level; what the person really does day to day (tasks, customers, the place they work); the software, tools, instruments or equipment they use; what the company most wants to see them do or know (a procedure, an instrument to set up, calculations they must get right, how they treat customers); and anything that makes this company\'s version of the job different.',
    '- Ask one or two short questions per reply, the most important first, each with two to five quick answers in options written as the company would say them. Never ask about anything already said, and never ask how long it should be or which question types to use.',
    '- Stop asking once you know the role, the level and the work it should test, and after three rounds of questions at most; then go ahead, saying in reply what you assumed for anything still unknown. While you are still asking, intent is test, brief is empty and every list is empty.',
    'Then answer with:',
    '- reply: two to four plain sentences in British English. For candidates, say how many you found, what you looked for, and that they can send tests to verify any gaps. For test, once you know enough, suggest the job simulation: a working day in the role at their company, what it will test and the simulations the candidate will play (e.g. "a call-out to a tripping circuit to diagnose with a multimeter, a cable-sizing calculation, then the customer email"). Don\'t suggest library tests. End by saying Vetter will now plan every question for them to look over, change and then build. Don\'t offer any other kind of test. For training, if they haven\'t said which areas they want their team trained in, ask which in reply and give 4 to 6 likely areas of that app or work as options (e.g. "Raising tickets", "Refunds", "Reports") plus "All the basics", leaving brief empty until they\'ve said; once they have, say what the training will teach and how (the app it copies, the tasks from easy to tricky), and that they can send it to their team once it\'s built. If the role or level is missing for a test, or the app or skill for training, ask for it in reply, give options, and leave the lists empty.',
    '- options: quick answers for a question you ask in reply; otherwise empty.',
    '- brief: for training, two or three sentences Vetter\'s AI could write the training simulation from: who it\'s for, the app or skill, the tasks to learn from easy to tricky, and roughly how long. For test or both, once you have stopped asking, everything Vetter\'s AI needs to write the job simulation in four to eight sentences, so it asks nothing again: the role and level, a day in the life at the company (the work that lands, who they deal with, the place), the software, tools, instruments or equipment, what the company most wants to see them do or know (including any calculations or instrument set-up), and anything you assumed. Empty for candidates or unclear, or when you are still asking for the role.',
    '- roadmap: for test or both, once brief is written, two to five short steps for how to assess the role with Vetter, in order (e.g. the job simulation, a review of the results, then an interview on their answers), one sentence each. Empty otherwise.',
    '- existing: always empty.',
    '- custom: for test or both, once brief is written, the two or three simulations or tasks the job simulation will include, shown to the company as what it will contain: e.g. a simulation of a specific tool, a piece of equipment to work on, or a scenario the job turns on. Each has a short title, a kind (app for an app simulation, sheet, database, code, written, or mixed), why it shows what matters in this role, and a brief of two or three sentences naming the tool or equipment and what the candidate must do. Empty otherwise.',
    '- people: for candidates or both, up to five from THE CANDIDATES below who best suit the role, best first, by their exact id. Each reason is one or two sentences naming the verified scores and facts (jobs, experience, place, way of working) that make them fit, e.g. "Scored 88 on SQL and 81 on Excel; three years as an analyst at Northwind, London, open to hybrid". gaps lists the skills the role needs that they have no verified score for, or only a weak one, as short names like "SQL" or "Excel"; empty when nothing important is missing. Candidates with no verified skills can still be listed when their title and jobs fit, with the role\'s key skills as gaps. testBrief is two sentences Vetter\'s AI could write a short test from to check those gaps for this role and level; empty when gaps is empty. If no one fits well, say so and list the closest. Empty for test or unclear.',
    ...(req.simulations === false
      ? ['THIS COMPANY IS OUTSIDE TECH: its app simulations (interactive copies of software, equipment or the workplace) are made by the Vetter team and come from the library, so never suggest one for its AI to build. The test you suggest is made of questions on the job itself: scenarios, calculations, judgement calls, written answers, ordering steps and emails. Every custom item has kind written or mixed, never app, sheet, database or code. Vetter\'s ready-made skills games (attention to detail, verbal, numerical and logical reasoning, memory, multitasking) are suggested when they post the job; you may say so.']
      : []),
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
    const people = new Set((req.candidates ?? []).map((c) => c.id));
    return {
      status: 200,
      json: {
        ...out,
        // Library tests are suggested when a job is posted, not while making a test
        existing: [],
        people: (out.people ?? []).filter((p: { candidateId: string }) => people.has(p.candidateId)).slice(0, 5),
      },
    };
  } catch (err) {
    return apiFailure('test-advisor', err);
  }
}
