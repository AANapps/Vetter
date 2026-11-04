import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { AssessmentTest, Question } from '../types';
import { db, firebaseEnabled } from './firebase';
import { matchAnswer, multiAnswer, orderAnswer, orderedQuestions } from './questionTypes';
import type { QuestionRunResult } from './grading';

/**
 * What a candidate actually answered on a test taken for a company, so the company can see the work behind the score
 * and check the marking. Kept in its own collection, which only the candidate, that company and the Vetter team can
 * read (firestore.rules), never on the public profile: the answers would give a test away.
 *
 * Each question is stored as the candidate saw it and as it was marked (the wording, their answer in words, the right
 * answer, every automatic check with what it expected and what it found), so it still reads right if the test is
 * changed later.
 */

export interface AnswerRecord {
  id: string;
  // The question's number as the candidate saw it; tasks and cases carry their label instead
  label: string;
  type: Question['type'];
  title: string;
  prompt: string;
  // Its share of the test's marks, and what it scored out of 100
  weight: number;
  score: number;
  aiMarked?: boolean;
  // The candidate's answer, readable: the option picked, the order they put things in, the text or code written
  answer: string;
  // What a right answer is, where there's one to show
  correct?: string;
  feedback: string[];
  // The automatic checks on code, SQL and hands-on tasks: what each expected and what the candidate's work gave
  checks?: { description: string; expected: string; actual: string; passed: boolean }[];
  // The task a question is about, when it's about one
  task?: string;
}

export interface Submission {
  id: string;
  candidateId: string;
  candidateName: string;
  businessId: string;
  jobId?: string;
  testId: string;
  testTitle: string;
  score: number;
  completedAt: string;
  answers: AnswerRecord[];
}

// Firestore refuses a document over 1 MiB; a hands-on task's saved state can be big, so each part is capped
const MAX_FIELD = 20_000;
const MAX_DOC = 900_000;
const cap = (text: string, max = MAX_FIELD) => (text.length > max ? `${text.slice(0, max)}\n… (cut short: ${text.length - max} more characters)` : text);

const lettered = (options: string[] = [], picked: number[]) => picked.map((i) => `${String.fromCharCode(65 + i)}. ${options[i] ?? '(unknown option)'}`).join('\n');

// One answer in words, and the right one, by how the question is answered
function readable(q: Question, raw: string): { answer: string; correct?: string } {
  switch (q.type) {
    case 'choice':
      return { answer: raw === '' ? '' : lettered(q.options, [Number(raw)]), correct: q.correctOption !== undefined ? lettered(q.options, [q.correctOption]) : undefined };
    case 'multi':
      return { answer: lettered(q.options, multiAnswer(raw)), correct: lettered(q.options, q.correctOptions ?? []) };
    case 'text':
      return { answer: raw, correct: (q.acceptedAnswers ?? []).join('  ·  ') };
    case 'written':
      return { answer: raw, correct: (q.rubric ?? []).filter((p) => p.trim()).map((p) => `• ${p}`).join('\n') };
    case 'order':
      return {
        answer: raw ? orderAnswer(q, raw).map((i, n) => `${n + 1}. ${q.items?.[i] ?? ''}`).join('\n') : '',
        correct: (q.items ?? []).map((item, n) => `${n + 1}. ${item}`).join('\n'),
      };
    case 'match': {
      const placed = matchAnswer(q, raw);
      return {
        answer: (q.pairs ?? []).map((p, i) => `${p.left} → ${placed[i] === null || placed[i] === undefined ? '(left empty)' : q.pairs![placed[i]!].right}`).join('\n'),
        correct: (q.pairs ?? []).map((p) => `${p.left} → ${p.right}`).join('\n'),
      };
    }
    case 'code':
    case 'sql':
    case 'schema':
      return { answer: raw === q.starterCode ? '' : raw };
    // Hands-on tasks are marked on what the candidate left behind; the checks show it, and the raw state is kept too
    default:
      return { answer: raw && raw !== q.starterCode ? raw : '' };
  }
}

export function answerRecords(
  test: AssessmentTest,
  codes: Record<string, string>,
  scores: Record<string, number>,
  feedback: Record<string, string[]>,
  runs: Record<string, QuestionRunResult>,
  aiMarked: Record<string, unknown>
): AnswerRecord[] {
  const ordered = orderedQuestions(test.questions);
  const tasks = ordered.filter((q) => q.type === 'case' || q.type === 'app' || q.type === 'sheet' || q.type === 'database');
  let number = 0;
  return ordered.flatMap((q): AnswerRecord[] => {
    // A case is material to read, with nothing to answer
    if (q.type === 'case') return [];
    number += 1;
    const run = runs[q.id];
    const { answer, correct } = readable(q, codes[q.id] ?? '');
    const task = q.taskId ? ordered.find((t) => t.id === q.taskId) : undefined;
    return [
      {
        id: q.id,
        label: `${number}`,
        type: q.type,
        title: q.title,
        prompt: cap(q.prompt, 4000),
        weight: q.weight,
        score: scores[q.id] ?? 0,
        ...(aiMarked[q.id] !== undefined && { aiMarked: true }),
        answer: cap(answer),
        ...(correct && { correct: cap(correct, 4000) }),
        feedback: feedback[q.id] ?? [],
        ...(run && 'testCaseResults' in run && run.testCaseResults.length > 0 && {
          checks: run.testCaseResults.map((r) => ({ description: r.description, expected: cap(String(r.expected ?? ''), 2000), actual: cap(String(r.actual ?? ''), 2000), passed: r.passed })),
        }),
        ...(task && { task: `${task.type === 'case' ? 'Case' : 'Task'} ${tasks.indexOf(task) + 1}: ${task.title}` }),
      },
    ];
  });
}

// Saved state of hands-on work is the first thing dropped if the whole thing is too big to store
function fitted(sub: Submission): Submission {
  const size = () => new Blob([JSON.stringify(sub)]).size;
  if (size() <= MAX_DOC) return sub;
  sub = { ...sub, answers: sub.answers.map((a) => (['app', 'sheet', 'database'].includes(a.type) ? { ...a, answer: '(too large to keep)' } : a)) };
  if (size() <= MAX_DOC) return sub;
  return { ...sub, answers: sub.answers.map((a) => ({ ...a, answer: cap(a.answer, 2000) })) };
}

// Without Firebase (the demo), answers stay in this browser
const LOCAL = 'vetter-submissions';
const local = (): Submission[] => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL) ?? '[]');
  } catch {
    return [];
  }
};

export async function saveSubmission(sub: Submission): Promise<void> {
  const data = JSON.parse(JSON.stringify(fitted(sub))) as Submission;
  if (!firebaseEnabled) {
    try {
      localStorage.setItem(LOCAL, JSON.stringify([data, ...local()].slice(0, 50)));
    } catch {
      // Storage full or blocked: the score is still saved, only the answers aren't
    }
    return;
  }
  await setDoc(doc(db(), 'submissions', data.id), data);
}

// A candidate's answers on a company's tests, newest first. The query names the company, as the rules require
export async function loadSubmissions(businessId: string, candidateId: string): Promise<Submission[]> {
  const all = firebaseEnabled
    ? (await getDocs(query(collection(db(), 'submissions'), where('businessId', '==', businessId), where('candidateId', '==', candidateId)))).docs.map((d) => d.data() as Submission)
    : local().filter((s) => s.businessId === businessId && s.candidateId === candidateId);
  return all.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}
