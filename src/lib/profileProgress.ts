import { useEffect, useMemo, useState } from 'react';
import { AssessmentTest, JobPosting, JobProfile, TestRole, User } from '../types';
import { getBestTestScore } from './matchingAlgorithm';
import { levelsOf } from './testLevels';
import { ROLE_GROUPS, ROLE_SECTIONS, TestSection } from './testRoles';
import { roleHidden, useLibraryVisibility } from './libraryVisibility';
import { SectorId, industryInSector } from './sectors';
import { jobsUsing } from './demand';

/**
 * How far a candidate has got: their profile strength (the profile itself counts a little, proven skills most) and
 * their progress through the role they're working towards (a module counts once it has a score). Shared by their profile and their home page, so both
 * show the same numbers and the same next step.
 */

export interface PathModule {
  sec: TestSection;
  test: AssessmentTest;
  best: number | undefined;
  isSim: boolean;
  // Open jobs that use the test
  wanted: number;
}

// What a step's button does; each page wires these to its own editors
export type StepAction = 'profile' | 'experience' | 'education' | 'details' | 'next-test' | 'sim' | 'retake-best';

export interface StrengthStep {
  id: string;
  label: string;
  hint: string;
  weight: number;
  done: boolean;
  cta: string;
  action: StepAction;
  test?: boolean;
}

// The best score on any level of a test
export const bestOnAnyLevel = (candidate: User, test: AssessmentTest, tests: AssessmentTest[]) => {
  const scores = levelsOf(test, tests)
    .map((v) => getBestTestScore(candidate, v.id))
    .filter((s): s is number => s !== undefined);
  return scores.length ? Math.max(...scores) : undefined;
};

const storeKey = (id: string) => `praxa-path-${id}`;
const readStored = (key: string) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStored = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private window: the pick just isn't remembered */
  }
};

export function useProfileProgress(input: {
  candidate: User;
  shown: { title: string; bio: string };
  activeProfile?: JobProfile;
  tests: AssessmentTest[];
  jobs: JobPosting[];
  sector: SectorId;
}) {
  const { candidate, shown, activeProfile, tests, jobs, sector } = input;
  const visibility = useLibraryVisibility();

  // The roles with a path of modules, in the sector shown
  const roles = ROLE_GROUPS.filter((g) => industryInSector(sector)(g.industry))
    .flatMap((g) => g.roles)
    .filter((r) => ROLE_SECTIONS[r]?.length && !roleHidden(visibility, r));

  // The role they're working towards: picked, else named in their profile, else the one they've taken most tests in
  const guessedRole = useMemo<TestRole | undefined>(() => {
    const text = `${activeProfile?.name ?? ''} ${shown.title}`.toLowerCase();
    const named = roles.find((r) => text.includes(r.toLowerCase()));
    if (named) return named;
    // A role without a path of its own (e.g. Data Engineer): one in the same field that has one
    const group = ROLE_GROUPS.find((g) => g.roles.some((r) => text.includes(r.toLowerCase())));
    const sibling = group?.roles.find((r) => roles.includes(r));
    if (sibling) return sibling;
    const taken = new Set(candidate.testResults.map((r) => r.testId));
    const byTaken = [...roles]
      .map((r) => ({ r, n: ROLE_SECTIONS[r]!.filter((s) => s.testIds.some((id) => taken.has(id))).length }))
      .sort((a, b) => b.n - a.n)[0];
    return byTaken && byTaken.n > 0 ? byTaken.r : roles[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.id, shown.title, roles.join('|'), candidate.testResults.length]);
  const [pickedRole, setPickedRole] = useState<TestRole | undefined>(() => (readStored(storeKey(candidate.id)) as TestRole) || undefined);
  useEffect(() => {
    setPickedRole((readStored(storeKey(candidate.id)) as TestRole) || undefined);
    // Picked somewhere else on the page (home's card and its list both use this): follow it
    const follow = (e: Event) => setPickedRole((e as CustomEvent<TestRole>).detail);
    window.addEventListener('praxa-path-change', follow);
    return () => window.removeEventListener('praxa-path-change', follow);
  }, [candidate.id]);
  const setRole = (r: TestRole) => {
    setPickedRole(r);
    writeStored(storeKey(candidate.id), r);
    window.dispatchEvent(new CustomEvent('praxa-path-change', { detail: r }));
  };
  // Their own pick on this device, else the job they said they're after (at sign-up), else a guess
  const chosen = pickedRole ?? candidate.targetRole;
  const role = chosen && roles.includes(chosen) ? chosen : guessedRole;
  // Whether they've chosen a role themselves, rather than it being guessed
  const rolePicked = !!chosen && roles.includes(chosen);

  // Each of the role's modules, with their best score on it
  const path: PathModule[] = (role ? ROLE_SECTIONS[role] ?? [] : [])
    .map((sec) => {
      const test = tests.find((t) => t.id === sec.testIds[0]);
      if (!test) return null;
      return { sec, test, best: bestOnAnyLevel(candidate, test, tests), isSim: /simulation/i.test(sec.label), wanted: jobsUsing(test, tests, jobs) };
    })
    .filter((m): m is PathModule => !!m);
  // No pass marks: a module counts once it has a score
  const takenModules = path.filter((m) => m.best !== undefined);
  // What to do next: a module not started, skills before the job simulation
  const nextModule = path.filter((m) => !m.isSim).find((m) => m.best === undefined) ?? path.find((m) => m.best === undefined);
  const pathPct = path.length ? Math.round((takenModules.length / path.length) * 100) : 0;

  // Profile strength
  const scoredAny = candidate.verifiedSkills.length > 0;
  const simDone =
    path.some((m) => m.isSim && m.best !== undefined) ||
    candidate.testResults.some((r) => /simulation/i.test(tests.find((t) => t.id === r.testId)?.title ?? ''));
  const steps: StrengthStep[] = [
    { id: 'headline', label: 'Write a headline', hint: 'The line under your name, e.g. "Data Analyst · SQL and Power BI".', weight: 5, done: !!shown.title?.trim(), cta: 'Add', action: 'profile' },
    { id: 'about', label: 'Write your About', hint: 'Two or three sentences on what you do and want next.', weight: 5, done: (shown.bio?.trim().length ?? 0) >= 40, cta: 'Add', action: 'profile' },
    { id: 'experience', label: 'Add your experience', hint: 'Jobs, internships and placements. Or fill it in from your CV.', weight: 10, done: !!candidate.experience?.length, cta: 'Add', action: 'experience' },
    { id: 'education', label: 'Add your education', hint: 'Your degree, qualifications or certifications.', weight: 5, done: !!(candidate.education?.length || candidate.certifications?.length), cta: 'Add', action: 'education' },
    { id: 'links', label: 'Add a link', hint: 'LinkedIn, GitHub or a portfolio.', weight: 5, done: !!candidate.links?.length, cta: 'Add', action: 'details' },
    { id: 'first', label: 'Take your first test', hint: 'Your score on any Granyt test goes on your profile.', weight: 25, done: scoredAny, cta: 'Take a test', action: 'next-test', test: true },
    { id: 'three', label: 'Get scores on 3 tests', hint: 'Companies shortlist candidates with several test scores first.', weight: 30, done: candidate.verifiedSkills.length >= 3, cta: 'Next test', action: 'next-test', test: true },
    { id: 'sim', label: 'Do a job simulation', hint: 'A whole working day on a desktop. The strongest proof you can do the job.', weight: 15, done: simDone, cta: 'See it', action: 'sim', test: true },
  ];
  const strength = steps.reduce((sum, s) => sum + (s.done ? s.weight : 0), 0);
  const level = strength >= 100 ? 'All-Star' : strength >= 70 ? 'Advanced' : strength >= 35 ? 'Intermediate' : 'Beginner';
  // Tests come first when they're what's missing: they're what companies judge on
  const todo = steps.filter((s) => !s.done).sort((a, b) => Number(!!b.test) - Number(!!a.test) || b.weight - a.weight);

  // The test a step's button opens, if it opens one
  const testFor = (action: StepAction): string | undefined => {
    if (action === 'next-test') return nextModule?.test.id;
    if (action === 'sim') return path.find((m) => m.isSim)?.test.id;
    if (action === 'retake-best') return [...candidate.verifiedSkills].sort((a, b) => b.score - a.score)[0]?.testId;
    return undefined;
  };

  return { roles, role, rolePicked, setRole, path, takenModules, nextModule, pathPct, scoredAny, steps, strength, level, todo, testFor };
}
