import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, increment, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { AppCallout, QuestionType } from '../types';
import { auth, db, firebaseEnabled } from './firebase';
import { LANGUAGES } from './languages';

/**
 * Praxa's environment library: the places candidates work in during a test.
 *
 * - Built in: the spreadsheet, database workbench, SQL editor, code editor, inbox and AI assistant.
 * - Saved simulations, one per app (Meta Ads Manager, Salesforce, a till): a working copy of the app that grows. Every
 *   simulation Praxa builds, for a company's test or by the Praxa team, is sent to the Praxa team for review as a
 *   submission. Approved, a new app joins the library; a page built on an app already there becomes that app's next
 *   version, with the features it added. When a later test needs the same app, the page builder starts from its latest
 *   version and adds what that test needs on top, so each app gains features with every test.
 *
 * Firestore: environments (each app's latest approved version, small enough to list), environmentPages (its page),
 * environmentSubmissions (everything waiting for review, and the history of what was approved) and submissionPages.
 * Only the Praxa team approves or changes the library. Without accounts (the demo) it's kept in this browser.
 */

export interface BuiltInEnvironment {
  id: string;
  name: string;
  type: QuestionType;
  summary: string;
}

export const BUILT_IN_ENVIRONMENTS: BuiltInEnvironment[] = [
  { id: 'sheet', name: 'Spreadsheet', type: 'sheet', summary: 'An Excel-style workbook: formulas, several sheets, sort, find and replace, CSV import and export. Marked by checks on the finished workbook.' },
  { id: 'database', name: 'Database workbench', type: 'database', summary: 'A SQL workbench on a real SQLite database: a table browser, queries, inserts and updates. Marked against the solution.' },
  { id: 'sql', name: 'SQL editor', type: 'sql', summary: 'A query editor over sample tables, with results as a table. Marked on the rows returned.' },
  {
    id: 'code',
    name: 'Code editor',
    type: 'code',
    summary: `A code editor with highlighting for ${LANGUAGES.length} languages (${LANGUAGES.slice(0, 8).map((l) => l.label).join(', ')} and more), or open to any language the candidate picks. Marked by running test cases.`,
  },
  { id: 'email', name: 'Email inbox', type: 'email', summary: 'An inbox with a thread to answer: the candidate writes the reply and picks who it goes to and who is copied in.' },
  { id: 'assistant', name: 'AI assistant', type: 'assistant', summary: 'A chat with an AI assistant to get a piece of work done. Marked on the result and on how the AI was used.' },
];

// An app in the library, at its latest approved version
export interface SavedEnvironment {
  id: string;
  // The app it copies ("Meta Ads Manager"), how the AI finds it again
  app: string;
  name: string;
  // The kind of product ("ads manager", "CRM")
  product: string;
  summary: string;
  // Every screen and feature it has, across all its versions
  features: string[];
  version: number;
  // The task its first version was built for
  builtFor: string;
  sector?: string;
  game?: 'gamified' | 'standalone';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  // How many later simulations were built on it
  uses: number;
}

export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

// A simulation waiting for the Praxa team: a new app, or a new version of one in the library
export interface EnvironmentSubmission {
  id: string;
  // The library app it was built on, and that app's version then; unset for a new app
  envId?: string;
  baseVersion?: number;
  app: string;
  name: string;
  product: string;
  summary: string;
  features: string[];
  // What it adds to the version it was built on (everything, for a new app)
  added: string[];
  builtFor: string;
  // Who it was built for: a company's name, or Praxa
  owner: string;
  sector?: string;
  game?: 'gamified' | 'standalone';
  createdAt: string;
  createdBy?: string;
  status: SubmissionStatus;
  reviewedAt?: string;
  note?: string;
  // Once approved: the library app and version it became
  version?: number;
}

export interface EnvironmentPage {
  html: string;
  callouts?: AppCallout[];
}

// --- The demo keeps everything in this browser ---

const LOCAL_KEY = 'vetter-environments-v2';
interface LocalLibrary {
  envs: SavedEnvironment[];
  envPages: Record<string, EnvironmentPage>;
  subs: EnvironmentSubmission[];
  subPages: Record<string, EnvironmentPage>;
}
const local = (): LocalLibrary => {
  try {
    const data = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '');
    return { envs: data.envs ?? [], envPages: data.envPages ?? {}, subs: data.subs ?? [], subPages: data.subPages ?? {} };
  } catch {
    return { envs: [], envPages: {}, subs: [], subPages: {} };
  }
};
const setLocal = (data: LocalLibrary) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    /* full or blocked: the demo library just doesn't keep it */
  }
};

// --- Reading ---

let cache: Promise<SavedEnvironment[]> | null = null;
const listeners = new Set<() => void>();
const changed = () => {
  cache = null;
  listeners.forEach((fn) => fn());
};
const withDefaults = (e: Partial<SavedEnvironment> & { id: string }): SavedEnvironment => ({
  app: e.app || e.name || 'App',
  name: e.name || e.app || 'App',
  product: e.product || '',
  summary: e.summary || '',
  features: e.features ?? [],
  version: e.version ?? 1,
  builtFor: e.builtFor ?? '',
  createdAt: e.createdAt ?? '',
  updatedAt: e.updatedAt ?? e.createdAt ?? '',
  uses: e.uses ?? 0,
  ...e,
});

// Every app in the library (approved), most recently changed first
export function loadEnvironments(): Promise<SavedEnvironment[]> {
  if (!cache) {
    cache = (async () => {
      if (!firebaseEnabled) return local().envs;
      if (!auth().currentUser) return [];
      const snap = await getDocs(collection(db(), 'environments'));
      return snap.docs.map((d) => withDefaults({ ...(d.data() as Partial<SavedEnvironment>), id: d.id }));
    })()
      .then((list) => list.map(withDefaults).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
      .catch((err) => {
        console.warn("Couldn't read the environment library", err);
        cache = null;
        return [];
      });
  }
  return cache;
}

async function readPage(collectionName: 'environmentPages' | 'submissionPages', id: string): Promise<EnvironmentPage | null> {
  try {
    if (!firebaseEnabled) return (collectionName === 'environmentPages' ? local().envPages : local().subPages)[id] ?? null;
    const snap = await getDoc(doc(db(), collectionName, id));
    return snap.exists() ? (snap.data() as EnvironmentPage) : null;
  } catch (err) {
    console.warn("Couldn't read a simulation's page", err);
    return null;
  }
}
export const loadEnvironmentPage = (id: string) => readPage('environmentPages', id);
export const loadSubmissionPage = (id: string) => readPage('submissionPages', id);

// Submissions, newest first: all of them for the Praxa team, otherwise the ones this person sent
export async function loadSubmissions(all: boolean): Promise<EnvironmentSubmission[]> {
  let list: EnvironmentSubmission[];
  if (!firebaseEnabled) list = local().subs;
  else {
    const uid = auth().currentUser?.uid;
    if (!uid) return [];
    const ref = collection(db(), 'environmentSubmissions');
    const snap = await getDocs(all ? ref : query(ref, where('createdBy', '==', uid)));
    list = snap.docs.map((d) => ({ ...(d.data() as Omit<EnvironmentSubmission, 'id'>), id: d.id }));
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// --- Writing ---

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();
const unique = (list: string[]) => {
  const seen = new Set<string>();
  return list.map((f) => f.trim()).filter((f) => f && !seen.has(f.toLowerCase()) && seen.add(f.toLowerCase()));
};

export type NewSubmission = Omit<EnvironmentSubmission, 'id' | 'createdAt' | 'createdBy' | 'status' | 'reviewedAt' | 'note' | 'version'>;

// A newly built simulation, sent to the Praxa team for review. Never holds up the test it was built for: a failure is
// only logged
export async function submitEnvironment(entry: NewSubmission, page: EnvironmentPage): Promise<void> {
  if (!entry.app.trim() || !page.html.trim()) return;
  const id = newId('sub');
  const sub: EnvironmentSubmission = { ...entry, features: unique(entry.features), added: unique(entry.added), id, createdAt: now(), status: 'pending' };
  try {
    if (!firebaseEnabled) {
      const data = local();
      setLocal({ ...data, subs: [sub, ...data.subs].slice(0, 60), subPages: { ...data.subPages, [id]: page } });
    } else {
      const uid = auth().currentUser?.uid;
      if (!uid) return;
      const { id: _id, ...fields } = sub;
      const batch = writeBatch(db());
      batch.set(doc(db(), 'environmentSubmissions', id), { ...fields, createdBy: uid });
      batch.set(doc(db(), 'submissionPages', id), { html: page.html, callouts: page.callouts ?? [] });
      await batch.commit();
    }
    changed();
  } catch (err) {
    console.warn("Couldn't send the simulation for review", err);
  }
}

// The Praxa team approves a submission: a new app joins the library, or the app it was built on moves to its next
// version (its page replaced, its features added to). Returns the library app's id
export async function approveSubmission(sub: EnvironmentSubmission, page: EnvironmentPage): Promise<string> {
  const at = now();
  // Built on an app in the library, or built new for an app that's there already (same name): that app's next version
  const all = await loadEnvironments();
  const existing = sub.envId ? all.find((e) => e.id === sub.envId) : all.find((e) => e.app.trim().toLowerCase() === sub.app.trim().toLowerCase());
  const envId = existing?.id ?? newId('env');
  const version = existing ? existing.version + 1 : 1;
  const env: SavedEnvironment = existing
    ? { ...existing, name: sub.name || existing.name, summary: sub.summary || existing.summary, features: unique([...existing.features, ...sub.features, ...sub.added]), version, updatedAt: at }
    : { id: envId, app: sub.app, name: sub.name, product: sub.product, summary: sub.summary, features: unique([...sub.features, ...sub.added]), version, builtFor: sub.builtFor, ...(sub.sector && { sector: sub.sector }), ...(sub.game && { game: sub.game }), createdAt: at, updatedAt: at, createdBy: sub.createdBy, uses: 0 };
  const review = { status: 'approved' as const, reviewedAt: at, envId, version };
  if (!firebaseEnabled) {
    const data = local();
    setLocal({
      ...data,
      envs: [env, ...data.envs.filter((e) => e.id !== envId)],
      envPages: { ...data.envPages, [envId]: page },
      subs: data.subs.map((s) => (s.id === sub.id ? { ...s, ...review } : s)),
    });
  } else {
    const { id: _id, ...fields } = env;
    const batch = writeBatch(db());
    batch.set(doc(db(), 'environments', envId), fields);
    batch.set(doc(db(), 'environmentPages', envId), { html: page.html, callouts: page.callouts ?? [] });
    batch.update(doc(db(), 'environmentSubmissions', sub.id), review);
    await batch.commit();
  }
  changed();
  return envId;
}

export async function rejectSubmission(sub: EnvironmentSubmission, note: string): Promise<void> {
  const review = { status: 'rejected' as const, reviewedAt: now(), ...(note.trim() && { note: note.trim().slice(0, 500) }) };
  if (!firebaseEnabled) {
    const data = local();
    setLocal({ ...data, subs: data.subs.map((s) => (s.id === sub.id ? { ...s, ...review } : s)) });
  } else await updateDoc(doc(db(), 'environmentSubmissions', sub.id), review);
  changed();
}

// A submission's page replaced (merged onto the app's latest version), and what it's now built on
export async function updateSubmission(sub: EnvironmentSubmission, change: Partial<EnvironmentSubmission>, page: EnvironmentPage): Promise<void> {
  if (!firebaseEnabled) {
    const data = local();
    setLocal({ ...data, subs: data.subs.map((s) => (s.id === sub.id ? { ...s, ...change } : s)), subPages: { ...data.subPages, [sub.id]: page } });
  } else {
    const batch = writeBatch(db());
    batch.update(doc(db(), 'environmentSubmissions', sub.id), change);
    batch.set(doc(db(), 'submissionPages', sub.id), { html: page.html, callouts: page.callouts ?? [] });
    await batch.commit();
  }
  changed();
}

// A library app was built on again
export async function markEnvironmentUsed(id: string): Promise<void> {
  try {
    if (!firebaseEnabled) {
      const data = local();
      setLocal({ ...data, envs: data.envs.map((e) => (e.id === id ? { ...e, uses: e.uses + 1 } : e)) });
    } else {
      await updateDoc(doc(db(), 'environments', id), { uses: increment(1) });
    }
    changed();
  } catch (err) {
    console.warn("Couldn't count a use of a library app", err);
  }
}

// The Praxa team takes an app out of the library (its submissions stay, as history)
export async function deleteEnvironment(id: string): Promise<void> {
  if (!firebaseEnabled) {
    const data = local();
    const { [id]: _gone, ...envPages } = data.envPages;
    setLocal({ ...data, envs: data.envs.filter((e) => e.id !== id), envPages });
  } else {
    const batch = writeBatch(db());
    batch.delete(doc(db(), 'environmentPages', id));
    batch.delete(doc(db(), 'environments', id));
    await batch.commit();
  }
  changed();
}

// Whether a submission was built on an older version than the library now has (another was approved since), so
// approving it as it is would lose that version's features
export const isStale = (sub: EnvironmentSubmission, envs: SavedEnvironment[]) => {
  const env = sub.envId ? envs.find((e) => e.id === sub.envId) : undefined;
  return !!env && sub.status === 'pending' && (sub.baseVersion ?? 0) < env.version;
};

// --- For pages ---

// The library and, when asked, the submissions; refreshed whenever either changes
export function useLibrary(withSubmissions: false | 'mine' | 'all' = false) {
  const [state, setState] = useState<{ environments: SavedEnvironment[]; submissions: EnvironmentSubmission[]; loading: boolean; error?: string }>({
    environments: [],
    submissions: [],
    loading: true,
  });
  useEffect(() => {
    let live = true;
    const load = () =>
      Promise.all([loadEnvironments(), withSubmissions ? loadSubmissions(withSubmissions === 'all') : Promise.resolve([])])
        .then(([environments, submissions]) => live && setState({ environments, submissions, loading: false }))
        .catch((err) => live && setState((s) => ({ ...s, loading: false, error: String(err?.message ?? err) })));
    load();
    listeners.add(load);
    return () => {
      live = false;
      listeners.delete(load);
    };
  }, [withSubmissions]);
  return state;
}

export const useEnvironments = () => {
  const { environments, loading } = useLibrary(false);
  return { environments, loading };
};
