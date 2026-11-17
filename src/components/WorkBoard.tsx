import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, SquareKanban, Inbox, LayoutList, Plus, Search, Table2, UserRound, X } from 'lucide-react';
import { Assignment, AssessmentTest } from '../types';
import { Pic } from './Pic';
import { KindChip } from './TeamPage';
import { byUrgency, dueLabel, isOverdue, shortDate, statusOf } from '../lib/work';

/**
 * Team work as a work-management board, like monday.com: a main table in coloured groups with status pills and a
 * progress bar per group, a kanban of the same items, and My work, which lists what needs doing by when. The company
 * (everything it sent its team) and the person (everything their teams sent them) see the same board.
 */

export interface BoardRow {
  a: Assignment;
  test: AssessmentTest;
  // The person it's for (the company's board) or the company it's from (the person's board)
  who: string;
  whoPic?: string;
  whoId: string;
}

type View = 'table' | 'kanban' | 'mine';
type GroupBy = 'status' | 'who' | 'kind';

// Status as monday shows it: one colour each, filling the cell
const STATUS = {
  todo: { label: 'Not started', cell: 'bg-slate-300 text-slate-800', bar: 'bg-slate-300' },
  doing: { label: 'Working on it', cell: 'bg-amber-400 text-white', bar: 'bg-amber-400' },
  late: { label: 'Late', cell: 'bg-rose-500 text-white', bar: 'bg-rose-500' },
  done: { label: 'Done', cell: 'bg-emerald-500 text-white', bar: 'bg-emerald-500' },
} as const;
type StatusKey = keyof typeof STATUS;
const statusKey = (a: Assignment): StatusKey => (isOverdue(a) ? 'late' : statusOf(a));

// Each group's colour: the strip down its rows and its title
const GROUP_COLOURS = [
  { strip: 'bg-indigo-500', text: 'text-indigo-600' },
  { strip: 'bg-violet-500', text: 'text-violet-600' },
  { strip: 'bg-emerald-500', text: 'text-emerald-600' },
  { strip: 'bg-amber-500', text: 'text-amber-600' },
  { strip: 'bg-sky-500', text: 'text-sky-600' },
  { strip: 'bg-rose-500', text: 'text-rose-600' },
];

const kindOf = (t: AssessmentTest) => (t.purpose === 'training' ? 'Training' : t.scenario ? 'Job simulation' : 'Test');

export const WorkBoard: React.FC<{
  rows: BoardRow[];
  side: 'company' | 'person';
  // The label for who: "Person" on the company's board, "From" on a person's
  whoLabel: string;
  // Opens the item: the test page for the company, starting it for the person
  onOpen: (row: BoardRow) => void;
  onOpenWho?: (row: BoardRow) => void;
  // The action at the end of a row (Start, Certificate…), for the person
  renderAction?: (row: BoardRow) => React.ReactNode;
  onRemove?: (a: Assignment) => void;
  newLabel?: string;
  onNew?: () => void;
  // What My work is called and what it shows: the person's own to-do, or what needs the company
  defaultView?: View;
}> = ({ rows, side, whoLabel, onOpen, onOpenWho, renderAction, onRemove, newLabel, onNew, defaultView = 'table' }) => {
  const [view, setView] = useState<View>(defaultView);
  const [groupBy, setGroupBy] = useState<GroupBy>(side === 'company' ? 'who' : 'status');
  const [q, setQ] = useState('');
  const [who, setWho] = useState('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({ 'mine-done': true });

  const whoOptions = useMemo(() => [...new Map(rows.map((r) => [r.whoId, r.who])).entries()], [rows]);
  const shown = rows
    .filter((r) => who === 'all' || r.whoId === who)
    .filter((r) => !q.trim() || `${r.test.title} ${r.who} ${r.a.note ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((x, y) => byUrgency(x.a, y.a));

  const toggle = (key: string) => setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  // ---- Groups for the main table
  const groups: { key: string; title: string; rows: BoardRow[] }[] = (() => {
    if (groupBy === 'status') {
      return (['late', 'doing', 'todo', 'done'] as StatusKey[]).map((k) => ({ key: k, title: STATUS[k].label, rows: shown.filter((r) => statusKey(r.a) === k) }));
    }
    if (groupBy === 'kind') {
      return ['Test', 'Job simulation', 'Training'].map((k) => ({ key: k, title: k === 'Test' ? 'Tests' : k === 'Training' ? 'Training' : 'Job simulations', rows: shown.filter((r) => kindOf(r.test) === k) }));
    }
    return whoOptions.map(([id, name]) => ({ key: id, title: name, rows: shown.filter((r) => r.whoId === id) }));
  })().filter((g) => g.rows.length);

  // ---- My work: by when. For the company, what's just come back to review comes first
  const today = new Date().toISOString().slice(0, 10);
  const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const weekEnd = inDays(7 - new Date().getDay());
  const nextWeekEnd = inDays(14 - new Date().getDay());
  const recent = inDays(-7);
  const open = shown.filter((r) => !r.a.completedAt);
  const mine: { key: string; title: string; hint: string; colour: number; rows: BoardRow[] }[] = [
    ...(side === 'company'
      ? [{ key: 'mine-review', title: 'Just finished', hint: 'Scores to look at', colour: 2, rows: shown.filter((r) => r.a.completedAt && r.a.completedAt.slice(0, 10) >= recent) }]
      : []),
    { key: 'mine-late', title: 'Past dates', hint: side === 'company' ? 'Late: worth a nudge' : 'Late', colour: 5, rows: open.filter((r) => isOverdue(r.a)) },
    { key: 'mine-today', title: 'Today', hint: '', colour: 0, rows: open.filter((r) => r.a.dueDate === today) },
    { key: 'mine-week', title: 'This week', hint: '', colour: 1, rows: open.filter((r) => r.a.dueDate && r.a.dueDate > today && r.a.dueDate <= weekEnd) },
    { key: 'mine-next', title: 'Next week', hint: '', colour: 4, rows: open.filter((r) => r.a.dueDate && r.a.dueDate > weekEnd && r.a.dueDate <= nextWeekEnd) },
    { key: 'mine-later', title: 'Later', hint: '', colour: 3, rows: open.filter((r) => r.a.dueDate && r.a.dueDate > nextWeekEnd) },
    { key: 'mine-none', title: 'Without a date', hint: '', colour: 0, rows: open.filter((r) => !r.a.dueDate) },
    ...(side === 'person' ? [{ key: 'mine-done', title: 'Done', hint: '', colour: 2, rows: shown.filter((r) => r.a.completedAt) }] : []),
  ].filter((g) => g.rows.length);

  const statusCell = (r: BoardRow) => {
    const k = statusKey(r.a);
    return <div className={`h-full min-h-[40px] flex items-center justify-center px-2 text-xs font-semibold ${STATUS[k].cell}`}>{STATUS[k].label}</div>;
  };
  const scoreCell = (r: BoardRow) =>
    r.a.completedAt ? (
      <div className="w-full flex items-center gap-2 px-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full ${(r.a.score ?? 0) >= r.test.passingScore ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${r.a.score ?? 0}%` }} />
        </div>
        <span className="w-7 text-right font-mono text-xs font-bold tabular-nums text-slate-900">{r.a.score}</span>
      </div>
    ) : (
      <span className="px-3 text-xs text-slate-300">–</span>
    );
  const dueCell = (r: BoardRow) =>
    r.a.dueDate ? (
      <span className={`px-3 text-xs ${isOverdue(r.a) ? 'text-rose-600 font-semibold' : 'text-slate-600'}`} title={dueLabel(r.a)}>
        {shortDate(r.a.dueDate)}
      </span>
    ) : (
      <span className="px-3 text-xs text-slate-300">–</span>
    );

  // The column layout, the same for the header and every row
  // Written out in full (not built from parts) so Tailwind sees both
  const cols = renderAction
    ? 'grid-cols-[6px_minmax(220px,2.4fr)_minmax(140px,1.2fr)_130px_90px_minmax(110px,1fr)_150px]'
    : 'grid-cols-[6px_minmax(220px,2.4fr)_minmax(140px,1.2fr)_130px_90px_minmax(110px,1fr)_48px]';
  const headerRow = (
    <div className={`grid ${cols} text-[11px] font-semibold text-slate-500 border-b border-slate-200 bg-white`}>
      <span />
      <span className="px-3 py-2">Item</span>
      <span className="px-3 py-2">{whoLabel}</span>
      <span className="px-2 py-2 text-center">Status</span>
      <span className="px-3 py-2">Due</span>
      <span className="px-3 py-2">Score</span>
      <span className="px-3 py-2" />
    </div>
  );
  const row = (r: BoardRow, strip: string) => (
    <div key={r.a.id} className={`group grid ${cols} items-stretch border-b border-slate-100 bg-white hover:bg-slate-50/80`}>
      <span className={strip} />
      <button onClick={() => onOpen(r)} className="px-3 py-2 text-left min-w-0 flex items-center gap-2">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-slate-900 truncate group-hover:text-indigo-700">{r.test.title}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <KindChip test={r.test} />
            <span>~{r.test.estimatedMinutes} min · sent {shortDate(r.a.assignedAt)}</span>
          </span>
        </span>
      </button>
      <button onClick={() => onOpenWho?.(r)} disabled={!onOpenWho} className="px-3 py-2 flex items-center gap-2 min-w-0 text-left border-l border-slate-100">
        {r.whoPic ? <Pic src={r.whoPic} alt="" className="w-6 h-6 rounded-full shrink-0" /> : <UserRound className="w-5 h-5 text-slate-300 shrink-0" />}
        <span className="text-xs text-slate-700 truncate">{r.who}</span>
      </button>
      <div className="border-l border-white">{statusCell(r)}</div>
      <div className="flex items-center border-l border-slate-100">{dueCell(r)}</div>
      <div className="flex items-center border-l border-slate-100">{scoreCell(r)}</div>
      <div className="flex items-center justify-end gap-1 px-2 border-l border-slate-100">
        {renderAction?.(r)}
        {onRemove && (
          <button onClick={() => onRemove(r.a)} title="Take back" aria-label="Take back" className="p-1 rounded text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus:opacity-100">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
  // monday's group summary: a bar split by status
  const summary = (list: BoardRow[]) => (
    <div className="flex h-2 w-28 rounded-full overflow-hidden bg-slate-100" title={(['done', 'doing', 'late', 'todo'] as StatusKey[]).map((k) => `${STATUS[k].label} ${list.filter((r) => statusKey(r.a) === k).length}`).join(' · ')}>
      {(['done', 'doing', 'late', 'todo'] as StatusKey[]).map((k) => {
        const n = list.filter((r) => statusKey(r.a) === k).length;
        return n ? <span key={k} className={STATUS[k].bar} style={{ width: `${(n / list.length) * 100}%` }} /> : null;
      })}
    </div>
  );
  const group = (key: string, title: string, list: BoardRow[], colour: number, hint?: string) => {
    const c = GROUP_COLOURS[colour % GROUP_COLOURS.length];
    const shut = collapsed[key];
    return (
      <section key={key} className="space-y-1.5">
        <button onClick={() => toggle(key)} className="flex items-center gap-2 group/title">
          <ChevronDown className={`w-4 h-4 ${c.text} transition-transform ${shut ? '-rotate-90' : ''}`} />
          <span className={`text-sm font-bold ${c.text}`}>{title}</span>
          <span className="text-xs text-slate-400">
            {list.length} {list.length === 1 ? 'item' : 'items'}
            {hint && ` · ${hint}`}
          </span>
          {shut && <span className="ml-2">{summary(list)}</span>}
        </button>
        {!shut && (
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <div className="min-w-[860px]">
              {headerRow}
              {list.map((r) => row(r, c.strip))}
              <div className={`grid ${cols} bg-slate-50/60`}>
                <span />
                <span className="px-3 py-2 text-[11px] text-slate-400">{list.filter((r) => r.a.completedAt).length} of {list.length} done</span>
                <span />
                <span className="px-2 py-2 flex items-center justify-center">{summary(list)}</span>
                <span />
                <span className="px-3 py-2 text-[11px] text-slate-500">
                  {(() => {
                    const done = list.filter((r) => r.a.completedAt);
                    return done.length ? `avg ${Math.round(done.reduce((s, r) => s + (r.a.score ?? 0), 0) / done.length)}` : '';
                  })()}
                </span>
                <span />
              </div>
            </div>
          </div>
        )}
      </section>
    );
  };

  const views: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'mine', label: 'My work', icon: Inbox },
    { id: 'table', label: 'Main table', icon: Table2 },
    { id: 'kanban', label: 'Kanban', icon: SquareKanban },
  ];

  return (
    <div className="space-y-4">
      {/* Views, like monday's tabs, then the toolbar */}
      <div className="border-b border-slate-200 flex items-end gap-1 overflow-x-auto">
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            aria-pressed={view === v.id}
            className={`shrink-0 px-3 py-2 -mb-px border-b-2 text-sm font-semibold inline-flex items-center gap-1.5 ${
              view === v.id ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <v.icon className="w-4 h-4" />
            {v.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onNew && (
          <button onClick={onNew} className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            {newLabel}
          </button>
        )}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 w-44 pl-8 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        {whoOptions.length > 1 && (
          <select value={who} onChange={(e) => setWho(e.target.value)} aria-label={whoLabel} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
            <option value="all">{side === 'company' ? 'Everyone' : 'Every team'}</option>
            {whoOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
        {view === 'table' && (
          <label className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-500 inline-flex items-center gap-2">
            <LayoutList className="w-4 h-4" />
            Group by
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)} className="bg-transparent text-slate-800 font-semibold focus:outline-none">
              <option value="status">Status</option>
              <option value="who">{whoLabel}</option>
              <option value="kind">Type</option>
            </select>
          </label>
        )}
        <span className="ml-auto text-xs text-slate-400">
          {shown.length} {shown.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3">
          <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">{side === 'company' ? 'Nothing sent yet. Send your team a test to start the board.' : 'Nothing yet. Work your teams send you will show up here.'}</p>
          {onNew && (
            <button onClick={onNew} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold">
              {newLabel}
            </button>
          )}
        </div>
      ) : view === 'table' ? (
        <div className="space-y-6">{groups.length ? groups.map((g, i) => group(`t-${g.key}`, g.title, g.rows, i)) : <p className="text-sm text-slate-500">Nothing matches.</p>}</div>
      ) : view === 'mine' ? (
        <div className="space-y-6">
          {mine.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 inline-flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Nothing to do. You're all caught up.
            </p>
          ) : (
            mine.map((g) => group(g.key, g.title, g.rows, g.colour, g.hint))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
          {(['todo', 'doing', 'late', 'done'] as StatusKey[]).map((k) => {
            const list = shown.filter((r) => statusKey(r.a) === k);
            return (
              <div key={k} className="rounded-xl bg-slate-100/70 overflow-hidden">
                <div className={`px-3 py-2 text-xs font-bold flex items-center justify-between ${STATUS[k].cell}`}>
                  {STATUS[k].label}
                  <span className="opacity-80">{list.length}</span>
                </div>
                <ul className="p-2 space-y-2 min-h-16">
                  {list.map((r) => (
                    <li key={r.a.id} className="group p-3 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-2">
                      <button onClick={() => onOpen(r)} className="block text-left text-sm font-semibold text-slate-900 hover:text-indigo-700 leading-snug">
                        {r.test.title}
                      </button>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <button onClick={() => onOpenWho?.(r)} disabled={!onOpenWho} className="flex items-center gap-1.5 min-w-0">
                          {r.whoPic ? <Pic src={r.whoPic} alt="" className="w-5 h-5 rounded-full" /> : <UserRound className="w-4 h-4 text-slate-300" />}
                          <span className="truncate">{r.who}</span>
                        </button>
                        {r.a.completedAt ? (
                          <span className="font-mono font-bold text-slate-900">{r.a.score}</span>
                        ) : (
                          r.a.dueDate && <span className={isOverdue(r.a) ? 'text-rose-600 font-semibold' : ''}>{shortDate(r.a.dueDate)}</span>
                        )}
                      </div>
                      {renderAction && <div>{renderAction(r)}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
