import { AssessmentTest, Question } from '../../types';
import { workbookStarter } from '../../lib/spreadsheet';
import { choice, match, multi, order, short, written } from '../questionKit';
import { fractionOrPercent, round2, seeded, sum, tc } from '../simulationKit';
import { J, P, S, ModuleSkeleton, tagged } from './kit';
import { roleMain } from './roleKit';

// Data analysis fundamentals: the principles under every analyst's work, whatever the tool. Asking the right question,
// trusting the data, summarising it, drawing conclusions that hold, and telling people what it means. From Mid-level,
// the candidate works a real spreadsheet. The Data Analyst track is this test and the Ridgeway Coffee job simulation.

const DA: ['Data Analyst'] = ['Data Analyst'];

export const DATA_FUNDAMENTALS_TEST: AssessmentTest = {
  ...roleMain(
    'test-dafund-01',
    'Data Analysis Fundamentals',
    'Data Analysis',
    'The core principles of data analysis, in any tool: framing the question and its metric, checking the data, summarising it with the right numbers, drawing conclusions that hold up, and communicating them. From Mid-level, analyse real data in a working spreadsheet.',
    ['Data Analysis', 'Data Quality', 'Statistics', 'Critical Thinking', 'Data Visualisation'],
    DA
  ),
  scenario: {
    company: 'Hartwell Home',
    role: 'Data Analyst',
    brief: `Hartwell Home is an online homeware shop. You're its data analyst, and people across the business bring you their questions.

The spreadsheet tasks use Hartwell's own exports, which nobody has checked.`,
  },
};

// ---------- Mid-level task: a week of orders ----------

const REGIONS = ['North', 'South', 'East', 'West'];
interface Order {
  id: string;
  date: string;
  customer: string;
  region: string;
  value: number;
}

const ORDERS: Order[] = (() => {
  const rand = seeded(7310);
  const list: Order[] = Array.from({ length: 36 }, (_, i) => ({
    id: `HH-${4101 + i}`,
    date: `2026-10-${String(12 + Math.floor(i / 6)).padStart(2, '0')}`,
    customer: `C${String(200 + Math.floor(rand() * 700)).padStart(4, '0')}`,
    region: REGIONS[Math.floor(rand() * REGIONS.length)],
    value: round2(18 + rand() * 72),
  }));
  // One trade customer's bulk order: real, and far above the rest
  list[20] = { ...list[20], customer: 'C0418', region: 'North', value: 1240 };
  return list;
})();
const TEST_ORDERS: Order[] = [
  { id: 'HH-TEST-1', date: '2026-10-13', customer: 'TEST ACCOUNT', region: 'South', value: 1 },
  { id: 'HH-TEST-2', date: '2026-10-15', customer: 'TEST ACCOUNT', region: 'South', value: 1 },
];
const DUPLICATED = ['HH-4105', 'HH-4113', 'HH-4128'];
// As exported: the duplicates sit straight after their originals, and the test orders mid-file
const EXPORT_ROWS: Order[] = ORDERS.flatMap((o, i) => [o, ...(DUPLICATED.includes(o.id) ? [o] : []), ...(i === 9 ? [TEST_ORDERS[0]] : i === 24 ? [TEST_ORDERS[1]] : [])]);

const values = ORDERS.map((o) => o.value);
const REVENUE = round2(sum(values));
const MEAN = REVENUE / ORDERS.length;
const MEDIAN = (() => {
  const s = [...values].sort((a, b) => a - b);
  return (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
})();
const NORTH = round2(sum(ORDERS.filter((o) => o.region === 'North').map((o) => o.value)));
const money = (n: number) => `£${n.toFixed(2)}`;

const SHEET_P: Question = {
  id: 'm-daf-sim-p1',
  title: 'A Week of Orders',
  type: 'sheet',
  contextData: 'orders_week42.xlsx',
  prompt: `Priya in Finance wants last week's numbers from the Orders sheet, the website's raw export. Before you report anything, make sure every order is real and counted once: the export can repeat an order (the same Order ID on two identical rows), and the web team's test orders come from the customer TEST ACCOUNT.

Fill in column B of the Summary sheet, for real orders only:
• B2: the number of orders
• B3: total revenue
• B4: the mean order value
• B5: the median order value
• B6: revenue from the North region

Use formulas or clean the data first, as you like. Leave the values as plain numbers (no rounding needed).`,
  starterCode: workbookStarter([
    { name: 'Orders', rows: [['Order ID', 'Date', 'Customer', 'Region', 'Order Value'], ...EXPORT_ROWS.map((o) => [o.id, o.date, o.customer, o.region, o.value])] },
    { name: 'Summary', rows: [['Measure', 'Value'], ['Orders'], ['Total revenue'], ['Mean order value'], ['Median order value'], ['North revenue']] },
  ]),
  testCases: [
    tc('tc-daf-p-1', 'Orders are counted once each, without test orders', '=Summary!B2', String(ORDERS.length)),
    tc('tc-daf-p-2', 'Total revenue is right', '=Summary!B3', String(REVENUE)),
    tc('tc-daf-p-3', 'Mean order value is right', '=Summary!B4', String(MEAN)),
    tc('tc-daf-p-4', 'Median order value is right', '=Summary!B5', String(MEDIAN)),
    tc('tc-daf-p-5', 'North revenue is right', '=Summary!B6', String(NORTH)),
  ],
  timeLimitMinutes: 10,
  weight: 40,
};

// ---------- Senior task: an A/B test split by device ----------

// Checkout B beats A on desktop and on mobile, but B's traffic was mostly mobile (which converts less), so overall it
// looks worse: Simpson's paradox, and a sign the split itself was broken
const RATES = { Desktop: { A: 0.06, B: 0.066 }, Mobile: { A: 0.02, B: 0.023 } } as const;
const SHARE_DESKTOP = { A: 0.7, B: 0.25 } as const;
interface ExpRow {
  date: string;
  variant: 'A' | 'B';
  device: 'Desktop' | 'Mobile';
  visitors: number;
  orders: number;
}
const EXP: ExpRow[] = (() => {
  const rand = seeded(9021);
  const rows: ExpRow[] = [];
  for (let d = 0; d < 14; d++) {
    for (const variant of ['A', 'B'] as const) {
      const total = 1900 + Math.floor(rand() * 200);
      for (const device of ['Desktop', 'Mobile'] as const) {
        const visitors = Math.round(total * (device === 'Desktop' ? SHARE_DESKTOP[variant] : 1 - SHARE_DESKTOP[variant]));
        const orders = Math.round(visitors * RATES[device][variant] * (0.92 + rand() * 0.16));
        rows.push({ date: `2026-09-${String(1 + d).padStart(2, '0')}`, variant, device, visitors, orders });
      }
    }
  }
  return rows;
})();
const conv = (variant: 'A' | 'B', device?: 'Desktop' | 'Mobile') => {
  const rows = EXP.filter((r) => r.variant === variant && (!device || r.device === device));
  return sum(rows.map((r) => r.orders)) / sum(rows.map((r) => r.visitors));
};

const SHEET_S: Question = {
  id: 'm-daf-sim-s1',
  title: 'Did the New Checkout Lose?',
  type: 'sheet',
  contextData: 'checkout_test_sept.xlsx',
  prompt: `Hartwell ran a two-week test of a new checkout (B) against the old one (A). The Daily sheet has visitors and orders by day, variant and device. The product manager says "B lost, overall conversion went down" and wants to drop it.

On the Results sheet, by formula from the Daily sheet, fill in conversion (orders ÷ visitors, as a fraction) for each variant:
• B2 and B3: overall, for A and B
• C2 and C3: on desktop
• D2 and D3: on mobile
• E2 and E3: the share of each variant's visitors who were on desktop`,
  starterCode: workbookStarter([
    { name: 'Daily', rows: [['Date', 'Variant', 'Device', 'Visitors', 'Orders'], ...EXP.map((r) => [r.date, r.variant, r.device, r.visitors, r.orders])] },
    { name: 'Results', rows: [['Variant', 'Overall conversion', 'Desktop conversion', 'Mobile conversion', 'Desktop share of visitors'], ['A'], ['B']] },
  ]),
  testCases: [
    tc('tc-daf-s-1', "A's overall conversion is right", '=Results!B2', fractionOrPercent(conv('A'))),
    tc('tc-daf-s-2', "B's overall conversion is right", '=Results!B3', fractionOrPercent(conv('B'))),
    tc('tc-daf-s-3', 'Desktop conversion is right for both', '=AND(ABS(Results!C2-' + conv('A', 'Desktop') + ')<0.0005,ABS(Results!C3-' + conv('B', 'Desktop') + ')<0.0005)', 'TRUE'),
    tc('tc-daf-s-4', 'Mobile conversion is right for both', '=AND(ABS(Results!D2-' + conv('A', 'Mobile') + ')<0.0005,ABS(Results!D3-' + conv('B', 'Mobile') + ')<0.0005)', 'TRUE'),
    tc(
      'tc-daf-s-5',
      "Each variant's desktop share is right",
      `=AND(ABS(Results!E2-${sum(EXP.filter((r) => r.variant === 'A' && r.device === 'Desktop').map((r) => r.visitors)) / sum(EXP.filter((r) => r.variant === 'A').map((r) => r.visitors))})<0.0005,ABS(Results!E3-${
        sum(EXP.filter((r) => r.variant === 'B' && r.device === 'Desktop').map((r) => r.visitors)) / sum(EXP.filter((r) => r.variant === 'B').map((r) => r.visitors))
      })<0.0005)`,
      'TRUE'
    ),
    tc('tc-daf-s-6', 'Results are worked out by formula', '=AND(ISFORMULA(Results!B2),ISFORMULA(Results!C3),ISFORMULA(Results!D3))', 'TRUE'),
  ],
  timeLimitMinutes: 12,
  weight: 45,
};

// ---------- The module ----------

export const DATA_FUNDAMENTALS_MODULE: ModuleSkeleton = {
  familyId: 'test-dafund-01',
  aspects: [
    { id: 'question', name: 'The Question & the Metric', summary: 'Turning a vague request into a question data can answer, measured the right way.' },
    { id: 'quality', name: 'Data Quality', summary: 'Checking the data can be trusted before anything is built on it.' },
    { id: 'summary', name: 'Summarising Data', summary: 'Averages, percentages, rates and spread: the right number for the job.' },
    { id: 'conclusions', name: 'Drawing Conclusions', summary: 'Telling cause from coincidence, and comparing like with like.' },
    { id: 'communicate', name: 'Communicating Findings', summary: 'Charts and summaries that are honest, clear and lead to a decision.' },
    { id: 'sim', name: 'Hands-on: Real Data', summary: 'Cleaning and analysing an export in a working spreadsheet.' },
  ],
  tags: {},
  maxMinutes: 20,
  onlyLevel: 'Professional',
  bank: [
    // ----- The Question & the Metric -----
    ...tagged(
      'question',
      J,
      choice(
        'm-daf-q-j1',
        'Before You Open the Data',
        'The marketing manager asks you to "look into our customers". What should you do first?',
        [
          'Ask what decision they need to make, so you know which question the analysis has to answer',
          'Pull every customer table and look for anything interesting',
          'Build a dashboard of every customer metric you can find',
          'Send them the customer list so they can look themselves',
        ],
        0
      ),
      choice(
        'm-daf-q-j2',
        'Defining Active',
        'Two teams report different numbers of "active customers" for the same month. What is the most likely cause?',
        [
          'They define "active" differently (for example, logged in versus bought something, or in 30 days versus 90)',
          'One of the databases is broken',
          'One team rounded its figures',
          'The month had a bank holiday in it',
        ],
        0
      ),
      short(
        'm-daf-q-j3',
        'Rate, Not Count',
        'Store A had 120 returns from 2,400 orders. Store B had 90 returns from 1,000 orders. Which store has the higher return rate? (A or B.)',
        ['b', 'store b']
      )
    ),
    ...tagged(
      'question',
      P,
      match(
        'm-daf-q-p1',
        'The Right Measure',
        'Match each question to the measure that answers it best.',
        [
          ['Is the new onboarding helping people stay?', 'Share of sign-ups still active after 30 days'],
          ['Are customers spending more per visit?', 'Average order value'],
          ['Is the checkout putting people off?', 'Share of started checkouts that complete'],
          ['Is support keeping up?', 'Median time to first reply'],
        ]
      ),
      written(
        'm-daf-q-p2',
        'Is the App Doing Well?',
        'The CEO asks: "Is the new app doing well?" Before you start, write what you would ask or decide to turn this into a question you can answer with data.',
        [
          'Asks what "doing well" means for the decision behind the question (what will they do with the answer)',
          'Picks or proposes a specific metric (e.g. repeat purchases, conversion, retention) rather than downloads or anything available',
          'Sets a comparison: against what (the website, the plan, before launch, last month)',
          'Fixes the period and the customers it covers',
        ],
        'First, what decision is this for (keep investing, cut it, fix something)? Then agree what "doing well" means: say, the share of app users who buy again within 30 days and conversion per session, not downloads. Compare it with something: the website over the same period and the launch plan. Fix the period (the 8 weeks since launch) and who counts (customers who installed it, excluding staff and test accounts).',
        { minutes: 5 }
      )
    ),
    ...tagged(
      'question',
      S,
      written(
        'm-daf-q-s1',
        'Hitting the Target',
        "Support's target is \"average handle time under 6 minutes\". It has dropped from 8 to 5 minutes since it was set, and the team is celebrating. What might be going on, and what would you measure alongside it?",
        [
          'Recognises that a target can be hit in ways that hurt the real goal (a metric that becomes a target stops measuring well)',
          'Gives a concrete way it could be gamed: rushing or closing tickets early, transferring or deflecting hard cases',
          'Proposes a balancing measure such as repeat contacts / reopen rate or customer satisfaction',
          'Suggests checking the data for the change (e.g. distribution of handle times, reopen rate before and after)',
        ],
        'Once handle time became the target, people can hit it without serving customers better: closing tickets before they are solved, transferring the hard ones, or asking customers to write in again. I would put it beside the share of tickets reopened or contacted again within 7 days, and customer satisfaction, and look at the distribution of handle times before and after (a spike just under 6 minutes, or more 1-minute tickets, would show gaming).'
      ),
      choice(
        'm-daf-q-s2',
        'Which Revenue?',
        'Finance says October revenue was £412k; your dashboard says £447k. Both come from the same orders table. What is the first thing to check?',
        [
          'How each defines revenue: before or after refunds and discounts, with or without VAT, by order date or payment date',
          'Which of the two numbers is more recent',
          'Whether the dashboard needs to be rebuilt in a different tool',
          'Average the two and report £430k',
        ],
        0
      )
    ),

    // ----- Data Quality -----
    ...tagged(
      'quality',
      J,
      multi(
        'm-daf-dq-j1',
        'First Checks',
        'You receive a new export of orders. Which checks should you run before analysing it? Tick all that apply.',
        [
          'Rows that appear more than once',
          'Blank or impossible values (negative quantities, dates in the future)',
          'Whether the dates cover the whole period you need',
          'Categories spelled more than one way ("North", "north ", "Nrth")',
          'Sort by value so the biggest orders come first',
        ],
        [0, 1, 2, 3]
      ),
      choice(
        'm-daf-dq-j2',
        'Blank Cells',
        'A survey has 500 replies; 60 left "age" blank. What should you do with them?',
        [
          'Keep them, report how many are missing, and see whether the blanks differ from the rest before deciding',
          'Delete the 60 rows from the whole analysis',
          'Fill every blank with the average age',
          'Fill every blank with 0',
        ],
        0
      )
    ),
    ...tagged(
      'quality',
      P,
      choice(
        'm-daf-dq-p1',
        'The Join That Grew',
        'You join 1,000 orders to a customers table on customer ID, and the result has 1,180 rows. What has most likely happened?',
        [
          'Some customer IDs appear more than once in the customers table, so their orders were repeated',
          'The join added the customers who never ordered',
          'The orders table had blank rows',
          'Joins always add a few rows; it is nothing to worry about',
        ],
        0
      ),
      written(
        'm-daf-dq-p2',
        'The Outlier',
        "One order in last week's data is £12,400; most are £20 to £90. What do you do before reporting the week's numbers?",
        [
          "Checks whether it's real (a trade or bulk order, a typo, a test, a currency or unit error) before deciding anything",
          "Doesn't silently delete it: keeps a real order and fixes or excludes an error, saying which",
          'Considers its effect: it moves the mean and the total, not the median, so reports the median or shows it separately',
          'Tells the reader about it in the report',
        ],
        'Find out whether it is real: look at the order (customer, items, quantity) and ask sales. If it was a mistake (an extra zero, a test), correct or exclude it and say so. If it is a real bulk order, keep it in total revenue but give the median as the typical order, or show the order separately, and mention it so nobody reads the jump as a trend.',
        { minutes: 5 }
      )
    ),
    ...tagged(
      'quality',
      S,
      written(
        'm-daf-dq-s1',
        'The Dip That Wasn’t',
        "Daily sign-ups fell 40% on 3 November and have stayed down. Marketing is about to cut a campaign because of it. Before anyone acts, how would you work out whether the fall is real or a data problem?",
        [
          'Checks the pipeline first: tracking or tagging changes, a site release, a broken or delayed feed, a changed definition',
          'Compares against an independent source (e.g. accounts created in the product database versus tracked sign-ups)',
          'Breaks it down by platform, browser, channel or country to see if the drop is concentrated in one place',
          'Advises holding the decision until it is confirmed, and says what result would show it is real',
        ],
        'A sudden step that stays down is often a tracking problem. I would check what changed on 3 November (a release, a cookie banner, a new tag manager setup, a changed definition), compare tracked sign-ups with accounts actually created in the database, and split the fall by device, browser and channel: if it is all one browser or the app, it is likely tracking. I would ask marketing to wait a day; if the database shows the same fall across every segment, it is real.'
      ),
      choice(
        'm-daf-dq-s2',
        'Reconciling',
        'Your monthly report and the finance ledger differ by 0.3% on revenue. What is the right way to handle it?',
        [
          'Find and explain the gap (timing, refunds, currency), document it, and agree which number is the source of truth',
          'Ignore it, since 0.3% is too small to matter',
          'Adjust your figures to match finance without finding out why',
          'Publish both and let readers pick',
        ],
        0
      )
    ),

    // ----- Summarising Data -----
    ...tagged(
      'summary',
      J,
      choice(
        'm-daf-sum-j1',
        'Typical Salary',
        'At a 20-person company, 19 people earn £25k to £40k and the founder earns £400k. Which number best describes a typical salary?',
        ['The median', 'The mean', 'The highest salary', 'The total pay bill divided by 19'],
        0
      ),
      short(
        'm-daf-sum-j2',
        'Percentage Change',
        'Weekly orders went from 800 to 1,000. By what percentage did they rise? (A number, e.g. 12.5%.)',
        ['25%', '25', '25 percent', '+25%']
      ),
      short(
        'm-daf-sum-j3',
        'Points, Not Percent',
        'Conversion went from 4% to 5%. By how many percentage points did it rise? (A number.)',
        ['1', '1 point', '1 percentage point', '1pp', '1 pp', '1 percentage points']
      )
    ),
    ...tagged(
      'summary',
      P,
      short(
        'm-daf-sum-p1',
        'Average of Averages',
        'Store A: 100 orders at an average of £40. Store B: 300 orders at an average of £20. What is the average order value across both stores? (In pounds.)',
        ['25', '£25', '25.00', '£25.00']
      ),
      choice(
        'm-daf-sum-p2',
        'Same Average, Different Story',
        'Two delivery firms both average 3 days. Firm A is almost always 2 to 4 days; Firm B ranges from 1 day to 12. What does this tell you to report alongside the average?',
        [
          'The spread, such as a range, percentiles or standard deviation, since the averages hide how reliable each one is',
          'Nothing: the averages are equal, so the firms are equally good',
          'Only the fastest delivery for each firm',
          'The total number of deliveries, which is what really matters',
        ],
        0
      )
    ),
    ...tagged(
      'summary',
      S,
      written(
        'm-daf-sum-s1',
        'Average Revenue per User',
        'Average revenue per user rose 18% this quarter, and the board pack calls it "customers spending more". The number of users fell 30% over the same period. What would you check, and how would you report it?',
        [
          'Sees that the average can rise because low spenders left (a change in the mix), not because anyone spends more',
          'Proposes checking the same customers over time (a cohort, or customers active in both quarters) and total revenue',
          'Mentions looking at the distribution (median, segments) not only the mean',
          'Reports total revenue, user numbers and like-for-like spend together, rather than the average alone',
        ],
        "ARPU = revenue ÷ users, so losing 30% of users, probably the lowest spenders, raises it with nobody spending a penny more. I'd check total revenue (likely down), spend among customers active in both quarters, and the median and spend bands. In the pack: total revenue, active users and like-for-like spend side by side, with a note that the average rose because of who left."
      ),
      choice(
        'm-daf-sum-s2',
        'Small Numbers',
        'A region reports a 50% jump in complaints. You find it went from 4 complaints to 6. How do you present it?',
        [
          'Give the counts (4 to 6) with the rate, and note that a change that small is within normal week-to-week variation',
          'Report it as a 50% jump, as it is arithmetically correct',
          'Leave the region out of the report',
          'Round it to "complaints doubled" to make it easier to read',
        ],
        0
      )
    ),

    // ----- Drawing Conclusions -----
    ...tagged(
      'conclusions',
      J,
      choice(
        'm-daf-c-j1',
        'Ice Cream and Sunburn',
        'Weeks with more ice-cream sales also have more sunburn cases. What is the best explanation?',
        [
          'A third factor, hot sunny weather, drives both; neither causes the other',
          'Ice cream makes people more likely to burn',
          'Sunburnt people buy ice cream to cool down',
          'It is a coincidence with no explanation',
        ],
        0
      ),
      choice(
        'm-daf-c-j2',
        'December Spike',
        'Sales in December were 60% higher than in November. Your manager says the new homepage, launched 1 December, worked. What should you compare instead?',
        [
          'December with last December (or with a group that did not get the new homepage), since December is always busier',
          'December with November again, using more decimal places',
          'December with the average of the whole year',
          'Nothing more: the 60% rise proves it',
        ],
        0
      )
    ),
    ...tagged(
      'conclusions',
      P,
      written(
        'm-daf-c-p1',
        'Loyalty Members Spend More',
        'Members of the loyalty scheme spend 2.5 times more per year than non-members. Marketing wants to say "the loyalty scheme makes customers spend more" and push it to everyone. What do you tell them?',
        [
          'Points out that people who already spend more are the ones likely to join (selection), so the comparison does not show cause',
          'Suggests a fair comparison: the same customers before and after joining, or a matched / randomised group',
          'Gives a practical way to test it (offer it to a random half, or compare similar spenders)',
          'Words a claim that is supported now ("members spend more") without saying the scheme caused it',
        ],
        'The scheme attracts people who already shop with us a lot, so members would spend more even if the scheme did nothing. To see its effect, compare members\' spending before and after joining with similar non-members over the same months, or better, invite a random half of customers and compare the halves. Until then we can say "members spend 2.5 times more", not that the scheme makes them.',
        { minutes: 5 }
      ),
      choice(
        'm-daf-c-p2',
        'The Survey',
        'Customer satisfaction came out at 92% from a survey sent to people who contacted support and chose to reply (8% replied). What is the biggest concern?',
        [
          'Who replied: a small, self-selected group may not represent customers as a whole',
          'The percentage should have been given to two decimal places',
          'Surveys can never be used in analysis',
          '92% is too high to be real',
        ],
        0
      )
    ),
    ...tagged(
      'conclusions',
      S,
      written(
        'm-daf-c-s1',
        'Twenty Segments',
        "An analyst tested a price change across 20 customer segments and found one where it was \"significant at p < 0.05\". They recommend rolling the price change out to that segment. What's your view?",
        [
          'Recognises multiple comparisons: with 20 tests, about one would come up significant by chance alone',
          'Asks whether this segment was chosen before the test or picked after looking at the results',
          'Suggests confirming it: a fresh test on that segment, or correcting for the number of tests',
          'Considers the size and practical value of the effect, not only the p-value',
        ],
        'With 20 segments tested at 5%, you expect about one false positive even if the price change does nothing, so one "significant" segment is what chance alone looks like. Unless that segment was chosen in advance with a reason, I would treat it as a lead: correct for the 20 tests, or run a new test on that segment alone, and check whether the effect is big enough to matter before rolling it out.'
      ),
      choice(
        'm-daf-c-s2',
        'Survivors',
        'Customers who have stayed 3 years use feature X far more than those who left in year one. A PM says feature X keeps customers. Which is the strongest objection?',
        [
          'Long-staying customers have had more time and reason to use X; usage may be a result of staying, not the cause',
          'Three years is too short a time to study',
          'Feature X may be used on mobile and desktop',
          'The PM should have used a bar chart',
        ],
        0
      )
    ),

    // ----- Communicating Findings -----
    ...tagged(
      'communicate',
      J,
      match(
        'm-daf-com-j1',
        'Which Chart',
        'Match each job to the chart that suits it best.',
        [
          ['Monthly revenue over two years', 'Line chart'],
          ['Revenue by product category, compared', 'Bar chart'],
          ['How order values are spread', 'Histogram'],
          ['Ad spend against sales for 50 campaigns', 'Scatter plot'],
        ]
      ),
      choice(
        'm-daf-com-j2',
        'The Axis',
        'A bar chart of two stores\' revenue starts its y-axis at £95k, so £98k looks three times as tall as £96k. What is wrong?',
        [
          'Bar charts should start at zero; a cut axis makes a small difference look huge',
          'Nothing: it makes the difference easier to see',
          'The bars should be sorted alphabetically',
          'It should be a pie chart',
        ],
        0
      )
    ),
    ...tagged(
      'communicate',
      P,
      order(
        'm-daf-com-p1',
        'Structuring the Email',
        'Put these parts of an email to a busy director in the best order.',
        ['The answer, in one sentence', 'What you recommend they do', 'The two or three numbers that support it', 'Caveats and how the analysis was done']
      ),
      written(
        'm-daf-com-p2',
        'One Paragraph',
        'Returns rose from 6% to 9% of orders this quarter. Almost all the rise is in one product, the Oslo sofa, whose returns went from 5% to 31% after a new supplier started in August; most say "colour not as pictured". Write the short message you would send to the Head of Operations.',
        [
          'Leads with the answer: the rise is almost all the Oslo sofa since the supplier change',
          'Gives the key numbers (6% to 9% overall; Oslo 5% to 31%) without burying them in detail',
          'Gives the likely cause from the evidence (colour not matching, new supplier) without overclaiming',
          'Recommends a clear next step (check the supplier batch, update photos, pause or flag the product)',
        ],
        "Returns rose from 6% to 9% this quarter, and almost all of the rise is the Oslo sofa: its returns went from 5% to 31% once the new supplier started in August, and most customers say the colour isn't as pictured. I recommend checking the new supplier's fabric against our photos this week, and updating the listing (or pausing it) until it matches. Every other product is flat.",
        { minutes: 5 }
      )
    ),
    ...tagged(
      'communicate',
      S,
      written(
        'm-daf-com-s1',
        'Bad News Upward',
        'The CFO has already told the board that a promotion brought in £300k of extra sales. Your analysis shows most of those customers would have bought anyway; the real extra is closer to £60k. How do you handle it?',
        [
          'Raises it promptly and privately with the CFO before it spreads further, rather than staying quiet or going round them',
          'Explains the method simply (a comparison group / baseline showed most sales would have happened anyway)',
          'Gives the corrected figure with a range and its caveats, and how confident they are',
          'Offers what to do next: how to correct the record and how to measure the next promotion properly',
        ],
        "I would go to the CFO first, privately and soon. In plain terms: comparing with customers who didn't see the promotion shows most of these sales would have happened anyway, so the extra is about £60k (roughly £45–75k), not £300k. I would bring a one-page note they can use with the board, and suggest how to measure the next promotion with a hold-out group from the start."
      ),
      choice(
        'm-daf-com-s2',
        'Uncertainty',
        'Your forecast says next quarter\'s revenue will be £2.1m, with a realistic range of £1.8m to £2.4m. How should the slide show it?',
        [
          'The central figure with the range, and what would push it to either end',
          'Only £2.1m, since ranges confuse people',
          'Only £1.8m, to be safe',
          'All three numbers in a table, without saying which to plan on',
        ],
        0
      )
    ),

    // ----- Hands-on: Real Data -----
    ...tagged(
      'sim',
      P,
      SHEET_P,
      choice(
        'm-daf-sim-p2',
        'The Typical Order',
        `Priya wants one number for "the typical order last week" on a slide. Which do you give her?`,
        [
          `The median, ${money(MEDIAN)}: one trade order of £1,240 pulls the mean up`,
          `The mean, ${money(MEAN)}, because it uses every order`,
          `The mean without the £1,240 order, deleted from the data`,
          `The largest order, £1,240`,
        ],
        0,
        { taskId: 'm-daf-sim-p1', minutes: 2 }
      )
    ),
    ...tagged(
      'sim',
      S,
      SHEET_S,
      written(
        'm-daf-sim-s2',
        'What You Tell the PM',
        'From your Results sheet, what do you tell the product manager about checkout B, and what should happen next?',
        [
          'Says B converts better on desktop and on mobile, even though it looks worse overall',
          "Explains why: B's visitors were mostly mobile, which converts less (a mix effect, Simpson's paradox)",
          "Sees that the uneven device split means the randomisation was broken, so the test can't be trusted as it stands",
          'Recommends fixing the split and re-running (or comparing within device), not dropping or shipping B on this result',
        ],
        `Within each device B is ahead: desktop ${(conv('B', 'Desktop') * 100).toFixed(1)}% against ${(conv('A', 'Desktop') * 100).toFixed(1)}%, mobile ${(conv('B', 'Mobile') * 100).toFixed(1)}% against ${(conv('A', 'Mobile') * 100).toFixed(1)}%. It only looks worse overall because about 75% of B's visitors were on mobile against 30% of A's, and mobile converts far less. That split should have been the same for both, so the assignment is broken: I would fix it and re-run the test rather than drop B, and until then compare within each device.`,
        { taskId: 'm-daf-sim-s1', minutes: 5 }
      )
    ),
  ],
};
