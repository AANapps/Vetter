import { Capability } from '../types';

/**
 * What a job simulation measures beyond the job's own skills: how someone works with AI. Every Corprax job simulation
 * has the AI-at-work layer (the Agents app on the desktop, src/lib/deskApps.ts); skills tests stay without it, so a
 * profile shows both what someone knows on their own and how they work with AI. Checks are tagged with the capability
 * they show (TestCase.capability); untagged checks are the job's own skills.
 */
export const CAPABILITIES: Record<Capability, { label: string; question: string }> = {
  fluency: { label: 'AI fluency', question: 'Can they use AI to get the work done?' },
  verify: { label: 'Critical thinking', question: 'Do they question and check what AI gives them?' },
  orchestrate: { label: 'Agent orchestration', question: 'Can they brief and direct AI agents?' },
  judgement: { label: 'Human judgement', question: 'Do they make the calls AI shouldn’t make alone?' },
  adapt: { label: 'Adaptability', question: 'Do they adjust when the work changes?' },
  own: { label: 'Accountability', question: 'Do they own the final result?' },
};
export const CAPABILITY_IDS = Object.keys(CAPABILITIES) as Capability[];
export const isCapability = (v: unknown): v is Capability => typeof v === 'string' && (CAPABILITY_IDS as string[]).includes(v);

// Each capability's score out of 100 from a run's checks (a partly-met check counts its credit); only those tagged
export function capabilityScores(checks: { passed: boolean; credit?: number; capability?: Capability }[]): { id: Capability; score: number; checks: number }[] {
  return CAPABILITY_IDS.flatMap((id) => {
    const mine = checks.filter((c) => c.capability === id);
    if (!mine.length) return [];
    const earned = mine.reduce((n, c) => n + (c.passed ? 1 : c.credit ?? 0), 0);
    return [{ id, score: Math.round((earned / mine.length) * 100), checks: mine.length }];
  });
}
