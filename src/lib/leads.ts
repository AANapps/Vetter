import { ArchiveReason, CareerStage, JobPosting, Lead, LeadStage, User } from '../types';
import { JobTestProgress, jobTestProgress } from './jobTests';
import { calculateCandidateJobMatch } from './matchingAlgorithm';
import { CandidateLevel, cityOf, levelOf, stageOf } from './audience';

/**
 * A company's leads: everyone it sent a job's tests to or who applied, and where each is in its hiring.
 * The stage and notes are stored per job and candidate (Lead); the rest is worked out from the job and the
 * candidate's results, so scores and fit are always current.
 */

export const LEAD_STAGES: { id: LeadStage; label: string; dot: string; chip: string }[] = [
  { id: 'invited', label: 'Invited', dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-700' },
  { id: 'applied', label: 'Applied', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-800' },
  { id: 'screening', label: 'Screening', dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-800' },
  { id: 'interview', label: 'Interview', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-800' },
  { id: 'offer', label: 'Offer', dot: 'bg-indigo-600', chip: 'bg-indigo-50 text-indigo-800' },
  { id: 'hired', label: 'Hired', dot: 'bg-emerald-600', chip: 'bg-emerald-50 text-emerald-800' },
  { id: 'archived', label: 'Archived', dot: 'bg-rose-400', chip: 'bg-rose-50 text-rose-800' },
];
export const stageInfo = (stage: LeadStage) => LEAD_STAGES.find((s) => s.id === stage)!;

export const ARCHIVE_REASONS: ArchiveReason[] = ['Not a fit', 'Below pass mark', 'Withdrew', 'No response', 'Hired elsewhere', 'Role filled', 'Other'];

export type LeadSource = 'applied' | 'link' | 'email' | 'invite';
export const SOURCE_LABELS: Record<LeadSource, string> = {
  applied: 'Applied',
  link: 'Job link',
  email: 'Emailed',
  invite: 'Sent on Vetter',
};

export type LeadTestStatus = JobTestProgress['status'] | 'no-tests';
export const TEST_STATUS_LABELS: Record<LeadTestStatus, string> = {
  passed: 'Passed tests',
  failed: 'Below pass mark',
  'in-progress': 'Tests in progress',
  'not-started': 'Not started',
  'no-tests': 'Job has no tests',
};

export interface LeadRow {
  id: string;
  job: JobPosting;
  candidate: User;
  lead?: Lead;
  stage: LeadStage;
  source: LeadSource;
  applied: boolean;
  addedAt: string;
  lastActivity: string;
  progress: JobTestProgress;
  testStatus: LeadTestStatus;
  fit: number;
  tier: string;
}

export const leadId = (jobId: string, candidateId: string) => `${jobId}__${candidateId}`;

export function buildLeadRows(jobs: JobPosting[], candidates: User[], leads: Lead[]): LeadRow[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const stored = new Map(leads.map((l) => [l.id, l]));
  return jobs.flatMap((job) => {
    const ids = new Set([
      ...job.invitations.map((i) => i.candidateId),
      ...candidates.filter((c) => c.appliedJobIds?.includes(job.id)).map((c) => c.id),
      ...leads.filter((l) => l.jobId === job.id).map((l) => l.candidateId),
    ]);
    return [...ids].flatMap((candidateId) => {
      const candidate = byId.get(candidateId);
      if (!candidate) return [];
      const id = leadId(job.id, candidateId);
      const lead = stored.get(id);
      const invitation = job.invitations.find((i) => i.candidateId === candidateId);
      const applied = !!candidate.appliedJobIds?.includes(job.id);
      const progress = jobTestProgress(job, candidate);
      const match = calculateCandidateJobMatch(candidate, job);
      const addedAt = lead?.history[0]?.at ?? invitation?.invitedAt ?? job.postedDate;
      const lastActivity = [lead?.updatedAt, progress.lastActivity, invitation?.startedAt, invitation?.openedAt, addedAt]
        .filter((d): d is string => !!d)
        .sort()
        .at(-1)!;
      return [
        {
          id,
          job,
          candidate,
          lead,
          stage: lead?.stage ?? (applied ? 'applied' : 'invited'),
          source: applied ? 'applied' : invitation?.via ?? 'invite',
          applied,
          addedAt,
          lastActivity,
          progress,
          testStatus: job.testIds.length ? progress.status : 'no-tests',
          fit: match.overallFitPercentage,
          tier: match.matchTier,
        },
      ];
    });
  });
}

export interface LeadFilters {
  query: string;
  jobIds: string[];
  departments: string[];
  stages: LeadStage[];
  sources: LeadSource[];
  testStatuses: LeadTestStatus[];
  tiers: string[];
  minFit: number;
  minScore: number;
  minRating: number;
  workPrefs: User['workPreference'][];
  careerStages: CareerStage[];
  levels: CandidateLevel[];
  city: string;
  minYears: number;
  addedWithin: number; // days; 0 for any time
  idleFor: number; // days without activity; 0 for any
  archiveReasons: ArchiveReason[];
  tag: string;
  hasNote: boolean;
  hasDueDate: boolean;
  showArchived: boolean;
}

export const emptyLeadFilters = (): LeadFilters => ({
  query: '',
  jobIds: [],
  departments: [],
  stages: [],
  sources: [],
  testStatuses: [],
  tiers: [],
  minFit: 0,
  minScore: 0,
  minRating: 0,
  workPrefs: [],
  careerStages: [],
  levels: [],
  city: '',
  minYears: 0,
  addedWithin: 0,
  idleFor: 0,
  archiveReasons: [],
  tag: '',
  hasNote: false,
  hasDueDate: false,
  showArchived: false,
});

// How many filters are set, for the "Filters (3)" button; the search box and archived switch aren't counted
export function activeFilterCount(f: LeadFilters) {
  const e = emptyLeadFilters();
  return (Object.keys(f) as (keyof LeadFilters)[]).filter(
    (k) => k !== 'query' && k !== 'showArchived' && JSON.stringify(f[k]) !== JSON.stringify(e[k])
  ).length;
}

const daysAgo = (iso: string, now: number) => (now - new Date(iso).getTime()) / 86_400_000;

export function matchesLeadFilters(row: LeadRow, f: LeadFilters, now = Date.now()): boolean {
  const c = row.candidate;
  const q = f.query.trim().toLowerCase();
  if (q && ![c.name, c.title, c.location, row.job.title, row.lead?.note ?? '', ...(row.lead?.tags ?? [])].some((s) => s.toLowerCase().includes(q))) return false;
  // Archived leads are hidden unless asked for, or the Archived stage is picked
  if (row.stage === 'archived' && !f.showArchived && !f.stages.includes('archived')) return false;
  if (f.jobIds.length && !f.jobIds.includes(row.job.id)) return false;
  if (f.departments.length && !f.departments.includes(row.job.department)) return false;
  if (f.stages.length && !f.stages.includes(row.stage)) return false;
  if (f.sources.length && !f.sources.includes(row.source)) return false;
  if (f.testStatuses.length && !f.testStatuses.includes(row.testStatus)) return false;
  if (f.tiers.length && !f.tiers.includes(row.tier)) return false;
  if (row.fit < f.minFit) return false;
  if (f.minScore && (row.progress.score ?? -1) < f.minScore) return false;
  if (f.minRating && (row.lead?.rating ?? 0) < f.minRating) return false;
  if (f.workPrefs.length && !f.workPrefs.includes(c.workPreference)) return false;
  if (f.careerStages.length && !f.careerStages.includes(stageOf(c))) return false;
  if (f.levels.length && !f.levels.includes(levelOf(c))) return false;
  if (f.city.trim() && !cityOf(c).toLowerCase().includes(f.city.trim().toLowerCase())) return false;
  if (c.yearsExperience < f.minYears) return false;
  if (f.addedWithin && daysAgo(row.addedAt, now) > f.addedWithin) return false;
  if (f.idleFor && daysAgo(row.lastActivity, now) < f.idleFor) return false;
  if (f.archiveReasons.length && (!row.lead?.archiveReason || !f.archiveReasons.includes(row.lead.archiveReason))) return false;
  if (f.tag.trim() && !row.lead?.tags?.some((t) => t.toLowerCase() === f.tag.trim().toLowerCase())) return false;
  if (f.hasNote && !row.lead?.note?.trim()) return false;
  if (f.hasDueDate && !row.lead?.dueDate) return false;
  return true;
}

export type LeadSort = 'activity' | 'added' | 'fit' | 'score' | 'rating' | 'name' | 'stage' | 'due';
export const SORT_LABELS: Record<LeadSort, string> = {
  activity: 'Latest activity',
  added: 'Newest added',
  fit: 'Best fit',
  score: 'Highest test score',
  rating: 'Highest rated',
  name: 'Name A–Z',
  stage: 'Furthest along',
  due: 'Next date first',
};

export function sortLeads(rows: LeadRow[], sort: LeadSort): LeadRow[] {
  const order = (s: LeadStage) => LEAD_STAGES.findIndex((x) => x.id === s);
  const by: Record<LeadSort, (a: LeadRow, b: LeadRow) => number> = {
    activity: (a, b) => b.lastActivity.localeCompare(a.lastActivity),
    added: (a, b) => b.addedAt.localeCompare(a.addedAt),
    fit: (a, b) => b.fit - a.fit,
    score: (a, b) => (b.progress.score ?? -1) - (a.progress.score ?? -1),
    rating: (a, b) => (b.lead?.rating ?? 0) - (a.lead?.rating ?? 0),
    name: (a, b) => a.candidate.name.localeCompare(b.candidate.name),
    stage: (a, b) => order(b.stage) - order(a.stage),
    due: (a, b) => (a.lead?.dueDate ?? '9999').localeCompare(b.lead?.dueDate ?? '9999'),
  };
  return [...rows].sort((a, b) => by[sort](a, b) || b.lastActivity.localeCompare(a.lastActivity));
}

// Moves a lead to a stage (creating it if the candidate only had their starting stage), or changes its details
export function updatedLead(
  row: Pick<LeadRow, 'id' | 'job' | 'candidate' | 'stage' | 'lead'>,
  change: Partial<Pick<Lead, 'stage' | 'rating' | 'note' | 'archiveReason' | 'dueDate' | 'tags'>>,
  now = new Date().toISOString()
): Lead {
  const base: Lead = row.lead ?? {
    id: row.id,
    jobId: row.job.id,
    candidateId: row.candidate.id,
    businessId: row.job.businessId ?? '',
    stage: row.stage,
    updatedAt: now,
    history: [{ stage: row.stage, at: now }],
  };
  const stage = change.stage ?? base.stage;
  const moved = stage !== base.stage;
  return {
    ...base,
    ...change,
    stage,
    // A reason only means something while archived
    archiveReason: stage === 'archived' ? change.archiveReason ?? base.archiveReason : undefined,
    updatedAt: now,
    history: moved ? [...base.history, { stage, at: now }] : base.history,
  };
}

export function leadsCsv(rows: LeadRow[]) {
  const header = ['Name', 'Email', 'Job', 'Stage', 'Source', 'Test status', 'Test score', 'Fit %', 'Rating', 'Tags', 'Date', 'Added', 'Last activity', 'Archive reason', 'Note'];
  const lines = rows.map((r) => [
    r.candidate.name,
    r.candidate.email,
    r.job.title,
    stageInfo(r.stage).label,
    SOURCE_LABELS[r.source],
    TEST_STATUS_LABELS[r.testStatus],
    r.progress.score ?? '',
    r.fit,
    r.lead?.rating ?? '',
    (r.lead?.tags ?? []).join('; '),
    r.lead?.dueDate ?? '',
    r.addedAt.split('T')[0],
    r.lastActivity.split('T')[0],
    r.lead?.archiveReason ?? '',
    r.lead?.note ?? '',
  ]);
  return [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
}
