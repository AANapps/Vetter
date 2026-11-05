import React, { useEffect, useRef } from 'react';
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
import { useCurrency } from '../lib/currency';
import { RankDisc } from './RankDisc';
import { PricingSection } from './PricingSection';
import { Reveal, ScrollLine, WordsIn, motion, useParallax } from './Motion';
import { AiTestWriterDemo, SkillsMarquee } from './AiDemos';

// An illustration of a job's leaderboard on the hero; the names are made up and it's labelled as an example
const EXAMPLE_RANKING = [
  { name: 'Amara O.', title: 'Data Analyst', score: 94 },
  { name: 'Tom W.', title: 'BI Analyst', score: 89 },
  { name: 'Leah K.', title: 'Junior Analyst', score: 86 },
  { name: 'Sam P.', title: 'Analyst', score: 78 },
];

// What the AI does across a hire, the three things it takes off a hiring team's plate
const AI_DOES = [
  {
    icon: Sparkles,
    title: 'Writes the test',
    text: 'Paste a job description. Vetter’s AI plans the skills the hire needs, then writes the questions and a job simulation, new for each role.',
  },
  {
    icon: ClipboardCheck,
    title: 'Marks every answer',
    text: 'Code, SQL and spreadsheets are run and checked; written answers are marked by AI with partial credit. You can open every mark.',
  },
  {
    icon: Trophy,
    title: 'Ranks the shortlist',
    text: 'Everyone lands on one leaderboard by what they can do, split into tiers, with an integrity label on every application.',
  },
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
export const BusinessLanding: React.FC<{ top?: React.ReactNode; onJoin: (reason?: string) => void; onOpenGuide: (slug: string | null) => void }> = ({
  top,
  onJoin,
  onOpenGuide,
}) => {
  const { money } = useCurrency();
  const { ref: heroRef, y: heroY } = useParallax(-60);
  const stepsRef = useRef<HTMLOListElement>(null);
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
      {/* Hero: the pitch beside the AI turning a job description into a test */}
      <div className="relative isolate">
        <div className="ai-grid" />
        <div className="ai-aurora ai-aurora-still">
          <span />
          <span />
          <span />
          <span />
        </div>
        {top}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-20 grid gap-12 lg:grid-cols-[1.1fr_1fr] items-center">
          <div className="text-center lg:text-left">
            <Reveal y={10}>
              <span className="ai-chip">
                <span className="ai-chip-dot">
                  <Sparkles className="w-3 h-3" />
                </span>
                AI-written, AI-marked hiring tests
              </span>
            </Reveal>
            <h1 className="mt-6 text-[2.6rem] sm:text-7xl font-semibold tracking-tighter text-slate-900 leading-[0.98]">
              <WordsIn text={'Hire on skills,\nnot CVs'} highlight={['skills,']} delay={0.1} />
            </h1>
            <Reveal delay={0.45}>
              <p className="mt-6 text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">
                Paste a job description. Vetter’s AI writes a test and a 15-minute job simulation for it, marks every answer, and ranks
                everyone by what they can actually do.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center lg:justify-start gap-3">
                <button
                  onClick={startFree}
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-medium"
                >
                  Post your first job free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={seePricing} className="px-6 py-3 rounded-full bg-white text-sm font-medium text-slate-800">
                  See pricing
                </button>
              </div>
              <ul className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-slate-500">
                {['No card needed', 'Set up in minutes', 'Free for candidates'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-900" /> {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <motion.div ref={heroRef} style={{ y: heroY }}>
            <Reveal delay={0.3} y={40}>
              <AiTestWriterDemo />
            </Reveal>
          </motion.div>
        </section>
      </div>

      <Reveal className="pb-6">
        <SkillsMarquee />
      </Reveal>

      {/* What it replaces */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <Reveal className="grid gap-px rounded-2xl overflow-hidden bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-3">
          {[
            { figure: `${money(5000, 'GBP', { compact: true })}–${money(15000, 'GBP', { compact: true })}`, label: 'a typical agency fee per hire' },
            { figure: `${money(100)}–${money(400)}`, label: 'a typical job ad, with no screening' },
            { figure: `From ${money(0)}`, label: 'a job on Vetter, with every candidate tested by AI' },
          ].map((s, i) => (
            <div key={s.label} className="bg-white px-6 py-8 text-center">
              <div className={`text-4xl font-semibold tracking-tighter tabular-nums ${i === 2 ? 'ai-text' : 'text-slate-900'}`}>{s.figure}</div>
              <div className="mt-2 text-sm text-slate-500">{s.label}</div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* What the AI does, beside the leaderboard it ends on */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20">
        <Reveal className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">AI at every step</p>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tighter text-slate-900 leading-[1.02]">
            The screening work, <span className="ai-text">done for you</span>
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {AI_DOES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={i * 0.1} className="h-full">
                <div className="group h-full rounded-2xl bg-white border border-slate-200 p-6 transition-transform duration-300 hover:-translate-y-1">
                  <span className="w-10 h-10 rounded-xl ai-gradient text-white flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{f.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={0.1} className="mt-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Data Analyst · Leaderboard</div>
                <div className="text-xs text-slate-500">SQL and spreadsheet simulation</div>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Example</span>
            </div>
            <ol className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
              {EXAMPLE_RANKING.map((c, i) => (
                <li key={c.name} className="grid grid-cols-[1.75rem_1fr_auto] items-center gap-3">
                  <RankDisc rank={i + 1} />
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">{c.name}</span>
                      <span className="text-[11px] text-slate-500 truncate">{c.title}</span>
                    </div>
                    <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full ai-gradient"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${c.score}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.1, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>
                  <span className="font-mono font-semibold tabular-nums text-sm text-slate-900">{c.score}</span>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div className="lg:sticky lg:top-28 self-start">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">How it works</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tighter text-slate-900 leading-[1.02]">From job post to shortlist in a day</h2>
          </Reveal>
        </div>
        <ol ref={stepsRef} className="relative space-y-12 pl-12">
          <ScrollLine target={stepsRef} className="left-[1.1rem] top-2 bottom-2" />
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <Reveal as="li" key={step.title} className="relative">
                <span className="absolute -left-12 top-0 w-9 h-9 rounded-xl bg-white ring-1 ring-slate-200 flex items-center justify-center text-slate-900">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="font-mono text-xs text-slate-400">0{i + 1}</span>
                <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-slate-600 max-w-md">{step.text}</p>
              </Reveal>
            );
          })}
        </ol>
      </section>

      {/* Why Vetter */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 2) * 0.08} className="h-full">
                <div className="h-full rounded-2xl bg-white border border-slate-200 p-6 flex gap-4">
                  <Icon className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold tracking-tight text-slate-900">{f.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{f.text}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Formats */}
      <section className="bg-slate-50/70 border-y border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">What candidates do</p>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tighter leading-[1.02] text-slate-900">See the work, not the CV</h2>
            <p className="mt-3 text-slate-600">
              Mix question types in one test. Hands-on tasks give candidates the tools of the job, so you see how they’d actually work.
            </p>
          </Reveal>
          <Reveal className="mt-10">
            <TestTypeCards />
          </Reveal>
        </div>
      </section>

      {/* Scores you can check */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 grid gap-10 lg:grid-cols-2 items-center">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Results</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tighter leading-[1.02] text-slate-900">A score you can check</h2>
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
        </Reveal>
        <Reveal className="rounded-2xl bg-white p-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold tracking-tight text-slate-900">Amara O. · Data Analyst</div>
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
                <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                  <motion.div className="h-full rounded-full ai-gradient" initial={{ width: 0 }} whileInView={{ width: `${r.score}%` }} viewport={{ once: true }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
                </div>
                <span className="font-mono font-bold tabular-nums text-right text-slate-900">{r.score}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Clean
            </span>
            <span className="text-slate-900 font-medium">See every answer</span>
          </div>
        </Reveal>
      </section>

      {/* Anti-cheat */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div className="ai-grid ai-grid-dark" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24 grid gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Anti-cheat</p>
            <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tighter leading-[1.02]">Hard to game, and you can see why</h2>
            <p className="mt-3 text-slate-300">
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
            <p className="mt-6 text-sm text-slate-400">
              Highly suspicious applications are set aside automatically. Everything else is flagged for you to judge, never failed on its own.
            </p>
          </Reveal>
          <Reveal className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-5">
              <Eye className="w-5 h-5 text-violet-300" />
              <h3 className="mt-3 font-semibold tracking-tight">What’s recorded</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                {WATCHED.map((w) => (
                  <li key={w}>· {w}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-5">
              <ShieldCheck className="w-5 h-5 text-violet-300" />
              <h3 className="mt-3 font-semibold tracking-tight">Built into the test</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-300">
                <li>· AI-written tests are new for each role</li>
                <li>· Hands-on tasks that a chatbot can’t do for them</li>
                <li>· Time limits candidates see before they start</li>
                <li>· An attempt counts once they sign and begin</li>
                <li>· Leaving the test means retaking it</li>
                <li>· Limit how many attempts each person gets</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Library */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 grid gap-10 lg:grid-cols-[1fr_1.2fr] items-center">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Ready-made tests</p>
          <h2 className="mt-2 text-3xl sm:text-5xl font-semibold tracking-tighter leading-[1.02] text-slate-900">A library to start from</h2>
          <p className="mt-3 text-slate-600">
            Tests for engineering, data, analysis, QA, finance, marketing, sales, healthcare, consulting and more, browsable by industry and
            role. Most come at four levels, each covering the ones below it.
          </p>
          <p className="mt-3 text-slate-600">
            Need something specific? Paste your job description and Vetter writes a test for it. Share your best tests in the public library once
            the Vetter team approves them.
          </p>
        </Reveal>
        <Reveal className="grid gap-3 sm:grid-cols-2">
          {[
            { icon: Layers, title: 'Four levels', text: 'From entry level to senior, so the test matches the job.' },
            { icon: Sparkles, title: 'Written from your job', text: 'AI plans what the hire needs, then writes the questions.' },
            { icon: ClipboardCheck, title: 'Try it first', text: 'Sit any test as a candidate before you send it.' },
            { icon: Users, title: 'Shared by companies', text: 'Use tests other companies have shared, or share yours.' },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl bg-white border border-slate-200 p-5">
                <Icon className="w-5 h-5 text-slate-900" />
                <h3 className="mt-3 font-semibold tracking-tight text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.text}</p>
              </div>
            );
          })}
        </Reveal>
      </section>

      {/* Guides */}
      <section className="bg-slate-50/70 border-y border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Get started easily</p>
              <h2 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tighter text-slate-900">Step-by-step guides</h2>
            </div>
            <button onClick={() => onOpenGuide(null)} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
              <BookOpen className="w-4 h-4" /> All guides
            </button>
          </Reveal>
          <Reveal className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_GUIDES.map((slug) => GUIDES.find((g) => g.slug === slug)!).map((g) => (
              <button key={g.slug} onClick={() => onOpenGuide(g.slug)} className="group text-left rounded-2xl bg-white border border-slate-200 p-5 transition-transform duration-300 hover:-translate-y-1">
                <h3 className="font-semibold tracking-tight text-slate-900 ">{g.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{g.summary}</p>
              </button>
            ))}
          </Reveal>
        </div>
      </section>

      <PricingSection onChoosePlan={choosePlan} />

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-24">
        <Reveal><h2 className="text-3xl sm:text-4xl font-semibold tracking-tighter text-slate-900 text-center">Questions companies ask</h2></Reveal>
        <Reveal className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                {f.q}
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* Closing */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
        <Reveal>
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-20 sm:px-12 text-center text-white">
          <div className="ai-grid ai-grid-dark" />
          <div className="ai-aurora ai-aurora-still">
            <span />
            <span />
            <span />
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tighter leading-[1.02]">
            Bring <span className="ai-text">one open role</span>
          </h2>
          <p className="mt-4 text-slate-300 max-w-xl mx-auto">
            Paste its job description, see the test Vetter would set, and send it to your applicants. Your first job is free.
          </p>
          <button
            onClick={startFree}
            className="group mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-900 text-sm font-medium"
          >
            Post your first job free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="mt-3 text-xs text-slate-400">No card needed · Free for candidates</p>
        </div>
        </Reveal>
      </section>
    </div>
  );
};
