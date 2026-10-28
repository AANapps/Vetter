import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, Library, Pencil, Sparkles, X } from 'lucide-react';
import { AssessmentTest, Business, JobPosting, QuestionType, TEST_DIFFICULTIES, TestDifficulty } from '../types';
import { ANSWER_TYPES, QUESTION_STYLES } from '../lib/questionTypes';
import { GenerationResult, generateTests, jobBrief } from '../lib/testGeneration';
import { versionTitle } from '../lib/testLevels';
import { Pulse } from './Pulse';

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

// Describe the job or the test you want; Vetter picks library tests that fit and writes a new one
export const TestGenerator: React.FC<TestGeneratorProps> = ({ job, business, tests, onOpenTest, onSaveTest, onAddToJob, onEditDraft, onClose }) => {
  const [prompt, setPrompt] = useState(() => (job ? jobBrief(job) : ''));
  const [wantExisting, setWantExisting] = useState(!!job);
  const [wantNewTest, setWantNewTest] = useState(true);
  const [questionCount, setQuestionCount] = useState(6);
  const [level, setLevel] = useState<TestDifficulty>(() => levelFor(job));
  // Answer styles suit any job; coding and SQL are on when the job's tests already use them
  const [styles, setStyles] = useState<QuestionType[]>(() => {
    const used = new Set(tests.filter((t) => job?.testIds.includes(t.id)).flatMap((t) => t.questions.map((q) => q.type)));
    return [...ANSWER_TYPES, ...(['code', 'sql'] as QuestionType[]).filter((t) => used.has(t))];
  });
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [keepNew, setKeepNew] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !working && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, working]);

  const ask = async () => {
    setWorking(true);
    const res = await generateTests({ prompt, wantExisting, wantNewTest, questionCount, styles, level, title: job?.title }, tests, business);
    setResult(res);
    setChosen(res.existing.filter((s) => !job?.testIds.includes(s.test.id)).map((s) => s.test.id));
    setKeepNew(!!res.test);
    setWorking(false);
  };

  const canAsk = prompt.trim().length > 20 && (wantExisting || (wantNewTest && styles.length > 0));
  const addCount = chosen.length + (result?.test && keepNew ? 1 : 0);

  const finish = () => {
    if (!result) return;
    const ids = [...chosen];
    if (result.test && keepNew) ids.push(onSaveTest(result.test));
    if (job && ids.length) onAddToJob(job.id, ids);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="Suggest tests" className="bg-white sm:rounded-2xl rounded-t-2xl max-w-2xl w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl">
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              {job ? 'Suggest tests for this job' : 'Write a test with AI'}
            </h2>
            <p className="text-xs text-slate-500 truncate">
              {job ? `${job.title} · from the job description` : business ? `For ${business.name}'s jobs` : 'For the Vetter test library'}
            </p>
          </div>
          <button onClick={onClose} disabled={working} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          {working ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center">
              <Pulse label="Building your test" />
              <WorkingStep writing={wantNewTest} />
              <p className="text-xs text-slate-500 max-w-sm">
                {wantNewTest ? 'Every question is checked before you see it: coding answers and SQL queries are run, and anything that fails is left out.' : ''}
              </p>
            </div>
          ) : !result ? (
            <div className="space-y-5">
              <div>
                <label htmlFor="gen-prompt" className="block text-xs font-semibold text-slate-700 mb-1">
                  {job ? 'The job (edit it to steer the tests)' : 'Describe the test or the job it is for'}
                </label>
                <textarea
                  id="gen-prompt"
                  rows={job ? 9 : 5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. A junior accounts assistant who reconciles bank statements, posts journals and helps with month-end close. Mostly Excel and Xero."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-semibold text-slate-700 mb-1">What Vetter should do</legend>
                <label className="flex items-start gap-2 text-sm text-slate-800 cursor-pointer">
                  <input type="checkbox" checked={wantExisting} onChange={(e) => setWantExisting(e.target.checked)} className="mt-1 accent-indigo-600" />
                  <span>
                    Pick tests from Vetter's library <span className="text-slate-500">that fit</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-slate-800 cursor-pointer">
                  <input type="checkbox" checked={wantNewTest} onChange={(e) => setWantNewTest(e.target.checked)} className="mt-1 accent-indigo-600" />
                  <span>
                    Write a completely new test <span className="text-slate-500">for what the library doesn't cover</span>
                  </span>
                </label>
              </fieldset>

              {wantNewTest && (
                <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <div>
                      <label htmlFor="gen-count" className="block text-xs font-semibold text-slate-700 mb-1">
                        Questions
                      </label>
                      <select id="gen-count" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm">
                        {[4, 5, 6, 8, 10, 12].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="gen-level" className="block text-xs font-semibold text-slate-700 mb-1">
                        Level
                      </label>
                      <select id="gen-level" value={level} onChange={(e) => setLevel(e.target.value as TestDifficulty)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm">
                        {TEST_DIFFICULTIES.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <fieldset>
                    <legend className="block text-xs font-semibold text-slate-700 mb-1.5">Question styles it can use</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {QUESTION_STYLES.map((s) => (
                        <label
                          key={s.type}
                          className={`px-2.5 py-1 rounded-full border text-xs cursor-pointer ${
                            styles.includes(s.type) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={styles.includes(s.type)}
                            onChange={() => setStyles((prev) => (prev.includes(s.type) ? prev.filter((x) => x !== s.type) : [...prev, s.type]))}
                            className="sr-only"
                          />
                          {s.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {wantExisting && (
                <section className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Library className="w-4 h-4 text-indigo-600" />
                    From Vetter's library
                  </h3>
                  {result.existing.length === 0 ? (
                    <p className="text-xs text-slate-500">Nothing in the library fits this closely.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                      {result.existing.map(({ test, reason }) => {
                        const onJob = !!job?.testIds.includes(test.id);
                        return (
                          <li key={test.id} className="px-4 py-3 flex items-start gap-3">
                            {job && (
                              <input
                                type="checkbox"
                                checked={onJob || chosen.includes(test.id)}
                                disabled={onJob}
                                onChange={() => setChosen((prev) => (prev.includes(test.id) ? prev.filter((x) => x !== test.id) : [...prev, test.id]))}
                                aria-label={`Add ${test.title}`}
                                className="mt-1 accent-indigo-600"
                              />
                            )}
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
                  )}
                </section>
              )}

              {wantNewTest && (
                <section className="space-y-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    New test
                  </h3>
                  {result.newTestError ? (
                    <p className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      {result.newTestError}
                    </p>
                  ) : (
                    result.test && (
                      <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          {job && <input type="checkbox" checked={keepNew} onChange={(e) => setKeepNew(e.target.checked)} aria-label="Add the new test" className="mt-1 accent-indigo-600" />}
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">{result.test.title}</div>
                            <p className="text-xs text-slate-600">{result.test.description}</p>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {result.test.category} &middot; {result.test.difficulty} &middot; {result.test.questions.length} questions &middot; ~{result.test.estimatedMinutes} min &middot;
                              pass {result.test.passingScore}
                            </div>
                          </div>
                        </div>
                        <ol className="text-xs text-slate-700 space-y-1 pl-1">
                          {result.test.questions.map((q, i) => (
                            <li key={q.id} className="flex gap-2">
                              <span className="font-mono text-slate-400">{i + 1}.</span>
                              <span className="min-w-0">
                                {q.title} <span className="text-slate-400">· {QUESTION_STYLES.find((s) => s.type === q.type)?.label}</span>
                              </span>
                            </li>
                          ))}
                        </ol>
                        {result.source === 'bank' && (
                          <p className="text-[11px] text-slate-500">
                            Put together from the best-fitting questions in Vetter's tests. {result.aiNote}
                          </p>
                        )}
                        {result.dropped > 0 && (
                          <p className="text-[11px] text-slate-500">
                            {result.dropped} {result.dropped === 1 ? 'question' : 'questions'} the AI wrote failed Vetter's checks and {result.dropped === 1 ? 'was' : 'were'} left out.
                          </p>
                        )}
                        <button
                          onClick={() => {
                            onEditDraft(result.test!, chosen);
                            onClose();
                          }}
                          className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Review and edit every question first
                        </button>
                      </div>
                    )
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
          {result && !working && (
            <button onClick={() => setResult(null)} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Change request
            </button>
          )}
          {!result ? (
            <button
              onClick={ask}
              disabled={!canAsk || working}
              className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Ask Vetter
            </button>
          ) : job ? (
            <button
              onClick={finish}
              disabled={addCount === 0}
              className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {addCount === 0 ? 'Nothing picked' : `Add ${addCount} ${addCount === 1 ? 'test' : 'tests'} to the job`}
            </button>
          ) : (
            result.test && (
              <button onClick={finish} className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Save test as it is
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

const WRITING_STEPS = ['Reading the job…', 'Choosing what to test…', 'Writing the questions…', 'Checking every answer…', 'Nearly there…'];

// What Vetter is doing, moving on every few seconds and holding on the last step
const WorkingStep: React.FC<{ writing: boolean }> = ({ writing }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!writing) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, WRITING_STEPS.length - 1)), 4000);
    return () => clearInterval(timer);
  }, [writing]);
  return (
    <p className="text-sm font-semibold text-slate-900" aria-live="polite">
      {writing ? WRITING_STEPS[step] : 'Finding tests that fit…'}
    </p>
  );
};
