import React from 'react';
import { Plus } from 'lucide-react';
import { LeaderboardEntry } from '../lib/leaderboard';
import { Pic } from './Pic';
import { RankDisc } from './RankDisc';
import { getBadgeTier } from './VerifiedSkillBadge';

export const formatDuration = (seconds?: number) => {
  if (seconds === undefined) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s < 10 ? '0' : ''}${s}s`;
};

interface LeaderboardTableProps {
  // The ranked rows to show, best first
  entries: LeaderboardEntry[];
  passingScore?: number;
  viewerId?: string;
  // The board always shows at least this many places: the first empty one invites the viewer to claim it, the rest
  // read "Not yet ranked"
  slots?: number;
  // Shown under the rows when the viewer is ranked lower than the rows shown
  pinned?: LeaderboardEntry;
  // 'full' has time and date columns and the candidate's title; 'compact' is rank, name and score, for cards
  variant?: 'full' | 'compact';
  // Opens the test, from the open place's "Take the test" link
  onClaim?: () => void;
  // Hide the column headings (small cards)
  bare?: boolean;
}

const COLS = {
  full: 'grid-cols-[2.25rem_minmax(0,1fr)_5.5rem] sm:grid-cols-[2.25rem_minmax(0,1fr)_7rem_5rem] md:grid-cols-[2.25rem_minmax(0,1fr)_7rem_5rem_5.5rem]',
  compact: 'grid-cols-[1.75rem_minmax(0,1fr)_3.5rem]',
};

// Vetter's leaderboard as a table: rank, candidate, score (with a thin bar) and, in full, time and date. Short boards
// are padded out so they never look empty: the next place is open for the viewer to take, the rest not yet ranked
export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  entries,
  passingScore = 0,
  viewerId,
  slots = 0,
  pinned,
  variant = 'full',
  onClaim,
  bare,
}) => {
  const full = variant === 'full';
  const cols = COLS[variant];
  const viewerRanked = !!viewerId && (entries.some((e) => e.candidate.id === viewerId) || pinned?.candidate.id === viewerId);
  const open = Math.max(0, slots - entries.length);
  const nextRank = (entries.at(-1)?.rank ?? 0) + 1;
  const pad = full ? 'px-5' : 'px-3';
  const avatar = full ? 'w-9 h-9' : 'w-7 h-7';

  const row = (e: LeaderboardEntry) => {
    const isYou = !!viewerId && e.candidate.id === viewerId;
    const passed = e.score >= passingScore;
    const tier = getBadgeTier(e.score);
    return (
      <li key={e.candidate.id} className={`grid ${cols} items-center gap-3 ${pad} ${full ? 'py-3' : 'py-2'} transition-colors ${isYou ? 'bg-indigo-50/70' : 'hover:bg-slate-50/70'}`}>
        <span className="flex justify-center">
          <RankDisc rank={e.rank} size={full ? 'md' : 'sm'} />
        </span>
        <span className="flex items-center gap-3 min-w-0">
          <Pic src={e.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className={`${avatar} rounded-full object-cover shrink-0 bg-slate-100 ring-2 ring-white`} />
          <span className="min-w-0">
            <span className={`flex items-center gap-1.5 ${full ? 'text-sm' : 'text-xs'} font-semibold text-slate-900`}>
              <span className="truncate">{e.candidate.name}</span>
              {isYou && <span className="shrink-0 px-1.5 py-px rounded-full bg-indigo-600 text-white text-[9px] font-bold uppercase tracking-wider">You</span>}
            </span>
            {full && e.candidate.title && <span className="block text-[11px] text-slate-500 truncate">{e.candidate.title}</span>}
          </span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className={`font-mono font-bold tabular-nums leading-none ${full ? 'text-base' : 'text-sm'} ${passed ? 'text-slate-900' : 'text-slate-400'}`}>
            {e.score}
            {full && <span className="text-[10px] font-medium text-slate-400">/100</span>}
          </span>
          {full && (
            <span className="w-full max-w-[5rem] h-1 rounded-full bg-slate-100 overflow-hidden">
              <span className={`block h-full rounded-full ${passed ? tier.barClass : 'bg-slate-300'}`} style={{ width: `${e.score}%` }} />
            </span>
          )}
        </span>
        {full && <span className="hidden sm:block text-right text-xs font-mono tabular-nums text-slate-500">{formatDuration(e.durationSeconds)}</span>}
        {full && <span className="hidden md:block text-right text-xs font-mono tabular-nums text-slate-400">{e.completedAt}</span>}
      </li>
    );
  };

  const empty = (rank: number, invite: boolean) => (
    <li key={`open-${rank}`} className={`grid ${cols} items-center gap-3 ${pad} ${full ? 'py-3' : 'py-2'}`}>
      <span className={`text-center font-mono font-bold tabular-nums ${full ? 'text-xs' : 'text-[10px]'} ${invite ? 'text-indigo-600' : 'text-slate-300'}`}>{rank}</span>
      <span className="flex items-center gap-3 min-w-0">
        <span
          className={`${avatar} rounded-full shrink-0 flex items-center justify-center ${
            invite ? 'border-[1.5px] border-dashed border-indigo-300 text-indigo-500 bg-indigo-50/50' : 'bg-slate-100'
          }`}
        >
          {invite && <Plus className={full ? 'w-4 h-4' : 'w-3 h-3'} />}
        </span>
        {invite ? (
          <span className="min-w-0">
            <span className={`block ${full ? 'text-sm' : 'text-xs'} font-semibold text-indigo-700 truncate`}>{viewerRanked || !viewerId ? 'Open spot' : 'Your spot'}</span>
            {full && (
              <span className="block text-[11px] text-slate-500 truncate">
                {onClaim ? (
                  <button onClick={onClaim} className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline">
                    Take the test
                  </button>
                ) : (
                  'Take the test'
                )}{' '}
                to claim #{rank}
              </span>
            )}
          </span>
        ) : (
          <span className={`${full ? 'text-sm' : 'text-xs'} text-slate-300 truncate`}>Not yet ranked</span>
        )}
      </span>
      <span className={`text-right font-mono ${full ? 'text-base' : 'text-sm'} text-slate-200`}>&mdash;</span>
      {full && <span className="hidden sm:block" />}
      {full && <span className="hidden md:block" />}
    </li>
  );

  return (
    <div>
      {!bare && (
        <div className={`grid ${cols} gap-3 ${pad} py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 border-b border-slate-100`}>
          <span className="text-center">#</span>
          <span>Candidate</span>
          <span className="text-right">Score</span>
          {full && <span className="hidden sm:block text-right">Time</span>}
          {full && <span className="hidden md:block text-right">Date</span>}
        </div>
      )}
      <ol className="divide-y divide-slate-100">
        {entries.map(row)}
        {Array.from({ length: open }, (_, i) => empty(nextRank + i, i === 0))}
      </ol>
      {pinned && !entries.includes(pinned) && (
        <div className="border-t border-dashed border-slate-200">
          <div className={`${pad} pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400`}>Your position</div>
          <ol>{row(pinned)}</ol>
        </div>
      )}
    </div>
  );
};
