import { caseStudy, choice, match, multi, order, short, written } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';

// Work outside software and data. Each module's existing test (a Junior case with fundamentals) is tagged into its
// areas; new questions fill every area at every level, and each level above Junior brings a harder case of its own.

// ---------- Finance ----------
export const FINANCE_MODULE: ModuleSkeleton = {
  familyId: 'test-fin-01',
  aspects: [
    { id: 'accounting', name: 'Accounting Principles', summary: 'Double entry, accruals, depreciation and when revenue and costs are recognised.' },
    { id: 'statements', name: 'The Three Statements', summary: 'Where items appear, and how one transaction flows through all three.' },
    { id: 'ratios', name: 'Ratios & Analysis', summary: 'Margins, liquidity, returns and gearing, and what they hide.' },
    { id: 'cash', name: 'Cash & Working Capital', summary: 'Why profit isn’t cash, and how to free cash tied up in the business.' },
    { id: 'case', name: 'Analysing a Business', summary: 'Working through real figures: diagnose, quantify and advise.' },
  ],
  tags: {
    'q-fin-1': ['accounting', J],
    'q-fin-2': ['statements', B],
    'q-fin-5': ['statements', B],
    'q-fin-3': ['statements', J],
    'q-fin-4': ['ratios', J],
    'q-fin-case': ['case', J],
    'q-fin-6': ['case', J],
    'q-fin-7': ['case', J],
    'q-fin-8': ['case', J],
    'q-fin-9': ['case', J],
    'q-fin-10': ['case', J],
  },
  bank: [
    ...tagged(
      'accounting',
      B,
      choice(
        'm-fin-acc-b1',
        'The Accounting Equation',
        'Which equation does every balance sheet satisfy?',
        ['Assets = Liabilities + Equity', 'Assets = Revenue − Costs', 'Equity = Assets + Liabilities', 'Profit = Cash in − Cash out'],
        0
      )
    ),
    ...tagged(
      'accounting',
      P,
      choice(
        'm-fin-acc-p1',
        'Paid Upfront',
        'On 1 October a customer pays £12,000 for a 12-month software subscription. The year ends on 31 December. What goes in this year’s accounts?',
        [
          'Revenue £3,000, and £9,000 of deferred revenue as a liability',
          'Revenue £12,000, since the cash has arrived',
          'Revenue £0 until the subscription ends',
          'Revenue £9,000 and a £3,000 receivable',
        ],
        0
      )
    ),
    ...tagged(
      'accounting',
      S,
      choice(
        'm-fin-acc-s1',
        'Hitting the Number',
        'The quarter is £300k short of the profit target. The CEO asks you to capitalise £300k of routine repairs as fixed assets. What do you do?',
        [
          'Decline: routine repairs are an expense, and capitalising them overstates profit and assets; explain the risk and record the decision',
          'Capitalise it and depreciate it over five years',
          'Capitalise half as a compromise',
          'Move the repairs into next quarter’s accounts instead',
        ],
        0
      )
    ),
    ...tagged(
      'statements',
      P,
      choice(
        'm-fin-st-p1',
        'Depreciation Through Three Statements',
        'Depreciation rises by £100k and the tax rate is 25%. Ignoring anything else, what happens?',
        [
          'Net income −£75k; cash +£25k (the depreciation is added back and tax falls); fixed assets −£100k and retained earnings −£75k',
          'Net income −£100k; cash −£100k; fixed assets unchanged',
          'Net income −£75k; cash −£75k; fixed assets −£100k',
          'No effect, since depreciation isn’t cash',
        ],
        0
      )
    ),
    ...tagged(
      'statements',
      S,
      choice(
        'm-fin-st-s1',
        'Quality of Earnings',
        'For three years a company’s profit has grown 15% a year, while cash from operations has fallen each year and receivables have grown much faster than revenue. What does it suggest?',
        [
          'Profit may be flattered, e.g. revenue booked early or customers who won’t pay; dig into revenue recognition and the aged debtors',
          'A healthy, fast-growing business',
          'The company is investing heavily in equipment',
          'Nothing; cash and profit always differ',
        ],
        0
      )
    ),
    ...tagged(
      'ratios',
      B,
      match('m-fin-rat-b1', 'What Each Ratio Measures', 'Match each ratio to what it tells you.', [
        ['Gross margin', 'The share of sales left after direct costs'],
        ['Current ratio', 'Ability to pay bills due within a year'],
        ['Gearing', 'How much of the funding is debt'],
        ['Return on capital employed', 'Profit made on the money invested in the business'],
      ])
    ),
    ...tagged(
      'ratios',
      P,
      short(
        'm-fin-rat-p1',
        'ROCE',
        'Operating profit £300k. Total assets £2.0m. Current liabilities £500k.\n\nWhat is the return on capital employed, as a %?',
        ['20%', '20', '0.2', '20 percent']
      )
    ),
    ...tagged(
      'ratios',
      S,
      choice(
        'm-fin-rat-s1',
        'Higher Return, Higher Risk',
        'Company A has a return on equity of 25% and is 70% debt-funded. Company B has 15% and no debt. A lender asks which is the stronger business. What do you say?',
        [
          'A’s higher ROE comes largely from borrowing; compare return on capital and interest cover before calling it stronger',
          'A, because ROE is the best single measure',
          'B, because debt is always bad',
          'They can’t be compared at all',
        ],
        0
      )
    ),
    ...tagged(
      'cash',
      B,
      choice(
        'm-fin-cash-b1',
        'Profit Isn’t Cash',
        'Which is true?',
        [
          'A profitable business can run out of cash, because sales and costs count when they happen, not when they’re paid',
          'A profitable business always has cash',
          'Cash and profit are the same over any month',
          'Only loss-making businesses run out of cash',
        ],
        0
      )
    ),
    ...tagged(
      'cash',
      J,
      short(
        'm-fin-cash-j1',
        'Cash Conversion Cycle',
        'Customers pay in 45 days on average, stock sits for 60 days, and suppliers are paid in 30 days.\n\nHow many days is the cash conversion cycle?',
        ['75', '75 days']
      )
    ),
    ...tagged(
      'cash',
      P,
      multi(
        'm-fin-cash-p1',
        'Freeing Cash',
        'Which of these free up cash from working capital? Tick all that apply.',
        ['Invoicing on delivery and chasing overdue accounts', 'Agreeing longer payment terms with suppliers', 'Clearing slow-moving stock', 'Paying suppliers early', 'Revaluing the office upwards'],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'cash',
      S,
      choice(
        'm-fin-cash-s1',
        'Week Nine',
        'Your 13-week cash forecast shows the business going over its overdraft limit in week 9. What do you do?',
        [
          'Tell leadership and the bank now, model the downside, and line up actions to bring cash in and push spend out',
          'Wait to see if week 9 actually happens',
          'Quietly delay payroll that week',
          'Remove week 9 from the forecast as an outlier',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-fin-case-b1', 'Gross Margin', 'Revenue £500k. Cost of sales £300k.\n\nWhat is the gross margin, as a %?', ['40%', '40', '0.4', '40 percent'])),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-fin-case-p',
        'Kestrel Print: Q3 Variances',
        `The board sees profit £1k under budget and calls it “on plan”.

                     Budget      Actual
Units sold           10,000      9,000
Price per unit       £20         £22
Revenue              £200,000    £198,000
Variable cost/unit   £12         £13
Variable costs       £120,000    £117,000
Fixed costs          £50,000     £52,000
Profit               £30,000     £29,000`,
        'Management accounts'
      ),
      short('m-fin-case-p1', 'Price Variance', 'What is the sales price variance, in £? (Say if it is favourable or adverse.)', ['18000 favourable', '18000 fav', '18000 f', '18k favourable', '18000'], {
        taskId: 'm-fin-case-p',
      }),
      short(
        'm-fin-case-p2',
        'Volume Variance',
        'What is the sales volume variance on contribution, at budgeted contribution per unit, in £?',
        ['8000 adverse', '8000 adv', '8000 a', '8k adverse', '8000'],
        { taskId: 'm-fin-case-p' }
      ),
      short(
        'm-fin-case-p3',
        'Variable Cost Variance',
        'Against a budget flexed to the units actually sold, what is the variable cost variance, in £?',
        ['9000 adverse', '9000 adv', '9000 a', '9k adverse', '9000'],
        { taskId: 'm-fin-case-p' }
      ),
      written(
        'm-fin-case-p4',
        'Is It on Plan?',
        'Write a short note to the board on whether Q3 is really “on plan”.',
        [
          'Profit is close to budget only because two big swings cancel out',
          'The price rise added £18k (favourable)',
          'Selling 1,000 fewer units cost £8k of contribution, and variable costs ran £1 a unit over (£9k adverse); fixed costs were £2k over',
          'Asks whether the price rise caused the lost volume, and why unit costs rose',
          'Recommends an action, e.g. investigate the cost overrun and watch volume before raising prices again',
        ],
        `Q3 isn't really on plan; two large variances cancel out. Pricing at £22 instead of £20 brought in £18k more, but we sold 1,000 fewer units, losing £8k of contribution, and each unit cost £13 instead of £12, another £9k. Fixed costs were £2k over. So £30k + £18k − £8k − £9k − £2k = £29k. I'd want to know whether the price rise is what cost us volume, and why unit costs rose: if both continue, next quarter won't land so neatly. First step: get purchasing to explain the £1 a unit.`,
        { taskId: 'm-fin-case-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-fin-case-s',
        'The Packing Machine',
        `Operations want a £100,000 packing machine. They estimate it saves £30,000 a year for 5 years, with no value at the end.

The company's cost of capital is 10%. The 5-year annuity factor at 10% is 3.791.

The CFO says: “Payback is over three years. Our rule is three. Reject it.”`,
        'Investment proposal'
      ),
      short('m-fin-case-s1', 'NPV', 'What is the net present value, in £? (Round to the nearest £10.)', ['13730', '13,730', '13.73k', '13700', '13.7k'], { taskId: 'm-fin-case-s' }),
      short(
        'm-fin-case-s2',
        'Break-even Saving',
        'What annual saving gives an NPV of exactly zero, in £? (Round to the nearest £100.)',
        ['26400', '26,400', '26.4k', '26378', '26380'],
        { taskId: 'm-fin-case-s' }
      ),
      written(
        'm-fin-case-s3',
        'Reply to the CFO',
        'Reply to the CFO: should the company buy the machine?',
        [
          'NPV is positive (about £13.7k at 10%), so it adds value on these estimates',
          'Payback (3.3 years) ignores the time value of money and the savings after year three',
          'The decision rests on the savings estimate: it only needs to be about £26.4k a year, 12% below the estimate, to break even',
          'Asks how reliable operations’ estimate is, and about risks such as downtime, maintenance or the machine lasting less than five years',
          'Gives a clear recommendation, e.g. approve if the savings hold up to scrutiny, or approve with a post-investment review',
        ],
        `On these numbers I'd buy it. At our 10% cost of capital the NPV is about +£13.7k, so it earns more than our capital costs. The three-year rule rejects it only because payback (3.3 years) ignores the time value of money and the last two years of savings. The real question is the £30k estimate: the machine breaks even at about £26.4k a year, so we have a 12% margin for error. I'd ask operations how they got £30k and what maintenance and downtime will cost, then approve it with a review after a year.`,
        { taskId: 'm-fin-case-s' }
      )
    ),
  ],
};

// ---------- Marketing ----------
export const MARKETING_MODULE: ModuleSkeleton = {
  familyId: 'test-mkt-01',
  aspects: [
    { id: 'metrics', name: 'Metrics & Funnel', summary: 'What each metric says, which ones matter, and customer value.' },
    { id: 'experiments', name: 'Testing & Experiments', summary: 'Running A/B tests and reading them honestly.' },
    { id: 'channels', name: 'Channels & Attribution', summary: 'What each channel does, and how much of the credit it really earns.' },
    { id: 'planning', name: 'Campaign Planning', summary: 'Goals, audiences, messages and where the money goes.' },
    { id: 'case', name: 'Campaign Analysis', summary: 'Working through real results to decide where the next pound goes.' },
  ],
  tags: {
    'q-mkt-2': ['metrics', B],
    'q-mkt-4': ['metrics', J],
    'q-mkt-3': ['experiments', J],
    'q-mkt-1': ['channels', J],
    'q-mkt-6': ['planning', B],
    'q-mkt-5': ['planning', J],
    'q-mkt-case': ['case', J],
    'q-mkt-7': ['case', J],
    'q-mkt-8': ['case', J],
    'q-mkt-9': ['case', J],
    'q-mkt-10': ['case', J],
  },
  bank: [
    ...tagged(
      'metrics',
      P,
      short(
        'm-mkt-met-p1',
        'Lifetime Value',
        'Average order £50 at a 40% margin. A customer buys 4 times a year and stays 2 years.\n\nWhat is their lifetime value in margin, in £?',
        ['160', '£160']
      )
    ),
    ...tagged(
      'metrics',
      S,
      choice(
        'm-mkt-met-s1',
        'Blended CAC',
        'After a press story brought in thousands of free sign-ups, average cost per customer fell from £50 to £30. The CEO wants to double paid spend “now customers are cheaper”. What’s wrong?',
        [
          'The average mixes free customers with paid ones; paid customers cost no less, so look at the cost per channel before scaling',
          'Nothing; cheaper customers justify more spend',
          'CAC should never fall',
          'Paid spend should be cut instead',
        ],
        0
      )
    ),
    ...tagged(
      'experiments',
      B,
      choice(
        'm-mkt-exp-b1',
        'A Fair Test',
        'What makes an A/B test fair?',
        [
          'Visitors are split at random and see the two versions over the same period, measured on one agreed metric',
          'Version A runs this month and version B next month',
          'Version B is shown only to loyal customers',
          'Each person chooses which version they want',
        ],
        0
      )
    ),
    ...tagged(
      'experiments',
      P,
      choice(
        'm-mkt-exp-p1',
        'Peeking',
        'A colleague checks the A/B test every morning and stops it the first day it shows a significant winner. What’s the problem?',
        [
          'Checking repeatedly and stopping at the first good result makes false winners far more likely; fix the sample size up front',
          'Nothing; stopping early saves money',
          'Tests should only be checked at the weekend',
          'Significance only applies to email tests',
        ],
        0
      )
    ),
    ...tagged(
      'experiments',
      S,
      multi(
        'm-mkt-exp-s1',
        'A Winner to Worry About',
        'Version B lifts sign-ups by 12% (significant), but it shows the price only at checkout. What would you check before rolling it out? Tick all that apply.',
        ['Revenue per visitor, not just sign-ups', 'Refunds and early cancellations from B’s customers', 'Complaints and support contacts', 'Clicks on the sign-up button', 'Whether B’s customers stay as long as A’s'],
        [0, 1, 2, 4]
      )
    ),
    ...tagged(
      'channels',
      B,
      match('m-mkt-ch-b1', 'What Each Channel Does', 'Match each channel to the job it usually does best.', [
        ['Paid search', 'Catches people already looking for what you sell'],
        ['Paid social', 'Reaches new people who match an audience'],
        ['Email', 'Brings existing subscribers back cheaply'],
        ['SEO', 'Builds free traffic over months'],
      ])
    ),
    ...tagged(
      'channels',
      P,
      choice(
        'm-mkt-ch-p1',
        'Last Click',
        'Reports use last-click attribution, and brand search gets most of the credit. What’s the likely distortion?',
        [
          'Channels that created the demand earlier, like social and video, are undervalued, while brand search collects credit for people already decided',
          'Brand search is undervalued',
          'Last-click credits every channel equally',
          'There is no distortion if tracking works',
        ],
        0
      )
    ),
    ...tagged(
      'channels',
      S,
      short(
        'm-mkt-ch-s1',
        'The Next £5,000',
        'Search spend of £10,000 brought 500 customers. Raising it to £15,000 brought 600.\n\nWhat did each of the extra customers cost, in £?',
        ['50', '£50']
      )
    ),
    ...tagged(
      'planning',
      P,
      choice(
        'm-mkt-plan-p1',
        'Target: Everyone',
        'A start-up’s brief says the audience is “everyone aged 18 to 65”. What do you do?',
        [
          'Pick the segment with the sharpest need that you can reach affordably, and write the message for them',
          'Run the same ad to all of them',
          'Split the budget equally across every age group',
          'Ask for a bigger budget to reach everyone',
        ],
        0
      )
    ),
    ...tagged(
      'planning',
      S,
      choice(
        'm-mkt-plan-s1',
        'Cutting Brand',
        'The CFO wants to cut all brand advertising because it barely shows up in last-click reports. What do you recommend?',
        [
          'Test it: pause brand ads in some regions and compare branded search, direct traffic and sales with regions where they run, then decide',
          'Cut it all: if it doesn’t show in reports, it doesn’t work',
          'Double it, since brand always works',
          'Move all brand spend into retargeting',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-mkt-case-b1', 'Cost per Customer', 'You spent £1,000 and won 25 customers.\n\nWhat was the cost per acquisition, in £?', ['40', '£40'])),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-mkt-case-p',
        'Bloom Box',
        `A £25-a-month flower subscription. After costs you keep £10 a month per subscriber. The average subscriber stays 6 months.

Last quarter:
Channel        Spend      New subscribers
Paid social    £30,000    600
Influencers    £14,000    200
Referrals      £6,000     300

Referrals cost £20 per new subscriber: a £10 credit each to the referrer and the friend.`,
        'Growth report'
      ),
      short('m-mkt-case-p1', 'Lifetime Value', 'What is a subscriber’s lifetime value in margin, in £?', ['60', '£60'], { taskId: 'm-mkt-case-p' }),
      multi(
        'm-mkt-case-p2',
        'Which Pay Back',
        'Which channels earn back what a subscriber costs within their lifetime? Tick all that apply.',
        ['Paid social', 'Influencers', 'Referrals'],
        [0, 2],
        { taskId: 'm-mkt-case-p' }
      ),
      short('m-mkt-case-p3', 'Payback', 'How many months does a paid social subscriber take to pay back what they cost?', ['5', '5 months'], { taskId: 'm-mkt-case-p' }),
      written(
        'm-mkt-case-p4',
        'Next Quarter',
        'How would you change next quarter’s plan?',
        [
          'Referrals are by far the cheapest (£20 vs £60 of value) and should be pushed, though they are limited by the existing base',
          'Paid social is only slightly profitable (£50 vs £60) and takes 5 months to pay back, so scale carefully and watch cost per subscriber',
          'Influencers lose about £10 per subscriber (£70 cost): cut, renegotiate or keep only those that perform',
          'Retention is a lever: every extra month a subscriber stays adds £10 to value for every channel',
          'A concrete plan, e.g. move influencer budget to referral incentives and test retention offers',
        ],
        `Push referrals hardest: each subscriber costs £20 and is worth £60. I'd test a bigger reward to see how far the base will stretch. Paid social just about works (£50 against £60) but takes five months to pay back, so I'd hold it level and watch the cost per subscriber. Influencers cost £70 for £60 of value, so I'd cut all but the best performers and move that money into referrals. And I'd work on retention: one more month per subscriber adds £10 of value, making every channel better.`,
        { taskId: 'm-mkt-case-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-mkt-case-s',
        'The 20% Off Email',
        `A 20%-off email went to 90,000 customers. 10,000 more were picked at random and held back (no email).

Group      Customers   Orders
Emailed    90,000      4,500
Held back  10,000      400

At full price an order is £80 and earns £40 margin. With 20% off, it's £64 and earns £24.

The CMO calls it a hit: “4,500 orders and £288,000 of revenue!”`,
        'Campaign results'
      ),
      short('m-mkt-case-s1', 'Extra Orders', 'How many orders did the email add, compared with not sending it?', ['900', '900 orders'], { taskId: 'm-mkt-case-s' }),
      short(
        'm-mkt-case-s2',
        'Margin Effect',
        'How much margin did the campaign gain or lose, compared with not sending it, in £?',
        ['36000 lost', 'lost 36000', '36000 loss', 'minus 36000', '36000', '36k lost', 'lost 36k'],
        { taskId: 'm-mkt-case-s' }
      ),
      written(
        'm-mkt-case-s3',
        'Reply to the CMO',
        'Reply to the CMO, and say what you’d do with the next promotion.',
        [
          'Most orders would have happened anyway: the held-back group converted at 4% vs 5%, so only about 900 orders were extra',
          'The 3,600 who would have paid full price got 20% off, so margin fell by about £36k (£108k vs £144k)',
          'Revenue and order counts are the wrong measure; incremental margin is the right one',
          'Proposes a fix, e.g. target customers unlikely to buy anyway, use a smaller discount, or a threshold offer',
          'Keeps a holdout group in future promotions to measure them',
        ],
        `It looks like a hit but it lost money. The held-back group bought at 4% without any email, so of the 4,500 orders only about 900 were extra. The other 3,600 customers would have paid full price and got 20% off instead. Margin from the emailed group was £108k against £144k if we hadn't sent it: about £36k lost. Next time I'd send the discount only to lapsed customers who rarely buy at full price, try 10% or a spend threshold, and keep a holdout so we measure extra margin, not revenue.`,
        { taskId: 'm-mkt-case-s' }
      )
    ),
  ],
};

// ---------- Sales ----------
export const SALES_MODULE: ModuleSkeleton = {
  familyId: 'test-sales-01',
  aspects: [
    { id: 'discovery', name: 'Discovery & Qualification', summary: 'Finding the real problem, and whether a deal is worth chasing.' },
    { id: 'objections', name: 'Objections & Negotiation', summary: 'Handling pushback and trading, not giving, concessions.' },
    { id: 'pipeline', name: 'Pipeline & Forecasting', summary: 'Stages, coverage and calling an honest number.' },
    { id: 'deals', name: 'Deal Management', summary: 'Stakeholders, close plans and keeping deals moving.' },
    { id: 'case', name: 'Deal Reviews', summary: 'Working through a real pipeline or deal and deciding what to do.' },
  ],
  tags: {
    'q-sales-1': ['discovery', B],
    'q-sales-6': ['objections', B],
    'q-sales-2': ['objections', J],
    'q-sales-4': ['pipeline', B],
    'q-sales-3': ['pipeline', J],
    'q-sales-5': ['deals', J],
    'q-sales-case': ['case', J],
    'q-sales-7': ['case', J],
    'q-sales-8': ['case', J],
    'q-sales-9': ['case', J],
    'q-sales-10': ['case', J],
  },
  bank: [
    ...tagged(
      'discovery',
      J,
      choice(
        'm-sales-disc-j1',
        'A Friendly Prospect',
        'A prospect is friendly and wants a demo, but can’t say who signs off or when they’d buy. How do you treat it?',
        [
          'Not qualified yet: ask how they’ll decide and who’s involved before investing in a tailored demo',
          'Qualified: they want a demo',
          'Book the demo and add it to the forecast',
          'Drop them straight away',
        ],
        0
      )
    ),
    ...tagged(
      'discovery',
      P,
      multi(
        'm-sales-disc-p1',
        'Is It Real?',
        'Which of these suggest a deal is real? Tick all that apply.',
        [
          'A dated event forcing a decision, like a contract renewal',
          'The budget holder has joined a call',
          'They’ve put a cost on the problem',
          'They’ve agreed a close plan with you',
          'They asked for a price list',
          'They loved the demo',
        ],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'discovery',
      S,
      choice(
        'm-sales-disc-s1',
        'Champion or Fan?',
        'How do you tell a real champion from someone who just likes you?',
        [
          'A champion has influence, gives you access to the budget holder and inside information, and sells for you when you’re not in the room',
          'A champion replies to emails quickly',
          'A champion is the most senior person you’ve met',
          'A champion says the product is great',
        ],
        0
      )
    ),
    ...tagged(
      'objections',
      P,
      choice(
        'm-sales-obj-p1',
        'Before You Negotiate',
        'What should you settle before a negotiation?',
        [
          'Your walk-away point, what you can trade and in what order, and what they’re likely to ask for',
          'The discount you’ll open with',
          'Nothing; react to what they say',
          'Only the date you need to close',
        ],
        0
      )
    ),
    ...tagged(
      'objections',
      S,
      choice(
        'm-sales-obj-s1',
        'Undercut Late',
        'In the final week, the buyer says a competitor is 30% cheaper. What’s the best response?',
        [
          'Go back to the value and risk you agreed on, with the budget holder, and find out what the cheaper offer leaves out before discussing price',
          'Match the price straight away',
          'Tell them the competitor is lying',
          'Walk away from the deal',
        ],
        0
      )
    ),
    ...tagged(
      'pipeline',
      P,
      short(
        'm-sales-pipe-p1',
        'Coverage',
        'Quarter target £400k. Your win rate is 25%. Your pipeline for the quarter is £1.0m.\n\nHow much more pipeline do you need, in £?',
        ['600000', '600k', '0.6m', '600 000']
      )
    ),
    ...tagged(
      'pipeline',
      S,
      choice(
        'm-sales-pipe-s1',
        'A Quiet Start',
        'Your sales cycle averages 90 days. Two weeks into the quarter, new pipeline is half the usual. What does it mean?',
        [
          'This quarter may be fine, but next quarter will fall short unless pipeline building picks up now',
          'This quarter will miss its target',
          'Nothing; new pipeline doesn’t affect results',
          'Win rates will rise to make up for it',
        ],
        0
      )
    ),
    ...tagged(
      'deals',
      B,
      choice(
        'm-sales-deal-b1',
        'Keeping the CRM Up to Date',
        'Why log next steps and close dates in the CRM after every call?',
        ['So the forecast reflects reality and anyone can pick up the deal', 'Because managers like reports', 'It only matters for big deals', 'To count your calls'],
        0
      )
    ),
    ...tagged(
      'deals',
      P,
      choice(
        'm-sales-deal-p1',
        'Many Hands',
        'A late-stage deal needs legal, security and procurement to sign off. What helps most?',
        [
          'A close plan agreed with the buyer listing every step, owner and date up to signature',
          'Emailing the contract and waiting',
          'A discount for signing this month',
          'Asking your manager to call their CEO',
        ],
        0
      )
    ),
    ...tagged(
      'deals',
      S,
      choice(
        'm-sales-deal-s1',
        'Slipped Twice',
        'Your biggest deal has slipped two quarters in a row. Your contact says “next month for sure”. What do you do?',
        [
          'Ask the budget holder directly what forces a decision and when; without a clear reason to act now, take it out of the forecast',
          'Keep it in the forecast; it’s your biggest deal',
          'Offer a big discount to get it signed',
          'Stop contacting them until they’re ready',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-sales-case-b1', 'Weighted Value', 'A £20,000 deal has a 25% chance of closing.\n\nWhat is its weighted value, in £?', ['5000', '5,000', '5k'])),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-sales-case-p',
        'Your Funnel',
        `Last quarter: 400 leads → 100 meetings → 40 qualified → 10 won. Average deal £12,000.

Team averages: leads to meetings 20%, meetings to qualified 50%, qualified to won 30%.

Next quarter's target is £180,000.`,
        'Funnel report'
      ),
      short('m-sales-case-p1', 'Deals Needed', 'How many deals do you need to win next quarter?', ['15', '15 deals'], { taskId: 'm-sales-case-p' }),
      short('m-sales-case-p2', 'Leads Needed', 'At last quarter’s rates, how many leads would you need?', ['600', '600 leads'], { taskId: 'm-sales-case-p' }),
      multi(
        'm-sales-case-p3',
        'Below the Team',
        'Where are you below the team average? Tick all that apply.',
        ['Leads to meetings', 'Meetings to qualified', 'Qualified to won'],
        [1, 2],
        { taskId: 'm-sales-case-p' }
      ),
      written(
        'm-sales-case-p4',
        'Your Plan',
        'How will you hit £180,000? Be specific.',
        [
          'Needs 15 wins, which takes 600 leads at current rates: 50% more',
          'Booking meetings is a strength (25% vs 20%); the leaks are qualifying meetings (40% vs 50%) and winning (25% vs 30%)',
          'Reaching team averages on both would turn the same 400 leads into 100 meetings, 50 qualified and 15 wins: the target',
          'Concrete actions, e.g. better discovery questions, multi-threading deals, reviewing lost deals',
          'A fallback, e.g. adding some leads in case improvement takes time',
        ],
        `I need 15 wins. At my current rates that's 600 leads, 50% more than last quarter. But booking meetings is where I'm strong (25% against the team's 20%); I lose deals after that. If I qualify half my meetings, as the team does, and win 30% of qualified deals, the same 400 leads give 100 meetings, 50 qualified and 15 wins: £180k. So I'll sharpen discovery to qualify properly, get the budget holder into every deal earlier, and review my last five losses with my manager. As cover, I'll aim for 450 leads in case the improvements take a few weeks.`,
        { taskId: 'm-sales-case-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-sales-case-s',
        'Northwind Renewal',
        `A new enterprise deal at list price £200,000 a year. In discovery, Northwind put the cost of the problem at £500,000 a year.

Procurement emails: “We need 20% off or we won't sign this quarter.”

Your rules: any discount over 15% needs VP approval. Your VP prefers longer contracts and upfront payment.

Options you're weighing:
A. 20% off a one-year contract
B. 10% off a three-year contract, paid annually upfront`,
        'Deal desk notes'
      ),
      short('m-sales-case-s1', 'Option A', 'What is the total contract value of option A, in £?', ['160000', '160k', '160,000'], { taskId: 'm-sales-case-s' }),
      short('m-sales-case-s2', 'Option B', 'What is the total contract value of option B, in £?', ['540000', '540k', '540,000'], { taskId: 'm-sales-case-s' }),
      written(
        'm-sales-case-s3',
        'Reply to Procurement',
        'Write your reply to procurement.',
        [
          'Doesn’t simply concede 20%: anchors on the value (a £500k a year problem against a £200k price)',
          'Offers a trade: a discount in return for something, such as the three-year term and upfront payment of option B',
          'Shows B is worth far more (£540k vs £160k) and stays within the 15% limit without needing VP approval',
          'Keeps the door open: asks what matters most to them, and involves the budget holder if procurement won’t move',
          'Professional, short and concrete, with a clear next step',
        ],
        `Thanks for this. We agreed the problem costs Northwind about £500,000 a year, so at £200,000 the case is strong at list price. I can't do 20% on a one-year term. What I can do is 10% off if Northwind commits to three years with each year paid upfront: £180,000 a year, fixed for three years, which protects you from price rises. If there's something else behind the 20% (budget timing, perhaps), tell me and I'll see what I can shape. Could we speak on Thursday with your sponsor to agree it?`,
        { taskId: 'm-sales-case-s' }
      )
    ),
  ],
};

// ---------- Healthcare ----------
export const HEALTHCARE_MODULE: ModuleSkeleton = {
  familyId: 'test-health-01',
  aspects: [
    { id: 'infection', name: 'Infection Prevention', summary: 'Hand hygiene, isolation, PPE and outbreaks.' },
    { id: 'ethics', name: 'Consent & Confidentiality', summary: 'Consent, capacity, confidentiality and being open when things go wrong.' },
    { id: 'obs', name: 'Observations & Escalation', summary: 'NEWS2, spotting deterioration and handing over with SBAR.' },
    { id: 'meds', name: 'Medicines Safety', summary: 'Safe administration, drug calculations and challenging errors.' },
    { id: 'case', name: 'Clinical Cases', summary: 'A patient (or a ward) in front of you: assess, act and communicate.' },
  ],
  tags: {
    'q-health-1': ['infection', B],
    'q-health-4': ['infection', J],
    'q-health-2': ['ethics', B],
    'q-health-3': ['ethics', J],
    'q-health-6': ['obs', B],
    'q-health-5': ['obs', J],
    'q-health-case': ['case', J],
    'q-health-7': ['case', J],
    'q-health-8': ['case', J],
    'q-health-9': ['case', J],
    'q-health-10': ['case', J],
  },
  bank: [
    ...tagged(
      'infection',
      P,
      choice(
        'm-health-inf-p1',
        'Needlestick',
        'You prick your finger on a used needle. What do you do first?',
        [
          'Encourage it to bleed, wash it under running water with soap, then report it to occupational health or A&E straight away',
          'Suck the wound and carry on',
          'Scrub it hard with alcohol gel and report it at the end of the shift',
          'Wait for symptoms before reporting it',
        ],
        0
      )
    ),
    ...tagged(
      'infection',
      S,
      multi(
        'm-health-inf-s1',
        'Outbreak in a Bay',
        'Within 24 hours, three patients in one bay develop vomiting and diarrhoea. Norovirus is suspected. What do you do? Tick all that apply.',
        [
          'Isolate or cohort the affected patients',
          'Close the bay to new admissions',
          'Inform the infection prevention team',
          'Keep staff with symptoms off work until 48 hours after they stop',
          'Rely on alcohol gel between patients',
          'Move the affected patients to other wards to spread the load',
        ],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'ethics',
      P,
      choice(
        'm-health-eth-p1',
        'Capacity',
        'A patient with dementia refuses a scan. She can’t retain what you explain for more than a minute. What happens?',
        [
          'Assess her capacity for this decision; if she lacks it, decide in her best interests, consulting family or any attorney and choosing the least restrictive option',
          'Her refusal stands, whatever her capacity',
          'Her daughter signs a consent form on her behalf',
          'Sedate her and do the scan',
        ],
        0
      )
    ),
    ...tagged(
      'ethics',
      S,
      choice(
        'm-health-eth-s1',
        'Something Went Wrong',
        'A patient’s antibiotic dose was given 12 hours late and they deteriorated. What does your duty of candour require?',
        [
          'Tell the patient (or family) what happened, apologise, report the incident, and share what the investigation finds',
          'Report it internally only, so as not to worry the patient',
          'Say nothing unless the patient asks',
          'Correct the chart so the delay isn’t visible',
        ],
        0
      )
    ),
    ...tagged(
      'obs',
      P,
      choice(
        'm-health-obs-p1',
        'COPD and Oxygen',
        'A patient with COPD has a prescribed oxygen saturation target of 88–92%. How do you score their SpO2 on NEWS2?',
        [
          'Use SpO2 Scale 2, as prescribed for patients at risk of hypercapnic respiratory failure',
          'Use Scale 1, like every patient',
          'Don’t score SpO2 for COPD patients',
          'Always score it as 3',
        ],
        0
      )
    ),
    ...tagged(
      'obs',
      S,
      choice(
        'm-health-obs-s1',
        'DNACPR',
        'A patient with a DNACPR form has a NEWS2 of 8. A colleague says: “No point escalating, they’re DNACPR.” What do you say?',
        [
          'DNACPR only means no CPR if their heart stops; escalate now and treat as their escalation plan says',
          'They’re right: DNACPR means no active treatment',
          'Call the family before doing anything',
          'Only escalate if the score reaches 10',
        ],
        0
      )
    ),
    ...tagged(
      'meds',
      B,
      multi(
        'm-health-meds-b1',
        'Before You Give It',
        'Before giving a medicine, what do you check? Tick all that apply.',
        ['The patient’s identity against their wristband', 'Drug, dose and route against the prescription', 'When it was last given', 'Allergies', 'That the tablet looks the same colour as last time', 'The bed number alone'],
        [0, 1, 2, 3]
      )
    ),
    ...tagged('meds', J, short('m-health-meds-j1', 'Liquid Dose', 'Prescribed 500 mg. The stock is 250 mg in 5 ml.\n\nHow many ml do you give?', ['10', '10 ml', '10ml'])),
    ...tagged(
      'meds',
      P,
      short(
        'm-health-meds-p1',
        'Infusion Rate',
        'Heparin 25,000 units in 50 ml. Prescribed 1,000 units an hour.\n\nWhat rate do you set the pump to, in ml an hour?',
        ['2', '2 ml', '2 ml/h', '2 ml/hr', '2ml/h']
      )
    ),
    ...tagged(
      'meds',
      S,
      choice(
        'm-health-meds-s1',
        'Ten Times Too Much',
        'Oral morphine is prescribed at 50 mg; the usual dose is 5 mg. You call the doctor, who says, “Just give it, I’ll fix it later.” What do you do?',
        [
          'Don’t give it; ask for the prescription to be reviewed and corrected first, escalate if needed, and report it as a near miss',
          'Give it, since the doctor said so',
          'Give 5 mg and change the chart yourself',
          'Give half and see how they respond',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-health-case-b1', 'Fluid Balance', 'Over 12 hours: 1,500 ml in, 900 ml out.\n\nWhat is the fluid balance, in ml?', ['600', '+600', '600 ml', 'plus 600', 'positive 600'])),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-health-case-p',
        'Bed 9: Mrs Lewis',
        `Mrs Lewis, 64, type 1 diabetes, on insulin.

11:30: clammy, shaky and muddled, but awake and able to swallow. Capillary blood glucose 3.1 mmol/L.

Lunch is at 12:30. Her lunchtime insulin is due then.`,
        'Nursing notes'
      ),
      choice(
        'm-health-case-p1',
        'First Action',
        'What do you do first?',
        [
          'Give 15–20 g of fast-acting carbohydrate, such as about 200 ml of fruit juice, then recheck',
          'Give her lunchtime insulin early',
          'Wait for lunch at 12:30',
          'Give a biscuit and recheck in an hour',
        ],
        0,
        { taskId: 'm-health-case-p' }
      ),
      short('m-health-case-p2', 'Recheck', 'How many minutes later do you recheck her glucose?', ['15', '10 15', '10 to 15', '15 minutes', '10'], { taskId: 'm-health-case-p' }),
      multi(
        'm-health-case-p3',
        'Once She’s Above 4',
        'Her glucose is now 5.2. What next? Tick all that apply.',
        ['A longer-acting carbohydrate snack, or her meal if it’s due', 'Find out why it happened: a missed meal, a dose or activity', 'Tell the doctor and record the episode', 'Stop her insulin for the rest of the day', 'Nothing more is needed'],
        [0, 1, 2],
        { taskId: 'm-health-case-p' }
      ),
      written(
        'm-health-case-p4',
        'Handing Over',
        'Write your handover of this episode to the afternoon nurse.',
        [
          'States the event: a hypo of 3.1 at 11:30 with symptoms, treated with fast-acting carbohydrate',
          'Gives the response: rechecked and now 5.2, followed by a longer-acting snack or meal',
          'Flags the insulin: lunchtime insulin shouldn’t simply be omitted; the doctor or diabetes team reviewed it',
          'Suggests a cause found or still to be found, and what to watch for',
          'Asks for closer monitoring, e.g. recheck glucose before the next meal and at a set time',
        ],
        `Mrs Lewis, bed 9, type 1. At 11:30 she was clammy and muddled with a glucose of 3.1. I gave 200 ml of orange juice; at 11:45 she was 5.2 and back to herself, and she had a sandwich. She'd only eaten half her breakfast, which is probably why. The doctor has reviewed her: she had her lunchtime insulin with lunch as normal. Please check her glucose before the evening meal and at bedtime, and watch for shakiness or confusion. It's recorded and the diabetes team know.`,
        { taskId: 'm-health-case-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-health-case-s',
        'Nights, 02:00',
        `You're nurse in charge: 28 beds, four nurses, one an agency nurse new to the ward.

Bed 3: Mr Okafor, 58, day 1 after bowel surgery. On room air, alert.
Breathing 22, SpO2 94%, BP 105/65, pulse 115, temp 38.5.

Critical care outreach is busy and can't come for 40 minutes.

Also: bed 22 is confused and trying to climb out of bed; bed 19's IV antibiotics are due now; an admission from A&E arrives in 15 minutes.`,
        'Night shift'
      ),
      short('m-health-case-s1', 'NEWS2', 'What is Mr Okafor’s NEWS2 score?', ['7'], { taskId: 'm-health-case-s' }),
      choice(
        'm-health-case-s2',
        'Outreach Can’t Come',
        'With outreach 40 minutes away, what do you do about Mr Okafor?',
        [
          'Call the on-call doctor directly for an urgent review now, start the sepsis pathway, and call the emergency team if he gets worse',
          'Wait 40 minutes for outreach',
          'Recheck his observations in four hours',
          'Give paracetamol and recheck in an hour',
        ],
        0,
        { taskId: 'm-health-case-s' }
      ),
      written(
        'm-health-case-s3',
        'Running the Ward',
        'How do you run the next hour so every patient stays safe?',
        [
          'Mr Okafor first: escalate to the on-call doctor now with SBAR, start sepsis care, and put an experienced nurse with him',
          'Bed 22: makes him safe straight away, e.g. someone stays with him, bed lowered, falls measures',
          'Bed 19: antibiotics given on time by a competent nurse (not left to the new agency nurse unsupervised)',
          'Gives the agency nurse work that suits someone new, with a named person to ask, and prepares for the admission or asks the site manager to delay it',
          'Says when to escalate further, e.g. calling the site manager for help, and documents decisions',
        ],
        `Mr Okafor's NEWS2 is 7, so I call the on-call registrar myself now using SBAR and ask for a review within minutes; I start the sepsis screen, give oxygen if he needs it, take bloods and cultures for the doctor, and put my most experienced nurse with him on observations every 15 minutes. If he worsens I put out an emergency call. Bed 22 needs someone with him now, so the agency nurse sits with him with the bed lowered and falls sensor on. The third nurse gives bed 19's antibiotics on time. I'll ring the site manager to say we're stretched and ask to hold the admission for 30 minutes or send help, then take it myself. I'll document everything as I go.`,
        { taskId: 'm-health-case-s' }
      )
    ),
  ],
};

// ---------- Project management ----------
export const PM_MODULE: ModuleSkeleton = {
  familyId: 'test-pm-01',
  aspects: [
    { id: 'planning', name: 'Planning & Estimating', summary: 'Breaking work down, estimating it and building the schedule.' },
    { id: 'risk', name: 'Risks & Issues', summary: 'Finding risks early, sizing them and dealing with them.' },
    { id: 'stakeholders', name: 'Stakeholders & Governance', summary: 'Roles, documents, sponsors and who decides what.' },
    { id: 'control', name: 'Tracking & Control', summary: 'Scope, change control and measuring progress honestly.' },
    { id: 'case', name: 'Delivery Cases', summary: 'A real plan or project in trouble: work out where it stands and what to do.' },
  ],
  tags: {
    'q-pm-5': ['planning', J],
    'q-pm-1': ['risk', B],
    'q-pm-6': ['risk', J],
    'q-pm-2': ['stakeholders', B],
    'q-pm-4': ['stakeholders', J],
    'q-pm-3': ['control', J],
    'q-pm-case': ['case', J],
    'q-pm-7': ['case', J],
    'q-pm-8': ['case', J],
    'q-pm-9': ['case', J],
    'q-pm-10': ['case', J],
  },
  bank: [
    ...tagged(
      'planning',
      B,
      choice(
        'm-pm-plan-b1',
        'Work Breakdown',
        'What is a work breakdown structure for?',
        [
          'Splitting the whole project into smaller pieces of work you can estimate, assign and track',
          'Listing who reports to whom',
          'Recording the budget',
          'Tracking risks',
        ],
        0
      )
    ),
    ...tagged(
      'planning',
      P,
      short(
        'm-pm-plan-p1',
        'Three-Point Estimate',
        'A task’s estimates are: best case 4 days, most likely 6, worst case 14.\n\nWhat is the PERT estimate, in days?',
        ['7', '7 days']
      )
    ),
    ...tagged(
      'planning',
      S,
      choice(
        'm-pm-plan-s1',
        'One Specialist, Two Projects',
        'Your project and another both need the same specialist for the same three weeks, and both are on the critical path. What do you do?',
        [
          'Raise it with both sponsors (or the portfolio board) with each option’s impact, and let them set the priority',
          'Split the specialist’s time 50/50 without telling anyone',
          'Book the specialist first before the other project does',
          'Quietly delay your own project',
        ],
        0
      )
    ),
    ...tagged(
      'risk',
      P,
      choice(
        'm-pm-risk-p1',
        'Worth Mitigating?',
        'A risk has a 20% chance of costing £50,000. Mitigation costs £4,000 and halves the chance. Is it worth it?',
        [
          'Yes: it cuts the expected loss from £10,000 to £5,000, saving £5,000 for £4,000',
          'No: £4,000 is spent for certain',
          'No: the risk is only 20%',
          'Yes, any mitigation is always worth it',
        ],
        0
      )
    ),
    ...tagged(
      'risk',
      S,
      choice(
        'm-pm-risk-s1',
        'Green Until It’s Red',
        'Workstreams report green every week, then go red a week before launch. How do you stop this?',
        [
          'Track objective evidence (milestones met, work finished) rather than self-rated colours, and make it safe to report bad news early',
          'Ask for status reports twice a week',
          'Discipline the workstream leads',
          'Add an amber colour',
        ],
        0
      )
    ),
    ...tagged(
      'stakeholders',
      P,
      match('m-pm-stk-p1', 'Power and Interest', 'Match each stakeholder to how you’d usually manage them.', [
        ['High power, high interest', 'Manage closely'],
        ['High power, low interest', 'Keep satisfied'],
        ['Low power, high interest', 'Keep informed'],
        ['Low power, low interest', 'Monitor'],
      ])
    ),
    ...tagged(
      'stakeholders',
      S,
      choice(
        'm-pm-stk-s1',
        'Two Bosses',
        'The sponsor and a key department head disagree about scope, and both are pressing you. What do you do?',
        [
          'Bring them together with the options and their impacts, let the sponsor decide through the project’s governance, and record the decision',
          'Do what the more senior one wants',
          'Build both versions',
          'Wait until one of them gives up',
        ],
        0
      )
    ),
    ...tagged(
      'control',
      B,
      choice(
        'm-pm-ctl-b1',
        'The Triple Constraint',
        'Which three things trade off against each other in every project?',
        ['Scope, time and cost', 'People, process and tools', 'Risks, issues and actions', 'Plan, do and review'],
        0
      )
    ),
    ...tagged(
      'control',
      P,
      short(
        'm-pm-ctl-p1',
        'Cost Performance',
        'At month 3, planned value is £50k, earned value is £40k and actual cost is £50k.\n\nWhat is the cost performance index (CPI)?',
        ['0.8', '.8', '0.80']
      )
    ),
    ...tagged(
      'control',
      S,
      choice(
        'm-pm-ctl-s1',
        'Rebaseline?',
        'A project is 30% over budget, and the team asks to rebaseline so it shows green again. What do you do?',
        [
          'Rebaseline only through formal change control, with the sponsor agreeing the new plan, keeping the original baseline to report against',
          'Rebaseline quietly; it’s just a number',
          'Refuse, and keep reporting red until the end',
          'Remove the budget from the status report',
        ],
        0
      )
    ),
    ...tagged(
      'case',
      B,
      short(
        'm-pm-case-b1',
        'Shortest Finish',
        'Task A takes 3 days. B (5 days) and C (2 days) can both start once A is done, and run at the same time.\n\nWhat is the shortest finish, in days?',
        ['8', '8 days']
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-pm-case-p',
        'Release Plan',
        `A team of 6 developers works in 2-week sprints.

Velocity over the last four sprints: 30, 26, 34, 30 points.
The release backlog is 240 points.
The release date is in 14 weeks (7 sprints).
Two of the six developers are on leave for the whole of sprint 3.`,
        'Sprint report'
      ),
      short('m-pm-case-p1', 'Sprints Needed', 'At average velocity, how many sprints does the backlog take?', ['8', '8 sprints'], { taskId: 'm-pm-case-p' }),
      short(
        'm-pm-case-p2',
        'What Won’t Fit',
        'Allowing for the leave, how many points won’t fit before the release date?',
        ['40', '40 points'],
        { taskId: 'm-pm-case-p' }
      ),
      written(
        'm-pm-case-p3',
        'Options for the Sponsor',
        'What options do you give the sponsor, and which do you recommend?',
        [
          'About 200 points fit in 7 sprints (sprint 3 at about 20), so roughly 40 points won’t make it',
          'Cut scope: drop the lowest-priority 40 points (e.g. MoSCoW could-haves) and keep the date',
          'Move the date by about one and a half sprints to fit everything',
          'Adding people late rarely helps quickly (onboarding slows the team), so it isn’t a quick fix',
          'Makes a clear recommendation and lets the sponsor decide',
        ],
        `At an average velocity of 30, with sprint 3 down to about 20 for the leave, we'll finish about 200 of 240 points by the date: 40 short. Options: keep the date and drop the lowest-priority 40 points; keep everything and move the date by about three weeks; or add people, which I wouldn't count on since new joiners slow the team at first. I recommend keeping the date and agreeing with the product owner which 40 points to leave for the next release, so the most valuable work ships on time. It's your call; I need a decision by the end of this sprint.`,
        { taskId: 'm-pm-case-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-pm-case-s',
        'Data Centre Migration',
        `Budget £600k over 12 months. You've just taken over the project at month 6.

Planned value  £300k
Earned value   £240k
Actual cost    £320k

The vendor says the remaining work will go “exactly to plan”. The steering committee meets on Friday.`,
        'Project dashboard'
      ),
      short('m-pm-case-s1', 'CPI', 'What is the cost performance index?', ['0.75', '.75'], { taskId: 'm-pm-case-s' }),
      short(
        'm-pm-case-s2',
        'Forecast Cost',
        'If cost performance stays as it is, what is the estimate at completion, in £?',
        ['800000', '800k', '0.8m', '800 000'],
        { taskId: 'm-pm-case-s' }
      ),
      written(
        'm-pm-case-s3',
        'Steering Committee',
        'What do you tell the steering committee on Friday?',
        [
          'Plainly: the project is over budget (CPI 0.75) and behind schedule (SPI 0.8)',
          'Forecast: about £800k if performance continues; even the vendor’s best case is £680k (spent £320k + £360k of work left at plan)',
          'Challenges the vendor’s “to plan” claim, since nothing so far supports it',
          'Options with trade-offs, e.g. more budget, cut or phase scope, renegotiate with the vendor, extend the date',
          'Asks for a clear decision and says what they’ll do next, e.g. a recovery plan within two weeks',
        ],
        `The project is in trouble and I'd rather say so now. We've done £240k of work for £320k (CPI 0.75) and we're 20% behind plan. If that continues, the project will cost about £800k, £200k over budget. The vendor says the rest will go to plan, but even then we'd spend £680k, and nothing so far suggests their estimates are reliable. Options: approve more budget; cut or phase scope to fit £600k; or renegotiate the vendor contract on a fixed price for the remaining work. I recommend phasing: move the non-critical systems to next year and press the vendor for a fixed price. I need a decision on Friday, and I'll bring a full recovery plan in two weeks.`,
        { taskId: 'm-pm-case-s' }
      )
    ),
  ],
};

// ---------- Consulting ----------
export const CONSULTING_MODULE: ModuleSkeleton = {
  familyId: 'test-cs-01',
  aspects: [
    { id: 'structure', name: 'Structuring Problems', summary: 'Breaking a problem into clean, non-overlapping parts.' },
    { id: 'maths', name: 'Case Maths', summary: 'Percentages, margins and break-evens worked quickly and accurately.' },
    { id: 'sizing', name: 'Market Sizing', summary: 'Estimating from assumptions, and sanity-checking the answer.' },
    { id: 'comms', name: 'Hypotheses & Communication', summary: 'Working from a hypothesis, and leading with the answer.' },
    { id: 'case', name: 'Client Cases', summary: 'A real client problem: find what changed and advise.' },
  ],
  tags: {
    'q-cs-1': ['structure', B],
    'q-cs-2': ['structure', J],
    'q-cs-3': ['maths', J],
    'q-cs-4': ['sizing', J],
    'q-cs-6': ['comms', B],
    'q-cs-5': ['comms', J],
    'q-cs-case': ['case', J],
    'q-cs-7': ['case', J],
    'q-cs-8': ['case', J],
    'q-cs-9': ['case', J],
    'q-cs-10': ['case', J],
  },
  bank: [
    ...tagged(
      'structure',
      P,
      choice(
        'm-cs-str-p1',
        'Entering a New Country',
        'A retailer asks whether to expand into a new country. Which top-level structure is best?',
        [
          'Is the market attractive, can we win there, would it make money, and how would we enter',
          'Marketing, operations, finance and HR',
          'Competitors, customers and the weather',
          'This year, next year and the year after',
        ],
        0
      )
    ),
    ...tagged(
      'structure',
      S,
      choice(
        'm-cs-str-s1',
        'Fixing the Tree',
        'Your team splits “Why are A&E waits longer?” into Staff, Beds, Processes and Demand. A partner says it isn’t MECE. What is the better split?',
        [
          'More patients arriving, or less capacity to treat them (fewer staff hours or beds, or each patient taking longer)',
          'Doctors, nurses and porters',
          'Morning, afternoon and night',
          'Staff, Beds, Processes, Demand and Other',
        ],
        0
      )
    ),
    ...tagged('maths', B, short('m-cs-math-b1', 'Growth', 'Revenue grew from £80m to £100m.\n\nWhat is the growth, as a %?', ['25%', '25', '0.25', '25 percent'])),
    ...tagged(
      'maths',
      P,
      short(
        'm-cs-math-p1',
        'After a Price Cut',
        'A product sells 30,000 units at $50; each costs $30 to make. The price is cut to $45.\n\nHow many units must it sell to earn the same total contribution?',
        ['40000', '40,000', '40k']
      )
    ),
    ...tagged(
      'maths',
      S,
      short(
        'm-cs-math-s1',
        'Volume to Hold Profit',
        'A business has a 40% gross margin and cuts prices by 10%, with unit costs unchanged.\n\nBy what % must volume rise to keep gross profit the same? (Round to the nearest whole %.)',
        ['33%', '33', '33.3', '33.3%', '33.33%']
      )
    ),
    ...tagged(
      'sizing',
      B,
      choice(
        'm-cs-size-b1',
        'How to Estimate',
        'You’re asked to size a market with no data. What is the right approach?',
        [
          'Start from a known number, narrow it step by step with stated assumptions, then sanity-check the result',
          'Give a round number that feels right',
          'Refuse until data is available',
          'Use the biggest number you can justify',
        ],
        0
      )
    ),
    ...tagged(
      'sizing',
      P,
      short(
        'm-cs-size-p1',
        'Coffees a Day',
        'A city has 500 cafés, each open 12 hours. In the 3 busiest hours each serves 40 customers an hour; in the other hours, 10 an hour.\n\nHow many customers do the cafés serve a day?',
        ['105000', '105,000', '105k']
      )
    ),
    ...tagged(
      'sizing',
      S,
      choice(
        'm-cs-size-s1',
        'Does It Pass the Smell Test?',
        'Your estimate puts UK spending on dog food at £40bn a year. There are about 13 million dogs. What do you do?',
        [
          'Check it bottom-up: £40bn is about £3,000 per dog a year (around £60 a week), which is implausible, so revisit the assumptions',
          'Present it; the method was sound',
          'Round it to £50bn to be safe',
          'Halve it as a buffer',
        ],
        0
      )
    ),
    ...tagged(
      'comms',
      P,
      choice(
        'm-cs-com-p1',
        'Writing to the CEO',
        'How should an email with your findings to a client’s CEO begin?',
        [
          'With the answer and recommendation, then the two or three reasons behind it',
          'With the method you used',
          'With all the data, so they can make up their own mind',
          'With the background to the project',
        ],
        0
      )
    ),
    ...tagged(
      'comms',
      S,
      choice(
        'm-cs-com-s1',
        'The Hypothesis Is Wrong',
        'The night before a client meeting, new data disproves the hypothesis your team has been presenting for two weeks. What do you do?',
        [
          'Say so in the meeting, show the evidence, and set out what you’re now testing and when you’ll have an answer',
          'Leave the new data out and present as planned',
          'Postpone the meeting indefinitely',
          'Present the data but keep the old conclusion',
        ],
        0
      )
    ),
    ...tagged('case', B, short('m-cs-case-b1', 'Profit Margin', 'Revenue £10m. Total costs £8m.\n\nWhat is the profit margin, as a %?', ['20%', '20', '0.2', '20 percent'])),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-cs-case-p',
        'Paxton Gyms: A New Site',
        `Paxton is deciding whether to open a new gym.

Fit-out cost        £1.2m, upfront
Expected members    2,000
Membership          £30 a month
Running costs       £45,000 a month
Lease               10 years

The expected membership comes from Paxton's own sites in larger towns.`,
        'Client data'
      ),
      short('m-cs-case-p1', 'Annual Profit', 'What is the site’s expected annual profit, in £?', ['180000', '180k', '180,000', '0.18m'], { taskId: 'm-cs-case-p' }),
      short('m-cs-case-p2', 'Payback', 'How many years does it take to pay back the fit-out? (One decimal place.)', ['6.7', '6.67', '6.7 years'], { taskId: 'm-cs-case-p' }),
      short('m-cs-case-p3', 'Break-even Members', 'How many members does the site need to cover its running costs?', ['1500', '1,500', '1500 members'], { taskId: 'm-cs-case-p' }),
      written(
        'm-cs-case-p4',
        'Open It?',
        'What do you advise Paxton?',
        [
          'Expected profit £180k a year pays back the £1.2m in about 6.7 years, inside the 10-year lease, so it works on paper',
          'The case is very sensitive to membership: break-even is 1,500, and at 1,700 members profit drops to £72k and payback to about 17 years',
          'The 2,000 estimate comes from larger towns, so it may be optimistic',
          'Wants evidence before deciding, e.g. local demand, competitors, pre-sales',
          'Clear recommendation, e.g. only proceed if pre-sales or research support close to 2,000 members',
        ],
        `It works on paper but it's fragile. At 2,000 members the gym earns £180k a year and pays back in about 6.7 years, within the 10-year lease. But running costs need 1,500 members just to break even, so each 100 members is £36k a year: at 1,700 profit falls to £72k and payback stretches to 17 years, beyond the lease. And the 2,000 comes from larger towns. I'd advise running a pre-sale before signing the lease: if several hundred people sign up in advance and competitors are thin, go ahead; if not, look for a cheaper site.`,
        { taskId: 'm-cs-case-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-cs-case-s',
        'Crumb & Co: Buying a Rival',
        `Crumb & Co (60 bakeries) can buy rival Daily Loaf (40 bakeries) for £30m.

Daily Loaf's profit       £2.5m a year
Expected synergies        £1.5m a year (shared baking and buying)
One-off integration cost  £3m

Crumb's board wants any acquisition to pay back within 8 years.`,
        'Deal summary'
      ),
      short('m-cs-case-s1', 'Price Multiple', 'What multiple of Daily Loaf’s annual profit is the price?', ['12', '12x', '12 times'], { taskId: 'm-cs-case-s' }),
      short(
        'm-cs-case-s2',
        'Payback',
        'Including integration costs and full synergies, how many years does it take to pay back? (Two decimal places.)',
        ['8.25', '8.25 years'],
        { taskId: 'm-cs-case-s' }
      ),
      written(
        'm-cs-case-s3',
        'Advise the Board',
        'Advise Crumb’s board.',
        [
          'Even with every synergy, payback is 8.25 years (£33m over £4m a year), just outside the 8-year rule',
          'Without synergies it’s 13.2 years; synergies usually arrive late and below plan, so the real figure is likely worse',
          'Works out a walk-away price: about £29m for an 8-year payback with full synergies, less if synergies are discounted',
          'Wants due diligence, e.g. why the seller is selling, store overlap, the synergy plan',
          'Clear recommendation, e.g. don’t pay £30m; negotiate down or walk away',
        ],
        `Don't buy at £30m. Even if every synergy lands, the deal pays back in 8.25 years (£30m plus £3m integration, over £4m a year), outside your 8-year rule. Synergies usually come late and smaller than planned; with none it's 13.2 years. For an 8-year payback with full synergies, the most you should pay is about £29m, and I'd offer nearer £25m to allow for synergies falling short. Before going further I'd want to know why the owners are selling, how many of the 40 bakeries overlap with yours, and who will deliver the £1.5m.`,
        { taskId: 'm-cs-case-s' }
      )
    ),
  ],
};

export const INDUSTRY_MODULES = [FINANCE_MODULE, MARKETING_MODULE, SALES_MODULE, HEALTHCARE_MODULE, PM_MODULE, CONSULTING_MODULE];
