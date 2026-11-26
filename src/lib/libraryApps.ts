/**
 * Granyt's app library, as kept in the repo (library-apps/<id>/): apps for job simulations and app tasks, each a
 * working copy of a kind of product with no data of its own. A test gives an app its data (its company, records and
 * planted problems); the app reads it from window.praxaData when it starts and saves what the candidate does with
 * praxa.save(state), as every app page does (appSimulation.ts). So one app serves every test that needs it, and a new
 * test usually only writes data.
 *
 * Each app's folder: app.html (the app), manifest.json (its name, version, features, what its data and state look
 * like) and sample-data.json (data to preview it with). `npm run apps` pulls and pushes them to the library in
 * Firestore (scripts/library-apps.mjs), so apps can be refined here and preloaded for every company.
 */

export interface LibraryAppManifest {
  id: string;
  name: string;
  // The kind of product it copies ("help desk", "CRM")
  product: string;
  summary: string;
  version: number;
  features: string[];
  // What its data and its saved state look like, for whoever writes a test on it (people and the AI)
  data: string;
  state: string;
}

export interface LibraryApp {
  manifest: LibraryAppManifest;
  html: string;
  sample: unknown;
}

import { SavedEnvironment, loadEnvironmentPage, loadEnvironments, loadSubmissionPage, loadSubmissions, loadVersion } from './environments';
import { rememberAppCode } from './appRefs';

const pages = import.meta.glob('/library-apps/*/app.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const manifests = import.meta.glob('/library-apps/*/manifest.json', { import: 'default', eager: true }) as Record<string, LibraryAppManifest>;
const samples = import.meta.glob('/library-apps/*/sample-data.json', { import: 'default', eager: true }) as Record<string, unknown>;

export const LIBRARY_APPS: Record<string, LibraryApp> = Object.fromEntries(
  Object.entries(manifests).map(([path, manifest]) => {
    const dir = path.replace(/\/manifest\.json$/, '');
    return [manifest.id, { manifest, html: pages[`${dir}/app.html`] ?? '', sample: samples[`${dir}/sample-data.json`] ?? {} }];
  })
);

const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

// Any app page given data to start from
export function withData(html: string, data: unknown): string {
  const inject = `<script>window.praxaData=${json(data)};</script>`;
  return /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (tag) => `${tag}${inject}`) : inject + html;
}

// An app's page filled with a test's data, ready to run like any app page
export function libraryPage(id: string, data: unknown): string {
  const app = LIBRARY_APPS[id];
  if (!app?.html) throw new Error(`There's no app called ${id} in library-apps`);
  return withData(app.html, data);
}

// --- Pages as an app plus its data

// The data a page was given (by withData), and the app without it. A page made before apps were kept apart from their
// data has none: its data is in its code
const DATA_TAG = /<script>window\.praxaData=([\s\S]*?);<\/script>/;
export function splitData(page: string): { app: string; data?: unknown } {
  const m = DATA_TAG.exec(page);
  if (!m) return { app: page };
  try {
    return { app: page.replace(DATA_TAG, ''), data: JSON.parse(m[1]) };
  } catch {
    return { app: page };
  }
}

// A change to an app as small edits: each find is copied exactly from the app and must be there exactly once
export interface AppEdit {
  find: string;
  replace: string;
}
export function applyEdits(app: string, edits: AppEdit[]): { html: string; problems: string[] } {
  let html = app;
  const problems: string[] = [];
  edits.forEach((e, i) => {
    const find = String(e.find ?? '');
    if (!find) return problems.push(`Edit ${i + 1} has nothing in find.`);
    const at = html.indexOf(find);
    if (at < 0) return problems.push(`Edit ${i + 1}: its find text isn't in the app (copy it exactly): ${find.slice(0, 120)}`);
    if (html.indexOf(find, at + 1) >= 0) return problems.push(`Edit ${i + 1}: its find text is in the app more than once; include more around it: ${find.slice(0, 120)}`);
    html = html.slice(0, at) + String(e.replace ?? '') + html.slice(at + find.length);
  });
  return { html, problems };
}

// A data object as the AI wrote it (a JSON string), or undefined when it isn't one
export function parseData(text: unknown): Record<string, unknown> | undefined {
  if (typeof text !== 'string' || !text.trim()) return undefined;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length ? v : undefined;
  } catch {
    return undefined;
  }
}

// --- Apps a new test can be built on

// An app in the library that is kept apart from its data, so a test only writes data for it (and adds what it lacks)
export interface ReusableApp {
  id: string;
  name: string;
  product: string;
  summary: string;
  features: string[];
  version: number;
  data: string;
  state: string;
  game?: SavedEnvironment['game'];
  // Granyt's own apps in the repo have sample data
  sample?: unknown;
}

// Granyt's own apps and every data-driven app in Firestore, each at its latest version
export async function reusableApps(): Promise<ReusableApp[]> {
  const saved = (await loadEnvironments().catch(() => [] as SavedEnvironment[])).filter((e) => e.dataDriven);
  const out = new Map<string, ReusableApp>();
  for (const e of saved)
    out.set(e.id, { id: e.id, name: e.app || e.name, product: e.product, summary: e.summary, features: e.features, version: e.version, data: e.data ?? '', state: e.state ?? '', ...(e.game && { game: e.game }) });
  // Apps this company had built that are waiting for the Granyt team's review: theirs to reuse straight away (as
  // "sub:<id>"), and everyone's once approved. An app already in the library under the same name is used instead
  const names = new Set(saved.map((e) => (e.app || e.name).trim().toLowerCase()));
  const mine = await loadSubmissions(false).catch(() => []);
  for (const sub of mine)
    if (sub.status === 'pending' && sub.dataDriven && !sub.envId && !names.has(sub.app.trim().toLowerCase())) {
      names.add(sub.app.trim().toLowerCase());
      out.set(`sub:${sub.id}`, { id: `sub:${sub.id}`, name: sub.app || sub.name, product: sub.product, summary: sub.summary, features: [...sub.features, ...sub.added], version: 0, data: sub.data ?? '', state: sub.state ?? '' , ...(sub.game && { game: sub.game }) });
    }
  for (const { manifest: m, sample } of Object.values(LIBRARY_APPS)) {
    const there = out.get(m.id);
    if (!there || there.version < m.version) out.set(m.id, { id: m.id, name: m.name, product: m.product, summary: m.summary, features: m.features, version: m.version, data: m.data, state: m.state, sample });
    else out.set(m.id, { ...there, sample });
  }
  return [...out.values()];
}

// A reusable app's code at the version listed: the repo's copy when that's the one, then that version as kept in the
// library (which candidates can load too, so tests built on it store only a reference), otherwise the library's page
export async function reusableAppCode(app: ReusableApp): Promise<string | null> {
  if (app.id.startsWith('sub:')) {
    const page = await loadSubmissionPage(app.id.slice(4));
    return page?.html ? splitData(page.html).app : null;
  }
  const repo = LIBRARY_APPS[app.id];
  if (repo && repo.manifest.version >= app.version) return repo.html;
  const kept = await loadVersion(app.id, app.version);
  if (kept?.html && kept.dataDriven) {
    const code = splitData(kept.html).app;
    rememberAppCode(app.id, app.version, code);
    return code;
  }
  const page = await loadEnvironmentPage(app.id);
  return page?.html ? splitData(page.html).app : null;
}

// --- Checked by code, before any AI is asked again

// The data-ref names on an app's controls, for tips written without its code
export function refsOf(html: string): string[] {
  return [...new Set([...html.matchAll(/data-ref=["']([\w:.-]+)["']/g)].map((m) => m[1]).filter((r) => !r.endsWith("-")))];
}

const kind = (v: unknown) => (v === null || v === undefined ? 'empty' : Array.isArray(v) ? 'list' : typeof v === 'object' ? 'object' : 'value');

// Where data written for an app doesn't have the shape of its sample: a field every sample record has that's missing,
// or a list or object where the sample has something else. Free and instant, so the AI is only asked again for real
// problems. Kept loose (values' types and optional fields aren't checked) so it never sends good data back
export function shapeProblems(data: unknown, sample: unknown, path = 'data', depth = 0): string[] {
  if (sample === undefined || sample === null || depth > 4) return [];
  const want = kind(sample);
  const got = kind(data);
  if (want !== 'value' && got !== want && got !== 'empty') return [`${path} should be ${want === 'list' ? 'a list' : 'an object'}, as in the app's sample data.`];
  if (want === 'list' && got === 'list') {
    const items = (sample as unknown[]).filter((s) => kind(s) === 'object') as Record<string, unknown>[];
    if (!items.length) return [];
    // A field is required when every sample record has it
    const required = Object.keys(items[0]).filter((k) => items.every((s) => k in s));
    const problems: string[] = [];
    (data as unknown[]).forEach((d, i) => {
      if (problems.length >= 8) return;
      if (kind(d) !== 'object') return problems.push(`${path}[${i}] should be an object like the sample's records.`);
      const lacks = required.filter((k) => !(k in (d as Record<string, unknown>)));
      if (lacks.length) problems.push(`${path}[${i}] is missing ${lacks.join(', ')}.`);
      for (const k of required) if (k in (d as Record<string, unknown>)) problems.push(...shapeProblems((d as Record<string, unknown>)[k], items[0][k], `${path}[${i}].${k}`, depth + 1));
    });
    return problems.slice(0, 12);
  }
  if (want === 'object' && got === 'object') {
    const s = sample as Record<string, unknown>;
    const d = data as Record<string, unknown>;
    // At the top every field of the sample is the app's; deeper down only lists and objects are compared
    const problems = depth === 0 ? Object.keys(s).filter((k) => !(k in d)).map((k) => `${path} is missing ${k}.`) : [];
    for (const k of Object.keys(s)) if (k in d) problems.push(...shapeProblems(d[k], s[k], `${path}.${k}`, depth + 1));
    return problems.slice(0, 12);
  }
  return [];
}
