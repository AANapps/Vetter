import React from 'react';

// Corprax's mark: a square pixel that flashes like a cursor, after the r of the wordmark ("Corprax."), never on the V badge.
// Sized in em, so it follows the text size around it; coloured by the text colour
export const PixelDot: React.FC<{ className?: string }> = ({ className = '' }) => <span aria-hidden="true" className={`pixel-dot ${className}`} />;
