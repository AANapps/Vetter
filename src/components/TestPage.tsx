import React from 'react';
import { Play } from 'lucide-react';
import { AssessmentTest, JobPosting, User, UserRole } from '../types';
import { getLeaderboard, getTestStats } from '../lib/leaderboard';
import { TestLeaderboard, formatDuration } from './TestLeaderboard';

interface TestPageProps {
  test: AssessmentTest;
  candidates: User[];
  jobs: JobPosting[];
  viewerRole: UserRole;
  currentCandidateId?: string;
  onStartTest: (test: AssessmentTest) => void;
  onOpenJob?: (jobId: string) => void;
  onBack: () => void;
}

const QUESTION_TYPE_LABELS = { sql: 'SQL', code: 'JavaScript', scenario: 'Scenario' } as const;

export const TestPage: React.FC<TestPageProps> = ({
  test,
  candidates,
  jobs,
  viewerRole,
  currentCandidateId,
  onStartTest,
  onOpenJob,
  onBack,
}) => {
  const leaderboard = getLeaderboard(test.id, candidates);
  const stats = getTestStats(test, candidates);
  const yourEntry = leaderboard.find((e) => e.candidate.id === currentCandidateId);
  const usedByJobs = jobs.filter((j) => j.attachedTestId === test.id && j.status === 'active');
  // Candidates take company tests through the jobs they're attached to
  const canStart = viewerRole === 'candidate' && test.type === 'standard';

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <button onClick={onBack} className="text-xs font-semibold text-slate-500 hover:text-indigo-700 transition-colors">
        &larr; All tests
      </button>

      {/* Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider">
              <span className="text-indigo-700 font-bold">{test.category}</span>
              <span className="text-slate-300">&middot;</span>
              <span className="text-slate-500">{test.difficulty}</span>
              <span className="text-slate-300">&middot;</span>
              <span className="text-slate-500">{test.type === 'standard' ? 'Made by Vetter' : `Made by ${test.companyName}`}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{test.title}</h1>
            <p className="text-sm text-slate-600 leading-relaxed">{test.description}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {test.skillsTested.map((s) => (
                <span key={s} className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 font-mono">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {canStart && (
            <button
              onClick={() => onStartTest(test)}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{yourEntry ? 'Retake test' : 'Start test'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-200">
          <div>
            <div className="text-xs text-slate-500">Candidates ranked</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{stats.candidatesRanked}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Average score</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats.averageScore}
              <span className="text-xs text-slate-400 font-normal">/100</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Pass rate (≥{test.passingScore})</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums">{stats.passRate}%</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{viewerRole === 'candidate' ? 'Your best' : 'Top score'}</div>
            <div className="text-2xl font-bold text-indigo-700 font-mono tabular-nums">
              {viewerRole === 'candidate' ? (yourEntry ? `#${yourEntry.rank} · ${yourEntry.score}` : '—') : stats.topScore}
            </div>
          </div>
        </div>
      </div>

      <TestLeaderboard entries={leaderboard} passingScore={test.passingScore} currentCandidateId={currentCandidateId} />

      {/* What's in the test */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
          <h2 className="text-base font-bold text-slate-900">Tasks</h2>
          <ol className="divide-y divide-slate-100">
            {test.questions.map((q, i) => (
              <li key={q.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900">
                    {i + 1}. {q.title}
                  </div>
                  <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                    {QUESTION_TYPE_LABELS[q.type]} &middot; {q.testCases.length} {q.testCases.length === 1 ? 'check' : 'checks'}
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-500 shrink-0">
                  <div>{q.weight}% of score</div>
                  <div>~{q.timeLimitMinutes} min</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3 shadow-xs text-xs">
          <h2 className="text-base font-bold text-slate-900">Details</h2>
          <dl className="space-y-2">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Time limit</dt>
              <dd className="font-mono text-slate-800">{test.estimatedMinutes} min</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Pass mark</dt>
              <dd className="font-mono text-slate-800">{test.passingScore}/100</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Tasks</dt>
              <dd className="font-mono text-slate-800">{test.questions.length}</dd>
            </div>
            {yourEntry && (
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Your best time</dt>
                <dd className="font-mono text-slate-800">{formatDuration(yourEntry.durationSeconds)}</dd>
              </div>
            )}
          </dl>
          {usedByJobs.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-1.5">
              <div className="font-semibold text-slate-900">Required by</div>
              {usedByJobs.map((j) => (
                <div key={j.id} className="text-slate-600">
                  {onOpenJob ? (
                    <button onClick={() => onOpenJob(j.id)} className="hover:text-indigo-700 hover:underline text-left">
                      {j.title}
                    </button>
                  ) : (
                    j.title
                  )}{' '}
                  <span className="text-slate-400">&middot; {j.companyName}</span>
                </div>
              ))}
            </div>
          )}
          {test.type === 'custom' && viewerRole === 'candidate' && (
            <p className="pt-3 border-t border-slate-200 text-slate-500">
              {test.companyName} sets this test for its own jobs. Take it from the Job Board when you apply.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
