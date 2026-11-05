# Pricing

Draft, October 2026. Competitor figures are rough and need checking against current price lists before launch.

## What a test costs us to make

AI test creation calls Claude once per new test: about 3,000 tokens in and 4,000–9,000 out. Suggesting
existing tests from the library is free (Vetter matches them itself).

| Model | Price per 1M tokens (in / out) | Per test | Per 100 tests | Per 1,000 tests |
|---|---|---|---|---|
| **Claude Haiku 5.5** (default) | $0.10 / $0.50 | ~$0.002–0.005 | ~$0.20–0.50 | ~$2–5 |
| Claude Sonnet 5.5 | $2 / $10 | ~$0.05–0.10 | ~$5–10 | ~$50–100 |
| Claude Opus 5.5 | $4 / $20 | ~$0.10–0.20 | ~$10–20 | ~$100–200 |

These are estimates; the server logs the real tokens and cost of every test it writes. Measured on Haiku: $0.001 for a
5-question test, $0.003 for a 6-question senior test with coding.

> Out of date (November 2026): tests are now planned, written section by section and given working app simulations,
> on Sonnet by default, so a full test costs far more than this table says. See "AI credit and plans" below.

AI marking (a second look at code, SQL and short answers that weren't fully right) costs about $0.0002–0.0005 per
candidate on Haiku, so 1,000 candidates is roughly 20–50p.

## What employers pay elsewhere

| Alternative | Typical price |
|---|---|
| Skills-test platforms (TestGorilla, HackerRank, Codility and similar) | ~£60–400 a month, or several hundred to thousands a year |
| Per-candidate assessment providers | ~£5–40 per candidate |
| Job ads (Indeed, Seek and similar) | ~£100–400+ per job |
| Recruitment agencies | 15–25% of first-year salary (£5k–15k for a typical hire) |

## Plans

These are the plans on the pricing page (`src/components/PricingSection.tsx`), on the Hiring side of the home page (`src/components/BusinessLanding.tsx`, `/#/business`), which visitors reach with the Looking for work | Hiring switch.

| Plan | Price | What's included |
|---|---|---|
| Free | £0 | 1 active job, up to 25 candidates, library tests |
| Per job | £79 per job | 1 job for 30 days, unlimited candidates, AI-written tests and simulations, AI marking |
| Growth | £149/month, or £1,490/year | Up to 5 active jobs, 3 seats, CSV export, search the candidate pool |
| Scale | £349/month, or £3,490/year | Unlimited jobs and seats, your branding on tests, priority support |
| Enterprise | Custom | Tests written by the Vetter team, SSO, ATS integration, invoicing |

Annual billing is two months free. Watch how many jobs a typical employer posts: if most post 4 or more, consider
£199 for Growth; if few free employers reach 25 candidates, lower that limit.

## AI credit and plans (November 2026)

Companies now pay for AI test writing from prepaid credit (Stripe), charged at real Claude cost × `CREDIT_MARKUP`
(see the README). The question: a monthly plan plus paid credit on top, is that viable?

**It's viable, and the numbers are comfortable.** At cost, on Sonnet, a full test with app simulations is roughly
£0.60–£2, and a change is pennies. Estimates, to check against real usage in Stripe:

| Plan | Price | 20 full tests a month costs us |
|---|---|---|
| Per job | £79 per job | (2–5 tests per job) ~£2–£8 |
| Growth | £149/mo | ~£12–£40 |
| Scale | £349/mo | heavy users maybe £50–£100 |

The subscription alone covers normal AI use with a big margin. Credits matter mainly as a cap on heavy users (someone
rebuilding app simulations all day), so one company can't cost more than it pays.

**The problem is how it looks.** The pricing page sells "AI-written tests and simulations" as part of every paid plan.
A company paying £149/month that then has to buy credit before its first AI test will feel charged twice. That loses
customers or causes complaints.

**What the code does today** (as of commit a49b301): the credit system doesn't look at the plan. Once Stripe is
on, every company pays from credit, Growth and Scale included. The free plan also has AI switched on for now
(`AI_TESTS_FOR_ALL = true` in `src/App.tsx`).

**Recommendation: an AI allowance in every plan, top-ups only beyond it.**

| Plan | Included AI credit | Roughly |
|---|---|---|
| Free | £2 once (a trial) | 1–2 tests |
| Per job | £10 per job | 5–10 tests or lots of changes |
| Growth | £25 a month | 15–30 tests a month |
| Scale | £60 a month | 40+ tests a month |

- The allowance resets each month (or job) and doesn't roll over; bought credit is used after it and never expires.
- The pricing page says something like "Includes £25 of AI test writing each month · top up any time".
- The subscription still feels like it includes AI, most companies never pay extra, and heavy users pay for what they use.

**Limits:**
- Plans aren't paid online yet (the Vetter team switches them on), so the allowance would follow whatever plan is set on
  the company.
- The amounts above are suggestions; set them from real usage in the Stripe dashboard.
- The server would read the company's plan from its company record on each request, alongside the sign-in check it
  already does.

Not built yet.

## When Vetter asks a company to buy credit (November 2026)

Every check runs off one number: the credit on the company's Stripe customer.

**What happens now:**

1. **Before writing a new test.** Once question types, number of questions and difficulty are picked, the chat shows an
   estimate ("about £1.95 to £4.15"). If the balance is below the top of that range it adds "you have £1.20, so it may
   stop part way: top up first".
2. **In the header, all the time.** The test creator shows "Credit £8.40 · Top up", refreshed after every reply, amber
   under £1.
3. **On the server, before every AI request.** Under 10p left, the request is refused before anything is spent on
   Claude. The chat says "You've used up your AI credit. Top up to carry on…" with a Top up and carry on button; after
   paying, the same message is sent again automatically.

**The gaps:**

- **A build can run out part way.** A new test is many requests in a row (planning, each section, each app), each
  checked on its own. If credit runs out in the middle, later sections are refused and the test comes back short with a
  note that some questions were left out. The warning in step 1 tries to prevent this, but nothing enforces it.
- **App changes get no warning.** Changing an app costs about 30p to 80p, with no estimate before sending.
- **Nothing reaches them outside the test creator.** No email or alert on the company home page when credit runs low.

**How to close them:**

1. **Hold the estimate before a build starts.** The server checks the balance covers the top of the estimate before
   writing a test; if not, the chat asks them to top up before anything is spent, so there are no half-built tests. They're
   still charged the real cost afterwards, not the estimate.
2. **Low-balance warnings.** A banner on the company home page when credit falls below a set amount (e.g. £3, about one
   full test). An email at the same point needs an email service, which the server doesn't have yet.
3. **Monthly allowance.** With the allowance above, the same checks apply, saying "Your included £25 for November is
   used up" before offering a top-up.

Recommended first: 1 and the banner from 2. Not built yet.

## Principles

- Price on hiring value, not AI cost: at £49 a job the AI is about 0.01% of the price. Real costs are
  hosting, support and acquiring customers.
- Position below an agency fee and close to a job ad: "one test replaces CV screening".
- Don't charge per test created; it discourages the feature that sets Vetter apart. Charge per job or per
  month, and cap candidates if needed.
- Keep it free for candidates. The pool of tested candidates is what employers pay for.
