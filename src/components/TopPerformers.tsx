import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Trophy } from 'lucide-react';
import { LeaderboardTable } from './LeaderboardTable';
import { AssessmentTest, User, isPublic, levelName } from '../types';
import { getLeaderboard } from '../lib/leaderboard';
import { isMainVersion } from '../lib/testLevels';

const ROTATE_MS = 5000;
const MAX_TESTS = 8;

// The public tests people have actually taken, busiest first, each with its leaderboard
export function rankedTests(tests: AssessmentTest[], candidates: User[]) {
  return tests
    .filter((t) => isPublic(t) && isMainVersion(t))
    .map((test) => ({ test, entries: getLeaderboard(test.id, candidates) }))
    .filter((b) => b.entries.length > 0)
    .sort((a, b) => b.entries.length - a.entries.length);
}

// Home's right-hand column: the top three on one test at a time, moving on to another test every 5 seconds.
// Hovering or focusing it holds the current test
export const TopPerformers: React.FC<{
  tests: AssessmentTest[];
  allCandidates: User[];
  onOpenTest: (testId: string) => void;
  onOpenRanked: () => void;
}> = ({ tests, allCandidates, onOpenTest, onOpenRanked }) => {
  const boards = useMemo(() => rankedTests(tests, allCandidates).slice(0, MAX_TESTS), [tests, allCandidates]);
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held || boards.length < 2) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % boards.length), ROTATE_MS);
    return () => clearTimeout(timer);
  }, [index, held, boards.length]);

  if (boards.length === 0) return null;
  const board = boards[index % boards.length];
  const top = board.entries.slice(0, 3);

  return (
    <section
      className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      aria-roledescription="carousel"
      aria-label="Top performers"
    >
      <div className="px-5 pt-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          Top performers
        </h2>
        <span className="text-[11px] text-slate-500 tabular-nums">
          {(index % boards.length) + 1} / {boards.length}
        </span>
      </div>

      {/* The test, then its top three; the whole block fades in as the test changes */}
      <div key={board.test.id} className="animate-[top-in_400ms_ease-out]" aria-live="polite">
        <button onClick={() => onOpenTest(board.test.id)} className="block w-full text-left px-5 pt-3 pb-4 group">
          <div className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 truncate">{board.test.title}</div>
          <div className="text-[11px] text-slate-500 truncate">
            {board.test.category} · {levelName(board.test.difficulty)} · {board.entries.length} ranked
          </div>
        </button>

        <div className="pb-3">
          <LeaderboardTable entries={top} passingScore={board.test.passingScore} slots={3} variant="compact" />
        </div>
      </div>

      {/* Which test is showing; each is a button to jump to it */}
      {boards.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-4" role="tablist" aria-label="Tests">
          {boards.map((b, i) => (
            <button
              key={b.test.id}
              role="tab"
              aria-selected={i === index % boards.length}
              aria-label={b.test.title}
              title={b.test.title}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === index % boards.length ? 'w-5 bg-slate-900' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
            />
          ))}
        </div>
      )}

      <button
        onClick={onOpenRanked}
        className="w-full flex items-center justify-center gap-1 px-5 py-3 border-t border-slate-100 text-xs font-semibold text-indigo-700 hover:text-indigo-800 hover:bg-slate-50"
      >
        See all leaderboards
        <ChevronRight className="w-4 h-4" />
      </button>
    </section>
  );
};
