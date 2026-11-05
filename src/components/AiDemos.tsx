import React, { useRef } from 'react';
import { AnimatePresence, motion, useInView } from 'motion/react';
import { Check, FileText, Sparkles } from 'lucide-react';
import { useStages, useTypewriter } from './Motion';

// Looping illustrations of Vetter's AI at work for the public pages. Both are labelled Example: the job, the answer
// and the figures are made up to show the flow, not taken from a real account

const EASE = [0.22, 1, 0.36, 1] as const;

const ExampleTag = () => <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">Example</span>;

const PanelTop: React.FC<{ title: string; busy?: boolean }> = ({ title, busy }) => (
  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-900/[0.06]">
    <div className="flex items-center gap-2.5">
      <span className={`w-6 h-6 rounded-lg ${busy ? 'ai-mark' : 'ai-mark-still'}`} />
      <span className="text-[13px] font-semibold text-slate-900">{title}</span>
    </div>
    <ExampleTag />
  </div>
);

const JD =
  'Data Analyst, Payments team. You’ll own weekly revenue reporting in SQL and Sheets, clean messy exports and explain what moved to non-technical leads.';

const PLAN = [
  { skill: 'SQL: joins and aggregates', weight: 35 },
  { skill: 'Spreadsheet modelling', weight: 25 },
  { skill: 'Data cleaning', weight: 20 },
  { skill: 'Explaining results', weight: 20 },
];

// For companies: a job description goes in, a plan of skills and a finished test come out
export const AiTestWriterDemo: React.FC = () => {
  const { ref, stage } = useStages([3400, 1500, 2600, 3600]);
  const typed = useTypewriter(JD, stage === 0, 28);
  const jd = stage === 0 ? typed : JD;
  return (
    <div ref={ref} className="ai-panel overflow-hidden text-left">
      <PanelTop title="Vetter AI · Test writer" busy={stage === 1} />
      <div className="p-5 space-y-4">
        <div className="rounded-xl bg-slate-50 ring-1 ring-slate-900/[0.06] p-3.5">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <FileText className="w-3.5 h-3.5" /> Job description
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700 min-h-[4.5rem]">
            {jd}
            {stage === 0 && <span className="ai-caret" />}
          </p>
        </div>

        <div className="min-h-[13.5rem]">
          <AnimatePresence mode="wait">
            {stage === 1 && (
              <motion.div key="think" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm py-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="ai-shimmer font-medium">Reading the role and planning what to test…</span>
              </motion.div>
            )}
            {stage >= 2 && (
              <motion.div key="plan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Plan</div>
                <ul className="mt-2 space-y-2.5">
                  {PLAN.map((p, i) => (
                    <motion.li
                      key={p.skill}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.18, duration: 0.5, ease: EASE }}
                      className="grid grid-cols-[1fr_6rem_2.25rem] items-center gap-3 text-[13px]"
                    >
                      <span className="text-slate-700 truncate">{p.skill}</span>
                      <span className="h-1 rounded-full bg-slate-100 overflow-hidden">
                        <motion.span
                          className="block h-full rounded-full ai-gradient"
                          initial={{ width: 0 }}
                          animate={{ width: `${p.weight * 2.5}%` }}
                          transition={{ delay: 0.2 + i * 0.18, duration: 0.8, ease: EASE }}
                        />
                      </span>
                      <span className="font-mono text-xs tabular-nums text-right text-slate-500">{p.weight}%</span>
                    </motion.li>
                  ))}
                </ul>
                <AnimatePresence>
                  {stage === 3 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className="mt-4 flex items-center justify-between rounded-xl bg-slate-900 text-white px-4 py-3"
                    >
                      <span className="flex items-center gap-2 text-[13px] font-medium">
                        <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </span>
                        Test ready
                      </span>
                      <span className="text-xs text-slate-300">18 questions · 15-min simulation</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const ANSWER =
  'Refunds are booked as new negative rows in the same month, but the dashboard sums gross orders before netting them off, so a refunded order counts once as revenue and is never removed.';

// For candidates: a written answer goes in, and the AI marks it with partial credit and a line of feedback
export const AiMarkingDemo: React.FC = () => {
  const { ref, stage } = useStages([4200, 1300, 4200]);
  const typed = useTypewriter(ANSWER, stage === 0, 30);
  return (
    <div ref={ref} className="ai-panel overflow-hidden text-left">
      <PanelTop title="Vetter AI · Marking" busy={stage === 1} />
      <div className="p-5 space-y-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400">Question 7 · Written answer</div>
          <p className="mt-1.5 text-[14px] font-medium text-slate-900">Why could the revenue dashboard be counting refunded orders?</p>
        </div>
        <div className="rounded-xl bg-slate-50 ring-1 ring-slate-900/[0.06] p-3.5 text-[13px] leading-relaxed text-slate-700 min-h-[6.25rem]">
          {stage === 0 ? typed : ANSWER}
          {stage === 0 && <span className="ai-caret" />}
        </div>
        <div className="min-h-[6.5rem]">
          <AnimatePresence mode="wait">
            {stage === 1 && (
              <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm py-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="ai-shimmer font-medium">Marking against the answer guide…</span>
              </motion.div>
            )}
            {stage === 2 && (
              <motion.div
                key="r"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="rounded-xl ring-1 ring-slate-900/[0.08] bg-white p-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex gap-1.5">
                    {['Partial credit', 'Typos ignored'].map((t) => (
                      <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {t}
                      </span>
                    ))}
                  </span>
                  <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                    8<span className="text-slate-400">/10</span>
                  </span>
                </div>
                <p className="mt-2 text-[13px] text-slate-600">
                  Finds the cause clearly. To get full marks, say how you’d fix it: net refunds against the original order’s month.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// A slow sideways stream of the skills Vetter tests, under the heroes
const SKILLS = [
  'SQL',
  'Python',
  'React',
  'Excel modelling',
  'Data cleaning',
  'Financial analysis',
  'QA and testing',
  'Node APIs',
  'Dashboards',
  'Sales discovery',
  'Marketing analytics',
  'Clinical reasoning',
  'Consulting cases',
  'Written communication',
];
// It only moves while it's on screen
export const SkillsMarquee: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
  <div ref={ref} className="ai-marquee-mask overflow-hidden" aria-hidden="true">
    <div className="ai-marquee" data-paused={!inView}>
      {[...SKILLS, ...SKILLS].map((s, i) => (
        <span key={i} className="mx-2 shrink-0 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-medium text-slate-600">
          {s}
        </span>
      ))}
    </div>
  </div>
  );
};
