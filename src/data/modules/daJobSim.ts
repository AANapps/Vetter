import { AssessmentTest, Question } from '../../types';
import { toCsv } from '../../lib/csv';
import { workbookStarter } from '../../lib/spreadsheet';
import { DesktopConfig } from '../../lib/desktop';
import { choice, multi, order, short, written } from '../questionKit';
import { questionSet } from './daSets';
import { round2, seeded, sum, tc } from '../simulationKit';

/**
 * The Data Analyst job simulation: a day at Ridgeway Coffee, worked on the desktop (src/components/Desktop.tsx). The
 * candidate starts at their inbox: the Operations Director wants Q1 store performance against target for Friday's
 * board. The sales are on the company's sales portal (a link in IT's email), the targets are with Finance (who send
 * them when asked properly), and Store Operations have sent a messy till export. They download, ask, clean, analyse,
 * find why two stores missed (on the portal's store and news pages), email the Director with the workbook attached,
 * and answer her follow-up. Two question sets on the analyst's judgement come first. About 40 minutes.
 */

const DOMAIN = 'ridgewaycoffee.co.uk';
const HANNAH = `hannah.okafor@${DOMAIN}`;
const RAJ = `raj.mehta@${DOMAIN}`;
const PRIYA = `priya.shah@${DOMAIN}`;
const ME = `jamie.lee@${DOMAIN}`;
const PORTAL = 'portal.ridgewaycoffee.co.uk';
const WORKBOOK = 'q1_store_performance.xlsx';

// ---------- The data ----------

const STORES = [
  { id: 'S01', name: 'Leeds Briggate', region: 'North', weekly: 4200, target: 54000 },
  { id: 'S02', name: 'York Minster', region: 'North', weekly: 3400, target: 43500 },
  { id: 'S03', name: 'Manchester Deansgate', region: 'North', weekly: 5100, target: 65000 },
  { id: 'S04', name: 'Bristol Harbourside', region: 'West', weekly: 4000, target: 50500 },
  { id: 'S05', name: 'Bath Abbey', region: 'West', weekly: 3000, target: 39000 },
  { id: 'S06', name: 'Brighton Lanes', region: 'South', weekly: 3800, target: 49000 },
  { id: 'S07', name: 'Oxford Cornmarket', region: 'South', weekly: 4400, target: 56500 },
  { id: 'S08', name: 'Cambridge Market', region: 'East', weekly: 3600, target: 46000 },
];
const WEEKS = 13;
const SALES = (() => {
  const rand = seeded(2026);
  return STORES.flatMap((s) =>
    Array.from({ length: WEEKS }, (_, w) => {
      const week = w + 1;
      let v = s.weekly * (0.94 + rand() * 0.14);
      // Bath closed for refurbishment in week 7; Brighton lost trade to a new competitor from week 6
      if (s.id === 'S05' && week === 7) v = 0;
      if (s.id === 'S06' && week >= 6) v *= 0.82;
      return { store_id: s.id, store_name: s.name, week, sales: Math.round(v) };
    })
  );
})();
const q1 = (id: string) => sum(SALES.filter((r) => r.store_id === id).map((r) => r.sales));
const pct = (id: string) => q1(id) / STORES.find((s) => s.id === id)!.target;
const MISSED = STORES.filter((s) => pct(s.id) < 1).map((s) => s.name);
const BATH_EX7 = sum(SALES.filter((r) => r.store_id === 'S05' && r.week !== 7).map((r) => r.sales));

const SALES_CSV = toCsv([['store_id', 'store_name', 'week', 'sales'], ...SALES.map((r) => [r.store_id, r.store_name, r.week, r.sales])]);
const TARGETS_CSV = toCsv([['store_id', 'q1_target'], ...STORES.map((s) => [s.id, s.target])]);

// March's till export: some orders synced twice, and Region typed by hand
const REGION_MESS: Record<number, string> = { 2: 'north ', 5: 'SOUTH', 9: ' West', 14: 'Nrth', 21: 'east', 27: 'Sout h' };
const TILL = (() => {
  const rand = seeded(3031);
  return Array.from({ length: 32 }, (_, i) => {
    const s = STORES[Math.floor(rand() * STORES.length)];
    return {
      id: `RC-${1001 + i}`,
      date: `2026-03-${String(1 + Math.floor(i / 1.2)).padStart(2, '0')}`,
      store: s.name,
      region: s.region,
      raw: REGION_MESS[i] ?? s.region,
      qty: 1 + Math.floor(rand() * 4),
      price: [2.8, 3.2, 3.6, 4.1, 5.5][Math.floor(rand() * 5)],
    };
  });
})();
const TILL_DUPES = ['RC-1004', 'RC-1012', 'RC-1023'];
const TILL_EXPORT = TILL.flatMap((o) => (TILL_DUPES.includes(o.id) ? [o, o] : [o]));
const TILL_CSV = toCsv([['Order ID', 'Date', 'Store', 'Region', 'Qty', 'Unit Price'], ...TILL_EXPORT.map((o) => [o.id, o.date, o.store, o.raw, o.qty, o.price])]);
const TILL_REVENUE = round2(sum(TILL.map((o) => o.qty * o.price)));
const TILL_SHEET = 'till_export_march';

// ---------- The desktop ----------

const contacts = [
  { name: 'Hannah Okafor', role: 'Operations Director', email: HANNAH },
  { name: 'Raj Mehta', role: 'Finance Manager', email: RAJ },
  { name: 'Priya Shah', role: 'Store Operations Lead', email: PRIYA },
  { name: 'IT Helpdesk', role: 'IT', email: `it@${DOMAIN}` },
  { name: 'Tom Fry', role: 'Marketing', email: `tom.fry@${DOMAIN}` },
];

const DESKTOP: DesktopConfig = {
  user: { name: 'Jamie Lee', email: ME, role: 'Data Analyst' },
  company: 'Ridgeway Coffee',
  time: 'Mon 09:00',
  apps: ['mail', 'browser', 'files', 'sheet', 'ai'],
  contacts,
  workbook: workbookStarter([
    { name: 'Summary', rows: [['Store ID', 'Store', 'Q1 Sales', 'Q1 Target', '% of Target', 'Status'], ...STORES.map((s) => [s.id, s.name])] },
  ]),
  workbookName: WORKBOOK,
  homepage: `${PORTAL}`,
  inbox: [
    {
      id: 'm-tom',
      from: `Tom Fry <tom.fry@${DOMAIN}>`,
      to: [`all-staff@${DOMAIN}`],
      date: 'Fri 16:40',
      subject: 'Spring menu photos are in!',
      body: 'Hi all, the spring menu shoot went brilliantly. Photos are on the shared drive for anyone who wants to use them in store. Have a lovely weekend! Tom',
    },
    {
      id: 'm-it',
      from: `IT Helpdesk <it@${DOMAIN}>`,
      to: [`all-staff@${DOMAIN}`],
      date: 'Fri 17:05',
      subject: 'The new sales portal is live',
      body: `Hello everyone,\n\nThe new sales portal is live. You can reach it from any office computer at:\n\n${PORTAL}/sales\n\nNo login is needed on the office network. Store pages and company news are on the same site.\n\nIT Helpdesk`,
    },
    {
      id: 'm-priya',
      from: `Priya Shah <${PRIYA}>`,
      to: [ME],
      date: 'Mon 08:31',
      subject: 'March till export (needs a tidy)',
      body: `Morning Jamie,\n\nHere's March's till export for the sample stores, as you asked. Heads up: the sync glitch duplicated a few orders (same Order ID twice), and the region column was typed by hand in some stores so it's a bit of a mess.\n\nShout if you need anything.\nPriya`,
      attachments: [{ name: 'till_export_march.csv', content: TILL_CSV }],
    },
    {
      id: 'm-hannah',
      from: `Hannah Okafor <${HANNAH}>`,
      to: [ME],
      cc: [RAJ],
      date: 'Mon 08:52',
      subject: 'Q1 store performance for Friday’s board',
      body: `Hi Jamie,\n\nThe board wants to know how each store did in Q1 against its target. Could you:\n\n1. Get Q1 sales for every store. They're on the new sales portal (IT sent the link on Friday).\n2. Get the Q1 targets from Finance (Raj has them).\n3. Work out each store's sales against its target, and which stores missed.\n4. Find out why any store missed. The portal has store notices and company news.\n5. Also tidy Priya's March till export (she's sent it to you) and add a revenue column, so we can trust it for the next pack.\n\nPlease email me a short summary by 2pm with your workbook attached. I'll probably have a question or two.\n\nThanks,\nHannah`,
    },
  ],
  replies: [
    {
      id: 'raj-targets',
      to: RAJ,
      mustMention: [['target']],
      reply: {
        from: `Raj Mehta <${RAJ}>`,
        subject: 'Re: Q1 targets',
        body: 'Hi Jamie,\n\nHere are the Q1 sales targets by store, as signed off in December. Store IDs match the sales portal.\n\nRaj',
        attachments: [{ name: 'store_targets_q1.csv', content: TARGETS_CSV }],
      },
      otherwise: {
        from: `Raj Mehta <${RAJ}>`,
        subject: 'Re: your email',
        body: 'Hi Jamie, happy to help, but what exactly do you need from me? Raj',
      },
    },
    {
      id: 'hannah-followup',
      to: HANNAH,
      mustAttach: 'q1_store_performance',
      reply: {
        from: `Hannah Okafor <${HANNAH}>`,
        subject: 'Re: Q1 store performance',
        body: `Thanks Jamie, this is really useful.\n\nOne question before the board: is Bath's miss a real problem, or just the week it was shut? If you take out the closed week, would it have hit target? One or two lines I can use, please.\n\nHannah`,
      },
      otherwise: {
        from: `Hannah Okafor <${HANNAH}>`,
        subject: 'Re: Q1 store performance',
        body: 'Thanks Jamie, could you attach your workbook too? Raj wants to check the numbers before Friday. Hannah',
      },
    },
  ],
  pages: [
    {
      url: PORTAL,
      site: 'Ridgeway Coffee · Intranet',
      title: 'Intranet home',
      blocks: [
        { kind: 'h1', text: 'Ridgeway Coffee intranet' },
        { kind: 'p', text: 'Welcome back. Everything you need for the working day.' },
        { kind: 'link', text: 'Sales portal', url: `${PORTAL}/sales` },
        { kind: 'link', text: 'Stores and notices', url: `${PORTAL}/stores` },
        { kind: 'link', text: 'Company news', url: `${PORTAL}/news` },
      ],
    },
    {
      url: `${PORTAL}/sales`,
      site: 'Ridgeway Coffee · Sales portal',
      title: 'Sales portal',
      blocks: [
        { kind: 'h1', text: 'Sales portal' },
        { kind: 'p', text: 'Weekly takings by store for Q1 2026 (weeks 1 to 13, January to March). Updated every Monday at 06:00.' },
        { kind: 'download', text: 'Download Q1 weekly sales (q1_store_sales.csv)', file: { name: 'q1_store_sales.csv', content: SALES_CSV } },
        { kind: 'table', caption: 'Latest week (week 13)', columns: ['Store ID', 'Store', 'Week 13 sales (£)'], rows: STORES.map((s) => [s.id, s.name, SALES.find((r) => r.store_id === s.id && r.week === 13)!.sales]) },
        { kind: 'link', text: 'Stores and notices →', url: `${PORTAL}/stores` },
      ],
    },
    {
      url: `${PORTAL}/stores`,
      site: 'Ridgeway Coffee · Stores',
      title: 'Stores and notices',
      blocks: [
        { kind: 'h1', text: 'Stores and notices' },
        { kind: 'table', columns: ['Store ID', 'Store', 'Region', 'Notices'], rows: STORES.map((s) => [s.id, s.name, s.region, s.id === 'S05' ? 'Closed for refurbishment 9–15 Feb (week 7)' : s.id === 'S06' ? 'See company news, 4 Feb' : '']) },
        { kind: 'link', text: 'Company news →', url: `${PORTAL}/news` },
      ],
    },
    {
      url: `${PORTAL}/news`,
      site: 'Ridgeway Coffee · News',
      title: 'Company news',
      blocks: [
        { kind: 'h1', text: 'Company news' },
        { kind: 'h2', text: '10 Mar · Spring menu launches 1 April' },
        { kind: 'p', text: 'New seasonal drinks in every store from 1 April.' },
        { kind: 'h2', text: '16 Feb · Bath Abbey reopens' },
        { kind: 'p', text: 'Bath Abbey reopened on Monday 16 Feb after a week closed (9–15 Feb) for its refurbishment. Trade since has been in line with plan.' },
        { kind: 'h2', text: '4 Feb · New competitor in Brighton' },
        { kind: 'p', text: 'A national chain opened a large coffee shop directly opposite Brighton Lanes on 2 Feb (the start of week 6). The area team is reviewing a response.' },
      ],
    },
  ],
};

const dataTask = (checks: [n: number, description: string, input: string, expected: string | { rubric: string[] }][]): Question => ({
  id: 'da-sim-desk',
  title: 'Monday at Ridgeway Coffee',
  type: 'desktop',
  prompt: `It's 9am on Monday. You're the data analyst at Ridgeway Coffee, a chain of eight cafés. Everything you need is on your computer: start with your inbox.

Q1. Read your emails and find out what's needed. Get Q1 sales for every store from the sales portal.
Q2. Get the Q1 targets from Finance.
Q3. Clean Priya's till export in the spreadsheet: import it (Import CSV), remove the duplicate orders, and make every Region read exactly North, South, East or West.
Q4. Add a Revenue column to the till export (column G, headed Revenue): Qty × Unit Price on every order, with a formula.
Q5. On the Summary sheet, fill in Q1 Sales (C), Q1 Target (D) and % of Target (E, as a fraction) for each store, with formulas from the files you imported.
Q6. In Status (F), show Missed for stores below target and Met for the rest, with a formula.
Q7. Email Hannah a short summary by 2pm: which stores missed, by how much, and why. Attach your workbook.
Q8. Answer Hannah's follow-up question.`,
  starterCode: '',
  desktop: DESKTOP,
  testCases: checks.map(([n, d, input, e], i) => ({
    ...tc(`tc-da-sim-${i + 1}`, `Q${n} · ${d}`, input, typeof e === 'string' ? e : ''),
    ...(typeof e !== 'string' && { rubric: e.rubric }),
  })),
  timeLimitMinutes: 30,
  weight: 70,
});

const joined = (...cells: string[]) => 'sheet:=' + cells.join('&" / "&');
const values = (...vs: (string | number)[]) => vs.join(' / ');
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

const TASK = dataTask([
  [1, 'Opened the sales portal', `visited:${PORTAL}/sales`, 'true'],
  [1, 'Downloaded the Q1 sales', 'downloaded:q1_store_sales.csv', 'true'],
  [2, 'Asked Finance clearly enough to get the targets', 'received:raj-targets', 'true'],
  [3, 'Each duplicated order appears once', `sheet:=COUNTIF(${TILL_SHEET}!A:A,"${TILL_DUPES[0]}")+COUNTIF(${TILL_SHEET}!A:A,"${TILL_DUPES[1]}")+COUNTIF(${TILL_SHEET}!A:A,"${TILL_DUPES[2]}")`, '3'],
  [3, `No order lost: ${TILL.length} remain`, `sheet:=COUNTA(${TILL_SHEET}!A:A)-1`, String(TILL.length)],
  [3, 'Every region is North, South, East or West', `sheet:=COUNTIF(${TILL_SHEET}!D:D,"North")+COUNTIF(${TILL_SHEET}!D:D,"South")+COUNTIF(${TILL_SHEET}!D:D,"East")+COUNTIF(${TILL_SHEET}!D:D,"West")`, String(TILL.length)],
  [4, 'Revenue adds up, by formula', `sheet:=ROUND(SUM(${TILL_SHEET}!G:G),2)&" / "&${TILL_SHEET}!G1&" / "&ISFORMULA(${TILL_SHEET}!G2)`, values(TILL_REVENUE, 'Revenue', 'TRUE')],
  [5, 'Q1 sales are right for every store', joined(...STORES.map((_, i) => `Summary!C${i + 2}`)), values(...STORES.map((s) => q1(s.id)))],
  [5, 'Targets are right for every store', joined(...STORES.map((_, i) => `Summary!D${i + 2}`)), values(...STORES.map((s) => s.target))],
  [5, '% of target is right', joined(...STORES.map((_, i) => `ROUND(Summary!E${i + 2},4)`)), values(...STORES.map((s) => r4(pct(s.id))))],
  [5, 'Worked out by formula', 'sheet:=AND(ISFORMULA(Summary!C2),ISFORMULA(Summary!D9),ISFORMULA(Summary!E9))', 'TRUE'],
  [6, 'The right stores are marked Missed', joined(...STORES.map((_, i) => `Summary!F${i + 2}`)), values(...STORES.map((s) => (pct(s.id) < 1 ? 'Missed' : 'Met')))],
  [6, 'By formula', 'sheet:=ISFORMULA(Summary!F9)', 'TRUE'],
  [7, 'The workbook is attached for Hannah', `attached:${HANNAH}:q1_store_performance`, 'true'],
  [7, 'The summary for Hannah', `mailwith:${HANNAH}:q1_store_performance`, {
    rubric: [
      `Names the stores that missed (${MISSED.join(' and ')}) with their figures against target (e.g. % of target or £ short)`,
      'Explains Bath: closed for refurbishment for a week (week 7, 9–15 Feb)',
      'Explains Brighton: a competitor opened opposite at the start of week 6, and sales have been lower since',
      'Short and clear for a director: the headline first, the other stores met target, and a suggested next step',
    ],
  }],
  [8, 'Hannah’s question came back', 'received:hannah-followup', 'true'],
  [8, 'The answer to Hannah’s question', `mail:${HANNAH}`, {
    rubric: [
      `Works out Bath without the closed week: about £${BATH_EX7.toLocaleString('en-GB')} in 12 weeks (or a weekly average of about £${Math.round(BATH_EX7 / 12).toLocaleString('en-GB')}) against a £39,000 target`,
      'Concludes whether it would have hit target on a like-for-like basis (e.g. scaling 12 weeks to 13, or comparing the weekly run rate with target ÷ 13)',
      'Gives one or two clear lines Hannah can use with the board, without overclaiming',
    ],
  }],
]);

const SETS: Question[] = [
  ...questionSet(
    'da-sim-s1',
    'Before You Trust the Data',
    'A first look at the till export',
    `The first rows of a till export, as it arrived:

Order ID  Date        Store           Region  Qty  Unit Price
RC-1001   2026-03-01  Leeds Briggate  North   2    3.20
RC-1002   2026-03-01  Bath Abbey      West    1    5.50
RC-1003   2026-03-02  York Minster    north   3    2.80
RC-1004   2026-03-03  Oxford          South   2    3.60
RC-1004   2026-03-03  Oxford          South   2    3.60`,
    [
      multi(
        'da-sim-s1-a',
        'Checks to Run',
        'Before analysing an export like this, which checks should you run? Tick all that apply.',
        ['Order IDs that appear more than once', 'Categories spelled more than one way', 'Blank or impossible values, such as negative quantities', 'That the dates cover the whole period you need', 'Sort by price so the dearest come first'],
        [0, 1, 2, 3]
      ),
      short('da-sim-s1-b', 'Revenue', 'What is the revenue of order RC-1003, in pounds?', ['8.4', '8.40', '£8.40', '£8.4']),
      choice(
        'da-sim-s1-c',
        'The Repeated Row',
        'RC-1004 appears twice, identical. What should you do?',
        ['Keep one: a sync glitch repeated it, and counting both would overstate sales', 'Keep both: they might be two customers', 'Delete both to be safe', 'Leave it and note it in the report'],
        0
      ),
      order('da-sim-s1-d', 'Cleaning Steps', 'Put these in order.', ['Keep the raw file untouched', 'Remove the duplicate orders', 'Standardise the regions', 'Add the Revenue column', 'Check the totals against the source']),
    ]
  ),
  ...questionSet(
    'da-sim-s2',
    'Explaining a Miss',
    'Two stores below target',
    `Two stores came in below their Q1 target:

Store           Q1 Sales  Target   % of Target
Bath Abbey      £35,900   £39,000  92%
Brighton Lanes  £42,100   £49,000  86%

Bath was closed for one week of the 13 for a refurbishment. A competitor opened opposite Brighton at the start of week 6.`,
    [
      choice(
        'da-sim-s2-a',
        'The Bigger Worry',
        'Which miss should worry the board more, and why?',
        ['Brighton: its sales dropped from week 6 and are still down, so it will keep missing', 'Bath: it missed by more pounds', 'Neither: both are close to target', 'Bath: a closure is always serious'],
        0
      ),
      short('da-sim-s2-b', 'Short of Target', 'How much, in pounds, did Brighton Lanes miss its target by?', ['6900', '£6,900', '6,900', '£6900']),
      written(
        'da-sim-s2-c',
        'Like for Like',
        'How would you check whether Bath would have hit its target if it hadn’t closed?',
        [
          'Takes the closed week out and compares like for like (e.g. Bath’s weekly average over the 12 open weeks × 13, or against target × 12/13)',
          'Uses its own weekly sales from the portal rather than guessing',
          'Says what the answer means (on track apart from the closure, or not)',
        ],
        'Take out week 7, work out Bath’s average weekly sales over the 12 open weeks and multiply by 13, then compare that with the £39,000 target (or compare the 12 weeks with 12/13 of the target). If it’s at or above target, the miss is the closure, not a trading problem.'
      ),
      written(
        'da-sim-s2-d',
        'One Line for the Board',
        'Write one or two sentences for the board explaining both misses.',
        [
          'Bath: the miss is down to the week’s closure for refurbishment, trading normally since',
          'Brighton: down since a competitor opened opposite in early February, an ongoing problem',
          'Clear, factual and short, with a sense of which needs action',
        ],
        'Bath missed by 8% only because it was closed for a week’s refurbishment and has traded in line since; Brighton is 14% below target because a national chain opened opposite in February, and sales are still down, so it needs a response.'
      ),
    ]
  ),
];

export const DA_JOB_SIM: AssessmentTest = (() => {
  const raw = [...SETS, TASK];
  const total = raw.reduce((n, q) => n + q.weight, 0) || 1;
  const questions = raw.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) }));
  const drift = 100 - questions.reduce((n, q) => n + q.weight, 0);
  if (drift) questions.reduce((a, b) => (b.weight > a.weight ? b : a)).weight += drift;
  return {
    id: 'test-da-sim',
    title: 'Data Analyst Job Simulation: A Day at Ridgeway Coffee',
    description:
      'A working day as a data analyst, on a full desktop: read your emails to find what’s needed, download sales from the company’s portal, ask Finance for the targets, clean a messy till export, build the analysis in a spreadsheet, find why two stores missed on the intranet, email the Operations Director with your workbook, and answer her follow-up. About 40 minutes.',
    skillsTested: ['Data Analysis', 'Excel', 'Data Cleaning', 'Written Communication', 'Problem Solving'],
    roles: ['Data Analyst'],
    type: 'standard',
    category: 'Data Analysis',
    difficulty: 'Professional',
    passingScore: 70,
    scenario: {
      company: 'Ridgeway Coffee',
      role: 'Data Analyst',
      brief: `You're Jamie Lee, the data analyst at Ridgeway Coffee, a chain of eight cafés across England. It's Monday morning.

The job simulation runs on your work computer: Mail, the company intranet in the Browser, your Files, the Spreadsheet and an AI assistant, all on the taskbar. People reply to your emails.`,
    },
    questions,
    totalQuestions: questions.filter((q) => q.type !== 'case').length,
    estimatedMinutes: 40,
  };
})();
