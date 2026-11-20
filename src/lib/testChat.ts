import { contactText, emailToRaw, messageText, parseContact, parseMessage } from './emailTasks';
import { AppCallout, AssessmentTest, BlueprintItem, Business, Question, QuestionType, TestKind, SkillCategory, TEST_DIFFICULTIES, TestDifficulty, TestRole } from '../types';
import { MOCK_DATABASE } from './sqlEngine';
import { probeApp } from './appSimulation';
import { isGroupType, orderedQuestions } from './questionTypes';
import { aiFetch } from './aiRequest';
import { EnvironmentSubmission, loadEnvironmentPage, loadEnvironments, loadSubmissionPage, markEnvironmentUsed, submitEnvironment, updateSubmission } from './environments';
import { AppEdit, ReusableApp, applyEdits, parseData, refsOf, reusableAppCode, reusableApps, shapeProblems, splitData, withData } from './libraryApps';
import { categoriesFor, companySector, rolesFor } from './sectors';
import { DayApp, RawJobSim, assembleJobSim, finishJobSim, isJobSimDraft } from './jobSimBuild';
import { ALL_ROLES, RawQuestion, Suggestion, assembleFromBank, checkQuestion, libraryFor, linkTasks, matchExisting } from './testGeneration';

// Building a test by talking to Praxa (server/testChat.ts does the AI side). Each turn sends the conversation and the
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
  // A change planned for a written draft, shown as a checklist with Build; made only when that's pressed
  proposal?: ChangeProposal;
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
  // A skills test or a job simulation, as the company picked
  kind?: TestKind;
  job?: string;
  // The job's title, to name a test put together without the AI
  jobTitle?: string;
  // The level the test is named at: the highest the company ticked, or none for Praxa to pick
  level?: TestDifficulty;
  // Every level ticked; several means questions pitched across them
  levels: TestDifficulty[];
  wantExisting: boolean;
  tests: AssessmentTest[];
  business?: Business;
  // The question types the company picked; Praxa uses only these, or any when none are
  styles: QuestionType[];
  // How many questions the company wants, counting sub-questions: exactly one number, or a range when it ticked several
  questionCount?: number;
  questionRange?: [number, number];
  // The timer the company picked, or none for Praxa to size it
  timeLimit?: number | 'none';
  // The app task open beside the chat, which "this" and "the app" mean
  viewing?: { id: string; label: string; app: string };
  // What the company already settled in the home chat, never asked again
  background?: string;
}

// A question type the company allows: any, when it hasn't ticked one
// A standalone simulation is one app and nothing else
const stylesOf = (ctx: ChatContext): QuestionType[] => (ctx.kind === 'standalone' ? ['app'] : ctx.styles);
const allowedStyle = (ctx: ChatContext, type: unknown) => !stylesOf(ctx).length || stylesOf(ctx).includes(type as QuestionType);
const QUESTION_TYPES: QuestionType[] = ['choice', 'multi', 'text', 'written', 'order', 'match', 'email', 'assistant', 'case', 'sheet', 'database', 'app', 'code', 'sql'];

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
  ...(test.scenario && { scenario: { company: test.scenario.company, role: test.scenario.role, brief: test.scenario.brief, people: (test.scenario.people ?? []).map(contactText), inbox: (test.scenario.inbox ?? []).map(messageText) } }),
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
    ...(q.type === 'assistant' && { starterCode: q.assistant?.material ?? '', appHtml: q.assistant?.brief ?? '', acceptedAnswers: q.rubric ?? [], items: q.assistant?.process ?? [], solutionCode: q.solutionCode ?? '' }),
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
// How the page builder is asked to build an app: as training, as a game-like simulation (in a gamified test or as the
// whole of a standalone one), and for the company's sector
export interface PageMode {
  training?: boolean;
  game?: 'gamified' | 'standalone';
  sector?: string;
}
export const pageModeOf = (ctx: ChatContext): PageMode => ({
  training: ctx.kind === 'training',
  game: ctx.kind === 'standalone' ? 'standalone' : ctx.kind === 'simulation' ? 'gamified' : undefined,
  sector: ctx.business?.sector,
});

// What Praxa is doing right now, told to the company as it happens (each call is a real step starting). The major
// steps come along as a checklist when it changes; a call without one leaves the last checklist as it was
export interface BuildStep {
  id: string;
  label: string;
  status: 'todo' | 'doing' | 'done';
}
export type Progress = (stage: string, steps?: BuildStep[]) => void;

// The checklist of a build's major steps, all shown from the start. Starting a step ticks off every step before it;
// steps can be added once they're known, or dropped once they're not needed
function checklist(progress: Progress, items: [string, string][]) {
  let steps: BuildStep[] = items.map(([id, label]) => ({ id, label, status: 'todo' }));
  const emit = (stage: string) => progress(stage, steps.map((step) => ({ ...step })));
  return {
    start(ids: string | string[], stage: string) {
      const list = Array.isArray(ids) ? ids : [ids];
      const first = steps.findIndex((step) => list.includes(step.id));
      steps = steps.map((step, i) => (list.includes(step.id) ? { ...step, status: 'doing' } : first >= 0 && i < first ? { ...step, status: 'done' } : step));
      emit(stage);
    },
    has: (id: string) => steps.some((step) => step.id === id),
    drop(ids: string[]) {
      steps = steps.filter((step) => !ids.includes(step.id));
    },
    add(items: [string, string][]) {
      steps = [...steps, ...items.filter(([id]) => !steps.some((step) => step.id === id)).map(([id, label]) => ({ id, label, status: 'todo' as const }))];
    },
    finish() {
      steps = steps.map((step) => ({ ...step, status: 'done' }));
      emit('Done');
    },
  };
}
type Checklist = ReturnType<typeof checklist>;

// The page designed in detail first (its look, layout, screens, data, state and controls), in a request of its own at
// high effort; undefined when that doesn't come back, and the page is then built from the spec alone
async function designAppPage(item: RawQuestion, research: string | undefined, mode: PageMode): Promise<string | undefined> {
  try {
    const res = await aiFetch('/api/design-app', { title: item.title, prompt: item.prompt, brief: item.appHtml, testCases: item.testCases ?? [], research, ...mode });
    if (!res.ok) return undefined;
    const body = (await res.json()) as { design?: string };
    return body.design?.trim() || undefined;
  } catch {
    return undefined;
  }
}

type BuiltPage = {
  appHtml?: string;
  testCases?: RawQuestion['testCases'];
  callouts?: AppCallout[];
  // The task's data, apart from the app (JSON), which the page reads from window.praxaData
  data?: string;
  catalog?: { app?: string; name?: string; product?: string; summary?: string; features?: string[]; added?: string[]; dataShape?: string; stateShape?: string };
};
// An app from Praxa's app library to build on, with its code
type LibraryBase = ReusableApp & { html: string };

// Building on the app library (since 2026-11-18): a test whose app is in the library is built on it, writing only its
// data and small edits for anything the app lacks (/api/fit-app), so apps never have to be written out again whole
const BUILD_ON_LIBRARY = true;

// The app this page copies, from Praxa's app library (only apps kept apart from their data): a quick model works out
// which app the page copies and finds it there. Null when the app isn't in the library (or it can't be read)
async function libraryBase(item: RawQuestion, mode: PageMode): Promise<LibraryBase | null> {
  if (!BUILD_ON_LIBRARY) return null;
  try {
    // A game-like page is built differently from a desk app, so each is only built on its own kind
    const apps = (await reusableApps()).filter((a) => (a.game ?? '') === (mode.game ?? ''));
    if (!apps.length) return null;
    const res = await aiFetch('/api/match-environment', {
      title: item.title,
      prompt: item.prompt,
      brief: item.appHtml,
      environments: apps.slice(0, 60).map(({ id, name, product, summary, features }) => ({ id, app: name, name, product, summary, features })),
    });
    if (!res.ok) return null;
    const { id } = (await res.json()) as { id?: string };
    const match = id ? apps.find((a) => a.id === id) : undefined;
    const html = match ? await reusableAppCode(match) : null;
    return match && html ? { ...match, html } : null;
  } catch {
    return null;
  }
}

// A library app by its id, with its code
async function libraryAppById(id: string): Promise<LibraryBase | null> {
  try {
    const app = (await reusableApps()).find((a) => a.id === id);
    const html = app ? await reusableAppCode(app) : null;
    return app && html ? { ...app, html } : null;
  } catch {
    return null;
  }
}

// Who a simulation is built for, and whether the build waits until it's been sent for review (the Praxa team's own
// builds do, so the review queue shows it straight away)
interface PageOwner {
  owner?: string;
  awaitSave?: boolean;
}

type DataOut = { data?: string; missing?: string[]; testCases?: RawQuestion['testCases']; callouts?: AppCallout[]; planted?: string[] };
type ExtendOut = { edits?: AppEdit[]; added?: string[]; dataShape?: string; stateShape?: string; data?: string };
export interface FittedApp {
  // The app's code with the edits made (the library app itself when there were none)
  app: string;
  data: Record<string, unknown>;
  edits: AppEdit[];
  added: string[];
  dataShape: string;
  stateShape: string;
  testCases?: RawQuestion['testCases'];
  callouts?: AppCallout[];
  planted: string[];
}

type FitAsk = { mode: 'task' | 'jobsim'; title: string; prompt: string; brief: string; testCases?: RawQuestion['testCases']; research?: string };

// A library app fitted to a task or a job simulation's day. The AI writes the data from the app's manifest alone (its
// features, data and state formats, sample data and control names), never reading its code; code checks the data's shape
// for free first. Only when the work needs something the app lacks is the code sent, to add just that (the extend
// stage), and what's added becomes the app's next version. Then the page is opened and clicked through; problems go
// back once. Null when nothing usable came back
export async function fitLibraryApp(base: LibraryBase, ask: FitAsk, step: Progress = () => {}): Promise<FittedApp | null> {
  const manifest = { name: base.name, refs: refsOf(base.html), features: base.features, data: base.data, state: base.state, sample: base.sample };
  const post = async <T,>(body: Record<string, unknown>): Promise<T | null> => {
    const res = await aiFetch('/api/fit-app', { ...ask, ...body }).catch(() => null);
    return res?.ok ? ((await res.json().catch(() => null)) as T | null) : null;
  };

  // The data, from the manifest. Data that isn't the app's shape goes back once, before anything else is spent on it
  const writeData = async (fix?: { problems: string[]; data?: string }) => {
    let out = await post<DataOut>({ stage: 'data', app: manifest, ...(fix && { fix }) });
    let data = parseData(out?.data);
    let problems = data ? shapeProblems(data, base.sample) : ["data isn't a JSON object in the app's data format."];
    if (out && problems.length) {
      step(`the data didn't match the app's format, so writing it again…`);
      const again = await post<DataOut>({ stage: 'data', app: manifest, fix: { problems: [...(fix?.problems ?? []), ...problems], data: out.data } });
      const againData = parseData(again?.data);
      const againProblems = againData ? shapeProblems(againData, base.sample) : ['no data'];
      if (againData && againProblems.length <= problems.length) [out, data, problems] = [again, againData, againProblems];
    }
    return out && data ? { out, data } : null;
  };

  // What the work needs that the app lacks, added to its code: edits that don't apply go back once
  const extend = async (missing: string[], data: Record<string, unknown>, fix?: { problems: string[]; edits?: AppEdit[] }) => {
    let tryFix = fix;
    for (let round = 0; round < 2; round++) {
      const out = await post<ExtendOut>({ stage: 'extend', app: { ...manifest, html: base.html }, missing, data: JSON.stringify(data), ...(tryFix && { fix: tryFix }) });
      if (!out) return null;
      const edits = (out.edits ?? []).filter((e) => e && typeof e.find === 'string');
      const applied = applyEdits(base.html, edits);
      if (!applied.problems.length && edits.length)
        return { app: applied.html, edits, added: (out.added ?? []).map((a) => String(a).trim()).filter(Boolean), dataShape: out.dataShape?.trim() || base.data, stateShape: out.stateShape?.trim() || base.state, data: parseData(out.data) ?? data };
      tryFix = { problems: applied.problems.length ? applied.problems : ['No edits came back, but the features are missing.'], edits };
    }
    return null;
  };

  let usable: FittedApp | null = null;
  let fixData: { problems: string[]; data?: string } | undefined;
  let fixEdits: { problems: string[]; edits?: AppEdit[] } | undefined;
  let written: { out: DataOut; data: Record<string, unknown> } | null = null;
  for (let round = 0; round < 2; round++) {
    if (!written || fixData) {
      written = await writeData(fixData);
      if (!written) return usable;
    }
    const { out } = written;
    let fitted: FittedApp = {
      app: base.html,
      data: written.data,
      edits: [],
      added: [],
      dataShape: base.data,
      stateShape: base.state,
      testCases: out.testCases,
      callouts: out.callouts,
      planted: (out.planted ?? []).map(String),
    };
    const missing = (out.missing ?? []).map((m) => String(m).trim()).filter(Boolean);
    if (missing.length) {
      step(`adding what ${base.name} doesn't have yet: ${missing.slice(0, 3).join('; ')}…`);
      const ext = await extend(missing, written.data, fixEdits);
      if (ext) fitted = { ...fitted, app: ext.app, data: ext.data, edits: ext.edits, added: ext.added, dataShape: ext.dataShape, stateShape: ext.stateShape };
    }
    step('clicking every control to see it works…');
    const problems = await appProblems({ type: 'app', title: ask.title, prompt: ask.prompt, appHtml: withData(fitted.app, fitted.data), testCases: ask.mode === 'task' ? fitted.testCases : [] } as RawQuestion);
    // A page that loads is usable even with a dead control or two; one with none is done
    const loads = !problems.some((p) => !/^The control|^Clicking/.test(p));
    if (loads) usable = fitted;
    if (!problems.length || round === 1) return usable;
    step(`fixing ${problems.length === 1 ? 'a problem' : `${problems.length} problems`} with the app…`);
    // Problems in what was added go back to the edits (the code is cached from the first time); the rest to the data
    fixData = fitted.edits.length ? undefined : { problems, data: JSON.stringify(fitted.data) };
    fixEdits = fitted.edits.length ? { problems, edits: fitted.edits } : undefined;
    if (fixEdits) written = { ...written, data: fitted.data };
  }
  return usable;
}

async function buildAppPage(item: RawQuestion, research?: string, mode: PageMode = {}, step: Progress = () => {}, who: PageOwner = {}): Promise<RawQuestion> {
  let design: string | undefined;
  const request = (fix?: { html: string; problems: string[] }, quick?: boolean) =>
    aiFetch('/api/build-app', {
      title: item.title,
      prompt: item.prompt,
      brief: item.appHtml,
      testCases: item.testCases ?? [],
      research,
      ...mode,
      ...(design && { design }),
      ...(quick && { quick }),
      ...(fix && { fix }),
    }).then(async (res) => (res.ok ? ((await res.json()) as BuiltPage) : null));
  try {
    // The app in the library is built on: only this task's data is written, plus small edits for what it lacks. An app
    // that isn't there yet is designed from nothing, kept apart from its data so the next test can build on it
    // The plan named the app: its library app when it has one, none when the company chose to have it built
    const planned = item.plannedApp;
    let base: LibraryBase | null = null;
    if (planned?.appId) base = await libraryAppById(planned.appId);
    else if (!planned) {
      step("looking for this app in Praxa's app library…");
      base = await libraryBase(item, mode);
    }
    if (base) {
      step(`using “${base.name}” (version ${base.version}) from the library: writing this task's data and adding anything it lacks…`);
      const fitted = await fitLibraryApp(base, { mode: 'task', title: item.title ?? '', prompt: item.prompt ?? '', brief: item.appHtml ?? '', testCases: item.testCases, research }, step);
      if (fitted) {
        const final: RawQuestion = {
          ...item,
          appHtml: withData(fitted.app, fitted.data),
          testCases: fitted.testCases?.length ? fitted.testCases : item.testCases,
          callouts: fitted.callouts ?? [],
          libraryApp: { id: base.id, version: base.version },
        };
        const saving = remember(final, { base, mode, owner: who.owner, app: fitted.app, data: fitted.data, added: fitted.added, dataShape: fitted.dataShape, stateShape: fitted.stateShape });
        if (who.awaitSave) {
          step('sending it to the Praxa team for review…');
          await saving;
        }
        return final;
      }
      step("that didn't come back, so designing a new page instead…");
    }
    // A game page is built with more thought; if that doesn't come back (it can run out of time), once more at the usual effort
    step('designing it: the look, layout, screens and data…');
    design = await designAppPage(item, research, mode);
    step('writing the page from the design…');
    let page = await request().catch(() => null);
    if (!page && mode.game) {
      step("the first try didn't come back in time, so writing it again more quickly…");
      page = await request(undefined, true);
    }
    if (!page?.appHtml) return item;
    const catalog = page.catalog;
    // The data written apart from the app, when it was (otherwise it's in the page's code, as pages were before)
    let data = parseData(page.data);
    let app = page.appHtml;
    const built: RawQuestion = { ...item, appHtml: data ? withData(app, data) : app, testCases: page.testCases?.length ? page.testCases : item.testCases, callouts: page.callouts ?? [] };
    let final = built;
    step('clicking every control to see it works…');
    const problems = await appProblems(built);
    if (problems.length) {
      step(`fixing ${problems.length === 1 ? 'a problem' : `${problems.length} problems`} found clicking through it…`);
      const fixed = await request({ html: built.appHtml!, problems }).catch(() => null);
      if (fixed?.appHtml) {
        const fixedData = data ? parseData(fixed.data) ?? data : parseData(fixed.data);
        const html = fixedData ? withData(fixed.appHtml, fixedData) : fixed.appHtml;
        const repaired: RawQuestion = { ...built, appHtml: html, testCases: fixed.testCases?.length ? fixed.testCases : built.testCases, callouts: fixed.callouts?.length ? fixed.callouts : built.callouts };
        // The repair is kept unless it made things worse: it must still load
        step('loading the fixed page to make sure it still works…');
        const after = await probeApp(repaired.appHtml!, checksOf(repaired));
        if (after.state) {
          final = repaired;
          app = fixed.appHtml;
          data = fixedData;
        }
      }
    }
    const saving = remember(final, { catalog, mode, owner: who.owner, ...(data && { app, data, dataShape: catalog?.dataShape, stateShape: catalog?.stateShape }) });
    if (who.awaitSave) {
      step('sending it to the Praxa team for review…');
      await saving;
    }
    return final;
  } catch {
    return item;
  }
}

// A page that loads is sent to the Praxa team for review: a new app for the library, or the next version of the app it
// was built on, with the features it added. An app kept apart from its data goes to the library as the app alone (the
// test's data stays with the submission, for the team to try it). Never holds up the test
interface Remembered {
  catalog?: BuiltPage['catalog'];
  base?: LibraryBase | null;
  mode: PageMode;
  owner?: string;
  // The app without the test's data, and that data, when they're kept apart
  app?: string;
  data?: Record<string, unknown>;
  // Built on the library: what its edits added
  added?: string[];
  dataShape?: string;
  stateShape?: string;
}
async function remember(page: RawQuestion, r: Remembered): Promise<void> {
  const { catalog, base, mode, owner = 'Praxa' } = r;
  if (base) void markEnvironmentUsed(base.id);
  if (!page.appHtml) return;
  const list = (l?: string[]) => (l ?? []).map((f) => String(f).trim().slice(0, 120)).filter(Boolean).slice(0, 80);
  // Built on the library: only what its edits added is new. Nothing added, nothing to review
  const added = base ? list(r.added ?? catalog?.added).filter((f) => !base.features.some((b) => b.toLowerCase() === f.toLowerCase())) : list(catalog?.features);
  if (base && !added.length) return;
  if (!base && !catalog?.app?.trim()) return;
  const probe = await probeApp(page.appHtml, checksOf(page));
  if (!probe.state) return;
  const features = base ? [...base.features, ...added] : added;
  await submitEnvironment(
    {
      ...(base && { envId: base.id, baseVersion: base.version }),
      app: (base?.name ?? catalog?.app ?? '').trim().slice(0, 80),
      name: String(base?.name ?? catalog?.name ?? catalog?.app).trim().slice(0, 100),
      product: String(base?.product ?? catalog?.product ?? '').trim().slice(0, 60) || 'Simulation',
      summary: String(base?.summary ?? catalog?.summary ?? '').trim().slice(0, 600),
      features,
      added,
      builtFor: String(page.title ?? '').trim().slice(0, 140),
      owner: owner.slice(0, 100),
      ...(mode.sector && { sector: mode.sector }),
      ...(mode.game && { game: mode.game }),
      ...(r.app && r.data && { dataDriven: true, data: String(r.dataShape ?? '').slice(0, 6000), state: String(r.stateShape ?? '').slice(0, 4000) }),
    },
    r.app && r.data ? { html: r.app, callouts: page.callouts ?? [], data: JSON.stringify(r.data) } : { html: page.appHtml, callouts: page.callouts ?? [] }
  );
}

/**
 * The Praxa team builds an app for the library from the admin panel: the app and the features it should have. Built
 * on the library's copy when the app is there already (so it gains those features), otherwise designed from nothing,
 * then sent for review like any other. Returns an error to show, or null once it's waiting for review
 */
export async function buildLibrarySimulation(app: string, wants: string, progress: (stage: string) => void): Promise<string | null> {
  const brief = `A working copy of ${app}, as people in the job use it day to day: its real layout, navigation and look. It must include, fully working: ${wants.trim() || 'its main screens and everyday features'}. Fill it with realistic sample records for every screen. The state object records what the user creates and changes.`;
  const item: RawQuestion = { type: 'app', title: app, prompt: `Explore ${app} and use its features.`, appHtml: brief, testCases: [], points: 1, timeLimitMinutes: 10 } as RawQuestion;
  const built = await buildAppPage(item, undefined, {}, progress, { owner: 'Praxa', awaitSave: true });
  return built.appHtml && built.appHtml !== brief ? null : "The simulation couldn't be built. Try again, or describe it differently.";
}

/**
 * Two versions of an app built on the same library version: once one is approved, the other would lose its features if
 * approved as it is. This copies its added features onto the library's latest version, and the submission becomes that
 * merged page, built on the latest version, for the Praxa team to try again before approving
 */
export async function mergeSubmission(sub: EnvironmentSubmission, progress: (stage: string) => void): Promise<string | null> {
  const env = (await loadEnvironments()).find((e) => e.id === sub.envId);
  if (!env) return 'The app it was built on is no longer in the library.';
  progress('Loading both versions…');
  const [latest, other] = await Promise.all([loadEnvironmentPage(env.id), loadSubmissionPage(sub.id)]);
  if (!latest?.html || !other?.html) return "Couldn't load both versions.";
  progress(`Copying ${sub.added.length === 1 ? 'its new feature' : `its ${sub.added.length} new features`} onto version ${env.version}… (a few minutes)`);
  try {
    const res = await aiFetch('/api/build-app', {
      title: env.app,
      prompt: `Explore ${env.app} and use its features.`,
      brief: `${env.app}, with every feature it has now plus these: ${sub.added.join('; ')}.`,
      testCases: [],
      quick: true,
      base: { html: latest.html, name: env.name, features: env.features },
      merge: { html: other.html, features: sub.added },
    });
    if (!res.ok) return "The merge didn't come back. Try again.";
    const page = (await res.json()) as BuiltPage;
    if (!page.appHtml) return "The merge didn't come back. Try again.";
    progress('Loading the merged page to check it works…');
    // A data-driven app is tried with the data of the test it was built for
    const tryData = env.dataDriven ? parseData(other.data) : undefined;
    const probe = await probeApp(tryData ? withData(page.appHtml, tryData) : page.appHtml, []);
    if (!probe.state) return `The merged page didn't load${probe.problem ? `: ${probe.problem}` : ''}. Try again.`;
    await updateSubmission(
      sub,
      { baseVersion: env.version, features: page.catalog?.features?.length ? page.catalog.features : [...env.features, ...sub.added] },
      { html: splitData(page.appHtml).app, callouts: page.callouts ?? latest.callouts ?? [], ...(other.data && { data: other.data }) }
    );
    return null;
  } catch {
    return "The merge didn't come back. Try again.";
  }
}

// How an app page is doing right now, told to the chat so a reported problem is fixed in the right place
async function pageHealth(html: string | undefined): Promise<string> {
  if (!html?.trim()) return 'its page is empty, so it shows a blank screen';
  const probe = await probeApp(html, [], 6000);
  return probe.state ? 'loads and works' : `doesn't load: ${probe.problem ?? 'no reason given'}`;
}

// A page that won't load counts more than a dead control when comparing before and after a change
const breaks = (problems: string[]) => problems.filter((p) => !/^The control|^Clicking/.test(p)).length;

// A change to an app page as small edits to its code (a colour, a fix, a button), never a rewrite: what Praxa finds
// clicking through the page goes with the change, so a reported problem is fixed at its cause. The edits are applied
// and the page tried again; edits that don't apply, or a page left worse than before, go back once. Null when nothing
// usable came back; unchanged when the AI said the change can't be made in this page
async function editPage(
  html: string,
  change: string,
  about: { title: string; prompt?: string; checks?: RawQuestion['testCases'] },
  step: Progress = () => {}
): Promise<{ html: string; done: string; unchanged?: boolean } | null> {
  const probe = (page: string) => appProblems({ type: 'app', title: about.title, prompt: about.prompt ?? '', appHtml: page, testCases: about.checks ?? [] } as RawQuestion);
  step('trying the page to see what the change touches…');
  const before = await probe(html);
  let fix: { problems: string[]; edits?: AppEdit[] } | undefined;
  for (let round = 0; round < 2; round++) {
    const res = await aiFetch('/api/edit-app', { title: about.title, change, html, problems: before, prompt: about.prompt, checks: about.checks ?? [], ...(fix && { fix }) }).catch(() => null);
    if (!res?.ok) return null;
    const out = (await res.json().catch(() => ({}))) as { edits?: AppEdit[]; done?: string };
    const edits = (out.edits ?? []).filter((e) => e && typeof e.find === 'string');
    if (!edits.length) return out.done?.trim() ? { html, done: out.done.trim(), unchanged: true } : null;
    const applied = applyEdits(html, edits);
    if (applied.problems.length) {
      step("an edit didn't fit the page, so trying again…");
      fix = { problems: applied.problems, edits };
      continue;
    }
    step('loading the changed page and clicking through it…');
    const after = await probe(applied.html);
    if (breaks(after) > breaks(before) || after.length > before.length) {
      step('the change broke something, so fixing it…');
      fix = { problems: after.filter((p) => !before.includes(p)), edits };
      continue;
    }
    return { html: applied.html, done: out.done?.trim() || 'Changed.' };
  }
  return null;
}

// An app page changed as the company asked: the builder gets the page as it is and the change, and the result is
// checked like a new page (it must load and its checks must still fail at the start). Null when it doesn't hold up
async function editAppPage(question: Question, change: string, taskPrompt: string, research?: string, mode: PageMode = {}, step: Progress = () => {}, who: PageOwner = {}): Promise<Question | null> {
  const checks = question.testCases.map(({ description, input, expectedOutput }) => ({ description, input, expectedOutput }));
  const prompt = taskPrompt?.trim() || question.prompt;
  try {
    // Small edits first: most changes (a colour, a fix, a button) need nothing more, and the page isn't written again
    const quick = await editPage(question.appHtml ?? '', change, { title: question.title, prompt, checks: checks as RawQuestion['testCases'] }, step);
    if (quick && !quick.unchanged) {
      step('checking its tasks can still be marked…');
      const checked = await checkQuestion({ type: 'app', title: question.title, prompt, appHtml: quick.html, testCases: checks as RawQuestion['testCases'], callouts: question.callouts, points: question.weight, timeLimitMinutes: question.timeLimitMinutes });
      if (checked) return { ...question, prompt, appHtml: checked.appHtml, contextData: checked.contextData, starterCode: checked.starterCode, testCases: checked.testCases, callouts: checked.callouts };
    }
    // The app's library copy, so the features this change adds go to the Praxa team as its next version
    const base = await libraryBase({ type: 'app', title: question.title, prompt, appHtml: change } as RawQuestion, mode).catch(() => null);
    step('rewriting the page with your change…');
    const res = await aiFetch('/api/build-app', { title: question.title, prompt, brief: change, testCases: checks, research, ...mode, quick: true, edit: { html: question.appHtml ?? '', change }, ...(base && { libraryFeatures: base.features }) });
    if (!res.ok) return null;
    const page = (await res.json()) as BuiltPage;
    if (!page.appHtml) return null;
    // The page's data, apart from the app when it was sent that way (kept as it was if none came back)
    const before = splitData(question.appHtml ?? '');
    const data = parseData(page.data) ?? (before.data as Record<string, unknown> | undefined);
    const appHtml = data ? withData(splitData(page.appHtml).app, data) : page.appHtml;
    step('loading the changed page and checking its tasks can still be marked…');
    const checked = await checkQuestion({ type: 'app', title: question.title, prompt, appHtml, testCases: (page.testCases?.length ? page.testCases : checks) as RawQuestion['testCases'], callouts: page.callouts?.length ? page.callouts : question.callouts, points: question.weight, timeLimitMinutes: question.timeLimitMinutes });
    if (checked)
      void remember({ type: 'app', title: question.title, prompt, appHtml: checked.appHtml, testCases: checked.testCases, callouts: checked.callouts } as RawQuestion, {
        catalog: page.catalog,
        base,
        mode,
        owner: who.owner,
        ...(data && { app: splitData(checked.appHtml ?? '').app, data, dataShape: page.catalog?.dataShape, stateShape: page.catalog?.stateShape }),
      });
    // Same question, so the questions about it stay joined to it
    return checked ? { ...question, prompt, appHtml: checked.appHtml, contextData: checked.contextData, starterCode: checked.starterCode, testCases: checked.testCases, callouts: checked.callouts } : null;
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
    ...(probe.audit?.labels ?? []),
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

// Simulation pages are built side by side; the status names the page whose step just started, and once one is done,
// how many are built and which are still going
function pageTracker(titles: string[], progress: Progress) {
  const name = (title: string) => `“${title.trim() || 'The simulation'}”`;
  const current = new Map<number, string>();
  let built = 0;
  const show = (i: number) => {
    const line = `${name(titles[i])}: ${current.get(i)}`;
    progress(titles.length > 1 && built ? `${built} of ${titles.length} simulations built. ${line}` : line);
  };
  return {
    step: (i: number) => (what: string) => (current.set(i, what), show(i)),
    done: (i: number) => {
      built++;
      current.delete(i);
      const next = current.keys().next();
      if (!next.done) show(next.value);
    },
  };
}

// The AI's new version of the draft made into a real test: kept questions carried over, new ones checked. New app
// pages are built first, side by side, each in its own request
async function buildDraft(raw: RawTest, previous: AssessmentTest | undefined, ctx: ChatContext, research?: string, progress: Progress = () => {}, list?: Checklist): Promise<{ test?: AssessmentTest; dropped: number }> {
  // A new question in a type the company hasn't picked is left out, whatever the AI sent; kept ones stay until rewritten
  const items = (raw.questions ?? []).filter((item) => item.keep || allowedStyle(ctx, item.type));
  // In a conversation an app comes with the spec for its page, not the page: anything that isn't HTML is built first
  const isSpec = (item: RawQuestion) => !item.keep && item.type === 'app' && !!item.appHtml?.trim() && !/<(html|body|div|script|style|svg)\b/i.test(item.appHtml);
  const pages = items.filter(isSpec);
  const fresh = items.filter((item) => !item.keep).length;
  if (!pages.length) list?.drop(['build']);
  const checking = `Checking ${fresh === 1 ? 'the new question' : `all ${fresh} questions`} and their answers…`;
  // The other questions are checked while the pages are built, so both steps run at once
  if (pages.length && list?.has('build')) list.start(fresh > pages.length ? ['build', 'check'] : ['build'], `Building ${pages.length === 1 ? 'the simulation' : `${pages.length} simulations side by side`}…`);
  else if (fresh) (list ? list.start('check', checking) : progress(checking));
  const tracker = pageTracker(pages.map((item) => String(item.title ?? '')), progress);
  const built = await Promise.all(
    items.map(async (item) => {
      if (item.keep) return previous?.questions.find((q) => q.id === item.keep) ?? null;
      if (!isSpec(item)) return checkQuestion(item);
      const i = pages.indexOf(item);
      const step = tracker.step(i);
      const ready = await buildAppPage(item, research, pageModeOf(ctx), step, { owner: ctx.business?.name || 'Praxa' });
      step('checking its tasks start unfinished, so they can be marked…');
      const checked = await checkQuestion(ready);
      tracker.done(i);
      return checked;
    })
  );
  const questions = linkTasks(items, built);
  const dropped = items.length - questions.length;
  if (!questions.length) return { dropped };
  const total = questions.reduce((sum, q) => sum + q.weight, 0) || 1;
  // The job simulation's setting, from the plan: the company the candidate works at, their role, their first morning
  // there and the people they work with. A change in the chat keeps the setting the test already has
  const people = ((raw.people ?? []) as unknown[]).map((p) => parseContact(String(p))).filter((c): c is NonNullable<typeof c> => !!c).slice(0, 16);
  const inbox = ((raw.inbox ?? []) as unknown[]).map((m) => parseMessage(String(m))).filter((m) => m.subject && m.body).slice(0, 10);
  const scenario: AssessmentTest['scenario'] = String(raw.setting ?? '').trim()
    ? { company: String(raw.company ?? '').trim() || ctx.business?.name || 'the company', role: ctx.jobTitle || String(raw.role ?? '').trim() || String(raw.title ?? 'the role'), brief: String(raw.setting).trim(), ...(people.length && { people }), ...(inbox.length && { inbox }) }
    : previous?.scenario;
  // The level the company picked wins over the AI's
  const difficulty = ctx.level ?? (TEST_DIFFICULTIES.includes(raw.difficulty) ? (raw.difficulty as TestDifficulty) : previous?.difficulty ?? 'Junior');
  return {
    dropped,
    test: {
      id: '',
      title: String(raw.title ?? previous?.title ?? 'New test').trim(),
      // In the company's sector: a category from another sector falls back to the sector's own
      category: categoriesFor(companySector(ctx.business)).includes(raw.category) ? (raw.category as SkillCategory) : previous?.category ?? categoriesFor(companySector(ctx.business))[0] ?? 'Consulting',
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

const NOT_CONFIGURED = "Praxa's AI isn't available on this site: it runs on Praxa's own server (npm run dev or npm start) with an ANTHROPIC_API_KEY.";

// One turn: the company's message in, Praxa's reply and the draft's new version out
// Posts to one of Praxa's AI endpoints; a failure comes back as the reason, 'not-configured' when there's no AI
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
    return { body: {}, failure: "Couldn't reach Praxa's AI. Check your connection and try again." };
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

// software: what an app item (or a job simulation's part) is done in; appId: the app library's app it uses, '' to build it
type PlanItem = { ref: string; taskRef: string; type: string; title: string; brief: string; points: number; minutes: number; software?: string; softwareKind?: string; appId?: string };

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

// The test's plan as the company sees it before anything is written: what the hire needs and every question, case and
// task in order, each with its type and what it tests
export interface TestPlan extends Record<string, any> {
  title: string;
  description: string;
  difficulty: string;
  blueprint: string[];
  items: PlanItem[];
}
export type { PlanItem };

// The plan step: asks Praxa for the plan (researching the job first when it can have simulations), and keeps only items
// in the allowed styles, each with its own ref
async function fetchPlan(ctx: ChatContext, request: Record<string, unknown>) {
  // The app library, so app items (and a job simulation's software) use an app that's already built when one fits
  const game = pageModeOf(ctx).game;
  const apps = await reusableApps()
    .then((list) => list.filter((a) => (a.game ?? '') === (ctx.kind === 'simulation' ? '' : game ?? '')).map(({ id, name, product, summary }) => ({ id, name, product, summary })))
    .catch(() => []);
  const planned = await post('/api/plan-test', { ...request, apps });
  if (planned.failure) return { body: planned.body, failure: planned.failure };
  const body = planned.body;
  const plan = body.plan as TestPlan | undefined;
  if (ctx.kind === 'simulation') return { body, plan: plan && jobSimPlan(plan) };
  // Only items in the picked styles, and no questions about a case or task that's gone
  if (plan?.items?.length) {
    const allowed = plan.items.filter((item) => allowedStyle(ctx, item.type));
    plan.items = allowed.filter((item) => !item.taskRef || allowed.some((other) => other.ref === item.taskRef) || !plan.items.some((other) => other.ref === item.taskRef));
  }
  if (!plan?.items?.length) return { body, plan: undefined };
  // Every item needs its own ref to be written and matched up; blank or repeated ones get one
  const seen = new Set<string>();
  plan.items = plan.items.map((item, i) => {
    const ref = item.ref?.trim() && !seen.has(item.ref.trim()) ? item.ref.trim() : `i${i + 1}`;
    seen.add(ref);
    return { ...item, ref };
  });
  // In the order they're written and met: each case or task with its questions
  const order = sectionsOf(plan.items).flat();
  plan.items = order.map((ref) => plan.items.find((item) => item.ref === ref)!).filter(Boolean);
  return { body, plan };
}

// A job simulation's plan is always its five timed parts, in order, at their set minutes (src/data/modules/jobSimKit.ts),
// whatever the planner sent
const JOB_SIM_PARTS: [string, string, number][] = [
  ['briefing', 'Briefing', 2],
  ['core', 'Core task', 12],
  ['curveball', 'Curveball', 6],
  ['juggling', 'Juggling and judgement', 10],
  ['report', 'Report back', 7],
];
function jobSimPlan(plan: TestPlan): TestPlan {
  const items = JOB_SIM_PARTS.map(([ref, title, minutes]) => {
    const given = plan.items?.find((item) => item.ref === ref) ?? plan.items?.find((item) => String(item.title ?? '').toLowerCase().startsWith(title.toLowerCase()));
    return { ref, taskRef: '', type: 'part', title: given?.title?.trim() || title, brief: given?.brief ?? '', points: 0, minutes, software: given?.software ?? '', softwareKind: given?.softwareKind ?? '', appId: given?.appId ?? '' };
  });
  return { ...plan, items };
}
export const isJobSimPlan = (plan?: TestPlan) => !!plan?.items?.length && plan.items.every((item) => item.type === 'part');

// A job simulation written as one desktop day (server/writeJobSim.ts) in two requests, each well inside the host's time
// limit: the world (the cast and everything pre-loaded, with its planted issues), then the script against it (emails,
// replies, briefs, marks). It's checked here (jobSimBuild.ts); problems go back once to the half they're in. Checks still
// broken after that are left out if the day stands without them. A change to a day already written rewrites both halves
async function writeJobSimDay(
  request: Record<string, unknown>,
  ctx: ChatContext,
  extra: { plan?: TestPlan; research?: string; current?: AssessmentTest; change?: string },
  list: Checklist
): Promise<{ test?: AssessmentTest; reply?: string; failure?: string }> {
  const brief = ((request.messages ?? []) as ChatMessage[]).filter((m) => m.role === 'user').map((m) => m.text).join('\n\n');
  let current: Record<string, unknown> | undefined;
  try {
    current = extra.current?.jobSimSource ? JSON.parse(extra.current.jobSimSource) : undefined;
  } catch {
    current = undefined;
  }
  const base = {
    job: request.job,
    jobTitle: request.jobTitle,
    company: request.company,
    background: request.background,
    brief,
    research: extra.research,
    ...(extra.plan && { plan: extra.plan }),
    ...(extra.change && { change: extra.change }),
  };
  // A day without the AI's own copy (made before it was kept) is sent as the desktop it became
  const before = extra.current && (current ?? { desktop: extra.current.questions[0]?.desktop, checks: extra.current.questions[0]?.testCases.map((tc) => [tc.description, tc.input, tc.rubric ?? tc.expectedOutput]) });

  // The app library, so the day can happen in the job's own software (a help desk, a CRM) filled with its data
  const library = await reusableApps()
    .then((apps) => apps.filter((a) => !a.game))
    .catch(() => [] as ReusableApp[]);
  let apps: DayApp[] = [];
  let initial: Record<string, Record<string, unknown>> = {};
  const writeWorld = async (problems?: string[], was?: unknown) => {
    const out = await post('/api/write-job-sim', {
      ...base,
      stage: 'world',
      library: library.map(({ id, name, product, summary, features }) => ({ id, name, product, summary, features })),
      ...((was ?? before) && { current: was ?? before }),
      ...(problems && { problems, change: undefined }),
    });
    if (out.failure) return { failure: out.failure };
    // Then what's on the computer, written to that setting (two steps: one reply shape for both is too big for Claude)
    const setting = out.body as Record<string, unknown>;
    const desk = await post('/api/write-job-sim', {
      ...base,
      stage: 'desk',
      world: setting,
      ...((was ?? before) && { current: was ?? before }),
      ...(problems && { problems, change: undefined }),
    });
    if (desk.failure) return { failure: desk.failure };
    return { world: { ...setting, ...(desk.body as Record<string, unknown>) } };
  };
  const writeScript = async (world: Record<string, unknown>, problems?: string[], was?: unknown) => {
    const out = await post('/api/write-job-sim', {
      ...base,
      stage: 'script',
      world,
      appsInDay: apps.map((a) => ({ id: a.id, label: a.label, state: a.state ?? '', data: JSON.stringify(a.data), planted: a.planted ?? [] })),
      ...((was ?? before) && { current: was ?? before }),
      ...(problems && { problems, change: undefined }),
    });
    return out.failure ? { failure: out.failure } : { script: out.body as Record<string, unknown> };
  };
  // The world's apps put on the desktop: library apps fitted to the day, and software the library lacks built for it
  // (kept apart from its data, and sent to the library). Each is opened once out of sight to see how it starts
  const fitApps = async (world: Record<string, unknown>) => {
    const raw = world as unknown as RawJobSim;
    // The apps the plan named (the company may have changed them), and any others the world put on the desktop
    const fromPlan = (extra.plan?.items ?? [])
      .filter((i) => i.appId?.trim() && library.some((l) => l.id === i.appId))
      .map((i) => raw.libraryApps?.find((a) => a.id === i.appId) ?? { id: i.appId!, label: library.find((l) => l.id === i.appId)!.name, brief: i.brief });
    const wanted = [...fromPlan, ...(raw.libraryApps ?? []).filter((a) => library.some((l) => l.id === a.id))]
      .filter((a, i, all) => all.findIndex((b) => b.id === a.id) === i)
      .slice(0, 2);
    const day = `${raw.role} at ${raw.company}. ${raw.scenario ?? ''}\nThe people: ${(raw.contacts ?? []).map((c) => `${c.name} (${c.role}, ${c.email})`).join('; ')}\nPlanted in the day: ${((world.planted as string[]) ?? []).join('; ')}`;
    const out: DayApp[] = [];
    for (const want of wanted) {
      const app = library.find((l) => l.id === want.id)!;
      list.start('apps', `Filling ${want.label || app.name} from Praxa's app library with the day's data…`);
      const html = await reusableAppCode(app);
      if (!html) continue;
      const libBase = { ...app, html };
      const fitted = await fitLibraryApp(libBase, { mode: 'jobsim', title: String(raw.day ?? raw.role ?? ''), prompt: day, brief: want.brief, research: extra.research });
      if (!fitted) continue;
      out.push({ id: app.id, label: want.label || app.name, envId: app.id, version: app.version, data: fitted.data, html: fitted.app, state: fitted.stateShape, planted: fitted.planted });
      if (fitted.edits.length)
        void remember({ type: 'app', title: `${raw.role} at ${raw.company}`, prompt: day, appHtml: withData(fitted.app, fitted.data) } as RawQuestion, {
          base: libBase,
          mode: {},
          owner: ctx.business?.name,
          app: fitted.app,
          data: fitted.data,
          added: fitted.added,
          dataShape: fitted.dataShape,
          stateShape: fitted.stateShape,
        });
    }
    const n = raw.newApp;
    if (n?.app?.trim() && n.brief?.trim() && out.length < 2) {
      list.start('apps', `Building ${n.label || n.app} for the day (it isn't in Praxa's app library yet, so it's added there after)… a few minutes`);
      const brief = `A working copy of ${n.app} (${n.product}), called ${n.label || n.app}, as people in this job use it day to day: its real layout, navigation and look, with the screens the day needs. What it must hold for the day:\n${n.brief}`;
      const built = await buildAppPage({ type: 'app', title: n.label || n.app, prompt: day, appHtml: brief, testCases: [], points: 1, timeLimitMinutes: 40 } as RawQuestion, extra.research, {}, () => {}, { owner: ctx.business?.name });
      if (built.appHtml && built.appHtml !== brief) {
        const { app, data } = splitData(built.appHtml);
        const id = (n.label || n.app).toLowerCase().replace(/[^a-z0-9]+/g, '') || 'app';
        out.push({ id: out.some((a) => a.id === id) ? `${id}2` : id, label: n.label || n.app, envId: '', version: 0, data: (data as Record<string, unknown>) ?? {}, html: app, planted: [] });
      }
    }
    // How each app starts: what the script marks against, and what no check may already match
    const starts: Record<string, Record<string, unknown>> = {};
    for (const a of out) {
      const probe = await probeApp(withData(a.html!, a.data), []);
      if (probe.state) starts[a.id] = probe.state;
      if (!a.state) a.state = `Starts as: ${JSON.stringify(probe.state ?? {}).slice(0, 3000)}`;
    }
    apps = out;
    initial = starts;
  };

  list.start('world', extra.change ? 'Rewriting the people and the data with your change…' : 'Writing the world: the people, and the data, pages and files already on the computer, with the issues planted in them…');
  const w = await writeWorld();
  if (w.failure) return { failure: w.failure };
  let world = w.world!;
  await fitApps(world);
  list.start('script', 'Writing the day against that data: the emails, who writes back, each part’s brief and how it’s marked…');
  const sc = await writeScript(world);
  if (sc.failure) return { failure: sc.failure };
  let raw = { ...world, ...sc.script, customApps: apps } as unknown as RawJobSim;

  list.start('check', 'Working out every answer from the data and checking each part can be marked…');
  let made = assembleJobSim(raw, ctx.business, false, initial);
  if (made.problems.length) {
    list.start('check', `Fixing ${made.problems.length === 1 ? 'one problem' : `${made.problems.length} problems`} Praxa's checks found…`);
    // Problems with the computer itself (no data for an app) are the world's; the rest are the script's
    const inWorld = made.problems.some((p) => /^(The desktop has no work app|apps has )/.test(p));
    let fixedWorld = world;
    const kept = { apps, initial };
    if (inWorld) {
      const again = await writeWorld(made.problems, raw);
      if (again.world) {
        fixedWorld = again.world;
        await fitApps(fixedWorld);
      }
    }
    const again = await writeScript(fixedWorld, made.problems, raw);
    if (again.script) {
      const next = { ...fixedWorld, ...again.script, customApps: apps } as unknown as RawJobSim;
      const remade = assembleJobSim(next, ctx.business, false, initial);
      // The fix is kept when it passes, or when the first version can't stand even with its broken checks left out
      if (!remade.problems.length || !assembleJobSim(raw, ctx.business, true, kept.initial).test) {
        raw = next;
        world = fixedWorld;
        made = remade;
      }
    }
    // The first version stands: so do its apps
    if (raw.customApps !== apps) {
      apps = kept.apps;
      initial = kept.initial;
    }
    if (made.problems.length) made = assembleJobSim(raw, ctx.business, true, initial);
  }
  list.finish();
  if (!made.test) {
    console.warn('[job sim] still failing its checks after the fix:', made.problems);
    const why = made.problems.slice(0, 3).map((p) => p.replace(/^:?\s*/, '')).join(' ');
    return { failure: `Praxa couldn't make a job simulation that passes its checks${why ? ` (${why})` : ''}. Try Build again.` };
  }
  const plan = extra.plan;
  const test = finishJobSim(made.test, raw, ctx.business, ctx.level, plan?.difficulty ?? extra.current?.difficulty);
  return {
    test: extra.current ? { ...test, title: extra.current.title, difficulty: extra.current.difficulty } : { ...test, ...(plan?.blueprint?.length && { blueprint: blueprintOf(plan.blueprint) }) },
    reply: String(raw.reply ?? '').trim() || undefined,
  };
}
const JOB_SIM_STEPS: [string, string][] = [
  ['world', 'Write the people, data and pages for the day'],
  ['apps', "Put the job's software on the desktop, from Praxa's app library"],
  ['script', 'Write the emails, briefs and marks against that data'],
  ['check', 'Work out every answer and check each part is marked'],
];

// The checklist's steps from the plan on: writing, then the simulations when there are any, then checking
const writeSteps = (sims: boolean): [string, string][] => [
  ['write', 'Write the questions, scenarios and figures'],
  ...(sims
    ? ([
        ['spec', 'Check the simulations against the real job'],
        ['build', 'Design and build the simulations'],
      ] as [string, string][])
    : []),
  ['check', 'Check every question, answer and mark'],
];

// Writes a plan out in full: every section at once, each simulation's spec checked, then every interactive page built
// and tried out
async function writePlan(plan: TestPlan, research: string | undefined, messages: ChatMessage[], ctx: ChatContext, request: Record<string, unknown>, progress: Progress, list: Checklist) {
  const sections = sectionsOf(plan.items);
  if (!plan.items.some((item) => item.type === 'app')) list.drop(['spec', 'build']);
  list.start('write', `Planned ${plan.items.length} ${plan.items.length === 1 ? 'question' : 'questions'}. Writing ${sections.length === 1 ? 'the section' : `${sections.length} sections side by side`}…`);
  const brief = messages.filter((m) => m.role === 'user').map((m) => m.text).join('\n\n');
  let done = 0;
  const written = await inBatches(sections, 6, async (write) => {
    const part = await post('/api/write-questions', { ...request, brief, plan, write, research });
    if (++done < sections.length) progress(`Written ${done} of ${sections.length} sections. Still writing the rest…`);
    // Matched to the plan by position; the plan's ref and taskRef win, since the writer sometimes drops them
    return ((part.body.questions ?? []) as RawQuestion[]).slice(0, write.length).map((q, i) => {
      const item = plan.items.find((it) => it.ref === write[i]);
      // An app item's software, as planned (and maybe changed by the company): the library app to use, or build new
      const planned = item?.type === 'app' && (item.software?.trim() || item.appId?.trim()) ? { plannedApp: { software: item.software ?? '', appId: item.appId ?? '' } } : {};
      return { ...q, ref: write[i], taskRef: item?.taskRef ?? q.taskRef ?? '', ...planned };
    });
  });
  let questions = written.flat();
  const apps = questions.filter((q) => q.type === 'app').length;
  // Each simulation's spec is checked against how the job is really done and fixed before its page is built; a check
  // that fails leaves the spec as written
  if (!apps) list.drop(['spec', 'build']);
  if (apps) {
    list.start('spec', `Checking ${apps === 1 ? 'the simulation' : `${apps} simulations`} against how the job is really done, as someone in the job would…`);
    questions = await Promise.all(
      questions.map(async (q) => {
        if (q.type !== 'app' || !q.appHtml) return q;
        const related = questions.filter((other) => other.taskRef && other.taskRef === q.ref).map((other) => ({ title: other.title, prompt: other.prompt }));
        const checked = await post('/api/check-spec', {
          job: ctx.job,
          jobTitle: ctx.jobTitle,
          brief,
          research,
          setting: plan.setting,
          question: { title: q.title, prompt: q.prompt, appHtml: q.appHtml, testCases: q.testCases ?? [] },
          related,
        });
        const out = checked.body as { problems?: string[]; prompt?: string; appHtml?: string; testCases?: RawQuestion['testCases'] };
        if (checked.failure || !out.problems?.length || !out.appHtml) return q;
        return { ...q, prompt: out.prompt || q.prompt, appHtml: out.appHtml, testCases: out.testCases?.length ? out.testCases : q.testCases };
      })
    );
  }
  const built = await buildDraft({ ...plan, skillsTested: plan.blueprint, questions }, undefined, ctx, research, progress, list);
  list.finish();
  const missing = plan.items.length - questions.length;
  return { ...built, dropped: built.dropped + missing };
}

// A new test in stages, each request short enough for the host's time limit: the plan (what the hire needs and an
// outline), then every section written at once, then every interactive page built and tried out
async function planAndWrite(state: ChatState, messages: ChatMessage[], ctx: ChatContext, request: Record<string, unknown>, progress: Progress, before: [string, string][] = []) {
  // The server researches the job on the web first when the test can have simulations and nothing's been researched yet
  const sims = !stylesOf(ctx).length || stylesOf(ctx).includes('app');
  const researching = !state.research && sims;
  const role = ctx.jobTitle?.trim();
  const list = checklist(progress, [
    ...before,
    ...(researching ? [['research', `Analyse the ${role ? `${role} role` : 'job'}`] as [string, string]] : []),
    ['plan', 'Plan what the hire needs and the sections'],
    ...writeSteps(sims),
  ]);
  list.start(
    researching ? 'research' : 'plan',
    researching
      ? `Analysing the ${role ? `${role} role` : 'job'}, then planning the test…`
      : 'Planning the test: what this hire needs and the sections…'
  );
  const { body, plan, failure } = await fetchPlan(ctx, request);
  if (failure) return { failure };
  if (researching) list.start('plan', 'Planning the test: what this hire needs and the sections…');
  if (!plan) return { body };
  const research: string | undefined = body.research ?? state.research;
  if (isJobSimPlan(plan)) {
    list.drop(['write', 'spec', 'build', 'check']);
    list.add(JOB_SIM_STEPS);
    const day = await writeJobSimDay(request, ctx, { plan, research }, list);
    if (day.failure && !day.test) return { failure: day.failure };
    return { body: { ...body, test: undefined }, built: { test: day.test, dropped: 0 } };
  }
  const built = await writePlan(plan, research, messages, ctx, request, progress, list);
  return { body: { ...body, test: undefined }, built };
}

// What every request about the test carries: the conversation, the job and company, the draft, and what it may use
function chatRequest(state: ChatState, messages: ChatMessage[], ctx: ChatContext) {
  const library = libraryFor(ctx.tests, ctx.business);
  return {
    messages: messages.map(({ role, text }) => ({ role, text })),
    job: ctx.job,
    // The company hiring: the simulation is set there, so the candidate works for it from the first question
    company: ctx.business && { name: ctx.business.name, industry: ctx.business.industry, sector: ctx.business.sector, description: ctx.business.description, website: ctx.business.websiteUrl, headquarters: ctx.business.headquarters },
    jobTitle: ctx.jobTitle,
    background: ctx.background,
    kind: ctx.kind ?? 'simulation',
    draft: state.draft && draftForModel(state.draft),
    existing: state.existing.map((s) => s.test.id),
    wantExisting: ctx.wantExisting,
    styles: stylesOf(ctx),
    questionCount: ctx.kind === 'standalone' ? 1 : ctx.questionCount,
    questionRange: ctx.kind === 'standalone' ? undefined : ctx.questionRange,
    timeLimit: ctx.timeLimit,
    viewing: ctx.viewing,
    // One level ticked is the test's level; several are a spread to pitch across
    difficulty: ctx.levels.length === 1 ? ctx.level : undefined,
    difficulties: ctx.levels.length > 1 ? ctx.levels : undefined,
    library: library.map((t) => ({ id: t.id, title: t.title, category: t.category, difficulty: t.difficulty, skills: t.skillsTested, roles: t.roles ?? [], description: t.description })),
    roles: rolesFor(companySector(ctx.business)),
    categories: categoriesFor(companySector(ctx.business)),
    levels: TEST_DIFFICULTIES,
    tables: Object.values(MOCK_DATABASE).map((t) => ({ name: t.name, columns: t.columns })),
    research: state.research,
    researchedFor: state.researchedFor,
  };
}

// The first half of a new test: Praxa plans it from the conversation and lists every question for the company to
// look over, and each message after that changes the plan, until the company presses Build (buildPlan). Nothing is
// written yet
export async function proposePlan(
  state: ChatState,
  text: string,
  ctx: ChatContext,
  current?: TestPlan,
  progress: (stage: string) => void = () => {}
): Promise<{ state: ChatState; plan?: TestPlan; failure?: string }> {
  const messages: ChatMessage[] = [...state.messages, { role: 'user', text }];
  const request = { ...chatRequest(state, messages, ctx), ...(current && { currentPlan: current }) };
  const role = ctx.jobTitle?.trim();
  const sims = !stylesOf(ctx).length || stylesOf(ctx).includes('app');
  progress(
    !state.research && sims
      ? `Analysing the ${role ? `${role} role` : 'job'}, then planning every question…`
      : current
      ? 'Changing the plan…'
      : 'Planning every question: what this hire needs and how each part tests it…'
  );
  const { body, plan, failure } = await fetchPlan(ctx, request);
  if (failure) {
    const text =
      failure === 'no-credit'
        ? "You've used up your AI credit. Top up to carry on: this conversation is kept, and I'll pick up right here."
        : failure === 'not-configured'
        ? NOT_CONFIGURED
        : failure;
    return { state: { ...state, messages: [...messages, { role: 'assistant', text, failed: true, ...(failure === 'no-credit' && { needsCredit: true }) }] }, failure };
  }
  const reply = String(body.reply ?? '').trim() || (plan ? "Here's the plan." : 'Tell me a little more about the role.');
  return {
    state: { ...state, messages: [...messages, { role: 'assistant', text: reply }], research: body.research ?? state.research, researchedFor: body.researchedFor ?? state.researchedFor },
    plan: plan ?? current,
  };
}

// The second half: the plan the company agreed written out in full, its simulations built, and every question checked
export async function buildPlan(state: ChatState, plan: TestPlan, ctx: ChatContext, progress: Progress = () => {}): Promise<ChatState> {
  const messages: ChatMessage[] = [...state.messages, { role: 'user', text: 'Build it.' }];
  const request = chatRequest(state, messages, ctx);
  if (isJobSimPlan(plan)) {
    const list = checklist(progress, [['plan', 'Plan the five parts of the day with you'], ...JOB_SIM_STEPS]);
    const day = await writeJobSimDay(request, ctx, { plan, research: state.research }, list);
    return {
      ...state,
      messages: [...messages, { role: 'assistant', text: day.test ? 'Built.' : day.failure ?? "Praxa couldn't build that. Try again.", ...(!day.test && { failed: true }) }],
      draft: day.test,
    };
  }
  const list = checklist(progress, [['plan', 'Plan every question with you'], ...writeSteps(plan.items.some((item) => item.type === 'app'))]);
  const built = await writePlan(plan, state.research, messages, ctx, request, progress, list);
  const note = built.dropped
    ? built.test
      ? `${built.dropped} ${built.dropped === 1 ? 'question' : 'questions'} failed Praxa's checks and ${built.dropped === 1 ? 'was' : 'were'} left out.`
      : "None of the questions passed Praxa's checks, so nothing was made. Try Build again."
    : undefined;
  return {
    ...state,
    messages: [...messages, { role: 'assistant', text: built.test ? 'Built.' : "Praxa couldn't build that. Try again.", ...(note && { note }), ...(!built.test && { failed: true }) }],
    draft: built.test,
  };
}

// One turn: the company's message in, Praxa's reply and the draft's new version out. A first draft (or a rewrite of
// most of it) is planned and written in stages; other changes are made in one go
// --- Changes to a written draft: planned first, made only when the company presses Build

// What the change-plan step agreed, shown as a checklist under the reply with a Build button
export interface ChangeProposal {
  kind: 'jobsim' | 'test';
  steps: string[];
  // The company's message it answers
  request: string;
  // Job simulations: edits to apps on the desktop, and the change to the day when the day itself changes
  edits?: { app: string; change: string }[];
  rewrite?: string;
  // Pressed: the checklist stays, without its button
  built?: boolean;
}

// The day in short, for the change-plan step and for app edits
function daySummary(draft: AssessmentTest): string {
  const desk = draft.questions[0].desktop!;
  return [
    `${desk.user.role} at ${desk.company}; the candidate is ${desk.user.name}. Title: ${draft.title}`,
    `Parts: ${(desk.phases ?? []).map((p) => `${p.title} (${p.minutes} min): ${p.brief}`).join(' | ')}`,
    `Emails in the inbox: ${desk.inbox.map((m) => `"${m.subject}" from ${m.from}`).join('; ')}`,
    desk.pages?.length ? `Web pages: ${desk.pages.map((p) => `${p.title} (${p.url})`).join('; ')}` : '',
    desk.files?.length ? `Files: ${desk.files.map((f) => f.name).join(', ')}` : '',
    `Apps on the taskbar: ${desk.apps.join(', ')}`,
  ]
    .filter(Boolean)
    .join('\n');
}

// A message about a draft already written: a cheap first step reads it with a summary of the draft and how each app
// loads right now, and either answers or plans the change as a checklist. Nothing changes until Build
async function proposeChange(state: ChatState, messages: ChatMessage[], ctx: ChatContext, progress: Progress): Promise<ChatState> {
  const draft = state.draft!;
  const jobsim = isJobSimDraft(draft);
  const list = checklist(progress, [['read', 'Read your message and check the apps']]);
  list.start('read', 'Reading your message and trying each app…');
  const apps = jobsim
    ? await Promise.all((draft.questions[0].desktop!.customApps ?? []).map(async (a) => ({ id: a.id, label: a.label, health: await pageHealth(a.html) })))
    : await Promise.all(draft.questions.filter((q) => q.type === 'app').map(async (q) => ({ id: q.id, label: q.contextData || q.title, health: await pageHealth(q.appHtml) })));
  const summary = jobsim
    ? daySummary(draft)
    : [`${draft.title} (${draft.difficulty}): ${draft.description ?? ''}`, ...draft.questions.map((q, i) => `${i + 1}. [${q.type}, id ${q.id}] ${q.title}: ${q.prompt.slice(0, 160).replace(/\s+/g, ' ')}`)].join('\n');
  const res = await post('/api/change-plan', {
    kind: jobsim ? 'jobsim' : 'test',
    messages: messages.map(({ role, text, proposal }) => ({ role, text: proposal ? `${text}\nPlanned${proposal.built ? ' and built' : ', not built yet'}: ${proposal.steps.join('; ')}` : text })),
    draft: summary,
    apps,
    ...(ctx.viewing && { viewing: ctx.viewing.label }),
  });
  list.finish();
  if (res.failure) {
    if (res.failure === 'no-credit')
      return { ...state, messages: [...messages, { role: 'assistant', text: "You've used up your AI credit. Top up to carry on: your test and this conversation are kept, and I'll pick up right here.", failed: true, needsCredit: true }] };
    return { ...state, messages: [...messages, { role: 'assistant', text: res.failure === 'not-configured' ? NOT_CONFIGURED : res.failure, failed: true }] };
  }
  const out = res.body as { action?: string; reply?: string; steps?: string[]; edits?: { app: string; change: string }[]; rewrite?: string };
  const reply = String(out.reply ?? '').trim();
  const steps = (out.steps ?? []).map((x) => String(x).trim()).filter(Boolean).slice(0, 8);
  const edits = jobsim ? (out.edits ?? []).filter((e) => apps.some((a) => a.id === e.app) && e.change?.trim()) : [];
  const rewrite = jobsim ? String(out.rewrite ?? '').trim() : '';
  const change = out.action === 'change' && steps.length && (!jobsim || edits.length || rewrite);
  if (!change) return { ...state, messages: [...messages, { role: 'assistant', text: reply || "I couldn't tell what to change. Say which part, and what you'd like different." }] };
  const proposal: ChangeProposal = { kind: jobsim ? 'jobsim' : 'test', steps, request: messages[messages.length - 1].text, ...(edits.length && { edits }), ...(rewrite && { rewrite }) };
  return { ...state, messages: [...messages, { role: 'assistant', text: reply || 'Here’s what I’ll change. Press Build to make it.', proposal }] };
}

// Edits to apps on a job simulation's desktop, each as small edits to its page and tried out after
async function editDayApps(draft: AssessmentTest, edits: { app: string; change: string }[], list: Checklist): Promise<{ test?: AssessmentTest; done: string[]; failed: string[] }> {
  const q = draft.questions[0];
  const desk = q.desktop!;
  const apps = desk.customApps ?? [];
  const day = daySummary(draft);
  let next = apps;
  const done: string[] = [];
  const failed: string[] = [];
  for (const e of edits) {
    const app = next.find((a) => a.id === e.app);
    if (!app) continue;
    list.start(`edit-${e.app}`, `Changing ${app.label}…`);
    const changed = app.html ? await editPage(app.html, e.change, { title: app.label, prompt: day }, (line) => list.start(`edit-${e.app}`, `${app.label}: ${line}`)) : null;
    if (!changed || changed.unchanged) {
      failed.push(changed?.unchanged ? `${app.label}: ${changed.done}` : app.label);
      continue;
    }
    done.push(changed.done);
    // An edited app is its own page from now on, no longer the library's version as it was
    next = next.map((a) => (a.id === e.app ? { ...a, html: changed.html } : a));
  }
  return { ...(next !== apps && { test: { ...draft, questions: [{ ...q, desktop: { ...desk, customApps: next } }, ...draft.questions.slice(1)] } }), done, failed };
}

// Build pressed on the latest proposal: the change is made as planned, and the reply says what was done
export async function buildChange(state: ChatState, ctx: ChatContext, progress: Progress = () => {}): Promise<ChatState> {
  const at = state.messages.map((m) => !!m.proposal && !m.proposal.built).lastIndexOf(true);
  const proposal = state.messages[at]?.proposal;
  if (!proposal || !state.draft) return state;
  const pressed: ChatMessage[] = state.messages.map((m, i) => (i === at ? { ...m, proposal: { ...proposal, built: true } } : m));
  const agreed = `${proposal.request}\n\nMake exactly these changes, nothing else:\n${proposal.steps.map((x) => `- ${x}`).join('\n')}`;
  if (proposal.kind === 'test') {
    // The test's writer makes it, from the company's message and the agreed checklist
    const after = await runTurn({ ...state, messages: pressed }, 'Build', ctx, progress, agreed);
    return after;
  }
  const messages: ChatMessage[] = [...pressed, { role: 'user', text: 'Build' }];
  let draft = state.draft;
  const notes: string[] = [];
  const said: string[] = [];
  if (proposal.rewrite) {
    const request = chatRequest(state, [...pressed, { role: 'user', text: agreed }], ctx);
    const day = await writeJobSimDay(request, ctx, { research: state.research, current: draft, change: `${proposal.rewrite}\n\nThe agreed changes:\n${proposal.steps.map((x) => `- ${x}`).join('\n')}` }, checklist(progress, JOB_SIM_STEPS));
    if (day.failure) return { ...state, messages: [...messages, { role: 'assistant', text: day.failure, failed: true }] };
    if (day.test) draft = day.test;
    if (day.reply) said.push(day.reply);
  }
  if (proposal.edits?.length) {
    const list = checklist(progress, proposal.edits.map((e) => [`edit-${e.app}`, `Change ${draft.questions[0].desktop?.customApps?.find((a) => a.id === e.app)?.label ?? e.app}`] as [string, string]));
    const out = await editDayApps(draft, proposal.edits, list);
    list.finish();
    if (out.test) draft = out.test;
    said.push(...out.done);
    if (out.failed.length) notes.push(`Not changed: ${out.failed.join('; ')}. Try describing it differently, or say which part of the app.`);
  }
  const changed = draft !== state.draft;
  return {
    ...state,
    draft,
    messages: [...messages, { role: 'assistant', text: changed ? said.join(' ') || 'Done: the changes are made.' : "That didn't change anything.", ...(notes.length && { note: notes.join(' ') }), ...(!changed && { failed: true }) }],
  };
}

// The company's message: on a written draft it's planned first (an answer, or a checklist with Build); without one the
// test is planned and written
export async function sendChat(state: ChatState, text: string, ctx: ChatContext, progress: Progress = () => {}): Promise<ChatState> {
  if (state.draft) return proposeChange(state, [...state.messages, { role: 'user', text }], ctx, progress);
  return runTurn(state, text, ctx, progress);
}

// A turn of the test's writer: the message shown as the company's (text), and what the writer is asked (ask: the
// agreed checklist when Build was pressed)
async function runTurn(state: ChatState, text: string, ctx: ChatContext, progress: Progress = () => {}, ask = text): Promise<ChatState> {
  const messages: ChatMessage[] = [...state.messages, { role: 'user', text }];
  const library = libraryFor(ctx.tests, ctx.business);
  const asked: ChatMessage[] = [...state.messages, { role: 'user', text: ask }];
  const request = chatRequest(state, asked, ctx);

  let body: Record<string, any> = {};
  let failure: string | undefined;
  let staged: { test?: AssessmentTest; dropped: number } | undefined;
  // The checklist for a change to a draft (a new draft has its own, in planAndWrite)
  let list: Checklist | undefined;
  if (!state.draft) {
    const out = await planAndWrite(state, messages, ctx, request, progress);
    ({ failure } = out);
    body = out.body ?? {};
    staged = out.built;
  } else if (isJobSimDraft(state.draft)) {
    // A job simulation's changes go through buildChange; this is only reached by older callers
    const day = await writeJobSimDay(request, ctx, { research: state.research, current: state.draft, change: ask }, checklist(progress, JOB_SIM_STEPS));
    if (day.failure) failure = day.failure;
    else {
      body = { reply: day.reply ?? 'Changed.' };
      staged = { test: day.test, dropped: 0 };
    }
  } else {
    // What each app page does when loaded right now, so a problem the company reports is fixed where it is
    const pages = state.draft.questions.filter((q) => q.type === 'app');
    if (pages.length) (request as Record<string, unknown>).appHealth = await Promise.all(pages.map(async (q) => ({ id: q.id, title: q.contextData || q.title, health: await pageHealth(q.appHtml) })));
    const read: [string, string] = ['read', 'Read your message and work out the changes'];
    list = checklist(progress, [read]);
    list.start('read', 'Reading your message and working out the changes…');
    ({ body, failure } = await post('/api/test-chat', request));
    // Praxa judged the change too big to make in one go: plan and write the test afresh
    if (!failure && body.lookUp === 'REPLAN') {
      list = undefined;
      const out = await planAndWrite(state, asked, ctx, request, progress, [read]);
      ({ failure } = out);
      body = out.body ?? {};
      staged = out.built;
    }
  }

  if (failure) {
    // Without the AI, the first turn still gets a start from Praxa's own tests and questions
    if (failure === 'not-configured' && !state.draft) {
      const brief = [ctx.job, ...messages.filter((m) => m.role === 'user').map((m) => m.text)].filter(Boolean).join('\n\n');
      const draft = assembleFromBank({ prompt: brief, wantNewTest: true, wantExisting: ctx.wantExisting, questionCount: ctx.questionCount ?? ctx.questionRange?.[1] ?? 10, styles: ctx.styles.length ? ctx.styles : QUESTION_TYPES, level: ctx.level ?? 'Junior', title: ctx.jobTitle }, library, ctx.tests, ctx.business);
      const existing = ctx.wantExisting ? matchExisting(brief, library) : [];
      const reply = draft
        ? `I can't write new questions here, so I've put a draft together from the best-fitting questions in Praxa's tests. ${NOT_CONFIGURED} You can still edit every question in the builder.`
        : `${NOT_CONFIGURED} Praxa's own question bank doesn't cover this yet either, so write the test in the builder for now.`;
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
  let note: string | undefined = body.note;
  const appEditsOn = (test?: AssessmentTest) => ((body.appEdits ?? []) as { id: string; change: string; taskPrompt: string }[]).filter((e) => e.change?.trim() && test?.questions.some((q) => q.id === e.id && q.type === 'app'));
  if (list && !staged) {
    const edits = appEditsOn(draft);
    const newPages = ((body.test?.questions ?? []) as RawQuestion[]).some((q) => !q.keep && q.type === 'app');
    list.add([
      ...(newPages ? [['build', 'Design and build the new simulations'] as [string, string]] : []),
      ...(body.test ? [['check', 'Check every new question, answer and mark'] as [string, string]] : []),
      ...(edits.length ? [['edit', `Change ${edits.length === 1 ? 'the simulation' : 'the simulations'} and try ${edits.length === 1 ? 'it' : 'them'} out`] as [string, string]] : []),
    ]);
  }
  if (staged || body.test) {
    const built = staged ?? (await buildDraft(body.test, state.draft, ctx, body.research ?? state.research, progress, list));
    if (built.test) draft = built.test;
    if (built.dropped) note = built.test ? `${built.dropped} ${built.dropped === 1 ? 'question' : 'questions'} failed Praxa's checks and ${built.dropped === 1 ? 'was' : 'were'} left out.` : "None of the new questions passed Praxa's checks, so the draft wasn't changed. Try asking again.";
  }
  // Changes to app pages in the draft, made in place by the page builder, side by side
  const edits = appEditsOn(draft);
  if (draft && edits.length) {
    list?.start('edit', 'Changing the simulation…');
    const research = body.research ?? state.research;
    const targets = edits.map((e) => draft!.questions.find((q) => q.id === e.id)!);
    const tracker = pageTracker(targets.map((q) => q.title), progress);
    const changed = await Promise.all(
      edits.map(async (e, i) => {
        const out = await editAppPage(targets[i], e.change, e.taskPrompt, research, pageModeOf(ctx), tracker.step(i), { owner: ctx.business?.name || 'Praxa' });
        tracker.done(i);
        return out;
      })
    );
    const failed = changed.filter((q) => !q).length;
    draft = withChangedQuestions(draft, changed.filter((q): q is Question => !!q));
    if (failed) note = [note, `${failed === 1 ? "One app change didn't" : `${failed} app changes didn't`} pass Praxa's checks, so ${failed === 1 ? 'that app was' : 'those apps were'} left as ${failed === 1 ? 'it was' : 'they were'}. Try asking again.`].filter(Boolean).join(' ');
  }
  list?.finish();
  return {
    messages: [...messages, { role: 'assistant', text: String(body.reply ?? '').trim() || 'Done.', ...(note && { note }) }],
    draft,
    existing: ctx.wantExisting ? (body.existing ? picked : state.existing) : [],
    research: body.research ?? state.research,
    researchedFor: body.researchedFor ?? state.researchedFor,
  };
}
