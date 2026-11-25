import React, { useMemo, useState } from 'react';
import { FileUp, KanbanSquare, Plus, Table2, Trash2, X } from 'lucide-react';
import { BoardConfig, BoardItem, DeskBoard, boardItems } from '../../lib/deskApps';
import { fileGrid, gridToRecords, recordsToGrid } from '../../lib/deskData';
import { accent, Avatar, DeskCtx, FilePicker, SearchBox, TableActions, btn, input, primary } from './shared';

const STATUS_COLORS = ['#c4c4c4', '#fdab3d', '#579bfc', '#a25ddc', '#00c875', '#e2445c', '#037f4c', '#ff642e'];
// Each group of a work board in its own colour, as work management tools show them
const GROUP_COLORS = ['#579bfc', '#a25ddc', '#00c875', '#fdab3d', '#e2445c', '#037f4c'];
const statusColor = (b: DeskBoard, s: string) => (/done|complete|closed|resolved/i.test(s) ? '#00c875' : /stuck|blocked/i.test(s) ? '#e2445c' : STATUS_COLORS[Math.max(b.statuses.indexOf(s), 0) % STATUS_COLORS.length]);
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const TYPES = ['Story', 'Task', 'Bug', 'Epic'];

// A monday.com-style board (groups of items in a table, coloured status labels, owners, dates) or a Jira-style board
// (issue keys, types, story points, a kanban of status columns), with an item page for its description and comments.
// Items import from a CSV and leave as a CSV or a copied table
export const BoardApp: React.FC<{ ctx: DeskCtx; cfg: BoardConfig }> = ({ ctx, cfg }) => {
  const work = ctx.state.desk?.board ?? { items: {} };
  const [boardId, setBoardId] = useState(cfg.boards[0]?.id ?? '');
  const b = cfg.boards.find((x) => x.id === boardId) ?? cfg.boards[0];
  const items = useMemo(() => (b ? boardItems(b, work, ctx.reached) : []), [b, work, ctx]);
  const [view, setView] = useState<'table' | 'kanban'>(b?.style === 'jira' ? 'kanban' : 'table');
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  if (!b) return <div className="p-6 text-xs text-slate-500">No boards.</div>;
  const jira = b.style === 'jira';
  const save = (next: BoardItem[]) => ctx.setWork('board', { items: { ...(work.items ?? {}), [b.id]: next } });
  const update = (id: string, patch: Partial<BoardItem>) => save(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const nextId = () => (jira ? `${b.key ?? 'PRJ'}-${Math.max(0, ...items.map((i) => Number(i.id.split('-').pop()) || 0)) + 1}` : `i${Date.now().toString(36)}`);
  const add = (patch: Partial<BoardItem> = {}) => {
    const it: BoardItem = { id: nextId(), title: patch.title ?? 'New item', status: b.statuses[0], group: b.groups?.[0], ...(jira ? { type: 'Task' } : {}), ...patch };
    save([...items, it]);
    setOpenId(it.id);
  };
  const shown = items.filter((i) => !q || `${i.id} ${i.title} ${i.owner ?? ''} ${i.status}`.toLowerCase().includes(q.toLowerCase()));
  const open = items.find((i) => i.id === openId);
  const fields = jira ? ['id', 'title', 'type', 'status', 'owner', 'priority', 'points', 'due'] : ['title', 'group', 'status', 'owner', 'priority', 'due'];
  const importFile = (content: string, name: string) => {
    const g = fileGrid({ name: /\.(csv|tsv)$/i.test(name) ? name : `${name}.csv`, content });
    if (!g || g.length < 2) return ctx.toast('That file has no rows.');
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
    const alias: Record<string, string> = { name: 'title', item: 'title', summary: 'title', task: 'title', assignee: 'owner', person: 'owner', duedate: 'due', date: 'due', storypoints: 'points', issuetype: 'type', key: 'id' };
    const rows = gridToRecords(g).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [alias[norm(k)] ?? norm(k), v])));
    const next = [...items];
    for (const r of rows) {
      if (!r.title) continue;
      const at = r.id ? next.findIndex((i) => i.id === r.id) : -1;
      const it = { ...r, status: b.statuses.find((s) => s.toLowerCase() === (r.status ?? '').toLowerCase()) ?? b.statuses[0] } as BoardItem;
      if (at >= 0) next[at] = { ...next[at], ...it };
      else next.push({ ...it, id: r.id || `i${(Date.now() + next.length).toString(36)}` });
    }
    save(next);
    setImporting(false);
    ctx.toast(`Imported ${rows.length} items from ${name}`);
  };

  const cell = (i: BoardItem, f: string) => {
    if (f === 'status')
      // A coloured label, as monday shows it, with the choice in an invisible select over it
      return (
        <div className="relative h-8 grid place-items-center text-white text-[12px] font-medium" style={{ background: statusColor(b, i.status) }}>
          {i.status}
          <select value={i.status} onChange={(e) => update(i.id, { status: e.target.value })} onClick={(e) => e.stopPropagation()} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" aria-label="Status">
            {b.statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      );
    if (f === 'owner')
      return (
        <select value={i.owner ?? ''} onChange={(e) => update(i.id, { owner: e.target.value })} onClick={(e) => e.stopPropagation()} className="w-full h-8 bg-transparent text-[12px] px-1" aria-label="Owner">
          <option value="">—</option>
          {[...new Set([ctx.me.name, ...(b.people ?? [])])].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      );
    if (f === 'priority' || f === 'type' || f === 'group')
      return (
        <select value={(i as unknown as Record<string, string>)[f] ?? ''} onChange={(e) => update(i.id, { [f]: e.target.value })} onClick={(e) => e.stopPropagation()} className="w-full h-8 bg-transparent text-[12px] px-1" aria-label={f}>
          <option value="">—</option>
          {(f === 'priority' ? PRIORITIES : f === 'type' ? TYPES : b.groups ?? []).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      );
    if (f === 'due') return <input type="date" value={i.due ?? ''} onChange={(e) => update(i.id, { due: e.target.value })} onClick={(e) => e.stopPropagation()} className="w-full h-8 bg-transparent text-[12px] px-1" aria-label="Due date" />;
    if (f === 'id') return <span className="px-2 text-[12px] text-sky-700 font-medium">{i.id}</span>;
    if (f === 'points') return <input value={i.points ?? ''} onChange={(e) => update(i.id, { points: e.target.value })} onClick={(e) => e.stopPropagation()} className="w-full h-8 bg-transparent text-[12px] px-2 text-center" aria-label="Story points" />;
    return <input value={i.title} onChange={(e) => update(i.id, { title: e.target.value })} onClick={(e) => e.stopPropagation()} className="w-full h-8 bg-transparent text-[13px] px-2 outline-none focus:bg-white focus:ring-1 focus:ring-sky-500" aria-label="Item" />;
  };
  const groups = jira ? [null] : b.groups?.length ? b.groups : [null];

  return (
    <div className={`h-full flex text-[13px] ${jira ? 'bg-white text-[#172b4d]' : 'bg-[#eceff8] text-[#323338]'}`} data-ref="board" style={jira ? accent('#0c66e4', '#e9f2ff') : accent('#0073ea', '#cce5ff')}>
      {cfg.boards.length > 1 && (
        <aside className={`w-52 shrink-0 py-2 ${jira ? 'bg-[#f7f8f9] border-r border-[#dfe1e6]' : ''}`}>
          <div className={`px-3 py-1 text-[12px] ${jira ? 'font-semibold text-[#44546f]' : 'font-medium text-[#676879]'}`}>{jira ? 'Projects' : 'Workspace'}</div>
          {cfg.boards.map((x) => (
            <button key={x.id} onClick={() => (setBoardId(x.id), setOpenId(null), setView(x.style === 'jira' ? 'kanban' : 'table'))} className={`w-[calc(100%-12px)] mx-1.5 h-8 px-2.5 rounded flex items-center gap-2 text-left truncate ${x.id === b.id ? (jira ? 'bg-[#e9f2ff] text-[#0c66e4] font-medium' : 'bg-[#cce5ff] font-medium') : 'hover:bg-black/5'}`}>
              {jira ? <KanbanSquare className="w-4 h-4 shrink-0" /> : <Table2 className="w-4 h-4 shrink-0" />}
              {x.name}
            </button>
          ))}
        </aside>
      )}
      <section className={`flex-1 min-w-0 flex flex-col bg-white ${jira ? '' : 'm-2 ml-0 rounded-lg shadow-sm overflow-hidden'} ${cfg.boards.length > 1 ? '' : '!ml-2'}`}>
        <div className="shrink-0 px-5 pt-3 border-b border-[#d0d4e4]">
          {jira && <div className="text-[12px] text-[#626f86] mb-0.5">Projects / {b.name}</div>}
          <h2 className={jira ? 'text-[20px] font-medium' : 'text-[24px] font-semibold'}>{jira ? (view === 'table' ? 'List' : 'Board') : b.name}</h2>
          <div className="flex items-center gap-1 mt-1">
            {(['table', 'kanban'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`h-9 px-3 border-b-2 flex items-center gap-1.5 ${view === v ? 'border-[var(--accent)] text-[var(--accent)] font-medium' : 'border-transparent text-[#676879] hover:text-[#323338]'}`}>
                {v === 'table' ? <Table2 className="w-3.5 h-3.5" /> : <KanbanSquare className="w-3.5 h-3.5" />}
                {v === 'table' ? (jira ? 'List' : 'Main table') : jira ? 'Board' : 'Kanban'}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-1.5 pb-1">
              <div className="w-44">
                <SearchBox value={q} onChange={setQ} />
              </div>
              <button className={btn} onClick={() => setImporting(true)}>
                <FileUp className="w-3.5 h-3.5" />
                Import
              </button>
              <TableActions ctx={ctx} name={`${b.name}.csv`} grid={() => recordsToGrid(shown as unknown as Record<string, unknown>[], [...new Set(['id', ...fields])])} />
              <button className={primary} onClick={() => add()} data-ref="board-new">
                <Plus className="w-3.5 h-3.5" />
                {jira ? 'Create' : 'New item'}
              </button>
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-white">
          {view === 'table' ? (
            <div className="p-4 space-y-6">
              {groups.map((g) => {
                const rows = shown.filter((i) => g === null || (i.group ?? b.groups?.[0]) === g);
                return (
                  <div key={g ?? 'all'}>
                    {g && <div className="font-semibold text-[16px] mb-1.5 flex items-center gap-1.5" style={{ color: GROUP_COLORS[(b.groups ?? []).indexOf(g) % GROUP_COLORS.length] }}>▾ {g}</div>}
                    <table className="min-w-full border-l-[6px] rounded-l" style={{ borderLeftColor: g ? GROUP_COLORS[(b.groups ?? []).indexOf(g) % GROUP_COLORS.length] : '#579bfc' }}>
                      <thead>
                        <tr className="text-[12.5px] text-[#676879]">
                          {fields
                            .filter((f) => f !== 'group')
                            .map((f) => (
                              <th key={f} className={`border border-slate-200 font-normal py-1 ${f === 'title' ? 'text-left px-2 min-w-[240px]' : 'w-32'}`}>
                                {f === 'title' ? (jira ? 'Summary' : 'Item') : f === 'id' ? 'Key' : f === 'points' ? 'Points' : f[0].toUpperCase() + f.slice(1)}
                              </th>
                            ))}
                          <th className="border border-slate-200 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((i) => (
                          <tr key={i.id} className={`hover:bg-[#f5f6f8] ${openId === i.id ? 'bg-[var(--accent-soft)]' : ''}`}>
                            {fields
                              .filter((f) => f !== 'group')
                              .map((f) => (
                                <td key={f} className="border border-slate-200 p-0">
                                  {cell(i, f)}
                                </td>
                              ))}
                            <td className="border border-slate-200 text-center">
                              <button onClick={() => setOpenId(i.id)} className="text-[11px] text-sky-700 hover:underline px-1">
                                Open
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={fields.length + 1} className="border border-slate-200">
                            <button onClick={() => add({ group: g ?? undefined })} className="w-full h-8 text-left px-2 text-slate-400 hover:text-slate-700">
                              + Add item
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex gap-2 p-4 bg-white min-w-max">
              {b.statuses.map((s) => {
                const col = shown.filter((i) => i.status === s);
                return (
                  <div
                    key={s}
                    className={`w-64 shrink-0 rounded-lg flex flex-col ${jira ? 'bg-[#f7f8f9]' : 'bg-[#f5f6f8]'}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => dragging && (update(dragging, { status: s }), setDragging(null))}
                    data-ref={`column-${s}`}
                  >
                    <div className="px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-[#44546f] flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: statusColor(b, s) }} />
                      {s}
                      <span className="text-slate-400">{col.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                      {col.map((i) => (
                        <div key={i.id} draggable onDragStart={() => setDragging(i.id)} onClick={() => setOpenId(i.id)} className="bg-white rounded shadow-[0_1px_1px_rgba(9,30,66,.25),0_0_1px_rgba(9,30,66,.31)] p-3 cursor-pointer hover:bg-[#f7f8f9]">
                          <div className="text-slate-900">{i.title}</div>
                          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                            {jira && <span className="font-medium text-[#44546f]">{i.id}</span>}
                            {i.type && <span className="px-1 rounded bg-slate-100">{i.type}</span>}
                            {i.priority && <span>{i.priority}</span>}
                            {i.points && <span className="ml-auto px-1.5 rounded-full bg-slate-200">{i.points}</span>}
                            {i.owner && (
                              <span className={i.points ? '' : 'ml-auto'} title={i.owner}>
                                <Avatar name={i.owner} size={20} />
                              </span>
                            )}
                          </div>
                          {/* Moving a card without dragging (keyboard, touch) */}
                          <select value={i.status} onClick={(e) => e.stopPropagation()} onChange={(e) => update(i.id, { status: e.target.value })} className="mt-2 w-full h-6 text-[11px] border border-slate-200 rounded" aria-label={`Move ${i.title}`}>
                            {b.statuses.map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      {open && <ItemPanel ctx={ctx} b={b} item={open} onClose={() => setOpenId(null)} onChange={(p) => update(open.id, p)} onDelete={() => (save(items.filter((i) => i.id !== open.id)), setOpenId(null))} />}
      {importing && <FilePicker ctx={ctx} kinds={['csv']} title="Import items from a CSV" pasteTable onClose={() => setImporting(false)} onPick={(f) => importFile(f.content, f.name)} />}
    </div>
  );
};

const ItemPanel: React.FC<{ ctx: DeskCtx; b: DeskBoard; item: BoardItem; onClose: () => void; onChange: (p: Partial<BoardItem>) => void; onDelete: () => void }> = ({ ctx, b, item, onClose, onChange, onDelete }) => {
  const [c, setC] = useState('');
  return (
    <aside className="w-96 shrink-0 border-l border-slate-200 bg-white flex flex-col" aria-label="Item">
      <div className="px-4 py-3 border-b border-slate-200 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {b.style === 'jira' && <div className="text-xs text-sky-700 font-medium">{item.id}</div>}
          <input value={item.title} onChange={(e) => onChange({ title: e.target.value })} className="w-full text-base font-semibold text-slate-900 outline-none rounded focus:ring-2 focus:ring-sky-500/30" aria-label="Title" />
        </div>
        <button onClick={onDelete} aria-label="Delete item" className="w-7 h-7 grid place-items-center rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={onClose} aria-label="Close item" className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-500">Status</span>
            <select value={item.status} onChange={(e) => onChange({ status: e.target.value })} className={input}>
              {b.statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-500">{b.style === 'jira' ? 'Assignee' : 'Owner'}</span>
            <select value={item.owner ?? ''} onChange={(e) => onChange({ owner: e.target.value })} className={input}>
              <option value="">Unassigned</option>
              {[...new Set([ctx.me.name, ...(b.people ?? [])])].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-500">Priority</span>
            <select value={item.priority ?? ''} onChange={(e) => onChange({ priority: e.target.value })} className={input}>
              <option value="">—</option>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-slate-500">Due</span>
            <input type="date" value={item.due ?? ''} onChange={(e) => onChange({ due: e.target.value })} className={input} />
          </label>
          {b.style === 'jira' && (
            <>
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-500">Type</span>
                <select value={item.type ?? ''} onChange={(e) => onChange({ type: e.target.value })} className={input}>
                  {TYPES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-slate-500">Story points</span>
                <input value={item.points ?? ''} onChange={(e) => onChange({ points: e.target.value })} className={input} />
              </label>
            </>
          )}
        </div>
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500">Description</span>
          <textarea value={item.description ?? ''} onChange={(e) => onChange({ description: e.target.value })} rows={6} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md" />
        </label>
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700">{b.style === 'jira' ? 'Comments' : 'Updates'}</div>
          <textarea value={c} onChange={(e) => setC(e.target.value)} rows={3} placeholder="Write an update" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md" data-ref="board-comment" />
          <button className={btn} disabled={!c.trim()} onClick={() => (onChange({ comments: [...(item.comments ?? []), { from: ctx.me.name, text: c.trim(), at: Date.now() }] }), setC(''))}>
            Post
          </button>
          {[...(item.comments ?? [])].reverse().map((m, i) => (
            <div key={i} className="flex gap-2 border-t border-slate-100 pt-2">
              <Avatar name={m.from} size={24} />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800">{m.from}</div>
                <div className="whitespace-pre-wrap text-slate-700">{m.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};
