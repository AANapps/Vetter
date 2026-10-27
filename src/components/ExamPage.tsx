import React from 'react';
import { AssessmentTest, Business, Exam, User } from '../types';
import { examProgress, totalMinutes } from '../lib/exams';
import { dueLabel } from './CandidateHome';
import { ArrowLeft, CheckCircle2, Clock, Play, Send } from 'lucide-react';

interface ExamPageProps {
  exam: Exam;
  business?: Business;
  tests: AssessmentTest[];
  candidate: User;
  onStartTest: (test: AssessmentTest) => void;
  onOpenTest: (testId: string) => void;
  onBack: () => void;
}

// What an invite to tests opens: who sent it, the tests to take, and the result once they're done
export const ExamPage: React.FC<ExamPageProps> = ({ exam, business, tests, candidate, onStartTest, onOpenTest, onBack }) => {
  const progress = examProgress(exam, candidate);
  const examTests = exam.testIds.map((id) => tests.find((t) => t.id === id)).filter((t): t is AssessmentTest => !!t);
  const next = examTests.find((t) => progress.scores[t.id] === undefined);
  const isDone = progress.score !== undefined;
  const passed = progress.status === 'passed';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <button onClick={onBack} className="text-xs font-semibold text-slate-500 hover:text-indigo-700 flex items-center gap-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        Home
      </button>

      <div className="text-center space-y-3">
        {business && (
          <img src={business.logo} alt="" referrerPolicy="no-referrer" className="w-16 h-16 rounded-2xl object-cover bg-slate-100 mx-auto shadow-xs" />
        )}
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{exam.companyName}</span> invited you to take the tests for
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{exam.title}</h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">{exam.description}</p>
        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>
            {examTests.length} {examTests.length === 1 ? 'test' : 'tests'}
          </span>
          <span>&middot;</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />~{totalMinutes(exam, tests)} min
          </span>
          <span>&middot;</span>
          <span>Pass mark {exam.passingScore}</span>
          <span>&middot;</span>
          <span className={dueLabel(exam.dueDate) === 'Overdue' ? 'text-rose-700 font-semibold' : ''}>{dueLabel(exam.dueDate)}</span>
        </div>
      </div>

      {isDone ? (
        <div className={`rounded-2xl p-6 text-center space-y-2 ${passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
          <div className={`text-4xl font-bold font-mono tabular-nums ${passed ? 'text-emerald-700' : 'text-slate-900'}`}>
            {progress.score}
            <span className="text-base text-slate-400 font-normal">/100</span>
          </div>
          <div className={`text-sm font-semibold ${passed ? 'text-emerald-800' : 'text-slate-700'}`}>
            {passed ? 'You passed' : `Below the pass mark of ${exam.passingScore}`}
          </div>
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <Send className="w-3.5 h-3.5" />
            Your results have been sent to {exam.companyName}. You can retake a test to improve your score.
          </p>
        </div>
      ) : (
        next && (
          <button
            onClick={() => onStartTest(next)}
            className="w-full py-3.5 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center justify-center gap-2 shadow-sm"
          >
            <Play className="w-4 h-4 fill-current" />
            {progress.done === 0 ? 'Start' : 'Continue with'} {examTests.length > 1 ? `test ${examTests.indexOf(next) + 1}` : 'the test'}
          </button>
        )
      )}

      <ol className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {examTests.map((t, i) => {
          const score = progress.scores[t.id];
          return (
            <li key={t.id} className="px-5 py-4 flex items-center gap-4">
              {score !== undefined ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <span
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    t.id === next?.id ? 'border-indigo-600 text-indigo-700' : 'border-slate-300 text-slate-400'
                  }`}
                >
                  {i + 1}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <button onClick={() => onOpenTest(t.id)} className="text-sm font-semibold text-slate-900 hover:text-indigo-700 text-left">
                  {t.title}
                </button>
                <div className="text-xs text-slate-500">
                  {t.difficulty} &middot; {t.questions.length} tasks &middot; ~{t.estimatedMinutes} min
                </div>
              </div>
              {score !== undefined ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">{score}</span>
                  <button onClick={() => onStartTest(t)} className="text-xs font-semibold text-slate-500 hover:text-indigo-700">
                    Retake
                  </button>
                </div>
              ) : (
                t.id !== next?.id && (
                  <button onClick={() => onStartTest(t)} className="text-xs font-semibold text-indigo-700 hover:underline">
                    Start
                  </button>
                )
              )}
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-slate-500 text-center">
        Take the tests in any order, each in one sitting. Your best score on each counts, and goes to {exam.companyName}.
      </p>
    </div>
  );
};
