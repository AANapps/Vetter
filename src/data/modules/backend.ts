import { choice, match, multi, order } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';

// ---------- Backend APIs ----------
export const BACKEND_MODULE: ModuleSkeleton = {
  familyId: 'test-be-01',
  aspects: [
    { id: 'http', name: 'HTTP Fundamentals', summary: 'Methods, status codes, headers and what idempotent means.' },
    { id: 'routing', name: 'Routing & Request Handling', summary: 'Matching routes, middleware, and a request’s path through the server.' },
    { id: 'resilience', name: 'Retries & Resilience', summary: 'Timeouts, retries with backoff, and calling services that fail.' },
    { id: 'security', name: 'Auth & Security', summary: 'Authentication, authorisation, secrets and common attacks.' },
    { id: 'ops', name: 'Logging & Operations', summary: 'Logs, metrics, config and keeping a service healthy in production.' },
  ],
  tags: {
    'x-be-3': ['http', B],
    'x-be-4': ['http', J],
    'x-be-8': ['routing', J],
    'x-be-5': ['routing', J],
    'q-be-2': ['routing', P],
    'x-be-6': ['resilience', J],
    'x-be-1': ['resilience', J],
    'q-be-1': ['resilience', P],
    'x-be-2': ['resilience', P],
    'x-be-7': ['resilience', S],
  },
  bank: [
    ...tagged(
      'http',
      P,
      choice(
        'm-be-http-p1',
        'Caching a Response',
        'GET /products/42 changes rarely, but clients fetch it constantly. Which lets clients skip downloading it again when nothing changed?',
        [
          'Send an ETag; the client sends If-None-Match and gets 304 Not Modified when it still matches',
          'Return 204 No Content on repeat requests',
          'Ask clients to poll less often',
          'Compress the response with gzip',
        ],
        0
      )
    ),
    ...tagged(
      'http',
      S,
      choice(
        'm-be-http-s1',
        'A Slow Export',
        'POST /reports/export takes up to 4 minutes, and load balancers cut requests at 60 seconds. What is the right API shape?',
        [
          'Return 202 Accepted with a job URL; the client polls it (or gets a webhook) and downloads the file when it’s ready',
          'Raise every timeout to 5 minutes',
          'Return 200 straight away with an empty file',
          'Ask users to export smaller date ranges',
        ],
        0
      )
    ),
    ...tagged(
      'routing',
      B,
      choice(
        'm-be-routing-b1',
        'Reading a Request',
        'For GET /users/42/orders?status=open, where does each value come from?',
        [
          '42 is a path parameter; status=open is a query parameter',
          'Both are in the request body',
          '42 is a header; status is a cookie',
          'Both are query parameters',
        ],
        0
      )
    ),
    ...tagged(
      'routing',
      S,
      choice(
        'm-be-routing-s1',
        'Middleware Order',
        'An API has middleware for logging, authentication, rate limiting and body parsing. A flood of unauthenticated junk requests is burning CPU parsing large bodies. What order fixes it?',
        [
          'Logging, rate limiting, authentication, then body parsing, so cheap checks reject requests before the expensive work',
          'Body parsing first, so every other step can read the body',
          'Authentication last, after everything else has run',
          'The order doesn’t matter; middleware runs in parallel',
        ],
        0
      )
    ),
    ...tagged(
      'resilience',
      B,
      choice(
        'm-be-res-b1',
        'Why Timeouts',
        'Why should every call to another service have a timeout?',
        [
          'Without one, a hung service holds your threads and connections until your own service runs out and stops answering',
          'Timeouts make calls faster',
          'They are only needed for databases',
          'So that errors are never shown to users',
        ],
        0
      )
    ),
    ...tagged(
      'security',
      B,
      match('m-be-sec-b1', 'Who and What', 'Match each term to what it means.', [
        ['Authentication', 'Proving who the caller is'],
        ['Authorisation', 'Deciding what that caller may do'],
        ['Hashing a password', 'Storing it so it can be checked but not read back'],
        ['HTTPS', 'Encrypting traffic between client and server'],
      ])
    ),
    ...tagged(
      'security',
      J,
      choice(
        'm-be-sec-j1',
        'SQL Injection',
        'A handler builds "SELECT * FROM users WHERE email = \'" + req.query.email + "\'". What is the fix?',
        [
          'Use a parameterised query so the email is passed as data, never as SQL',
          'Strip quotes from the email',
          'Only allow GET requests',
          'Check the email is under 100 characters',
        ],
        0
      )
    ),
    ...tagged(
      'security',
      P,
      multi(
        'm-be-sec-p1',
        'Storing Passwords',
        'Which belong in how you store users’ passwords? Tick all that apply.',
        [
          'A slow, salted hash built for passwords, such as bcrypt or Argon2',
          'A unique salt per user',
          'Rate limiting and lockouts on login attempts',
          'Encrypting passwords so support staff can read them back',
          'SHA-256 once, because it is fast',
        ],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'security',
      S,
      choice(
        'm-be-sec-s1',
        'A Leaked Key',
        'A production database password was committed to a public repo an hour ago. What do you do first?',
        [
          'Rotate the credential now, then check access logs for misuse, then move secrets to a secret store and scan history',
          'Delete the commit and force-push',
          'Make the repo private and carry on',
          'Wait to see if anyone used it',
        ],
        0
      )
    ),
    ...tagged(
      'ops',
      B,
      choice(
        'm-be-ops-b1',
        'Config Per Environment',
        'The API needs a different database URL in development, staging and production. Where should the URL live?',
        ['In environment variables or a config service, read at start-up', 'Hard-coded, with an if statement per environment', 'In the code’s README', 'In the client app'],
        0
      )
    ),
    ...tagged(
      'ops',
      J,
      multi(
        'm-be-ops-j1',
        'A Useful Log Line',
        'Which belong in the log for a failed request? Tick all that apply.',
        ['A request or trace id to follow it across services', 'The route and status code', 'The error and stack trace', 'The user’s password from the request body', 'How long it took'],
        [0, 1, 2, 4]
      )
    ),
    ...tagged(
      'ops',
      P,
      match('m-be-ops-p1', 'Health Checks', 'Match each check to what it tells the platform.', [
        ['Liveness', 'The process is stuck and should be restarted'],
        ['Readiness', 'Don’t send it traffic yet, e.g. still warming up or its database is down'],
        ['Error-rate alert', 'Users are seeing failures right now'],
        ['p99 latency', 'How slow the slowest 1% of requests are'],
      ])
    ),
    ...tagged(
      'ops',
      S,
      order('m-be-ops-s1', 'A Bad Deploy', 'Errors jumped from 0.1% to 8% right after a deploy. Put your response in order.', [
        'Roll back to the last good version',
        'Confirm errors return to normal',
        'Tell stakeholders what happened and that it’s mitigated',
        'Find the cause from logs and the diff',
        'Fix it with a test that would have caught it, and redeploy',
        'Write a blameless post-mortem with follow-ups',
      ])
    ),
  ],
};

// ---------- REST API Design ----------
export const API_MODULE: ModuleSkeleton = {
  familyId: 'test-api-01',
  aspects: [
    { id: 'resources', name: 'Resources & Endpoints', summary: 'Naming resources, choosing methods, and URL design.' },
    { id: 'status', name: 'Status Codes & Errors', summary: 'The right code for each outcome, and errors clients can act on.' },
    { id: 'validation', name: 'Validation & Payloads', summary: 'Checking input, shaping responses, and representing data safely.' },
    { id: 'pagination', name: 'Pagination & Filtering', summary: 'Serving large, changing collections a page at a time.' },
    { id: 'evolution', name: 'Versioning & Reliability', summary: 'Changing an API without breaking clients, and safe retries.' },
  ],
  tags: {
    'q-api-1': ['resources', J],
    'x-api-2': ['resources', J],
    'q-api-2': ['status', J],
    'x-api-4': ['validation', J],
    'q-api-3': ['validation', P],
    'q-api-4': ['pagination', P],
    'x-api-3': ['pagination', P],
    'x-api-1': ['evolution', P],
    'x-api-6': ['evolution', P],
    'x-api-5': ['evolution', S],
  },
  bank: [
    ...tagged(
      'resources',
      B,
      choice(
        'm-api-res-b1',
        'Naming a Resource',
        'Which URL follows REST conventions for fetching one order?',
        ['GET /orders/123', 'GET /getOrder?id=123', 'POST /orders/fetch/123', 'GET /order-get/123'],
        0
      )
    ),
    ...tagged(
      'resources',
      P,
      choice(
        'm-api-res-p1',
        'An Action, Not a Field',
        'Customers can cancel an order, which refunds them and restocks items. Which design is clearest?',
        [
          'POST /orders/123/cancellation, creating a cancellation with its own rules and result',
          'PATCH /orders/123 with { status: "cancelled" } and let the server guess what else to do',
          'DELETE /orders/123',
          'GET /orders/123/cancel',
        ],
        0
      )
    ),
    ...tagged(
      'resources',
      S,
      choice(
        'm-api-res-s1',
        'A Chatty Screen',
        'The mobile order screen makes 14 API calls to draw one page and is slow on 3G. What is the best fix?',
        [
          'Add a response shaped for that screen (a backend-for-frontend or an include/expand parameter) so one call returns what it needs',
          'Ask users to use Wi-Fi',
          'Merge every resource into one giant endpoint for all clients',
          'Make the 14 calls in sequence instead of parallel',
        ],
        0
      )
    ),
    ...tagged(
      'status',
      B,
      match('m-api-status-b1', 'Status Code Families', 'Match each family of status codes to what it means.', [
        ['2xx', 'It worked'],
        ['3xx', 'Look somewhere else (redirect)'],
        ['4xx', 'The client sent something wrong'],
        ['5xx', 'The server failed'],
      ])
    ),
    ...tagged(
      'status',
      P,
      choice(
        'm-api-status-p1',
        'An Error Clients Can Use',
        'POST /orders fails because one item is out of stock. Which response helps the client most?',
        [
          '409 or 422 with a JSON body naming the problem: { code: "OUT_OF_STOCK", field: "items[2]", message: "…" }',
          '500 with an HTML error page',
          '200 with { success: false }',
          '400 with an empty body',
        ],
        0
      )
    ),
    ...tagged(
      'status',
      S,
      choice(
        'm-api-status-s1',
        'Telling Clients to Slow Down',
        'A partner exceeds its rate limit. How should the API respond so well-behaved clients recover on their own?',
        [
          '429 Too Many Requests with a Retry-After header, and rate-limit headers on every response',
          '503 with no headers',
          '403 Forbidden until they email support',
          'Silently drop the requests',
        ],
        0
      )
    ),
    ...tagged(
      'validation',
      B,
      choice(
        'm-api-val-b1',
        'Trusting Input',
        'The web form already checks that quantity is between 1 and 10. Does the API need to check it too?',
        [
          'Yes: anyone can call the API directly, so the server must validate everything itself',
          'No, the form has already done it',
          'Only in development',
          'Only if the request is over HTTP rather than HTTPS',
        ],
        0
      )
    ),
    ...tagged(
      'validation',
      S,
      multi(
        'm-api-val-s1',
        'Mass Assignment',
        'PATCH /users/me copies every field in the body onto the user record. A user sends { "role": "admin" }. Which fixes it? Tick all that apply.',
        [
          'Accept only an allow-list of editable fields',
          'Validate the body against a schema that rejects unknown fields',
          'Keep role changes in a separate admin-only endpoint',
          'Hide the role field from the API docs',
          'Rename the role column',
        ],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'pagination',
      B,
      choice(
        'm-api-page-b1',
        'Why Paginate',
        'Why shouldn’t GET /products return all 200,000 products at once?',
        ['It is slow and heavy for the server, the network and the client; pages keep each response small', 'JSON can’t hold that many items', 'HTTP limits responses to 1,000 items', 'Browsers block large responses'],
        0
      )
    ),
    ...tagged(
      'pagination',
      J,
      choice(
        'm-api-page-j1',
        'Filtering a List',
        'Clients want products in one category under £50, cheapest first. Which request fits REST conventions?',
        ['GET /products?category=tents&max_price=50&sort=price', 'POST /products/search-cheap-tents', 'GET /products/tents/under/50/sorted', 'GET /products with the filters in a request body'],
        0
      )
    ),
    ...tagged(
      'pagination',
      S,
      choice(
        'm-api-page-s1',
        'Deep Pages Are Slow',
        'GET /events?page=5000&size=50 takes 9 seconds; page 1 takes 20 ms. Why, and what fixes it?',
        [
          'OFFSET makes the database read and discard 250,000 rows; switch to keyset (cursor) pagination on an indexed column',
          'Page 5000 has bigger events; compress them',
          'The cache only holds early pages; make it bigger',
          'Clients should never go past page 100',
        ],
        0
      )
    ),
    ...tagged(
      'evolution',
      B,
      choice(
        'm-api-evo-b1',
        'A Breaking Change',
        'Which of these changes can break existing clients?',
        ['Removing a field from a response', 'Adding a new optional field to a response', 'Adding a new endpoint', 'Making a response faster'],
        0
      )
    ),
    ...tagged(
      'evolution',
      J,
      choice(
        'm-api-evo-j1',
        'Safe to Retry',
        'Which request can a client safely retry after a timeout without risking a duplicate effect?',
        ['PUT /users/7/email with the new address', 'POST /payments', 'POST /orders', 'POST /emails/send'],
        0
      )
    ),
  ],
};

// ---------- Distributed Systems ----------
export const SYSTEMS_MODULE: ModuleSkeleton = {
  familyId: 'test-sys-01',
  aspects: [
    { id: 'concurrency', name: 'Concurrency & Rate Limiting', summary: 'Many things at once: races, locks, and limiting load.' },
    { id: 'caching', name: 'Caching', summary: 'What to cache, how it goes stale, and what happens when it empties.' },
    { id: 'consistency', name: 'Consistency & Data', summary: 'Replication, transactions, and what stays correct when parts fail.' },
    { id: 'messaging', name: 'Queues & Messaging', summary: 'Asynchronous work, delivery guarantees, and handling duplicates.' },
    { id: 'reliability', name: 'Reliability & Scaling', summary: 'Scaling out, failure modes, and designing for both.' },
  ],
  tags: {
    'q-sys-2': ['concurrency', P],
    'q-sys-1': ['concurrency', S],
    'x-sys-2': ['caching', P],
    'x-sys-3': ['consistency', P],
    'x-sys-1': ['consistency', S],
    'x-sys-7': ['messaging', J],
    'x-sys-8': ['reliability', J],
    'x-sys-4': ['reliability', P],
    'x-sys-5': ['reliability', S],
    'x-sys-6': ['reliability', S],
  },
  bank: [
    ...tagged(
      'concurrency',
      B,
      choice(
        'm-sys-conc-b1',
        'A Lost Update',
        'Two requests read a stock count of 5 at the same moment, each subtract 1, and each write 4. What is this called?',
        ['A race condition: both read before either wrote, so one update was lost', 'A deadlock', 'A memory leak', 'Eventual consistency working as intended'],
        0
      )
    ),
    ...tagged(
      'concurrency',
      J,
      choice(
        'm-sys-conc-j1',
        'Fixing the Lost Update',
        'How do you stop two buyers taking the last item at the same time?',
        [
          'Do it in one atomic statement: UPDATE stock SET qty = qty - 1 WHERE id = ? AND qty > 0, and check a row changed',
          'Read the count twice before writing',
          'Add a sleep between the read and the write',
          'Cache the stock count in each server',
        ],
        0
      )
    ),
    ...tagged(
      'caching',
      B,
      choice(
        'm-sys-cache-b1',
        'What a Cache Is For',
        'When does putting a cache in front of a database help most?',
        ['When the same data is read far more often than it changes', 'When every request reads different data once', 'When data must be right to the millisecond', 'When writes outnumber reads'],
        0
      )
    ),
    ...tagged(
      'caching',
      J,
      match('m-sys-cache-j1', 'Cache Patterns', 'Match each pattern to how it works.', [
        ['Cache-aside', 'The app checks the cache, and on a miss loads from the database and fills it'],
        ['Write-through', 'Every write goes to the cache and the database together'],
        ['TTL', 'Entries expire after a set time'],
        ['Invalidation', 'An entry is removed when its data changes'],
      ])
    ),
    ...tagged(
      'caching',
      S,
      choice(
        'm-sys-cache-s1',
        'Stale Prices',
        'Product prices are cached for 10 minutes in each of 40 app servers’ memory. After a price change, customers see different prices on refresh. What fixes it best?',
        [
          'Move to a shared cache and publish an invalidation event when a price changes, keeping a short TTL as a backstop',
          'Lower the TTL to 1 second everywhere',
          'Restart every server after each price change',
          'Sticky sessions so each customer always hits the same server',
        ],
        0
      )
    ),
    ...tagged(
      'consistency',
      B,
      choice(
        'm-sys-cons-b1',
        'A Transaction',
        'Moving £50 from one account to another debits one and credits the other. Why wrap both in a transaction?',
        ['So both happen or neither does; a crash in between can’t lose or create money', 'To make it faster', 'So other users can’t read either account ever again', 'Transactions are only for reports'],
        0
      )
    ),
    ...tagged(
      'consistency',
      J,
      choice(
        'm-sys-cons-j1',
        'Read Your Own Write',
        'A user updates their profile, the page reloads, and shows the old name. Reads go to replicas, writes to the primary. What is happening?',
        [
          'Replication lag: the replica hasn’t caught up yet; read the user’s own data from the primary for a short while after they write',
          'The write failed',
          'The browser cached the old page',
          'The primary is down',
        ],
        0
      )
    ),
    ...tagged(
      'messaging',
      B,
      choice(
        'm-sys-msg-b1',
        'Why a Queue',
        'After checkout, the app sends a receipt email, updates analytics and notifies the warehouse. Why put these on a queue?',
        [
          'Checkout answers fast, and a slow or failing step is retried without affecting the customer',
          'Queues make emails arrive instantly',
          'So the steps always run in exactly one order',
          'Queues remove the need for a database',
        ],
        0
      )
    ),
    ...tagged(
      'messaging',
      P,
      choice(
        'm-sys-msg-p1',
        'A Poison Message',
        'One malformed message makes the consumer crash; it is redelivered forever and blocks the queue behind it. What fixes it?',
        ['After a few failed attempts, move it to a dead-letter queue and alert, so the rest keep flowing', 'Turn off redelivery entirely', 'Add more consumers', 'Delete the queue and start again'],
        0
      )
    ),
    ...tagged(
      'messaging',
      S,
      choice(
        'm-sys-msg-s1',
        'Saved but Not Sent',
        'An order service writes the order to its database, then publishes OrderPlaced. Sometimes it crashes in between and the warehouse never hears. What fixes it?',
        [
          'The outbox pattern: write the event to an outbox table in the same transaction, and a relay publishes it',
          'Publish the event first, then write the order',
          'Retry the publish three times in memory',
          'Have the warehouse poll the order database every second',
        ],
        0
      )
    ),
    ...tagged(
      'reliability',
      B,
      choice(
        'm-sys-rel-b1',
        'Scaling Out',
        'Why run three copies of a web service behind a load balancer rather than one big server?',
        ['If one fails the others keep serving, and you can add copies as traffic grows', 'Three small servers always cost less', 'Load balancers make each request faster', 'It removes the need for a database'],
        0
      )
    ),
  ],
};
