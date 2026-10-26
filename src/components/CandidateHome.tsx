import React, { useState } from 'react';
import { AssessmentTest, Business, Exam, User } from '../types';
import { STATUS_LABELS, examsFor, totalMinutes } from '../lib/exams';
import { ArrowRight, Briefcase, ClipboardCheck, Link2, UserRound } from 'lucide-react';

interface CandidateHomeProps {
  candidate: User;
  exams: Exam[];
  tests: AssessmentTest[];
  businesses: Business[];
  onOpenExam: (examId: string) => void;
  onGoTo: (tab: 'tests' | 'jobs' | 'profile') => void;
}

const DAY = 86400000;
const today = () => new Date().toISOString().split('T')[0];

export function dueLabel(dueDate?: string) {
  if (!dueDate) return 'No deadline';
  const days = Math.round((new Date(dueDate).getTime() - new Date(today()).getTime()) / DAY);
  if (days < 0) return 'Overdue';
  if (days === 0) return 'Due today';
  return days === 1 ? 'Due tomorrow' : `Due in ${days} days`;
}

// A pasted assessment link, or just its id
const examIdFromLink = (text: string) => {
  const match = text.trim().match(/#\/exams\/([^?\s]+)/);
  return match ? decodeURIComponent(match[1]) : text.trim();
};

// A candidate's home: the assessments companies sent them, what's left to do and how they did
export const CandidateHome: React.FC<CandidateHomeProps> = ({ candidate, exams, tests, businesses, onOpenExam, onGoTo }) => {
  const items = examsFor(candidate, exams);
  const open = items.filter((i) => i.progress.score === undefined);
  const finished = items.filter((i) => i.progress.score !== undefined);
  const [pasted, setPasted] = useState('');
  const [linkError, setLinkError] = useState(false);

  const openPasted = (e: React.FormEvent) => {
    e.preventDefault();
    const id = examIdFromLink(pasted);
    if (!exams.some((x) => x.id === id)) {
      setLinkError(true);
      return;
    }
    setPasted('');
    onOpenExam(id);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hi {candidate.name.split(' ')[0]}</h1>
        <p className="text-sm text-slate-500">
          {open.length === 0
            ? "You're all caught up."
            : `${open.length} ${open.length === 1 ? 'assessment' : 'assessments'} from companies waiting for you.`}
        </p>
      </div>

      {open.length > 0 && (
        <ul className="space-y-3">
          {open.map(({ exam, progress }) => {
            const business = businesses.find((b) => b.id === exam.businessId);
            const due = dueLabel(exam.dueDate);
            return (
              <li key={exam.id}>
                <button
                  onClick={() => onOpenExam(exam.id)}
                  className="group w-full text-left bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 flex items-center gap-4 transition-colors shadow-xs"
                >
                  {business && (
                    <img src={business.logo} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-500">{exam.companyName}</div>
                    <div className="text-base font-bold text-slate-900 group-hover:text-indigo-700">{exam.title}</div>
                    <div className="text-xs text-slate-500">
                      {progress.total} {progress.total === 1 ? 'test' : 'tests'} &middot; ~{totalMinutes(exam, tests)} min &middot;{' '}
                      <span className={due === 'Overdue' ? 'text-rose-700 font-semibold' : ''}>{due}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="h-1.5 flex-1 max-w-56 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {progress.done}/{progress.total} done
                      </span>
                    </div>
                  </div>
                  <span className="hidden sm:flex px-4 py-2 text-sm font-semibold text-white bg-indigo-600 group-hover:bg-indigo-700 rounded-lg items-center gap-1.5 shrink-0">
                    {progress.done === 0 ? 'Start' : 'Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={openPasted} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
        <label htmlFor="paste-link" className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
          <Link2 className="w-4 h-4 text-indigo-600" />
          Got a link from a company?
        </label>
        <div className="flex gap-2">
          <input
            id="paste-link"
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              setLinkError(false);
            }}
            placeholder="Paste it here"
            className="flex-1 min-w-0 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
          />
          <button type="submit" disabled={!pasted.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-700 disabled:opacity-40 rounded-lg">
            Open
          </button>
        </div>
        {linkError && <p className="text-xs font-semibold text-rose-700">That link doesn't match an assessment. Check it and try again.</p>}
      </form>

      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Finished</h2>
          <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            {finished.map(({ exam, progress }) => (
              <li key={exam.id}>
                <button onClick={() => onOpenExam(exam.id)} className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{exam.title}</span>
                    <span className="block text-xs text-slate-500">Sent to {exam.companyName}</span>
                  </span>
                  <span className={`text-sm font-bold font-mono tabular-nums ${progress.status === 'passed' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {progress.score}
                  </span>
                  <span className={`text-xs font-semibold w-28 text-right ${progress.status === 'passed' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {STATUS_LABELS[progress.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={() => onGoTo('profile')} className="text-left p-5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl space-y-1 transition-colors">
          <UserRound className="w-5 h-5 text-indigo-600" />
          <div className="text-sm font-bold text-slate-900">Your profile</div>
          <p className="text-xs text-slate-500">Your verified skills and every test you've taken.</p>
        </button>
        <button onClick={() => onGoTo('tests')} className="text-left p-5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl space-y-1 transition-colors">
          <ClipboardCheck className="w-5 h-5 text-indigo-600" />
          <div className="text-sm font-bold text-slate-900">Practise</div>
          <p className="text-xs text-slate-500">Take Vetter's tests any time. Your best scores go on your profile.</p>
        </button>
        <button onClick={() => onGoTo('jobs')} className="text-left p-5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl space-y-1 transition-colors">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          <div className="text-sm font-bold text-slate-900">Find jobs</div>
          <p className="text-xs text-slate-500">Apply to jobs that hire on test results.</p>
        </button>
      </div>
    </div>
  );
};
