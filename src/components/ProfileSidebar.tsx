import React from 'react';
import { AssessmentTest, CandidateJobMatch, JobPosting, User } from '../types';
import { getBestTestScore } from '../lib/matchingAlgorithm';
import { SKILL_IDS } from '../data/seedCandidates';
import { getBadgeTier } from './VerifiedSkillBadge';

interface ProfileSidebarProps {
  candidate: User;
  tests: AssessmentTest[];
  jobs: JobPosting[];
  rankedJobs: CandidateJobMatch[];
  onOpenTest: (testId: string) => void;
  onOpenJob: (jobId: string) => void;
}

const LIMIT = 3;
// Score needed to reach the next badge tier
const NEXT_TIER = [
  { min: 75, label: 'Bronze' },
  { min: 88, label: 'Silver' },
  { min: 95, label: 'Gold' },
];

// The right-hand column beside the profile: tests worth taking next and the jobs that fit best
export const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ candidate, tests, jobs, rankedJobs, onOpenTest, onOpenJob }) => {
  const activeJobs = jobs.filter((j) => j.status === 'active');

  // Untaken tests first (most in demand from open jobs), then tests short of Gold (lowest score first)
  const suggestedTests = tests
    .filter((t) => t.type === 'standard')
    .map((test) => {
      const best = getBestTestScore(candidate, test.id);
      const jobsNeeding = activeJobs.filter((j) => j.requirements.some((r) => r.skillId === SKILL_IDS[test.category])).length;
      return { test, best, jobsNeeding };
    })
    .filter(({ best }) => best === undefined || best < 95)
    .sort((a, b) => {
      if ((a.best === undefined) !== (b.best === undefined)) return a.best === undefined ? -1 : 1;
      if (a.best === undefined) return b.jobsNeeding - a.jobsNeeding;
      return a.best - b.best!;
    })
    .slice(0, LIMIT);

  const suggestedJobs = rankedJobs
    .filter((m) => !candidate.appliedJobIds?.includes(m.jobId))
    .sort((a, b) => b.overallFitPercentage - a.overallFitPercentage)
    .slice(0, LIMIT);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Suggested tests</h2>
        {suggestedTests.length === 0 ? (
          <p className="text-xs text-slate-500">You’ve reached Gold on every Vetter test.</p>
        ) : (
          <ul className="space-y-3.5">
            {suggestedTests.map(({ test, best, jobsNeeding }) => {
              const next = best === undefined ? undefined : NEXT_TIER.find((t) => t.min > best);
              return (
                <li key={test.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md tier-solid tier-solid-silver flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                    {test.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onOpenTest(test.id)}
                      className="text-xs font-semibold text-slate-900 hover:text-indigo-700 text-left"
                    >
                      {test.title}
                    </button>
                    <div className="text-[11px] text-slate-500">
                      {best === undefined
                        ? jobsNeeding > 0
                          ? `Not taken · wanted by ${jobsNeeding} open ${jobsNeeding === 1 ? 'job' : 'jobs'}`
                          : `Not taken · ~${test.estimatedMinutes} min`
                        : `Your best ${best} (${getBadgeTier(best).colorName}) · ${next ? `${next.min} for ${next.label}` : 'retake to improve'}`}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900">Suggested jobs</h2>
        {suggestedJobs.length === 0 ? (
          <p className="text-xs text-slate-500">You’ve applied to every open job.</p>
        ) : (
          <ul className="space-y-3.5">
            {suggestedJobs.map((match) => {
              const job = activeJobs.find((j) => j.id === match.jobId)!;
              return (
                <li key={match.jobId} className="flex items-start gap-3">
                  <img
                    src={job.companyLogo}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-8 h-8 rounded-md object-cover bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onOpenJob(job.id)}
                      className="text-xs font-semibold text-slate-900 hover:text-indigo-700 text-left"
                    >
                      {job.title}
                    </button>
                    <div className="text-[11px] text-slate-500 truncate">
                      {job.companyName} &middot; {job.location} ({job.workType})
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold font-mono tabular-nums text-indigo-700">{match.overallFitPercentage}%</div>
                    <div className="text-[10px] text-slate-400">fit</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
