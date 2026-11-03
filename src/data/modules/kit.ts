import { Question, TestAspect, TestDifficulty } from '../../types';

/**
 * A module skeleton: its core areas, and a bank of questions, every one tagged with an area and a level. The tests a
 * module had before keep their questions, tagged here; new ones fill every area at every level.
 */
export interface ModuleSkeleton {
  familyId: string;
  aspects: TestAspect[];
  // The module's existing questions (from its tests before it had a skeleton): question id → [area, level]
  tags: Record<string, [string, TestDifficulty]>;
  // Questions written for the skeleton, tagged with tagged()
  bank: Question[];
  passingScores?: Partial<Record<TestDifficulty, number>>;
}

// Questions in one area at one level
export const tagged = (aspect: string, tier: TestDifficulty, ...questions: Question[]): Question[] => questions.map((q) => ({ ...q, aspect, tier }));

// A coding task: solution(...args) is run on each case's input (a JSON array of its arguments)
export const codeTask = (
  id: string,
  title: string,
  prompt: string,
  signature: string,
  solutionCode: string,
  cases: [description: string, input: string, expectedOutput: string][],
  opts: { minutes?: number; weight?: number } = {}
): Question => ({
  id,
  title,
  type: 'code',
  prompt,
  starterCode: `function solution(${signature}) {\n  // Your code here\n}`,
  solutionCode,
  testCases: cases.map(([description, input, expectedOutput], i) => ({ id: `tc-${id}-${i + 1}`, description, input, expectedOutput })),
  timeLimitMinutes: opts.minutes ?? 8,
  weight: opts.weight ?? 30,
});

export const B: TestDifficulty = 'Beginner';
export const J: TestDifficulty = 'Junior';
export const P: TestDifficulty = 'Professional';
export const S: TestDifficulty = 'Senior';
