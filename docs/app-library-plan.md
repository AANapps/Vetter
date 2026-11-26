# App library for job simulations: plan (2026-11-18)

**Goal:** one library of app simulations (one per real product) that gets better with every test. A company's job simulation that needs an app Granyt doesn't have yet makes Granyt build it and save it to the library, visible in admin. The next company whose job simulation uses the same software builds on that app and adds the parts it needs. Apps can also be refined from Claude Code once saved. Over time Granyt only has to preload apps.

## What's there today

- Every app simulation built is saved to the library (Firestore `environments`, `environmentPages`), one per app, sent for review in the admin panel (SimulationLibraryAdmin), and becomes the app's next version once approved.
- **Building on a library app is switched off** (`BUILD_ON_LIBRARY` in src/lib/testChat.ts). The builder rewrote the whole app and ran past the AI's output limit once apps grew, so every simulation is built from scratch.
- Saved apps have the company's own data written into them (its customers, its tickets): awkward to reuse, and a privacy issue.
- The AI job simulation builder (server/writeJobSim.ts) **can't put a custom app on the desktop**. Only Spreadsheet, Browser pages, Database and Code. Deskly (help desk) works there because it was hand-built (src/data/modules/csJobSim.ts, `customApps`).

## Plan

1. **Separate each app from its data.** A library app is just the working product: its screens, buttons and logic. A test supplies the data (company, records, planted problems), which the app loads at the start. Once an app exists, a test that needs it only writes new data: much faster and cheaper than building a page, and no company's data ends up in the library.
2. **Grow apps in small steps.** When a test needs something the app doesn't have (e.g. a reports screen), the AI sends back only the changes, not a rewrite. That fixes the output limit, so `BUILD_ON_LIBRARY` can go back on. Each change becomes a new version waiting for review in admin. The company that needed it uses it straight away; other companies build on it once approved. Live tests stay on the version they were built with, so an update never changes how a running test is marked.
3. **Put library apps on the job simulation desktop.** When planning a job simulation, the AI picks the app from the library and writes its data and the marking checks (`app:<id>:<path>`). If the app isn't in the library, Granyt builds it first and saves it there.
4. **Refine apps from Claude Code.** Each app also lives in the repo (`library-apps/<app>/`): its code, a list of its features, the shape of its data, and sample data. Pull and push commands copy versions between the repo and the library. Pull what companies' builds added, improve it, try it in a browser, push a new version. Deskly moves in as the first app; preloading an app is just pushing it.
5. **Admin app library page.** Each app gets its versions, what each version added, a preview with sample data, and approve or reject.

**Order:** steps 1 and 4 first (everything else builds on them), then 2, 3 and 5. Several sessions.

**Needed:** pushing from Claude Code needs the user's Firebase login. Google asked for a fresh sign-in on 2026-11-18 (`invalid_rapt`): `! npx -y firebase-tools@13 login --reauth --no-localhost`.

**Status:**
- 2026-11-18, steps 1 and 4 done for Deskly. `library-apps/deskly/` (app.html with no data, manifest.json, sample-data.json), `libraryPage(id, data)` (src/lib/libraryApps.ts), `npm run apps -- list|pull|push` (scripts/library-apps.mjs), and Add to library in admin.
- 2026-11-18, steps 2, 3 and 5 built (not yet run against the real AI: the Anthropic credit is out):
  - **Step 2.** `BUILD_ON_LIBRARY` is on (src/lib/testChat.ts). An app task whose app is in the library (Granyt's own or a data-driven one in Firestore) goes to `/api/fit-app` (server/fitApp.ts), which writes only the test's data plus find/replace edits for anything missing. Granyt applies the edits (`applyEdits`), clicks through the app, and sends problems back once. If there were edits, the app alone (no data) goes for review as the next version; the test's data stays on the submission for previewing. New apps are built data-free from the start (server/buildApp.ts returns `data` separately, plus `dataShape`/`stateShape`). Tests keep their own copy of the page, so live tests never change.
  - **Step 3.** The job simulation world can pick `libraryApps` (with a brief of what each must hold) or describe a `newApp` that Granyt builds. The browser fits each app to the day, opens it out of sight to see its starting state, and the script marks it with `app:<id>:<path>` checks (validated in jobSimBuild.ts, including "already passes at the start").
  - **Step 5.** The admin Simulation library shows a Versions list for each app (from `environmentVersions`, written on approval and push), with what each version added and Open. Previews use sample data, or the data of the test it was built for.
- To try live: top up the Anthropic credit, build an app task for a help desk (it should build on Deskly) and a support job simulation, and check the review queue.
- 2026-11-20, cost changes (asked for: cheapest and quickest without losing accuracy):
  - **Fitting an app in two stages** (server/fitApp.ts, `fitLibraryApp` in src/lib/testChat.ts). `data`: the AI gets the app's manifest, sample data and control names, never its code, and writes the data, checks and tips, listing anything the work needs that the app lacks (`missing`). `extend`: only when something's missing, the code is sent (cached) and the AI writes just those edits. One Deskly task's data cost $0.031 (1.9k tokens in, 2.7k out, 18s) on 2026-11-20, against ~10k tokens of code sent every time before.
  - **Data checked by code first** (`shapeProblems` in src/lib/libraryApps.ts): fields every sample record has, lists and objects where the sample has them. Only real problems go back to the AI.
  - **Tests store apps by reference** (src/lib/appRefs.ts): a page that is a library version unchanged is saved as `libraryApp` + `appData` (desktop apps: `libraryApp` + `data`), and filled back in from the repo's bundle or `environmentVersions` when read (src/lib/cloud.ts). Edited pages and older tests keep their whole page. `environmentVersions` docs of data-driven apps carry `dataDriven: true`, which the rules let anyone signed in read (deploy pending).

