import React, { useEffect, useState } from 'react';
import { ArrowLeft, Award, Briefcase, Check, ChevronDown, ExternalLink, GraduationCap, Link2, MapPin, X, Send } from 'lucide-react';
import { Locked, usePlan } from '../lib/plan';
import { AssessmentTest, Business, JobPosting, User, isPublic, isJobSim } from '../types';
import { getLeaderboard } from '../lib/leaderboard';
import { unfinishedStarts } from '../lib/results';
import { sortExperience } from '../lib/experience';
import { LeadRow } from '../lib/leads';
import { Pic } from './Pic';
import { TestHistory } from './TestHistory';
import { CertificationList, EducationList, ExperienceList, ProfileLinks } from './ExperienceList';
import { JobSimRecord } from './JobSimRecord';
import { ApplicantSummary } from './ApplicantSummary';
import { FitPanel } from './FitPanel';
import { fitSummary } from '../lib/fitReasons';

interface CandidateProfilePageProps {
  person: User;
  tests: AssessmentTest[];
  candidates: User[];
  businesses: Business[];
  // The company looking; without one, the Corprax team, who see every company's results
  business?: Business;
  // The viewer's jobs, to show which of them the candidate is on
  jobs: JobPosting[];
  // The candidate on the viewer's jobs: stage, rating, fit and integrity, one row per job
  leadRows: LeadRow[];
  onBack: () => void;
  onOpenTest: (testId: string) => void;
  onOpenJob: (jobId: string) => void;
  // Shown over the page (from the home chat) rather than as a page; it closes with onBack and can open the full page
  popup?: boolean;
  onOpenPage?: () => void;
  // The job it was opened from (a job's candidates, or a leaderboard's fit): why they fit it shows first
  fitJobId?: string;
  // Opens Invite to a job for them (companies only)
  onInviteToJob?: () => void;
}


// A score's look: one style for every score, no bands or medals (there's no pass mark, just the number)
const SCORED = { label: '', card: 'bg-white border-slate-200 hover:border-indigo-300', text: 'text-slate-900', solid: 'bg-indigo-500', pill: 'bg-white border-slate-200 text-slate-900 hover:border-indigo-300' };
const UNFINISHED = { label: 'Unfinished', card: 'bg-white border-dashed border-slate-300 hover:border-slate-400', text: 'text-slate-300', solid: 'bg-slate-200', chip: 'bg-slate-100 text-slate-500' };
const HISTORY_SHOWN = 3;
const sameText = (a = '', b = '') => a.trim().toLowerCase() === b.trim().toLowerCase();
const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// A small label above each section, as on a printed CV
const Heading: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
  <div className="flex items-baseline justify-between gap-3 mb-3">
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{children}</h2>
    {aside}
  </div>
);

// A candidate's profile as a company sees it, on a page of its own: a digital CV. Who they are, then what Corprax has
// verified they can do, then every test the company may see, with how they stand on the company's own jobs beside it
export const CandidateProfilePage: React.FC<CandidateProfilePageProps> = ({
  person,
  tests,
  candidates,
  businesses,
  business,
  jobs,
  leadRows,
  onBack,
  onOpenTest,
  onOpenJob,
  popup,
  onOpenPage,
  fitJobId,
  onInviteToJob,
}) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onBack();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popup, onBack]);
  // The profile they sent to this company, if they applied; otherwise the one they show
  const sentWith = jobs.map((j) => person.applicationProfiles?.[j.id]).find(Boolean);
  const profile = person.jobProfiles?.find((p) => p.id === (sentWith ?? person.activeProfileId));
  const title = profile?.title || person.title;
  const bio = profile?.bio || person.bio;
  const rows = leadRows.filter((r) => r.candidate.id === person.id);
  const [allHistory, setAllHistory] = useState(false);
  const jobsHeld = sortExperience(person.experience ?? []);
  // Each Corprax library test they've taken (or started and left): best score, attempts, rank, newest first
  const libraryCards = [...new Set([...person.testResults.map((r) => r.testId), ...(person.testStarts ?? []).map((st) => st.testId)])]
    .flatMap((testId) => {
      const test = tests.find((t) => t.id === testId);
      if (!test || !isPublic(test)) return [];
      const attempts = person.testResults.filter((r) => r.testId === testId);
      // Job simulations have their own section
      if (isJobSim(test)) return [];
      const unfinished = unfinishedStarts(person, testId);
      if (!attempts.length && !unfinished) return [];
      const board = getLeaderboard(testId, candidates);
      const entry = board.find((e) => e.candidate.id === person.id);
      const last = [...attempts.map((r) => r.completedTime ?? r.completedAt), ...(person.testStarts ?? []).filter((st) => st.testId === testId).map((st) => st.startedAt)].sort().at(-1)!;
      return [{ test, best: attempts.length ? Math.max(...attempts.map((r) => r.score)) : null, attempts: attempts.length, unfinished, rank: entry?.rank, of: board.length, last }];
    })
    .sort((a, b) => (b.best ?? -1) - (a.best ?? -1));
  const current = jobsHeld.find((j) => !j.end);
  // Why they fit: the job it was opened from, else the first of the company's jobs they're on, else its newest open job
  const fitJob = business ? jobs.find((j) => j.id === fitJobId) ?? rows[0]?.job ?? jobs.find((j) => j.status === 'active') : undefined;
  const fit = fitJob ? fitSummary(person, fitJob, tests, candidates) : undefined;
  const fullReports = usePlan().can('full-reports');
  const scored = libraryCards.filter((c) => c.best !== null);
  // Their three best Corprax test scores, shown at the top
  const strongest = scored.slice(0, 3);
  const average = scored.length ? Math.round(scored.reduce((n, c) => n + c.best!, 0) / scored.length) : null;
  const topRank = scored.filter((c) => c.rank).sort((a, b) => a.rank! / a.of - b.rank! / b.of)[0];
  const figures = [
    { label: 'Corprax tests taken', value: scored.length || '—', note: scored.length ? undefined : 'None taken yet' },
    { label: 'Average score', value: average ?? '—', note: undefined },
    { label: 'Best score', value: scored[0]?.best ?? '—', note: scored[0]?.test.title },
    { label: 'Best ranking', value: topRank ? `#${topRank.rank}` : '—', note: topRank ? `of ${topRank.of} on ${topRank.test.title}` : undefined },
  ];

  const facts = [
    person.location && { icon: MapPin, text: person.location },
    person.yearsExperience > 0 && { icon: Briefcase, text: `${person.yearsExperience} ${person.yearsExperience === 1 ? 'year' : 'years'} experience` },
    person.workPreference && { icon: Check, text: person.workPreference },
    person.careerStage && { icon: GraduationCap, text: person.careerStage },
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address bar still has the link
    }
  };

  const topBar = popup ? (
    <div className="flex items-center justify-end gap-2">
      {onOpenPage && (
        <button
          onClick={onOpenPage}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg inline-flex items-center gap-1.5"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open full page
        </button>
      )}
      <button onClick={onBack} aria-label="Close" className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-white">
        <X className="w-5 h-5" />
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-3">
      <button onClick={onBack} className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <button
        onClick={copyLink}
        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg inline-flex items-center gap-1.5"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  );

  const body = (
    <>
      {topBar}

      {/* The top of the profile: who they are and what they do now, their summary, what they're strongest at on Corprax
          and the four figures a hiring manager wants first */}
      <header className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="h-16 sm:h-20 bg-[linear-gradient(110deg,#e0e7ff_0%,#ede9fe_45%,#fce7f3_100%)]" aria-hidden />
        <div className="px-5 sm:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
            <Pic src={person.avatarUrl} alt="" referrerPolicy="no-referrer" className="-mt-10 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover bg-slate-100 ring-4 ring-white shadow-sm shrink-0" />
            <div className="min-w-0 flex-1 sm:pt-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{person.name}</h1>
              {title && (
                <p className="text-base text-slate-700">
                  {title}
                  {current && sameText(current.role, title) && <span className="text-slate-500"> at <span className="font-medium text-slate-700">{current.company}</span></span>}
                </p>
              )}
              {current && !sameText(current.role, title) && (
                <p className="text-sm text-slate-500">
                  Now {current.role} at <span className="font-medium text-slate-700">{current.company}</span>
                </p>
              )}
            </div>
            {(!!person.links?.length || onInviteToJob) && (
              <div className="sm:pt-4 flex flex-col sm:items-end gap-2">
                {onInviteToJob && (
                  <button
                    onClick={onInviteToJob}
                    className="h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    Invite to a job
                  </button>
                )}
                {!!person.links?.length && <ProfileLinks links={person.links} />}
              </div>
            )}
          </div>

          {facts.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {facts.map(({ icon: Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  {text}
                </li>
              ))}
            </ul>
          )}

          {bio && (
            <section className="mt-5 max-w-3xl">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1.5">Professional summary</h2>
              <p className="text-[15px] text-slate-800 leading-7 whitespace-pre-line">{bio}</p>
            </section>
          )}

          {strongest.length > 0 && (
            <section className="mt-5">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2">Strongest on Corprax</h2>
              <ul className="flex flex-wrap gap-2">
                {strongest.map((c) => {
                  const band = SCORED;
                  return (
                    <li key={c.test.id}>
                      <button onClick={() => onOpenTest(c.test.id)} className={`inline-flex items-center gap-2 pl-3 pr-1.5 py-1 rounded-full border text-xs font-semibold ${band.pill}`}>
                        {c.test.title}
                        <span className={`px-1.5 py-0.5 rounded-full font-mono tabular-nums text-white ${band.solid}`}>{c.best}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        {/* The figures: how many Corprax tests they've taken, their average, their best, and their best place on a board */}
        <dl className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-100 bg-slate-50/60">
          {figures.map((f, i) => (
            <div key={f.label} className={`px-5 sm:px-6 py-4 border-slate-100 ${i % 2 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
              <dt className="text-[11px] font-medium text-slate-500">{f.label}</dt>
              <dd className="mt-0.5 text-2xl font-bold tabular-nums text-slate-900">{f.value}</dd>
              {f.note && <dd className="text-[11px] text-slate-500 truncate">{f.note}</dd>}
            </div>
          ))}
        </dl>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* For the company looking: why they fit its job, in a few lines */}
          {fit && (fullReports ? <FitPanel summary={fit} onOpenJob={onOpenJob} /> : <Locked feature="full-reports" title="Why they fit your job">The reasons behind their fit, from their results against what the job asks for.</Locked>)}

          {/* Then what concerns the company: the tests it sent them and the jobs of its they applied to */}
          <ApplicantSummary person={person} rows={rows} tests={tests} candidates={candidates} onOpenTest={onOpenTest} onOpenJob={onOpenJob} />

          {/* The job simulations they've done, apart from their skills tests */}
          {fullReports ? (
            <JobSimRecord person={person} tests={tests} onOpenTest={onOpenTest} />
          ) : (
            person.testResults.length > 0 && (
              <Locked feature="full-reports" title="Job simulation replay">
                Step through what they did in each job simulation: every email, file and answer, in order.
              </Locked>
            )
          )}

          {/* Every Corprax skills test they've taken, as square cards with the score */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Corprax skills tests</h2>
                <p className="text-xs text-slate-500">Hands-on tests, marked by Corprax. Best score on each, strongest first.</p>
              </div>
            </div>
            {libraryCards.length === 0 ? (
              <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-300 p-6 text-center">No Corprax skills tests taken yet.</p>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-fr">
                {libraryCards.map((c) => {
                  const band = c.best === null ? UNFINISHED : SCORED;
                  return (
                    <li key={c.test.id} className="flex">
                      <button
                        onClick={() => onOpenTest(c.test.id)}
                        className={`w-full min-h-[12rem] rounded-2xl border p-4 flex flex-col text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${band.card}`}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 truncate">{c.test.category}</span>
                        <span className="mt-1 text-sm font-semibold leading-snug text-slate-900 line-clamp-3">{c.test.title}</span>
                        <span className="mt-auto">
                          <span className={`block text-4xl font-bold tabular-nums leading-none ${band.text}`}>
                            {c.best ?? '—'}
                            {c.best !== null && <span className="text-sm font-semibold text-slate-400">/100</span>}
                          </span>
                          <span className="mt-2 block h-1.5 rounded-full bg-white/80 overflow-hidden">
                            <span className={`block h-full rounded-full ${band.solid}`} style={{ width: `${c.best ?? 0}%` }} />
                          </span>
                          <span className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-slate-400">{band.label}</span>
                            <span className="text-slate-500 truncate">
                            {[c.rank && `#${c.rank} of ${c.of}`, c.attempts > 1 && `${c.attempts} attempts`, c.unfinished > 0 && `${c.unfinished} unfinished`].filter(Boolean).join(' · ') || formatDay(c.last)}
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Every attempt, company tests included, with dates and integrity: there when the company wants the detail */}
          <details className="bg-white border border-slate-200 rounded-2xl shadow-xs group">
            <summary className="px-5 sm:px-6 py-4 cursor-pointer list-none flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-bold text-slate-900">Full test record</span>
                <span className="block text-xs text-slate-500">Every attempt with its date and integrity, your own tests included</span>
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-5 sm:px-6 pb-6">
              <TestHistory
                person={person}
                tests={tests}
                candidates={candidates}
                businesses={businesses}
                companyResultsFor={business ? business.id : 'all'}
                showIntegrity
                onOpenTest={onOpenTest}
                emptyText="No tests taken yet."
              />
            </div>
          </details>
        </div>

        <aside className="space-y-6 min-w-0">
          {/* Their work history as a timeline: the latest few, expandable to all of it */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-baseline justify-between gap-2 mb-4">
              <h2 className="text-base font-bold text-slate-900 inline-flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-400" />
                Work experience
              </h2>
              {person.yearsExperience > 0 && <span className="text-xs text-slate-500">{person.yearsExperience} yrs in total</span>}
            </div>
            {jobsHeld.length === 0 ? (
              <p className="text-xs text-slate-500">None added.</p>
            ) : (
              <>
                <ExperienceList items={allHistory ? jobsHeld : jobsHeld.slice(0, HISTORY_SHOWN)} stacked />
                {jobsHeld.length > HISTORY_SHOWN && (
                  <button onClick={() => setAllHistory((v) => !v)} className="mt-5 w-full py-2 rounded-lg border border-slate-200 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 inline-flex items-center justify-center gap-1">
                    {allHistory ? 'Show less' : `Show full history (${jobsHeld.length - HISTORY_SHOWN} more)`}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${allHistory ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h2 className="mb-4 text-base font-bold text-slate-900 inline-flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-slate-400" />
              Education
            </h2>
            {person.education?.length ? (
              <EducationList items={person.education} stacked />
            ) : person.university || person.studySubject ? (
              <p className="text-sm text-slate-700">{[person.studySubject, person.university].filter(Boolean).join(', ')}</p>
            ) : (
              <p className="text-xs text-slate-500">None added.</p>
            )}
          </section>

          {!!person.certifications?.length && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h2 className="mb-4 text-base font-bold text-slate-900 inline-flex items-center gap-2">
                <Award className="w-4 h-4 text-slate-400" />
                Certifications
              </h2>
              <CertificationList items={person.certifications} />
            </section>
          )}
        </aside>
      </div>
    </>
  );

  if (!popup) return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">{body}</div>;
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-6 bg-slate-900/50 backdrop-blur-sm" onClick={onBack}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={person.name}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain bg-slate-50 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-6 animate-[fade-in_150ms_ease-out]"
      >
        {body}
      </div>
    </div>
  );
};
