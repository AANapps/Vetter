import { SocialState } from '../types';

// A few posts and replies from seeded candidates so the feed has conversation on first load
export const SEED_SOCIAL: SocialState = {
  posts: [
    {
      id: 'post-seed-01',
      authorId: 'cand-seed-28',
      text: 'Finally cracked the window functions task on the SQL test. The trick was ranking inside the partition before filtering, not after.',
      createdAt: '2026-10-19T08:42:00Z',
      sharedTestId: 'test-sql-01',
    },
    {
      id: 'post-seed-02',
      authorId: 'cand-002',
      text: 'Anyone else find the rate limiter design task harder than it looks? Spent half my time on burst handling.',
      createdAt: '2026-10-18T16:10:00Z',
      sharedTestId: 'test-sys-01',
    },
    {
      id: 'post-seed-03',
      authorId: 'cand-seed-03',
      text: 'Retook the SQL test after a month of practice and jumped 25 points. Retakes are worth it.',
      createdAt: '2026-10-17T11:25:00Z',
      sharedTestId: 'test-sql-01',
    },
    {
      id: 'post-seed-04',
      authorId: 'cand-seed-12',
      text: 'Looking for a study buddy for the Backend APIs test. Happy to talk through retry and backoff strategies.',
      createdAt: '2026-10-16T19:03:00Z',
    },
    {
      id: 'post-seed-05',
      authorId: 'cand-003',
      text: 'Tip: read every test case before writing code. Half the edge cases are spelled out in the expected outputs.',
      createdAt: '2026-10-14T09:30:00Z',
    },
  ],
  comments: {
    'post-seed-01': [
      { id: 'cmt-seed-01', authorId: 'cand-seed-22', text: 'Same! Took me two attempts to see it.', createdAt: '2026-10-19T09:15:00Z' },
      { id: 'cmt-seed-02', authorId: 'cand-seed-17', text: 'Nice score. Did you use QUALIFY or a subquery?', createdAt: '2026-10-19T10:02:00Z' },
    ],
    'post-seed-02': [
      { id: 'cmt-seed-03', authorId: 'cand-seed-05', text: 'Token bucket made it click for me.', createdAt: '2026-10-18T17:40:00Z' },
    ],
    'post-seed-04': [
      { id: 'cmt-seed-04', authorId: 'cand-seed-08', text: 'Count me in. I’m sitting it next week.', createdAt: '2026-10-16T20:11:00Z' },
    ],
  },
  kudosGiven: [],
  following: ['cand-002', 'biz-001'],
};
