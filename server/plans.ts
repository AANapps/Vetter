/**
 * Praxa's company plans: what each costs and what it unlocks. One list, read by the server (what Stripe charges, the
 * AI allowance) and the site (the pricing page and every paywall), so the two can't disagree.
 *
 * Agreed 2026-11-21 (docs/pricing.md, "Recommended plan for launch"). Candidates are always free.
 */

export type PlanId = 'free' | 'per-job' | 'starter' | 'growth' | 'scale' | 'enterprise';
export type Interval = 'month' | 'year';

// What a plan unlocks beyond the free one
export type Feature =
  // Integrity report, answer-by-answer review, job simulation replay and why they fit; free sees the score only
  | 'full-reports'
  // Praxa's ready-made job simulations on a job
  | 'library-job-sims'
  // Searching Praxa's pool of tested candidates and inviting them to a job
  | 'pool-search'
  | 'csv-export'
  | 'branding'
  // Buying AI credit beyond the plan's allowance
  | 'ai-top-ups';

export interface PlanInfo {
  id: PlanId;
  name: string;
  // Pounds a month (a year is ten months); per-job is pounds per job
  monthly: number;
  // Open jobs at once; Infinity for no limit. Per job is one per pass
  jobs: number;
  // Applicants a company can see on each job; the rest wait behind an upgrade
  applicantsPerJob: number;
  // People on the company's account, the owner included
  seats: number;
  // AI credit included, in pence: each month (free: once, per job: per pass)
  aiAllowance: number;
  features: Feature[];
}

const PAID: Feature[] = ['full-reports', 'ai-top-ups'];

export const PLANS: Record<PlanId, PlanInfo> = {
  free: { id: 'free', name: 'Free', monthly: 0, jobs: 1, applicantsPerJob: 15, seats: 1, aiAllowance: 200, features: [] },
  'per-job': { id: 'per-job', name: 'Per job', monthly: 149, jobs: 1, applicantsPerJob: Infinity, seats: 2, aiAllowance: 1000, features: PAID },
  starter: { id: 'starter', name: 'Starter', monthly: 99, jobs: 3, applicantsPerJob: Infinity, seats: 2, aiAllowance: 1000, features: PAID },
  growth: {
    id: 'growth',
    name: 'Growth',
    monthly: 249,
    jobs: 10,
    applicantsPerJob: Infinity,
    seats: 5,
    aiAllowance: 2500,
    features: [...PAID, 'library-job-sims', 'pool-search'],
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    monthly: 549,
    jobs: Infinity,
    applicantsPerJob: Infinity,
    seats: Infinity,
    aiAllowance: 6000,
    features: [...PAID, 'library-job-sims', 'pool-search', 'csv-export', 'branding'],
  },
  // Set by the Praxa team after a sales call; everything, with an allowance agreed per company
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthly: 0,
    jobs: Infinity,
    applicantsPerJob: Infinity,
    seats: Infinity,
    aiAllowance: 10000,
    features: [...PAID, 'library-job-sims', 'pool-search', 'csv-export', 'branding'],
  },
};

// Subscriptions sold online, cheapest first
export const SUBSCRIPTIONS: PlanId[] = ['starter', 'growth', 'scale'];
export const RANK: PlanId[] = ['free', 'per-job', 'starter', 'growth', 'scale', 'enterprise'];
// How long a per-job pass keeps its job open
export const PASS_DAYS = 30;

// Pence Stripe charges: a year is ten months' price (two months free)
export const pricePence = (plan: PlanId, interval: Interval) => PLANS[plan].monthly * 100 * (interval === 'year' ? 10 : 1);

export const hasFeature = (plan: PlanId, feature: Feature) => PLANS[plan].features.includes(feature);
// The cheapest plan with a feature, for "Upgrade to Growth" buttons
export const cheapestWith = (feature: Feature): PlanId => RANK.find((p) => p !== 'per-job' && hasFeature(p, feature)) ?? 'scale';

// What the site is told about a company's plan (the /api/billing answer)
export interface PlanStatus {
  // false when the site doesn't take payments (no Stripe key) or for the Praxa team: nothing is locked
  billing: boolean;
  plan: PlanId;
  interval?: Interval;
  // The subscription: when it renews or ends, and whether it was cancelled (it ends then)
  renewsAt?: string;
  cancelsAtEnd?: boolean;
  // Payment failed: the plan holds while Stripe retries
  pastDue?: boolean;
  // Per-job passes still open, newest first
  passes: { id: string; endsAt: string }[];
  // Jobs that can be open at once, free one included
  jobLimit: number;
  ai: { allowance: number; used: number; credit: number; resets?: string };
}

// Firestore keeps a plan only the Praxa team can set ('per-job' there means a pass with no end); the older names are
// read as the nearest plan now
export function planFromRecord(value: unknown): PlanId {
  return typeof value === 'string' && (RANK as string[]).includes(value) ? (value as PlanId) : 'free';
}

export const higher = (a: PlanId, b: PlanId): PlanId => (RANK.indexOf(a) >= RANK.indexOf(b) ? a : b);

// --- What the Praxa team changed (settings/plans in Firestore) ---

// The team can change each tier's price, limits, AI allowance and features from the admin page. Kept in one
// Firestore document anyone can read; -1 or null means no limit (Firestore can't store Infinity everywhere)
export type TierChange = Partial<Pick<PlanInfo, 'monthly' | 'jobs' | 'applicantsPerJob' | 'seats' | 'aiAllowance' | 'features'>>;
export type TierSettings = Partial<Record<PlanId, TierChange>>;

const copy = (p: PlanInfo): PlanInfo => ({ ...p, features: [...p.features] });
export const DEFAULT_PLANS: Record<PlanId, PlanInfo> = Object.fromEntries(Object.entries(PLANS).map(([k, v]) => [k, copy(v)])) as Record<PlanId, PlanInfo>;
export const ALL_FEATURES: Feature[] = ['full-reports', 'library-job-sims', 'pool-search', 'csv-export', 'branding', 'ai-top-ups'];
export const FEATURE_NAMES: Record<Feature, string> = {
  'full-reports': 'Full reports (integrity, answers, replay, fit)',
  'library-job-sims': 'Praxa’s ready-made job simulations',
  'pool-search': 'Search and invite tested candidates',
  'csv-export': 'CSV export',
  branding: 'Branding on tests',
  'ai-top-ups': 'Buy AI credit',
};

const limit = (v: unknown, fallback: number) => (v === null || v === -1 ? Infinity : typeof v === 'number' && v >= 0 ? v : fallback);

// The defaults with the team's changes on top, written into PLANS so everything reading it follows
export function applyTiers(settings: TierSettings | null | undefined) {
  for (const id of RANK) {
    const base = DEFAULT_PLANS[id];
    const c = settings?.[id] ?? {};
    PLANS[id] = {
      ...copy(base),
      monthly: typeof c.monthly === 'number' && c.monthly >= 0 ? c.monthly : base.monthly,
      jobs: limit(c.jobs, base.jobs),
      applicantsPerJob: limit(c.applicantsPerJob, base.applicantsPerJob),
      seats: limit(c.seats, base.seats),
      aiAllowance: typeof c.aiAllowance === 'number' && c.aiAllowance >= 0 ? c.aiAllowance : base.aiAllowance,
      features: Array.isArray(c.features) ? c.features.filter((f): f is Feature => ALL_FEATURES.includes(f)) : base.features,
    };
  }
}
// Back to what Firestore can store
export const storedLimit = (n: number) => (Number.isFinite(n) ? n : -1);

// An admin trying the site as a plan, with AI used and credit set to test each level (never charged)
export interface PlanPreview {
  plan: PlanId;
  used: number;
  credit: number;
}
