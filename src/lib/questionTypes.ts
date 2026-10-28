import { Question, QuestionType } from '../types';

// The answer-style questions: picked, typed or arranged rather than written as code. Their answer is kept as a
// string like code is: the option index for multiple choice, JSON for the rest, the text itself for short answers.
export const ANSWER_TYPES: QuestionType[] = ['choice', 'multi', 'text', 'order', 'match'];
export const isAnswerType = (type: QuestionType) => ANSWER_TYPES.includes(type);

// A stable shuffle per question, so the order candidates see is the same every time and grading can rebuild it.
// Never returns the right order when there's more than one item.
export function shuffledIndexes(seed: string, count: number): number[] {
  let h = [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((h = (h * 1103515245 + 12345) >>> 0) % 10000) / 10000;
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (count > 1 && order.every((v, i) => v === i)) order.push(order.shift()!);
  return order;
}

const parse = <T,>(answer: string, fallback: T): T => {
  try {
    return answer ? (JSON.parse(answer) as T) : fallback;
  } catch {
    return fallback;
  }
};

// Drag to order: the item indexes in the candidate's order; untouched, it's the shuffled order they were shown
export const orderAnswer = (q: Question, answer: string): number[] =>
  parse<number[]>(answer, shuffledIndexes(q.id, q.items?.length ?? 0));

// Drag to match: for each prompt, the index of the answer placed on it (null while empty)
export const matchAnswer = (q: Question, answer: string): (number | null)[] =>
  parse<(number | null)[]>(answer, (q.pairs ?? []).map(() => null));

export const multiAnswer = (answer: string): number[] => parse<number[]>(answer, []);

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%.]+/gu, ' ')
    .replace(/\.(?!\d)/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

// Out of 100. Arranging and select-all questions get partial credit; one-answer questions are right or wrong
export function gradeAnswer(q: Question, answer: string): number {
  switch (q.type) {
    case 'choice':
      return answer !== '' && Number(answer) === q.correctOption ? 100 : 0;
    case 'multi': {
      const right = new Set(q.correctOptions ?? []);
      if (right.size === 0) return 0;
      const picked = multiAnswer(answer);
      const hits = picked.filter((i) => right.has(i)).length;
      const misses = picked.length - hits;
      return Math.max(0, Math.round(((hits - misses) / right.size) * 100));
    }
    case 'text': {
      const given = normalise(answer);
      return given !== '' && (q.acceptedAnswers ?? []).some((a) => normalise(a) === given) ? 100 : 0;
    }
    case 'order': {
      const order = orderAnswer(q, answer);
      if (order.length === 0) return 0;
      return Math.round((order.filter((item, position) => item === position).length / order.length) * 100);
    }
    case 'match': {
      const placed = matchAnswer(q, answer);
      if (placed.length === 0) return 0;
      // Answers are indexed like the pairs, so a right match puts answer i on prompt i
      return Math.round((placed.filter((answerIndex, prompt) => answerIndex === prompt).length / placed.length) * 100);
    }
    default:
      return 0;
  }
}

// Whether the candidate has given an answer yet, for the task tabs
export const hasAnswer = (q: Question, answer: string) =>
  q.type === 'match' ? matchAnswer(q, answer).some((a) => a !== null) : answer.trim() !== '' && answer !== '[]';

// What the builder offers, in the order it offers them
export const QUESTION_STYLES: { type: QuestionType; label: string; hint: string }[] = [
  { type: 'choice', label: 'Multiple choice', hint: 'Pick one right answer' },
  { type: 'multi', label: 'Select all that apply', hint: 'Tick every right answer' },
  { type: 'text', label: 'Short answer', hint: 'Type a word, number or phrase' },
  { type: 'order', label: 'Drag to order', hint: 'Put steps or items in sequence' },
  { type: 'match', label: 'Drag to match', hint: 'Pair each prompt with its answer' },
  { type: 'code', label: 'Coding', hint: 'Write a JavaScript function, run against test cases' },
  { type: 'sql', label: 'SQL query', hint: 'Query sample tables, checked against your solution' },
];

export function blankQuestion(type: QuestionType): Question {
  const base: Question = {
    id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    type,
    prompt: '',
    starterCode: '',
    testCases: [],
    timeLimitMinutes: type === 'code' || type === 'sql' ? 15 : 3,
    weight: type === 'code' || type === 'sql' ? 30 : 10,
  };
  switch (type) {
    case 'choice':
      return { ...base, options: ['', '', '', ''], correctOption: 0 };
    case 'multi':
      return { ...base, options: ['', '', '', ''], correctOptions: [] };
    case 'text':
      return { ...base, acceptedAnswers: [''] };
    case 'order':
      return { ...base, items: ['', '', ''] };
    case 'match':
      return { ...base, pairs: [{ left: '', right: '' }, { left: '', right: '' }, { left: '', right: '' }] };
    case 'code':
      return {
        ...base,
        starterCode: 'function solution(input) {\n  // Your code here\n}\n',
        testCases: [{ id: `tc-${Date.now().toString(36)}`, description: '', input: '[]', expectedOutput: '' }],
      };
    case 'sql':
      return { ...base, starterCode: '-- Write your query here\nSELECT ', contextData: 'Table: employees', solutionCode: '' };
    default:
      return base;
  }
}

const filled = (list?: string[]) => (list ?? []).filter((s) => s.trim() !== '');

// What still needs doing before a question can be saved; empty when it's ready
export function questionProblems(q: Question): string[] {
  const problems: string[] = [];
  if (!q.title.trim()) problems.push('Give it a title');
  if (!q.prompt.trim()) problems.push('Write the question');
  switch (q.type) {
    case 'choice':
      if (filled(q.options).length < 2) problems.push('Add at least two options');
      if (q.correctOption === undefined || !q.options?.[q.correctOption]?.trim()) problems.push('Mark the right option');
      break;
    case 'multi':
      if (filled(q.options).length < 2) problems.push('Add at least two options');
      if (!(q.correctOptions ?? []).some((i) => q.options?.[i]?.trim())) problems.push('Tick at least one right option');
      break;
    case 'text':
      if (filled(q.acceptedAnswers).length === 0) problems.push('Add an accepted answer');
      break;
    case 'order':
      if (filled(q.items).length < 3) problems.push('Add at least three items');
      break;
    case 'match':
      if ((q.pairs ?? []).filter((p) => p.left.trim() && p.right.trim()).length < 2) problems.push('Add at least two pairs');
      break;
    case 'code':
      if (!/function\s+solution\s*\(/.test(q.starterCode)) problems.push('Starter code needs a function called solution');
      if (q.testCases.filter((tc) => tc.expectedOutput.trim()).length === 0) problems.push('Add a test case');
      break;
    case 'sql':
      if (!q.solutionCode?.trim()) problems.push('Write the solution query');
      break;
  }
  return problems;
}

// Drops blank options, items and pairs before saving; a question's right answers move with the options kept
export function tidyQuestion(q: Question): Question {
  if (q.type === 'choice' || q.type === 'multi') {
    const kept = (q.options ?? []).map((o, i) => ({ o, i })).filter(({ o }) => o.trim());
    const remap = (i: number) => kept.findIndex((k) => k.i === i);
    return {
      ...q,
      options: kept.map((k) => k.o.trim()),
      correctOption: q.type === 'choice' ? remap(q.correctOption ?? 0) : undefined,
      correctOptions: q.type === 'multi' ? (q.correctOptions ?? []).map(remap).filter((i) => i >= 0) : undefined,
    };
  }
  if (q.type === 'text') return { ...q, acceptedAnswers: filled(q.acceptedAnswers).map((a) => a.trim()) };
  if (q.type === 'order') return { ...q, items: filled(q.items).map((i) => i.trim()) };
  if (q.type === 'match') return { ...q, pairs: (q.pairs ?? []).filter((p) => p.left.trim() && p.right.trim()) };
  // Unfinished test cases are dropped; unnamed ones get a name candidates can read in their feedback
  if (q.type === 'code')
    return {
      ...q,
      testCases: q.testCases
        .filter((tc) => tc.expectedOutput.trim())
        .map((tc, i) => ({ ...tc, description: tc.description.trim() || `Test case ${i + 1}` })),
    };
  return q;
}
