/**
 * Outcome tracking: 30 and 90 days after a hire, the company says how the person is doing. Set against the scores
 * they were hired on, it shows whether Corprax's scores predict good hires (the proof companies buy on).
 */
import { HireCheckIn } from '../types';
import { LeadRow } from './leads';

const DAY = 24 * 60 * 60 * 1000;

// When they were hired: the last move to Hired
export const hiredAt = (row: Pick<LeadRow, 'lead'>) => row.lead?.history.filter((h) => h.stage === 'hired').at(-1)?.at;

// The check-in waiting for each hire: the latest one due and not yet answered (90 days replaces a missed 30)
export function dueCheckIns(rows: LeadRow[], now = Date.now()): { row: LeadRow; day: 30 | 90 }[] {
  return rows.flatMap((row) => {
    const at = row.stage === 'hired' ? hiredAt(row) : undefined;
    if (!at) return [];
    const days = (now - new Date(at).getTime()) / DAY;
    const done = new Set((row.lead?.checkIns ?? []).map((c) => c.day));
    const day = days >= 90 && !done.has(90) ? 90 : days >= 30 && !done.has(30) && !done.has(90) ? 30 : null;
    return day ? [{ row, day }] : [];
  });
}

export const RATINGS = ['Not working out', 'Below what we hoped', 'Doing fine', 'Doing well', 'One of our best'];

// Every answered check-in with the score the person was hired on (their fit for the job: the average of its tests)
export function outcomeRows(rows: LeadRow[]): { row: LeadRow; checkIn: HireCheckIn; score: number }[] {
  return rows.flatMap((row) => (row.lead?.checkIns ?? []).map((checkIn) => ({ row, checkIn, score: row.fit })));
}

// Average hiring score of hires doing well (4–5) against those not (1–2), from their latest check-in
export function outcomeSummary(rows: LeadRow[]) {
  const latest = rows.flatMap((row) => {
    const c = [...(row.lead?.checkIns ?? [])].sort((a, b) => a.day - b.day).at(-1);
    return c ? [{ score: row.fit, rating: c.rating, stayed: c.stillEmployed }] : [];
  });
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
  return {
    hires: latest.length,
    good: avg(latest.filter((x) => x.rating >= 4).map((x) => x.score)),
    goodCount: latest.filter((x) => x.rating >= 4).length,
    poor: avg(latest.filter((x) => x.rating <= 2).map((x) => x.score)),
    poorCount: latest.filter((x) => x.rating <= 2).length,
    stayed: latest.filter((x) => x.stayed).length,
  };
}
