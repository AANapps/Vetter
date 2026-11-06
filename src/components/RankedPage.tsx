import React, { useMemo, useState } from 'react';
import { ArrowRight, Search, Trophy } from 'lucide-react';
import { AssessmentTest, User, levelName } from '../types';
import { getTestStats } from '../lib/leaderboard';
import { TestLeaderboard } from './TestLeaderboard';
import { rankedTests } from './TopPerformers';

// Ranked: every public test's leaderboard. The tests people have taken are listed on the left, busiest first; the
// chosen one's full leaderboard is on the right
export const RankedPage: React.FC<{
  tests: AssessmentTest[];
  allCandidates: User[];
  viewerId: string;
  onOpenTest: (testId: string) => void;
}> = ({ tests, allCandidates, viewerId, onOpenTest }) => {
  const boards = useMemo(() => rankedTests(tests, allCandidates), [tests, allCandidates]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = search.trim().toLowerCase();
  const shown = q ? boards.filter((b) => `${b.test.title} ${b.test.category}`.toLowerCase().includes(q)) : boards;
  const board = boards.find((b) => b.test.id === selectedId) ?? shown[0] ?? boards[0];
  const stats = board ? getTestStats(board.test, allCandidates) : null;
  const yours = board?.entries.find((e) => e.candidate.id === viewerId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          Ranked
        </h1>
        <p className="text-sm text-slate-600 mt-1">Leaderboards for every test. Each candidate's best score counts, and ties go to the faster time.</p>
      </div>

      {boards.length === 0 ? (
        <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-6 text-center">No one has been ranked yet. Take a test to be first.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-6 items-start">
          {/* Tests */}
          <aside className="min-w-0 bg-white border border-slate-200 rounded-xl overflow-hidden lg:sticky lg:top-20">
            <div className="p-3 border-b border-slate-100">
              <label className="relative block">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a test"
                  aria-label="Find a test"
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </label>
            </div>
            <ul className="max-h-[22rem] lg:max-h-[calc(100vh-12rem)] overflow-y-auto divide-y divide-slate-100">
              {shown.map((b) => {
                const active = b.test.id === board?.test.id;
                return (
                  <li key={b.test.id}>
                    <button
                      onClick={() => setSelectedId(b.test.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
                    >
                      <span className="min-w-0">
                        <span className={`block text-sm font-semibold truncate ${active ? 'text-white' : 'text-slate-900'}`}>{b.test.title}</span>
                        <span className={`block text-[11px] truncate ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                          {b.test.category} · {levelName(b.test.difficulty)}
                        </span>
                      </span>
                      <span className={`text-xs font-mono tabular-nums shrink-0 ${active ? 'text-slate-200' : 'text-slate-500'}`}>{b.entries.length}</span>
                    </button>
                  </li>
                );
              })}
              {shown.length === 0 && <li className="px-4 py-6 text-xs text-slate-500 text-center">No ranked test matches.</li>}
            </ul>
          </aside>

          {/* The chosen test's leaderboard */}
          {board && stats && (
            <div className="space-y-4 min-w-0">
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">{board.test.title}</h2>
                  <p className="text-xs text-slate-500">
                    {board.test.category} · {levelName(board.test.difficulty)} · pass mark {board.test.passingScore}
                  </p>
                </div>
                <button
                  onClick={() => onOpenTest(board.test.id)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5"
                >
                  {yours ? 'Improve your rank' : 'Take this test'}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <dl className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ['Ranked', stats.candidatesRanked],
                    ['Top score', stats.topScore],
                    ['Average', stats.averageScore],
                    ['Pass rate', `${stats.passRate}%`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
                      <dt className="text-[11px] text-slate-500">{label}</dt>
                      <dd className="text-lg font-bold font-mono tabular-nums text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <TestLeaderboard key={board.test.id} entries={board.entries} passingScore={board.test.passingScore} currentCandidateId={viewerId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
