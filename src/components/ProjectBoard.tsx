import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  PhoneCall,
  StickyNote,
  Users as UsersIcon,
  Send,
  Loader2,
  Sparkles,
  ArrowRightLeft,
  Undo2,
  EyeOff,
  GanttChart,
  Plus,
  Search,
  SquareKanban,
  Table2,
  Trash2,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import {
  Project,
  ProjectAutomation,
  ProjectBuiltIn,
  ProjectColumn,
  ProjectColumnType,
  ProjectGroup,
  ProjectTask,
  ProjectTaskPriority,
  ProjectTaskStatus,
  ProjectView,
} from '../types';
import { Pic } from './Pic';
import { shortDate } from '../lib/work';
import { PRIORITY_LABEL, STATUS_LABEL, describeAutomation, isLate, overdueChanges, recipes, runAutomations, withLog } from '../lib/projectAutomations';
import { CalendarView, ChartBar, ChartView, TimelineView } from './ProjectViews';
import { boardForAi, convertLead, money, numberOf } from '../lib/crm';
import { BUILT_IN_REFS, FORMULA_FUNCTIONS, checkFormula, formulaResult, showFormula } from '../lib/boardFormula';
import { CrmAction, applyActions, describeAction } from '../lib/crmActions';
import { aiFetch } from '../lib/aiRequest';
import { BrandSparkle } from './Brand';

/**
 * One of a company's projects on its team board, like a monday.com board. Tasks sit in coloured groups with built-in
 * columns (owner, status, priority, due date, timeline) and any the company adds (text, number, labels, date, people,
 * checkbox, link). It's seen through views the company adds (table, kanban by any field, calendar, timeline, chart),
 * and automations change tasks for it ("when status changes to Done, move it to Completed"). Select tasks to move,
 * change or delete them together; every change is kept in the task's activity.
 */

export interface BoardPerson {
  uid: string;
  name: string;
  pic?: string;
}

export const TASK_STATUS: Record<ProjectTaskStatus, { label: string; cell: string; bar: string }> = {
  todo: { label: STATUS_LABEL.todo, cell: 'bg-slate-300 text-slate-800', bar: 'bg-slate-300' },
  working: { label: STATUS_LABEL.working, cell: 'bg-amber-400 text-white', bar: 'bg-amber-400' },
  stuck: { label: STATUS_LABEL.stuck, cell: 'bg-rose-500 text-white', bar: 'bg-rose-500' },
  done: { label: STATUS_LABEL.done, cell: 'bg-emerald-500 text-white', bar: 'bg-emerald-500' },
};
const STATUS_ORDER: ProjectTaskStatus[] = ['todo', 'working', 'stuck', 'done'];

const PRIORITY: Record<ProjectTaskPriority, { label: string; cell: string }> = {
  low: { label: PRIORITY_LABEL.low, cell: 'bg-sky-400 text-white' },
  medium: { label: PRIORITY_LABEL.medium, cell: 'bg-indigo-400 text-white' },
  high: { label: PRIORITY_LABEL.high, cell: 'bg-violet-700 text-white' },
  critical: { label: PRIORITY_LABEL.critical, cell: 'bg-slate-800 text-white' },
};
const PRIORITY_ORDER: ProjectTaskPriority[] = ['critical', 'high', 'medium', 'low'];

export const GROUP_COLOURS = [
  { strip: 'bg-indigo-500', text: 'text-indigo-600' },
  { strip: 'bg-emerald-500', text: 'text-emerald-600' },
  { strip: 'bg-violet-500', text: 'text-violet-600' },
  { strip: 'bg-amber-500', text: 'text-amber-600' },
  { strip: 'bg-sky-500', text: 'text-sky-600' },
  { strip: 'bg-rose-500', text: 'text-rose-600' },
];

// A label column's colours, monday style
const LABEL_COLOURS = ['bg-emerald-500 text-white', 'bg-amber-400 text-white', 'bg-rose-500 text-white', 'bg-sky-500 text-white', 'bg-violet-600 text-white', 'bg-pink-500 text-white', 'bg-teal-500 text-white', 'bg-slate-500 text-white'];

const COLUMN_TYPES: { type: ProjectColumnType; label: string; hint: string; title: string }[] = [
  { type: 'text', label: 'Text', hint: 'Notes, references, anything short', title: 'Text' },
  { type: 'number', label: 'Numbers', hint: 'Budget, hours, estimates, with totals', title: 'Numbers' },
  { type: 'label', label: 'Label', hint: 'Your own coloured options, like a status', title: 'Label' },
  { type: 'date', label: 'Date', hint: 'Another date to track', title: 'Date' },
  { type: 'people', label: 'People', hint: 'Reviewers, approvers, helpers', title: 'People' },
  { type: 'checkbox', label: 'Checkbox', hint: 'Yes or no, ticked off', title: 'Check' },
  { type: 'link', label: 'Link', hint: 'A web address to open', title: 'Link' },
  { type: 'email', label: 'Email', hint: 'An address to email in one click', title: 'Email' },
  { type: 'phone', label: 'Phone', hint: 'A number to call in one click', title: 'Phone' },
  { type: 'money', label: 'Money', hint: 'Values and budgets, totalled', title: 'Value' },
  { type: 'formula', label: 'Formula', hint: 'Worked out from other columns', title: 'Formula' },
  { type: 'connect', label: 'Connect boards', hint: 'Link items on another board', title: 'Linked' },
];

const BUILT_IN: { id: ProjectBuiltIn; title: string; width: string }[] = [
  { id: 'owner', title: 'Owner', width: '120px' },
  { id: 'status', title: 'Status', width: '140px' },
  { id: 'priority', title: 'Priority', width: '120px' },
  { id: 'due', title: 'Due', width: '124px' },
  { id: 'timeline', title: 'Timeline', width: '170px' },
];
const TYPE_WIDTH: Record<ProjectColumnType, string> = { text: '170px', number: '110px', label: '140px', date: '124px', people: '120px', checkbox: '84px', link: '170px', email: '190px', phone: '140px', money: '120px', formula: '130px', connect: '180px' };

const VIEW_TYPES: { type: ProjectView['type']; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { type: 'table', label: 'Table', icon: Table2, hint: 'Groups and columns' },
  { type: 'kanban', label: 'Kanban', icon: SquareKanban, hint: 'Cards in columns by a field' },
  { type: 'calendar', label: 'Calendar', icon: CalendarDays, hint: 'Due dates on a month' },
  { type: 'timeline', label: 'Timeline', icon: GanttChart, hint: 'Start to due, as bars' },
  { type: 'chart', label: 'Chart', icon: BarChart3, hint: 'A dashboard of the figures' },
];
const DEFAULT_VIEWS: ProjectView[] = [
  { id: 'main', name: 'Main table', type: 'table' },
  { id: 'kanban', name: 'Kanban', type: 'kanban', by: 'status' },
];

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// A new project, as monday starts a board: two groups, the two views, and the one automation everyone wants
export const newProject = (businessId: string, name: string): Project => {
  const todo = { id: newId('grp'), name: 'To do', colour: 0 };
  const done = { id: newId('grp'), name: 'Completed', colour: 1 };
  return {
    id: newId('prj'),
    businessId,
    name,
    groups: [todo, done],
    views: DEFAULT_VIEWS,
    automations: [{ id: newId('auto'), when: 'status', status: 'done', then: 'move', toGroupId: done.id }],
    createdAt: new Date().toISOString(),
  };
};

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // Private windows can refuse storage; the choice then lasts for the visit
    }
  },
};

// ---------- Small pieces

// Owners' faces, overlapping, or an empty person
const Faces: React.FC<{ people: BoardPerson[] }> = ({ people }) =>
  people.length ? (
    <span className="flex -space-x-1.5">
      {people.slice(0, 3).map((p) =>
        p.pic ? (
          <Pic key={p.uid} src={p.pic} alt={p.name} className="w-6 h-6 rounded-full ring-2 ring-white" />
        ) : (
          <span key={p.uid} title={p.name} className="w-6 h-6 rounded-full ring-2 ring-white bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center">
            {p.name.slice(0, 1).toUpperCase()}
          </span>
        )
      )}
      {people.length > 3 && <span className="w-6 h-6 rounded-full ring-2 ring-white bg-slate-200 text-[10px] font-bold flex items-center justify-center">+{people.length - 3}</span>}
    </span>
  ) : (
    <UserRound className="w-5 h-5 text-slate-300" />
  );

// Something that floats over the board from a button, fixed so the table's scrolling doesn't cut it off
const Floating: React.FC<{ anchor: React.RefObject<HTMLElement | null>; onClose: () => void; width?: number; children: React.ReactNode }> = ({ anchor, onClose, width = 224, children }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const pop = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const r = anchor.current?.getBoundingClientRect();
    if (r) setPos({ top: Math.min(r.bottom + 4, window.innerHeight - 280), left: Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) });
  }, [anchor, width]);
  useEffect(() => {
    const close = (e: Event) => {
      if (pop.current?.contains(e.target as Node) || anchor.current?.contains(e.target as Node)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', key, true);
    };
  }, [anchor, onClose]);
  if (!pos) return null;
  return (
    <div ref={pop} style={{ top: pos.top, left: pos.left, width }} className="fixed z-50 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl p-1">
      {children}
    </div>
  );
};

// Picking people: a list with ticks
const PeoplePicker: React.FC<{ people: BoardPerson[]; value: string[]; onChange: (uids: string[]) => void; compact?: boolean; label?: string }> = ({ people, value, onChange, compact, label = 'Owners' }) => {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const chosen = people.filter((p) => value.includes(p.uid));
  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        className={`flex items-center gap-2 min-w-0 ${compact ? '' : 'w-full h-full px-3 py-2 justify-center hover:bg-slate-50'}`}
      >
        <Faces people={chosen} />
        {!compact && chosen.length === 1 && <span className="text-xs text-slate-700 truncate">{chosen[0].name}</span>}
      </button>
      {open && (
        <Floating anchor={btn} onClose={() => setOpen(false)}>
          {people.length === 0 && <p className="p-2 text-xs text-slate-500">No one on the team yet.</p>}
          {people.map((p) => {
            const on = value.includes(p.uid);
            return (
              <button
                key={p.uid}
                type="button"
                onClick={() => onChange(on ? value.filter((u) => u !== p.uid) : [...value, p.uid])}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm ${on ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-800'}`}
              >
                <Faces people={[p]} />
                <span className="flex-1 truncate">{p.name}</span>
                {on && <Check className="w-3.5 h-3.5 text-indigo-600" />}
              </button>
            );
          })}
        </Floating>
      )}
    </>
  );
};

// A status, priority or label cell: the colour fills it, and it's a plain select underneath
function ColourSelect<K extends string>({ value, options, onChange, empty, label }: { value?: K; options: Record<K, { label: string; cell: string }>; onChange: (v: K | undefined) => void; empty?: string; label: string }) {
  return (
    <div className={`relative h-full min-h-[40px] flex items-center justify-center text-xs font-semibold ${value && options[value] ? options[value].cell : 'bg-slate-50 text-slate-300'}`}>
      <span className="pointer-events-none px-2 truncate">{value && options[value] ? options[value].label : '–'}</span>
      <select aria-label={label} value={value ?? ''} onChange={(e) => onChange((e.target.value || undefined) as K | undefined)} className="absolute inset-0 opacity-0 cursor-pointer w-full">
        {empty !== undefined && <option value="">{empty}</option>}
        {(Object.keys(options) as K[]).map((k) => (
          <option key={k} value={k}>
            {options[k].label}
          </option>
        ))}
      </select>
    </div>
  );
}

const labelOptions = (col: ProjectColumn) => Object.fromEntries((col.options ?? []).map((o) => [o.id, { label: o.label, cell: LABEL_COLOURS[o.colour % LABEL_COLOURS.length] }]));

// Text that saves when it loses focus or on Enter
const InlineText: React.FC<{ value: string; onSave: (v: string) => void; className?: string; placeholder?: string; label: string; type?: string; allowEmpty?: boolean }> = ({ value, onSave, className = '', placeholder, label, type = 'text', allowEmpty = true }) => {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      type={type}
      value={v}
      aria-label={label}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v === value) return;
        if (!allowEmpty && !v.trim()) return setV(value);
        onSave(v);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setV(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={`bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${className}`}
    />
  );
};

// A task's value in an added column, as a cell or a field
// Other boards' items, for connect columns: what there is to link to, and opening one
interface Linking {
  columns: ProjectColumn[];
  boards: Project[];
  allTasks: ProjectTask[];
  onOpenItem?: (projectId: string, taskId: string) => void;
}

// Linking items on another board: the ones linked as chips, and a searchable list to add more
const ConnectCell: React.FC<{ col: ProjectColumn; value: string[]; link: Linking; onSet: (ids: string[] | undefined) => void; field?: boolean }> = ({ col, value, link, onSet, field }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const btn = useRef<HTMLButtonElement>(null);
  const board = link.boards.find((b) => b.id === col.boardId);
  const items = link.allTasks.filter((t) => t.projectId === col.boardId);
  const linked = value.map((id) => items.find((t) => t.id === id)).filter((t): t is ProjectTask => !!t);
  return (
    <div className={`flex items-center gap-1 min-w-0 ${field ? 'flex-wrap min-h-9' : 'w-full h-full px-2 overflow-hidden'}`}>
      {linked.map((t) => (
        <button
          key={t.id}
          onClick={() => link.onOpenItem?.(t.projectId, t.id)}
          title={`Open ${t.title}`}
          className="shrink-0 max-w-[120px] truncate px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[11px] font-medium text-indigo-800 hover:border-indigo-300"
        >
          {t.title}
        </button>
      ))}
      <button ref={btn} onClick={() => setOpen((o) => !o)} aria-label={`Link ${col.title}`} className="shrink-0 p-0.5 rounded text-slate-300 hover:text-indigo-700">
        <Plus className="w-3.5 h-3.5" />
      </button>
      {open && (
        <Floating anchor={btn} onClose={() => setOpen(false)} width={260}>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${board?.name ?? 'items'}`} className="w-full h-8 px-2 mb-1 rounded-lg border border-slate-200 text-xs" />
          {!board && <p className="p-2 text-xs text-slate-500">The linked board is gone.</p>}
          {items
            .filter((t) => !q.trim() || t.title.toLowerCase().includes(q.trim().toLowerCase()))
            .slice(0, 40)
            .map((t) => {
              const on = value.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => onSet(on ? value.filter((x) => x !== t.id) : [...value, t.id])}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm ${on ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-slate-50 text-slate-800'}`}
                >
                  <span className="flex-1 truncate">{t.title}</span>
                  {on && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </button>
              );
            })}
          {board && items.length === 0 && <p className="p-2 text-xs text-slate-500">Nothing on {board.name} yet.</p>}
        </Floating>
      )}
    </div>
  );
};

const ValueCell: React.FC<{ col: ProjectColumn; task: ProjectTask; people: BoardPerson[]; link: Linking; onSet: (v: string | number | boolean | string[] | undefined) => void; field?: boolean }> = ({ col, task, people, link, onSet, field }) => {
  const v = task.values?.[col.id];
  const pad = field ? 'h-9 px-3 rounded-lg border border-slate-200' : 'h-full px-3';
  switch (col.type) {
    case 'email':
    case 'phone':
      return (
        <span className="flex items-center w-full h-full">
          <InlineText label={col.title} type={col.type === 'email' ? 'email' : 'tel'} value={typeof v === 'string' ? v : ''} onSave={(x) => onSet(x.trim() || undefined)} className={`flex-1 min-w-0 text-xs text-slate-800 ${pad}`} />
          {typeof v === 'string' && v && (
            <a href={col.type === 'email' ? `mailto:${v}` : `tel:${v.replace(/\s+/g, '')}`} aria-label={col.type === 'email' ? 'Send an email' : 'Call'} className="px-1.5 text-slate-400 hover:text-indigo-700">
              {col.type === 'email' ? <Mail className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            </a>
          )}
        </span>
      );
    case 'money':
      return (
        <span className={`flex items-center w-full ${field ? '' : 'h-full'}`}>
          <span className="pl-2 text-xs text-slate-400">{col.currency ?? ''}</span>
          <InlineText label={col.title} type="number" value={typeof v === 'number' ? String(v) : ''} onSave={(x) => onSet(x === '' || isNaN(Number(x)) ? undefined : Number(x))} className={`w-full text-sm text-right tabular-nums text-slate-800 ${pad}`} />
        </span>
      );
    case 'formula': {
      const r = formulaResult(col.formula ?? '', task, { columns: link.columns, allTasks: link.allTasks, names: Object.fromEntries(people.map((p) => [p.uid, p.name.replace(/ \(you\)$/, '')])) });
      const shown = showFormula(r, col.currency);
      return (
        <span
          className={`w-full flex items-center ${typeof r.value === 'number' ? 'justify-end tabular-nums' : 'justify-start'} text-sm truncate ${r.error ? 'text-rose-600 font-semibold' : r.value === true ? 'text-emerald-600 font-semibold' : 'text-slate-700'} bg-slate-50/60 ${pad}`}
          title={r.error ? `${r.error}: ${col.formula}` : col.formula}
        >
          {shown || <span className="text-slate-300">–</span>}
        </span>
      );
    }
    case 'connect':
      return <ConnectCell col={col} value={Array.isArray(v) ? v : []} link={link} field={field} onSet={(ids) => onSet(ids?.length ? ids : undefined)} />;
    case 'text':
      return <InlineText label={col.title} value={typeof v === 'string' ? v : ''} onSave={(x) => onSet(x.trim() || undefined)} className={`w-full text-sm text-slate-800 ${pad}`} />;
    case 'number':
      return <InlineText label={col.title} type="number" value={typeof v === 'number' ? String(v) : ''} onSave={(x) => onSet(x === '' || isNaN(Number(x)) ? undefined : Number(x))} className={`w-full text-sm text-right tabular-nums text-slate-800 ${pad}`} />;
    case 'date':
      return <input type="date" aria-label={col.title} value={typeof v === 'string' ? v : ''} onChange={(e) => onSet(e.target.value || undefined)} className={`w-full text-xs bg-transparent focus:outline-none ${v ? 'text-slate-700' : 'text-slate-300'} ${field ? pad : 'px-2 py-2'}`} />;
    case 'checkbox':
      return (
        <label className={`flex items-center cursor-pointer ${field ? 'h-9 justify-start' : 'h-full w-full justify-center'}`}>
          <input type="checkbox" aria-label={col.title} checked={v === true} onChange={(e) => onSet(e.target.checked || undefined)} className="w-4 h-4 accent-emerald-600" />
        </label>
      );
    case 'link':
      return (
        <span className="flex items-center w-full h-full">
          <InlineText label={col.title} value={typeof v === 'string' ? v : ''} placeholder={field ? 'https://' : ''} onSave={(x) => onSet(x.trim() || undefined)} className={`flex-1 min-w-0 text-xs text-indigo-700 ${pad}`} />
          {typeof v === 'string' && /^https?:\/\//.test(v) && (
            <a href={v} target="_blank" rel="noreferrer" aria-label="Open link" className="px-1.5 text-slate-400 hover:text-indigo-700">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </span>
      );
    case 'people':
      return (
        <span className={`flex ${field ? 'h-9 items-center' : 'h-full w-full'}`}>
          <PeoplePicker label={col.title} people={people} value={Array.isArray(v) ? v : []} onChange={(uids) => onSet(uids.length ? uids : undefined)} compact={field} />
        </span>
      );
    case 'label':
      return (
        <div className={field ? 'h-9 rounded-lg overflow-hidden' : 'h-full w-full'}>
          <ColourSelect label={col.title} value={typeof v === 'string' ? v : undefined} options={labelOptions(col)} empty="None" onChange={(x) => onSet(x)} />
        </div>
      );
  }
};

// The built-in timeline: start to due, filled as far as today
const TimelineCell: React.FC<{ task: ProjectTask; onSet: (c: Partial<ProjectTask>) => void }> = ({ task, onSet }) => {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const { startDate: s, dueDate: d } = task;
  const pct = s && d && s <= d ? Math.max(0, Math.min(100, ((Date.now() - new Date(s).getTime()) / (new Date(d).getTime() - new Date(s).getTime() + 86400000)) * 100)) : 0;
  return (
    <>
      <button ref={btn} onClick={() => setOpen((o) => !o)} aria-label="Timeline" className="w-full h-full px-3 flex items-center">
        {s && d ? (
          <span className="relative w-full h-5 rounded-full bg-slate-700 overflow-hidden text-[10px] font-semibold text-white flex items-center justify-center">
            <span className={`absolute inset-y-0 left-0 ${task.status === 'done' ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${task.status === 'done' ? 100 : pct}%` }} />
            <span className="relative">
              {shortDate(s)} – {shortDate(d)}
            </span>
          </span>
        ) : (
          <span className="w-full h-5 rounded-full bg-slate-100 text-[10px] text-slate-400 flex items-center justify-center">Set dates</span>
        )}
      </button>
      {open && (
        <Floating anchor={btn} onClose={() => setOpen(false)} width={220}>
          <div className="p-2 space-y-2 text-xs">
            <label className="block space-y-1">
              <span className="font-semibold text-slate-500">Start</span>
              <input type="date" value={s ?? ''} onChange={(e) => onSet({ startDate: e.target.value || undefined })} className="w-full h-8 px-2 rounded-lg border border-slate-200" />
            </label>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-500">Due</span>
              <input type="date" value={d ?? ''} onChange={(e) => onSet({ dueDate: e.target.value || undefined })} className="w-full h-8 px-2 rounded-lg border border-slate-200" />
            </label>
          </div>
        </Floating>
      )}
    </>
  );
};

// A menu button: a label and what it opens
const MenuButton: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; active?: boolean; width?: number; children: (close: () => void) => React.ReactNode }> = ({ icon: Icon, label, active, width, children }) => {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={btn}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`h-9 px-3 rounded-lg border text-sm inline-flex items-center gap-1.5 ${active ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
      {open && (
        <Floating anchor={btn} onClose={() => setOpen(false)} width={width}>
          {children(() => setOpen(false))}
        </Floating>
      )}
    </>
  );
};

// ---------- Automations: the rules as sentences, switched on and off, with recipes and a builder
const AutomationsDialog: React.FC<{ project: Project; people: BoardPerson[]; names: Record<string, string>; onSave: (automations: ProjectAutomation[]) => void; onClose: () => void }> = ({ project, people, names, onSave, onClose }) => {
  const list = project.automations ?? [];
  const [draft, setDraft] = useState<Omit<ProjectAutomation, 'id'>>({ when: 'status', status: 'done', then: 'move', toGroupId: project.groups.at(-1)?.id });
  const checkboxes = (project.columns ?? []).filter((c) => c.type === 'checkbox');
  const labelCols = (project.columns ?? []).filter((c) => c.type === 'label');
  const same = (a: Omit<ProjectAutomation, 'id'>, b: Omit<ProjectAutomation, 'id'>) =>
    a.when === b.when && a.status === b.status && a.groupId === b.groupId && a.columnId === b.columnId && a.optionId === b.optionId && a.then === b.then && a.toGroupId === b.toGroupId && a.toStatus === b.toStatus && a.toPriority === b.toPriority && a.toUid === b.toUid && a.toColumnId === b.toColumnId && a.toOptionId === b.toOptionId;
  const offered = recipes(project).filter((r) => !list.some((a) => same(a, r)));
  const add = (a: Omit<ProjectAutomation, 'id'>) => onSave([...list, { ...a, id: newId('auto') }]);
  const ready =
    (draft.then === 'move' && draft.toGroupId) ||
    (draft.then === 'setStatus' && draft.toStatus) ||
    (draft.then === 'setPriority' && draft.toPriority) ||
    (draft.then === 'assign' && draft.toUid) ||
    (draft.then === 'setLabel' && draft.toColumnId && draft.toOptionId);
  const sel = 'h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800';
  const fake = { ...draft, id: 'draft' } as ProjectAutomation;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Automations" onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Automations
            </h2>
            <p className="text-xs text-slate-500">Let the board do the routine work. Each rule runs when a task changes, and never off another rule.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700">On this board · {list.length}</h3>
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">None yet. Pick one below.</p>
          ) : (
            <ul className="border border-slate-200 rounded-xl divide-y divide-slate-100">
              {list.map((a) => (
                <li key={a.id} className="px-3 py-2.5 flex items-center gap-3">
                  <Zap className={`w-4 h-4 shrink-0 ${a.off ? 'text-slate-300' : 'text-amber-500'}`} />
                  <span className={`flex-1 text-sm ${a.off ? 'text-slate-400' : 'text-slate-800'}`}>{describeAutomation(a, project, names)}</span>
                  <button
                    role="switch"
                    aria-checked={!a.off}
                    aria-label={a.off ? 'Turn on' : 'Turn off'}
                    onClick={() => onSave(list.map((x) => (x.id === a.id ? { ...x, off: !x.off } : x)))}
                    className={`w-9 h-5 rounded-full relative transition-colors ${a.off ? 'bg-slate-300' : 'bg-emerald-500'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${a.off ? 'left-0.5' : 'left-[18px]'}`} />
                  </button>
                  <button onClick={() => onSave(list.filter((x) => x.id !== a.id))} aria-label="Delete automation" className="p-1 rounded text-slate-400 hover:text-rose-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {offered.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700">Popular</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {offered.map((r, i) => (
                <button key={i} onClick={() => add(r)} className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left text-sm text-slate-800 flex items-start gap-2">
                  <Plus className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  {describeAutomation({ ...r, id: '' } as ProjectAutomation, project, names)}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700">Make your own</h3>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">When</span>
              <select
                className={sel}
                value={draft.when}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    when: e.target.value as ProjectAutomation['when'],
                    status: e.target.value === 'status' ? 'done' : undefined,
                    groupId: undefined,
                    optionId: undefined,
                    columnId: e.target.value === 'checked' ? checkboxes[0]?.id : e.target.value === 'label' ? labelCols[0]?.id : undefined,
                  })
                }
              >
                {labelCols.length > 0 && <option value="label">a label column changes</option>}
                <option value="status">status changes to</option>
                <option value="created">a task is created</option>
                <option value="assigned">someone is assigned</option>
                <option value="overdue">the due date passes and it isn't done</option>
                {checkboxes.length > 0 && <option value="checked">a checkbox is ticked</option>}
              </select>
              {draft.when === 'status' && (
                <select className={sel} value={draft.status ?? ''} onChange={(e) => setDraft({ ...draft, status: (e.target.value || undefined) as ProjectTaskStatus | undefined })}>
                  <option value="">anything</option>
                  {STATUS_ORDER.map((k) => (
                    <option key={k} value={k}>
                      {STATUS_LABEL[k]}
                    </option>
                  ))}
                </select>
              )}
              {draft.when === 'created' && (
                <select className={sel} value={draft.groupId ?? ''} onChange={(e) => setDraft({ ...draft, groupId: e.target.value || undefined })}>
                  <option value="">in any group</option>
                  {project.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      in {g.name}
                    </option>
                  ))}
                </select>
              )}
              {draft.when === 'label' && (
                <>
                  <select className={sel} value={draft.columnId ?? ''} onChange={(e) => setDraft({ ...draft, columnId: e.target.value, optionId: undefined })}>
                    {labelCols.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  <span>to</span>
                  <select className={sel} value={draft.optionId ?? ''} onChange={(e) => setDraft({ ...draft, optionId: e.target.value || undefined })}>
                    <option value="">anything</option>
                    {labelCols.find((c) => c.id === draft.columnId)?.options?.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {draft.when === 'checked' && (
                <select className={sel} value={draft.columnId ?? ''} onChange={(e) => setDraft({ ...draft, columnId: e.target.value })}>
                  {checkboxes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold">then</span>
              <select className={sel} value={draft.then} onChange={(e) => setDraft({ ...draft, then: e.target.value as ProjectAutomation['then'], toGroupId: undefined, toStatus: undefined, toPriority: undefined, toUid: undefined, toColumnId: undefined, toOptionId: undefined })}>
                <option value="move">move it to</option>
                <option value="setStatus">set status to</option>
                <option value="setPriority">set priority to</option>
                <option value="assign">assign</option>
                {labelCols.length > 0 && <option value="setLabel">set a label to</option>}
              </select>
              {draft.then === 'setLabel' && (
                <>
                  <select className={sel} value={draft.toColumnId ?? ''} onChange={(e) => setDraft({ ...draft, toColumnId: e.target.value || undefined, toOptionId: undefined })}>
                    <option value="">pick a column</option>
                    {labelCols.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                  {draft.toColumnId && (
                    <select className={sel} value={draft.toOptionId ?? ''} onChange={(e) => setDraft({ ...draft, toOptionId: e.target.value || undefined })}>
                      <option value="">pick a label</option>
                      {labelCols.find((c) => c.id === draft.toColumnId)?.options?.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
              {draft.then === 'move' && (
                <select className={sel} value={draft.toGroupId ?? ''} onChange={(e) => setDraft({ ...draft, toGroupId: e.target.value || undefined })}>
                  <option value="">pick a group</option>
                  {project.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              )}
              {draft.then === 'setStatus' && (
                <select className={sel} value={draft.toStatus ?? ''} onChange={(e) => setDraft({ ...draft, toStatus: (e.target.value || undefined) as ProjectTaskStatus })}>
                  <option value="">pick a status</option>
                  {STATUS_ORDER.map((k) => (
                    <option key={k} value={k}>
                      {STATUS_LABEL[k]}
                    </option>
                  ))}
                </select>
              )}
              {draft.then === 'setPriority' && (
                <select className={sel} value={draft.toPriority ?? ''} onChange={(e) => setDraft({ ...draft, toPriority: (e.target.value || undefined) as ProjectTaskPriority })}>
                  <option value="">pick a priority</option>
                  {PRIORITY_ORDER.map((k) => (
                    <option key={k} value={k}>
                      {PRIORITY_LABEL[k]}
                    </option>
                  ))}
                </select>
              )}
              {draft.then === 'assign' && (
                <select className={sel} value={draft.toUid ?? ''} onChange={(e) => setDraft({ ...draft, toUid: e.target.value || undefined })}>
                  <option value="">pick someone</option>
                  {people.map((p) => (
                    <option key={p.uid} value={p.uid}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">{ready ? describeAutomation(fake, project, names) : 'Finish the sentence to add it.'}</span>
              <button disabled={!ready} onClick={() => add(draft)} className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold">
                Add automation
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

// ---------- The task opened on its own: every field, notes and its activity
const ACTIVITY: Record<NonNullable<ProjectTask['activities']>[number]['type'], { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  call: { label: 'Call', icon: PhoneCall, tone: 'bg-emerald-100 text-emerald-700' },
  email: { label: 'Email', icon: Mail, tone: 'bg-sky-100 text-sky-700' },
  meeting: { label: 'Meeting', icon: UsersIcon, tone: 'bg-violet-100 text-violet-700' },
  note: { label: 'Note', icon: StickyNote, tone: 'bg-amber-100 text-amber-700' },
};

const TaskPanel: React.FC<{
  task: ProjectTask;
  project: Project;
  people: BoardPerson[];
  link: Linking;
  me: BoardPerson;
  onChange: (change: Partial<ProjectTask>) => void;
  onSetValue: (colId: string, v: unknown) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
  // Leads: make it a contact, an account and a deal
  onConvert?: () => void;
  // Built-in columns the board hides, left out here too
  hidden?: ProjectBuiltIn[];
}> = ({ task, project, people, link, me, onChange, onSetValue, onDuplicate, onDelete, onClose, onConvert, hidden = [] }) => {
  const [notes, setNotes] = useState(task.notes ?? '');
  useEffect(() => setNotes(task.notes ?? ''), [task.id]);
  const [tab, setTab] = useState<'details' | 'activity'>('details');
  const [kind, setKind] = useState<NonNullable<ProjectTask['activities']>[number]['type']>('call');
  const [entry, setEntry] = useState('');
  const logActivity = () => {
    if (!entry.trim()) return;
    onChange({ activities: [...(task.activities ?? []), { id: `act-${Date.now().toString(36)}`, type: kind, text: entry.trim(), at: new Date().toISOString(), by: me.name }] });
    setEntry('');
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const field = 'w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={onClose}>
      <aside role="dialog" aria-label={task.title} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto space-y-5">
        <div className="flex items-start gap-3">
          <InlineText label={project.itemName ?? 'Task'} value={task.title} allowEmpty={false} onSave={(v) => onChange({ title: v.trim() })} className="flex-1 text-lg font-bold text-slate-900 rounded-lg px-2 -mx-2 py-1 hover:bg-slate-50" />
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        {onConvert && (
          <button onClick={onConvert} className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Convert to contact, account and deal
          </button>
        )}
        <div className="flex gap-1 border-b border-slate-200">
          {(
            [
              ['details', 'Details'],
              ['activity', `Emails & activities${task.activities?.length ? ` · ${task.activities.length}` : ''}`],
            ] as const
          ).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} aria-pressed={tab === k} className={`px-3 py-2 -mb-px border-b-2 text-sm font-semibold ${tab === k ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'activity' ? (
          <section className="space-y-4">
            {/* Log a call, email, meeting or note, as monday CRM's activity timeline */}
            <div className="p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex gap-1.5">
                {(Object.keys(ACTIVITY) as (keyof typeof ACTIVITY)[]).map((k) => {
                  const A = ACTIVITY[k];
                  return (
                    <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`h-8 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 ${kind === k ? A.tone : 'text-slate-500 hover:bg-slate-50'}`}>
                      <A.icon className="w-3.5 h-3.5" />
                      {A.label}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && logActivity()}
                rows={3}
                placeholder={kind === 'call' ? 'What was said on the call, and what happens next' : kind === 'email' ? 'What the email said' : kind === 'meeting' ? 'Who met, what was agreed' : 'A note'}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center justify-between gap-2">
                {(() => {
                  const email = (project.columns ?? []).find((c) => c.type === 'email' && typeof task.values?.[c.id] === 'string');
                  return email ? (
                    <a href={`mailto:${task.values![email.id]}`} className="text-xs font-semibold text-indigo-700 hover:underline inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      Email {task.values![email.id] as string}
                    </a>
                  ) : (
                    <span />
                  );
                })()}
                <button onClick={logActivity} disabled={!entry.trim()} className="h-8 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold">
                  Log {ACTIVITY[kind].label.toLowerCase()}
                </button>
              </div>
            </div>
            {task.activities?.length ? (
              <ol className="space-y-3">
                {[...task.activities].reverse().map((a) => {
                  const A = ACTIVITY[a.type];
                  return (
                    <li key={a.id} className="flex gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${A.tone}`}>
                        <A.icon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-800">{a.by}</span> logged a {A.label.toLowerCase()} · {new Date(a.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{a.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-xs text-slate-400">No calls, emails, meetings or notes logged yet.</p>
            )}
          </section>
        ) : (
        <>
        <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-3 items-center text-sm">
          <dt className="text-xs font-semibold text-slate-500">Group</dt>
          <dd>
            <select value={task.groupId} onChange={(e) => onChange({ groupId: e.target.value })} className={field}>
              {project.groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </dd>
          <dt className="text-xs font-semibold text-slate-500">Owners</dt>
          <dd className="h-9 flex items-center">
            <PeoplePicker people={people} value={task.ownerUids} onChange={(ownerUids) => onChange({ ownerUids })} compact />
            <span className="ml-2 text-xs text-slate-500 truncate">{people.filter((p) => task.ownerUids.includes(p.uid)).map((p) => p.name).join(', ') || 'No one yet'}</span>
          </dd>
          {!hidden.includes('status') && (
            <>
              <dt className="text-xs font-semibold text-slate-500">Status</dt>
              <dd className="h-9 rounded-lg overflow-hidden">
                <ColourSelect label="Status" value={task.status} options={TASK_STATUS} onChange={(status) => status && onChange({ status })} />
              </dd>
            </>
          )}
          {!hidden.includes('priority') && (
            <>
              <dt className="text-xs font-semibold text-slate-500">Priority</dt>
              <dd className="h-9 rounded-lg overflow-hidden">
                <ColourSelect label="Priority" value={task.priority} options={PRIORITY} empty="None" onChange={(priority) => onChange({ priority })} />
              </dd>
            </>
          )}
          {!hidden.includes('timeline') && (
            <>
              <dt className="text-xs font-semibold text-slate-500">Start</dt>
              <dd>
                <input type="date" value={task.startDate ?? ''} onChange={(e) => onChange({ startDate: e.target.value || undefined })} className={field} />
              </dd>
            </>
          )}
          {!(hidden.includes('due') && hidden.includes('timeline')) && (
            <>
              <dt className="text-xs font-semibold text-slate-500">{project.kind === 'leads' ? 'Follow up' : 'Due'}</dt>
              <dd>
                <input type="date" value={task.dueDate ?? ''} onChange={(e) => onChange({ dueDate: e.target.value || undefined })} className={field} />
              </dd>
            </>
          )}
          {(project.columns ?? []).map((c) => (
            <React.Fragment key={c.id}>
              <dt className="text-xs font-semibold text-slate-500 truncate">{c.title}</dt>
              <dd>
                <ValueCell field col={c} task={task} people={people} link={link} onSet={(v) => onSetValue(c.id, v)} />
              </dd>
            </React.Fragment>
          ))}
        </dl>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-500">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (task.notes ?? '') && onChange({ notes: notes.trim() || undefined })}
            rows={6}
            placeholder="Details, links, what done looks like…"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500">Activity</h3>
          {task.log?.length ? (
            <ol className="space-y-1.5 border-l-2 border-slate-100 pl-3">
              {[...task.log].reverse().map((l, i) => (
                <li key={i} className="text-xs text-slate-600">
                  <span className={`font-semibold ${l.by === 'Automation' ? 'text-amber-600' : 'text-slate-800'}`}>{l.by}</span> {l.text}
                  <span className="block text-[10px] text-slate-400">{new Date(l.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-slate-400">Changes to this {(project.itemName ?? 'task').toLowerCase()} will show here.</p>
          )}
        </section>
        </>
        )}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
          <span>Added {shortDate(task.createdAt)}</span>
          <span className="flex items-center gap-3">
            <button onClick={onDuplicate} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:underline">
              <Copy className="w-3.5 h-3.5" />
              Duplicate
            </button>
            <button onClick={onDelete} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </span>
        </div>
      </aside>
    </div>
  );
};

// ---------- Ask AI: questions about the board and how to run the process, answered from the board's data
const SUGGESTIONS: Record<string, string[]> = {
  deals: ['What is my pipeline worth, and the forecast?', 'Which deals are expected to close this month?', 'Which deals have had no activity lately?', 'How should I set up my sales stages?'],
  leads: ['Which leads should I follow up first?', 'Where do most of my leads come from?', 'How do I qualify a lead well?', 'What automations would help with leads?'],
  contacts: ['Who are my customers?', 'Which contacts have no account linked?', 'How should I keep contacts tidy?'],
  accounts: ['Which accounts have the most deals?', 'Which accounts have no contacts?', 'How should I organise accounts?'],
  project: ['What is late or stuck?', 'Who has the most open work?', 'What should we do this week?', 'Which automations would save us time?'],
};

type AiMessage = { role: 'user' | 'assistant'; text: string; actions?: CrmAction[]; picked?: boolean[]; result?: { done: number; skipped: string[]; undone?: boolean } };

// If anything in the panel goes wrong, it says so in the panel instead of taking the page down with it
class PanelGuard extends React.Component<{ onClose: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error('Ask AI failed', err);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={this.props.onClose}>
        <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-base font-bold text-slate-900">Ask AI ran into a problem</h2>
          <p className="text-sm text-slate-600">Nothing on your boards was changed. Close this and try again.</p>
          <button onClick={this.props.onClose} className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-semibold">
            Close
          </button>
        </aside>
      </div>
    );
  }
}

const AskAi: React.FC<{
  project: Project;
  text: () => string;
  others: () => string[];
  boards: Project[];
  company?: string;
  onApply: (actions: CrmAction[]) => { done: number; skipped: string[]; undo: () => void };
  onClose: () => void;
}> = ({ project, text, others, boards, company, onApply, onClose }) => {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  // Undo for each applied set of changes, by the message they came with
  const undos = useRef(new Map<number, () => void>());
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [messages, busy]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);
  const ask = async (q: string) => {
    if (!q.trim() || busy) return;
    const next = [...messages, { role: 'user' as const, text: q.trim() }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    try {
      let board = '';
      let rest: string[] = [];
      try {
        board = text();
        rest = others();
      } catch (err) {
        console.error('Reading the boards for Ask AI failed', err);
        board = `Board: ${project.name}`;
      }
      const res = await aiFetch('/api/crm-assistant', {
        company,
        board,
        boards: boards.filter((b) => b.id !== project.id).map((b) => b.name),
        others: rest,
        messages: next.map(({ role, text: t }) => ({ role, text: t })),
      });
      const body = (await res.json().catch(() => ({}))) as { reply?: string; actions?: CrmAction[]; error?: string };
      if (res.status === 402) setError('Your AI credit has run out. Top it up from the home chat to keep asking.');
      else if (!res.ok || typeof body.reply !== 'string') setError(body.error === 'not-configured' ? 'Praxa’s AI isn’t switched on here yet.' : body.error || 'The AI couldn’t answer. Try again.');
      else {
        const actions = Array.isArray(body.actions) ? body.actions.filter((a) => a && typeof a.op === 'string') : [];
        setMessages([...next, { role: 'assistant', text: body.reply || 'Here’s what I’d change.', ...(actions.length && { actions, picked: actions.map(() => true) }) }]);
      }
    } catch {
      setError('The AI couldn’t be reached. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose}>
      <aside role="dialog" aria-label="Ask AI" onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0">
            <BrandSparkle className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-slate-900">Ask AI</h2>
            <p className="text-xs text-slate-500">About {project.name}: its figures, who's doing what, and how to run it well.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500">Try asking</p>
              {(SUGGESTIONS[project.kind ?? 'project'] ?? SUGGESTIONS.project).map((q) => (
                <button key={q} onClick={() => ask(q)} className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left text-sm text-slate-800">
                  {q}
                </button>
              ))}
            </div>
          )}
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <p key={i} className="ml-8 px-3 py-2 rounded-2xl rounded-br-md bg-indigo-600 text-white text-sm whitespace-pre-wrap">
                {m.text}
              </p>
            ) : (
              <div key={i} className="mr-4 space-y-2">
                <p className="px-3 py-2 rounded-2xl rounded-bl-md bg-slate-100 text-slate-800 text-sm whitespace-pre-wrap">{m.text}</p>
                {/* Changes it suggests: ticked to apply, then undoable */}
                {m.actions && (
                  <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2">
                    <div className="text-xs font-bold text-slate-800">Suggested changes</div>
                    <ul className="space-y-1.5">
                      {m.actions.map((a, j) => (
                        <li key={j}>
                          <label className={`flex items-start gap-2 text-xs ${m.result ? '' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              disabled={!!m.result}
                              checked={!!m.picked?.[j]}
                              onChange={() => setMessages((all) => all.map((x, k) => (k === i ? { ...x, picked: x.picked?.map((p, n) => (n === j ? !p : p)) } : x)))}
                              className="mt-0.5 accent-indigo-600"
                            />
                            <span>
                              <span className="block text-slate-800">{describeAction(a)}</span>
                              {a.why && <span className="block text-[11px] text-slate-500">{a.why}</span>}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    {!m.result ? (
                      <button
                        disabled={!m.picked?.some(Boolean)}
                        onClick={() => {
                          const chosen = m.actions!.filter((_, j) => m.picked?.[j]);
                          const r = onApply(chosen);
                          undos.current.set(i, r.undo);
                          setMessages((all) => all.map((x, k) => (k === i ? { ...x, result: { done: r.done, skipped: r.skipped } } : x)));
                        }}
                        className="w-full h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold"
                      >
                        Apply {m.picked?.filter(Boolean).length ?? 0} {m.picked?.filter(Boolean).length === 1 ? 'change' : 'changes'}
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-emerald-700">
                          {m.result.undone ? 'Undone: everything is back as it was.' : `Done: ${m.result.done} ${m.result.done === 1 ? 'change' : 'changes'} made.`}
                        </p>
                        {m.result.skipped.length > 0 && !m.result.undone && (
                          <ul className="text-[11px] text-amber-800 space-y-0.5">
                            {m.result.skipped.map((s, n) => (
                              <li key={n}>Skipped: {s}</li>
                            ))}
                          </ul>
                        )}
                        {!m.result.undone && (
                          <button
                            onClick={() => {
                              undos.current.get(i)?.();
                              setMessages((all) => all.map((x, k) => (k === i && x.result ? { ...x, result: { ...x.result, undone: true } } : x)));
                            }}
                            className="h-8 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            Undo
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          )}
          {busy && (
            <p className="text-xs text-slate-500 inline-flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Reading the board…
            </p>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div ref={end} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="p-3 border-t border-slate-200 flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={2}
            placeholder="Ask about this board or your process"
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button type="submit" disabled={!input.trim() || busy} aria-label="Ask" className="h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white flex items-center justify-center">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </aside>
    </div>
  );
};

// ---------- The board

type Sort = 'manual' | 'due' | 'priority' | 'status' | 'name';

export const ProjectBoard: React.FC<{
  project: Project;
  tasks: ProjectTask[];
  people: BoardPerson[];
  // Whoever is making changes, for each task's activity
  me: BoardPerson;
  onSaveProject: (project: Project) => void;
  onDeleteProject: () => void;
  onSaveTask: (task: ProjectTask) => void;
  onDeleteTask: (task: ProjectTask) => void;
  // Every board and item the company has: for connect columns, converting leads and Ask AI
  boards?: Project[];
  allTasks?: ProjectTask[];
  onOpenItem?: (projectId: string, taskId: string) => void;
  // An item to open as the board opens (from a link on another board)
  openTaskId?: string;
  company?: string;
}> = ({ project, tasks, people, me, onSaveProject, onDeleteProject, onSaveTask, onDeleteTask, boards = [project], allTasks = tasks, onOpenItem, openTaskId, company }) => {
  const views = project.views?.length ? project.views : DEFAULT_VIEWS;
  const viewKey = `vetter.projectView.${project.id}`;
  const [viewId, setViewIdState] = useState(() => store.get(viewKey) ?? views[0].id);
  const view = views.find((v) => v.id === viewId) ?? views[0];
  const setViewId = (id: string) => {
    setViewIdState(id);
    store.set(viewKey, id);
  };
  const [renamingView, setRenamingView] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | ProjectTaskStatus>('all');
  const [sort, setSort] = useState<Sort>('manual');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(openTaskId ?? null);
  useEffect(() => {
    if (openTaskId) setOpenId(openTaskId);
  }, [openTaskId]);
  const [asking, setAsking] = useState(false);
  const [adding, setAdding] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [automating, setAutomating] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [addingCol, setAddingCol] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // The formula column the Columns dialog opens on (one just added, or Edit formula)
  const [formulaFocus, setFormulaFocus] = useState<string | undefined>();

  const names = useMemo(() => Object.fromEntries(people.map((p) => [p.uid, p.name.replace(/ \(you\)$/, '')])), [people]);
  const columns = project.columns ?? [];
  const hidden = project.hidden ?? ['timeline'];
  const noun = project.itemName ?? 'Task';
  const link: Linking = { columns, boards, allTasks, onOpenItem: (pid, tid) => (pid === project.id ? setOpenId(tid) : onOpenItem?.(pid, tid)) };
  const sumOf = (list: ProjectTask[], col: ProjectColumn) => list.reduce((n, t) => n + (numberOf(t, col, columns) ?? 0), 0);
  const measures = columns.filter((c) => c.type === 'money' || c.type === 'number' || c.type === 'formula');
  const builtIns = BUILT_IN.filter((b) => !hidden.includes(b.id));

  // Dates that passed while the board was shut: run the overdue automations once
  useEffect(() => {
    overdueChanges(project, tasks, names).forEach(onSaveTask);
    // Once per project opened, and when tasks are added or removed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, tasks.length, project.automations?.length]);

  // ---- Changing tasks: every change is logged, then the automations run on it
  const describe = (t: ProjectTask, c: Partial<ProjectTask>): string[] => {
    const out: string[] = [];
    if (c.title !== undefined && c.title !== t.title) out.push(`renamed it "${c.title}"`);
    if (c.status && c.status !== t.status) out.push(`set status to ${STATUS_LABEL[c.status]}`);
    if ('priority' in c && c.priority !== t.priority) out.push(c.priority ? `set priority to ${PRIORITY_LABEL[c.priority]}` : 'cleared the priority');
    if (c.groupId && c.groupId !== t.groupId) out.push(`moved it to ${project.groups.find((g) => g.id === c.groupId)?.name}`);
    if ('dueDate' in c && c.dueDate !== t.dueDate) out.push(c.dueDate ? `set the due date to ${shortDate(c.dueDate)}` : 'cleared the due date');
    if ('startDate' in c && c.startDate !== t.startDate) out.push(c.startDate ? `set the start to ${shortDate(c.startDate)}` : 'cleared the start');
    if (c.ownerUids) {
      const added = c.ownerUids.filter((u) => !t.ownerUids.includes(u)).map((u) => names[u] ?? 'someone');
      const gone = t.ownerUids.filter((u) => !c.ownerUids!.includes(u)).map((u) => names[u] ?? 'someone');
      if (added.length) out.push(`assigned ${added.join(', ')}`);
      if (gone.length) out.push(`took off ${gone.join(', ')}`);
    }
    if ('notes' in c && c.notes !== t.notes) out.push('changed the notes');
    if (c.values) {
      for (const col of columns) {
        const a = t.values?.[col.id];
        const b = c.values[col.id];
        if (JSON.stringify(a) === JSON.stringify(b)) continue;
        const shown =
          b === undefined
            ? 'cleared'
            : col.type === 'label'
              ? col.options?.find((o) => o.id === b)?.label
              : col.type === 'checkbox'
                ? 'ticked'
                : col.type === 'people'
                  ? (b as string[]).map((u) => names[u] ?? 'someone').join(', ')
                  : col.type === 'connect'
                    ? (b as string[]).map((i) => allTasks.find((x) => x.id === i)?.title ?? 'an item').join(', ')
                    : col.type === 'money'
                      ? money(b as number, col.currency)
                      : String(b);
        out.push(b === undefined ? `cleared ${col.title}` : col.type === 'checkbox' ? `ticked ${col.title}` : `set ${col.title} to ${shown}`);
      }
    }
    return out;
  };
  const clean = (t: ProjectTask) => {
    const next = { ...t };
    (Object.keys(next) as (keyof ProjectTask)[]).forEach((k) => next[k] === undefined && delete next[k]);
    if (next.values) {
      const vals = Object.fromEntries(Object.entries(next.values).filter(([, v]) => v !== undefined && v !== false));
      if (Object.keys(vals).length) next.values = vals;
      else delete next.values;
    }
    return next;
  };
  const change = (t: ProjectTask, c: Partial<ProjectTask>) => {
    const said = describe(t, c);
    let next: ProjectTask = { ...t, ...c, updatedAt: new Date().toISOString() };
    if (said.length) next = withLog(next, me.name, said.join(', '));
    onSaveTask(clean(runAutomations(project, t, next, names)));
  };
  const setValue = (t: ProjectTask, colId: string, v: unknown) => {
    change(t, { values: { ...(t.values ?? {}), [colId]: v as never } });
    // A link is two-way, as monday's connected boards: the other board's item links back when it has a column for this board
    const col = columns.find((c) => c.id === colId);
    if (col?.type !== 'connect') return;
    const other = boards.find((b) => b.id === col.boardId);
    const back = other?.columns?.find((c) => c.type === 'connect' && c.boardId === project.id);
    if (!other || !back) return;
    const before = (t.values?.[colId] as string[] | undefined) ?? [];
    const after = (v as string[] | undefined) ?? [];
    for (const otherId of new Set([...before, ...after])) {
      const item = allTasks.find((x) => x.id === otherId);
      if (!item) continue;
      const has = ((item.values?.[back.id] as string[] | undefined) ?? []).filter((x) => x !== t.id);
      const next = after.includes(otherId) ? [...has, t.id] : has;
      onSaveTask(clean({ ...item, values: { ...(item.values ?? {}), [back.id]: (next.length ? next : undefined) as never } }));
    }
  };
  const add = (fields: Partial<ProjectTask>) => {
    const group = project.groups.find((g) => g.id === fields.groupId) ?? project.groups[0];
    if (!group) return;
    const id = newId('task');
    const t: ProjectTask = withLog(
      {
        title: `New ${noun.toLowerCase()}`,
        status: 'todo',
        ownerUids: owner !== 'all' && owner !== 'none' ? [owner] : [],
        ...fields,
        id,
        businessId: project.businessId,
        projectId: project.id,
        groupId: group.id,
        createdAt: new Date().toISOString(),
      },
      me.name,
      'created it'
    );
    onSaveTask(clean(runAutomations(project, undefined, t, names)));
    return id;
  };
  const duplicate = (t: ProjectTask) =>
    add({ ...t, id: undefined, title: `${t.title} (copy)`, log: undefined, createdAt: new Date().toISOString(), updatedAt: undefined } as Partial<ProjectTask>);

  const saveProject = (c: Partial<Project>) => onSaveProject({ ...project, ...c });
  const saveGroups = (groups: ProjectGroup[]) => saveProject({ groups });

  // ---- Columns
  const addColumn = (type: ProjectColumnType, boardId?: string) => {
    const def = COLUMN_TYPES.find((c) => c.type === type)!;
    const col: ProjectColumn = {
      id: newId('col'),
      title: type === 'connect' ? boards.find((b) => b.id === boardId)?.name ?? def.title : def.title,
      type,
      ...(type === 'connect' && { boardId }),
      ...(type === 'money' && { currency: '£' }),
      ...(type === 'formula' && { formula: '' }),
      ...(type === 'label' && {
        options: [
          { id: newId('opt'), label: 'Yes', colour: 0 },
          { id: newId('opt'), label: 'Maybe', colour: 1 },
          { id: newId('opt'), label: 'No', colour: 2 },
        ],
      }),
    };
    saveProject({ columns: [...columns, col] });
    return col;
  };
  const toggleBuiltIn = (id: ProjectBuiltIn) => saveProject({ hidden: hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id] });

  // ---- Fields a kanban or chart can be by
  type Lane = { key: string; label: string; cell: string; bar: string };
  const fields: { id: string; label: string; lanes: Lane[]; of: (t: ProjectTask) => string; set?: (key: string) => Partial<ProjectTask> | ((t: ProjectTask) => Partial<ProjectTask>) }[] = [
    { id: 'status', label: 'Status', lanes: STATUS_ORDER.map((k) => ({ key: k, label: STATUS_LABEL[k], cell: TASK_STATUS[k].cell, bar: TASK_STATUS[k].bar })), of: (t) => t.status, set: (k) => ({ status: k as ProjectTaskStatus }) },
    {
      id: 'priority',
      label: 'Priority',
      lanes: [...PRIORITY_ORDER.map((k) => ({ key: k, label: PRIORITY_LABEL[k], cell: PRIORITY[k].cell, bar: PRIORITY[k].cell.split(' ')[0] })), { key: '', label: 'No priority', cell: 'bg-slate-200 text-slate-700', bar: 'bg-slate-300' }],
      of: (t) => t.priority ?? '',
      set: (k) => ({ priority: (k || undefined) as ProjectTaskPriority | undefined }),
    },
    { id: 'group', label: 'Group', lanes: project.groups.map((g) => ({ key: g.id, label: g.name, cell: `${GROUP_COLOURS[g.colour % GROUP_COLOURS.length].strip} text-white`, bar: GROUP_COLOURS[g.colour % GROUP_COLOURS.length].strip })), of: (t) => t.groupId, set: (k) => ({ groupId: k }) },
    {
      id: 'owner',
      label: 'Owner',
      lanes: [...people.map((p, i) => ({ key: p.uid, label: p.name, cell: `${GROUP_COLOURS[i % GROUP_COLOURS.length].strip} text-white`, bar: GROUP_COLOURS[i % GROUP_COLOURS.length].strip })), { key: '', label: 'No owner', cell: 'bg-slate-200 text-slate-700', bar: 'bg-slate-300' }],
      of: (t) => t.ownerUids[0] ?? '',
    },
    ...columns
      .filter((c) => c.type === 'label')
      .map((c) => ({
        id: c.id,
        label: c.title,
        lanes: [...(c.options ?? []).map((o) => ({ key: o.id, label: o.label, cell: LABEL_COLOURS[o.colour % LABEL_COLOURS.length], bar: LABEL_COLOURS[o.colour % LABEL_COLOURS.length].split(' ')[0] })), { key: '', label: 'None', cell: 'bg-slate-200 text-slate-700', bar: 'bg-slate-300' }],
        of: (t: ProjectTask) => (typeof t.values?.[c.id] === 'string' ? (t.values![c.id] as string) : ''),
        set: (k: string) => (t: ProjectTask) => ({ values: { ...(t.values ?? {}), [c.id]: (k || undefined) as never } }),
      })),
  ];
  const fieldOf = (id?: string) => fields.find((f) => f.id === id) ?? fields[0];

  // ---- What's shown
  const term = q.trim().toLowerCase();
  const prioRank = (t: ProjectTask) => (t.priority ? PRIORITY_ORDER.indexOf(t.priority) : 9);
  const shown = tasks
    .filter((t) => owner === 'all' || (owner === 'none' ? t.ownerUids.length === 0 : t.ownerUids.includes(owner)))
    .filter((t) => statusFilter === 'all' || (statusFilter === 'open' ? t.status !== 'done' : t.status === statusFilter))
    .filter((t) => !term || `${t.title} ${t.notes ?? ''} ${Object.values(t.values ?? {}).join(' ')}`.toLowerCase().includes(term))
    .sort((a, b) =>
      sort === 'due'
        ? (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')
        : sort === 'priority'
          ? prioRank(a) - prioRank(b)
          : sort === 'status'
            ? STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
            : sort === 'name'
              ? a.title.localeCompare(b.title)
              : a.createdAt.localeCompare(b.createdAt)
    );
  const ownersOf = (t: ProjectTask) => people.filter((p) => t.ownerUids.includes(p.uid));
  const open = openId ? tasks.find((t) => t.id === openId) : undefined;
  const statusTone = (t: ProjectTask) => TASK_STATUS[t.status].cell;
  const done = tasks.filter((t) => t.status === 'done').length;
  const sel = new Set(selected);
  const chosen = tasks.filter((t) => sel.has(t.id));

  // ---- The table
  const gridCols = ['6px', '32px', 'minmax(240px,2.6fr)', ...builtIns.map((b) => b.width), ...columns.map((c) => TYPE_WIDTH[c.type]), '44px'].join(' ');
  const minWidth = 6 + 32 + 260 + builtIns.reduce((n, b) => n + parseInt(b.width), 0) + columns.reduce((n, c) => n + parseInt(TYPE_WIDTH[c.type]), 0) + 44;
  const summary = (list: ProjectTask[]) => (
    <div className="flex h-2 w-24 rounded-full overflow-hidden bg-slate-100" title={STATUS_ORDER.map((k) => `${STATUS_LABEL[k]} ${list.filter((t) => t.status === k).length}`).join(' · ')}>
      {list.length > 0 &&
        STATUS_ORDER.map((k) => {
          const n = list.filter((t) => t.status === k).length;
          return n ? <span key={k} className={TASK_STATUS[k].bar} style={{ width: `${(n / list.length) * 100}%` }} /> : null;
        })}
    </div>
  );
  const builtInCell = (b: ProjectBuiltIn, t: ProjectTask) => {
    switch (b) {
      case 'owner':
        return (
          <div key={b} className="border-l border-slate-100 flex">
            <PeoplePicker people={people} value={t.ownerUids} onChange={(ownerUids) => change(t, { ownerUids })} />
          </div>
        );
      case 'status':
        return (
          <div key={b} className="border-l border-white">
            <ColourSelect label="Status" value={t.status} options={TASK_STATUS} onChange={(status) => status && change(t, { status })} />
          </div>
        );
      case 'priority':
        return (
          <div key={b} className="border-l border-white">
            <ColourSelect label="Priority" value={t.priority} options={PRIORITY} empty="None" onChange={(priority) => change(t, { priority })} />
          </div>
        );
      case 'due':
        return (
          <div key={b} className="border-l border-slate-100 flex items-center">
            <input
              type="date"
              value={t.dueDate ?? ''}
              aria-label="Due"
              onChange={(e) => change(t, { dueDate: e.target.value || undefined })}
              className={`w-full px-2 py-2 text-xs bg-transparent focus:outline-none ${isLate(t) ? 'text-rose-600 font-semibold' : t.dueDate ? 'text-slate-700' : 'text-slate-300'}`}
            />
          </div>
        );
      case 'timeline':
        return (
          <div key={b} className="border-l border-slate-100 flex">
            <TimelineCell task={t} onSet={(c) => change(t, c)} />
          </div>
        );
    }
  };
  const footerCell = (b: ProjectBuiltIn, list: ProjectTask[]) =>
    b === 'status' ? (
      <span key={b} className="px-2 py-2 flex items-center justify-center">
        {summary(list)}
      </span>
    ) : b === 'due' ? (
      <span key={b} className="px-3 py-2 text-[11px] text-rose-600">
        {list.filter(isLate).length ? `${list.filter(isLate).length} late` : ''}
      </span>
    ) : (
      <span key={b} />
    );
  const columnFooter = (c: ProjectColumn, list: ProjectTask[]) =>
    c.type === 'number' || c.type === 'money' || c.type === 'formula' ? (
      <span key={c.id} className="px-3 py-2 text-[11px] text-right font-semibold tabular-nums text-slate-700">
        {money(sumOf(list, c), c.currency)}
        <span className="block text-[9px] font-normal text-slate-400">sum</span>
      </span>
    ) : c.type === 'checkbox' ? (
      <span key={c.id} className="px-3 py-2 text-[11px] text-center text-slate-500">
        {list.filter((t) => t.values?.[c.id] === true).length}/{list.length}
      </span>
    ) : (
      <span key={c.id} />
    );

  const groupBlock = (g: ProjectGroup) => {
    const c = GROUP_COLOURS[g.colour % GROUP_COLOURS.length];
    const list = shown.filter((t) => t.groupId === g.id || (!project.groups.some((x) => x.id === t.groupId) && g.id === project.groups[0]?.id));
    const shut = collapsed[g.id];
    const all = tasks.filter((t) => t.groupId === g.id);
    const allPicked = list.length > 0 && list.every((t) => sel.has(t.id));
    return (
      <section key={g.id} className="space-y-1.5">
        <div className="flex items-center gap-2 group/title">
          <button onClick={() => setCollapsed((s) => ({ ...s, [g.id]: !s[g.id] }))} aria-label={shut ? `Open ${g.name}` : `Close ${g.name}`}>
            <ChevronDown className={`w-4 h-4 ${c.text} transition-transform ${shut ? '-rotate-90' : ''}`} />
          </button>
          <InlineText
            label="Group name"
            value={g.name}
            allowEmpty={false}
            onSave={(v) => saveGroups(project.groups.map((x) => (x.id === g.id ? { ...x, name: v.trim() } : x)))}
            className={`text-sm font-bold ${c.text} rounded px-1 -mx-1 hover:bg-slate-100`}
          />
          <span className="text-xs text-slate-400 shrink-0">
            {list.length} {list.length === 1 ? noun.toLowerCase() : `${noun.toLowerCase()}s`}
          </span>
          {shut && <span className="ml-2">{summary(list)}</span>}
          <span className="ml-auto flex items-center gap-1 opacity-0 group-hover/title:opacity-100 focus-within:opacity-100">
            <button
              onClick={() => saveGroups(project.groups.map((x) => (x.id === g.id ? { ...x, colour: (x.colour + 1) % GROUP_COLOURS.length } : x)))}
              title="Change colour"
              aria-label="Change colour"
              className={`w-4 h-4 rounded-full ${c.strip}`}
            />
            {project.groups.length > 1 && all.length === 0 && (
              <button onClick={() => saveGroups(project.groups.filter((x) => x.id !== g.id))} title="Delete group" aria-label="Delete group" className="p-1 rounded text-slate-400 hover:text-rose-600">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        </div>
        {!shut && (
          <div className="rounded-xl border border-slate-200 overflow-x-auto">
            <div style={{ minWidth }}>
              <div className="grid text-[11px] font-semibold text-slate-500 border-b border-slate-200 bg-white" style={{ gridTemplateColumns: gridCols }}>
                <span />
                <label className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    aria-label={`Select every task in ${g.name}`}
                    checked={allPicked}
                    onChange={() => setSelected((s) => (allPicked ? s.filter((id) => !list.some((t) => t.id === id)) : [...new Set([...s, ...list.map((t) => t.id)])]))}
                    className="accent-indigo-600"
                  />
                </label>
                <span className="px-3 py-2">{noun}</span>
                {builtIns.map((b) => (
                  <span key={b.id} className="group/h relative px-2 py-2 text-center">
                    {b.title}
                    <button onClick={() => toggleBuiltIn(b.id)} title={`Hide ${b.title}`} aria-label={`Hide ${b.title}`} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-300 hover:text-slate-600 opacity-0 group-hover/h:opacity-100">
                      <EyeOff className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {columns.map((col) => (
                  <span key={col.id} className="group/h relative flex items-center">
                    <InlineText
                      label="Column name"
                      value={col.title}
                      allowEmpty={false}
                      onSave={(v) => saveProject({ columns: columns.map((x) => (x.id === col.id ? { ...x, title: v.trim() } : x)) })}
                      className="w-full px-2 py-2 text-center font-semibold text-slate-500 rounded"
                    />
                    <button
                      onClick={() => window.confirm(`Delete the ${col.title} column and what's in it?`) && saveProject({ columns: columns.filter((x) => x.id !== col.id) })}
                      title={`Delete ${col.title}`}
                      aria-label={`Delete ${col.title}`}
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-300 hover:text-rose-600 opacity-0 group-hover/h:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <span className="flex items-center justify-center">
                  <button onClick={() => setAddingCol(true)} title="Add a column" aria-label="Add a column" className="p-1 rounded-md text-slate-400 hover:text-indigo-700 hover:bg-indigo-50">
                    <Plus className="w-4 h-4" />
                  </button>
                </span>
              </div>
              {list.map((t) => (
                <div key={t.id} className={`group grid items-stretch border-b border-slate-100 ${sel.has(t.id) ? 'bg-indigo-50/60' : 'bg-white hover:bg-slate-50/80'}`} style={{ gridTemplateColumns: gridCols }}>
                  <span className={c.strip} />
                  <label className="flex items-center justify-center">
                    <input type="checkbox" aria-label={`Select ${t.title}`} checked={sel.has(t.id)} onChange={() => setSelected((s) => (sel.has(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id]))} className="accent-indigo-600" />
                  </label>
                  <div className="flex items-center min-w-0 pr-2">
                    <InlineText label="Task" value={t.title} allowEmpty={false} onSave={(v) => change(t, { title: v.trim() })} className="flex-1 min-w-0 px-3 py-2 text-sm font-medium text-slate-900 truncate" />
                    {t.log && t.log.length > 1 && <span className="shrink-0 mr-1 text-[10px] text-slate-400" title="Changes">{t.log.length}</span>}
                    <button
                      onClick={() => setOpenId(t.id)}
                      className={`shrink-0 px-2 py-0.5 rounded border text-[11px] font-semibold ${t.notes ? 'border-indigo-200 text-indigo-700 bg-indigo-50' : 'border-slate-200 text-slate-500 opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                    >
                      Open
                    </button>
                  </div>
                  {builtIns.map((b) => builtInCell(b.id, t))}
                  {columns.map((col) => (
                    <div key={col.id} className="border-l border-slate-100 flex items-stretch min-w-0">
                      <ValueCell col={col} task={t} people={people} link={link} onSet={(v) => setValue(t, col.id, v)} />
                    </div>
                  ))}
                  <div className="flex items-center justify-center border-l border-slate-100">
                    <button onClick={() => onDeleteTask(t)} title="Delete task" aria-label="Delete task" className="p-1 rounded text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus:opacity-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Add a task to the group, as monday's last row */}
              <div className="grid border-b border-slate-100 bg-white" style={{ gridTemplateColumns: '6px 32px 1fr' }}>
                <span className={`${c.strip} opacity-40`} />
                <span />
                <input
                  value={adding[g.id] ?? ''}
                  onChange={(e) => setAdding((a) => ({ ...a, [g.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (adding[g.id] ?? '').trim()) {
                      add({ groupId: g.id, title: adding[g.id].trim() });
                      setAdding((a) => ({ ...a, [g.id]: '' }));
                    }
                  }}
                  onBlur={() => {
                    if ((adding[g.id] ?? '').trim()) add({ groupId: g.id, title: adding[g.id].trim() });
                    setAdding((a) => ({ ...a, [g.id]: '' }));
                  }}
                  placeholder={`+ Add ${noun.toLowerCase()}`}
                  aria-label={`Add a ${noun.toLowerCase()} to ${g.name}`}
                  className="px-3 py-2 text-sm bg-transparent placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                />
              </div>
              <div className="grid bg-slate-50/60" style={{ gridTemplateColumns: gridCols }}>
                <span />
                <span />
                <span className="px-3 py-2 text-[11px] text-slate-400">
                  {hidden.includes('status') ? `${list.length} ${list.length === 1 ? noun.toLowerCase() : `${noun.toLowerCase()}s`}` : `${list.filter((t) => t.status === 'done').length} of ${list.length} done`}
                </span>
                {builtIns.map((b) => footerCell(b.id, list))}
                {columns.map((col) => columnFooter(col, list))}
                <span />
              </div>
            </div>
          </div>
        )}
      </section>
    );
  };

  // ---- Kanban by a field: drag a card to another lane to change it
  const measureCol = measures.find((c) => c.id === view.measure);
  const kanban = () => {
    const f = fieldOf(view.by);
    return (
      <div className="flex gap-3 items-start overflow-x-auto pb-2">
        {f.lanes.map((lane) => {
          const list = shown.filter((t) => f.of(t) === lane.key);
          return (
            <div
              key={lane.key || 'none'}
              onDragOver={(e) => f.set && e.preventDefault()}
              onDrop={() => {
                const t = tasks.find((x) => x.id === dragId);
                setDragId(null);
                if (!t || !f.set || f.of(t) === lane.key) return;
                const c = f.set(lane.key);
                change(t, typeof c === 'function' ? c(t) : c);
              }}
              className="w-64 shrink-0 rounded-xl bg-slate-100/70 overflow-hidden"
            >
              <div className={`px-3 py-2 text-xs font-bold ${lane.cell}`}>
                <div className="flex items-center justify-between">
                  <span className="truncate">{lane.label}</span>
                  <span className="opacity-80">{list.length}</span>
                </div>
                {measureCol && <div className="text-sm tabular-nums">{money(sumOf(list, measureCol), measureCol.currency)}</div>}
              </div>
              <ul className="p-2 space-y-2 min-h-16">
                {list.map((t) => (
                  <li
                    key={t.id}
                    draggable={!!f.set}
                    onDragStart={() => setDragId(t.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`p-3 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-2 ${f.set ? 'cursor-grab' : ''} ${dragId === t.id ? 'opacity-50' : ''}`}
                  >
                    <button onClick={() => setOpenId(t.id)} className="block text-left text-sm font-semibold text-slate-900 hover:text-indigo-700 leading-snug">
                      {t.title}
                    </button>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      <Faces people={ownersOf(t)} />
                      <span className="flex items-center gap-1.5">
                        {f.id !== 'status' && !hidden.includes('status') && <span className={`px-1.5 py-px rounded text-[10px] font-semibold ${TASK_STATUS[t.status].cell}`}>{STATUS_LABEL[t.status]}</span>}
                        {f.id !== 'priority' && t.priority && <span className={`px-1.5 py-px rounded text-[10px] font-semibold ${PRIORITY[t.priority].cell}`}>{PRIORITY_LABEL[t.priority]}</span>}
                        {t.dueDate && <span className={isLate(t) ? 'text-rose-600 font-semibold' : ''}>{shortDate(t.dueDate)}</span>}
                        {measureCol && numberOf(t, measureCol, columns) !== undefined && <span className="font-semibold text-slate-800 tabular-nums">{money(numberOf(t, measureCol, columns), measureCol.currency)}</span>}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              {f.set && (
                <button
                  onClick={() => {
                    const c = f.set!(lane.key);
                    const base = { title: `New ${noun.toLowerCase()}` } as ProjectTask;
                    setOpenId(add(typeof c === 'function' ? { ...c(base) } : c) ?? null);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  + Add {noun.toLowerCase()}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ---- Chart: tasks counted by a field
  const chart = () => {
    const f = fieldOf(view.by);
    const bars: ChartBar[] = f.lanes
      .map((l) => {
        const list = shown.filter((t) => (f.id === 'owner' ? (l.key ? t.ownerUids.includes(l.key) : t.ownerUids.length === 0) : f.of(t) === l.key));
        const mc = measures.find((c) => c.id === view.measure);
        return mc
          ? { key: l.key || 'none', label: l.label, bar: l.bar, count: sumOf(list, mc), done: sumOf(list.filter((t) => t.status === 'done'), mc), format: (n: number) => money(n, mc.currency) }
          : { key: l.key || 'none', label: l.label, bar: l.bar, count: list.length, done: list.filter((t) => t.status === 'done').length };
      })
      .filter((b) => b.count > 0);
    const sums = measures.map((c) => ({ title: c.title, total: money(sumOf(shown, c), c.currency) }));
    const mc = measures.find((c) => c.id === view.measure);
    return <ChartView tasks={shown} bars={bars} byLabel={f.label} sums={sums} noun={noun} measure={mc?.title} statusBased={!hidden.includes('status')} />;
  };

  const viewIcon = (type: ProjectView['type']) => VIEW_TYPES.find((v) => v.type === type)!.icon;
  const addView = (type: ProjectView['type']) => {
    const v: ProjectView = { id: newId('view'), name: VIEW_TYPES.find((x) => x.type === type)!.label, type, ...((type === 'kanban' || type === 'chart') && { by: 'status' }) };
    saveProject({ views: [...views, v] });
    setViewId(v.id);
  };
  const updateView = (c: Partial<ProjectView>) => saveProject({ views: views.map((v) => (v.id === view.id ? { ...v, ...c } : v)) });

  return (
    <div className="space-y-4 pb-16">
      {/* The project's name, how far along it is, and its automations */}
      <div className="flex flex-wrap items-center gap-3">
        <InlineText
          label="Project name"
          value={project.name}
          allowEmpty={false}
          onSave={(v) => saveProject({ name: v.trim() })}
          className="min-w-0 flex-1 text-xl font-bold text-slate-900 rounded-lg px-2 -mx-2 py-1 hover:bg-slate-50"
        />
        {tasks.length > 0 && !hidden.includes('status') && (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            {summary(tasks)}
            {Math.round((done / tasks.length) * 100)}% done
          </span>
        )}
        <button onClick={() => setAutomating(true)} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-500" />
          Automate
          {(project.automations ?? []).filter((a) => !a.off).length > 0 && (
            <span className="px-1.5 rounded-full bg-amber-100 text-amber-800 text-[11px]">{(project.automations ?? []).filter((a) => !a.off).length}</span>
          )}
        </button>
        {confirmDelete ? (
          <span className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">Delete this project and its {tasks.length} tasks?</span>
            <button onClick={onDeleteProject} className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-semibold">
              Delete
            </button>
            <button onClick={() => setConfirmDelete(false)} className="px-2.5 py-1 rounded-lg border border-slate-300 font-semibold text-slate-700">
              Keep
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirmDelete(true)} title="Delete project" aria-label="Delete project" className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Views, as monday's tabs: rename with a double click, + adds one */}
      <div className="border-b border-slate-200 flex items-end gap-1 overflow-x-auto">
        {views.map((v) => {
          const Icon = viewIcon(v.type);
          return (
            <div key={v.id} className={`group/v shrink-0 -mb-px border-b-2 flex items-center ${view.id === v.id ? 'border-indigo-600' : 'border-transparent'}`}>
              {renamingView === v.id ? (
                <input
                  autoFocus
                  defaultValue={v.name}
                  aria-label="View name"
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== v.name) saveProject({ views: views.map((x) => (x.id === v.id ? { ...x, name } : x)) });
                    setRenamingView(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  className="w-32 px-2 py-1.5 my-0.5 text-sm font-semibold rounded border border-indigo-300 focus:outline-none"
                />
              ) : (
                <button
                  onClick={() => setViewId(v.id)}
                  onDoubleClick={() => setRenamingView(v.id)}
                  aria-pressed={view.id === v.id}
                  title="Double-click to rename"
                  className={`px-3 py-2 text-sm font-semibold inline-flex items-center gap-1.5 ${view.id === v.id ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  <Icon className="w-4 h-4" />
                  {v.name}
                </button>
              )}
              {views.length > 1 && view.id === v.id && renamingView !== v.id && (
                <button
                  onClick={() => {
                    const rest = views.filter((x) => x.id !== v.id);
                    saveProject({ views: rest });
                    setViewId(rest[0].id);
                  }}
                  aria-label={`Delete the ${v.name} view`}
                  title="Delete view"
                  className="p-0.5 mr-1 rounded text-slate-300 hover:text-rose-600 opacity-0 group-hover/v:opacity-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
        <MenuButton icon={Plus} label="" width={240}>
          {(close) => (
            <>
              <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold text-slate-400">Add a view</p>
              {VIEW_TYPES.map((v) => (
                <button
                  key={v.type}
                  onClick={() => {
                    addView(v.type);
                    close();
                  }}
                  className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50"
                >
                  <v.icon className="w-4 h-4 text-indigo-600 mt-0.5" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{v.label}</span>
                    <span className="block text-[11px] text-slate-500">{v.hint}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </MenuButton>
      </div>

      {/* The toolbar: new task, search, filters, sort, the view's field, columns */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setOpenId(add({}) ?? null)}
          className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New {noun.toLowerCase()}
        </button>
        <button
          onClick={() => setAsking(true)}
          className="h-9 px-3 rounded-lg text-sm font-semibold inline-flex items-center gap-1.5 text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:opacity-90"
        >
          <BrandSparkle className="w-4 h-4" />
          Ask AI
        </button>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 w-40 pl-8 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Owner" className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
          <option value="all">Everyone</option>
          {people.map((p) => (
            <option key={p.uid} value={p.uid}>
              {p.name}
            </option>
          ))}
          <option value="none">No owner</option>
        </select>
        {!hidden.includes('status') && <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} aria-label="Filter by status" className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
          <option value="all">Any status</option>
          <option value="open">Not done</option>
          {STATUS_ORDER.map((k) => (
            <option key={k} value={k}>
              {STATUS_LABEL[k]}
            </option>
          ))}
        </select>}
        {view.type === 'table' && (
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700">
            <option value="manual">Sort: added</option>
            <option value="due">Sort: due date</option>
            <option value="priority">Sort: priority</option>
            <option value="status">Sort: status</option>
            <option value="name">Sort: name</option>
          </select>
        )}
        {(view.type === 'kanban' || view.type === 'chart') && (
          <label className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-500 inline-flex items-center gap-2">
            By
            <select value={fieldOf(view.by).id} onChange={(e) => updateView({ by: e.target.value })} className="bg-transparent text-slate-800 font-semibold focus:outline-none">
              {fields
                .filter((f) => view.type === 'chart' || f.set)
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
            </select>
          </label>
        )}
        {(view.type === 'kanban' || view.type === 'chart') && measures.length > 0 && (
          <label className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-500 inline-flex items-center gap-2">
            {view.type === 'chart' ? 'Show' : 'Total'}
            <select value={view.measure ?? ''} onChange={(e) => updateView({ measure: e.target.value || undefined })} className="bg-transparent text-slate-800 font-semibold focus:outline-none">
              <option value="">{view.type === 'chart' ? `Number of ${noun.toLowerCase()}s` : 'Nothing'}</option>
              {measures.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        )}
        {view.type === 'table' && (
          <MenuButton icon={Columns3} label="Columns" width={240}>
            {() => (
              <>
                <p className="px-2 pt-1 pb-1.5 text-[11px] font-semibold text-slate-400">Show</p>
                {BUILT_IN.map((b) => (
                  <label key={b.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-800 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={!hidden.includes(b.id)} onChange={() => toggleBuiltIn(b.id)} className="accent-indigo-600" />
                    {b.title}
                  </label>
                ))}
                {columns.length > 0 && <p className="px-2 pt-2 pb-1 text-[11px] font-semibold text-slate-400">Added</p>}
                {columns.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-800">
                    <span className="flex-1 truncate">{c.title}</span>
                    {c.type === 'label' || c.type === 'formula' ? (
                      <button onClick={() => (c.type === 'formula' && setFormulaFocus(c.id), setAddingCol(true))} className="text-[10px] font-semibold text-indigo-700 hover:underline">
                        {c.type === 'label' ? 'Edit labels' : 'Edit formula'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">{COLUMN_TYPES.find((t) => t.type === c.type)?.label}</span>
                    )}
                    <button onClick={() => window.confirm(`Delete the ${c.title} column and what's in it?`) && saveProject({ columns: columns.filter((x) => x.id !== c.id) })} aria-label={`Delete ${c.title}`} className="p-0.5 text-slate-400 hover:text-rose-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button onClick={() => setAddingCol(true)} className="w-full mt-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                  <Plus className="w-4 h-4" />
                  Add a column
                </button>
              </>
            )}
          </MenuButton>
        )}
        <span className="ml-auto text-xs text-slate-400">
          {shown.length} {shown.length === 1 ? noun.toLowerCase() : `${noun.toLowerCase()}s`}
        </span>
      </div>

      {view.type === 'table' ? (
        <div className="space-y-6">
          {project.groups.map(groupBlock)}
          <button
            onClick={() => saveGroups([...project.groups, { id: newId('grp'), name: 'New group', colour: (project.groups.length + 2) % GROUP_COLOURS.length }])}
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add new group
          </button>
        </div>
      ) : view.type === 'kanban' ? (
        kanban()
      ) : view.type === 'calendar' ? (
        <CalendarView project={project} tasks={shown} tone={statusTone} onOpen={setOpenId} onAdd={(f) => setOpenId(add(f) ?? null)} />
      ) : view.type === 'timeline' ? (
        <TimelineView project={project} tasks={shown} tone={statusTone} onOpen={setOpenId} onAdd={(f) => setOpenId(add(f) ?? null)} />
      ) : (
        chart()
      )}

      {/* Adding a column: its type */}
      {addingCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40" onClick={() => (setAddingCol(false), setConnecting(false), setFormulaFocus(undefined))}>
          <div role="dialog" aria-label="Columns" onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-3 max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Columns</h2>
              <button onClick={() => (setAddingCol(false), setConnecting(false), setFormulaFocus(undefined))} aria-label="Close" className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COLUMN_TYPES.map((c) => (
                <button
                  key={c.type}
                  onClick={() => {
                    if (c.type === 'connect') return setConnecting(true);
                    const col = addColumn(c.type);
                    // A formula column stays here, on its editor, to describe or write what it works out
                    if (c.type === 'formula') return setFormulaFocus(col.id);
                    setAddingCol(false);
                  }}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left"
                >
                  <span className="block text-sm font-semibold text-slate-900">{c.label}</span>
                  <span className="block text-[11px] text-slate-500">{c.hint}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400">Rename a column by clicking its name. A label column starts with Yes, Maybe and No; change its labels below. A formula column works something out from the others: describe it and AI writes the formula.</p>
            {connecting && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <p className="text-xs font-bold text-slate-700">Link items on which board?</p>
                {boards.filter((b) => b.id !== project.id).length === 0 ? (
                  <p className="text-xs text-slate-500">Make another board first.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {boards
                      .filter((b) => b.id !== project.id)
                      .map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            addColumn('connect', b.id);
                            setConnecting(false);
                            setAddingCol(false);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-indigo-300 text-xs font-semibold text-slate-700"
                        >
                          {b.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
            {columns.some((c) => c.type === 'formula') && (
              <FormulaEditor key={formulaFocus ?? 'formula'} focusId={formulaFocus} columns={columns} tasks={tasks} names={names} allTasks={allTasks} onSave={(cols) => saveProject({ columns: cols })} />
            )}
            {columns.some((c) => c.type === 'label') && <LabelEditor columns={columns} onSave={(cols) => saveProject({ columns: cols })} />}
          </div>
        </div>
      )}

      {/* Selected tasks: act on them together */}
      {chosen.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white shadow-2xl text-sm">
          <span className="font-semibold">
            {chosen.length} selected
          </span>
          <select
            aria-label="Move selected to group"
            value=""
            onChange={(e) => {
              chosen.forEach((t) => change(t, { groupId: e.target.value }));
              setSelected([]);
            }}
            className="h-8 px-2 rounded-lg bg-slate-800 border border-slate-700 text-xs"
          >
            <option value="">Move to…</option>
            {project.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Set status of selected"
            value=""
            onChange={(e) => chosen.forEach((t) => change(t, { status: e.target.value as ProjectTaskStatus }))}
            className="h-8 px-2 rounded-lg bg-slate-800 border border-slate-700 text-xs"
          >
            <option value="">Status…</option>
            {STATUS_ORDER.map((k) => (
              <option key={k} value={k}>
                {STATUS_LABEL[k]}
              </option>
            ))}
          </select>
          <select
            aria-label="Assign selected"
            value=""
            onChange={(e) => chosen.forEach((t) => !t.ownerUids.includes(e.target.value) && change(t, { ownerUids: [...t.ownerUids, e.target.value] }))}
            className="h-8 px-2 rounded-lg bg-slate-800 border border-slate-700 text-xs"
          >
            <option value="">Assign…</option>
            {people.map((p) => (
              <option key={p.uid} value={p.uid}>
                {p.name}
              </option>
            ))}
          </select>
          <button onClick={() => chosen.forEach(duplicate)} className="h-8 px-2.5 rounded-lg hover:bg-slate-800 inline-flex items-center gap-1 text-xs font-semibold">
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>
          <button
            onClick={() => {
              if (!window.confirm(`Delete ${chosen.length} ${chosen.length === 1 ? 'task' : 'tasks'}?`)) return;
              chosen.forEach(onDeleteTask);
              setSelected([]);
            }}
            className="h-8 px-2.5 rounded-lg hover:bg-rose-600 inline-flex items-center gap-1 text-xs font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <button onClick={() => setSelected([])} aria-label="Clear selection" className="p-1 rounded-lg hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {asking && (
        <PanelGuard onClose={() => setAsking(false)}>
          <AskAi
            project={project}
            boards={boards}
            company={company}
            text={() => boardForAi(project, tasks, allTasks, names)}
            others={() =>
              boards
                .filter((b) => b.id !== project.id)
                .slice(0, 8)
                .map((b) => boardForAi(b, allTasks.filter((t) => t.projectId === b.id).slice(0, 60), allTasks, names))
            }
            onApply={(actions) =>
              applyActions(actions, {
                boards,
                tasks: allTasks,
                people,
                by: me.name,
                current: project,
                saveProject: onSaveProject,
                saveTask: onSaveTask,
                deleteTask: onDeleteTask,
              })
            }
            onClose={() => setAsking(false)}
          />
        </PanelGuard>
      )}

      {automating && <AutomationsDialog project={project} people={people} names={names} onSave={(automations) => saveProject({ automations })} onClose={() => setAutomating(false)} />}

      {open && (
        <TaskPanel
          task={open}
          project={project}
          people={people}
          link={link}
          me={me}
          hidden={hidden}
          onConvert={
            project.kind === 'leads' && boards.some((b) => b.kind === 'deals')
              ? () => {
                  const made = convertLead(open, boards, allTasks, me.name);
                  if (!made) return;
                  made.saves.forEach((t) => onSaveTask(clean(t)));
                  const deals = boards.find((b) => b.kind === 'deals');
                  if (deals && made.dealId) onOpenItem?.(deals.id, made.dealId);
                }
              : undefined
          }
          onChange={(c) => change(open, c)}
          onSetValue={(colId, v) => setValue(open, colId, v)}
          onDuplicate={() => setOpenId(duplicate(open) ?? null)}
          onDelete={() => {
            onDeleteTask(open);
            setOpenId(null);
          }}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
};

// A formula column: say what it should do and AI writes it, or write it by hand with column names in braces and
// functions (boardFormula.ts). It's checked as it's typed and tried on the board's first items
const FormulaEditor: React.FC<{
  columns: ProjectColumn[];
  tasks: ProjectTask[];
  names: Record<string, string>;
  allTasks: ProjectTask[];
  focusId?: string;
  onSave: (columns: ProjectColumn[]) => void;
}> = ({ columns, tasks, names, allTasks, focusId, onSave }) => {
  const formulas = columns.filter((c) => c.type === 'formula');
  const [colId, setColId] = useState(focusId ?? formulas[0]?.id);
  const col = formulas.find((c) => c.id === colId) ?? formulas[0];
  const [text, setText] = useState(col?.formula ?? '');
  const [describe, setDescribe] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [aiError, setAiError] = useState('');
  const [showFns, setShowFns] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setText(col?.formula ?? '');
    setAiNote('');
    setAiError('');
  }, [col?.id]);
  if (!col) return null;
  const ctx = { columns, names, allTasks };
  const problem = text.trim() ? checkFormula(text, ctx) : undefined;
  const save = (c: Partial<ProjectColumn>) => onSave(columns.map((x) => (x.id === col.id ? { ...x, ...c, currency: (c.currency ?? x.currency) || undefined } : x)));
  const usable = columns.filter((c) => c.id !== col.id);
  const insert = (piece: string) => {
    const el = inputRef.current;
    const at = el?.selectionStart ?? text.length;
    const next = text.slice(0, at) + piece + text.slice(el?.selectionEnd ?? at);
    setText(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + piece.length, at + piece.length);
    });
  };
  // A few items, spelled out, so the AI sees what the values look like
  const samples = tasks.slice(0, 4).map((t) => {
    const vals = columns
      .filter((c) => c.type !== 'formula')
      .map((c) => {
        const r = formulaResult(`{${c.title}}`, t, ctx);
        return r.value === null || r.value === '' ? '' : `${c.title}: ${String(r.value)}`;
      })
      .filter(Boolean);
    return `- ${t.title} (Status: ${STATUS_LABEL[t.status]}${t.dueDate ? `, Due date: ${t.dueDate}` : ''}${vals.length ? `, ${vals.join(', ')}` : ''})`;
  });

  const write = async () => {
    if (!describe.trim() || busy) return;
    setBusy(true);
    setAiError('');
    setAiNote('');
    const payload = {
      description: describe.trim(),
      title: col.title,
      current: col.formula || undefined,
      columns: usable.map((c) => ({ title: c.title, type: c.type, ...(c.options && { options: c.options.map((o) => o.label) }) })),
      samples,
    };
    try {
      let previous = '';
      let problemWas = '';
      // Written once, and sent back once to fix if it doesn't read on this board
      for (let round = 0; round < 2; round++) {
        const res = await aiFetch('/api/write-formula', { ...payload, ...(problemWas && { problem: problemWas, previous }) });
        const body = (await res.json().catch(() => ({}))) as { formula?: string; title?: string; currency?: string; explanation?: string; error?: string };
        if (res.status === 402) return setAiError('Your AI credit has run out. Top it up from the home chat to keep using AI.');
        if (!res.ok || !body.formula) return setAiError(body.error === 'not-configured' ? 'Praxa’s AI isn’t switched on here yet.' : body.error || 'The AI couldn’t write it. Try again.');
        const wrong = checkFormula(body.formula, ctx);
        if (wrong && round === 0) {
          previous = body.formula;
          problemWas = wrong;
          continue;
        }
        setText(body.formula);
        if (wrong) return setAiError(`The formula it wrote doesn’t work here (${wrong}). Fix it below or describe it another way.`);
        // A column still called Formula takes the name the AI gave it
        const rename = /^formula( \d+)?$/i.test(col.title) && body.title && !columns.some((c) => c.id !== col.id && c.title.toLowerCase() === body.title!.toLowerCase());
        save({ formula: body.formula, ...(rename && { title: body.title }), ...(body.currency !== undefined && { currency: body.currency }) });
        setAiNote(body.explanation || 'Done.');
        setDescribe('');
        return;
      }
    } catch {
      setAiError('The AI couldn’t be reached. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const preview = tasks.slice(0, 3).map((t) => ({ t, r: formulaResult(text, t, ctx) }));
  return (
    <div className="pt-3 border-t border-slate-100 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-700">Formula for</span>
        <select value={col.id} onChange={(e) => setColId(e.target.value)} className="h-7 px-2 rounded-lg border border-slate-200 text-xs font-semibold">
          {formulas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <input defaultValue={col.currency ?? ''} key={col.id} onBlur={(e) => save({ currency: e.target.value.trim() })} placeholder="£" aria-label="Currency sign" title="Shown before numbers, e.g. £" className="w-12 h-7 px-2 rounded-lg border border-slate-200 text-xs" />
      </div>

      {/* Say it */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
        <label htmlFor="formula-describe" className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
          <Sparkles className="w-3.5 h-3.5" /> Describe what this column should show
        </label>
        <div className="flex gap-2">
          <input
            id="formula-describe"
            value={describe}
            onChange={(e) => setDescribe(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && write()}
            placeholder="e.g. days until it's due, or Overdue if the due date has passed and it isn't done"
            className="flex-1 min-w-0 h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs"
          />
          <button onClick={write} disabled={!describe.trim() || busy} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {busy ? 'Writing' : 'Write it'}
          </button>
        </div>
        {aiNote && <p className="text-[11px] text-indigo-900">{aiNote}</p>}
        {aiError && <p className="text-[11px] text-rose-600">{aiError}</p>}
        {!aiNote && !aiError && <p className="text-[10px] text-slate-500">Paid from your AI credit. You can check and change the formula below.</p>}
      </div>

      {/* Or write it */}
      <div className="space-y-1.5">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => !problem && text !== (col.formula ?? '') && save({ formula: text })}
          onKeyDown={(e) => e.key === 'Enter' && !problem && save({ formula: text })}
          aria-label="Formula"
          placeholder='IF({Deal value} > 10000, "Big", "Small")'
          className={`w-full h-9 px-3 rounded-lg border font-mono text-xs ${problem ? 'border-rose-300 bg-rose-50' : 'border-slate-200'}`}
        />
        <p className={`text-[11px] ${problem ? 'text-rose-600' : 'text-slate-400'}`}>
          {problem ?? 'Click a column or function to add it. Saved when you press Enter or click away.'}
        </p>
        {!problem && text.trim() && preview.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {preview.map(({ t, r }) => (
              <span key={t.id} className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[11px] text-slate-600 max-w-full truncate">
                {t.title}: <span className={`font-semibold ${r.error ? 'text-rose-600' : 'text-slate-900'}`}>{r.error ? r.error : showFormula(r, col.currency) || 'empty'}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {[...usable.map((c) => c.title), ...BUILT_IN_REFS.filter((b) => !usable.some((c) => c.title.toLowerCase() === b.toLowerCase()))].map((title) => (
          <button key={title} onClick={() => insert(`{${title}}`)} className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-mono text-slate-700 hover:bg-indigo-50">
            {`{${title}}`}
          </button>
        ))}
      </div>
      <div>
        <button onClick={() => setShowFns((x) => !x)} className="text-[11px] font-semibold text-indigo-700 hover:underline">
          {showFns ? 'Hide functions' : `Functions (${FORMULA_FUNCTIONS.length})`}
        </button>
        {showFns && (
          <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-44 overflow-y-auto">
            {FORMULA_FUNCTIONS.map((f) => (
              <button key={f.name} onClick={() => insert(`${f.name}(`)} title={f.help} className="text-left px-2 py-1 rounded hover:bg-indigo-50 text-[11px] text-slate-600 truncate">
                <span className="font-mono font-semibold text-slate-800">{f.name}</span> {f.help.replace(/^[A-Z_]+/, '')}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// A label column's options: rename, recolour, add and remove
const LabelEditor: React.FC<{ columns: ProjectColumn[]; onSave: (columns: ProjectColumn[]) => void }> = ({ columns, onSave }) => {
  const labels = columns.filter((c) => c.type === 'label');
  const [colId, setColId] = useState(labels[0]?.id);
  const col = labels.find((c) => c.id === colId) ?? labels[0];
  if (!col) return null;
  const setOptions = (options: NonNullable<ProjectColumn['options']>) => onSave(columns.map((c) => (c.id === col.id ? { ...c, options } : c)));
  const opts = col.options ?? [];
  return (
    <div className="pt-3 border-t border-slate-100 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-700">Labels in</span>
        <select value={col.id} onChange={(e) => setColId(e.target.value)} className="h-7 px-2 rounded-lg border border-slate-200 text-xs font-semibold">
          {labels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>
      <ul className="space-y-1.5">
        {opts.map((o) => (
          <li key={o.id} className="flex items-center gap-2">
            <button
              onClick={() => setOptions(opts.map((x) => (x.id === o.id ? { ...x, colour: (x.colour + 1) % LABEL_COLOURS.length } : x)))}
              aria-label="Change colour"
              title="Change colour"
              className={`w-5 h-5 rounded ${LABEL_COLOURS[o.colour % LABEL_COLOURS.length].split(' ')[0]}`}
            />
            <InlineText label="Label" value={o.label} allowEmpty={false} onSave={(v) => setOptions(opts.map((x) => (x.id === o.id ? { ...x, label: v.trim() } : x)))} className="flex-1 h-7 px-2 rounded border border-slate-200 text-xs" />
            <button onClick={() => setOptions(opts.filter((x) => x.id !== o.id))} aria-label={`Remove ${o.label}`} className="p-0.5 text-slate-400 hover:text-rose-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => setOptions([...opts, { id: newId('opt'), label: 'New label', colour: opts.length }])} className="text-xs font-semibold text-indigo-700 hover:underline">
        + Add label
      </button>
    </div>
  );
};
