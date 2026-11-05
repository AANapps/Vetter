import React from 'react';
import { CURRENCIES, CurrencyCode, useCurrency } from '../lib/currency';

// Which currency Vetter's prices are shown in. Starts as the visitor's local one; their choice is remembered
export const CurrencyPicker: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { code, set } = useCurrency();
  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold text-slate-600">Currency</span>
      <select value={code} onChange={(e) => set(e.target.value as CurrencyCode)} aria-label="Currency" className="h-8 pl-2.5 text-xs font-semibold">
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} · {c.label}
          </option>
        ))}
      </select>
    </label>
  );
};
