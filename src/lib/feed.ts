import { familyIdOf, isMainVersion } from './testLevels';
import { AssessmentTest, Business, FeedPost, JobPosting, User } from '../types';
import { getLeaderboard } from './leaderboard';
import { hashString } from '../data/seedCandidates';

export type FeedItem =
  | {
      kind: 'result';
      id: string;
      date: string;
      actor: User;
      test: AssessmentTest;
      score: number;
      rank?: number; // Set when this attempt is the candidate's best and still on the leaderboard
      improvedFrom?: number; // Previous best, when this attempt beat it
    }
  | { kind: 'job'; id: string; date: string; job: JobPosting; business?: Business }
  | { kind: 'post'; id: string; date: string; post: FeedPost; actor: User; sharedScore?: number; sharedTest?: AssessmentTest };

export type FeedFilter = 'all' | 'following' | 'result' | 'job' | 'post';

/**
 * Everything worth seeing on Vetter, newest first. Only passing scores on Vetter-made tests
 * are shown: company tests are private to that company, and nobody's failed attempt is broadcast.
 */
export function buildFeed(
  candidates: User[],
  tests: AssessmentTest[],
  jobs: JobPosting[],
  businesses: Business[],
  posts: FeedPost[]
): FeedItem[] {
  const standardTests = tests.filter((t) => t.type === 'standard');
  const boards = new Map(standardTests.map((t) => [t.id, getLeaderboard(t.id, candidates)]));

  const results: FeedItem[] = candidates.flatMap((actor) =>
    standardTests.flatMap((test) => {
      const attempts = actor.testResults
        .filter((r) => r.testId === test.id)
        .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
      let bestSoFar: number | undefined;
      return attempts.flatMap((r, i) => {
        const previousBest = bestSoFar;
        bestSoFar = Math.max(bestSoFar ?? 0, r.score);
        if (r.score < test.passingScore) return [];
        const entry = boards.get(test.id)?.find((e) => e.candidate.id === actor.id);
        const isBest = entry?.score === r.score && entry.completedAt === r.completedAt;
        return [
          {
            kind: 'result' as const,
            id: `result:${actor.id}:${test.id}:${i}`,
            date: r.completedAt,
            actor,
            test,
            score: r.score,
            rank: isBest ? entry.rank : undefined,
            improvedFrom: previousBest !== undefined && r.score > previousBest ? previousBest : undefined,
          },
        ];
      });
    })
  );

  const jobItems: FeedItem[] = jobs
    .filter((j) => j.status === 'active')
    .map((job) => ({
      kind: 'job',
      id: `job:${job.id}`,
      date: job.postedDate,
      job,
      business: businesses.find((b) => b.id === job.businessId),
    }));

  const postItems: FeedItem[] = posts.flatMap((post) => {
    const actor = candidates.find((c) => c.id === post.authorId);
    if (!actor) return [];
    const sharedTest = post.sharedTestId ? standardTests.find((t) => t.id === post.sharedTestId) : undefined;
    const sharedScores = sharedTest ? actor.testResults.filter((r) => r.testId === sharedTest.id).map((r) => r.score) : [];
    return [
      {
        kind: 'post',
        id: post.id,
        date: post.createdAt,
        post,
        actor,
        sharedTest,
        sharedScore: sharedScores.length > 0 ? Math.max(...sharedScores) : undefined,
      },
    ];
  });

  return [...postItems, ...results, ...jobItems].sort((a, b) => b.date.localeCompare(a.date));
}

export function matchesFilter(item: FeedItem, filter: FeedFilter, following: string[]): boolean {
  if (filter === 'all') return true;
  if (filter === 'following') {
    return item.kind === 'job' ? following.includes(item.job.businessId ?? '') : following.includes(item.actor.id);
  }
  return item.kind === filter;
}

// Kudos from other candidates are seeded per item, so counts are stable between visits.
// Posts written in the app start at zero.
export function seededKudos(itemId: string): number {
  if (itemId.startsWith('post-') && !itemId.startsWith('post-seed-')) return 0;
  return Math.abs(hashString(itemId)) % 18;
}

// "3h", "2d", "5w" for recent items, then the date
export function timeAgo(date: string, now = new Date()): string {
  const then = new Date(date.length === 10 ? `${date}T12:00:00Z` : date);
  const minutes = Math.max(0, Math.round((now.getTime() - then.getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  if (days < 35) return `${Math.round(days / 7)}w`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

// Tests most taken in the 30 days up to the latest activity
export function trendingTests(candidates: User[], tests: AssessmentTest[], limit = 3) {
  const results = candidates.flatMap((c) => c.testResults);
  const latest = results.reduce((max, r) => (r.completedAt > max ? r.completedAt : max), '');
  if (!latest) return [];
  const cutoff = new Date(new Date(latest).getTime() - 30 * 86400000).toISOString().split('T')[0];
  return tests
    .filter((t) => t.type === 'standard' && isMainVersion(t))
    .map((test) => {
      // A test's attempts at every level count together
      const ids = new Set(tests.filter((t) => familyIdOf(t) === test.id).map((t) => t.id));
      return { test, attempts: results.filter((r) => ids.has(r.testId) && r.completedAt >= cutoff).length };
    })
    .filter((t) => t.attempts > 0)
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, limit);
}

// Strongest candidates the viewer doesn't follow yet, by their best Vetter score
export function suggestedPeople(candidates: User[], viewerId: string, following: string[], limit = 4) {
  return candidates
    .filter((c) => c.id !== viewerId && !following.includes(c.id))
    .map((c) => ({ candidate: c, best: Math.max(0, ...c.verifiedSkills.map((s) => s.score)) }))
    .sort((a, b) => b.best - a.best)
    .slice(0, limit);
}
