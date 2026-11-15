import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, increment, updateDoc, writeBatch } from 'firebase/firestore';
import { AppCallout, QuestionType } from '../types';
import { auth, db, firebaseEnabled } from './firebase';
import { LANGUAGES } from './languages';

/**
 * Vetter's environment library: the places candidates work in during a test.
 *
 * - Built in: the spreadsheet, database workbench, SQL editor, code editor, inbox and AI assistant. They're part of
 *   Vetter, and every test that uses them gets its own data.
 * - Saved simulations: every app simulation Vetter builds (a CRM, a help desk, a till) is saved here once it has passed
 *   its checks. When a later test needs the same kind of product, the page builder starts from the saved one, keeping
 *   its shell, look and code and replacing its data and task-specific parts, instead of designing one from nothing.
 *
 * Saved environments live in Firestore (environments: what each is, small enough to list; environmentPages: the page
 * itself), readable by company accounts and the Vetter team. Without accounts (the demo) they're kept in this browser.
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

export interface SavedEnvironment {
  id: string;
  name: string;
  // The kind of product it copies, in generic words ("CRM", "help desk")
  product: string;
  summary: string;
  // The title of the task it was first built for
  builtFor: string;
  sector?: string;
  // Built as a game-like simulation (a gamified test, or a standalone one)
  game?: 'gamified' | 'standalone';
  createdAt: string;
  createdBy?: string;
  companyId?: string;
  // How many later simulations were built on it
  uses: number;
}

export interface EnvironmentPage {
  html: string;
  callouts?: AppCallout[];
}

const LOCAL_KEY = 'vetter-environments';
const local = (): { list: SavedEnvironment[]; pages: Record<string, EnvironmentPage> } => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '') ?? { list: [], pages: {} };
  } catch {
    return { list: [], pages: {} };
  }
};
const setLocal = (data: ReturnType<typeof local>) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
  } catch {
    /* full or blocked: the library just doesn't keep it */
  }
};

let cache: Promise<SavedEnvironment[]> | null = null;
const listeners = new Set<() => void>();
const changed = () => {
  cache = null;
  listeners.forEach((fn) => fn());
};

// Every saved environment, newest first
export function loadEnvironments(): Promise<SavedEnvironment[]> {
  if (!cache) {
    cache = (async () => {
      if (!firebaseEnabled) return local().list;
      if (!auth().currentUser) return [];
      const snap = await getDocs(collection(db(), 'environments'));
      return snap.docs.map((d) => ({ ...(d.data() as Omit<SavedEnvironment, 'id'>), id: d.id }));
    })()
      .then((list) => list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      .catch((err) => {
        console.warn("Couldn't read the environment library", err);
        cache = null;
        return [];
      });
  }
  return cache;
}

export async function loadEnvironmentPage(id: string): Promise<EnvironmentPage | null> {
  try {
    if (!firebaseEnabled) return local().pages[id] ?? null;
    const snap = await getDoc(doc(db(), 'environmentPages', id));
    return snap.exists() ? (snap.data() as EnvironmentPage) : null;
  } catch (err) {
    console.warn("Couldn't read a saved environment", err);
    return null;
  }
}

const newId = () => `env-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// A newly built simulation, saved for later tests to build on. Saving never holds up the test: a failure is only logged
export async function saveEnvironment(entry: Omit<SavedEnvironment, 'id' | 'createdAt' | 'uses' | 'createdBy'>, page: EnvironmentPage): Promise<void> {
  if (!entry.name.trim() || !page.html.trim()) return;
  const id = newId();
  const meta: SavedEnvironment = { ...entry, id, createdAt: new Date().toISOString(), uses: 0 };
  try {
    if (!firebaseEnabled) {
      const data = local();
      setLocal({ list: [meta, ...data.list].slice(0, 40), pages: { ...data.pages, [id]: page } });
    } else {
      const uid = auth().currentUser?.uid;
      if (!uid) return;
      const batch = writeBatch(db());
      const { id: _id, ...fields } = meta;
      batch.set(doc(db(), 'environments', id), { ...fields, createdBy: uid });
      batch.set(doc(db(), 'environmentPages', id), { html: page.html, callouts: page.callouts ?? [] });
      await batch.commit();
    }
    changed();
  } catch (err) {
    console.warn("Couldn't save the simulation to the environment library", err);
  }
}

// A saved environment was built on again
export async function markEnvironmentUsed(id: string): Promise<void> {
  try {
    if (!firebaseEnabled) {
      const data = local();
      setLocal({ ...data, list: data.list.map((e) => (e.id === id ? { ...e, uses: e.uses + 1 } : e)) });
    } else {
      await updateDoc(doc(db(), 'environments', id), { uses: increment(1) });
    }
    changed();
  } catch (err) {
    console.warn("Couldn't count a use of a saved environment", err);
  }
}

export async function deleteEnvironment(id: string): Promise<void> {
  if (!firebaseEnabled) {
    const data = local();
    const { [id]: _gone, ...pages } = data.pages;
    setLocal({ list: data.list.filter((e) => e.id !== id), pages });
  } else {
    await deleteDoc(doc(db(), 'environmentPages', id));
    await deleteDoc(doc(db(), 'environments', id));
  }
  changed();
}

// The saved environments, for the library page; refreshed when one is saved, used or deleted
export function useEnvironments(): { environments: SavedEnvironment[]; loading: boolean } {
  const [state, setState] = useState<{ environments: SavedEnvironment[]; loading: boolean }>({ environments: [], loading: true });
  useEffect(() => {
    let live = true;
    const load = () => loadEnvironments().then((environments) => live && setState({ environments, loading: false }));
    load();
    listeners.add(load);
    return () => {
      live = false;
      listeners.delete(load);
    };
  }, []);
  return state;
}
