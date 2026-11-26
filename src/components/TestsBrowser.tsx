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
import { LevelPicker } from './LevelPicker';

/**
 * Corprax's tests, laid out for someone who has never been here. With no role picked it asks what job they want (or
 * lets them search everything). With a role, it's the catalogue for it: a header, the role's tests as numbered steps,
 * and a card for each module. Progress and the next test to take live on Home, not here. A group of roles (an industry, or a field from Home) is a grid of
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

type Status = 'all' | 'todo' | 'done';

const levelLabel = (d: TestDifficulty | string) => (d === 'Junior' ? 'Beginner' : levelName(d));
const isSim = (t: AssessmentTest, sec?: TestSection) => /simulation/i.test(sec?.label ?? '') || /simulation/i.test(t.title);

export const TestsBrowser: React.FC<TestsBrowserProps> = ({ candidate, allCandidates, tests, jobs, sector, testField, onTestFieldChange, onOpenTest, onStartTest }) => {
  const visibility = useLibraryVisibility();
  const [q, setQ] = useState('');
  const [levels, setLevels] = useState<TestDifficulty[]>([]);
  const [status, setStatus] = useState<Status>('all');
  const [cardLevels, setCardLevels] = useState<Record<string, string>>({});
  const [browseAll, setBrowseAll] = useState(false);
  // Skills tests and job simulations are two different things, kept on separate tabs
  const [kind, setKind] = useState<'tests' | 'sims'>('tests');
  const simOf = (t: AssessmentTest) => isJobSim(t) || isSim(t);
  // A list split in two, each half under its own heading
  const splitList = (list: AssessmentTest[], render: (t: AssessmentTest) => React.ReactNode) => {
    const skills = list.filter((t) => !simOf(t));
    const days = list.filter(simOf);
    return (
      <div className="space-y-8">
        {skills.length > 0 && (
          <section className="space-y-3">
            {sectionTitle(`Skills tests (${skills.length})`, 'One skill at a time, about 20 minutes, hands-on in the tool.')}
            <ul className={grid}>{skills.map(render)}</ul>
          </section>
        )}
        {days.length > 0 && (
          <section className="space-y-3">
            {sectionTitle(`Job simulations (${days.length})`, 'A whole working day in the role, about 40 minutes.')}
            <ul className={grid}>{days.map(render)}</ul>
          </section>
        )}
      </div>
    );
  };

  // Corprax's tests in the sector shown, each once (its levels are picked on its card)
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
  // No pass marks: a test is done once it has a score
  const passed = (t: AssessmentTest) => best(t) !== undefined;
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
    (status === 'all' || (status === 'done' ? passed(t) : !passed(t)));

  const role = testField && testField.roles.length === 1 ? testField.roles[0] : null;
  const path = role ? pathFor(role) : [];

  // ---------- One test's card: the same frosted card everywhere on these pages ----------
  const card = (main: AssessmentTest, opts: { step?: number; label?: string; blurb?: string; sim?: boolean } = {}) => {
    const versions = levelsOf(main, tests);
    const t = versions.find((v) => v.id === cardLevels[main.id]) ?? versions.find((v) => levels.includes(v.difficulty)) ?? main;
    const score = getBestTestScore(candidate, t.id);
    const top = best(main);
    const ok = top !== undefined;
    const taken = getTestStats(t, allCandidates).candidatesRanked;
    const wanted = jobsUsing(main, tests, jobs);
    const sim = opts.sim ?? isSim(main);
    return (
      <li key={main.id} id={`test-card-${main.id}`} className="scroll-mt-24">
        <div className="tl-glass tl-card h-full p-5 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className={`tl-tile ${ok ? 'tl-tile-done' : sim ? 'tl-tile-sim' : ''}`} aria-hidden="true">
              {ok ? <Check className="w-5 h-5" strokeWidth={2.5} /> : sim ? <Monitor className="w-5 h-5" /> : opts.step ? <span className="text-sm font-bold">{opts.step}</span> : <ListChecks className="w-5 h-5" />}
            </span>
            <button onClick={() => onOpenTest(t.id)} className="min-w-0 flex-1 text-left group">
              <span className="block text-[11px] font-medium text-slate-500 truncate">{opts.label ?? main.category}</span>
              <span className="block text-[15px] font-semibold text-slate-900 leading-snug group-hover:text-indigo-700">{main.title}</span>
            </button>
            {ok && <span className="shrink-0 tl-chip !text-emerald-700 !font-semibold">Best {top}</span>}
          </div>

          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{opts.blurb ?? main.description}</p>

          <div className="flex flex-wrap gap-1.5">
            <span className="tl-chip">
              <Clock className="w-3 h-3" />
              {t.estimatedMinutes} min
            </span>
            <span className="tl-chip">{sim ? '5 timed parts' : `${t.totalQuestions} ${t.totalQuestions === 1 ? 'question' : 'questions'}`}</span>
            {taken > 0 && <span className="tl-chip">{taken} taken</span>}
            {wanted > 0 && <span className="tl-chip !text-indigo-700">Used by {wanted} {wanted === 1 ? 'job' : 'jobs'}</span>}
          </div>

          <div className="mt-auto pt-4 border-t border-slate-900/5 flex items-center gap-2">
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
            <button onClick={() => onOpenTest(t.id)} className="ml-auto h-8 px-3 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900">
              Details
            </button>
            <button onClick={() => onStartTest(t)} className={`h-8 px-4 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${score === undefined ? 'tl-primary' : 'tl-ghost'}`}>
              <Play className="w-3 h-3 fill-current" />
              {score === undefined ? (sim ? 'Start the day' : 'Start') : 'Retake'}
            </button>
          </div>
        </div>
      </li>
    );
  };

  // ---------- Filters: search, level, status, on one glass bar ----------
  const segment = (on: boolean) => `h-8 px-3 rounded-full transition-colors ${on ? 'tl-seg-on' : 'text-slate-600 hover:text-slate-900'}`;
  const toolbar = (withSearch = true) => (
    <div className="tl-glass !rounded-full p-1.5 flex flex-wrap items-center gap-1.5">
      {withSearch && (
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tests and skills"
            className="w-full h-9 pl-9 pr-8 rounded-full bg-transparent text-sm placeholder:text-slate-400 focus:outline-none focus:bg-white/70"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      {availableLevels.length > 1 && (
        <div className="tl-pill inline-flex rounded-full p-0.5 text-xs font-semibold">
          {availableLevels.map((d) => {
            const on = levels.includes(d);
            return (
              <button key={d} onClick={() => setLevels((prev) => (on ? prev.filter((x) => x !== d) : [...prev, d]))} aria-pressed={on} className={segment(on)}>
                {levelLabel(d)}
              </button>
            );
          })}
        </div>
      )}
      <div className={`tl-pill inline-flex rounded-full p-0.5 text-xs font-semibold ${withSearch ? '' : 'ml-auto'}`}>
        {(
          [
            ['all', 'All'],
            ['todo', 'To do'],
            ['done', 'Done'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} onClick={() => setStatus(id)} aria-pressed={status === id} className={segment(status === id)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );

  const grid = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4';
  const empty = <p className="tl-glass p-10 text-center text-sm text-slate-500">No tests match. Try another search or level.</p>;
  const back = (
    <button onClick={() => onTestFieldChange(null)} className="tl-pill inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900">
      <ArrowLeft className="w-3.5 h-3.5" />
      All roles
    </button>
  );
  const sectionTitle = (title: string, sub?: string) => (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      {sub && <p className="text-sm text-slate-500">{sub}</p>}
    </div>
  );

  // ======================= A role: header, its tests in order, then the rest =======================
  if (role) {
    const all = testsFor(role);
    const modules = path.filter((m) => matches(m.test));
    const extra = all.filter((t) => !path.some((m) => m.test.id === t.id)).filter(matches).sort((a, b) => easiest(a) - easiest(b));
    const minutes = (path.length ? path.map((m) => m.test) : all).reduce((s, t) => s + t.estimatedMinutes, 0);
    const done = (path.length ? path.map((m) => m.test) : all).filter(passed).length;
    const count = path.length || all.length;
    return (
      <div className="tl-aurora space-y-6">
        {back}

        {/* Header: the role, what it takes, and its tests in order */}
        <section className="tl-glass p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-indigo-700">Tests for</div>
              <h1 className="mt-0.5 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">{role}</h1>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(() => {
                  const inRole = path.length ? path.map((m) => m.test) : all;
                  const days = inRole.filter(simOf).length;
                  const skills = inRole.length - days;
                  return (
                    <span className="tl-chip">
                      {skills} skills {skills === 1 ? 'test' : 'tests'}
                      {days > 0 && ` + ${days} job ${days === 1 ? 'simulation' : 'simulations'}`}
                      {path.length ? ', in order' : ''}
                    </span>
                  );
                })()}
                <span className="tl-chip">
                  <Clock className="w-3 h-3" />
                  about {minutes >= 90 ? `${Math.round(minutes / 60)} hours` : `${minutes} min`}
                </span>
                <span className="tl-chip">Each score goes on your profile</span>
              </div>
            </div>
            {count > 0 && (
              <div className="sm:w-48 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Taken</span>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {done} of {count}
                  </span>
                </div>
                <div className="tl-bar">
                  <span style={{ width: `${(done / count) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {path.length > 0 && (
            <ol className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-1">
              {path.map((m, i) => {
                const took = passed(m.test);
                return (
                  <li key={m.sec.id} className="shrink-0">
                    <button
                      onClick={() => document.getElementById(`test-card-${m.test.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                      className="tl-pill h-8 pl-1 pr-3 rounded-full flex items-center gap-2 text-xs font-medium whitespace-nowrap text-slate-700 hover:text-slate-900"
                    >
                      <span className={`w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold ${took ? 'bg-emerald-500 text-white' : 'bg-slate-900/5 text-slate-500'}`}>
                        {took ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
                      </span>
                      {m.sec.label}
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {toolbar()}

        {modules.some((m) => !isSim(m.test, m.sec)) && (
          <section className="space-y-3">
            {sectionTitle('Skills tests', 'One skill at a time, about 20 minutes each, hands-on in the tool. Take them in order.')}
            <ul className={grid}>
              {modules.filter((m) => !isSim(m.test, m.sec)).map((m) => card(m.test, { step: path.indexOf(m) + 1, label: m.sec.label, blurb: m.sec.blurb }))}
            </ul>
          </section>
        )}
        {(modules.some((m) => isSim(m.test, m.sec)) || extra.some(simOf)) && (
          <section className="space-y-3 pt-2">
            {sectionTitle('Job simulation', `A whole working day as a ${role}, about 40 minutes: emails, the job's own software and a curveball. The strongest proof you can do the job.`)}
            <ul className={grid}>
              {modules.filter((m) => isSim(m.test, m.sec)).map((m) => card(m.test, { step: path.indexOf(m) + 1, label: m.sec.label, blurb: m.sec.blurb, sim: true }))}
              {extra.filter(simOf).map((t) => card(t, { sim: true }))}
            </ul>
          </section>
        )}
        {extra.some((t) => !simOf(t)) && (
          <section className="space-y-3 pt-2">
            {sectionTitle(path.length > 0 ? `More skills tests for ${role}s` : 'Skills tests', 'Extra skills the role uses. Take them any time.')}
            <ul className={grid}>{extra.filter((t) => !simOf(t)).map((t) => card(t))}</ul>
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
      <div className="tl-aurora space-y-6">
        {back}
        <section className="tl-glass p-6 sm:p-8 space-y-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">{testField.label} tests</h1>
            <p className="mt-1 text-sm text-slate-500">Or pick one role to follow its tests in order.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {testField.roles
              .filter((r) => library.some((t) => t.roles?.includes(r)))
              .map((r) => (
                <button key={r} onClick={() => onTestFieldChange({ label: r, roles: [r] })} className="tl-ghost h-8 px-3.5 rounded-full text-xs font-semibold">
                  {r}
                </button>
              ))}
          </div>
        </section>
        {toolbar()}
        {list.length ? splitList(list, (t) => card(t, simOf(t) ? { sim: true } : undefined)) : empty}
      </div>
    );
  }

  // ======================= No role yet: pick one, or search everything =======================
  const searching = q.trim() !== '' || browseAll;
  // The job simulations, the one for the job they're after first
  const sims = library.filter(isJobSim).sort((a, b) => Number(!!b.roles?.includes(candidate.targetRole as TestRole)) - Number(!!a.roles?.includes(candidate.targetRole as TestRole)));
  const everything = library.filter(matches).sort((a, b) => easiest(a) - easiest(b));
  const aiTests = library.filter((t) => t.category === 'AI at Work');
  return (
    <div className="tl-aurora space-y-10">
      <section className="text-center max-w-2xl mx-auto pt-6 space-y-5">
        <span className="tl-pill inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-medium text-slate-600">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Free · marked in seconds · retake any time
        </span>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900">What job do you want?</h1>
        <p className="text-slate-600">Pick a role and take its tests in order. Each score goes on your profile, which is what companies hire on.</p>
        <div className="tl-glass !rounded-full relative max-w-lg mx-auto">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Or search a test or skill, e.g. SQL, Excel, React"
            className="w-full h-12 pl-12 pr-10 rounded-full bg-transparent text-sm placeholder:text-slate-400 focus:outline-none"
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
            {sectionTitle(q.trim() ? `${everything.length} ${everything.length === 1 ? 'test' : 'tests'} for “${q.trim()}”` : `Every test (${everything.length})`)}
            <button
              onClick={() => {
                setQ('');
                setBrowseAll(false);
              }}
              className="tl-pill inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to roles
            </button>
          </div>
          {toolbar(false)}
          {everything.length ? splitList(everything, (t) => card(t, simOf(t) ? { sim: true } : undefined)) : empty}
        </section>
      ) : (
        <>
          {/* Two kinds, clearly apart: skills tests and job simulations */}
          <div role="tablist" aria-label="Skills tests or job simulations" className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {(
              [
                ['tests', 'Skills tests', library.filter((t) => !simOf(t)).length, 'One skill at a time, about 20 minutes: hands-on tasks in a spreadsheet, SQL, code and more.', Briefcase],
                ['sims', 'Job simulations', sims.length, 'A whole working day in the role, about 40 minutes, in five timed parts.', Monitor],
              ] as const
            ).map(([id, label, n, blurb, Icon]) => {
              const on = kind === id;
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setKind(id)}
                  className={`tl-glass text-left p-4 flex gap-3 border-2 transition-colors ${on ? '!border-indigo-500' : '!border-transparent hover:!border-slate-200'}`}
                >
                  <span className={`tl-tile ${id === 'sims' ? 'tl-tile-sim' : ''}`} aria-hidden="true">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className={`text-base font-semibold ${on ? 'text-indigo-800' : 'text-slate-900'}`}>{label}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${on ? 'bg-indigo-600 text-white' : 'bg-slate-900/5 text-slate-600'}`}>{n}</span>
                    </span>
                    <span className="block mt-0.5 text-xs text-slate-600">{blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
          {kind === 'sims' && sims.length === 0 && <p className="text-center text-sm text-slate-500">No job simulations yet for this field.</p>}
          {/* Job simulations: the strongest proof a candidate can give that they can do the job */}
          {kind === 'sims' && sims.length > 0 && (
            <section className="space-y-4">
              {sectionTitle(
                'Job simulations',
                "A real working day in the role, about 40 minutes: emails, the job's own software and a curveball. The strongest proof you can do the job."
              )}
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {sims.map((t) => {
                  const score = best(t);
                  return (
                    <li key={t.id}>
                      <div className="tl-glass tl-card h-full p-5 flex flex-col gap-4">
                        <div className="flex items-start gap-3">
                          <span className={`tl-tile ${score !== undefined ? 'tl-tile-done' : 'tl-tile-sim'}`} aria-hidden="true">
                            {score !== undefined ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <Monitor className="w-5 h-5" />}
                          </span>
                          <button onClick={() => onOpenTest(t.id)} className="min-w-0 text-left group">
                            <span className="block text-[15px] font-semibold text-slate-900 group-hover:text-indigo-700">{t.roles?.[0] ?? t.title}</span>
                            <span className="block text-xs text-slate-500">{t.title.replace(/^.*?:\s*/, '')}</span>
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="tl-chip">
                            <Clock className="w-3 h-3" />~{t.estimatedMinutes} min
                          </span>
                          <span className="tl-chip">5 timed parts</span>
                          {score !== undefined && <span className="tl-chip !text-emerald-700 !font-semibold">Best {score}</span>}
                        </div>
                        <button onClick={() => onStartTest(t)} className={`mt-auto h-9 rounded-full text-sm font-semibold inline-flex items-center justify-center gap-1.5 ${score === undefined ? 'tl-primary' : 'tl-ghost'}`}>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          {score === undefined ? 'Start the day' : 'Take it again'}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {/* The AI competency tests: for every job, so above the roles */}
          {kind === 'tests' && aiTests.length > 0 && (
            <section className="space-y-4">
              {sectionTitle('AI at Work', 'For every job: how well you work with AI. Brief and check AI agents, catch their mistakes and keep data safe. About 20 minutes each.')}
              <ul className={grid}>{aiTests.map((t) => card(t, { label: 'AI at Work · every job' }))}</ul>
            </section>
          )}
          {kind === 'tests' && groups.map((g) => (
            <section key={g.industry} className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                {sectionTitle(g.industry)}
                <button onClick={() => onTestFieldChange({ label: g.industry, roles: g.roles })} className="text-xs font-semibold text-indigo-700 hover:underline inline-flex items-center gap-0.5">
                  All {g.industry} tests
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {g.roles.map((r) => {
                  const p = pathFor(r);
                  const list = p.length ? p.map((m) => m.test) : testsFor(r);
                  const done = list.filter(passed).length;
                  const mins = list.reduce((s, t) => s + t.estimatedMinutes, 0);
                  const first = p[0]?.sec.label;
                  return (
                    <li key={r}>
                      <button onClick={() => onTestFieldChange({ label: r, roles: [r] })} className="tl-glass tl-card group w-full h-full text-left p-5 flex flex-col gap-4">
                        <span className="w-full flex items-start gap-3">
                          <span className={`tl-tile ${done === list.length && done > 0 ? 'tl-tile-done' : ''}`} aria-hidden="true">
                            <Briefcase className="w-5 h-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[15px] font-semibold text-slate-900 group-hover:text-indigo-700">{r}</span>
                            <span className="block text-xs text-slate-500">
                              {list.length} {list.length === 1 ? 'test' : 'tests'} · about {mins >= 90 ? `${Math.round(mins / 60)} hours` : `${mins} min`}
                            </span>
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 shrink-0 mt-1" />
                        </span>
                        <span className="mt-auto w-full block space-y-1.5">
                          <span className="flex justify-between text-[11px] text-slate-500">
                            <span className="truncate">{done > 0 ? `${done} of ${list.length} taken` : first ? `Starts with ${first}` : 'Not started'}</span>
                          </span>
                          <span className="tl-bar block w-full">
                            <span style={{ width: `${list.length ? (done / list.length) * 100 : 0}%` }} />
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {kind === 'tests' && (
            <div className="text-center">
              <button onClick={() => setBrowseAll(true)} className="tl-ghost h-10 px-5 rounded-full text-sm font-semibold">
                Browse every test ({library.length})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
