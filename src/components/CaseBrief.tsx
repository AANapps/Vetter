import React, { useState } from 'react';
import { Briefcase, ChevronDown, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { TestScenario } from '../types';
import { downloadFile, parseCsv } from '../lib/csv';

// The situation a simulation plays out in, with the files the candidate is handed
export const CaseBrief: React.FC<{ scenario: TestScenario; defaultOpen?: boolean }> = ({ scenario, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-amber-200 bg-amber-50/60 rounded-lg text-xs">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left" aria-expanded={open}>
        <span className="flex items-center gap-2 font-semibold text-amber-950">
          <Briefcase className="w-3.5 h-3.5 text-amber-700" />
          Case brief: {scenario.role} at {scenario.company}
        </span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-amber-700" /> : <ChevronRight className="w-3.5 h-3.5 text-amber-700" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3">
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{scenario.brief}</p>
          {scenario.files && scenario.files.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-semibold text-slate-800">Files shared with you</div>
              {scenario.files.map((f) => (
                <button
                  key={f.name}
                  onClick={() => downloadFile(f.name, f.content)}
                  className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-slate-200 rounded hover:border-indigo-400 text-left"
                  title="Download. You can also import it straight into the spreadsheet or the database."
                >
                  <span className="flex items-center gap-1.5 font-mono text-slate-800">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    {f.name}
                  </span>
                  <span className="text-slate-400">{Math.max(parseCsv(f.content).length - 1, 0)} rows &middot; download</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
