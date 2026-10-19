/**
 * In-browser SQL engine backed by SQLite (sql.js / WebAssembly).
 * Every query runs against a fresh copy of the sample database, so
 * candidates can't change the data other questions are graded on.
 */
import initSqlJs, { type SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';

export interface SqlTable {
  name: string;
  columns: string[];
  rows: Record<string, any>[];
}

export const MOCK_DATABASE: Record<string, SqlTable> = {
  employees: {
    name: 'employees',
    columns: ['id', 'name', 'department', 'salary', 'rating', 'hire_year'],
    rows: [
      { id: 1, name: 'Elena Rostova', department: 'Engineering', salary: 145000, rating: 4.8, hire_year: 2021 },
      { id: 2, name: 'Marcus Chen', department: 'Engineering', salary: 160000, rating: 4.9, hire_year: 2020 },
      { id: 3, name: 'Sarah Jenkins', department: 'Design', salary: 125000, rating: 4.6, hire_year: 2022 },
      { id: 4, name: 'David Kim', department: 'Engineering', salary: 135000, rating: 4.3, hire_year: 2023 },
      { id: 5, name: 'Aisha Al-Mansoor', department: 'Product', salary: 155000, rating: 4.9, hire_year: 2021 },
      { id: 6, name: 'Julian Vance', department: 'Data', salary: 150000, rating: 4.7, hire_year: 2022 },
      { id: 7, name: 'Chloe Dubois', department: 'Data', salary: 142000, rating: 4.5, hire_year: 2023 },
      { id: 8, name: 'Rajesh Patel', department: 'Engineering', salary: 175000, rating: 4.9, hire_year: 2019 },
    ],
  },
  departments: {
    name: 'departments',
    columns: ['id', 'dept_name', 'quarterly_budget', 'headcount_cap'],
    rows: [
      { id: 1, dept_name: 'Engineering', quarterly_budget: 1200000, headcount_cap: 25 },
      { id: 2, dept_name: 'Data', quarterly_budget: 650000, headcount_cap: 12 },
      { id: 3, dept_name: 'Product', quarterly_budget: 450000, headcount_cap: 8 },
      { id: 4, dept_name: 'Design', quarterly_budget: 350000, headcount_cap: 6 },
    ],
  },
  orders: {
    name: 'orders',
    columns: ['id', 'client_id', 'client_name', 'amount', 'region', 'fulfilled'],
    rows: [
      { id: 101, client_id: 1, client_name: 'Acme Corp', amount: 4800, region: 'US-East', fulfilled: 1 },
      { id: 102, client_id: 2, client_name: 'Stripe Global', amount: 12500, region: 'US-West', fulfilled: 1 },
      { id: 103, client_id: 1, client_name: 'Acme Corp', amount: 3200, region: 'US-East', fulfilled: 1 },
      { id: 104, client_id: 3, client_name: 'Vercel Inc', amount: 8900, region: 'EU-Central', fulfilled: 0 },
      { id: 105, client_id: 2, client_name: 'Stripe Global', amount: 15400, region: 'US-West', fulfilled: 1 },
      { id: 106, client_id: 4, client_name: 'Datadog Tech', amount: 6400, region: 'US-East', fulfilled: 1 },
      { id: 107, client_id: 3, client_name: 'Vercel Inc', amount: 7100, region: 'EU-Central', fulfilled: 1 },
    ],
  },
};

export interface SqlExecutionResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  errorMessage?: string;
}

let sqlJsPromise: Promise<SqlJsStatic> | null = null;
const loadSqlJs = () => (sqlJsPromise ??= initSqlJs({ locateFile: () => sqlWasmUrl }));

// Build the sample database from MOCK_DATABASE
function seedStatements(): string {
  return Object.values(MOCK_DATABASE)
    .map((table) => {
      const firstRow = table.rows[0] || {};
      const columnDefs = table.columns
        .map((c) => `${c} ${typeof firstRow[c] === 'number' ? (Number.isInteger(firstRow[c]) ? 'INTEGER' : 'REAL') : 'TEXT'}`)
        .join(', ');
      const inserts = table.rows
        .map((row) => {
          const values = table.columns.map((c) => {
            const v = row[c];
            return typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
          });
          return `INSERT INTO ${table.name} VALUES (${values.join(', ')});`;
        })
        .join('\n');
      return `CREATE TABLE ${table.name} (${columnDefs});\n${inserts}`;
    })
    .join('\n');
}

export async function executeSqlQuery(rawQuery: string): Promise<SqlExecutionResult> {
  const start = performance.now();
  const clean = rawQuery.trim();
  const elapsed = () => Math.max(1, Math.round(performance.now() - start));

  if (!clean) {
    return { success: false, columns: [], rows: [], rowCount: 0, executionTimeMs: 0, errorMessage: 'Query is empty.' };
  }

  const SQL = await loadSqlJs();
  const db = new SQL.Database();
  try {
    db.run(seedStatements());
    const results = db.exec(clean);
    // Show the result of the last statement that returned rows
    const last = results[results.length - 1];
    if (!last) {
      return { success: true, columns: [], rows: [], rowCount: 0, executionTimeMs: elapsed() };
    }
    const rows = last.values.map((vals) => Object.fromEntries(last.columns.map((c, i) => [c, vals[i]])));
    return { success: true, columns: last.columns, rows, rowCount: rows.length, executionTimeMs: elapsed() };
  } catch (err: any) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: elapsed(),
      errorMessage: err?.message || 'Syntax error in SQL query.',
    };
  } finally {
    db.close();
  }
}
