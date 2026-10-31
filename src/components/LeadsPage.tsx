import React from 'react';
import { Business, JobPosting } from '../types';
import { LEAD_STAGES, LeadRow } from '../lib/leads';
import { LeadChange, LeadsView } from './LeadsView';

interface LeadsPageProps {
  // The company signed in; without one, the Vetter team sees every company's leads
  business?: Business;
  jobs: JobPosting[];
  rows: LeadRow[];
  onUpdateLead: (row: LeadRow, change: LeadChange) => void;
  onOpenPerson: (personId: string) => void;
  // Opens a job's page, on its own leads
  onOpenJobLeads: (jobId: string) => void;
}

// Every lead across a company's jobs, and how each job's pipeline is filling up
export const LeadsPage: React.FC<LeadsPageProps> = ({ business, jobs, rows, onUpdateLead, onOpenPerson, onOpenJobLeads }) => {
  const byJob = jobs
    .map((job) => ({ job, rows: rows.filter((r) => r.job.id === job.id) }))
    .sort((a, b) => b.rows.length - a.rows.length);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leads</h1>
        <p className="text-sm text-slate-500">
          Everyone {business ? 'you sent tests to or who applied' : 'sent tests or who applied'}, across {business ? 'your' : 'every company’s'} jobs. Move them through
          your stages, rate them and keep notes. Candidates never see their stage.
        </p>
      </div>

      {byJob.length > 0 && (
        <section className="rounded-xl border border-slate-200 overflow-hidden">
          <h2 className="px-4 py-3 text-sm font-bold text-slate-900 border-b border-slate-100">Pipeline by job</h2>
          <ul className="divide-y divide-slate-100">
            {byJob.map(({ job, rows: jobRows }) => (
              <li key={job.id}>
                <button onClick={() => onOpenJobLeads(job.id)} className="w-full px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-left hover:bg-slate-50">
                  <span className="sm:w-64 min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{job.title}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {!business && `${job.companyName} · `}
                      {job.department} · {job.status}
                    </span>
                  </span>
                  {/* How the job's leads split across stages */}
                  <span className="flex-1 flex h-2.5 rounded-full overflow-hidden bg-slate-100" aria-hidden>
                    {LEAD_STAGES.map((s) => {
                      const n = jobRows.filter((r) => r.stage === s.id).length;
                      return n ? <span key={s.id} className={s.dot} style={{ width: `${(n / jobRows.length) * 100}%` }} /> : null;
                    })}
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 sm:w-[22rem] sm:justify-end">
                    {LEAD_STAGES.map((s) => {
                      const n = jobRows.filter((r) => r.stage === s.id).length;
                      return n ? (
                        <span key={s.id} className="inline-flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label} <span className="font-semibold tabular-nums">{n}</span>
                        </span>
                      ) : null;
                    })}
                    {jobRows.length === 0 && <span className="text-slate-400">No leads yet</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LeadsView rows={rows} jobs={jobs} onUpdateLead={onUpdateLead} onOpenPerson={onOpenPerson} onOpenJobLeads={onOpenJobLeads} />
    </div>
  );
};
