import React from 'react';

/**
 * A small looping sketch at the top of each starter card on the company chat: what the card does, drawn in a few
 * shapes. Styles and keyframes are the sa-* rules in src/index.css; each scene sits in a 220×112 box so its movements
 * line up at any card width. Purely decorative, so hidden from screen readers.
 */

export type StarterArtKind = 'sim' | 'job' | 'find' | 'train' | 'live' | 'library';

type Css = React.CSSProperties & Record<'--d', string>;
const at = (s: number): Css => ({ '--d': `${s}s` });
const box = (left: number, top: number, width: number, height: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ left, top, width, height, ...extra });

// A job simulation: a desktop where an email arrives, gets opened, and a spreadsheet fills in
const Sim = () => (
  <>
    <div className="sa-panel absolute" style={box(10, 10, 200, 92)}>
      <div className="flex gap-1 px-2 pt-1.5">
        <span className="sa-dot sa-rose w-1.5 h-1.5" />
        <span className="sa-dot sa-warm w-1.5 h-1.5" />
        <span className="sa-dot sa-ok w-1.5 h-1.5" />
      </div>
      {/* Inbox */}
      <div className="absolute space-y-1.5" style={box(8, 16, 80, 70)}>
        <div className="sa-a sa-slide rounded-md sa-soft p-1.5 space-y-1" style={at(0.2)}>
          <div className="sa-line sa-ink" style={{ width: '70%' }} />
          <div className="sa-line" style={{ width: '90%' }} />
        </div>
        {[60, 75, 50].map((w, i) => (
          <div key={i} className="p-1.5 space-y-1">
            <div className="sa-line" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      {/* A sheet that opens and fills */}
      <div className="sa-a sa-pop sa-panel absolute" style={{ ...box(96, 16, 96, 70), ...at(1.6) }}>
        <div className="grid grid-cols-3 gap-1 p-1.5 pb-1">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="sa-a sa-fill h-2.5 rounded-sm" style={{ ...at(2 + i * 0.12), background: i % 3 === 2 ? '#10b981' : '#c7d2fe' }} />
          ))}
        </div>
        <div className="flex items-end gap-1 px-2 h-4">
          {[40, 70, 55, 90].map((h, i) => (
            <span key={i} className="sa-a sa-grow sa-ink-2 w-2 rounded-t-sm" style={{ height: `${h}%`, ...at(2.8 + i * 0.1) }} />
          ))}
        </div>
      </div>
    </div>
    {/* The pointer */}
    <svg className="sa-a sa-cursor absolute left-0 top-0" style={at(0)} width="12" height="14" viewBox="0 0 12 14">
      <path d="M1 1l9 6.5-4 .8L4 13z" fill="#0f172a" stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  </>
);

// A job: the role typed in, then the tests that fit it pop in, ticked, beside a small chart
const Job = () => (
  <>
    <div className="sa-panel absolute flex items-center gap-1.5 px-2" style={box(10, 10, 200, 22)}>
      <span className="sa-dot sa-ink w-2 h-2 shrink-0" />
      <div className="relative flex-1 h-1.5">
        <div className="sa-a sa-type sa-line sa-ink absolute inset-y-0 left-0 origin-left" style={{ width: '75%', ...at(0) }} />
      </div>
      <span className="sa-blink w-px h-3 bg-slate-500" />
    </div>
    <div className="absolute space-y-1.5" style={box(10, 40, 120, 64)}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="sa-a sa-pop sa-panel flex items-center gap-1.5 px-1.5 h-[18px]" style={at(1.6 + i * 0.35)}>
          <span className="sa-dot sa-ok w-2.5 h-2.5 flex items-center justify-center text-[7px] text-white leading-none">✓</span>
          <div className="sa-line" style={{ width: `${[70, 55, 80][i]}%` }} />
        </div>
      ))}
    </div>
    <div className="sa-panel absolute flex items-end gap-1.5 px-2 pb-2" style={box(140, 40, 70, 62)}>
      {[45, 80, 60, 95].map((h, i) => (
        <span key={i} className={`sa-a sa-grow w-2.5 rounded-t-sm ${i === 3 ? 'sa-ok' : 'sa-ink'}`} style={{ height: `${h}%`, ...at(2.6 + i * 0.15) }} />
      ))}
    </div>
  </>
);

// Finding someone: a magnifier passes down ranked people and one lights up as the match
const Find = () => (
  <>
    <div className="absolute space-y-1.5" style={box(14, 10, 192, 92)}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={`sa-panel flex items-center gap-2 px-2 h-[18px] ${i === 2 ? 'sa-a sa-lift' : ''}`} style={i === 2 ? at(0) : undefined}>
          <span className={`sa-dot w-3 h-3 shrink-0 ${i === 2 ? 'sa-ok' : 'sa-soft'}`} />
          <div className="sa-line" style={{ width: 40 }} />
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.2)' }}>
            <div className={`sa-a sa-fill h-full rounded-full ${i === 2 ? 'sa-ok' : 'sa-ink'}`} style={{ width: `${[62, 48, 94, 35][i]}%`, ...at(0.2 + i * 0.15) }} />
          </div>
        </div>
      ))}
    </div>
    <svg className="sa-a sa-glass absolute" style={{ left: 150, top: 6, ...at(0) }} width="26" height="26" viewBox="0 0 26 26">
      <circle cx="10" cy="10" r="7" fill="rgba(255,255,255,0.35)" stroke="#6366f1" strokeWidth="2.5" />
      <path d="M15.5 15.5L22 22" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </>
);

// Training on an app: a guide ring hops from step to step while progress fills
const Train = () => (
  <>
    <div className="sa-panel absolute" style={box(10, 10, 200, 92)}>
      <div className="flex items-center gap-1.5 px-2 h-5 border-b border-slate-100">
        <span className="sa-line" style={{ width: 30 }} />
        <span className="sa-line" style={{ width: 22 }} />
      </div>
      <div className="flex gap-2 px-2 pt-2">
        <span className="sa-soft rounded w-12 h-4" />
        <span className="sa-soft rounded w-12 h-4" />
        <span className="sa-soft rounded w-12 h-4" />
      </div>
      <div className="px-2 pt-2 space-y-1.5">
        <div className="sa-line" style={{ width: '60%' }} />
        <div className="flex gap-2 items-center">
          <div className="sa-line" style={{ width: '40%' }} />
          <span className="sa-ink rounded w-12 h-4 ml-auto mr-[22px]" />
        </div>
      </div>
      {/* Progress through the guided tasks */}
      <div className="absolute left-2 right-2 bottom-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(148,163,184,0.25)' }}>
        <div className="sa-a sa-steps sa-warm h-full w-full rounded-full" style={at(0)} />
      </div>
    </div>
    {/* The guide: a ring and its tip, moving together */}
    <div className="sa-a sa-hop absolute" style={{ left: 16, top: 33, ...at(0) }}>
      <span className="block w-14 h-6 rounded-md border-2 border-amber-400" style={{ animation: 'sa-pulse 1.2s ease-out infinite' }} />
      <span className="absolute left-3 top-7 w-12 h-3 rounded bg-slate-900/85" />
    </div>
  </>
);

// Live training: a tutor talking on video while seats on the session fill up
const Live = () => (
  <>
    <div className="sa-panel absolute overflow-hidden" style={box(10, 10, 96, 92)}>
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#fecdd3,#e0e7ff)' }} />
      <span className="absolute left-1/2 -translate-x-1/2 top-4 sa-dot w-8 h-8" style={{ background: '#fb7185' }} />
      <span className="absolute left-1/2 -translate-x-1/2 top-11 w-14 h-8 rounded-t-full" style={{ background: '#fb7185' }} />
      <div className="absolute left-2 bottom-2 flex items-end gap-0.5 h-3">
        {[0, 0.15, 0.3, 0.45].map((d) => (
          <span key={d} className="sa-wave w-1 h-full rounded-full bg-white" style={at(d)} />
        ))}
      </div>
      <span className="absolute right-2 top-2 px-1 rounded text-[7px] font-bold text-white sa-rose leading-[10px]">LIVE</span>
    </div>
    <div className="sa-panel absolute p-2" style={box(114, 10, 96, 92)}>
      <div className="sa-line mb-2" style={{ width: '55%' }} />
      <div className="grid grid-cols-4 gap-1">
        {Array.from({ length: 8 }, (_, i) =>
          i === 6 ? (
            <span key={i} className="sa-a sa-pop sa-ink h-3.5 rounded-sm" style={at(0.6)} />
          ) : (
            <span key={i} className="h-3.5 rounded-sm" style={{ background: 'rgba(148,163,184,0.18)' }} />
          )
        )}
      </div>
      <div className="flex -space-x-1.5 mt-2.5">
        {['#6366f1', '#10b981', '#f59e0b', '#8b5cf6'].map((c, i) => (
          <span key={c} className="sa-a sa-pop sa-dot w-4 h-4 ring-2 ring-white" style={{ background: c, ...at(1.4 + i * 0.3) }} />
        ))}
      </div>
    </div>
  </>
);

// The library: test cards land one by one, tagged by level
const Library = () => (
  <div className="absolute grid grid-cols-3 gap-2" style={box(12, 12, 196, 88)}>
    {Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="sa-a sa-pop sa-panel p-1.5 space-y-1" style={at(0.2 + i * 0.25)}>
        <span className={`block w-6 h-1.5 rounded-full ${['sa-ok', 'sa-ink', 'sa-ink-2', 'sa-warm', 'sa-ok', 'sa-ink'][i]}`} />
        <div className="sa-line" style={{ width: '90%' }} />
        <div className="sa-line" style={{ width: '60%' }} />
      </div>
    ))}
  </div>
);

const SCENES: Record<StarterArtKind, React.FC> = { sim: Sim, job: Job, find: Find, train: Train, live: Live, library: Library };

export const StarterArt: React.FC<{ kind: StarterArtKind }> = ({ kind }) => {
  const Scene = SCENES[kind];
  return (
    <div className="sa-stage w-full" aria-hidden>
      <div className="absolute left-1/2 top-0 -translate-x-1/2" style={{ width: 220, height: 112 }}>
        <Scene />
      </div>
    </div>
  );
};
