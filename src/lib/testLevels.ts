import { AssessmentTest, TEST_DIFFICULTIES } from '../types';

// The test a family of level versions is known by; tests without versions are their own family
export const familyIdOf = (test: AssessmentTest) => test.familyId ?? test.id;

// Lists show each test once, by its main version; the others are reached through its level picker
export const isMainVersion = (test: AssessmentTest) => familyIdOf(test) === test.id;

// Every level of a test, Beginner first
export const levelsOf = (test: AssessmentTest, tests: AssessmentTest[]) =>
  tests
    .filter((t) => familyIdOf(t) === familyIdOf(test))
    .sort((a, b) => TEST_DIFFICULTIES.indexOf(a.difficulty) - TEST_DIFFICULTIES.indexOf(b.difficulty));

// A version's name wherever the level matters, e.g. on a job's requirements
export const versionTitle = (test: AssessmentTest) => (test.type === 'standard' ? `${test.title} (${test.difficulty})` : test.title);
