import { AssessmentTest, Question, TEST_DIFFICULTIES, TestDifficulty } from '../../types';
import { ModuleSkeleton } from './kit';
import { TIER_BLURB, TIER_MINUTES, buildLevel, weighByTier } from '../../lib/modules';
import { SQL_MODULE, QA_SQL_MODULE } from './sql';
import { FRONTEND_MODULE } from './frontend';
import { BACKEND_MODULE, API_MODULE, SYSTEMS_MODULE } from './backend';
import { DATABASE_MODULE } from './database';
import { QA_CASES_MODULE, QA_API_MODULE } from './qa';
import { EXCEL_MODULE, ANALYST_SQL_MODULE, CLEANING_MODULE, DASHBOARD_MODULE, METRICS_MODULE, DA_SIM_MODULE } from './data';
import { INDUSTRY_MODULES } from './industry';
import { ANALYST_TOOL_MODULES } from './analyst';
import { ANALYST_TOOL_MODULES_2 } from './analystTools2';
import { ANALYST_SKILL_MODULES } from './analystTools3';
import { ROLE_TRACK_MODULES } from './roleTracks';
import { EXTRA_MIX } from './extraMix';

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
  ...ANALYST_TOOL_MODULES,
  ...ANALYST_TOOL_MODULES_2,
  ...ANALYST_SKILL_MODULES,
  ...ROLE_TRACK_MODULES,
];

const DEFAULT_PASS: Record<TestDifficulty, number> = { Beginner: 70, Junior: 70, Professional: 75, Senior: 75 };

// From Professional up, a pick-one question becomes a typed answer: the candidate says what they'd do and why, and it's
// marked against the right answer and the most tempting wrong one. Recognising the answer isn't enough at those levels
export function typedAtUpperLevels(q: Question): Question {
  if (q.type !== 'choice' || (q.tier !== 'Professional' && q.tier !== 'Senior') || !q.options || q.correctOption === undefined) return q;
  const right = q.options[q.correctOption];
  const wrong = q.options.filter((_, i) => i !== q.correctOption).sort((a, b) => b.length - a.length)[0];
  const { options: _o, correctOption: _c, ...rest } = q;
  return {
    ...rest,
    type: 'written',
    prompt: `${q.prompt}\n\nAnswer in a sentence or two: what you'd do (or what the answer is) and why.`,
    rubric: [
      `Reaches the right call: ${right}`,
      'Says why it fits this situation, rather than only naming an action',
      ...(wrong ? [`Doesn't fall for a tempting wrong answer, such as: ${wrong}`] : []),
    ],
    solutionCode: right,
    timeLimitMinutes: Math.max(q.timeLimitMinutes, 4),
    weight: Math.round(q.weight * 1.5),
    quick: true,
  };
}

// A module's whole bank: its old questions with their tags, then the new ones
export function moduleBank(skeleton: ModuleSkeleton, family: AssessmentTest[]): Question[] {
  const seen = new Map<string, Question>();
  for (const v of family) for (const q of v.questions) if (!seen.has(q.id)) seen.set(q.id, q);
  const old = [...seen.values()].flatMap((q) => {
    const tag = skeleton.tags[q.id];
    return tag ? [{ ...q, aspect: tag[0], tier: tag[1] }] : [];
  });
  // Beginner is no longer offered: its questions join Junior's
  return [...old, ...skeleton.bank, ...(EXTRA_MIX[skeleton.familyId] ?? [])].map((q) => (q.tier === 'Beginner' ? { ...q, tier: 'Junior' as const } : q));
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
      const isMain = tier === (main.difficulty === 'Beginner' ? 'Junior' : main.difficulty);
      const questions = weighByTier(buildLevel(bank, tier));
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
        estimatedMinutes: Math.min(TIER_MINUTES[tier][1], Math.max(5, Math.ceil(questions.reduce((n, q) => n + q.timeLimitMinutes, 0) / 5) * 5)),
      };
    });
  });
}
