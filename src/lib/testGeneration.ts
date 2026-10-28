import { AssessmentTest, Business, JobPosting, Question, QuestionType, SkillCategory, TestDifficulty, TestRole } from '../types';
import { SKILL_IDS } from '../data/seedCandidates';
import { MOCK_DATABASE, executeSqlQuery } from './sqlEngine';
import { runJavaScriptCode } from './codeEngine';
import { isMainVersion } from './testLevels';
import { ROLE_GROUPS } from './testRoles';
import { questionProblems } from './questionTypes';

// Asking Vetter for a job's tests: library tests that fit, and a new test written for it (by the server's AI).
// Everything the AI returns is checked here: unknown tests dropped, coding and SQL answers run, broken questions removed.

export interface Suggestion {
  test: AssessmentTest;
  reason: string;
}

export interface GenerationResult {
  existing: Suggestion[];
  test?: AssessmentTest;
  // Questions the AI wrote that failed the checks, so they were left out
  dropped: number;
  // Why there's no new test, when one was asked for
  newTestError?: string;
}

export interface GenerationOptions {
  prompt: string;
  wantNewTest: boolean;
  wantExisting: boolean;
  questionCount: number;
  styles: QuestionType[];
  level: TestDifficulty;
}

const CATEGORIES = Object.keys(SKILL_IDS) as SkillCategory[];
const ALL_ROLES = ROLE_GROUPS.flatMap((g) => g.roles);

// The job written out for the prompt box
export const jobBrief = (job: JobPosting) =>
  [
    `${job.title} at ${job.companyName} (${job.location}, ${job.workType}${job.experienceLevel ? `, ${job.experienceLevel}` : ''})`,
    job.description,
    job.responsibilities?.length ? `Responsibilities:\n${job.responsibilities.map((r) => `- ${r}`).join('\n')}` : '',
    job.qualifications?.length ? `Requirements:\n${job.qualifications.map((r) => `- ${r}`).join('\n')}` : '',
    job.niceToHave?.length ? `Nice to have:\n${job.niceToHave.map((r) => `- ${r}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

// The tests a company can use: Vetter's library, plus its own
export const libraryFor = (tests: AssessmentTest[], business?: Business) =>
  tests.filter((t) => isMainVersion(t) && (t.type === 'standard' || (business && t.businessId === business.id)));

const STOP = new Set('a an and are as at be by for from has have in is it its of on or our the their this to we will with you your who what how'.split(' '));
const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .map((w) => w.replace(/\.$/, ''))
      .filter((w) => w.length > 2 && !STOP.has(w))
  );

// Library tests that fit the brief, scored on the words they share; works without the AI
export function matchExisting(prompt: string, library: AssessmentTest[], limit = 4): Suggestion[] {
  const brief = words(prompt);
  return library
    .map((test) => {
      const skills = test.skillsTested.filter((s) => [...words(s)].some((w) => brief.has(w)));
      const roleHits = (test.roles ?? []).filter((r) => [...words(r)].some((w) => brief.has(w)));
      const titleHits = [...words(`${test.title} ${test.category}`)].filter((w) => brief.has(w));
      const score = skills.length * 3 + roleHits.length * 2 + titleHits.length;
      const reason = skills.length
        ? `Covers ${skills.slice(0, 3).join(', ')}`
        : roleHits.length
        ? `Made for ${roleHits.slice(0, 2).join(' and ')} roles`
        : `Matches the job's focus on ${titleHits.slice(0, 2).join(' and ')}`;
      return { test, score, reason };
    })
    .filter((m) => m.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ test, reason }) => ({ test, reason }));
}

type RawQuestion = Partial<Question> & { tables?: string[]; points?: number; testCases?: { description: string; input: string; expectedOutput: string }[] };

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// One AI-written question made into a real one, or null if it doesn't hold up
async function checkQuestion(raw: RawQuestion): Promise<Question | null> {
  const type = raw.type as QuestionType;
  if (!['choice', 'multi', 'text', 'order', 'match', 'code', 'sql'].includes(type)) return null;
  const q: Question = {
    id: uid('q'),
    title: String(raw.title ?? '').trim(),
    type,
    prompt: String(raw.prompt ?? '').trim(),
    starterCode: raw.starterCode ?? '',
    testCases: [],
    timeLimitMinutes: Math.min(60, Math.max(1, Math.round(raw.timeLimitMinutes ?? 3))),
    weight: Math.min(100, Math.max(1, Math.round(raw.points ?? 10))),
  };
  if (type === 'choice') Object.assign(q, { options: raw.options, correctOption: raw.correctOption });
  if (type === 'multi') Object.assign(q, { options: raw.options, correctOptions: [...new Set(raw.correctOptions ?? [])].filter((i) => i >= 0 && i < (raw.options?.length ?? 0)) });
  if (type === 'text') q.acceptedAnswers = raw.acceptedAnswers;
  if (type === 'order') q.items = raw.items;
  if (type === 'match') q.pairs = raw.pairs;

  if (type === 'code') {
    q.solutionCode = raw.solutionCode;
    const cases = (raw.testCases ?? []).map((tc, i) => ({ id: uid('tc'), description: tc.description || `Test case ${i + 1}`, input: tc.input, expectedOutput: tc.expectedOutput }));
    // Keep only the cases the AI's own solution passes; with none left, the question goes
    const run = runJavaScriptCode(q.solutionCode ?? '', cases);
    q.testCases = cases.filter((_, i) => run.testCaseResults[i]?.passed);
    if (q.testCases.length < 2) return null;
  }
  if (type === 'sql') {
    const tables = (raw.tables ?? []).filter((t) => MOCK_DATABASE[t]);
    q.contextData = tables.map((t) => `Table: ${t}`).join('\n');
    q.solutionCode = raw.solutionCode;
    q.starterCode = raw.starterCode || '-- Write your query here\nSELECT ';
    const result = await executeSqlQuery(q.solutionCode ?? '');
    if (!tables.length || !result.success || result.rowCount === 0) return null;
  }
  if (type === 'choice' && (q.correctOption === undefined || q.correctOption < 0 || q.correctOption >= (q.options?.length ?? 0))) return null;
  if (type === 'match' && new Set((q.pairs ?? []).map((p) => p.right)).size !== (q.pairs ?? []).length) return null;
  return questionProblems(q).length === 0 ? q : null;
}

export async function generateTests(opts: GenerationOptions, tests: AssessmentTest[], business?: Business): Promise<GenerationResult> {
  const library = libraryFor(tests, business);
  const local = opts.wantExisting ? matchExisting(opts.prompt, library) : [];

  let body: { existing?: { testId: string; reason: string }[]; test?: Record<string, any>; error?: string } = {};
  let failure: string | undefined;
  try {
    const res = await fetch('/api/generate-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...opts,
        library: library.map((t) => ({ id: t.id, title: t.title, category: t.category, difficulty: t.difficulty, skills: t.skillsTested, roles: t.roles ?? [], description: t.description })),
        roles: ALL_ROLES,
        categories: CATEGORIES,
        tables: Object.values(MOCK_DATABASE).map((t) => ({ name: t.name, columns: t.columns })),
      }),
    });
    body = await res.json().catch(() => ({}));
    // No endpoint at all (a static host) is the same as the AI not being set up
    if (!res.ok) failure = body.error === 'not-configured' || res.status === 404 ? 'not-configured' : body.error || `The AI request failed (${res.status}).`;
  } catch {
    failure = "Couldn't reach Vetter's AI. Check your connection and try again.";
  }

  // The AI's picks when it answered, otherwise the matches made here
  const picked = (body.existing ?? []).flatMap(({ testId, reason }) => {
    const test = library.find((t) => t.id === testId);
    return test ? [{ test, reason }] : [];
  });
  const existing = opts.wantExisting ? (picked.length ? picked : local) : [];

  if (!opts.wantNewTest) return { existing, dropped: 0 };
  if (failure || !body.test)
    return {
      existing,
      dropped: 0,
      newTestError:
        failure === 'not-configured'
          ? "Writing new tests needs Vetter's AI, which isn't set up on this server yet (it needs a GEMINI_API_KEY). Matching library tests still works."
          : failure ?? "The AI didn't send back a test. Try again, or describe the job in more detail.",
    };

  const raw = body.test;
  // Styles the company didn't ask for are ignored; of the rest, ones failing the checks are counted as dropped
  const asked = ((raw.questions ?? []) as RawQuestion[]).filter((q) => opts.styles.includes(q.type as QuestionType));
  const questions = (await Promise.all(asked.map(checkQuestion))).filter((q): q is Question => !!q);
  const dropped = asked.length - questions.length;
  if (questions.length === 0) return { existing, dropped, newTestError: "None of the AI's questions passed Vetter's checks. Try again." };

  const total = questions.reduce((sum, q) => sum + q.weight, 0) || 1;
  const category = CATEGORIES.includes(raw.category) ? (raw.category as SkillCategory) : 'Consulting';
  const test: AssessmentTest = {
    id: '',
    title: String(raw.title ?? 'New test').trim(),
    category,
    difficulty: opts.level,
    type: business ? 'custom' : 'standard',
    ...(business && { businessId: business.id, companyName: business.name }),
    description: String(raw.description ?? '').trim(),
    estimatedMinutes: questions.reduce((sum, q) => sum + q.timeLimitMinutes, 0),
    passingScore: Math.min(90, Math.max(50, Math.round(raw.passingScore ?? 70))),
    totalQuestions: questions.length,
    questions: questions.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) })),
    skillsTested: (raw.skillsTested ?? []).map(String).slice(0, 6),
    ...(!business && { roles: ((raw.roles ?? []) as string[]).filter((r): r is TestRole => (ALL_ROLES as string[]).includes(r)) }),
  };
  return { existing, test, dropped };
}
