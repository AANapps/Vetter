import { AssessmentTest, Question } from '../types';
import { executeSqlQuery, openTaskDatabase, queryRows, runSchemaChecks, SqlExecutionResult } from './sqlEngine';
import { parseDatabaseWork } from './databaseWork';
import { checkSheet, parseWorkbook } from './spreadsheet';
import { runJavaScriptCode, CodeExecutionResult } from './codeEngine';
import { gradeAnswer, isAnswerType } from './questionTypes';

export type TestCaseOutcome = CodeExecutionResult['testCaseResults'][number];

export type QuestionRunResult =
  | ({ type: 'sql'; score: number; testCaseResults: TestCaseOutcome[] } & SqlExecutionResult)
  | ({ type: 'code' } & CodeExecutionResult);

// Rows as arrays of values: column aliases don't matter, the data does
const toValueRows = (rows: Record<string, any>[] | unknown[][]) =>
  rows.map((row) => Object.values(row as object).map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)));

const sameRows = (actual: unknown[][], expected: unknown[][], ordered: boolean) => {
  const key = (r: unknown[]) => JSON.stringify(r);
  const a = actual.map(key);
  const e = expected.map(key);
  if (!ordered) {
    a.sort();
    e.sort();
  }
  return a.length === e.length && a.every((row, i) => row === e[i]);
};

// The reference result for a SQL question: its solution query if it has one, otherwise the authored expected output
async function expectedSqlRows(q: Question): Promise<Record<string, any>[] | null> {
  if (q.solutionCode) {
    const res = await executeSqlQuery(q.solutionCode);
    if (res.success) return res.rows;
  }
  const authored = q.testCases[0]?.expectedOutput;
  if (!authored) return null;
  try {
    return JSON.parse(authored);
  } catch {
    return null;
  }
}

async function runSqlQuestion(q: Question, code: string): Promise<QuestionRunResult> {
  const result = await executeSqlQuery(code);
  const expected = await expectedSqlRows(q);
  const ordered = /\border\s+by\b/i.test(q.solutionCode || q.prompt);
  const passed = result.success && expected !== null && sameRows(toValueRows(result.rows), toValueRows(expected), ordered);

  return {
    type: 'sql',
    ...result,
    score: passed ? 100 : 0,
    testCaseResults: [
      {
        id: q.testCases[0]?.id || `${q.id}-result`,
        description: q.testCases[0]?.description || 'Query returns the expected rows',
        passed,
        input: 'Your query',
        expected: JSON.stringify(expected ?? []),
        actual: result.success ? JSON.stringify(result.rows) : result.errorMessage || 'Query failed',
        executionMs: result.executionTimeMs,
        error: result.success ? undefined : result.errorMessage,
      },
    ],
  };
}

// A spreadsheet task: each check is a formula run on the finished workbook
function gradeSheetQuestion(q: Question, answer: string): QuestionRunResult {
  const start = performance.now();
  const wb = parseWorkbook(answer || q.starterCode);
  const testCaseResults = q.testCases.map((tc) => {
    const { passed, actual } = checkSheet(wb, tc.input, tc.expectedOutput);
    return { id: tc.id, description: tc.description, passed, input: tc.input, expected: tc.expectedOutput, actual, executionMs: 0 };
  });
  const passed = testCaseResults.filter((r) => r.passed).length;
  return {
    type: 'code',
    allPassed: passed === testCaseResults.length,
    score: testCaseResults.length ? Math.round((passed / testCaseResults.length) * 100) : 0,
    testCaseResults,
    logs: [],
    totalExecutionTimeMs: Math.round(performance.now() - start),
  };
}

// A database task: the candidate's changes are replayed on a fresh copy, then each check query must return what it
// returns after the reference solution (or the rows the check states)
async function gradeDatabaseQuestion(q: Question, answer: string): Promise<QuestionRunResult> {
  const start = performance.now();
  const work = parseDatabaseWork(answer || q.starterCode);
  const db = await openTaskDatabase(q.tables ?? [], work.changes);
  const reference = await openTaskDatabase(q.tables ?? [], q.solutionCode ? [q.solutionCode] : []);
  try {
    const testCaseResults = q.testCases.map((tc) => {
      const got = queryRows(db, tc.input);
      let expected: unknown[][] = [];
      if (tc.expectedOutput) expected = JSON.parse(tc.expectedOutput);
      else {
        const ref = queryRows(reference, tc.input);
        if ('rows' in ref) expected = ref.rows;
      }
      const passed = 'rows' in got && sameRows(toValueRows(got.rows), toValueRows(expected), true);
      return {
        id: tc.id,
        description: tc.description,
        passed,
        input: tc.input,
        expected: JSON.stringify(expected),
        actual: 'rows' in got ? JSON.stringify(got.rows) : got.error,
        executionMs: 0,
        error: 'error' in got ? got.error : undefined,
      };
    });
    const passed = testCaseResults.filter((r) => r.passed).length;
    return {
      type: 'code',
      allPassed: passed === testCaseResults.length,
      score: testCaseResults.length ? Math.round((passed / testCaseResults.length) * 100) : 0,
      testCaseResults,
      logs: [],
      totalExecutionTimeMs: Math.round(performance.now() - start),
    };
  } finally {
    db.close();
    reference.close();
  }
}

// Picked, typed or arranged answers, stored like code
function gradeAnswerQuestion(q: Question, answer: string): QuestionRunResult {
  const score = gradeAnswer(q, answer);
  return { type: 'code', allPassed: score === 100, score, testCaseResults: [], logs: [], totalExecutionTimeMs: 0 };
}

export async function runQuestion(q: Question, code: string): Promise<QuestionRunResult> {
  if (q.type === 'sql') return runSqlQuestion(q, code);
  if (q.type === 'sheet') return gradeSheetQuestion(q, code);
  if (q.type === 'database') return gradeDatabaseQuestion(q, code);
  if (isAnswerType(q.type)) return gradeAnswerQuestion(q, code);
  if (q.type === 'schema') return { type: 'code', ...(await runSchemaChecks(code, q.testCases)) };
  // A harness grades through its own check(), run after the candidate's code so it can call their solution
  if (q.harness) return { type: 'code', ...runJavaScriptCode(`${code}\n${q.harness}`, q.testCases, 'check') };
  return { type: 'code', ...runJavaScriptCode(code, q.testCases) };
}

// What to tell the candidate after submitting: the checks a task missed
function feedbackFor(q: Question, result: QuestionRunResult): string[] {
  if (result.score === 100) return [];
  if (isAnswerType(q.type)) return [result.score > 0 ? `Partly right (${result.score}/100)` : 'Not the right answer'];
  if (result.type === 'sql' && !result.success) return [`Query failed: ${result.errorMessage}`];
  return result.testCaseResults.filter((tc) => !tc.passed).map((tc) => tc.description);
}

// Grade every question from the candidate's latest code; untouched starter code is graded like any other answer
export async function gradeTest(test: AssessmentTest, codes: Record<string, string>) {
  const perQuestion: Record<string, number> = {};
  const feedback: Record<string, string[]> = {};
  // What each task's run found, for a second marking of the ones that fell short
  const runs: Record<string, QuestionRunResult> = {};

  for (const q of test.questions) {
    const result = await runQuestion(q, codes[q.id] ?? q.starterCode);
    runs[q.id] = result;
    perQuestion[q.id] = result.score;
    feedback[q.id] = feedbackFor(q, result);
  }

  return { score: weightedScore(test, perQuestion), perQuestion, feedback, runs };
}

// The test's score out of 100 from each task's score and weight
export function weightedScore(test: AssessmentTest, perQuestion: Record<string, number>) {
  const weights = test.questions.reduce((sum, q) => sum + q.weight, 0) || 1;
  return Math.round(test.questions.reduce((sum, q) => sum + (perQuestion[q.id] ?? 0) * q.weight, 0) / weights);
}
