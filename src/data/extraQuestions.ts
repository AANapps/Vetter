import { Question } from '../types';
import { choice, match, multi, order, written } from './questionKit';

/**
 * Questions that top Vetter's hands-on tests up to ten: the fundamentals behind the tasks, and real problems the
 * candidate has to think through. Keyed by test family (a test's familyId, or its id); every level of a family draws
 * from the same list, in order, for as many as it needs.
 */
export const EXTRA_QUESTIONS: Record<string, Question[]> = {
  // ---------- SQL for backend developers ----------
  'test-sql-01': [
    order('x-sql-1', 'How a Query Runs', 'Put these clauses in the order the database applies them.', ['FROM / JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY', 'LIMIT']),
    choice(
      'x-sql-2',
      'Empty Departments',
      'You LEFT JOIN departments to employees and use COUNT(*) per department. What does a department with no employees show?',
      ['0', '1, because the joined row still counts; use COUNT(employees.id)', 'NULL', 'It’s left out'],
      1
    ),
    multi(
      'x-sql-3',
      'NULLs',
      'Some salaries are NULL. Which are true? Tick all that apply.',
      ['WHERE salary = NULL returns no rows', 'AVG(salary) ignores the NULLs', 'COUNT(*) counts rows with a NULL salary', 'COUNT(salary) counts NULL salaries', 'NULL = NULL is true'],
      [0, 1, 2]
    ),
    match('x-sql-4', 'Window Functions', 'Match each function to what it gives for salaries 90, 90, 80.', [
      ['ROW_NUMBER()', '1, 2, 3'],
      ['RANK()', '1, 1, 3'],
      ['DENSE_RANK()', '1, 1, 2'],
      ['LAG(salary)', 'The previous row’s salary'],
      ['SUM(salary) OVER (ORDER BY …)', 'A running total'],
    ]),
    written(
      'x-sql-5',
      'Revenue Doubled Overnight',
      'After a release that added a JOIN to order_items, the revenue report doubled overnight. Sales didn’t. What happened, and how do you prove and fix it?',
      [
        'Join fan-out: each order now appears once per item, so SUM(amount) counts it several times',
        'Proves it, e.g. COUNT(*) against COUNT(DISTINCT orders.id), or comparing one order before and after the join',
        'Fixes it by aggregating items first (subquery or CTE) or summing at the right grain',
        'Adds a check that would catch it again, e.g. reconcile the report against a known total',
      ],
      `The join repeats each order once per item, so SUM(orders.amount) counts an order with three items three times. Comparing COUNT(*) with COUNT(DISTINCT orders.id) shows the extra rows. Fix: aggregate order_items in a CTE to one row per order, then join. Add a test that reconciles the report total with the plain sum of orders.`
    ),
    choice(
      'x-sql-6',
      'A Slow Lookup',
      'SELECT * FROM orders WHERE client_id = 42 takes 3 seconds on 20 million rows. What do you check first?',
      ['Whether client_id has an index (EXPLAIN shows a full scan)', 'The server’s RAM', 'Rewriting it as a subquery', 'Switching to a different database'],
      0
    ),
    choice(
      'x-sql-7',
      'WHERE or HAVING',
      'To keep only departments whose average salary is over 100,000, where does the condition go?',
      ['WHERE, before GROUP BY', 'HAVING, after GROUP BY', 'In the SELECT list', 'ORDER BY'],
      1
    ),
  ],

  // ---------- SQL for testers ----------
  'test-qasql-01': [
    choice(
      'x-qasql-1',
      'Zero Rows',
      'Your check for broken orders returns 0 rows. What does that prove?',
      ['The data is clean', 'Only that nothing broke the rule today; check the query does catch a known bad row', 'The query has a bug', 'The constraint is enforced'],
      1
    ),
    multi(
      'x-qasql-2',
      'Let the Database Catch It',
      'Which of these bugs could a database constraint have stopped on its own? Tick all that apply.',
      ['Two accounts with the same email', 'Order items pointing at an order that doesn’t exist', 'An order total that doesn’t match its items', 'A pending order with a shipped date', 'A customer typing the wrong address'],
      [0, 1, 3]
    ),
    match('x-qasql-3', 'Kinds of Test', 'Match each kind of test to what it checks.', [
      ['Unit test', 'One function on its own'],
      ['Integration test', 'Parts working together, like the API and database'],
      ['End-to-end test', 'A whole user journey through the UI'],
      ['Regression test', 'Old bugs stay fixed'],
      ['Smoke test', 'The critical paths work at all'],
    ]),
    written(
      'x-qasql-4',
      'Write the Bug Report',
      'Your query found 12 orders whose total doesn’t match their items. Write the bug report.',
      [
        'A clear title that names the problem',
        'How to reproduce: the query, and at least one order id',
        'Expected against actual, with real amounts',
        'Impact: how many orders, how much money, whether customers were charged wrongly',
        'Severity, and a lead on the cause (e.g. rounding, discounts, items edited after ordering)',
      ],
      `Title: 12 order totals don't match the sum of their items. Repro: run the attached query on production; e.g. order 1043 total £58.40, items sum to £61.90. Impact: 12 orders since 3 March, £41.20 undercharged in total; customers were billed the stored total. Severity: high (revenue). Lead: all 12 used a discount code, so check how discounts are applied to totals.`
    ),
    order('x-qasql-5', 'Chasing a Data Bug', 'Put these in order.', [
      'Reproduce it with a query',
      'Measure how many rows and since when',
      'Find the first bad record and what changed then',
      'Report it with the evidence',
      'Add a check so it’s caught next time',
    ]),
    choice(
      'x-qasql-6',
      'Pennies Off',
      'Why can comparing money with = fail in SQL?',
      ['Totals are always rounded to pounds', 'Floating point can’t store most decimals exactly; store pence as integers or use DECIMAL', 'SQL can’t multiply decimals', 'It only fails on NULLs'],
      1
    ),
    choice(
      'x-qasql-7',
      'Orders With No Items',
      'Which finds orders that have no items?',
      [
        'SELECT o.id FROM shop_orders o LEFT JOIN shop_order_items i ON i.order_id = o.id WHERE i.id IS NULL',
        'SELECT o.id FROM shop_orders o JOIN shop_order_items i ON i.order_id = o.id WHERE i.id IS NULL',
        'SELECT order_id FROM shop_order_items WHERE order_id IS NULL',
        'SELECT id FROM shop_orders WHERE total = 0',
      ],
      0
    ),
  ],

  // ---------- Distributed systems ----------
  'test-sys-01': [
    choice(
      'x-sys-1',
      'Charged Twice',
      'A payment request times out, the client retries, and the customer is charged twice. What’s the fix?',
      ['Longer timeouts', 'An idempotency key: store the result per key and return it on a retry', 'Stop clients retrying', 'A bigger database'],
      1
    ),
    choice(
      'x-sys-2',
      'Stampede',
      'A hot cache key expires and 5,000 requests hit the database at once. What helps most?',
      ['A shorter TTL', 'Let one request rebuild the value while the others wait or get the stale copy', 'More database replicas', 'Disable the cache'],
      1
    ),
    multi(
      'x-sys-3',
      'Strong Consistency',
      'Which of these need strong consistency? Tick all that apply.',
      ['Debiting a bank balance', 'A post’s like count', 'Claiming a unique username', 'Booking the last seat on a flight', 'A video’s view counter'],
      [0, 2, 3]
    ),
    match('x-sys-4', 'Patterns', 'Match each pattern to the problem it solves.', [
      ['Circuit breaker', 'Stop calling a dependency that keeps failing'],
      ['Outbox', 'Publish an event reliably when a row changes'],
      ['Consistent hashing', 'Add cache nodes without remapping most keys'],
      ['Leader election', 'Only one node runs a job'],
      ['Backpressure', 'Slow producers when consumers fall behind'],
    ]),
    choice(
      'x-sys-5',
      'Tail Latency',
      'Each backend call has a 1% chance of taking 2 seconds. A page makes 20 calls in parallel. Roughly how many page loads take 2 seconds?',
      ['About 1%', 'About 18%', 'About 50%', 'About 99%'],
      1
    ),
    written(
      'x-sys-6',
      'Retry Storm',
      'After a deploy, database CPU hits 100% and the API times out. Client retries make it worse. What do you do in the first 15 minutes, and what changes afterwards?',
      [
        'Mitigates first: rolls back the deploy',
        'Sheds load: rate limits, turns off non-essential traffic, or opens circuit breakers so retries stop piling up',
        'Communicates: an incident lead and status updates',
        'Afterwards: exponential backoff with jitter and retry budgets on clients',
        'Finds the root cause (e.g. a query plan or missing index), with a postmortem and canary releases',
      ],
      `Roll back first; diagnosing can wait. While it recovers, shed load: rate-limit at the edge and open breakers so retries don't keep hammering the database. Name an incident lead and post updates. Afterwards: backoff with jitter and a retry budget in clients, find the query the deploy changed (EXPLAIN, missing index), write the postmortem, and ship schema or query changes behind a canary.`
    ),
    choice(
      'x-sys-7',
      'At Least Once',
      'Your queue delivers every message at least once. What must the consumers be?',
      ['Fast', 'Idempotent: handling a message twice has the same effect as once', 'Single-threaded', 'Stateless'],
      1
    ),
    order('x-sys-8', 'Designing a System', 'Put these in order.', [
      'Clarify requirements and scale',
      'Estimate load and data size',
      'Sketch the high-level design',
      'Dig into bottlenecks and failure modes',
      'Plan monitoring and rollout',
    ]),
  ],

  // ---------- Frontend ----------
  'test-fe-01': [
    choice(
      'x-fe-1',
      'Slow Typing',
      'A 5,000-row list re-renders on every keystroke in an unrelated search box. Best first fix?',
      ['Wrap everything in useMemo', 'Keep the search state inside its own component, or memoise the list, so typing doesn’t re-render rows', 'Debounce the API', 'Switch to class components'],
      1
    ),
    choice(
      'x-fe-2',
      'Out-of-Order Results',
      "In a search box, results for “re” arrive after results for “react” and overwrite them. What's the fix?",
      ['Debounce harder', 'Ignore stale responses: abort the old request or check it’s still the latest', 'Cache results', 'Make the API faster'],
      1
    ),
    choice(
      'x-fe-3',
      'Normalised State',
      'Why store entities by id rather than nested inside other objects?',
      ['It uses less memory', 'Each entity lives in one place, so an update shows everywhere and lookups are quick', 'Redux requires it', 'It makes JSON smaller'],
      1
    ),
    match('x-fe-4', 'Hooks', 'Match each hook to its job.', [
      ['useEffect', 'Sync with something outside React'],
      ['useMemo', 'Cache an expensive calculation'],
      ['useCallback', 'Keep a function the same between renders'],
      ['useRef', 'Hold a value without causing a render'],
      ['useReducer', 'Complex state changed by actions'],
    ]),
    multi(
      'x-fe-5',
      'A Failed Save',
      'An optimistic update fails on the server. What should happen? Tick all that apply.',
      ['Revert that item to the server’s last known state', 'Tell the user it didn’t save', 'Keep other changes that did succeed', 'Reload the whole page', 'Drop the change silently'],
      [0, 1, 2]
    ),
    multi(
      'x-fe-6',
      'Slow First Paint',
      'Largest Contentful Paint is 4.5s on mobile. Which are likely to help? Tick all that apply.',
      ['Serve the hero image at the right size and format, and preload it', 'Ship less JavaScript before first paint, or render on the server', 'Lazy-load images below the fold', 'Lazy-load the hero image', 'Add a loading animation in JavaScript'],
      [0, 1, 2]
    ),
    choice(
      'x-fe-7',
      'Div as a Button',
      'A clickable <div> acts as a button. How do you make it accessible?',
      ['Add a title attribute', 'Use a real <button>; failing that, add role="button", tabindex="0" and Enter/Space handlers', 'Add cursor: pointer', 'Add an aria-label only'],
      1
    ),
    written(
      'x-fe-8',
      'Two Offline Edits',
      'Two people edit the same document title offline, then both sync. How should the app handle it, and what does each person see?',
      [
        'Detects the conflict, e.g. with a version number, ETag or updated_at',
        'Chooses a strategy and its trade-off: last write wins loses data; merging or asking the user keeps it',
        'Never loses an edit silently: the user is told and can see both versions',
        'The server stays the source of truth and the client reconciles its optimistic state',
      ],
      `Each edit carries the version it started from. The server accepts the first sync and rejects the second as a conflict, since its version is stale. The second person sees "This title changed while you were offline" with both versions and picks one or edits. Last write wins would be simpler, but it silently throws one person's work away.`
    ),
    order('x-fe-9', 'A Production Bug', 'Put these in order.', [
      'Reproduce it: browser, steps and data',
      'Check console and network errors',
      'Narrow it to the component or state change',
      'Write a test that fails',
      'Fix it and confirm the test passes',
    ]),
  ],

  // ---------- Backend APIs ----------
  'test-be-01': [
    choice(
      'x-be-1',
      'What to Retry',
      'Which failures should a client retry?',
      ['Every error', '503s and timeouts, but not 400s or 401s', 'Only 404s', 'None: retries are always risky'],
      1
    ),
    choice(
      'x-be-2',
      'Jitter',
      'Why add random jitter to a backoff schedule?',
      ['To make tests harder', 'So clients that failed together don’t all retry at the same moment', 'To save bandwidth', 'It shortens the average wait'],
      1
    ),
    match('x-be-3', 'Status Codes', 'Match each status code to when you send it.', [
      ['400', 'The request is malformed'],
      ['401', 'The caller isn’t authenticated'],
      ['403', 'Authenticated but not allowed'],
      ['404', 'The resource doesn’t exist'],
      ['409', 'It conflicts with the current state'],
      ['429', 'Too many requests'],
    ]),
    multi('x-be-4', 'Idempotent Methods', 'Which HTTP methods are idempotent by definition? Tick all that apply.', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], [0, 2, 3]),
    choice(
      'x-be-5',
      '/users/me',
      'Routes are /users/:id then /users/me. A request for /users/me hits the first one. What’s the fix?',
      ['Rename the parameter', 'Match fixed paths before parameterised ones', 'Use a query string', 'Make id numeric only'],
      1
    ),
    choice(
      'x-be-6',
      'No Timeout',
      'Your API calls a supplier with no timeout, and the supplier hangs. What happens?',
      ['Requests fail fast', 'Requests pile up holding connections until your service runs out and fails too', 'The supplier times out for you', 'Nothing'],
      1
    ),
    written(
      'x-be-7',
      'A Flaky Partner',
      'A partner API fails 5% of calls and rate-limits you at 100 a second. Design how your service calls it.',
      [
        'Timeouts on every call',
        'Retries only on retryable errors, with exponential backoff, jitter and a cap',
        'Respects 429 and Retry-After, and limits or queues its own calls under 100/s',
        'A circuit breaker to fail fast while the partner is down, with a fallback (cache or degraded response)',
        'Idempotency keys so retries never duplicate work, plus monitoring and alerts on error rate',
      ],
      `Every call gets a 2s timeout. Retry 5xx and timeouts up to 3 times with exponential backoff and jitter; never retry 4xx. A token bucket keeps us under 90/s, with a queue behind it, and we honour Retry-After on a 429. A circuit breaker opens after repeated failures so we fail fast and serve cached data. Writes carry an idempotency key, and we alert on the partner's error rate.`
    ),
    order('x-be-8', 'A Request’s Journey', 'Put these steps in order for a typical API request.', [
      'Match the route',
      'Authenticate the caller',
      'Check permissions',
      'Validate the body',
      'Do the work',
      'Send the response',
    ]),
  ],

  // ---------- REST API design ----------
  'test-api-01': [
    choice(
      'x-api-1',
      'Renaming a Field',
      'Mobile apps depend on a field you need to rename. What do you do?',
      ['Rename it and tell clients', 'Add the new field, keep the old one, and deprecate it with notice (or a new version)', 'Never rename fields', 'Rename it on a quiet weekend'],
      1
    ),
    choice(
      'x-api-2',
      'PUT or PATCH',
      'A client wants to change only a product’s price. Which fits?',
      ['PUT with just the price, which replaces the whole product', 'PATCH with just the price', 'POST to /products/:id/price', 'GET with ?price='],
      1
    ),
    multi(
      'x-api-3',
      'Cursors',
      'Why use cursor pagination rather than page numbers for a catalogue that changes? Tick all that apply.',
      ['New items don’t shift pages, so nothing is skipped or repeated', 'It stays fast on deep pages', 'Users can jump straight to page 50', 'Cursors make URLs shorter'],
      [0, 1]
    ),
    choice(
      'x-api-4',
      'Money in JSON',
      'How should the API send prices?',
      ['As floats, e.g. 12.5', 'As whole pence (or a decimal string) with the currency', 'As formatted text, e.g. "£12.50"', 'In pounds, rounded'],
      1
    ),
    written(
      'x-api-5',
      'Double Orders',
      'On flaky mobile networks, some customers get two orders from one tap. How do you fix it in the API?',
      [
        'The client sends an idempotency key per checkout attempt',
        'The server stores key → result and returns the same result on a retry instead of creating another order',
        'Keys are scoped to the user and expire',
        'Handles a retry arriving while the first is still running (lock, or 409)',
        'Notes that disabling the button helps, but the server is the real fix',
      ],
      `The app creates an idempotency key when checkout starts and sends it with every attempt. The server saves the key with the order it created; a repeat with the same key returns that order instead of making a new one. Keys belong to one user and expire after a day. A retry that arrives mid-request gets a 409 until the first finishes. Disabling the button helps, but only the server can guarantee it.`
    ),
    order('x-api-6', 'A New Endpoint', 'Put these in order.', [
      'Agree what the client needs to do',
      'Choose the resource and method',
      'Define the request, response and errors',
      'Review the contract with the people who’ll use it',
      'Build it with tests',
    ]),
  ],

  // ---------- Database design ----------
  'test-db-01': [
    choice(
      'x-db-1',
      'The Right Index',
      'A profile page runs WHERE user_id = ? ORDER BY created_at DESC LIMIT 20. Best index?',
      ['(created_at)', '(user_id, created_at)', '(created_at, user_id)', 'One on each column'],
      1
    ),
    choice(
      'x-db-2',
      'Like Counts',
      'Every tweet shows its like count, and there are millions of tweets. How do you serve it quickly?',
      ['COUNT(*) on likes for every tweet shown', 'Keep a like_count column, updated in the same transaction as each like', 'Recount every night', 'Store likes as a list in the tweet row'],
      1
    ),
    multi(
      'x-db-3',
      'In the Database',
      'Which rules belong in the database as constraints, not just in app code? Tick all that apply.',
      ['Usernames are unique', 'Every tweet belongs to a user that exists', 'A tweet is 1–280 characters', 'Users verify their email within 24 hours', 'Tweets must be polite'],
      [0, 1, 2]
    ),
    match('x-db-4', 'Modelling Relationships', 'Match each relationship to how you model it.', [
      ['A user has many tweets', 'A user_id foreign key on tweets'],
      ['Users follow users', 'A table of follower_id and followee_id'],
      ['Tweets have many hashtags, and the reverse', 'A tweet_hashtags table linking the two'],
      ['A user has one settings row', 'A settings table keyed by user_id'],
    ]),
    written(
      'x-db-5',
      'Two Billion Tweets',
      'Tweets has 2 billion rows and the home timeline (tweets from everyone you follow) is slow. What are your options?',
      [
        'Indexes that fit the query, e.g. (user_id, created_at), and only reading recent tweets',
        'Fan-out on write: build each user’s timeline ahead of time',
        'A hybrid for accounts with huge followings (fan-out on read for them)',
        'Caching hot timelines in memory',
        'Partitioning or sharding (by user or time) and archiving old tweets, with the trade-offs',
      ],
      `First check the index on (user_id, created_at) and limit reads to recent tweets. The bigger change is fan-out on write: when someone tweets, push its id into each follower's timeline list (in Redis or a timeline table), so reading a timeline is one lookup. Celebrities with millions of followers would make writes too slow, so merge their tweets in at read time. Partition tweets by time and archive old ones. The cost is more storage and write work for much faster reads.`
    ),
    order('x-db-6', 'Renaming a Live Column', 'Put the steps for renaming a column on a busy table, without downtime, in order.', [
      'Add the new column',
      'Write to both columns',
      'Backfill existing rows',
      'Switch reads to the new column',
      'Drop the old column',
    ]),
  ],

  // ---------- Test case writing ----------
  'test-qatc-01': [
    choice('x-qatc-1', 'Boundaries', 'Valid ages are 18 to 65. Which values test the boundaries best?', ['18, 40, 65', '17, 18, 65, 66', '0, 100', '20, 30, 40, 50'], 1),
    choice(
      'x-qatc-2',
      'Not Every Price',
      'Why not test every price from £0.01 to £1,000?',
      ['It’s too slow to run', 'Values in the same group behave the same; one from each group plus the boundaries is enough', 'Prices never change', 'It is fine to test them all'],
      1
    ),
    multi(
      'x-qatc-3',
      'A Good Bug Report',
      'What does a good bug report include? Tick all that apply.',
      ['Steps to reproduce', 'Expected and actual result', 'Browser, device or version', 'A screenshot or logs', 'Who wrote the code'],
      [0, 1, 2, 3]
    ),
    choice(
      'x-qatc-4',
      'Flaky Test',
      'A test passes on your machine but fails about 1 run in 5 on CI. What do you do?',
      ['Rerun until it passes', 'Investigate timing, test order or shared data; a flaky test hides real bugs', 'Delete it', 'Mark it as skipped'],
      1
    ),
    written(
      'x-qatc-5',
      'Testing a Login Form',
      'A login form has email, password, a “Log in” button and a “Forgot password” link. Which test cases do you write first, and why?',
      [
        'The happy path: a valid login works',
        'Wrong password and unknown email both give the same generic error (no hint which accounts exist)',
        'Empty and badly formed fields are handled',
        'Lockout or rate limiting after repeated failures',
        'Edge cases (email case, long input, injection) and the forgot-password flow, ordered by risk',
      ],
      `1. Valid login works: the core of the feature. 2. Wrong password and unknown email show the same message, so attackers can't find accounts. 3. Repeated failures lock out or slow down. 4. Empty fields and a malformed email get clear errors. 5. Email in capitals still logs in. 6. Forgot password sends a link that expires. Then long input and injection strings.`
    ),
    order('x-qatc-6', 'A Bug’s Life', 'Put a bug’s journey in order.', ['Found and reproduced', 'Reported', 'Triaged and prioritised', 'Fixed', 'Retested and closed']),
  ],

  // ---------- API testing ----------
  'test-qaapi-01': [
    choice(
      'x-qaapi-1',
      "Bob Sees Alice's Order",
      'Using Bob’s token, GET /orders/10 (Alice’s order) returns 200 with her details. What is it?',
      ['A minor bug: the status code should be 404', 'A critical access control bug: it should return 403 or 404 and no data', 'Expected behaviour for logged-in users', 'A caching issue'],
      1
    ),
    match('x-qaapi-2', 'Status Codes', 'Match each status code to what it means.', [
      ['201', 'Created'],
      ['204', 'Success, nothing to return'],
      ['401', 'No valid credentials'],
      ['403', 'Logged in but not allowed'],
      ['429', 'Rate limited'],
    ]),
    multi(
      'x-qaapi-3',
      'Testing a List',
      'What should you check on a paged list endpoint? Tick all that apply.',
      ['Status code', 'Each item’s fields and types', 'Sort order', 'Page size limits', 'No gaps or repeats across pages', 'The order of keys in the JSON'],
      [0, 1, 2, 3, 4]
    ),
    choice(
      'x-qaapi-4',
      'Together They Fail',
      'Your API tests pass one at a time but fail when run together. Most likely cause?',
      ['The API is slow', 'They share data; each test should set up and clean up its own', 'Too many tests', 'The test runner is broken'],
      1
    ),
    written(
      'x-qaapi-5',
      'Testing Transfers',
      'You have one day to test a new “transfer money between accounts” endpoint. What do you test, in priority order?',
      [
        'Correctness: exact debit and credit, balances add up',
        'Access: you can only move money out of your own accounts',
        'Validation: zero or negative amounts, insufficient funds, same account, bad currency',
        'Duplicates and concurrency: a retried request or two at once can’t overdraw or double-send',
        'Atomicity and audit: no half-done transfers, and every transfer logged',
      ],
      `1. A valid transfer debits and credits the exact amount. 2. I can't transfer from someone else's account. 3. Two transfers at once can't overdraw, and a retried request doesn't send twice. 4. Insufficient funds, zero, negative and same-account transfers are rejected. 5. If the credit fails, the debit is undone. 6. Each transfer appears in the audit log.`
    ),
    order('x-qaapi-6', 'Testing a New Endpoint', 'Put these in order.', [
      'Read the contract',
      'Plan cases: happy path, edges, errors, access',
      'Set up test data',
      'Run the tests and record results',
      'Report bugs with the request and response',
    ]),
  ],
};
