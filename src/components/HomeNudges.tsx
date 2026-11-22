import React from 'react';
import { ArrowRight, Briefcase, Building2, CalendarClock, CheckCircle2, Clock, ListTodo, MapPin, Monitor, Play, Sparkles, Wallet } from 'lucide-react';
import { Pic } from './Pic';
import { Assignment, AssessmentTest, JobPosting, TeamMember, User, isJobSim, isPublic } from '../types';
import { activeProfileOf } from '../lib/jobProfiles';
import { SectorId } from '../lib/sectors';
import { useProfileProgress } from '../lib/profileProgress';
import { getBestTestScore } from '../lib/matchingAlgorithm';
import { invitesFor, jobTestProgress, jobTestsOf, totalMinutes } from '../lib/jobTests';
import { isOverdue } from '../lib/work';

/**
 * The top of a candidate's home: one list of what to do next, most important first. Jobs waiting on their tests, then
 * work from their team, then one Praxa test to build their profile. Nothing else competes with it.
 */

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

interface Todo {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  urgent?: boolean;
}

export const HomeNudges: React.FC<{
  candidate: User;
  tests: AssessmentTest[];
  jobs: JobPosting[];
  sector: SectorId;
  teamInvites: TeamMember[];
  teamWork: Assignment[];
  onOpenTest: (testId: string) => void;
  onOpenJob: (jobId: string) => void;
  onGoTo: (tab: 'tests' | 'jobs' | 'profile' | 'work') => void;
  // Every test (a job's tests may be outside the sector shown), and starting one of a job's tests from its invitation
  allTests?: AssessmentTest[];
  onStartJobTest?: (test: AssessmentTest, jobId: string) => void;
}> = ({ candidate, tests, jobs, sector, teamInvites, teamWork, onOpenTest, onOpenJob, onGoTo, allTests = tests, onStartJobTest }) => {
  const profile = activeProfileOf(candidate);
  const progress = useProfileProgress({ candidate, shown: { title: profile.title ?? '', bio: profile.bio ?? '' }, activeProfile: profile, tests, jobs, sector });

  // 1. Jobs waiting on them: ones a company sent them, and ones they've started from a link but not applied to
  const applied = new Set(candidate.appliedJobIds ?? []);
  const invited = invitesFor(candidate, jobs).filter((i) => i.progress.score === undefined);
  const started = jobs
    .filter((j) => j.status === 'active' && j.testIds.length && !applied.has(j.id) && !invited.some((i) => i.job.id === j.id))
    .map((job) => ({ job, progress: jobTestProgress(job, candidate) }))
    .filter((i) => i.progress.done > 0 && i.progress.done < i.progress.total);
  const todos: Todo[] = started.map(({ job, progress: p }) => ({
    key: `job-${job.id}`,
    icon: Briefcase,
    tone: 'bg-indigo-600 text-white',
    kicker: `${job.companyName} · job tests`,
    title: job.title,
    body: `${p.done} of ${p.total} ${p.total === 1 ? 'test' : 'tests'} done · about ${totalMinutes(job, tests)} min`,
    cta: p.done === 0 ? 'Start' : 'Continue',
    onClick: () => onOpenJob(job.id),
  }));

  // 2. Their team: invitations, then open work
  teamInvites.forEach((m) =>
    todos.push({
      key: `invite-${m.id}`,
      icon: Building2,
      tone: 'bg-violet-600 text-white',
      kicker: 'Team invitation',
      title: `${m.companyName} invited you to its team`,
      body: 'Join to get the training and tests they send you',
      cta: 'Review',
      onClick: () => onGoTo('work'),
    })
  );
  const open = teamWork.filter((a) => !a.completedAt);
  if (open.length) {
    const late = open.filter(isOverdue).length;
    todos.push({
      key: 'team-work',
      icon: ListTodo,
      tone: late ? 'bg-rose-600 text-white' : 'bg-violet-600 text-white',
      kicker: 'From your team',
      title: `${open.length} ${open.length === 1 ? 'task' : 'tasks'} to do`,
      body: late ? `${late} late · ${[...new Set(open.map((a) => a.companyName))].join(', ')}` : [...new Set(open.map((a) => a.companyName))].join(', '),
      cta: 'Open',
      onClick: () => onGoTo('work'),
      urgent: late > 0,
    });
  }

  // 3. One test to build their profile
  if (progress.nextModule) {
    const m = progress.nextModule;
    todos.push({
      key: 'next-test',
      icon: Sparkles,
      tone: 'bg-slate-900 text-white',
      kicker: `Build your profile · ${progress.role} path ${progress.takenModules.length}/${progress.path.length}`,
      title: m.sec.label,
      body: `About ${m.test.estimatedMinutes} min · your score goes on your profile for companies to see`,
      cta: 'Start',
      onClick: () => onOpenTest(m.test.id),
    });
  }

  // 4. The job simulation for the job they're after: the strongest proof they can do it, until they've done it
  const sim = tests.find((t) => isJobSim(t) && isPublic(t) && !!progress.role && t.roles?.includes(progress.role));
  const simBest = sim ? getBestTestScore(candidate, sim.id) : undefined;
  if (sim && simBest === undefined)
    todos.push({
      key: 'job-sim',
      icon: Monitor,
      tone: 'bg-indigo-600 text-white',
      kicker: 'Prove you can do the job',
      title: `${progress.role} job simulation`,
      body: `A real working day in the role, about ${sim.estimatedMinutes} min. Companies see your score: proof you can do the job, not just a CV`,
      cta: 'Start the day',
      onClick: () => onOpenTest(sim.id),
    });

  const first = candidate.name.split(' ')[0];
  const jobCount = invited.length + started.length;

  // Brand new: nothing taken and nothing waiting. One thing to do: pick the job they want, then take its first test
  if (candidate.testResults.length === 0 && invited.length === 0 && todos.every((t) => t.key === 'next-test' || t.key === 'job-sim')) {
    const m = progress.nextModule;
    return (
      <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 pb-4 bg-gradient-to-br from-indigo-50 via-white to-violet-50 border-b border-slate-100">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">Start here</div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Welcome, {first}. What job do you want?</h1>
          <p className="text-sm text-slate-600">Pick one and we'll show you the first test for it. Your score goes on your profile for companies to see.</p>
        </div>
        <div className="px-5 sm:px-6 py-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {progress.roles.map((r) => (
              <button
                key={r}
                onClick={() => progress.setRole(r)}
                aria-pressed={progress.role === r && progress.rolePicked}
                className={`px-3.5 py-1.5 rounded-full border text-sm font-semibold transition-colors ${
                  progress.role === r && progress.rolePicked ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          {m && (
            <div className={`p-4 rounded-xl flex flex-col sm:flex-row sm:items-center gap-4 ${progress.rolePicked ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500'}`}>
              <span className="min-w-0 flex-1">
                <span className={`block text-[11px] font-semibold uppercase tracking-wide ${progress.rolePicked ? 'text-indigo-300' : 'text-slate-400'}`}>Your first test{progress.rolePicked ? ` for ${progress.role}` : ''}</span>
                <span className={`block text-base font-bold ${progress.rolePicked ? 'text-white' : 'text-slate-700'}`}>{m.sec.label}</span>
                <span className="block text-xs opacity-80">About {m.test.estimatedMinutes} min · free · retake any time</span>
              </span>
              <button
                onClick={() => onOpenTest(m.test.id)}
                disabled={!progress.rolePicked}
                className={`shrink-0 px-5 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 ${progress.rolePicked ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
              >
                <Play className="w-4 h-4 fill-current" />
                {progress.rolePicked ? 'Start' : 'Pick a job first'}
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="px-5 sm:px-6 pt-5 pb-4 bg-gradient-to-br from-indigo-50 via-white to-violet-50 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {greeting()}, {first}
        </h1>
        <p className="text-sm text-slate-600">
          {jobCount > 0
            ? `${jobCount} ${jobCount === 1 ? 'job is' : 'jobs are'} waiting on your tests.`
            : open.length > 0
              ? 'Your team has sent you work.'
              : 'Nothing waiting. Take a test to build your profile.'}
        </p>
      </div>
      {/* Jobs a company invited them to: everything they need to decide, and Start on the next test */}
      {invited.length > 0 && (
        <div className="px-5 sm:px-6 pt-4 space-y-3">
          {invited.map(({ job, progress: p }) => {
            const jobTests = jobTestsOf(job, allTests);
            const next = jobTests.find((t) => p.scores[t.id] === undefined) ?? jobTests[0];
            const daysLeft = job.closingDate ? Math.ceil((new Date(job.closingDate).getTime() - Date.now()) / 86400000) : undefined;
            const minutes = totalMinutes(job, allTests);
            return (
              <article key={job.id} className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-white p-4 sm:p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <Pic src={job.companyLogo} alt="" className="w-11 h-11 rounded-xl object-cover bg-white border border-slate-200 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold text-indigo-700">{job.companyName} invited you to apply</div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">{job.title}</h3>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                      {job.salaryRange && (
                        <span className="inline-flex items-center gap-1">
                          <Wallet className="w-3.5 h-3.5 text-slate-400" />
                          {job.salaryRange}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {job.location} · {job.workType}
                        {job.employmentType && ` · ${job.employmentType}`}
                      </span>
                    </div>
                  </div>
                </div>
                {/* What it asks of them: the tests, how long, and by when */}
                <div className="rounded-xl bg-white border border-slate-200 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="font-semibold text-slate-900">
                      {p.done > 0 ? `${p.done} of ${p.total} tests done` : `${p.total} ${p.total === 1 ? 'test' : 'tests'} to apply`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      about {minutes} min in all
                    </span>
                    {daysLeft !== undefined && (
                      <span className={`inline-flex items-center gap-1 ${daysLeft <= 3 ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
                        <CalendarClock className="w-3.5 h-3.5" />
                        {daysLeft < 0 ? 'Closed' : daysLeft === 0 ? 'Closes today' : `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`}
                      </span>
                    )}
                  </div>
                  <ol className="flex flex-wrap gap-1.5">
                    {jobTests.map((t, i) => {
                      const score = p.scores[t.id];
                      return (
                        <li
                          key={t.id}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium border ${
                            score !== undefined ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : t.id === next?.id ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}
                        >
                          {score !== undefined && <CheckCircle2 className="inline w-3 h-3 mr-1 -mt-0.5" />}
                          {i + 1}. {t.title} · {t.estimatedMinutes} min
                        </li>
                      );
                    })}
                  </ol>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {next && (
                    <button
                      onClick={() => (onStartJobTest ? onStartJobTest(next, job.id) : onOpenJob(job.id))}
                      disabled={daysLeft !== undefined && daysLeft < 0}
                      className="h-10 px-5 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      {p.done > 0 ? `Continue: ${next.title}` : 'Start the first test'}
                    </button>
                  )}
                  <button onClick={() => onOpenJob(job.id)} className="h-10 px-4 rounded-full border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1">
                    See the job
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {(todos.length > 0 || invited.length === 0) && (
      <div className="px-5 sm:px-6 py-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">What to do next</h2>
        {todos.length === 0 ? (
          <p className="py-3 text-sm text-slate-500 inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            You're all caught up.
          </p>
        ) : (
          <ol className="divide-y divide-slate-100">
            {todos.map((t, i) => (
              <li key={t.key}>
                <button onClick={t.onClick} className="group w-full py-3 flex items-center gap-4 text-left">
                  <span className={`relative w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.tone}`}>
                    <t.icon className="w-5 h-5" />
                    {i === 0 && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[11px] font-semibold ${t.urgent ? 'text-rose-600' : 'text-slate-500'}`}>{t.kicker}</span>
                    <span className="block text-sm font-bold text-slate-900 group-hover:text-indigo-700 truncate">{t.title}</span>
                    <span className="block text-xs text-slate-500 truncate">{t.body}</span>
                  </span>
                  <span
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                      i === 0 ? 'bg-indigo-600 text-white group-hover:bg-indigo-700' : 'border border-slate-300 text-slate-700 group-hover:bg-slate-50'
                    }`}
                  >
                    {t.cta === 'Start' && <Play className="w-3 h-3 fill-current" />}
                    {t.cta}
                    {t.cta !== 'Start' && <ArrowRight className="w-3.5 h-3.5" />}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
      )}
      {todos.length === 0 && invited.length > 0 && <div className="h-4" />}
    </section>
  );
};
