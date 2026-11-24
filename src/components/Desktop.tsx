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
import { DeskApp, DeskBlock, DeskEmail, DeskPhase, DesktopConfig, DesktopState, SentEmail, filesOf, inboxOf, landingIn, parseDesktop, repliesFor } from '../lib/desktop';
import { parseAddress } from '../lib/emailTasks';
import { parseCsv } from '../lib/csv';
import { SpreadsheetWindow } from './SpreadsheetWindow';
import { DatabaseWindow } from './DatabaseWindow';
import { AiPanel } from './Workspace';
import { AppWindow } from './AppWindow';
import { CodeField } from './CodeField';
import { DeskProject, TestRun, runDeskTests } from '../lib/deskCode';
import { BarChart3, BookOpen, CalendarDays, ClipboardList, FileType2, Headphones, KanbanSquare, MessagesSquare, Users } from 'lucide-react';
import { DeskCtx } from './desk/shared';
import { FilesApp, Folder } from './desk/FilesApp';
import { ChatApp } from './desk/ChatApp';
import { HelpdeskApp } from './desk/HelpdeskApp';
import { CrmApp } from './desk/CrmApp';
import { DocsApp } from './desk/DocsApp';
import { BiApp } from './desk/BiApp';
import { FormsApp } from './desk/FormsApp';
import { CalendarApp } from './desk/CalendarApp';
import { KbApp } from './desk/KbApp';
import { BoardApp } from './desk/BoardApp';
import { freeName, gridFromClipboard, gridToText } from '../lib/deskData';
import { LayoutGrid, Check, ChevronDown, ChevronUp, Clock, Search, Square, Copy, Wifi, Volume2, BatteryMedium, Bell } from 'lucide-react';

/**
 * The desktop a job simulation is worked on, made to feel like an everyday work computer: a wallpaper with shortcuts
 * down the left (double-click to open), windows that stack, minimise, restore down and drag, and a taskbar along the
 * bottom with Start (a searchable app menu), the apps in the middle (Mail with its unread count, Browser, Files,
 * Spreadsheet, Database, AI) and a tray with the day's clock and notifications. Built from the question's desktop config, so every job simulation reuses it with its own emails, pages and files.
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
  chat: { label: 'Chat', Icon: MessagesSquare, tint: 'bg-[#4a154b]' },
  helpdesk: { label: 'Help desk', Icon: Headphones, tint: 'bg-emerald-700' },
  crm: { label: 'CRM', Icon: Users, tint: 'bg-[#0176d3]' },
  docs: { label: 'Docs', Icon: FileType2, tint: 'bg-blue-700' },
  bi: { label: 'BI reports', Icon: BarChart3, tint: 'bg-yellow-500' },
  forms: { label: 'Forms', Icon: ClipboardList, tint: 'bg-violet-600' },
  calendar: { label: 'Calendar', Icon: CalendarDays, tint: 'bg-sky-700' },
  kb: { label: 'Knowledge base', Icon: BookOpen, tint: 'bg-teal-700' },
  board: { label: 'Projects', Icon: KanbanSquare, tint: 'bg-rose-500' },
};

const REPLY_DELAY_MS = 2500;

// A custom app's look on the desktop and taskbar
const baseAppInfo = (cfg: DesktopConfig, app: string) =>
  (APPS as Record<string, (typeof APPS)[DeskApp]>)[app] ?? { label: cfg.customApps?.find((c) => c.id === app)?.label ?? app, Icon: LayoutGrid, tint: 'bg-teal-600' };

// An app whose window the page supplies, for a skills test's task: its own spreadsheet, database, code editor or app
// simulation, kept in the task's own answer, on the desktop beside Files, Mail and the rest
export interface DeskSlot {
  id: string;
  label: string;
  // A built-in app whose icon it borrows
  look?: DeskApp;
  render: (ctx: DeskCtx) => React.ReactNode;
}

export const Desktop: React.FC<{ question: Question; answer: string; onChange: (answer: string) => void; company?: string; startApp?: string; slot?: DeskSlot; readOnly?: boolean }> = ({
  question: q,
  answer,
  onChange,
  company,
  startApp,
  slot,
  readOnly,
}) => {
  const cfg = q.desktop!;
  const appInfo = (c: DesktopConfig, app: string) => (slot && app === slot.id ? { ...(APPS[slot.look ?? 'code'] ?? APPS.code), label: slot.label } : baseAppInfo(c, app));
  const state = useMemo(() => parseDesktop(answer, cfg), [answer, cfg]);
  // The latest state, for replies that arrive after the candidate has done more
  const latest = useRef(state);
  latest.current = state;
  // Read only (a company looking at a candidate's finished work): everything opens, nothing changes
  const save = (change: Partial<DesktopState>) => {
    if (readOnly) return;
    onChange(JSON.stringify({ ...latest.current, ...change }));
  };
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

  // A timed day: the phase it has reached, its clock, and moving on (when its time runs out, or when the candidate is ready)
  const phases = cfg.phases ?? [];
  const phaseAt = Math.min(state.phase ?? 0, Math.max(phases.length - 1, 0));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!phases.length) return;
    if (latest.current.phaseStartedAt == null) save({ phase: latest.current.phase ?? 0, phaseStartedAt: Date.now() });
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phases.length]);
  const advance = (from: number) => {
    const cur = latest.current;
    if ((cur.phase ?? 0) !== from || from >= phases.length - 1) return;
    const next = from + 1;
    const landing = landingIn(cfg, next);
    save({ phase: next, phaseStartedAt: Date.now(), received: [...cur.received, ...landing.map((m) => `@${m.id}`).filter((k) => !cur.received.includes(k))] });
    setToast(landing.length ? `${phases[next].title}: new email from ${parseAddress(landing[0].from).name || 'a colleague'}` : `Now: ${phases[next].title}`);
  };
  const phaseLeft = phases.length && state.phaseStartedAt != null ? phases[phaseAt].minutes * 60 - Math.floor((now - state.phaseStartedAt) / 1000) : null;
  useEffect(() => {
    if (phaseLeft !== null && phaseLeft <= 0) advance(phaseAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseLeft !== null && phaseLeft <= 0, phaseAt]);
  const briefing = phases.length > 0 && phaseAt === 0 && !phases[0].scored;

  const inbox = inboxOf(cfg, state);
  const files = filesOf(cfg, state);
  const unread = inbox.filter((m) => !state.read.includes(m.id)).length;

  // Windows: minimised ones stay open (so nothing is lost) but hidden. Each opens windowed beside the desktop's
  // shortcuts, cascading, and can be dragged by its title bar; maximised, it fills the screen above the taskbar
  const [minimised, setMinimised] = useState<string[]>([]);
  // Which is in front: kept apart from open so bringing a window forward never moves it in the page (an app in a frame
  // would reload)
  const [stack, setStack] = useState<string[]>(first ? [first] : []);
  const [placed, setPlaced] = useState<Record<string, { x: number; y: number }>>({});
  const [maxed, setMaxed] = useState<string[]>([]);
  // Where a window opens: beside the shortcuts, each new one a step down and right
  const spot = (n: number) => ({ x: 96 + 24 * (n % 3), y: 10 + 20 * (n % 3) });
  const posOf = (app: string) => placed[app] ?? spot(Math.max(open.indexOf(app), 0));
  const [selected, setSelected] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const launch = (app: string) => {
    setOpen((prev) => (prev.includes(app) ? prev : [...prev, app]));
    setStack((prev) => [...prev.filter((a) => a !== app), app]);
    setMinimised((prev) => prev.filter((a) => a !== app));
    setActive(app);
    setStartOpen(false);
  };
  const topmost = (except: string, stackNow = stack, minNow = minimised) => [...stackNow].reverse().find((a) => a !== except && !minNow.includes(a)) ?? null;
  const minimise = (app: string) => {
    const next = [...minimised.filter((a) => a !== app), app];
    setMinimised(next);
    if (active === app) setActive(topmost(app, stack, next));
  };
  const close = (app: string) => {
    const next = stack.filter((a) => a !== app);
    setOpen((prev) => prev.filter((a) => a !== app));
    setStack(next);
    setMinimised((prev) => prev.filter((a) => a !== app));
    if (active === app) setActive(topmost(app, next));
  };
  const toggleMaximise = (app: string) => setMaxed((prev) => (prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]));
  // Dragging a restored window by its title bar
  const screenRef = useRef<HTMLDivElement>(null);
  const drag = (app: string, e: React.PointerEvent) => {
    if (maxed.includes(app) || (e.target as HTMLElement).closest('button')) return;
    const from = posOf(app);
    const start = { x: e.clientX, y: e.clientY };
    const box = screenRef.current?.getBoundingClientRect();
    const move = (ev: PointerEvent) => {
      const x = Math.max(-200, Math.min((box?.width ?? 1000) - 120, from.x + ev.clientX - start.x));
      const y = Math.max(0, Math.min((box?.height ?? 600) - 40, from.y + ev.clientY - start.y));
      setPlaced((prev) => ({ ...prev, [app]: { x, y } }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  // The computer's clock: the day's start time (e.g. "Mon 09:00"), moving on in real time
  const [mountedAt] = useState(() => Date.now());
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const dayClock = (() => {
    const m = cfg.time.match(/^(.*?)\s*(\d{1,2}):(\d{2})$/);
    if (!m) return { time: cfg.time, day: '' };
    const mins = Number(m[2]) * 60 + Number(m[3]) + Math.floor((tick - mountedAt) / 60000);
    return { time: `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`, day: m[1] };
  })();
  const titleOf = (app: string) => {
    const label = appInfo(cfg, app).label;
    if (app === 'mail') return `Inbox · ${cfg.user.email}`;
    if (app === 'sheet') return `${cfg.workbookName ?? 'Book1'} · ${label}`;
    if (app === 'sql') return `${cfg.databaseName ?? 'Database'} · ${label}`;
    return label;
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

  // Files: the candidate's own replace any of the same name; a renamed file leaves its old name
  const saveFile = (given: CaseFile, note?: string, renamedFrom?: string) => {
    // An export never overwrites a file the candidate was given (an attachment, a download): it takes a free name
    const own = latest.current.myFiles ?? [];
    const f = !renamedFrom && !own.some((x) => x.name === given.name) && files.some((x) => x.name === given.name) ? { ...given, name: freeName(given.name, files.map((x) => x.name)) } : given;
    const mine = own.filter((x) => x.name !== f.name && x.name !== renamedFrom);
    save({ myFiles: [...mine, f] });
    if (note !== '') setToast(note ?? `${f.name} saved to Files`);
  };
  // Where a file came from, for the Files app's folders
  const origin = (f: CaseFile): Folder =>
    (latest.current.myFiles ?? []).some((x) => x.name === f.name)
      ? 'mine'
      : (cfg.files ?? []).some((x) => x.name === f.name)
        ? 'shared'
        : latest.current.downloads.some((x) => x.name === f.name)
          ? 'downloads'
          : 'attachments';
  // A file handed to the app that opens it: Spreadsheet and Database import it, Docs opens it, Files shows it
  const [incoming, setIncoming] = useState<{ app: string; name: string; content: string; key: number } | null>(null);
  const openFile = (name: string, app?: string) => {
    const f = files.find((x) => x.name === name);
    if (!app || !cfg.apps.includes(app) || !f) {
      setFocusFile(name);
      return launch('files');
    }
    if (app === 'docs') setFocusFile(name);
    setIncoming({ app, name, content: f.content, key: Date.now() });
    launch(app);
  };
  const reached = (phase?: string) => !phase || !phases.length || (latest.current.phase ?? 0) >= phases.findIndex((p) => p.id === phase);
  const ctx: DeskCtx = {
    cfg,
    state,
    files,
    saveFile,
    removeFile: (name) => (save({ myFiles: (latest.current.myFiles ?? []).filter((x) => x.name !== name) }), setToast(`${name} deleted`)),
    openFile,
    toast: setToast,
    setWork: (app, next) => save({ desk: { ...(latest.current.desk ?? {}), [app]: next } }),
    reached,
    me: { name: cfg.user.name, email: cfg.user.email },
  };
  const work = cfg.work ?? {};

  const appWindow = (app: string) => {
    if (slot && app === slot.id) return slot.render(ctx);
    const custom = cfg.customApps?.find((c) => c.id === app);
    if (custom)
      return (
        <AppWindow
          value={state.appStates?.[app] ?? ''}
          onChange={(json) => save({ appStates: { ...(latest.current.appStates ?? {}), [app]: json } })}
          html={custom.html ?? ''}
          appName={custom.label}
          files={files}
          onSaveFile={(f) => saveFile(f)}
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
        return <FilesApp ctx={ctx} focus={focusFile} origin={origin} />;
      case 'sheet':
        return (
          <SpreadsheetWindow
            value={state.workbook}
            onChange={(wb) => save({ workbook: wb })}
            fileName={cfg.workbookName ?? 'Book1.xlsx'}
            files={files.filter((f) => /\.(csv|tsv|txt)$/i.test(f.name))}
            onSaveFile={saveFile}
            incoming={incoming?.app === 'sheet' ? incoming : undefined}
          />
        );
      case 'sql':
        return (
          <DatabaseWindow
            value={state.database}
            onChange={(db) => save({ database: db })}
            tables={cfg.tables ?? []}
            databaseName={cfg.databaseName ?? 'Database'}
            files={files.filter((f) => /\.(csv|tsv)$/i.test(f.name))}
            onSaveFile={saveFile}
            incoming={incoming?.app === 'sql' ? incoming : undefined}
          />
        );
      case 'chat':
        return work.chat ? <ChatApp ctx={ctx} cfg={work.chat} /> : null;
      case 'helpdesk':
        return work.helpdesk ? <HelpdeskApp ctx={ctx} cfg={work.helpdesk} /> : null;
      case 'crm':
        return work.crm ? <CrmApp ctx={ctx} cfg={work.crm} /> : null;
      case 'docs':
        return <DocsApp ctx={ctx} focus={incoming?.app === 'docs' ? incoming.name : null} />;
      case 'bi':
        return <BiApp ctx={ctx} cfg={work.bi ?? {}} />;
      case 'forms':
        return work.forms ? <FormsApp ctx={ctx} cfg={work.forms} /> : null;
      case 'calendar':
        return work.calendar ? <CalendarApp ctx={ctx} cfg={work.calendar} /> : null;
      case 'kb':
        return work.kb ? <KbApp ctx={ctx} cfg={work.kb} /> : null;
      case 'board':
        return work.board ? <BoardApp ctx={ctx} cfg={work.board} /> : null;
      case 'code':
        return cfg.project ? <CodeApp project={cfg.project} files={state.code ?? {}} onFiles={(code) => save({ code: { ...(latest.current.code ?? {}), ...code } })} /> : null;
      case 'ai':
        return <AiPanel task={`${cfg.user.role} at ${cfg.company}. ${q.prompt}`.slice(0, 4000)} company={company ?? cfg.company} chat={state.ai} onChat={(ai) => save({ ai })} />;
    }
  };

  const visible = open.filter((a) => !minimised.includes(a));
  return (
    <div className="h-full flex flex-col rounded-lg overflow-hidden border border-slate-300 shadow-sm select-none" data-ref="desktop">
      {phases.length > 0 && !briefing && <PhaseBar phases={phases} at={phaseAt} left={phaseLeft} onNext={() => advance(phaseAt)} />}
      {/* The screen: a wallpaper with the computer's shortcuts, and the open windows over it */}
      <div
        ref={screenRef}
        className="relative flex-1 min-h-0 overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse at 70% 110%, rgba(56,189,248,0.55) 0, transparent 55%), radial-gradient(ellipse at 15% -10%, rgba(129,140,248,0.55) 0, transparent 50%), linear-gradient(160deg, #1e3a8a 0%, #2563eb 45%, #0ea5e9 100%)',
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            setSelected(null);
            setStartOpen(false);
          }
        }}
      >
        {briefing && <Briefing cfg={cfg} phases={phases} left={phaseLeft} onStart={() => advance(0)} />}
        {/* Shortcuts down the left, as on any desktop: click to select, double-click (or Enter) to open */}
        <div className="absolute inset-y-0 left-0 p-2 flex flex-col flex-wrap content-start gap-1" onPointerDown={(e) => e.target === e.currentTarget && setSelected(null)}>
          {cfg.apps.map((app) => {
            const { label, Icon, tint } = appInfo(cfg, app);
            return (
              <button
                key={app}
                onClick={() => setSelected(app)}
                onDoubleClick={() => launch(app)}
                onKeyDown={(e) => e.key === 'Enter' && launch(app)}
                title={`Double-click to open ${label}`}
                className={`w-[76px] py-2 flex flex-col items-center gap-1 rounded border text-white ${
                  selected === app ? 'bg-white/25 border-white/40' : 'border-transparent hover:bg-white/15'
                }`}
                data-ref={`icon-${app}`}
              >
                <span className={`relative w-10 h-10 rounded-lg ${tint} grid place-items-center shadow-md ring-1 ring-inset ring-white/25`}>
                  <Icon className="w-5 h-5" />
                  {app === 'mail' && unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold grid place-items-center">{unread}</span>}
                </span>
                <span className="text-[11px] leading-tight text-center [text-shadow:0_1px_2px_rgba(0,0,0,0.7)]">{label}</span>
              </button>
            );
          })}
        </div>
        {visible.length === 0 && !briefing && (
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/25 text-xs text-white/90 backdrop-blur-sm">
            Double-click an app on the desktop, or pick it on the taskbar. Your inbox is a good place to start.
          </p>
        )}
        {open.map((app) => {
          const info = appInfo(cfg, app);
          // Small screens have no room for windows side by side: there every window fills the screen
          const at = maxed.includes(app) || (screenRef.current?.clientWidth ?? 1000) < 700 ? null : posOf(app);
          const focused = active === app;
          return (
            <section
              key={app}
              aria-label={info.label}
              onPointerDown={() => !focused && launch(app)}
              style={{ zIndex: 10 + stack.indexOf(app), ...(at && { left: at.x, top: at.y, width: 'calc(100% - 160px)', height: 'calc(100% - 66px)' }) }}
              className={`absolute bg-white flex flex-col overflow-hidden select-text border ${at ? 'rounded-lg shadow-2xl' : 'inset-0'} ${
                focused ? 'border-slate-400/70' : 'border-slate-300'
              } ${minimised.includes(app) ? 'hidden' : ''}`}
            >
              <header
                onPointerDown={(e) => drag(app, e)}
                onDoubleClick={(e) => !(e.target as HTMLElement).closest('button') && toggleMaximise(app)}
                className={`h-8 shrink-0 flex items-center gap-2 pl-3 select-none ${focused ? 'bg-slate-100' : 'bg-slate-50 text-slate-400'} ${at ? 'cursor-move' : ''}`}
              >
                {React.createElement(info.Icon, { className: `w-3.5 h-3.5 ${focused ? 'text-slate-600' : 'text-slate-400'}` })}
                <span className={`text-xs truncate ${focused ? 'text-slate-700' : 'text-slate-400'}`}>{titleOf(app)}</span>
                <span className="ml-auto flex items-stretch h-full">
                  <button onClick={() => minimise(app)} aria-label={`Minimise ${info.label}`} title="Minimise" className="w-11 grid place-items-center hover:bg-slate-200 text-slate-600">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleMaximise(app)} aria-label={at ? `Maximise ${info.label}` : `Restore ${info.label}`} title={at ? 'Maximise' : 'Restore down'} className="w-11 grid place-items-center hover:bg-slate-200 text-slate-600">
                    {at ? <Square className="w-3 h-3" /> : <Copy className="w-3 h-3 -scale-x-100" />}
                  </button>
                  <button onClick={() => close(app)} aria-label={`Close ${info.label}`} title="Close" className="w-11 grid place-items-center hover:bg-rose-600 hover:text-white text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              </header>
              <div className="flex-1 min-h-0 overflow-hidden">{appWindow(app)}</div>
            </section>
          );
        })}
        {/* The Start menu: every app, and who's signed in */}
        {startOpen && <StartMenu cfg={cfg} unread={unread} onLaunch={launch} onClose={() => setStartOpen(false)} appInfo={appInfo} />}
        {/* Notifications pop up bottom right, like the computer's own */}
        {toast && (
          <div role="status" className="absolute right-3 bottom-3 z-[60] w-80 max-w-[calc(100%-1.5rem)] bg-white/95 backdrop-blur text-slate-800 rounded-lg shadow-2xl border border-slate-200 p-3 flex gap-3">
            <span className="w-8 h-8 shrink-0 rounded-md bg-sky-600 text-white grid place-items-center">
              <Mail className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-slate-500">{cfg.company}</span>
              <span className="block text-xs">{toast}</span>
            </span>
          </div>
        )}
      </div>
      {/* The taskbar: Start, search, the apps in the middle (a line under the ones open), and the tray with the clock */}
      <nav aria-label="Taskbar" className="h-12 shrink-0 bg-slate-100/95 backdrop-blur border-t border-slate-300 grid grid-cols-[1fr_auto_1fr] items-center px-2" data-ref="taskbar">
        <span />
        <span className="flex items-center gap-1">
          <button
            onClick={() => setStartOpen((v) => !v)}
            aria-expanded={startOpen}
            aria-label="Start"
            title="Start"
            className={`w-10 h-10 grid place-items-center rounded-md ${startOpen ? 'bg-white shadow-sm' : 'hover:bg-white/80'}`}
          >
            <LayoutGrid className="w-5 h-5 text-sky-600" />
          </button>
          <button
            onClick={() => setStartOpen(true)}
            className="hidden lg:flex items-center gap-2 h-8 w-44 px-3 mr-1 rounded-full bg-white border border-slate-300 text-xs text-slate-400 hover:border-slate-400"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
          {cfg.apps.map((app) => {
            const { label, Icon, tint } = appInfo(cfg, app);
            const isOpen = open.includes(app);
            const isActive = active === app && !minimised.includes(app);
            return (
              <button
                key={app}
                onClick={() => (isActive ? minimise(app) : launch(app))}
                aria-pressed={isActive}
                title={label}
                aria-label={label}
                data-ref={`taskbar-${app}`}
                className={`relative w-10 h-10 grid place-items-center rounded-md transition-colors ${isActive ? 'bg-white shadow-sm' : 'hover:bg-white/80'}`}
              >
                <span className={`w-7 h-7 rounded-md ${tint} text-white grid place-items-center`}>
                  <Icon className="w-4 h-4" />
                </span>
                {app === 'mail' && unread > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold grid place-items-center">{unread}</span>
                )}
                {isOpen && <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-[3px] rounded-full ${isActive ? 'w-4 bg-sky-600' : 'w-1.5 bg-slate-400'}`} />}
              </button>
            );
          })}
        </span>
        <span className="justify-self-end flex items-center gap-1 text-slate-700">
          <span className="hidden sm:flex items-center gap-2 h-9 px-2 rounded-md hover:bg-white/80" aria-hidden="true">
            <ChevronUp className="w-3.5 h-3.5" />
            <Wifi className="w-4 h-4" />
            <Volume2 className="w-4 h-4" />
            <BatteryMedium className="w-4 h-4" />
          </span>
          <span className="h-9 px-2 rounded-md hover:bg-white/80 text-right text-[11px] leading-tight flex flex-col justify-center" title={cfg.user.name}>
            <span className="font-medium tabular-nums">{dayClock.time}</span>
            <span className="text-slate-500">{dayClock.day}</span>
          </span>
          <button onClick={() => launch('mail')} disabled={!cfg.apps.includes('mail')} aria-label={`Notifications${unread ? `: ${unread} unread emails` : ''}`} className="relative w-9 h-9 grid place-items-center rounded-md hover:bg-white/80 disabled:hover:bg-transparent">
            <Bell className="w-4 h-4" />
            {unread > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />}
          </button>
        </span>
      </nav>
    </div>
  );
};

// The Start menu: the computer's apps (searchable), and the person signed in
const StartMenu: React.FC<{ cfg: DesktopConfig; unread: number; onLaunch: (app: string) => void; onClose: () => void; appInfo: typeof baseAppInfo }> = ({ cfg, unread, onLaunch, onClose, appInfo }) => {
  const [q, setQ] = useState('');
  const apps = cfg.apps.filter((a) => appInfo(cfg, a).label.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-[70] w-[min(560px,calc(100%-1rem))] bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200 select-text" role="dialog" aria-label="Start">
      <div className="p-5 space-y-4">
        <label className="flex items-center gap-2 h-9 px-3 rounded-full bg-slate-100 border border-slate-200 focus-within:border-sky-500">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && apps[0]) onLaunch(apps[0]);
            }}
            placeholder="Search for apps"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2">Pinned</div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
            {apps.map((app) => {
              const { label, Icon, tint } = appInfo(cfg, app);
              return (
                <button key={app} onClick={() => onLaunch(app)} className="py-2.5 rounded-md hover:bg-slate-100 flex flex-col items-center gap-1.5">
                  <span className={`relative w-9 h-9 rounded-lg ${tint} text-white grid place-items-center`}>
                    <Icon className="w-5 h-5" />
                    {app === 'mail' && unread > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-bold grid place-items-center">{unread}</span>}
                  </span>
                  <span className="text-[11px] text-slate-700 text-center leading-tight">{label}</span>
                </button>
              );
            })}
            {apps.length === 0 && <p className="col-span-full text-xs text-slate-500 py-3">No apps match.</p>}
          </div>
        </div>
      </div>
      <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/80 rounded-b-xl flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-sky-600 text-white grid place-items-center text-xs font-bold">{cfg.user.name[0]}</span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-slate-800 truncate">{cfg.user.name}</span>
          <span className="block text-[11px] text-slate-500 truncate">
            {cfg.user.role} · {cfg.company}
          </span>
        </span>
      </div>
    </div>
  );
};

// ---------- The day's phases ----------

const clock = (secs: number | null) => (secs === null ? '' : `${Math.floor(Math.max(secs, 0) / 60)}:${String(Math.max(secs, 0) % 60).padStart(2, '0')}`);

// The briefing, over the desktop: who you are, where, for whom, with which tools, and how the day runs. Not marked
const Briefing: React.FC<{ cfg: DesktopConfig; phases: DeskPhase[]; left: number | null; onStart: () => void }> = ({ cfg, phases, left, onStart }) => (
  <div className="absolute inset-0 z-[80] bg-slate-900/70 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto select-text" data-ref="briefing">
    <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">{phases[0].title} · not marked</span>
        <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-500 tabular-nums">
          <Clock className="w-3.5 h-3.5" />
          {clock(left)}
        </span>
      </div>
      <h2 className="text-lg font-bold text-slate-900">
        {cfg.user.role} at {cfg.company}
      </h2>
      <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{phases[0].brief}</p>
      <ol className="grid gap-1.5 text-xs">
        {phases.slice(1).map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2">
            <span className="w-5 h-5 grid place-items-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">{i + 2}</span>
            <span className="font-semibold text-slate-800">{p.title}</span>
            <span className="ml-auto text-slate-500">{p.minutes} min</span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-slate-500">New work lands as each part starts. Everything stays open, so you can finish earlier tasks later. Each part moves on by itself when its time is up.</p>
      <button onClick={onStart} className="w-full h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold flex items-center justify-center gap-2" data-ref="briefing-start">
        Start the day
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  </div>
);

// Along the top of the desktop: the day's parts, the one running with its clock, and what it asks for
const PhaseBar: React.FC<{ phases: DeskPhase[]; at: number; left: number | null; onNext: () => void }> = ({ phases, at, left, onNext }) => {
  const [shown, setShown] = useState(true);
  useEffect(() => setShown(true), [at]);
  const cur = phases[at];
  const last = at === phases.length - 1;
  const over = left !== null && left <= 0;
  return (
    <div className="shrink-0 bg-white border-b border-slate-200 select-text" data-ref="phase-bar">
      <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto">
        {phases.map((p, i) => (
          <span
            key={p.id}
            aria-current={i === at ? 'step' : undefined}
            className={`shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold ${i === at ? 'bg-indigo-600 text-white' : i < at ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
          >
            {i < at ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
            <span className={i === at ? '' : 'hidden lg:inline'}>{p.title}</span>
            <span className="opacity-70">{p.minutes}m</span>
          </span>
        ))}
        <span className={`ml-auto shrink-0 flex items-center gap-1 text-xs font-bold tabular-nums ${over ? 'text-rose-600' : left !== null && left <= 60 ? 'text-amber-600' : 'text-slate-700'}`} title="Time left in this part">
          <Clock className="w-3.5 h-3.5" />
          {clock(left)}
        </span>
        {!last && (
          <button onClick={onNext} className="shrink-0 h-7 px-3 rounded-md bg-slate-900 hover:bg-slate-700 text-white text-[11px] font-semibold flex items-center gap-1" data-ref="phase-next">
            Move on to {phases[at + 1].title}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => setShown((v) => !v)} aria-expanded={shown} aria-label={shown ? 'Hide the brief' : 'Show the brief'} className="shrink-0 w-7 h-7 grid place-items-center rounded-md hover:bg-slate-100 text-slate-500">
          {shown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {shown && (
        <p className="px-3 pb-2 text-[12.5px] leading-relaxed text-slate-700 whitespace-pre-line" data-ref="phase-brief">
          <span className="font-semibold text-slate-900">
            {at + 1}. {cur.title}:{' '}
          </span>
          {last && over ? 'Time’s up for this part. Use the few minutes left to check your work, then submit.' : cur.brief}
        </p>
      )}
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
      <textarea
        value={draft.body}
        onChange={(e) => onDraft({ ...draft, body: e.target.value })}
        onPaste={(e) => {
          // A table copied from Spreadsheet, a report or a page comes in lined up in columns
          const html = e.clipboardData.getData('text/html');
          const text = e.clipboardData.getData('text/plain');
          const g = (text.includes('\t') || /<table/i.test(html)) && gridFromClipboard(text, html);
          if (!g) return;
          e.preventDefault();
          const el = e.currentTarget;
          const at = el.selectionStart ?? draft.body.length;
          onDraft({ ...draft, body: `${draft.body.slice(0, at)}${gridToText(g)}\n${draft.body.slice(el.selectionEnd ?? at)}` });
        }}
        rows={12} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm leading-relaxed focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20" data-ref="mail-body" />
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
