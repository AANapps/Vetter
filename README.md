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
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
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

- Set `GEMINI_API_KEY` (in `.env.local` or `.env`, or the host's environment). It stays on the server.
- Optionally set `GEMINI_MODEL` (defaults to `gemini-2.5-flash`).
- The key is optional. Without it, Vetter still suggests library tests and still creates a new test, by
  putting together the best-fitting questions from its own tests. With it, the new test's questions are written fresh.
- `npm run dev` answers the same endpoint, using the same settings.
