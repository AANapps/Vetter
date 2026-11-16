import { AssessmentTest, DataTable, Question, TestRole, TestScenario } from '../../types';
import { choice, match, multi, order, short, written } from '../questionKit';
import { databaseStarter } from '../../lib/databaseWork';
import { questionSet } from './daSets';
import { TASK_MINUTES, TASK_WEIGHT, fieldModule, programTask } from './programTask';
import { round2, seeded, tc } from '../simulationKit';

/**
 * The Software Developer modules, built like the Data Analyst ones: JavaScript, Debugging, Data Structures &
 * Algorithms, and APIs & SQL, each "for Software Development". Two question sets on the skill, then two practical
 * tasks of four numbered questions, each marked on its own: programs run on two data sets (JavaScript, in the
 * browser), and SQL in a real database. About 20 minutes each.
 */

const SD: TestRole[] = ['Software Developer'];
const FIELD = 'Software Development';
const SCENARIO: TestScenario = {
  company: 'Fernway',
  role: 'Software Developer',
  brief: `Fernway sells houseplants online. You're a developer on the team that builds its shop and the services behind it.

Each coding task is one program that answers four questions: it's given the question (q1 to q4) on its first line and the data as JSON after it, and prints exactly what the question asks. Each question runs on two data sets.`,
};
const pick = <T,>(rand: () => number, xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const data = (v: unknown) => JSON.stringify(v);
const parse = <T,>(input: string) => JSON.parse(input) as T;

// =====================================================================================================
// JavaScript
// =====================================================================================================

interface Order {
  id: string;
  customer: string;
  status: 'paid' | 'pending' | 'refunded';
  items: { sku: string; qty: number; price: number }[];
}
const orders = (seed: number, n: number): Order[] => {
  const rand = seeded(seed);
  const names = ['Ruth Ames', 'Ben Cole', 'Ava Hill', 'Omar Haddad', 'Lena Shaw', 'Kit Moss'];
  return Array.from({ length: n }, (_, i) => ({
    id: `A${100 + i}`,
    customer: pick(rand, names),
    status: pick(rand, ['paid', 'paid', 'paid', 'pending', 'refunded'] as const),
    items: Array.from({ length: 1 + Math.floor(rand() * 3) }, () => ({ sku: pick(rand, ['MON-80', 'FIG-160', 'POT-W', 'FEED-1']), qty: 1 + Math.floor(rand() * 3), price: round2(4 + rand() * 60) })),
  }));
};
const value = (o: Order) => o.items.reduce((n, i) => n + i.qty * i.price, 0);
const paid = (os: Order[]) => os.filter((o) => o.status === 'paid');
const ORD_A = data(orders(1101, 9));
const ORD_B = data(orders(1102, 7));

const TEXT_A = data({ text: 'The fig needs light. The monstera needs less light than the fig, and the fern needs the least' });
const TEXT_B = data({ text: 'Water weekly in summer, monthly in winter. Feed monthly in spring and summer only!' });
const words = (t: string) => t.toLowerCase().match(/[a-z]+/g) ?? [];
const topWord = (t: string) => {
  const c = new Map<string, number>();
  for (const w of words(t)) c.set(w, (c.get(w) ?? 0) + 1);
  return [...c.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0];
};

const JS_TEST = fieldModule({
  id: 'test-sd-js',
  skill: 'JavaScript',
  field: FIELD,
  category: 'Software Development',
  roles: SD,
  description: 'Two question sets (reading JavaScript; async code and errors), then two coding tasks of four questions each: working with an order list (filter, reduce, sort, find the largest) and text tools (counting, the most common word, title case, slugs).',
  skillsTested: ['JavaScript', 'Arrays', 'Objects', 'Strings', 'Async'],
  scenario: SCENARIO,
  sets: [
    ...questionSet(
      'js-s1',
      'Reading JavaScript',
      'cart.js',
      `\`\`\`js
const items = [
  { sku: 'MON-80', qty: 2, price: 24 },
  { sku: 'POT-W', qty: 1, price: 12 },
  { sku: 'FEED-1', qty: 0, price: 6 },
];
const inBasket = items.filter((i) => i.qty > 0);
const total = inBasket.reduce((sum, i) => sum + i.qty * i.price, 0);
const skus = inBasket.map((i) => i.sku).join(', ');
console.log(total, skus, '5' == 5, '5' === 5);
\`\`\``,
      [
        short('js-s1-a', 'The Total', 'What number does total hold?', ['60']),
        choice('js-s1-b', 'Two Equals', "Why does '5' == 5 print true but '5' === 5 print false?", ['== converts the string to a number before comparing; === compares type and value', '=== is only for strings', '== compares memory addresses', 'They both compare type, but == ignores whitespace'], 0),
        match('js-s1-c', 'Array Methods', 'Match each method to what it gives back.', [
          ['filter', 'A new array of the items that pass the test'],
          ['map', 'A new array, one result per item'],
          ['reduce', 'A single value built up from every item'],
          ['find', 'The first item that passes the test, or undefined'],
        ]),
        written(
          'js-s1-d',
          'The Loop Bug',
          'This prints 3, 3, 3 instead of 0, 1, 2. Why, and how would you fix it?\n\n```js\nfor (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}\n```',
          [
            'Explains var is function-scoped, so all three callbacks share one i, which is 3 by the time they run',
            'Fixes it with let (a new binding per loop iteration), or an IIFE / passing i in',
            'Notes the callbacks run after the loop has finished (the event loop)',
          ],
          'var gives one i for the whole loop, and the timeouts only run after the loop ends, when i is 3, so all three print 3. Use let i: let makes a fresh i for each iteration, so each callback keeps its own 0, 1 and 2.'
        ),
      ]
    ),
    ...questionSet(
      'js-s2',
      'Async Code and Errors',
      'loadOrders.js',
      `\`\`\`js
async function loadOrders(userId) {
  const res = fetch(\`/api/users/\${userId}/orders\`);
  const orders = await res.json();
  return orders.filter((o) => o.status === 'paid');
}

console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');
\`\`\``,
      [
        order('js-s2-a', 'What Prints First', 'Put what the last four lines print in order.', ['A', 'D', 'C', 'B']),
        choice('js-s2-b', 'The Missing Await', 'What goes wrong in loadOrders?', ['fetch isn’t awaited, so res is a Promise and res.json is not a function', 'filter can’t be used on JSON', 'async functions can’t return arrays', 'Nothing: it works'], 0),
        short('js-s2-c', 'Promise.all', 'Promise.all is given three promises and the second one rejects. Does Promise.all resolve or reject? (One word.)', ['reject', 'rejects', 'it rejects']),
        written(
          'js-s2-d',
          'Fix It Properly',
          'Rewrite loadOrders so it works, and so a failed request (network error or a non-200 status) gives the caller a clear error.',
          [
            'Awaits fetch before calling res.json()',
            'Checks res.ok (or the status) and throws a meaningful error when it isn’t OK',
            'Handles or lets the caller handle network errors (try/catch or a rejected promise) rather than swallowing them',
          ],
          "async function loadOrders(userId) {\n  const res = await fetch(`/api/users/${userId}/orders`);\n  if (!res.ok) throw new Error(`Couldn't load orders for ${userId}: ${res.status}`);\n  const orders = await res.json();\n  return orders.filter((o) => o.status === 'paid');\n}\n// A network failure rejects the fetch, so the caller's try/catch (or .catch) gets it."
        ),
      ]
    ),
  ],
  tasks: [
    programTask({
      id: 'js-t1',
      title: 'The Order List',
      language: 'javascript',
      prompt: `The data is a JSON array of orders: { id, customer, status ('paid', 'pending' or 'refunded'), items: [{ sku, qty, price }] }. An order's value is the sum of qty × price over its items.

Q1. Print how many orders are paid.
Q2. Print the total value of the paid orders, to 2 decimal places (e.g. 1234.50).
Q3. Print every customer who has an order of any status, once each, in alphabetical order, separated by commas.
Q4. Print the id of the paid order with the highest value.`,
      questions: ['how many orders are paid', 'total value of paid orders, 2 dp', 'customers, alphabetical, comma-separated', 'id of the most valuable paid order'],
      data: [
        ['right on the first list', ORD_A],
        ['right on the second list', ORD_B],
      ],
      expected: [
        (i) => String(paid(parse<Order[]>(i)).length),
        (i) => paid(parse<Order[]>(i)).reduce((n, o) => n + value(o), 0).toFixed(2),
        (i) => [...new Set(parse<Order[]>(i).map((o) => o.customer))].sort().join(','),
        (i) => paid(parse<Order[]>(i)).reduce((best, o) => (value(o) > value(best) ? o : best)).id,
      ],
      solution: `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const data = JSON.parse(rest.join('\\n'));
const value = (o) => o.items.reduce((n, i) => n + i.qty * i.price, 0);
const paid = data.filter((o) => o.status === 'paid');
if (question === 'q1') console.log(paid.length);
else if (question === 'q2') console.log(paid.reduce((n, o) => n + value(o), 0).toFixed(2));
else if (question === 'q3') console.log([...new Set(data.map((o) => o.customer))].sort().join(','));
else if (question === 'q4') console.log(paid.reduce((best, o) => (value(o) > value(best) ? o : best)).id);
`,
    }),
    programTask({
      id: 'js-t2',
      title: 'Text Tools',
      language: 'javascript',
      prompt: `The data is { text }: a sentence or two of plant-care copy for the shop.

Q1. Print the number of words (separated by spaces).
Q2. Print the most common word, ignoring case and punctuation (words are runs of letters a–z); if several are tied, the one first in alphabetical order.
Q3. Print the text in title case: each space-separated word with its first letter in capitals and the rest lower case.
Q4. Print a URL slug: lower case, every run of characters that aren't a–z or 0–9 replaced with one hyphen, and no hyphen at either end.`,
      questions: ['number of words', 'most common word (ties: alphabetical first)', 'title case', 'URL slug'],
      data: [
        ['right on the first text', TEXT_A],
        ['right on the second text', TEXT_B],
      ],
      expected: [
        (i) => String(parse<{ text: string }>(i).text.trim().split(/\s+/).length),
        (i) => topWord(parse<{ text: string }>(i).text),
        (i) => parse<{ text: string }>(i).text.split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(' '),
        (i) => parse<{ text: string }>(i).text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      ],
      solution: `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const { text } = JSON.parse(rest.join('\\n'));
if (question === 'q1') console.log(text.trim().split(/\\s+/).length);
else if (question === 'q2') {
  const counts = new Map();
  for (const w of text.toLowerCase().match(/[a-z]+/g) || []) counts.set(w, (counts.get(w) || 0) + 1);
  console.log([...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0][0]);
} else if (question === 'q3') console.log(text.split(' ').map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w)).join(' '));
else if (question === 'q4') console.log(text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
`,
    }),
  ],
});

// =====================================================================================================
// Debugging
// =====================================================================================================

const CART_A = data({ items: [{ price: 12.5, qty: 2 }, { price: 7.25, qty: 4 }], total: 80, pct: 15, freeShip: 50, price: 7.5 });
const CART_B = data({ items: [{ price: 30, qty: 1 }, { price: 9.99, qty: 3 }, { price: 1.2, qty: 5 }], total: 50, pct: 20, freeShip: 50, price: 12 });
type Cart = { items: { price: number; qty: number }[]; total: number; pct: number; freeShip: number; price: number };

const CART_BUGGY = `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const data = JSON.parse(rest.join('\\n'));

// The basket's value before discounts
function subtotal(items) {
  let total = 0;
  for (const item of items) {
    total = item.price * item.qty;
  }
  return total;
}

// A percentage discount off a total
function applyDiscount(total, pct) {
  return total - pct;
}

// Delivery: free from the threshold upwards, otherwise 4.99
function shipping(total, freeFrom) {
  return total > freeFrom ? 0 : 4.99;
}

// A price as shown in the shop: "£7.50"
function formatPrice(n) {
  return '£' + n;
}

if (question === 'q1') console.log(subtotal(data.items).toFixed(2));
else if (question === 'q2') console.log(applyDiscount(data.total, data.pct).toFixed(2));
else if (question === 'q3') console.log(shipping(data.total, data.freeShip).toFixed(2));
else if (question === 'q4') console.log(formatPrice(data.price));
`;

const DATES_A = data({ from: '2026-03-01', to: '2026-03-31', date: '2026-03-08', name: '  ada   lovelace ', line: 'MON-80,"Monstera, 80cm",24.00' });
const DATES_B = data({ from: '2026-01-28', to: '2026-02-03', date: '2026-02-07', name: 'grace hopper', line: '"Pot, white","12,5",x' });
type Dates = { from: string; to: string; date: string; name: string; line: string };
const csvLine = (line: string) => {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) out.push(cur), (cur = '');
    else cur += ch;
  }
  out.push(cur);
  return out;
};

const DATES_BUGGY = `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const data = JSON.parse(rest.join('\\n'));

// Whole days from one date (YYYY-MM-DD) to another
function daysBetween(from, to) {
  return (new Date(to) - new Date(from)) / 86400000 + 1;
}

// Saturday or Sunday
function isWeekend(date) {
  const day = new Date(date).getUTCDay();
  return day === 6 || day === 7;
}

// "ada lovelace" → "AL"
function initials(name) {
  return name.split(' ').map((part) => part[0]).join('');
}

// One line of a CSV file, where a field in double quotes can contain commas
function parseCsvLine(line) {
  return line.split(',');
}

if (question === 'q1') console.log(daysBetween(data.from, data.to));
else if (question === 'q2') console.log(isWeekend(data.date));
else if (question === 'q3') console.log(initials(data.name));
else if (question === 'q4') console.log(JSON.stringify(parseCsvLine(data.line)));
`;

const DEBUG_TEST = fieldModule({
  id: 'test-sd-debug',
  skill: 'Debugging',
  field: FIELD,
  category: 'Software Development',
  roles: SD,
  description: 'Two question sets (reading a stack trace; finding the cause), then two tasks fixing real bugs in running code, four each: a basket’s subtotal, discount, free-delivery threshold and price format, then dates, weekends, initials and CSV parsing.',
  skillsTested: ['Debugging', 'JavaScript', 'Edge Cases', 'Testing'],
  scenario: SCENARIO,
  sets: [
    ...questionSet(
      'dbg-s1',
      'Reading a Stack Trace',
      'Error log',
      `\`\`\`
TypeError: Cannot read properties of undefined (reading 'price')
    at lineTotal (basket.js:14:24)
    at Array.map (<anonymous>)
    at basketTotal (basket.js:21:30)
    at checkout (checkout.js:58:17)
    at async POST /api/checkout (routes.js:112:5)
\`\`\`

basket.js line 14: \`const lineTotal = (line) => line.product.price * line.qty;\``,
      [
        short('dbg-s1-a', 'Where It Broke', 'In which function was the error thrown?', ['lineTotal', 'lineTotal()']),
        choice('dbg-s1-b', 'What Was Undefined', 'What does the error tell you was undefined?', ['line.product, on at least one line', 'price', 'line', 'The checkout route'], 0),
        order('dbg-s1-c', 'Working It Through', 'Put these debugging steps in order.', ['Reproduce the error with the same input', 'Read the trace to the first line in your own code', 'Find which line has no product and why', 'Fix the cause and add a test for it', 'Check nothing else relied on the old behaviour']),
        written(
          'dbg-s1-d',
          'The Real Fix',
          'A colleague suggests changing line 14 to `line.product?.price * line.qty`. Is that a good fix? What would you do?',
          [
            'Says optional chaining only hides the problem: it gives NaN or a wrong total instead of an error',
            'Looks for why a line has no product (deleted product, bad data, a bug upstream) and fixes that',
            'Decides what should happen to such a line (reject the basket with a clear error, or remove the line) and adds a test',
          ],
          'No: ?. stops the crash but the total becomes NaN, which is worse because it fails quietly. I’d find why a basket line has no product (a deleted product, or a bug that saves lines without one), fix that, and decide the right behaviour for a line whose product is gone: remove it with a message, or reject checkout clearly. Then add a test for it.'
        ),
      ]
    ),
    ...questionSet(
      'dbg-s2',
      'Finding the Cause',
      'Bug report #482',
      `Bug report #482: "Customers in New Zealand see their order date as the day before."

• The order date is stored as 2026-03-08T00:30:00 (no time zone) in the database
• The API returns it as stored; the shop shows new Date(value).toLocaleDateString()
• It only happens for some orders, and only for customers outside the UK`,
    [
      choice('dbg-s2-a', 'The Likely Cause', 'What’s the most likely cause?', ['The time is stored without a time zone, so each browser reads it in its own zone', 'A typo in the date format', 'The database is in the wrong country', 'toLocaleDateString is broken'], 0),
      multi('dbg-s2-b', 'Useful Checks', 'Which would help confirm it? Tick all that apply.', ['Reproduce it with the browser set to a New Zealand time zone', 'Check whether failing orders were placed just after midnight', 'Log the raw value the API returns', 'Restart the database', 'Clear the browser cache'], [0, 1, 2]),
      short('dbg-s2-c', 'The Format', 'What standard date-time format, with a time zone, should the API return? (Its name.)', ['ISO 8601', 'iso 8601', 'iso8601', 'ISO-8601', 'UTC ISO 8601']),
      written(
        'dbg-s2-d',
        'Preventing It',
        'How would you fix this so it doesn’t come back?',
        [
          'Stores times in UTC (or with an offset) and returns ISO 8601 with a Z or offset',
          'Formats dates for display in a deliberate time zone (the customer’s or the shop’s), not by accident',
          'Adds a test that runs in another time zone, and fixes existing data if needed',
        ],
        'Store order times in UTC and return them as ISO 8601 with a Z, so every client knows the exact moment. Then decide which zone to show (the shop’s, Europe/London, for order dates) and format in that zone explicitly. Add a test that runs with TZ set to Pacific/Auckland, and convert the existing stored times.'
      ),
    ]),
  ],
  tasks: [
    programTask({
      id: 'dbg-t1',
      title: 'The Basket Bugs',
      language: 'javascript',
      prompt: `The basket code below has a bug in each function; the lines that print the answers are fine. Fix the bugs so each question prints the right result.

Q1. subtotal: the basket's value before discounts (price × qty for every line, added up).
Q2. applyDiscount: a percentage off the total (15 means 15% off).
Q3. shipping: free when the total is the threshold or more, otherwise 4.99.
Q4. formatPrice: shown as £ and two decimal places (7.5 → £7.50).`,
      questions: [],
      starter: CART_BUGGY,
      data: [
        ['right on the first basket', CART_A],
        ['right on the second basket', CART_B],
      ],
      expected: [
        (i) => parse<Cart>(i).items.reduce((n, x) => n + x.price * x.qty, 0).toFixed(2),
        (i) => (parse<Cart>(i).total * (1 - parse<Cart>(i).pct / 100)).toFixed(2),
        (i) => (parse<Cart>(i).total >= parse<Cart>(i).freeShip ? 0 : 4.99).toFixed(2),
        (i) => '£' + parse<Cart>(i).price.toFixed(2),
      ],
      solution: CART_BUGGY.replace('total = item.price * item.qty;', 'total += item.price * item.qty;')
        .replace('return total - pct;', 'return total * (1 - pct / 100);')
        .replace('total > freeFrom', 'total >= freeFrom')
        .replace("return '£' + n;", "return '£' + n.toFixed(2);"),
    }),
    programTask({
      id: 'dbg-t2',
      title: 'Dates and Text',
      language: 'javascript',
      prompt: `Each function below has a bug. Fix them so each question prints the right result.

Q1. daysBetween: whole days from one date to the other (1 March to 31 March is 30).
Q2. isWeekend: true on a Saturday or Sunday, false otherwise.
Q3. initials: capital initials of a name, however many spaces it has ("  ada   lovelace " → AL).
Q4. parseCsvLine: split a CSV line into fields, where a field in double quotes can contain commas (the quotes aren't part of the field).`,
      questions: [],
      starter: DATES_BUGGY,
      data: [
        ['right on the first data', DATES_A],
        ['right on the second data', DATES_B],
      ],
      expected: [
        (i) => String(Math.round((Date.parse(parse<Dates>(i).to) - Date.parse(parse<Dates>(i).from)) / 86400000)),
        (i) => String([0, 6].includes(new Date(parse<Dates>(i).date).getUTCDay())),
        (i) => parse<Dates>(i).name.trim().split(/\s+/).map((p) => p[0].toUpperCase()).join(''),
        (i) => JSON.stringify(csvLine(parse<Dates>(i).line)),
      ],
      solution: DATES_BUGGY.replace('return (new Date(to) - new Date(from)) / 86400000 + 1;', 'return Math.round((new Date(to) - new Date(from)) / 86400000);')
        .replace('day === 6 || day === 7', 'day === 6 || day === 0')
        .replace("return name.split(' ').map((part) => part[0]).join('');", "return name.trim().split(/\\s+/).map((part) => part[0].toUpperCase()).join('');")
        .replace(
          "return line.split(',');",
          "const out = []; let cur = ''; let quoted = false;\n  for (const ch of line) {\n    if (ch === '\"') quoted = !quoted;\n    else if (ch === ',' && !quoted) { out.push(cur); cur = ''; }\n    else cur += ch;\n  }\n  out.push(cur);\n  return out;"
        ),
    }),
  ],
});

// =====================================================================================================
// Data Structures & Algorithms
// =====================================================================================================

const DSA_A = data({ nums: [3, 8, 11, 4, 7, 2], target: 15, brackets: '{[()()]}', intervals: [[1, 3], [8, 10], [2, 6], [15, 18], [17, 20]], freq: [4, 1, 2, 2, 4, 4, 3, 1, 2, 5], k: 2 });
const DSA_B = data({ nums: [10, 5, 1, 6, 2], target: 7, brackets: '([)]{}', intervals: [[5, 7], [1, 2], [2, 4], [9, 9]], freq: [7, 7, 8, 9, 9, 8, 6], k: 3 });
type Dsa1 = { nums: number[]; target: number; brackets: string; intervals: number[][]; freq: number[]; k: number };
const twoSum = (nums: number[], t: number) => {
  const seen = new Map<number, number>();
  for (let j = 0; j < nums.length; j++) {
    if (seen.has(t - nums[j])) return `${seen.get(t - nums[j])},${j}`;
    if (!seen.has(nums[j])) seen.set(nums[j], j);
  }
  return '-1';
};
const balanced = (s: string) => {
  const st: string[] = [];
  const pair: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  for (const c of s) {
    if ('([{'.includes(c)) st.push(c);
    else if (st.pop() !== pair[c]) return false;
  }
  return st.length === 0;
};
const mergeIv = (iv: number[][]) => {
  const s = [...iv].sort((a, b) => a[0] - b[0]);
  const out: number[][] = [];
  for (const [a, b] of s) {
    if (out.length && a <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b);
    else out.push([a, b]);
  }
  return out;
};
const topK = (xs: number[], k: number) => {
  const c = new Map<number, number>();
  xs.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, k).map((e) => e[0]).join(',');
};

const DSA2_A = data({ sorted: [1, 3, 3, 3, 5, 8, 8, 13], target: 8, grid: ['S..#....', '.#.#.##.', '.#...#..', '...#.#.E'], words: ['stop', 'pots', 'tops', 'leaf', 'flea', 'pear', 'reap', 'pare', 'fern'], s: 'monstera-pot' });
const DSA2_B = data({ sorted: [2, 4, 4, 9], target: 5, grid: ['S.#', '##.', '..E'], words: ['ate', 'eat', 'tea', 'tan', 'nat', 'bat'], s: 'aabbccabc' });
type Dsa2 = { sorted: number[]; target: number; grid: string[]; words: string[]; s: string };
const firstIndex = (a: number[], t: number) => {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return a[lo] === t ? lo : -1;
};
const bfs = (g: string[]) => {
  const R = g.length;
  const C = g[0].length;
  let s: number[] = [0, 0];
  g.forEach((row, r) => [...row].forEach((ch, c) => ch === 'S' && (s = [r, c])));
  const dist = new Map<string, number>([[s.join(','), 0]]);
  const q = [s];
  while (q.length) {
    const [r, c] = q.shift()!;
    if (g[r][c] === 'E') return dist.get(`${r},${c}`)!;
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] === '#' || dist.has(`${nr},${nc}`)) continue;
      dist.set(`${nr},${nc}`, dist.get(`${r},${c}`)! + 1);
      q.push([nr, nc]);
    }
  }
  return -1;
};
const longestUnique = (s: string) => {
  let best = 0;
  let start = 0;
  const last = new Map<string, number>();
  [...s].forEach((ch, i) => {
    if (last.has(ch) && last.get(ch)! >= start) start = last.get(ch)! + 1;
    last.set(ch, i);
    best = Math.max(best, i - start + 1);
  });
  return best;
};

const DSA_TEST = fieldModule({
  id: 'test-sd-dsa',
  skill: 'Data Structures & Algorithms',
  field: FIELD,
  category: 'Software Development',
  roles: SD,
  description: 'Two question sets (complexity; choosing a data structure), then two coding tasks of four problems each: two-sum, balanced brackets, merging intervals and the top k; then binary search, shortest path in a grid, grouping anagrams and the longest run without repeats.',
  skillsTested: ['Algorithms', 'Data Structures', 'Complexity', 'JavaScript'],
  scenario: SCENARIO,
  sets: [
    ...questionSet(
      'dsa-s1',
      'Complexity',
      'Two functions',
      `\`\`\`js
// A: does the list have a duplicate?
function hasDupA(xs) {
  for (let i = 0; i < xs.length; i++)
    for (let j = i + 1; j < xs.length; j++) if (xs[i] === xs[j]) return true;
  return false;
}
// B: the same, with a Set
function hasDupB(xs) {
  const seen = new Set();
  for (const x of xs) { if (seen.has(x)) return true; seen.add(x); }
  return false;
}
\`\`\``,
      [
        match('dsa-s1-a', 'Big O', 'Match each to its time complexity.', [
          ['hasDupA', 'O(n²)'],
          ['hasDupB', 'O(n)'],
          ['Binary search in a sorted array', 'O(log n)'],
          ['Sorting with a comparison sort', 'O(n log n)'],
        ]),
        choice('dsa-s1-b', 'The Trade-off', 'What does hasDupB give up for its speed?', ['Extra memory: the Set can hold up to n items', 'Correctness on numbers', 'It only works on sorted lists', 'Nothing at all'], 0),
        short('dsa-s1-c', 'Comparisons', 'For a list of 1,000 items with no duplicate, roughly how many comparisons does hasDupA make? (Nearest thousand.)', ['499500', '499,500', '500000', '500,000', '499000', '499,000']),
        written(
          'dsa-s1-d',
          'Which to Ship',
          'The shop checks for duplicate SKUs in an upload of up to 200,000 rows. Which version would you use, and why?',
          [
            'Picks the Set version (O(n)) because O(n²) on 200,000 rows is about 20 billion comparisons',
            'Notes the memory cost of the Set is small for 200,000 strings and acceptable',
            'Mentions an alternative (sort then compare neighbours, O(n log n)) or reporting which SKUs repeat',
          ],
          'The Set version: it’s O(n), about 200,000 steps, while the nested loops are O(n²), roughly 20 billion comparisons, far too slow. A Set of 200,000 SKUs is only a few megabytes. If memory were tight, sorting and comparing neighbours (O(n log n)) would also work, and either way I’d report which SKUs repeat.'
        ),
      ]
    ),
    ...questionSet(
      'dsa-s2',
      'Choosing a Data Structure',
      'Features to build',
      `Features the team needs this sprint:

1. An undo history for the product editor
2. Orders waiting to be packed, first come first served
3. Looking up a customer by email instantly
4. Showing the next delivery slot (the earliest time) as slots are added and booked`,
      [
        match('dsa-s2-a', 'The Right Structure', 'Match each feature to the structure that suits it.', [
          ['Undo history', 'Stack'],
          ['Orders waiting to be packed', 'Queue'],
          ['Customer by email', 'Hash map'],
          ['Earliest delivery slot', 'Priority queue (heap)'],
        ]),
        choice('dsa-s2-b', 'Why a Heap', 'Why a heap for delivery slots rather than a sorted array?', ['Adding and taking the earliest are both O(log n); inserting into a sorted array is O(n)', 'Heaps use less memory', 'Arrays can’t hold times', 'Heaps keep everything fully sorted'], 0),
        short('dsa-s2-c', 'Map Lookup', 'What is the average time complexity of looking up a key in a hash map? (Big O.)', ['O(1)', 'o(1)', '1', 'constant']),
        written(
          'dsa-s2-d',
          'Recently Viewed',
          'Product pages show the 10 products a customer viewed most recently, without repeats, newest first. What structure(s) would you use, and how does adding a view work?',
          [
            'Uses an ordered structure plus a set/map for membership (e.g. a Map or linked list + hash map, like an LRU cache)',
            'On a view: remove the product if it’s already there, add it at the front',
            'Trims to 10 by dropping the oldest, with each step O(1) (or O(10))',
          ],
          'An LRU-style list: a JavaScript Map (which keeps insertion order) or a linked list plus a hash map. When a product is viewed, delete it if present and add it again so it’s newest, then if there are more than 10, remove the oldest. Each step is O(1), and the list never has repeats.'
        ),
      ]
    ),
  ],
  tasks: [
    programTask({
      id: 'dsa-t1',
      title: 'Four Classics',
      language: 'javascript',
      prompt: `The data is { nums, target, brackets, intervals, freq, k }.

Q1. Two-sum: print the indexes i,j (i < j) of the two numbers in nums that add up to target, as found scanning j from the left and taking the earliest i (e.g. 1,4). Print -1 if there are none.
Q2. Print true if brackets is balanced (every (, [ and { closed in the right order), otherwise false.
Q3. Merge the overlapping intervals and print them sorted by start, as JSON (e.g. [[1,6],[8,10]]).
Q4. Print the k most frequent numbers in freq, most frequent first; ties broken by the smaller number first; separated by commas.`,
      questions: ['two-sum indexes', 'balanced brackets', 'merged intervals as JSON', 'k most frequent'],
      data: [
        ['right on the first data', DSA_A],
        ['right on the second data', DSA_B],
      ],
      expected: [(i) => twoSum(parse<Dsa1>(i).nums, parse<Dsa1>(i).target), (i) => String(balanced(parse<Dsa1>(i).brackets)), (i) => JSON.stringify(mergeIv(parse<Dsa1>(i).intervals)), (i) => topK(parse<Dsa1>(i).freq, parse<Dsa1>(i).k)],
      solution: `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const d = JSON.parse(rest.join('\\n'));
if (question === 'q1') {
  const seen = new Map(); let out = '-1';
  for (let j = 0; j < d.nums.length; j++) { if (seen.has(d.target - d.nums[j])) { out = seen.get(d.target - d.nums[j]) + ',' + j; break; } if (!seen.has(d.nums[j])) seen.set(d.nums[j], j); }
  console.log(out);
} else if (question === 'q2') {
  const st = []; const pair = { ')': '(', ']': '[', '}': '{' }; let ok = true;
  for (const c of d.brackets) { if ('([{'.includes(c)) st.push(c); else if (st.pop() !== pair[c]) { ok = false; break; } }
  console.log(ok && st.length === 0);
} else if (question === 'q3') {
  const s = [...d.intervals].sort((a, b) => a[0] - b[0]); const out = [];
  for (const [a, b] of s) { if (out.length && a <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], b); else out.push([a, b]); }
  console.log(JSON.stringify(out));
} else if (question === 'q4') {
  const c = new Map(); d.freq.forEach((x) => c.set(x, (c.get(x) || 0) + 1));
  console.log([...c].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, d.k).map((e) => e[0]).join(','));
}
`,
    }),
    programTask({
      id: 'dsa-t2',
      title: 'Search and Paths',
      language: 'javascript',
      prompt: `The data is { sorted, target, grid, words, s }.

Q1. Binary search: print the first index of target in the sorted array (which can have repeats), or -1 if it isn't there.
Q2. grid is rows of text: S is the start, E the end, # a wall, . open. Moving up, down, left or right one square at a time, print the fewest moves from S to E, or -1 if E can't be reached.
Q3. Print how many groups of anagrams there are in words (words with the same letters in any order are one group).
Q4. Print the length of the longest run of s with no repeated character.`,
      questions: ['first index of target, or -1', 'fewest moves from S to E, or -1', 'number of anagram groups', 'longest run with no repeated character'],
      data: [
        ['right on the first data', DSA2_A],
        ['right on the second data', DSA2_B],
      ],
      expected: [
        (i) => String(firstIndex(parse<Dsa2>(i).sorted, parse<Dsa2>(i).target)),
        (i) => String(bfs(parse<Dsa2>(i).grid)),
        (i) => String(new Set(parse<Dsa2>(i).words.map((w) => [...w].sort().join(''))).size),
        (i) => String(longestUnique(parse<Dsa2>(i).s)),
      ],
      solution: `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const d = JSON.parse(rest.join('\\n'));
if (question === 'q1') {
  let lo = 0, hi = d.sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (d.sorted[mid] < d.target) lo = mid + 1; else hi = mid; }
  console.log(d.sorted[lo] === d.target ? lo : -1);
} else if (question === 'q2') {
  const g = d.grid, R = g.length, C = g[0].length; let s = [0, 0];
  g.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === 'S') s = [r, c]; }));
  const dist = new Map([[s.join(','), 0]]); const q = [s]; let ans = -1;
  while (q.length) {
    const [r, c] = q.shift();
    if (g[r][c] === 'E') { ans = dist.get(r + ',' + c); break; }
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= R || nc >= C || g[nr][nc] === '#' || dist.has(nr + ',' + nc)) continue;
      dist.set(nr + ',' + nc, dist.get(r + ',' + c) + 1); q.push([nr, nc]);
    }
  }
  console.log(ans);
} else if (question === 'q3') console.log(new Set(d.words.map((w) => [...w].sort().join(''))).size);
else if (question === 'q4') {
  let best = 0, start = 0; const last = new Map();
  [...d.s].forEach((ch, i) => { if (last.has(ch) && last.get(ch) >= start) start = last.get(ch) + 1; last.set(ch, i); best = Math.max(best, i - start + 1); });
  console.log(best);
}
`,
    }),
  ],
});

// =====================================================================================================
// APIs & SQL
// =====================================================================================================

const API_TABLES: DataTable[] = [
  {
    name: 'users',
    columns: ['id', 'name', 'email', 'plan', 'created_at'],
    rows: [
      { id: 1, name: 'Ruth Ames', email: 'ruth@ames.co.uk', plan: 'pro', created_at: '2026-01-04' },
      { id: 2, name: 'Ben Cole', email: 'ben@cole.dev', plan: 'free', created_at: '2026-01-19' },
      { id: 3, name: 'Ava Hill', email: 'AVA@hill.io', plan: 'pro', created_at: '2026-02-02' },
      { id: 4, name: 'Omar Haddad', email: 'omar@haddad.com', plan: 'free', created_at: '2026-02-14' },
      { id: 5, name: 'Ava Hill', email: 'ava@hill.io', plan: 'free', created_at: '2026-02-20' },
      { id: 6, name: 'Lena Shaw', email: 'lena@shaw.net', plan: 'pro', created_at: '2026-03-01' },
    ],
  },
  {
    name: 'orders',
    columns: ['id', 'user_id', 'amount', 'status', 'created_at'],
    rows: [
      { id: 101, user_id: 1, amount: 42.5, status: 'paid', created_at: '2026-01-10' },
      { id: 102, user_id: 1, amount: 18, status: 'refunded', created_at: '2026-01-22' },
      { id: 103, user_id: 3, amount: 120, status: 'paid', created_at: '2026-02-05' },
      { id: 104, user_id: 2, amount: 9.99, status: 'pending', created_at: '2026-02-08' },
      { id: 105, user_id: 3, amount: 64.25, status: 'paid', created_at: '2026-02-21' },
      { id: 106, user_id: 6, amount: 31, status: 'paid', created_at: '2026-03-03' },
      { id: 107, user_id: 1, amount: 15.75, status: 'paid', created_at: '2026-03-09' },
    ],
  },
];

const REQ_A = data({
  create: { method: 'POST', path: '/tasks', body: { title: 'Repot the fig', priority: 'urgent' } },
  auth: { headers: { authorization: 'Bearer t-member' }, tokens: { 't-admin': 'admin', 't-member': 'member' } },
  routes: ['GET /tasks', 'POST /tasks', 'GET /tasks/12', 'DELETE /tasks/abc', 'PUT /tasks', 'GET /users'],
  page: { tasks: [11, 12, 13, 14, 15, 16, 17], query: { limit: '3', offset: '2' } },
});
const REQ_B = data({
  create: { method: 'POST', path: '/tasks', body: { title: '', priority: 'low' } },
  auth: { headers: {}, tokens: { 't-admin': 'admin' } },
  routes: ['DELETE /tasks/7', 'PATCH /tasks/7', 'GET /tasks/', 'POST /tasks/3', 'GET /tasks/0'],
  page: { tasks: [1, 2, 3, 4, 5], query: { limit: '-1' } },
});
type Req = {
  create: { body: { title?: unknown; priority?: unknown } };
  auth: { headers: { authorization?: string }; tokens: Record<string, string> };
  routes: string[];
  page: { tasks: number[]; query: { limit?: string; offset?: string } };
};
const validate = (b: Req['create']['body']) => {
  if (typeof b.title !== 'string' || b.title.trim().length < 1 || b.title.length > 100) return '400 title';
  if (!['low', 'medium', 'high'].includes(String(b.priority))) return '400 priority';
  return '201';
};
const authorise = (a: Req['auth']) => {
  const m = /^Bearer (.+)$/.exec(a.headers.authorization ?? '');
  if (!m || !a.tokens[m[1]]) return '401';
  return a.tokens[m[1]] === 'admin' ? '204' : '403';
};
const route = (line: string) => {
  const [method, path] = line.split(' ');
  if (path === '/tasks') return ['GET', 'POST'].includes(method) ? '200' : '405';
  const m = /^\/tasks\/([^/]+)$/.exec(path);
  if (m) {
    if (!['GET', 'DELETE'].includes(method)) return '405';
    return /^\d+$/.test(m[1]) ? '200' : '400';
  }
  return '404';
};
const pageOf = (p: Req['page']) => {
  const limit = p.query.limit === undefined ? 10 : Number(p.query.limit);
  const offset = p.query.offset === undefined ? 0 : Number(p.query.offset);
  if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) return '400';
  return p.tasks.slice(offset, offset + Math.min(limit, 50)).join(',');
};

const API_TEST = fieldModule({
  id: 'test-sd-api',
  skill: 'APIs & SQL',
  field: FIELD,
  category: 'Software Development',
  roles: SD,
  description: 'Two question sets (HTTP and REST; reading SQL), then a database task of four queries on users and orders (customers who paid, spend per customer, sign-ups by month, duplicate emails) and an API task of four request handlers (validation, authorisation, routing and pagination).',
  skillsTested: ['REST APIs', 'HTTP', 'SQL', 'Validation', 'Authorisation'],
  scenario: SCENARIO,
  sets: [
    ...questionSet(
      'api-s1',
      'HTTP and REST',
      'The tasks API',
      `The team's tasks API:

\`\`\`
GET    /tasks            list tasks (?limit=&offset=)
POST   /tasks            create a task   { title, priority }
GET    /tasks/:id        one task
DELETE /tasks/:id        delete a task (admins only)
\`\`\``,
      [
        match('api-s1-a', 'Status Codes', 'Match each situation to the status code the API should return.', [
          ['A task was created', '201 Created'],
          ['The body is missing a title', '400 Bad Request'],
          ['No token, or an invalid one', '401 Unauthorized'],
          ['A valid token without permission', '403 Forbidden'],
        ]),
        choice('api-s1-b', 'Idempotent', 'Which request can be repeated safely with the same effect each time?', ['DELETE /tasks/12', 'POST /tasks', 'Both', 'Neither'], 0),
        short('api-s1-c', 'Wrong Method', 'What status code fits PUT /tasks, when /tasks exists but doesn’t allow PUT? (The number.)', ['405']),
        written(
          'api-s1-d',
          'Pagination',
          'GET /tasks returns every task, and a customer with 40,000 tasks is timing out. How would you change the endpoint?',
          [
            'Adds pagination (limit/offset or a cursor) with a sensible default and a maximum page size',
            'Returns what the client needs to get the next page (next cursor/offset, or total)',
            'Mentions ordering by a stable key and an index on it, or cursor pagination for large offsets',
          ],
          'Paginate it: ?limit= with a default of 20 and a maximum of 100, and either offset or, better for 40,000 rows, a cursor (the last id seen). Order by a stable key (created_at, id) with an index on it, and return the next cursor with each page so the client can carry on.'
        ),
      ]
    ),
    ...questionSet(
      'api-s2',
      'Reading SQL',
      'A query',
      `\`\`\`sql
SELECT u.name, COUNT(o.id) AS orders, SUM(o.amount) AS spent
FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid'
GROUP BY u.id, u.name
ORDER BY spent DESC;
\`\`\``,
      [
        choice('api-s2-a', 'No Paid Orders', 'What does a user with no paid orders get in this result?', ['A row with orders 0 and spent NULL', 'No row at all', 'An error', 'orders 1 and spent 0'], 0),
        choice('api-s2-b', 'The Condition', 'Why is o.status = \'paid\' in the ON clause rather than in a WHERE?', ['In WHERE it would remove users without paid orders, undoing the LEFT JOIN', 'WHERE can’t compare text', 'It’s faster in ON', 'It makes no difference'], 0),
        short('api-s2-c', 'Injection', 'A developer builds a query as "... WHERE email = \'" + email + "\'". Name the attack this allows. (Two words.)', ['sql injection', 'SQL injection', 'sql-injection']),
        written(
          'api-s2-d',
          'Making It Safe',
          'How would you fix that query-building code, and why does the fix work?',
          [
            'Uses a parameterised query / prepared statement (or the ORM’s parameters) instead of string concatenation',
            'Explains the database then treats the value as data, never as SQL, so quotes in it can’t change the query',
            'Mentions validating input and least-privilege database access as extra defence',
          ],
          'Use a parameterised query: db.query("SELECT ... WHERE email = $1", [email]). The SQL and the value go to the database separately, so whatever the email contains, even quotes and SQL keywords, it’s only ever compared as a value. On top of that, validate the email’s format and give the app’s database user only the rights it needs.'
        ),
      ]
    ),
  ],
  tasks: [
    {
      id: 'api-t1',
      title: 'Users and Orders',
      type: 'database',
      contextData: 'Fernway: users, orders',
      prompt: `The database has users (id, name, email, plan, created_at) and orders (id, user_id, amount, status, created_at; status is 'paid', 'pending' or 'refunded'). Save each answer as a view.

Q1. View paying_users: the id and name of every user with at least one paid order, each once.
Q2. View user_spend: each user's id, name and spent (their total paid amount, rounded to 2 decimal places), only users who've paid something.
Q3. View signups_by_month: month (as 'YYYY-MM') and signups (how many users were created that month).
Q4. View duplicate_emails: email (in lower case) and accounts (how many users share it), for emails used by more than one user, ignoring case.`,
      tables: API_TABLES,
      starterCode: databaseStarter("-- Q1\nCREATE VIEW paying_users AS\nSELECT\n\n-- Q2\n\n-- Q3 (tip: substr(created_at, 1, 7))\n\n-- Q4 (tip: lower(email))\n"),
      solutionCode: `CREATE VIEW paying_users AS SELECT DISTINCT u.id, u.name FROM users u JOIN orders o ON o.user_id = u.id WHERE o.status = 'paid';
CREATE VIEW user_spend AS SELECT u.id, u.name, ROUND(SUM(o.amount), 2) AS spent FROM users u JOIN orders o ON o.user_id = u.id WHERE o.status = 'paid' GROUP BY u.id, u.name;
CREATE VIEW signups_by_month AS SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS signups FROM users GROUP BY month;
CREATE VIEW duplicate_emails AS SELECT lower(email) AS email, COUNT(*) AS accounts FROM users GROUP BY lower(email) HAVING COUNT(*) > 1;`,
      testCases: [
        tc('tc-api-t1-1', 'Q1 · Exactly the users who paid', 'SELECT id, name FROM paying_users ORDER BY id'),
        tc('tc-api-t1-2', 'Q2 · Each user’s paid total', 'SELECT id, spent FROM user_spend ORDER BY id'),
        tc('tc-api-t1-3', 'Q3 · Sign-ups by month', 'SELECT month, signups FROM signups_by_month ORDER BY month'),
        tc('tc-api-t1-4', 'Q4 · The shared email, ignoring case', 'SELECT email, accounts FROM duplicate_emails ORDER BY email'),
      ],
      timeLimitMinutes: TASK_MINUTES,
      weight: TASK_WEIGHT,
    },
    programTask({
      id: 'api-t2',
      title: 'Request Handlers',
      language: 'javascript',
      prompt: `The data is { create, auth, routes, page }: requests to the tasks API.

Q1. Validate create.body for POST /tasks: title must be a string of 1 to 100 characters (not just spaces), priority one of low, medium or high. Print 201 if valid, otherwise 400 and the first bad field, checking title then priority (e.g. 400 title).
Q2. Authorise a DELETE /tasks/:id: auth.headers.authorization should be "Bearer <token>", and auth.tokens maps tokens to roles. Print 401 if the header or token is missing or unknown, 403 if the role isn't admin, 204 if it's allowed.
Q3. For each line of routes ("METHOD /path"), print the status on its own line: /tasks allows GET and POST; /tasks/:id allows GET and DELETE and needs a numeric id (400 if it isn't); a known path with another method is 405; any other path is 404; otherwise 200.
Q4. Paginate page.tasks with page.query (limit and offset, as text): limit defaults to 10 and is capped at 50, offset defaults to 0. Print the page's ids separated by commas, or 400 if limit isn't a whole number of at least 1 or offset isn't a whole number of at least 0.`,
      questions: ['validate the new task: 201 or 400 <field>', 'authorise the delete: 401, 403 or 204', 'a status per route line', 'the page of ids, or 400'],
      data: [
        ['right on the first requests', REQ_A],
        ['right on the second requests', REQ_B],
      ],
      expected: [(i) => validate(parse<Req>(i).create.body), (i) => authorise(parse<Req>(i).auth), (i) => parse<Req>(i).routes.map(route).join('\n'), (i) => pageOf(parse<Req>(i).page)],
      solution: `const [question, ...rest] = require('fs').readFileSync(0, 'utf8').split('\\n');
const d = JSON.parse(rest.join('\\n'));
if (question === 'q1') {
  const b = d.create.body;
  if (typeof b.title !== 'string' || b.title.trim().length < 1 || b.title.length > 100) console.log('400 title');
  else if (!['low', 'medium', 'high'].includes(String(b.priority))) console.log('400 priority');
  else console.log('201');
} else if (question === 'q2') {
  const m = /^Bearer (.+)$/.exec(d.auth.headers.authorization || '');
  if (!m || !d.auth.tokens[m[1]]) console.log('401');
  else console.log(d.auth.tokens[m[1]] === 'admin' ? '204' : '403');
} else if (question === 'q3') {
  for (const line of d.routes) {
    const [method, path] = line.split(' ');
    let s = '404';
    if (path === '/tasks') s = ['GET', 'POST'].includes(method) ? '200' : '405';
    else { const m = /^\\/tasks\\/([^/]+)$/.exec(path); if (m) s = !['GET', 'DELETE'].includes(method) ? '405' : /^\\d+$/.test(m[1]) ? '200' : '400'; }
    console.log(s);
  }
} else if (question === 'q4') {
  const q = d.page.query;
  const limit = q.limit === undefined ? 10 : Number(q.limit), offset = q.offset === undefined ? 0 : Number(q.offset);
  if (!Number.isInteger(limit) || !Number.isInteger(offset) || limit < 1 || offset < 0) console.log('400');
  else console.log(d.page.tasks.slice(offset, offset + Math.min(limit, 50)).join(','));
}
`,
    }),
  ],
});

export const SOFTWARE_DEV_MODULE_TESTS: AssessmentTest[] = [JS_TEST, DEBUG_TEST, DSA_TEST, API_TEST];
