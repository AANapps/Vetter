import React, { useState } from 'react';
import { User, JobPosting, AssessmentTest, JobProfile } from '../types';
import { jobTestProgress, jobTestsOf } from '../lib/jobTests';
import { bestProfileFor } from '../lib/jobProfiles';
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
  // The candidate's job profiles: the application is sent with one of them
  profiles: JobProfile[];
  onConfirmApply: (jobId: string, profileId: string) => void;
  // One of the job's tests, taken to apply: passing them all sends the application
  onStartJobTest: (test: AssessmentTest, forJobId: string) => void;
}

export const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  isOpen,
  onClose,
  candidate,
  job,
  tests,
  overallFitPercentage,
  profiles,
  onConfirmApply,
  onStartJobTest,
}) => {
  // Starts on the profile that covers most of what the job asks for
  const [profileId, setProfileId] = useState(() => bestProfileFor(candidate, job).id);
  if (!isOpen) return null;
  const profile = profiles.find((p) => p.id === profileId) ?? profiles[0];

  // The job's tests (Vetter-made or the company's own) and how the candidate has done on them
  const jobTests = jobTestsOf(job, tests);
  const progress = jobTestProgress(job, candidate);
  const passingScore = job.testPassingScore;
  const hasPassed = progress.status === 'passed';
  // The next to take, or once all are taken and the average is short, the weakest to retake
  const nextTest =
    jobTests.find((t) => progress.scores[t.id] === undefined) ??
    (hasPassed ? undefined : [...jobTests].sort((a, b) => (progress.scores[a.id] ?? 0) - (progress.scores[b.id] ?? 0))[0]);
  const testBlocksApplication = jobTests.length > 0 && job.testsRequired && !hasPassed;
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
            {jobTests.length > 0
              ? `${job.companyName} asks candidates to take ${jobTests.length === 1 ? 'a test' : `${jobTests.length} tests`} for this job.`
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
            <p className="text-[11px] text-slate-500 truncate">{profile.title}</p>
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

        {/* Which job profile the company sees */}
        {!isApplied && profiles.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900">Apply with</h3>
            <div className="flex flex-wrap gap-2">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfileId(p.id)}
                  aria-pressed={p.id === profile.id}
                  className={`px-3 py-2 rounded-lg text-xs text-left transition-colors ${
                    p.id === profile.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className={p.id === profile.id ? 'text-indigo-100' : 'text-slate-500'}> &middot; {p.title}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              {job.companyName} sees this profile's headline, about and skills, plus your scores on the tests this job asks for.
            </p>
          </div>
        )}

        {/* The job's tests */}
        {jobTests.length > 0 && (
          <div className="border-2 border-indigo-200 bg-indigo-50/20 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span
                  className={`text-[10px] font-mono uppercase font-semibold px-2 py-0.5 rounded border ${
                    job.testsRequired ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-600 bg-slate-50 border-slate-200'
                  }`}
                >
                  {job.testsRequired ? 'Required to apply' : 'Optional'}
                </span>
                <h3 className="text-sm font-bold text-slate-900">Tests for this job</h3>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] font-mono text-slate-400">Pass mark{jobTests.length > 1 ? ' (average)' : ''}</span>
                <div className="text-sm font-mono font-bold text-indigo-700">{passingScore}/100</div>
              </div>
            </div>

            <ul className="divide-y divide-indigo-100 text-xs">
              {jobTests.map((t) => {
                const score = progress.scores[t.id];
                return (
                  <li key={t.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold text-slate-900 truncate">{t.title}</span>
                      <span className="block text-slate-500">
                        {t.type === 'custom' ? `${t.companyName} test` : 'Vetter test'} &middot; ~{t.estimatedMinutes} min
                      </span>
                    </span>
                    <span className={`font-mono font-bold tabular-nums shrink-0 ${score === undefined ? 'text-slate-400 font-medium' : 'text-slate-900'}`}>
                      {score === undefined ? 'Not taken' : `${score}/100`}
                    </span>
                  </li>
                );
              })}
            </ul>

            {/* Where the candidate stands */}
            {hasPassed ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Passed:</span> you {jobTests.length > 1 ? 'averaged' : 'scored'} <strong>{progress.score}/100</strong>.
                </div>
              </div>
            ) : progress.status === 'failed' ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Below pass mark:</span> you {jobTests.length > 1 ? 'averaged' : 'scored'} {progress.score}/100. Retake a test to reach {passingScore}.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center gap-2 text-xs text-indigo-950">
                <Award className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-bold">
                    {progress.done} of {progress.total} taken.
                  </span>
                  {job.testsRequired && ' Your application is sent automatically once you pass them.'}
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
              {nextTest && (
                <button
                  onClick={() => {
                    onClose();
                    onStartJobTest(nextTest, job.id);
                  }}
                  className={`w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs ${
                    testBlocksApplication
                      ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                      : 'text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{progress.scores[nextTest.id] !== undefined ? 'Retake test' : progress.done === 0 ? 'Take test' : 'Take next test'}</span>
                </button>
              )}
              {!testBlocksApplication && (
                <button
                  onClick={() => {
                    onConfirmApply(job.id, profile.id);
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
