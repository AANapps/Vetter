import React, { useState } from 'react';
import { AssessmentTest, Business, Exam } from '../types';
import { isMainVersion, levelsOf } from '../lib/testLevels';
import { ArrowLeft, ArrowRight, Check, Link2, Search, X } from 'lucide-react';

interface CreateAssessmentProps {
  // The companies it can be made for: just the signed-in one, or every company for the Vetter team
  businesses: Business[];
  createdBy: Exam['createdBy'];
  tests: AssessmentTest[];
  // Tests already picked, e.g. when sending one from its page
  initialTestIds?: string[];
  onCreate: (exam: Exam) => void;
  onCancel: () => void;
}

const inputClass =
  'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

const STEPS = ['Pick tests', 'Details'] as const;

// Making an assessment is two steps: choose the tests, then name it. The link comes straight after.
export const CreateAssessment: React.FC<CreateAssessmentProps> = ({ businesses, createdBy, tests, initialTestIds = [], onCreate, onCancel }) => {
  const [step, setStep] = useState(0);
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? '');
  const business = businesses.find((b) => b.id === businessId) ?? businesses[0];
  // Picked tests in the order they were ticked: main version id → the level chosen
  const [picked, setPicked] = useState<{ mainId: string; testId: string }[]>(() =>
    initialTestIds.flatMap((id) => {
      const t = tests.find((x) => x.id === id);
      return t ? [{ mainId: t.familyId ?? t.id, testId: t.id }] : [];
    })
  );
  const [testQuery, setTestQuery] = useState('');
  const pickedTests = picked.map((p) => tests.find((t) => t.id === p.testId)).filter((t): t is AssessmentTest => !!t);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(() => (pickedTests.length === 1 ? pickedTests[0].passingScore : 70));
  const [dueDate, setDueDate] = useState('');

  const tq = testQuery.trim().toLowerCase();
  const choices = tests
    .filter((t) => isMainVersion(t) && (t.type === 'standard' || t.businessId === business?.id))
    .filter((t) => !tq || `${t.title} ${t.category} ${t.companyName ?? ''} ${t.skillsTested.join(' ')}`.toLowerCase().includes(tq));
  const minutes = pickedTests.reduce((sum, t) => sum + t.estimatedMinutes, 0);

  const toggle = (main: AssessmentTest) =>
    setPicked((prev) => (prev.some((p) => p.mainId === main.id) ? prev.filter((p) => p.mainId !== main.id) : [...prev, { mainId: main.id, testId: main.id }]));

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || pickedTests.length === 0) return;
    onCreate({
      id: `exam-${Date.now()}`,
      title: title.trim() || pickedTests[0].title,
      description: description.trim() || `${business.name} would like you to take ${pickedTests.length === 1 ? 'this test' : 'these tests'}.`,
      businessId: business.id,
      companyName: business.name,
      createdBy,
      testIds: pickedTests.map((t) => t.id),
      passingScore,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      invitations: [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white sm:rounded-2xl rounded-t-2xl max-w-2xl w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl">
        {/* Steps */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">New assessment</h2>
            <button onClick={onCancel} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
          <ol className="flex items-center gap-2 text-xs">
            {[...STEPS, 'Send link'].map((label, i) => (
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

        <form onSubmit={create} className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
            {step === 0 && (
              <>
                {businesses.length > 1 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">For which company</label>
                    <select
                      value={businessId}
                      onChange={(e) => {
                        setBusinessId(e.target.value);
                        setPicked((prev) => prev.filter((p) => tests.find((t) => t.id === p.mainId)?.type === 'standard'));
                      }}
                      className={inputClass}
                    >
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
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
                  {choices.map((t) => {
                    const pick = picked.find((p) => p.mainId === t.id);
                    const levels = levelsOf(t, tests);
                    return (
                      <li key={t.id} className={`px-4 py-3 flex items-center gap-3 ${pick ? 'bg-indigo-50/50' : ''}`}>
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
                                {v.difficulty}
                              </option>
                            ))}
                          </select>
                        )}
                      </li>
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
                  <label htmlFor="a-title" className="block text-xs font-semibold text-slate-700 mb-1">
                    Name
                  </label>
                  <input id="a-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={pickedTests[0]?.title} className={inputClass} />
                  <p className="text-[11px] text-slate-500 mt-1">Candidates see this, e.g. "Graduate Analyst 2027".</p>
                </div>
                <div>
                  <label htmlFor="a-desc" className="block text-xs font-semibold text-slate-700 mb-1">
                    Message to candidates <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea id="a-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="a-pass" className="block text-xs font-semibold text-slate-700 mb-1">
                      Pass mark {pickedTests.length > 1 && <span className="font-normal text-slate-400">(average)</span>}
                    </label>
                    <input
                      id="a-pass"
                      type="number"
                      min={0}
                      max={100}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Number(e.target.value))}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label htmlFor="a-due" className="block text-xs font-semibold text-slate-700 mb-1">
                      Deadline <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input id="a-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
            {step === 0 && (
              <span className="text-xs text-slate-500">
                {picked.length === 0 ? 'Pick at least one test' : `${picked.length} picked · ~${minutes} min`}
              </span>
            )}
            {step === 0 ? (
              // Keyed apart from Create link, so the click that moves on isn't taken as a submit when this button becomes it
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
                <Link2 className="w-4 h-4" />
                Create link
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
