import { AssessmentTest, Question, ResultBreakdown, TEST_DIFFICULTIES, TestAspect, TestDifficulty } from '../types';

/**
 * Module tests. A module (Frontend, SQL, API testing…) is split into its core areas, and every question belongs to one
 * area and one level. The test at a level asks every level up to its own in every area, so someone who passes Senior
 * has shown the Beginner fundamentals too. Higher levels' questions carry more of the score.
 */

// Beginner, no longer offered, counts as Junior
export const tierIndex = (tier: TestDifficulty | undefined) => (tier ? Math.max(0, TEST_DIFFICULTIES.indexOf(tier)) : 0);

// Hands-on tasks and long answers. A harder one in the same area at a level in between takes its place, so tests
// grow by quick questions as the level rises, not by repeating every task
const LONG_TYPES: Question['type'][] = ['sql', 'code', 'scenario', 'schema', 'written', 'case', 'sheet', 'database', 'app'];
export const isLongQuestion = (q: Question) => !q.quick && LONG_TYPES.includes(q.type);

// How much more a question counts for each level above Beginner
const TIER_WEIGHT = [1, 1.5, 2];

// A level counts as reached when its questions score this much, and so did every level below it
export const MASTERY = 70;

export const TIER_BLURB: Record<TestDifficulty, string> = {
  Beginner: 'The fundamentals of every area',
  Junior: 'The fundamentals and the everyday work of a junior',
  Professional: 'The judgement of an experienced hand',
  Senior: 'The hardest problems a senior owns',
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
  Junior: [30, 40],
  Professional: [40, 50],
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

// ---------- The mix every level asks ----------
// Two of each: multiple choice, drag and drop (ordering or matching), select all that apply, written answers, and
// coding tasks where the skill has them; the rest is hands-on work (a simulation, spreadsheet or database) with its
// follow-ups. Where a module's bank is short of a kind at a level, it's made from the level's scenario questions:
// a matching question pairs situations with their right answers, a select-all mixes each situation's right answer
// with its most tempting wrong one, and a written answer asks what you'd do and why
export const LEVEL_MIX = { choice: 2, drag: 2, multi: 2, written: 2, code: 2 } as const;

type Kind = 'choice' | 'drag' | 'multi' | 'written' | 'code' | 'hands' | 'short' | 'case';
export const kindOf = (q: Question): Kind =>
  q.type === 'order' || q.type === 'match'
    ? 'drag'
    : q.type === 'code' || q.type === 'sql' || q.type === 'schema'
      ? 'code'
      : q.type === 'app' || q.type === 'sheet' || q.type === 'database'
        ? 'hands'
        : q.type === 'text'
          ? 'short'
          : q.type === 'scenario'
            ? 'written'
            : (q.type as Kind);

// Minutes for each kind at each level (Junior, Professional, Senior)
const KIND_MINUTES: Record<Kind, [number, number, number]> = {
  choice: [2, 2, 3],
  drag: [3, 4, 4],
  multi: [3, 3, 4],
  written: [5, 6, 8],
  code: [8, 10, 12],
  hands: [12, 15, 18],
  short: [2, 2, 3],
  case: [2, 3, 3],
};

const right = (q: Question) => q.options![q.correctOption!];
const tempting = (q: Question) => q.options!.filter((_, i) => i !== q.correctOption).sort((a, b) => b.length - a.length)[0];

// A pick-one question as a typed answer: what you'd do and why, marked against the right answer and the tempting one
export function asWritten(q: Question): Question {
  const { options: _o, correctOption: _c, ...rest } = q;
  const wrong = tempting(q);
  return {
    ...rest,
    type: 'written',
    prompt: `${q.prompt}\n\nAnswer in a sentence or two: what you'd do (or what the answer is) and why.`,
    rubric: [`Reaches the right call: ${right(q)}`, 'Says why it fits this situation, rather than only naming an action', ...(wrong ? [`Doesn't fall for a tempting wrong answer, such as: ${wrong}`] : [])],
    solutionCode: right(q),
    quick: true,
  };
}

const answerOf = (q: Question) => (q.type === 'text' ? q.acceptedAnswers![0] : right(q));
function asMatch(src: Question[], tier: TestDifficulty): Question {
  return {
    id: `mix-match-${src[0].id}`,
    title: 'Match Each Situation',
    type: 'match',
    prompt: 'Drag the right response onto each situation.',
    pairs: src.map((q) => ({ left: q.prompt, right: answerOf(q) })),
    starterCode: '',
    testCases: [],
    timeLimitMinutes: 4,
    weight: 10,
    aspect: src[0].aspect,
    tier,
  };
}

function asMulti(src: Question[], tier: TestDifficulty): Question {
  // Each situation once with its right answer and once with its most tempting wrong one, interleaved by a fixed rule
  const lines = src.flatMap((q, i) => {
    const a = { text: `${q.prompt} → ${right(q)}`, ok: true };
    const b = { text: `${q.prompt} → ${tempting(q)}`, ok: false };
    return i % 2 ? [b, a] : [a, b];
  });
  return {
    id: `mix-multi-${src[0].id}`,
    title: 'Which Responses Are Right?',
    type: 'multi',
    prompt: 'Each line pairs a situation with a response. Tick every line where the response is the right one.',
    options: lines.map((l) => l.text),
    correctOptions: lines.flatMap((l, i) => (l.ok ? [i] : [])),
    starterCode: '',
    testCases: [],
    timeLimitMinutes: 4,
    weight: 10,
    aspect: src[0].aspect,
    tier,
  };
}

export function buildLevel(bank: Question[], tier: TestDifficulty): Question[] {
  const L = tierIndex(tier);
  const order = new Map(bank.map((q, i) => [q.id, i]));
  // The level's own questions and those below it; the level above only when a slot can't be filled otherwise
  const pool = bank.filter((q) => tierIndex(q.tier) <= L + 1);
  const above = (q: Question) => tierIndex(q.tier) > L;
  const byId = new Map(bank.map((q) => [q.id, q]));
  const chosen = new Map<string, Question>();
  // Scenario questions folded into a made-up matching or select-all question, so they aren't asked twice
  const used = new Set<string>();
  const areaUse = new Map<string, number>();
  const take = (q: Question) => {
    chosen.set(q.id, q);
    areaUse.set(q.aspect ?? '', (areaUse.get(q.aspect ?? '') ?? 0) + 1);
    // Questions about a case study bring the case with them
    const task = q.taskId ? byId.get(q.taskId) : undefined;
    if (task?.type === 'case') chosen.set(task.id, task);
  };
  // A question can fill a slot when it stands alone or belongs to a case study (not to a hands-on task)
  const free = (q: Question) => !chosen.has(q.id) && !used.has(q.id) && (!q.taskId || byId.get(q.taskId)?.type === 'case');
  // This level's own questions first, then the level below; spread across areas
  const ranked = (qs: Question[]) =>
    [...qs].sort(
      (a, b) =>
        Number(above(a)) - Number(above(b)) ||
        tierIndex(b.tier) - tierIndex(a.tier) ||
        (areaUse.get(a.aspect ?? '') ?? 0) - (areaUse.get(b.aspect ?? '') ?? 0) ||
        (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    );
  const fill = (kind: Kind, n: number) => {
    let got = 0;
    while (got < n) {
      const next = ranked(pool.filter((q) => free(q) && kindOf(q) === kind))[0];
      if (!next) break;
      take(next);
      got++;
    }
    return got;
  };
  // Scenario questions not yet used, for making the kinds a bank is short of
  const spare = () => ranked(pool.filter((q) => free(q) && q.type === 'choice' && !q.taskId && q.options && q.correctOption !== undefined));

  // Hands-on work: the hardest task the level reaches, with its follow-ups
  const hands = ranked(pool.filter((q) => kindOf(q) === 'hands' && !above(q)))[0];
  if (hands) {
    take(hands);
    pool.filter((q) => q.taskId === hands.id).forEach(take);
  }
  fill('code', LEVEL_MIX.code);
  fill('choice', LEVEL_MIX.choice);
  const written = fill('written', LEVEL_MIX.written);
  for (let i = written; i < LEVEL_MIX.written; i++) {
    const src = spare()[0];
    if (src) take(asWritten(src));
  }
  const multi = fill('multi', LEVEL_MIX.multi);
  for (let i = multi; i < LEVEL_MIX.multi; i++) {
    const src = spare().slice(0, 3);
    if (src.length < 2) break;
    src.forEach((q) => used.add(q.id));
    take(asMulti(src, tier));
  }
  const drag = fill('drag', LEVEL_MIX.drag);
  // Matching can also pair problems with their worked answers (short answers), when scenario questions run out
  const shorts = () => ranked(pool.filter((q) => free(q) && q.type === 'text' && !q.taskId && q.acceptedAnswers?.length));
  for (let i = drag; i < LEVEL_MIX.drag; i++) {
    const src = [...spare(), ...shorts()].slice(0, 3);
    if (src.length < 2) break;
    src.forEach((q) => used.add(q.id));
    take(asMatch(src, tier));
  }

  // Each kind gets the level's time; synthetic questions sit where their first source was
  const at = (q: Question) => order.get(q.id) ?? order.get(q.id.replace(/^mix-(match|multi)-/, '')) ?? 0;
  let qs = [...chosen.values()]
    .map((q) => ({ ...q, timeLimitMinutes: q.type === 'case' ? KIND_MINUTES.case[L] : Math.min(Math.max(q.timeLimitMinutes, KIND_MINUTES[kindOf(q)][L] - 1), KIND_MINUTES[kindOf(q)][L]) }))
    .sort((a, b) => tierIndex(a.tier) - tierIndex(b.tier) || at(a) - at(b));
  const [min, max] = TIER_MINUTES[tier];
  const total = () => qs.reduce((n, q) => n + q.timeLimitMinutes, 0);
  const timed = (q: Question) => ({ ...q, timeLimitMinutes: KIND_MINUTES[kindOf(q)][L] });
  // Under the level's time: the rest is made up of more hands-on and typed work, never more of the counted kinds.
  // Follow-ups of the case studies already asked, then short worked answers, then another hands-on task
  const inLevel = () => new Set(qs.map((q) => q.id));
  const topUps = () => {
    const have = inLevel();
    const caseFollowUps = pool.filter((q) => !have.has(q.id) && !used.has(q.id) && q.taskId && have.has(q.taskId) && kindOf(q) === 'short');
    const loneShorts = ranked(pool.filter((q) => !have.has(q.id) && !used.has(q.id) && !q.taskId && kindOf(q) === 'short' && !above(q)));
    const moreHands = ranked(pool.filter((q) => !have.has(q.id) && kindOf(q) === 'hands' && !above(q)));
    return [...caseFollowUps, ...loneShorts, ...moreHands];
  };
  while (total() < min) {
    const next = topUps().find((q) => total() + timed(q).timeLimitMinutes <= max);
    if (!next) break;
    qs.push(timed(next));
    if (kindOf(next) === 'hands') pool.filter((q) => q.taskId === next.id && kindOf(q) === 'short').forEach((q) => total() + 2 <= max && qs.push(timed(q)));
  }
  qs.sort((a, b) => tierIndex(a.tier) - tierIndex(b.tier) || at(a) - at(b));
  // Over the level's time: hands-on follow-ups trimmed first, then shorter written, coding and hands-on time
  const extras = qs.filter((q) => hands && q.taskId === hands.id && kindOf(q) === 'short').slice(1);
  for (const q of extras) if (total() > max) qs = qs.filter((x) => x.id !== q.id);
  const floors: Partial<Record<Kind, number>> = { written: 4, code: 6, hands: 10 };
  while (total() > max) {
    const shrink = qs.find((q) => floors[kindOf(q)] !== undefined && q.timeLimitMinutes > floors[kindOf(q)]!);
    if (!shrink) break;
    qs = qs.map((q) => (q.id === shrink.id ? { ...q, timeLimitMinutes: q.timeLimitMinutes - 1 } : q));
  }
  return qs;
}
