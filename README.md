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
- Optionally set `CLAUDE_MODEL` (defaults to `claude-haiku-5-5`, the cheapest; `claude-sonnet-5-5` or `claude-opus-5-5` write stronger questions). Each test written logs its token use and cost in the server output.
- Candidates' code, SQL and short answers that the automatic checks don't give full marks are marked again by
  Claude, which gives partial credit for near misses and ignores typos (`/api/grade-answers`; set `GRADING_MODEL`
  to use a different model). It can only raise a score. Without a key, the automatic marks stand.
- The key is optional. Without it, Vetter still suggests library tests and still creates a new test, by
  putting together the best-fitting questions from its own tests. With it, the new test's questions are written fresh.
- `npm run dev` answers the same endpoint, using the same settings.

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
- `firestore.rules` enforces all of this on the server. `npm run test:rules` checks it against the Firebase
  emulators.

Setup: create a Firebase project, turn on **Authentication > Email/Password**, create a **Firestore** database,
add a web app and put its settings in `.env.local` (and on the host) as `VITE_FIREBASE_API_KEY`,
`VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` and `VITE_FIREBASE_APP_ID`. Publish the rules with
`npx firebase deploy --only firestore:rules --project <project-id>` (or paste `firestore.rules` into the console).
Add the site's domain under **Authentication > Settings > Authorised domains**. To make someone part of the Vetter
team, set `role` to `admin` on their document in the `users` collection.

