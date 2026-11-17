import React from 'react';
import { BadgeCheck, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { AssessmentTest, User } from '../types';
import { LeadRow, stageInfo } from '../lib/leads';
import { getLeaderboard } from '../lib/leaderboard';
import { unfinishedStarts } from '../lib/results';
import { IntegrityBadge } from './IntegrityBadge';

/**
 * For one applicant on one of the company's jobs: the job's own tests (its skills tests, then its job simulation), each
 * with their best score or Not done, then other Praxa tests they've passed that check the same skills.
 */

// The same skill, by name (ignoring case and spacing), so a job about SQL doesn't pull in every skill with "SQL" in it
// A job simulation: a working day on the desktop, or a test named as one
const isJobSim = (t: AssessmentTest) => t.questions.some((q) => q.type === 'desktop') || /simulation/i.test(t.title);

const sameName = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');

export const ApplicantSummary: React.FC<{
  person: User;
  rows: LeadRow[];
  tests: AssessmentTest[];
  candidates: User[];
  onOpenTest: (testId: string) => void;
  onOpenJob: (jobId: string) => void;
}> = ({ person, rows, tests, candidates, onOpenTest, onOpenJob }) => {
  if (!rows.length) return null;
  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">For your jobs</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((r) => {
          const jobTests = r.job.testIds.map((id) => tests.find((t) => t.id === id)).filter((t): t is AssessmentTest => !!t);
          // Other Praxa tests they've passed that check exactly a skill the job's tests check
          const relevant = jobTests.flatMap((t) => t.skillsTested);
          const proven = person.verifiedSkills
            .filter((v) => !r.job.testIds.includes(v.testId) && relevant.some((n) => sameName(n, v.skillName)))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
          const stage = stageInfo(r.stage);
          return (
            <div key={r.id} className="px-6 py-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <button onClick={() => onOpenJob(r.job.id)} className="text-left min-w-0">
                  <span className="block text-base font-bold text-slate-900 hover:text-indigo-700 truncate">{r.job.title}</span>
                  <span className="block text-xs text-slate-500">{r.applied ? 'Applied' : 'Sent the tests'}</span>
                </button>
                <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${stage.chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                  {stage.label}
                </span>
              </div>

              {/* 1. The job's own tests: its skills tests, then its job simulation, each with their score or Not done */}
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-bold text-slate-800">This job's tests</h3>
                <IntegrityBadge sittings={r.integrity} />
              </div>
              {jobTests.length === 0 ? (
                <p className="text-xs text-slate-500">This job has no tests yet.</p>
              ) : (
                [
                  { label: 'Skills tests', list: jobTests.filter((t) => !isJobSim(t)) },
                  { label: 'Job simulation', list: jobTests.filter(isJobSim) },
                ]
                  .filter((g) => g.list.length > 0)
                  .map((g) => (
                    <div key={g.label} className="space-y-1.5">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{g.label}</h4>
                      <ul className="space-y-1.5">
                        {g.list.map((t) => {
                          const results = person.testResults
                            .filter((x) => x.testId === t.id)
                            .sort((a, b) => (a.completedTime ?? a.completedAt).localeCompare(b.completedTime ?? b.completedAt));
                          const best = results.length ? Math.max(...results.map((x) => x.score)) : undefined;
                          const left = unfinishedStarts(person, t.id);
                          const req = r.job.requirements.find((q) => q.testId === t.id);
                          const pass = req?.minScore ?? t.passingScore;
                          const passed = best !== undefined && best >= pass;
                          return (
                            <li key={t.id}>
                              <button onClick={() => onOpenTest(t.id)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-left">
                                {best === undefined ? (
                                  <span className="w-5 h-5 rounded-full border-2 border-dashed border-slate-300 shrink-0" />
                                ) : passed ? (
                                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                ) : (
                                  <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                )}
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold text-slate-900 truncate">{t.title}</span>
                                  <span className="block text-[11px] text-slate-500">
                                    {req?.importance === 'preferred' ? 'Preferred' : 'Required'} · pass {pass}
                                    {results.length > 1 && ` · attempts: ${results.map((x) => x.score).join(', ')}`}
                                    {left > 0 && <span className="text-amber-700"> · {left} left unfinished</span>}
                                  </span>
                                </span>
                                {best === undefined ? (
                                  <span className="shrink-0 px-2 py-0.5 rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">Not done</span>
                                ) : (
                                  <span className={`font-mono text-xl font-bold tabular-nums ${passed ? 'text-slate-900' : 'text-rose-700'}`}>{best}</span>
                                )}
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
              )}

              {/* 2. What their profile has already proven that this job needs */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Also proven on Praxa
                </h3>
                {proven.length === 0 ? (
                  <p className="text-xs text-slate-500">No other Praxa test they've passed covers this job's skills.</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {proven.map((v) => {
                      const board = getLeaderboard(v.testId, candidates);
                      const rank = board.find((e) => e.candidate.id === person.id)?.rank;
                      return (
                        <li key={v.skillId}>
                          <button onClick={() => onOpenTest(v.testId)} className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 text-left">
                            <span className="block text-xs font-semibold text-slate-900">
                              {v.skillName} <span className="font-mono">{v.score}</span>
                            </span>
                            <span className="block text-[10px] text-slate-500">{rank ? `#${rank} of ${board.length}` : `${v.percentile}th percentile`}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </section>
  );
};
