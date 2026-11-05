import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Credit, UsageEntry, loadUsage, pounds, usageLines } from '../lib/aiRequest';

interface CreditMeterProps {
  credit: Credit;
  onTopUp: () => void;
  // What the next test is likely to cost, in pence, when one is about to be written
  estimate?: { low: number; high: number };
  // Changes whenever credit may have been used, so the usage reloads
  refresh?: unknown;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/**
 * How much AI credit is left, as a bar that empties as it's used and turns red when it's nearly gone. Full is what the
 * company had after its last top-up. It opens to every detail: what's been bought and used, what the next test is
 * likely to cost, and each piece of work with the steps it took and when.
 */
export const CreditMeter: React.FC<CreditMeterProps> = ({ credit, onTopUp, estimate, refresh }) => {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<UsageEntry[] | null | undefined>(undefined);
  useEffect(() => {
    loadUsage().then(setEntries);
  }, [refresh, credit.balance]);

  const balance = credit.balance ?? 0;
  const stats = useMemo(() => {
    const list = entries ?? [];
    const lastTopUp = list.findIndex((e) => e.amount < 0);
    // Newest first, so everything before the last top-up was spent since it
    const spentSince = (lastTopUp === -1 ? list : list.slice(0, lastTopUp)).reduce((n, e) => n + Math.max(0, e.amount), 0);
    return {
      full: Math.max(balance + spentSince, balance, 1),
      bought: list.reduce((n, e) => n + Math.max(0, -e.amount), 0),
      used: list.reduce((n, e) => n + Math.max(0, e.amount), 0),
      spentSince,
      lastTopUp: lastTopUp === -1 ? undefined : list[lastTopUp],
    };
  }, [entries, balance]);

  const left = Math.min(1, balance / stats.full);
  // Nearly gone: under a fifth left, under £1, or not enough for the test about to be written
  const low = balance < 100 || left < 0.2 || (estimate ? balance < estimate.high : false);
  const lines = entries ? usageLines(entries) : [];

  return (
    // The card edge is an outline (index.css), so nearly empty colours that red too
    <div className={`rounded-xl border bg-white ${low ? 'border-rose-300' : 'border-slate-200'}`} style={low ? { outlineColor: '#f4a3b5' } : undefined}>
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={`AI credit: ${pounds(balance)} left. ${open ? 'Hide' : 'Show'} details`}
          className="flex-1 min-w-0 flex items-center gap-3 text-left"
        >
          <span className="text-xs font-semibold text-slate-600 shrink-0">AI credit</span>
          <span
            className="flex-1 min-w-[4rem] h-2 rounded-full bg-slate-100 overflow-hidden"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={stats.full}
            aria-valuenow={balance}
          >
            <span className={`block h-full rounded-full transition-all duration-500 ${low ? 'bg-rose-600' : 'bg-indigo-600'}`} style={{ width: `${left * 100}%` }} />
          </span>
          <span className={`text-sm font-semibold tabular-nums shrink-0 ${low ? 'text-rose-700' : 'text-slate-900'}`}>{pounds(balance)} left</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button onClick={onTopUp} className={`shrink-0 text-xs font-semibold ${low ? 'text-rose-700 hover:text-rose-900' : 'text-indigo-700 hover:text-indigo-900'}`}>
          Top up
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 px-3 py-3 space-y-3 text-xs">
          {low && (
            <p className="text-rose-700 font-semibold">
              {estimate && balance < estimate.high
                ? `Not enough for the next test: it's likely to cost up to ${pounds(estimate.high)}. Top up first so it doesn't stop part way.`
                : 'Your credit is nearly used up. Top up to keep writing and changing tests.'}
            </p>
          )}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              ['Left', pounds(balance)],
              ['Used since last top-up', pounds(stats.spentSince)],
              ['Bought in total', pounds(stats.bought)],
              ['Used in total', pounds(stats.used)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-2">
                <dt className="text-[11px] text-slate-500">{k}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="text-slate-600 space-y-0.5">
            {estimate && (
              <li>
                Next test: about <span className="font-semibold text-slate-900 tabular-nums">{pounds(estimate.low)} to {pounds(estimate.high)}</span>, depending on its
                questions and interactive tasks.
              </li>
            )}
            <li>A change to a test: a few pence; adding or changing an interactive task: about 30p to 80p.</li>
            {stats.lastTopUp && (
              <li>
                Last top-up: {pounds(-stats.lastTopUp.amount)} on {when(stats.lastTopUp.at)}.
              </li>
            )}
          </ul>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Every charge</h3>
            {entries === undefined ? (
              <p className="mt-1.5 text-slate-400">Loading…</p>
            ) : entries === null ? (
              <p className="mt-1.5 text-slate-500">Your usage couldn't be loaded just now.</p>
            ) : lines.length === 0 ? (
              <p className="mt-1.5 text-slate-500">Nothing used yet.</p>
            ) : (
              <ul className="mt-1.5 max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {lines.map((l, i) => {
                  // The steps behind this line: the raw charges of the same work, close together in time
                  const steps = entries.filter((e) => e.amount > 0 && l.amount > 0 && e.for === l.for && Math.abs(Date.parse(e.at) - Date.parse(l.at)) < 15 * 60 * 1000);
                  return (
                    <li key={`${l.at}-${i}`} className="px-2.5 py-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0">
                          <span className="font-semibold text-slate-900">{l.what}</span>
                          {l.for && <span className="text-slate-500"> · {l.for}</span>}
                        </span>
                        <span className={`shrink-0 font-semibold tabular-nums ${l.amount < 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {l.amount < 0 ? `+${pounds(-l.amount)}` : `−${pounds(l.amount)}`}
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {when(l.at)}
                        {l.steps > 1 && ` · ${l.steps} steps`}
                      </div>
                      {steps.length > 1 && (
                        <ul className="mt-1 pl-3 border-l border-slate-200 space-y-0.5 text-[11px] text-slate-500">
                          {steps.map((s, j) => (
                            <li key={j} className="flex justify-between gap-3">
                              <span>{s.step}</span>
                              <span className="tabular-nums">{pounds(s.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
