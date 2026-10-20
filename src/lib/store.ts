import { AssessmentTest, JobPosting, SocialState, User } from '../types';
import {
  INITIAL_CANDIDATE,
  OTHER_CANDIDATES,
  STANDARD_ASSESSMENTS,
  COMPANY_ASSESSMENTS,
  INITIAL_JOBS,
} from '../data/mockData';
import { SEED_SOCIAL } from '../data/seedSocial';
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
    const createdTests = saved.tests.filter((t) => !SEED_TESTS.some((s) => s.id === t.id));

    return {
      candidate: withAvatar(saved.candidate),
      otherCandidates: saved.otherCandidates.map(withAvatar),
      // Saved jobs keep their changes; listing details added in code since are filled in from the seed
      jobs: saved.jobs.map((j) => ({ ...seed.jobs.find((s) => s.id === j.id), ...j })),
      tests: [...SEED_TESTS, ...createdTests],
      // Saved before the feed existed: start from the seeded conversation
      social: saved.social ?? seed.social,
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
