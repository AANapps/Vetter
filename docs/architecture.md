# Corprax architecture (agreed direction, 2026-11-26)

The user's brief for the core architecture, kept here as the standard every build follows. Corprax measures what people
can do through realistic workplace simulations, and becomes a capability intelligence layer for humans and, later, AI
systems.

## The three systems (modular, reusable, connected)

1. **Simulation Engine**: realistic work. Generates scenarios, data and tasks from a job description; simulated tools
   (spreadsheet, email, dashboards, browser, code editor…); changing information, problems, time limits; adapts to
   industry, role and seniority.
2. **Competency Engine**: job-specific capability. Extracts skills and duties from the job description, maps tasks to
   a reusable competency framework, scores with structured rubrics, produces evidence-backed competency scores.
3. **AI Framework Overlay**: AI-era capability, applied INSIDE each job's simulation. **Never a separate AI test per
   job, and no duplicate assessments for each AI skill.** Three functions: **Inject** AI tools and interactions that
   fit the job, **Observe** how the candidate uses, questions, corrects and supervises AI, **Evaluate** AI competencies
   independently. It must evolve on its own as AI changes, without rebuilding job assessments.
   Competencies: AI fluency and tool use; AI-assisted problem-solving; verifying AI output; critical thinking and
   human judgement; delegation and agent orchestration; agent supervision and error correction; AI safety, privacy and
   accountability; adaptability to new AI tools.
   Per job, e.g.: data analyst catches fabricated figures in an AI report; support catches wrong information in an AI
   reply; developer reviews and fixes AI code; operations manager delegates to and supervises agents.

## Generation workflow
Job description → AI extracts duties, skills, tools, outcomes → Competency Engine picks competencies → Simulation
Engine writes the scenario → Environment Engine picks the apps → Overlay injects AI interactions → candidate works →
actions, decisions, outputs and reasoning evaluated → capability report.

## AI conditions (per role/task)
No AI (independent capability) · AI permitted (how well they use it) · AI required (performance with AI) ·
Agent-enabled (delegation and supervision). **Never penalise not using AI where it isn't needed.**

## Results
Kept separate and transparent: overall capability profile, job-specific competency scores, AI competency scores, task
results, evidence for every score, strengths, weaknesses, development areas. Judge outcomes, accuracy, reasoning,
judgement and quality, not counts of clicks or prompts.

## Quality
AI generates scenarios, not the assessment or scoring system: standard competency definitions, reusable templates,
structured rubrics, calibrated difficulty, validation, consistent criteria. Varied scenarios, equivalent difficulty.

## Later uses on the same infrastructure
Onboarding, workforce capability mapping, internal skills verification, development, continuous assessment, AI agent
evaluation, human-AI collaboration assessment, workforce analytics.

## Where the code stands (2026-11-26, after phase 1)

| Spec | Built | Gap |
|---|---|---|
| Simulation Engine | Desktop + work apps (src/components/Desktop.tsx, desk/), job sims in 5 parts (jobSimKit.ts), AI writer (server/writeJobSim.ts, src/lib/jobSimBuild.ts), app library | Seniority calibration; equivalent-difficulty variants |
| Competency Engine | Plan blueprint (server/planTest.ts), checks with rubrics, AI marking; untagged checks are the job score | No reusable job-competency framework yet (checks aren't mapped to standard job competencies) |
| AI Overlay: inject | Agents app with live Haiku agents and blind spots (deskAgent.ts); DA day hand-written; AI writer adds agent tasks when the switch is on | Not a reusable module library: each day writes its own; no supervision-in-progress, safety/injection, automation, API or tool/MCP interactions yet |
| AI Overlay: observe | Agent task log, flags, chat, AI assistant transcript | Not summarised as evidence |
| AI Overlay: evaluate | The framework's 8 competencies (src/lib/capabilities.ts) tag overlay checks only; `splitScore` keeps the job score (ranks) and the AI score apart; AI score + competencies saved on results and submissions (breakdown.ai), shown on the result screen and the company's answers view | Not on profiles yet; no evidence summary |
| AI conditions | Four modes per job (JobPosting.aiMode, job test picker; src/lib/jobTests.ts withJobAi): No AI takes the overlay out whole (apps, emails and briefs via withoutAi/briefWithoutAi, AI checks); AI permitted skips delegation checks the candidate didn't use; the DA day runs Agent-enabled by default. The AI writer writes the no-AI versions too | "AI required" scores like Agent-enabled when a day has no agents |
| Results | Score + rank, answers view | Capability report: separate scores, evidence, strengths and weaknesses |

Rules from building it:
- Tag only checks that exist because of the overlay. The job's own work (the sheet, the curveball, replies, the report)
  stays untagged, so the job score is the same under every AI condition (DA day: 81 under all three in the solve check).
- Every overlay mention in a day has a no-AI version, so "No AI" reads as if the overlay was never there.
- Adaptability means adapting to new AI tools, not the curveball (that's a job skill).
