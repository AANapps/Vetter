import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db, firebaseEnabled } from '../lib/firebase';
import { Eye, EyeOff, Search } from 'lucide-react';
import { AssessmentTest, TestRole, isPublic, levelName } from '../types';
import { ROLE_GROUPS } from '../lib/testRoles';
import { isMainVersion } from '../lib/testLevels';
import { LibraryVisibility, roleHidden, saveLibraryVisibility, testHidden, useLibraryVisibility } from '../lib/libraryVisibility';
import { STANDARD_ASSESSMENTS } from '../data/mockData';

/**
 * Admin panel > Library visibility: hide whole categories (industries), single roles, or single tests from the library.
 * Hidden ones aren't listed to candidates or companies; the Granyt team still sees everything. Each change is saved at
 * once and reaches everyone's open page.
 */

const toggle = (list: string[], item: string) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

const Switch: React.FC<{ shown: boolean; onClick: () => void; label: string; disabled?: boolean }> = ({ shown, onClick, label, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-pressed={!shown}
    aria-label={`${shown ? 'Hide' : 'Show'} ${label}`}
    title={shown ? `Hide ${label}` : `Show ${label}`}
    className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 ${
      shown ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
    }`}
  >
    {shown ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
    {shown ? 'Shown' : 'Hidden'}
  </button>
);

export const LibraryVisibilityAdmin: React.FC = () => {
  const v = useLibraryVisibility();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState('');
  const [onlyHidden, setOnlyHidden] = useState(false);

  // Every library test, one row per test (its levels go with it): Granyt's built-in ones (with the team's edits), tests
  // the team made in the app, and companies' tests approved for the library
  const [saved, setSaved] = useState<AssessmentTest[]>([]);
  useEffect(() => {
    if (!firebaseEnabled) return;
    getDocs(collection(db(), 'tests'))
      .then((snap) => setSaved(snap.docs.map((d) => ({ ...(d.data() as AssessmentTest), id: d.id }))))
      .catch(() => setSaved([]));
  }, []);
  const library = useMemo(
    () =>
      [...STANDARD_ASSESSMENTS.map((t) => saved.find((c) => c.id === t.id) ?? t), ...saved.filter((c) => !STANDARD_ASSESSMENTS.some((t) => t.id === c.id))].filter(
        (t) => isMainVersion(t) && isPublic(t)
      ),
    [saved]
  );
  const update = async (next: LibraryVisibility) => {
    setBusy(true);
    setError(null);
    try {
      await saveLibraryVisibility(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save. Check the Firestore rules for settings/library are deployed.');
    } finally {
      setBusy(false);
    }
  };
  const countFor = (roles: TestRole[]) => library.filter((t) => t.roles?.some((r) => roles.includes(r))).length;
  const shownTests = library.filter((t) => !testHidden(v, t)).length;

  const group = ROLE_GROUPS.find((g) => g.industry === industry);
  const rows = library
    .filter((t) => !group || t.roles?.some((r) => group.roles.includes(r)))
    .filter((t) => !q.trim() || `${t.title} ${t.category} ${(t.roles ?? []).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((t) => !onlyHidden || testHidden(v, t))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-5" aria-labelledby="visibility-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 id="visibility-heading" className="font-bold">Library visibility</h2>
          <p className="text-xs text-slate-500 max-w-2xl">
            Hide categories, roles or single tests from candidates and companies. The Granyt team still sees everything, and nothing is deleted.
          </p>
        </div>
        <span className="text-xs text-slate-500 tabular-nums">
          {shownTests} of {library.length} tests shown
        </span>
      </div>
      {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Categories and roles</h3>
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
          {ROLE_GROUPS.map((g) => {
            const industryShown = !v.hiddenIndustries.includes(g.industry);
            return (
              <li key={g.industry} className={`px-4 py-3 space-y-2 ${industryShown ? '' : 'bg-slate-50'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`text-sm font-semibold ${industryShown ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{g.industry}</span>
                    <span className="ml-2 text-xs text-slate-400 tabular-nums">{countFor(g.roles)} tests</span>
                  </div>
                  <Switch shown={industryShown} disabled={busy} label={g.industry} onClick={() => update({ ...v, hiddenIndustries: toggle(v.hiddenIndustries, g.industry) })} />
                </div>
                {g.roles.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {g.roles.map((r) => {
                      const shown = !roleHidden(v, r);
                      return (
                        <button
                          key={r}
                          disabled={busy || !industryShown}
                          onClick={() => update({ ...v, hiddenRoles: toggle(v.hiddenRoles, r) })}
                          aria-pressed={!shown}
                          title={!industryShown ? `Hidden with ${g.industry}` : shown ? `Hide ${r}` : `Show ${r}`}
                          className={`inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs border transition-colors disabled:cursor-not-allowed ${
                            shown ? 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100' : 'bg-white border-slate-200 text-slate-400 line-through hover:border-slate-300'
                          }`}
                        >
                          {shown ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          {r}
                          <span className="tabular-nums opacity-70">{countFor([r])}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Tests</h3>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex-1 min-w-[12rem] flex items-center gap-2 h-9 px-3 border border-slate-200 rounded-lg focus-within:border-indigo-400">
            <Search className="w-4 h-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tests" className="flex-1 min-w-0 text-sm outline-none bg-transparent" aria-label="Search tests" />
          </label>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-9 px-2 border border-slate-200 rounded-lg text-sm bg-white" aria-label="Category">
            <option value="">Every category</option>
            {ROLE_GROUPS.map((g) => (
              <option key={g.industry}>{g.industry}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" checked={onlyHidden} onChange={(e) => setOnlyHidden(e.target.checked)} className="accent-indigo-600" />
            Hidden only
          </label>
        </div>
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-[28rem] overflow-y-auto">
          {rows.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No tests match.</li>}
          {rows.map((t: AssessmentTest) => {
            const id = t.familyId ?? t.id;
            const own = v.hiddenTests.includes(id);
            const hidden = testHidden(v, t);
            // Hidden by its roles or category rather than on its own: shown here, changed above
            const byRole = hidden && !own;
            return (
              <li key={t.id} className={`px-4 py-2.5 flex items-center gap-3 ${hidden ? 'bg-slate-50' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium truncate ${hidden ? 'text-slate-400' : 'text-slate-900'}`}>{t.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {levelName(t.difficulty)} · {(t.roles ?? []).join(', ') || 'No role'}
                    {byRole && ' · hidden with its role or category'}
                  </div>
                </div>
                <Switch shown={!own} disabled={busy} label={t.title} onClick={() => update({ ...v, hiddenTests: toggle(v.hiddenTests, id) })} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
