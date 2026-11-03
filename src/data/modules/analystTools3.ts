import { AssessmentTest } from '../../types';
import { caseStudy, choice, match, multi, order, short, written } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';
import { analystMain } from './analystTools2';

// Second tests for the analyst skill sections: data cleaning, reporting, statistics and a job simulation.

export const ANALYST_SKILL_TESTS: AssessmentTest[] = [
  analystMain(
    'test-clean-02',
    'Data Quality: Validation & Deduplication',
    'Profile and validate data, standardise messy values and find duplicates, then reconcile a migration and match customers across two systems.',
    ['Data Quality', 'Deduplication', 'Validation', 'Data Cleaning'],
    ['Data Analyst', 'Data Engineer']
  ),
  analystMain(
    'test-dash-02',
    'Data Storytelling & Presenting Insights',
    'Pick the chart, build the story and handle stakeholders, then write the update, restructure a deck and redesign a board pack.',
    ['Data Storytelling', 'Data Visualisation', 'Stakeholder Management', 'Reporting'],
    ['Data Analyst', 'Business Analyst']
  ),
  analystMain(
    'test-stats-01',
    'Statistics for Analysts',
    'Averages and spread, probability, confidence intervals and significance, then judge whether a difference is real.',
    ['Statistics', 'Probability', 'Hypothesis Testing', 'Confidence Intervals'],
    ['Data Analyst', 'Business Analyst']
  ),
  analystMain(
    'test-sim-da-02',
    'Data Analyst Simulation: Online Returns',
    'A fashion retailer’s returns are climbing. Scope the question, analyse it by category, measure a size guide’s effect and decide on a returns charge.',
    ['Problem Solving', 'Data Analysis', 'Experimentation', 'Recommendations'],
    ['Data Analyst', 'Business Analyst']
  ),
];

// ---------- Data quality ----------
export const CLEANING_2_MODULE: ModuleSkeleton = {
  familyId: 'test-clean-02',
  aspects: [
    { id: 'validate', name: 'Profiling & Validation', summary: 'Knowing what the data looks like, and catching what’s wrong.' },
    { id: 'dedupe', name: 'Duplicates & Matching', summary: 'Finding the same record twice, and merging safely.' },
    { id: 'standard', name: 'Standardising Values', summary: 'Names, dates, countries and currencies in one form.' },
    { id: 'case', name: 'Data Quality Cases', summary: 'Real records and migrations: count, match and decide.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'validate',
      B,
      choice(
        'm-cl2-v-b1',
        'A New Dataset',
        'You receive a new dataset. What do you do first?',
        ['Profile it: row counts, missing values, distinct values and ranges of each column', 'Build the dashboard', 'Delete rows with any blanks', 'Send it to the client'],
        0
      )
    ),
    ...tagged(
      'validate',
      J,
      multi(
        'm-cl2-v-j1',
        'Order Checks',
        'Which are sensible validation rules for an orders table? Tick all that apply.',
        ['Order date isn’t in the future', 'Quantity is above zero', 'Every customer_id exists in the customers table', 'Every order is over £100', 'Order IDs are unique'],
        [0, 1, 2, 4]
      )
    ),
    ...tagged(
      'validate',
      P,
      choice(
        'm-cl2-v-p1',
        'A Third Missing',
        'Today’s daily load has 30% fewer rows than usual, on a normal weekday. What do you do?',
        [
          'Hold the report and check the source extract and pipeline before anyone reads a false drop',
          'Publish it: sales fell',
          'Copy yesterday’s data in',
          'Ignore it; it will catch up',
        ],
        0
      )
    ),
    ...tagged(
      'validate',
      S,
      choice(
        'm-cl2-v-s1',
        'Catching It Every Time',
        'Data problems keep reaching reports before anyone spots them. What’s the lasting fix?',
        [
          'Automated checks on every load (uniqueness, not-null, accepted values, freshness, unusual row counts) that alert, or stop the load, with an owner for each source',
          'A monthly manual review',
          'Ask users to report problems',
          'Add a disclaimer to every report',
        ],
        0
      )
    ),
    ...tagged(
      'dedupe',
      B,
      choice(
        'm-cl2-d-b1',
        'Exact Duplicates',
        'The same order appears twice, identical in every column. What do you do?',
        ['Remove the extra copy, matching on the order ID (or every column)', 'Keep both', 'Double the totals', 'Delete the order entirely'],
        0
      )
    ),
    ...tagged(
      'dedupe',
      J,
      choice(
        'm-cl2-d-j1',
        'The Same Person?',
        '"Jon Smith, jon@x.com" and "Jonathan Smith, JON@X.COM " (with a trailing space). How do you find matches like this?',
        ['Trim and lowercase emails, then match on email', 'Match on the exact name', 'Match on first letter of the name', 'They can’t be matched'],
        0
      )
    ),
    ...tagged(
      'dedupe',
      P,
      choice(
        'm-cl2-d-p1',
        'The Matching Threshold',
        'You’re fuzzy-matching patient records on name and date of birth. How do you set the threshold?',
        [
          'Strict: wrongly merging two patients is far worse than missing a match, so send borderline matches for manual review',
          'As loose as possible, to catch every duplicate',
          'Whatever gives the most matches',
          'Randomly, then adjust',
        ],
        0
      )
    ),
    ...tagged(
      'dedupe',
      S,
      choice(
        'm-cl2-d-s1',
        'Merging Safely',
        'You’re merging 4,000 duplicate customer records. What must the merge keep?',
        [
          'Clear rules for which values survive (e.g. most recent, most complete), and a map from old IDs to the surviving one so orders and history follow',
          'Only the newest record; delete the rest',
          'Whichever record was created first, with no record of the others',
          'Both records, flagged',
        ],
        0
      )
    ),
    ...tagged(
      'standard',
      B,
      match('m-cl2-s-b1', 'Cleaned Up', 'Match each messy value to its standard form.', [
        ['"  london "', 'London'],
        ['"N/A"', 'Empty (null)'],
        ['"£1,200"', '1200'],
        ['"yes", "Y", "TRUE"', 'True'],
      ])
    ),
    ...tagged(
      'standard',
      J,
      choice(
        'm-cl2-s-j1',
        'Countries',
        'A country column holds "UK", "U.K.", "United Kingdom" and "GB". How do you standardise it?',
        ['A mapping table from each variant to one code (e.g. ISO "GB")', 'Delete the rows that aren’t "UK"', 'Sort alphabetically', 'Leave it; people can read it'],
        0
      )
    ),
    ...tagged(
      'standard',
      P,
      choice(
        'm-cl2-s-p1',
        '03/04/2025',
        'Dates like 03/04/2025 come from a US system and a UK system. How do you parse them?',
        [
          'Parse each source with its known format (US month-first, UK day-first), never guessing row by row',
          'Assume day-first for everything',
          'Let the software guess each row',
          'Drop dates where both parts are 12 or under',
        ],
        0
      )
    ),
    ...tagged(
      'standard',
      S,
      choice(
        'm-cl2-s-s1',
        'Three Currencies',
        'Revenue arrives in GBP, EUR and USD. How should you store and report it?',
        [
          'Keep the original amount and currency, convert at the rate for the transaction date, and store the rate used',
          'Convert everything at today’s rate',
          'Add the numbers together as they are',
          'Report each currency separately and never total them',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-cl2-c-b1', 'After Deduping', 'A file has 1,000 rows. 50 are duplicates of other rows and are removed.\n\nHow many rows are left?', ['950'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-cl2-c-j',
        'Customer List',
        `ID  Name       Email               City
1   Ana Lee    ana@mail.com        Leeds
2   ana lee    ANA@mail.com        leeds
3   Ben Ito    ben@mail.com        York
4   Ben Ito    ben.ito@work.com    York
5   Cara Diaz  (blank)             London`,
        'Export'
      ),
      short(
        'm-cl2-c-j1',
        'Distinct Emails',
        'After trimming and lowercasing, how many distinct non-blank emails are there?',
        ['3'],
        { taskId: 'm-cl2-c-j' }
      ),
      multi('m-cl2-c-j2', 'Definitely the Same', 'Which pairs are definitely the same person? Tick all that apply.', ['1 and 2', '3 and 4', '1 and 5'], [0], { taskId: 'm-cl2-c-j' }),
      written(
        'm-cl2-c-j3',
        'Your Rules',
        'Write the deduplication rules you’d apply to this list.',
        [
          'Standardise first: trim, lowercase emails, consistent case for names and cities',
          'Merge automatically on matching email (1 and 2)',
          'Same name and city but different emails (3 and 4) is a possible match for review, not an automatic merge',
          'Keeps records with no email (5) and says how they’d be matched, e.g. name plus another field',
        ],
        `First standardise: trim spaces, lowercase emails, title-case names and cities. Then merge automatically where emails match, so 1 and 2 become one Ana Lee. Records with the same name and city but different emails, like 3 and 4, could be one person with a work and a personal address, or two people; I'd flag them for a person to check rather than merge. Records with no email, like 5, stay as they are unless name plus phone or postcode matches another record.`,
        { taskId: 'm-cl2-c-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-cl2-c-p',
        'The Migration',
        `Moving orders from the old system to the new one:

Rows in the old system     120,000
Rows in the new system     117,600
Rejected-rows log          1,900 (1,200 invalid dates, 700 unknown customers)`,
        'Migration report'
      ),
      short('m-cl2-c-p1', 'Unaccounted For', 'How many rows are neither in the new system nor in the rejected log?', ['500'], { taskId: 'm-cl2-c-p' }),
      short('m-cl2-c-p2', 'Rejected', 'What % of rows were rejected? (One decimal place.)', ['1.6%', '1.6', '1.58'], { taskId: 'm-cl2-c-p' }),
      written(
        'm-cl2-c-p3',
        'Before Sign-off',
        'The project manager wants to sign off the migration today. What do you say?',
        [
          'Not yet: 500 rows are missing with no explanation, which must be found first',
          'The 1,900 rejected rows need fixing and reloading, e.g. correcting date formats and loading or mapping the unknown customers',
          'Reconcile totals as well as counts, e.g. order value by month in both systems',
          'Gives a clear plan and sign-off criteria',
        ],
        `Not today. 500 rows have vanished with no trace in the log, and we need to find them before anything else; I'll compare order IDs between the systems to list them. The 1,900 rejected rows also need to land: the 1,200 dates look like a format problem we can fix and reload, and the 700 orders need their customers migrated or mapped. I'd sign off once every row is in the new system or deliberately excluded with a reason, and order counts and values match the old system by month.`,
        { taskId: 'm-cl2-c-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-cl2-c-s',
        'Two Systems, One Customer',
        `The CRM has 50,000 customers; billing has 48,000.

Exact matches on email: 42,000.
Fuzzy matches on name and postcode: 3,000 more. In a random sample of 200 fuzzy matches, 180 were correct.

Finance wants the matched list to move every customer's billing history into the CRM.`,
        'Matching results'
      ),
      short('m-cl2-c-s1', 'Wrong Matches', 'How many of the 3,000 fuzzy matches are likely to be wrong?', ['300'], { taskId: 'm-cl2-c-s' }),
      short('m-cl2-c-s2', 'Correct Matches', 'How many correct matches would you expect in total?', ['44700', '44,700'], { taskId: 'm-cl2-c-s' }),
      written(
        'm-cl2-c-s3',
        'Your Recommendation',
        'What do you recommend to finance?',
        [
          'Use the 42,000 exact email matches straight away',
          'Don’t load the 3,000 fuzzy matches as they are: about 300 would attach billing history to the wrong customer, which matters for finance',
          'Review the fuzzy matches (or add another field such as phone or account number to confirm them) before loading',
          'Plans for the unmatched customers, and records how each match was made',
        ],
        `Load the 42,000 email matches now. The fuzzy matches are 90% right, which would be fine for a marketing list, but for billing it means about 300 customers seeing someone else's invoices. I'd confirm them with a second field, like phone or the last four digits of the payment card, and send whatever's left to the billing team to check. The 3,000 or so still unmatched stay in billing until they're matched. Every match gets a note of how it was made, so we can undo any that turn out wrong.`,
        { taskId: 'm-cl2-c-s' }
      )
    ),
  ],
};

// ---------- Storytelling ----------
export const STORY_MODULE: ModuleSkeleton = {
  familyId: 'test-dash-02',
  aspects: [
    { id: 'charts', name: 'Choosing Charts', summary: 'The right chart, used honestly, that makes its point without you.' },
    { id: 'story', name: 'Building the Story', summary: 'Leading with the answer and saying what it means.' },
    { id: 'people', name: 'Stakeholders & Decisions', summary: 'Knowing what decision a report serves, and handling disagreement.' },
    { id: 'case', name: 'Presenting Cases', summary: 'Real findings to write up, structure and present.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'charts',
      B,
      choice(
        'm-st-c-b1',
        'This Year vs Last',
        'Which chart best compares monthly sales this year with last year?',
        ['A line chart with one line per year', 'Two pie charts', 'A table of 24 numbers', 'A scatter plot'],
        0
      )
    ),
    ...tagged(
      'charts',
      J,
      choice(
        'm-st-c-j1',
        'Fifteen Lines',
        'A line chart has 15 product lines in 15 colours and nobody can read it. What do you do?',
        ['Highlight the two or three that matter and grey the rest, or use small multiples', 'Add a bigger legend', 'Use brighter colours', 'Make it 3D'],
        0
      )
    ),
    ...tagged(
      'charts',
      P,
      choice(
        'm-st-c-p1',
        'Spend and Sales',
        'You want to show whether stores that spend more on local ads sell more, across 50 stores. Which chart?',
        ['A scatter plot of ad spend against sales, one dot per store', 'A pie chart of ad spend', 'A line chart of store names', 'Two separate bar charts'],
        0
      )
    ),
    ...tagged(
      'charts',
      S,
      choice(
        'm-st-c-s1',
        'A Chart That Speaks for Itself',
        'Your chart will be forwarded to people who won’t hear you explain it. What matters most?',
        [
          'A title that states the finding (e.g. “Returns doubled after the March policy change”) and an annotation at the key event',
          'A title naming the data, like “Returns by month”',
          'As many data points as possible',
          'Bright colours',
        ],
        0
      )
    ),
    ...tagged(
      'story',
      B,
      choice(
        'm-st-s-b1',
        'The First Line',
        'How should an email with your findings start?',
        ['With the answer: what you found and what you recommend', 'With how you got the data', 'With a list of every chart', 'With an apology for the delay'],
        0
      )
    ),
    ...tagged(
      'story',
      J,
      order('m-st-s-j1', 'A Findings Slide', 'Put a short findings write-up in a sensible order.', [
        'The answer in one sentence',
        'The evidence behind it',
        'What it means for the business',
        'What you recommend, and the next step',
      ])
    ),
    ...tagged(
      'story',
      P,
      choice(
        'm-st-s-p1',
        'So What?',
        'Your finding: “Average basket size rose 4% last month.” What makes it useful?',
        [
          'Saying what drove it and what it means for a decision, e.g. “the bundle offer is working; extend it to two more categories”',
          'Adding more decimal places',
          'Adding the same figure for every week',
          'Nothing; the number speaks for itself',
        ],
        0
      )
    ),
    ...tagged(
      'story',
      S,
      choice(
        'm-st-s-s1',
        'An Uncertain Forecast',
        'Your forecast is £1.2m, give or take £0.2m. How do you present it to the CEO?',
        [
          'Give the range, the main assumptions behind it and what would move it, so they can plan for both ends',
          'Say £1.2m and leave the range out to sound confident',
          'Say “between £1m and £1.4m” with no explanation',
          'Refuse to forecast until it’s certain',
        ],
        0
      )
    ),
    ...tagged(
      'people',
      B,
      choice(
        'm-st-p-b1',
        'Before You Build',
        'Someone asks for a new report. What do you ask first?',
        ['What decision it will help with, who will use it and how often', 'What colours they like', 'Which chart type they want', 'Nothing; start building'],
        0
      )
    ),
    ...tagged(
      'people',
      J,
      choice(
        'm-st-p-j1',
        'Ten More Metrics',
        'A manager asks you to add ten more metrics to an already crowded dashboard. What do you do?',
        [
          'Ask which decision each one serves; add the ones that matter, and put the rest on a detail page',
          'Add all ten',
          'Refuse',
          'Replace the existing metrics with the new ones',
        ],
        0
      )
    ),
    ...tagged(
      'people',
      P,
      choice(
        'm-st-p-p1',
        'The VP Won’t Like It',
        'Your analysis shows the VP’s favourite project isn’t working. The review meeting is next week. What do you do?',
        [
          'Double-check the analysis, then walk the VP through it privately before the meeting, presenting the evidence neutrally',
          'Spring it on them in the meeting',
          'Soften the numbers',
          'Leave it out of the deck',
        ],
        0
      )
    ),
    ...tagged(
      'people',
      S,
      choice(
        'm-st-p-s1',
        'What Counts as Active?',
        'Product, marketing and finance each count “active customers” differently, and meetings keep turning into arguments about whose number is right. What’s the fix?',
        [
          'A shared metric glossary: one agreed definition per metric, with an owner, signed off by the teams and used in every report',
          'Use whichever number is highest',
          'Show all three and let people pick',
          'Stop reporting active customers',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-st-x-b1', 'Growth', 'Last year 80, this year 100.\n\nWhat is the growth, as a %?', ['25%', '25', '0.25'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-st-x-j',
        'Weekly Sign-ups',
        `Week   Sign-ups
1      400
2      420
3      410
4      300
5      430
6      440

The website was down for two days in week 4.`,
        'Product data'
      ),
      choice(
        'm-st-x-j1',
        'The Chart',
        'Which chart do you send the head of product?',
        ['A line of weekly sign-ups with week 4 annotated “site outage, 2 days”', 'A pie chart of the six weeks', 'A table with no context', 'A bar chart with week 4 removed and no note'],
        0,
        { taskId: 'm-st-x-j' }
      ),
      short('m-st-x-j2', 'Normal Weeks', 'What are average weekly sign-ups excluding week 4?', ['420'], { taskId: 'm-st-x-j' }),
      written(
        'm-st-x-j3',
        'The Update',
        'Write a three- or four-sentence update for the head of product.',
        [
          'Leads with the headline: sign-ups are steady to growing, around 420 a week, reaching 440 in week 6',
          'Explains week 4’s dip by the two-day outage, not a change in demand',
          'Quantifies the outage’s cost, e.g. about 120 sign-ups lost against a normal week',
          'Ends with an action or what to watch',
        ],
        `Sign-ups are steady and edging up: about 420 a week, with 440 in week 6, our best yet. Week 4's dip to 300 was the two-day outage, not falling demand; it cost us around 120 sign-ups against a normal week. Weeks 5 and 6 bounced straight back. Worth asking engineering for an outage alert so we lose hours, not days, next time.`,
        { taskId: 'm-st-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-st-x-p',
        'The Churn Deck',
        `A 14-slide deck on churn. Buried on slide 11:

Plan      Share of customers   Churn before   Churn after
Basic     1/3                  5.0%           7.0%
Premium   2/3                  2.0%           2.0%

Overall churn went from 3.0% to … The Basic price rose 15% between "before" and "after".`,
        'Draft deck'
      ),
      short('m-st-x-p1', 'Overall Churn', 'What is overall churn after the change, as a %? (One decimal place.)', ['3.7%', '3.7', '3.67'], { taskId: 'm-st-x-p' }),
      choice(
        'm-st-x-p2',
        'The Headline',
        'Which is the best title for the key slide?',
        [
          'Churn rose because Basic customers left after the price rise; Premium is unchanged',
          'Churn analysis Q3',
          'Churn by plan',
          'Overall churn is 3.7%',
        ],
        0,
        { taskId: 'm-st-x-p' }
      ),
      written(
        'm-st-x-p3',
        'Three Slides',
        'Restructure the deck into three slides. Say what goes on each.',
        [
          'Slide 1: the answer: churn rose from 3.0% to about 3.7%, entirely from Basic (5% to 7%) after the 15% price rise',
          'Slide 2: the evidence: churn by plan before and after, Premium flat at 2%',
          'Slide 3: what to do, e.g. test a smaller rise or a cheaper tier for Basic, and weigh lost customers against extra revenue',
          'Moves everything else to an appendix',
        ],
        `Slide 1, the answer: "Churn rose from 3.0% to 3.7%, all of it from Basic customers after the price rise." Slide 2, the evidence: a bar chart of churn by plan, before and after; Basic up from 5% to 7%, Premium flat at 2%. Slide 3, the decision: is the extra 15% from Basic worth losing 2 points more of those customers a month? I'd show that trade-off in pounds and recommend testing a smaller rise for new Basic customers. The other 11 slides go to an appendix.`,
        { taskId: 'm-st-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-st-x-s',
        'The Board Pack',
        `The monthly board pack is 40 pages of tables and charts, built by four teams. The CEO says: "The board reads it in the ten minutes before the meeting, and the discussion always ends up on page 3 because that's as far as anyone gets."

Last quarter the board missed a cash warning on page 27.`,
        'CEO’s note'
      ),
      multi(
        'm-st-x-s1',
        'Principles',
        'Which principles should the new pack follow? Tick all that apply.',
        [
          'A one-page summary up front with the few things the board must know or decide',
          'Exceptions highlighted: what is off track, and what’s being done',
          'The same metrics, in the same place, every month',
          'Every team gets equal space',
          'More pages so nothing is left out',
        ],
        [0, 1, 2],
        { taskId: 'm-st-x-s' }
      ),
      written(
        'm-st-x-s2',
        'Your Proposal',
        'Write your proposal to the CEO for the new pack.',
        [
          'Page 1: the few KPIs against target and the decisions needed, readable in ten minutes',
          'Exceptions and risks (like cash) called out on page 1 or 2, not buried',
          'Detail moved to an appendix the board can dip into',
          'Owners and a fixed structure across the four teams',
          'Tests it, e.g. with the chair, and checks it works after a couple of months',
        ],
        `Page 1 becomes the pack: eight KPIs against target with a red/amber/green status, the two or three things the board must decide, and anything off track, like last quarter's cash warning, with what we're doing about it. Page 2 is one short paragraph per team on what changed and why. Everything else moves to an appendix, in the same order every month, for anyone who wants to dig. Each team owns its numbers; I'll own the summary and check nothing material is left in the appendix. I'd test the first version with the chair, then ask the board after two meetings whether it's working.`,
        { taskId: 'm-st-x-s' }
      )
    ),
  ],
};

// ---------- Statistics ----------
export const STATS_MODULE: ModuleSkeleton = {
  familyId: 'test-stats-01',
  aspects: [
    { id: 'describe', name: 'Describing Data', summary: 'Averages, spread and the traps in summarising.' },
    { id: 'prob', name: 'Probability', summary: 'Chances, base rates and coincidences.' },
    { id: 'infer', name: 'Inference', summary: 'Samples, confidence intervals and significance.' },
    { id: 'case', name: 'Statistics Cases', summary: 'Real numbers: is the difference real, and does it matter?' },
  ],
  tags: {},
  bank: [
    ...tagged('describe', B, short('m-sta-d-b1', 'Mean', 'What is the mean of 2, 4, 4 and 10?', ['5', '5.0'])),
    ...tagged(
      'describe',
      J,
      choice(
        'm-sta-d-j1',
        'Typical Salary',
        'A team’s salaries include two very high earners. Which best describes a typical salary?',
        ['The median', 'The mean', 'The maximum', 'The total'],
        0
      )
    ),
    ...tagged(
      'describe',
      P,
      short(
        'm-sta-d-p1',
        'Within One SD',
        'Scores are roughly normal with mean 100 and standard deviation 15.\n\nAbout what % fall between 85 and 115?',
        ['68%', '68', '68.3', '0.68']
      )
    ),
    ...tagged(
      'describe',
      S,
      choice(
        'm-sta-d-s1',
        'Better Everywhere, Worse Overall',
        'Site B converts better than site A on mobile and on desktop, yet worse overall. How?',
        [
          'Simpson’s paradox: B gets far more mobile traffic, which converts worse; compare within each device or adjust for the mix',
          'A calculation error',
          'Overall rates can’t differ from the parts',
          'B’s data must be fake',
        ],
        0
      )
    ),
    ...tagged('prob', B, short('m-sta-p-b1', 'A Die', 'A fair six-sided die is rolled. What is the chance of an even number, as a %?', ['50%', '50', '0.5', '1/2'])),
    ...tagged(
      'prob',
      J,
      short('m-sta-p-j1', 'Both at Once', 'Two independent events each have a 10% chance. What’s the chance both happen, as a %?', ['1%', '1', '0.01'])
    ),
    ...tagged(
      'prob',
      P,
      short(
        'm-sta-p-p1',
        'A Positive Test',
        '1% of people have a condition. A test catches 90% of those who have it, and wrongly flags 9% of those who don’t.\n\nSomeone tests positive. What’s the chance they have it, as a %? (One decimal place.)',
        ['9.2%', '9.2', '9.17', '9.17%']
      )
    ),
    ...tagged(
      'prob',
      S,
      choice(
        'm-sta-p-s1',
        'One in a Thousand',
        'Out of 1,000 stores, one had a sales week so unusual it would happen by chance only once in 1,000 store-weeks. The regional manager wants to copy whatever that store did. What do you say?',
        [
          'With 1,000 stores, one such week is expected by chance; look for a cause and see if it repeats before copying anything',
          'It’s a 1-in-1,000 result, so it must be real',
          'Copy it in every store now',
          'Close the store for investigation',
        ],
        0
      )
    ),
    ...tagged(
      'infer',
      B,
      choice(
        'm-sta-i-b1',
        'Sample and Population',
        'You survey 500 of a company’s 20,000 customers. Which is right?',
        ['The 500 are the sample; the 20,000 are the population you want to learn about', 'The 500 are the population', 'The 20,000 are the sample', 'They’re the same'],
        0
      )
    ),
    ...tagged(
      'infer',
      J,
      choice(
        'm-sta-i-j1',
        'A 95% Interval',
        'Average spend is £40, with a 95% confidence interval of £37 to £43. What does it mean?',
        [
          'The true average is plausibly anywhere from £37 to £43; intervals made this way contain the true value 95% of the time',
          '95% of customers spend between £37 and £43',
          'The average is exactly £40, 95% of the time',
          'There’s a 5% chance the data is wrong',
        ],
        0
      )
    ),
    ...tagged(
      'infer',
      P,
      short(
        'm-sta-i-p1',
        'Margin of Error',
        'A sample of 100 has mean 50 and standard deviation 10.\n\nWhat is the 95% margin of error (±), to one decimal place?',
        ['2.0', '2', '1.96', '±2']
      )
    ),
    ...tagged(
      'infer',
      S,
      choice(
        'm-sta-i-s1',
        'Significant but Tiny',
        'A test on 2 million users finds a 0.05% lift in conversion, p < 0.001. The change costs £300k a year to maintain. What do you advise?',
        [
          'It’s almost certainly real but tiny; work out what 0.05% is worth in money and compare with £300k before deciding',
          'p < 0.001, so ship it',
          'It isn’t real because the lift is small',
          'Run it again with more users',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-sta-c-b1', 'Median', 'What is the median of 3, 8, 1, 6 and 10?', ['6'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-sta-c-j',
        'Satisfaction Scores',
        `Five customer scores (out of 10) from each store:

Store A:  7, 8, 8, 9, 8
Store B:  4, 10, 10, 9, 7`,
        'Survey'
      ),
      short('m-sta-c-j1', 'Store B’s Mean', 'What is store B’s mean score?', ['8', '8.0'], { taskId: 'm-sta-c-j' }),
      choice(
        'm-sta-c-j2',
        'More Consistent',
        'Which store gives a more consistent experience?',
        ['A: its scores are spread much less', 'B: it has more 10s', 'They’re the same, since the means are equal', 'B: it has a higher maximum'],
        0,
        { taskId: 'm-sta-c-j' }
      ),
      written(
        'm-sta-c-j3',
        'For the Manager',
        'The area manager says the stores perform the same. What do you tell them?',
        [
          'The averages are the same (8), but B’s scores vary much more (4 to 10 vs 7 to 9)',
          'B has an unhappy tail worth investigating, e.g. what happened to the customer who gave 4',
          'Five responses per store is far too few to conclude anything firm',
          'Suggests collecting more responses and tracking spread or the share of low scores, not just the average',
        ],
        `On average they're the same, 8 out of 10, but they don't feel the same. Store A is consistent: everyone scored 7 to 9. Store B delights some customers and lets others down: two 10s, but also a 4. I'd find out what went wrong for that customer. That said, five responses a store is far too few to judge; I'd gather a few weeks' worth and track the share of scores below 6 alongside the average.`,
        { taskId: 'm-sta-c-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-sta-c-p',
        'Delivery Promise',
        `We promise delivery within 3 days. From a random sample of 1,000 recent deliveries:

Mean        2.4 days
Median      2.0 days
Within 3    820 deliveries`,
        'Operations data'
      ),
      short('m-sta-c-p1', 'Promise Kept', 'What % of deliveries met the promise?', ['82%', '82', '0.82'], { taskId: 'm-sta-c-p' }),
      short(
        'm-sta-c-p2',
        'Margin of Error',
        'What is the 95% margin of error on that %, in percentage points? (One decimal place.)',
        ['2.4', '±2.4', '2.4 pp', '2.38'],
        { taskId: 'm-sta-c-p' }
      ),
      written(
        'm-sta-c-p3',
        'For Operations',
        'The operations manager says “average delivery is 2.4 days, so we’re keeping our 3-day promise.” Reply.',
        [
          'The average hides the late ones: about 18% (roughly 16% to 20%) miss the promise',
          'Mean above median shows a long tail of slow deliveries',
          'The promise is about each delivery, so the % on time (or a high percentile) is the right measure',
          'Suggests looking at the late deliveries for causes, and a target such as 95% on time',
        ],
        `The average is fine, but the promise is made to every customer, and 18% of them got their parcel late: somewhere between about 16% and 20% once you allow for sampling. The mean being higher than the median tells us there's a long tail of slow deliveries dragging it up. I'd track "% delivered within 3 days" instead of the average, set a target like 95%, and dig into the late 18% by region and courier to find what's causing them.`,
        { taskId: 'm-sta-c-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-sta-c-s',
        'The Staffing Pilot',
        `10 stores got an extra member of staff at weekends for a quarter. 10 similar stores didn't.

Sales growth on last year:
Pilot stores     +6%
Other stores     +4%

Store-to-store standard deviation of growth: about 5 points in each group.

Rolling it out to all 200 stores would cost £2m a year.`,
        'Pilot results'
      ),
      short('m-sta-c-s1', 'The Effect', 'What is the estimated effect of the extra staff on growth, in percentage points?', ['2', '+2', '2 pp', '2%'], { taskId: 'm-sta-c-s' }),
      short(
        'm-sta-c-s2',
        'Standard Error',
        'What is the standard error of the difference between the two group means, in points? (One decimal place.)',
        ['2.2', '2.24'],
        { taskId: 'm-sta-c-s' }
      ),
      written(
        'm-sta-c-s3',
        'Roll It Out?',
        'The retail director wants to roll it out to all 200 stores. What do you advise?',
        [
          'The 2-point difference is about one standard error, well within noise (roughly −2.4 to +6.4 points at 95%)',
          'So the pilot can’t show whether the staff helped',
          'Weighs the cost: £2m a year needs a meaningful sales gain to pay back',
          'Recommends a bigger or longer test, e.g. more stores randomly assigned, sized to detect an effect worth £2m',
        ],
        `Not yet. The pilot stores grew 2 points faster, but with 10 stores a side and growth varying by about 5 points between stores, the standard error of that difference is about 2.2 points. So the true effect could be anything from roughly −2 to +6 points; we can't tell it apart from luck. With £2m a year at stake, I'd run a bigger test: 40 or 50 stores randomly given extra staff, for two quarters, sized so that an effect big enough to pay back £2m would show up clearly.`,
        { taskId: 'm-sta-c-s' }
      )
    ),
  ],
};

// ---------- Simulation: online returns ----------
export const RETURNS_SIM_MODULE: ModuleSkeleton = {
  familyId: 'test-sim-da-02',
  aspects: [
    { id: 'scope', name: 'Scoping the Question', summary: 'Turning a vague worry into questions data can answer.' },
    { id: 'analysis', name: 'Analysis', summary: 'Measuring returns fairly, and separating causes from coincidences.' },
    { id: 'recommend', name: 'Recommendations', summary: 'Costing the problem and recommending what to do.' },
    { id: 'case', name: 'The Returns Problem', summary: 'Work through the retailer’s data, one stage at a time.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'scope',
      B,
      choice(
        'm-ret-s-b1',
        'Out of Control',
        'The ops director says “returns are out of control.” What do you do first?',
        [
          'Pin down what they mean: return rate by orders or by value, over what period, compared with what, and what decision it’s for',
          'Pull every returns record ever',
          'Start building a dashboard',
          'Agree that they are',
        ],
        0
      )
    ),
    ...tagged(
      'scope',
      J,
      choice(
        'm-ret-s-j1',
        'Measuring the Rate',
        'Returns arrive up to 30 days after the order. How should the monthly return rate be measured?',
        [
          'By order month: returns from that month’s orders divided by that month’s orders',
          'Returns received this month divided by orders this month',
          'Returns received this month divided by all orders ever',
          'Returns divided by customers',
        ],
        0
      )
    ),
    ...tagged(
      'scope',
      P,
      choice(
        'm-ret-s-p1',
        'Everything by Friday',
        'You’re asked to “analyse everything about returns by Friday.” What’s the best move?',
        [
          'Agree two or three questions that matter most, and share a first answer to them by Friday',
          'Try to cover everything',
          'Say it can’t be done',
          'Send raw data on Friday',
        ],
        0
      )
    ),
    ...tagged(
      'scope',
      S,
      choice(
        'm-ret-s-s1',
        'Where to Start',
        'You have ten possible causes of rising returns and two weeks. How do you plan?',
        [
          'Rank them by how much they could explain and how quickly data can test them; test the top few first',
          'Investigate all ten equally',
          'Start with the most interesting one',
          'Pick one at random',
        ],
        0
      )
    ),
    ...tagged('analysis', B, short('m-ret-a-b1', 'Return Rate', '2,000 orders; 240 were returned.\n\nWhat is the return rate, as a %?', ['12%', '12', '0.12'])),
    ...tagged(
      'analysis',
      J,
      choice(
        'm-ret-a-j1',
        'Fixed Already?',
        'Last week’s orders show a 3% return rate, against a usual 12%. Has the problem been fixed?',
        ['Probably not: most of last week’s returns haven’t arrived yet; compare orders of the same age', 'Yes', 'Returns are seasonal', 'The data is wrong'],
        0
      )
    ),
    ...tagged(
      'analysis',
      P,
      choice(
        'm-ret-a-p1',
        'New Customers',
        'Dresses have the highest return rate. But dresses also sell to far more first-time customers, who return more of everything. What do you do?',
        [
          'Compare return rates within customer type (new vs returning) before blaming dresses',
          'Conclude dresses are the problem',
          'Stop selling to new customers',
          'Ignore customer type',
        ],
        0
      )
    ),
    ...tagged(
      'analysis',
      S,
      choice(
        'm-ret-a-s1',
        'Did the Size Guide Work?',
        'A size guide was added to some products in May. How do you measure its effect on returns?',
        [
          'Compare the change in return rate before and after May for products with the guide against the change for similar products without it',
          'Compare returns before and after May for all products',
          'Ask customers whether they used it',
          'Compare products with the guide against those without, after May only',
        ],
        0
      )
    ),
    ...tagged(
      'recommend',
      B,
      choice(
        'm-ret-r-b1',
        'A Good Recommendation',
        'What should a recommendation include?',
        ['What to do, the expected impact, and the next step', 'Every chart you made', 'Only the problem', 'A list of open questions'],
        0
      )
    ),
    ...tagged(
      'recommend',
      J,
      multi(
        'm-ret-r-j1',
        'Cost of a Return',
        'Which belong in the cost of a return? Tick all that apply.',
        ['Return postage', 'Handling and inspection', 'Items that can’t be resold', 'The original product cost of items resold at full price', 'Customer service contacts'],
        [0, 1, 2, 4]
      )
    ),
    ...tagged(
      'recommend',
      P,
      choice(
        'm-ret-r-p1',
        'A Stricter Policy',
        'A stricter returns policy would cut returns but might cost sales. What do you recommend?',
        [
          'Test it on a region or customer segment first and measure the effect on profit, not just returns',
          'Roll it out everywhere tomorrow',
          'Never change the policy',
          'Ask competitors what they do and copy it',
        ],
        0
      )
    ),
    ...tagged(
      'recommend',
      S,
      choice(
        'm-ret-r-s1',
        'Uncertain Savings',
        'You estimate a change saves £150k–£400k a year. How do you present it to the exec team?',
        [
          'Give the range and the assumptions driving it, show it’s worth doing even at the low end (or what would need to be true), and propose how to confirm it',
          'Say £400k',
          'Say £275k, the midpoint',
          'Wait until you’re certain',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-ret-c-b1', 'Returns Cost', 'Each return costs £8 to process. There were 500 returns.\n\nWhat did they cost, in £?', ['4000', '4,000', '4k'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-ret-c-j',
        'Returns by Category',
        `Last month (orders old enough for all returns to be in):

Category      Orders   Returns   Average order
Dresses       4,000    1,200     £60
Shoes         3,000    450       £70
Accessories   3,000    150       £25`,
        'Returns data'
      ),
      short('m-ret-c-j1', 'Overall Rate', 'What is the overall return rate, as a %?', ['18%', '18', '0.18'], { taskId: 'm-ret-c-j' }),
      short('m-ret-c-j2', 'Dresses', 'What is the return rate for dresses, as a %?', ['30%', '30', '0.3'], { taskId: 'm-ret-c-j' }),
      written(
        'm-ret-c-j3',
        'Where to Focus',
        'Where should the business focus, and why?',
        [
          'Dresses: 30% return rate, and two-thirds of all returns (1,200 of 1,800)',
          'Shoes are 15% and accessories 5%, much less of the problem',
          'Suggests likely causes to check for dresses, e.g. sizing and fit, and what data would confirm it (return reasons)',
          'Names a next step, e.g. look at return reasons by size or product',
        ],
        `Dresses. A 30% return rate means two-thirds of all returns (1,200 of 1,800) come from one category; shoes are 15% and accessories just 5%. With dresses the usual cause is fit, so I'd pull return reasons and rates by product and size next. If "too small" or "too big" dominates, better sizing information is the obvious first fix.`,
        { taskId: 'm-ret-c-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-ret-c-p',
        'The Size Guide',
        `A size guide was added to some dresses at the start of May.

Return rate          Mar–Apr   Jun–Jul
Dresses with guide   32%       26%
Dresses without      30%       28%

Dresses with the guide get 2,000 orders a month. Each return costs £10.`,
        'Before and after'
      ),
      short(
        'm-ret-c-p1',
        'The Guide’s Effect',
        'What is the estimated effect of the guide on the return rate, in percentage points?',
        ['-4', '4', '-4 pp', '4 pp', '4 points'],
        { taskId: 'm-ret-c-p' }
      ),
      short('m-ret-c-p2', 'Monthly Saving', 'At that effect, what does the guide save each month on those dresses, in £?', ['800', '£800'], { taskId: 'm-ret-c-p' }),
      written(
        'm-ret-c-p3',
        'Should It Go Everywhere?',
        'Should the guide be added to every dress? Make your case.',
        [
          'The guide cut returns by about 4 points beyond the general fall (6 points vs 2 for dresses without it)',
          'The naive before/after (6 points) overstates it; the 2-point fall elsewhere shows something else changed too',
          'Worth about £800 a month on 2,000 orders, more if rolled out to other dresses (plus resaleable stock and happier customers)',
          'Recommends rolling out, with a check that guided and unguided dresses were similar to begin with, and continued tracking',
        ],
        `Yes. Returns on dresses with the guide fell 6 points, but dresses without it also fell 2 points over the same months, so the guide's own effect is about 4 points. That's £800 a month on the 2,000 orders that have it, before counting stock we can resell and fewer unhappy customers. Adding it to the other dresses should save proportionally more. I'd check the guided dresses weren't unusual to begin with, roll it out, and keep a few dresses without it for a month to confirm the effect holds.`,
        { taskId: 'm-ret-c-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-ret-c-s',
        'A £3 Returns Charge',
        `One region tested a £3 charge per return (previously free) for a month.

Per month           Before     With the charge
Orders              10,000     9,600
Return rate         20%        15%

Each kept order earns £15 margin. Each return costs £8 to handle, and the £3 charge is kept by the business.`,
        'Test results'
      ),
      short('m-ret-c-s1', 'Before', 'What was monthly profit before the charge, in £ (kept-order margin minus return costs)?', ['104000', '104,000', '104k'], { taskId: 'm-ret-c-s' }),
      short(
        'm-ret-c-s2',
        'With the Charge',
        'What is monthly profit with the charge, in £ (kept-order margin minus return costs plus charges)?',
        ['115200', '115,200', '115.2k'],
        { taskId: 'm-ret-c-s' }
      ),
      written(
        'm-ret-c-s3',
        'Your Recommendation',
        'Write your recommendation to the exec team.',
        [
          'Profit rose about £11,200 a month (about 11%) in the test region despite 4% fewer orders',
          'Risks: one region and one month; customers may shop less over time, so lifetime value could fall; competitors offer free returns',
          'Recommends a wider, longer test (or phased rollout) tracking repeat purchase and customer satisfaction',
          'Considers options such as keeping free returns for loyal customers or exchanges',
        ],
        `The charge looks worth it: in the test region, profit rose from £104,000 to £115,200 a month, about £11,200 or 11%, even though orders fell 4%. Fewer returns and the £3 charges more than covered the lost sales. But it's one region for one month, and the risk is slow: customers who dislike the charge may quietly buy less over the next year. I recommend extending the test to three regions for three months, tracking repeat purchase and satisfaction as well as profit, and keeping returns free for exchanges and our best customers. If repeat purchase holds up, roll it out.`,
        { taskId: 'm-ret-c-s' }
      )
    ),
  ],
};

export const ANALYST_SKILL_MODULES = [CLEANING_2_MODULE, STORY_MODULE, STATS_MODULE, RETURNS_SIM_MODULE];
