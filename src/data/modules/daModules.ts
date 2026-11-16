import { AssessmentTest, DataTable, Question, TestScenario } from '../../types';
import { workbookStarter } from '../../lib/spreadsheet';
import { databaseStarter } from '../../lib/databaseWork';
import { toCsv } from '../../lib/csv';
import { choice, match, multi, order, short, written } from '../questionKit';
import { round2, seeded, sum, tc } from '../simulationKit';

/**
 * The Data Analyst modules: one Mid-level test per tool or skill, about 20 minutes, with as many practical tasks as
 * answer questions. Every question is about the module's own tool or skill: four practical tasks worked in the real
 * environment (spreadsheet, SQL database, Python with pandas), each small and checked on its result, then four answer
 * questions of different kinds. The data is generated from fixed seeds, so it's the same for every candidate, and every
 * expected answer is worked out here.
 */

const DA = ['Data Analyst'] as AssessmentTest['roles'];
const PRACTICAL_WEIGHT = 15;
const ANSWER_WEIGHT = 10;

const sheetTask = (
  id: string,
  title: string,
  file: string,
  prompt: string,
  sheets: { name: string; rows: (string | number | null)[][] }[],
  checks: [description: string, formula: string, expected: string][],
  minutes = 3
): Question => ({
  id,
  title,
  type: 'sheet',
  contextData: file,
  prompt,
  starterCode: workbookStarter(sheets),
  testCases: checks.map(([d, f, e], i) => tc(`tc-${id}-${i + 1}`, d, f, e)),
  timeLimitMinutes: minutes,
  weight: PRACTICAL_WEIGHT,
});

// A database task: the candidate creates a view; each check reads it, compared with the same view built by the solution
const dbTask = (id: string, title: string, database: string, prompt: string, tables: DataTable[], starter: string, solution: string, checks: [string, string][], minutes = 3): Question => ({
  id,
  title,
  type: 'database',
  contextData: database,
  prompt,
  tables,
  starterCode: databaseStarter(starter),
  solutionCode: solution,
  testCases: checks.map(([d, q], i) => tc(`tc-${id}-${i + 1}`, d, q)),
  timeLimitMinutes: minutes,
  weight: PRACTICAL_WEIGHT,
});

// A Python task: the data arrives as CSV on standard input, and what the program prints is compared with the expected
// output. Two data sets, so the answer has to be worked out, not typed in
const PY_STARTER = `import sys
import pandas as pd

df = pd.read_csv(sys.stdin)

# Your code here
`;
const pyTask = (id: string, title: string, prompt: string, cases: [description: string, csv: string, expected: string][], solution: string, minutes = 3): Question => ({
  id,
  title,
  type: 'code',
  language: 'python',
  prompt,
  starterCode: PY_STARTER,
  solutionCode: solution,
  testCases: cases.map(([d, input, out], i) => ({ id: `tc-${id}-${i + 1}`, description: d, input, expectedOutput: out })),
  timeLimitMinutes: minutes,
  weight: PRACTICAL_WEIGHT,
});

const answer = (q: Question, minutes: number): Question => ({ ...q, timeLimitMinutes: minutes, weight: ANSWER_WEIGHT });

const moduleTest = (
  id: string,
  title: string,
  description: string,
  skillsTested: string[],
  scenario: TestScenario,
  practical: Question[],
  answers: Question[]
): AssessmentTest => {
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
  const rows = Array.from({ length: 12 }, (_, i) => ({ id: `LF-${7001 + i}`, sku: pick(rand, XL_PRODUCTS)[0] as string, qty: 1 + Math.floor(rand() * 3) }));
  rows[8] = { ...rows[8], sku: 'LO-999' };
  return rows;
})();
const xlPrice = (sku: string) => XL_PRODUCTS.find((p) => p[0] === sku)?.[2] ?? 0;
const XL_LINE_TOTAL = sum(XL_ORDERS.map((o) => o.qty * xlPrice(o.sku)));

const XL_SALES = (() => {
  const rand = seeded(5151);
  return Array.from({ length: 30 }, (_, i) => ({
    date: `2026-03-${String(1 + Math.floor(i / 1.1)).padStart(2, '0')}`,
    region: pick(rand, REGIONS),
    channel: rand() < 0.55 ? 'Web' : 'Store',
    revenue: round2(20 + rand() * 180),
  }));
})();
const xlWeb = (r: string) => round2(sum(XL_SALES.filter((s) => s.region === r && s.channel === 'Web').map((s) => s.revenue)));
const xlBig = (r: string) => XL_SALES.filter((s) => s.region === r && s.revenue > 100).length;

const XL_REPS = (() => {
  const rand = seeded(5152);
  const names = ['Asha Patel', 'Ben Cole', 'Chloe Wu', 'Dan Reid', 'Ella Shaw', 'Finn Moss', 'Gita Rao', 'Harry Lim', 'Isla Kerr', 'Jack Byrne'];
  return names.map((name) => ({ name, sales: Math.round(18000 + rand() * 24000), target: 30000 }));
})();
const XL_REP_SALES = sum(XL_REPS.map((r) => r.sales));
const XL_BONUSES = XL_REPS.filter((r) => r.sales >= r.target).length;

const XL_CONTACTS = [
  ['  amy ', 'JONES', 'Amy.Jones@Northwind.co.uk'],
  ['RAVI', ' shah ', 'ravi.shah@Brightline.com'],
  ['claire', 'o’neill ', 'C.ONeill@northwind.co.uk'],
  [' Tom', 'baker', 'tom@harbourfoods.co.uk'],
  ['lena ', ' MÜLLER', 'Lena.Muller@Brightline.com'],
  ['sam', 'OKAFOR', 'sam.okafor@NORTHWIND.CO.UK'],
] as const;
const titleCase = (s: string) => s.trim().toLowerCase().replace(/(^|[^a-zà-ÿ’'])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase());

const EXCEL_TEST = moduleTest(
  'test-da-excel',
  'Excel',
  'Four tasks in a working spreadsheet (lookups, conditional totals, absolute references and logic, text functions), then four questions on how Excel works.',
  ['Excel', 'XLOOKUP', 'SUMIFS', 'Formulas', 'PivotTables'],
  {
    company: 'Larkfield Outdoor',
    role: 'Data Analyst',
    brief: `Larkfield Outdoor sells camping gear online and in two shops. Colleagues send you spreadsheets to finish. Each task opens its own workbook.

Use formulas wherever a task asks for them, so the sheet still works when the data changes.`,
  },
  [
    sheetTask(
      'xl-p1',
      'Look Up the Products',
      'orders_lookup.xlsx',
      `The Orders sheet has each order's SKU and quantity; the Products sheet lists every product and its price.

On the Orders sheet, for every order row, with formulas:
• Column D (Product): the product name for the SKU, or the text Not found when the SKU isn't on the Products sheet
• Column E (Line Total): quantity × the product's price, or 0 when the SKU isn't found`,
      [
        { name: 'Orders', rows: [['Order ID', 'SKU', 'Qty', 'Product', 'Line Total'], ...XL_ORDERS.map((o) => [o.id, o.sku, o.qty])] },
        { name: 'Products', rows: [['SKU', 'Product', 'Price'], ...XL_PRODUCTS.map((p) => [...p])] },
      ],
      [
        ['Product names are looked up', `=Orders!D2`, XL_PRODUCTS.find((p) => p[0] === XL_ORDERS[0].sku)![1]],
        ['The unknown SKU shows Not found', `=Orders!D10`, 'Not found'],
        ['Line totals add up to the right amount', `=SUM(Orders!E2:E13)`, String(XL_LINE_TOTAL)],
        ['Both columns are formulas to the last row', `=AND(ISFORMULA(Orders!D13),ISFORMULA(Orders!E13))`, 'TRUE'],
      ]
    ),
    sheetTask(
      'xl-p2',
      'Totals by Region',
      'march_sales.xlsx',
      `The Sales sheet has every sale in March. On the Summary sheet, with one formula per cell for each region in A2:A5:
• Column B: revenue from the Web channel only
• Column C: the number of sales (any channel) over £100`,
      [
        { name: 'Sales', rows: [['Date', 'Region', 'Channel', 'Revenue'], ...XL_SALES.map((s) => [s.date, s.region, s.channel, s.revenue])] },
        { name: 'Summary', rows: [['Region', 'Web revenue', 'Sales over £100'], ...REGIONS.map((r) => [r])] },
      ],
      [
        ['North web revenue is right', '=Summary!B2', String(xlWeb('North'))],
        ['Web revenue is right for every region', '=SUM(Summary!B2:B5)', String(round2(sum(REGIONS.map(xlWeb))))],
        ['Sales over £100 are counted right', '=Summary!C2&"/"&Summary!C3&"/"&Summary!C4&"/"&Summary!C5', REGIONS.map(xlBig).join('/')],
        ['Worked out by formula', '=AND(ISFORMULA(Summary!B5),ISFORMULA(Summary!C5))', 'TRUE'],
      ]
    ),
    sheetTask(
      'xl-p3',
      'Commission and Bonus',
      'q1_commission.xlsx',
      `The Reps sheet has each sales rep's Q1 sales and target. The commission rate is in G1.

1. Column D (Commission): sales × the rate in G1, as one formula filled down, which must keep pointing at G1.
2. Column E (Bonus): Yes if the rep's sales are at or above their target, otherwise No.
3. Finance has just raised the rate: change G1 to 6%. Every commission should update.`,
      [{ name: 'Reps', rows: [['Rep', 'Sales', 'Target', 'Commission', 'Bonus', 'Commission rate', 0.05], ...XL_REPS.map((r) => [r.name, r.sales, r.target])] }],
      [
        ['Commission follows the rate in G1 (now 6%)', '=SUM(Reps!D2:D11)', String(round2(XL_REP_SALES * 0.06))],
        ['The last rep’s commission is right', '=Reps!D11', String(round2(XL_REPS[9].sales * 0.06))],
        ['Bonuses are given to the right reps', '=COUNTIF(Reps!E2:E11,"Yes")&"/"&COUNTIF(Reps!E2:E11,"No")', `${XL_BONUSES}/${10 - XL_BONUSES}`],
        ['Both columns are formulas', '=AND(ISFORMULA(Reps!D11),ISFORMULA(Reps!E11))', 'TRUE'],
      ]
    ),
    sheetTask(
      'xl-p4',
      'Tidy the Contact List',
      'contacts.xlsx',
      `The Contacts sheet was typed in by hand. With formulas, for every row:
• Column D (Full Name): first and last name with no extra spaces, each capitalised (e.g. Amy Jones)
• Column E (Domain): the part of the email after the @, in lower case (e.g. northwind.co.uk)`,
      [{ name: 'Contacts', rows: [['First', 'Last', 'Email', 'Full Name', 'Domain'], ...XL_CONTACTS.map((c) => [...c])] }],
      [
        ['Names are trimmed and capitalised', '=Contacts!D2&"/"&Contacts!D3', `${titleCase(XL_CONTACTS[0][0])} ${titleCase(XL_CONTACTS[0][1])}/${titleCase(XL_CONTACTS[1][0])} ${titleCase(XL_CONTACTS[1][1])}`],
        ['The last name is right too', '=Contacts!D7', 'Sam Okafor'],
        ['Domains are in lower case', '=COUNTIF(Contacts!E2:E7,"northwind.co.uk")&"/"&EXACT(Contacts!E7,"northwind.co.uk")', '3/TRUE'],
        ['Both columns are formulas', '=AND(ISFORMULA(Contacts!D7),ISFORMULA(Contacts!E7))', 'TRUE'],
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
  const active = ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08'];
  return Array.from({ length: 36 }, (_, i) => ({
    order_id: 5001 + i,
    customer_id: pick(rand, active),
    order_date: `2026-0${1 + Math.floor(i / 12)}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
    status: rand() < 0.85 ? 'delivered' : rand() < 0.5 ? 'refunded' : 'cancelled',
    amount: round2(15 + rand() * 160),
  }));
})();
const SQ_TABLES: DataTable[] = [
  { name: 'customers', columns: ['customer_id', 'name', 'region', 'signup_date'], rows: SQ_CUSTOMERS.map(([customer_id, name, region, signup_date]) => ({ customer_id, name, region, signup_date })) },
  { name: 'orders', columns: ['order_id', 'customer_id', 'order_date', 'status', 'amount'], rows: SQ_ORDERS.map((o) => ({ ...o })) },
];
const SQ_DB = 'Fernway: customers, orders';

const SQL_TEST = moduleTest(
  'test-da-sql',
  'SQL',
  'Four queries against a real database (filtering, joining and grouping, finding what’s missing, window functions), then four questions on how SQL works.',
  ['SQL', 'Joins', 'Aggregation', 'Window Functions'],
  {
    company: 'Fernway',
    role: 'Data Analyst',
    brief: `Fernway sells houseplants online. Its database has two tables:

• customers: customer_id, name, region, signup_date
• orders: order_id, customer_id, order_date, status ('delivered', 'refunded' or 'cancelled'), amount

Each task asks you to save a query as a view, so it can be checked. Only delivered orders count as revenue.`,
  },
  [
    dbTask(
      'sql-p1',
      'Big March Orders',
      SQ_DB,
      `Create a view named big_orders: every delivered order in March 2026 worth more than £100, with order_id, customer_id and amount.`,
      SQ_TABLES,
      '-- Save your query as a view\nCREATE VIEW big_orders AS\nSELECT\n',
      `CREATE VIEW big_orders AS SELECT order_id, customer_id, amount FROM orders WHERE status = 'delivered' AND order_date >= '2026-03-01' AND order_date < '2026-04-01' AND amount > 100;`,
      [
        ['The right orders, no more and no fewer', 'SELECT order_id FROM big_orders ORDER BY order_id'],
        ['Their customers and amounts are right', 'SELECT order_id, customer_id, amount FROM big_orders ORDER BY order_id'],
      ]
    ),
    dbTask(
      'sql-p2',
      'Revenue by Region',
      SQ_DB,
      `Create a view named region_revenue with one row per region that has delivered orders: region, orders (the number of delivered orders) and revenue (their total, rounded to 2 decimal places).`,
      SQ_TABLES,
      'CREATE VIEW region_revenue AS\nSELECT\n',
      `CREATE VIEW region_revenue AS SELECT c.region, COUNT(*) AS orders, ROUND(SUM(o.amount), 2) AS revenue FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.region;`,
      [
        ['Every region is there once', 'SELECT region FROM region_revenue ORDER BY region'],
        ['Order counts are right', 'SELECT region, orders FROM region_revenue ORDER BY region'],
        ['Revenue is right', 'SELECT region, revenue FROM region_revenue ORDER BY region'],
      ]
    ),
    dbTask(
      'sql-p3',
      'Never Ordered',
      SQ_DB,
      `Marketing wants to email customers who signed up but have never placed an order of any kind. Create a view named no_orders with their customer_id and name.`,
      SQ_TABLES,
      'CREATE VIEW no_orders AS\nSELECT\n',
      `CREATE VIEW no_orders AS SELECT c.customer_id, c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL;`,
      [['Exactly the customers with no orders', 'SELECT customer_id, name FROM no_orders ORDER BY customer_id']]
    ),
    dbTask(
      'sql-p4',
      'Best Customer in Each Region',
      SQ_DB,
      `Create a view named region_leaders: each customer's delivered revenue (customer_id, region, revenue rounded to 2 decimal places) and rank_in_region, 1 for the highest in their region. Include every customer who has delivered orders.`,
      SQ_TABLES,
      '-- Tip: a window function such as RANK() OVER (PARTITION BY ... ORDER BY ...)\nCREATE VIEW region_leaders AS\n',
      `CREATE VIEW region_leaders AS SELECT customer_id, region, revenue, RANK() OVER (PARTITION BY region ORDER BY revenue DESC) AS rank_in_region FROM (SELECT c.customer_id, c.region, ROUND(SUM(o.amount), 2) AS revenue FROM orders o JOIN customers c ON c.customer_id = o.customer_id WHERE o.status = 'delivered' GROUP BY c.customer_id, c.region);`,
      [
        ['Each customer’s revenue is right', 'SELECT customer_id, revenue FROM region_leaders ORDER BY customer_id'],
        ['Ranks restart in each region, highest first', 'SELECT customer_id, rank_in_region FROM region_leaders ORDER BY customer_id'],
        ['The leader of each region is right', 'SELECT region, customer_id FROM region_leaders WHERE rank_in_region = 1 ORDER BY region'],
      ],
      4
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
    rows[5] = { ...rows[5], amount: null };
    rows.push({ ...rows[1] }, { ...rows[4] });
  }
  return rows;
};
const pyCsv = (rows: PyRow[]) => toCsv([['order_id', 'date', 'region', 'status', 'amount'], ...rows.map((r) => [r.order_id, r.date, r.region, r.status, r.amount === null ? '' : r.amount])]);
const PY_A = pyRows(7101, 14);
const PY_B = pyRows(7102, 11);
const PY_MA = pyRows(7103, 12, true);
const PY_MB = pyRows(7104, 10, true);

const pyDelivered = (rows: PyRow[]) => {
  const d = rows.filter((r) => r.status === 'delivered');
  return `${d.length}\n${money(sum(d.map((r) => r.amount ?? 0)))}`;
};
const pyByRegion = (rows: PyRow[]) =>
  [...new Set(rows.map((r) => r.region))]
    .sort()
    .map((reg) => `${reg},${money(sum(rows.filter((r) => r.region === reg && r.status === 'delivered').map((r) => r.amount ?? 0)))}`)
    .join('\n');
const pyClean = (rows: PyRow[]) => {
  const seen = new Set<number>();
  const unique = rows.filter((r) => (seen.has(r.order_id) ? false : (seen.add(r.order_id), true)));
  const clean = unique.map((r) => ({ ...r, region: titleCase(r.region) }));
  const regions = [...new Set(clean.map((r) => r.region))].sort();
  return [String(clean.length), String(clean.filter((r) => r.amount === null).length), regions.join(',')].join('\n');
};
const pyMonthly = (rows: PyRow[]) =>
  [...new Set(rows.map((r) => r.date.slice(0, 7)))]
    .sort()
    .map((m) => `${m},${money(sum(rows.filter((r) => r.date.startsWith(m) && r.status === 'delivered').map((r) => r.amount ?? 0)))}`)
    .join('\n');

const PYTHON_TEST = moduleTest(
  'test-da-python',
  'Python',
  'Four pandas tasks on real data (filtering, grouping, cleaning, dates), then four questions on how pandas works.',
  ['Python', 'pandas', 'Data Cleaning', 'Aggregation'],
  {
    company: 'Fernway',
    role: 'Data Analyst',
    brief: `Fernway's order exports are CSV files with the columns order_id, date (YYYY-MM-DD), region, status ('delivered' or 'refunded') and amount.

In each task your program reads the file from standard input (the starter code already loads it into df with pandas) and prints exactly what's asked. It's run on two different files, so work the answer out from the data.`,
  },
  [
    pyTask(
      'py-p1',
      'Delivered Orders',
      'Print two lines: the number of delivered orders, then their total amount to 2 decimal places (e.g. 1234.50).',
      [
        ['First file', pyCsv(PY_A), pyDelivered(PY_A)],
        ['Second file', pyCsv(PY_B), pyDelivered(PY_B)],
      ],
      `import sys\nimport pandas as pd\n\ndf = pd.read_csv(sys.stdin)\nd = df[df['status'] == 'delivered']\nprint(len(d))\nprint(f"{d['amount'].sum():.2f}")\n`
    ),
    pyTask(
      'py-p2',
      'Revenue by Region',
      'Print one line per region, in alphabetical order, as region,revenue: the total amount of its delivered orders to 2 decimal places (e.g. East,512.40). A region whose orders were all refunded shows 0.00.',
      [
        ['First file', pyCsv(PY_A), pyByRegion(PY_A)],
        ['Second file', pyCsv(PY_B), pyByRegion(PY_B)],
      ],
      `import sys\nimport pandas as pd\n\ndf = pd.read_csv(sys.stdin)\ndf['delivered'] = df['amount'].where(df['status'] == 'delivered', 0)\nfor region, total in df.groupby('region')['delivered'].sum().sort_index().items():\n    print(f"{region},{total:.2f}")\n`
    ),
    pyTask(
      'py-p3',
      'Clean the Export',
      `This export has problems: some orders appear twice (the same order_id), some regions have stray spaces or the wrong capitals, and some amounts are missing.

Keep the first copy of each order_id, and tidy region to the form North, South, East, West. Then print three lines: the number of orders left, how many of them have a missing amount, and the distinct regions in alphabetical order separated by commas (e.g. East,North,South).`,
      [
        ['First file', pyCsv(PY_MA), pyClean(PY_MA)],
        ['Second file', pyCsv(PY_MB), pyClean(PY_MB)],
      ],
      `import sys\nimport pandas as pd\n\ndf = pd.read_csv(sys.stdin)\ndf = df.drop_duplicates(subset='order_id', keep='first')\ndf['region'] = df['region'].str.strip().str.title()\nprint(len(df))\nprint(df['amount'].isna().sum())\nprint(','.join(sorted(df['region'].unique())))\n`,
      4
    ),
    pyTask(
      'py-p4',
      'Revenue by Month',
      'Print one line per month in the file, earliest first, as YYYY-MM,revenue: the total of that month’s delivered orders to 2 decimal places (e.g. 2026-01,880.25).',
      [
        ['First file', pyCsv(PY_A), pyMonthly(PY_A)],
        ['Second file', pyCsv(PY_B), pyMonthly(PY_B)],
      ],
      `import sys\nimport pandas as pd\n\ndf = pd.read_csv(sys.stdin, parse_dates=['date'])\ndf['month'] = df['date'].dt.strftime('%Y-%m')\ndf['delivered'] = df['amount'].where(df['status'] == 'delivered', 0)\nfor month, total in df.groupby('month')['delivered'].sum().sort_index().items():\n    print(f"{month},{total:.2f}")\n`
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
  const rows = firsts.map((f, i) => ({ id: `M${101 + i}`, name: `${f} ${pick(rand, ['Hill', 'Ward', 'Price', 'Lowe', 'Cole'])}`, region: pick(rand, REGIONS) as string, age: 18 + Math.floor(rand() * 50) }));
  return rows;
})();
const CL_DUPES = ['M103', 'M108', 'M112'];
const CL_WITH_DUPES = CL_MEMBERS.flatMap((m) => (CL_DUPES.includes(m.id) ? [m, m] : [m]));
const CL_REGION_MESS: Record<number, string> = { 1: 'north ', 4: 'SOUTH', 6: ' East', 9: 'Wset', 13: 'Nrth' };
const CL_REGION_ROWS = CL_MEMBERS.map((m, i) => ({ ...m, raw: CL_REGION_MESS[i] ?? m.region, region: CL_REGION_MESS[i] === 'Wset' ? 'West' : CL_REGION_MESS[i] === 'Nrth' ? 'North' : CL_REGION_MESS[i] ? titleCase(CL_REGION_MESS[i]) : m.region }));
const CL_AMOUNTS = [['INV-01', '£1,250.00', 1250], ['INV-02', ' 45 ', 45], ['INV-03', '£312.50', 312.5], ['INV-04', '2,040', 2040], ['INV-05', '£19.99', 19.99], ['INV-06', '600', 600], ['INV-07', '£ 87.10', 87.1], ['INV-08', '1,005.75', 1005.75]] as const;
const CL_AGES = CL_MEMBERS.map((m, i) => ({ ...m, age: i === 2 ? null : i === 7 ? -4 : i === 11 ? 214 : m.age }));
const CL_INVALID = CL_AGES.filter((m) => m.age === null || m.age < 0 || m.age > 120).length;

const CLEANING_TEST = moduleTest(
  'test-da-cleaning',
  'Data Cleaning',
  'Four cleaning tasks in a working spreadsheet (duplicates, inconsistent categories, numbers stored as text, invalid values), then four questions on cleaning data properly.',
  ['Data Cleaning', 'Data Quality', 'Validation', 'Excel'],
  {
    company: 'Brightwell Gyms',
    role: 'Data Analyst',
    brief: `Brightwell Gyms is moving its member records into a new system, and the old exports are messy. Each task opens its own workbook. Fix the data so the new system gets it right.`,
  },
  [
    sheetTask(
      'cl-p1',
      'Remove the Duplicates',
      'members_export.xlsx',
      'The export repeated some members: the same Member ID on two identical rows. Leave one row per member on the Members sheet, starting at A1 with no blank rows, and don’t lose anyone.',
      [{ name: 'Members', rows: [['Member ID', 'Name', 'Region', 'Age'], ...CL_WITH_DUPES.map((m) => [m.id, m.name, m.region, m.age])] }],
      [
        ['Each repeated member appears once', `=COUNTIF(Members!A:A,"${CL_DUPES[0]}")+COUNTIF(Members!A:A,"${CL_DUPES[1]}")+COUNTIF(Members!A:A,"${CL_DUPES[2]}")`, '3'],
        [`No member lost: ${CL_MEMBERS.length} remain`, '=COUNTA(Members!A:A)-1', String(CL_MEMBERS.length)],
        ['The first and last members are still there', `=COUNTIF(Members!A:A,"M101")+COUNTIF(Members!A:A,"M116")`, '2'],
      ]
    ),
    sheetTask(
      'cl-p2',
      'One Spelling per Region',
      'members_regions.xlsx',
      'Region was typed by hand. Make every value in column C read exactly North, South, East or West (no spaces, typos or odd capitals), on the Members sheet itself.',
      [{ name: 'Members', rows: [['Member ID', 'Name', 'Region'], ...CL_REGION_ROWS.map((m) => [m.id, m.name, m.raw])] }],
      [
        ['Every region is one of the four', '=COUNTIF(Members!C:C,"North")+COUNTIF(Members!C:C,"South")+COUNTIF(Members!C:C,"East")+COUNTIF(Members!C:C,"West")', String(CL_MEMBERS.length)],
        ['The typos went to the right region', `=Members!C11&"/"&Members!C15`, `${CL_REGION_ROWS[9].region}/${CL_REGION_ROWS[13].region}`],
        ['Each region has the right number of members', '=' + REGIONS.map((r) => `COUNTIF(Members!C:C,"${r}")`).join('&"/"&'), REGIONS.map((r) => CL_REGION_ROWS.filter((m) => m.region === r).length).join('/')],
      ]
    ),
    sheetTask(
      'cl-p3',
      'Numbers Stored as Text',
      'invoices.xlsx',
      'The Amount column came in as text ("£1,250.00", " 45 "), so it can’t be added up. In column C (Amount Value), turn each into a real number with a formula. C10 already totals the column.',
      [{ name: 'Invoices', rows: [['Invoice', 'Amount', 'Amount Value'], ...CL_AMOUNTS.map(([i, a]) => [i, `'${a}`]), [null, 'Total', '=SUM(C2:C9)']] }],
      [
        ['The total is right', '=Invoices!C10', String(round2(sum(CL_AMOUNTS.map((a) => a[2]))))],
        ['Each value is a number', '=COUNT(Invoices!C2:C9)', '8'],
        ['Worked out by formula', '=AND(ISFORMULA(Invoices!C2),ISFORMULA(Invoices!C9))', 'TRUE'],
      ]
    ),
    sheetTask(
      'cl-p4',
      'Flag Impossible Ages',
      'members_ages.xlsx',
      'Before import, every row needs a check. In column E (Check), with a formula, show Invalid when Age is blank, below 0 or above 120, and OK otherwise.',
      [{ name: 'Members', rows: [['Member ID', 'Name', 'Region', 'Age', 'Check'], ...CL_AGES.map((m) => [m.id, m.name, m.region, m.age])] }],
      [
        ['The invalid rows are flagged', '=COUNTIF(Members!E:E,"Invalid")', String(CL_INVALID)],
        ['Every other row is OK', '=COUNTIF(Members!E:E,"OK")', String(CL_MEMBERS.length - CL_INVALID)],
        ['The blank age is caught', '=Members!E4', 'Invalid'],
        ['Worked out by formula', '=ISFORMULA(Members!E17)', 'TRUE'],
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
const rpMonth = (m: string) => RP_ORDERS.filter((o) => o.month === m);
const RP_APR = round2(sum(rpMonth('2026-04').map((o) => o.revenue)));
const RP_MAY = round2(sum(rpMonth('2026-05').map((o) => o.revenue)));
const RP_MAY_N = rpMonth('2026-05').length;
const RP_TARGETS = [['North', 2400], ['South', 2100], ['East', 1700], ['West', 2600]] as const;
const RP_ACTUALS = [['North', 2520], ['South', 1960], ['East', 1490], ['West', 2610]] as const;
const rag = (pct: number) => (pct >= 1 ? 'Green' : pct >= 0.9 ? 'Amber' : 'Red');
const RP_PRODUCTS = [['Monstera', 4200], ['Fiddle Leaf Fig', 3150], ['Snake Plant', 2600], ['Pothos', 1900], ['Calathea', 1250], ['Peace Lily', 900]] as const;
const RP_TOTAL = sum(RP_PRODUCTS.map((p) => p[1]));

const REPORTING_TEST = moduleTest(
  'test-da-reporting',
  'Dashboards & Reporting',
  'Four tasks building a real KPI report in a spreadsheet (headline KPIs, month on month, RAG status against target, share of total), then four questions on dashboards people can act on.',
  ['Dashboards', 'KPIs', 'Reporting', 'Data Visualisation'],
  {
    company: 'Fernway',
    role: 'Data Analyst',
    brief: `Fernway's leadership team gets a one-page KPI report every month. You're building May's. Each task opens its own workbook; use formulas so next month's report only needs new data.`,
  },
  [
    sheetTask(
      'rp-p1',
      'Headline KPIs',
      'kpi_may.xlsx',
      `The Orders sheet has April's and May's orders. On the KPI sheet, with formulas:
• B2: May revenue
• B3: May orders
• B4: May average order value
• B5: revenue change from April to May, as a fraction (e.g. 0.12 for +12%)`,
      [
        { name: 'Orders', rows: [['Month', 'Region', 'Revenue'], ...RP_ORDERS.map((o) => [o.month, o.region, o.revenue])] },
        { name: 'KPI', rows: [['KPI', 'May'], ['Revenue'], ['Orders'], ['Average order value'], ['Change vs April']] },
      ],
      [
        ['May revenue is right', '=KPI!B2', String(RP_MAY)],
        ['May orders are right', '=KPI!B3', String(RP_MAY_N)],
        ['Average order value is right', '=KPI!B4', String(RP_MAY / RP_MAY_N)],
        ['The change on April is right', '=KPI!B5', `${RP_MAY / RP_APR - 1}|${(RP_MAY / RP_APR - 1) * 100}`],
      ]
    ),
    sheetTask(
      'rp-p2',
      'Region by Month',
      'region_months.xlsx',
      'On the Report sheet, fill B2:C5 with each region’s revenue for April (column B) and May (column C) from the Orders sheet, using one formula you can fill across and down.',
      [
        { name: 'Orders', rows: [['Month', 'Region', 'Revenue'], ...RP_ORDERS.map((o) => [o.month, o.region, o.revenue])] },
        { name: 'Report', rows: [['Region', '2026-04', '2026-05'], ...REGIONS.map((r) => [r])] },
      ],
      [
        ['April by region is right', '=SUM(Report!B2:B5)&"/"&ROUND(Report!B2,2)', `${RP_APR}/${round2(sum(rpMonth('2026-04').filter((o) => o.region === 'North').map((o) => o.revenue)))}`],
        ['May by region is right', '=ROUND(Report!C5,2)&"/"&ROUND(SUM(Report!C2:C5),2)', `${round2(sum(rpMonth('2026-05').filter((o) => o.region === 'West').map((o) => o.revenue)))}/${RP_MAY}`],
        ['Worked out by formula', '=AND(ISFORMULA(Report!B2),ISFORMULA(Report!C5))', 'TRUE'],
      ]
    ),
    sheetTask(
      'rp-p3',
      'Against Target',
      'targets.xlsx',
      `For each region on the Targets sheet, with formulas:
• Column D: actual as a fraction of target (e.g. 1.05)
• Column E: status Green at or above target, Amber from 90% up to target, Red below 90%`,
      [{ name: 'Targets', rows: [['Region', 'Target', 'Actual', '% of Target', 'Status'], ...RP_TARGETS.map(([r, t], i) => [r, t, RP_ACTUALS[i][1]])] }],
      [
        ['Percent of target is right', '=ROUND(Targets!D3,4)&"/"&ROUND(Targets!D4,4)', [1, 2].map((i) => Math.round((RP_ACTUALS[i][1] / RP_TARGETS[i][1]) * 10000) / 10000).join('/')],
        ['Statuses are right', '=Targets!E2&"/"&Targets!E3&"/"&Targets!E4&"/"&Targets!E5', RP_TARGETS.map(([, t], i) => rag(RP_ACTUALS[i][1] / t)).join('/')],
        ['Worked out by formula', '=AND(ISFORMULA(Targets!D5),ISFORMULA(Targets!E5))', 'TRUE'],
      ]
    ),
    sheetTask(
      'rp-p4',
      'Share of Revenue',
      'products.xlsx',
      'In column C, show each product’s share of total revenue as a fraction (all six add up to 1), with one formula filled down that always divides by the total in B8.',
      [{ name: 'Products', rows: [['Product', 'Revenue', 'Share'], ...RP_PRODUCTS.map((p) => [...p]), [null, null], ['Total', '=SUM(B2:B7)']] }],
      [
        ['Shares add up to 1', '=ROUND(SUM(Products!C2:C7),6)', '1'],
        ['The top product’s share is right', '=ROUND(Products!C2,4)', String(Math.round((RP_PRODUCTS[0][1] / RP_TOTAL) * 10000) / 10000)],
        ['The last product’s share is right', '=ROUND(Products!C7,4)', String(Math.round((RP_PRODUCTS[5][1] / RP_TOTAL) * 10000) / 10000)],
        ['Worked out by formula', '=ISFORMULA(Products!C7)', 'TRUE'],
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

const MT_AB = { A: { visitors: 24800, orders: 868 }, B: { visitors: 25150, orders: 981 } };
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
const MT_UNIT = { spend: 18400, newCustomers: 230, revenue: 96500, activeUsers: 4100 };

const METRICS_TEST = moduleTest(
  'test-da-metrics',
  'Metrics & Statistics',
  'Four tasks working out real business metrics in a spreadsheet (conversion and uplift, retention, averages and spread, unit metrics), then four questions on reading them correctly.',
  ['Metrics', 'A/B Testing', 'Statistics', 'Retention'],
  {
    company: 'Pocketly',
    role: 'Product Analyst',
    brief: `Pocketly is a budgeting app. The product and marketing teams ask you for numbers they can trust. Each task opens its own workbook; use formulas.`,
  },
  [
    sheetTask(
      'mt-p1',
      'Did B Convert Better?',
      'checkout_test.xlsx',
      `On the Test sheet, with formulas:
• D2 and D3: conversion (orders ÷ visitors, as a fraction) for A and B
• D5: B's relative uplift over A, as a fraction (B ÷ A − 1)
• D6: B's lift in percentage points (B − A, × 100)`,
      [{ name: 'Test', rows: [['Variant', 'Visitors', 'Orders', 'Conversion'], ['A', MT_AB.A.visitors, MT_AB.A.orders], ['B', MT_AB.B.visitors, MT_AB.B.orders], [], [null, null, 'Relative uplift'], [null, null, 'Lift (points)']] }],
      (() => {
        const a = MT_AB.A.orders / MT_AB.A.visitors;
        const b = MT_AB.B.orders / MT_AB.B.visitors;
        return [
          ['Conversion for A and B is right', '=ROUND(Test!D2,6)&"/"&ROUND(Test!D3,6)', `${Math.round(a * 1e6) / 1e6}/${Math.round(b * 1e6) / 1e6}`],
          ['Relative uplift is right', '=Test!D5', `${b / a - 1}|${(b / a - 1) * 100}`],
          ['Lift in points is right', '=Test!D6', String((b - a) * 100)],
        ] as [string, string, string][];
      })()
    ),
    sheetTask(
      'mt-p2',
      'Retention by Cohort',
      'cohorts.xlsx',
      'Each row is the month a group of users signed up, with how many were still active one and two months later. In E and F, show month-1 and month-2 retention as fractions of the starting users, and in G each cohort’s churn between month 1 and month 2 (the share of month-1 users lost by month 2).',
      [{ name: 'Cohorts', rows: [['Cohort', 'Users', 'Active M1', 'Active M2', 'Retention M1', 'Retention M2', 'Churn M1→M2'], ...MT_COHORT.map((c) => [...c])] }],
      [
        ['Month-1 retention is right', '=ROUND(Cohorts!E2,4)&"/"&ROUND(Cohorts!E4,4)', `${Math.round((1032 / 1200) * 1e4) / 1e4}/${Math.round((968 / 1100) * 1e4) / 1e4}`],
        ['Month-2 retention is right', '=ROUND(Cohorts!F3,4)', String(Math.round((990 / 1350) * 1e4) / 1e4)],
        ['Churn between months is right', '=ROUND(Cohorts!G2,4)&"/"&ROUND(Cohorts!G4,4)', `${Math.round((1 - 912 / 1032) * 1e4) / 1e4}/${Math.round((1 - 869 / 968) * 1e4) / 1e4}`],
        ['Worked out by formula', '=AND(ISFORMULA(Cohorts!E4),ISFORMULA(Cohorts!G4))', 'TRUE'],
      ]
    ),
    sheetTask(
      'mt-p3',
      'Average, Typical and Spread',
      'subscriptions.xlsx',
      'Column A has 24 annual subscription payments. With formulas: D2 the mean, D3 the median, D4 the standard deviation (sample), and D5 the mean with the single largest payment left out.',
      [{ name: 'Payments', rows: [['Payment', null, null, null], ...MT_VALUES.map((v, i) => (i < 4 ? [v, null, ['Mean', 'Median', 'Std dev', 'Mean without the largest'][i]] : [v]))].map((r, i) => (i === 0 ? ['Payment', null, 'Measure', 'Value'] : r)) }],
      (() => {
        const mean = sum(MT_VALUES) / MT_VALUES.length;
        const sd = Math.sqrt(sum(MT_VALUES.map((v) => (v - mean) ** 2)) / (MT_VALUES.length - 1));
        const max = Math.max(...MT_VALUES);
        return [
          ['Mean is right', '=Payments!D2', String(mean)],
          ['Median is right', '=Payments!D3', String(median(MT_VALUES))],
          ['Standard deviation is right', '=Payments!D4', String(sd)],
          ['Mean without the largest is right', '=Payments!D5', String((sum(MT_VALUES) - max) / (MT_VALUES.length - 1))],
        ] as [string, string, string][];
      })()
    ),
    sheetTask(
      'mt-p4',
      'Unit Metrics',
      'unit_metrics.xlsx',
      'From the figures in B2:B5, work out with formulas: B7 customer acquisition cost (marketing spend per new customer), B8 average revenue per active user, and B9 how many months of that revenue it takes to pay back one customer’s acquisition cost.',
      [{ name: 'Metrics', rows: [['Figure', 'Value'], ['Marketing spend (month)', MT_UNIT.spend], ['New customers (month)', MT_UNIT.newCustomers], ['Revenue (month)', MT_UNIT.revenue], ['Active users (month)', MT_UNIT.activeUsers], [], ['CAC'], ['ARPU (month)'], ['Payback (months)']] }],
      [
        ['CAC is right', '=Metrics!B7', String(MT_UNIT.spend / MT_UNIT.newCustomers)],
        ['ARPU is right', '=Metrics!B8', String(MT_UNIT.revenue / MT_UNIT.activeUsers)],
        ['Payback is right', '=Metrics!B9', String(MT_UNIT.spend / MT_UNIT.newCustomers / (MT_UNIT.revenue / MT_UNIT.activeUsers))],
        ['Worked out by formula', '=AND(ISFORMULA(Metrics!B7),ISFORMULA(Metrics!B9))', 'TRUE'],
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
const IM_STOCK = [['SKU-1', '00412'], ['SKU-2', '01150'], ['SKU-3', '00087'], ['SKU-4', '00239'], ['SKU-5', '00412'], ['SKU-6', '00087']] as const;
const imLead = (code: string) => ({ '00412': 6, '00087': 12, '01150': 4, '00239': 9 })[code]!;
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
  ],
};

const IMPORTING_TEST = moduleTest(
  'test-da-importing',
  'Data Importing',
  'Four tasks bringing real files into a spreadsheet and a database without losing or changing anything (codes with leading zeros, European numbers, day-first dates, a raw table to load into clean types), then four questions on importing data safely.',
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
      'im-p1',
      'Import the Supplier List',
      'stock.xlsx',
      `1. Import suppliers.csv (Import CSV → Files shared with you). It arrives as a new sheet named suppliers.
2. On the Stock sheet, fill column C (Lead Time) with each SKU's supplier lead time in days, looked up from the imported sheet by supplier code.

Watch the codes: they start with zeros.`,
      [{ name: 'Stock', rows: [['SKU', 'Supplier Code', 'Lead Time'], ...IM_STOCK.map(([s, c]) => [s, `'${c}`])] }],
      [
        ['suppliers.csv is imported with all its rows', '=COUNTA(suppliers!A:A)', '5'],
        ['Lead times are looked up correctly', '=Stock!C2&"/"&Stock!C3&"/"&Stock!C4', IM_STOCK.slice(0, 3).map(([, c]) => imLead(c)).join('/')],
        ['Every SKU has its lead time', '=SUM(Stock!C2:C7)', String(sum(IM_STOCK.map(([, c]) => imLead(c))))],
      ]
    ),
    sheetTask(
      'im-p2',
      'European Numbers',
      'german_prices.xlsx',
      'A German supplier’s prices came in as text, written the European way: a full stop for thousands and a comma for decimals ("1.250,50" means 1250.50). In column C, turn each into a real number with a formula. C7 totals them.',
      [{ name: 'Prices', rows: [['Item', 'Price (text)', 'Price'], ...IM_EURO.map(([i, p]) => [i, `'${p}`]), [null, null], [null, 'Total', '=SUM(C2:C6)']] }],
      [
        ['The total is right', '=Prices!C8', String(round2(sum(IM_EURO.map(([, p]) => euro(p)))))],
        ['1.250,50 became 1250.50', '=Prices!C2', '1250.5'],
        ['Worked out by formula', '=AND(ISFORMULA(Prices!C2),ISFORMULA(Prices!C6))', 'TRUE'],
      ]
    ),
    sheetTask(
      'im-p3',
      'Day-First Dates',
      'uk_orders.xlsx',
      'The order dates came in as text in UK order, day first (03/04/2026 is 3 April). In column C, turn each into a real date with a formula, so that the month in column D (already filled in with =MONTH(C2)) is right.',
      [{ name: 'Orders', rows: [['Order', 'Date (text)', 'Date', 'Month'], ...IM_DATES.map(([o, d], i) => [o, `'${d}`, null, `=MONTH(C${i + 2})`])] }],
      [
        ['Months are right (day first)', '=Orders!D2&"/"&Orders!D3&"/"&Orders!D4&"/"&Orders!D5', IM_DATES.slice(0, 4).map(([, d]) => Number(d.slice(3, 5))).join('/')],
        ['Days are right', '=DAY(Orders!C2)&"/"&DAY(Orders!C7)', IM_DATES.filter((_, i) => i === 0 || i === 5).map(([, d]) => Number(d.slice(0, 2))).join('/')],
        ['Worked out by formula', '=AND(ISFORMULA(Orders!C2),ISFORMULA(Orders!C7))', 'TRUE'],
      ]
    ),
    dbTask(
      'im-p4',
      'Load the Raw Table',
      'Fernway: orders_raw',
      `orders_raw was loaded straight from a file, so every column is text: dates are day first (DD/MM/YYYY), amounts have £ and commas, and regions are messy.

Create a view named orders_clean with order_ref, order_date as YYYY-MM-DD text, amount as a number, and region as North, South, East or West.`,
      [IM_RAW],
      "-- Tip: substr(), replace(), trim(), upper(), CAST(... AS REAL)\nCREATE VIEW orders_clean AS\nSELECT\n",
      `CREATE VIEW orders_clean AS SELECT order_ref, substr(order_date, 7, 4) || '-' || substr(order_date, 4, 2) || '-' || substr(order_date, 1, 2) AS order_date, CAST(replace(replace(amount, '£', ''), ',', '') AS REAL) AS amount, upper(substr(trim(region), 1, 1)) || lower(substr(trim(region), 2)) AS region FROM orders_raw;`,
      [
        ['Dates are YYYY-MM-DD', 'SELECT order_ref, order_date FROM orders_clean ORDER BY order_ref'],
        ['Amounts are numbers that add up', 'SELECT ROUND(SUM(amount), 2) FROM orders_clean'],
        ['Regions are tidy', 'SELECT order_ref, region FROM orders_clean ORDER BY order_ref'],
      ],
      4
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
