import React from 'react';
import { AssessmentTest } from '../types';

interface LevelPickerProps {
  versions: AssessmentTest[];
  selectedId: string;
  onSelect: (testId: string) => void;
  // Best score per version, shown under each level the viewer has taken
  bestScores?: Record<string, number | undefined>;
}

// Beginner / Junior / Professional / Senior tabs for a test's versions
export const LevelPicker: React.FC<LevelPickerProps> = ({ versions, selectedId, onSelect, bestScores }) => (
  <div role="tablist" aria-label="Level" className="inline-flex flex-wrap rounded-lg ring-1 ring-slate-200 bg-white p-0.5">
    {versions.map((v) => {
      const active = v.id === selectedId;
      const best = bestScores?.[v.id];
      return (
        <button
          key={v.id}
          role="tab"
          aria-selected={active}
          onClick={() => onSelect(v.id)}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
            active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {v.difficulty}
          {best !== undefined && <span className={`ml-1 font-mono ${active ? 'text-slate-300' : 'text-slate-400'}`}>{best}</span>}
        </button>
      );
    })}
  </div>
);
