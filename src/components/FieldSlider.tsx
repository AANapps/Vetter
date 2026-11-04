import React, { useEffect, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { AssessmentTest, isPublic } from '../types';
import { HOME_FIELDS, TestField } from '../lib/testRoles';
import { isMainVersion } from '../lib/testLevels';

// On Home in place of trending tests: fields of work drifting past; picking one opens the Tests page on its tests.
// It can be scrolled by hand (trackpad, touch, or the arrows either side) and loops endlessly. It pauses while hovered,
// focused or just after being moved, and holds still for people who prefer less motion
const DRIFT_MS_PER_LOOP = 60000; // how long one full pass of the cards takes
const HOLD_AFTER_MOVE_MS = 2500; // drift waits this long after the strip is moved by hand
const ARROW_MS = 450;

export const FieldSlider: React.FC<{ tests: AssessmentTest[]; onOpenField: (field: TestField) => void }> = ({ tests, onOpenField }) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const pos = useRef(0); // scroll position, kept as a fraction since scrollLeft rounds
  const paused = useRef(false); // hovered or focused
  const holdUntil = useRef(0);
  const glide = useRef<{ from: number; to: number; start: number } | null>(null);
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const el = stripRef.current;
      const dt = Math.min(now - last, 100);
      last = now;
      if (el) {
        // The cards are listed twice, so half the strip is one full set: positions wrap around it
        const half = el.scrollWidth / 2;
        let next: number | null = null;
        const g = glide.current;
        if (g) {
          const p = Math.min(1, (now - g.start) / ARROW_MS);
          next = g.from + (g.to - g.from) * (1 - Math.pow(1 - p, 3));
          if (p === 1) {
            glide.current = null;
            holdUntil.current = now + HOLD_AFTER_MOVE_MS;
          }
        } else if (!paused.current && now > holdUntil.current) {
          next = pos.current + (dt * half) / DRIFT_MS_PER_LOOP;
        } else {
          // Moved by hand, or resting: follow it, wrapping at either end so it never runs out
          if (half > 0 && el.scrollLeft >= half) el.scrollLeft -= half;
          else if (half > 0 && el.scrollLeft <= 0) el.scrollLeft = half; // the same view, with room to keep going left
          pos.current = el.scrollLeft;
        }
        if (next !== null && half > 0) {
          pos.current = ((next % half) + half) % half;
          el.scrollLeft = pos.current;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion]);

  const held = () => {
    holdUntil.current = performance.now() + HOLD_AFTER_MOVE_MS;
  };

  const step = (dir: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    const by = dir * Math.max(220, el.clientWidth * 0.75);
    if (reduceMotion) {
      el.scrollBy({ left: by, behavior: 'smooth' });
      return;
    }
    const from = glide.current ? glide.current.to : pos.current;
    glide.current = { from, to: from + by, start: performance.now() };
  };
  const mains = tests.filter((t) => isPublic(t) && isMainVersion(t));
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
      <div
        className="relative"
        onMouseEnter={() => (paused.current = true)}
        onMouseLeave={() => {
          paused.current = false;
          held();
        }}
        onFocus={() => (paused.current = true)}
        onBlur={() => (paused.current = false)}
      >
        <div
          ref={stripRef}
          onWheel={held}
          onTouchStart={held}
          onTouchMove={held}
          onPointerDown={held}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,transparent,black_2.5rem,black_calc(100%-2.5rem),transparent)]"
        >
          <ul className="flex w-max py-1">
            {fields.map((f) => card(f, 0))}
            {/* The second copy makes the loop seamless; hidden from screen readers and keyboard */}
            {fields.map((f) => card(f, 1))}
          </ul>
        </div>
        {([-1, 1] as const).map((dir) => (
          <button
            key={dir}
            type="button"
            onClick={() => step(dir)}
            aria-label={dir < 0 ? 'Scroll fields left' : 'Scroll fields right'}
            className={`absolute top-1/2 -translate-y-1/2 ${dir < 0 ? 'left-0' : 'right-0'} w-8 h-8 rounded-full bg-white/70 border border-slate-200/70 text-slate-400 opacity-60 hover:opacity-100 hover:text-indigo-600 hover:border-indigo-300 focus-visible:opacity-100 flex items-center justify-center shadow-sm backdrop-blur-sm transition`}
          >
            {dir < 0 ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ))}
      </div>
    </section>
  );
};
