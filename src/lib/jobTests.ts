import { AiMode, AssessmentTest, JobInvitation, JobPosting, JobTestAttempt, TestResult, User, timerOf } from '../types';
import { jobPath } from './jobSeo';
import { AGENTS_NOTE } from '../data/modules/jobSimKit';

export interface JobTestProgress {
  // Best score on each of the job's tests, or undefined if not taken yet
  scores: Record<string, number | undefined>;
  done: number;
  total: number;
  // Average of the test scores, once every test is done
  score?: number;
  status: 'not-started' | 'in-progress' | 'completed';
  // Time spent on the counted attempts, and when the latest of them was finished
  seconds: number;
  lastActivity?: string;
  // Tests begun from the job and left without submitting (closed, reloaded or exited), across all its tests
  unsubmitted: number;
}

const invitationOf = (job: JobPosting, candidateId: string) => job.invitations.find((i) => i.candidateId === candidateId);

// Every try at one test, oldest first: each finished result, and each start from the job that was never submitted
function attemptLog(job: JobPosting, candidate: User, testId: string) {
  const finished = candidate.testResults
    .filter((r) => r.testId === testId)
    .map((r) => ({ at: r.completedTime ?? r.completedAt, result: r as TestResult | undefined }));
  const unsubmitted = (invitationOf(job, candidate.id)?.attempts ?? [])
    .filter((a) => a.testId === testId && !a.finishedAt)
    .map((a) => ({ at: a.startedAt, result: undefined as TestResult | undefined }));
  return [...finished, ...unsubmitted].sort((a, b) => a.at.localeCompare(b.at));
}

// The AI condition a job's simulations run under: the company's choice, or "No AI" for a job saved with the AI
// assistant turned off, else each simulation's own
export const jobAiMode = (job: JobPosting): AiMode | undefined => job.aiMode ?? (job.aiInSimulations === false ? 'none' : undefined);

// A job simulation as the job's candidates take it, under the job's AI condition (src/lib/capabilities.ts):
//   none       no AI assistant or agents, and the AI overlay's checks taken out (no AI score)
//   permitted  AI there to use; delegating to an agent is optional (unused, it isn't scored)
//   required   AI there and its use scored
//   agents     as required, with the agents (a simulation without agents runs as required)
export function withJobAi(test: AssessmentTest, job: JobPosting): AssessmentTest {
  const mode = jobAiMode(job);
  if (!mode || !test.questions.some((q) => q.type === 'desktop' && q.desktop)) return test;
  return {
    ...test,
    ...(mode === 'none' && test.scenarioWithoutAi && test.scenario && { scenario: { ...test.scenario, brief: test.scenarioWithoutAi } }),
    questions: test.questions.map((q) => {
      if (q.type !== 'desktop' || !q.desktop) return q;
      if (mode === 'none') {
        // The AI overlay taken out whole: its apps, emails, briefs and checks, so the day reads as if it never had AI
        const d = q.desktop;
        const { agents: _agents, ...work } = d.work ?? {};
        return {
          ...q,
          prompt: q.prompt.replace(AGENTS_NOTE, ''),
          desktop: {
            ...d,
            aiMode: mode,
            apps: d.apps.filter((a) => a !== 'ai' && a !== 'agents'),
            ...(d.work && { work }),
            inbox: d.inbox.flatMap((m) => (m.withoutAi === null ? [] : [m.withoutAi ? { ...m, ...m.withoutAi } : m])),
            ...(d.phases && { phases: d.phases.map((p) => (p.briefWithoutAi ? { ...p, brief: p.briefWithoutAi } : p)) }),
          },
          testCases: q.testCases.filter((tc) => !tc.capability),
        };
      }
      const apps = q.desktop.apps.includes('ai') ? q.desktop.apps : [...q.desktop.apps, 'ai'];
      return { ...q, desktop: { ...q.desktop, aiMode: mode, apps } };
    }),
  };
}
// Whether a test's simulation had the AI assistant on its desktop
export const simHasAi = (test: AssessmentTest) => test.questions.some((q) => q.type === 'desktop' && !!q.desktop?.apps.includes('ai'));

// The job's attempt limit per test, or undefined for none
export const attemptLimit = (job: JobPosting) => job.maxAttempts || undefined;

// How many tries at one of a job's tests the candidate has used and has left; left is undefined when there's no limit
export function attemptsAt(job: JobPosting, candidate: User, testId: string) {
  const used = attemptLog(job, candidate, testId).length;
  const limit = attemptLimit(job);
  return { used, limit, left: limit === undefined ? undefined : Math.max(0, limit - used) };
}

// How a candidate is doing on a job's tests. Tests are ordinary tests, so a score counts however and whenever it was
// taken, except that with an attempt limit only the first tries count (a start left unsubmitted uses one up)
export function jobTestProgress(job: JobPosting, candidate: User): JobTestProgress {
  let seconds = 0;
  let lastActivity: string | undefined;
  const scores = Object.fromEntries(
    job.testIds.map((testId) => {
      const log = attemptLog(job, candidate, testId);
      const limit = attemptLimit(job);
      const counted = (limit === undefined ? log : log.slice(0, limit)).flatMap((e) => (e.result ? [e.result] : []));
      if (!counted.length) return [testId, undefined];
      const best = counted.reduce((a, b) => (b.score > a.score ? b : a));
      seconds += best.durationSeconds ?? 0;
      const finished = counted.map((r) => r.completedTime ?? r.completedAt).sort().at(-1)!;
      if (!lastActivity || finished > lastActivity) lastActivity = finished;
      return [testId, best.score];
    })
  );
  const unsubmitted = (invitationOf(job, candidate.id)?.attempts ?? []).filter((a) => !a.finishedAt && job.testIds.includes(a.testId)).length;
  const taken = Object.values(scores).filter((s): s is number => s !== undefined);
  const done = taken.length;
  const total = job.testIds.length;
  if (done < total || total === 0)
    return { scores, done, total, seconds, lastActivity, unsubmitted, status: done === 0 && !unsubmitted ? 'not-started' : 'in-progress' };
  const score = Math.round(taken.reduce((a, b) => a + b, 0) / total);
  return { scores, done, total, score, seconds, lastActivity, unsubmitted, status: 'completed' };
}

// A start of one of the job's tests, recorded on the candidate's invitation
export const withAttemptStarted = (invitation: JobInvitation | undefined, testId: string, at: string): JobTestAttempt[] => [
  ...(invitation?.attempts ?? []),
  { testId, startedAt: at },
];

// The latest unsubmitted start of a test, marked as submitted
export function withAttemptFinished(invitation: JobInvitation | undefined, testId: string, at: string): JobTestAttempt[] | undefined {
  const attempts = invitation?.attempts ?? [];
  const i = attempts.map((a, idx) => (a.testId === testId && !a.finishedAt ? idx : -1)).filter((idx) => idx >= 0).at(-1);
  if (i === undefined) return undefined;
  return attempts.map((a, idx) => (idx === i ? { ...a, finishedAt: at } : a));
}

export const jobTestsOf = (job: JobPosting, tests: AssessmentTest[]) =>
  job.testIds.map((id) => tests.find((t) => t.id === id)).filter((t): t is AssessmentTest => !!t);

export const totalMinutes = (job: JobPosting, tests: AssessmentTest[]) =>
  jobTestsOf(job, tests).reduce((sum, t) => sum + (timerOf(t) ?? t.estimatedMinutes), 0);

// Jobs whose tests a candidate has been sent, unfinished first, then by closing date
export function invitesFor(candidate: User, jobs: JobPosting[]) {
  return jobs
    .filter((j) => j.testIds.length > 0 && j.invitations.some((i) => i.candidateId === candidate.id))
    .map((job) => ({ job, progress: jobTestProgress(job, candidate) }))
    .sort((a, b) => {
      const aOpen = a.progress.score === undefined;
      const bOpen = b.progress.score === undefined;
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      return (a.job.closingDate ?? '9999').localeCompare(b.job.closingDate ?? '9999');
    });
}

export const STATUS_LABELS: Record<JobTestProgress['status'], string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
};

// Where one candidate is with a job's tests, as the company tracks it
export type TrackingStatus = 'sent' | 'opened' | 'in-progress' | 'completed';

export const TRACKING_LABELS: Record<TrackingStatus, string> = {
  sent: 'Not opened',
  opened: 'Opened',
  'in-progress': 'In progress',
  completed: 'Completed',
};

export const VIA_LABELS: Record<NonNullable<JobInvitation['via']>, string> = {
  link: 'Job link',
  email: 'Email',
  invite: 'Sent on Corprax',
};

export function trackingStatus(invitation: JobInvitation, progress: JobTestProgress): TrackingStatus {
  if (progress.status === 'completed') return 'completed';
  if (progress.status === 'in-progress' || invitation.startedAt) return 'in-progress';
  // Coming in through the job's link is opening it
  return invitation.openedAt || invitation.via === 'link' ? 'opened' : 'sent';
}

export interface TrackingRow {
  candidate: User;
  invitation: JobInvitation;
  progress: JobTestProgress;
  status: TrackingStatus;
}

export function jobTracking(job: JobPosting, candidates: User[]): TrackingRow[] {
  return job.invitations.flatMap((invitation) => {
    const candidate = candidates.find((c) => c.id === invitation.candidateId);
    if (!candidate) return [];
    const progress = jobTestProgress(job, candidate);
    return [{ candidate, invitation, progress, status: trackingStatus(invitation, progress) }];
  });
}

// How far people have got: sent the tests, opened the job, started, finished every test
export function jobFunnel(job: JobPosting, rows: TrackingRow[], candidates: User[]) {
  const accountEmails = new Set(candidates.map((c) => c.email.toLowerCase()));
  const emailedWithoutAccount = (job.invitedEmails ?? []).filter((e) => !accountEmails.has(e)).length;
  const opened = rows.filter((r) => r.status !== 'sent').length;
  const started = rows.filter((r) => r.status === 'in-progress' || r.status === 'completed').length;
  const completed = rows.filter((r) => r.status === 'completed').length;
  return { reached: rows.length + emailedWithoutAccount, opened, started, completed };
}

// Changes one person's invitation to a job's tests, adding it if they don't have one yet
export function withInvitation(job: JobPosting, candidateId: string, change: Partial<JobInvitation>, today: string): JobPosting {
  const existing = job.invitations.find((i) => i.candidateId === candidateId);
  return {
    ...job,
    invitations: existing
      ? job.invitations.map((i) => (i.candidateId === candidateId ? { ...i, ...change } : i))
      : [...job.invitations, { candidateId, invitedAt: today, via: 'link', ...change }],
  };
}

// The link a company shares: the job's own page, where anyone can take its tests and apply
export const jobLink = (job: JobPosting) => `${window.location.origin}${jobPath(job)}`;
