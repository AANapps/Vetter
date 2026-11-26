import React from 'react';
import { ArrowRight, Monitor, Play } from 'lucide-react';
import { AssessmentTest, User, isJobSim, isPublic } from '../types';

/**
 * A candidate's job simulations on their profile, apart from their skills tests: each day they've done, their best
 * score and how many tries, the strongest proof on Granyt that someone can do the job. On their own profile, with
 * none done yet, it invites them to do the one for the job they're after.
 */
export const JobSimRecord: React.FC<{
  person: User;
  tests: AssessmentTest[];
  onOpenTest: (testId: string) => void;
  // Their own profile: an invitation when there's none yet
  own?: boolean;
  className?: string;
}> = ({ person, tests, onOpenTest, own, className = '' }) => {
  const done = tests
    .filter((t) => isJobSim(t) && isPublic(t))
    .flatMap((test) => {
      const attempts = person.testResults.filter((r) => r.testId === test.id);
      if (!attempts.length) return [];
      const best = Math.max(...attempts.map((r) => r.score));
      return [{ test, best, attempts: attempts.length }];
    })
    .sort((a, b) => b.best - a.best);
  const forRole = tests.find((t) => isJobSim(t) && isPublic(t) && !!person.targetRole && t.roles?.includes(person.targetRole)) ?? tests.find((t) => isJobSim(t) && isPublic(t));
  if (!done.length && !own) return null;
  const first = person.name.split(' ')[0];
  return (
    <section className={`bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs ${className}`}>
      <h2 className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
        <Monitor className="w-5 h-5 text-indigo-600" />
        Job simulations
      </h2>
      <p className="text-xs text-slate-500">
        {own ? 'A real working day in the role, marked by Granyt: the strongest proof you can do the job.' : `A real working day in the role, marked by Granyt: proof ${first} can do the job, not just a CV line.`}
      </p>
      {done.length ? (
        <ul className="mt-3 divide-y divide-slate-100">
          {done.map((d) => (
            <li key={d.test.id}>
              <button onClick={() => onOpenTest(d.test.id)} className="w-full py-3 flex items-center gap-4 text-left group">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 text-indigo-600">
                  <Monitor className="w-5 h-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900 group-hover:text-indigo-700">{d.test.roles?.[0] ?? d.test.title}</span>
                  <span className="block text-xs text-slate-500 truncate">
                    {d.test.title.replace(/^.*?:\s*/, '')}
                    {d.attempts > 1 && ` · ${d.attempts} attempts`}
                  </span>
                </span>
                <span className="font-mono text-xl font-bold tabular-nums text-slate-900">{d.best}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        forRole && (
          <div className="mt-4 p-5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">Show companies you can do the job</p>
              <p className="text-xs text-slate-600">
                The {forRole.roles?.[0] ?? ''} job simulation is about {forRole.estimatedMinutes} minutes of the real work. Your score shows here.
              </p>
            </div>
            <button onClick={() => onOpenTest(forRole.id)} className="shrink-0 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 fill-current" />
              Start the day
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      )}
    </section>
  );
};
