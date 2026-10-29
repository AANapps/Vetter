import { AssessmentTest, DataTable } from '../types';
import { workbookStarter } from '../lib/spreadsheet';
import { databaseStarter } from '../lib/databaseWork';
import { toCsv } from '../lib/csv';
import { dayAfter, fractionOrPercent, pad2, percentAnswers, round1, round2, seeded, sum, tc } from './simulationKit';

/**
 * Fifteen-minute simulations, one for each part of data analysis: spreadsheets, SQL, data cleaning, reporting and
 * business metrics. Each is set in its own made-up company, with generated data and answers worked out from it.
 */

// =====================================================================================================
// Excel: Larkfield Outdoor, an online outdoor-gear shop
// =====================================================================================================

const PRODUCTS = [
  { sku: 'LO-101', product: 'Trail Tent 2P', category: 'Tents', cost: 92, price: 159 },
  { sku: 'LO-102', product: 'Ridge Tent 4P', category: 'Tents', cost: 148, price: 249 },
  { sku: 'LO-201', product: 'Down Sleeping Bag', category: 'Sleeping', cost: 61, price: 119 },
  { sku: 'LO-202', product: 'Synthetic Sleeping Bag', category: 'Sleeping', cost: 34, price: 69 },
  { sku: 'LO-301', product: 'Hiking Boots', category: 'Footwear', cost: 58, price: 129 },
  { sku: 'LO-302', product: 'Trail Runners', category: 'Footwear', cost: 47, price: 99 },
  { sku: 'LO-401', product: 'Rain Shell Jacket', category: 'Clothing', cost: 52, price: 140 },
  { sku: 'LO-402', product: 'Fleece Midlayer', category: 'Clothing', cost: 21, price: 55 },
  { sku: 'LO-501', product: 'Camp Stove', category: 'Cooking', cost: 24, price: 45 },
  { sku: 'LO-502', product: 'Titanium Mug', category: 'Cooking', cost: 7, price: 22 },
];
const CATEGORIES = ['Clothing', 'Cooking', 'Footwear', 'Sleeping', 'Tents'];

// The product list as the buying team keeps it: not sorted by SKU
const PRODUCT_FILE_ORDER = ['LO-401', 'LO-101', 'LO-502', 'LO-201', 'LO-302', 'LO-102', 'LO-501', 'LO-402', 'LO-202', 'LO-301'];
const PRODUCT_CSV = toCsv([
  ['sku', 'product', 'category', 'unit_cost'],
  ...PRODUCT_FILE_ORDER.map((sku) => PRODUCTS.find((p) => p.sku === sku)!).map((p) => [p.sku, p.product, p.category, p.cost]),
]);

const LARK_ORDERS = (() => {
  const rand = seeded(4101);
  return Array.from({ length: 60 }, (_, i) => {
    const p = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
    const qty = 1 + Math.floor(rand() * (p.category === 'Cooking' ? 4 : 2));
    const price = rand() < 0.25 ? round2(p.price * 0.9) : p.price;
    return { id: `LF-${5001 + i}`, date: `2026-03-${pad2(1 + Math.floor(i / 2))}`, sku: p.sku, qty, price, channel: rand() < 0.7 ? 'Web' : 'Marketplace', p };
  });
})();
const larkRevenue = (cat?: string) => round2(sum(LARK_ORDERS.filter((o) => !cat || o.p.category === cat).map((o) => o.qty * o.price)));
const larkMargin = (cat?: string) => round2(sum(LARK_ORDERS.filter((o) => !cat || o.p.category === cat).map((o) => o.qty * (o.price - o.p.cost))));
const LARK_BEST = [...CATEGORIES].sort((a, b) => larkMargin(b) / larkRevenue(b) - larkMargin(a) / larkRevenue(a))[0];

const excelTest: AssessmentTest = {
  id: 'test-excel-01',
  title: 'Excel for Analysts: Lookups & Margin Report',
  category: 'Data Analysis',
  difficulty: 'Junior',
  type: 'standard',
  description:
    'Build a category margin report in a working spreadsheet: import a product list, look up categories and costs, work out revenue and margin with formulas, and summarise by category.',
  estimatedMinutes: 15,
  passingScore: 70,
  totalQuestions: 4,
  skillsTested: ['Excel', 'Lookups', 'SUMIF', 'Margin Analysis'],
  roles: ['Data Analyst', 'Business Analyst', 'Financial Analyst'],
  scenario: {
    company: 'Larkfield Outdoor',
    role: 'Commercial Analyst',
    brief: `Larkfield Outdoor sells camping and hiking gear online. The commercial manager, Owen, wants to know which product categories actually make money, not just which sell the most, before he sets next season's buying budget.

You have March's orders in a spreadsheet and the buying team's product list (product_list.csv) with each product's category and unit cost.`,
    files: [{ name: 'product_list.csv', content: PRODUCT_CSV }],
  },
  questions: [
    {
      id: 'q-xl-1',
      title: 'Category Margin Report',
      type: 'sheet',
      contextData: 'larkfield_march_orders.xlsx',
      prompt: `1. Import product_list.csv (Import CSV → Files shared with you). It arrives as a new sheet.
2. On the Orders sheet, add for every order, each by formula:
   • G, Category: looked up from the product list by SKU
   • H, Revenue: Qty × Unit Price
   • I, Margin: Qty × (Unit Price − unit cost), with the unit cost looked up by SKU
   Put the headers Category, Revenue and Margin in G1:I1.
3. On the Summary sheet, fill in each category's Revenue (B), Margin (C) and Margin % (D, Margin ÷ Revenue as a fraction).`,
      starterCode: workbookStarter([
        {
          name: 'Orders',
          rows: [['Order ID', 'Date', 'SKU', 'Qty', 'Unit Price', 'Channel'], ...LARK_ORDERS.map((o) => [o.id, o.date, o.sku, o.qty, o.price, o.channel])],
        },
        { name: 'Summary', rows: [['Category', 'Revenue', 'Margin', 'Margin %'], ...CATEGORIES.map((c) => [c])] },
      ]),
      testCases: [
        tc('tc-xl-1', 'Category is looked up by formula on every order', '=AND(ISFORMULA(Orders!G2),ISFORMULA(Orders!G61))', 'TRUE'),
        tc('tc-xl-2', 'Categories are looked up correctly', '=COUNTIF(Orders!G:G,"Tents")*1000+COUNTIF(Orders!G:G,"Cooking")', String(LARK_ORDERS.filter((o) => o.p.category === 'Tents').length * 1000 + LARK_ORDERS.filter((o) => o.p.category === 'Cooking').length)),
        tc('tc-xl-3', 'Revenue adds up', '=SUM(Orders!H:H)', String(larkRevenue())),
        tc('tc-xl-4', 'Margin adds up, using each product’s cost', '=SUM(Orders!I:I)', String(larkMargin())),
        tc('tc-xl-5', 'Footwear revenue on the Summary is right', '=VLOOKUP("Footwear",Summary!A2:D6,2,FALSE)', String(larkRevenue('Footwear'))),
        tc('tc-xl-6', 'Clothing margin % on the Summary is right', '=VLOOKUP("Clothing",Summary!A2:D6,4,FALSE)', fractionOrPercent(larkMargin('Clothing') / larkRevenue('Clothing'))),
      ],
      timeLimitMinutes: 10,
      weight: 60,
    },
    {
      id: 'q-xl-2',
      title: 'Where the Money Is',
      type: 'choice',
      prompt: 'From your Summary, which category has the highest margin %?',
      options: CATEGORIES,
      correctOption: CATEGORIES.indexOf(LARK_BEST),
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 1,
      weight: 15,
    },
    {
      id: 'q-xl-3',
      title: 'Overall Margin',
      type: 'text',
      prompt: "What was Larkfield's overall margin % in March (total margin ÷ total revenue)? Give it to 1 decimal place, e.g. 38.2%.",
      acceptedAnswers: percentAnswers(round1((larkMargin() / larkRevenue()) * 100)),
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 1,
      weight: 15,
    },
    {
      id: 'q-xl-4',
      title: 'A Lookup Gone Wrong',
      type: 'choice',
      prompt: `A colleague's version of the report uses =VLOOKUP(C2,product_list!A:C,3) for the category. Every SKU is in the product list, yet most orders show the wrong category or #N/A. Why?`,
      options: [
        'VLOOKUP can only search the first 1,000 rows',
        'Without FALSE as the last argument it looks for the nearest match, which needs the list sorted by SKU, and it isn’t',
        'Column 3 is the unit cost, not the category',
        'The SKUs contain a hyphen, which VLOOKUP treats as a minus sign',
      ],
      correctOption: 1,
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 1,
      weight: 10,
    },
  ],
};

// =====================================================================================================
// SQL: Tidepool, a meal-kit subscription
// =====================================================================================================

const PLANS = [
  { plan: 'Classic', price: 39.99, ordersPerWeek: 0.55 },
  { plan: 'Family', price: 59.99, ordersPerWeek: 0.7 },
  { plan: 'Veggie', price: 34.99, ordersPerWeek: 0.45 },
];
const REGIONS = ['London', 'Midlands', 'North', 'South'];

const TIDEPOOL = (() => {
  const rand = seeded(5150);
  const customers = Array.from({ length: 120 }, (_, i) => {
    const p = PLANS[Math.floor(rand() * PLANS.length)];
    return {
      customer_id: `C${String(i + 1).padStart(3, '0')}`,
      signup_date: dayAfter('2025-09-01', Math.floor(rand() * 167)),
      plan: p.plan,
      region: REGIONS[Math.floor(rand() * REGIONS.length)],
    };
  });
  const orders: { order_id: string; customer_id: string; order_date: string; amount: number; status: string }[] = [];
  for (let week = 0; week < 13; week++) {
    for (const c of customers) {
      const p = PLANS.find((x) => x.plan === c.plan)!;
      const date = dayAfter('2026-01-01', Math.min(89, week * 7 + Math.floor(rand() * 7)));
      if (date < c.signup_date || rand() > p.ordersPerWeek) continue;
      // A courier problem in February: far more boxes arrived late and were refunded
      const refundRate = date.startsWith('2026-02') ? 0.2 : 0.02;
      orders.push({
        order_id: `O${String(orders.length + 1).padStart(5, '0')}`,
        customer_id: c.customer_id,
        order_date: date,
        amount: round2(p.price + (rand() < 0.3 ? 7.5 : 0)),
        status: rand() < refundRate ? 'refunded' : 'delivered',
      });
    }
  }
  return { customers, orders };
})();

const tidepoolTables: DataTable[] = [
  { name: 'customers', columns: ['customer_id', 'signup_date', 'plan', 'region'], rows: TIDEPOOL.customers },
  { name: 'orders', columns: ['order_id', 'customer_id', 'order_date', 'amount', 'status'], rows: TIDEPOOL.orders },
];

const sqlTest: AssessmentTest = {
  id: 'test-sql-02',
  title: 'SQL for Analysts: Subscription Revenue',
  category: 'Data Analysis',
  difficulty: 'Professional',
  type: 'standard',
  description:
    "Answer a subscription business's revenue questions in a live SQL workbench: build reporting views with grouping, joins and window functions, then explain what the numbers show.",
  estimatedMinutes: 15,
  passingScore: 70,
  totalQuestions: 4,
  skillsTested: ['SQL', 'Window Functions', 'Joins', 'Reporting'],
  roles: ['Data Analyst', 'Data Engineer', 'Business Analyst'],
  scenario: {
    company: 'Tidepool',
    role: 'Data Analyst',
    brief: `Tidepool delivers weekly meal kits on three plans: Classic, Family and Veggie. The finance lead, Rosa, saw revenue wobble in Q1 2026 and wants two views in the database she can query herself, plus your read on what happened.

The database has customers and every order. An order's status is delivered or refunded; refunded orders earned nothing.`,
  },
  questions: [
    {
      id: 'q-tp-1',
      title: 'Monthly Revenue View',
      type: 'database',
      contextData: 'TidepoolAnalytics',
      prompt: `Create a view named monthly_revenue with one row per month of Q1 2026 and these columns:

• month: as "YYYY-MM"
• orders: the number of delivered orders
• revenue: delivered revenue, rounded to 2 decimal places

Refunded orders count towards neither.`,
      tables: tidepoolTables,
      starterCode: databaseStarter(`-- TidepoolAnalytics: customers, orders

CREATE VIEW monthly_revenue AS
SELECT
`),
      solutionCode: `CREATE VIEW monthly_revenue AS
SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders, ROUND(SUM(amount), 2) AS revenue
FROM orders WHERE status = 'delivered' GROUP BY month;`,
      testCases: [
        tc('tc-tp-1', 'January is right', "SELECT month, orders, revenue FROM monthly_revenue WHERE month = '2026-01'"),
        tc('tc-tp-2', 'February is right', "SELECT month, orders, revenue FROM monthly_revenue WHERE month = '2026-02'"),
        tc('tc-tp-3', 'March is right', "SELECT month, orders, revenue FROM monthly_revenue WHERE month = '2026-03'"),
      ],
      timeLimitMinutes: 5,
      weight: 35,
    },
    {
      id: 'q-tp-2',
      title: 'Top Customers by Region',
      type: 'database',
      contextData: 'TidepoolAnalytics',
      prompt: `Rosa wants to thank each region's best customers. Create a view named region_top_customers with the top 3 customers in each region by delivered revenue in Q1 2026:

• region, customer_id
• revenue: their delivered revenue, rounded to 2 decimal places
• rank_in_region: 1, 2 or 3 (if two customers tie, the lower customer_id ranks first)`,
      tables: tidepoolTables,
      starterCode: databaseStarter(`-- Tip: ROW_NUMBER() OVER (PARTITION BY ... ORDER BY ...)

CREATE VIEW region_top_customers AS
`),
      solutionCode: `CREATE VIEW region_top_customers AS
WITH totals AS (
  SELECT c.region, c.customer_id, ROUND(SUM(o.amount), 2) AS revenue
  FROM customers c JOIN orders o ON o.customer_id = c.customer_id
  WHERE o.status = 'delivered'
  GROUP BY c.region, c.customer_id
), ranked AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY region ORDER BY revenue DESC, customer_id) AS rank_in_region FROM totals
)
SELECT region, customer_id, revenue, rank_in_region FROM ranked WHERE rank_in_region <= 3;`,
      testCases: [
        tc('tc-tp-4', 'Three customers for each of the four regions', 'SELECT region, COUNT(*) FROM region_top_customers GROUP BY region ORDER BY region'),
        tc('tc-tp-5', 'The right customers, in the right order', 'SELECT region, rank_in_region, customer_id FROM region_top_customers ORDER BY region, rank_in_region'),
        tc('tc-tp-6', 'Their revenue is right', 'SELECT customer_id, revenue FROM region_top_customers ORDER BY customer_id'),
      ],
      timeLimitMinutes: 7,
      weight: 35,
    },
    {
      id: 'q-tp-3',
      title: 'The February Dip',
      type: 'choice',
      prompt: 'Delivered revenue dipped in February. Query the orders: what best explains it?',
      options: [
        'Far fewer customers placed orders in February',
        'A much larger share of February orders were refunded',
        'Customers switched to the cheaper Veggie plan',
        'February has fewer days, and that accounts for all of it',
      ],
      correctOption: 1,
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 2,
      weight: 15,
    },
    {
      id: 'q-tp-4',
      title: 'Revenue Too High',
      type: 'choice',
      prompt: `A colleague joins orders to an order_items table (one row per recipe in the box) and reports SUM(orders.amount) as revenue. The total comes out about three times too high. Why?`,
      options: [
        'SUM ignores NULLs, so it overcounts',
        'The join repeats each order once per item, so each amount is added several times',
        'The join should be a LEFT JOIN',
        'amount is stored as text, so SUM concatenates',
      ],
      correctOption: 1,
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 1,
      weight: 15,
    },
  ],
};

// =====================================================================================================
// Data cleaning: Brightwell Gyms, moving members to a new system
// =====================================================================================================

const MEMBERS: (string | number)[][] = [
  ['M-1001', 'Aisha Rahman', 'aisha.rahman@mail.com', 'Basic', 24],
  ['M-1002', 'Ben Carter', 'ben.carter@mail.com', 'Plus', 34],
  ['M-1003', 'priya shah', ' Priya.Shah@Mail.com', 'Premium', 49],
  ['M-1004', 'Daniel  Wu', 'daniel.wu@mail.com', 'basic', 24],
  ['M-1005', '  tom  OKAFOR', 'tom.okafor@mail.com', 'PLUS', 34],
  ['M-1006', 'Grace Lee', 'GRACE.LEE@MAIL.COM', 'Premium', 49],
  ['M-1007', 'Hamza Ali', 'hamza.ali@mail.com ', 'Basic ', 24],
  ['M-1008', 'Isla Murray', 'isla.murray@mail.com', 'Prem.', 49],
  ['M-1009', 'Jack Evans', 'jack.evans@mail.com', 'Plus', 34],
  ['M-1010', 'Keira Doyle', 'keira.doyle@mail.com', 'Basic', 24],
  ['M-1011', 'Ben Carter', 'Ben.Carter@mail.com', 'Plus', 34],
  ['M-1012', 'Liam Byrne', 'liam.byrne@mail.com', 'premium', 49],
  ['M-1013', 'Maya Patel', 'maya.patel@mail.com', 'Plus', 34],
  ['M-1014', 'Noah Green', ' noah.green@mail.com', 'Basic', 24],
  ['M-1015', 'Grace Lee', 'grace.lee@mail.com', 'Premium', 49],
  ['M-1016', 'Olivia Hart', 'olivia.hart@mail.com', 'Plus ', 34],
  ['M-1017', 'Priya Shah', 'priya.shah@mail.com', 'Premium', 49],
  ['M-1018', 'Ryan Ellis', 'ryan.ellis@mail.com', 'Basic', 24],
  ['M-1019', 'Sofia Rossi', 'SOFIA.ROSSI@mail.com', 'Prem.', 49],
  ['M-1020', 'Theo Walsh', 'theo.walsh@mail.com', 'Plus', 34],
];
const UNIQUE_MEMBERS = new Set(MEMBERS.map((m) => String(m[2]).trim().toLowerCase())).size;

// Gym visits from three clubs, each of whose old systems wrote dates its own way
const VISITS = (() => {
  const rand = seeded(1212);
  const clubs = ['Leeds', 'York', 'Hull'];
  const rows: { visit_id: string; member_id: string; club: string; visit_date: string }[] = [];
  for (let i = 0; i < 160; i++) {
    const iso = dayAfter('2026-01-01', Math.floor(rand() * 90));
    const club = clubs[Math.floor(rand() * 3)];
    const [y, m, d] = iso.split('-');
    const written = club === 'Leeds' ? `${d}/${m}/${y}` : club === 'York' ? `${y}/${m}/${d}` : iso;
    rows.push({ visit_id: `V${String(i + 1).padStart(4, '0')}`, member_id: String(MEMBERS[Math.floor(rand() * MEMBERS.length)][0]), club, visit_date: written });
  }
  // Test check-ins left by the installer
  for (let i = 0; i < 6; i++) rows.push({ visit_id: `V${String(161 + i).padStart(4, '0')}`, member_id: 'TEST', club: 'Hull', visit_date: dayAfter('2026-01-05', i) });
  return rows;
})();

const cleaningTest: AssessmentTest = {
  id: 'test-clean-01',
  title: 'Data Cleaning: Gym Member Migration',
  category: 'Data Analysis',
  difficulty: 'Junior',
  type: 'standard',
  description:
    'Clean member records in a working spreadsheet (duplicates hiding behind different capitals and spaces, messy names, plan typos), then fix three date formats and test rows in a live database.',
  estimatedMinutes: 15,
  passingScore: 70,
  totalQuestions: 4,
  skillsTested: ['Data Cleaning', 'Excel', 'SQL', 'Data Quality'],
  roles: ['Data Analyst', 'Data Engineer'],
  scenario: {
    company: 'Brightwell Gyms',
    role: 'Data Analyst',
    brief: `Brightwell runs three gyms (Leeds, York and Hull) and is moving to a new membership system on Monday. The new system rejects duplicate emails and only accepts the plans Basic, Plus and Premium.

Ops manager Femi has exported the member list and the visit log from the old systems. Nobody has checked either.`,
  },
  questions: [
    {
      id: 'q-bw-1',
      title: 'Clean the Member List',
      type: 'sheet',
      contextData: 'brightwell_members.xlsx',
      prompt: `Make the Members sheet ready to load:

1. Emails: lower case, with no spaces.
2. Duplicates: some members signed up twice with the same email (with different capitals or spaces). Keep their first registration (the lower Member ID) and remove the later one.
3. Names: no extra spaces, in Proper Case (e.g. "Tom Okafor").
4. Plan: exactly Basic, Plus or Premium.

Leave the clean list on the Members sheet from A1, with no blank rows. A helper column with TRIM, LOWER or PROPER, then Paste values over the original, is one way to do it.`,
      starterCode: workbookStarter([{ name: 'Members', rows: [['Member ID', 'Name', 'Email', 'Plan', 'Monthly Fee'], ...MEMBERS] }]),
      testCases: [
        tc('tc-bw-1', `${UNIQUE_MEMBERS} members remain`, '=COUNTA(Members!A:A)', String(UNIQUE_MEMBERS + 1)),
        tc(
          'tc-bw-2',
          "Duplicates removed, keeping each member's first registration",
          '=(COUNTIF(Members!A:A,"M-1002")+COUNTIF(Members!A:A,"M-1003")+COUNTIF(Members!A:A,"M-1006"))*10+COUNTIF(Members!A:A,"M-1011")+COUNTIF(Members!A:A,"M-1015")+COUNTIF(Members!A:A,"M-1017")',
          '30'
        ),
        tc('tc-bw-4', 'No email has a space in it', '=COUNTIF(Members!C:C,"* *")', '0'),
        tc(
          'tc-bw-5',
          'Emails are lower case',
          '=AND(EXACT(VLOOKUP("M-1003",Members!A:E,3,FALSE),"priya.shah@mail.com"),EXACT(VLOOKUP("M-1006",Members!A:E,3,FALSE),"grace.lee@mail.com"),EXACT(VLOOKUP("M-1019",Members!A:E,3,FALSE),"sofia.rossi@mail.com"))',
          'TRUE'
        ),
        tc(
          'tc-bw-6',
          'Names are trimmed and in Proper Case',
          '=AND(EXACT(VLOOKUP("M-1005",Members!A:E,2,FALSE),"Tom Okafor"),EXACT(VLOOKUP("M-1004",Members!A:E,2,FALSE),"Daniel Wu"),EXACT(VLOOKUP("M-1003",Members!A:E,2,FALSE),"Priya Shah"))',
          'TRUE'
        ),
        tc('tc-bw-7', 'Every plan is Basic, Plus or Premium', '=COUNTIF(Members!D:D,"Basic")+COUNTIF(Members!D:D,"Plus")+COUNTIF(Members!D:D,"Premium")', String(UNIQUE_MEMBERS)),
      ],
      timeLimitMinutes: 7,
      weight: 45,
    },
    {
      id: 'q-bw-2',
      title: 'Fix the Visit Log',
      type: 'database',
      contextData: 'BrightwellVisits',
      prompt: `The visits table mixes three date formats, one per club. The new system needs every visit_date as YYYY-MM-DD.

1. Convert every visit_date to YYYY-MM-DD. Work out from the data which format each club used.
2. Delete the test check-ins the installer left behind (member_id TEST).

Your changes are kept as you run them. Reset database starts again.`,
      tables: [{ name: 'visits', columns: ['visit_id', 'member_id', 'club', 'visit_date'], rows: VISITS }],
      starterCode: databaseStarter(`-- BrightwellVisits: visits
-- Tip: substr(text, start, length) and || to join text

SELECT club, visit_date
FROM visits
LIMIT 20;
`),
      solutionCode: `UPDATE visits SET visit_date = substr(visit_date, 7, 4) || '-' || substr(visit_date, 4, 2) || '-' || substr(visit_date, 1, 2) WHERE visit_date LIKE '__/__/____';
UPDATE visits SET visit_date = replace(visit_date, '/', '-') WHERE visit_date LIKE '____/__/__';
DELETE FROM visits WHERE member_id = 'TEST';`,
      testCases: [
        tc('tc-bw-8', 'Every date is YYYY-MM-DD', "SELECT COUNT(*) FROM visits WHERE visit_date NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'"),
        tc('tc-bw-9', 'Days and months are the right way round: visits per month match', 'SELECT substr(visit_date, 1, 7), COUNT(*) FROM visits GROUP BY 1 ORDER BY 1'),
        tc('tc-bw-10', 'Test check-ins are gone', "SELECT COUNT(*) FROM visits WHERE member_id = 'TEST'"),
        tc('tc-bw-11', 'No real visits were lost', 'SELECT COUNT(*) FROM visits'),
      ],
      timeLimitMinutes: 5,
      weight: 35,
    },
    {
      id: 'q-bw-3',
      title: 'Whose Date Format?',
      type: 'choice',
      prompt: `Another export has the date 04/03/2026. Is that 4 March or 3 April?`,
      options: [
        'Always 4 March: the UK writes day first',
        'Always 3 April: databases store month first',
        'Look at the other dates from the same source: a value like 25/03/2026 shows the day comes first. Confirm with whoever owns the system if unsure',
        'It doesn’t matter for monthly reports',
      ],
      correctOption: 2,
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 1,
      weight: 10,
    },
    {
      id: 'q-bw-4',
      title: 'Members With No Email',
      type: 'choice',
      prompt: `In the full export, 40 paying members have no email address, and the new system needs one. What should you do?`,
      options: [
        'Delete them so the load succeeds',
        'Make up placeholder emails such as member123@brightwell.com',
        'Keep them out of this load, list them for the front desk to collect emails, and tell Femi how many there are',
        'Load them with the email of whoever signed them up',
      ],
      correctOption: 2,
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 1,
      weight: 10,
    },
  ],
};

// =====================================================================================================
// Reporting & dashboards: Harrow & Finch, an online homeware shop
// =====================================================================================================

const HF_CHANNELS = [
  { channel: 'Email', sessions: 1800, conv: 0.032 },
  { channel: 'Paid Search', sessions: 2600, conv: 0.024 },
  { channel: 'Organic', sessions: 3400, conv: 0.02 },
  { channel: 'Social', sessions: 1200, conv: 0.011 },
];

const HARROW = (() => {
  const rand = seeded(8808);
  const traffic: { week: number; channel: string; sessions: number }[] = [];
  const daily: { week: number; date: string; channel: string; orders: number; revenue: number }[] = [];
  for (let week = 1; week <= 8; week++) {
    for (const ch of HF_CHANNELS) {
      // Week 8: a promotional email to a bought-in list brought lots of visitors who mostly didn't buy
      const promo = week === 8 && ch.channel === 'Email';
      const sessions = Math.round(ch.sessions * (promo ? 3.5 : 0.92 + 0.16 * rand()) * (1 + week * 0.01));
      traffic.push({ week, channel: ch.channel, sessions });
      const conv = promo ? 0.016 : ch.conv;
      for (let d = 0; d < 7; d++) {
        const orders = Math.max(0, Math.round((sessions / 7) * conv * (0.85 + 0.3 * rand())));
        const aov = 44 + 12 * rand();
        daily.push({ week, date: dayAfter('2026-01-05', (week - 1) * 7 + d), channel: ch.channel, orders, revenue: round2(orders * aov) });
      }
    }
  }
  return { traffic, daily };
})();
const hfRevenue = (week?: number, channel?: string) => round2(sum(HARROW.daily.filter((r) => (!week || r.week === week) && (!channel || r.channel === channel)).map((r) => r.revenue)));
const hfOrders = (week: number) => sum(HARROW.daily.filter((r) => r.week === week).map((r) => r.orders));
const hfSessions = (week: number) => sum(HARROW.traffic.filter((r) => r.week === week).map((r) => r.sessions));

const dashboardTest: AssessmentTest = {
  id: 'test-dash-01',
  title: 'Reporting & Dashboards: Weekly KPI Pack',
  category: 'Data Analysis',
  difficulty: 'Junior',
  type: 'standard',
  description:
    "Build the weekly KPI pack in a working spreadsheet (revenue, orders, average order value, week-on-week change, conversion and a channel trend table), then decide what the headline should say and how to chart it.",
  estimatedMinutes: 15,
  passingScore: 70,
  totalQuestions: 4,
  skillsTested: ['Reporting', 'KPIs', 'Excel', 'Data Visualisation'],
  roles: ['Data Analyst', 'Business Analyst', 'Digital Marketer'],
  scenario: {
    company: 'Harrow & Finch',
    role: 'Reporting Analyst',
    brief: `Harrow & Finch sells homeware online. Every Monday the leadership team gets a one-page KPI pack, and this week it's yours to build.

You have daily orders and revenue by marketing channel for the last eight weeks, and weekly website sessions by channel. Week 8 is the week just gone.`,
  },
  questions: [
    {
      id: 'q-hf-1',
      title: 'Build the KPI Pack',
      type: 'sheet',
      contextData: 'weekly_kpi_pack.xlsx',
      prompt: `Using formulas on the Orders and Traffic sheets:

1. KPIs sheet, column B:
   • B2 Revenue in week 8
   • B3 Orders in week 8
   • B4 Average order value in week 8 (revenue ÷ orders)
   • B5 Revenue change vs week 7, as a fraction (0.05 is +5%)
   • B6 Conversion rate in week 8: orders ÷ sessions, as a fraction
2. Trend sheet: revenue for each week (rows) and channel (columns). SUMIFS works well here.`,
      starterCode: workbookStarter([
        { name: 'Orders', rows: [['Week', 'Date', 'Channel', 'Orders', 'Revenue'], ...HARROW.daily.map((r) => [r.week, r.date, r.channel, r.orders, r.revenue])] },
        { name: 'Traffic', rows: [['Week', 'Channel', 'Sessions'], ...HARROW.traffic.map((r) => [r.week, r.channel, r.sessions])] },
        {
          name: 'KPIs',
          rows: [['Measure', 'Week 8'], ['Revenue'], ['Orders'], ['Average order value'], ['Revenue change vs week 7'], ['Conversion rate']],
        },
        { name: 'Trend', rows: [['Week', ...HF_CHANNELS.map((c) => c.channel)], ...Array.from({ length: 8 }, (_, i) => [i + 1])] },
      ]),
      testCases: [
        tc('tc-hf-1', 'Week 8 revenue is right', '=KPIs!B2', String(hfRevenue(8))),
        tc('tc-hf-2', 'Week 8 orders are right', '=KPIs!B3', String(hfOrders(8))),
        tc('tc-hf-3', 'Average order value is right', '=KPIs!B4', String(hfRevenue(8) / hfOrders(8))),
        tc('tc-hf-4', 'Change vs week 7 is right', '=KPIs!B5', fractionOrPercent(hfRevenue(8) / hfRevenue(7) - 1)),
        tc('tc-hf-5', 'Conversion rate is right', '=KPIs!B6', fractionOrPercent(hfOrders(8) / hfSessions(8))),
        tc('tc-hf-6', 'The trend table adds up to all eight weeks', '=SUM(Trend!B2:E9)', String(hfRevenue())),
        tc('tc-hf-7', 'Email in week 8 is in the right cell', '=Trend!B9', String(hfRevenue(8, 'Email'))),
      ],
      timeLimitMinutes: 9,
      weight: 60,
    },
    {
      id: 'q-hf-2',
      title: 'The Headline',
      type: 'choice',
      prompt: 'Look at week 8 against earlier weeks, by channel. Which headline is accurate?',
      options: [
        'Revenue up and every channel converting better: a strong week all round',
        'Revenue up because a promotional email brought far more visitors, but most didn’t buy: conversion fell',
        'Revenue down because Organic traffic collapsed',
        'Flat week: nothing changed',
      ],
      correctOption: 1,
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 2,
      weight: 15,
    },
    {
      id: 'q-hf-3',
      title: 'Chart the Trend',
      type: 'choice',
      prompt: 'Which chart best shows how revenue for each of the four channels moved over the eight weeks?',
      options: ['A pie chart for each week', 'A line chart with one line per channel', 'A single stacked bar for the eight weeks combined', 'A table of numbers with no chart'],
      correctOption: 1,
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 1,
      weight: 15,
    },
    {
      id: 'q-hf-4',
      title: 'A Misleading Chart',
      type: 'choice',
      prompt: `Last month's pack showed a bar chart in which week 4's revenue bar looked twice as tall as week 3's. In fact revenue rose 4%. What went wrong?`,
      options: [
        'The bars were the wrong colour',
        'The vertical axis started well above zero, so a small rise looked huge',
        'Bar charts can’t show revenue',
        'The weeks should have been sorted by revenue',
      ],
      correctOption: 1,
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 1,
      weight: 10,
    },
  ],
};

// =====================================================================================================
// Business metrics: Pocketly, a budgeting app, and its checkout experiment
// =====================================================================================================

const POCKETLY = (() => {
  const rand = seeded(3003);
  const rows: { date: string; variant: string; visitors: number; trials: number; purchases: number }[] = [];
  for (let day = 0; day < 14; day++) {
    for (const variant of ['A', 'B']) {
      const visitors = Math.round(1400 * (0.9 + 0.2 * rand()));
      const trials = Math.round(visitors * (0.18 + 0.02 * rand()));
      // B's new checkout looked better at first, then settled almost level with A
      const rate = variant === 'A' ? 0.04 : day < 4 ? 0.055 : 0.041;
      rows.push({ date: dayAfter('2026-09-07', day), variant, visitors, trials, purchases: Math.round(visitors * rate * (0.9 + 0.2 * rand())) });
    }
  }
  return rows;
})();
const pk = (variant: string, key: 'visitors' | 'trials' | 'purchases') => sum(POCKETLY.filter((r) => r.variant === variant).map((r) => r[key]));
const PK_CONV_A = pk('A', 'purchases') / pk('A', 'visitors');
const PK_CONV_B = pk('B', 'purchases') / pk('B', 'visitors');
const PK_EXTRA = Math.round((PK_CONV_B - PK_CONV_A) * 10000);

const metricsTest: AssessmentTest = {
  id: 'test-da-01',
  title: 'Business Metrics: Reading an A/B Test',
  category: 'Data Analysis',
  difficulty: 'Junior',
  type: 'standard',
  description:
    'Analyse a two-week checkout experiment in a working spreadsheet (conversion by variant, relative uplift, extra sales), then judge whether the result can be trusted.',
  estimatedMinutes: 15,
  passingScore: 70,
  totalQuestions: 4,
  skillsTested: ['A/B Testing', 'Metrics', 'Statistics', 'Excel'],
  roles: ['Data Analyst', 'Business Analyst', 'Consultant'],
  scenario: {
    company: 'Pocketly',
    role: 'Product Analyst',
    brief: `Pocketly is a budgeting app. For two weeks, half of new visitors saw the old checkout (A) and half a redesigned one (B). The product manager, Jun, wants to ship B and asks you to confirm it worked.

The Daily sheet has visitors, free-trial starts and purchases per day for each variant.`,
  },
  questions: [
    {
      id: 'q-pk-1',
      title: 'Experiment Results',
      type: 'sheet',
      contextData: 'checkout_experiment.xlsx',
      prompt: `On the Results sheet, by formula from the Daily sheet:

1. For A (row 2) and B (row 3): total Visitors (B), Trials (C), Purchases (D), and Conversion (E: purchases ÷ visitors, as a fraction)
2. B5: B's relative uplift in conversion over A, as a fraction (E3 ÷ E2 − 1)`,
      starterCode: workbookStarter([
        { name: 'Daily', rows: [['Date', 'Variant', 'Visitors', 'Trials', 'Purchases'], ...POCKETLY.map((r) => [r.date, r.variant, r.visitors, r.trials, r.purchases])] },
        { name: 'Results', rows: [['Variant', 'Visitors', 'Trials', 'Purchases', 'Conversion'], ['A'], ['B'], [], ['Relative uplift (B vs A)']] },
      ]),
      testCases: [
        tc('tc-pk-1', "A's visitors are right", '=Results!B2', String(pk('A', 'visitors'))),
        tc('tc-pk-2', "B's purchases are right", '=Results!D3', String(pk('B', 'purchases'))),
        tc('tc-pk-3', "A's conversion is right", '=Results!E2', fractionOrPercent(PK_CONV_A)),
        tc('tc-pk-4', "B's conversion is right", '=Results!E3', fractionOrPercent(PK_CONV_B)),
        tc('tc-pk-5', 'Relative uplift is right', '=Results!B5', fractionOrPercent(PK_CONV_B / PK_CONV_A - 1)),
        tc('tc-pk-6', 'Totals are worked out by formula', '=AND(ISFORMULA(Results!B2),ISFORMULA(Results!D3),ISFORMULA(Results!E3))', 'TRUE'),
      ],
      timeLimitMinutes: 7,
      weight: 50,
    },
    {
      id: 'q-pk-2',
      title: 'Should Jun Ship B?',
      type: 'choice',
      prompt: "Look at B's conversion day by day against A's. What do you tell Jun?",
      options: [
        'Ship B: its overall conversion is higher',
        "B's lead comes almost entirely from the first few days and then nearly disappears, which looks like novelty. Run it longer before deciding",
        'Ship A: B is worse',
        'The test is invalid because the two variants had different visitor numbers',
      ],
      correctOption: 1,
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 3,
      weight: 20,
    },
    {
      id: 'q-pk-3',
      title: 'Extra Purchases',
      type: 'text',
      prompt: `Using the overall conversion rates for the whole two weeks, how many extra purchases per 10,000 visitors did B produce over A? Round to a whole number.`,
      acceptedAnswers: [String(PK_EXTRA), String(PK_EXTRA - 1), String(PK_EXTRA + 1)],
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 2,
      weight: 15,
    },
    {
      id: 'q-pk-4',
      title: 'Peeking',
      type: 'choice',
      prompt: `On a different test, the team checked the significance every morning and stopped on day 3, the first day p dropped below 0.05. What's the problem?`,
      options: [
        'Nothing: p < 0.05 means the result is real',
        'Checking repeatedly and stopping at the first significant result greatly raises the chance of a false positive',
        'Three days is too long for an A/B test',
        'p-values only work on weekdays',
      ],
      correctOption: 1,
      starterCode: '',
      testCases: [],
      timeLimitMinutes: 1,
      weight: 15,
    },
  ],
};

export const ANALYSIS_SIMULATIONS: AssessmentTest[] = [excelTest, sqlTest, cleaningTest, dashboardTest, metricsTest];
