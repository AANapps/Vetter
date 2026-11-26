import React, { useId } from 'react';

/**
 * Corprax's brand: a geometric C made of two blades (a full upper blade and a lower one, split by a thin gap), on the
 * site's AI gradient (blue, violet, pink). The name is set in a rounded geometric sans (Outfit) in the same gradient.
 * The AI chat has its own mark (AiMark, an animated +).
 */

export const BrandSparkle: React.FC<{ className?: string; busy?: boolean; title?: string }> = ({ className = 'w-6 h-6', busy, title }) => {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0 ${busy ? 'brand-spin' : ''}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`bs-${id}`} x1="1" y1="20" x2="23" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3b6fe0" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#db5a9e" />
        </linearGradient>
      </defs>
      <path fill={`url(#bs-${id})`} d="M9 1.5H23.2C22 5 19.6 8.3 16 8.3H9C4.9 8.3 1.6 11.1 0.6 14.6C0.4 13.9 0.3 12.9 0.3 12C0.3 6.2 4.2 1.5 9 1.5Z" />
      <path fill={`url(#bs-${id})`} opacity="0.92" d="M0.6 15.2H16C19.2 15.2 22 18.6 23.6 22.5H9C4.9 22.5 1.6 19.4 0.6 15.2Z" />
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
