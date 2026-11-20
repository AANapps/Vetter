import React, { useMemo, useState } from 'react';
import { ArrowLeft, Briefcase, Check, ChevronRight, Clock, ListChecks, Monitor, Play, Search, Sparkles, X } from 'lucide-react';
import { AssessmentTest, JobPosting, TEST_DIFFICULTIES, TestDifficulty, TestRole, User, isJobSim, isPublic, levelName } from '../types';
import { ROLE_GROUPS, ROLE_SECTIONS, TestField, TestSection } from '../lib/testRoles';
import { isMainVersion, levelsOf } from '../lib/testLevels';
import { roleHidden, testHidden, useLibraryVisibility } from '../lib/libraryVisibility';
import { SectorId, industryInSector, testInSector } from '../lib/sectors';
import { getBestTestScore } from '../lib/matchingAlgorithm';
import { getTestStats } from '../lib/leaderboard';
import { jobsUsing } from '../lib/demand';
import { PASS } from '../lib/profileProgress';
import { getBadgeTier } from './VerifiedSkillBadge';
import { LevelPicker } from './LevelPicker';

/**
 * Praxa's tests, laid out for someone who has never been here. With no role picked it asks what job they want (or
 * lets them search everything). With a role, it shows a header with their progress and the next test, the role's path
 * as numbered steps, and a card for each module. A group of roles (an industry, or a field from Home) is a grid of
 * its tests. Every card says the same few things in words: level, minutes, questions, their best and one button.
 */

interface TestsBrowserProps {
  candidate: User;
  allCandidates: User[];
  tests: AssessmentTest[];
  jobs: JobPosting[];
  sector: SectorId;
  testField: TestField | null;
  onTestFieldChange: (field: TestField | null) => void;
  onOpenTest: (testId: string) => void;
  onStartTest: (test: AssessmentTest) => void;
}

type Status = 'all' | 'todo' | 'passed';

const levelLabel = (d: TestDifficulty | string) => (d === 'Junior' ? 'Beginner' : levelName(d));
const isSim = (t: AssessmentTest, sec?: TestSection) => /simulation/i.test(sec?.label ?? '') || /simulation/i.test(t.title);

// A small completion circle: the share of a role's tests passed, with the count in the middle
const ProgressRing: React.FC<{ done: number; total: number }> = ({ done, total }) => {
  const r = 27;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  const all = total > 0 && done === total;
  return (
    <span className="relative w-16 h-16 shrink-0" aria-label={`${done} of ${total} passed`} role="img">
      <svg width="64" height="64" aria-hidden="true">
        <circle cx="32" cy="32" r={r} fill="none" className="stroke-slate-100" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" className={all ? 'stroke-emerald-500' : 'stroke-indigo-600'} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 32 32)" />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold font-mono ${all ? 'text-emerald-700' : 'text-slate-800'}`}>
        {all ? <Check className="w-6 h-6" strokeWidth={3} /> : `${done}/${total}`}
      </span>
    </span>
  );
};

export const TestsBrowser: React.FC<TestsBrowserProps> = ({ candidate, allCandidates, tests, jobs, sector, testField, onTestFieldChange, onOpenTest, onStartTest }) => {
  const visibility = useLibraryVisibility();
  const [q, setQ] = useState('');
  const [levels, setLevels] = useState<TestDifficulty[]>([]);
  const [status, setStatus] = useState<Status>('all');
  const [cardLevels, setCardLevels] = useState<Record<string, string>>({});
  const [browseAll, setBrowseAll] = useState(false);

  // Praxa's tests in the sector shown, each once (its levels are picked on its card)
  const library = useMemo(
    () => tests.filter((t) => isPublic(t) && isMainVersion(t) && (sector === 'all' || testInSector(sector)(t)) && !testHidden(visibility, t)),
    [tests, sector, visibility]
  );
  const best = (t: AssessmentTest) => {
    const scores = levelsOf(t, tests)
      .map((v) => getBestTestScore(candidate, v.id))
      .filter((s): s is number => s !== undefined);
    return scores.length ? Math.max(...scores) : undefined;
  };
  const passed = (t: AssessmentTest) => (best(t) ?? -1) >= PASS;
  const easiest = (t: AssessmentTest) => Math.min(...levelsOf(t, tests).map((v) => TEST_DIFFICULTIES.indexOf(v.difficulty)));
  const availableLevels = TEST_DIFFICULTIES.filter((d) => library.some((t) => levelsOf(t, tests).some((v) => v.difficulty === d)));

  // Roles with tests, by industry
  const groups = ROLE_GROUPS.filter((g) => industryInSector(sector)(g.industry))
    .map((g) => ({ industry: g.industry, roles: g.roles.filter((r) => !roleHidden(visibility, r) && library.some((t) => t.roles?.includes(r))) }))
    .filter((g) => g.roles.length);
  const testsFor = (role: TestRole) => library.filter((t) => t.roles?.includes(role));
  const pathFor = (role: TestRole) =>
    (ROLE_SECTIONS[role] ?? []).map((sec) => ({ sec, test: library.find((t) => t.id === sec.testIds[0]) })).filter((m): m is { sec: TestSection; test: AssessmentTest } => !!m.test);

  // Filters shared by every list
  const matches = (t: AssessmentTest) =>
    (!q.trim() || `${t.title} ${t.category} ${t.description} ${t.skillsTested.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())) &&
    (!levels.length || levelsOf(t, tests).some((v) => levels.includes(v.difficulty))) &&
    (status === 'all' || (status === 'passed' ? passed(t) : !passed(t)));

  const role = testField && testField.roles.length === 1 ? testField.roles[0] : null;
  const path = role ? pathFor(role) : [];

  // ---------- One test's card ----------
  const card = (main: AssessmentTest, opts: { step?: number; label?: string; blurb?: string; next?: boolean; sim?: boolean } = {}) => {
    const versions = levelsOf(main, tests);
    const t = versions.find((v) => v.id === cardLevels[main.id]) ?? versions.find((v) => levels.includes(v.difficulty)) ?? main;
    const score = getBestTestScore(candidate, t.id);
    const top = best(main);
    const ok = top !== undefined && top >= PASS;
    const tier = top !== undefined ? getBadgeTier(top) : undefined;
    const taken = getTestStats(t, allCandidates).candidatesRanked;
    const wanted = jobsUsing(main, tests, jobs);
    const sim = opts.sim ?? isSim(main);
    return (
      <li key={main.id} id={`test-card-${main.id}`} className="scroll-mt-24">
        <div
          className={`h-full rounded-2xl bg-white border p-5 flex flex-col gap-3 transition-shadow hover:shadow-md ${
            opts.next ? 'border-indigo-300 ring-2 ring-indigo-100' : ok ? 'border-emerald-200' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  ok ? 'bg-emerald-500 text-white' : sim ? 'bg-violet-100 text-violet-700' : 'bg-indigo-50 text-indigo-700'
                }`}
              >
                {ok ? <Check className="w-4 h-4" strokeWidth={3} /> : sim ? <Briefcase className="w-3.5 h-3.5" /> : opts.step ?? <ListChecks className="w-3.5 h-3.5" />}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 truncate">{opts.label ?? main.category}</span>
            </span>
            {opts.next && !ok ? (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[11px] font-semibold">Up next</span>
            ) : top !== undefined ? (
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {ok ? `${tier!.label} · ${top}` : `Best ${top} · ${PASS} to pass`}
              </span>
            ) : null}
          </div>

          <button onClick={() => onOpenTest(t.id)} className="text-left group">
            <span className="block text-base font-bold text-slate-900 leading-snug group-hover:text-indigo-700">{main.title}</span>
            <span className="mt-1 text-sm text-slate-600 leading-relaxed line-clamp-2">{opts.blurb ?? main.description}</span>
          </button>

          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {t.estimatedMinutes} min
            </span>
            <span>
              {t.totalQuestions} {t.totalQuestions === 1 ? (sim ? 'day' : 'question') : 'questions'}
            </span>
            {taken > 0 && <span>{taken} taken</span>}
            {wanted > 0 && <span className="text-indigo-700 font-medium">Used by {wanted} {wanted === 1 ? 'job' : 'jobs'}</span>}
          </div>

          <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2">
            {versions.length > 1 ? (
              <LevelPicker
                versions={versions}
                selectedId={t.id}
                onSelect={(id) => setCardLevels((prev) => ({ ...prev, [main.id]: id }))}
                bestScores={Object.fromEntries(versions.map((v) => [v.id, getBestTestScore(candidate, v.id)]))}
                compact
              />
            ) : (
              <span className="text-xs font-medium text-slate-500">{levelLabel(t.difficulty)}</span>
            )}
            <button onClick={() => onOpenTest(t.id)} className="ml-auto px-3 py-2 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100">
              Details
            </button>
            <button
              onClick={() => onStartTest(t)}
              className={`px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                score === undefined ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {score === undefined ? 'Start' : 'Retake'}
            </button>
          </div>
        </div>
      </li>
    );
  };

  // ---------- Filters: search, level, status ----------
  const toolbar = (withSearch = true) => (
    <div className="flex flex-wrap items-center gap-2">
      {withSearch && (
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tests and skills"
          className="w-full h-10 pl-9 pr-8 rounded-full border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {q && (
          <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      )}
      {availableLevels.length > 1 && (
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold">
          {availableLevels.map((d) => {
            const on = levels.includes(d);
            return (
              <button
                key={d}
                onClick={() => setLevels((prev) => (on ? prev.filter((x) => x !== d) : [...prev, d]))}
                aria-pressed={on}
                className={`px-3 py-1.5 rounded-full ${on ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {levelLabel(d)}
              </button>
            );
          })}
        </div>
      )}
      <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold">
        {(
          [
            ['all', 'All'],
            ['todo', 'To do'],
            ['passed', 'Passed'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} onClick={() => setStatus(id)} aria-pressed={status === id} className={`px-3 py-1.5 rounded-full ${status === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const empty = <p className="p-8 text-center text-sm text-slate-500 rounded-2xl border border-dashed border-slate-300 bg-white">No tests match. Try another search or level.</p>;

  // ======================= A role: header, path, module cards =======================
  if (role) {
    const all = testsFor(role);
    const modules = path.filter((m) => matches(m.test));
    const extra = all.filter((t) => !path.some((m) => m.test.id === t.id)).filter(matches).sort((a, b) => easiest(a) - easiest(b));
    const done = path.filter((m) => passed(m.test)).length;
    const next = path.filter((m) => !isSim(m.test, m.sec)).find((m) => best(m.test) === undefined) ?? path.find((m) => !passed(m.test));
    const pct = path.length ? Math.round((done / path.length) * 100) : 0;
    const minutes = (path.length ? path.map((m) => m.test) : all).reduce((s, t) => s + t.estimatedMinutes, 0);
    const r = 30;
    const c = 2 * Math.PI * r;
    return (
      <div className="space-y-6">
        <button onClick={() => onTestFieldChange(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          All roles
        </button>

        {/* Header: the role, their progress and the one thing to do next */}
        <section className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs">
          <div className="relative px-6 sm:px-8 py-7 text-white" style={{ background: 'radial-gradient(circle at 85% 90%, rgba(56,189,248,0.4) 0, transparent 45%), linear-gradient(120deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)' }}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
            <div className="relative flex flex-col md:flex-row md:items-center gap-6">
              {path.length > 0 && (
                <div className="relative w-[72px] h-[72px] shrink-0">
                  <svg width="72" height="72" aria-hidden="true">
                    <circle cx="36" cy="36" r={r} fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="6" />
                    <circle cx="36" cy="36" r={r} fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 36 36)" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold font-mono">
                    {done}/{path.length}
                  </span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Tests for</div>
                <h1 className="text-3xl font-bold tracking-tight">{role}</h1>
                <p className="mt-1 text-sm text-indigo-100">
                  {path.length ? `${path.length} tests in order, about ${Math.round(minutes / 60)} hours in all.` : `${all.length} tests.`} Pass one ({PASS}+) and the skill goes on your profile.
                </p>
              </div>
              {next && (
                <button
                  onClick={() => onStartTest(next.test)}
                  className="shrink-0 self-start md:self-auto px-5 py-3 rounded-full bg-white text-indigo-700 hover:bg-indigo-50 text-sm font-bold inline-flex items-center gap-2 shadow-sm"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {best(next.test) === undefined ? `Start ${next.sec.label}` : `Retake ${next.sec.label}`}
                </button>
              )}
            </div>
          </div>

          {/* The path: one step for each module, in order */}
          {path.length > 0 && (
            <ol className="px-4 sm:px-6 py-4 flex gap-1 overflow-x-auto">
              {path.map((m, i) => {
                const ok = passed(m.test);
                const tried = best(m.test) !== undefined;
                const isNext = next?.test.id === m.test.id;
                return (
                  <li key={m.sec.id} className="flex items-center shrink-0">
                    <button
                      onClick={() => document.getElementById(`test-card-${m.test.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                        isNext ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          ok ? 'bg-emerald-500 text-white' : tried ? 'bg-amber-400 text-white' : isNext ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {ok ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                      </span>
                      {m.sec.label}
                    </button>
                    {i < path.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {toolbar()}

        {modules.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {modules.map((m) =>
              card(m.test, { step: path.indexOf(m) + 1, label: m.sec.label, blurb: m.sec.blurb, next: next?.test.id === m.test.id, sim: isSim(m.test, m.sec) })
            )}
          </ul>
        )}
        {extra.length > 0 && (
          <section className="space-y-3">
            {path.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-slate-900">More tests for {role}s</h2>
                <p className="text-sm text-slate-500">Extra skills the role uses. Take them any time.</p>
              </div>
            )}
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{extra.map((t) => card(t))}</ul>
          </section>
        )}
        {!modules.length && !extra.length && empty}
      </div>
    );
  }

  // ======================= A group of roles (an industry, or a field from Home) =======================
  if (testField) {
    const list = library.filter((t) => t.roles?.some((r) => testField.roles.includes(r))).filter(matches).sort((a, b) => easiest(a) - easiest(b));
    return (
      <div className="space-y-6">
        <button onClick={() => onTestFieldChange(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          All roles
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{testField.label} tests</h1>
          <p className="mt-1 text-sm text-slate-500">Or pick one role to follow its tests in order.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {testField.roles
              .filter((r) => library.some((t) => t.roles?.includes(r)))
              .map((r) => (
                <button key={r} onClick={() => onTestFieldChange({ label: r, roles: [r] })} className="px-3.5 py-1.5 rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:border-indigo-400 hover:text-indigo-700">
                  {r}
                </button>
              ))}
          </div>
        </div>
        {toolbar()}
        {list.length ? <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{list.map((t) => card(t))}</ul> : empty}
      </div>
    );
  }

  // ======================= No role yet: pick one, or search everything =======================
  const searching = q.trim() !== '' || browseAll;
  // The job simulations, the one for the job they're after first
  const sims = library.filter(isJobSim).sort((a, b) => Number(!!b.roles?.includes(candidate.targetRole as TestRole)) - Number(!!a.roles?.includes(candidate.targetRole as TestRole)));
  const everything = library.filter(matches).sort((a, b) => easiest(a) - easiest(b));
  return (
    <div className="space-y-8">
      <section className="text-center max-w-2xl mx-auto pt-4 space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Free · marked in seconds · retake any time
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">What job do you want?</h1>
        <p className="text-slate-600">Pick a role and take its tests in order. Each one you pass ({PASS}+) adds a verified skill to your profile, which is what companies hire on.</p>
        <div className="relative max-w-lg mx-auto">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Or search a test or skill, e.g. SQL, Excel, React"
            className="w-full h-12 pl-12 pr-10 rounded-full border border-slate-300 bg-white text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {searching ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">
              {q.trim() ? `${everything.length} ${everything.length === 1 ? 'test' : 'tests'} for “${q.trim()}”` : `Every test (${everything.length})`}
            </h2>
            <button
              onClick={() => {
                setQ('');
                setBrowseAll(false);
              }}
              className="text-sm font-semibold text-indigo-700 hover:underline"
            >
              Back to roles
            </button>
          </div>
          {toolbar(false)}
          {everything.length ? <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{everything.map((t) => card(t))}</ul> : empty}
        </section>
      ) : (
        <>
          {/* Job simulations first: the strongest proof a candidate can give that they can do the job */}
          {sims.length > 0 && (
            <section className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-xs">
              <div className="relative px-6 sm:px-8 py-7 text-white" style={{ background: 'radial-gradient(circle at 85% 90%, rgba(56,189,248,0.4) 0, transparent 45%), linear-gradient(120deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)' }}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                <div className="relative max-w-2xl">
                  <div className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Job simulations</div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Don't just say you can do the job. Show it.</h2>
                  <p className="mt-2 text-sm text-indigo-100">
                    Each one is a real working day in the role, about 40 minutes: emails to answer, the job's own software, and a curveball halfway through.
                    Pass it ({PASS}+) and it goes on your profile as proof you've done the work, which counts for more with companies than any CV line.
                  </p>
                </div>
              </div>
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-px bg-slate-100">
                {sims.map((t) => {
                  const score = best(t);
                  const ok = passed(t);
                  return (
                    <li key={t.id} className="bg-white p-5 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${ok ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`} aria-hidden="true">
                          {ok ? <Check className="w-5 h-5" strokeWidth={3} /> : <Monitor className="w-5 h-5" />}
                        </span>
                        <button onClick={() => onOpenTest(t.id)} className="min-w-0 text-left">
                          <span className="block text-sm font-bold text-slate-900 hover:text-indigo-700">{t.roles?.[0] ?? t.title}</span>
                          <span className="block text-xs text-slate-500">{t.title.replace(/^.*?:\s*/, '')}</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100">
                          <Clock className="w-3 h-3" />~{t.estimatedMinutes} min
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100">5 timed parts</span>
                        {score !== undefined && <span className={`px-2 py-0.5 rounded-full font-semibold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{ok ? `Passed · ${score}` : `Best ${score}`}</span>}
                      </div>
                      <button onClick={() => onStartTest(t)} className={`mt-auto px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${ok ? 'border border-slate-300 text-slate-700 hover:bg-slate-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {score === undefined ? 'Prove it: start the day' : ok ? 'Take it again' : 'Try again'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {groups.map((g) => (
            <section key={g.industry} className="space-y-3">
              <button
                onClick={() => onTestFieldChange({ label: g.industry, roles: g.roles })}
                className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-indigo-700"
              >
                {g.industry}
              </button>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {g.roles.map((r) => {
                  const p = pathFor(r);
                  const list = p.length ? p.map((m) => m.test) : testsFor(r);
                  const done = list.filter(passed).length;
                  const mins = list.reduce((s, t) => s + t.estimatedMinutes, 0);
                  const first = p[0]?.sec.label;
                  return (
                    <li key={r}>
                      <button
                        onClick={() => onTestFieldChange({ label: r, roles: [r] })}
                        className="group w-full h-full text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col gap-3"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block text-base font-bold text-slate-900 group-hover:text-indigo-700">{r}</span>
                            <span className="block text-xs text-slate-500">
                              {list.length} {list.length === 1 ? 'test' : 'tests'} · about {mins >= 90 ? `${Math.round(mins / 60)} hours` : `${mins} min`}
                            </span>
                          </span>
                          {/* How much of the role they've passed, as on the role's own page */}
                          <ProgressRing done={done} total={list.length} />
                        </span>
                        {done > 0 ? (
                          <span className="text-[11px] text-slate-500">
                            {done} of {list.length} passed
                          </span>
                        ) : (
                          first && <span className="text-xs text-slate-500">Starts with <span className="font-semibold text-slate-700">{first}</span></span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          <div className="text-center">
            <button onClick={() => setBrowseAll(true)} className="px-5 py-2.5 rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Browse every test ({library.length})
            </button>
          </div>
        </>
      )}
    </div>
  );
};
