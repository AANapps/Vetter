import { AssessmentTest } from '../../types';
import { caseStudy, choice, match, multi, order, short, written } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';
import { roleMain } from './roleKit';

// Data importing for analysts, and the data scientist's fundamentals (feature engineering, modelling, model evaluation)
// with a churn project. Python, pandas, statistics and A/B testing already have tests; they're tagged for data
// scientists in roleTracks.ts rather than written again.

export const DATA_SCIENCE_TESTS: AssessmentTest[] = [
  roleMain(
    'test-import-01',
    'Data Importing: Files, Formats & Sources',
    'Data Analysis',
    'Get messy files and sources in without losing or corrupting a row: delimiters, header junk, dates, encodings and decimal commas, then fix an AI-written import script and reconcile monthly loads.',
    ['Data Importing', 'Power Query', 'pandas', 'Data Validation'],
    ['Data Analyst', 'Business Analyst', 'Data Engineer']
  ),
  roleMain(
    'test-feat-01',
    'Feature Engineering for Machine Learning',
    'Data Science',
    'Encode and scale, build features from raw customer data and catch leakage, then fix an AI-written feature pipeline and diagnose a model that’s too good to be true.',
    ['Feature Engineering', 'pandas', 'Data Leakage', 'scikit-learn'],
    ['Data Scientist']
  ),
  roleMain(
    'test-ml-01',
    'Machine Learning Modelling',
    'Data Science',
    'Choose the right model, train and tune it honestly and spot overfitting, then pick a model from an experiment log, fix AI-written training code and choose by business value.',
    ['Machine Learning', 'scikit-learn', 'Model Selection', 'Cross-validation'],
    ['Data Scientist']
  ),
  roleMain(
    'test-eval-01',
    'Model Evaluation & Metrics',
    'Data Science',
    'Precision, recall, error measures, thresholds and fairness, then correct an AI-written evaluation report and judge whether a lending model treats groups fairly.',
    ['Model Evaluation', 'Precision & Recall', 'Fairness', 'Forecast Error'],
    ['Data Scientist']
  ),
  roleMain(
    'test-sim-ds-01',
    'Data Scientist Project: Subscription Churn',
    'Data Science',
    'A streaming service is losing subscribers. Build a churn model from a messy extract, explain its accuracy to the business, and catch the flawed conclusion in a retention-email A/B test.',
    ['Machine Learning', 'Model Evaluation', 'A/B Testing', 'Communicating Results'],
    ['Data Scientist'],
    'Professional'
  ),
];

// ---------- Data importing ----------
const SALES_CSV = `Sales export - generated 02/05/2026
Exported by: system

order_id;order_date;customer;region;amount
5001;01/04/2026;"Patel; R";North;1.250,00
5002;02/04/2026;Café Nova;South;980,50
5003;13/04/2026;Lee Ltd;north;2.100,00
5004;;Smith & Co;East;450,00
TOTAL;;;;4.780,50`;

export const IMPORT_MODULE: ModuleSkeleton = {
  familyId: 'test-import-01',
  aspects: [
    { id: 'files', name: 'Files & Delimiters', summary: 'Reading CSVs and exports as they really arrive: separators, quotes and junk rows.' },
    { id: 'types', name: 'Types, Dates & Encodings', summary: 'Keeping codes, dates, accents and decimals as they were meant.' },
    { id: 'sources', name: 'Sources & Refreshes', summary: 'Imports that repeat, refresh and tell you when they fail.' },
    { id: 'case', name: 'Import Cases', summary: 'Real files and loads: import them, check them, fix them.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'files',
      B,
      choice(
        'm-imp-f-b1',
        'All in Column A',
        'You open a CSV in Excel and every row sits in column A, like 5001;01/04/2026;Lee Ltd;North. What’s the fix?',
        [
          'Import it with Data › From Text/CSV and set the delimiter to semicolon',
          'Split each row by hand',
          'Save it as .xlsx and reopen it',
          'Ask for a PDF instead',
        ],
        0
      )
    ),
    ...tagged(
      'files',
      J,
      short('m-imp-f-j1', 'Counting Columns', 'A comma-separated row reads:\n\n1042,"Smith, John",London,250\n\nHow many columns does it have?', ['4', 'four'])
    ),
    ...tagged(
      'files',
      P,
      choice(
        'm-imp-f-p1',
        'Notes and Totals',
        'A supplier’s monthly file has three lines of notes above the column names and a TOTAL row at the bottom. How do you import it?',
        [
          'Skip the first three lines and promote the next to headers, and filter out the TOTAL row, as steps in the import so every month’s refresh repeats them',
          'Delete the lines by hand each month before importing',
          'Import as is; the totals help',
          'Ask the supplier to stop sending notes, and wait',
        ],
        0
      )
    ),
    ...tagged(
      'files',
      S,
      choice(
        'm-imp-f-s1',
        'Forty Branches',
        'Forty branches drop a monthly file into one folder. A few have started adding extra columns. How do you build the import?',
        [
          'A folder import that combines files by column name, with a check that flags missing or unexpected columns and the files they came from',
          'Combine by column position; it’s faster',
          'Copy and paste each file into one sheet',
          'Only import the files that look normal and ignore the rest',
        ],
        0
      )
    ),
    ...tagged(
      'types',
      B,
      choice(
        'm-imp-t-b1',
        'Lost Zeros',
        'Product codes like 00731 arrive as 731 after the import. Why, and what’s the fix?',
        ['The column was read as a number; set it to text in the import', 'The file is corrupt', 'Add the zeros back with a formula each time', 'Codes don’t need zeros'],
        0
      )
    ),
    ...tagged(
      'types',
      J,
      multi(
        'm-imp-t-j1',
        'Dates Read Wrong',
        'A UK file uses day/month/year. Which signs show its dates were read as US month/day? Tick all that apply.',
        [
          'Dates with a day above 12, like 13/04/2026, stayed as text',
          'Monthly totals show sales in months the shop was closed',
          'The date column is right-aligned',
          'The file has a header row',
        ],
        [0, 1]
      )
    ),
    ...tagged(
      'types',
      P,
      choice(
        'm-imp-t-p1',
        'Café Becomes CafÃ©',
        'Customer names like Café arrive as CafÃ©. What happened?',
        [
          'A UTF-8 file was read with the wrong encoding (like Windows-1252); re-import it as UTF-8',
          'The customer typed it wrong',
          'Excel doesn’t support accents',
          'The file needs a different delimiter',
        ],
        0
      )
    ),
    ...tagged(
      'types',
      S,
      choice(
        'm-imp-t-s1',
        'Decimal Commas',
        'A German system exports amounts like 1.234,50. How do you import them safely?',
        [
          'Set the column’s locale to German in the import so the comma is the decimal point, then check the imported total against the source',
          'Find and replace every comma with a full stop',
          'Delete the full stops and divide by 100',
          'Import as text and leave it',
        ],
        0
      )
    ),
    ...tagged(
      'sources',
      B,
      choice(
        'm-imp-s-b1',
        'Why Not Paste?',
        'Why import a weekly file through a query (Power Query or a script) instead of copying and pasting it?',
        [
          'The steps are recorded, so next week’s file loads the same way with one refresh',
          'Pasting is not allowed in Excel',
          'Queries make the file smaller',
          'There’s no difference',
        ],
        0
      )
    ),
    ...tagged(
      'sources',
      J,
      order('m-imp-s-j1', 'A Reliable Import', 'Put the steps of a reliable import in order.', [
        'Get the file or extract from the source',
        'Check the row count and columns against what the source says',
        'Set each column’s type (text, date, number)',
        'Clean and transform',
        'Load it',
        'Reconcile totals with the source',
      ])
    ),
    ...tagged(
      'sources',
      P,
      choice(
        'm-imp-s-p1',
        'A Silent Failure',
        'Last night’s refresh failed without an error, and this morning’s dashboard quietly shows yesterday’s data. What’s the fix?',
        [
          'Show a last-refreshed time on the dashboard, and alert someone when a refresh fails or the data is older than expected',
          'Refresh it by hand every morning',
          'Tell users to check the dates themselves',
          'Nothing; it will refresh tonight',
        ],
        0
      )
    ),
    ...tagged(
      'sources',
      S,
      choice(
        'm-imp-s-s1',
        'Five Million Rows an Hour',
        'A team pulls all 5 million order rows from the live production database into Excel every hour. What do you advise?',
        [
          'Load only new and changed rows into a warehouse from a replica, not the live database, and point Excel at a summarised table',
          'Pull every 30 minutes instead',
          'Buy faster laptops',
          'Split the pull across five spreadsheets',
        ],
        0
      )
    ),
    ...tagged(
      'case',
      B,
      short(
        'm-imp-c-b1',
        'Data Rows',
        'A file has 1,250 lines: one header row, the data, and one TOTAL row at the bottom. How many rows of data are there?',
        ['1248', '1,248']
      )
    ),
    ...tagged(
      'case',
      J,
      caseStudy('m-imp-c-j', 'The Sales Export', SALES_CSV, 'sales.csv'),
      short('m-imp-c-j1', 'Order Rows', 'Imported correctly, how many order rows does this file have?', ['4', 'four'], { taskId: 'm-imp-c-j' }),
      short(
        'm-imp-c-j2',
        'The Real Total',
        'What is the total of the amount column, as a number with a decimal point?',
        ['4780.50', '4780.5', '4,780.50', '4,780.5', '£4,780.50', '£4780.50'],
        { taskId: 'm-imp-c-j' }
      ),
      multi(
        'm-imp-c-j3',
        'Import Settings',
        'Which settings does this file need? Tick all that apply.',
        [
          'Skip the first three lines',
          'Semicolon as the delimiter, respecting the quotes around "Patel; R"',
          'Comma as the decimal separator and full stop for thousands',
          'Dates read as day/month/year',
          'Remove the TOTAL row',
          'Read the amount column as text and leave it that way',
        ],
        [0, 1, 2, 3, 4],
        { taskId: 'm-imp-c-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-imp-c-p',
        'An AI-Written Import',
        `You asked an AI assistant to load sales.csv (below) in pandas and total it. It wrote:

import pandas as pd
df = pd.read_csv("sales.csv")
df["order_date"] = pd.to_datetime(df["order_date"])
df["amount"] = df["amount"].astype(float)
print(df["amount"].sum())

The file:
${SALES_CSV}`,
        'AI assistant’s answer'
      ),
      multi(
        'm-imp-c-p1',
        'What’s Wrong',
        'Which are real problems with the AI’s script? Tick all that apply.',
        [
          'It doesn’t set sep=";", so every row lands in one column',
          'It doesn’t skip the three lines above the header',
          'It doesn’t set dayfirst=True, so 01/04/2026 becomes 4 January',
          'astype(float) can’t read 1.250,00; it needs decimal="," and thousands="."',
          'The TOTAL row is included, so the sum doubles',
          'pandas can’t read CSV files',
        ],
        [0, 1, 2, 3, 4],
        { taskId: 'm-imp-c-p' }
      ),
      written(
        'm-imp-c-p2',
        'Fix It',
        'Write the corrected import (code or clear steps), and the checks you’d run before trusting the total.',
        [
          'Reads with sep=";", skiprows=3, decimal="," and thousands="." (or equivalent settings)',
          'Parses dates day-first and handles the blank date (keeps the row, flags it) rather than failing',
          'Drops the TOTAL row (e.g. filters order_id to numbers) before summing',
          'Checks: row count of 4, the total of 4,780.50 against the file’s own TOTAL, and looks at the region values (north vs North)',
        ],
        `df = pd.read_csv("sales.csv", sep=";", skiprows=3, decimal=",", thousands=".", dtype={"order_id": str}, encoding="utf-8")
df = df[df["order_id"] != "TOTAL"]
df["order_date"] = pd.to_datetime(df["order_date"], dayfirst=True, errors="coerce")  # 5004 has no date: keep it, flag it
df["region"] = df["region"].str.strip().str.title()

Checks: 4 rows; sum of amount is 4,780.50, matching the file's own TOTAL line; one blank date to chase with whoever owns the export; "north" and "North" now one region.`,
        { taskId: 'm-imp-c-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-imp-c-s',
        'Monthly Loads',
        `Each month's orders are loaded from the source system into the warehouse. The load log:

Month   Source rows   Source total   Loaded rows   Loaded total
Jan     10,400        £512,300       10,400        £512,300
Feb      9,850        £498,100        9,850        £49,810,000
Mar     11,200        £560,000       10,950        £547,500

Finance reports from the warehouse on the 5th of each month.`,
        'Load log'
      ),
      short('m-imp-c-s1', 'Missing Rows', 'How many March rows didn’t load?', ['250'], { taskId: 'm-imp-c-s' }),
      choice(
        'm-imp-c-s2',
        'February',
        'February’s rows all loaded but its total is exactly 100 times too big. What’s the most likely cause?',
        [
          'Amounts with decimal commas (1.250,00) were read with the wrong locale, so the separators were dropped and 1,250.00 became 125,000',
          'February had a big sale',
          'Rows were loaded twice',
          'The source total is wrong',
        ],
        0,
        { taskId: 'm-imp-c-s' }
      ),
      written(
        'm-imp-c-s3',
        'Stopping It Next Time',
        'Finance has already reported February. What do you do now, and what checks would you build into every load?',
        [
          'Tells Finance at once that February’s figure is wrong, with the corrected total, before more decisions are made on it',
          'Fixes the locale or parsing for February and finds and reloads March’s 250 missing rows',
          'Automates a reconciliation of row counts and totals against the source after every load, failing or alerting when they differ',
          'Adds sanity checks such as a month-on-month change limit, and names an owner who gets the alerts',
        ],
        `First, tell Finance today: February is overstated 100 times because the decimal commas were misread; the real total is £498,100, and I'll send the corrected figure. Then fix the load: set the right locale for the amount column, reload February, and find the 250 March rows that didn't arrive (compare order IDs with the source). To stop it happening again, every load should reconcile its row count and total with the source and fail loudly if they differ, with a second check that flags any month whose total moves more than, say, 30% from the last. The alerts go to a named owner, and Finance only reports once the load shows green.`,
        { taskId: 'm-imp-c-s' }
      )
    ),
  ],
};

// ---------- Feature engineering ----------
const CUSTOMERS = `customer_id  signup_date  last_login   plan   monthly_spend  country         churned
C01          2025-01-14   2026-03-28   Pro    £45.00         UK              0
C02          2025-06-02   2026-01-05   basic  12             U.K.            1
C03          2025-11-20   2026-03-30   Plus   (blank)        France          0
C04          2024-09-09   2026-02-11   Pro    45             United Kingdom  1
C05          2025-03-15   2026-03-29   BASIC  £12.00         FR              0

Snapshot date: 2026-03-31. "churned" means the customer cancelled in the 30 days after it.`;

export const FEATURE_MODULE: ModuleSkeleton = {
  familyId: 'test-feat-01',
  aspects: [
    { id: 'encode', name: 'Encoding & Scaling', summary: 'Turning categories and skewed numbers into something a model can use.' },
    { id: 'create', name: 'Creating Features', summary: 'Building the signals that predict, from dates, events and history.' },
    { id: 'leak', name: 'Leakage & Validity', summary: 'Using only what you’d know at the moment of prediction.' },
    { id: 'case', name: 'Feature Cases', summary: 'Real customer data and pipelines: build, fix and diagnose.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'encode',
      B,
      choice(
        'm-fe-e-b1',
        'A City Column',
        'A column “city” has five values: London, Leeds, York, Bath, Hull. How do you give it to a linear model?',
        ['One-hot encode it: a 0/1 column per city', 'Number the cities 1 to 5', 'Drop it; models can’t use text', 'Sort it alphabetically'],
        0
      )
    ),
    ...tagged(
      'encode',
      J,
      choice(
        'm-fe-e-j1',
        'Which Needs Scaling?',
        'Income runs from £20,000 to £2,000,000 and age from 18 to 90. Which model is most thrown by leaving them unscaled?',
        ['k-nearest neighbours, because it measures distance and income would swamp age', 'A random forest', 'A decision tree', 'Gradient-boosted trees'],
        0
      )
    ),
    ...tagged(
      'encode',
      P,
      choice(
        'm-fe-e-p1',
        '40,000 Postcodes',
        'A postcode column has 40,000 distinct values. What’s a sound way to use it?',
        [
          'Group it (e.g. to postcode area) or target-encode it, computing the encoding inside each cross-validation fold so it doesn’t leak',
          'One-hot encode all 40,000',
          'Use the postcode as a number',
          'Target-encode it on the whole dataset before splitting',
        ],
        0
      )
    ),
    ...tagged(
      'encode',
      S,
      choice(
        'm-fe-e-s1',
        'A New Category Appears',
        'A month after launch, the live model starts receiving a plan type, “Family”, that didn’t exist in training. What should the pipeline do?',
        [
          'Map unseen values to an “other” bucket without failing, log and alert on how often it happens, and retrain once there’s data',
          'Crash so someone notices',
          'Treat Family as Pro',
          'Drop those customers from scoring silently',
        ],
        0
      )
    ),
    ...tagged(
      'create',
      B,
      multi(
        'm-fe-c-b1',
        'From a Timestamp',
        'You’re predicting late deliveries from the order timestamp. Which features could you build from it? Tick all that apply.',
        ['Hour of the day', 'Day of the week', 'Whether it’s a bank holiday', 'The order ID'],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'create',
      J,
      short(
        'm-fe-c-j1',
        'Days Since',
        'A customer’s last order was on 10 March 2026. What is “days since last order” as of 31 March 2026?',
        ['21', '21 days']
      )
    ),
    ...tagged(
      'create',
      P,
      multi(
        'm-fe-c-p1',
        'Churn Features',
        'You’re predicting whether a customer cancels next month. Which are good features? Tick all that apply.',
        [
          'Months since signup',
          'Support tickets in the last 30 days',
          'Change in usage from the previous month',
          'customer_id',
          'Cancellation reason',
        ],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'create',
      S,
      choice(
        'm-fe-c-s1',
        'Point in Time',
        'Training features are computed from today’s customer table and joined to churn labels from the last two years. What’s wrong?',
        [
          'Each row should use features as they were at its prediction date; today’s values include what happened after, so the model learns from the future',
          'Nothing; more recent data is better',
          'Two years is too little data',
          'Labels should come from today too',
        ],
        0
      )
    ),
    ...tagged(
      'leak',
      B,
      choice(
        'm-fe-l-b1',
        'What Is Leakage?',
        'What is data leakage in machine learning?',
        [
          'Training on information that wouldn’t be available when the prediction is made, so the model looks better than it is',
          'Data being stolen',
          'Missing values',
          'Using too many features',
        ],
        0
      )
    ),
    ...tagged(
      'leak',
      J,
      choice(
        'm-fe-l-j1',
        'Scaling Before Splitting',
        'A notebook fits a StandardScaler on the whole dataset and then splits into train and test. What should it do?',
        ['Split first, fit the scaler on the training set only, and apply it to the test set', 'Nothing; scaling can’t leak', 'Fit separate scalers on train and test', 'Skip scaling'],
        0
      )
    ),
    ...tagged(
      'leak',
      P,
      multi(
        'm-fe-l-p1',
        'Loan Default',
        'A model predicts default at the moment someone applies for a loan. Which features leak? Tick all that apply.',
        ['Missed payments in the first year', 'Passed to a collections agency', 'Income on the application', 'Loan amount requested'],
        [0, 1]
      )
    ),
    ...tagged(
      'leak',
      S,
      choice(
        'm-fe-l-s1',
        'The Same Customer Twice',
        'Each customer has 12 monthly rows. A random split puts some of a customer’s months in training and others in test. What do you change?',
        [
          'Split by customer (a group split), and by time if the model will predict future months',
          'Nothing; a random split is standard',
          'Use a bigger test set',
          'Shuffle twice',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-fe-x-b1', 'One-hot Columns', 'One-hot encoding a “plan” column with the values Basic, Plus and Pro (dropping none) makes how many columns?', ['3', 'three'])),
    ...tagged(
      'case',
      J,
      caseStudy('m-fe-x-j', 'Customer Extract', CUSTOMERS, 'customers extract'),
      short('m-fe-x-j1', 'Countries', 'Standardised, how many distinct countries are there?', ['2', 'two'], { taskId: 'm-fe-x-j' }),
      short('m-fe-x-j2', 'Days Since Login', 'What is days since last login for C02 at the snapshot date?', ['85', '85 days'], { taskId: 'm-fe-x-j' }),
      written(
        'm-fe-x-j3',
        'Clean and Build',
        'List the cleaning you’d do on this extract and the features you’d build for a churn model.',
        [
          'Cleans plan (one case), spend (strip £, make numeric) and country (one form per country)',
          'Handles the blank spend deliberately, e.g. impute from plan plus a missing flag, not a silent zero',
          'Builds date features such as tenure and days since last login as at the snapshot',
          'Keeps customer_id out of the features and uses only what was known at the snapshot',
        ],
        `Cleaning: plan to one case (Basic, Plus, Pro); monthly_spend stripped of £ and made numeric; country mapped to one value each (UK, France). C03's blank spend: fill from its plan's typical price and add a spend_missing flag rather than a zero. Features: tenure in days (snapshot minus signup), days since last login (C02 is 85, a strong warning sign), plan one-hot, spend, country. customer_id stays out: it's an identifier, not a signal. Everything is computed as at 31 March, so nothing after the snapshot leaks in.`,
        { taskId: 'm-fe-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-fe-x-p',
        'An AI-Written Pipeline',
        `An AI assistant wrote this feature pipeline for the churn model. days_to_cancel is filled in only for customers who cancelled.

df["spend"] = df["monthly_spend"].str.replace("£", "").astype(float)
df["spend"] = df["spend"].fillna(df["spend"].mean())
X = pd.get_dummies(df[["plan", "country", "spend", "days_to_cancel"]])
scaler = StandardScaler().fit(X)
X_train, X_test, y_train, y_test = train_test_split(scaler.transform(X), df["churned"])

The extract it ran on:
${CUSTOMERS}`,
        'AI assistant’s answer'
      ),
      multi(
        'm-fe-x-p1',
        'What’s Wrong',
        'Which are real problems with the AI’s pipeline? Tick all that apply.',
        [
          'days_to_cancel only exists for churners, so it gives the answer away',
          'plan isn’t standardised, so basic and BASIC become separate columns',
          'country isn’t standardised, so UK, U.K. and United Kingdom are three countries',
          'The mean fill and the scaler are fitted on all rows before the split, leaking test data',
          'get_dummies can’t take a numeric column',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-fe-x-p' }
      ),
      written(
        'm-fe-x-p2',
        'Fix It',
        'Describe (or write) the corrected pipeline.',
        [
          'Drops days_to_cancel (and anything else known only after the snapshot)',
          'Standardises plan and country before encoding',
          'Splits first, then fits imputation, encoding and scaling on the training set only (e.g. in a Pipeline)',
          'Stratifies the split on churned or uses a time-based split, and keeps a missing-spend flag',
        ],
        `Drop days_to_cancel: it only exists for people who already cancelled, so it is the label in disguise. Normalise plan to title case and map country variants to one value before encoding. Then split first (stratified on churned, or by time), and put the imputer, one-hot encoder and scaler in a scikit-learn Pipeline/ColumnTransformer fitted on the training rows only, so the test set never influences the mean or the scaling. Add a spend_missing flag alongside the imputed value.`,
        { taskId: 'm-fe-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-fe-x-s',
        'Too Good to Be True',
        `A churn model scored 0.99 AUC in validation. In its first month live it scored 0.62.

Top features by importance:
support_calls_after_cancel_request   0.41
days_since_last_login                0.22
tenure_months                        0.12
plan_Pro                             0.06
monthly_spend                        0.05

Training rows were built from the customer table as it stood when the model was trained.`,
        'Model report'
      ),
      choice(
        'm-fe-x-s1',
        'The Cause',
        'What’s the most likely reason for the drop?',
        [
          'Leakage: support calls after a cancel request only happen once someone is already leaving, and features came from a table that already knew the outcome',
          'The live data is just noisier',
          'AUC is the wrong metric',
          'The model needs more trees',
        ],
        0,
        { taskId: 'm-fe-x-s' }
      ),
      written(
        'm-fe-x-s2',
        'What You Do',
        'Write what you’d do next, and what you’d change so it can’t happen again.',
        [
          'Removes the leaking feature and rebuilds features point-in-time, as of each prediction date',
          'Re-validates on a time-based holdout that mirrors live use, and expects a lower but honest score',
          'Tells stakeholders the 0.99 was not real and what to expect now',
          'Adds a guard: feature review for post-outcome signals, and monitoring of live performance against validation',
        ],
        `The top feature is a leak: calls after a cancel request only exist once the customer has decided to go, and building features from today's table let more of the future in. I'd drop it, rebuild every feature as at each row's prediction date, and validate on a later time period, as the model is used live. The honest score will be lower; I'd tell the retention team now that the 0.99 wasn't real and give them the new number. To prevent a repeat: review every feature for "could we know this at prediction time?", use point-in-time joins, and monitor live AUC against validation so a gap shows within weeks.`,
        { taskId: 'm-fe-x-s' }
      )
    ),
  ],
};

// ---------- Modelling ----------
export const MODELLING_MODULE: ModuleSkeleton = {
  familyId: 'test-ml-01',
  aspects: [
    { id: 'choose', name: 'Choosing Models', summary: 'The right kind of model for the problem, the data and who has to trust it.' },
    { id: 'train', name: 'Training & Tuning', summary: 'Fitting and tuning without fooling yourself.' },
    { id: 'fit', name: 'Overfitting & Validation', summary: 'Knowing whether the model will work on data it hasn’t seen.' },
    { id: 'case', name: 'Modelling Cases', summary: 'Experiment logs, code and business cases: choose and fix.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'choose',
      B,
      match('m-ml-c-b1', 'The Kind of Problem', 'Match each task to the kind of model.', [
        ['Predict a house’s sale price', 'Regression'],
        ['Is this email spam or not?', 'Classification'],
        ['Group customers with no labels', 'Clustering'],
        ['Next month’s sales from past months', 'Time-series forecasting'],
      ])
    ),
    ...tagged(
      'choose',
      J,
      choice(
        'm-ml-c-j1',
        'A Strong Start',
        '5,000 rows of tabular data with numbers and categories. What’s a sensible first model?',
        [
          'A simple baseline (like logistic regression), then gradient-boosted trees',
          'A large neural network',
          'A language model',
          'Whatever has the most parameters',
        ],
        0
      )
    ),
    ...tagged(
      'choose',
      P,
      choice(
        'm-ml-c-p1',
        'Explaining to a Regulator',
        'A credit model must explain each declined application to the customer and the regulator. What do you choose?',
        [
          'An interpretable model (a scorecard or logistic regression), or boosted trees with monotonic constraints and per-decision explanations, documented and tested',
          'The most accurate black box, explained later',
          'A neural network, because it’s modern',
          'Random forest with no explanations; accuracy is what counts',
        ],
        0
      )
    ),
    ...tagged(
      'choose',
      S,
      choice(
        'm-ml-c-s1',
        'LLM or Classifier?',
        'You have 200,000 labelled support tickets in 8 categories and need to route 50,000 a day. What do you recommend?',
        [
          'Train a classifier (e.g. on text embeddings): cheap, fast and measurable at that volume; keep an LLM for the few tickets it’s unsure about',
          'Send every ticket to the largest LLM',
          'Write keyword rules by hand',
          'Wait for more labels',
        ],
        0
      )
    ),
    ...tagged(
      'train',
      B,
      choice(
        'm-ml-t-b1',
        'Why a Test Set?',
        'Why keep a test set the model never trains on?',
        ['To measure how it does on data it hasn’t seen', 'To make training faster', 'To have a backup of the data', 'Regulations require it'],
        0
      )
    ),
    ...tagged(
      'train',
      J,
      choice(
        'm-ml-t-j1',
        'Where to Tune',
        'Where should you tune hyperparameters?',
        ['With cross-validation on the training data, keeping the test set untouched until the end', 'On the test set', 'On all the data', 'You don’t need to tune'],
        0
      )
    ),
    ...tagged(
      'train',
      P,
      choice(
        'm-ml-t-p1',
        '2% Fraud',
        '2% of transactions are fraud. How do you train and judge a model?',
        [
          'Use class weights or resampling inside cross-validation, judge with precision and recall, and pick the threshold for the cost of each mistake',
          'Balance the whole dataset first, then split',
          'Judge it by accuracy',
          'Delete most of the normal transactions and test on what’s left',
        ],
        0
      )
    ),
    ...tagged(
      'train',
      S,
      choice(
        'm-ml-t-s1',
        '500 Configurations',
        'A colleague tried 500 configurations against one validation set; the best beats the rest by 0.3 points. What’s the risk?',
        [
          'They may have overfitted the validation set; confirm on an untouched test set or with nested cross-validation',
          'None; more tries is better',
          '0.3 points is always significant',
          'They should try 5,000',
        ],
        0
      )
    ),
    ...tagged(
      'fit',
      B,
      choice(
        'm-ml-f-b1',
        '99% and 70%',
        'A model scores 99% on training data and 70% on test data. What’s happening?',
        ['Overfitting: it memorised the training data', 'Underfitting', 'The test data is wrong', 'It’s working well'],
        0
      )
    ),
    ...tagged(
      'fit',
      J,
      multi(
        'm-ml-f-j1',
        'Taming a Tree',
        'Which help a decision tree that overfits? Tick all that apply.',
        ['Limit its depth', 'Require more samples per leaf', 'Get more training data', 'Let it grow until every leaf is pure'],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'fit',
      P,
      choice(
        'm-ml-f-p1',
        'Forecast Validation',
        'You’re forecasting monthly sales. A colleague uses random 5-fold cross-validation. What’s wrong?',
        [
          'It trains on future months to predict past ones; use a time-based split that always predicts forward',
          'Five folds is too few',
          'Nothing',
          'Forecasts can’t be validated',
        ],
        0
      )
    ),
    ...tagged(
      'fit',
      S,
      choice(
        'm-ml-f-s1',
        'Fading After Launch',
        'A model was strong offline and at launch, but its accuracy slides month by month. What’s the likely cause and response?',
        [
          'Drift: customers or the data changed. Monitor inputs and live accuracy, and retrain on recent data on a schedule or when drift crosses a limit',
          'The model is broken; rebuild from scratch',
          'Users are entering data wrong',
          'Nothing can be done',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-ml-x-b1', 'The Split', 'You have 1,000 rows and split them 80/20 into train and test. How many test rows?', ['200'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-ml-x-j',
        'The Experiment Log',
        `Churn models, same features, 5-fold cross-validation:

Model                          Train AUC   Validation AUC   Train time
Logistic regression            0.78        0.77             2 s
Decision tree (no max depth)   1.00        0.69             3 s
Random forest                  0.97        0.84             40 s
Gradient boosting              0.90        0.86             55 s`,
        'Experiment log'
      ),
      short('m-ml-x-j1', 'Overfitting Most', 'Which model overfits most?', ['decision tree', 'decision tree (no max depth)', 'the decision tree', 'tree'], { taskId: 'm-ml-x-j' }),
      choice(
        'm-ml-x-j2',
        'Take Forward',
        'Which model would you take forward?',
        ['Gradient boosting: best validation score with a modest train/validation gap', 'Decision tree: perfect training score', 'Random forest: highest training score', 'Logistic regression: fastest'],
        0,
        { taskId: 'm-ml-x-j' }
      ),
      written(
        'm-ml-x-j3',
        'Tell the Manager',
        'Explain your choice to a product manager who doesn’t know what AUC is, in a few sentences.',
        [
          'Explains AUC plainly, e.g. how well the model ranks leavers above stayers',
          'Says why the perfect-scoring tree isn’t trusted (it memorised, and does worst on new data)',
          'Gives the choice and its trade-off (slower to train, but best on new customers)',
          'Mentions next steps, e.g. checking on a later time period before launch',
        ],
        `We tried four models. The score that matters is how well each ranks customers who leave above those who stay, measured on customers the model hadn't seen. The decision tree looks perfect on the data it learned from but is the worst on new customers: it memorised rather than learned. Gradient boosting is the best on new customers (0.86) and doesn't lean too hard on its training data, so it's my pick; it takes under a minute to train, which is fine. Before launch I'd check it on last month's customers to be sure it holds up.`,
        { taskId: 'm-ml-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-ml-x-p',
        'An AI-Written Training Script',
        `An AI assistant wrote this fraud model and summary. Fraud is 1.5% of transactions.

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
model = RandomForestClassifier()
model.fit(X, y)
print("Accuracy:", model.score(X_test, y_test))   # prints 0.98

AI’s summary: "The model is 98% accurate, so it catches 98% of fraud. Ready to deploy."`,
        'AI assistant’s answer'
      ),
      multi(
        'm-ml-x-p1',
        'What’s Wrong',
        'Which are real problems? Tick all that apply.',
        [
          'It fits on X and y, all the data including the test rows',
          'Accuracy misleads at 1.5% fraud: calling everything “not fraud” scores 98.5%',
          '98% accuracy doesn’t mean 98% of fraud is caught; that’s recall',
          'The split isn’t stratified, so the test set may hold very few fraud cases',
          'Random forests can’t be used for classification',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-ml-x-p' }
      ),
      short(
        'm-ml-x-p2',
        'The Do-Nothing Score',
        'What accuracy does a model that predicts “not fraud” for every transaction get? (As a %.)',
        ['98.5%', '98.5', '98.5 %'],
        { taskId: 'm-ml-x-p' }
      ),
      written(
        'm-ml-x-p3',
        'Fix It',
        'Write the corrected approach and what you’d report instead.',
        [
          'Fits on X_train only, with a stratified split (and a fixed random_state)',
          'Handles imbalance (class weights) and reports precision, recall and PR-AUC instead of accuracy',
          'Compares against the 98.5% do-nothing baseline',
          'Picks a threshold with the fraud team based on review capacity and cost of missed fraud',
        ],
        `Split with stratify=y and a fixed random_state; fit on X_train, y_train only; use class_weight="balanced". Report recall (share of fraud caught), precision (share of alerts that are fraud) and PR-AUC on the test set, next to the 98.5% you'd get by flagging nothing, which shows why accuracy says little here. Then choose the alert threshold with the fraud team: how many alerts they can review a day, and what a missed fraud costs.`,
        { taskId: 'm-ml-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-ml-x-s',
        'Which Model Pays?',
        `Two churn models, each at its chosen threshold, on 10,000 customers:

            Flagged   Actual churners among flagged
Model A     1,000     300
Model B       600     240

Each flagged customer gets a retention offer costing £20.
The offer keeps half of the churners who get it; each one kept is worth £150.`,
        'Business case'
      ),
      short('m-ml-x-s1', 'Model A', 'What is Model A’s net value in £ (value of churners kept minus the cost of offers)?', ['2500', '£2,500', '2,500', '£2500'], { taskId: 'm-ml-x-s' }),
      short('m-ml-x-s2', 'Model B', 'What is Model B’s net value in £?', ['6000', '£6,000', '6,000', '£6000'], { taskId: 'm-ml-x-s' }),
      written(
        'm-ml-x-s3',
        'Your Recommendation',
        'Model A catches more churners. Which do you recommend, and what would you check before rolling it out?',
        [
          'Recommends B: higher net value (£6,000 vs £2,500) despite catching fewer churners, because its precision is higher',
          'Shows the working: A keeps 150 worth £22,500 for £20,000; B keeps 120 worth £18,000 for £12,000',
          'Suggests tuning the threshold for net value rather than taking either model’s default',
          'Checks the assumptions (the 50% offer success, the £150 value) with a small holdout test before full rollout',
        ],
        `Model B. A flags 1,000 people and keeps 150 churners (£22,500) for £20,000 of offers: £2,500. B flags 600, keeps 120 (£18,000) for £12,000: £6,000. A catches more churners, but it spends a lot on people who were staying anyway. I'd also try B at a few thresholds and pick the one with the best net value, and test the two key assumptions — that the offer keeps half of churners and each is worth £150 — on a small randomised group before rolling out to everyone.`,
        { taskId: 'm-ml-x-s' }
      )
    ),
  ],
};

// ---------- Model evaluation ----------
const CHURN_MATRIX = `Churn model on 2,000 test customers:

                    Predicted churn   Predicted stay
Actually churned          120               80
Actually stayed           180            1,620`;

export const EVALUATION_MODULE: ModuleSkeleton = {
  familyId: 'test-eval-01',
  aspects: [
    { id: 'metrics', name: 'Classification Metrics', summary: 'Precision, recall and accuracy: what each says, and when it misleads.' },
    { id: 'error', name: 'Regression & Forecast Error', summary: 'Measuring how far off numbers are, against a fair baseline.' },
    { id: 'thresholds', name: 'Thresholds, Calibration & Fairness', summary: 'Turning scores into decisions, and checking who they fail.' },
    { id: 'case', name: 'Evaluation Cases', summary: 'Real results and reports: read them, correct them, judge them.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'metrics',
      B,
      short(
        'm-ev-m-b1',
        'Precision',
        'A model flags 50 transactions as fraud: 40 are fraud, 10 aren’t. What is its precision? (As a %.)',
        ['80%', '80', '0.8', '80 %']
      )
    ),
    ...tagged(
      'metrics',
      J,
      short(
        'm-ev-m-j1',
        'Recall',
        'There were 60 fraud cases in all, and the model caught 40 of them. What is its recall? (As a %, one decimal place.)',
        ['66.7%', '66.7', '67%', '0.667', '66.67%', '2/3']
      )
    ),
    ...tagged(
      'metrics',
      P,
      choice(
        'm-ev-m-p1',
        'Cancer Screening',
        'A screening model sends flagged patients for a follow-up scan. Which matters most?',
        [
          'Recall: missing a cancer is far worse than an extra scan, so accept more false alarms',
          'Precision: avoid any unnecessary scans',
          'Accuracy',
          'Training speed',
        ],
        0
      )
    ),
    ...tagged(
      'metrics',
      S,
      choice(
        'm-ev-m-s1',
        'Only the Top 1%',
        'An AML model has 0.92 AUC, but investigators only have time to review the top 1% of alerts. What should you report?',
        ['Precision (and recall) in the top 1%: how many of the cases they can actually review are real', 'AUC is enough', 'Overall accuracy', 'Training loss'],
        0
      )
    ),
    ...tagged('error', B, short('m-ev-e-b1', 'Mean Absolute Error', 'A forecast misses by +2, −4 and +6. What is the mean absolute error?', ['4'])),
    ...tagged(
      'error',
      J,
      choice(
        'm-ev-e-j1',
        'RMSE or MAE?',
        'How does RMSE differ from MAE?',
        ['RMSE punishes big misses more, because errors are squared before averaging', 'They’re always equal', 'MAE punishes big misses more', 'RMSE ignores negative errors'],
        0
      )
    ),
    ...tagged(
      'error',
      P,
      choice(
        'm-ev-e-p1',
        'MAPE Blows Up',
        'Some products sell 0 to 2 units a week. Why is MAPE a poor measure for them?',
        [
          'Percentage error explodes, or can’t be computed, when actuals are near zero; use MAE or weighted absolute % error (WAPE)',
          'MAPE is too lenient',
          'MAPE only works for prices',
          'It isn’t; MAPE is always best',
        ],
        0
      )
    ),
    ...tagged(
      'error',
      S,
      choice(
        'm-ev-e-s1',
        'Beat the Naive Forecast',
        'Your weekly sales model has an MAE of 120. Using the same week last year as the forecast gives an MAE of 110. What do you conclude?',
        ['The model isn’t ready: it doesn’t beat a simple seasonal baseline', 'The model is good: 120 is a small error', 'MAE can’t compare models', 'Use the model; it’s more sophisticated'],
        0
      )
    ),
    ...tagged(
      'thresholds',
      B,
      choice(
        'm-ev-t-b1',
        'Lowering the Threshold',
        'A model flags fraud when its score is above 0.5. What happens if you lower that to 0.3?',
        ['It catches more fraud, and raises more false alarms', 'It catches less fraud', 'Nothing changes', 'Accuracy always goes up'],
        0
      )
    ),
    ...tagged(
      'thresholds',
      J,
      choice(
        'm-ev-t-j1',
        'Calibration',
        'Of all the customers a model gave an 80% chance of churning, 50% actually churned. What does that tell you?',
        ['The model is poorly calibrated: its probabilities are too high', 'The model is perfect', 'Recall is 50%', 'The threshold is wrong'],
        0
      )
    ),
    ...tagged(
      'thresholds',
      P,
      multi(
        'm-ev-t-p1',
        'Checking Fairness',
        'Which should you check before using a loan model across groups of applicants? Tick all that apply.',
        [
          'Error rates in each group, such as good applicants wrongly declined',
          'Approval rates in each group',
          'Whether features like postcode act as a stand-in for a protected trait',
          'Only overall accuracy',
        ],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'thresholds',
      S,
      choice(
        'm-ev-t-s1',
        'Who Sets the Threshold?',
        'Who should set a fraud model’s decision threshold, and how?',
        [
          'Data science with the business owner, from the cost of a missed fraud vs a false alarm and the team’s review capacity, documented and reviewed',
          'Always 0.5',
          'The data scientist alone, for the best F1',
          'Whatever gives the highest accuracy',
        ],
        0
      )
    ),
    ...tagged(
      'case',
      B,
      short(
        'm-ev-x-b1',
        'Accuracy',
        'A model gets 40 true positives, 10 false positives, 20 false negatives and 930 true negatives. What is its accuracy? (As a %.)',
        ['97%', '97', '0.97']
      )
    ),
    ...tagged(
      'case',
      J,
      caseStudy('m-ev-x-j', 'The Churn Results', CHURN_MATRIX, 'Confusion matrix'),
      short('m-ev-x-j1', 'Precision', 'What is the model’s precision? (As a %.)', ['40%', '40', '0.4'], { taskId: 'm-ev-x-j' }),
      short('m-ev-x-j2', 'Recall', 'What is its recall? (As a %.)', ['60%', '60', '0.6'], { taskId: 'm-ev-x-j' }),
      written(
        'm-ev-x-j3',
        'For the CRM Manager',
        'The CRM manager will call every customer the model flags. Explain what these numbers mean for her team.',
        [
          'Of 300 flagged customers, 120 are real churners: about 4 in 10 calls reach someone who’d leave',
          'It finds 120 of the 200 churners (60%); 80 leave without a call',
          'Explains the trade-off: flagging more catches more churners but means more wasted calls',
          'Plain language, no unexplained jargon',
        ],
        `The model would give your team 300 customers to call. About 4 in 10 of them (120) really are about to leave; the other 180 were staying anyway. Of everyone who'll leave, it finds 6 in 10 (120 of 200), so 80 will go without a call. If you want to reach more of the leavers, we can lower the bar, but your team will make more calls to people who were staying.`,
        { taskId: 'm-ev-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-ev-x-p',
        'An AI-Written Evaluation',
        `${CHURN_MATRIX}

An AI assistant wrote this summary for the leadership team:

"The churn model is 87% accurate (1,740 of 2,000 correct), which beats the baseline. Its precision is 60%, and it finds 87% of customers who are about to churn. F1 score is 0.75. We recommend launching it."`,
        'AI assistant’s answer'
      ),
      multi(
        'm-ev-x-p1',
        'Which Claims Are Wrong?',
        'Tick every claim in the AI’s summary that is wrong.',
        [
          '87% accurate (1,740 of 2,000 correct)',
          'It beats the baseline',
          'Precision is 60%',
          'It finds 87% of customers about to churn',
          'F1 score is 0.75',
        ],
        [1, 2, 3, 4],
        { taskId: 'm-ev-x-p' }
      ),
      short(
        'm-ev-x-p2',
        'The Baseline',
        'What accuracy would “nobody churns” get on these customers? (As a %.)',
        ['90%', '90', '0.9'],
        { taskId: 'm-ev-x-p' }
      ),
      written(
        'm-ev-x-p3',
        'The Corrected Summary',
        'Rewrite the summary correctly for leadership.',
        [
          'Accuracy 87% is below the 90% “nobody churns” baseline, so accuracy is the wrong lens',
          'Precision 40% (120 of 300 flagged) and recall 60% (120 of 200 churners)',
          'F1 is 0.48, not 0.75',
          'A launch decision rests on whether calling 300 to reach 120 churners pays, not on accuracy',
        ],
        `The model is right 87% of the time, but saying "nobody churns" would be right 90% of the time, so accuracy isn't the measure to judge it on. What matters: of the 300 customers it flags, 120 are real churners (40% precision), and it finds 120 of the 200 who leave (60% recall); F1 is 0.48. Whether to launch depends on whether contacting 300 customers to reach 120 churners pays for itself; I'd work that out with the retention team's cost per contact and value per customer kept.`,
        { taskId: 'm-ev-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-ev-x-s',
        'Lending Fairness',
        `A loan model, checked on a holdout of past applicants whose repayment is known:

            Applicants who repaid   Of those, approved by the model
Group A     800                     570
Group B     800                     330

Overall accuracy is similar for both groups (81% and 79%).`,
        'Fairness check'
      ),
      short(
        'm-ev-x-s1',
        'Group A',
        'What share of good (repaying) applicants in group A does the model decline? (As a %, one decimal place.)',
        ['28.8%', '28.8', '28.75%', '28.75', '29%'],
        { taskId: 'm-ev-x-s' }
      ),
      short(
        'm-ev-x-s2',
        'Group B',
        'And in group B?',
        ['58.8%', '58.8', '58.75%', '58.75', '59%'],
        { taskId: 'm-ev-x-s' }
      ),
      written(
        'm-ev-x-s3',
        'To the Risk Committee',
        'Accuracy is similar across groups. What do you tell the risk committee?',
        [
          'Similar accuracy hides a large gap: group B’s good applicants are declined about twice as often (58.8% vs 28.8%)',
          'Recommends not launching as is, and investigating why (features acting as proxies, less data on B, the threshold)',
          'Proposes fixes to test, e.g. removing proxy features, more representative data, and re-checking error rates by group',
          'Notes the legal and reputational risk and that the decision needs sign-off with this evidence',
        ],
        `Don't approve it yet. Overall accuracy looks even, but it hides the error that matters to applicants: the model declines 58.8% of group B's applicants who would have repaid, against 28.8% in group A, about twice the rate. That's a fairness and legal risk. I'd look for the cause — features that stand in for group membership such as postcode, thinner history for group B, or one threshold that suits A — and test fixes, then show this table again with the gap closed before it goes live.`,
        { taskId: 'm-ev-x-s' }
      )
    ),
  ],
};

// ---------- Data science final project ----------
const CHURN_BRIEF = `You're a data scientist at Brightstream, a video streaming service with 20,000 subscribers. 1,600 of them cancelled last quarter.

Extract (first rows of 20,000):
user_id  signup      plan      watch_hours_30d  devices  last_payment_failed  support_tickets  cancel_reason   churned
U0001    2024-02-11  Standard  14.5             2        no                   0                (blank)         0
U0002    2025-09-30  basic     0.0              1        yes                  3                Price           1
U0003    2023-12-01  Premium   41.2             4        no                   1                (blank)         0
U0004    2025-07-14  Standard  (blank)          1        no                   0                Not watching    1
U0005    2025-01-05  STANDARD  6.1              -1       no                   2                (blank)         0`;

const AB_RESULT = `Retention email test, run for two weeks, planned as a 50/50 split:

              Users    Cancelled   Rate
Control       9,000    450         5.0%
Email        11,000    440         4.0%

The analyst also checked 12 segments (plan × country × device) and found one, "Premium, Germany, TV", where the email cut cancellations by 45% (p = 0.03).`;

export const DS_SIM_MODULE: ModuleSkeleton = {
  familyId: 'test-sim-ds-01',
  aspects: [
    { id: 'model', name: 'Building the Model', summary: 'Framing churn, preparing the data and training honestly.' },
    { id: 'explain', name: 'Explaining Accuracy', summary: 'What the model’s numbers mean for the people who’ll use it.' },
    { id: 'abtest', name: 'Reading the A/B Test', summary: 'Whether the retention email really worked.' },
    { id: 'case', name: 'The Churn Project', summary: 'Brightstream’s data, model and test, start to finish.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'model',
      B,
      choice(
        'm-dss-m-b1',
        'The Target',
        'What should a churn model predict?',
        [
          'Whether a subscriber cancels within a set window (e.g. 30 days) after a snapshot date',
          'Whether they have ever cancelled',
          'Their watch hours',
          'Their plan',
        ],
        0
      )
    ),
    ...tagged(
      'model',
      J,
      choice(
        'm-dss-m-j1',
        'Splitting Monthly Snapshots',
        'You have monthly snapshots for two years. How do you split for validation?',
        ['Train on earlier months and validate on later ones, as the model will be used', 'A random 80/20 split of all rows', 'Validate on the training months', 'Use the first month as the test set'],
        0
      )
    ),
    ...tagged(
      'model',
      P,
      multi(
        'm-dss-m-p1',
        'Before You Trust It',
        'What should you do before trusting a churn model’s score? Tick all that apply.',
        [
          'Compare with a simple baseline',
          'Check every feature could be known at the snapshot date',
          'Check performance in key segments, like new subscribers',
          'Check that the predicted probabilities match reality',
          'Add every column in the warehouse',
        ],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'model',
      S,
      choice(
        'm-dss-m-s1',
        'Running It Every Month',
        'The model will score every subscriber monthly. What has to be in place?',
        [
          'A scheduled pipeline using point-in-time features, monitoring of input drift and realised churn against predictions, and a retraining rule',
          'A notebook someone runs when they remember',
          'Retrain only if someone complains',
          'Nothing; models don’t change',
        ],
        0
      )
    ),
    ...tagged(
      'explain',
      B,
      short(
        'm-dss-e-b1',
        'The Easy 92%',
        '8% of subscribers churn. What accuracy does a model get by predicting that nobody churns? (As a %.)',
        ['92%', '92', '0.92']
      )
    ),
    ...tagged(
      'explain',
      J,
      choice(
        'm-dss-e-j1',
        'Precision, Plainly',
        'How do you explain “precision is 45%” to the retention manager?',
        ['Of every 100 subscribers the model flags, about 45 really are about to cancel', 'The model is right 45% of the time overall', 'It finds 45% of churners', 'It’s 45% confident'],
        0
      )
    ),
    ...tagged(
      'explain',
      P,
      short(
        'm-dss-e-p1',
        'Lift',
        'The model’s riskiest 10% of subscribers contain 35% of all churners. What is the lift in that top 10%?',
        ['3.5', '3.5x', '3.5 times', '3.5×']
      )
    ),
    ...tagged(
      'explain',
      S,
      choice(
        'm-dss-e-s1',
        '“How Sure Are You?”',
        'The CFO asks how sure you are that the model will save the £400k you estimated. What do you give her?',
        [
          'A range from backtests over several past months and the key assumptions behind it, with a plan to measure the real saving with a holdout group',
          'An exact figure: £400k',
          '“Very sure”',
          'The model’s AUC',
        ],
        0
      )
    ),
    ...tagged(
      'abtest',
      B,
      choice(
        'm-dss-a-b1',
        'Why Random?',
        'Why must users be randomly assigned to the email and control groups?',
        ['So the only systematic difference between groups is the email', 'To make the test faster', 'So the groups are exactly the same size', 'It isn’t needed'],
        0
      )
    ),
    ...tagged(
      'abtest',
      J,
      short(
        'm-dss-a-j1',
        'Relative Reduction',
        'Control churn was 5.0%, email churn 4.5%. What is the relative reduction? (As a %.)',
        ['10%', '10', '0.1']
      )
    ),
    ...tagged(
      'abtest',
      P,
      choice(
        'm-dss-a-p1',
        'Peeking',
        'The team checked the test every day and stopped on the first day p dipped under 0.05. What’s the problem?',
        ['Repeatedly checking and stopping early inflates the chance of a false win; fix the sample size in advance or use a sequential method', 'Nothing', 'They should have waited for p under 0.01', 'Daily checks make results more accurate'],
        0
      )
    ),
    ...tagged(
      'abtest',
      S,
      choice(
        'm-dss-a-s1',
        'The Wrong Split',
        'A test planned as 50/50 ends with 11,000 users in treatment and 9,000 in control. What do you do?',
        [
          'Treat it as a sample ratio mismatch: find out why before trusting any result, since assignment or logging is broken',
          'Weight the groups and report the result',
          'Nothing; it’s close enough',
          'Drop 2,000 treatment users at random',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-dss-x-b1', 'Churn Rate', 'Brightstream has 20,000 subscribers and 1,600 cancelled last quarter. What is the churn rate? (As a %.)', ['8%', '8', '0.08'])),
    ...tagged(
      'case',
      J,
      caseStudy('m-dss-x-j', 'The Brightstream Extract', CHURN_BRIEF, 'Brief and extract'),
      multi(
        'm-dss-x-j1',
        'Data Problems',
        'Which problems in the extract need fixing before modelling? Tick all that apply.',
        [
          'plan has three spellings of Standard and Basic in lower case',
          'devices is −1 for U0005, which is impossible',
          'watch_hours_30d is blank for U0004',
          'cancel_reason is filled in only for people who cancelled',
          'user_id starts with U',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-dss-x-j' }
      ),
      choice(
        'm-dss-x-j2',
        'Off Limits',
        'Which column must not be a feature?',
        ['cancel_reason: it only exists after someone cancels', 'last_payment_failed', 'watch_hours_30d', 'plan'],
        0,
        { taskId: 'm-dss-x-j' }
      ),
      written(
        'm-dss-x-j3',
        'Your Plan',
        'Write your plan for building the first churn model from this data.',
        [
          'Cleans plan, treats devices −1 as invalid and handles missing watch hours with a flag',
          'Drops cancel_reason and anything known only after cancelling',
          'Defines the target and builds features as at a snapshot date (tenure, recent watching, payment failures)',
          'Validates on a later time period against a baseline, using precision/recall rather than accuracy (8% churn)',
        ],
        `Clean: plan to one spelling; devices −1 set to missing; blank watch hours filled with 0 only if the logs confirm no viewing, otherwise imputed with a missing flag. Drop cancel_reason: it only exists after a cancellation. Target: cancelled within 30 days of a monthly snapshot. Features as at each snapshot: tenure, watch hours (and their trend), devices, failed payments, support tickets, plan. Start with logistic regression, then gradient boosting; train on earlier months, validate on the latest, and judge on precision, recall and lift, since predicting "nobody churns" already scores 92%.`,
        { taskId: 'm-dss-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-dss-x-p',
        'The Retention Email Test',
        `${AB_RESULT}

An AI assistant summarised it for the product team:
"The email cut cancellations by 20% overall and by 45% in Premium/Germany/TV (statistically significant). We should send it to everyone, and especially to German Premium TV viewers."`,
        'Test result and AI summary'
      ),
      multi(
        'm-dss-x-p1',
        'The Flaws',
        'Which are real flaws in the conclusion? Tick all that apply.',
        [
          'The groups are 11,000 vs 9,000 on a planned 50/50: a sample ratio mismatch that has to be explained first',
          'The 45% segment was found by checking 12 segments; one p = 0.03 among 12 is likely chance',
          'Two weeks may be too short: cancellations happen at renewal, often monthly',
          'A 20% relative reduction (5.0% to 4.0%) is the right arithmetic',
          'Email tests can’t measure churn',
        ],
        [0, 1, 2],
        { taskId: 'm-dss-x-p' }
      ),
      written(
        'm-dss-x-p2',
        'What You Tell the Team',
        'Write what you’d tell the product team instead.',
        [
          'Not ready to roll out: the uneven split means assignment or logging may be broken, so the 20% can’t be trusted yet',
          'The German Premium TV result is a likely false positive from checking many segments; treat it as an idea to test, not a finding',
          'Proposes a re-run: fixed assignment checked for balance, a pre-set sample size and run long enough to cover a renewal cycle, one primary metric',
          'Clear and constructive, not dismissive of the idea',
        ],
        `The email may well help, but this test can't tell us yet. A 50/50 test that ends 11,000 to 9,000 has a problem with who got assigned or logged, and until we know why, the 5.0% vs 4.0% could be down to that rather than the email. The 45% in German Premium TV viewers came from looking at 12 segments; with that many looks, one "significant" result is what chance alone would give us, so it's a lead to test, not a finding. Next: fix and check the split, set the sample size in advance, run it through at least one full renewal cycle, and decide on overall cancellations as the one measure.`,
        { taskId: 'm-dss-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-dss-x-s',
        'The Launch Decision',
        `Your churn model, validated on last month's 20,000 subscribers:

Top 10% riskiest (2,000 subscribers): 700 cancelled
Everyone else (18,000): 900 cancelled

A retention offer (one month at half price) costs £6 per subscriber who receives it.
In a pilot, it kept 1 in 4 of the would-be cancellers who got it. A kept subscriber is worth £60.`,
        'Validation and costs'
      ),
      short('m-dss-x-s1', 'Lift', 'What is the lift in the top 10%? (Churn rate there divided by the overall rate.)', ['4.375', '4.4', '4.38', '4.4x'], { taskId: 'm-dss-x-s' }),
      short(
        'm-dss-x-s2',
        'Value Kept',
        'Sending the offer to the top 10%: what are the subscribers it keeps worth, in £?',
        ['10500', '£10,500', '10,500', '£10500'],
        { taskId: 'm-dss-x-s' }
      ),
      written(
        'm-dss-x-s3',
        'Your Recommendation',
        'The head of retention wants to launch the offer to the top 10% next week. Write your recommendation.',
        [
          'Shows the model is useful (lift about 4.4: 35% churn in the top 10% vs 8% overall) but the offer as designed loses money (£10,500 kept vs £12,000 cost = −£1,500)',
          'Suggests changes that could make it pay: a narrower group (e.g. top 5%), a cheaper or better-targeted offer',
          'Proposes measuring with a randomised holdout rather than assuming the pilot rate',
          'Clear recommendation with numbers, written for a non-technical lead',
        ],
        `The model works: the riskiest 10% cancel at 35%, about 4.4 times the 8% average. But this offer to that group loses money: 2,000 offers cost £12,000, and keeping 1 in 4 of the 700 cancellers (175 people at £60) brings back £10,500, so we'd be down £1,500. I'd not launch it as is. Two changes could make it pay: target only the riskiest 5%, where the cancellation rate is higher, or use a cheaper offer. Whatever we launch, keep a random 10% of the target group without the offer, so we measure the real saving rather than relying on the pilot.`,
        { taskId: 'm-dss-x-s' }
      )
    ),
  ],
};

export const DATA_SCIENCE_MODULES = [IMPORT_MODULE, FEATURE_MODULE, MODELLING_MODULE, EVALUATION_MODULE, DS_SIM_MODULE];
