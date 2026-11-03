import React, { useEffect } from 'react';
import { ArrowLeft, Check, CheckCircle2, Eye, Library, Plus, Wand2, X } from 'lucide-react';
import { AssessmentTest } from '../types';
import { CUSTOM_KIND_LABELS, CustomIdea } from '../lib/testAdvisor';

// What a company picked in the chat: ready-made tests to use as they are, and AI tests to build. Each AI test is
// built from here and comes back done, so everything ends up in one place before it goes onto a job
export interface TestPlan {
  readyIds: string[];
  ideas: { idea: CustomIdea; testId?: string }[];
}

interface TestPlanDialogProps {
  plan: TestPlan;
  tests: AssessmentTest[];
  onChange: (plan: TestPlan) => void;
  onBuild: (index: number) => void;
  onOpenTest: (testId: string) => void;
  onAddToJob: (testIds: string[]) => void;
  onBack: () => void;
}

export const TestPlanDialog: React.FC<TestPlanDialogProps> = ({ plan, tests, onChange, onBuild, onOpenTest, onAddToJob, onBack }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onBack();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const ready = plan.readyIds.flatMap((id) => {
    const t = tests.find((x) => x.id === id);
    return t ? [t] : [];
  });
  const built = plan.ideas.flatMap((i) => {
    const t = i.testId ? tests.find((x) => x.id === i.testId) : undefined;
    return t ? [t] : [];
  });
  const toBuild = plan.ideas.length - built.length;
  const all = [...ready, ...built];
  const minutes = all.reduce((n, t) => n + t.estimatedMinutes, 0);

  const removeReady = (id: string) => onChange({ ...plan, readyIds: plan.readyIds.filter((x) => x !== id) });
  const removeIdea = (index: number) => onChange({ ...plan, ideas: plan.ideas.filter((_, i) => i !== index) });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Your test plan" className="bg-white sm:rounded-2xl rounded-t-2xl max-w-3xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[min(48rem,calc(100vh-2rem))] flex flex-col shadow-2xl">
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Your test plan</h2>
            <p className="text-sm text-slate-500">
              Everything you picked in the chat. Build the AI tests, then add the whole set to a job.
            </p>
          </div>
          <button onClick={onBack} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
          {/* Ready-made */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Library className="w-3.5 h-3.5 text-indigo-600" />
              Ready-made tests &middot; {ready.length}
            </h3>
            {ready.length === 0 ? (
              <p className="text-sm text-slate-500">None picked.</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {ready.map((t) => (
                  <li key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Ready" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">{t.title}</div>
                      <div className="text-[11px] text-slate-500">
                        {t.type === 'custom' ? 'Your test' : 'Vetter'} &middot; {t.difficulty} &middot; ~{t.estimatedMinutes} min
                      </div>
                    </div>
                    <button onClick={() => onOpenTest(t.id)} className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-indigo-700 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    <button onClick={() => removeReady(t.id)} aria-label={`Remove ${t.title}`} className="p-1 text-slate-400 hover:text-rose-600">
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* AI tests */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-violet-600" />
              Built with AI &middot; {built.length} of {plan.ideas.length}
            </h3>
            {plan.ideas.length === 0 ? (
              <p className="text-sm text-slate-500">None picked. Pick a “Worth building” idea in the chat to add one.</p>
            ) : (
              <ul className="space-y-2">
                {plan.ideas.map(({ idea, testId }, i) => {
                  const test = testId ? tests.find((x) => x.id === testId) : undefined;
                  return (
                    <li key={idea.brief} className={`px-4 py-3 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-3 ${test ? 'border-slate-200' : 'border-dashed border-violet-300 bg-violet-50/30'}`}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {test ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Built" /> : <Wand2 className="w-4 h-4 text-violet-600 shrink-0" />}
                          <span className="text-sm font-semibold text-slate-900">{test ? test.title : idea.title}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-indigo-100">{CUSTOM_KIND_LABELS[idea.kind]}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{test ? `Built · ~${test.estimatedMinutes} min · ${test.totalQuestions} questions` : idea.why}</p>
                      </div>
                      <div className="flex items-center gap-1 self-start sm:self-auto shrink-0">
                        {test ? (
                          <button onClick={() => onOpenTest(test.id)} className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-indigo-700 flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                        ) : (
                          <button onClick={() => onBuild(i)} className="px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center gap-1.5">
                            <Wand2 className="w-3.5 h-3.5" />
                            Build with AI
                          </button>
                        )}
                        <button onClick={() => removeIdea(i)} aria-label={`Remove ${idea.title}`} className="p-1 text-slate-400 hover:text-rose-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-sm text-slate-600 sm:mr-auto">
            <span className="font-semibold text-slate-900">
              {all.length} {all.length === 1 ? 'test' : 'tests'} ready
            </span>
            {all.length > 0 && <> &middot; ~{minutes} min for a candidate</>}
            {toBuild > 0 && <span className="block text-xs text-amber-700">{toBuild} AI {toBuild === 1 ? 'test' : 'tests'} not built yet; only built tests are added.</span>}
          </div>
          <button onClick={onBack} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg flex items-center justify-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            Back to chat
          </button>
          <button
            onClick={() => onAddToJob(all.map((t) => t.id))}
            disabled={all.length === 0}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center justify-center gap-1.5"
          >
            {all.length ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {all.length ? `Add ${all.length} ${all.length === 1 ? 'test' : 'tests'} to a job` : 'Nothing ready yet'}
          </button>
        </div>
      </div>
    </div>
  );
};
