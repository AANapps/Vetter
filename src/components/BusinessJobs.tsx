import React, { useEffect, useState } from 'react';
import { AssessmentTest, Business, JobPosting, User } from '../types';
import {
  TRACKING_LABELS,
  TrackingRow,
  TrackingStatus,
  VIA_LABELS,
  jobFunnel,
  jobLink,
  jobTestsOf,
  jobTracking,
  totalMinutes,
} from '../lib/jobTests';
import { versionTitle } from '../lib/testLevels';
import {
  AudienceFilters,
  CANDIDATE_LEVELS,
  CAREER_STAGES,
  SUBJECTS,
  audienceIsEmpty,
  cityOf,
  emptyAudience,
  headline,
  inviteEmail,
  levelOf,
  matchesAudience,
} from '../lib/audience';
import { formatDuration } from './TestLeaderboard';
import { JobForm } from './JobForm';
import { JobCandidates } from './JobCandidates';
import { LeadChange, LeadsView } from './LeadsView';
import { LeadRow } from '../lib/leads';
import { ArrowLeft, Check, CheckCircle2, ChevronDown, Copy, Download, Link2, Mail, MapPin, Pencil, Plus, Search, Send, Share2, Sparkles, UserPlus, X } from 'lucide-react';

interface BusinessJobsProps {
  // The company signed in; without one, the Vetter team sees every company's jobs
  business?: Business;
  businesses: Business[];
  jobs: JobPosting[];
  tests: AssessmentTest[];
  candidates: User[];
  // The job open, or null for the list
  selectedJobId: string | null;
  onSelect: (jobId: string | null) => void;
  onCreateJob: (job: JobPosting) => void;
  onEditTests: (jobId: string) => void;
  // Vetter's AI suggests library tests for the job and writes a new one
  onSuggestTests: (jobId: string) => void;
  onUpdateJobRequirements: (jobId: string, requirements: JobPosting['requirements']) => void;
  onEmail: (jobId: string, emails: string[]) => void;
  onInvite: (jobId: string, candidateIds: string[]) => void;
  onOpenPerson: (personId: string) => void;
  onOpenTest: (testId: string) => void;
  // Every lead for the jobs shown; a job's page shows its own pipeline
  leadRows: LeadRow[];
  onUpdateLead: (row: LeadRow, change: LeadChange) => void;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STATUS_STYLES: Record<TrackingStatus, string> = {
  sent: 'bg-slate-100 text-slate-600',
  opened: 'bg-sky-50 text-sky-800',
  'in-progress': 'bg-amber-50 text-amber-800',
  passed: 'bg-emerald-50 text-emerald-800',
  failed: 'bg-rose-50 text-rose-800',
};

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const CopyLinkButton: React.FC<{ job: JobPosting; label?: string; className?: string }> = ({ job, label = 'Copy link', className = '' }) => {
  const [copied, setCopied] = useState(false);
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(jobLink(job));
    } catch {
      // Clipboard blocked: the link is also shown in a selectable box on the job
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className={`flex items-center gap-1.5 font-semibold transition-colors ${className}`}>
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
};

// A company's jobs: each has its tests, the link to them, and how everyone sent them is getting on
export const BusinessJobs: React.FC<BusinessJobsProps> = (props) => {
  const { business, jobs: allJobs, selectedJobId } = props;
  const jobs = business ? allJobs.filter((j) => j.businessId === business.id) : allJobs;
  const selected = selectedJobId ? jobs.find((j) => j.id === selectedJobId) : undefined;
  return selected ? <JobDetail {...props} job={selected} /> : <JobList {...props} jobs={jobs} />;
};

const JobList: React.FC<BusinessJobsProps> = ({
  business,
  businesses,
  jobs,
  tests,
  candidates,
  onSelect,
  onCreateJob,
  onEmail,
  onInvite,
  onOpenPerson,
}) => {
  // A company with no jobs yet starts on posting its first
  const [isCreating, setIsCreating] = useState(() => !!business && jobs.length === 0);
  const [sharing, setSharing] = useState<JobPosting | null>(null);
  const tracked = jobs.map((job) => {
    const rows = jobTracking(job, candidates);
    return { job, rows, funnel: jobFunnel(job, rows, candidates) };
  });
  const totals = tracked.reduce(
    (acc, t) => ({
      reached: acc.reached + t.funnel.reached,
      completed: acc.completed + t.funnel.completed,
      passed: acc.passed + t.funnel.passed,
    }),
    { reached: 0, completed: 0, passed: 0 }
  );
  // The latest finished tests across every job
  const activity = tracked
    .flatMap(({ job, rows }) =>
      rows.flatMap((row) =>
        job.testIds.flatMap((testId) =>
          row.candidate.testResults
            .filter((r) => r.testId === testId)
            .map((r) => ({ job, row, testId, result: r }))
        )
      )
    )
    .sort((a, b) => (b.result.completedTime ?? b.result.completedAt).localeCompare(a.result.completedTime ?? a.result.completedAt))
    .slice(0, 8);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{business ? 'Your jobs' : 'All jobs'}</h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Each job has its tests. Send them to candidates, and every score lands on the job as it comes in.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="self-start px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Post a job
        </button>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center space-y-4">
          <p className="text-sm text-slate-600">Post a job, pick its tests, then send them to candidates or share the link.</p>
          <button
            onClick={() => setIsCreating(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Post your first job
          </button>
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
            {[
              { label: 'Open jobs', value: jobs.filter((j) => j.status === 'active').length },
              { label: 'Candidates sent tests', value: totals.reached },
              { label: 'Finished', value: totals.completed },
              { label: 'Passed', value: totals.passed },
            ].map((s) => (
              <div key={s.label} className="bg-white px-5 py-4">
                <dt className="text-xs text-slate-500">{s.label}</dt>
                <dd className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
            <ul className="space-y-3">
              {tracked.map(({ job, funnel }) => (
                <li key={job.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(job.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onSelect(job.id)}
                    className="group bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-5 space-y-4 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        {!business && <div className="text-[11px] font-semibold text-indigo-700">{job.companyName}</div>}
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-900 group-hover:text-indigo-700">{job.title}</span>
                          {job.status !== 'active' && (
                            <span className="text-[10px] font-semibold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{job.status}</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {job.location} &middot; {job.workType} &middot;{' '}
                          {job.testIds.length === 0
                            ? 'no tests yet'
                            : `${job.testIds.length} ${job.testIds.length === 1 ? 'test' : 'tests'} · ~${totalMinutes(job, tests)} min · pass ${job.testPassingScore}`}
                        </div>
                      </div>
                      {job.testIds.length > 0 && (
                        <ShareButton
                          onClick={() => setSharing(job)}
                          className="shrink-0 px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg"
                        />
                      )}
                    </div>
                    <FunnelBar funnel={funnel} compact />
                  </div>
                </li>
              ))}
            </ul>

            <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Latest results</h2>
              {activity.length === 0 ? (
                <p className="text-xs text-slate-500">Nothing handed in yet.</p>
              ) : (
                <ul className="space-y-3">
                  {activity.map(({ job, row, testId, result }) => {
                    const test = tests.find((t) => t.id === testId);
                    const pass = result.score >= job.testPassingScore;
                    return (
                      <li key={`${job.id}-${row.candidate.id}-${testId}-${result.completedTime ?? result.completedAt}`} className="flex items-start gap-2.5 text-xs">
                        <img src={row.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover bg-slate-100 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <button onClick={() => onOpenPerson(row.candidate.id)} className="font-semibold text-slate-900 hover:text-indigo-700">
                            {row.candidate.name}
                          </button>
                          <div className="text-slate-500 truncate">
                            {test ? test.title : testId} &middot; {job.title}
                          </div>
                        </div>
                        <span className={`font-mono font-bold tabular-nums ${pass ? 'text-emerald-700' : 'text-rose-700'}`}>{result.score}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {sharing && (
        <ShareDialog job={sharing} candidates={candidates} onEmail={onEmail} onInvite={onInvite} onClose={() => setSharing(null)} />
      )}

      {isCreating && (
        <JobForm
          businesses={business ? [business] : businesses}
          postedBy={business ? 'company' : 'vetter'}
          tests={tests}
          onSave={(job) => {
            onCreateJob(job);
            setIsCreating(false);
            onSelect(job.id);
          }}
          onCancel={() => setIsCreating(false)}
        />
      )}
    </div>
  );
};

const FunnelBar: React.FC<{ funnel: ReturnType<typeof jobFunnel>; compact?: boolean }> = ({ funnel, compact }) => {
  const stages = [
    { label: 'Sent', value: funnel.reached },
    { label: 'Opened', value: funnel.opened },
    { label: 'Started', value: funnel.started },
    { label: 'Finished', value: funnel.completed },
    { label: 'Passed', value: funnel.passed },
  ];
  const max = Math.max(1, funnel.reached);
  return (
    <div className={`grid grid-cols-5 ${compact ? 'gap-2' : 'gap-3'}`}>
      {stages.map((s, i) => (
        <div key={s.label} className="min-w-0">
          <div className={`${compact ? 'h-1.5' : 'h-2'} bg-slate-100 rounded-full overflow-hidden`}>
            <div
              className={`h-full rounded-full ${i === stages.length - 1 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
              style={{ width: `${(s.value / max) * 100}%` }}
            />
          </div>
          <div className={`mt-1.5 flex items-baseline gap-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
            <span className={`font-bold text-slate-900 tabular-nums ${compact ? '' : 'text-lg'}`}>{s.value}</span>
            <span className="text-slate-500 truncate">{s.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const FILTERS: { id: TrackingStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'sent', label: 'Not opened' },
  { id: 'opened', label: 'Opened' },
  { id: 'in-progress', label: 'In progress' },
  { id: 'passed', label: 'Passed' },
  { id: 'failed', label: 'Below pass mark' },
];

// Finished first, best score first; then by how far they've got
const rank = (a: TrackingRow, b: TrackingRow) => {
  if ((a.progress.score === undefined) !== (b.progress.score === undefined)) return a.progress.score === undefined ? 1 : -1;
  if (a.progress.score !== undefined && b.progress.score !== undefined) return b.progress.score - a.progress.score;
  return b.progress.done - a.progress.done;
};

const JobDetail: React.FC<BusinessJobsProps & { job: JobPosting }> = ({
  job,
  business,
  tests,
  candidates,
  onSelect,
  onEditTests,
  onSuggestTests,
  onUpdateJobRequirements,
  onEmail,
  onInvite,
  onOpenPerson,
  onOpenTest,
  leadRows,
  onUpdateLead,
}) => {
  const [filter, setFilter] = useState<TrackingStatus | 'all'>('all');
  const [sharing, setSharing] = useState(false);
  const rows = jobTracking(job, candidates).sort(rank);
  const funnel = jobFunnel(job, rows, candidates);
  const jobTests = jobTestsOf(job, tests);
  const shown = filter === 'all' ? rows : rows.filter((r) => r.status === filter);
  const accountEmails = new Set(candidates.map((c) => c.email.toLowerCase()));
  const pendingEmails = (job.invitedEmails ?? []).filter((e) => !accountEmails.has(e));

  const downloadCsv = () => {
    const header = ['Name', 'Email', 'Got it by', 'Status', ...jobTests.map((t) => versionTitle(t)), 'Overall', 'Minutes', 'Last activity'];
    const lines = rows.map((r) => [
      r.candidate.name,
      r.candidate.email,
      VIA_LABELS[r.invitation.via ?? 'invite'],
      TRACKING_LABELS[r.status],
      ...jobTests.map((t) => r.progress.scores[t.id] ?? ''),
      r.progress.score ?? '',
      r.progress.seconds ? Math.round(r.progress.seconds / 60) : '',
      r.progress.lastActivity?.split('T')[0] ?? '',
    ]);
    const csv = [header, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${job.title.replace(/[^\w]+/g, '-').toLowerCase()}-results.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <button onClick={() => onSelect(null)} className="text-xs font-semibold text-slate-500 hover:text-indigo-700 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        All jobs
      </button>

      <div className="space-y-2">
        {!business && <div className="text-xs font-semibold text-indigo-700">{job.companyName}</div>}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{job.title}</h1>
          {jobTests.length > 0 && (
            <ShareButton
              onClick={() => setSharing(true)}
              label="Share tests"
              className="shrink-0 px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            />
          )}
        </div>
        <p className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {job.location}
          </span>
          <span>&middot; {job.workType}</span>
          <span>&middot; {job.salaryRange}</span>
          {job.closingDate && <span>&middot; closes {formatDay(job.closingDate)}</span>}
          <span>&middot; {job.applicantCount} applicants</span>
        </p>
        <p className="text-sm text-slate-600 max-w-2xl">{job.description}</p>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">Tests for this job</h2>
          <div className="flex items-center gap-4">
            <button onClick={() => onSuggestTests(job.id)} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Suggest tests with AI
            </button>
            <button onClick={() => onEditTests(job.id)} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1.5">
              {jobTests.length === 0 ? <Plus className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              {jobTests.length === 0 ? 'Add tests' : 'Change tests'}
            </button>
          </div>
        </div>
        {jobTests.length === 0 ? (
          <p className="text-xs text-slate-500">
            Add the tests candidates should take for this job, then send them out. Or let Vetter suggest tests from the job description and write a new one.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {jobTests.map((t, i) => (
              <button
                key={t.id}
                onClick={() => onOpenTest(t.id)}
                className="text-xs px-2.5 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-full text-slate-700"
              >
                {i + 1}. {versionTitle(t)}
              </button>
            ))}
            <span className="text-xs text-slate-500">
              &middot; ~{totalMinutes(job, tests)} min &middot; pass mark {job.testPassingScore}
              {jobTests.length > 1 ? ' average' : ''} &middot; {job.testsRequired ? 'required to apply' : 'optional'}
            </span>
          </div>
        )}
      </section>

      {sharing && <ShareDialog job={job} candidates={candidates} onEmail={onEmail} onInvite={onInvite} onClose={() => setSharing(false)} />}

      <section className="bg-white border border-slate-200 rounded-xl p-5">
        <FunnelBar funnel={funnel} />
      </section>

      <section id="job-leads" className="scroll-mt-20 space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">Hiring pipeline</h2>
          <p className="text-xs text-slate-500">Where everyone for this job is: drag them between stages, or open one to rate it, add a date and notes.</p>
        </div>
        <LeadsView
          key={job.id}
          rows={leadRows.filter((r) => r.job.id === job.id)}
          jobs={[job]}
          fixedJob={job}
          onUpdateLead={onUpdateLead}
          onOpenPerson={onOpenPerson}
        />
      </section>

      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-base font-bold text-slate-900">Candidates</h2>
          <div className="flex flex-wrap gap-1.5 sm:ml-4">
            {FILTERS.map((f) => {
              const count = f.id === 'all' ? rows.length : rows.filter((r) => r.status === f.id).length;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                    filter === f.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {f.label} <span className="tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
          {rows.length > 0 && (
            <button onClick={downloadCsv} className="sm:ml-auto text-xs font-semibold text-slate-600 hover:text-indigo-700 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Download CSV
            </button>
          )}
        </div>

        {shown.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500 text-center">
            {rows.length === 0 ? "Nobody has been sent this job's tests yet. Use Share tests to send them." : 'Nobody here.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-100">
                  <th className="px-5 py-2.5 font-medium">#</th>
                  <th className="px-2 py-2.5 font-medium">Candidate</th>
                  <th className="px-2 py-2.5 font-medium">Status</th>
                  {jobTests.map((t, i) => (
                    <th key={t.id} className="px-2 py-2.5 font-medium text-right whitespace-nowrap" title={versionTitle(t)}>
                      Test {i + 1}
                    </th>
                  ))}
                  {jobTests.length > 1 && <th className="px-2 py-2.5 font-medium text-right">Overall</th>}
                  <th className="px-2 py-2.5 font-medium text-right">Time</th>
                  <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((r) => {
                  const place = r.progress.score !== undefined ? rows.indexOf(r) + 1 : undefined;
                  return (
                    <tr key={r.candidate.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-slate-400 tabular-nums">{place ?? '–'}</td>
                      <td className="px-2 py-3">
                        <button onClick={() => onOpenPerson(r.candidate.id)} className="flex items-center gap-2.5 text-left group">
                          <img src={r.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover bg-slate-100 shrink-0" />
                          <span className="min-w-0">
                            <span className="block font-semibold text-slate-900 group-hover:text-indigo-700 whitespace-nowrap">{r.candidate.name}</span>
                            <span className="block text-slate-500 whitespace-nowrap">
                              <span title={r.invitation.emailedTo ? `Emailed to ${r.invitation.emailedTo}` : undefined}>
                                {VIA_LABELS[r.invitation.via ?? 'invite']}
                              </span>{' '}
                              &middot; {formatDay(r.invitation.invitedAt)}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${STATUS_STYLES[r.status]}`}>{TRACKING_LABELS[r.status]}</span>
                      </td>
                      {jobTests.map((t) => {
                        const s = r.progress.scores[t.id];
                        return (
                          <td key={t.id} className="px-2 py-3 text-right font-mono tabular-nums">
                            {s === undefined ? (
                              <span className="text-slate-300">–</span>
                            ) : (
                              <span className={s >= job.testPassingScore ? 'text-slate-900' : 'text-rose-700'}>{s}</span>
                            )}
                          </td>
                        );
                      })}
                      {jobTests.length > 1 && (
                        <td className="px-2 py-3 text-right font-mono font-bold tabular-nums">
                          {r.progress.score === undefined ? (
                            <span className="text-slate-300 font-normal">–</span>
                          ) : (
                            <span className={r.progress.score >= job.testPassingScore ? 'text-emerald-700' : 'text-rose-700'}>{r.progress.score}</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-3 text-right font-mono text-slate-600 tabular-nums whitespace-nowrap">
                        {r.progress.seconds ? formatDuration(r.progress.seconds) : '–'}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-500 whitespace-nowrap">
                        {r.progress.lastActivity
                          ? formatDay(r.progress.lastActivity)
                          : r.invitation.openedAt
                          ? `Opened ${formatDay(r.invitation.openedAt)}`
                          : '–'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pendingEmails.length > 0 && (filter === 'all' || filter === 'sent') && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Emailed, no Vetter account yet ({pendingEmails.length}):</span> {pendingEmails.join(', ')}
          </div>
        )}
      </section>

      <SkillRanking job={job} candidates={candidates} onUpdateJobRequirements={onUpdateJobRequirements} />
    </div>
  );
};

// Tucked away under the results: the skill scores the job asks for, and Vetter's candidates ranked against them
const SkillRanking: React.FC<{
  job: JobPosting;
  candidates: User[];
  onUpdateJobRequirements: BusinessJobsProps['onUpdateJobRequirements'];
}> = ({ job, candidates, onUpdateJobRequirements }) => {
  const [open, setOpen] = useState(false);
  const setMin = (index: number, minScore: number) =>
    onUpdateJobRequirements(
      job.id,
      job.requirements.map((r, i) => (i === index ? { ...r, minScore } : r))
    );
  return (
    <section className="bg-white border border-slate-200 rounded-xl">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full px-5 py-4 flex items-center justify-between text-left">
        <span>
          <span className="block text-sm font-bold text-slate-900">Skill scores and best matches</span>
          <span className="block text-xs text-slate-500">The minimum scores this job asks for, and who on Vetter fits them best</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-5 border-t border-slate-100 pt-4">
          <div className="space-y-3">
            {job.requirements.map((req, i) => (
              <div key={req.skillName} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
                <span className="sm:w-48 font-semibold text-slate-900">
                  {req.skillName} <span className="font-normal text-slate-500">({req.importance})</span>
                </span>
                <input
                  type="range"
                  min={50}
                  max={98}
                  value={req.minScore}
                  onChange={(e) => setMin(i, Number(e.target.value))}
                  aria-label={`${req.skillName}: minimum score`}
                  className="flex-1 accent-indigo-600"
                />
                <span className="font-mono tabular-nums text-slate-900 w-14 text-right">min {req.minScore}</span>
              </div>
            ))}
          </div>
          <JobCandidates key={job.id} job={job} allCandidates={candidates} />
        </div>
      )}
    </section>
  );
};

const ShareButton: React.FC<{ onClick: () => void; label?: string; className?: string }> = ({ onClick, label = 'Share', className = '' }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`flex items-center gap-1.5 font-semibold transition-colors ${className}`}
  >
    <Share2 className="w-3.5 h-3.5" />
    <span>{label}</span>
  </button>
);

// Sharing a job's tests opens in a popup: the link, and sending it to people
const ShareDialog: React.FC<{
  job: JobPosting;
  candidates: User[];
  onEmail: BusinessJobsProps['onEmail'];
  onInvite: BusinessJobsProps['onInvite'];
  onClose: () => void;
}> = ({ job, candidates, onEmail, onInvite, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Share tests for ${job.title}`}
        onClick={(e) => e.stopPropagation()}
        className="bg-white sm:rounded-2xl rounded-t-2xl max-w-2xl w-full max-h-[calc(100vh-2rem)] flex flex-col shadow-2xl"
      >
        <div className="px-6 pt-5 pb-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Share tests</h2>
            <p className="text-xs text-slate-500 truncate">{job.title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
          <SharePanel job={job} candidates={candidates} onEmail={onEmail} onInvite={onInvite} />
        </div>
      </div>
    </div>
  );
};

// Sending the link: copy it, email it, or pick people already on Vetter
const SharePanel: React.FC<{
  job: JobPosting;
  candidates: User[];
  onEmail: BusinessJobsProps['onEmail'];
  onInvite: BusinessJobsProps['onInvite'];
}> = ({ job, candidates, onEmail, onInvite }) => {
  const [mode, setMode] = useState<'email' | 'vetter'>('vetter');
  const [emailsText, setEmailsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [audience, setAudience] = useState<AudienceFilters>(emptyAudience);
  const [chosen, setChosen] = useState<string[]>([]);
  const [showEmail, setShowEmail] = useState(false);
  const link = jobLink(job);

  const flash = (message: string) => {
    setSent(message);
    setTimeout(() => setSent(null), 4000);
  };

  const sendEmails = () => {
    const emails = [...new Set(emailsText.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
    const invalid = emails.filter((e) => !EMAIL.test(e));
    if (emails.length === 0 || invalid.length > 0) {
      setError(emails.length === 0 ? 'Enter at least one email address.' : `Not an email address: ${invalid.join(', ')}`);
      return;
    }
    setError(null);
    onEmail(job.id, emails);
    const subject = `${job.companyName}: ${job.title}`;
    const body = `Hi,\n\n${job.companyName} would like you to take the tests for ${job.title} on Vetter (${job.testIds.length} ${
      job.testIds.length === 1 ? 'test' : 'tests'
    }). Your results go straight to ${job.companyName}.\n\nStart here: ${link}\n`;
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setEmailsText('');
    flash(`Sent to ${emails.length} ${emails.length === 1 ? 'person' : 'people'}. They're tracked on the job.`);
  };

  const invitedIds = new Set(job.invitations.map((i) => i.candidateId));
  const notInvited = candidates.filter((c) => !invitedIds.has(c.id));
  const matching = notInvited.filter((c) => matchesAudience(c, audience));
  const cities = [...new Set(notInvited.map(cityOf))].sort();
  const chosenMatching = matching.filter((c) => chosen.includes(c.id));
  const allChosen = matching.length > 0 && chosenMatching.length === matching.length;
  const sample = candidates.find((c) => c.id === chosen[0]) ?? matching[0];
  const setAudienceField = <K extends keyof AudienceFilters>(key: K, value: AudienceFilters[K]) => setAudience((prev) => ({ ...prev, [key]: value }));
  const toggleIn = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const invite = () => {
    onInvite(job.id, chosen);
    flash(`Emailed ${chosen.length} ${chosen.length === 1 ? 'candidate' : 'candidates'} at their Vetter login address. They're tracked on the job.`);
    setChosen([]);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="job-link" className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <Link2 className="w-4 h-4 text-indigo-600" />
          Link to this job's tests
        </label>
        <div className="flex gap-2">
          <input
            id="job-link"
            readOnly
            value={link}
            onFocus={(e) => e.target.select()}
            className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700"
          />
          <CopyLinkButton job={job} className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shrink-0" />
        </div>
        <p className="text-xs text-slate-500">It opens the job's page. Anyone can take the tests there, and their results come back to you.</p>
      </div>

      <div className="pt-4 border-t border-slate-200 space-y-3">
        <div className="flex gap-1">
          {(
            [
              { id: 'vetter', label: 'Send to people on Vetter', icon: UserPlus },
              { id: 'email', label: 'Email it', icon: Mail },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                mode === m.id ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>

        {sent && (
          <p className="text-xs text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> {sent}
          </p>
        )}

        {mode === 'email' ? (
          <div className="space-y-2">
            <textarea
              rows={2}
              value={emailsText}
              onChange={(e) => {
                setEmailsText(e.target.value);
                setError(null);
              }}
              aria-label="Email addresses"
              placeholder="alex@uni.ac.uk, sam@uni.ac.uk"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
            />
            {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={sendEmails} className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 rounded-lg flex items-center gap-2">
                <Send className="w-3.5 h-3.5" />
                Send
              </button>
              <span className="text-[11px] text-slate-500">Opens your email app with the link filled in. Everyone is BCC'd.</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <ChipRow label="Stage" options={CAREER_STAGES} selected={audience.stages} onToggle={(v) => setAudienceField('stages', toggleIn(audience.stages, v))} />
              <ChipRow label="Level" options={CANDIDATE_LEVELS} selected={audience.levels} onToggle={(v) => setAudienceField('levels', toggleIn(audience.levels, v))} />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={audience.subject}
                  onChange={(e) => setAudienceField('subject', e.target.value)}
                  aria-label="Subject studied"
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Any subject</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={audience.city}
                  onChange={(e) => setAudienceField('city', e.target.value)}
                  aria-label="Location"
                  className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Anywhere</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={audience.query}
                    onChange={(e) => setAudienceField('query', e.target.value)}
                    placeholder="Name, university…"
                    aria-label="Search candidates"
                    className="w-full pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-3 text-xs">
                <label className="flex items-center gap-2 font-semibold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allChosen}
                    disabled={matching.length === 0}
                    onChange={() =>
                      setChosen((prev) =>
                        allChosen ? prev.filter((id) => !matching.some((c) => c.id === id)) : [...new Set([...prev, ...matching.map((c) => c.id)])]
                      )
                    }
                    className="accent-indigo-600"
                  />
                  {matching.length} {matching.length === 1 ? 'candidate matches' : 'candidates match'}
                </label>
                {!audienceIsEmpty(audience) && (
                  <button onClick={() => setAudience(emptyAudience())} className="text-slate-500 hover:text-slate-900">
                    Clear filters
                  </button>
                )}
                {invitedIds.size > 0 && <span className="ml-auto text-slate-400">{invitedIds.size} already sent</span>}
              </div>
              <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {matching.length === 0 && <li className="px-3 py-2.5 text-xs text-slate-500">No candidates match.</li>}
                {matching.map((c) => (
                  <li key={c.id}>
                    <label className="px-3 py-2 flex items-center gap-3 text-xs cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={chosen.includes(c.id)}
                        onChange={(e) => setChosen((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)))}
                        className="accent-indigo-600"
                      />
                      <img src={c.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-6 h-6 rounded-full object-cover bg-slate-100" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900 truncate">{c.name}</span>
                        <span className="block text-slate-500 truncate">
                          {headline(c)} &middot; {c.location}
                        </span>
                      </span>
                      <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold shrink-0">{levelOf(c)}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={invite}
                disabled={chosen.length === 0}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 disabled:opacity-40 rounded-lg flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                {chosen.length === 0 ? 'Send' : `Send to ${chosen.length}`}
              </button>
              <span className="text-[11px] text-slate-500">Emailed to each person's Vetter login address and added to their Home.</span>
              {sample && (
                <button onClick={() => setShowEmail(!showEmail)} className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900">
                  {showEmail ? 'Hide email' : 'Preview email'}
                </button>
              )}
            </div>
            {showEmail && sample && <EmailPreview {...inviteEmail(job, sample, link)} />}
          </div>
        )}
      </div>
    </div>
  );
};

const ChipRow = <T extends string>({ label, options, selected, onToggle }: { label: string; options: T[]; selected: T[]; onToggle: (value: T) => void }) => (
  <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
    <span className="w-12 text-[11px] font-semibold text-slate-500">{label}</span>
    {options.map((o) => (
      <button
        key={o}
        onClick={() => onToggle(o)}
        aria-pressed={selected.includes(o)}
        className={`px-2.5 py-1 rounded-full border text-xs font-medium ${
          selected.includes(o) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
        }`}
      >
        {o}
      </button>
    ))}
  </div>
);

const EmailPreview: React.FC<{ to: string; subject: string; body: string }> = ({ to, subject, body }) => (
  <div className="bg-white border border-slate-200 rounded-lg text-xs">
    <div className="px-3 py-2 border-b border-slate-100 space-y-0.5 text-slate-500">
      <div>
        To: <span className="text-slate-900">{to}</span>
      </div>
      <div>
        Subject: <span className="font-semibold text-slate-900">{subject}</span>
      </div>
    </div>
    <p className="px-3 py-2.5 whitespace-pre-line text-slate-700 break-words">{body}</p>
  </div>
);
