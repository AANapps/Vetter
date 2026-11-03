import React, { useEffect, useState } from 'react';
import { ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { IntegrityEvent, IntegrityEventType, IntegritySitting, LEVELS, integrityOf, levelFor, suspicionPoints, suspicionScore } from '../lib/integrity';

export type { IntegritySitting };
export { integrityOf };

const EVENT_LABELS: Record<IntegrityEventType, string> = {
  'tab-hidden': 'Switched tab',
  'window-blur': 'Switched window or app',
  resize: 'Resized window',
  'split-screen': 'Window narrowed to leave room beside it',
  copy: 'Copied',
  cut: 'Cut',
  'paste-external': 'Pasted from outside the test',
  'paste-internal': 'Pasted from inside the test',
  'right-click': 'Right-clicked',
  'screenshot-key': 'Pressed a screenshot key',
  'screens-changed': 'Screens changed',
};

const clock = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
const duration = (secs: number) => (secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`);

// A coloured label, green clean to red highly suspicious, that opens to every count behind it
export const IntegrityBadge: React.FC<{ sittings: IntegritySitting[]; size?: 'sm' | 'md' }> = ({ sittings, size = 'sm' }) => {
  const [open, setOpen] = useState(false);
  if (sittings.length === 0)
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5" title="No monitoring data for these results">
        <span className="w-2 h-2 rounded-full bg-slate-300" />
        Not monitored
      </span>
    );
  const { score, level } = integrityOf(sittings);
  const style = LEVELS[level];
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1.5 font-semibold border rounded-full hover:shadow-sm transition-shadow ${style.badge} ${size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`}
        title={`Integrity: ${style.label} (${score}/100). Click for details`}
        aria-label={`Integrity: ${style.label}, suspicion ${score} out of 100. Show details`}
      >
        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
        {style.label}
      </button>
      {open && <IntegrityDetails sittings={sittings} onClose={() => setOpen(false)} />}
    </>
  );
};

const Metric: React.FC<{ label: string; value: React.ReactNode; warn?: boolean; note?: string }> = ({ label, value, warn, note }) => (
  <div className={`rounded-lg border px-3 py-2 ${warn ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-white'}`}>
    <div className={`text-lg font-bold font-mono tabular-nums ${warn ? 'text-amber-900' : 'text-slate-900'}`}>{value}</div>
    <div className="text-[11px] text-slate-600 leading-tight">{label}</div>
    {note && <div className="text-[10px] text-slate-400 mt-0.5">{note}</div>}
  </div>
);

const IntegrityDetails: React.FC<{ sittings: IntegritySitting[]; onClose: () => void }> = ({ sittings, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { combined: r, score, level } = integrityOf(sittings);
  const style = LEVELS[level];
  const points = suspicionPoints(r).sort((a, b) => b.points - a.points);
  const screens = r.screens !== null ? String(r.screens) : r.extendedDisplay ? '2+' : r.extendedDisplay === false ? '1' : '?';
  const multiScreen = r.extendedDisplay || (r.screens ?? 1) > 1;
  const timeline: (IntegrityEvent & { test: string })[] = sittings.flatMap((s) => s.report.events.map((e) => ({ ...e, test: s.testTitle })));

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="integrity-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200">
          <div className="flex items-start gap-3">
            {level === 'clean' ? <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" /> : <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0" />}
            <div>
              <h3 id="integrity-title" className="text-base font-bold text-slate-900">
                Integrity: {style.label}
              </h3>
              <p className="text-xs text-slate-500">
                {style.text}. {sittings.length === 1 ? sittings[0].testTitle : `${sittings.length} tests`}.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Suspicion on the green-to-red scale */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-semibold text-slate-700">Suspicion</span>
              <span className="font-mono font-bold text-slate-900">{score}/100</span>
            </div>
            <div className="relative h-3 rounded-full overflow-hidden flex">
              <div className="h-full bg-emerald-500" style={{ width: '10%' }} />
              <div className="h-full bg-lime-500" style={{ width: '15%' }} />
              <div className="h-full bg-amber-500" style={{ width: '20%' }} />
              <div className="h-full bg-orange-500" style={{ width: '25%' }} />
              <div className="h-full bg-rose-600" style={{ width: '30%' }} />
              <div className="absolute -top-0.5 -bottom-0.5 w-1 bg-slate-900 rounded" style={{ left: `calc(${score}% - 2px)` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Clean</span>
              <span>Highly suspicious</span>
            </div>
          </div>

          <section className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Counts</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Metric label="Tab switches" value={r.tabSwitches} warn={r.tabSwitches > 0} />
              <Metric label="Window or app switches" value={r.windowSwitches} warn={r.windowSwitches > 0} />
              <Metric label="Time away" value={duration(r.secondsAway)} warn={r.secondsAway > 0} />
              <Metric label="Screens connected" value={screens} warn={!!multiScreen} note={r.screens === null && r.extendedDisplay === null ? 'Browser couldn’t tell' : undefined} />
              <Metric label="Window resizes" value={r.resizes} warn={r.resizes > 0} />
              <Metric label="Split-screen time" value={duration(r.secondsSplitScreen)} warn={r.secondsSplitScreen > 0} />
              <Metric label="Pastes from outside" value={r.externalPastes} warn={r.externalPastes > 0} note={r.pastedCharacters ? `${r.pastedCharacters.toLocaleString()} characters` : undefined} />
              <Metric label="Pastes from inside" value={r.internalPastes} note="Not suspicious" />
              <Metric label="Copies" value={r.copies} warn={r.copies > 0} />
              <Metric label="Cuts" value={r.cuts} warn={r.cuts > 0} />
              <Metric label="Screenshot keys" value={r.screenshotKeys} warn={r.screenshotKeys > 0} />
              <Metric label="Right-clicks" value={r.rightClicks} />
            </div>
          </section>

          {points.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">What raised the score</h4>
              <ul className="space-y-1">
                {points.map((p) => (
                  <li key={p.signal} className="flex items-center justify-between text-xs text-slate-700">
                    <span>{p.signal}</span>
                    <span className="font-mono text-slate-900">+{p.points}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {sittings.length > 1 && (
            <section className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">By test</h4>
              <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                {sittings.map((s) => {
                  const sc = suspicionScore(s.report);
                  const lv = LEVELS[levelFor(sc)];
                  return (
                    <li key={s.testTitle + s.completedAt} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                      <span className="truncate text-slate-800">{s.testTitle}</span>
                      <span className={`inline-flex items-center gap-1.5 border rounded-full px-2 py-0.5 font-semibold shrink-0 ${lv.badge}`}>
                        <span className={`w-2 h-2 rounded-full ${lv.dot}`} />
                        {lv.label} · {sc}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {timeline.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Timeline</h4>
              <ol className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {timeline.map((e, i) => (
                  <li key={i} className="flex items-baseline gap-3 px-3 py-1.5 text-xs">
                    <span className="font-mono text-slate-400 w-12 shrink-0 tabular-nums">{clock(e.t)}</span>
                    <span className={e.type === 'paste-internal' || e.type === 'right-click' ? 'text-slate-500' : 'text-slate-800'}>
                      {EVENT_LABELS[e.type]}
                      {e.detail && <span className="text-slate-400"> · {e.detail}</span>}
                    </span>
                    {sittings.length > 1 && <span className="ml-auto text-slate-400 truncate">{e.test}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 pt-4">
            These signals come from the candidate&rsquo;s browser. Some have innocent explanations, such as a laptop plugged into a monitor or a
            notification stealing focus. Applications rated Highly suspicious are set aside automatically; review them before you decide.
          </p>
        </div>
      </div>
    </div>
  );
};
