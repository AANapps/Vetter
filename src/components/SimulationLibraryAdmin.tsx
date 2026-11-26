import React, { useState } from 'react';
import { AlertTriangle, AppWindow as AppIcon, Check, Eye, GitMerge, Hammer, Layers, RefreshCw, Trash2, X } from 'lucide-react';
import {
  EnvironmentPage,
  EnvironmentSubmission,
  SavedEnvironment,
  approveSubmission,
  deleteEnvironment,
  isStale,
  loadEnvironmentPage,
  loadSubmissionPage,
  loadVersions,
  EnvironmentVersion,
  publishRepoApp,
  rejectSubmission,
  useLibrary,
} from '../lib/environments';
import { buildLibrarySimulation, mergeSubmission } from '../lib/testChat';
import { startAiRun } from '../lib/aiRequest';
import { SimulationPreview } from './SimulationPreview';
import { LIBRARY_APPS, parseData, withData } from '../lib/libraryApps';

const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

const Chips: React.FC<{ items: string[]; tone?: 'new' | 'plain'; max?: number }> = ({ items, tone = 'plain', max = 12 }) => (
  <ul className="flex flex-wrap gap-1">
    {items.slice(0, max).map((f) => (
      <li key={f} className={`px-1.5 py-0.5 rounded text-[11px] ${tone === 'new' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-600'}`}>
        {tone === 'new' ? '+ ' : ''}
        {f}
      </li>
    ))}
    {items.length > max && <li className="text-[11px] text-slate-400 self-center">and {items.length - max} more</li>}
  </ul>
);

/**
 * The Corprax team's simulation library: every simulation built (for companies' tests and by the Corprax team) waits
 * here to be tried and approved before it joins the library or becomes an app's next version. The team can also build
 * an app for the library, look through the library, and take an app out of it.
 */
export const SimulationLibraryAdmin: React.FC = () => {
  const { environments: saved, submissions, loading, error } = useLibrary('all');
  // The library: the apps in Firestore, and Corprax's own apps in the repo (library-apps/) that aren't pushed yet or are
  // newer there, so the team sees every app (npm run apps -- push <id> puts one in Firestore)
  const repoOnly: SavedEnvironment[] = Object.values(LIBRARY_APPS)
    .filter(({ manifest: m }) => !saved.some((e) => e.id === m.id && e.version >= m.version))
    .map(({ manifest: m }) => ({ id: m.id, app: m.name, name: m.name, product: m.product, summary: m.summary, features: m.features, version: m.version, builtFor: 'Corprax', createdAt: '', updatedAt: '', uses: 0 }));
  const environments = [...repoOnly, ...saved.filter((e) => !repoOnly.some((r) => r.id === e.id))];
  const inRepoOnly = (env: SavedEnvironment) => repoOnly.some((r) => r.id === env.id);
  const [view, setView] = useState<'pending' | 'library' | 'decided'>('library');
  const [open, setOpen] = useState<{ kind: 'sub'; sub: EnvironmentSubmission; page: EnvironmentPage | null } | { kind: 'env'; env: SavedEnvironment; page: EnvironmentPage | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [building, setBuilding] = useState(false);
  const [app, setApp] = useState('');
  const [wants, setWants] = useState('');

  const pending = submissions.filter((s) => s.status === 'pending');
  const decided = submissions.filter((s) => s.status !== 'pending');
  // The library app a submission belongs to: the one it was built on, or one already there with the same name
  const envOf = (s: EnvironmentSubmission) => environments.find((e) => (s.envId ? e.id === s.envId : e.app.trim().toLowerCase() === s.app.trim().toLowerCase()));

  const run = async (id: string, task: () => Promise<string | null | void>) => {
    setBusy(id);
    setProblem(null);
    try {
      const err = await task();
      if (err) setProblem(err);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : 'That didn\'t work. Try again.');
    } finally {
      setBusy(null);
      setStatus(null);
    }
  };

  // A data-driven app is tried with the data of the test it was built for
  const filled = (page: EnvironmentPage | null, data?: unknown): EnvironmentPage | null => (page && data ? { ...page, html: withData(page.html, data) } : page);
  const openSub = async (sub: EnvironmentSubmission) => {
    const page = await loadSubmissionPage(sub.id);
    setOpen({ kind: 'sub', sub, page: filled(page, parseData(page?.data)) });
  };
  // Some data to try a library app with: Corprax's own sample, else the data of the latest test it was built for
  const dataFor = async (envId: string): Promise<unknown> => {
    if (LIBRARY_APPS[envId]) return LIBRARY_APPS[envId].sample;
    const app = environments.find((e) => e.id === envId)?.app.trim().toLowerCase();
    const last = submissions
      .filter((s) => s.envId === envId || (!s.envId && s.app.trim().toLowerCase() === app))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return last ? parseData((await loadSubmissionPage(last.id))?.data) : undefined;
  };
  const [versions, setVersions] = useState<{ envId: string; list: EnvironmentVersion[] } | null>(null);
  const showVersions = async (env: SavedEnvironment) =>
    versions?.envId === env.id ? setVersions(null) : setVersions({ envId: env.id, list: await loadVersions(env.id) });
  const openVersion = async (env: SavedEnvironment, v: EnvironmentVersion) =>
    setOpen({ kind: 'env', env: { ...env, version: v.version }, page: filled({ html: v.html }, env.dataDriven || LIBRARY_APPS[env.id] ? await dataFor(env.id) : undefined) });
  // Corprax's own apps hold no data, so they open with their sample data
  const openEnv = async (env: SavedEnvironment) => {
    const repo = LIBRARY_APPS[env.id];
    const page = inRepoOnly(env) ? { html: repo.html } : await loadEnvironmentPage(env.id);
    setOpen({ kind: 'env', env, page: filled(page, repo || env.dataDriven ? await dataFor(env.id) : undefined) });
  };

  const approve = (sub: EnvironmentSubmission) =>
    run(sub.id, async () => {
      if (isStale(sub, environments) && !window.confirm(`Version ${envOf(sub)?.version} of ${sub.app} was approved after this was built, so approving it as it is would lose that version's features. Approve anyway? (Merge onto latest keeps both.)`)) return;
      const page = await loadSubmissionPage(sub.id);
      if (!page?.html) return "Couldn't load its page.";
      await approveSubmission(sub, page);
      setOpen(null);
    });

  const reject = (sub: EnvironmentSubmission) =>
    run(sub.id, async () => {
      await rejectSubmission(sub, note);
      setRejecting(null);
      setNote('');
      setOpen(null);
    });

  const merge = (sub: EnvironmentSubmission) =>
    run(sub.id, async () => {
      startAiRun();
      return mergeSubmission(sub, setStatus);
    });

  const build = () =>
    run('build', async () => {
      if (!app.trim()) return 'Name the app to build.';
      startAiRun();
      setBuilding(true);
      const err = await buildLibrarySimulation(app.trim(), wants, (s) => setStatus(s)).finally(() => setBuilding(false));
      if (!err) {
        setApp('');
        setWants('');
        setView('pending');
      }
      return err;
    });

  const remove = (env: SavedEnvironment) =>
    run(env.id, async () => {
      if (!window.confirm(`Take ${env.app} out of the library? Tests already built with it keep their pages; new tests will build it again from nothing.`)) return;
      await deleteEnvironment(env.id);
    });

  // A plain function, not a component, so typing a note doesn't remount the card and lose focus
  const subCard = (sub: EnvironmentSubmission) => {
    const env = envOf(sub);
    const stale = isStale(sub, environments);
    return (
      <li key={sub.id} className="p-4 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-slate-900">
              {sub.app}{' '}
              <span className="font-normal text-slate-500">
                {sub.envId ? `· new features for version ${(sub.baseVersion ?? 0) + 1}` : env ? `· built new: approving replaces version ${env.version}` : '· new app for the library'}
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              Built for “{sub.builtFor}” by {sub.owner} · {when(sub.createdAt)}
              {sub.status !== 'pending' && ` · ${sub.status === 'approved' ? `approved as version ${sub.version ?? '?'}` : 'turned down'} ${when(sub.reviewedAt)}`}
            </p>
          </div>
          {sub.status === 'pending' && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => openSub(sub)} className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Try it
              </button>
              {stale && (
                <button type="button" disabled={!!busy} onClick={() => merge(sub)} className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:border-indigo-400 rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                  <GitMerge className="w-3.5 h-3.5" />
                  {busy === sub.id ? 'Merging…' : `Merge onto version ${env?.version}`}
                </button>
              )}
              <button type="button" disabled={!!busy} onClick={() => approve(sub)} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                <Check className="w-3.5 h-3.5" />
                Approve
              </button>
              <button type="button" disabled={!!busy} onClick={() => setRejecting(rejecting === sub.id ? null : sub.id)} className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:border-rose-300 hover:text-rose-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                <X className="w-3.5 h-3.5" />
                Turn down
              </button>
            </div>
          )}
        </div>
        {sub.added.length > 0 && <Chips items={sub.added} tone="new" />}
        {sub.envId && env && <p className="text-[11px] text-slate-500">On top of {env.features.length} features already in {env.app}.</p>}
        {stale && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Built on version {sub.baseVersion}, but version {env?.version} has been approved since. Merge it onto the latest version (then try it again), or approving it will lose what that version added.
          </p>
        )}
        {sub.note && <p className="text-xs text-slate-600">Note: {sub.note}</p>}
        {rejecting === sub.id && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why (optional): what doesn't work" className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg" />
            <button type="button" disabled={!!busy} onClick={() => reject(sub)} className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50">
              Turn it down
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4" aria-labelledby="sim-library-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="sim-library-heading" className="font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" />
          Simulation library{pending.length > 0 ? ` (${pending.length} to review)` : ''}
        </h3>
      </div>
      <p className="text-xs text-slate-500">
        One simulation per app. Every simulation Corprax builds, for a company's test or here, waits for you to try it. Approve a new app to add it to the library,
        or new features to make them the app's next version. Every later test of that app is built on the latest version and adds to it.
      </p>

      {/* Building an app for the library */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Hammer className="w-4 h-4 text-indigo-600" />
          Build a simulation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-[16rem_minmax(0,1fr)_auto] gap-2 items-start">
          <input value={app} onChange={(e) => setApp(e.target.value)} disabled={building} placeholder="The app, e.g. Meta Ads Manager" aria-label="App" className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white" />
          <textarea
            value={wants}
            onChange={(e) => setWants(e.target.value)}
            disabled={building}
            rows={2}
            placeholder="What it should have, e.g. campaign creation with objectives, ad sets with audiences and budgets, ad creative editor, reporting table"
            aria-label="Features"
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
          />
          <button type="button" onClick={build} disabled={!!busy || !app.trim()} className="px-3 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
            {building ? 'Building…' : 'Build'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          If the app is in the library already, this adds the features to it. Takes a few minutes; it then waits below for you to try and approve.
        </p>
      </div>

      {status && (
        <p className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          {status}
        </p>
      )}
      {(problem || error) && <p className="text-sm text-rose-700">{problem || error}</p>}

      <div role="tablist" aria-label="Simulations" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
        {(
          [
            ['pending', `To review (${pending.length})`],
            ['library', `Library (${environments.length})`],
            ['decided', `Decided (${decided.length})`],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`px-3 py-1.5 rounded-md ${view === id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : view === 'pending' ? (
        pending.length ? (
          <ul className="border border-slate-200 rounded-xl divide-y divide-slate-100">{pending.map(subCard)}</ul>
        ) : (
          <p className="text-sm text-slate-500">Nothing waiting. New simulations appear here as companies build tests, or when you build one above.</p>
        )
      ) : view === 'decided' ? (
        decided.length ? (
          <ul className="border border-slate-200 rounded-xl divide-y divide-slate-100">{decided.map(subCard)}</ul>
        ) : (
          <p className="text-sm text-slate-500">Nothing approved or turned down yet.</p>
        )
      ) : environments.length ? (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {environments.map((env) => (
            <li key={env.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-start gap-3">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <AppIcon className="w-4.5 h-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-slate-900">{env.app}</h4>
                  <p className="text-[11px] text-slate-500">
                    {inRepoOnly(env)
                      ? `Version ${env.version} · ${env.features.length} features · Corprax's own app, in the repo (not pushed to the library yet)`
                      : `Version ${env.version} · ${env.features.length} features · built on ${env.uses} ${env.uses === 1 ? 'time' : 'times'} · updated ${when(env.updatedAt)}`}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600">{env.summary}</p>
              {(env.dataDriven || LIBRARY_APPS[env.id]) && <p className="text-[11px] text-emerald-700">Kept apart from its data: tests only write data for it, and add to it when they need more.</p>}
              <Chips items={env.features} max={10} />
              {versions?.envId === env.id && (
                <ul className="border border-slate-100 rounded-lg divide-y divide-slate-100">
                  {versions.list.length === 0 && <li className="px-3 py-2 text-[11px] text-slate-500">No versions kept yet (versions are kept from 18 Nov 2026).</li>}
                  {versions.list.map((v) => (
                    <li key={v.id} className="px-3 py-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">Version {v.version}</span>
                        <span className="text-[11px] text-slate-500 flex-1 truncate">
                          {when(v.at)}
                          {v.by ? ` · ${v.by}` : ''}
                        </span>
                        <button type="button" onClick={() => openVersion(env, v)} className="text-[11px] font-semibold text-indigo-700 hover:underline">
                          Open
                        </button>
                      </div>
                      {v.added?.length ? <Chips items={v.added} tone="new" max={8} /> : <p className="text-[11px] text-slate-400">{v.version === 1 ? 'First version' : 'No new features listed'}</p>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => openEnv(env)} className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Open
                </button>
                {!inRepoOnly(env) && (
                  <button type="button" onClick={() => showVersions(env)} className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 rounded-lg">
                    {versions?.envId === env.id ? 'Hide versions' : 'Versions'}
                  </button>
                )}
                {inRepoOnly(env) && (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() =>
                      run(env.id, async () => {
                        const repo = LIBRARY_APPS[env.id];
                        try {
                          await publishRepoApp(repo.manifest, repo.html);
                        } catch (e) {
                          return `Couldn't add it: ${e instanceof Error ? e.message : String(e)}. If it says permission, the Firestore rules need deploying.`;
                        }
                      })
                    }
                    className="px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {busy === env.id ? 'Adding…' : saved.some((e) => e.id === env.id) ? `Update the library to version ${env.version}` : 'Add to library'}
                  </button>
                )}
                {!inRepoOnly(env) && <button type="button" disabled={!!busy} onClick={() => remove(env)} className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-700 bg-white border border-slate-300 hover:border-rose-300 rounded-lg flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">The library is empty. Approve a simulation, or build one above.</p>
      )}

      {open?.kind === 'sub' && (
        <SimulationPreview
          title={`${open.sub.app}${open.sub.envId ? ` (proposed version ${(open.sub.baseVersion ?? 0) + 1})` : ' (new)'}`}
          subtitle={`Built for “${open.sub.builtFor}” by ${open.sub.owner}. New: ${open.sub.added.slice(0, 6).join(', ') || 'nothing listed'}`}
          page={open.page}
          onClose={() => setOpen(null)}
        >
          <button type="button" disabled={!!busy} onClick={() => approve(open.sub)} className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 disabled:opacity-50">
            <Check className="w-3.5 h-3.5" />
            Approve
          </button>
        </SimulationPreview>
      )}
      {open?.kind === 'env' && (
        <SimulationPreview title={`${open.env.app} · version ${open.env.version}`} subtitle={open.env.summary} page={open.page} onClose={() => setOpen(null)} />
      )}
    </section>
  );
};
