import { AssessmentTest, TestRole } from '../../types';
import { caseStudy, choice, multi, short, written } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';

// Second tests for the analyst tool sections: Excel, SQL, Power BI, Tableau and Python. Written as skeletons, so the
// main (Junior) test has no questions of its own.

export const analystMain = (
  id: string,
  title: string,
  description: string,
  skillsTested: string[],
  roles: TestRole[] = ['Data Analyst']
): AssessmentTest => ({
  id,
  title,
  description,
  skillsTested,
  roles,
  type: 'standard',
  category: 'Data Analysis',
  difficulty: 'Junior',
  passingScore: 70,
  questions: [],
  estimatedMinutes: 0,
  totalQuestions: 0,
});

export const ANALYST_TOOL_TESTS_2: AssessmentTest[] = [
  analystMain(
    'test-excel-02',
    'Excel: PivotTables, Lookups & Models',
    'XLOOKUP and dynamic arrays, PivotTables, and what-if models, then real workbooks: summarise sales, build a break-even model and fix a monthly consolidation.',
    ['Excel', 'PivotTables', 'XLOOKUP', 'Financial Modelling'],
    ['Data Analyst', 'Business Analyst', 'Financial Analyst']
  ),
  analystMain(
    'test-sql-03',
    'SQL: CTEs, Window Functions & Cohorts',
    'Grouping and CTEs, window functions and dates, then real analysis: monthly revenue, cohort retention and a query that double-counts.',
    ['SQL', 'Window Functions', 'CTEs', 'Cohort Analysis'],
    ['Data Analyst', 'Business Analyst', 'Data Engineer']
  ),
  analystMain(
    'test-pbi-02',
    'Power BI: Time Intelligence & Advanced DAX',
    'Year-to-date and year-on-year, filter context and iterators, and models a whole company can trust.',
    ['Power BI', 'DAX', 'Time Intelligence', 'Semantic Models'],
    ['Data Analyst', 'Business Analyst']
  ),
  analystMain(
    'test-tab-02',
    'Tableau: Table Calculations, LODs & Advanced Charts',
    'Table calculations, LOD expressions and the order Tableau applies filters, then Pareto charts and a dashboard showing the wrong share.',
    ['Tableau', 'Table Calculations', 'LOD Expressions', 'Advanced Charts'],
    ['Data Analyst', 'Business Analyst']
  ),
  analystMain(
    'test-py-02',
    'Python: Time Series, Statistics & Charts',
    'Dates and rolling averages in pandas, statistics with numpy and scipy, and charts with matplotlib, then an A/B test and a forecast to review.',
    ['Python', 'pandas', 'Statistics', 'matplotlib'],
    ['Data Analyst', 'Data Engineer']
  ),
];

// ---------- Excel 2 ----------
export const EXCEL_2_MODULE: ModuleSkeleton = {
  familyId: 'test-excel-02',
  aspects: [
    { id: 'formulas', name: 'Lookups & Dynamic Arrays', summary: 'References, XLOOKUP, FILTER, UNIQUE and fast workbooks.' },
    { id: 'pivots', name: 'PivotTables', summary: 'Summarising data with PivotTables and the Data Model.' },
    { id: 'models', name: 'What-if Models', summary: 'Goal Seek, data tables and models others can trust.' },
    { id: 'case', name: 'Workbook Cases', summary: 'Real workbooks: summarise, model and fix.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'formulas',
      B,
      choice(
        'm-xl2-f-b1',
        'Copying Down',
        'You copy =B2*$E$1 from C2 down to C3. What does C3 contain?',
        ['=B3*$E$1', '=B3*$E$2', '=B2*$E$1', '=C3*$E$1'],
        0
      )
    ),
    ...tagged(
      'formulas',
      J,
      choice(
        'm-xl2-f-j1',
        'Not in the List',
        'A2 holds a product ID that isn’t in Products[ID]. What does this return?\n\n=XLOOKUP(A2, Products[ID], Products[Price], "Not found")',
        ['"Not found"', '#N/A', '0', 'The first price in the list'],
        0
      )
    ),
    ...tagged(
      'formulas',
      P,
      choice(
        'm-xl2-f-p1',
        'A Spilled List',
        'What does this return?\n\n=SORT(UNIQUE(FILTER(Sales[Region], Sales[Amount] > 1000)))',
        [
          'An alphabetical list, spilling down, of each region with at least one sale over 1,000, each listed once',
          'The total of sales over 1,000 by region',
          'One region: the one with the largest sale',
          'Every row of Sales over 1,000',
        ],
        0
      )
    ),
    ...tagged(
      'formulas',
      S,
      choice(
        'm-xl2-f-s1',
        'Minutes to Recalculate',
        'A 200,000-row workbook uses VLOOKUP on whole columns in every row, plus OFFSET and INDIRECT in the summaries. Every edit takes minutes. What helps most?',
        [
          'Look up exact table ranges (XLOOKUP or INDEX/MATCH), replace volatile OFFSET/INDIRECT, and move the joins into Power Query or the Data Model',
          'Turn calculation to manual and forget to recalculate',
          'Split the workbook into ten copies',
          'Add more VLOOKUPs to check the first ones',
        ],
        0
      )
    ),
    ...tagged(
      'pivots',
      B,
      choice(
        'm-xl2-p-b1',
        'What a PivotTable Does',
        'What is a PivotTable for?',
        ['Summarising many rows by categories, such as sales by region and month, without writing formulas', 'Drawing pictures', 'Checking spelling', 'Sending data to a database'],
        0
      )
    ),
    ...tagged(
      'pivots',
      J,
      choice(
        'm-xl2-p-j1',
        'Count Instead of Sum',
        'You drag Amount into Values and the pivot shows “Count of Amount”. Why, and what do you do?',
        [
          'Some Amount cells are text or blank; fix them to numbers and set the field to Sum',
          'PivotTables can only count',
          'The pivot needs refreshing',
          'Amount must be in Rows first',
        ],
        0
      )
    ),
    ...tagged(
      'pivots',
      P,
      choice(
        'm-xl2-p-p1',
        'Share of the Total',
        'In a pivot of sales by region, how do you show each region’s share of all sales?',
        ['Show Values As → % of Grand Total', 'Divide each cell by hand', 'Add a calculated item for each region', 'Sort by sales'],
        0
      )
    ),
    ...tagged(
      'pivots',
      S,
      choice(
        'm-xl2-p-s1',
        'Two Tables, One Pivot',
        'You need a pivot of sales by customer segment. Segment is in a Customers table; sales are in an Orders table. What’s the best approach?',
        [
          'Load both into the Data Model, relate them on CustomerID, and build the pivot from the model',
          'VLOOKUP the segment onto every order row',
          'Copy both tables into one sheet side by side',
          'Make two pivots and add them up',
        ],
        0
      )
    ),
    ...tagged('models', B, short('m-xl2-m-b1', 'Contribution', 'Price £20, variable cost £12 a unit, 1,000 units sold.\n\nWhat is the total contribution, in £?', ['8000', '8,000', '8k'])),
    ...tagged(
      'models',
      J,
      choice(
        'm-xl2-m-j1',
        'The Price for Zero Profit',
        'Your model has a price input and a profit cell. How do you find the price where profit is exactly zero?',
        ['Goal Seek: set the profit cell to 0 by changing the price cell', 'Trial and error until it’s close', 'A PivotTable', 'Sort the data by profit'],
        0
      )
    ),
    ...tagged(
      'models',
      P,
      choice(
        'm-xl2-m-p1',
        'Five Prices by Five Volumes',
        'The sales director wants profit for 5 prices and 5 volumes at once. What do you build?',
        ['A two-variable Data Table (What-If Analysis)', 'Twenty-five copies of the model', 'A PivotTable of prices', 'Goal Seek, run 25 times'],
        0
      )
    ),
    ...tagged(
      'models',
      S,
      choice(
        'm-xl2-m-s1',
        'An Inherited Model',
        'You inherit a pricing model with numbers typed inside formulas across 30 sheets, and nobody knows which are assumptions. What do you do?',
        [
          'Pull the assumptions onto one inputs sheet, point formulas at them, make formulas consistent, add checks, and test the outputs against the old model',
          'Leave it alone; it seems to work',
          'Delete it and start again from memory',
          'Lock every sheet so nobody can change it',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-xl2-c-b1', 'Rounding', 'What does =ROUND(2.456, 1) return?', ['2.5'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-xl2-c-j',
        'Q1 Sales by Rep',
        `A table named Sales:

Rep   Region   Jan      Feb      Mar
Ana   North    12,000   15,000   9,000
Ben   South    8,000    7,000    11,000
Cai   North    10,000   10,000   10,000
Dee   South    14,000   16,000   15,000`,
        'Workbook'
      ),
      short('m-xl2-c-j1', 'SUMIFS', 'What does =SUMIFS(Sales[Mar], Sales[Region], "North") return?', ['19000', '19,000', '19k'], { taskId: 'm-xl2-c-j' }),
      short('m-xl2-c-j2', 'COUNTIFS', 'What does =COUNTIFS(Sales[Region], "South", Sales[Mar], ">10000") return?', ['2'], { taskId: 'm-xl2-c-j' }),
      written(
        'm-xl2-c-j3',
        'A Summary That Keeps Up',
        'The manager wants a monthly summary by region that stays right as reps and months are added. How do you build it?',
        [
          'Keeps the data as an Excel Table so new rows are included automatically',
          'Unpivots months into rows (e.g. with Power Query) so new months don’t need new formulas',
          'Summarises with a PivotTable (refreshed) or SUMIFS on structured references',
          'Checks the summary total matches the data total',
        ],
        `I'd keep the data as a Table, and use Power Query to unpivot it into Rep, Region, Month, Sales, so April is just more rows rather than a new column. A PivotTable on that, with Region in rows and Month in columns, gives the summary; refreshing picks up new reps and months. I'd add a check cell that compares the pivot's grand total with the sum of the source.`,
        { taskId: 'm-xl2-c-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-xl2-c-p',
        'Break-even Model',
        `A product sells for £40. Each unit costs £25 to make. Fixed costs are £60,000 a month.

The sales director expects to sell 5,000 units a month and wants to test a 10% price cut.`,
        'Model brief'
      ),
      short('m-xl2-c-p1', 'Break-even', 'How many units a month break even?', ['4000', '4,000'], { taskId: 'm-xl2-c-p' }),
      short(
        'm-xl2-c-p2',
        'The Price Cut',
        'At 5,000 units, by how much does a 10% price cut reduce monthly profit, in £?',
        ['20000', '20,000', '20k'],
        { taskId: 'm-xl2-c-p' }
      ),
      written(
        'm-xl2-c-p3',
        'A Model They Can Use',
        'How would you build the model so the sales director can try prices and volumes themselves, and what would you point out about the price cut?',
        [
          'Separate, clearly marked input cells for price, unit cost, fixed costs and volume, with formulas only referencing them',
          'Outputs: contribution per unit, profit and break-even units',
          'A data table (or chart) of profit across prices and volumes',
          'Points out that at £36 contribution falls to £11, so break-even rises to about 5,455 units and 5,000 units would lose £5,000; volume must rise by over a third to keep profit at £15,000',
        ],
        `One inputs block at the top (price, unit cost, fixed costs, volume), shaded so it's obvious what to change; everything else is formulas pointing at it. Outputs: contribution per unit, monthly profit and break-even units. Below, a two-way data table of profit for prices £32 to £44 and volumes 3,000 to 7,000. On the price cut: at £36 each unit contributes £11, not £15, so break-even jumps from 4,000 to about 5,455 units. At 5,000 units we'd lose £5,000 a month instead of making £15,000. To earn the same £15,000 we'd need to sell about 6,818 units, 36% more.`,
        { taskId: 'm-xl2-c-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-xl2-c-s',
        'The Monthly Consolidation',
        `Each month, 12 regional managers email a copy of the budget template. An analyst copies and pastes each into a master workbook, which takes two days.

Last quarter:
• Two regions added rows, so their totals were pasted one row out of line
• One region renamed a column
• One file arrived late and last month's numbers were used without anyone noticing`,
        'Process notes'
      ),
      multi(
        'm-xl2-c-s1',
        'Root Causes',
        'What are the root causes? Tick all that apply.',
        ['Manual copy and paste', 'Templates managers can change freely', 'No checks that every file is this month’s and totals agree', 'Managers sending files too early', 'Excel can’t add up 12 files'],
        [0, 1, 2],
        { taskId: 'm-xl2-c-s' }
      ),
      choice(
        'm-xl2-c-s2',
        'The Tool',
        'Which change removes the copy and paste?',
        [
          'Power Query: combine every file in a shared folder into one table, refreshed in one click',
          'A macro that copies cell ranges by position',
          'A bigger master workbook',
          'Asking managers to paste into the master themselves',
        ],
        0,
        { taskId: 'm-xl2-c-s' }
      ),
      written(
        'm-xl2-c-s3',
        'The New Process',
        'Design the new process and say how you’d roll it out.',
        [
          'A locked template: fixed columns, data entry only in input cells, data validation',
          'Files saved to a shared folder and combined with Power Query by column name, not position',
          'Checks: one file per region with this month’s date in it, totals reconcile to each file, and an exceptions list',
          'Rolls out with a parallel run against the old process and a short guide for managers',
        ],
        `First, a locked template: fixed columns, input cells only, drop-downs for categories, and a cell for the month. Managers save it to a shared folder instead of emailing it. Power Query combines every file in the folder by column name, so added rows or a moved column can't knock totals out of line. A checks sheet lists each region, the month in its file and whether its total matches the master, so a missing or stale file shows in red. I'd run it alongside the old process for one month, confirm the totals match to the penny, then switch over with a one-page guide for managers. Two days of pasting should become a refresh.`,
        { taskId: 'm-xl2-c-s' }
      )
    ),
  ],
};

// ---------- SQL 2 ----------
export const SQL_3_MODULE: ModuleSkeleton = {
  familyId: 'test-sql-03',
  aspects: [
    { id: 'grouping', name: 'Grouping & CTEs', summary: 'Aggregates, HAVING, joins that keep every row, and CTEs.' },
    { id: 'windows', name: 'Window Functions', summary: 'Ranking, running totals and moving averages.' },
    { id: 'dates', name: 'Dates & Cohorts', summary: 'Date ranges, months, time zones and cohorts.' },
    { id: 'case', name: 'Query Cases', summary: 'Real tables: work out results and fix queries.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'grouping',
      B,
      choice(
        'm-sql3-g-b1',
        'Filtering Groups',
        'You want only customers whose total spend is over 1,000. Which clause filters on the total?',
        ['HAVING SUM(amount) > 1000', 'WHERE SUM(amount) > 1000', 'ORDER BY SUM(amount) > 1000', 'LIMIT 1000'],
        0
      )
    ),
    ...tagged(
      'grouping',
      J,
      choice(
        'm-sql3-g-j1',
        'Customers Who Ordered',
        'How many different customers placed an order?',
        ['SELECT COUNT(DISTINCT customer_id) FROM orders', 'SELECT COUNT(*) FROM orders', 'SELECT COUNT(customer_id) FROM orders', 'SELECT SUM(customer_id) FROM orders'],
        0
      )
    ),
    ...tagged(
      'grouping',
      P,
      choice(
        'm-sql3-g-p1',
        'Including Zero',
        'You want every customer with their number of 2025 orders, including customers with none. Which query?',
        [
          'FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.order_date >= \'2025-01-01\' … GROUP BY c.id',
          'FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.order_date >= \'2025-01-01\' … GROUP BY c.id',
          'FROM orders o JOIN customers c ON o.customer_id = c.id … GROUP BY c.id',
          'FROM customers c, orders o … GROUP BY c.id',
        ],
        0
      )
    ),
    ...tagged(
      'grouping',
      S,
      choice(
        'm-sql3-g-s1',
        'Double Counting',
        'A query joins customers to orders and to payments, then sums both. Totals come out too high. Why, and what’s the fix?',
        [
          'Each order row is repeated for every payment (and vice versa); aggregate orders and payments per customer in separate CTEs, then join',
          'SUM is unreliable on large tables',
          'Use COUNT instead of SUM',
          'Add ORDER BY',
        ],
        0
      )
    ),
    ...tagged(
      'windows',
      B,
      choice(
        'm-sql3-w-b1',
        'Numbering Rows',
        'What does ROW_NUMBER() OVER (ORDER BY amount DESC) do?',
        ['Numbers the rows 1, 2, 3… from the largest amount down', 'Counts the rows', 'Sums the amounts', 'Removes duplicate amounts'],
        0
      )
    ),
    ...tagged('windows', J, short('m-sql3-w-j1', 'RANK with Ties', 'Amounts are 100, 90, 90 and 80. What does RANK() OVER (ORDER BY amount DESC) give the 80?', ['4'])),
    ...tagged(
      'windows',
      P,
      choice(
        'm-sql3-w-p1',
        'Running Total per Customer',
        'Which gives each customer’s running total of spend over time?',
        [
          'SUM(amount) OVER (PARTITION BY customer_id ORDER BY order_date)',
          'SUM(amount) OVER (ORDER BY customer_id)',
          'SUM(amount) GROUP BY customer_id, order_date',
          'RANK() OVER (PARTITION BY customer_id)',
        ],
        0
      )
    ),
    ...tagged(
      'windows',
      S,
      choice(
        'm-sql3-w-s1',
        'A Seven-Day Average',
        'daily_sales has one row per day with sales, but days with no sales have no row. What’s wrong with AVG(sales) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)?',
        [
          'It averages the last 7 rows, not 7 days, so gaps stretch the window; join to a full calendar first (zero-filled) or use a RANGE window over dates',
          'Nothing; ROWS always means days',
          'AVG can’t be used as a window function',
          'It should be 7 PRECEDING',
        ],
        0
      )
    ),
    ...tagged(
      'dates',
      B,
      choice(
        'm-sql3-d-b1',
        'March Orders',
        'order_date is a timestamp. Which filter gets every order in March 2025?',
        [
          "WHERE order_date >= '2025-03-01' AND order_date < '2025-04-01'",
          "WHERE order_date BETWEEN '2025-03-01' AND '2025-03-31'",
          "WHERE order_date = '2025-03'",
          "WHERE order_date LIKE 'March'",
        ],
        0
      )
    ),
    ...tagged(
      'dates',
      J,
      choice(
        'm-sql3-d-j1',
        'By Month',
        'Which groups orders by calendar month?',
        ["GROUP BY DATE_TRUNC('month', order_date)", 'GROUP BY order_date', 'GROUP BY EXTRACT(day FROM order_date)', 'GROUP BY 30'],
        0
      )
    ),
    ...tagged(
      'dates',
      P,
      choice(
        'm-sql3-d-p1',
        'Cohort Month',
        'To build cohorts, how do you find each customer’s cohort?',
        [
          "In a CTE: SELECT customer_id, DATE_TRUNC('month', MIN(order_date)) AS cohort FROM orders GROUP BY customer_id",
          'The month of their latest order',
          'The month they were added to the marketing list',
          "DATE_TRUNC('month', order_date) on every order",
        ],
        0
      )
    ),
    ...tagged(
      'dates',
      S,
      choice(
        'm-sql3-d-s1',
        'The Wrong Day',
        'Timestamps are stored in UTC. The UK business reports daily sales, and in summer, orders placed just after midnight show up on the previous day. What’s the fix?',
        [
          "Convert to the business's time zone (e.g. AT TIME ZONE 'Europe/London') before truncating to a date",
          'Add one hour to every timestamp all year',
          'Report in UTC and ignore it',
          'Drop orders placed between midnight and 1am',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-sql3-c-b1', 'Counting', 'Column x holds 3, 6, 9 and 5.\n\nWhat does SELECT COUNT(*) FROM t WHERE x > 5 return?', ['2'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-sql3-c-j',
        'Orders',
        `orders

order_id  customer_id  order_date   amount
1         A            2025-01-05   50
2         B            2025-01-20   30
3         A            2025-02-02   70
4         C            2025-02-14   20
5         B            2025-03-01   40
6         A            2025-03-09   60`,
        'Table'
      ),
      short(
        'm-sql3-c-j1',
        'Repeat Customers',
        'What does this return?\n\nSELECT COUNT(*) FROM (SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > 1) t',
        ['2'],
        { taskId: 'm-sql3-c-j' }
      ),
      short(
        'm-sql3-c-j2',
        'Month on Month',
        'By what % did revenue change from February to March? (One decimal place.)',
        ['11.1%', '11.1', '11.11'],
        { taskId: 'm-sql3-c-j' }
      ),
      written(
        'm-sql3-c-j3',
        'The Query',
        'Write a query that returns each month’s revenue alongside the previous month’s.',
        [
          'Groups revenue by month (e.g. DATE_TRUNC) in a CTE or subquery',
          'Uses LAG(revenue) OVER (ORDER BY month) for the previous month',
          'Orders the result by month',
          'Optionally works out the change or % change, guarding against division by zero',
        ],
        `WITH monthly AS (
  SELECT DATE_TRUNC('month', order_date) AS month, SUM(amount) AS revenue
  FROM orders
  GROUP BY 1
)
SELECT month,
       revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
       ROUND(100.0 * (revenue - LAG(revenue) OVER (ORDER BY month))
             / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 1) AS pct_change
FROM monthly
ORDER BY month;`,
        { taskId: 'm-sql3-c-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-sql3-c-p',
        'Cohort Retention',
        `A query has produced:

cohort_month  customers  active_month_1  active_month_2
2025-01       200        80              60
2025-02       250        90              70

(active_month_1 = customers from the cohort who ordered in the month after their first order.)`,
        'Query output'
      ),
      short('m-sql3-c-p1', 'January, Month 1', 'What is the January cohort’s month-1 retention, as a %?', ['40%', '40', '0.4'], { taskId: 'm-sql3-c-p' }),
      short('m-sql3-c-p2', 'February, Month 2', 'What is the February cohort’s month-2 retention, as a %?', ['28%', '28', '0.28'], { taskId: 'm-sql3-c-p' }),
      written(
        'm-sql3-c-p3',
        'Building It',
        'Describe (or write) the SQL that produces a table like this from an orders table.',
        [
          'A CTE with each customer’s cohort month: the month of their first order',
          'Joins orders to it and works out months since the cohort month for each order',
          'Counts DISTINCT customers per cohort and months-since value',
          'Pivots or filters to month 1 and month 2 (and the cohort size at month 0)',
        ],
        `WITH firsts AS (
  SELECT customer_id, DATE_TRUNC('month', MIN(order_date)) AS cohort_month
  FROM orders GROUP BY customer_id
),
activity AS (
  SELECT f.cohort_month, o.customer_id,
         (EXTRACT(year FROM o.order_date) - EXTRACT(year FROM f.cohort_month)) * 12
         + EXTRACT(month FROM o.order_date) - EXTRACT(month FROM f.cohort_month) AS month_n
  FROM orders o JOIN firsts f USING (customer_id)
)
SELECT cohort_month,
       COUNT(DISTINCT customer_id) FILTER (WHERE month_n = 0) AS customers,
       COUNT(DISTINCT customer_id) FILTER (WHERE month_n = 1) AS active_month_1,
       COUNT(DISTINCT customer_id) FILTER (WHERE month_n = 2) AS active_month_2
FROM activity
GROUP BY cohort_month
ORDER BY cohort_month;`,
        { taskId: 'm-sql3-c-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-sql3-c-s',
        'Revenue and Tickets by Region',
        `SELECT c.region,
       SUM(o.amount)      AS revenue,
       COUNT(t.ticket_id) AS tickets
FROM customers c
JOIN orders o           ON o.customer_id = c.customer_id
LEFT JOIN support_tickets t ON t.customer_id = c.customer_id
GROUP BY c.region;

Customer X has 3 orders totalling £300 and 2 support tickets.`,
        'Query under review'
      ),
      short('m-sql3-c-s1', 'Customer X’s Revenue', 'How much revenue does the query count for customer X, in £?', ['600', '£600'], { taskId: 'm-sql3-c-s' }),
      short('m-sql3-c-s2', 'Customer X’s Tickets', 'How many tickets does it count for customer X?', ['6'], { taskId: 'm-sql3-c-s' }),
      written(
        'm-sql3-c-s3',
        'The Fix',
        'Explain the problem to the author and give the fixed query.',
        [
          'Explains the fan-out: each order row is repeated for each ticket, so revenue and tickets multiply (3 × 2 = 6 rows for X)',
          'Aggregates orders and tickets per customer separately (CTEs or subqueries) before joining',
          'Keeps customers with no tickets (LEFT JOIN, COALESCE to 0)',
          'Suggests a guard, e.g. comparing the total to a simple SUM over orders',
        ],
        `Joining orders and tickets to the same customer multiplies them: X's 3 orders × 2 tickets make 6 rows, so revenue is doubled (£600) and tickets tripled (6). Aggregate each one per customer first, then join:

WITH o AS (SELECT customer_id, SUM(amount) AS revenue FROM orders GROUP BY customer_id),
     t AS (SELECT customer_id, COUNT(*) AS tickets FROM support_tickets GROUP BY customer_id)
SELECT c.region, SUM(o.revenue) AS revenue, SUM(COALESCE(t.tickets, 0)) AS tickets
FROM customers c
JOIN o ON o.customer_id = c.customer_id
LEFT JOIN t ON t.customer_id = c.customer_id
GROUP BY c.region;

As a check, total revenue should equal SELECT SUM(amount) FROM orders.`,
        { taskId: 'm-sql3-c-s' }
      )
    ),
  ],
};

// ---------- Power BI 2 ----------
export const POWER_BI_2_MODULE: ModuleSkeleton = {
  familyId: 'test-pbi-02',
  aspects: [
    { id: 'time', name: 'Time Intelligence', summary: 'Date tables, year-to-date, fiscal years and fair comparisons.' },
    { id: 'context', name: 'Filter Context & Iterators', summary: 'ALL, ALLSELECTED, KEEPFILTERS and the X functions.' },
    { id: 'scale', name: 'Performance & Governance', summary: 'Storage modes, sharing and one version of the truth.' },
    { id: 'case', name: 'Model Cases', summary: 'Real numbers from a model: compute, compare and decide.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'time',
      B,
      choice(
        'm-pbi2-t-b1',
        'A Proper Date Table',
        'Why does a model need its own Date table for time intelligence?',
        [
          'Functions like DATESYTD need one continuous row per day, related to the fact table and marked as a date table',
          'Power BI can’t display dates otherwise',
          'It makes the file smaller',
          'It isn’t needed',
        ],
        0
      )
    ),
    ...tagged(
      'time',
      J,
      choice(
        'm-pbi2-t-j1',
        'Year to Date',
        'Which measure gives sales year to date?',
        ['TOTALYTD([Total Sales], \'Date\'[Date])', 'SUM(Sales[Amount]) / 12', 'CALCULATE([Total Sales], ALL(\'Date\'))', 'SAMEPERIODLASTYEAR([Total Sales])'],
        0
      )
    ),
    ...tagged(
      'time',
      P,
      choice(
        'm-pbi2-t-p1',
        'An April Year',
        'The financial year runs April to March. How do you get financial-year-to-date sales?',
        [
          'CALCULATE([Total Sales], DATESYTD(\'Date\'[Date], "3-31"))',
          'TOTALYTD([Total Sales], \'Date\'[Date]) − 3',
          'Filter out January to March',
          'Shift every date by three months in Power Query',
        ],
        0
      )
    ),
    ...tagged(
      'time',
      S,
      choice(
        'm-pbi2-t-s1',
        'Half a Month',
        'On 15 March, this month vs the same month last year shows sales down 50%. What’s wrong, and what do you do?',
        [
          'It compares half of March with all of last March; limit last year to the same days (up to the last date with sales, shifted a year)',
          'Sales really did halve',
          'The Date table is broken',
          'Hide the current month',
        ],
        0
      )
    ),
    ...tagged(
      'context',
      B,
      choice(
        'm-pbi2-x-b1',
        'Filter Context',
        'What is filter context?',
        [
          'The filters applied when a measure is worked out: from slicers, filters and the row and column of the visual',
          'The colour of a filtered visual',
          'The list of tables in the model',
          'A setting for refresh',
        ],
        0
      )
    ),
    ...tagged(
      'context',
      J,
      choice(
        'm-pbi2-x-j1',
        'Share of What’s Selected',
        'Users pick some categories in a slicer. Each category should show its share of the selected categories’ total. Which denominator?',
        ['CALCULATE([Total Sales], ALLSELECTED(Products[Category]))', 'CALCULATE([Total Sales], ALL(Products))', '[Total Sales]', 'SUM(Products[Category])'],
        0
      )
    ),
    ...tagged(
      'context',
      P,
      choice(
        'm-pbi2-x-p1',
        'Average per Customer',
        'Which measure gives average sales per customer?',
        ['AVERAGEX(VALUES(Customers[CustomerID]), [Total Sales])', 'AVERAGE(Sales[Amount])', '[Total Sales] / COUNTROWS(Sales)', 'SUMX(Customers, [Total Sales])'],
        0
      )
    ),
    ...tagged(
      'context',
      S,
      choice(
        'm-pbi2-x-s1',
        'Red Everywhere',
        'Red Sales = CALCULATE([Total Sales], Products[Colour] = "Red") shows Red’s sales on every row of a table by colour, including Blue. How do you make it show Red only on Red’s row?',
        [
          'Wrap the filter in KEEPFILTERS, so it intersects with the colour already in context instead of replacing it',
          'Use ALL(Products[Colour])',
          'Add a page filter for Red',
          'Use SUM instead of CALCULATE',
        ],
        0
      )
    ),
    ...tagged(
      'scale',
      B,
      choice(
        'm-pbi2-s-b1',
        'Import or DirectQuery',
        'What’s the difference between Import and DirectQuery?',
        [
          'Import loads data into the model and refreshes on a schedule (fast visuals); DirectQuery asks the source every time a visual loads',
          'They are the same',
          'DirectQuery copies the data into Excel',
          'Import only works with CSV files',
        ],
        0
      )
    ),
    ...tagged(
      'scale',
      J,
      choice(
        'm-pbi2-s-j1',
        'Sharing with 200 People',
        'A report needs to reach 200 people across the company. What’s the right way?',
        ['Publish it to a workspace and share it through an app (or audience) with access by group', 'Email the .pbix file', 'Screenshots every Monday', 'Share your login'],
        0
      )
    ),
    ...tagged(
      'scale',
      P,
      choice(
        'm-pbi2-s-p1',
        'A Bloated Model',
        'The model is 2 GB. VertiPaq Analyzer shows one column takes 60% of it. What is it most likely to be?',
        ['A high-cardinality column such as a GUID or a timestamp to the second', 'A Yes/No column', 'The Date table', 'A column of country names'],
        0
      )
    ),
    ...tagged(
      'scale',
      S,
      choice(
        'm-pbi2-s-s1',
        'Three Revenues',
        'Sales, finance and marketing each have a Power BI report showing a different “revenue”. What’s the lasting fix?',
        [
          'Agree one definition with finance, build it into a shared, certified semantic model, and have reports connect to it',
          'Pick the highest number',
          'Add a footnote to each report',
          'Ban the other teams from Power BI',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-pbi2-c-b1', 'Year on Year', 'Sales this year 1,100; last year 1,000.\n\nWhat is the year-on-year growth, as a %?', ['10%', '10', '0.1'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-pbi2-c-j',
        'Q1 Compared',
        `Monthly sales, £k:

Month   2024   2025
Jan     100    120
Feb     110    121
Mar     130    117`,
        'Matrix'
      ),
      short('m-pbi2-c-j1', 'Q1 2025', 'What is 2025 year-to-date sales at the end of March, in £k?', ['358', '358k'], { taskId: 'm-pbi2-c-j' }),
      short('m-pbi2-c-j2', 'Q1 Growth', 'What is Q1 growth on last year, as a %? (One decimal place.)', ['5.3%', '5.3', '5.29'], { taskId: 'm-pbi2-c-j' }),
      written(
        'm-pbi2-c-j3',
        'March',
        'The manager sees March down and Q1 up and asks which to believe. Answer them.',
        [
          'Both are true: Q1 is up about 5% (£358k vs £340k), but March fell 10% (£117k vs £130k)',
          'The trend is slowing: January +20%, February +10%, March −10%',
          'Suggests checking why, e.g. timing of Easter or a large order, before concluding',
          'Suggests what to watch, e.g. month-on-month and rolling three months alongside YTD',
        ],
        `Both. Q1 is up 5.3% (£358k against £340k), but growth has been slowing every month: January +20%, February +10%, and March −10%. Year-to-date hides that because the strong January carries it. Before worrying I'd check March for one-offs, like Easter falling in March last year or a big order last March, and I'd add a rolling three-month comparison next to YTD so a slowdown shows up sooner.`,
        { taskId: 'm-pbi2-c-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-pbi2-c-p',
        'Average Spend',
        `Customers table: A, B, C and D.

Customer   Total Sales   Orders
A          £500          5
B          £300          1
C          £200          2
D          (blank)       0

Measure: Avg per Customer = AVERAGEX(VALUES(Customers[CustomerID]), [Total Sales])`,
        'Model notes'
      ),
      short(
        'm-pbi2-c-p1',
        'What It Shows',
        'What does Avg per Customer return for all four customers, in £? (Two decimal places.)',
        ['333.33', '333.3', '333'],
        { taskId: 'm-pbi2-c-p' }
      ),
      short('m-pbi2-c-p2', 'Per Order', 'What is the average order value, in £?', ['125', '£125'], { taskId: 'm-pbi2-c-p' }),
      written(
        'm-pbi2-c-p3',
        'Which Average?',
        'Marketing wants “average spend per customer”. What do you tell them about these numbers?',
        [
          'AVERAGEX skips D’s blank, so it is the average per buying customer (£333.33), not per customer (£250)',
          'Average order value (£125) answers a different question from spend per customer',
          'Asks which they mean: all customers or only those who bought, and over what period',
          'Fixes the measure to match, e.g. adding + 0 to count non-buyers if they want all customers',
        ],
        `It depends what they mean. The measure skips D because D's sales are blank, so £333.33 is the average across customers who bought. Across all four customers it's £250, and per order it's £125, a different question again. If they want every customer, including those who haven't bought, I'd change the measure to AVERAGEX(VALUES(Customers[CustomerID]), [Total Sales] + 0) and label it clearly. I'd also agree the period with them, since "spend" over a month and over a year are very different.`,
        { taskId: 'm-pbi2-c-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-pbi2-c-s',
        'Three Numbers for 2025',
        `The CFO has seen three reports with three revenue figures for 2025:

Sales dashboard        £4.6m   includes shipping charged to customers (£0.3m)
Operations report      £4.3m   before returns
Finance report         £4.1m   after £0.2m of returns, excluding shipping

Each team built its own model. The board meets in two weeks.`,
        'Email from the CFO'
      ),
      multi(
        'm-pbi2-c-s1',
        'What to Do',
        'Which steps belong in the fix? Tick all that apply.',
        [
          'Agree the definition of revenue with finance and write it down',
          'Build it once in a shared, certified semantic model',
          'Move the three reports onto that model and retire the old measures',
          'Keep all three and let each audience choose',
          'Average the three figures',
        ],
        [0, 1, 2],
        { taskId: 'm-pbi2-c-s' }
      ),
      short(
        'm-pbi2-c-s2',
        'Reconcile',
        'Starting from the sales dashboard’s £4.6m, how much is removed in total to reach finance’s figure, in £m?',
        ['0.5', '0.5m', '500k', '500000'],
        { taskId: 'm-pbi2-c-s' }
      ),
      written(
        'm-pbi2-c-s3',
        'To the CFO',
        'Reply to the CFO with what the numbers mean and your plan.',
        [
          'Reconciles the figures: £4.6m − £0.3m shipping = £4.3m − £0.2m returns = £4.1m',
          'Recommends finance’s £4.1m as revenue for the board, with the others relabelled (e.g. gross sales)',
          'Plan: one agreed definition, a certified shared model, reports moved onto it',
          'Timeline that works for the board in two weeks, and owners for each step',
        ],
        `The three figures reconcile: the sales dashboard's £4.6m includes £0.3m of shipping charged to customers; take that off and you get operations' £4.3m, which is before returns; take off £0.2m of returns and you get finance's £4.1m. For the board, revenue should be £4.1m. Plan: this week, sign off the definitions with your team (revenue, gross sales, returns, shipping income); next week, build them once in a certified shared model and move the three reports onto it, relabelling £4.6m as "gross order value" where sales still need it. I'll own the model and have it ready three days before the board.`,
        { taskId: 'm-pbi2-c-s' }
      )
    ),
  ],
};

// ---------- Tableau 2 ----------
export const TABLEAU_2_MODULE: ModuleSkeleton = {
  familyId: 'test-tab-02',
  aspects: [
    { id: 'tablecalc', name: 'Table Calculations', summary: 'Running totals, differences, ranks and how they’re computed.' },
    { id: 'lod', name: 'LOD Expressions', summary: 'FIXED, INCLUDE and EXCLUDE, and where they sit in the order of operations.' },
    { id: 'advanced', name: 'Advanced Charts', summary: 'Reference lines, bullet and Pareto charts, and showing uncertainty.' },
    { id: 'case', name: 'Analysis Cases', summary: 'Real numbers: compute what the view should show, and fix it when it doesn’t.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'tablecalc',
      B,
      choice(
        'm-tab2-t-b1',
        'What a Table Calc Is',
        'What is a table calculation?',
        [
          'A calculation on the aggregated numbers already in the view, so it depends on how the view is laid out',
          'A calculation run on every row of the database',
          'A SQL query',
          'A filter',
        ],
        0
      )
    ),
    ...tagged(
      'tablecalc',
      J,
      choice(
        'm-tab2-t-j1',
        'Change on Last Month',
        'A line shows monthly sales. How do you show each month’s % change on the month before?',
        ['A Percent Difference From quick table calculation, computed along Month', 'A FIXED LOD on Month', 'A calculated field dividing Sales by 12', 'A reference line'],
        0
      )
    ),
    ...tagged(
      'tablecalc',
      P,
      choice(
        'm-tab2-t-p1',
        'Rank After a Filter',
        'Users filter out a region and the ranks of the others change. They want ranks among all regions, with the filtered ones just hidden. How?',
        [
          'Filter with a table calculation (e.g. on LOOKUP(MIN([Region]), 0)) so rows are hidden after the rank is worked out',
          'Use a context filter',
          'Make the rank a FIXED LOD',
          'It can’t be done',
        ],
        0
      )
    ),
    ...tagged(
      'tablecalc',
      S,
      choice(
        'm-tab2-t-s1',
        'Order of Operations',
        'A FIXED LOD of sales per customer ignores the Region filter users set on the dashboard. Why, and how do you make it respect it?',
        [
          'FIXED is computed before ordinary dimension filters; add Region to context so the filter applies first',
          'FIXED ignores all filters always',
          'Region needs to be a measure',
          'Use a table calculation filter instead',
        ],
        0
      )
    ),
    ...tagged(
      'lod',
      B,
      choice(
        'm-tab2-l-b1',
        'FIXED',
        'What does {FIXED [Region] : SUM([Sales])} return?',
        ['Each region’s total sales, on every row of that region, whatever the view shows', 'Total sales for the whole company', 'Sales for the selected region only', 'The number of regions'],
        0
      )
    ),
    ...tagged(
      'lod',
      J,
      choice(
        'm-tab2-l-j1',
        'Share of the Region',
        'A view shows Region and Product. Which gives each product’s share of its region’s sales?',
        ['SUM([Sales]) / SUM({FIXED [Region] : SUM([Sales])})', 'SUM([Sales]) / TOTAL(SUM([Profit]))', 'SUM([Sales]) / COUNTD([Region])', '{FIXED [Product] : SUM([Sales])}'],
        0
      )
    ),
    ...tagged(
      'lod',
      P,
      choice(
        'm-tab2-l-p1',
        'Frequent Customers',
        'You want to filter to customers with more than 5 orders. Which works as a filter?',
        ['{FIXED [Customer ID] : COUNTD([Order ID])} > 5', 'COUNTD([Order ID]) > 5 with Customer not in the view', 'RANK(COUNTD([Order ID])) > 5', '[Order ID] > 5'],
        0
      )
    ),
    ...tagged(
      'lod',
      S,
      choice(
        'm-tab2-l-s1',
        'Average Customer Spend',
        'A view shows only Region. Each bar should be the average spend per customer in that region. Which?',
        ['AVG({INCLUDE [Customer ID] : SUM([Sales])})', 'AVG([Sales])', 'SUM([Sales]) / COUNT([Region])', '{EXCLUDE [Region] : AVG([Sales])}'],
        0
      )
    ),
    ...tagged(
      'advanced',
      B,
      choice(
        'm-tab2-a-b1',
        'Against Target',
        'Which chart best shows each salesperson’s sales against their target?',
        ['A bullet chart: a bar for actual with a marker for target', 'A pie chart', 'A scatter plot of names', 'A word cloud'],
        0
      )
    ),
    ...tagged(
      'advanced',
      J,
      choice(
        'm-tab2-a-j1',
        'The Average Line',
        'How do you add a line at the average across a bar chart?',
        ['Analytics pane → Reference Line → Average', 'Draw it with a shape', 'Add a second chart', 'Duplicate the measure'],
        0
      )
    ),
    ...tagged(
      'advanced',
      P,
      choice(
        'm-tab2-a-p1',
        'A Pareto Chart',
        'How is a Pareto chart built?',
        [
          'Bars of sales sorted from largest, with a running % of total line on a dual axis',
          'A pie chart sorted by size',
          'A line of sales by date',
          'A map with sized circles',
        ],
        0
      )
    ),
    ...tagged(
      'advanced',
      S,
      choice(
        'm-tab2-a-s1',
        'Ranking Small Stores',
        'A dashboard ranks 40 stores on conversion rate. Some stores had 30 visitors, others 30,000. What do you change?',
        [
          'Show how sure each number is (e.g. confidence intervals or a funnel plot) so small stores aren’t ranked on noise',
          'Remove the big stores',
          'Rank on visitors instead',
          'Nothing; a rate is a rate',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-tab2-c-b1', 'Running Total', 'Monthly sales are 10, 20 and 30.\n\nWhat is the running total in the third month?', ['60'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-tab2-c-j',
        'Monthly Sales',
        `Month   Sales (£k)
Jan     200
Feb     220
Mar     198
Apr     240`,
        'View data'
      ),
      short('m-tab2-c-j1', 'March vs February', 'What is March’s % difference from February?', ['-10%', '-10', '10%', '10', 'down 10%'], { taskId: 'm-tab2-c-j' }),
      short('m-tab2-c-j2', 'Running Total', 'What is the running total at April, in £k?', ['858', '858k'], { taskId: 'm-tab2-c-j' }),
      written(
        'm-tab2-c-j3',
        'Highlighting Drops',
        'How would you build a view that shows each month’s change and makes falls stand out?',
        [
          'Percent Difference From table calculation along Month',
          'A calculated field (or the sign of the change) used on Colour, so falls are one colour and rises another',
          'Bars or a line with labels, e.g. a bar of % change under the sales line',
          'Mentions how the first month (no previous month) is handled',
        ],
        `A line of monthly sales, with a bar chart of % change underneath. The % change is a Percent Difference From quick table calculation along Month. For colour I'd make a calculated field, IF ZN(<% change>) < 0 THEN "Fall" ELSE "Rise" END, so March's −10% shows in red and the rest in grey. January has no previous month, so I'd show it blank rather than zero, and label each bar with its value.`,
        { taskId: 'm-tab2-c-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-tab2-c-p',
        'Products by Sales',
        `Product   Sales (£k)
P1        500
P2        250
P3        120
P4        80
P5        50`,
        'View data'
      ),
      short('m-tab2-c-p1', 'Running Share', 'In a Pareto chart, what is the running % of total at P2?', ['75%', '75', '0.75'], { taskId: 'm-tab2-c-p' }),
      short(
        'm-tab2-c-p2',
        'Reaching 80%',
        'What is the smallest number of products that together make up at least 80% of sales?',
        ['3'],
        { taskId: 'm-tab2-c-p' }
      ),
      written(
        'm-tab2-c-p3',
        'Building the Pareto',
        'Describe how you’d build the Pareto chart in Tableau.',
        [
          'Products on Columns sorted by sales descending, SUM(Sales) as bars',
          'A second measure as a running total, then a percent of total (secondary table calc) along Product',
          'Dual axis, synchronised or with a 0–100% axis, line for the running %',
          'A reference line at 80% to show where the cut-off falls',
        ],
        `Product on Columns, sorted by SUM(Sales) descending, with SUM(Sales) as bars. Drag Sales on again and make it a Running Total table calculation along Product, with a secondary calculation of Percent of Total; that gives 50%, 75%, 87%, 95%, 100%. Put it on a dual axis as a line, format that axis 0–100%, and add a reference line at 80% so it's clear three products make up most of sales.`,
        { taskId: 'm-tab2-c-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-tab2-c-s',
        'Repeat Customers by Region',
        `A dashboard shows "% of customers who are repeat customers", with a Region filter.

Repeat Share = SUM([Is Repeat]) / MIN({FIXED : COUNTD([Customer ID])})

All regions: 10,000 customers, 3,000 repeat.
North: 2,000 customers, 800 repeat.`,
        'Dashboard notes'
      ),
      short('m-tab2-c-s1', 'What It Shows', 'With the filter set to North, what does Repeat Share show, as a %?', ['8%', '8', '0.08'], { taskId: 'm-tab2-c-s' }),
      short('m-tab2-c-s2', 'The Right Answer', 'What should it show for North, as a %?', ['40%', '40', '0.4'], { taskId: 'm-tab2-c-s' }),
      written(
        'm-tab2-c-s3',
        'The Fix',
        'Explain what went wrong and how you’d fix it.',
        [
          'The FIXED denominator is worked out before the Region filter, so it stays at all 10,000 customers',
          'The numerator is filtered, giving 800 / 10,000 = 8% instead of 800 / 2,000 = 40%',
          'Fix: COUNTD([Customer ID]) as the denominator, or make Region a context filter',
          'Suggests testing the view against known totals for a region before publishing',
        ],
        `The denominator is a FIXED LOD, which Tableau works out before ordinary filters. So when you pick North, the repeat count drops to 800 but the denominator stays at all 10,000 customers: 8%. It should be 800 / 2,000 = 40%. The simplest fix is to divide by COUNTD([Customer ID]), which respects the filter; or, if the FIXED is needed elsewhere, add Region to context. I'd check a couple of regions against the source counts before republishing, and tell anyone who's quoted the 8%.`,
        { taskId: 'm-tab2-c-s' }
      )
    ),
  ],
};

// ---------- Python 2 ----------
export const PYTHON_2_MODULE: ModuleSkeleton = {
  familyId: 'test-py-02',
  aspects: [
    { id: 'time', name: 'Dates & Time Series', summary: 'Parsing dates, resampling and rolling windows.' },
    { id: 'stats', name: 'Statistics in Python', summary: 'numpy and scipy for summaries, correlation and tests.' },
    { id: 'charts', name: 'Charts', summary: 'matplotlib charts that answer the question.' },
    { id: 'case', name: 'Analysis Cases', summary: 'Real data and code: compute, test and review.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'time',
      B,
      choice('m-py2-t-b1', 'Text to Dates', 'The date column loaded as text. Which converts it to dates?', ['pd.to_datetime(df["date"])', 'df["date"].astype(int)', 'str(df["date"])', 'df["date"].date()'], 0)
    ),
    ...tagged(
      'time',
      J,
      choice(
        'm-py2-t-j1',
        'Monthly Totals',
        'Which gives total sales per month from daily rows?',
        ['df.resample("MS", on="date")["sales"].sum()', 'df["sales"].sum() / 12', 'df.groupby("sales")["date"].sum()', 'df.rolling(30)["sales"].sum()'],
        0
      )
    ),
    ...tagged(
      'time',
      P,
      choice(
        'm-py2-t-p1',
        'Smoothing',
        'Daily sales are noisy. Which adds a 7-day moving average?',
        ['df["avg7"] = df.sort_values("date")["sales"].rolling(7).mean()', 'df["avg7"] = df["sales"].mean() / 7', 'df["avg7"] = df["sales"].shift(7)', 'df["avg7"] = df["sales"].cumsum() / 7'],
        0
      )
    ),
    ...tagged(
      'time',
      S,
      choice(
        'm-py2-t-s1',
        'Missing Days',
        'Days with no sales have no row. What’s the problem with rolling(7), and the fix?',
        [
          'rolling(7) covers 7 rows, not 7 days; reindex to every day (asfreq("D"), filling 0 where a day truly had no sales) or use rolling("7D") on a date index',
          'rolling(7) skips weekends',
          'There’s no problem',
          'Use rolling(6) instead',
        ],
        0
      )
    ),
    ...tagged('stats', B, short('m-py2-s-b1', 'Median', 'What does np.median([3, 1, 9, 5, 7]) return?', ['5', '5.0'])),
    ...tagged(
      'stats',
      J,
      choice(
        'm-py2-s-j1',
        'describe()',
        'What does df["sales"].describe() give you?',
        ['Count, mean, standard deviation, min, quartiles and max', 'A chart of sales', 'The data types of each column', 'The first five rows'],
        0
      )
    ),
    ...tagged(
      'stats',
      P,
      choice(
        'm-py2-s-p1',
        'Correlation',
        'df[["ad_spend", "sales"]].corr() gives 0.8 across 50 stores. What can you say?',
        [
          'There’s a strong positive linear relationship, but it doesn’t show ads cause sales (bigger stores may spend more on ads and sell more)',
          'Ads cause 80% of sales',
          'Every extra £1 of ads brings £0.80 of sales',
          'There is no relationship',
        ],
        0
      )
    ),
    ...tagged(
      'stats',
      S,
      choice(
        'm-py2-s-s1',
        'Twenty Metrics',
        'An analyst runs t-tests on 20 metrics for an experiment and reports the one with p = 0.03 as a win. What’s the issue?',
        [
          'With 20 tests at 5%, about one false positive is expected; pick a primary metric in advance or correct for multiple comparisons',
          'p = 0.03 is always conclusive',
          't-tests can’t be used on metrics',
          'They should have used p < 0.5',
        ],
        0
      )
    ),
    ...tagged(
      'charts',
      B,
      choice('m-py2-c-b1', 'A Bar Chart', 'Which draws a bar chart of sales by region?', ['plt.bar(regions, sales)', 'plt.plot(regions)', 'plt.pie()', 'plt.show(sales)'], 0)
    ),
    ...tagged(
      'charts',
      J,
      choice(
        'm-py2-c-j1',
        'Different Scales',
        'You need to show revenue (in £m) and conversion rate (in %) over the same months. What’s clearest?',
        ['Two charts stacked with a shared month axis (plt.subplots(2, 1, sharex=True))', 'Both on one axis', 'A pie chart for each', 'A table only'],
        0
      )
    ),
    ...tagged(
      'charts',
      P,
      choice(
        'm-py2-c-p1',
        'Order Values',
        'Order values are heavily skewed: most are small, a few are huge. How do you show their distribution?',
        ['A histogram, perhaps on a log scale', 'A bar of the mean', 'A line chart of order IDs', 'A pie chart'],
        0
      )
    ),
    ...tagged(
      'charts',
      S,
      choice(
        'm-py2-c-s1',
        'Thirty Charts',
        'You need the same chart for each of 30 stores, every week. Which approach is right?',
        [
          'A function that draws one store’s chart, called in a loop that saves each figure and closes it with plt.close(fig)',
          'Copy and paste the code 30 times',
          'One chart with 30 lines',
          'Screenshot each by hand',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-py2-x-b1', 'Days in January', 'What does len(pd.date_range("2025-01-01", "2025-01-31")) return?', ['31'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-py2-x-j',
        'Daily Sales',
        `date        sales
2025-03-01  100
2025-03-02  120
2025-03-03  80
2025-03-05  140
2025-03-06  110

There is no row for 4 March. The shop was closed that day for a refit.`,
        'Data'
      ),
      short(
        'm-py2-x-j1',
        'Rolling Rows',
        'What does df["sales"].rolling(3).mean() give on the row for 5 March? (Two decimal places.)',
        ['113.33', '113.3'],
        { taskId: 'm-py2-x-j' }
      ),
      short(
        'm-py2-x-j2',
        'Rolling Days',
        'After reindexing to every day and filling 4 March with 0, what is the 3-day rolling mean on 5 March? (Two decimal places.)',
        ['73.33', '73.3'],
        { taskId: 'm-py2-x-j' }
      ),
      written(
        'm-py2-x-j3',
        'Which Is Right?',
        'Which number would you use for “average daily sales over the last three days”, and why?',
        [
          'Recognises the first averages the last three trading days, the second the last three calendar days',
          'Since the shop was closed (not a data gap), 0 is a true value for calendar-day averages',
          'Picks based on the question: trading-day average for performance, calendar-day for cash or capacity',
          'Says to label the choice clearly',
        ],
        `It depends on the question. 113.33 averages the last three days the shop was open; 73.33 averages the last three calendar days, counting the closure as a zero. Because the shop really was shut (it's not missing data), both are valid. To judge how the shop is trading I'd use 113.33, since the refit day says nothing about demand; for cash flow I'd use 73.33. Whichever I used, I'd label it "per trading day" or "per calendar day".`,
        { taskId: 'm-py2-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-py2-x-p',
        'Checkout Test',
        `Group     Users   Conversions
Control   5,000   400
Variant   5,000   460`,
        'Experiment results'
      ),
      short('m-py2-x-p1', 'Relative Lift', 'What is the variant’s relative lift in conversion rate, as a %?', ['15%', '15', '0.15'], { taskId: 'm-py2-x-p' }),
      short(
        'm-py2-x-p2',
        'Absolute Difference',
        'What is the difference in conversion rate, in percentage points?',
        ['1.2', '1.2 pp', '1.2 percentage points', '1.2%'],
        { taskId: 'm-py2-x-p' }
      ),
      written(
        'm-py2-x-p3',
        'Is It Real?',
        'How would you test whether the difference is real in Python, and what do you conclude?',
        [
          'Names a suitable test: a two-proportion z-test (e.g. statsmodels proportions_ztest) or chi-squared test',
          'Gets roughly z ≈ 2.1, p ≈ 0.03',
          'Concludes the lift is significant at 5%, if the test was planned at this sample size',
          'Gives the size of the effect, e.g. a confidence interval of roughly 0.1 to 2.3 points, and checks guardrail metrics before rolling out',
        ],
        `from statsmodels.stats.proportion import proportions_ztest
z, p = proportions_ztest([460, 400], [5000, 5000])   # z ≈ 2.14, p ≈ 0.03

Conversion went from 8.0% to 9.2%, a 1.2-point (15%) lift. At p ≈ 0.03 it's significant at the 5% level, provided we fixed the sample size up front and didn't stop early. The 95% interval for the difference is about 0.1 to 2.3 points, so the true lift could be small. I'd ship it if revenue per user and refunds look fine.`,
        { taskId: 'm-py2-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-py2-x-s',
        'Next Quarter’s Forecast',
        `A colleague's forecast for next quarter:

from sklearn.linear_model import LinearRegression
X = np.arange(36).reshape(-1, 1)      # months 0-35
model = LinearRegression().fit(X, monthly_sales)
print(model.score(X, monthly_sales))  # 0.90
forecast = model.predict([[36], [37], [38]])

The data has a big December peak every year. Next quarter is October to December.`,
        'Notebook'
      ),
      multi(
        'm-py2-x-s1',
        'Problems',
        'What’s wrong with this forecast? Tick all that apply.',
        [
          'A straight line ignores the December peak, so the December forecast will be far too low',
          'R² is measured on the data the model was fitted to, not on unseen months',
          'There’s no comparison with a simple baseline, such as last year’s same months',
          'Linear regression can’t take 36 data points',
        ],
        [0, 1, 2],
        { taskId: 'm-py2-x-s' }
      ),
      choice(
        'm-py2-x-s2',
        'A Better Approach',
        'What would you do instead?',
        [
          'A model with seasonality (e.g. seasonal naive as the baseline, then Holt-Winters or SARIMA), judged on a holdout of the last 12 months',
          'Fit a higher-degree polynomial to get R² to 0.99',
          'Use the average of all 36 months',
          'Ask sales for their gut feel only',
        ],
        0,
        { taskId: 'm-py2-x-s' }
      ),
      written(
        'm-py2-x-s3',
        'Your Review',
        'Write your review for your colleague.',
        [
          'Leads with the biggest risk: no seasonality, so the December peak, the most important month of the quarter, is missed',
          'Explains in-sample R² overstates accuracy; asks for a backtest on held-out months',
          'Suggests a seasonal baseline (same month last year, adjusted for trend) to beat',
          'Asks for a range rather than a single number, and offers help',
        ],
        `The big risk is December. A straight line through 36 months can't see the December peak, so it'll badly underforecast the most important month of the quarter. The R² of 0.90 is measured on the months the line was fitted to, so it doesn't tell us how well it predicts. I'd hold back the last 12 months, compare against a simple seasonal baseline (each month = the same month last year × the year's growth), then try Holt-Winters or SARIMA and keep whichever has the lowest error on the held-out months. And let's give a range, not a single number. Happy to pair on it.`,
        { taskId: 'm-py2-x-s' }
      )
    ),
  ],
};

export const ANALYST_TOOL_MODULES_2 = [EXCEL_2_MODULE, SQL_3_MODULE, POWER_BI_2_MODULE, TABLEAU_2_MODULE, PYTHON_2_MODULE];
