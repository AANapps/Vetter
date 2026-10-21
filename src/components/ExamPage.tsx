import React from 'react';
import { AssessmentTest, Exam, User } from '../types';
import { examProgress, STATUS_LABELS, totalMinutes } from '../lib/exams';
import { CheckCircle2, Circle, Play } from 'lucide-react';

interface ExamPageProps {
  exam: Exam;
  tests: AssessmentTest[];
  candidate: User;
  onStartTest: (test: AssessmentTest) => void;
  onOpenTest: (testId: string) => void;
  onBack: () => void;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// An exam a candidate was invited to: its tests in order, what's done, and the overall result
export const ExamPage: React.FC<ExamPageProps> = ({ exam, tests, candidate, onStartTest, onOpenTest, onBack }) => {
  const progress = examProgress(exam, candidate);
  const examTests = exam.testIds.map((id) => tests.find((t) => t.id === id)).filter((t): t is AssessmentTest => !!t);
  const next = examTests.find((t) => progress.scores[t.id] === undefined);
  const statusClass =
    progress.status === 'passed'
      ? 'bg-emerald-50 text-emerald-800'
      : progress.status === 'failed'
      ? 'bg-rose-50 text-rose-800'
      : 'bg-slate-100 text-slate-700';

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <button onClick={onBack} className="text-xs font-semibold text-slate-500 hover:text-indigo-700 transition-colors">
        &larr; Back to profile
      </button>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 font-bold">
              Exam &middot; {exam.companyName}
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{exam.title}</h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">{exam.description}</p>
          </div>
          <span className={`self-start px-2.5 py-1 rounded-full text-xs font-semibold ${statusClass}`}>{STATUS_LABELS[progress.status]}</span>
        </div>

        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-slate-200 text-xs">
          <div>
            <dt className="text-slate-500">Progress</dt>
            <dd className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {progress.done}/{progress.total} tests
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">{progress.score !== undefined ? 'Exam score' : 'Pass mark'}</dt>
            <dd className="text-lg font-bold text-slate-900 font-mono tabular-nums">
              {progress.score !== undefined ? `${progress.score}/100` : `${exam.passingScore}/100 average`}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Time needed</dt>
            <dd className="text-lg font-bold text-slate-900 font-mono tabular-nums">~{totalMinutes(exam, tests)} min</dd>
          </div>
          <div>
            <dt className="text-slate-500">Due</dt>
            <dd className="text-lg font-bold text-slate-900">{exam.dueDate ? formatDate(exam.dueDate) : 'No deadline'}</dd>
          </div>
        </dl>

        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Tests in this exam</h2>
          <p className="text-xs text-slate-500">
            Take them in any order, each in one sitting. Your best score on each since you were invited counts.
          </p>
        </div>
        <ol className="divide-y divide-slate-100">
          {examTests.map((t, i) => {
            const score = progress.scores[t.id];
            return (
              <li key={t.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {score !== undefined ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <button onClick={() => onOpenTest(t.id)} className="text-sm font-semibold text-slate-900 hover:text-indigo-700 text-left">
                      {i + 1}. {t.title}
                    </button>
                    <div className="text-xs text-slate-500">
                      {t.difficulty} &middot; {t.questions.length} tasks &middot; ~{t.estimatedMinutes} min
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  {score !== undefined && (
                    <span className="text-sm font-bold font-mono tabular-nums text-slate-900">{score}/100</span>
                  )}
                  <button
                    onClick={() => onStartTest(t)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                      score === undefined && t.id === next?.id ? 'text-white bg-indigo-600 hover:bg-indigo-700' : 'text-slate-700 bg-white'
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>{score === undefined ? 'Start' : 'Retake'}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
