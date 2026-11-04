import React, { useEffect, useRef, useState } from 'react';
import { Check, CreditCard, ExternalLink, X } from 'lucide-react';
import { Credit, loadCredit, pounds, topUpUrl } from '../lib/aiRequest';

interface CreditsDialogProps {
  credit: Credit;
  // The balance as it is now, after paying
  onUpdated: (credit: Credit) => void;
  onClose: () => void;
}

const DEFAULT_PACKS = [1000, 2500, 5000];
const POLL_MS = 4000;

// Buying AI credit. Stripe's payment page opens in a new tab, so the test and chat behind this stay as they are; this
// watches the balance and says when the credit has arrived
export const CreditsDialog: React.FC<CreditsDialogProps> = ({ credit, onUpdated, onClose }) => {
  const [paying, setPaying] = useState<number | null>(null);
  const [error, setError] = useState('');
  // A payment tab the browser blocked: a link to open it instead
  const [blockedUrl, setBlockedUrl] = useState('');
  const [added, setAdded] = useState(0);
  const start = useRef(credit.balance ?? 0);

  // While a payment is open, the balance is checked every few seconds until it goes up
  useEffect(() => {
    if (paying === null || added) return;
    const timer = setInterval(async () => {
      const next = await loadCredit();
      if (next.balance !== undefined && next.balance > start.current) {
        setAdded(next.balance - start.current);
        onUpdated(next);
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [paying, added]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const buy = async (pence: number) => {
    setError('');
    setBlockedUrl('');
    start.current = credit.balance ?? 0;
    // Opened straight away, while the click still counts, or the browser blocks it; it's pointed at Stripe once known
    const tab = window.open('', '_blank');
    setPaying(pence);
    const { url, error: why } = await topUpUrl(pence);
    if (!url) {
      tab?.close();
      setPaying(null);
      setError(why ?? "Couldn't open the payment page.");
      return;
    }
    if (tab) tab.location.href = url;
    else setBlockedUrl(url);
  };

  const packs = credit.packs?.length ? credit.packs : DEFAULT_PACKS;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label="AI credit" className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
        <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">AI credit</h2>
            <p className="text-sm text-slate-500">
              Balance <span className="font-semibold text-slate-900 tabular-nums">{pounds(credit.balance ?? 0)}</span>
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {added > 0 ? (
            <div className="space-y-4">
              <p className="flex items-start gap-2 text-base text-emerald-800">
                <Check className="w-5 h-5 mt-0.5 shrink-0" />
                {pounds(added)} added. You can carry on where you left off.
              </p>
              <button onClick={onClose} className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
                Carry on
              </button>
            </div>
          ) : paying !== null ? (
            <div className="space-y-3">
              <p className="text-base text-slate-700">
                Finish paying {pounds(paying)} in the new tab. Your test and the conversation stay here, and this updates as soon as the credit arrives.
              </p>
              {blockedUrl && (
                <a href={blockedUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:text-indigo-900">
                  <ExternalLink className="w-4 h-4" />
                  Open the payment page
                </a>
              )}
              <p className="text-sm text-slate-500 animate-pulse">Waiting for the payment…</p>
              <button onClick={() => setPaying(null)} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
                Pick a different amount
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Writing and changing tests with Vetter's AI uses credit: a full test with interactive tasks is usually around £1 to £3, a change a few pence to 50p. Credit doesn't expire.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {packs.map((p) => (
                  <button key={p} onClick={() => buy(p)} className="px-3 py-3 rounded-xl border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 text-lg font-bold text-slate-900 tabular-nums">
                    {pounds(p)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                Paid securely with Stripe, in a new tab.
              </p>
            </>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      </div>
    </div>
  );
};
