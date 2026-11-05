import { AssessmentTest, TestRole } from '../../types';
import { DATA_SCIENCE_TESTS, DATA_SCIENCE_MODULES } from './dataScience';
import { SOFTWARE_DEV_TESTS, SOFTWARE_DEV_MODULES } from './softwareDev';
import { SECURITY_TESTS, SECURITY_MODULES } from './security';
import { AI_ENGINEERING_TESTS, AI_ENGINEERING_MODULES } from './aiEngineering';
import { AI_STRATEGY_TESTS, AI_STRATEGY_MODULES } from './aiStrategy';
import { ModuleSkeleton, J, tagged } from './kit';
import { TECH_SIMS } from './simsTech';
import { AI_SIMS } from './simsAI';
import { OPS_SIMS } from './simsOps';

// Tests for the 2026 role tracks (data analyst, SOC analyst, AI engineer, AI consultant, software developer, data
// scientist): for each, a fundamentals test per core skill and a final project. Where Vetter already had a test for a
// skill, that test is tagged with the role below instead of a second one being written.

export const ROLE_TRACK_TESTS: AssessmentTest[] = [
  ...DATA_SCIENCE_TESTS,
  ...SOFTWARE_DEV_TESTS,
  ...SECURITY_TESTS,
  ...AI_ENGINEERING_TESTS,
  ...AI_STRATEGY_TESTS,
];

// Every test's hands-on simulation, as its own area from Junior up (kept at Professional and Senior, since nothing harder
// replaces it there)
const SIMS = { ...TECH_SIMS, ...AI_SIMS, ...OPS_SIMS };
const withSim = (m: ModuleSkeleton): ModuleSkeleton => {
  const sim = SIMS[m.familyId];
  return sim ? { ...m, aspects: [...m.aspects, sim.aspect], bank: [...m.bank, ...tagged(sim.aspect.id, J, ...sim.questions)] } : m;
};

export const ROLE_TRACK_MODULES = [...DATA_SCIENCE_MODULES, ...SOFTWARE_DEV_MODULES, ...SECURITY_MODULES, ...AI_ENGINEERING_MODULES, ...AI_STRATEGY_MODULES].map(withSim);

// Existing tests that already cover one of a role's core skills
const ROLE_ADDITIONS: Record<string, TestRole[]> = {
  // Software developer: APIs and testing
  'test-api-01': ['Software Developer'],
  'test-be-01': ['Software Developer'],
  'test-qatc-01': ['Software Developer'],
  // Data scientist: Python and pandas, statistics, experiment design and A/B testing
  'test-py-01': ['Data Scientist'],
  'test-py-02': ['Data Scientist'],
  'test-stats-01': ['Data Scientist'],
  'test-da-01': ['Data Scientist'],
  // AI consultant: client communication (structuring, hypotheses and presenting to clients)
  'test-cs-01': ['AI Consultant'],
};

// Every level of a test takes its main version's added roles
export const withRoleTracks = (tests: AssessmentTest[]): AssessmentTest[] =>
  tests.map((t) => {
    const extra = ROLE_ADDITIONS[t.familyId ?? t.id];
    return extra ? { ...t, roles: [...new Set([...(t.roles ?? []), ...extra])] } : t;
  });
