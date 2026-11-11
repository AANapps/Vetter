import Anthropic from '@anthropic-ai/sdk';
import { meter } from './meter.js';

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
    // In a conversation: the id of a draft question to keep exactly as it is (the other fields are then ignored)
    keep: { type: 'string' },
    // A hands-on task's own label (e.g. "t1"), and on a question about a task, that task's label
    ref: { type: 'string' },
    taskRef: { type: 'string' },
    type: { type: 'string', enum: ['choice', 'multi', 'text', 'written', 'order', 'match', 'email', 'assistant', 'case', 'code', 'sql', 'sheet', 'database', 'app'] },
    title: { type: 'string' },
    prompt: { type: 'string' },
    // A sheet's file name, a database's name
    contextData: { type: 'string' },
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
    // An app's page; in a conversation, the spec the page builder works from instead (server/buildApp.ts)
    appHtml: { type: 'string' },
    // Spreadsheet tasks: the starting sheets as CSV, and the cells a right answer fills in (to prove the checks)
    workbook: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, csv: { type: 'string' } }, required: ['name', 'csv'], additionalProperties: false } },
    solutionCells: {
      type: 'array',
      items: { type: 'object', properties: { sheet: { type: 'string' }, cells: { type: 'string' }, value: { type: 'string' } }, required: ['sheet', 'cells', 'value'], additionalProperties: false },
    },
    // Database tasks: the tables the database starts with, as CSV with a header row
    dataTables: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, csv: { type: 'string' } }, required: ['name', 'csv'], additionalProperties: false } },
    timeLimitMinutes: { type: 'integer' },
    points: { type: 'integer' },
  },
  // Every field is asked for, empty where a style doesn't use it: optional fields make the output grammar too large to
  // compile, and testCases can't be skipped where it's needed
  required: ['keep', 'ref', 'taskRef', 'type', 'title', 'prompt', 'contextData', 'options', 'correctOption', 'correctOptions', 'acceptedAnswers', 'items', 'pairs', 'starterCode', 'solutionCode', 'testCases', 'tables', 'appHtml', 'workbook', 'solutionCells', 'dataTables', 'timeLimitMinutes', 'points'],
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

export const WORKSPACE_RULES = `
- sheet: a task in an Excel-style spreadsheet (formulas such as SUM, SUMIFS, COUNTIFS, AVERAGEIFS, VLOOKUP, XLOOKUP, INDEX/MATCH,
  IF, IFERROR, ROUND, TEXT, TRIM, LOWER, PROPER, LEFT/RIGHT/MID, DATE functions work). Use it for any role that lives in Excel.
  workbook: the starting sheets, each as CSV (row 1 the headers; quote values containing commas), 15 to 60 rows of
  realistic made-up data with the snags real data has. contextData: a file name like "march_sales.xlsx".
  prompt: the task in 2 to 4 numbered steps, each on its own line, saying exactly which sheet, column or cell each answer goes in.
  solutionCells: what a right answer enters: { sheet, cells, value }, where sheet is the sheet's name and cells one cell
  ("B2") or a range ("G2:G41"); for a range, value is a formula written for its first cell and filled down or right.
  testCases: 3 to 6 checks; input is a formula run on the finished workbook naming its sheets (e.g. "=SUM(Orders!H:H)" or
  "=ISFORMULA(Orders!G2)"), expectedOutput the value it gives once done right ("|" between acceptable forms). Each must
  fail on the starting workbook. Leave starterCode and solutionCode empty.
- database: a task in a SQL workbench (SQLite) on its own tables. Use it for data, analyst, BI and engineering roles.
  dataTables: 2 or 3 tables, each as CSV with a header row of column names (letters, digits and _ only) and 15 to 50 rows
  of realistic made-up data (numbers written plainly, an empty field for NULL). contextData: the database's name, e.g. "NorthwindSales".
  prompt: what to build, e.g. a view with named columns, or rows to fix with UPDATE/DELETE; numbered steps each on its own line.
  starterCode: a short SQL comment naming the tables, then the start of the statement. solutionCode: SQLite that does the task
  (CREATE VIEW ..., UPDATE ...). testCases: 2 to 4 checks; input is a SELECT run afterwards (e.g. "SELECT * FROM
  monthly_revenue ORDER BY month"), expectedOutput "" (it's worked out from solutionCode).`;

// What an app question can be: the three kinds of interactive page
export const APP_KINDS = `
- app: an interactive page the candidate really works in. Write up to 3. Use it for the hardest parts of the test. It is
  one of three kinds:
  (a) SOFTWARE: a working copy of a product the job uses (a CRM, helpdesk, EPOS till, design tool, accounting package...).
      When the job names software, make at least one. Build it the way a skilled developer would build the real web app,
      based on the RESEARCH, so someone who uses it daily feels at home within seconds: the same overall layout and
      navigation (top bar, side menu, tabs, breadcrumbs, search, record pages), the same workflow and order of screens, the
      same terminology and button labels for common actions, and the same kinds of tables, forms, filters and dialogs.
      It must look like a polished production app, not a mock-up: proper spacing, type scale, hover and focus states,
      empty states and validation messages.
      NO COPYRIGHT OR TRADEMARK INFRINGEMENT: give it an invented product name and a simple original logo (a geometric mark
      drawn in SVG), never the real product's name, logo, icons, illustrations, screenshots, help text or marketing copy.
      Draw every icon yourself as simple original SVG. Use a colour scheme in the same spirit (e.g. a dark blue top bar)
      but your own palette, not the brand's exact colours. Generic industry terms (Opportunity, Ticket, Invoice, Pipeline)
      are fine; slogans and branded feature names are not.
  (b) HANDS-ON WORK: for trades and physical jobs (device and phone repair, electrical, plumbing, automotive, engineering,
      lab and clinical work, warehouse, hospitality, beauty, manufacturing...), an interactive mock-up of the real thing,
      drawn in detailed inline SVG, so the candidate does the job step by step. Model the exact item named, from the
      RESEARCH: e.g. a phone repair shop testing a screen replacement on a specific model gets that phone (its real shape,
      camera layout, buttons, screw positions and types, brackets, battery and display connectors), a tool tray (the right
      screwdriver bits, heat pad, suction cup, picks, spudger, tweezers, adhesive), and the steps it really takes: power
      off, heat and lift the screen, remove the right screws in the right places, disconnect the battery BEFORE the
      display, swap the part, reconnect, test. Clicking a tool then a part does what it would; the drawing changes as parts
      come off (exploded or opened views, zoom on the area worked on). Wrong moves have realistic consequences recorded in
      the state (a torn flex cable, a stripped screw, a short from leaving the battery connected) without telling the
      candidate it was wrong. Include a fault to diagnose when the job calls for it (e.g. readings on a multimeter view).
      Draw it yourself in original SVG and leave every maker's logo and branding off the device.
      Make it look like the real thing, not a diagram: true proportions and colours, rounded bodies with gradients,
      highlights and shadows, glass, metal and cable textures, labelled screws and connectors drawn where they really sit,
      a large central view of the device that fills the stage, and a zoomed inset of the area being worked on. Spend most
      of the page's size on the drawing and its states (closed, opened, each part removed). Tools show as recognisable icons.
      The candidate works out the procedure: actions happen by picking a tool and using it on a part in the drawing, never
      from a list of steps, and nothing on screen numbers the steps or shows them in the right order.
  (c) ANY OTHER FORMAT you design for the skill, when the job isn't done in one product or on one device: e.g. triaging
      an inbox of customer emails into priority lanes, labelling the faults on a wiring diagram or floor plan, reading a
      live dashboard and flagging the anomaly, building a staff rota that meets the rules, replying to a customer chat
      where the customer reacts to each reply, marking up a contract or a drawing, sorting stock into the right
      locations. Invent whatever best shows whether someone can really do the work; it doesn't have to look like any
      existing question type. It is marked by checks on what the candidate leaves behind, like the others.
`;

// How the page itself is written, whether in the same call or by the page builder (server/buildApp.ts)
export const APP_PAGE_RULES = `  For every kind, appHtml is ONE self-contained HTML page, under 60KB:
  • Its <title> is the product's or item's name alone: the invented name for software, e.g. <title>ClickData</title>, or
    the item worked on, e.g. <title>Phone repair: 6.1" handset</title>. Never a real brand's logo anywhere on the page.
  • Everything inline: no external scripts, stylesheets, images or requests of any kind (Google Fonts are the only exception).
    No <form> submission and no alert/prompt/confirm: use buttons and in-page dialogs. It runs in a sandbox with no network.
  • It fits any window from 900x560 up and scrolls where it doesn't: every panel, list, table and canvas whose content can
    be taller or wider than its space has overflow:auto. Never overflow:hidden on html or body, never a fixed pixel size
    for the whole page, and no horizontal swipe or wheel handlers on the page itself.
  • Charts never scroll. On a dashboard or report, each chart (SVG or canvas) is drawn to fit its card: width 100%, with
    the card's height set by the layout, and an SVG viewBox so it scales. Only long lists and tables scroll, never a chart.
  • Fill it with realistic made-up data or detail, enough that the task takes real work (6 to 12 minutes).
  • EVERY CONTROL WORKS. Every visible button, link, tab, menu item, icon button and row action does what its label says
    in this kind of product: navigation opens its screen, New opens a working form, Save saves and the record appears
    wherever it should, Delete removes it (after an in-page confirm), sort and filter re-order and narrow, Export makes a
    download, settings toggles change behaviour. Nothing is decorative and nothing silently does nothing. A feature
    outside the task's scope is shown greyed out: the disabled attribute (or aria-disabled="true" on non-buttons),
    reduced opacity, cursor:not-allowed and a title like "Not available in this test". Don't add controls you won't
    make work or grey out.
  • THE LOGIC FLOWS like the real thing: one source of truth for the data, so a change on one screen shows on every
    other (lists, counts, totals, badges, charts, dashboards); statuses move only through valid steps; required fields
    and bad input get inline errors; undo or cancel puts things back; numbers recalculate. A candidate who does the work
    correctly in any sensible order ends with the right state.
  • Put all the script inside one (function () { ... })(), so no name clashes with the browser's own globals (top, name,
    parent, status, open, close and so on). Plain ES2020, no modules or libraries.
  • Keep everything the candidate can change in ONE plain JSON object; for hands-on work, include the steps taken in order
    (e.g. steps: ["power_off", "heat_screen", ...]), what is attached or removed, and any damage done. On load, start from
    window.vetterSaved when it isn't null (the candidate coming back to the task), otherwise from the starting state. Call
    vetter.save(state) once on load and again after every change. Never show which values are checked or what they should be.`;

// The task wording and the checks on the page's state
export const APP_TASK_RULES = `
  prompt: short and easy to scan: one sentence on who's asking and why, then the outcome wanted as 3 to 5 numbered steps,
  one line each, not which buttons to press. Don't describe the screen: the page builder pins tips to the parts of the
  app the candidate needs, so where things are is shown on the app itself.
  testCases (REQUIRED for app: an app question without them is thrown away): 3 to 6 checks on the final state. input is a dotted path into the state object, e.g. "dashboard.widgets.0.type"
  or "parts.battery.connected"; expectedOutput is its value once the task is done right ("|" between acceptable forms; a list as a
  JSON array, compared in any order; numbers to 2 decimal places). description says what's checked without giving the
  answer. The starting state must fail every check. Leave starterCode and solutionCode empty.`;

export const APP_RULES = `${APP_KINDS}\n${APP_PAGE_RULES}${APP_TASK_RULES}`;

// What a simulation looks like in each sector. Work that isn't done at a computer is simulated as the real thing:
// the place, the equipment, the people and what happens there, not a software screen
const SECTOR_SIMULATIONS: Record<string, string> = {
  trades: `TRADES: this work is practical and done on site, not at a computer, so no app copies software. Every app is
  hands-on (kind b) or a format of your own (kind c), drawn as the real thing in detailed SVG:
  • Interactive diagrams the candidate builds or fixes: a circuit, wiring, consumer unit, plumbing or heating schematic
    where components are dragged from a parts tray onto the board and wired terminal to terminal; the diagram re-draws
    as it changes and the circuit is really modelled (series and parallel, a lamp lights only on a closed circuit, an
    RCD trips on a fault, a wrong cable rating overheats), so the result follows from what they built.
  • A toolbox: the right tools as recognisable icons (multimeter, two-pole voltage tester, proving unit, insulation
    resistance and loop testers, screwdrivers, strippers, crimpers, pipe cutter, spirit level...). A meter clipped to two
    points gives the reading the modelled circuit really has there; tools used wrongly have real consequences.
  • Real events: a call-out (a customer's tripping circuit, a leak under a sink, a dead socket), a site walk-round to
    spot hazards on a drawn scene, a job with a customer interrupting. Safe working is marked: isolating, locking off,
    proving dead (and the tester on a known live source before and after), PPE, the order steps are done in.`,
  hospitality: `HOSPITALITY: the work happens on a floor, not at a desk, so simulate the place itself as a live game:
  • A floor plan drawn in SVG (the counter, till, coffee machine, kitchen stations, tables, the door) with a game clock
    running faster than real time. Customer avatars walk in on a schedule, queue, and order in speech bubbles (with
    allergies, changes and the odd complaint); each has a patience bar that runs down while they wait.
  • The candidate takes orders on the till, then makes them by working the stations step by step (grind, tamp,
    extract, steam and pour for coffee; prep, cook, plate for food), the item drawn as it's made; staff avatars move to
    the station they're sent to. Orders are served to the right table; mistakes (wrong milk, an allergen, a long wait)
    show on the customer.
  • Back-office jobs interrupt the shift, as they do: a delivery to check against the order note, a rota to fix after a
    sick call, a stock order before the cut-off, the till cash-up and banking. The candidate juggles them against the
    queue, so prioritising and keeping to time are part of the mark.
  • The state records every order (what was asked, what was served, when), each customer's wait, and what was done in
    the back office and when.`,
  retail: `RETAIL: simulate the shop, not a desk: a shop floor drawn in SVG with customer avatars arriving on a game clock,
  a working till (scanning, offers, refunds and exchanges under the returns policy, card and cash with change), shelves
  to fill and fix against a planogram by dragging stock, a delivery to check in, price changes to make, a customer
  asking for help or complaining, and the cash-up at close. Interruptions compete for time, as they do.`,
  healthcare: `HEALTHCARE: simulate the ward or clinic: patients drawn at their bedsides with observation charts that
  update on a clock, scoring (e.g. NEWS2) and escalating at the right point, a medication round from a drug chart with
  checks to make before giving anything, call bells and relatives interrupting, handover notes to write, and infection
  control steps. Unsafe moves are recorded, never prevented or pointed out.`,
};

export const sectorSimulationRules = (sector?: string) =>
  sector && SECTOR_SIMULATIONS[sector] ? `\nSIMULATIONS FOR THIS SECTOR: the company hires in ${sector}. ${SECTOR_SIMULATIONS[sector]}\n` : '';

// A test that mixes questions with gamified simulations
export const GAMIFIED_TEST_RULES = `
GAMIFIED TEST: the test mixes every kind of question (short answers, choice, select-all, ordering, matching, written)
with 2 or 3 simulations the candidate plays: interactive, game-like tasks in the place the job is done, built around
what the company describes. They feel like a game (a clock, things happening, people reacting, drag and drop, live
results), while being marked strictly on what the candidate does. The quick questions set up and follow on from the
simulations: e.g. a question on which cable size a circuit needs, then a simulation where they wire it.`;

// One advanced simulation on its own, marked on the tasks it sets
export const STANDALONE_RULES = `
STANDALONE SIMULATION: this replaces the SECTIONS and size above. The whole test is ONE app question: an advanced
simulation that works through the job's functions one by one, each a task the candidate completes inside it. Nothing
else: no other questions, no case, no sub-questions, no inbox.
- Plan 8 to 15 tasks, from the everyday to the hardest, each testing one function of the job (e.g. for a café: open
  up, take and make the first orders, handle an allergy, check in a delivery, fix the rota, cash up). The page shows
  them one at a time as the day goes on (a task card: "Task 3 of 10" and what's needed), and the candidate moves on
  when they're done or chooses to skip; earlier work stays as it is.
- testCases: one check per task, 8 to 15, each a dotted path into the state recording that task's result, with the
  description naming the task (e.g. "Task 4: the delivery's short items recorded"). The mark is the share of tasks
  done right.
- timeLimitMinutes 25 to 45, points 100. The spec (appHtml) may run to 1,500 words: it describes the scene, every
  task in order with its data, events and check, and the state object's keys (tasks.1 ... tasks.<n>).`;

// The page builder's extra rules for a game-like simulation
export const GAME_PAGE_RULES = `
GAME-LIKE SIMULATION: this page is an interactive simulation, not a form. Make it feel alive:
  • A scene drawn in detailed SVG (the place, the equipment, the people as simple friendly avatars), animated with
    requestAnimationFrame or CSS transitions: people walk in, wait, react; things heat, fill, light up or break.
  • A game clock where time matters (shown on screen, running faster than real time), events arriving on a schedule
    from the spec, and timers or patience bars where waiting counts. Pause only via a Pause button.
  • Direct manipulation: drag and drop with pointer events (mouse and touch), snapping to targets, tools picked from a
    tray and used on the scene, things that can be rotated, connected or combined. Every action changes the scene.
  • Model the real behaviour behind it (a circuit's current, an order's state, a patient's obs), so results follow
    from what the candidate does, not from a script.
  • Feedback shows what happened in the world (a lamp lights, a customer frowns, a breaker trips), never whether a
    check passed or what the right answer is.
  • When the spec copies a piece of software, keep it a faithful copy of that software, and bring in only what fits it
    (work arriving on a clock, people chasing, live results); don't turn its screens into a cartoon.`;

// How hard and how real the questions are: the same rules for a test written in one go and one built in the chat
export const QUALITY_RULES = `
QUESTION QUALITY: write questions that really test the candidate: a strong one finds them demanding and a weak one can't
bluff or look up the answer quickly.
- Every question opens with a full scenario, usually 80 to 200 words, before it asks anything: who the candidate is in
  it, the customer, colleague or manager involved, what has happened so far, the figures, dates, records, messages or
  readings they'd really have in front of them, the constraints, and what's already been tried. Lay out data as short
  lines or a small table in the prompt. Then ask one clear question that depends on that detail. No definitions,
  acronyms, "which of these is a feature of X" or anything a search answers in seconds.
- Match the format to the difficulty. Foundation knowledge and quick judgement calls use the fast formats: choice, multi,
  text, order and match (still scenario-led). The hardest, most job-defining work is done hands-on: an app simulation,
  code, a spreadsheet or a database task, where the candidate has to actually do the job rather than recognise the
  answer. Put the fast questions first and build up to the hands-on work.
- Each one needs a judgement, a diagnosis, a calculation in more than one step, a trade-off or a priority call, the way the
  job really needs it. At least half combine two or more facts from the scenario before the answer follows.
- Wrong options are what a capable but less experienced person would really pick: a common mistake, a half-right step,
  the right action in the wrong order. Options are similar in length and wording, so the answer can't be spotted by
  its form, and never "all of the above" or "none of the above".
- Short answers are a number or term worked out from the scenario, not recalled.
- Tasks carry the snags of real work: messy or inconsistent data, an edge case, a conflicting request, a trap a careless
  person falls into. Checks reward doing it properly, not just doing something.
- Scale to the level: Beginner and Junior still apply what they know to a situation; Professional and Senior weigh
  competing priorities, spot what's missing and handle exceptions.`;

// A skills test: separate questions, each standing on its own scenario, with no company setting or cast
export const SKILLS_TEST_RULES = `
SKILLS TEST: this is a skills test, not a job simulation. Each question, case and task stands on its own scenario
(different workplaces and people are fine), testing the skills the job needs one by one. There is no setting or cast:
leave company, setting and people empty ("", "" and []).`;

// Training: the same working setting as a job simulation, but written to teach the company's people, usually one app
export const TRAINING_RULES = `
TRAINING: this is a training simulation for people who already work at the company, not a hiring test. It teaches
them to do real work in the software (or the process) the company names, step by step:
- Build it around one or more app tasks that copy that software as closely as you can (its screens, terms and buttons),
  starting easy and building up: find your way round, then the everyday jobs, then the trickier ones and the mistakes
  people make. Use the company's own data and people.
- Every prompt says plainly what to do and why it matters at work, as a good trainer would ("Raise a refund for Priya's
  order; refunds over £200 need a manager's sign-off, so add Tom as approver."). Teaching beats trickery: no traps,
  and anything they need to know is in the prompt or the material.
- solutionCode on every question is the worked answer with a short explanation, written to the trainee; rubric points
  and feedback teach the right way of working. They see all of it when they finish.
- Quick questions (choice, order, match) check they understood the step just done; skip long written answers unless the
  company asks.
- skillsTested lists what they'll be able to do afterwards. passingScore is 70 unless told otherwise.`;

// A job simulation: the candidate is working at the hiring company, in the role, from start to end
export interface SimulationCompany {
  name?: string;
  industry?: string;
  // The sector it hires in (src/lib/sectors.ts): decides what its simulations look like
  sector?: string;
  description?: string;
  website?: string;
  headquarters?: string;
}
export const simulationRules = (company?: SimulationCompany, jobTitle?: string) => `
JOB SIMULATION: the whole test is a working day (or week) in the job${jobTitle ? ` of ${jobTitle}` : ''} at ${
  company?.name
    ? `${company.name}${company.industry ? `, ${company.industry}` : ''}${company.headquarters ? `, based in ${company.headquarters}` : ''}${company.description ? `. About them: ${company.description.slice(0, 600)}` : ''}${company.website ? ` (${company.website})` : ''}`
    : 'a realistic invented company that fits the job'
}. The candidate has just started there; every question, case, email and task happens at that company, in its line of
business, with its products, customers and suppliers, and the same cast of colleagues throughout:
- The setting: who the candidate is, who they report to, the team and what's on this week, in 2 to 4 sentences
  addressed to the candidate ("You've just joined ... as ..."). It opens the test.
- The people: 5 to 10 people they deal with, each "Name | Role | email": their manager, teammates, other teams (finance,
  ops, legal, IT...), and customers or suppliers outside the company (with their own email domains). Company emails use
  the company's real domain${company?.website ? ` (from ${company.website})` : ''}. Use these people, by name, in every
  scenario, email and task, so the test hangs together as one job.
- Work arrives the way it really does: emails, chat messages, tickets, a manager's request, a customer on the phone. Use
  email tasks for the communication the job needs (who to reply to, who to copy in, who must not see it), and
  questions on who to contact, escalate to or hand over to, from the people above.
- The hands-on tasks are in the software the job uses at this company, with this company's data, and they connect to the
  rest: an email asks for the work, the candidate does it in the app or spreadsheet, then replies with what they found.
- Invent nothing about the company that would be embarrassing or untrue in a damaging way (no scandals, lawsuits or
  real named staff): its people are made up, its situations are ordinary working ones.`;

// Email tasks: a thread in the candidate's inbox and the reply they write, with who it goes to
export const EMAIL_RULES = `
- email: a thread lands in the candidate's work inbox and they write the reply, choosing who it goes To and who is Cc'd
  from the address book. Use it for the communication the job really involves: answering a customer, pushing back on a
  manager, escalating a problem, handing over to a colleague, chasing a supplier. prompt: one or two sentences, as the
  candidate would see it at work ("Priya needs an answer before her 2pm call."), never which recipients are right.
  items: the thread, oldest first, 1 to 4 emails, each written out exactly as
  "From: Name <address>\nTo: Name <address>, ...\nCc: ...\nDate: Tue 4 Mar, 09:12\nSubject: ...\n\n<body>", the
  candidate being one of the people it was sent to (as "You <you@<company domain>>"). Bodies are real work email, 60 to
  220 words, with the detail the reply turns on: a figure that doesn't add up, a request that clashes with policy, a
  customer who is cc'd on something internal, a deadline, a person who needs to know. options: the address book, 5 to 9
  people the candidate could write to, each "Name | Role | address" (colleagues, their manager, other teams, the
  customer or supplier), including the people the reply should go to and plausible wrong choices.
  pairs: who the reply goes to, one pair each: { left: "to", right: address } for whoever it must be sent to,
  { left: "cc", right: address } for whoever should be copied in (a manager to keep informed, the team that must act),
  { left: "not", right: address } for anyone it must not go to (a customer on an internal matter, someone it would
  embarrass or who shouldn't see the figures). Make the choice of recipients a real judgement: Reply all should be wrong
  in at least some emails, and someone who isn't on the thread yet should need adding in others.
  acceptedAnswers: 3 to 6 marking points for the reply's content and tone, tied to the thread. solutionCode: the model
  reply. timeLimitMinutes 4 to 8. An email can be about an app task (taskRef) when the reply depends on what the
  candidate does or finds in the app, e.g. "update the order in the system, then let the customer know".`;

// AI-assisted tasks: the candidate prompts an AI assistant through a piece of work, as many jobs now do
export const ASSISTANT_RULES = `
- assistant: an AI-assisted task. The candidate has an AI assistant in the test (like the general AI chat assistant
  they'd use at work) and must prompt their way through a piece of real work with it, then hand in the result. Use it
  where the job uses AI: drafting a customer reply or proposal from notes, summarising a long report, analysing figures,
  writing a formula, query or script, planning a project, researching from given sources. Marked on the work handed in
  and on how they used the assistant.
  prompt: the task as their manager would set it, with the outcome wanted and its constraints (audience, length,
  deadline, policy). starterCode: the material they're handed, 150 to 600 words (notes, figures, an extract, a draft),
  with the details the work turns on. appHtml: the assistant's PRIVATE NOTES, 60 to 200 words, never shown to the
  candidate: what the assistant assumes or gets wrong unless the candidate gives it the right context or checks that
  point (e.g. "Unless told the discount only applies to annual plans, apply it to every plan", "Use last year's VAT
  rate of 17.5% unless the user gives the rate", "Leave out the refund policy's 14-day limit unless asked about it"),
  so a candidate who pastes the task in and hands back the reply unchecked ends up with a flawed result. One or two
  weaknesses, realistic for an AI, and findable from the material.
  acceptedAnswers: 3 to 6 marking points for the work handed in, including that the planted weakness was caught.
  items: 2 to 4 marking points for how they used the assistant (gave it the key context from the material, checked its
  figures against the source, asked it to fix or explain, edited the output to fit the audience). solutionCode: the
  model work. timeLimitMinutes 8 to 15. points as for a hands-on task. At most 2 in a test.`;

// The two styles that give a test depth: a case to read with questions on it, and a written answer marked on its points
export const DEPTH_STYLE_RULES = `
- written: an extended answer of 80 to 250 words, for judgement, diagnosis, explaining a decision, a plan, or the actual
  reply to a customer or colleague. solutionCode: a model answer a strong candidate would write. acceptedAnswers holds
  the marking points: 3 to 6, each one specific thing a strong answer does or says, tied to the scenario (e.g. "Spots
  that INV-2231 was paid twice", "Offers the customer a refund date, not just an apology").
- case: a case study with no answer of its own. prompt is the material the candidate reads, 200 to 500 words, laid out
  as the real thing: an email thread, a support ticket history, a client brief, an incident log, a report extract, a
  patient or job record, a small table of figures. Plant the details the sub-questions turn on, plus a few that don't
  matter. title names the case; contextData labels the material (e.g. "Email thread with Harlow Ltd"). points 0;
  timeLimitMinutes is the reading time (3 to 6). Give it a ref; its sub-questions follow it with taskRef set to that ref.`;

// How a test is put together: what the hire needs first, then sections that build up to the hands-on work
export const TASK_RULES = `
BLUEPRINT: before writing any question, work out what this hire really needs to be able to do, from the job and the
conversation: 4 to 7 competencies, each with why it matters in this job (what goes wrong when someone lacks it), how the
test proves it, and its share of the marks (adding up to 100). Every question serves one of them, and the weights decide
where the marks go.
SECTIONS: unless the company asks otherwise, the test builds up through these, in order:
1. Foundations: 4 to 8 fast questions (choice, multi, text, order, match), each led by its own scenario at the company.
2. In a job simulation, the inbox: 1 or 2 email tasks, plus a question on who to contact, escalate to or hand over to.
   (A skills test leaves this section out.)
3. Case studies: 1 or 2 cases, each followed by 3 to 5 sub-questions mixing fast formats with at least one written.
4. Hands-on tasks: 2 or 3 of sheet, database or app (or code for developers), and an AI-assisted task where the job
   uses AI, each followed by 2 to 4 sub-questions
   about what the candidate found or did in it, including an email reply about it where it fits (the customer or
   manager who asked for the work) or a written one (what they'd tell the customer or
   manager, why it happened, what they'd check next).
Size: 20 to 32 questions counting sub-questions, 45 to 75 minutes in all, never more than 45 questions.
Sub-questions (an email can be one): give each case and each sheet, database or app task a short ref ("c1", "t1"...) and set taskRef on the
questions about it; they're answered beside it, so they may rely on what it shows. Every other question has taskRef "",
and every question that isn't a case or task has ref "". A kept case or task's ref is its id.`;

function instructions(req: GenerateRequest): string {
  return `You help companies on Vetter, a skills-based hiring platform, choose and write tests for a job.

${req.wantExisting ? `Pick up to 4 tests from the LIBRARY that genuinely fit the job, best first, each with a one-sentence reason a hiring manager would find useful. Only use ids from the library. Return an empty list if none fit.` : 'Return an empty "existing" list.'}

${
  req.wantNewTest
    ? `Write one new test of exactly ${req.questionCount} questions at ${req.level} level that checks what the job really needs, without repeating what the picked library tests already cover.
Use only these question styles: ${req.styles.join(', ')}. Mix them where it suits the job. Every question must be answerable from its prompt alone.${QUALITY_RULES}
Every question has every field: "" for text, [] for lists and -1 for correctOption where its style doesn't use them, and keep is "".
Style rules (testCases is an empty list for choice, multi, text, order and match):
- choice: 4 options, exactly one right; correctOption is its 0-based index.
- multi: 4 to 6 options; correctOptions lists every right index (at least 2).
- text: a short factual answer (a word, number or short phrase); acceptedAnswers lists every acceptable wording.
- order: 4 to 6 items listed in the RIGHT order (candidates see them shuffled).
- match: 3 to 5 pairs; each left prompt with its right answer, all distinct.
- code: JavaScript. starterCode defines "function solution(...)". solutionCode is a correct reference implementation. 3 to 5 testCases; input is a JSON array of the arguments, e.g. "[[3,1,2]]" calls solution([3,1,2]); expectedOutput is the JSON result.
- sql: query only these tables: ${req.tables.map((t) => `${t.name}(${t.columns.join(', ')})`).join('; ')}. List the tables used in "tables". solutionCode is a correct SQLite query; starterCode is a comment and "SELECT ".${DEPTH_STYLE_RULES}${req.styles.includes('email') ? EMAIL_RULES : ''}${req.styles.includes('assistant') ? ASSISTANT_RULES : ''}${req.styles.includes('app') ? APP_RULES : ''}
timeLimitMinutes is realistic for the question (2 to 4 for answer styles, as the scenario takes reading, 5 to 10 for code and sql, 6 to 12 for app), and across the test they add up to 25 to 35. points reflect importance; a task counts for more than a question about it.${req.styles.includes('app') ? TASK_RULES : ''}
category must be one of: ${req.categories.join(', ')}. passingScore between 60 and 80. roles: pick from ${req.roles.join(', ')}.
Write plainly, in British English, with no em dashes.`
    : 'Do not include "test".'
}

${req.research ? `RESEARCH on the software the job uses:\n${req.research}\n\n` : ''}LIBRARY:
${req.library.map((t) => `- ${t.id}: ${t.title} (${t.category}, ${t.difficulty}; skills: ${t.skills.join(', ')}; roles: ${t.roles.join(', ')}). ${t.description}`).join('\n')}`;
}

// Dollars per million tokens for the model used, to log what each test costs
import { PRICES } from './meter.js';
export { PRICES };

// Researches the software the job uses, for app simulations to copy: plain notes, or empty when no product is named.
// Web search runs on Anthropic's side; a long search pauses the turn, which is resumed a few times at most
export async function researchSoftware(client: Anthropic, model: string, prompt: string): Promise<string> {
  return searchAndNote(client, model, `The job or test the company described:\n\n${prompt.slice(0, MAX_PROMPT)}`, SOFTWARE_RESEARCH, 'the simulation');
}

// Researches how the job is really done, for app simulations whose tasks must be exactly what the job involves: its
// daily tasks, procedures, terms, records and equipment, plus the main software or device when one is named or usual
export async function researchJob(client: Anthropic, model: string, prompt: string): Promise<string> {
  return searchAndNote(client, model, `The job the company is hiring for:\n\n${prompt.slice(0, MAX_PROMPT)}`, JOB_RESEARCH, 'the job');
}

const SOFTWARE_RESEARCH = `A skills test is being written for this job, including an interactive simulation candidates work in, so they can show they can really do the job.
Find the one thing the simulation should copy: the main software product the job or test names, or, for hands-on work, the specific device, equipment or machine (and the procedure done on it, e.g. "iPhone 13 screen replacement"). If neither is named or implied, reply with exactly NONE.
Then search the web (official docs, help centres, repair guides such as iFixit, service manuals, tutorials) and write compact notes for a developer rebuilding it.
For software:
- what the product is for, and who uses it
- the overall layout: top bar, sidebars, panels, where the main navigation sits, and what each main screen is called
- the look: colour scheme (hex values if you can find them), typography, density, how buttons, tables and cards look
- exact terminology: menu items, button labels, object names
- the core workflows a person in this job does in it, step by step, as the product does them
- example data the product typically holds
For a device or equipment:
- what it looks like: dimensions and proportions, colours and finishes, where the buttons, ports, cameras and labels sit
- what's inside, in the order it comes apart: fasteners (types, sizes, positions), brackets, connectors, cables, adhesive
- the procedure step by step, with the tools used, the order that matters (e.g. disconnect the battery first) and the
  common mistakes and the damage they cause
- how a finished job is tested, and typical faults with their symptoms and readings
Only facts you found or can be confident of. Under 900 words. No preamble.`;

const JOB_RESEARCH = `A skills test is being written for this job, with interactive simulations candidates work in, so they show they can really do it. Every task in them must be something a person in this job really does, done the way it's really done, so that someone who does the job for a living recognises all of it and finds nothing wrong.
Search the web (professional and regulatory bodies, official guidance, training and qualification syllabuses, job profiles, vendor help centres, trade guides) and write compact notes for the test designer. Work in the country the company is in; if that's unclear, the UK.
- the job in a sentence, at the level asked for, and what it is NOT (tasks that belong to another role, e.g. a dental nurse charts what the dentist calls out but doesn't diagnose)
- the real daily and weekly tasks, most common and most important first
- the key procedures step by step, in the order that matters, with the checks, the common mistakes and what they cause
- the rules, standards and guidance the job follows (by name, e.g. HTM 01-05, COSHH, GDPR), and what they require in practice
- exact terminology, abbreviations and notation (e.g. a dental chart's FDI or Palmer numbering, tooth surfaces and the symbols and colours used)
- the records, forms, charts and logs the job fills in, and what goes in each field
- the equipment, materials and instruments used, with their real names
- the software the job usually works in (name the common products) and what's done in it; if the company names one, its layout and terms
- realistic example data: typical values, quantities, codes, times and the situations that come up
Only facts you found or can be confident of. Under 1,200 words. No preamble.`;

// Searches the web (on Anthropic's side; a long search pauses the turn, which is resumed a few times at most) and
// writes up notes, or "" when there's nothing to research
async function searchAndNote(client: Anthropic, model: string, content: string, system: string, label: string): Promise<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content }];
  for (let turn = 0; turn < 4; turn++) {
    const message = await client.beta.messages
      .stream({
        model,
        max_tokens: 16000,
        output_config: { effort: 'low' },
        // Dynamic filtering needs the larger models; Haiku has the basic search
        tools: [model.includes('haiku') ? { type: 'web_search_20250305', name: 'web_search', max_uses: 8 } : { type: 'web_search_20260209', name: 'web_search', max_uses: 8 }],
        ...(!model.includes('haiku') && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
        system,
        messages,
      })
      .finalMessage();
    meter(model, message.usage);
    if (message.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: message.content });
      continue;
    }
    const text = message.content.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('').trim();
    const searches = message.usage.server_tool_use?.web_search_requests ?? 0;
    console.log(`[research] researched ${label}: ${searches} searches, ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`);
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
        system: instructions({ ...req, research, questionCount: Math.min(45, Math.max(1, Math.round(req.questionCount || 26))) }),
        messages: [{ role: 'user', content: `The job or test the company described:\n\n${req.prompt.slice(0, MAX_PROMPT)}` }],
      })
      .finalMessage();
    meter(model, message.usage);

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
  // Vetter's own account has run out of credit: logged above for the Vetter team; companies get a plain 'busy' message
  if (err instanceof Anthropic.APIError && /credit balance/i.test(err.message))
    return { status: 503, json: { error: "Vetter's AI is busy right now. Nothing is lost: try again in a little while." } };
  if (err instanceof Anthropic.APIError) return { status: 502, json: { error: `Claude returned an error (${err.status}).` } };
  return { status: 502, json: { error: err instanceof Error ? err.message : 'The AI request failed.' } };
}
