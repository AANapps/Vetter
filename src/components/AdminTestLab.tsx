import React, { useMemo, useState } from 'react';
import { AppWindow as AppWindowIcon, FlaskConical, Monitor, Play, Search, X } from 'lucide-react';
import { AssessmentTest, Question, isJobSim, levelName } from '../types';
import { DesktopConfig } from '../lib/desktop';
import { hydrateTest } from '../lib/appRefs';
import { LIBRARY_APPS, libraryPage } from '../lib/libraryApps';
import { workbookStarter } from '../lib/spreadsheet';
import { STANDARD_ASSESSMENTS } from '../data/mockData';
import { PRACTICE_SIM } from '../data/practiceSim';
import { Desktop } from './Desktop';
import { AppWindow } from './AppWindow';
import { TestRunner } from './TestRunner';

/**
 * The admin panel's test lab: the Praxa team tries anything at once, and nothing is saved. Every test runs straight
 * in (no intro, signing, countdown, full screen or retake gap); the desktop opens untimed with every app on it, or any
 * one app, or any job simulation's own desktop; and each library app opens on its own with its sample data.
 */

const BUILT_IN: { id: string; label: string }[] = [
  { id: 'mail', label: 'Mail' },
  { id: 'browser', label: 'Browser' },
  { id: 'files', label: 'Files' },
  { id: 'sheet', label: 'Spreadsheet' },
  { id: 'sql', label: 'Database' },
  { id: 'code', label: 'Code' },
  { id: 'ai', label: 'AI assistant' },
];

// A job simulation's desktop, untimed: the whole day's email is there from the start
const untimed = (cfg: DesktopConfig): DesktopConfig => ({ ...cfg, phases: undefined, inbox: cfg.inbox.map(({ phase: _phase, ...m }) => m) });

const desktopOf = (test: AssessmentTest) => hydrateTest(test).questions.find((q) => q.type === 'desktop' && q.desktop)?.desktop;

// Every app on one desktop: the built-in ones filled from Praxa's job simulations (their pages, workbook, tables and
// code), and every library app with its sample data
function sandboxDesktop(sims: AssessmentTest[]): DesktopConfig {
  const desks = sims.map(desktopOf).filter((d): d is DesktopConfig => !!d);
  const pick = <K extends keyof DesktopConfig>(k: K) => desks.find((d) => d[k] !== undefined && (!Array.isArray(d[k]) || (d[k] as unknown[]).length))?.[k];
  const withPages = desks.find((d) => d.pages?.length);
  const unique = <T,>(items: T[], key: (t: T) => string) => items.filter((t, i) => items.findIndex((u) => key(u) === key(t)) === i);
  return {
    user: { name: 'Praxa Admin', email: 'admin@praxa.test', role: 'Admin' },
    company: 'Praxa test lab',
    time: 'Mon 09:00',
    apps: [...BUILT_IN.map((a) => a.id), ...Object.keys(LIBRARY_APPS)],
    customApps: Object.values(LIBRARY_APPS).map((a) => ({ id: a.manifest.id, label: a.manifest.name, html: libraryPage(a.manifest.id, a.sample) })),
    contacts: unique(desks.flatMap((d) => d.contacts), (c) => c.email).slice(0, 12),
    inbox: [
      {
        id: 'lab-welcome',
        from: 'Praxa test lab <lab@praxa.test>',
        to: ['admin@praxa.test'],
        date: 'Mon 08:55',
        subject: 'The test lab desktop',
        body: 'Every app is here with data from Praxa’s job simulations and each library app’s sample data. Nothing is saved: close the desktop and it starts fresh.',
      },
      ...desks.flatMap((d, i) => d.inbox.slice(0, 2).map(({ phase: _phase, ...m }) => ({ ...m, id: `lab-${i}-${m.id}` }))),
    ],
    replies: unique(desks.flatMap((d) => d.replies ?? []), (r) => r.id),
    pages: withPages?.pages,
    homepage: withPages?.homepage,
    files: unique(desks.flatMap((d) => d.files ?? []), (f) => f.name),
    workbook: pick('workbook') ?? workbookStarter([{ name: 'Sheet1', rows: [['A', 'B'], [1, 2]] }]),
    workbookName: pick('workbookName') ?? 'Book1',
    tables: pick('tables'),
    databaseName: pick('databaseName'),
    project: pick('project'),
  };
}

const asQuestion = (desktop: DesktopConfig, title: string): Question => ({ id: 'lab-desktop', title, type: 'desktop', prompt: '', starterCode: '', desktop, testCases: [], timeLimitMinutes: 0, weight: 1 });

// The desktop over the page, untimed, with nothing saved
const DesktopSandbox: React.FC<{ title: string; desktop: DesktopConfig; startApp?: string; onClose: () => void }> = ({ title, desktop, startApp, onClose }) => {
  const [answer, setAnswer] = useState('');
  const question = useMemo(() => asQuestion(desktop, title), [desktop, title]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 flex flex-col p-3 gap-2">
      <div className="flex items-center gap-3 text-white">
        <Monitor className="w-4 h-4" />
        <span className="text-sm font-semibold truncate">{title}</span>
        <span className="px-1.5 py-px rounded bg-amber-300 text-amber-950 text-[10px] font-bold uppercase tracking-wide">Test lab · not saved</span>
        <button onClick={onClose} className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold">
          <X className="w-4 h-4" />
          Close
        </button>
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-lg overflow-hidden">
        <Desktop question={question} answer={answer} onChange={setAnswer} startApp={startApp} company={desktop.company} />
      </div>
    </div>
  );
};

// A library app on its own, with its sample data
const AppAlone: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const app = LIBRARY_APPS[id];
  const [state, setState] = useState('');
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 flex flex-col p-3 gap-2">
      <div className="flex items-center gap-3 text-white">
        <AppWindowIcon className="w-4 h-4" />
        <span className="text-sm font-semibold">
          {app.manifest.name} · v{app.manifest.version} · sample data
        </span>
        <span className="px-1.5 py-px rounded bg-amber-300 text-amber-950 text-[10px] font-bold uppercase tracking-wide">Test lab · not saved</span>
        <button onClick={onClose} className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold">
          <X className="w-4 h-4" />
          Close
        </button>
      </div>
      <div className="flex-1 min-h-0 bg-white rounded-lg overflow-hidden">
        <AppWindow value={state} onChange={setState} html={libraryPage(id, app.sample)} appName={app.manifest.name} />
      </div>
    </div>
  );
};

export const AdminTestLab: React.FC = () => {
  const tests = STANDARD_ASSESSMENTS;
  const sims = useMemo(() => tests.filter(isJobSim), [tests]);
  const sandbox = useMemo(() => sandboxDesktop(sims), [sims]);
  const [run, setRun] = useState<{ test: AssessmentTest; practice?: boolean } | null>(null);
  const [desk, setDesk] = useState<{ title: string; desktop: DesktopConfig; startApp?: string } | null>(null);
  const [alone, setAlone] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const shown = tests
    .filter((t) => !q.trim() || `${t.title} ${t.category} ${t.roles?.join(' ') ?? ''} ${t.difficulty}`.toLowerCase().includes(q.trim().toLowerCase()))
    .slice(0, 60);

  const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold';
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-6">
      <div>
        <h2 className="font-bold flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-indigo-600" />
          Test lab
        </h2>
        <p className="text-sm text-slate-600">Try any test, the desktop or any app straight away. No intro, timer lock, retake gap or full screen, and nothing is saved.</p>
      </div>

      {/* The desktop and its apps */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Desktop</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setDesk({ title: 'Desktop: every app', desktop: sandbox })} className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white`}>
            <Monitor className="w-3.5 h-3.5" />
            Open the desktop
          </button>
          <button onClick={() => setRun({ test: PRACTICE_SIM, practice: true })} className={`${btn} border border-slate-300 hover:border-slate-500 text-slate-700`}>
            <Play className="w-3.5 h-3.5" />
            Job simulation practice
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[...BUILT_IN, ...Object.values(LIBRARY_APPS).map((a) => ({ id: a.manifest.id, label: a.manifest.name }))].map((a) => (
            <button
              key={a.id}
              onClick={() => setDesk({ title: `Desktop: ${a.label}`, desktop: sandbox, startApp: a.id })}
              className={`${btn} bg-slate-100 hover:bg-slate-200 text-slate-700`}
            >
              {a.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">The AI assistant answers for real (it uses AI credit). Everything else runs in the browser.</p>
      </div>

      {/* Library apps on their own */}
      {Object.keys(LIBRARY_APPS).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Library apps on their own</h3>
          <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {Object.values(LIBRARY_APPS).map(({ manifest: m }) => (
              <li key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">
                    {m.name} <span className="font-normal text-slate-500">· {m.product} · v{m.version}</span>
                  </span>
                  <span className="block text-xs text-slate-500 truncate">{m.summary}</span>
                </span>
                <button onClick={() => setAlone(m.id)} className={`${btn} border border-slate-300 hover:border-slate-500 text-slate-700`}>
                  Open
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Job simulations: the test, or just its desktop */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Job simulations</h3>
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
          {sims.map((t) => (
            <li key={t.id} className="px-4 py-2.5 flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{t.title}</span>
              <button onClick={() => setRun({ test: t })} className={`${btn} bg-indigo-600 hover:bg-indigo-700 text-white`}>
                <Play className="w-3.5 h-3.5" />
                Run the test
              </button>
              <button
                onClick={() => {
                  const d = desktopOf(t);
                  if (d) setDesk({ title: `${t.title} · untimed`, desktop: untimed(d) });
                }}
                className={`${btn} border border-slate-300 hover:border-slate-500 text-slate-700`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Its desktop
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Every test */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Every test ({tests.length})</h3>
          <label className="flex items-center gap-2 h-8 px-3 rounded-lg border border-slate-300 focus-within:border-indigo-500">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title, role or level" className="text-xs outline-none w-56" />
          </label>
        </div>
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-[28rem] overflow-y-auto">
          {shown.map((t) => (
            <li key={t.id} className="px-4 py-2 flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-900 truncate">{t.title}</span>
                <span className="block text-[11px] text-slate-500">
                  {t.category} · {levelName(t.difficulty)} · ~{t.estimatedMinutes} min · {t.questions.length} {t.questions.length === 1 ? 'task' : 'tasks'}
                </span>
              </span>
              <button onClick={() => setRun({ test: t })} className={`${btn} border border-slate-300 hover:border-indigo-400 text-slate-700`}>
                <Play className="w-3.5 h-3.5" />
                Run
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="px-4 py-6 text-center text-xs text-slate-500">No tests match.</li>}
        </ul>
        {tests.length > shown.length && <p className="text-[11px] text-slate-500">Showing {shown.length}; search to find the rest.</p>}
      </div>

      {run &&
        (run.practice ? (
          <TestRunner test={run.test} preview practice onClose={() => setRun(null)} onComplete={() => setRun(null)} />
        ) : (
          <TestRunner test={hydrateTest(run.test)} preview instant onClose={() => setRun(null)} onComplete={() => setRun(null)} />
        ))}
      {desk && <DesktopSandbox {...desk} onClose={() => setDesk(null)} />}
      {alone && <AppAlone id={alone} onClose={() => setAlone(null)} />}
    </section>
  );
};
