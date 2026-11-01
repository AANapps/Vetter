import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUp, Check, Library, X } from 'lucide-react';
import { AssessmentTest, Business, JobPosting, QuestionType, TestDifficulty, TestDraft } from '../types';
import { QUESTION_STYLES } from '../lib/questionTypes';
import { DraftPreview, Dropdown, draftProblems, finaliseDraft } from './DraftPreview';
import { jobBrief } from '../lib/testGeneration';
import { ChatState, sendChat } from '../lib/testChat';
import { versionTitle } from '../lib/testLevels';

interface TestGeneratorProps {
  // The job the tests are for; without one, Vetter only writes a test
  job?: JobPosting;
  // Who the new test belongs to: a company, or the Vetter library when undefined
  business?: Business;
  tests: AssessmentTest[];
  onOpenTest: (testId: string) => void;
  // Saves the new test as it is and returns its id
  onSaveTest: (test: AssessmentTest) => string;
  onAddToJob: (jobId: string, testIds: string[]) => void;
  // Opens the new test in the builder first, with the library tests to add once it's saved
  // with the conversation so far, so saving a draft from the builder keeps it
  onEditDraft: (draft: AssessmentTest, alsoAdd: string[], record: TestDraft) => void;
  // Keeps the test and the conversation to carry on later
  // Resolves true once it's saved
  onSaveDraft: (record: TestDraft) => Promise<boolean>;
  // A saved draft to carry on with
  resume?: TestDraft;
  onClose: () => void;
}

const levelFor = (job?: JobPosting): TestDifficulty => {
  const level = job?.experienceLevel?.toLowerCase() ?? '';
  if (/entry|graduate|intern/.test(level)) return 'Beginner';
  if (/senior|staff|lead|principal/.test(level)) return 'Senior';
  if (/mid/.test(level)) return 'Professional';
  return 'Junior';
};

// The question types a company can pick from, in the order shown: answer styles, then hands-on tasks
const PICKABLE: QuestionType[] = ['choice', 'multi', 'text', 'order', 'match', 'sheet', 'database', 'app', 'code', 'sql'];
const PICKABLE_STYLES = PICKABLE.map((type) => QUESTION_STYLES.find((s) => s.type === type)!).filter(Boolean);

// Build a test by talking to Vetter: describe the job, get a draft, then ask for changes until it's right
export const TestGenerator: React.FC<TestGeneratorProps> = ({ job, business, tests, onOpenTest, onSaveTest, onAddToJob, onEditDraft, onSaveDraft, resume, onClose }) => {
  const greeting = job
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
      : { messages: [{ role: 'assistant', text: greeting }], existing: [] }
  );
  // What's been saved, to tell whether closing loses anything
  const [savedChat] = useState(() => chat);
  const [draftId] = useState(() => resume?.id ?? `draft-${Date.now()}`);
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [keepNew, setKeepNew] = useState(true);
  // On phones the chat and the draft share the screen as tabs
  const [pane, setPane] = useState<'chat' | 'draft'>('chat');
  const [flash, setFlash] = useState(false);
  // The question types Vetter may use; all of them to start, so it picks what suits the job
  const [styles, setStyles] = useState<QuestionType[]>(resume?.styles?.length ? resume.styles : PICKABLE);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const draft = chat.draft;
  const started = chat.messages.some((m) => m.role === 'user');
  const ctx = { job: job ? jobBrief(job) : undefined, jobTitle: job?.title, level: levelFor(job), wantExisting: !!job, tests, business, styles };
  // At least one type stays on
  const toggleStyle = (type: QuestionType) => setStyles((prev) => (prev.includes(type) ? (prev.length > 1 ? prev.filter((t) => t !== type) : prev) : PICKABLE.filter((t) => t === type || prev.includes(t))));
  // Questions in the draft of a type since turned off
  const offTypes = [...new Set((draft?.questions ?? []).filter((q) => !styles.includes(q.type)).map((q) => q.type))];

  // The test and conversation as a draft to come back to
  const record = (test: AssessmentTest): TestDraft => ({
    id: draftId,
    businessId: business?.id ?? '',
    ...(job && { jobId: job.id }),
    test,
    messages: chat.messages,
    existing: chat.existing.map((s) => ({ testId: s.test.id, reason: s.reason })),
    ...(chat.research !== undefined && { research: chat.research, researchedFor: chat.researchedFor }),
    styles,
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
    if (draft && chat !== savedChat && !window.confirm('Close without saving? Use Save draft to keep this test and come back to it.')) return;
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [chat.messages.length, working]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || working) return;
    setInput('');
    setWorking(true);
    // The message shows at once; the reply follows
    setChat((c) => ({ ...c, messages: [...c.messages, { role: 'user', text: message }] }));
    const before = chat.draft;
    const next = await sendChat(chat, message, ctx);
    setChat(next);
    // New library picks start ticked, unless the job has them already
    setChosen((prev) => [...new Set([...prev.filter((id) => next.existing.some((s) => s.test.id === id)), ...next.existing.filter((s) => !chat.existing.some((e) => e.test.id === s.test.id) && !job?.testIds.includes(s.test.id)).map((s) => s.test.id)])]);
    if (next.draft !== before) {
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    }
    setWorking(false);
    box.current?.focus();
  };

  const suggestions = !started
    ? job
      ? ['Write a first draft', 'Focus on the hands-on tools they use', 'Keep it under 20 minutes']
      : ['A junior accounts assistant using Excel and Xero', 'A customer support agent in Zendesk', 'A junior data analyst who writes SQL']
    : draft
    ? [...(offTypes.length ? ['Use only the question types I picked'] : []), 'Make it harder', 'Add a hands-on task in the software', 'Make it shorter']
    : [];

  // The company's own edits to the draft, made beside the chat; Vetter sees them on the next message
  const editDraft = (test: AssessmentTest) => setChat((c) => ({ ...c, draft: test }));
  const unfinished = draft && keepNew ? draftProblems(draft) : 0;
  const addCount = chosen.length + (draft && keepNew ? 1 : 0);
  const finish = () => {
    if (unfinished) return;
    const ids = [...chosen];
    if (draft && keepNew) ids.push(onSaveTest(finaliseDraft(draft)));
    if (job && ids.length) onAddToJob(job.id, ids);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Build a test with Vetter" className="bg-white sm:rounded-2xl rounded-t-2xl max-w-7xl w-full h-[calc(100dvh-1rem)] sm:h-[min(52rem,calc(100vh-2rem))] flex flex-col shadow-2xl">
        <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">
              Build a test with Vetter
            </h2>
            <p className="text-xs text-slate-500 truncate">{job ? `${job.title} · ${job.companyName}` : business ? `For ${business.name}'s jobs` : 'For the Vetter test library'}</p>
          </div>
          <button onClick={close} disabled={working} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <fieldset className="px-5 py-2 border-b border-slate-200 flex items-center sm:items-start gap-2 min-w-0">
          <legend className="sr-only">Question types Vetter may use</legend>
          <span className="text-[11px] font-semibold text-slate-500 shrink-0 sm:pt-1.5" aria-hidden="true">
            Question types
          </span>
          <div className="flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible -my-1 py-1 min-w-0">
            {PICKABLE_STYLES.map((s) => {
              const on = styles.includes(s.type);
              return (
                <label
                  key={s.type}
                  title={s.hint}
                  className={`shrink-0 px-2.5 py-1 rounded-full border text-xs cursor-pointer select-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-300 ${
                    on ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-500 hover:border-slate-500'
                  }`}
                >
                  <input type="checkbox" checked={on} disabled={working} onChange={() => toggleStyle(s.type)} className="sr-only" />
                  {s.label}
                </label>
              );
            })}
          </div>
          {styles.length < PICKABLE.length && (
            <button onClick={() => setStyles(PICKABLE)} disabled={working} className="shrink-0 sm:pt-1.5 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900">
              All
            </button>
          )}
        </fieldset>

        <div className="lg:hidden flex border-b border-slate-200 text-sm font-semibold" role="tablist">
          {(['chat', 'draft'] as const).map((p) => (
            <button key={p} role="tab" aria-selected={pane === p} onClick={() => setPane(p)} className={`flex-1 py-2 ${pane === p ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500'}`}>
              {p === 'chat' ? 'Chat' : draft ? `Test · ${draft.questions.length} questions` : 'Test'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,27rem)_minmax(0,1fr)]">
          {/* The conversation */}
          <section className={`${pane === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 lg:border-r border-slate-200`}>
            <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3" aria-live="polite">
              {chat.messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-md bg-indigo-600 text-white text-sm whitespace-pre-wrap">{m.text}</div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2.5">
                    <VAvatar />
                    <div className="max-w-[85%] min-w-0">
                      <div className="px-3.5 py-2 rounded-2xl rounded-tl-md bg-slate-100 text-slate-800 text-sm whitespace-pre-wrap">{m.text}</div>
                      {m.note && (
                        <p className="mt-1 text-[11px] text-amber-700 flex items-start gap-1">
                          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                          {m.note}
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}
              {working && (
                <div className="flex gap-2.5">
                  <VAvatar pulse />
                  <div className="px-3.5 py-2 rounded-2xl rounded-tl-md bg-slate-100 text-sm text-slate-600">
                    <WorkingStep first={!draft} />
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 pb-4 pt-2 border-t border-slate-100">
              {suggestions.length > 0 && !working && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} className="shrink-0 px-2.5 py-1 rounded-full border border-slate-200 text-xs text-slate-700 hover:border-indigo-400 hover:text-indigo-700">
                      {s}
                    </button>
                  ))}
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
                  placeholder={draft ? 'Ask for a change, e.g. "make question 2 harder"' : job ? 'What matters most in this hire?' : 'Describe the role or the test you want'}
                  className="flex-1 resize-none px-2 py-1.5 text-sm text-slate-900 bg-transparent focus:outline-none"
                />
                <button type="submit" disabled={!input.trim() || working} aria-label="Send" className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30">
                  <ArrowUp className="w-4 h-4" />
                </button>
              </form>
            </div>
          </section>

          {/* The test as the candidate will see it, updating as the conversation goes and editable in place */}
          <section className={`${pane === 'draft' ? 'block' : 'hidden'} lg:block min-h-0 bg-slate-50/60`}>
            {draft ? (
              <DraftPreview
                test={draft}
                onChange={editDraft}
                locked={working}
                flash={flash}
                onOpenBuilder={() => (onEditDraft(finaliseDraft(draft), chosen, record(draft)), onClose())}
                toolbarExtra={
                  job && chat.existing.length > 0 ? (
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
                {job && chat.existing.length > 0 ? (
                  <LibraryPicks job={job} existing={chat.existing} chosen={chosen} setChosen={setChosen} onOpenTest={onOpenTest} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-12">
                    <p className="text-sm font-semibold text-slate-700">Your test appears here, as candidates will see it</p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Every question Vetter writes is checked before it shows: coding answers and SQL queries are run, app simulations are tried out, and anything that fails is left out.
                      You can edit any question yourself as you go.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center gap-3">
          <p className="text-[11px] text-slate-500 hidden sm:block">{draft ? 'Ask Vetter for changes, or switch to Edit to change questions yourself.' : 'Nothing is saved until you say so.'}</p>
          <button
            onClick={saveDraft}
            disabled={!draft || working || savingDraft}
            className="ml-auto px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 disabled:opacity-40 rounded-lg"
          >
            {savingDraft ? 'Saving…' : 'Save draft'}
          </button>
          {job ? (
            <button
              onClick={finish}
              disabled={addCount === 0 || working || unfinished > 0}
              title={unfinished ? 'Finish the questions marked under Structure first' : undefined}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {addCount === 0 ? 'Nothing picked yet' : `Add ${addCount} ${addCount === 1 ? 'test' : 'tests'} to the job`}
            </button>
          ) : (
            <button onClick={finish} disabled={!draft || working || unfinished > 0} title={unfinished ? 'Finish the questions marked under Structure first' : undefined} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Save test
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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
                {test.category} &middot; ~{test.estimatedMinutes} min &middot; {test.type === 'custom' ? 'your test' : 'Vetter test'}
                {onJob && ' · already on this job'}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);

// Vetter in the chat: a V where the avatar goes, pulsing while it works
const VAvatar: React.FC<{ pulse?: boolean }> = ({ pulse }) => (
  <span
    aria-hidden="true"
    className={`mt-0.5 w-7 h-7 shrink-0 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}
  >
    V
  </span>
);

// What Vetter says while it works: the real steps first, then it keeps going round these until it's done
const FIRST_STEPS = ['Reading the job…', 'Looking up the software it uses…', 'Choosing what to test…', 'Writing the questions…', 'Checking every answer…'];
const EDIT_STEPS = ['Thinking it over…', 'Updating the draft…', 'Checking the new questions…'];
const STILL_GOING = ['Building…', 'Working on it…', 'Putting it together…', 'Polishing the questions…', 'Double-checking…', 'Finishing up…', 'Nearly there…'];
const STEP_MS = 10000;

const WorkingStep: React.FC<{ first: boolean }> = ({ first }) => {
  const steps = first ? FIRST_STEPS : EDIT_STEPS;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick(0);
    const timer = setInterval(() => setTick((t) => t + 1), STEP_MS);
    return () => clearInterval(timer);
  }, [first]);
  return <span>{tick < steps.length ? steps[tick] : STILL_GOING[(tick - steps.length) % STILL_GOING.length]}</span>;
};
