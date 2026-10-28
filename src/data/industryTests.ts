import { AssessmentTest, Question } from '../types';

// Vetter tests for work outside software and data: short multiple-choice tests, one per field

// Options are written right answer wherever it reads best; they're rotated by the question's id so the right one
// doesn't always sit in the same place
const choice = (id: string, title: string, prompt: string, options: string[], correctOption: number, minutes = 3): Question => {
  const shift = [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % options.length;
  const rotated = options.map((_, i) => options[(i + shift) % options.length]);
  return {
    id,
    title,
    type: 'choice',
    prompt,
    starterCode: '',
    options: rotated,
    correctOption: (correctOption - shift + options.length) % options.length,
    testCases: [],
    timeLimitMinutes: minutes,
    weight: 20,
  };
};

export const INDUSTRY_TESTS: AssessmentTest[] = [
  {
    id: 'test-fin-01',
    title: 'Financial Statements & Analysis',
    category: 'Finance',
    difficulty: 'Junior',
    type: 'standard',
    description: 'Read the three financial statements, work out margins and ratios, and spot what a set of numbers says about a business.',
    estimatedMinutes: 18,
    passingScore: 70,
    totalQuestions: 5,
    skillsTested: ['Financial Analysis', 'Accounting', 'Ratios'],
    roles: ['Financial Analyst', 'Accountant'],
    questions: [
      choice(
        'q-fin-1',
        'Gross Margin',
        `A company sold goods for £400,000. They cost £260,000 to make, and it spent £90,000 on salaries and rent.

What is its gross margin?`,
        ['12.5%', '35%', '65%', '22.5%'],
        1
      ),
      choice(
        'q-fin-2',
        'Which Statement',
        `You want to know whether a business can pay its bills over the next year.

Which statement do you look at first?`,
        ['The income statement', 'The balance sheet, comparing current assets with current liabilities', 'The statement of changes in equity', 'The auditor’s report'],
        1
      ),
      choice(
        'q-fin-3',
        'Profit but No Cash',
        `A fast-growing company reports a healthy profit but keeps running out of cash.

What is the most likely reason?`,
        [
          'Its tax rate is too low',
          'Its customers pay slowly, so cash is tied up in receivables and stock',
          'It depreciates its equipment too quickly',
          'Its gross margin is too high',
        ],
        1,
        4
      ),
      choice(
        'q-fin-4',
        'Accruals',
        `In December a company receives a £12,000 invoice for consultancy delivered in December. It will pay in January.

Under accrual accounting, when is the cost recorded?`,
        ['January, when it is paid', 'December, when the work was done', 'Spread evenly over twelve months', 'Only once the invoice is disputed'],
        1
      ),
      choice(
        'q-fin-5',
        'Current Ratio',
        `Current assets are £150,000 and current liabilities are £100,000.

What is the current ratio?`,
        ['0.67', '1.5', '2.5', '50,000'],
        1
      ),
    ],
  },
  {
    id: 'test-mkt-01',
    title: 'Digital Marketing Fundamentals',
    category: 'Marketing',
    difficulty: 'Junior',
    type: 'standard',
    description: 'Campaign maths and judgement: click-through rates, cost per acquisition, return on ad spend, audiences and testing.',
    estimatedMinutes: 16,
    passingScore: 70,
    totalQuestions: 5,
    skillsTested: ['Digital Marketing', 'Campaign Metrics', 'Experimentation'],
    roles: ['Digital Marketer'],
    questions: [
      choice(
        'q-mkt-1',
        'Click-Through Rate',
        `An ad was shown 50,000 times and clicked 750 times.

What is its click-through rate?`,
        ['0.15%', '1.5%', '15%', '7.5%'],
        1
      ),
      choice(
        'q-mkt-2',
        'Cost per Acquisition',
        `A campaign cost £3,000 and brought in 120 new customers.

What was the cost per acquisition?`,
        ['£2.50', '£25', '£250', '£40'],
        1
      ),
      choice(
        'q-mkt-3',
        'Return on Ad Spend',
        `£2,000 of ads produced £9,000 in sales.

What is the return on ad spend (ROAS)?`,
        ['4.5x', '3.5x', '0.22x', '45%'],
        0
      ),
      choice(
        'q-mkt-4',
        'Testing a Subject Line',
        `You want to know which of two email subject lines gets more opens.

What is the right way to find out?`,
        [
          'Send A this week and B next week, then compare',
          'Split the list at random, send A to one half and B to the other at the same time',
          'Ask the team which they prefer',
          'Send both to everyone',
        ],
        1,
        4
      ),
      choice(
        'q-mkt-5',
        'Top of the Funnel',
        `A new brand has almost no awareness yet.

Which goal fits the top of its funnel?`,
        ['Reach and awareness among the target audience', 'Retargeting people who abandoned their basket', 'Loyalty discounts for repeat buyers', 'Upselling existing customers'],
        0
      ),
    ],
  },
  {
    id: 'test-sales-01',
    title: 'B2B Sales & Pipeline Management',
    category: 'Sales',
    difficulty: 'Junior',
    type: 'standard',
    description: 'Qualify leads, handle objections, forecast a pipeline and know what to do next in a deal.',
    estimatedMinutes: 16,
    passingScore: 70,
    totalQuestions: 5,
    skillsTested: ['Sales', 'Pipeline Forecasting', 'Negotiation'],
    roles: ['Sales Representative'],
    questions: [
      choice(
        'q-sales-1',
        'Weighted Pipeline',
        `Your pipeline has three deals: £40,000 at 50% likely, £20,000 at 25% and £10,000 at 90%.

What is the weighted forecast?`,
        ['£70,000', '£34,000', '£29,000', '£23,333'],
        1,
        4
      ),
      choice(
        'q-sales-2',
        'Price Objection',
        `A prospect says “It’s too expensive.”

What is the best first response?`,
        [
          'Offer a 20% discount straight away',
          'Ask what they are comparing it with and what the problem is costing them today',
          'Tell them the price is fixed',
          'Move on to another prospect',
        ],
        1
      ),
      choice(
        'q-sales-3',
        'Qualifying a Lead',
        `Which of these tells you most about whether a lead is worth pursuing?`,
        [
          'They opened your last three emails',
          'They have a budget, the authority to buy, a clear need and a timeline',
          'They follow your company on social media',
          'They downloaded a whitepaper',
        ],
        1
      ),
      choice(
        'q-sales-4',
        'Win Rate',
        `Last quarter you worked 40 qualified opportunities and won 10.

To close £300,000 at an average deal size of £15,000 this quarter, how many qualified opportunities do you need?`,
        ['20', '40', '80', '120'],
        2,
        4
      ),
      choice(
        'q-sales-5',
        'After the Demo',
        `A demo went well and the buyer says “Send me some information.”

What should you do?`,
        [
          'Email a brochure and wait to hear back',
          'Agree a specific next step with a date, and who else needs to be involved',
          'Call them every day until they reply',
          'Mark the deal as won',
        ],
        1
      ),
    ],
  },
  {
    id: 'test-health-01',
    title: 'Clinical Safety & Patient Care',
    category: 'Healthcare',
    difficulty: 'Junior',
    type: 'standard',
    description: 'Everyday judgement in a clinical setting: infection control, consent, confidentiality, observations and escalating care.',
    estimatedMinutes: 16,
    passingScore: 75,
    totalQuestions: 5,
    skillsTested: ['Patient Safety', 'Infection Control', 'Clinical Judgement'],
    roles: ['Healthcare Professional'],
    questions: [
      choice(
        'q-health-1',
        'Hand Hygiene',
        `When should you clean your hands on a ward?`,
        [
          'Only after touching a patient',
          'Before and after touching a patient, before clean procedures, and after contact with body fluids or the patient’s surroundings',
          'At the start and end of each shift',
          'Only when your hands look dirty',
        ],
        1
      ),
      choice(
        'q-health-2',
        'Confidentiality',
        `A caller says they are a patient’s son and asks for their test results.

What do you do?`,
        [
          'Give the results, since he is family',
          'Check the patient has agreed to share information with him before saying anything',
          'Read out only the normal results',
          'Ask him to email instead',
        ],
        1
      ),
      choice(
        'q-health-3',
        'A Deteriorating Patient',
        `A patient’s breathing rate has gone from 16 to 26 a minute and they seem newly confused.

What should you do?`,
        [
          'Recheck at the next routine observation round',
          'Escalate straight away to the nurse in charge or medical team, following the early warning score policy',
          'Give them some water and let them rest',
          'Note it in the record for the next shift',
        ],
        1
      ),
      choice(
        'q-health-4',
        'Consent',
        `A patient who has capacity refuses a blood test.

What happens next?`,
        [
          'Take the blood anyway, since it is in their best interest',
          'Respect their decision, make sure they understand the risks, and record it',
          'Ask a relative to consent for them',
          'Wait until they are asleep',
        ],
        1
      ),
      choice(
        'q-health-5',
        'Sharps',
        `You have just given an injection.

What do you do with the needle?`,
        [
          'Recap it, then put it in the bin',
          'Put it straight into a sharps bin at the point of use, without recapping',
          'Leave it on the tray for later',
          'Bend it so no one can reuse it',
        ],
        1
      ),
    ],
  },
  {
    id: 'test-pm-01',
    title: 'Project Planning & Delivery',
    category: 'Project Management',
    difficulty: 'Junior',
    type: 'standard',
    description: 'Plan and run a project: the critical path, scope changes, risks, stakeholders and keeping delivery on track.',
    estimatedMinutes: 16,
    passingScore: 70,
    totalQuestions: 5,
    skillsTested: ['Project Planning', 'Risk Management', 'Stakeholder Management'],
    roles: ['Project Manager'],
    questions: [
      choice(
        'q-pm-1',
        'Critical Path',
        `Task A takes 3 days. B (5 days) and C (2 days) both start after A. D (4 days) starts once both B and C are done.

How long is the shortest possible schedule?`,
        ['9 days', '12 days', '14 days', '10 days'],
        1,
        4
      ),
      choice(
        'q-pm-2',
        'A Scope Change',
        `Halfway through, a senior stakeholder asks for a new feature “by the same date”.

What do you do first?`,
        [
          'Say yes and ask the team to work weekends',
          'Assess the impact on time, cost and quality, then agree the trade-off through change control',
          'Refuse, since the scope is signed off',
          'Add it quietly to the backlog',
        ],
        1
      ),
      choice(
        'q-pm-3',
        'Risks and Issues',
        `What is the difference between a risk and an issue?`,
        [
          'There is none',
          'A risk might happen; an issue is already happening',
          'Risks are about money; issues are about people',
          'Issues are always more serious than risks',
        ],
        1
      ),
      choice(
        'q-pm-4',
        'Behind Schedule',
        `The project is two weeks behind, and the finish date can’t move.

Which option most directly protects the date?`,
        [
          'Cut or defer lower-priority scope, agreed with the sponsor',
          'Stop holding status meetings',
          'Report the project as green until it catches up',
          'Start the testing phase later',
        ],
        0
      ),
      choice(
        'q-pm-5',
        'RACI',
        `In a RACI chart, how many people should be Accountable for each task?`,
        ['Exactly one', 'At least two, for cover', 'Everyone on the team', 'None; accountability is shared'],
        0
      ),
    ],
  },
];
