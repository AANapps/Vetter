import React from 'react';
import { AVATAR_COLOURS, hashString } from '../data/seedCandidates';

// Initials avatars are stored as small SVG images, and an image can't use the site's web font. So when the source is
// one of those, this draws the initials as real text in the site font instead; any other image shows as normal
const initialsOf = (src: string | undefined): string | null => {
  if (!src || !src.startsWith('data:image/svg+xml')) return null;
  try {
    const m = decodeURIComponent(src).match(/<text[^>]*>([^<]{1,3})<\/text>/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
};

export const Pic: React.FC<React.ImgHTMLAttributes<HTMLImageElement>> = ({ src, alt, className = '', ...rest }) => {
  const initials = initialsOf(typeof src === 'string' ? src : undefined);
  if (initials === null) return <img src={src} alt={alt} className={className} {...rest} />;
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`${className} inline-flex items-center justify-center overflow-hidden select-none [container-type:size]`}
      style={{ backgroundColor: AVATAR_COLOURS[Math.abs(hashString(initials)) % AVATAR_COLOURS.length] }}
    >
      <span className="font-sans font-semibold text-white leading-none tracking-wide text-[40cqmin]">{initials}</span>
    </span>
  );
};
