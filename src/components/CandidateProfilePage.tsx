import React, { useEffect, useState } from 'react';
import { ArrowLeft, Briefcase, Check, ChevronDown, ExternalLink, GraduationCap, Link2, MapPin, X } from 'lucide-react';
import { AssessmentTest, Business, JobPosting, User, isPublic } from '../types';
import { getLeaderboard } from '../lib/leaderboard';
import { unfinishedStarts } from '../lib/results';
import { sortExperience } from '../lib/experience';
import { LeadRow } from '../lib/leads';
import { Pic } from './Pic';
import { TestHistory } from './TestHistory';
import { CertificationList, EducationList, ExperienceList, ProfileLinks } from './ExperienceList';
import { ApplicantSummary } from './ApplicantSummary';

interface CandidateProfilePageProps {
  person: User;
  tests: AssessmentTest[];
  candidates: User[];
  businesses: Business[];
  // The company looking; without one, the Praxa team, who see every company's results
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
}


// How good they are at a verified skill, from their score on the test: green strong, amber good, grey still developing
const SKILL_BANDS = [
  { min: 88, label: 'Strong', range: '88+', card: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { min: 75, label: 'Good', range: '75–87', card: 'bg-amber-50 border-amber-200 hover:border-amber-400', text: 'text-amber-700', dot: 'bg-amber-500' },
  { min: 0, label: 'Developing', range: 'under 75', card: 'bg-slate-50 border-slate-200 hover:border-slate-400', text: 'text-slate-600', dot: 'bg-slate-400' },
];
const skillBand = (score: number) => SKILL_BANDS.find((b) => score >= b.min)!;
const UNFINISHED = { label: 'Left unfinished', card: 'bg-white border-dashed border-slate-300 hover:border-slate-400', text: 'text-slate-400' };
const HISTORY_SHOWN = 3;
const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// A small label above each section, as on a printed CV
const Heading: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
  <div className="flex items-baseline justify-between gap-3 mb-3">
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{children}</h2>
    {aside}
  </div>
);

// A candidate's profile as a company sees it, on a page of its own: a digital CV. Who they are, then what Praxa has
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
  const skills = [...person.verifiedSkills].sort((a, b) => b.score - a.score);
  const testsTaken = new Set(person.testResults.map((r) => r.testId)).size;
  const best = skills[0];
  const rows = leadRows.filter((r) => r.candidate.id === person.id);
  const [allHistory, setAllHistory] = useState(false);
  const jobsHeld = sortExperience(person.experience ?? []);
  // Each Praxa library test they've taken (or started and left): best score, attempts, rank, newest first
  const libraryCards = [...new Set([...person.testResults.map((r) => r.testId), ...(person.testStarts ?? []).map((st) => st.testId)])]
    .flatMap((testId) => {
      const test = tests.find((t) => t.id === testId);
      if (!test || !isPublic(test)) return [];
      const attempts = person.testResults.filter((r) => r.testId === testId);
      const unfinished = unfinishedStarts(person, testId);
      if (!attempts.length && !unfinished) return [];
      const board = getLeaderboard(testId, candidates);
      const entry = board.find((e) => e.candidate.id === person.id);
      const last = [...attempts.map((r) => r.completedTime ?? r.completedAt), ...(person.testStarts ?? []).filter((st) => st.testId === testId).map((st) => st.startedAt)].sort().at(-1)!;
      return [{ test, best: attempts.length ? Math.max(...attempts.map((r) => r.score)) : null, attempts: attempts.length, unfinished, rank: entry?.rank, of: board.length, last }];
    })
    .sort((a, b) => (b.best ?? -1) - (a.best ?? -1));

  const facts = [
    person.location && { icon: MapPin, text: person.location },
    person.yearsExperience > 0 && { icon: Briefcase, text: `${person.yearsExperience} ${person.yearsExperience === 1 ? 'year' : 'years'} experience` },
    person.workPreference && { icon: Check, text: person.workPreference },
    (person.university || person.studySubject) && {
      icon: GraduationCap,
      text: [person.studySubject, person.university].filter(Boolean).join(', '),
    },
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

      {/* The top of the CV: photo, name, headline and the facts that matter, then the four numbers */}
      <header className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="h-20 sm:h-24 bg-[radial-gradient(120%_140%_at_0%_0%,#e0e7ff_0%,#f5f3ff_45%,#ffffff_100%)]" aria-hidden />
        <div className="px-6 sm:px-8 pb-6 -mt-10 sm:-mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <Pic
              src={person.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover bg-slate-100 ring-4 ring-white shadow-sm shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1 sm:pb-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{person.name}</h1>
              {title && <p className="text-sm sm:text-base text-slate-600">{title}</p>}
            </div>
            {person.careerStage && (
              <span className="self-start sm:self-end sm:mb-2 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-semibold">{person.careerStage}</span>
            )}
          </div>
          {facts.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
              {facts.map(({ icon: Icon, text }) => (
                <li key={text} className="inline-flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-slate-400" />
                  {text}
                </li>
              ))}
            </ul>
          )}
          {bio && (
            <div className="mt-4 max-w-3xl">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-1">Professional summary</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{bio}</p>
            </div>
          )}
          {!!person.links?.length && (
            <div className="mt-4">
              <ProfileLinks links={person.links} />
            </div>
          )}
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 border-t border-slate-100 divide-x divide-slate-100 [&>div:nth-child(n+3)]:border-t sm:[&>div:nth-child(n+3)]:border-t-0 [&>div]:border-slate-100">
          {[
            ['Verified skills', skills.length],
            ['Tests taken', testsTaken],
            ['Best score', best ? best.score : '—'],
            ['Top percentile', best ? `${Math.max(...skills.map((s) => s.percentile))}th` : '—'],
          ].map(([label, value]) => (
            <div key={label} className="px-6 py-4">
              <dt className="text-[11px] text-slate-500">{label}</dt>
              <dd className="text-xl font-bold font-mono tabular-nums text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* First, what concerns the company looking: the tests it sent them and the jobs of its they applied to */}
          <ApplicantSummary person={person} rows={rows} tests={tests} candidates={candidates} onOpenTest={onOpenTest} onOpenJob={onOpenJob} />

          {/* Every Praxa skills test they've taken, as square cards coloured by score */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <Heading
              aside={
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                  {SKILL_BANDS.map((b) => (
                    <span key={b.label} className="inline-flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${b.dot}`} />
                      {b.label} {b.range}
                    </span>
                  ))}
                </span>
              }
            >
              Praxa skills tests
            </Heading>
            {libraryCards.length === 0 ? (
              <p className="text-sm text-slate-500">No Praxa skills tests taken yet.</p>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {libraryCards.map((c) => {
                  const band = c.best === null ? UNFINISHED : skillBand(c.best);
                  return (
                    <li key={c.test.id}>
                      <button onClick={() => onOpenTest(c.test.id)} className={`w-full aspect-square rounded-2xl border p-3.5 flex flex-col justify-between text-left transition-colors ${band.card}`}>
                        <span className="text-xs font-semibold text-slate-900 line-clamp-3">{c.test.title}</span>
                        <span>
                          <span className={`block font-mono text-3xl font-bold tabular-nums leading-none ${band.text}`}>{c.best ?? '—'}</span>
                          <span className={`mt-1 block text-[10px] font-semibold ${band.text}`}>{c.best === null ? 'Left unfinished' : band.label}</span>
                          <span className="block text-[10px] text-slate-500 truncate">
                            {[c.rank && `#${c.rank} of ${c.of}`, c.attempts > 1 && `${c.attempts} attempts`, c.unfinished > 0 && c.best !== null && `${c.unfinished} left unfinished`].filter(Boolean).join(' · ') || formatDay(c.last)}
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
            <summary className="px-6 py-4 cursor-pointer list-none flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Full test record
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-6 pb-6">
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

        <aside className="space-y-6 min-w-0 lg:sticky lg:top-6">
          {/* Their work history as a timeline: the latest few, expandable to all of it */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <Heading aside={<span className="text-[10px] text-slate-400">In their own words</span>}>Work experience</Heading>
            {jobsHeld.length === 0 ? (
              <p className="text-xs text-slate-500">None added.</p>
            ) : (
              <>
                <ExperienceList items={allHistory ? jobsHeld : jobsHeld.slice(0, HISTORY_SHOWN)} />
                {jobsHeld.length > HISTORY_SHOWN && (
                  <button onClick={() => setAllHistory((v) => !v)} className="mt-4 w-full text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center justify-center gap-1">
                    {allHistory ? 'Show less' : `Show full history (${jobsHeld.length - HISTORY_SHOWN} more)`}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${allHistory ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <Heading>Education</Heading>
            {person.education?.length ? <EducationList items={person.education} /> : <p className="text-xs text-slate-500">None added.</p>}
          </section>

          {!!person.certifications?.length && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <Heading>Certifications</Heading>
              <CertificationList items={person.certifications} />
            </section>
          )}
        </aside>
      </div>
    </>
  );

  if (!popup) return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">{body}</div>;
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-6 bg-slate-900/50 backdrop-blur-sm" onClick={onBack}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={person.name}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto overscroll-contain bg-slate-50 rounded-2xl shadow-2xl p-4 sm:p-6 space-y-6 animate-[fade-in_150ms_ease-out]"
      >
        {body}
      </div>
    </div>
  );
};
