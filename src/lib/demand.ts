import { AssessmentTest, JobPosting, TestRole } from '../types';
import { levelsOf } from './testLevels';

/**
 * Hiring demand for a test, from published labour-market research (not from activity on Vetter): LinkedIn's Jobs on
 * the Rise 2026, the World Economic Forum's Future of Jobs Report 2025, and the US Bureau of Labor Statistics'
 * employment projections for 2024–34, for the main role a test is for. Roles the research
 * doesn't single out show no badge. Alongside it, the live count of jobs on Vetter that use the test.
 */

export type DemandLevel = 'high' | 'rising';

export interface Demand {
  level: DemandLevel;
  reason: string;
  source: string;
}

export const DEMAND_SOURCES =
  'LinkedIn Jobs on the Rise 2026, the WEF Future of Jobs Report 2025 and US Bureau of Labor Statistics projections for 2024–34';

const ROLE_DEMAND: Partial<Record<TestRole, Demand>> = {
  'AI Engineer': { level: 'high', reason: 'AI engineer is the fastest-growing job in the US', source: 'LinkedIn Jobs on the Rise 2026' },
  'AI Consultant': { level: 'high', reason: 'AI consultant and strategist is the second fastest-growing job in the US', source: 'LinkedIn Jobs on the Rise 2026' },
  'Data Scientist': { level: 'rising', reason: 'Data scientist jobs are projected to grow 33.5% by 2034', source: 'US Bureau of Labor Statistics' },
  'SOC Analyst': { level: 'rising', reason: 'Information security analyst jobs are projected to grow 28.5% by 2034', source: 'US Bureau of Labor Statistics' },
  'Data Engineer': { level: 'rising', reason: 'Big data specialists are the fastest-growing role to 2030', source: 'WEF Future of Jobs Report 2025' },
  'Software Developer': { level: 'rising', reason: 'Software and application developers are among the fastest-growing roles to 2030', source: 'WEF Future of Jobs Report 2025' },
  'Healthcare Professional': { level: 'rising', reason: 'Healthcare roles such as nurse practitioners are among the fastest-growing jobs to 2034', source: 'US Bureau of Labor Statistics' },
};

// From the test's main role (the first it lists), so a test merely tagged for a fast-growing role doesn't borrow its
// demand
export function demandFor(test: Pick<AssessmentTest, 'roles'>): Demand | undefined {
  const main = test.roles?.[0];
  return main ? ROLE_DEMAND[main] : undefined;
}

// Open jobs on Vetter that ask for any level of this test
export function jobsUsing(test: AssessmentTest, tests: AssessmentTest[], jobs: JobPosting[]): number {
  const ids = new Set(levelsOf(test, tests).map((t) => t.id).concat(test.id));
  return jobs.filter((j) => j.testIds.some((id) => ids.has(id))).length;
}
