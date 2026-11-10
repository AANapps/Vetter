import React from 'react';
import { ArrowRight, Check, Lock } from 'lucide-react';
import { TestKind } from '../types';

// The two kinds of test Vetter's AI builds for a hire, each with a moving sketch of what the candidate gets
export const KIND_CARDS: { kind: 'simulation' | 'standalone'; label: string; blurb: string }[] = [
  {
    kind: 'simulation',
    label: 'Job simulation test',
    blurb: 'Short answers, tick boxes, ordering and written questions, mixed with interactive simulations of the work.',
  },
  {
    kind: 'standalone',
    label: 'Interactive simulation',
    blurb: 'One advanced simulation of the job, with tasks to complete one by one. Marked on the tasks done right.',
  },
];

export const kindLabel = (kind?: TestKind) =>
  kind === 'training' ? 'Training' : kind === 'standalone' ? 'Interactive simulation' : kind === 'test' ? 'Skills test' : 'Job simulation test';

// A test's questions, one being answered, then a simulation among them
const TestSketch: React.FC = () => (
  <div className="kind-sketch h-36 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex gap-2 overflow-hidden" aria-hidden>
    <div className="flex-1 min-w-0 rounded-md bg-white border border-slate-200 p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-semibold text-slate-400">Question 3 of 18</span>
        <span className="h-1 w-10 rounded-full bg-slate-200 overflow-hidden">
          <span className="kind-progress block h-full bg-indigo-500" />
        </span>
      </div>
      <span className="block h-1.5 w-11/12 rounded bg-slate-200" />
      <span className="block h-1.5 w-2/3 rounded bg-slate-200" />
      {[0, 1, 2].map((i) => (
        <span key={i} className={`kind-option kind-option-${i} flex items-center gap-1.5 rounded border border-slate-200 px-1.5 py-0.5`}>
          <span className="kind-box w-2.5 h-2.5 rounded-sm border border-slate-300 flex items-center justify-center">
            <Check className="kind-check w-2 h-2 text-white" strokeWidth={4} />
          </span>
          <span className={`h-1 rounded bg-slate-200 ${i === 1 ? 'w-3/5' : i === 2 ? 'w-2/5' : 'w-1/2'}`} />
        </span>
      ))}
    </div>
    <div className="w-[38%] shrink-0 rounded-md bg-white border border-slate-200 p-1.5 flex flex-col">
      <span className="text-[9px] font-semibold text-indigo-600">Simulation</span>
      <svg viewBox="0 0 80 56" className="mt-1 flex-1 w-full">
        <rect x="2" y="40" width="76" height="14" rx="2" className="fill-slate-200" />
        <rect x="6" y="18" width="20" height="22" rx="2" className="fill-indigo-100 stroke-indigo-300" />
        <circle cx="16" cy="29" r="4" className="kind-lamp" />
        <path d="M26 29 H50 V40" className="kind-wire" fill="none" strokeWidth="2" />
        <rect x="46" y="12" width="28" height="16" rx="2" className="fill-slate-100 stroke-slate-300" />
        <g className="kind-drag">
          <rect x="52" y="16" width="16" height="8" rx="1.5" className="fill-amber-300 stroke-amber-500" />
        </g>
      </svg>
    </div>
  </div>
);

// A scene on a clock, people arriving, and the task card working down its list
const SimulationSketch: React.FC = () => (
  <div className="kind-sketch h-36 rounded-lg bg-slate-50 border border-slate-200 p-2.5 flex gap-2 overflow-hidden" aria-hidden>
    <div className="flex-1 min-w-0 rounded-md bg-white border border-slate-200 p-1.5 flex flex-col">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-semibold text-slate-400">The floor</span>
        <span className="text-[9px] font-mono font-semibold text-slate-600 tabular-nums">
          09<span className="kind-colon">:</span>14
        </span>
      </div>
      <svg viewBox="0 0 120 60" className="mt-1 flex-1 w-full">
        <rect x="0" y="44" width="120" height="16" className="fill-slate-100" />
        <rect x="70" y="26" width="46" height="18" rx="2" className="fill-indigo-100 stroke-indigo-300" />
        <rect x="76" y="20" width="10" height="6" rx="1" className="fill-slate-300" />
        <g className="kind-walk kind-walk-0">
          <circle cx="10" cy="30" r="4" className="fill-amber-300" />
          <rect x="6" y="34" width="8" height="10" rx="3" className="fill-sky-400" />
        </g>
        <g className="kind-walk kind-walk-1">
          <circle cx="10" cy="30" r="4" className="fill-rose-200" />
          <rect x="6" y="34" width="8" height="10" rx="3" className="fill-emerald-400" />
        </g>
        <g className="kind-bubble">
          <rect x="40" y="6" width="26" height="12" rx="3" className="fill-slate-100 stroke-slate-300" />
          <rect x="44" y="11" width="18" height="2" rx="1" className="fill-slate-300" />
        </g>
      </svg>
    </div>
    <div className="w-[42%] shrink-0 rounded-md bg-white border border-slate-200 p-1.5 space-y-1">
      <span className="block text-[9px] font-semibold text-indigo-600">Task card</span>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`kind-task kind-task-${i} flex items-center gap-1`}>
          <span className="kind-box w-2.5 h-2.5 shrink-0 rounded-full border border-slate-300 flex items-center justify-center">
            <Check className="kind-check w-2 h-2 text-white" strokeWidth={4} />
          </span>
          <span className={`h-1 rounded bg-slate-200 ${i % 2 ? 'w-3/5' : 'w-4/5'}`} />
        </span>
      ))}
    </div>
  </div>
);

// The choice of what to build, as two cards. The other kind goes first when offering something more after a build
export const KindChoice: React.FC<{
  aiAllowed: boolean;
  onPick: (kind: TestKind) => void;
  // A kind just built: its card says so, and the other one leads
  built?: TestKind;
}> = ({ aiAllowed, onPick, built }) => {
  const cards = built ? [...KIND_CARDS.filter((c) => c.kind !== built), ...KIND_CARDS.filter((c) => c.kind === built)] : KIND_CARDS;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <button
          key={c.kind}
          onClick={() => onPick(c.kind)}
          className="group text-left p-3 bg-white border border-slate-200 hover:border-indigo-400 rounded-xl flex flex-col gap-2.5 transition-colors"
        >
          {c.kind === 'simulation' ? <TestSketch /> : <SimulationSketch />}
          <span>
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">{c.label}</span>
              {built === c.kind && <span className="text-[10px] font-semibold text-slate-500">Just made one</span>}
            </span>
            <span className="block mt-0.5 text-xs text-slate-600 leading-relaxed">{c.blurb}</span>
          </span>
          <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">
            {!aiAllowed && <Lock className="w-3 h-3" />}
            {built === c.kind ? 'Build another' : `Build ${c.kind === 'simulation' ? 'this test' : 'this simulation'}`}
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      ))}
    </div>
  );
};
