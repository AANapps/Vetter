import React from 'react';
import { AppWindow as AppIcon, Bot, Code2, Database, Layers, Mail, Sheet, TerminalSquare } from 'lucide-react';
import { BUILT_IN_ENVIRONMENTS, useLibrary } from '../lib/environments';
import { SimulationLibraryAdmin } from './SimulationLibraryAdmin';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sheet: Sheet,
  database: Database,
  sql: TerminalSquare,
  code: Code2,
  email: Mail,
  assistant: Bot,
};

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Waiting for Vetter to review', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  approved: { label: 'In the library', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  rejected: { label: 'Not added', tone: 'bg-slate-100 text-slate-600 border-slate-200' },
};

/**
 * The environments tests are worked in: Vetter's built-in ones, and the library of app simulations, one per app, that
 * every test using the app builds on and adds to. A company sees the apps in the library and what its own tests sent
 * for review; the Vetter team reviews and runs the library here too.
 */
export const EnvironmentLibrary: React.FC<{ isVetter: boolean }> = ({ isVetter }) => {
  const { environments, submissions, loading } = useLibrary(isVetter ? false : 'mine');

  return (
    <section className="space-y-4" aria-labelledby="environments-heading">
      <div>
        <h2 id="environments-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Environments
        </h2>
        <p className="text-xs text-slate-500 max-w-2xl">
          Where candidates do the work. Vetter keeps one simulation of each app. A test that uses an app is built on it and adds the features it needs, and once
          Vetter has checked them they're part of the app for every test after.
        </p>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {BUILT_IN_ENVIRONMENTS.map((env) => {
          const Icon = ICONS[env.id] ?? AppIcon;
          return (
            <li key={env.id} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-3">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{env.name}</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Built in</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{env.summary}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {isVetter ? (
        <SimulationLibraryAdmin />
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">
              App simulations <span className="font-mono font-normal text-slate-400">{loading ? '' : environments.length}</span>
            </h3>
            {loading ? (
              <p className="text-xs text-slate-500">Loading…</p>
            ) : environments.length === 0 ? (
              <p className="bg-white border border-dashed border-slate-300 rounded-xl px-5 py-6 text-center text-sm text-slate-500">
                None yet. The first time a test needs an app (Meta Ads Manager, Salesforce, a till), Vetter builds it, checks it and keeps it here.
              </p>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {environments.map((env) => (
                  <li key={env.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <AppIcon className="w-4.5 h-4.5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900">{env.app}</h4>
                        <p className="text-[11px] text-slate-500">
                          {env.product} · version {env.version} · {env.features.length} features
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{env.summary}</p>
                    <ul className="flex flex-wrap gap-1">
                      {env.features.slice(0, 8).map((f) => (
                        <li key={f} className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] text-slate-600">
                          {f}
                        </li>
                      ))}
                      {env.features.length > 8 && <li className="text-[11px] text-slate-400 self-center">and {env.features.length - 8} more</li>}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {submissions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900">From your tests</h3>
              <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                {submissions.map((s) => (
                  <li key={s.id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {s.app} <span className="font-normal text-slate-500">· for “{s.builtFor}”</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{s.envId ? `Adds: ${s.added.join(', ')}` : 'A new app for the library'}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS[s.status].tone}`}>{STATUS[s.status].label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
};
