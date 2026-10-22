import { AssessmentTest, TestResult, User } from '../types';
import { isMainVersion } from './testLevels';

// Stands in for other people taking tests while you're on Vetter, so Discover and the leaderboards keep moving
// until there's a real backend. Returns who took which test and how they did.
export function simulateAttempt(
  others: User[],
  tests: AssessmentTest[],
  rand: () => number = Math.random
): { candidateId: string; test: AssessmentTest; result: TestResult } | null {
  const standard = tests.filter((t) => t.type === 'standard');
  if (others.length === 0 || standard.length === 0) return null;
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];

  const candidate = pick(others);
  const taken = standard.filter((t) => candidate.testResults.some((r) => r.testId === t.id));
  // Mostly the main version of a test, where the busiest leaderboards are; sometimes a retake to beat a best
  const isRetake = taken.length > 0 && rand() < 0.35;
  const mains = standard.filter(isMainVersion);
  const test = isRetake ? pick(taken) : rand() < 0.75 && mains.length > 0 ? pick(mains) : pick(standard);

  const previousBest = Math.max(0, ...candidate.testResults.filter((r) => r.testId === test.id).map((r) => r.score));
  // Retakes land near the last best, usually a little higher; first attempts are roughly bell-shaped around the low 70s
  const raw = previousBest > 0 ? previousBest - 6 + rand() * 16 : 40 + ((rand() + rand() + rand()) / 3) * 62;
  const score = Math.max(28, Math.min(100, Math.round(raw)));

  const now = new Date();
  return {
    candidateId: candidate.id,
    test,
    result: {
      testId: test.id,
      score,
      completedAt: now.toISOString().split('T')[0],
      completedTime: now.toISOString(),
      durationSeconds: Math.round(test.estimatedMinutes * 60 * (0.35 + rand() * 0.6)),
    },
  };
}
