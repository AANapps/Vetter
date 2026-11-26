import { CaseFile } from '../types';
import { fileGrid, fileText } from './deskData';
import type { AutomationsConfig, AutomationsState } from './automations';
import { lastRunOn } from './automations';

/**
 * The desktop's work apps beyond Mail, Browser, Files, Spreadsheet, Database and Code: each filled from the job
 * simulation's config (what's there when the day starts) and kept in the desktop's state as the candidate works
 * (DesktopState.desk). Built-in, so a day only supplies data: no app is written per test.
 *
 *   chat       Slack/Teams: channels and direct messages; colleagues answer by rule, and share files
 *   helpdesk   Zendesk-style tickets: queue, views, statuses, priorities, tags, macros, replies and internal notes
 *   crm        Salesforce/HubSpot-style records: objects (contacts, companies, deals…) as tables with record pages
 *   docs       Word/Google Docs: documents kept as files, with headings, lists and tables
 *   bi         Power BI-style dashboard: charts built from any table on the computer, with filters
 *   forms      internal forms (refunds, incident reports) from a schema, with their submissions
 *   calendar   a week's calendar, colleagues' busy times and invitations
 *   kb         a help centre or policy library: searchable articles
 *   board      monday.com / Jira-style project board: table and kanban views of items
 *   agents     AI agents the candidate briefs, supervises and checks: live AI with blind spots
 *   automations  Zapier/n8n-style workflows the candidate builds, run on a source's events into the other apps
 *                (src/lib/automations.ts)
 */

export type DeskWorkApp = 'chat' | 'helpdesk' | 'crm' | 'docs' | 'bi' | 'forms' | 'calendar' | 'kb' | 'board' | 'agents' | 'automations';

// ---------- Chat ----------
export interface ChatMessage {
  id: string;
  from: string; // a contact's email, or the user's
  text: string;
  time?: string;
  attachments?: CaseFile[];
  // The phase this message lands in, as an email's does
  phase?: string;
}
export interface ChatChannel {
  id: string;
  name: string; // "#ops" or a person's name for a direct message
  kind: 'channel' | 'dm';
  // For a direct message: who it's with (their email)
  with?: string;
  topic?: string;
  messages: ChatMessage[];
}
export interface ChatRule {
  id: string;
  channel: string; // a channel id
  mustMention?: string[][];
  mustShare?: string; // part of a shared file's name
  reply: Omit<ChatMessage, 'id' | 'phase'>;
  otherwise?: Omit<ChatMessage, 'id' | 'phase'>;
}
export interface ChatConfig {
  channels: ChatChannel[];
  replies?: ChatRule[];
}
export interface ChatPost {
  channel: string;
  text: string;
  attachments?: string[];
  at: number;
}

// ---------- Help desk ----------
export type TicketStatus = 'new' | 'open' | 'pending' | 'on-hold' | 'solved' | 'closed';
export interface TicketComment {
  from: string;
  body: string;
  time?: string;
  internal?: boolean;
}
export interface Ticket {
  id: string;
  subject: string;
  requester: string; // "Name <email>"
  status: TicketStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
  assignee?: string;
  created: string;
  channel?: 'email' | 'chat' | 'phone' | 'web';
  // Fields the company keeps on tickets, e.g. { "Order": "#4471", "Plan": "Pro" }
  fields?: Record<string, string>;
  thread: TicketComment[];
  phase?: string;
}
export interface Macro {
  name: string;
  body: string;
  status?: TicketStatus;
  tags?: string[];
}
export interface HelpdeskConfig {
  name?: string; // "Zendesk", "Freshdesk", the company's own
  tickets: Ticket[];
  macros?: Macro[];
  agents?: string[];
  // How long each priority has for a first reply, in hours (shown as SLA)
  sla?: Partial<Record<Ticket['priority'], number>>;
}
export interface TicketWork {
  status?: TicketStatus;
  priority?: Ticket['priority'];
  assignee?: string;
  tags?: string[];
  fields?: Record<string, string>;
  added?: { body: string; internal: boolean; at: number }[];
}

// ---------- CRM ----------
export type FieldType = 'text' | 'number' | 'money' | 'date' | 'email' | 'phone' | 'select' | 'textarea' | 'link';
export interface CrmField {
  key: string;
  label: string;
  type?: FieldType;
  options?: string[];
  // For a link: the object it points to (its records' "name" field is shown)
  object?: string;
}
export interface CrmObject {
  id: string; // "contacts"
  label: string; // "Contacts"
  fields: CrmField[];
  records: Record<string, string>[]; // each has an "id"
}
export interface CrmConfig {
  name?: string;
  objects: CrmObject[];
}
export interface CrmWork {
  // Each object's records as the candidate left them (a full copy once anything changes)
  records?: Record<string, Record<string, string>[]>;
  notes?: { object: string; id: string; text: string; at: number }[];
}

// ---------- Docs ----------
// Documents are files (".docx" holding HTML); the config only names the ones to start with
export interface DocsConfig {
  templates?: { name: string; html: string }[];
}

// ---------- BI ----------
export type ChartKind = 'bar' | 'column' | 'line' | 'pie' | 'table' | 'card';
export type Agg = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'distinct';
export interface BiChart {
  id: string;
  title: string;
  source: string; // a file name, or "table:<name>" for a database table
  kind: ChartKind;
  x?: string; // category field
  y?: string; // value field
  agg: Agg;
  filters?: { field: string; values: string[] }[];
  sort?: 'value-desc' | 'value-asc' | 'label';
  top?: number;
}
export interface BiConfig {
  name?: string;
  charts?: BiChart[];
}

// ---------- Forms ----------
export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'money' | 'date' | 'select' | 'radio' | 'checkbox' | 'email';
  options?: string[];
  required?: boolean;
  help?: string;
}
export interface DeskForm {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  // Earlier entries others made, shown in the list
  entries?: Record<string, string>[];
}
export interface FormsConfig {
  name?: string;
  forms: DeskForm[];
}
export interface FormEntry {
  form: string;
  values: Record<string, string>;
  at: number;
}

// ---------- Calendar ----------
export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string;
  attendees?: string[]; // emails
  location?: string;
  notes?: string;
  // An event only on someone else's calendar: shown as busy in the scheduling view
  owner?: string;
}
export interface CalendarConfig {
  // The first day shown (a Monday), YYYY-MM-DD, and "today"
  weekOf: string;
  today?: string;
  events: CalEvent[];
  // Working hours shown
  hours?: [number, number];
}
export interface CalendarWork {
  events?: CalEvent[]; // made by the candidate
  removed?: string[];
  // Replies to invitations: event id -> yes/no/maybe
  responses?: Record<string, 'yes' | 'no' | 'maybe'>;
}

// ---------- Knowledge base ----------
export interface KbArticle {
  id: string;
  title: string;
  category: string;
  body: string; // plain text with blank lines between paragraphs; "- " lines are bullets
  updated?: string;
}
export interface KbConfig {
  name?: string;
  articles: KbArticle[];
}

// ---------- Board ----------
export interface BoardItem {
  id: string;
  title: string;
  status: string;
  group?: string;
  owner?: string;
  due?: string;
  priority?: string;
  type?: string; // Jira: Story, Bug, Task
  points?: string;
  description?: string;
  comments?: { from: string; text: string; at?: number }[];
  phase?: string;
}
export interface DeskBoard {
  id: string;
  name: string;
  style: 'monday' | 'jira';
  // Jira's key prefix, e.g. "OPS" for OPS-12
  key?: string;
  statuses: string[];
  groups?: string[];
  people?: string[];
  items: BoardItem[];
}
export interface BoardConfig {
  boards: DeskBoard[];
}

// ---------- Agents ----------
// The AI-at-work layer of a job simulation: AI agents that do part of the work, answered live by a quick model
// (server/deskAgent.ts) on the day's data, whatever the candidate writes. The day sets only each task and the agent's
// blind spots: mistakes it makes unless the brief, or what the candidate tells it later, covers that point. Each run
// reports which blind spots it fell into and on which line, so marking reads what the candidate did about them.
export interface AgentDef {
  id: string;
  name: string; // "Ada"
  role: string; // "Insight agent: analysis, summaries and drafts"
}
export interface AgentPitfall {
  id: string;
  // The mistake the agent makes by default, what the instructions must make clear to avoid it, and (for the company's
  // view) what's wrong when it happens
  mistake: string;
  avoidWhen: string;
  why: string;
}
export interface AgentTask {
  id: string;
  title: string;
  // Who asked for it and why, shown on the task
  context?: string;
  // Handed out already (a colleague asked the agent): its first run is made when the task is first opened, with every
  // blind spot in it, for the candidate to review
  agent?: string;
  brief?: string;
  // The agent the work fits, for a task the candidate hands out
  bestAgent?: string;
  // What the work is, what the agent knows, the files on the computer it works from, and the file it hands back
  goal: string;
  facts?: string;
  data?: string[];
  file?: string;
  // What approving does ("Save the cleaned file to Files")
  action?: string;
  pitfalls: AgentPitfall[];
  phase?: string;
}
export interface AgentsConfig {
  name?: string; // "Copilot agents"
  agents: AgentDef[];
  tasks: AgentTask[];
}
// A run as the agent handed it back: its activity, output and file, and the blind spots whose problem is in it, each
// pinned to the lines it shows on or throws off ("s:<i>" a step, "o:<i>" an output line)
export interface AgentRun {
  id: string;
  agent: string;
  steps: string[];
  output: string;
  file?: CaseFile;
  slips: { id: string; lines: string[] }[];
  at: number;
}
export interface AgentFlag {
  line: string;
  run: string;
  text: string;
  note: string;
  at: number;
}
export interface AgentTaskWork {
  agent?: string;
  brief?: string;
  // What they told the agent since the brief (with work sent back)
  notes?: string[];
  runs?: AgentRun[];
  decision?: 'approved' | 'rejected' | 'returned';
  // Whether the run they approved was clean, and the note with their last decision
  approved?: 'clean' | 'flawed';
  note?: string;
  flags?: AgentFlag[];
  // Questions asked and the agent's answers
  chat?: { role: 'user' | 'assistant'; text: string }[];
  // Every step taken, in order, for the company's view of how they worked
  log?: { what: string; at: number }[];
}

export interface DeskAppsConfig {
  chat?: ChatConfig;
  helpdesk?: HelpdeskConfig;
  crm?: CrmConfig;
  docs?: DocsConfig;
  bi?: BiConfig;
  forms?: FormsConfig;
  calendar?: CalendarConfig;
  kb?: KbConfig;
  board?: BoardConfig;
  agents?: AgentsConfig;
  automations?: AutomationsConfig;
}

export interface DeskAppsState {
  chat?: { posts: ChatPost[]; received: string[]; read?: string[] };
  helpdesk?: { tickets: Record<string, TicketWork>; created?: Ticket[] };
  crm?: CrmWork;
  bi?: { charts: BiChart[] };
  forms?: { entries: FormEntry[] };
  calendar?: CalendarWork;
  kb?: { viewed: string[] };
  board?: { items: Record<string, BoardItem[]> };
  agents?: { tasks: Record<string, AgentTaskWork>; opened?: string[] };
  automations?: AutomationsState;
}

const lower = (s: string) => s.trim().toLowerCase();
const mentions = (groups: string[][] | undefined, text: string) => !groups?.some((g) => !g.some((w) => text.toLowerCase().includes(w.toLowerCase())));

// ---------- Live views: the config with the candidate's work applied ----------

type Reached = (phase?: string) => boolean;

export function chatChannels(cfg: ChatConfig, work: DeskAppsState['chat'], me: string, reached: Reached) {
  const posts = work?.posts ?? [];
  const got = work?.received ?? [];
  return cfg.channels.map((ch) => {
    const base = ch.messages.filter((m) => reached(m.phase)).map((m) => ({ ...m, mine: false, at: 0 }));
    const mine = posts.filter((p) => p.channel === ch.id).map((p, i) => ({ id: `me-${ch.id}-${i}`, time: undefined as string | undefined, from: me, text: p.text, attachments: (p.attachments ?? []).map((n) => ({ name: n, content: '' })), mine: true, at: p.at }));
    const answers = got
      .map((key) => {
        // Kept as "<rule id>[#otherwise]@<when it arrived>"
        const [base, when] = key.split('@');
        const [rid, kind] = base.split('#');
        const rule = cfg.replies?.find((r) => r.id === rid && r.channel === ch.id);
        const body = rule && (kind === 'otherwise' ? rule.otherwise : rule.reply);
        const at = Number(when ?? 0);
        return body ? { ...body, id: key, mine: false, at } : null;
      })
      .filter(Boolean) as (ChatMessage & { mine: boolean; at: number })[];
    // The day's messages first, then the candidate's and the answers in the order they happened
    const later = [...mine, ...answers].sort((a, b) => a.at - b.at);
    return { ...ch, all: [...base, ...later] };
  });
}

// Replies a new chat post earns
export function chatRepliesFor(cfg: ChatConfig, received: string[], post: ChatPost): string[] {
  const out: string[] = [];
  const has = (id: string) => received.some((k) => k.split('@')[0] === id);
  for (const r of cfg.replies ?? []) {
    if (r.channel !== post.channel || has(r.id)) continue;
    const ok = mentions(r.mustMention, post.text) && (!r.mustShare || (post.attachments ?? []).some((a) => lower(a).includes(lower(r.mustShare!))));
    if (ok) out.push(r.id);
    else if (r.otherwise && !has(`${r.id}#otherwise`)) out.push(`${r.id}#otherwise`);
  }
  return out;
}

export function ticketsNow(cfg: HelpdeskConfig, work: DeskAppsState['helpdesk'], reached: Reached): (Ticket & { added: NonNullable<TicketWork['added']> })[] {
  const all = [...cfg.tickets.filter((t) => reached(t.phase)), ...(work?.created ?? [])];
  return all.map((t) => {
    const w = work?.tickets?.[t.id] ?? {};
    return {
      ...t,
      status: w.status ?? t.status,
      priority: w.priority ?? t.priority,
      assignee: w.assignee ?? t.assignee,
      tags: w.tags ?? t.tags ?? [],
      fields: { ...(t.fields ?? {}), ...(w.fields ?? {}) },
      added: w.added ?? [],
    };
  });
}

export const crmRecords = (cfg: CrmConfig, work: CrmWork | undefined, object: string) => work?.records?.[object] ?? cfg.objects.find((o) => o.id === object)?.records ?? [];

export const boardItems = (b: DeskBoard, work: DeskAppsState['board'], reached: Reached) => work?.items?.[b.id] ?? b.items.filter((i) => reached(i.phase));

export function calendarEvents(cfg: CalendarConfig, work: CalendarWork | undefined) {
  const removed = new Set(work?.removed ?? []);
  return [...cfg.events, ...(work?.events ?? [])].filter((e) => !removed.has(e.id));
}

// The agent tasks that have reached the day, and the run showing on each (the latest)
export const agentTasksNow = (cfg: AgentsConfig, reached: Reached) => cfg.tasks.filter((t) => reached(t.phase));
export const agentRunShowing = (w?: AgentTaskWork): AgentRun | undefined => w?.runs?.[w.runs.length - 1];
// The lines of a run that can be flagged, with their keys
export const agentLines = (r: AgentRun) => [...r.steps.map((text, i) => ({ key: `s:${i}`, text })), ...r.output.split('\n').map((text, i) => ({ key: `o:${i}`, text })).filter((l) => l.text.trim())];
// The planted mistakes in the work as first handed over (a draft already run, or the candidate's first run) that they
// caught (flagged the line), the flags on it that caught nothing, and how many there were to catch
export function agentCatches(t: AgentTask, w?: AgentTaskWork) {
  const first = w?.runs?.[0];
  if (!first) return { caught: [] as string[], wrong: [] as AgentFlag[], total: t.pitfalls.length };
  const flags = (w?.flags ?? []).filter((f) => f.run === first.id);
  const caught = first.slips.filter((s) => flags.some((f) => s.lines.includes(f.line))).map((s) => s.id);
  const wrong = flags.filter((f) => !first.slips.some((s) => s.lines.includes(f.line)));
  return { caught, wrong, total: first.slips.length };
}

// ---------- BI: a chart's numbers ----------

export interface Dataset {
  name: string; // as a chart's source is written
  label: string;
  grid: string[][];
}

export function datasetsOf(files: CaseFile[], tables: { name: string; columns: string[]; rows: Record<string, unknown>[] }[]): Dataset[] {
  return [
    ...tables.map((t) => ({ name: `table:${t.name}`, label: `${t.name} (database)`, grid: [t.columns, ...t.rows.map((r) => t.columns.map((c) => (r[c] == null ? '' : String(r[c]))))] })),
    ...files.flatMap((f) => {
      const g = fileGrid(f);
      return g && g.length > 1 ? [{ name: f.name, label: f.name, grid: g }] : [];
    }),
  ];
}

export function chartData(ch: BiChart, ds: Dataset | undefined): { labels: string[]; values: number[]; rows: number } {
  if (!ds) return { labels: [], values: [], rows: 0 };
  const [head, ...rows] = ds.grid;
  const col = (name?: string) => (name ? head.findIndex((h) => lower(h) === lower(name)) : -1);
  const xi = col(ch.x);
  const yi = col(ch.y);
  const kept = rows.filter((r) => (ch.filters ?? []).every((f) => !f.values.length || f.values.includes(r[col(f.field)] ?? '')));
  const num = (v: string | undefined) => {
    const n = Number(String(v ?? '').replace(/[£$€,%\s]/g, ''));
    return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null;
  };
  const groups = new Map<string, string[]>();
  for (const r of kept) {
    const k = xi >= 0 ? r[xi] ?? '' : 'Total';
    groups.set(k, [...(groups.get(k) ?? []), yi >= 0 ? r[yi] ?? '' : '']);
  }
  const reduce = (vals: string[]) => {
    if (ch.agg === 'count') return vals.length;
    if (ch.agg === 'distinct') return new Set(vals).size;
    const ns = vals.map(num).filter((n): n is number => n !== null);
    if (!ns.length) return 0;
    if (ch.agg === 'sum') return ns.reduce((a, b) => a + b, 0);
    if (ch.agg === 'avg') return ns.reduce((a, b) => a + b, 0) / ns.length;
    if (ch.agg === 'min') return Math.min(...ns);
    return Math.max(...ns);
  };
  let pairs = [...groups.entries()].map(([k, v]) => [k, Math.round(reduce(v) * 100) / 100] as [string, number]);
  if (ch.sort === 'value-desc') pairs.sort((a, b) => b[1] - a[1]);
  else if (ch.sort === 'value-asc') pairs.sort((a, b) => a[1] - b[1]);
  else if (ch.sort === 'label') pairs.sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  if (ch.top) pairs = pairs.slice(0, ch.top);
  return { labels: pairs.map((p) => p[0]), values: pairs.map((p) => p[1]), rows: kept.length };
}

// ---------- Checks ----------

/**
 * Check kinds for the work apps (see src/lib/desktop.ts for the rest):
 *   file:<name>                      a file's text as the candidate left it (a document's words, a CSV's rows)
 *   filerows:<name>                  how many data rows a CSV file has
 *   chat:<channel id>                the candidate's last message in that channel
 *   chatcount:<channel id>           how many messages they posted there
 *   chatreceived:<rule id>           whether that colleague answered
 *   ticket:<id>:<field>              status, priority, assignee, tags, reply (last public reply), note (last internal note), replies
 *   tickets:<status>                 how many tickets have that status
 *   record:<object>:<id>:<field>     a CRM record's field
 *   recordwhere:<object>:<field>=<value>:<field>   a field of the first record whose field is that value
 *   records:<object>                 how many records the object has
 *   crmnote:<object>:<id>            the notes logged on a record
 *   event:<words>                    whether the candidate made an event whose title has the words
 *   eventwith:<email>                whether an event they made invites that person
 *   eventat:<words>                  the date and start ("2026-11-24 14:00") of the event they made with those words
 *   response:<event id>              yes/no/maybe to an invitation
 *   form:<form id>:<field>           a field of their last entry on that form
 *   formcount:<form id>              how many entries they made
 *   kbviewed:<article id>            whether they opened the article
 *   item:<board>:<item id>:<field>   a board item's field (status, owner, due, priority, points, title, comments)
 *   itemwhere:<board>:<field>=<value>:<field>
 *   items:<board>:<status>           how many items have that status
 *   chart:<words>                    the chart with those words in its title, as "kind x by agg y" (filters too)
 *   charts                           how many charts the dashboard has
 *   agent:<task>:<field>             an agent task: agent (who has it), brief, clean (its latest run fell into no blind
 *                                    spot: true/false), slips (the latest run's blind spots, comma-joined), runs (how
 *                                    many), decision (approved/rejected/returned or ''), approved (clean/flawed or ''),
 *                                    note (with the decision), notes (everything they told it), flags, flagnotes, asked,
 *                                    handled (rejected, sent back, or approved only clean work: for a judgement call)
 *   agentflag:<task>:<pitfall id>    whether they flagged a line where the agent fell into that blind spot
 *   agentcaught:<task>               the first run's planted mistakes caught, "n/total" (partial credit, less for false
 *                                    alarms)
 *   agentopened:<task>               whether they opened the task
 *   flowrun:<source>:<metric>        the last real run of a workflow on that source: done, filtered, skipped, errors
 *                                    (event counts), stopped (true/false), ran (true/false)
 *   flow:<source>:<metric>           that workflow: kinds (its steps' kinds, comma-joined), hasai, onerror, errorchannel
 *   recordsjoin:<object>:<field>     every record's field, sorted, ", " between (what's in the CRM now)
 *   chatmentions:<channel>:<a|b|…>   whether every one of the words is in some message the candidate (or their
 *                                    automation) posted there
 */
export function deskAppValue(
  apps: DeskAppsConfig,
  work: DeskAppsState,
  ctx: { files: CaseFile[]; reached: Reached },
  kind: string,
  rest: string
): { known: boolean; value?: unknown } {
  const parts = rest.split(':');
  const find = <T extends Record<string, unknown>>(list: T[], spec: string) => {
    const [f, ...v] = spec.split('=');
    return list.find((r) => lower(String(r[f] ?? '')) === lower(v.join('=')));
  };
  switch (kind) {
    case 'file': {
      const f = ctx.files.find((x) => lower(x.name) === lower(rest));
      return { known: true, value: f ? fileText(f) : '' };
    }
    case 'filerows': {
      const f = ctx.files.find((x) => lower(x.name) === lower(rest));
      const g = f && fileGrid(f);
      return { known: true, value: g ? Math.max(g.length - 1, 0) : 0 };
    }
    case 'chat': {
      const mine = (work.chat?.posts ?? []).filter((p) => p.channel === rest);
      return { known: true, value: mine.length ? mine[mine.length - 1].text : '' };
    }
    case 'chatcount':
      return { known: true, value: (work.chat?.posts ?? []).filter((p) => p.channel === rest).length };
    case 'chatreceived':
      return { known: true, value: (work.chat?.received ?? []).some((k) => k.split('@')[0] === rest) };
    case 'ticket': {
      const [id, field] = parts;
      const t = apps.helpdesk && ticketsNow(apps.helpdesk, work.helpdesk, ctx.reached).find((x) => lower(x.id) === lower(id));
      if (!t) return { known: true, value: undefined };
      const pub = t.added.filter((a) => !a.internal);
      const notes = t.added.filter((a) => a.internal);
      const v =
        field === 'reply' ? pub[pub.length - 1]?.body ?? '' : field === 'note' ? notes[notes.length - 1]?.body ?? '' : field === 'replies' ? pub.length : field === 'tags' ? (t.tags ?? []).join(', ') : (t as unknown as Record<string, unknown>)[field] ?? t.fields?.[field];
      return { known: true, value: v };
    }
    case 'tickets':
      return { known: true, value: apps.helpdesk ? ticketsNow(apps.helpdesk, work.helpdesk, ctx.reached).filter((t) => t.status === rest).length : 0 };
    case 'record': {
      const [obj, id, field] = parts;
      const r = apps.crm && crmRecords(apps.crm, work.crm, obj).find((x) => lower(x.id ?? '') === lower(id));
      return { known: true, value: r?.[field] };
    }
    case 'recordwhere': {
      const [obj, spec, field] = parts;
      const r = apps.crm && find(crmRecords(apps.crm, work.crm, obj), spec);
      return { known: true, value: r?.[field] };
    }
    case 'records':
      return { known: true, value: apps.crm ? crmRecords(apps.crm, work.crm, rest).length : 0 };
    case 'crmnote': {
      const [obj, id] = parts;
      return { known: true, value: (work.crm?.notes ?? []).filter((n) => n.object === obj && lower(n.id) === lower(id)).map((n) => n.text).join('\n\n') };
    }
    case 'event':
      return { known: true, value: (work.calendar?.events ?? []).some((e) => lower(e.title).includes(lower(rest))) };
    case 'eventwith':
      return { known: true, value: (work.calendar?.events ?? []).some((e) => (e.attendees ?? []).some((a) => lower(a) === lower(rest))) };
    case 'eventat': {
      const e = (work.calendar?.events ?? []).find((x) => lower(x.title).includes(lower(rest)));
      return { known: true, value: e ? `${e.date} ${e.start}` : '' };
    }
    case 'response':
      return { known: true, value: work.calendar?.responses?.[rest] ?? '' };
    case 'form': {
      const [id, field] = parts;
      const mine = (work.forms?.entries ?? []).filter((e) => e.form === id);
      return { known: true, value: mine[mine.length - 1]?.values[field] ?? '' };
    }
    case 'formcount':
      return { known: true, value: (work.forms?.entries ?? []).filter((e) => e.form === rest).length };
    case 'kbviewed':
      return { known: true, value: (work.kb?.viewed ?? []).includes(rest) };
    case 'item': {
      const [bid, id, field] = parts;
      const b = apps.board?.boards.find((x) => x.id === bid);
      const it = b && boardItems(b, work.board, ctx.reached).find((x) => lower(x.id) === lower(id));
      return { known: true, value: field === 'comments' ? (it?.comments ?? []).map((c) => c.text).join('\n\n') : (it as unknown as Record<string, unknown>)?.[field] };
    }
    case 'itemwhere': {
      const [bid, spec, field] = parts;
      const b = apps.board?.boards.find((x) => x.id === bid);
      const it = b && find(boardItems(b, work.board, ctx.reached) as unknown as Record<string, unknown>[], spec);
      return { known: true, value: it?.[field] };
    }
    case 'items': {
      const [bid, status] = parts;
      const b = apps.board?.boards.find((x) => x.id === bid);
      return { known: true, value: b ? boardItems(b, work.board, ctx.reached).filter((i) => lower(i.status) === lower(status)).length : 0 };
    }
    case 'chart': {
      const ch = (work.bi?.charts ?? []).find((c) => lower(c.title).includes(lower(rest)));
      return { known: true, value: ch ? describeChart(ch) : '' };
    }
    case 'agent':
    case 'agentflag':
    case 'agentcaught':
    case 'agentopened': {
      const [id, field] = parts;
      const t = apps.agents?.tasks.find((x) => lower(x.id) === lower(id));
      if (!t) return { known: true, value: undefined };
      const w = work.agents?.tasks?.[t.id];
      const last = agentRunShowing(w);
      if (kind === 'agentopened') return { known: true, value: (work.agents?.opened ?? []).includes(t.id) };
      if (kind === 'agentcaught') {
        const c = agentCatches(t, w);
        return { known: true, value: `${c.caught.length}/${c.total}` };
      }
      if (kind === 'agentflag')
        return { known: true, value: (w?.runs ?? []).some((r) => r.slips.some((sl) => lower(sl.id) === lower(field ?? '') && (w?.flags ?? []).some((f) => f.run === r.id && sl.lines.includes(f.line)))) };
      const v: Record<string, unknown> = {
        agent: w?.agent ?? t.agent ?? '',
        brief: w?.brief ?? '',
        clean: !!last && !last.slips.length,
        // A judgement call handled: they rejected it, sent it back, or approved only clean work
        handled: w?.decision === 'rejected' || w?.decision === 'returned' || (w?.decision === 'approved' && w.approved === 'clean'),
        slips: (last?.slips ?? []).map((x) => x.id).join(', '),
        runs: (w?.runs ?? []).length,
        decision: w?.decision ?? '',
        approved: w?.approved ?? '',
        note: w?.note ?? '',
        notes: (w?.notes ?? []).join('\n'),
        flags: (w?.flags ?? []).length,
        flagnotes: (w?.flags ?? []).map((f) => `${f.text} — ${f.note}`).join('\n'),
        asked: (w?.chat ?? []).filter((m) => m.role === 'user').length,
      };
      return { known: true, value: v[field ?? ''] };
    }
    case 'flowrun':
    case 'flow': {
      const [source, metric] = parts;
      const run = lastRunOn(work.automations, source);
      if (kind === 'flowrun') {
        if (metric === 'ran') return { known: true, value: !!run };
        if (!run) return { known: true, value: metric === 'stopped' ? '' : 0 };
        if (metric === 'stopped') return { known: true, value: run.stopped };
        const status = metric === 'errors' ? 'error' : metric;
        return { known: true, value: run.events.filter((e) => e.status === status).length };
      }
      const flow = run && (work.automations?.flows ?? []).find((f) => f.id === run.flow);
      if (!flow) return { known: true, value: metric === 'hasai' ? false : '' };
      const v: Record<string, unknown> = { kinds: flow.steps.map((x) => x.kind).join(', '), hasai: flow.steps.some((x) => x.kind === 'ai'), onerror: flow.onError, errorchannel: flow.errorChannel ?? '' };
      return { known: true, value: v[metric ?? ''] };
    }
    case 'recordsjoin': {
      const [obj, field] = parts;
      const recs = apps.crm ? crmRecords(apps.crm, work.crm, obj) : [];
      return { known: true, value: recs.map((r) => String(r[field] ?? '').trim()).filter(Boolean).sort((a, b) => a.localeCompare(b)).join(', ') };
    }
    case 'chatmentions': {
      const [channel, ...rest2] = parts;
      const words = rest2.join(':').split('|').map(lower).filter(Boolean);
      const posts = (work.chat?.posts ?? []).filter((p) => p.channel === channel).map((p) => lower(p.text));
      return { known: true, value: words.every((wd) => posts.some((p) => p.includes(wd))) };
    }
    default:
      if (kind === 'charts') return { known: true, value: (work.bi?.charts ?? []).length };
      return { known: false };
  }
}

export const describeChart = (c: BiChart) =>
  `${c.kind} ${c.x ?? ''} by ${c.agg} ${c.y ?? ''}${(c.filters ?? []).filter((f) => f.values.length).map((f) => ` where ${f.field} in ${f.values.join('|')}`).join('')}`.replace(/\s+/g, ' ').trim();
