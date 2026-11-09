import { AssessmentTest, TestResult, User, VerifiedSkill, isPublic } from '../types';
import { levelForScore } from '../data/seedCandidates';

// Records a finished attempt. Only Vetter-made tests become verified skills; company tests are scored for their own jobs
export function addTestResult(user: User, test: AssessmentTest, result: TestResult): User {
  const testResults = [...user.testResults, result];
  if (!isPublic(test)) return { ...user, testResults };

  const bestScore = Math.max(...testResults.filter((r) => r.testId === test.id).map((r) => r.score));
  const skillName = test.skillsTested[0] || test.title;
  const historyEntry = { date: result.completedAt, score: result.score, testName: test.title };
  const existingSkillIndex = user.verifiedSkills.findIndex((s) => s.testId === test.id || s.skillName === skillName);

  let verifiedSkills: VerifiedSkill[];
  if (existingSkillIndex >= 0) {
    verifiedSkills = [...user.verifiedSkills];
    const existing = verifiedSkills[existingSkillIndex];
    const skillBest = Math.max(existing.score, bestScore);
    verifiedSkills[existingSkillIndex] = {
      ...existing,
      testId: test.id,
      score: skillBest,
      verifiedAt: skillBest > existing.score ? result.completedAt : existing.verifiedAt,
      level: levelForScore(skillBest),
      history: [...existing.history, historyEntry],
    };
  } else {
    verifiedSkills = [
      ...user.verifiedSkills,
      {
        skillId: `skill-${Date.now()}`,
        skillName,
        category: test.category,
        score: bestScore,
        percentile: 0,
        verifiedAt: result.completedAt,
        testId: test.id,
        level: levelForScore(bestScore),
        history: [historyEntry],
      },
    ];
  }
  return { ...user, testResults, verifiedSkills };
}

// Takes a test off the candidate's record: every attempt at it, and the verified skill it earned
export function removeTestResults(user: User, testId: string): User {
  return {
    ...user,
    testResults: user.testResults.filter((r) => r.testId !== testId),
    verifiedSkills: user.verifiedSkills.filter((s) => s.testId !== testId),
  };
}

// ---- Attempts: every start counts, and a library test can be retaken once the gap has passed ----
export const RETAKE_DAYS = 14;
const DAY = 86400000;
const timeOf = (r: TestResult) => r.completedTime ?? `${r.completedAt}T23:59:59.000Z`;

// When they last started or finished the test
export function lastAttemptAt(user: User, testId: string): string | undefined {
  const times = [
    ...(user.testStarts ?? []).filter((s) => s.testId === testId).map((s) => s.startedAt),
    ...user.testResults.filter((r) => r.testId === testId).map(timeOf),
  ].sort();
  return times.at(-1);
}

// The earliest they may start the test again, or null if they can now
export function nextAttemptAt(user: User, testId: string, now = Date.now()): Date | null {
  const last = lastAttemptAt(user, testId);
  if (!last) return null;
  const next = new Date(new Date(last).getTime() + RETAKE_DAYS * DAY);
  return next.getTime() > now ? next : null;
}

// Starts with no result before the next start: they began and left without submitting
export function unfinishedStarts(user: User, testId: string, now = Date.now()): number {
  const starts = (user.testStarts ?? []).filter((s) => s.testId === testId).map((s) => s.startedAt).sort();
  const results = user.testResults.filter((r) => r.testId === testId).map(timeOf);
  return starts.filter((start, i) => {
    const until = starts[i + 1] ?? new Date(now).toISOString();
    // A start still under way (in the last few hours, with nothing after it) isn't counted yet
    if (!starts[i + 1] && now - new Date(start).getTime() < 3 * 3600000) return false;
    return !results.some((t) => t >= start && t <= until);
  }).length;
}
