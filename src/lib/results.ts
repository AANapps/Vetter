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
