import React, { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Briefcase, Check, ChevronRight, ExternalLink, GraduationCap, Link2, MapPin, Star, X } from 'lucide-react';
import { AssessmentTest, Business, JobPosting, User } from '../types';
import { LeadRow, stageInfo } from '../lib/leads';
import { Pic } from './Pic';
import { TestHistory } from './TestHistory';
import { IntegrityBadge } from './IntegrityBadge';
import { getBadgeTier } from './VerifiedSkillBadge';
import { ExperienceList, ProfileLinks } from './ExperienceList';
import { SkillList } from './SkillList';
import { ApplicantSummary } from './ApplicantSummary';

interface CandidateProfilePageProps {
  person: User;
  tests: AssessmentTest[];
  candidates: User[];
  businesses: Business[];
  // The company looking; without one, the Vetter team, who see every company's results
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

const formatDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// A small label above each section, as on a printed CV
const Heading: React.FC<{ children: React.ReactNode; aside?: React.ReactNode }> = ({ children, aside }) => (
  <div className="flex items-baseline justify-between gap-3 mb-3">
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{children}</h2>
    {aside}
  </div>
);

// A candidate's profile as a company sees it, on a page of its own: a digital CV. Who they are, then what Vetter has
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
  const sittings = rows.flatMap((r) => r.integrity);

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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          {/* How they did on the company's job simulations, next to what their profile has proven */}
          <ApplicantSummary person={person} rows={rows} tests={tests} candidates={candidates} onOpenTest={onOpenTest} onOpenJob={onOpenJob} />

          {bio && (
            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <Heading>About</Heading>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{bio}</p>
            </section>
          )}

          {!!person.experience?.length && (
            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <Heading aside={<span className="text-[11px] text-slate-400">In their own words</span>}>Experience</Heading>
              <ExperienceList items={person.experience} />
            </section>
          )}

          {!!person.skills?.length && (
            <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <Heading aside={<span className="text-[11px] text-slate-400">In their own words · ticked ones are verified</span>}>Skills</Heading>
              <SkillList skills={person.skills} verified={person.verifiedSkills.map((v) => v.skillName)} />
            </section>
          )}

          {/* What Vetter has verified, strongest first: one line each, with the score as a bar */}
          <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 pt-6">
              <Heading aside={skills.length > 0 && <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><BadgeCheck className="w-3.5 h-3.5 text-indigo-600" />Verified by Vetter</span>}>
                Verified skills
              </Heading>
            </div>
            {skills.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-slate-500">No verified skills yet. A score of 75 or more on a Vetter test verifies the skill.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {skills.map((s) => {
                  const tier = getBadgeTier(s.score);
                  return (
                    <li key={s.skillId}>
                      <button
                        onClick={() => onOpenTest(s.testId)}
                        className="w-full text-left px-6 py-3.5 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_9rem_4.5rem] items-center gap-x-4 gap-y-2 hover:bg-slate-50/70 transition-colors group"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-700">{s.skillName}</span>
                          <span className="block text-[11px] text-slate-500 truncate">
                            {s.level} &middot; {s.percentile}th percentile &middot; {formatDay(s.verifiedAt)}
                          </span>
                        </span>
                        <span className="hidden sm:block h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <span className={`block h-full rounded-full ${tier.barClass}`} style={{ width: `${s.score}%` }} />
                        </span>
                        <span className="flex items-center justify-end gap-1">
                          <span className={`font-mono text-lg font-bold tabular-nums ${tier.badgeTextColor}`}>{s.score}</span>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <Heading>Test record</Heading>
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
          </section>
        </div>

        <aside className="space-y-6 min-w-0 lg:sticky lg:top-6">
          {/* Where they stand on the viewer's own jobs */}
          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <Heading>{business ? `With ${business.name}` : 'On jobs'}</Heading>
            {rows.length === 0 ? (
              <p className="text-xs text-slate-500">Not on any of {business ? 'your' : 'these'} jobs yet.</p>
            ) : (
              <ul className="space-y-3">
                {rows.map((r) => {
                  const stage = stageInfo(r.stage);
                  return (
                    <li key={r.id}>
                      <button onClick={() => onOpenJob(r.job.id)} className="w-full text-left rounded-xl border border-slate-100 hover:border-slate-300 p-3 space-y-2 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900 truncate">{r.job.title}</span>
                            <span className="block text-[11px] text-slate-500">{r.applied ? 'Applied' : 'Sent tests'}</span>
                          </span>
                          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${stage.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                            {stage.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span className="inline-flex gap-px" aria-label={`Rated ${r.lead?.rating ?? 0} of 5`}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={`w-3 h-3 ${n <= (r.lead?.rating ?? 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                            ))}
                          </span>
                          <span>
                            Fit <span className="font-mono font-semibold text-slate-800">{r.fit}%</span> &middot; tests {r.progress.done}/{r.progress.total}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <Heading>Integrity</Heading>
            <IntegrityBadge sittings={sittings} size="md" />
            <p className="text-[11px] text-slate-500 leading-relaxed">What Vetter's monitor saw while they took your jobs' tests: leaving the window, pasting and the like.</p>
          </section>
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
