import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CornerUpLeft,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Forward,
  Globe,
  Inbox,
  Lock,
  Mail,
  Minus,
  Paperclip,
  PenSquare,
  ReplyAll,
  RotateCw,
  Send,
  X,
  Code2,
  Play,
} from 'lucide-react';
import { CaseFile, Question } from '../types';
import { DeskApp, DeskBlock, DeskEmail, DesktopConfig, DesktopState, SentEmail, filesOf, inboxOf, parseDesktop, repliesFor } from '../lib/desktop';
import { parseAddress } from '../lib/emailTasks';
import { parseCsv } from '../lib/csv';
import { SpreadsheetWindow } from './SpreadsheetWindow';
import { DatabaseWindow } from './DatabaseWindow';
import { AiPanel } from './Workspace';
import { AppWindow } from './AppWindow';
import { CodeField } from './CodeField';
import { DeskProject, TestRun, runDeskTests } from '../lib/deskCode';
import { LayoutGrid } from 'lucide-react';

/**
 * The desktop a job simulation is worked on: a wallpaper with the computer's apps, each opening in its own window, and
 * a taskbar along the bottom to move between them (Mail with its unread count, Browser, Files, Spreadsheet, Database,
 * AI). Built from the question's desktop config, so every job simulation reuses it with its own emails, pages and files.
 * Everything the candidate does is kept as the answer (see src/lib/desktop.ts).
 */

const APPS: Record<DeskApp, { label: string; Icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  mail: { label: 'Mail', Icon: Mail, tint: 'bg-sky-600' },
  browser: { label: 'Browser', Icon: Globe, tint: 'bg-emerald-600' },
  files: { label: 'Files', Icon: FolderOpen, tint: 'bg-amber-500' },
  sheet: { label: 'Spreadsheet', Icon: FileSpreadsheet, tint: 'bg-green-700' },
  sql: { label: 'Database', Icon: Database, tint: 'bg-indigo-600' },
  ai: { label: 'AI assistant', Icon: Bot, tint: 'bg-violet-600' },
  code: { label: 'Code', Icon: Code2, tint: 'bg-slate-900' },
};

const REPLY_DELAY_MS = 2500;

// A custom app's look on the desktop and taskbar
const appInfo = (cfg: DesktopConfig, app: string) =>
  (APPS as Record<string, (typeof APPS)[DeskApp]>)[app] ?? { label: cfg.customApps?.find((c) => c.id === app)?.label ?? app, Icon: LayoutGrid, tint: 'bg-teal-600' };

export const Desktop: React.FC<{ question: Question; answer: string; onChange: (answer: string) => void; company?: string; startApp?: string }> = ({ question: q, answer, onChange, company, startApp }) => {
  const cfg = q.desktop!;
  const state = useMemo(() => parseDesktop(answer, cfg), [answer, cfg]);
  // The latest state, for replies that arrive after the candidate has done more
  const latest = useRef(state);
  latest.current = state;
  const save = (change: Partial<DesktopState>) => onChange(JSON.stringify({ ...latest.current, ...change }));
  // The day starts in the inbox when there is one
  const first = startApp ?? (cfg.apps.includes('mail') ? 'mail' : null);
  const [open, setOpen] = useState<string[]>(first ? [first] : []);
  const [active, setActive] = useState<string | null>(first);
  const [toast, setToast] = useState<string | null>(null);
  const [focusFile, setFocusFile] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const inbox = inboxOf(cfg, state);
  const files = filesOf(cfg, state);
  const unread = inbox.filter((m) => !state.read.includes(m.id)).length;

  const launch = (app: string) => {
    setOpen((prev) => (prev.includes(app) ? prev : [...prev, app]));
    setActive(app);
  };
  const close = (app: string) => {
    setOpen((prev) => prev.filter((a) => a !== app));
    if (active === app) setActive(null);
  };

  // Sending: the email is kept, and whoever it earns a reply from writes back a moment later
  const sendEmail = (m: Omit<SentEmail, 'at'>) => {
    const sent: SentEmail = { ...m, at: latest.current.sent.length + 1 };
    const coming = repliesFor(cfg, latest.current, sent);
    save({ sent: [...latest.current.sent, sent] });
    setToast(`Email sent to ${[...m.to, ...m.cc].join(', ')}`);
    if (coming.length)
      setTimeout(() => {
        save({ received: [...latest.current.received, ...coming.filter((c) => !latest.current.received.includes(c))] });
        const first = coming[0].split('#')[0];
        const rule = cfg.replies?.find((r) => r.id === first);
        setToast(`New email from ${parseAddress((coming[0].includes('#') ? rule?.otherwise?.from : rule?.reply.from) ?? '').name || 'a colleague'}`);
      }, REPLY_DELAY_MS);
  };

  const appWindow = (app: string) => {
    const custom = cfg.customApps?.find((c) => c.id === app);
    if (custom)
      return (
        <AppWindow
          value={state.appStates?.[app] ?? ''}
          onChange={(json) => save({ appStates: { ...(latest.current.appStates ?? {}), [app]: json } })}
          html={custom.html}
          appName={custom.label}
        />
      );
    switch (app) {
      case 'mail':
        return <MailApp cfg={cfg} state={state} inbox={inbox} files={files} onRead={(id) => !state.read.includes(id) && save({ read: [...state.read, id] })} onSend={sendEmail} onOpenFile={(name) => (setFocusFile(name), launch('files'))} />;
      case 'browser':
        return (
          <BrowserApp
            cfg={cfg}
            onVisit={(url) => !latest.current.visited.includes(url) && save({ visited: [...latest.current.visited, url] })}
            onDownload={(f) => {
              if (!latest.current.downloads.some((d) => d.name === f.name)) save({ downloads: [...latest.current.downloads, f] });
              setToast(`${f.name} downloaded to Files`);
            }}
          />
        );
      case 'files':
        return <FilesApp files={files} focus={focusFile} />;
      case 'sheet':
        return <SpreadsheetWindow value={state.workbook} onChange={(wb) => save({ workbook: wb })} fileName={cfg.workbookName ?? 'Book1.xlsx'} files={files.filter((f) => /\.(csv|txt)$/i.test(f.name))} />;
      case 'sql':
        return <DatabaseWindow value={state.database} onChange={(db) => save({ database: db })} tables={cfg.tables ?? []} databaseName={cfg.databaseName ?? 'Database'} files={files.filter((f) => /\.csv$/i.test(f.name))} />;
      case 'code':
        return cfg.project ? <CodeApp project={cfg.project} files={state.code ?? {}} onFiles={(code) => save({ code: { ...(latest.current.code ?? {}), ...code } })} /> : null;
      case 'ai':
        return <AiPanel task={`${cfg.user.role} at ${cfg.company}. ${q.prompt}`.slice(0, 4000)} company={company ?? cfg.company} chat={state.ai} onChat={(ai) => save({ ai })} />;
    }
  };

  return (
    <div className="h-full flex flex-col rounded-lg overflow-hidden border border-slate-300 shadow-sm select-none" data-ref="desktop">
      {/* The screen: the wallpaper and its icons, with the open app's window over it */}
      <div className="relative flex-1 min-h-0 bg-gradient-to-br from-slate-700 via-slate-800 to-indigo-950">
        <div className="absolute inset-0 p-5 grid grid-flow-col auto-cols-max grid-rows-[repeat(auto-fill,92px)] gap-2 content-start">
          {cfg.apps.map((app) => {
            const { label, Icon, tint } = appInfo(cfg, app);
            return (
              <button key={app} onDoubleClick={() => launch(app)} onClick={() => launch(app)} className="w-[84px] h-[88px] flex flex-col items-center justify-center gap-1.5 rounded-lg text-white hover:bg-white/10 focus-visible:bg-white/15" data-ref={`icon-${app}`}>
                <span className={`relative w-11 h-11 rounded-xl ${tint} grid place-items-center shadow-md`}>
                  <Icon className="w-6 h-6" />
                  {app === 'mail' && unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold grid place-items-center">{unread}</span>}
                </span>
                <span className="text-[11.5px] font-medium drop-shadow">{label}</span>
              </button>
            );
          })}
        </div>
        {active === null && open.length === 0 && (
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60">Open an app from the desktop or the taskbar to start. Your inbox is a good place to begin.</p>
        )}
        {open.map((app) => (
          <section
            key={app}
            aria-label={appInfo(cfg, app).label}
            className={`absolute inset-2 sm:inset-3 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden select-text ${active === app ? '' : 'hidden'}`}
          >
            <header className="h-9 shrink-0 flex items-center gap-2 px-3 bg-slate-100 border-b border-slate-200">
              {React.createElement(appInfo(cfg, app).Icon, { className: 'w-4 h-4 text-slate-600' })}
              <span className="text-xs font-semibold text-slate-700">{appInfo(cfg, app).label}</span>
              <span className="ml-auto flex items-center gap-1">
                <button onClick={() => setActive(null)} aria-label={`Minimise ${appInfo(cfg, app).label}`} title="Minimise" className="w-7 h-7 grid place-items-center rounded hover:bg-slate-200 text-slate-600">
                  <Minus className="w-4 h-4" />
                </button>
                <button onClick={() => close(app)} aria-label={`Close ${appInfo(cfg, app).label}`} title="Close" className="w-7 h-7 grid place-items-center rounded hover:bg-rose-500 hover:text-white text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </span>
            </header>
            <div className="flex-1 min-h-0 overflow-hidden">{appWindow(app)}</div>
          </section>
        ))}
        {toast && (
          <div role="status" className="absolute right-4 bottom-4 z-20 max-w-xs bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-lg shadow-xl">
            {toast}
          </div>
        )}
      </div>
      {/* The taskbar */}
      <nav aria-label="Taskbar" className="h-12 shrink-0 bg-slate-900/95 border-t border-white/10 flex items-center gap-1 px-2" data-ref="taskbar">
        <span className="w-9 h-9 grid place-items-center rounded-md text-indigo-300 font-black text-sm" aria-hidden="true">
          {cfg.company[0]}
        </span>
        {cfg.apps.map((app) => {
          const { label, Icon } = appInfo(cfg, app);
          const isOpen = open.includes(app);
          return (
            <button
              key={app}
              onClick={() => (active === app ? setActive(null) : launch(app))}
              aria-pressed={active === app}
              title={label}
              data-ref={`taskbar-${app}`}
              className={`relative h-9 px-3 rounded-md flex items-center gap-2 text-xs font-medium transition-colors ${active === app ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline">{label}</span>
              {app === 'mail' && unread > 0 && <span className="min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center">{unread}</span>}
              {isOpen && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded bg-indigo-400" />}
            </button>
          );
        })}
        <span className="ml-auto text-right text-[11px] leading-tight text-slate-300 pr-2">
          <span className="block font-semibold text-white">{cfg.time}</span>
          {cfg.user.name}
        </span>
      </nav>
    </div>
  );
};

// ---------- Mail ----------

const MailApp: React.FC<{
  cfg: DesktopConfig;
  state: DesktopState;
  inbox: (DeskEmail & { reply?: boolean })[];
  files: CaseFile[];
  onRead: (id: string) => void;
  onSend: (m: Omit<SentEmail, 'at'>) => void;
  onOpenFile: (name: string) => void;
}> = ({ cfg, state, inbox, files, onRead, onSend, onOpenFile }) => {
  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ to: string; cc: string; subject: string; body: string; attachments: string[] } | null>(null);
  const newest = [...inbox].reverse();
  const current = inbox.find((m) => m.id === openId);
  const sentList = [...state.sent].reverse();
  const nameOf = (addr: string) => parseAddress(addr).name || parseAddress(addr).email;

  const startReply = (m: DeskEmail, all: boolean) => {
    const from = parseAddress(m.from).email;
    const others = all ? [...m.to, ...(m.cc ?? [])].map((a) => parseAddress(a).email).filter((e) => e && e.toLowerCase() !== cfg.user.email.toLowerCase() && e !== from) : [];
    setDraft({ to: from, cc: others.join(', '), subject: /^re:/i.test(m.subject) ? m.subject : `Re: ${m.subject}`, body: `\n\n---\nOn ${m.date}, ${nameOf(m.from)} wrote:\n${m.body}`, attachments: [] });
  };
  const forward = (m: DeskEmail) => setDraft({ to: '', cc: '', subject: `Fw: ${m.subject}`, body: `\n\n---\nForwarded from ${nameOf(m.from)}:\n${m.body}`, attachments: (m.attachments ?? []).map((a) => a.name) });

  return (
    <div className="h-full flex text-sm" data-ref="mail">
      <aside className="w-44 shrink-0 border-r border-slate-200 bg-slate-50 p-2 space-y-1">
        <button onClick={() => setDraft({ to: '', cc: '', subject: '', body: '', attachments: [] })} className="w-full mb-2 h-9 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5" data-ref="mail-new">
          <PenSquare className="w-4 h-4" />
          New email
        </button>
        {(['inbox', 'sent'] as const).map((f) => (
          <button key={f} onClick={() => (setFolder(f), setOpenId(null))} className={`w-full h-8 px-2.5 rounded-md flex items-center gap-2 text-xs ${folder === f ? 'bg-sky-100 text-sky-800 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}>
            {f === 'inbox' ? <Inbox className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {f === 'inbox' ? 'Inbox' : 'Sent'}
            <span className="ml-auto tabular-nums text-slate-400">{f === 'inbox' ? inbox.filter((m) => !state.read.includes(m.id)).length || '' : state.sent.length || ''}</span>
          </button>
        ))}
      </aside>
      <div className="w-72 shrink-0 border-r border-slate-200 overflow-y-auto">
        {folder === 'inbox'
          ? newest.map((m) => {
              const unread = !state.read.includes(m.id);
              return (
                <button key={m.id} onClick={() => (setOpenId(m.id), onRead(m.id), setDraft(null))} className={`w-full text-left px-3 py-2.5 border-b border-slate-100 ${openId === m.id ? 'bg-sky-50' : 'hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-1.5">
                    {unread && <span className="w-2 h-2 rounded-full bg-sky-600 shrink-0" />}
                    <span className={`truncate ${unread ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{nameOf(m.from)}</span>
                    {m.attachments?.length ? <Paperclip className="w-3.5 h-3.5 ml-auto text-slate-400 shrink-0" /> : null}
                    <span className="text-[11px] text-slate-400 shrink-0 ml-1">{m.date}</span>
                  </div>
                  <div className={`truncate text-xs ${unread ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{m.subject}</div>
                  <div className="truncate text-xs text-slate-400">{m.body.replace(/\s+/g, ' ')}</div>
                </button>
              );
            })
          : sentList.length === 0
            ? <p className="p-4 text-xs text-slate-500">Nothing sent yet.</p>
            : sentList.map((m, i) => (
                <div key={i} className="px-3 py-2.5 border-b border-slate-100">
                  <div className="truncate text-slate-700">To: {m.to.join(', ')}</div>
                  <div className="truncate text-xs text-slate-800 font-medium">{m.subject || '(no subject)'}</div>
                  <div className="truncate text-xs text-slate-400">{m.attachments.length ? `📎 ${m.attachments.join(', ')} · ` : ''}{m.body.split('\n')[0]}</div>
                </div>
              ))}
      </div>
      <div className="flex-1 min-w-0 overflow-y-auto">
        {draft ? (
          <Composer cfg={cfg} files={files} draft={draft} onDraft={setDraft} onCancel={() => setDraft(null)} onSend={(m) => (onSend(m), setDraft(null))} />
        ) : current ? (
          <article className="p-5 space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">{current.subject}</h2>
            <div className="text-xs text-slate-500 space-y-0.5">
              <div>
                <span className="font-semibold text-slate-800">{nameOf(current.from)}</span> &lt;{parseAddress(current.from).email}&gt; · {current.date}
              </div>
              <div>To: {current.to.join(', ')}{current.cc?.length ? ` · Cc: ${current.cc.join(', ')}` : ''}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => startReply(current, false)} className="h-8 px-3 rounded-md border border-slate-200 hover:bg-slate-50 text-xs flex items-center gap-1.5" data-ref="mail-reply"><CornerUpLeft className="w-3.5 h-3.5" />Reply</button>
              <button onClick={() => startReply(current, true)} className="h-8 px-3 rounded-md border border-slate-200 hover:bg-slate-50 text-xs flex items-center gap-1.5"><ReplyAll className="w-3.5 h-3.5" />Reply all</button>
              <button onClick={() => forward(current)} className="h-8 px-3 rounded-md border border-slate-200 hover:bg-slate-50 text-xs flex items-center gap-1.5"><Forward className="w-3.5 h-3.5" />Forward</button>
            </div>
            <div className="whitespace-pre-wrap leading-relaxed text-slate-800 border-t border-slate-100 pt-3">{current.body}</div>
            {current.attachments?.length ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {current.attachments.map((a) => (
                  <button key={a.name} onClick={() => onOpenFile(a.name)} className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs flex items-center gap-2" title="Saved to Files. Open it there, or import it in the spreadsheet">
                    <FileText className="w-4 h-4 text-slate-500" />
                    {a.name}
                    <span className="text-slate-400">· in Files</span>
                  </button>
                ))}
              </div>
            ) : null}
          </article>
        ) : (
          <div className="h-full grid place-items-center text-xs text-slate-400">Select an email to read it.</div>
        )}
      </div>
    </div>
  );
};

const Composer: React.FC<{
  cfg: DesktopConfig;
  files: CaseFile[];
  draft: { to: string; cc: string; subject: string; body: string; attachments: string[] };
  onDraft: (d: { to: string; cc: string; subject: string; body: string; attachments: string[] }) => void;
  onCancel: () => void;
  onSend: (m: Omit<SentEmail, 'at'>) => void;
}> = ({ cfg, files, draft, onDraft, onCancel, onSend }) => {
  const [error, setError] = useState('');
  const workbook = cfg.apps.includes('sheet') ? cfg.workbookName ?? 'Book1.xlsx' : null;
  const attachable = [...(workbook ? [workbook] : []), ...files.map((f) => f.name)];
  const list = (s: string) =>
    s
      .split(/[,;]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => parseAddress(x).email || x);
  const send = () => {
    const to = list(draft.to);
    if (!to.length) return setError('Add who it’s to.');
    const bad = [...to, ...list(draft.cc)].filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (bad.length) return setError(`Check the address: ${bad.join(', ')}`);
    if (!draft.body.trim()) return setError('Write something before sending.');
    onSend({ to, cc: list(draft.cc), subject: draft.subject.trim(), body: draft.body, attachments: draft.attachments });
  };
  const field = 'w-full h-9 px-3 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20';
  return (
    <div className="p-5 space-y-2.5" data-ref="mail-composer">
      <datalist id="desk-contacts">
        {cfg.contacts.map((c) => (
          <option key={c.email} value={c.email}>
            {c.name} · {c.role}
          </option>
        ))}
      </datalist>
      <label className="flex items-center gap-2">
        <span className="w-14 text-xs text-slate-500">To</span>
        <input list="desk-contacts" value={draft.to} onChange={(e) => onDraft({ ...draft, to: e.target.value })} className={field} placeholder="name@company.com" data-ref="mail-to" />
      </label>
      <label className="flex items-center gap-2">
        <span className="w-14 text-xs text-slate-500">Cc</span>
        <input list="desk-contacts" value={draft.cc} onChange={(e) => onDraft({ ...draft, cc: e.target.value })} className={field} />
      </label>
      <label className="flex items-center gap-2">
        <span className="w-14 text-xs text-slate-500">Subject</span>
        <input value={draft.subject} onChange={(e) => onDraft({ ...draft, subject: e.target.value })} className={field} data-ref="mail-subject" />
      </label>
      <details className="text-xs">
        <summary className="cursor-pointer text-slate-600 py-1">Address book ({cfg.contacts.length})</summary>
        <ul className="mt-1 grid sm:grid-cols-2 gap-1">
          {cfg.contacts.map((c) => (
            <li key={c.email}>
              <button onClick={() => onDraft({ ...draft, to: draft.to.trim() ? `${draft.to.replace(/[,;\s]+$/, '')}, ${c.email}` : c.email })} className="w-full text-left px-2 py-1 rounded hover:bg-slate-100">
                <span className="font-medium text-slate-800">{c.name}</span> <span className="text-slate-500">· {c.role}</span>
                <span className="block text-slate-400">{c.email}</span>
              </button>
            </li>
          ))}
        </ul>
      </details>
      <textarea value={draft.body} onChange={(e) => onDraft({ ...draft, body: e.target.value })} rows={12} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm leading-relaxed focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" data-ref="mail-body" />
      <div className="flex flex-wrap items-center gap-2">
        <label className="h-8 pl-2 pr-1 rounded-md border border-slate-200 flex items-center gap-1.5 text-xs text-slate-600">
          <Paperclip className="w-3.5 h-3.5" />
          <select value="" onChange={(e) => e.target.value && !draft.attachments.includes(e.target.value) && onDraft({ ...draft, attachments: [...draft.attachments, e.target.value] })} className="bg-transparent outline-none text-xs" aria-label="Attach a file" data-ref="mail-attach">
            <option value="">Attach a file…</option>
            {attachable.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {draft.attachments.map((a) => (
          <span key={a} className="h-8 pl-2.5 pr-1 rounded-md bg-slate-100 text-xs flex items-center gap-1">
            📎 {a}
            <button onClick={() => onDraft({ ...draft, attachments: draft.attachments.filter((x) => x !== a) })} aria-label={`Remove ${a}`} className="w-6 h-6 grid place-items-center rounded hover:bg-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        <span className="ml-auto flex gap-2">
          <button onClick={onCancel} className="h-9 px-4 rounded-md border border-slate-200 text-xs font-semibold hover:bg-slate-50">Discard</button>
          <button onClick={send} className="h-9 px-4 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-1.5" data-ref="mail-send">
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </span>
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
};

// ---------- Browser ----------

const BrowserApp: React.FC<{ cfg: DesktopConfig; onVisit: (url: string) => void; onDownload: (f: CaseFile) => void }> = ({ cfg, onVisit, onDownload }) => {
  const pages = cfg.pages ?? [];
  const [history, setHistory] = useState<string[]>([cfg.homepage ?? pages[0]?.url ?? 'about:blank']);
  const [at, setAt] = useState(0);
  const url = history[at];
  const [address, setAddress] = useState(url);
  const norm = (u: string) => u.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
  const page = pages.find((p) => norm(p.url) === norm(url));
  useEffect(() => {
    setAddress(url);
    if (page) onVisit(page.url);
  }, [url]);
  const go = (u: string) => {
    const next = [...history.slice(0, at + 1), u];
    setHistory(next);
    setAt(next.length - 1);
  };
  const block = (b: DeskBlock, i: number) => {
    switch (b.kind) {
      case 'h1':
        return <h1 key={i} className="text-2xl font-bold text-slate-900">{b.text}</h1>;
      case 'h2':
        return <h2 key={i} className="text-lg font-semibold text-slate-900 pt-2">{b.text}</h2>;
      case 'p':
        return <p key={i} className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{b.text}</p>;
      case 'note':
        return <p key={i} className="text-sm leading-relaxed text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 whitespace-pre-wrap">{b.text}</p>;
      case 'link':
        return (
          <p key={i}>
            <button onClick={() => go(b.url)} className="text-sm text-sky-700 hover:underline font-medium">{b.text}</button>
          </p>
        );
      case 'download':
        return (
          <p key={i}>
            <button onClick={() => onDownload(b.file)} className="h-9 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-800 inline-flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-700" />
              {b.text}
            </button>
          </p>
        );
      case 'table':
        return (
          <div key={i} className="overflow-x-auto border border-slate-200 rounded-lg">
            {b.caption && <div className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 border-b border-slate-200">{b.caption}</div>}
            <table className="min-w-full text-[13px] select-text">
              <thead className="bg-slate-50">
                <tr>{b.columns.map((c) => <th key={c} className="px-3 py-1.5 text-left font-semibold text-slate-600 border-b border-slate-200">{c}</th>)}</tr>
              </thead>
              <tbody>
                {b.rows.map((r, k) => (
                  <tr key={k} className="border-b border-slate-100 last:border-0">
                    {r.map((c, j) => <td key={j} className={`px-3 py-1.5 ${typeof c === 'number' ? 'text-right tabular-nums' : ''}`}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };
  return (
    <div className="h-full flex flex-col" data-ref="browser">
      <div className="h-11 shrink-0 flex items-center gap-1.5 px-2 bg-slate-50 border-b border-slate-200">
        <button onClick={() => setAt((a) => Math.max(0, a - 1))} disabled={at === 0} aria-label="Back" className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-200 disabled:opacity-30"><ArrowLeft className="w-4 h-4" /></button>
        <button onClick={() => setAt((a) => Math.min(history.length - 1, a + 1))} disabled={at >= history.length - 1} aria-label="Forward" className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-200 disabled:opacity-30"><ArrowRight className="w-4 h-4" /></button>
        <button onClick={() => go(url)} aria-label="Reload" className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-200"><RotateCw className="w-4 h-4" /></button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (address.trim()) go(address.trim());
          }}
          className="flex-1 flex items-center gap-2 h-8 px-3 rounded-full bg-white border border-slate-200 focus-within:border-sky-500"
        >
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <input value={address} onChange={(e) => setAddress(e.target.value)} className="flex-1 min-w-0 text-sm outline-none bg-transparent" aria-label="Address" data-ref="browser-address" />
        </form>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        {page ? (
          <>
            <div className="px-6 py-2.5 border-b border-slate-200 bg-slate-900 text-white text-sm font-semibold">{page.site}</div>
            <div className="px-6 py-5 max-w-4xl space-y-3">{page.blocks.map(block)}</div>
          </>
        ) : (
          <div className="h-full grid place-items-center text-center px-6">
            <div>
              <p className="text-lg font-semibold text-slate-800">This site can’t be reached</p>
              <p className="text-sm text-slate-500 mt-1">Check the address for a typo: {url}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Files ----------

const FilesApp: React.FC<{ files: CaseFile[]; focus: string | null }> = ({ files, focus }) => {
  const [sel, setSel] = useState<string | null>(focus ?? files[0]?.name ?? null);
  useEffect(() => {
    if (focus) setSel(focus);
  }, [focus]);
  const file = files.find((f) => f.name === sel);
  const rows = file && /\.csv$/i.test(file.name) ? parseCsv(file.content) : null;
  return (
    <div className="h-full flex text-sm" data-ref="files">
      <ul className="w-64 shrink-0 border-r border-slate-200 overflow-y-auto">
        {files.length === 0 && <li className="p-4 text-xs text-slate-500">No files yet. Attachments you receive and files you download appear here.</li>}
        {files.map((f) => (
          <li key={f.name}>
            <button onClick={() => setSel(f.name)} className={`w-full text-left px-3 py-2 flex items-center gap-2 border-b border-slate-100 ${sel === f.name ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="truncate">{f.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex-1 min-w-0 overflow-auto p-4">
        {file ? (
          <>
            <div className="mb-2 text-xs text-slate-500">
              {file.name} · To use it in the spreadsheet, open Spreadsheet and choose Import CSV.
            </div>
            {rows ? (
              <table className="text-[12.5px] border border-slate-200 select-text">
                <tbody>
                  {rows.slice(0, 200).map((r, i) => (
                    <tr key={i} className={i === 0 ? 'bg-slate-50 font-semibold' : ''}>
                      {r.map((c, j) => <td key={j} className="px-2 py-1 border border-slate-100 whitespace-nowrap">{c}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <pre className="text-[12.5px] whitespace-pre-wrap font-mono text-slate-800 select-text">{file.content}</pre>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-400">Select a file to preview it.</p>
        )}
      </div>
    </div>
  );
};

// ---------- Code ----------

const CodeApp: React.FC<{ project: DeskProject; files: Record<string, string>; onFiles: (files: Record<string, string>) => void }> = ({ project, files, onFiles }) => {
  const [open, setOpen] = useState(project.files[0]?.name ?? '');
  const [run, setRun] = useState<TestRun | null>(null);
  const [busy, setBusy] = useState(false);
  const file = project.files.find((f) => f.name === open);
  const text = (name: string) => files[name] ?? project.files.find((f) => f.name === name)?.content ?? '';
  const runTests = async () => {
    setBusy(true);
    try {
      setRun(await runDeskTests(project, Object.fromEntries(project.files.map((f) => [f.name, text(f.name)])), 'mine'));
    } finally {
      setBusy(false);
    }
  };
  const passed = run?.results.filter((r) => r.pass).length ?? 0;
  return (
    <div className="h-full flex text-sm bg-slate-950" data-ref="code">
      <aside className="w-48 shrink-0 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{project.name}</div>
        {project.files.map((f) => (
          <button key={f.name} onClick={() => setOpen(f.name)} className={`text-left px-3 py-1.5 text-xs font-mono flex items-center gap-2 ${open === f.name ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/60'}`}>
            <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500" />
            <span className="truncate">{f.name}</span>
            {files[f.name] !== undefined && files[f.name] !== f.content && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" title="Changed" />}
          </button>
        ))}
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="h-9 shrink-0 flex items-center gap-2 px-3 bg-slate-900 border-b border-slate-800 text-xs text-slate-400">
          <span className="font-mono text-slate-200">{open}</span>
          {file?.readonly && <span className="px-1.5 rounded bg-slate-800 text-[10px]">read only</span>}
          <button onClick={runTests} disabled={busy} className="ml-auto h-7 px-3 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5" data-ref="code-run">
            <Play className="w-3.5 h-3.5" />
            {busy ? 'Running…' : `Run tests (${project.testFile})`}
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {file && (
            <CodeField
              key={open}
              value={text(open)}
              onChange={(v) => !file.readonly && onFiles({ [open]: v })}
              language="JavaScript"
              ariaLabel={open}
              className="h-full"
            />
          )}
        </div>
        <div className="h-40 shrink-0 border-t border-slate-800 bg-slate-900 overflow-y-auto px-3 py-2 font-mono text-[12px]" data-ref="code-results" aria-live="polite">
          {!run ? (
            <span className="text-slate-500">Press Run tests to run {project.testFile} against your code.</span>
          ) : (
            <>
              <div className={passed === run.results.length && !run.error ? 'text-emerald-400' : 'text-amber-300'}>
                {passed} of {run.results.length} tests passed{run.error ? ` · ${run.error}` : ''}
              </div>
              {run.results.map((r, i) => (
                <div key={i} className={r.pass ? 'text-emerald-300' : 'text-rose-300'}>
                  {r.pass ? '✓' : '✗'} {r.name}
                  {r.error ? <span className="text-slate-400"> · {r.error}</span> : null}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
