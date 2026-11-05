import React, { useState } from 'react';
import { CheckCircle2, Globe } from 'lucide-react';
import { AssessmentTest, levelName } from '../types';

// Shown to the Vetter team: companies' tests asking to join the public library. Each can be opened to read and try,
// then approved (every company can use it, every candidate can take it) or turned down with a reason the company sees
export const PublicTestReview: React.FC<{
  tests: AssessmentTest[];
  onOpen: (testId: string) => void;
  onDecide: (testId: string, approve: boolean, note?: string) => void;
}> = ({ tests, onOpen, onDecide }) => {
  const queue = tests.filter((t) => t.type === 'custom' && t.publicStatus === 'pending').sort((a, b) => (a.publicAskedAt ?? '').localeCompare(b.publicAskedAt ?? ''));
  // The test being turned down, and why
  const [declining, setDeclining] = useState<string | null>(null);
  const [note, setNote] = useState('');
  if (queue.length === 0) return null;
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-indigo-600" />
          {queue.length === 1 ? '1 test' : `${queue.length} tests`} asking to join the public library
        </h2>
        <p className="text-xs text-slate-600">Open each to read it and try it as a candidate. Approved, every company can add it to a job and every candidate can take it.</p>
        <ul className="divide-y divide-indigo-200">
          {queue.map((t) => (
            <li key={t.id} className="py-2.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <button onClick={() => onOpen(t.id)} className="min-w-0 text-left group">
                  <span className="font-semibold text-slate-900 group-hover:text-indigo-700 group-hover:underline">{t.title}</span>
                  <span className="block text-xs text-slate-600">
                    {t.companyName} &middot; {t.category} &middot; {levelName(t.difficulty)} &middot; {t.totalQuestions} {t.totalQuestions === 1 ? 'question' : 'questions'} &middot; ~{t.estimatedMinutes} min
                    {t.publicAskedAt && <> &middot; asked {new Date(t.publicAskedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</>}
                  </span>
                </button>
                <span className="flex gap-2">
                  <button onClick={() => onDecide(t.id, true)} className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve
                  </button>
                  <button
                    onClick={() => (setDeclining(declining === t.id ? null : t.id), setNote(''))}
                    aria-expanded={declining === t.id}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg"
                  >
                    Turn down
                  </button>
                </span>
              </div>
              {declining === t.id && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onDecide(t.id, false, note);
                    setDeclining(null);
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <input
                    autoFocus
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Why, for the company: e.g. two questions have the wrong answer marked"
                    aria-label="Why it was turned down"
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                  <button type="submit" className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg">
                    Turn it down
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
