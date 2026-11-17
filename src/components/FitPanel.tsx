import React from 'react';
import { AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { FitSummary, fitTone } from '../lib/fitReasons';

// Why a candidate fits one of the company's jobs: the fit, a few reasons, and anything to check
export const FitPanel: React.FC<{ summary: FitSummary; onOpenJob?: (jobId: string) => void }> = ({ summary, onOpenJob }) => (
  <section className="bg-white border border-indigo-200 rounded-2xl shadow-xs overflow-hidden">
    <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-indigo-50 via-violet-50 to-white flex items-center justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Why they fit
        </h2>
        <p className="text-xs text-slate-600 truncate">
          For{' '}
          {onOpenJob ? (
            <button onClick={() => onOpenJob(summary.job.id)} className="font-semibold text-indigo-700 hover:underline">
              {summary.job.title}
            </button>
          ) : (
            <span className="font-semibold">{summary.job.title}</span>
          )}{' '}
          · {summary.tier}
        </p>
      </div>
      <div className={`shrink-0 px-3 py-1.5 rounded-xl border text-center ${fitTone(summary.fit)}`}>
        <div className="text-2xl font-bold tabular-nums leading-none">{summary.fit}%</div>
        <div className="text-[10px] font-semibold uppercase tracking-wider">Fit</div>
      </div>
    </div>
    <div className="px-5 sm:px-6 py-4 space-y-2">
      {summary.reasons.length === 0 && summary.concerns.length === 0 && <p className="text-sm text-slate-500">Not enough on their profile yet to say more.</p>}
      <ul className="space-y-1.5">
        {summary.reasons.map((r) => (
          <li key={r} className="flex gap-2 text-sm text-slate-800">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
            {r}
          </li>
        ))}
        {summary.concerns.map((c) => (
          <li key={c} className="flex gap-2 text-sm text-slate-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            {c}
          </li>
        ))}
      </ul>
    </div>
  </section>
);
