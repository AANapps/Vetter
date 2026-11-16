# Praxa to-do list

Kept up to date as work is asked for and finished. Newest items at the bottom of each section.

## To do

- **Skills games, one at a time.** Build the skills games (attention to detail, verbal reasoning, numerical reasoning, logical reasoning, memory, multitasking) one by one, each tried and agreed before the next. The first six made together were removed on 2026-11-12. The library already supports them: category `Aptitude`, shown in every sector under "Skills games" (role "Any role"), and suggested by `/api/suggest-tests` when a job needs those abilities. The removed code is in git history (commit 9271ef1, `src/data/skillsGames.ts`) to start from.
- **Sector library tests.** The Praxa team makes the app-simulation tests for roles outside tech (trades, healthcare, hospitality, retail) and puts them in the library.
- **Block AI app simulations on the server** for companies outside tech (today only the app hides them).
- **Stop button: cancel on the server too.** Stop cancels the chat's requests in the browser, but a step already running on the server still finishes (and may be charged).
- **Credit meter.** Decide whether to show "x% used", put it on every page, and warn or block before a build that would run out the credit. Billing needs `STRIPE_SECRET_KEY` to go live.
- **Templates for AI simulations** (desk engines such as a virtual desktop, full inbox, records system; an instrument kit for hands-on roles) to cut AI cost and build time. Discussed, not started. The UI kit (server/appKit.ts) is the first piece.
- **Simulation build time.** Each app page is now designed (~110s) then written (~175s), so a test with simulations takes about 5 minutes for its pages. If writing gets close to Vercel's 300s limit, split the write too or move it to a background worker.

- **Opus for simulations.** Use Opus 5.5 for the design pass now, and for page writing once builds run in the background (Opus can pass the 300s limit). Fable 5.2 is the most capable but twice Opus's price and slower.

- **Turn on the code runner.** Set `JUDGE0_KEY` (RapidAPI Judge0 CE) or `JUDGE0_URL` on Vercel so coding tasks in languages other than JavaScript and Python can run. Decide RapidAPI (pay per run) or a self-hosted Judge0 server.
- **Deploy the Firestore rules** for the environment library (`environments`, `environmentPages`, `environmentSubmissions`, `submissionPages`): `firebase deploy --only firestore:rules`. Until then nothing reaches the review queue and every simulation is designed from scratch.
- **Building on saved apps is off** (`BUILD_ON_LIBRARY` in src/lib/testChat.ts). Every simulation is built from scratch for now, but still goes to the review queue. To turn it back on, the builder must return only its changes (new screens and code, the test's data) instead of rewriting the app: the first extension of a 15-feature Meta Ads page ran past the 64,000-token output limit.
- **Try the modern-look rules live** (2026-11-15: only the needed screens, 1:1 colours and layout, no browser-default styling, under 45KB, plus an automatic check for dated styling). Untested with the AI because the Anthropic credit ran out.
- **Power BI and Tableau practical tasks for Data Analyst.** Their tests (`test-da-powerbi`, `test-da-tableau`) are tool questions only: no environment exists to do Power BI or Tableau work. They need hand-built simulations (like Deskly), e.g. a report canvas with fields, visuals, filters and a measure editor, so each can have four practical tasks beside four answer questions like the other Data Analyst modules (src/data/modules/daModules.ts).
- **Growing apps and the time limit.** Each test rewrites the whole app page, which grows with every version (allowed up to 90KB). Writing ~90KB takes close to Vercel's 300s limit. Once apps get that big, either build in a background worker or split the app into modules (one per screen) that a test can include or leave out.
- **Environment library privacy.** A saved simulation holds the data of the test it was made for (the hiring company's scenario). Other companies can't open it in the library, but their builds read it to build on (the AI is told to replace all of it). Decide whether that's fine or whether pages should be cleaned of company data when saved.

- **Customer Support next steps.** Only Triage & SLAs was chosen for now; written replies, complaints and troubleshooting modules are possible later. Then review Data Analyst.
- **New site address.** Code still defaults to vetter.dev (vite.config.ts, server/credits.ts) until Praxa's domain is known.

## Done

- 2026-11-12: Tests fit the job (no spreadsheets for trades/clinical), drawings labelled.
- 2026-11-12: Library tests suggested when a job is posted, not while making a test.
- 2026-11-12: Trades, Hospitality and Retail categories; a company sees only its sector's tests.
- 2026-11-12: Stop button in the test chat.
- 2026-11-12: Companies outside tech have their AI write questions only (no app simulations).
- 2026-11-12: Tests are built and changed in the home chat (progress checklist, title, description, "Questions x to y" outline, See test), with Stop.
- 2026-11-13: Home chat lists the whole plan (every question, its type and what it tests) before building; messages change the plan, Build writes it with the building animation and checklist, and Preview opens the finished test in a pop-up.
- 2026-11-13: Back to a separate AI test builder: the home chat plans the questions, Build in AI test builder opens the pop-up (renamed, builder layout) which builds that plan, previews, edits and saves; Edit with AI opens it too.
- 2026-11-13: A design pass at high effort before each simulation page is written, describing the real product's look in detail. (A shared UI kit was tried the same day and dropped from the prompts: pages came out generic. It stays loaded only for pages built with it.) Every page defaults to a modern font, and the AI must use a modern UI typeface.
- 2026-11-15: Code editor for any language (35, or the candidate's pick); JavaScript and Python run in the browser, the rest on Judge0. Environment library: every simulation built is saved and reused for later tests of the same kind of product.
- 2026-11-15: Simulation library with review: one simulation per app, every build sent to the Praxa team for approval (admin panel), approved builds become the app's next version, later tests build on the latest version and add features. Praxa can build apps for the library; stale versions can be merged onto the latest.
- 2026-11-15: Vetter renamed Praxa. Customer Support Agent role: Ticket Triage & SLAs module (Junior, Mid-level, Senior; hands-on help desk queues from Mid-level) and the Bloomvale job simulation, on a hand-built modern help desk (Deskly).
