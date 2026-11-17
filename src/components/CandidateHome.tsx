import React, { useState } from 'react';
import { Pic } from './Pic';
import { AssessmentTest, Business, JobPosting, User } from '../types';
import { SectorId } from '../lib/sectors';
import { PASS, useProfileProgress } from '../lib/profileProgress';
import { STATUS_LABELS, invitesFor, totalMinutes } from '../lib/jobTests';
import { jobIdFromPath } from '../lib/jobSeo';
import { activeProfileOf } from '../lib/jobProfiles';
import { ArrowRight, Briefcase, Link2, MapPin, Play } from 'lucide-react';

interface CandidateHomeProps {
  candidate: User;
  jobs: JobPosting[];
  tests: AssessmentTest[];
  businesses: Business[];
  onOpenJob: (jobId: string) => void;
  onStartTest: (test: AssessmentTest) => void;
  onOpenTest: (testId: string) => void;
  onGoTo: (tab: 'tests' | 'jobs' | 'profile') => void;
  // Someone not signed in: they see an invitation to join instead of a profile
  visitor?: { onJoin: () => void; onSignIn: () => void };
  sector: SectorId;
}

const DAY = 86400000;
const today = () => new Date().toISOString().split('T')[0];

// When the job stops taking applications
function closesLabel(closingDate?: string) {
  if (!closingDate) return 'No closing date';
  const days = Math.round((new Date(closingDate).getTime() - new Date(today()).getTime()) / DAY);
  if (days < 0) return 'Closed';
  if (days === 0) return 'Closes today';
  return days === 1 ? 'Closes tomorrow' : `Closes in ${days} days`;
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
export const CandidateHome: React.FC<CandidateHomeProps> = ({ candidate, jobs, tests, businesses, onOpenJob, onStartTest, onOpenTest, onGoTo, visitor, sector }) => {
  const items = visitor ? [] : invitesFor(candidate, jobs);
  const open = items.filter((i) => i.progress.score === undefined);
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
            <p className="text-sm text-slate-600">Take a free test, get a verified score, and apply to jobs that hire on skill rather than CVs.</p>
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
              { label: 'Verified skills', value: candidate.verifiedSkills.length },
              { label: 'Tests taken', value: new Set(candidate.testResults.map((r) => r.testId)).size },
              { label: 'Best score', value: bestScore ?? '–' },
            ].map((s) => (
              <div key={s.label}>
                <dd className="text-base font-bold text-slate-900 font-mono tabular-nums">{s.value}</dd>
                <dt className="text-[11px] text-slate-500">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Their role's path in miniature: a dot for each module */}
      {progress.role && progress.path.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Your path</div>
              <div className="text-sm font-bold text-slate-900 truncate">{progress.role}</div>
            </div>
            <span className="text-sm font-bold font-mono tabular-nums text-indigo-700">
              {progress.passedModules.length}/{progress.path.length}
            </span>
          </div>
          <div className="flex gap-1">
            {progress.path.map((m) => (
              <button
                key={m.sec.id}
                onClick={() => onOpenTest(m.test.id)}
                title={`${m.sec.label}: ${m.best === undefined ? 'not started' : m.best}`}
                className={`h-2 flex-1 rounded-full ${m.best !== undefined && m.best >= PASS ? 'bg-emerald-500' : m.best !== undefined ? 'bg-amber-400' : 'bg-slate-200 hover:bg-indigo-300'}`}
              />
            ))}
          </div>
          {progress.nextModule && (
            <button onClick={() => onOpenTest(progress.nextModule!.test.id)} className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-left flex items-center gap-3">
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-semibold uppercase tracking-wide text-indigo-300">Up next</span>
                <span className="block text-sm font-semibold truncate">{progress.nextModule.sec.label}</span>
              </span>
              <span className="text-[11px] text-slate-300 shrink-0">~{progress.nextModule.test.estimatedMinutes} min</span>
            </button>
          )}
        </section>
      )}

      {open.length > 0 && (
        <p className="text-sm font-semibold text-slate-800 -mb-4">
          {open.length} {open.length === 1 ? 'job wants' : 'jobs want'} you to take their tests
        </p>
      )}
      </>
      )}

      {open.length > 0 && (
        <ul className="space-y-3">
          {open.map(({ job, progress }) => {
            const business = businesses.find((b) => b.id === job.businessId);
            const due = closesLabel(job.closingDate);
            return (
              <li key={job.id}>
                <button
                  onClick={() => onOpenJob(job.id)}
                  className="group w-full text-left bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 flex items-center gap-4 transition-colors shadow-xs"
                >
                  {business && (
                    <Pic src={business.logo} alt="" referrerPolicy="no-referrer" className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-xs font-semibold text-slate-500">{job.companyName}</div>
                    <div className="text-base font-bold text-slate-900 group-hover:text-indigo-700">{job.title}</div>
                    <div className="text-xs text-slate-500">
                      {progress.total} {progress.total === 1 ? 'test' : 'tests'} &middot; ~{totalMinutes(job, tests)} min &middot;{' '}
                      <span className={due === 'Closed' ? 'text-rose-700 font-semibold' : ''}>{due}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <div className="h-1.5 flex-1 max-w-56 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-600" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 tabular-nums">
                        {progress.done}/{progress.total} done
                      </span>
                    </div>
                  </div>
                  <span className="hidden @md:flex px-4 py-2 text-sm font-semibold text-white bg-indigo-600 group-hover:bg-indigo-700 rounded-lg items-center gap-1.5 shrink-0">
                    {progress.done === 0 ? 'Start' : 'Continue'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
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
                  <span className={`text-sm font-bold font-mono tabular-nums ${progress.status === 'passed' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {progress.score}
                  </span>
                  <span className={`text-xs font-semibold w-28 text-right ${progress.status === 'passed' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {STATUS_LABELS[progress.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-1 gap-3">
        <button onClick={() => onGoTo('jobs')} className="text-left p-5 bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl space-y-1 transition-colors">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          <div className="text-sm font-bold text-slate-900">Find jobs</div>
          <p className="text-xs text-slate-500">Apply to jobs that hire on test results.</p>
        </button>
      </div>
    </div>
  );
};
