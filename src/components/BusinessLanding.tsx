import React, { useEffect } from 'react';
import { ArrowRight, Briefcase, CheckCircle2, ClipboardCheck, Database, Globe, Sparkles, Trophy, Users } from 'lucide-react';
import { RankDisc } from './RankDisc';
import { PricingSection } from './PricingSection';

// An illustration of a job's leaderboard on the hero; the names are made up and it's labelled as an example
const EXAMPLE_RANKING = [
  { name: 'Amara O.', title: 'Data Analyst', score: 94 },
  { name: 'Tom W.', title: 'BI Analyst', score: 89 },
  { name: 'Leah K.', title: 'Junior Analyst', score: 86 },
  { name: 'Sam P.', title: 'Analyst', score: 78 },
];

const STEPS = [
  {
    icon: Briefcase,
    title: 'Post a job',
    text: 'Describe the role. Vetter lists it on your page and on Google Jobs, and you can invite people by email or link.',
  },
  {
    icon: ClipboardCheck,
    title: 'Send tests that fit',
    text: 'Pick from Vetter’s library, or have AI write a test and a 15-minute job simulation from your job description.',
  },
  {
    icon: Trophy,
    title: 'Hire from the leaderboard',
    text: 'Every answer is marked for you. Candidates are ranked by what they can do, with every answer there to review.',
  },
];

const FEATURES = [
  {
    icon: Database,
    title: 'Real work, not trivia',
    text: 'Simulations put candidates in a working spreadsheet or SQL workbench with a brief, like their first week in the job.',
  },
  {
    icon: Sparkles,
    title: 'Fair, consistent marking',
    text: 'Code, SQL and short answers are checked automatically, then reviewed by AI for partial credit. Typos don’t cost marks.',
  },
  {
    icon: Users,
    title: 'A pool of tested people',
    text: 'Candidates keep their verified scores. Search people who have already proved the skills you need.',
  },
  {
    icon: Globe,
    title: 'Free for candidates',
    text: 'No paywall in front of your applicants, so good people don’t drop out before they’ve shown what they can do.',
  },
];

// What companies see before signing up: what Vetter does for hiring, how it works, and the plans
export const BusinessLanding: React.FC<{ onJoin: (reason?: string) => void }> = ({ onJoin }) => {
  const seePricing = () => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  // Old #/pricing links open here at the plans
  useEffect(() => {
    if (window.location.hash === '#/pricing') document.getElementById('pricing')?.scrollIntoView();
  }, []);
  const choosePlan = (plan: string) =>
    onJoin(
      plan === 'enterprise'
        ? 'Create a company account and we’ll be in touch about Enterprise.'
        : 'Create a company account to get started. Your first job is free.'
    );

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-16 grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Vetter for business</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
            Hire on skills,
            <br />
            not CVs
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-xl">
            Send candidates a short test or a 15-minute job simulation. Vetter marks it and ranks everyone by what they can actually do.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onJoin('Create a company account to post your first job. It’s free.')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Post your first job free <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={seePricing} className="px-6 py-3 rounded-full text-sm font-semibold text-slate-700 hover:text-slate-900">
              See pricing
            </button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            {['No card needed', 'Set up in minutes', 'Free for candidates'].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-900">Data Analyst · Leaderboard</div>
              <div className="text-xs text-slate-500">SQL and spreadsheet simulation</div>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Example</span>
          </div>
          <ol className="mt-5 space-y-4">
            {EXAMPLE_RANKING.map((c, i) => (
              <li key={c.name} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-3">
                <RankDisc rank={i + 1} />
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 truncate">{c.name}</span>
                    <span className="text-[11px] text-slate-500 truncate">{c.title}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-indigo-600" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
                <span className="font-mono font-bold tabular-nums text-sm text-slate-900">{c.score}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What it replaces */}
      <section className="bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-6 sm:grid-cols-3 text-center">
          {[
            { figure: '£5k–15k', label: 'a typical agency fee per hire' },
            { figure: '£100–400', label: 'a typical job ad, with no screening' },
            { figure: 'From £0', label: 'a job on Vetter, with every candidate tested' },
          ].map((s, i) => (
            <div key={s.label}>
              <div className={`text-3xl font-extrabold tracking-tight tabular-nums ${i === 2 ? 'text-indigo-600' : 'text-slate-900'}`}>{s.figure}</div>
              <div className="mt-1 text-sm text-slate-600">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">How it works</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">From job post to shortlist in a day</h2>
        </div>
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={step.title}>
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-400">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{step.text}</p>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Why Vetter */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl bg-white p-6 flex gap-4">
                <Icon className="w-6 h-6 text-indigo-600 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{f.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <PricingSection onChoosePlan={choosePlan} />
    </div>
  );
};
