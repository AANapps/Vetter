/**
 * In-browser SQL engine backed by SQLite (sql.js / WebAssembly).
 * Every query runs against a fresh copy of the sample database, so
 * candidates can't change the data other questions are graded on.
 */
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url';
import type { TestCase } from '../types';
import type { CodeExecutionResult } from './codeEngine';

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
  sales: {
    name: 'sales',
    columns: ['id', 'order_date', 'region', 'rep', 'product', 'revenue'],
    rows: [
      { id: 1, order_date: '2026-01-05', region: 'North', rep: 'Priya', product: 'Analytics Suite', revenue: 4200 },
      { id: 2, order_date: '2026-01-12', region: 'South', rep: 'Tom', product: 'Data Connector', revenue: 1800 },
      { id: 3, order_date: '2026-01-19', region: 'West', rep: 'Lena', product: 'Analytics Suite', revenue: 3900 },
      { id: 4, order_date: '2026-01-26', region: 'North', rep: 'Omar', product: 'Reporting Add-on', revenue: 950 },
      { id: 5, order_date: '2026-02-02', region: 'South', rep: 'Tom', product: 'Analytics Suite', revenue: 4100 },
      { id: 6, order_date: '2026-02-09', region: 'West', rep: 'Lena', product: 'Data Connector', revenue: 2100 },
      { id: 7, order_date: '2026-02-16', region: 'North', rep: 'Priya', product: 'Data Connector', revenue: 1700 },
      { id: 8, order_date: '2026-02-23', region: 'South', rep: 'Tom', product: 'Reporting Add-on', revenue: 1200 },
      { id: 9, order_date: '2026-03-02', region: 'West', rep: 'Omar', product: 'Analytics Suite', revenue: 5200 },
      { id: 10, order_date: '2026-03-09', region: 'North', rep: 'Priya', product: 'Analytics Suite', revenue: 4800 },
      { id: 11, order_date: '2026-03-16', region: 'South', rep: 'Lena', product: 'Data Connector', revenue: 2300 },
      { id: 12, order_date: '2026-03-23', region: 'West', rep: 'Lena', product: 'Reporting Add-on', revenue: 1100 },
      { id: 13, order_date: '2026-04-06', region: 'North', rep: 'Omar', product: 'Data Connector', revenue: 1900 },
      { id: 14, order_date: '2026-04-13', region: 'South', rep: 'Tom', product: 'Data Connector', revenue: 4400 },
      { id: 15, order_date: '2026-04-20', region: 'West', rep: 'Priya', product: 'Analytics Suite', revenue: 3600 },
      { id: 16, order_date: '2026-04-27', region: 'North', rep: 'Priya', product: 'Reporting Add-on', revenue: 1300 },
    ],
  },
  // Deliberately messy, for the data cleaning test
  customers_raw: {
    name: 'customers_raw',
    columns: ['id', 'full_name', 'email', 'country', 'signup_date', 'age'],
    rows: [
      { id: 1, full_name: '  Ada Lovelace ', email: 'ADA@example.com', country: 'UK', signup_date: '2026-01-04', age: 36 },
      { id: 2, full_name: 'Grace  Hopper', email: 'grace@example.com', country: 'United States', signup_date: '04/02/2026', age: 45 },
      { id: 3, full_name: 'ada lovelace', email: ' ada@example.com ', country: 'United Kingdom', signup_date: '2026/03/01', age: 36 },
      { id: 4, full_name: 'Alan Turing', email: 'alan.turing@example', country: 'GB', signup_date: '2026-02-10', age: 41 },
      { id: 5, full_name: 'Katherine Johnson', email: null, country: 'USA', signup_date: '2026-01-20', age: 101 },
      { id: 6, full_name: 'Linus Torvalds', email: 'linus@example.com', country: 'Germany', signup_date: '2026-02-28', age: -4 },
      { id: 7, full_name: 'Margaret Hamilton', email: 'margaret@example.com', country: 'us', signup_date: '15/01/2026', age: 52 },
      { id: 8, full_name: 'Grace Hopper', email: 'Grace@Example.com', country: 'U.S.', signup_date: '2026-01-02', age: 45 },
      { id: 9, full_name: 'Tim Berners-Lee', email: 'tim@example.com', country: '', signup_date: '2026-03-12', age: null },
      { id: 10, full_name: 'Barbara Liskov', email: 'barbara@example.com', country: 'Deutschland', signup_date: '2026-03-18', age: 210 },
    ],
  },
  // A shop database with planted defects, for the QA SQL test
  shop_customers: {
    name: 'shop_customers',
    columns: ['id', 'name', 'email'],
    rows: [
      { id: 1, name: 'Nina Park', email: 'nina@shop.test' },
      { id: 2, name: 'Owen Hale', email: 'owen@shop.test' },
      { id: 3, name: 'Nina Park', email: 'Nina@Shop.test' },
      { id: 4, name: 'Ravi Shah', email: 'ravi@shop.test' },
      { id: 5, name: 'Owen Hale', email: 'OWEN@shop.test' },
    ],
  },
  shop_orders: {
    name: 'shop_orders',
    columns: ['id', 'customer_id', 'status', 'total', 'placed_at', 'shipped_at'],
    rows: [
      { id: 1, customer_id: 1, status: 'delivered', total: 59.97, placed_at: '2026-09-01', shipped_at: '2026-09-02' },
      { id: 2, customer_id: 2, status: 'shipped', total: 25, placed_at: '2026-09-03', shipped_at: null },
      { id: 3, customer_id: 4, status: 'delivered', total: 40, placed_at: '2026-09-05', shipped_at: '2026-09-04' },
      { id: 4, customer_id: 1, status: 'pending', total: 15.5, placed_at: '2026-09-06', shipped_at: '2026-09-07' },
      { id: 5, customer_id: 3, status: 'shipped', total: 100, placed_at: '2026-09-08', shipped_at: '2026-09-09' },
      { id: 6, customer_id: 2, status: 'pending', total: 12, placed_at: '2026-09-10', shipped_at: null },
    ],
  },
  shop_order_items: {
    name: 'shop_order_items',
    columns: ['id', 'order_id', 'product', 'quantity', 'unit_price'],
    rows: [
      { id: 1, order_id: 1, product: 'Mug', quantity: 3, unit_price: 19.99 },
      { id: 2, order_id: 2, product: 'Notebook', quantity: 2, unit_price: 12.5 },
      { id: 3, order_id: 3, product: 'Lamp', quantity: 1, unit_price: 40 },
      { id: 4, order_id: 4, product: 'Pen', quantity: 5, unit_price: 3.1 },
      { id: 5, order_id: 5, product: 'Chair', quantity: 1, unit_price: 89 },
      { id: 6, order_id: 6, product: 'Notebook', quantity: 2, unit_price: 12 },
      { id: 7, order_id: 9, product: 'Mug', quantity: 1, unit_price: 19.99 },
      { id: 8, order_id: 11, product: 'Pen', quantity: 2, unit_price: 3.1 },
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

const sqlValue = (v: unknown) => {
  if (v === null || v === undefined) return 'NULL';
  return typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`;
};

// Build a database from sample tables: MOCK_DATABASE unless a task brings its own
function seedStatements(tables: SqlTable[] = Object.values(MOCK_DATABASE)): string {
  return tables
    .map((table) => {
      const columnDefs = table.columns
        .map((c) => {
          const values = table.rows.map((r) => r[c]).filter((v) => v !== null && v !== undefined);
          if (!values.length || values.some((v) => typeof v !== 'number')) return `${c} TEXT`;
          return `${c} ${values.every(Number.isInteger) ? 'INTEGER' : 'REAL'}`;
        })
        .join(', ');
      // A few hundred rows per INSERT keeps large tables quick to build
      const inserts: string[] = [];
      for (let i = 0; i < table.rows.length; i += 400) {
        const chunk = table.rows.slice(i, i + 400).map((row) => `(${table.columns.map((c) => sqlValue(row[c])).join(', ')})`);
        inserts.push(`INSERT INTO ${table.name} VALUES ${chunk.join(',\n')};`);
      }
      return `CREATE TABLE ${table.name} (${columnDefs});\n${inserts.join('\n')}`;
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

/**
 * Grade a schema design task. The candidate's CREATE statements run on an empty database with
 * foreign keys enforced, then each check runs on its own fresh copy. A check is a script whose
 * statements before the last are setup that must succeed; the last statement is the one being
 * tested, and is expected to be 'accepted', 'rejected', or to return the given rows as JSON.
 */
export async function runSchemaChecks(ddl: string, checks: TestCase[]): Promise<CodeExecutionResult> {
  const start = performance.now();
  const SQL = await loadSqlJs();

  const testCaseResults = checks.map((tc) => {
    const tcStart = performance.now();
    const statements = tc.input.split(';').map((st) => st.trim()).filter(Boolean);
    const last = statements.pop() ?? '';
    const db = new SQL.Database();
    let actual: string;
    let error: string | undefined;
    try {
      db.run('PRAGMA foreign_keys = ON;');
      try {
        db.run(ddl);
      } catch (err: any) {
        throw new Error(`Your schema failed to run: ${err?.message}`);
      }
      for (const st of statements) {
        try {
          db.run(st);
        } catch (err: any) {
          throw new Error(`Setup "${st}" failed: ${err?.message}`);
        }
      }
      try {
        const res = db.exec(last);
        const rows = res.length ? res[res.length - 1].values.map((v) => Object.fromEntries(res[res.length - 1].columns.map((c, i) => [c, v[i]]))) : [];
        actual = tc.expectedOutput.startsWith('[') ? JSON.stringify(rows) : 'accepted';
      } catch (err: any) {
        actual = 'rejected';
        if (tc.expectedOutput !== 'rejected') error = err?.message;
      }
    } catch (err: any) {
      actual = 'setup failed';
      error = err?.message;
    } finally {
      db.close();
    }
    return {
      id: tc.id,
      description: tc.description,
      passed: actual === tc.expectedOutput,
      input: tc.input,
      expected: tc.expectedOutput,
      actual: error ? `${actual} (${error})` : actual,
      executionMs: Math.max(1, Math.round(performance.now() - tcStart)),
      error,
    };
  });

  const passed = testCaseResults.filter((r) => r.passed).length;
  return {
    allPassed: passed === checks.length,
    score: checks.length ? Math.round((passed / checks.length) * 100) : 100,
    testCaseResults,
    logs: [],
    totalExecutionTimeMs: Math.round(performance.now() - start),
  };
}

// ---------- Database tasks ----------
// A database task gives the candidate a live database: what they run changes it, as in a real SQL tool. Their work is
// kept as the statements that changed it, so it can be rebuilt, and marked by check queries on the result.

export interface ResultSet {
  columns: string[];
  rows: unknown[][];
}

export interface BatchResult {
  resultSets: ResultSet[];
  messages: { text: string; error?: boolean }[];
  // Statements that changed the database, in order, to replay it later
  changes: string[];
  ms: number;
}

// The database a task starts with, with the candidate's changes so far replayed on top
export async function openTaskDatabase(tables: SqlTable[], changes: string[] = []): Promise<Database> {
  const SQL = await loadSqlJs();
  const db = new SQL.Database();
  db.run(seedStatements(tables));
  for (const st of changes) {
    try {
      db.run(st);
    } catch {
      // A change that no longer applies is skipped, as it would have failed then too
    }
  }
  return db;
}

// Runs a batch statement by statement, like a query window: every result set, rows affected, and the first error
export function runBatch(db: Database, sql: string): BatchResult {
  const start = performance.now();
  const out: BatchResult = { resultSets: [], messages: [], changes: [], ms: 0 };
  try {
    for (const stmt of db.iterateStatements(sql)) {
      try {
        const columns = stmt.getColumnNames();
        if (columns.length) {
          const rows: unknown[][] = [];
          while (stmt.step()) rows.push(stmt.get());
          out.resultSets.push({ columns, rows });
          out.messages.push({ text: `(${rows.length} row${rows.length === 1 ? '' : 's'} returned)` });
        } else {
          stmt.step();
          const text = stmt.getSQL();
          out.changes.push(text);
          out.messages.push({
            text: /^\s*(insert|update|delete|replace)\b/i.test(text)
              ? `(${db.getRowsModified()} row${db.getRowsModified() === 1 ? '' : 's'} affected)`
              : 'Commands completed successfully.',
          });
        }
      } finally {
        stmt.free();
      }
    }
  } catch (e: any) {
    out.messages.push({ text: e?.message ?? String(e), error: true });
  }
  out.ms = Math.max(1, Math.round(performance.now() - start));
  return out;
}

// The tables and views in a database, with their columns, for the object explorer
export function describeDatabase(db: Database): { name: string; kind: 'table' | 'view'; columns: { name: string; type: string }[] }[] {
  const objects = db.exec(`SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY type, name`);
  return (objects[0]?.values ?? []).map(([name, type]) => {
    const info = db.exec(`PRAGMA table_info(${sqlIdent(String(name))})`);
    return {
      name: String(name),
      kind: type === 'view' ? 'view' : 'table',
      columns: (info[0]?.values ?? []).map((col) => ({ name: String(col[1]), type: String(col[2] || 'ANY') })),
    };
  });
}

export const sqlIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

// A CSV file as a new table, the way an import wizard creates one: column types guessed from the values
export function importStatements(table: string, rows: string[][]): string {
  const [header, ...data] = rows;
  const columns = header.map((h, i) => h.trim().replace(/\s+/g, '_') || `column${i + 1}`);
  const types = columns.map((_, i) => {
    const values = data.map((r) => (r[i] ?? '').trim()).filter((v) => v !== '');
    if (values.length && values.every((v) => /^-?\d+$/.test(v))) return 'INTEGER';
    if (values.length && values.every((v) => /^-?(\d+\.?\d*|\.\d+)$/.test(v))) return 'REAL';
    return 'TEXT';
  });
  const value = (v: string | undefined, type: string) => {
    const t = (v ?? '').trim();
    if (t === '') return 'NULL';
    return type === 'TEXT' ? sqlValue(v) : t;
  };
  const create = `CREATE TABLE ${sqlIdent(table)} (${columns.map((c, i) => `${sqlIdent(c)} ${types[i]}`).join(', ')});`;
  const inserts = data.length
    ? `INSERT INTO ${sqlIdent(table)} VALUES ${data.map((r) => `(${columns.map((_, i) => value(r[i], types[i])).join(', ')})`).join(',\n')};`
    : '';
  return [create, inserts].filter(Boolean).join('\n');
}

// Runs one check query on a database, as rows of values
export function queryRows(db: Database, sql: string): { rows: unknown[][] } | { error: string } {
  try {
    const res = db.exec(sql);
    return { rows: res.length ? res[res.length - 1].values : [] };
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

