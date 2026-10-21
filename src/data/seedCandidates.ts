import { AssessmentTest, TestResult, User, VerifiedSkill } from '../types';
import { getPercentile } from '../lib/leaderboard';

// Deterministic random numbers so the seeded leaderboards are the same on every load
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hashString = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

const AVATAR_COLOURS = ['#6c47ff', '#c048ff', '#00a060', '#e88000', '#e41e54', '#0e8ce4', '#d67830', '#5834ff'];

// Initials avatar as an inline SVG, so seeded candidates need no image hosting
export function initialsAvatar(name: string): string {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const colour = AVATAR_COLOURS[Math.abs(hashString(name)) % AVATAR_COLOURS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${colour}"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Source Sans 3, Arial, sans-serif" font-size="26" font-weight="700" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const NAMES = [
  'Priya Raman', 'Tomás Herrera', 'Yuki Tanaka', 'Amara Okafor', 'Noah Fischer', 'Sofia Rossi', 'Daniel Mensah',
  'Hannah Lee', 'Omar Haddad', 'Isabella Cruz', 'Lukas Novak', 'Mei Lin', 'Ethan Brooks', 'Zara Ahmed',
  'Mateo Silva', 'Grace Kim', 'Arjun Mehta', 'Freya Nilsson', 'Kwame Asante', 'Olivia Martin', 'Ravi Shankar',
  'Elif Demir', 'Jonas Weber', 'Nadia Petrova', 'Samuel Adeyemi', 'Chen Wei', 'Lucía Gómez', 'Ben Carter',
  'Ayesha Siddiqui', 'Felix Wagner', 'Maya Patel', 'Diego Morales', 'Ingrid Berg', 'Kofi Boateng', 'Leah Cohen',
  'Hiro Sato',
];

const TITLES = [
  'Backend Engineer', 'Senior Backend Engineer', 'Data Engineer', 'Senior Data Engineer', 'Frontend Engineer',
  'Senior Frontend Engineer', 'Full-Stack Engineer', 'Platform Engineer', 'Site Reliability Engineer',
  'Analytics Engineer', 'Software Engineer II', 'Staff Software Engineer',
];

const LOCATIONS = [
  'London, UK', 'Berlin, DE', 'Toronto, CA', 'Austin, TX', 'New York, NY', 'Bangalore, IN', 'Lisbon, PT',
  'Amsterdam, NL', 'Singapore, SG', 'Seattle, WA', 'Lagos, NG', 'Sydney, AU',
];

export const SKILL_IDS: Record<AssessmentTest['category'], string> = {
  Databases: 'skill-sql',
  'System Architecture': 'skill-sys',
  Frontend: 'skill-frontend',
  'Backend APIs': 'skill-backend',
  Algorithms: 'skill-algorithms',
  'Data Analysis': 'skill-analytics',
  'Quality Assurance': 'skill-qa',
  Consulting: 'skill-consulting',
};

// Tests the seed was first generated with. They share one random stream, in this order, so existing
// leaderboards stay the same; tests added later draw from their own stream per candidate.
const ORIGINAL_SEED_TESTS = new Set(['test-sql-01', 'test-sys-01', 'test-fe-01', 'test-be-01', 'test-custom-01']);

export const levelForScore = (score: number): VerifiedSkill['level'] =>
  score >= 90 ? 'Staff / Lead' : score >= 80 ? 'Senior' : 'Mid';

const isoDate = (d: Date) => d.toISOString().split('T')[0];

// Verified skills mirror each candidate's best score on every Vetter-made test they've taken
export function deriveVerifiedSkills(results: TestResult[], tests: AssessmentTest[]): VerifiedSkill[] {
  return tests
    .filter((t) => t.type === 'standard')
    .flatMap((test) => {
      const attempts = results.filter((r) => r.testId === test.id).sort((a, b) => a.completedAt.localeCompare(b.completedAt));
      if (attempts.length === 0) return [];
      const best = attempts.reduce((a, b) => (b.score > a.score ? b : a));
      return [
        {
          skillId: SKILL_IDS[test.category],
          skillName: test.skillsTested[0] || test.title,
          category: test.category,
          score: best.score,
          percentile: 0, // filled in by withComputedPercentiles
          verifiedAt: best.completedAt,
          testId: test.id,
          level: levelForScore(best.score),
          history: attempts.map((a) => ({ date: a.completedAt, score: a.score, testName: test.title })),
        },
      ];
    });
}

export function buildSeedCandidates(tests: AssessmentTest[]): User[] {
  const rand = mulberry32(20261019);
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)];
  // Roughly bell-shaped scores around the low 70s
  const score = (r: () => number) => {
    const bell = (r() + r() + r()) / 3;
    return Math.max(28, Math.min(100, Math.round(40 + bell * 62)));
  };
  const dateBetween = (r: () => number, from: string, to: string) => {
    const a = new Date(from).getTime();
    const b = new Date(to).getTime();
    return isoDate(new Date(a + r() * (b - a)));
  };

  return NAMES.map((name, i) => {
    const results: TestResult[] = [];
    tests.forEach((test) => {
      const isOriginal = ORIGINAL_SEED_TESTS.has(test.id);
      const r = isOriginal ? rand : mulberry32(hashString(`${name}:${test.id}`));
      // Engineers make up most of the seed, so later tests for other roles are taken less often
      const takeRate = test.type === 'custom' ? 0.3 : isOriginal ? 0.62 : 0.3;
      if (!(r() < takeRate)) return;
      const attempts = r() < 0.25 ? 2 : 1;
      let completedAt = dateBetween(r, '2026-06-01', '2026-09-20');
      for (let a = 0; a < attempts; a++) {
        results.push({
          testId: test.id,
          score: score(r),
          completedAt,
          durationSeconds: Math.round(test.estimatedMinutes * 60 * (0.35 + r() * 0.6)),
        });
        completedAt = dateBetween(r, completedAt, '2026-10-15');
      }
    });

    const first = name.split(' ')[0].toLowerCase();
    return {
      id: `cand-seed-${String(i + 1).padStart(2, '0')}`,
      name,
      email: `${first}@example.dev`,
      role: 'candidate' as const,
      avatarUrl: initialsAvatar(name),
      title: pick(TITLES),
      location: pick(LOCATIONS),
      yearsExperience: 1 + Math.floor(rand() * 12),
      workPreference: pick(['Remote', 'Hybrid', 'On-site'] as const),
      bio: '',
      verifiedSkills: deriveVerifiedSkills(results, tests),
      testResults: results,
      appliedJobIds: [],
    };
  });
}

// Hand-written candidates don't record how long they took; give them plausible, stable durations
export function withSeedDurations(user: User, tests: AssessmentTest[]): User {
  const rand = mulberry32(hashString(user.id));
  return {
    ...user,
    testResults: user.testResults.map((r) => {
      if (r.durationSeconds !== undefined) return r;
      const minutes = tests.find((t) => t.id === r.testId)?.estimatedMinutes ?? 20;
      return { ...r, durationSeconds: Math.round(minutes * 60 * (0.4 + rand() * 0.5)) };
    }),
  };
}

// Percentiles come from the actual leaderboard, not a formula
export function withComputedPercentiles(candidates: User[]): User[] {
  return candidates.map((c) => ({
    ...c,
    verifiedSkills: c.verifiedSkills.map((s) => ({
      ...s,
      percentile: getPercentile(s.score, s.testId, candidates, c.id),
    })),
  }));
}
