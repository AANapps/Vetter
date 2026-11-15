import React, { useState } from 'react';
import { AppWindow as AppIcon, Bot, Code2, Database, Eye, Layers, Mail, Sheet, TerminalSquare, Trash2, X } from 'lucide-react';
import { AppWindow } from './AppWindow';
import { BUILT_IN_ENVIRONMENTS, EnvironmentPage, SavedEnvironment, deleteEnvironment, loadEnvironmentPage, useEnvironments } from '../lib/environments';
import { auth, firebaseEnabled } from '../lib/firebase';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sheet: Sheet,
  database: Database,
  sql: TerminalSquare,
  code: Code2,
  email: Mail,
  assistant: Bot,
};

const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The environments tests are worked in: Vetter's built-in ones, and every simulation it has built for a test, kept so
 * later tests of the same kind of product are built on it. A saved simulation can be opened by whoever saved it and by
 * the Vetter team (it still holds the data of the test it was made for); everyone sees what each one is.
 */
export const EnvironmentLibrary: React.FC<{ isVetter: boolean }> = ({ isVetter }) => {
  const { environments, loading } = useEnvironments();
  const [open, setOpen] = useState<{ env: SavedEnvironment; page: EnvironmentPage | null } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const me = firebaseEnabled ? auth().currentUser?.uid : undefined;
  const canOpen = (e: SavedEnvironment) => isVetter || !firebaseEnabled || (!!me && e.createdBy === me);

  const preview = async (env: SavedEnvironment) => {
    setOpening(env.id);
    const page = await loadEnvironmentPage(env.id);
    setOpening(null);
    setOpen({ env, page });
  };

  const remove = async (env: SavedEnvironment) => {
    if (!window.confirm(`Delete "${env.name}" from the environment library? Tests already built with it keep their pages.`)) return;
    try {
      await deleteEnvironment(env.id);
    } catch {
      window.alert("Couldn't delete it. Try again in a moment.");
    }
  };

  return (
    <section className="space-y-4" aria-labelledby="environments-heading">
      <div>
        <h2 id="environments-heading" className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Environments
        </h2>
        <p className="text-xs text-slate-500 max-w-2xl">
          Where candidates do the work. Every simulation Vetter builds is saved here, and the next test that needs the same kind of software is built on it
          with fresh data, so it's quicker and stays consistent.
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

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-900">
          Saved simulations <span className="font-mono font-normal text-slate-400">{loading ? '' : environments.length}</span>
        </h3>
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : environments.length === 0 ? (
          <p className="bg-white border border-dashed border-slate-300 rounded-xl px-5 py-6 text-center text-sm text-slate-500">
            None yet. The first time a test needs a piece of software (a CRM, a help desk, a till), Vetter builds it and keeps it here.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {environments.map((env) => (
              <li key={env.id} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <AppIcon className="w-4.5 h-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-900">{env.name}</h4>
                    <p className="text-[11px] text-slate-500">
                      {env.product}
                      {env.game ? ' · game' : ''} · {when(env.createdAt)} · built on {env.uses} {env.uses === 1 ? 'time' : 'times'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600">{env.summary}</p>
                {(canOpen(env) || isVetter || env.createdBy === me) && (
                  <div className="flex gap-2 mt-auto pt-1">
                    {canOpen(env) && (
                      <button
                        type="button"
                        onClick={() => preview(env)}
                        disabled={opening === env.id}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {opening === env.id ? 'Opening…' : 'Open'}
                      </button>
                    )}
                    {(isVetter || !firebaseEnabled || env.createdBy === me) && (
                      <button
                        type="button"
                        onClick={() => remove(env)}
                        aria-label={`Delete ${env.name}`}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-700 bg-white border border-slate-300 hover:border-rose-300 rounded-lg flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={open.env.name}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate">{open.env.name}</h3>
                <p className="text-[11px] text-slate-500 truncate">First built for “{open.env.builtFor}”. Later tests get their own data.</p>
              </div>
              <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 p-3 bg-slate-50">
              {open.page?.html ? (
                <AppWindow value="" onChange={() => {}} html={open.page.html} appName={open.env.name} callouts={open.page.callouts} />
              ) : (
                <p className="text-sm text-slate-500 p-6 text-center">This simulation's page couldn't be loaded.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
