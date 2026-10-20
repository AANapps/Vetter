import { Question, TestRole } from '../types';

// Industries and the roles within them, as listed on the Tests page
export const ROLE_GROUPS: { industry: string; roles: TestRole[] }[] = [
  { industry: 'Software Engineering', roles: ['Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer', 'Platform & DevOps'] },
  { industry: 'Data & Analytics', roles: ['Data Analyst', 'Data Engineer'] },
  { industry: 'Consulting & Business', roles: ['Consultant', 'Business Analyst'] },
];

export const QUESTION_TYPE_LABELS: Record<Question['type'], string> = {
  sql: 'SQL',
  code: 'JavaScript',
  scenario: 'Scenario',
  choice: 'Multiple choice',
};

// "3 checks" for code and SQL tasks; multiple choice has one right answer
export const describeChecks = (q: Question) =>
  q.type === 'choice' ? `${q.options?.length ?? 0} options` : `${q.testCases.length} ${q.testCases.length === 1 ? 'check' : 'checks'}`;
