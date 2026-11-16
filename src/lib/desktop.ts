import { CaseFile, DataTable, EmailContact, Question } from '../types';
import { checkSheet, parseWorkbook } from './spreadsheet';
import { matchesExpected, readPath } from './appSimulation';
import { roughWrittenMark } from './questionTypes';

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
 *   received:<rule id>        whether that person wrote back (the candidate's email earned the reply)
 *   visited:<url>             whether the page was opened
 *   downloaded:<file name>    whether the file was downloaded or saved
 *   state:<path>              any other part of the state
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

export type DeskApp = 'mail' | 'browser' | 'files' | 'sheet' | 'sql' | 'ai';

export interface DesktopConfig {
  user: { name: string; email: string; role: string };
  company: string;
  // The time the day starts, as shown on the taskbar clock
  time: string;
  apps: DeskApp[];
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

// Every email in the inbox now: the ones waiting at the start, then the replies that have arrived, newest last
export function inboxOf(cfg: DesktopConfig, state: DesktopState): (DeskEmail & { reply?: boolean })[] {
  const replies = state.received
    .map((key) => {
      const [ruleId, kind] = key.split('#');
      const rule = cfg.replies?.find((r) => r.id === ruleId);
      if (!rule) return null;
      const body: (Omit<DeskEmail, 'id' | 'to' | 'date'> & { to?: string[] }) | undefined = kind === 'otherwise' ? rule.otherwise : rule.reply;
      if (!body) return null;
      return { ...body, id: key, to: body.to ?? [cfg.user.email], date: 'Just now', reply: true };
    })
    .filter(Boolean) as (DeskEmail & { reply: boolean })[];
  return [...cfg.inbox, ...replies];
}

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

// Every file on the computer: handed over at the start, attached to emails received, and downloaded
export function filesOf(cfg: DesktopConfig, state: DesktopState): CaseFile[] {
  const all = [...(cfg.files ?? []), ...inboxOf(cfg, state).flatMap((m) => m.attachments ?? []), ...state.downloads];
  const seen = new Set<string>();
  return all.filter((f) => (seen.has(f.name) ? false : (seen.add(f.name), true)));
}

// A check on the desktop: its value, read as the check's kind says
export function desktopValue(cfg: DesktopConfig, state: DesktopState, input: string): unknown {
  const at = input.indexOf(':');
  const kind = input.slice(0, at);
  const rest = input.slice(at + 1);
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
    default:
      return undefined;
  }
}

// Every check run on the desktop as the candidate left it
export function checkDesktop(q: Question, answer: string) {
  const cfg = q.desktop!;
  const state = parseDesktop(answer, cfg);
  const wb = parseWorkbook(state.workbook);
  return q.testCases.map((tc) => {
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
