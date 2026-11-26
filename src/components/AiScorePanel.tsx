import React from 'react';
import { Sparkles } from 'lucide-react';
import { ResultBreakdown } from '../types';
import { AI_MODES, CAPABILITIES } from '../lib/capabilities';

// The AI score beside the job score, with each AI competency's (src/lib/capabilities.ts): kept apart, so working with
// AI never hides or props up the job score
export const AiScorePanel: React.FC<{ ai: NonNullable<ResultBreakdown['ai']>; compact?: boolean }> = ({ ai, compact }) => {
  const tone = (n: number) => (n >= 80 ? 'text-emerald-700' : n >= 50 ? 'text-amber-700' : 'text-rose-700');
  return (
    <div className={`rounded-lg border border-violet-200 bg-violet-50/40 ${compact ? 'px-3 py-2' : 'p-3'} text-xs`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-bold text-violet-900 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Working with AI
          {ai.mode && <span className="font-medium text-violet-700">· {AI_MODES[ai.mode].label}</span>}
        </span>
        <span className={`font-mono text-base font-bold tabular-nums ${tone(ai.score)}`}>{ai.score}</span>
      </div>
      {ai.competencies.length > 0 && (
        <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {ai.competencies.map((c) => (
            <li key={c.id} title={CAPABILITIES[c.id].question}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-slate-700">{CAPABILITIES[c.id].label}</span>
                <span className={`font-mono font-semibold tabular-nums ${tone(c.score)}`}>{c.score}</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-violet-100 overflow-hidden" aria-hidden>
                <div className="h-full rounded-full bg-violet-600" style={{ width: `${c.score}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
