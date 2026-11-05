import { caseStudy, choice, multi, order, short, written } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';

/**
 * The data-analysis modules. Each keeps its simulation (a made-up company with real data to work on) at its own level,
 * and the levels above ask it too. The new questions stand on their own, so the levels without the simulation work.
 */

// ---------- Excel ----------
export const EXCEL_MODULE: ModuleSkeleton = {
  familyId: 'test-excel-01',
  aspects: [
    { id: 'formulas', name: 'Formulas & References', summary: 'Relative and absolute references, IF logic and building formulas that fill down.' },
    { id: 'lookups', name: 'Lookups', summary: 'Pulling values from another table with XLOOKUP, VLOOKUP and INDEX/MATCH.' },
    { id: 'summaries', name: 'Summarising Data', summary: 'SUMIFS, COUNTIFS, pivot tables and totals by group.' },
    { id: 'analysis', name: 'Commercial Analysis', summary: 'Margin, growth and mix: what the numbers mean for the business.' },
    { id: 'practice', name: 'Checking & Spreadsheet Hygiene', summary: 'Catching errors, reconciling totals and building sheets others can trust.' },
  ],
  tags: {
    'q-xl-7': ['formulas', B],
    'q-xl-1': ['lookups', J],
    'q-xl-4': ['lookups', J],
    'q-xl-8': ['summaries', B],
    'q-xl-5': ['summaries', J],
    'q-xl-2': ['summaries', J],
    'q-xl-3': ['summaries', J],
    'q-xl-6': ['summaries', J],
    'q-xl-9': ['analysis', J],
    'q-xl-10': ['analysis', J],
  },
  bank: [
    ...tagged(
      'formulas',
      J,
      choice(
        'm-xl-form-j1',
        'Banding Orders',
        'Which formula labels an order in B2 "Large" when it is £500 or more, otherwise "Small"?',
        ['=IF(B2>=500,"Large","Small")', '=IF(B2>500,"Small","Large")', '=IF("Large",B2>=500,"Small")', '=B2>=500?"Large":"Small"'],
        0
      )
    ),
    ...tagged(
      'formulas',
      P,
      choice(
        'm-xl-form-p1',
        'Dividing by Zero',
        'Margin % is =C2/B2, and rows with no revenue show #DIV/0!, which breaks the total below. What is the best fix?',
        [
          '=IF(B2=0,"",C2/B2) so empty rows are blank, and the total uses only real values',
          '=IFERROR(C2/B2,0), so every error becomes 0%',
          'Delete the rows with no revenue',
          'Type over the errors with 0',
        ],
        0
      )
    ),
    ...tagged(
      'formulas',
      S,
      choice(
        'm-xl-form-s1',
        'A Model Others Can Change',
        'A pricing model has the VAT rate typed into 300 formulas as 1.2. VAT changes. How should the model have been built?',
        [
          'Inputs like the VAT rate in one labelled cell (or named range) that every formula refers to',
          'With 1.2 typed in, and Find & Replace when it changes',
          'With the rate in a comment on each cell',
          'In a separate copy of the file for each rate',
        ],
        0
      )
    ),
    ...tagged(
      'lookups',
      B,
      choice(
        'm-xl-look-b1',
        'What a Lookup Does',
        'You have a list of orders with product codes, and a separate product list with each code’s price. What does a lookup do?',
        ['Finds each order’s code in the product list and brings back its price', 'Sorts the orders by price', 'Adds up the prices', 'Removes duplicate codes'],
        0
      )
    ),
    ...tagged(
      'lookups',
      P,
      choice(
        'm-xl-look-p1',
        'Looking Left',
        'The product list has Name in column A and SKU in column B. You need the name for a SKU. Why does VLOOKUP struggle, and what works?',
        [
          'VLOOKUP only returns columns to the right of the one it searches; XLOOKUP(sku, B:B, A:A) or INDEX(A:A, MATCH(sku, B:B, 0)) works',
          'VLOOKUP can’t search text',
          'The SKUs need sorting first',
          'Use SUMIF instead',
        ],
        0
      )
    ),
    ...tagged(
      'lookups',
      S,
      choice(
        'm-xl-look-s1',
        'Lookups That Look Fine',
        'After a lookup, 3% of orders show #N/A. A colleague wraps it in IFERROR(…, "Other") and the report balances. What is the risk?',
        [
          'It hides why they failed (new SKUs, spaces, codes stored as numbers vs text), so real products end up mislabelled and nobody fixes the source',
          'IFERROR makes the sheet slow',
          'There is none; the report balances',
          '"Other" might be a real category name',
        ],
        0
      )
    ),
    ...tagged(
      'summaries',
      P,
      choice(
        'm-xl-sum-p1',
        'Two Conditions',
        'Which formula totals revenue (column H) for Web orders (column F) in the Tents category (column G)?',
        ['=SUMIFS(H:H,F:F,"Web",G:G,"Tents")', '=SUMIF(H:H,"Web","Tents")', '=SUM(IF(F:F="Web",H:H))+SUM(IF(G:G="Tents",H:H))', '=COUNTIFS(F:F,"Web",G:G,"Tents")'],
        0
      )
    ),
    ...tagged(
      'summaries',
      S,
      choice(
        'm-xl-sum-s1',
        'Averaging Averages',
        'A summary shows each region’s margin %, and the “All regions” row is the average of those percentages. Why is that wrong?',
        [
          'It weights a tiny region the same as a huge one; overall margin % is total margin ÷ total revenue',
          'Percentages can’t be averaged in Excel',
          'It should be the median',
          'It is only wrong if there are more than five regions',
        ],
        0
      )
    ),
    ...tagged(
      'analysis',
      B,
      short(
        'm-xl-an-b1',
        'Margin %',
        'A product sells for £80 and costs £50 to buy. What is its margin as a % of the selling price? Give a number, e.g. 25%.',
        ['37.5%', '37.5', '37.50%'],
        { minutes: 2 }
      )
    ),
    ...tagged(
      'analysis',
      P,
      choice(
        'm-xl-an-p1',
        'Mix, Not Margin',
        'Every category kept the same margin % as last month, yet the overall margin % fell. What explains it?',
        [
          'Mix: more of the sales came from lower-margin categories',
          'A formula error, since that can’t happen',
          'Prices went up',
          'Fewer orders overall',
        ],
        0
      )
    ),
    ...tagged(
      'analysis',
      S,
      written(
        'm-xl-an-s1',
        'A Price Rise',
        'The owner wants to raise prices on Footwear by 10%. What would you model before advising, and how?',
        [
          'Models volume falling with the rise (elasticity), not just 10% more on every sale',
          'Compares margin in £ before and after across a range of volume drops, e.g. the break-even drop',
          'Considers knock-on effects: other categories bought together, marketplace fees, competitors',
          'Recommends a test (a region, a period or some products) before rolling out',
        ],
        'A 10% rise only helps if volume doesn’t fall too far. Model margin in £ at a range of volume drops and find the break-even: at a 40% margin, a 10% price rise breaks even at about a 20% drop in units. Account for basket effects (boots sold with socks and packs), fees on marketplace orders and competitor pricing. Then test it on part of the range or a period before rolling it out.'
      )
    ),
    ...tagged(
      'practice',
      B,
      choice(
        'm-xl-prac-b1',
        'Numbers Stored as Text',
        'SUM of a column returns 0, though the column is full of numbers that are left-aligned with little green triangles. Why?',
        ['They are stored as text, so SUM ignores them; convert them to numbers', 'SUM only works on rows', 'The column is too wide', 'The sheet is protected'],
        0
      )
    ),
    ...tagged(
      'practice',
      J,
      choice(
        'm-xl-prac-j1',
        'Checking a Total',
        'You’ve built category totals. What is the quickest check they’re complete?',
        ['The category totals add up to the grand total of the raw data', 'Every category has a value', 'The numbers look about right', 'The formulas are green'],
        0
      )
    ),
    ...tagged(
      'practice',
      P,
      multi(
        'm-xl-prac-p1',
        'A Sheet Someone Else Will Use',
        'Your report will be updated monthly by a colleague. What makes it safe for them? Tick all that apply.',
        [
          'Raw data, calculations and outputs on separate sheets',
          'Inputs clearly marked, and formulas not mixed with typed numbers',
          'A check cell that flags when totals don’t reconcile',
          'A short note on how to update it',
          'Merged cells across every table to make it tidy',
        ],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'practice',
      S,
      choice(
        'm-xl-prac-s1',
        'The Board Pack Is Wrong',
        'After the board pack went out, you find a formula that missed the last 40 rows; revenue was understated by 6%. What do you do?',
        [
          'Tell your manager straight away with the corrected figure and what changes, fix it, and add a check so it can’t happen again',
          'Fix it quietly in next month’s pack',
          'Wait to see if anyone notices',
          'Fix the file and resend it without comment',
        ],
        0
      )
    ),
  ],
};

// ---------- SQL for Analysts ----------
export const ANALYST_SQL_MODULE: ModuleSkeleton = {
  familyId: 'test-sql-02',
  aspects: [
    { id: 'querying', name: 'Querying & Aggregation', summary: 'Filtering, grouping and totals: the questions every analyst asks.' },
    { id: 'views', name: 'Building Views & Reports', summary: 'Turning queries into reusable views and reporting tables.' },
    { id: 'windows', name: 'Ranking & Windows', summary: 'Top N per group, running totals and period comparisons.' },
    { id: 'pitfalls', name: 'Joins & Pitfalls', summary: 'Joins that double-count, NULLs, and dates that trip people up.' },
    { id: 'insight', name: 'Metrics & Communication', summary: 'Choosing the right measure and explaining what the data says.' },
  ],
  tags: {
    'q-tp-5': ['querying', P],
    'q-tp-7': ['querying', P],
    'q-tp-1': ['views', P],
    'q-tp-2': ['views', P],
    'q-tp-8': ['windows', J],
    'q-tp-4': ['pitfalls', J],
    'q-tp-3': ['pitfalls', P],
    'q-tp-9': ['insight', P],
    'q-tp-6': ['insight', P],
    'q-tp-10': ['insight', P],
  },
  bank: [
    ...tagged(
      'querying',
      B,
      choice(
        'm-asql-q-b1',
        'Counting Customers',
        'orders has one row per order. Which counts how many different customers ordered?',
        ['SELECT COUNT(DISTINCT customer_id) FROM orders', 'SELECT COUNT(*) FROM orders', 'SELECT SUM(customer_id) FROM orders', 'SELECT COUNT(customer_id) FROM orders GROUP BY customer_id'],
        0
      )
    ),
    ...tagged(
      'querying',
      J,
      choice(
        'm-asql-q-j1',
        'Revenue by Month',
        'order_date is text like "2026-03-14". Which groups revenue by month?',
        [
          "SELECT substr(order_date, 1, 7) AS month, SUM(amount) FROM orders GROUP BY month",
          'SELECT order_date, SUM(amount) FROM orders GROUP BY order_date',
          "SELECT SUM(amount) FROM orders WHERE order_date LIKE 'month'",
          'SELECT MONTH, SUM(amount) FROM orders',
        ],
        0
      )
    ),
    ...tagged(
      'querying',
      S,
      choice(
        'm-asql-q-s1',
        'Retention by Cohort',
        'You want, for each month customers first ordered, the share still ordering three months later. What is the first building block?',
        [
          'Each customer’s first order month (MIN(order_date) per customer), to group them into cohorts',
          'Total revenue per month',
          'The average order value',
          'A list of customers ordered by name',
        ],
        0
      )
    ),
    ...tagged(
      'views',
      B,
      choice(
        'm-asql-v-b1',
        'What a View Is',
        'What is a database view?',
        ['A saved query that can be queried like a table, always showing current data', 'A copy of a table frozen at one moment', 'A chart of a table', 'A backup'],
        0
      )
    ),
    ...tagged(
      'views',
      J,
      choice(
        'm-asql-v-j1',
        'One Definition',
        'Three dashboards each calculate “active customers” with slightly different SQL, and the numbers disagree. What fixes it?',
        ['Define it once in a shared view (or model) that all three dashboards read', 'Average the three numbers', 'Pick the highest number', 'Delete two dashboards'],
        0
      )
    ),
    ...tagged(
      'views',
      S,
      choice(
        'm-asql-v-s1',
        'A Slow Dashboard',
        'A dashboard queries a complex view over 200 million rows and takes two minutes each time anyone opens it. Data only needs to be fresh daily. What fits?',
        [
          'Materialise it: build a summary table (or materialised view) nightly, and point the dashboard at that',
          'Ask users to open it less often',
          'Add LIMIT 100 to the view',
          'Remove the WHERE clauses',
        ],
        0
      )
    ),
    ...tagged(
      'windows',
      B,
      choice(
        'm-asql-w-b1',
        'Top Five',
        'Which returns the five customers who spent the most?',
        [
          'SELECT customer_id, SUM(amount) AS spend FROM orders GROUP BY customer_id ORDER BY spend DESC LIMIT 5',
          'SELECT TOP customer_id FROM orders',
          'SELECT customer_id FROM orders WHERE amount > 5',
          'SELECT customer_id, MAX(amount) FROM orders LIMIT 5',
        ],
        0
      )
    ),
    ...tagged(
      'windows',
      P,
      choice(
        'm-asql-w-p1',
        'Month on Month',
        'monthly_revenue has one row per month. Which gives each month’s change on the month before?',
        [
          'revenue - LAG(revenue) OVER (ORDER BY month)',
          'revenue - MAX(revenue) OVER ()',
          'revenue - SUM(revenue) OVER (ORDER BY month)',
          'revenue - ROW_NUMBER() OVER (ORDER BY month)',
        ],
        0
      )
    ),
    ...tagged(
      'windows',
      S,
      choice(
        'm-asql-w-s1',
        'A Smoother Trend',
        'Daily sales are spiky. Which gives a 7-day moving average per day?',
        [
          'AVG(sales) OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)',
          'AVG(sales) OVER (PARTITION BY day)',
          'SUM(sales) / 7',
          'AVG(sales) OVER (ORDER BY day ROWS UNBOUNDED PRECEDING)',
        ],
        0
      )
    ),
    ...tagged(
      'pitfalls',
      B,
      choice(
        'm-asql-p-b1',
        'Customers Who Vanish',
        'You INNER JOIN customers to orders to list every customer with their order count. Customers who never ordered are missing. Why?',
        ['An INNER JOIN keeps only rows with a match; use a LEFT JOIN from customers', 'COUNT skips them', 'They have NULL ids', 'The query needs DISTINCT'],
        0
      )
    ),
    ...tagged(
      'pitfalls',
      S,
      choice(
        'm-asql-p-s1',
        'The Last Day Missing',
        "WHERE created_at BETWEEN '2026-03-01' AND '2026-03-31' leaves out most of 31 March. created_at holds date and time. Why, and what is the fix?",
        [
          "'2026-03-31' means midnight at the start of the day; use created_at >= '2026-03-01' AND created_at < '2026-04-01'",
          'BETWEEN excludes both ends; use >= and <=',
          'March has 30 days',
          'Time zones; convert everything to UTC',
        ],
        0
      )
    ),
    ...tagged(
      'insight',
      B,
      choice(
        'm-asql-i-b1',
        'Mean or Median',
        'Order values are mostly £20–£40, with a few £2,000 corporate orders. Which best describes a typical order?',
        ['The median', 'The mean', 'The maximum', 'The sum'],
        0
      )
    ),
    ...tagged(
      'insight',
      J,
      choice(
        'm-asql-i-j1',
        'A Headline Number',
        'Revenue rose 10% this quarter. What should go next to it so leaders read it right?',
        ['A comparison (last quarter, same quarter last year, target) and what drove it', 'The SQL used', 'Every order in the quarter', 'Nothing; a number speaks for itself'],
        0
      )
    ),
    ...tagged(
      'insight',
      S,
      choice(
        'm-asql-i-s1',
        'A Number Nobody Asked For',
        'Asked for weekly sign-ups, you notice a third come from one referral partner whose users almost never pay. What do you do?',
        [
          'Give the number asked for, and flag the partner finding with the evidence and what it means for the business',
          'Leave it out; it wasn’t the question',
          'Remove the partner’s sign-ups from the number without saying',
          'Email the partner yourself',
        ],
        0
      )
    ),
  ],
};

// ---------- Data Cleaning ----------
export const CLEANING_MODULE: ModuleSkeleton = {
  familyId: 'test-clean-01',
  aspects: [
    { id: 'text', name: 'Text & Formatting', summary: 'Spaces, case, and splitting and joining text fields.' },
    { id: 'dates', name: 'Dates & Types', summary: 'Mixed date formats, numbers stored as text, and the right types.' },
    { id: 'dedupe', name: 'Duplicates & Records', summary: 'Finding duplicates, deciding which wins, and keeping history.' },
    { id: 'missing', name: 'Missing & Invalid Data', summary: 'Blanks, impossible values, and when to fix, flag or drop.' },
    { id: 'validation', name: 'Validation & Sign-off', summary: 'Proving the data is ready, and explaining what you changed.' },
  ],
  tags: {
    'q-bw-7': ['text', B],
    'q-bw-3': ['dates', B],
    'q-bw-2': ['dates', J],
    'q-bw-8': ['dates', J],
    'q-bw-6': ['dates', J],
    'q-bw-1': ['dedupe', J],
    'q-bw-5': ['dedupe', J],
    'q-bw-4': ['missing', J],
    'q-bw-9': ['validation', J],
    'q-bw-10': ['validation', J],
  },
  bank: [
    ...tagged(
      'text',
      J,
      choice(
        'm-clean-text-j1',
        'Matching Emails',
        '"Ana@Mail.com " and "ana@mail.com" are the same person, but a lookup treats them as different. What do you do to both before matching?',
        ['Trim spaces and lower-case them', 'Upper-case only', 'Remove the @', 'Sort them alphabetically'],
        0
      )
    ),
    ...tagged(
      'text',
      P,
      choice(
        'm-clean-text-p1',
        'Splitting Names',
        'You split a Full Name column on the first space into first and last name. What goes wrong?',
        [
          'Names like "Mary Ann Smith", "van der Berg" or single names split wrongly; keep the original and only split when it is really needed',
          'Nothing; every name has one space',
          'Spaces can’t be searched for',
          'It makes the file bigger',
        ],
        0
      )
    ),
    ...tagged(
      'text',
      S,
      choice(
        'm-clean-text-s1',
        'Garbled Characters',
        'After importing a CSV, "José" shows as "JosÃ©" and "Zoë" as "ZoÃ«". What happened, and the fix?',
        [
          'A UTF-8 file was read as another encoding; re-import it declaring UTF-8, rather than find-and-replacing the symbols',
          'The names were typed wrong; correct them by hand',
          'The font doesn’t support accents',
          'Accents aren’t allowed in databases',
        ],
        0
      )
    ),
    ...tagged(
      'dates',
      P,
      choice(
        'm-clean-dates-p1',
        'Postcodes Losing Zeros',
        'US ZIP codes like 02134 import as 2134. What is the right fix?',
        ['Import the column as text, since it is an identifier, not a number', 'Add 0 to every value', 'Format the cells to show 5 digits and leave them as numbers', 'Delete the short ones'],
        0
      )
    ),
    ...tagged(
      'dates',
      S,
      choice(
        'm-clean-dates-s1',
        'Midnight Orders',
        'Orders from Sydney show up a day early in the UK report, mostly the ones placed in the morning. What is going on?',
        [
          'Times were stored in local time without a zone and read as UTC (or the other way); store timestamps in UTC and convert for display',
          'Sydney’s tills have the wrong date',
          'The report rounds times',
          'Leap years',
        ],
        0
      )
    ),
    ...tagged(
      'dedupe',
      B,
      choice(
        'm-clean-dedupe-b1',
        'An Exact Duplicate',
        'Two rows in a member list are identical in every column. What is the simplest safe step?',
        ['Remove one, after checking nothing else (like visits) refers to it separately', 'Keep both', 'Delete both', 'Change one member’s name'],
        0
      )
    ),
    ...tagged(
      'dedupe',
      P,
      choice(
        'm-clean-dedupe-p1',
        'Which Record Wins',
        'Two records are the same member: one has an old phone number, the other an old address. How do you merge them?',
        [
          'Agree a rule for each field (e.g. most recently updated wins), keep one id, point the other’s history at it, and log the merge',
          'Keep whichever row is first in the file',
          'Keep both and let the new system sort it out',
          'Average the two records',
        ],
        0
      )
    ),
    ...tagged(
      'dedupe',
      S,
      choice(
        'm-clean-dedupe-s1',
        'Near Matches',
        'You are matching 200,000 customers across two systems with no shared id. Names and addresses are typed differently. What approach fits?',
        [
          'Standardise fields, match on strong keys first (email, phone), then fuzzy-match the rest with a score, and review borderline matches by hand',
          'Match only exact full names',
          'Merge everyone with the same surname',
          'Skip matching and load both lists',
        ],
        0
      )
    ),
    ...tagged(
      'missing',
      B,
      choice(
        'm-clean-missing-b1',
        'Blank or Zero',
        'Some customers’ ages are blank. A colleague fills the blanks with 0. Why is that a problem?',
        ['0 is a real value: it pulls the average age down and hides that the age is unknown', 'Spreadsheets can’t hold 0', 'It makes the file larger', 'It is fine'],
        0
      )
    ),
    ...tagged(
      'missing',
      P,
      choice(
        'm-clean-missing-p1',
        'Impossible Values',
        'A height column has values like 1.75 and 175 mixed together, and a few 0s. What do you do?',
        [
          'Work out the units (metres vs cm) by range and convert consistently, and set the 0s to unknown with a flag',
          'Delete every row that isn’t between 1 and 2',
          'Average everything together',
          'Leave it; the analysis will even it out',
        ],
        0
      )
    ),
    ...tagged(
      'missing',
      S,
      choice(
        'm-clean-missing-s1',
        'Not Missing at Random',
        'In a survey, income is blank for 30% of people, mostly the highest earners. You drop those rows. What happens?',
        [
          'The results now under-represent high earners, so averages are biased downward; report the gap and consider weighting',
          'Nothing; 70% is plenty',
          'The averages become more accurate',
          'The file becomes invalid',
        ],
        0
      )
    ),
    ...tagged(
      'validation',
      B,
      choice(
        'm-clean-valid-b1',
        'Keep the Original',
        'Before you start cleaning a file, what should you do?',
        ['Keep an untouched copy of the original, so every change can be checked or undone', 'Sort it', 'Delete blank rows', 'Rename every column'],
        0
      )
    ),
    ...tagged(
      'validation',
      P,
      order('m-clean-valid-p1', 'A Cleaning Job', 'Put these steps in order.', [
        'Copy the raw data and leave the original untouched',
        'Profile it: counts, blanks, formats, odd values',
        'Agree the rules for each problem with the data’s owner',
        'Apply the fixes, logging what changed',
        'Check the result against the original totals',
        'Hand over with a note of what was done',
      ])
    ),
    ...tagged(
      'validation',
      S,
      choice(
        'm-clean-valid-s1',
        'Cleaning Every Month',
        'You clean the same supplier file by hand every month, and each time it takes a day. What should you do?',
        [
          'Script the cleaning with tests on the output, and agree a data contract with the supplier to fix problems at the source',
          'Keep doing it by hand; it’s safest',
          'Ask someone else to do it',
          'Stop cleaning it',
        ],
        0
      )
    ),
  ],
};

// ---------- Reporting & Dashboards ----------
export const DASHBOARD_MODULE: ModuleSkeleton = {
  familyId: 'test-dash-01',
  aspects: [
    { id: 'kpis', name: 'KPIs & Calculations', summary: 'Defining KPIs and calculating rates, growth and conversion correctly.' },
    { id: 'charts', name: 'Choosing Charts', summary: 'The chart that answers the question, and when a table is better.' },
    { id: 'integrity', name: 'Honest Visuals', summary: 'Axes, scales and choices that keep a chart from misleading.' },
    { id: 'reading', name: 'Reading & Reconciling', summary: 'Reading what changed, and why your number differs from someone else’s.' },
    { id: 'story', name: 'Telling the Story', summary: 'Headlines, context and recommendations people act on.' },
  ],
  tags: {
    'q-hf-7': ['kpis', B],
    'q-hf-1': ['kpis', J],
    'q-hf-5': ['kpis', J],
    'q-hf-8': ['charts', B],
    'q-hf-3': ['charts', J],
    'q-hf-4': ['integrity', J],
    'q-hf-2': ['reading', J],
    'q-hf-6': ['reading', J],
    'q-hf-9': ['reading', J],
    'q-hf-10': ['story', J],
  },
  bank: [
    ...tagged(
      'kpis',
      P,
      choice(
        'm-dash-kpi-p1',
        'A KPI That Can Be Gamed',
        'Support’s KPI is “tickets closed per day”. It doubled, but customer complaints rose. What went wrong, and what is better?',
        [
          'Closing tickets fast was rewarded, not solving problems; pair it with reopen rate and customer satisfaction',
          'The KPI was calculated wrongly',
          'Complaints are unrelated to support',
          'Measure tickets closed per hour instead',
        ],
        0
      )
    ),
    ...tagged(
      'kpis',
      S,
      choice(
        'm-dash-kpi-s1',
        'Leading and Lagging',
        'Leaders see churn only after customers leave. Which measure would warn them sooner?',
        [
          'A leading indicator such as weekly active use or support tickets per account, shown against churn',
          'Last year’s churn',
          'Total revenue',
          'Number of employees',
        ],
        0
      )
    ),
    ...tagged(
      'charts',
      P,
      choice(
        'm-dash-chart-p1',
        'Twelve Slices',
        'A pie chart shows revenue across 12 products, most slices a similar size. What is better?',
        ['A bar chart sorted largest to smallest', 'A 3D pie', 'A line chart', 'A donut with a legend'],
        0
      )
    ),
    ...tagged(
      'charts',
      S,
      choice(
        'm-dash-chart-s1',
        'Too Many Tiles',
        'The weekly dashboard has 40 tiles, and managers say they can’t tell what matters. What do you do?',
        [
          'Ask what decisions they make with it, lead with the few KPIs behind those, and move the rest to drill-down pages',
          'Make the tiles smaller to fit more',
          'Add colours to every tile',
          'Send it less often',
        ],
        0
      )
    ),
    ...tagged(
      'integrity',
      B,
      choice(
        'm-dash-int-b1',
        'Where Bars Start',
        'Why should the axis of a bar chart start at zero?',
        ['Bar length shows the value, so a cut-off axis exaggerates differences', 'Software requires it', 'So the chart is taller', 'It doesn’t matter for bars'],
        0
      )
    ),
    ...tagged(
      'integrity',
      P,
      choice(
        'm-dash-int-p1',
        'Two Axes',
        'A chart plots revenue (£) and sign-ups on two different y-axes, and the lines cross dramatically in March. What is the risk?',
        [
          'The crossing depends only on how each axis was scaled, so it suggests a relationship that may not exist',
          'There is none; two axes show more',
          'Revenue can’t be on a line chart',
          'Sign-ups must be a percentage',
        ],
        0
      )
    ),
    ...tagged(
      'integrity',
      S,
      choice(
        'm-dash-int-s1',
        'A Tiny Sample',
        'One store shows a 60% conversion rate on the dashboard, top of the league. It had 5 visitors. How should a dashboard handle that?',
        [
          'Show the sample size and flag or hide rates below a minimum, so small numbers don’t top the rankings',
          'Leave it; 60% is 60%',
          'Remove the store from the company',
          'Round it to 50%',
        ],
        0
      )
    ),
    ...tagged(
      'reading',
      B,
      short(
        'm-dash-read-b1',
        'Percentage Change',
        'Weekly orders went from 400 to 500. By what percentage did they grow? Give a number, e.g. 10%.',
        ['25%', '25', '25.0%'],
        { minutes: 2 }
      )
    ),
    ...tagged(
      'reading',
      P,
      choice(
        'm-dash-read-p1',
        'A Spike',
        'Traffic tripled on one Tuesday and fell back the next day. Before reporting it, what do you check first?',
        [
          'What caused it: a campaign, press, a bot, or a tracking change, by looking at its source and behaviour',
          'Nothing; report the growth',
          'Delete the day from the data',
          'Average it with the week',
        ],
        0
      )
    ),
    ...tagged(
      'reading',
      S,
      choice(
        'm-dash-read-s1',
        'Up Everywhere, Down Overall',
        'Conversion rose in every channel this month, yet overall conversion fell. How?',
        [
          'Traffic shifted towards the channels that convert worst (Simpson’s paradox), so the mix dragged the total down',
          'A formula error, since that’s impossible',
          'Rounding',
          'Conversion can’t be compared month to month',
        ],
        0
      )
    ),
    ...tagged(
      'story',
      B,
      choice(
        'm-dash-story-b1',
        'A Good Headline',
        'Which is the most useful headline for a weekly sales report?',
        ['Sales up 8% on last week, driven by the spring sale on Email', 'Sales report, week 12', 'Here are this week’s numbers', 'Lots of things happened this week'],
        0
      )
    ),
    ...tagged(
      'story',
      P,
      choice(
        'm-dash-story-p1',
        'Bad News',
        'The KPI pack shows a sharp fall in repeat orders. How do you present it?',
        [
          'Lead with it, plainly, with the size of the fall, what you know about why, and what you suggest next',
          'Put it at the end',
          'Leave it out until you know more',
          'Change the chart so it looks flatter',
        ],
        0
      )
    ),
    ...tagged(
      'story',
      S,
      written(
        'm-dash-story-s1',
        'One Slide for the Board',
        'The board gives you one slide to explain why profit fell 12% while revenue grew 5%. What goes on it, and how do you structure it?',
        [
          'Opens with the answer in one sentence: what drove profit down',
          'Shows a bridge (waterfall) from last year’s profit to this year’s, by driver',
          'Separates one-offs from things that will continue',
          'Ends with what the business should do and what it would be worth',
        ],
        'Headline first: “Profit fell 12% because discounting and higher shipping costs outweighed 5% revenue growth.” Then a profit bridge from last year to this year, one bar per driver (volume, price and discounts, mix, shipping, overheads). Mark which drivers are one-offs and which will continue. Close with two or three actions and what each is worth.'
      )
    ),
  ],
};

// ---------- Business Metrics & A/B Tests ----------
export const METRICS_MODULE: ModuleSkeleton = {
  familyId: 'test-da-01',
  aspects: [
    { id: 'metrics', name: 'Metrics & Rates', summary: 'Conversion, retention, averages and the metric that should decide.' },
    { id: 'experiments', name: 'Experiment Design', summary: 'Setting up a fair test: randomising, sample size and what can spoil it.' },
    { id: 'stats', name: 'Significance & Uncertainty', summary: 'p-values, confidence intervals and the traps of reading them.' },
    { id: 'reading', name: 'Reading Results', summary: 'What the numbers actually show, by day, segment and metric.' },
    { id: 'advice', name: 'Advising Decisions', summary: 'Turning a result into a clear recommendation, risks included.' },
  ],
  tags: {
    'q-pk-5': ['metrics', J],
    'q-pk-3': ['metrics', J],
    'q-pk-6': ['metrics', J],
    'q-pk-8': ['experiments', J],
    'q-pk-7': ['experiments', P],
    'q-pk-9': ['stats', B],
    'q-pk-4': ['stats', J],
    'q-pk-1': ['reading', J],
    'q-pk-2': ['reading', J],
    'q-pk-10': ['advice', J],
  },
  bank: [
    ...tagged(
      'metrics',
      B,
      short(
        'm-da-met-b1',
        'Conversion Rate',
        '2,000 people visited and 50 bought. What is the conversion rate? Give a number, e.g. 10%.',
        ['2.5%', '2.5', '2.50%'],
        { minutes: 2 }
      )
    ),
    ...tagged(
      'metrics',
      P,
      choice(
        'm-da-met-p1',
        'Average Revenue per User',
        'A variant raised revenue per visitor by 4% but lowered conversion by 2%. How can both be true?',
        [
          'Fewer people bought, but those who did spent more per order',
          'One of the numbers must be wrong',
          'Revenue per visitor ignores buyers',
          'Conversion includes refunds',
        ],
        0
      )
    ),
    ...tagged(
      'metrics',
      S,
      choice(
        'm-da-met-s1',
        'A Win That Hurts',
        'A bigger “Start free trial” button raised trial starts 15%. Six weeks later, paid conversions from those trials are flat. What should the team have measured?',
        [
          'A metric closer to value, like paid conversion or revenue per visitor, with trial starts as a secondary metric',
          'Clicks on the button',
          'Time on page',
          'Nothing; trials were the goal',
        ],
        0
      )
    ),
    ...tagged(
      'experiments',
      B,
      choice(
        'm-da-exp-b1',
        'Why Randomise',
        'Why are visitors split between A and B at random, rather than A on weekdays and B at weekends?',
        ['So the only systematic difference between the groups is the change being tested', 'It’s easier to set up', 'Weekends have no visitors', 'So the result comes faster'],
        0
      )
    ),
    ...tagged(
      'experiments',
      S,
      choice(
        'm-da-exp-s1',
        'Testing a Marketplace',
        'You want to test a new pricing rule on a ride-hailing app, where riders and drivers share one pool. Why is splitting riders 50/50 risky?',
        [
          'The groups compete for the same drivers, so one group’s change affects the other; randomise by city or time instead',
          'Riders don’t like tests',
          'You need 90/10 for pricing',
          'Pricing can’t be tested',
        ],
        0
      )
    ),
    ...tagged(
      'stats',
      P,
      choice(
        'm-da-stats-p1',
        'Reading a Confidence Interval',
        'B’s uplift is +3%, with a 95% confidence interval of −1% to +7%. What does that say?',
        [
          'The true effect could plausibly be anywhere from slightly negative to clearly positive; it isn’t conclusive',
          'B is 95% likely to be 3% better',
          'B is definitely better',
          'B is worse',
        ],
        0
      )
    ),
    ...tagged(
      'stats',
      S,
      choice(
        'm-da-stats-s1',
        'Twenty Metrics',
        'An experiment tracked 20 metrics, and one showed p < 0.05. The team wants to announce it. What is the problem?',
        [
          'With 20 metrics, one false positive at p < 0.05 is expected by chance; decide the primary metric up front or correct for multiple comparisons',
          'p < 0.05 is not significant',
          'They should have tracked more metrics',
          'There is no problem',
        ],
        0
      )
    ),
    ...tagged(
      'reading',
      B,
      choice(
        'm-da-read-b1',
        'A Small Difference',
        'After one day, A converted 3.1% and B 3.3% from 300 visitors each. What can you say?',
        ['Too little data to tell; the difference could easily be chance', 'B is better', 'A is better', 'The test is broken'],
        0
      )
    ),
    ...tagged(
      'reading',
      P,
      choice(
        'm-da-read-p1',
        'The First Few Days',
        'B led strongly in its first three days, then its lead shrank to nothing. What is a likely reason?',
        [
          'A novelty effect: returning users clicked the new thing because it was new, and that wore off',
          'The randomisation broke',
          'B ran out of stock',
          'Weekends always favour B',
        ],
        0
      )
    ),
    ...tagged(
      'reading',
      S,
      choice(
        'm-da-read-s1',
        'Uneven Split',
        'A 50/50 test ended with 50,600 visitors in A and 49,100 in B. Why does that matter?',
        [
          'A sample ratio mismatch: the split is off by more than chance, so something (a bug, a redirect, bots) treated the groups differently; don’t trust the result until it’s explained',
          'It doesn’t; close enough',
          'B is less popular',
          'A should be scaled down to match',
        ],
        0
      )
    ),
    ...tagged(
      'advice',
      B,
      choice(
        'm-da-adv-b1',
        'No Difference',
        'A well-run test finds no difference between A and B. What is a reasonable recommendation?',
        ['Keep whichever is simpler or cheaper, and say the change didn’t move the metric', 'Run it again until one wins', 'Ship B because it’s new', 'Say the test failed'],
        0
      )
    ),
    ...tagged(
      'advice',
      P,
      choice(
        'm-da-adv-p1',
        'Small but Real',
        'B gives a confident +0.4% conversion, but needs a developer for a month to build properly. How do you advise?',
        [
          'Put the uplift into money per year and compare it with the cost, so the team can decide on value, not just significance',
          'Ship it; it’s significant',
          'Don’t ship it; 0.4% is too small',
          'Run the test for another month',
        ],
        0
      )
    ),
    ...tagged(
      'advice',
      S,
      written(
        'm-da-adv-s1',
        'Overruled',
        'The CEO wants to ship variant B because they like it, though the test shows it lowered revenue per visitor by 2% with a narrow confidence interval. Write your reply.',
        [
          'States the result plainly with its size in money',
          'Acknowledges what the CEO likes about B and separates it from the result',
          'Offers options, e.g. keep A, or iterate on B and test again',
          'Is respectful and clear about the recommendation, leaving the decision with them',
        ],
        'B lowered revenue per visitor by 2%, and the interval is narrow, so that is a real loss: about £X a year at current traffic. I see why B appeals: it looks cleaner. I’d keep A for now and test a version of B that keeps A’s checkout prompts, which is the likely cause. If you’d still like to ship B, we can, knowing the cost. Happy to talk it through.'
      )
    ),
  ],
};

// ---------- Data Analyst Simulation ----------
export const DA_SIM_MODULE: ModuleSkeleton = {
  familyId: 'test-sim-da-01',
  aspects: [
    { id: 'stats', name: 'Statistics Basics', summary: 'Averages, percentages and spread: the numbers behind every analysis.' },
    { id: 'cleaning', name: 'Data Quality', summary: 'Spotting and fixing bad data before it reaches a decision.' },
    { id: 'sql', name: 'SQL & Views', summary: 'Querying the data and building views others rely on.' },
    { id: 'spreadsheet', name: 'Spreadsheet Analysis', summary: 'Lookups, targets and summaries in a working spreadsheet.' },
    { id: 'insight', name: 'Investigating & Explaining', summary: 'Finding why a number moved, and telling cause from coincidence.' },
    { id: 'dashboard', name: 'Dashboard & Manager Summary', summary: 'A dashboard the Operations Director can read, and a summary she can act on.' },
    { id: 'aicheck', name: 'Checking AI Output', summary: 'Finding and fixing what an AI assistant got wrong about the data.' },
  ],
  tags: {
    'q-sim-1': ['stats', B],
    'q-sim-4': ['stats', B],
    'q-sim-2': ['cleaning', J],
    'q-sim-5': ['cleaning', P],
    'q-sim-7': ['cleaning', P],
    'q-sim-12': ['cleaning', P],
    'q-sim-3': ['sql', J],
    'q-sim-8': ['sql', P],
    'q-sim-9': ['sql', P],
    'q-sim-6': ['spreadsheet', P],
    'q-sim-13': ['insight', J],
    'q-sim-10': ['insight', P],
    'q-sim-11': ['insight', P],
    'q-sim-14': ['insight', S],
  },
  bank: [
    ...tagged(
      'stats',
      J,
      choice(
        'm-sim-stats-j1',
        'Percentage Points',
        'Conversion went from 4% to 5%. Which is right?',
        ['It rose by 1 percentage point, which is a 25% increase', 'It rose by 1%', 'It rose by 25 percentage points', 'It rose by 5%'],
        0
      )
    ),
    ...tagged(
      'stats',
      P,
      choice(
        'm-sim-stats-p1',
        'Normal Variation',
        'A store’s weekly sales are usually £10,000 give or take about £800. This week was £9,300. How worried should the manager be?',
        ['Not very: that is within the store’s usual week-to-week range', 'Very: sales are down 7%', 'It means the store is failing', 'It can’t be judged without a year of data'],
        0
      )
    ),
    ...tagged(
      'stats',
      S,
      choice(
        'm-sim-stats-s1',
        'Regression to the Mean',
        'The five worst stores last quarter got a new coaching programme, and all five improved this quarter. What else could explain it?',
        [
          'Regression to the mean: unusually bad quarters tend to be followed by more normal ones, coaching or not; compare with similar stores that weren’t coached',
          'Nothing; the coaching worked',
          'The stores cheated',
          'Seasonality can’t affect stores',
        ],
        0
      )
    ),
    ...tagged(
      'cleaning',
      B,
      choice(
        'm-sim-clean-b1',
        'A Row Twice',
        'A sales export has some orders listed twice with the same order id. What happens if you total it as it is?',
        ['Revenue is overstated by the duplicated orders', 'Nothing; totals ignore duplicates', 'Revenue is understated', 'The file won’t open'],
        0
      )
    ),
    ...tagged(
      'cleaning',
      S,
      choice(
        'm-sim-clean-s1',
        'Fixing It Upstream',
        'You clean the same till-feed errors every week. What is the senior move?',
        [
          'Quantify the problem, take it to the team that owns the feed with examples, and add automated checks that alert when it recurs',
          'Keep cleaning it quietly',
          'Stop using the feed',
          'Hand the cleaning to a junior',
        ],
        0
      )
    ),
    ...tagged(
      'sql',
      B,
      choice(
        'm-sim-sql-b1',
        'Revenue by Store',
        'Which query totals revenue for each store?',
        [
          'SELECT store_id, SUM(revenue) FROM daily_sales GROUP BY store_id',
          'SELECT SUM(revenue) FROM daily_sales',
          'SELECT store_id, revenue FROM daily_sales ORDER BY store_id',
          'SELECT COUNT(store_id) FROM daily_sales',
        ],
        0
      )
    ),
    ...tagged(
      'sql',
      S,
      choice(
        'm-sim-sql-s1',
        'A View People Trust',
        'Finance, ops and marketing will all query your store performance view. What matters most before you share it?',
        [
          'Its definitions are written down (what counts as revenue, which days, which stores) and it reconciles to finance’s totals',
          'It has as many columns as possible',
          'It runs in under 10 ms',
          'It has a short name',
        ],
        0
      )
    ),
    ...tagged(
      'spreadsheet',
      B,
      choice(
        'm-sim-sheet-b1',
        'Against Target',
        'A store took £46,000 against a target of £50,000. Which formula shows the % of target achieved?',
        ['=46000/50000', '=50000/46000', '=46000-50000', '=(50000-46000)/46000'],
        0
      )
    ),
    ...tagged(
      'spreadsheet',
      J,
      choice(
        'm-sim-sheet-j1',
        'Matching Store Codes',
        'Targets use store codes like "S03", but the sales sheet has "s03 " in places. A lookup misses those stores. What do you do?',
        ['Clean the codes the same way on both sides (TRIM and UPPER) before looking up', 'Type the targets in by hand', 'Delete the stores that don’t match', 'Use SUM instead of a lookup'],
        0
      )
    ),
    ...tagged(
      'spreadsheet',
      S,
      choice(
        'm-sim-sheet-s1',
        'Fair Targets',
        'Head office sets every store the same 10% growth target. Two stores opened mid-year and one was refurbished. What would you advise?',
        [
          'Set targets from each store’s comparable base (like-for-like periods, open days), and treat new and refurbished stores separately',
          'Keep 10% for everyone; it’s fair',
          'Give new stores 0% targets',
          'Average all the stores and give each that',
        ],
        0
      )
    ),
    ...tagged(
      'insight',
      B,
      choice(
        'm-sim-ins-b1',
        'Correlation',
        'Stores that sell more pastries also sell more coffee. What can you conclude?',
        ['The two move together; it doesn’t show one causes the other (busier stores sell more of both)', 'Pastries cause coffee sales', 'Coffee causes pastry sales', 'Nothing at all'],
        0
      )
    ),
    ...tagged(
      'dashboard',
      B,
      choice(
        'm-sim-dash-b1',
        'The Headline Number',
        'Hannah wants one number at the top of the board dashboard. Which is most useful?',
        ['Q1 sales against plan, as £ and % (e.g. £X below plan, −Y%)', 'The number of rows in the till export', 'Average transaction ID', 'The number of stores'],
        0
      )
    ),
    ...tagged(
      'dashboard',
      J,
      choice(
        'm-sim-dash-j1',
        'Stores vs Target',
        'Which chart best shows each of the eight stores’ Q1 sales against its target?',
        ['A bar per store with its target marked (or a bar of variance to target), sorted by variance', 'A pie chart of sales by store', 'A 3D line chart', 'A table of every transaction'],
        0
      )
    ),
    ...tagged(
      'dashboard',
      P,
      multi(
        'm-sim-dash-p1',
        'On the Dashboard',
        'What belongs on Hannah’s board dashboard? Tick all that apply.',
        [
          'Total vs plan, and each store vs its target',
          'A clear note of data issues found and fixed (and their effect on the numbers)',
          'Weekly trend, so a one-off week stands out',
          'The date range and data sources',
          'Every column from the till export',
        ],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'dashboard',
      S,
      written(
        'm-sim-dash-s1',
        'The Manager Summary',
        'Write the short summary that goes above the dashboard for Hannah to take to the board. Use what you found in the simulation (or, if you’re reading this without it: a chain that missed plan, with data problems in the till export and two stores driving most of the miss).',
        [
          'Leads with the answer: how far below plan, and which stores drove it',
          'Gives the why, separating real causes from data problems that made it look worse or better',
          'Says what the data can’t tell yet, and how confident the numbers are',
          'Ends with a recommendation or next step the board can act on',
        ],
        `Q1 came in below plan. Most of the gap is two stores; the rest of the chain is close to target. Part of what first looked like a shortfall was the till export double-counting and mis-dating some sales; after fixing those, the real miss is smaller and confined to those two stores. In each, the drop starts in a specific week and lines up with a local cause rather than a chain-wide fall in demand. The data can't tell us yet whether those stores recover in Q2. Recommendation: focus the board on those two stores' recovery plans, and fix the till export before the Q2 report so the numbers are right first time.`,
        { minutes: 10 }
      )
    ),
    ...tagged(
      'aicheck',
      B,
      choice(
        'm-sim-ai-b1',
        'Checking an AI Answer',
        'An AI assistant says “Store 3 missed target by 18%”. What do you do before putting it in Hannah’s report?',
        ['Check it against the data yourself: the store’s sales, its target and the calculation', 'Use it; AI is good at maths', 'Round it to 20%', 'Ask the AI if it’s sure'],
        0
      )
    ),
    ...tagged(
      'aicheck',
      J,
      choice(
        'm-sim-ai-j1',
        'An AI-Written Query',
        'An AI wrote SELECT store, SUM(amount) FROM sales JOIN refunds USING (order_id) GROUP BY store. Totals look too low. Why?',
        ['The inner join keeps only orders that had a refund; sales without refunds drop out (use a LEFT JOIN and subtract refunds)', 'SUM is wrong', 'GROUP BY should be ORDER BY', 'Nothing is wrong'],
        0
      )
    ),
    ...tagged(
      'aicheck',
      P,
      caseStudy(
        'm-sim-ai-p',
        'An AI’s Summary',
        `A colleague pasted the store results into an AI assistant and asked for a board summary. The table:

Store        Q1 sales    Q1 target   Variance
Leeds        £182,000    £190,000    −£8,000
York         £141,000    £150,000    −£9,000
Harrogate    £96,000     £125,000    −£29,000
Ripon        £88,000     £86,000     +£2,000
Total        £507,000    £551,000    −£44,000

The AI wrote:
"Ridgeway missed plan by 8% (£44,000). Every store missed its target. Harrogate was the worst, down 29%. Leeds and York together explain most of the shortfall."`,
        'Store table and AI summary'
      ),
      multi(
        'm-sim-ai-p1',
        'What’s Wrong',
        'Which claims in the AI summary are wrong? Tick all that apply.',
        [
          'Missed plan by 8% (£44,000)',
          'Every store missed its target',
          'Harrogate down 29%',
          'Leeds and York together explain most of the shortfall',
        ],
        [1, 2, 3],
        { taskId: 'm-sim-ai-p' }
      ),
      short(
        'm-sim-ai-p2',
        'Harrogate’s Miss',
        'By what % did Harrogate miss its target? (One decimal place.)',
        ['23.2%', '23.2', '−23.2%', '-23.2%', '23.20%'],
        { taskId: 'm-sim-ai-p' }
      ),
      written(
        'm-sim-ai-p3',
        'The Corrected Summary',
        'Rewrite the summary correctly.',
        [
          'Total: £44,000 (8.0%) below plan',
          'Harrogate is most of it: £29,000, 23.2% below its target, about two-thirds of the gap',
          'Leeds (−£8,000) and York (−£9,000) missed by smaller amounts, about 4–6%',
          'Ripon beat its target by £2,000',
        ],
        `Ridgeway finished Q1 £44,000 (8.0%) below plan. Harrogate accounts for two-thirds of that: £29,000 short, 23.2% below its target. Leeds and York were each a little under (£8,000 and £9,000, about 4% and 6%), and Ripon beat its target by £2,000. The question for the board is what happened in Harrogate.`,
        { taskId: 'm-sim-ai-p' }
      )
    ),
    ...tagged(
      'aicheck',
      S,
      choice(
        'm-sim-ai-s1',
        'A Team Rule',
        'The analytics team now uses AI assistants for queries and summaries. Which rule keeps board reports trustworthy?',
        [
          'Every number in a report is traced to a query or cell someone has checked, and AI-written queries are reviewed and run against known totals before use',
          'Only use AI for summaries, never for numbers, and don’t check summaries',
          'Trust AI output if it sounds confident',
          'Ban AI tools',
        ],
        0
      )
    ),
  ],
};
