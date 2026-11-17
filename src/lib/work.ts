import { Assignment } from '../types';

/**
 * Work a company sent someone on its team, as a task: to do, in progress or done, and whether it's late. Shared by the
 * person's Work tab and the company's Team tab, so both sides see the same status.
 */

export type TaskStatus = 'todo' | 'doing' | 'done';

export const TASK_COLUMNS: { id: TaskStatus; label: string; dot: string }[] = [
  { id: 'todo', label: 'To do', dot: 'bg-slate-400' },
  { id: 'doing', label: 'In progress', dot: 'bg-amber-500' },
  { id: 'done', label: 'Done', dot: 'bg-emerald-500' },
];

export const statusOf = (a: Assignment): TaskStatus => (a.completedAt ? 'done' : a.startedAt ? 'doing' : 'todo');

const today = () => new Date().toISOString().slice(0, 10);
export const isOverdue = (a: Assignment) => !a.completedAt && !!a.dueDate && a.dueDate < today();

export const shortDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

// "Due today", "Due tomorrow", "Due in 3 days", "2 days late"
export function dueLabel(a: Assignment): string | undefined {
  if (!a.dueDate) return undefined;
  if (a.completedAt) return `Due ${shortDate(a.dueDate)}`;
  const days = Math.round((new Date(a.dueDate).getTime() - new Date(today()).getTime()) / 86400000);
  if (days < 0) return `${-days} ${days === -1 ? 'day' : 'days'} late`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days <= 14) return `Due in ${days} days`;
  return `Due ${shortDate(a.dueDate)}`;
}

// What to do first: late, then soonest due, then newest sent; done last, newest first
export const byUrgency = (a: Assignment, b: Assignment) => {
  const sa = statusOf(a) === 'done' ? 1 : 0;
  const sb = statusOf(b) === 'done' ? 1 : 0;
  if (sa !== sb) return sa - sb;
  if (sa === 1) return (b.completedAt ?? '').localeCompare(a.completedAt ?? '');
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate || b.dueDate) return a.dueDate ? -1 : 1;
  return b.assignedAt.localeCompare(a.assignedAt);
};
