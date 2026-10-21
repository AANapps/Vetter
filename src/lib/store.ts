import { AppNotification, AssessmentTest, Exam, JobPosting, SocialState, TEST_DIFFICULTIES, User } from '../types';
import {
  INITIAL_CANDIDATE,
  OTHER_CANDIDATES,
  STANDARD_ASSESSMENTS,
  COMPANY_ASSESSMENTS,
  INITIAL_JOBS,
  INITIAL_BUSINESSES,
} from '../data/mockData';
import { SEED_SOCIAL } from '../data/seedSocial';
import { SEED_EXAMS, SEED_NOTIFICATIONS } from '../data/seedExams';
import { withFilterFields } from './jobFilters';
import { buildSeedCandidates, withComputedPercentiles, withSeedDurations } from '../data/seedCandidates';

/**
 * App data store. Persists to the browser's localStorage so results survive a
 * refresh. This is the single place to swap in a real API later: load/save
 * have the same shape a server would return.
 */
const STORAGE_KEY = 'vetter:data:v1';

export interface AppData {
  candidate: User;
  otherCandidates: User[];
  jobs: JobPosting[];
  tests: AssessmentTest[];
  social: SocialState;
  exams: Exam[];
  notifications: AppNotification[];
}

const SEED_TESTS = [...STANDARD_ASSESSMENTS, ...COMPANY_ASSESSMENTS];

export function createSeedData(): AppData {
  const handWritten = [INITIAL_CANDIDATE, ...OTHER_CANDIDATES].map((u) => withSeedDurations(u, SEED_TESTS));
  const everyone = withComputedPercentiles([...handWritten, ...buildSeedCandidates(SEED_TESTS)]);
  return {
    candidate: everyone[0],
    otherCandidates: everyone.slice(1),
    jobs: INITIAL_JOBS,
    tests: SEED_TESTS,
    social: SEED_SOCIAL,
    exams: SEED_EXAMS,
    notifications: SEED_NOTIFICATIONS,
  };
}

export function loadData(): AppData {
  const seed = createSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed;
    const saved = JSON.parse(raw) as AppData;

    // Bundled images get new URLs on each build, so always take avatars from the seed
    const seedAvatars = new Map([seed.candidate, ...seed.otherCandidates].map((u) => [u.id, u.avatarUrl]));
    const withAvatar = (u: User) => ({ ...u, avatarUrl: seedAvatars.get(u.id) ?? u.avatarUrl });

    // Seeded tests always come from code (so content fixes apply); tests created in the app are kept
    // Tests saved under older difficulty names were all made as the hardest level
    const createdTests = saved.tests
      .filter((t) => !SEED_TESTS.some((s) => s.id === t.id))
      .map((t) => (TEST_DIFFICULTIES.includes(t.difficulty) ? t : { ...t, difficulty: 'Senior' as const }));

    return {
      candidate: withAvatar(saved.candidate),
      otherCandidates: saved.otherCandidates.map(withAvatar),
      // Saved jobs keep their changes; listing details added in code since are filled in from the seed,
      // and anything the job board filters need is filled in for jobs created before the form asked for it
      jobs: saved.jobs.map((j) =>
        withFilterFields({ ...seed.jobs.find((s) => s.id === j.id), ...j }, INITIAL_BUSINESSES.find((b) => b.id === j.businessId))
      ),
      tests: [...SEED_TESTS, ...createdTests],
      // Saved before the feed existed: start from the seeded conversation
      social: saved.social ?? seed.social,
      // Saved before exams existed: start from the seeded ones
      exams: saved.exams ?? seed.exams,
      notifications: saved.notifications ?? seed.notifications,
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
