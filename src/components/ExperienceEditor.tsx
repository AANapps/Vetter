import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { ProfileLink, User, WorkExperience } from '../types';
import { safeUrl, sortExperience } from '../lib/experience';

export type ExperienceDetails = Pick<User, 'experience' | 'links' | 'workPreference'>;

const inputClass =
  'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const MAX_JOBS = 12;
const MAX_LINKS = 4;
const thisMonth = () => new Date().toISOString().slice(0, 7);

// A candidate's own account of their work: jobs they've had, how they want to work and links to more. Skills
// aren't typed in here; Vetter's tests verify them
export const ExperienceEditor: React.FC<{ candidate: User; onSave: (details: ExperienceDetails) => void; onClose: () => void }> = ({ candidate, onSave, onClose }) => {
  const [jobs, setJobs] = useState<WorkExperience[]>(() => sortExperience(candidate.experience ?? []));
  const [links, setLinks] = useState<ProfileLink[]>(candidate.links ?? []);
  const [work, setWork] = useState(candidate.workPreference);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setJob = (id: string, change: Partial<WorkExperience>) => setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...change } : j)));
  const addJob = () => setJobs((prev) => [{ id: `exp-${Date.now()}`, role: '', company: '', start: thisMonth() }, ...prev]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const filled = jobs.filter((j) => j.role.trim() || j.company.trim());
    const bad = filled.find((j) => !j.role.trim() || !j.company.trim() || !j.start || (j.end && j.end < j.start));
    if (bad) return setError(!bad.role.trim() || !bad.company.trim() ? 'Each job needs a role and a company.' : 'A job can’t end before it starts.');
    const cleanLinks = links.flatMap((l) => {
      if (!l.url.trim()) return [];
      const url = safeUrl(l.url);
      return url ? [{ label: l.label.trim().slice(0, 40), url }] : [];
    });
    if (cleanLinks.length < links.filter((l) => l.url.trim()).length) return setError('One of the links isn’t a web address.');
    onSave({
      experience: sortExperience(
        filled.map((j) => ({
          id: j.id,
          role: j.role.trim().slice(0, 80),
          company: j.company.trim().slice(0, 80),
          start: j.start,
          ...(j.end && { end: j.end }),
          ...(j.summary?.trim() && { summary: j.summary.trim().slice(0, 600) }),
        }))
      ),
      links: cleanLinks,
      workPreference: work,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Experience"
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] flex flex-col"
      >
        <div className="p-6 pb-4 pr-14 border-b border-slate-100">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Experience</h2>
          <p className="text-xs text-slate-500">The jobs you've done, as on a CV. Your skills come from Vetter's tests, so there's no need to list them.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-slate-700 mb-1.5">I'd like to work</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['Remote', 'Hybrid', 'On-site'] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWork(w)}
                  aria-pressed={work === w}
                  className={`px-3 py-2 rounded-lg border text-sm font-semibold ${work === w ? 'border-indigo-600 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-600' : 'border-slate-200 text-slate-700 hover:border-slate-400'}`}
                >
                  {w}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700">Jobs</h3>
              {jobs.length < MAX_JOBS && (
                <button type="button" onClick={addJob} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Add a job
                </button>
              )}
            </div>
            {jobs.length === 0 && (
              <button type="button" onClick={addJob} className="w-full p-5 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-700">
                Add your first job, internship or placement
              </button>
            )}
            {jobs.map((j) => (
              <div key={j.id} className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">Role</span>
                    <input value={j.role} onChange={(e) => setJob(j.id, { role: e.target.value })} placeholder="Data Analyst" className={inputClass} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">Company</span>
                    <input value={j.company} onChange={(e) => setJob(j.id, { company: e.target.value })} placeholder="Acme Ltd" className={inputClass} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">Started</span>
                    <input type="month" value={j.start} max={thisMonth()} onChange={(e) => setJob(j.id, { start: e.target.value })} className={inputClass} />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                      Ended
                      <span className="inline-flex items-center gap-1.5 font-normal">
                        <input
                          type="checkbox"
                          checked={!j.end}
                          onChange={(e) => setJob(j.id, { end: e.target.checked ? undefined : thisMonth() })}
                          className="accent-indigo-600"
                        />
                        I work here now
                      </span>
                    </span>
                    <input
                      type="month"
                      value={j.end ?? ''}
                      disabled={!j.end}
                      min={j.start}
                      max={thisMonth()}
                      onChange={(e) => setJob(j.id, { end: e.target.value || undefined })}
                      className={`${inputClass} disabled:bg-slate-50 disabled:text-slate-400`}
                    />
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="text-[11px] font-semibold text-slate-600">
                    What you did <span className="font-normal text-slate-400">(optional, a line or two)</span>
                  </span>
                  <textarea
                    value={j.summary ?? ''}
                    onChange={(e) => setJob(j.id, { summary: e.target.value })}
                    rows={2}
                    maxLength={600}
                    placeholder="Built the weekly sales reporting in SQL and Looker, used by 40 store managers."
                    className={`${inputClass} resize-y`}
                  />
                </label>
                <div className="text-right">
                  <button type="button" onClick={() => setJobs((prev) => prev.filter((x) => x.id !== j.id))} className="text-xs text-slate-400 hover:text-rose-600 inline-flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700">
                Links <span className="font-normal text-slate-400">(optional)</span>
              </h3>
              {links.length < MAX_LINKS && (
                <button type="button" onClick={() => setLinks((prev) => [...prev, { label: '', url: '' }])} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Add a link
                </button>
              )}
            </div>
            {links.length === 0 && <p className="text-xs text-slate-500">LinkedIn, GitHub or a portfolio, for companies who want to see more.</p>}
            {links.map((l, i) => (
              <div key={i} className="grid grid-cols-[8rem_minmax(0,1fr)_auto] gap-2">
                <input
                  value={l.label}
                  onChange={(e) => setLinks((prev) => prev.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
                  placeholder="LinkedIn"
                  aria-label="Link name"
                  className={inputClass}
                />
                <input
                  value={l.url}
                  onChange={(e) => setLinks((prev) => prev.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))}
                  placeholder="linkedin.com/in/you"
                  aria-label="Link address"
                  className={inputClass}
                />
                <button type="button" onClick={() => setLinks((prev) => prev.filter((_, k) => k !== i))} aria-label="Remove link" className="p-2 text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-rose-600">{error}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
