import React, { useEffect, useRef, useState } from 'react';
import { PixelDot } from './PixelDot';
import { ArrowRight, ArrowUp, Check, Eye, Lock, Pencil, Plus, Wand2, X } from 'lucide-react';
import { AssessmentTest, Business, JobPosting, User, levelName } from '../types';
import { Pic } from './Pic';
import { AdvisorTurn, CUSTOM_KIND_LABELS, CustomIdea, SuggestedPerson, askAdvisor } from '../lib/testAdvisor';
import { Credit, loadCredit } from '../lib/aiRequest';
import { CreditMeter, EXAMPLE_CREDIT } from './CreditMeter';
import { CreditsDialog } from './CreditsDialog';

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
  // The ready-made tests picked across the chat, taken on to the test plan
  onContinue: (tests: AssessmentTest[]) => void;
  // Builds an AI test straight away; the picked tests (and the reply's other ideas) wait in the test plan for it
  onBuildIdea: (idea: CustomIdea, picked: AssessmentTest[], others: CustomIdea[]) => void;
  onEditCopy: (test: AssessmentTest) => void;
  onBuildWithAI: (brief: string) => void;
  onCreateOwn: () => void;
  onSeePlans: () => void;
  onOpenTest: (testId: string) => void;
  onGoTo: (tab: 'business-jobs' | 'business-tests' | 'business-candidates') => void;
  // Everyone on Vetter, for the chat to suggest when the company asks to see candidates
  candidates: User[];
  // A candidate's profile in a pop-up over the chat
  renderProfile: (personId: string, onClose: () => void) => React.ReactNode;
  // Sends a job's tests to a candidate, as an invitation
  onInvite: (jobId: string, candidateId: string) => void;
}

const STARTERS = [
  'A junior front-end developer who knows React',
  'A data analyst who works in Excel and SQL',
  'A customer support agent using a help desk',
  'A graduate financial analyst',
  'Show me candidates for a data analyst role',
];

// A company's home: a chat with Vetter about who they're hiring, which answers with a roadmap, the library tests that
// fit and custom pieces worth building. The menu sits on the left
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
  onContinue,
  onBuildIdea,
  onEditCopy,
  onBuildWithAI,
  onCreateOwn,
  onSeePlans,
  onOpenTest,
  onGoTo,
  candidates,
  renderProfile,
  onInvite,
}) => {
  const [input, setInput] = useState('');
  // The candidate whose profile is open over the chat
  const [viewing, setViewing] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
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
  }, [turns.length, thinking]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || thinking) return;
    const next: AdvisorTurn[] = [...turns, { role: 'user', text: t }];
    onTurns(next);
    setInput('');
    setThinking(true);
    const reply = await askAdvisor(next, tests, business, candidates);
    onTurns([...next, reply]);
    setThinking(false);
    inputRef.current?.focus();
  };


  return (
    // A chat like ChatGPT's or Claude's: exactly the window under the top bar, so the page itself never scrolls; only
    // the conversation does, and the message box stays at the bottom
    <div className="relative isolate h-[calc(100dvh-3.5rem-1px)] lg:h-[100dvh] overflow-hidden">
      {topUpOpen && credit && <CreditsDialog credit={credit} onUpdated={setCredit} onClose={() => setTopUpOpen(false)} />}
      {viewing && renderProfile(viewing, () => setViewing(null))}
      {/* Faint colour drifting behind the glass */}
      <div className="ai-aurora" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    <div className="h-full max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_17rem] gap-8">
      {/* The chat */}
      <section className="min-w-0 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-8 space-y-6 -mx-2 px-2">
          {turns.length === 0 ? (
            <div className="pt-10 sm:pt-20 space-y-6 text-center">
              <div className="space-y-2">
                <span className="mx-auto w-fit flex items-center font-pixel">
                  <span className="ai-mark w-11 h-11 rounded-2xl text-white text-lg flex items-center justify-center shadow-lg shadow-indigo-200">V</span>
                  <span className="text-2xl text-indigo-950 ml-1">etter<PixelDot /></span>
                </span>
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
                    className="ai-glass px-3 py-1.5 text-xs font-medium text-slate-700 border border-white/80 shadow-xs rounded-full hover:border-indigo-300 hover:text-indigo-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
              {/* On a phone the menu isn't beside the chat, so its two ways to write a test are here */}
              <div className="lg:hidden flex flex-wrap justify-center gap-2 pt-2">
                <button onClick={onCreateOwn} className="px-3 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Create test manually
                </button>
                <button
                  onClick={() => (aiAllowed ? onBuildWithAI('') : onSeePlans())}
                  className="create-border px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 rounded-lg flex items-center gap-1.5"
                >
                  {!aiAllowed && <Lock className="w-3.5 h-3.5" />}
                  Create with AI
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
                  onBuildIdea={(idea, others) => onBuildIdea(idea, pickedTests, others)}
                  onTogglePick={togglePick}
                  onPickAll={pickAll}
                  onEditCopy={onEditCopy}
                  onBuildWithAI={onBuildWithAI}
                  onSeePlans={onSeePlans}
                  onOpenTest={onOpenTest}
                  candidates={candidates}
                  onViewPerson={setViewing}
                  jobs={jobs}
                  onInvite={onInvite}
                />
              )
            )
          )}
          {thinking && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="ai-mark w-7 h-7 rounded-lg text-white text-xs font-pixel flex items-center justify-center">V</span>
              <span className="ai-shimmer font-medium">Looking through Vetter…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="shrink-0 pb-3 pt-2"
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
          <div className="ai-ring" data-busy={thinking}>
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
          </div>
          <p className="mt-2 text-[11px] text-slate-400 text-center">
            Advice is free. {aiAllowed ? 'AI test creation is on your plan.' : 'Creating custom tests with AI needs a subscription.'}
          </p>
        </form>
      </section>

      {/* Ways to start a test, beside the chat */}
      <aside className="hidden lg:block min-h-0 overflow-y-auto py-8">
        <div className="ai-glass space-y-5 p-3 rounded-2xl border border-white/80 shadow-sm">
          {/* The pages are in the menu on the left; here, the ways to start a test */}
          <div className="space-y-2">
            <button
              onClick={onCreateOwn}
              className="w-full px-3 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create test manually
            </button>
            <button
              onClick={() => (aiAllowed ? onBuildWithAI('') : onSeePlans())}
              className="create-border w-full px-3 py-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 rounded-lg flex items-center gap-2"
            >
              {!aiAllowed && <Lock className="w-4 h-4" />}
              Create with AI
            </button>
            {turns.length > 0 && (
              <button
                onClick={() => (onTurns([]), clearPicks())}
                className="create-border w-full px-3 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 rounded-lg flex items-center justify-center"
              >
                Create with AI
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
    </div>
  );
};

const AdvisorReply: React.FC<{
  turn: AdvisorTurn;
  aiAllowed: boolean;
  picked: string[];
  onBuildIdea: (idea: CustomIdea, others: CustomIdea[]) => void;
  onTogglePick: (testId: string) => void;
  onPickAll: (testIds: string[]) => void;
  onEditCopy: (test: AssessmentTest) => void;
  onBuildWithAI: (brief: string) => void;
  onSeePlans: () => void;
  onOpenTest: (testId: string) => void;
  candidates: User[];
  onViewPerson: (personId: string) => void;
  jobs: JobPosting[];
  onInvite: (jobId: string, candidateId: string) => void;
}> = ({ turn, aiAllowed, picked, onBuildIdea, onTogglePick, onPickAll, onEditCopy, onBuildWithAI, onSeePlans, onOpenTest, candidates, onViewPerson, jobs, onInvite }) => (
  <div className="flex gap-3">
    <span className="ai-mark w-7 h-7 shrink-0 rounded-lg text-white text-xs font-pixel flex items-center justify-center">V</span>
    <div className="ai-glass min-w-0 flex-1 space-y-4 p-4 sm:p-5 rounded-2xl rounded-tl-md border border-white/80 shadow-sm">
      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${turn.error ? 'text-slate-800' : 'text-slate-800'}`}>{turn.text}</p>

      {!!turn.people?.length && (
        <PeopleList
          people={turn.people}
          candidates={candidates}
          onView={onViewPerson}
          jobs={jobs}
          onInvite={onInvite}
          onBuildTest={(brief) => (aiAllowed ? onBuildWithAI(brief) : onSeePlans())}
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
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Ready-made tests</h3>
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
              );
            })}
          </ul>
        </div>
      )}

      {!!turn.custom?.length && (
        <div className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Worth building</h3>
          <ul className="space-y-3">
            {turn.custom.map((c, i) => (
              <CustomCard key={i} idea={c} aiAllowed={aiAllowed} onBuild={() => onBuildIdea(c, turn.custom!.filter((x) => x !== c))} onSeePlans={onSeePlans} />
            ))}
          </ul>
          {!aiAllowed && (
            <p className="text-xs text-slate-500">
              Building custom tests with AI needs a subscription. You can still use the ready-made tests, edit a copy, or create a test manually.
            </p>
          )}
        </div>
      )}
    </div>
  </div>
);

// An AI test worth building: Build starts writing it at once, and it joins the picked tests in the test plan when done
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
        Create with AI
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

// Candidates the chat suggests: who they are, their strongest verified scores and why they suit the role; each opens
// their profile in a pop-up. Where the role's skills aren't verified, the card says which and offers to send them a
// job's tests or to write a test that checks the gaps
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
      <ul className="space-y-2.5">
        {found.map(({ c, p }, i) => (
          <PersonCard key={c.id} rank={i + 1} c={c} p={p} onView={() => onView(c.id)} jobs={jobs} onInvite={onInvite} onBuildTest={onBuildTest} aiAllowed={aiAllowed} />
        ))}
      </ul>
    </div>
  );
};

const PersonCard: React.FC<{
  rank: number;
  c: User;
  p: SuggestedPerson;
  onView: () => void;
  jobs: JobPosting[];
  onInvite: (jobId: string, candidateId: string) => void;
  onBuildTest: (brief: string) => void;
  aiAllowed: boolean;
}> = ({ rank, c, p, onView, jobs, onInvite, onBuildTest, aiAllowed }) => {
  const top = [...c.verifiedSkills].sort((a, b) => b.score - a.score).slice(0, 3);
  const gaps = p.gaps?.length ? p.gaps : c.verifiedSkills.length === 0 ? ['No verified skills yet'] : [];
  // Jobs with tests to send; ones they're already invited to say so
  const withTests = jobs.filter((j) => j.status === 'active' && j.testIds.length > 0);
  const [sentTo, setSentTo] = useState<string[]>([]);
  const invited = (j: JobPosting) => sentTo.includes(j.id) || j.invitations.some((x) => x.candidateId === c.id);
  const [jobId, setJobId] = useState(() => withTests.find((j) => !invited(j))?.id ?? '');
  const brief =
    p.testBrief ||
    `A short test for ${c.name.split(' ')[0]}, ${c.title || 'a candidate'}, checking ${gaps.join(', ')} for the role we discussed.`;
  return (
    <li className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={onView} className="w-full text-left p-4 flex gap-3.5 hover:bg-slate-50/60 transition-colors group">
        <span className="relative shrink-0">
          <Pic src={c.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-11 h-11 rounded-full object-cover bg-slate-100" />
          <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">{rank}</span>
        </span>
        <span className="min-w-0 flex-1 space-y-1.5">
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700">{c.name}</span>
              <span className="block text-[11px] text-slate-500 truncate">{[c.title, c.location, c.careerStage].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="shrink-0 text-[11px] font-semibold text-indigo-700 inline-flex items-center gap-0.5">
              View profile
              <ArrowRight className="w-3 h-3" />
            </span>
          </span>
          {top.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {top.map((s) => (
                <span key={s.skillId} className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-700">
                  {s.skillName} <span className="font-mono font-semibold text-slate-900">{s.score}</span>
                </span>
              ))}
            </span>
          )}
          <span className="block text-xs text-slate-600 leading-relaxed">{p.reason}</span>
        </span>
      </button>

      {gaps.length > 0 && (
        <div className="px-4 py-3 bg-amber-50/50 border-t border-amber-100 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="font-semibold text-amber-900">Not verified yet:</span>
            {gaps.map((g) => (
              <span key={g} className="px-2 py-0.5 rounded-full bg-white border border-amber-200 text-amber-900">
                {g}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {withTests.length > 0 ? (
              <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
                <select
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                  aria-label="Job whose tests to send"
                  className="pl-2.5 pr-1 py-1.5 text-xs text-slate-700 bg-transparent max-w-[11rem] focus:outline-none"
                >
                  {withTests.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                      {invited(j) ? ' (invited)' : ''}
                    </option>
                  ))}
                </select>
                {(() => {
                  const job = withTests.find((j) => j.id === jobId);
                  const done = !!job && invited(job);
                  return (
                    <button
                      onClick={() => {
                        if (!job || done) return;
                        onInvite(job.id, c.id);
                        setSentTo((prev) => [...prev, job.id]);
                      }}
                      disabled={!job || done}
                      className={`px-3 py-1.5 text-xs font-semibold border-l border-slate-200 inline-flex items-center gap-1 ${
                        done ? 'text-emerald-700 bg-emerald-50' : 'text-white bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {done ? <Check className="w-3 h-3" /> : <ArrowUp className="w-3 h-3 rotate-45" />}
                      {done ? 'Tests sent' : "Send the job's tests"}
                    </button>
                  );
                })()}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Post a job with tests to send them a request.</span>
            )}
            <button
              onClick={() => onBuildTest(brief)}
              className="create-border px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 rounded-lg inline-flex items-center gap-1"
            >
              {!aiAllowed && <Lock className="w-3 h-3" />}
              Create a test with AI
            </button>
          </div>
        </div>
      )}
    </li>
  );
};
