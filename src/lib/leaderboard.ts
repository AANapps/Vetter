import { AssessmentTest, User } from '../types';

export interface LeaderboardEntry {
  rank: number;
  candidate: User;
  score: number;
  durationSeconds?: number;
  completedAt: string;
  completedTime?: string;
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
    return [{ candidate, score: best.score, durationSeconds: best.durationSeconds, completedAt: best.completedAt, completedTime: best.completedTime, attempts: attempts.length }];
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
  topScore: number;
}

export function getTestStats(test: AssessmentTest, candidates: User[]): TestStats {
  const board = getLeaderboard(test.id, candidates);
  if (board.length === 0) return { candidatesRanked: 0, averageScore: 0, topScore: 0 };
  const scores = board.map((e) => e.score);
  return {
    candidatesRanked: board.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    topScore: scores[0],
  };
}

