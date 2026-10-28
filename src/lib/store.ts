import { AppNotification, AssessmentTest, JobInvitation, JobPosting, SocialState, TEST_DIFFICULTIES, User } from '../types';
import {
  INITIAL_CANDIDATE,
  OTHER_CANDIDATES,
  STANDARD_ASSESSMENTS,
  COMPANY_ASSESSMENTS,
  INITIAL_JOBS,
  INITIAL_BUSINESSES,
} from '../data/mockData';
import { SEED_SOCIAL } from '../data/seedSocial';
import { SEED_JOB_TEST_RESULTS, SEED_NOTIFICATIONS } from '../data/seedInvitations';
import { addTestResult } from './results';
import { withFilterFields } from './jobFilters';
import { buildSeedCandidates, withComputedPercentiles, withSeedDurations } from '../data/seedCandidates';

/**
 * App data store. Persists to the browser's localStorage so results survive a
 * refresh. This is the single place to swap in a real API later: load/save
 * have the same shape a server would return.
 */
// v2; anything saved in an older shape (like the assessments jobs used to have) is brought up to date in loadData
const STORAGE_KEY = 'vetter:data:v2';

export interface AppData {
  candidate: User;
  otherCandidates: User[];
  jobs: JobPosting[];
  tests: AssessmentTest[];
  social: SocialState;
  notifications: AppNotification[];
}

const SEED_TESTS = [...STANDARD_ASSESSMENTS, ...COMPANY_ASSESSMENTS];

export function createSeedData(): AppData {
  const handWritten = [INITIAL_CANDIDATE, ...OTHER_CANDIDATES].map((u) => withSeedDurations(u, SEED_TESTS));
  // Results already handed in for jobs' tests
  const withJobTestResults = [...handWritten, ...buildSeedCandidates(SEED_TESTS)].map((u) =>
    SEED_JOB_TEST_RESULTS.filter((e) => e.candidateId === u.id).reduce((acc, { result }) => {
      const test = SEED_TESTS.find((t) => t.id === result.testId);
      return test ? addTestResult(acc, test, result) : acc;
    }, u)
  );
  const everyone = withComputedPercentiles(withJobTestResults);
  return {
    candidate: everyone[0],
    otherCandidates: everyone.slice(1),
    jobs: INITIAL_JOBS,
    tests: SEED_TESTS,
    social: SEED_SOCIAL,
    notifications: SEED_NOTIFICATIONS,
  };
}

// Saved before jobs held their own tests: each job had an assessment with its tests and invitations, and one attached test
interface SavedExam {
  id: string;
  jobId?: string;
  testIds: string[];
  passingScore: number;
  invitations: JobInvitation[];
  invitedEmails?: string[];
}
type SavedJob = JobPosting & { attachedTestId?: string; attachedTestPassingScore?: number; isAttachedTestMandatory?: boolean };

function withSavedExam(job: SavedJob, exams?: SavedExam[]): JobPosting {
  const { attachedTestId, attachedTestPassingScore, isAttachedTestMandatory, ...rest } = job;
  const exam = exams?.find((e) => e.jobId === job.id);
  delete (rest as { attachedTestTitle?: string }).attachedTestTitle;
  if (!exam && job.testIds) return rest;
  return {
    ...rest,
    testIds: exam?.testIds ?? (attachedTestId ? [attachedTestId] : []),
    testPassingScore: exam?.passingScore ?? attachedTestPassingScore ?? 70,
    testsRequired: job.testsRequired ?? isAttachedTestMandatory ?? false,
    invitations: exam?.invitations ?? [],
    invitedEmails: exam?.invitedEmails,
  };
}

export function loadData(): AppData {
  const seed = createSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const saved = JSON.parse(raw) as Omit<AppData, 'notifications'> & { exams?: SavedExam[]; notifications: (Omit<AppNotification, 'jobId'> & { jobId?: string; examId?: string })[] };

    // Bundled images get new URLs on each build, so always take avatars from the seed
    const seedAvatars = new Map([seed.candidate, ...seed.otherCandidates].map((u) => [u.id, u.avatarUrl]));
    const withAvatar = (u: User) => ({ ...u, avatarUrl: seedAvatars.get(u.id) ?? u.avatarUrl });
    // Saved before candidates had a career stage: seeded people take theirs (and its title and place) from the seed
    const seedPeople = new Map([seed.candidate, ...seed.otherCandidates].map((u) => [u.id, u]));
    const withStudies = (u: User): User => {
      const s = seedPeople.get(u.id);
      if (u.careerStage || !s?.careerStage) return u;
      const { careerStage, studySubject, university, title, location, yearsExperience } = s;
      return { ...u, careerStage, studySubject, university, title, location, yearsExperience };
    };

    // Seeded tests always come from code (so content fixes apply); tests created in the app are kept
    // Tests saved under older difficulty names were all made as the hardest level
    const createdTests = saved.tests
      .filter((t) => !SEED_TESTS.some((s) => s.id === t.id))
      .map((t) => (TEST_DIFFICULTIES.includes(t.difficulty) ? t : { ...t, difficulty: 'Senior' as const }));

    // Saved jobs keep their changes; listing details added in code since are filled in from the seed,
    // and anything the job board filters need is filled in for jobs created before the form asked for it.
    // Seeded jobs added since are included.
    const jobs = [
      ...saved.jobs.map((j) =>
        withFilterFields(
          withSavedExam({ ...seed.jobs.find((s) => s.id === j.id), ...j }, saved.exams),
          INITIAL_BUSINESSES.find((b) => b.id === j.businessId)
        )
      ),
      ...seed.jobs.filter((s) => !saved.jobs.some((j) => j.id === s.id)),
    ];

    return {
      // Saved before job profiles existed: start from the seeded ones
      candidate: withAvatar(
        saved.candidate.jobProfiles
          ? saved.candidate
          : {
              ...saved.candidate,
              jobProfiles: seed.candidate.jobProfiles,
              activeProfileId: seed.candidate.activeProfileId,
              applicationProfiles: seed.candidate.applicationProfiles,
            }
      ),
      otherCandidates: saved.otherCandidates.map((u) => withStudies(withAvatar(u))),
      jobs,
      tests: [...SEED_TESTS, ...createdTests],
      // Saved before the feed existed: start from the seeded conversation
      social: saved.social ?? seed.social,
      // Invites saved when they pointed at an assessment now point at its job
      notifications: saved.notifications
        ? saved.notifications.flatMap((n) => {
            const jobId = n.jobId ?? saved.exams?.find((e) => e.id === n.examId)?.jobId;
            return jobId ? [{ id: n.id, userId: n.userId, kind: 'job-invite' as const, jobId, createdAt: n.createdAt, read: n.read }] : [];
          })
        : seed.notifications,
    };
  } catch {
    return seed;
  }
}

export function saveData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (private mode): the app keeps working for this session
  }
}

export function clearData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear
  }
}
