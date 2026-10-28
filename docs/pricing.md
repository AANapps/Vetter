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

## Proposed plans

| Plan | Price | What's included |
|---|---|---|
| Free | £0 | Vetter's library tests on 1 job, a few candidates |
| Pay per job | £49–99 per job | AI-written tests for the job, unlimited candidates for 30 days |
| Monthly | £99–299/month | Several jobs, unlimited AI tests, results tracking and CSV export |
| Enterprise | Custom | Many jobs, custom tests written by the Vetter team, support |

Suggested starting point: first job free, then £79 per job or £149 a month. Adjust once we see how many
jobs a typical employer posts.

## Principles

- Price on hiring value, not AI cost: at £49 a job the AI is about 0.01% of the price. Real costs are
  hosting, support and acquiring customers.
- Position below an agency fee and close to a job ad: "one test replaces CV screening".
- Don't charge per test created; it discourages the feature that sets Vetter apart. Charge per job or per
  month, and cap candidates if needed.
- Keep it free for candidates. The pool of tested candidates is what employers pay for.
