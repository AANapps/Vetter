import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Project, ProjectTask } from '../types';
import { isLate } from '../lib/projectAutomations';

/**
 * A project's other views, beside its table and kanban: a month calendar of due dates, a timeline of each task from its
 * start to its due date, and a chart dashboard. Each opens a task on click, as the table does.
 */

export interface ViewProps {
  project: Project;
  tasks: ProjectTask[];
  // The colour class a task is shown in (its status)
  tone: (t: ProjectTask) => string;
  onOpen: (taskId: string) => void;
  onAdd: (fields: Partial<ProjectTask>) => void;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = () => iso(new Date());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const daysBetween = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

// ---------- Calendar: the month, each task on its due date; + on a day adds a task due then
export const CalendarView: React.FC<ViewProps> = ({ tasks, tone, onOpen, onAdd }) => {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  // Weeks start on Monday
  const start = addDays(month, -((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const weeks = days.slice(35).every((d) => d.getMonth() !== month.getMonth()) ? days.slice(0, 35) : days;
  const byDay = useMemo(() => {
    const m = new Map<string, ProjectTask[]>();
    tasks.forEach((t) => t.dueDate && m.set(t.dueDate, [...(m.get(t.dueDate) ?? []), t]));
    return m;
  }, [tasks]);
  const undated = tasks.filter((t) => !t.dueDate);
  const today = todayIso();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} aria-label="Previous month" className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))} aria-label="Next month" className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50">
          <ChevronRight className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-bold text-slate-900">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</h3>
        <button
          onClick={() => {
            const d = new Date();
            setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
          }}
          className="ml-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Today
        </button>
      </div>
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
            <span key={d} className="px-2 py-1.5">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.map((d) => {
            const key = iso(d);
            const list = byDay.get(key) ?? [];
            const inMonth = d.getMonth() === month.getMonth();
            return (
              <div key={key} className={`group min-h-[92px] border-b border-r border-slate-100 p-1 space-y-1 ${inMonth ? '' : 'bg-slate-50/60'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-semibold w-5 h-5 rounded-full flex items-center justify-center ${key === today ? 'bg-indigo-600 text-white' : inMonth ? 'text-slate-600' : 'text-slate-300'}`}>
                    {d.getDate()}
                  </span>
                  <button onClick={() => onAdd({ title: 'New task', dueDate: key })} aria-label={`Add a task due ${key}`} className="p-0.5 rounded text-slate-400 hover:text-indigo-700 opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {list.slice(0, 3).map((t) => (
                  <button key={t.id} onClick={() => onOpen(t.id)} title={t.title} className={`w-full text-left truncate px-1.5 py-0.5 rounded text-[11px] font-medium ${tone(t)}`}>
                    {t.title}
                  </button>
                ))}
                {list.length > 3 && <span className="block px-1 text-[10px] text-slate-500">+{list.length - 3} more</span>}
              </div>
            );
          })}
        </div>
      </div>
      {undated.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">No due date · {undated.length}</h4>
          <div className="flex flex-wrap gap-1.5">
            {undated.map((t) => (
              <button key={t.id} onClick={() => onOpen(t.id)} className={`px-2 py-1 rounded-lg text-xs font-medium ${tone(t)}`}>
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Timeline: one row per task by group, a bar from its start (or due) date to its due date
const DAY = 28;
export const TimelineView: React.FC<ViewProps> = ({ project, tasks, tone, onOpen }) => {
  const today = todayIso();
  const dated = tasks.filter((t) => t.dueDate || t.startDate);
  // The window: a week before the earliest date (or today) to two weeks after the latest
  const dates = dated.flatMap((t) => [t.startDate, t.dueDate].filter(Boolean) as string[]);
  const first = iso(addDays(parse([today, ...dates].sort()[0]), -3));
  const last = iso(addDays(parse([iso(addDays(new Date(), 21)), ...dates].sort().at(-1)!), 4));
  const span = daysBetween(first, last) + 1;
  const days = Array.from({ length: span }, (_, i) => addDays(parse(first), i));

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
      <div style={{ width: 220 + span * DAY }} className="relative">
        {/* Day scale, months over days */}
        <div className="flex sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
          <div className="w-[220px] shrink-0 px-3 py-2 text-[11px] font-semibold text-slate-500 sticky left-0 bg-slate-50 z-10">Task</div>
          {days.map((d) => {
            const key = iso(d);
            const weekend = d.getDay() === 0 || d.getDay() === 6;
            return (
              <div key={key} style={{ width: DAY }} className={`shrink-0 text-center py-1 border-l border-slate-100 ${weekend ? 'bg-slate-100/70' : ''}`}>
                {d.getDate() === 1 || key === first ? <div className="text-[9px] font-bold text-slate-500 uppercase">{d.toLocaleDateString('en-GB', { month: 'short' })}</div> : <div className="text-[9px]">&nbsp;</div>}
                <div className={`text-[10px] ${key === today ? 'font-bold text-indigo-700' : 'text-slate-400'}`}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        {/* Today */}
        <div className="absolute top-0 bottom-0 w-px bg-indigo-500/60 z-0" style={{ left: 220 + daysBetween(first, today) * DAY + DAY / 2 }} />
        {project.groups.map((g) => {
          const list = tasks.filter((t) => t.groupId === g.id);
          if (!list.length) return null;
          return (
            <div key={g.id}>
              <div className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50/70 border-b border-slate-100 sticky left-0 w-[220px]">{g.name}</div>
              {list.map((t) => {
                const end = t.dueDate ?? t.startDate;
                const begin = t.startDate && t.dueDate && t.startDate <= t.dueDate ? t.startDate : end;
                return (
                  <div key={t.id} className="relative flex items-center border-b border-slate-50 h-9">
                    <div className="w-[220px] shrink-0 sticky left-0 bg-white z-10 h-full">
                      <button onClick={() => onOpen(t.id)} className="w-full h-full px-3 text-left text-sm text-slate-800 truncate hover:text-indigo-700">
                        {t.title}
                      </button>
                    </div>
                    {begin && end ? (
                      <button
                        onClick={() => onOpen(t.id)}
                        title={`${begin === end ? end : `${begin} → ${end}`}`}
                        className={`absolute h-5 rounded-full text-[10px] font-semibold px-2 truncate text-left ${tone(t)} ${isLate(t) ? 'ring-2 ring-rose-400' : ''}`}
                        style={{ left: 220 + daysBetween(first, begin) * DAY + 3, top: 8, width: Math.max(1, daysBetween(begin, end) + 1) * DAY - 6 }}
                      >
                        {daysBetween(begin, end) >= 2 ? t.title : ''}
                      </button>
                    ) : (
                      <span className="px-3 text-[11px] text-slate-300">No dates</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------- Chart: the figures that matter, then the tasks counted by a field
export interface ChartBar {
  key: string;
  label: string;
  bar: string;
  count: number;
  done: number;
  // How a total is shown (money), when the bars are a column's total rather than a count
  format?: (n: number) => string;
}
export const ChartView: React.FC<{
  tasks: ProjectTask[];
  bars: ChartBar[];
  byLabel: string;
  sums: { title: string; total: string }[];
  noun?: string;
  // The column the bars total, when not counting items
  measure?: string;
  // Whether done/late/stuck mean anything on this board (CRM boards hide the status)
  statusBased?: boolean;
}> = ({ tasks, bars, byLabel, sums, noun = 'Task', measure, statusBased = true }) => {
  const done = tasks.filter((t) => t.status === 'done').length;
  const late = tasks.filter(isLate).length;
  const stuck = tasks.filter((t) => t.status === 'stuck').length;
  const max = Math.max(1, ...bars.map((b) => b.count));
  const tiles = [
    { label: `${noun}s`, value: tasks.length, tone: 'text-slate-900' },
    ...(statusBased
      ? [
          { label: 'Done', value: tasks.length ? `${Math.round((done / tasks.length) * 100)}%` : '–', tone: 'text-emerald-600' },
          { label: 'Late', value: late, tone: late ? 'text-rose-600' : 'text-slate-900' },
          { label: 'Stuck', value: stuck, tone: stuck ? 'text-rose-600' : 'text-slate-900' },
        ]
      : []),
    ...sums.map((s) => ({ label: s.title, value: s.total, tone: 'text-indigo-700' })),
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="p-4 rounded-xl border border-slate-200 bg-white">
            <div className="text-[11px] font-semibold text-slate-500">{t.label}</div>
            <div className={`text-2xl font-bold tabular-nums ${t.tone}`}>{t.value}</div>
          </div>
        ))}
      </div>
      <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
        <h3 className="text-sm font-bold text-slate-900">
          {measure ?? `${noun}s`} by {byLabel.toLowerCase()}
        </h3>
        {bars.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {bars.map((b) => (
              <li key={b.key} className="grid grid-cols-[140px_1fr_96px] items-center gap-3">
                <span className="text-xs font-medium text-slate-700 truncate">{b.label}</span>
                <span className="h-6 rounded-md bg-slate-100 overflow-hidden relative">
                  <span className={`absolute inset-y-0 left-0 ${b.bar} ${statusBased ? 'opacity-40' : ''}`} style={{ width: `${(b.count / max) * 100}%` }} />
                  {statusBased && <span className={`absolute inset-y-0 left-0 ${b.bar}`} style={{ width: `${(b.done / max) * 100}%` }} />}
                </span>
                <span className="text-xs tabular-nums text-slate-600 text-right">
                  {b.format ? b.format(b.count) : b.count}
                  {statusBased && !b.format && <span className="text-slate-400"> · {b.done} done</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {statusBased && <p className="text-[11px] text-slate-400">The solid part of each bar is done; the pale part is still open.</p>}
      </div>
    </div>
  );
};
