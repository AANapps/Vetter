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

// A role's tests in labelled sections, by tool or skill. The Tests page groups them under these headings, and the
// left menu lists them under the role. A test in no section is shown last, under "More tests"
export interface TestSection {
  id: string;
  label: string;
  blurb: string;
  testIds: string[];
}

export const ROLE_SECTIONS: Partial<Record<TestRole, TestSection[]>> = {
  'Data Analyst': [
    { id: 'excel', label: 'Excel', blurb: 'Lookups, formulas and reports in a real spreadsheet.', testIds: ['test-excel-01'] },
    { id: 'sql', label: 'SQL', blurb: 'Querying, joining and checking data in a database.', testIds: ['test-sql-02', 'test-qasql-01'] },
    { id: 'power-bi', label: 'Power BI', blurb: 'Power Query, data models, DAX and reports.', testIds: ['test-pbi-01'] },
    { id: 'tableau', label: 'Tableau', blurb: 'Calculations, LODs, charts and dashboards.', testIds: ['test-tab-01'] },
    { id: 'python', label: 'Python', blurb: 'pandas for loading, cleaning and aggregating data.', testIds: ['test-py-01'] },
    { id: 'cleaning', label: 'Data Cleaning', blurb: 'Finding and fixing bad data before it reaches a decision.', testIds: ['test-clean-01'] },
    { id: 'reporting', label: 'Dashboards & Reporting', blurb: 'KPIs and reports people can act on.', testIds: ['test-dash-01'] },
    { id: 'metrics', label: 'Metrics & Statistics', blurb: 'Business metrics, A/B tests and the statistics behind them.', testIds: ['test-da-01'] },
    { id: 'simulations', label: 'Job Simulations', blurb: 'A day of real analyst work, across every tool.', testIds: ['test-sim-da-01'] },
  ],
};

// The sections the Tests page shows for a field: only when it is one role that has them
export const sectionsFor = (field: TestField | null): TestSection[] | null =>
  field && field.roles.length === 1 ? ROLE_SECTIONS[field.roles[0]] ?? null : null;

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
  multi: 'Select all that apply',
  text: 'Short answer',
  written: 'Written answer',
  case: 'Case study',
  order: 'Drag to order',
  match: 'Drag to match',
  sheet: 'Spreadsheet',
  database: 'SQL database',
  app: 'App simulation',
};

// "3 checks" for code tasks; answer-style questions say what's to pick or arrange
export function describeChecks(q: Question): string {
  switch (q.type) {
    case 'choice':
    case 'multi':
      return `${q.options?.length ?? 0} options`;
    case 'text':
      return 'one answer';
    case 'written':
      return `${q.rubric?.length ?? 0} marking points`;
    case 'case':
      return 'to read';
    case 'order':
      return `${q.items?.length ?? 0} items`;
    case 'match':
      return `${q.pairs?.length ?? 0} pairs`;
    case 'sql':
      return q.testCases.length ? `${q.testCases.length} ${q.testCases.length === 1 ? 'check' : 'checks'}` : 'result checked';
    default:
      return `${q.testCases.length} ${q.testCases.length === 1 ? 'check' : 'checks'}`;
  }
}
