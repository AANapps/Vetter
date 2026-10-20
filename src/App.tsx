import React, { useEffect, useState } from 'react';
import { User, UserRole, AssessmentTest, JobPosting, VerifiedSkill, Business, SocialState } from './types';
import { INITIAL_RECRUITER, INITIAL_BUSINESSES } from './data/mockData';
import { loadData, saveData, clearData } from './lib/store';
import { getPercentile } from './lib/leaderboard';
import { levelForScore, withComputedPercentiles } from './data/seedCandidates';
import { Navigation, AppTab, NAV_TABS } from './components/Navigation';
import { CandidatePortal, CandidateSection } from './components/CandidatePortal';
import { RecruiterPortal, BusinessSection } from './components/RecruiterPortal';
import { BusinessesView } from './components/BusinessesView';
import { AssessmentRunner } from './components/AssessmentRunner';
import { TestPage } from './components/TestPage';
import { DiscoverFeed } from './components/DiscoverFeed';
import { GlobalSearch } from './components/GlobalSearch';
import { PersonProfileModal } from './components/PersonProfileModal';
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

const today = () => new Date().toISOString().split('T')[0];

// Test and job pages live at #/tests/<id> and #/jobs/<id> so they can be linked to and the back button works
const idFromHash = (kind: 'tests' | 'jobs') => {
  const match = window.location.hash.match(new RegExp(`^#/${kind}/(.+)$`));
  return match ? decodeURIComponent(match[1]) : null;
};

const initialTab = (): AppTab => (idFromHash('jobs') ? 'jobs' : idFromHash('tests') ? 'tests' : 'profile');

export default function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('candidate');
  const [currentTab, setCurrentTab] = useState<AppTab>(initialTab);

  // Core data: candidates, jobs, tests and companies, loaded from the store and saved on every change
  const [initialData] = useState(loadData);
  const [candidate, setCandidate] = useState<User>(initialData.candidate);
  const [otherCandidates, setOtherCandidates] = useState<User[]>(initialData.otherCandidates);
  const [recruiter] = useState<User>(INITIAL_RECRUITER);
  const [jobs, setJobs] = useState<JobPosting[]>(initialData.jobs);
  const [tests, setTests] = useState<AssessmentTest[]>(initialData.tests);
  const [businesses] = useState<Business[]>(INITIAL_BUSINESSES);
  const [social, setSocial] = useState<SocialState>(initialData.social);

  useEffect(() => {
    saveData({ candidate, otherCandidates, jobs, tests, social });
  }, [candidate, otherCandidates, jobs, tests, social]);

  const [testPageId, setTestPageId] = useState<string | null>(() => idFromHash('tests'));
  const [jobPageId, setJobPageId] = useState<string | null>(() => idFromHash('jobs'));
  useEffect(() => {
    const onHashChange = () => {
      setTestPageId(idFromHash('tests'));
      setJobPageId(idFromHash('jobs'));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // When a candidate takes a job's attached test, the job they're applying to
  const [activeTestJobId, setActiveTestJobId] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<AssessmentTest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Opened from search
  const [profilePersonId, setProfilePersonId] = useState<string | null>(null);
  const [companiesQuery, setCompaniesQuery] = useState('');

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
    }
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

  // Switch between Candidate & Business views
  const handleRoleToggle = () => {
    const nextRole: UserRole = activeRole === 'candidate' ? 'recruiter' : 'candidate';
    setActiveRole(nextRole);
    goToTab(NAV_TABS[nextRole === 'candidate' ? 'candidate' : 'recruiter'][0].id);
  };

  const handleResetData = () => {
    clearData();
    window.location.reload();
  };

  // When candidate applies for a job
  const handleApplyJob = (jobId: string) => {
    if (candidate.appliedJobIds?.includes(jobId)) return;

    setCandidate((prev) => ({
      ...prev,
      appliedJobIds: [...(prev.appliedJobIds || []), jobId],
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

    const testResults = [...candidate.testResults, { testId, score: finalScore, completedAt: today(), durationSeconds }];
    let updatedCandidate: User = { ...candidate, testResults };

    // Only Vetter-made tests become verified skills; company tests are scored for their own jobs
    if (completedTest.type === 'standard') {
      const bestScore = Math.max(...testResults.filter((r) => r.testId === testId).map((r) => r.score));
      const skillName = completedTest.skillsTested[0] || completedTest.title;
      const historyEntry = { date: today(), score: finalScore, testName: completedTest.title };
      const existingSkillIndex = candidate.verifiedSkills.findIndex(
        (s) => s.testId === testId || s.skillName === skillName
      );

      let updatedSkills: VerifiedSkill[];
      if (existingSkillIndex >= 0) {
        updatedSkills = [...candidate.verifiedSkills];
        const existing = updatedSkills[existingSkillIndex];
        const skillBest = Math.max(existing.score, bestScore);
        updatedSkills[existingSkillIndex] = {
          ...existing,
          testId,
          score: skillBest,
          verifiedAt: skillBest > existing.score ? today() : existing.verifiedAt,
          level: levelForScore(skillBest),
          history: [...existing.history, historyEntry],
        };
      } else {
        updatedSkills = [
          ...candidate.verifiedSkills,
          {
            skillId: `skill-${Date.now()}`,
            skillName,
            category: completedTest.category,
            score: bestScore,
            percentile: 0,
            verifiedAt: today(),
            testId,
            level: levelForScore(bestScore),
            history: [historyEntry],
          },
        ];
      }
      updatedCandidate = { ...updatedCandidate, verifiedSkills: updatedSkills };
    }

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
    } else if (!testPageId) {
      // Started from a test page: stay there so the candidate sees where they now rank
      goToTab(completedTest.type === 'standard' ? 'profile' : 'jobs');
    }

    setActiveTestJobId(null);
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
        onRoleToggle={handleRoleToggle}
        userAvatar={activeRole === 'candidate' ? candidate.avatarUrl : recruiter.avatarUrl}
        userName={activeRole === 'candidate' ? candidate.name : recruiter.name}
        userTitle={activeRole === 'candidate' ? candidate.title : `${recruiter.title} · ${recruiterBusiness.name}`}
        renderSearch={(mobile) => (
          <GlobalSearch
            people={allCandidates}
            tests={tests}
            businesses={businesses}
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
              candidates={allCandidates}
              jobs={jobs}
              viewerRole={activeRole}
              currentCandidateId={activeRole === 'candidate' ? candidate.id : undefined}
              onStartTest={(test) => setActiveTest(test)}
              onOpenJob={activeRole === 'candidate' ? openJobPage : undefined}
              onBack={() => goToTab(activeRole === 'candidate' ? 'tests' : 'business-tests')}
            />
          )}

          {!testPageTest && activeRole === 'candidate' && candidateSection && (
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
              jobPageId={jobPageId}
              onOpenJob={openJobPage}
              following={social.following}
              onToggleFollow={toggleFollow}
            />
          )}

          {!testPageTest && activeRole === 'candidate' && currentTab === 'discover' && (
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

          {!testPageTest && currentTab === 'companies' && (
            <BusinessesView
              key={companiesQuery}
              businesses={businesses}
              jobs={jobs}
              tests={tests}
              onSelectJob={activeRole === 'candidate' ? openJobPage : undefined}
              initialQuery={companiesQuery}
            />
          )}

          {!testPageTest && activeRole === 'recruiter' && businessSection && (
            <RecruiterPortal
              section={businessSection}
              onNavigate={(section) => goToTab(`business-${section}`)}
              onOpenTest={openTestPage}
              recruiter={recruiter}
              business={recruiterBusiness}
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

      {activeTest && (
        <AssessmentRunner
          test={activeTest}
          onClose={() => {
            setActiveTest(null);
            setActiveTestJobId(null);
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
