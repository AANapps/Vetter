import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, SquareKanban, Table2, Trash2, UserRound, X } from 'lucide-react';
import { Project, ProjectGroup, ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from '../types';
import { Pic } from './Pic';
import { shortDate } from '../lib/work';

/**
 * One of a company's projects on its team board, like a monday.com board: tasks in coloured groups, each with its
 * owners, a status and priority that fill their cells, a due date and notes. Shown as a main table or a kanban by status
 * (drag cards between columns). Everything is edited where it sits.
 */

export interface BoardPerson {
  uid: string;
  name: string;
  pic?: string;
}

export const TASK_STATUS: Record<ProjectTaskStatus, { label: string; cell: string; bar: string }> = {
  todo: { label: 'Not started', cell: 'bg-slate-300 text-slate-800', bar: 'bg-slate-300' },
  working: { label: 'Working on it', cell: 'bg-amber-400 text-white', bar: 'bg-amber-400' },
  stuck: { label: 'Stuck', cell: 'bg-rose-500 text-white', bar: 'bg-rose-500' },
  done: { label: 'Done', cell: 'bg-emerald-500 text-white', bar: 'bg-emerald-500' },
};
const STATUS_ORDER: ProjectTaskStatus[] = ['todo', 'working', 'stuck', 'done'];

const PRIORITY: Record<ProjectTaskPriority, { label: string; cell: string }> = {
  low: { label: 'Low', cell: 'bg-sky-400 text-white' },
  medium: { label: 'Medium', cell: 'bg-indigo-400 text-white' },
  high: { label: 'High', cell: 'bg-violet-700 text-white' },
  critical: { label: 'Critical', cell: 'bg-slate-800 text-white' },
};

export const GROUP_COLOURS = [
  { strip: 'bg-indigo-500', text: 'text-indigo-600' },
  { strip: 'bg-emerald-500', text: 'text-emerald-600' },
  { strip: 'bg-violet-500', text: 'text-violet-600' },
  { strip: 'bg-amber-500', text: 'text-amber-600' },
  { strip: 'bg-sky-500', text: 'text-sky-600' },
  { strip: 'bg-rose-500', text: 'text-rose-600' },
];

const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().slice(0, 10);
const isLate = (t: ProjectTask) => t.status !== 'done' && !!t.dueDate && t.dueDate < today();

// A new project's groups, as monday starts a board
export const newProject = (businessId: string, name: string): Project => ({
  id: newId('prj'),
  businessId,
  name,
  groups: [
    { id: newId('grp'), name: 'To do', colour: 0 },
    { id: newId('grp'), name: 'Completed', colour: 1 },
  ],
  createdAt: new Date().toISOString(),
});

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

// Picking a task's owners: a list that floats over the board (fixed, so the table's scrolling doesn't cut it off)
const OwnerPicker: React.FC<{ people: BoardPerson[]; value: string[]; onChange: (uids: string[]) => void; compact?: boolean }> = ({ people, value, onChange, compact }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    setPos({ top: Math.min(r.bottom + 4, window.innerHeight - 260), left: Math.min(r.left, window.innerWidth - 240) });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (pop.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);
  const chosen = people.filter((p) => value.includes(p.uid));
  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Owners"
        className={`flex items-center gap-2 min-w-0 ${compact ? '' : 'w-full h-full px-3 py-2 justify-center hover:bg-slate-50'}`}
      >
        <Faces people={chosen} />
        {!compact && chosen.length === 1 && <span className="text-xs text-slate-700 truncate">{chosen[0].name}</span>}
      </button>
      {open && pos && (
        <div ref={pop} style={{ top: pos.top, left: pos.left }} className="fixed z-50 w-56 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl p-1">
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
                {on && <span className="text-indigo-600 text-xs font-bold">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

// A status or priority cell: the colour fills it, and it's a plain select underneath
function ColourSelect<K extends string>({ value, options, onChange, empty, label }: { value?: K; options: Record<K, { label: string; cell: string }>; onChange: (v: K | undefined) => void; empty?: string; label: string }) {
  return (
    <div className={`relative h-full min-h-[40px] flex items-center justify-center text-xs font-semibold ${value ? options[value].cell : 'bg-slate-50 text-slate-300'}`}>
      <span className="pointer-events-none px-2 truncate">{value ? options[value].label : '–'}</span>
      <select
        aria-label={label}
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || undefined) as K | undefined)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full"
      >
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

// The task opened on its own: every field, and room for notes
const TaskPanel: React.FC<{
  task: ProjectTask;
  project: Project;
  people: BoardPerson[];
  onChange: (change: Partial<ProjectTask>) => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ task, project, people, onChange, onDelete, onClose }) => {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes ?? '');
  }, [task.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const field = 'w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={onClose}>
      <aside
        role="dialog"
        aria-label={task.title}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto space-y-5"
      >
        <div className="flex items-start gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title.trim() !== task.title && onChange({ title: title.trim() })}
            aria-label="Task"
            className="flex-1 text-lg font-bold text-slate-900 rounded-lg px-2 -mx-2 py-1 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
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
            <OwnerPicker people={people} value={task.ownerUids} onChange={(ownerUids) => onChange({ ownerUids })} compact />
            <span className="ml-2 text-xs text-slate-500 truncate">{people.filter((p) => task.ownerUids.includes(p.uid)).map((p) => p.name).join(', ') || 'No one yet'}</span>
          </dd>
          <dt className="text-xs font-semibold text-slate-500">Status</dt>
          <dd className="h-9 rounded-lg overflow-hidden">
            <ColourSelect label="Status" value={task.status} options={TASK_STATUS} onChange={(status) => status && onChange({ status })} />
          </dd>
          <dt className="text-xs font-semibold text-slate-500">Priority</dt>
          <dd className="h-9 rounded-lg overflow-hidden">
            <ColourSelect label="Priority" value={task.priority} options={PRIORITY} empty="None" onChange={(priority) => onChange({ priority })} />
          </dd>
          <dt className="text-xs font-semibold text-slate-500">Start</dt>
          <dd>
            <input type="date" value={task.startDate ?? ''} onChange={(e) => onChange({ startDate: e.target.value || undefined })} className={field} />
          </dd>
          <dt className="text-xs font-semibold text-slate-500">Due</dt>
          <dd>
            <input type="date" value={task.dueDate ?? ''} onChange={(e) => onChange({ dueDate: e.target.value || undefined })} className={field} />
          </dd>
        </dl>
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-500">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (task.notes ?? '') && onChange({ notes: notes.trim() || undefined })}
            rows={8}
            placeholder="Details, links, what done looks like…"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>
            Added {shortDate(task.createdAt)}
            {task.updatedAt && ` · changed ${shortDate(task.updatedAt)}`}
          </span>
          <button onClick={onDelete} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline">
            <Trash2 className="w-3.5 h-3.5" />
            Delete task
          </button>
        </div>
      </aside>
    </div>
  );
};

type View = 'table' | 'kanban';

export const ProjectBoard: React.FC<{
  project: Project;
  tasks: ProjectTask[];
  people: BoardPerson[];
  onSaveProject: (project: Project) => void;
  onDeleteProject: () => void;
  onSaveTask: (task: ProjectTask) => void;
  onDeleteTask: (task: ProjectTask) => void;
}> = ({ project, tasks, people, onSaveProject, onDeleteProject, onSaveTask, onDeleteTask }) => {
  const [view, setView] = useState<View>('table');
  const [q, setQ] = useState('');
  const [owner, setOwner] = useState('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [name, setName] = useState(project.name);
  useEffect(() => setName(project.name), [project.id, project.name]);

  const change = (t: ProjectTask, c: Partial<ProjectTask>) => {
    const next = { ...t, ...c, updatedAt: new Date().toISOString() };
    // Undefined fields are dropped rather than saved
    (Object.keys(next) as (keyof ProjectTask)[]).forEach((k) => next[k] === undefined && delete next[k]);
    onSaveTask(next);
  };
  const add = (group: ProjectGroup, title: string, status: ProjectTaskStatus = 'todo') => {
    if (!title.trim()) return;
    const id = newId('task');
    onSaveTask({
      id,
      businessId: project.businessId,
      projectId: project.id,
      groupId: group.id,
      title: title.trim(),
      status,
      ownerUids: owner !== 'all' ? [owner] : [],
      createdAt: new Date().toISOString(),
    });
    return id;
  };
  const saveGroups = (groups: ProjectGroup[]) => onSaveProject({ ...project, groups });

  const term = q.trim().toLowerCase();
  const shown = tasks
    .filter((t) => owner === 'all' || (owner === 'none' ? t.ownerUids.length === 0 : t.ownerUids.includes(owner)))
    .filter((t) => !term || `${t.title} ${t.notes ?? ''}`.toLowerCase().includes(term));
  const ownersOf = (t: ProjectTask) => people.filter((p) => t.ownerUids.includes(p.uid));
  const open = openId ? tasks.find((t) => t.id === openId) : undefined;

  const cols = 'grid-cols-[6px_minmax(240px,2.6fr)_minmax(120px,1fr)_140px_120px_110px_40px]';
  const summary = (list: ProjectTask[]) => (
    <div className="flex h-2 w-28 rounded-full overflow-hidden bg-slate-100" title={STATUS_ORDER.map((k) => `${TASK_STATUS[k].label} ${list.filter((t) => t.status === k).length}`).join(' · ')}>
      {list.length > 0 &&
        STATUS_ORDER.map((k) => {
          const n = list.filter((t) => t.status === k).length;
          return n ? <span key={k} className={TASK_STATUS[k].bar} style={{ width: `${(n / list.length) * 100}%` }} /> : null;
        })}
    </div>
  );

  const groupBlock = (g: ProjectGroup) => {
    const c = GROUP_COLOURS[g.colour % GROUP_COLOURS.length];
    const list = shown.filter((t) => t.groupId === g.id || (!project.groups.some((x) => x.id === t.groupId) && g.id === project.groups[0]?.id));
    const shut = collapsed[g.id];
    const all = tasks.filter((t) => t.groupId === g.id);
    return (
      <section key={g.id} className="space-y-1.5">
        <div className="flex items-center gap-2 group/title">
          <button onClick={() => setCollapsed((s) => ({ ...s, [g.id]: !s[g.id] }))} aria-label={shut ? `Open ${g.name}` : `Close ${g.name}`}>
            <ChevronDown className={`w-4 h-4 ${c.text} transition-transform ${shut ? '-rotate-90' : ''}`} />
          </button>
          <input
            defaultValue={g.name}
            key={g.name}
            aria-label="Group name"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== g.name) saveGroups(project.groups.map((x) => (x.id === g.id ? { ...x, name: v } : x)));
              else e.target.value = g.name;
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className={`text-sm font-bold ${c.text} bg-transparent rounded px-1 -mx-1 hover:bg-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
            style={{ width: `${Math.max(g.name.length, 4) + 2}ch` }}
          />
          <span className="text-xs text-slate-400">
            {list.length} {list.length === 1 ? 'task' : 'tasks'}
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
            <div className="min-w-[820px]">
              <div className={`grid ${cols} text-[11px] font-semibold text-slate-500 border-b border-slate-200 bg-white`}>
                <span />
                <span className="px-3 py-2">Task</span>
                <span className="px-3 py-2 text-center">Owner</span>
                <span className="px-2 py-2 text-center">Status</span>
                <span className="px-2 py-2 text-center">Priority</span>
                <span className="px-3 py-2">Due</span>
                <span />
              </div>
              {list.map((t) => (
                <div key={t.id} className={`group grid ${cols} items-stretch border-b border-slate-100 bg-white hover:bg-slate-50/80`}>
                  <span className={c.strip} />
                  <div className="flex items-center min-w-0 pr-2">
                    <input
                      defaultValue={t.title}
                      key={t.title}
                      aria-label="Task"
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== t.title) change(t, { title: v });
                        else e.target.value = t.title;
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      className="flex-1 min-w-0 px-3 py-2 text-sm font-medium text-slate-900 bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 truncate"
                    />
                    <button
                      onClick={() => setOpenId(t.id)}
                      className={`shrink-0 px-2 py-0.5 rounded border text-[11px] font-semibold ${t.notes ? 'border-indigo-200 text-indigo-700 bg-indigo-50' : 'border-slate-200 text-slate-500 opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
                    >
                      Open
                    </button>
                  </div>
                  <div className="border-l border-slate-100 flex">
                    <OwnerPicker people={people} value={t.ownerUids} onChange={(ownerUids) => change(t, { ownerUids })} />
                  </div>
                  <div className="border-l border-white">
                    <ColourSelect label="Status" value={t.status} options={TASK_STATUS} onChange={(status) => status && change(t, { status })} />
                  </div>
                  <div className="border-l border-white">
                    <ColourSelect label="Priority" value={t.priority} options={PRIORITY} empty="None" onChange={(priority) => change(t, { priority })} />
                  </div>
                  <div className="border-l border-slate-100 flex items-center">
                    <input
                      type="date"
                      value={t.dueDate ?? ''}
                      aria-label="Due"
                      onChange={(e) => change(t, { dueDate: e.target.value || undefined })}
                      className={`w-full px-2 py-2 text-xs bg-transparent focus:outline-none ${isLate(t) ? 'text-rose-600 font-semibold' : t.dueDate ? 'text-slate-700' : 'text-slate-300'}`}
                    />
                  </div>
                  <div className="flex items-center justify-center border-l border-slate-100">
                    <button onClick={() => onDeleteTask(t)} title="Delete task" aria-label="Delete task" className="p-1 rounded text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus:opacity-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {/* Add a task to the group, as monday's last row */}
              <div className={`grid ${cols} border-b border-slate-100 bg-white`}>
                <span className={`${c.strip} opacity-40`} />
                <input
                  value={adding[g.id] ?? ''}
                  onChange={(e) => setAdding((a) => ({ ...a, [g.id]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      add(g, adding[g.id] ?? '');
                      setAdding((a) => ({ ...a, [g.id]: '' }));
                    }
                  }}
                  onBlur={() => {
                    add(g, adding[g.id] ?? '');
                    setAdding((a) => ({ ...a, [g.id]: '' }));
                  }}
                  placeholder="+ Add task"
                  aria-label={`Add a task to ${g.name}`}
                  className="col-span-6 px-3 py-2 text-sm bg-transparent placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                />
              </div>
              <div className={`grid ${cols} bg-slate-50/60`}>
                <span />
                <span className="px-3 py-2 text-[11px] text-slate-400">
                  {list.filter((t) => t.status === 'done').length} of {list.length} done
                </span>
                <span />
                <span className="px-2 py-2 flex items-center justify-center">{summary(list)}</span>
                <span />
                <span className="px-3 py-2 text-[11px] text-rose-600">{list.filter(isLate).length ? `${list.filter(isLate).length} late` : ''}</span>
                <span />
              </div>
            </div>
          </div>
        )}
      </section>
    );
  };

  const done = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="space-y-4">
      {/* The project's name and how far along it is */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => (name.trim() && name.trim() !== project.name ? onSaveProject({ ...project, name: name.trim() }) : setName(project.name))}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Project name"
          className="min-w-0 flex-1 text-xl font-bold text-slate-900 rounded-lg px-2 -mx-2 py-1 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {tasks.length > 0 && (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            {summary(tasks)}
            {Math.round((done / tasks.length) * 100)}% done
          </span>
        )}
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

      <div className="border-b border-slate-200 flex items-end gap-1">
        {(
          [
            { id: 'table', label: 'Main table', icon: Table2 },
            { id: 'kanban', label: 'Kanban', icon: SquareKanban },
          ] as const
        ).map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            aria-pressed={view === v.id}
            className={`px-3 py-2 -mb-px border-b-2 text-sm font-semibold inline-flex items-center gap-1.5 ${view === v.id ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
          >
            <v.icon className="w-4 h-4" />
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => project.groups[0] && setOpenId(add(project.groups[0], 'New task') ?? null)}
          className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New task
        </button>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-9 w-44 pl-8 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
        <span className="ml-auto text-xs text-slate-400">
          {shown.length} {shown.length === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {view === 'table' ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
          {STATUS_ORDER.map((k) => {
            const list = shown.filter((t) => t.status === k);
            return (
              <div
                key={k}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  const t = tasks.find((x) => x.id === dragId);
                  if (t && t.status !== k) change(t, { status: k });
                  setDragId(null);
                }}
                className="rounded-xl bg-slate-100/70 overflow-hidden"
              >
                <div className={`px-3 py-2 text-xs font-bold flex items-center justify-between ${TASK_STATUS[k].cell}`}>
                  {TASK_STATUS[k].label}
                  <span className="opacity-80">{list.length}</span>
                </div>
                <ul className="p-2 space-y-2 min-h-16">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      draggable
                      onDragStart={() => setDragId(t.id)}
                      onDragEnd={() => setDragId(null)}
                      className={`p-3 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-2 cursor-grab ${dragId === t.id ? 'opacity-50' : ''}`}
                    >
                      <button onClick={() => setOpenId(t.id)} className="block text-left text-sm font-semibold text-slate-900 hover:text-indigo-700 leading-snug">
                        {t.title}
                      </button>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                        <Faces people={ownersOf(t)} />
                        <span className="flex items-center gap-1.5">
                          {t.priority && <span className={`px-1.5 py-px rounded text-[10px] font-semibold ${PRIORITY[t.priority].cell}`}>{PRIORITY[t.priority].label}</span>}
                          {t.dueDate && <span className={isLate(t) ? 'text-rose-600 font-semibold' : ''}>{shortDate(t.dueDate)}</span>}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {project.groups[0] && (
                  <button onClick={() => add(project.groups[0], 'New task', k)} className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-500 hover:text-slate-900">
                    + Add task
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <TaskPanel
          task={open}
          project={project}
          people={people}
          onChange={(c) => change(open, c)}
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
