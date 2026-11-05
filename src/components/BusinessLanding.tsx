import React, { useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  Eye,
  Globe,
  Layers,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';
import { GUIDES } from '../data/guides';
import { TestTypeCards } from './TestTypeCards';
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

// What the integrity monitor records during a test (src/lib/integrity.ts)
const WATCHED = [
  'Switching tab or to another app',
  'Time away from the test',
  'Narrowing the window to fit something beside it',
  'Pasting text from outside the test',
  'Copying, cutting and right-clicking',
  'Screenshot keys',
  'A second screen being connected',
];

const INTEGRITY_SCALE = [
  { label: 'Clean', dot: 'bg-emerald-500' },
  { label: 'Low', dot: 'bg-lime-500' },
  { label: 'Some', dot: 'bg-amber-500' },
  { label: 'Suspicious', dot: 'bg-orange-500' },
  { label: 'Highly suspicious', dot: 'bg-rose-600' },
];

const FAQ = [
  {
    q: 'When should candidates take the test?',
    a: 'At the start. Every applicant takes the job’s tests before their application reaches you, so you only read applications that come with a score, and you can interview the best people first.',
  },
  {
    q: 'Can we use our own questions?',
    a: 'Yes. Build a test by hand question by question, have Vetter’s AI write one from your job description, or mix your tests with ready-made ones from the library.',
  },
  {
    q: 'How do you stop cheating?',
    a: 'Vetter records what the browser can see during a test (tab and window switches, pasting from elsewhere, a second screen and more) and turns it into a label from green to red on every application. Highly suspicious applications are set aside automatically. AI-written tests are new for each role, so answers are hard to share.',
  },
  {
    q: 'Does it replace interviews?',
    a: 'No. It tells you who to interview. Spend your interview time on people who have already shown they can do the work.',
  },
  {
    q: 'How is marking done?',
    a: 'Code, SQL and spreadsheet tasks are checked automatically; written and short answers are marked by AI, with partial credit and no penalty for typos. You can open every answer and see how it was marked.',
  },
  {
    q: 'Do candidates pay?',
    a: 'Never. Vetter is free for candidates, and they keep their verified scores to use for other jobs.',
  },
  {
    q: 'What does it cost?',
    a: 'Your first job is free, with no card. After that, pay per job or by the month; AI test writing uses prepaid credit, and Vetter shows the cost before it writes. See the plans below.',
  },
  {
    q: 'How long does it take to set up?',
    a: 'Minutes. Paste a job description into the chat, pick tests, and post the job. A typical AI-written test is ready in a few minutes.',
  },
];

// Guides shown on the landing page
const FEATURED_GUIDES = ['get-started', 'create-a-test-from-a-job-description', 'anti-cheat-integrity-label', 'review-candidates-and-shortlist'];

// What companies see before signing up: what Vetter does for hiring, how it works, and the plans
export const BusinessLanding: React.FC<{ onJoin: (reason?: string) => void; onOpenGuide: (slug: string | null) => void }> = ({ onJoin, onOpenGuide }) => {
  const startFree = () => onJoin('Create a company account to post your first job. It’s free.');
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
              onClick={startFree}
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

        <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
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
              <div key={f.title} className="rounded-2xl bg-white border border-slate-200 p-6 flex gap-4">
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

      {/* Formats */}
      <section className="bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">What candidates do</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">See the work, not the CV</h2>
            <p className="mt-3 text-slate-600">
              Mix question types in one test. Hands-on tasks give candidates the tools of the job, so you see how they’d actually work.
            </p>
          </div>
          <div className="mt-10">
            <TestTypeCards />
          </div>
        </div>
      </section>

      {/* Scores you can check */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid gap-10 lg:grid-cols-2 items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Results</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">A score you can check</h2>
          <p className="mt-3 text-slate-600">
            Every candidate gets an overall score and a score for each skill. Open any of them to see the answers behind it and how each was
            marked. Nothing is a black box.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            {[
              'Candidates ranked and split into tiers by overall score',
              'Filter to people who meet every required skill score',
              'Every answer there to review, with partial credit shown',
              'Download results as a CSV for your team or your own system',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl bg-white p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-900">Amara O. · Data Analyst</div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Example</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">SQL and spreadsheet simulation</div>
          <div className="mt-5 space-y-3">
            {[
              { skill: 'SQL', score: 96 },
              { skill: 'Spreadsheets', score: 92 },
              { skill: 'Data cleaning', score: 88 },
              { skill: 'Explaining results', score: 81 },
            ].map((r) => (
              <div key={r.skill} className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3 text-sm">
                <span className="text-slate-700">{r.skill}</span>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-indigo-600" style={{ width: `${r.score}%` }} />
                </div>
                <span className="font-mono font-bold tabular-nums text-right text-slate-900">{r.score}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Clean
            </span>
            <span className="text-indigo-700 font-semibold">See every answer</span>
          </div>
        </div>
      </section>

      {/* Anti-cheat */}
      <section className="bg-indigo-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid gap-10 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Anti-cheat</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">Hard to game, and you can see why</h2>
            <p className="mt-3 text-indigo-100">
              While a candidate is in a test, Vetter records what the browser can see. It weighs everything into one label on the application,
              and a timeline shows which question was on screen when each thing happened.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {INTEGRITY_SCALE.map((l) => (
                <span key={l.label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  <span className={`w-2 h-2 rounded-full ${l.dot}`} /> {l.label}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm text-indigo-200">
              Highly suspicious applications are set aside automatically. Everything else is flagged for you to judge, never failed on its own.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/5 p-5">
              <Eye className="w-5 h-5 text-indigo-300" />
              <h3 className="mt-3 font-bold">What’s recorded</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-indigo-100">
                {WATCHED.map((w) => (
                  <li key={w}>· {w}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white/5 p-5">
              <ShieldCheck className="w-5 h-5 text-indigo-300" />
              <h3 className="mt-3 font-bold">Built into the test</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-indigo-100">
                <li>· AI-written tests are new for each role</li>
                <li>· Hands-on tasks that a chatbot can’t do for them</li>
                <li>· Time limits candidates see before they start</li>
                <li>· An attempt counts once they sign and begin</li>
                <li>· Leaving the test means retaking it</li>
                <li>· Limit how many attempts each person gets</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Library */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid gap-10 lg:grid-cols-[1fr_1.2fr] items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Ready-made tests</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">A library to start from</h2>
          <p className="mt-3 text-slate-600">
            Tests for engineering, data, analysis, QA, finance, marketing, sales, healthcare, consulting and more, browsable by industry and
            role. Most come at four levels, each covering the ones below it.
          </p>
          <p className="mt-3 text-slate-600">
            Need something specific? Paste your job description and Vetter writes a test for it. Share your best tests in the public library once
            the Vetter team approves them.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Layers, title: 'Four levels', text: 'From entry level to senior, so the test matches the job.' },
            { icon: Sparkles, title: 'Written from your job', text: 'AI plans what the hire needs, then writes the questions.' },
            { icon: ClipboardCheck, title: 'Try it first', text: 'Sit any test as a candidate before you send it.' },
            { icon: Users, title: 'Shared by companies', text: 'Use tests other companies have shared, or share yours.' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl bg-white border border-slate-200 p-5">
                <Icon className="w-5 h-5 text-indigo-600" />
                <h3 className="mt-3 font-bold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Guides */}
      <section className="bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Get started easily</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Step-by-step guides</h2>
            </div>
            <button onClick={() => onOpenGuide(null)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
              <BookOpen className="w-4 h-4" /> All guides
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_GUIDES.map((slug) => GUIDES.find((g) => g.slug === slug)!).map((g) => (
              <button key={g.slug} onClick={() => onOpenGuide(g.slug)} className="group text-left rounded-2xl bg-white border border-slate-200 p-5 hover:ring-1 hover:ring-indigo-300">
                <h3 className="font-bold text-slate-900 group-hover:text-indigo-700">{g.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{g.summary}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <PricingSection onChoosePlan={choosePlan} />

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 text-center">Questions companies ask</h2>
        <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                {f.q}
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Closing */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <div className="rounded-3xl bg-indigo-600 px-6 py-12 sm:px-12 text-center text-white">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Bring one open role</h2>
          <p className="mt-3 text-indigo-100 max-w-xl mx-auto">
            Paste its job description, see the test Vetter would set, and send it to your applicants. Your first job is free.
          </p>
          <button
            onClick={startFree}
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50"
          >
            Post your first job free <ArrowRight className="w-4 h-4" />
          </button>
          <p className="mt-3 text-xs text-indigo-200">No card needed · Free for candidates</p>
        </div>
      </section>
    </div>
  );
};
