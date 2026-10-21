import React from 'react';
import { Exam, User } from '../types';
import { examsFor, STATUS_LABELS } from '../lib/exams';
import { ClipboardList, ChevronRight } from 'lucide-react';

interface TodoListProps {
  candidate: User;
  exams: Exam[];
  onOpenExam: (examId: string) => void;
}

const DAY = 86400000;
const today = () => new Date().toISOString().split('T')[0];

function dueLabel(dueDate?: string) {
  if (!dueDate) return 'No deadline';
  const days = Math.round((new Date(dueDate).getTime() - new Date(today()).getTime()) / DAY);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  return days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
}

// The exams a candidate has been invited to, at the top of their profile
export const TodoList: React.FC<TodoListProps> = ({ candidate, exams, onOpenExam }) => {
  const items = examsFor(candidate, exams);
  if (items.length === 0) return null;
  const open = items.filter((i) => i.progress.score === undefined);
  const finished = items.filter((i) => i.progress.score !== undefined);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs" aria-labelledby="todo-heading">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-indigo-600" />
        <h2 id="todo-heading" className="text-base font-bold text-slate-900">
          To do
        </h2>
        {open.length > 0 && (
          <span className="px-1.5 py-px rounded-full bg-indigo-600 text-white text-[11px] font-bold tabular-nums">{open.length}</span>
        )}
      </div>

      {open.length === 0 && <p className="text-xs text-slate-500">You're all caught up.</p>}

      <ul className="space-y-2">
        {open.map(({ exam, progress }) => {
          const overdue = dueLabel(exam.dueDate) === 'Overdue';
          return (
            <li key={exam.id}>
              <button
                onClick={() => onOpenExam(exam.id)}
                className="w-full text-left flex items-center gap-4 p-3 rounded-xl ring-1 ring-slate-200 hover:ring-slate-400 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 truncate">{exam.title}</div>
                  <div className="text-xs text-slate-500">
                    {exam.companyName} &middot; {progress.total} tests &middot;{' '}
                    <span className={overdue ? 'text-rose-700 font-semibold' : ''}>{dueLabel(exam.dueDate)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 max-w-48 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                    </div>
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {progress.done}/{progress.total} done
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-700 flex items-center gap-0.5 shrink-0">
                  {progress.done === 0 ? 'Start' : 'Continue'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {finished.length > 0 && (
        <div className="pt-3 border-t border-slate-100 space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-500">Completed</div>
          {finished.map(({ exam, progress }) => (
            <button
              key={exam.id}
              onClick={() => onOpenExam(exam.id)}
              className="w-full flex items-center justify-between gap-3 text-xs text-left hover:text-indigo-700"
            >
              <span className="truncate text-slate-700">
                {exam.title} <span className="text-slate-400">&middot; {exam.companyName}</span>
              </span>
              <span className={`shrink-0 font-semibold ${progress.status === 'passed' ? 'text-emerald-700' : 'text-rose-700'}`}>
                {progress.score}/100 &middot; {STATUS_LABELS[progress.status]}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
