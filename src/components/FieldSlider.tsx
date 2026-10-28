import React from 'react';
import {
  BarChart3,
  Briefcase,
  Bug,
  Cloud,
  Database,
  Globe,
  Handshake,
  HeartPulse,
  KanbanSquare,
  Landmark,
  LayoutTemplate,
  LucideIcon,
  Megaphone,
  Server,
} from 'lucide-react';
import { AssessmentTest } from '../types';
import { FieldIcon, HOME_FIELDS, TestField } from '../lib/testRoles';
import { isMainVersion } from '../lib/testLevels';

const ICONS: Record<FieldIcon, LucideIcon> = {
  globe: Globe,
  layout: LayoutTemplate,
  chart: BarChart3,
  finance: Landmark,
  server: Server,
  megaphone: Megaphone,
  health: HeartPulse,
  database: Database,
  handshake: Handshake,
  cloud: Cloud,
  kanban: KanbanSquare,
  bug: Bug,
  briefcase: Briefcase,
};

// Tints cycle along the strip so neighbouring cards look different
const TINTS = [
  'bg-indigo-50 text-indigo-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-700',
  'bg-sky-50 text-sky-700',
  'bg-rose-50 text-rose-700',
];

// On Home in place of trending tests: fields of work drifting past; picking one opens the Tests page on its tests.
// It pauses while hovered or focused, and holds still (scrolling sideways instead) for people who prefer less motion
export const FieldSlider: React.FC<{ tests: AssessmentTest[]; onOpenField: (field: TestField) => void }> = ({ tests, onOpenField }) => {
  const mains = tests.filter((t) => t.type === 'standard' && isMainVersion(t));
  const fields = HOME_FIELDS.map((f, i) => ({
    ...f,
    tint: TINTS[i % TINTS.length],
    count: mains.filter((t) => t.roles?.some((r) => f.roles.includes(r))).length,
  })).filter((f) => f.count > 0);

  const card = (f: (typeof fields)[number], copy: number) => {
    const Icon = ICONS[f.icon];
    return (
      // Spaced with padding rather than a gap, so half the strip's width is exactly one set of cards
      <li key={`${f.label}-${copy}`} aria-hidden={copy > 0 || undefined} className={`shrink-0 pr-3 ${copy > 0 ? 'motion-reduce:hidden' : ''}`}>
        <button
          onClick={() => onOpenField(f)}
          tabIndex={copy > 0 ? -1 : undefined}
          className="w-44 h-full text-left bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-4 space-y-3 transition-colors shadow-xs group"
        >
          <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${f.tint}`}>
            <Icon className="w-4.5 h-4.5" />
          </span>
          <span className="block">
            <span className="block text-sm font-bold text-slate-900 group-hover:text-indigo-700 leading-snug">{f.label}</span>
            <span className="block text-[11px] text-slate-500 mt-0.5">{f.blurb}</span>
          </span>
          <span className="block text-[11px] font-semibold text-indigo-700">
            {f.count} {f.count === 1 ? 'test' : 'tests'}
          </span>
        </button>
      </li>
    );
  };

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
