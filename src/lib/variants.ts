import { AssessmentTest, DataTable, Question } from '../types';
import { MOCK_DATABASE, SqlTable, executeSqlQuery, openTaskDatabase, queryRows } from './sqlEngine';

/**
 * Every candidate gets their own numbers. Before a test starts, the data behind its SQL and database tasks is varied
 * from a seed: each number column is moved a little (up to about 12%), so totals, averages and answers differ from one
 * candidate to the next and a shared answer sheet doesn't fit anyone else. The questions themselves don't change.
 *
 * What keeps it fair and markable:
 * - Only tasks marked against a reference are varied: a SQL question's solution query, or a database task's checks
 *   run after its reference solution. Both are run again on the candidate's own data, so the marking follows.
 * - Numbers written in the question (thresholds like "over 10,000", "rating 4.8 or higher") stay exactly as they
 *   are, and every other value stays on the same side of them and in the same order. Filters pick the same rows;
 *   only the amounts change.
 * - ids, years, yes/no flags and columns that don't vary are left alone.
 * - Each variant is tried before it's used: every reference result must have the same rows and columns as on the
 *   original data, and the same order however the rows are stored (so no new ties make a sort ambiguous). If a
 *   seed doesn't pass, another is tried; if none does, that task keeps its original data.
 * - Tasks with answers written out (an expected result typed into a check, or quick questions about the task with
 *   fixed answers) or files to import are left as they are, since those can't follow the change.
 */

// A small seeded random generator (mulberry32), so a seed always gives the same variant
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const newVariantSeed = () => Math.floor(Math.random() * 2 ** 31) + 1;

const KEY_COLUMN = /(^id$|_id$|^id_|year|^is_|^has_|flag|fulfilled|active|zip|postcode|phone|code$)/i;
const MAX_SHIFT = 0.12;
const TRIES = 8;

// Numbers written anywhere in the text: 10,000 and 4.8 and 2026 alike
function numbersIn(text: string): Set<number> {
  const out = new Set<number>();
  for (const m of text.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)) {
    const n = Number(m[0].replace(/,/g, ''));
    if (Number.isFinite(n)) out.add(n);
  }
  return out;
}

const decimalsOf = (n: number) => {
  const s = String(n);
  const i = s.indexOf('.');
  return i < 0 ? 0 : s.length - i - 1;
};

// The roundness of a column's values: 145000 and 160000 move in thousands, 4.8 and 4.9 in tenths
function stepOf(values: number[]): number {
  const decimals = Math.max(...values.map(decimalsOf));
  if (decimals > 0) return 10 ** -decimals;
  let step = 1;
  while (step < 1e6 && values.every((v) => v % (step * 10) === 0)) step *= 10;
  return step;
}

const roundTo = (n: number, step: number) => Number((Math.round(n / step) * step).toFixed(Math.max(0, -Math.floor(Math.log10(step)))));

// New values for one column: each distinct value moves by up to MAX_SHIFT, rounded like the originals, staying strictly
// between its neighbours and never crossing a number fixed by the question. Returns null if the column can't move
function varyColumn(values: number[], fixed: Set<number>, rand: () => number): Map<number, number> | null {
  const distinct = [...new Set(values)].sort((a, b) => a - b);
  if (distinct.length < 2) return null;
  let step = stepOf(distinct);
  // A coarse step can leave no room to move (salaries in thousands with a fixed 150000 between): try finer ones
  for (let attempt = 0; attempt < 3; attempt++, step = step >= 10 ? step / 10 : step) {
    const map = new Map<number, number>();
    let prev = -Infinity;
    let moved = 0;
    let ok = true;
    for (let i = 0; i < distinct.length; i++) {
      const v = distinct[i];
      if (fixed.has(v)) {
        if (v <= prev) ok = false;
        map.set(v, v);
        prev = v;
        continue;
      }
      // The next value that must stay above this one: the next fixed number, or the next value's lowest position
      const nextFixed = [...fixed].filter((f) => f > v).sort((a, b) => a - b)[0] ?? Infinity;
      const lowerFixed = [...fixed].filter((f) => f < v).sort((a, b) => b - a)[0] ?? -Infinity;
      const lo = Math.max(prev + step, lowerFixed + step, v - Math.abs(v) * MAX_SHIFT);
      const hi = Math.min(nextFixed - step, v + Math.abs(v) * MAX_SHIFT, (distinct[i + 1] ?? Infinity) - step);
      let next = v;
      if (lo <= hi) next = roundTo(lo + rand() * (hi - lo), step);
      if (next < lo || next > hi || next <= prev) next = v > prev ? v : NaN;
      if (Number.isNaN(next) || (v > 0 && next <= 0) || (v >= 0 && next < 0)) {
        ok = false;
        break;
      }
      if (next !== v) moved++;
      map.set(v, next);
      prev = next;
    }
    if (ok && moved > 0) return map;
  }
  return null;
}

function varyTables<T extends SqlTable | DataTable>(tables: T[], fixed: Set<number>, rand: () => number): T[] {
  return tables.map((t) => {
    const maps = new Map<string, Map<number, number>>();
    for (const c of t.columns) {
      if (KEY_COLUMN.test(c)) continue;
      const vals = t.rows.map((r) => r[c]);
      const nums = vals.filter((v): v is number => typeof v === 'number');
      // Number columns only (blanks allowed), and not yes/no ones
      if (nums.length === 0 || vals.some((v) => v !== null && v !== undefined && typeof v !== 'number')) continue;
      if (nums.every((v) => v === 0 || v === 1)) continue;
      const map = varyColumn(nums, fixed, rand);
      if (map) maps.set(c, map);
    }
    if (maps.size === 0) return t;
    return {
      ...t,
      rows: t.rows.map((r) => {
        const out = { ...r } as Record<string, unknown>;
        for (const [c, map] of maps) if (typeof r[c] === 'number') out[c] = map.get(r[c] as number) ?? r[c];
        return out;
      }),
    } as T;
  });
}

const reversed = <T extends SqlTable | DataTable>(tables: T[]) => tables.map((t) => ({ ...t, rows: [...t.rows].reverse() }));

// The same rows and columns as the original's, and an order that doesn't depend on how the rows happen to be stored
function sameShape(original: unknown[][], variant: unknown[][], variantReversed: unknown[][], ordered: boolean) {
  if (original.length !== variant.length) return false;
  if ((original[0]?.length ?? 0) !== (variant[0]?.length ?? 0)) return false;
  if (!ordered) return true;
  return JSON.stringify(variant) === JSON.stringify(variantReversed);
}

const rowsOf = (rows: Record<string, unknown>[]) => rows.map((r) => Object.values(r));
const isOrdered = (q: Question) => /\border\s+by\b/i.test(q.solutionCode || q.prompt);

// Quick questions about a task with answers written out can't follow its data changing; written ones are marked on
// reasoning and can
const FIXED_ANSWER_TYPES: Question['type'][] = ['text', 'choice', 'multi', 'order', 'match'];

// SQL questions all share one sample database, so it's varied once for the whole test
async function varySqlDatabase(questions: Question[], seed: number): Promise<SqlTable[] | null> {
  const sql = questions.filter((q) => q.type === 'sql');
  if (sql.length === 0 || sql.some((q) => !q.solutionCode || q.testCases.some((tc) => tc.expectedOutput && !q.solutionCode))) return null;
  const fixed = numbersIn(sql.map((q) => `${q.prompt}\n${q.contextData ?? ''}\n${q.solutionCode}\n${q.starterCode}`).join('\n'));
  const base = Object.values(MOCK_DATABASE);
  const originals = await Promise.all(sql.map((q) => executeSqlQuery(q.solutionCode!, base)));
  if (originals.some((r) => !r.success)) return null;
  for (let i = 0; i < TRIES; i++) {
    const tables = varyTables(base, fixed, rng(seed + i * 7919));
    let ok = true;
    for (let j = 0; j < sql.length && ok; j++) {
      const [v, vr] = await Promise.all([executeSqlQuery(sql[j].solutionCode!, tables), executeSqlQuery(sql[j].solutionCode!, reversed(tables))]);
      ok = v.success && vr.success && sameShape(rowsOf(originals[j].rows), rowsOf(v.rows), rowsOf(vr.rows), isOrdered(sql[j]));
    }
    if (ok) return tables;
  }
  return null;
}

// A database task's own tables, varied if its checks still hold
async function varyDatabaseTask(q: Question, test: AssessmentTest, seed: number): Promise<DataTable[] | null> {
  if (!q.tables?.length || !q.solutionCode) return null;
  if (q.testCases.some((tc) => tc.expectedOutput)) return null;
  if (test.scenario?.files?.length) return null;
  if (test.questions.some((o) => o.taskId === q.id && FIXED_ANSWER_TYPES.includes(o.type))) return null;
  const linked = test.questions.filter((o) => o.taskId === q.id);
  const fixed = numbersIn(
    [q.prompt, q.contextData ?? '', q.solutionCode, q.starterCode, ...q.testCases.map((tc) => tc.input), ...linked.map((o) => `${o.prompt}\n${(o.rubric ?? []).join('\n')}`)].join('\n')
  );
  const checks = async (tables: DataTable[]) => {
    const db = await openTaskDatabase(tables as SqlTable[], [q.solutionCode!]);
    try {
      return q.testCases.map((tc) => {
        const r = queryRows(db, tc.input);
        return 'rows' in r ? r.rows : null;
      });
    } finally {
      db.close();
    }
  };
  const original = await checks(q.tables);
  if (original.some((r) => r === null)) return null;
  for (let i = 0; i < TRIES; i++) {
    const tables = varyTables(q.tables, fixed, rng(seed + 104729 + i * 7919));
    const [v, vr] = await Promise.all([checks(tables), checks(reversed(tables))]);
    if (v.every((rows, k) => rows && vr[k] && sameShape(original[k]!, rows, vr[k]!, true))) return tables;
  }
  return null;
}

/**
 * The candidate's own version of a test, from a seed. Questions keep their ids, wording and marks; SQL questions get
 * the varied sample database in `tables`, database tasks their varied tables. `varied` lists the questions that
 * changed.
 */
export async function makeVariant(test: AssessmentTest, seed: number): Promise<{ test: AssessmentTest; varied: string[] }> {
  try {
    const sqlTables = await varySqlDatabase(test.questions, seed);
    const varied: string[] = [];
    const questions = await Promise.all(
      test.questions.map(async (q) => {
        if (q.type === 'sql' && sqlTables) {
          varied.push(q.id);
          return { ...q, tables: sqlTables as DataTable[] };
        }
        if (q.type === 'database') {
          const tables = await varyDatabaseTask(q, test, seed);
          if (tables) {
            varied.push(q.id);
            return { ...q, tables };
          }
        }
        return q;
      })
    );
    return { test: varied.length ? { ...test, questions } : test, varied };
  } catch {
    // Anything unexpected: the original test, which is always fair
    return { test, varied: [] };
  }
}
