import { AssessmentTest, DataTable } from '../types';
import { workbookStarter } from '../lib/spreadsheet';
import { databaseStarter } from '../lib/databaseWork';
import { toCsv } from '../lib/csv';
import { round2, seeded, sum, tc } from './simulationKit';

/**
 * Simulations: a whole test set in one workplace. The candidate gets a brief, files, a working spreadsheet and a SQL
 * workbench, and the questions follow one story from cleaning the data to explaining it.
 *
 * Ridgeway Coffee (made up): eight cafés, a Q1 2026 that came in under plan, and data with real problems in it.
 * The data is generated from a fixed seed, so it is the same for every candidate, and every expected answer is
 * worked out from it here.
 */

// ---------- The data ----------

const STORES = [
  { store_id: 'S01', store_name: 'Leeds Briggate', region: 'North', opened: '2017-04-01', base: 210, pctOfTarget: 1.04 },
  { store_id: 'S02', store_name: 'York Minster', region: 'North', opened: '2019-09-14', base: 170, pctOfTarget: 1.02 },
  { store_id: 'S03', store_name: 'Manchester Deansgate', region: 'North', opened: '2016-03-05', base: 260, pctOfTarget: 1.03 },
  { store_id: 'S04', store_name: 'Bristol Harbourside', region: 'West', opened: '2018-06-23', base: 200, pctOfTarget: 1.06 },
  { store_id: 'S05', store_name: 'Bath Abbey', region: 'West', opened: '2020-02-01', base: 150, pctOfTarget: 0.86 },
  { store_id: 'S06', store_name: 'Brighton Lanes', region: 'South', opened: '2018-11-10', base: 190, pctOfTarget: 0.89 },
  { store_id: 'S07', store_name: 'Oxford Cornmarket', region: 'South', opened: '2015-08-29', base: 220, pctOfTarget: 1.01 },
  { store_id: 'S08', store_name: 'Cambridge Market', region: 'East', opened: '2021-05-15', base: 180, pctOfTarget: 0.97 },
];

const CATERING = new Set(['S03', 'S06', 'S07']);
const DAY_MS = 86400000;
const Q1_START = Date.UTC(2026, 0, 1);
const dateOf = (day: number) => new Date(Q1_START + day * DAY_MS).toISOString().slice(0, 10);

interface SaleRow {
  sale_date: string;
  store_id: string;
  channel: string;
  orders: number;
  revenue: number;
}

// One row per store, day and channel: what each café took through the till, the app and catering
function generateSales(): SaleRow[] {
  const rand = seeded(20260331);
  const rows: SaleRow[] = [];
  for (let day = 0; day < 90; day++) {
    const date = dateOf(day);
    const weekday = new Date(Q1_START + day * DAY_MS).getUTCDay();
    const busy = weekday === 6 ? 1.25 : weekday === 0 ? 1.1 : weekday === 1 ? 0.85 : 1;
    for (const s of STORES) {
      // Bath closed for a refit from 9 to 22 February
      if (s.store_id === 'S05' && date >= '2026-02-09' && date <= '2026-02-22') continue;
      const walkIns = Math.round(s.base * busy * (0.9 + 0.2 * rand()));
      rows.push({ sale_date: date, store_id: s.store_id, channel: 'in-store', orders: walkIns, revenue: round2(walkIns * (4.6 + 0.8 * rand())) });
      const app = Math.round(walkIns * (0.12 + 0.06 * rand()));
      rows.push({ sale_date: date, store_id: s.store_id, channel: 'app', orders: app, revenue: round2(app * (5.2 + 0.8 * rand())) });
      if (CATERING.has(s.store_id)) {
        // Brighton lost its biggest office client at the end of February
        const lostClient = s.store_id === 'S06' && date >= '2026-03-01';
        const orders = lostClient ? Math.floor(2 * rand()) : 2 + Math.floor(5 * rand());
        const value = 38 + 20 * rand();
        if (orders > 0) rows.push({ sale_date: date, store_id: s.store_id, channel: 'catering', orders, revenue: round2(orders * value) });
      }
    }
  }
  return rows;
}

const CLEAN_SALES = generateSales();

// The same data as the POS sync left it: retried syncs doubled some rows, a till update on 1 March started sending
// Manchester's till and app sales as "S3", and two channels were typed differently by hand
function messUp(rows: SaleRow[]): SaleRow[] {
  const rand = seeded(7);
  const out: SaleRow[] = [];
  for (const row of rows) {
    const r = { ...row };
    if (r.store_id === 'S03' && r.channel !== 'catering' && r.sale_date >= '2026-03-01') r.store_id = 'S3';
    if (r.store_id === 'S07' && r.channel === 'in-store' && r.sale_date.startsWith('2026-02')) r.channel = 'In-Store ';
    if (r.store_id === 'S02' && r.channel === 'app' && r.sale_date.startsWith('2026-01')) r.channel = 'App';
    out.push(r);
    if (rand() < 0.022) out.push({ ...r });
  }
  return out;
}

const RAW_SALES = messUp(CLEAN_SALES);

const revenueOf = (rows: SaleRow[], storeId: string) => sum(rows.filter((r) => r.store_id === storeId).map((r) => r.revenue));

// Finance set each target so the clean Q1 result lands at the share of target in STORES
const TARGETS = Object.fromEntries(STORES.map((s) => [s.store_id, Math.round(revenueOf(CLEAN_SALES, s.store_id) / s.pctOfTarget / 100) * 100]));
const TARGETS_CSV = toCsv([['store_id', 'store_name', 'region', 'q1_target'], ...STORES.map((s) => [s.store_id, s.store_name, s.region, TARGETS[s.store_id]])]);

// How far behind Manchester looked before the clean-up
const MANCHESTER_RAW_PCT = Math.round((revenueOf(RAW_SALES, 'S03') / TARGETS.S03) * 100);

const storesTable: DataTable = {
  name: 'stores',
  columns: ['store_id', 'store_name', 'region', 'opened'],
  rows: STORES.map(({ store_id, store_name, region, opened }) => ({ store_id, store_name, region, opened })),
};
const salesTable = (rows: SaleRow[]): DataTable => ({
  name: 'daily_sales',
  columns: ['sale_date', 'store_id', 'channel', 'orders', 'revenue'],
  rows: rows.map((r) => ({ ...r })),
});

// ---------- The spreadsheets ----------

// A week of the till export, as it came out of the POS system
const ORDERS_HEADER = ['Order ID', 'Date', 'Store', 'Region', 'Product', 'Qty', 'Unit Price'];
const ORDERS: (string | number)[][] = [
  ['R-1001', '2026-03-02', 'Leeds Briggate', 'North', 'Flat White', 2, 3.4],
  ['R-1002', '2026-03-02', 'York Minster', 'north', 'Latte', 1, 3.6],
  ['R-1003', '2026-03-02', 'Bristol Harbourside', 'West', 'Croissant', 3, 2.75],
  ['R-1004', '2026-03-02', 'Brighton Lanes', ' South', 'Americano', 2, 2.9],
  ['R-1005', '2026-03-03', 'Cambridge Market', 'East', 'Cold Brew', 1, 3.8],
  ['R-1006', '2026-03-03', 'Bath Abbey', 'WEST', 'Banana Bread', 2, 3.1],
  ['R-1007', '2026-03-03', 'Leeds Briggate', 'North', 'Cappuccino', 4, 3.5],
  ['R-1007', '2026-03-03', 'Leeds Briggate', 'North', 'Cappuccino', 4, 3.5],
  ['R-1008', '2026-03-03', 'Oxford Cornmarket', 'South ', 'Chai Latte', 1, 3.7],
  ['R-1009', '2026-03-04', 'Manchester Deansgate', 'North', 'Flat White', 3, 3.4],
  ['R-1010', '2026-03-04', 'Cambridge Market', 'east', 'Latte', 2, 3.6],
  ['R-1011', '2026-03-04', 'Bristol Harbourside', 'West', 'Americano', 1, 2.9],
  ['R-1012', '2026-03-04', 'Brighton Lanes', 'South', 'Croissant', 2, 2.75],
  ['R-1012', '2026-03-04', 'Brighton Lanes', 'South', 'Croissant', 2, 2.75],
  ['R-1013', '2026-03-05', 'York Minster', 'North', 'Cold Brew', 2, 3.8],
  ['R-1014', '2026-03-05', 'Bath Abbey', 'West', 'Flat White', 1, 3.4],
  ['R-1015', '2026-03-05', 'Oxford Cornmarket', 'South', 'Banana Bread', 3, 3.1],
  ['R-1016', '2026-03-05', 'Manchester Deansgate', ' North ', 'Latte', 2, 3.6],
  ['R-1017', '2026-03-06', 'Cambridge Market', 'East', 'Cappuccino', 1, 3.5],
  ['R-1018', '2026-03-06', 'Leeds Briggate', 'Nrth', 'Americano', 2, 2.9],
  ['R-1019', '2026-03-06', 'Bristol Harbourside', 'west', 'Chai Latte', 2, 3.7],
  ['R-1020', '2026-03-06', 'Brighton Lanes', 'South', 'Cold Brew', 1, 3.8],
  ['R-1021', '2026-03-07', 'Oxford Cornmarket', 'South', 'Flat White', 2, 3.4],
  ['R-1022', '2026-03-07', 'Manchester Deansgate', 'North', 'Americano', 3, 2.9],
  ['R-1022', '2026-03-07', 'Manchester Deansgate', 'North', 'Americano', 3, 2.9],
  ['R-1023', '2026-03-07', 'Bath Abbey', 'West', 'Latte', 1, 3.6],
  ['R-1024', '2026-03-07', 'Cambridge Market', 'EAST', 'Croissant', 4, 2.75],
  ['R-1025', '2026-03-07', 'York Minster', 'North', 'Banana Bread', 1, 3.1],
];
const UNIQUE_ORDERS = ORDERS.filter((row, i) => ORDERS.findIndex((r) => r[0] === row[0]) === i);
const ORDERS_REVENUE = round2(sum(UNIQUE_ORDERS.map((r) => (r[5] as number) * (r[6] as number))));

// Q1 takings by store and week, all channels, from the clean data
const WEEKLY = STORES.flatMap((s) =>
  Array.from({ length: 13 }, (_, week) => {
    const from = dateOf(week * 7);
    const to = dateOf(week * 7 + 6);
    const revenue = round2(sum(CLEAN_SALES.filter((r) => r.store_id === s.store_id && r.sale_date >= from && r.sale_date <= to).map((r) => r.revenue)));
    return { week: from, ...s, revenue };
  })
)
  .filter((w) => w.revenue > 0)
  .sort((a, b) => a.week.localeCompare(b.week) || a.store_id.localeCompare(b.store_id));
const weeklyRevenue = (storeId: string) => round2(sum(WEEKLY.filter((w) => w.store_id === storeId).map((w) => w.revenue)));
const WEEKLY_TOTAL = round2(sum(WEEKLY.map((w) => w.revenue)));
const TARGET_TOTAL = sum(Object.values(TARGETS));

// ---------- The database tasks' answers ----------

const CLEANING_SOLUTION = `DELETE FROM daily_sales WHERE rowid NOT IN (SELECT MIN(rowid) FROM daily_sales GROUP BY sale_date, store_id, channel);
UPDATE daily_sales SET store_id = 'S03' WHERE store_id = 'S3';
UPDATE daily_sales SET channel = LOWER(TRIM(channel));`;

const TARGETS_TABLE_SQL = `CREATE TABLE targets (store_id TEXT, store_name TEXT, region TEXT, q1_target INTEGER);
INSERT INTO targets VALUES ${STORES.map((s) => `('${s.store_id}', '${s.store_name}', '${s.region}', ${TARGETS[s.store_id]})`).join(', ')};`;

const PERFORMANCE_SOLUTION = `${TARGETS_TABLE_SQL}
CREATE VIEW store_performance AS
SELECT s.store_id, s.store_name, s.region,
  ROUND(SUM(d.revenue), 2) AS revenue,
  t.q1_target AS target,
  ROUND(100.0 * SUM(d.revenue) / t.q1_target, 1) AS pct_of_target
FROM stores s
JOIN daily_sales d ON d.store_id = s.store_id
JOIN targets t ON t.store_id = s.store_id
GROUP BY s.store_id, s.store_name, s.region, t.q1_target;`;

const BRIGHTON_SOLUTION = `CREATE VIEW s06_by_channel AS
SELECT strftime('%Y-%m', sale_date) AS month, channel, ROUND(SUM(revenue), 2) AS revenue
FROM daily_sales
WHERE store_id = 'S06'
GROUP BY month, channel;`;

// ---------- The test ----------

export const SIMULATION_TESTS: AssessmentTest[] = [
  {
    id: 'test-sim-da-01',
    title: 'Data Analyst Simulation: Ridgeway Coffee',
    category: 'Data Analysis',
    difficulty: 'Professional',
    type: 'standard',
    description:
      "A morning as a data analyst at a coffee chain that missed its plan. Clean a messy till export and build a target report in a working spreadsheet, fix and query the sales database in a SQL workbench, import Finance's targets file, then explain what really happened.",
    estimatedMinutes: 75,
    passingScore: 70,
    totalQuestions: 14,
    skillsTested: ['Excel', 'SQL', 'Data Cleaning', 'Critical Thinking', 'Statistics'],
    roles: ['Data Analyst', 'Business Analyst'],
    scenario: {
      company: 'Ridgeway Coffee',
      role: 'Data Analyst',
      brief: `You've just joined Ridgeway Coffee, a chain of eight cafés across England, as its data analyst.

Q1 2026 (January to March) came in below plan. Hannah Okafor, the Operations Director, has a board meeting on Friday and needs to know which stores missed their target, by how much, and why.

You have:
• A spreadsheet export from the tills (POS system), which nobody has checked
• The sales database, fed every night by the tills and the ordering app
• store_targets.csv, Finance's Q1 target for each store

Hannah's note: "I don't just want numbers. Tell me if anything looks off before I put it in front of the board."`,
      files: [{ name: 'store_targets.csv', content: TARGETS_CSV }],
    },
    questions: [
      // ----- Core knowledge -----
      {
        id: 'q-sim-1',
        title: 'The Typical Catering Order',
        type: 'choice',
        prompt: `Ridgeway's mean catering order is £62. Most catering orders are between £30 and £50, but a handful of office orders each quarter are over £400.

Hannah asks for "the typical catering order value" for a pricing slide. What should you report?`,
        options: [
          'The mean, £62, because it uses every order',
          'The median, because a few very large orders pull the mean up',
          'The largest order, so the slide shows what catering can earn',
          'The mean with the large orders deleted from the data',
        ],
        correctOption: 1,
        starterCode: '',
        testCases: [],
        timeLimitMinutes: 2,
        weight: 4,
      },
      {
        id: 'q-sim-2',
        title: 'Before You Trust the Export',
        type: 'multi',
        prompt: `Before you analyse the till export, which checks should you run? Select all that apply.`,
        options: [
          'Look for order IDs that appear more than once',
          'Check that categories such as region are spelled one way',
          'Look for blank or impossible values, such as negative quantities',
          'Confirm the dates cover the whole period you are reporting on',
          'Sort the file by revenue so the biggest orders come first',
          'Delete every row that has any blank cell',
        ],
        correctOptions: [0, 1, 2, 3],
        starterCode: '',
        testCases: [],
        timeLimitMinutes: 2,
        weight: 4,
      },
      {
        id: 'q-sim-3',
        title: 'Counting a Closed Store',
        type: 'choice',
        prompt: `Bath was closed for refurbishment for one week and took no orders. You run:

SELECT s.store_name, COUNT(*) AS orders
FROM stores s
LEFT JOIN orders o
  ON o.store_id = s.store_id AND o.week = 7
GROUP BY s.store_name;

What does the result show for Bath in week 7?`,
        options: ['0', '1', 'NULL', "Bath isn't in the result"],
        correctOption: 1,
        starterCode: '',
        testCases: [],
        timeLimitMinutes: 2,
        weight: 4,
      },
      {
        id: 'q-sim-4',
        title: 'Percentage Change',
        type: 'text',
        prompt: `A store's revenue fell from £48,000 in January to £30,000 in February.

By what percentage did it fall? Give the number, e.g. 12.5%.`,
        acceptedAnswers: ['37.5%', '37.5', '-37.5%', '37.5% decrease', '37.5 percent'],
        starterCode: '',
        testCases: [],
        timeLimitMinutes: 2,
        weight: 4,
      },

      // ----- Spreadsheet -----
      {
        id: 'q-sim-5',
        title: 'Clean the Till Export',
        type: 'sheet',
        contextData: 'pos_export_2026-03-02.xlsx',
        prompt: `The tills exported a week of orders to the Orders sheet. Before anyone uses it:

1. Remove the duplicate orders. A sync glitch exported some orders twice: the same Order ID on two identical rows. Keep one of each.
2. Make every Region read exactly North, South, East or West: no stray spaces, no typos.
3. Add a Revenue column in column H (header "Revenue" in H1) that works out Qty × Unit Price with a formula on every order row.

Leave the cleaned data on the Orders sheet, starting at A1, with no blank rows. Tools you might use: Remove duplicates, Find & replace, TRIM and PROPER in a helper column with Paste values, fill down (Ctrl+D or the fill handle).`,
        starterCode: workbookStarter([{ name: 'Orders', rows: [ORDERS_HEADER, ...ORDERS] }]),
        testCases: [
          tc('tc-sim-5-1', 'Each duplicated order appears only once', '=COUNTIF(Orders!A:A,"R-1007")+COUNTIF(Orders!A:A,"R-1012")+COUNTIF(Orders!A:A,"R-1022")', '3'),
          tc('tc-sim-5-2', `No real orders lost: ${UNIQUE_ORDERS.length} orders remain`, '=COUNTA(Orders!A:A)', String(UNIQUE_ORDERS.length + 1)),
          tc(
            'tc-sim-5-3',
            'Every region is exactly North, South, East or West',
            '=COUNTIF(Orders!D:D,"North")+COUNTIF(Orders!D:D,"South")+COUNTIF(Orders!D:D,"East")+COUNTIF(Orders!D:D,"West")',
            String(UNIQUE_ORDERS.length)
          ),
          tc('tc-sim-5-4', 'Column H is headed Revenue', '=Orders!H1', 'Revenue'),
          tc('tc-sim-5-5', 'Revenue is a formula on the first and last order rows', `=AND(ISFORMULA(Orders!H2),ISFORMULA(Orders!H${UNIQUE_ORDERS.length + 1}))`, 'TRUE'),
          tc('tc-sim-5-6', 'Revenue adds up to the right total', '=SUM(Orders!H:H)', String(ORDERS_REVENUE)),
        ],
        timeLimitMinutes: 10,
        weight: 14,
      },
      {
        id: 'q-sim-6',
        title: 'Stores Against Target',
        type: 'sheet',
        contextData: 'q1_store_performance.xlsx',
        prompt: `The Sales sheet has every store's takings by week for Q1. Finance's targets are in store_targets.csv.

1. Import store_targets.csv (Import CSV → Files shared with you). It arrives as a new sheet.
2. Fill in the Summary sheet for each store in A2:A9:
   • B, Revenue: the store's total Q1 revenue from the Sales sheet, by formula (e.g. SUMIF)
   • C, Target: looked up from the imported targets by formula (e.g. VLOOKUP or XLOOKUP), not typed in
   • D, Variance: Revenue − Target (negative when a store missed)
   • E, % of Target: Revenue ÷ Target as a fraction (0.95 is 95%; use the % button to show it). Don't round it.`,
        starterCode: workbookStarter([
          { name: 'Sales', rows: [['Week Starting', 'Store ID', 'Store', 'Region', 'Revenue'], ...WEEKLY.map((w) => [w.week, w.store_id, w.store_name, w.region, w.revenue])] },
          { name: 'Summary', rows: [['Store ID', 'Revenue', 'Target', 'Variance', '% of Target'], ...STORES.map((s) => [s.store_id])] },
        ]),
        testCases: [
          tc('tc-sim-6-1', "Bristol's (S04) revenue is right", '=VLOOKUP("S04",Summary!A2:E9,2,FALSE)', String(weeklyRevenue('S04'))),
          tc('tc-sim-6-2', 'Revenue across all eight stores adds up', '=SUM(Summary!B2:B9)', String(WEEKLY_TOTAL)),
          tc('tc-sim-6-3', 'Targets match the targets file', '=SUM(Summary!C2:C9)', String(TARGET_TOTAL)),
          tc(
            'tc-sim-6-4',
            'Revenue and target are worked out by formulas, not typed in',
            '=AND(ISFORMULA(Summary!B2),ISFORMULA(Summary!B9),ISFORMULA(Summary!C2),ISFORMULA(Summary!C9))',
            'TRUE'
          ),
          tc('tc-sim-6-5', "Bath's (S05) variance is right", '=VLOOKUP("S05",Summary!A2:E9,4,FALSE)', String(round2(weeklyRevenue('S05') - TARGETS.S05))),
          tc(
            'tc-sim-6-6',
            "Brighton's (S06) % of target is right",
            '=VLOOKUP("S06",Summary!A2:E9,5,FALSE)',
            `${weeklyRevenue('S06') / TARGETS.S06}|${(weeklyRevenue('S06') / TARGETS.S06) * 100}`
          ),
        ],
        timeLimitMinutes: 12,
        weight: 16,
      },

      // ----- Database -----
      {
        id: 'q-sim-7',
        title: 'Fix the Sales Database',
        type: 'database',
        contextData: 'RidgewayRetail',
        prompt: `daily_sales should have one row per store, day and channel. The nightly feed has gone wrong in places. Investigate it, then fix the data in place:

1. Some rows were loaded twice by a retried sync. Remove the extra copies, keeping one of each.
2. Some sales are recorded under a store ID that isn't in the stores table. Work out which store they belong to and move them there. Don't delete them.
3. Channels should only ever be in-store, app or catering. Fix any that are spelled differently.

Your changes are kept as you run them. Reset database undoes them all if you want to start again. This database runs SQLite: every table has a hidden rowid column, which helps tell identical rows apart.`,
        tables: [storesTable, salesTable(RAW_SALES)],
        starterCode: databaseStarter(`-- RidgewayRetail: stores and daily_sales
-- Explore first, then fix daily_sales in place.

SELECT *
FROM daily_sales
LIMIT 20;
`),
        solutionCode: CLEANING_SOLUTION,
        testCases: [
          tc('tc-sim-7-1', 'Each store, day and channel appears once', 'SELECT COUNT(*) FROM (SELECT 1 FROM daily_sales GROUP BY sale_date, store_id, channel HAVING COUNT(*) > 1)'),
          tc('tc-sim-7-2', 'No sales left under a store ID missing from stores', 'SELECT COUNT(*) FROM daily_sales WHERE store_id NOT IN (SELECT store_id FROM stores)'),
          tc('tc-sim-7-3', "Manchester's (S03) mislabelled sales are kept and moved back to S03", "SELECT ROUND(SUM(revenue), 2) FROM daily_sales WHERE store_id = 'S03'"),
          tc('tc-sim-7-4', 'Channels are spelled in-store, app or catering', 'SELECT channel, COUNT(*) FROM daily_sales GROUP BY channel ORDER BY channel'),
          tc('tc-sim-7-5', 'Nothing else was lost: the right number of rows remain', 'SELECT COUNT(*) FROM daily_sales'),
        ],
        timeLimitMinutes: 12,
        weight: 14,
      },
      {
        id: 'q-sim-8',
        title: 'Build the Store Performance View',
        type: 'database',
        contextData: 'RidgewayRetail',
        prompt: `The data is clean now. Hannah wants a view she can query any time.

1. Import store_targets.csv as a new table named targets (Import flat file).
2. Create a view named store_performance with one row per store and these columns:
   store_id, store_name, region, revenue (total Q1 revenue), target (the store's q1_target), pct_of_target (revenue as a % of target, e.g. 95.3, rounded to 1 decimal place)`,
        tables: [storesTable, salesTable(CLEAN_SALES)],
        starterCode: databaseStarter(`-- 1. Import flat file → store_targets.csv → table name: targets
-- 2. Then:

CREATE VIEW store_performance AS
SELECT
`),
        solutionCode: PERFORMANCE_SOLUTION,
        testCases: [
          tc('tc-sim-8-1', 'targets holds all eight stores from store_targets.csv', 'SELECT COUNT(*), SUM(q1_target) FROM targets'),
          tc('tc-sim-8-2', 'store_performance has each store with its name and region', 'SELECT store_id, store_name, region FROM store_performance ORDER BY store_id'),
          tc('tc-sim-8-3', "Each store's Q1 revenue is right", 'SELECT store_id, revenue FROM store_performance ORDER BY store_id'),
          tc('tc-sim-8-4', "Each store's target is right", 'SELECT store_id, target FROM store_performance ORDER BY store_id'),
          tc('tc-sim-8-5', '% of target is right, to 1 decimal place', 'SELECT store_id, pct_of_target FROM store_performance ORDER BY store_id'),
        ],
        timeLimitMinutes: 12,
        weight: 14,
      },
      {
        id: 'q-sim-9',
        title: "Where Brighton's Sales Went",
        type: 'database',
        contextData: 'RidgewayRetail',
        prompt: `Brighton (S06) missed its target. To see where, create a view named s06_by_channel with Brighton's revenue for each month and channel.

Columns: month (as "YYYY-MM", e.g. 2026-01), channel, revenue (rounded to 2 decimal places).

Look at what it shows: you'll need it for a later question.`,
        tables: [storesTable, salesTable(CLEAN_SALES)],
        starterCode: databaseStarter(`-- Tip: strftime('%Y-%m', sale_date) gives the month

CREATE VIEW s06_by_channel AS
SELECT
`),
        solutionCode: BRIGHTON_SOLUTION,
        testCases: [
          tc('tc-sim-9-1', 'January by channel is right', "SELECT month, channel, revenue FROM s06_by_channel WHERE month = '2026-01' ORDER BY channel"),
          tc('tc-sim-9-2', 'February by channel is right', "SELECT month, channel, revenue FROM s06_by_channel WHERE month = '2026-02' ORDER BY channel"),
          tc('tc-sim-9-3', 'March by channel is right', "SELECT month, channel, revenue FROM s06_by_channel WHERE month = '2026-03' ORDER BY channel"),
        ],
        timeLimitMinutes: 6,
        weight: 6,
      },

      // ----- Critical thinking -----
      {
        id: 'q-sim-10',
        title: 'Why Bath Missed',
        type: 'choice',
        prompt: `Bath (S05) finished well below target. Using the sales database or the Sales sheet, what best explains it?`,
        options: [
          'Its app orders were recorded under the wrong store ID',
          'It took no sales for two weeks in February, consistent with the store being closed',
          'It lost a large catering client in March',
          'Its sales fell steadily week after week through the quarter',
        ],
        correctOption: 1,
        starterCode: '',
        testCases: [],
        timeLimitMinutes: 3,
        weight: 4,
      },
      {
        id: 'q-sim-11',
        title: 'Why Brighton Missed',
        type: 'choice',
        prompt: `From your s06_by_channel view, which explanation for Brighton's miss do the numbers support best?`,
        options: [
          'Fewer people came into the café: in-store revenue fell across the quarter',
          'Catering revenue collapsed in March while in-store and app held steady',
          'The app stopped recording orders in February',
          'All three channels fell by about the same share',
        ],
        correctOption: 1,
        starterCode: '',
        testCases: [],
        timeLimitMinutes: 3,
        weight: 4,
      },
      {
        id: 'q-sim-12',
        title: 'The Manchester Problem',
        type: 'multi',
        prompt: `On the raw database, before your clean-up, Manchester (S03) came to only about ${MANCHESTER_RAW_PCT}% of its target. After you moved the "S3" sales back, it beat its target.

Hannah has already told the CEO that Manchester is struggling. What should you do? Select all that apply.`,
        options: [
          'Report Manchester on the corrected figures, and say in the board pack that the raw data under-counted it',
          'Tell whoever runs the till system that Manchester\'s sales are arriving as "S3", so it is fixed at the source',
          'Check whether other stores are affected by the same ID problem',
          'Report the raw figure, because it is what the system of record says',
          'Leave Manchester out of the report until the feed is fixed',
        ],
        correctOptions: [0, 1, 2],
        starterCode: '',
        testCases: [],
        timeLimitMinutes: 3,
        weight: 5,
      },
      {
        id: 'q-sim-13',
        title: 'Investigating a Miss',
        type: 'order',
        prompt: `Put these steps for investigating why sales missed plan in the order you would do them.`,
        items: [
          'Check the numbers are right: look for missing, doubled or mislabelled data',
          'Break the miss down by store, channel and week to find where it sits',
          'Come up with explanations for the biggest gaps and test each against the data',
          'Check what you found with the people who run the stores',
          'Put a £ figure on each cause and recommend what to do',
        ],
        starterCode: '',
        testCases: [],
        timeLimitMinutes: 2,
        weight: 4,
      },
      {
        id: 'q-sim-14',
        title: 'Did the Loyalty App Work?',
        type: 'choice',
        prompt: `In February, Ridgeway trialled a loyalty app in the four stores whose managers volunteered. Those stores' sales grew 9% from January to February; the other four grew 2%.

The Marketing Director wants to tell the board "the loyalty app adds 7 points of growth" and roll it out everywhere. What is the strongest objection?`,
        options: [
          "February has fewer days than January, so the growth figures aren't comparable",
          'The trial stores were not picked at random: stores whose managers volunteered may have been growing anyway, so the gap cannot be credited to the app',
          'Loyalty apps always reduce margin, so growth does not matter',
          'Four stores is too few to calculate a percentage',
        ],
        correctOption: 1,
        starterCode: '',
        testCases: [],
        timeLimitMinutes: 3,
        weight: 3,
      },
    ],
  },
];
