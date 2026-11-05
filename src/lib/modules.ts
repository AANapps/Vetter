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

// How long each level's test runs: Beginner a quick 5–10 minute check, rising to a 45–60 minute Senior assessment
export const TIER_MINUTES: Record<TestDifficulty, [min: number, max: number]> = {
  Beginner: [5, 10],
  Junior: [15, 25],
  Professional: [30, 40],
  Senior: [45, 60],
};

// A level's questions trimmed to its time: quick questions shortened first, then repeated quick questions from lower
// levels dropped (lowest level first, from the areas that have most), then older long tasks, longest first. At least
// one question from every lower level and from every area stays, and a task's follow-ups go with it
export function fitToTime(questions: Question[], tier: TestDifficulty): Question[] {
  const top = tierIndex(tier);
  const max = TIER_MINUTES[tier][1];
  const minutes = (qs: Question[]) => qs.reduce((n, q) => n + q.timeLimitMinutes, 0);
  // Quick questions get 2–3 minutes (a written one a minute more); a Beginner's hands-on task is a short one
  const quickCap = top === 0 ? 2 : 3;
  let qs = questions.map((q) =>
    q.type === 'case'
      ? q
      : isLongQuestion(q)
        ? top === 0
          ? { ...q, timeLimitMinutes: Math.min(q.timeLimitMinutes, 4) }
          : q
        : { ...q, timeLimitMinutes: Math.min(q.timeLimitMinutes, q.type === 'written' ? quickCap + 1 : quickCap) }
  );
  const without = (list: Question[], q: Question) => {
    // A task takes its follow-ups with it; material with no questions left about it goes too
    const next = list.filter((x) => x.id !== q.id && x.taskId !== q.id);
    return next.filter((x) => x.type !== 'case' || next.some((y) => y.taskId === x.id));
  };
  const keepsTiers = (list: Question[], next: Question[]) => [...new Set(list.map((x) => tierIndex(x.tier)))].every((t) => next.some((x) => tierIndex(x.tier) === t));
  const keepsAreas = (list: Question[], next: Question[]) => [...new Set(list.map((x) => x.aspect))].every((a) => next.some((x) => x.aspect === a && x.type !== 'case'));
  const isApp = (q: Question) => q.type === 'app' || q.type === 'sheet' || q.type === 'database' || q.type === 'code' || q.type === 'sql';
  for (const strict of [true, false]) {
    while (minutes(qs) > max) {
      const areaCount = (a?: string) => qs.filter((x) => x.aspect === a).length;
      const answered = qs.filter((q) => q.type !== 'case');
      const rank = (q: Question) => {
        const own = tierIndex(q.tier) === top;
        // Lower levels' quick checks, then their long tasks, then this level's long written work, then its quick checks
        // (which keep every area covered), hands-on tasks last
        if (isApp(q)) return 8;
        if (!own) return isLongQuestion(q) ? 1 : 0;
        // Questions about a case study go before standalone checks: at short levels the hands-on task is the practical work
        const aboutCase = !!q.taskId && qs.some((x) => x.id === q.taskId && x.type === 'case');
        return isLongQuestion(q) ? 4 : aboutCase ? 4.5 : 5;
      };
      const order = answered.sort(
        (a, b) => rank(a) - rank(b) || tierIndex(a.tier) - tierIndex(b.tier) || areaCount(b.aspect) - areaCount(a.aspect) || b.timeLimitMinutes - a.timeLimitMinutes
      );
      const pick = order.find((q) => {
        const next = without(qs, q);
        return keepsTiers(qs, next) && (!strict || keepsAreas(qs, next)) && (strict || !isApp(q) || !qs.some((x) => x !== q && !isApp(x) && x.type !== 'case'));
      });
      if (!pick) break;
      qs = without(qs, pick);
    }
  }
  // Put back anything dropped that still fits, this level's own quick checks first, keeping the original order
  const kept = new Set(qs.map((q) => q.id));
  const all = new Map(questions.map((q, i) => [q.id, i]));
  const byId = new Map(qs.map((q) => [q.id, q]));
  const back = questions
    .filter((q) => !kept.has(q.id) && q.type !== 'case' && !isLongQuestion(q))
    .sort((a, b) => tierIndex(b.tier) - tierIndex(a.tier) || a.timeLimitMinutes - b.timeLimitMinutes);
  for (const q of back) {
    const capped = { ...q, timeLimitMinutes: Math.min(q.timeLimitMinutes, q.type === 'written' ? quickCap + 1 : quickCap) };
    if (q.taskId && !kept.has(q.taskId)) continue;
    if (minutes([...byId.values()]) + capped.timeLimitMinutes > max) continue;
    byId.set(q.id, capped);
    kept.add(q.id);
  }
  return [...byId.values()].sort((a, b) => (all.get(a.id) ?? 0) - (all.get(b.id) ?? 0));
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
