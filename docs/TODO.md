# Vetter to-do list

Kept up to date as work is asked for and finished. Newest items at the bottom of each section.

## To do

- **Skills games, one at a time.** Build the skills games (attention to detail, verbal reasoning, numerical reasoning, logical reasoning, memory, multitasking) one by one, each tried and agreed before the next. The first six made together were removed on 2026-11-12. The library already supports them: category `Aptitude`, shown in every sector under "Skills games" (role "Any role"), and suggested by `/api/suggest-tests` when a job needs those abilities. The removed code is in git history (commit 9271ef1, `src/data/skillsGames.ts`) to start from.
- **Sector library tests.** The Vetter team makes the app-simulation tests for roles outside tech (trades, healthcare, hospitality, retail) and puts them in the library.
- **Block AI app simulations on the server** for companies outside tech (today only the app hides them).
- **Stop button: cancel on the server too.** Stop cancels the chat's requests in the browser, but a step already running on the server still finishes (and may be charged).
- **Credit meter.** Decide whether to show "x% used", put it on every page, and warn or block before a build that would run out the credit. Billing needs `STRIPE_SECRET_KEY` to go live.
- **Old test creator pop-up.** New tests and AI edits now happen in the home chat. The pop-up is still used to carry on drafts saved from it before; retire it once those are gone.
- **Templates for AI simulations** (desk engines such as a virtual desktop, full inbox, records system; an instrument kit for hands-on roles) to cut AI cost and build time. Discussed, not started.

## Done

- 2026-11-12: Tests fit the job (no spreadsheets for trades/clinical), drawings labelled.
- 2026-11-12: Library tests suggested when a job is posted, not while making a test.
- 2026-11-12: Trades, Hospitality and Retail categories; a company sees only its sector's tests.
- 2026-11-12: Stop button in the test chat.
- 2026-11-12: Companies outside tech have their AI write questions only (no app simulations).
- 2026-11-12: Tests are built and changed in the home chat (progress checklist, title, description, "Questions x to y" outline, See test), with Stop.
