import React, { useId } from 'react';

/**
 * Praxa's brand: a person whose head is an AI sparkle, white on the AI gradient (blue, violet, pink) in a rounded
 * square: AI for hiring people. The name is set in a rounded geometric sans (Outfit) in the same gradient. The AI chat
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
      {/* A person whose head is an AI sparkle, in a rounded square */}
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill={`url(#bs-${id})`} />
      <path d="M12 4.6C12.45 7.35 13.1 8 15.85 8.45C13.1 8.9 12.45 9.55 12 12.3C11.55 9.55 10.9 8.9 8.15 8.45C10.9 8 11.55 7.35 12 4.6Z" fill="#fff" />
      <path d="M6.6 18.6a5.4 4.9 0 0 1 10.8 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
};

/**
 * The AI chat's symbol: a white + on the AI gradient (blue, violet, pink). Animated: at rest the + makes a quarter turn
 * every few seconds (a + looks the same turned, so it loops seamlessly); while the AI works it spins. bare: just the
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
      <g className={still ? '' : busy ? 'ai-plus-spin' : 'ai-plus-turn'} fill="none" stroke={bare ? 'currentColor' : '#fff'} strokeWidth={bare ? 2.4 : 2.6} strokeLinecap="round">
        <path d={bare ? 'M12 4.5v15M4.5 12h15' : 'M12 6.5v11M6.5 12h11'} />
      </g>
    </svg>
  );
};

// The mark and the name. size: the text size class; the mark follows it
export const BrandWordmark: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string; showMark?: boolean }> = ({ size = 'md', className = '', showMark = true }) => {
  const text = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';
  const mark = size === 'lg' ? 'w-8 h-8' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      {showMark && <BrandSparkle className={mark} />}
      <span className={`brand-word ${text}`}>Praxa</span>
    </span>
  );
};
