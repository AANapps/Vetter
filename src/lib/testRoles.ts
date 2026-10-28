import { Question, TestRole } from '../types';

// Industries and the roles within them, as listed on the Tests page
export const ROLE_GROUPS: { industry: string; roles: TestRole[] }[] = [
  { industry: 'Software Engineering', roles: ['Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer', 'Platform & DevOps', 'QA Engineer'] },
  { industry: 'Data & Analytics', roles: ['Data Analyst', 'Data Engineer'] },
  { industry: 'Consulting & Business', roles: ['Consultant', 'Business Analyst'] },
  { industry: 'Finance & Accounting', roles: ['Financial Analyst', 'Accountant'] },
  { industry: 'Marketing & Sales', roles: ['Digital Marketer', 'Sales Representative'] },
  { industry: 'Healthcare', roles: ['Healthcare Professional'] },
  { industry: 'Operations', roles: ['Project Manager'] },
];

// A set of roles the Tests page can be narrowed to: one role, an industry, or a field from Home
export interface TestField {
  label: string;
  roles: TestRole[];
}

// The fields Home's moving strip offers, each opening the Tests page on its tests. They overlap on purpose:
// web development takes in frontend and backend
export const HOME_FIELDS: (TestField & { blurb: string; icon: FieldIcon })[] = [
  { label: 'Web Development', roles: ['Frontend Engineer', 'Backend Engineer', 'Full Stack Engineer'], blurb: 'Sites and apps, end to end', icon: 'globe' },
  { label: 'Front-end Development', roles: ['Frontend Engineer'], blurb: 'Interfaces people use', icon: 'layout' },
  { label: 'Data Analysis', roles: ['Data Analyst'], blurb: 'Numbers into decisions', icon: 'chart' },
  { label: 'Finance & Accounting', roles: ['Financial Analyst', 'Accountant'], blurb: 'Statements, margins and cash', icon: 'finance' },
  { label: 'Backend & APIs', roles: ['Backend Engineer'], blurb: 'Services and databases', icon: 'server' },
  { label: 'Marketing', roles: ['Digital Marketer'], blurb: 'Campaigns that pay back', icon: 'megaphone' },
  { label: 'Healthcare', roles: ['Healthcare Professional'], blurb: 'Safe, careful patient care', icon: 'health' },
  { label: 'Data Engineering', roles: ['Data Engineer'], blurb: 'Pipelines and warehouses', icon: 'database' },
  { label: 'Sales', roles: ['Sales Representative'], blurb: 'Pipeline, deals and closing', icon: 'handshake' },
  { label: 'Cloud & DevOps', roles: ['Platform & DevOps'], blurb: 'Systems that stay up', icon: 'cloud' },
  { label: 'Project Management', roles: ['Project Manager'], blurb: 'Plans delivered on time', icon: 'kanban' },
  { label: 'Software Testing', roles: ['QA Engineer'], blurb: 'Finding bugs first', icon: 'bug' },
  { label: 'Consulting', roles: ['Consultant', 'Business Analyst'], blurb: 'Cases, markets and advice', icon: 'briefcase' },
];

export type FieldIcon =
  | 'globe'
  | 'layout'
  | 'chart'
  | 'finance'
  | 'server'
  | 'megaphone'
  | 'health'
  | 'database'
  | 'handshake'
  | 'cloud'
  | 'kanban'
  | 'bug'
  | 'briefcase';

export const QUESTION_TYPE_LABELS: Record<Question['type'], string> = {
  sql: 'SQL',
  code: 'JavaScript',
  scenario: 'Scenario',
  choice: 'Multiple choice',
  schema: 'Schema design',
};

// "3 checks" for code and SQL tasks; multiple choice has one right answer
export const describeChecks = (q: Question) =>
  q.type === 'choice' ? `${q.options?.length ?? 0} options` : `${q.testCases.length} ${q.testCases.length === 1 ? 'check' : 'checks'}`;
