import React from 'react';
import { AlertTriangle, BadgeCheck, CheckCircle2, ChevronRight, XCircle } from 'lucide-react';
import { AssessmentTest, User } from '../types';
import { LeadRow, stageInfo } from '../lib/leads';
import { getLeaderboard } from '../lib/leaderboard';
import { unfinishedStarts } from '../lib/results';
import { IntegrityBadge } from './IntegrityBadge';

/**
 * Vetter's two halves side by side, for one applicant on one of the company's jobs: how they did on the company's job
 * simulation, then what their profile has already proven that the job needs (verified skills and where they rank),
 * then the gaps: what the job needs that nothing has verified, including skills they claim but haven't proven.
 */

// Two skill names that mean the same thing: equal, or one inside the other (ignoring case, for names of 3+ letters)
export const sameSkill = (a: string, b: string) => {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  return x === y || (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x)));
};

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
          // What the job needs: its listed requirements, and what its own tests cover
          const needs = [...new Set([...r.job.requirements.map((q) => q.skillName), ...jobTests.flatMap((t) => t.skillsTested)].filter(Boolean))].slice(0, 12);
          const proven = person.verifiedSkills
            .filter((v) => needs.some((n) => sameSkill(n, v.skillName)) || jobTests.some((t) => t.category === v.category))
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
          const gaps = needs.filter((n) => !person.verifiedSkills.some((v) => sameSkill(n, v.skillName)));
          const claimed = (n: string) => (person.skills ?? []).some((s) => sameSkill(s, n));
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

              {/* 1. The company's own job simulation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-bold text-slate-800">Your job simulation</h3>
                  <IntegrityBadge sittings={r.integrity} />
                </div>
                {jobTests.length === 0 ? (
                  <p className="text-xs text-slate-500">This job has no tests yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {jobTests.map((t) => {
                      const results = person.testResults
                        .filter((x) => x.testId === t.id)
                        .sort((a, b) => (a.completedTime ?? a.completedAt).localeCompare(b.completedTime ?? b.completedAt));
                      const best = results.length ? Math.max(...results.map((x) => x.score)) : undefined;
                      const left = unfinishedStarts(person, t.id);
                      const passed = best !== undefined && best >= t.passingScore;
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
                                {best === undefined ? 'Not finished yet' : results.length > 1 ? `Attempts: ${results.map((x) => x.score).join(', ')}` : '1 attempt'}
                                {left > 0 && <span className="text-amber-700"> · {left} left unfinished</span>} · pass {t.passingScore}
                              </span>
                            </span>
                            <span className={`font-mono text-xl font-bold tabular-nums ${best === undefined ? 'text-slate-300' : passed ? 'text-slate-900' : 'text-rose-700'}`}>{best ?? '—'}</span>
                            <ChevronRight className="w-4 h-4 text-slate-300" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* 2. What their profile has already proven that this job needs */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-indigo-600" />
                  Proven on their profile
                </h3>
                {proven.length === 0 ? (
                  <p className="text-xs text-slate-500">Nothing on their profile verifies what this job needs yet.</p>
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

              {/* 3. What nothing has verified yet */}
              {gaps.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 inline-flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Not verified yet
                  </h3>
                  <ul className="flex flex-wrap gap-2">
                    {gaps.map((g) => (
                      <li key={g} className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-800">
                        {g}
                        {claimed(g) && <span className="text-amber-600"> · says they can</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
