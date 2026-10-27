import { AssessmentTest, Exam, TestResult, User } from '../types';
import { isMainVersion } from './testLevels';

// Stands in for other people taking tests while you're on Vetter, so the Discover column on Home and the leaderboards keep moving
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

export type ExamStep =
  | { kind: 'join'; examId: string; candidateId: string }
  | { kind: 'open'; examId: string; candidateId: string }
  | { kind: 'attempt'; examId: string; candidateId: string; test: AssessmentTest; result: TestResult };

// Stands in for candidates working through the assessments companies sent them: new people follow a link,
// invitees open theirs, and people part-way through take their next test. Returns one step, or null.
export function simulateExamStep(
  exams: Exam[],
  others: User[],
  tests: AssessmentTest[],
  rand: () => number = Math.random
): ExamStep | null {
  if (exams.length === 0 || others.length === 0) return null;
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  const exam = pick(exams);
  const byId = new Map(others.map((c) => [c.id, c]));
  const invited = exam.invitations.filter((i) => byId.has(i.candidateId));

  // Someone the link was passed to opens it
  if (invited.length === 0 || rand() < 0.3) {
    const newcomers = others.filter((c) => !exam.invitations.some((i) => i.candidateId === c.id));
    return newcomers.length ? { kind: 'join', examId: exam.id, candidateId: pick(newcomers).id } : null;
  }

  const invitation = pick(invited);
  if (!invitation.openedAt && invitation.via !== 'link') return { kind: 'open', examId: exam.id, candidateId: invitation.candidateId };

  const candidate = byId.get(invitation.candidateId)!;
  const nextId = exam.testIds.find((id) => !candidate.testResults.some((r) => r.testId === id && r.completedAt >= invitation.invitedAt));
  const test = nextId ? tests.find((t) => t.id === nextId) : undefined;
  if (!test) return null;
  const score = Math.max(30, Math.min(100, Math.round(42 + ((rand() + rand() + rand()) / 3) * 58)));
  const now = new Date();
  return {
    kind: 'attempt',
    examId: exam.id,
    candidateId: candidate.id,
    test,
    result: {
      testId: test.id,
      score,
      completedAt: now.toISOString().split('T')[0],
      completedTime: now.toISOString(),
      durationSeconds: Math.round(test.estimatedMinutes * 60 * (0.4 + rand() * 0.55)),
      referredBy: exam.businessId,
    },
  };
}
