import { choice, match, multi } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';

// ---------- Database Design ----------
export const DATABASE_MODULE: ModuleSkeleton = {
  familyId: 'test-db-01',
  aspects: [
    { id: 'modelling', name: 'Tables & Keys', summary: 'Entities, relationships, primary and foreign keys, and normalisation.' },
    { id: 'constraints', name: 'Constraints & Integrity', summary: 'Rules the database enforces so bad data can’t get in.' },
    { id: 'indexing', name: 'Indexing', summary: 'Which indexes queries need, and what they cost.' },
    { id: 'scaling', name: 'Scale & Performance', summary: 'Denormalising, counters, partitioning and read-heavy designs.' },
    { id: 'migrations', name: 'Migrations & Change', summary: 'Changing a live schema safely, without downtime or lost data.' },
  ],
  tags: {
    'x-db-4': ['modelling', B],
    'q-db-1': ['modelling', J],
    'x-db-3': ['constraints', J],
    'q-db-2': ['constraints', P],
    'q-db-3': ['constraints', P],
    'x-db-1': ['indexing', P],
    'q-db-4': ['indexing', S],
    'x-db-2': ['scaling', P],
    'x-db-5': ['scaling', S],
    'x-db-6': ['migrations', P],
  },
  bank: [
    ...tagged(
      'modelling',
      P,
      choice(
        'm-db-model-p1',
        'Repeated Addresses',
        'An orders table stores the customer’s name, email and address on every order. A customer changes their email. What is the problem, and the usual fix?',
        [
          'The email is copied across many rows and goes out of step; keep customers in their own table and reference them by id (but keep the shipping address on the order, as it was at the time)',
          'Nothing is wrong; duplication makes reads faster',
          'Use a bigger column type for email',
          'Add an index on email',
        ],
        0
      )
    ),
    ...tagged(
      'modelling',
      S,
      choice(
        'm-db-model-s1',
        'Prices That Change',
        'Products change price often, and finance needs to know what every past order was charged. How do you model it?',
        [
          'Store the unit price on each order line at the time of sale, and keep a price history table with valid-from and valid-to dates',
          'Keep only the current price on products and recalculate old orders from it',
          'Update every past order when the price changes',
          'Store prices only in the application’s config',
        ],
        0
      )
    ),
    ...tagged(
      'constraints',
      B,
      match('m-db-cons-b1', 'Constraints', 'Match each constraint to what it stops.', [
        ['PRIMARY KEY', 'Two rows with the same identity'],
        ['FOREIGN KEY', 'A row pointing at a parent that doesn’t exist'],
        ['NOT NULL', 'A required value being left empty'],
        ['UNIQUE', 'Two rows sharing a value that must be one-of-a-kind, like an email'],
      ])
    ),
    ...tagged(
      'constraints',
      S,
      choice(
        'm-db-cons-s1',
        'Overlapping Bookings',
        'Meeting rooms must never be double-booked, even when two people book at the same instant from different servers. Where does the guarantee belong?',
        [
          'In the database: an exclusion constraint on room and time range (or a serialisable transaction that checks and inserts)',
          'In the frontend, by greying out booked slots',
          'In each app server, by checking before inserting',
          'In a nightly job that finds and cancels overlaps',
        ],
        0
      )
    ),
    ...tagged(
      'indexing',
      B,
      choice(
        'm-db-idx-b1',
        'The Cost of an Index',
        'Why not add an index on every column?',
        ['Every insert and update must maintain each index, slowing writes and using space; add the ones your queries need', 'Databases allow only three indexes per table', 'Indexes make reads slower', 'Indexes are deleted on restart'],
        0
      )
    ),
    ...tagged(
      'indexing',
      J,
      choice(
        'm-db-idx-j1',
        'Is the Index Used?',
        'You added an index on tweets.user_id, but the profile page is still slow. What do you check first?',
        ['Run EXPLAIN on the query to see whether it uses the index or scans the table', 'Add the index again', 'Restart the database', 'Add an index on every other column too'],
        0
      )
    ),
    ...tagged(
      'scaling',
      B,
      choice(
        'm-db-scale-b1',
        'Read Replicas',
        'Your database is busy with reads from reports and the app, while writes are light. What is a common first step?',
        ['Add read replicas and send read-only queries to them', 'Shard the database across ten servers', 'Delete old data every day', 'Move to a spreadsheet'],
        0
      )
    ),
    ...tagged(
      'scaling',
      J,
      choice(
        'm-db-scale-j1',
        'Counting Followers',
        'SELECT COUNT(*) FROM follows WHERE followee_id = ? is slow for accounts with millions of followers, and it runs on every profile view. What helps most?',
        [
          'Keep a followers_count on users, updated when a follow is added or removed',
          'Run the count in the browser',
          'Use COUNT(id) instead of COUNT(*)',
          'Show the count only to the account owner',
        ],
        0
      )
    ),
    ...tagged(
      'migrations',
      B,
      choice(
        'm-db-mig-b1',
        'Changing the Schema',
        'How should schema changes reach production?',
        [
          'As versioned migration scripts in the repo, tested on staging and run by the deploy',
          'By hand in the production console when needed',
          'By dropping and recreating the database',
          'By editing the backup file',
        ],
        0
      )
    ),
    ...tagged(
      'migrations',
      J,
      choice(
        'm-db-mig-j1',
        'A New Required Column',
        'You need a NOT NULL country column on a users table with 5 million rows. What is the safe approach?',
        [
          'Add it as nullable (or with a default), backfill in batches, then add the NOT NULL constraint',
          'Add it as NOT NULL with no default in one step',
          'Copy the table to a new one overnight with the site down',
          'Store country in a separate database',
        ],
        0
      )
    ),
    ...tagged(
      'migrations',
      S,
      multi(
        'm-db-mig-s1',
        'Splitting a Table',
        'You are splitting a huge users table into users and user_profiles on a live system. Which belong in the plan? Tick all that apply.',
        [
          'Write to both old and new places for a while (dual writes)',
          'Backfill existing rows in batches, then verify the copies match',
          'Switch reads over gradually behind a flag',
          'Drop the old columns only after nothing reads them',
          'Do it all in one migration during peak traffic',
        ],
        [0, 1, 2, 3]
      )
    ),
  ],
};
