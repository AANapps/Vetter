import React from 'react';

/**
 * The title at the top of a section inside a page with a side menu (Team, Work). Always the same height, title on one
 * line and the description on one line, with any controls on the right, so switching sections never moves the page.
 */
export const PageHeader: React.FC<{ title: string; sub: string; action?: React.ReactNode }> = ({ title, sub, action }) => (
  <div className="min-h-[68px] flex flex-col sm:flex-row sm:items-start justify-between gap-3">
    <div className="min-w-0">
      <h1 className="text-2xl leading-8 font-bold text-slate-900 tracking-tight truncate">{title}</h1>
      <p className="mt-1 text-sm leading-5 text-slate-500 sm:truncate">{sub}</p>
    </div>
    {action && <div className="shrink-0 sm:h-10 flex items-center gap-2 flex-wrap">{action}</div>}
  </div>
);
