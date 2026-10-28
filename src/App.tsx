import React, { useEffect, useRef, useState } from 'react';
import { User, UserRole, AssessmentTest, JobPosting, Business, SocialState, AppNotification, JobInvitation } from './types';
import { INITIAL_RECRUITER, INITIAL_BUSINESSES } from './data/mockData';
import { loadData, saveData, clearData } from './lib/store';
import { getPercentile } from './lib/leaderboard';
import { initialsAvatar, withComputedPercentiles } from './data/seedCandidates';
import { addTestResult } from './lib/results';
import { simulateAttempt, simulateJobTestStep } from './lib/liveActivity';
import { Navigation, AppTab, NAV_TABS } from './components/Navigation';
import { CandidatePortal, CandidateSection } from './components/CandidatePortal';
import { bestProfileFor } from './lib/jobProfiles';
import { RecruiterPortal, BusinessSection } from './components/RecruiterPortal';
import { BusinessesView } from './components/BusinessesView';
import { TestRunner } from './components/TestRunner';
import { TestPage } from './components/TestPage';
import { DiscoverFeed } from './components/DiscoverFeed';
import { LiveLeaderboards } from './components/LiveLeaderboards';
import { FollowSuggestions } from './components/DiscoverSidebar';
import { TestField } from './lib/testRoles';
import { GlobalSearch } from './components/GlobalSearch';
import { PersonProfileModal } from './components/PersonProfileModal';
import { BusinessJobs } from './components/BusinessJobs';
import { JobTestsEditor } from './components/JobTestsEditor';
import { jobTestProgress, withInvitation } from './lib/jobTests';
import { CandidateHome } from './components/CandidateHome';
import { CheckCircle2 } from 'lucide-react';
import { isJobsIndexPath, jobIdFromPath, jobPageTitle, jobPath } from './lib/jobSeo';

const CANDIDATE_SECTIONS: Partial<Record<AppTab, CandidateSection>> = {
  profile: 'profile',
  jobs: 'jobs',
  tests: 'tests',
};

const BUSINESS_SECTIONS: Partial<Record<AppTab, BusinessSection>> = {
  'business-tests': 'tests',
  'business-candidates': 'candidates',
};

// Vetter's own talent team, who post and fill jobs on companies' behalf
const VETTER_TEAM: User = {
  ...INITIAL_RECRUITER,
  id: 'vetter-team',
  name: 'Vetter Talent Team',
  email: 'talent@vetter.dev',
  role: 'admin',
  avatarUrl: initialsAvatar('Vetter Team'),
  title: 'Talent Partner, Vetter',
  businessId: undefined,
};

const today = () => new Date().toISOString().split('T')[0];

// Test pages live at #/tests/<id> so they can be linked to and the back button works
const idFromHash = (kind: 'tests' | 'jobs' | 'exams') => {
  const match = window.location.hash.match(new RegExp(`^#/${kind}/([^?]+)`));
  return match ? decodeURIComponent(match[1]) : null;
};

// Job pages have real addresses (/jobs/<title>-<company>-<id>/) so search engines can list them. Older #/jobs/<id> links
// still open, and so do links to the assessments jobs used to have (#/exams/<id>), which open their job
const LEGACY_EXAM_JOBS: Record<string, string> = { 'exam-001': 'job-004', 'exam-002': 'job-006', 'exam-003': 'job-005' };
const jobIdFromUrl = () => {
  const examId = idFromHash('exams');
  if (examId) return LEGACY_EXAM_JOBS[examId] ?? examId.replace(/^exam-/, '');
  return jobIdFromPath(window.location.pathname) ?? idFromHash('jobs');
};

const SITE_TITLE = 'Vetter - Skills-Based Hiring';

// A company's link to a test carries ?ref=<business id>, like an affiliate link
const refFromHash = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('ref');

// Home is the tests companies sent you; a company starts on its jobs
const initialTab = (): AppTab =>
  jobIdFromUrl() || isJobsIndexPath(window.location.pathname) ? 'jobs' : idFromHash('tests') ? 'tests' : 'home';

export default function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('candidate');
  const [currentTab, setCurrentTab] = useState<AppTab>(initialTab);

  // Core data: candidates, jobs, tests and companies, loaded from the store and saved on every change
  const [initialData] = useState(loadData);
  const [candidate, setCandidate] = useState<User>(initialData.candidate);
  const [otherCandidates, setOtherCandidates] = useState<User[]>(initialData.otherCandidates);
  const candidateRef = useRef(candidate);
  candidateRef.current = candidate;
  const othersRef = useRef(otherCandidates);
  othersRef.current = otherCandidates;
  const [recruiter] = useState<User>(INITIAL_RECRUITER);
  const [jobs, setJobs] = useState<JobPosting[]>(initialData.jobs);
  const [tests, setTests] = useState<AssessmentTest[]>(initialData.tests);
  const [businesses] = useState<Business[]>(INITIAL_BUSINESSES);
  const [social, setSocial] = useState<SocialState>(initialData.social);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialData.notifications);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  useEffect(() => {
    saveData({ candidate, otherCandidates, jobs, tests, social, notifications });
  }, [candidate, otherCandidates, jobs, tests, social, notifications]);

  // Changes one person's invitation to a job's tests, adding it if they don't have one yet
  const updateInvitation = (jobId: string, candidateId: string, change: Partial<JobInvitation>) =>
    setJobs((prev) => prev.map((j) => (j.id === jobId ? withInvitation(j, candidateId, change, today()) : j)));

  // Other people keep taking tests while the page is open, every few seconds, so scores and ranks shift live,
  // and work through the jobs' tests companies sent them, so companies see results come in
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const recordAttempt = (attempt: { candidateId: string; test: AssessmentTest; result: User['testResults'][number] }) => {
      const updated = othersRef.current.map((c) => (c.id === attempt.candidateId ? addTestResult(c, attempt.test, attempt.result) : c));
      setOtherCandidates(withComputedPercentiles([candidateRef.current, ...updated]).slice(1));
      setCandidate((prev) => withComputedPercentiles([prev, ...updated])[0]);
    };
    const tick = () => {
      if (document.visibilityState === 'visible') {
        const step = Math.random() < 0.5 ? simulateJobTestStep(jobsRef.current, othersRef.current, tests) : null;
        if (step?.kind === 'attempt') recordAttempt(step);
        else if (step) updateInvitation(step.jobId, step.candidateId, { openedAt: new Date().toISOString() });
        else {
          const attempt = simulateAttempt(othersRef.current, tests);
          if (attempt) recordAttempt(attempt);
        }
      }
      timer = setTimeout(tick, 4000 + Math.random() * 6000);
    };
    timer = setTimeout(tick, 3000);
    return () => clearTimeout(timer);
  }, [tests]);

  const [testPageId, setTestPageId] = useState<string | null>(() => idFromHash('tests'));
  const [jobPageId, setJobPageId] = useState<string | null>(jobIdFromUrl);
  const syncPagesFromUrl = () => {
    setTestPageId(idFromHash('tests'));
    setJobPageId(jobIdFromUrl());
  };
  const navigateTo = (url: string) => {
    history.pushState(null, '', url);
    syncPagesFromUrl();
  };
  useEffect(() => {
    window.addEventListener('hashchange', syncPagesFromUrl);
    window.addEventListener('popstate', syncPagesFromUrl);
    return () => {
      window.removeEventListener('hashchange', syncPagesFromUrl);
      window.removeEventListener('popstate', syncPagesFromUrl);
    };
  }, []);

  // A job's page is titled after the job, and an old #/jobs/<id> link moves to the job's real address
  useEffect(() => {
    const job = jobPageId ? jobs.find((j) => j.id === jobPageId) : undefined;
    document.title = job ? jobPageTitle(job) : SITE_TITLE;
    if (job && /^#\/(jobs|exams)\//.test(window.location.hash)) history.replaceState(null, '', jobPath(job));
  }, [jobPageId, jobs]);

  // Following a company's link to a test ties the candidate's results on it back to that company
  useEffect(() => {
    const ref = refFromHash();
    if (!testPageId || !ref || !businesses.some((b) => b.id === ref)) return;
    setCandidate((prev) =>
      prev.testReferrals?.some((r) => r.testId === testPageId && r.businessId === ref)
        ? prev
        : { ...prev, testReferrals: [...(prev.testReferrals ?? []), { testId: testPageId, businessId: ref, at: today() }] }
    );
  }, [testPageId, businesses]);

  // Someone sent a job's tests opening the job: the company sees who opened it and when
  useEffect(() => {
    if (!jobPageId || activeRole !== 'candidate') return;
    const invitation = jobsRef.current.find((j) => j.id === jobPageId)?.invitations.find((i) => i.candidateId === candidateRef.current.id);
    if (invitation && !invitation.openedAt) updateInvitation(jobPageId, candidateRef.current.id, { openedAt: new Date().toISOString() });
  }, [jobPageId, activeRole]);

  // Companies opening a job's link land on that job's results
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  useEffect(() => {
    if (!jobPageId || activeRole === 'candidate') return;
    setSelectedJobId(jobPageId);
    setCurrentTab('business-jobs');
  }, [jobPageId, activeRole]);
  // Choosing a job's tests: the job (or every job, when sending a test from its page) and any tests to add
  const [editingTests, setEditingTests] = useState<{ jobId?: string; addTestIds: string[] } | null>(null);

  // When a candidate takes one of a job's tests from the job, the job they're applying to
  const [activeTestJobId, setActiveTestJobId] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<AssessmentTest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // What the candidate's Tests page is narrowed to, e.g. a field picked on Home
  const [testField, setTestField] = useState<TestField | null>(null);
  // Opened from search
  const [profilePersonId, setProfilePersonId] = useState<string | null>(null);
  const [companiesQuery, setCompaniesQuery] = useState('');

  const recruiterBusiness = businesses.find((b) => b.id === recruiter.businessId)!;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const goToTab = (tab: AppTab) => {
    if (window.location.hash || window.location.pathname !== '/') navigateTo('/' + window.location.search);
    if (tab === 'business-jobs') setSelectedJobId(null);
    setCurrentTab(tab);
  };

  const openTestPage = (testId: string) => {
    setCurrentTab(activeRole === 'candidate' ? 'tests' : 'business-tests');
    navigateTo(`/#/tests/${encodeURIComponent(testId)}`);
    window.scrollTo(0, 0);
  };

  const openJobPage = (jobId: string) => {
    setCurrentTab('jobs');
    const job = jobs.find((j) => j.id === jobId);
    navigateTo(job ? jobPath(job) : `/jobs/${encodeURIComponent(jobId)}/`);
    window.scrollTo(0, 0);
  };

  // Sending a job's tests to people on Vetter emails them at their login address, puts the job on their Home and notifies them
  const handleInviteToJob = (jobId: string, candidateIds: string[]) => {
    const emailOf = (id: string) => allCandidates.find((c) => c.id === id)?.email;
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              invitations: [
                ...j.invitations,
                ...candidateIds.map((candidateId) => ({ candidateId, invitedAt: today(), via: 'invite' as const, emailedTo: emailOf(candidateId) })),
              ],
            }
          : j
      )
    );
    notifyInvited(jobId, candidateIds);
  };

  // Emailing the link: people with a Vetter account are tracked from now, the rest once they sign up
  const handleEmailJob = (jobId: string, emails: string[]) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;
    const already = new Set(job.invitations.map((i) => i.candidateId));
    const withAccounts = allCandidates.filter((c) => emails.includes(c.email.toLowerCase()) && !already.has(c.id)).map((c) => c.id);
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              invitedEmails: [...new Set([...(j.invitedEmails ?? []), ...emails])],
              invitations: [...j.invitations, ...withAccounts.map((candidateId) => ({ candidateId, invitedAt: today(), via: 'email' as const }))],
            }
          : j
      )
    );
    notifyInvited(jobId, withAccounts);
  };

  const notifyInvited = (jobId: string, candidateIds: string[]) => {
    const now = new Date();
    setNotifications((prev) => [
      ...candidateIds.map((userId, i) => ({
        id: `note-${now.getTime()}-${i}`,
        userId,
        kind: 'job-invite' as const,
        jobId,
        createdAt: now.toISOString(),
        read: false,
      })),
      ...prev,
    ]);
  };

  const openNotification = (id: string) => {
    const note = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (note) openJobPage(note.jobId);
  };

  // A company from search: the Companies page, filtered to it
  const openCompany = (businessId: string) => {
    setCompaniesQuery(businesses.find((b) => b.id === businessId)?.name ?? '');
    goToTab('companies');
    window.scrollTo(0, 0);
  };

  const toggleFollow = (id: string) =>
    setSocial((prev) => ({
      ...prev,
      following: prev.following.includes(id) ? prev.following.filter((f) => f !== id) : [...prev.following, id],
    }));

  // Switch between the candidate, business and Vetter team views
  const handleRoleChange = (nextRole: UserRole) => {
    setActiveRole(nextRole);
    goToTab(NAV_TABS[nextRole === 'candidate' ? 'candidate' : 'recruiter'][0].id);
  };
  // The business and Vetter team views share the same pages
  const staffUser = activeRole === 'admin' ? VETTER_TEAM : recruiter;

  const handleResetData = () => {
    clearData();
    window.location.reload();
  };

  // When candidate applies for a job
  // Sent with one of their job profiles: by default the one that best covers the job
  const handleApplyJob = (jobId: string, profileId?: string) => {
    if (candidate.appliedJobIds?.includes(jobId)) return;
    const job = jobs.find((j) => j.id === jobId);
    const sentWith = profileId ?? (job ? bestProfileFor(candidate, job).id : undefined);

    setCandidate((prev) => ({
      ...prev,
      appliedJobIds: [...(prev.appliedJobIds || []), jobId],
      applicationProfiles: sentWith ? { ...prev.applicationProfiles, [jobId]: sentWith } : prev.applicationProfiles,
    }));

    // Increment job applicants count
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, applicantCount: j.applicantCount + 1 } : j))
    );
  };

  // Complete a test in the runner
  const handleCompleteTest = (testId: string, finalScore: number, durationSeconds: number) => {
    const completedTest = tests.find((t) => t.id === testId);
    if (!completedTest) return;

    // Taken for a job, or from a company's link to the test: that company gets the result
    const job = activeTestJobId ? jobs.find((j) => j.id === activeTestJobId) : undefined;
    const referredBy = job?.businessId ?? candidate.testReferrals?.filter((r) => r.testId === testId).at(-1)?.businessId;
    const updatedCandidate = addTestResult(candidate, completedTest, {
      testId,
      score: finalScore,
      completedAt: today(),
      completedTime: new Date().toISOString(),
      durationSeconds,
      referredBy,
    });

    // A new score shifts everyone's standing on this test
    const everyone = withComputedPercentiles([updatedCandidate, ...otherCandidates]);
    setCandidate(everyone[0]);
    setOtherCandidates(everyone.slice(1));

    // Taken for a job: once every one of its tests is done, a pass sends the application (when the tests are required to apply)
    if (job) {
      const progress = jobTestProgress(job, updatedCandidate);
      const applied = candidate.appliedJobIds?.includes(job.id);
      if (progress.status === 'passed' && job.testsRequired && !applied) {
        handleApplyJob(job.id);
        showToast(`You passed ${job.title}'s tests with ${progress.score}/100. Your application to ${job.companyName} has been sent.`);
      } else if (progress.status === 'passed') {
        showToast(`You passed ${job.title}'s tests with ${progress.score}/100.`);
      } else if (progress.status === 'failed') {
        showToast(`You averaged ${progress.score}/100. ${job.title} needs ${job.testPassingScore}. You can retake a test.`);
      } else {
        showToast(`You scored ${finalScore}/100. ${progress.done} of ${progress.total} of ${job.title}'s tests done.`);
      }
      // Started from the job's own page: stay there
      if (!jobPageId) goToTab('jobs');
    } else if (!testPageId) {
      // Started from a test page: stay there so the candidate sees where they now rank
      goToTab(completedTest.type === 'standard' ? 'profile' : 'jobs');
    }

    setActiveTestJobId(null);
    setActiveTest(null);
  };

  // A candidate starting one of a job's tests from the job: the company sees them on the job from now
  const startJobTest = (test: AssessmentTest, jobId: string) => {
    const invitation = jobs.find((j) => j.id === jobId)?.invitations.find((i) => i.candidateId === candidate.id);
    if (!invitation?.startedAt) updateInvitation(jobId, candidate.id, { startedAt: new Date().toISOString() });
    setActiveTest(test);
    setActiveTestJobId(jobId);
  };

  const handleCreateJob = (newJob: JobPosting) => {
    setJobs((prev) => [newJob, ...prev]);
  };

  const handleSaveJobTests = (jobId: string, change: Pick<JobPosting, 'testIds' | 'testPassingScore' | 'testsRequired'>) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...change } : j)));
  };

  const handleUpdateJobRequirements = (jobId: string, requirements: JobPosting['requirements']) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, requirements } : j)));
  };

  const handleCreateTest = (newTest: AssessmentTest) => {
    setTests((prev) => [newTest, ...prev]);
  };

  const allCandidates = [candidate, ...otherCandidates];
  const testPageTest = testPageId ? tests.find((t) => t.id === testPageId) : undefined;
  // A test page replaces the tab's own content
  const detailPage = testPageTest;
  const candidateNotifications = notifications
    .filter((n) => n.userId === candidate.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((n) => {
      const job = jobs.find((j) => j.id === n.jobId);
      if (!job) return [];
      return [
        {
          id: n.id,
          text: `${job.companyName} invited you to take the tests for ${job.title}`,
          detail: `${job.testIds.length} ${job.testIds.length === 1 ? 'test' : 'tests'}${job.closingDate ? ` · closes ${new Date(job.closingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`,
          when: new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          read: n.read,
        },
      ];
    });
  const candidateSection = CANDIDATE_SECTIONS[currentTab];
  const profilePerson = profilePersonId ? allCandidates.find((c) => c.id === profilePersonId) : undefined;
  const businessSection = BUSINESS_SECTIONS[currentTab];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCompaniesQuery('');
          goToTab(tab);
        }}
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        userAvatar={activeRole === 'candidate' ? candidate.avatarUrl : staffUser.avatarUrl}
        userName={activeRole === 'candidate' ? candidate.name : staffUser.name}
        userTitle={
          activeRole === 'candidate'
            ? candidate.title
            : activeRole === 'admin'
            ? staffUser.title
            : `${recruiter.title} · ${recruiterBusiness.name}`
        }
        notifications={activeRole === 'candidate' ? candidateNotifications : undefined}
        onOpenNotification={openNotification}
        renderSearch={(mobile) => (
          <GlobalSearch
            people={allCandidates}
            tests={tests}
            // Companies are hidden for now, so search leaves them out
            businesses={[]}
            onOpenPerson={setProfilePersonId}
            onOpenTest={openTestPage}
            onOpenCompany={openCompany}
            onClose={mobile?.onClose}
            autoFocus={!!mobile}
          />
        )}
      />

      <div className="flex-1 min-w-0 flex flex-col pb-14 md:pb-0">
        <main className="flex-1 pb-16 bg-white">
          {testPageTest && (
            <TestPage
              test={testPageTest}
              tests={tests}
              candidates={allCandidates}
              jobs={jobs}
              viewerRole={activeRole}
              currentCandidateId={activeRole === 'candidate' ? candidate.id : undefined}
              referredByCompany={
                activeRole === 'candidate'
                  ? businesses.find((b) => b.id === candidate.testReferrals?.filter((r) => r.testId === testPageTest.id).at(-1)?.businessId)
                  : undefined
              }
              onSend={activeRole === 'candidate' ? undefined : () => setEditingTests({ addTestIds: [testPageTest.id] })}
              onStartTest={(test) => setActiveTest(test)}
              onOpenJob={activeRole === 'candidate' ? openJobPage : undefined}
              onOpenTest={openTestPage}
              onBack={() => goToTab(activeRole === 'candidate' ? 'tests' : 'business-tests')}
            />
          )}

          {!detailPage && activeRole === 'candidate' && candidateSection && (
            <CandidatePortal
              section={candidateSection}
              onNavigate={(section) => goToTab(section)}
              candidate={candidate}
              allCandidates={allCandidates}
              onOpenTest={openTestPage}
              tests={tests}
              jobs={jobs}
              businesses={businesses}
              onStartTest={(test) => setActiveTest(test)}
              onStartJobTest={startJobTest}
              onApplyJob={handleApplyJob}
              onUpdateProfiles={(jobProfiles, activeProfileId) =>
                setCandidate((prev) => ({ ...prev, jobProfiles, activeProfileId }))
              }
              onUpdateStudies={(studies) => setCandidate((prev) => ({ ...prev, ...studies }))}
              jobPageId={jobPageId}
              onOpenJob={openJobPage}
              testField={testField}
              onTestFieldChange={setTestField}
            />
          )}

          {/* Home in three columns: what companies sent you, Discover in the widest middle, and live leaderboards with
              people and companies to follow on the right. Stacked on smaller screens, with the right column above the feed */}
          {!detailPage && activeRole === 'candidate' && currentTab === 'home' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,280px)] gap-6 items-start">
              <CandidateHome
                candidate={candidate}
                jobs={jobs}
                tests={tests}
                businesses={businesses}
                onOpenJob={openJobPage}
                onStartTest={(test) => setActiveTest(test)}
                onOpenTest={openTestPage}
                onGoTo={goToTab}
              />
              <div className="space-y-4 lg:col-start-3 lg:row-start-1">
                <LiveLeaderboards tests={tests} allCandidates={allCandidates} viewerId={candidate.id} onOpenTest={openTestPage} />
                <FollowSuggestions
                  viewer={candidate}
                  allCandidates={allCandidates}
                  businesses={businesses}
                  following={social.following}
                  onToggleFollow={toggleFollow}
                />
              </div>
              <DiscoverFeed
                candidate={candidate}
                allCandidates={allCandidates}
                tests={tests}
                jobs={jobs}
                businesses={businesses}
                social={social}
                onSocialChange={setSocial}
                onOpenTest={openTestPage}
                onOpenJob={openJobPage}
                onOpenField={(field) => {
                  setTestField(field);
                  goToTab('tests');
                  window.scrollTo(0, 0);
                }}
              />
            </div>
          )}

          {!detailPage && currentTab === 'companies' && (
            <BusinessesView
              key={companiesQuery}
              businesses={businesses}
              jobs={jobs}
              tests={tests}
              onSelectJob={activeRole === 'candidate' ? openJobPage : undefined}
              initialQuery={companiesQuery}
            />
          )}

          {!detailPage && activeRole !== 'candidate' && currentTab === 'business-jobs' && (
            <BusinessJobs
              key={activeRole}
              business={activeRole === 'admin' ? undefined : recruiterBusiness}
              businesses={businesses}
              jobs={jobs}
              tests={tests}
              candidates={allCandidates}
              selectedJobId={selectedJobId}
              onSelect={(id) => {
                setSelectedJobId(id);
                window.scrollTo(0, 0);
              }}
              onCreateJob={handleCreateJob}
              onEditTests={(jobId) => setEditingTests({ jobId, addTestIds: [] })}
              onUpdateJobRequirements={handleUpdateJobRequirements}
              onEmail={handleEmailJob}
              onInvite={handleInviteToJob}
              onOpenPerson={setProfilePersonId}
              onOpenTest={openTestPage}
            />
          )}

          {!detailPage && activeRole !== 'candidate' && businessSection && (
            <RecruiterPortal
              key={activeRole}
              section={businessSection}
              onOpenTest={openTestPage}
              recruiter={staffUser}
              business={activeRole === 'admin' ? undefined : recruiterBusiness}
              businesses={businesses}
              jobs={jobs}
              allCandidates={allCandidates}
              tests={tests}
              onCreateTest={handleCreateTest}
            />
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6 px-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight">VETTER</span>
            <span>&middot; Skills-based hiring</span>
            <button onClick={handleResetData} className="ml-auto text-slate-400 hover:text-slate-700 transition-colors">
              Reset demo data
            </button>
          </div>
        </footer>
      </div>

      {editingTests && (
        <JobTestsEditor
          jobs={jobs.filter((j) =>
            editingTests.jobId ? j.id === editingTests.jobId : activeRole === 'admin' || j.businessId === recruiterBusiness.id
          )}
          tests={tests}
          addTestIds={editingTests.addTestIds}
          onSave={(jobId, change) => {
            handleSaveJobTests(jobId, change);
            setEditingTests(null);
            goToTab('business-jobs');
            setSelectedJobId(jobId);
            window.scrollTo(0, 0);
          }}
          onCancel={() => setEditingTests(null)}
        />
      )}

      {activeTest && (
        <TestRunner
          test={activeTest}
          onClose={() => {
            setActiveTest(null);
            setActiveTestJobId(null);
          }}
          onComplete={handleCompleteTest}
          getPercentileFor={(score) => getPercentile(score, activeTest.id, allCandidates, candidate.id)}
        />
      )}

      {profilePerson && (
        <PersonProfileModal
          person={profilePerson}
          isYou={activeRole === 'candidate' && profilePerson.id === candidate.id}
          isFollowing={social.following.includes(profilePerson.id)}
          onToggleFollow={activeRole === 'candidate' ? () => toggleFollow(profilePerson.id) : undefined}
          onClose={() => setProfilePersonId(null)}
          tests={tests}
          candidates={allCandidates}
          businesses={businesses}
          companyResultsFor={
            activeRole === 'admin' || (activeRole === 'candidate' && profilePerson.id === candidate.id)
              ? 'all'
              : activeRole === 'recruiter'
              ? recruiterBusiness.id
              : null
          }
          onOpenTest={openTestPage}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 p-4 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl flex items-center gap-3 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="text-xs font-medium">{toast}</div>
        </div>
      )}
    </div>
  );
}
