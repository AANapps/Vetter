// Candidates' results split into tiers by score: the top quarter, the second, the third, then the rest. Anyone without
// a score yet is with the rest, and people on the same score are always in the same tier (the higher one).
export const TIERS = [
  { label: 'Top performers', tone: 'bg-emerald-500', text: 'text-emerald-800', soft: 'bg-emerald-50/70' },
  { label: 'Second tier', tone: 'bg-indigo-500', text: 'text-indigo-800', soft: 'bg-indigo-50/60' },
  { label: 'Third tier', tone: 'bg-amber-500', text: 'text-amber-800', soft: 'bg-amber-50/60' },
  { label: 'The rest', tone: 'bg-slate-400', text: 'text-slate-700', soft: 'bg-slate-50' },
] as const;

export const REST = TIERS.length - 1;

// Each item's tier (0 is the top), worked out from everyone given, so it stays the same however the list is filtered
export function tiersOf<T>(items: T[], score: (item: T) => number | undefined): Map<T, number> {
  const scored = items.filter((i) => score(i) !== undefined).sort((a, b) => score(b)! - score(a)!);
  const n = scored.length;
  // Split as evenly as the numbers allow: with fewer than four people, one per tier from the top
  const groups = Math.min(TIERS.length, n);
  const tiers = new Map<T, number>();
  const byScore = new Map<number, number>();
  scored.forEach((item, i) => {
    const s = score(item)!;
    if (!byScore.has(s)) byScore.set(s, Math.floor((i * groups) / n));
    tiers.set(item, byScore.get(s)!);
  });
  for (const item of items) if (!tiers.has(item)) tiers.set(item, REST);
  return tiers;
}
