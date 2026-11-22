import React, { useState } from 'react';
import { Pic } from './Pic';
import { AssessmentTest, Business, JobPosting, User } from '../types';
import { SectorId } from '../lib/sectors';
import { useProfileProgress } from '../lib/profileProgress';
import { STATUS_LABELS, invitesFor } from '../lib/jobTests';
import { jobIdFromPath } from '../lib/jobSeo';
import { activeProfileOf } from '../lib/jobProfiles';
import { Briefcase, ChevronRight, Link2, MapPin } from 'lucide-react';

interface CandidateHomeProps {
  candidate: User;
  jobs: JobPosting[];
  tests: AssessmentTest[];
  businesses: Business[];
  onOpenJob: (jobId: string) => void;
  onStartTest: (test: AssessmentTest) => void;
  onOpenTest: (testId: string) => void;
  onGoTo: (tab: 'tests' | 'jobs' | 'profile' | 'work') => void;
  // On a company's team: its name(s) and their open tasks, for the way into Work mode
  work?: { companies: string[]; open: number };
  // Someone not signed in: they see an invitation to join instead of a profile
  visitor?: { onJoin: () => void; onSignIn: () => void };
  sector: SectorId;
}


// A pasted job link, or just the job's id
const jobIdFromLink = (text: string) => {
  const trimmed = text.trim();
  try {
    return jobIdFromPath(new URL(trimmed).pathname) ?? trimmed;
  } catch {
    return jobIdFromPath(trimmed) ?? trimmed;
  }
};

// A candidate's home: the jobs whose tests companies sent them, what's left to do and how they did
export const CandidateHome: React.FC<CandidateHomeProps> = ({ candidate, jobs, tests, businesses, onOpenJob, onStartTest, onOpenTest, onGoTo, visitor, sector, work }) => {
  const items = visitor ? [] : invitesFor(candidate, jobs);
  const finished = items.filter((i) => i.progress.score !== undefined);
  const profile = activeProfileOf(candidate);
  const progress = useProfileProgress({ candidate, shown: { title: profile.title ?? '', bio: profile.bio ?? '' }, activeProfile: profile, tests, jobs, sector });
  const bestScore = candidate.testResults.length ? Math.max(...candidate.testResults.map((r) => r.score)) : undefined;
  const [pasted, setPasted] = useState('');
  const [linkError, setLinkError] = useState(false);

  const openPasted = (e: React.FormEvent) => {
    e.preventDefault();
    const id = jobIdFromLink(pasted);
    if (!jobs.some((j) => j.id === id)) {
      setLinkError(true);
      return;
    }
    setPasted('');
    onOpenJob(id);
  };

  return (
    <div className="@container space-y-8 min-w-0">
      {visitor ? (
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="h-14 bg-indigo-700" />
          <div className="px-5 pb-5 pt-4 space-y-3">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Get hired on what you can do</h1>
            <p className="text-sm text-slate-600">Take a free test, get a score, and apply to jobs that hire on skill rather than CVs.</p>
            <button onClick={visitor.onJoin} className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
              Join Praxa, it's free
            </button>
            <p className="text-xs text-slate-500 text-center">
              Already on Praxa?{' '}
              <button onClick={visitor.onSignIn} className="font-semibold text-indigo-700 hover:underline">
                Sign in
              </button>
            </p>
          </div>
        </section>
      ) : (
      <>
      {/* Who you are at a glance, LinkedIn-style: cover, photo ringed by profile strength, headline, numbers */}
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div
          className="h-16 relative"
          style={{ background: 'radial-gradient(circle at 85% 80%, rgba(56,189,248,0.45) 0, transparent 45%), linear-gradient(120deg, #312e81 0%, #4f46e5 45%, #7c3aed 100%)' }}
        />
        <div className="px-5 pb-5 -mt-10 space-y-3">
          <button onClick={() => onGoTo('profile')} aria-label="Open your profile" className="relative block w-20 h-20 rounded-full" title={`Profile strength: ${progress.strength}%`}>
            <svg width="80" height="80" className="absolute inset-0 text-emerald-500" aria-hidden="true">
              <circle cx="40" cy="40" r="37" fill="none" stroke="white" strokeWidth="6" />
              <circle cx="40" cy="40" r="37" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
              <circle
                cx="40"
                cy="40"
                r="37"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 37}
                strokeDashoffset={2 * Math.PI * 37 * (1 - progress.strength / 100)}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <Pic src={candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="absolute inset-[6px] w-[68px] h-[68px] rounded-full object-cover bg-slate-100" />
          </button>
          <div className="space-y-0.5">
            <button onClick={() => onGoTo('profile')} className="text-lg font-bold text-slate-900 tracking-tight hover:underline text-left">
              {candidate.name}
            </button>
            {activeProfileOf(candidate).title ? (
              <p className="text-sm text-slate-700 leading-snug">{activeProfileOf(candidate).title}</p>
            ) : (
              <button onClick={() => onGoTo('profile')} className="text-sm text-indigo-700 hover:underline">
                + Add a headline
              </button>
            )}
            {candidate.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {candidate.location}
              </p>
            )}
          </div>

          {/* Profile strength, with what to do about it */}
          <button onClick={() => onGoTo('profile')} className="w-full text-left pt-3 border-t border-slate-100 space-y-1.5 group">
            <span className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-800">Profile strength: {progress.level}</span>
              <span className="font-mono font-bold tabular-nums text-emerald-700">{progress.strength}%</span>
            </span>
            <span className="block h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <span className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: `${progress.strength}%` }} />
            </span>
            {progress.todo[0] && (
              <span className="block text-[11px] text-slate-500 group-hover:text-indigo-700">
                Next: {progress.todo[0].label.toLowerCase()} <span className="font-semibold">+{progress.todo[0].weight}%</span>
              </span>
            )}
          </button>

          <dl className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
            {[
              { label: 'Test scores', value: candidate.verifiedSkills.length },
              { label: 'Tests taken', value: new Set(candidate.testResults.map((r) => r.testId)).size },
              { label: 'Best score', value: bestScore ?? '–' },
            ].map((s) => (
              <div key={s.label}>
                <dd className="text-base font-bold text-slate-900 font-mono tabular-nums">{s.value}</dd>
                <dt className="text-[11px] text-slate-500">{s.label}</dt>
              </div>
            ))}
          </dl>

          {/* Team members: their team's tasks and training */}
          {work && work.companies.length > 0 && (
            <button
              onClick={() => onGoTo('work')}
              className="w-full mt-1 p-3 rounded-xl bg-violet-50 border border-violet-200 hover:border-violet-400 text-left flex items-center gap-3"
            >
              <Briefcase className="w-4 h-4 text-violet-700 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-slate-900">Your team</span>
                <span className="block text-[11px] text-slate-600 truncate">
                  {work.companies.join(', ')} · {work.open ? `${work.open} ${work.open === 1 ? 'task' : 'tasks'} to do` : 'nothing to do right now'}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-violet-400 shrink-0" />
            </button>
          )}
        </div>
      </section>

      {/* Their role's path in miniature: a dot for each module (the next test itself is in What to do next) */}
      {progress.role && progress.path.length > 0 && candidate.testResults.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your path</div>
              <div className="text-sm font-bold text-slate-900 truncate">{progress.role}</div>
            </div>
            <span className="text-sm font-bold font-mono tabular-nums text-indigo-700">
              {progress.takenModules.length}/{progress.path.length}
            </span>
          </div>
          <div className="flex gap-1">
            {progress.path.map((m) => (
              <button
                key={m.sec.id}
                onClick={() => onOpenTest(m.test.id)}
                title={`${m.sec.label}: ${m.best === undefined ? 'not started' : m.best}`}
                className={`h-2 flex-1 rounded-full ${m.best !== undefined ? 'bg-emerald-500' : 'bg-slate-200 hover:bg-indigo-300'}`}
              />
            ))}
          </div>
        </section>
      )}

      </>
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
        {linkError && <p className="text-xs font-semibold text-slate-800">That link doesn't match a job on Praxa. Check it and try again.</p>}
      </form>

      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Finished</h2>
          <ul className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            {finished.map(({ job, progress }) => (
              <li key={job.id}>
                <button onClick={() => onOpenJob(job.id)} className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900 truncate">{job.title}</span>
                    <span className="block text-xs text-slate-500">Sent to {job.companyName}</span>
                  </span>
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900">
                    {progress.score}
                  </span>
                  <span className="text-xs font-semibold w-28 text-right text-slate-600">
                    {STATUS_LABELS[progress.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
};
