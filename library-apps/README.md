# Praxa app library

Apps for job simulations and app tasks, one folder per app. Each app is a working copy of a kind of product (a help
desk, a CRM, an ads manager) with **no data of its own**: a test gives it data, and the app fills itself from it.

```
library-apps/<id>/
  app.html          the app: one self-contained page (inline CSS and JS, Google Fonts only)
  manifest.json     id, name, product, summary, version, features, what its data and state look like
  sample-data.json  data to preview it with
```

## The contract

- **Data in:** the app reads the test's data from `window.praxaData` when it starts. It never has a company, records
  or answers written into it.
- **State out:** it saves what the candidate does with `praxa.save(state)` (and starts from `window.praxaSaved` when
  the candidate comes back). Tests mark that state with checks like `app:deskly:tickets.101.status`.
- Runs in Praxa's sandboxed frame (src/lib/appSimulation.ts): no network, no Praxa access.

In code, `libraryPage('<id>', data)` (src/lib/libraryApps.ts) gives the page filled with a test's data.

## Refining and preloading (`npm run apps`)

```
npm run apps -- list            apps here and in the library, with their versions
npm run apps -- pull <id>       the library's latest version into library-apps/<id>/
npm run apps -- push <id>       library-apps/<id>/ to the library as its next version
```

Pushing writes the app's next version to Firestore (`environments`, `environmentPages`, and `environmentVersions`
for the history, so tests built on an older version keep it). It uses your Firebase login
(`npx firebase-tools login`); the Praxa project comes from `VITE_FIREBASE_PROJECT_ID` in `.env.local`.

Bump nothing by hand: push sets the version. Add each new feature to `features` in the manifest.
