import { AssessmentTest, Question, TEST_DIFFICULTIES, TestDifficulty } from '../../types';
import { ModuleSkeleton } from './kit';
import { TIER_BLURB, questionsForTier, weighByTier } from '../../lib/modules';
import { SQL_MODULE, QA_SQL_MODULE } from './sql';
import { FRONTEND_MODULE } from './frontend';
import { BACKEND_MODULE, API_MODULE, SYSTEMS_MODULE } from './backend';
import { DATABASE_MODULE } from './database';
import { QA_CASES_MODULE, QA_API_MODULE } from './qa';
import { EXCEL_MODULE, ANALYST_SQL_MODULE, CLEANING_MODULE, DASHBOARD_MODULE, METRICS_MODULE, DA_SIM_MODULE } from './data';
import { INDUSTRY_MODULES } from './industry';

/**
 * Vetter's module tests. From each module's bank (see kit.ts) come four tests, Beginner to Senior, each asking every
 * level up to its own.
 */
export const MODULES: ModuleSkeleton[] = [
  SQL_MODULE,
  QA_SQL_MODULE,
  FRONTEND_MODULE,
  BACKEND_MODULE,
  API_MODULE,
  SYSTEMS_MODULE,
  DATABASE_MODULE,
  QA_CASES_MODULE,
  QA_API_MODULE,
  EXCEL_MODULE,
  ANALYST_SQL_MODULE,
  CLEANING_MODULE,
  DASHBOARD_MODULE,
  METRICS_MODULE,
  DA_SIM_MODULE,
  ...INDUSTRY_MODULES,
];

const DEFAULT_PASS: Record<TestDifficulty, number> = { Beginner: 70, Junior: 70, Professional: 75, Senior: 75 };

// A module's whole bank: its old questions with their tags, then the new ones
export function moduleBank(skeleton: ModuleSkeleton, family: AssessmentTest[]): Question[] {
  const seen = new Map<string, Question>();
  for (const v of family) for (const q of v.questions) if (!seen.has(q.id)) seen.set(q.id, q);
  const old = [...seen.values()].flatMap((q) => {
    const tag = skeleton.tags[q.id];
    return tag ? [{ ...q, aspect: tag[0], tier: tag[1] }] : [];
  });
  return [...old, ...skeleton.bank];
}

const SCENARIO_TYPES: Question['type'][] = ['sheet', 'database', 'app', 'case'];

// Every family with a skeleton is rebuilt as four levels; the main version keeps its id and level
export function withModules(tests: AssessmentTest[]): AssessmentTest[] {
  const byFamily = new Map(MODULES.map((m) => [m.familyId, m]));
  const built = new Set<string>();
  return tests.flatMap((t) => {
    const familyId = t.familyId ?? t.id;
    const skeleton = byFamily.get(familyId);
    if (!skeleton) return [t];
    if (built.has(familyId)) return [];
    built.add(familyId);
    const family = tests.filter((x) => (x.familyId ?? x.id) === familyId);
    const main = family.find((x) => x.id === familyId) ?? t;
    const bank = moduleBank(skeleton, family);
    const areas = skeleton.aspects.map((a) => a.name);
    const list = `${areas.slice(0, -1).join(', ')} and ${areas[areas.length - 1]}`;
    return TEST_DIFFICULTIES.map((tier): AssessmentTest => {
      const isMain = tier === main.difficulty;
      const questions = weighByTier(questionsForTier(bank, skeleton.aspects, tier));
      // A level without the scenario's tasks doesn't need its brief
      const usesScenario = questions.some((q) => SCENARIO_TYPES.includes(q.type) || q.taskId);
      const { scenario, familyId: _f, ...rest } = main;
      return {
        ...rest,
        ...(scenario && usesScenario && { scenario }),
        id: isMain ? main.id : `${main.id}-${tier.toLowerCase()}`,
        ...(!isMain && { familyId: main.id }),
        difficulty: tier,
        description: isMain ? main.description : `${TIER_BLURB[tier]}: ${list}.`,
        passingScore: isMain ? main.passingScore : (skeleton.passingScores?.[tier] ?? DEFAULT_PASS[tier]),
        aspects: skeleton.aspects,
        questions,
        totalQuestions: questions.filter((q) => q.type !== 'case').length,
        estimatedMinutes: Math.max(5, Math.ceil(questions.reduce((n, q) => n + q.timeLimitMinutes, 0) / 5) * 5),
      };
    });
  });
}
