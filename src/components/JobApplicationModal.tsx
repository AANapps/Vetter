import React from 'react';
import { User, JobPosting, AssessmentTest } from '../types';
import { getBestTestScore } from '../lib/matchingAlgorithm';
import {
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  Award,
  ArrowRight,
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

  // Test attached to this job, if any (Vetter-made or the company's own)
  const attachedTest = tests.find((t) => t.id === job.attachedTestId);
  const bestScore = attachedTest ? getBestTestScore(candidate, attachedTest.id) : undefined;

  const passingScore = job.attachedTestPassingScore || attachedTest?.passingScore || 75;
  const hasTakenTest = bestScore !== undefined;
  const hasPassed = hasTakenTest && bestScore >= passingScore;
  const testBlocksApplication = !!attachedTest && !!job.isAttachedTestMandatory && !hasPassed;
  const isApplied = candidate.appliedJobIds?.includes(job.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-900">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1 pr-8">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Apply to {job.title}</h2>
          <p className="text-xs text-slate-500">
            {attachedTest
              ? `${job.companyName} has attached a test to this job.`
              : 'Your verified skills are shared with the company when you apply.'}
          </p>
        </div>

        {/* Application Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Candidate</span>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{candidate.name}</span>
              <span className="text-slate-400 font-normal">({candidate.yearsExperience} yrs exp)</span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">{candidate.title}</p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Company</span>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{job.companyName}</span>
            </div>
            <p className="text-[11px] text-slate-500">{job.location} &middot; {job.workType}</p>
          </div>

          <div className="space-y-1 sm:col-span-2 pt-2 border-t border-slate-200/80">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Job</span>
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>{job.title}</span>
              </div>
              <div className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                {overallFitPercentage}% Fit
              </div>
            </div>
            <div className="text-slate-500 text-[11px]">{job.department} &middot; {job.salaryRange}</div>
          </div>
        </div>

        {/* Attached Test Card */}
        {attachedTest && (
          <div className="border-2 border-indigo-200 bg-indigo-50/20 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                    {attachedTest.type === 'custom' ? `${attachedTest.companyName} test` : 'Vetter test'}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded border ${
                      job.isAttachedTestMandatory
                        ? 'text-rose-700 bg-rose-50 border-rose-200'
                        : 'text-slate-600 bg-slate-50 border-slate-200'
                    }`}
                  >
                    {job.isAttachedTestMandatory ? 'Required to apply' : 'Optional'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{attachedTest.title}</h3>
                <p className="text-xs text-slate-600">{attachedTest.description}</p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-slate-400">Pass mark</span>
                <div className="text-sm font-mono font-bold text-indigo-700">{passingScore}/100</div>
              </div>
            </div>

            {/* Test Status Banner for Candidate */}
            {hasPassed ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Passed:</span> you scored <strong>{bestScore}/100</strong>.
                </div>
              </div>
            ) : hasTakenTest ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Below pass mark:</span> your best score is {bestScore}/100. Retake it to reach {passingScore}.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center gap-2 text-xs text-indigo-950">
                <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-bold">Not taken yet:</span> takes about {attachedTest.estimatedMinutes} minutes.
                  {job.isAttachedTestMandatory && ' Your application is submitted automatically if you pass.'}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {isApplied ? (
            <div className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Application submitted</span>
            </div>
          ) : (
            <>
              {attachedTest && !hasPassed && (
                <button
                  onClick={() => {
                    onClose();
                    onStartAttachedTest(attachedTest, job.id);
                  }}
                  className={`w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs ${
                    testBlocksApplication
                      ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                      : 'text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{hasTakenTest ? 'Retake test' : 'Take test'}</span>
                </button>
              )}
              {!testBlocksApplication && (
                <button
                  onClick={() => {
                    onConfirmApply(job.id, bestScore);
                    onClose();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Submit application</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
