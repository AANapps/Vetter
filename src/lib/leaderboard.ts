import { AssessmentTest, User } from '../types';

export interface LeaderboardEntry {
  rank: number;
  candidate: User;
  score: number;
  durationSeconds?: number;
  completedAt: string;
  attempts: number;
}

// Each candidate's best attempt on a test, ranked by score, then speed, then who got there first
export function getLeaderboard(testId: string, candidates: User[]): LeaderboardEntry[] {
  const entries = candidates.flatMap((candidate) => {
    const attempts = candidate.testResults.filter((r) => r.testId === testId);
    if (attempts.length === 0) return [];
    const best = attempts.reduce((a, b) => {
      if (b.score !== a.score) return b.score > a.score ? b : a;
      return (b.durationSeconds ?? Infinity) < (a.durationSeconds ?? Infinity) ? b : a;
    });
    return [{ candidate, score: best.score, durationSeconds: best.durationSeconds, completedAt: best.completedAt, attempts: attempts.length }];
  });

  entries.sort(
    (a, b) =>
      b.score - a.score ||
      (a.durationSeconds ?? Infinity) - (b.durationSeconds ?? Infinity) ||
      a.completedAt.localeCompare(b.completedAt)
  );

  // Equal scores share a rank (1, 2, 2, 4)
  const ranked: LeaderboardEntry[] = [];
  entries.forEach((e, i) => {
    const rank = i > 0 && entries[i - 1].score === e.score ? ranked[i - 1].rank : i + 1;
    ranked.push({ ...e, rank });
  });
  return ranked;
}

export interface TestStats {
  candidatesRanked: number;
  averageScore: number;
  passRate: number; // 0 - 100
  topScore: number;
}

export function getTestStats(test: AssessmentTest, candidates: User[]): TestStats {
  const board = getLeaderboard(test.id, candidates);
  if (board.length === 0) return { candidatesRanked: 0, averageScore: 0, passRate: 0, topScore: 0 };
  const scores = board.map((e) => e.score);
  return {
    candidatesRanked: board.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    passRate: Math.round((scores.filter((s) => s >= test.passingScore).length / scores.length) * 100),
    topScore: scores[0],
  };
}

// Share of other candidates' best scores that this score beats (ties count half)
export function getPercentile(score: number, testId: string, candidates: User[], excludeCandidateId?: string): number {
  const others = getLeaderboard(testId, candidates.filter((c) => c.id !== excludeCandidateId)).map((e) => e.score);
  if (others.length === 0) return 100;
  const below = others.filter((s) => s < score).length;
  const equal = others.filter((s) => s === score).length;
  return Math.round(((below + equal / 2) / others.length) * 1000) / 10;
}
