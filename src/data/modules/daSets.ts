import { Question } from '../../types';
import { caseStudy, choice, match, multi, order, short, written } from '../questionKit';

/**
 * The Data Analyst modules' question sets: each set is a short piece of the tool in use (a formula grid, a query,
 * pandas code, a data model, a file as it arrived) with four questions about it, each of a different kind. Every
 * question is about the module's own tool or skill. Two sets per module, asked before its practical tasks.
 */

export const SUB_WEIGHT = 5;
const SUB_MINUTES: Partial<Record<Question['type'], number>> = { choice: 1, text: 1, match: 1, order: 1, multi: 1, written: 2 };

export const questionSet = (id: string, title: string, label: string, material: string, subs: Question[]): Question[] => [
  { ...caseStudy(id, title, material, label, 0), section: true },
  ...subs.map((q) => ({ ...q, taskId: id, timeLimitMinutes: SUB_MINUTES[q.type] ?? 1, weight: SUB_WEIGHT })),
];

// =====================================================================================================
// Excel
// =====================================================================================================

export const EXCEL_SETS: Question[] = [
  ...questionSet(
    'xl-s1',
    'Getting Data Ready',
    'Sales workbook',
    `A workbook from the regional teams:

• The Monthly sheet has one row per product and a column for each month: Product, Jan, Feb, Mar, … Dec
• The Region column on the Orders sheet is typed by hand: North, north, Nrth, N.
• Column A of the Customers sheet holds full names (Asha Patel), and column B needs first names only
• On the Lists sheet, E2 contains =UNIQUE(Orders!B2:B500), and shows #SPILL!`,
    [
      choice(
        'xl-s1-a',
        'One Row per Month',
        'To analyse the Monthly sheet you need one row per product per month (Product, Month, Sales). How do you get there in Power Query?',
        ['Select Product, then Unpivot Other Columns', 'Transpose the whole table', 'Pivot the month columns', 'Add a custom column for each month'],
        0
      ),
      short('xl-s1-b', 'Only Allowed Regions', 'Which Data-tab feature makes the Region cell a dropdown that accepts only North, South, East or West? (Two words.)', ['data validation', 'Data Validation', 'validation']),
      short('xl-s1-c', 'First Names', 'You type Asha in B2, then use the feature that fills the rest of column B by following your example. What is its keyboard shortcut?', ['ctrl+e', 'ctrl e', 'ctrl-e', 'control+e', 'control e', 'ctrl + e']),
      choice(
        'xl-s1-d',
        '#SPILL!',
        'Why does =UNIQUE(Orders!B2:B500) in E2 show #SPILL!?',
        ['The cells below E2, where the list needs to spill, aren’t empty', 'UNIQUE only works on numbers', 'The range has duplicates', 'UNIQUE needs Ctrl+Shift+Enter'],
        0
      ),
    ]
  ),
  ...questionSet(
    'xl-s2',
    'Showing and Automating',
    'Reporting workbook',
    `The monthly report workbook:

• Revenue by store is in D2:D500 (formulas)
• Leadership wants the top 10% of stores to stand out, and a dashboard they can filter by region, built from the Orders table (400,000 rows) and the Stores table
• A colleague's macro runs before the file is sent out:

\`\`\`vba
Sub TidyReport()
    Range("D2:D500").Value = Range("D2:D500").Value
    Columns("A:F").AutoFit
End Sub
\`\`\``,
    [
      choice(
        'xl-s2-a',
        'Top 10%',
        'How do you make the top 10% of stores stand out, and keep it right as the numbers change?',
        ['Conditional Formatting → Top/Bottom Rules → Top 10% on D2:D500', 'Sort by revenue and colour the first 50 rows', 'Filter to the highest values and bold them', 'Add a column that says Top for the biggest ones'],
        0
      ),
      match('xl-s2-b', 'Shortcuts', 'Match each shortcut to what it does.', [
        ['Ctrl+Shift+L', 'Turns filters on or off for the table'],
        ['Alt+Enter', 'Starts a new line inside a cell'],
        ['Ctrl+A', 'Selects the whole data range'],
        ['Ctrl+Arrow', 'Jumps to the edge of the data'],
      ]),
      short('xl-s2-c', 'The Right Chart', 'Which chart type shows whether stores with higher ad spend also have higher revenue? (One word.)', ['scatter', 'scatter chart', 'scatter plot', 'xy scatter', 'xy']),
      written(
        'xl-s2-d',
        'What the Macro Does',
        'What does TidyReport do to column D, and what’s the risk of running it?',
        [
          'Says it replaces the formulas in D2:D500 with their current values (like Paste Values), and auto-fits columns A to F',
          'Names the risk: the formulas are gone, so the numbers won’t update and the macro can’t be undone with Ctrl+Z',
          'Suggests a safeguard, e.g. run it on a copy / save first, or only on the file being sent',
        ],
        'It overwrites D2:D500 with their own values, so every formula becomes a fixed number, then auto-fits columns A to F. The risk is that the formulas are lost for good: the report won’t update, and a macro can’t be undone with Ctrl+Z. Run it on a saved copy that’s being sent out, never on the working file.'
      ),
      written(
        'xl-s2-e',
        'The Region Dashboard',
        'How would you build the dashboard leadership can filter by region from the Orders (400,000 rows) and Stores tables?',
        [
          'Loads both tables into the Data Model (Power Pivot) and relates Orders to Stores on the store key, rather than VLOOKUP-ing 400,000 rows',
          'Builds PivotTables / PivotCharts from the Data Model',
          'Adds a Region slicer connected to every pivot (Report Connections), so one click filters the whole dashboard',
          'Mentions refreshing (Refresh All) when new data arrives, and a clear layout with the key numbers first',
        ],
        'Add Orders and Stores to the Data Model and relate them on StoreID in Power Pivot, instead of looking up 400,000 rows. Build the PivotTables and PivotCharts from the model, add a Region slicer and connect it to all of them through Report Connections, and lay out the headline numbers first. When new data arrives, Refresh All updates everything.'
      ),
    ]
  ),
];

// =====================================================================================================
// SQL
// =====================================================================================================

export const SQL_SETS: Question[] = [
  ...questionSet(
    'sql-s1',
    'Reading a Query',
    'Query',
    `Fernway's analyst wrote this query on the orders and customers tables:

\`\`\`sql
SELECT c.region, COUNT(*) AS orders, SUM(o.amount) AS revenue
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'delivered'
GROUP BY c.region
HAVING SUM(o.amount) > 1000
ORDER BY revenue DESC;
\`\`\``,
    [
      choice(
        'sql-s1-a',
        'WHERE or HAVING',
        'Why is SUM(o.amount) > 1000 in HAVING and not in WHERE?',
        ['HAVING filters groups after GROUP BY has totalled them; WHERE filters single rows before grouping', 'HAVING is faster than WHERE', 'WHERE can’t compare numbers', 'They do the same; it’s a matter of style'],
        0
      ),
      order('sql-s1-b', 'The Order It Runs In', 'Put this query’s clauses in the order the database works through them.', ['FROM and JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY']),
      short('sql-s1-c', 'Keep Every Region', 'Regions whose customers have no orders don’t appear. Leaving the WHERE aside, what join would keep customers with no orders? (Two words.)', ['left join', 'left outer join', 'LEFT JOIN', 'LEFT OUTER JOIN']),
      written(
        'sql-s1-d',
        'Revenue Doubled',
        'The analyst then joins a customer_addresses table on customer_id, and revenue comes out almost twice what Finance reports. What has happened, how would you confirm it in SQL, and how would you fix the query?',
        [
          'Identifies a one-to-many join: customers with several addresses repeat their orders (fan-out)',
          'Confirms it, e.g. GROUP BY customer_id HAVING COUNT(*) > 1 on the addresses table, or comparing COUNT(*) before and after the join',
          'Fixes it by joining to one row per customer (the primary/current address, or deduplicating first) or totalling before the join',
        ],
        'Some customers have more than one address, so each of their orders is repeated once per address. SELECT customer_id, COUNT(*) FROM customer_addresses GROUP BY customer_id HAVING COUNT(*) > 1 shows them. Join to one address per customer (WHERE is_primary = 1, or a subquery picking one), or total revenue from orders first and join afterwards.'
      ),
    ]
  ),
  ...questionSet(
    'sql-s2',
    'NULLs and Window Functions',
    'orders',
    `The orders table has 10 rows; discount_code is NULL in 4 of them. The first rows:

order_id  customer_id  order_date  amount  discount_code
1         C01          2026-01-04  40.00   SPRING
2         C01          2026-02-11  25.00   NULL
3         C02          2026-01-19  60.00   NULL
4         C02          2026-03-02  60.00   SPRING

\`\`\`sql
SELECT customer_id, amount,
       RANK() OVER (PARTITION BY customer_id ORDER BY amount DESC) AS rk
FROM orders;
\`\`\``,
    [
      short('sql-s2-a', 'Counting a Column', 'What does SELECT COUNT(discount_code) FROM orders return?', ['6']),
      choice(
        'sql-s2-b',
        'Not SPRING',
        "What does WHERE discount_code <> 'SPRING' do with the rows where discount_code is NULL?",
        ['Leaves them out: comparing NULL gives unknown, which isn’t true', 'Includes them, because NULL isn’t SPRING', 'Raises an error', 'Treats NULL as an empty string and includes them'],
        0
      ),
      match('sql-s2-c', 'Window Functions', 'Two of C02’s orders are both £60. Match each function to what it gives those two rows.', [
        ['ROW_NUMBER()', '1 and 2'],
        ['RANK()', '1 and 1, then 3 for the next'],
        ['DENSE_RANK()', '1 and 1, then 2 for the next'],
        ['LAG(amount)', 'The amount of the order before'],
      ]),
      written(
        'sql-s2-d',
        'Latest Order',
        'Write a query that returns each customer’s most recent order (customer_id, order_id, order_date, amount), one row per customer.',
        [
          'Uses ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC) in a subquery or CTE (or a MAX(order_date) join)',
          'Filters to the first row per customer (rn = 1) in the outer query',
          'Returns the columns asked for, one row per customer, and says how ties on date are handled',
        ],
        "WITH ranked AS (SELECT customer_id, order_id, order_date, amount, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date DESC, order_id DESC) AS rn FROM orders) SELECT customer_id, order_id, order_date, amount FROM ranked WHERE rn = 1; ROW_NUMBER gives exactly one row per customer, and order_id breaks ties on the same date."
      ),
    ]
  ),
];

// =====================================================================================================
// Python
// =====================================================================================================

export const PYTHON_SETS: Question[] = [
  ...questionSet(
    'py-s1',
    'Reading pandas Code',
    'orders.py',
    `\`\`\`python
import pandas as pd

df = pd.read_csv('orders.csv')   # order_id, date, region, status, amount
df = df[df['status'] == 'delivered']
summary = df.groupby('region')['amount'].agg(['count', 'sum'])
top = summary.sort_values('sum', ascending=False).head(3)
\`\`\``,
    [
      choice(
        'py-s1-a',
        'After the Filter',
        'After the filter, df’s index is 0, 2, 3, 7, … (refunded rows are gone). What does df.iloc[1] return?',
        ['The second row, whose index label is 2', 'The row whose index label is 1', 'An error, because label 1 no longer exists', 'The second column'],
        0
      ),
      short('py-s1-b', 'Shape', 'There are 5 regions in the data. What does top.shape return?', ['(3, 2)', '(3,2)', '3, 2', '3,2']),
      match('py-s1-c', 'Which Method', 'Match each job to the pandas method for it.', [
        ['Total revenue per region', 'groupby'],
        ['Add customer details to each order', 'merge'],
        ['Regions as rows, months as columns', 'pivot_table'],
        ['Drop rows with a missing amount', 'dropna'],
      ]),
      written(
        'py-s1-d',
        'More Rows After a Merge',
        "Next, merged = df.merge(customers, on='customer_id', how='left') has 5,400 rows where df had 5,000. What has happened, how would you find the cause, and how would you stop it happening unnoticed?",
        [
          'Identifies duplicate customer_id values in customers, so matching orders are repeated',
          "Finds them, e.g. customers['customer_id'].duplicated().sum() or value_counts()",
          "Fixes it (one row per customer) and guards it, e.g. merge(..., validate='many_to_one') or asserting the row count",
        ],
        "Some customer_ids appear more than once in customers, so their orders are repeated. customers['customer_id'].duplicated().sum() shows how many. Deduplicate customers first and merge with validate='many_to_one', so pandas raises an error if it happens again."
      ),
    ]
  ),
  ...questionSet(
    'py-s2',
    'Types and Missing Values',
    'df.dtypes',
    `\`\`\`python
>>> df.dtypes
order_id     int64
date        object
region      object
amount      object

>>> df['amount'].head(4)
0    12.50
1    £8.00
2      NaN
3       40
\`\`\``,
    [
      short('py-s2-a', 'To Numbers', 'Which pandas function turns amount into numbers, leaving NaN where a value can’t be converted? (The function’s name.)', ['pd.to_numeric', 'to_numeric', 'pandas.to_numeric', "pd.to_numeric(df['amount'], errors='coerce')"]),
      choice(
        'py-s2-b',
        'Missing in a Mean',
        "Once amount is numeric, what does df['amount'].mean() do with the NaN values?",
        ['Skips them: it averages the values that are there', 'Counts them as 0', 'Returns NaN for the whole column', 'Raises an error'],
        0
      ),
      order('py-s2-c', 'Cleaning amount', 'Put these steps for cleaning amount in order.', [
        "Strip the £ and commas with str.replace",
        "Convert with pd.to_numeric(..., errors='coerce')",
        'Count how many values became NaN',
        'Decide whether to fix, fill or drop them',
        'Check the total against the source',
      ]),
      written(
        'py-s2-d',
        'Dates Stored as Text',
        'date is stored as text (object), in UK order (03/04/2026). Why does that matter, and how would you fix it and get revenue by month?',
        [
          'Explains text dates sort and compare as strings, and can’t be grouped by month or used for date maths',
          'Converts with pd.to_datetime, with dayfirst=True (or an explicit format) because the dates are UK order',
          "Groups by month, e.g. df.groupby(df['date'].dt.to_period('M'))['amount'].sum() or resample('MS')",
        ],
        "As text, 03/04/2026 sorts before 28/02/2026 and can't be grouped by month. df['date'] = pd.to_datetime(df['date'], dayfirst=True) (or format='%d/%m/%Y') makes real dates; then df.groupby(df['date'].dt.to_period('M'))['amount'].sum() gives revenue by month."
      ),
    ]
  ),
];

// =====================================================================================================
// Data Cleaning
// =====================================================================================================

export const CLEANING_SETS: Question[] = [
  ...questionSet(
    'cl-s1',
    'Profiling a File',
    'members_sample.csv',
    `The first rows of a member export, before cleaning. Today is 1 May 2026.

member_id  name       region  join_date   age
M101       Ava Hill   North   03/04/2026  34
M102       ben ward   north   2026-04-05  29
M103       Cal Price  Nrth    31/12/2025
M103       Cal Price  Nrth    31/12/2025
M104       Dina Lowe  East    12/31/2025  214
M105       Eli Cole   East    2027-01-15  41`,
    [
      multi(
        'cl-s1-a',
        'Spot the Problems',
        'Which problems does this sample have? Tick all that apply.',
        ['Dates in more than one format, some day-first and some month-first', 'A duplicated row', 'A missing value', 'An impossible age', 'A join date in the future', 'Member IDs out of order'],
        [0, 1, 2, 3, 4]
      ),
      short('cl-s1-b', 'Regions', 'Once cleaned, how many different regions does this sample have?', ['2', 'two']),
      order('cl-s1-c', 'Step by Step', 'Put these cleaning steps in the order you’d do them.', [
        'Keep an untouched copy of the raw file',
        'Profile it: counts, blanks, duplicates, odd values',
        'Fix the problems with rules you can rerun',
        'Check the result against the raw counts and totals',
        'Write down what you changed and why',
      ]),
      written(
        'cl-s1-d',
        'Age 214',
        'What would you do about M104’s age of 214 before the data is loaded?',
        [
          'Checks the source record or asks the membership team rather than guessing (it may be a typo, e.g. 21 or 24)',
          'Doesn’t silently delete the member or invent an age',
          'Corrects a confirmed value, otherwise leaves it blank / flagged as unknown, and logs the decision',
        ],
        'I’d look it up in the source system or ask the membership team; it’s probably a typo such as 21 or 24. If they confirm the right age I’d correct it; if nobody knows I’d leave the age blank and flag it rather than guess or drop the member, and note it in the cleaning log.'
      ),
    ]
  ),
  ...questionSet(
    'cl-s2',
    'Choosing the Fix',
    'Import rules',
    `Rules for the new membership system:

• member_id must be unique
• region must be one of North, South, East, West
• email is optional (used for marketing only)
• join_date must be a real date, not in the future
• age must be 16 to 100`,
    [
      choice(
        'cl-s2-a',
        'Missing Emails',
        '8% of members have no email. What do you do with them?',
        ['Import them, flag the missing email, and report how many', 'Delete them so the import is clean', 'Fill the blanks with a placeholder address', 'Hold the import until every email is found'],
        0
      ),
      match('cl-s2-b', 'Problem and Fix', 'Match each problem to the right fix.', [
        ['"north " and "Nrth"', 'Trim, fix the case and map typos to the standard list'],
        ['The same member on two identical rows', 'Remove the exact duplicate, keeping one'],
        ['"£1,250.00" stored as text', 'Strip the symbols and convert to a number'],
        ['03/04/2026 from a UK system', 'Read it as day first'],
      ]),
      choice(
        'cl-s2-c',
        'Same ID, Different Emails',
        'Two rows share member_id M210 but have different email addresses. What do you do?',
        ['Don’t delete either automatically: check which is current with the data’s owner, then merge into one record', 'Keep the first row and delete the second', 'Keep both, since the emails differ', 'Give one of them a new member_id'],
        0
      ),
      written(
        'cl-s2-d',
        'Every Future Import',
        'These problems will come back with every export. What would you put in place so they’re caught before each import?',
        [
          'Automated checks for each rule (unique IDs, allowed regions, valid and past dates, age range) run on every file',
          'A report of how many rows fail each check, so trends are visible',
          'Failing rows set aside (quarantined) for fixing rather than dropped or loaded silently',
          'Fixing at the source where possible (e.g. a dropdown for region in the old system)',
        ],
        'A validation step that runs on every export before import: one check per rule, a summary of how many rows fail each, and the failing rows written to a rejects file for the team to fix while the rest load. And I’d ask for the source to be fixed, such as a region dropdown instead of free text, so the problems stop at the start.'
      ),
    ]
  ),
];

// =====================================================================================================
// Dashboards & Reporting
// =====================================================================================================

export const REPORTING_SETS: Question[] = [
  ...questionSet(
    'rp-s1',
    'Reviewing a Dashboard',
    'Monthly sales dashboard',
    `The current monthly sales dashboard:

• Top row: 14 KPI tiles, all the same size, none with a target
• A 3D pie chart of revenue across 11 product categories
• A bar chart of revenue by region, its axis starting at £95k
• A line chart of revenue and refund rate on two unlabelled axes
• Status shown in red and green only`,
    [
      multi(
        'rp-s1-a',
        'What Needs Fixing',
        'Which of these make the dashboard misleading or hard to read? Tick all that apply.',
        ['The 3D pie chart with 11 slices', 'The bar axis starting at £95k', 'Two lines on unlabelled axes', 'Red and green as the only signal', 'Showing revenue at all'],
        [0, 1, 2, 3]
      ),
      choice(
        'rp-s1-b',
        'The Top Row',
        'What should replace the 14 identical tiles at the top?',
        ['The few KPIs that matter most, each with its target or comparison', 'All 14, made smaller so they fit', 'A table of every metric', 'Filters and settings'],
        0
      ),
      match('rp-s1-c', 'Pick the Chart', 'Match each thing to show to the chart that suits it.', [
        ['Monthly revenue over two years', 'Line chart'],
        ['Revenue by product category', 'Sorted bar chart'],
        ['One KPI against its target', 'Big number with target and change'],
        ['How order values are spread', 'Histogram'],
      ]),
      written(
        'rp-s1-d',
        'Every Metric',
        'The sales director wants all 40 of the team’s metrics on the front page “so nothing is missed”. What do you do?',
        [
          'Asks what decisions the dashboard is for and who uses it',
          'Proposes a small set of headline KPIs on the front page (around 5 to 8), each with a target or comparison',
          'Keeps the rest available on a detail page or drill-down rather than dropping them',
          'Explains why: 40 numbers on one page hides what needs attention',
        ],
        'I’d ask what decisions they make from it each week, then propose a front page with the six or so KPIs that drive those, each with its target and trend, and a detail tab for the rest. Forty numbers on one page means nobody sees the one that’s gone red.'
      ),
    ]
  ),
  ...questionSet(
    'rp-s2',
    'Defining KPIs',
    'KPI definitions (draft)',
    `KPI definitions, draft 1:

KPI                  Definition
Revenue              Sum of order value, after refunds
Active customers     Customers who logged in this month
Conversion           Orders ÷ sessions
Average order value  Revenue ÷ customers`,
    [
      choice(
        'rp-s2-a',
        'The Wrong Definition',
        'Which definition is wrong?',
        ['Average order value: it should be revenue ÷ orders', 'Conversion: it should be sessions ÷ orders', 'Revenue: refunds should be added back', 'Active customers: it should count every customer ever'],
        0
      ),
      short('rp-s2-b', 'Work It Out', 'Revenue was £84,000 from 2,100 orders by 1,400 customers. What is the average order value, in pounds?', ['40', '£40', '40.00', '£40.00']),
      order('rp-s2-c', 'Building the Report', 'Put these steps for building a KPI report in order.', [
        'Agree the decisions it supports and who reads it',
        'Define each KPI and where its data comes from',
        'Build it and check the numbers against the source',
        'Design the page with the headline numbers first',
        'Set the refresh schedule and an owner',
      ]),
      written(
        'rp-s2-d',
        'Two Numbers for Active',
        'Marketing reports 12,400 active customers and Finance 9,800 for the same month. How do you resolve it for the dashboard?',
        [
          'Finds each team’s definition and where the difference comes from (e.g. logged in vs bought, 30 vs 90 days)',
          'Gets one definition agreed with the KPI’s owner',
          'Writes the definition on the dashboard (tooltip or glossary) and, if both are needed, names them differently',
        ],
        'I’d get both definitions: probably Marketing counts logins and Finance counts customers who paid. Then I’d agree one with whoever owns the KPI, put the definition on the dashboard as a tooltip, and if both numbers are useful, show them under different names (e.g. Logged-in customers and Paying customers).'
      ),
    ]
  ),
];

// =====================================================================================================
// Metrics & Statistics
// =====================================================================================================

export const METRICS_SETS: Question[] = [
  ...questionSet(
    'mt-s1',
    'An Experiment Readout',
    'Checkout test results',
    `Checkout test, 14 days, a 50/50 split planned:

Variant  Users   Orders  Conversion
A (old)  10,000  400     4.0%
B (new)  8,600   396     4.6%

p-value for the difference in conversion: 0.03`,
    [
      choice(
        'mt-s1-a',
        'What p = 0.03 Means',
        'What does p = 0.03 tell you?',
        [
          'If B made no difference, a gap this big would happen by chance only about 3% of the time',
          'There is a 97% chance B is better',
          'B raises conversion by 3%',
          'The difference is big enough to matter to the business',
        ],
        0
      ),
      short('mt-s1-b', 'Relative Uplift', 'By what percentage (relative) is B’s conversion higher than A’s? (A number.)', ['15', '15%', '15 percent']),
      multi(
        'mt-s1-c',
        'Before Shipping B',
        'Which concerns does this readout raise? Tick all that apply.',
        ['The users weren’t split 50/50 as planned', 'Two weeks may show a novelty effect', 'p < 0.05 means B is certain to be better', 'Conversion isn’t the only thing to check (e.g. revenue per user, refunds)', '4.6% is too low to be real'],
        [0, 1, 3]
      ),
      written(
        'mt-s1-d',
        'The Uneven Split',
        'What does the 10,000 against 8,600 split tell you, and what would you do before trusting the result?',
        [
          'Recognises a sample ratio mismatch: a 50/50 split this far off is very unlikely by chance, so assignment or tracking is broken',
          'Says the result can’t be trusted as it stands, as the missing B users may differ from the rest',
          'Investigates the cause (assignment, tracking, a browser or device where B fails) and re-runs or corrects before deciding',
        ],
        'That’s a sample ratio mismatch: with a 50/50 split, 10,000 against 8,600 is far beyond chance, so something is losing B users, such as a page that fails on one browser or tracking that doesn’t fire. They probably aren’t like the rest, so B’s higher conversion can’t be trusted. I’d find where B users drop out, fix it and re-run.'
      ),
    ]
  ),
  ...questionSet(
    'mt-s2',
    'Retention and Unit Metrics',
    'Cohorts and costs',
    `Cohort  Users  Active after 1 month  Active after 3 months
Jan     1,200  1,032                 864
Feb     1,350  1,121                 945

February: marketing spend £18,400, new customers 230, average revenue per user £23.50 a month.`,
    [
      match('mt-s2-a', 'Metric and Formula', 'Match each metric to how it’s worked out.', [
        ['Retention rate', 'Users still active ÷ users at the start'],
        ['Churn rate', 'Users lost ÷ users at the start'],
        ['Customer acquisition cost', 'Marketing spend ÷ new customers'],
        ['Average revenue per user', 'Revenue ÷ active users'],
      ]),
      short('mt-s2-b', '3-Month Retention', 'What is January’s 3-month retention, as a percentage?', ['72', '72%', '72 percent', '72.0', '72.0%']),
      choice(
        'mt-s2-c',
        'Which Cohort Did Better?',
        'More February users are active after a month (1,121 against 1,032). Did February keep users better?',
        ['No: February’s retention rate is lower (83% against 86%); it just started bigger', 'Yes: more users are active', 'They’re the same, as both lost users', 'It can’t be told without revenue'],
        0
      ),
      written(
        'mt-s2-d',
        'Does Marketing Pay Back?',
        'Work out February’s acquisition cost per customer, and how many months of revenue it takes to pay it back. Is marketing paying for itself? Show your reasoning.',
        [
          'Works out CAC = £18,400 ÷ 230 = £80',
          'Works out payback = £80 ÷ £23.50 ≈ 3.4 months',
          'Weighs it against retention: around 72% are still active at 3 months, so most customers stay long enough to pay back',
          'Notes revenue isn’t profit: the payback on margin would be longer',
        ],
        'CAC is £18,400 ÷ 230 = £80, and at £23.50 a month it takes about 3.4 months to earn that back. With roughly 72% of users still active after 3 months, most customers stay past payback, so marketing looks to pay for itself, though on margin rather than revenue the payback would be longer, so I’d check it on gross margin.'
      ),
    ]
  ),
];

// =====================================================================================================
// Data Importing
// =====================================================================================================

export const IMPORTING_SETS: Question[] = [
  ...questionSet(
    'im-s1',
    'A File That Arrived',
    'lieferung_maerz.csv',
    `The first lines of a German supplier's file, opened in a text editor:

\`\`\`
artikel;preis;lieferdatum;lieferant_code
Ölkanne;1.250,50;03.04.2026;00412
Gießkanne;89,90;28.02.2026;00087
\`\`\``,
    [
      short('im-s1-a', 'The Delimiter', 'What character separates the columns in this file? (One word or the character.)', ['semicolon', ';', 'a semicolon', 'semi-colon']),
      choice(
        'im-s1-b',
        'Lost Zeros',
        'Opened straight into a spreadsheet, the codes 00412 and 00087 become 412 and 87. What’s the right fix?',
        ['Import the column as text, so the codes are kept exactly', 'Add the zeros back by hand', 'Format the cells to show five digits', 'Ask the supplier to drop the zeros'],
        0
      ),
      match('im-s1-c', 'What Went Wrong', 'Match each symptom to its cause.', [
        ['Ölkanne shows as Ã–lkanne', 'The wrong text encoding'],
        ['Every row lands in column A', 'The wrong delimiter'],
        ['03.04.2026 became 4 March', 'Day-first dates read month first'],
        ['Totals ignore some prices', 'Numbers imported as text'],
      ]),
      written(
        'im-s1-d',
        'Import It Right',
        'How would you import this file so every column comes in right? Say what you’d set for each column.',
        [
          'Delimiter set to semicolon and encoding to UTF-8 (so Ö and ß survive)',
          'preis read with a comma for decimals and a full stop for thousands',
          'lieferdatum read as a day-first date (DD.MM.YYYY)',
          'lieferant_code imported as text to keep the leading zeros',
        ],
        'Set the delimiter to semicolon and the encoding to UTF-8 so Ölkanne and Gießkanne keep their letters. Read preis with a decimal comma and thousands full stop (German locale), lieferdatum as DD.MM.YYYY, and lieferant_code as text so 00412 stays 00412. Then check the row count and the price total against the file.'
      ),
    ]
  ),
  ...questionSet(
    'im-s2',
    'Checking a Load',
    'Load log',
    `Load log: sales_2026_03.csv → warehouse.sales

Rows in file (not counting the header)  48,000
Rows loaded                             47,962
Rows rejected                           38 (amount is not a number)
Sum of amount in file                   £2,481,305.20
Sum of amount loaded                    £2,479,118.75`,
    [
      short('im-s2-a', 'Rejected Value', 'How much revenue, in pounds, is in the rejected rows? (A number.)', ['2186.45', '£2,186.45', '2,186.45', '£2186.45']),
      choice(
        'im-s2-b',
        'The Rejected Rows',
        'What should happen to the 38 rejected rows?',
        ['Keep them in a rejects table, fix the cause (such as £ signs or commas) and reload them', 'Leave them out: 38 rows is under 0.1%', 'Load them with amount set to 0', 'Delete the whole load and start again'],
        0
      ),
      order('im-s2-c', 'An Import Checklist', 'Put these import steps in order.', [
        'Look at a sample of the raw file',
        'Set the delimiter, encoding and column types',
        'Load into a staging table',
        'Check counts and totals against the file',
        'Move it to the final table and log the load',
      ]),
      written(
        'im-s2-d',
        'Prove Nothing Was Lost',
        'Before anyone uses this table, how do you show the import is complete and nothing was changed?',
        [
          'Reconciles counts: 47,962 loaded + 38 rejected = 48,000 in the file',
          'Reconciles totals: the £2,186.45 gap equals the rejected rows’ amounts',
          'Checks types and formats survived (no unexpected NULLs, leading zeros, decimals, dates, special characters), spot-checking rows',
          'Records the checks so they run on every load',
        ],
        'Counts: 47,962 loaded plus 38 rejected makes the 48,000 in the file. Totals: the £2,186.45 gap should be exactly the 38 rejected rows’ amounts, which I’d sum to confirm. Then check there are no NULLs where the file had values, spot-check rows with leading zeros, accents and large numbers, and keep the checks with the load so they run every time.'
      ),
    ]
  ),
];

// =====================================================================================================
// Power BI
// =====================================================================================================

export const POWERBI_SETS: Question[] = [
  ...questionSet(
    'pbi-s1',
    'DAX Measures',
    'Measures',
    `Fernway's Sales table: OrderID, Date, Region, Channel, Category, Amount, Cost. Its measures:

\`\`\`dax
Total Sales  = SUM(Sales[Amount])
Total Cost   = SUM(Sales[Cost])
Online Sales = CALCULATE([Total Sales], Sales[Channel] = "Online")
Bad Margin   = Sales[Amount] - Sales[Cost]
\`\`\``,
    [
      choice(
        'pbi-s1-a',
        'Why Bad Margin Fails',
        'Why does Bad Margin give an error as a measure?',
        [
          'A measure has no single row to read Sales[Amount] from: it needs an aggregation such as SUM or SUMX (or it should be a calculated column)',
          'You can’t subtract one column from another in DAX',
          'Measures can only use one column',
          'Bad Margin must be written in Power Query',
        ],
        0
      ),
      short('pbi-s1-b', 'Safe Division', 'Which DAX function returns blank instead of an error when dividing by zero? (One word.)', ['DIVIDE', 'divide', 'DIVIDE()']),
      match('pbi-s1-c', 'DAX Terms', 'Match each term to what it means.', [
        ['Measure', 'Worked out for each cell of a visual, in its filter context'],
        ['Calculated column', 'Worked out row by row at refresh and stored in the table'],
        ['CALCULATE', 'Evaluates an expression with changed filters'],
        ['ALL', 'Removes filters from a table or column'],
      ]),
      written(
        'pbi-s1-d',
        'Share of Total',
        'Write a measure for each region’s share of total sales, for a table with Region on rows, and explain how it works.',
        [
          'Writes e.g. Share = DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Sales[Region]))) (ALL(Sales) also accepted)',
          'Explains the numerator is filtered to the row’s region, and ALL removes the region filter for the denominator',
          'Uses DIVIDE (or explains handling of zero), and formats as a percentage',
        ],
        "Region Share = DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Sales[Region]))). In each row, [Total Sales] is that region's sales; CALCULATE with ALL(Sales[Region]) removes the region filter so the denominator is all regions' sales. DIVIDE avoids errors if the total is zero, and I'd format it as a percentage."
      ),
    ]
  ),
  ...questionSet(
    'pbi-s2',
    'The Model and Power Query',
    'Model view',
    `Fernway's model:

Table     Rows  Columns
Sales     500k  OrderID, DateKey, ProductKey, StoreKey, Amount
Products  320   ProductKey, Product, Category
Stores    45    StoreKey, Store, Region
Date      1096  DateKey, Date, Month, Year`,
    [
      choice(
        'pbi-s2-a',
        'The Shape',
        'What kind of model is this, and which way should its relationships filter?',
        ['A star schema: Products, Stores and Date (one side) filter Sales (many side), single direction', 'A snowflake: Sales filters each of the other tables', 'A flat table: no relationships are needed', 'Many to many between every table, filtering both ways'],
        0
      ),
      short('pbi-s2-b', 'Cardinality', 'What is the cardinality of the relationship from Products to Sales? (e.g. one to one)', ['one to many', '1:*', '1 to many', 'one-to-many', 'many to one', '*:1', 'many-to-one']),
      order('pbi-s2-c', 'Applied Steps', 'Put these Power Query steps for the Sales file in a sensible order.', [
        'Source',
        'Promoted headers',
        'Changed types',
        'Removed blank and error rows',
        'Trimmed and cleaned text',
        'Merged with Products',
      ]),
      written(
        'pbi-s2-d',
        'The Slicer Does Nothing',
        'Report users say a Category slicer doesn’t change the sales chart. What would you check?',
        [
          'The relationship between Products and Sales: missing, inactive, or the wrong direction / cardinality',
          'The key columns: same data type and matching values (no spaces, text vs number)',
          'The measure: whether it removes filters (ALL, REMOVEFILTERS) so the slicer is ignored',
          'Edit interactions: the slicer may be set not to filter that visual',
        ],
        'First the model: is there an active relationship from Products[ProductKey] to Sales[ProductKey], one to many, filtering from Products to Sales? Then the keys: same type and matching values. Then the measure: an ALL or REMOVEFILTERS would ignore the slicer. Last, Edit interactions: the slicer might be set to None for that chart.'
      ),
    ]
  ),
];

// =====================================================================================================
// Tableau
// =====================================================================================================

export const TABLEAU_SETS: Question[] = [
  ...questionSet(
    'tab-s1',
    'Calculations',
    'Calculated fields',
    `Fields: Order ID, Order Date, Region, Category, Customer, Sales, Profit, Quantity. Three calculated fields:

\`\`\`
Profit Ratio    = SUM([Profit]) / SUM([Sales])
Row Ratio       = [Profit] / [Sales]
Customer Sales  = { FIXED [Customer] : SUM([Sales]) }
\`\`\``,
    [
      choice(
        'tab-s1-a',
        'Ratio of Sums',
        'For each region’s profit ratio, why use SUM([Profit]) / SUM([Sales]) rather than AVG([Row Ratio])?',
        ['It weights by sales: averaging row ratios counts a £5 order the same as a £5,000 one', 'AVG doesn’t work on calculated fields', 'Row Ratio can’t be shown by region', 'They always give the same answer'],
        0
      ),
      short('tab-s1-b', 'Level of Detail', 'Which LOD keyword computes at exactly the dimensions it lists, whatever is in the view? (One word.)', ['FIXED', 'fixed']),
      match('tab-s1-c', 'Reading the Data Pane', 'Match each to what it means.', [
        ['Blue pill', 'Discrete: draws headers'],
        ['Green pill', 'Continuous: draws an axis'],
        ['Dimension', 'Splits the data into categories'],
        ['Measure', 'A number that is aggregated'],
      ]),
      written(
        'tab-s1-d',
        'The Filter It Ignores',
        'Customer Sales ignores a Region filter on the sheet. Why, and how would you make it respect the filter?',
        [
          'Explains Tableau’s order of operations: FIXED is computed before dimension filters',
          'Fixes it by adding the Region filter to context (a context filter), which applies before FIXED',
          'Or uses INCLUDE / EXCLUDE or a non-LOD calculation where that fits',
        ],
        'FIXED level of detail is worked out before ordinary dimension filters, so the Region filter doesn’t touch it. Right-click the Region filter and Add to Context: context filters apply before FIXED, so Customer Sales then only counts the filtered regions. (INCLUDE or EXCLUDE would also respect the filter.)'
      ),
    ]
  ),
  ...questionSet(
    'tab-s2',
    'Views and Table Calculations',
    'Sheet setup',
    `A worksheet:

• Rows: Region · Columns: SUM(Sales), sorted descending
• Quick Table Calculation on SUM(Sales): Percent of Total
• Filters: Category = Technology`,
    [
      choice(
        'tab-s2-a',
        'Percent of What?',
        'West shows 31%. 31% of what?',
        ['Of Technology sales across the regions in the view: table calculations work on what’s left after filters', 'Of all sales, every category', 'Of West’s own sales', 'Of the largest region’s sales'],
        0
      ),
      order('tab-s2-b', 'Order of Operations', 'Put these in the order Tableau applies them.', ['Context filters', 'FIXED level of detail', 'Dimension filters', 'Measure filters', 'Table calculations']),
      short('tab-s2-c', 'Adding Up', 'Which quick table calculation shows each month’s sales added to all the months before it? (Two words.)', ['running total', 'Running Total', 'running sum']),
      written(
        'tab-s2-d',
        'Top 3, Whole Total',
        'The manager wants only the top 3 regions shown, but each one’s percent of total still based on all regions. How would you build it?',
        [
          'Recognises a Top 3 dimension filter would remove the other regions before the table calculation, changing the total',
          'Filters with a table calculation instead (e.g. RANK(SUM([Sales])) <= 3 on Filters), which applies after the percent of total',
          'Or works out the total with a FIXED LOD so it ignores the filter',
        ],
        'A Top N filter on Region is a dimension filter, so it would drop the other regions before Percent of Total runs and the three would add up to 100%. Instead, create Rank = RANK(SUM([Sales])) and put it on Filters at 1 to 3: table-calculation filters apply last, so the percentages still use every region.'
      ),
    ]
  ),
];
