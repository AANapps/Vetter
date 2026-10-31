import { AssessmentTest, Business, Question, SkillCategory, TEST_DIFFICULTIES, TestDifficulty, TestRole } from '../types';
import { MOCK_DATABASE } from './sqlEngine';
import { ALL_ROLES, CATEGORIES, RawQuestion, Suggestion, assembleFromBank, checkQuestion, libraryFor, matchExisting } from './testGeneration';

// Building a test by talking to Vetter (server/testChat.ts does the AI side). Each turn sends the conversation and the
// draft; what comes back is checked here like any AI-written test: new questions are run and broken ones left out.

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  // Something about the turn worth showing under the reply, e.g. questions that failed the checks
  note?: string;
}

export interface ChatState {
  messages: ChatMessage[];
  draft?: AssessmentTest;
  existing: Suggestion[];
  // Notes on the software the app simulations copy, kept between turns; undefined until the first turn looks
  research?: string;
  researchedFor?: string;
}

export interface ChatContext {
  job?: string;
  // The job's title, to name a test put together without the AI
  jobTitle?: string;
  level: TestDifficulty;
  wantExisting: boolean;
  tests: AssessmentTest[];
  business?: Business;
}

// The draft as the AI sees it: everything it needs to change a question, except app pages, which it can only keep whole
export const draftForModel = (test: AssessmentTest) => ({
  title: test.title,
  description: test.description,
  category: test.category,
  difficulty: test.difficulty,
  passingScore: test.passingScore,
  skillsTested: test.skillsTested,
  roles: test.roles ?? [],
  questions: test.questions.map((q, i) => ({
    number: i + 1,
    id: q.id,
    type: q.type,
    title: q.title,
    prompt: q.prompt,
    points: q.weight,
    timeLimitMinutes: q.timeLimitMinutes,
    ...(q.options && { options: q.options }),
    ...(q.correctOption !== undefined && { correctOption: q.correctOption }),
    ...(q.correctOptions && { correctOptions: q.correctOptions }),
    ...(q.acceptedAnswers && { acceptedAnswers: q.acceptedAnswers }),
    ...(q.items && { items: q.items }),
    ...(q.pairs && { pairs: q.pairs }),
    ...((q.type === 'code' || q.type === 'sql') && { starterCode: q.starterCode, solutionCode: q.solutionCode }),
    ...(q.type === 'sql' && { tables: (q.contextData ?? '').match(/Table: (\w+)/g)?.map((t) => t.slice(7)) ?? [] }),
    ...(q.type !== 'app' && q.testCases.length > 0 && { testCases: q.testCases.map(({ description, input, expectedOutput }) => ({ description, input, expectedOutput })) }),
    ...(q.type === 'app' && { app: `A working copy of ${q.contextData}, checked on: ${q.testCases.map((tc) => tc.description).join('; ')}` }),
  })),
});

type RawTest = Record<string, any> & { questions?: (RawQuestion & { keep?: string })[] };

// The AI's new version of the draft made into a real test: kept questions carried over, new ones checked
async function buildDraft(raw: RawTest, previous: AssessmentTest | undefined, ctx: ChatContext): Promise<{ test?: AssessmentTest; dropped: number }> {
  const items = raw.questions ?? [];
  const built = await Promise.all(
    items.map((item) => (item.keep ? Promise.resolve(previous?.questions.find((q) => q.id === item.keep) ?? null) : checkQuestion(item)))
  );
  const questions = built.filter((q): q is Question => !!q);
  const dropped = items.length - questions.length;
  if (!questions.length) return { dropped };
  const total = questions.reduce((sum, q) => sum + q.weight, 0) || 1;
  const difficulty = (TEST_DIFFICULTIES as string[]).includes(raw.difficulty) ? (raw.difficulty as TestDifficulty) : previous?.difficulty ?? ctx.level;
  return {
    dropped,
    test: {
      id: '',
      title: String(raw.title ?? previous?.title ?? 'New test').trim(),
      category: CATEGORIES.includes(raw.category) ? (raw.category as SkillCategory) : previous?.category ?? 'Consulting',
      difficulty,
      type: ctx.business ? 'custom' : 'standard',
      ...(ctx.business && { businessId: ctx.business.id, companyName: ctx.business.name }),
      description: String(raw.description ?? '').trim(),
      estimatedMinutes: questions.reduce((sum, q) => sum + q.timeLimitMinutes, 0),
      passingScore: Math.min(90, Math.max(50, Math.round(raw.passingScore ?? 70))),
      totalQuestions: questions.length,
      questions: questions.map((q) => ({ ...q, weight: Math.max(1, Math.round((q.weight / total) * 100)) })),
      skillsTested: (raw.skillsTested ?? []).map(String).slice(0, 6),
      ...(!ctx.business && { roles: ((raw.roles ?? []) as string[]).filter((r): r is TestRole => (ALL_ROLES as string[]).includes(r)) }),
    },
  };
}

const NOT_CONFIGURED = "Vetter's AI isn't available on this site: it runs on Vetter's own server (npm run dev or npm start) with an ANTHROPIC_API_KEY.";

// One turn: the company's message in, Vetter's reply and the draft's new version out
export async function sendChat(state: ChatState, text: string, ctx: ChatContext): Promise<ChatState> {
  const messages: ChatMessage[] = [...state.messages, { role: 'user', text }];
  const library = libraryFor(ctx.tests, ctx.business);

  let body: Record<string, any> = {};
  let failure: string | undefined;
  try {
    const res = await fetch('/api/test-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map(({ role, text }) => ({ role, text })),
        job: ctx.job,
        draft: state.draft && draftForModel(state.draft),
        existing: state.existing.map((s) => s.test.id),
        wantExisting: ctx.wantExisting,
        library: library.map((t) => ({ id: t.id, title: t.title, category: t.category, difficulty: t.difficulty, skills: t.skillsTested, roles: t.roles ?? [], description: t.description })),
        roles: ALL_ROLES,
        categories: CATEGORIES,
        levels: TEST_DIFFICULTIES,
        tables: Object.values(MOCK_DATABASE).map((t) => ({ name: t.name, columns: t.columns })),
        research: state.research,
        researchedFor: state.researchedFor,
      }),
    });
    body = await res.json().catch(() => ({}));
    // No endpoint at all (a static host) is the same as the AI not being set up
    if (!res.ok) failure = body.error === 'not-configured' || res.status === 404 ? 'not-configured' : body.error || `The AI request failed (${res.status}).`;
  } catch {
    failure = "Couldn't reach Vetter's AI. Check your connection and try again.";
  }

  if (failure) {
    // Without the AI, the first turn still gets a start from Vetter's own tests and questions
    if (failure === 'not-configured' && !state.draft) {
      const brief = [ctx.job, ...messages.filter((m) => m.role === 'user').map((m) => m.text)].filter(Boolean).join('\n\n');
      const draft = assembleFromBank({ prompt: brief, wantNewTest: true, wantExisting: ctx.wantExisting, questionCount: 6, styles: ['choice', 'multi', 'text', 'order', 'match', 'app'], level: ctx.level, title: ctx.jobTitle }, library, ctx.tests, ctx.business);
      const existing = ctx.wantExisting ? matchExisting(brief, library) : [];
      const reply = draft
        ? `I can't write new questions here, so I've put a draft together from the best-fitting questions in Vetter's tests. ${NOT_CONFIGURED} You can still edit every question in the builder.`
        : `${NOT_CONFIGURED} Vetter's own question bank doesn't cover this yet either, so write the test in the builder for now.`;
      return { ...state, messages: [...messages, { role: 'assistant', text: reply }], draft, existing };
    }
    const reply = failure === 'not-configured' ? `${NOT_CONFIGURED} Open the draft in the builder to change it by hand.` : failure;
    return { ...state, messages: [...messages, { role: 'assistant', text: reply }] };
  }

  const picked: Suggestion[] = ((body.existing ?? []) as { testId: string; reason: string }[]).flatMap(({ testId, reason }) => {
    const test = library.find((t) => t.id === testId);
    return test ? [{ test, reason }] : [];
  });
  let draft = state.draft;
  let note: string | undefined;
  if (body.test) {
    const built = await buildDraft(body.test, state.draft, ctx);
    if (built.test) draft = built.test;
    if (built.dropped) note = built.test ? `${built.dropped} ${built.dropped === 1 ? 'question' : 'questions'} failed Vetter's checks and ${built.dropped === 1 ? 'was' : 'were'} left out.` : "None of the new questions passed Vetter's checks, so the draft wasn't changed. Try asking again.";
  }
  return {
    messages: [...messages, { role: 'assistant', text: String(body.reply ?? '').trim() || 'Done.', ...(note && { note }) }],
    draft,
    existing: ctx.wantExisting ? (body.existing ? picked : state.existing) : [],
    research: body.research ?? state.research,
    researchedFor: body.researchedFor ?? state.researchedFor,
  };
}
