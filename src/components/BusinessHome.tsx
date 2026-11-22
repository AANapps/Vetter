import { useCurrency } from '../lib/currency';
import { TRAINING, asksForTraining, searchTraining } from '../data/trainingCatalogue';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AiMark, BrandWordmark } from './Brand';
import { ArrowRight, ArrowUp, Briefcase, Check, ChevronDown, ChevronLeft, ChevronRight, Circle, ExternalLink, Eye, GraduationCap, Library, Loader2, Lock, Monitor, Pencil, Plus, Send, Square, UserSearch, Users, Wand2, X } from 'lucide-react';
import { AssessmentTest, Business, JobPosting, QuestionType, TestKind, User, levelName } from '../types';
import { Pic } from './Pic';
import { StarterArt, StarterArtKind } from './StarterArt';
import { AdvisorTurn, CUSTOM_KIND_LABELS, CustomIdea, HomeBuild, SuggestedPerson, askAdvisor, testOutline } from '../lib/testAdvisor';
import { Credit, loadCredit, startAiRun, stopAiRun } from '../lib/aiRequest';
import { ChatContext, ChatState, TestPlan, proposePlan } from '../lib/testChat';
import { ReusableApp, reusableApps } from '../lib/libraryApps';
import { QUESTION_STYLES } from '../lib/questionTypes';
import { aiSimulationsFor } from '../lib/sectors';
import { DraftPreview } from './DraftPreview';
import { kindLabel } from './KindChoice';
import { CreditMeter, EXAMPLE_CREDIT } from './CreditMeter';
import { CreditsDialog } from './CreditsDialog';

interface BusinessHomeProps {
  business?: Business;
  jobs: JobPosting[];
  tests: AssessmentTest[];
  // How many tests the company has written, and drafts it's still writing
  ownTestCount: number;
  draftCount: number;
  // AI test creation comes with a paid plan (the Praxa team always has it); the advice here doesn't need one
  aiAllowed: boolean;
  planName: string;
  // The conversation, kept by the app so it survives moving between pages
  turns: AdvisorTurn[];
  onTurns: React.Dispatch<React.SetStateAction<AdvisorTurn[]>>;
  // The test this chat is building or changing, kept by the app so it carries on while the company looks at the test
  build: HomeBuild | null;
  onBuild: React.Dispatch<React.SetStateAction<HomeBuild | null>>;
  // Build: the AI test builder opens on the agreed plan (with the chat's state and the job it's for) and builds it
  onBuildPlan: (plan: TestPlan, chat: ChatState, kind: TestKind, jobId?: string) => void;
  // Opens a saved test in the AI test builder to change by asking
  onEditWithAI: (testId: string) => void;
  // Sends a saved test to candidates: through the job it's on, or a new job made for it
  onSendTest: (testId: string) => void;
  // Saves a hand edit made in the preview
  onUpdateTest: (test: AssessmentTest) => void;
  // Something to start the chat with, from elsewhere in the app (e.g. "make a test for this job"), and the job the test
  // it builds is for
  seed?: { text: string; jobId?: string };
  onSeedUsed: () => void;
  // The ready-made tests picked across the chat, taken on to the test plan
  onContinue: (tests: AssessmentTest[]) => void;
  // Builds an AI test straight away; the picked tests (and the reply's other ideas) wait in the test plan for it
  onBuildIdea: (idea: CustomIdea, picked: AssessmentTest[], others: CustomIdea[]) => void;
  onEditCopy: (test: AssessmentTest) => void;
  onBuildWithAI: (brief: string, kind?: TestKind) => void;
  onCreateOwn: () => void;
  onSeePlans: () => void;
  onOpenTest: (testId: string) => void;
  onGoTo: (tab: 'business-jobs' | 'business-tests' | 'business-candidates') => void;
  // Opens an item of the live training catalogue on the Training page, to read and book
  onOpenTraining?: (id: string) => void;
  // Everyone on Praxa, for the chat to suggest when the company asks to see candidates
  candidates: User[];
  // A candidate's profile in a pop-up over the chat
  renderProfile: (personId: string, onClose: () => void) => React.ReactNode;
  // Sends a job's tests to a candidate, as an invitation
  onInvite: (jobId: string, candidateId: string) => void;
}

// Outside tech the AI writes every kind of question but app simulations (those come from Praxa's library)
const NO_APP_STYLES: QuestionType[] = ['choice', 'multi', 'text', 'written', 'order', 'match', 'email', 'assistant', 'case', 'sheet', 'database', 'code', 'sql'];

// The chat so far as the test writer is told it, so it doesn't ask again what the company already said
const chatSummary = (turns: AdvisorTurn[]) =>
  turns
    .slice(-16)
    .map((t) => (t.role === 'user' ? `Company: ${t.text}` : `Praxa: ${t.text}${t.brief ? `\n(The role: ${t.brief})` : ''}`))
    .join('\n')
    .slice(-5000);

// Where a company starts: one big card per thing Praxa does. Most start the chat with that ask; the rest open a page
type Starter = {
  id: string;
  // The small looping sketch at the top of the card
  art: StarterArtKind;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  body: string;
} & ({ ask: string } | { go: 'library' });
const STARTERS: Starter[] = [
  { id: 'sim', art: 'sim', icon: Monitor, tone: 'from-indigo-500 to-violet-500', title: 'Create a job simulation', body: 'A day in the role on a real desktop: email, files, the apps they’d use. Built with AI for your job.', ask: 'I want to create a job simulation.' },
  { id: 'job', art: 'job', icon: Briefcase, tone: 'from-sky-500 to-indigo-500', title: 'Create a job and pick the perfect tests', body: 'Tell Praxa the role or paste the description; it picks the tests that prove it, ready to post.', ask: 'I want to create a job. Help me pick the perfect tests for it.' },
  { id: 'find', art: 'find', icon: UserSearch, tone: 'from-emerald-500 to-teal-500', title: 'Find the perfect candidate', body: 'Describe who you need. Praxa ranks people by the skills they’ve proven in tests.', ask: 'I’m looking for the perfect candidate. Help me find them.' },
  { id: 'train', art: 'train', icon: GraduationCap, tone: 'from-amber-500 to-orange-500', title: 'Train my team on an app', body: 'A hands-on copy of the software your team uses, with guided tasks, to send to them.', ask: 'I want to create training for my team.' },
  { id: 'live', art: 'live', icon: Users, tone: 'from-rose-500 to-pink-500', title: 'Book live training', body: 'Short sessions and bootcamps taught by a Praxa tutor, for your whole team.', ask: 'I want to book live training for my team.' },
  { id: 'library', art: 'library', icon: Library, tone: 'from-slate-600 to-slate-800', title: 'Browse the test library', body: 'Ready-made tests and simulations by role and level, free to send.', go: 'library' },
];

// A row that slides right to left on its own, looping (its children are the cards twice over), with arrows either side
// to move it one card at a time. Pointing at it or focusing a card stops it; with reduced motion it only moves by arrow
const STEP = 236; // a card (w-56) and its gap (mr-3)
const SPEED = 30; // pixels a second
const StarterSlide: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const track = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const target = useRef<number | null>(null);
  const paused = useRef(false);
  useEffect(() => {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      const el = track.current;
      if (el) {
        const half = el.scrollWidth / 2;
        if (target.current !== null) {
          const gap = target.current - offset.current;
          if (Math.abs(gap) < 0.5) {
            offset.current = target.current;
            target.current = null;
          } else offset.current += gap * Math.min(1, dt * 10);
        } else if (!paused.current && !still) offset.current += SPEED * dt;
        // Loop: the second copy stands where the first began
        if (half > 0) {
          const wrap = offset.current >= half ? -half : offset.current < 0 ? half : 0;
          offset.current += wrap;
          if (target.current !== null) target.current += wrap;
        }
        el.style.transform = `translateX(${-offset.current}px)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  const move = (dir: 1 | -1) => {
    const from = target.current ?? offset.current;
    target.current = (Math.round(from / STEP) + dir) * STEP;
  };
  const arrow = 'absolute top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 border border-slate-200 shadow-sm text-slate-600 hover:text-indigo-700 hover:border-indigo-300 flex items-center justify-center';
  return (
    <div className="relative -mx-4 sm:mx-0 text-left">
      <div
        className="ai-marquee-mask overflow-hidden"
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => (paused.current = false)}
        onFocus={() => (paused.current = true)}
        onBlur={() => (paused.current = false)}
      >
        <div ref={track} className="flex w-max py-2 will-change-transform">
          {children}
        </div>
      </div>
      <button type="button" aria-label="Previous" onClick={() => move(-1)} className={`${arrow} left-1 sm:-left-4`}>
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button type="button" aria-label="Next" onClick={() => move(1)} className={`${arrow} right-1 sm:-right-4`}>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

// A company's home: a chat with Praxa about who they're hiring, which answers with a roadmap, the library tests that
// fit and custom pieces worth building. The menu sits on the left
export const BusinessHome: React.FC<BusinessHomeProps> = ({
  business,
  jobs,
  tests,
  ownTestCount,
  draftCount,
  aiAllowed,
  turns,
  onTurns,
  onContinue,
  onBuildIdea,
  onEditCopy,
  onBuildWithAI,
  onCreateOwn,
  onSeePlans,
  onOpenTest,
  onGoTo,
  onOpenTraining,
  candidates,
  renderProfile,
  onInvite,
  build,
  onBuild,
  onBuildPlan,
  onEditWithAI,
  onSendTest,
  onUpdateTest,
  seed,
  onSeedUsed,
}) => {
  const [input, setInput] = useState('');
  // The candidate whose profile is open over the chat
  const [viewing, setViewing] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  // The test open in the preview pop-up
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewTest = previewId ? tests.find((t) => t.id === previewId) : undefined;
  // Ready-made tests ticked from any reply; they stay ticked as the chat goes on, until the company carries on with them
  const [picked, setPicked] = useState<string[]>([]);
  const togglePick = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const pickAll = (ids: string[]) => setPicked((prev) => (ids.every((id) => prev.includes(id)) ? prev.filter((x) => !ids.includes(x)) : [...new Set([...prev, ...ids])]));
  const clearPicks = () => setPicked([]);
  const pickedTests = picked.flatMap((id) => {
    const t = tests.find((x) => x.id === id);
    return t ? [t] : [];
  });
  // The company's AI credit, for the tests this chat goes on to write; nothing shows when the site doesn't charge
  const [credit, setCredit] = useState<Credit | null>(null);
  const [topUpOpen, setTopUpOpen] = useState(false);
  useEffect(() => {
    if (aiAllowed) loadCredit().then((c) => !c.error && setCredit(c));
  }, [aiAllowed, turns.length]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, thinking, build?.working, build?.steps?.length]);

  const working = thinking || !!build?.working;
  // The job a test built from a seed is added to
  const jobFor = useRef<string | undefined>(undefined);

  // Tests are built and changed right here: the test chat's engine (lib/testChat.ts) writes it, it's saved to the
  // company's tests, and the reply shows what's in it with a See test button. Messages after that change it, until
  // the company says it's done with it
  const testContext = (kind: TestKind): ChatContext => ({
    kind,
    levels: [],
    wantExisting: false,
    tests,
    business,
    // Outside tech, app simulations come from Praxa's library, so the AI writes every other kind of question
    styles: aiSimulationsFor(business) ? [] : NO_APP_STYLES,
    background: chatSummary(turns),
  });
  // Before anything is written, Praxa plans the test and lists every question in the chat; each message after that
  // changes the plan, until the company presses Build
  const runPlan = async (text: string, kind: TestKind, base: ChatState, current?: TestPlan) => {
    const signal = startAiRun().signal;
    onBuild({ chat: base, kind, planning: true, plan: current, working: true, stage: '' });
    const out = await proposePlan(base, text, testContext(kind), current, (stage) => {
      if (!signal.aborted) onBuild((b) => b && { ...b, stage });
    }).catch(() => ({ state: base, plan: undefined, failure: "Couldn't reach Praxa's AI. Check your connection and try again." }));
    if (signal.aborted) {
      onBuild(current ? { chat: base, kind, planning: true, plan: current, working: false } : null);
      onTurns((prev) => [...prev, { role: 'assistant', text: current ? 'Stopped. The plan is as it was.' : 'Stopped. Nothing was planned.' }]);
      return;
    }
    const reply = out.state.messages[out.state.messages.length - 1];
    if (out.failure) {
      onBuild(current ? { chat: base, kind, planning: true, plan: current, working: false } : null);
      onTurns((prev) => [
        ...prev,
        { role: 'assistant', text: reply?.text || out.failure!, error: true, ...(reply?.needsCredit && { needsCredit: true }), ...(!current && { retryPlan: { brief: text, kind } }) },
      ]);
      return;
    }
    onBuild({ chat: out.state, kind, planning: true, plan: out.plan, working: false });
    onTurns((prev) => [...prev, { role: 'assistant', text: reply?.text ?? '', ...(out.plan && out.plan !== current && { plan: out.plan }) }]);
  };
  // A brief from the chat (training, or a test for a candidate's gaps) planned from the start
  const planFrom = (brief: string, kind: TestKind = 'simulation', said?: string) => {
    if (!aiAllowed) return onSeePlans();
    if (working) return;
    if (said) onTurns((prev) => [...prev, { role: 'user', text: said }]);
    runPlan(brief, kind, { messages: [], existing: [] });
  };
  // Build: the AI test builder opens on the plan the company agreed and builds it there
  // The company edits the plan in place (a question's prompt, the software an app is done in): the chat's turn and the
  // plan Build will use change together
  const changePlan = (old: TestPlan, next: TestPlan) => {
    onTurns((prev) => prev.map((t) => (t.plan === old ? { ...t, plan: next } : t)));
    onBuild((b) => (b && b.plan === old ? { ...b, plan: next } : b));
  };
  const buildIt = () => {
    if (!build?.planning || !build.plan || build.working) return;
    onBuildPlan(build.plan, build.chat, build.kind, jobFor.current);
  };
  const stop = () => {
    stopAiRun();
    onBuild((b) => b && { ...b, stage: 'Stopping…' });
  };

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || working) return;
    setInput('');
    // While a test from this chat is open for changes, messages change it
    // While a plan is up, messages change it
    if (build?.planning) {
      onTurns((prev) => [...prev, { role: 'user', text: t }]);
      runPlan(t, build.kind, build.chat, build.plan);
      return;
    }
    // Asking for training (not to build it): Praxa's live, tutor-led catalogue answers straight away, without AI
    const found = asksForTraining(t) && !/\b(create|build|make|write|generate|design)\b/i.test(t) ? searchTraining(t, 4) : [];
    if (found.length) {
      onTurns((prev) => [
        ...prev,
        { role: 'user', text: t },
        {
          role: 'assistant',
          text: `Here's live training taught by a Praxa tutor that fits. Open one to see the sessions, the price per person and to book it for your team${found.some((f) => f.kind === 'Bootcamp') ? '; bootcamps run from Junior to Mid-level to Advanced' : ''}.`,
          training: found.map((f) => f.id),
          options: ['Show me bootcamps', 'Show me short mini modules', 'Create custom training with AI'],
        },
      ]);
      return;
    }
    const next: AdvisorTurn[] = [...turns, { role: 'user', text: t }];
    onTurns(next);
    setThinking(true);
    const reply = await askAdvisor(next, tests, business, candidates);
    onTurns((prev) => [...prev, reply]);
    setThinking(false);
    inputRef.current?.focus();
    // Once the chat knows what to make, Praxa plans it straight away and lists every question
    if (aiAllowed && !reply.error && reply.brief && (reply.intent === 'test' || reply.intent === 'both' || reply.intent === 'training'))
      runPlan(reply.intent === 'training' ? reply.brief : buildBrief(reply), reply.intent === 'training' ? 'training' : 'simulation', { messages: [], existing: [] });
  };

  // Started from elsewhere: the seed goes in as the company's first message
  useEffect(() => {
    if (!seed || working) return;
    jobFor.current = seed.jobId;
    onSeedUsed();
    onBuild(null);
    send(seed.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);


  return (
    // A chat like ChatGPT's or Claude's: exactly the window under the top bar, so the page itself never scrolls; only
    // the conversation does, and the message box stays at the bottom
    <div className="relative isolate h-[calc(100dvh-3.5rem-1px)] lg:h-[100dvh] overflow-hidden">
      {/* Pop-ups go on the page body: the chat is its own layer (isolate), which would leave them under the side menu */}
      {topUpOpen && credit && createPortal(<CreditsDialog credit={credit} onUpdated={setCredit} onClose={() => setTopUpOpen(false)} />, document.body)}
      {viewing && createPortal(renderProfile(viewing, () => setViewing(null)), document.body)}
      {previewTest &&
        createPortal(
          <PreviewDialog
            test={previewTest}
            locked={!!build?.working}
            onChange={(t) => {
              onUpdateTest(t);
              onBuild((b) => (b && b.testId === t.id ? { ...b, chat: { ...b.chat, draft: t } } : b));
            }}
            onOpenPage={() => (setPreviewId(null), onOpenTest(previewTest.id))}
            onClose={() => setPreviewId(null)}
          />,
          document.body
        )}
      {/* Faint colour behind the frosted panels, holding still */}
      <div className="ai-aurora" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    <div className="h-full grid grid-cols-1 grid-rows-[minmax(0,1fr)]">
      {/* The chat: it scrolls the full width, so its scroll bar sits at the right edge of the screen; the messages stay
          in a column down the middle */}
      <section className="min-w-0 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          {turns.length === 0 ? (
            <div className="pt-6 sm:pt-12 space-y-6 text-center">
              <div className="space-y-2">
                <BrandWordmark size="lg" className="mx-auto w-fit" />
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">What do you want to do?</h1>
                <p className="text-sm text-slate-500 max-w-md mx-auto">Pick one to start, or just type below: describe the role or paste a job description.</p>
              </div>
              {/* The starters slide past right to left, fading in and out at both ends; pointing at one stops them, and the
                  arrows move them by hand */}
              <StarterSlide>
                {[0, 1].flatMap((copy) => STARTERS.map((s) => (
                  <button
                    key={`${copy}-${s.id}`}
                    aria-hidden={copy === 1 || undefined}
                    tabIndex={copy === 1 ? -1 : undefined}
                    onClick={() => ('ask' in s ? send(s.ask) : onGoTo('business-tests'))}
                    className="group ai-glass w-56 shrink-0 mr-3 p-2.5 rounded-2xl border border-white/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-300 transition-all flex flex-col gap-2.5"
                  >
                    <StarterArt kind={s.art} />
                    <span className="flex items-start gap-2.5 px-1">
                      <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${s.tone} text-white flex items-center justify-center shadow-sm shrink-0`}>
                        <s.icon className="w-4 h-4" />
                      </span>
                      <span className="space-y-0.5 min-w-0">
                        <span className="block text-sm font-bold text-slate-900 group-hover:text-indigo-700 leading-snug">{s.title}</span>
                        <span className="block text-xs text-slate-500 leading-relaxed">{s.body}</span>
                      </span>
                    </span>
                    <span className="mt-auto px-1 pb-1 text-xs font-semibold text-indigo-600 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                      {'ask' in s ? 'Start' : 'Open'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                )))}
              </StarterSlide>
              {/* Or write one by hand */}
              <div className="flex justify-center pt-1">
                <button
                  onClick={onCreateOwn}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 rounded-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create a test manually
                </button>
              </div>
            </div>
          ) : (
            turns.map((turn, i) =>
              turn.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-2xl rounded-br-md whitespace-pre-wrap shadow-md shadow-indigo-200/60">
                    {turn.text}
                  </p>
                </div>
              ) : (
                <AdvisorReply
                  key={i}
                  turn={turn}
                  aiAllowed={aiAllowed}
                  picked={picked}
                  onTogglePick={togglePick}
                  onPickAll={pickAll}
                  onEditCopy={onEditCopy}
                  onBuildWithAI={planFrom}
                  onEditWithAI={onEditWithAI}
                  onSendTest={onSendTest}
                  onSeePlans={onSeePlans}
                  onOpenTest={onOpenTest}
                  onPreview={setPreviewId}
                  onTopUp={() => setTopUpOpen(true)}
                  canBuild={!!turn.plan && !!build?.planning && build.plan === turn.plan && !working}
                  onBuild={buildIt}
                  onChangePlan={(next) => turn.plan && changePlan(turn.plan, next)}
                  onOpenLibrary={() => onGoTo('business-tests')}
                  onOpenTraining={onOpenTraining}
                  candidates={candidates}
                  onViewPerson={setViewing}
                  jobs={jobs}
                  onInvite={onInvite}
                  onQuickReply={i === turns.length - 1 && !thinking ? send : undefined}
                />
              )
            )
          )}
          {build?.working && (
            <div className="flex gap-3">
              <AiMark className="w-7 h-7 mt-0.5" busy />
              <div className="ai-glass min-w-0 flex-1 p-4 rounded-2xl rounded-tl-md border border-white/80 shadow-sm space-y-1">
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  {build.plan ? 'Changing the plan…' : 'Planning every question…'}
                </p>
                <p className="text-xs text-slate-500 ai-shimmer">{build.stage || 'Starting…'}</p>
              </div>
            </div>
          )}
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <AiMark className="w-7 h-7" busy />
              <span className="ai-shimmer font-medium">Looking through Praxa…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="shrink-0 pb-3 pt-2 w-full max-w-4xl mx-auto px-4 sm:px-6"
        >
          {credit && (credit.billing ? credit.balance !== undefined : true) && (
            <div className="mb-2">
              <CreditMeter example={!credit.billing} credit={credit.billing ? credit : EXAMPLE_CREDIT} onTopUp={() => setTopUpOpen(true)} refresh={turns.length} />
            </div>
          )}
          {pickedTests.length > 0 && (
            <div className="mb-3 p-3 bg-white border border-indigo-200 rounded-2xl shadow-md shadow-indigo-100/60 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">
                  {pickedTests.length} {pickedTests.length === 1 ? 'test' : 'tests'} picked
                  <span className="font-normal text-slate-500"> &middot; ~{pickedTests.reduce((n, t) => n + t.estimatedMinutes, 0)} min in all</span>
                </div>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {pickedTests.map((t) => (
                    <li key={t.id} className="pl-2 pr-1 py-0.5 bg-indigo-50 text-indigo-800 text-[11px] font-medium rounded-full flex items-center gap-1">
                      <span className="truncate max-w-[14rem]">{t.title}</span>
                      <button type="button" onClick={() => togglePick(t.id)} aria-label={`Remove ${t.title}`} className="p-0.5 rounded-full hover:bg-indigo-100">
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={clearPicks} className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900">
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => onContinue(pickedTests)}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5"
                >
                  Review your test plan
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          {build?.planning && build.plan && !build.working && (
            <div className="mb-2 flex items-center justify-between gap-3 px-3 py-2 bg-white/90 border border-indigo-200 rounded-xl text-xs">
              <span className="min-w-0 truncate text-slate-700">
                Planning <b className="text-slate-900">{build.plan.title || 'your test'}</b>: ask for any change, then build it in the AI test builder.
              </span>
              <span className="shrink-0 flex items-center gap-3">
                <button type="button" onClick={buildIt} className="font-semibold text-indigo-700 hover:text-indigo-900">
                  Build
                </button>
                <button type="button" onClick={() => onBuild(null)} className="font-semibold text-slate-500 hover:text-slate-900">
                  Cancel
                </button>
              </span>
            </div>
          )}
          <div className="ai-ring" data-busy={working}>
          <div className="ai-glass-solid flex items-end gap-2 p-2 rounded-[calc(1.25rem-1.5px)]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder={build?.planning ? 'Ask for a change, e.g. "swap question 4 for a SQL task"' : turns.length ? 'Answer, or ask a follow-up, e.g. make it more senior' : 'Describe the role, or paste the job description'}
              aria-label="Message Praxa"
              className="flex-1 resize-none max-h-40 px-2 py-1.5 text-sm bg-transparent focus:outline-none"
            />
            {build?.working ? (
              <button type="button" onClick={stop} aria-label="Stop" title="Stop Praxa making any more" className="w-9 h-9 shrink-0 rounded-xl bg-slate-800 hover:bg-slate-900 text-white flex items-center justify-center">
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                aria-label="Send"
                className="w-9 h-9 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-40"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
          </div>
          <div className="mt-2 flex items-center justify-center gap-4 text-[11px]">
            {turns.length > 0 && (
              <>
                <button type="button" onClick={() => (onTurns([]), clearPicks(), onBuild(null))} className="font-semibold text-slate-500 hover:text-slate-900">
                  New chat
                </button>
                <button type="button" onClick={onCreateOwn} className="font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
                  <Plus className="w-3 h-3" />
                  Create a test manually
                </button>
              </>
            )}
          </div>
        </form>
      </section>

    </div>
    </div>
  );
};

const AdvisorReply: React.FC<{
  turn: AdvisorTurn;
  aiAllowed: boolean;
  picked: string[];
  onTogglePick: (testId: string) => void;
  onPickAll: (testIds: string[]) => void;
  onEditCopy: (test: AssessmentTest) => void;
  onBuildWithAI: (brief: string, kind?: TestKind, said?: string) => void;
  onSeePlans: () => void;
  onOpenTest: (testId: string) => void;
  onPreview: (testId: string) => void;
  onTopUp: () => void;
  // This reply's plan is the one up for Build
  canBuild: boolean;
  onBuild: () => void;
  onChangePlan: (plan: TestPlan) => void;
  onOpenLibrary: () => void;
  candidates: User[];
  onViewPerson: (personId: string) => void;
  jobs: JobPosting[];
  onInvite: (jobId: string, candidateId: string) => void;
  // Set on the latest reply only: a quick answer sends it as the company's next message
  onQuickReply?: (text: string) => void;
  onEditWithAI: (testId: string) => void;
  onSendTest: (testId: string) => void;
  onOpenTraining?: (id: string) => void;
}> = ({ turn, onOpenTraining, onEditWithAI, onSendTest, aiAllowed, picked, onTogglePick, onPickAll, onEditCopy, onBuildWithAI, onSeePlans, onOpenTest, onPreview, onTopUp, canBuild, onBuild, onChangePlan, onOpenLibrary, candidates, onViewPerson, jobs, onInvite, onQuickReply }) => (
  <div className="flex gap-3">
    <AiMark className="w-7 h-7 mt-0.5" />
    <div className="ai-glass min-w-0 flex-1 space-y-4 p-4 sm:p-5 rounded-2xl rounded-tl-md border border-white/80 shadow-sm">
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${turn.error ? 'text-slate-800' : 'text-slate-800'}`}>{turn.text}</p>

      {/* A question it asked, with answers to tap */}
      {!!turn.options?.length && (
        <div className="flex flex-wrap gap-2">
          {turn.options.map((o) => (
            <button
              key={o}
              onClick={() => onQuickReply?.(o)}
              disabled={!onQuickReply}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 rounded-full disabled:opacity-50 disabled:cursor-default"
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {/* Planning or building failed: try again, or top up when the credit ran out */}
      {(turn.needsCredit || turn.retryPlan) && (
        <div className="flex flex-wrap gap-2">
          {turn.needsCredit && (
            <button onClick={onTopUp} className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
              Top up credit
            </button>
          )}
          {turn.retryPlan && (
            <button
              onClick={() => onBuildWithAI(turn.retryPlan!.brief, turn.retryPlan!.kind)}
              className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:border-indigo-400 rounded-lg"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {turn.plan && <PlanCard plan={turn.plan} canBuild={canBuild} onBuild={onBuild} onChange={onChangePlan} />}

      {/* Training they want built: one card to create it */}
      {turn.brief && turn.intent === 'training' && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Your training simulation</div>
            <p className="mt-1 text-sm text-slate-700 leading-relaxed">{turn.brief}</p>
          </div>
          {!aiAllowed && (
            <button
              onClick={onSeePlans}
              className="create-border shrink-0 self-start sm:self-center px-4 py-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 rounded-lg inline-flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Create training
            </button>
          )}
        </div>
      )}
      {/* A test made (or changed) here: its title, what it covers, its questions in sections, and See test */}
      {turn.created && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-start gap-3">
            <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${turn.created.draft ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {turn.created.draft ? <Pencil className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {kindLabel(turn.created.kind)} · {turn.created.draft ? 'Draft' : turn.created.updated ? 'Changed and saved' : 'Saved to your tests'}
              </div>
              <p className="mt-0.5 text-sm font-semibold text-slate-900">{turn.created.title}</p>
              {turn.created.description && <p className="mt-1 text-sm text-slate-600 leading-relaxed">{turn.created.description}</p>}
              <p className="mt-1 text-xs text-slate-500">
                {turn.created.kind === 'standalone'
                  ? 'One interactive simulation'
                  : `${turn.created.questions} ${turn.created.questions === 1 ? 'question' : 'questions'}${turn.created.apps ? `, ${turn.created.apps} ${turn.created.apps === 1 ? 'app simulation' : 'app simulations'}` : ''}`}
              </p>
            </div>
          </div>
          {!!turn.created.outline?.length && (
            <ul className="space-y-1.5 border-t border-slate-100 pt-3">
              {turn.created.outline.map((o) => (
                <li key={`${o.from}-${o.to}`} className="flex gap-2 text-sm">
                  <Check className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                  <span className="min-w-0">
                    <span className="font-semibold text-slate-900">
                      {o.from === o.to ? `Question ${o.from}` : `Questions ${o.from} to ${o.to}`}: {o.label}
                    </span>
                    {o.detail && <span className="text-slate-500"> · {o.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {/* The next step once it's made: send it to candidates (training goes to the team from the Training page) */}
            {turn.created.testId && !turn.created.draft && turn.created.kind !== 'training' && (
              <button onClick={() => onSendTest(turn.created!.testId!)} className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Send to candidates
              </button>
            )}
            {turn.created.testId && (
              <button onClick={() => onPreview(turn.created!.testId!)} className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg inline-flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
            )}
            <button onClick={onOpenLibrary} className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg inline-flex items-center gap-1">
              Your test library <ArrowRight className="w-3 h-3" />
            </button>
            {turn.created.testId && (
              <button
                onClick={() => onEditWithAI(turn.created!.testId!)}
                className="px-3 py-2 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:border-indigo-400 rounded-lg inline-flex items-center gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Edit in AI test builder
              </button>
            )}
          </div>
        </div>
      )}

      {!!turn.training?.length && (
        <ul className="grid sm:grid-cols-2 gap-2">
          {turn.training.map((id) => TRAINING.find((x) => x.id === id)).filter(Boolean).map((item) => (
            <li key={item!.id}>
              <button
                onClick={() => onOpenTraining?.(item!.id)}
                className="w-full h-full text-left p-3 bg-white/80 border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition flex flex-col gap-1"
              >
                <span className="flex items-center gap-2 text-[11px] font-semibold">
                  <span className={item!.kind === 'Bootcamp' ? 'text-indigo-700' : 'text-teal-700'}>{item!.kind}</span>
                  <span className="text-slate-500">{item!.level}</span>
                </span>
                <span className="text-sm font-semibold text-slate-900 leading-snug">{item!.title}</span>
                <span className="text-xs text-slate-500">{item!.duration} · live tutor</span>
                <span className="mt-auto pt-1 flex items-center justify-between text-xs">
                  <TrainingPrice price={item!.price} />
                  <span className="font-semibold text-indigo-700">View and book →</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!!turn.people?.length && (
        <PeopleList
          people={turn.people}
          candidates={candidates}
          onView={onViewPerson}
          jobs={jobs}
          onInvite={onInvite}
          onBuildTest={(brief) => (aiAllowed ? onBuildWithAI(brief, 'simulation', 'Plan a test for their gaps.') : onSeePlans())}
          aiAllowed={aiAllowed}
        />
      )}

      {!!turn.roadmap?.length && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Roadmap</h3>
          <ol className="space-y-2">
            {turn.roadmap.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="w-5 h-5 shrink-0 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <span>
                  <span className="font-semibold text-slate-900">{r.step}.</span> <span className="text-slate-600">{r.detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {!!turn.existing?.length && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tests to take alongside</h3>
            {turn.existing.length > 1 && (
              <button onClick={() => onPickAll(turn.existing!.map((e) => e.test.id))} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">
                {turn.existing.every((e) => picked.includes(e.test.id)) ? 'Unpick all' : 'Pick all'}
              </button>
            )}
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {turn.existing.map(({ test, reason }) => {
              const on = picked.includes(test.id);
              return (
              <li
                key={test.id}
                className={`p-4 bg-white border rounded-xl flex flex-col gap-2 transition-colors ${on ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-slate-200'}`}
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">{test.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {test.type === 'custom' ? `${test.companyName ?? 'Your'} test` : test.category} &middot; {levelName(test.difficulty)} &middot; ~{test.estimatedMinutes} min &middot; {test.totalQuestions}{' '}
                    {test.totalQuestions === 1 ? 'task' : 'tasks'}
                  </div>
                </div>
                <p className="text-xs text-slate-600 flex-1">{reason}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => onTogglePick(test.id)}
                    aria-pressed={on}
                    aria-label={`Pick ${test.title}`}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1 ${
                      on ? 'text-indigo-700 bg-indigo-50 border border-indigo-300' : 'text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-600'
                    }`}
                  >
                    {on ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    {on ? 'Picked' : 'Pick'}
                  </button>
                  <button
                    onClick={() => onEditCopy(test)}
                    title="Opens a copy in the builder; saving it makes a new test of your own, and the library's stays as it is"
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Use as a template
                  </button>
                  <button onClick={() => onOpenTest(test.id)} className="px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-700 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Last, the job simulation Praxa suggests and what it will contain; Praxa then plans every question in it */}
      {turn.brief && (turn.intent === 'test' || turn.intent === 'both') && (
        <div className="p-4 bg-white border border-indigo-200 rounded-xl space-y-3 shadow-sm shadow-indigo-100/60">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">Your job simulation</div>
            <p className="mt-1 text-sm text-slate-700 leading-relaxed">{turn.brief}</p>
          </div>
          {!!turn.custom?.length && (
            <ul className="space-y-1.5">
              {turn.custom.map((idea, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-600">
                  <Check className="w-3.5 h-3.5 mt-px shrink-0 text-indigo-600" />
                  <span>
                    <span className="font-semibold text-slate-900">{idea.title}</span>
                    <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">{CUSTOM_KIND_LABELS[idea.kind]}</span>
                    <span className="block mt-0.5">{idea.why}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {/* With AI tests on the plan, Praxa plans every question next, under this reply */}
          {!aiAllowed && (
            <button onClick={onSeePlans} className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              Build it
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  </div>
);

// The plan Praxa will build from, before anything is written: what the hire needs, then a checklist of every question,
// case and task in the order the candidate meets them, each just its number and title. Opening one shows its type,
// time, the software it's done in (picked by Praxa: an app from its library when one fits, or built new) and the prompt
// it's written from, which the company can change while the plan can still be built. Messages change it too
const PlanCard: React.FC<{ plan: TestPlan; canBuild: boolean; onBuild: () => void; onChange: (plan: TestPlan) => void }> = ({ plan, canBuild, onBuild, onChange }) => {
  const label = (type: string) => QUESTION_STYLES.find((s) => s.type === type)?.label ?? type;
  const minutes = plan.items.reduce((n, item) => n + (Number(item.minutes) || 0), 0);
  const skills = (plan.blueprint ?? []).map((line) => line.split('|')[0].trim()).filter(Boolean);
  // Cases are read, not answered, so only questions and tasks are numbered
  let n = 0;
  const rows = plan.items.map((item) => ({ item, number: item.type === 'case' ? 0 : ++n }));
  // A job simulation is one day on the desktop in five timed parts, plus 3 minutes to read and switch apps
  const day = plan.items.length > 0 && plan.items.every((item) => item.type === 'part');
  const [open, setOpen] = useState<string[]>([]);
  const [apps, setApps] = useState<ReusableApp[]>([]);
  useEffect(() => {
    let live = true;
    reusableApps()
      .then((list) => live && setApps(list))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const edit = (ref: string, change: Partial<TestPlan['items'][number]>) => onChange({ ...plan, items: plan.items.map((item) => (item.ref === ref ? { ...item, ...change } : item)) });
  // Done in software: app tasks, and parts of the day in the job's own software
  const usesSoftware = (item: TestPlan['items'][number]) => item.type === 'app' || !!item.software?.trim() || !!item.appId?.trim();
  return (
    <div className="p-4 bg-white border border-indigo-200 rounded-xl space-y-3 shadow-sm shadow-indigo-100/60">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">The plan</div>
        <p className="mt-0.5 text-sm font-semibold text-slate-900">{plan.title}</p>
        {plan.description && <p className="mt-1 text-sm text-slate-600 leading-relaxed">{plan.description}</p>}
        <p className="mt-1 text-xs text-slate-500">
          {plan.difficulty && `${plan.difficulty} · `}
          {day ? `A day on the desktop in ${n} timed parts · ${minutes + 3} min` : `${n} ${n === 1 ? 'question' : 'questions'}`}
          {!day && minutes > 0 && ` · about ${minutes} min`}
        </p>
        {skills.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="What it tests">
            {skills.map((skill) => (
              <li key={skill} className="px-2 py-0.5 text-[11px] font-medium text-indigo-800 bg-indigo-50 rounded-full">
                {skill}
              </li>
            ))}
          </ul>
        )}
      </div>
      <ol className="border-t border-slate-100 pt-2 divide-y divide-slate-100">
        {rows.map(({ item, number }) => {
          const isOpen = open.includes(item.ref);
          const name = day ? `Part ${number}` : number ? `Question ${number}` : 'Case study';
          return (
            <li key={item.ref} className={`text-sm ${item.taskRef ? 'ml-5 pl-3 border-l-2 border-slate-100' : ''}`}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen((o) => (isOpen ? o.filter((r) => r !== item.ref) : [...o, item.ref]))}
                className="w-full py-2 flex items-center gap-2 text-left hover:text-indigo-700"
              >
                <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-semibold text-slate-900">{name}</span>
                  <span className="text-slate-700">: {item.title}</span>
                </span>
              </button>
              {isOpen && (
                <div className="pb-3 pl-6 space-y-1.5">
                  <p className="text-[11px] text-slate-500">
                    {!day && label(item.type)}
                    {Number(item.minutes) > 0 && `${!day ? ' · ' : ''}${item.minutes} min`}
                  </p>
                  {usesSoftware(item) && <SoftwarePick item={item} apps={apps} editable={canBuild} onChange={(c) => edit(item.ref, c)} />}
                  {canBuild ? (
                    <PromptBox value={item.brief ?? ''} label={`Prompt for ${name.toLowerCase()}`} onSave={(brief) => edit(item.ref, { brief })} />
                  ) : (
                    item.brief && <p className="text-xs text-slate-600 leading-relaxed">{item.brief}</p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {canBuild && (
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
          <button onClick={onBuild} className="px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1.5">
            <Wand2 className="w-4 h-4" />
            Build in AI test builder
            <ArrowRight className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500">Open a question to change its prompt, or ask below.</span>
        </div>
      )}
    </div>
  );
};

// A plan item's prompt, edited in place and saved when the box loses focus
const PromptBox: React.FC<{ value: string; label: string; onSave: (v: string) => void }> = ({ value, label, onSave }) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [text]);
  return (
    <textarea
      ref={ref}
      aria-label={label}
      value={text}
      rows={2}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text.trim() !== value.trim() && text.trim() && onSave(text.trim())}
      className="w-full resize-none overflow-hidden px-2.5 py-1.5 text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-400 focus:outline-none rounded-lg"
    />
  );
};

// The software a task is done in, as Praxa picked it: an app from its library (ready, quicker and cheaper) or an exact
// copy built for this test. The company can switch to another app of the same kind, or to building the exact copy
const norm = (s = '') => s.trim().toLowerCase().replace(/^(a|an|the)\s+/, '');
const SoftwarePick: React.FC<{ item: TestPlan['items'][number]; apps: ReusableApp[]; editable: boolean; onChange: (c: { appId: string }) => void }> = ({ item, apps, editable, onChange }) => {
  const picked = apps.find((a) => a.id === item.appId);
  const kind = norm(item.softwareKind) || norm(picked?.product);
  // Apps of the same kind (one kind's name inside the other's, e.g. "help desk" and "IT help desk"), the pick always
  const sameKind = apps.filter((a) => a.id === picked?.id || (kind && (norm(a.product).includes(kind) || kind.includes(norm(a.product)))));
  const named = item.software?.trim();
  const generic = !named || /^(a|an)\s/i.test(named) || norm(named) === kind;
  const build = generic ? `Build a new ${kind || 'one'}` : `Build an exact copy of ${named}`;
  const title = kind ? kind[0].toUpperCase() + kind.slice(1) : 'Software';
  if (!editable)
    return (
      <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
        <Monitor className="w-3.5 h-3.5 text-slate-400" aria-hidden />
        {title}: {picked ? `${picked.name} (ready)` : generic ? 'built for this test' : `${named} (built for this test)`}
      </p>
    );
  return (
    <label className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
      <Monitor className="w-3.5 h-3.5 text-slate-400" aria-hidden />
      {title}:
      <select
        value={picked ? picked.id : ''}
        onChange={(e) => onChange({ appId: e.target.value })}
        className="h-7 max-w-full px-2 rounded-lg border border-slate-200 bg-white text-[11px] font-semibold text-slate-800"
      >
        {sameKind.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}: ready now · quicker and cheaper
          </option>
        ))}
        <option value="">{build}: about 5 minutes · uses more credit</option>
      </select>
    </label>
  );
};

// A test built here, in a pop-up over the chat: every question as the candidate meets it, with answers to try out and
// each question editable in place
const PreviewDialog: React.FC<{ test: AssessmentTest; locked: boolean; onChange: (test: AssessmentTest) => void; onOpenPage: () => void; onClose: () => void }> = ({
  test,
  locked,
  onChange,
  onOpenPage,
  onClose,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${test.title}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-[94dvh] sm:h-[90dvh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 flex items-center gap-3">
          <Eye className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 truncate">{test.title}</p>
            <p className="text-[11px] text-slate-500">Preview: answers you try here aren't kept</p>
          </div>
          <button onClick={onOpenPage} className="hidden sm:inline-flex px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            Test page
          </button>
          <button onClick={onClose} aria-label="Close preview" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <DraftPreview test={test} onChange={onChange} locked={locked} flash={false} />
        </div>
      </div>
    </div>
  );
};


// What the job simulation creator is given: the brief and the simulations it should include
const buildBrief = (t: AdvisorTurn) =>
  [t.brief, ...(t.custom?.length ? ['Include:', ...t.custom.map((c) => `- ${c.title}: ${c.brief}`)] : [])].join('\n');

// Candidates the chat suggests, as a table that expands per row: who they are with their strongest scores, why they suit the role
// and what they have no score on yet. A row expands to show the details, with View profile (a pop-up), sending a job's tests, or starting an
// AI test for the gaps
const PeopleList: React.FC<{
  people: SuggestedPerson[];
  candidates: User[];
  onView: (id: string) => void;
  jobs: JobPosting[];
  onInvite: (jobId: string, candidateId: string) => void;
  onBuildTest: (brief: string) => void;
  aiAllowed: boolean;
}> = ({ people, candidates, onView, jobs, onInvite, onBuildTest, aiAllowed }) => {
  const found = people.flatMap((p) => {
    const c = candidates.find((x) => x.id === p.candidateId);
    return c ? [{ c, p }] : [];
  });
  if (!found.length) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Candidates</h3>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className={`grid ${PEOPLE_COLS} gap-3 px-4 py-2 bg-slate-50/80 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400`}>
          <span className="text-center">#</span>
          <span>Candidate</span>
          <span className="hidden sm:block">Top scores</span>
          <span className="hidden sm:block">No score yet</span>
          <span />
        </div>
        <ol className="divide-y divide-slate-100">
          {found.map(({ c, p }, i) => (
            <PersonRow key={c.id} rank={i + 1} c={c} p={p} onView={() => onView(c.id)} jobs={jobs} onInvite={onInvite} onBuildTest={onBuildTest} aiAllowed={aiAllowed} />
          ))}
        </ol>
      </div>
    </div>
  );
};

// Written out in full so Tailwind sees them: rank, candidate, top scores, no score yet, expand
const PEOPLE_COLS = 'grid-cols-[1.25rem_minmax(0,1fr)_1.5rem] sm:grid-cols-[1.25rem_minmax(0,1.4fr)_minmax(0,1.2fr)_5.5rem_1.5rem]';

const PersonRow: React.FC<{
  rank: number;
  c: User;
  p: SuggestedPerson;
  onView: () => void;
  jobs: JobPosting[];
  onInvite: (jobId: string, candidateId: string) => void;
  onBuildTest: (brief: string) => void;
  aiAllowed: boolean;
}> = ({ rank, c, p, onView, jobs, onInvite, onBuildTest, aiAllowed }) => {
  const top = [...c.verifiedSkills].sort((a, b) => b.score - a.score).slice(0, 2);
  const gaps = p.gaps?.length ? p.gaps : c.verifiedSkills.length === 0 ? ['Anything yet'] : [];
  const withTests = jobs.filter((j) => j.status === 'active' && j.testIds.length > 0);
  const [sentTo, setSentTo] = useState<string[]>([]);
  const invited = (j: JobPosting) => sentTo.includes(j.id) || j.invitations.some((x) => x.candidateId === c.id);
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState(() => withTests.find((j) => !invited(j))?.id ?? withTests[0]?.id ?? '');
  const job = withTests.find((j) => j.id === jobId);
  const brief = p.testBrief || `A short test for ${c.name.split(' ')[0]}, ${c.title || 'a candidate'}, checking ${gaps.join(', ')} for the role we discussed.`;

  return (
    <li className={open ? 'bg-slate-50/60' : ''}>
      {/* The row: a click opens the details under it */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setOpen((o) => !o))}
        className={`grid ${PEOPLE_COLS} gap-3 items-center px-4 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors`}
      >
        <span className="text-center text-[11px] font-mono font-bold text-slate-400 tabular-nums">{rank}</span>
        <span className="flex items-center gap-2.5 min-w-0">
          <Pic src={c.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover bg-slate-100 shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900 truncate">{c.name}</span>
            <span className="block text-[11px] text-slate-500 truncate">{[c.title, c.location].filter(Boolean).join(' · ')}</span>
          </span>
        </span>
        <span className="hidden sm:flex flex-wrap gap-1 min-w-0">
          {top.length ? (
            top.map((s) => (
              <span key={s.skillId} className="px-1.5 py-px rounded-full bg-slate-100 text-[10px] text-slate-700 truncate max-w-full">
                {s.skillName} <span className="font-mono font-semibold text-slate-900">{s.score}</span>
              </span>
            ))
          ) : (
            <span className="text-[11px] text-slate-400">No tests yet</span>
          )}
        </span>
        <span className="hidden sm:block text-[11px]">
          {gaps.length ? (
            <span className="px-1.5 py-px rounded-full bg-amber-50 border border-amber-200 font-medium text-amber-900">
              {gaps.length} {gaps.length === 1 ? 'skill' : 'skills'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Check className="w-3 h-3" />
              Covered
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 justify-self-end text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {/* Details: why they fit, what has no score yet, and what to do next */}
      {open && (
        <div className="px-4 pb-4 sm:pl-[3.25rem] space-y-3">
          {top.length > 0 && (
            <div className="sm:hidden flex flex-wrap gap-1">
              {top.map((s) => (
                <span key={s.skillId} className="px-1.5 py-px rounded-full bg-slate-100 text-[10px] text-slate-700">
                  {s.skillName} <span className="font-mono font-semibold text-slate-900">{s.score}</span>
                </span>
              ))}
            </div>
          )}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Why they fit</div>
            <p className="mt-1 text-[13px] text-slate-700 leading-relaxed">{p.reason}</p>
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">No score yet</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {gaps.length ? (
                gaps.map((g) => (
                  <span key={g} className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-900">
                    {g}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                  <Check className="w-3 h-3" />
                  Nothing, all covered
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onView}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700 inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              <Eye className="w-3.5 h-3.5" />
              View profile
            </button>
            <button
              onClick={() => setSending((o) => !o)}
              aria-expanded={sending}
              className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700 inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              <Send className="w-3.5 h-3.5" />
              Send tests
              <ChevronDown className={`w-3 h-3 transition-transform ${sending ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => onBuildTest(brief)}
              title={aiAllowed ? 'Create a test for their gaps with AI' : 'Creating tests with AI needs a subscription'}
              className="create-border h-8 px-3 rounded-lg text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              {aiAllowed ? <Wand2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              Create test with AI
            </button>
          </div>
        </div>
      )}

      {/* Sending a job's tests, opened from the row */}
      {open && sending && (
        <div className="px-4 pb-4 sm:pl-[3.25rem] flex flex-wrap items-center gap-2">
          {withTests.length === 0 ? (
            <span className="text-[11px] text-slate-500">Post a job with tests to send them a request.</span>
          ) : (
            <>
              <span className="text-[11px] text-slate-500">Send the tests for</span>
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                aria-label="Job whose tests to send"
                className="px-2 py-1 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg max-w-[14rem]"
              >
                {withTests.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                    {invited(j) ? ' (sent)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!job || invited(job)) return;
                  onInvite(job.id, c.id);
                  setSentTo((prev) => [...prev, job.id]);
                }}
                disabled={!job || invited(job)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg inline-flex items-center gap-1 ${
                  job && invited(job) ? 'text-emerald-700 bg-emerald-50' : 'text-white bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {job && invited(job) ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                {job && invited(job) ? 'Sent' : 'Send'}
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
};

const TrainingPrice: React.FC<{ price: number }> = ({ price }) => {
  const { money } = useCurrency();
  return (
    <span className="font-semibold text-slate-900">
      {money(price)} <span className="font-normal text-slate-500">per person</span>
    </span>
  );
};
