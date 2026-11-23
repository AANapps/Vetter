import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { aiFetch } from './aiRequest';
import { Feature, Interval, PLANS, PlanId, PlanInfo, PlanStatus, cheapestWith, hasFeature } from '../../server/plans';

/**
 * The signed-in company's plan, as the server reads it from Stripe (server/billing.ts), and every paywall's check.
 *
 * Nothing is locked when the site doesn't take payments yet (no Stripe key), for the Praxa team, or for candidates:
 * only a company on a plan that leaves a feature out sees it locked, with a button to upgrade.
 */

export type { Feature, Interval, PlanId, PlanStatus };
export { PLANS, cheapestWith };

const OFF: PlanStatus = { billing: false, plan: 'scale', passes: [], jobLimit: Infinity, ai: { allowance: 0, used: 0, credit: 0 } };

async function call(payload: Record<string, unknown>): Promise<PlanStatus & { url?: string; switched?: boolean; error?: string }> {
  try {
    const res = await aiFetch('/api/billing', payload);
    // A static host with no endpoint: no payments
    if (res.status === 404) return OFF;
    const body = await res.json().catch(() => ({}));
    // No limit is Infinity, which JSON sends as null
    return res.ok ? { ...OFF, ...body, jobLimit: typeof body.jobLimit === 'number' ? body.jobLimit : Infinity } :{ ...OFF, billing: true, plan: 'free', error: body.error || "Couldn't reach billing." };
  } catch {
    return { ...OFF, billing: true, plan: 'free', error: "Couldn't reach billing. Check your connection." };
  }
}

export const loadPlan = (refresh = false) => call({ action: refresh ? 'refresh' : 'status' });
// A Checkout page for a new subscription, or the plan switched in place when there's one already
export const subscribeTo = (plan: PlanId, interval: Interval) => call({ action: 'subscribe', plan, interval });
export const buyJobPass = () => call({ action: 'pass' });
export const billingPortal = () => call({ action: 'portal' });

// What a paywall is told about the company
export interface PlanAccess {
  status: PlanStatus;
  info: PlanInfo;
  // Locked features only exist once payments are on
  can: (feature: Feature) => boolean;
  // Opens the plans, saying why
  upgrade: (reason?: string) => void;
  refresh: () => void;
  // Candidates waiting behind the plan's applicant limit, by job id
  lockedApplicants?: Record<string, number>;
  // Their lead ids (jobId__candidateId)
  hiddenLeads?: Set<string>;
}

const UNLOCKED: PlanAccess = { status: OFF, info: PLANS.scale, can: () => true, upgrade: () => {}, refresh: () => {} };
const PlanContext = createContext<PlanAccess>(UNLOCKED);
export const usePlan = () => useContext(PlanContext);

// The plan as App reads it, to enforce limits itself and hand to every paywall below it (PlanScope). company: the
// signed-in company's id (null for anyone else: everything unlocked). onUpgrade opens the plans dialog
export function useCompanyPlan(company: string | null, onUpgrade: (reason?: string) => void): PlanAccess {
  const [status, setStatus] = useState<PlanStatus>(OFF);
  const refresh = useCallback(
    (fresh = false) => {
      if (!company) return setStatus(OFF);
      loadPlan(fresh).then((s) => !s.error && setStatus(s));
    },
    [company]
  );
  useEffect(() => refresh(), [refresh]);
  // Back from paying in another tab
  useEffect(() => {
    const back = () => document.visibilityState === 'visible' && refresh(true);
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [refresh]);
  return company && status.billing
    ? { status, info: PLANS[status.plan], can: (f) => hasFeature(status.plan, f), upgrade: onUpgrade, refresh: () => refresh(true) }
    : { ...UNLOCKED, refresh: () => refresh(true) };
}

export const PlanScope: React.FC<{ value: PlanAccess; children: React.ReactNode }> = ({ value, children }) => <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;

// A feature the plan leaves out: what it is and a button to the plan that has it
export const Locked: React.FC<{ feature: Feature; title: string; children?: React.ReactNode; compact?: boolean }> = ({ feature, title, children, compact }) => {
  const { upgrade } = usePlan();
  const plan = PLANS[cheapestWith(feature)];
  if (compact)
    return (
      <button
        onClick={() => upgrade(`${title} come${title.endsWith('s') ? '' : 's'} with ${plan.name} and above.`)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
        title={`${title}: ${plan.name} plan`}
      >
        <LockIcon /> {title}
      </button>
    );
  return (
    <div className="p-4 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 text-sm space-y-2">
      <p className="font-semibold text-slate-900 flex items-center gap-1.5">
        <LockIcon /> {title}
      </p>
      {children && <div className="text-xs text-slate-600">{children}</div>}
      <button
        onClick={() => upgrade(`${title} come${title.endsWith('s') ? '' : 's'} with ${plan.name} and above.`)}
        className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
      >
        Upgrade to {plan.name}
      </button>
    </div>
  );
};

const LockIcon = () => (
  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);
