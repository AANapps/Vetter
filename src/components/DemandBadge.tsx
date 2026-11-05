import React from 'react';
import { Flame, TrendingUp } from 'lucide-react';
import { Demand } from '../lib/demand';

// A small pill for a test's hiring demand, in the site's navy: solid for high demand, tinted for rising. Hover (or a
// screen reader) gives the finding and where it's from
export const DemandBadge: React.FC<{ demand?: Demand; className?: string }> = ({ demand, className = '' }) => {
  if (!demand) return null;
  const high = demand.level === 'high';
  const Icon = high ? Flame : TrendingUp;
  const label = high ? 'High demand' : 'Rising demand';
  const why = `${demand.reason} (${demand.source})`;
  return (
    <span
      title={why}
      aria-label={`${label}: ${why}`}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        high ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100'
      } ${className}`}
    >
      <Icon aria-hidden="true" className="w-3 h-3" />
      {label}
    </span>
  );
};
