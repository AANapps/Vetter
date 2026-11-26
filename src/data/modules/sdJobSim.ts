import { DesktopConfig } from '../../lib/desktop';
import { jobSimulation } from './jobSimKit';

/**
 * The Software Developer job simulation: a Tuesday on Fernway's shop team, in the five timed parts every Corprax job
 * simulation has (jobSimKit.ts), on the desktop with two environments: the Code app (the basket code and its tests;
 * Corprax's own tests check the fixes when marked) and the Browser (the issue tracker and the pricing rules).
 *
 * Core task: fix the £50 delivery threshold, then the £NaN total from a retired product, and add a boundary test.
 * Curveball: Finance escalates stacking discount codes and the deploy freeze moves an hour earlier. Juggling and
 * judgement: QA asks what to test, and Sales wants a 50%-off code slipped in with no ticket. Report back: what changed
 * for the product manager, marked on how it's written and on whether it flags the customers already overcharged.
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

const BEN = `ben.cole@${DOMAIN}`;

const DESKTOP: Omit<DesktopConfig, 'phases'> = {
  user: { name: 'Jordan Blake', email: ME, role: 'Software Developer' },
  company: 'Fernway',
  time: 'Tue 09:30',
  apps: ['mail', 'code', 'browser', 'files', 'ai'],
  contacts: [
    { name: 'Maya Ito', role: 'Product Manager', email: MAYA },
    { name: 'Sam Reid', role: 'QA Engineer', email: SAM },
    { name: 'Ben Cole', role: 'Sales Lead', email: BEN },
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
    { id: 'm-platform', from: `Platform team <platform@${DOMAIN}>`, to: [`engineering@${DOMAIN}`], date: 'Tue 08:10', subject: 'Deploy freeze at 16:00 today', body: 'Reminder: no deploys after 16:00 today while we move the database. Anything that needs to go out today must be merged and green by 15:30.\n\nPlatform team' },
    {
      id: 'm-maya',
      from: `Maya Ito <${MAYA}>`,
      to: [ME],
      cc: [SAM],
      date: 'Tue 09:20',
      subject: 'Two basket bugs for today',
      body: `Morning Jordan,\n\nSupport has two basket bugs: FERN-231 and FERN-235. The details are in the tracker (${TRACKER}), with the pricing rules linked from there. Sam has a repro for 235 on the ticket.\n\nCould you fix both in basket.js, and add a test for the £50 delivery threshold so it can't break again?\n\nThanks!\nMaya`,
    },
    {
      id: 'm-maya-238',
      phase: 'curveball',
      from: `Maya Ito <${MAYA}>`,
      to: [ME],
      cc: [`platform@${DOMAIN}`],
      date: 'Tue 10:05',
      subject: 'FERN-238 now, and the freeze has moved',
      body: `Jordan, change of plan. Finance has escalated FERN-238: customers are stacking discount codes and it's costing us money every hour. Please fix it alongside the other two.\n\nAlso, Platform has moved the freeze to 15:00, so everything must be merged and green by 14:30.\n\nMaya`,
    },
    {
      id: 'm-sam',
      phase: 'juggling',
      from: `Sam Reid <${SAM}>`,
      to: [ME],
      date: 'Tue 10:12',
      subject: 'What should I test?',
      body: "Hi Jordan, I've got 20 minutes before the freeze to check your changes on staging. What exactly should I test, and what are the edge cases? A short list is perfect.\n\nSam",
    },
    {
      id: 'm-ben',
      phase: 'juggling',
      from: `Ben Cole <${BEN}>`,
      to: [ME],
      date: 'Tue 10:14',
      subject: 'Tiny favour: VIP50',
      body: "Hey Jordan, our biggest wholesale customer is ordering at 2pm and I promised them 50% off. Could you add a VIP50 code to the basket? It's literally one line in DISCOUNTS. No need for a ticket, I'll square it with Maya later.\n\nCheers, Ben",
    },
  ],
  replies: [
    {
      id: 'maya-followup',
      to: MAYA,
      mustMention: [['231'], ['235'], ['238']],
      reply: { from: `Maya Ito <${MAYA}>`, subject: 'Re: basket fixes', body: "Brilliant, thanks Jordan, that's really clear. I'll brief support now.\n\nMaya" },
      otherwise: { from: `Maya Ito <${MAYA}>`, subject: 'Re: your email', body: 'Thanks Jordan! Which tickets does this cover? I need to tell support about all three (231, 235 and 238).' },
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

export const SD_JOB_SIM = jobSimulation({
  testId: 'test-sim-dev-01',
  questionId: 'sd-sim-desk',
  role: 'Software Developer',
  company: 'Fernway',
  day: 'Tuesday on the Shop Team',
  description:
    'A working day on an online shop’s team, in five timed parts on a full desktop: fix real bugs in the basket code from the issue tracker (checked by hidden tests) and add a test; adapt when Finance escalates a third bug and the deploy freeze moves; tell QA what to test and handle a request to slip in an unapproved discount code; then explain the changes to the product manager. 40 minutes.',
  skillsTested: ['JavaScript', 'Debugging', 'Testing', 'Written Communication', 'Product Sense'],
  roles: ['Software Developer'],
  category: 'Software Development',
  scenario: `You're Jordan Blake, a developer on Fernway's shop team. Fernway sells houseplants online. It's Tuesday morning.

Your work computer has Mail, the Code app (the basket code and its tests), the Browser (the issue tracker), Files and an AI assistant.`,
  briefing: `You're Jordan Blake, a developer on the shop team at Fernway, an online houseplant shop. It's 9:30 on Tuesday, and there's a deploy freeze this afternoon.

Your manager: Maya Ito, Product Manager.
Your tools: Mail, the Code app (fernway-shop: basket.js and tests.js, with Run tests), the Browser (the issue tracker and the pricing rules), Files and an AI assistant.`,
  briefs: {
    core: 'Read Maya’s email and the tickets. Fix FERN-231 (delivery at the £50 threshold), then FERN-235 (the £NaN total), and add a test to tests.js for the £50 threshold. Run the tests.',
    curveball: 'Finance has escalated a third bug, and the freeze has moved. Read Maya’s email and fix FERN-238 without breaking the rest.',
    juggling: 'Reply to Sam with what to test. Reply to Ben with your decision on his request, and why.',
    report: 'Email Maya what changed, in plain English for support, whether it’s safe to ship before the freeze, and anything else she should know.',
  },
  desktop: DESKTOP,
  checks: [
    ['core', 'Read the ticket', `visited:${TRACKER}/FERN-231`, 'true'],
    ['core', 'Free delivery from exactly £50', 'test:delivery-50', 'true'],
    ['core', 'A retired product no longer breaks the total', 'test:deleted-line', 'true'],
    ['core', 'A test for the £50 boundary', 'filehas:tests.js:deliveryCharge\\(\\s*50(\\.0+)?\\s*\\)', 'true'],
    ['curveball', 'Only the best code applies', 'test:discount-best', 'true'],
    ['curveball', 'Nothing else broke', 'test:no-regression', 'true'],
    ['juggling', 'The test list for Sam', `mail:${SAM}`, {
      rubric: [
        'Covers each fix with the case to try: a basket of exactly £50 (and £49.99), a basket with a retired product, two codes together (the bigger one applies)',
        'Names edge cases: no codes, an unknown code, a basket of only retired products, rounding to the penny',
        'Short and checkable in 20 minutes',
      ],
    }],
    ['juggling', 'The decision for Ben', `mail:${BEN}`, {
      rubric: [
        'Doesn’t add the code on a message alone: a 50% discount is a pricing decision that needs the product manager’s (or Finance’s) approval and a ticket',
        'Gives the reason: it goes against the pricing rules, it’s unreviewed and untested, it lands just before a freeze, and anyone could use the code',
        'Offers a way forward: ask Maya to approve it as a ticket, or a safer option for one customer (e.g. a manual discount or an invoice adjustment by Sales/Finance)',
        'Polite and quick, so Ben can still serve his customer',
      ],
    }],
    ['report', 'Maya got all three fixes', 'received:maya-followup', 'true'],
    ['report', 'The email to Maya', 'earned:maya-followup', {
      rubric: [
        'Covers all three in plain English support can repeat: delivery now free at exactly £50 (FERN-231), retired products are left out instead of £NaN (FERN-235), only the best single code applies (FERN-238)',
        'Says whether it’s safe to ship before the 15:00 freeze, based on the tests passing, the small change and Sam’s check (merged by 14:30)',
        'Flags the customers already affected: those charged £4.99 delivery on exactly £50 since 3 March should be refunded, and past stacked-code orders honoured',
        'Mentions Ben’s VIP50 request and that it needs her decision',
      ],
    }],
  ],
});
