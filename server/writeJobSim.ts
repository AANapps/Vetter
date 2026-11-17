import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';
import { MAX_PROMPT, PRICES, SimulationCompany, apiFailure } from './generateTest.js';

/**
 * Writes a whole AI-made job simulation as one day on the desktop, in the five timed parts every Praxa job simulation
 * has (src/data/modules/jobSimKit.ts), the way the Data Analyst's day at Ridgeway Coffee is built (daJobSim.ts):
 * Briefing 2 min, Core task 12, Curveball 6, Juggling and judgement 10, Report back 7, plus a 3-minute buffer.
 *
 * It's written from the job description, the company and everything the company said, plus the plan agreed in the chat
 * (server/planTest.ts), in two requests so each stays well inside the host's five-minute limit: first the world (the
 * cast and everything pre-loaded on the computer, with the issues planted in it), then the script written against it
 * (the emails, who writes back, each part's brief and how it's marked). The browser (src/lib/jobSimBuild.ts) turns it into a test with jobSimulation(), works out every
 * spreadsheet answer from the data, checks it, and sends it back here once with what's wrong to fix.
 */

export interface JobSimRequest {
  job?: string;
  jobTitle?: string;
  company?: SimulationCompany;
  // Everything the company said: the chat's messages and what it settled earlier
  brief: string;
  background?: string;
  research?: string;
  // The plan agreed in the chat: its five parts, cast and blueprint
  plan?: { title?: string; description?: string; company?: string; setting?: string; people?: string[]; blueprint?: string[]; items?: { ref: string; title: string; brief: string; minutes: number }[] };
  // A day already written, to change as asked or to fix
  current?: unknown;
  change?: string;
  problems?: string[];
  // Which half to write: the world, or the script for the world already written
  stage: 'world' | 'script';
  world?: unknown;
}

const MAX_TEXT = 12000;

const str = { type: 'string' };
const strs = { type: 'array', items: str };
const file = { type: 'object', properties: { name: str, content: str }, required: ['name', 'content'], additionalProperties: false };
const files = { type: 'array', items: file };
const mail = (extra: Record<string, unknown> = {}, req: string[] = []) => ({
  type: 'object',
  properties: { from: str, subject: str, body: str, attachments: files, ...extra },
  required: ['from', 'subject', 'body', 'attachments', ...req],
  additionalProperties: false,
});

export const jobSimSchema = {
  type: 'object',
  properties: {
    reply: str,
    role: str,
    company: str,
    domain: str,
    day: str,
    description: str,
    category: str,
    skillsTested: strs,
    scenario: str,
    briefing: str,
    briefs: { type: 'object', properties: { core: str, curveball: str, juggling: str, report: str }, required: ['core', 'curveball', 'juggling', 'report'], additionalProperties: false },
    user: { type: 'object', properties: { name: str, role: str }, required: ['name', 'role'], additionalProperties: false },
    time: str,
    apps: { type: 'array', items: { type: 'string', enum: ['sheet', 'browser', 'sql', 'code'] } },
    contacts: { type: 'array', items: { type: 'object', properties: { name: str, role: str, email: str }, required: ['name', 'role', 'email'], additionalProperties: false } },
    workbookName: str,
    sheets: { type: 'array', items: { type: 'object', properties: { name: str, rows: { type: 'array', items: strs } }, required: ['name', 'rows'], additionalProperties: false } },
    databaseName: str,
    tables: { type: 'array', items: { type: 'object', properties: { name: str, columns: strs, rows: { type: 'array', items: strs } }, required: ['name', 'columns', 'rows'], additionalProperties: false } },
    homepage: str,
    pages: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          url: str,
          site: str,
          title: str,
          blocks: {
            type: 'array',
            items: {
              type: 'object',
              properties: { kind: { type: 'string', enum: ['h1', 'h2', 'p', 'note', 'link', 'table', 'download'] }, text: str, url: str, columns: strs, rows: { type: 'array', items: strs }, file },
              required: ['kind', 'text', 'url', 'columns', 'rows', 'file'],
              additionalProperties: false,
            },
          },
        },
        required: ['url', 'site', 'title', 'blocks'],
        additionalProperties: false,
      },
    },
    files,
    project: {
      type: 'object',
      properties: {
        name: str,
        files: { type: 'array', items: { type: 'object', properties: { name: str, content: str, readonly: { type: 'boolean' } }, required: ['name', 'content', 'readonly'], additionalProperties: false } },
        testFile: str,
        checks: { type: 'array', items: { type: 'object', properties: { id: str, code: str }, required: ['id', 'code'], additionalProperties: false } },
      },
      required: ['name', 'files', 'testFile', 'checks'],
      additionalProperties: false,
    },
    inbox: {
      type: 'array',
      items: mail({ id: str, phase: { type: 'string', enum: ['', 'core', 'curveball', 'juggling', 'report'] }, to: strs, cc: strs, date: str }, ['id', 'phase', 'to', 'cc', 'date']),
    },
    replies: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: str, to: str, mustMention: { type: 'array', items: strs }, mustAttach: str, reply: mail(), otherwise: mail() },
        required: ['id', 'to', 'mustMention', 'mustAttach', 'reply', 'otherwise'],
        additionalProperties: false,
      },
    },
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: { part: { type: 'string', enum: ['core', 'curveball', 'juggling', 'report'] }, description: str, input: str, expected: str, rubric: strs },
        required: ['part', 'description', 'input', 'expected', 'rubric'],
        additionalProperties: false,
      },
    },
  },
  required: ['reply', 'role', 'company', 'domain', 'day', 'description', 'category', 'skillsTested', 'scenario', 'briefing', 'briefs', 'user', 'time', 'apps', 'contacts', 'workbookName', 'sheets', 'databaseName', 'tables', 'homepage', 'pages', 'files', 'project', 'inbox', 'replies', 'checks'],
  additionalProperties: false,
};

// The two halves of the day, each a schema of its own
const pick = (keys: string[], extra: Record<string, unknown> = {}) => ({
  type: 'object',
  properties: { ...Object.fromEntries(keys.map((k) => [k, (jobSimSchema.properties as Record<string, unknown>)[k]])), ...extra },
  required: [...keys, ...Object.keys(extra)],
  additionalProperties: false,
});
const WORLD_KEYS = ['role', 'company', 'domain', 'day', 'description', 'category', 'skillsTested', 'scenario', 'briefing', 'user', 'time', 'apps', 'contacts', 'workbookName', 'sheets', 'databaseName', 'tables', 'homepage', 'pages', 'files', 'project'];
const SCRIPT_KEYS = ['reply', 'briefs', 'inbox', 'replies', 'checks'];
// planted: for the script's writer, each issue in the data and where it is, and the facts and figures the day turns on
const STAGE_SCHEMAS = { world: pick(WORLD_KEYS, { planted: strs }), script: pick(SCRIPT_KEYS) };

const STAGE_NOTES = {
  world: `WRITE NOW: THE WORLD ONLY (the first of two steps; the emails and checks are written next, against what you write
now). Everything about the company, the cast and what's pre-loaded on the computer (sheets, tables, pages, files,
project) for the day the plan describes. Build the planted issues into the data, and prepare the curveball (e.g. the
draft figure is what's in the data; the corrected one comes later by email). planted: one line each for every planted
issue and exactly where it is (sheet and rows, page, file, function), the curveball's change, the judgement call, and
the key figures and names the emails and checks will need.`,
  script: `WRITE NOW: THE SCRIPT ONLY (the second of two steps): reply, briefs, inbox, replies and checks for THE WORLD
above, used exactly as written: every sheet name, cell, column, page url, file name, project check id, address and
figure must match it. Every planted issue is handled by a check, and the report back's rubric names them.`,
};

const RULES = `You write job simulations for Praxa, a skills-based hiring platform. A job simulation is ONE working day on a
desktop computer, 40 minutes, for someone applying to the job described. Whoever does well can really do this job;
whoever can't is found out. Plain British English, no em dashes.

THE STRUCTURE (fixed; every Praxa job simulation has exactly these five timed parts)
1. Briefing, 2 min, not marked: who they are, the company, their manager, their tools. (briefing)
2. Core task, 12 min: the most important work of THIS job, simple first, then harder. (briefs.core)
3. Curveball, 6 min: something changes or goes wrong (a corrected figure, a new requirement, a bug report, a client
   changing their mind) and they adapt the work they've done. Its email has phase "curveball". (briefs.curveball)
4. Juggling and judgement, 10 min: two or three demands at once from different people (emails with phase "juggling"),
   plus ONE grey-area decision with no perfect answer, where they must decide and give a reason (e.g. a colleague asks
   them to leave something out, bend a rule, or prioritise their request over the manager's). (briefs.juggling)
5. Report back, 7 min: an email to the manager (or another team) summarising the work. (briefs.report)
Plus 3 minutes to read, switch apps and check.

TO FIT 40 MINUTES
- The data is pre-loaded: sheets already in the workbook, tables already in the database, the project already open.
  The candidate works; they don't set up.
- Every task counts twice: plant one or two issues in the day (duplicate rows, a wrong figure, a missing detail, a
  failing edge case) that nobody mentions. The juggling or core work is marked on handling them, and the report back
  is marked on whether it names them.
- Two work environments, three at most (apps), besides Mail, Files and the AI assistant, which every desktop has.
- Short briefs: reading time counts. Each brief is 1 to 3 sentences, pointing to the emails for detail.

MADE FOR THIS COMPANY AND THIS JOB
- Set the day AT the hiring company (company = its name; domain = its email domain, from its website if given, else a
  plausible one). Use what the company told you: its products, customers, sector, location, tools, team names, and
  the duties, tools and seniority in the job description. Every task is one the job description says this person does.
- Pick the environments from the tools the job really uses: sheet (Spreadsheet: Excel-style, formulas), browser (an
  intranet, a client portal, a supplier site, documentation: pages with text, tables, links and downloads), sql (a
  database to query with SQL; data only, its results reach the marks through the sheet or emails), code (a small
  JavaScript project with tests).
- The cast: the candidate (user; their email is first.last@domain, made by Praxa) and 3 to 6 colleagues in contacts,
  each "First Last", their role and first.last@domain. Everyone who writes or is written to is in contacts.
- The figures must be consistent everywhere: emails, pages, files and data say the same thing.

THE DESKTOP'S CONTENT
- time: when the day starts, e.g. "Mon 09:00". day: e.g. "Monday at <company>".
- inbox: 4 to 8 emails. phase "" for emails waiting at the start (the manager's request for the core task, the
  material it needs, one ordinary email that doesn't matter); "curveball" for the curveball; "juggling" for the new
  demands and the grey-area request; "report" only if someone asks for something extra then. id is short ("m-ana").
  from is "Name <address>"; to and cc are addresses. date like "Mon 08:52". attachments are CSV or text files.
- replies: people who write back when emailed. Usually one: the manager thanks them when the report arrives with the
  right attachment (mustAttach), and otherwise asks for it. mustMention groups of words, any one of each; [] for none.
  otherwise with an empty from, subject and body when there's nothing to say.
- sheets (when apps has sheet): the workbook, pre-loaded. Each sheet's rows are rows of cell strings, the first being
  the header; numbers written plainly ("4200", "3.5"); a formula starts with "=". A sheet the candidate fills in has
  its header and its row labels, the cells to fill left as "". 10 to 60 data rows per sheet; 2 to 4 sheets.
  workbookName like "q1_store_performance.xlsx". Otherwise sheets [] and workbookName "".
- tables (when apps has sql): each table's name (snake_case), columns and rows of strings; 10 to 60 rows. databaseName
  like "crm.db". Otherwise [] and "".
- pages (when apps has browser): 2 to 5 pages of one site, homepage its first url (no https://, e.g.
  "intranet.company.co.uk", "intranet.company.co.uk/news"). Each block has every field; fields a block doesn't use
  are "" or [] (a download's file has name and content; other blocks' file is {"name":"","content":""}). Put facts
  the work needs there (a policy, a notice explaining a dip, a price list, the API docs). Otherwise pages [] and "".
- project (when apps has code): name, files (small: 2 to 4 files, plain JavaScript functions, no imports or modules,
  each under 80 lines; one readonly file allowed), testFile (a file of the candidate's own tests, written
  test("name", () => { expect(fn(1)).toBe(2); })), checks: Praxa's hidden tests, each a test body using the project's
  functions with expect(x).toBe / toEqual / toBeCloseTo / toThrow, that FAIL on the code as given and pass once the
  work is done right. Otherwise {"name":"","files":[],"testFile":"","checks":[]}.
- files: anything else handed over at the start (often []).

THE CHECKS (how the day is marked; each has part, description, input, expected, rubric)
Every marked part (core, curveball, juggling, report) has 2 to 5 checks; 10 to 16 in all. description is what it looks
for, short ("Q1 sales are right for every store"). input is one of:
  sheet:=FORMULA          a formula run on the candidate's workbook, e.g. sheet:=Summary!C2, or several cells joined
                          sheet:=Summary!C2&" / "&Summary!C3. Count-style checks work well:
                          sheet:=COUNTIF(orders!A:A,"RC-1004"), sheet:=COUNTA(orders!A:A)-1, sheet:=ISFORMULA(Summary!C2)
  sent:<address>          an email went to them (expected "true")
  attached:<address>:<part of a file name>   an email to them carried that file (expected "true")
  mail:<address>          the last email to them, marked against rubric
  mailwith:<address>:<part of a file name>   the email to them carrying that file, marked against rubric
  visited:<url>           the page was opened (expected "true")
  test:<project check id> one of the project's checks passes (expected "passes")
expected: for sheet checks, the right value; when it depends on the data, write it as a formula starting with "="
  on the pre-loaded workbook (a value from the curveball's email written in as a number), e.g.
  =SUMIF(q1_sales!A:A,"S01",q1_sales!D:D)&" / "&SUMIF(q1_sales!A:A,"S02",q1_sales!D:D): Praxa works it out, so never
  compute a total yourself. A sheet check must NOT already pass on the workbook as given. Several right answers: "a|b".
  For mail checks expected is "" and rubric lists 2 to 4 things a strong answer does, specific to the day (the figures,
  the names, the planted issue); otherwise rubric is [].
The report back is marked on an attached file or sent email AND on a rubric that names the planted issues. The
grey-area decision is marked with a rubric on the reply to whoever asked: the decision, the reason, a fair alternative,
the tone.

ALSO
- role: the job's title, e.g. "Data Analyst". category: a short field name, e.g. "Data Analysis". skillsTested: 4 to 6.
- description: 1 to 2 sentences for the company: what the candidate does in each part. scenario: 2 short paragraphs
  shown beside the desktop: who they are, where, what's on the computer.
- reply: one sentence to the company on what you wrote (or changed).

A MODEL DAY (Data Analyst at a coffee chain): Core: fill a Summary sheet with every store's Q1 sales, target, % and
Met/Missed by formula from pre-loaded weekly sales and targets, then find on the intranet why stores missed. Curveball:
Finance emails that one target was the December draft; the corrected value is in the email, so a store now misses.
Juggling: tidy a till export (it has duplicated orders nobody mentioned, regions typed badly), give Marketing one
revenue number from it, and an area manager asks to leave their store out of the board summary (the judgement call).
Report back: email the Operations Director the summary with the workbook attached, marked on naming the stores that
missed and why, and on flagging the duplicates and the corrected target.`;

export async function writeJobSim(body: unknown, apiKey: string | undefined, model: string): Promise<{ status: number; json: unknown }> {
  const req = body as JobSimRequest;
  if (!req || (!req.brief?.trim() && !req.job && !req.plan && !req.current)) return { status: 400, json: { error: 'Say what the job is.' } };
  if (!apiKey) return { status: 503, json: { error: 'not-configured' } };

  const c = req.company;
  const company = c?.name
    ? `THE HIRING COMPANY (the day is set here):\n${[`Name: ${c.name}`, c.industry && `Industry: ${c.industry}`, c.headquarters && `Based in: ${c.headquarters}`, c.website && `Website: ${c.website}`, c.description && `About: ${c.description}`].filter(Boolean).join('\n')}`
    : '';
  const plan = req.plan
    ? `THE PLAN THE COMPANY AGREED (follow it):\n${[
        req.plan.title && `Title: ${req.plan.title}`,
        req.plan.setting && `Setting: ${req.plan.setting}`,
        req.plan.people?.length && `People:\n${req.plan.people.join('\n')}`,
        req.plan.blueprint?.length && `What the hire needs:\n${req.plan.blueprint.join('\n')}`,
        req.plan.items?.length && `The parts:\n${req.plan.items.map((i) => `- ${i.title} (${i.minutes} min): ${i.brief}`).join('\n')}`,
      ]
        .filter(Boolean)
        .join('\n\n')}`
    : '';
  const content = [
    req.jobTitle ? `THE ROLE: ${req.jobTitle}` : '',
    req.job ? `THE JOB DESCRIPTION:\n${req.job.slice(0, MAX_PROMPT)}` : '',
    company,
    req.background?.trim() ? `WHAT THE COMPANY SAID EARLIER:\n${req.background.slice(0, MAX_TEXT)}` : '',
    req.brief?.trim() ? `WHAT THE COMPANY SAID:\n${req.brief.slice(0, MAX_TEXT)}` : '',
    req.research ? `HOW THE JOB IS REALLY DONE (research; every task, term and figure must match it):\n${req.research.slice(0, MAX_TEXT)}` : '',
    plan,
    req.current ? `THE DAY AS WRITTEN:\n${JSON.stringify(req.current).slice(0, 60000)}` : '',
    req.change ? `THE COMPANY WANTS THIS CHANGED (write your half again with exactly that change, everything else kept):\n${req.change.slice(0, MAX_TEXT)}` : '',
    req.problems?.length ? `PRAXA'S CHECKS FOUND THESE PROBLEMS. Write your half again with every one fixed and everything else kept:\n${req.problems.map((p) => `- ${p}`).join('\n')}` : '',
    req.stage === 'script' && req.world ? `THE WORLD, ALREADY WRITTEN:\n${JSON.stringify(req.world).slice(0, 60000)}` : '',
    STAGE_NOTES[req.stage === 'script' ? 'script' : 'world'],
  ]
    .filter(Boolean)
    .join('\n\n');

  const stage = req.stage === 'script' ? 'script' : 'world';
  const client = new Anthropic({ apiKey });
  try {
    const message = await client.beta.messages
      .stream({
        model,
        max_tokens: 32000,
        // The world is mostly data, written quickly; the script decides how the day is marked, so it thinks more
        output_config: { effort: stage === 'world' ? 'low' : 'medium', format: { type: 'json_schema', schema: STAGE_SCHEMAS[stage] } },
        ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
        system: [{ type: 'text', text: RULES, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content }],
      })
      .finalMessage();
    meter(model, message.usage);
    const price = PRICES[model];
    const { input_tokens, output_tokens } = message.usage;
    if (price) console.log(`[write-job-sim ${stage}] ${input_tokens} in, ${output_tokens} out: $${((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(3)}`);
    if (message.stop_reason === 'refusal') return { status: 422, json: { error: 'Praxa declined to write this. Try describing the job differently.' } };
    if (message.stop_reason === 'max_tokens') return { status: 502, json: { error: 'The job simulation came back incomplete. Try again.' } };
    return { status: 200, json: JSON.parse(message.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('')) };
  } catch (err) {
    return apiFailure('write-job-sim', err);
  }
}
