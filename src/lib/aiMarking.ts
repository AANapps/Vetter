import { AssessmentTest, Question } from '../types';
import { QuestionRunResult } from './grading';
import { ASSISTANT_RESULT_SHARE, assistantAnswer, emailAnswer, emailMark } from './questionTypes';

// A second marking by Vetter's AI for code, SQL and short answers that the automatic checks didn't give full marks.
// It can only raise a score, never lower it, and code that still fails its checks can't reach full marks.

const MARKED_BY_AI: Question['type'][] = ['text', 'written', 'email', 'assistant', 'code', 'sql', 'schema'];
// The most a task can get from the AI while its automatic checks still fail
const CAP: Partial<Record<Question['type'], number>> = { code: 90, sql: 90, schema: 90, text: 100, written: 100 };
const TIMEOUT_MS = 45000;

export interface AiMark {
  score: number;
  feedback: string;
}

function describe(q: Question, run: QuestionRunResult): { reference: string; autoResult: string } {
  if (q.type === 'text') return { reference: `Accepted answers: ${(q.acceptedAnswers ?? []).join(' | ')}`, autoResult: "Didn't match an accepted answer exactly." };
  if (q.type === 'assistant') {
    const points = (list: string[]) => list.map((p, i) => `${i + 1}. ${p}`).join('\n');
    return {
      reference: `THE WORK HANDED IN, ${ASSISTANT_RESULT_SHARE}% of the score, against these points, each an equal share:\n${points(q.rubric ?? [])}${
        q.solutionCode ? `\nModel work:\n${q.solutionCode}` : ''
      }\n\nHOW THEY USED THE ASSISTANT, ${100 - ASSISTANT_RESULT_SHARE}% of the score, from the conversation, against these points, each an equal share:\n${points(
        q.assistant?.process ?? []
      )}\n\nThe material they were given:\n${q.assistant?.material ?? '(none)'}\n\nThe assistant's private notes, including the weakness planted in it:\n${q.assistant?.brief ?? ''}`,
      autoResult: 'A rough first mark on the final work only; mark the work and the conversation properly.',
    };
  }
  if (q.type === 'email') {
    const last = q.email?.thread.at(-1);
    return {
      reference: `The email being replied to, from ${last?.from ?? 'a colleague'}: ${last?.subject ?? ''}\n${last?.body ?? ''}\n\nMarking points for the reply, each an equal share:\n${(q.rubric ?? []).map((p, i) => `${i + 1}. ${p}`).join('\n')}${q.solutionCode ? `\n\nModel reply:\n${q.solutionCode}` : ''}`,
      autoResult: 'Who it was sent to is marked separately. Mark only what the reply says and how it says it.',
    };
  }
  if (q.type === 'written')
    return {
      reference: `Marking points, each an equal share:\n${(q.rubric ?? []).map((p, i) => `${i + 1}. ${p}`).join('\n')}${q.solutionCode ? `\n\nModel answer:\n${q.solutionCode}` : ''}`,
      autoResult: 'A rough first mark from matching words only; mark it properly against the points.',
    };
  const cases = run.testCaseResults
    .map((tc) => `${tc.passed ? 'PASSED' : 'FAILED'} ${tc.description}: input ${tc.input}, expected ${tc.expected}, got ${tc.actual}${tc.error ? ` (error: ${tc.error})` : ''}`)
    .join('\n');
  const failedToRun = run.type === 'sql' && !run.success ? `Query failed: ${run.errorMessage}\n` : '';
  return {
    reference: [q.solutionCode ? `Reference solution:\n${q.solutionCode}` : '', q.contextData ? `Context: ${q.contextData}` : ''].filter(Boolean).join('\n\n'),
    autoResult: `${failedToRun}${cases || 'No checks ran.'}`,
  };
}

const emailText = (answer: string) => {
  const r = emailAnswer(answer);
  return `To: ${r.to.join(', ')}\nCc: ${r.cc.join(', ')}\nSubject: ${r.subject}\n\n${r.body}`;
};

// The conversation with the assistant, then the work handed in
export const assistantText = (answer: string) => {
  const r = assistantAnswer(answer);
  const chat = r.chat.map((t) => `${t.role === 'user' ? 'CANDIDATE' : 'ASSISTANT'}: ${t.text}`).join('\n\n');
  return `THE CONVERSATION (${r.chat.filter((t) => t.role === 'user').length} messages from the candidate):\n${chat || '(they did not use the assistant)'}\n\nTHE WORK HANDED IN:\n${r.final}`;
};

// Marks from the AI for the tasks worth a second look, or an empty result when it isn't available
export async function aiMarks(test: AssessmentTest, codes: Record<string, string>, perQuestion: Record<string, number>, runs: Record<string, QuestionRunResult>) {
  const items = test.questions
    .filter((q) => MARKED_BY_AI.includes(q.type) && perQuestion[q.id] < 100 && runs[q.id])
    .map((q) => ({ q, answer: codes[q.id] ?? '' }))
    // Nothing written, or the starter code untouched, has nothing to give credit for
    .filter(({ q, answer }) => answer.trim() !== '' && answer.trim() !== q.starterCode.trim())
    // An email goes to the marker as it was sent; nothing typed in the body is nothing to mark
    .filter(({ q, answer }) => q.type !== 'email' || emailAnswer(answer).body.trim() !== '')
    .filter(({ q, answer }) => q.type !== 'assistant' || assistantAnswer(answer).final.trim() !== '')
    .map(({ q, answer }) => ({ id: q.id, type: q.type, title: q.title, prompt: q.prompt, answer: q.type === 'email' ? emailText(answer) : q.type === 'assistant' ? assistantText(answer) : answer, autoScore: perQuestion[q.id], ...describe(q, runs[q.id]) }));
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
      // A written answer is marked by the AI alone: the first mark only matched words, which can be gamed
      const score = q.type === 'email' ? emailMark(q, emailAnswer(codes[q.id] ?? ''), Math.max(0, Math.min(100, aiScore))) : q.type === 'written' || q.type === 'assistant' ? Math.max(0, Math.min(100, aiScore)) : Math.max(perQuestion[q.id], Math.min(aiScore, CAP[q.type] ?? 90));
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
