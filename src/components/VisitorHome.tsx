import React from 'react';
import { ArrowRight, BadgeCheck, Briefcase, ClipboardCheck, Clock, Trophy } from 'lucide-react';
import { AssessmentTest, JobPosting } from '../types';
import { AppTab } from './Navigation';

interface VisitorHomeProps {
  tests: AssessmentTest[];
  jobs: JobPosting[];
  onOpenTest: (testId: string) => void;
  onOpenJob: (jobId: string) => void;
  onGoTo: (tab: AppTab) => void;
  onJoin: () => void;
}

const STEPS = [
  { icon: ClipboardCheck, title: 'Take a free test', text: 'Short tests and job simulations, 10 to 25 minutes, in the skills jobs actually ask for.' },
  { icon: BadgeCheck, title: 'Get a verified score', text: 'Your score and rank go on your profile, so you never have to prove the same skill twice.' },
  { icon: Briefcase, title: 'Apply with it', text: 'Companies on Vetter hire on test results. Your score goes with every application.' },
];

// What a signed-out visitor sees first: what Vetter is in one line, a path for each audience, and real tests and jobs
export const VisitorHome: React.FC<VisitorHomeProps> = ({ tests, jobs, onOpenTest, onOpenJob, onGoTo, onJoin }) => {
  // Vetter's own tests, one per family (not every level of each)
  const popularTests = tests.filter((t) => t.type === 'standard' && (!t.familyId || t.familyId === t.id)).slice(0, 6);
  const latestJobs = [...jobs].sort((a, b) => b.postedDate.localeCompare(a.postedDate)).slice(0, 4);

  return (
    <div>
      {/* What Vetter is, and the two ways in */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
          Get hired for
          <br />
          what you can do
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          Vetter is a hiring site where skills come first. Candidates take short tests instead of sending CVs, and companies hire the people who score best.
        </p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto text-left">
          <div className="rounded-2xl bg-white p-6 sm:p-8 flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Looking for work</span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Prove your skills</h2>
            <p className="mt-2 text-sm text-slate-600 flex-1">Take a free test, get a verified score, and apply to jobs that hire on it. Free, always.</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button onClick={() => onGoTo('tests')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                Browse tests <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => onGoTo('jobs')} className="px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900">
                See jobs
              </button>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-6 sm:p-8 flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Hiring</span>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">Find people who can do the job</h2>
            <p className="mt-2 text-sm text-slate-300 flex-1">Send candidates a test or a job simulation. Vetter marks it and ranks them for you. Your first job is free.</p>
            <div className="mt-6">
              <button onClick={() => onGoTo('for-business')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100">
                Vetter for business <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works for candidates */}
      <section className="bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">How it works</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="text-center">
                  <span className="mx-auto w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                    <Icon className="w-6 h-6" />
                  </span>
                  <h3 className="mt-4 font-bold text-slate-900">
                    {i + 1}. {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600 max-w-xs mx-auto">{step.text}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Real tests to start on */}
      {popularTests.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Popular tests</h2>
              <p className="mt-1 text-sm text-slate-600">No invite needed. Your best score on each goes on your profile.</p>
            </div>
            <button onClick={() => onGoTo('tests')} className="shrink-0 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
              All tests
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularTests.map((t) => (
              <button key={t.id} onClick={() => onOpenTest(t.id)} className="group rounded-2xl bg-white p-5 text-left flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.category}</span>
                <span className="mt-1 font-bold text-slate-900 group-hover:text-indigo-700 line-clamp-2">{t.title}</span>
                <span className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span>{t.difficulty}</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> ~{t.estimatedMinutes} min
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Real jobs hiring on tests */}
      {latestJobs.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Hiring on Vetter</h2>
              <p className="mt-1 text-sm text-slate-600">Jobs where your test score counts.</p>
            </div>
            <button onClick={() => onGoTo('jobs')} className="shrink-0 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
              All jobs
            </button>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {latestJobs.map((j) => (
              <li key={j.id}>
                <button onClick={() => onOpenJob(j.id)} className="group w-full rounded-2xl bg-white p-5 text-left flex items-center gap-4">
                  <img src={j.companyLogo} alt="" referrerPolicy="no-referrer" className="w-11 h-11 rounded-lg object-cover bg-slate-100 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-slate-900 group-hover:text-indigo-700 truncate">{j.title}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {j.companyName} · {j.location} · {j.workType}
                    </span>
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700">
                    <Trophy className="w-3.5 h-3.5" /> {j.testIds.length} {j.testIds.length === 1 ? 'test' : 'tests'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Sign up */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Let your skills speak for you</h2>
        <p className="mt-2 text-slate-600">Join free, take your first test in minutes, and get seen by companies hiring on skill.</p>
        <button onClick={onJoin} className="mt-6 px-6 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          Join Vetter free
        </button>
      </section>
    </div>
  );
};
