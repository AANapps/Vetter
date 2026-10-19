import React from 'react';
import { User, JobPosting, AssessmentTest } from '../types';
import {
  X,
  Building,
  Briefcase,
  Play,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: User;
  job: JobPosting;
  tests: AssessmentTest[];
  overallFitPercentage: number;
  onConfirmApply: (jobId: string, testScoreAttached?: number) => void;
  onStartAttachedTest: (test: AssessmentTest, forJobId: string) => void;
}

export const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  isOpen,
  onClose,
  candidate,
  job,
  tests,
  overallFitPercentage,
  onConfirmApply,
  onStartAttachedTest,
}) => {
  if (!isOpen) return null;

  // Attached test for this job post
  const attachedTest = tests.find((t) => t.id === job.attachedTestId);
  const userSkillForTest = candidate.verifiedSkills.find(
    (s) => s.testId === job.attachedTestId || (attachedTest && s.skillName.toLowerCase() === attachedTest.title.toLowerCase())
  );

  const passingScore = job.attachedTestPassingScore || attachedTest?.passingScore || 75;
  const hasTakenTest = !!userSkillForTest;
  const hasPassed = hasTakenTest && userSkillForTest.score >= passingScore;
  const isApplied = candidate.appliedJobIds?.includes(job.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-900 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header: 4 Pillars Badge */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md text-[11px] font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pillars in Action: Candidate &middot; Job Post &middot; Attached Test &middot; Business</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Job Application Verification</h2>
          <p className="text-xs text-slate-500">
            Tests can be attached to jobs by businesses as a required credential for application.
          </p>
        </div>

        {/* 4 Pillars Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          {/* Pillar 1: Candidate */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Pillar 1: Candidate</span>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{candidate.name}</span>
              <span className="text-slate-400 font-normal">({candidate.yearsExperience} yrs exp)</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">{candidate.title}</p>
          </div>

          {/* Pillar 4: Business */}
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Pillar 4: Business</span>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-600" />
              <span>{job.companyName}</span>
            </div>
            <p className="text-[11px] text-slate-500">{job.location} &middot; {job.workType}</p>
          </div>

          {/* Pillar 3: Job Post */}
          <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-200/80">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Pillar 3: Job Post</span>
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                <span>{job.title}</span>
              </div>
              <div className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                {overallFitPercentage}% Fit
              </div>
            </div>
            <div className="text-slate-500 text-[11px]">{job.department} &middot; {job.salaryRange}</div>
          </div>
        </div>

        {/* Pillar 2: Attached Test Card (Key User Requirement) */}
        <div className="border-2 border-indigo-200 bg-indigo-50/20 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                  Pillar 2: Attached Assessment
                </span>
                {job.isAttachedTestMandatory && (
                  <span className="text-[10px] font-mono uppercase font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                    Required to Apply
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                {attachedTest ? attachedTest.title : job.attachedTestTitle || 'Technical Skill Assessment'}
              </h3>
              <p className="text-xs text-slate-600">
                {attachedTest?.description || 'Objective in-browser practical assessment evaluated against automated test cases.'}
              </p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono text-slate-400">Passing Bar</span>
              <div className="text-sm font-mono font-bold text-indigo-700">{passingScore}/100</div>
            </div>
          </div>

          {/* Test Status Banner for Candidate */}
          {hasPassed ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Credential Pre-Verified:</span>{' '}
                  <span>Elena scored <strong>{userSkillForTest.score}/100</strong> ({userSkillForTest.percentile}th %ile).</span>
                </div>
              </div>
              <span className="text-emerald-700 font-mono text-[11px] font-semibold bg-emerald-100/60 px-2 py-0.5 rounded">
                Meets Requisition Bar
              </span>
            </div>
          ) : hasTakenTest ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Score Below Bar:</span>{' '}
                  <span>Recorded score is {userSkillForTest.score}/100. Retake to reach the {passingScore}+ requirement.</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center justify-between text-xs text-indigo-950">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-bold">Test Not Yet Completed:</span>{' '}
                  <span>Complete this attached assessment (~{attachedTest?.estimatedMinutes || 20} mins) to finalize your application.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Automated vector match will attach verified score to {job.companyName}'s recruiter pipeline.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isApplied ? (
              <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Application Already Submitted</span>
              </div>
            ) : hasPassed ? (
              <button
                onClick={() => {
                  onConfirmApply(job.id, userSkillForTest?.score);
                  onClose();
                }}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <span>Submit Application with Verified Score ({userSkillForTest.score}/100)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (attachedTest) {
                    onClose();
                    onStartAttachedTest(attachedTest, job.id);
                  }
                }}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Take Attached Assessment to Apply (~{attachedTest?.estimatedMinutes || 20}m)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
