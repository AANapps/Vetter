import { interviewQuestions } from '../lib/interviewQuestions';
import { RichText } from './RichText';
import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, Loader2, Monitor, X, XCircle } from 'lucide-react';
import { AssessmentTest, Question } from '../types';
import { hydrateTest } from '../lib/appRefs';
import { Desktop } from './Desktop';
import { usePlan } from '../lib/plan';
import { AnswerRecord, Submission, loadSubmissions } from '../lib/submissions';
import { QUESTION_STYLES } from '../lib/questionTypes';

interface AnswersDialogProps {
  businessId: string;
  candidateId: string;
  candidateName: string;
  // Only answers on these tests (a job's), when given
  testIds?: string[];
  // The tests themselves, so a desktop can be opened as the candidate left it
  tests?: AssessmentTest[];
  onClose: () => void;
}

const styleOf = (type: AnswerRecord['type']) => QUESTION_STYLES.find((s) => s.type === type)?.label ?? type;
const isHandsOn = (type: AnswerRecord['type']) => type === 'app' || type === 'sheet' || type === 'database' || type === 'desktop';
const isCode = (type: AnswerRecord['type']) => type === 'code' || type === 'sql' || type === 'schema';
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const scoreTone = (score: number) => (score === 100 ? 'text-emerald-700' : score > 0 ? 'text-amber-700' : 'text-rose-700');

// A candidate's answers on the company's tests, question by question, with how each was marked, so the company can
// see the work behind a score and check the marking
export const AnswersDialog: React.FC<AnswersDialogProps> = ({ businessId, candidateId, candidateName, testIds, tests, onClose }) => {
  const [replay, setReplay] = useState<{ question: Question; answer: string; company?: string } | null>(null);
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [error, setError] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const { can, upgrade } = usePlan();
  const allowed = can('full-reports');
  useEffect(() => {
    if (allowed) return;
    upgrade('Answer-by-answer review comes with every paid plan. The free plan shows each candidate’s score.');
    onClose();
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    loadSubmissions(businessId, candidateId)
      .then((all) => {
        const shown = testIds ? all.filter((s) => testIds.includes(s.testId)) : all;
        setSubs(shown);
        setOpenId(shown[0]?.id ?? null);
      })
      .catch((err) => (console.error("Couldn't load answers", err), setError(true)));
  }, [businessId, candidateId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (replay ? setReplay(null) : onClose());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, replay]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${candidateName}'s answers`}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl h-[calc(100dvh-1rem)] sm:h-auto sm:max-h-[calc(100dvh-2rem)] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{candidateName}'s answers</h2>
            <p className="text-xs text-slate-500">Every question as they saw it, what they answered and how it was marked. Only your team can see this.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
          {error ? (
            <p className="py-10 text-center text-sm text-rose-700 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Couldn't load the answers. Check your connection and try again.
            </p>
          ) : !subs ? (
            <p className="py-10 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading answers…
            </p>
          ) : subs.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No answers kept for {candidateName} yet. Answers are kept from 4 November 2026, for tests taken for your jobs or from your link.
            </p>
          ) : (
            subs.map((s) => {
              const open = openId === s.id;
              const attempt = subs.filter((o) => o.testId === s.testId);
              return (
                <section key={s.id} className="border border-slate-200 rounded-xl">
                  <button onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-50 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{s.testTitle}</div>
                      <div className="text-xs text-slate-500">
                        {when(s.completedAt)}
                        {attempt.length > 1 && ` · attempt ${attempt.length - attempt.indexOf(s)} of ${attempt.length}`}
                        {s.aiAssistant !== undefined && ` · AI assistant ${s.aiAssistant ? 'allowed' : 'off'}`}
                      </div>
                    </div>
                    <span className="font-mono font-bold tabular-nums text-slate-900">{s.score}/100</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && <InterviewQuestions answers={s.answers} name={candidateName} />}
                  {open && (
                    <ol className="border-t border-slate-100 divide-y divide-slate-100">
                      {s.answers.map((a) => {
                        const test = tests?.find((t) => t.id === s.testId);
                        const question = a.type === 'desktop' && test ? hydrateTest(test).questions.find((q) => q.id === a.id && q.desktop) : undefined;
                        const canOpen = !!question && opens(a.answer);
                        return <Answer key={a.id} a={a} onOpenDesktop={canOpen ? () => setReplay({ question: question!, answer: a.answer, company: test?.scenario?.company ?? test?.companyName }) : undefined} />;
                      })}
                    </ol>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>
      {replay && <DesktopReplay {...replay} name={candidateName} onClose={() => setReplay(null)} />}
    </div>
  );
};

// Their desktop as they left it: every app opens on their work, nothing can be changed and nothing is sent
const DesktopReplay: React.FC<{ question: Question; answer: string; company?: string; name: string; onClose: () => void }> = ({ question, answer, company, name, onClose }) => (
  <div className="fixed inset-0 z-[60] flex flex-col bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-label={`${name}'s desktop`} onClick={(e) => e.stopPropagation()} className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-200 flex items-center gap-3">
        <Monitor className="w-4 h-4 text-indigo-600 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900 truncate">
            {name}&rsquo;s desktop: {question.title}
          </div>
          <div className="text-xs text-slate-500">As they left it when they submitted. Open any app to see their work; nothing here can be changed.</div>
        </div>
        <button onClick={onClose} aria-label="Close their desktop" className="p-1 text-slate-400 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 p-2 bg-slate-100">
        <Desktop question={question} answer={answer} onChange={() => {}} company={company} readOnly />
      </div>
    </div>
  </div>
);

// A saved desktop that can be opened (not cut short or dropped for size)
const opens = (text: string) => {
  try {
    const v = JSON.parse(text);
    return !!v && typeof v === 'object';
  } catch {
    return false;
  }
};

const Answer: React.FC<{ a: AnswerRecord; onOpenDesktop?: () => void }> = ({ a, onOpenDesktop }) => {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <li className="px-4 py-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-slate-500">
            {a.label}. {styleOf(a.type)} · {a.weight}% of the marks{a.task && ` · about ${a.task}`}
          </div>
          <div className="text-sm font-semibold text-slate-900">{a.title}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`font-mono font-bold tabular-nums ${scoreTone(a.score)}`}>{a.score}/100</div>
          {a.aiMarked && <div className="text-[10px] font-semibold text-indigo-700">AI-marked</div>}
        </div>
      </div>

      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-500 hover:text-slate-800">The question</summary>
        <RichText text={a.prompt} className="mt-1.5" />
      </details>

      {!isHandsOn(a.type) && (
        <div className="grid sm:grid-cols-2 gap-2.5">
          <Block label="Their answer" tone={a.score === 100 ? 'good' : a.score > 0 ? 'part' : 'bad'} mono={isCode(a.type)} text={a.answer || '(no answer)'} />
          {a.correct && <Block label={a.type === 'written' || a.type === 'email' ? 'What a strong answer covers' : 'Right answer'} tone="neutral" text={a.correct} />}
        </div>
      )}

      {a.checks && a.checks.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {isHandsOn(a.type) ? 'What was checked in their finished work' : 'Checks run on their answer'} · {a.checks.filter((c) => c.passed).length} of {a.checks.length} passed
          </div>
          <ul className="space-y-1.5">
            {a.checks.map((c, i) => (
              <li key={i} className={`rounded-lg border px-3 py-2 text-xs ${c.passed ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
                <div className="flex items-start gap-1.5 font-semibold text-slate-800">
                  {c.passed ? <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 mt-px shrink-0 text-rose-600" />}
                  {c.description}
                </div>
                {!c.passed && (
                  <div className="mt-1 pl-5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 font-mono text-[11px] text-slate-600">
                    <span className="text-slate-400">Expected</span>
                    <span className="break-words">{c.expected || '—'}</span>
                    <span className="text-slate-400">Found</span>
                    <span className="break-words">{c.actual || '—'}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {a.feedback.length > 0 && a.score < 100 && (
        <ul className="pl-4 list-disc text-xs text-slate-600 space-y-0.5">
          {a.feedback.slice(0, 4).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}

      {onOpenDesktop && (
        <button onClick={onOpenDesktop} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
          <Monitor className="w-3.5 h-3.5" />
          Open their desktop
        </button>
      )}

      {isHandsOn(a.type) && a.answer && (
        <div>
          <button onClick={() => setShowRaw((v) => !v)} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900">
            {showRaw ? 'Hide' : 'Show'} the saved state of their work
          </button>
          {showRaw && <pre className="mt-1.5 max-h-64 overflow-auto rounded-lg bg-slate-900 text-slate-100 p-3 text-[11px] whitespace-pre-wrap break-words">{pretty(a.answer)}</pre>}
        </div>
      )}
    </li>
  );
};

const pretty = (text: string) => {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

const Block: React.FC<{ label: string; text: string; tone: 'good' | 'part' | 'bad' | 'neutral'; mono?: boolean }> = ({ label, text, tone, mono }) => (
  <div
    className={`rounded-lg border px-3 py-2 ${
      tone === 'good' ? 'border-emerald-200 bg-emerald-50/50' : tone === 'part' ? 'border-amber-200 bg-amber-50/50' : tone === 'bad' ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 bg-slate-50'
    }`}
  >
    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
    <div className={`mt-1 text-xs text-slate-800 whitespace-pre-wrap break-words ${mono ? 'font-mono text-[11px] max-h-64 overflow-auto' : ''}`}>{text}</div>
  </div>
);

// Questions for the interview, from this attempt's own work
const InterviewQuestions: React.FC<{ answers: AnswerRecord[]; name: string }> = ({ answers, name }) => {
  const qs = interviewQuestions(answers);
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-4 mb-3 p-3 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-slate-700">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold text-slate-900">Ask in the interview</span>
        <button
          onClick={() => navigator.clipboard?.writeText(qs.map((q, i) => `${i + 1}. ${q}`).join('\n')).then(() => setCopied(true))}
          className="text-indigo-700 font-semibold hover:underline"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-slate-500 mt-0.5">From {name.split(' ')[0]}&rsquo;s own work: their answers show whether the work was theirs and whether they understand it.</p>
      <ol className="mt-2 space-y-1 list-decimal pl-4">
        {qs.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
    </div>
  );
};
