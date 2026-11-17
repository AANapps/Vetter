import React, { useCallback, useEffect, useRef, useState } from 'react';
import { backOr } from '../lib/back';
import { Pic } from './Pic';
import { User, AssessmentTest, JobPosting, CandidateJobMatch, Business, JobProfile } from '../types';
import { activeProfileOf, asProfile, profilesOf } from '../lib/jobProfiles';
import { TestField } from '../lib/testRoles';
import { SectorId, jobInSector, sectorLabel } from '../lib/sectors';
import { rankJobsForCandidate, calculateCandidateJobMatch } from '../lib/matchingAlgorithm';
import {
  CheckCircle2,
  MapPin,
  DollarSign,
  Search,
  Send,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { JobApplicationModal } from './JobApplicationModal';
import { JobDetailsModal, JobPage, JobTests, fitKnown, getJobTests } from './JobDetails';
import { JobProfileEditor } from './JobProfileEditor';
import { Studies, StudiesEditor } from './StudiesEditor';
import { ExperienceDetails, ExperienceEditor } from './ExperienceEditor';
import { EducationDetails, EducationEditor } from './EducationEditor';
import { ProfileImportDialog } from './ProfileImportDialog';
import { MyProfile } from './MyProfile';
import { TestsBrowser } from './TestsBrowser';
import { totalMinutes } from '../lib/jobTests';
import { useProfileProgress } from '../lib/profileProgress';
import { JobFilters } from './JobFilters';
import { CITIES } from '../lib/geo';
import { JobFilterState, MAX_RADIUS, countActiveFilters, defaultJobFilters, jobMatchesFilters } from '../lib/jobFilters';

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
  // One of a job's tests, taken from the job: passing them all can send the application
  onStartJobTest?: (test: AssessmentTest, forJobId: string) => void;
  onApplyJob: (jobId: string, profileId: string) => void;
  onUpdateProfiles: (profiles: JobProfile[], activeProfileId: string) => void;
  onUpdateStudies: (studies: Studies) => void;
  // Changes their name on their account; unset for visitors
  onRename?: (name: string) => void;
  // Opens their profile as other people see it
  onPreviewProfile?: () => void;
  onUpdateExperience: (details: ExperienceDetails) => void;
  onUpdateEducation: (details: EducationDetails) => void;
  // Everything read from their CV, once they've checked it
  onImportProfile: (change: Partial<User>) => void;
  // Takes a test the candidate took off their record
  // Hides a test from their public profile (companies still see it), or shows it again
  onToggleHidden: (testId: string) => void;
  // The roles the Tests page is narrowed to (a role, an industry, or a field picked on Home), or null for every test
  testField: TestField | null;
  onTestFieldChange: (field: TestField | null) => void;
  // The sector picked at the top of the page: the job board and the Tests page list only what's in it
  sector: SectorId;
  // Checked before an application opens; false when the visitor has to sign in first (and has been asked to)
  canApply?: () => boolean;
  // Someone not signed in, opening a job from a company's link: the job page asks them to join first
  visitor?: { onJoin: () => void; onSignIn: () => void };
  // Set when the candidate is on a job's own page (/jobs/<slug>/)
  jobPageId?: string | null;
  onOpenJob: (jobId: string) => void;
}

// A job simulation: a whole day of the job, which goes last in a checklist

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
  onStartJobTest,
  onApplyJob,
  onUpdateProfiles,
  onUpdateStudies,
  onRename,
  onPreviewProfile,
  onUpdateExperience,
  onUpdateEducation,
  onImportProfile,
  onToggleHidden,
  jobPageId,
  onOpenJob,
  testField,
  onTestFieldChange,
  sector,
  canApply,
  visitor,
}) => {
  // Tests page filters
  // The level picked on each test card, by the test's main version
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
  const [editingStudies, setEditingStudies] = useState(false);
  const [editingExperience, setEditingExperience] = useState(false);
  const [editingEducation, setEditingEducation] = useState(false);
  const [importingCv, setImportingCv] = useState(false);

  // The profile page shows one job profile at a time: its headline, about and the skills it features
  const profiles = profilesOf(candidate);
  const activeProfile = activeProfileOf(candidate);
  const shown = asProfile(candidate, activeProfile);

  // The role they're working towards (as on their profile): the Tests page opens on it, once a visit
  const progress = useProfileProgress({ candidate, shown, activeProfile, tests, jobs, sector });
  const openedOnRole = useRef(false);
  useEffect(() => {
    if (section !== 'tests' || jobPageId || openedOnRole.current) return;
    openedOnRole.current = true;
    if (!testField && !visitor && progress.role) onTestFieldChange({ label: progress.role, roles: [progress.role] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, jobPageId]);
  useEffect(() => {
    if (section !== 'tests') openedOnRole.current = false;
  }, [section]);

  const activeJobs = jobs.filter((j) => j.status === 'active' && (sector === 'all' || jobInSector(sector, tests)(j)));

  // Compute live vector matches
  const rankedJobs: CandidateJobMatch[] = rankJobsForCandidate(candidate, activeJobs);

  // Job board: every active job through the sidebar filters, sorted by newest or best fit
  const activeFilterCount = countActiveFilters(jobFilters, defaultJobFilters(homeCity));
  // What's set inside the Filters popup, apart from the search and the place, which sit on the board itself
  const popupFilterCount = countActiveFilters({ ...jobFilters, keyword: '', location: homeCity, radius: MAX_RADIUS }, defaultJobFilters(homeCity));
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

  const openApplication = (job: JobPosting) => {
    if (canApply && !canApply()) return;
    setSelectedJobForApplication(job);
  };

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
      openApplication(job);
    },
    onStartJobTest: (test: AssessmentTest) => {
      beforeLeaving();
      if (onStartJobTest) onStartJobTest(test, job.id);
      else onStartTest(test);
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
        <MyProfile
          candidate={candidate}
          shown={shown}
          profiles={profiles}
          activeProfile={activeProfile}
          allCandidates={allCandidates}
          tests={tests}
          jobs={jobs}
          businesses={businesses}
          rankedJobs={rankedJobs}
          appliedJobs={appliedJobs}
          sector={sector}
          onSwitchProfile={(id) => onUpdateProfiles(profiles, id)}
          onNewProfile={() => setEditingProfile({ profile: { id: `profile-${Date.now()}`, name: '', title: '', bio: '', skillIds: [] }, isNew: true })}
          onEditProfile={() => setEditingProfile({ profile: activeProfile, isNew: false })}
          onEditStudies={() => setEditingStudies(true)}
          onEditExperience={() => setEditingExperience(true)}
          onEditEducation={() => setEditingEducation(true)}
          onImportCv={() => setImportingCv(true)}
          onFindTests={() => onNavigate('tests')}
          onFindJobs={() => onNavigate('jobs')}
          onOpenTest={onOpenTest}
          onPreviewJob={setOpenJobId}
          onOpenJob={onOpenJob}
          onToggleHidden={onToggleHidden}
          onRename={onRename}
          onPreview={onPreviewProfile}
        />
      )}

      {/* SECTION 2: JOB BOARD */}
      {view === 'jobs' && (
        <div className="space-y-6 min-w-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Job Board</h1>
            <p className="text-xs text-slate-500">
              {boardJobs.length === activeJobs.length
                ? `${activeJobs.length} open ${sector === 'all' ? '' : `${sectorLabel(sector)} `}jobs.`
                : `${boardJobs.length} of ${activeJobs.length} open ${sector === 'all' ? '' : `${sectorLabel(sector)} `}jobs match your search.`}{' '}
              Your fit score is based on your verified skills.
            </p>
          </div>

          {/* Search, where, the rest of the filters behind a button, and the order */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex flex-col sm:flex-row bg-white border border-slate-300 rounded-xl shadow-2xs focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 min-w-0">
              <label className="flex-1 flex items-center gap-2 px-3 min-w-0">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="search"
                  value={jobFilters.keyword}
                  onChange={(e) => setJobFilters((f) => ({ ...f, keyword: e.target.value }))}
                  placeholder="Job title, company or skill"
                  aria-label="Search jobs"
                  className="w-full py-2.5 text-sm text-slate-900 placeholder-slate-400 bg-transparent focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-2 px-3 border-t sm:border-t-0 sm:border-l border-slate-200 sm:w-60">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={jobFilters.radius >= MAX_RADIUS ? '' : jobFilters.location}
                  onChange={(e) => {
                    const city = e.target.value;
                    // A place on its own means near it: 50 miles to start, changed under Filters
                    setJobFilters((f) => (city ? { ...f, location: city, radius: f.radius >= MAX_RADIUS ? 50 : f.radius } : { ...f, radius: MAX_RADIUS }));
                  }}
                  aria-label="Location"
                  className="w-full py-2.5 text-sm text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="">Anywhere</option>
                  {Object.keys(CITIES)
                    .sort()
                    .map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMobileFilters(true)}
                aria-haspopup="dialog"
                className={`px-4 py-2.5 text-sm font-semibold rounded-xl border flex items-center gap-1.5 shadow-2xs ${
                  popupFilterCount > 0 ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {popupFilterCount > 0 && <span className="ml-0.5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] tabular-nums">{popupFilterCount}</span>}
              </button>
              <select
                value={jobSort}
                onChange={(e) => setJobSort(e.target.value as typeof jobSort)}
                aria-label="Sort jobs"
                className="px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-700 font-medium shadow-2xs"
              >
                <option value="newest">Newest first</option>
                <option value="fit">Best fit first</option>
              </select>
            </div>
          </div>

          {showMobileFilters && (
            <div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/50"
              onClick={(e) => e.target === e.currentTarget && setShowMobileFilters(false)}
              onKeyDown={(e) => e.key === 'Escape' && setShowMobileFilters(false)}
            >
              <div role="dialog" aria-modal="true" aria-label="Filters" className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900">Filters</h2>
                  <button onClick={() => setShowMobileFilters(false)} aria-label="Close" autoFocus className="p-1 text-slate-400 hover:text-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
                  <JobFilters jobs={activeJobs} filters={jobFilters} onChange={setJobFilters} />
                </div>
                <div className="px-5 py-3 border-t border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => setJobFilters((f) => ({ ...defaultJobFilters(homeCity), keyword: f.keyword, location: f.location, radius: f.radius >= MAX_RADIUS ? MAX_RADIUS : f.radius }))}
                    disabled={popupFilterCount === 0}
                    className="text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-40"
                  >
                    Clear filters
                  </button>
                  <button onClick={() => setShowMobileFilters(false)} className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
                    Show {boardJobs.length} {boardJobs.length === 1 ? 'job' : 'jobs'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeJobs.length === 0 && sector !== 'all' && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500 shadow-xs">
              No open jobs in {sectorLabel(sector)} yet.
            </div>
          )}

          {boardJobs.length === 0 && activeJobs.length > 0 && (
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
                          <Pic
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
                        {fitKnown(job, candidate) ? (
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
                        ) : (
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900">
                              Take {job.testIds.length} {job.testIds.length === 1 ? 'test' : 'tests'}
                            </div>
                            <div className="text-[11px] text-slate-500">about {totalMinutes(job, tests)} min, to apply</div>
                          </div>
                        )}

                        {isApplied ? (
                          <div className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Applied</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => openApplication(job)}
                            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Apply</span>
                          </button>
                        )}

                        <button
                          onClick={() => setOpenJobId(match.jobId)}
                          className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg transition-colors"
                        >
                          View job
                        </button>
                      </div>
                    </div>

                    {/* The job's tests: each to do, or your result */}
                    <div className="mt-4 pt-4 border-t border-slate-200/80">
                      <JobTests items={getJobTests(job, candidate, tests)} />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Praxa's tests: pick a role, then its tests in order */}
      {view === 'tests' && (
        <TestsBrowser
          candidate={candidate}
          allCandidates={allCandidates}
          tests={tests}
          jobs={jobs}
          sector={sector}
          testField={testField}
          onTestFieldChange={onTestFieldChange}
          onOpenTest={onOpenTest}
          onStartTest={onStartTest}
        />
      )}

      {jobPage && <JobPage {...jobDetailsProps(jobPage)} visitor={visitor} onBack={() => backOr(() => onNavigate('jobs'))} />}

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

      {editingExperience && (
        <ExperienceEditor
          candidate={candidate}
          onSave={(details) => {
            onUpdateExperience(details);
            setEditingExperience(false);
          }}
          onClose={() => setEditingExperience(false)}
        />
      )}

      {editingEducation && (
        <EducationEditor
          candidate={candidate}
          onSave={(details) => {
            onUpdateEducation(details);
            setEditingEducation(false);
          }}
          onClose={() => setEditingEducation(false)}
        />
      )}

      {importingCv && (
        <ProfileImportDialog
          candidate={candidate}
          onSave={(change) => {
            onImportProfile(change);
            setImportingCv(false);
          }}
          onClose={() => setImportingCv(false)}
        />
      )}

      {editingStudies && (
        <StudiesEditor
          candidate={candidate}
          onSave={(studies) => {
            onUpdateStudies(studies);
            setEditingStudies(false);
          }}
          onClose={() => setEditingStudies(false)}
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

      {/* Job application, including the job's tests */}
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
          onStartJobTest={(test, forJobId) => {
            if (onStartJobTest) {
              onStartJobTest(test, forJobId);
            } else {
              onStartTest(test);
            }
          }}
        />
      )}
    </div>
  );
};

