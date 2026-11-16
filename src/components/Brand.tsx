import React, { useId } from 'react';

/**
 * Praxa's brand: a globe and the name set in a rounded geometric sans (Outfit), both in the AI gradient (blue, violet,
 * pink). The globe is also the AI chat's avatar; while the AI works it turns slowly.
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
      {/* A globe: its outline, the equator and two lines of latitude, and the meridians curving round it */}
      <g fill="none" stroke={`url(#bs-${id})`} strokeWidth="1.9" strokeLinecap="round">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M2.5 12h19" />
        <path d="M4 7.2h16M4 16.8h16" strokeWidth="1.5" />
        <path d="M12 2.5c2.9 2.6 4.4 5.8 4.4 9.5s-1.5 6.9-4.4 9.5" />
        <path d="M12 2.5C9.1 5.1 7.6 8.3 7.6 12s1.5 6.9 4.4 9.5" />
      </g>
    </svg>
  );
};

// The globe and the name: "🌐 Praxa". size: the text size class; the globe follows it
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
