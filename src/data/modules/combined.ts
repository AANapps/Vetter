import { TestDifficulty, TestRole } from '../../types';

/**
 * One test per tool for a role, made from several module tests: their areas and questions pooled into one bank, so a
 * single test mixes every kind of question (quick questions, worked answers, hands-on work, written answers). Data
 * Analyst's Power BI and Tableau are one Mid-level test each, 20 minutes, asking in every area, without case studies (its
 * other tools are hand-written in daModules.ts). The source tests stay in the library for other roles.
 */
export interface CombinedTest {
  id: string;
  title: string;
  description: string;
  skillsTested: string[];
  roles: TestRole[];
  // The module tests (family ids) whose banks are pooled, the first leading
  sources: string[];
  maxMinutes: number;
  // One test at this level, covering every area, instead of one per level
  onlyLevel?: TestDifficulty;
  // Leave out case studies and the questions about them: only questions on the tool itself
  noCases?: boolean;
}

const DA: TestRole[] = ['Data Analyst'];
const da = (id: string, title: string, description: string, skillsTested: string[], sources: string[]): CombinedTest => ({
  id,
  title,
  description,
  skillsTested,
  roles: DA,
  sources,
  maxMinutes: 20,
  onlyLevel: 'Professional',
  noCases: true,
});

export const COMBINED_TESTS: CombinedTest[] = [
];
