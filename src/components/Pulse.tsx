import React from 'react';

// Something is being worked on: a circle beats and rings pulse out from it
export const Pulse: React.FC<{ label: string }> = ({ label }) => (
  <div className="relative w-24 h-24 my-8 flex items-center justify-center" role="img" aria-label={label}>
    <span className="pulse-ring absolute inset-0 rounded-full bg-indigo-400" />
    <span className="pulse-ring absolute inset-0 rounded-full bg-indigo-400 [animation-delay:0.8s]" />
    <span className="pulse-ring absolute inset-0 rounded-full bg-indigo-400 [animation-delay:1.6s]" />
    <span className="pulse-core relative w-14 h-14 rounded-full bg-indigo-600 shadow-lg shadow-indigo-600/30" />
  </div>
);
