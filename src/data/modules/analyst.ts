import { AssessmentTest } from '../../types';
import { caseStudy, choice, match, multi, short, written } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';

// Tool tests for data analysts: Power BI, Tableau and Python. They were written as skeletons from the start, so the
// main (Junior) test has no questions of its own; every level is built from the bank.

const main = (t: Omit<AssessmentTest, 'type' | 'difficulty' | 'questions' | 'estimatedMinutes' | 'totalQuestions' | 'category'>): AssessmentTest => ({
  ...t,
  type: 'standard',
  category: 'Data Analysis',
  difficulty: 'Junior',
  questions: [],
  estimatedMinutes: 0,
  totalQuestions: 0,
});

export const ANALYST_TOOL_TESTS: AssessmentTest[] = [
  main({
    id: 'test-pbi-01',
    title: 'Power BI: Models, DAX & Reports',
    description: 'Clean data in Power Query, build a star schema, write DAX measures and design reports people trust, then work through a real sales model.',
    passingScore: 70,
    skillsTested: ['Power BI', 'DAX', 'Power Query', 'Data Modelling'],
    roles: ['Data Analyst', 'Business Analyst'],
  }),
  main({
    id: 'test-tab-01',
    title: 'Tableau: Calculations & Dashboards',
    description: 'Connect and relate data sources, write calculations and LODs, pick the right chart and build dashboards people can explore.',
    passingScore: 70,
    skillsTested: ['Tableau', 'Calculated Fields', 'LOD Expressions', 'Dashboards'],
    roles: ['Data Analyst', 'Business Analyst'],
  }),
  main({
    id: 'test-py-01',
    title: 'Python for Analysts: pandas',
    description: 'Python basics, then pandas: load, filter, clean, merge and group data, read what code returns, and find the bugs in real analysis code.',
    passingScore: 70,
    skillsTested: ['Python', 'pandas', 'Data Wrangling', 'Aggregation'],
    roles: ['Data Analyst', 'Data Engineer'],
  }),
];

// ---------- Power BI ----------
export const POWER_BI_MODULE: ModuleSkeleton = {
  familyId: 'test-pbi-01',
  aspects: [
    { id: 'query', name: 'Power Query', summary: 'Getting, cleaning and shaping data so it refreshes the same way every time.' },
    { id: 'model', name: 'Data Modelling', summary: 'Facts, dimensions, relationships and the star schema.' },
    { id: 'dax', name: 'DAX Measures', summary: 'Measures, CALCULATE, filter context and time intelligence.' },
    { id: 'reports', name: 'Reports & Sharing', summary: 'Visuals, drillthrough, security and fast pages.' },
    { id: 'case', name: 'Report Builds', summary: 'A real model or report: work out the numbers and fix what’s wrong.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'query',
      B,
      choice(
        'm-pbi-q-b1',
        'Where to Clean',
        'Product names have stray spaces and dates arrive as text. Where should you fix them?',
        [
          'In Power Query, as applied steps that run again on every refresh',
          'By editing the cells in the report',
          'In the source file by hand each month',
          'With a text box over the visual',
        ],
        0
      )
    ),
    ...tagged(
      'query',
      J,
      choice(
        'm-pbi-q-j1',
        'A File a Month',
        'Sales arrive as one CSV per month in a shared folder, and a new file lands every month. How do you load them?',
        [
          'Get Data from Folder and combine the files, so new files are picked up on refresh',
          'Import each file separately and append them by hand every month',
          'Copy and paste them into one Excel file',
          'Load only the latest file',
        ],
        0
      )
    ),
    ...tagged(
      'query',
      P,
      choice(
        'm-pbi-q-p1',
        'Months as Columns',
        'A budget table has one row per product and a column for each month, Jan to Dec. You need to analyse it by month. What do you do in Power Query?',
        [
          'Unpivot the month columns into two columns, Month and Amount',
          'Pivot the product column',
          'Transpose the table',
          'Add twelve measures, one per month',
        ],
        0
      )
    ),
    ...tagged(
      'query',
      S,
      choice(
        'm-pbi-q-s1',
        'Slow Refresh',
        'A query against a 50-million-row SQL table refreshed in two minutes. After you added a custom column step near the start, it takes an hour. What most likely happened?',
        [
          'The step broke query folding, so Power BI now pulls every row and works locally; move filters first, push the logic to the source, and check View Native Query',
          'The gateway needs restarting',
          'Custom columns are always slow; never use them',
          'The SQL server ran out of disk space',
        ],
        0
      )
    ),
    ...tagged(
      'model',
      B,
      match('m-pbi-m-b1', 'Model Pieces', 'Match each part of a model to what it is.', [
        ['Fact table', 'Events with numbers, like one row per sale'],
        ['Dimension table', 'Things you slice by, like products or customers'],
        ['Relationship', 'A link between key columns in two tables'],
        ['Date table', 'A continuous calendar used for time calculations'],
      ])
    ),
    ...tagged(
      'model',
      J,
      choice(
        'm-pbi-m-j1',
        'Products and Sales',
        'Products has one row per product; Sales has many rows per product. How should they be related?',
        [
          'One-to-many from Products to Sales on ProductID, with filters flowing from Products to Sales',
          'Many-to-many on product name',
          'One-to-one on ProductID',
          'No relationship; use a lookup in every measure',
        ],
        0
      )
    ),
    ...tagged(
      'model',
      P,
      choice(
        'm-pbi-m-p1',
        'The Same Target Everywhere',
        'A matrix shows sales and target by region. Sales split correctly, but every region shows the same total target. Why?',
        [
          'The region filter can’t reach the Targets table; relate Targets to shared Region and Date dimensions at the grain it’s stored at',
          'The target measure needs SUM instead of SUMX',
          'Targets should be a calculated column',
          'The visual needs refreshing',
        ],
        0
      )
    ),
    ...tagged(
      'model',
      S,
      choice(
        'm-pbi-m-s1',
        'Everything Both Ways',
        'A colleague set every relationship to filter in both directions “so the slicers work”. What’s the risk?',
        [
          'Ambiguous filter paths, wrong or surprising totals and slower reports; keep single direction and handle the odd case in a measure (e.g. CROSSFILTER) or with a bridge table',
          'None; both directions is the recommended default',
          'It only affects colours',
          'It stops the report refreshing',
        ],
        0
      )
    ),
    ...tagged(
      'dax',
      B,
      choice(
        'm-pbi-d-b1',
        'Measure or Column',
        'You need Total Sales that changes with every slicer and filter. What do you create?',
        ['A measure: Total Sales = SUM(Sales[Amount])', 'A calculated column on Sales', 'A new table', 'A static number in a card'],
        0
      )
    ),
    ...tagged(
      'dax',
      J,
      choice(
        'm-pbi-d-j1',
        'West Only',
        'Which measure gives sales for the West region, whatever region the user has selected?',
        [
          'CALCULATE([Total Sales], Stores[Region] = "West")',
          'SUM(Sales[Amount]) WHERE Stores[Region] = "West"',
          'IF(Stores[Region] = "West", [Total Sales])',
          'FILTER([Total Sales], "West")',
        ],
        0
      )
    ),
    ...tagged(
      'dax',
      P,
      choice(
        'm-pbi-d-p1',
        'Share of Total',
        'In a table of product categories, which measure shows each category’s share of all sales?',
        [
          'DIVIDE([Total Sales], CALCULATE([Total Sales], ALL(Products[Category])))',
          '[Total Sales] / [Total Sales]',
          'DIVIDE([Total Sales], COUNTROWS(Products))',
          'SUM(Sales[Amount]) / 100',
        ],
        0
      ),
      short(
        'm-pbi-d-p2',
        'Year on Year',
        'For 2025, Total Sales is 500,000. Sales LY = CALCULATE([Total Sales], SAMEPERIODLASTYEAR(\'Date\'[Date])) shows 400,000.\n\nWhat is the year-on-year growth, as a %?',
        ['25%', '25', '0.25', '25 percent']
      )
    ),
    ...tagged(
      'dax',
      S,
      choice(
        'm-pbi-d-s1',
        'Context Transition',
        'On the Customers table, the column = SUM(Sales[Amount]) shows the grand total on every row, but = CALCULATE(SUM(Sales[Amount])) shows each customer’s own total. Why?',
        [
          'CALCULATE turns the current row into a filter (context transition), so the sum only sees that customer’s sales through the relationship',
          'CALCULATE is just a faster SUM',
          'The first column is cached from an older refresh',
          'SUM ignores relationships, and CALCULATE sorts the rows',
        ],
        0
      )
    ),
    ...tagged(
      'reports',
      B,
      choice(
        'm-pbi-r-b1',
        'A Trend',
        'Which visual best shows monthly sales over the last two years?',
        ['A line chart with month on the axis', 'A pie chart', 'A table of 24 numbers', 'A card'],
        0
      )
    ),
    ...tagged(
      'reports',
      J,
      choice(
        'm-pbi-r-j1',
        'Jump to a Customer',
        'Managers want to right-click any customer in any visual and open a page about just that customer. What do you build?',
        ['A drillthrough page with Customer as its drillthrough field', 'A copy of the page for every customer', 'A bookmark per customer', 'A slicer on every page'],
        0
      )
    ),
    ...tagged(
      'reports',
      P,
      choice(
        'm-pbi-r-p1',
        'Only Their Region',
        'Each regional manager must see only their own region, in the same published report. How?',
        [
          'Row-level security: a role whose DAX filter matches the user (e.g. via USERPRINCIPALNAME() and a mapping table), with users assigned in the service',
          'A separate report for each region',
          'Hide the other regions with a page filter',
          'Ask managers to use the region slicer',
        ],
        0
      )
    ),
    ...tagged(
      'reports',
      S,
      choice(
        'm-pbi-r-s1',
        'A 15-Second Page',
        'A report page with 25 visuals takes 15 seconds to load. Where do you start?',
        [
          'Performance Analyzer to find the slow visuals and DAX, then cut or combine visuals and fix the slow measures and model',
          'Buy a bigger capacity straight away',
          'Tell users to wait',
          'Turn every visual into a table',
        ],
        0
      )
    ),
    ...tagged(
      'case',
      B,
      short(
        'm-pbi-c-b1',
        'Margin %',
        'Revenue is £120,000 and Cost is £90,000. Margin % = DIVIDE([Revenue] − [Cost], [Revenue]).\n\nWhat does the measure show, as a %?',
        ['25%', '25', '0.25', '25 percent']
      )
    ),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-pbi-c-j',
        'Trailhead Outdoor: The Model',
        `Tables loaded so far:

Sales      OrderID, Date, ProductID, StoreID, Qty, UnitPrice
Products   ProductID, Name, Category, UnitCost
Stores     StoreID, City, Region
Targets    Region, Month, Target

A few Sales rows:
ProductID  Qty  UnitPrice
P1         2    £50
P2         1    £120
P1         3    £45

Unit costs: P1 £30, P2 £80.`,
        'Model notes'
      ),
      multi('m-pbi-c-j1', 'Dimensions', 'Which of these are dimension tables? Tick all that apply.', ['Sales', 'Products', 'Stores', 'Targets'], [1, 2], { taskId: 'm-pbi-c-j' }),
      choice(
        'm-pbi-c-j2',
        'Missing Piece',
        'The model needs year-to-date and last-year comparisons. What’s missing?',
        ['A Date table, marked as a date table and related to Sales[Date]', 'A second Sales table', 'A calculated column for each year', 'Nothing; Sales[Date] is enough'],
        0,
        { taskId: 'm-pbi-c-j' }
      ),
      choice(
        'm-pbi-c-j3',
        'Gross Margin Measure',
        'Which measure gives the right gross margin?',
        [
          'SUMX(Sales, Sales[Qty] * (Sales[UnitPrice] - RELATED(Products[UnitCost])))',
          'SUM(Sales[Qty]) * (SUM(Sales[UnitPrice]) - SUM(Products[UnitCost]))',
          'SUM(Sales[UnitPrice]) - SUM(Products[UnitCost])',
          'AVERAGE(Sales[UnitPrice]) - AVERAGE(Products[UnitCost])',
        ],
        0,
        { taskId: 'm-pbi-c-j' }
      ),
      short('m-pbi-c-j4', 'Margin on These Rows', 'What is the gross margin on the three rows shown, in £?', ['125', '£125'], { taskId: 'm-pbi-c-j' }),
      written(
        'm-pbi-c-j5',
        'Actual vs Target',
        'Targets are set per region per month; Sales are per order. How do you show actual against target in one visual?',
        [
          'Relate both tables to shared dimensions: a Region table (or Stores’ region) and the Date table, with Targets joined at month level',
          'Measures for Total Sales, Total Target and the variance (and % of target)',
          'Shows them by region and month only, since targets don’t exist at daily or store level',
          'Mentions checking that totals match before sharing',
        ],
        `I'd add a Region dimension (one row per region) related to both Stores and Targets, and relate Targets to the Date table through a month key, like the first day of each month. Then three measures: Total Sales, Total Target = SUM(Targets[Target]), and Variance = [Total Sales] − [Total Target], plus % of Target with DIVIDE. The visual is a matrix or column chart by region and month; I wouldn't show it by day or store, because targets aren't set at that level. I'd check a couple of regions against the source before sharing.`,
        { taskId: 'm-pbi-c-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-pbi-c-p',
        'Numbers That Don’t Match',
        `Finance says Q1 revenue was £2.40m. Your Power BI report says £2.52m.

You find:
• Sales includes orders with Status = "Cancelled", worth £0.09m in Q1.
• A failed refresh loaded three days of rows twice, worth £0.03m.
• Each order line has a unique OrderLineID.`,
        'Reconciliation notes'
      ),
      short('m-pbi-c-p1', 'Explained by Cancellations', 'What % of the gap do cancelled orders explain?', ['75%', '75', '0.75', '75 percent'], { taskId: 'm-pbi-c-p' }),
      multi(
        'm-pbi-c-p2',
        'Fixes',
        'Which fixes belong in the model? Tick all that apply.',
        [
          'Exclude cancelled orders, in Power Query or in the revenue measure',
          'Remove duplicates on OrderLineID in Power Query',
          'A check that compares the total to finance’s figure after each refresh',
          'Subtract £0.12m from the revenue measure',
          'Hide the Q1 numbers',
        ],
        [0, 1, 2],
        { taskId: 'm-pbi-c-p' }
      ),
      written(
        'm-pbi-c-p3',
        'To Finance',
        'Write a short message to finance explaining the difference.',
        [
          'Says plainly the report was wrong and finance’s £2.40m is right',
          'Explains the £0.12m: £0.09m cancelled orders and £0.03m duplicated rows from a failed refresh',
          'Says what’s fixed: cancellations excluded, duplicates removed on OrderLineID',
          'Says how it won’t recur, e.g. a reconciliation check after refresh',
        ],
        `You're right: Q1 revenue is £2.40m and our report was £0.12m too high. £0.09m was cancelled orders that the report wasn't excluding, and £0.03m came from a failed refresh that loaded three days twice. Both are fixed: cancelled orders are filtered out and duplicate order lines are removed on load. I've also added a check that compares the report total to your ledger after each refresh, so a gap like this shows up straight away.`,
        { taskId: 'm-pbi-c-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-pbi-c-s',
        'The 1.2 GB Report',
        `A sales report is one flat table: 30 million rows, 45 columns, 1.2 GB. Refresh times out twice a week and pages take 20 seconds.

Columns include OrderDateTime (to the second), customer name, address and email on every row, 12 product attribute columns, and 8 columns no visual uses.

Three years of history; only the last 7 days ever change.`,
        'Report audit'
      ),
      short(
        'm-pbi-c-s1',
        'Cardinality',
        'You split OrderDateTime into a Date column (three years of 365 days) and a Time column to the minute. How many distinct values do the two columns have between them?',
        ['2535', '2,535'],
        { taskId: 'm-pbi-c-s' }
      ),
      multi(
        'm-pbi-c-s2',
        'The Redesign',
        'Which belong in the redesign? Tick all that apply.',
        [
          'A star schema: a Sales fact with Customer, Product and Date dimensions',
          'Remove the 8 unused columns',
          'Incremental refresh that reloads only recent days',
          'Keep customer details on every sales row for speed',
          'Turn every column into a calculated column',
        ],
        [0, 1, 2],
        { taskId: 'm-pbi-c-s' }
      ),
      written(
        'm-pbi-c-s3',
        'The Plan',
        'Set out your plan to fix the report and roll it out without breaking things for its users.',
        [
          'Remodel as a star schema, moving customer and product attributes into dimensions',
          'Shrink the model: drop unused columns, split date and time, reduce high-cardinality columns',
          'Incremental refresh so only recent data reloads, fixing the timeouts',
          'Checks totals against the old report before switching',
          'Rolls out safely, e.g. builds alongside, tests with key users, then swaps, and tells users what changed',
        ],
        `First the model: split the flat table into a Sales fact keyed to Customer, Product and Date dimensions, so names, addresses and product attributes are stored once, not 30 million times. Drop the 8 unused columns and split OrderDateTime into date and time, which cuts millions of distinct values to a few thousand. Then set incremental refresh to reload only the last 7 days, which ends the timeouts. I'd build it alongside the old report, check the main totals match to the pound, have two or three heavy users test it for a week, then swap the links and tell everyone what changed.`,
        { taskId: 'm-pbi-c-s' }
      )
    ),
  ],
};

// ---------- Tableau ----------
export const TABLEAU_MODULE: ModuleSkeleton = {
  familyId: 'test-tab-01',
  aspects: [
    { id: 'data', name: 'Data Sources', summary: 'Extracts, joins, relationships and filters at the source.' },
    { id: 'calcs', name: 'Calculations', summary: 'Calculated fields, table calculations and LOD expressions.' },
    { id: 'charts', name: 'Charts & Design', summary: 'The right chart for the question, drawn honestly.' },
    { id: 'dash', name: 'Dashboards', summary: 'Actions, parameters and dashboards people actually use.' },
    { id: 'case', name: 'Dashboard Cases', summary: 'Real data to work through: the numbers, the chart and the story.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'data',
      B,
      choice(
        'm-tab-d-b1',
        'Extract or Live',
        'A dashboard runs on a slow database whose data changes once a day. Which connection suits it?',
        ['An extract, refreshed daily after the data changes', 'A live connection', 'A copy pasted into a sheet', 'A new extract made by hand each week'],
        0
      )
    ),
    ...tagged(
      'data',
      J,
      choice(
        'm-tab-d-j1',
        'Inflated Sales',
        'You join Orders (one row per order line) to Targets (one row per region per month) and total sales jump. Why, and what’s the fix?',
        [
          'The tables are at different grains, so the join repeats rows; use a relationship instead, or aggregate before joining',
          'Tableau double-counts all joins; never join',
          'Targets has a typo',
          'Sales should be a dimension',
        ],
        0
      )
    ),
    ...tagged(
      'data',
      P,
      choice(
        'm-tab-d-p1',
        'Test Orders Everywhere',
        'Test orders must be excluded from every workbook built on the company’s published sales data source. Where does the filter go?',
        ['A data source filter on the published data source', 'A quick filter on each sheet', 'A context filter on each dashboard', 'Ask authors to remember'],
        0
      )
    ),
    ...tagged(
      'data',
      S,
      choice(
        'm-tab-d-s1',
        'Their Region Only',
        'Every sales manager must see only their own region, in every workbook on one published data source. How?',
        [
          'Row-level security in the data source: an entitlement table of user and region, joined in, with a USERNAME() check as a data source filter',
          'A separate workbook per region',
          'Hide the region filter on each dashboard',
          'Trust managers to pick their own region',
        ],
        0
      )
    ),
    ...tagged(
      'calcs',
      B,
      choice(
        'm-tab-c-b1',
        'What It Does',
        'What does this calculated field do?\n\nIF [Sales] > 1000 THEN "Large" ELSE "Small" END',
        ['Labels each row Large or Small depending on its sales', 'Filters out sales under 1,000', 'Sums sales over 1,000', 'Sorts sales'],
        0
      )
    ),
    ...tagged(
      'calcs',
      J,
      choice(
        'm-tab-c-j1',
        'Profit Ratio',
        'Which calculated field gives the right profit ratio at any level, e.g. by region?',
        ['SUM([Profit]) / SUM([Sales])', '[Profit] / [Sales], then summed', 'AVG([Profit] / [Sales])', 'SUM([Profit] / [Sales])'],
        0
      )
    ),
    ...tagged(
      'calcs',
      P,
      choice(
        'm-tab-c-p1',
        'Resetting Every Year',
        'You want a running total of sales by month that starts again each year. How?',
        [
          'RUNNING_SUM(SUM([Sales])), computed along Month and restarting every Year',
          'RUNNING_SUM(SUM([Sales])) computed along the whole table',
          'A FIXED LOD on month',
          'WINDOW_AVG(SUM([Sales]))',
        ],
        0
      )
    ),
    ...tagged(
      'calcs',
      S,
      choice(
        'm-tab-c-s1',
        'Cohort Year',
        'To build customer cohorts, each customer needs the year of their first order, on every one of their rows, whatever the view. Which expression?',
        ['{FIXED [Customer ID] : MIN(YEAR([Order Date]))}', 'MIN(YEAR([Order Date]))', '{INCLUDE [Order Date] : MIN([Customer ID])}', 'FIRST()'],
        0
      )
    ),
    ...tagged(
      'charts',
      B,
      choice(
        'm-tab-ch-b1',
        'Twelve Categories',
        'Which chart best compares sales across 12 product categories?',
        ['A bar chart sorted by sales', 'A pie chart', 'A line chart', 'A map'],
        0
      )
    ),
    ...tagged(
      'charts',
      J,
      choice(
        'm-tab-ch-j1',
        'Making One Stand Out',
        'You want readers to notice the two regions below target. How should you use colour?',
        ['One strong colour for those two, grey for the rest', 'A different bright colour for every region', 'A rainbow scale', 'Colour by region name'],
        0
      )
    ),
    ...tagged(
      'charts',
      P,
      choice(
        'm-tab-ch-p1',
        'Is Any Region Declining?',
        'Leadership asks whether any of five regions is in decline over the last two years. Which chart?',
        [
          'A line per region (or small multiples), since a stacked area chart hides individual declines',
          'A stacked area chart',
          'A pie chart for each year',
          'One bar for the total',
        ],
        0
      )
    ),
    ...tagged(
      'charts',
      S,
      choice(
        'm-tab-ch-s1',
        'A Dramatic Difference',
        'A bar chart’s axis starts at 95%, making a 2-point difference in on-time delivery look huge. What do you do?',
        [
          'Start bars at zero; if the small difference matters, use a dot plot or show the change directly with context',
          'Keep it; it makes the point',
          'Use 3D bars',
          'Remove the axis labels',
        ],
        0
      )
    ),
    ...tagged(
      'dash',
      B,
      choice(
        'm-tab-db-b1',
        'Filter Actions',
        'What does a filter action on a dashboard do?',
        ['Clicking a mark in one sheet filters the other sheets', 'Deletes data from the source', 'Exports the view to Excel', 'Changes the colours'],
        0
      )
    ),
    ...tagged(
      'dash',
      J,
      choice(
        'm-tab-db-j1',
        'Pick the Measure',
        'Users want one chart that can show Sales, Profit or Quantity, chosen from a list. How?',
        ['A parameter listing the three, and a calculated field that returns the chosen measure', 'Three charts stacked', 'A quick filter on Measure Names only', 'A separate dashboard per measure'],
        0
      )
    ),
    ...tagged(
      'dash',
      P,
      choice(
        'm-tab-db-p1',
        'Slow Filters',
        'A dashboard has nine quick filters set to “only relevant values” and takes 20 seconds to respond. What helps most?',
        [
          'Fewer quick filters, “all values in database” where possible, action filters instead, and an extract',
          'More quick filters so users narrow the data faster',
          'A bigger screen',
          'Turning off the cache',
        ],
        0
      )
    ),
    ...tagged(
      'dash',
      S,
      choice(
        'm-tab-db-s1',
        'Exported to Excel',
        'Executives keep exporting your dashboard to Excel to do their own analysis. What does that tell you, and what do you do?',
        [
          'The dashboard isn’t answering their questions; find out what they do in Excel and redesign around those decisions',
          'Disable exporting',
          'Add more charts to the dashboard',
          'Send them a Tableau training course',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-tab-x-b1', 'Profit Ratio', 'SUM(Sales) is 200 and SUM(Profit) is 30.\n\nWhat is the profit ratio, as a %?', ['15%', '15', '0.15', '15 percent'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-tab-x-j',
        'Harbour Stationery: Regions',
        `Region   Sales      Profit     Orders
North    £120,000   £18,000    1,500
South    £90,000    −£4,500    1,200
East     £150,000   £30,000    1,600
West     £60,000    £6,000     700`,
        'Regional summary'
      ),
      short(
        'm-tab-x-j1',
        'Overall Profit Ratio',
        'What is the overall profit ratio, as a %? (One decimal place.)',
        ['11.8%', '11.8', '11.79', '11.79%'],
        { taskId: 'm-tab-x-j' }
      ),
      choice(
        'm-tab-x-j2',
        'Why 10%?',
        'A colleague’s dashboard averages the four regions’ profit ratios and shows 10%. Why is it different?',
        [
          'Averaging ratios gives small regions the same say as big ones; the overall ratio is SUM(Profit) / SUM(Sales)',
          'Tableau rounds ratios',
          'South’s loss should be excluded',
          'The colleague is right and the overall figure is wrong',
        ],
        0,
        { taskId: 'm-tab-x-j' }
      ),
      short('m-tab-x-j3', 'South Order Value', 'What is South’s average order value, in £?', ['75', '£75'], { taskId: 'm-tab-x-j' }),
      choice(
        'm-tab-x-j4',
        'Showing the Loss',
        'Which chart shows best that South loses money?',
        ['A bar chart of profit by region, sorted, with the negative bar in its own colour', 'A pie chart of profit', 'A line chart of sales', 'A map coloured by sales'],
        0,
        { taskId: 'm-tab-x-j' }
      ),
      written(
        'm-tab-x-j5',
        'For the Sales Director',
        'What would you put on the sales director’s dashboard, and what would you look into about South?',
        [
          'Headline sales, profit and profit ratio (about 11.8% overall), by region',
          'Makes South’s loss obvious, e.g. profit or profit ratio by region with the negative highlighted',
          'Notes South has the lowest order value (£75 vs £80 to £94 elsewhere)',
          'Investigates South’s causes, e.g. discounts, product mix, shipping costs, by drilling into category, customer or order level',
        ],
        `Up top: sales, profit and profit ratio, overall (11.8%) and by region, with South's −5% in red. Below, profit ratio by region and by month so the director can see whether South's loss is new. South also has the smallest orders (£75 against £80 to £94 elsewhere), so small orders may be eating the margin through delivery costs or discounts. I'd add profit by category and by discount band, with an action filter from the region chart, so the director can click South and see where the money goes.`,
        { taskId: 'm-tab-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-tab-x-p',
        'Customer Cohorts',
        `Orders:
Customer  Year  Sales
C1        2023  £100
C1        2024  £150
C2        2024  £80
C3        2023  £60
C3        2025  £90
C4        2025  £40`,
        'Order extract'
      ),
      short('m-tab-x-p1', '2023 Cohort', 'How many customers are in the 2023 cohort (first order in 2023)?', ['2'], { taskId: 'm-tab-x-p' }),
      short('m-tab-x-p2', 'Cohort Sales', 'How much did the 2023 cohort spend in 2024, in £?', ['150', '£150'], { taskId: 'm-tab-x-p' }),
      written(
        'm-tab-x-p3',
        'A Retention Chart',
        'How would you build a chart showing how each cohort keeps buying over the years?',
        [
          'A FIXED LOD for each customer’s first-order year as the cohort',
          'Years since first order (order year minus cohort year) for the columns',
          'Count of distinct customers, or sales, per cohort and year',
          'Shows retention as a % of the cohort’s starting size, e.g. with a table calculation, as a heatmap or lines',
        ],
        `Cohort = {FIXED [Customer ID] : MIN(YEAR([Order Date]))}. Then Years Since First = YEAR([Order Date]) − [Cohort]. Put Cohort on rows and Years Since First on columns, with COUNTD([Customer ID]) as the measure, and turn it into a percentage of the year-0 count with a table calculation (each value divided by the first in its row). Coloured as a heatmap, it shows at a glance which cohorts stick around.`,
        { taskId: 'm-tab-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-tab-x-s',
        'The Executive Dashboard',
        `The executive dashboard has 14 sheets, 9 quick filters and a map plotting 2 million order points. It takes 25 seconds to load.

Revenue on it differs from finance's by 4%: targets come from a blended spreadsheet linked on Region, while revenue is shown by Region and Product.

Usage logs: 60 people opened it last quarter; 4 used anything beyond the top row of KPIs.`,
        'Dashboard review'
      ),
      multi(
        'm-tab-x-s1',
        'What to Fix',
        'Which changes would you make? Tick all that apply.',
        [
          'Aggregate the map to postcode or region rather than 2 million points',
          'Cut the sheets and filters down to what people use',
          'Reconcile revenue with finance and fix the data source before redesigning',
          'Add more sheets so everyone finds something',
          'Hide the 4% difference with a note',
        ],
        [0, 1, 2],
        { taskId: 'm-tab-x-s' }
      ),
      written(
        'm-tab-x-s2',
        'Your Plan',
        'Set out how you’d rebuild it and how you’d know it worked.',
        [
          'Fixes trust first: reconcile revenue with finance and correct the source (e.g. relationships instead of a blend at the wrong level)',
          'Uses the usage logs: build around the top-row KPIs most people use, with detail on demand',
          'Performance: aggregated map, fewer sheets and filters, extracts',
          'Talks to executives about the decisions they make with it',
          'Measures success, e.g. load time, matching finance, and usage after launch',
        ],
        `Numbers first: a 4% gap with finance means nobody should trust it, so I'd reconcile with finance and replace the blend with a proper relationship at the right level. Then design for how it's used: 56 of 60 people only read the top KPIs, so I'd make a one-screen summary of those KPIs against target, with trends, and move the detail to a second page reached by clicking. The map becomes regions or postcodes, not 2 million points, and the nine filters become two or three. I'd check the plan with three executives first, then judge it on load time under 5 seconds, revenue matching finance, and more people using it next quarter.`,
        { taskId: 'm-tab-x-s' }
      )
    ),
  ],
};

// ---------- Python ----------
export const PYTHON_MODULE: ModuleSkeleton = {
  familyId: 'test-py-01',
  aspects: [
    { id: 'basics', name: 'Python Basics', summary: 'Lists, dictionaries, loops and functions.' },
    { id: 'select', name: 'Loading & Selecting', summary: 'Reading data into pandas, and picking out the rows and columns you need.' },
    { id: 'clean', name: 'Cleaning & Merging', summary: 'Missing values, types, merges and data too big for memory.' },
    { id: 'group', name: 'Grouping & Aggregating', summary: 'groupby, aggregations and per-group calculations.' },
    { id: 'case', name: 'Analysis Code', summary: 'Real data and real code: work out what it returns and what’s wrong.' },
  ],
  tags: {},
  bank: [
    ...tagged('basics', B, short('m-py-b-b1', 'Lists', 'What does this print?\n\nnums = [4, 8, 15]\nprint(len(nums) + nums[-1])', ['18'])),
    ...tagged(
      'basics',
      J,
      choice(
        'm-py-b-j1',
        'A Missing Key',
        'What does this return?\n\nprices = {"tea": 2.5}\nprices.get("coffee", 0)',
        ['0', 'None', 'A KeyError', '2.5'],
        0
      )
    ),
    ...tagged(
      'basics',
      P,
      choice(
        'm-py-b-p1',
        'A Comprehension',
        'What is the result?\n\n[x * 2 for x in range(5) if x % 2 == 0]',
        ['[0, 4, 8]', '[2, 6]', '[0, 2, 4, 6, 8]', '[4, 8]'],
        0
      )
    ),
    ...tagged(
      'basics',
      S,
      choice(
        'm-py-b-s1',
        'A Shared Default',
        'What does this print, and why?\n\ndef add(item, basket=[]):\n    basket.append(item)\n    return basket\n\nadd("a")\nprint(add("b"))',
        [
          '[\'a\', \'b\']: the default list is created once and shared between calls; use basket=None and create the list inside',
          '[\'b\']: each call gets a new list',
          'An error: lists can’t be defaults',
          '[\'a\']',
        ],
        0
      )
    ),
    ...tagged(
      'select',
      B,
      choice(
        'm-py-s-b1',
        'A First Look',
        'After df = pd.read_csv("sales.csv"), which shows the first five rows?',
        ['df.head()', 'df.first()', 'df.top(5)', 'print(df[5])'],
        0
      )
    ),
    ...tagged(
      'select',
      J,
      choice(
        'm-py-s-j1',
        'Two Conditions',
        'Which selects rows where region is "North" and sales are over 1,000?',
        [
          'df[(df["region"] == "North") & (df["sales"] > 1000)]',
          'df[df["region"] == "North" and df["sales"] > 1000]',
          'df[df["region"] == "North" & df["sales"] > 1000]',
          'df.where("region" == "North", "sales" > 1000)',
        ],
        0
      )
    ),
    ...tagged(
      'select',
      P,
      choice(
        'm-py-s-p1',
        'loc or iloc',
        'df = df.sort_values("sales", ascending=False), without resetting the index. What does df.iloc[0] return?',
        ['The row with the highest sales', 'The row whose index label is 0', 'The first row of the original file', 'An error'],
        0
      )
    ),
    ...tagged(
      'select',
      S,
      choice(
        'm-py-s-s1',
        'A Warning',
        'This raises SettingWithCopyWarning, and the bonus sometimes doesn’t appear in df:\n\nnorth = df[df["region"] == "North"]\nnorth["bonus"] = north["sales"] * 0.1\n\nWhat’s the right fix?',
        [
          'Be explicit: use df.loc[mask, "bonus"] = ... to change df, or north = df[mask].copy() for a separate table',
          'Silence the warning',
          'Use df.iloc instead of a filter',
          'Rename the column',
        ],
        0
      )
    ),
    ...tagged(
      'clean',
      B,
      choice('m-py-c-b1', 'Missing Ages', 'Which counts the missing values in the age column?', ['df["age"].isna().sum()', 'df["age"].count()', 'len(df["age"])', 'df["age"].sum()'], 0)
    ),
    ...tagged(
      'clean',
      J,
      choice(
        'm-py-c-j1',
        'Revenue as Text',
        'The revenue column loaded as text because values look like "£1,200". Which converts it to numbers?',
        [
          'df["revenue"].str.replace("£", "").str.replace(",", "").astype(float)',
          'df["revenue"].astype(float)',
          'int(df["revenue"])',
          'df["revenue"].sum()',
        ],
        0
      )
    ),
    ...tagged(
      'clean',
      P,
      choice(
        'm-py-c-p1',
        'More Rows Than Orders',
        'orders has 1,000 rows. After orders.merge(customers, on="customer_id", how="left") there are 1,040. Why, and how do you guard against it?',
        [
          'Some customer_ids appear more than once in customers; check customers.customer_id.duplicated() and use validate="many_to_one"',
          'A left merge always adds rows',
          'Orders without a customer are duplicated',
          'pandas rounds row counts',
        ],
        0
      )
    ),
    ...tagged(
      'clean',
      S,
      choice(
        'm-py-c-s1',
        'Too Big for Memory',
        'A 50-million-row CSV won’t fit in memory, and you only need monthly totals by region. What’s best?',
        [
          'Load only the needed columns with tight dtypes and aggregate in chunks, or push the aggregation to the database',
          'Buy a laptop with more RAM',
          'Open it in Excel first',
          'Delete half the rows at random',
        ],
        0
      )
    ),
    ...tagged('group', B, short('m-py-g-b1', 'The Mean', 'df["sales"] holds 10, 20, 30 and 40.\n\nWhat does df["sales"].mean() return?', ['25', '25.0'])),
    ...tagged(
      'group',
      J,
      choice(
        'm-py-g-j1',
        'Totals by Region',
        'Which gives total sales for each region?',
        ['df.groupby("region")["sales"].sum()', 'df["sales"].sum("region")', 'df.sum(by="region")', 'df.pivot("region")'],
        0
      )
    ),
    ...tagged(
      'group',
      P,
      short(
        'm-py-g-p1',
        'Average Order Value',
        'region  order_id  sales\nNorth   1         100\nNorth   1         50\nNorth   2         70\nSouth   3         200\nSouth   4         30\n\ns = df.groupby("region").agg(orders=("order_id", "nunique"), sales=("sales", "sum"))\n\nWhat is North’s sales divided by its orders?',
        ['110', '110.0']
      )
    ),
    ...tagged(
      'group',
      S,
      choice(
        'm-py-g-s1',
        'Share of the Region',
        'Which adds a column with each row’s share of its region’s total sales, keeping every row?',
        [
          'df["share"] = df["sales"] / df.groupby("region")["sales"].transform("sum")',
          'df["share"] = df["sales"] / df.groupby("region")["sales"].sum()',
          'df["share"] = df.groupby("region")["sales"].mean()',
          'df["share"] = df["sales"] / df["sales"].sum()',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-py-x-b1', 'Shape', 'df.shape returns (500, 8).\n\nHow many rows does df have?', ['500'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-py-x-j',
        'Café Orders',
        `orders.csv

order_id,date,store,item,qty,price
1,2025-03-01,Leeds,Latte,2,3.20
2,2025-03-01,York,Tea,1,2.10
3,2025-03-02,Leeds,Cake,1,3.50
4,2025-03-02,Leeds,Latte,1,3.20
5,2025-03-02,York,Latte,3,3.20
6,2025-03-03,York,,1,2.10

df = pd.read_csv("orders.csv")
df["revenue"] = df["qty"] * df["price"]`,
        'Data and code'
      ),
      short(
        'm-py-x-j1',
        'Leeds Revenue',
        'What does df.groupby("store")["revenue"].sum()["Leeds"] return?',
        ['13.1', '13.10'],
        { taskId: 'm-py-x-j' }
      ),
      short('m-py-x-j2', 'Missing Items', 'What does df["item"].isna().sum() return?', ['1'], { taskId: 'm-py-x-j' }),
      short('m-py-x-j3', 'Lattes', 'What does df[df["item"] == "Latte"]["qty"].sum() return?', ['6'], { taskId: 'm-py-x-j' }),
      choice(
        'm-py-x-j4',
        'Best Seller',
        'Which gives the item with the most revenue?',
        ['df.groupby("item")["revenue"].sum().idxmax()', 'df["item"].max()', 'df["revenue"].idxmax()', 'df.groupby("item").count().max()'],
        0,
        { taskId: 'm-py-x-j' }
      ),
      written(
        'm-py-x-j5',
        'Which Store Is Doing Better?',
        'The owner asks which store is doing better. What do you tell them, and what would you check?',
        [
          'York took slightly more (£13.80 vs £13.10), from the same number of orders (3 each)',
          'Three days of data is far too little to call it',
          'Flags the order with a missing item and how it was handled',
          'Suggests better comparisons, e.g. per day, average order value, over several weeks, allowing for store size or opening hours',
        ],
        `On these numbers York is slightly ahead, £13.80 against £13.10, from three orders each. But that's three days and six orders, far too few to call. One York order also has no item recorded, which needs checking. I'd pull at least a month, compare revenue per day and average order value, and allow for any difference in opening hours or size before saying either store is doing better.`,
        { taskId: 'm-py-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-py-x-p',
        'March Churn',
        `subs.csv has one row per subscription: start and end dates. end is empty for subscriptions still running.

subs = pd.read_csv("subs.csv", parse_dates=["start", "end"])
churned = subs[subs["end"].dt.month == 3]
churn_rate = len(churned) / len(subs)

Facts about the data:
• 1,000 subscriptions in total; 600 are still running
• 800 were active on 1 March 2025
• 50 of those 800 ended in March 2025
• 30 other subscriptions ended in March 2024`,
        'Notebook'
      ),
      short('m-py-x-p1', 'What It Says', 'What churn rate does the code give, as a %?', ['8%', '8', '0.08', '8 percent'], { taskId: 'm-py-x-p' }),
      short('m-py-x-p2', 'The Real Rate', 'What was the real churn rate for March 2025, as a %? (Two decimal places.)', ['6.25%', '6.25', '0.0625'], { taskId: 'm-py-x-p' }),
      multi(
        'm-py-x-p3',
        'The Bugs',
        'What’s wrong with the code? Tick all that apply.',
        [
          'dt.month == 3 picks March in every year, not just 2025',
          'The denominator is every subscription ever, not those active at the start of March',
          'parse_dates can’t read dates from a CSV',
          'len() counts columns, not rows',
        ],
        [0, 1],
        { taskId: 'm-py-x-p' }
      ),
      written(
        'm-py-x-p4',
        'Fix It',
        'Write the corrected code (or describe it precisely).',
        [
          'Defines the base as subscriptions active on 1 March 2025: started before then, and end empty or on/after 1 March',
          'Handles the missing end dates (NaT) explicitly, e.g. with isna()',
          'Counts churn as those in the base whose end falls in March 2025',
          'Divides churned by the base',
        ],
        `start, stop = pd.Timestamp("2025-03-01"), pd.Timestamp("2025-03-31")
active = subs[(subs["start"] < start) & (subs["end"].isna() | (subs["end"] >= start))]
churned = active[active["end"].between(start, stop)]
churn_rate = len(churned) / len(active)   # 50 / 800 = 6.25%`,
        { taskId: 'm-py-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-py-x-s',
        'Reviewing the Nightly Report',
        `A colleague's nightly report, which leadership reads every morning:

df = pd.read_csv("C:/Users/amy/Desktop/sales_final_v3.csv")
df = df.dropna()
out = []
for i, row in df.iterrows():
    if row["country"] == "UK":
        out.append(row["amount"] * 1.2)
    else:
        out.append(row["amount"])
df["gross"] = out
df = df.merge(fx, on="currency")
report = df.groupby("country")["gross"].sum()

What you find:
• 5 million rows; it takes 40 minutes
• dropna() removes 18% of rows, mostly for a missing promo_code the report never uses
• fx has two rows for EUR, an old rate and a new one`,
        'Code review'
      ),
      choice(
        'm-py-x-s1',
        'Faster',
        'What replaces the loop?',
        [
          'df["gross"] = np.where(df["country"] == "UK", df["amount"] * 1.2, df["amount"])',
          'A while loop',
          'df.apply(lambda row: ..., axis=1) on every row',
          'Running it on a faster laptop',
        ],
        0,
        { taskId: 'm-py-x-s' }
      ),
      multi(
        'm-py-x-s2',
        'Wrong Numbers',
        'Which of these make the report’s numbers wrong, not just slow or fragile? Tick all that apply.',
        ['dropna() throwing away rows over an unused column', 'The duplicate EUR rate doubling every EUR row', 'The iterrows loop', 'The hard-coded file path'],
        [0, 1],
        { taskId: 'm-py-x-s' }
      ),
      short(
        'm-py-x-s3',
        'EUR After the Merge',
        'EUR rows total €2m gross before the merge. What does the report show for them after it, in €?',
        ['4000000', '4m', '4 million', '4,000,000'],
        { taskId: 'm-py-x-s' }
      ),
      written(
        'm-py-x-s4',
        'Your Review',
        'Write your review for your colleague, most important first.',
        [
          'Leads with the wrong numbers: the EUR duplication and the over-broad dropna, and that past reports need correcting',
          'Fixes: dedupe fx to one current rate and merge with validate="many_to_one"; drop missing values only in the columns used',
          'Speed: replace iterrows with a vectorised np.where',
          'Reliability: no personal desktop path, checks such as row counts and totals, and logging',
          'Constructive tone, e.g. offers to pair on it',
        ],
        `Most important: the numbers are wrong. fx has two EUR rates, so the merge doubles every EUR row, and dropna() throws away 18% of sales over promo_code, which the report doesn't use. Leadership has been reading inflated EUR and understated everything else, so we should tell them and correct recent reports. Fixes: keep one current rate per currency and merge with validate="many_to_one"; use dropna(subset=["amount", "country", "currency"]). Then speed: replace the loop with np.where, which should take seconds, not 40 minutes. Finally, move the file off your desktop into a shared location, and add checks that row counts and totals match the source before the report goes out. Happy to pair on it tomorrow.`,
        { taskId: 'm-py-x-s' }
      )
    ),
  ],
};

export const ANALYST_TOOL_MODULES = [POWER_BI_MODULE, TABLEAU_MODULE, PYTHON_MODULE];
