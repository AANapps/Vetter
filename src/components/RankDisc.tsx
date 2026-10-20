import React from 'react';

// Gold, silver and bronze rank discs for the podium; plain numbers after that
const PODIUM_STYLES: Record<number, string> = {
  1: 'tier-solid tier-solid-gold',
  2: 'tier-solid tier-solid-metal',
  3: 'tier-solid tier-solid-bronze',
};

export const RankDisc: React.FC<{ rank: number; size?: 'sm' | 'md' }> = ({ rank, size = 'md' }) => {
  const dims = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs';
  const style = PODIUM_STYLES[rank] ?? 'text-slate-500';
  return (
    <span className={`${dims} ${style} rounded-full inline-flex items-center justify-center font-mono font-bold tabular-nums shrink-0`}>
      {rank}
    </span>
  );
};
