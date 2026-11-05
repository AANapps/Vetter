import { AssessmentTest, Question, ResultBreakdown, TEST_DIFFICULTIES, TestAspect, TestDifficulty } from '../types';

/**
 * Module tests. A module (Frontend, SQL, API testing…) is split into its core areas, and every question belongs to one
 * area and one level. The test at a level asks every level up to its own in every area, so someone who passes Senior
 * has shown the Beginner fundamentals too. Higher levels' questions carry more of the score.
 */

export const tierIndex = (tier: TestDifficulty | undefined) => (tier ? TEST_DIFFICULTIES.indexOf(tier) : 0);

// Hands-on tasks and long answers. A harder one in the same area at a level in between takes its place, so tests
// grow by quick questions as the level rises, not by repeating every task
const LONG_TYPES: Question['type'][] = ['sql', 'code', 'scenario', 'schema', 'written', 'case', 'sheet', 'database', 'app'];
export const isLongQuestion = (q: Question) => !q.quick && LONG_TYPES.includes(q.type);

// How much more a question counts for each level above Beginner
const TIER_WEIGHT = [1, 1.5, 2, 2.5];

// A level counts as reached when its questions score this much, and so did every level below it
export const MASTERY = 70;

export const TIER_BLURB: Record<TestDifficulty, string> = {
  Beginner: 'The fundamentals of every area',
  Junior: 'The fundamentals, plus the everyday work of a junior',
  Professional: 'Everything a junior knows, plus the judgement of an experienced hand',
  Senior: 'Every level, up to the hardest problems a senior owns',
};

// A quick question repeated from a level below is a check the candidate still has the basics, so it gets less time
const REPEAT_MINUTES = 2;

// The questions a test at this level asks, from a module's whole bank: Beginner first, harder levels after.
// Every question at the test's own level, and from each level below it, in every area: the first quick question
// (taken from the area's tasks' follow-ups when it has no others) and any hands-on task no harder one has replaced
export function questionsForTier(bank: Question[], aspects: TestAspect[], tier: TestDifficulty): Question[] {
  const top = tierIndex(tier);
  const kept = new Set<string>();
  for (const a of aspects) {
    const inArea = bank.filter((q) => q.aspect === a.id && tierIndex(q.tier) <= top);
    for (const q of inArea) {
      const t = tierIndex(q.tier);
      if (t === top) kept.add(q.id);
      else if (isLongQuestion(q)) {
        if (!inArea.some((q2) => isLongQuestion(q2) && tierIndex(q2.tier) > t)) kept.add(q.id);
      }
    }
    // One quick question from each level below; one about a task only when that task is still asked
    for (let t = 0; t < top; t++) {
      const quick = inArea.filter((q) => tierIndex(q.tier) === t && !isLongQuestion(q));
      const pick = quick.find((q) => !q.taskId) ?? quick.find((q) => q.taskId && kept.has(q.taskId));
      if (pick) kept.add(pick.id);
    }
  }
  // A question about a task or case is asked only when the task is
  const picked = bank
    .filter((q) => kept.has(q.id) && (!q.taskId || kept.has(q.taskId)))
    .map((q) => (tierIndex(q.tier) < top && !isLongQuestion(q) ? { ...q, timeLimitMinutes: Math.min(q.timeLimitMinutes, q.type === 'written' ? 3 : REPEAT_MINUTES) } : q));
  // Stable by level, so each level's questions keep the order they were written in (follow-ups after their task)
  return picked.map((q, i) => ({ q, i })).sort((a, b) => tierIndex(a.q.tier) - tierIndex(b.q.tier) || a.i - b.i).map(({ q }) => q);
}

// Each question's share of the score: its own points, scaled up for its level, out of 100 in all
export function weighByTier(questions: Question[]): Question[] {
  const raw = questions.map((q) => (q.type === 'case' ? 0 : q.weight * TIER_WEIGHT[tierIndex(q.tier)]));
  const total = raw.reduce((s, w) => s + w, 0) || 1;
  const weighed = questions.map((q, i) => ({ ...q, weight: raw[i] === 0 ? 0 : Math.max(1, Math.round((raw[i] / total) * 100)) }));
  // Rounding can leave the total a point or two off 100; the heaviest question takes the difference
  const drift = 100 - weighed.reduce((s, q) => s + q.weight, 0);
  const heaviest = weighed.reduce((best, q, i) => (q.weight > weighed[best].weight ? i : best), 0);
  if (weighed.length) weighed[heaviest] = { ...weighed[heaviest], weight: weighed[heaviest].weight + drift };
  return weighed;
}

const weighted = (qs: Question[], perQuestion: Record<string, number>) => {
  const scored = qs.filter((q) => q.type !== 'case');
  const total = scored.reduce((s, q) => s + q.weight, 0);
  return total ? Math.round(scored.reduce((s, q) => s + (perQuestion[q.id] ?? 0) * q.weight, 0) / total) : undefined;
};

// A module test's result by area and by level, and the level reached: the highest one passed with every level below it
export function breakdownFor(test: AssessmentTest, perQuestion: Record<string, number>): ResultBreakdown | undefined {
  if (!test.aspects?.length || !test.questions.some((q) => q.aspect)) return undefined;
  const aspects = test.aspects.flatMap((a) => {
    const score = weighted(test.questions.filter((q) => q.aspect === a.id), perQuestion);
    return score === undefined ? [] : [{ id: a.id, name: a.name, score }];
  });
  const tiers = TEST_DIFFICULTIES.flatMap((tier) => {
    const score = weighted(test.questions.filter((q) => (q.tier ?? test.difficulty) === tier), perQuestion);
    return score === undefined ? [] : [{ tier, score }];
  });
  let levelReached: TestDifficulty | undefined;
  for (const t of tiers) {
    if (t.score < MASTERY) break;
    levelReached = t.tier;
  }
  return { aspects, tiers, ...(levelReached && { levelReached }) };
}

// The levels a test's questions span, e.g. "Beginner to Senior"
export const tierSpan = (test: AssessmentTest) => {
  const tiers = [...new Set(test.questions.map((q) => q.tier).filter((t): t is TestDifficulty => !!t))].sort((a, b) => tierIndex(a) - tierIndex(b));
  return tiers.length > 1 ? `${tiers[0]} to ${tiers[tiers.length - 1]}` : tiers[0];
};
