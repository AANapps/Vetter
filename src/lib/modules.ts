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

// How much more a question counts for each level above Junior
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

// How long each level's test runs: Junior about 15 minutes, Mid-level 20–25, Senior 30–45 (Beginner is no longer offered)
export const TIER_MINUTES: Record<TestDifficulty, [min: number, max: number]> = {
  Beginner: [5, 10],
  Junior: [13, 15],
  Professional: [20, 25],
  Senior: [30, 45],
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
// No test is mostly one kind of question: multiple choice, drag and drop (ordering or matching) and select all that
// apply are capped at three each. The rest of the time goes on work that makes candidates think: written answers,
// worked short answers, coding where the skill has it, and a hands-on simulation. Where a bank is short of a kind,
// it's made from the level's scenario questions: a matching question pairs situations with their right answers, a
// select-all mixes each situation's right answer with its most tempting wrong one, and a written answer asks what
// you'd do and why
export const KIND_CAP = 3;

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
  choice: [1, 1, 2],
  drag: [2, 2, 3],
  multi: [2, 2, 3],
  written: [3, 4, 5],
  code: [5, 6, 8],
  hands: [9, 10, 14],
  short: [2, 2, 2],
  case: [1, 2, 2],
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
  const [min, max] = TIER_MINUTES[tier];
  const order = new Map(bank.map((q, i) => [q.id, i]));
  // The level's own questions and those below it; the level above only when a kind can't be found otherwise
  const pool = bank.filter((q) => tierIndex(q.tier) <= L + 1);
  const above = (q: Question) => tierIndex(q.tier) > L;
  const byId = new Map(bank.map((q) => [q.id, q]));
  const chosen = new Map<string, Question>();
  // Scenario questions folded into a made-up question, so they aren't asked twice
  const used = new Set<string>();
  const areaUse = new Map<string, number>();
  const kindCount = new Map<Kind, number>();
  const minutesOf = (q: Question) => KIND_MINUTES[kindOf(q)][L];
  const total = () => [...chosen.values()].reduce((n, q) => n + minutesOf(q), 0);
  const fits = (q: Question) => {
    const task = q.taskId ? byId.get(q.taskId) : undefined;
    const extra = task?.type === 'case' && !chosen.has(task.id) ? minutesOf(task) : 0;
    return total() + minutesOf(q) + extra <= max;
  };
  const take = (q: Question) => {
    chosen.set(q.id, q);
    areaUse.set(q.aspect ?? '', (areaUse.get(q.aspect ?? '') ?? 0) + 1);
    kindCount.set(kindOf(q), (kindCount.get(kindOf(q)) ?? 0) + 1);
    const task = q.taskId ? byId.get(q.taskId) : undefined;
    if (task?.type === 'case') chosen.set(task.id, task);
  };
  const free = (q: Question) => !chosen.has(q.id) && !used.has(q.id) && (!q.taskId || byId.get(q.taskId)?.type === 'case');
  const ranked = (qs: Question[]) =>
    [...qs].sort(
      (a, b) =>
        Number(above(a)) - Number(above(b)) ||
        tierIndex(b.tier) - tierIndex(a.tier) ||
        (areaUse.get(a.aspect ?? '') ?? 0) - (areaUse.get(b.aspect ?? '') ?? 0) ||
        (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    );
  const spareChoice = () => ranked(pool.filter((q) => free(q) && q.type === 'choice' && !q.taskId && q.options && q.correctOption !== undefined));
  const spareShort = () => ranked(pool.filter((q) => free(q) && q.type === 'text' && !q.taskId && q.acceptedAnswers?.length));
  const capped = (k: Kind) => (k === 'choice' || k === 'drag' || k === 'multi') && (kindCount.get(k) ?? 0) >= KIND_CAP;

  // One question of a kind: a real one if the bank has it, otherwise one made from scenario questions
  const addOne = (k: Kind): boolean => {
    if (capped(k)) return false;
    const real = ranked(pool.filter((q) => free(q) && kindOf(q) === k)).find(fits);
    if (real) return take(real), true;
    if (k === 'written') {
      const src = spareChoice()[0];
      if (src && fits(asWritten(src))) return take(asWritten(src)), true;
    }
    if (k === 'multi') {
      const src = spareChoice().slice(0, 3);
      if (src.length >= 2 && fits(asMulti(src, tier))) return src.forEach((q) => used.add(q.id)), take(asMulti(src, tier)), true;
    }
    if (k === 'drag') {
      const src = [...spareChoice(), ...spareShort()].slice(0, 3);
      if (src.length >= 2 && fits(asMatch(src, tier))) return src.forEach((q) => used.add(q.id)), take(asMatch(src, tier)), true;
    }
    return false;
  };

  // 1. Hands-on work: the hardest task the level reaches, with its first follow-up above Junior (where time is short)
  const hands = ranked(pool.filter((q) => kindOf(q) === 'hands' && !above(q)))[0];
  if (hands) {
    take(hands);
    const follow = pool.find((q) => q.taskId === hands.id);
    if (follow && L > 0) take(follow);
  }
  // 2. The core: coding where the skill has it, then written answers
  const codeWanted = [1, 1, 2][L];
  for (let i = 0; i < codeWanted; i++) addOne('code');
  const writtenWanted = hands ? [1, 1, 2][L] : [2, 2, 3][L];
  for (let i = 0; i < writtenWanted; i++) addOne('written');
  // 3. The rest of the time, round the kinds in turn: drag and drop, select-all, multiple choice (each capped at
  // three), worked short answers, and more written work
  const rota: Kind[] = ['drag', 'multi', 'choice', 'short', 'written'];
  let stuck = 0;
  for (let i = 0; stuck < rota.length && i < 60; i++) {
    const k = rota[i % rota.length];
    const enough = total() >= min && (k === 'short' || k === 'written') && (kindCount.get(k) ?? 0) >= 2;
    if (!enough && addOne(k)) stuck = 0;
    else stuck++;
    if (total() >= max - 1) break;
  }

  const at = (q: Question) => order.get(q.id) ?? order.get(q.id.replace(/^mix-(match|multi)-/, '')) ?? 0;
  return [...chosen.values()]
    .map((q) => ({ ...q, timeLimitMinutes: minutesOf(q) }))
    .sort((a, b) => tierIndex(a.tier) - tierIndex(b.tier) || at(a) - at(b));
}
