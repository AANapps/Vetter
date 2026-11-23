import React, { useEffect, useRef, useState } from 'react';
import { GraduationCap, Loader2, Play, Save, Send, X } from 'lucide-react';
import { AssessmentTest, Business } from '../types';
import { stopAiRun } from '../lib/aiRequest';
import { TrainingPlan, buildTraining, planOf, planTraining } from '../lib/trainingBuild';
import { TrainingRunner } from './TrainingRunner';

interface TrainingBuilderProps {
  // What to teach, from the home chat or the Training page
  brief: string;
  business?: Business;
  // A training being changed: its plan is the start, and saving keeps its id
  existing?: AssessmentTest;
  onSaved: (test: AssessmentTest) => void;
  onClose: () => void;
  // Out of AI: the plans or a top-up
  onNeedCredit: () => void;
}

// Making guided training: Praxa plans the lessons and steps (changed by asking), then builds the app they're done in
// (from Praxa's app library when it has the software), then it's tried out and saved to the company's Training
export const TrainingBuilder: React.FC<TrainingBuilderProps> = ({ brief, business, existing, onSaved, onClose, onNeedCredit }) => {
  const [plan, setPlan] = useState<TrainingPlan | null>(existing ? planOf(existing) : null);
  const [built, setBuilt] = useState<AssessmentTest | null>(existing ?? null);
  const [stage, setStage] = useState('');
  const [busy, setBusy] = useState<'plan' | 'build' | null>(null);
  const [error, setError] = useState('');
  const [change, setChange] = useState('');
  const [trying, setTrying] = useState(false);
  const asked = useRef(false);

  const fail = (out: { error?: string; needsCredit?: boolean }) => {
    setError(out.error ?? 'Something went wrong. Try again.');
    if (out.needsCredit) onNeedCredit();
  };
  const runPlan = async (text?: string) => {
    setBusy('plan');
    setError('');
    setStage(text ? 'Changing the plan…' : 'Planning the lessons and every step…');
    const out = await planTraining(brief, business, text && plan ? { text, current: { ...planToGuide(plan), title: plan.title } } : undefined);
    setBusy(null);
    if (!out.plan) return fail(out);
    setPlan(out.plan);
    setBuilt(null);
    setChange('');
  };
  useEffect(() => {
    if (asked.current || plan) return;
    asked.current = true;
    runPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const build = async () => {
    if (!plan) return;
    setBusy('build');
    setError('');
    setStage('Building the app…');
    const out = await buildTraining(plan, business, (s) => setStage(s.replace(/^./, (c) => c.toUpperCase())), existing);
    setBusy(null);
    if (!out.ok) return fail(out);
    setBuilt(out.test);
  };

  const steps = plan?.lessons.reduce((n, l) => n + l.steps.length, 0) ?? 0;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Training builder">
      <div className="bg-white sm:rounded-2xl rounded-t-2xl max-w-3xl w-full max-h-[calc(100dvh-2rem)] flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> Guided training
            </p>
            <h2 className="text-lg font-bold text-slate-900">{plan?.title || 'Planning your training'}</h2>
            {plan && (
              <p className="text-xs text-slate-500">
                In a working copy of {plan.appName} · {plan.lessons.length} lessons · {steps} guided steps · about {Math.round(plan.minutes)} minutes
              </p>
            )}
          </div>
          <button
            onClick={() => {
              if (busy) stopAiRun();
              onClose();
            }}
            aria-label="Close"
            className="p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {plan && <p className="text-sm text-slate-700">{plan.summary}</p>}
          {plan?.lessons.map((l, i) => (
            <section key={i} className="p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="text-sm font-bold text-slate-900">
                {i + 1}. {l.title}
              </h3>
              <p className="text-xs text-slate-600">{l.intro}</p>
              <ol className="space-y-1.5">
                {l.steps.map((s, j) => (
                  <li key={j} className="text-sm text-slate-800 flex gap-2">
                    <span className="w-5 shrink-0 text-xs text-slate-400 tabular-nums pt-0.5">{j + 1}</span>
                    <span>
                      {s.instruction} <span className="block text-xs text-slate-500">{s.why}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {busy && (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> {stage}
            </p>
          )}
          {error && <p className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-950">{error}</p>}
          {built && !busy && (
            <p className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
              Built. Try it as your team will, then save it to your Training. The app also goes to Praxa&rsquo;s app library, so the next training or job
              simulation in {plan?.appName} builds on it.
            </p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-200 space-y-3">
          {plan && !busy && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (change.trim()) runPlan(change.trim());
              }}
              className="flex gap-2"
            >
              <input
                value={change}
                onChange={(e) => setChange(e.target.value)}
                placeholder="Ask for a change: another lesson, fewer steps, our refund policy…"
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg"
              />
              <button type="submit" disabled={!change.trim()} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40" aria-label="Change the plan">
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {!plan && !busy && (
              <button onClick={() => runPlan()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                Try again
              </button>
            )}
            {plan && !built && !busy && (
              <button onClick={build} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                Build the training
              </button>
            )}
            {built && !busy && (
              <>
                <button onClick={() => setTrying(true)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-800 inline-flex items-center gap-1.5">
                  <Play className="w-4 h-4" /> Try it
                </button>
                <button onClick={() => onSaved(built)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 inline-flex items-center gap-1.5">
                  <Save className="w-4 h-4" /> Save to Training
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {trying && built && <TrainingRunner test={built} preview onClose={() => setTrying(false)} />}
    </div>
  );
};

const planToGuide = (p: TrainingPlan) => ({ summary: p.summary, appName: p.appName, product: p.product, lessons: p.lessons.map((l, i) => ({ id: `l${i}`, ...l, steps: l.steps.map((s, j) => ({ id: `s${j}`, ...s })) })), wrapUp: p.wrapUp, appBrief: p.appBrief });
