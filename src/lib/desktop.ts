import { CaseFile, DataTable, EmailContact, Question } from '../types';
import { checkSheet, parseWorkbook } from './spreadsheet';
import { matchesExpected, parseAppState, readPath } from './appSimulation';
import { roughWrittenMark } from './questionTypes';
import type { DeskProject } from './deskCode';
import { DeskAppsConfig, DeskAppsState, DeskWorkApp, chatChannels, deskAppValue } from './deskApps';

/**
 * A desktop for job simulations: a computer like the candidate's own at work, with a taskbar of apps (Mail, Browser,
 * Files, Spreadsheet, Database, AI). Each job simulation fills it from data (its emails, its web pages, its files and
 * which apps it has), so any role's day can be built on it: an analyst's, a marketer's, a support agent's.
 *
 * Mail: an inbox of emails (some with attachments), a composer with the company's address book, and people who write
 * back. A reply rule says who answers which email (to whom, about what, with which attachment), so asking the right
 * person the right thing gets the files and answers the day needs.
 * Browser: a small web of pages (an intranet, a supplier's portal, a public statistics site) with links, tables and
 * downloads, reached by typing their address or following links.
 * Files: everything handed over or downloaded, to open, attach to an email, or import into the spreadsheet.
 *
 * The candidate's answer is the desktop's state, marked by checks written as:
 *   sheet:=FORMULA            a formula run on the workbook (as a spreadsheet task's checks are)
 *   sent:<address>            whether an email went to that address (To or Cc)
 *   attached:<address>:<text> whether an email to that address carried a file whose name contains the text
 *   mail:<address>            the last email sent to that address (marked against its rubric by the AI)
 *   firstmail:<address>       the first email sent to that address
 *   mailwith:<address>:<file> the email to that address that carried the file (else the first)
 *   mailcount:<address>       how many emails went to that address
 *   earned:<rule id>          the email that earned that person's reply
 *   received:<rule id>        whether that person wrote back (the candidate's email earned the reply)
 *   visited:<url>             whether the page was opened
 *   downloaded:<file name>    whether the file was downloaded or saved
 *   app:<app id>:<path>       a path in a custom app's state (e.g. app:deskly:tickets.9001.status)
 *   test:<check id>           one of Praxa's tests, run on the Code app's files when marked
 *   filehas:<file>:<pattern>  whether a Code app file contains a pattern (a regular expression)
 *   state:<path>              any other part of the state
 * and the work apps' checks (file:, chat:, ticket:, record:, event:, form:, kbviewed:, item:, chart: …), listed in
 * src/lib/deskApps.ts.
 */

export interface DeskEmail {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  date: string;
  subject: string;
  body: string;
  attachments?: CaseFile[];
  // The phase this email lands in (its id), for a curveball or a new demand; without one it's waiting at the start
  phase?: string;
}

// A phase of a timed job simulation (see src/data/modules/jobSimKit.ts): Briefing, Core task, Curveball, Juggling
// and judgement, Report back. Each starts when the one before runs out of time or the candidate moves on, and its
// emails arrive as it starts. The work stays open throughout, so earlier tasks can still be finished later.
export interface DeskPhase {
  id: string;
  title: string;
  minutes: number;
  // The briefing isn't marked
  scored: boolean;
  // What's asked now, shown on the desktop as the phase starts (kept short: reading time counts)
  brief: string;
}

// Someone who writes back: when the candidate sends an email to this address that matches, the reply arrives
export interface DeskReplyRule {
  id: string;
  to: string;
  // Words the email must contain (any one of each group), e.g. [['target', 'targets'], ['q1', 'quarter']]
  mustMention?: string[][];
  // A file the email must carry (part of its name)
  mustAttach?: string;
  reply: Omit<DeskEmail, 'id' | 'to' | 'date'> & { to?: string[] };
  // What the person says when the email doesn't have what they need, if anything
  otherwise?: Omit<DeskEmail, 'id' | 'to' | 'date'>;
}

// A web page: blocks of headings, text, links, tables and downloads
export type DeskBlock =
  | { kind: 'h1' | 'h2' | 'p' | 'note'; text: string }
  | { kind: 'link'; text: string; url: string }
  | { kind: 'table'; caption?: string; columns: string[]; rows: (string | number)[][] }
  | { kind: 'download'; text: string; file: CaseFile };

export interface DeskPage {
  url: string;
  title: string;
  // The site it belongs to, shown in the page's header
  site: string;
  blocks: DeskBlock[];
}

export type DeskApp = 'mail' | 'browser' | 'files' | 'sheet' | 'sql' | 'ai' | 'code' | DeskWorkApp;

// Every desktop has the basic apps (Mail and Files, and the AI assistant where the test allows it); beyond them, the
// taskbar shows only the apps that test uses
export const BASIC_DESK_APPS: DeskApp[] = ['mail', 'files', 'ai'];
// Whether the desktop has an app, on the taskbar or only in the Start menu
export const hasApp = (cfg: { apps: (DeskApp | string)[]; more?: (DeskApp | string)[] }, app: string) => cfg.apps.includes(app) || !!cfg.more?.includes(app);

export function desktopApps(apps: (DeskApp | string)[], ai: boolean): (DeskApp | string)[] {
  const work = [...new Set(apps.filter((a) => !(BASIC_DESK_APPS as string[]).includes(a)))];
  return ['mail', ...work, 'files', ...(ai ? ['ai'] : [])];
}

// A job's own software on the desktop (a help desk, a CRM, a till): a hand-built app page that saves its state with
// praxa.save, kept in the desktop's state under its id and checked with app:<id>:<path>
export interface DeskCustomApp {
  id: string;
  label: string;
  // The page; while stored, left out when it's a library app's version unchanged (src/lib/appRefs.ts)
  html: string;
  // The app from Praxa's app library it is, and its version, and (stored without html) its data as JSON
  libraryApp?: { id: string; version: number };
  data?: string;
}

export interface DesktopConfig {
  user: { name: string; email: string; role: string };
  company: string;
  // The time the day starts, as shown on the taskbar clock
  time: string;
  // The taskbar's apps, in order: the basic ones and the apps the test uses (built-in ids and custom apps' ids)
  apps: (DeskApp | string)[];
  // Apps only in the Start menu, on the taskbar only while open (the admin test lab's every app)
  more?: (DeskApp | string)[];
  customApps?: DeskCustomApp[];
  contacts: EmailContact[];
  inbox: DeskEmail[];
  replies?: DeskReplyRule[];
  pages?: DeskPage[];
  homepage?: string;
  files?: CaseFile[];
  // The spreadsheet's starting workbook (JSON), and the database's tables
  workbook?: string;
  workbookName?: string;
  tables?: DataTable[];
  databaseName?: string;
  // The Code app's project
  project?: DeskProject;
  // A timed day in phases; without them the whole day is there from the start
  phases?: DeskPhase[];
  // The work apps' starting data (chat, help desk, CRM, docs, BI, forms, calendar, knowledge base, board): see deskApps.ts
  work?: DeskAppsConfig;
}

export interface SentEmail {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  attachments: string[];
  at: number;
}

export interface DesktopState {
  sent: SentEmail[];
  // Replies that have arrived, by rule id, with the order they came in
  received: string[];
  // Emails opened, by id
  read: string[];
  visited: string[];
  downloads: CaseFile[];
  workbook: string;
  database: string;
  ai: { role: 'user' | 'assistant'; text: string }[];
  // Each custom app's saved state (JSON), by app id
  appStates: Record<string, string>;
  // The Code app's files as the candidate left them, by name
  code: Record<string, string>;
  // Files the candidate saved on the computer: exports, documents, uploads. A file saved under a name already on the
  // computer replaces it there (an edited document, a re-exported CSV)
  myFiles?: CaseFile[];
  // The work apps' state (see deskApps.ts)
  desk?: DeskAppsState;
  // The phase the day has reached (an index into the config's phases) and when it started (ms since 1970)
  phase?: number;
  phaseStartedAt?: number;
}

export const emptyDesktop = (cfg: DesktopConfig): DesktopState => ({
  sent: [],
  received: [],
  read: [],
  visited: [],
  downloads: [],
  workbook: cfg.workbook ?? JSON.stringify({ sheets: [{ name: 'Sheet1', cells: {} }] }),
  database: JSON.stringify({ script: '', changes: [] }),
  ai: [],
  appStates: {},
  code: {},
});

export function parseDesktop(json: string, cfg: DesktopConfig): DesktopState {
  const base = emptyDesktop(cfg);
  try {
    const s = JSON.parse(json);
    return { ...base, ...(s && typeof s === 'object' ? s : {}) };
  } catch {
    return base;
  }
}

const lower = (s: string) => s.trim().toLowerCase();
const recipients = (m: SentEmail) => [...m.to, ...m.cc].map(lower);

// Whether a sent email earns a person's reply
export function earnsReply(rule: DeskReplyRule, m: SentEmail): boolean {
  if (!recipients(m).includes(lower(rule.to))) return false;
  const text = `${m.subject}\n${m.body}`.toLowerCase();
  if (rule.mustMention?.some((group) => !group.some((w) => text.includes(w.toLowerCase())))) return false;
  if (rule.mustAttach && !m.attachments.some((a) => a.toLowerCase().includes(rule.mustAttach!.toLowerCase()))) return false;
  return true;
}

// Every email in the inbox now: the ones waiting at the start, then the rest in the order they landed (replies, and a
// phase's emails, kept in received as "@<email id>" when the phase starts), newest last
export function inboxOf(cfg: DesktopConfig, state: DesktopState): (DeskEmail & { reply?: boolean })[] {
  const later = state.received
    .map((key) => {
      if (key.startsWith('@')) {
        const m = cfg.inbox.find((x) => x.id === key.slice(1));
        return m && arrived(cfg, state, m) ? m : null;
      }
      const [ruleId, kind] = key.split('#');
      const rule = cfg.replies?.find((r) => r.id === ruleId);
      if (!rule) return null;
      const body: (Omit<DeskEmail, 'id' | 'to' | 'date'> & { to?: string[] }) | undefined = kind === 'otherwise' ? rule.otherwise : rule.reply;
      if (!body) return null;
      return { ...body, id: key, to: body.to ?? [cfg.user.email], date: 'Just now', reply: true };
    })
    .filter(Boolean) as (DeskEmail & { reply?: boolean })[];
  const landed = new Set(later.map((m) => m.id));
  // A phase's email that has no arrival kept (an answer saved another way) still shows once its phase is reached
  return [...cfg.inbox.filter((m) => !landed.has(m.id) && arrived(cfg, state, m)), ...later];
}

// Whether an email has landed yet: it has no phase, or the day has reached its phase
export function arrived(cfg: DesktopConfig, state: DesktopState, m: DeskEmail): boolean {
  if (!m.phase || !cfg.phases?.length) return true;
  const at = cfg.phases.findIndex((p) => p.id === m.phase);
  return at < 0 || (state.phase ?? 0) >= at;
}

// The emails that land when the day reaches a phase
export const landingIn = (cfg: DesktopConfig, phase: number): DeskEmail[] => {
  const id = cfg.phases?.[phase]?.id;
  return id ? cfg.inbox.filter((m) => m.phase === id) : [];
};

// The replies a newly sent email brings: the person's answer, or their "I need more" once
export function repliesFor(cfg: DesktopConfig, state: DesktopState, m: SentEmail): string[] {
  const out: string[] = [];
  for (const rule of cfg.replies ?? []) {
    if (state.received.includes(rule.id)) continue;
    if (earnsReply(rule, m)) out.push(rule.id);
    else if (rule.otherwise && recipients(m).includes(lower(rule.to)) && !state.received.includes(`${rule.id}#otherwise`)) out.push(`${rule.id}#otherwise`);
  }
  return out;
}

// Every file on the computer: the candidate's own (saved, exported, edited), handed over at the start, attached to
// emails received, shared in chat, downloaded, and the documents the day starts with
export function filesOf(cfg: DesktopConfig, state: DesktopState): CaseFile[] {
  const reached = (phase?: string) => arrived(cfg, state, { phase } as DeskEmail);
  const chat = cfg.work?.chat ? chatChannels(cfg.work.chat, state.desk?.chat, cfg.user.email, reached).flatMap((c) => c.all.filter((m) => !m.mine).flatMap((m) => m.attachments ?? [])) : [];
  const docs = (cfg.work?.docs?.templates ?? []).map((t) => ({ name: t.name, content: t.html }));
  const all = [...(state.myFiles ?? []), ...(cfg.files ?? []), ...inboxOf(cfg, state).flatMap((m) => m.attachments ?? []), ...chat, ...state.downloads, ...docs];
  const seen = new Set<string>();
  return all.filter((f) => (seen.has(f.name) ? false : (seen.add(f.name), true)));
}

// A check on the desktop: its value, read as the check's kind says
export function desktopValue(cfg: DesktopConfig, state: DesktopState, input: string): unknown {
  const at = input.indexOf(':');
  const kind = at < 0 ? input : input.slice(0, at);
  const rest = at < 0 ? '' : input.slice(at + 1);
  const work = deskAppValue(cfg.work ?? {}, state.desk ?? {}, { files: filesOf(cfg, state), reached: (phase) => arrived(cfg, state, { phase } as DeskEmail) }, kind, rest);
  if (work.known) return work.value;
  switch (kind) {
    case 'sent':
      return state.sent.some((m) => recipients(m).includes(lower(rest)));
    case 'attached': {
      const [addr, ...name] = rest.split(':');
      return state.sent.some((m) => recipients(m).includes(lower(addr)) && m.attachments.some((a) => a.toLowerCase().includes(name.join(':').toLowerCase())));
    }
    case 'mail': {
      const to = state.sent.filter((m) => recipients(m).includes(lower(rest)));
      return to.length ? `${to[to.length - 1].subject}\n\n${to[to.length - 1].body}` : '';
    }
    case 'firstmail': {
      const to = state.sent.filter((m) => recipients(m).includes(lower(rest)));
      return to.length ? `${to[0].subject}\n\n${to[0].body}` : '';
    }
    case 'mailwith': {
      // The first email to that address carrying the file, else the first one sent to them
      const [addr, ...name] = rest.split(':');
      const to = state.sent.filter((m) => recipients(m).includes(lower(addr)));
      const m = to.find((x) => x.attachments.some((a) => a.toLowerCase().includes(name.join(':').toLowerCase()))) ?? to[0];
      return m ? `${m.subject}\n\n${m.body}` : '';
    }
    case 'earned': {
      // The email that earned a reply rule's answer
      const rule = cfg.replies?.find((r) => r.id === rest);
      const m = rule && state.sent.find((x) => earnsReply(rule, x));
      return m ? `${m.subject}\n\n${m.body}` : '';
    }
    case 'mailcount':
      return state.sent.filter((m) => recipients(m).includes(lower(rest))).length;
    case 'received':
      return state.received.includes(rest);
    case 'visited':
      return state.visited.some((u) => lower(u) === lower(rest));
    case 'downloaded':
      return state.downloads.some((f) => lower(f.name) === lower(rest));
    case 'state':
      return readPath(state, rest);
    case 'filehas': {
      // Whether a project file (as the candidate left it) contains a pattern (a regular expression)
      const [file, ...pattern] = rest.split(':');
      const text = state.code?.[file] ?? cfg.project?.files.find((f) => f.name === file)?.content ?? '';
      try {
        return new RegExp(pattern.join(':'), 'i').test(text);
      } catch {
        return false;
      }
    }
    case 'app': {
      const [id, ...path] = rest.split(':');
      return readPath(parseAppState(state.appStates?.[id] ?? '') ?? {}, path.join(':'));
    }
    default:
      return undefined;
  }
}

// Every check run on the desktop as the candidate left it. Checks written test:<id> are Praxa's tests on the Code app's
// files, run beforehand (testsPassed)
export function checkDesktop(q: Question, answer: string, testsPassed: Record<string, boolean> = {}) {
  const cfg = q.desktop!;
  const state = parseDesktop(answer, cfg);
  const wb = parseWorkbook(state.workbook);
  return q.testCases.map((tc) => {
    if (tc.input.startsWith('test:')) {
      const passed = !!testsPassed[tc.input.slice(5)];
      return { id: tc.id, description: tc.description, passed, input: tc.input, expected: 'passes', actual: passed ? 'passes' : 'fails', executionMs: 0 };
    }
    if (tc.input.startsWith('sheet:')) {
      const r = checkSheet(wb, tc.input.slice(6), tc.expectedOutput);
      return { id: tc.id, description: tc.description, passed: r.passed, input: tc.input, expected: tc.expectedOutput, actual: r.actual, executionMs: 0 };
    }
    const actual = desktopValue(cfg, state, tc.input);
    if (tc.rubric?.length) {
      const text = typeof actual === 'string' ? actual : '';
      const credit = roughWrittenMark({ rubric: tc.rubric } as Question, text) / 100;
      return { id: tc.id, description: tc.description, passed: false, credit, input: tc.input, expected: tc.rubric.join(' · '), actual: text || '(nothing written)', executionMs: 0 };
    }
    const shown = actual === undefined ? '(not set)' : typeof actual === 'string' ? actual : JSON.stringify(actual);
    return { id: tc.id, description: tc.description, passed: matchesExpected(actual, tc.expectedOutput), input: tc.input, expected: tc.expectedOutput, actual: shown, executionMs: 0 };
  });
}
