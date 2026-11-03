import { choice, match, multi, order } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';

// ---------- Test Case Writing ----------
export const QA_CASES_MODULE: ModuleSkeleton = {
  familyId: 'test-qatc-01',
  aspects: [
    { id: 'design', name: 'Test Design Techniques', summary: 'Boundaries, equivalence classes and choosing the cases that matter.' },
    { id: 'coverage', name: 'Writing Test Cases', summary: 'Turning a spec into cases that catch real bugs, edge cases included.' },
    { id: 'bugs', name: 'Bug Reporting', summary: 'Reports developers can act on, severity and priority, and a bug’s life.' },
    { id: 'automation', name: 'Automation & Flakiness', summary: 'What to automate, keeping tests reliable, and the test pyramid.' },
    { id: 'strategy', name: 'Test Strategy & Risk', summary: 'Where to spend limited time, and deciding when it’s ready to ship.' },
  ],
  tags: {
    'x-qatc-1': ['design', B],
    'q-qatc-1': ['design', B],
    'q-qatc-3': ['design', J],
    'x-qatc-2': ['design', J],
    'q-qatc-2': ['coverage', B],
    'q-qatc-4': ['coverage', J],
    'x-qatc-5': ['coverage', J],
    'x-qatc-3': ['bugs', B],
    'x-qatc-6': ['bugs', B],
    'x-qatc-4': ['automation', J],
  },
  // A Beginner test is about writing the cases themselves; the main version is Beginner
  passingScores: { Beginner: 70 },
  bank: [
    ...tagged(
      'design',
      P,
      choice(
        'm-qatc-design-p1',
        'Too Many Combinations',
        'A checkout has 4 payment methods, 3 delivery options, 5 countries and 2 account types: 120 combinations. You have time for about 20 tests. Which technique fits?',
        [
          'Pairwise testing: cover every pair of values at least once, which most interaction bugs need',
          'Test the first 20 combinations in the list',
          'Test only the most popular combination 20 times',
          'Skip combinations and test each option on its own',
        ],
        0
      )
    ),
    ...tagged(
      'design',
      S,
      choice(
        'm-qatc-design-s1',
        'Testing a Workflow',
        'An insurance claim moves between Draft, Submitted, In Review, Approved, Rejected and Paid, with rules for each move. Which technique finds missing or illegal moves best?',
        [
          'State-transition testing: map every state and allowed transition, then test each transition and the disallowed ones',
          'Boundary-value analysis on the claim amount',
          'Random clicking for an hour',
          'Testing only the happy path from Draft to Paid',
        ],
        0
      )
    ),
    ...tagged(
      'coverage',
      P,
      multi(
        'm-qatc-cov-p1',
        'Testing a Date Field',
        'A booking form takes a check-in date. Which cases are worth writing? Tick all that apply.',
        [
          '29 February in a leap year, and in a year that isn’t',
          'A check-out date before check-in',
          'Today, and a date in the past',
          'A booking that crosses a clocks-change weekend',
          'Ten random dates in June',
        ],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'coverage',
      S,
      choice(
        'm-qatc-cov-s1',
        'Full Coverage, Still Buggy',
        'The team has 95% line coverage, yet a rounding bug in refunds reached customers. What does that tell you?',
        [
          'Coverage shows code ran during tests, not that the tests checked the right results; look at assertions and the cases chosen',
          'The coverage tool is broken',
          'You need 100% coverage',
          'Refunds can’t be tested',
        ],
        0
      )
    ),
    ...tagged(
      'bugs',
      J,
      match('m-qatc-bugs-j1', 'Severity and Priority', 'Match each bug to its severity and priority.', [
        ['Checkout crashes for every user', 'High severity, high priority'],
        ['The CEO’s name is misspelt on the home page', 'Low severity, high priority'],
        ['A crash in a report one customer runs yearly', 'High severity, lower priority'],
        ['A slightly misaligned icon in settings', 'Low severity, low priority'],
      ])
    ),
    ...tagged(
      'bugs',
      P,
      choice(
        'm-qatc-bugs-p1',
        'Can’t Reproduce',
        'A developer closes your bug as “cannot reproduce”. It happens to you about one time in three. What do you do?',
        [
          'Gather what differs when it fails (data, timing, browser, logs, a recording), narrow the steps, and reopen with that evidence',
          'Reopen it with “still happening”',
          'Accept the closure',
          'Raise it as a higher severity so it gets attention',
        ],
        0
      )
    ),
    ...tagged(
      'bugs',
      S,
      choice(
        'm-qatc-bugs-s1',
        'The Same Bugs Again',
        'Each release, about a third of the bugs you find are in the same two areas. What is the most useful thing to do with that?',
        [
          'Raise it with the team with the data, find the root cause (design, missing tests, unclear specs) and agree a fix to the process',
          'Test those areas last, as you know what you will find',
          'Stop reporting bugs in those areas',
          'Log them as duplicates',
        ],
        0
      )
    ),
    ...tagged(
      'automation',
      B,
      choice(
        'm-qatc-auto-b1',
        'What to Automate First',
        'Which tests are best to automate first?',
        ['Ones run often that check stable behaviour, like login and checkout regression', 'A one-off check of a design that will change tomorrow', 'Exploratory testing of a new feature', 'Usability: whether the page feels easy'],
        0
      )
    ),
    ...tagged(
      'automation',
      P,
      order('m-qatc-auto-p1', 'The Test Pyramid', 'Order these from the most tests you should have to the fewest.', [
        'Unit tests',
        'Integration tests',
        'API tests',
        'End-to-end UI tests',
      ])
    ),
    ...tagged(
      'automation',
      S,
      choice(
        'm-qatc-auto-s1',
        'A Two-Hour Suite',
        'The end-to-end suite takes two hours and fails randomly a few times a week, so people rerun it until it passes. What do you do?',
        [
          'Quarantine flaky tests and fix their causes, push checks down to faster API and unit tests, and run the suite in parallel',
          'Rerun failures automatically three times and move on',
          'Delete the suite',
          'Run it only before major releases',
        ],
        0
      )
    ),
    ...tagged(
      'strategy',
      B,
      choice(
        'm-qatc-strat-b1',
        'Smoke Test',
        'What is a smoke test?',
        ['A quick check that the most important things work at all, before deeper testing', 'A test of every feature in full', 'A security test', 'A test run only on Fridays'],
        0
      )
    ),
    ...tagged(
      'strategy',
      J,
      choice(
        'm-qatc-strat-j1',
        'Regression',
        'A developer fixed a bug in tax calculation. What should you test?',
        ['The fix itself, plus the areas that use tax calculation, in case the change broke them', 'Only the exact bug', 'Nothing; developers test their own fixes', 'The whole app from scratch, every time'],
        0
      )
    ),
    ...tagged(
      'strategy',
      P,
      choice(
        'm-qatc-strat-p1',
        'Two Days Left',
        'Release is in two days and you can’t test everything. How do you choose?',
        [
          'By risk: what is most used, most changed, and most costly if it breaks, and say clearly what wasn’t tested',
          'Alphabetically by feature',
          'Test whatever is quickest first, to get through more',
          'Ask for the release to be delayed until everything is tested',
        ],
        0
      )
    ),
    ...tagged(
      'strategy',
      S,
      multi(
        'm-qatc-strat-s1',
        'Ready to Ship?',
        'You are asked whether a release is ready. What should your answer rest on? Tick all that apply.',
        [
          'Open bugs by severity, and whether any block release',
          'What was tested, and what wasn’t, against the risks',
          'Whether the release can be rolled back or switched off by a flag',
          'Monitoring in place to spot problems after release',
          'The number of test cases written',
        ],
        [0, 1, 2, 3]
      )
    ),
  ],
};

// ---------- API Testing ----------
export const QA_API_MODULE: ModuleSkeleton = {
  familyId: 'test-qaapi-01',
  aspects: [
    { id: 'basics', name: 'HTTP & Status Codes', summary: 'Requests, responses and what each status code should mean.' },
    { id: 'functional', name: 'Functional Checks', summary: 'Does each endpoint do what the spec says, for good and bad input.' },
    { id: 'auth', name: 'Auth & Security', summary: 'Who can see and change what, and the holes testers find first.' },
    { id: 'lists', name: 'Pagination & Lists', summary: 'Paged, filtered and sorted collections, and their edge cases.' },
    { id: 'strategy', name: 'Test Strategy & Isolation', summary: 'Independent tests, test data, contracts and priorities.' },
  ],
  tags: {
    'x-qaapi-2': ['basics', B],
    'q-qaapi-1': ['functional', J],
    'q-qaapi-2': ['functional', P],
    'x-qaapi-1': ['auth', J],
    'q-qaapi-3': ['auth', P],
    'x-qaapi-3': ['lists', J],
    'q-qaapi-4': ['lists', P],
    'x-qaapi-6': ['strategy', J],
    'x-qaapi-4': ['strategy', P],
    'x-qaapi-5': ['strategy', S],
  },
  bank: [
    ...tagged(
      'basics',
      J,
      choice(
        'm-qaapi-basics-j1',
        'A 200 With an Error',
        'POST /users with a missing email returns 200 with { "error": "email required" }. Is that a bug?',
        ['Yes: a validation failure should be a 4xx (400 or 422) so clients and monitoring can tell it failed', 'No, the message explains it', 'Only if the spec says so', 'No, 200 means the server received it'],
        0
      )
    ),
    ...tagged(
      'basics',
      P,
      multi(
        'm-qaapi-basics-p1',
        'Beyond the Status Code',
        'GET /orders/7 returns 200. What else should a good test check? Tick all that apply.',
        [
          'The body matches the schema: fields, types, required values',
          'The values are right for order 7',
          'The Content-Type header is application/json',
          'Response time is within the agreed limit',
          'The server’s CPU at the moment of the call',
        ],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'basics',
      S,
      choice(
        'm-qaapi-basics-s1',
        'Breaking the Mobile App',
        'A backend team changed a field from a number to a string, and every API test still passed, but the mobile app broke. What would have caught it?',
        [
          'Contract tests: the app’s expectations of the API are recorded and checked against every backend build',
          'More UI tests on the website',
          'Load testing',
          'Checking status codes more carefully',
        ],
        0
      )
    ),
    ...tagged(
      'functional',
      B,
      choice(
        'm-qaapi-func-b1',
        'Positive and Negative',
        'Testing POST /users, which pair of cases covers the basics?',
        ['A valid user is created (201), and an invalid one is rejected with a 4xx and a clear error', 'Two valid users with different names', 'One request with Postman, one with curl', 'A GET and a DELETE'],
        0
      )
    ),
    ...tagged(
      'functional',
      S,
      choice(
        'm-qaapi-func-s1',
        'Two Requests at Once',
        'POST /vouchers/redeem marks a single-use voucher used. Every functional test passes. What else must you test?',
        [
          'Two redeem requests for the same voucher sent at the same moment: only one should succeed',
          'Redeeming with a very long voucher code',
          'Redeeming on a Sunday',
          'Redeeming with a GET request',
        ],
        0
      )
    ),
    ...tagged(
      'auth',
      B,
      choice(
        'm-qaapi-auth-b1',
        'No Token',
        'GET /orders/10 is called with no auth token. What should happen?',
        ['401 Unauthorized', '200 with the order', '404 Not Found', '500 Internal Server Error'],
        0
      )
    ),
    ...tagged(
      'auth',
      S,
      multi(
        'm-qaapi-auth-s1',
        'Tokens',
        'Which should you test about the API’s access tokens? Tick all that apply.',
        [
          'An expired token is rejected',
          'A token with its signature tampered with is rejected',
          'A token is no longer accepted after logout or password change, where the design says so',
          'A normal user’s token can’t call admin endpoints',
          'The token is exactly 64 characters long',
        ],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'lists',
      B,
      choice(
        'm-qaapi-lists-b1',
        'An Empty List',
        'GET /orders?status=refunded matches nothing. What should it return?',
        ['200 with an empty list', '404 Not Found', '500', '204 with an error message'],
        0
      )
    ),
    ...tagged(
      'lists',
      S,
      choice(
        'm-qaapi-lists-s1',
        'Changing While You Page',
        'While a client pages through GET /products, new products are added. What should your test check?',
        [
          'Paging to the end still returns every product exactly once: no duplicates and none skipped',
          'That the first page loads in under a second',
          'That new products appear on page 1',
          'Nothing; this case can’t be tested',
        ],
        0
      )
    ),
    ...tagged(
      'strategy',
      B,
      choice(
        'm-qaapi-strat-b1',
        'Where to Test',
        'Your API tests create users and orders. Where should they run?',
        ['Against a test environment with its own data, never production', 'Against production, to be realistic', 'On a developer’s laptop only', 'Wherever is fastest that day'],
        0
      )
    ),
  ],
};
