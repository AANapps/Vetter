import React, { useState } from 'react';
import { Check, Minus, Sparkles } from 'lucide-react';
import { useCurrency } from '../lib/currency';
import { CurrencyPicker } from './CurrencyPicker';
import { Feature, PASS_DAYS, PLANS as PRICES, PlanId, hasFeature } from '../../server/plans';

type Billing = 'monthly' | 'annual';

interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  // Price per month; annual plans show the monthly equivalent and the yearly total
  price: { monthly: number; annual: number };
  // What an annual plan costs for the year: ten months' price
  billedYearly?: number;
  unit: string;
  cta: string;
  highlights: string[];
  popular?: boolean;
}

// Prices and limits come from server/plans.ts, the list Stripe charges from
const priced = (id: PlanId) => {
  const m = PRICES[id].monthly;
  return { price: { monthly: m, annual: Math.round((m * 10) / 12) }, ...(m && { billedYearly: m * 10 }) };
};
const ai = (id: PlanId) => `£${PRICES[id].aiAllowance / 100} of AI test building ${id === 'free' ? 'to try' : 'a month'}`;

// What each card lists, from the tier as it is now: its limits, then what it adds over the plan before it
const SHORT: Record<Feature, string> = {
  'full-reports': 'Full candidate reports',
  'library-job-sims': 'Corprax’s ready-made job simulations',
  'pool-search': 'Search and invite tested candidates',
  'csv-export': 'CSV export',
  branding: 'Your branding on tests',
  'ai-top-ups': 'Top up AI any time',
};
const ORDER: PlanId[] = ['free', 'starter', 'growth', 'scale'];
const count = (n: number, one: string, many: string) => (Number.isFinite(n) ? `${n} ${n === 1 ? one : many}` : `Unlimited ${many}`);
function highlights(id: PlanId): string[] {
  const t = PRICES[id];
  const before = ORDER[ORDER.indexOf(id) - 1];
  const added = t.features.filter((f) => !before || !hasFeature(before, f)).map((f) => SHORT[f]);
  return [
    count(t.jobs, 'open job', 'open jobs'),
    Number.isFinite(t.applicantsPerJob) ? `First ${t.applicantsPerJob} candidates per job` : 'Unlimited candidates',
    ...(id === 'free' ? ['Corprax’s library of skills tests', 'Ranked by score'] : []),
    ...added,
    count(t.seats, 'team seat', 'team seats'),
    ai(id),
    ...(id === 'scale' ? ['Priority support'] : []),
  ];
}

// Built when drawn, so the Corprax team's changes to the tiers (settings/plans) show
const plansNow = (): Plan[] => [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try Corprax on a real role',
    ...priced('free'),
    unit: 'forever',
    highlights: highlights('free'),
    cta: 'Start free',
      },
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For small teams hiring now and then',
    ...priced('starter'),
    highlights: highlights('starter'),
    unit: 'per month',
    cta: 'Start with Starter',
      },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For teams hiring every month',
    ...priced('growth'),
    highlights: highlights('growth'),
    unit: 'per month',
    cta: 'Start with Growth',
    popular: true,
      },
  {
    id: 'scale',
    name: 'Scale',
    tagline: 'For busy hiring teams',
    ...priced('scale'),
    highlights: highlights('scale'),
    unit: 'per month',
    cta: 'Start with Scale',
      },
];

// The comparison table: true is a tick, false a dash, text is shown as is. Columns follow PLANS
type Cell = boolean | string;
const money = (p: number) => `£${p / 100}`;
const COLUMNS: PlanId[] = ['free', 'starter', 'growth', 'scale'];
const has = (f: Feature) => COLUMNS.map((id) => hasFeature(id, f)) as [Cell, Cell, Cell, Cell];
const lim = (n: number) => (Number.isFinite(n) ? String(n) : 'Unlimited');
const comparisonNow = (): { group: string; rows: { label: string; cells: [Cell, Cell, Cell, Cell] }[] }[] => [
  {
    group: 'Hiring',
    rows: [
      { label: 'Open jobs', cells: COLUMNS.map((id) => lim(PRICES[id].jobs)) as [Cell, Cell, Cell, Cell] },
      { label: 'Candidates per job', cells: COLUMNS.map((id) => lim(PRICES[id].applicantsPerJob)) as [Cell, Cell, Cell, Cell] },
      { label: 'Job listed on Corprax and Google Jobs', cells: [true, true, true, true] },
      { label: 'Invite candidates by email or link', cells: [true, true, true, true] },
      { label: 'Search and invite Corprax’s tested candidates', cells: has('pool-search') },
    ],
  },
  {
    group: 'Tests',
    rows: [
      { label: 'Corprax’s library of skills tests', cells: [true, true, true, true] },
      { label: 'Corprax’s ready-made job simulations', cells: has('library-job-sims') },
      { label: 'AI-built tests and job simulations', cells: ['Trial', true, true, true] },
      {
        label: 'AI included',
        cells: [`${money(PRICES.free.aiAllowance)} once`, `${money(PRICES.starter.aiAllowance)}/mo`, `${money(PRICES.growth.aiAllowance)}/mo`, `${money(PRICES.scale.aiAllowance)}/mo`],
      },
      { label: 'Top up AI credit any time', cells: has('ai-top-ups') },
      { label: 'Write and edit your own tests', cells: [true, true, true, true] },
    ],
  },
  {
    group: 'Results',
    rows: [
      { label: 'Scores and ranking', cells: [true, true, true, true] },
      { label: 'Integrity report', cells: has('full-reports') },
      { label: 'Answer-by-answer review and job simulation replay', cells: has('full-reports') },
      { label: 'Why each candidate fits', cells: has('full-reports') },
      { label: 'CSV export', cells: has('csv-export') },
    ],
  },
  {
    group: 'Team and support',
    rows: [
      { label: 'Team seats', cells: COLUMNS.map((id) => lim(PRICES[id].seats)) as [Cell, Cell, Cell, Cell] },
      { label: 'Your branding on tests', cells: has('branding') },
      { label: 'Support', cells: ['Email', 'Email', 'Email', 'Priority'] },
    ],
  },
];

const faqsNow = () => [
  {
    q: 'Do candidates pay anything?',
    a: 'No. Corprax is free for candidates, always. They keep their scores and can use them for other jobs.',
  },
  {
    q: 'What counts as an open job?',
    a: 'A job that is open to applicants. Close a job and it stops counting, and its results stay for you to look back on.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes, at any time. You pay or are credited the difference for the rest of the month, and can cancel whenever you like.',
  },
  {
    q: 'What is the AI allowance?',
    a: 'Building tests and job simulations with Corprax’s AI uses it. A full test is usually £1–£4. It resets each month; if you run out you can top up, and bought credit never expires.',
  },
  {
    q: 'Hiring just once?',
    a: `Buy a job pass for ${'£'}${PRICES['per-job'].monthly}: one more open job for ${PASS_DAYS} days with unlimited candidates, full reports and £${PRICES['per-job'].aiAllowance / 100} of AI. No subscription.`,
  },
  {
    q: 'Do you add VAT?',
    a: 'Prices are in pounds sterling. Enter your VAT number at checkout and it appears on every invoice.',
  },
];

const CellMark: React.FC<{ value: Cell }> = ({ value }) =>
  value === true ? (
    <Check className="w-4 h-4 text-indigo-600 mx-auto" aria-label="Included" />
  ) : value === false ? (
    <Minus className="w-4 h-4 text-slate-300 mx-auto" aria-label="Not included" />
  ) : (
    <span className="text-slate-700">{value}</span>
  );

// current: the company's plan, when it's signed in (its card says so); busy: the plan being opened for payment
export const PricingSection: React.FC<{ onChoosePlan: (planId: string, interval: 'month' | 'year') => void; current?: PlanId; busy?: string | null }> = ({
  onChoosePlan,
  current,
  busy,
}) => {
  const [billing, setBilling] = useState<Billing>('annual');
  const PLANS = plansNow();
  const COMPARISON = comparisonNow();
  const FAQS = faqsNow();
  // Plans are priced in pounds and shown in the visitor's currency
  const { code, money } = useCurrency();
  const formatPrice = (n: number) => money(n);

  return (
    <section id="pricing" className="scroll-mt-20 max-w-6xl mx-auto px-4 sm:px-6 py-16">
      <header className="text-center max-w-2xl mx-auto">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Pricing</p>
        <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Simple pricing, first job free</h2>
        <p className="mt-3 text-slate-600">
          Pay per job when you hire now and then, or monthly when you hire all the time. Free for candidates, always.
        </p>

        <div role="radiogroup" aria-label="Billing" className="mt-8 inline-flex items-center p-1 rounded-full bg-slate-100 text-sm font-semibold">
          {(['monthly', 'annual'] as Billing[]).map((b) => (
            <button
              key={b}
              role="radio"
              aria-checked={billing === b}
              onClick={() => setBilling(b)}
              className={`px-4 py-1.5 rounded-full transition-colors ${billing === b ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {b === 'monthly' ? 'Monthly' : 'Annual'}
              {b === 'annual' && <span className="ml-1.5 text-[11px] text-emerald-700">2 months free</span>}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-col items-center gap-1">
          <CurrencyPicker />
          {code !== 'GBP' && <p className="text-[11px] text-slate-500">Approximate prices in {code}, converted from pounds sterling.</p>}
        </div>
      </header>

      {/* Plan cards */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
        {PLANS.map((plan) => {
          const price = plan.price ? plan.price[billing] : null;
          const yearly = billing === 'annual' ? plan.billedYearly : undefined;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl bg-white p-6 ${plan.popular ? 'outline outline-2 outline-indigo-600' : ''}`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-600 text-white text-[11px] font-semibold whitespace-nowrap">
                  <Sparkles className="w-3 h-3" /> Most popular
                </span>
              )}
              <h2 className="text-base font-bold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-xs text-slate-500 min-h-[2rem]">{plan.tagline}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">{price === null ? 'Custom' : formatPrice(price)}</span>
                <span className="text-sm text-slate-500">{plan.unit === 'per month' ? '/month' : plan.unit === 'per job' ? '/job' : ''}</span>
              </div>
              <p className="mt-1 h-4 text-[11px] text-slate-500">
                {yearly ? `${formatPrice(yearly)} billed yearly` : plan.unit === 'forever' ? 'No card needed' : plan.unit === 'per job' ? 'Pay once, no subscription' : 'Billed monthly'}
              </p>
              <button
                onClick={() => onChoosePlan(plan.id, billing === 'annual' ? 'year' : 'month')}
                disabled={current === plan.id || !!busy || (!!current && plan.id === 'free')}
                className={`mt-6 w-full py-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-60 ${
                  plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                {current === plan.id ? 'Your plan' : busy === plan.id ? 'Opening…' : current && plan.id === 'free' ? 'Cancel from Manage billing' : current && current !== 'free' ? `Switch to ${plan.name}` : plan.cta}
              </button>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <Check className="w-4 h-4 mt-0.5 text-indigo-600 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Per job */}
      <div className="mt-4 rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900">
            Per job <span className="text-slate-500 font-semibold tabular-nums">{formatPrice(PRICES['per-job'].monthly)}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Hiring just once? One more open job for {PASS_DAYS} days, with unlimited candidates, full reports and £{PRICES['per-job'].aiAllowance / 100} of AI. Pay once, no subscription.
          </p>
        </div>
        <button
          onClick={() => onChoosePlan('per-job', 'month')}
          disabled={!!busy}
          className="shrink-0 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold text-center hover:bg-slate-700 disabled:opacity-60"
        >
          {busy === 'per-job' ? 'Opening…' : 'Buy a job pass'}
        </button>
      </div>

      {/* Enterprise */}
      <div className="mt-4 rounded-2xl bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <div className="flex-1">
          <h2 className="text-lg font-bold">Enterprise</h2>
          <p className="mt-1 text-sm text-slate-300">
            Tests written for your roles by the Corprax team, single sign-on, ATS integration and invoicing. Priced for your hiring volume.
          </p>
        </div>
        <button
          onClick={() => onChoosePlan('enterprise', 'month')}
          className="shrink-0 px-5 py-2.5 rounded-full bg-white text-slate-900 text-sm font-semibold text-center hover:bg-slate-100"
        >
          Talk to us
        </button>
      </div>

      {/* Full comparison */}
      <section className="mt-20">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 text-center">Compare plans</h2>
        <div className="mt-8 -mx-4 sm:mx-0 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-4 pl-4 sm:pl-0 text-left font-semibold text-slate-500 w-[32%]">Features</th>
                {PLANS.map((p) => (
                  <th key={p.id} className="py-4 px-2 text-center">
                    <div className={`font-bold ${p.popular ? 'text-indigo-700' : 'text-slate-900'}`}>{p.name}</div>
                    <div className="text-xs font-medium text-slate-500 tabular-nums">
                      {p.price ? (p.price[billing] === 0 ? 'Free' : `${formatPrice(p.price[billing])}${p.unit === 'per job' ? '/job' : '/mo'}`) : 'Custom'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            {COMPARISON.map((section) => (
              <tbody key={section.group}>
                <tr>
                  <th colSpan={5} className="pt-8 pb-2 pl-4 sm:pl-0 text-left text-xs font-semibold uppercase tracking-wider text-slate-900">
                    {section.group}
                  </th>
                </tr>
                {section.rows.map((row) => (
                  <tr key={row.label} className="border-t border-slate-100">
                    <td className="py-3 pl-4 sm:pl-0 pr-4 text-slate-600">{row.label}</td>
                    {row.cells.map((cell, i) => (
                      <td key={i} className={`py-3 px-2 text-center ${PLANS[i].popular ? 'bg-indigo-50/50' : ''}`}>
                        <CellMark value={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </section>

      {/* Questions */}
      <section className="mt-20 max-w-3xl mx-auto">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 text-center">Questions</h2>
        <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {FAQS.map((f) => (
            <div key={f.q}>
              <dt className="text-sm font-semibold text-slate-900">{f.q}</dt>
              <dd className="mt-1 text-sm text-slate-600">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-20 text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Your first job is free</h2>
        <p className="mt-2 text-slate-600">Post it, send the tests, and see your candidates ranked by what they can do.</p>
        <button onClick={() => onChoosePlan('free', 'month')} className="mt-6 px-6 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          Create a company account
        </button>
      </section>
    </section>
  );
};
