import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react';
import { AssessmentTest, User } from '../types';
import { LeaderboardEntry, getLeaderboard } from '../lib/leaderboard';
import { trendingTests } from '../lib/feed';
import { isMainVersion } from '../lib/testLevels';
import { getBadgeTier } from './VerifiedSkillBadge';
import { RankDisc } from './RankDisc';

const BOARD_COUNT = 5;
const ROWS = 5;
const ROTATE_MS = 9000;
// A best score set this recently is marked as just in
const FRESH_MS = 45000;

interface LiveLeaderboardsProps {
  tests: AssessmentTest[];
  allCandidates: User[];
  viewerId: string;
  onOpenTest: (testId: string) => void;
}

// Top of the Discover column on Home: the busiest tests' leaderboards, moving as people take them
export const LiveLeaderboards: React.FC<LiveLeaderboardsProps> = ({ tests, allCandidates, viewerId, onOpenTest }) => {
  const trending = trendingTests(allCandidates, tests, BOARD_COUNT).map((t) => t.test);
  const boards = trending.length > 0 ? trending : tests.filter((t) => t.type === 'standard' && isMainVersion(t)).slice(0, BOARD_COUNT);

  // Which boards to show stays put while trending reshuffles underneath, so the tabs don't jump
  const [boardIds] = useState(() => boards.map((t) => t.id));
  const boardTests = boardIds.flatMap((id) => tests.find((t) => t.id === id) ?? []);
  const [selectedId, setSelectedId] = useState(boardIds[0]);
  // Cycles through the boards until the viewer picks one
  const [isRotating, setIsRotating] = useState(true);

  useEffect(() => {
    if (!isRotating || boardIds.length < 2) return;
    const timer = setInterval(
      () => setSelectedId((id) => boardIds[(boardIds.indexOf(id) + 1) % boardIds.length]),
      ROTATE_MS
    );
    return () => clearInterval(timer);
  }, [isRotating, boardIds]);

  // Ranks when each board was first shown, to show who has climbed or slipped since
  const baseline = useRef(new Map<string, Map<string, number>>());
  const test = boardTests.find((t) => t.id === selectedId);
  if (!test) return null;
  const entries = getLeaderboard(test.id, allCandidates);
  if (!baseline.current.has(test.id)) {
    baseline.current.set(test.id, new Map(entries.map((e) => [e.candidate.id, e.rank])));
  }
  const startRanks = baseline.current.get(test.id)!;
  const top = entries.slice(0, ROWS);
  const yours = entries.find((e) => e.candidate.id === viewerId);
  const now = Date.now();

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
          </span>
          <h2 className="text-base font-bold text-slate-900">Live leaderboards</h2>
        </div>
        <span className="text-[11px] text-slate-500 tabular-nums">{entries.length} ranked</span>
      </div>

      <div className="px-5 pb-3 flex gap-1.5 overflow-x-auto">
        {boardTests.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setSelectedId(t.id);
              setIsRotating(false);
            }}
            aria-pressed={t.id === selectedId}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
              t.id === selectedId ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>

      {top.length === 0 ? (
        <p className="px-5 py-6 border-t border-slate-100 text-xs text-slate-500 text-center">No one has taken this test yet.</p>
      ) : (
        <ol className="border-t border-slate-100 divide-y divide-slate-100">
          {top.map((entry) => (
            <LiveRow
              key={entry.candidate.id}
              entry={entry}
              passingScore={test.passingScore}
              startRank={startRanks.get(entry.candidate.id)}
              isFresh={!!entry.completedTime && now - new Date(entry.completedTime).getTime() < FRESH_MS}
              isYou={entry.candidate.id === viewerId}
            />
          ))}
          {yours && !top.includes(yours) && (
            <LiveRow
              entry={yours}
              passingScore={test.passingScore}
              startRank={startRanks.get(yours.candidate.id)}
              isFresh={false}
              isYou
            />
          )}
        </ol>
      )}

      <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100">
        <span className="text-[11px] text-slate-500 truncate">
          {yours ? `You're #${yours.rank} of ${entries.length}` : 'Take it to get ranked'}
        </span>
        <button
          onClick={() => onOpenTest(test.id)}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800 shrink-0"
        >
          {yours ? 'Full leaderboard' : 'Take this test'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

const LiveRow: React.FC<{
  entry: LeaderboardEntry;
  passingScore: number;
  startRank?: number;
  isFresh: boolean;
  isYou: boolean;
}> = ({ entry, passingScore, startRank, isFresh, isYou }) => {
  const moved = startRank === undefined ? undefined : startRank - entry.rank;
  return (
    <li
      className={`grid grid-cols-[1.75rem_1fr_auto_2.5rem] items-center gap-3 px-5 py-2.5 text-xs transition-colors duration-700 ${
        isYou ? 'bg-indigo-50' : isFresh ? 'bg-emerald-50' : ''
      }`}
    >
      <RankDisc rank={entry.rank} />
      <div className="flex items-center gap-2.5 min-w-0">
        <img src={entry.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover shrink-0 bg-slate-100" />
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 truncate">
            {entry.candidate.name}
            {isYou && <span className="ml-1.5 text-[10px] font-mono uppercase text-indigo-700">You</span>}
            {isFresh && !isYou && <span className="ml-1.5 text-[10px] font-semibold text-emerald-700">just now</span>}
          </div>
          <div className="text-[11px] text-slate-500 truncate">{entry.candidate.title}</div>
        </div>
      </div>
      <div className="text-right">
        <span className={`font-mono font-bold tabular-nums text-sm ${entry.score >= passingScore ? getBadgeTier(entry.score).badgeTextColor : 'text-slate-400'}`}>
          {entry.score}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">/100</span>
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-right">
        {moved === undefined ? (
          <span className="text-emerald-700">New</span>
        ) : moved > 0 ? (
          <span className="inline-flex items-center text-emerald-700">
            <ArrowUp className="w-3 h-3" />
            {moved}
          </span>
        ) : moved < 0 ? (
          <span className="inline-flex items-center text-rose-600">
            <ArrowDown className="w-3 h-3" />
            {-moved}
          </span>
        ) : (
          <span className="text-slate-300">–</span>
        )}
      </span>
    </li>
  );
};
