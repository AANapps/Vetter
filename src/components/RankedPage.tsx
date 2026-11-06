import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Search, Trophy, Users } from 'lucide-react';
import { AssessmentTest, User, isPublic, levelName } from '../types';
import { getLeaderboard, getTestStats } from '../lib/leaderboard';
import { isMainVersion } from '../lib/testLevels';
import { Pic } from './Pic';
import { RankDisc } from './RankDisc';
import { formatDuration } from './TestLeaderboard';
import { getBadgeTier } from './VerifiedSkillBadge';

type Board = { test: AssessmentTest; entries: ReturnType<typeof getLeaderboard> };

// Ranked: every public test's leaderboard. On the left, every test, most taken first, with how many candidates have
// taken it; "All leaderboards" at the top is the collated view, every ranked test as a card with its top three. Picking
// a test (from the list or a card) shows its whole leaderboard
export const RankedPage: React.FC<{
  tests: AssessmentTest[];
  allCandidates: User[];
  viewerId: string;
  onOpenTest: (testId: string) => void;
}> = ({ tests, allCandidates, viewerId, onOpenTest }) => {
  // Every public test, taken or not, most taken first
  const boards: Board[] = useMemo(
    () =>
      tests
        .filter((t) => isPublic(t) && isMainVersion(t))
        .map((test) => ({ test, entries: getLeaderboard(test.id, allCandidates) }))
        .sort((a, b) => b.entries.length - a.entries.length || a.test.title.localeCompare(b.test.title)),
    [tests, allCandidates]
  );
  const ranked = boards.filter((b) => b.entries.length > 0);
  const [search, setSearch] = useState('');
  // null: the collated view of every leaderboard
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const q = search.trim().toLowerCase();
  const shown = q ? boards.filter((b) => `${b.test.title} ${b.test.category}`.toLowerCase().includes(q)) : boards;
  const board = selectedId ? boards.find((b) => b.test.id === selectedId) : undefined;
  const pick = (id: string | null) => {
    setSelectedId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const listItem = (key: string, active: boolean, onClick: () => void, title: string, sub: string, count: number | null) => (
    <li key={key}>
      <button
        onClick={onClick}
        aria-current={active ? 'true' : undefined}
        className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-colors ${active ? 'bg-slate-900 text-white' : 'hover:bg-slate-50'}`}
      >
        <span className="min-w-0">
          <span className={`block text-sm font-semibold truncate ${active ? 'text-white' : 'text-slate-900'}`}>{title}</span>
          <span className={`block text-[11px] truncate ${active ? 'text-slate-300' : 'text-slate-500'}`}>{sub}</span>
        </span>
        {count !== null && (
          <span
            className={`shrink-0 inline-flex items-center gap-1 text-xs tabular-nums ${active ? 'text-slate-200' : count ? 'text-slate-500' : 'text-slate-300'}`}
            title={`${count} ${count === 1 ? 'candidate has' : 'candidates have'} taken it`}
          >
            <Users className="w-3.5 h-3.5" />
            {count}
          </span>
        )}
      </button>
    </li>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          Ranked
        </h1>
        <p className="text-sm text-slate-600 mt-1">Leaderboards for every test. Each candidate's best score counts, and ties go to the faster time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-6 items-start">
        {/* Every test, most taken first */}
        <aside className="min-w-0 bg-white border border-slate-200 rounded-xl overflow-hidden lg:sticky lg:top-20">
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="px-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <span>Tests</span>
              <span>Most taken first</span>
            </div>
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
            {!q && listItem('all', selectedId === null, () => pick(null), 'All leaderboards', `${ranked.length} tests ranked`, null)}
            {shown.map((b) =>
              listItem(b.test.id, b.test.id === selectedId, () => pick(b.test.id), b.test.title, `${b.test.category} · ${levelName(b.test.difficulty)}`, b.entries.length)
            )}
            {shown.length === 0 && <li className="px-4 py-6 text-xs text-slate-500 text-center">No test matches.</li>}
          </ul>
        </aside>

        <div className="min-w-0">
          {board ? (
            <TestBoard board={board} allCandidates={allCandidates} viewerId={viewerId} onOpenTest={onOpenTest} onBack={() => pick(null)} />
          ) : ranked.length === 0 ? (
            <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-6 text-center">No one has been ranked yet. Take a test to be first.</p>
          ) : (
            // The collated view: every ranked test as a card with its top three, most taken first
            <ol className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {ranked.map((b, i) => (
                <li key={b.test.id} className="min-w-0">
                  <button
                    onClick={() => pick(b.test.id)}
                    className="w-full sm:aspect-square text-left bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 hover:border-slate-300 hover:shadow-sm transition-shadow group"
                  >
                    <div className="w-full flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-700">{b.test.title}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {b.test.category} · {levelName(b.test.difficulty)}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] font-mono text-slate-400">#{i + 1}</span>
                    </div>
                    <ol className="w-full flex-1 flex flex-col justify-center gap-2.5">
                      {b.entries.slice(0, 3).map((e) => (
                        <li key={e.candidate.id} className="flex items-center gap-2.5 min-w-0">
                          <RankDisc rank={e.rank} size="sm" />
                          <Pic src={e.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover shrink-0 bg-slate-100" />
                          <span className={`min-w-0 flex-1 text-xs font-semibold truncate ${e.candidate.id === viewerId ? 'text-indigo-700' : 'text-slate-900'}`}>
                            {e.candidate.name}
                          </span>
                          <span className="font-mono text-sm font-bold tabular-nums text-slate-900">{e.score}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="w-full flex items-center justify-between gap-2 text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                      <span className="inline-flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {b.entries.length} {b.entries.length === 1 ? 'candidate' : 'candidates'}
                      </span>
                      <span className="inline-flex items-center gap-0.5 font-semibold text-indigo-700">
                        Full leaderboard
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

// One test's whole leaderboard: its figures, then every candidate as a square card
const TestBoard: React.FC<{ board: Board; allCandidates: User[]; viewerId: string; onOpenTest: (testId: string) => void; onBack: () => void }> = ({
  board,
  allCandidates,
  viewerId,
  onOpenTest,
  onBack,
}) => {
  const stats = getTestStats(board.test, allCandidates);
  const yours = board.entries.find((e) => e.candidate.id === viewerId);
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
        <ChevronLeft className="w-4 h-4" />
        All leaderboards
      </button>
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
        {board.entries.length > 0 && (
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
        )}
      </div>
      {board.entries.length === 0 ? (
        <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-xl p-6 text-center">No one has taken this test yet. Take it to be first on the board.</p>
      ) : (
        <RankCards key={board.test.id} board={board} viewerId={viewerId} />
      )}
    </div>
  );
};

const PAGE = 12;

// The leaderboard as square cards, three to a row: rank, photo, name, score and time
const RankCards: React.FC<{ board: Board; viewerId: string }> = ({ board, viewerId }) => {
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [board.test.id]);
  const yours = board.entries.find((e) => e.candidate.id === viewerId);
  const visible = board.entries.slice(0, shown);
  const list = yours && !visible.includes(yours) ? [...visible, yours] : visible;
  return (
    <div className="space-y-4">
      <ol className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {list.map((e) => {
          const isYou = e.candidate.id === viewerId;
          const passed = e.score >= board.test.passingScore;
          return (
            <li
              key={e.candidate.id}
              className={`aspect-square min-w-0 rounded-xl border p-4 flex flex-col items-center justify-between text-center transition-shadow hover:shadow-sm ${
                isYou ? 'border-indigo-300 bg-indigo-50/60' : e.rank === 1 ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="w-full flex items-center justify-between">
                <RankDisc rank={e.rank} size="sm" />
                {isYou ? (
                  <span className="text-[10px] font-mono font-semibold uppercase text-indigo-700">You</span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400 tabular-nums">{formatDuration(e.durationSeconds)}</span>
                )}
              </div>
              <div className="min-w-0 w-full flex flex-col items-center gap-2">
                <Pic src={e.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover bg-slate-100" />
                <div className="min-w-0 w-full">
                  <div className="text-sm font-semibold text-slate-900 truncate">{e.candidate.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{e.candidate.title}</div>
                </div>
              </div>
              <div className={`font-mono text-2xl font-bold tabular-nums ${passed ? getBadgeTier(e.score).badgeTextColor : 'text-slate-400'}`}>
                {e.score}
                <span className="text-xs font-medium text-slate-400">/100</span>
              </div>
            </li>
          );
        })}
      </ol>
      {board.entries.length > shown && (
        <div className="text-center">
          <button
            onClick={() => setShown((n) => n + PAGE)}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg"
          >
            Show more ({board.entries.length - shown} left)
          </button>
        </div>
      )}
    </div>
  );
};
