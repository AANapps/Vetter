import React, { useState } from 'react';
import { X } from 'lucide-react';
import { PricingSection } from './PricingSection';

// Why AI test creation is locked, with the plans that include it. Payments aren't online yet, so choosing a plan says
// how to get it switched on rather than taking a card
export const PlansDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [chosen, setChosen] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Plans">
      <div className="bg-white sm:rounded-2xl rounded-t-2xl max-w-6xl w-full max-h-[calc(100vh-2rem)] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 z-10 bg-white px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Custom tests written by AI need a subscription</h2>
            <p className="text-xs text-slate-500">
              Ready-made tests, editing a copy and writing your own tests stay free. Every paid plan adds AI-written tests and app simulations.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        {chosen && (
          <p className="mx-6 mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-950">
            Online payment isn&rsquo;t open yet. Ask the Vetter team to switch on the {chosen} plan for your company, and AI test creation unlocks
            straight away.
          </p>
        )}
        <PricingSection onChoosePlan={(id) => setChosen(id.replace(/-/g, ' '))} />
      </div>
    </div>
  );
};
