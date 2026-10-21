import React, { useState } from 'react';
import { AssessmentTest, Business, Exam, User } from '../types';
import { examProgress, STATUS_LABELS, totalMinutes } from '../lib/exams';
import { isMainVersion, levelsOf, versionTitle } from '../lib/testLevels';
import { Plus, Send, Search, CheckCircle2 } from 'lucide-react';

interface ExamsManagerProps {
  // The company managing its exams; without one, the Vetter team manages every company's
  business?: Business;
  businesses: Business[];
  exams: Exam[];
  tests: AssessmentTest[];
  candidates: User[];
  onCreateExam: (exam: Exam) => void;
  onInvite: (examId: string, candidateIds: string[]) => void;
}

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500';

const statusClass: Record<string, string> = {
  'not-started': 'text-slate-500',
  'in-progress': 'text-indigo-700',
  passed: 'text-emerald-700',
  failed: 'text-rose-700',
};

// Exams: a series of tests a company invites candidates to take
export const ExamsManager: React.FC<ExamsManagerProps> = ({ business, businesses, exams: allExams, tests, candidates, onCreateExam, onInvite }) => {
  const exams = business ? allExams.filter((e) => e.businessId === business.id) : allExams;
  const [selectedId, setSelectedId] = useState(exams[0]?.id ?? '');
  const [isCreating, setIsCreating] = useState(false);
  const selected = exams.find((e) => e.id === selectedId) ?? exams[0];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Exams</h1>
          <p className="text-xs text-slate-500 max-w-2xl">
            Bundle tests into an exam and invite candidates to take it. It appears on their to-do list with a notification, and
            their progress shows here as they go.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="self-start px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create an Exam</span>
        </button>
      </div>

      {exams.length === 0 ? (
        <p className="text-xs text-slate-500">No exams yet.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="space-y-3">
            {exams.map((exam) => (
              <button
                key={exam.id}
                onClick={() => setSelectedId(exam.id)}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  selected?.id === exam.id ? 'bg-indigo-50/70 border-indigo-400' : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
              >
                {!business && <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-700 font-semibold">{exam.companyName}</div>}
                <div className="text-sm font-bold text-slate-900">{exam.title}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {exam.testIds.length} tests &middot; {exam.invitations.length} invited
                  {exam.dueDate ? ` · due ${exam.dueDate}` : ''}
                </div>
                {exam.createdBy === 'vetter' && (
                  <span className="mt-1.5 inline-block text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">Set up by Vetter</span>
                )}
              </button>
            ))}
          </div>

          {selected && <ExamDetail key={selected.id} exam={selected} tests={tests} candidates={candidates} onInvite={onInvite} />}
        </div>
      )}

      {isCreating && (
        <ExamForm
          businesses={business ? [business] : businesses}
          createdBy={business ? 'company' : 'vetter'}
          tests={tests}
          onSave={(exam) => {
            onCreateExam(exam);
            setSelectedId(exam.id);
            setIsCreating(false);
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  );
};

const ExamDetail: React.FC<{
  exam: Exam;
  tests: AssessmentTest[];
  candidates: User[];
  onInvite: (examId: string, candidateIds: string[]) => void;
}> = ({ exam, tests, candidates, onInvite }) => {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);
  const [sent, setSent] = useState<string | null>(null);
  const invitedIds = new Set(exam.invitations.map((i) => i.candidateId));
  const invitees = candidates.filter((c) => invitedIds.has(c.id));
  const q = query.trim().toLowerCase();
  const invitable = candidates
    .filter((c) => !invitedIds.has(c.id))
    .filter((c) => !q || `${c.name} ${c.title} ${c.location}`.toLowerCase().includes(q))
    .slice(0, 8);

  const sendInvites = () => {
    onInvite(exam.id, chosen);
    setSent(`Invited ${chosen.length} ${chosen.length === 1 ? 'candidate' : 'candidates'}. They've been notified.`);
    setChosen([]);
    setTimeout(() => setSent(null), 4000);
  };

  return (
    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-slate-900">{exam.title}</h2>
        <p className="text-xs text-slate-600">{exam.description}</p>
        <p className="text-xs text-slate-500">
          Pass mark {exam.passingScore}/100 average &middot; ~{totalMinutes(exam, tests)} min in total
          {exam.dueDate ? ` · due ${exam.dueDate}` : ''}
        </p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Tests</h3>
        <ol className="text-xs text-slate-700 space-y-1 list-decimal pl-4">
          {exam.testIds.map((id) => {
            const t = tests.find((x) => x.id === id);
            return <li key={id}>{t ? versionTitle(t) : id}</li>;
          })}
        </ol>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Invited ({invitees.length})</h3>
        {invitees.length === 0 ? (
          <p className="text-xs text-slate-500">Nobody invited yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {invitees.map((c) => {
              const p = examProgress(exam, c);
              return (
                <li key={c.id} className="px-3 py-2.5 flex items-center gap-3 text-xs">
                  <img src={c.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover bg-slate-100 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                    <div className="text-slate-500 truncate">{c.title}</div>
                  </div>
                  <span className="text-slate-500 tabular-nums shrink-0">
                    {p.done}/{p.total} tests
                  </span>
                  <span className={`w-28 text-right font-semibold shrink-0 ${statusClass[p.status]}`}>
                    {p.score !== undefined ? `${p.score} · ` : ''}
                    {STATUS_LABELS[p.status]}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2 pt-4 border-t border-slate-200">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Invite candidates</h3>
        {sent && (
          <p className="text-xs text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {sent}
          </p>
        )}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates by name, title or location"
            aria-label="Search candidates"
            className={`${inputClass} pl-8`}
          />
        </div>
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {invitable.length === 0 && <li className="px-3 py-2.5 text-xs text-slate-500">No candidates match.</li>}
          {invitable.map((c) => (
            <li key={c.id}>
              <label className="px-3 py-2 flex items-center gap-3 text-xs cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={chosen.includes(c.id)}
                  onChange={(e) => setChosen((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)))}
                  className="accent-indigo-600"
                />
                <img src={c.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover bg-slate-100" />
                <span className="font-semibold text-slate-900">{c.name}</span>
                <span className="text-slate-500 truncate">
                  {c.title} &middot; {c.location}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <button
          onClick={sendInvites}
          disabled={chosen.length === 0}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg flex items-center gap-2"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send {chosen.length > 0 ? chosen.length : ''} invite{chosen.length === 1 ? '' : 's'}</span>
        </button>
      </div>
    </div>
  );
};

const ExamForm: React.FC<{
  businesses: Business[];
  createdBy: Exam['createdBy'];
  tests: AssessmentTest[];
  onSave: (exam: Exam) => void;
  onCancel: () => void;
}> = ({ businesses, createdBy, tests, onSave, onCancel }) => {
  const [businessId, setBusinessId] = useState(businesses[0]?.id ?? '');
  const business = businesses.find((b) => b.id === businessId) ?? businesses[0];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [passingScore, setPassingScore] = useState(70);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  // Picked tests in the order they were ticked: main version id → the level chosen
  const [picked, setPicked] = useState<{ mainId: string; testId: string }[]>([]);
  const [error, setError] = useState(false);
  const choices = tests.filter(
    (t) => isMainVersion(t) && (t.type === 'standard' || (t.type === 'custom' && t.businessId === business?.id))
  );

  const toggle = (main: AssessmentTest) => {
    setError(false);
    setPicked((prev) => (prev.some((p) => p.mainId === main.id) ? prev.filter((p) => p.mainId !== main.id) : [...prev, { mainId: main.id, testId: main.id }]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !title.trim()) return;
    if (picked.length === 0) {
      setError(true);
      return;
    }
    onSave({
      id: `exam-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || `${business.name} invites you to take these tests.`,
      businessId: business.id,
      companyName: business.name,
      createdBy,
      testIds: picked.map((p) => p.testId),
      passingScore,
      dueDate: dueDate || undefined,
      createdAt: new Date().toISOString().split('T')[0],
      invitations: [],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900">Create an Exam</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-700 text-xs font-medium">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {businesses.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Exam Title</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Analyst Assessment" className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pass mark (average)</label>
              <input type="number" min={0} max={100} value={passingScore} onChange={(e) => setPassingScore(Number(e.target.value))} className={`${inputClass} font-mono`} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} />
            </div>
          </div>

          <fieldset className={`p-3 border rounded-xl space-y-2 ${error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200'}`}>
            <legend className="px-1 text-xs font-bold text-slate-900">Tests ({picked.length} picked)</legend>
            {error && <p className="text-[11px] font-semibold text-rose-700">Pick at least one test.</p>}
            <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {choices.map((t) => {
                const pick = picked.find((p) => p.mainId === t.id);
                const levels = levelsOf(t, tests);
                return (
                  <li key={t.id} className="py-2 flex items-center gap-2.5">
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input type="checkbox" checked={!!pick} onChange={() => toggle(t)} className="mt-0.5 accent-indigo-600" />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-900">
                          {pick && <span className="text-indigo-700 mr-1">{picked.indexOf(pick) + 1}.</span>}
                          {t.title}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {t.type === 'custom' ? `${t.companyName}'s test` : t.category}
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
          </fieldset>

          <button type="submit" className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Create Exam</span>
          </button>
        </form>
      </div>
    </div>
  );
};
