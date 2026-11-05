import React from 'react';

// Vetter's mark: a square pixel that flashes like a cursor, after the wordmark ("Vetter.") and after the V on the
// square badges. Sized in em, so it follows the text size around it; coloured by the text colour
export const PixelDot: React.FC<{ className?: string }> = ({ className = '' }) => <span aria-hidden="true" className={`pixel-dot ${className}`} />;
