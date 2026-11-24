import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  GraduationCap,
  Lock,
  MapPin,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Target,
} from 'lucide-react';
import { AssessmentTest, Business, CandidateJobMatch, JobPosting, JobProfile, TestRole, User } from '../types';
import { Pic } from './Pic';
import { CertificationList, EducationList, ExperienceList, ProfileLinks } from './ExperienceList';
import { TestHistory } from './TestHistory';
import { JobSimRecord } from './JobSimRecord';
import { ProfileSidebar } from './ProfileSidebar';
import { stageOf } from '../lib/audience';
import { sortExperience } from '../lib/experience';
import { getLeaderboard } from '../lib/leaderboard';
import { SectorId } from '../lib/sectors';
import { StepAction, useProfileProgress } from '../lib/profileProgress';

/**
 * The candidate's own profile, laid out like a LinkedIn profile: a cover and photo, their headline and links, then what
 * Praxa adds: how complete the profile is (and the one thing to do next), their progress through their role's tests,
 * their test scores, then their experience, education, tests and applications. Skills only ever come from Praxa's
 * tests (a score, no pass mark), so most of the nudges here are tests.
 */

interface MyProfileProps {
  candidate: User;
  shown: { title: string; bio: string; verifiedSkills: User['verifiedSkills'] };
  profiles: JobProfile[];
  activeProfile: JobProfile;
  allCandidates: User[];
  tests: AssessmentTest[];
  jobs: JobPosting[];
  businesses: Business[];
  rankedJobs: CandidateJobMatch[];
  appliedJobs: JobPosting[];
  sector: SectorId;
  onSwitchProfile: (id: string) => void;
  onNewProfile: () => void;
  onEditProfile: () => void;
  onEditStudies: () => void;
  onEditExperience: () => void;
  onEditEducation: () => void;
  onImportCv: () => void;
  onFindTests: () => void;
  onFindJobs: () => void;
  onOpenTest: (testId: string) => void;
  onPreviewJob: (jobId: string) => void;
  onOpenJob: (jobId: string) => void;
  onToggleHidden: (testId: string) => void;
  // Saves a new name on their account; unset for visitors
  onRename?: (name: string) => void;
  // Shows their profile as other people see it
  onPreview?: () => void;
}

// A ring that fills as the profile does, drawn around the photo
const Ring: React.FC<{ value: number; size: number; stroke: number; className?: string }> = ({ value, size, stroke, className }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className={className} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, value / 100)))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 600ms ease' }}
      />
    </svg>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`bg-white border border-slate-200 rounded-2xl shadow-xs ${className}`}>{children}</section>
);

const EditButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className="w-9 h-9 shrink-0 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors"
  >
    <Pencil className="w-4 h-4" />
  </button>
);

export const MyProfile: React.FC<MyProfileProps> = (p) => {
  const { candidate, shown, tests, jobs, allCandidates } = p;
  const { roles, role, setRole, path, takenModules, nextModule, pathPct, scoredAny, steps, strength, level, todo, testFor } = useProfileProgress({
    candidate,
    shown,
    activeProfile: p.activeProfile,
    tests,
    jobs,
    sector: p.sector,
  });
  // What each step's button does here
  const run = (action: StepAction) => {
    const testId = testFor(action);
    if (testId) return p.onOpenTest(testId);
    if (action === 'profile') return p.onEditProfile();
    if (action === 'experience') return p.onEditExperience();
    if (action === 'education') return p.onEditEducation();
    if (action === 'details') return p.onEditStudies();
    p.onFindTests();
  };
  const [showAllSteps, setShowAllSteps] = useState(false);

  // ---- Their numbers
  const praxaTaken = new Set(candidate.verifiedSkills.map((s) => s.testId)).size;
  const ranks = candidate.verifiedSkills
    .map((v) => {
      const board = getLeaderboard(v.testId, allCandidates);
      const at = board.findIndex((e) => e.candidate.id === candidate.id);
      return at >= 0 ? { name: v.skillName, testId: v.testId, rank: at + 1, of: board.length } : null;
    })
    .filter((r): r is { name: string; testId: string; rank: number; of: number } => !!r)
    .sort((a, b) => a.rank / a.of - b.rank / b.of);
  const bestRank = ranks[0];
  const strongFits = p.rankedJobs.filter((m) => m.overallFitPercentage >= 80).length;

  // ---- Who they are
  const history = sortExperience(candidate.experience ?? []);
  const current = history.find((h) => !h.end) ?? history[0];
  const school = candidate.education?.[0];
  const skills = [...shown.verifiedSkills].sort((a, b) => b.score - a.score);
  const [allSkills, setAllSkills] = useState(false);
  const [naming, setNaming] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
      <div className="min-w-0 space-y-4">
        {/* ---------- Header: photo with the strength ring, who they are, and their numbers at a glance ---------- */}
        <Card className="overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-indigo-600 via-violet-500 to-sky-400" />
          <div className="px-5 sm:px-7 pt-5 pb-6">
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0" title={`Profile strength: ${strength}%`}>
                <Ring value={strength} size={96} stroke={4} className="absolute inset-0 w-full h-full text-emerald-500" />
                <div className="absolute inset-[6px] rounded-full overflow-hidden bg-slate-100">
                  <Pic src={candidate.avatarUrl} alt={candidate.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {naming !== null && p.onRename ? (
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (naming.trim()) p.onRename!(naming);
                        setNaming(null);
                      }}
                    >
                      <input
                        autoFocus
                        value={naming}
                        onChange={(e) => setNaming(e.target.value)}
                        onKeyDown={(e) => e.key === 'Escape' && setNaming(null)}
                        aria-label="Your name"
                        maxLength={80}
                        className="text-xl font-bold text-slate-900 px-2 py-1 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button type="submit" className="px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                        Save
                      </button>
                      <button type="button" onClick={() => setNaming(null)} className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:bg-slate-100">
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{candidate.name}</h1>
                      {p.onRename && (
                        <button onClick={() => setNaming(candidate.name)} aria-label="Change your name" title="Change your name" className="p-1 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                {shown.title ? (
                  <p className="text-base text-slate-800 leading-snug">{shown.title}</p>
                ) : (
                  <button onClick={p.onEditProfile} className="text-base text-indigo-700 hover:underline">
                    + Add a headline
                  </button>
                )}
                <p className="text-sm text-slate-500 flex flex-wrap items-center gap-x-1.5">
                  {[
                    candidate.location && (
                      <span key="loc" className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {candidate.location}
                      </span>
                    ),
                    candidate.workPreference && <span key="work">{candidate.workPreference}</span>,
                    candidate.yearsExperience > 0 && <span key="yrs">{candidate.yearsExperience} yrs experience</span>,
                    current && (
                      <span key="now" className="inline-flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        {current.company}
                      </span>
                    ),
                    (school || candidate.university) && (
                      <span key="edu" className="inline-flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        {school?.school ?? candidate.university}
                      </span>
                    ),
                  ]
                    .filter(Boolean)
                    .map((el, i) => (
                      <React.Fragment key={i}>
                        {el}
                        <span aria-hidden="true">·</span>
                      </React.Fragment>
                    ))}
                  <button onClick={p.onEditStudies} className="font-semibold text-indigo-700 hover:underline">
                    Contact info
                  </button>
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {p.onPreview && (
                  <button onClick={p.onPreview} title="View as a company" className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">View as a company</span>
                  </button>
                )}
                <EditButton onClick={p.onEditProfile} label="Edit headline and about" />
              </div>
            </div>

            {/* Their numbers: each one a way in to what it counts */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  label: 'Test scores',
                  value: String(praxaTaken),
                  sub: skills[0] ? `Best: ${skills[0].score} in ${skills[0].skillName}` : 'Take your first test',
                  icon: <Award className="w-4 h-4" />,
                  tone: 'text-indigo-600 bg-indigo-50',
                  onClick: () => (skills[0] ? p.onOpenTest(skills[0].testId) : p.onFindTests()),
                },
                {
                  label: 'Best rank',
                  value: bestRank ? `#${bestRank.rank}` : '–',
                  sub: bestRank ? `of ${bestRank.of} on ${bestRank.name}` : 'Ranked once you take a test',
                  icon: <Target className="w-4 h-4" />,
                  tone: 'text-amber-600 bg-amber-50',
                  onClick: () => (bestRank ? p.onOpenTest(bestRank.testId) : p.onFindTests()),
                },
                {
                  label: 'Strong job fits',
                  value: String(strongFits),
                  sub: strongFits ? '80%+ match on your scores' : 'Scores unlock matches',
                  icon: <Briefcase className="w-4 h-4" />,
                  tone: 'text-sky-600 bg-sky-50',
                  onClick: p.onFindJobs,
                },
                {
                  label: 'Profile strength',
                  value: `${strength}%`,
                  sub: level,
                  icon: <Sparkles className="w-4 h-4" />,
                  tone: 'text-emerald-600 bg-emerald-50',
                  onClick: () => (todo[0] ? run(todo[0].action) : p.onEditProfile()),
                },
              ].map((t) => (
                <button key={t.label} onClick={t.onClick} className="text-left p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all group">
                  <span className="flex items-center gap-2">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.tone}`}>{t.icon}</span>
                    <span className="text-xl font-bold text-slate-900 tabular-nums">{t.value}</span>
                  </span>
                  <span className="block mt-1.5 text-xs font-semibold text-slate-700">{t.label}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{t.sub}</span>
                </button>
              ))}
            </div>

            {/* Their strongest proven skills, straight away */}
            {skills.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 mr-1">Proven skills</span>
                {skills.slice(0, 5).map((sk) => (
                  <button
                    key={sk.skillId + sk.testId}
                    onClick={() => p.onOpenTest(sk.testId)}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-0.5 rounded-full bg-slate-50 border border-slate-200 hover:border-indigo-300 text-xs font-medium text-slate-800"
                  >
                    {sk.skillName}
                    <span className={`px-1.5 rounded-full text-[10px] font-bold tabular-nums ${sk.score >= 80 ? 'bg-emerald-100 text-emerald-800' : sk.score >= 60 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'}`}>{sk.score}</span>
                  </button>
                ))}
                {skills.length > 5 && <span className="text-xs text-slate-500">+{skills.length - 5} more below</span>}
              </div>
            )}

            {candidate.links?.length ? (
              <div className="mt-3">
                <ProfileLinks links={candidate.links} />
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={() => (nextModule ? p.onOpenTest(nextModule.test.id) : p.onFindTests())}
                className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {scoredAny ? 'Take another test' : 'Take your first test'}
              </button>
              <button
                onClick={p.onFindJobs}
                className="px-4 py-2 rounded-full border border-indigo-600 text-indigo-700 hover:bg-indigo-50 text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4" />
                Find jobs
              </button>
              <button
                onClick={p.onImportCv}
                className="px-4 py-2 rounded-full border border-slate-400 text-slate-700 hover:bg-slate-50 text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                Fill in from CV
              </button>
            </div>

            {/* Their job profiles: one headline and about for each kind of work, shown once they have more than one */}
            {p.profiles.length > 1 && (
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 mr-1">Showing as</span>
              {p.profiles.map((pr) => (
                <button
                  key={pr.id}
                  onClick={() => p.onSwitchProfile(pr.id)}
                  aria-pressed={pr.id === p.activeProfile.id}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    pr.id === p.activeProfile.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500'
                  }`}
                >
                  {pr.name}
                </button>
              ))}
              <button onClick={p.onNewProfile} className="px-3 py-1 rounded-full text-xs font-semibold border border-dashed border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-700 inline-flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                Profile
              </button>
            </div>
            )}
          </div>
        </Card>

        {/* ---------- Profile strength, with the one next step ---------- */}
        {strength < 100 && (
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Profile strength: {level}</h2>
                <p className="text-xs text-slate-500 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Private to you
                </p>
              </div>
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">{strength}%</span>
            </div>
            {/* Four stages, like LinkedIn's meter */}
            <div className="mt-3 grid grid-cols-4 gap-1">
              {[0, 35, 70, 100].map((start, i, arr) => {
                const end = arr[i + 1] ?? 101;
                const fill = start === 100 ? (strength >= 100 ? 100 : 0) : Math.max(0, Math.min(100, ((strength - start) / (end - start)) * 100));
                return (
                  <div key={start} className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all" style={{ width: `${fill}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="mt-1 grid grid-cols-4 text-[10px] font-semibold text-slate-400">
              <span>Beginner</span>
              <span>Intermediate</span>
              <span>Advanced</span>
              <span className="text-right">All-Star</span>
            </div>

            {todo[0] && (
              <div className={`mt-4 p-4 rounded-xl border flex items-center gap-4 ${todo[0].test ? 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50' : 'border-slate-200 bg-slate-50'}`}>
                <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${todo[0].test ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                  {todo[0].test ? <Target className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Next step · +{todo[0].weight}%</div>
                  <div className="text-sm font-bold text-slate-900">{todo[0].label}</div>
                  <div className="text-xs text-slate-600">{todo[0].hint}</div>
                </div>
                <button onClick={() => run(todo[0].action)} className="shrink-0 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1">
                  {todo[0].cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button onClick={() => setShowAllSteps((v) => !v)} className="mt-3 text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1">
              {showAllSteps ? 'Hide' : `See all ${steps.length} steps`} ({steps.filter((s) => s.done).length} done)
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllSteps ? 'rotate-180' : ''}`} />
            </button>
            {showAllSteps && (
              <ul className="mt-2 divide-y divide-slate-100">
                {steps.map((s) => (
                  <li key={s.id} className="py-2.5 flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${s.done ? 'bg-emerald-500 text-white' : 'border-2 border-slate-300'}`}>
                      {s.done && <Check className="w-3 h-3" strokeWidth={3} />}
                    </span>
                    <span className={`flex-1 text-sm ${s.done ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'}`}>{s.label}</span>
                    <span className="text-[11px] font-mono text-slate-400">+{s.weight}%</span>
                    {!s.done && (
                      <button onClick={() => run(s.action)} className="text-xs font-semibold text-indigo-700 hover:underline">
                        {s.cta}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {/* ---------- Their role's path: every module, done or still to do ---------- */}
        {role && path.length > 0 && (
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 shrink-0">
                  <Ring value={pathPct} size={64} stroke={6} className="text-indigo-600" />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold font-mono tabular-nums text-slate-900">{pathPct}%</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Your {role} path</h2>
                  <p className="text-xs text-slate-500">
                    {takenModules.length} of {path.length} done. Each score goes on your profile for companies to see.
                  </p>
                </div>
              </div>
              <label className="text-xs text-slate-500 inline-flex items-center gap-2">
                Working towards
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as TestRole)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {nextModule && (
              <button
                onClick={() => p.onOpenTest(nextModule.test.id)}
                className="mt-4 w-full text-left p-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-4 group transition-colors"
              >
                <span className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  {nextModule.isSim ? <Briefcase className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-indigo-300">
                    Up next
                  </span>
                  <span className="block text-sm font-bold">{nextModule.sec.label}</span>
                  <span className="block text-xs text-slate-300 truncate">{nextModule.sec.blurb}</span>
                </span>
                <span className="hidden sm:flex flex-col items-end text-[11px] text-slate-300 shrink-0">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />~{nextModule.test.estimatedMinutes} min
                  </span>
                  {nextModule.wanted > 0 && <span>Wanted by {nextModule.wanted} {nextModule.wanted === 1 ? 'job' : 'jobs'}</span>}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}

            <ol className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {path.map((m, i) => {
                const done = m.best !== undefined;
                return (
                  <li key={m.sec.id}>
                    <button
                      onClick={() => p.onOpenTest(m.test.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                        done ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {done ? <Check className="w-4 h-4" strokeWidth={3} /> : m.isSim ? <Briefcase className="w-4 h-4" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900 truncate">{m.sec.label}</span>
                        <span className="block text-[11px] text-slate-500">
                          {m.best === undefined ? `Not started · ~${m.test.estimatedMinutes} min` : 'Your best score'}
                        </span>
                      </span>
                      {m.best !== undefined ? (
                        <span className="font-mono text-base font-bold tabular-nums text-slate-900">{m.best}</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-indigo-700">Start</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </Card>
        )}

        {/* ---------- About ---------- */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">About</h2>
            <EditButton onClick={p.onEditProfile} label="Edit about" />
          </div>
          {shown.bio ? (
            <p className="mt-1 text-sm text-slate-700 leading-relaxed whitespace-pre-line">{shown.bio}</p>
          ) : (
            <button onClick={p.onEditProfile} className="mt-2 w-full p-4 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-700">
              Say what you do and what you want next, in two or three sentences
            </button>
          )}
        </Card>

        {/* ---------- Job simulations: a working day in the role, kept apart from skills ---------- */}
        <JobSimRecord person={candidate} tests={tests} onOpenTest={p.onOpenTest} own />

        {/* ---------- Test scores: only ever from Praxa's tests ---------- */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Test scores</h2>
              <p className="text-xs text-slate-500">Your best score on each Praxa test you've taken; nothing here is self-listed.</p>
            </div>
            <button onClick={p.onFindTests} aria-label="Take a test" title="Take a test" className="w-9 h-9 shrink-0 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          {skills.length === 0 ? (
            <div className="mt-4 p-5 rounded-xl border border-dashed border-slate-300 text-center space-y-2">
              <Award className="w-8 h-8 text-indigo-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No scores yet</p>
              <p className="text-xs text-slate-500">Companies on Praxa hire on test scores. Your first test takes about 20 minutes.</p>
              <button onClick={() => (nextModule ? p.onOpenTest(nextModule.test.id) : p.onFindTests())} className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                {nextModule ? `Start ${nextModule.sec.label}` : 'Find a test'}
              </button>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {(allSkills ? skills : skills.slice(0, 4)).map((s) => {
                const r = ranks.find((x) => x.testId === s.testId);
                return (
                  <li key={s.skillId}>
                    <button onClick={() => p.onOpenTest(s.testId)} className="w-full py-3 flex items-center gap-4 text-left group">
                      <span className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900 group-hover:text-indigo-700">{s.skillName}</span>
                        <span className="block text-xs text-slate-500">
                          {s.level}
                          {r && ` · #${r.rank} of ${r.of}`}
                        </span>
                        <span className="mt-1.5 block h-1.5 rounded-full bg-slate-100 overflow-hidden max-w-xs">
                          <span
                            className="block h-full rounded-full bg-indigo-500"
                            style={{ width: `${s.score}%` }}
                          />
                        </span>
                      </span>
                      <span className="font-mono text-xl font-bold tabular-nums text-slate-900">{s.score}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {skills.length > 4 && (
            <button onClick={() => setAllSkills((v) => !v)} className="mt-1 w-full pt-3 border-t border-slate-100 text-sm font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center justify-center gap-1">
              {allSkills ? 'Show fewer' : `Show all ${skills.length} scores`}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </Card>

        {/* ---------- Experience ---------- */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Experience</h2>
            <div className="flex items-center">
              <button onClick={p.onImportCv} aria-label="Fill in from your CV" title="Fill in from your CV" className="w-9 h-9 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </button>
              <EditButton onClick={p.onEditExperience} label="Edit experience" />
            </div>
          </div>
          <div className="mt-3">
            {candidate.experience?.length ? (
              <ExperienceList items={candidate.experience} />
            ) : (
              <button onClick={p.onImportCv} className="w-full p-5 rounded-xl border border-dashed border-indigo-300 bg-gradient-to-r from-indigo-50/60 to-white text-left flex items-center gap-4 hover:border-indigo-400">
                <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">Fill it in from your CV</span>
                  <span className="block text-xs text-slate-600">Add your CV or paste your LinkedIn, and check what Praxa fills in.</span>
                </span>
              </button>
            )}
          </div>
        </Card>

        {/* ---------- Education and certifications ---------- */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Education</h2>
            <EditButton onClick={p.onEditEducation} label="Edit education and certifications" />
          </div>
          <div className="mt-3">
            {candidate.education?.length ? (
              <EducationList items={candidate.education} />
            ) : (
              <button onClick={p.onEditEducation} className="w-full p-4 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-700">
                Add your degree or qualifications
              </button>
            )}
          </div>
          {!!candidate.certifications?.length && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <h3 className="text-base font-bold text-slate-900 mb-3">Licenses & certifications</h3>
              <CertificationList items={candidate.certifications} />
            </div>
          )}
        </Card>

        {/* ---------- Every test taken ---------- */}
        <Card className="p-5 sm:p-6 space-y-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Test record</h2>
            <p className="text-xs text-slate-500">
              Every attempt. Others see your Praxa tests; a company's own test goes to that company only. Hiding a test takes it off your public profile, but companies still see it.
            </p>
          </div>
          <TestHistory
            person={candidate}
            tests={tests}
            candidates={allCandidates}
            businesses={p.businesses}
            companyResultsFor="all"
            onOpenTest={p.onOpenTest}
            onToggleHidden={p.onToggleHidden}
            emptyText="You haven't taken a test yet."
          />
        </Card>

        {/* ---------- Applications ---------- */}
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Applications</h2>
          {p.appliedJobs.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">
              You haven't applied to a job yet.{' '}
              <button onClick={p.onFindJobs} className="text-indigo-700 font-semibold hover:underline">
                Find jobs that fit you
              </button>
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {p.appliedJobs.map((job) => (
                <li key={job.id} className="py-3 flex items-center gap-3">
                  <Pic src={job.companyLogo} alt="" referrerPolicy="no-referrer" className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <button onClick={() => p.onOpenJob(job.id)} className="block text-sm font-bold text-slate-900 hover:text-indigo-700 text-left truncate">
                      {job.title}
                    </button>
                    <div className="text-xs text-slate-500 truncate">
                      {job.companyName} · {job.location}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Applied
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ---------- Right column ---------- */}
      <div className="space-y-4 min-w-0 lg:sticky lg:top-20">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-900">Details</h2>
            <button onClick={p.onEditStudies} className="text-[11px] font-semibold text-indigo-700 hover:underline">
              Edit
            </button>
          </div>
          <dl className="space-y-1.5 text-xs">
            {[
              ['Location', candidate.location],
              ['Works', candidate.workPreference],
              ['Experience', candidate.yearsExperience ? `${candidate.yearsExperience} ${candidate.yearsExperience === 1 ? 'year' : 'years'}` : ''],
              ['Stage', stageOf(candidate)],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-medium text-slate-900 text-right">{v}</dd>
                </div>
              ))}
          </dl>
          {!candidate.links?.length && <p className="text-[11px] text-slate-500">Add LinkedIn, GitHub or a portfolio under Edit.</p>}
        </Card>

        <ProfileSidebar candidate={candidate} tests={path.length ? path.filter((m) => m.best === undefined).map((m) => m.test) : tests} jobs={jobs} rankedJobs={p.rankedJobs} onOpenTest={p.onOpenTest} onOpenJob={p.onPreviewJob} />
      </div>
    </div>
  );
};
