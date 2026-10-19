import React, { useState } from 'react';
import { X, Check, Crown, CreditCard } from 'lucide-react';

interface PricingTiersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: 'tier_1_standard' | 'tier_2_custom';
  onUpgradeTier: (tier: 'tier_1_standard' | 'tier_2_custom') => void;
}

export const PricingTiersModal: React.FC<PricingTiersModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  onUpgradeTier,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTier = (tier: 'tier_1_standard' | 'tier_2_custom') => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onUpgradeTier(tier);
      setSuccessNote(
        `Successfully subscribed to ${
          tier === 'tier_2_custom' ? 'Tier 2 (Custom Assessments)' : 'Tier 1 (Standard Posting)'
        } via Stripe.`
      );
      setTimeout(() => {
        setSuccessNote(null);
        onClose();
      }, 2000);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-900">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-mono font-semibold">
            <Crown className="w-3.5 h-3.5" />
            <span>Monetized Recruiter Solutions</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Predictable Skill-Verified Hiring</h2>
          <p className="text-xs text-slate-500">
            Eliminate resume screening time. Filter engineering applicants by automated sandbox scores.
          </p>
        </div>

        {successNote && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg text-center font-medium">
            {successNote}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Tier 1: Standard Job Posting */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6 shadow-xs">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono uppercase text-slate-500 font-semibold">Tier 1 Plan</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Standard Requisition</h3>
                <p className="text-xs text-slate-500 mt-1">
                  For growing teams hiring for standard engineering and data roles.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">$199</span>
                  <span className="text-xs text-slate-500">/ job posting</span>
                </div>
                <span className="text-[11px] text-slate-500">Active for 60 days</span>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-200 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Standard Test Score Threshold Filtering</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Automated Vector Fit Percentages</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ranked Candidate Pipeline List</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Direct 1-Click Candidate Outreach</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelectTier('tier_1_standard')}
              disabled={isProcessing}
              className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                currentTier === 'tier_1_standard'
                  ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-default'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <span>{currentTier === 'tier_1_standard' ? 'Active Tier' : 'Choose Standard ($199)'}</span>
            </button>
          </div>

          {/* Tier 2: Custom Assessments & Dedicated Bench */}
          <div className="bg-indigo-50/20 border-2 border-indigo-600 rounded-xl p-6 flex flex-col justify-between space-y-6 relative shadow-md">
            <div className="absolute -top-3 right-6 px-2.5 py-0.5 bg-indigo-600 text-white font-semibold text-[10px] uppercase tracking-wider rounded-full shadow-xs">
              Recommended for Scale
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono uppercase text-indigo-700 font-bold">Tier 2 Plan</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">Custom Assessments</h3>
                <p className="text-xs text-slate-500 mt-1">
                  For engineering teams requiring proprietary technical benchmarks.
                </p>
              </div>

              <div className="pt-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">$499</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
                <span className="text-[11px] text-emerald-700 font-medium">Unlimited active jobs & custom tests</span>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-indigo-100 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-semibold text-slate-900">Interactive Modular Test Builder</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Custom Test Cases & Execution Sandboxes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Anti-Cheat Tab Proctoring & Integrity Flags</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Candidate Requisition Vector Matching</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Dedicated Recruiter Bench & Talent Pipeline</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSelectTier('tier_2_custom')}
              disabled={isProcessing}
              className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs ${
                currentTier === 'tier_2_custom'
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{currentTier === 'tier_2_custom' ? 'Current Active Tier' : 'Upgrade to Custom ($499/mo)'}</span>
            </button>
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-500 pt-2">
          Payments powered by Stripe &middot; Cancel or modify plan anytime from your Recruiter Console
        </div>
      </div>
    </div>
  );
};
