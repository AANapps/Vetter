import React, { useId } from 'react';

/**
 * Corprax's brand: a clean synapse, white on the AI gradient (blue, violet, pink) in a rounded square: one cell's
 * terminal passing a signal across the gap to the next, the way Corprax connects people and work. The name is set in a rounded geometric sans (Outfit) in the same gradient. The AI chat
 * has its own mark (AiMark, an animated +).
 */

export const BrandSparkle: React.FC<{ className?: string; busy?: boolean; title?: string }> = ({ className = 'w-6 h-6', busy, title }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0 ${busy ? 'brand-spin' : ''}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`bs-${id}`} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b6fe0" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#db5a9e" />
        </linearGradient>
      </defs>
      {/* A clean synapse on one diagonal: a line into a round terminal, three dots crossing the gap, and the next cell's
          cup facing it with a line out */}
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill={`url(#bs-${id})`} />
      <g fill="none" stroke="#fff" strokeWidth="2.3" strokeLinecap="round">
        <path d="M4.6 4.6 7.7 7.7M16 9.6A6.4 6.4 0 0 1 9.6 16M14.13 14.13 19.4 19.4" />
      </g>
      <g fill="#fff">
        <circle cx="9.6" cy="9.6" r="2.9" />
        <circle cx="13.92" cy="11.17" r="0.85" />
        <circle cx="12.85" cy="12.85" r="0.85" />
        <circle cx="11.17" cy="13.92" r="0.85" />
      </g>
    </svg>
  );
};

/**
 * The AI chat's symbol: a white + on the AI gradient (blue, violet, pink). Animated: at rest the + spins round, slows to
 * a stop, rests and goes again (a full turn ends where it started, so it loops seamlessly); while the AI works it spins. bare: just the
 * white +, for buttons already on the gradient. Motion stops for people who ask for less (index.css).
 */
export const AiMark: React.FC<{ className?: string; busy?: boolean; title?: string; bare?: boolean; still?: boolean }> = ({ className = 'w-6 h-6', busy, title, bare, still }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {!bare && (
        <>
          <defs>
            <linearGradient id={`am-${id}`} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3b6fe0" />
              <stop offset="0.55" stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#db5a9e" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="22" height="22" rx="6.5" fill={`url(#am-${id})`} />
        </>
      )}
      {/* The line weight is set in screen pixels, so the + is equally thick at every size (the menu's 16px, the chat's 28px) */}
      <g className={still ? '' : busy ? 'ai-plus-spin' : 'ai-plus-turn'} fill="none" stroke={bare ? 'currentColor' : '#fff'} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke">
        <path d={bare ? 'M12 4.5v15M4.5 12h15' : 'M12 6.5v11M6.5 12h11'} vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
};

// The name in the logo
export const LOGO_NAME = 'Corprax';

// The mark and the name. size: the text size class; the mark follows it
export const BrandWordmark: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string; showMark?: boolean }> = ({ size = 'md', className = '', showMark = true }) => {
  const text = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';
  const mark = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showMark && <BrandSparkle className={mark} />}
      <span className={`brand-word ${text}`}>{LOGO_NAME}</span>
    </span>
  );
};
