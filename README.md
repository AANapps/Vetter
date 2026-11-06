<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/98dedbef-fe5a-411c-840c-6b5978671b04

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Optionally set `ANTHROPIC_API_KEY` in [.env.local](.env.local) to your Anthropic API key, for the AI test writer
3. Run the app:
   `npm run dev`

## Search engines and AI assistants

`npm run build` writes a static page for every job at `/jobs/<title>-<company>-<id>/`, with Google for Jobs
(`JobPosting`) structured data, plus `/jobs/`, `sitemap.xml`, `robots.txt` and `llms.txt`.

- Set `SITE_URL` (e.g. `SITE_URL=https://vetter.dev` in `.env`) to the address the site is served from; it is used for canonical links and the sitemap.
- The host should serve `index.html` for paths without a file (single-page app fallback), so jobs created in the app open at their address too.
- After deploying, submit `<SITE_URL>/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Running in production and the AI test writer

`npm run build` builds the site and `server.js`; `npm start` serves it (port 3000, or `PORT`). The server also
answers `/api/generate-test`, which companies use to have Vetter suggest tests for a job and write new ones.

- Set `ANTHROPIC_API_KEY` (in `.env.local` or `.env`, or the host's environment). It stays on the server.
- Optionally set `CLAUDE_MODEL` (defaults to `claude-sonnet-5-5`; `claude-opus-5-5` writes stronger questions at about twice the cost, `claude-haiku-5-5` is the cheapest). Each test written logs its token use and cost in the server output.
- Candidates' code, SQL and short answers that the automatic checks don't give full marks are marked again by
  Claude, which gives partial credit for near misses and ignores typos (`/api/grade-answers`; set `GRADING_MODEL`
  to use a different model). It can only raise a score. Without a key, the automatic marks stand.
- The key is optional. Without it, Vetter still suggests library tests and still creates a new test, by
  putting together the best-fitting questions from its own tests. With it, the new test's questions are written fresh.
- `npm run dev` answers the same endpoint, using the same settings.

### Companies paying for AI with credit

Set `STRIPE_SECRET_KEY` (a Stripe secret key: `sk_test_...` to try it, `sk_live_...` for real money) and companies
pay for writing and changing tests with credit they buy in advance. Without it, nothing is charged.

- Each company's balance is the credit on its own Stripe customer (made automatically, found by `metadata.companyId`),
  so only the server can change it. Customers, top-ups and every charge show in the Stripe dashboard.
- Every AI request that writes or changes a test is charged what it really cost in Claude usage, times
  `CREDIT_MARKUP` (default `2`), converted to pence. It needs at least 10p left to start. Browsing the home chat and
  marking candidates' answers are free to the company.
- Companies buy £10, £25 or £50 packs in the test creator (Credit · Top up). Stripe Checkout opens in a new tab so
  their test and conversation stay open; the credit shows as soon as it's paid, and the message that ran out is sent
  again. No webhook is needed: paid sessions are credited when the tab returns, and on any later balance check.
- The Vetter team (admin accounts) is never charged.
- Sign-ins are checked on the server with the Firebase project id (`VITE_FIREBASE_PROJECT_ID`, or `FIREBASE_PROJECT_ID`).
- Set `SITE_URL` so Stripe sends people back to the right address.
- Keep the Anthropic account topped up (turn on auto-reload in the Anthropic Console): companies' credit pays you,
  but every request still runs on Vetter's own Anthropic balance.

## Putting it online (with AI test creation)

The site needs a host that runs `server.js`; static hosts (GitHub Pages, Netlify, AI Studio's preview) can't run
the AI. `render.yaml` sets this up on Render:

1. On render.com, sign in with GitHub, then **New > Blueprint** and pick this repository.
2. When asked, fill in `ANTHROPIC_API_KEY` and `SITE_URL` (the site's address, e.g. `https://vetter.onrender.com`).
3. Deploy. Every push to `main` redeploys.

Any Node host works the same way: build with `npm ci --include=dev && npm run build`, start with `npm start`,
and set the same environment variables.

## Accounts (Firebase)

Without Firebase settings Vetter runs as a demo with a view switcher. With them, people sign up and sign in:

- Candidates use any email and verify it.
- Companies use a work email. The first verified person from a domain creates the company and approves
  colleagues from the same domain. Sign-ups without a work email wait for the Vetter team to approve them.
- Google sign-in works the same way: a work Google account counts as a work email, a personal Gmail one goes to
  review. First-time Google users say whether they're looking for work or hiring.
- Everything real lives in Firestore (`src/lib/cloud.ts`): jobs and who they were sent to, company-made tests,
  applications, candidates' public profiles and results, the feed, follows and notifications. Vetter's test library
  stays in the code. Visitors see real jobs, tests, profiles and companies; the demo's example data and simulated
  activity are only in demo mode.
- Profiles are public (like the leaderboards) but never include email addresses or where someone applied. Companies
  see applications and invitations for their own jobs only.
- `firestore.rules` enforces all of this on the server. `npm run test:rules` checks it (56 cases) against the
  Firebase emulators.

Setup: create a Firebase project, turn on **Authentication > Email/Password** and **Google**, create a **Firestore** database,
add a web app and put its settings in `.env.local` (and on the host) as `VITE_FIREBASE_API_KEY`,
`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID`. Publish the rules and
indexes with `npx firebase deploy --only firestore --project <project-id>`. With Firebase set, `npm run build` writes
the job pages from the jobs in Firestore.
Add the site's domain under **Authentication > Settings > Authorised domains**. To make someone part of the Vetter
team, set `role` to `admin` (and `status` to `active`) on their document in the `users` collection. The Vetter team signs in
at `/admin` for the admin panel (companies to check, course sign-ups); a non-admin who signs in there sees what their record
says instead.

