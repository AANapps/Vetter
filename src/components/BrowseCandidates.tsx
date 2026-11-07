import React, { useMemo, useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';
import { User } from '../types';
import { Pic } from './Pic';
import { getBadgeTier } from './VerifiedSkillBadge';

const STAGES = ['Any', 'Working', 'Graduate', 'Student'] as const;
const WORK = ['Any', 'Remote', 'Hybrid', 'On-site'] as const;
const SORTS = { best: 'Best score', skills: 'Most verified skills', tests: 'Most tests taken' } as const;
const PAGE = 25;
// The table's columns on wider screens: candidate, location, top skills, verified, tests, best score, arrow
const COLS = 'grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.6fr)_3.5rem_3rem_3rem_1rem]';
// Written out in full so Tailwind sees it: two columns on phones, the table's columns from md up
const ROW_COLS = 'grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)_minmax(0,1.6fr)_3.5rem_3rem_3rem_1rem]';

// Every candidate on Vetter, for a company to look through: search by name, title or skill,
// narrow by career stage and how they want to work, and open anyone's profile
export const BrowseCandidates: React.FC<{ candidates: User[]; onOpenPerson: (personId: string) => void }> = ({ candidates, onOpenPerson }) => {
  const [q, setQ] = useState('');
  const [stage, setStage] = useState<(typeof STAGES)[number]>('Any');
  const [work, setWork] = useState<(typeof WORK)[number]>('Any');
  const [sort, setSort] = useState<keyof typeof SORTS>('best');
  const [shown, setShown] = useState(PAGE);

  const people = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const best = (c: User) => Math.max(0, ...c.verifiedSkills.map((s) => s.score));
    const tests = (c: User) => new Set(c.testResults.map((r) => r.testId)).size;
    return candidates
      .filter((c) => stage === 'Any' || (c.careerStage ?? 'Working') === stage)
      .filter((c) => work === 'Any' || c.workPreference === work)
      .filter((c) => {
        if (!words.length) return true;
        const hay = `${c.name} ${c.title} ${c.location} ${c.verifiedSkills.map((s) => s.skillName).join(' ')}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .sort((a, b) =>
        sort === 'skills' ? b.verifiedSkills.length - a.verifiedSkills.length || best(b) - best(a) : sort === 'tests' ? tests(b) - tests(a) || best(b) - best(a) : best(b) - best(a)
      );
  }, [candidates, q, stage, work, sort]);

  const chip = (on: boolean) => `px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${on ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'}`;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-slate-900">All candidates</h2>
        <p className="text-sm text-slate-500">Everyone on Vetter. Search by name, title or skill and open a profile to see their full record.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row gap-2">
          <label className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShown(PAGE);
              }}
              placeholder="Search: SQL, React, analyst, London…"
              aria-label="Search candidates"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white"
            />
          </label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}
            aria-label="Sort"
            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700"
          >
            {Object.entries(SORTS).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {STAGES.map((s) => (
              <button key={s} onClick={() => setStage(s)} aria-pressed={stage === s} className={chip(stage === s)}>
                {s === 'Any' ? 'Any stage' : s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {WORK.map((w) => (
              <button key={w} onClick={() => setWork(w)} aria-pressed={work === w} className={chip(work === w)}>
                {w === 'Any' ? 'Any way of working' : w}
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-slate-500 tabular-nums">
            {people.length} {people.length === 1 ? 'candidate' : 'candidates'}
          </span>
        </div>
      </div>

      {people.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-8 text-center">No candidates match. Try fewer words or another filter.</p>
      ) : (
        // A table: one row per candidate, the columns that matter for a first look, best first
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className={`hidden md:grid ${COLS} gap-4 px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400`}>
            <span>Candidate</span>
            <span>Location</span>
            <span>Top verified skills</span>
            <span className="text-right">Verified</span>
            <span className="text-right">Tests</span>
            <span className="text-right">Best</span>
            <span />
          </div>
          <ul className="divide-y divide-slate-100">
            {people.slice(0, shown).map((c) => {
              const top = [...c.verifiedSkills].sort((a, b) => b.score - a.score).slice(0, 3);
              const best = top[0];
              const tests = new Set(c.testResults.map((r) => r.testId)).size;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onOpenPerson(c.id)}
                    className={`w-full text-left grid ${ROW_COLS} gap-x-4 gap-y-2 items-center px-5 py-3 hover:bg-slate-50/70 transition-colors group`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Pic src={c.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover bg-slate-100 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700">{c.name}</span>
                        <span className="block text-[11px] text-slate-500 truncate">
                          {c.title || 'Candidate'}
                          {c.careerStage && c.careerStage !== 'Working' && <> &middot; {c.careerStage}</>}
                        </span>
                      </span>
                    </span>
                    <span className="hidden md:block min-w-0 text-xs text-slate-600">
                      <span className="block truncate">{c.location || '—'}</span>
                      <span className="block text-[11px] text-slate-400">{c.workPreference}</span>
                    </span>
                    <span className="hidden md:flex flex-wrap gap-1 min-w-0">
                      {top.length ? (
                        top.map((s) => (
                          <span key={s.skillId} className="max-w-full px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-700 truncate">
                            {s.skillName} <span className="font-mono font-semibold text-slate-900">{s.score}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-300">None yet</span>
                      )}
                    </span>
                    <span className="hidden md:block text-right text-xs font-mono tabular-nums text-slate-700">{c.verifiedSkills.length}</span>
                    <span className="hidden md:block text-right text-xs font-mono tabular-nums text-slate-700">{tests}</span>
                    <span className="flex items-center justify-end gap-2">
                      <span className={`font-mono text-base font-bold tabular-nums ${best ? getBadgeTier(best.score).badgeTextColor : 'text-slate-300'}`}>{best ? best.score : '—'}</span>
                    </span>
                    <ChevronRight className="hidden md:block w-4 h-4 text-slate-300 group-hover:text-slate-500 justify-self-end" />
                    {/* Phones: the top skills under the name */}
                    {top.length > 0 && (
                      <span className="md:hidden col-span-2 flex flex-wrap gap-1">
                        {top.map((s) => (
                          <span key={s.skillId} className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-700">
                            {s.skillName} <span className="font-mono font-semibold text-slate-900">{s.score}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {people.length > shown && (
        <div className="text-center">
          <button onClick={() => setShown((n) => n + PAGE)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg">
            Show more ({people.length - shown} left)
          </button>
        </div>
      )}
    </div>
  );
};
