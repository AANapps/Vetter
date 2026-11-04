import React from 'react';
import { BackButton } from './BackButton';
import { Link2, Pencil, Play, PlusCircle, Sparkles } from 'lucide-react';
import { AssessmentTest, Business, JobPosting, TEST_DIFFICULTIES, User, UserRole, timerOf } from '../types';
import { getLeaderboard, getTestStats } from '../lib/leaderboard';
import { TestLeaderboard, formatDuration } from './TestLeaderboard';
import { QUESTION_TYPE_LABELS, describeChecks } from '../lib/testRoles';
import { levelsOf } from '../lib/testLevels';
import { LevelPicker } from './LevelPicker';
import { TIER_BLURB } from '../lib/modules';

interface TestPageProps {
  test: AssessmentTest;
  // Every test, to find this one's other levels
  tests: AssessmentTest[];
  candidates: User[];
  jobs: JobPosting[];
  viewerRole: UserRole;
  // The company looking, who can try their own tests as well as Vetter's
  viewerBusinessId?: string;
  currentCandidateId?: string;
  // The company whose link the candidate came from
  referredByCompany?: Business;
  // Companies and the Vetter team add the test to one of their jobs, then send it from there
  onSend?: () => void;
  // Companies take a copy of a Vetter module test to add their own questions to its areas and levels
  onCustomize?: () => void;
  // The company's own test: opens where it's edited
  onEdit?: () => void;
  // Made by hand: to the test chat, to improve it with Vetter's AI
  onEnhance?: () => void;
  onStartTest: (test: AssessmentTest) => void;
  onOpenJob?: (jobId: string) => void;
  onOpenTest: (testId: string) => void;
  onBack: () => void;
}


export const TestPage: React.FC<TestPageProps> = ({
  test,
  tests,
  candidates,
  jobs,
  viewerRole,
  viewerBusinessId,
  currentCandidateId,
  referredByCompany,
  onSend,
  onCustomize,
  onEdit,
  onEnhance,
  onStartTest,
  onOpenJob,
  onOpenTest,
  onBack,
}) => {
  const versions = levelsOf(test, tests);
  const leaderboard = getLeaderboard(test.id, candidates);
  const stats = getTestStats(test, candidates);
  const yourEntry = leaderboard.find((e) => e.candidate.id === currentCandidateId);
  const usedByJobs = jobs.filter((j) => j.testIds.includes(test.id) && j.status === 'active');
  // Candidates take company tests through the jobs they're attached to, or the company's own link
  // Companies try Vetter's tests and their own (the Vetter team any test) as practice runs that aren't saved
  const canStart =
    viewerRole === 'candidate'
      ? test.type === 'standard' || referredByCompany?.id === test.businessId
      : viewerRole === 'admin' || test.type === 'standard' || (!!viewerBusinessId && test.businessId === viewerBusinessId);

  const aspectName = (id: string) => test.aspects?.find((a) => a.id === id)?.name ?? id;
  const levelsAsked = TEST_DIFFICULTIES.filter((t) => test.questions.some((q) => q.tier === t));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <BackButton onClick={onBack}>All tests</BackButton>

      {referredByCompany && (
        <p className="px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900">
          <span className="font-semibold">{referredByCompany.name}</span> sent you this test. Your result will be shared with them.
        </p>
      )}

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
            {versions.length > 1 && (
              <div className="pt-1">
                <LevelPicker
                  versions={versions}
                  selectedId={test.id}
                  onSelect={onOpenTest}
                  bestScores={
                    currentCandidateId
                      ? Object.fromEntries(
                          versions.map((v) => [v.id, getLeaderboard(v.id, candidates).find((e) => e.candidate.id === currentCandidateId)?.score])
                        )
                      : undefined
                  }
                />
              </div>
            )}
            <p className="text-sm text-slate-600 leading-relaxed">{test.description}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {test.skillsTested.map((s) => (
                <span key={s} className="text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600 font-mono">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {onSend && (
            <button
              onClick={onSend}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Add to a job</span>
            </button>
          )}

          {onEdit && (
            <button
              onClick={onEdit}
              title={onEnhance ? 'Edit the questions yourself' : 'Ask Vetter for changes, or edit the questions yourself'}
              className="px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:border-indigo-400 rounded-lg transition-colors flex items-center gap-2 shrink-0 self-start"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          )}

          {onEnhance && (
            <button
              onClick={onEnhance}
              title="Improve it by asking Vetter, then keep changing it that way"
              className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enhance with AI</span>
            </button>
          )}

          {onCustomize && test.aspects && (
            <button
              onClick={onCustomize}
              title="Keep Vetter's questions and add your own to any area and level"
              className="px-4 py-2.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 hover:border-indigo-400 rounded-lg transition-colors flex items-center gap-2 shrink-0 self-start"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add your own questions</span>
            </button>
          )}

          {canStart && (
            <button
              onClick={() => onStartTest(test)}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs shrink-0 self-start"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {viewerRole !== 'candidate' ? 'Try' : yourEntry ? 'Retake' : 'Start'} {test.difficulty} test
              </span>
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

      {/* Module tests: the core areas every level covers, and what this level adds */}
      {test.aspects && test.questions.some((q) => q.aspect) && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">What it covers</h2>
            <p className="text-xs text-slate-500">{TIER_BLURB[test.difficulty]}. Pass a level and you've shown every level below it.</p>
          </div>
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs min-w-[520px]">
              <thead>
                <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <th className="font-semibold px-2 py-1.5">Area</th>
                  {levelsAsked.map((t) => (
                    <th key={t} className="font-semibold px-2 py-1.5 text-center">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {test.aspects.map((a) => (
                  <tr key={a.id}>
                    <td className="px-2 py-2 align-top">
                      <div className="font-semibold text-slate-900">{a.name}</div>
                      <div className="text-[11px] text-slate-500">{a.summary}</div>
                    </td>
                    {levelsAsked.map((t) => {
                      const n = test.questions.filter((q) => q.aspect === a.id && q.tier === t).length;
                      return (
                        <td key={t} className="px-2 py-2 text-center align-top font-mono tabular-nums text-slate-700">
                          {n || <span className="text-slate-300">–</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                    {QUESTION_TYPE_LABELS[q.type]} &middot; {describeChecks(q)}
                  </div>
                  {q.aspect && (
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-1.5 py-px rounded bg-slate-100 text-slate-600">{aspectName(q.aspect)}</span>
                      {q.tier && <span className="px-1.5 py-px rounded bg-indigo-50 text-indigo-700">{q.tier}</span>}
                    </div>
                  )}
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
              <dd className="font-mono text-slate-800">{timerOf(test) === null ? 'None' : `${timerOf(test)} min`}</dd>
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
          {test.type === 'custom' && viewerRole === 'candidate' && !canStart && (
            <p className="pt-3 border-t border-slate-200 text-slate-500">
              {test.companyName} sets this test for its own jobs. Take it from the Job Board when you apply.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
