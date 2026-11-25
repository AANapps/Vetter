# Praxa to-do list

Kept up to date as work is asked for and finished. Newest items at the bottom of each section.

## Launch to-do list (agreed 2026-11-24)

The user confirmed on 2026-11-24 that the Firestore rules are deployed (latest) and the Anthropic credit is topped up: older notes below saying "deploy the rules" or "credit out" are out of date. The user chose to set aside for now: the 5 sample candidates, test answers being public (anti-cheat step 1) and similar trust items.

**Done 2026-11-24**
- The test AI assistant (`/api/task-assistant`) needs sign-in and is limited to 120 messages an hour per person (in memory per server instance).
- Scale plan "Your branding on tests": the hiring company's name and logo on the test start screen and header for its job's candidates (no brand colour: that would need a new field in the companies rule).
- SEO/AI pages: resources articles, test library pages, pricing, About, llms.txt, llms-full.txt, robots.txt, sitemap (seoPages.ts, src/data/articles.ts).

**Done 2026-11-25 (pre-launch checklist)**
- Candidates: pick a role on the visitor home (Data Analyst, Customer Support) and start straight away; any library test can be taken signed out (not ones with the AI assistant or server code runner); the score shows after sign-up and goes on the new profile (src/lib/guestResult.ts).
- Companies: paste a job ad on the home chat; Data Analyst and Customer Support ads open the job with Praxa's ready tests (no AI), Post, then the link (src/lib/jobAdClassifier.ts). Sales and Customer Success are recognised but go to the chat until they have tests.
- Outcome tracking: 30/90-day check-ins on the company home after a Hired move (Lead.checkIns, src/lib/outcomes.ts); Praxa admin home shows fit of good vs poor hires. **Deploy the leads rule** (checkIns added).
- Work-based interview questions in a candidate's answers (src/lib/interviewQuestions.ts).
- People directory app on sim desktops; colleagues acknowledge unscripted emails within seconds (ack: replies).
- Curveball library for AI job sims (server/curveballs.ts).
- Builder and plan dialog now open above previews.

**Left off the checklist on purpose (until 5–10 customers):** API/MCP connector, public pool changes, people CRM (beyond the 30/90 check-ins), per-employee pricing for training/CRM (both hidden in beta), new roles. Blueprint-first rewrite of AI generation: not done; the "text too large" error was already fixed (two-step world/script + grammar fallback), sheet answers are computed by code, and launch roles use ready library sims, so AI generation isn't on the launch path.
- Not clicked through live yet: guest test → sign-up → score, job-ad flow, check-ins, People app.

**To do before selling**
- Payments: finish the live test (cancel on `checkout-test-1`), decide VAT (Stripe Tax), then switch Stripe to `sk_live_`.
- Enforce plan limits (jobs, candidates per job, seats) on the server, not only in the browser.
- Click through live as a candidate and a company: the five-part job simulations, the new Excel test, Open their desktop, full screen, AI on/off per job, branding.
- Try the AI builders with the real AI: a skills test with a work-apps task, an AI-made job simulation, guided training.
- The "menu opens blank pages" bug (not reproduced yet).
- Privacy policy, terms of service and candidate-data terms (need legal review), and a proper domain.
- Run a free pilot with 3 to 5 companies hiring now, then start charging.

**SEO and AI recommendations: the user's part**
1. Set `SITE_URL` in Vercel once the domain is live (until then pages point to the Vercel address).
2. Add the site to Google Search Console and Bing Webmaster Tools and submit `/sitemap.xml`.
3. Get mentioned elsewhere: honest reviews on G2/Capterra, "best skills assessment tools" lists, HR/recruitment press, the Claude and ChatGPT directories (needs the connector), all using the same description: "Praxa is a job simulation and skills testing platform for hiring…".
4. Publish original data once there are real results (e.g. what many support simulations showed), never invented figures.

## To do
- **Anti-cheat step 1: hide answers and mark on the server (fix first; confirmed live 2026-11-23).** A public request with no sign-in downloads any test with its answers (`correctOption(s)`, `expectedOutput`, `testCases`, `solutionCode`), because `tests` has `allow read: if true` and marking runs in the browser (`src/lib/grading.ts`). Candidates also write their own scores to their profile. Fix: split each test into questions (public) and an answer key only the server reads; mark every attempt on the server and save results from there; move existing tests' answers once; then simulation checks. Blocked on a server identity: a Firebase service account key (blocked by an org policy) or Option B, a keyless server login (a Firebase Auth user whose email and password go in Vercel as `VETTER_SERVER_EMAIL` / `VETTER_SERVER_PASSWORD`). Must come before the Claude/ChatGPT connector.
- **Guided training: try it with the real AI (built 2026-11-23).** Ask the home chat for training (e.g. "train my support team on Zendesk refunds"): the training builder plans lessons and steps, builds the app (library app when there is one), Try it, Save to Training. Check the app marks each step's control with data-ref and that steps tick off. The app goes to the admin app-library review queue (owner "<company> (training)"). Old AI-written trainings (made as tests, before this) still run as tests.
- **Payments: finish the live test (paused 2026-11-23, see docs/payments.md "Test run 2026-11-23").** Done: rules deployed, Stripe test key in `.env.local`, customer portal on, 16/16 automatic checks (`scripts/stripe-check.ts`), real Checkout for Starter, job pass and £10 top-up all correct, two credit bugs fixed, Plan and billing added to the company name menu. Next: (1) cancel in the billing portal on test company `checkout-test-1` (not registered yet: `status` still shows cancelsAtEnd false), (2) ~~confirm Vercel vars~~ done 2026-11-23 (key re-saved and redeployed; https://vetter-three.vercel.app/api/billing answers 401 sign-in, so Stripe is on), (3) ~~live-site run~~ done 2026-11-23: Starter paid and cancelled on vetter-three.vercel.app with a non-admin company (needed the server's Firebase project id fix). Was: name menu → Plan and billing → Starter (4242…), lands back on Praxa on Starter, Manage billing → cancel. Then switch to `sk_live_`. Still to decide: branding on tests for Scale (sold, not built), VAT (Stripe Tax). Later, with the Firebase admin key: enforce job/applicant/seat limits on the server too.
- **Free CRM with a Claude/ChatGPT connector, paid dashboards and AI (agreed 2026-11-23, not built).** Plan in `docs/pricing.md` "Free CRM, paid dashboards and AI". Needs first: Firebase admin key, workspaces finished, OAuth sign-in for the connector, privacy policy update. Then: read-only connector, write tools with a 30-day bin, saved dashboards drawn from a description, weekly summaries on a schedule, "Hire for this" from boards. Set the free caps.
- **Workspaces manager (workspaces in beta since 2026-11-22).** Projects & CRM and candidates' Work mode on the company's boards are hidden from everyone but the Praxa team (`WORKSPACES_OPEN` in src/lib/features.ts). Companies keep Your team (Team, Training); candidates reach their team's invitations, work, training and certificates from Home (the team page, no boards). Build a workspaces manager, then set the flag to true.
- **Deploy the Firestore rules (2026-11-22).** Team members' access to their company's boards (Work mode) needs `firebase deploy --only firestore:rules --project vetter-7b06f`; the CLI here needs `firebase login --reauth` first.
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

- **AI agents: connect Praxa (planned 2026-11-23, see docs/ai-agents.md).** Build a remote MCP server with OAuth (`find_test`, `send_assessment`, `get_result`, `search_candidates`), a "Connect your AI" page, then list it in MCP registries, the Claude and ChatGPT directories and ATS partner marketplaces. Start read-only: `find_test` + `get_result`.

- **Sims-only tests (started 2026-11-24).** User: every test should be mostly simulation; questions live inside the sim tasks. Excel for Data Analysis is done (src/data/modules/excelSims.ts: 4 workbook tasks, 20 min, covering the user's 10 Excel subjects; verified every check passes on solved work and fails at start). The spreadsheet gained Tables, filters, Flash Fill, charts, slicers, conditional formatting, FILTER/UNIQUE/SORT with spills, SUBTOTAL, Power Query (src/lib/powerQuery.ts, src/components/PowerQueryEditor.tsx) and PRAXA.* marking functions. Not yet clicked through as a candidate on the live site. Next: user to approve the researched core-subject lists for SQL, Python, Power BI, Tableau, Cleaning, Importing, Reporting, Metrics (and Fundamentals), then build each the same way; then every other role.
- **Desktop work apps: next steps (built 2026-11-24).** Built-in apps on the desktop (src/lib/deskApps.ts, src/lib/deskData.ts, src/components/desk/): Chat, Help desk, CRM, Docs, BI, Forms, Calendar, Knowledge base, Projects (monday/Jira), Files; data moves between them as CSV/TSV/HTML tables. Done since: skills-test tasks (spreadsheet, database, app simulation, code, SQL) run on the desktop (src/lib/taskDesktop.ts); library/AI apps read and save Files (praxa.files, praxa.saveFile; Deskly has Export CSV); the AI job-sim writer can use the built-in apps (`work` JSON, new check kinds, validated in jobSimBuild.ts; untested with the real AI); a company's own new apps are reusable by them while waiting for review (sub:<id> in reusableApps). The skills-test builder writes "desktop" tasks on the built-in apps too (type desktop: `work` JSON + CSV files + checks, validated by desktopTask() in jobSimBuild.ts; untested with the real AI). Still to do: (1) try a skills test with a desktop task on the real AI; (2) done 2026-11-24: "Open their desktop" in a candidate's answers (job's Candidates → answers) replays any desktop question read-only (no clock, AI chat shown not callable); desktop answers now kept whole up to 600k chars (older ones cut at 20k can't open); not yet clicked through on the live site; (3) Chat colleagues answer by rule only; (4) new apps join the whole library only after an admin approves them (auto-publishing needs the server key).

## Later: tests for an AI-first workplace (parked 2026-11-25)
Keep the current test structure for now. Come back to this as AI use at work grows: job sims and skills tests will change.
- Test judgement, not the tool: "is this output right, how do you know, what do you do", with any tool (AI included) allowed.
- Planted AI/colleague mistakes in sims (e.g. a merge that silently drops customers); score catching it and what was checked.
- Deliberately ambiguous briefs: score asking the right person (People app) vs guessing.
- Clashing demands under a deadline: score the decision and its justification.
- Telemetry (what they opened, checked, asked the AI, in order) as Praxa's own data; needs server marking first.
- Senior-first: fewer question sets, longer sims.

## Platform review (2026-11-21)
From a code read-through of both flows (not clicked through live).

**Fix first (trust in results)**
- The 5 sample candidates are mixed in with real ones live: label them or remove them.
- ~~The test AI chat (task assistant) has no login and Praxa pays~~: sign-in and a per-hour limit added 2026-11-24.
- ~~Anthropic credit out (since 2026-11-18)~~: topped up (user, 2026-11-24).

**Candidate side**

**Company side**
- Show the credit cost before Build.

**Speed and cost**
- Test builds with simulations take ~5 min, near Vercel's 300s limit: build in the background with progress.
- Stop only cancels in the browser (already listed above).
- Board overdue automations only run when the board is opened: schedule them.
- App pages up to ~90KB rewritten each time: one module per screen.
- Job sim app edits lost when the day is rewritten: keep them or warn.

**Not tested live yet:** Stripe credits, CV import, AI-made job sims, full-screen rules, code runner.

## Done

- 2026-11-23: Guided training, separate from tests (server/writeTraining.ts, src/lib/trainingBuild.ts, TrainingBuilder, TrainingRunner). Lessons of steps, each saying what to do and why, glowing on the control (data-ref) with Show me / I'm stuck / Skip, ticked off from the app's state; wrap-up and certificate at the end. Built through the same app builder as simulations, so the app reuses and feeds Praxa's app library (admin review). Saved to Training (purpose training), never Tests.

- 2026-11-23: Payments and paywalls (server/plans.ts, server/billing.ts, src/lib/plan.tsx). Stripe subscriptions for Starter/Growth/Scale, a £149 30-day job pass, monthly AI allowance spent before bought credit (free: £2 once, no top-ups), plans dialog with real checkout and Manage billing, pricing page on the new prices. Locked by plan: open jobs, candidates per job (free sees the first 15), integrity report / answers / job sim replay / why they fit (paid), pool search and invites + library job sims (Growth+), CSV export (Scale), seats. Checked against a fake Stripe; not run on real Stripe yet.

- 2026-11-22: No pass marks, "verified" or medals: candidates and companies see the score (and rank) on every test. Job pass marks and per-skill minimums are gone (finishing a job's required tests sends the application with the score); companies see every try's score; the percentile is gone. Training keeps its pass mark for certificates. Not clicked through in a browser yet.
- 2026-11-22: Fit for a job is only the average of the candidate's scores on that job's tests (a test not taken counts 0, attempt limits respected). No fit is shown until they've taken one of the job's tests; jobs without tests have no fit.
- 2026-11-22: Candidate flow: Tests is the catalogue (no progress ring or Up next; Home has those), Work mode card on Home for team members, Ranked in the main menu, Career switch and Upskill merged into one Courses page with a switch, a bell notification when finishing a job's tests sends the application, leaving full screen gives a 10-second warning the first 2 times before it's recorded, and Google sign-up asks for the job after. Not clicked through in a browser yet.
- 2026-11-22: Job simulation practice (src/data/practiceSim.ts): a job simulation's start screen offers a 3-minute practice on the same desktop (Mail, Spreadsheet, Files; two timed parts, an email landing in the second), full screen, not scored or saved, no attempt used, no AI marking. Not clicked through in a browser yet.
- 2026-11-22: Admins try tests instantly: in the app any test an admin starts runs straight in (no intro, signing, countdown, full screen, retake gap or saving). /admin has a Test lab: run any test or job simulation, open the desktop with every app (built-in ones filled from the job sims, library apps with sample data) or start on one app, open a job sim's own desktop untimed, open each library app alone, and the job sim practice.
- 2026-11-22: Admin app editor (/admin): open any app (library, waiting for review, or inside a company's saved test), try it, and change it by chatting with the AI (small checked edits via /api/edit-app, undo, then Save: library apps save as their next version, submissions keep waiting, company tests get the new page). Untested against the real AI (credit out).
- 2026-11-22: Company flow: home chat has 3 starters (job simulation, create a job and its tests, find candidates); Candidates tabs renamed Your pipeline / Everyone on Praxa / Best fit for a job with a line on what each is, and a job's page says "This job's pipeline"; a job simulation saves for hiring by default (library in the menu); "Project Manager" is "Your team" (Team, Training); Projects & CRM is Work mode, opened from the name menu in a new tab; stage and match names in sentence case; the builder chat's plan has a titled card and an Apply changes button, and a plain answer offers "I meant it as a change: plan it".
- 2026-11-22: Candidate Work mode opens on the company's Projects & CRM, monday-style (MemberBoards: the same boards, live; team members work on items, columns and views; making or deleting boards stays with the company), with "Work at <company>" at the top (a picker when on several teams) and the company on the Work mode button. Needs the Firestore rules deployed (onTeamOf on projects and projectTasks).
- 2026-11-22: Work mode workspace has My work first (monday-style: every item on the company's boards they own, overdue/to do/done, status changed in place, plus the training and tests the company sent) and the company's teammates as people on the boards (teamMembers readable by teammates). Needs the rules deployed.
- 2026-11-22: A team member's Work is the company's exact workspace (same page, full screen, same buttons: they can make boards and set up the CRM; only deleting a board stays with the company), with My work first and Training, Certificates, Teams and Settings in its sidebar; Work opens in a new tab from the name menu and Home. Rules: team members can create boards (deploy needed).
- 2026-11-22: Work mode opened in a new tab by a Praxa admin (candidate view) no longer switches to the business view: candidate-only pages open as the candidate.
- 2026-11-22: Work mode is always the workspace: a candidate not on a team gets the same workspace (My work, Team with their invitations, Training, Certificates, Settings) with no boards until they join. Both workspaces have a Team page in the sidebar: the company's is its full Team page (invite, send work), a team member's lists the company's team, then their own teams and invitations. Not clicked through in a browser yet.

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
