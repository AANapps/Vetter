import React, { useState } from 'react';
import { BackButton } from './BackButton';
import { AssessmentTest, JobPosting, isJobSim, isPublic, levelName } from '../types';
import { isMainVersion, levelsOf, newestFirst } from '../lib/testLevels';
import { ArrowLeft, ArrowRight, Check, Search, Sparkles, X } from 'lucide-react';

interface JobTestsEditorProps {
  // The jobs the tests can be for: just one when opened from a job, or all of them when sending a test from its page
  jobs: JobPosting[];
  tests: AssessmentTest[];
  // Whether a library test may be offered (what the Praxa team hid isn't); every test when left out
  isListed?: (t: AssessmentTest) => boolean;
  // Tests to add, e.g. when sending one from its page
  addTestIds?: string[];
  onSave: (jobId: string, change: Pick<JobPosting, 'testIds' | 'testsRequired' | 'maxAttempts' | 'aiInSimulations'>) => void;
  onCancel: () => void;
}

const inputClass =
  'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

const STEPS = ['Pick tests', 'Details'] as const;

// A job's attempts per test: what it's set to, or 2 for a job getting its first tests (0 is no limit)
const attemptsFor = (job: JobPosting | undefined) => job?.maxAttempts ?? (job?.testIds.length ? 0 : 2);

// Choosing a job's tests is two steps: pick them, then set whether they're needed to apply
export const JobTestsEditor: React.FC<JobTestsEditorProps> = ({ jobs, tests: allTests, isListed = () => true, addTestIds = [], onSave, onCancel }) => {
  // Training is for a company's team, never a job's candidates
  const tests = allTests.filter((t) => t.purpose !== 'training');
  const [step, setStep] = useState(0);
  const [jobId, setJobId] = useState(jobs[0]?.id ?? '');
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];
  // Picked tests in the order they were ticked: main version id → the level chosen
  const pickedFor = (j: JobPosting | undefined) =>
    [...new Set([...(j?.testIds ?? []), ...addTestIds])].flatMap((id) => {
      const t = tests.find((x) => x.id === id);
      return t ? [{ mainId: t.familyId ?? t.id, testId: t.id }] : [];
    });
  const [picked, setPicked] = useState<{ mainId: string; testId: string }[]>(() => pickedFor(job));
  const [testQuery, setTestQuery] = useState('');
  const pickedTests = picked.map((p) => tests.find((t) => t.id === p.testId)).filter((t): t is AssessmentTest => !!t);
  const [required, setRequired] = useState(() => job?.testsRequired ?? true);
  const [maxAttempts, setMaxAttempts] = useState(() => attemptsFor(job));
  const [aiInSims, setAiInSims] = useState(() => job?.aiInSimulations !== false);
  const switchJob = (id: string) => {
    const next = jobs.find((j) => j.id === id);
    setJobId(id);
    setPicked(pickedFor(next));
    setRequired(next?.testsRequired ?? true);
    setMaxAttempts(attemptsFor(next));
    setAiInSims(next?.aiInSimulations !== false);
  };

  const tq = testQuery.trim().toLowerCase();
  const matching = tests
    .filter((t) => isMainVersion(t) && ((isPublic(t) && isListed(t)) || t.businessId === job?.businessId))
    .filter((t) => !tq || `${t.title} ${t.category} ${t.companyName ?? ''} ${t.skillsTested.join(' ')}`.toLowerCase().includes(tq));
  // The company's own tests first, the newest at the top, then Praxa's
  const own = newestFirst(matching.filter((t) => t.type === 'custom' && t.businessId === job?.businessId && t.purpose !== 'training'));
  const choices = [...own, ...matching.filter((t) => !own.includes(t))];
  const minutes = pickedTests.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const toggle = (main: AssessmentTest) =>
    setPicked((prev) => (prev.some((p) => p.mainId === main.id) ? prev.filter((p) => p.mainId !== main.id) : [...prev, { mainId: main.id, testId: main.id }]));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || pickedTests.length === 0) return;
    onSave(job.id, { testIds: pickedTests.map((t) => t.id), testsRequired: required, maxAttempts, aiInSimulations: aiInSims });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white sm:rounded-2xl rounded-t-2xl max-w-2xl w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl">
        {/* Steps */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{jobs.length === 1 && job ? `Tests for ${job.title}` : 'Add tests to a job'}</h2>
            <button onClick={onCancel} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <ol className="flex items-center gap-2 text-xs">
            {[...STEPS, 'Send'].map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                {i > 0 && <span className="w-6 h-px bg-slate-300" />}
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className={i === step ? 'font-semibold text-slate-900' : 'text-slate-500'}>{label}</span>
              </li>
            ))}
          </ol>
        </div>

        <form onSubmit={save} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            {step === 0 && (
              <>
                {jobs.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">For which job</label>
                    <select value={jobId} onChange={(e) => switchJob(e.target.value)} className={inputClass}>
                      {jobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.companyName}: {j.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Search tests by name, category or skill"
                    aria-label="Search tests"
                    className={`${inputClass} pl-9`}
                  />
                </div>
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {choices.length === 0 && <li className="px-4 py-3 text-xs text-slate-500">No tests match.</li>}
                  {choices.map((t, i) => {
                    const pick = picked.find((p) => p.mainId === t.id);
                    const levels = levelsOf(t, tests);
                    // A heading where the company's own tests start, and where Praxa's start after them
                    const heading = i === 0 && own.length ? 'Your tests' : i === own.length ? 'Praxa tests' : '';
                    return (
                      <React.Fragment key={t.id}>
                      {heading && <li className="px-4 py-1.5 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">{heading}</li>}
                      <li className={`px-4 py-3 flex items-center gap-3 ${pick ? 'bg-indigo-50/50' : ''}`}>
                        <label className="flex items-start gap-3 cursor-pointer flex-1 min-w-0">
                          <input type="checkbox" checked={!!pick} onChange={() => toggle(t)} className="mt-1 accent-indigo-600" />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900">
                              {pick && <span className="text-indigo-700 mr-1">{picked.indexOf(pick) + 1}.</span>}
                              {t.title}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {t.type === 'custom' ? 'Your own test' : t.category} &middot; ~{t.estimatedMinutes} min
                            </span>
                          </span>
                        </label>
                        {pick && levels.length > 1 && (
                          <select
                            value={pick.testId}
                            onChange={(e) => setPicked((prev) => prev.map((p) => (p.mainId === t.id ? { ...p, testId: e.target.value } : p)))}
                            aria-label={`${t.title}: level`}
                            className="px-2 py-1 bg-white border border-slate-300 rounded text-xs font-medium"
                          >
                            {levels.map((v) => (
                              <option key={v.id} value={v.id}>
                                {levelName(v.difficulty)}
                              </option>
                            ))}
                          </select>
                        )}
                      </li>
                      </React.Fragment>
                    );
                  })}
                </ul>
              </>
            )}

            {step === 1 && (
              <>
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {pickedTests.length} {pickedTests.length === 1 ? 'test' : 'tests'}
                  </span>{' '}
                  &middot; ~{minutes} min in total: {pickedTests.map((t) => t.title).join(', ')}
                </div>
                <div>
                  <label className="flex items-center gap-2 py-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="accent-indigo-600" />
                    Required to apply
                  </label>
                </div>
                <div>
                  <label htmlFor="a-attempts" className="block text-xs font-semibold text-slate-700 mb-1">
                    Attempts per test
                  </label>
                  <select id="a-attempts" value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} className={inputClass}>
                    <option value={1}>1: one sitting, no retakes</option>
                    <option value={2}>2: one retake</option>
                    <option value={3}>3: two retakes</option>
                    <option value={0}>No limit</option>
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Every start counts, including one left without submitting, and you see those on the job. Fewer attempts means less chance to
                    learn the questions and come back.
                  </p>
                </div>
                {pickedTests.some(isJobSim) && (
                  <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 space-y-2">
                    <label className="flex items-start gap-2 text-sm text-slate-800 cursor-pointer">
                      <input type="checkbox" checked={aiInSims} onChange={(e) => setAiInSims(e.target.checked)} className="mt-0.5 accent-indigo-600" />
                      <span>
                        <span className="font-semibold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          Allow the AI assistant in the job simulation
                        </span>
                        <span className="block text-xs text-slate-600 mt-1 leading-relaxed">
                          We recommend leaving this on. AI is now part of everyday work: most people in this kind of job use an AI assistant to draft, check
                          and speed things up, and you'll want them to. With it on, the simulation shows how well they use it: what they ask, whether they
                          check its answers, and whether the work they hand in is right. You see their full AI conversation with their answers. Turn it off
                          only if you need to see what they can do entirely on their own.
                        </span>
                      </span>
                    </label>
                    {!aiInSims && <p className="text-xs text-amber-800">The AI assistant will be taken off the simulation's desktop for this job's candidates.</p>}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
            {step > 0 && (
              <BackButton onClick={() => setStep(step - 1)}>Back</BackButton>
            )}
            {step === 0 && (
              <span className="text-xs text-slate-500">
                {picked.length === 0 ? 'Pick at least one test' : `${picked.length} picked · ~${minutes} min`}
              </span>
            )}
            {step === 0 ? (
              // Keyed apart from Save, so the click that moves on isn't taken as a submit when this button becomes it
              <button
                key="next"
                type="button"
                disabled={picked.length === 0}
                onClick={() => setStep(1)}
                className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button key="create" type="submit" className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Save tests
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
