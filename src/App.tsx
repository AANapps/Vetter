import React, { useState } from 'react';
import { User, UserRole, AssessmentTest, JobPosting, VerifiedSkill, Business } from './types';
import {
  INITIAL_CANDIDATE,
  OTHER_CANDIDATES,
  INITIAL_RECRUITER,
  STANDARD_ASSESSMENTS,
  COMPANY_ASSESSMENTS,
  INITIAL_JOBS,
  INITIAL_BUSINESSES,
} from './data/mockData';
import { Navigation, AppTab, NAV_TABS } from './components/Navigation';
import { CandidatePortal, CandidateSection } from './components/CandidatePortal';
import { RecruiterPortal, BusinessSection } from './components/RecruiterPortal';
import { BusinessesView } from './components/BusinessesView';
import { AssessmentRunner } from './components/AssessmentRunner';
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

export default function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('candidate');
  const [currentTab, setCurrentTab] = useState<AppTab>('profile');

  // Core data: candidates, jobs, tests and companies
  const [candidate, setCandidate] = useState<User>(INITIAL_CANDIDATE);
  const [recruiter] = useState<User>(INITIAL_RECRUITER);
  const [jobs, setJobs] = useState<JobPosting[]>(INITIAL_JOBS);
  const [tests, setTests] = useState<AssessmentTest[]>([...STANDARD_ASSESSMENTS, ...COMPANY_ASSESSMENTS]);
  const [businesses] = useState<Business[]>(INITIAL_BUSINESSES);

  // When a candidate takes a job's attached test, the job they're applying to
  const [activeTestJobId, setActiveTestJobId] = useState<string | null>(null);
  const [activeTest, setActiveTest] = useState<AssessmentTest | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const recruiterBusiness = businesses.find((b) => b.id === recruiter.businessId)!;

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 4000);
  };

  // Switch between Candidate & Business views
  const handleRoleToggle = () => {
    const nextRole: UserRole = activeRole === 'candidate' ? 'recruiter' : 'candidate';
    setActiveRole(nextRole);
    setCurrentTab(NAV_TABS[nextRole === 'candidate' ? 'candidate' : 'recruiter'][0].id);
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
  const handleCompleteAssessment = (testId: string, finalScore: number, percentile: number) => {
    const completedTest = tests.find((t) => t.id === testId);
    if (!completedTest) return;

    setCandidate((prev) => {
      const testResults = [...prev.testResults, { testId, score: finalScore, completedAt: today() }];

      // Only Vetter-made tests become verified skills; company tests are scored for their own jobs
      if (completedTest.type !== 'standard') {
        return { ...prev, testResults };
      }

      const existingSkillIndex = prev.verifiedSkills.findIndex(
        (s) => s.testId === testId || s.skillName === completedTest.skillsTested[0]
      );

      const skillName = completedTest.skillsTested[0] || completedTest.title;
      const category = completedTest.category;
      const level = finalScore >= 90 ? 'Staff / Lead' : finalScore >= 80 ? 'Senior' : 'Mid';

      let updatedSkills: VerifiedSkill[];

      if (existingSkillIndex >= 0) {
        updatedSkills = [...prev.verifiedSkills];
        const existing = updatedSkills[existingSkillIndex];
        updatedSkills[existingSkillIndex] = {
          ...existing,
          score: Math.max(existing.score, finalScore),
          percentile: Math.max(existing.percentile, percentile),
          verifiedAt: today(),
          level,
          history: [...existing.history, { date: today(), score: finalScore, testName: completedTest.title }],
        };
      } else {
        const newSkill: VerifiedSkill = {
          skillId: `skill-${Date.now()}`,
          skillName,
          category,
          score: finalScore,
          percentile,
          verifiedAt: today(),
          testId: completedTest.id,
          level,
          history: [{ date: today(), score: finalScore, testName: completedTest.title }],
        };
        updatedSkills = [...prev.verifiedSkills, newSkill];
      }

      return { ...prev, testResults, verifiedSkills: updatedSkills };
    });

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
      setCurrentTab('jobs');
    } else {
      setCurrentTab(completedTest.type === 'standard' ? 'profile' : 'jobs');
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

  const allCandidates = [candidate, ...OTHER_CANDIDATES];
  const candidateSection = CANDIDATE_SECTIONS[currentTab];
  const businessSection = BUSINESS_SECTIONS[currentTab];

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <Navigation
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        activeRole={activeRole}
        onRoleToggle={handleRoleToggle}
        userAvatar={activeRole === 'candidate' ? candidate.avatarUrl : recruiter.avatarUrl}
        userName={activeRole === 'candidate' ? candidate.name : recruiter.name}
      />

      <main className="flex-1 pb-16">
        {activeRole === 'candidate' && candidateSection && (
          <CandidatePortal
            section={candidateSection}
            onNavigate={(section) => setCurrentTab(section)}
            candidate={candidate}
            tests={tests}
            jobs={jobs}
            onStartTest={(test) => setActiveTest(test)}
            onStartAttachedTest={(test, forJobId) => {
              setActiveTest(test);
              setActiveTestJobId(forJobId);
            }}
            onApplyJob={handleApplyJob}
          />
        )}

        {activeRole === 'candidate' && currentTab === 'companies' && (
          <BusinessesView
            businesses={businesses}
            jobs={jobs}
            tests={tests}
            onSelectJob={() => setCurrentTab('jobs')}
          />
        )}

        {activeRole === 'recruiter' && businessSection && (
          <RecruiterPortal
            section={businessSection}
            onNavigate={(section) => setCurrentTab(`business-${section}`)}
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

      {activeTest && (
        <AssessmentRunner
          test={activeTest}
          onClose={() => {
            setActiveTest(null);
            setActiveTestJobId(null);
          }}
          onComplete={handleCompleteAssessment}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 p-4 bg-slate-900 border border-slate-800 text-white rounded-xl shadow-2xl flex items-center gap-3 max-w-md">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <div className="text-xs font-medium">{toast}</div>
        </div>
      )}

      <footer className="border-t border-slate-200 py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <span className="font-bold text-slate-900 tracking-tight">VETTER</span>
          <span>&middot; Skills-based hiring</span>
        </div>
      </footer>
    </div>
  );
}
