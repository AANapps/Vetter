import React, { useCallback, useState } from 'react';
import { User, AssessmentTest, JobPosting, CandidateJobMatch, Business } from '../types';
import { rankJobsForCandidate, getBestTestScore, calculateCandidateJobMatch } from '../lib/matchingAlgorithm';
import { getLeaderboard, getTestStats } from '../lib/leaderboard';
import {
  Award,
  CheckCircle2,
  Briefcase,
  Play,
  MapPin,
  DollarSign,
  Search,
  ShieldCheck,
  Send,
  Crown
} from 'lucide-react';
import { VerifiedSkillBadge } from './VerifiedSkillBadge';
import { JobApplicationModal } from './JobApplicationModal';
import { JobDetailsModal, JobPage } from './JobDetails';
import { DiscoverSidebar } from './DiscoverSidebar';

export type CandidateSection = 'profile' | 'jobs' | 'tests';

interface CandidatePortalProps {
  section: CandidateSection;
  onNavigate: (section: CandidateSection) => void;
  candidate: User;
  allCandidates: User[];
  onOpenTest: (testId: string) => void;
  tests: AssessmentTest[];
  jobs: JobPosting[];
  businesses: Business[];
  onStartTest: (test: AssessmentTest) => void;
  onStartAttachedTest?: (test: AssessmentTest, forJobId: string) => void;
  onApplyJob: (jobId: string) => void;
  // Set when the candidate is on a job's own page (#/jobs/<id>)
  jobPageId?: string | null;
  onOpenJob: (jobId: string) => void;
  // Follows, for the right-hand column beside the profile
  following: string[];
  onToggleFollow: (id: string) => void;
}

export const CandidatePortal: React.FC<CandidatePortalProps> = ({
  section,
  onNavigate,
  candidate,
  allCandidates,
  onOpenTest,
  tests,
  jobs,
  businesses,
  onStartTest,
  onStartAttachedTest,
  onApplyJob,
  jobPageId,
  onOpenJob,
  following,
  onToggleFollow,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);
  const [selectedJobForApplication, setSelectedJobForApplication] = useState<JobPosting | null>(null);
  const [jobSearch, setJobSearch] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState<'all' | JobPosting['workType']>('all');
  const [jobSort, setJobSort] = useState<'newest' | 'fit'>('newest');

  const activeJobs = jobs.filter((j) => j.status === 'active');

  // Compute live vector matches
  const rankedJobs: CandidateJobMatch[] = rankJobsForCandidate(candidate, activeJobs);

  // Job board: every active job, searchable, sorted by newest or best fit
  const boardJobs = rankedJobs
    .filter((match) => {
      const job = activeJobs.find((j) => j.id === match.jobId)!;
      if (workTypeFilter !== 'all' && job.workType !== workTypeFilter) return false;
      const q = jobSearch.trim().toLowerCase();
      if (q && ![job.title, job.companyName, job.department, job.location].some((f) => f.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (jobSort === 'fit') return b.overallFitPercentage - a.overallFitPercentage;
      const jobA = activeJobs.find((j) => j.id === a.jobId)!;
      const jobB = activeJobs.find((j) => j.id === b.jobId)!;
      return jobB.postedDate.localeCompare(jobA.postedDate);
    });

  const openJob = openJobId ? jobs.find((j) => j.id === openJobId) : undefined;
  const closeJob = useCallback(() => setOpenJobId(null), []);
  const jobPage = jobPageId ? jobs.find((j) => j.id === jobPageId) : undefined;
  // On a job page the sections give way to the job
  const view = jobPage ? 'job' : section;

  // The pop-up and the job page do the same things; the pop-up closes itself first
  const jobDetailsProps = (job: JobPosting, beforeLeaving: () => void = () => {}) => ({
    job,
    match: calculateCandidateJobMatch(candidate, job),
    candidate,
    allCandidates,
    tests,
    business: businesses.find((b) => b.id === job.businessId),
    isApplied: !!candidate.appliedJobIds?.includes(job.id),
    onApply: () => {
      beforeLeaving();
      setSelectedJobForApplication(job);
    },
    onStartAttachedTest: (test: AssessmentTest) => {
      beforeLeaving();
      if (onStartAttachedTest) onStartAttachedTest(test, job.id);
      else onStartTest(test);
    },
    onOpenTest: (testId: string) => {
      beforeLeaving();
      onOpenTest(testId);
    },
  });

  const appliedJobs = jobs.filter((j) => candidate.appliedJobIds?.includes(j.id));

  const handleApply = (jobId: string, jobTitle: string) => {
    onApplyJob(jobId);
    setAppliedNotification(`Application sent for "${jobTitle}" with your verified skill passport.`);
    setTimeout(() => setAppliedNotification(null), 3500);
  };

  // Vetter-made tests are open to everyone; company tests are taken through the jobs they're attached to
  const vetterTests = tests.filter((t) => t.type === 'standard');
  const testCategories = ['all', ...Array.from(new Set(vetterTests.map((t) => t.category)))];
  const filteredTests = vetterTests.filter((t) => categoryFilter === 'all' || t.category === categoryFilter);

  return (
    // The profile reads like a LinkedIn profile: an ~804px column beside the Discover sidebar; the boards use the full width
    <div className={`${view === 'profile' ? 'max-w-[1196px]' : 'max-w-7xl'} mx-auto px-6 py-8 space-y-8`}>
      {/* Toast Notification */}
      {appliedNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="text-xs font-medium">{appliedNotification}</div>
        </div>
      )}

      {view === 'profile' && (
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
      <div className="min-w-0 space-y-8">
      {/* Hero: Candidate Profile & Verification Passport Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
              <img
                src={candidate.avatarUrl}
                alt={candidate.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{candidate.name}</h1>
                <div className="flex items-center gap-1.5 text-xs text-white tier-solid tier-solid-gold px-2.5 py-0.5 rounded-md font-mono font-semibold">
                  <Crown className="w-3.5 h-3.5 text-white" />
                  <span>Verified Gold Master</span>
                </div>
              </div>
              <p className="text-xs text-slate-700 font-medium">{candidate.title}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  {candidate.location}
                </span>
                <span aria-hidden="true">&middot;</span>
                <span>{candidate.yearsExperience} yrs experience</span>
                <span aria-hidden="true">&middot;</span>
                <span className="text-indigo-600 font-semibold">{candidate.workPreference}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('tests')}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Take a Test</span>
            </button>
            <button
              onClick={() => onNavigate('jobs')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
              <span>Browse Jobs</span>
            </button>
          </div>
        </div>

        {/* Dynamic Verified Skill Badges Showcase in Hero */}
        <div className="pt-4 border-t border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <span className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Earned Verified Skill Badges</span>
            </span>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono font-medium">
              <span className="text-amber-700">95+ Gold Master</span>
              <span aria-hidden="true">&middot;</span>
              <span className="text-indigo-700">88–94 Silver</span>
              <span aria-hidden="true">&middot;</span>
              <span className="text-slate-700">75–87 Bronze</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {candidate.verifiedSkills.map((skill) => (
              <VerifiedSkillBadge
                key={skill.skillId}
                skill={skill}
                variant="compact"
              />
            ))}
          </div>
        </div>

        {/* Metric Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
          <div>
            <div className="text-xs text-slate-500 font-medium">Verified Skills</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {candidate.verifiedSkills.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Top Benchmark</div>
            <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums">
              {Math.max(...candidate.verifiedSkills.map((s) => s.score), 0)}
              <span className="text-xs font-normal text-slate-400">/100 (Gold)</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Global Percentile</div>
            <div className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
              {Math.max(...candidate.verifiedSkills.map((s) => s.percentile), 0)}th
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Best Match Fit</div>
            <div className="text-2xl font-bold text-indigo-700 font-mono tabular-nums">
              {rankedJobs[0]?.overallFitPercentage || 0}%
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: VERIFIED SKILL PASSPORT */}
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Verified Skill Credentials & Badges</h2>
              <p className="text-xs text-slate-500">
                Objective scores audited in live sandboxes with dynamic threshold color coding. Click any badge to view cryptographic proof.
              </p>
            </div>

            {/* Threshold Guide Badge Ribbon */}
            <div className="self-start flex flex-wrap items-center gap-2 text-xs font-mono p-1 bg-white border border-slate-200 rounded-lg shadow-2xs whitespace-nowrap">
              <span className="px-2 py-1 text-amber-700 font-bold flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>95+ Gold</span>
              </span>
              <span className="text-slate-300">&middot;</span>
              <span className="px-2 py-1 text-indigo-700 font-bold flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-indigo-600" />
                <span>88–94 Silver</span>
              </span>
              <span className="text-slate-300">&middot;</span>
              <span className="px-2 py-1 text-slate-700 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                <span>75–87 Bronze</span>
              </span>
            </div>
          </div>

          {/* High-Scoring Showcase Banner (Highlights 95+ Gold Master credentials) */}
          {candidate.verifiedSkills.some((s) => s.score >= 95) && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                <span>Featured High-Scoring Assessment</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.verifiedSkills
                  .filter((s) => s.score >= 95)
                  .map((skill) => (
                    <VerifiedSkillBadge
                      key={`showcase-${skill.skillId}`}
                      skill={skill}
                      variant="showcase"
                    />
                  ))}
              </div>
            </div>
          )}

          {/* Grid of All Verified Skill Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {candidate.verifiedSkills.map((skill) => (
              <VerifiedSkillBadge
                key={skill.skillId}
                skill={skill}
                variant="card"
                topPerformers={getLeaderboard(skill.testId, allCandidates).slice(0, 3)}
                currentCandidateId={candidate.id}
                onViewLeaderboard={() => onOpenTest(skill.testId)}
              />
            ))}

            {/* Prompt to take more assessments */}
            <div className="border border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-3 bg-white shadow-2xs">
              <Award className="w-8 h-8 text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Unlock Distributed Systems</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Score 95+ to earn the Gold Master badge and unlock top-tier engineering requisitions.
                </p>
              </div>
              <button
                onClick={() => {
                  const sysTest = tests.find((t) => t.category === 'System Architecture');
                  if (sysTest) onStartTest(sysTest);
                  else onNavigate('tests');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors"
              >
                Start Architecture Test
              </button>
            </div>
          </div>

          {/* My Applications */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900">My Applications</h2>
            {appliedJobs.length === 0 ? (
              <p className="text-xs text-slate-500">
                You haven't applied to any jobs yet.{' '}
                <button onClick={() => onNavigate('jobs')} className="text-indigo-600 font-semibold hover:underline">
                  Browse the job board
                </button>
              </p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 shadow-2xs">
                {appliedJobs.map((job) => (
                  <div key={job.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <img
                        src={job.companyLogo}
                        alt={job.companyName}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                      />
                      <div>
                        <button onClick={() => onOpenJob(job.id)} className="font-bold text-slate-900 hover:text-indigo-700 transition-colors text-left">
                          {job.title}
                        </button>
                        <div className="text-slate-500">{job.companyName} &middot; {job.location}</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Applied
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <DiscoverSidebar
        viewer={candidate}
        allCandidates={allCandidates}
        tests={tests}
        businesses={businesses}
        following={following}
        onToggleFollow={onToggleFollow}
        onOpenTest={onOpenTest}
      />
      </div>
      )}

      {/* SECTION 2: JOB BOARD */}
      {view === 'jobs' && (
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Job Board</h1>
              <p className="text-xs text-slate-500">
                {activeJobs.length} open jobs. Your fit score is based on your verified skills.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search title, company, location..."
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 w-60 max-w-full shadow-2xs"
                />
              </div>
              <select
                value={workTypeFilter}
                onChange={(e) => setWorkTypeFilter(e.target.value as typeof workTypeFilter)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium shadow-2xs"
              >
                <option value="all">All work types</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
              </select>
              <select
                value={jobSort}
                onChange={(e) => setJobSort(e.target.value as typeof jobSort)}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium shadow-2xs"
              >
                <option value="newest">Newest first</option>
                <option value="fit">Best fit first</option>
              </select>
            </div>
          </div>

          {boardJobs.length === 0 && (
            <p className="text-xs text-slate-500">No jobs match your search.</p>
          )}

          <div className="space-y-4">
            {boardJobs.map((match) => {
              const job = jobs.find((j) => j.id === match.jobId)!;
              const isApplied = candidate.appliedJobIds?.includes(match.jobId);

              return (
                <div
                  key={match.jobId}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 transition-colors shadow-xs"
                >
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Company & Role Details */}
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                          <img
                            src={job.companyLogo}
                            alt={match.companyName}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">{match.companyName}</span>
                            <span aria-hidden="true">&middot;</span>
                            <span className="text-xs text-slate-500">{job.department}</span>
                            <span aria-hidden="true">&middot;</span>
                            <span className="text-xs text-slate-500">Posted {job.postedDate}</span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 tracking-tight">
                            <button
                              onClick={() => setOpenJobId(match.jobId)}
                              className="text-left hover:text-indigo-700 hover:underline transition-colors"
                            >
                              {match.jobTitle}
                            </button>
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {job.location} ({job.workType})
                            </span>
                            <span aria-hidden="true">&middot;</span>
                            <span className="flex items-center gap-1 font-mono text-slate-700 font-medium">
                              <DollarSign className="w-3 h-3 text-indigo-600" />
                              {job.salaryRange}
                            </span>
                            <span aria-hidden="true">&middot;</span>
                            <span>{job.applicantCount} applicants</span>
                          </div>
                        </div>
                      </div>

                      {/* Match Fit Score & Apply CTA */}
                      <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-200">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-500 font-medium">Your Fit</div>
                          <div
                            className={`text-2xl font-extrabold font-mono tabular-nums ${
                              match.overallFitPercentage >= 85
                                ? 'text-indigo-600'
                                : match.overallFitPercentage >= 70
                                ? 'text-violet-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {match.overallFitPercentage}%
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">{match.matchTier}</div>
                        </div>

                        {isApplied ? (
                          <div className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Applied</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedJobForApplication(job)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Apply</span>
                          </button>
                        )}

                        <button
                          onClick={() => setOpenJobId(match.jobId)}
                          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white rounded-lg transition-colors"
                        >
                          View job
                        </button>
                      </div>
                    </div>

                    {/* Skill Breakdown Quick Row */}
                    <div className="mt-4 pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-3">
                      <span className="text-[11px] text-slate-500 font-medium">Skill Alignment:</span>
                      {match.breakdown.map((b) => (
                        <div
                          key={b.skillName}
                          className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                            b.meetsThreshold
                              ? 'bg-slate-50 border-slate-200 text-slate-800'
                              : 'bg-amber-50/60 border-amber-200 text-amber-900'
                          }`}
                        >
                          <span className="font-semibold text-slate-900">{b.skillName}</span>
                          <span className="text-slate-500 font-mono text-[11px]">
                            {b.candidateScore > 0 ? b.candidateScore : 'Not taken'} / {b.requiredMinScore} min
                          </span>
                          {b.meetsThreshold ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <span className="text-[10px] text-amber-700 font-mono font-semibold">Deficit</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Test attached to this job */}
                    {job.attachedTestId && (
                      <div className="mt-3.5 p-3 bg-indigo-50/40 border border-indigo-200/80 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-900">
                              {job.isAttachedTestMandatory ? 'Required test:' : 'Optional test:'}
                            </span>{' '}
                            <span className="text-indigo-900 font-semibold">{job.attachedTestTitle || 'Technical Test'}</span>
                            <span className="text-slate-400 font-mono text-[11px] ml-1.5">
                              ({tests.find((t) => t.id === job.attachedTestId)?.type === 'custom' ? `by ${job.companyName}` : 'by Vetter'}, pass mark {job.attachedTestPassingScore || 75})
                            </span>
                          </div>
                        </div>

                        <div>
                          {match.attachedTestStatus === 'qualified' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Passed: {match.attachedTestScore}/100</span>
                            </span>
                          ) : match.attachedTestStatus === 'test_taken_failed' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <span>Best score {match.attachedTestScore}/100 (below pass mark)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-500 bg-white border border-slate-200">
                              Not taken yet
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: VETTER TESTS */}
      {view === 'tests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Tests</h1>
              <p className="text-xs text-slate-500">
                Practical tests made by Vetter. Each score becomes a verified skill on your profile. Tests that
                companies write for their own jobs are taken from the Job Board.
              </p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
              {testCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    categoryFilter === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTests.map((t) => {
              const bestScore = getBestTestScore(candidate, t.id);
              const stats = getTestStats(t, allCandidates);

              return (
                <div
                  key={t.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-indigo-300 transition-colors space-y-5 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 font-bold">
                        {t.category}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{t.difficulty}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      <button onClick={() => onOpenTest(t.id)} className="text-left hover:text-indigo-700 transition-colors">
                        {t.title}
                      </button>
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {t.skillsTested.map((st) => (
                        <span
                          key={st}
                          className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 font-mono"
                        >
                          {st}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>~{t.estimatedMinutes} mins &middot; {t.totalQuestions} tasks</span>
                      <span className="tabular-nums">
                        {stats.candidatesRanked} ranked &middot; avg {stats.averageScore}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {bestScore !== undefined ? (
                        <div className="text-xs">
                          <span className="text-slate-500">Your best: </span>
                          <strong className="text-indigo-600 font-mono text-sm">{bestScore}/100</strong>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          Passing mark: <strong className="text-slate-800 font-mono">{t.passingScore}/100</strong>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenTest(t.id)}
                          className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 rounded-lg transition-colors"
                        >
                          More info
                        </button>
                        <button
                          onClick={() => onStartTest(t)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{bestScore !== undefined ? 'Retake' : 'Start Test'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {jobPage && <JobPage {...jobDetailsProps(jobPage)} onBack={() => onNavigate('jobs')} />}

      {/* Full job listing pop-up */}
      {openJob && (
        <JobDetailsModal
          {...jobDetailsProps(openJob, closeJob)}
          onClose={closeJob}
          onOpenPage={() => {
            closeJob();
            onOpenJob(openJob.id);
          }}
        />
      )}

      {/* Job application, including any attached test */}
      {selectedJobForApplication && (
        <JobApplicationModal
          isOpen={!!selectedJobForApplication}
          onClose={() => setSelectedJobForApplication(null)}
          candidate={candidate}
          job={selectedJobForApplication}
          tests={tests}
          overallFitPercentage={
            rankedJobs.find((m) => m.jobId === selectedJobForApplication.id)?.overallFitPercentage || 80
          }
          onConfirmApply={(jobId, score) => {
            handleApply(jobId, selectedJobForApplication.title);
          }}
          onStartAttachedTest={(test, forJobId) => {
            if (onStartAttachedTest) {
              onStartAttachedTest(test, forJobId);
            } else {
              onStartTest(test);
            }
          }}
        />
      )}
    </div>
  );
};
