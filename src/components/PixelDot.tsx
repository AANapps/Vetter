import React from 'react';

// Vetter's mark: a square pixel that flashes like a cursor. It ends the wordmark ("Vetter.") and stands alone where
// the logo is just a badge. Sized in em, so it follows the text size around it; coloured by the text colour
export const PixelDot: React.FC<{ className?: string }> = ({ className = '' }) => <span aria-hidden="true" className={`pixel-dot ${className}`} />;
