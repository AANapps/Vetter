import React, { useEffect, useRef, useState } from 'react';
import { CreditCard, ExternalLink, X } from 'lucide-react';
import { PricingSection } from './PricingSection';
import { PLANS, PlanAccess, PlanId, billingPortal, buyJobPass, subscribeTo } from '../lib/plan';
import { pounds } from '../lib/aiRequest';

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// The company's plan and every plan it can move to. reason: what it just tried that its plan leaves out. Paying opens
// Stripe in a new tab, so whatever was open behind this stays; the plan is read again when the tab comes back
// onPreview: an admin previewing a plan; picking one switches the preview instead of paying
export const PlansDialog: React.FC<{ reason: string; access: PlanAccess; onClose: () => void; onDone: (text: string) => void; onPreview?: (plan: PlanId) => void }> = ({
  reason,
  access,
  onClose,
  onDone,
  onPreview,
}) => {
  const { status, info } = access;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [blockedUrl, setBlockedUrl] = useState('');
  const box = useRef<HTMLDivElement>(null);
  // A message is shown at the top, so bring it into view from wherever the plan was clicked
  useEffect(() => {
    if (note || error || blockedUrl) box.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [note, error, blockedUrl]);
  // Read the plan again on opening, so a failed first read can recover (and its reason shows below)
  useEffect(() => access.refresh(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Opened straight away, while the click still counts, or the browser blocks it; it's pointed at Stripe once known
  const open = async (id: string, get: () => Promise<{ url?: string; switched?: boolean; error?: string }>) => {
    setError('');
    setBlockedUrl('');
    setBusy(id);
    const tab = window.open('', '_blank');
    const out = await get();
    setBusy(null);
    if (out.switched) {
      tab?.close();
      access.refresh();
      onDone(`You're now on ${PLANS[id as PlanId].name}. You've been charged or credited the difference for this month.`);
      return onClose();
    }
    if (!out.url) {
      tab?.close();
      return setError(out.error ?? "Couldn't open the payment page.");
    }
    if (tab) tab.location.href = out.url;
    else setBlockedUrl(out.url);
    setNote('Finish in the Stripe tab. Your plan updates here as soon as you come back.');
  };

  const choose = (id: string, interval: 'month' | 'year') => {
    if (id === 'enterprise') return setNote('Email the Praxa team about Enterprise and we’ll set it up for you.');
    if (onPreview && id !== 'enterprise') {
      onPreview(id as PlanId);
      onDone(`Previewing ${PLANS[id as PlanId].name}. Nothing was charged.`);
      return onClose();
    }
    if (id === 'free') return;
    if (!status.billing && access.loadError) return setError(`Couldn’t load your plan: ${access.loadError}`);
    if (!status.billing) return setNote(`Online payment isn’t switched on yet. Ask the Praxa team to set your company to ${PLANS[id as PlanId].name}.`);
    if (id === 'per-job') return open(id, buyJobPass);
    if (status.plan !== 'free' && status.plan !== 'per-job' && !window.confirm(`Switch to ${PLANS[id as PlanId].name}? The difference for this month is charged or credited now.`)) return;
    open(id, () => subscribeTo(id as PlanId, interval));
  };

  const left = Math.max(0, status.ai.allowance - status.ai.used);
  return (
    <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Plans">
      <div ref={box} className="bg-white sm:rounded-2xl rounded-t-2xl max-w-6xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">{reason || 'Plans and billing'}</h2>
            {status.billing && (
              <p className="text-xs text-slate-500">
                You&rsquo;re on <b className="text-slate-800">{info.name}</b>
                {status.renewsAt && (status.cancelsAtEnd ? `, ending ${date(status.renewsAt)}` : `, renews ${date(status.renewsAt)}`)}
                {status.passes.length > 0 && ` · ${status.passes.length} job pass${status.passes.length === 1 ? '' : 'es'} (next ends ${date(status.passes.at(-1)?.endsAt)})`}
                {` · AI: ${pounds(left)} of ${pounds(status.ai.allowance)} included left${status.ai.credit > 0 ? `, plus ${pounds(status.ai.credit)} credit` : ''}`}
              </p>
            )}
            {!status.billing && access.loadError && <p className="text-xs font-semibold text-amber-700">Couldn&rsquo;t load your plan: {access.loadError}</p>}
            {status.pastDue && <p className="text-xs font-semibold text-amber-700">Your last payment didn&rsquo;t go through. Update your card in Manage billing to keep your plan.</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {status.billing && status.plan !== 'free' && (
              <button onClick={() => open('portal', billingPortal)} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> Manage billing
              </button>
            )}
            <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {status.billing && status.cancelsAtEnd && status.renewsAt && (
          <div role="alert" className="mx-6 mt-4 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-950 text-sm flex flex-wrap items-center justify-between gap-3">
            <span>
              Your {info.name} subscription is cancelled and ends on <b>{date(status.renewsAt)}</b>. You keep everything until then, and you won&rsquo;t be charged again.
            </span>
            <button onClick={() => open('portal', billingPortal)} disabled={!!busy} className="shrink-0 px-3 py-1.5 rounded-full bg-amber-900 text-white text-xs font-semibold hover:bg-amber-800 disabled:opacity-60">
              {busy === 'portal' ? 'Opening…' : 'Keep my plan'}
            </button>
          </div>
        )}
        {(note || error || blockedUrl) && (
          <div className={`mx-6 mt-4 p-3 rounded-lg text-xs border ${error ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-indigo-50 border-indigo-200 text-indigo-950'}`}>
            {error || note}
            {blockedUrl && (
              <a href={blockedUrl} target="_blank" rel="noreferrer" className="ml-2 font-semibold underline inline-flex items-center gap-1">
                Open the payment page <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
        <PricingSection onChoosePlan={choose} current={status.billing ? (status.plan === 'per-job' ? 'free' : status.plan) : undefined} busy={busy} />
      </div>
    </div>
  );
};
