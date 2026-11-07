import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LeaderboardEntry } from '../lib/leaderboard';
import { LeaderboardTable } from './LeaderboardTable';

export { formatDuration } from './LeaderboardTable';

const TOP_COUNT = 10;
// A short board is padded to this many places: the next one open to claim, the rest not yet ranked
const SLOTS = 5;

interface TestLeaderboardProps {
  entries: LeaderboardEntry[];
  passingScore: number;
  currentCandidateId?: string;
  // Starts the test, from the open place on the board
  onTakeTest?: () => void;
}

// A test page's leaderboard: the top ten, then all of them on request; the viewer's own place stays in view
export const TestLeaderboard: React.FC<TestLeaderboardProps> = ({ entries, passingScore, currentCandidateId, onTakeTest }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? entries : entries.slice(0, TOP_COUNT);
  const yourEntry = entries.find((e) => e.candidate.id === currentCandidateId);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h2 className="text-base font-bold text-slate-900">Leaderboard</h2>
          <p className="text-xs text-slate-500">
            {entries.length === 0
              ? 'No one is ranked yet. The first place is open.'
              : `Best score per candidate · ${entries.length} ranked${showAll || entries.length <= TOP_COUNT ? '' : ` · showing top ${TOP_COUNT}`}`}
          </p>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="border-t border-slate-100">
          <LeaderboardTable
            entries={visible}
            passingScore={passingScore}
            viewerId={currentCandidateId}
            slots={SLOTS}
            pinned={yourEntry}
            onClaim={onTakeTest}
          />
          {entries.length > TOP_COUNT && (
            <button
              onClick={() => setShowAll((s) => !s)}
              aria-expanded={showAll}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-t border-slate-100 text-xs font-semibold text-indigo-700 hover:bg-slate-50 transition-colors"
            >
              <span>{showAll ? `Show top ${TOP_COUNT}` : `See all ${entries.length} candidates`}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      )}
    </section>
  );
};
