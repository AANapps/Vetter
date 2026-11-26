import React, { useEffect, useMemo } from 'react';
import { Briefcase, Check, PartyPopper, X } from 'lucide-react';
import { PLANS, PlanId } from '../lib/plan';
import { pounds } from '../lib/aiRequest';

const COLOURS = ['#6366f1', '#1DE2A8', '#f59e0b', '#ec4899', '#38bdf8', '#a855f7'];
const many = (n: number) => (n === Infinity ? 'Unlimited' : String(n));

// Shown when a company comes back from paying in Stripe: congratulations, confetti, and what the plan now gives them
export const PaidCelebration: React.FC<{ plan: PlanId | null; onClose: () => void; onGoToJobs: () => void }> = ({ plan, onClose, onGoToJobs }) => {
  const info = plan && PLANS[plan] ? PLANS[plan] : null;
  const pass = plan === 'per-job';
  // Pieces fall once from random spots; left out for people who've asked for less motion (CSS below)
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.6 + Math.random() * 2,
        size: 6 + Math.random() * 6,
        colour: COLOURS[i % COLOURS.length],
        spin: Math.random() > 0.5 ? 1 : -1,
        round: Math.random() > 0.7,
      })),
    []
  );
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const perks = info
    ? [
        pass ? 'One more open job for 30 days' : `${many(info.jobs)} open job${info.jobs === 1 ? '' : 's'} at once`,
        'See every candidate who applies',
        'Full reports: integrity, answers, job sim replays and why they fit',
        `${pounds(info.aiAllowance)} of AI ${pass ? 'with this pass' : 'included every month'}`,
        `${many(info.seats)} people on your account`,
        ...(info.features.includes('pool-search') ? ['Search and invite tested candidates'] : []),
        ...(info.features.includes('library-job-sims') ? ['Corprax’s ready-made job simulations'] : []),
        ...(info.features.includes('csv-export') ? ['CSV export'] : []),
      ]
    : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-hidden" role="dialog" aria-modal="true" aria-label="Payment complete">
      <style>{`
        @keyframes praxa-confetti { 0% { transform: translateY(-10vh) rotate(0); opacity: 1 } 100% { transform: translateY(110vh) rotate(var(--spin)); opacity: .9 } }
        .praxa-confetti { position: absolute; top: 0; animation: praxa-confetti var(--d) cubic-bezier(.25,.6,.5,1) var(--delay) both; pointer-events: none }
        @media (prefers-reduced-motion: reduce) { .praxa-confetti { display: none } }
      `}</style>
      {pieces.map((p, i) => (
        <span
          key={i}
          aria-hidden
          className="praxa-confetti"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              background: p.colour,
              borderRadius: p.round ? '50%' : 2,
              '--d': `${p.duration}s`,
              '--delay': `${p.delay}s`,
              '--spin': `${p.spin * 720}deg`,
            } as React.CSSProperties
          }
        />
      ))}
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 sm:p-8 text-center">
        <button onClick={onClose} aria-label="Close" className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>
        <div className="mx-auto w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center">
          <PartyPopper className="w-7 h-7 text-indigo-600" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Congratulations!</h2>
        <p className="mt-2 text-sm text-slate-600">
          {info ? (pass ? 'Your job pass is ready.' : `You’re now on ${info.name}.`) : 'Your payment went through.'} Thanks for choosing Corprax.
        </p>
        {perks.length > 0 && (
          <ul className="mt-5 space-y-2 text-left text-sm text-slate-700">
            {perks.map((p) => (
              <li key={p} className="flex gap-2">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={onGoToJobs}
          className="mt-6 w-full py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 inline-flex items-center justify-center gap-2"
        >
          <Briefcase className="w-4 h-4" /> {pass ? 'Post your job' : 'Go to your jobs'}
        </button>
        <p className="mt-3 text-[11px] text-slate-500">A receipt is on its way by email. Manage billing is in your name menu.</p>
      </div>
    </div>
  );
};
