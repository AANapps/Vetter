import React, { useState } from 'react';
import { Eye, X } from 'lucide-react';
import { PLANS, PlanId, PlanPreview } from '../lib/plan';
import { pounds } from '../lib/aiRequest';

const CHOICES: PlanId[] = ['free', 'per-job', 'starter', 'growth', 'scale', 'enterprise'];

// For the Corprax team in the company view: see the site as a company on any plan, subscribed or not, with its AI used
// up to any level and any credit, to try every paywall and the out-of-AI messages. Nothing is charged; AI requests are
// refused by the server just as they would be for that plan
export const PlanPreviewBar: React.FC<{ preview: PlanPreview | null; onChange: (p: PlanPreview | null) => void }> = ({ preview, onChange }) => {
  const [open, setOpen] = useState(false);
  const [lastPaid, setLastPaid] = useState<PlanId>('growth');
  const plan = preview?.plan;
  const allowance = plan ? PLANS[plan].aiAllowance : 0;
  const pick = (next: PlanId | '') => {
    if (!next) return onChange(null);
    if (next !== 'free') setLastPaid(next);
    // Usage carries over as a share of the allowance, so moving between plans keeps the level being tested
    const share = preview && allowance ? preview.used / allowance : 0;
    onChange({ plan: next, used: Math.round(share * PLANS[next].aiAllowance), credit: preview?.credit ?? 0 });
  };
  const subscribed = !!plan && plan !== 'free';

  return (
    <div className="fixed bottom-4 left-4 z-[55] text-xs">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full shadow-lg font-semibold border ${
            preview ? 'bg-amber-100 border-amber-300 text-amber-950' : 'bg-white border-slate-300 text-slate-700'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          {preview ? `Previewing ${PLANS[preview.plan].name}${subscribed ? '' : ' (unsubscribed)'}` : 'Preview a plan'}
        </button>
      ) : (
        <div className="w-72 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-slate-900 text-sm">Plan preview</p>
            <button onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-slate-500">See the company side as a customer on any plan. Only you see this; nothing is charged.</p>

          <div role="radiogroup" aria-label="Subscribed" className="grid grid-cols-2 p-1 rounded-lg bg-slate-100 font-semibold">
            {[
              ['Unsubscribed', !subscribed && !!preview, () => pick('free')],
              ['Subscribed', subscribed, () => pick(lastPaid)],
            ].map(([label, on, act]) => (
              <button
                key={label as string}
                role="radio"
                aria-checked={on as boolean}
                onClick={act as () => void}
                className={`py-1.5 rounded-md ${on ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
              >
                {label as string}
              </button>
            ))}
          </div>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-700">Plan</span>
            <select value={plan ?? ''} onChange={(e) => pick(e.target.value as PlanId | '')} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white">
              <option value="">Corprax team (everything open)</option>
              {CHOICES.map((id) => (
                <option key={id} value={id}>
                  {PLANS[id].name}
                  {id === 'free' ? ' (unsubscribed)' : ''}
                </option>
              ))}
            </select>
          </label>

          {preview && (
            <>
              <label className="block space-y-1">
                <span className="font-semibold text-slate-700 flex justify-between">
                  <span>AI used this month</span>
                  <span className="tabular-nums">
                    {pounds(preview.used)} of {pounds(allowance)}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={allowance}
                  step={Math.max(1, Math.round(allowance / 100))}
                  value={Math.min(preview.used, allowance)}
                  onChange={(e) => onChange({ ...preview, used: Number(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
                <span className="flex gap-1">
                  {[0, 0.5, 0.9, 1].map((share) => (
                    <button
                      key={share}
                      onClick={() => onChange({ ...preview, used: Math.round(allowance * share) })}
                      className="flex-1 py-1 rounded border border-slate-200 hover:border-indigo-400 font-semibold text-slate-600"
                    >
                      {share === 1 ? 'Used up' : `${share * 100}%`}
                    </button>
                  ))}
                </span>
              </label>
              <label className="block space-y-1">
                <span className="font-semibold text-slate-700">Bought credit (£)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={preview.credit / 100}
                  onChange={(e) => onChange({ ...preview, credit: Math.max(0, Math.round(Number(e.target.value) * 100)) })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg"
                />
              </label>
              <p className="text-slate-500">
                AI left: <b className="text-slate-800">{pounds(Math.max(0, allowance - preview.used) + preview.credit)}</b>. Under 10p, AI requests are refused as they would be for this plan.
              </p>
              <button onClick={() => onChange(null)} className="w-full py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50">
                Stop previewing
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
