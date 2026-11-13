import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUp, Check, ChevronDown, ChevronUp, Library, Loader2, Maximize2, Minus, Square, Wand2, X } from 'lucide-react';
import { AssessmentTest, Business, JobPosting, QuestionType, TEST_DIFFICULTIES, TestDifficulty, TestDraft, TestKind, levelName } from '../types';
import { QUESTION_STYLES } from '../lib/questionTypes';
import { DraftPreview, Dropdown, draftProblems, finaliseDraft } from './DraftPreview';
import { BuildingCard } from './BuildingCard';
import { jobBrief } from '../lib/testGeneration';
import { BuildStep, ChatState, TestPlan, buildPlan, sendChat } from '../lib/testChat';
import { kindLabel } from './KindChoice';
import { versionTitle } from '../lib/testLevels';
import { aiSimulationsFor } from '../lib/sectors';
import { Credit, estimateTest, loadCredit, pounds, setAiPurpose, startAiRun, stopAiRun } from '../lib/aiRequest';
import { CreditsDialog } from './CreditsDialog';
import { CreditMeter, EXAMPLE_CREDIT } from './CreditMeter';

interface TestGeneratorProps {
  // The job the tests are for; without one, Vetter only writes a test
  job?: JobPosting;
  // Who the new test belongs to: a company, or the Vetter library when undefined
  business?: Business;
  tests: AssessmentTest[];
  onOpenTest: (testId: string) => void;
  // Saves the new test as it is and returns its id
  // Saves the new test, told which kind it is; returns its id
  onSaveTest: (test: AssessmentTest, kind: TestKind) => string;
  onAddToJob: (jobId: string, testIds: string[]) => void;
  // A saved test to change by asking Vetter: the chat starts from it, and saving updates it in place
  editing?: AssessmentTest;
  // Saves the changed test over the one being edited
  onUpdateTest: (test: AssessmentTest) => void;
  // Opens the new test in the builder first, with the library tests to add once it's saved
  // with the conversation so far, so saving a draft from the builder keeps it
  onEditDraft: (draft: AssessmentTest, alsoAdd: string[], record: TestDraft) => void;
  // Keeps the test and the conversation to carry on later
  // Resolves true once it's saved
  onSaveDraft: (record: TestDraft) => Promise<boolean>;
  // A saved draft to carry on with
  resume?: TestDraft;
  // A first message, filled in ready to send or change
  seed?: string;
  // Sends the first message straight away, so Vetter starts building as the chat opens
  autoSend?: boolean;
  // What the company already settled in the home chat (its messages and picks), passed to Vetter so it isn't asked again
  background?: string;
  // A skills test or a job simulation; new ones are job simulations
  kind?: TestKind;
  // The plan agreed in the home chat, built as soon as the builder opens, with that chat's state (its messages and the
  // research on the job)
  plan?: TestPlan;
  planChat?: ChatState;
  onClose: () => void;
}

// How many questions a company can ask for, counting the questions about a case or task
// The number of questions a company can ask for, and where the up and down buttons start from an empty box
const MIN_COUNT = 1;
const MAX_COUNT = 45;
const START_COUNT = 10;
// Timers a company can pick, in minutes
const TIMERS = [10, 15, 20, 30, 45, 60, 90, 120];
const minutesOf = (test: AssessmentTest) => test.questions.reduce((sum, q) => sum + q.timeLimitMinutes, 0);
const countOf = (test: AssessmentTest) => test.questions.filter((q) => q.type !== 'case').length;

// The question types a company can pick from, in the order shown: answer styles, then hands-on tasks
const PICKABLE: QuestionType[] = ['choice', 'multi', 'text', 'written', 'order', 'match', 'email', 'assistant', 'case', 'sheet', 'database', 'app', 'code', 'sql'];
const PICKABLE_STYLES = PICKABLE.map((type) => QUESTION_STYLES.find((s) => s.type === type)!).filter(Boolean);

// Build a test by talking to Vetter: describe the job, get a draft, then ask for changes until it's right
export const TestGenerator: React.FC<TestGeneratorProps> = ({ job, business, tests, onOpenTest, onSaveTest, onAddToJob, editing, onUpdateTest, onEditDraft, onSaveDraft, resume, seed, autoSend, background: backgroundGiven, kind: kindAsked, plan, planChat, onClose }) => {
  const background = backgroundGiven ?? resume?.background;
  // The saved test being changed, opened from its job or from a draft of changes to it
  const [original] = useState(() => editing ?? (resume?.editsTestId ? tests.find((t) => t.id === resume.editsTestId) : undefined));
  // What the AI writes is a job simulation (a day in the life at the company) or training for the team; a skills test
  // already made stays one
  const kindOf = (t: AssessmentTest): TestKind =>
    t.purpose === 'training' ? 'training' : t.questions.length === 1 && t.questions[0].type === 'app' ? 'standalone' : t.scenario ? 'simulation' : 'test';
  // New ones are job simulation tests (or training); a standalone simulation made before is still edited as one
  const [kind] = useState<TestKind>(() => kindAsked ?? resume?.kind ?? (original ? kindOf(original) : resume ? kindOf(resume.test) : 'simulation'));
  // Training is marked as such when it's saved, so it's kept off leaderboards and profiles and goes to the team
  const withPurpose = (t: AssessmentTest): AssessmentTest => (kind === 'training' ? { ...t, purpose: 'training', timeLimit: 'none' } : t);
  const greetingFor = (k?: TestKind) =>
    k === 'training'
      ? `Which app or way of working should your team learn? Tell me who it's for, what they need to be able to do and anything they get wrong today. I'll build a copy of the app set at ${business?.name ?? 'your company'}, with guided tasks from easy to tricky and worked answers at the end, and you can send it to your team.`
      : k === 'standalone'
      ? `Tell me about the role and I'll build one advanced simulation of the job at ${business?.name ?? 'your company'}: the place, the equipment and the people, with 8 to 15 tasks that test each part of the job one by one. It's marked on how many tasks they get right.`
      : k === 'simulation'
      ? job
        ? `I've read the ${job.title} job description. I'll set the simulation at ${business?.name ?? 'your company'}: a working day with colleagues, emails to handle and the tools they'd use. Tell me what matters most, or ask me to write a first draft.`
        : `Tell me about the role: what they do day to day, who they work with, the tools they use and the level. I'll write a working day at ${business?.name ?? 'your company'} for them to do, and we'll refine it together.`
      : null;
  const greeting = original
    ? `This is "${original.title}" as it stands. Tell me what to change: harder or easier, shorter, a different tool, rewrite question 3, add a case study. Keep asking until it's right, then save the changes.`
    : job
    ? `I've read the ${job.title} job description. Tell me what matters most in this hire, or just ask me to write a first draft and we'll refine it together.`
    : `Tell me about the role or the test you want: what the person does day to day, the tools they use and the level. I'll write a first draft and we'll refine it together.`;
  const [chat, setChat] = useState<ChatState>(() =>
    resume
      ? {
          messages: resume.messages?.length ? resume.messages : [{ role: 'assistant', text: greeting }],
          draft: resume.test,
          existing: (resume.existing ?? []).flatMap(({ testId, reason }) => {
            const test = tests.find((t) => t.id === testId);
            return test ? [{ test, reason }] : [];
          }),
          research: resume.research,
          researchedFor: resume.researchedFor,
        }
      : plan && planChat
      ? {
          messages: [{ role: 'assistant', text: `Building "${plan.title}" from the plan you agreed: ${plan.items.filter((i) => i.type !== 'case').length} questions. Watch it come together on the right.` }],
          existing: [],
          research: planChat.research,
          researchedFor: planChat.researchedFor,
        }
      : { messages: [{ role: 'assistant', text: greetingFor(kind) ?? greeting }], existing: [], ...(original && { draft: original }) }
  );
  // What's been saved, to tell whether closing loses anything
  const [savedChat] = useState(() => chat);
  const [draftId] = useState(() => resume?.id ?? `draft-${Date.now()}`);
  const [input, setInput] = useState(seed ?? '');
  const [working, setWorking] = useState(false);
  // What Vetter is doing right now, as it reports it
  const [stage, setStage] = useState('');
  // The build's major steps, ticked off as it goes
  const [steps, setSteps] = useState<BuildStep[]>([]);
  const [savingDraft, setSavingDraft] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [keepNew, setKeepNew] = useState(true);
  // On phones the chat and the draft share the screen as tabs
  const [pane, setPane] = useState<'chat' | 'draft'>('chat');
  const [flash, setFlash] = useState(false);
  // The question types Vetter may use, how many questions and the levels, each ticked in its own list; whatever's left
  // unticked Vetter decides (a saved test being changed starts from what it has)
  const [styles, setStyles] = useState<QuestionType[]>(() =>
    resume?.styles?.length ? resume.styles : original ? PICKABLE.filter((t) => original.questions.some((q) => q.type === t)) : []
  );
  // How many questions: a number typed or stepped, or empty for Vetter to decide (drafts from when several could be
  // ticked keep a single pick)
  const [questionCount, setQuestionCount] = useState<number | undefined>(
    () => resume?.questionCount ?? (resume?.questionCounts?.length === 1 ? resume.questionCounts[0] : undefined) ?? (resume ? undefined : original ? countOf(original) : undefined)
  );
  const clampCount = (n: number) => Math.min(MAX_COUNT, Math.max(MIN_COUNT, Math.round(n)));
  const stepCount = (by: number) => setQuestionCount((n) => (n === undefined ? START_COUNT : clampCount(n + by)));
  const [levels, setLevels] = useState<TestDifficulty[]>(() =>
    resume?.difficulties ??
      (resume?.difficulty
        ? [resume.difficulty]
        : original
        ? [original.difficulty]
        : resume?.test.difficulty
        ? [resume.test.difficulty]
        : TEST_DIFFICULTIES.includes(plan?.difficulty as TestDifficulty)
        ? [plan!.difficulty as TestDifficulty]
        : [])
  );
  // The levels in order; the highest names the test
  const pickedLevels = TEST_DIFFICULTIES.filter((d) => levels.includes(d));
  const difficulty = pickedLevels[pickedLevels.length - 1];
  // The timer: minutes, no limit, or undefined for Vetter to size it from the questions
  const [timeLimit, setTimeLimitState] = useState<number | 'none' | undefined>(() => resume?.timeLimit ?? resume?.test.timeLimit ?? original?.timeLimit);
  // A timer is the test's own setting, not something to write: it's put on the draft straight away
  const setTimeLimit = (limit: number | 'none' | undefined) => {
    setTimeLimitState(limit);
    setChat((c) => (c.draft ? { ...c, draft: { ...c.draft, timeLimit: limit } } : c));
  };
  const timerOptions = [...new Set([...TIMERS, ...(typeof timeLimit === 'number' ? [timeLimit] : [])])].sort((a, b) => a - b);
  // The company's AI credit, shown in the header; nothing shows when the site doesn't charge
  const [credit, setCredit] = useState<Credit | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  useEffect(() => {
    loadCredit().then((c) => !c.error && setCredit(c));
  }, []);
  // Closing the top-up: with credit added after running out, the message that ran out is sent again
  const closeTopUp = () => {
    setTopUpOpen(false);
    const last = chat.messages[chat.messages.length - 1];
    const asked = chat.messages[chat.messages.length - 2];
    if (last?.needsCredit && asked?.role === 'user' && (credit?.balance ?? 0) > 0) send(asked.text, true);
  };

  // The app task open on the right, which the next message is about unless the company sets it aside
  const [viewing, setViewing] = useState<{ id: string; label: string; app: string } | undefined>();
  const [aboutWhole, setAboutWhole] = useState(false);
  const focus = !aboutWhole && viewing && chat.draft?.questions.some((q) => q.id === viewing.id) ? viewing : undefined;
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const draft = chat.draft;
  const started = chat.messages.some((m) => m.role === 'user');
  // Outside tech, app simulations come from Vetter's library rather than the company's AI
  const pickable = aiSimulationsFor(business) ? PICKABLE : PICKABLE.filter((t) => t !== 'app');
  const pickableStyles = PICKABLE_STYLES.filter((s) => pickable.includes(s.type));
  const toggleStyle = (type: QuestionType) => setStyles((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : PICKABLE.filter((t) => t === type || prev.includes(t))));
  const toggle = <T,>(set: React.Dispatch<React.SetStateAction<T[]>>, value: T) => set((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  // The types Vetter may use: any, when none are ticked
  const allowed = styles.length ? styles.filter((t) => pickable.includes(t)) : pickable;
  // Questions in the draft of a type since turned off
  const offTypes = styles.length ? [...new Set((draft?.questions ?? []).filter((q) => !styles.includes(q.type)).map((q) => q.type))] : [];
  // Changing a saved test doesn't pick library tests to go with it
  const ctx = { kind, job: job ? jobBrief(job) : undefined, jobTitle: job?.title, level: difficulty, levels: pickedLevels, questionCount, timeLimit, wantExisting: false, tests, business, styles: pickable === PICKABLE ? styles : allowed, viewing: focus, background };

  // The changed test in the place of the one being edited: same id, owner and level family, so its jobs keep it
  const asSaved = (test: AssessmentTest): AssessmentTest =>
    original
      ? {
          ...original,
          ...test,
          id: original.id,
          type: original.type,
          ...(original.familyId && { familyId: original.familyId }),
          ...(original.businessId && { businessId: original.businessId, companyName: original.companyName }),
          // A timer taken off goes back to the questions' total
          timeLimit: test.timeLimit,
          // A test made by hand and enhanced here is changed by asking from now on
          madeWith: 'ai',
        }
      : { ...test, madeWith: 'ai' };

  // The test and conversation as a draft to come back to
  const record = (test: AssessmentTest): TestDraft => ({
    id: draftId,
    businessId: business?.id ?? '',
    ...(job && { jobId: job.id }),
    ...(original && { editsTestId: original.id }),
    test: original ? asSaved(test) : test,
    messages: chat.messages,
    existing: chat.existing.map((s) => ({ testId: s.test.id, reason: s.reason })),
    ...(chat.research !== undefined && { research: chat.research, researchedFor: chat.researchedFor }),
    styles,
    ...(kind && { kind }),
    ...(background && { background }),
    ...(timeLimit !== undefined && { timeLimit }),
    ...(questionCount && { questionCount }),
    difficulties: pickedLevels,
    updatedAt: new Date().toISOString(),
  });
  const saveDraft = async () => {
    if (!draft || working || savingDraft) return;
    setSavingDraft(true);
    const saved = await onSaveDraft(record(draft));
    setSavingDraft(false);
    if (saved) onClose();
  };

  const close = () => {
    if (working) return;
    if (draft && chat !== savedChat && !window.confirm(original ? 'Close without saving your changes? Use Save draft to keep them and come back to them.' : 'Close without saving? Use Save draft to keep this test and come back to it.')) return;
    onClose();
  };

  // Minimised, the creator keeps working out of the way, as a tab in the corner the company can open again
  const [minimised, setMinimised] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !minimised && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [chat.messages.length, working]);

  // again: the last message sent once more, in place of it and the failed reply
  // Each message's run, so a stopped one that finishes late changes nothing
  const runs = useRef(0);
  const stop = () => {
    stopAiRun();
    setStage('Stopping…');
  };

  const send = async (text: string, again = false) => {
    const message = text.trim();
    if (!message || working) return;
    if (!again) setInput('');
    setWorking(true);
    const base = again ? { ...chat, messages: chat.messages.slice(0, -2) } : chat;
    // The message shows at once; the reply follows
    setChat({ ...base, messages: [...base.messages, { role: 'user', text: message }] });
    const before = chat.draft;
    const balanceBefore = credit?.billing ? credit.balance : undefined;
    // Each charge names the test it was for
    setAiPurpose(chat.draft?.title || original?.title || (job ? `${job.title} test` : 'New test'));
    setStage('');
    setSteps([]);
    const signal = startAiRun().signal;
    const runId = ++runs.current;
    const next = await sendChat(base, message, ctx, (line, list) => {
      if (signal.aborted) return;
      setStage(line);
      if (list) setSteps(list);
    }).catch((err) => {
      if (signal.aborted) return base;
      throw err;
    });
    // Stopped: whatever came back is dropped and the draft stays as it was before this message
    if (signal.aborted) {
      if (runId === runs.current) {
        setChat({ ...base, messages: [...base.messages, { role: 'user', text: message }, { role: 'assistant', text: 'Stopped. Nothing more was made, and your test is as it was before that message.' }] });
        setWorking(false);
      }
      return;
    }
    setChat(next);
    // New library picks start ticked, unless the job has them already
    setChosen((prev) => [...new Set([...prev.filter((id) => next.existing.some((s) => s.test.id === id)), ...next.existing.filter((s) => !chat.existing.some((e) => e.test.id === s.test.id) && !job?.testIds.includes(s.test.id)).map((s) => s.test.id)])]);
    if (next.draft !== before) {
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    }
    setWorking(false);
    box.current?.focus();
    // The balance after what that turn used, and what it used shown under the reply
    loadCredit().then((c) => {
      if (c.error) return;
      setCredit(c);
      const used = balanceBefore !== undefined && c.balance !== undefined ? balanceBefore - c.balance : 0;
      if (used > 0)
        setChat((cur) => {
          const last = cur.messages[cur.messages.length - 1];
          return last?.role === 'assistant' ? { ...cur, messages: [...cur.messages.slice(0, -1), { ...last, cost: used }] } : cur;
        });
    });
  };

  // The plan agreed in the home chat, written out in full, its simulations built and every question checked
  const runBuild = async () => {
    if (!plan || !planChat || working) return;
    setWorking(true);
    setStage('');
    setSteps([]);
    setAiPurpose(plan.title || 'New test');
    const balanceBefore = credit?.billing ? credit.balance : undefined;
    const signal = startAiRun().signal;
    const runId = ++runs.current;
    const next = await buildPlan(planChat, plan, ctx, (line, list) => {
      if (signal.aborted) return;
      setStage(line);
      if (list) setSteps(list);
    }).catch(() => null);
    if (runId !== runs.current) return;
    if (signal.aborted) {
      setChat((c) => ({ ...c, messages: [...c.messages, { role: 'assistant', text: 'Stopped. Nothing was made.', failed: true }] }));
      setWorking(false);
      return;
    }
    const reply = next?.messages[next.messages.length - 1];
    if (!next?.draft) {
      setChat((c) => ({ ...c, messages: [...c.messages, { role: 'assistant', text: [reply?.text, reply?.note].filter(Boolean).join(' ') || "Vetter couldn't build that.", failed: true }] }));
      setWorking(false);
      return;
    }
    setChat((c) => ({
      ...c,
      draft: next.draft,
      messages: [
        ...c.messages,
        { role: 'assistant', text: 'Built. Look it over on the right: try any question, or edit it in place. Ask me here for anything to change, then Save test.', ...(reply?.note && { note: reply.note }) },
      ],
    }));
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
    setWorking(false);
    box.current?.focus();
    loadCredit().then((c) => {
      if (c.error) return;
      setCredit(c);
      const used = balanceBefore !== undefined && c.balance !== undefined ? balanceBefore - c.balance : 0;
      if (used > 0)
        setChat((cur) => {
          const last = cur.messages[cur.messages.length - 1];
          return last?.role === 'assistant' ? { ...cur, messages: [...cur.messages.slice(0, -1), { ...last, cost: used }] } : cur;
        });
    });
  };

  // Once only, even if React mounts the chat twice: a plan is built, a seed sent
  const autoSent = useRef(false);
  useEffect(() => {
    if (autoSent.current || resume) return;
    if (plan && planChat) {
      autoSent.current = true;
      runBuild();
      return;
    }
    if (!autoSend || !seed) return;
    autoSent.current = true;
    send(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestions = plan && !draft
    ? []
    : original && !started
    ? ['Make it harder', 'Make it shorter', 'Rewrite the weakest question']
    : !started
    ? job
      ? ['Write a first draft', 'Focus on the hands-on tools they use', 'Keep it under 20 minutes']
      : kind === 'training'
      ? ['New starters on our Salesforce CRM', 'Support staff handling refunds in Zendesk', 'The finance team on Xero month-end']
      : SECTOR_EXAMPLES[business?.sector ?? ''] ?? ['A junior accounts assistant using Excel and Xero', 'A customer support agent in Zendesk', 'A junior data analyst who writes SQL']
    : draft
    ? [
        ...(offTypes.length ? ['Use only the question types I picked'] : []),
        ...(pickedLevels.length === 1 && draft.difficulty !== difficulty ? [`Make it ${difficulty} level`] : []),
        ...(questionCount && countOf(draft) !== questionCount ? [`Make it ${questionCount} questions`] : []),
        ...(typeof timeLimit === 'number' && Math.abs(minutesOf(draft) - timeLimit) > Math.max(5, timeLimit * 0.2) ? [`Fit the questions into ${timeLimit} minutes`] : []),
        'Make it harder',
        ...(allowed.includes('case') ? ['Add another case study'] : []),
        ...(allowed.some((t) => t === 'app' || t === 'sheet' || t === 'database') ? ['Add a hands-on task in the software'] : []),
        'Make it shorter',
      ]
    : [];

  // The company's own edits to the draft, made beside the chat; Vetter sees them on the next message
  const editDraft = (test: AssessmentTest) => setChat((c) => ({ ...c, draft: test }));
  const unfinished = draft && keepNew ? draftProblems(draft) : 0;
  const addCount = chosen.length + (draft && keepNew ? 1 : 0);
  const finish = () => {
    if (unfinished) return;
    if (original) {
      if (draft) onUpdateTest(withPurpose(asSaved(finaliseDraft(draft))));
      onClose();
      return;
    }
    const ids = [...chosen];
    if (draft && keepNew) ids.push(onSaveTest(withPurpose({ ...finaliseDraft(draft), madeWith: 'ai' }), kind));
    if (job && ids.length) onAddToJob(job.id, ids);
    onClose();
  };

  const buildingTitle = draft
    ? 'Updating your draft'
    : kind === 'training'
    ? 'Building your training'
    : kind === 'standalone'
    ? 'Building your interactive simulation'
    : 'Building your job simulation test';
  const tabTitle = original ? `Editing ${original.title}` : draft?.title || (kind === 'training' ? 'Training' : kind === 'standalone' ? 'Interactive simulation' : 'Job simulation test');
  return (
    <>
    {minimised && (
      <div role="status" className="fixed bottom-20 md:bottom-4 right-4 z-50 w-[min(22rem,calc(100vw-2rem))] bg-white border border-slate-200 rounded-xl shadow-xl flex items-center gap-3 p-3">
        <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${working ? 'bg-indigo-50 text-indigo-600' : draft ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
          {working ? <Loader2 className="w-4 h-4 animate-spin" /> : draft ? <Check className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        </span>
        <button onClick={() => setMinimised(false)} className="min-w-0 flex-1 text-left" title="Open">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-700">AI test builder</span>
          <span className="block text-sm font-semibold text-slate-900 truncate">{tabTitle}</span>
          <span className="block text-xs text-slate-500 truncate">{working ? stage || 'Vetter is building it…' : draft ? 'Ready to look over and save' : 'Waiting for you'}</span>
        </button>
        <button onClick={() => setMinimised(false)} aria-label="Open" title="Open" className="p-1.5 text-slate-500 hover:text-indigo-700 rounded-md hover:bg-slate-50">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button onClick={close} disabled={working} aria-label="Close" title={working ? 'Wait for Vetter to finish first' : 'Close'} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-50 disabled:opacity-40">
          <X className="w-4 h-4" />
        </button>
      </div>
    )}
    <div className={minimised ? 'hidden' : 'fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm'}>
      <div role="dialog" aria-modal="true" aria-label="AI test builder" className="bg-white sm:rounded-2xl rounded-t-2xl max-w-7xl w-full h-[calc(100dvh-1rem)] sm:h-[min(52rem,calc(100vh-2rem))] flex flex-col shadow-2xl overflow-hidden">
        {/* The builder's title bar: what it is, the test it's on, and saving */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <span className="w-9 h-9 shrink-0 rounded-lg bg-indigo-600 text-white flex items-center justify-center" aria-hidden="true">
              <Wand2 className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">AI test builder</h2>
                <span className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-slate-100 text-slate-600">
                  {original ? 'Editing' : kindLabel(kind)}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {draft?.title || original?.title || plan?.title || 'New test'}
                {job ? ` · ${job.title}` : business ? ` · ${business.name}` : ' · Vetter test library'}
              </p>
            </div>
          </div>
          {/* Saving lives up here, so the chat's message box is the bottom of the window */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={saveDraft}
              disabled={!draft || working || savingDraft}
              className="px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 disabled:opacity-40 rounded-lg"
            >
              {savingDraft ? 'Saving…' : 'Save draft'}
            </button>
            {original ? (
              <button
                onClick={finish}
                disabled={!draft || chat.draft === original || working || unfinished > 0}
                title={unfinished ? 'Finish the questions marked under Structure first' : undefined}
                className="px-3 sm:px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Save changes
              </button>
            ) : job ? (
              <button
                onClick={finish}
                disabled={addCount === 0 || working || unfinished > 0}
                title={unfinished ? 'Finish the questions marked under Structure first' : undefined}
                className="px-3 sm:px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {addCount === 0 ? 'Nothing picked yet' : `Add ${addCount} ${addCount === 1 ? 'test' : 'tests'} to the job`}
              </button>
            ) : (
              <button onClick={finish} disabled={!draft || working || unfinished > 0} title={unfinished ? 'Finish the questions marked under Structure first' : undefined} className="px-3 sm:px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Save test
              </button>
            )}
            <button onClick={() => setMinimised(true)} aria-label="Minimise" title="Minimise: keep it building while you carry on" className="p-1 text-slate-400 hover:text-slate-700">
              <Minus className="w-5 h-5" />
            </button>
            <button onClick={close} disabled={working} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-40">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* What Vetter may write, each a list to tick; whatever's left unticked Vetter decides. Locked while it works */}
        <div className="px-4 sm:px-5 py-2 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center gap-2" aria-busy={working}>
          {kind !== 'standalone' && (
          <>
          <Dropdown label={<>Question types: <Summary text={styles.length ? summarise(styles.map((t) => PICKABLE_STYLES.find((s) => s.type === t)?.label ?? t)) : undefined} /></>} width="w-72" disabled={working}>
            {() => (
              <PickList legend="Question types Vetter may use" picked={styles.length} onClear={() => setStyles([])}>
                {pickableStyles.map((s) => (
                  <PickRow key={s.type} on={styles.includes(s.type)} title={s.hint} onChange={() => toggleStyle(s.type)}>
                    {s.label}
                  </PickRow>
                ))}
              </PickList>
            )}
          </Dropdown>
          {/* How many questions: typed, or stepped with the arrows (or the arrow keys); empty, Vetter decides */}
          <div className={`flex items-center gap-1.5 text-xs font-semibold text-slate-700 ${working ? 'opacity-40' : ''}`}>
            <label htmlFor="question-count">Questions:</label>
            <div className="flex items-stretch rounded-lg bg-white ring-1 ring-slate-300 hover:ring-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden">
              <input
                id="question-count"
                type="text"
                inputMode="numeric"
                value={questionCount ?? ''}
                placeholder="Vetter decides"
                disabled={working}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 2);
                  setQuestionCount(digits ? clampCount(Number(digits)) : undefined);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    stepCount(e.key === 'ArrowUp' ? 1 : -1);
                  }
                }}
                aria-describedby="question-count-hint"
                className="w-28 px-2 py-1 text-xs font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-500 bg-transparent focus:outline-none tabular-nums"
              />
              <span id="question-count-hint" className="sr-only">
                From {MIN_COUNT} to {MAX_COUNT}. Leave it empty for Vetter to decide.
              </span>
              <div className="flex flex-col border-l border-slate-200">
                <button type="button" onClick={() => stepCount(1)} disabled={working || questionCount === MAX_COUNT} aria-label="One more question" className="px-1.5 flex-1 text-slate-500 hover:bg-slate-50 hover:text-indigo-700 disabled:opacity-30">
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => stepCount(-1)} disabled={working || questionCount === MIN_COUNT} aria-label="One fewer question" className="px-1.5 flex-1 border-t border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-700 disabled:opacity-30">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>
            {questionCount !== undefined && (
              <button type="button" onClick={() => setQuestionCount(undefined)} disabled={working} aria-label="Clear: let Vetter decide" title="Let Vetter decide" className="text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          </>
          )}
          <Dropdown label={<>Time limit: <Summary text={timeLimit === 'none' ? 'None' : timeLimit ? `${timeLimit} min` : undefined} /></>} width="w-56" disabled={working}>
            {(close) => (
              <PickList legend="Time limit" picked={timeLimit === undefined ? 0 : 1} onClear={() => (setTimeLimit(undefined), close())} note="Vetter decides: the time the questions add up to.">
                {timerOptions.map((n) => (
                  <PickRow key={n} type="radio" on={timeLimit === n} onChange={() => (setTimeLimit(n), close())}>
                    {n < 60 || n % 60 ? `${n} minutes` : `${n / 60} ${n === 60 ? 'hour' : 'hours'}`}
                  </PickRow>
                ))}
                <PickRow type="radio" on={timeLimit === 'none'} onChange={() => (setTimeLimit('none'), close())}>
                  No time limit
                </PickRow>
              </PickList>
            )}
          </Dropdown>
          <Dropdown label={<>Level: <Summary text={pickedLevels.length ? summarise(pickedLevels) : undefined} /></>} width="w-56" disabled={working}>
            {() => (
              <PickList legend="Difficulty" picked={pickedLevels.length} onClear={() => setLevels([])} note="Tick more than one to mix levels.">
                {TEST_DIFFICULTIES.map((d) => (
                  <PickRow key={d} on={levels.includes(d)} onChange={() => toggle(setLevels, d)}>
                    {levelName(d)}
                  </PickRow>
                ))}
              </PickList>
            )}
          </Dropdown>
        </div>

        <div className="lg:hidden flex border-b border-slate-200 text-sm font-semibold" role="tablist">
          {(['chat', 'draft'] as const).map((p) => (
            <button key={p} role="tab" aria-selected={pane === p} onClick={() => setPane(p)} className={`flex-1 py-2 ${pane === p ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500'}`}>
              {p === 'chat' ? 'Assistant' : draft ? `Test · ${countOf(draft)} questions` : 'Test'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
          {/* The conversation */}
          <section className={`${pane === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 lg:border-r border-slate-200`}>
            <PanelHeader title="Assistant" detail="Ask for any change" />
            <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4" aria-live="polite">
              {chat.messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-md bg-indigo-600 text-white text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2.5">
                    <VAvatar />
                    <div className="max-w-[85%] min-w-0">
                      <div className="px-3.5 py-2 rounded-2xl rounded-tl-md bg-slate-100 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{m.text}</div>
                      {m.failed && i === chat.messages.length - 1 && !working && plan && !draft && !m.needsCredit && (
                        <button onClick={runBuild} className="mt-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-indigo-300 text-indigo-700 hover:bg-indigo-50">
                          Build again
                        </button>
                      )}
                      {m.failed && i === chat.messages.length - 1 && !working && chat.messages[i - 1]?.role === 'user' && (
                        <button
                          onClick={() => (m.needsCredit ? setTopUpOpen(true) : send(chat.messages[i - 1].text, true))}
                          className={`mt-1.5 px-3 py-1 rounded-full text-sm font-semibold disabled:opacity-40 ${
                            m.needsCredit ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-indigo-300 text-indigo-700 hover:bg-indigo-50'
                          }`}
                        >
                          {m.needsCredit ? 'Top up and carry on' : 'Try again'}
                        </button>
                      )}
                      {m.note && (
                        <p className="mt-1.5 text-sm text-slate-800 flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          {m.note}
                        </p>
                      )}
                      {m.cost !== undefined && m.cost > 0 && <p className="mt-1 text-xs text-slate-400 tabular-nums">Used {pounds(m.cost)} of credit</p>}
                    </div>
                  </div>
                )
              )}
              {working && (
                <div className="flex gap-2.5">
                  <VAvatar pulse />
                  <div className="px-3.5 py-2 rounded-2xl rounded-tl-md bg-slate-100 text-sm leading-relaxed text-slate-600">
                    <WorkingStep stage={stage} />
                  </div>
                </div>
              )}
            </div>

            {/* The message box, held at the bottom while the conversation scrolls above it */}
            <div className="shrink-0 px-4 pb-4 pt-2 border-t border-slate-100 bg-white">
              {credit && (credit.billing ? credit.balance !== undefined : true) && (
                <div className="pb-2">
                  <CreditMeter
                    example={!credit.billing}
                    credit={credit.billing ? credit : EXAMPLE_CREDIT}
                    onTopUp={() => setTopUpOpen(true)}
                    refresh={chat.messages.length}
                    estimate={
                      !draft
                        ? (() => {
                            // Unpicked, a typical test of about 15 questions with any kind of task
                            const count = questionCount ?? 15;
                            const handsOn = allowed.some((t) => t === 'sheet' || t === 'database' || t === 'app' || t === 'code');
                            return estimateTest(count, handsOn, allowed.includes('app'));
                          })()
                        : undefined
                    }
                  />
                </div>
              )}
              {suggestions.length > 0 && !working && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} className="shrink-0 px-2.5 py-1 rounded-full border border-slate-200 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-700">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {focus && (
                <div className="pb-2 flex items-center gap-2 text-sm">
                  <span className="min-w-0 truncate px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800">
                    Changing <span className="font-semibold">{focus.label}: {focus.app}</span>
                  </span>
                  <button onClick={() => setAboutWhole(true)} disabled={working} className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                    <X className="w-3.5 h-3.5" />
                    Whole test instead
                  </button>
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-end gap-2 p-1.5 border border-slate-300 rounded-xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
              >
                <textarea
                  ref={box}
                  autoFocus
                  rows={Math.min(5, Math.max(1, input.split('\n').length))}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  aria-label="Message Vetter"
                  placeholder={focus ? `Ask for a change to ${focus.app}, e.g. "add a refunds screen"` : draft ? 'Ask for a change, e.g. "make question 2 harder"' : job ? 'What matters most in this hire?' : 'Describe the role or the test you want'}
                  className="flex-1 resize-none px-2 py-1.5 text-sm leading-relaxed text-slate-900 bg-transparent focus:outline-none"
                />
                {working ? (
                  <button type="button" onClick={stop} aria-label="Stop" title="Stop Vetter making any more" className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-900">
                    <Square className="w-5 h-5 fill-current" />
                  </button>
                ) : (
                  <button type="submit" disabled={!input.trim()} aria-label="Send" className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30">
                    <ArrowUp className="w-5 h-5" />
                  </button>
                )}
              </form>
            </div>
          </section>

          {/* The test as the candidate will see it, updating as the conversation goes and editable in place */}
          <section className={`${pane === 'draft' ? 'flex' : 'hidden'} lg:flex flex-col relative min-h-0 overflow-hidden bg-slate-50/60`}>
            <PanelHeader
              title="Test"
              detail={draft ? `${countOf(draft)} ${countOf(draft) === 1 ? 'question' : 'questions'} · about ${minutesOf(draft)} min` : working ? 'Building…' : 'Appears here as candidates will see it'}
            />
            <div className="relative flex-1 min-h-0">
            {/* While Vetter works on a draft already there, the building card sits over it, the draft blurred behind */}
            {working && draft && (
              <div className="absolute inset-0 z-10 p-4 flex items-center justify-center build-veil">
                <BuildingCard title={buildingTitle} stage={stage} steps={steps} />
              </div>
            )}
            {draft ? (
              <DraftPreview
                test={draft}
                onChange={editDraft}
                onViewing={(q, label) => {
                  setViewing(q?.type === 'app' ? { id: q.id, label, app: q.contextData || q.title } : undefined);
                  setAboutWhole(false);
                }}
                locked={working}
                flash={flash}
                onOpenBuilder={() => (onEditDraft(withPurpose(asSaved(finaliseDraft(draft))), chosen, record(draft)), onClose())}
                toolbarExtra={
                  job && !original && chat.existing.length > 0 ? (
                    <Dropdown
                      label={
                        <>
                          <Library className="w-3.5 h-3.5 text-indigo-600" />
                          Library picks &middot; {chosen.length}
                        </>
                      }
                      width="w-[24rem]"
                    >
                      {() => <LibraryPicks job={job} existing={chat.existing} chosen={chosen} setChosen={setChosen} keepNew={keepNew} setKeepNew={setKeepNew} onOpenTest={onOpenTest} />}
                    </Dropdown>
                  ) : undefined
                }
              />
            ) : (
              <div className="h-full overflow-y-auto px-5 py-4 space-y-5">
                {working ? (
                  <div className="h-full flex items-center justify-center py-12">
                    <BuildingCard title={buildingTitle} stage={stage} steps={steps} />
                  </div>
                ) : job && chat.existing.length > 0 ? (
                  <LibraryPicks job={job} existing={chat.existing} chosen={chosen} setChosen={setChosen} onOpenTest={onOpenTest} />
                ) : plan && !working ? (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-12">
                    <p className="text-sm font-semibold text-slate-700">Nothing built yet</p>
                    <button onClick={runBuild} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5">
                      <Wand2 className="w-4 h-4" />
                      Build again
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-12">
                    <p className="text-base font-semibold text-slate-700">Your test appears here, as candidates will see it</p>
                    <p className="text-sm text-slate-500 max-w-sm">
                      Every question Vetter writes is checked before it shows: coding answers and SQL queries are run, app simulations are tried out, and anything that fails is left out.
                      You can edit any question yourself as you go.
                    </p>
                  </div>
                )}
              </div>
            )}
            </div>
          </section>
        </div>

      </div>
      {topUpOpen && credit && <CreditsDialog credit={credit} onUpdated={setCredit} onClose={closeTopUp} />}
    </div>
    </>
  );
};

// A pill to pick a question type, a number or a level; greyed out and unclickable while Vetter is working
// What's ticked in a list, or that Vetter decides
const Summary: React.FC<{ text?: string }> = ({ text }) => <span className={text ? 'text-slate-900' : 'font-normal text-slate-500'}>{text ?? 'Vetter decides'}</span>;
const summarise = (labels: string[]) => (labels.length <= 2 ? labels.join(', ') : `${labels[0]} + ${labels.length - 1} more`);

// A list of options to tick, with a way back to letting Vetter decide
const PickList: React.FC<{ legend: string; picked: number; onClear: () => void; note?: string; children: React.ReactNode }> = ({ legend, picked, onClear, note, children }) => (
  <fieldset className="p-1.5 max-h-80 overflow-y-auto">
    <legend className="sr-only">{legend}</legend>
    <button type="button" onClick={onClear} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-100 ${picked ? 'text-slate-600' : 'font-semibold text-indigo-700'}`}>
      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${picked ? 'border-slate-300' : 'border-indigo-600 bg-indigo-600 text-white'}`}>{!picked && <Check className="w-3 h-3" />}</span>
      Let Vetter decide
    </button>
    <div className="my-1 border-t border-slate-100" />
    {children}
    {note && <p className="px-2.5 pt-1 pb-0.5 text-xs text-slate-500">{note}</p>}
  </fieldset>
);

const PickRow: React.FC<{ on: boolean; title?: string; type?: 'checkbox' | 'radio'; onChange: () => void; children: React.ReactNode }> = ({ on, title, type = 'checkbox', onChange, children }) => (
  <label title={title} className="px-2.5 py-1.5 rounded-lg text-sm text-slate-800 flex items-center gap-2 cursor-pointer select-none hover:bg-slate-100 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-300">
    <input type={type} checked={on} onChange={onChange} className="w-4 h-4 accent-indigo-600" />
    {children}
  </label>
);

// Tests from Vetter's library that suit the job, ticked to add alongside the new one
const LibraryPicks: React.FC<{
  job: JobPosting;
  existing: ChatState['existing'];
  chosen: string[];
  setChosen: React.Dispatch<React.SetStateAction<string[]>>;
  keepNew?: boolean;
  setKeepNew?: (keep: boolean) => void;
  onOpenTest: (testId: string) => void;
}> = ({ job, existing, chosen, setChosen, keepNew, setKeepNew, onOpenTest }) => (
  <div className="max-h-[60vh] overflow-y-auto">
    <h3 className="px-4 pt-3 pb-1 text-sm font-bold text-slate-900 flex items-center gap-1.5">
      <Library className="w-4 h-4 text-indigo-600" />
      Also from Vetter's library
    </h3>
    <ul className="divide-y divide-slate-100">
      {setKeepNew && (
        <li className="px-4 py-2.5 flex items-start gap-3">
          <input type="checkbox" checked={keepNew} onChange={(e) => setKeepNew(e.target.checked)} aria-label="Add the new test" className="mt-1 accent-indigo-600" />
          <div className="text-sm font-semibold text-slate-900">The test you're building</div>
        </li>
      )}
      {existing.map(({ test, reason }) => {
        const onJob = job.testIds.includes(test.id);
        return (
          <li key={test.id} className="px-4 py-2.5 flex items-start gap-3">
            <input
              type="checkbox"
              checked={onJob || chosen.includes(test.id)}
              disabled={onJob}
              onChange={() => setChosen((prev) => (prev.includes(test.id) ? prev.filter((x) => x !== test.id) : [...prev, test.id]))}
              aria-label={`Add ${test.title}`}
              className="mt-1 accent-indigo-600"
            />
            <div className="min-w-0 flex-1">
              <button onClick={() => onOpenTest(test.id)} className="text-sm font-semibold text-slate-900 hover:text-indigo-700 text-left">
                {versionTitle(test)}
              </button>
              <div className="text-xs text-slate-600">{reason}</div>
              <div className="text-[11px] text-slate-400">
                {test.category} &middot; ~{test.estimatedMinutes} min{test.type === 'custom' && <> &middot; {test.businessId === job.businessId ? 'your test' : `by ${test.companyName}`}</>}
                {onJob && ' · already on this job'}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

// A panel's slim title bar in the builder
const PanelHeader: React.FC<{ title: string; detail?: string }> = ({ title, detail }) => (
  <div className="shrink-0 h-9 px-4 border-b border-slate-200 bg-white flex items-center justify-between gap-3">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</span>
    {detail && <span className="min-w-0 truncate text-xs text-slate-400">{detail}</span>}
  </div>
);

// Vetter in the chat: a V where the avatar goes, pulsing while it works
const VAvatar: React.FC<{ pulse?: boolean }> = ({ pulse }) => (
  <span
    aria-hidden="true"
    className={`mt-0.5 w-7 h-7 shrink-0 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}
  >
    V
  </span>
);

// What Vetter is doing right now, only ever the step it's really on (sent as each one starts), with how long it's been
// going, since a thorough test takes a few minutes
const WorkingStep: React.FC<{ stage: string }> = ({ stage }) => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(clock);
  }, []);
  return (
    <span>
      {stage || 'Starting…'}
      {seconds >= 5 && <span className="ml-2 text-slate-400 tabular-nums">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>}
    </span>
  );
};

// Starting points in sectors whose work isn't done at a desk
const SECTOR_EXAMPLES: Record<string, string[]> = {
  trades: ['An electrician finding a fault on a domestic ring circuit', 'A plumber fitting and testing a new radiator', 'An apprentice electrician wiring a lighting circuit'],
  hospitality: ['A barista through a busy morning rush', 'A café supervisor: orders, a delivery, the rota and cash-up', 'A line cook on a Friday dinner service'],
  retail: ['A sales assistant on the till and shop floor', 'A store supervisor handling deliveries and a complaint', 'A visual merchandiser resetting a bay to a planogram'],
  healthcare: ['A healthcare assistant on a morning ward round', 'A staff nurse doing a medication round', 'A receptionist at a busy GP surgery'],
};

