import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, Sparkles, X } from 'lucide-react';
import { AssessmentTest } from '../types';
import { ROLE_GROUPS } from '../lib/testRoles';
import { levelsOf } from '../lib/testLevels';

/**
 * Picking a job's tests, in a pop-up over the job form. Search finds tests by name, field or any word in them (skills,
 * roles, the description, the questions); the field pills narrow it to one field. Ticking adds a test to the job at once.
 */

// A test's field: the industry of its first role on the Tests page, else its category
export const fieldOf = (t: AssessmentTest) =>
  ROLE_GROUPS.find((g) => g.industry !== 'Skills games' && t.roles?.some((r) => g.roles.includes(r)))?.industry ??
  (t.roles?.includes('Any role') ? 'Skills games' : t.category);

// Everything a search can match, lower case
const haystack = (t: AssessmentTest) =>
  [
    t.title,
    t.category,
    fieldOf(t),
    t.description,
    t.difficulty,
    ...t.skillsTested,
    ...(t.roles ?? []),
    ...t.questions.flatMap((q) => [q.title, q.prompt]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

interface Group {
  label: string;
  list: AssessmentTest[];
}

export const TestPickerDialog: React.FC<{
  groups: Group[];
  allTests: AssessmentTest[];
  isPicked: (t: AssessmentTest) => boolean;
  onToggle: (t: AssessmentTest) => void;
  onClose: () => void;
  // None fits: build one for the job with AI
  onBuildWithAI?: () => void;
}> = ({ groups, allTests, isPicked, onToggle, onClose, onBuildWithAI }) => {
  const [q, setQ] = useState('');
  const [field, setField] = useState('all');
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    box.current?.focus();
    // Escape closes this pop-up only, not the job form under it
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const index = useMemo(() => new Map(groups.flatMap((g) => g.list).map((t) => [t.id, haystack(t)])), [groups]);
  const fields = useMemo(() => {
    const counts = new Map<string, number>();
    groups.flatMap((g) => g.list).forEach((t) => counts.set(fieldOf(t), (counts.get(fieldOf(t)) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [groups]);

  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (t: AssessmentTest) => (field === 'all' || fieldOf(t) === field) && terms.every((w) => index.get(t.id)?.includes(w));
  // Name matches first, then the rest
  const rank = (t: AssessmentTest) => (terms.length && terms.every((w) => t.title.toLowerCase().includes(w)) ? 0 : 1);
  const shown = groups.map((g) => ({ ...g, list: g.list.filter(matches).sort((a, b) => rank(a) - rank(b)) })).filter((g) => g.list.length);
  const pickedCount = groups.flatMap((g) => g.list).filter(isPicked).length;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add tests to the job"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden"
      >
        <div className="p-5 pb-3 space-y-3 border-b border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Add tests</h2>
              <p className="text-xs text-slate-500">Search by test name, field or any word in a test: a skill, a tool, a topic.</p>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={box}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. Excel, SQL, refunds, React"
              aria-label="Search tests"
              className="w-full h-10 pl-9 pr-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {fields.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
              {[['all', groups.reduce((n, g) => n + g.list.length, 0)] as [string, number], ...fields].map(([f, n]) => (
                <button
                  key={f}
                  onClick={() => setField(f)}
                  aria-pressed={field === f}
                  className={`shrink-0 h-7 px-3 rounded-full border text-xs font-semibold ${
                    field === f ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f === 'all' ? 'All fields' : f} <span className="opacity-70">{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 pt-3 space-y-4">
          {shown.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-slate-500">No tests match{q.trim() ? ` "${q.trim()}"` : ''}.</p>
              {onBuildWithAI && (
                <button onClick={onBuildWithAI} className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-90 inline-flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Build one for this job with AI
                </button>
              )}
            </div>
          ) : (
            shown.map((g) => (
              <div key={g.label} className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {g.label} · {g.list.length}
                </div>
                <ul className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {g.list.map((t) => {
                    const on = isPicked(t);
                    const levels = levelsOf(t, allTests).length;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => onToggle(t)}
                          aria-pressed={on}
                          className={`w-full px-3 py-2.5 flex items-start gap-3 text-left ${on ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}
                        >
                          <span className={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center ${on ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                            {on && <Check className="w-3 h-3" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900">{t.title}</span>
                            <span className="block text-[11px] text-slate-500">
                              {fieldOf(t)} · {levels > 1 ? `${levels} levels` : t.difficulty} · ~{t.estimatedMinutes} min
                              {t.skillsTested.length > 0 && ` · ${t.skillsTested.slice(0, 4).join(', ')}`}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {pickedCount} {pickedCount === 1 ? 'test' : 'tests'} on this job
          </span>
          {onBuildWithAI && (
            <button onClick={onBuildWithAI} className="ml-auto h-9 px-4 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-90 inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Build with AI
            </button>
          )}
          <button onClick={onClose} className="h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
