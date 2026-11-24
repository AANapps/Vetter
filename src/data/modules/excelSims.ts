import { AssessmentTest, Question } from '../../types';
import { workbookStarter } from '../../lib/spreadsheet';
import { toCsv } from '../../lib/csv';
import { choice, order, short } from '../questionKit';
import { round2, seeded, sum, tc } from '../simulationKit';

/**
 * Excel for Data Analysis, simulation only: four workbook tasks in 20 minutes, together covering the ten things an
 * analyst does in Excel every week: cleaning data (duplicates, blanks, numbers and dates stored as text, TRIM and
 * Flash Fill), Excel Tables, sorting and filtering, SUM/AVERAGE/MEDIAN/MIN/MAX/COUNT/COUNTA, IF/SUMIFS/COUNTIFS/
 * AVERAGEIFS, XLOOKUP, FILTER/UNIQUE/SORT, PivotTables, Power Query, and charts with conditional formatting and
 * slicers. Each task's numbered steps are marked on the finished workbook; the questions beside it are answered from
 * what the candidate's own work shows (a number typed, an option picked, a list put in order).
 * The data comes from fixed seeds, so every candidate gets the same workbooks, and every answer is worked out here.
 */

const TASK_MINUTES = 4;
const ASK_MINUTES = 0.5;
const REGIONS = ['North', 'South', 'East', 'West'] as const;
const pick = <T,>(rand: () => number, xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const joined = (...cells: string[]) => '=' + cells.join('&" / "&');
const values = (...vs: (string | number)[]) => vs.join(' / ');
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
// Every way a sum of money might be typed
const money = (n: number) => {
  const two = n.toFixed(2);
  const grouped = Number(two).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [...new Set([two, String(round2(n)), grouped, `£${two}`, `£${grouped}`])];
};

type Checks = [step: number, description: string, check: string, expected: string][];
const sheetTask = (id: string, title: string, file: string, prompt: string, sheets: { name: string; rows: (string | number | null)[][] }[], checks: Checks): Question => ({
  id,
  title,
  type: 'sheet',
  contextData: file,
  prompt,
  starterCode: workbookStarter(sheets),
  testCases: checks.map(([n, d, c, e], i) => tc(`tc-${id}-${i + 1}`, `Step ${n} · ${d}`, c, e)),
  timeLimitMinutes: TASK_MINUTES,
  weight: 21,
});
const ask = { minutes: ASK_MINUTES, weight: 2 };

// =====================================================================================================
// Task 1: cleaning a till export, then making it a Table
// =====================================================================================================

const FIRST = ['asha', 'ben', 'chloe', 'dan', 'ella', 'finn', 'gita', 'harry', 'isla', 'jack', 'kemi', 'liam'];
const LAST = ['patel', 'cole', 'wu', 'reid', 'shaw', 'moss', 'rao', 'lim', 'kerr', 'byrne', 'ade', 'hughes'];
const messy = (rand: () => number, s: string) => {
  const cased = rand() < 0.33 ? s.toUpperCase() : rand() < 0.5 ? s : s[0].toUpperCase() + s.slice(1);
  return cased;
};
const C1 = (() => {
  const rand = seeded(7101);
  return Array.from({ length: 22 }, (_, i) => {
    const f = FIRST[i % FIRST.length];
    const l = LAST[(i * 5) % LAST.length];
    const day = 2 + Math.floor((i * 27) / 22);
    const amount = round2(25 + rand() * 340);
    const style = i % 4;
    const date = style === 0 ? `${String(day).padStart(2, '0')}/03/2026` : style === 1 ? `2026-03-${String(day).padStart(2, '0')}` : style === 2 ? `${day} Mar 2026` : `Mar ${day} 2026`;
    return {
      id: `LK-${1001 + i}`,
      customer: `${rand() < 0.5 ? '  ' : ''}${messy(rand, f)} ${messy(rand, l)}${rand() < 0.4 ? ' ' : ''}`,
      first: f[0].toUpperCase() + f.slice(1),
      region: pick(rand, REGIONS) as string,
      amount,
      // Some amounts came out of the till as text with the currency after them
      amountText: i % 5 === 2 ? `${amount.toFixed(2)} GBP` : String(amount),
      date,
      iso: `2026-03-${String(day).padStart(2, '0')}`,
    };
  });
})();
const C1_DUPES = ['LK-1004', 'LK-1013'];
const C1_ROWS: (string | number | null)[][] = [];
C1.forEach((o, i) => {
  C1_ROWS.push([o.id, o.customer, o.region, o.amountText, o.date]);
  if (C1_DUPES.includes(o.id)) C1_ROWS.push([o.id, o.customer, o.region, o.amountText, o.date]);
  if (i === 10) C1_ROWS.push([null, null, null, null, null]);
});
const C1_TOTAL = round2(sum(C1.map((o) => o.amount)));
const C1_LAST = C1.length + 1;
const firstCount = (name: string) => C1.filter((o) => o.first === name).length;
const C1_TEXT_AMOUNTS = C1.filter((_, i) => i % 5 === 2).length;

const TASK_CLEAN = sheetTask(
  'xls-t1',
  'Clean the Till Export',
  'till_export_march.xlsx',
  `The Orders sheet is March's till export, straight out of the system. Clean it so it can be analysed, then make it a Table. Keep the columns where they are (A to E).

1. Remove the duplicate orders (the same Order ID twice) and the empty row, so each order appears once with no gaps.
2. ${C1_TEXT_AMOUNTS} amounts came out as text with " GBP" on the end. Make every amount in column D a number (Find & replace works).
3. Column F, headed Date: each order's date as a real date, from the mixed formats in column E (DATEVALUE), filled down to the last order.
4. Column G, headed First name: each customer's first name, with a capital letter and no spaces (Flash Fill with Ctrl+E, or TRIM, PROPER and LEFT/FIND).
5. Format the data (A1 to G${C1_LAST}) as a Table named Orders.`,
  [{ name: 'Orders', rows: [['Order ID', 'Customer', 'Region', 'Amount', 'Order date'], ...C1_ROWS] }],
  [
    [1, 'Each repeated order appears once', `=COUNTIF(Orders!A:A,"${C1_DUPES[0]}")+COUNTIF(Orders!A:A,"${C1_DUPES[1]}")`, '2'],
    [1, `All ${C1.length} orders kept, with no gap`, '=COUNTA(Orders!A:A)-1&" / "&COUNTBLANK(Orders!A2:A' + C1_LAST + ')', values(C1.length, 0)],
    [2, 'Every amount is a number', `=COUNT(Orders!D2:D${C1_LAST + 3})&" / "&ROUND(SUM(Orders!D:D),2)`, values(C1.length, C1_TOTAL)],
    [3, 'Every date is a real date', `=COUNTIF(Orders!F:F,"2026-03-*")&" / "&Orders!F${C1_LAST}`, values(C1.length, C1[C1.length - 1].iso)],
    [3, 'Dates are worked out by formula', `=ISFORMULA(Orders!F${C1_LAST})`, 'TRUE'],
    [4, 'First names are clean', joined(...['Asha', 'Chloe', 'Liam'].map((n) => `COUNTIF(Orders!G:G,"${n}")`)), values(firstCount('Asha'), firstCount('Chloe'), firstCount('Liam'))],
    [4, 'No stray spaces in first names', `=SUMPRODUCT(LEN(Orders!G2:G${C1_LAST}))`, String(sum(C1.map((o) => o.first.length)))],
    [5, 'The data is a Table named Orders', '=PRAXA.TABLE("Orders")', `Orders!A1:G${C1_LAST}`],
  ]
);

// =====================================================================================================
// Task 2: lookups, rules and the numbers a manager asks for
// =====================================================================================================

const PRODUCTS = [
  ['LO-101', 'Trail Tent 2P', 159],
  ['LO-102', 'Ridge Tent 4P', 249],
  ['LO-201', 'Down Sleeping Bag', 119],
  ['LO-302', 'Trail Runners', 99],
  ['LO-401', 'Rain Shell Jacket', 140],
  ['LO-402', 'Fleece Midlayer', 55],
  ['LO-501', 'Camp Stove', 45],
  ['LO-502', 'Titanium Mug', 22],
] as const;
const C2 = (() => {
  const rand = seeded(7202);
  const rows = Array.from({ length: 30 }, (_, i) => ({
    id: `LF-${7001 + i}`,
    sku: pick(rand, PRODUCTS)[0] as string,
    qty: 1 + Math.floor(rand() * 3),
    region: pick(rand, REGIONS) as string,
    channel: rand() < 0.55 ? 'Web' : 'Store',
  }));
  rows[17] = { ...rows[17], sku: 'LO-999' };
  return rows;
})();
const price = (sku: string) => PRODUCTS.find((p) => p[0] === sku)?.[2] ?? 0;
const line = (o: (typeof C2)[number]) => o.qty * price(o.sku);
const C2_LAST = C2.length + 1;
const C2_LINES = C2.map(line);
const LARGE = 150;
const inR = (r: string) => C2.filter((o) => o.region === r);
const webSales = (r: string) => sum(inR(r).filter((o) => o.channel === 'Web').map(line));
const bigOrders = (r: string) => inR(r).filter((o) => line(o) >= LARGE).length;
const avgOrder = (r: string) => round2(sum(inR(r).map(line)) / inR(r).length);
const TOP_WEB = [...REGIONS].sort((a, b) => webSales(b) - webSales(a))[0];

const TASK_LOOKUPS = sheetTask(
  'xls-t2',
  'Lookups, Rules and Totals',
  'orders_q1.xlsx',
  `The Orders sheet has this quarter's orders; the Products sheet lists every product and its price. Use formulas throughout, filled down to the last order (row ${C2_LAST}).

1. Orders column F (Product): the product name for each SKU, looked up from Products with XLOOKUP (or VLOOKUP or INDEX/MATCH), showing Not found when the SKU isn't listed.
2. Orders column G (Line total): Qty × the product's price, or 0 when the SKU isn't found.
3. Orders column H (Size): Large when the line total is £${LARGE} or more, otherwise Small (IF).
4. Summary sheet, B2 to B7: the total of all line totals (SUM), the average (AVERAGE), the median (MEDIAN), the largest (MAX), the smallest (MIN), and how many orders there are (COUNTA of the Order IDs).
5. Summary sheet, rows 11 to 14, for each region: column B the Web channel's sales (SUMIFS), column C the number of Large orders (COUNTIFS), column D the average line total (AVERAGEIFS).`,
  [
    { name: 'Orders', rows: [['Order ID', 'SKU', 'Qty', 'Region', 'Channel', 'Product', 'Line total', 'Size'], ...C2.map((o) => [o.id, o.sku, o.qty, o.region, o.channel])] },
    { name: 'Products', rows: [['SKU', 'Product', 'Price'], ...PRODUCTS.map((p) => [...p])] },
    {
      name: 'Summary',
      rows: [
        ['Measure', 'Value'],
        ['Total sales'],
        ['Average order'],
        ['Median order'],
        ['Largest order'],
        ['Smallest order'],
        ['Number of orders'],
        [],
        [],
        ['Region', 'Web sales', 'Large orders', 'Average order'],
        ...REGIONS.map((r) => [r]),
      ],
    },
  ],
  [
    [1, 'Product names are looked up', joined('Orders!F2', `Orders!F${C2_LAST}`), values(PRODUCTS.find((p) => p[0] === C2[0].sku)![1], PRODUCTS.find((p) => p[0] === C2[C2.length - 1].sku)![1])],
    [1, 'The unknown SKU shows Not found, by formula', `=COUNTIF(Orders!F:F,"Not found")&" / "&ISFORMULA(Orders!F${C2_LAST})`, values(1, 'TRUE')],
    [2, 'Line totals are right, by formula', `=SUM(Orders!G2:G${C2_LAST})&" / "&ISFORMULA(Orders!G${C2_LAST})`, values(sum(C2_LINES), 'TRUE')],
    [3, 'Sizes are right, by formula', `=COUNTIF(Orders!H:H,"Large")&" / "&COUNTIF(Orders!H:H,"Small")&" / "&ISFORMULA(Orders!H${C2_LAST})`, values(C2_LINES.filter((n) => n >= LARGE).length, C2_LINES.filter((n) => n < LARGE).length, 'TRUE')],
    [
      4,
      'Total, average, median, largest, smallest and count',
      joined('ROUND(Summary!B2,2)', 'ROUND(Summary!B3,2)', 'ROUND(Summary!B4,2)', 'Summary!B5', 'Summary!B6', 'Summary!B7'),
      values(sum(C2_LINES), round2(sum(C2_LINES) / C2_LINES.length), median(C2_LINES), Math.max(...C2_LINES), Math.min(...C2_LINES), C2.length),
    ],
    [4, 'The measures are formulas', '=AND(ISFORMULA(Summary!B2),ISFORMULA(Summary!B4),ISFORMULA(Summary!B7))', 'TRUE'],
    [5, 'Web sales by region (SUMIFS)', joined('Summary!B11', 'Summary!B12', 'Summary!B13', 'Summary!B14'), values(...REGIONS.map(webSales))],
    [5, 'Large orders by region (COUNTIFS)', joined('Summary!C11', 'Summary!C12', 'Summary!C13', 'Summary!C14'), values(...REGIONS.map(bigOrders))],
    [5, 'Average order by region (AVERAGEIFS)', joined(...REGIONS.map((_, i) => `ROUND(Summary!D${11 + i},2)`)), values(...REGIONS.map(avgOrder))],
  ]
);

// =====================================================================================================
// Task 3: sorting, filtering and dynamic arrays to answer questions
// =====================================================================================================

const REPS = ['Priya Shah', 'Tom Hale', 'Ana Ruiz', 'Joe Kent', 'Mia Ford', 'Sam Okafor'];
const ITEMS = ['Tent', 'Sleeping bag', 'Jacket', 'Boots', 'Stove'];
const C3 = (() => {
  const rand = seeded(7303);
  return Array.from({ length: 40 }, (_, i) => {
    const units = 1 + Math.floor(rand() * 6);
    return {
      date: `2026-03-${String(1 + Math.floor((i * 30) / 40)).padStart(2, '0')}`,
      rep: pick(rand, REPS),
      region: pick(rand, REGIONS) as string,
      product: pick(rand, ITEMS),
      units,
      revenue: Math.round(units * (60 + rand() * 140)),
      status: rand() < 0.8 ? 'Paid' : 'Refunded',
    };
  });
})();
// Every revenue different, so sorting has one right answer
C3.forEach((s, i) => (s.revenue += i % 3));
const C3_LAST = C3.length + 1;
const C3_SORTED = [...C3].sort((a, b) => b.revenue - a.revenue);
// Rows whose rep and product change when sorted, so keeping rows together is checked on rows that really moved
const C3_MOVED = C3_SORTED.map((x, i) => i).filter((i) => C3[i].rep !== C3_SORTED[i].rep && C3[i].product !== C3_SORTED[i].product).slice(0, 3);
const NORTH_REFUNDS = C3.filter((s) => s.region === 'North' && s.status === 'Refunded').length;
const BIG = 500;
const BIG_PAID = C3.filter((s) => s.status === 'Paid' && s.revenue > BIG).length;
const REPS_AZ = [...new Set(C3.map((s) => s.rep))].sort();
const REGION_REVENUE = [...REGIONS].sort((a, b) => sum(C3.filter((s) => s.region === b).map((s) => s.revenue)) - sum(C3.filter((s) => s.region === a).map((s) => s.revenue)));

const TASK_ANSWERS = sheetTask(
  'xls-t3',
  'Find the Answers',
  'march_sales.xlsx',
  `The Sales sheet has every sale in March. Your manager has questions; answer them with sorting, filters and dynamic array formulas, then answer the questions beside this task.

1. Sort the Sales data by Revenue, largest first, keeping each row together.
2. Turn on the filter and show only North sales that were Refunded. Leave the filter on.
3. Lists sheet, A2: one formula that lists every rep once, A to Z (SORT and UNIQUE).
4. Lists sheet, C2: one formula that returns every Paid sale with revenue over £${BIG}, all seven columns (FILTER).`,
  [
    { name: 'Sales', rows: [['Date', 'Rep', 'Region', 'Product', 'Units', 'Revenue', 'Status'], ...C3.map((s) => [s.date, s.rep, s.region, s.product, s.units, s.revenue, s.status])] },
    { name: 'Lists', rows: [['Reps (A to Z)', '', `Paid sales over £${BIG}`]] },
  ],
  [
    [1, 'Sorted by revenue, largest first', joined('Sales!F2', 'Sales!F3', `Sales!F${C3_LAST}`), values(C3_SORTED[0].revenue, C3_SORTED[1].revenue, C3_SORTED[C3.length - 1].revenue)],
    [1, 'Each row kept together', joined(...C3_MOVED.map((i) => `Sales!B${i + 2}&"-"&Sales!D${i + 2}`)), values(...C3_MOVED.map((i) => `${C3_SORTED[i].rep}-${C3_SORTED[i].product}`))],
    [2, 'The filter shows North refunds only', '=PRAXA.VISIBLE("Sales")', String(NORTH_REFUNDS)],
    [3, 'Reps listed once, A to Z, by one formula', `=Lists!A2&" / "&ROWS(Lists!A2#)&" / "&ISFORMULA(Lists!A2)`, values(REPS_AZ[0], REPS_AZ.length, 'TRUE')],
    [4, `Paid sales over £${BIG}, every column`, '=ROWS(Lists!C2#)&" / "&COLUMNS(Lists!C2#)&" / "&ISFORMULA(Lists!C2)', values(BIG_PAID, 7, 'TRUE')],
  ]
);

// =====================================================================================================
// Task 4: Power Query, a PivotTable, a chart, conditional formatting and a slicer
// =====================================================================================================

const STORES = ['Leeds', 'York', 'Hull', 'Bath', 'Derby'];
const MONTHS = [
  ['jan', '01'],
  ['feb', '02'],
  ['mar', '03'],
] as const;
const C4 = (() => {
  const rand = seeded(7404);
  return MONTHS.flatMap(([m, mm]) =>
    Array.from({ length: 12 }, (_, i) => {
      const region = pick(rand, REGIONS) as string;
      const units = 2 + Math.floor(rand() * 18);
      return { month: m, date: `2026-${mm}-${String(1 + i * 2).padStart(2, '0')}`, store: pick(rand, STORES), region, product: pick(rand, ITEMS), units, revenue: Math.round(units * (40 + rand() * 60)) };
    })
  );
})();
// The files as the stores sent them: regions typed any old way and a blank line in each
const typed = (r: string, i: number) => (i % 3 === 0 ? r.toLowerCase() : i % 3 === 1 ? r.toUpperCase() : r);
export const EXCEL_FILES = MONTHS.map(([m]) => {
  const rows = C4.filter((s) => s.month === m);
  const lines: string[][] = [['Date', 'Store', 'Region', 'Product', 'Units', 'Revenue']];
  rows.forEach((s, i) => {
    lines.push([s.date, s.store, typed(s.region, i), s.product, String(s.units), String(s.revenue)]);
    if (i === 5) lines.push(['', '', '', '', '', '']);
  });
  return { name: `${m}_store_sales.csv`, content: toCsv(lines) };
});
const C4_ROWS = C4.length + 1;
const regionRevenue = (r: string) => sum(C4.filter((s) => s.region === r).map((s) => s.revenue));
const HIGH = 1000;
const HIGH_COUNT = C4.filter((s) => s.revenue > HIGH).length;
const MONTH_TOTALS = MONTHS.map(([m]) => sum(C4.filter((s) => s.month === m).map((s) => s.revenue)));
const BEST_MONTH = ['January', 'February', 'March'][MONTH_TOTALS.indexOf(Math.max(...MONTH_TOTALS))];

const TASK_REPORT = sheetTask(
  'xls-t4',
  'Build the Quarterly Report',
  'q1_report.xlsx',
  `The three monthly store files (jan_store_sales.csv, feb_store_sales.csv, mar_store_sales.csv) are in Files. Build the quarter's report from them.

1. Get data (Power Query): combine the three files into one query named Sales, remove the blank rows, and capitalise each word of Region. Close & Load it (it loads to a sheet called Sales).
2. Insert a PivotTable from the Sales sheet: Rows Region, Values Sum of Revenue (it goes on a sheet called Pivot).
3. Insert a column chart of revenue by region from the PivotTable (the four regions, not the grand total).
4. On the Sales sheet, conditional formatting: highlight every Revenue over £${HIGH.toLocaleString('en-GB')} (column F).
5. Add a slicer on the Sales table for Region, and pick West.`,
  [{ name: 'Report', rows: [['Q1 store report'], ['Build it from the monthly files in Files: Data > Get data.']] }],
  [
    [1, 'Three files combined, blank rows removed', `=COUNTA(Sales!A:A)-1&" / "&AND(ISNUMBER(SEARCH("jan_store",PRAXA.QUERIES())),ISNUMBER(SEARCH("feb_store",PRAXA.QUERIES())),ISNUMBER(SEARCH("mar_store",PRAXA.QUERIES())))`, values(C4.length, 'TRUE')],
    [1, 'Regions capitalised in the query', '=ISNUMBER(SEARCH("clean-case",PRAXA.QUERIES()))&" / "&COUNTIF(Sales!C:C,"North")', values('TRUE', C4.filter((s) => s.region === 'North').length)],
    [2, 'The PivotTable totals each region', joined(...REGIONS.map((r) => `ROUND(VLOOKUP("${r}",Pivot!A:B,2,FALSE),0)`)), values(...REGIONS.map(regionRevenue))],
    [3, 'A column chart of revenue by region', '=OR(ISNUMBER(SEARCH("column region by sum of revenue",PRAXA.CHARTS())),ISNUMBER(SEARCH("bar region by sum of revenue",PRAXA.CHARTS())))', 'TRUE'],
    [4, `Revenue over £${HIGH} highlighted`, `=PRAXA.CFCOUNT(Sales!F2:F${C4_ROWS})`, String(HIGH_COUNT)],
    [5, 'A Region slicer showing West', '=ISNUMBER(SEARCH("sales.region=west",PRAXA.SLICERS()))', 'TRUE'],
  ]
);

// =====================================================================================================

export const EXCEL_SIM_TEST: AssessmentTest = (() => {
  const questions: Question[] = [
    TASK_CLEAN,
    short('xls-t1-a', 'Cleaned Total', 'Once the export is clean, what is the total of all order amounts?', money(C1_TOTAL), { ...ask, taskId: TASK_CLEAN.id }),
    TASK_LOOKUPS,
    choice('xls-t2-a', 'Best Web Region', 'Which region had the highest Web sales this quarter?', [...REGIONS], REGIONS.indexOf(TOP_WEB), { ...ask, taskId: TASK_LOOKUPS.id }),
    short('xls-t2-b', 'Large Orders', `How many orders are Large (£${LARGE} or more)?`, [String(C2_LINES.filter((n) => n >= LARGE).length)], { ...ask, taskId: TASK_LOOKUPS.id }),
    TASK_ANSWERS,
    short('xls-t3-a', 'North Refunds', 'How many North sales were refunded in March?', [String(NORTH_REFUNDS)], { ...ask, taskId: TASK_ANSWERS.id }),
    order('xls-t3-b', 'Regions by Revenue', 'Put the regions in order of total March revenue (paid and refunded), highest first.', REGION_REVENUE, { ...ask, taskId: TASK_ANSWERS.id }),
    TASK_REPORT,
    choice('xls-t4-a', 'Best Month', 'Which month had the highest total revenue across the stores?', ['January', 'February', 'March'], ['January', 'February', 'March'].indexOf(BEST_MONTH), { ...ask, taskId: TASK_REPORT.id }),
    short('xls-t4-b', "West's Quarter", "What was the West region's total revenue for the quarter?", money(regionRevenue('West')), { ...ask, taskId: TASK_REPORT.id }),
  ];
  const total = sum(questions.map((q) => q.weight));
  const scaled = questions.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) }));
  scaled[0].weight += 100 - sum(scaled.map((q) => q.weight));
  return {
    id: 'test-da-excel',
    title: 'Excel',
    description:
      'Four spreadsheet tasks, no quiz: clean a till export (duplicates, blanks, text amounts and dates, Flash Fill) and make it a Table; look up products and build totals with IF, SUMIFS, COUNTIFS and AVERAGEIFS; answer questions with sorting, filters, UNIQUE, SORT and FILTER; and build a quarterly report with Power Query, a PivotTable, a chart, conditional formatting and a slicer.',
    skillsTested: ['Excel', 'Data Cleaning', 'XLOOKUP', 'SUMIFS', 'Dynamic Arrays', 'PivotTables', 'Power Query', 'Charts'],
    roles: ['Data Analyst'] as AssessmentTest['roles'],
    type: 'standard',
    category: 'Data Analysis',
    difficulty: 'Professional',
    passingScore: 70,
    scenario: {
      company: 'Larkfield Outdoor',
      role: 'Data Analyst',
      brief: `Larkfield Outdoor sells camping gear online and in five shops. Colleagues send you spreadsheets to finish; each task opens its own workbook, and the stores' monthly files are in Files.

Use formulas wherever a step asks for them, so the workbook still works when the data changes. Answer the questions beside each task from what your workbook shows.`,
      files: EXCEL_FILES,
    },
    questions: scaled,
    totalQuestions: scaled.length,
    estimatedMinutes: 20,
  };
})();
