import { TestRole } from '../../types';

/**
 * One test per tool for a role, made from several module tests: their areas and questions pooled into one bank, so a
 * single test mixes every kind of question (quick questions, worked answers, hands-on work, written answers) and each
 * level asks harder ones. Every level runs about 15 minutes. The source tests stay in the library for other roles.
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
}

const DA: TestRole[] = ['Data Analyst'];
const da = (id: string, title: string, description: string, skillsTested: string[], sources: string[]): CombinedTest => ({
  id,
  title,
  description,
  skillsTested,
  roles: DA,
  sources,
  maxMinutes: 15,
});

export const COMBINED_TESTS: CombinedTest[] = [
  da('test-da-excel', 'Excel', 'Formulas, lookups, PivotTables and what-if models, then real work in a working spreadsheet.', ['Excel', 'XLOOKUP', 'PivotTables', 'Reporting'], ['test-excel-01', 'test-excel-02']),
  da('test-da-sql', 'SQL', 'Filtering, joins, grouping, CTEs and window functions, then queries against a real database.', ['SQL', 'Joins', 'Window Functions', 'CTEs'], ['test-sql-02', 'test-sql-03', 'test-qasql-01']),
  da('test-da-powerbi', 'Power BI', 'Power Query, data models, DAX and time intelligence, and reports people can trust.', ['Power BI', 'DAX', 'Power Query', 'Data Modelling'], ['test-pbi-01', 'test-pbi-02']),
  da('test-da-tableau', 'Tableau', 'Calculations, table calculations, LOD expressions, charts and dashboards.', ['Tableau', 'LOD Expressions', 'Table Calculations', 'Dashboards'], ['test-tab-01', 'test-tab-02']),
  da('test-da-python', 'Python', 'pandas for loading, cleaning and aggregating data, time series, statistics and charts.', ['Python', 'pandas', 'Time Series', 'Data Visualisation'], ['test-py-01', 'test-py-02']),
  da('test-da-importing', 'Data Importing', 'Getting messy files and sources in without losing or changing a row.', ['Data Importing', 'CSV', 'Data Types', 'Encoding'], ['test-import-01']),
  da('test-da-cleaning', 'Data Cleaning', 'Finding and fixing duplicates, blanks, bad formats and outliers before they reach a decision.', ['Data Cleaning', 'Data Quality', 'Validation'], ['test-clean-01', 'test-clean-02']),
  da('test-da-reporting', 'Dashboards & Reporting', 'KPIs, charts and reports people can read at a glance and act on.', ['Dashboards', 'KPIs', 'Reporting', 'Data Visualisation'], ['test-dash-01', 'test-dash-02']),
  da('test-da-metrics', 'Metrics & Statistics', 'Business metrics, A/B tests and the statistics behind them.', ['Metrics', 'A/B Testing', 'Statistics'], ['test-da-01', 'test-stats-01']),
];
