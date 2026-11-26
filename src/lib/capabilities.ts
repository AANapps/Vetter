import { AiMode, Capability, Question } from '../types';

/**
 * Corprax's AI competency framework (docs/architecture.md, the AI Framework Overlay): the competencies every AI
 * interaction is scored on, in a job simulation's overlay and in the standalone AI tests alike, so both report on the
 * same scale. Checks are tagged with the competency they show (TestCase.capability); untagged checks are the job's own
 * skills (the Competency Engine). The two are scored apart: the job score ranks candidates, the AI score sits beside it.
 */
export const CAPABILITIES: Record<Capability, { label: string; question: string }> = {
  fluency: { label: 'AI fluency', question: 'Do they use AI tools well to get the work done?' },
  solve: { label: 'AI-assisted problem-solving', question: 'Do they use AI to work through a hard problem?' },
  verify: { label: 'Verifying AI output', question: 'Do they check what AI gives them and catch what’s wrong?' },
  judgement: { label: 'Critical thinking and judgement', question: 'Do they make the calls AI shouldn’t make alone?' },
  orchestrate: { label: 'Delegation and orchestration', question: 'Can they brief and direct AI agents?' },
  supervise: { label: 'Agent supervision', question: 'Do they spot an agent going wrong and correct it?' },
  safety: { label: 'Safety, privacy and accountability', question: 'Do they keep data safe and own the final result?' },
  adapt: { label: 'Adapting to new AI tools', question: 'Do they pick up an AI tool new to them?' },
};
export const CAPABILITY_IDS = Object.keys(CAPABILITIES) as Capability[];
export const isCapability = (v: unknown): v is Capability => typeof v === 'string' && (CAPABILITY_IDS as string[]).includes(v);

// The AI conditions a simulation can run under (docs/architecture.md, Assessment configurations)
export const AI_MODES: Record<AiMode, { label: string; about: string }> = {
  none: { label: 'No AI', about: 'Shows what they can do on their own: no AI assistant or agents, and no AI scores.' },
  permitted: { label: 'AI permitted', about: 'AI is there if it helps. Not using it costs nothing; how they use it is scored when they do.' },
  required: { label: 'AI required', about: 'Using AI is part of the work, and how well they use it is scored.' },
  agents: { label: 'Agent-enabled', about: 'AI agents work alongside them: scored on delegating to, checking and supervising them.' },
};

type Scored = { id: string; passed: boolean; credit?: number; skipped?: boolean };
const earned = (rs: Scored[]) => rs.reduce((n, r) => n + (r.passed ? 1 : r.credit ?? 0), 0);

// A task's results split into the job's own checks and the AI overlay's. Its score is the job checks' (or, with none,
// the AI checks': a standalone AI test); checks left out under "AI permitted" (AI not used where it wasn't needed) count
// in neither
export function splitScore(q: Pick<Question, 'testCases'>, results: Scored[]): { score: number; job?: number; ai?: number } {
  const cap = (r: Scored) => q.testCases.find((tc) => tc.id === r.id)?.capability;
  const counted = results.filter((r) => !r.skipped);
  const job = counted.filter((r) => !cap(r));
  const ai = counted.filter((r) => cap(r));
  const pct = (rs: Scored[]) => (rs.length ? Math.round((earned(rs) / rs.length) * 100) : undefined);
  const j = pct(job);
  const a = pct(ai);
  return { score: j ?? a ?? 0, job: j, ai: a };
}

// Each competency's score out of 100 from a run's checks (a partly-met check counts its credit); only those tagged
export function capabilityScores(checks: { passed: boolean; credit?: number; capability?: Capability; skipped?: boolean }[]): { id: Capability; score: number; checks: number }[] {
  return CAPABILITY_IDS.flatMap((id) => {
    const mine = checks.filter((c) => c.capability === id && !c.skipped);
    if (!mine.length) return [];
    return [{ id, score: Math.round((mine.reduce((n, c) => n + (c.passed ? 1 : c.credit ?? 0), 0) / mine.length) * 100), checks: mine.length }];
  });
}

// The AI score across a whole test: every AI-tagged check, each counting once
export function aiScoreOf(checks: { passed: boolean; credit?: number; capability?: Capability; skipped?: boolean }[]): number | undefined {
  const mine = checks.filter((c) => c.capability && !c.skipped);
  return mine.length ? Math.round((mine.reduce((n, c) => n + (c.passed ? 1 : c.credit ?? 0), 0) / mine.length) * 100) : undefined;
}
