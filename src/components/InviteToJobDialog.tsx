import React, { useEffect } from 'react';
import { Check, Lock, Plus, Send, X } from 'lucide-react';
import { AssessmentTest, JobPosting, User } from '../types';
import { Pic } from './Pic';

/**
 * Inviting someone to one of the company's jobs, from their profile or the candidates list. Each open job with tests is
 * listed with what it asks of them; without a fitting job, the company can make an invite-only one for them.
 */
export const InviteToJobDialog: React.FC<{
  person: User;
  jobs: JobPosting[];
  tests: AssessmentTest[];
  onInvite: (job: JobPosting) => void;
  onNewJob: () => void;
  onClose: () => void;
}> = ({ person, jobs, tests, onInvite, onNewJob, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const open = jobs.filter((j) => j.status === 'active' && j.testIds.length > 0);
  const invited = (j: JobPosting) => j.invitations.some((i) => i.candidateId === person.id);
  const applied = (j: JobPosting) => person.appliedJobIds.includes(j.id);
  const minutes = (j: JobPosting) => j.testIds.reduce((n, id) => n + (tests.find((t) => t.id === id)?.estimatedMinutes ?? 0), 0);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Invite ${person.name} to a job`}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="p-5 pb-4 flex items-start gap-3 border-b border-slate-200">
          <Pic src={person.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-100 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Invite {person.name} to a job</h2>
            <p className="text-xs text-slate-500">They'll get the job with its tests on their home and in their notifications.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {open.length === 0 ? (
            <p className="text-sm text-slate-500">You have no open jobs with tests yet.</p>
          ) : (
            <ul className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              {open.map((j) => {
                const done = invited(j) || applied(j);
                return (
                  <li key={j.id} className="px-3 py-2.5 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900 truncate">{j.title}</span>
                        {j.visibility === 'invite' && <Lock className="w-3 h-3 text-violet-600 shrink-0" aria-label="Invite only" />}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {j.testIds.length} {j.testIds.length === 1 ? 'test' : 'tests'} · ~{minutes(j)} min · {j.location} · {j.salaryRange}
                      </div>
                    </div>
                    <button
                      onClick={() => !done && onInvite(j)}
                      disabled={done}
                      className={`shrink-0 h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${
                        done ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {done ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      {applied(j) ? 'Applied' : invited(j) ? 'Invited' : 'Invite'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={onNewJob}
            className="w-full h-10 rounded-lg border border-dashed border-indigo-300 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Make an invite-only job for {person.name.split(' ')[0]}
          </button>
          <p className="mt-1.5 text-[11px] text-slate-500 text-center">Not on the job board: only the people you invite see it.</p>
        </div>
      </div>
    </div>
  );
};
