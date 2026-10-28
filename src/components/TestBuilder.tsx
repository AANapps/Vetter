import React, { useState } from 'react';
import { AlertCircle, ArrowDown, ArrowUp, Check, Eye, FileText, Plus, Trash2, X } from 'lucide-react';
import { AssessmentTest, Business, Question, QuestionType, SkillCategory, TEST_DIFFICULTIES, TestRole } from '../types';
import { SKILL_IDS } from '../data/seedCandidates';
import { ROLE_GROUPS } from '../lib/testRoles';
import { QUESTION_STYLES, blankQuestion, questionProblems, tidyQuestion } from '../lib/questionTypes';
import { QuestionEditor, inputClass, labelClass } from './QuestionEditors';
import { TestRunner } from './TestRunner';

interface TestBuilderProps {
  // A company writes tests for its own jobs; without one, the Vetter team writes tests for the public library
  business?: Business;
  // The test being edited, or undefined for a new one
  initial?: AssessmentTest;
  // A new test to start from, such as one Vetter's AI wrote; saved as a new test
  draft?: AssessmentTest;
  onSave: (test: AssessmentTest) => void;
  onCancel: () => void;
}

const CATEGORIES = Object.keys(SKILL_IDS) as SkillCategory[];

// Where the builder is: the test's details, or one of its questions
type Selection = 'details' | number;

// Writing a test: its details, then questions in any mix of styles, tried out as a candidate before saving
export const TestBuilder: React.FC<TestBuilderProps> = ({ business, initial, draft, onSave, onCancel }) => {
  const isVetter = !business;
  const source = initial ?? draft;
  const [title, setTitle] = useState(source?.title ?? '');
  const [description, setDescription] = useState(source?.description ?? '');
  const [category, setCategory] = useState<SkillCategory>(source?.category ?? 'Data Analysis');
  const [difficulty, setDifficulty] = useState(source?.difficulty ?? 'Junior');
  const [passingScore, setPassingScore] = useState(source?.passingScore ?? 70);
  const [skills, setSkills] = useState((source?.skillsTested ?? []).join(', '));
  const [roles, setRoles] = useState<TestRole[]>(source?.roles ?? []);
  const [questions, setQuestions] = useState<Question[]>(source?.questions ?? []);
  const [selected, setSelected] = useState<Selection>('details');
  const [picking, setPicking] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const [preview, setPreview] = useState<AssessmentTest | null>(null);

  const totalPoints = questions.reduce((sum, q) => sum + q.weight, 0) || 1;
  const minutes = questions.reduce((sum, q) => sum + q.timeLimitMinutes, 0);
  const share = (q: Question) => Math.round((q.weight / totalPoints) * 100);
  const detailProblems = [
    ...(!title.trim() ? ['Give the test a title'] : []),
    ...(questions.length === 0 ? ['Add at least one question'] : []),
    ...(isVetter && roles.length === 0 ? ['Pick at least one role it suits'] : []),
  ];
  const problemsByQuestion = questions.map(questionProblems);
  const problemCount = detailProblems.length + problemsByQuestion.reduce((n, p) => n + p.length, 0);

  const updateQuestion = (index: number, change: Partial<Question>) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...change } : q)));
  const addQuestion = (type: QuestionType) => {
    setQuestions((prev) => [...prev, blankQuestion(type)]);
    setSelected(questions.length);
    setPicking(false);
  };
  const moveQuestion = (from: number, to: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    if (selected === from) setSelected(to);
    else if (selected === to) setSelected(from);
  };
  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    setSelected('details');
  };

  // The test as candidates will get it: blanks dropped, and points turned into percentages of the score
  const build = (): AssessmentTest => {
    const tidy = questions.map(tidyQuestion);
    const total = tidy.reduce((sum, q) => sum + q.weight, 0) || 1;
    const skillsTested = skills.split(',').map((s) => s.trim()).filter(Boolean);
    return {
      id: initial?.id ?? `test-${isVetter ? 'vetter' : 'custom'}-${Date.now()}`,
      title: title.trim(),
      category,
      difficulty,
      type: isVetter ? 'standard' : 'custom',
      ...(business && { businessId: business.id, companyName: business.name }),
      description: description.trim() || (business ? `Test written by ${business.name} for its own hiring.` : `A Vetter test of ${category.toLowerCase()} skills.`),
      estimatedMinutes: Math.max(1, minutes),
      passingScore,
      totalQuestions: tidy.length,
      questions: tidy.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) })),
      skillsTested: skillsTested.length ? skillsTested : [category],
      ...(isVetter && { roles }),
    };
  };

  const save = () => {
    if (problemCount > 0) {
      setShowProblems(true);
      return;
    }
    onSave(build());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col text-slate-900">
      {/* Header */}
      <div className="h-14 shrink-0 border-b border-slate-200 bg-white px-4 sm:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onCancel} aria-label="Close without saving" className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">{initial ? `Edit ${initial.title}` : draft ? 'Review the AI draft' : 'New test'}</h1>
            <p className="text-[11px] text-slate-500 truncate">
              {business ? `For ${business.name}'s jobs` : 'For the Vetter test library, open to every candidate'} &middot; {questions.length}{' '}
              {questions.length === 1 ? 'question' : 'questions'} &middot; ~{minutes} min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setPreview(build())}
            disabled={questions.length === 0 || problemsByQuestion.some((p) => p.length > 0)}
            title={questions.length === 0 ? 'Add a question first' : 'Finish every question to try the test'}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 disabled:opacity-40 rounded-lg flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Try it as a candidate</span>
            <span className="sm:hidden">Try it</span>
          </button>
          <button onClick={save} className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" />
            Save test
          </button>
        </div>
      </div>

      {showProblems && problemCount > 0 && (
        <div className="px-4 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-px" />
          <div className="flex-1">
            <span className="font-semibold">Before saving: </span>
            {[
              ...detailProblems,
              ...problemsByQuestion.flatMap((p, i) => (p.length ? [`Question ${i + 1}: ${p.join(', ').toLowerCase()}`] : [])),
            ].join(' · ')}
          </div>
          <button onClick={() => setShowProblems(false)} aria-label="Dismiss" className="text-amber-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Outline */}
        <nav aria-label="Test outline" className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-white overflow-y-auto max-h-56 md:max-h-none">
          <div className="p-3 space-y-1">
            <OutlineButton active={selected === 'details'} onClick={() => setSelected('details')} hasProblem={showProblems && detailProblems.length > 0}>
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Test details</span>
            </OutlineButton>
            <div className="pt-3 pb-1 px-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">Questions</div>
            {questions.length === 0 && <p className="px-2 text-xs text-slate-500">None yet. Add your first below.</p>}
            {questions.map((q, i) => (
              <div key={q.id} className="group flex items-center">
                <OutlineButton active={selected === i} onClick={() => setSelected(i)} hasProblem={showProblems && problemsByQuestion[i].length > 0}>
                  <span className="font-mono text-[11px] text-slate-400 w-4 shrink-0">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{q.title || 'Untitled'}</span>
                    <span className="block text-[10px] text-slate-500">
                      {QUESTION_STYLES.find((s) => s.type === q.type)?.label ?? q.type} &middot; {share(q)}%
                    </span>
                  </span>
                </OutlineButton>
                <div className="flex flex-col opacity-60 group-hover:opacity-100">
                  <button onClick={() => moveQuestion(i, i - 1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`} className="p-0.5 text-slate-400 hover:text-indigo-700 disabled:opacity-30">
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => moveQuestion(i, i + 1)}
                    disabled={i === questions.length - 1}
                    aria-label={`Move question ${i + 1} down`}
                    className="p-0.5 text-slate-400 hover:text-indigo-700 disabled:opacity-30"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => setPicking(true)}
              className="mt-2 w-full px-3 py-2 text-xs font-semibold text-indigo-700 border border-dashed border-indigo-300 hover:bg-indigo-50 rounded-lg flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add question
            </button>
          </div>
        </nav>

        {/* Editor */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 sm:p-8">
            {picking ? (
              <StylePicker onPick={addQuestion} onCancel={() => setPicking(false)} />
            ) : selected === 'details' ? (
              <div className="space-y-5">
                <h2 className="text-lg font-bold">Test details</h2>
                <div>
                  <label htmlFor="tb-title" className={labelClass}>
                    Title
                  </label>
                  <input id="tb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Month-end Close & Reconciliation" className={inputClass} />
                </div>
                <div>
                  <label htmlFor="tb-desc" className={labelClass}>
                    What it covers
                  </label>
                  <textarea
                    id="tb-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="One or two sentences candidates read before starting."
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="tb-cat" className={labelClass}>
                      Skill
                    </label>
                    <select id="tb-cat" value={category} onChange={(e) => setCategory(e.target.value as SkillCategory)} className={inputClass}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tb-level" className={labelClass}>
                      Level
                    </label>
                    <select id="tb-level" value={difficulty} onChange={(e) => setDifficulty(e.target.value as AssessmentTest['difficulty'])} className={inputClass}>
                      {TEST_DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tb-pass" className={labelClass}>
                      Pass mark
                    </label>
                    <input
                      id="tb-pass"
                      type="number"
                      min={0}
                      max={100}
                      value={passingScore}
                      onChange={(e) => setPassingScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="tb-skills" className={labelClass}>
                    Skills tested <span className="font-normal text-slate-400">(comma separated)</span>
                  </label>
                  <input id="tb-skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="e.g. Reconciliation, Accruals, Excel" className={inputClass} />
                </div>
                {isVetter && (
                  <fieldset>
                    <legend className={labelClass}>Roles it suits</legend>
                    <p className="text-[11px] text-slate-500 mb-2">Candidates find it under these roles and their fields on the Tests page.</p>
                    <div className="space-y-3">
                      {ROLE_GROUPS.map((g) => (
                        <div key={g.industry}>
                          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1">{g.industry}</div>
                          <div className="flex flex-wrap gap-1.5">
                            {g.roles.map((r) => (
                              <label
                                key={r}
                                className={`px-2.5 py-1 rounded-full border text-xs cursor-pointer ${
                                  roles.includes(r) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={roles.includes(r)}
                                  onChange={() => setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]))}
                                  className="sr-only"
                                />
                                {r}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </fieldset>
                )}
                <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-900">Time:</span> ~{minutes} minutes, the sum of each question's time.
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Scoring:</span> each question's points become its share of the score out of 100.
                  </div>
                </div>
                {questions.length === 0 && (
                  <button onClick={() => setPicking(true)} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    Add your first question
                  </button>
                )}
              </div>
            ) : questions[selected] ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold">Question {selected + 1}</h2>
                  <button onClick={() => removeQuestion(selected)} className="text-xs font-semibold text-slate-500 hover:text-rose-700 flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
                {problemsByQuestion[selected].length > 0 && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 rounded-lg px-3 py-2">To finish: {problemsByQuestion[selected].join(' · ')}</p>
                )}
                <QuestionEditor key={questions[selected].id} question={questions[selected]} onChange={(change) => updateQuestion(selected, change)} share={share(questions[selected])} />
              </div>
            ) : null}
          </div>
        </main>
      </div>

      {preview && (
        <TestRunner test={preview} preview onClose={() => setPreview(null)} onComplete={() => setPreview(null)} getPercentileFor={() => 0} />
      )}
    </div>
  );
};

const OutlineButton: React.FC<{ active: boolean; onClick: () => void; hasProblem: boolean; children: React.ReactNode }> = ({
  active,
  onClick,
  hasProblem,
  children,
}) => (
  <button
    onClick={onClick}
    aria-current={active ? 'true' : undefined}
    className={`flex-1 min-w-0 w-full px-2 py-2 rounded-lg text-left text-xs flex items-center gap-2 ${
      active ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
    }`}
  >
    {children}
    {hasProblem && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-label="Needs finishing" />}
  </button>
);

const StylePicker: React.FC<{ onPick: (type: QuestionType) => void; onCancel: () => void }> = ({ onPick, onCancel }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-bold">Add a question</h2>
      <button onClick={onCancel} className="text-xs font-semibold text-slate-500 hover:text-slate-900">
        Cancel
      </button>
    </div>
    <p className="text-xs text-slate-500">Mix styles freely. Picking, typing and dragging suit any field; coding and SQL run the candidate's answer.</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {QUESTION_STYLES.map((s) => (
        <button key={s.type} onClick={() => onPick(s.type)} className="text-left p-4 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl space-y-1 transition-colors">
          <div className="text-sm font-bold text-slate-900">{s.label}</div>
          <div className="text-xs text-slate-500">{s.hint}</div>
        </button>
      ))}
    </div>
  </div>
);
