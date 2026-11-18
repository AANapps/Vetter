/**
 * Praxa's app library, as kept in the repo (library-apps/<id>/): apps for job simulations and app tasks, each a
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
