import React from 'react';
import { Layers } from 'lucide-react';
import { SECTORS, SectorId } from '../lib/sectors';

// The bar under the header on the candidate's browsing pages: pick a sector and every list on the site narrows to it
export const SectorBar: React.FC<{ sector: SectorId; onChange: (sector: SectorId) => void; wide?: boolean }> = ({ sector, onChange, wide }) => (
  <div className="border-b border-slate-200 bg-slate-50/70">
    <div className={`${wide ? 'max-w-7xl' : 'max-w-6xl'} mx-auto px-4 sm:px-6 h-11 flex items-center gap-2`}>
      <Layers className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
      <label htmlFor="sector-picker" className="text-xs font-semibold text-slate-500">
        Sector
      </label>
      <select
        id="sector-picker"
        value={sector}
        onChange={(e) => onChange(e.target.value as SectorId)}
        className={`min-w-0 px-2.5 py-1 bg-white border rounded-lg text-sm font-medium shadow-2xs focus:outline-none focus:border-indigo-500 ${
          sector === 'all' ? 'border-slate-300 text-slate-700' : 'border-indigo-300 text-indigo-700'
        }`}
      >
        {SECTORS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {sector !== 'all' && (
        <button onClick={() => onChange('all')} className="text-xs font-medium text-slate-500 hover:text-slate-900">
          Show all
        </button>
      )}
    </div>
  </div>
);
