import { AssessmentTest, Question } from '../types';
import { QuestionRunResult } from './grading';

// A second marking by Vetter's AI for code, SQL and short answers that the automatic checks didn't give full marks.
// It can only raise a score, never lower it, and code that still fails its checks can't reach full marks.

const MARKED_BY_AI: Question['type'][] = ['text', 'code', 'sql', 'schema'];
// The most a task can get from the AI while its automatic checks still fail
const CAP: Partial<Record<Question['type'], number>> = { code: 90, sql: 90, schema: 90, text: 100 };
const TIMEOUT_MS = 45000;

export interface AiMark {
  score: number;
  feedback: string;
}

function describe(q: Question, run: QuestionRunResult): { reference: string; autoResult: string } {
  if (q.type === 'text') return { reference: `Accepted answers: ${(q.acceptedAnswers ?? []).join(' | ')}`, autoResult: "Didn't match an accepted answer exactly." };
  const cases = run.testCaseResults
    .map((tc) => `${tc.passed ? 'PASSED' : 'FAILED'} ${tc.description}: input ${tc.input}, expected ${tc.expected}, got ${tc.actual}${tc.error ? ` (error: ${tc.error})` : ''}`)
    .join('\n');
  const failedToRun = run.type === 'sql' && !run.success ? `Query failed: ${run.errorMessage}\n` : '';
  return {
    reference: [q.solutionCode ? `Reference solution:\n${q.solutionCode}` : '', q.contextData ? `Context: ${q.contextData}` : ''].filter(Boolean).join('\n\n'),
    autoResult: `${failedToRun}${cases || 'No checks ran.'}`,
  };
}

// Marks from the AI for the tasks worth a second look, or an empty result when it isn't available
export async function aiMarks(test: AssessmentTest, codes: Record<string, string>, perQuestion: Record<string, number>, runs: Record<string, QuestionRunResult>) {
  const items = test.questions
    .filter((q) => MARKED_BY_AI.includes(q.type) && perQuestion[q.id] < 100 && runs[q.id])
    .map((q) => ({ q, answer: codes[q.id] ?? '' }))
    // Nothing written, or the starter code untouched, has nothing to give credit for
    .filter(({ q, answer }) => answer.trim() !== '' && answer.trim() !== q.starterCode.trim())
    .map(({ q, answer }) => ({ id: q.id, type: q.type, title: q.title, prompt: q.prompt, answer, autoScore: perQuestion[q.id], ...describe(q, runs[q.id]) }));
  if (items.length === 0) return {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('/api/grade-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    });
    if (!res.ok) return {};
    const { marks } = (await res.json()) as { marks?: { id: string; score: number; feedback: string }[] };
    const result: Record<string, AiMark> = {};
    for (const m of marks ?? []) {
      const q = test.questions.find((x) => x.id === m.id);
      if (!q || !items.some((it) => it.id === m.id)) continue;
      // A short answer the AI judges right in meaning gets full marks: typos and extra words cost nothing
      const aiScore = q.type === 'text' && m.score >= 80 ? 100 : Math.round(m.score);
      const score = Math.max(perQuestion[q.id], Math.min(aiScore, CAP[q.type] ?? 90));
      result[q.id] = { score, feedback: String(m.feedback ?? '').slice(0, 300) };
    }
    return result;
  } catch {
    // Unreachable or too slow: the automatic marks stand
    return {};
  } finally {
    clearTimeout(timer);
  }
}
