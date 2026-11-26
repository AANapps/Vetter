import { toCsv } from '../../lib/csv';
import { workbookStarter } from '../../lib/spreadsheet';
import { round2, seeded, sum } from '../simulationKit';
import { DesktopConfig } from '../../lib/desktop';
import { jobSimulation } from './jobSimKit';

/**
 * The Data Analyst job simulation: a Monday at Ridgeway Coffee, in the five timed parts every Corprax job simulation
 * has (jobSimKit.ts), on the desktop with two environments: the Spreadsheet and the intranet in the Browser.
 *
 * Core task: Q1 sales against target for every store on the Summary sheet (the data is pre-loaded), then why stores
 * missed (the intranet's notices and news). Curveball: Finance's targets were the December draft; Manchester's was
 * raised, so it now misses too. Juggling and judgement: tidy the till export (it has duplicate orders nobody
 * mentioned), give Marketing one number from it, and the Brighton area manager asks to keep Brighton out of the board
 * summary. Report back: the summary for the Operations Director, marked on how it's written and on whether it flags
 * the duplicates and the revised target.
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
const TILL_ROWS: (string | number)[][] = [['Order ID', 'Date', 'Store', 'Region', 'Qty', 'Unit Price'], ...TILL_EXPORT.map((o) => [o.id, o.date, o.store, o.raw, o.qty, o.price])];
const DUPE_REVENUE = round2(sum(TILL.filter((o) => TILL_DUPES.includes(o.id)).map((o) => o.qty * o.price)));

// The curveball: Manchester's signed-off target was raised in January (a new seating area); Finance sent the draft
const MCR = 'S03';
const MCR_ROW = STORES.findIndex((s) => s.id === MCR) + 2;
const MCR_TARGET = Math.ceil((q1(MCR) * 1.04) / 500) * 500;
const target = (id: string) => (id === MCR ? MCR_TARGET : STORES.find((s) => s.id === id)!.target);
const pctFinal = (id: string) => q1(id) / target(id);
const MISSED_FINAL = STORES.filter((s) => pctFinal(s.id) < 1).map((s) => s.name);
const TARGETS_V2_CSV = toCsv([['store_id', 'q1_target'], ...STORES.map((s) => [s.id, target(s.id)])]);

// ---------- The desktop ----------

const LENA = `lena.park@${DOMAIN}`;
const TOM = `tom.fry@${DOMAIN}`;

const contacts = [
  { name: 'Hannah Okafor', role: 'Operations Director', email: HANNAH },
  { name: 'Raj Mehta', role: 'Finance Manager', email: RAJ },
  { name: 'Priya Shah', role: 'Store Operations Lead', email: PRIYA },
  { name: 'Lena Park', role: 'Area Manager, South', email: LENA },
  { name: 'Tom Fry', role: 'Marketing', email: TOM },
];

const DESKTOP: Omit<DesktopConfig, 'phases'> = {
  user: { name: 'Jamie Lee', email: ME, role: 'Data Analyst' },
  company: 'Ridgeway Coffee',
  time: 'Mon 09:00',
  apps: ['mail', 'sheet', 'browser', 'files', 'ai'],
  contacts,
  // Pre-loaded: the portal's weekly sales, Finance's targets and Priya's till export, beside the Summary to fill in
  workbook: workbookStarter([
    { name: 'Summary', rows: [['Store ID', 'Store', 'Q1 Sales', 'Q1 Target', '% of Target', 'Status'], ...STORES.map((s) => [s.id, s.name])] },
    { name: 'q1_sales', rows: [['store_id', 'store_name', 'week', 'sales'], ...SALES.map((r) => [r.store_id, r.store_name, r.week, r.sales])] },
    { name: 'targets', rows: [['store_id', 'q1_target'], ...STORES.map((s) => [s.id, s.target])] },
    { name: TILL_SHEET, rows: TILL_ROWS },
  ]),
  workbookName: WORKBOOK,
  homepage: `${PORTAL}`,
  inbox: [
    {
      id: 'm-raj',
      from: `Raj Mehta <${RAJ}>`,
      to: [ME],
      date: 'Fri 16:20',
      subject: 'Q1 targets',
      body: 'Hi Jamie,\n\nQ1 targets by store, as Hannah asked. They’re in your workbook too (the targets sheet).\n\nRaj',
      attachments: [{ name: 'store_targets_q1.csv', content: TARGETS_CSV }],
    },
    {
      id: 'm-hannah',
      from: `Hannah Okafor <${HANNAH}>`,
      to: [ME],
      cc: [RAJ],
      date: 'Mon 08:52',
      subject: 'Q1 store performance for Friday’s board',
      body: `Hi Jamie,\n\nThe board wants to know how each store did in Q1 against its target. Everything’s in your workbook: weekly sales from the portal (q1_sales) and Raj’s targets.\n\nPlease fill in the Summary sheet, and find out why any store missed (the intranet has store notices and company news).\n\nI’ll want a short summary from you later this morning.\n\nThanks,\nHannah`,
    },
    {
      id: 'm-raj-v2',
      phase: 'curveball',
      from: `Raj Mehta <${RAJ}>`,
      to: [ME],
      cc: [HANNAH],
      date: 'Mon 09:16',
      subject: 'Correction: Q1 targets',
      body: `Jamie, sorry: the targets I sent on Friday were the December draft. In the January sign-off Manchester Deansgate’s target went up to £${MCR_TARGET.toLocaleString('en-GB')} (the new seating area). Everything else is unchanged. Corrected file attached.\n\nRaj`,
      attachments: [{ name: 'store_targets_q1_v2.csv', content: TARGETS_V2_CSV }],
    },
    {
      id: 'm-priya',
      phase: 'juggling',
      from: `Priya Shah <${PRIYA}>`,
      to: [ME],
      date: 'Mon 09:22',
      subject: 'March till export (needs a tidy)',
      body: `Morning Jamie,\n\nMarch’s till export for the sample stores is in your workbook (${TILL_SHEET}). The region column was typed by hand in some stores, so it’s a bit of a mess. Could you tidy it so we can trust it for the next pack, and add a Revenue column (G)?\n\nPriya`,
      attachments: [{ name: 'till_export_march.csv', content: TILL_CSV }],
    },
    {
      id: 'm-tom',
      phase: 'juggling',
      from: `Tom Fry <${TOM}>`,
      to: [ME],
      date: 'Mon 09:24',
      subject: 'Quick number?',
      body: 'Hi Jamie! For Thursday’s newsletter: what was the total March revenue in Priya’s till export? Just the one number. Thanks! Tom',
    },
    {
      id: 'm-lena',
      phase: 'juggling',
      from: `Lena Park <${LENA}>`,
      to: [ME],
      date: 'Mon 09:25',
      subject: 'Brighton in the board summary',
      body: 'Hi Jamie,\n\nI hear you’re doing the Q1 summary for the board. Could you leave Brighton out this time, or show it against a lower target to allow for the competitor? The team has worked really hard and it isn’t their fault. It would mean a lot.\n\nLena',
    },
  ],
  replies: [
    {
      id: 'hannah-thanks',
      to: HANNAH,
      mustAttach: 'q1_store_performance',
      reply: { from: `Hannah Okafor <${HANNAH}>`, subject: 'Re: Q1 store performance', body: 'Thanks Jamie, this is just what I needed for Friday.\n\nHannah' },
      otherwise: { from: `Hannah Okafor <${HANNAH}>`, subject: 'Re: Q1 store performance', body: 'Thanks Jamie, could you attach your workbook too? Raj wants to check the numbers before Friday. Hannah' },
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
        { kind: 'link', text: 'Stores and notices', url: `${PORTAL}/stores` },
        { kind: 'link', text: 'Company news', url: `${PORTAL}/news` },
      ],
    },
    {
      url: `${PORTAL}/stores`,
      site: 'Ridgeway Coffee · Stores',
      title: 'Stores and notices',
      blocks: [
        { kind: 'h1', text: 'Stores and notices' },
        { kind: 'table', columns: ['Store ID', 'Store', 'Region', 'Notices'], rows: STORES.map((s) => [s.id, s.name, s.region, s.id === 'S05' ? 'Closed for refurbishment 9–15 Feb (week 7)' : s.id === 'S06' ? 'See company news, 4 Feb' : s.id === MCR ? 'New seating area opened 5 Jan' : '']) },
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
        { kind: 'h2', text: '5 Jan · More seats in Manchester' },
        { kind: 'p', text: 'Manchester Deansgate’s new seating area is open, with 30 more seats.' },
      ],
    },
  ],
};

const joined = (...cells: string[]) => 'sheet:=' + cells.join('&" / "&');
const values = (...vs: (string | number)[]) => vs.join(' / ');
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;

export const DA_JOB_SIM = jobSimulation({
  testId: 'test-da-sim',
  questionId: 'da-sim-desk',
  role: 'Data Analyst',
  company: 'Ridgeway Coffee',
  day: 'Monday at Ridgeway Coffee',
  description:
    'A Monday as a data analyst, in five timed parts on a full desktop: work out every store’s Q1 sales against target in a spreadsheet and find why stores missed on the intranet; adapt when Finance corrects a target; tidy a messy till export, answer Marketing and handle an area manager’s request to leave a store out; then report to the Operations Director. 40 minutes.',
  skillsTested: ['Data Analysis', 'Excel', 'Data Cleaning', 'Written Communication', 'Problem Solving'],
  roles: ['Data Analyst'],
  category: 'Data Analysis',
  scenario: `You're Jamie Lee, the data analyst at Ridgeway Coffee, a chain of eight cafés across England. It's Monday morning.

Your work computer has Mail, the Spreadsheet (your workbook, with the data already in it), the company intranet in the Browser, Files and an AI assistant.`,
  briefing: `You're Jamie Lee, the data analyst at Ridgeway Coffee, a chain of eight cafés across England. It's 9am on Monday and the board meets on Friday.

Your manager: Hannah Okafor, Operations Director.
Your tools: Mail, the Spreadsheet (q1_store_performance.xlsx, with Q1 sales, targets and a till export already loaded), the intranet in the Browser, Files and an AI assistant.`,
  briefs: {
    core: 'Read Hannah’s email. On the Summary sheet, fill in Q1 Sales (C), Q1 Target (D), % of Target (E, as a fraction) and Status (F: Missed or Met) for every store, with formulas. Then find out on the intranet why any store missed.',
    curveball: 'Raj has corrected a target. Update your Summary so it uses the signed-off targets.',
    juggling: 'Three people need you. Tidy Priya’s till export (make it trustworthy, every Region North, South, East or West, and a Revenue column G = Qty × Unit Price, by formula). Answer Tom. Reply to Lena with your decision and why.',
    report: 'Email Hannah a short summary for the board, with your workbook attached: which stores missed, by how much and why, and anything she should know about the data.',
  },
  desktop: DESKTOP,
  checks: [
    ['core', 'Q1 sales are right for every store', joined(...STORES.map((_, i) => `Summary!C${i + 2}`)), values(...STORES.map((s) => q1(s.id)))],
    ['core', '% of target is worked out for every store', `sheet:=COUNT(Summary!E2:E${STORES.length + 1})`, String(STORES.length)],
    ['core', 'Worked out by formula', `sheet:=AND(ISFORMULA(Summary!C2),ISFORMULA(Summary!D${STORES.length + 1}),ISFORMULA(Summary!E${STORES.length + 1}),ISFORMULA(Summary!F${STORES.length + 1}))`, 'TRUE'],
    ['core', 'Looked for the reasons on the intranet', `visited:${PORTAL}/news`, 'true'],
    ['curveball', 'Targets are the signed-off ones, Manchester’s included', joined(...STORES.map((_, i) => `Summary!D${i + 2}`)), values(...STORES.map((s) => target(s.id)))],
    ['curveball', '% of target is right with the new target', joined(...STORES.map((_, i) => `ROUND(Summary!E${i + 2},4)`)), values(...STORES.map((s) => r4(pctFinal(s.id))))],
    ['curveball', 'The right stores are marked Missed, Manchester now among them', joined(...STORES.map((_, i) => `Summary!F${i + 2}`)), values(...STORES.map((s) => (pctFinal(s.id) < 1 ? 'Missed' : 'Met')))],
    ['juggling', 'Each duplicated order appears once', `sheet:=COUNTIF(${TILL_SHEET}!A:A,"${TILL_DUPES[0]}")+COUNTIF(${TILL_SHEET}!A:A,"${TILL_DUPES[1]}")+COUNTIF(${TILL_SHEET}!A:A,"${TILL_DUPES[2]}")`, '3'],
    ['juggling', `No order lost: ${TILL.length} remain`, `sheet:=COUNTA(${TILL_SHEET}!A:A)-1`, String(TILL.length)],
    ['juggling', 'Every region is North, South, East or West', `sheet:=COUNTIF(${TILL_SHEET}!D:D,"North")+COUNTIF(${TILL_SHEET}!D:D,"South")+COUNTIF(${TILL_SHEET}!D:D,"East")+COUNTIF(${TILL_SHEET}!D:D,"West")`, String(TILL.length)],
    ['juggling', 'Revenue adds up, by formula', `sheet:=ROUND(SUM(${TILL_SHEET}!G:G),2)&" / "&${TILL_SHEET}!G1&" / "&ISFORMULA(${TILL_SHEET}!G2)`, values(TILL_REVENUE, 'Revenue', 'TRUE')],
    ['juggling', 'The number for Tom', `mail:${TOM}`, { rubric: [`Gives March revenue as £${TILL_REVENUE.toFixed(2)} (the duplicated orders taken out once each, not £${(TILL_REVENUE + DUPE_REVENUE).toFixed(2)})`, 'Says what it covers (the sample stores’ March till export), briefly'] }],
    ['juggling', 'The decision for Lena', `mail:${LENA}`, {
      rubric: [
        'Doesn’t leave Brighton out or quietly lower its target: the board sees every store against the signed-off target',
        'Gives the reason: the board needs an accurate, complete picture, and changing targets isn’t the analyst’s call (it’s Finance’s or Hannah’s)',
        'Offers something fair instead: context on the competitor beside Brighton’s figures, or an extra view clearly labelled as such, and/or raising it with Hannah',
        'Kind and respectful of the team’s work',
      ],
    }],
    ['report', 'The workbook is attached for Hannah', `attached:${HANNAH}:q1_store_performance`, 'true'],
    ['report', 'The summary for Hannah', `mailwith:${HANNAH}:q1_store_performance`, {
      rubric: [
        `Names the stores that missed (${MISSED_FINAL.join(', ')}) with their figures against target (e.g. % of target or £ short)`,
        `Explains each: Bath closed a week for refurbishment (week 7); Brighton down since a competitor opened opposite in week 6; Manchester missed only against its target raised to ${gbp(MCR_TARGET)} in January`,
        'Flags the data issues: the targets were corrected this morning (Raj’s draft), and the till export had duplicated orders that were taken out',
        'Short and clear for a director: the headline first, the other stores met target, and a suggested next step (e.g. Brighton needs a response)',
      ],
    }],
  ],
});
