import React from 'react';
import { Briefcase, ListChecks, Lock } from 'lucide-react';
import { TestKind } from '../types';

// The two things Vetter's AI writes, as two big buttons: the company picks before anything is written
export const TEST_KINDS: { kind: TestKind; label: string; hint: string; icon: React.ElementType }[] = [
  {
    kind: 'test',
    label: 'Skills test',
    hint: 'Separate questions and tasks, each with its own scenario. Quick to take, tests the skills one by one.',
    icon: ListChecks,
  },
  {
    kind: 'simulation',
    label: 'Job simulation',
    hint: 'A working day at your company: colleagues, emails to answer and who to copy in, the real tools, and AI to work with.',
    icon: Briefcase,
  },
];

export const TestKindPicker: React.FC<{ onPick: (kind: TestKind) => void; locked?: boolean; compact?: boolean }> = ({ onPick, locked, compact }) => (
  <div className={`grid gap-3 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 max-w-2xl w-full'}`}>
    {TEST_KINDS.map(({ kind, label, hint, icon: Icon }) => (
      <button
        key={kind}
        onClick={() => onPick(kind)}
        className={`group text-left rounded-2xl border-2 bg-white transition-colors flex flex-col gap-2 ${compact ? 'p-4' : 'p-6'} ${
          kind === 'simulation' ? 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
        }`}
      >
        <span className="flex items-center gap-2.5">
          <span className={`${compact ? 'w-9 h-9' : 'w-11 h-11'} rounded-xl flex items-center justify-center ${kind === 'simulation' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            <Icon className={compact ? 'w-4.5 h-4.5' : 'w-5 h-5'} />
          </span>
          <span className={`${compact ? 'text-base' : 'text-lg'} font-bold text-slate-900`}>{label}</span>
          {locked && <Lock className="w-3.5 h-3.5 text-slate-400 ml-auto" />}
        </span>
        <span className="text-sm text-slate-600 leading-relaxed">{hint}</span>
      </button>
    ))}
  </div>
);
