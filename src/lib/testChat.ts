import { AssessmentTest, BlueprintItem, Business, Question, QuestionType, SkillCategory, TEST_DIFFICULTIES, TestDifficulty, TestRole } from '../types';
import { MOCK_DATABASE } from './sqlEngine';
import { isGroupType, orderedQuestions } from './questionTypes';
import { ALL_ROLES, CATEGORIES, RawQuestion, Suggestion, assembleFromBank, checkQuestion, libraryFor, linkTasks, matchExisting } from './testGeneration';

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
  // The question types the company picked; Vetter uses only these unless asked in the chat
  styles: QuestionType[];
}

// The draft as the AI sees it: everything it needs to change a question, except app pages, which it can only keep whole
export const draftForModel = (test: AssessmentTest) => ({
  title: test.title,
  description: test.description,
  category: test.category,
  difficulty: test.difficulty,
  passingScore: test.passingScore,
  // The blueprint travels as skillsTested lines, as the AI writes it
  skillsTested: test.blueprint?.length ? test.blueprint.map((b) => `${b.skill} | ${b.weight} | ${b.why} | ${b.how}`) : test.skillsTested,
  roles: test.roles ?? [],
  questions: orderedQuestions(test.questions).map((q, i) => ({
    number: i + 1,
    id: q.id,
    type: q.type,
    // Tasks are referred to by id; a question about one names it
    ...(q.taskId && { taskRef: q.taskId }),
    title: q.title,
    prompt: q.prompt,
    points: q.weight,
    timeLimitMinutes: q.timeLimitMinutes,
    ...(q.options && { options: q.options }),
    ...(q.correctOption !== undefined && { correctOption: q.correctOption }),
    ...(q.correctOptions && { correctOptions: q.correctOptions }),
    ...(q.acceptedAnswers && { acceptedAnswers: q.acceptedAnswers }),
    ...(q.type === 'written' && { acceptedAnswers: q.rubric ?? [], solutionCode: q.solutionCode ?? '' }),
    ...(q.type === 'case' && { contextData: q.contextData ?? '' }),
    ...(q.items && { items: q.items }),
    ...(q.pairs && { pairs: q.pairs }),
    ...((q.type === 'code' || q.type === 'sql') && { starterCode: q.starterCode, solutionCode: q.solutionCode }),
    ...(q.type === 'sql' && { tables: (q.contextData ?? '').match(/Table: (\w+)/g)?.map((t) => t.slice(7)) ?? [] }),
    ...(q.type !== 'app' && q.testCases.length > 0 && { testCases: q.testCases.map(({ description, input, expectedOutput }) => ({ description, input, expectedOutput })) }),
    ...(q.type === 'app' && { app: `A working copy of ${q.contextData}, checked on: ${q.testCases.map((tc) => tc.description).join('; ')}` }),
    ...(q.type === 'sheet' && { sheet: `A spreadsheet task in ${q.contextData}, checked on: ${q.testCases.map((tc) => tc.description).join('; ')}` }),
    ...(q.type === 'database' && { database: `A database task on ${(q.tables ?? []).map((t) => `${t.name} (${t.rows.length} rows)`).join(', ')}, checked on: ${q.testCases.map((tc) => tc.description).join('; ')}` }),
  })),
});

type RawTest = Record<string, any> & { questions?: RawQuestion[] };

// Builds an app question's page from the designer's spec, in its own request. Resolves with the question ready to
// check, or as it was when the build failed (it's then dropped by the checks)
async function buildAppPage(item: RawQuestion, research?: string): Promise<RawQuestion> {
  try {
    const res = await fetch('/api/build-app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.title, prompt: item.prompt, brief: item.appHtml, testCases: item.testCases ?? [], research }),
    });
    if (!res.ok) return item;
    const page = (await res.json()) as { appHtml?: string; testCases?: RawQuestion['testCases'] };
    return { ...item, appHtml: page.appHtml ?? '', testCases: page.testCases?.length ? page.testCases : item.testCases };
  } catch {
    return item;
  }
}

// What the hire needs, as the AI worked it out ("skill | weight | why | how" a line): blank rows dropped and the
// weights made to add up to 100
function blueprintOf(raw: unknown): BlueprintItem[] | undefined {
  // Plain skill names, from before tests had a blueprint, aren't one
  if (!Array.isArray(raw) || !raw.some((line) => String(line).includes('|'))) return undefined;
  const rows = raw
    .map((line) => String(line ?? '').split('|').map((part) => part.trim()))
    .map(([skill = '', weight = '', why = '', how = '']) => ({ skill, why, how, weight: Math.max(0, parseFloat(weight) || 0) }))
    .filter((r) => r.skill)
    .slice(0, 10);
  if (!rows.length) return undefined;
  const total = rows.reduce((sum, r) => sum + r.weight, 0) || rows.length;
  return rows.map((r) => ({ ...r, weight: Math.round(((r.weight || (total === rows.length ? 1 : 0)) / total) * 100) }));
}

// The AI's new version of the draft made into a real test: kept questions carried over, new ones checked. New app
// pages are built first, side by side, each in its own request
async function buildDraft(raw: RawTest, previous: AssessmentTest | undefined, ctx: ChatContext, research?: string): Promise<{ test?: AssessmentTest; dropped: number }> {
  const items = raw.questions ?? [];
  const built = await Promise.all(
    items.map(async (item) => {
      if (item.keep) return previous?.questions.find((q) => q.id === item.keep) ?? null;
      // In a conversation an app comes with the spec for its page, not the page: anything that isn't HTML is built first
      const isSpec = item.type === 'app' && !!item.appHtml?.trim() && !/<(html|body|div|script|style|svg)\b/i.test(item.appHtml);
      const ready = isSpec ? await buildAppPage(item, research) : item;
      return checkQuestion(ready);
    })
  );
  const questions = linkTasks(items, built);
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
      // A case study carries no marks; its questions do
      questions: questions.map((q) => ({ ...q, weight: q.type === 'case' ? 0 : Math.max(1, Math.round((q.weight / total) * 100)) })),
      // skillsTested comes as the blueprint's lines: the skill names alone, and the blueprint in full
      skillsTested: (raw.skillsTested ?? []).map((line: unknown) => String(line).split('|')[0].trim()).filter(Boolean).slice(0, 8),
      ...((blueprintOf(raw.skillsTested) ?? previous?.blueprint) && { blueprint: blueprintOf(raw.skillsTested) ?? previous?.blueprint }),
      ...(!ctx.business && { roles: ((raw.roles ?? []) as string[]).filter((r): r is TestRole => (ALL_ROLES as string[]).includes(r)) }),
    },
  };
}

const NOT_CONFIGURED = "Vetter's AI isn't available on this site: it runs on Vetter's own server (npm run dev or npm start) with an ANTHROPIC_API_KEY.";

// One turn: the company's message in, Vetter's reply and the draft's new version out
// Posts to one of Vetter's AI endpoints; a failure comes back as the reason, 'not-configured' when there's no AI
async function post(path: string, payload: unknown): Promise<{ body: Record<string, any>; failure?: string }> {
  try {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const body = await res.json().catch(() => ({}));
    // No endpoint at all (a static host) is the same as the AI not being set up
    if (!res.ok) return { body, failure: body.error === 'not-configured' || res.status === 404 ? 'not-configured' : body.error || `The AI request failed (${res.status}).` };
    return { body };
  } catch {
    return { body: {}, failure: "Couldn't reach Vetter's AI. Check your connection and try again." };
  }
}

// Runs jobs at most `limit` at a time, keeping their order
async function inBatches<T, R>(items: T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await run(items[i]);
      }
    })
  );
  return results;
}

type PlanItem = { ref: string; taskRef: string; type: string; title: string; brief: string; points: number; minutes: number };

// The plan split into sections to write side by side: each case or task with its questions, and the other questions
// four at a time
function sectionsOf(items: PlanItem[]): string[][] {
  const sections: string[][] = [];
  let loose: string[] = [];
  const groupRefs = new Set(items.filter((i) => isGroupType(i.type as QuestionType)).map((i) => i.ref));
  const flush = () => loose.length && (sections.push(loose), (loose = []));
  for (const item of items) {
    if (item.taskRef && groupRefs.has(item.taskRef)) continue;
    if (groupRefs.has(item.ref)) {
      flush();
      sections.push([item.ref, ...items.filter((i) => i.taskRef === item.ref).map((i) => i.ref)]);
    } else {
      loose.push(item.ref);
      if (loose.length === 4) flush();
    }
  }
  flush();
  return sections;
}

// A new test in stages, each request short enough for the host's time limit: the plan (what the hire needs and an
// outline), then every section written at once, then every interactive page built and tried out
async function planAndWrite(state: ChatState, messages: ChatMessage[], ctx: ChatContext, request: Record<string, unknown>, progress: (stage: string) => void) {
  progress('Working out what this hire really needs…');
  const planned = await post('/api/plan-test', request);
  if (planned.failure) return { failure: planned.failure };
  const body = planned.body;
  const research: string | undefined = body.research ?? state.research;
  const plan = body.plan as (Record<string, any> & { items: PlanItem[]; blueprint: string[] }) | undefined;
  if (!plan?.items?.length) return { body };
  // Every item needs its own ref to be written and matched up; blank or repeated ones get one
  const seen = new Set<string>();
  plan.items = plan.items.map((item, i) => {
    const ref = item.ref?.trim() && !seen.has(item.ref.trim()) ? item.ref.trim() : `i${i + 1}`;
    seen.add(ref);
    return { ...item, ref };
  });

  const sections = sectionsOf(plan.items);
  progress(`Writing ${plan.items.length} questions in ${sections.length} sections…`);
  const brief = messages.filter((m) => m.role === 'user').map((m) => m.text).join('\n\n');
  let done = 0;
  const written = await inBatches(sections, 6, async (write) => {
    const part = await post('/api/write-questions', { ...request, brief, plan, write, research });
    progress(`Written ${++done} of ${sections.length} sections…`);
    // Matched to the plan by position; the plan's ref and taskRef win, since the writer sometimes drops them
    return ((part.body.questions ?? []) as RawQuestion[]).slice(0, write.length).map((q, i) => {
      const item = plan.items.find((it) => it.ref === write[i]);
      return { ...q, ref: write[i], taskRef: item?.taskRef ?? q.taskRef ?? '' };
    });
  });
  const questions = written.flat();
  const apps = questions.filter((q) => q.type === 'app').length;
  progress(apps ? `Building ${apps} interactive ${apps === 1 ? 'task' : 'tasks'} and checking every answer…` : 'Checking every answer…');
  const built = await buildDraft({ ...plan, skillsTested: plan.blueprint, questions }, undefined, ctx, research);
  const missing = plan.items.length - questions.length;
  return { body: { ...body, test: undefined }, built: { ...built, dropped: built.dropped + missing } };
}

// One turn: the company's message in, Vetter's reply and the draft's new version out. A first draft (or a rewrite of
// most of it) is planned and written in stages; other changes are made in one go
export async function sendChat(state: ChatState, text: string, ctx: ChatContext, progress: (stage: string) => void = () => {}): Promise<ChatState> {
  const messages: ChatMessage[] = [...state.messages, { role: 'user', text }];
  const library = libraryFor(ctx.tests, ctx.business);
  const request = {
    messages: messages.map(({ role, text }) => ({ role, text })),
    job: ctx.job,
    draft: state.draft && draftForModel(state.draft),
    existing: state.existing.map((s) => s.test.id),
    wantExisting: ctx.wantExisting,
    styles: ctx.styles,
    library: library.map((t) => ({ id: t.id, title: t.title, category: t.category, difficulty: t.difficulty, skills: t.skillsTested, roles: t.roles ?? [], description: t.description })),
    roles: ALL_ROLES,
    categories: CATEGORIES,
    levels: TEST_DIFFICULTIES,
    tables: Object.values(MOCK_DATABASE).map((t) => ({ name: t.name, columns: t.columns })),
    research: state.research,
    researchedFor: state.researchedFor,
  };

  let body: Record<string, any> = {};
  let failure: string | undefined;
  let staged: { test?: AssessmentTest; dropped: number } | undefined;
  if (!state.draft) {
    const out = await planAndWrite(state, messages, ctx, request, progress);
    ({ failure } = out);
    body = out.body ?? {};
    staged = out.built;
  } else {
    progress('Thinking it over…');
    ({ body, failure } = await post('/api/test-chat', request));
    // Vetter judged the change too big to make in one go: plan and write the test afresh
    if (!failure && body.lookUp === 'REPLAN') {
      const out = await planAndWrite(state, messages, ctx, request, progress);
      ({ failure } = out);
      body = out.body ?? {};
      staged = out.built;
    }
  }

  if (failure) {
    // Without the AI, the first turn still gets a start from Vetter's own tests and questions
    if (failure === 'not-configured' && !state.draft) {
      const brief = [ctx.job, ...messages.filter((m) => m.role === 'user').map((m) => m.text)].filter(Boolean).join('\n\n');
      const draft = assembleFromBank({ prompt: brief, wantNewTest: true, wantExisting: ctx.wantExisting, questionCount: 10, styles: ctx.styles, level: ctx.level, title: ctx.jobTitle }, library, ctx.tests, ctx.business);
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
  if (staged || body.test) {
    const built = staged ?? (await buildDraft(body.test, state.draft, ctx, body.research ?? state.research));
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
