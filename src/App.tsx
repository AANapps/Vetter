import React, { useState } from 'react';
import { User, UserRole, AssessmentTest, JobPosting, LeaderboardRank, VerifiedSkill, Business } from './types';
import {
  INITIAL_CANDIDATE,
  OTHER_CANDIDATES,
  INITIAL_RECRUITER,
  STANDARD_ASSESSMENTS,
  INITIAL_JOBS,
  INITIAL_LEADERBOARD,
  INITIAL_BUSINESSES,
} from './data/mockData';
import { Navigation } from './components/Navigation';
import { CandidatePortal } from './components/CandidatePortal';
import { RecruiterPortal } from './components/RecruiterPortal';
import { LeaderboardView } from './components/LeaderboardView';
import { BusinessesView } from './components/BusinessesView';
import { AssessmentRunner } from './components/AssessmentRunner';
import { SchemaAndStackModal } from './components/SchemaAndStackModal';
import { PricingTiersModal } from './components/PricingTiersModal';
import { FourPillarsModal } from './components/FourPillarsModal';

export default function App() {
  const [activeRole, setActiveRole] = useState<UserRole>('candidate');
  const [currentTab, setCurrentTab] = useState<string>('profile');

  // Core Data States (The 4 Pillars: Candidates, Tests, Job Posts, Businesses)
  const [candidate, setCandidate] = useState<User>(INITIAL_CANDIDATE);
  const [recruiter, setRecruiter] = useState<User>(INITIAL_RECRUITER);
  const [jobs, setJobs] = useState<JobPosting[]>(INITIAL_JOBS);
  const [tests, setTests] = useState<AssessmentTest[]>(STANDARD_ASSESSMENTS);
  const [businesses, setBusinesses] = useState<Business[]>(INITIAL_BUSINESSES);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRank[]>(INITIAL_LEADERBOARD);
  const [recruiterTier, setRecruiterTier] = useState<'tier_1_standard' | 'tier_2_custom'>('tier_2_custom');

  // Attached Test Job Link: When candidate takes an attached test to complete a job application
  const [activeTestJobId, setActiveTestJobId] = useState<string | null>(null);

  // Modals & Runners
  const [activeTest, setActiveTest] = useState<AssessmentTest | null>(null);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isPillarsModalOpen, setIsPillarsModalOpen] = useState(false);

  // Switch between Candidate & Recruiter views
  const handleRoleToggle = () => {
    if (activeRole === 'candidate') {
      setActiveRole('recruiter');
      setCurrentTab('recruiter-jobs');
    } else {
      setActiveRole('candidate');
      setCurrentTab('profile');
    }
  };

  // When candidate applies for a job
  const handleApplyJob = (jobId: string) => {
    setCandidate((prev) => {
      const alreadyApplied = prev.appliedJobIds?.includes(jobId);
      if (alreadyApplied) return prev;
      return {
        ...prev,
        appliedJobIds: [...(prev.appliedJobIds || []), jobId],
      };
    });

    // Increment job applicants count
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, applicantCount: j.applicantCount + 1 } : j))
    );
  };

  // Complete assessment in runner
  const handleCompleteAssessment = (testId: string, finalScore: number, percentile: number) => {
    const completedTest = tests.find((t) => t.id === testId);
    if (!completedTest) return;

    // Update candidate verified skills
    setCandidate((prev) => {
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
          verifiedAt: new Date().toISOString().split('T')[0],
          level,
          history: [
            ...existing.history,
            {
              date: new Date().toISOString().split('T')[0],
              score: finalScore,
              testName: completedTest.title,
            },
          ],
        };
      } else {
        const newSkill: VerifiedSkill = {
          skillId: `skill-${Date.now()}`,
          skillName,
          category,
          score: finalScore,
          percentile,
          verifiedAt: new Date().toISOString().split('T')[0],
          testId: completedTest.id,
          level,
          history: [
            {
              date: new Date().toISOString().split('T')[0],
              score: finalScore,
              testName: completedTest.title,
            },
          ],
        };
        updatedSkills = [...prev.verifiedSkills, newSkill];
      }

      return {
        ...prev,
        verifiedSkills: updatedSkills,
      };
    });

    // Update leaderboard entry if higher
    setLeaderboard((prev) => {
      const idx = prev.findIndex((entry) => entry.candidateId === candidate.id);
      if (idx >= 0) {
        const updated = [...prev];
        if (finalScore > updated[idx].score) {
          updated[idx] = {
            ...updated[idx],
            score: finalScore,
            percentile,
            totalAssessmentsPassed: updated[idx].totalAssessmentsPassed + 1,
            lastActive: 'Just now',
          };
          updated.sort((a, b) => b.score - a.score);
          return updated.map((item, i) => ({ ...item, rank: i + 1 }));
        }
        return prev;
      }
      return prev;
    });

    // If candidate took an assessment attached to a job application, automatically submit application!
    if (activeTestJobId) {
      handleApplyJob(activeTestJobId);
      setActiveTestJobId(null);
    }

    setActiveTest(null);
    setCurrentTab('matches'); // Route to matches feed to view dynamically updated vector fit scores!
  };

  // Recruiter creates a new job
  const handleCreateJob = (newJob: JobPosting) => {
    setJobs((prev) => [newJob, ...prev]);
  };

  // Recruiter adjusts score thresholds
  const handleUpdateJobRequirements = (jobId: string, requirements: JobPosting['requirements']) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, requirements } : j)));
  };

  // Recruiter creates custom assessment (Tier 2)
  const handleCreateCustomAssessment = (newTest: AssessmentTest) => {
    setTests((prev) => [newTest, ...prev]);
  };

  const allCandidates = [candidate, ...OTHER_CANDIDATES];

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Bar Navigation */}
      <Navigation
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        activeRole={activeRole}
        onRoleToggle={handleRoleToggle}
        onOpenSchemaModal={() => setIsSchemaModalOpen(true)}
        onOpenPillarsModal={() => setIsPillarsModalOpen(true)}
        userAvatar={activeRole === 'candidate' ? candidate.avatarUrl : recruiter.avatarUrl}
        userName={activeRole === 'candidate' ? candidate.name : recruiter.name}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16 bg-white">
        {/* Universal Mode Switcher Banner / Quick Notice */}
        <div className="bg-indigo-50/60 border-b border-indigo-100/70 px-6 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 shadow-xs" />
              <span>
                Simulating active role:{' '}
                <strong className="text-slate-900 font-semibold">
                  {activeRole === 'candidate'
                    ? `${candidate.name} (Candidate)`
                    : `${recruiter.name} (${recruiter.company})`}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>
                Pillars: <strong className="text-indigo-700">Candidates &middot; Tests &middot; Job Posts &middot; Businesses</strong>
              </span>
              <button
                onClick={() => setIsPillarsModalOpen(true)}
                className="text-indigo-600 hover:text-indigo-800 underline font-semibold transition-colors"
              >
                Inspect 4 Pillars
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={handleRoleToggle}
                className="text-indigo-600 hover:text-indigo-800 underline font-semibold transition-colors"
              >
                Switch to {activeRole === 'candidate' ? 'Recruiter' : 'Candidate'}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic View Rendering based on Active Tab */}
        {activeRole === 'candidate' && currentTab !== 'leaderboard' && currentTab !== 'businesses' && (
          <CandidatePortal
            candidate={candidate}
            tests={tests}
            jobs={jobs}
            onStartTest={(test) => setActiveTest(test)}
            onStartAttachedTest={(test, forJobId) => {
              setActiveTest(test);
              setActiveTestJobId(forJobId);
            }}
            onApplyJob={handleApplyJob}
            onViewLeaderboard={() => setCurrentTab('leaderboard')}
          />
        )}

        {activeRole === 'recruiter' && currentTab !== 'leaderboard' && currentTab !== 'businesses' && (
          <RecruiterPortal
            recruiter={recruiter}
            jobs={jobs}
            allCandidates={allCandidates}
            tests={tests}
            onCreateJob={handleCreateJob}
            onUpdateJobRequirements={handleUpdateJobRequirements}
            onCreateCustomAssessment={handleCreateCustomAssessment}
            onOpenPricingModal={() => setIsPricingModalOpen(true)}
          />
        )}

        {currentTab === 'businesses' && (
          <BusinessesView
            businesses={businesses}
            jobs={jobs}
            tests={tests}
            onSelectJob={(jobId) => {
              setActiveRole('candidate');
              setCurrentTab('matches');
            }}
            onSelectTest={(test) => {
              setActiveTest(test);
            }}
          />
        )}

        {currentTab === 'leaderboard' && (
          <LeaderboardView
            leaderboard={leaderboard}
            currentUserId={candidate.id}
          />
        )}
      </main>

      {/* Interactive Assessment Runner Modal */}
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

      {/* The 4 Pillars Architecture Explainer Modal */}
      <FourPillarsModal
        isOpen={isPillarsModalOpen}
        onClose={() => setIsPillarsModalOpen(false)}
        onNavigateTo={(tab) => {
          setIsPillarsModalOpen(false);
          setCurrentTab(tab);
        }}
      />

      {/* Relational Database Schema & Optimal Stack Modal */}
      <SchemaAndStackModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />

      {/* Recruiter Pricing & Monetization Tiers Modal */}
      <PricingTiersModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        currentTier={recruiterTier}
        onUpgradeTier={(tier) => setRecruiterTier(tier)}
      />

      {/* Global Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight">VETTED</span>
            <span>&middot; The 4 Pillars: Candidates, Tests, Job Posts, Businesses</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPillarsModalOpen(true)}
              className="hover:text-indigo-600 transition-colors font-medium text-indigo-700"
            >
              The 4 Pillars Architecture
            </button>
            <button
              onClick={() => setIsSchemaModalOpen(true)}
              className="hover:text-indigo-600 transition-colors"
            >
              PostgreSQL DDL & Schema
            </button>
            <button
              onClick={() => setIsPricingModalOpen(true)}
              className="hover:text-indigo-600 transition-colors"
            >
              Subscription Tiers
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
