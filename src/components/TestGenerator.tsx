import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUp, Check, Library, X } from 'lucide-react';
import { AssessmentTest, Business, JobPosting, QuestionType, TEST_DIFFICULTIES, TestDifficulty, TestDraft } from '../types';
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
  onClose: () => void;
}

// How many questions a company can ask for, counting the questions about a case or task
const COUNTS = [5, 10, 15, 20, 25, 30];
const countOf = (test: AssessmentTest) => test.questions.filter((q) => q.type !== 'case').length;

// The question types a company can pick from, in the order shown: answer styles, then hands-on tasks
const PICKABLE: QuestionType[] = ['choice', 'multi', 'text', 'written', 'order', 'match', 'case', 'sheet', 'database', 'app', 'code', 'sql'];
const PICKABLE_STYLES = PICKABLE.map((type) => QUESTION_STYLES.find((s) => s.type === type)!).filter(Boolean);

// Build a test by talking to Vetter: describe the job, get a draft, then ask for changes until it's right
export const TestGenerator: React.FC<TestGeneratorProps> = ({ job, business, tests, onOpenTest, onSaveTest, onAddToJob, editing, onUpdateTest, onEditDraft, onSaveDraft, resume, seed, autoSend, onClose }) => {
  // The saved test being changed, opened from its job or from a draft of changes to it
  const [original] = useState(() => editing ?? (resume?.editsTestId ? tests.find((t) => t.id === resume.editsTestId) : undefined));
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
      : { messages: [{ role: 'assistant', text: greeting }], existing: [], ...(original && { draft: original }) }
  );
  // What's been saved, to tell whether closing loses anything
  const [savedChat] = useState(() => chat);
  const [draftId] = useState(() => resume?.id ?? `draft-${Date.now()}`);
  const [input, setInput] = useState(seed ?? '');
  const [working, setWorking] = useState(false);
  // What Vetter is doing right now, as it reports it
  const [stage, setStage] = useState('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [keepNew, setKeepNew] = useState(true);
  // On phones the chat and the draft share the screen as tabs
  const [pane, setPane] = useState<'chat' | 'draft'>('chat');
  const [flash, setFlash] = useState(false);
  // The question types Vetter may use, how many questions and the level: the company picks all three before Vetter
  // writes anything (a saved test being changed starts from what it has)
  const [styles, setStyles] = useState<QuestionType[]>(() =>
    resume?.styles?.length ? resume.styles : original ? PICKABLE.filter((t) => original.questions.some((q) => q.type === t)) : []
  );
  const [questionCount, setQuestionCount] = useState<number | undefined>(() => resume?.questionCount ?? (original ? countOf(original) : undefined));
  const [difficulty, setDifficulty] = useState<TestDifficulty | undefined>(() => resume?.difficulty ?? resume?.test.difficulty ?? original?.difficulty);
  const ready = styles.length > 0 && !!questionCount && !!difficulty;
  // What's still to pick, said above the message box
  const missing = [!styles.length && 'the question types', !questionCount && 'how many questions', !difficulty && 'the difficulty'].filter(Boolean) as string[];
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const draft = chat.draft;
  const started = chat.messages.some((m) => m.role === 'user');
  // Changing a saved test doesn't pick library tests to go with it
  const ctx = { job: job ? jobBrief(job) : undefined, jobTitle: job?.title, level: difficulty ?? 'Junior', questionCount, wantExisting: !!job && !original, tests, business, styles };
  const toggleStyle = (type: QuestionType) => setStyles((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : PICKABLE.filter((t) => t === type || prev.includes(t))));
  // Questions in the draft of a type since turned off
  const offTypes = [...new Set((draft?.questions ?? []).filter((q) => !styles.includes(q.type)).map((q) => q.type))];

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
        }
      : test;

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
    ...(questionCount && { questionCount }),
    ...(difficulty && { difficulty }),
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
    if (!message || working || !ready) return;
    setInput('');
    setWorking(true);
    // The message shows at once; the reply follows
    setChat((c) => ({ ...c, messages: [...c.messages, { role: 'user', text: message }] }));
    const before = chat.draft;
    setStage('');
    const next = await sendChat(chat, message, ctx, setStage);
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

  // Once only, even if React mounts the chat twice
  const autoSent = useRef(false);
  useEffect(() => {
    // Only once the types, number and level are picked; until then the message waits in the box
    if (!autoSend || !seed || resume || autoSent.current || !ready) return;
    autoSent.current = true;
    send(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestions = original && !started
    ? ['Make it harder', 'Make it shorter', 'Rewrite the weakest question']
    : !started
    ? job
      ? ['Write a first draft', 'Focus on the hands-on tools they use', 'Keep it under 20 minutes']
      : ['A junior accounts assistant using Excel and Xero', 'A customer support agent in Zendesk', 'A junior data analyst who writes SQL']
    : draft
    ? [
        ...(offTypes.length ? ['Use only the question types I picked'] : []),
        ...(draft.difficulty !== difficulty ? [`Make it ${difficulty} level`] : []),
        ...(questionCount && countOf(draft) !== questionCount ? [`Make it ${questionCount} questions`] : []),
        'Make it harder',
        ...(styles.includes('case') ? ['Add another case study'] : []),
        ...(styles.some((t) => t === 'app' || t === 'sheet' || t === 'database') ? ['Add a hands-on task in the software'] : []),
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
      if (draft) onUpdateTest(asSaved(finaliseDraft(draft)));
      onClose();
      return;
    }
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
            <h2 className="text-xl font-bold text-slate-900">
              {original ? `Edit ${original.title}` : 'Build a test with Vetter'}
            </h2>
            <p className="text-sm text-slate-500 truncate">{job ? `${job.title} · ${job.companyName}` : business ? `For ${business.name}'s jobs` : 'For the Vetter test library'}</p>
          </div>
          <button onClick={close} disabled={working} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* What Vetter may write: picked before it starts, locked while it works, changeable once it's done */}
        <div className={`px-5 py-2 border-b border-slate-200 space-y-1.5 ${working ? 'opacity-50' : ''}`} aria-busy={working}>
          <fieldset className="flex items-center sm:items-start gap-2 min-w-0">
            <legend className="sr-only">Question types Vetter may use</legend>
            <span className={`w-28 text-xs font-semibold shrink-0 sm:pt-1.5 ${styles.length ? 'text-slate-500' : 'text-amber-700'}`} aria-hidden="true">
              Question types
            </span>
            <div className="flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible -my-1 py-1 min-w-0">
              {PICKABLE_STYLES.map((s) => (
                <Chip key={s.type} type="checkbox" on={styles.includes(s.type)} disabled={working} title={s.hint} onChange={() => toggleStyle(s.type)}>
                  {s.label}
                </Chip>
              ))}
            </div>
            <button
              onClick={() => setStyles(styles.length === PICKABLE.length ? [] : PICKABLE)}
              disabled={working}
              className="shrink-0 sm:pt-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:cursor-not-allowed"
            >
              {styles.length === PICKABLE.length ? 'None' : 'All'}
            </button>
          </fieldset>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-6">
            <fieldset className="flex items-center gap-2 min-w-0">
              <legend className="sr-only">How many questions</legend>
              <span className={`w-28 text-xs font-semibold shrink-0 ${questionCount ? 'text-slate-500' : 'text-amber-700'}`} aria-hidden="true">
                Questions
              </span>
              <div className="flex gap-1.5 overflow-x-auto -my-1 py-1 min-w-0">
                {COUNTS.map((n) => (
                  <Chip key={n} type="radio" name="question-count" on={questionCount === n} disabled={working} onChange={() => setQuestionCount(n)}>
                    {n}
                  </Chip>
                ))}
              </div>
            </fieldset>
            <fieldset className="flex items-center gap-2 min-w-0">
              <legend className="sr-only">Difficulty</legend>
              <span className={`w-28 sm:w-auto text-xs font-semibold shrink-0 ${difficulty ? 'text-slate-500' : 'text-amber-700'}`} aria-hidden="true">
                Difficulty
              </span>
              <div className="flex gap-1.5 overflow-x-auto -my-1 py-1 min-w-0">
                {TEST_DIFFICULTIES.map((d) => (
                  <Chip key={d} type="radio" name="difficulty" on={difficulty === d} disabled={working} onChange={() => setDifficulty(d)}>
                    {d}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <div className="lg:hidden flex border-b border-slate-200 text-base font-semibold" role="tablist">
          {(['chat', 'draft'] as const).map((p) => (
            <button key={p} role="tab" aria-selected={pane === p} onClick={() => setPane(p)} className={`flex-1 py-2 ${pane === p ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500'}`}>
              {p === 'chat' ? 'Chat' : draft ? `Test · ${draft.questions.length} questions` : 'Test'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
          {/* The conversation */}
          <section className={`${pane === 'chat' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0 lg:border-r border-slate-200`}>
            <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-5" aria-live="polite">
              {chat.messages.map((m, i) =>
                m.role === 'user' ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] px-4 py-2.5 rounded-3xl rounded-br-lg bg-indigo-600 text-white text-base leading-[1.65] whitespace-pre-wrap">{m.text}</div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-2.5">
                    <VAvatar />
                    <div className="max-w-[85%] min-w-0">
                      <div className="px-4 py-2.5 rounded-3xl rounded-tl-lg bg-slate-100 text-slate-800 text-base leading-[1.65] whitespace-pre-wrap">{m.text}</div>
                      {m.note && (
                        <p className="mt-1.5 text-sm text-amber-700 flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
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
                  <div className="px-4 py-2.5 rounded-3xl rounded-tl-lg bg-slate-100 text-base leading-[1.65] text-slate-600">
                    <WorkingStep first={!draft} stage={stage} />
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 pb-4 pt-2 border-t border-slate-100">
              {!ready && !working && (
                <p className="pb-2 text-sm text-amber-700 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  Pick {missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing[missing.length - 1]}` : missing[0]} at the top, then Vetter can {draft ? 'carry on' : 'start writing'}.
                </p>
              )}
              {suggestions.length > 0 && !working && ready && (
                <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => send(s)} className="shrink-0 px-3 py-1.5 rounded-full border border-slate-200 text-sm text-slate-700 hover:border-indigo-400 hover:text-indigo-700">
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
                className="flex items-end gap-2 p-2 border border-slate-300 rounded-2xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100"
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
                  className="flex-1 resize-none px-2.5 py-2 text-base leading-[1.6] text-slate-900 bg-transparent focus:outline-none"
                />
                <button type="submit" disabled={!input.trim() || working || !ready} aria-label="Send" className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30">
                  <ArrowUp className="w-5 h-5" />
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
                onOpenBuilder={() => (onEditDraft(asSaved(finaliseDraft(draft)), chosen, record(draft)), onClose())}
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
                {job && chat.existing.length > 0 ? (
                  <LibraryPicks job={job} existing={chat.existing} chosen={chosen} setChosen={setChosen} onOpenTest={onOpenTest} />
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
          </section>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center gap-3">
          <p className="text-sm text-slate-500 hidden sm:block">{draft ? 'Ask Vetter for changes, or switch to Edit to change questions yourself.' : 'Nothing is saved until you say so.'}</p>
          <button
            onClick={saveDraft}
            disabled={!draft || working || savingDraft}
            className="ml-auto px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 disabled:opacity-40 rounded-lg"
          >
            {savingDraft ? 'Saving…' : 'Save draft'}
          </button>
          {original ? (
            <button
              onClick={finish}
              disabled={!draft || chat.draft === original || working || unfinished > 0}
              title={unfinished ? 'Finish the questions marked under Structure first' : undefined}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Save changes
            </button>
          ) : job ? (
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

// A pill to pick a question type, a number or a level; greyed out and unclickable while Vetter is working
const Chip: React.FC<{ type: 'checkbox' | 'radio'; name?: string; on: boolean; disabled: boolean; title?: string; onChange: () => void; children: React.ReactNode }> = ({ type, name, on, disabled, title, onChange, children }) => (
  <label
    title={title}
    className={`shrink-0 px-3 py-1 rounded-full border text-sm select-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-300 ${
      disabled ? 'cursor-not-allowed' : 'cursor-pointer'
    } ${on ? 'bg-slate-900 border-slate-900 text-white' : `bg-white border-slate-300 text-slate-500 ${disabled ? '' : 'hover:border-slate-500'}`}`}
  >
    <input type={type} name={name} checked={on} disabled={disabled} onChange={onChange} className="sr-only" />
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
    className={`mt-0.5 w-8 h-8 shrink-0 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center ${pulse ? 'animate-pulse' : ''}`}
  >
    V
  </span>
);

// What Vetter says while it works: the real steps first, then it keeps going round these until it's done
const FIRST_STEPS = ['Reading the job…', 'Working out what this hire really needs…', 'Looking up the software it uses…', 'Planning the sections…', 'Writing the case studies…', 'Writing the questions…', 'Building the interactive tasks…', 'Trying out every task…', 'Checking every answer…'];
const EDIT_STEPS = ['Thinking it over…', 'Updating the draft…', 'Building any new tasks…', 'Checking the new questions…'];
const STILL_GOING = ['Building…', 'Working on it…', 'Putting it together…', 'Polishing the questions…', 'Double-checking…', 'Finishing up…', 'Nearly there…'];
const STEP_MS = 10000;

// The stage Vetter reports when it has one, with how long it's been going, since a thorough test takes a few minutes
const WorkingStep: React.FC<{ first: boolean; stage: string }> = ({ first, stage }) => {
  const steps = first ? FIRST_STEPS : EDIT_STEPS;
  const [tick, setTick] = useState(0);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setTick(0);
    setSeconds(0);
    const timer = setInterval(() => setTick((t) => t + 1), STEP_MS);
    const clock = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => (clearInterval(timer), clearInterval(clock));
  }, [first]);
  const text = stage || (tick < steps.length ? steps[tick] : STILL_GOING[(tick - steps.length) % STILL_GOING.length]);
  return (
    <span>
      {text}
      {seconds >= 5 && <span className="ml-2 text-slate-400 tabular-nums">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>}
    </span>
  );
};
