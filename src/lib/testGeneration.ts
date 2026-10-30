import { AssessmentTest, Business, JobPosting, Question, QuestionType, SkillCategory, TestDifficulty, TestRole } from '../types';
import { SKILL_IDS } from '../data/seedCandidates';
import { MOCK_DATABASE, executeSqlQuery } from './sqlEngine';
import { runJavaScriptCode } from './codeEngine';
import { isMainVersion, levelsOf } from './testLevels';
import { ROLE_GROUPS } from './testRoles';
import { questionProblems } from './questionTypes';
import { probeApp } from './appSimulation';

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
  // Where the new test came from: written by the AI, or put together from Vetter's own questions
  source?: 'ai' | 'bank';
  // Why the AI didn't write it, when it came from the question bank
  aiNote?: string;
}

export interface GenerationOptions {
  prompt: string;
  wantNewTest: boolean;
  wantExisting: boolean;
  questionCount: number;
  styles: QuestionType[];
  level: TestDifficulty;
  // The job title, to name a test put together without the AI
  title?: string;
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

// Words too common in job ads to say anything about fit
const STOP = new Set(
  (
    'a an and are as at be by for from has have in is it its of on or our the their this to we will with you your who what how ' +
    'data design management team teams work working build building using use experience years year role roles skills strong ability ' +
    'across day new job company help helps support level junior senior lead plus good great'
  ).split(' ')
);
// Words cut to a common stem, so engineer and engineering, reconcile and reconciliation match
const stem = (w: string) => w.slice(0, 6);
const tokens = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w.length > 2 || /^(qa|ux|ui|hr|ai|bi)$/.test(w));
const words = (text: string) => new Set(tokens(text).filter((w) => !STOP.has(w)).map(stem));
const allWords = (text: string) => new Set(tokens(text).map(stem));
// A skill like "Data Cleaning" fits when its telling words all appear and most of the phrase does,
// so "data" alone doesn't match it, nor "risk" alone "Risk Management"
const coveredBy = (phrase: string, brief: { telling: Set<string>; all: Set<string> }) => {
  const telling = [...words(phrase)];
  const every = [...allWords(phrase)];
  return telling.length > 0 && telling.every((w) => brief.telling.has(w)) && every.filter((w) => brief.all.has(w)).length * 2 > every.length;
};
const briefOf = (text: string) => ({ telling: words(text), all: allWords(text), text: text.toLowerCase() });
type Brief = ReturnType<typeof briefOf>;

// How well a test must fit to be suggested: a skill it covers plus a word of its title, or more
const MIN_FIT = 4;

// How well a test fits the brief, on the words they share, and why
function relevance(test: AssessmentTest, brief: Brief) {
  const skills = test.skillsTested.filter((s) => coveredBy(s, brief));
  // A role counts only when the brief names it outright
  const roleHits = (test.roles ?? []).filter((r) => brief.text.includes(r.toLowerCase()));
  const titleHits = [...words(`${test.title} ${test.category}`)].filter((w) => brief.telling.has(w));
  const score = skills.length * 3 + roleHits.length * 2 + titleHits.length;
  const reason = skills.length
    ? `Covers ${skills.slice(0, 3).join(', ')}`
    : roleHits.length
    ? `Made for ${roleHits.slice(0, 2).join(' and ')} roles`
    : `Matches the job's focus on ${titleHits.slice(0, 2).join(' and ')}`;
  return { score, reason, skills };
}

// Library tests that fit the brief, scored on the words they share; works without the AI
export function matchExisting(prompt: string, library: AssessmentTest[], limit = 4): Suggestion[] {
  const brief = briefOf(prompt);
  return library
    .map((test) => ({ test, ...relevance(test, brief) }))
    .filter((m) => m.score >= MIN_FIT)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ test, reason }) => ({ test, reason }));
}

// A new test without the AI: the questions across Vetter's tests that best fit the brief, at the level asked for,
// drawn from several tests so it isn't one test renamed. Returns undefined when too little fits.
export function assembleFromBank(opts: GenerationOptions, library: AssessmentTest[], allTests: AssessmentTest[], business?: Business): AssessmentTest | undefined {
  const brief = briefOf(opts.prompt);
  // Only tests that fit well enough to suggest on their own, with every level of each
  const sources = library.map((main) => ({ main, fit: relevance(main, brief) })).filter((s) => s.fit.score >= MIN_FIT);

  const scored = sources
    .flatMap(({ main, fit }) =>
      // Simulations' questions lean on their scenario, so they stay in their own test
      levelsOf(main, allTests).filter((version) => !version.scenario).flatMap((version) =>
        version.questions
          .filter((q) => opts.styles.includes(q.type))
          .map((q) => ({
            q,
            test: main,
            // The level asked for comes first; other levels fill in
            score: fit.score * 2 + (version.difficulty === opts.level ? 3 : 0) + [...words(`${q.title} ${q.prompt}`)].filter((w) => brief.telling.has(w)).length,
          }))
      )
    )
    .sort((a, b) => b.score - a.score);

  // At most half the questions from any one test, then topped up from the best fits when few tests match
  const perTest = Math.max(1, Math.ceil(opts.questionCount / 2));
  const taken = new Map<string, number>();
  const spread = scored.filter((c) => {
    const n = taken.get(c.test.id) ?? 0;
    if (n >= perTest) return false;
    taken.set(c.test.id, n + 1);
    return true;
  });
  const picked = [...spread, ...scored.filter((c) => !spread.includes(c))].slice(0, opts.questionCount);
  if (picked.length < Math.min(3, opts.questionCount)) return undefined;

  const usedTests = [...new Set(picked.map((c) => c.test))];
  const categoryCounts = picked.reduce((acc, c) => acc.set(c.test.category, (acc.get(c.test.category) ?? 0) + 1), new Map<SkillCategory, number>());
  const category = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const questions = picked.map(({ q }) => ({ ...q, id: uid('q'), testCases: q.testCases.map((tc) => ({ ...tc, id: uid('tc') })) }));
  const total = questions.reduce((sum, q) => sum + q.weight, 0) || 1;
  const skillsTested = [...new Set(usedTests.flatMap((t) => sources.find((s) => s.main.id === t.id)?.fit.skills ?? []))];

  return {
    id: '',
    title: opts.title ? `${opts.title} screen` : `${category} screen`,
    category,
    difficulty: opts.level,
    type: business ? 'custom' : 'standard',
    ...(business && { businessId: business.id, companyName: business.name }),
    description: `${questions.length} questions picked for this role from Vetter's tests on ${usedTests.map((t) => t.title).slice(0, 3).join(', ')}.`,
    estimatedMinutes: questions.reduce((sum, q) => sum + q.timeLimitMinutes, 0),
    passingScore: 70,
    totalQuestions: questions.length,
    questions: questions.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) })),
    skillsTested: (skillsTested.length ? skillsTested : usedTests.flatMap((t) => t.skillsTested)).slice(0, 6),
    ...(!business && { roles: [...new Set(usedTests.flatMap((t) => t.roles ?? []))] }),
  };
}

type RawQuestion = Omit<Partial<Question>, 'tables'> & { tables?: string[]; points?: number; testCases?: { description: string; input: string; expectedOutput: string }[] };

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// One AI-written question made into a real one, or null if it doesn't hold up
async function checkQuestion(raw: RawQuestion): Promise<Question | null> {
  const type = raw.type as QuestionType;
  if (!['choice', 'multi', 'text', 'order', 'match', 'code', 'sql', 'app'].includes(type)) return null;
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
  if (type === 'app') {
    const checks = (raw.testCases ?? []).filter((tc) => tc.input?.trim() && tc.expectedOutput?.trim());
    if (!raw.appHtml?.trim() || checks.length < 2) return null;
    // The app must load, report its starting state and not already pass its checks
    const probe = await probeApp(raw.appHtml, checks);
    if (!probe.state) return null;
    q.appHtml = raw.appHtml;
    // The page's title names the product it copies
    q.contextData = raw.appHtml.match(/<title>([^<]{1,60})<\/title>/i)?.[1].trim() || q.title;
    // The starting state, so the runner can tell a task the candidate hasn't touched
    q.starterCode = JSON.stringify(probe.state);
    q.testCases = checks.map((tc, i) => ({ id: uid('tc'), description: tc.description || `Check ${i + 1}`, input: tc.input.trim(), expectedOutput: tc.expectedOutput.trim() }));
    return q.title && q.prompt ? q : null;
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
  // No AI, or it failed: build the test from Vetter's own questions instead, and say why the AI wasn't used
  if (failure || !body.test) {
    const aiNote =
      failure === 'not-configured'
        ? "Vetter's AI isn't available on this site: it runs on Vetter's own server (npm run dev or npm start) with an ANTHROPIC_API_KEY."
        : failure ?? "The AI didn't send back a test.";
    const fromBank = assembleFromBank(opts, library, tests, business);
    return fromBank
      ? { existing, dropped: 0, test: fromBank, source: 'bank', aiNote }
      : {
          existing,
          dropped: 0,
          newTestError: `${aiNote} Vetter's own question bank doesn't cover this yet either, so write the test in the builder for now.`,
        };
  }

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
  return { existing, test, dropped, source: 'ai' };
}
