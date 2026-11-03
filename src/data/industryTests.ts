import { AssessmentTest } from '../types';
import { caseStudy, choice, match, multi, order, short, written } from './questionKit';

// Vetter tests for work outside software and data, one per field. Each has ten questions: the fundamentals first, then
// a short case where the candidate works out the numbers, judges what they mean and says what they'd do

const minutes = (qs: { timeLimitMinutes: number }[]) => qs.reduce((n, q) => n + q.timeLimitMinutes, 0);
const answered = (qs: { type: string }[]) => qs.filter((q) => q.type !== 'case').length;

const test = (t: Omit<AssessmentTest, 'estimatedMinutes' | 'totalQuestions' | 'type'>): AssessmentTest => ({
  ...t,
  type: 'standard',
  estimatedMinutes: minutes(t.questions),
  totalQuestions: answered(t.questions),
});

export const INDUSTRY_TESTS: AssessmentTest[] = [
  // ---------- Finance ----------
  test({
    id: 'test-fin-01',
    title: 'Financial Statements & Analysis',
    category: 'Finance',
    difficulty: 'Junior',
    description: 'Read the three statements, work out margins, ratios and working capital, then explain why a profitable business is running out of cash.',
    passingScore: 70,
    skillsTested: ['Financial Analysis', 'Accounting', 'Ratios', 'Working Capital'],
    roles: ['Financial Analyst', 'Accountant'],
    questions: [
      choice(
        'q-fin-1',
        'Accruals',
        `A £12,000 invoice arrives in December for consultancy done in December. It's paid in January.\n\nWhen is the cost recorded?`,
        ['January, when it is paid', 'December, when the work was done', 'Spread over twelve months', 'When the invoice is approved'],
        1
      ),
      match(
        'q-fin-2',
        'Where It Shows Up',
        'Match each item to where it appears.',
        [
          ['Revenue for the year', 'Income statement'],
          ['Money customers owe at year end', 'Balance sheet'],
          ['Cash spent on new equipment', 'Cash flow: investing'],
          ['Repaying a bank loan', 'Cash flow: financing'],
          ['Cash received from customers', 'Cash flow: operating'],
        ]
      ),
      choice(
        'q-fin-3',
        'Buying a Van',
        `A company buys a £50,000 van for cash. It's depreciated straight-line over 5 years with no residual value.\n\nWhat's the effect in year one?`,
        ['Profit falls £50,000; cash falls £50,000', 'Profit falls £10,000; cash falls £50,000', 'Profit falls £10,000; cash falls £10,000', 'No effect on profit; cash falls £50,000'],
        1
      ),
      choice(
        'q-fin-4',
        'Same Ratio, Different Risk',
        `Two companies both have a current ratio of 2.0. A's current assets are mostly cash. B's are mostly slow-moving stock.\n\nWhich is true?`,
        ['They are equally able to pay their bills', 'A is more liquid; B has the lower quick ratio', 'B is more liquid, since stock is worth more than cash', 'The current ratio already accounts for this'],
        1
      ),
      order('q-fin-5', 'Down the Income Statement', 'Put these in the order they appear, top to bottom.', [
        'Revenue',
        'Cost of sales',
        'Gross profit',
        'Operating expenses',
        'Operating profit',
        'Interest',
        'Profit before tax',
      ]),
      caseStudy(
        'q-fin-case',
        'Northbank Furniture',
        `Northbank makes furniture. The owner says: “We grew 20% and made a profit, so why is the bank account nearly empty?”

Figures in £000         This year   Last year
Revenue                   2,400       2,000
Cost of sales             1,560       1,200
Operating expenses          600         520

Trade receivables           480         250
Inventory                   390         300
Cash                         40         210
Trade payables              260         240
Short-term loan             150           0

During the year it also spent £260k on new machinery.`,
        'Year-end accounts'
      ),
      short('q-fin-6', 'Gross Margin', "What's this year's gross margin, as a %?", ['35%', '35', '35 percent', '0.35'], { taskId: 'q-fin-case' }),
      short('q-fin-7', 'Debtor Days', 'How many days does the average customer take to pay this year? Round to the nearest day.', ['73', '73 days'], { taskId: 'q-fin-case' }),
      short('q-fin-8', 'Current Ratio', "What's this year's current ratio, to 2 decimal places?", ['2.22', '2.22x', '2.22:1'], { taskId: 'q-fin-case' }),
      multi(
        'q-fin-9',
        'Where the Cash Went',
        'Which of these explain the drop in cash? Tick all that apply.',
        ['Customers owe £230k more than a year ago', 'Stock is up £90k', 'Suppliers are owed £20k more', 'It took out a £150k loan', 'It spent £260k on machinery'],
        [0, 1, 4],
        { taskId: 'q-fin-case' }
      ),
      written(
        'q-fin-10',
        'Advise the Owner',
        'In a few sentences: what would you tell the owner, and what should they do first?',
        [
          'Profitability is slipping: gross margin fell from 40% to 35% and operating profit from £280k to £240k despite growth',
          'Cash is tied up in working capital: customers now take about 73 days to pay, up from about 46',
          'Stock has grown faster than sales, and the machinery spend drained cash too',
          'The business now leans on a short-term loan, a liquidity risk',
          'A concrete first action, e.g. chase overdue debts and tighten credit terms, or review pricing and costs behind the margin drop',
        ],
        `Growth hasn't been profitable growth. Gross margin fell from 40% to 35% and operating profit dropped by £40k even though sales rose 20%. The cash went into working capital: customers now take 73 days to pay against 46 last year (£230k more owed), stock is up £90k, and £260k went on machinery, so a £150k loan is plugging the gap. First, chase the overdue receivables and tighten credit terms, which frees cash fastest; then find out why costs of sales grew faster than revenue.`,
        { taskId: 'q-fin-case' }
      ),
    ].map((q, i) => ({ ...q, weight: i < 5 ? 8 : q.type === 'case' ? 0 : q.type === 'written' ? 20 : 10 })),
  }),

  // ---------- Marketing ----------
  test({
    id: 'test-mkt-01',
    title: 'Digital Marketing Fundamentals',
    category: 'Marketing',
    difficulty: 'Junior',
    description: 'Campaign maths and judgement: what each metric really says, reading a test result, and deciding where the next pound of budget goes.',
    passingScore: 70,
    skillsTested: ['Digital Marketing', 'Campaign Metrics', 'Experimentation', 'Budget Allocation'],
    roles: ['Digital Marketer'],
    questions: [
      choice(
        'q-mkt-1',
        'The 12x Campaign',
        `A retargeting campaign shows a 12x return on ad spend. Your manager wants to move the whole budget into it.\n\nWhat's the main risk?`,
        [
          'Retargeting ads are more expensive per click',
          'Many of those buyers would have bought anyway, and it only reaches people other channels already found',
          'ROAS is not a real metric',
          'The campaign will run out of creative',
        ],
        1
      ),
      match('q-mkt-2', 'What It Tells You', 'Match each metric to what it tells you.', [
        ['Click-through rate', 'How compelling the ad is to people who see it'],
        ['Conversion rate', 'How well visits turn into sales'],
        ['Cost per acquisition', 'What each new customer costs'],
        ['Return on ad spend', 'Revenue for each £1 of ads'],
        ['Churn', 'The share of customers lost each month'],
      ]),
      choice(
        'q-mkt-3',
        'Calling a Test',
        `In an A/B test, version B converted 5.2% and A 4.8%, from 250 visitors each.\n\nWhat do you do?`,
        ['Switch everything to B: it won by 8%', 'Keep the test running: 13 vs 12 sales is far too few to call', 'Stop the test: there is no difference', 'Run a third version'],
        1
      ),
      multi(
        'q-mkt-4',
        'Vanity Metrics',
        "The campaign's goal is paid sign-ups. Which of these are vanity metrics for it? Tick all that apply.",
        ['Impressions', 'Cost per sign-up', 'Likes on the post', 'Sign-up conversion rate', 'Follower growth'],
        [0, 2, 4]
      ),
      choice(
        'q-mkt-5',
        'Clicks but No Sales',
        `An ad's click-through rate is well above average, but almost nobody who clicks buys.\n\nWhat's the most likely problem?`,
        ['The ad is shown to too few people', 'The ad promises something the landing page doesn’t deliver, or the page is hard to use', 'The bids are too low', 'The brand has low awareness'],
        1
      ),
      order('q-mkt-6', 'Launching a Campaign', 'Put these in the order you would do them.', [
        'Set the goal and the metric that measures it',
        'Define the audience',
        'Write the creative and set up tracking',
        'Launch a small test',
        'Scale what works and cut what doesn’t',
      ]),
      caseStudy(
        'q-mkt-case',
        'Spring Campaign Results',
        `Four weeks, one product. Price £60; after product costs you keep £30 per sale.

Channel    Spend     Clicks    Customers
Search     £4,000    5,000     200
Social     £6,000    15,000    150
Email      £500      2,000     50

The email list has 8,000 subscribers.`,
        'Campaign report'
      ),
      short('q-mkt-7', 'Social CPA', "What's the cost per acquisition on Social, in £?", ['40', '£40', '40 pounds'], { taskId: 'q-mkt-case' }),
      short('q-mkt-8', 'Search Conversion', "What's the conversion rate from click to customer on Search, as a %?", ['4%', '4', '4 percent', '0.04'], { taskId: 'q-mkt-case' }),
      choice('q-mkt-9', 'Losing Money', 'Which channel loses money on the first sale?', ['Search', 'Social', 'Email', 'None of them'], 1, { taskId: 'q-mkt-case' }),
      written(
        'q-mkt-10',
        'The Extra £4,000',
        "You have £4,000 more to spend next month. Where does it go, and what would you check before scaling?",
        [
          'Social loses £10 per customer on the first sale (CPA £40 vs £30 kept), so it only pays if customers buy again',
          'Search is profitable at a £20 CPA and is the natural place for more budget',
          'Spending more usually raises the cost per customer (diminishing returns), so scale in steps and watch CPA',
          'Email is cheapest but limited by an 8,000-person list; it can’t absorb £4,000',
          'Checks repeat purchases or lifetime value before cutting or growing Social',
        ],
        `Most of it into Search: each customer costs £20 and earns £30, so it's profitable. Spend it in steps and watch the CPA, because more spend usually means pricier clicks. Social loses £10 a customer on the first sale, so I'd hold its budget until I know whether those customers buy again; if lifetime value covers £40 it's fine. Email is the cheapest channel, but with 8,000 subscribers it can't take much more money, so grow the list instead.`,
        { taskId: 'q-mkt-case' }
      ),
    ].map((q, i) => ({ ...q, weight: i < 6 ? 8 : q.type === 'case' ? 0 : q.type === 'written' ? 20 : q.type === 'choice' ? 12 : 10 })),
  }),

  // ---------- Sales ----------
  test({
    id: 'test-sales-01',
    title: 'B2B Sales & Pipeline Management',
    category: 'Sales',
    difficulty: 'Junior',
    description: 'Discovery, objections and pipeline maths, then a real pipeline review: spot the deals at risk and call an honest number.',
    passingScore: 70,
    skillsTested: ['Sales', 'Pipeline Forecasting', 'Negotiation', 'Qualification'],
    roles: ['Sales Representative'],
    questions: [
      choice(
        'q-sales-1',
        'The Best Question',
        'On a first call, which question tells you most?',
        ['Would you like to see a demo?', "What's your budget?", "What happens if this isn't fixed in the next six months?", 'Are you happy with your current supplier?'],
        2
      ),
      choice(
        'q-sales-2',
        'Too Expensive',
        `A prospect says “It’s too expensive.”\n\nWhat's the best first response?`,
        ['Offer 20% off straight away', 'Ask what they’re comparing it with and what the problem costs them today', 'Say the price is fixed', 'Move on to another prospect'],
        1
      ),
      match('q-sales-3', 'Stage Criteria', 'Match each deal stage to what must be true before a deal enters it.', [
        ['Qualified', 'Need, budget and decision-maker confirmed'],
        ['Demo', 'Buyer has agreed the problem is worth solving'],
        ['Proposal', 'Buyer agrees the product solves it'],
        ['Negotiation', 'Pricing is with the person who signs'],
        ['Closed won', 'Contract signed'],
      ]),
      short(
        'q-sales-4',
        'How Many Deals',
        `You win 1 in 4 qualified opportunities. Your average deal is £15,000.\n\nHow many qualified opportunities do you need to close £300,000?`,
        ['80', '80 opportunities']
      ),
      choice(
        'q-sales-5',
        'Gone Quiet',
        `Your only contact, who loves the product, has gone quiet two weeks before the deal should close.\n\nWhat's the best move?`,
        ['Keep emailing them until they reply', 'Reach the other people involved in the decision and re-confirm how they’ll buy', 'Offer a discount to restart talks', 'Push the close date back a quarter'],
        1
      ),
      order('q-sales-6', 'Handling an Objection', 'Put these steps in order.', [
        'Listen without interrupting',
        'Acknowledge the concern',
        'Ask questions to find the real issue',
        'Answer with evidence that fits their situation',
        'Check the concern is resolved',
      ]),
      caseStudy(
        'q-sales-case',
        'End-of-Quarter Pipeline',
        `Target £120,000. Closed so far £45,000. Three weeks left.

Acme: £40,000, 80%. Negotiation. Their legal team is reviewing the contract.
Brightline: £30,000, 40%. Proposal sent. Your contact hasn't replied in 3 weeks. You've never met the budget holder.
Cobalt: £25,000, 30%. Demo done, “very keen”. No budget confirmed.
Dune: £15,000, 70%. Negotiation. Will sign this week for 15% off.`,
        'CRM pipeline'
      ),
      short('q-sales-7', 'Weighted Forecast', "What's the weighted value of the four open deals, in £?", ['62000', '62,000', '£62,000', '62k', '£62k'], { taskId: 'q-sales-case' }),
      multi('q-sales-8', 'At Risk', 'Which deals are forecast higher than the evidence supports? Tick all that apply.', ['Acme', 'Brightline', 'Cobalt', 'Dune'], [1, 2], { taskId: 'q-sales-case' }),
      choice(
        'q-sales-9',
        "Dune's Discount",
        "What's the best reply to Dune's request?",
        ['Give the 15%: a signed deal is worth it', 'Trade: a smaller discount in return for something, like a longer term or payment upfront', 'Refuse any discount', 'Ask your manager to call them'],
        1,
        { taskId: 'q-sales-case' }
      ),
      written(
        'q-sales-10',
        'Your Number',
        'Your manager asks what you’ll commit to closing and your plan for the next three weeks. Answer briefly.',
        [
          'Commits to a realistic number (about £85k–£100k: closed £45k plus Acme, possibly Dune), not the target or the raw weighted sum',
          'Says plainly the quarter is likely to finish below the £120k target',
          'Brightline: get to the budget holder this week, or move it out of the quarter',
          'Cobalt: confirm budget and how they decide before counting it',
          'Gives concrete next steps with dates, without giving away margin to close',
        ],
        `Commit £85k: the £45k closed plus Acme at £40k, which only needs legal sign-off; I'll speak to their lawyer this week. Dune is upside of up to £15k if we agree terms without the full 15%. That leaves us short of £120k and I'd rather say so now. Brightline has gone cold and I've never met the budget holder: I'll ask for that meeting by Friday or move it to next quarter. Cobalt is keen but has no budget, so it stays out of the commit until they confirm one.`,
        { taskId: 'q-sales-case' }
      ),
    ].map((q, i) => ({ ...q, weight: i < 6 ? 8 : q.type === 'case' ? 0 : q.type === 'written' ? 20 : q.type === 'multi' ? 12 : 10 })),
  }),

  // ---------- Healthcare ----------
  test({
    id: 'test-health-01',
    title: 'Clinical Safety & Patient Care',
    category: 'Healthcare',
    difficulty: 'Junior',
    description: 'Infection control, consent, confidentiality and observations, then a deteriorating patient: score them, act, and hand over with SBAR.',
    passingScore: 75,
    skillsTested: ['Patient Safety', 'Infection Control', 'Clinical Judgement', 'Escalation'],
    roles: ['Healthcare Professional'],
    questions: [
      choice(
        'q-health-1',
        'Hand Hygiene',
        'When should you clean your hands on a ward?',
        [
          'Only after touching a patient',
          'Before and after touching a patient, before clean procedures, and after body fluids or touching their surroundings',
          'At the start and end of each shift',
          'Only when your hands look dirty',
        ],
        1
      ),
      choice(
        'q-health-2',
        'Confidentiality',
        `A caller says he's a patient's son and asks for her test results.\n\nWhat do you do?`,
        ['Give the results, since he’s family', 'Check she has agreed to share information with him before saying anything', 'Read out only the normal results', 'Ask him to email instead'],
        1
      ),
      choice(
        'q-health-3',
        'Consent',
        'A patient with capacity refuses a blood test. What happens next?',
        ['Take it anyway, in their best interest', 'Respect the decision, make sure they understand the risks, and record it', 'Ask a relative to consent for them', 'Try again when they’re asleep'],
        1
      ),
      multi(
        'q-health-4',
        'Suspected C. diff',
        'A patient has diarrhoea and suspected C. difficile. Which precautions apply? Tick all that apply.',
        ['A single room with its own toilet or commode', 'Gloves and apron for contact', 'Wash hands with soap and water', 'Alcohol hand gel is enough', 'An FFP3 mask for routine care'],
        [0, 1, 2]
      ),
      match('q-health-5', 'Normal Ranges', 'Match each adult observation to the range that scores 0 on NEWS2.', [
        ['Breathing rate', '12–20 a minute'],
        ['Oxygen saturation', '96% or above'],
        ['Heart rate', '51–90 a minute'],
        ['Systolic blood pressure', '111–219 mmHg'],
        ['Temperature', '36.1–38.0 °C'],
      ]),
      order('q-health-6', 'SBAR', 'Put a phone handover in SBAR order.', [
        'Who you are, who the patient is, and what worries you now',
        'Why they’re in and their relevant history',
        'Their observations and what you think is happening',
        'What you need from the doctor, and by when',
      ]),
      caseStudy(
        'q-health-case',
        'Bay 4, Bed 2',
        `Mr Ahmed, 72. Day 2 after a hip replacement. On room air.

           08:00     14:00
Breathing  16        24
SpO2       97%       93%
BP         132/80    98/60
Pulse      82        112
Temp       37.0      38.4
Alert?     Yes       New confusion

He says he feels “not right”. He's passed little urine since the morning.`,
        'Observation chart'
      ),
      short('q-health-7', 'NEWS2', "What's his NEWS2 score at 14:00?", ['12'], { taskId: 'q-health-case' }),
      choice(
        'q-health-8',
        'The Response',
        'What response does this score call for?',
        ['Carry on with 4–6 hourly observations', 'Hourly observations and tell the nurse in charge', 'An urgent review within the hour', 'An emergency response: the medical team or critical care outreach now, with continuous monitoring'],
        3,
        { taskId: 'q-health-case' }
      ),
      multi(
        'q-health-9',
        'Next Hour',
        'Which should happen in the next hour? Tick all that apply.',
        ['Escalate to the medical team now, using SBAR', 'Wait for the evening ward round', 'Monitor him closely and repeat observations', 'Start a fluid balance chart and measure urine output', 'Give paracetamol and recheck in four hours'],
        [0, 2, 3],
        { taskId: 'q-health-case' }
      ),
      written(
        'q-health-10',
        'Make the Call',
        'Write what you’d say to the doctor on the phone.',
        [
          'Situation: identifies themself and the patient, and says clearly they are worried he is deteriorating, with a NEWS2 of 12 and new confusion',
          'Background: 72, day 2 after a hip replacement',
          'Assessment: gives the key observations (breathing 24, SpO2 93% on air, BP 98/60, pulse 112, temp 38.4, low urine) and names possible sepsis',
          'Recommendation: asks for a review now, within minutes, and says what they’ve started or expect (e.g. sepsis screen, bloods, cultures)',
          'Confirms what happens next, e.g. repeats back the plan and when the doctor will arrive',
        ],
        `This is Sam, staff nurse on Ward 7. I'm calling about Mr Ahmed in bay 4, bed 2. I'm worried he's deteriorating: his NEWS2 is 12 and he's newly confused. He's 72 and two days after a hip replacement. Since this morning his breathing has gone to 24, sats 93% on air, BP 98/60, pulse 112, temperature 38.4, and he's passed very little urine. I think he may be septic. I need you to see him now. I've started a fluid chart and I'm repeating his observations; can I start the sepsis screen and take bloods and cultures? Can you confirm you're on your way?`,
        { taskId: 'q-health-case' }
      ),
    ].map((q, i) => ({ ...q, weight: i < 6 ? 8 : q.type === 'case' ? 0 : q.type === 'written' ? 20 : q.type === 'multi' ? 12 : 10 })),
  }),

  // ---------- Project management ----------
  test({
    id: 'test-pm-01',
    title: 'Project Planning & Delivery',
    category: 'Project Management',
    difficulty: 'Junior',
    description: 'Risks, roles, estimates and change control, then a live plan: find the critical path, absorb a delay and answer a sponsor who wants it sooner.',
    passingScore: 70,
    skillsTested: ['Project Planning', 'Risk Management', 'Stakeholder Management', 'Scheduling'],
    roles: ['Project Manager'],
    questions: [
      choice('q-pm-1', 'Risks and Issues', 'What is the difference between a risk and an issue?', ['There is none', 'A risk might happen; an issue already has', 'Risks are about money; issues are about people', 'Issues are always more serious'], 1),
      choice('q-pm-2', 'RACI', 'In a RACI chart, how many people are Accountable for a task?', ['Exactly one', 'At least two, for cover', 'Everyone on the team', 'None; it’s shared'], 0),
      choice(
        'q-pm-3',
        'A Late Request',
        `Halfway through, a senior stakeholder asks for a new feature “by the same date”.\n\nWhat do you do first?`,
        ['Say yes and ask the team to work weekends', 'Assess the impact on time, cost and quality, then agree the trade-off through change control', 'Refuse: the scope is signed off', 'Add it quietly to the backlog'],
        1
      ),
      match('q-pm-4', 'Project Documents', 'Match each document to its job.', [
        ['Project charter', 'Authorises the project and sets its goals'],
        ['RAID log', 'Tracks risks, assumptions, issues and dependencies'],
        ['Gantt chart', 'Shows tasks over time and what depends on what'],
        ['Change request', 'Records a proposed change and its impact for approval'],
        ['Lessons learned', 'What to repeat or avoid next time'],
      ]),
      choice(
        'q-pm-5',
        'Estimating the Unknown',
        `The team has never done this kind of task. They say “about three weeks”.\n\nHow do you plan it?`,
        ['Plan for three weeks exactly', 'Ask for best, likely and worst cases, plan on the range and hold contingency', 'Double it', 'Leave it out of the plan until it starts'],
        1
      ),
      order('q-pm-6', 'A New Risk', 'Put these in order once someone raises a risk.', [
        'Describe the risk clearly',
        'Assess how likely it is and its impact',
        'Choose a response and an owner',
        'Record it in the RAID log',
        'Review it regularly',
      ]),
      caseStudy(
        'q-pm-case',
        'Office Move',
        `The move must be done within 20 working days.

Task                  Days   Can start after
A  Sign lease          2     –
B  Design layout       4     A
C  Order furniture     8     B
D  Install network     6     A
E  Fit out office      5     B
F  Move staff          2     C, D and E`,
        'Project plan'
      ),
      short('q-pm-7', 'Shortest Schedule', 'What is the shortest possible schedule, in days?', ['16', '16 days'], { taskId: 'q-pm-case' }),
      short('q-pm-8', 'Slack', 'How many days can the network install (D) slip without delaying the move?', ['6', '6 days'], { taskId: 'q-pm-case' }),
      choice(
        'q-pm-9',
        'Late Furniture',
        'The supplier says furniture will take 12 days, not 8. What happens?',
        ['The move takes 20 days, with no slack left', 'The move takes 24 days', 'Nothing: furniture has slack', 'The move takes 18 days'],
        0,
        { taskId: 'q-pm-case' }
      ),
      written(
        'q-pm-10',
        'Done in 14 Days?',
        'With the original plan, the sponsor now wants the move done in 14 days. What are your options, and what do you recommend?',
        [
          'The critical path is A–B–C–F at 16 days, so 2 days must come off that path',
          'Speeding up D or E does nothing, since they aren’t on the critical path',
          'Crashing: pay for faster furniture delivery or more people on design',
          'Fast-tracking: order standard furniture before the layout is final, at some risk',
          'Cutting scope or phasing (e.g. move most staff on day 14, the rest later), with the trade-offs made clear and the sponsor deciding',
        ],
        `The critical path is lease, layout, furniture, move: 16 days. To finish in 14 I need 2 days off that path; speeding up the network or fit-out won't help. Options: pay for express furniture delivery (cost), order standard items before the layout is signed off (risk of buying the wrong things), or move in phases with most staff in on day 14. I'd recommend express delivery if the cost is acceptable, since it carries the least risk, and I'd put the cost to the sponsor to decide.`,
        { taskId: 'q-pm-case' }
      ),
    ].map((q, i) => ({ ...q, weight: i < 6 ? 8 : q.type === 'case' ? 0 : q.type === 'written' ? 20 : q.type === 'choice' ? 12 : 10 })),
  }),
];

// ---------- Consulting ----------
export const CONSULTING_TEST: AssessmentTest = test({
  id: 'test-cs-01',
  title: 'Case Interview & Business Problem Solving',
  category: 'Consulting',
  difficulty: 'Junior',
  description: 'Structure a problem, do the case maths, then crack a real profit case: find what changed and advise the CEO.',
  passingScore: 75,
  skillsTested: ['Business Problem Solving', 'Market Sizing', 'Structured Thinking', 'Case Maths'],
  roles: ['Consultant', 'Business Analyst'],
  questions: [
    choice(
      'q-cs-1',
      'Structuring the Problem',
      'A client asks why sales are falling. Which split is mutually exclusive and collectively exhaustive (MECE)?',
      ['Fewer customers buying, or each customer spending less', 'Marketing, competitors and the economy', 'Online sales, new customers and discounted sales', 'Product quality, service and marketing'],
      0
    ),
    choice(
      'q-cs-2',
      'Profit Down, Revenue Flat',
      "A retailer's profit fell 20% while revenue stayed flat. Where do you look first?",
      ['Costs: which fixed or variable costs rose', 'A campaign to grow revenue', 'Raising prices', 'Competitors’ growth'],
      0
    ),
    short('q-cs-3', 'Break-even', `A product sells for $50 and costs $30 a unit to make. Fixed costs are $600,000 a year.\n\nHow many units a year to break even?`, ['30000', '30,000', '30k', '30 000']),
    short(
      'q-cs-4',
      'Market Sizing',
      `A city of 2 million people, 2.5 people per household. 30% of households own a dog; each buys 12 bags of dog food a year.\n\nHow many bags a year?`,
      ['2.88 million', '2.88m', '2880000', '2,880,000', '2.88 mn'],
      { minutes: 5 }
    ),
    choice(
      'q-cs-5',
      'Two Weeks to Answer',
      'The client wants an answer in two weeks. What is the best approach?',
      ['Collect all the data first, then look for patterns', 'Form an early hypothesis and gather only the data that proves or disproves it', 'Survey every customer', 'Benchmark every competitor first'],
      1
    ),
    order('q-cs-6', 'Working a Case', 'Put these in order.', [
      'Clarify the question and what success looks like',
      'Lay out a structure for the problem',
      'Prioritise the most likely hypotheses',
      'Analyse the data',
      'Recommend, with the evidence behind it',
    ]),
    caseStudy(
      'q-cs-case',
      'Fresca Juice Bars',
      `40 juice bars. Profit fell from £2.0m to £1.2m. This year Fresca raised prices and switched to premium organic fruit.

                    Last year   This year
Transactions        4.0m        3.5m
Average spend       £5.00       £6.00
Revenue             £20.0m      £21.0m
Fruit & ingredients £6.0m       £7.35m
Rent & staff        £12.0m      £12.45m`,
      'Client data'
    ),
    short('q-cs-7', 'Transactions', 'By what % did transactions change?', ['-12.5%', '12.5%', '-12.5', '12.5', 'down 12.5%', 'fell 12.5%'], { taskId: 'q-cs-case' }),
    short('q-cs-8', 'Ingredient Share', 'What share of revenue went on ingredients this year, as a %?', ['35%', '35', '0.35'], { taskId: 'q-cs-case' }),
    multi(
      'q-cs-9',
      'What Hit Profit',
      'Which of these drove the £0.8m fall in profit? Tick all that apply.',
      ['Ingredient costs grew faster than sales', 'Rent and staff costs rose', 'Revenue fell', 'Average spend fell'],
      [0, 1],
      { taskId: 'q-cs-case' }
    ),
    written(
      'q-cs-10',
      'Reverse the Price Rise?',
      'The CEO asks: “Should we reverse the price rise?” Give your view and what you’d want to know first.',
      [
        'The price rise grew revenue by £1m despite 12.5% fewer transactions, so it was not what cut profit',
        'The main hit is ingredients: £1.35m more, up from 30% to 35% of revenue, from the premium fruit',
        'Losing 500,000 transactions is a warning sign about customers that deserves investigation',
        'Wants evidence before deciding: who stopped coming and why, competitor prices, whether customers value the organic fruit',
        'A clear recommendation, e.g. don’t reverse yet; tackle ingredient costs and test prices in a few bars',
      ],
      `Not yet. The price rise wasn't the problem: revenue rose £1m even with 12.5% fewer transactions. Profit fell because ingredients cost £1.35m more (35% of revenue, up from 30%) and rent and staff rose £0.45m. I'd look at the premium fruit first: do customers notice or value it? The lost 500,000 transactions do worry me, so I'd want to know who stopped coming and why, and how our prices compare. Then I'd test a lower price in a few bars rather than reverse it everywhere.`,
      { taskId: 'q-cs-case' }
    ),
  ].map((q, i) => ({ ...q, weight: i < 6 ? 8 : q.type === 'case' ? 0 : q.type === 'written' ? 20 : q.type === 'multi' ? 12 : 10 })),
});
