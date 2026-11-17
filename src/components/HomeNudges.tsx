import React from 'react';
import { ArrowRight, Briefcase, Check, Clock, Pencil, Play, Sparkles, Target } from 'lucide-react';
import { AssessmentTest, JobPosting, User, isPublic } from '../types';
import { activeProfileOf } from '../lib/jobProfiles';
import { isMainVersion } from '../lib/testLevels';
import { SectorId } from '../lib/sectors';
import { PASS, StepAction, useProfileProgress } from '../lib/profileProgress';
import { jobsUsing } from '../lib/demand';

/**
 * The top of a candidate's home feed: a greeting with where they stand, their next steps as cards (tests first, as
 * proven skills are what companies hire on), and the tests to take next for their path.
 */

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export const HomeNudges: React.FC<{
  candidate: User;
  tests: AssessmentTest[];
  jobs: JobPosting[];
  sector: SectorId;
  onOpenTest: (testId: string) => void;
  onGoTo: (tab: 'tests' | 'jobs' | 'profile') => void;
}> = ({ candidate, tests, jobs, sector, onOpenTest, onGoTo }) => {
  const profile = activeProfileOf(candidate);
  const progress = useProfileProgress({ candidate, shown: { title: profile.title ?? '', bio: profile.bio ?? '' }, activeProfile: profile, tests, jobs, sector });
  const run = (action: StepAction) => {
    const testId = progress.testFor(action);
    if (testId) onOpenTest(testId);
    else if (action === 'next-test' || action === 'sim' || action === 'retake-best') onGoTo('tests');
    else onGoTo('profile');
  };

  // Tests to take next: the path's modules not yet passed, else Praxa tests they haven't tried
  const taken = new Set(candidate.testResults.map((r) => r.testId));
  const pathNext = progress.path.filter((m) => !(m.best !== undefined && m.best >= PASS));
  const recommended =
    pathNext.length > 0
      ? pathNext.map((m) => ({ test: m.test, label: m.sec.label, blurb: m.sec.blurb, best: m.best, isSim: m.isSim, wanted: m.wanted }))
      : tests
          .filter((t) => isPublic(t) && isMainVersion(t) && !taken.has(t.id))
          .slice(0, 6)
          .map((t) => ({ test: t, label: t.title, blurb: t.description, best: undefined, isSim: /simulation/i.test(t.title), wanted: jobsUsing(t, tests, jobs) }));

  const first = candidate.name.split(' ')[0];
  const skillsLeft = Math.max(0, 3 - candidate.verifiedSkills.length);
  const summary = !progress.passedAny
    ? 'Companies can’t see what you can do yet. Your first passed test puts a verified skill on your profile.'
    : skillsLeft > 0
      ? `You have ${candidate.verifiedSkills.length} verified ${candidate.verifiedSkills.length === 1 ? 'skill' : 'skills'}. Prove ${skillsLeft} more and companies shortlist you first.`
      : progress.nextModule
        ? `${progress.passedModules.length} of ${progress.path.length} ${progress.role} modules passed. Keep going to complete your path.`
        : 'Your profile is in great shape. Retake a test to climb its leaderboard.';

  return (
    <div className="space-y-4">
      {/* Greeting and where they stand */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5 sm:p-6 shadow-xs">
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-200/30" aria-hidden="true" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {greeting()}, {first}
            </h1>
            <p className="text-sm text-slate-600">{summary}</p>
          </div>
          {progress.nextModule && (
            <button
              onClick={() => onOpenTest(progress.nextModule!.test.id)}
              className="shrink-0 px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              {progress.nextModule.best === undefined ? `Start ${progress.nextModule.sec.label}` : `Retake ${progress.nextModule.sec.label}`}
            </button>
          )}
        </div>
      </section>

      {/* Next steps, like LinkedIn's profile prompts */}
      {progress.todo.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Your next steps</h2>
              <p className="text-xs text-slate-500">
                Profile strength {progress.strength}% · {progress.level}
              </p>
            </div>
            <button onClick={() => onGoTo('profile')} className="text-xs font-semibold text-indigo-700 hover:underline shrink-0">
              See profile
            </button>
          </div>
          <ul className="flex gap-3 overflow-x-auto snap-x pb-1 -mx-1 px-1">
            {progress.todo.slice(0, 5).map((s) => (
              <li key={s.id} className="snap-start shrink-0 w-56">
                <div className={`h-full p-4 rounded-xl border flex flex-col gap-2 ${s.test ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center ${s.test ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {s.test ? <Target className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                    </span>
                    <span className="text-[11px] font-bold font-mono text-emerald-700">+{s.weight}%</span>
                  </div>
                  <div className="text-sm font-bold text-slate-900">{s.label}</div>
                  <p className="text-xs text-slate-600 flex-1">{s.hint}</p>
                  <button
                    onClick={() => run(s.action)}
                    className={`self-start px-3.5 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                      s.test ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {s.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tests to take next */}
      {recommended.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                {pathNext.length > 0 ? `Recommended for your ${progress.role} path` : 'Recommended tests'}
              </h2>
              <p className="text-xs text-slate-500">No invite needed. Score {PASS}+ and the skill goes on your profile, verified.</p>
            </div>
            <button onClick={() => onGoTo('tests')} className="text-xs font-semibold text-indigo-700 hover:underline shrink-0">
              All tests
            </button>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recommended.slice(0, 4).map((r) => (
              <li key={r.test.id}>
                <button onClick={() => onOpenTest(r.test.id)} className="group w-full h-full text-left p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col gap-2">
                  <span className="flex items-center gap-2">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${r.isSim ? 'bg-violet-100 text-violet-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {r.isSim ? <Briefcase className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-slate-900 group-hover:text-indigo-700 truncate">{r.label}</span>
                      <span className="block text-[11px] text-slate-500 inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />~{r.test.estimatedMinutes} min{r.wanted > 0 && ` · wanted by ${r.wanted} ${r.wanted === 1 ? 'job' : 'jobs'}`}
                      </span>
                    </span>
                  </span>
                  <span className="text-xs text-slate-600 line-clamp-2">{r.blurb}</span>
                  <span className="mt-auto text-xs font-semibold text-indigo-700 inline-flex items-center gap-1">
                    {r.best === undefined ? 'Start' : (
                      <>
                        Retake · best {r.best}
                      </>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {progress.passedModules.length > 0 && (
            <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Passed: {progress.passedModules.map((m) => m.sec.label).join(', ')}
            </p>
          )}
        </section>
      )}
    </div>
  );
};
