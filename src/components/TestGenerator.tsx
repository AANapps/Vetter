import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowUp, Check, ChevronDown, Library, Pencil, Sparkles, X } from 'lucide-react';
import { AssessmentTest, Business, JobPosting, Question, TestDifficulty } from '../types';
import { QUESTION_STYLES } from '../lib/questionTypes';
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
  onEditDraft: (draft: AssessmentTest, alsoAdd: string[]) => void;
  onClose: () => void;
}

const levelFor = (job?: JobPosting): TestDifficulty => {
  const level = job?.experienceLevel?.toLowerCase() ?? '';
  if (/entry|graduate|intern/.test(level)) return 'Beginner';
  if (/senior|staff|lead|principal/.test(level)) return 'Senior';
  if (/mid/.test(level)) return 'Professional';
  return 'Junior';
};

const styleLabel = (q: Question) => QUESTION_STYLES.find((s) => s.type === q.type)?.label ?? q.type;

// Build a test by talking to Vetter: describe the job, get a draft, then ask for changes until it's right
export const TestGenerator: React.FC<TestGeneratorProps> = ({ job, business, tests, onOpenTest, onSaveTest, onAddToJob, onEditDraft, onClose }) => {
  const greeting = job
    ? `I've read the ${job.title} job description. Tell me what matters most in this hire, or just ask me to write a first draft and we'll refine it together.`
    : `Tell me about the role or the test you want: what the person does day to day, the tools they use and the level. I'll write a first draft and we'll refine it together.`;
  const [chat, setChat] = useState<ChatState>({ messages: [{ role: 'assistant', text: greeting }], existing: [] });
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [keepNew, setKeepNew] = useState(true);
  // On phones the chat and the draft share the screen as tabs
  const [pane, setPane] = useState<'chat' | 'draft'>('chat');
  const [flash, setFlash] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  const ctx = { job: job ? jobBrief(job) : undefined, jobTitle: job?.title, level: levelFor(job), wantExisting: !!job, tests, business };
  const draft = chat.draft;
  const started = chat.messages.some((m) => m.role === 'user');

  const close = () => {
    if (working) return;
    if (draft && !window.confirm('Close without saving this test?')) return;
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
    ? ['Make it harder', 'Add a hands-on task in the software', 'Make it shorter']
    : [];

  const addCount = chosen.length + (draft && keepNew ? 1 : 0);
  const finish = () => {
    const ids = [...chosen];
    if (draft && keepNew) ids.push(onSaveTest(draft));
    if (job && ids.length) onAddToJob(job.id, ids);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Build a test with Vetter" className="bg-white sm:rounded-2xl rounded-t-2xl max-w-5xl w-full h-[calc(100dvh-1rem)] sm:h-[min(52rem,calc(100vh-2rem))] flex flex-col shadow-2xl">
        <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Build a test with Vetter
            </h2>
            <p className="text-xs text-slate-500 truncate">{job ? `${job.title} · ${job.companyName}` : business ? `For ${business.name}'s jobs` : 'For the Vetter test library'}</p>
          </div>
          <button onClick={close} disabled={working} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="lg:hidden flex border-b border-slate-200 text-sm font-semibold" role="tablist">
          {(['chat', 'draft'] as const).map((p) => (
            <button key={p} role="tab" aria-selected={pane === p} onClick={() => setPane(p)} className={`flex-1 py-2 ${pane === p ? 'text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-500'}`}>
              {p === 'chat' ? 'Chat' : draft ? `Draft · ${draft.questions.length} questions` : 'Draft'}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
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
                    <span className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    </span>
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
                  <span className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                  </span>
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

          {/* The draft, updating as the conversation goes */}
          <section className={`${pane === 'draft' ? 'block' : 'hidden'} lg:block min-h-0 overflow-y-auto px-5 py-4 bg-slate-50/60 space-y-5`}>
            {!draft && !chat.existing.length ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 py-12">
                <Sparkles className="w-8 h-8 text-slate-300" />
                <p className="text-sm font-semibold text-slate-700">Your test appears here</p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Every question Vetter writes is checked before it shows: coding answers and SQL queries are run, app simulations are tried out, and anything that fails is left out.
                </p>
              </div>
            ) : (
              <>
                {draft && (
                  <div className={`border rounded-xl bg-white p-4 space-y-3 transition-shadow ${flash ? 'border-indigo-400 shadow-[0_0_0_4px_rgba(99,102,241,0.15)]' : 'border-slate-200'}`}>
                    <div className="flex items-start gap-3">
                      {job && <input type="checkbox" checked={keepNew} onChange={(e) => setKeepNew(e.target.checked)} aria-label="Add the new test" className="mt-1 accent-indigo-600" />}
                      <div className="min-w-0">
                        <div className="text-base font-bold text-slate-900">{draft.title}</div>
                        <p className="text-xs text-slate-600">{draft.description}</p>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {draft.category} &middot; {draft.difficulty} &middot; {draft.questions.length} questions &middot; ~{draft.estimatedMinutes} min &middot; pass {draft.passingScore}%
                        </div>
                      </div>
                    </div>
                    <ol className="space-y-1.5">
                      {draft.questions.map((q, i) => (
                        <QuestionRow key={q.id} q={q} n={i + 1} />
                      ))}
                    </ol>
                    <button onClick={() => (onEditDraft(draft, chosen), onClose())} disabled={working} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 disabled:opacity-40">
                      <Pencil className="w-3.5 h-3.5" />
                      Edit questions by hand in the builder
                    </button>
                  </div>
                )}

                {job && chat.existing.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Library className="w-4 h-4 text-indigo-600" />
                      Also from Vetter's library
                    </h3>
                    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                      {chat.existing.map(({ test, reason }) => {
                        const onJob = job.testIds.includes(test.id);
                        return (
                          <li key={test.id} className="px-4 py-3 flex items-start gap-3">
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
                )}
              </>
            )}
          </section>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center gap-3">
          <p className="text-[11px] text-slate-500 hidden sm:block">{draft ? 'Keep asking for changes, or save when it looks right.' : 'Nothing is saved until you say so.'}</p>
          {job ? (
            <button
              onClick={finish}
              disabled={addCount === 0 || working}
              className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {addCount === 0 ? 'Nothing picked yet' : `Add ${addCount} ${addCount === 1 ? 'test' : 'tests'} to the job`}
            </button>
          ) : (
            <button onClick={finish} disabled={!draft || working} className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              Save test
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// One question of the draft: its title, opening to show what the candidate sees and the answer
const QuestionRow: React.FC<{ q: Question; n: number }> = ({ q, n }) => {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-slate-100">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full px-3 py-2 flex items-start gap-2 text-left hover:bg-slate-50 rounded-lg">
        <span className="font-mono text-xs text-slate-400 mt-0.5">{n}.</span>
        <span className="min-w-0 flex-1 text-sm text-slate-800">
          {q.title}
          <span className="block text-[11px] text-slate-400">
            {styleLabel(q)}
            {q.type === 'app' && q.contextData ? ` · ${q.contextData}` : ''} · {q.timeLimitMinutes} min · {q.weight}%
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 pl-8 space-y-2 text-xs text-slate-700">
          <p className="whitespace-pre-wrap">{q.prompt}</p>
          {q.options && (
            <ul className="space-y-0.5">
              {q.options.map((o, i) => {
                const right = q.type === 'choice' ? q.correctOption === i : q.correctOptions?.includes(i);
                return (
                  <li key={i} className={right ? 'text-emerald-700 font-semibold' : ''}>
                    {right ? '✓' : '·'} {o}
                  </li>
                );
              })}
            </ul>
          )}
          {q.acceptedAnswers && <p className="text-emerald-700">Accepted: {q.acceptedAnswers.join(', ')}</p>}
          {q.items && <p className="text-emerald-700">Right order: {q.items.join(' → ')}</p>}
          {q.pairs && (
            <ul>
              {q.pairs.map((p, i) => (
                <li key={i}>
                  {p.left} → <span className="text-emerald-700">{p.right}</span>
                </li>
              ))}
            </ul>
          )}
          {(q.type === 'code' || q.type === 'sql' || q.type === 'app') && q.testCases.length > 0 && (
            <p className="text-slate-500">Checked on: {q.testCases.map((tc) => tc.description).join('; ')}</p>
          )}
        </div>
      )}
    </li>
  );
};

const FIRST_STEPS = ['Reading the job…', 'Looking up the software it uses…', 'Choosing what to test…', 'Writing the questions…', 'Checking every answer…', 'Nearly there…'];
const EDIT_STEPS = ['Thinking it over…', 'Updating the draft…', 'Checking the new questions…', 'Nearly there…'];

// What Vetter is doing, moving on every few seconds and holding on the last step
const WorkingStep: React.FC<{ first: boolean }> = ({ first }) => {
  const steps = first ? FIRST_STEPS : EDIT_STEPS;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, steps.length - 1)), first ? 8000 : 5000);
    return () => clearInterval(timer);
  }, [first, steps.length]);
  return <span>{steps[step]}</span>;
};
