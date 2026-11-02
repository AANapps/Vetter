import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Briefcase, ClipboardCheck, Eye, Lock, MessageSquarePlus, Pencil, Plus, Sparkles, Users, Wand2 } from 'lucide-react';
import { AssessmentTest, Business, JobPosting } from '../types';
import { AdvisorTurn, CUSTOM_KIND_LABELS, CustomIdea, askAdvisor } from '../lib/testAdvisor';

interface BusinessHomeProps {
  business?: Business;
  jobs: JobPosting[];
  tests: AssessmentTest[];
  // How many tests the company has written, and drafts it's still writing
  ownTestCount: number;
  draftCount: number;
  // AI test creation comes with a paid plan (the Vetter team always has it); the advice here doesn't need one
  aiAllowed: boolean;
  planName: string;
  // The conversation, kept by the app so it survives moving between pages
  turns: AdvisorTurn[];
  onTurns: (turns: AdvisorTurn[]) => void;
  onUseTest: (test: AssessmentTest) => void;
  onEditCopy: (test: AssessmentTest) => void;
  onBuildWithAI: (brief: string) => void;
  onCreateOwn: () => void;
  onSeePlans: () => void;
  onOpenTest: (testId: string) => void;
  onGoTo: (tab: 'business-jobs' | 'business-tests' | 'business-candidates') => void;
}

const STARTERS = [
  'A junior front-end developer who knows React',
  'A data analyst who works in Excel and SQL',
  'A customer support agent using a help desk',
  'A graduate financial analyst',
];

// A company's home: a chat with Vetter about who they're hiring, which answers with a roadmap, the library tests that
// fit and custom pieces worth building. The menu sits on the right
export const BusinessHome: React.FC<BusinessHomeProps> = ({
  business,
  jobs,
  tests,
  ownTestCount,
  draftCount,
  aiAllowed,
  planName,
  turns,
  onTurns,
  onUseTest,
  onEditCopy,
  onBuildWithAI,
  onCreateOwn,
  onSeePlans,
  onOpenTest,
  onGoTo,
}) => {
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (turns.length) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length, thinking]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    const next: AdvisorTurn[] = [...turns, { role: 'user', text: t }];
    onTurns(next);
    setInput('');
    setThinking(true);
    const reply = await askAdvisor(next, tests, business);
    onTurns([...next, reply]);
    setThinking(false);
    inputRef.current?.focus();
  };

  const openJobs = jobs.filter((j) => j.status === 'active').length;
  const menu = [
    { tab: 'business-jobs' as const, label: business ? 'Your jobs' : 'All jobs', icon: Briefcase, note: `${openJobs} open` },
    { tab: 'business-tests' as const, label: 'Tests', icon: ClipboardCheck, note: `${ownTestCount} yours${draftCount ? ` · ${draftCount} drafts` : ''}` },
    { tab: 'business-candidates' as const, label: 'Candidates', icon: Users, note: 'Leads and rankings' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17rem] gap-8">
      {/* The chat */}
      <section className="min-w-0 flex flex-col min-h-[calc(100vh-7.5rem)]">
        <div className="flex-1 py-8 space-y-6">
          {turns.length === 0 ? (
            <div className="pt-10 sm:pt-20 space-y-6 text-center">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Who are you hiring?</h1>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Tell Vetter the role and level. You&rsquo;ll get a short plan for testing it, the ready-made tests that fit, and any simulations worth
                  building.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-full hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* On a phone the menu isn't beside the chat, so its two ways to write a test are here */}
              <div className="lg:hidden flex flex-wrap justify-center gap-2 pt-2">
                <button onClick={onCreateOwn} className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Create a test yourself
                </button>
                <button
                  onClick={() => (aiAllowed ? onBuildWithAI('') : onSeePlans())}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg flex items-center gap-1.5"
                >
                  {aiAllowed ? <Sparkles className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  Write a test with AI
                </button>
              </div>
            </div>
          ) : (
            turns.map((turn, i) =>
              turn.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] px-4 py-2.5 bg-indigo-600 text-white text-sm rounded-2xl rounded-br-md whitespace-pre-wrap">{turn.text}</p>
                </div>
              ) : (
                <AdvisorReply
                  key={i}
                  turn={turn}
                  aiAllowed={aiAllowed}
                  onUseTest={onUseTest}
                  onEditCopy={onEditCopy}
                  onBuildWithAI={onBuildWithAI}
                  onSeePlans={onSeePlans}
                  onOpenTest={onOpenTest}
                />
              )
            )
          )}
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="w-6 h-6 rounded-md bg-indigo-600 text-white text-[11px] font-extrabold flex items-center justify-center">V</span>
              <span className="animate-pulse">Looking through the library…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="sticky bottom-16 md:bottom-0 pb-4 pt-2 bg-white"
        >
          <div className="flex items-end gap-2 p-2 bg-white border border-slate-300 rounded-2xl shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
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
              placeholder={turns.length ? 'Ask a follow-up, e.g. make it more senior, or add Figma' : 'e.g. A junior front-end developer test'}
              aria-label="Message Vetter"
              className="flex-1 resize-none max-h-40 px-2 py-1.5 text-sm bg-transparent focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              aria-label="Send"
              className="w-9 h-9 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-40"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 text-center">
            Advice is free. {aiAllowed ? 'AI test creation is on your plan.' : 'Creating custom tests with AI needs a subscription.'}
          </p>
        </form>
      </section>

      {/* The menu, on the right */}
      <aside className="hidden lg:block py-8">
        <div className="sticky top-20 space-y-5">
          <nav aria-label="Company pages" className="space-y-1">
            {menu.map((m) => (
              <button
                key={m.tab}
                onClick={() => onGoTo(m.tab)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-slate-50 transition-colors group"
              >
                <m.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">{m.label}</span>
                  <span className="block text-[11px] text-slate-500">{m.note}</span>
                </span>
              </button>
            ))}
          </nav>

          <div className="pt-4 border-t border-slate-200 space-y-2">
            <button
              onClick={onCreateOwn}
              className="w-full px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create a test yourself
            </button>
            <button
              onClick={() => (aiAllowed ? onBuildWithAI('') : onSeePlans())}
              className="w-full px-3 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-2"
            >
              {aiAllowed ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              Write a test with AI
            </button>
            {turns.length > 0 && (
              <button
                onClick={() => onTurns([])}
                className="w-full px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 rounded-lg flex items-center gap-2"
              >
                <MessageSquarePlus className="w-4 h-4" />
                New chat
              </button>
            )}
          </div>

          <div className={`p-4 rounded-xl text-xs space-y-1.5 ${aiAllowed ? 'bg-emerald-50 text-emerald-900' : 'bg-slate-50 text-slate-600'}`}>
            <div className="font-semibold text-slate-900">{planName}</div>
            {aiAllowed ? (
              <p>AI-written tests and app simulations are included.</p>
            ) : (
              <>
                <p>Ready-made tests, editing copies and writing your own are free. Custom tests written by AI need a subscription.</p>
                <button onClick={onSeePlans} className="font-semibold text-indigo-700 hover:text-indigo-900">
                  See plans &rarr;
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

const AdvisorReply: React.FC<{
  turn: AdvisorTurn;
  aiAllowed: boolean;
  onUseTest: (test: AssessmentTest) => void;
  onEditCopy: (test: AssessmentTest) => void;
  onBuildWithAI: (brief: string) => void;
  onSeePlans: () => void;
  onOpenTest: (testId: string) => void;
}> = ({ turn, aiAllowed, onUseTest, onEditCopy, onBuildWithAI, onSeePlans, onOpenTest }) => (
  <div className="flex gap-3">
    <span className="w-7 h-7 shrink-0 rounded-lg bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center">V</span>
    <div className="min-w-0 flex-1 space-y-4">
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${turn.error ? 'text-rose-700' : 'text-slate-800'}`}>{turn.text}</p>

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
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ready-made tests</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {turn.existing.map(({ test, reason }) => (
              <li key={test.id} className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col gap-2">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{test.title}</div>
                  <div className="text-[11px] text-slate-500">
                    {test.type === 'custom' ? 'Your test' : 'Vetter'} &middot; {test.difficulty} &middot; ~{test.estimatedMinutes} min &middot; {test.totalQuestions}{' '}
                    {test.totalQuestions === 1 ? 'task' : 'tasks'}
                  </div>
                </div>
                <p className="text-xs text-slate-600 flex-1">{reason}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => onUseTest(test)}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                  >
                    Use this test
                  </button>
                  <button
                    onClick={() => onEditCopy(test)}
                    title="Opens a copy in the builder; saving it makes it your own test"
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit a copy
                  </button>
                  <button onClick={() => onOpenTest(test.id)} className="px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-700 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!turn.custom?.length && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Worth building</h3>
          <ul className="space-y-3">
            {turn.custom.map((c, i) => (
              <CustomCard key={i} idea={c} aiAllowed={aiAllowed} onBuild={() => onBuildWithAI(c.brief)} onSeePlans={onSeePlans} />
            ))}
          </ul>
          {!aiAllowed && (
            <p className="text-xs text-slate-500">
              Building custom tests with AI needs a subscription. You can still use the ready-made tests, edit a copy, or create a test yourself.
            </p>
          )}
        </div>
      )}
    </div>
  </div>
);

const CustomCard: React.FC<{ idea: CustomIdea; aiAllowed: boolean; onBuild: () => void; onSeePlans: () => void }> = ({ idea, aiAllowed, onBuild, onSeePlans }) => (
  <li className="p-4 border border-dashed border-indigo-200 bg-indigo-50/30 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-900">{idea.title}</span>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-indigo-100">{CUSTOM_KIND_LABELS[idea.kind]}</span>
      </div>
      <p className="text-xs text-slate-600 mt-1">{idea.why}</p>
    </div>
    {aiAllowed ? (
      <button onClick={onBuild} className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
        <Wand2 className="w-3.5 h-3.5" />
        Build with AI
      </button>
    ) : (
      <button
        onClick={onSeePlans}
        className="shrink-0 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 rounded-lg flex items-center gap-1.5 self-start sm:self-auto"
      >
        <Lock className="w-3.5 h-3.5" />
        Subscribe to build
      </button>
    )}
  </li>
);
