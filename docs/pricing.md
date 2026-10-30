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

These are the plans on the pricing page (`src/components/PricingSection.tsx`), on the business landing page (`src/components/BusinessLanding.tsx`, `/#/business`), which signed-out visitors reach with the Candidates | Business switch.

| Plan | Price | What's included |
|---|---|---|
| Free | £0 | 1 active job, up to 25 candidates, library tests |
| Per job | £79 per job | 1 job for 30 days, unlimited candidates, AI-written tests and simulations, AI marking |
| Growth | £149/month, or £1,490/year | Up to 5 active jobs, 3 seats, CSV export, search the candidate pool |
| Scale | £349/month, or £3,490/year | Unlimited jobs and seats, your branding on tests, priority support |
| Enterprise | Custom | Tests written by the Vetter team, SSO, ATS integration, invoicing |

Annual billing is two months free. Watch how many jobs a typical employer posts: if most post 4 or more, consider
£199 for Growth; if few free employers reach 25 candidates, lower that limit.

## Principles

- Price on hiring value, not AI cost: at £49 a job the AI is about 0.01% of the price. Real costs are
  hosting, support and acquiring customers.
- Position below an agency fee and close to a job ad: "one test replaces CV screening".
- Don't charge per test created; it discourages the feature that sets Vetter apart. Charge per job or per
  month, and cap candidates if needed.
- Keep it free for candidates. The pool of tested candidates is what employers pay for.
