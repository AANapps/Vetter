import React from 'react';

// Metal palettes for the podium medals: light, mid and deep tones, plus rim and number colours
const METALS: Record<number, { light: string; mid: string; deep: string; rim: string; text: string; ribbon: [string, string] }> = {
  1: { light: '#fff4c7', mid: '#e8b53e', deep: '#9a680c', rim: '#7a5208', text: '#5a3c00', ribbon: ['#5b50e5', '#3f36b8'] },
  2: { light: '#ffffff', mid: '#c5cdd8', deep: '#6f7c8f', rim: '#56627a', text: '#2a3445', ribbon: ['#5b50e5', '#3f36b8'] },
  3: { light: '#ffe0c6', mid: '#cf8853', deep: '#7c3f18', rim: '#663212', text: '#4a2208', ribbon: ['#5b50e5', '#3f36b8'] },
};

// Gold, silver and bronze medals for the podium; plain numbers after that
export const RankDisc: React.FC<{ rank: number; size?: 'sm' | 'md' }> = ({ rank, size = 'md' }) => {
  // Same rank always means the same gradients, so repeated ids are harmless
  const id = `medal-${rank}`;
  const metal = METALS[rank];

  if (!metal) {
    const dims = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs';
    return (
      <span className={`${dims} text-slate-500 rounded-full inline-flex items-center justify-center font-mono font-bold tabular-nums shrink-0`}>
        {rank}
      </span>
    );
  }

  const dims = size === 'sm' ? 'w-5 h-[23px]' : 'w-7 h-8';
  return (
    <svg viewBox="0 0 28 32" className={`${dims} shrink-0 drop-shadow-[0_1px_1px_rgba(15,23,42,0.25)]`} role="img" aria-label={`Rank ${rank}`}>
      <defs>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="0.5" stopColor={metal.mid} />
          <stop offset="1" stopColor={metal.deep} />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={metal.light} />
          <stop offset="0.5" stopColor={metal.mid} />
          <stop offset="1" stopColor={metal.deep} />
        </linearGradient>
      </defs>
      {/* Ribbon tails */}
      <path d="M6 0h6l5 13h-6z" fill={metal.ribbon[1]} />
      <path d="M16 0h6l-5 13h-6z" fill={metal.ribbon[0]} />
      {/* Bevelled disc: the edge gradient runs opposite the face so it reads as raised */}
      <circle cx="14" cy="20" r="11.5" fill={`url(#${id}-face)`} />
      <circle cx="14" cy="20" r="9" fill={`url(#${id}-edge)`} stroke={metal.rim} strokeOpacity="0.35" strokeWidth="0.6" />
      <ellipse cx="10.5" cy="15.5" rx="4" ry="2" fill="#ffffff" opacity="0.45" transform="rotate(-35 10.5 15.5)" />
      {/* Embossed number */}
      <text x="14" y="24.2" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill="#ffffff" opacity="0.6">
        {rank}
      </text>
      <text x="14" y="23.6" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" fill={metal.text}>
        {rank}
      </text>
    </svg>
  );
};
