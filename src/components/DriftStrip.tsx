import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// A row of cards that slowly drifts sideways and loops endlessly (Home's fields, the AI at Work tests).
// It can be scrolled by hand (trackpad, touch, or the arrows either side). It pauses while hovered,
// focused or just after being moved, and holds still for people who prefer less motion
const HOLD_AFTER_MOVE_MS = 2500; // drift waits this long after the strip is moved by hand
const ARROW_MS = 450;

export function DriftStrip<T>({
  items,
  itemKey,
  render,
  label,
  msPerLoop = 60000,
  gapClass = 'pr-2.5',
}: {
  items: T[];
  itemKey: (item: T) => string;
  render: (item: T) => React.ReactNode;
  label: string; // e.g. "fields", used for the arrows' labels
  msPerLoop?: number; // how long one full pass of the cards takes
  gapClass?: string; // right padding on each card (padding, not gap, so half the strip is exactly one set)
}) {
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
          next = pos.current + (dt * half) / msPerLoop;
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
  }, [reduceMotion, msPerLoop]);

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

  const cell = (item: T, copy: number) => (
    // The second copy makes the loop seamless; hidden from screen readers and keyboard
    <li key={`${itemKey(item)}-${copy}`} aria-hidden={copy > 0 || undefined} inert={copy > 0 || undefined} className={`shrink-0 ${gapClass} ${copy > 0 ? 'motion-reduce:hidden' : ''}`}>
      {render(item)}
    </li>
  );

  return (
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
          {items.map((it) => cell(it, 0))}
          {items.map((it) => cell(it, 1))}
        </ul>
      </div>
      {([-1, 1] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => step(dir)}
          aria-label={dir < 0 ? `Scroll ${label} left` : `Scroll ${label} right`}
          className={`absolute top-1/2 -translate-y-1/2 ${dir < 0 ? 'left-0' : 'right-0'} w-8 h-8 rounded-full bg-white/70 border border-slate-200/70 text-slate-400 opacity-60 hover:opacity-100 hover:text-indigo-600 hover:border-indigo-300 focus-visible:opacity-100 flex items-center justify-center shadow-sm backdrop-blur-sm transition`}
        >
          {dir < 0 ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      ))}
    </div>
  );
}
