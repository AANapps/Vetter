# Praxa to-do list

Kept up to date as work is asked for and finished. Newest items at the bottom of each section.

## To do
- **Bug: menu opens white blank pages** (reported 2026-11-18). Clicking items in the company menu sometimes shows a blank white page. Not reproduced yet: find which items and whether it's the live site (Firebase on), then fix.
- **Board permissions (Projects & CRM).** Each board gets who can see and edit it: everyone in the company and on the team by default, or invite only (pick people). Today the company's staff see every board and team members see nothing but tasks they own.

- **Team projects and CRM (Project Manager → Projects & CRM).** Deploy the Firestore rules (`projects`, `projectTasks`, and `teamMembers` now taking `pendingTests`): `firebase deploy --only firestore:rules`. Ask AI (`/api/crm-assistant`) needs credit on the Anthropic account: the key in `.env.local` returned "credit balance is too low" on 2026-11-18. Then show people on a team the project tasks they own in Work mode. Overdue automations only run when someone opens the board; run them on a schedule on the server if they need to happen on time. monday CRM features not built yet: sending and receiving real emails from items (Gmail/Outlook sync), lead capture web forms, email sequences, quotes and invoices, duplicate merging, mass email, subitems, files on items, mirror columns, and automations that notify people.

- **Try AI formula columns live** (2026-11-18). A formula column's "Describe what this column should show" writes the formula with AI (`/api/write-formula`, server/writeFormula.ts, billed); untested against the real AI because the Anthropic credit was out. Check it picks the right columns and how often the fix round is needed.

- **App library: try it live** (built 2026-11-18, see docs/app-library-plan.md). Top up the Anthropic credit, then build an app task and a job simulation that use a help desk (both should build on Deskly), and one whose software isn't in the library (Praxa should build it data-free and send it for review). Check that edits apply, how often the fix round is needed, and the admin Versions list. Push Deskly to Firestore (`npm run apps -- push deskly` after a Firebase `--reauth`, or Add to library in admin). Later, make repo apps load only when needed once there are many.

- **Apps by reference: deploy the rule** (2026-11-20). Tests now store a library app as `{ libraryApp, appData }` with no code when the page is that version unchanged (src/lib/appRefs.ts). Praxa's own apps (Deskly) load from the site's bundle and work now. Apps that are only in Firestore need the `environmentVersions` rule (candidates read data-driven versions): `firebase deploy --only firestore:rules`. Until then those tests keep their whole page, as before.

- **Live training bookings (company Training page)**: deploy the `trainingBookings` Firestore rule; build the Praxa-admin side to confirm a booking, set the tutor and dates, and mark it done (today only the data and rules allow it); recruit tutors; email the company when a booking changes. Prices (src/data/trainingCatalogue.ts) were set against UK live-online providers in Nov 2026: review yearly.

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
- **Try the modern-look rules live** (2026-11-15: only the needed screens, 1:1 colours and layout, no browser-default styling, under 45KB, plus an automatic check for dated styling). Untested with the AI because the Anthropic credit ran out.
- **Data Analyst: Fundamentals in question sets.** The tool modules ask their answer questions in structured sets (daSets.ts) before the tasks; Fundamentals still asks pooled quick questions.
- **Deploy the Firestore rule for settings/library** (Admin panel > Library visibility): until then hiding categories, roles and tests can't be saved. The panel lists the built-in library only; tests the Praxa team made in the app could be added to it.
- **Growing apps and the time limit.** Each test rewrites the whole app page, which grows with every version (allowed up to 90KB). Writing ~90KB takes close to Vercel's 300s limit. Once apps get that big, either build in a background worker or split the app into modules (one per screen) that a test can include or leave out.
- **Environment library privacy.** A saved simulation holds the data of the test it was made for (the hiring company's scenario). Other companies can't open it in the library, but their builds read it to build on (the AI is told to replace all of it). Decide whether that's fine or whether pages should be cleaned of company data when saved.

- **Customer Support next steps.** Only Triage & SLAs was chosen for now; written replies, complaints and troubleshooting modules are possible later. Then review Data Analyst.
- **New site address.** Code still defaults to vetter.dev (vite.config.ts, server/credits.ts) until Praxa's domain is known.

- **Try the five-part job simulations live.** Data Analyst, Customer Support, Software Developer and Frontend now run as Briefing, Core task, Curveball, Juggling and judgement, Report back (40 min, src/data/modules/jobSimKit.ts). Not clicked through in a browser yet: check the part timers, the emails that land mid-day, and that 40 minutes is enough. The other Tech roles' job simulations must be built with jobSimulation() too.

## Platform review (2026-11-21)
From a code read-through of both flows (not clicked through live).

**Fix first (trust in results)**
- The 5 sample candidates are mixed in with real ones live: label them or remove them.
- The test AI chat (task assistant) has no login and Praxa pays: require sign-in and set a limit.
- Anthropic credit out (since 2026-11-18).

**Candidate side**

**Company side**
- Home chat has too many starter buttons: cut to about 3 main actions.
- Candidates page vs each job's candidates: make clear which is everyone and which is one job's pipeline.
- Job sim save question: default to hiring, library as an option.
- "Project Manager" holds Team and Training: rename the group (e.g. "Your team").
- Projects & CRM pulls focus from hiring: hide behind a setting for now.
- Pipeline stages capitalised inconsistently ("Offer Extended" vs "Screening").
- Show the credit cost before Build.
- Builder chat answers either plainly or with "OK: …" + Build: always show a clear "Apply changes" step.

**Speed and cost**
- Test builds with simulations take ~5 min, near Vercel's 300s limit: build in the background with progress.
- Stop only cancels in the browser (already listed above).
- Board overdue automations only run when the board is opened: schedule them.
- App pages up to ~90KB rewritten each time: one module per screen.
- Job sim app edits lost when the day is rewritten: keep them or warn.

**Not tested live yet:** Stripe credits, CV import, AI-made job sims, full-screen rules, code runner.

## Done

- 2026-11-22: No pass marks, "verified" or medals: candidates and companies see the score (and rank) on every test. Job pass marks and per-skill minimums are gone (finishing a job's required tests sends the application with the score); companies see every try's score; the percentile is gone. Training keeps its pass mark for certificates. Not clicked through in a browser yet.
- 2026-11-22: Fit for a job is only the average of the candidate's scores on that job's tests (a test not taken counts 0, attempt limits respected). No fit is shown until they've taken one of the job's tests; jobs without tests have no fit.
- 2026-11-22: Candidate flow: Tests is the catalogue (no progress ring or Up next; Home has those), Work mode card on Home for team members, Ranked in the main menu, Career switch and Upskill merged into one Courses page with a switch, a bell notification when finishing a job's tests sends the application, leaving full screen gives a 10-second warning the first 2 times before it's recorded, and Google sign-up asks for the job after. Not clicked through in a browser yet.
- 2026-11-22: Job simulation practice (src/data/practiceSim.ts): a job simulation's start screen offers a 3-minute practice on the same desktop (Mail, Spreadsheet, Files; two timed parts, an email landing in the second), full screen, not scored or saved, no attempt used, no AI marking. Not clicked through in a browser yet.
- 2026-11-22: Admins try tests instantly: in the app any test an admin starts runs straight in (no intro, signing, countdown, full screen, retake gap or saving). /admin has a Test lab: run any test or job simulation, open the desktop with every app (built-in ones filled from the job sims, library apps with sample data) or start on one app, open a job sim's own desktop untimed, open each library app alone, and the job sim practice.

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
- 2026-11-17: Every Praxa job simulation follows one 40-minute shape on the desktop: Briefing (2 min, not marked), Core task (12), Curveball (6), Juggling and judgement (10), Report back (7), plus 3 min buffer. Each part's brief shows at the top of the desktop with its clock, and its emails land as it starts. Data pre-loaded, at most 3 environments, the report marked on the planted issue too. The question sets before the desktop were removed.
- **Try an AI-made job simulation live.** Since 2026-11-17 the home chat plans a job simulation as the five parts and Build writes the desktop day in two requests (`/api/write-job-sim`, stage world then script; server/writeJobSim.ts), checked in src/lib/jobSimBuild.ts and sent back once to fix. Never run against the real AI yet: check each request finishes inside Vercel's 300s (raise maxDuration once on Vercel Pro; JOB_SIM_MODEL can pick a faster model), how often the fix round is needed, and that the day really uses the job description. It can't build a custom app (a CRM, a help desk) on the desktop yet: only Spreadsheet, Browser pages, Database and Code.
- **Full screen during tests: try it in browsers.** Tests now go full screen on Begin; leaving it is counted and timed in the integrity report and covers the test until the candidate goes back. Not available on iPhone (the browser doesn't allow it), so there it's not asked for. Pressing Escape always leaves full screen in the browser, so candidates who press it by habit are flagged too: watch whether that's noisy.
- **Try CV import live.** Candidates can fill their profile from a CV (PDF up to 3MB, or pasted CV/LinkedIn text) via `/api/read-cv` (server/readCv.ts, Haiku by default, `CV_MODEL` to change). Praxa pays; signed-in only, 8 an hour per person, counted in memory on each server instance (so not a hard limit on Vercel). Not run against the real AI yet. Word files aren't read: candidates are told to save as PDF or paste.

## Candidate's target role (2026-11-17)
- Sign-up now asks "What job are you after?" and saves it on the profile as `targetRole` (src/lib/signUpRole.ts → App). Home's Start here, the profile path and the Tests page already start from it.
- Still to do: rank the Discover feed by it (results, jobs and posts for that role first, src/lib/feed.ts `buildFeed`), and pin its field first in Explore by field (FieldSlider).
- Google sign-up: a new candidate who didn't pick a job first is asked for it straight after (2026-11-22).
