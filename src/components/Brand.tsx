import React, { useId } from 'react';

/**
 * Praxa's brand: an abstract neuron in a rounded square (a cell body and its branches, white on the AI gradient: blue,
 * violet, pink) and the name set in a rounded geometric sans (Outfit) in the same gradient. The mark is also the AI
 * chat's avatar; while the AI works it pulses.
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
      {/* An abstract neuron in a rounded square: a cell body with three short branches and a long one that forks at its end */}
      <rect x="1" y="1" width="22" height="22" rx="6.5" fill={`url(#bs-${id})`} />
      <g fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 10C8.6 8 7.2 6.8 5.4 6.1M10 10c.8-2.4 2-4 3.9-5M10 10c-2 .9-3.6 2.3-4.7 4.4M10 10c2.8 1.2 5 3.4 6.2 6.4m0 0 2.6-1m-2.6 1 .8 2.7" />
      </g>
      <g fill="#fff">
        <circle cx="10" cy="10" r="2.6" />
        <circle cx="5.4" cy="6.1" r="1.25" />
        <circle cx="13.9" cy="5" r="1.25" />
        <circle cx="5.3" cy="14.4" r="1.25" />
        <circle cx="18.8" cy="15.4" r="1.15" />
        <circle cx="17" cy="19.1" r="1.15" />
      </g>
    </svg>
  );
};

/**
 * The AI chat's symbol: a synapse (an axon's bulb, the signal crossing the gap, the next cell's dendrite cupped to
 * receive it), white on the AI gradient. bare: just the white glyph, for buttons already on the gradient. Pulses while busy.
 */
export const AiSynapse: React.FC<{ className?: string; busy?: boolean; title?: string; bare?: boolean }> = ({ className = 'w-6 h-6', busy, title, bare }) => {
  const id = useId().replace(/:/g, '');
  const ink = bare ? 'currentColor' : '#fff';
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0 ${busy ? 'brand-spin' : ''}`} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {!bare && (
        <>
          <defs>
            <linearGradient id={`as-${id}`} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#3b6fe0" />
              <stop offset="0.55" stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#db5a9e" />
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="22" height="22" rx="6.5" fill={`url(#as-${id})`} />
        </>
      )}
      <g fill="none" stroke={ink} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {/* The axon, into its bulb */}
        <path d="M4 4l4 4" />
        {/* The dendrite's cup, facing the bulb, and its branch away */}
        <path d="M16 11.2A4.8 4.8 0 0 1 11.2 16M14.4 14.4l5.2 5.2M17.4 17.4l2.4-.6M17.4 17.4l-.6 2.4" />
      </g>
      <g fill={ink}>
        <circle cx="9.4" cy="9.4" r="2.5" />
        {/* What crosses the gap */}
        <circle cx="12.9" cy="12.9" r="0.85" />
        <circle cx="13.9" cy="11.2" r="0.65" />
        <circle cx="11.2" cy="13.9" r="0.65" />
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
