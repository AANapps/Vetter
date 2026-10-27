import React, { useEffect, useRef, useState } from 'react';
import { User, UserRole, AssessmentTest, JobPosting, Business, SocialState, Exam, AppNotification } from './types';
import { INITIAL_RECRUITER, INITIAL_BUSINESSES } from './data/mockData';
import { loadData, saveData, clearData } from './lib/store';
import { getPercentile } from './lib/leaderboard';
import { initialsAvatar, withComputedPercentiles } from './data/seedCandidates';
import { addTestResult } from './lib/results';
import { simulateAttempt, simulateExamStep } from './lib/liveActivity';
import { Navigation, AppTab, NAV_TABS } from './components/Navigation';
import { CandidatePortal, CandidateSection } from './components/CandidatePortal';
import { bestProfileFor } from './lib/jobProfiles';
import { RecruiterPortal, BusinessSection } from './components/RecruiterPortal';
import { BusinessesView } from './components/BusinessesView';
import { AssessmentRunner } from './components/AssessmentRunner';
import { TestPage } from './components/TestPage';
import { DiscoverFeed } from './components/DiscoverFeed';
import { GlobalSearch } from './components/GlobalSearch';
import { PersonProfileModal } from './components/PersonProfileModal';
import { ExamPage } from './components/ExamPage';
import { Assessments } from './components/Assessments';
import { CreateAssessment } from './components/CreateAssessment';
import { CandidateHome } from './components/CandidateHome';
import { CheckCircle2 } from 'lucide-react';

const CANDIDATE_SECTIONS: Partial<Record<AppTab, CandidateSection>> = {
  profile: 'profile',
  jobs: 'jobs',
  tests: 'tests',
};

const BUSINESS_SECTIONS: Partial<Record<AppTab, BusinessSection>> = {
  'business-jobs': 'jobs',
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

// Test, job and exam pages live at #/tests/<id>, #/jobs/<id> and #/exams/<id> so they can be linked to and the back button works
const idFromHash = (kind: 'tests' | 'jobs' | 'exams') => {
  const match = window.location.hash.match(new RegExp(`^#/${kind}/([^?]+)`));
  return match ? decodeURIComponent(match[1]) : null;
};

// A company's link to a test carries ?ref=<business id>, like an affiliate link
const refFromHash = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('ref');

// Home is the assessments companies sent you; a company's home is the assessments it has sent
const initialTab = (): AppTab => (idFromHash('jobs') ? 'jobs' : idFromHash('tests') ? 'tests' : 'home');

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
  const [exams, setExams] = useState<Exam[]>(initialData.exams);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialData.notifications);
  const examsRef = useRef(exams);
  examsRef.current = exams;

  useEffect(() => {
    saveData({ candidate, otherCandidates, jobs, tests, social, exams, notifications });
  }, [candidate, otherCandidates, jobs, tests, social, exams, notifications]);

  // Changes one person's invitation to an assessment, adding it if they don't have one yet
  const updateInvitation = (examId: string, candidateId: string, change: Partial<Exam['invitations'][number]>) =>
    setExams((prev) =>
      prev.map((e) => {
        if (e.id !== examId) return e;
        const existing = e.invitations.find((i) => i.candidateId === candidateId);
        return {
          ...e,
          invitations: existing
            ? e.invitations.map((i) => (i.candidateId === candidateId ? { ...i, ...change } : i))
            : [...e.invitations, { candidateId, invitedAt: today(), via: 'link' as const, ...change }],
        };
      })
    );

  // Other people keep taking tests while the page is open, every few seconds, so scores and ranks shift live,
  // and work through the assessments companies sent them, so companies see results come in
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const recordAttempt = (attempt: { candidateId: string; test: AssessmentTest; result: User['testResults'][number] }) => {
      const updated = othersRef.current.map((c) => (c.id === attempt.candidateId ? addTestResult(c, attempt.test, attempt.result) : c));
      setOtherCandidates(withComputedPercentiles([candidateRef.current, ...updated]).slice(1));
      setCandidate((prev) => withComputedPercentiles([prev, ...updated])[0]);
    };
    const tick = () => {
      if (document.visibilityState === 'visible') {
        const step = Math.random() < 0.5 ? simulateExamStep(examsRef.current, othersRef.current, tests) : null;
        if (step?.kind === 'attempt') recordAttempt(step);
        else if (step) updateInvitation(step.examId, step.candidateId, { openedAt: new Date().toISOString() });
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
  const [jobPageId, setJobPageId] = useState<string | null>(() => idFromHash('jobs'));
  const [examPageId, setExamPageId] = useState<string | null>(() => idFromHash('exams'));
  useEffect(() => {
    const onHashChange = () => {
      setTestPageId(idFromHash('tests'));
      setJobPageId(idFromHash('jobs'));
      setExamPageId(idFromHash('exams'));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

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

  // Opening an assessment link joins it, so the company sees who opened it and when
  useEffect(() => {
    if (!examPageId || activeRole !== 'candidate') return;
    const exam = examsRef.current.find((e) => e.id === examPageId);
    if (!exam) return;
    const invitation = exam.invitations.find((i) => i.candidateId === candidateRef.current.id);
    if (!invitation || !invitation.openedAt) updateInvitation(examPageId, candidateRef.current.id, { openedAt: new Date().toISOString() });
  }, [examPageId, activeRole]);

  // Companies opening an assessment link land on its results
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  useEffect(() => {
    if (!examPageId || activeRole === 'candidate') return;
    setSelectedAssessmentId(examPageId);
    setCurrentTab('business-assessments');
  }, [examPageId, activeRole]);
  // The new-assessment flow, with any tests already picked
  const [newAssessment, setNewAssessment] = useState<{ testIds: string[] } | null>(null);

  // When a candidate takes a job's attached test, the job they're applying to
  const [activeTestJobId, setActiveTestJobId] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<AssessmentTest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Opened from search
  const [profilePersonId, setProfilePersonId] = useState<string | null>(null);
  const [companiesQuery, setCompaniesQuery] = useState('');
  // The assessment a test was started from, which gets the result
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  const recruiterBusiness = businesses.find((b) => b.id === recruiter.businessId)!;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  const goToTab = (tab: AppTab) => {
    if (window.location.hash) {
      history.pushState(null, '', window.location.pathname + window.location.search);
      setTestPageId(null);
      setJobPageId(null);
      setExamPageId(null);
    }
    if (tab === 'business-assessments') setSelectedAssessmentId(null);
    setCurrentTab(tab);
  };

  const openTestPage = (testId: string) => {
    setCurrentTab(activeRole === 'candidate' ? 'tests' : 'business-tests');
    window.location.hash = `/tests/${encodeURIComponent(testId)}`;
    window.scrollTo(0, 0);
  };

  const openJobPage = (jobId: string) => {
    setCurrentTab('jobs');
    window.location.hash = `/jobs/${encodeURIComponent(jobId)}`;
    window.scrollTo(0, 0);
  };

  const openExamPage = (examId: string) => {
    setCurrentTab('home');
    window.location.hash = `/exams/${encodeURIComponent(examId)}`;
    window.scrollTo(0, 0);
  };

  // Inviting candidates to an exam emails it to their login address, puts it on their Home and notifies them
  const handleInviteToExam = (examId: string, candidateIds: string[]) => {
    const emailOf = (id: string) => allCandidates.find((c) => c.id === id)?.email;
    setExams((prev) =>
      prev.map((e) =>
        e.id === examId
          ? {
              ...e,
              invitations: [
                ...e.invitations,
                ...candidateIds.map((candidateId) => ({ candidateId, invitedAt: today(), via: 'invite' as const, emailedTo: emailOf(candidateId) })),
              ],
            }
          : e
      )
    );
    notifyInvited(examId, candidateIds);
  };

  // Emailing the link: people with a Vetter account are tracked from now, the rest once they sign up
  const handleEmailExam = (examId: string, emails: string[]) => {
    const exam = exams.find((e) => e.id === examId);
    if (!exam) return;
    const already = new Set(exam.invitations.map((i) => i.candidateId));
    const withAccounts = allCandidates.filter((c) => emails.includes(c.email.toLowerCase()) && !already.has(c.id)).map((c) => c.id);
    setExams((prev) =>
      prev.map((e) =>
        e.id === examId
          ? {
              ...e,
              invitedEmails: [...new Set([...(e.invitedEmails ?? []), ...emails])],
              invitations: [...e.invitations, ...withAccounts.map((candidateId) => ({ candidateId, invitedAt: today(), via: 'email' as const }))],
            }
          : e
      )
    );
    notifyInvited(examId, withAccounts);
  };

  const notifyInvited = (examId: string, candidateIds: string[]) => {
    const now = new Date();
    setNotifications((prev) => [
      ...candidateIds.map((userId, i) => ({
        id: `note-${now.getTime()}-${i}`,
        userId,
        kind: 'exam-invite' as const,
        examId,
        createdAt: now.toISOString(),
        read: false,
      })),
      ...prev,
    ]);
  };

  const openNotification = (id: string) => {
    const note = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (note) openExamPage(note.examId);
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
  const handleCompleteAssessment = (testId: string, finalScore: number, durationSeconds: number) => {
    const completedTest = tests.find((t) => t.id === testId);
    if (!completedTest) return;

    // Taken from an assessment, or a company's link to the test: that company gets the result
    const fromExam = activeExamId ? exams.find((e) => e.id === activeExamId) : undefined;
    const referredBy = fromExam?.businessId ?? candidate.testReferrals?.filter((r) => r.testId === testId).at(-1)?.businessId;
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

    // If the test was taken to apply for a job, submit the application when the candidate passes
    const job = activeTestJobId ? jobs.find((j) => j.id === activeTestJobId) : undefined;
    if (job) {
      const passMark = job.attachedTestPassingScore || completedTest.passingScore;
      if (finalScore >= passMark) {
        handleApplyJob(job.id);
        showToast(`You passed with ${finalScore}/100. Your application to ${job.companyName} has been sent.`);
      } else {
        showToast(`You scored ${finalScore}/100. ${job.title} needs ${passMark} to apply. You can retake the test.`);
      }
      // Started from the job's own page: stay there
      if (!jobPageId) goToTab('jobs');
    } else if (!testPageId && !examPageId) {
      // Started from a test page: stay there so the candidate sees where they now rank
      goToTab(completedTest.type === 'standard' ? 'profile' : 'jobs');
    }

    setActiveTestJobId(null);
    setActiveExamId(null);
    setActiveTest(null);
  };

  const handleCreateJob = (newJob: JobPosting) => {
    setJobs((prev) => [newJob, ...prev]);
  };

  const handleUpdateJobRequirements = (jobId: string, requirements: JobPosting['requirements']) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, requirements } : j)));
  };

  const handleCreateCustomAssessment = (newTest: AssessmentTest) => {
    setTests((prev) => [newTest, ...prev]);
  };

  const allCandidates = [candidate, ...otherCandidates];
  const testPageTest = testPageId ? tests.find((t) => t.id === testPageId) : undefined;
  const examPageExam = examPageId && activeRole === 'candidate' ? exams.find((e) => e.id === examPageId) : undefined;
  // A test or exam page replaces the tab's own content
  const detailPage = testPageTest || examPageExam;
  const candidateNotifications = notifications
    .filter((n) => n.userId === candidate.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((n) => {
      const exam = exams.find((e) => e.id === n.examId);
      if (!exam) return [];
      return [
        {
          id: n.id,
          text: `${exam.companyName} invited you to take ${exam.title}`,
          detail: `${exam.testIds.length} tests${exam.dueDate ? ` · due ${new Date(exam.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}`,
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
          {examPageExam && (
            <ExamPage
              exam={examPageExam}
              business={businesses.find((b) => b.id === examPageExam.businessId)}
              tests={tests}
              candidate={candidate}
              onStartTest={(test) => {
                const invitation = examPageExam.invitations.find((i) => i.candidateId === candidate.id);
                if (!invitation?.startedAt) updateInvitation(examPageExam.id, candidate.id, { startedAt: new Date().toISOString() });
                setActiveExamId(examPageExam.id);
                setActiveTest(test);
              }}
              onOpenTest={openTestPage}
              onBack={() => goToTab('home')}
            />
          )}

          {!examPageExam && testPageTest && (
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
              onSend={activeRole === 'candidate' ? undefined : () => setNewAssessment({ testIds: [testPageTest.id] })}
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
              onStartAttachedTest={(test, forJobId) => {
                setActiveTest(test);
                setActiveTestJobId(forJobId);
              }}
              onApplyJob={handleApplyJob}
              onUpdateProfiles={(jobProfiles, activeProfileId) =>
                setCandidate((prev) => ({ ...prev, jobProfiles, activeProfileId }))
              }
              onUpdateStudies={(studies) => setCandidate((prev) => ({ ...prev, ...studies }))}
              jobPageId={jobPageId}
              onOpenJob={openJobPage}
              exams={exams}
              onOpenExam={openExamPage}
            />
          )}

          {!detailPage && activeRole === 'candidate' && currentTab === 'home' && (
            <CandidateHome
              candidate={candidate}
              exams={exams}
              tests={tests}
              businesses={businesses}
              onOpenExam={openExamPage}
              onStartTest={(test) => setActiveTest(test)}
              onOpenTest={openTestPage}
              onGoTo={goToTab}
            />
          )}

          {!detailPage && activeRole === 'candidate' && currentTab === 'discover' && (
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
            />
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

          {!detailPage && activeRole !== 'candidate' && currentTab === 'business-assessments' && (
            <Assessments
              business={activeRole === 'admin' ? undefined : recruiterBusiness}
              exams={exams}
              tests={tests}
              candidates={allCandidates}
              selectedId={selectedAssessmentId}
              onSelect={(id) => {
                setSelectedAssessmentId(id);
                window.scrollTo(0, 0);
              }}
              onNew={() => setNewAssessment({ testIds: [] })}
              onEmail={handleEmailExam}
              onInvite={handleInviteToExam}
              onOpenPerson={setProfilePersonId}
              onOpenTest={openTestPage}
            />
          )}

          {!detailPage && activeRole !== 'candidate' && businessSection && (
            <RecruiterPortal
              key={activeRole}
              section={businessSection}
              onNavigate={(section) => goToTab(`business-${section}`)}
              onOpenTest={openTestPage}
              recruiter={staffUser}
              business={activeRole === 'admin' ? undefined : recruiterBusiness}
              businesses={businesses}
              jobs={jobs}
              allCandidates={allCandidates}
              tests={tests}
              onCreateJob={handleCreateJob}
              onUpdateJobRequirements={handleUpdateJobRequirements}
              onCreateCustomAssessment={handleCreateCustomAssessment}
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

      {newAssessment && (
        <CreateAssessment
          businesses={activeRole === 'admin' ? businesses : [recruiterBusiness]}
          createdBy={activeRole === 'admin' ? 'vetter' : 'company'}
          tests={tests}
          initialTestIds={newAssessment.testIds}
          onCreate={(exam) => {
            setExams((prev) => [exam, ...prev]);
            setNewAssessment(null);
            goToTab('business-assessments');
            setSelectedAssessmentId(exam.id);
            window.scrollTo(0, 0);
          }}
          onCancel={() => setNewAssessment(null)}
        />
      )}

      {activeTest && (
        <AssessmentRunner
          test={activeTest}
          onClose={() => {
            setActiveTest(null);
            setActiveTestJobId(null);
            setActiveExamId(null);
          }}
          onComplete={handleCompleteAssessment}
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
