import React from 'react';
import { ArrowRight, Briefcase, Building2, CheckCircle2, ListTodo, Play, Sparkles } from 'lucide-react';
import { Assignment, AssessmentTest, JobPosting, TeamMember, User } from '../types';
import { activeProfileOf } from '../lib/jobProfiles';
import { SectorId } from '../lib/sectors';
import { useProfileProgress } from '../lib/profileProgress';
import { invitesFor, jobTestProgress, totalMinutes } from '../lib/jobTests';
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
}> = ({ candidate, tests, jobs, sector, teamInvites, teamWork, onOpenTest, onOpenJob, onGoTo }) => {
  const profile = activeProfileOf(candidate);
  const progress = useProfileProgress({ candidate, shown: { title: profile.title ?? '', bio: profile.bio ?? '' }, activeProfile: profile, tests, jobs, sector });

  // 1. Jobs waiting on them: ones a company sent them, and ones they've started from a link but not applied to
  const applied = new Set(candidate.appliedJobIds ?? []);
  const invited = invitesFor(candidate, jobs).filter((i) => i.progress.score === undefined);
  const started = jobs
    .filter((j) => j.status === 'active' && j.testIds.length && !applied.has(j.id) && !invited.some((i) => i.job.id === j.id))
    .map((job) => ({ job, progress: jobTestProgress(job, candidate) }))
    .filter((i) => i.progress.done > 0 && i.progress.done < i.progress.total);
  const todos: Todo[] = [...invited, ...started].map(({ job, progress: p }) => ({
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
      cta: 'Open Work',
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
      kicker: `Build your profile · ${progress.role} path ${progress.passedModules.length}/${progress.path.length}`,
      title: m.best === undefined ? m.sec.label : `Retake ${m.sec.label}`,
      body: `About ${m.test.estimatedMinutes} min · pass to add a verified skill companies see`,
      cta: m.best === undefined ? 'Start' : 'Retake',
      onClick: () => onOpenTest(m.test.id),
    });
  }

  const first = candidate.name.split(' ')[0];
  const jobCount = invited.length + started.length;

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
    </section>
  );
};
