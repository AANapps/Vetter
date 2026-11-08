import { contactText, emailToRaw, parseContact } from './emailTasks';
import { AssessmentTest, BlueprintItem, Business, Question, QuestionType, SkillCategory, TEST_DIFFICULTIES, TestDifficulty, TestRole } from '../types';
import { MOCK_DATABASE } from './sqlEngine';
import { probeApp } from './appSimulation';
import { isGroupType, orderedQuestions } from './questionTypes';
import { aiFetch } from './aiRequest';
import { ALL_ROLES, CATEGORIES, RawQuestion, Suggestion, assembleFromBank, checkQuestion, libraryFor, linkTasks, matchExisting } from './testGeneration';

// Building a test by talking to Vetter (server/testChat.ts does the AI side). Each turn sends the conversation and the
// draft; what comes back is checked here like any AI-written test: new questions are run and broken ones left out.

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  // Something about the turn worth showing under the reply, e.g. questions that failed the checks
  note?: string;
  // The turn failed (the AI was unavailable or errored), so it can be sent again as it was
  failed?: boolean;
  // It failed because the company's AI credit ran out: topping up lets it carry on
  needsCredit?: boolean;
  // What the turn used of the company's credit, in pence, when it pays for AI
  cost?: number;
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
  // The level the test is named at: the highest the company ticked, or none for Vetter to pick
  level?: TestDifficulty;
  // Every level ticked; several means questions pitched across them
  levels: TestDifficulty[];
  wantExisting: boolean;
  tests: AssessmentTest[];
  business?: Business;
  // The question types the company picked; Vetter uses only these, or any when none are
  styles: QuestionType[];
  // How many questions the company wants, counting sub-questions: exactly one number, or a range when it ticked several
  questionCount?: number;
  questionRange?: [number, number];
  // The timer the company picked, or none for Vetter to size it
  timeLimit?: number | 'none';
  // The app task open beside the chat, which "this" and "the app" mean
  viewing?: { id: string; label: string; app: string };
}

// A question type the company allows: any, when it hasn't ticked one
const allowedStyle = (ctx: ChatContext, type: unknown) => !ctx.styles.length || ctx.styles.includes(type as QuestionType);
const QUESTION_TYPES: QuestionType[] = ['choice', 'multi', 'text', 'written', 'order', 'match', 'email', 'case', 'sheet', 'database', 'app', 'code', 'sql'];

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
  // The company the candidate works at in the simulation, and who they work with
  ...(test.scenario && { scenario: { company: test.scenario.company, role: test.scenario.role, brief: test.scenario.brief, people: (test.scenario.people ?? []).map(contactText) } }),
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
    ...(q.type === 'email' && emailToRaw(q)),
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
// Then clicks through it out of sight, and when a control does nothing or throws an error, sends it back once with the
// list to fix
async function buildAppPage(item: RawQuestion, research?: string): Promise<RawQuestion> {
  const request = (fix?: { html: string; problems: string[] }) =>
    aiFetch('/api/build-app', { title: item.title, prompt: item.prompt, brief: item.appHtml, testCases: item.testCases ?? [], research, ...(fix && { fix }) }).then(async (res) => (res.ok ? ((await res.json()) as { appHtml?: string; testCases?: RawQuestion['testCases'] }) : null));
  try {
    const page = await request();
    if (!page?.appHtml) return item;
    const built: RawQuestion = { ...item, appHtml: page.appHtml, testCases: page.testCases?.length ? page.testCases : item.testCases };
    const problems = await appProblems(built);
    if (!problems.length) return built;
    const fixed = await request({ html: built.appHtml!, problems }).catch(() => null);
    if (!fixed?.appHtml) return built;
    const repaired: RawQuestion = { ...built, appHtml: fixed.appHtml, testCases: fixed.testCases?.length ? fixed.testCases : built.testCases };
    // The repair is kept unless it made things worse: it must still load
    const after = await probeApp(repaired.appHtml!, checksOf(repaired));
    return after.state ? repaired : built;
  } catch {
    return item;
  }
}

// An app page changed as the company asked: the builder gets the page as it is and the change, and the result is
// checked like a new page (it must load and its checks must still fail at the start). Null when it doesn't hold up
async function editAppPage(question: Question, change: string, taskPrompt: string, research?: string): Promise<Question | null> {
  const checks = question.testCases.map(({ description, input, expectedOutput }) => ({ description, input, expectedOutput }));
  const prompt = taskPrompt?.trim() || question.prompt;
  try {
    const res = await aiFetch('/api/build-app', { title: question.title, prompt, brief: change, testCases: checks, research, edit: { html: question.appHtml ?? '', change } });
    if (!res.ok) return null;
    const page = (await res.json()) as { appHtml?: string; testCases?: RawQuestion['testCases'] };
    if (!page.appHtml) return null;
    const checked = await checkQuestion({ type: 'app', title: question.title, prompt, appHtml: page.appHtml, testCases: (page.testCases?.length ? page.testCases : checks) as RawQuestion['testCases'], points: question.weight, timeLimitMinutes: question.timeLimitMinutes });
    // Same question, so the questions about it stay joined to it
    return checked ? { ...question, prompt, appHtml: checked.appHtml, contextData: checked.contextData, starterCode: checked.starterCode, testCases: checked.testCases } : null;
  } catch {
    return null;
  }
}

const withChangedQuestions = (test: AssessmentTest, changed: Question[]): AssessmentTest =>
  changed.length ? { ...test, questions: test.questions.map((q) => changed.find((c) => c.id === q.id) ?? q) } : test;

const checksOf = (q: RawQuestion) => (q.testCases ?? []).filter((tc) => tc.input?.trim() && tc.expectedOutput?.trim());

// What's wrong with a built page when every control is clicked: ones that do nothing, ones that throw, or a page that
// won't load at all
async function appProblems(q: RawQuestion): Promise<string[]> {
  const probe = await probeApp(q.appHtml ?? '', checksOf(q), 6000, true);
  if (!probe.state) return probe.problem ? [probe.problem] : [];
  return [
    ...(probe.audit?.dead ?? []).map((name) => `The control "${name}" does nothing when clicked`),
    ...(probe.audit?.errors ?? []).map((err) => `Clicking ${err}`),
  ];
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
  // A new question in a type the company hasn't picked is left out, whatever the AI sent; kept ones stay until rewritten
  const items = (raw.questions ?? []).filter((item) => item.keep || allowedStyle(ctx, item.type));
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
  // The job simulation's setting, from the plan: the company the candidate works at, their role, their first morning
  // there and the people they work with. A change in the chat keeps the setting the test already has
  const people = ((raw.people ?? []) as unknown[]).map((p) => parseContact(String(p))).filter((c): c is NonNullable<typeof c> => !!c).slice(0, 16);
  const scenario: AssessmentTest['scenario'] = String(raw.setting ?? '').trim()
    ? { company: String(raw.company ?? '').trim() || ctx.business?.name || 'the company', role: ctx.jobTitle || String(raw.role ?? '').trim() || String(raw.title ?? 'the role'), brief: String(raw.setting).trim(), ...(people.length && { people }) }
    : previous?.scenario;
  // The level the company picked wins over the AI's
  const difficulty = ctx.level ?? (TEST_DIFFICULTIES.includes(raw.difficulty) ? (raw.difficulty as TestDifficulty) : previous?.difficulty ?? 'Junior');
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
      ...(ctx.timeLimit !== undefined && { timeLimit: ctx.timeLimit }),
      passingScore: Math.min(90, Math.max(50, Math.round(raw.passingScore ?? 70))),
      totalQuestions: questions.length,
      // A case study carries no marks; its questions do
      questions: questions.map((q) => ({ ...q, weight: q.type === 'case' ? 0 : Math.max(1, Math.round((q.weight / total) * 100)) })),
      // skillsTested comes as the blueprint's lines: the skill names alone, and the blueprint in full
      skillsTested: (raw.skillsTested ?? []).map((line: unknown) => String(line).split('|')[0].trim()).filter(Boolean).slice(0, 8),
      ...((blueprintOf(raw.skillsTested) ?? previous?.blueprint) && { blueprint: blueprintOf(raw.skillsTested) ?? previous?.blueprint }),
      ...(!ctx.business && { roles: ((raw.roles ?? []) as string[]).filter((r): r is TestRole => (ALL_ROLES as string[]).includes(r)) }),
      ...(scenario && { scenario }),
    },
  };
}

const NOT_CONFIGURED = "Vetter's AI isn't available on this site: it runs on Vetter's own server (npm run dev or npm start) with an ANTHROPIC_API_KEY.";

// One turn: the company's message in, Vetter's reply and the draft's new version out
// Posts to one of Vetter's AI endpoints; a failure comes back as the reason, 'not-configured' when there's no AI
async function post(path: string, payload: unknown): Promise<{ body: Record<string, any>; failure?: string }> {
  try {
    const res = await aiFetch(path, payload);
    const body = await res.json().catch(() => ({}));
    // The company's credit has run out: it can top up and carry on
    if (res.status === 402) return { body, failure: 'no-credit' };
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
  // Only items in the picked styles, and no questions about a case or task that's gone
  if (plan?.items?.length) {
    const allowed = plan.items.filter((item) => allowedStyle(ctx, item.type));
    plan.items = allowed.filter((item) => !item.taskRef || allowed.some((other) => other.ref === item.taskRef) || !plan.items.some((other) => other.ref === item.taskRef));
  }
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
    // The company hiring: the simulation is set there, so the candidate works for it from the first question
    company: ctx.business && { name: ctx.business.name, industry: ctx.business.industry, description: ctx.business.description, website: ctx.business.websiteUrl, headquarters: ctx.business.headquarters },
    jobTitle: ctx.jobTitle,
    draft: state.draft && draftForModel(state.draft),
    existing: state.existing.map((s) => s.test.id),
    wantExisting: ctx.wantExisting,
    styles: ctx.styles,
    questionCount: ctx.questionCount,
    questionRange: ctx.questionRange,
    timeLimit: ctx.timeLimit,
    viewing: ctx.viewing,
    // One level ticked is the test's level; several are a spread to pitch across
    difficulty: ctx.levels.length === 1 ? ctx.level : undefined,
    difficulties: ctx.levels.length > 1 ? ctx.levels : undefined,
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
      const draft = assembleFromBank({ prompt: brief, wantNewTest: true, wantExisting: ctx.wantExisting, questionCount: ctx.questionCount ?? ctx.questionRange?.[1] ?? 10, styles: ctx.styles.length ? ctx.styles : QUESTION_TYPES, level: ctx.level ?? 'Junior', title: ctx.jobTitle }, library, ctx.tests, ctx.business);
      const existing = ctx.wantExisting ? matchExisting(brief, library) : [];
      const reply = draft
        ? `I can't write new questions here, so I've put a draft together from the best-fitting questions in Vetter's tests. ${NOT_CONFIGURED} You can still edit every question in the builder.`
        : `${NOT_CONFIGURED} Vetter's own question bank doesn't cover this yet either, so write the test in the builder for now.`;
      return { ...state, messages: [...messages, { role: 'assistant', text: reply }], draft, existing };
    }
    const reply = failure === 'not-configured' ? `${NOT_CONFIGURED} Open the draft in the builder to change it by hand.` : failure;
    if (failure === 'no-credit')
      return {
        ...state,
        messages: [...messages, { role: 'assistant', text: "You've used up your AI credit. Top up to carry on: your test and this conversation are kept, and I'll pick up right here.", failed: true, needsCredit: true }],
      };
    return { ...state, messages: [...messages, { role: 'assistant', text: reply, failed: true }] };
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
  // Changes to app pages in the draft, made in place by the page builder, side by side
  const edits = ((body.appEdits ?? []) as { id: string; change: string; taskPrompt: string }[]).filter((e) => e.change?.trim() && draft?.questions.some((q) => q.id === e.id && q.type === 'app'));
  if (draft && edits.length) {
    progress(edits.length === 1 ? 'Changing the app…' : `Changing ${edits.length} apps…`);
    const research = body.research ?? state.research;
    const changed = await Promise.all(edits.map((e) => editAppPage(draft!.questions.find((q) => q.id === e.id)!, e.change, e.taskPrompt, research)));
    const failed = changed.filter((q) => !q).length;
    draft = withChangedQuestions(draft, changed.filter((q): q is Question => !!q));
    if (failed) note = [note, `${failed === 1 ? "One app change didn't" : `${failed} app changes didn't`} pass Vetter's checks, so ${failed === 1 ? 'that app was' : 'those apps were'} left as ${failed === 1 ? 'it was' : 'they were'}. Try asking again.`].filter(Boolean).join(' ');
  }
  return {
    messages: [...messages, { role: 'assistant', text: String(body.reply ?? '').trim() || 'Done.', ...(note && { note }) }],
    draft,
    existing: ctx.wantExisting ? (body.existing ? picked : state.existing) : [],
    research: body.research ?? state.research,
    researchedFor: body.researchedFor ?? state.researchedFor,
  };
}
