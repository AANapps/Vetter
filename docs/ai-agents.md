# AI agents: threat and plan (2026-11-23)

## Is Granyt at risk?
- **Easy for agents to copy:** writing a test ("10 SQL questions for a mid DA"), basic AI marking, simple one-off job sims. If Granyt is sold as "AI makes your hiring test", it loses: that becomes free inside ChatGPT, Claude and every ATS.
- **Hard to copy (the moat):**
  1. Anti-cheat / proctoring: proof a human did it alone.
  2. Calibrated scores: many candidates on the same library tests make score + rank comparable.
  3. Candidate network: profiles whose skills come only from tests; companies come for pre-tested talent.
  4. Proven library tests and apps, improved by real attempts.
  5. Workflow: hiring pipeline, Teams, Training, plans.

## Protect it
- Pitch "verified, comparable, cheat-resistant skill scores + candidates who already have them". AI building is a convenience, not the product.
- Anti-cheat first (see the anti-cheat roadmap): server-side checks, AI-use detection, an integrity report per attempt.
- Push library tests over custom ones so benchmark data builds up; show companies percentiles/benchmarks.
- Grow the candidate pool.
- Be callable by agents (below) so they become a channel, not a competitor.
- Price on outcomes (per verified candidate / hire / job pass), not per test generated.

## When agents build vs use Granyt
- "Make me a test" → the agent writes it itself.
- "Prove this candidate can do SQL" / "shortlist 5 tested analysts" → needs trust + comparison + a talent pool the agent can't make. Be the "Stripe of skill verification".
- Agents don't discover tools on their own: a person connects Granyt once, then their agent uses it every time. Still a sale to companies; the pitch adds "works with your AI agent".
- Risk: a big player (LinkedIn, an ATS, an AI lab) builds verified assessments. Defence: speed + candidate pool.

## How to get agents connected (in order)
1. **Build the connector.** Remote MCP server (e.g. `/mcp`, a Vercel API route) with OAuth so the agent acts as the signed-in company (plan, credit, candidates). Tools:
   - `find_test(role, level)`: library tests and benchmarks
   - `send_assessment(candidate_email, test_id)`
   - `get_result(attempt_id)`: score, rank, percentile, integrity report
   - `search_candidates(role, min_score)`
   Clear tool descriptions, e.g. "Use when a hiring decision needs a verified, cheat-checked skill score". Each result carries "Verified by Granyt".
2. **One-click connect.** "Connect your AI" page in company settings: MCP URL + 3-step guides for Claude (Settings → Connectors → Add custom connector), ChatGPT, Copilot. "Add to Claude / ChatGPT" buttons where companies send tests.
3. **Registries (quick, free):** official MCP Registry, Smithery, Glama, mcp.so. Add the API/MCP URL to `llms.txt`; publish an OpenAPI spec.
4. **Directories:** Anthropic Claude connectors directory; OpenAI ChatGPT apps directory (Apps SDK, MCP-based).
5. **ATS partner marketplaces (slowest, biggest payoff):** Greenhouse, Workable, Lever, Ashby assessment partners.
6. **Spread it:** tell existing companies; content like "how to verify candidates with Claude"; candidates share Granyt profile links on applications so companies' agents call `get_result`.

Pricing for agents: a few free verifications, then pay per verified result.

First step: a small read-only MCP server (`find_test`, `get_result`) on top of what exists.
