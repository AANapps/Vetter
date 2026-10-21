import { AssessmentTest, Exam, User } from '../types';

export interface ExamProgress {
  // Best score on each test since the invitation, or undefined if not taken yet
  scores: Record<string, number | undefined>;
  done: number;
  total: number;
  // Average of the test scores, once every test is done
  score?: number;
  status: 'not-started' | 'in-progress' | 'passed' | 'failed';
}

export function examProgress(exam: Exam, candidate: User): ExamProgress {
  const invitedAt = exam.invitations.find((i) => i.candidateId === candidate.id)?.invitedAt ?? exam.createdAt;
  const scores = Object.fromEntries(
    exam.testIds.map((testId) => {
      const results = candidate.testResults.filter((r) => r.testId === testId && r.completedAt >= invitedAt);
      return [testId, results.length ? Math.max(...results.map((r) => r.score)) : undefined];
    })
  );
  const taken = Object.values(scores).filter((s): s is number => s !== undefined);
  const done = taken.length;
  const total = exam.testIds.length;
  if (done < total) return { scores, done, total, status: done === 0 ? 'not-started' : 'in-progress' };
  const score = Math.round(taken.reduce((a, b) => a + b, 0) / total);
  return { scores, done, total, score, status: score >= exam.passingScore ? 'passed' : 'failed' };
}

// Exams a candidate has been invited to, unfinished first, then by due date
export function examsFor(candidate: User, exams: Exam[]) {
  return exams
    .filter((e) => e.invitations.some((i) => i.candidateId === candidate.id))
    .map((exam) => ({ exam, progress: examProgress(exam, candidate) }))
    .sort((a, b) => {
      const aOpen = a.progress.score === undefined;
      const bOpen = b.progress.score === undefined;
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      return (a.exam.dueDate ?? '9999').localeCompare(b.exam.dueDate ?? '9999');
    });
}

export const totalMinutes = (exam: Exam, tests: AssessmentTest[]) =>
  exam.testIds.reduce((sum, id) => sum + (tests.find((t) => t.id === id)?.estimatedMinutes ?? 0), 0);

export const STATUS_LABELS: Record<ExamProgress['status'], string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  passed: 'Passed',
  failed: 'Below pass mark',
};
