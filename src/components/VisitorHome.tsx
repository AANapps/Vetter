import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Pic } from './Pic';
import { ArrowRight, BadgeCheck, Briefcase, Check, ClipboardCheck, Clock, Sparkles, Trophy } from 'lucide-react';
import { Reveal, ScrollLine, ScrollProgress, WordsIn, useParallax } from './Motion';
import { AiMarkingDemo, SkillsMarquee } from './AiDemos';
import { AssessmentTest, JobPosting, isPublic } from '../types';
import { AppTab } from './Navigation';
import { TestTypeCards } from './TestTypeCards';
import { BusinessLanding } from './BusinessLanding';

export type HomeAudience = 'candidates' | 'business';

interface VisitorHomeProps {
  // Who the page is for: people looking for work, or companies hiring (at /#/business)
  audience: HomeAudience;
  onAudienceChange: (audience: HomeAudience) => void;
  tests: AssessmentTest[];
  jobs: JobPosting[];
  onOpenTest: (testId: string) => void;
  onOpenJob: (jobId: string) => void;
  onGoTo: (tab: AppTab) => void;
  onJoin: (reason?: string) => void;
  onOpenGuide: (slug: string | null) => void;
}

// The switch at the top of the home page between its two sides: a glass pill whose dark thumb slides between them
const AudienceSwitch: React.FC<{ audience: HomeAudience; onChange: (a: HomeAudience) => void }> = ({ audience, onChange }) => (
  <div className="pt-8 sm:pt-10 flex justify-center px-4 relative z-10">
    <div role="tablist" aria-label="Who Vetter is for" className="ai-chip !p-1 !gap-0 text-sm font-medium">
      {(
        [
          ['candidates', 'Looking for work'],
          ['business', 'Hiring'],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          role="tab"
          aria-selected={audience === id}
          onClick={() => onChange(id)}
          className={`relative px-4 sm:px-5 py-1.5 rounded-full transition-colors ${audience === id ? 'text-white' : 'text-slate-600 hover:text-slate-900'}`}
        >
          {audience === id && <motion.span layoutId="audience-thumb" className="absolute inset-0 rounded-full bg-slate-900" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  </div>
);

const STEPS = [
  { icon: ClipboardCheck, title: 'Take a free test', text: 'Short tests and job simulations, 10 to 25 minutes, in the skills jobs actually ask for.' },
  { icon: Sparkles, title: 'AI marks every answer', text: 'Code and SQL are run and checked; written answers are marked by AI with partial credit and feedback. Typos don’t cost marks.' },
  { icon: BadgeCheck, title: 'Get a verified score', text: 'Your score and rank go on your profile, so you never have to prove the same skill twice.' },
  { icon: Briefcase, title: 'Apply with it', text: 'Companies on Vetter hire on test results. Your score goes with every application.' },
];

// The four steps beside a line that draws itself as you scroll down them
const HowItWorks: React.FC = () => {
  const ref = useRef<HTMLOListElement>(null);
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24 grid gap-12 lg:grid-cols-[1fr_1.3fr]">
      <div className="lg:sticky lg:top-28 self-start">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">How it works</p>
          <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tighter text-slate-900 leading-[1.02]">
            From test to hired,
            <br />
            <span className="ai-text">marked by AI</span>
          </h2>
          <p className="mt-4 text-slate-600 max-w-md">No CV screening and no waiting for someone to read your answers. Your result is ready the moment you finish.</p>
        </Reveal>
      </div>
      <ol ref={ref} className="relative space-y-12 pl-12">
        <ScrollLine target={ref} className="left-[1.1rem] top-2 bottom-2" />
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <Reveal as="li" key={step.title} delay={0.05} className="relative">
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
  );
};

// What a signed-out visitor sees first, tailored to who they are: for people looking for work, how it works, what a
// test asks and real tests and jobs; for companies hiring, everything about hiring on Vetter, with the plans
export const VisitorHome: React.FC<VisitorHomeProps> = ({ audience, onAudienceChange, tests, jobs, onOpenTest, onOpenJob, onGoTo, onJoin, onOpenGuide }) => {
  const { ref: heroRef, y: heroY } = useParallax(-60);
  if (audience === 'business') {
    return (
      <div className="overflow-x-clip">
        <ScrollProgress />
        <BusinessLanding top={<AudienceSwitch audience={audience} onChange={onAudienceChange} />} onJoin={onJoin} onOpenGuide={onOpenGuide} />
      </div>
    );
  }
  // Vetter's own tests, one per family (not every level of each)
  const popularTests = tests.filter((t) => isPublic(t) && (!t.familyId || t.familyId === t.id)).slice(0, 6);
  const latestJobs = [...jobs].sort((a, b) => b.postedDate.localeCompare(a.postedDate)).slice(0, 4);

  return (
    <div className="overflow-x-clip">
      <ScrollProgress />
      <div className="relative isolate">
        <div className="ai-grid" />
        <div className="ai-aurora ai-aurora-still">
          <span />
          <span />
          <span />
          <span />
        </div>
        <AudienceSwitch audience={audience} onChange={onAudienceChange} />

        {/* Hero: what Vetter is for people looking for work, beside the AI marking a written answer */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-20 grid gap-12 lg:grid-cols-[1.15fr_1fr] items-center">
          <div className="text-center lg:text-left">
            <Reveal y={10}>
              <span className="ai-chip">
                <span className="ai-chip-dot">
                  <Sparkles className="w-3 h-3" />
                </span>
                AI-marked skills tests · free for candidates
              </span>
            </Reveal>
            <h1 className="mt-6 text-[2.6rem] sm:text-7xl font-semibold tracking-tighter text-slate-900 leading-[0.98]">
              <WordsIn text={'Get hired for\nwhat you can do'} highlight={['can', 'do']} delay={0.1} />
            </h1>
            <Reveal delay={0.45}>
              <p className="mt-6 text-lg text-slate-600 max-w-xl mx-auto lg:mx-0">
                Take short skills tests instead of sending CVs. AI marks every answer in seconds, your verified score goes on your profile, and
                companies hire the people who score best.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row justify-center lg:justify-start gap-3">
                <button onClick={() => onGoTo('tests')} className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-medium">
                  Browse tests <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={() => onGoTo('jobs')} className="px-6 py-3 rounded-full bg-white text-sm font-medium text-slate-800">
                  See jobs
                </button>
              </div>
              <ul className="mt-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2 text-sm text-slate-500">
                {['Free, always', 'No CV needed', 'Keep your scores'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-slate-900" /> {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
          <motion.div style={{ y: heroY }} ref={heroRef}>
            <Reveal delay={0.3} y={40}>
              <AiMarkingDemo />
            </Reveal>
          </motion.div>
        </section>
      </div>

      <Reveal className="pb-6">
        <SkillsMarquee />
      </Reveal>

      <HowItWorks />

      {/* What a test can ask: the kinds of question, each drawn */}
      <section className="bg-slate-50/70 border-y border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">Inside a test</p>
            <h2 className="mt-3 text-3xl sm:text-5xl font-semibold tracking-tighter text-slate-900">Real work, not trivia</h2>
            <p className="mt-3 text-slate-600">
              Tests mix these question types, from quick multiple choice to hands-on tasks in the tools of the job.
            </p>
          </Reveal>
          <Reveal className="mt-10" delay={0.1}>
            <TestTypeCards />
          </Reveal>
        </div>
      </section>

      {/* Real tests to start on */}
      {popularTests.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24">
          <Reveal className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tighter text-slate-900">Popular tests</h2>
              <p className="mt-2 text-slate-600">No invite needed. Your best score on each goes on your profile.</p>
            </div>
            <button onClick={() => onGoTo('tests')} className="group shrink-0 inline-flex items-center gap-1 text-sm font-medium text-slate-900">
              All tests <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularTests.map((t, i) => (
              <Reveal key={t.id} delay={(i % 3) * 0.08}>
                <button
                  onClick={() => onOpenTest(t.id)}
                  className="group w-full h-full rounded-2xl bg-white border border-slate-200 p-6 text-left flex flex-col transition-transform duration-300 hover:-translate-y-1"
                >
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{t.category}</span>
                  <span className="mt-2 text-lg font-semibold tracking-tight text-slate-900 line-clamp-2">{t.title}</span>
                  <span className="mt-auto pt-5 flex items-center gap-3 text-xs text-slate-500">
                    <span>{t.difficulty}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> ~{t.estimatedMinutes} min
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-slate-400">
                      <Sparkles className="w-3.5 h-3.5" /> AI-marked
                    </span>
                  </span>
                </button>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Real jobs hiring on tests */}
      {latestJobs.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-24">
          <Reveal className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tighter text-slate-900">Hiring on Vetter</h2>
              <p className="mt-2 text-slate-600">Jobs where your test score counts.</p>
            </div>
            <button onClick={() => onGoTo('jobs')} className="group shrink-0 inline-flex items-center gap-1 text-sm font-medium text-slate-900">
              All jobs <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </Reveal>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {latestJobs.map((j, i) => (
              <Reveal as="li" key={j.id} delay={(i % 2) * 0.08}>
                <button onClick={() => onOpenJob(j.id)} className="group w-full rounded-2xl bg-white border border-slate-200 p-5 text-left flex items-center gap-4">
                  <Pic src={j.companyLogo} alt="" referrerPolicy="no-referrer" className="w-11 h-11 rounded-xl object-cover bg-slate-100 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold tracking-tight text-slate-900 truncate">{j.title}</span>
                    <span className="block text-xs text-slate-500 truncate">
                      {j.companyName} · {j.location} · {j.workType}
                    </span>
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                    <Trophy className="w-3.5 h-3.5" /> {j.testIds.length} {j.testIds.length === 1 ? 'test' : 'tests'}
                  </span>
                </button>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {/* Sign up */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-20 sm:px-12 text-center text-white">
            <div className="ai-grid ai-grid-dark" />
            <div className="ai-aurora ai-aurora-still">
              <span />
              <span />
              <span />
            </div>
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-tighter">
              Let your skills <span className="ai-text">speak for you</span>
            </h2>
            <p className="mt-4 text-slate-300 max-w-xl mx-auto">Join free, take your first test in minutes, and get seen by companies hiring on skill.</p>
            <button onClick={() => onJoin()} className="group mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-slate-900 text-sm font-medium">
              Join Vetter free <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </Reveal>
      </section>
    </div>
  );
};
