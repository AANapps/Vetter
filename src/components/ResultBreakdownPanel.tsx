import React from 'react';
import { ResultBreakdown, TestDifficulty, levelName } from '../types';
import { MASTERY } from '../lib/modules';

interface ResultBreakdownPanelProps {
  breakdown: ResultBreakdown;
  // The level of the test taken, so "reached" reads against what was asked
  testLevel: TestDifficulty;
  compact?: boolean;
}

const barClass = (score: number) => (score >= MASTERY ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-rose-500');

// A module test's result: the level reached, then the score at each level and in each core area
export const ResultBreakdownPanel: React.FC<ResultBreakdownPanelProps> = ({ breakdown, testLevel, compact }) => {
  const reached = breakdown.levelReached;
  const weakest = [...breakdown.aspects].sort((a, b) => a.score - b.score)[0];
  return (
    <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-bold text-slate-900">
          Level reached:{' '}
          <span className={reached ? 'text-emerald-700' : 'text-rose-700'}>{reached ? levelName(reached) : 'Not yet Junior'}</span>
        </div>
        <div className="text-[11px] text-slate-500">
          {reached === testLevel
            ? `Every level up to ${levelName(testLevel)} at ${MASTERY}+`
            : `Each level counts once it and every level below score ${MASTERY}+`}
        </div>
      </div>
      <div className="flex gap-1.5" aria-label="Score at each level">
        {breakdown.tiers.map((t) => (
          <div key={t.tier} className="flex-1 min-w-0">
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full ${barClass(t.score)}`} style={{ width: `${t.score}%` }} />
            </div>
            <div className="mt-1 flex justify-between gap-1 text-[10px] text-slate-500">
              <span className="truncate">{levelName(t.tier)}</span>
              <span className="font-mono tabular-nums text-slate-700">{t.score}</span>
            </div>
          </div>
        ))}
      </div>
      {!compact && (
        <div className="space-y-1.5">
          <div className="font-semibold text-slate-900">By area</div>
          {breakdown.aspects.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <span className="w-36 sm:w-44 shrink-0 truncate text-slate-600">{a.name}</span>
              <span className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <span className={`block h-full ${barClass(a.score)}`} style={{ width: `${a.score}%` }} />
              </span>
              <span className="w-8 text-right font-mono tabular-nums text-slate-700">{a.score}</span>
            </div>
          ))}
        </div>
      )}
      {compact && weakest && weakest.score < MASTERY && (
        <div className="text-[11px] text-slate-500">
          Weakest area: <span className="text-slate-700 font-medium">{weakest.name}</span> ({weakest.score})
        </div>
      )}
    </div>
  );
};
