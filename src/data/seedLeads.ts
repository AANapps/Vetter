import { ArchiveReason, JobPosting, Lead, LeadStage, User } from '../types';
import { buildLeadRows, updatedLead } from '../lib/leads';

// The demo's companies have already moved some candidates along, so the leads board isn't all at the start
const PLAN: { stage: LeadStage; rating?: number; note?: string; archiveReason?: ArchiveReason; dueInDays?: number; tags?: string[] }[] = [
  { stage: 'screening', rating: 4, note: 'Strong SQL. Book a 20-minute call.', tags: ['Referral'] },
  { stage: 'interview', rating: 5, note: 'Panel interview with the hiring manager.', dueInDays: 3 },
  { stage: 'offer', rating: 5, note: 'Verbal yes, waiting on notice period.', dueInDays: 7, tags: ['Priority'] },
  { stage: 'archived', rating: 2, archiveReason: 'Below pass mark' },
  { stage: 'interview', rating: 3, dueInDays: 9, tags: ['Second round'] },
  { stage: 'hired', rating: 5, note: 'Starts on the 1st.' },
  { stage: 'screening', rating: 3 },
  { stage: 'archived', archiveReason: 'Withdrew' },
];

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

export function buildSeedLeads(jobs: JobPosting[], candidates: User[]): Lead[] {
  const now = Date.now();
  return buildLeadRows(jobs, candidates, [])
    // Most of each job's people have been moved on
    .filter((row) => hash(row.id) % 3 !== 0)
    .map((row, i) => {
      const plan = PLAN[i % PLAN.length];
      const started = new Date(now - (4 + (hash(row.id) % 20)) * 86_400_000).toISOString();
      const lead = updatedLead({ ...row, lead: undefined }, {}, started);
      const moved = new Date(now - (hash(row.id) % 4) * 86_400_000).toISOString();
      return updatedLead(
        { ...row, lead },
        {
          stage: plan.stage,
          rating: plan.rating,
          note: plan.note,
          archiveReason: plan.archiveReason,
          tags: plan.tags,
          dueDate: plan.dueInDays ? new Date(now + plan.dueInDays * 86_400_000).toISOString().split('T')[0] : undefined,
        },
        moved
      );
    });
}
