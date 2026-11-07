import { AssessmentTest, TestResult, User } from '../types';
import { seedIntegrity } from '../lib/integrity';
import { isMainVersion } from '../lib/testLevels';
import { deriveVerifiedSkills, hashString, initialsAvatar, mulberry32 } from './seedCandidates';

// Five sample candidates shown alongside the real ones on the live site, so companies have full profiles to look at.
// Each has taken several of Vetter's tests, picked at random but the same on every load (seeded by their id)
const PEOPLE: Omit<User, 'role' | 'avatarUrl' | 'verifiedSkills' | 'testResults' | 'appliedJobIds'>[] = [
  {
    id: 'cand-sample-01',
    name: 'Amara Okafor',
    email: 'amara.okafor@example.dev',
    title: 'Senior Data Analyst',
    location: 'London, UK',
    yearsExperience: 6,
    workPreference: 'Hybrid',
    careerStage: 'Working',
    studySubject: 'Economics',
    university: 'University of Warwick',
    bio: 'Six years turning messy commercial data into decisions. SQL and Python daily, dashboards people actually use, and A/B tests that hold up. Led the pricing analytics rebuild at a fintech scale-up.',
  },
  {
    id: 'cand-sample-02',
    name: 'Daniel Novak',
    email: 'daniel.novak@example.dev',
    title: 'Backend Engineer',
    location: 'Manchester, UK',
    yearsExperience: 4,
    workPreference: 'Remote',
    careerStage: 'Working',
    studySubject: 'Computer Science',
    university: 'University of Manchester',
    bio: 'Builds APIs and the services behind them in TypeScript and Go. Cares about clear contracts, good tests and on-call nights that stay quiet.',
  },
  {
    id: 'cand-sample-03',
    name: 'Priya Raman',
    email: 'priya.raman@example.dev',
    title: 'Computer Science student',
    location: 'Edinburgh, UK',
    yearsExperience: 0,
    workPreference: 'On-site',
    careerStage: 'Student',
    studySubject: 'Computer Science',
    university: 'University of Edinburgh',
    bio: 'Final-year student looking for a graduate software role. Built a course-planning app used by 2,000 students and interned on a platform team last summer.',
  },
  {
    id: 'cand-sample-04',
    name: 'Tom Hughes',
    email: 'tom.hughes@example.dev',
    title: 'Customer Success Manager',
    location: 'Bristol, UK',
    yearsExperience: 7,
    workPreference: 'Hybrid',
    careerStage: 'Working',
    bio: 'Looks after a book of 40 B2B accounts with 96% retention. Calm on difficult calls, good with a spreadsheet and happiest when a customer becomes a reference.',
  },
  {
    id: 'cand-sample-05',
    name: 'Sofia Marquez',
    email: 'sofia.marquez@example.dev',
    title: 'Graduate Product Analyst',
    location: 'London, UK',
    yearsExperience: 1,
    workPreference: 'Hybrid',
    careerStage: 'Graduate',
    studySubject: 'Mathematics',
    university: 'UCL',
    bio: 'Maths graduate in her first analyst role. Enjoys product metrics, experiment design and explaining numbers to people who don’t love numbers.',
  },
];

const day = (d: Date) => d.toISOString().split('T')[0];

export function buildSampleCandidates(tests: AssessmentTest[]): User[] {
  // Vetter's own tests, one per family (not each level's copy)
  const pool = tests.filter((t) => t.type === 'standard' && isMainVersion(t));
  return PEOPLE.map((p) => {
    const rand = mulberry32(hashString(p.id));
    // Three to six tests each, in a random order
    const chosen = [...pool].sort(() => rand() - 0.5).slice(0, 3 + Math.floor(rand() * 4));
    const results: TestResult[] = chosen.flatMap((test, i) => {
      const attempts = rand() < 0.3 ? 2 : 1;
      let when = new Date(Date.UTC(2026, 6, 1) + rand() * 90 * 86400000);
      return Array.from({ length: attempts }, (_, a) => {
        // Roughly 55-98, a little better on a retake
        const score = Math.min(100, Math.round(55 + ((rand() + rand()) / 2) * 43 + a * 6));
        const result: TestResult = {
          testId: test.id,
          score,
          completedAt: day(when),
          durationSeconds: Math.round(test.estimatedMinutes * 60 * (0.45 + rand() * 0.5)),
          integrity: seedIntegrity(mulberry32(hashString(`${p.id}:${test.id}:${i}:${a}`))),
        };
        when = new Date(when.getTime() + (7 + rand() * 30) * 86400000);
        return result;
      });
    });
    return {
      ...p,
      role: 'candidate',
      avatarUrl: initialsAvatar(p.name),
      verifiedSkills: deriveVerifiedSkills(results, tests),
      testResults: results,
      appliedJobIds: [],
    };
  });
}
