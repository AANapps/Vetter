import { AssessmentTest, Question, TestDraft } from '../types';
import { DeskCustomApp } from './desktop';
import { loadVersion } from './environments';
import { LIBRARY_APPS, splitData, withData } from './libraryApps';

/**
 * Tests store library apps by reference. A test page that is a library app's version unchanged, plus the test's data,
 * is saved as { libraryApp: { id, version }, appData } with no code; the code is loaded back from the library when the
 * test is read: from the repo's bundle (Praxa's own apps, library-apps/) or from Firestore's environmentVersions (which
 * anyone signed in can read for data-driven apps). So a test is its data, apps are kept once, and the tests everyone
 * downloads stay small. A page with its own edits, or built before this, keeps its whole page as before.
 */

type Ref = { id: string; version: number };
const key = (r: Ref) => `${r.id}@${r.version}`;

// Code loaded from Firestore this session, by id@version
const codes = new Map<string, string>();
const loading = new Map<string, Promise<boolean>>();
const listeners = new Set<() => void>();

export function rememberAppCode(id: string, version: number, code: string) {
  codes.set(key({ id, version }), code);
}

// The code for an exact version, when it's known now (the repo's, or loaded this session)
function codeFor(ref: Ref): string | undefined {
  const repo = LIBRARY_APPS[ref.id];
  if (repo?.html && repo.manifest.version === ref.version) return repo.html;
  return codes.get(key(ref));
}

// --- Saving: pages that are a library version unchanged keep only their data

function compactPage(html: string | undefined, ref: Ref | undefined): string | null {
  if (!html || !ref?.id) return null;
  const code = codeFor(ref);
  if (!code) return null;
  const { app, data } = splitData(html);
  return data !== undefined && app === code ? JSON.stringify(data) : null;
}

function compactQuestion(q: Question): Question {
  let out = q;
  const data = compactPage(q.appHtml, q.libraryApp);
  if (data !== null) {
    const { appHtml: _html, ...rest } = q;
    out = { ...rest, appData: data };
  }
  const apps = q.desktop?.customApps;
  if (apps?.length) {
    let changed = false;
    const next = apps.map((a) => {
      const d = compactPage(a.html, a.libraryApp);
      if (d === null) return a;
      changed = true;
      const { html: _html, ...rest } = a;
      return { ...rest, data: d } as DeskCustomApp;
    });
    if (changed) out = { ...out, desktop: { ...out.desktop!, customApps: next } };
  }
  return out;
}

export function compactTest(test: AssessmentTest): AssessmentTest {
  const questions = test.questions.map(compactQuestion);
  return questions.some((q, i) => q !== test.questions[i]) ? { ...test, questions } : test;
}

export const compactDraft = (draft: TestDraft): TestDraft => {
  const test = compactTest(draft.test);
  return test === draft.test ? draft : { ...draft, test };
};

// --- Reading: the code filled back in

function needs(test: AssessmentTest): Ref[] {
  const refs: Ref[] = [];
  for (const q of test.questions) {
    if (q.appData !== undefined && !q.appHtml && q.libraryApp) refs.push(q.libraryApp);
    for (const a of q.desktop?.customApps ?? []) if (!a.html && a.data !== undefined && a.libraryApp) refs.push(a.libraryApp);
  }
  return refs;
}

const parse = (json: string) => {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
};

// The test with every stored reference filled in that can be now; the same object when there's nothing to fill, and
// the same filled object each time for the same stored test while no more code has arrived
const filled = new WeakMap<AssessmentTest, { gen: number; test: AssessmentTest }>();
let gen = 0;
export function hydrateTest(test: AssessmentTest): AssessmentTest {
  if (!needs(test).length) return test;
  const seen = filled.get(test);
  if (seen?.gen === gen) return seen.test;
  const out = fill(test);
  filled.set(test, { gen, test: out });
  return out;
}

function fill(test: AssessmentTest): AssessmentTest {
  const questions = test.questions.map((q) => {
    let out = q;
    if (q.appData !== undefined && !q.appHtml && q.libraryApp) {
      const code = codeFor(q.libraryApp);
      if (code) out = { ...out, appHtml: withData(code, parse(q.appData)) };
    }
    const apps = q.desktop?.customApps;
    if (apps?.some((a) => !a.html && a.data !== undefined && a.libraryApp)) {
      const next = apps.map((a) => {
        if (a.html || a.data === undefined || !a.libraryApp) return a;
        const code = codeFor(a.libraryApp);
        return code ? { ...a, html: withData(code, parse(a.data)) } : a;
      });
      out = { ...out, desktop: { ...out.desktop!, customApps: next } };
    }
    return out;
  });
  return { ...test, questions };
}

// Loads the code the tests refer to that isn't known yet; listeners hear once some arrives. A version that can't be
// found falls back to the repo's current copy of the app
export function loadAppCodes(tests: AssessmentTest[]): void {
  const wanted = tests.flatMap(needs).filter((r) => !codeFor(r) && !loading.has(key(r)));
  for (const ref of wanted) {
    const k = key(ref);
    const job = loadVersion(ref.id, ref.version).then((v) => {
      const repo = LIBRARY_APPS[ref.id];
      if (v?.html) codes.set(k, splitData(v.html).app);
      else if (repo?.html) {
        console.warn(`Library app ${k} isn't in the library; using the repo's version ${repo.manifest.version}`);
        codes.set(k, repo.html);
      } else return false;
      gen++;
      listeners.forEach((fn) => fn());
      return true;
    });
    loading.set(k, job);
  }
}

export function onAppCodes(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
