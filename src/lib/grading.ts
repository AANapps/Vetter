import { AssessmentTest, Question } from '../types';
import { executeSqlQuery, SqlExecutionResult } from './sqlEngine';
import { runJavaScriptCode, CodeExecutionResult } from './codeEngine';

export type TestCaseOutcome = CodeExecutionResult['testCaseResults'][number];

export type QuestionRunResult =
  | ({ type: 'sql'; score: number; testCaseResults: TestCaseOutcome[] } & SqlExecutionResult)
  | ({ type: 'code' } & CodeExecutionResult);

// Rows as arrays of values: column aliases don't matter, the data does
const toValueRows = (rows: Record<string, any>[]) =>
  rows.map((row) => Object.values(row).map((v) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v)));

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

// Multiple choice: the answer is the chosen option's index, stored like code
function gradeChoice(q: Question, answer: string): QuestionRunResult {
  const passed = answer !== '' && Number(answer) === q.correctOption;
  return { type: 'code', allPassed: passed, score: passed ? 100 : 0, testCaseResults: [], logs: [], totalExecutionTimeMs: 0 };
}

export async function runQuestion(q: Question, code: string): Promise<QuestionRunResult> {
  if (q.type === 'sql') return runSqlQuestion(q, code);
  if (q.type === 'choice') return gradeChoice(q, code);
  return { type: 'code', ...runJavaScriptCode(code, q.testCases) };
}

// Grade every question from the candidate's latest code; untouched starter code is graded like any other answer
export async function gradeTest(test: AssessmentTest, codes: Record<string, string>) {
  const perQuestion: Record<string, number> = {};
  let weighted = 0;
  let weights = 0;

  for (const q of test.questions) {
    const result = await runQuestion(q, codes[q.id] ?? q.starterCode);
    perQuestion[q.id] = result.score;
    weighted += perQuestion[q.id] * q.weight;
    weights += q.weight;
  }

  return { score: Math.round(weighted / (weights || 1)), perQuestion };
}
