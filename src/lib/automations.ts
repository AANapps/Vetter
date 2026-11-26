import { CaseFile } from '../types';
import type { ChatPost, CrmConfig, DeskAppsConfig, DeskAppsState, HelpdeskConfig, TicketWork } from './deskApps';
import { toCsv } from './csv';

/**
 * Automations on the desktop (the Automations app, src/components/desk/AutomationsApp.tsx): Zapier/n8n-style
 * workflows the candidate builds from a trigger (a source of events: web form entries, new tickets, invoice rows) and
 * steps: filter, set a field, an AI step (live AI on every event, server/deskAgent.ts), skip duplicates, and actions on
 * the desktop's own apps (create a CRM record, post in Chat, update a help desk ticket, add a row to a CSV in Files).
 * A run writes into those apps for real, so the ordinary checks mark the result (records:, chatcount:, ticket:…); a
 * workflow run again first takes its last run's effects back out. Each workflow says what an error does: stop the run,
 * skip that event, or carry on, and where to report it.
 */

export interface FlowSource {
  id: string;
  label: string; // "Website contact form: new entry"
  app: string; // which app it comes from, for the icon: forms, helpdesk, file, mail, webhook
  fields: string[];
  events: Record<string, string>[];
}

export type FilterOp = 'equals' | 'not equals' | 'contains' | 'does not contain' | 'greater than' | 'less than' | 'is empty' | 'is not empty';
export const FILTER_OPS: FilterOp[] = ['equals', 'not equals', 'contains', 'does not contain', 'greater than', 'less than', 'is empty', 'is not empty'];
export type TextFn = 'none' | 'trim' | 'lowercase' | 'uppercase' | 'capitalise';

export type FlowStep =
  | { id: string; kind: 'filter'; field: string; op: FilterOp; value: string }
  | { id: string; kind: 'set'; field: string; value: string; fn: TextFn }
  | { id: string; kind: 'ai'; prompt: string; output: string; options: string }
  | { id: string; kind: 'skipif'; object: string; match: string; value: string }
  | { id: string; kind: 'crm'; object: string; values: Record<string, string> }
  | { id: string; kind: 'chat'; channel: string; text: string }
  | { id: string; kind: 'ticket'; ticket: string; status: string; priority: string; tags: string }
  | { id: string; kind: 'row'; file: string; values: Record<string, string> };
export type StepKind = FlowStep['kind'];

export const STEP_INFO: Record<StepKind, { label: string; about: string }> = {
  filter: { label: 'Filter', about: 'Only carry on when a field meets a condition' },
  set: { label: 'Set a field', about: 'Make or clean up a field (trim, lowercase, combine)' },
  ai: { label: 'AI step', about: 'Ask AI to classify, extract or write, for every event' },
  skipif: { label: 'Skip duplicates', about: 'Stop if the CRM already has a matching record' },
  crm: { label: 'Create CRM record', about: 'Add a record to a CRM object' },
  chat: { label: 'Post in Chat', about: 'Post a message to a channel' },
  ticket: { label: 'Update ticket', about: 'Change a help desk ticket' },
  row: { label: 'Add CSV row', about: 'Add a row to a CSV file in Files' },
};

export interface Flow {
  id: string;
  name: string;
  source: string;
  steps: FlowStep[];
  onError: 'stop' | 'skip' | 'continue';
  // A Chat channel told about each error, if any
  errorChannel?: string;
}

export interface AutomationsConfig {
  name?: string;
  sources: FlowSource[];
  // Workflows already there when the day starts (one to fix, say)
  flows?: Flow[];
  // What a CRM object needs before a record can be made (field keys): a missing one is an error
  required?: Record<string, string[]>;
}

export type EventStatus = 'done' | 'filtered' | 'skipped' | 'error' | 'not run';
export interface EventLog {
  n: number;
  status: EventStatus;
  lines: string[];
  error?: string;
}
export interface FlowRun {
  flow: string;
  source: string;
  at: number;
  // A test run shows what would happen without changing anything
  test: boolean;
  events: EventLog[];
  stopped: boolean;
}

// What a run did to the other apps, kept so the next run of the same workflow can take it back out
export interface FlowEffects {
  crm: { object: string; id: string }[];
  chat: number[]; // the posts' times (ids)
  tickets: Record<string, TicketWork | null>; // each ticket's work before the run (null: none)
  files: string[];
}

export interface AutomationsState {
  flows: Flow[];
  runs: FlowRun[];
  // The last real run's effects, by workflow
  effects?: Record<string, FlowEffects>;
}

// ---------- Templates and values ----------

// {{field}} filled from the event
export const fill = (tpl: string, ev: Record<string, string>) => String(tpl ?? '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, k: string) => ev[k.trim()] ?? ev[Object.keys(ev).find((x) => x.toLowerCase() === k.trim().toLowerCase()) ?? ''] ?? '');
const num = (v: string) => {
  const n = Number(String(v).replace(/[£$€,\s]/g, ''));
  return String(v).trim() !== '' && Number.isFinite(n) ? n : null;
};
const lower = (s: string) => String(s ?? '').trim().toLowerCase();
const fieldOf = (ev: Record<string, string>, f: string) => ev[f] ?? ev[Object.keys(ev).find((k) => lower(k) === lower(f)) ?? ''] ?? '';

export function passes(ev: Record<string, string>, s: Extract<FlowStep, { kind: 'filter' }>): boolean {
  const v = fieldOf(ev, s.field);
  const want = fill(s.value, ev);
  switch (s.op) {
    case 'equals':
      return lower(v) === lower(want);
    case 'not equals':
      return lower(v) !== lower(want);
    case 'contains':
      return lower(v).includes(lower(want));
    case 'does not contain':
      return !lower(v).includes(lower(want));
    case 'greater than':
    case 'less than': {
      // Numbers compare as numbers; text that isn't a number never passes (as in the real tools)
      const a = num(v);
      const b = num(want);
      if (a === null || b === null) return false;
      return s.op === 'greater than' ? a > b : a < b;
    }
    case 'is empty':
      return !String(v).trim();
    case 'is not empty':
      return !!String(v).trim();
  }
}

const textFn = (v: string, fn: TextFn) => (fn === 'trim' ? v.trim() : fn === 'lowercase' ? v.toLowerCase() : fn === 'uppercase' ? v.toUpperCase() : fn === 'capitalise' ? v.trim().replace(/\b\w/g, (c) => c.toUpperCase()) : v);
const validEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// ---------- Running ----------

export interface RunWorld {
  apps: DeskAppsConfig;
  work: DeskAppsState;
  files: CaseFile[];
  required?: Record<string, string[]>;
  // Live AI for an AI step: the outputs for every event at once
  ai: (prompt: string, events: Record<string, string>[], options: string[]) => Promise<string[]>;
}
export interface RunResult {
  run: FlowRun;
  // The apps' state after the run (unchanged for a test run), and what it did
  work: DeskAppsState;
  files: CaseFile[];
  effects: FlowEffects;
}

const crmNow = (cfg: CrmConfig | undefined, work: DeskAppsState, object: string) => work.crm?.records?.[object] ?? cfg?.objects.find((o) => o.id === object)?.records ?? [];

// Takes a workflow's last run back out of the apps
export function undoEffects(work: DeskAppsState, apps: DeskAppsConfig, e: FlowEffects | undefined, files: CaseFile[]): { work: DeskAppsState; files: CaseFile[] } {
  if (!e) return { work, files };
  const next: DeskAppsState = { ...work };
  if (e.crm.length && apps.crm) {
    const records = { ...(next.crm?.records ?? {}) };
    for (const o of new Set(e.crm.map((c) => c.object))) records[o] = crmNow(apps.crm, next, o).filter((r) => !e.crm.some((c) => c.object === o && c.id === r.id));
    next.crm = { ...(next.crm ?? {}), records };
  }
  if (e.chat.length && next.chat) next.chat = { ...next.chat, posts: next.chat.posts.filter((p) => !e.chat.includes(p.at)) };
  if (Object.keys(e.tickets).length && next.helpdesk) {
    const tickets = { ...next.helpdesk.tickets };
    for (const [id, before] of Object.entries(e.tickets)) {
      if (before) tickets[id] = before;
      else delete tickets[id];
    }
    next.helpdesk = { ...next.helpdesk, tickets };
  }
  return { work: next, files: files.filter((f) => !e.files.includes(f.name)) };
}

export async function runFlow(flow: Flow, source: FlowSource, w: RunWorld, test: boolean, limit?: number): Promise<RunResult> {
  let work: DeskAppsState = { ...w.work };
  let files = [...w.files];
  const effects: FlowEffects = { crm: [], chat: [], tickets: {}, files: [] };
  const events = source.events.slice(0, limit ?? source.events.length).map((e) => ({ ...e }));
  const logs: EventLog[] = events.map((_, i) => ({ n: i + 1, status: 'not run', lines: [] }));
  const live = events.map(() => true);
  let stopped = false;
  const rows: Record<string, string[][]> = {};
  let clock = Date.now();
  const tick = () => ++clock;

  const fail = (i: number, msg: string, stepLabel: string) => {
    logs[i].status = 'error';
    logs[i].error = `${stepLabel}: ${msg}`;
    logs[i].lines.push(`✗ ${stepLabel}: ${msg}`);
    live[i] = false;
    if (flow.errorChannel && !test) {
      const at = tick();
      const who = Object.values(events[i]).filter((v) => String(v).trim()).slice(0, 2).join(', ');
      const post: ChatPost = { channel: flow.errorChannel, text: `⚠️ ${flow.name}: event ${i + 1} (${who}) failed at "${stepLabel}": ${msg}`, at };
      work = { ...work, chat: { posts: [...(work.chat?.posts ?? []), post], received: work.chat?.received ?? [], read: work.chat?.read } };
      effects.chat.push(at);
    } else if (flow.errorChannel) logs[i].lines.push(`→ would post the error in #${flow.errorChannel}`);
    if (flow.onError === 'stop') stopped = true;
  };

  // First the AI steps' answers, one request per AI step for every event that would reach it (replaying only the steps
  // that change nothing: filters, set and earlier AI steps), so the run itself goes event by event like the real tools
  const aiOut: Record<string, (string | undefined)[]> = {};
  const aiErr: Record<string, string> = {};
  {
    const pre = events.map((e) => ({ ...e }));
    const reach = events.map(() => true);
    for (const step of flow.steps) {
      if (step.kind === 'filter') pre.forEach((ev, i) => reach[i] && !passes(ev, step) && (reach[i] = false));
      else if (step.kind === 'set') pre.forEach((ev, i) => reach[i] && (ev[step.field] = textFn(fill(step.value, ev), step.fn)));
      else if (step.kind === 'ai') {
        const idx = pre.map((_, i) => i).filter((i) => reach[i]);
        aiOut[step.id] = [];
        if (!idx.length) continue;
        try {
          const options = step.options.split(',').map((o) => o.trim()).filter(Boolean);
          const outs = await w.ai(step.prompt, idx.map((i) => pre[i]), options);
          idx.forEach((i, k) => {
            aiOut[step.id][i] = String(outs[k] ?? '').trim();
            pre[i][step.output || 'ai_output'] = aiOut[step.id][i]!;
          });
        } catch (err) {
          aiErr[step.id] = err instanceof Error ? err.message : 'the AI step failed';
        }
      }
    }
  }

  // Then each event in turn through every step
  for (const [i, ev] of events.entries()) {
    if (stopped) break;
    for (const [si, step] of flow.steps.entries()) {
      if (!live[i] || stopped) break;
      const label = `${si + 1}. ${STEP_INFO[step.kind].label}`;
      switch (step.kind) {
        case 'ai': {
          if (aiErr[step.id]) {
            fail(i, aiErr[step.id], label);
            break;
          }
          const v = aiOut[step.id]?.[i] ?? '';
          ev[step.output || 'ai_output'] = v;
          logs[i].lines.push(`${label}: ${step.output || 'ai_output'} = “${v.length > 120 ? `${v.slice(0, 120)}…` : v}”`);
          break;
        }
        case 'filter': {
          const ok = passes(ev, step);
          logs[i].lines.push(`${label}: ${step.field} ${step.op}${step.op.startsWith('is ') ? '' : ` “${fill(step.value, ev)}”`} → ${ok ? 'carries on' : 'stops here'}`);
          if (!ok) {
            logs[i].status = 'filtered';
            live[i] = false;
          }
          break;
        }
        case 'set': {
          const v = textFn(fill(step.value, ev), step.fn);
          ev[step.field] = v;
          logs[i].lines.push(`${label}: ${step.field} = “${v}”`);
          break;
        }
        case 'skipif': {
          const v = lower(fill(step.value, ev));
          const hit = !!v && crmNow(w.apps.crm, work, step.object).some((r) => lower(r[step.match] ?? '') === v);
          logs[i].lines.push(`${label}: ${step.object} with ${step.match} “${v}” ${hit ? 'already exists → skipped' : 'not found → carries on'}`);
          if (hit) {
            logs[i].status = 'skipped';
            live[i] = false;
          }
          break;
        }
        case 'crm': {
          const obj = w.apps.crm?.objects.find((o) => o.id === step.object);
          if (!obj) {
            fail(i, `there's no CRM object "${step.object}"`, label);
            break;
          }
          const rec: Record<string, string> = { id: `auto-${flow.id}-${i + 1}` };
          for (const [k, tpl] of Object.entries(step.values)) rec[k] = fill(tpl, ev).trim();
          const missing = (w.required?.[obj.id] ?? []).filter((k) => !rec[k]);
          const badEmail = obj.fields.find((f) => f.type === 'email' && rec[f.key] && !validEmail(rec[f.key]));
          if (missing.length) {
            fail(i, `${obj.label} needs ${missing.map((k) => obj.fields.find((f) => f.key === k)?.label ?? k).join(' and ')}, which is empty`, label);
            break;
          }
          if (badEmail) {
            fail(i, `“${rec[badEmail.key]}” isn't a valid email address`, label);
            break;
          }
          if (!test) {
            work = { ...work, crm: { ...(work.crm ?? {}), records: { ...(work.crm?.records ?? {}), [obj.id]: [...crmNow(w.apps.crm, work, obj.id), rec] } } };
            effects.crm.push({ object: obj.id, id: rec.id });
          }
          logs[i].lines.push(`${label}: ${test ? 'would create' : 'created'} ${obj.label.replace(/s$/, '')} “${rec.name ?? rec.title ?? rec.email ?? rec.id}”`);
          break;
        }
        case 'chat': {
          const ch = w.apps.chat?.channels.find((c) => c.id === step.channel);
          if (!ch) {
            fail(i, `there's no channel "${step.channel}"`, label);
            break;
          }
          const text = fill(step.text, ev).trim();
          if (!text) {
            fail(i, 'the message is empty', label);
            break;
          }
          if (!test) {
            const at = tick();
            work = { ...work, chat: { posts: [...(work.chat?.posts ?? []), { channel: ch.id, text, at }], received: work.chat?.received ?? [], read: work.chat?.read } };
            effects.chat.push(at);
          }
          logs[i].lines.push(`${label}: ${test ? 'would post' : 'posted'} in #${ch.name}: “${text.length > 100 ? `${text.slice(0, 100)}…` : text}”`);
          break;
        }
        case 'ticket': {
          const id = fill(step.ticket, ev).trim();
          const cfg: HelpdeskConfig | undefined = w.apps.helpdesk;
          const t = cfg?.tickets.find((x) => lower(x.id) === lower(id));
          if (!t) {
            fail(i, `there's no ticket “${id}”`, label);
            break;
          }
          const patch: TicketWork = {};
          const status = lower(fill(step.status, ev));
          const priority = lower(fill(step.priority, ev));
          if (status) patch.status = status as TicketWork['status'];
          if (priority) {
            if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
              fail(i, `“${priority}” isn't a priority (low, normal, high or urgent)`, label);
              break;
            }
            patch.priority = priority as TicketWork['priority'];
          }
          const tags = fill(step.tags, ev).split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
          if (!test) {
            const cur = work.helpdesk?.tickets?.[t.id];
            if (!(t.id in effects.tickets)) effects.tickets[t.id] = cur ? { ...cur } : null;
            work = { ...work, helpdesk: { ...(work.helpdesk ?? { tickets: {} }), tickets: { ...(work.helpdesk?.tickets ?? {}), [t.id]: { ...(cur ?? {}), ...patch, ...(tags.length && { tags: [...new Set([...(cur?.tags ?? t.tags ?? []), ...tags])] }) } } } };
          }
          logs[i].lines.push(`${label}: ${test ? 'would set' : 'set'} ticket ${t.id}${patch.priority ? ` priority ${patch.priority}` : ''}${patch.status ? ` status ${patch.status}` : ''}${tags.length ? ` tags ${tags.join(', ')}` : ''}`);
          break;
        }
        case 'row': {
          const name = step.file.trim() || 'automation_output.csv';
          const cols = Object.keys(step.values);
          (rows[name] ??= [cols]).push(cols.map((c) => fill(step.values[c], ev)));
          logs[i].lines.push(`${label}: ${test ? 'would add' : 'added'} a row to ${name}`);
          break;
        }
      }
    }
    if (live[i] && logs[i].status === 'not run') logs[i].status = 'done';
  }
  if (!test)
    for (const [name, grid] of Object.entries(rows)) {
      const file = { name: name.endsWith('.csv') ? name : `${name}.csv`, content: toCsv(grid) };
      files = [...files.filter((f) => f.name !== file.name), file];
      effects.files.push(file.name);
    }
  return { run: { flow: flow.id, source: source.id, at: Date.now(), test, events: logs, stopped }, work, files, effects };
}

// The last real run on a source, by any workflow
export const lastRunOn = (s: AutomationsState | undefined, source: string) => [...(s?.runs ?? [])].reverse().find((r) => !r.test && r.source === source);
