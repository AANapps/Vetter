import { AssessmentTest, Capability, Question } from '../../types';
type TestRole = NonNullable<AssessmentTest['roles']>[number];
type Category = AssessmentTest['category'];
import { DeskPhase, DesktopConfig } from '../../lib/desktop';
import { tc } from '../simulationKit';

/**
 * The shape of every job simulation Corprax makes (not the tests a company designs for itself): 40 minutes on the
 * desktop (src/components/Desktop.tsx), in five parts.
 *
 *   1. Briefing                2 min (not marked)  Company, role, manager, tools
 *   2. Core task              12 min               The most important work of the job, simple first, then harder
 *   3. Curveball               6 min               Something changes or goes wrong; adapt
 *   4. Juggling and judgement 10 min               Several demands at once, plus one grey-area decision with a reason
 *   5. Report back             7 min               Summarise the work for a manager or another team
 *      Buffer                  3 min               Reading, switching tools and saving
 *
 * To fit 40 minutes: the data is pre-loaded (the candidate works, not sets up); every task counts twice (the report
 * back is marked on how it's written and on whether it names the issue planted in the day); two environments, three at
 * most, besides Mail; short instructions, since reading time counts.
 *
 * Each part's brief appears on the desktop as it starts, and its emails (the curveball, the new demands) land then.
 * Checks are numbered by part: 2.1, 2.2 … 5.3.
 */

export type JobSimPart = 'core' | 'curveball' | 'juggling' | 'report';

export const JOB_SIM_PHASES: Omit<DeskPhase, 'brief'>[] = [
  { id: 'briefing', title: 'Briefing', minutes: 2, scored: false },
  { id: 'core', title: 'Core task', minutes: 12, scored: true },
  { id: 'curveball', title: 'Curveball', minutes: 6, scored: true },
  { id: 'juggling', title: 'Juggling and judgement', minutes: 10, scored: true },
  { id: 'report', title: 'Report back', minutes: 7, scored: true },
];
export const JOB_SIM_BUFFER_MINUTES = 3;
export const JOB_SIM_MINUTES = JOB_SIM_PHASES.reduce((n, p) => n + p.minutes, 0) + JOB_SIM_BUFFER_MINUTES;

// A check: the part it belongs to, what it looks for, how it's read off the desktop, the answer (or a rubric), and the
// AI-at-work capability it shows (src/lib/capabilities.ts), if it's not about the job's own skills
export type JobSimCheck = [part: JobSimPart, description: string, input: string, expected: string | { rubric: string[] }, capability?: Capability];

// The work environments besides Mail, Files, the AI assistant and the AI agents (which every desktop may have)
const SUPPORTING_APPS = ['mail', 'files', 'ai', 'agents', 'people'];

export interface JobSimSpec {
  testId: string;
  questionId: string;
  // e.g. "Data Analyst"
  role: string;
  company: string;
  // The day, e.g. "Monday at Ridgeway Coffee"
  day: string;
  description: string;
  skillsTested: string[];
  roles: TestRole[];
  category: Category;
  passingScore?: number;
  // The scenario brief shown beside the desktop, and the briefing (company, role, manager, tools)
  scenario: string;
  briefing: string;
  // Each marked part's brief: short, since reading time counts
  briefs: Record<JobSimPart, string>;
  desktop: Omit<DesktopConfig, 'phases'>;
  checks: JobSimCheck[];
}

const PART_NUMBER: Record<JobSimPart, number> = { core: 2, curveball: 3, juggling: 4, report: 5 };

export function jobSimulation(spec: JobSimSpec): AssessmentTest {
  const phases: DeskPhase[] = JOB_SIM_PHASES.map((p) => ({ ...p, brief: p.id === 'briefing' ? spec.briefing : spec.briefs[p.id as JobSimPart] }));
  const desktop: DesktopConfig = { ...spec.desktop, phases };

  // The rules every Corprax job simulation keeps, checked when the library loads so a new one can't drift from them
  const problems: string[] = [];
  const environments = desktop.apps.filter((a) => !SUPPORTING_APPS.includes(a));
  if (environments.length > 3) problems.push(`${environments.length} environments (at most 3: ${environments.join(', ')})`);
  for (const m of desktop.inbox) if (m.phase && !phases.some((p) => p.id === m.phase)) problems.push(`email ${m.id} lands in an unknown part "${m.phase}"`);
  for (const part of Object.keys(PART_NUMBER) as JobSimPart[]) if (!spec.checks.some((c) => c[0] === part)) problems.push(`nothing marked in ${part}`);
  if (!desktop.inbox.some((m) => m.phase === 'curveball')) problems.push('no curveball email');
  if (problems.length) throw new Error(`${spec.testId}: ${problems.join('; ')}`);

  const seen: Partial<Record<JobSimPart, number>> = {};
  const testCases = spec.checks.map(([part, d, input, e, capability], i) => {
    const n = (seen[part] = (seen[part] ?? 0) + 1);
    return { ...tc(`tc-${spec.questionId}-${i + 1}`, `${PART_NUMBER[part]}.${n} · ${d}`, input, typeof e === 'string' ? e : ''), ...(typeof e !== 'string' && { rubric: e.rubric }), ...(capability && { capability }) };
  });

  const plan = phases.map((p, i) => `${i + 1}. ${p.title}: ${p.minutes} min${p.scored ? '' : ' (not marked)'}`).join('\n');
  const task: Question = {
    id: spec.questionId,
    title: spec.day,
    type: 'desktop',
    prompt: `Your day runs on the desktop in five timed parts. Each part's tasks appear at the top of the desktop as it starts, and new emails land then. Everything stays open, so you can come back to earlier work.

${plan}
Plus ${JOB_SIM_BUFFER_MINUTES} min to read, switch between apps and check your work.

Your files and data are already on the computer. People reply to your emails.${desktop.apps.includes('agents') ? '\n\nAI agents work alongside you (the Agents app): hand them work with a clear brief, check what they send back, flag what\'s wrong and approve only what you\'d put your name to.' : ''}`,
    starterCode: '',
    desktop,
    testCases,
    timeLimitMinutes: JOB_SIM_MINUTES,
    weight: 100,
  };

  return {
    id: spec.testId,
    title: `${spec.role} Job Simulation: A Day at ${spec.company}`,
    description: spec.description,
    skillsTested: spec.skillsTested,
    roles: spec.roles,
    type: 'standard',
    category: spec.category,
    difficulty: 'Professional',
    passingScore: spec.passingScore ?? 70,
    scenario: { company: spec.company, role: spec.desktop.user.role, brief: spec.scenario },
    questions: [task],
    totalQuestions: 1,
    estimatedMinutes: JOB_SIM_MINUTES,
  };
}
