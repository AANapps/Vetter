import React from 'react';
import { ArrowRight } from 'lucide-react';
import { AssessmentTest, isPublic } from '../types';
import { HOME_FIELDS, TestField } from '../lib/testRoles';
import { FOCUS_SECTOR, roleInSector } from '../lib/sectors';
import { isMainVersion } from '../lib/testLevels';
import { DriftStrip } from './DriftStrip';

// On Home in place of trending tests: fields of work drifting past; picking one opens the Tests page on its tests.
export const FieldSlider: React.FC<{ tests: AssessmentTest[]; onOpenField: (field: TestField) => void }> = ({ tests, onOpenField }) => {
  const mains = tests.filter((t) => isPublic(t) && isMainVersion(t));
  // Only the fields in the sector Corprax is focused on, when it is
  const fields = HOME_FIELDS.filter((f) => !FOCUS_SECTOR || f.roles.some(roleInSector(FOCUS_SECTOR))).map((f) => ({
    ...f,
    count: mains.filter((t) => t.roles?.some((r) => f.roles.includes(r))).length,
  })).filter((f) => f.count > 0);

  // Nothing to browse in the sector picked
  if (fields.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Explore by field</h2>
        <p className="text-xs text-slate-500">Pick one to see its tests.</p>
      </div>
      <DriftStrip
        items={fields}
        itemKey={(f) => f.label}
        label="fields"
        render={(f) => (
          <button
            onClick={() => onOpenField(f)}
            className="group w-52 h-full text-left bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-xl px-4 py-3.5 flex flex-col gap-1 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 leading-snug truncate">{f.label}</span>
            <span className="text-xs text-slate-500 leading-snug line-clamp-1">{f.blurb}</span>
            <span className="mt-2 w-full flex items-center justify-between text-xs">
              <span className="font-mono tabular-nums text-slate-500">
                {f.count} {f.count === 1 ? 'test' : 'tests'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </span>
          </button>
        )}
      />
    </section>
  );
};
