import { AssessmentTest, Question } from '../../types';
import { DesktopConfig } from '../../lib/desktop';
import { choice, multi, order, short, written } from '../questionKit';
import { questionSet } from './daSets';
import { tc } from '../simulationKit';

/**
 * The Software Developer job simulation: a day on Fernway's shop team, worked on the desktop. The product manager's
 * email names three bugs; the details are in the issue tracker in the Browser, with the pricing policy beside them; the
 * code is in the Code app with its tests. The candidate fixes the bugs (Praxa's own tests check them when marked), adds
 * a test, explains the changes to the product manager in plain English, and answers her question about shipping before
 * the deploy freeze. Two question sets come first. About 40 minutes.
 */

const DOMAIN = 'fernway.dev';
const MAYA = `maya.ito@${DOMAIN}`;
const SAM = `sam.reid@${DOMAIN}`;
const ME = `jordan.blake@${DOMAIN}`;
const TRACKER = 'track.fernway.dev';

const BASKET_JS = `// Fernway shop: the basket's prices
const DISCOUNTS = { SPRING10: 10, WELCOME15: 15, STAFF25: 25 };

// The value of the basket's lines before discounts
function subtotal(lines) {
  return lines.reduce((sum, line) => sum + line.product.price * line.qty, 0);
}

// Delivery: free from £50, otherwise £4.99 (on the subtotal before discounts)
function deliveryCharge(subtotal) {
  return subtotal > 50 ? 0 : 4.99;
}

// Discount codes on the order
function applyDiscounts(total, codes) {
  let result = total;
  for (const code of codes) {
    const pct = DISCOUNTS[code];
    if (pct) result -= (total * pct) / 100;
  }
  return result;
}

// What the customer pays, to the penny
function basketTotal(basket) {
  const sub = subtotal(basket.lines);
  const discounted = applyDiscounts(sub, basket.codes);
  return Math.round((discounted + deliveryCharge(sub)) * 100) / 100;
}
`;

const TESTS_JS = `// Run these with Run tests. Add your own with test(name, () => { expect(value).toBe(expected); })

test('subtotal adds price × qty', () => {
  expect(subtotal([{ product: { price: 12 }, qty: 2 }, { product: { price: 5 }, qty: 1 }])).toBe(29);
});

test('delivery is £4.99 under £50', () => {
  expect(deliveryCharge(30)).toBe(4.99);
});

test('a known code takes its percentage off', () => {
  expect(applyDiscounts(100, ['SPRING10'])).toBe(90);
});
`;

const DESKTOP: DesktopConfig = {
  user: { name: 'Jordan Blake', email: ME, role: 'Software Developer' },
  company: 'Fernway',
  time: 'Tue 09:30',
  apps: ['mail', 'browser', 'code', 'files', 'ai'],
  contacts: [
    { name: 'Maya Ito', role: 'Product Manager', email: MAYA },
    { name: 'Sam Reid', role: 'QA Engineer', email: SAM },
    { name: 'Platform team', role: 'Deploys', email: `platform@${DOMAIN}` },
  ],
  homepage: TRACKER,
  project: {
    name: 'fernway-shop',
    files: [
      { name: 'basket.js', content: BASKET_JS },
      { name: 'tests.js', content: TESTS_JS },
    ],
    testFile: 'tests.js',
    checks: [
      { id: 'delivery-50', code: 'expect(deliveryCharge(50)).toBe(0);\nexpect(deliveryCharge(49.99)).toBe(4.99);\nexpect(deliveryCharge(80)).toBe(0);' },
      { id: 'deleted-line', code: "expect(basketTotal({ lines: [{ product: { price: 10 }, qty: 2 }, { product: null, qty: 1 }], codes: [] })).toBeCloseTo(24.99);\nexpect(subtotal([{ product: undefined, qty: 3 }])).toBe(0);" },
      { id: 'discount-best', code: "expect(applyDiscounts(100, ['SPRING10', 'WELCOME15'])).toBeCloseTo(85);\nexpect(applyDiscounts(200, ['STAFF25', 'SPRING10', 'WELCOME15'])).toBeCloseTo(150);" },
      { id: 'no-regression', code: "expect(subtotal([{ product: { price: 12 }, qty: 2 }])).toBe(24);\nexpect(applyDiscounts(100, ['NOPE'])).toBe(100);\nexpect(applyDiscounts(100, [])).toBe(100);\nexpect(basketTotal({ lines: [{ product: { price: 25 }, qty: 2 }], codes: ['SPRING10'] })).toBeCloseTo(45);" },
    ],
  },
  inbox: [
    { id: 'm-news', from: `Fernway Weekly <news@${DOMAIN}>`, to: [`team@${DOMAIN}`], date: 'Mon 17:00', subject: 'This week at Fernway', body: 'Spring range photos are in, the Leeds office coffee machine is fixed (finally), and Friday’s demo is at 3pm. Have a good week!' },
    { id: 'm-platform', from: `Platform team <platform@${DOMAIN}>`, to: [`engineering@${DOMAIN}`], date: 'Tue 08:10', subject: 'Deploy freeze at 16:00 today', body: 'Reminder: no deploys after 16:00 today while we move the database. Anything that needs to go out today must be merged and green by 15:30.\n\nPlatform team' },
    {
      id: 'm-sam',
      from: `Sam Reid <${SAM}>`,
      to: [ME],
      date: 'Tue 09:05',
      subject: 'FERN-235 repro',
      body: 'Hi Jordan, got a repro for FERN-235: a customer had the Calathea Medallion in their basket, and we retired that product on Friday. The basket line is still there but its product comes back as null, and checkout shows £NaN. Details are on the ticket.\n\nSam',
    },
    {
      id: 'm-maya',
      from: `Maya Ito <${MAYA}>`,
      to: [ME],
      cc: [SAM],
      date: 'Tue 09:20',
      subject: 'Three basket bugs for today',
      body: `Morning Jordan,\n\nSupport has three basket bugs this week: FERN-231, FERN-235 and FERN-238. The details are in the tracker (${TRACKER}), and the pricing rules are linked from there.\n\nCould you:\n1. Fix all three in the basket code\n2. Add a test for the delivery threshold so it can't break again\n3. Email me what changed in plain English, so I can brief support\n\nPlatform freeze deploys at 4pm, so it would be great to have it ready before then.\n\nThanks!\nMaya`,
    },
  ],
  replies: [
    {
      id: 'maya-followup',
      to: MAYA,
      mustMention: [['231'], ['235'], ['238']],
      reply: {
        from: `Maya Ito <${MAYA}>`,
        subject: 'Re: basket fixes',
        body: "Brilliant, thanks Jordan, that's really clear.\n\nTwo things before I go to support: is it safe to ship before the 4pm freeze, and what should support tell customers who were affected? I'm thinking of people charged delivery on exactly £50, and the ones who stacked codes.\n\nMaya",
      },
      otherwise: {
        from: `Maya Ito <${MAYA}>`,
        subject: 'Re: your email',
        body: 'Thanks Jordan! Which tickets does this cover? I need to tell support about all three (231, 235 and 238).',
      },
    },
  ],
  pages: [
    {
      url: TRACKER,
      site: 'Fernway · Issue tracker',
      title: 'Open issues',
      blocks: [
        { kind: 'h1', text: 'Shop: open issues' },
        { kind: 'table', columns: ['Key', 'Title', 'Priority', 'Reporter'], rows: [['FERN-231', 'Delivery charged on a £50.00 basket', 'High', 'Support'], ['FERN-235', 'Basket total shows £NaN', 'Highest', 'Sam Reid'], ['FERN-238', 'Discount codes stack', 'High', 'Finance'], ['FERN-240', 'Wishlist icon misaligned on iPad', 'Low', 'Design']] },
        { kind: 'link', text: 'FERN-231 · Delivery charged on a £50.00 basket', url: `${TRACKER}/FERN-231` },
        { kind: 'link', text: 'FERN-235 · Basket total shows £NaN', url: `${TRACKER}/FERN-235` },
        { kind: 'link', text: 'FERN-238 · Discount codes stack', url: `${TRACKER}/FERN-238` },
        { kind: 'link', text: 'Pricing rules (docs)', url: `${TRACKER}/docs/pricing` },
      ],
    },
    {
      url: `${TRACKER}/FERN-231`,
      site: 'Fernway · Issue tracker',
      title: 'FERN-231',
      blocks: [
        { kind: 'h1', text: 'FERN-231 · Delivery charged on a £50.00 basket' },
        { kind: 'p', text: 'Reported by Support, 12 customers so far since the delivery change on 3 March.\n\nSteps: add items to the basket totalling exactly £50.00, go to checkout.\nExpected: free delivery (the pricing rules say free from £50).\nActual: £4.99 delivery is added.' },
      ],
    },
    {
      url: `${TRACKER}/FERN-235`,
      site: 'Fernway · Issue tracker',
      title: 'FERN-235',
      blocks: [
        { kind: 'h1', text: 'FERN-235 · Basket total shows £NaN' },
        { kind: 'p', text: 'Reported by Sam Reid.\n\nSteps: put a product in the basket, retire the product in the admin (its basket line stays, but the line’s product is now null), open checkout.\nExpected: the retired product is left out of the total (the basket page already shows "no longer available" beside it), and the rest is charged as normal.\nActual: the total is £NaN and checkout can’t continue.' },
      ],
    },
    {
      url: `${TRACKER}/FERN-238`,
      site: 'Fernway · Issue tracker',
      title: 'FERN-238',
      blocks: [
        { kind: 'h1', text: 'FERN-238 · Discount codes stack' },
        { kind: 'p', text: 'Reported by Finance. Customers who enter SPRING10 and WELCOME15 get 25% off.\n\nExpected: only one code applies per order: the best one for the customer (see the pricing rules).\nActual: every code entered is applied.' },
      ],
    },
    {
      url: `${TRACKER}/docs/pricing`,
      site: 'Fernway · Docs',
      title: 'Pricing rules',
      blocks: [
        { kind: 'h1', text: 'Pricing rules' },
        { kind: 'p', text: '• Delivery is free on orders with a subtotal of £50 or more (before discounts); otherwise £4.99.\n• One discount code per order. If a customer enters several, the one with the biggest discount applies.\n• Retired products can’t be bought: leave them out of the total.\n• Totals are rounded to the penny.' },
      ],
    },
  ],
};

const TASK: Question = {
  id: 'sd-sim-desk',
  title: 'Tuesday on the Shop Team',
  type: 'desktop',
  prompt: `It's 9:30 on Tuesday. You're a developer on Fernway's shop team. Your computer has Mail, the Browser (the issue tracker), and the Code app with the basket code and its tests. Start with your inbox.

Q1. Fix FERN-231, so delivery follows the pricing rules at the threshold.
Q2. Fix FERN-235, so a basket with a retired product still has a correct total.
Q3. Fix FERN-238, so codes no longer stack and the right one applies.
Q4. Add a test to tests.js for the £50 delivery threshold, and run the tests.
Q5. Email Maya what changed, in plain English, for support.
Q6. Answer Maya's follow-up question.`,
  starterCode: '',
  desktop: DESKTOP,
  testCases: (
    [
      [1, 'Free delivery from exactly £50', 'test:delivery-50', 'true'],
      [1, 'Read the ticket', `visited:${TRACKER}/FERN-231`, 'true'],
      [2, 'A retired product no longer breaks the total', 'test:deleted-line', 'true'],
      [3, 'Only the best code applies', 'test:discount-best', 'true'],
      [3, 'Nothing else broke', 'test:no-regression', 'true'],
      [4, 'A test for the £50 boundary', 'filehas:tests.js:deliveryCharge\\(\\s*50(\\.0+)?\\s*\\)', 'true'],
      [5, 'Maya got all three fixes', 'received:maya-followup', 'true'],
      [5, 'The email to Maya', 'earned:maya-followup', { rubric: ['Covers all three: delivery now free at exactly £50 (FERN-231), retired products are left out instead of £NaN (FERN-235), and only the best single code applies (FERN-238)', 'Plain English that support can repeat, without code or jargon', 'Mentions the test added for the £50 boundary and that the tests pass'] }],
      [6, 'The answer to Maya’s questions', `mail:${MAYA}`, { rubric: ['Says whether it’s safe to ship before the freeze, based on the tests passing and the changes being small (and gets it merged by 15:30)', 'Suggests what support tells customers charged £4.99 delivery on exactly £50 (refund the £4.99, since 3 March)', 'Handles the code-stackers sensibly (e.g. honour past orders, the fix only affects new ones)'] }],
    ] as [number, string, string, string | { rubric: string[] }][]
  ).map(([n, d, input, e], i) => ({ ...tc(`tc-sd-sim-${i + 1}`, `Q${n} · ${d}`, input, typeof e === 'string' ? e : ''), ...(typeof e !== 'string' && { rubric: e.rubric }) })),
  timeLimitMinutes: 30,
  weight: 70,
};

const SETS: Question[] = [
  ...questionSet(
    'sd-sim-s1',
    'Reading a Bug Report',
    'FERN-229 (closed last week)',
    `FERN-229: "Basket badge shows the wrong number of items"

Steps: add 2 pots and 1 plant. Expected: the badge says 3. Actual: it says 2.

The fix that was merged:
\`\`\`js
- const count = basket.lines.length;
+ const count = basket.lines.reduce((n, l) => n + l.qty, 0);
\`\`\``,
    [
      choice('sd-sim-s1-a', 'What Was Wrong', 'What was the bug?', ['It counted lines, not items: 2 pots on one line counted as 1', 'It counted items twice', 'The badge didn’t refresh', 'Pots weren’t counted'], 0),
      short('sd-sim-s1-b', 'The New Count', 'With the fix, what does the badge say for 2 pots (one line) and 1 plant (another line)?', ['3']),
      multi('sd-sim-s1-c', 'A Good Report', 'What made FERN-229 easy to fix? Tick all that apply.', ['Exact steps to reproduce', 'The expected result', 'The actual result', 'How annoyed the customer was', 'The reporter’s job title'], [0, 1, 2]),
      order('sd-sim-s1-d', 'Fixing a Bug Well', 'Put these in order.', ['Reproduce it', 'Write a test that fails because of it', 'Fix the code', 'See the test pass with the others', 'Explain the change in the pull request']),
    ]
  ),
  ...questionSet(
    'sd-sim-s2',
    'Shipping Safely',
    'Before the freeze',
    `It's 15:10. A fix for a checkout bug is ready: 6 lines changed, its new test and all 140 existing tests pass, and one colleague has approved the pull request. The deploy freeze starts at 16:00 and lasts until Thursday. The bug is overcharging some customers £4.99.`,
    [
      choice('sd-sim-s2-a', 'Ship or Wait', 'What do you do?', ['Merge and deploy now, watch checkout after the deploy, and be ready to roll back', 'Wait until Thursday to be safe', 'Deploy at 15:59 without telling anyone', 'Ask for three more approvals first'], 0),
      short('sd-sim-s2-b', 'Undo', 'If the deploy goes wrong, what’s the usual first step? (One word, or two.)', ['rollback', 'roll back', 'revert', 'roll it back']),
      multi('sd-sim-s2-c', 'After Deploying', 'What should you check after it goes out? Tick all that apply.', ['Checkout errors in the logs or monitoring', 'A real or test order at exactly £50', 'That the old tests still pass', 'The team’s calendar'], [0, 1, 2]),
      written(
        'sd-sim-s2-d',
        'Telling People',
        'Who do you tell once it’s deployed, and what do you say?',
        [
          'Tells the product manager / support that the fix is live, in plain words, with the ticket number',
          'Says what customers will notice and what to do for those already affected (e.g. refunds)',
          'Tells the team / QA so it can be checked, and notes how to roll back if needed',
        ],
        'I’d post in the team channel and email Maya: "FERN-231 is live: baskets of exactly £50 now get free delivery. Customers charged £4.99 since 3 March can be refunded." I’d ask Sam to check it on the live site, and keep an eye on checkout errors for the next hour, ready to roll back.'
      ),
    ]
  ),
];

export const SD_JOB_SIM: AssessmentTest = (() => {
  const raw = [...SETS, TASK];
  const total = raw.reduce((n, q) => n + q.weight, 0) || 1;
  const questions = raw.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) }));
  const drift = 100 - questions.reduce((n, q) => n + q.weight, 0);
  if (drift) questions.reduce((a, b) => (b.weight > a.weight ? b : a)).weight += drift;
  return {
    id: 'test-sim-dev-01',
    title: 'Software Developer Job Simulation: A Day at Fernway',
    description:
      'A working day on an online shop’s team, on a full desktop: read the product manager’s email and the issue tracker, fix three real bugs in the basket code (checked by hidden tests), add a test, explain the changes in plain English, and answer the question about shipping before the deploy freeze. About 40 minutes.',
    skillsTested: ['JavaScript', 'Debugging', 'Testing', 'Written Communication', 'Product Sense'],
    roles: ['Software Developer'],
    type: 'standard',
    category: 'Software Development',
    difficulty: 'Professional',
    passingScore: 70,
    scenario: {
      company: 'Fernway',
      role: 'Software Developer',
      brief: `You're Jordan Blake, a developer on Fernway's shop team. Fernway sells houseplants online. It's Tuesday morning.

The job simulation runs on your work computer: Mail, the Browser (the issue tracker), the Code app with the basket code and its tests, Files and an AI assistant, all on the taskbar. People reply to your emails.`,
    },
    questions,
    totalQuestions: questions.filter((q) => q.type !== 'case').length,
    estimatedMinutes: 40,
  };
})();
