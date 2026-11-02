import React from 'react';
import { ArrowRight } from 'lucide-react';
import { AssessmentTest } from '../types';
import { HOME_FIELDS, TestField } from '../lib/testRoles';
import { isMainVersion } from '../lib/testLevels';

// On Home in place of trending tests: fields of work drifting past; picking one opens the Tests page on its tests.
// It pauses while hovered or focused, and holds still (scrolling sideways instead) for people who prefer less motion
export const FieldSlider: React.FC<{ tests: AssessmentTest[]; onOpenField: (field: TestField) => void }> = ({ tests, onOpenField }) => {
  const mains = tests.filter((t) => t.type === 'standard' && isMainVersion(t));
  const fields = HOME_FIELDS.map((f) => ({
    ...f,
    count: mains.filter((t) => t.roles?.some((r) => f.roles.includes(r))).length,
  })).filter((f) => f.count > 0);

  const card = (f: (typeof fields)[number], copy: number) => (
    // Spaced with padding rather than a gap, so half the strip's width is exactly one set of cards
    <li key={`${f.label}-${copy}`} aria-hidden={copy > 0 || undefined} className={`shrink-0 pr-2.5 ${copy > 0 ? 'motion-reduce:hidden' : ''}`}>
      <button
        onClick={() => onOpenField(f)}
        tabIndex={copy > 0 ? -1 : undefined}
        className="group w-52 h-full text-left bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-xl px-4 py-3.5 flex flex-col gap-1 transition-colors"
      >
        <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 leading-snug truncate">{f.label}</span>
        <span className="text-xs text-slate-500 leading-snug line-clamp-1">{f.blurb}</span>
        <span className="mt-2 w-full flex items-center justify-between text-xs">
          <span className="font-mono tabular-nums text-slate-500">
            {f.count} {f.count === 1 ? 'test' : 'tests'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </span>
      </button>
    </li>
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Explore by field</h2>
        <p className="text-xs text-slate-500">Pick one to see its tests.</p>
      </div>
      <div className="group/strip relative overflow-hidden motion-reduce:overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]">
        <ul className="flex w-max py-1 animate-marquee motion-reduce:animate-none group-hover/strip:[animation-play-state:paused] group-focus-within/strip:[animation-play-state:paused]">
          {fields.map((f) => card(f, 0))}
          {/* The second copy makes the loop seamless; hidden from screen readers and keyboard */}
          {fields.map((f) => card(f, 1))}
        </ul>
      </div>
    </section>
  );
};
