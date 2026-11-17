import { DesktopConfig } from '../../lib/desktop';
import { jobSimulation } from './jobSimKit';

/**
 * The Frontend Engineer job simulation: a Wednesday on Fernway's shop frontend, in the five timed parts every Praxa
 * job simulation has (jobSimKit.ts), on the desktop with two environments: the Code app (the shop's product-list and
 * checkout code; Praxa's own tests check the fixes when marked) and the Browser (the design site).
 *
 * Core task: fix the product list's search, then its price filter and sorting, and add a test. Curveball: couriers are
 * failing on junk postcodes, so the checkout validation planned for next sprint has to go in now, from the spec.
 * Juggling and judgement: the phone rule isn't in the spec (the designer answers when asked), and Marketing wants the
 * newsletter box ticked by default. Report back: what changed for the product manager, marked on how it's written and
 * on whether it flags that the "Under £20" filter's label no longer matches what it does.
 */

const DOMAIN = 'fernway.dev';
const MAYA = `maya.ito@${DOMAIN}`;
const NOOR = `noor.aziz@${DOMAIN}`;
const ME = `alex.kim@${DOMAIN}`;
const DOCS = 'design.fernway.dev';

const FILTERS_JS = `// The product list: search, filters and sorting

// products: [{ name, price, inStock }]
function filterProducts(products, { query = '', inStockOnly = false, maxPrice = Infinity } = {}) {
  return products.filter(
    (p) =>
      p.name.includes(query) &&
      (inStockOnly ? p.inStock : true) &&
      p.price < maxPrice
  );
}

// by: 'price' (cheapest first) or 'name' (A–Z)
function sortProducts(products, by) {
  if (by === 'price') return [...products].sort((a, b) => String(a.price).localeCompare(String(b.price)));
  return [...products].sort((a, b) => a.name.localeCompare(b.name));
}
`;

const VALIDATION_JS = `// Checkout form validation: returns { field: message } for each field with a problem

function checkoutErrors(form) {
  const errors = {};
  if (!form.name || !form.name.trim()) errors.name = 'Enter your name';
  // TODO: the postcode and phone rules from the design spec
  return errors;
}
`;

const TESTS_JS = `// Run these with Run tests. Add your own with test(name, () => { expect(value).toEqual(expected); })

const plants = [
  { name: 'Monstera Deliciosa', price: 32, inStock: true },
  { name: 'Snake Plant', price: 18, inStock: true },
  { name: 'Fiddle Leaf Fig', price: 45, inStock: false },
];

test('in-stock filter hides sold-out plants', () => {
  expect(filterProducts(plants, { inStockOnly: true }).length).toBe(2);
});

test('name sort is A–Z', () => {
  expect(sortProducts(plants, 'name')[0].name).toBe('Fiddle Leaf Fig');
});

test('a name is required', () => {
  expect(checkoutErrors({ name: '', postcode: 'LS1 4DT', phone: '' }).name).toBe('Enter your name');
});
`;

const P = `[{ name: 'Monstera Deliciosa', price: 32, inStock: true }, { name: 'Mini Monstera', price: 22, inStock: true }, { name: 'Pothos', price: 100, inStock: true }, { name: 'Snake Plant', price: 20, inStock: false }, { name: 'Peace Lily', price: 9, inStock: true }]`;

const TOM = `tom.fry@${DOMAIN}`;

const DESKTOP: Omit<DesktopConfig, 'phases'> = {
  user: { name: 'Alex Kim', email: ME, role: 'Frontend Engineer' },
  company: 'Fernway',
  time: 'Wed 09:30',
  apps: ['mail', 'code', 'browser', 'files', 'ai'],
  contacts: [
    { name: 'Maya Ito', role: 'Product Manager', email: MAYA },
    { name: 'Noor Aziz', role: 'Product Designer', email: NOOR },
    { name: 'Tom Fry', role: 'Marketing', email: TOM },
    { name: 'Sam Reid', role: 'QA Engineer', email: `sam.reid@${DOMAIN}` },
  ],
  homepage: `${DOCS}/checkout`,
  project: {
    name: 'fernway-web',
    files: [
      { name: 'filters.js', content: FILTERS_JS },
      { name: 'validation.js', content: VALIDATION_JS },
      { name: 'tests.js', content: TESTS_JS },
    ],
    testFile: 'tests.js',
    checks: [
      { id: 'search-case', code: `const r = filterProducts(${P}, { query: 'monstera' }).map((p) => p.name);\nexpect(r).toEqual(['Monstera Deliciosa', 'Mini Monstera']);` },
      { id: 'max-price', code: `expect(filterProducts(${P}, { maxPrice: 20 }).map((p) => p.name)).toEqual(['Snake Plant', 'Peace Lily']);` },
      { id: 'price-sort', code: `expect(sortProducts(${P}, 'price').map((p) => p.price)).toEqual([9, 20, 22, 32, 100]);\nexpect(sortProducts(${P}, 'name')[0].name).toBe('Mini Monstera');` },
      { id: 'postcode-rule', code: "expect(checkoutErrors({ name: 'Ann', postcode: 'nope', phone: '' }).postcode).toBe('Enter a real postcode, like SW1A 1AA');\nexpect(checkoutErrors({ name: 'Ann', postcode: '', phone: '' }).postcode).toBe('Enter your postcode');\nexpect(checkoutErrors({ name: 'Ann', postcode: ' sw1a 1aa ', phone: '' }).postcode).toBe(undefined);\nexpect(checkoutErrors({ name: 'Ann', postcode: 'LS14DT', phone: '' }).postcode).toBe(undefined);" },
      { id: 'phone-rule', code: "expect(checkoutErrors({ name: 'Ann', postcode: 'LS1 4DT', phone: '12' }).phone).toBe('Enter a phone number with 10 to 15 digits');\nexpect(checkoutErrors({ name: 'Ann', postcode: 'LS1 4DT', phone: '+44 113 496 0000' }).phone).toBe(undefined);\nexpect(checkoutErrors({ name: 'Ann', postcode: 'LS1 4DT', phone: '' }).phone).toBe(undefined);" },
    ],
  },
  inbox: [
    { id: 'm-standup', from: `Calendar <calendar@${DOMAIN}>`, to: [ME], date: 'Wed 08:00', subject: 'Stand-up moved to 10:15', body: 'Today’s stand-up has moved to 10:15.' },
    {
      id: 'm-maya',
      from: `Maya Ito <${MAYA}>`,
      to: [ME],
      date: 'Wed 09:15',
      subject: 'Product list bugs',
      body: `Morning Alex,\n\nTwo bugs from support on the product list (filters.js in the Code app):\n• Searching "monstera" finds nothing, though we sell two\n• "Under £20" leaves out plants that cost exactly £20, and sorting by price puts the £100 Pothos before the £20 ones\n\nPlease add a test for sorting by price too.\n\nThanks!\nMaya`,
    },
    {
      id: 'm-maya-checkout',
      phase: 'curveball',
      from: `Maya Ito <${MAYA}>`,
      to: [ME],
      cc: [NOOR],
      date: 'Wed 10:02',
      subject: 'Checkout postcodes: today, not next sprint',
      body: `Alex, our courier has just bounced 40 parcels: customers are typing junk into the postcode field. The checkout validation we planned for next sprint has to go in today.\n\nNoor's spec is on the design site (${DOCS}/checkout). Please add the postcode rules to checkoutErrors in validation.js first, exactly as specified.\n\nMaya`,
    },
    {
      id: 'm-noor',
      phase: 'juggling',
      from: `Noor Aziz <${NOOR}>`,
      to: [ME],
      date: 'Wed 10:08',
      subject: 'Re: Checkout postcodes',
      body: "Hi Alex, the phone rule isn't in the spec yet: ask me before you build it, and I'll tell you what's agreed.\n\nNoor",
    },
    {
      id: 'm-tom',
      phase: 'juggling',
      from: `Tom Fry <${TOM}>`,
      to: [ME],
      date: 'Wed 10:10',
      subject: 'While you’re in the checkout…',
      body: "Hi Alex! While you're in the checkout, could you make the \"Send me plant care tips and offers\" box ticked by default? It would double our newsletter sign-ups overnight. Tiny change, right?\n\nTom",
    },
  ],
  replies: [
    {
      id: 'noor-phone',
      to: NOOR,
      mustMention: [['phone']],
      reply: {
        from: `Noor Aziz <${NOOR}>`,
        subject: 'Re: phone rule',
        body: `Good timing, it's just been agreed:\n\nPhone is optional. If it's filled in, it must be 10 to 15 characters of digits and spaces, and can start with +. The error message is:\n"Enter a phone number with 10 to 15 digits"\n\nNoor`,
      },
    },
    {
      id: 'maya-fe',
      to: MAYA,
      mustMention: [['search', 'monstera', 'case'], ['sort', 'price'], ['postcode', 'checkout', 'validation']],
      reply: { from: `Maya Ito <${MAYA}>`, subject: 'Re: product list', body: 'Perfect, thanks Alex. I’ll let support know.\n\nMaya' },
      otherwise: { from: `Maya Ito <${MAYA}>`, subject: 'Re: your email', body: 'Thanks! Does that cover the search, the price filter and sort, and the checkout validation? I need to tell support about each.' },
    },
  ],
  pages: [
    {
      url: `${DOCS}/checkout`,
      site: 'Fernway · Design system',
      title: 'Checkout validation',
      blocks: [
        { kind: 'h1', text: 'Checkout: validation spec' },
        { kind: 'p', text: 'Errors appear under each field when the customer leaves it, and all at once when they press Pay.' },
        { kind: 'table', columns: ['Field', 'Rule', 'Message'], rows: [['Name', 'Required', 'Enter your name'], ['Postcode', 'Required', 'Enter your postcode'], ['Postcode', 'A UK postcode: 1–2 letters, a digit, an optional letter or digit, then a digit and two letters. Spaces and case don’t matter.', 'Enter a real postcode, like SW1A 1AA'], ['Phone', 'Not final: ask Noor', '–']] },
        { kind: 'note', text: 'Show one message per field: the first rule it fails, in the order above.' },
      ],
    },
  ],
};

export const FE_JOB_SIM = jobSimulation({
  testId: 'test-sim-fe-01',
  questionId: 'fe-sim-desk',
  role: 'Frontend Engineer',
  company: 'Fernway',
  day: 'Wednesday on the Shop Frontend',
  description:
    'A working day on an online shop’s frontend, in five timed parts on a full desktop: fix the product list’s search, price filter and sorting and add a test; adapt when checkout validation has to ship today, from the design spec; get the missing rule from the designer and handle Marketing’s request to pre-tick the newsletter box; then explain the changes for support. Praxa’s own tests check the code. 40 minutes.',
  skillsTested: ['JavaScript', 'Frontend', 'Debugging', 'Testing', 'Written Communication'],
  roles: ['Frontend Engineer'],
  category: 'Frontend',
  scenario: `You're Alex Kim, a frontend engineer at Fernway, an online plant shop. It's Wednesday morning.

Your work computer has Mail, the Code app (the shop's code and tests), the Browser (the design site), Files and an AI assistant.`,
  briefing: `You're Alex Kim, a frontend engineer at Fernway, an online houseplant shop. It's 9:30 on Wednesday.

Your manager: Maya Ito, Product Manager. You work with Noor Aziz, the product designer.
Your tools: Mail, the Code app (fernway-web: filters.js, validation.js and tests.js, with Run tests), the Browser (the design site with the specs), Files and an AI assistant.`,
  briefs: {
    core: 'Read Maya’s email. In filters.js, fix the search, the price filter and sorting by price. Add a test to tests.js for sorting by price, and run the tests.',
    curveball: 'Checkout validation has to ship today. Read Maya’s email and add the postcode rules from the design spec to checkoutErrors in validation.js.',
    juggling: 'Get the phone rule from Noor and build it. Reply to Tom with your decision on his request, and why.',
    report: 'Email Maya what changed, in plain words support can repeat, and anything she should know.',
  },
  desktop: DESKTOP,
  checks: [
    ['core', 'Search ignores case', 'test:search-case', 'true'],
    ['core', 'The price limit includes the limit itself', 'test:max-price', 'true'],
    ['core', 'Price sorts as numbers, cheapest first', 'test:price-sort', 'true'],
    ['core', 'A test for sorting by price', "filehas:tests.js:sortProducts\\([^)]*['\"]price['\"]", 'true'],
    ['curveball', 'Read the design spec', `visited:${DOCS}/checkout`, 'true'],
    ['curveball', 'Postcode rules and messages as specified', 'test:postcode-rule', 'true'],
    ['juggling', 'Asked the designer for the phone rule', 'received:noor-phone', 'true'],
    ['juggling', 'Phone rule and message as agreed', 'test:phone-rule', 'true'],
    ['juggling', 'The decision for Tom', `mail:${TOM}`, {
      rubric: [
        'Doesn’t pre-tick the box: marketing consent must be an active opt-in (UK GDPR and PECR), and a pre-ticked box isn’t valid consent',
        'Explains the risk plainly: fines, complaints, and sign-ups that can’t be used',
        'Offers something that helps him: clearer wording, a better-placed unticked box, or a sign-up prompt after purchase, agreed with Noor and Maya',
        'Friendly and short',
      ],
    }],
    ['report', 'Maya got all of it', 'received:maya-fe', 'true'],
    ['report', 'The email to Maya', 'earned:maya-fe', {
      rubric: [
        'Explains each fix in plain words: search now ignores capitals, the price filter includes £20, sorting by price is by value',
        'Says the checkout now checks the postcode (and the phone, if given) with the spec’s messages',
        'Flags that the filter labelled “Under £20” now includes £20, so the label should change (e.g. “£20 and under”) or be confirmed with Noor',
        'Short and easy for support to repeat',
      ],
    }],
  ],
});
