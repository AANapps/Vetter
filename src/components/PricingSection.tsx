import React, { useState } from 'react';
import { Check, Minus, Sparkles } from 'lucide-react';

type Billing = 'monthly' | 'annual';

interface Plan {
  id: string;
  name: string;
  tagline: string;
  // Price per month (or per job); annual plans show the monthly equivalent and the yearly total
  price: { monthly: number; annual: number } | null;
  // What an annual plan costs for the year: ten months' price
  billedYearly?: number;
  unit: string;
  cta: string;
  highlights: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try Vetter on a real role',
    price: { monthly: 0, annual: 0 },
    unit: 'forever',
    cta: 'Start free',
    highlights: ['1 active job', 'Up to 25 candidates', 'Vetter’s library of tests', 'Ranked leaderboard'],
  },
  {
    id: 'per-job',
    name: 'Per job',
    tagline: 'For the odd hire, with no subscription',
    price: { monthly: 79, annual: 79 },
    unit: 'per job',
    cta: 'Post a job',
    highlights: ['1 job, open for 30 days', 'Unlimited candidates', 'AI-written tests and simulations', 'AI marking of code and SQL'],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For teams hiring every month',
    price: { monthly: 149, annual: 124 },
    billedYearly: 1490,
    unit: 'per month',
    cta: 'Start with Growth',
    popular: true,
    highlights: ['Up to 5 active jobs', 'Everything in Per job', '3 team seats', 'CSV export of results'],
  },
  {
    id: 'scale',
    name: 'Scale',
    tagline: 'For busy hiring teams',
    price: { monthly: 349, annual: 291 },
    billedYearly: 3490,
    unit: 'per month',
    cta: 'Start with Scale',
    highlights: ['Unlimited jobs', 'Unlimited team seats', 'Your branding on tests', 'Priority support'],
  },
];

// The comparison table: true is a tick, false a dash, text is shown as is. Columns follow PLANS
type Cell = boolean | string;
const COMPARISON: { group: string; rows: { label: string; cells: [Cell, Cell, Cell, Cell] }[] }[] = [
  {
    group: 'Hiring',
    rows: [
      { label: 'Active jobs', cells: ['1', '1 per purchase', 'Up to 5', 'Unlimited'] },
      { label: 'Candidates per job', cells: ['25', 'Unlimited', 'Unlimited', 'Unlimited'] },
      { label: 'Job listed on Vetter and Google Jobs', cells: [true, true, true, true] },
      { label: 'Invite candidates by email or link', cells: [true, true, true, true] },
    ],
  },
  {
    group: 'Tests',
    rows: [
      { label: 'Vetter’s library of tests', cells: [true, true, true, true] },
      { label: 'AI-written tests for your role', cells: [false, true, true, true] },
      { label: '15-minute job simulations', cells: [false, true, true, true] },
      { label: 'AI marking with partial credit', cells: [false, true, true, true] },
      { label: 'Edit and build your own tests', cells: [false, true, true, true] },
    ],
  },
  {
    group: 'Results',
    rows: [
      { label: 'Ranked leaderboard per job', cells: [true, true, true, true] },
      { label: 'Answer-by-answer review', cells: [true, true, true, true] },
      { label: 'CSV export', cells: [false, false, true, true] },
      { label: 'Search Vetter’s pool of tested candidates', cells: [false, false, true, true] },
    ],
  },
  {
    group: 'Team and support',
    rows: [
      { label: 'Team seats', cells: ['1', '1', '3', 'Unlimited'] },
      { label: 'Your branding on tests', cells: [false, false, false, true] },
      { label: 'Support', cells: ['Email', 'Email', 'Email', 'Priority'] },
    ],
  },
];

const FAQS = [
  {
    q: 'Do candidates pay anything?',
    a: 'No. Vetter is free for candidates, always. They keep their verified scores and can use them for other jobs.',
  },
  {
    q: 'What counts as an active job?',
    a: 'A job that is open to applicants. Close a job and it stops counting, and its results stay for you to look back on.',
  },
  {
    q: 'Can I change plans later?',
    a: 'Yes, at any time. Upgrades take effect straight away; downgrades take effect at the end of the billing period.',
  },
  {
    q: 'What happens after my 30-day job ends?',
    a: 'It closes to new applicants and you keep every result. You can reopen it for another 30 days by buying another job.',
  },
];

const formatPrice = (n: number) => `£${n.toLocaleString('en-GB')}`;

const CellMark: React.FC<{ value: Cell }> = ({ value }) =>
  value === true ? (
    <Check className="w-4 h-4 text-indigo-600 mx-auto" aria-label="Included" />
  ) : value === false ? (
    <Minus className="w-4 h-4 text-slate-300 mx-auto" aria-label="Not included" />
  ) : (
    <span className="text-slate-700">{value}</span>
  );

// Pricing for companies, on the business landing page: plan cards, a monthly/annual switch, a full comparison and common questions
export const PricingSection: React.FC<{ onChoosePlan: (planId: string) => void }> = ({ onChoosePlan }) => {
  const [billing, setBilling] = useState<Billing>('annual');

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
                onClick={() => onChoosePlan(plan.id)}
                className={`mt-6 w-full py-2.5 rounded-full text-sm font-semibold transition-colors ${
                  plan.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-900 text-white hover:bg-slate-700'
                }`}
              >
                {plan.cta}
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

      {/* Enterprise */}
      <div className="mt-4 rounded-2xl bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
        <div className="flex-1">
          <h2 className="text-lg font-bold">Enterprise</h2>
          <p className="mt-1 text-sm text-slate-300">
            Tests written for your roles by the Vetter team, single sign-on, ATS integration and invoicing. Priced for your hiring volume.
          </p>
        </div>
        <button
          onClick={() => onChoosePlan('enterprise')}
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
        <button onClick={() => onChoosePlan('free')} className="mt-6 px-6 py-3 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          Create a company account
        </button>
      </section>
    </section>
  );
};
