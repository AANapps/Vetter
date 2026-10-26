import { AssessmentTest, Exam, ExamInvitation, User } from '../types';

export interface ExamProgress {
  // Best score on each test since the invitation, or undefined if not taken yet
  scores: Record<string, number | undefined>;
  done: number;
  total: number;
  // Average of the test scores, once every test is done
  score?: number;
  status: 'not-started' | 'in-progress' | 'passed' | 'failed';
  // Time spent on the counted attempts, and when the latest of them was finished
  seconds: number;
  lastActivity?: string;
}

export function examProgress(exam: Exam, candidate: User): ExamProgress {
  const invitedAt = exam.invitations.find((i) => i.candidateId === candidate.id)?.invitedAt ?? exam.createdAt;
  let seconds = 0;
  let lastActivity: string | undefined;
  const scores = Object.fromEntries(
    exam.testIds.map((testId) => {
      const results = candidate.testResults.filter((r) => r.testId === testId && r.completedAt >= invitedAt);
      if (!results.length) return [testId, undefined];
      const best = results.reduce((a, b) => (b.score > a.score ? b : a));
      seconds += best.durationSeconds ?? 0;
      const finished = results.map((r) => r.completedTime ?? r.completedAt).sort().at(-1)!;
      if (!lastActivity || finished > lastActivity) lastActivity = finished;
      return [testId, best.score];
    })
  );
  const taken = Object.values(scores).filter((s): s is number => s !== undefined);
  const done = taken.length;
  const total = exam.testIds.length;
  if (done < total) return { scores, done, total, seconds, lastActivity, status: done === 0 ? 'not-started' : 'in-progress' };
  const score = Math.round(taken.reduce((a, b) => a + b, 0) / total);
  return { scores, done, total, score, seconds, lastActivity, status: score >= exam.passingScore ? 'passed' : 'failed' };
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

// Where one candidate is with an assessment, as the company tracks it
export type TrackingStatus = 'sent' | 'opened' | 'in-progress' | 'passed' | 'failed';

export const TRACKING_LABELS: Record<TrackingStatus, string> = {
  sent: 'Not opened',
  opened: 'Opened',
  'in-progress': 'In progress',
  passed: 'Passed',
  failed: 'Below pass mark',
};

export const VIA_LABELS: Record<NonNullable<ExamInvitation['via']>, string> = {
  link: 'Link',
  email: 'Email',
  invite: 'Invited',
};

export function trackingStatus(invitation: ExamInvitation, progress: ExamProgress): TrackingStatus {
  if (progress.status === 'passed' || progress.status === 'failed') return progress.status;
  if (progress.status === 'in-progress' || invitation.startedAt) return 'in-progress';
  // Following the link is opening it
  return invitation.openedAt || invitation.via === 'link' ? 'opened' : 'sent';
}

export interface ExamTrackingRow {
  candidate: User;
  invitation: ExamInvitation;
  progress: ExamProgress;
  status: TrackingStatus;
}

export function examTracking(exam: Exam, candidates: User[]): ExamTrackingRow[] {
  return exam.invitations.flatMap((invitation) => {
    const candidate = candidates.find((c) => c.id === invitation.candidateId);
    if (!candidate) return [];
    const progress = examProgress(exam, candidate);
    return [{ candidate, invitation, progress, status: trackingStatus(invitation, progress) }];
  });
}

// How far people have got: sent the link, opened it, started, finished every test, passed
export function examFunnel(exam: Exam, rows: ExamTrackingRow[], candidates: User[]) {
  const accountEmails = new Set(candidates.map((c) => c.email.toLowerCase()));
  const emailedWithoutAccount = (exam.invitedEmails ?? []).filter((e) => !accountEmails.has(e)).length;
  const opened = rows.filter((r) => r.status !== 'sent').length;
  const started = rows.filter((r) => r.status === 'in-progress' || r.status === 'passed' || r.status === 'failed').length;
  const completed = rows.filter((r) => r.status === 'passed' || r.status === 'failed').length;
  const passed = rows.filter((r) => r.status === 'passed').length;
  return { reached: rows.length + emailedWithoutAccount, opened, started, completed, passed };
}

// The link a company sends: whoever opens it joins the assessment and their results go back to the company
export const examLink = (examId: string) =>
  `${window.location.origin}${window.location.pathname}#/exams/${encodeURIComponent(examId)}`;
