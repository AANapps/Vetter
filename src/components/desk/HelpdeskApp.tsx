import React, { useMemo, useState } from 'react';
import { BarChart3, Bell, Home, LayoutList, Lock, MessageSquare, Plus, Settings, Tag, Users, X } from 'lucide-react';
import { HelpdeskConfig, Ticket, TicketStatus, TicketWork, ticketsNow } from '../../lib/deskApps';
import { recordsToGrid } from '../../lib/deskData';
import { Avatar, DataGrid, DeskCtx, Modal, SearchBox, Select, TableActions, accent, btn, input, personName, primary } from './shared';

const STATUSES: TicketStatus[] = ['new', 'open', 'pending', 'on-hold', 'solved', 'closed'];
const PRIORITIES: Ticket['priority'][] = ['low', 'normal', 'high', 'urgent'];
const STATUS_TINT: Record<TicketStatus, string> = {
  new: 'bg-amber-400 text-amber-950',
  open: 'bg-rose-600 text-white',
  pending: 'bg-sky-600 text-white',
  'on-hold': 'bg-slate-800 text-white',
  solved: 'bg-slate-400 text-white',
  closed: 'bg-slate-300 text-slate-700',
};
const VIEWS = [
  { id: 'mine', label: 'Your unsolved tickets', test: (t: Ticket, me: string) => t.assignee === me && !['solved', 'closed'].includes(t.status) },
  { id: 'unassigned', label: 'Unassigned tickets', test: (t: Ticket) => !t.assignee && !['solved', 'closed'].includes(t.status) },
  { id: 'unsolved', label: 'All unsolved tickets', test: (t: Ticket) => !['solved', 'closed'].includes(t.status) },
  { id: 'new', label: 'New', test: (t: Ticket) => t.status === 'new' },
  { id: 'pending', label: 'Pending', test: (t: Ticket) => t.status === 'pending' },
  { id: 'solved', label: 'Recently solved', test: (t: Ticket) => t.status === 'solved' || t.status === 'closed' },
  { id: 'all', label: 'All tickets', test: () => true },
];

// A Zendesk-style help desk: views down the left, the queue, and a ticket with its conversation, public replies and
// internal notes, macros, and its properties (status, priority, assignee, tags, the company's fields)
export const HelpdeskApp: React.FC<{ ctx: DeskCtx; cfg: HelpdeskConfig }> = ({ ctx, cfg }) => {
  const work = ctx.state.desk?.helpdesk ?? { tickets: {} };
  const tickets = useMemo(() => ticketsNow(cfg, work, ctx.reached), [cfg, work, ctx]);
  const me = ctx.me.name;
  const [view, setView] = useState('unsolved');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const shown = tickets.filter((t) => VIEWS.find((v) => v.id === view)!.test(t, me) && (!q || `${t.id} ${t.subject} ${t.requester} ${(t.tags ?? []).join(' ')}`.toLowerCase().includes(q.toLowerCase())));
  const ticket = tickets.find((t) => t.id === openId);
  const change = (id: string, patch: TicketWork) => {
    const cur = work.tickets?.[id] ?? {};
    ctx.setWork('helpdesk', { ...work, tickets: { ...work.tickets, [id]: { ...cur, ...patch } } });
  };

  return (
    <div className="h-full flex text-[13px]" data-ref="helpdesk" style={accent('#1f73b7', '#edf7ff')}>
      {/* The product's icon rail, as help desks have down the far left */}
      <nav className="w-14 shrink-0 bg-[#03363d] flex flex-col items-center py-2 gap-1 text-white/70" aria-label="Help desk">
        <span className="w-9 h-9 mb-2 rounded-lg bg-[#78a300] grid place-items-center text-[#03363d] font-black text-sm">{(cfg.name ?? 'S')[0]}</span>
        {(
          [
            [Home, 'Home'],
            [LayoutList, 'Views'],
            [Users, 'Customers'],
            [BarChart3, 'Reporting'],
          ] as const
        ).map(([Icon, label]) => (
          <span key={label} title={label} className={`w-10 h-10 rounded-md grid place-items-center ${label === 'Views' ? 'bg-white/15 text-white' : ''}`}>
            <Icon className="w-5 h-5" />
          </span>
        ))}
        <span className="mt-auto w-10 h-10 grid place-items-center" title="Notifications"><Bell className="w-5 h-5" /></span>
        <span className="w-10 h-10 grid place-items-center" title="Settings"><Settings className="w-5 h-5" /></span>
      </nav>
      <aside className="w-56 shrink-0 bg-[#f8f9f9] border-r border-slate-200 flex flex-col">
        <div className="px-3 h-12 flex items-center text-[15px] font-semibold text-[#2f3941] border-b border-slate-200">Views</div>
        <div className="p-2">
          <button onClick={() => setCreating(true)} className={`${primary} w-full justify-center`}>
            <Plus className="w-3.5 h-3.5" />
            New ticket
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-1">
                    {VIEWS.map((v) => (
            <button key={v.id} onClick={() => (setView(v.id), setOpenId(null))} className={`w-full h-8 px-2 rounded flex items-center text-left ${view === v.id ? 'bg-[#e9ebed] font-semibold text-[#2f3941]' : 'text-[#49545c] hover:bg-[#f1f3f4]'}`} data-ref={`view-${v.id}`}>
              <span className="truncate">{v.label}</span>
              <span className="ml-auto text-xs tabular-nums text-[#68737d]">{tickets.filter((t) => v.test(t, me)).length}</span>
            </button>
          ))}
        </nav>
      </aside>
      {ticket ? (
        <TicketView ctx={ctx} cfg={cfg} ticket={ticket} onBack={() => setOpenId(null)} onChange={(p) => change(ticket.id, p)} />
      ) : (
        <section className="flex-1 min-w-0 flex flex-col">
          <div className="h-12 shrink-0 px-4 flex items-center gap-2 border-b border-slate-200">
            <h2 className="text-[15px] font-semibold text-[#2f3941] truncate">{VIEWS.find((v) => v.id === view)!.label}</h2>
            <span className="text-xs text-slate-400">{shown.length} tickets</span>
            <span className="ml-auto flex items-center gap-1.5">
              <div className="w-52">
                <SearchBox value={q} onChange={setQ} placeholder="Search tickets" />
              </div>
              <TableActions ctx={ctx} name="tickets.csv" grid={() => recordsToGrid(shown.map((t) => ({ id: t.id, subject: t.subject, requester: t.requester, status: t.status, priority: t.priority, assignee: t.assignee ?? '', tags: (t.tags ?? []).join('; '), created: t.created, ...t.fields })))} />
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <DataGrid
              rows={shown as unknown as Record<string, unknown>[]}
              onOpen={(r) => setOpenId(String(r.id))}
              empty="No tickets in this view."
              columns={[
                { key: 'status', label: 'Status', width: 90, render: (r) => <StatusPill s={r.status as TicketStatus} /> },
                { key: 'id', label: 'ID', width: 70 },
                { key: 'subject', label: 'Subject', render: (r) => <span className="font-medium text-slate-800">{String(r.subject)}</span> },
                { key: 'requester', label: 'Requester', render: (r) => personName(ctx.cfg, String(r.requester)) },
                { key: 'priority', label: 'Priority', render: (r) => <span className={r.priority === 'urgent' ? 'text-rose-600 font-semibold' : r.priority === 'high' ? 'text-amber-700 font-semibold' : ''}>{String(r.priority)}</span> },
                { key: 'assignee', label: 'Assignee' },
                { key: 'created', label: 'Requested' },
              ]}
            />
          </div>
        </section>
      )}
      {creating && (
        <NewTicket
          ctx={ctx}
          onClose={() => setCreating(false)}
          onCreate={(t) => {
            ctx.setWork('helpdesk', { ...work, created: [...(work.created ?? []), t] });
            setCreating(false);
            setOpenId(t.id);
          }}
          nextId={String(Math.max(1000, ...tickets.map((t) => Number(t.id.replace(/\D/g, '')) || 0)) + 1)}
        />
      )}
    </div>
  );
};

const StatusPill: React.FC<{ s: TicketStatus }> = ({ s }) => <span className={`inline-block px-2 py-px rounded-full text-[10.5px] font-semibold capitalize ${STATUS_TINT[s]}`}>{s}</span>;

const TicketView: React.FC<{ ctx: DeskCtx; cfg: HelpdeskConfig; ticket: ReturnType<typeof ticketsNow>[number]; onBack: () => void; onChange: (p: TicketWork) => void }> = ({ ctx, cfg, ticket: t, onBack, onChange }) => {
  const [mode, setMode] = useState<'public' | 'internal'>('public');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<TicketStatus>(t.status === 'new' ? 'open' : t.status);
  const [tag, setTag] = useState('');
  const agents = cfg.agents?.length ? cfg.agents : [ctx.me.name];
  const submit = () => {
    if (!body.trim()) return ctx.toast('Write a reply or note first.');
    onChange({ added: [...t.added, { body: body.trim(), internal: mode === 'internal', at: Date.now() }], status, assignee: t.assignee || ctx.me.name });
    setBody('');
    ctx.toast(mode === 'internal' ? 'Internal note added' : `Reply sent · ticket set to ${status}`);
  };
  const applyMacro = (name: string) => {
    const m = cfg.macros?.find((x) => x.name === name);
    if (!m) return;
    const first = personName(ctx.cfg, t.requester).split(' ')[0];
    setBody((b) => (b ? `${b}\n\n` : '') + m.body.replace(/\{\{\s*requester\.first_name\s*\}\}/gi, first).replace(/\{\{\s*agent\.name\s*\}\}/gi, ctx.me.name));
    setMode('public');
    if (m.status) setStatus(m.status);
    if (m.tags?.length) onChange({ tags: [...new Set([...(t.tags ?? []), ...m.tags])] });
  };
  const sla = cfg.sla?.[t.priority];
  return (
    <div className="flex-1 min-w-0 flex">
      <aside className="w-60 shrink-0 border-r border-slate-200 p-3 space-y-3 overflow-y-auto bg-white">
        <button onClick={onBack} className="text-xs text-sky-700 hover:underline">
          ← Back to the view
        </button>
        <Prop label="Requester">
          <div className="text-slate-800">{personName(ctx.cfg, t.requester)}</div>
          <div className="text-[11px] text-slate-400 break-all">{t.requester.match(/<([^>]+)>/)?.[1] ?? t.requester}</div>
        </Prop>
        <Prop label="Assignee">
          <Select value={t.assignee ?? ''} onChange={(v) => onChange({ assignee: v })} options={[...new Set([ctx.me.name, ...agents])]} empty="Unassigned" label="Assignee" />
        </Prop>
        <Prop label="Priority">
          <Select value={t.priority} onChange={(v) => onChange({ priority: v as Ticket['priority'] })} options={PRIORITIES} label="Priority" />
          {sla ? <div className="text-[11px] text-slate-500 mt-1">First reply due within {sla}h</div> : null}
        </Prop>
        <Prop label="Tags">
          <div className="flex flex-wrap gap-1 mb-1">
            {(t.tags ?? []).map((g) => (
              <span key={g} className="h-6 pl-1.5 pr-0.5 rounded bg-slate-100 text-[11.5px] flex items-center gap-0.5">
                {g}
                <button onClick={() => onChange({ tags: (t.tags ?? []).filter((x) => x !== g) })} aria-label={`Remove tag ${g}`} className="w-4 h-4 grid place-items-center rounded hover:bg-slate-200">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = tag.trim().toLowerCase().replace(/\s+/g, '_');
              if (v) onChange({ tags: [...new Set([...(t.tags ?? []), v])] });
              setTag('');
            }}
            className="flex gap-1"
          >
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Add a tag" className={input} />
            <button className={btn} aria-label="Add tag">
              <Tag className="w-3.5 h-3.5" />
            </button>
          </form>
        </Prop>
        {Object.entries(t.fields ?? {}).map(([k, v]) => (
          <Prop key={k} label={k}>
            <input value={v} onChange={(e) => onChange({ fields: { ...(t.fields ?? {}), [k]: e.target.value } })} className={input} />
          </Prop>
        ))}
      </aside>
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="px-4 py-2.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <StatusPill s={t.status} />
            <span className="text-xs text-slate-400">#{t.id}</span>
            {t.channel && <span className="text-xs text-slate-400">via {t.channel}</span>}
          </div>
          <h2 className="text-base font-semibold text-slate-900 mt-0.5">{t.subject}</h2>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 select-text">
          {[...t.thread.map((c) => ({ ...c, at: 0 })), ...t.added.map((a) => ({ from: ctx.me.name, body: a.body, internal: a.internal, time: 'Just now', at: a.at }))].map((c, i) => {
            const who = personName(ctx.cfg, c.from);
            return (
              <div key={i} className={`flex gap-2.5 rounded-lg p-3 ${c.internal ? 'bg-amber-50 border border-amber-200' : ''}`}>
                <Avatar name={who} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-slate-900">{who}</span>
                    {c.internal && (
                      <span className="text-[10.5px] font-semibold text-amber-800 flex items-center gap-0.5">
                        <Lock className="w-3 h-3" />
                        Internal note
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-slate-400">{c.time}</span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed text-slate-800 mt-0.5">{c.body}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-slate-200 p-3 space-y-2 shrink-0">
          <div className="flex items-center gap-1">
            {(['public', 'internal'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`h-7 px-2.5 rounded text-xs font-semibold flex items-center gap-1 ${mode === m ? (m === 'internal' ? 'bg-amber-100 text-amber-900' : 'bg-slate-900 text-white') : 'text-slate-500 hover:bg-slate-100'}`} data-ref={`mode-${m}`}>
                {m === 'public' ? <MessageSquare className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {m === 'public' ? 'Public reply' : 'Internal note'}
              </button>
            ))}
            {cfg.macros?.length ? (
              <div className="ml-auto w-48">
                <Select value="" onChange={applyMacro} options={cfg.macros.map((m) => m.name)} empty="Apply macro…" label="Apply macro" />
              </div>
            ) : null}
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder={mode === 'public' ? `Reply to ${personName(ctx.cfg, t.requester)}` : 'Only your team sees this'} className={`w-full px-3 py-2 border rounded-md text-[13px] leading-relaxed focus:outline-none ${mode === 'internal' ? 'bg-amber-50 border-amber-200' : 'border-slate-200 focus:border-sky-500'}`} data-ref="ticket-body" />
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-slate-500">Submit as</span>
            <div className="w-32">
              <Select value={status} onChange={(v) => setStatus(v as TicketStatus)} options={STATUSES.filter((s) => s !== 'new')} label="Status on submit" />
            </div>
            <button onClick={submit} className={primary} data-ref="ticket-submit">
              Submit as {status}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

const Prop: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-[11px] font-semibold text-slate-500 mb-1">{label}</div>
    {children}
  </div>
);

const NewTicket: React.FC<{ ctx: DeskCtx; nextId: string; onClose: () => void; onCreate: (t: Ticket) => void }> = ({ ctx, nextId, onClose, onCreate }) => {
  const [f, setF] = useState({ requester: '', subject: '', body: '', priority: 'normal' as Ticket['priority'] });
  const ok = f.requester.trim() && f.subject.trim() && f.body.trim();
  return (
    <Modal
      title="New ticket"
      onClose={onClose}
      footer={
        <>
          <button className={btn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={primary}
            disabled={!ok}
            onClick={() =>
              onCreate({ id: nextId, subject: f.subject.trim(), requester: f.requester.trim(), status: 'open', priority: f.priority, created: 'Just now', channel: 'web', tags: [], assignee: ctx.me.name, thread: [{ from: ctx.me.name, body: f.body.trim(), time: 'Just now', internal: true }] })
            }
          >
            Create
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-xs text-slate-600">Requester (name and email)</span>
        <input list="desk-contacts-hd" value={f.requester} onChange={(e) => setF({ ...f, requester: e.target.value })} className={input} placeholder="Jane Doe <jane@example.com>" />
        <datalist id="desk-contacts-hd">
          {ctx.cfg.contacts.map((c) => (
            <option key={c.email} value={`${c.name} <${c.email}>`} />
          ))}
        </datalist>
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-slate-600">Subject</span>
        <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} className={input} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-slate-600">Priority</span>
        <Select value={f.priority} onChange={(v) => setF({ ...f, priority: v as Ticket['priority'] })} options={PRIORITIES} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-slate-600">Description (internal)</span>
        <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={4} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md" />
      </label>
    </Modal>
  );
};
