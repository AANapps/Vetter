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
import { CS_JOB_SIM } from './csJobSim';
import { SOFTWARE_DEV_MODULE_TESTS } from './softwareDevModules';
import { SD_JOB_SIM } from './sdJobSim';
import { FRONTEND_MODULE_TESTS } from './frontendModules';
import { FE_JOB_SIM } from './feJobSim';
import { SUPPORT_MODULE_TESTS } from './supportModules';
import { COMBINED_TESTS } from './combined';
import { DA_MODULE_TESTS } from './daModules';
import { DA_JOB_SIM } from './daJobSim';
import { DATA_FUNDAMENTALS_TEST, DATA_FUNDAMENTALS_MODULE } from './dataFundamentals';

// Tests for the 2026 role tracks (data analyst, SOC analyst, AI engineer, AI consultant, software developer, data
// scientist): for each, a fundamentals test per core skill and a final project. Where Corprax already had a test for a
// skill, that test is tagged with the role below instead of a second one being written.

export const ROLE_TRACK_TESTS: AssessmentTest[] = [
  ...DATA_SCIENCE_TESTS,
  // The old final project's id is now the desktop job simulation's
  ...SOFTWARE_DEV_TESTS.filter((t) => t.id !== SD_JOB_SIM.id),
  SD_JOB_SIM,
  ...SECURITY_TESTS,
  ...AI_ENGINEERING_TESTS,
  ...AI_STRATEGY_TESTS,
  ...SUPPORT_MODULE_TESTS,
  CS_JOB_SIM,
  ...SOFTWARE_DEV_MODULE_TESTS,
  ...FRONTEND_MODULE_TESTS,
  FE_JOB_SIM,
  DATA_FUNDAMENTALS_TEST,
  ...DA_MODULE_TESTS,
  DA_JOB_SIM,
];

// Every test's hands-on simulation, as its own area from Junior up (kept at Professional and Senior, since nothing harder
// replaces it there)
const SIMS = { ...TECH_SIMS, ...AI_SIMS, ...OPS_SIMS };
const withSim = (m: ModuleSkeleton): ModuleSkeleton => {
  const sim = SIMS[m.familyId];
  return sim ? { ...m, aspects: [...m.aspects, sim.aspect], bank: [...m.bank, ...tagged(sim.aspect.id, J, ...sim.questions)] } : m;
};

export const ROLE_TRACK_MODULES = [...DATA_SCIENCE_MODULES, ...SOFTWARE_DEV_MODULES.filter((m) => m.familyId !== SD_JOB_SIM.id), ...SECURITY_MODULES, ...AI_ENGINEERING_MODULES, ...AI_STRATEGY_MODULES, DATA_FUNDAMENTALS_MODULE].map(withSim);

// Existing tests that already cover one of a role's core skills
const ROLE_ADDITIONS: Record<string, TestRole[]> = {
  // Modules made for one field that other roles take as they are
  'test-sd-js': ['Frontend Engineer'],
  'test-sd-debug': ['Frontend Engineer'],
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

// Roles whose track is only these tests: every other test loses the role (it stays in the library for the roles it
// keeps). Data Analyst is the core principles, one test per tool and one job simulation
const ROLE_ONLY: Partial<Record<TestRole, string[]>> = {
  'Software Developer': [...SOFTWARE_DEV_MODULE_TESTS.map((t) => t.id), 'test-sim-dev-01'],
  'Frontend Engineer': ['test-sd-js', 'test-sd-debug', ...FRONTEND_MODULE_TESTS.map((t) => t.id), FE_JOB_SIM.id],
  'Data Analyst': ['test-dafund-01', ...DA_MODULE_TESTS.map((t) => t.id), DA_JOB_SIM.id, ...COMBINED_TESTS.filter((c) => c.roles.includes('Data Analyst')).map((c) => c.id)],
};

// Every level of a test takes its main version's added roles, and loses a role whose track it isn't in
export const withRoleTracks = (tests: AssessmentTest[]): AssessmentTest[] =>
  tests.map((t) => {
    const family = t.familyId ?? t.id;
    const extra = ROLE_ADDITIONS[family] ?? [];
    const roles = [...new Set([...(t.roles ?? []), ...extra])].filter((r) => !ROLE_ONLY[r] || ROLE_ONLY[r]!.includes(family));
    return extra.length || roles.length !== (t.roles ?? []).length ? { ...t, roles } : t;
  });
