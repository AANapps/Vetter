import React, { useEffect } from 'react';
import { ArrowLeft, Briefcase, CheckCircle2, Eye, Library, Plus, Wand2, X } from 'lucide-react';
import { AssessmentTest, levelName } from '../types';
import { CUSTOM_KIND_LABELS, CustomIdea } from '../lib/testAdvisor';

// What a company took from the home chat: ready-made tests it picked, the AI tests it built (or started), and the
// chat's other AI ideas it could still build. Shown after an AI test is built, or when it carries on with its picks,
// it ends by asking whether to create a job for the tests
export interface TestPlan {
  readyIds: string[];
  ideas: { idea: CustomIdea; testId?: string }[];
  suggestions: CustomIdea[];
}

interface TestPlanDialogProps {
  plan: TestPlan;
  tests: AssessmentTest[];
  // Whether the company has a job to add the tests to, besides creating one
  hasJobs: boolean;
  onChange: (plan: TestPlan) => void;
  onBuild: (idea: CustomIdea) => void;
  onOpenTest: (testId: string) => void;
  onCreateJob: (testIds: string[]) => void;
  onAddToJob: (testIds: string[]) => void;
  onBack: () => void;
}

export const TestPlanDialog: React.FC<TestPlanDialogProps> = ({ plan, tests, hasJobs, onChange, onBuild, onOpenTest, onCreateJob, onAddToJob, onBack }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onBack();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const find = (id?: string) => (id ? tests.find((x) => x.id === id) : undefined);
  const ready = plan.readyIds.flatMap((id) => (find(id) ? [find(id)!] : []));
  const built = plan.ideas.flatMap((i) => (find(i.testId) ? [find(i.testId)!] : []));
  const unbuilt = plan.ideas.filter((i) => !find(i.testId));
  const more = plan.suggestions.filter((s) => !plan.ideas.some((i) => i.idea.brief === s.brief));
  const all = [...built, ...ready];
  const ids = all.map((t) => t.id);
  const minutes = all.reduce((n, t) => n + t.estimatedMinutes, 0);

  const removeReady = (id: string) => onChange({ ...plan, readyIds: plan.readyIds.filter((x) => x !== id) });
  const removeIdea = (brief: string) => onChange({ ...plan, ideas: plan.ideas.filter((i) => i.idea.brief !== brief) });

  const Row: React.FC<{ test: AssessmentTest; source: 'ai' | 'ready'; onRemove: () => void }> = ({ test, source, onRemove }) => (
    <li className="px-4 py-3 flex items-center gap-3">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 truncate">{test.title}</div>
        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          {source === 'ai' ? (
            <>
              <Wand2 className="w-3 h-3 text-violet-600" /> Built with AI
            </>
          ) : (
            <>
              <Library className="w-3 h-3 text-indigo-600" /> {test.type === 'custom' ? 'Your test' : 'Ready-made'}
            </>
          )}
          &nbsp;&middot; {levelName(test.difficulty)} &middot; ~{test.estimatedMinutes} min
        </div>
      </div>
      <button onClick={() => onOpenTest(test.id)} className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-indigo-700 flex items-center gap-1">
        <Eye className="w-3 h-3" />
        View
      </button>
      <button onClick={onRemove} aria-label={`Remove ${test.title}`} className="p-1 text-slate-400 hover:text-rose-600">
        <X className="w-4 h-4" />
      </button>
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Your tests" className="bg-white sm:rounded-2xl rounded-t-2xl max-w-3xl w-full max-h-[calc(100dvh-1rem)] sm:max-h-[min(50rem,calc(100vh-2rem))] flex flex-col shadow-2xl">
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{all.length ? 'Your tests are ready' : 'Your tests'}</h2>
            <p className="text-sm text-slate-500">Everything you built and picked in the chat, together.</p>
          </div>
          <button onClick={onBack} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {all.length} {all.length === 1 ? 'test' : 'tests'} &middot; ~{minutes} min for a candidate
            </h3>
            {all.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing yet. Build one of the AI tests below, or go back and pick ready-made tests.</p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {plan.ideas.map((i) => {
                  const t = find(i.testId);
                  return t ? <Row key={t.id} test={t} source="ai" onRemove={() => removeIdea(i.idea.brief)} /> : null;
                })}
                {ready.map((t) => (
                  <Row key={t.id} test={t} source="ready" onRemove={() => removeReady(t.id)} />
                ))}
              </ul>
            )}
          </section>

          {(unbuilt.length > 0 || more.length > 0) && (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-violet-600" />
                {unbuilt.length ? 'Not built yet' : 'More you could build with AI'}
              </h3>
              <ul className="space-y-2">
                {[...unbuilt.map((i) => i.idea), ...more].map((idea) => {
                  const started = unbuilt.some((i) => i.idea.brief === idea.brief);
                  return (
                    <li key={idea.brief} className="px-4 py-3 rounded-xl border border-dashed border-violet-300 bg-violet-50/30 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{idea.title}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white text-indigo-700 border border-indigo-100">{CUSTOM_KIND_LABELS[idea.kind]}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{started ? 'Started but not saved. Build it again to add it.' : idea.why}</p>
                      </div>
                      <div className="flex items-center gap-1 self-start sm:self-auto shrink-0">
                        <button onClick={() => onBuild(idea)} className="px-3 py-1.5 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5" />
                          Build with AI
                        </button>
                        {started && (
                          <button onClick={() => removeIdea(idea.brief)} aria-label={`Remove ${idea.title}`} className="p-1 text-slate-400 hover:text-rose-600">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* The question this step asks */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 sm:rounded-b-2xl space-y-3">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 shrink-0 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </span>
            <div>
              <div className="text-sm font-bold text-slate-900">
                {all.length ? `Create a job for ${all.length === 1 ? 'this test' : `these ${all.length} tests`}?` : 'Create a job once your tests are ready'}
              </div>
              <p className="text-xs text-slate-500">
                The job is posted with the tests attached, so candidates who apply take them and you see everyone ranked by their results.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <button onClick={onBack} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 sm:mr-auto">
              <ArrowLeft className="w-4 h-4" />
              Not now, back to chat
            </button>
            {hasJobs && (
              <button
                onClick={() => onAddToJob(ids)}
                disabled={!ids.length}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 disabled:opacity-40 rounded-lg"
              >
                Add to an existing job
              </button>
            )}
            <button
              onClick={() => onCreateJob(ids)}
              disabled={!ids.length}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create a job
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
