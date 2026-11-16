import { AssessmentTest, DataTable, Question, TestScenario } from '../../types';
import { workbookStarter } from '../../lib/spreadsheet';
import { databaseStarter } from '../../lib/databaseWork';
import { parseCsv, toCsv } from '../../lib/csv';
import { choice, match, multi, order, short, written } from '../questionKit';
import { round2, seeded, sum, tc } from '../simulationKit';

/**
 * The Data Analyst modules: one Mid-level test per tool or skill, about 20 minutes. Every question is about the
 * module's own tool or skill. First two practical tasks, each one workbook, database or data file with four numbered
 * questions in it (Q1 to Q4), each question marked on its own checks; then four answer questions of different kinds.
 * The data is generated from fixed seeds, so it's the same for every candidate, and every expected answer is worked out
 * here.
 */

const DA = ['Data Analyst'] as AssessmentTest['roles'];
const TASK_WEIGHT = 30;
const ANSWER_WEIGHT = 10;
const TASK_MINUTES = 6;

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
// files, so the answer has to be worked out, not typed in
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
    files.map(([name, csv], f) => ({ id: `tc-${id}-${q + 1}-${f + 1}`, description: `Q${q + 1} · ${name}`, input: `q${q + 1}\n${csv}`, expectedOutput: expected[q](csv) }))
  ),
  timeLimitMinutes: TASK_MINUTES,
  weight: TASK_WEIGHT,
});

const answer = (q: Question, minutes: number): Question => ({ ...q, timeLimitMinutes: minutes, weight: ANSWER_WEIGHT });

const moduleTest = (id: string, title: string, description: string, skillsTested: string[], scenario: TestScenario, practical: Question[], answers: Question[]): AssessmentTest => {
  const questions = [...practical, ...answers];
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
    totalQuestions: questions.length,
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
const xlPrice = (sku: string) => XL_PRODUCTS.find((p) => p[0] === sku)?.[2] ?? 0;
const xlLine = (o: (typeof XL_ORDERS)[number]) => o.qty * xlPrice(o.sku);
const xlWeb = (r: string) => sum(XL_ORDERS.filter((o) => o.region === r && o.channel === 'Web').map(xlLine));
const xlBig = (r: string) => XL_ORDERS.filter((o) => o.region === r && xlLine(o) > 100).length;
const XL_LAST = XL_ORDERS.length + 1;

const XL_REPS = (() => {
  const rand = seeded(5152);
  const names = [['  asha', 'PATEL'], ['BEN ', 'cole'], ['chloe', ' wu '], [' Dan', 'REID'], ['ella', 'shaw  '], ['FINN', ' moss'], ['gita ', 'Rao'], ['harry', 'LIM'], [' Isla ', 'kerr'], ['jack', 'BYRNE ']];
  return names.map(([first, last]) => ({ first, last, sales: Math.round(18000 + rand() * 24000), target: 30000 }));
})();
const XL_REP_SALES = sum(XL_REPS.map((r) => r.sales));
const XL_BONUSES = XL_REPS.filter((r) => r.sales >= r.target).length;
const repName = (i: number) => `${titleCase(XL_REPS[i].first)} ${titleCase(XL_REPS[i].last)}`;

const EXCEL_TEST = moduleTest(
  'test-da-excel',
  'Excel',
  'Two spreadsheet tasks of four questions each (lookups, conditional totals and counts, text functions, absolute references and logic), then four questions on how Excel works.',
  ['Excel', 'XLOOKUP', 'SUMIFS', 'Formulas', 'PivotTables'],
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
      `The Orders sheet has this week's orders; the Products sheet lists every product and its price. Answer each question with formulas, filled down to the last order (row ${XL_LAST}).

Q1. Column F (Product): the product name for the order's SKU, or the text Not found when the SKU isn't on the Products sheet.
Q2. Column G (Line Total): Qty × the product's price, or 0 when the SKU isn't found.
Q3. On the Summary sheet, column B: each region's total Line Total from the Web channel only.
Q4. On the Summary sheet, column C: each region's number of orders (any channel) with a Line Total over £100.`,
      [
        { name: 'Orders', rows: [['Order ID', 'SKU', 'Qty', 'Region', 'Channel', 'Product', 'Line Total'], ...XL_ORDERS.map((o) => [o.id, o.sku, o.qty, o.region, o.channel])] },
        { name: 'Products', rows: [['SKU', 'Product', 'Price'], ...XL_PRODUCTS.map((p) => [...p])] },
        { name: 'Summary', rows: [['Region', 'Web revenue', 'Orders over £100'], ...REGIONS.map((r) => [r])] },
      ],
      [
        [1, 'Product names are looked up', joined('Orders!F2', `Orders!F${XL_LAST}`), values(XL_PRODUCTS.find((p) => p[0] === XL_ORDERS[0].sku)![1], XL_PRODUCTS.find((p) => p[0] === XL_ORDERS[19].sku)![1])],
        [1, 'The unknown SKU shows Not found', '=Orders!F10', 'Not found'],
        [2, 'Line totals are right', `=SUM(Orders!G2:G${XL_LAST})`, String(sum(XL_ORDERS.map(xlLine)))],
        [2, 'Product and Line Total are formulas to the last row', `=AND(ISFORMULA(Orders!F${XL_LAST}),ISFORMULA(Orders!G${XL_LAST}))`, 'TRUE'],
        [3, 'Web revenue is right for each region', joined('Summary!B2', 'Summary!B3', 'Summary!B4', 'Summary!B5'), values(...REGIONS.map(xlWeb))],
        [4, 'Orders over £100 are counted right', joined('Summary!C2', 'Summary!C3', 'Summary!C4', 'Summary!C5'), values(...REGIONS.map(xlBig))],
        [4, 'The summary is worked out by formula', '=AND(ISFORMULA(Summary!B5),ISFORMULA(Summary!C5))', 'TRUE'],
      ]
    ),
    sheetTask(
      'xl-t2',
      'Commission',
      'q1_commission.xlsx',
      `The Reps sheet has each sales rep's name (typed in by hand), Q1 sales and target. The commission rate is in J1. Use formulas for every rep (rows 2 to 11).

Q1. Column E (Rep): first and last name with no extra spaces, each capitalised (e.g. Asha Patel).
Q2. Column F (Commission): Sales × the rate in J1, as one formula filled down that keeps pointing at J1.
Q3. Column G (Bonus): Yes if the rep's sales are at or above their target, otherwise No.
Q4. Finance has raised the rate: change J1 to 6%, and in J2 total all commission with a formula.`,
      [
        {
          name: 'Reps',
          rows: [
            ['First', 'Last', 'Sales', 'Target', 'Rep', 'Commission', 'Bonus', null, 'Commission rate', 0.05],
            ...XL_REPS.map((r, i) => [r.first, r.last, r.sales, r.target, null, null, null, null, i === 0 ? 'Total commission' : null]),
          ],
        },
      ],
      [
        [1, 'Names are trimmed and capitalised', joined('Reps!E2', 'Reps!E6', 'Reps!E11'), values(repName(0), repName(4), repName(9))],
        [1, 'Worked out by formula', '=ISFORMULA(Reps!E11)', 'TRUE'],
        [2, 'Each commission is Sales × the rate in J1', joined('ROUND(Reps!F2,2)', 'ROUND(Reps!F11,2)'), values(round2(XL_REPS[0].sales * 0.06), round2(XL_REPS[9].sales * 0.06))],
        [3, 'Bonuses go to the right reps', joined('COUNTIF(Reps!G2:G11,"Yes")', 'COUNTIF(Reps!G2:G11,"No")', 'Reps!G2'), values(XL_BONUSES, 10 - XL_BONUSES, XL_REPS[0].sales >= 30000 ? 'Yes' : 'No')],
        [3, 'Worked out by formula', '=ISFORMULA(Reps!G11)', 'TRUE'],
        [4, 'The rate is 6% and the total follows it', '=ROUND(Reps!J2,2)', String(round2(XL_REP_SALES * 0.06))],
        [4, 'The total is a formula', '=ISFORMULA(Reps!J2)', 'TRUE'],
      ]
    ),
  ],
  [
    answer(
      choice(
        'xl-a1',
        'Copying a Formula Down',
        'D2 contains =B2*$G$1. You copy it down to D5. What does D5 contain?',
        ['=B5*$G$1', '=B5*$G$4', '=B2*$G$1', '=B5*G4'],
        0
      ),
      1
    ),
    answer(
      match(
        'xl-a2',
        'The Right Function',
        'Match each job to the Excel function built for it.',
        [
          ['Find a product’s price by its SKU', 'XLOOKUP'],
          ['Total revenue for one region and one channel', 'SUMIFS'],
          ['Show a message instead of an error', 'IFERROR'],
          ['Count the cells that meet one condition', 'COUNTIF'],
        ]
      ),
      2
    ),
    answer(short('xl-a3', 'The Error', 'What does Excel show in a cell whose formula divides by an empty cell? (Type the error exactly.)', ['#DIV/0!', '#div/0!', '#DIV/0']), 1),
    answer(
      written(
        'xl-a4',
        'The PivotTable Missed April',
        "A PivotTable built in March on A1:F500 of the Sales sheet doesn't show April's sales, which were pasted below row 500. Why, and how would you set it up so new rows are always included?",
        [
          'Explains the pivot’s source range is fixed at A1:F500, so rows below it are left out (and a pivot also needs refreshing)',
          'Turns the data into an Excel Table (Ctrl+T / Format as Table) and points the pivot at the Table, so the range grows with new rows',
          'Says to Refresh the PivotTable (or set it to refresh on opening) after new data arrives',
        ],
        'Its source is the fixed range A1:F500, so April’s rows below 500 aren’t in it, and a pivot only updates when it’s refreshed. Format the data as a Table (Ctrl+T), change the pivot’s source to the Table so it grows with every row added, and Refresh (or set Refresh data when opening the file).'
      ),
      3
    ),
  ]
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
  [
    answer(
      choice(
        'sql-a1',
        'WHERE or HAVING',
        'You want regions whose total revenue is over £1,000. Where does the condition SUM(amount) > 1000 go?',
        ['In HAVING, because it filters groups after GROUP BY has totalled them', 'In WHERE, because it filters rows', 'In ORDER BY', 'In the JOIN’s ON clause'],
        0
      ),
      1
    ),
    answer(order('sql-a2', 'The Order SQL Runs In', 'Put these clauses in the order the database works through them.', ['FROM and JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY']), 2),
    answer(short('sql-a3', 'Counting Blanks', 'The orders table has 10 rows. The discount_code column is NULL in 4 of them. What does SELECT COUNT(discount_code) FROM orders return?', ['6']), 1),
    answer(
      written(
        'sql-a4',
        'Revenue Doubled',
        'After joining orders to a customer_addresses table on customer_id, total revenue comes out almost twice what Finance reports. What has happened, how would you confirm it in SQL, and how would you fix the query?',
        [
          'Identifies a one-to-many join: customers with several addresses repeat their orders (fan-out)',
          'Confirms it with SQL, e.g. GROUP BY customer_id HAVING COUNT(*) > 1 on the addresses table, or comparing COUNT(*) before and after the join',
          'Fixes it by joining to one row per customer (filter to the current/primary address, or aggregate/deduplicate first) or totalling before the join',
        ],
        'Some customers have more than one address, so the join repeats each of their orders once per address. SELECT customer_id, COUNT(*) FROM customer_addresses GROUP BY customer_id HAVING COUNT(*) > 1 shows them, and COUNT(*) of orders before and after the join will differ. Join to one address per customer (e.g. WHERE is_primary = 1, or a subquery picking one), or sum revenue from orders first and join afterwards.'
      ),
      3
    ),
  ]
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
        ['first file', PY_A],
        ['second file', PY_B],
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
        ['first file', PY_MA],
        ['second file', PY_MB],
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
  [
    answer(
      choice(
        'py-a1',
        'loc or iloc',
        'df has an index of order IDs (1001, 1002, …). What does df.iloc[0] return?',
        ['The first row, whatever its index label', 'The row whose index label is 0', 'The first column', 'An error, because there is no label 0'],
        0
      ),
      1
    ),
    answer(
      match('py-a2', 'Which Method', 'Match each job to the pandas method for it.', [
        ['Total revenue per region', 'groupby'],
        ['Add customer details to each order', 'merge'],
        ['Regions as rows, months as columns', 'pivot_table'],
        ['Drop rows with a missing amount', 'dropna'],
      ]),
      2
    ),
    answer(short('py-a3', 'Distinct Values', "df['region'] holds North, South, North, East, South, North. What does df['region'].nunique() return?", ['3']), 1),
    answer(
      written(
        'py-a4',
        'More Rows After a Merge',
        "orders has 5,000 rows. After merged = orders.merge(customers, on='customer_id', how='left'), merged has 5,400 rows. What has happened, how would you find the cause, and how would you stop it happening unnoticed?",
        [
          'Identifies duplicate customer_id values in customers, so matching orders are repeated',
          "Finds them, e.g. customers['customer_id'].duplicated().sum() or value_counts() on the key",
          "Fixes it (deduplicate customers / pick one row per customer) and guards it, e.g. merge(..., validate='many_to_one') or checking the row count after the merge",
        ],
        "Some customer_ids appear more than once in customers, so every order of theirs is repeated. customers['customer_id'].duplicated().sum() (or value_counts()) shows which. Deduplicate customers first, and merge with validate='many_to_one' so pandas raises an error if it happens again, or assert the row count is unchanged."
      ),
      3
    ),
  ]
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
  [
    answer(
      choice(
        'cl-a1',
        'Missing Emails',
        '8% of member records have no email address, and the new system needs one for marketing only. What should you do with those records?',
        ['Keep and import them, flag the missing email, and report how many', 'Delete them so the import is clean', 'Fill the blanks with a placeholder like none@brightwell.com', 'Hold the whole import until every email is found'],
        0
      ),
      1
    ),
    answer(
      order('cl-a2', 'Cleaning Step by Step', 'Put these steps in the order you’d do them.', [
        'Keep an untouched copy of the raw data',
        'Profile it: counts, blanks, duplicates, odd values',
        'Fix the problems, with formulas or rules you can rerun',
        'Check the result against the raw counts and totals',
        'Write down what you changed and why',
      ]),
      2
    ),
    answer(
      multi(
        'cl-a3',
        'Spot the Problems',
        'A join_date column holds: 03/04/2026, 2026-04-05, 31/12/2025, 12/31/2025, (blank), 2027-01-15. Today is 1 May 2026. Which problems does it have? Tick all that apply.',
        ['Mixed date formats', 'Both day-first and month-first dates', 'A missing value', 'A date in the future', 'Duplicate rows'],
        [0, 1, 2, 3]
      ),
      2
    ),
    answer(
      written(
        'cl-a4',
        'Is It an Outlier or an Error?',
        'One member’s monthly fee is £3,900; every other fee is between £19 and £65. What would you do before deciding whether to fix, keep or remove it?',
        [
          'Checks the source record and context (contract type, corporate or annual plan, a misplaced decimal / missing decimal point such as £39.00)',
          'Asks the owner of the data (membership or finance team) rather than guessing',
          "Doesn't delete it silently: corrects a confirmed error, keeps a confirmed real value, and records the decision",
        ],
        'I’d look at the record itself (is it an annual or corporate plan, or a typed £39.00 missing its decimal point?), check the payment history, and ask the membership team. If it’s an error I’d correct it at source; if it’s real I’d keep it and label it. Either way I’d log what I changed rather than drop the row quietly.'
      ),
      3
    ),
  ]
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
  [
    answer(
      match('rp-a1', 'Pick the Chart', 'Match each thing to show to the chart that suits it.', [
        ['Monthly revenue over two years', 'Line chart'],
        ['Revenue by region this month', 'Bar chart'],
        ['A single KPI against its target', 'Big number with the target and change'],
        ['How order values are spread', 'Histogram'],
      ]),
      2
    ),
    answer(
      choice(
        'rp-a2',
        'The Top of the Page',
        'What should go at the top left of a leadership dashboard?',
        ['The few KPIs that matter most, each with its target or comparison', 'A table of every metric available', 'Filters and settings', 'The data sources and refresh time'],
        0
      ),
      1
    ),
    answer(
      multi(
        'rp-a3',
        'Honest Charts',
        'Which of these make a chart misleading? Tick all that apply.',
        ['A bar chart whose axis starts at 95 instead of 0', 'Two lines on different scales with no labels', 'A 3D pie chart with 9 slices', 'Sorting bars from largest to smallest', 'Labelling the axis units'],
        [0, 1, 2]
      ),
      2
    ),
    answer(
      written(
        'rp-a4',
        '40 Metrics',
        'The sales director asks for every one of the team’s 40 metrics on a single dashboard "so nothing is missed". What do you do?',
        [
          'Asks what decisions the dashboard is for and who uses it, rather than just building it',
          'Proposes a small set of headline KPIs on the main page (around 5 to 8), each with a target or comparison',
          'Keeps the rest available in a detail page, drill-down or appendix rather than dropping them',
          'Explains why: 40 metrics on one page hides what needs attention',
        ],
        'I’d ask what decisions they make from it each week. Then I’d propose a front page with the six or so KPIs that drive those decisions, each with its target and trend, and put the other metrics on a detail tab they can drill into. Forty numbers on one page means nobody sees the one that’s gone red.'
      ),
      3
    ),
  ]
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
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
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
  [
    answer(
      choice(
        'mt-a1',
        'What p < 0.05 Means',
        'A test of a new onboarding flow gives p = 0.03 for the rise in activation. What does that tell you?',
        [
          'If the new flow made no difference, a result this big would happen by chance only about 3% of the time',
          'There is a 97% chance the new flow is better',
          'The new flow raises activation by 3%',
          'The result is big enough to matter to the business',
        ],
        0
      ),
      1
    ),
    answer(
      match('mt-a2', 'Metric and Formula', 'Match each metric to how it’s worked out.', [
        ['Conversion rate', 'Orders ÷ visitors'],
        ['Churn rate', 'Customers lost ÷ customers at the start'],
        ['Average order value', 'Revenue ÷ orders'],
        ['Customer acquisition cost', 'Marketing spend ÷ new customers'],
      ]),
      2
    ),
    answer(short('mt-a3', 'Percent or Points', 'Activation rose from 40% to 46%. By what percentage (relative) did it rise? (A number.)', ['15', '15%', '15 percent']), 1),
    answer(
      written(
        'mt-a4',
        'An Uneven Split',
        'An A/B test was set to send half of new users to each version. After two weeks, A has 10,000 users and B has 8,600. B’s conversion is higher. What does the split tell you, and what would you do before trusting the result?',
        [
          'Recognises a sample ratio mismatch: a 50/50 split this far off is very unlikely by chance, so assignment or tracking is broken',
          'Says the result can’t be trusted as it stands, since the missing B users may differ (e.g. a browser or device that crashed or wasn’t tracked)',
          'Investigates the cause (assignment code, tracking, a browser/device/app version where B users are lost) and re-runs or corrects before deciding',
        ],
        'That’s a sample ratio mismatch: with a 50/50 split, 10,000 against 8,600 is far beyond chance, so something is losing B users, such as a page that fails on one browser or tracking that doesn’t fire. Those missing users probably aren’t like the rest, so B’s higher conversion can’t be trusted. I’d find where B users drop out, fix it, and re-run the test before deciding.'
      ),
      3
    ),
  ]
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
  [
    answer(
      choice(
        'im-a1',
        'Lost Zeros',
        'Product codes like 00123 turn into 123 when a CSV is opened in a spreadsheet. What’s the right fix?',
        ['Import the column as text, so the codes are kept exactly', 'Add the zeros back by hand afterwards', 'Format the cells to show five digits', 'Ask the supplier to stop using zeros'],
        0
      ),
      1
    ),
    answer(
      match('im-a2', 'What Went Wrong', 'Match each symptom to its cause.', [
        ['Café shows as CafÃ©', 'The wrong text encoding'],
        ['Every row lands in column A', 'The wrong delimiter'],
        ['04/03 became 3 April, and 25/03 stayed as text', 'Day-first dates read month first'],
        ['Totals ignore some prices', 'Numbers imported as text'],
      ]),
      2
    ),
    answer(short('im-a3', 'TSV', 'What character separates the columns in a .tsv file? (One word.)', ['tab', 'a tab', 'tabs', 'tab character', '\\t']), 1),
    answer(
      written(
        'im-a4',
        'Prove Nothing Was Lost',
        'You’ve loaded a 48,000-row sales file into the warehouse. Before anyone uses it, how do you show the import is complete and nothing was changed?',
        [
          'Compares row counts between the source file and the loaded table (and investigates any difference, e.g. header, blank lines, rejected rows)',
          'Compares control totals (e.g. sum of amounts, min/max dates, distinct counts of key columns) between source and target',
          'Checks types and formats survived: no unexpected NULLs, leading zeros, decimals, dates and special characters intact (spot-check rows)',
          'Records the checks so others can see them (and automates them for the next load)',
        ],
        'Count rows in the file and the table; total the amounts and compare; check the date range and the number of distinct customers or SKUs match; look for NULLs where the file had values; and spot-check a few rows with leading zeros, accents and large numbers end to end. I’d keep those checks with the load so they run every time.'
      ),
      3
    ),
  ]
);

export const DA_MODULE_TESTS: AssessmentTest[] = [EXCEL_TEST, SQL_TEST, PYTHON_TEST, CLEANING_TEST, REPORTING_TEST, METRICS_TEST, IMPORTING_TEST];
