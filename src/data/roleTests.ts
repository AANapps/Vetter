import { AssessmentTest } from '../types';

/**
 * Vetter tests built for specific roles: Backend and QA. Data Analyst tests are simulations (analysisSimulations.ts).
 * Every task is hands-on and auto-graded: SQL against a sample database, JavaScript against
 * test cases, schemas against inserts that must be accepted or rejected, and, for QA, the
 * candidate's own tests run against a correct implementation and several broken ones.
 */

// ---------- Shared harnesses ----------

// Grades test cases a candidate writes as data: solution() returns [...args, expected] rows.
// Every row must pass on the correct implementation; a bug is caught when any row fails on it.
const testCaseHarness = (implementations: string) => `
const __impls = {
${implementations}
};
function check(name) {
  let cases;
  try { cases = solution(); } catch (e) { return 'solution() threw: ' + e.message; }
  if (!Array.isArray(cases) || cases.length === 0) return 'Return at least one test case';
  const run = (fn, c) => { try { return fn(...c.slice(0, -1)); } catch (e) { return 'throws'; } };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    if (!Array.isArray(c) || c.length < 2) return 'Case ' + (i + 1) + ' should be [...arguments, expected]';
    const got = run(__impls.correct, c);
    if (!same(got, c[c.length - 1])) {
      return 'Case ' + (i + 1) + ' fails on the correct implementation: expected ' + JSON.stringify(c[c.length - 1]) + ', got ' + JSON.stringify(got);
    }
  }
  if (name === 'correct') return 'ok';
  return cases.some((c) => !same(run(__impls[name], c), c[c.length - 1])) ? 'caught' : 'missed';
}`;

// Grades API checks a candidate writes: solution(api) returns the problems it found.
// It must find none on the correct API, and at least one on each broken version.
const apiHarness = (makeApi: string) => `
${makeApi}
function check(name) {
  const findProblems = (bug) => {
    const problems = solution(__makeApi(bug));
    if (!Array.isArray(problems)) throw new Error('Return an array of problems (empty when the API behaves)');
    return problems;
  };
  try {
    const onCorrect = findProblems(null);
    if (onCorrect.length) return 'Reported problems on the correct API: ' + onCorrect.join('; ');
    if (name === 'correct') return 'ok';
    return findProblems(name).length ? 'caught' : 'missed';
  } catch (e) {
    return 'solution(api) threw: ' + e.message;
  }
}`;

const caughtCase = (id: string, bug: string, description: string) => ({
  id,
  description,
  input: JSON.stringify(bug),
  expectedOutput: 'caught',
});

const correctCase = (id: string, description: string) => ({
  id,
  description,
  input: '"correct"',
  expectedOutput: 'ok',
});

// ---------- Fixtures ----------

const CATALOG = { p1: { price: 12.5, stock: 3 }, p2: { price: 40, stock: 0 }, p3: { price: 5, stock: 10 } };

const ITEMS = Array.from({ length: 250 }, (_, i) => ({ id: i + 1 }));
const idRange = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ id: from + i }));

// The users and tweets tables later schema tasks build on
const USERS_AND_TWEETS = `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tweets (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 280),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);`;

const TWO_USERS = `INSERT INTO users (id, username) VALUES (1, 'ada'); INSERT INTO users (id, username) VALUES (2, 'grace');`;
const ONE_TWEET = `${TWO_USERS} INSERT INTO tweets (id, user_id, body) VALUES (1, 1, 'Hello world');`;

export const ROLE_ASSESSMENTS: AssessmentTest[] = [
  // ===================== Backend =====================
  {
    id: 'test-api-01',
    title: 'REST API Design: E-commerce',
    category: 'Backend APIs',
    difficulty: 'Professional',
    type: 'standard',
    description: 'Design the API for an online shop: name the endpoints, pick the right status codes, validate an order request and paginate a large catalogue.',
    estimatedMinutes: 20,
    passingScore: 70,
    totalQuestions: 4,
    skillsTested: ['REST API Design', 'HTTP Semantics', 'Input Validation', 'Pagination'],
    roles: ['Backend Engineer', 'Full Stack Engineer'],
    questions: [
      {
        id: 'q-api-1',
        title: 'Name the Endpoints',
        type: 'code',
        prompt: `Fill in the method and path for each action in the shop's API, as "METHOD /path".

Follow REST conventions:
- Paths are plural nouns, never verbs (/products, not /getProducts)
- IDs are path parameters written like :productId
- A cart's items live under that cart
- Changing part of a resource uses PATCH`,
        starterCode: `function solution() {
  return {
    listProducts: '',
    getProduct: '',
    addCartItem: '',
    updateCartItemQuantity: '',
    removeCartItem: '',
    placeOrder: '',
    cancelOrder: '',
    listCustomerOrders: '',
  };
}`,
        harness: `
const __routes = {
  listProducts: [/^GET \\/products$/],
  getProduct: [/^GET \\/products\\/:id$/],
  addCartItem: [/^POST \\/carts\\/:id\\/items$/],
  updateCartItemQuantity: [/^(PATCH|PUT) \\/carts\\/:id\\/items\\/:id$/],
  removeCartItem: [/^DELETE \\/carts\\/:id\\/items\\/:id$/],
  placeOrder: [/^POST \\/orders$/],
  cancelOrder: [/^PATCH \\/orders\\/:id$/, /^POST \\/orders\\/:id\\/cancel(lation)?$/],
  listCustomerOrders: [/^GET \\/customers\\/:id\\/orders$/, /^GET \\/orders\\?customer_?id=:id$/],
};
function check(action) {
  const all = solution() || {};
  const raw = String(all[action] || '').trim();
  if (!raw) return 'missing';
  const [method, path = ''] = raw.split(/\\s+/);
  const normal = method.toUpperCase() + ' ' + path.replace(/:[A-Za-z_]+/g, ':id').replace(/\\/$/, '').toLowerCase();
  return __routes[action].some((re) => re.test(normal)) ? 'ok' : 'got "' + raw + '"';
}`,
        testCases: [
          { id: 'tc-api-1', description: 'List all products', input: '"listProducts"', expectedOutput: 'ok' },
          { id: 'tc-api-2', description: 'Get one product', input: '"getProduct"', expectedOutput: 'ok' },
          { id: 'tc-api-3', description: 'Add an item to a cart', input: '"addCartItem"', expectedOutput: 'ok' },
          { id: 'tc-api-4', description: 'Change the quantity of a cart item', input: '"updateCartItemQuantity"', expectedOutput: 'ok' },
          { id: 'tc-api-5', description: 'Remove an item from a cart', input: '"removeCartItem"', expectedOutput: 'ok' },
          { id: 'tc-api-6', description: 'Place an order', input: '"placeOrder"', expectedOutput: 'ok' },
          { id: 'tc-api-7', description: 'Cancel an order', input: '"cancelOrder"', expectedOutput: 'ok' },
          { id: 'tc-api-8', description: "List a customer's orders", input: '"listCustomerOrders"', expectedOutput: 'ok' },
        ],
        timeLimitMinutes: 4,
        weight: 20,
      },
      {
        id: 'q-api-2',
        title: 'Choose the Status Code',
        type: 'code',
        prompt: `Return the HTTP status code the shop's API should send in each situation:

- "created": a new order was placed
- "deleted": a cart item was removed and there's nothing to return
- "validation_failed": the request body is missing required fields
- "not_logged_in": no valid session or token was sent
- "not_your_order": a signed-in customer asks for someone else's order
- "not_found": the product doesn't exist
- "out_of_stock": the order conflicts with current stock
- "rate_limited": the client sent too many requests`,
        starterCode: `function solution(situation) {
  switch (situation) {
    case 'created':
      return 0;
    // ...
  }
}`,
        solutionCode: `function solution(situation) {
  return { created: 201, deleted: 204, validation_failed: 400, not_logged_in: 401, not_your_order: 403, not_found: 404, out_of_stock: 409, rate_limited: 429 }[situation];
}`,
        testCases: [
          { id: 'tc-api-9', description: 'Created', input: '"created"', expectedOutput: '201' },
          { id: 'tc-api-10', description: 'Deleted with no body', input: '"deleted"', expectedOutput: '204' },
          { id: 'tc-api-11', description: 'Validation failed', input: '"validation_failed"', expectedOutput: '400' },
          { id: 'tc-api-12', description: 'Not logged in', input: '"not_logged_in"', expectedOutput: '401' },
          { id: 'tc-api-13', description: "Someone else's order", input: '"not_your_order"', expectedOutput: '403' },
          { id: 'tc-api-14', description: 'Not found', input: '"not_found"', expectedOutput: '404' },
          { id: 'tc-api-15', description: 'Conflicts with stock', input: '"out_of_stock"', expectedOutput: '409' },
          { id: 'tc-api-16', description: 'Rate limited', input: '"rate_limited"', expectedOutput: '429' },
        ],
        timeLimitMinutes: 3,
        weight: 20,
      },
      {
        id: 'q-api-3',
        title: 'Validate POST /orders',
        type: 'code',
        prompt: `Write the handler for POST /orders: 'function solution(body, catalog)' returns { status, body }.

'catalog' maps product IDs to { price, stock }. Check the request in this order:

1. body.items must be a non-empty array, and every item needs a productId and a whole-number quantity of at least 1. Otherwise: 400 { error: "invalid_items" }
2. Going through the items in order, an unknown product: 404 { error: "product_not_found", productId }
3. A quantity above that product's stock: 409 { error: "out_of_stock", productId }
4. Otherwise: 201 { status: "pending", total, itemCount }, where total is the sum of price × quantity rounded to 2 decimal places and itemCount is the sum of quantities.`,
        contextData: `catalog = ${JSON.stringify(CATALOG)}`,
        starterCode: `function solution(body, catalog) {
  // Your code here
  return { status: 201, body: {} };
}`,
        solutionCode: `function solution(body, catalog) {
  const items = body && body.items;
  const valid = Array.isArray(items) && items.length > 0 && items.every((i) => i && i.productId && Number.isInteger(i.quantity) && i.quantity >= 1);
  if (!valid) return { status: 400, body: { error: 'invalid_items' } };
  for (const i of items) {
    const p = catalog[i.productId];
    if (!p) return { status: 404, body: { error: 'product_not_found', productId: i.productId } };
    if (i.quantity > p.stock) return { status: 409, body: { error: 'out_of_stock', productId: i.productId } };
  }
  const total = Math.round(items.reduce((s, i) => s + catalog[i.productId].price * i.quantity, 0) * 100) / 100;
  return { status: 201, body: { status: 'pending', total, itemCount: items.reduce((s, i) => s + i.quantity, 0) } };
}`,
        testCases: [
          {
            id: 'tc-api-17',
            description: 'Creates a valid order with its total',
            input: JSON.stringify([{ items: [{ productId: 'p1', quantity: 2 }, { productId: 'p3', quantity: 4 }] }, CATALOG]),
            expectedOutput: JSON.stringify({ status: 201, body: { status: 'pending', total: 45, itemCount: 6 } }),
          },
          {
            id: 'tc-api-18',
            description: 'Rejects an order with no items',
            input: JSON.stringify([{ items: [] }, CATALOG]),
            expectedOutput: JSON.stringify({ status: 400, body: { error: 'invalid_items' } }),
          },
          {
            id: 'tc-api-19',
            description: 'Rejects a fractional quantity',
            input: JSON.stringify([{ items: [{ productId: 'p3', quantity: 1.5 }] }, CATALOG]),
            expectedOutput: JSON.stringify({ status: 400, body: { error: 'invalid_items' } }),
          },
          {
            id: 'tc-api-20',
            description: 'Rejects a body without items',
            input: JSON.stringify([{}, CATALOG]),
            expectedOutput: JSON.stringify({ status: 400, body: { error: 'invalid_items' } }),
          },
          {
            id: 'tc-api-21',
            description: 'Names the unknown product',
            input: JSON.stringify([{ items: [{ productId: 'p1', quantity: 1 }, { productId: 'p9', quantity: 1 }] }, CATALOG]),
            expectedOutput: JSON.stringify({ status: 404, body: { error: 'product_not_found', productId: 'p9' } }),
          },
          {
            id: 'tc-api-22',
            description: 'Refuses more than the stock',
            input: JSON.stringify([{ items: [{ productId: 'p2', quantity: 1 }] }, CATALOG]),
            expectedOutput: JSON.stringify({ status: 409, body: { error: 'out_of_stock', productId: 'p2' } }),
          },
        ],
        timeLimitMinutes: 7,
        weight: 35,
      },
      {
        id: 'q-api-4',
        title: 'Cursor Pagination for GET /products',
        type: 'code',
        prompt: `Write 'function solution(items, query)' for GET /products. 'items' is every product, sorted by id. Return { status, body }.

- query.limit is optional. Missing means 20; above 100 means 100. Below 1 or not a whole number: 400 { error: "invalid_limit" }
- query.cursor is optional: the id of the last product the client already has. Return the products after it.
- Respond 200 { data, nextCursor }. nextCursor is the id of the last product in data, or null when there are no more products after it.`,
        starterCode: `function solution(items, query) {
  // Your code here
}`,
        solutionCode: `function solution(items, query) {
  let limit = query.limit === undefined ? 20 : query.limit;
  if (!Number.isInteger(limit) || limit < 1) return { status: 400, body: { error: 'invalid_limit' } };
  limit = Math.min(limit, 100);
  const after = query.cursor === undefined ? items : items.filter((i) => i.id > query.cursor);
  const data = after.slice(0, limit);
  const nextCursor = after.length > limit ? data[data.length - 1].id : null;
  return { status: 200, body: { data, nextCursor } };
}`,
        testCases: [
          {
            id: 'tc-api-23',
            description: 'First page uses the default limit of 20',
            input: JSON.stringify([ITEMS, {}]),
            expectedOutput: JSON.stringify({ status: 200, body: { data: idRange(1, 20), nextCursor: 20 } }),
          },
          {
            id: 'tc-api-24',
            description: 'Continues after the cursor',
            input: JSON.stringify([ITEMS, { limit: 5, cursor: 40 }]),
            expectedOutput: JSON.stringify({ status: 200, body: { data: idRange(41, 45), nextCursor: 45 } }),
          },
          {
            id: 'tc-api-25',
            description: 'Caps the limit at 100',
            input: JSON.stringify([ITEMS, { limit: 500, cursor: 100 }]),
            expectedOutput: JSON.stringify({ status: 200, body: { data: idRange(101, 200), nextCursor: 200 } }),
          },
          {
            id: 'tc-api-26',
            description: 'Last page has no next cursor',
            input: JSON.stringify([ITEMS, { limit: 50, cursor: 200 }]),
            expectedOutput: JSON.stringify({ status: 200, body: { data: idRange(201, 250), nextCursor: null } }),
          },
          {
            id: 'tc-api-27',
            description: 'Rejects a limit of 0',
            input: JSON.stringify([ITEMS, { limit: 0 }]),
            expectedOutput: JSON.stringify({ status: 400, body: { error: 'invalid_limit' } }),
          },
        ],
        timeLimitMinutes: 6,
        weight: 25,
      },
    ],
  },
  {
    id: 'test-db-01',
    title: 'Database Design: Twitter-like App',
    category: 'Databases',
    difficulty: 'Professional',
    type: 'standard',
    description: 'Design the schema for a social app in SQL: users and tweets, follows, likes and hashtags, with the constraints and indexes that keep the data correct and fast.',
    estimatedMinutes: 20,
    passingScore: 70,
    totalQuestions: 4,
    skillsTested: ['Database Design', 'Constraints & Integrity', 'Indexing'],
    roles: ['Backend Engineer', 'Full Stack Engineer', 'Data Engineer'],
    questions: [
      {
        id: 'q-db-1',
        title: 'Users and Tweets',
        type: 'schema',
        prompt: `Write CREATE TABLE statements for 'users' and 'tweets' (SQLite).

users: id (integer primary key), username, display_name, created_at
tweets: id (integer primary key), user_id, body, created_at

The database must enforce:
- Every user has a username, and no two users share one
- Every tweet belongs to a user that exists
- A tweet's body is 1 to 280 characters
- created_at is filled in automatically when not given

Foreign keys are switched on. Each check runs inserts against your schema; some must be accepted, some rejected.`,
        starterCode: `CREATE TABLE users (
  id INTEGER PRIMARY KEY
  -- ...
);

CREATE TABLE tweets (
  id INTEGER PRIMARY KEY
  -- ...
);`,
        testCases: [
          { id: 'tc-db-1', description: 'Accepts a user and a tweet', input: ONE_TWEET, expectedOutput: 'accepted' },
          {
            id: 'tc-db-2',
            description: 'Rejects a duplicate username',
            input: `${TWO_USERS} INSERT INTO users (id, username) VALUES (3, 'ada')`,
            expectedOutput: 'rejected',
          },
          { id: 'tc-db-3', description: 'Rejects a user without a username', input: `INSERT INTO users (id) VALUES (1)`, expectedOutput: 'rejected' },
          {
            id: 'tc-db-4',
            description: "Rejects a tweet from a user that doesn't exist",
            input: `${TWO_USERS} INSERT INTO tweets (id, user_id, body) VALUES (1, 99, 'Who am I')`,
            expectedOutput: 'rejected',
          },
          {
            id: 'tc-db-5',
            description: 'Rejects an empty tweet',
            input: `${TWO_USERS} INSERT INTO tweets (id, user_id, body) VALUES (1, 1, '')`,
            expectedOutput: 'rejected',
          },
          {
            id: 'tc-db-6',
            description: 'Rejects a 281-character tweet',
            input: `${TWO_USERS} INSERT INTO tweets (id, user_id, body) VALUES (1, 1, replace(hex(zeroblob(281)), '00', 'x'))`,
            expectedOutput: 'rejected',
          },
          {
            id: 'tc-db-7',
            description: 'Accepts a 280-character tweet',
            input: `${TWO_USERS} INSERT INTO tweets (id, user_id, body) VALUES (1, 1, replace(hex(zeroblob(280)), '00', 'x'))`,
            expectedOutput: 'accepted',
          },
          {
            id: 'tc-db-8',
            description: 'Fills in created_at',
            input: `${ONE_TWEET} SELECT created_at IS NOT NULL AS has_time FROM tweets`,
            expectedOutput: JSON.stringify([{ has_time: 1 }]),
          },
        ],
        timeLimitMinutes: 6,
        weight: 30,
      },
      {
        id: 'q-db-2',
        title: 'Follows',
        type: 'schema',
        prompt: `Add a 'follows' table with follower_id, followee_id and created_at.

The database must enforce:
- Both sides are users that exist
- Following someone twice is impossible
- Nobody can follow themselves
- Two people can follow each other

The users and tweets tables are written for you.`,
        starterCode: `${USERS_AND_TWEETS}

CREATE TABLE follows (
  -- ...
);`,
        testCases: [
          {
            id: 'tc-db-9',
            description: 'Accepts a follow',
            input: `${TWO_USERS} INSERT INTO follows (follower_id, followee_id) VALUES (1, 2)`,
            expectedOutput: 'accepted',
          },
          {
            id: 'tc-db-10',
            description: 'Accepts following each other',
            input: `${TWO_USERS} INSERT INTO follows (follower_id, followee_id) VALUES (1, 2); INSERT INTO follows (follower_id, followee_id) VALUES (2, 1)`,
            expectedOutput: 'accepted',
          },
          {
            id: 'tc-db-11',
            description: 'Rejects following someone twice',
            input: `${TWO_USERS} INSERT INTO follows (follower_id, followee_id) VALUES (1, 2); INSERT INTO follows (follower_id, followee_id) VALUES (1, 2)`,
            expectedOutput: 'rejected',
          },
          {
            id: 'tc-db-12',
            description: 'Rejects following yourself',
            input: `${TWO_USERS} INSERT INTO follows (follower_id, followee_id) VALUES (1, 1)`,
            expectedOutput: 'rejected',
          },
          {
            id: 'tc-db-13',
            description: "Rejects following a user that doesn't exist",
            input: `${TWO_USERS} INSERT INTO follows (follower_id, followee_id) VALUES (1, 99)`,
            expectedOutput: 'rejected',
          },
        ],
        timeLimitMinutes: 4,
        weight: 20,
      },
      {
        id: 'q-db-3',
        title: 'Likes',
        type: 'schema',
        prompt: `Add a 'likes' table with user_id, tweet_id and created_at.

The database must enforce:
- A user can like a tweet only once
- Likes point at users and tweets that exist
- Deleting a tweet deletes its likes

The users and tweets tables are written for you.`,
        starterCode: `${USERS_AND_TWEETS}

CREATE TABLE likes (
  -- ...
);`,
        testCases: [
          {
            id: 'tc-db-14',
            description: 'Accepts two users liking the same tweet',
            input: `${ONE_TWEET} INSERT INTO likes (user_id, tweet_id) VALUES (1, 1); INSERT INTO likes (user_id, tweet_id) VALUES (2, 1)`,
            expectedOutput: 'accepted',
          },
          {
            id: 'tc-db-15',
            description: 'Rejects liking a tweet twice',
            input: `${ONE_TWEET} INSERT INTO likes (user_id, tweet_id) VALUES (2, 1); INSERT INTO likes (user_id, tweet_id) VALUES (2, 1)`,
            expectedOutput: 'rejected',
          },
          {
            id: 'tc-db-16',
            description: "Rejects liking a tweet that doesn't exist",
            input: `${ONE_TWEET} INSERT INTO likes (user_id, tweet_id) VALUES (2, 42)`,
            expectedOutput: 'rejected',
          },
          {
            id: 'tc-db-17',
            description: "Deleting a tweet deletes its likes",
            input: `${ONE_TWEET} INSERT INTO likes (user_id, tweet_id) VALUES (2, 1); DELETE FROM tweets WHERE id = 1; SELECT COUNT(*) AS likes FROM likes`,
            expectedOutput: JSON.stringify([{ likes: 0 }]),
          },
        ],
        timeLimitMinutes: 4,
        weight: 20,
      },
      {
        id: 'q-db-4',
        title: 'Hashtags and a Fast Profile Timeline',
        type: 'schema',
        prompt: `Tweets can carry hashtags. Add:
- 'hashtags' with id and tag (stored without the #). Tags are unique ignoring case: "SQL" and "sql" are the same tag.
- 'tweet_hashtags' linking tweet_id to hashtag_id. A tweet carries each tag at most once, and both sides must exist.

A profile page runs this query constantly:
  SELECT * FROM tweets WHERE user_id = ? ORDER BY created_at DESC
Add the index that serves it without sorting.

The users and tweets tables are written for you.`,
        starterCode: `${USERS_AND_TWEETS}

CREATE TABLE hashtags (
  -- ...
);

CREATE TABLE tweet_hashtags (
  -- ...
);

-- CREATE INDEX ...`,
        testCases: [
          {
            id: 'tc-db-18',
            description: 'Accepts tagging a tweet',
            input: `${ONE_TWEET} INSERT INTO hashtags (id, tag) VALUES (1, 'sql'); INSERT INTO tweet_hashtags (tweet_id, hashtag_id) VALUES (1, 1)`,
            expectedOutput: 'accepted',
          },
          {
            id: 'tc-db-19',
            description: 'Rejects the same tag in different case',
            input: `INSERT INTO hashtags (id, tag) VALUES (1, 'sql'); INSERT INTO hashtags (id, tag) VALUES (2, 'SQL')`,
            expectedOutput: 'rejected',
          },
          {
            id: 'tc-db-20',
            description: 'Rejects tagging a tweet twice with one tag',
            input: `${ONE_TWEET} INSERT INTO hashtags (id, tag) VALUES (1, 'sql'); INSERT INTO tweet_hashtags (tweet_id, hashtag_id) VALUES (1, 1); INSERT INTO tweet_hashtags (tweet_id, hashtag_id) VALUES (1, 1)`,
            expectedOutput: 'rejected',
          },
          {
            id: 'tc-db-21',
            description: "Rejects tagging a tweet that doesn't exist",
            input: `INSERT INTO hashtags (id, tag) VALUES (1, 'sql'); INSERT INTO tweet_hashtags (tweet_id, hashtag_id) VALUES (7, 1)`,
            expectedOutput: 'rejected',
          },
          {
            id: 'tc-db-22',
            description: 'Has an index on tweets (user_id, created_at)',
            input: `SELECT COUNT(*) > 0 AS has_index FROM pragma_index_list('tweets') il WHERE (SELECT name FROM pragma_index_info(il.name) WHERE seqno = 0) = 'user_id' AND (SELECT name FROM pragma_index_info(il.name) WHERE seqno = 1) = 'created_at'`,
            expectedOutput: JSON.stringify([{ has_index: 1 }]),
          },
        ],
        timeLimitMinutes: 6,
        weight: 30,
      },
    ],
  },

  // ===================== QA Engineer =====================
  {
    id: 'test-qasql-01',
    title: 'SQL for Testing: Validating Shop Data',
    category: 'Quality Assurance',
    difficulty: 'Junior',
    type: 'standard',
    description: "Query a shop's database to prove what's broken: orphaned rows, totals that don't add up, duplicate accounts and orders in impossible states.",
    estimatedMinutes: 18,
    passingScore: 70,
    totalQuestions: 4,
    skillsTested: ['SQL for Testing', 'Data Validation', 'Data Integrity'],
    roles: ['QA Engineer', 'Data Analyst'],
    questions: [
      {
        id: 'q-qasql-1',
        title: 'Orphaned Order Items',
        type: 'sql',
        prompt: `Find order items whose order doesn't exist.

Order by item id.

Target columns: id, order_id`,
        contextData: `Table: shop_order_items (id INT, order_id INT, product TEXT, quantity INT, unit_price REAL)
Table: shop_orders (id INT, customer_id INT, status TEXT, total REAL, placed_at TEXT, shipped_at TEXT)`,
        starterCode: `SELECT
FROM shop_order_items i;`,
        solutionCode: `SELECT i.id, i.order_id
FROM shop_order_items i
LEFT JOIN shop_orders o ON o.id = i.order_id
WHERE o.id IS NULL
ORDER BY i.id;`,
        testCases: [{ id: 'tc-qasql-1', description: 'Every item pointing at a missing order', input: '', expectedOutput: '' }],
        timeLimitMinutes: 4,
        weight: 25,
      },
      {
        id: 'q-qasql-2',
        title: "Totals That Don't Add Up",
        type: 'sql',
        prompt: `An order's total should equal the sum of quantity × unit_price over its items. Find orders where it doesn't, to the penny. (Prices are stored as floating point, so compare with a tolerance or after rounding.)

Only consider orders that have items. Order by order id.

Target columns: id, total, items_total (rounded to 2 decimal places)`,
        contextData: `Table: shop_orders (id INT, customer_id INT, status TEXT, total REAL, placed_at TEXT, shipped_at TEXT)
Table: shop_order_items (id INT, order_id INT, product TEXT, quantity INT, unit_price REAL)`,
        starterCode: `SELECT
FROM shop_orders o
JOIN shop_order_items i ON ...;`,
        solutionCode: `SELECT o.id, o.total, ROUND(SUM(i.quantity * i.unit_price), 2) AS items_total
FROM shop_orders o
JOIN shop_order_items i ON i.order_id = o.id
GROUP BY o.id
HAVING ABS(o.total - SUM(i.quantity * i.unit_price)) > 0.005
ORDER BY o.id;`,
        testCases: [{ id: 'tc-qasql-2', description: 'Orders whose total differs from their items', input: '', expectedOutput: '' }],
        timeLimitMinutes: 5,
        weight: 25,
      },
      {
        id: 'q-qasql-3',
        title: 'Duplicate Accounts',
        type: 'sql',
        prompt: `Emails should be unique regardless of case, but the signup form didn't enforce it. Find every email (lowercased) used by more than one customer, with how many accounts use it.

Order by email.

Target columns: email, accounts`,
        contextData: `Table: shop_customers (id INT, name TEXT, email TEXT)`,
        starterCode: `SELECT
FROM shop_customers;`,
        solutionCode: `SELECT LOWER(email) AS email, COUNT(*) AS accounts
FROM shop_customers
GROUP BY LOWER(email)
HAVING COUNT(*) > 1
ORDER BY email;`,
        testCases: [{ id: 'tc-qasql-3', description: 'Every email shared by several accounts', input: '', expectedOutput: '' }],
        timeLimitMinutes: 3,
        weight: 20,
      },
      {
        id: 'q-qasql-4',
        title: 'Orders in Impossible States',
        type: 'sql',
        prompt: `Find orders whose status contradicts their dates:
- 'shipped' or 'delivered' orders with no shipped_at, or shipped before they were placed
- 'pending' orders that have a shipped_at

Order by id.

Target columns: id`,
        contextData: `Table: shop_orders (id INT, customer_id INT, status TEXT, total REAL, placed_at TEXT, shipped_at TEXT)`,
        starterCode: `SELECT id
FROM shop_orders
WHERE ...;`,
        solutionCode: `SELECT id
FROM shop_orders
WHERE (status IN ('shipped', 'delivered') AND (shipped_at IS NULL OR shipped_at < placed_at))
   OR (status = 'pending' AND shipped_at IS NOT NULL)
ORDER BY id;`,
        testCases: [{ id: 'tc-qasql-4', description: 'Every order whose status and dates disagree', input: '', expectedOutput: '' }],
        timeLimitMinutes: 6,
        weight: 30,
      },
    ],
  },
  {
    id: 'test-qatc-01',
    title: 'Test Case Writing: Catch the Bugs',
    category: 'Quality Assurance',
    difficulty: 'Beginner',
    type: 'standard',
    description: 'Write test cases from a spec. Your cases run against a correct implementation and against hidden buggy ones: score comes from the bugs your tests catch.',
    estimatedMinutes: 20,
    passingScore: 70,
    totalQuestions: 4,
    skillsTested: ['Test Case Design', 'Boundary Value Analysis', 'Equivalence Partitioning'],
    roles: ['QA Engineer'],
    questions: [
      {
        id: 'q-qatc-1',
        title: 'Discount Codes',
        type: 'code',
        prompt: `Write test cases for 'applyDiscount(price, code)'. The spec:

- "SAVE10" takes 10% off any price
- "SAVE20" takes 20% off, but only when the price is 50 or more
- Codes are not case-sensitive
- Any other code (or no code) leaves the price unchanged
- The result is rounded to 2 decimal places
- A negative price throws an error

Return an array of cases, each [price, code, expected]. Use "throws" as the expected value when the call should throw.

Every case must pass on a correct implementation. You score for each hidden buggy version your cases catch.`,
        starterCode: `function solution() {
  return [
    [100, 'SAVE10', 90],
    // more cases...
  ];
}`,
        harness: testCaseHarness(`
  correct: (price, code) => {
    if (price < 0) throw new Error('negative price');
    const c = String(code || '').toUpperCase();
    let p = price;
    if (c === 'SAVE10') p = price * 0.9;
    else if (c === 'SAVE20' && price >= 50) p = price * 0.8;
    return Math.round(p * 100) / 100;
  },
  caseSensitive: (price, code) => {
    if (price < 0) throw new Error('negative price');
    const c = String(code || '');
    let p = price;
    if (c === 'SAVE10') p = price * 0.9;
    else if (c === 'SAVE20' && price >= 50) p = price * 0.8;
    return Math.round(p * 100) / 100;
  },
  thresholdExclusive: (price, code) => {
    if (price < 0) throw new Error('negative price');
    const c = String(code || '').toUpperCase();
    let p = price;
    if (c === 'SAVE10') p = price * 0.9;
    else if (c === 'SAVE20' && price > 50) p = price * 0.8;
    return Math.round(p * 100) / 100;
  },
  noRounding: (price, code) => {
    if (price < 0) throw new Error('negative price');
    const c = String(code || '').toUpperCase();
    if (c === 'SAVE10') return price * 0.9;
    if (c === 'SAVE20' && price >= 50) return price * 0.8;
    return price;
  },
  negativeAllowed: (price, code) => {
    const c = String(code || '').toUpperCase();
    let p = price;
    if (c === 'SAVE10') p = price * 0.9;
    else if (c === 'SAVE20' && price >= 50) p = price * 0.8;
    return Math.round(p * 100) / 100;
  },
  noMinimum: (price, code) => {
    if (price < 0) throw new Error('negative price');
    const c = String(code || '').toUpperCase();
    let p = price;
    if (c === 'SAVE10') p = price * 0.9;
    else if (c === 'SAVE20') p = price * 0.8;
    return Math.round(p * 100) / 100;
  },`),
        testCases: [
          correctCase('tc-qatc-1', 'Your cases pass on the correct implementation'),
          caughtCase('tc-qatc-2', 'caseSensitive', 'Catches a bug: lowercase codes ignored'),
          caughtCase('tc-qatc-3', 'thresholdExclusive', 'Catches a bug at the SAVE20 minimum'),
          caughtCase('tc-qatc-4', 'noRounding', 'Catches a bug: results not rounded'),
          caughtCase('tc-qatc-5', 'negativeAllowed', 'Catches a bug: negative prices accepted'),
          caughtCase('tc-qatc-6', 'noMinimum', 'Catches a bug: SAVE20 below the minimum'),
        ],
        timeLimitMinutes: 6,
        weight: 30,
      },
      {
        id: 'q-qatc-2',
        title: 'Password Rules',
        type: 'code',
        prompt: `Write test cases for 'isStrongPassword(password)', which returns true or false. A strong password:

- is at least 12 characters long
- has at least one uppercase letter, one lowercase letter and one digit
- contains no spaces

Return an array of cases, each [password, expected].`,
        starterCode: `function solution() {
  return [
    ['Abcdefgh1234', true],
    // more cases...
  ];
}`,
        harness: testCaseHarness(`
  correct: (pw) => pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && !/\\s/.test(pw),
  lengthExclusive: (pw) => pw.length > 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && !/\\s/.test(pw),
  shortAllowed: (pw) => pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) && !/\\s/.test(pw),
  noDigitCheck: (pw) => pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && !/\\s/.test(pw),
  noUpperCheck: (pw) => pw.length >= 12 && /[a-z]/.test(pw) && /[0-9]/.test(pw) && !/\\s/.test(pw),
  spacesAllowed: (pw) => pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw),`),
        testCases: [
          correctCase('tc-qatc-7', 'Your cases pass on the correct implementation'),
          caughtCase('tc-qatc-8', 'lengthExclusive', 'Catches a bug at exactly 12 characters'),
          caughtCase('tc-qatc-9', 'shortAllowed', 'Catches a bug: short passwords allowed'),
          caughtCase('tc-qatc-10', 'noDigitCheck', 'Catches a bug: digit not required'),
          caughtCase('tc-qatc-11', 'noUpperCheck', 'Catches a bug: uppercase not required'),
          caughtCase('tc-qatc-12', 'spacesAllowed', 'Catches a bug: spaces allowed'),
        ],
        timeLimitMinutes: 4,
        weight: 20,
      },
      {
        id: 'q-qatc-3',
        title: 'Shipping Bands',
        type: 'code',
        prompt: `Write test cases for 'shippingCost(weightKg)'. The spec:

- Over 0 kg up to and including 1 kg: 4.99
- Over 1 kg up to and including 5 kg: 7.99
- Over 5 kg up to and including 20 kg: 14.99
- 0 kg or less, over 20 kg, or anything that isn't a number: throws

Return an array of cases, each [weightKg, expected]. Use "throws" when the call should throw. Think about the edges of each band.`,
        starterCode: `function solution() {
  return [
    [3, 7.99],
    // more cases...
  ];
}`,
        harness: testCaseHarness(`
  correct: (w) => {
    if (typeof w !== 'number' || Number.isNaN(w) || w <= 0 || w > 20) throw new Error('invalid weight');
    return w <= 1 ? 4.99 : w <= 5 ? 7.99 : 14.99;
  },
  firstBandExclusive: (w) => {
    if (typeof w !== 'number' || Number.isNaN(w) || w <= 0 || w > 20) throw new Error('invalid weight');
    return w < 1 ? 4.99 : w <= 5 ? 7.99 : 14.99;
  },
  secondBandExclusive: (w) => {
    if (typeof w !== 'number' || Number.isNaN(w) || w <= 0 || w > 20) throw new Error('invalid weight');
    return w <= 1 ? 4.99 : w < 5 ? 7.99 : 14.99;
  },
  zeroAllowed: (w) => {
    if (typeof w !== 'number' || Number.isNaN(w) || w < 0 || w > 20) throw new Error('invalid weight');
    return w <= 1 ? 4.99 : w <= 5 ? 7.99 : 14.99;
  },
  heavyAllowed: (w) => {
    if (typeof w !== 'number' || Number.isNaN(w) || w <= 0) throw new Error('invalid weight');
    return w <= 1 ? 4.99 : w <= 5 ? 7.99 : 14.99;
  },
  stringsAllowed: (w) => {
    if (w <= 0 || w > 20) throw new Error('invalid weight');
    return w <= 1 ? 4.99 : w <= 5 ? 7.99 : 14.99;
  },`),
        testCases: [
          correctCase('tc-qatc-13', 'Your cases pass on the correct implementation'),
          caughtCase('tc-qatc-14', 'firstBandExclusive', 'Catches a bug at the 1 kg edge'),
          caughtCase('tc-qatc-15', 'secondBandExclusive', 'Catches a bug at the 5 kg edge'),
          caughtCase('tc-qatc-16', 'zeroAllowed', 'Catches a bug: 0 kg accepted'),
          caughtCase('tc-qatc-17', 'heavyAllowed', 'Catches a bug: over 20 kg accepted'),
          caughtCase('tc-qatc-18', 'stringsAllowed', 'Catches a bug: non-numbers accepted'),
        ],
        timeLimitMinutes: 5,
        weight: 25,
      },
      {
        id: 'q-qatc-4',
        title: 'Splitting a Bill',
        type: 'code',
        prompt: `Write test cases for 'splitBill(totalPence, people)', which splits a bill fairly in whole pence. The spec:

- Returns an array with one amount per person, adding up exactly to totalPence
- Everyone pays totalPence / people rounded down; the leftover pence go one each to the first people in the list. So splitBill(1000, 3) is [334, 333, 333]
- people must be a whole number of at least 1, and totalPence can't be negative; otherwise it throws

Return an array of cases, each [totalPence, people, expected].`,
        starterCode: `function solution() {
  return [
    [900, 3, [300, 300, 300]],
    // more cases...
  ];
}`,
        harness: testCaseHarness(`
  correct: (total, people) => {
    if (!Number.isInteger(people) || people < 1 || total < 0) throw new Error('invalid');
    const base = Math.floor(total / people);
    return Array.from({ length: people }, (_, i) => base + (i < total % people ? 1 : 0));
  },
  remainderLost: (total, people) => {
    if (!Number.isInteger(people) || people < 1 || total < 0) throw new Error('invalid');
    return Array.from({ length: people }, () => Math.floor(total / people));
  },
  remainderToLast: (total, people) => {
    if (!Number.isInteger(people) || people < 1 || total < 0) throw new Error('invalid');
    const base = Math.floor(total / people);
    return Array.from({ length: people }, (_, i) => base + (i >= people - (total % people) ? 1 : 0));
  },
  roundsEach: (total, people) => {
    if (!Number.isInteger(people) || people < 1 || total < 0) throw new Error('invalid');
    return Array.from({ length: people }, () => Math.round(total / people));
  },
  zeroPeople: (total, people) => {
    if (people < 0 || total < 0) throw new Error('invalid');
    const base = Math.floor(total / people);
    return Array.from({ length: people }, (_, i) => base + (i < total % people ? 1 : 0));
  },`),
        testCases: [
          correctCase('tc-qatc-19', 'Your cases pass on the correct implementation'),
          caughtCase('tc-qatc-20', 'remainderLost', 'Catches a bug: leftover pence lost'),
          caughtCase('tc-qatc-21', 'remainderToLast', 'Catches a bug: leftover pence to the wrong people'),
          caughtCase('tc-qatc-22', 'roundsEach', 'Catches a bug: amounts rounded, not floored'),
          caughtCase('tc-qatc-23', 'zeroPeople', 'Catches a bug: zero people accepted'),
        ],
        timeLimitMinutes: 5,
        weight: 25,
      },
    ],
  },
  {
    id: 'test-qaapi-01',
    title: 'API Testing: Users, Auth & Pagination',
    category: 'Quality Assurance',
    difficulty: 'Professional',
    type: 'standard',
    description: 'Write automated checks against a live in-browser API. Your checks must pass on the real API and flag each broken version of it.',
    estimatedMinutes: 20,
    passingScore: 70,
    totalQuestions: 4,
    skillsTested: ['API Testing', 'HTTP', 'Contract Validation', 'Test Automation'],
    roles: ['QA Engineer', 'Backend Engineer'],
    questions: [
      {
        id: 'q-qaapi-1',
        title: 'GET /users/:id',
        type: 'code',
        prompt: `Write 'function solution(api)' that tests the endpoint below and returns an array of the problems it finds (empty if it behaves).

Call it like: const res = api('GET', '/users/1'); then read res.status and res.body.

The contract:
- GET /users/1 → 200 with body { id: 1, name, email }, where id is a number and name and email are strings
- GET /users/999 (doesn't exist) → 404 with body { error: "not_found" }
- GET /users/abc (not a number) → 400

Your checks must find no problems on the correct API, and at least one on each broken version.`,
        starterCode: `function solution(api) {
  const problems = [];
  const res = api('GET', '/users/1');
  if (res.status !== 200) problems.push('GET /users/1 should be 200, got ' + res.status);
  // more checks...
  return problems;
}`,
        harness: apiHarness(`
function __makeApi(bug) {
  const users = { 1: { id: 1, name: 'Ada', email: 'ada@example.com' }, 2: { id: 2, name: 'Grace', email: 'grace@example.com' } };
  return function api(method, path) {
    const m = method === 'GET' && path.match(/^\\/users\\/([^/]+)$/);
    if (!m) return { status: 404, body: { error: 'no_route' } };
    if (!/^\\d+$/.test(m[1])) return bug === 'badIdIs404' ? { status: 404, body: { error: 'not_found' } } : { status: 400, body: { error: 'invalid_id' } };
    const u = users[m[1]];
    if (!u) return bug === 'missingIs200' ? { status: 200, body: null } : { status: 404, body: { error: 'not_found' } };
    const body = { ...u };
    if (bug === 'idAsString') body.id = String(u.id);
    if (bug === 'noEmail') delete body.email;
    return { status: 200, body };
  };
}`),
        testCases: [
          correctCase('tc-qaapi-1', 'Finds no problems on the correct API'),
          caughtCase('tc-qaapi-2', 'missingIs200', 'Catches a bug: missing users return 200'),
          caughtCase('tc-qaapi-3', 'idAsString', 'Catches a bug: id is a string'),
          caughtCase('tc-qaapi-4', 'noEmail', 'Catches a bug: email missing'),
          caughtCase('tc-qaapi-5', 'badIdIs404', 'Catches a bug: invalid ids return 404'),
        ],
        timeLimitMinutes: 5,
        weight: 25,
      },
      {
        id: 'q-qaapi-2',
        title: 'POST /users',
        type: 'code',
        prompt: `Write 'function solution(api)' that tests user creation and returns the problems it finds.

Call it like: api('POST', '/users', { body: { name: 'Lin', email: 'lin@example.com' } })

The contract:
- A valid user → 201, body { id, name, email }, and a Location header (res.headers.location) of "/users/{id}". GET on that path then returns the user.
- Missing name → 400 { error: "name_required" }
- Email without an @ → 400 { error: "invalid_email" }
- An email already in use (ada@example.com exists), in any case → 409 { error: "email_taken" }

Each api you're given starts with only Ada in it.`,
        starterCode: `function solution(api) {
  const problems = [];
  const res = api('POST', '/users', { body: { name: 'Lin', email: 'lin@example.com' } });
  if (res.status !== 201) problems.push('Create should be 201, got ' + res.status);
  // more checks...
  return problems;
}`,
        harness: apiHarness(`
function __makeApi(bug) {
  const users = { 1: { id: 1, name: 'Ada', email: 'ada@example.com' } };
  let nextId = 2;
  return function api(method, path, options) {
    const body = (options && options.body) || {};
    if (method === 'POST' && path === '/users') {
      if (!body.name && bug !== 'nameOptional') return { status: 400, headers: {}, body: { error: 'name_required' } };
      if (!String(body.email || '').includes('@') && bug !== 'badEmailAccepted') return { status: 400, headers: {}, body: { error: 'invalid_email' } };
      const taken = Object.values(users).some((u) => u.email.toLowerCase() === String(body.email).toLowerCase());
      if (taken && bug !== 'duplicateAccepted') return { status: 409, headers: {}, body: { error: 'email_taken' } };
      const user = { id: nextId++, name: body.name, email: body.email };
      if (bug !== 'notSaved') users[user.id] = user;
      return { status: bug === 'createdIs200' ? 200 : 201, headers: bug === 'noLocation' ? {} : { location: '/users/' + user.id }, body: user };
    }
    const m = method === 'GET' && path.match(/^\\/users\\/(\\d+)$/);
    if (m && users[m[1]]) return { status: 200, headers: {}, body: users[m[1]] };
    return { status: 404, headers: {}, body: { error: 'not_found' } };
  };
}`),
        testCases: [
          correctCase('tc-qaapi-6', 'Finds no problems on the correct API'),
          caughtCase('tc-qaapi-7', 'createdIs200', 'Catches a bug: create returns 200'),
          caughtCase('tc-qaapi-8', 'noLocation', 'Catches a bug: no Location header'),
          caughtCase('tc-qaapi-9', 'notSaved', "Catches a bug: created user isn't saved"),
          caughtCase('tc-qaapi-10', 'nameOptional', 'Catches a bug: name not required'),
          caughtCase('tc-qaapi-11', 'badEmailAccepted', 'Catches a bug: invalid email accepted'),
          caughtCase('tc-qaapi-12', 'duplicateAccepted', 'Catches a bug: duplicate email accepted'),
        ],
        timeLimitMinutes: 6,
        weight: 30,
      },
      {
        id: 'q-qaapi-3',
        title: 'Authorisation on GET /orders/:id',
        type: 'code',
        prompt: `Write 'function solution(api)' that tests access control and returns the problems it finds.

Send a token like: api('GET', '/orders/10', { headers: { authorization: 'Bearer alice-token' } })

Valid tokens are "alice-token" and "bob-token". Order 10 belongs to Alice. The contract:
- No authorization header → 401
- An unknown token → 401
- Bob asking for Alice's order → 403
- Alice asking for her own order → 200 with body { id: 10, owner: "alice", total }`,
        starterCode: `function solution(api) {
  const problems = [];
  const asAlice = { headers: { authorization: 'Bearer alice-token' } };
  const res = api('GET', '/orders/10', asAlice);
  if (res.status !== 200) problems.push('Alice should see her order, got ' + res.status);
  // more checks...
  return problems;
}`,
        harness: apiHarness(`
function __makeApi(bug) {
  const orders = { 10: { id: 10, owner: 'alice', total: 42 } };
  const tokens = { 'alice-token': 'alice', 'bob-token': 'bob' };
  return function api(method, path, options) {
    const auth = (options && options.headers && options.headers.authorization) || '';
    const token = auth.replace(/^Bearer /, '');
    const m = method === 'GET' && path.match(/^\\/orders\\/(\\d+)$/);
    if (!m) return { status: 404, body: { error: 'not_found' } };
    if (!auth) return { status: bug === 'noTokenIs403' ? 403 : 401, body: { error: 'unauthenticated' } };
    const userName = tokens[token] || (bug === 'anyTokenAccepted' ? 'alice' : null);
    if (!userName) return { status: 401, body: { error: 'unauthenticated' } };
    const order = orders[m[1]];
    if (!order) return { status: 404, body: { error: 'not_found' } };
    if (order.owner !== userName && bug !== 'othersOrdersVisible') return { status: 403, body: { error: 'forbidden' } };
    return { status: 200, body: { ...order } };
  };
}`),
        testCases: [
          correctCase('tc-qaapi-13', 'Finds no problems on the correct API'),
          caughtCase('tc-qaapi-14', 'noTokenIs403', 'Catches a bug: no token returns 403'),
          caughtCase('tc-qaapi-15', 'anyTokenAccepted', 'Catches a bug: unknown tokens accepted'),
          caughtCase('tc-qaapi-16', 'othersOrdersVisible', "Catches a bug: users can read others' orders"),
        ],
        timeLimitMinutes: 4,
        weight: 20,
      },
      {
        id: 'q-qaapi-4',
        title: 'Paging Through GET /products',
        type: 'code',
        prompt: `Write 'function solution(api)' that tests pagination and returns the problems it finds.

The catalogue has 60 products. Call: api('GET', '/products?limit=10&cursor=20'). The contract:
- Body is { data: [{ id, name }], nextCursor }, with products in ascending id order
- limit defaults to 10, and is capped at 50
- limit below 1 → 400
- Passing each nextCursor back as cursor walks the whole catalogue: every product exactly once, and nextCursor is null on the last page

Stop any loop after 20 pages so a broken API can't trap you.`,
        starterCode: `function solution(api) {
  const problems = [];
  const first = api('GET', '/products');
  if (first.body.data.length !== 10) problems.push('Default page size should be 10, got ' + first.body.data.length);
  // more checks...
  return problems;
}`,
        harness: apiHarness(`
function __makeApi(bug) {
  const products = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, name: 'Product ' + (i + 1) }));
  return function api(method, path) {
    const [route, qs = ''] = path.split('?');
    if (method !== 'GET' || route !== '/products') return { status: 404, body: { error: 'not_found' } };
    const q = Object.fromEntries(qs.split('&').filter(Boolean).map((p) => p.split('=')));
    let limit = q.limit === undefined ? (bug === 'defaultTwenty' ? 20 : 10) : Number(q.limit);
    if (!Number.isInteger(limit) || limit < 1) return bug === 'zeroLimitIs500' ? { status: 500, body: { error: 'server_error' } } : { status: 400, body: { error: 'invalid_limit' } };
    if (bug !== 'noCap') limit = Math.min(limit, 50);
    const cursor = q.cursor === undefined ? 0 : Number(q.cursor);
    const start = bug === 'overlap' ? cursor - 1 : bug === 'skips' ? cursor + 1 : cursor;
    const after = products.filter((p) => p.id > Math.max(0, start));
    const data = after.slice(0, limit);
    const nextCursor = after.length > limit ? data[data.length - 1].id : null;
    return { status: 200, body: { data, nextCursor: nextCursor === null ? null : String(nextCursor) } };
  };
}`),
        testCases: [
          correctCase('tc-qaapi-17', 'Finds no problems on the correct API'),
          caughtCase('tc-qaapi-18', 'defaultTwenty', 'Catches a bug: wrong default page size'),
          caughtCase('tc-qaapi-19', 'noCap', "Catches a bug: limit isn't capped"),
          caughtCase('tc-qaapi-20', 'zeroLimitIs500', 'Catches a bug: bad limit crashes the server'),
          caughtCase('tc-qaapi-21', 'overlap', 'Catches a bug: pages overlap'),
          caughtCase('tc-qaapi-22', 'skips', 'Catches a bug: products skipped between pages'),
        ],
        timeLimitMinutes: 5,
        weight: 25,
      },
    ],
  },
];
