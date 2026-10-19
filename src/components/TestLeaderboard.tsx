import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LeaderboardEntry } from '../lib/leaderboard';
import { getBadgeTier } from './VerifiedSkillBadge';
import { RankDisc } from './RankDisc';

const TOP_COUNT = 10;

export const formatDuration = (seconds?: number) => {
  if (seconds === undefined) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
};

const LeaderboardRow: React.FC<{ entry: LeaderboardEntry; passingScore: number; isYou: boolean }> = ({
  entry,
  passingScore,
  isYou,
}) => {
  const tier = getBadgeTier(entry.score);
  return (
    <div
      className={`grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[2.5rem_1fr_5rem_6rem_6rem] items-center gap-3 px-4 py-2.5 text-xs ${
        isYou ? 'bg-indigo-50' : ''
      }`}
    >
      <RankDisc rank={entry.rank} />
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src={entry.candidate.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="w-8 h-8 rounded-full object-cover shrink-0 bg-slate-100"
        />
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 truncate">
            {entry.candidate.name}
            {isYou && <span className="ml-1.5 text-[10px] font-mono uppercase text-indigo-700">You</span>}
          </div>
          <div className="text-[11px] text-slate-500 truncate">{entry.candidate.title}</div>
        </div>
      </div>
      <div className="text-right">
        <span className={`font-mono font-bold tabular-nums text-sm ${entry.score >= passingScore ? tier.badgeTextColor : 'text-slate-400'}`}>
          {entry.score}
        </span>
        <span className="text-[10px] text-slate-400 font-mono">/100</span>
      </div>
      <div className="hidden sm:block text-right font-mono tabular-nums text-slate-600">{formatDuration(entry.durationSeconds)}</div>
      <div className="hidden sm:block text-right font-mono tabular-nums text-slate-500">{entry.completedAt}</div>
    </div>
  );
};

interface TestLeaderboardProps {
  entries: LeaderboardEntry[];
  passingScore: number;
  currentCandidateId?: string;
}

export const TestLeaderboard: React.FC<TestLeaderboardProps> = ({ entries, passingScore, currentCandidateId }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? entries : entries.slice(0, TOP_COUNT);
  const yourEntry = entries.find((e) => e.candidate.id === currentCandidateId);
  const yourEntryHidden = yourEntry && !visible.includes(yourEntry);

  return (
    <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <button
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div>
          <h2 className="text-base font-bold text-slate-900">Leaderboard</h2>
          <p className="text-xs text-slate-500">
            {entries.length === 0
              ? 'No one has taken this test yet.'
              : `Best score per candidate · ${entries.length} ranked${showAll ? '' : ` · showing top ${Math.min(TOP_COUNT, entries.length)}`}`}
          </p>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && entries.length > 0 && (
        <div className="border-t border-slate-200">
          <div className="hidden sm:grid grid-cols-[2.5rem_1fr_5rem_6rem_6rem] gap-3 px-4 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-50">
            <span>Rank</span>
            <span>Candidate</span>
            <span className="text-right">Score</span>
            <span className="text-right">Time</span>
            <span className="text-right">Date</span>
          </div>

          <div className="divide-y divide-slate-100">
            {visible.map((entry) => (
              <LeaderboardRow
                key={entry.candidate.id}
                entry={entry}
                passingScore={passingScore}
                isYou={entry.candidate.id === currentCandidateId}
              />
            ))}
          </div>

          {/* Keep your own position in view when you're outside the top 10 */}
          {yourEntryHidden && (
            <div className="border-t border-dashed border-slate-200">
              <div className="px-4 pt-2 text-[10px] font-mono uppercase tracking-wider text-slate-400">Your position</div>
              <LeaderboardRow entry={yourEntry} passingScore={passingScore} isYou />
            </div>
          )}

          {entries.length > TOP_COUNT && (
            <button
              onClick={() => setShowAll((s) => !s)}
              aria-expanded={showAll}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-3 border-t border-slate-200 text-xs font-semibold text-indigo-700 hover:bg-slate-50 transition-colors"
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
