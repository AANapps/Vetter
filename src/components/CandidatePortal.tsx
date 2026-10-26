import React, { useCallback, useState } from 'react';
import { User, AssessmentTest, JobPosting, CandidateJobMatch, Business, TestRole, TEST_DIFFICULTIES, Exam, JobProfile } from '../types';
import { activeProfileOf, asProfile, profilesOf } from '../lib/jobProfiles';
import { ROLE_GROUPS } from '../lib/testRoles';
import { isMainVersion, levelsOf } from '../lib/testLevels';
import { LevelPicker } from './LevelPicker';
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
  Send,
  Pencil,
  Plus,
} from 'lucide-react';
import { VerifiedSkillBadge, TierLegend, getBadgeTier } from './VerifiedSkillBadge';
import { JobApplicationModal } from './JobApplicationModal';
import { JobDetailsModal, JobPage, JobTests, getJobTests } from './JobDetails';
import { JobProfileEditor } from './JobProfileEditor';
import { ProfileSidebar } from './ProfileSidebar';
import { TodoList } from './TodoList';
import { JobFilters } from './JobFilters';
import { CITIES } from '../lib/geo';
import { JobFilterState, countActiveFilters, defaultJobFilters, jobMatchesFilters } from '../lib/jobFilters';

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
  onApplyJob: (jobId: string, profileId: string) => void;
  onUpdateProfiles: (profiles: JobProfile[], activeProfileId: string) => void;
  // Set when the candidate is on a job's own page (#/jobs/<id>)
  jobPageId?: string | null;
  onOpenJob: (jobId: string) => void;
  // Exams the candidate has been invited to, for the to-do list on their profile
  exams: Exam[];
  onOpenExam: (examId: string) => void;
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
  onUpdateProfiles,
  jobPageId,
  onOpenJob,
  exams,
  onOpenExam,
}) => {
  // Tests page filters
  const [roleFilter, setRoleFilter] = useState<TestRole | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<AssessmentTest['difficulty'][]>([]);
  // The level picked on each test card, by the test's main version
  const [cardLevels, setCardLevels] = useState<Record<string, string>>({});
  const [testStatusFilter, setTestStatusFilter] = useState<'all' | 'not-taken' | 'taken'>('all');
  const [openJobId, setOpenJobId] = useState<string | null>(null);
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);
  const [selectedJobForApplication, setSelectedJobForApplication] = useState<JobPosting | null>(null);
  // Radius searches start from where the candidate lives, when we can place it
  const homeCity = CITIES[candidate.location] ? candidate.location : 'San Francisco, CA';
  const [jobFilters, setJobFilters] = useState<JobFilterState>(() => defaultJobFilters(homeCity));
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [jobSort, setJobSort] = useState<'newest' | 'fit'>('newest');
  // The job profile being edited or created
  const [editingProfile, setEditingProfile] = useState<{ profile: JobProfile; isNew: boolean } | null>(null);

  // The profile page shows one job profile at a time: its headline, about and the skills it features
  const profiles = profilesOf(candidate);
  const activeProfile = activeProfileOf(candidate);
  const shown = asProfile(candidate, activeProfile);

  const activeJobs = jobs.filter((j) => j.status === 'active');

  // Compute live vector matches
  const rankedJobs: CandidateJobMatch[] = rankJobsForCandidate(candidate, activeJobs);
  const bestScore = Math.max(...shown.verifiedSkills.map((s) => s.score), 0);
  const bestTier = shown.verifiedSkills.length ? getBadgeTier(bestScore) : undefined;

  // Job board: every active job through the sidebar filters, sorted by newest or best fit
  const activeFilterCount = countActiveFilters(jobFilters, defaultJobFilters(homeCity));
  const boardJobs = rankedJobs
    .filter((match) => {
      const job = activeJobs.find((j) => j.id === match.jobId)!;
      return jobMatchesFilters(job, match, jobFilters, candidate.appliedJobIds ?? []);
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
    onStartTest: (test: AssessmentTest) => {
      beforeLeaving();
      onStartTest(test);
    },
    onOpenTest: (testId: string) => {
      beforeLeaving();
      onOpenTest(testId);
    },
  });

  const appliedJobs = jobs.filter((j) => candidate.appliedJobIds?.includes(j.id));

  const handleApply = (jobId: string, jobTitle: string, profileId: string) => {
    onApplyJob(jobId, profileId);
    const profileName = profiles.find((p) => p.id === profileId)?.name;
    setAppliedNotification(`Application sent for "${jobTitle}" with your ${profileName ?? 'verified skills'} profile.`);
    setTimeout(() => setAppliedNotification(null), 3500);
  };

  // Vetter-made tests are open to everyone; company tests are taken through the jobs they're attached to
  // Each test is listed once; its levels are picked on the card
  const allVetterVersions = tests.filter((t) => t.type === 'standard');
  const vetterTests = allVetterVersions.filter(isMainVersion);
  const testDifficulties = TEST_DIFFICULTIES.filter((d) => allVetterVersions.some((t) => t.difficulty === d));
  const filteredTests = vetterTests.filter((t) => {
    const versions = levelsOf(t, tests);
    if (roleFilter !== 'all' && !t.roles?.includes(roleFilter)) return false;
    if (difficultyFilter.length > 0 && !versions.some((v) => difficultyFilter.includes(v.difficulty))) return false;
    const taken = versions.some((v) => getBestTestScore(candidate, v.id) !== undefined);
    if (testStatusFilter === 'taken' && !taken) return false;
    if (testStatusFilter === 'not-taken' && taken) return false;
    return true;
  });

  return (
    // The profile reads like a LinkedIn profile: an ~804px column beside suggested tests and jobs; the boards use the full width
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
      <TodoList candidate={candidate} exams={exams} onOpenExam={onOpenExam} />

      {/* Hero: Candidate Profile & Verification Passport Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        {/* Job profiles: one for each kind of work */}
        <div className="flex flex-wrap items-center gap-2 pb-5 border-b border-slate-200/80">
          <span className="text-xs font-bold text-slate-900 mr-1">Job profiles</span>
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => onUpdateProfiles(profiles, p.id)}
              aria-pressed={p.id === activeProfile.id}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                p.id === activeProfile.id
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
              }`}
            >
              {p.name}
            </button>
          ))}
          <button
            onClick={() =>
              setEditingProfile({ profile: { id: `profile-${Date.now()}`, name: '', title: '', bio: '', skillIds: [] }, isNew: true })
            }
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-slate-300 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New profile</span>
          </button>
          <button
            onClick={() => setEditingProfile({ profile: activeProfile, isNew: false })}
            className="ml-auto text-xs font-semibold text-indigo-700 hover:underline flex items-center gap-1"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit {activeProfile.name} profile</span>
          </button>
        </div>

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
                {bestTier && bestTier.tierKey !== 'developing' && (
                  <span className={`text-xs font-semibold ${bestTier.badgeTextColor}`} title={`Best verified result: ${bestTier.label}`}>
                    {bestTier.label} verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-700 font-medium">{shown.title}</p>
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

        {shown.bio && <p className="text-sm text-slate-600 leading-relaxed">{shown.bio}</p>}

        {/* Dynamic Verified Skill Badges Showcase in Hero */}
        <div className="pt-4 border-t border-slate-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <span className="text-xs font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Earned Verified Skill Badges</span>
            </span>
            <TierLegend />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {shown.verifiedSkills.length === 0 && (
              <p className="text-xs text-slate-500">
                This profile doesn't show any verified skills yet.{' '}
                <button
                  onClick={() => setEditingProfile({ profile: activeProfile, isNew: false })}
                  className="font-semibold text-indigo-700 hover:underline"
                >
                  Choose skills to show
                </button>
              </p>
            )}
            {shown.verifiedSkills.map((skill) => (
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
              {shown.verifiedSkills.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Top Benchmark</div>
            <div className={`text-2xl font-bold font-mono tabular-nums ${bestTier?.badgeTextColor ?? 'text-slate-900'}`}>
              {bestScore}
              <span className="text-xs font-normal text-slate-400">/100{bestTier ? ` (${bestTier.colorName})` : ''}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Global Percentile</div>
            <div className="text-2xl font-bold text-indigo-600 font-mono tabular-nums">
              {Math.max(...shown.verifiedSkills.map((s) => s.percentile), 0)}th
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
                Scores from proctored, auto-graded tests. Open any badge to see and share its credential.
              </p>
            </div>

            <TierLegend />
          </div>

          {/* High-Scoring Showcase Banner (Highlights 95+ Gold Master credentials) */}
          {shown.verifiedSkills.some((s) => s.score >= 95) && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700">Featured</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shown.verifiedSkills
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
            {shown.verifiedSkills.map((skill) => (
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

      <ProfileSidebar
        candidate={candidate}
        tests={tests}
        jobs={jobs}
        rankedJobs={rankedJobs}
        onOpenTest={onOpenTest}
        onOpenJob={setOpenJobId}
      />
      </div>
      )}

      {/* SECTION 2: JOB BOARD */}
      {view === 'jobs' && (
        <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
          {/* Filters: a column on the left; on phones a full-screen sheet behind the Filters button */}
          <div
            className={`${
              showMobileFilters ? 'fixed inset-0 z-50 bg-slate-50 overflow-y-auto p-4 pb-24' : 'hidden'
            } lg:block lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:pb-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto`}
          >
            <JobFilters
              jobs={activeJobs}
              filters={jobFilters}
              onChange={setJobFilters}
              onClear={() => setJobFilters(defaultJobFilters(homeCity))}
              activeCount={activeFilterCount}
            />
            <div className="lg:hidden fixed bottom-0 inset-x-0 p-4 bg-white border-t border-slate-200">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Show {boardJobs.length} {boardJobs.length === 1 ? 'job' : 'jobs'}
              </button>
            </div>
          </div>

        <div className="space-y-6 min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Job Board</h1>
              <p className="text-xs text-slate-500">
                {boardJobs.length === activeJobs.length
                  ? `${activeJobs.length} open jobs.`
                  : `${boardJobs.length} of ${activeJobs.length} open jobs match your filters.`}{' '}
                Your fit score is based on your verified skills.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowMobileFilters((s) => !s)}
                aria-expanded={showMobileFilters}
                className="lg:hidden px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white rounded-lg"
              >
                Filters
                {activeFilterCount > 0 && ` (${activeFilterCount})`}
              </button>
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
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 shadow-xs space-y-2">
              <p>No jobs match your filters.</p>
              <button onClick={() => setJobFilters(defaultJobFilters(homeCity))} className="font-semibold text-indigo-700 hover:underline">
                Clear all filters
              </button>
            </div>
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

                    {/* The job's tests: each to do, or your result */}
                    <div className="mt-4 pt-4 border-t border-slate-200/80">
                      <JobTests items={getJobTests(job, match, candidate, tests)} />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
        </div>
      )}

      {/* SECTION 3: VETTER TESTS */}
      {view === 'tests' && (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
          {/* Browse by industry and role */}
          <aside className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5 lg:sticky lg:top-20">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-900 mb-2">Browse by role</h2>
              <RoleButton label="All tests" count={vetterTests.length} active={roleFilter === 'all'} onClick={() => setRoleFilter('all')} />
            </div>
            {ROLE_GROUPS.map((group) => (
              <div key={group.industry} className="space-y-1">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-2">{group.industry}</h3>
                {group.roles.map((role) => (
                  <RoleButton
                    key={role}
                    label={role}
                    count={vetterTests.filter((t) => t.roles?.includes(role)).length}
                    active={roleFilter === role}
                    onClick={() => setRoleFilter(role)}
                  />
                ))}
              </div>
            ))}

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-900">Difficulty</h3>
              {testDifficulties.map((d) => (
                <label key={d} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={difficultyFilter.includes(d)}
                    onChange={(e) =>
                      setDifficultyFilter((prev) => (e.target.checked ? [...prev, d] : prev.filter((x) => x !== d)))
                    }
                    className="accent-indigo-600"
                  />
                  <span>{d}</span>
                </label>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <h3 className="text-xs font-bold text-slate-900">Status</h3>
              {([
                ['all', 'All'],
                ['not-taken', 'Not taken yet'],
                ['taken', 'Taken'],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="test-status"
                    checked={testStatusFilter === value}
                    onChange={() => setTestStatusFilter(value)}
                    className="accent-indigo-600"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </aside>

        <div className="space-y-6 min-w-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {roleFilter === 'all' ? 'Tests' : `Tests for ${roleFilter}s`}
            </h1>
            <p className="text-xs text-slate-500">
              Practical tests made by Vetter for each kind of role. Each score becomes a verified skill on your
              profile. Tests that companies write for their own jobs are taken from the Job Board.
            </p>
          </div>

          {filteredTests.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 shadow-xs">
              No tests match these filters.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredTests.map((main) => {
              const versions = levelsOf(main, tests);
              // The level shown: the one picked on this card, else the first matching the difficulty filter
              const t =
                versions.find((v) => v.id === cardLevels[main.id]) ??
                versions.find((v) => difficultyFilter.includes(v.difficulty)) ??
                main;
              const bestScore = getBestTestScore(candidate, t.id);
              const stats = getTestStats(t, allCandidates);

              return (
                <div
                  key={main.id}
                  className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between hover:border-indigo-300 transition-colors space-y-5 shadow-xs"
                >
                  <div className="space-y-3">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 font-bold">
                      {t.category}
                    </span>

                    <h3 className="text-base font-bold text-slate-900">
                      <button onClick={() => onOpenTest(t.id)} className="text-left hover:text-indigo-700 transition-colors">
                        {t.title}
                      </button>
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>

                    {versions.length > 1 && (
                      <LevelPicker
                        versions={versions}
                        selectedId={t.id}
                        onSelect={(id) => setCardLevels((prev) => ({ ...prev, [main.id]: id }))}
                        bestScores={Object.fromEntries(versions.map((v) => [v.id, getBestTestScore(candidate, v.id)]))}
                      />
                    )}

                    {t.roles && t.roles.length > 0 && (
                      <div className="text-[11px] text-slate-500">
                        For: <span className="font-semibold text-slate-700">{t.roles.join(', ')}</span>
                      </div>
                    )}

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
                      <span>{t.difficulty} &middot; ~{t.estimatedMinutes} mins &middot; {t.totalQuestions} tasks</span>
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

      {editingProfile && (
        <JobProfileEditor
          profile={editingProfile.profile}
          isNew={editingProfile.isNew}
          skills={candidate.verifiedSkills}
          onDelete={
            profiles.length > 1
              ? () => {
                  const rest = profiles.filter((p) => p.id !== editingProfile.profile.id);
                  onUpdateProfiles(rest, rest[0].id);
                  setEditingProfile(null);
                }
              : undefined
          }
          onSave={(saved) => {
            const next = editingProfile.isNew
              ? [...profiles, saved]
              : profiles.map((p) => (p.id === saved.id ? saved : p));
            onUpdateProfiles(next, saved.id);
            setEditingProfile(null);
          }}
          onClose={() => setEditingProfile(null)}
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
          profiles={profiles}
          onConfirmApply={(jobId, profileId) => {
            handleApply(jobId, selectedJobForApplication.title, profileId);
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

const RoleButton: React.FC<{ label: string; count: number; active: boolean; onClick: () => void }> = ({
  label,
  count,
  active,
  onClick,
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors ${
      active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
    }`}
  >
    <span>{label}</span>
    <span className="font-mono text-[11px] text-slate-400 tabular-nums">{count}</span>
  </button>
);
