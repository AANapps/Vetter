import { AssessmentTest, Question } from '../types';
import { executeSqlQuery, runSchemaChecks, SqlExecutionResult } from './sqlEngine';
import { runJavaScriptCode, CodeExecutionResult } from './codeEngine';
import { gradeAnswer, isAnswerType } from './questionTypes';

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

// Picked, typed or arranged answers, stored like code
function gradeAnswerQuestion(q: Question, answer: string): QuestionRunResult {
  const score = gradeAnswer(q, answer);
  return { type: 'code', allPassed: score === 100, score, testCaseResults: [], logs: [], totalExecutionTimeMs: 0 };
}

export async function runQuestion(q: Question, code: string): Promise<QuestionRunResult> {
  if (q.type === 'sql') return runSqlQuestion(q, code);
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
  let weighted = 0;
  let weights = 0;

  for (const q of test.questions) {
    const result = await runQuestion(q, codes[q.id] ?? q.starterCode);
    perQuestion[q.id] = result.score;
    feedback[q.id] = feedbackFor(q, result);
    weighted += perQuestion[q.id] * q.weight;
    weights += q.weight;
  }

  return { score: Math.round(weighted / (weights || 1)), perQuestion, feedback };
}
