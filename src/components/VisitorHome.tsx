import React from 'react';
import { Pic } from './Pic';
import { ArrowRight, BadgeCheck, Briefcase, CheckCircle2, ClipboardCheck, Clock, Trophy } from 'lucide-react';
import { AssessmentTest, JobPosting, isPublic } from '../types';
import { AppTab } from './Navigation';
import { TestTypeCards } from './TestTypeCards';
import { BusinessLanding } from './BusinessLanding';

export type HomeAudience = 'candidates' | 'business';

interface VisitorHomeProps {
  // Who the page is for: people looking for work, or companies hiring (at /#/business)
  audience: HomeAudience;
  onAudienceChange: (audience: HomeAudience) => void;
  tests: AssessmentTest[];
  jobs: JobPosting[];
  onOpenTest: (testId: string) => void;
  onOpenJob: (jobId: string) => void;
  onGoTo: (tab: AppTab) => void;
  onJoin: (reason?: string) => void;
  onOpenGuide: (slug: string | null) => void;
}

// The switch at the top of the home page between its two sides
const AudienceSwitch: React.FC<{ audience: HomeAudience; onChange: (a: HomeAudience) => void }> = ({ audience, onChange }) => (
  <div className="pt-8 sm:pt-10 flex justify-center px-4">
    <div role="tablist" aria-label="Who Vetter is for" className="inline-flex rounded-full border border-slate-300 bg-white p-1 text-sm font-semibold">
      {(
        [
          ['candidates', 'Looking for work'],
          ['business', 'Hiring'],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={audience === id}
          onClick={() => onChange(id)}
          className={`px-4 sm:px-5 py-1.5 rounded-full transition-colors ${audience === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
);

const STEPS = [
  { icon: ClipboardCheck, title: 'Take a free test', text: 'Short tests and job simulations, 10 to 25 minutes, in the skills jobs actually ask for.' },
  { icon: BadgeCheck, title: 'Get a verified score', text: 'Your score and rank go on your profile, so you never have to prove the same skill twice.' },
  { icon: Briefcase, title: 'Apply with it', text: 'Companies on Vetter hire on test results. Your score goes with every application.' },
];

// What a signed-out visitor sees first, tailored to who they are: for people looking for work, how it works, what a
// test asks and real tests and jobs; for companies hiring, everything about hiring on Vetter, with the plans
export const VisitorHome: React.FC<VisitorHomeProps> = ({ audience, onAudienceChange, tests, jobs, onOpenTest, onOpenJob, onGoTo, onJoin, onOpenGuide }) => {
  if (audience === 'business') {
    return (
      <div>
        <AudienceSwitch audience={audience} onChange={onAudienceChange} />
        <BusinessLanding onJoin={onJoin} onOpenGuide={onOpenGuide} />
      </div>
    );
  }
  // Vetter's own tests, one per family (not every level of each)
  const popularTests = tests.filter((t) => isPublic(t) && (!t.familyId || t.familyId === t.id)).slice(0, 6);
  const latestJobs = [...jobs].sort((a, b) => b.postedDate.localeCompare(a.postedDate)).slice(0, 4);

  return (
    <div>
      <AudienceSwitch audience={audience} onChange={onAudienceChange} />

      {/* What Vetter is for people looking for work */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-16 text-center">
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
          Get hired for
          <br />
          what you can do
        </h1>
        <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
          Take short skills tests instead of sending CVs. Your verified score goes on your profile and with every application, and companies hire
          the people who score best.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <button onClick={() => onGoTo('tests')} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
            Browse tests <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => onGoTo('jobs')} className="px-6 py-3 rounded-full text-sm font-semibold text-slate-700 hover:text-slate-900">
            See jobs
          </button>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-600">
          {['Free, always', 'No CV needed', 'Keep your scores'].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t}
            </li>
          ))}
        </ul>
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

      {/* What a test can ask: the kinds of question, each drawn */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">What’s in a test</h2>
          <p className="mt-1 text-sm text-slate-600">
            Tests mix these question types, from quick multiple choice to hands-on tasks in the tools of the job.
          </p>
        </div>
        <div className="mt-6">
          <TestTypeCards />
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
              <button key={t.id} onClick={() => onOpenTest(t.id)} className="group rounded-2xl bg-white border border-slate-200 p-5 text-left flex flex-col">
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
                <button onClick={() => onOpenJob(j.id)} className="group w-full rounded-2xl bg-white border border-slate-200 p-5 text-left flex items-center gap-4">
                  <Pic src={j.companyLogo} alt="" referrerPolicy="no-referrer" className="w-11 h-11 rounded-lg object-cover bg-slate-100 shrink-0" />
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
        <button onClick={() => onJoin()} className="mt-6 px-6 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          Join Vetter free
        </button>
      </section>
    </div>
  );
};
