# Payments and paywalls (2026-11-23)

Built and pushed to main (commit `205bbe1`). The billing code passed all 13 checks against a fake Stripe, but it hasn't
been run against real Stripe yet. Nothing is locked until `STRIPE_SECRET_KEY` is set in Vercel, so the live site behaves
as before for now.

## How companies are charged (`server/plans.ts`)

| | Free | Starter £99 | Growth £249 | Scale £549 | Per job £149 |
|---|---|---|---|---|---|
| Open jobs | 1 | 3 | 10 | Unlimited | +1 for 30 days |
| Candidates per job | first 15 | all | all | all | all |
| AI included | £2 once | £10/mo | £25/mo | £60/mo | £10 |
| Seats | 1 | 2 | 5 | Unlimited | 2 |

- **Yearly** costs 10 months' price and is the default on the pricing page.
- **Full reports** (integrity report, answers, job sim replay, why they fit) come with every paid plan.
- **Growth and above** add searching and inviting tested candidates, and Praxa's ready-made job simulations.
- **Scale** adds CSV export.

## Why it's set up this way

- **Subscriptions, with AI as a monthly allowance.** Recurring income, and heavy AI users can't cost more than they
  pay. Companies use the allowance first and can then top up. Free companies can't top up; they're asked to choose a plan.
- **Locked features stay visible.** Each shows a lock and an "Upgrade to X" button that opens the plans dialog with the
  reason at the top. Free companies see "12 more candidates are waiting", which pushes upgrades better than hiding it.
- **Upgrades take effect straight away** and charge the difference for the rest of the month. Cancelling runs to the
  end of the period.
- **A job pass costs more than Starter** (£149 v £99), so anyone hiring twice is nudged to subscribe.
- **The prices hold up against competitors.** TestGorilla is about $1,600–1,700 a year and HackerRank's paid plans are
  reported at about $100–165 a month (third-party figures; check before quoting).

## How payment works

- Paying opens Stripe Checkout in a new tab, and the plan updates when the company comes back.
- "Manage billing" opens Stripe's own page for cards, invoices and cancelling.
- The server reads the plan from Stripe on every request, so no webhook is needed and companies can't give themselves a plan.
- Only the company's owner can pay or change the plan.
- A plan the Praxa team sets on the company record (e.g. `enterprise`) still counts, whichever is higher.

## Things to know

- **Separate Stripe customers.** Stripe automatically spends a customer's credit on its next invoice and that can't be
  switched off, so subscriptions sit on a second Stripe customer per company; otherwise bought AI credit would pay the
  subscription.
- **Only AI spending is enforced on the server.** Job, candidate, seat and feature limits are only checked in the
  browser, because Firestore can't see Stripe. Server enforcement needs the Firebase admin key (anti-cheat step 1).
- **Not built yet:** branding on tests (which Scale advertises), the Project Manager add-on, VAT through Stripe Tax, and
  an admin control for setting a company's plan.

## To switch it on

1. In Vercel, set `STRIPE_SECRET_KEY=sk_test_...` and `SITE_URL`.
2. In Stripe, turn on the customer portal: Settings → Billing → Customer portal.
3. Work through the test checklist in `docs/TODO.md`: subscribe, switch plans, buy a job pass, use up the free trial,
   top up, cancel.

Setup details are in the README ("Plans and paywalls"); the charging choices in `docs/pricing.md`.

Sources: [G2 – TestGorilla pricing](https://www.g2.com/products/testgorilla/pricing),
[Capterra – TestGorilla](https://capterra.com/p/203823/TestGorilla/pricing/),
[Rework – TestGorilla alternatives](https://resources.rework.com/tools/recruiting-ats/best-testgorilla-alternatives),
[Capterra – Vervoe](https://www.capterra.com/p/156174/Vervoe/pricing/),
[Stripe – customer balance](https://docs.stripe.com/billing/customer/balance)

## Admin controls (2026-11-23)

- **Plan preview** (company view, bottom left, admins only): switch between unsubscribed and subscribed, pick any
  plan, set AI used this month (slider, 0/50/90%/used up) and bought credit. Every paywall and limit acts as that plan.
  AI requests send the preview to the server (`X-Praxa-Preview`), which refuses them as that plan would once the AI is
  used up, and never charges. Works without Stripe set up.
- **Plan tiers** (admin page → Plans and billing): edit each tier's price, open jobs, candidates per job, seats, AI
  allowance and which features it unlocks. Saved in `settings/plans`; the site follows at once, the server within a
  minute. A price change applies to new subscribers only.
- **Companies: plans and credit** (admin page): for any company, see its plan and AI as Stripe has them, give it a
  plan (the record's `plan`, the higher of that and what it pays for wins), give AI credit (shows to them as "Credit
  from Praxa"), and set this period's AI usage (reset, 50%, used up, or any amount). Credit and usage need Stripe set up.
- Saving tiers and plans needs the Firestore rules for `settings` and `companies` deployed (both are admin-only writes).
