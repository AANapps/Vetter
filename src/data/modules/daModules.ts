import { AssessmentTest, DataTable, Question, TestScenario } from '../../types';
import { workbookStarter } from '../../lib/spreadsheet';
import { databaseStarter } from '../../lib/databaseWork';
import { parseCsv, toCsv } from '../../lib/csv';
import { EXCEL_SETS, SQL_SETS, PYTHON_SETS, CLEANING_SETS, REPORTING_SETS, METRICS_SETS, IMPORTING_SETS, POWERBI_SETS, TABLEAU_SETS } from './daSets';
import { simTask } from './simKit';
import { powerBiApp } from './powerbiApp';
import { tableauApp } from './tableauApp';
import { round2, seeded, sum, tc } from '../simulationKit';

/**
 * The Data Analyst modules: one Mid-level test per tool or skill, about 20 minutes. Every question is about the
 * module's own tool or skill. First two question sets (daSets.ts: a piece of the tool in use with four questions of
 * different kinds about it), then two practical tasks, each one workbook, database, data file or app with four numbered
 * questions in it (Q1 to Q4), each question marked on its own checks.
 * The data is generated from fixed seeds, so it's the same for every candidate, and every expected answer is worked out
 * here.
 */

const DA = ['Data Analyst'] as AssessmentTest['roles'];
const TASK_WEIGHT = 30;
const TASK_MINUTES = 5;

// A task's checks, by question: each Q's checks are named after it, so the result shows how each question went
type Checks = [question: number, description: string, check: string, expected?: string][];
const named = (id: string, checks: Checks) => checks.map(([n, d, c, e], i) => tc(`tc-${id}-${i + 1}`, `Q${n} · ${d}`, c, e ?? ''));

const sheetTask = (id: string, title: string, file: string, prompt: string, sheets: { name: string; rows: (string | number | null)[][] }[], checks: Checks): Question => ({
  id,
  title,
  type: 'sheet',
  contextData: file,
  prompt,
  starterCode: workbookStarter(sheets),
  testCases: named(id, checks),
  timeLimitMinutes: TASK_MINUTES,
  weight: TASK_WEIGHT,
});

// A database task: the candidate creates views; each check reads one, compared with the same view built by the solution
const dbTask = (id: string, title: string, database: string, prompt: string, tables: DataTable[], starter: string, solution: string, checks: Checks): Question => ({
  id,
  title,
  type: 'database',
  contextData: database,
  prompt,
  tables,
  starterCode: databaseStarter(starter),
  solutionCode: solution,
  testCases: named(id, checks),
  timeLimitMinutes: TASK_MINUTES,
  weight: TASK_WEIGHT,
});

// A Python task: one program answers all four questions. Its input is the question (q1 to q4) on the first line, then
// the data as CSV, and what it prints for that question is compared with the expected output. Each question runs on two
// files, so the answer has to be worked out, not typed in. The expected output is hidden: printing it is the task
const pyStarter = (questions: string[]) => `import sys
import pandas as pd

question = sys.stdin.readline().strip()  # q1, q2, q3 or q4
df = pd.read_csv(sys.stdin)

${questions.map((q, i) => `${i ? 'elif' : 'if'} question == 'q${i + 1}':\n    # Q${i + 1}: ${q}\n    pass`).join('\n')}
`;
const pyTask = (
  id: string,
  title: string,
  prompt: string,
  questions: string[],
  files: [name: string, csv: string][],
  expected: ((csv: string) => string)[],
  solution: string
): Question => ({
  id,
  title,
  type: 'code',
  language: 'python',
  prompt,
  starterCode: pyStarter(questions),
  solutionCode: solution,
  testCases: questions.flatMap((_, q) =>
    files.map(([name, csv], f) => ({ id: `tc-${id}-${q + 1}-${f + 1}`, description: `Q${q + 1} · ${name}`, input: `q${q + 1}\n${csv}`, expectedOutput: expected[q](csv), isHidden: true }))
  ),
  timeLimitMinutes: TASK_MINUTES,
  weight: TASK_WEIGHT,
});


// The question sets come first, the practical tasks last
const moduleTest = (id: string, title: string, description: string, skillsTested: string[], scenario: TestScenario, practical: Question[], sets: Question[]): AssessmentTest => {
  // Marks scaled to 100, the heaviest question taking any rounding difference
  const raw = [...sets, ...practical];
  const total = raw.reduce((n, q) => n + q.weight, 0) || 1;
  const questions = raw.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) }));
  const drift = 100 - questions.reduce((n, q) => n + q.weight, 0);
  if (drift) {
    const top = questions.reduce((a, b) => (b.weight > a.weight ? b : a));
    top.weight += drift;
  }
  return {
    id,
    title,
    description,
    skillsTested,
    roles: DA,
    type: 'standard',
    category: 'Data Analysis',
    difficulty: 'Professional',
    passingScore: 70,
    scenario,
    questions,
    totalQuestions: questions.filter((q) => q.type !== 'case').length,
    estimatedMinutes: 20,
  };
};

const money = (n: number) => n.toFixed(2);
const pick = <T,>(rand: () => number, xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const REGIONS = ['North', 'South', 'East', 'West'] as const;
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const titleCase = (s: string) => s.trim().toLowerCase().replace(/(^|[^a-zà-ÿ’'])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase());
// Several cells read as one check: "a / b / c" (a | would mean "either answer" to the marker)
const joined = (...cells: string[]) => '=' + cells.join('&" / "&');
const values = (...vs: (string | number)[]) => vs.join(' / ');
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};


// =====================================================================================================
// Excel
// =====================================================================================================

const XL_PRODUCTS = [
  ['LO-401', 'Rain Shell Jacket', 140],
  ['LO-101', 'Trail Tent 2P', 159],
  ['LO-502', 'Titanium Mug', 22],
  ['LO-201', 'Down Sleeping Bag', 119],
  ['LO-302', 'Trail Runners', 99],
  ['LO-102', 'Ridge Tent 4P', 249],
  ['LO-501', 'Camp Stove', 45],
  ['LO-402', 'Fleece Midlayer', 55],
] as const;
const XL_ORDERS = (() => {
  const rand = seeded(5150);
  const rows = Array.from({ length: 20 }, (_, i) => ({
    id: `LF-${7001 + i}`,
    sku: pick(rand, XL_PRODUCTS)[0] as string,
    qty: 1 + Math.floor(rand() * 3),
    region: pick(rand, REGIONS) as string,
    channel: rand() < 0.55 ? 'Web' : 'Store',
  }));
  rows[8] = { ...rows[8], sku: 'LO-999' };
  return rows;
})();
// The till exported two orders twice
const XL_DUPES = ['LF-7004', 'LF-7015'];
const XL_EXPORT = XL_ORDERS.flatMap((o) => (XL_DUPES.includes(o.id) ? [o, o] : [o]));
const xlPrice = (sku: string) => XL_PRODUCTS.find((p) => p[0] === sku)?.[2] ?? 0;
const xlLine = (o: (typeof XL_ORDERS)[number]) => o.qty * xlPrice(o.sku);
const xlIn = (r: string) => XL_ORDERS.filter((o) => o.region === r);
const xlWeb = (r: string) => sum(xlIn(r).filter((o) => o.channel === 'Web').map(xlLine));
const xlBig = (r: string) => xlIn(r).filter((o) => xlLine(o) > 100).length;
const xlAvg = (r: string) => round2(sum(xlIn(r).map(xlLine)) / xlIn(r).length);
const XL_LAST = XL_ORDERS.length + 1;

const XL_REPS = (() => {
  const rand = seeded(5152);
  const names = [['  asha', 'PATEL'], ['BEN ', 'cole'], ['chloe', ' wu '], [' Dan', 'REID'], ['ella', 'shaw  '], ['FINN', ' moss'], ['gita ', 'Rao'], ['harry', 'LIM'], [' Isla ', 'kerr'], ['jack', 'BYRNE ']];
  return names.map(([first, last]) => ({ first, last, region: pick(rand, REGIONS) as string, sales: Math.round(18000 + rand() * 24000), target: 30000 }));
})();
const XL_REP_SALES = sum(XL_REPS.map((r) => r.sales));
const repName = (r: (typeof XL_REPS)[number]) => `${titleCase(r.first)} ${titleCase(r.last)}`;
const repCode = (r: (typeof XL_REPS)[number]) => `${r.region.slice(0, 3).toUpperCase()}-${r.last.trim().toUpperCase()}`;
const repTier = (r: (typeof XL_REPS)[number]) => (r.sales >= r.target && r.sales >= 35000 ? 'Gold' : r.sales >= r.target ? 'Silver' : 'Bronze');
const XL_TOP = [...XL_REPS].sort((a, b) => b.sales - a.sales);
const quartile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * (q / 4);
  const lo = Math.floor(pos);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo);
};
const XL_SALES_LIST = XL_REPS.map((r) => r.sales);

const EXCEL_TEST = moduleTest(
  'test-da-excel',
  'Excel',
  'Two question sets (getting data ready: Power Query, data validation, Flash Fill, dynamic arrays; showing and automating: conditional formatting, charts, shortcuts, VBA, dashboards and the data model), then two spreadsheet tasks: removing duplicates, lookups, SUMIFS, COUNTIFS and AVERAGEIF, a PivotTable; then text functions, absolute references, IFS with AND, MEDIAN and QUARTILE, and sorting.',
  ['Excel', 'XLOOKUP', 'SUMIFS', 'PivotTables', 'Text Functions', 'Power Query'],
  {
    company: 'Larkfield Outdoor',
    role: 'Data Analyst',
    brief: `Larkfield Outdoor sells camping gear online and in two shops. Colleagues send you spreadsheets to finish. Each task opens its own workbook.

Use formulas wherever a question asks for them, so the sheet still works when the data changes.`,
  },
  [
    sheetTask(
      'xl-t1',
      'The Orders Report',
      'orders_report.xlsx',
      `The Orders sheet is this week's till export; the Products sheet lists every product and its price.

Q1. The till exported some orders twice (the same Order ID on two identical rows). Remove the duplicates (Remove duplicates), keeping one of each.
Q2. Column F (Product): the product name for the order's SKU, looked up from the Products sheet with XLOOKUP (or INDEX and MATCH), showing Not found when the SKU isn't there. Fill it down to the last order.
Q3. Column G (Line Total): Qty × the product's price, or 0 when the SKU isn't found.
Q4. Summary sheet, with one formula per cell for each region: column B the Web channel's line totals (SUMIFS), column C the number of orders with a line total over £100 (COUNTIFS), column D the average line total (AVERAGEIF).
Q5. Insert a PivotTable from the Orders sheet: Rows Region, Values Sum of Line Total.`,
      [
        { name: 'Orders', rows: [['Order ID', 'SKU', 'Qty', 'Region', 'Channel', 'Product', 'Line Total'], ...XL_EXPORT.map((o) => [o.id, o.sku, o.qty, o.region, o.channel])] },
        { name: 'Products', rows: [['SKU', 'Product', 'Price'], ...XL_PRODUCTS.map((p) => [...p])] },
        { name: 'Summary', rows: [['Region', 'Web revenue', 'Orders over £100', 'Average line total'], ...REGIONS.map((r) => [r])] },
      ],
      [
        [1, 'Each repeated order appears once', `=COUNTIF(Orders!A:A,"${XL_DUPES[0]}")+COUNTIF(Orders!A:A,"${XL_DUPES[1]}")`, '2'],
        [1, `No order lost: ${XL_ORDERS.length} remain`, '=COUNTA(Orders!A:A)-1', String(XL_ORDERS.length)],
        [2, 'Product names are looked up', joined('Orders!F2', `Orders!F${XL_LAST}`), values(XL_PRODUCTS.find((p) => p[0] === XL_ORDERS[0].sku)![1], XL_PRODUCTS.find((p) => p[0] === XL_ORDERS[19].sku)![1])],
        [2, 'The unknown SKU shows Not found', `=COUNTIF(Orders!F:F,"Not found")&" / "&ISFORMULA(Orders!F${XL_LAST})`, values(1, 'TRUE')],
        [3, 'Line totals are right, by formula', `=SUM(Orders!G2:G40)&" / "&ISFORMULA(Orders!G${XL_LAST})`, values(sum(XL_ORDERS.map(xlLine)), 'TRUE')],
        [4, 'Web revenue by region (SUMIFS)', joined('Summary!B2', 'Summary!B3', 'Summary!B4', 'Summary!B5'), values(...REGIONS.map(xlWeb))],
        [4, 'Orders over £100 by region (COUNTIFS)', joined('Summary!C2', 'Summary!C3', 'Summary!C4', 'Summary!C5'), values(...REGIONS.map(xlBig))],
        [4, 'Average line total by region (AVERAGEIF)', joined(...REGIONS.map((_, i) => `ROUND(Summary!D${i + 2},2)`)), values(...REGIONS.map(xlAvg))],
        [4, 'The summary is worked out by formula', '=AND(ISFORMULA(Summary!B5),ISFORMULA(Summary!C5),ISFORMULA(Summary!D5))', 'TRUE'],
        [5, 'The PivotTable totals each region', joined(...REGIONS.map((r) => `ROUND(VLOOKUP("${r}",Pivot!A:B,2,FALSE),2)`)), values(...REGIONS.map((r) => round2(sum(xlIn(r).map(xlLine)))))],
      ]
    ),
    sheetTask(
      'xl-t2',
      'Reps and Commission',
      'q1_reps.xlsx',
      `The Reps sheet has each sales rep's name (typed in by hand), region, Q1 sales and target. The Settings sheet holds the commission rate (B1). Use formulas for every rep (rows 2 to 11).

Q1. Column F (Rep): first and last name with no extra spaces, each capitalised (e.g. Asha Patel).
Q2. Column G (Code): the first three letters of the region in capitals, a hyphen, then the last name in capitals with no spaces (e.g. NOR-PATEL).
Q3. Column H (Commission): Sales × the rate on the Settings sheet, as one formula filled down that keeps pointing at Settings!B1. Then Finance raises the rate: change Settings!B1 to 6%, and total all commission in Settings!B2.
Q4. Column I (Tier), with IFS: Gold when sales are at or above target and at least 35,000; Silver when at or above target; Bronze otherwise.
Q5. Settings sheet: B4 the median sales, and B5 the upper quartile of sales (QUARTILE).
Q6. Sort the reps by Sales, highest first (Sort Z–A on the Sales column), keeping every rep's row together.`,
      [
        { name: 'Reps', rows: [['First', 'Last', 'Region', 'Sales', 'Target', 'Rep', 'Code', 'Commission', 'Tier'], ...XL_REPS.map((r) => [r.first, r.last, r.region, r.sales, r.target])] },
        { name: 'Settings', rows: [['Commission rate', 0.05], ['Total commission'], [], ['Median sales'], ['Upper quartile sales']] },
      ],
      [
        [1, 'Names are trimmed and capitalised', `=COUNTIF(Reps!F:F,"${repName(XL_REPS[0])}")+COUNTIF(Reps!F:F,"${repName(XL_REPS[4])}")+COUNTIF(Reps!F:F,"${repName(XL_REPS[9])}")&" / "&ISFORMULA(Reps!F11)`, values(3, 'TRUE')],
        [2, 'Codes are right', `=COUNTIF(Reps!G:G,"${repCode(XL_REPS[0])}")+COUNTIF(Reps!G:G,"${repCode(XL_REPS[5])}")+COUNTIF(Reps!G:G,"${repCode(XL_REPS[9])}")&" / "&ISFORMULA(Reps!G11)`, values(3, 'TRUE')],
        [3, 'The rate is 6% and every commission follows it', '=ROUND(SUM(Reps!H2:H11),2)&" / "&ROUND(Settings!B2,2)', values(round2(XL_REP_SALES * 0.06), round2(XL_REP_SALES * 0.06))],
        [3, 'Commission and the total are formulas', '=AND(ISFORMULA(Reps!H11),ISFORMULA(Settings!B2))', 'TRUE'],
        [4, 'Tiers are right', joined('COUNTIF(Reps!I:I,"Gold")', 'COUNTIF(Reps!I:I,"Silver")', 'COUNTIF(Reps!I:I,"Bronze")', 'ISFORMULA(Reps!I11)'), values(...(['Gold', 'Silver', 'Bronze'] as const).map((t) => XL_REPS.filter((r) => repTier(r) === t).length), 'TRUE')],
        [5, 'Median and upper quartile are right', joined('Settings!B4', 'Settings!B5'), values(median(XL_SALES_LIST), quartile(XL_SALES_LIST, 3))],
        [5, 'They’re formulas', '=AND(ISFORMULA(Settings!B4),ISFORMULA(Settings!B5))', 'TRUE'],
        [6, 'Sorted highest sales first', joined('Reps!D2', 'Reps!D3', 'Reps!D11'), values(XL_TOP[0].sales, XL_TOP[1].sales, XL_TOP[9].sales)],
        [6, 'Each rep kept their own row', joined('Reps!F2', 'Reps!I2'), values(repName(XL_TOP[0]), repTier(XL_TOP[0]))],
      ]
    ),
  ],

  EXCEL_SETS
);

// =====================================================================================================
// SQL
// =====================================================================================================

const SQ_CUSTOMERS = [
  ['C01', 'Aria Hughes', 'North', '2025-06-14'],
  ['C02', 'Ben Fox', 'South', '2025-08-02'],
  ['C03', 'Cara Lin', 'North', '2025-09-21'],
  ['C04', 'Dev Shah', 'East', '2025-10-05'],
  ['C05', 'Eva Moss', 'West', '2025-11-11'],
  ['C06', 'Femi Ade', 'South', '2025-12-01'],
  ['C07', 'Gus Pratt', 'East', '2026-01-09'],
  ['C08', 'Hana Ito', 'West', '2026-02-17'],
  ['C09', 'Ian Roe', 'North', '2026-03-02'],
  ['C10', 'Jade Kerr', 'South', '2026-03-20'],
] as const;
const SQ_ORDERS = (() => {
  const rand = seeded(6262);
  const active = SQ_CUSTOMERS.filter(([id]) => !['C03', 'C09', 'C10'].includes(id));
  return Array.from({ length: 36 }, (_, i) => {
    const order_date = `2026-0${1 + Math.floor(i / 12)}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`;
    // Only customers who had signed up by then
    const customer_id = pick(rand, active.filter((c) => c[3] <= order_date))[0];
    const status = rand() < 0.85 ? 'delivered' : rand() < 0.5 ? 'refunded' : 'cancelled';
    return { order_id: 5001 + i, customer_id, order_date, status, amount: round2(15 + rand() * 160) };
  });
})();
const SQ_TABLES: DataTable[] = [
  { name: 'customers', columns: ['customer_id', 'name', 'region', 'signup_date'], rows: SQ_CUSTOMERS.map(([customer_id, name, region, signup_date]) => ({ customer_id, name, region, signup_date })) },
  { name: 'orders', columns: ['order_id', 'customer_id', 'order_date', 'status', 'amount'], rows: SQ_ORDERS.map((o) => ({ ...o })) },
];
const SQ_DB = 'Fernway: customers, orders';

const SQL_TEST = moduleTest(
  'test-da-sql',
  'SQL',
  'Two database tasks of four queries each (filtering, joining and grouping, finding what’s missing, window functions, dates, rates and repeat customers), then four questions on how SQL works.',
  ['SQL', 'Joins', 'Aggregation', 'Window Functions'],
  {
    company: 'Fernway',
    role: 'Data Analyst',
    brief: `Fernway sells houseplants online. Its database has two tables:

• customers: customer_id, name, region, signup_date
• orders: order_id, customer_id, order_date, status ('delivered', 'refunded' or 'cancelled'), amount

Save each answer as a view with the name given, so it can be checked. Only delivered orders count as revenue.`,
  },
  [
    dbTask(
      'sql-t1',
      'Customers and Revenue',
      SQ_DB,
      `Q1. View big_orders: every delivered order in March 2026 worth more than £100, with order_id, customer_id and amount.
Q2. View region_revenue: one row per region with delivered orders: region, orders (the number of delivered orders) and revenue (their total, rounded to 2 decimal places).
Q3. View no_orders: customer_id and name of every customer who has never placed an order of any kind.
Q4. View region_leaders: each customer's delivered revenue (customer_id, region, revenue rounded to 2 decimal places) and rank_in_region, 1 for the highest in their region.`,
      SQ_TABLES,
      '-- Q1\nCREATE VIEW big_orders AS\nSELECT\n\n-- Q2\n\n-- Q3\n\n-- Q4 (tip: RANK() OVER (PARTITION BY ... ORDER BY ...))\n',
      `CREATE VIEW big_orders AS SELECT order_id, customer_id, amount FROM orders WHERE status = 'delivered' AND order_date >= '2026-03-01' AND order_date < '2026-04-01' AND amount > 100;
CREATE VIEW region_revenue AS SELECT c.region, COUNT(*) AS orders, ROUND(SUM(o.amount), 2) AS revenue FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.region;
CREATE VIEW no_orders AS SELECT c.customer_id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL;
CREATE VIEW region_leaders AS SELECT customer_id, region, revenue, RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS rank_in_region FROM (SELECT c.customer_id, c.region, ROUND(SUM(o.amount), 2) AS revenue FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.customer_id, c.region);`,
      [
        [1, 'The right orders, with their customers and amounts', 'SELECT order_id, customer_id, amount FROM big_orders ORDER BY order_id'],
        [2, 'Order counts by region are right', 'SELECT region, orders FROM region_revenue ORDER BY region'],
        [2, 'Revenue by region is right', 'SELECT region, revenue FROM region_revenue ORDER BY region'],
        [3, 'Exactly the customers with no orders', 'SELECT customer_id, name FROM no_orders ORDER BY customer_id'],
        [4, 'Each customer’s revenue is right', 'SELECT customer_id, revenue FROM region_leaders ORDER BY customer_id'],
        [4, 'Ranks restart in each region, highest first', 'SELECT customer_id, rank_in_region FROM region_leaders ORDER BY customer_id'],
      ]
    ),
    dbTask(
      'sql-t2',
      'Months and Habits',
      SQ_DB,
      `Q1. View monthly_revenue: month (as 'YYYY-MM') and revenue (delivered, rounded to 2 decimal places), one row per month.
Q2. View refund_rate: month, orders (every order that month, any status), refunded (how many were refunded) and refund_rate (refunded ÷ orders, rounded to 3 decimal places).
Q3. View first_orders: for each customer who has ordered, customer_id, first_order (the date of their first order of any status) and days_to_first (whole days from signup_date to first_order).
Q4. View repeat_customers: customer_id and delivered_orders for customers with 3 or more delivered orders.`,
      SQ_TABLES,
      "-- Q1 (tip: strftime('%Y-%m', order_date))\nCREATE VIEW monthly_revenue AS\nSELECT\n\n-- Q2\n\n-- Q3 (tip: julianday())\n\n-- Q4\n",
      `CREATE VIEW monthly_revenue AS SELECT strftime('%Y-%m', order_date) AS month, ROUND(SUM(amount), 2) AS revenue FROM orders WHERE status = 'delivered' GROUP BY month;
CREATE VIEW refund_rate AS SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders, SUM(status = 'refunded') AS refunded, ROUND(SUM(status = 'refunded') * 1.0 / COUNT(*), 3) AS refund_rate FROM orders GROUP BY month;
CREATE VIEW first_orders AS SELECT c.customer_id, MIN(o.order_date) AS first_order, CAST(julianday(MIN(o.order_date)) - julianday(c.signup_date) AS INTEGER) AS days_to_first FROM customers c JOIN orders o ON o.customer_id = c.customer_id GROUP BY c.customer_id;
CREATE VIEW repeat_customers AS SELECT customer_id, COUNT(*) AS delivered_orders FROM orders WHERE status = 'delivered' GROUP BY customer_id HAVING COUNT(*) >= 3;`,
      [
        [1, 'Revenue by month is right', 'SELECT month, revenue FROM monthly_revenue ORDER BY month'],
        [2, 'Orders and refunds by month are right', 'SELECT month, orders, refunded FROM refund_rate ORDER BY month'],
        [2, 'Refund rate is right', 'SELECT month, refund_rate FROM refund_rate ORDER BY month'],
        [3, 'First orders are right', 'SELECT customer_id, first_order FROM first_orders ORDER BY customer_id'],
        [3, 'Days from signup are right', 'SELECT customer_id, days_to_first FROM first_orders ORDER BY customer_id'],
        [4, 'Exactly the repeat customers', 'SELECT customer_id, delivered_orders FROM repeat_customers ORDER BY customer_id'],
      ]
    ),
  ],
  SQL_SETS
);

// =====================================================================================================
// Python (pandas)
// =====================================================================================================

interface PyRow {
  order_id: number;
  date: string;
  region: string;
  status: string;
  amount: number | null;
}
const pyRows = (seed: number, n: number, messy = false): PyRow[] => {
  const rand = seeded(seed);
  const rows: PyRow[] = Array.from({ length: n }, (_, i) => ({
    order_id: 100 + i,
    date: `2026-0${1 + Math.floor(rand() * 3)}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
    region: pick(rand, REGIONS),
    status: rand() < 0.8 ? 'delivered' : 'refunded',
    amount: round2(10 + rand() * 90),
  }));
  if (messy) {
    rows[2] = { ...rows[2], region: `  ${rows[2].region.toLowerCase()} ` };
    rows[6] = { ...rows[6], region: rows[6].region.toUpperCase() };
    rows[5] = { ...rows[5], amount: null };
    rows[8] = { ...rows[8], amount: null };
    rows.push({ ...rows[1] }, { ...rows[4] }, { ...rows[5] });
  }
  return rows;
};
const pyCsv = (rows: PyRow[]) => toCsv([['order_id', 'date', 'region', 'status', 'amount'], ...rows.map((r) => [r.order_id, r.date, r.region, r.status, r.amount === null ? '' : r.amount])]);
const parsePy = (csv: string): PyRow[] =>
  parseCsv(csv)
    .slice(1)
    .filter((r) => r.length > 1)
    .map(([order_id, date, region, status, amount]) => ({ order_id: Number(order_id), date: String(date), region: String(region), status: String(status), amount: amount === '' || amount == null ? null : Number(amount) }));
const PY_A = pyCsv(pyRows(7101, 14));
const PY_B = pyCsv(pyRows(7102, 11));
const PY_MA = pyCsv(pyRows(7103, 12, true));
const PY_MB = pyCsv(pyRows(7104, 10, true));

const delivered = (rows: PyRow[]) => rows.filter((r) => r.status === 'delivered');
const amountOf = (rows: PyRow[]) => sum(rows.map((r) => r.amount ?? 0));
const byKey = (rows: PyRow[], key: (r: PyRow) => string) =>
  [...new Set(rows.map(key))]
    .sort()
    .map((k) => `${k},${money(amountOf(delivered(rows).filter((r) => key(r) === k)))}`)
    .join('\n');
const deduped = (rows: PyRow[]) => {
  const seen = new Set<number>();
  return rows.filter((r) => (seen.has(r.order_id) ? false : (seen.add(r.order_id), true))).map((r) => ({ ...r, region: titleCase(r.region) }));
};

const PYTHON_TEST = moduleTest(
  'test-da-python',
  'Python',
  'Two pandas tasks of four questions each on real data (filtering, grouping, dates and rates; removing duplicates, missing values and tidying text), then four questions on how pandas works.',
  ['Python', 'pandas', 'Data Cleaning', 'Aggregation'],
  {
    company: 'Fernway',
    role: 'Data Analyst',
    brief: `Fernway's order exports are CSV files with the columns order_id, date (YYYY-MM-DD), region, status ('delivered' or 'refunded') and amount.

In each task one program answers four questions. It's given the question (q1 to q4) on the first line, then the file; the starter code reads both and has a branch for each question. Print exactly what the question asks. Each question is run on two different files, so work the answer out from the data.`,
  },
  [
    pyTask(
      'py-t1',
      'Orders by Region and Month',
      `Q1. Print two lines: the number of delivered orders, then their total amount to 2 decimal places (e.g. 1234.50).
Q2. Print one line per region, in alphabetical order, as region,revenue: the total of its delivered orders to 2 decimal places (e.g. East,512.40). A region whose orders were all refunded shows 0.00.
Q3. Print one line per month in the file, earliest first, as YYYY-MM,revenue: that month's delivered total to 2 decimal places.
Q4. Print the percentage of orders that were refunded, to 1 decimal place (e.g. 14.3).`,
      ['delivered orders and their total', 'delivered revenue by region', 'delivered revenue by month', 'percentage of orders refunded'],
      [
        ['right on the first file', PY_A],
        ['right on the second file', PY_B],
      ],
      [
        (c) => `${delivered(parsePy(c)).length}\n${money(amountOf(delivered(parsePy(c))))}`,
        (c) => byKey(parsePy(c), (r) => r.region),
        (c) => byKey(parsePy(c), (r) => r.date.slice(0, 7)),
        (c) => {
          const rows = parsePy(c);
          return ((rows.filter((r) => r.status === 'refunded').length / rows.length) * 100).toFixed(1);
        },
      ],
      `import sys
import pandas as pd

question = sys.stdin.readline().strip()
df = pd.read_csv(sys.stdin)
df['delivered'] = df['amount'].where(df['status'] == 'delivered', 0)

if question == 'q1':
    d = df[df['status'] == 'delivered']
    print(len(d))
    print(f"{d['amount'].sum():.2f}")
elif question == 'q2':
    for region, total in df.groupby('region')['delivered'].sum().sort_index().items():
        print(f"{region},{total:.2f}")
elif question == 'q3':
    df['month'] = pd.to_datetime(df['date']).dt.strftime('%Y-%m')
    for month, total in df.groupby('month')['delivered'].sum().sort_index().items():
        print(f"{month},{total:.2f}")
elif question == 'q4':
    print(f"{(df['status'] == 'refunded').mean() * 100:.1f}")
`
    ),
    pyTask(
      'py-t2',
      'Clean the Export',
      `This export has problems: some orders appear twice (the same order_id), some regions have stray spaces or the wrong capitals, and some amounts are missing. In every question, first keep only the first copy of each order_id.

Q1. Print the number of orders left.
Q2. Print how many of them have a missing amount.
Q3. Tidy region to the form North, South, East, West, then print the distinct regions in alphabetical order separated by commas (e.g. East,North,South).
Q4. Print the total amount of delivered orders to 2 decimal places, leaving out missing amounts.`,
      ['orders left after removing duplicates', 'missing amounts', 'tidy distinct regions', 'delivered total without missing amounts'],
      [
        ['right on the first file', PY_MA],
        ['right on the second file', PY_MB],
      ],
      [
        (c) => String(deduped(parsePy(c)).length),
        (c) => String(deduped(parsePy(c)).filter((r) => r.amount === null).length),
        (c) => [...new Set(deduped(parsePy(c)).map((r) => r.region))].sort().join(','),
        (c) => money(amountOf(delivered(deduped(parsePy(c))))),
      ],
      `import sys
import pandas as pd

question = sys.stdin.readline().strip()
df = pd.read_csv(sys.stdin)
df = df.drop_duplicates(subset='order_id', keep='first')

if question == 'q1':
    print(len(df))
elif question == 'q2':
    print(df['amount'].isna().sum())
elif question == 'q3':
    df['region'] = df['region'].str.strip().str.title()
    print(','.join(sorted(df['region'].unique())))
elif question == 'q4':
    print(f"{df.loc[df['status'] == 'delivered', 'amount'].sum():.2f}")
`
    ),
  ],
  PYTHON_SETS
);

// =====================================================================================================
// Data Cleaning
// =====================================================================================================

const CL_MEMBERS = (() => {
  const rand = seeded(8181);
  const firsts = ['Ava', 'Ben', 'Cal', 'Dina', 'Eli', 'Faye', 'Gabe', 'Hope', 'Ivan', 'June', 'Kai', 'Lola', 'Max', 'Nia', 'Omar', 'Pia'];
  return firsts.map((f, i) => ({ id: `M${101 + i}`, name: `${f} ${pick(rand, ['Hill', 'Ward', 'Price', 'Lowe', 'Cole'])}`, region: pick(rand, REGIONS) as string, age: 18 + Math.floor(rand() * 50) as number | null }));
})();
// Typed-in regions, and ages that can't be right
const CL_MESS: Record<number, string> = { 1: 'north ', 4: 'SOUTH', 6: ' East', 9: 'Wset', 13: 'Nrth' };
const CL_ROWS = CL_MEMBERS.map((m, i) => ({
  ...m,
  raw: CL_MESS[i] ?? m.region,
  region: CL_MESS[i] === 'Wset' ? 'West' : CL_MESS[i] === 'Nrth' ? 'North' : CL_MESS[i] ? titleCase(CL_MESS[i]) : m.region,
  age: i === 5 ? null : i === 10 ? -4 : i === 14 ? 214 : m.age,
}));
const CL_DUPES = ['M103', 'M108', 'M112'];
const CL_EXPORT = CL_ROWS.flatMap((m) => (CL_DUPES.includes(m.id) ? [m, m] : [m]));
const clValid = (m: (typeof CL_ROWS)[number]) => m.age !== null && m.age >= 0 && m.age <= 120;
const CL_INVALID = CL_ROWS.filter((m) => !clValid(m)).length;

const CL_INVOICES = [
  ['INV-01', '  harbour foods ', '£1,250.00', 1250],
  ['INV-02', 'BRIGHTLINE LTD', ' 45 ', 45],
  ['INV-03', 'northwind', '£312.50', 312.5],
  ['INV-04', ' Greenleaf  ', '2,040', 2040],
  ['INV-05', 'harbour foods', '-£40.00', -40],
  ['INV-06', 'brightline ltd ', '600', 600],
  ['INV-07', 'NORTHWIND', '£ 87.10', 87.1],
  ['INV-08', 'greenleaf', '-£125.50', -125.5],
] as const;

const CLEANING_TEST = moduleTest(
  'test-da-cleaning',
  'Data Cleaning',
  'Two cleaning tasks of four questions each in a working spreadsheet (duplicates, inconsistent categories, invalid values, numbers and names stored badly), then four questions on cleaning data properly.',
  ['Data Cleaning', 'Data Quality', 'Validation', 'Excel'],
  {
    company: 'Brightwell Gyms',
    role: 'Data Analyst',
    brief: `Brightwell Gyms is moving its records into a new system, and the old exports are messy. Each task opens its own workbook. Fix the data so the new system gets it right.`,
  },
  [
    sheetTask(
      'cl-t1',
      'The Member Export',
      'members_export.xlsx',
      `Work on the Members sheet itself.

Q1. The export repeated some members: the same Member ID on two identical rows. Leave one row per member, starting at A1 with no blank rows, and don't lose anyone.
Q2. Region was typed by hand. Make every value in column C read exactly North, South, East or West (no spaces, typos or odd capitals).
Q3. Column E (Check): with a formula on every row, show Invalid when Age is blank, below 0 or above 120, and OK otherwise.
Q4. In H2, with a formula, the number of North members whose Check is OK.`,
      [{ name: 'Members', rows: [['Member ID', 'Name', 'Region', 'Age', 'Check', null, null, 'Valid North members'], ...CL_EXPORT.map((m) => [m.id, m.name, m.raw, m.age])] }],
      [
        [1, 'Each repeated member appears once', `=COUNTIF(Members!A:A,"${CL_DUPES[0]}")+COUNTIF(Members!A:A,"${CL_DUPES[1]}")+COUNTIF(Members!A:A,"${CL_DUPES[2]}")`, '3'],
        [1, `No member lost: ${CL_MEMBERS.length} remain`, '=COUNTA(Members!A:A)-1', String(CL_MEMBERS.length)],
        [2, 'Every region is one of the four', '=COUNTIF(Members!C:C,"North")+COUNTIF(Members!C:C,"South")+COUNTIF(Members!C:C,"East")+COUNTIF(Members!C:C,"West")', String(CL_MEMBERS.length)],
        [2, 'The typos went to the right region', joined('COUNTIFS(Members!A:A,"M110",Members!C:C,"West")', 'COUNTIFS(Members!A:A,"M114",Members!C:C,"North")'), values(1, 1)],
        [3, 'The invalid ages are flagged', joined('COUNTIF(Members!E:E,"Invalid")', 'COUNTIF(Members!E:E,"OK")'), values(CL_INVALID, CL_MEMBERS.length - CL_INVALID)],
        [3, 'The blank age is caught', '=COUNTIFS(Members!A:A,"M106",Members!E:E,"Invalid")', '1'],
        [4, 'Valid North members are counted', '=Members!H2', String(CL_ROWS.filter((m) => m.region === 'North' && clValid(m)).length)],
        [4, 'Worked out by formula', '=ISFORMULA(Members!H2)', 'TRUE'],
      ]
    ),
    sheetTask(
      'cl-t2',
      'The Invoice List',
      'invoices.xlsx',
      `The Invoices sheet came from the old finance system. Use formulas on every row (2 to 9).

Q1. Column D (Amount Value): the Amount as a real number. Amounts came in as text such as "£1,250.00" and " 45 "; credit notes are negative ("-£40.00").
Q2. Column E (Customer Clean): the customer name with no extra spaces, each word capitalised (e.g. Harbour Foods).
Q3. Column F (Type): Credit when the amount is negative, otherwise Invoice.
Q4. In I2, the total of invoices only, leaving credit notes out.`,
      [{ name: 'Invoices', rows: [['Invoice', 'Customer', 'Amount', 'Amount Value', 'Customer Clean', 'Type', null, null, 'Invoiced total'], ...CL_INVOICES.map(([i, c, a]) => [i, c, `'${a}`])] }],
      [
        [1, 'Every amount is a number', '=COUNT(Invoices!D2:D9)', '8'],
        [1, 'The amounts are right', joined('Invoices!D2', 'Invoices!D6', 'Invoices!D9'), values(1250, -40, -125.5)],
        [2, 'Customer names are tidy', joined('Invoices!E2', 'Invoices!E5', 'Invoices!E8'), values('Harbour Foods', 'Greenleaf', 'Northwind')],
        [3, 'Credit notes are marked', joined('COUNTIF(Invoices!F2:F9,"Credit")', 'COUNTIF(Invoices!F2:F9,"Invoice")'), values(2, 6)],
        [4, 'The invoiced total is right', '=Invoices!I2', String(round2(sum(CL_INVOICES.map((r) => r[3]).filter((n) => n > 0))))],
        [4, 'Worked out by formula', '=AND(ISFORMULA(Invoices!D9),ISFORMULA(Invoices!E9),ISFORMULA(Invoices!F9),ISFORMULA(Invoices!I2))', 'TRUE'],
      ]
    ),
  ],
  CLEANING_SETS
);

// =====================================================================================================
// Dashboards & Reporting
// =====================================================================================================

const RP_ORDERS = (() => {
  const rand = seeded(9393);
  return Array.from({ length: 40 }, (_, i) => ({ month: i < 18 ? '2026-04' : '2026-05', region: pick(rand, REGIONS) as string, revenue: round2(25 + rand() * 150) }));
})();
const rpRev = (m: string, r?: string) => round2(sum(RP_ORDERS.filter((o) => o.month === m && (!r || o.region === r)).map((o) => o.revenue)));
const RP_APR = rpRev('2026-04');
const RP_MAY = rpRev('2026-05');
const RP_MAY_N = RP_ORDERS.filter((o) => o.month === '2026-05').length;
const RP_TARGETS = [['North', 2400, 2520], ['South', 2100, 1960], ['East', 1700, 1490], ['West', 2600, 2610]] as const;
const rag = (pct: number) => (pct >= 1 ? 'Green' : pct >= 0.9 ? 'Amber' : 'Red');
const RP_PRODUCTS = [['Monstera', 4200], ['Fiddle Leaf Fig', 3150], ['Snake Plant', 5600], ['Pothos', 1900], ['Calathea', 1250], ['Peace Lily', 900]] as const;
const RP_TOTAL = sum(RP_PRODUCTS.map((p) => p[1]));

const REPORTING_TEST = moduleTest(
  'test-da-reporting',
  'Dashboards & Reporting',
  'Two tasks of four questions each building a real KPI report in a spreadsheet (headline KPIs, month on month, region by month, performance against target, share of total and the top seller), then four questions on dashboards people can act on.',
  ['Dashboards', 'KPIs', 'Reporting', 'Data Visualisation'],
  {
    company: 'Fernway',
    role: 'Data Analyst',
    brief: `Fernway's leadership team gets a one-page KPI report every month. You're building May's. Each task opens its own workbook; use formulas so next month's report only needs new data.`,
  },
  [
    sheetTask(
      'rp-t1',
      'May’s KPIs',
      'kpi_may.xlsx',
      `The Orders sheet has April's and May's orders. Answer with formulas.

Q1. KPI sheet, B2: May revenue.
Q2. KPI sheet, B3: May orders, and B4: May average order value.
Q3. KPI sheet, B5: revenue change from April to May, as a fraction (e.g. 0.12 for +12%).
Q4. Report sheet, B2:C5: each region's revenue for April (column B) and May (column C), with one formula you can fill across and down.`,
      [
        { name: 'Orders', rows: [['Month', 'Region', 'Revenue'], ...RP_ORDERS.map((o) => [o.month, o.region, o.revenue])] },
        { name: 'KPI', rows: [['KPI', 'May'], ['Revenue'], ['Orders'], ['Average order value'], ['Change vs April']] },
        { name: 'Report', rows: [['Region', '2026-04', '2026-05'], ...REGIONS.map((r) => [r])] },
      ],
      [
        [1, 'May revenue is right', '=KPI!B2', String(RP_MAY)],
        [2, 'May orders and average order value are right', joined('KPI!B3', 'ROUND(KPI!B4,2)'), values(RP_MAY_N, round2(RP_MAY / RP_MAY_N))],
        [3, 'The change on April is right', '=KPI!B5', `${RP_MAY / RP_APR - 1}|${(RP_MAY / RP_APR - 1) * 100}`],
        [3, 'The KPIs are formulas', '=AND(ISFORMULA(KPI!B2),ISFORMULA(KPI!B4),ISFORMULA(KPI!B5))', 'TRUE'],
        [4, 'April by region is right', joined(...REGIONS.map((_, i) => `ROUND(Report!B${i + 2},2)`)), values(...REGIONS.map((r) => rpRev('2026-04', r)))],
        [4, 'May by region is right', joined(...REGIONS.map((_, i) => `ROUND(Report!C${i + 2},2)`)), values(...REGIONS.map((r) => rpRev('2026-05', r)))],
        [4, 'Worked out by formula', '=AND(ISFORMULA(Report!B2),ISFORMULA(Report!C5))', 'TRUE'],
      ]
    ),
    sheetTask(
      'rp-t2',
      'Targets and Top Sellers',
      'targets.xlsx',
      `Answer with formulas.

Q1. Targets sheet, column D: each region's actual as a fraction of its target (e.g. 1.05).
Q2. Targets sheet, column E: status Green at or above target, Amber from 90% up to target, Red below 90%.
Q3. Products sheet, column C: each product's share of total revenue as a fraction, with one formula filled down that always divides by the total in B9.
Q4. Products sheet, B11: the name of the product with the highest revenue, found by formula (so it updates when the numbers change).`,
      [
        { name: 'Targets', rows: [['Region', 'Target', 'Actual', '% of Target', 'Status'], ...RP_TARGETS.map((r) => [...r])] },
        { name: 'Products', rows: [['Product', 'Revenue', 'Share'], ...RP_PRODUCTS.map((p) => [...p]), [null, null], ['Total', '=SUM(B2:B7)'], [null, null], ['Top product']] },
      ],
      [
        [1, 'Percent of target is right', joined('ROUND(Targets!D3,4)', 'ROUND(Targets!D4,4)'), values(r4(1960 / 2100), r4(1490 / 1700))],
        [2, 'Statuses are right', joined('Targets!E2', 'Targets!E3', 'Targets!E4', 'Targets!E5'), values(...RP_TARGETS.map(([, t, a]) => rag(a / t)))],
        [2, 'Worked out by formula', '=AND(ISFORMULA(Targets!D5),ISFORMULA(Targets!E5))', 'TRUE'],
        [3, 'Shares add up to 1', '=ROUND(SUM(Products!C2:C7),6)', '1'],
        [3, 'Each share is right', joined('ROUND(Products!C2,4)', 'ROUND(Products!C7,4)'), values(r4(RP_PRODUCTS[0][1] / RP_TOTAL), r4(RP_PRODUCTS[5][1] / RP_TOTAL))],
        [4, 'The top product is found', '=Products!B11', 'Snake Plant'],
        [4, 'It’s a formula', '=ISFORMULA(Products!B11)', 'TRUE'],
      ]
    ),
  ],
  REPORTING_SETS
);

// =====================================================================================================
// Metrics & Statistics
// =====================================================================================================

const MT_AB = { A: { visitors: 24800, orders: 868, revenue: 30380 }, B: { visitors: 25150, orders: 981, revenue: 33354 } };
const MT_A = MT_AB.A.orders / MT_AB.A.visitors;
const MT_B = MT_AB.B.orders / MT_AB.B.visitors;
const MT_COHORT = [['Jan', 1200, 1032, 912], ['Feb', 1350, 1121, 990], ['Mar', 1100, 968, 869]] as const;
const MT_VALUES = (() => {
  const rand = seeded(4545);
  const v = Array.from({ length: 24 }, () => round2(20 + rand() * 60));
  v[7] = 640;
  return v;
})();
const MT_MEAN = sum(MT_VALUES) / MT_VALUES.length;
const MT_SD = Math.sqrt(sum(MT_VALUES.map((v) => (v - MT_MEAN) ** 2)) / (MT_VALUES.length - 1));
const MT_UNIT = { spend: 18400, newCustomers: 230, revenue: 96500, activeUsers: 4100 };
const MT_CAC = MT_UNIT.spend / MT_UNIT.newCustomers;
const MT_ARPU = MT_UNIT.revenue / MT_UNIT.activeUsers;

const METRICS_TEST = moduleTest(
  'test-da-metrics',
  'Metrics & Statistics',
  'Two tasks of four questions each working out real business metrics in a spreadsheet (an A/B test’s conversion, uplift and revenue per visitor; retention, churn, averages, spread and unit economics), then four questions on reading them correctly.',
  ['Metrics', 'A/B Testing', 'Statistics', 'Retention'],
  {
    company: 'Pocketly',
    role: 'Product Analyst',
    brief: `Pocketly is a budgeting app. The product and marketing teams ask you for numbers they can trust. Each task opens its own workbook; use formulas.`,
  },
  [
    sheetTask(
      'mt-t1',
      'The Checkout Test',
      'checkout_test.xlsx',
      `The Test sheet has the totals from a two-week test of a new checkout (B) against the old one (A). Answer with formulas.

Q1. E2 and E3: conversion (orders ÷ visitors, as a fraction) for A and B.
Q2. E5: B's relative uplift in conversion over A, as a fraction (B ÷ A − 1).
Q3. E6: B's lift in conversion in percentage points (B − A, × 100).
Q4. F2 and F3: revenue per visitor for A and B.`,
      [{ name: 'Test', rows: [['Variant', 'Visitors', 'Orders', 'Revenue', 'Conversion', 'Revenue per visitor'], ...(['A', 'B'] as const).map((v) => [v, MT_AB[v].visitors, MT_AB[v].orders, MT_AB[v].revenue]), [], [null, null, null, 'Relative uplift'], [null, null, null, 'Lift (points)']] }],
      [
        [1, 'Conversion for A and B is right', joined('ROUND(Test!E2,6)', 'ROUND(Test!E3,6)'), values(Math.round(MT_A * 1e6) / 1e6, Math.round(MT_B * 1e6) / 1e6)],
        [2, 'Relative uplift is right', '=Test!E5', `${MT_B / MT_A - 1}|${(MT_B / MT_A - 1) * 100}`],
        [3, 'Lift in points is right', '=Test!E6', String((MT_B - MT_A) * 100)],
        [4, 'Revenue per visitor is right', joined('ROUND(Test!F2,4)', 'ROUND(Test!F3,4)'), values(r4(MT_AB.A.revenue / MT_AB.A.visitors), r4(MT_AB.B.revenue / MT_AB.B.visitors))],
        [4, 'Worked out by formula', '=AND(ISFORMULA(Test!E3),ISFORMULA(Test!E5),ISFORMULA(Test!F3))', 'TRUE'],
      ]
    ),
    sheetTask(
      'mt-t2',
      'Retention and Unit Economics',
      'business_metrics.xlsx',
      `Answer with formulas.

Q1. Cohorts sheet, E and F: month-1 and month-2 retention for each cohort, as fractions of its starting users.
Q2. Cohorts sheet, G: each cohort's churn between month 1 and month 2 (the share of its month-1 users lost by month 2).
Q3. Payments sheet: D2 the mean payment, D3 the median, D4 the standard deviation (sample) and D5 the mean with the single largest payment left out.
Q4. Unit sheet: B7 customer acquisition cost (spend per new customer), B8 average revenue per active user, and B9 how many months of that revenue pay back one customer's acquisition cost.`,
      [
        { name: 'Cohorts', rows: [['Cohort', 'Users', 'Active M1', 'Active M2', 'Retention M1', 'Retention M2', 'Churn M1→M2'], ...MT_COHORT.map((c) => [...c])] },
        { name: 'Payments', rows: [['Payment', null, 'Measure', 'Value'], ...MT_VALUES.map((v, i) => [v, null, ['Mean', 'Median', 'Std dev', 'Mean without the largest'][i] ?? null])] },
        { name: 'Unit', rows: [['Figure', 'Value'], ['Marketing spend (month)', MT_UNIT.spend], ['New customers (month)', MT_UNIT.newCustomers], ['Revenue (month)', MT_UNIT.revenue], ['Active users (month)', MT_UNIT.activeUsers], [], ['CAC'], ['ARPU (month)'], ['Payback (months)']] },
      ],
      [
        [1, 'Retention is right', joined('ROUND(Cohorts!E2,4)', 'ROUND(Cohorts!F3,4)', 'ROUND(Cohorts!E4,4)'), values(r4(1032 / 1200), r4(990 / 1350), r4(968 / 1100))],
        [2, 'Churn between months is right', joined('ROUND(Cohorts!G2,4)', 'ROUND(Cohorts!G4,4)'), values(r4(1 - 912 / 1032), r4(1 - 869 / 968))],
        [3, 'Mean and median are right', joined('ROUND(Payments!D2,4)', 'ROUND(Payments!D3,4)'), values(r4(MT_MEAN), r4(median(MT_VALUES)))],
        [3, 'Spread and the mean without the largest are right', joined('ROUND(Payments!D4,4)', 'ROUND(Payments!D5,4)'), values(r4(MT_SD), r4((sum(MT_VALUES) - Math.max(...MT_VALUES)) / (MT_VALUES.length - 1)))],
        [4, 'CAC, ARPU and payback are right', joined('ROUND(Unit!B7,4)', 'ROUND(Unit!B8,4)', 'ROUND(Unit!B9,4)'), values(r4(MT_CAC), r4(MT_ARPU), r4(MT_CAC / MT_ARPU))],
        [4, 'Worked out by formula', '=AND(ISFORMULA(Cohorts!G4),ISFORMULA(Payments!D5),ISFORMULA(Unit!B9))', 'TRUE'],
      ]
    ),
  ],
  METRICS_SETS
);

// =====================================================================================================
// Data Importing
// =====================================================================================================

const IM_SUPPLIERS_CSV = toCsv([
  ['supplier_code', 'supplier', 'lead_time_days'],
  ['00412', 'Greenleaf Nurseries', 6],
  ['00087', 'Potter & Clay', 12],
  ['01150', 'Rootstock Ltd', 4],
  ['00239', 'Fern & Frond', 9],
]);
const IM_LEAD: Record<string, number> = { '00412': 6, '00087': 12, '01150': 4, '00239': 9 };
const IM_STOCK = [['SKU-1', '00412'], ['SKU-2', '01150'], ['SKU-3', '00087'], ['SKU-4', '00239'], ['SKU-5', '00412'], ['SKU-6', '00087']] as const;
const IM_EURO = [['DE-01', '1.250,50'], ['DE-02', '89,90'], ['DE-03', '2.004,00'], ['DE-04', '15,25'], ['DE-05', '640,00']] as const;
const euro = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const IM_DATES = [['O-1', '03/04/2026'], ['O-2', '28/02/2026'], ['O-3', '11/03/2026'], ['O-4', '01/05/2026'], ['O-5', '30/04/2026'], ['O-6', '12/01/2026']] as const;
const IM_RAW: DataTable = {
  name: 'orders_raw',
  columns: ['order_ref', 'order_date', 'amount', 'region'],
  rows: [
    { order_ref: 'R-01', order_date: '03/04/2026', amount: '£1,204.50', region: 'north' },
    { order_ref: 'R-02', order_date: '17/04/2026', amount: '£89.00', region: 'South ' },
    { order_ref: 'R-03', order_date: '29/03/2026', amount: '£2,310.00', region: 'EAST' },
    { order_ref: 'R-04', order_date: '05/05/2026', amount: '£45.99', region: 'west' },
    { order_ref: 'R-05', order_date: '11/04/2026', amount: '£310.25', region: ' North' },
    { order_ref: 'R-06', order_date: '14/04/2026', amount: '', region: 'South' },
    { order_ref: 'R-07', order_date: 'TBC', amount: '£72.00', region: 'East' },
  ],
};

const IMPORTING_TEST = moduleTest(
  'test-da-importing',
  'Data Importing',
  'Two tasks of four questions each bringing real files into a spreadsheet and a database without losing or changing anything (a CSV with leading-zero codes, European numbers, day-first dates, a raw text table loaded into clean types with bad rows set aside), then four questions on importing data safely.',
  ['Data Importing', 'CSV', 'Data Types', 'SQL'],
  {
    company: 'Fernway',
    role: 'Data Analyst',
    brief: `Fernway buys from suppliers across Europe, and their files come in every format. Your job is to get them in exactly as they were meant: every row, every code, every number and date right.

Files shared with you: suppliers.csv`,
    files: [{ name: 'suppliers.csv', content: IM_SUPPLIERS_CSV }],
  },
  [
    sheetTask(
      'im-t1',
      'Supplier Files',
      'supplier_files.xlsx',
      `Q1. Import suppliers.csv (Import CSV → Files shared with you). It arrives as a new sheet named suppliers, with every supplier.
Q2. Stock sheet, column C (Lead Time): each SKU's supplier lead time in days, looked up from the imported sheet by supplier code. Watch the codes: they start with zeros.
Q3. Prices sheet, column C: a German supplier's prices came in as text, written the European way ("1.250,50" means 1250.50). Turn each into a real number with a formula.
Q4. Orders sheet, column C: the order dates came in as text in UK order, day first (03/04/2026 is 3 April). Turn each into a real date with a formula, so the month in column D (already =MONTH(C2)) is right.`,
      [
        { name: 'Stock', rows: [['SKU', 'Supplier Code', 'Lead Time'], ...IM_STOCK.map(([s, c]) => [s, `'${c}`])] },
        { name: 'Prices', rows: [['Item', 'Price (text)', 'Price'], ...IM_EURO.map(([i, p]) => [i, `'${p}`])] },
        { name: 'Orders', rows: [['Order', 'Date (text)', 'Date', 'Month'], ...IM_DATES.map(([o, d], i) => [o, `'${d}`, null, `=MONTH(C${i + 2})`])] },
      ],
      [
        [1, 'suppliers.csv is imported with every row', '=COUNTA(suppliers!A:A)', '5'],
        [1, 'Its codes kept their leading zeros', '=COUNTIF(suppliers!A:A,"00087")', '1'],
        [2, 'Lead times are looked up correctly', joined('Stock!C2', 'Stock!C3', 'Stock!C4'), values(...IM_STOCK.slice(0, 3).map(([, c]) => IM_LEAD[c]))],
        [2, 'Every SKU has its lead time', '=SUM(Stock!C2:C7)', String(sum(IM_STOCK.map(([, c]) => IM_LEAD[c])))],
        [3, 'Prices are real numbers', joined('Prices!C2', 'ROUND(SUM(Prices!C2:C6),2)'), values(1250.5, round2(sum(IM_EURO.map(([, p]) => euro(p)))))],
        [3, 'Worked out by formula', '=AND(ISFORMULA(Prices!C2),ISFORMULA(Prices!C6))', 'TRUE'],
        [4, 'Months are right (day first)', joined('Orders!D2', 'Orders!D3', 'Orders!D4', 'Orders!D5'), values(...IM_DATES.slice(0, 4).map(([, d]) => Number(d.slice(3, 5))))],
        [4, 'Days are right, by formula', joined('DAY(Orders!C2)', 'DAY(Orders!C7)', 'ISFORMULA(Orders!C7)'), values(3, 12, 'TRUE')],
      ]
    ),
    dbTask(
      'im-t2',
      'Load the Raw Table',
      'Fernway: orders_raw',
      `orders_raw was loaded straight from a file, so every column is text: dates are day first (DD/MM/YYYY), amounts have £ and commas, regions are messy, and a few rows can't be loaded. Build a view named orders_clean with order_ref and these columns, and a second view for the rest.

Q1. order_date as 'YYYY-MM-DD' text.
Q2. amount as a number.
Q3. region as North, South, East or West.
Q4. orders_clean leaves out rows with no amount or a date that isn't DD/MM/YYYY; put those rows' order_ref in a view named orders_rejected.`,
      [IM_RAW],
      "-- Tip: substr(), replace(), trim(), upper(), lower(), CAST(... AS REAL), LIKE '__/__/____'\nCREATE VIEW orders_clean AS\nSELECT\n\n-- Q4\n",
      `CREATE VIEW orders_clean AS SELECT order_ref, substr(order_date, 7, 4) || '-' || substr(order_date, 4, 2) || '-' || substr(order_date, 1, 2) AS order_date, CAST(replace(replace(amount, '£', ''), ',', '') AS REAL) AS amount, upper(substr(trim(region), 1, 1)) || lower(substr(trim(region), 2)) AS region FROM orders_raw WHERE amount <> '' AND order_date LIKE '__/__/____';
CREATE VIEW orders_rejected AS SELECT order_ref FROM orders_raw WHERE NOT (amount <> '' AND order_date LIKE '__/__/____');`,
      [
        [1, 'Dates are YYYY-MM-DD', "SELECT order_ref, order_date FROM orders_clean WHERE order_ref IN ('R-01','R-02','R-03','R-04','R-05') ORDER BY order_ref"],
        [2, 'Amounts are numbers that add up', "SELECT ROUND(SUM(amount), 2) FROM orders_clean WHERE order_ref IN ('R-01','R-02','R-03','R-04','R-05')"],
        [3, 'Regions are tidy', "SELECT order_ref, region FROM orders_clean WHERE order_ref IN ('R-01','R-02','R-03','R-04','R-05') ORDER BY order_ref"],
        [4, 'The bad rows are kept out of orders_clean', 'SELECT order_ref FROM orders_clean ORDER BY order_ref'],
        [4, 'and listed in orders_rejected', 'SELECT order_ref FROM orders_rejected ORDER BY order_ref'],
      ]
    ),
  ],
  IMPORTING_SETS
);

// =====================================================================================================
// Power BI
// =====================================================================================================

const PB_PRODUCTS = ['P01', 'P02', 'P03', 'P04', 'P05'];
const PB_RAW = (() => {
  const rand = seeded(3131);
  const messy: Record<string, string[]> = { North: ['North', 'north', ' North', 'NORTH '], South: ['South', 'south ', 'SOUTH'], East: ['East', ' east', 'EAST'], West: ['West', 'west', 'West '] };
  const rows = Array.from({ length: 22 }, (_, i) => {
    const region = pick(rand, REGIONS);
    return { OrderID: 9001 + i, Date: `2026-03-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`, Region: pick(rand, messy[region]), ProductKey: pick(rand, PB_PRODUCTS), Amount: (20 + Math.floor(rand() * 18000) / 100).toFixed(2) } as Record<string, string | number | null>;
  });
  // The web team's test orders, and two empty rows from the export
  rows.splice(6, 0, { OrderID: 9901, Date: '2026-03-05', Region: 'TEST', ProductKey: 'P01', Amount: null });
  rows.splice(15, 0, { OrderID: null, Date: null, Region: null, ProductKey: null, Amount: null });
  rows.splice(19, 0, { OrderID: 9902, Date: '2026-03-12', Region: 'TEST', ProductKey: 'P02', Amount: null });
  rows.push({ OrderID: null, Date: null, Region: null, ProductKey: null, Amount: null });
  return rows;
})();
const PB_REAL = PB_RAW.filter((r) => r.Region && r.Region !== 'TEST');
const PB_AMOUNT = round2(sum(PB_REAL.map((r) => Number(r.Amount))));

const PB_SALES = (() => {
  const rand = seeded(3232);
  return Array.from({ length: 40 }, (_, i) => {
    const amount = round2(30 + rand() * 470);
    return { OrderID: 7001 + i, Date: `2026-0${1 + Math.floor(i / 14)}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`, Region: pick(rand, REGIONS), Channel: rand() < 0.45 ? 'Online' : 'Store', Category: pick(rand, ['Plants', 'Pots', 'Care']), Amount: amount, Cost: round2(amount * (0.45 + rand() * 0.25)) };
  });
})();
const PB_TOTAL = round2(sum(PB_SALES.map((r) => r.Amount)));
const PB_MARGIN = (PB_TOTAL - sum(PB_SALES.map((r) => r.Cost))) / PB_TOTAL;
const PB_ONLINE = round2(sum(PB_SALES.filter((r) => r.Channel === 'Online').map((r) => r.Amount)));

const pbTask = (id: string, title: string, prompt: string, html: string, checks: Checks): Question => ({
  ...simTask(id, title, prompt, 'Lumen BI', html, checks.map(([n, d, path, e]) => [`Q${n} · ${d}`, path, e ?? '']), { minutes: TASK_MINUTES, weight: TASK_WEIGHT }),
});

const POWERBI_TEST = moduleTest(
  'test-da-powerbi',
  'Power BI',
  'Two question sets (DAX measures; the model and Power Query), then two tasks of four questions each in a working Power BI-style app: shape a raw table in Power Query and relate it in the model, then write DAX measures and build a visual.',
  ['Power BI', 'DAX', 'Power Query', 'Data Modelling'],
  {
    company: 'Fernway',
    role: 'Data Analyst',
    brief: `Fernway sells houseplants online and in shops, and reports in Power BI. Each task opens its own Power BI file in the app.`,
  },
  [
    pbTask(
      'pbi-t1',
      'Shape and Model the Sales Data',
      `The Sales query came straight from the web shop's export. Work in Power Query (the funnel on the left), then the Model view.

Q1. Make Amount a Decimal number (select the column, then Data type).
Q2. Keep only real orders: remove the web team's test orders (Region TEST) and the blank rows.
Q3. Tidy Region so it reads exactly North, South, East or West (Format: Trim, then Capitalize Each Word).
Q4. In the Model view, relate Sales to Products on ProductKey and Sales to Date on Date: many to one, single direction.`,
      powerBiApp({
        product: 'Lumen BI',
        file: 'fernway_sales.pbix',
        kind: 'query',
        query: { name: 'Sales', columns: ['OrderID', 'Date', 'Region', 'ProductKey', 'Amount'], rows: PB_RAW, types: { OrderID: 'Whole number', Date: 'Text', Region: 'Text', ProductKey: 'Text', Amount: 'Text' } },
        model: [
          { name: 'Sales', columns: ['OrderID', 'Date', 'Region', 'ProductKey', 'Amount'] },
          { name: 'Products', columns: ['ProductKey', 'Product', 'Category'] },
          { name: 'Date', columns: ['Date', 'Month', 'Year'] },
        ],
      }),
      [
        [1, 'Amount is a decimal number', 'query.types.Amount', 'Decimal number'],
        [1, 'Its total is right', 'query.sum.Amount', String(PB_AMOUNT)],
        [2, 'Only the real orders are left', 'query.rows', String(PB_REAL.length)],
        [3, 'Regions read North, South, East or West', 'query.values.Region', '["East","North","South","West"]'],
        [4, 'Sales is related to Products', 'model.rel.Sales[ProductKey]>Products[ProductKey]', 'Many to one, Single'],
        [4, 'Sales is related to Date', 'model.rel.Sales[Date]>Date[Date]', 'Many to one, Single'],
      ]
    ),
    pbTask(
      'pbi-t2',
      'Measures and a Visual',
      `The Sales table is loaded (Table view shows it). Use New measure and the formula bar: type Name = expression and press Enter.

Q1. A measure named Total Sales: the total of Amount.
Q2. A measure named Margin %: (total Amount − total Cost) ÷ total Amount, using DIVIDE.
Q3. A measure named Online Sales: Total Sales for the Online channel only, using CALCULATE.
Q4. On the report page, a Clustered bar chart of Total Sales by Region.`,
      powerBiApp({ product: 'Lumen BI', file: 'fernway_report.pbix', kind: 'report', table: { name: 'Sales', columns: ['OrderID', 'Date', 'Region', 'Channel', 'Category', 'Amount', 'Cost'], rows: PB_SALES } }),
      [
        [1, 'Total Sales is right', 'measures.Total Sales.value', String(PB_TOTAL)],
        [1, 'It’s worked out from the data', 'measures.Total Sales.live', 'true'],
        [2, 'Margin % is right', 'measures.Margin %.value', `${PB_MARGIN}|${PB_MARGIN * 100}`],
        [2, 'It’s worked out from the data', 'measures.Margin %.live', 'true'],
        [3, 'Online Sales is right', 'measures.Online Sales.value', String(PB_ONLINE)],
        [3, 'It uses CALCULATE', 'measures.Online Sales.calc', 'true'],
        [4, 'The visual is a clustered bar chart', 'visual.type', 'Clustered bar chart'],
        [4, 'Region is on the axis', 'visual.axis', 'Region'],
        [4, 'Total Sales is the value', 'visual.values', '["Total Sales"]'],
      ]
    ),
  ],
  POWERBI_SETS
);

// =====================================================================================================
// Tableau
// =====================================================================================================

const TB_ORDERS = (() => {
  const rand = seeded(4242);
  const customers = ['Avery Shaw', 'Blake Moss', 'Casey Lin', 'Drew Patel', 'Ellis Fox', 'Frankie Rao', 'Gray Hughes', 'Harper Cole', 'Indy Ward', 'Jordan Kerr', 'Kit Lowe', 'Logan Price'];
  return Array.from({ length: 60 }, (_, i) => {
    const category = pick(rand, ['Technology', 'Furniture', 'Office Supplies']);
    const sales = round2((category === 'Technology' ? 120 : category === 'Furniture' ? 90 : 15) + rand() * (category === 'Office Supplies' ? 120 : 760));
    return {
      'Order ID': `OR-${3001 + i}`,
      'Order Date': `2025-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
      Region: pick(rand, ['Central', 'East', 'South', 'West']),
      Category: category,
      Segment: pick(rand, ['Consumer', 'Corporate', 'Home Office']),
      Customer: pick(rand, customers),
      Sales: sales,
      Profit: round2(sales * (-0.15 + rand() * 0.45)),
      Quantity: 1 + Math.floor(rand() * 6),
    };
  });
})();
const TB_DIMS = ['Order ID', 'Order Date', 'Region', 'Category', 'Segment', 'Customer'];
const tbBy = <K extends keyof (typeof TB_ORDERS)[number]>(rows: typeof TB_ORDERS, key: K) => {
  const out: Record<string, typeof TB_ORDERS> = {};
  rows.forEach((r) => (out[String(r[key])] ??= []).push(r));
  return out;
};
const TB_TECH = tbBy(TB_ORDERS.filter((r) => r.Category === 'Technology'), 'Region');
const TB_TECH_TOTAL = sum(TB_ORDERS.filter((r) => r.Category === 'Technology').map((r) => r.Sales));
const TB_TECH_TOP = Object.keys(TB_TECH).sort((a, b) => sum(TB_TECH[b].map((r) => r.Sales)) - sum(TB_TECH[a].map((r) => r.Sales)))[0];
const TB_RATIO = sum(TB_ORDERS.map((r) => r.Profit)) / sum(TB_ORDERS.map((r) => r.Sales));
const TB_LARGE = TB_ORDERS.filter((r) => r.Sales >= 500).length;
const TB_CUST = tbBy(TB_ORDERS, 'Customer');
const TB_CUST_MAX = Math.max(...Object.values(TB_CUST).map((rs) => sum(rs.map((r) => r.Sales))));
const TB_REG = tbBy(TB_ORDERS, 'Region');
const TB_RATIO_TOP = Object.keys(TB_REG).sort((a, b) => sum(TB_REG[b].map((r) => r.Profit)) / sum(TB_REG[b].map((r) => r.Sales)) - sum(TB_REG[a].map((r) => r.Profit)) / sum(TB_REG[a].map((r) => r.Sales)))[0];

const tbTask = (id: string, title: string, prompt: string, checks: Checks): Question =>
  simTask(id, title, prompt, 'Vizly', tableauApp({ product: 'Vizly', workbook: 'superstore_2025.twb', table: { name: 'Orders', columns: Object.keys(TB_ORDERS[0]), rows: TB_ORDERS }, dimensions: TB_DIMS }), checks.map(([n, d, path, e]) => [`Q${n} · ${d}`, path, e ?? '']), { minutes: TASK_MINUTES, weight: TASK_WEIGHT });

const TABLEAU_TEST = moduleTest(
  'test-da-tableau',
  'Tableau',
  'Two question sets (calculations and LODs; views and table calculations), then two tasks of four questions each in a working Tableau-style worksheet: build, filter, sort and label a view with a table calculation, then write calculated fields, an IF and a FIXED LOD, and chart one.',
  ['Tableau', 'Calculated Fields', 'LOD Expressions', 'Table Calculations'],
  {
    company: 'Superstore',
    role: 'Data Analyst',
    brief: `Superstore sells office products across four regions. Its 2025 orders are in the Orders data source. Each task opens its own worksheet in the app: drag fields from the Data pane to the shelves (or use the + beside a field), and click a pill for its menu.`,
  },
  [
    tbTask(
      'tab-t1',
      'Technology Sales by Region',
      `Q1. Show sales by region as horizontal bars: Region on Rows, SUM(Sales) on Columns.
Q2. Filter the view to the Technology category only.
Q3. Sort the regions from highest to lowest sales, and label each bar with its sales (SUM(Sales) on Label).
Q4. Show each region's share of Technology sales: a Quick Table Calculation of Percent of Total on SUM(Sales).`,
      [
        [1, 'Region is on Rows', 'shelves.rows', '["Region"]'],
        [1, 'SUM(Sales) is on Columns', 'shelves.columns', '["SUM(Sales)"]'],
        [2, 'Only Technology is kept', 'shelves.filters.Category', '["Technology"]'],
        [2, 'The view’s top region is right', 'view.top', TB_TECH_TOP],
        [3, 'Sorted highest first', 'shelves.sort', 'desc'],
        [3, 'Bars are labelled with sales', 'shelves.label', 'SUM(Sales)'],
        [4, 'Percent of Total is applied', 'tableCalc.SUM(Sales)', 'Percent of Total'],
        [4, 'The top region’s share is right', `view.values.${TB_TECH_TOP}`, String(Math.round((sum(TB_TECH[TB_TECH_TOP].map((r) => r.Sales)) / TB_TECH_TOTAL) * 1e6) / 1e6)],
      ]
    ),
    tbTask(
      'tab-t2',
      'Calculated Fields',
      `Use Create Calculated Field (in the toolbar) for each, named exactly as given.

Q1. Profit Ratio: total profit divided by total sales.
Q2. Order Size: "Large" when an order's Sales is 500 or more, otherwise "Small".
Q3. Customer Total: on every order, that customer's total sales across all their orders (a FIXED level of detail expression).
Q4. Build a view of Profit Ratio by Region (Region on Rows, Profit Ratio on Columns), sorted from highest to lowest.`,
      [
        [1, 'Profit Ratio is right', 'calcs.Profit Ratio.value', String(Math.round(TB_RATIO * 1e6) / 1e6)],
        [1, 'It’s a ratio of totals (an aggregate)', 'calcs.Profit Ratio.kind', 'aggregate'],
        [2, 'Large orders are counted right', 'calcs.Order Size.counts.Large', String(TB_LARGE)],
        [2, 'Small orders are counted right', 'calcs.Order Size.counts.Small', String(TB_ORDERS.length - TB_LARGE)],
        [3, 'The biggest customer total is right', 'calcs.Customer Total.max', String(round2(TB_CUST_MAX))],
        [3, 'It’s worked out on every row', 'calcs.Customer Total.kind', 'row'],
        [4, 'Profit Ratio by Region', 'shelves.columns', '["AGG(Profit Ratio)"]'],
        [4, 'Region is on Rows, highest first', 'shelves.sort', 'desc'],
        [4, 'The view’s top region is right', 'view.top', TB_RATIO_TOP],
      ]
    ),
  ],
  TABLEAU_SETS
);

export const DA_MODULE_TESTS: AssessmentTest[] = [EXCEL_TEST, SQL_TEST, PYTHON_TEST, CLEANING_TEST, REPORTING_TEST, METRICS_TEST, IMPORTING_TEST, POWERBI_TEST, TABLEAU_TEST];
