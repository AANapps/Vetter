import { Question } from '../types';

/**
 * Short builders for Vetter's own questions. Tests mix them: fundamentals (choice, select-all, match, order), worked
 * answers (short answer), and a case study whose follow-ups ask the candidate to analyse and decide (written answers
 * are marked by the AI against their points).
 */

const base = (id: string, title: string, type: Question['type'], prompt: string, minutes: number, weight: number, taskId?: string): Question => ({
  id,
  title,
  type,
  prompt,
  starterCode: '',
  testCases: [],
  timeLimitMinutes: minutes,
  weight,
  ...(taskId && { taskId }),
});

// Options are written right answer wherever it reads best; they're rotated by the question's id so the right one
// doesn't always sit in the same place
export const choice = (id: string, title: string, prompt: string, options: string[], correctOption: number, opts: { minutes?: number; weight?: number; taskId?: string } = {}): Question => {
  const shift = [...id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % options.length;
  return {
    ...base(id, title, 'choice', prompt, opts.minutes ?? 3, opts.weight ?? 8, opts.taskId),
    options: options.map((_, i) => options[(i + shift) % options.length]),
    correctOption: (correctOption - shift + options.length) % options.length,
  };
};

export const multi = (id: string, title: string, prompt: string, options: string[], correctOptions: number[], opts: { minutes?: number; weight?: number; taskId?: string } = {}): Question => ({
  ...base(id, title, 'multi', prompt, opts.minutes ?? 3, opts.weight ?? 10, opts.taskId),
  options,
  correctOptions,
});

// A number or short phrase; every accepted form is listed
export const short = (id: string, title: string, prompt: string, acceptedAnswers: string[], opts: { minutes?: number; weight?: number; taskId?: string } = {}): Question => ({
  ...base(id, title, 'text', prompt, opts.minutes ?? 4, opts.weight ?? 10, opts.taskId),
  acceptedAnswers,
});

export const written = (id: string, title: string, prompt: string, rubric: string[], model: string, opts: { minutes?: number; weight?: number; taskId?: string } = {}): Question => ({
  ...base(id, title, 'written', prompt, opts.minutes ?? 8, opts.weight ?? 16, opts.taskId),
  rubric,
  solutionCode: model,
});

export const order = (id: string, title: string, prompt: string, items: string[], opts: { minutes?: number; weight?: number; taskId?: string } = {}): Question => ({
  ...base(id, title, 'order', prompt, opts.minutes ?? 3, opts.weight ?? 8, opts.taskId),
  items,
});

export const match = (id: string, title: string, prompt: string, pairs: [string, string][], opts: { minutes?: number; weight?: number; taskId?: string } = {}): Question => ({
  ...base(id, title, 'match', prompt, opts.minutes ?? 3, opts.weight ?? 8, opts.taskId),
  pairs: pairs.map(([left, right]) => ({ left, right })),
});

// Material to read; its follow-ups name it as their taskId. It carries no marks of its own
export const caseStudy = (id: string, title: string, material: string, label = 'Case material', minutes = 3): Question => ({
  ...base(id, title, 'case', material, minutes, 0),
  contextData: label,
});

// A test topped up to ten questions with extra ones. Its own tasks keep handsOnShare of the marks between them, in
// their old proportions; the extra questions share the rest by their own weights. Totals are worked out again
export function withExtras<T extends { questions: Question[]; estimatedMinutes: number; totalQuestions: number }>(test: T, extras: Question[], handsOnShare = 60, target = 10): T {
  const own = test.questions;
  const answered = own.filter((q) => q.type !== 'case').length;
  const added = extras.slice(0, Math.max(0, target - answered));
  if (added.length === 0) return test;
  const ownTotal = own.reduce((n, q) => n + q.weight, 0) || 1;
  const addedTotal = added.reduce((n, q) => n + q.weight, 0) || 1;
  const questions = [
    ...own.map((q) => ({ ...q, weight: q.type === 'case' ? 0 : Math.max(1, Math.round((q.weight / ownTotal) * handsOnShare)) })),
    ...added.map((q) => ({ ...q, weight: q.type === 'case' ? 0 : Math.max(1, Math.round((q.weight / addedTotal) * (100 - handsOnShare))) })),
  ];
  // Rounding can leave the total a point or two off 100; the heaviest question takes the difference
  const drift = 100 - questions.reduce((n, q) => n + q.weight, 0);
  const heaviest = questions.reduce((best, q, i) => (q.weight > questions[best].weight ? i : best), 0);
  questions[heaviest] = { ...questions[heaviest], weight: questions[heaviest].weight + drift };
  return {
    ...test,
    questions,
    totalQuestions: questions.filter((q) => q.type !== 'case').length,
    estimatedMinutes: questions.reduce((n, q) => n + q.timeLimitMinutes, 0),
  };
}
