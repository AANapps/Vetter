import { EmailTask, Question, QuestionType } from '../types';

// The answer-style questions: picked, typed or arranged rather than written as code. Their answer is kept as a
// string like code is: the option index for multiple choice, JSON for the rest, the text itself for short answers.
export const ANSWER_TYPES: QuestionType[] = ['choice', 'multi', 'text', 'written', 'order', 'match', 'email'];
export const isAnswerType = (type: QuestionType) => ANSWER_TYPES.includes(type);

// Worked in an app window (a spreadsheet, a SQL workbench or a simulated product) and marked on what the candidate leaves behind
export const isWorkspaceType = (type: QuestionType) => type === 'sheet' || type === 'database' || type === 'app';
// What sub-questions can belong to: a hands-on task, or a case study to read
export const isGroupType = (type: QuestionType) => isWorkspaceType(type) || type === 'case';

// A test as the candidate meets it: each hands-on task with the questions about it, and every other question on its own.
// Questions about a task follow it wherever they're listed; ones whose task is gone stand alone
export interface QuestionGroup {
  task?: Question;
  questions: Question[];
}
export function groupQuestions(questions: Question[]): QuestionGroup[] {
  const tasks = new Set(questions.filter((q) => isGroupType(q.type)).map((q) => q.id));
  const belongs = (q: Question) => !!q.taskId && tasks.has(q.taskId) && !isGroupType(q.type);
  return questions
    .filter((q) => !belongs(q))
    .map((q) => (isGroupType(q.type) ? { task: q, questions: [q, ...questions.filter((f) => belongs(f) && f.taskId === q.id)] } : { questions: [q] }));
}
// The questions in the order they're asked
export const orderedQuestions = (questions: Question[]) => groupQuestions(questions).flatMap((g) => g.questions);

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

// An email task's answer: the reply as the candidate sends it
export interface EmailReply {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
}
export const emailAnswer = (answer: string): EmailReply => {
  const r = parse<Partial<EmailReply>>(answer, {});
  return { to: Array.isArray(r.to) ? r.to : [], cc: Array.isArray(r.cc) ? r.cc : [], subject: typeof r.subject === 'string' ? r.subject : '', body: typeof r.body === 'string' ? r.body : '' };
};
// The reply's share of an email task's marks that goes on who it's sent to; the rest is what it says
export const EMAIL_RECIPIENT_SHARE = 30;
const sameAddress = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
// Out of 100: everyone who should get it does (someone meant for To who is only copied in counts half), and every
// person it mustn't go to costs as much as a right one earns
export function recipientScore(task: EmailTask | undefined, reply: EmailReply): number {
  if (!task) return 0;
  const inTo = (e: string) => reply.to.some((r) => sameAddress(r, e));
  const inCc = (e: string) => reply.cc.some((r) => sameAddress(r, e));
  const expected = task.to.length + task.cc.length;
  const earned =
    task.to.reduce((n, e) => n + (inTo(e) ? 1 : inCc(e) ? 0.5 : 0), 0) +
    task.cc.reduce((n, e) => n + (inTo(e) || inCc(e) ? 1 : 0), 0) -
    task.avoid.filter((e) => inTo(e) || inCc(e)).length;
  if (expected === 0) return earned < 0 || reply.to.length === 0 ? 0 : 100;
  return Math.round(Math.max(0, Math.min(1, earned / expected)) * 100);
}
// An email's mark from its recipients and a mark for what it says
export const emailMark = (q: Question, reply: EmailReply, bodyMark: number) =>
  Math.round((recipientScore(q.email, reply) * EMAIL_RECIPIENT_SHARE + bodyMark * (100 - EMAIL_RECIPIENT_SHARE)) / 100);

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%.]+/gu, ' ')
    .replace(/\.(?!\d)/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

// Letters added, dropped, changed or swapped between two strings
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

// A typed answer matches when it's the same once case, spacing and punctuation are ignored, give or take typos:
// a slip in a word of five letters or more, two in a word of nine or more. Short words and numbers must match
// exactly, so "log" never passes for "lag" and 26% never for 25%
export function closeEnough(given: string, accepted: string): boolean {
  if (given.replace(/\s+/g, '') === accepted.replace(/\s+/g, '')) return true;
  const a = given.split(' ');
  const b = accepted.split(' ');
  if (a.length !== b.length) return false;
  return a.every((word, i) => {
    const target = b[i];
    if (word === target) return true;
    if (/[0-9]/.test(word + target)) return false;
    const allowed = target.length >= 9 ? 2 : target.length >= 5 ? 1 : 0;
    return allowed > 0 && editDistance(word, target) <= allowed;
  });
}

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
      return given !== '' && (q.acceptedAnswers ?? []).some((a) => closeEnough(given, normalise(a))) ? 100 : 0;
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
    case 'written':
      return roughWrittenMark(q, answer);
    case 'email': {
      const reply = emailAnswer(answer);
      return reply.body.trim() || reply.to.length ? emailMark(q, reply, roughWrittenMark(q, reply.body)) : 0;
    }
    default:
      return 0;
  }
}

// A first mark for a written answer, from how many of the rubric's points it touches on; Vetter's AI then marks it
// properly (src/lib/aiMarking.ts) and its mark replaces this one. Capped, since matching words isn't judging
const stem = (w: string) => w.slice(0, 5);
const WORDS = /[a-z0-9]{5,}/g;
export function roughWrittenMark(q: Question, answer: string): number {
  const said = new Set((answer.toLowerCase().match(WORDS) ?? []).map(stem));
  const points = (q.rubric ?? []).filter((p) => p.trim());
  if (said.size === 0 || points.length === 0) return 0;
  const met = points.filter((p) => {
    const keys = [...new Set((p.toLowerCase().match(WORDS) ?? []).map(stem))];
    return keys.length > 0 && keys.filter((k) => said.has(k)).length / keys.length >= 0.5;
  }).length;
  const length = Math.min(1, (answer.trim().split(/\s+/).length || 0) / 40);
  return Math.round(Math.min(70, (met / points.length) * 100) * length);
}

// Whether the candidate has given an answer yet, for the task tabs
export const hasAnswer = (q: Question, answer: string) =>
  q.type === 'email' ? emailAnswer(answer).body.trim() !== '' : q.type === 'match' ? matchAnswer(q, answer).some((a) => a !== null) : answer.trim() !== '' && answer !== '[]';

// What the builder offers, in the order it offers them
export const QUESTION_STYLES: { type: QuestionType; label: string; hint: string }[] = [
  { type: 'choice', label: 'Multiple choice', hint: 'Pick one right answer' },
  { type: 'multi', label: 'Select all that apply', hint: 'Tick every right answer' },
  { type: 'text', label: 'Short answer', hint: 'Type a word, number or phrase' },
  { type: 'written', label: 'Written answer', hint: 'A paragraph or two, marked against the points a strong answer makes' },
  { type: 'order', label: 'Drag to order', hint: 'Put steps or items in sequence' },
  { type: 'match', label: 'Drag to match', hint: 'Pair each prompt with its answer' },
  { type: 'email', label: 'Email reply', hint: 'An email lands in their inbox: they reply, choosing who it goes to and who to copy in' },
  { type: 'case', label: 'Case study', hint: 'Material to read (emails, a ticket, figures) with questions on it' },
  { type: 'code', label: 'Coding', hint: 'Write a JavaScript function, run against test cases' },
  { type: 'sql', label: 'SQL query', hint: 'Query sample tables, checked against your solution' },
  { type: 'sheet', label: 'Spreadsheet task', hint: 'Work in an Excel-style spreadsheet, checked by formulas on the finished workbook' },
  { type: 'database', label: 'Database task', hint: 'Work in a SQL workbench on its own tables, checked against the solution' },
  { type: 'app', label: 'App simulation', hint: 'An interactive page built by the AI: the software the job uses, a device to work on, or any format that suits the skill' },
];

// Styles only the AI can write; the builder edits their wording but doesn't offer them as blank questions
export const AI_ONLY_TYPES: QuestionType[] = ['sheet', 'database', 'app'];

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
    case 'written':
      return { ...base, timeLimitMinutes: 6, weight: 15, rubric: ['', '', ''] };
    case 'case':
      return { ...base, timeLimitMinutes: 4, weight: 0 };
    case 'email':
      return {
        ...base,
        timeLimitMinutes: 6,
        weight: 15,
        rubric: ['', '', ''],
        email: { thread: [{ from: '', to: [], cc: [], date: '', subject: '', body: '' }], contacts: [], to: [], cc: [], avoid: [] },
      };
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
    case 'written':
      if (filled(q.rubric).length === 0) problems.push('Add at least one marking point');
      break;
    case 'email':
      if (!q.email?.thread.some((m) => m.body.trim())) problems.push('Write the email they reply to');
      if (!q.email?.to.length) problems.push('Pick who the reply should go to');
      if (filled(q.rubric).length === 0) problems.push('Add at least one marking point');
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
  if (q.type === 'written') return { ...q, rubric: filled(q.rubric).map((a) => a.trim()) };
  if (q.type === 'email' && q.email) {
    const known = (list: string[]) => [...new Set(list.map((e) => e.trim()).filter(Boolean))];
    return {
      ...q,
      rubric: filled(q.rubric).map((a) => a.trim()),
      email: {
        ...q.email,
        thread: q.email.thread.filter((m) => m.body.trim() || m.subject.trim()),
        contacts: q.email.contacts.filter((c) => c.name.trim() && c.email.trim()),
        to: known(q.email.to),
        cc: known(q.email.cc),
        avoid: known(q.email.avoid),
      },
    };
  }
  // A case has no answer, so no marks of its own
  if (q.type === 'case') return { ...q, weight: 0 };
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
