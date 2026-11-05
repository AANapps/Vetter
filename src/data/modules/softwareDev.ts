import { AssessmentTest, Question } from '../../types';
import { caseStudy, choice, match, multi, order, short, written } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, codeTask, tagged } from './kit';
import { roleMain } from './roleKit';
import { caughtCase, correctCase, testCaseHarness } from '../roleTests';

// The software developer's fundamentals: the language, debugging, data structures, Git and code review (including
// AI-written code), then a project that fixes a broken feature, tests it and reviews an AI's patch. APIs and test
// writing already have tests (REST API design, API resilience, test case writing); they're tagged for developers in
// roleTracks.ts.

export const SOFTWARE_DEV_TESTS: AssessmentTest[] = [
  roleMain(
    'test-prog-01',
    'Programming Fundamentals: JavaScript',
    'Software Development',
    'Types, control flow, functions, objects and async code, with small working functions to write and run against tests.',
    ['JavaScript', 'Programming Fundamentals', 'Async', 'Error Handling'],
    ['Software Developer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer']
  ),
  roleMain(
    'test-debug-01',
    'Debugging: Find and Fix the Bug',
    'Software Development',
    'Read stack traces, reproduce and isolate bugs, and use logs and the debugger, then fix real broken functions until their tests pass.',
    ['Debugging', 'Stack Traces', 'Root Cause Analysis', 'JavaScript'],
    ['Software Developer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer']
  ),
  roleMain(
    'test-dsa-01',
    'Data Structures & Algorithms',
    'Algorithms',
    'Pick the right structure, reason about complexity and use the everyday algorithms, then write fast solutions to practical problems.',
    ['Data Structures', 'Algorithms', 'Big O', 'JavaScript'],
    ['Software Developer', 'Backend Engineer', 'Full Stack Engineer']
  ),
  roleMain(
    'test-git-01',
    'Git & Version Control',
    'Software Development',
    'Commits, branches, merges and pull requests, then real messes: a conflict, a secret pushed to main and a release that needs one fix.',
    ['Git', 'Version Control', 'Pull Requests', 'Branching'],
    ['Software Developer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer', 'Platform & DevOps']
  ),
  roleMain(
    'test-review-01',
    'Code Review & AI-Written Code',
    'Software Development',
    'Review for correctness, security and maintainability, then review AI-generated code that compiles, looks right and hides bugs.',
    ['Code Review', 'Security', 'AI-Assisted Coding', 'Clean Code'],
    ['Software Developer', 'Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer']
  ),
  roleMain(
    'test-sim-dev-01',
    'Software Developer Project: The Broken Discount',
    'Software Development',
    'A shop’s checkout is charging the wrong prices. Fix the feature, write tests that would have caught it, and review an AI assistant’s patch with hidden bugs.',
    ['Debugging', 'Unit Testing', 'Code Review', 'JavaScript'],
    ['Software Developer', 'Backend Engineer', 'Full Stack Engineer'],
    'Professional'
  ),
];

// A coding task that starts from the given (broken or partial) code rather than an empty function
const fixTask = (q: Question, starterCode: string): Question => ({ ...q, starterCode });

// ---------- Programming fundamentals ----------
export const PROGRAMMING_MODULE: ModuleSkeleton = {
  familyId: 'test-prog-01',
  aspects: [
    { id: 'basics', name: 'Types & Control Flow', summary: 'Values, comparisons, loops and conditions that behave as you expect.' },
    { id: 'functions', name: 'Functions, Objects & Arrays', summary: 'Writing and combining functions over everyday data.' },
    { id: 'async', name: 'Async & Errors', summary: 'Promises, await and errors that don’t vanish.' },
    { id: 'case', name: 'Coding Tasks', summary: 'Small, real functions, run against tests.' },
  ],
  tags: {},
  bank: [
    ...tagged('basics', B, short('m-pg-b-b1', 'String Plus Number', 'What does "5" + 3 give in JavaScript?', ['"53"', '53', "'53'"])),
    ...tagged(
      'basics',
      J,
      choice(
        'm-pg-b-j1',
        'Equality',
        'Which comparison is true in JavaScript?',
        ['0 == "" (loose equality converts types)', '0 === "" (strict equality)', 'null === undefined', '[] === []'],
        0
      )
    ),
    ...tagged(
      'basics',
      P,
      choice(
        'm-pg-b-p1',
        'Money in Floats',
        '0.1 + 0.2 === 0.3 is false. How should a shop store prices?',
        ['As whole pence (integers), formatting to pounds only for display', 'As floats, rounding when they look odd', 'As strings', 'It doesn’t matter'],
        0
      )
    ),
    ...tagged(
      'basics',
      S,
      choice(
        'm-pg-b-s1',
        'Mutating Shared State',
        'A function sorts the array it’s given with arr.sort() and returns it. Callers report their own lists changing order. Why?',
        ['sort() sorts in place, so it changes the caller’s array; copy first ([...arr].sort() or toSorted())', 'sort() is broken', 'JavaScript passes arrays by value', 'The callers sorted them'],
        0
      )
    ),
    ...tagged(
      'functions',
      B,
      choice(
        'm-pg-f-b1',
        'map or forEach?',
        'You want a new array of every price with VAT added. Which do you use?',
        ['map, which returns a new array', 'forEach, which returns a new array', 'filter', 'find'],
        0
      )
    ),
    ...tagged(
      'functions',
      J,
      short(
        'm-pg-f-j1',
        'Reduce',
        'What does [3, 5, 7].reduce((sum, n) => sum + n, 10) return?',
        ['25']
      )
    ),
    ...tagged(
      'functions',
      P,
      choice(
        'm-pg-f-p1',
        'Closures',
        'for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)); logs 3, 3, 3. What one change makes it log 0, 1, 2?',
        ['Use let instead of var, so each loop gets its own i', 'Use const instead of var', 'Add a semicolon', 'Use setInterval'],
        0
      )
    ),
    ...tagged(
      'functions',
      S,
      choice(
        'm-pg-f-s1',
        'Shallow Copies',
        'const copy = { ...order }; copy.items.push(newItem); — why does the original order change too?',
        ['Spread copies one level: items is still the same array; copy nested data too (e.g. structuredClone)', 'Spread doesn’t copy anything', 'push is broken', 'const prevents copying'],
        0
      )
    ),
    ...tagged(
      'async',
      B,
      choice(
        'm-pg-a-b1',
        'Forgot to Await',
        'const user = getUser(id); console.log(user.name); logs undefined. getUser is async. What’s missing?',
        ['await: user is a Promise, not the user', 'A semicolon', 'A try/catch', 'JSON.parse'],
        0
      )
    ),
    ...tagged(
      'async',
      J,
      choice(
        'm-pg-a-j1',
        'Three at Once',
        'You need three independent API calls and want them to run at the same time. What do you write?',
        ['await Promise.all([a(), b(), c()])', 'await a(); await b(); await c();', 'a(); b(); c(); with no await', 'setTimeout for each'],
        0
      )
    ),
    ...tagged(
      'async',
      P,
      choice(
        'm-pg-a-p1',
        'Swallowed Errors',
        'try { save(order) } catch (e) {} — save is async. What’s wrong?',
        ['Without await the rejection isn’t caught, and the empty catch hides any error; await it and handle or rethrow', 'Nothing', 'catch needs a finally', 'Async functions can’t throw'],
        0
      )
    ),
    ...tagged(
      'async',
      S,
      choice(
        'm-pg-a-s1',
        'One Failure in a Batch',
        'You send 200 emails with Promise.all. One fails and the batch reports failure, though 199 were sent. What do you use instead?',
        ['Promise.allSettled, then retry or report only the failures', 'Promise.race', 'A bigger timeout', 'Promise.all inside a try/catch is fine'],
        0
      )
    ),
    ...tagged(
      'case',
      B,
      codeTask(
        'm-pg-c-b1',
        'Count the Vowels',
        `Write 'function solution(text)' that returns how many vowels (a, e, i, o, u, either case) are in text.

Example: solution("Hello World") returns 3.`,
        'text',
        `function solution(text) {
  return (text.match(/[aeiou]/gi) || []).length;
}`,
        [
          ['Counts mixed case', '["Hello World"]', '3'],
          ['No vowels', '["rhythm"]', '0'],
          ['Empty text', '[""]', '0'],
          ['Upper-case vowels', '["AEIOU"]', '5'],
        ],
        { minutes: 5 }
      )
    ),
    ...tagged(
      'case',
      J,
      codeTask(
        'm-pg-c-j1',
        'Group Orders by Customer',
        `Write 'function solution(orders)'. orders is [{ customer, total }]. Return an object mapping each customer to the sum of their totals, rounded to 2 decimal places.

Example: solution([{ customer: "ana", total: 10 }, { customer: "ana", total: 5.5 }]) returns { ana: 15.5 }.`,
        'orders',
        `function solution(orders) {
  const out = {};
  for (const o of orders) out[o.customer] = (out[o.customer] || 0) + o.total;
  for (const k of Object.keys(out)) out[k] = Math.round(out[k] * 100) / 100;
  return out;
}`,
        [
          ['Sums per customer', '[[{"customer":"ana","total":10},{"customer":"ben","total":4},{"customer":"ana","total":5.5}]]', '{"ana":15.5,"ben":4}'],
          ['Rounds float noise', '[[{"customer":"cy","total":0.1},{"customer":"cy","total":0.2}]]', '{"cy":0.3}'],
          ['No orders', '[[]]', '{}'],
        ],
        { minutes: 7 }
      )
    ),
    ...tagged(
      'case',
      P,
      codeTask(
        'm-pg-c-p1',
        'Retry with Backoff',
        `Write 'function solution(attempts)', a pure function that plans retries for a flaky API.

attempts is the number of tries allowed. Return the list of waits in milliseconds before each retry: the first retry waits 100 ms, each later one doubles, and no wait is longer than 2,000 ms. There's no wait before the first try, so 1 attempt means [].

Example: solution(4) returns [100, 200, 400].`,
        'attempts',
        `function solution(attempts) {
  const waits = [];
  for (let i = 1; i < attempts; i++) waits.push(Math.min(100 * 2 ** (i - 1), 2000));
  return waits;
}`,
        [
          ['Doubles each time', '[4]', '[100,200,400]'],
          ['Caps at 2,000 ms', '[8]', '[100,200,400,800,1600,2000,2000]'],
          ['One attempt, no retries', '[1]', '[]'],
          ['Zero attempts', '[0]', '[]'],
        ],
        { minutes: 8 }
      )
    ),
    ...tagged(
      'case',
      S,
      codeTask(
        'm-pg-c-s1',
        'Parse a Price List',
        `Write 'function solution(csv)'. csv is a price list as text: a header line "sku,price", then one line per product. Some lines are messy.

Return { prices, errors }:
- prices: an object of sku → price in whole pence (an integer), for every valid line
- errors: the line numbers (counting the header as line 1) of lines that are invalid: wrong number of fields, an empty sku, or a price that isn't a non-negative number. Blank lines are skipped, not errors.
- Trim spaces around fields. If a sku appears twice, the later valid line wins.

Example: "sku,price\\nA1, 2.50\\nB2,abc" returns { prices: { A1: 250 }, errors: [3] }.`,
        'csv',
        `function solution(csv) {
  const prices = {};
  const errors = [];
  csv.split(/\\r?\\n/).forEach((line, i) => {
    if (i === 0 || line.trim() === '') return;
    const parts = line.split(',').map((p) => p.trim());
    const price = Number(parts[1]);
    if (parts.length !== 2 || !parts[0] || parts[1] === '' || !Number.isFinite(price) || price < 0) {
      errors.push(i + 1);
      return;
    }
    prices[parts[0]] = Math.round(price * 100);
  });
  return { prices, errors };
}`,
        [
          ['The example', '["sku,price\\nA1, 2.50\\nB2,abc"]', '{"prices":{"A1":250},"errors":[3]}'],
          ['Skips blank lines, rejects negatives and extra fields', '["sku,price\\nA1,1.10\\n\\nB2,-3\\nC3,4,5\\nD4,0.29"]', '{"prices":{"A1":110,"D4":29},"errors":[4,5]}'],
          ['Later duplicate wins', '["sku,price\\nA1,1\\nA1,2"]', '{"prices":{"A1":200},"errors":[]}'],
          ['Empty sku and empty price', '["sku,price\\n,5\\nB2,"]', '{"prices":{},"errors":[2,3]}'],
        ],
        { minutes: 12 }
      )
    ),
  ],
};

// ---------- Debugging ----------
export const DEBUGGING_MODULE: ModuleSkeleton = {
  familyId: 'test-debug-01',
  aspects: [
    { id: 'read', name: 'Reading Errors', summary: 'What a stack trace and an error message are telling you.' },
    { id: 'isolate', name: 'Reproducing & Isolating', summary: 'Making a bug happen on demand and narrowing it down.' },
    { id: 'tools', name: 'Logs & Tools', summary: 'Breakpoints, logs and history to find the cause fast.' },
    { id: 'case', name: 'Bug Hunts', summary: 'Broken functions to fix until their tests pass.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'read',
      B,
      choice(
        'm-db-r-b1',
        'Cannot Read Properties',
        'TypeError: Cannot read properties of undefined (reading \'email\') at sendReceipt (receipt.js:14). What does it mean?',
        ['On line 14 of receipt.js, something before .email is undefined, e.g. the user object', 'The email address is invalid', 'The email server is down', 'receipt.js is missing'],
        0
      )
    ),
    ...tagged(
      'read',
      J,
      choice(
        'm-db-r-j1',
        'Which Line?',
        `A stack trace reads:

TypeError: items.map is not a function
    at totalPrice (cart.js:22)
    at renderCart (cart.js:51)
    at onClick (button.js:8)

Where do you look first?`,
        ['cart.js line 22, then why items isn’t an array when renderCart calls it', 'button.js line 8', 'The map function’s source', 'The bottom of the trace only'],
        0
      )
    ),
    ...tagged(
      'read',
      P,
      choice(
        'm-db-r-p1',
        'An Error That Lies',
        'Production logs show “Request timed out” for checkout, but only when the basket has a gift card. What’s the best reading?',
        [
          'The timeout is a symptom; something in the gift-card path is slow or hangs, so trace that path rather than raising the timeout',
          'Raise the timeout',
          'The network is slow for gift-card users',
          'Gift cards are rare; ignore it',
        ],
        0
      )
    ),
    ...tagged(
      'read',
      S,
      choice(
        'm-db-r-s1',
        'Minified Traces',
        'Errors from the live site point at main.3f9a.js:1:48213. How do you make them useful?',
        ['Upload source maps to the error tracker (not to the public site), so traces map back to real files and lines', 'Turn off minification in production', 'Ask users what they clicked', 'Search the minified file by hand'],
        0
      )
    ),
    ...tagged(
      'isolate',
      B,
      choice(
        'm-db-i-b1',
        'First Step',
        'A user reports “the export button doesn’t work”. What do you do first?',
        ['Reproduce it: same steps, browser and data, and note exactly what happens', 'Rewrite the export', 'Close it as can’t-reproduce', 'Restart the server'],
        0
      )
    ),
    ...tagged(
      'isolate',
      J,
      order('m-db-i-j1', 'Fixing a Bug', 'Put these in order.', [
        'Reproduce the bug reliably',
        'Write a failing test that shows it',
        'Find the cause',
        'Fix it',
        'Watch the test pass, and run the rest',
      ])
    ),
    ...tagged(
      'isolate',
      P,
      choice(
        'm-db-i-p1',
        'It Broke Last Week',
        'A report that was right two weeks ago is wrong now, and 60 commits landed in between. Fastest way to find the cause?',
        ['git bisect: mark a good and a bad commit and test halfway points (about 6 steps)', 'Read all 60 commits', 'Revert everything', 'Ask everyone who committed'],
        0
      )
    ),
    ...tagged(
      'isolate',
      S,
      choice(
        'm-db-i-s1',
        'Only Sometimes',
        'A test fails about 1 run in 20, only in CI. What’s your approach?',
        [
          'Treat it as a real bug: run it many times to reproduce, look for shared state, time, ordering and async races, and quarantine it with a ticket rather than retrying it green',
          'Add a retry so it passes',
          'Delete the test',
          'Ignore it; it passes most of the time',
        ],
        0
      )
    ),
    ...tagged(
      'tools',
      B,
      choice(
        'm-db-t-b1',
        'A Breakpoint',
        'What does a breakpoint let you do?',
        ['Pause the code on a line and look at every variable’s value at that moment', 'Stop the program from crashing', 'Speed the code up', 'Delete a line'],
        0
      )
    ),
    ...tagged(
      'tools',
      J,
      multi(
        'm-db-t-j1',
        'A Good Log Line',
        'Which belong in an error log line for a failed payment? Tick all that apply.',
        ['A request or correlation ID', 'The order ID', 'The error message and code from the provider', 'The customer’s full card number'],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'tools',
      P,
      choice(
        'm-db-t-p1',
        'Following One Request',
        'A request passes through four services and fails somewhere. What lets you follow it?',
        ['A trace or correlation ID passed through every service and logged by each', 'Each service’s CPU graph', 'Restarting them one at a time', 'Reading each service’s code'],
        0
      )
    ),
    ...tagged(
      'tools',
      S,
      choice(
        'm-db-t-s1',
        'Debugging in Production',
        'A bug only happens with real production data. How do you investigate safely?',
        [
          'Add targeted logging or feature-flagged diagnostics, or reproduce with an anonymised copy of the data, without attaching a debugger to live servers',
          'Attach a debugger to the live server and pause it',
          'Copy the production database to your laptop',
          'Change code live on the server',
        ],
        0
      )
    ),
    ...tagged(
      'case',
      B,
      fixTask(
        codeTask(
          'm-db-c-b1',
          'Off by One',
          `This function should return the last 'n' items of a list, but it's wrong. Fix it.

Example: solution([1, 2, 3, 4], 2) returns [3, 4].`,
          'list, n',
          `function solution(list, n) {
  if (n <= 0) return [];
  return list.slice(Math.max(0, list.length - n));
}`,
          [
            ['Last two', '[[1,2,3,4],2]', '[3,4]'],
            ['More than the list has', '[[1,2],5]', '[1,2]'],
            ['Zero items', '[[1,2,3],0]', '[]'],
          ],
          { minutes: 5 }
        ),
        `function solution(list, n) {
  return list.slice(list.length - n - 1);
}`
      )
    ),
    ...tagged(
      'case',
      J,
      fixTask(
        codeTask(
          'm-db-c-j1',
          'Average Rating',
          `This returns the average star rating of reviews, to one decimal place, ignoring reviews with no rating (null). It returns wrong results. Fix it.

With no rated reviews it should return 0.

Example: solution([{ stars: 4 }, { stars: null }, { stars: 5 }]) returns 4.5.`,
          'reviews',
          `function solution(reviews) {
  const rated = reviews.filter((r) => r.stars !== null && r.stars !== undefined);
  if (rated.length === 0) return 0;
  const total = rated.reduce((sum, r) => sum + r.stars, 0);
  return Math.round((total / rated.length) * 10) / 10;
}`,
          [
            ['Ignores missing ratings', '[[{"stars":4},{"stars":null},{"stars":5}]]', '4.5'],
            ['No ratings at all', '[[{"stars":null}]]', '0'],
            ['Rounds to one decimal', '[[{"stars":5},{"stars":4},{"stars":4}]]', '4.3'],
            ['Empty list', '[[]]', '0'],
          ],
          { minutes: 7 }
        ),
        `function solution(reviews) {
  let total = 0;
  for (const r of reviews) {
    total += r.stars;
  }
  return Math.round(total / reviews.length);
}`
      )
    ),
    ...tagged(
      'case',
      P,
      fixTask(
        codeTask(
          'm-db-c-p1',
          'Booking Overlaps',
          `This should say whether a new booking [start, end) overlaps any existing booking. Times are minutes since midnight; a booking that ends at 600 doesn't overlap one starting at 600. It has bugs. Fix it.

Example: solution([[540, 600]], [570, 630]) returns true.`,
          'bookings, next',
          `function solution(bookings, next) {
  return bookings.some(([s, e]) => next[0] < e && s < next[1]);
}`,
          [
            ['Overlaps the end', '[[[540,600]],[570,630]]', 'true'],
            ['Touching is fine', '[[[540,600]],[600,660]]', 'false'],
            ['Inside a longer booking', '[[[480,720]],[540,600]]', 'true'],
            ['Wraps a shorter booking', '[[[540,560]],[500,700]]', 'true'],
            ['No bookings yet', '[[],[540,600]]', 'false'],
          ],
          { minutes: 8 }
        ),
        `function solution(bookings, next) {
  for (const [s, e] of bookings) {
    if (next[0] >= s && next[0] <= e) return true;
  }
  return false;
}`
      )
    ),
    ...tagged(
      'case',
      S,
      fixTask(
        codeTask(
          'm-db-c-s1',
          'Pagination Gone Wrong',
          `Customers say page 2 of their order history repeats or skips orders. This function returns one page of orders, newest first. 'orders' is [{ id, placedAt }] in any order, where placedAt is an ISO date string; several orders can share the same placedAt. page starts at 1. Fix it so pages never repeat or skip.

Sort by placedAt newest first, and by id descending when placedAt is the same.`,
          'orders, page, size',
          `function solution(orders, page, size) {
  const sorted = [...orders].sort((a, b) => (a.placedAt === b.placedAt ? b.id - a.id : a.placedAt < b.placedAt ? 1 : -1));
  const start = (page - 1) * size;
  return sorted.slice(start, start + size).map((o) => o.id);
}`,
          [
            ['Page 1', '[[{"id":1,"placedAt":"2026-01-01"},{"id":2,"placedAt":"2026-01-02"},{"id":3,"placedAt":"2026-01-02"},{"id":4,"placedAt":"2026-01-03"}],1,2]', '[4,3]'],
            ['Page 2 continues without repeats', '[[{"id":1,"placedAt":"2026-01-01"},{"id":2,"placedAt":"2026-01-02"},{"id":3,"placedAt":"2026-01-02"},{"id":4,"placedAt":"2026-01-03"}],2,2]', '[2,1]'],
            ['Does not change the caller’s list', '[[{"id":5,"placedAt":"2026-02-01"},{"id":6,"placedAt":"2026-02-02"}],1,1]', '[6]'],
            ['Past the end', '[[{"id":1,"placedAt":"2026-01-01"}],3,2]', '[]'],
          ],
          { minutes: 10 }
        ),
        `function solution(orders, page, size) {
  orders.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  const start = page * size;
  return orders.slice(start, start + size).map((o) => o.id);
}`
      )
    ),
  ],
};

// ---------- Data structures & algorithms ----------
export const DSA_MODULE: ModuleSkeleton = {
  familyId: 'test-dsa-01',
  aspects: [
    { id: 'structures', name: 'Choosing Structures', summary: 'Arrays, maps, sets, queues and trees: the right one for the job.' },
    { id: 'complexity', name: 'Complexity', summary: 'How code slows as data grows, and how to tell.' },
    { id: 'algorithms', name: 'Everyday Algorithms', summary: 'Sorting, searching, two pointers and graphs in real work.' },
    { id: 'case', name: 'Coding Problems', summary: 'Practical problems to solve fast, run against tests.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'structures',
      B,
      choice(
        'm-ds-s-b1',
        'Is It There?',
        'You check thousands of times whether a username is already taken. What do you keep the usernames in?',
        ['A Set, which checks membership in about constant time', 'An array, checked with includes', 'A string joined with commas', 'A sorted array, checked with indexOf'],
        0
      )
    ),
    ...tagged(
      'structures',
      J,
      match('m-ds-s-j1', 'Fit the Structure', 'Match each job to the structure that suits it.', [
        ['Undo history in an editor', 'Stack'],
        ['Jobs processed in the order they arrive', 'Queue'],
        ['Look up a product by its SKU', 'Hash map'],
        ['Always take the most urgent ticket next', 'Priority queue (heap)'],
      ])
    ),
    ...tagged(
      'structures',
      P,
      choice(
        'm-ds-s-p1',
        'A Cache with a Limit',
        'You need a cache of 1,000 items that throws out the least recently used one when full, with fast gets and sets. What’s the classic structure?',
        ['A hash map plus a doubly linked list (or a JavaScript Map, which keeps insertion order)', 'A sorted array', 'A binary search tree only', 'An array you scan each time'],
        0
      )
    ),
    ...tagged(
      'structures',
      S,
      choice(
        'm-ds-s-s1',
        'Prefix Search',
        'A search box must suggest product names as people type, from 2 million names, in milliseconds. What would you use?',
        ['A trie or a search index with prefix lookup, built once and kept in memory or in a search engine', 'filter over the array on each keystroke', 'A SQL LIKE "%text%" query per keystroke', 'A hash map of full names'],
        0
      )
    ),
    ...tagged(
      'complexity',
      B,
      choice(
        'm-ds-c-b1',
        'A Loop in a Loop',
        'A function compares every item in a list with every other item. If the list doubles, roughly how much longer does it take?',
        ['About four times as long (O(n²))', 'About twice as long', 'The same', 'About eight times'],
        0
      )
    ),
    ...tagged(
      'complexity',
      J,
      match('m-ds-c-j1', 'Name the Growth', 'Match each operation to its usual time complexity.', [
        ['Look up a key in a hash map', 'O(1)'],
        ['Binary search in a sorted array', 'O(log n)'],
        ['Find the largest value in an unsorted array', 'O(n)'],
        ['Sort an array with a good comparison sort', 'O(n log n)'],
      ])
    ),
    ...tagged(
      'complexity',
      P,
      choice(
        'm-ds-c-p1',
        'Hidden Quadratic',
        'for (const o of orders) { if (!seen.includes(o.id)) seen.push(o.id) } runs slowly on 100,000 orders. Why, and the fix?',
        ['includes scans the array each time, making it O(n²); use a Set', 'push is slow; preallocate', 'for…of is slow; use a while loop', 'It’s O(n) already'],
        0
      )
    ),
    ...tagged(
      'complexity',
      S,
      choice(
        'm-ds-c-s1',
        'Time or Memory?',
        'A job compares 50 million rows against a 10-million-row list and the server has 4 GB of memory. What’s the better plan?',
        ['Sort both and merge in a single pass, or do it in the database with an index, rather than loading 10 million keys into a hash set that may not fit', 'Load both into hash maps', 'Nested loops', 'Buy more memory first'],
        0
      )
    ),
    ...tagged(
      'algorithms',
      B,
      choice(
        'm-ds-a-b1',
        'Binary Search',
        'What does binary search need from the data?',
        ['That it’s sorted', 'That it’s small', 'That it has no duplicates', 'Nothing'],
        0
      )
    ),
    ...tagged(
      'algorithms',
      J,
      choice(
        'm-ds-a-j1',
        'Shortest Route',
        'In a map of stations where every hop takes the same time, how do you find the fewest hops between two stations?',
        ['Breadth-first search', 'Depth-first search', 'Sorting the stations', 'Binary search'],
        0
      )
    ),
    ...tagged(
      'algorithms',
      P,
      choice(
        'm-ds-a-p1',
        'Stable Sort',
        'You sort orders by date, then by customer. Customers’ orders must stay in date order. What must the second sort be?',
        ['Stable: it keeps equal items in their existing order (JavaScript’s sort is stable)', 'Fast', 'In place', 'Descending'],
        0
      )
    ),
    ...tagged(
      'algorithms',
      S,
      choice(
        'm-ds-a-s1',
        'Build Order',
        'Packages depend on other packages, and you must build each after its dependencies. Some teams accidentally add circular dependencies. What do you use?',
        ['A topological sort, which also detects cycles and can report them', 'Sort alphabetically', 'Breadth-first search from any package', 'Build them in the order they were added'],
        0
      )
    ),
    ...tagged(
      'case',
      B,
      codeTask(
        'm-ds-x-b1',
        'First Repeat',
        `Write 'function solution(ids)' that returns the first id that appears a second time, or null if none repeats. It should be fast for long lists.

Example: solution([4, 7, 2, 7, 4]) returns 7.`,
        'ids',
        `function solution(ids) {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
}`,
        [
          ['The example', '[[4,7,2,7,4]]', '7'],
          ['No repeats', '[[1,2,3]]', 'null'],
          ['Empty', '[[]]', 'null'],
          ['Strings work too', '[["a","b","a"]]', '"a"'],
        ],
        { minutes: 5 }
      )
    ),
    ...tagged(
      'case',
      J,
      codeTask(
        'm-ds-x-j1',
        'Top Sellers',
        `Write 'function solution(sales, k)'. sales is a list of product names, one per sale. Return the k best-selling products, most sales first; break ties alphabetically.

Example: solution(["tea","mug","tea","pen","mug","tea"], 2) returns ["tea","mug"].`,
        'sales, k',
        `function solution(sales, k) {
  const counts = new Map();
  for (const s of sales) counts.set(s, (counts.get(s) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, k).map(([name]) => name);
}`,
        [
          ['The example', '[["tea","mug","tea","pen","mug","tea"],2]', '["tea","mug"]'],
          ['Ties alphabetically', '[["b","a","c"],2]', '["a","b"]'],
          ['k larger than the list', '[["x"],3]', '["x"]'],
        ],
        { minutes: 8 }
      )
    ),
    ...tagged(
      'case',
      P,
      codeTask(
        'm-ds-x-p1',
        'Merge Time Slots',
        `Write 'function solution(slots)'. slots is a list of [start, end] busy times (minutes), in any order. Merge overlapping or touching slots and return them sorted.

Example: solution([[60, 90], [10, 30], [25, 40], [90, 100]]) returns [[10, 40], [60, 100]].`,
        'slots',
        `function solution(slots) {
  const sorted = [...slots].sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}`,
        [
          ['The example', '[[[60,90],[10,30],[25,40],[90,100]]]', '[[10,40],[60,100]]'],
          ['One slot inside another', '[[[0,100],[20,30]]]', '[[0,100]]'],
          ['Nothing to merge', '[[[50,60],[0,10]]]', '[[0,10],[50,60]]'],
          ['Empty', '[[]]', '[]'],
        ],
        { minutes: 10 }
      )
    ),
    ...tagged(
      'case',
      S,
      codeTask(
        'm-ds-x-s1',
        'Fewest Changes',
        `Write 'function solution(routes, from, to)'. routes is a list of [stationA, stationB] direct connections (both ways). Return the fewest hops from 'from' to 'to', or -1 if it can't be reached. A station to itself is 0.

Example: solution([["A","B"],["B","C"],["A","D"],["D","C"]], "A", "C") returns 2.`,
        'routes, from, to',
        `function solution(routes, from, to) {
  if (from === to) return 0;
  const next = new Map();
  for (const [a, b] of routes) {
    if (!next.has(a)) next.set(a, []);
    if (!next.has(b)) next.set(b, []);
    next.get(a).push(b);
    next.get(b).push(a);
  }
  const seen = new Set([from]);
  let frontier = [from];
  for (let hops = 1; frontier.length; hops++) {
    const following = [];
    for (const s of frontier) {
      for (const n of next.get(s) || []) {
        if (n === to) return hops;
        if (!seen.has(n)) {
          seen.add(n);
          following.push(n);
        }
      }
    }
    frontier = following;
  }
  return -1;
}`,
        [
          ['The example', '[[["A","B"],["B","C"],["A","D"],["D","C"]],"A","C"]', '2'],
          ['Unreachable', '[[["A","B"],["C","D"]],"A","D"]', '-1'],
          ['Same station', '[[["A","B"]],"A","A"]', '0'],
          ['Picks the short way round', '[[["A","B"],["B","C"],["C","D"],["D","E"],["A","E"]],"A","D"]', '2'],
        ],
        { minutes: 12 }
      )
    ),
  ],
};

// ---------- Git ----------
export const GIT_MODULE: ModuleSkeleton = {
  familyId: 'test-git-01',
  aspects: [
    { id: 'commits', name: 'Commits & History', summary: 'Saving work in clear steps, and reading what happened.' },
    { id: 'branches', name: 'Branches & Merging', summary: 'Working in parallel and bringing it back together.' },
    { id: 'recovery', name: 'Undoing & Recovery', summary: 'Getting out of a mess without losing anyone’s work.' },
    { id: 'case', name: 'Git Cases', summary: 'Real repository situations: what you’d run, and why.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'commits',
      B,
      order('m-gt-c-b1', 'Saving a Change', 'Put the steps to save a change to the shared repository in order.', [
        'Edit the file',
        'git add the file',
        'git commit -m "message"',
        'git push',
      ])
    ),
    ...tagged(
      'commits',
      J,
      choice(
        'm-gt-c-j1',
        'A Good Commit Message',
        'Which is the best commit message?',
        ['Fix VAT rounding on basket totals over £1,000', 'fixed stuff', 'WIP', 'Update basket.js'],
        0
      )
    ),
    ...tagged(
      'commits',
      P,
      choice(
        'm-gt-c-p1',
        'Who Changed This Line?',
        'A line of pricing code looks wrong and you want to know when and why it changed. What do you run?',
        ['git blame on the file (then git show on that commit)', 'git status', 'git diff', 'git stash'],
        0
      )
    ),
    ...tagged(
      'commits',
      S,
      choice(
        'm-gt-c-s1',
        'A Commit History That Helps',
        'What makes a team’s history most useful a year later?',
        ['Small commits that each do one thing and say why, linked to the ticket, so bisect, blame and reverts work cleanly', 'One big commit per release', 'Squashing everything into “update”', 'Never deleting branches'],
        0
      )
    ),
    ...tagged(
      'branches',
      B,
      choice(
        'm-gt-b-b1',
        'Why a Branch?',
        'Why make a branch for a new feature?',
        ['To work on it without changing main until it’s ready and reviewed', 'Branches make code faster', 'Git requires one per file', 'To back up main'],
        0
      )
    ),
    ...tagged(
      'branches',
      J,
      choice(
        'm-gt-b-j1',
        'A Merge Conflict',
        'git merge stops with a conflict in price.js. What do you do?',
        ['Open price.js, choose or combine the changes between the <<<<<<< and >>>>>>> markers, run the tests, then add and commit', 'Delete price.js', 'Run git merge again until it works', 'Push with --force'],
        0
      )
    ),
    ...tagged(
      'branches',
      P,
      choice(
        'm-gt-b-p1',
        'Rebase or Merge?',
        'Your feature branch is behind main. When is rebasing it on main a bad idea?',
        ['When others have already pulled your branch: rebasing rewrites its history under them', 'Never', 'When main has new commits', 'When the branch has tests'],
        0
      )
    ),
    ...tagged(
      'branches',
      S,
      choice(
        'm-gt-b-s1',
        'Long-lived Branches',
        'Feature branches live for six weeks and every merge is painful. What do you change?',
        ['Smaller branches merged within a day or two, with unfinished work behind feature flags', 'Merge less often', 'Freeze main while features finish', 'Give each developer a permanent branch'],
        0
      )
    ),
    ...tagged(
      'recovery',
      B,
      choice(
        'm-gt-r-b1',
        'Throw Away My Edits',
        'You’ve made a mess of one uncommitted file and want it back as it was at the last commit. What do you run?',
        ['git restore file.js', 'git push', 'git commit --amend', 'git branch -d'],
        0
      )
    ),
    ...tagged(
      'recovery',
      J,
      choice(
        'm-gt-r-j1',
        'Undo a Pushed Commit',
        'A commit already pushed to main broke the build. What’s the safe way to undo it?',
        ['git revert <commit>, which adds a new commit undoing it', 'git reset --hard and force-push main', 'Delete main', 'Edit the files back by hand without committing'],
        0
      )
    ),
    ...tagged(
      'recovery',
      P,
      choice(
        'm-gt-r-p1',
        'Lost Commits',
        'You ran git reset --hard and lost two commits you hadn’t pushed. Can you get them back?',
        ['Yes: git reflog shows where HEAD was; check out or reset to that commit', 'No, they’re gone', 'Only from a backup', 'Only if you pushed'],
        0
      )
    ),
    ...tagged(
      'recovery',
      S,
      choice(
        'm-gt-r-s1',
        'A Secret in History',
        'An API key was committed and pushed to the public repo three commits ago. What comes first?',
        ['Revoke and rotate the key now; then remove it from history and stop it recurring with secret scanning', 'Delete the file in a new commit', 'Make the repo private', 'Rewrite history and keep the key'],
        0
      )
    ),
    ...tagged('case', B, short('m-gt-x-b1', 'See the Changes', 'What command shows which files you’ve changed but not yet committed?', ['git status', 'status'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-gt-x-j',
        'The Conflict',
        `You merged main into your branch and git stopped:

<<<<<<< HEAD
const VAT_RATE = 0.2;
export const withVat = (pence) => Math.round(pence * (1 + VAT_RATE));
=======
const VAT_RATE = 0.2;
export const withVat = (pence) => Math.round(pence * 1.2);
export const vatOf = (pence) => withVat(pence) - pence;
>>>>>>> main

Your branch (HEAD) named the rate; main added vatOf.`,
        'price.js'
      ),
      written(
        'm-gt-x-j1',
        'Resolve It',
        'Write the resolved code, and the commands you’d run to finish the merge.',
        [
          'Keeps both changes: the named rate in withVat and main’s new vatOf',
          'Removes every conflict marker and the duplicate VAT_RATE line',
          'Runs the tests before committing',
          'Finishes with git add price.js and git commit (or git merge --continue)',
        ],
        `const VAT_RATE = 0.2;
export const withVat = (pence) => Math.round(pence * (1 + VAT_RATE));
export const vatOf = (pence) => withVat(pence) - pence;

Then: run the tests, git add price.js, git commit (or git merge --continue).`,
        { taskId: 'm-gt-x-j' }
      ),
      choice(
        'm-gt-x-j2',
        'Before Committing',
        'Why run the tests before committing the resolution?',
        ['A merge can be textually clean and still break behaviour when both sides’ changes combine', 'Git requires it', 'It speeds up the merge', 'It isn’t needed'],
        0,
        { taskId: 'm-gt-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-gt-x-p',
        'An AI’s Git Advice',
        `You asked an AI assistant: "I committed to main instead of my feature branch. I haven't pushed. How do I move the commit?"

It answered:
1. git checkout feature
2. git cherry-pick main
3. git checkout main
4. git reset --hard origin/main
5. git push --force

"This moves your commit to feature and cleans up main."`,
        'AI assistant’s answer'
      ),
      multi(
        'm-gt-x-p1',
        'What’s Wrong',
        'Which are real problems with the AI’s steps? Tick all that apply.',
        [
          'Step 5 force-pushes main, which is unnecessary (nothing was pushed) and could wipe teammates’ work',
          'Step 4 throws away any other unpushed work on main and uncommitted changes, with no warning',
          'It assumes the branch “feature” exists and is the right base',
          'cherry-pick can’t copy commits between branches',
        ],
        [0, 1, 2],
        { taskId: 'm-gt-x-p' }
      ),
      written(
        'm-gt-x-p2',
        'Your Steps',
        'Write safe steps to move the commit.',
        [
          'Checks state first (git status, git log) and stashes or commits any other work',
          'Gets the commit onto the feature branch (cherry-pick it, or create the branch from main)',
          'Resets local main back to origin/main only after the commit is safe on the branch',
          'No force-push to main',
        ],
        `git status and git log --oneline to confirm it's one commit and nothing else is uncommitted (stash if so). If the feature branch exists: git checkout feature, git cherry-pick <sha>. If it doesn't: git branch feature (it now has the commit). Then git checkout main and git reset --hard origin/main to put main back where the remote is. Nothing needs pushing to main, and certainly not with --force.`,
        { taskId: 'm-gt-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-gt-x-s',
        'One Fix for the Release',
        `Release 4.2 shipped from the tag v4.2.0. Main has since moved on 40 commits with half-finished features behind flags.

A payment bug is found in 4.2. Its fix is one commit on main, a1b2c3d, which also renamed a helper that only exists on main.

Customers need 4.2.1 today.`,
        'Situation'
      ),
      written(
        'm-gt-x-s1',
        'The Hotfix',
        'Write how you’d ship 4.2.1.',
        [
          'Branches from the v4.2.0 tag (e.g. release/4.2), not from main',
          'Cherry-picks a1b2c3d and adapts the conflict from the renamed helper, keeping only the fix',
          'Runs the tests and checks the fix on the release branch, then tags v4.2.1 and ships it',
          'Keeps main in sync (the fix is already there) and notes the process for next time',
        ],
        `Create release/4.2 from tag v4.2.0. Cherry-pick a1b2c3d; it will conflict where the helper was renamed, so resolve it by keeping the payment fix and using the old helper name. Run the test suite and a manual check of the payment path on that branch, then tag v4.2.1 and ship it. Main already has the fix, so nothing more is needed there. For next time: keep fix commits separate from refactors, so they cherry-pick cleanly.`,
        { taskId: 'm-gt-x-s' }
      ),
      choice(
        'm-gt-x-s2',
        'Not From Main',
        'Why not release 4.2.1 from main with the fix?',
        ['Main carries 40 unreleased commits, including unfinished features, that would ship untested with the fix', 'Main can’t be tagged', 'It would be slower', 'There’s no reason not to'],
        0,
        { taskId: 'm-gt-x-s' }
      )
    ),
  ],
};

// ---------- Code review ----------
const AI_SIGNUP = `// AI assistant's code for: "Add an endpoint that registers a user and sends a welcome email"
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const existing = await db.query(\`SELECT * FROM users WHERE email = '\${email}'\`);
  if (existing.length) return res.status(200).json({ error: 'Email taken' });
  const hash = crypto.createHash('md5').update(password).digest('hex');
  const user = await db.insert('users', { email, password: hash });
  sendWelcomeEmail(user.email);
  console.log('Registered', email, password);
  res.json(user);
});`;

export const REVIEW_MODULE: ModuleSkeleton = {
  familyId: 'test-review-01',
  aspects: [
    { id: 'correct', name: 'Correctness', summary: 'Does it do what it should, at the edges too?' },
    { id: 'security', name: 'Security', summary: 'Injection, secrets, auth and data exposure.' },
    { id: 'maintain', name: 'Readability & Maintainability', summary: 'Code the next person can safely change.' },
    { id: 'case', name: 'Reviewing AI Code', summary: 'AI-written changes that look right and aren’t.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'correct',
      B,
      choice(
        'm-rv-c-b1',
        'What to Check First',
        'You’re reviewing a pull request. What do you check first?',
        ['That it does what the ticket asks, including edge cases, and that tests cover it', 'Spacing and brace style', 'Whether you’d have named things differently', 'How many lines it adds'],
        0
      )
    ),
    ...tagged(
      'correct',
      J,
      choice(
        'm-rv-c-j1',
        'Spot the Edge',
        'const pct = (part, total) => Math.round((part / total) * 100); What should a reviewer ask about?',
        ['What happens when total is 0 (it returns NaN or Infinity)', 'Why it uses Math.round', 'Whether it should be a class', 'Nothing'],
        0
      )
    ),
    ...tagged(
      'correct',
      P,
      choice(
        'm-rv-c-p1',
        'A Race',
        'const stock = await getStock(id); if (stock > 0) await setStock(id, stock - 1); — two shoppers buy the last item at once. What happens and what’s the fix?',
        ['Both read 1 and both buy; make it atomic (a single UPDATE … WHERE stock > 0, or a lock)', 'The second one waits', 'Stock goes to −1 but it’s fine', 'Nothing; await prevents it'],
        0
      )
    ),
    ...tagged(
      'correct',
      S,
      choice(
        'm-rv-c-s1',
        'A Big Pull Request',
        'A pull request changes 2,400 lines across 60 files, mixing a refactor with a new feature. What do you do?',
        ['Ask for it to be split (refactor first, then the feature) so each can be reviewed properly', 'Approve it; it’s a lot of work', 'Review only the first few files', 'Reject it without comment'],
        0
      )
    ),
    ...tagged(
      'security',
      B,
      choice(
        'm-rv-s-b1',
        'A Key in the Code',
        'A pull request has const STRIPE_KEY = "sk_live_…" in the source. What do you ask?',
        ['Move it to configuration or a secrets manager, and rotate the key since it’s been shared', 'Rename the variable', 'Add a comment', 'Nothing; the repo is private'],
        0
      )
    ),
    ...tagged(
      'security',
      J,
      choice(
        'm-rv-s-j1',
        'SQL Injection',
        'db.query("SELECT * FROM orders WHERE id = " + req.params.id) — what’s the problem and the fix?',
        ['SQL injection: use a parameterised query', 'It’s slow: add an index', 'Use template strings instead', 'Nothing'],
        0
      )
    ),
    ...tagged(
      'security',
      P,
      choice(
        'm-rv-s-p1',
        'Whose Order?',
        'GET /orders/:id returns the order with that id for any logged-in user. What’s missing?',
        ['A check that the order belongs to the requesting user (otherwise anyone can read anyone’s orders by changing the id)', 'Rate limiting', 'Caching', 'Pagination'],
        0
      )
    ),
    ...tagged(
      'security',
      S,
      choice(
        'm-rv-s-s1',
        'A New Dependency',
        'A pull request adds a small npm package with 40 weekly downloads to format dates. What do you weigh up?',
        ['Who maintains it, its own dependencies and install scripts, the licence, and whether a well-known library or a few lines of code would do', 'Nothing; npm checks packages', 'Only its size', 'Whether it has a logo'],
        0
      )
    ),
    ...tagged(
      'maintain',
      B,
      choice(
        'm-rv-m-b1',
        'Naming',
        'Which name best explains itself?',
        ['isEligibleForFreeDelivery', 'flag2', 'doIt', 'x'],
        0
      )
    ),
    ...tagged(
      'maintain',
      J,
      choice(
        'm-rv-m-j1',
        'A Magic Number',
        'if (basket.total > 4999) applyFreeDelivery(); — what would you suggest?',
        ['Name it (e.g. FREE_DELIVERY_MIN_PENCE = 5000) and use >=, so the rule is clear and easy to change', 'Nothing', 'Add a comment saying 4999', 'Use a string'],
        0
      )
    ),
    ...tagged(
      'maintain',
      P,
      choice(
        'm-rv-m-p1',
        'A Kind, Useful Comment',
        'Which review comment is most useful?',
        [
          '“This retries forever if the API is down; could we cap it at 3 tries with backoff? Happy to pair on it.”',
          '“This is wrong.”',
          '“I wouldn’t do it like this.”',
          '“Why?”',
        ],
        0
      )
    ),
    ...tagged(
      'maintain',
      S,
      choice(
        'm-rv-m-s1',
        'Reviewing AI-Assisted Code',
        'Half the team’s pull requests are now largely AI-written. What should change in review?',
        [
          'The author must understand and explain every line; reviewers look harder at edge cases, invented APIs, security and tests that only test the happy path',
          'Review less, since AI code is tested',
          'Ban AI tools',
          'Only review human-written lines',
        ],
        0
      )
    ),
    ...tagged(
      'case',
      B,
      multi(
        'm-rv-x-b1',
        'Quick Review',
        `function applyCoupon(total, coupon) {
  if (coupon = 'HALF') return total / 2;
  return total;
}

What’s wrong? Tick all that apply.`,
        ['= assigns instead of comparing, so every coupon halves the price', 'It should be === \'HALF\'', 'Functions can’t take two arguments', 'Nothing'],
        [0, 1]
      )
    ),
    ...tagged(
      'case',
      J,
      caseStudy('m-rv-x-j', 'An AI-Written Endpoint', AI_SIGNUP, 'Pull request'),
      multi(
        'm-rv-x-j1',
        'The Problems',
        'Which are real problems? Tick all that apply.',
        [
          'The email is pasted into SQL: injection',
          'MD5 with no salt is not safe for passwords; use bcrypt, scrypt or argon2',
          'It logs the plain-text password',
          'It returns the user, including the password hash, to the client',
          '“Email taken” comes back with status 200',
          'async functions can’t call db.query',
        ],
        [0, 1, 2, 3, 4],
        { taskId: 'm-rv-x-j' }
      ),
      written(
        'm-rv-x-j2',
        'Your Review',
        'Write the review comments you’d leave on this pull request.',
        [
          'Blocks on security: parameterised query, a proper password hash, no password in logs, no hash in the response',
          'Asks for the right status (409 for a taken email) and input validation',
          'Asks what happens if the welcome email fails (not awaited, unhandled) and for tests',
          'Written constructively and specifically, so the author knows what to change',
        ],
        `Requesting changes, mostly security:
1. The query interpolates email: use a parameterised query (WHERE email = $1).
2. MD5 isn't safe for passwords; use bcrypt/argon2 with a salt.
3. Please remove the console.log: it writes passwords to our logs.
4. res.json(user) sends the hash back; return only id and email.
5. A taken email should be 409, not 200 with an error.
6. sendWelcomeEmail isn't awaited or caught; if it throws we get an unhandled rejection. Await it in a try/catch (or queue it) so registration still succeeds.
7. Validate email and password length, and add tests for the taken-email and bad-input paths.`,
        { taskId: 'm-rv-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      fixTask(
        codeTask(
          'm-rv-x-p1',
          'Fix the AI’s Function',
          `An AI assistant wrote this to split a bill between friends. It "works on the example", but reviewers found bugs. The rules:

- amountPence is the bill in whole pence; people is how many share it (at least 1)
- Return each person's share in pence as an array; shares must add up exactly to the bill
- Any leftover pence go one each to the first people in the list

Example: solution(1000, 3) returns [334, 333, 333]. Fix the code.`,
          'amountPence, people',
          `function solution(amountPence, people) {
  const base = Math.floor(amountPence / people);
  const extra = amountPence - base * people;
  return Array.from({ length: people }, (_, i) => base + (i < extra ? 1 : 0));
}`,
          [
            ['The example', '[1000,3]', '[334,333,333]'],
            ['Splits evenly', '[900,3]', '[300,300,300]'],
            ['One person pays it all', '[1999,1]', '[1999]'],
            ['Several leftover pence', '[1003,4]', '[251,251,251,250]'],
          ],
          { minutes: 8 }
        ),
        `// AI assistant's answer
function solution(amountPence, people) {
  const share = Math.round(amountPence / people);
  return new Array(people).fill(share);
}`
      ),
      written(
        'm-rv-x-p2',
        'What the AI Missed',
        'In a sentence or two each, explain what was wrong with the AI’s version and how you’d stop this kind of bug getting through again.',
        [
          'Math.round gives shares that don’t add up to the bill (e.g. 1000/3 → 333 × 3 = 999, 1003/4 → 251 × 4 = 1004)',
          'It ignored the leftover-pence rule from the spec',
          'Proposes a test that checks shares always sum to the bill, across many amounts (a property test)',
          'Notes that “works on the example” isn’t enough review for AI code',
        ],
        `Rounding every share the same way means the shares don't add up: 1,000 between 3 is 333 each, so a penny vanishes; 1,003 between 4 rounds to 251 each, a penny too many. It also ignored the spec's rule that leftover pennies go to the first people. To catch this next time: a test that, for hundreds of random amounts and group sizes, checks the shares sum exactly to the bill and differ by at most a penny. AI code that passes the one example in the prompt still needs tests from the spec.`,
        { taskId: 'm-rv-x-p1' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-rv-x-s',
        'An AI-Written Cache',
        `An AI assistant added caching to the product API to cut database load:

const cache = {};
app.get('/products/:id', async (req, res) => {
  if (cache[req.params.id]) return res.json(cache[req.params.id]);
  const product = await db.getProduct(req.params.id, { currency: req.user.currency });
  cache[req.params.id] = product;
  res.json(product);
});

The API runs on 6 servers behind a load balancer. Prices change several times a day, and products are shown in the shopper's own currency.`,
        'Pull request'
      ),
      multi(
        'm-rv-x-s1',
        'The Hidden Bugs',
        'Which are real problems? Tick all that apply.',
        [
          'The cache key ignores currency, so a shopper can see another shopper’s currency and price',
          'Nothing expires, so price changes never reach customers until a restart',
          'The cache grows without limit as more products are viewed',
          'Each of the 6 servers has its own copy, so shoppers see different prices depending on the server',
          'Missing products (null) aren’t cached, which is a bug',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-rv-x-s' }
      ),
      written(
        'm-rv-x-s2',
        'Your Recommendation',
        'Write your review: what must change before this ships, and the design you’d suggest.',
        [
          'Key by product and currency (or cache the base price and convert per request)',
          'Expire entries (a TTL) and/or invalidate them when prices change',
          'Bound the size (an LRU) or use a shared cache such as Redis so all servers agree',
          'Asks for tests and a measurement of the load problem first, so the fix is sized to it',
        ],
        `Not ready. The key is only the product id, but the response depends on currency, so a shopper in euros can get a cached dollar price. Entries never expire, so price changes don't reach anyone, and every server keeps its own unbounded copy, so six servers can show six prices. I'd cache the base product (without currency) in a shared cache like Redis with a short TTL, delete the entry when a price is updated, and convert to the shopper's currency per request. Can we also measure the database load we're solving for, and add tests for the currency and price-change cases?`,
        { taskId: 'm-rv-x-s' }
      )
    ),
  ],
};

// ---------- Software developer final project ----------
const SHOP_BRIEF = `You've joined Northwind Kitchenware's small dev team. Since Monday's release, customers say checkout charges the wrong price when they use a discount code.

The pricing rules (from the product owner):
- Prices are in whole pence
- "TENOFF" takes 10% off the basket subtotal
- "FIVER" takes £5 (500p) off baskets of £30 (3000p) or more
- Codes aren't case-sensitive; an unknown code changes nothing
- Discounts never take the total below 0
- Delivery is 399p, free when the subtotal after discount is 5000p or more; delivery is never discounted
- Round any fraction of a penny down`;

const BROKEN_CHECKOUT = `function solution(items, code) {
  // items: [{ price, qty }] in pence
  let subtotal = 0;
  for (let i = 0; i <= items.length; i++) subtotal += items[i]?.price * items[i]?.qty || 0;
  let discount = 0;
  if (code == 'TENOFF') discount = subtotal * 0.1;
  if (code == 'FIVER' && subtotal > 3000) discount = 500;
  const delivery = subtotal >= 5000 ? 0 : 399;
  return Math.round(subtotal + delivery - discount);
}`;

export const DEV_SIM_MODULE: ModuleSkeleton = {
  familyId: 'test-sim-dev-01',
  aspects: [
    { id: 'fix', name: 'Fixing the Feature', summary: 'Finding why checkout is wrong and fixing it to the rules.' },
    { id: 'tests', name: 'Writing Tests', summary: 'Tests that would have caught it, and will catch the next one.' },
    { id: 'review', name: 'Reviewing AI Code', summary: 'An AI assistant’s patch that looks right and isn’t.' },
    { id: 'case', name: 'The Checkout', summary: 'Northwind’s pricing code, start to finish.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'fix',
      B,
      choice(
        'm-dvs-f-b1',
        'Start Here',
        'Customers say checkout is wrong with discount codes. What do you do first?',
        ['Reproduce it with a real basket and code, and compare the result with the rules', 'Rewrite checkout', 'Roll back every release this month', 'Turn off discount codes for good'],
        0
      )
    ),
    ...tagged(
      'fix',
      J,
      choice(
        'm-dvs-f-j1',
        'A Case to Try',
        'Which basket best tests the FIVER rule’s edge?',
        ['A subtotal of exactly 3000p with FIVER', 'A subtotal of 10,000p with FIVER', 'An empty basket with no code', 'A subtotal of 2000p with TENOFF'],
        0
      )
    ),
    ...tagged(
      'fix',
      P,
      choice(
        'm-dvs-f-p1',
        'While You’re In There',
        'While fixing the discount you notice the shipping code is messy but works. What do you do?',
        ['Fix the bug in this change; raise the clean-up separately so the fix stays small and easy to review', 'Rewrite shipping in the same change', 'Leave a comment saying it’s bad', 'Ignore it forever'],
        0
      )
    ),
    ...tagged(
      'fix',
      S,
      choice(
        'm-dvs-f-s1',
        'Customers Already Overcharged',
        'The bug has been live since Monday. Beyond the fix, what should happen?',
        ['Work out which orders were overcharged from the order data, tell the product owner, and refund or credit them; then add the missing tests', 'Nothing; it’s fixed now', 'Quietly fix it', 'Wait for complaints'],
        0
      )
    ),
    ...tagged(
      'tests',
      B,
      choice(
        'm-dvs-t-b1',
        'What a Unit Test Is',
        'What does a unit test do?',
        ['Runs a small piece of code with known inputs and checks the output is what it should be', 'Tests the whole site in a browser', 'Measures speed', 'Checks the code style'],
        0
      )
    ),
    ...tagged(
      'tests',
      J,
      multi(
        'm-dvs-t-j1',
        'Cases Worth Writing',
        'Which cases should the checkout tests cover? Tick all that apply.',
        ['FIVER at exactly 3000p', 'A lower-case code', 'A discount that would take the total below 0', 'Delivery right at the 5000p threshold after discount', 'The same basket twice'],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'tests',
      P,
      choice(
        'm-dvs-t-p1',
        'A Test That Proves Nothing',
        'expect(checkout(items, code)).toBe(checkout(items, code)) — what’s wrong with this test?',
        ['It compares the function with itself, so it passes whatever the code does; assert a known expected value', 'Nothing', 'toBe should be toEqual', 'It’s too short'],
        0
      )
    ),
    ...tagged(
      'tests',
      S,
      choice(
        'm-dvs-t-s1',
        'Stopping It Shipping Again',
        'How do you make sure a pricing bug like this can’t ship again?',
        ['Pricing tests from the rules run in CI on every pull request and block merging when they fail', 'A manual check before each release', 'Ask reviewers to be careful', 'Test in production'],
        0
      )
    ),
    ...tagged(
      'review',
      B,
      choice(
        'm-dvs-r-b1',
        'Trusting AI Code',
        'An AI assistant offers a fix that passes the one example you gave it. Is it ready?',
        ['Not yet: check it against every rule and edge case, and run the tests', 'Yes', 'Yes, AI code is tested', 'Only if it’s short'],
        0
      )
    ),
    ...tagged(
      'review',
      J,
      choice(
        'm-dvs-r-j1',
        'Invented APIs',
        'An AI patch calls items.sumBy("price"). The tests weren’t run. What’s the likely problem?',
        ['Arrays have no sumBy method: AI tools sometimes invent functions, so it will throw', 'It’s a fast built-in', 'It needs an import from Math', 'Nothing'],
        0
      )
    ),
    ...tagged(
      'review',
      P,
      choice(
        'm-dvs-r-p1',
        'A Confident Explanation',
        'The AI’s patch comes with a confident explanation that it “handles all edge cases”. How much weight does that carry?',
        ['None on its own: check the code and tests yourself', 'A lot', 'It means it was tested', 'It’s a guarantee'],
        0
      )
    ),
    ...tagged(
      'review',
      S,
      choice(
        'm-dvs-r-s1',
        'AI Patches in the Team',
        'What team rule makes AI-written patches safe to merge?',
        ['The same bar as any code: the author can explain it, it has tests from the spec, and it gets a human review', 'Merge if it compiles', 'AI patches skip review to save time', 'Only seniors may use AI'],
        0
      )
    ),
    ...tagged('case', B, short('m-dvs-x-b1', 'TENOFF', 'A basket comes to 4,000p. With TENOFF, what is the discount in pence?', ['400', '400p'])),
    ...tagged(
      'case',
      J,
      caseStudy('m-dvs-x-j', 'Northwind’s Checkout', `${SHOP_BRIEF}\n\nThe current code:\n\n${BROKEN_CHECKOUT}`, 'Brief and code'),
      multi(
        'm-dvs-x-j1',
        'The Bugs',
        'Which are real bugs against the rules? Tick all that apply.',
        [
          'Codes are compared case-sensitively',
          'FIVER uses > 3000 instead of >= 3000',
          'Free delivery checks the subtotal before the discount, not after',
          'It rounds to the nearest penny instead of down',
          'Delivery is 399p',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-dvs-x-j' }
      ),
      fixTask(
        codeTask(
          'm-dvs-x-j2',
          'Fix Checkout',
          `Fix the checkout (shown in the brief) so it follows every rule. solution(items, code) returns the total to charge in pence.

items is [{ price, qty }]; code may be a string, empty or missing.`,
          'items, code',
          `function solution(items, code) {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const c = String(code || '').toUpperCase();
  let discount = 0;
  if (c === 'TENOFF') discount = Math.floor(subtotal * 0.1);
  else if (c === 'FIVER' && subtotal >= 3000) discount = 500;
  const goods = Math.max(0, subtotal - discount);
  const delivery = goods >= 5000 ? 0 : 399;
  return goods + delivery;
}`,
          [
            ['FIVER at exactly 3000p', '[[{"price":1500,"qty":2}],"FIVER"]', '2899'],
            ['Lower-case code', '[[{"price":2000,"qty":1}],"tenoff"]', '2199'],
            ['Delivery judged after the discount', '[[{"price":5200,"qty":1}],"FIVER"]', '5099'],
            ['Pennies round down', '[[{"price":1999,"qty":1}],"TENOFF"]', '2199'],
            ['No code, free delivery', '[[{"price":2500,"qty":2}],""]', '5000'],
            ['Unknown code', '[[{"price":1000,"qty":1}],"BOGUS"]', '1399'],
          ],
          { minutes: 12, weight: 30 }
        ),
        BROKEN_CHECKOUT
      )
    ),
    ...tagged(
      'case',
      P,
      {
        id: 'm-dvs-x-p1',
        title: 'Tests That Catch It',
        type: 'code',
        prompt: `Write test cases for Northwind's checkout(items, code), following the pricing rules:

- Prices are in whole pence; "TENOFF" takes 10% off the subtotal, rounded down
- "FIVER" takes 500p off subtotals of 3000p or more
- Codes aren't case-sensitive; an unknown code changes nothing
- Delivery is 399p, free when the subtotal after discount is 5000p or more

Return an array of cases, each [items, code, expected total]. Every case must pass on a correct checkout; you score for each hidden broken version your cases catch.`,
        starterCode: `function solution() {
  return [
    [[{ price: 1000, qty: 1 }], '', 1399],
    // more cases...
  ];
}`,
        harness: testCaseHarness(`
  correct: (items, code) => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const c = String(code || '').toUpperCase();
    let discount = 0;
    if (c === 'TENOFF') discount = Math.floor(subtotal * 0.1);
    else if (c === 'FIVER' && subtotal >= 3000) discount = 500;
    const goods = Math.max(0, subtotal - discount);
    return goods + (goods >= 5000 ? 0 : 399);
  },
  caseSensitive: (items, code) => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const c = String(code || '');
    let discount = 0;
    if (c === 'TENOFF') discount = Math.floor(subtotal * 0.1);
    else if (c === 'FIVER' && subtotal >= 3000) discount = 500;
    const goods = Math.max(0, subtotal - discount);
    return goods + (goods >= 5000 ? 0 : 399);
  },
  fiverExclusive: (items, code) => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const c = String(code || '').toUpperCase();
    let discount = 0;
    if (c === 'TENOFF') discount = Math.floor(subtotal * 0.1);
    else if (c === 'FIVER' && subtotal > 3000) discount = 500;
    const goods = Math.max(0, subtotal - discount);
    return goods + (goods >= 5000 ? 0 : 399);
  },
  deliveryBeforeDiscount: (items, code) => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const c = String(code || '').toUpperCase();
    let discount = 0;
    if (c === 'TENOFF') discount = Math.floor(subtotal * 0.1);
    else if (c === 'FIVER' && subtotal >= 3000) discount = 500;
    const goods = Math.max(0, subtotal - discount);
    return goods + (subtotal >= 5000 ? 0 : 399);
  },
  roundsNearest: (items, code) => {
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const c = String(code || '').toUpperCase();
    let discount = 0;
    if (c === 'TENOFF') discount = Math.round(subtotal * 0.1);
    else if (c === 'FIVER' && subtotal >= 3000) discount = 500;
    const goods = Math.max(0, subtotal - discount);
    return goods + (goods >= 5000 ? 0 : 399);
  },
  ignoresQty: (items, code) => {
    const subtotal = items.reduce((s, i) => s + i.price, 0);
    const c = String(code || '').toUpperCase();
    let discount = 0;
    if (c === 'TENOFF') discount = Math.floor(subtotal * 0.1);
    else if (c === 'FIVER' && subtotal >= 3000) discount = 500;
    const goods = Math.max(0, subtotal - discount);
    return goods + (goods >= 5000 ? 0 : 399);
  },`),
        testCases: [
          correctCase('tc-dvs-1', 'Your cases pass on a correct checkout'),
          caughtCase('tc-dvs-2', 'caseSensitive', 'Catches a bug: lower-case codes ignored'),
          caughtCase('tc-dvs-3', 'fiverExclusive', 'Catches a bug at the FIVER minimum'),
          caughtCase('tc-dvs-4', 'deliveryBeforeDiscount', 'Catches a bug: free delivery judged before the discount'),
          caughtCase('tc-dvs-5', 'roundsNearest', 'Catches a bug: pennies rounded to nearest'),
          caughtCase('tc-dvs-6', 'ignoresQty', 'Catches a bug: quantities ignored'),
        ],
        timeLimitMinutes: 10,
        weight: 30,
      },
      caseStudy(
        'm-dvs-x-p',
        'The AI’s Patch',
        `Before you fixed it, a colleague asked an AI assistant to fix checkout. It suggested:

function checkout(items, code) {
  const subtotal = items.sumBy('price');
  code = code.toUpperCase();
  let discount = 0;
  if (code === 'TENOFF') discount = Math.floor(subtotal * 0.1);
  if (code === 'FIVER' && subtotal >= 3000) discount = 500;
  const total = subtotal - discount;
  return total + (total > 5000 ? 0 : 399);
}

"This fixes the case-sensitivity and threshold bugs and handles all edge cases."`,
        'AI assistant’s patch'
      ),
      multi(
        'm-dvs-x-p2',
        'What the AI Got Wrong',
        'Which are real problems with the AI’s patch? Tick all that apply.',
        [
          'Arrays have no sumBy method, so it throws',
          'Even with a sum, it ignores qty',
          'code.toUpperCase() throws when there’s no code',
          'Free delivery uses > 5000 instead of >= 5000',
          'It uses Math.floor for TENOFF',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-dvs-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-dvs-x-s',
        'Monday to Thursday',
        `The broken checkout was live from Monday 09:00 to Thursday 15:00. Order data for that window:

Orders with a discount code        1,240
  …with a lower-case code            310 (discount not applied)
  …FIVER at exactly 3000p             45 (discount not applied)
  …free delivery wrongly given        60 (customer undercharged 399p each)

The product owner asks you for the impact and a plan.`,
        'Order data'
      ),
      short(
        'm-dvs-x-s1',
        'Undercharged',
        'How much, in pence, were customers undercharged in total through wrongly free delivery?',
        ['23940', '23,940', '23940p', '£239.40'],
        { taskId: 'm-dvs-x-s' }
      ),
      written(
        'm-dvs-x-s2',
        'Impact and Plan',
        'Write your note to the product owner: the impact, what you’d do for customers, and what changes in how the team works.',
        [
          'Summarises the impact: 355 customers overcharged (310 + 45) and 60 orders undercharged by £239.40 in total',
          'Recommends refunding or crediting the overcharged customers, worked out exactly from order data, and absorbing the undercharge rather than chasing customers',
          'Confirms the fix is live with tests from the pricing rules running in CI',
          'Proposes process changes, e.g. pricing rules as tests, review of AI-written patches, and a check on discount usage after each release',
        ],
        `Impact (Mon 09:00 – Thu 15:00): 355 customers paid more than they should — 310 whose lower-case code was ignored and 45 using FIVER at exactly £30. 60 got free delivery they weren't due, £239.40 in all. Plan: I'll pull the exact overcharge per order and we refund it automatically with an apology email; I'd absorb the £239.40 rather than chase customers. The fix is live, and the pricing rules are now tests that run on every pull request. To stop a repeat: any change to pricing needs those tests to pass and a review that checks AI-suggested code against the rules, and we'll watch discount usage for a day after each release.`,
        { taskId: 'm-dvs-x-s' }
      )
    ),
  ],
};

export const SOFTWARE_DEV_MODULES = [PROGRAMMING_MODULE, DEBUGGING_MODULE, DSA_MODULE, GIT_MODULE, REVIEW_MODULE, DEV_SIM_MODULE];
