import React from 'react';
import { Business, JobPosting } from '../types';
import { LeadRow } from '../lib/leads';
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

// Shown in the Candidates tab: every lead across a company's jobs
export const LeadsPage: React.FC<LeadsPageProps> = ({ business, jobs, rows, onUpdateLead, onOpenPerson, onOpenJobLeads }) => {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-slate-900">Leads</h2>
        <p className="text-sm text-slate-500">
          Everyone {business ? 'you sent tests to or who applied' : 'sent tests or who applied'}, across {business ? 'your' : 'every company’s'} jobs. Move them through
          your stages, rate them and keep notes. Candidates never see their stage.
        </p>
      </div>

      <LeadsView rows={rows} jobs={jobs} onUpdateLead={onUpdateLead} onOpenPerson={onOpenPerson} onOpenJobLeads={onOpenJobLeads} />
    </div>
  );
};
