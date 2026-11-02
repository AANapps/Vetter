import React from 'react';

// One short line at the top of a main page saying what the page is for, so nobody has to guess
export const PageGuide: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = '' }) => (
  <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs ${className}`}>
    <span className="font-semibold uppercase tracking-wider text-indigo-700">{label}</span>
    <span className="text-slate-500">{children}</span>
  </p>
);
