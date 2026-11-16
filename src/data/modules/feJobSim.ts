import { AssessmentTest, Question } from '../../types';
import { DesktopConfig } from '../../lib/desktop';
import { choice, multi, order, short, written } from '../questionKit';
import { questionSet } from './daSets';
import { tc } from '../simulationKit';

/**
 * The Frontend Engineer job simulation: a day on Fernway's shop frontend, on the desktop. The product manager reports
 * two product-list bugs, the design spec (in the Browser) gives the checkout's postcode rule and leaves the phone rule
 * to the designer, who answers when asked. The code is in the Code app; Praxa's own tests check the fixes. Two question
 * sets come first. About 40 minutes.
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

const DESKTOP: DesktopConfig = {
  user: { name: 'Alex Kim', email: ME, role: 'Frontend Engineer' },
  company: 'Fernway',
  time: 'Wed 09:30',
  apps: ['mail', 'browser', 'code', 'files', 'ai'],
  contacts: [
    { name: 'Maya Ito', role: 'Product Manager', email: MAYA },
    { name: 'Noor Aziz', role: 'Product Designer', email: NOOR },
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
      id: 'm-noor',
      from: `Noor Aziz <${NOOR}>`,
      to: [ME],
      date: 'Tue 17:40',
      subject: 'Checkout spec is up',
      body: `Hi Alex,\n\nThe checkout validation spec is on the design site: ${DOCS}/checkout\n\nThe phone rule isn't final yet, so ask me before you build it.\n\nNoor`,
    },
    {
      id: 'm-maya',
      from: `Maya Ito <${MAYA}>`,
      to: [ME],
      cc: [NOOR],
      date: 'Wed 09:15',
      subject: 'Product list bugs + checkout',
      body: `Morning Alex,\n\nTwo bugs from support on the product list:\n• Searching "monstera" finds nothing, though we sell two\n• "Under £20" leaves out plants that cost exactly £20, and sorting by price puts the £100 Pothos before the £20 ones\n\nAnd could you add the checkout validation from Noor's spec (postcode and phone)?\n\nThe code's in fernway-web (Code app). When you're done, email me what changed so I can let support know.\n\nThanks!\nMaya`,
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

const TASK: Question = {
  id: 'fe-sim-desk',
  title: 'Wednesday on the Shop Frontend',
  type: 'desktop',
  prompt: `It's 9:30 on Wednesday. You're a frontend engineer at Fernway. Your computer has Mail, the Browser (the design site), and the Code app with the shop's product-list and checkout code. Start with your inbox.

Q1. Fix the search and the price filter in filters.js, so they match what support reported.
Q2. Fix sorting by price.
Q3. Add the postcode rules to checkoutErrors in validation.js, exactly as the design spec says.
Q4. Find out the phone rule from the designer, then add it.
Q5. Add a test to tests.js for sorting by price, and run the tests.
Q6. Email Maya what changed, so she can tell support.`,
  starterCode: '',
  desktop: DESKTOP,
  testCases: (
    [
      [1, 'Search ignores case', 'test:search-case', 'true'],
      [1, 'The price limit includes the limit itself', 'test:max-price', 'true'],
      [2, 'Price sorts as numbers, cheapest first', 'test:price-sort', 'true'],
      [3, 'Read the design spec', `visited:${DOCS}/checkout`, 'true'],
      [3, 'Postcode rules and messages as specified', 'test:postcode-rule', 'true'],
      [4, 'Asked the designer for the phone rule', 'received:noor-phone', 'true'],
      [4, 'Phone rule and message as agreed', 'test:phone-rule', 'true'],
      [5, 'A test for sorting by price', "filehas:tests.js:sortProducts\\([^)]*['\"]price['\"]", 'true'],
      [6, 'Maya got all of it', 'received:maya-fe', 'true'],
      [6, 'The email to Maya', 'earned:maya-fe', { rubric: ['Explains each fix in plain words: search now ignores capitals, “under £20” includes £20, sorting by price is by value', 'Says the checkout now checks the postcode (and phone, if given) with the spec’s messages', 'Short and easy for support to repeat'] }],
    ] as [number, string, string, string | { rubric: string[] }][]
  ).map(([n, d, input, e], i) => ({ ...tc(`tc-fe-sim-${i + 1}`, `Q${n} · ${d}`, input, typeof e === 'string' ? e : ''), ...(typeof e !== 'string' && { rubric: e.rubric }) })),
  timeLimitMinutes: 30,
  weight: 70,
};

const SETS: Question[] = [
  ...questionSet(
    'fe-sim-s1',
    'Reading a Design Spec',
    'Spec for the basket badge',
    `Basket badge spec:

• Shows the number of items (the sum of quantities), not lines
• Hidden when the basket is empty
• Shows 99+ above 99
• Announced to screen readers as "Basket, 3 items"`,
    [
      short('fe-sim-s1-a', 'The Count', 'The basket has 2 pots on one line and 1 plant on another. What does the badge show?', ['3']),
      short('fe-sim-s1-b', 'Above 99', 'What does the badge show for 150 items?', ['99+']),
      choice('fe-sim-s1-c', 'Screen Readers', 'How would you give the badge its spoken label?', ['aria-label="Basket, 3 items" on the basket link (updated with the count)', 'A title attribute on the badge', 'alt text on the number', 'Nothing: the number is enough'], 0),
      written(
        'fe-sim-s1-d',
        'A Gap in the Spec',
        'The spec doesn’t say what happens while the basket is still loading. What do you do?',
        ['Notices it’s a gap and asks the designer (or proposes an option) rather than guessing silently', 'Suggests a sensible default (e.g. hide the badge until loaded, no layout shift)', 'Gets the answer written into the spec'],
        'I’d ask Noor rather than guess, with a suggestion: keep the badge hidden until the basket loads (and reserve its space so nothing jumps), then show the count. Once agreed, I’d ask for it to be added to the spec so everyone builds it the same way.'
      ),
    ]
  ),
  ...questionSet(
    'fe-sim-s2',
    'Reviewing a Pull Request',
    'PR #418: product card',
    `\`\`\`jsx
function ProductCard({ product }) {
  return (
    <div onClick={() => addToBasket(product.id)} className="card">
      <img src={product.image} />
      <span style={{ color: '#9aa' }}>£{product.price}</span>
    </div>
  );
}
\`\`\``,
    [
      multi('fe-sim-s2-a', 'What to Flag', 'Which problems would you raise? Tick all that apply.', ['A clickable div: not reachable by keyboard; use a button', 'The image has no alt text', 'Light grey price text may fail contrast', 'The price isn’t formatted (e.g. £7.5)', 'The component name is too long'], [0, 1, 2, 3]),
      choice('fe-sim-s2-b', 'The Button', 'What’s the best fix for the clickable div?', ['A real <button> for the add action', 'Add tabIndex={0} to the div', 'Add role="button" only', 'Wrap the div in a link'], 0),
      order('fe-sim-s2-c', 'A Kind Review', 'Put a good review comment’s parts in order.', ['What you noticed, on the line', 'Why it matters (who it affects)', 'A suggested fix or example', 'Whether it blocks merging']),
      written(
        'fe-sim-s2-d',
        'One Comment',
        'Write the review comment for the clickable div.',
        ['Points to the problem clearly and kindly (keyboard and screen reader users can’t use a div)', 'Suggests the fix (a <button type="button"> with the add action, styled as needed)', 'Says whether it blocks merging and why'],
        'This div is clickable, but keyboard and screen reader users can’t reach or use it. Could we use a <button type="button" onClick={…}> for “Add to basket” instead (we can keep the card styling)? I’d count this as blocking, since it stops some customers buying.'
      ),
    ]
  ),
];

export const FE_JOB_SIM: AssessmentTest = (() => {
  const raw = [...SETS, TASK];
  const total = raw.reduce((n, q) => n + q.weight, 0) || 1;
  const questions = raw.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) }));
  const drift = 100 - questions.reduce((n, q) => n + q.weight, 0);
  if (drift) questions.reduce((a, b) => (b.weight > a.weight ? b : a)).weight += drift;
  return {
    id: 'test-sim-fe-01',
    title: 'Frontend Engineer Job Simulation: A Day at Fernway',
    description:
      'A working day on an online shop’s frontend, on a full desktop: fix the product list’s search, price filter and sorting from the product manager’s email, build the checkout validation from the design spec, ask the designer for the rule that isn’t final, add a test, and explain the changes for support. Praxa’s own tests check the code. About 40 minutes.',
    skillsTested: ['JavaScript', 'Frontend', 'Debugging', 'Testing', 'Written Communication'],
    roles: ['Frontend Engineer'],
    type: 'standard',
    category: 'Frontend',
    difficulty: 'Professional',
    passingScore: 70,
    scenario: {
      company: 'Fernway',
      role: 'Frontend Engineer',
      brief: `You're Alex Kim, a frontend engineer at Fernway, an online plant shop. It's Wednesday morning.

The job simulation runs on your work computer: Mail, the Browser (the design site), the Code app with the shop's code and tests, Files and an AI assistant, all on the taskbar. People reply to your emails.`,
    },
    questions,
    totalQuestions: questions.filter((q) => q.type !== 'case').length,
    estimatedMinutes: 40,
  };
})();
