import React, { useEffect, useMemo, useState } from 'react';
import { AppWindow as AppIcon, Bot, Building2, Layers, RefreshCw, Save, Send, Undo2, X } from 'lucide-react';
import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, firebaseEnabled } from '../lib/firebase';
import { AssessmentTest } from '../types';
import { EnvironmentSubmission, SavedEnvironment, loadEnvironmentPage, loadSubmissionPage, saveEditedVersion, updateSubmission, useLibrary, publishRepoApp } from '../lib/environments';
import { LIBRARY_APPS, parseData, splitData, withData } from '../lib/libraryApps';
import { compactTest, hydrateTest, loadAppCodes } from '../lib/appRefs';
import { fromFirestore, toFirestore } from '../lib/firestoreSafe';
import { editPage } from '../lib/testChat';
import { startAiRun } from '../lib/aiRequest';
import { AppWindow } from './AppWindow';

/**
 * The admin panel's app editor: the Praxa team picks any app (one in the library, one waiting for review, or one inside
 * a company's saved test), tries it, and changes it by chatting with Praxa's AI. Each change is made as small edits to
 * the page (the same as the test builder's chat: what Praxa finds clicking through the page goes with it, and a change
 * that breaks the page is sent back), shown straight away, and can be undone. Nothing is kept until Save: a library
 * app saves as its next version, a submission's page is replaced, and a company's test gets the new page.
 */

type Source = 'library' | 'review' | 'company';

interface Editable {
  key: string;
  source: Source;
  label: string;
  detail: string;
  // Loads the page to edit (with its data in it, when the app reads data), and saves the edited page
  load: () => Promise<string>;
  save: (html: string, note: string) => Promise<string>;
}

interface Turn {
  from: 'you' | 'ai';
  text: string;
}

// Every app page inside a company's saved tests: app tasks, and the custom apps on a job simulation's desktop
function appsInTest(test: AssessmentTest): { where: string; html: string; put: (t: AssessmentTest, html: string) => AssessmentTest }[] {
  return test.questions.flatMap((q, qi) => {
    const out: { where: string; html: string; put: (t: AssessmentTest, html: string) => AssessmentTest }[] = [];
    if (q.appHtml?.trim())
      out.push({
        where: q.title,
        html: q.appHtml,
        put: (t, html) => ({ ...t, questions: t.questions.map((x, i) => (i === qi ? { ...x, appHtml: html } : x)) }),
      });
    q.desktop?.customApps?.forEach((app, ai) => {
      if (app.html?.trim())
        out.push({
          where: `${q.title} · ${app.label}`,
          html: app.html,
          put: (t, html) => ({
            ...t,
            questions: t.questions.map((x, i) =>
              i === qi && x.desktop ? { ...x, desktop: { ...x.desktop, customApps: (x.desktop.customApps ?? []).map((c, j) => (j === ai ? { ...c, html } : c)) } } : x
            ),
          }),
        });
    });
    return out;
  });
}

async function loadCompanyTests(): Promise<AssessmentTest[]> {
  if (!firebaseEnabled) return [];
  const snap = await getDocs(query(collection(db(), 'tests'), where('type', '==', 'custom')));
  const tests = snap.docs.map((d) => fromFirestore({ ...(d.data() as AssessmentTest), id: d.id }));
  loadAppCodes(tests);
  return tests;
}

export const AdminAppEditor: React.FC = () => {
  const { environments: saved, submissions } = useLibrary('all');
  const [companyTests, setCompanyTests] = useState<AssessmentTest[] | null>(null);
  const [source, setSource] = useState<Source>('library');
  const [picked, setPicked] = useState<Editable | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (source === 'company' && companyTests === null)
      loadCompanyTests()
        .then(setCompanyTests)
        .catch((e) => (setCompanyTests([]), setProblem(`Couldn't load companies' tests: ${e instanceof Error ? e.message : String(e)}`)));
  }, [source, companyTests]);

  // The library: Firestore's apps, and Praxa's own (library-apps/) not pushed yet
  const library: Editable[] = useMemo(() => {
    const repoOnly = Object.values(LIBRARY_APPS).filter(({ manifest: m }) => !saved.some((e) => e.id === m.id && e.version >= m.version));
    const fromRepo: Editable[] = repoOnly.map(({ manifest: m, html, sample }) => ({
      key: `repo:${m.id}`,
      source: 'library',
      label: m.name,
      detail: `Version ${m.version} · Praxa's own app (saving adds it to the library as the next version)`,
      load: async () => withData(html, sample),
      save: async (page) => `Saved as version ${await publishRepoApp({ ...m, version: m.version + 1 }, splitData(page).app)}.`,
    }));
    const fromFirestoreLib: Editable[] = saved
      .filter((e) => !repoOnly.some((r) => r.manifest.id === e.id))
      .map((env: SavedEnvironment) => ({
        key: `env:${env.id}`,
        source: 'library',
        label: env.app,
        detail: `Version ${env.version} · ${env.features.length} features · built for ${env.builtFor}`,
        load: async () => {
          const page = await loadEnvironmentPage(env.id);
          if (!page?.html) throw new Error('Its page is empty.');
          const sample = LIBRARY_APPS[env.id]?.sample;
          return sample ? withData(page.html, sample) : page.html;
        },
        // The library keeps the app alone; data used to try it stays out
        save: async (page, note) => `Saved as version ${await saveEditedVersion(env, env.dataDriven || LIBRARY_APPS[env.id] ? splitData(page).app : page, note)}.`,
      }));
    return [...fromRepo, ...fromFirestoreLib];
  }, [saved]);

  const review: Editable[] = useMemo(
    () =>
      submissions
        .filter((s) => s.status === 'pending')
        .map((sub: EnvironmentSubmission) => ({
          key: `sub:${sub.id}`,
          source: 'review',
          label: sub.app,
          detail: `Waiting for review · built for “${sub.builtFor}” by ${sub.owner}`,
          load: async () => {
            const page = await loadSubmissionPage(sub.id);
            if (!page?.html) throw new Error('Its page is empty.');
            const data = parseData(page.data);
            return data ? withData(page.html, data) : page.html;
          },
          save: async (html) => {
            const { app, data } = splitData(html);
            const old = await loadSubmissionPage(sub.id);
            await updateSubmission(sub, {}, { html: data === undefined ? html : app, callouts: old?.callouts ?? [], ...(data !== undefined ? { data: JSON.stringify(data) } : old?.data ? { data: old.data } : {}) });
            return 'Saved. It’s still waiting for review.';
          },
        })),
    [submissions]
  );

  const company: Editable[] = useMemo(
    () =>
      (companyTests ?? []).flatMap((raw) => {
        const test = hydrateTest(raw);
        return appsInTest(test).map((a, i) => ({
          key: `test:${test.id}:${i}`,
          source: 'company' as const,
          label: a.where,
          detail: `${test.companyName ?? 'A company'} · ${test.title}`,
          load: async () => a.html,
          save: async (html: string) => {
            const latest = companyTests?.find((t) => t.id === test.id) ?? test;
            const next = appsInTest(hydrateTest(latest))[i].put(hydrateTest(latest), html);
            await setDoc(doc(db(), 'tests', test.id), toFirestore(compactTest(next)));
            setCompanyTests((prev) => (prev ?? []).map((t) => (t.id === test.id ? next : t)));
            return `Saved to ${test.companyName ?? 'the company'}'s test. Candidates get the new page from now on.`;
          },
        }));
      }),
    [companyTests]
  );

  const lists: Record<Source, Editable[]> = { library, review, company };
  const tabs: { id: Source; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'library', label: `Library (${library.length})`, Icon: Layers },
    { id: 'review', label: `Waiting for review (${review.length})`, Icon: RefreshCw },
    { id: 'company', label: `Companies' tests${companyTests ? ` (${company.length})` : ''}`, Icon: Building2 },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="font-bold flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-600" />
          App editor
        </h2>
        <p className="text-sm text-slate-600">Open any app, in the library, waiting for review or inside a company's saved test, and change it by telling Praxa's AI what you want.</p>
      </div>
      <div role="tablist" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
        {tabs.map(({ id, label, Icon }) => (
          <button key={id} role="tab" aria-selected={source === id} onClick={() => setSource(id)} className={`px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 ${source === id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
      {problem && <p className="text-sm text-rose-700">{problem}</p>}
      {source === 'company' && companyTests === null ? (
        <p className="text-sm text-slate-500">Loading companies' tests…</p>
      ) : lists[source].length === 0 ? (
        <p className="text-sm text-slate-500">{source === 'company' ? 'No company test has an app of its own yet.' : source === 'review' ? 'Nothing waiting for review.' : 'The library is empty.'}</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-80 overflow-y-auto">
          {lists[source].map((e) => (
            <li key={e.key} className="px-4 py-2.5 flex items-center gap-3">
              <AppIcon className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900 truncate">{e.label}</span>
                <span className="block text-[11px] text-slate-500 truncate">{e.detail}</span>
              </span>
              <button onClick={() => setPicked(e)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 inline-flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5" />
                Edit with AI
              </button>
            </li>
          ))}
        </ul>
      )}
      {picked && <EditorDialog item={picked} onClose={() => setPicked(null)} />}
    </section>
  );
};

// The editor: the app on the left, working; the chat on the right. Each message is a change made to the page
const EditorDialog: React.FC<{ item: Editable; onClose: () => void }> = ({ item, onClose }) => {
  const [history, setHistory] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  // Bumped with each change, so the app reloads on the new page
  const [loads, setLoads] = useState(0);
  const [state, setState] = useState('');
  const html = history.at(-1) ?? '';
  const changes = history.length - 1;

  useEffect(() => {
    item
      .load()
      .then((h) => setHistory([h]))
      .catch((e) => setLoadError(e instanceof Error ? e.message : String(e)));
  }, [item]);

  const send = async () => {
    const change = draft.trim();
    if (!change || busy || !html) return;
    setDraft('');
    setSaved(null);
    setTurns((t) => [...t, { from: 'you', text: change }]);
    setBusy('Reading the app…');
    startAiRun();
    try {
      const out = await editPage(html, change, { title: item.label }, (stage) => setBusy(stage.charAt(0).toUpperCase() + stage.slice(1)));
      if (!out) setTurns((t) => [...t, { from: 'ai', text: "That change didn't come back working, so the app is as it was. Try saying it another way." }]);
      else {
        if (!out.unchanged) {
          setHistory((h) => [...h, out.html]);
          setState('');
          setLoads((n) => n + 1);
        }
        setTurns((t) => [...t, { from: 'ai', text: out.done }]);
      }
    } catch (e) {
      setTurns((t) => [...t, { from: 'ai', text: `Something went wrong: ${e instanceof Error ? e.message : String(e)}` }]);
    } finally {
      setBusy(null);
    }
  };

  const undo = () => {
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
    setState('');
    setLoads((n) => n + 1);
    setTurns((t) => [...t, { from: 'ai', text: 'Undone: back to the page before the last change.' }]);
  };

  const save = async () => {
    setBusy('Saving…');
    try {
      const note = turns.filter((t) => t.from === 'you').map((t) => t.text).join('; ');
      setSaved(await item.save(html, note));
    } catch (e) {
      setSaved(`Couldn't save: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const close = () => {
    if (changes > 0 && !saved && !window.confirm('Close without saving? Your changes will be lost.')) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 flex flex-col p-3 gap-2">
      <div className="flex items-center gap-3 text-white">
        <AppIcon className="w-4 h-4" />
        <span className="text-sm font-semibold truncate">{item.label}</span>
        <span className="text-xs text-white/60 truncate hidden sm:inline">{item.detail}</span>
        <span className="ml-auto flex items-center gap-2">
          <button onClick={undo} disabled={changes < 1 || !!busy} className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40">
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </button>
          <button onClick={save} disabled={changes < 1 || !!busy} className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40">
            <Save className="w-3.5 h-3.5" />
            Save{changes > 0 ? ` (${changes} ${changes === 1 ? 'change' : 'changes'})` : ''}
          </button>
          <button onClick={close} className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-xs font-semibold inline-flex items-center gap-1">
            <X className="w-4 h-4" />
            Close
          </button>
        </span>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-2">
        <div className="min-h-0 bg-white rounded-lg overflow-hidden">
          {loadError ? (
            <p className="p-6 text-sm text-rose-700">Couldn't open it: {loadError}</p>
          ) : html ? (
            <AppWindow key={loads} value={state} onChange={setState} html={html} appName={item.label} />
          ) : (
            <p className="p-6 text-sm text-slate-500">Loading…</p>
          )}
        </div>
        <aside className="min-h-0 bg-white rounded-lg flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="text-sm font-semibold text-slate-900">Change it with AI</div>
            <p className="text-[11px] text-slate-500">Say what to change or what's wrong, e.g. “make the sidebar darker” or “the Send button does nothing”. Each change is checked by clicking through the app.</p>
          </div>
          <ol className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {turns.length === 0 && <li className="text-xs text-slate-400">No changes yet.</li>}
            {turns.map((t, i) => (
              <li key={i} className={`max-w-[90%] px-3 py-2 rounded-xl text-sm whitespace-pre-line ${t.from === 'you' ? 'ml-auto bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {t.text}
              </li>
            ))}
            {busy && (
              <li className="flex items-center gap-2 text-xs text-indigo-700">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {busy}
              </li>
            )}
            {saved && <li className="text-xs font-semibold text-emerald-700">{saved}</li>}
          </ol>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-3 border-t border-slate-200 flex gap-2"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              disabled={!html || !!busy}
              placeholder="What should change?"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg resize-none focus:outline-none focus:border-indigo-500"
            />
            <button type="submit" disabled={!draft.trim() || !html || !!busy} aria-label="Send" className="self-end w-9 h-9 grid place-items-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
};
