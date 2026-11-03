import { choice, match, multi } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';

// ---------- SQL Queries (backend developers) ----------
export const SQL_MODULE: ModuleSkeleton = {
  familyId: 'test-sql-01',
  aspects: [
    { id: 'filter', name: 'Filtering & Sorting', summary: 'WHERE, ORDER BY, LIMIT and how NULLs behave in conditions.' },
    { id: 'aggregate', name: 'Aggregation & Grouping', summary: 'GROUP BY, HAVING and the totals and counts reports are built on.' },
    { id: 'joins', name: 'Joins', summary: 'Combining tables without losing or duplicating rows.' },
    { id: 'window', name: 'Window Functions', summary: 'Rankings, running totals and comparisons to a group, row by row.' },
    { id: 'perf', name: 'Performance & Correctness', summary: 'Indexes, query plans and the bugs that make numbers wrong.' },
  ],
  tags: {
    'q-sql-b1': ['filter', B],
    'q-sql-b3': ['filter', B],
    'q-sql-2': ['filter', J],
    'x-sql-3': ['filter', J],
    'x-sql-7': ['aggregate', B],
    'x-sql-1': ['aggregate', B],
    'q-sql-b2': ['aggregate', B],
    'q-sql-1': ['aggregate', J],
    'q-sql-p3': ['aggregate', P],
    'q-sql-s4': ['aggregate', S],
    'x-sql-2': ['joins', J],
    'q-sql-3': ['joins', J],
    'q-sql-p1': ['joins', P],
    'x-sql-4': ['window', J],
    'q-sql-4': ['window', J],
    'q-sql-p2': ['window', P],
    'q-sql-p4': ['window', P],
    'q-sql-s1': ['window', S],
    'q-sql-s2': ['window', S],
    'q-sql-s3': ['window', S],
    'x-sql-6': ['perf', J],
    'x-sql-5': ['perf', P],
  },
  bank: [
    ...tagged(
      'filter',
      P,
      choice(
        'm-sql-filter-p1',
        'NOT IN Returns Nothing',
        'SELECT name FROM employees WHERE id NOT IN (SELECT manager_id FROM teams) returns no rows, though plenty of employees manage nobody. Why?',
        [
          'One team has a NULL manager_id, so every NOT IN comparison is unknown rather than true',
          'NOT IN can’t be used with a subquery',
          'The subquery needs DISTINCT',
          'manager_id must be indexed for NOT IN to work',
        ],
        0
      )
    ),
    ...tagged(
      'filter',
      S,
      multi(
        'm-sql-filter-s1',
        'Index-Friendly Conditions',
        'orders has an index on created_at. Which conditions can use it to find rows quickly? Tick all that apply.',
        [
          "created_at >= '2026-01-01' AND created_at < '2026-02-01'",
          "DATE(created_at) = '2026-01-15'",
          "created_at BETWEEN '2026-01-01' AND '2026-01-31 23:59:59'",
          "strftime('%Y', created_at) = '2026'",
          'created_at + 0 > 20260101',
        ],
        [0, 2]
      )
    ),
    ...tagged(
      'joins',
      B,
      match('m-sql-joins-b1', 'Kinds of Join', 'Match each join to the rows it returns.', [
        ['INNER JOIN', 'Only rows with a match on both sides'],
        ['LEFT JOIN', 'Every row from the left table, with NULLs where nothing matches'],
        ['FULL OUTER JOIN', 'Every row from both tables, matched where possible'],
        ['CROSS JOIN', 'Every combination of rows from the two tables'],
      ])
    ),
    ...tagged(
      'joins',
      S,
      choice(
        'm-sql-joins-s1',
        'Customers Listed Twice',
        'You need customers who have placed at least one order over £500. JOINing orders lists some customers several times. What is the cleanest fix?',
        [
          'WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.amount > 500)',
          'Add LIMIT 1 to the query',
          'Switch to a LEFT JOIN',
          'GROUP BY every column of customers and hope the plan is fast',
        ],
        0
      )
    ),
    ...tagged(
      'window',
      B,
      choice(
        'm-sql-window-b1',
        'Window or GROUP BY',
        'What does a window function such as AVG(salary) OVER (PARTITION BY department) give you that GROUP BY department doesn’t?',
        [
          'Every employee row stays, each with its department’s average beside it',
          'It runs faster on large tables',
          'It removes duplicate rows',
          'It works without a FROM clause',
        ],
        0
      )
    ),
    ...tagged(
      'perf',
      B,
      choice(
        'm-sql-perf-b1',
        'What an Index Is For',
        'What does adding an index on employees.department do?',
        [
          'Lets the database find rows by department without reading the whole table, at the cost of slower writes and some storage',
          'Sorts the table on disk permanently, so ORDER BY is never needed',
          'Stops two employees having the same department',
          'Makes every query on the table faster',
        ],
        0
      )
    ),
    ...tagged(
      'perf',
      S,
      choice(
        'm-sql-perf-s1',
        'Column Order in an Index',
        'A hot query runs WHERE country = ? AND created_at >= ? on a 300-million-row events table. Which index serves it best?',
        [
          '(country, created_at): the equality column first, then the range',
          '(created_at, country): the range first, then the equality',
          'Two separate indexes, one on each column',
          'An index on created_at alone; country has few distinct values',
        ],
        0
      )
    ),
  ],
};

// ---------- SQL for Testing (QA) ----------
export const QA_SQL_MODULE: ModuleSkeleton = {
  familyId: 'test-qasql-01',
  aspects: [
    { id: 'integrity', name: 'Missing & Orphaned Records', summary: 'Rows that point at nothing, and records that should exist but don’t.' },
    { id: 'consistency', name: 'Business-Rule Checks', summary: 'Totals that must add up, states that must agree with their dates, and money.' },
    { id: 'duplicates', name: 'Duplicates & Data Quality', summary: 'Finding duplicates, deciding what wins, and scoring how clean data is.' },
    { id: 'practice', name: 'Testing Practice', summary: 'What a check proves, kinds of test, and reporting what you find.' },
  ],
  tags: {
    'q-qasql-b3': ['integrity', B],
    'x-qasql-7': ['integrity', B],
    'q-qasql-1': ['integrity', J],
    'x-qasql-2': ['integrity', J],
    'q-qasql-p1': ['integrity', P],
    'q-qasql-s1': ['integrity', S],
    'q-qasql-b1': ['consistency', B],
    'q-qasql-b2': ['consistency', B],
    'q-qasql-2': ['consistency', J],
    'q-qasql-4': ['consistency', J],
    'x-qasql-6': ['consistency', J],
    'q-qasql-p2': ['consistency', P],
    'q-qasql-p4': ['consistency', P],
    'q-qasql-s4': ['consistency', S],
    'q-qasql-3': ['duplicates', J],
    'q-qasql-p3': ['duplicates', P],
    'q-qasql-s2': ['duplicates', S],
    'q-qasql-s3': ['duplicates', S],
    'x-qasql-3': ['practice', B],
    'x-qasql-1': ['practice', J],
    'x-qasql-5': ['practice', J],
    'x-qasql-4': ['practice', J],
  },
  bank: [
    ...tagged(
      'duplicates',
      B,
      choice(
        'm-qasql-dup-b1',
        'Spotting Duplicates',
        'Which query lists every email used by more than one customer?',
        [
          'SELECT email FROM shop_customers GROUP BY email HAVING COUNT(*) > 1',
          'SELECT DISTINCT email FROM shop_customers',
          'SELECT email FROM shop_customers WHERE COUNT(*) > 1',
          'SELECT email, COUNT(*) FROM shop_customers ORDER BY email',
        ],
        0
      )
    ),
    ...tagged(
      'practice',
      P,
      choice(
        'm-qasql-practice-p1',
        'A Check That Lasts',
        'Your query found orders whose totals don’t match their items, and the developers fixed the bug. How do you keep it fixed?',
        [
          'Turn the query into an automated check that fails the build or alerts when it returns rows',
          'Run it by hand before each release',
          'Delete the bad orders so the query returns nothing',
          'Add a comment to the code explaining the bug',
        ],
        0
      )
    ),
    ...tagged(
      'practice',
      S,
      multi(
        'm-qasql-practice-s1',
        'Testing a Data Migration',
        'Two million customers are being migrated to a new database this weekend. Which belong in your test plan? Tick all that apply.',
        [
          'Row counts per table match between old and new, with every difference explained',
          'Totals such as the sum of order values match to the penny',
          'A sample of records compared field by field, including edge cases like accents and NULLs',
          'The rules the new schema enforces are run against the old data before the move',
          'Only a check that the migration script finished without errors',
        ],
        [0, 1, 2, 3]
      )
    ),
  ],
};
