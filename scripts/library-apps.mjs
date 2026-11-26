#!/usr/bin/env node
// Granyt's app library between the repo (library-apps/<id>/) and Firestore. See library-apps/README.md.
//   npm run apps -- list | pull <id> | push <id>
// Uses the Firebase CLI's login (npx firebase-tools login) as the project's owner, so it isn't held to the
// security rules. The project comes from VITE_FIREBASE_PROJECT_ID in .env.local (or FIREBASE_PROJECT).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const APPS = join(ROOT, 'library-apps');

function project() {
  if (process.env.FIREBASE_PROJECT) return process.env.FIREBASE_PROJECT;
  for (const f of ['.env.local', '.env']) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    const m = /^VITE_FIREBASE_PROJECT_ID=["']?([^"'\s]+)/m.exec(readFileSync(p, 'utf8'));
    if (m) return m[1];
  }
  throw new Error('No Firebase project: set VITE_FIREBASE_PROJECT_ID in .env.local or FIREBASE_PROJECT');
}

// An access token from the Firebase CLI's saved login (its public OAuth client, as the CLI itself refreshes it)
async function token() {
  const file = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!existsSync(file)) throw new Error('Not logged in to Firebase: run  npx firebase-tools login');
  const t = JSON.parse(readFileSync(file, 'utf8')).tokens ?? {};
  if (t.access_token && t.expires_at > Date.now() + 60_000) return t.access_token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      grant_type: 'refresh_token',
      refresh_token: t.refresh_token ?? '',
    }),
  });
  const body = await res.json();
  if (!body.access_token)
    throw new Error(`Firebase login has expired (${body.error_description ?? body.error}). Run  npx -y firebase-tools@13 login --reauth --no-localhost`);
  return body.access_token;
}

// --- Firestore REST, with plain JSON in and out

const enc = (v) =>
  v === null || v === undefined
    ? { nullValue: null }
    : typeof v === 'boolean'
      ? { booleanValue: v }
      : typeof v === 'number'
        ? Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
        : typeof v === 'string'
          ? { stringValue: v }
          : Array.isArray(v)
            ? { arrayValue: { values: v.map(enc) } }
            : { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)])) } };
const dec = (v) => {
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(dec);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, dec(x)]));
  return null;
};

async function firestore() {
  const base = `https://firestore.googleapis.com/v1/projects/${project()}/databases/(default)/documents`;
  const auth = { Authorization: `Bearer ${await token()}` };
  const call = async (method, path, body) => {
    const res = await fetch(`${base}/${path}`, { method, headers: { ...auth, 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    if (res.status === 404 && method === 'GET') return null;
    const json = await res.json();
    if (!res.ok) throw new Error(`Firestore ${method} ${path}: ${json.error?.message ?? res.status}`);
    return json;
  };
  return {
    get: async (path) => {
      const d = await call('GET', path);
      return d && Object.fromEntries(Object.entries(d.fields ?? {}).map(([k, v]) => [k, dec(v)]));
    },
    list: async (coll) => {
      const out = [];
      let page = '';
      do {
        const d = await call('GET', `${coll}?pageSize=300${page ? `&pageToken=${page}` : ''}`);
        for (const doc of d?.documents ?? []) out.push({ id: doc.name.split('/').pop(), ...Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, v]) => [k, dec(v)])) });
        page = d?.nextPageToken ?? '';
      } while (page);
      return out;
    },
    // Several documents written together, all or none
    commit: async (writes) => {
      const name = (path) => `projects/${project()}/databases/(default)/documents/${path}`;
      const res = await fetch(`${base.replace(/\/documents$/, '')}/documents:commit`, {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes: writes.map(([path, data]) => ({ update: { name: name(path), fields: enc(data).mapValue.fields } })) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(`Firestore commit: ${json.error?.message ?? res.status}`);
    },
  };
}

// --- The repo's apps

const localIds = () => (existsSync(APPS) ? readdirSync(APPS).filter((d) => existsSync(join(APPS, d, 'manifest.json'))) : []);
const readLocal = (id) => {
  const dir = join(APPS, id);
  if (!existsSync(join(dir, 'manifest.json'))) throw new Error(`No app called ${id} in library-apps/`);
  return { dir, manifest: JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')), html: readFileSync(join(dir, 'app.html'), 'utf8') };
};
const writeManifest = (dir, m) => writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(m, null, 2)}\n`);

async function list() {
  const fs = await firestore();
  const remote = await fs.list('environments');
  const ids = [...new Set([...localIds(), ...remote.map((r) => r.id)])].sort();
  console.log('app'.padEnd(28), 'repo'.padEnd(8), 'library'.padEnd(8), 'name');
  for (const id of ids) {
    const l = localIds().includes(id) ? readLocal(id).manifest : null;
    const r = remote.find((x) => x.id === id);
    console.log(id.padEnd(28), String(l?.version ?? '-').padEnd(8), String(r?.version ?? '-').padEnd(8), l?.name ?? r?.app ?? '');
  }
}

async function pull(id) {
  const fs = await firestore();
  const env = await fs.get(`environments/${id}`);
  const page = await fs.get(`environmentPages/${id}`);
  if (!env || !page?.html) throw new Error(`${id} isn't in the library`);
  const dir = join(APPS, id);
  mkdirSync(dir, { recursive: true });
  const old = existsSync(join(dir, 'manifest.json')) ? JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')) : {};
  writeFileSync(join(dir, 'app.html'), page.html);
  writeManifest(dir, {
    id,
    name: env.name || env.app,
    product: env.product ?? '',
    summary: env.summary ?? '',
    version: env.version ?? 1,
    features: env.features ?? [],
    data: old.data ?? 'Not data-driven yet: the data is written into app.html. Move it out to sample-data.json and read it from window.praxaData.',
    state: old.state ?? '',
  });
  if (!existsSync(join(dir, 'sample-data.json'))) writeFileSync(join(dir, 'sample-data.json'), '{}\n');
  console.log(`Pulled ${id} version ${env.version} into library-apps/${id}/`);
}

async function push(id) {
  const { dir, manifest, html } = readLocal(id);
  const fs = await firestore();
  const env = await fs.get(`environments/${id}`);
  const version = Math.max(manifest.version ?? 1, env ? (env.version ?? 0) + 1 : 1);
  const at = new Date().toISOString();
  const fields = {
    app: manifest.name,
    name: manifest.name,
    product: manifest.product,
    summary: manifest.summary,
    features: manifest.features,
    version,
    builtFor: env?.builtFor ?? 'Granyt',
    createdAt: env?.createdAt ?? at,
    updatedAt: at,
    createdBy: env?.createdBy ?? 'praxa-repo',
    uses: env?.uses ?? 0,
    // Reads its data from window.praxaData, so a test only writes data for it
    dataDriven: true,
    data: manifest.data ?? '',
    state: manifest.state ?? '',
  };
  await fs.commit([
    [`environments/${id}`, fields],
    [`environmentPages/${id}`, { html, callouts: [] }],
    // Every version kept, so a test built on one still opens it after the app moves on
    [`environmentVersions/${id}@${version}`, { envId: id, version, html, features: manifest.features, at, by: 'praxa-repo' }],
  ]);
  if (manifest.version !== version) writeManifest(dir, { ...manifest, version });
  console.log(`Pushed ${id} as version ${version}${env ? ` (was ${env.version})` : ' (new to the library)'}`);
}

const [cmd, id] = process.argv.slice(2);
try {
  if (cmd === 'list') await list();
  else if (cmd === 'pull' && id) await pull(id);
  else if (cmd === 'push' && id) await push(id);
  else console.log('npm run apps -- list | pull <id> | push <id>');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
