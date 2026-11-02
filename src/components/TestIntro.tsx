import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock, FileText, Lock, ShieldCheck, X } from 'lucide-react';
import { AssessmentTest } from '../types';
import { QUESTION_TYPE_LABELS, describeChecks } from '../lib/testRoles';
import { groupQuestions, isAnswerType, isWorkspaceType } from '../lib/questionTypes';
import { CaseBrief } from './CaseBrief';

export const INTEGRITY_RULES = [
  'Stay on this tab for the whole test. Switching tabs, windows or apps is recorded and lowers your focus score.',
  'Work alone. No help from other people, and no AI assistants or code generators.',
  'Don’t search the web or look up solutions. Write your answers yourself.',
  'Don’t copy, screenshot or share the questions, during or after the test.',
  'One attempt at a time, on your own account. Breaking these rules can void your score.',
];

const SLIDES = [
  { title: 'Information', icon: FileText },
  { title: 'Test modules', icon: FileText },
  { title: 'Timing', icon: Clock },
  { title: 'Conduct', icon: ShieldCheck },
] as const;

interface TestIntroProps {
  test: AssessmentTest;
  onBegin: () => void;
  onClose: () => void;
}

// A short, steady reference for this sitting, shown like an exam paper's number
const referenceFor = (testId: string) => {
  let h = 0;
  for (const c of testId) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const d = new Date();
  return `VT-${(h % 100000).toString().padStart(5, '0')}-${d.getFullYear().toString().slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{children}</div>
);

// Before the clock starts: the test read like an exam's front pages, one at a time, ending in a signed declaration
export const TestIntro: React.FC<TestIntroProps> = ({ test, onBegin, onClose }) => {
  const [slide, setSlide] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const reference = useMemo(() => referenceFor(test.id), [test.id]);

  const groups = useMemo(() => groupQuestions(test.questions), [test.questions]);
  const answerable = test.questions.filter((q) => q.type !== 'case');
  const signed = signature.trim().length >= 2;
  const ready = accepted && signed;
  const last = slide === SLIDES.length - 1;

  // Three seconds' notice, then the clock starts
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      onBegin();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? c : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown, onBegin]);

  // Escape leaves, unless the countdown is running
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && countdown === null && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [countdown, onClose]);

  const has = (check: (t: AssessmentTest['questions'][number]) => boolean) => test.questions.some(check);
  const instructions = [
    'Move between sections freely using the tabs at the top, in any order.',
    has((q) => isWorkspaceType(q.type)) &&
      'Spreadsheet, database and app tasks open a working copy of the tool. Do the work there and leave it: it’s marked as you leave it.',
    has((q) => q.type === 'case') && 'Case studies give you material to read, with questions about it beside it.',
    has((q) => q.type === 'written') && 'Written answers are marked on the points a strong answer makes, not on length or polish.',
    has((q) => !isAnswerType(q.type) && !isWorkspaceType(q.type) && q.type !== 'case') &&
      'Code tasks can be run against their checks as often as you like. Your latest code is what’s marked.',
    has((q) => isAnswerType(q.type)) && 'Answers can be changed until you submit. Multi-part questions give credit for each part you get right.',
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100 text-slate-900 font-sans" role="dialog" aria-modal="true" aria-label={`${test.title}: before you start`}>
      {/* Exam header */}
      <header className="shrink-0 bg-slate-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <span className="w-7 h-7 rounded bg-white text-slate-950 flex items-center justify-center text-xs font-black">V</span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Vetter assessment</div>
            <div className="text-sm font-semibold truncate">{test.title}</div>
          </div>
          <div className="ml-auto hidden sm:block text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Reference</div>
            <div className="text-xs font-mono tabular-nums">{reference}</div>
          </div>
          <button
            onClick={onClose}
            disabled={countdown !== null}
            className="ml-2 p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30"
            aria-label="Leave"
            title="Leave without starting"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Steps */}
        <ol className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-4 gap-2 pb-3">
          {SLIDES.map((s, i) => (
            <li key={s.title}>
              <button
                onClick={() => i < slide && setSlide(i)}
                disabled={i >= slide}
                className="w-full text-left disabled:cursor-default"
                aria-current={i === slide ? 'step' : undefined}
              >
                <div className={`h-0.5 rounded-full ${i <= slide ? 'bg-white' : 'bg-white/20'}`} />
                <div className={`mt-1.5 text-[11px] flex items-center gap-1 ${i === slide ? 'text-white font-semibold' : i < slide ? 'text-slate-300' : 'text-slate-500'}`}>
                  {i < slide ? <Check className="w-3 h-3" /> : <span className="font-mono">{i + 1}.</span>}
                  <span className="truncate">{s.title}</span>
                </div>
              </button>
            </li>
          ))}
        </ol>
      </header>

      {/* The page */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <article key={slide} className="bg-white border border-stone-300 shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.25)] animate-in fade-in duration-200">
            <div className="px-6 sm:px-10 pt-8 pb-5 border-b-2 border-slate-900 flex items-end justify-between gap-4">
              <div>
                <Label>
                  Section {slide + 1} of {SLIDES.length}
                </Label>
                <h1 className="mt-1 font-serif text-2xl sm:text-3xl text-slate-950">{SLIDES[slide].title}</h1>
              </div>
              <div className="text-right text-[11px] text-slate-500 font-mono hidden sm:block">
                {test.category} &middot; {test.difficulty}
              </div>
            </div>

            <div className="px-6 sm:px-10 py-8 space-y-6 text-sm leading-relaxed text-slate-700">
              {slide === 0 && (
                <>
                  <div>
                    <Label>Assessment</Label>
                    <h2 className="mt-1 font-serif text-xl text-slate-950">{test.title}</h2>
                    <p className="mt-2">{test.description}</p>
                  </div>
                  <dl className="grid grid-cols-2 sm:grid-cols-4 border border-slate-300 divide-x divide-y sm:divide-y-0 divide-slate-300">
                    {[
                      ['Duration', `${test.estimatedMinutes} minutes`],
                      ['Questions', `${answerable.length}`],
                      ['Pass mark', `${test.passingScore} / 100`],
                      ['Attempt', 'Timed, single sitting'],
                    ].map(([k, v]) => (
                      <div key={k} className="p-4">
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{k}</dt>
                        <dd className="mt-1 font-semibold text-slate-950">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {test.scenario && <CaseBrief scenario={test.scenario} defaultOpen />}
                  <p className="border-l-4 border-slate-900 pl-4 text-slate-800">
                    Read every section before you begin. The clock starts only when you press <strong>Begin the test</strong>, and it can&rsquo;t be
                    paused once it has.
                  </p>
                </>
              )}

              {slide === 1 && (
                <>
                  <p>The test is made up of the following. Marks show each part&rsquo;s share of your final score.</p>
                  <table className="w-full text-xs border-t border-slate-300">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-slate-500 border-b border-slate-300">
                        <th className="py-2 pr-3 font-semibold w-10">No.</th>
                        <th className="py-2 pr-3 font-semibold">Item</th>
                        <th className="py-2 pr-3 font-semibold text-right">Marks</th>
                        <th className="py-2 font-semibold text-right">Guide</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.flatMap((g) =>
                        g.questions.map((q) => (
                          <tr key={q.id} className="border-b border-slate-200 align-top">
                            <td className="py-2.5 pr-3 font-mono text-slate-500">
                              {q.type === 'case' ? '—' : answerable.indexOf(q) + 1}
                            </td>
                            <td className={`py-2.5 pr-3 ${q.taskId ? 'pl-4' : ''}`}>
                              <div className="font-semibold text-slate-900">
                                {q.type === 'case' ? 'Case study: ' : ''}
                                {q.title}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {QUESTION_TYPE_LABELS[q.type]} &middot; {describeChecks(q)}
                              </div>
                            </td>
                            <td className="py-2.5 pr-3 text-right font-mono tabular-nums whitespace-nowrap">{q.type === 'case' ? 'to read' : `${q.weight}%`}</td>
                            <td className="py-2.5 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">{q.timeLimitMinutes} min</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <div>
                    <Label>Instructions</Label>
                    <ol className="mt-2 space-y-1.5 list-decimal pl-5 marker:font-mono marker:text-slate-400">
                      {instructions.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ol>
                  </div>
                </>
              )}

              {slide === 2 && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="shrink-0 border-2 border-slate-900 px-8 py-5 text-center">
                      <Label>Time allowed</Label>
                      <div className="mt-1 font-mono text-5xl font-bold tabular-nums text-slate-950">
                        {String(test.estimatedMinutes).padStart(2, '0')}:00
                      </div>
                    </div>
                    <p>
                      You have <strong>{test.estimatedMinutes} minutes</strong> for the whole test. The time left is shown at the top of the screen
                      throughout.
                    </p>
                  </div>
                  <ol className="space-y-2 list-decimal pl-5 marker:font-mono marker:text-slate-400">
                    <li>The times beside each item are a guide, not a limit. Spend your time as you choose.</li>
                    <li>
                      When the time runs out, the test is <strong>submitted automatically</strong> with whatever you&rsquo;ve done.
                    </li>
                    <li>Your finishing time is recorded and breaks ties on the leaderboard.</li>
                    <li>
                      Closing or leaving the test before you submit <strong>throws away your answers</strong>. There is no pause.
                    </li>
                  </ol>
                </>
              )}

              {slide === 3 && (
                <>
                  <p>This assessment is monitored. By beginning it you agree to the following rules.</p>
                  <ol className="space-y-2.5">
                    {INTEGRITY_RULES.map((rule, i) => (
                      <li key={rule} className="flex gap-3">
                        <span className="font-mono text-xs text-slate-400 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="border border-slate-900 p-5 space-y-4 bg-stone-50">
                    <Label>Candidate declaration</Label>
                    <label className="flex items-start gap-3 cursor-pointer text-slate-900">
                      <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 w-4 h-4 accent-slate-900" />
                      <span>
                        I have read the rules above. I will take this test alone, without outside help, and I understand that breaking the rules can
                        void my result.
                      </span>
                    </label>
                    <label className="block">
                      <span className="block text-[11px] text-slate-500">Type your full name to sign</span>
                      <input
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        autoComplete="name"
                        className="mt-1 w-full sm:w-80 px-0 py-1.5 bg-transparent border-0 border-b-2 border-slate-400 focus:border-slate-900 focus:outline-none font-serif italic text-lg text-slate-950"
                      />
                    </label>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} &middot; {reference}
                    </div>
                  </div>
                </>
              )}
            </div>
          </article>
        </div>
      </main>

      {/* Moving through */}
      <footer className="shrink-0 bg-white border-t border-stone-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {slide > 0 ? (
            <button onClick={() => setSlide(slide - 1)} className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-950 flex items-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
          ) : (
            <button onClick={onClose} className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-950">
              Not now
            </button>
          )}
          <span className="ml-auto text-[11px] font-mono text-slate-400 tabular-nums">
            {slide + 1} / {SLIDES.length}
          </span>
          {last ? (
            <button
              onClick={() => setCountdown(3)}
              disabled={!ready}
              title={ready ? undefined : 'Tick the declaration and sign with your name first'}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white bg-slate-950 hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              Begin the test
            </button>
          ) : (
            <button
              onClick={() => setSlide(slide + 1)}
              className="px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white bg-slate-950 hover:bg-black flex items-center gap-2"
            >
              Continue
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </footer>

      {/* The last seconds before the clock starts */}
      {countdown !== null && countdown > 0 && (
        <div className="absolute inset-0 z-10 bg-slate-950 text-white flex flex-col items-center justify-center gap-4" aria-live="assertive">
          <Label>
            <span className="text-slate-400">Your test begins in</span>
          </Label>
          <div key={countdown} className="font-mono text-8xl font-bold tabular-nums animate-in zoom-in-95 fade-in duration-300">
            {countdown}
          </div>
          <div className="text-xs text-slate-400">Stay on this tab until you submit.</div>
        </div>
      )}
    </div>
  );
};
