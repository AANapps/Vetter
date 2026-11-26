import { TestRole } from '../types';

/**
 * Corprax Training for companies: live, tutor-led training a company books for its team. Two kinds:
 * - Mini modules: one skill in a half day or a day (Excel PivotTables, handling angry customers, React hooks)
 * - Job bootcamps: a role from Junior to Mid-level to Advanced, each level a few weeks of live sessions
 * Every item is taught by a Corprax tutor, online or at the company's office, to a group from the company's team.
 * A company searches and books it (src/lib/trainingBookings.ts); the Corprax team confirms the dates and the tutor.
 */

export type TrainingKind = 'Mini module' | 'Bootcamp';
export type TrainingLevel = 'Junior' | 'Mid-level' | 'Advanced';

export interface TrainingSession {
  title: string;
  summary: string;
}

export interface TrainingItem {
  id: string;
  kind: TrainingKind;
  title: string;
  // The field it's for (Data Analysis, Customer Support…), and the role a bootcamp trains
  field: string;
  role?: TestRole;
  level: TrainingLevel;
  // How long, as shown ("3 hours", "4 weeks · 2 sessions a week"), and the live hours in total
  duration: string;
  hours: number;
  summary: string;
  sessions: TrainingSession[];
  outcomes: string[];
  skills: string[];
  forWho: string;
  // Per person, in pounds excluding VAT (see PRICING below); groups of up to maxGroup
  price: number;
  maxGroup: number;
  // Corprax tests that check it stuck afterwards
  testIds?: string[];
}

const s = (title: string, summary: string): TrainingSession => ({ title, summary });

/**
 * Pricing, per person excluding VAT, set against UK providers of live, tutor-led online training (November 2026):
 * - Short live courses: a 3-hour remote PivotTables session £136–177 (Scomis), online PivotTables £99 (AXIOM), a
 *   one-day PivotTables course £300 (STL); customer service: a half-day masterclass £330 inc VAT (ATA), 4 hours £327
 *   (Improving Communications), a full day £215–299 + VAT (Revolution Learning, CCMA). Technical providers (QA) price
 *   higher and on request.
 *   So mini modules are £55 an hour for workplace skills (support, Excel and security awareness, prompting) and £70 an
 *   hour for technical ones (development, data, AI and security engineering): £165 to £245 for 3 to 3.5 hours.
 * - Bootcamps: a live online data analyst bootcamp over 6 months part-time £3,750 (Fortray), 15 weeks live online
 *   about £3,800 ($4,796, Bryant), a two-day BCS data analysis course £1,050 + VAT (TSG).
 *   So bootcamps are £280 a week (two 3-hour live sessions, groups of up to 10) for technical roles and £200 a week for
 *   customer support; the whole Junior-to-Advanced path is 15% less than its levels booked one by one.
 */
const WORKPLACE_HOURLY = 55;
const TECHNICAL_HOURLY = 70;
const WORKPLACE_FIELDS = new Set(['Customer Support']);
const WORKPLACE_IDS = new Set(['excel-pivots-lookups', 'prompting-for-work', 'phishing-awareness']);
const round5 = (n: number) => Math.round(n / 5) * 5;
export const PATH_DISCOUNT = 0.15;

// ---------- Mini modules ----------

const mini = (id: string, title: string, field: string, level: TrainingLevel, hours: number, summary: string, sessions: TrainingSession[], outcomes: string[], skills: string[], forWho: string, testIds?: string[]): TrainingItem => ({
  id,
  kind: 'Mini module',
  title,
  field,
  level,
  duration: hours <= 4 ? `${hours} hours, one session` : `${hours} hours, over ${Math.ceil(hours / 3.5)} sessions`,
  hours,
  summary,
  sessions,
  outcomes,
  skills,
  forWho,
  price: round5(hours * (WORKPLACE_FIELDS.has(field) || WORKPLACE_IDS.has(id) ? WORKPLACE_HOURLY : TECHNICAL_HOURLY)),
  maxGroup: 12,
  ...(testIds && { testIds }),
});

const MINI: TrainingItem[] = [
  mini('excel-pivots-lookups', 'Excel: PivotTables and Lookups', 'Data Analysis', 'Junior', 3, 'Summarise thousands of rows in seconds and pull data across sheets without breaking anything.', [s('XLOOKUP and INDEX/MATCH', 'Lookups that survive inserted columns, with a not-found case.'), s('PivotTables', 'Grouping, filtering and slicing, and refreshing when data grows.'), s('Hands-on', 'Build a monthly sales summary from a real export.')], ['Look up values reliably', 'Summarise any table with a PivotTable', 'Keep reports updating as data grows'], ['Excel', 'XLOOKUP', 'PivotTables'], 'Anyone who builds reports in Excel.', ['test-da-excel']),
  mini('sql-joins-aggregation', 'SQL: Joins and Aggregation', 'Data Analysis', 'Junior', 3.5, 'Answer business questions straight from the database.', [s('Filtering and sorting', 'SELECT, WHERE, ORDER BY on real tables.'), s('Joins', 'Inner and left joins, and the join that doubles your totals.'), s('Grouping', 'GROUP BY and HAVING for totals by month, region and customer.')], ['Write the queries analysts use every day', 'Avoid double counting', 'Group and total correctly'], ['SQL', 'Joins', 'Aggregation'], 'Analysts and managers who need their own numbers.', ['test-da-sql']),
  mini('power-query-cleaning', 'Cleaning Data with Power Query', 'Data Analysis', 'Mid-level', 3, 'Turn messy exports into tidy tables, with steps that rerun themselves next month.', [s('Shaping', 'Types, splits, trims, removing blanks and errors.'), s('Unpivot and merge', 'From months-as-columns to tidy rows; joining two files.'), s('Refreshable', 'One click next month, with checks it worked.')], ['Clean a messy export without manual edits', 'Unpivot and merge tables', 'Build repeatable cleaning steps'], ['Power Query', 'Data Cleaning'], 'Analysts who clean the same files every month.', ['test-da-cleaning']),
  mini('powerbi-dax', 'Power BI: Measures with DAX', 'Data Analysis', 'Mid-level', 3.5, 'The DAX every report needs: totals, ratios, time intelligence and CALCULATE.', [s('Measures vs columns', 'Filter context, explained with the model in front of you.'), s('CALCULATE', 'Changing filters: share of total, channel splits.'), s('Time intelligence', 'Year to date and year on year.')], ['Write correct measures', 'Use CALCULATE with confidence', 'Build YTD and YoY'], ['Power BI', 'DAX'], 'Report builders moving beyond drag-and-drop.', ['test-da-powerbi']),
  mini('dashboards-that-get-used', 'Dashboards People Actually Use', 'Data Analysis', 'Mid-level', 3, 'Designing a page that answers a leader’s questions at a glance.', [s('Start from decisions', 'Which KPIs, and against what.'), s('Charts that tell the truth', 'Picking the chart; axes, colour, clutter.'), s('Review clinic', 'Redesign one of your own dashboards live.')], ['Choose the right KPIs', 'Design an honest, clear page', 'Get leaders using it'], ['Dashboards', 'Data Visualisation'], 'Anyone who reports to leadership.', ['test-da-reporting']),
  mini('angry-customers', 'Handling Angry Customers', 'Customer Support', 'Junior', 3, 'Calm, empathetic replies that fix the problem and keep the customer.', [s('What’s really going on', 'Listening for the real problem under the anger.'), s('Words that help', 'Apologies that land, and phrases that make it worse.'), s('Role play', 'Live practice with real cases and feedback.')], ['De-escalate by email, chat and phone', 'Offer what you can without over-promising', 'Keep customers who were about to leave'], ['Empathy', 'De-escalation', 'Written Communication'], 'Support teams, store staff, anyone facing customers.', ['test-cs-comms-01']),
  mini('ticket-triage-slas', 'Ticket Triage and SLAs', 'Customer Support', 'Junior', 3, 'Working a queue by impact and urgency, and never missing a target.', [s('Priority', 'Impact × urgency, not tone or plan.'), s('Targets', 'First-reply and resolution targets, and how to meet them.'), s('Routing', 'The right team first time; escalations engineers can act on.')], ['Prioritise a queue correctly', 'Meet service targets', 'Escalate with the right detail'], ['Ticket Triage', 'SLAs', 'Escalation'], 'New and growing support teams.', ['test-support-triage-01']),
  mini('clear-replies', 'Writing Clear Replies and Bug Reports', 'Customer Support', 'Mid-level', 3, 'Explaining fixes simply to customers, and writing bug reports engineers love.', [s('Plain English', 'Turning technical answers into steps anyone can follow.'), s('Macros', 'Saved replies that still sound human.'), s('Bug reports', 'Steps, expected, actual, severity.')], ['Write replies customers understand first time', 'Build good macros', 'Write bug reports that get fixed'], ['Written Communication', 'Bug Reports'], 'Support agents and team leads.', ['test-cs-comms-01']),
  mini('refunds-fraud', 'Refund Policy and Fraud Awareness', 'Customer Support', 'Mid-level', 2.5, 'Applying policy fairly, getting the details right, and spotting account takeovers.', [s('Policy in practice', 'When to approve, decline or escalate.'), s('Details', 'The right order, amount and payment method.'), s('Red flags', 'New bank details, changed emails, urgency.')], ['Apply refund rules consistently', 'Process refunds without errors', 'Spot and stop fraud attempts'], ['Refund Policy', 'Fraud Awareness'], 'Anyone who issues refunds or changes accounts.', ['test-cs-refunds-01']),
  mini('git-for-teams', 'Git for Teams', 'Software Development', 'Junior', 3, 'Branches, pull requests and fixing the mistakes everyone makes.', [s('The everyday flow', 'Branch, commit, push, pull request.'), s('Merges and conflicts', 'Resolving conflicts calmly.'), s('Undo', 'Revert, reset and recovering lost work.')], ['Work on a shared repository confidently', 'Resolve conflicts', 'Undo mistakes safely'], ['Git', 'Version Control'], 'New developers and anyone touching code.'),
  mini('debugging-pro', 'Debugging Like a Pro', 'Software Development', 'Mid-level', 3, 'Finding the real cause fast, with the debugger, logs and tests.', [s('Read the trace', 'From the error to the first line of your code.'), s('Debugger and logs', 'Breakpoints and logging that help.'), s('Fix and prove it', 'A failing test first, then the fix.')], ['Find root causes quickly', 'Use the debugger well', 'Stop bugs coming back'], ['Debugging', 'Testing'], 'Developers of any level.', ['test-sd-debug']),
  mini('testing-that-helps', 'Writing Tests That Help', 'Software Development', 'Mid-level', 3.5, 'Unit and integration tests that catch real bugs without slowing you down.', [s('What to test', 'Behaviour, boundaries and edge cases.'), s('Good tests', 'Readable, fast, independent.'), s('Mocks and fakes', 'When to use them, and when not to.')], ['Choose what’s worth testing', 'Write clear, reliable tests', 'Test boundaries and edge cases'], ['Testing', 'Unit Tests'], 'Developers and QA engineers.'),
  mini('rest-api-design', 'Designing REST APIs', 'Software Development', 'Mid-level', 3.5, 'Resources, status codes, validation, auth and pagination done right.', [s('Resources and methods', 'URLs, verbs and idempotency.'), s('Errors', 'Status codes and helpful error bodies.'), s('Auth and pages', 'Tokens, 401 vs 403, pagination.')], ['Design consistent APIs', 'Return the right status codes', 'Handle auth and paging properly'], ['REST APIs', 'HTTP'], 'Backend and full-stack developers.', ['test-sd-api']),
  mini('accessibility-essentials', 'Web Accessibility Essentials', 'Frontend Development', 'Junior', 3, 'Building pages everyone can use, and testing them with a screen reader.', [s('The basics', 'Semantics, labels, alt text, headings.'), s('Keyboard and focus', 'Everything reachable and visible.'), s('Testing', 'Screen readers and automated checks.')], ['Build accessible components', 'Fix common failures', 'Test with real tools'], ['Accessibility', 'HTML'], 'Frontend developers and designers.', ['test-fe-dom']),
  mini('react-hooks', 'React Hooks in Practice', 'Frontend Development', 'Mid-level', 3.5, 'State, effects and custom hooks without the classic bugs.', [s('State', 'Derived state, reducers and where state lives.'), s('Effects', 'Dependencies, cleanups and races.'), s('Custom hooks', 'Reusing logic cleanly.')], ['Avoid stale state and effect bugs', 'Structure state well', 'Write custom hooks'], ['React', 'Hooks'], 'Developers working in React.', ['test-fe-react']),
  mini('web-performance', 'Fast Web Pages', 'Frontend Development', 'Advanced', 3, 'Core Web Vitals: measuring and fixing what users feel.', [s('Measure', 'Lighthouse, field data and what matters.'), s('Fix', 'Images, fonts, JavaScript and layout shift.'), s('Keep it fast', 'Budgets and checks in CI.')], ['Read Core Web Vitals', 'Fix LCP, CLS and INP', 'Keep performance from slipping'], ['Web Performance'], 'Frontend teams.'),
  mini('prompting-for-work', 'Prompting AI for Work', 'AI', 'Junior', 2.5, 'Getting reliable, useful output from AI assistants for everyday tasks.', [s('Good prompts', 'Context, constraints, examples.'), s('Checking output', 'Spotting made-up facts and errors.'), s('Safe use', 'What never to paste into an AI tool.')], ['Write prompts that work', 'Check AI output', 'Use AI safely with company data'], ['Prompt Design', 'AI Tools'], 'Every team.'),
  mini('llm-apis', 'Building with LLM APIs', 'AI Engineering', 'Mid-level', 3.5, 'Calling models from code: prompts, tools, structured output and cost.', [s('The API', 'Messages, system prompts, temperature.'), s('Structured output and tools', 'JSON you can trust; calling functions.'), s('Cost and latency', 'Caching, smaller models, streaming.')], ['Build a working LLM feature', 'Get structured output', 'Keep cost and latency down'], ['LLM APIs', 'Python'], 'Developers adding AI to products.'),
  mini('rag-basics', 'RAG: Answers from Your Own Documents', 'AI Engineering', 'Mid-level', 3.5, 'Retrieval-augmented generation that cites its sources and doesn’t make things up.', [s('Chunking and embeddings', 'Getting the right passages back.'), s('Grounded answers', 'Citations and “I don’t know”.'), s('Evaluation', 'Measuring answer quality.')], ['Build a RAG pipeline', 'Reduce hallucinations', 'Evaluate it properly'], ['RAG', 'Embeddings', 'Evaluation'], 'Developers building assistants.'),
  mini('phishing-awareness', 'Phishing Awareness', 'Cyber Security', 'Junior', 2, 'Recognising phishing emails, texts and calls, and what to do next.', [s('Spot it', 'Senders, links, urgency, attachments.'), s('Live examples', 'Real phishing from the last year.'), s('Report it', 'What to do if you clicked.')], ['Recognise phishing', 'Report it quickly', 'Recover if you clicked'], ['Phishing', 'Security Awareness'], 'Everyone at the company.'),
  mini('incident-response', 'Incident Response Basics', 'Cyber Security', 'Mid-level', 3.5, 'The first hour of an incident: triage, contain, communicate.', [s('Triage', 'Is it real, and how bad?'), s('Contain', 'Stopping the spread without destroying evidence.'), s('Report', 'Clear updates and a write-up.')], ['Triage alerts', 'Contain an incident', 'Write a clear report'], ['Incident Response', 'Triage'], 'IT and security staff.'),
  mini('pandas-essentials', 'Python pandas Essentials', 'Data Science', 'Junior', 3.5, 'Loading, cleaning and summarising data in Python.', [s('DataFrames', 'Load, select, filter.'), s('Clean', 'Missing values, types, duplicates.'), s('Summarise', 'groupby, merge and pivot.')], ['Work with data in pandas', 'Clean real datasets', 'Summarise with groupby'], ['Python', 'pandas'], 'Analysts moving to Python.', ['test-da-python']),
];

// ---------- Job bootcamps: each role at Junior, Mid-level and Advanced ----------

interface RoleTrack {
  key: string;
  role: TestRole;
  field: string;
  levels: Record<TrainingLevel, { weeks: number; summary: string; sessions: [string, string][]; outcomes: string[]; skills: string[] }>;
  testIds?: string[];
}

const TRACKS: RoleTrack[] = [
  {
    key: 'data-analyst',
    role: 'Data Analyst',
    field: 'Data Analysis',
    testIds: ['test-dafund-01', 'test-da-excel', 'test-da-sql', 'test-da-sim'],
    levels: {
      Junior: { weeks: 4, summary: 'The everyday analyst toolkit: spreadsheets, clean data, first SQL and clear charts.', sessions: [['Asking the right question', 'Turning requests into metrics.'], ['Excel for analysis', 'Lookups, SUMIFS, PivotTables.'], ['Clean data', 'Duplicates, blanks, types, outliers.'], ['First SQL', 'SELECT, joins and GROUP BY.'], ['Charts and summaries', 'The right chart and a clear message.'], ['Capstone', 'A real report from raw data to email.']], outcomes: ['Clean and analyse data in Excel', 'Query a database', 'Report findings clearly'], skills: ['Excel', 'SQL', 'Data Cleaning'] },
      'Mid-level': { weeks: 6, summary: 'From reports to insight: advanced SQL, Power BI, statistics and stakeholder work.', sessions: [['Advanced SQL', 'CTEs, window functions, cohorts.'], ['Power BI models', 'Star schemas and relationships.'], ['DAX', 'Measures, CALCULATE, time intelligence.'], ['Statistics', 'Averages, spread, significance.'], ['A/B tests', 'Reading experiments honestly.'], ['Stakeholders', 'Requirements and presenting.'], ['Capstone', 'A dashboard and recommendation for leadership.']], outcomes: ['Model data and build dashboards', 'Use statistics correctly', 'Influence decisions'], skills: ['SQL', 'Power BI', 'Statistics'] },
      Advanced: { weeks: 8, summary: 'Leading analytics: Python, automation, experimentation and data products.', sessions: [['Python and pandas', 'Analysis in code.'], ['Automation', 'Pipelines and scheduled reports.'], ['Experimentation', 'Designing and running tests.'], ['Forecasting', 'Trends and seasonality.'], ['Data quality at scale', 'Checks and monitoring.'], ['Leading analysis', 'Prioritising and mentoring.'], ['Capstone', 'An automated analysis product.']], outcomes: ['Automate analysis in Python', 'Run experiments', 'Lead analytics work'], skills: ['Python', 'Experimentation', 'Automation'] },
    },
  },
  {
    key: 'customer-support',
    role: 'Customer Support Agent',
    field: 'Customer Support',
    testIds: ['test-support-triage-01', 'test-cs-comms-01', 'test-sim-support-01'],
    levels: {
      Junior: { weeks: 3, summary: 'Great support from day one: the help desk, clear replies and the policies.', sessions: [['The help desk', 'Views, tickets, statuses, macros.'], ['Triage', 'Priority and routing.'], ['Writing replies', 'Clear, warm, short.'], ['Policies', 'Refunds, returns, account safety.'], ['Capstone', 'A live queue, start to finish.']], outcomes: ['Work a help desk queue', 'Write great replies', 'Apply policy correctly'], skills: ['Help Desk', 'Written Communication'] },
      'Mid-level': { weeks: 4, summary: 'Handling the hard cases: angry customers, escalations, troubleshooting and fraud.', sessions: [['De-escalation', 'Angry and upset customers.'], ['Troubleshooting', 'Asking the right questions.'], ['Escalation', 'Tier 2 and engineering.'], ['Fraud and safety', 'Account takeovers and refunds.'], ['Capstone', 'A hard day on the desk.']], outcomes: ['Resolve difficult cases', 'Escalate well', 'Protect customers and the company'], skills: ['De-escalation', 'Troubleshooting', 'Escalation'] },
      Advanced: { weeks: 6, summary: 'Leading support: quality, metrics, knowledge base and coaching.', sessions: [['Support metrics', 'CSAT, first-contact resolution, backlog.'], ['Quality reviews', 'Scoring and feedback.'], ['Knowledge base', 'Articles that deflect tickets.'], ['Coaching', 'Developing agents.'], ['Incidents', 'Running support in an outage.'], ['Capstone', 'A plan to improve a real team.']], outcomes: ['Run and improve a support team', 'Coach agents', 'Use support data'], skills: ['Team Leadership', 'Support Operations'] },
    },
  },
  {
    key: 'software-developer',
    role: 'Software Developer',
    field: 'Software Development',
    testIds: ['test-sd-js', 'test-sd-debug', 'test-sim-dev-01'],
    levels: {
      Junior: { weeks: 6, summary: 'Writing working code on a real team: JavaScript, Git, debugging and tests.', sessions: [['JavaScript', 'Data, functions, arrays and objects.'], ['Git', 'Branches and pull requests.'], ['Debugging', 'Traces, the debugger, root causes.'], ['Testing', 'First unit tests.'], ['APIs', 'Calling and building simple APIs.'], ['Capstone', 'Fix and ship real bugs.']], outcomes: ['Write and debug JavaScript', 'Work in Git with a team', 'Test your code'], skills: ['JavaScript', 'Git', 'Testing'] },
      'Mid-level': { weeks: 8, summary: 'Building features end to end: APIs, databases, async code and code review.', sessions: [['Async code', 'Promises, errors, races.'], ['REST APIs', 'Design, validation, auth.'], ['SQL', 'Queries and schema design.'], ['Data structures', 'Choosing the right one.'], ['Code review', 'Giving and taking feedback.'], ['Shipping', 'CI, deploys, rollback.'], ['Capstone', 'A feature from spec to production.']], outcomes: ['Build features end to end', 'Design APIs and data', 'Review code well'], skills: ['APIs', 'SQL', 'Code Review'] },
      Advanced: { weeks: 8, summary: 'Senior skills: system design, performance, reliability and technical leadership.', sessions: [['System design', 'Services, queues, caches.'], ['Performance', 'Profiling and fixing.'], ['Reliability', 'Monitoring, incidents, SLOs.'], ['Security', 'The OWASP risks.'], ['Architecture', 'Trade-offs and documents.'], ['Leading', 'Mentoring and planning.'], ['Capstone', 'Design and defend a system.']], outcomes: ['Design systems', 'Make software fast and reliable', 'Lead technically'], skills: ['System Design', 'Performance', 'Reliability'] },
    },
  },
  {
    key: 'frontend-engineer',
    role: 'Frontend Engineer',
    field: 'Frontend Development',
    testIds: ['test-fe-dom', 'test-fe-react', 'test-sim-fe-01'],
    levels: {
      Junior: { weeks: 6, summary: 'Building pages and components: HTML, CSS, JavaScript and accessibility.', sessions: [['HTML and accessibility', 'Semantic, usable pages.'], ['CSS layout', 'Flexbox, grid, responsive.'], ['JavaScript in the browser', 'The DOM and events.'], ['Forms', 'Validation and errors.'], ['React basics', 'Components and props.'], ['Capstone', 'A product page from a design.']], outcomes: ['Build responsive, accessible pages', 'Write browser JavaScript', 'Start with React'], skills: ['HTML', 'CSS', 'JavaScript', 'React'] },
      'Mid-level': { weeks: 6, summary: 'Real React apps: state, data fetching, testing and performance.', sessions: [['State', 'Reducers and where state lives.'], ['Data fetching', 'Effects, caching, races.'], ['Testing UI', 'Component and end-to-end tests.'], ['Performance', 'Rendering and Core Web Vitals.'], ['Design systems', 'Reusable components.'], ['Capstone', 'A checkout flow.']], outcomes: ['Build robust React apps', 'Test UI', 'Keep apps fast'], skills: ['React', 'Testing', 'Web Performance'] },
      Advanced: { weeks: 8, summary: 'Frontend architecture and leadership.', sessions: [['Architecture', 'Monorepos, micro-frontends, boundaries.'], ['Advanced performance', 'Bundles, SSR, streaming.'], ['Accessibility at scale', 'Audits and process.'], ['Tooling', 'Build, CI, quality gates.'], ['Leading frontend', 'Standards and mentoring.'], ['Capstone', 'An architecture proposal.']], outcomes: ['Architect large frontends', 'Lead frontend quality', 'Mentor the team'], skills: ['Architecture', 'Performance', 'Accessibility'] },
    },
  },
  {
    key: 'ai-engineer',
    role: 'AI Engineer',
    field: 'AI Engineering',
    levels: {
      Junior: { weeks: 4, summary: 'Building with LLMs: APIs, prompts and safe use.', sessions: [['LLM APIs', 'Calling models from code.'], ['Prompts', 'Reliable prompting.'], ['Structured output', 'JSON and tools.'], ['Safety', 'Privacy and guardrails.'], ['Capstone', 'A working AI feature.']], outcomes: ['Build an LLM feature', 'Prompt reliably', 'Use AI safely'], skills: ['LLM APIs', 'Prompt Design'] },
      'Mid-level': { weeks: 6, summary: 'RAG, agents and evaluation for production features.', sessions: [['RAG', 'Retrieval and grounding.'], ['Agents', 'Tools and planning.'], ['Evaluation', 'Measuring quality.'], ['Guardrails', 'Prompt injection and filtering.'], ['Cost', 'Caching and model choice.'], ['Capstone', 'An assistant over company documents.']], outcomes: ['Build RAG and agents', 'Evaluate AI features', 'Defend against prompt injection'], skills: ['RAG', 'Agents', 'Evaluation'] },
      Advanced: { weeks: 8, summary: 'AI systems in production: monitoring, fine-tuning and governance.', sessions: [['LLMOps', 'Monitoring and incidents.'], ['Fine-tuning', 'When and how.'], ['Scale', 'Latency and throughput.'], ['Governance', 'Risk, law and audits.'], ['Leading AI work', 'Roadmaps and teams.'], ['Capstone', 'A production AI system.']], outcomes: ['Run AI in production', 'Decide when to fine-tune', 'Govern AI safely'], skills: ['LLMOps', 'Fine-tuning', 'AI Governance'] },
    },
  },
  {
    key: 'soc-analyst',
    role: 'SOC Analyst',
    field: 'Cyber Security',
    levels: {
      Junior: { weeks: 4, summary: 'The security operations basics: logs, alerts and phishing.', sessions: [['Networks and systems', 'What normal looks like.'], ['Logs', 'Reading and searching logs.'], ['Alert triage', 'Real or false positive?'], ['Phishing', 'Analysis and response.'], ['Capstone', 'A morning on the alert queue.']], outcomes: ['Triage alerts', 'Investigate logs', 'Handle phishing'], skills: ['Log Analysis', 'Alert Triage'] },
      'Mid-level': { weeks: 6, summary: 'Investigations and incident response.', sessions: [['Investigations', 'Following an attack through logs.'], ['Identity and cloud', 'Account and cloud attacks.'], ['Incident response', 'Contain and recover.'], ['Threat intelligence', 'Using IOCs.'], ['Reporting', 'Clear incident reports.'], ['Capstone', 'A full incident.']], outcomes: ['Investigate incidents', 'Respond and contain', 'Report clearly'], skills: ['Incident Response', 'Cloud Security'] },
      Advanced: { weeks: 8, summary: 'Threat hunting, detection engineering and leading the SOC.', sessions: [['Threat hunting', 'Hypotheses and hunts.'], ['Detection engineering', 'Writing and tuning rules.'], ['Forensics', 'Evidence and timelines.'], ['Automation', 'SOAR playbooks.'], ['Leading a SOC', 'Metrics and shifts.'], ['Capstone', 'A detection programme.']], outcomes: ['Hunt threats', 'Engineer detections', 'Lead a SOC'], skills: ['Threat Hunting', 'Detection Engineering'] },
    },
  },
  {
    key: 'data-scientist',
    role: 'Data Scientist',
    field: 'Data Science',
    levels: {
      Junior: { weeks: 6, summary: 'Python, statistics and first models.', sessions: [['Python and pandas', 'Data in code.'], ['Statistics', 'Distributions and tests.'], ['First models', 'Regression and classification.'], ['Evaluation', 'Honest metrics.'], ['Capstone', 'A first predictive model.']], outcomes: ['Analyse data in Python', 'Build and evaluate models'], skills: ['Python', 'Statistics', 'Machine Learning'] },
      'Mid-level': { weeks: 8, summary: 'Models that work in the real world: features, validation and experiments.', sessions: [['Feature engineering', 'Leakage and pipelines.'], ['Model choice', 'Trees, boosting, tuning.'], ['Validation', 'Time splits and drift.'], ['Experiments', 'A/B tests and causal thinking.'], ['Communicating', 'Explaining models.'], ['Capstone', 'A churn model to production.']], outcomes: ['Build reliable models', 'Run experiments', 'Explain results'], skills: ['Feature Engineering', 'Experimentation'] },
      Advanced: { weeks: 8, summary: 'Advanced modelling, MLOps and leading data science.', sessions: [['Advanced models', 'Time series and NLP.'], ['MLOps', 'Deploying and monitoring models.'], ['Causal inference', 'Beyond A/B tests.'], ['Responsible AI', 'Fairness and explainability.'], ['Leading', 'Roadmaps and impact.'], ['Capstone', 'An end-to-end ML product.']], outcomes: ['Deploy and monitor models', 'Use causal methods', 'Lead DS work'], skills: ['MLOps', 'Causal Inference'] },
    },
  },
];

const PRICE_PER_WEEK: Record<string, number> = { 'Customer Support': 200 };
const TECH_PER_WEEK = 280;

const BOOTCAMPS: TrainingItem[] = TRACKS.flatMap((t) =>
  (['Junior', 'Mid-level', 'Advanced'] as TrainingLevel[]).map((level) => {
    const l = t.levels[level];
    return {
      id: `${t.key}-bootcamp-${level === 'Mid-level' ? 'mid' : level.toLowerCase()}`,
      kind: 'Bootcamp' as const,
      title: `${t.role} Bootcamp: ${level}`,
      field: t.field,
      role: t.role,
      level,
      duration: `${l.weeks} weeks · 2 live sessions a week`,
      hours: l.weeks * 2 * 3,
      summary: l.summary,
      sessions: l.sessions.map(([title, summary]) => s(title, summary)),
      outcomes: l.outcomes,
      skills: l.skills,
      forWho:
        level === 'Junior'
          ? `People new to the ${t.role} role, or moving into it.`
          : level === 'Mid-level'
            ? `${t.role}s with some experience who want to do the job fully.`
            : `Experienced ${t.role}s stepping up to lead.`,
      price: l.weeks * (PRICE_PER_WEEK[t.field] ?? TECH_PER_WEEK),
      maxGroup: 10,
      ...(t.testIds && { testIds: t.testIds }),
    };
  })
);

export const TRAINING: TrainingItem[] = [...BOOTCAMPS, ...MINI];
export const TRAINING_FIELDS = [...new Set(TRAINING.map((t) => t.field))];
export const TRAINING_LEVELS: TrainingLevel[] = ['Junior', 'Mid-level', 'Advanced'];

// The bootcamp path a bootcamp belongs to: the same role at every level, Junior first
export const bootcampPath = (item: TrainingItem) => (item.role ? BOOTCAMPS.filter((b) => b.role === item.role) : []);
// The whole path booked together, per person
export const pathPrice = (item: TrainingItem) => round5(bootcampPath(item).reduce((n, b) => n + b.price, 0) * (1 - PATH_DISCOUNT));

// Searching the catalogue: every word of the query scores against the title, field, role, skills and summary
const STOP = new Set(['a', 'an', 'the', 'for', 'and', 'or', 'to', 'of', 'in', 'on', 'my', 'our', 'we', 'i', 'me', 'team', 'training', 'train', 'course', 'courses', 'want', 'need', 'some', 'with', 'how', 'can', 'you', 'find', 'show', 'me', 'book', 'about', 'what', 'is', 'are', 'do', 'have', 'any', 'get', 'help', 'please', 'much', 'cost', 'price', 'looking', 'staff', 'people', 'employees']);
const GENERIC = /^(junior|mid|level|intermediate|advanced|senior|lead|beginner|new|entry|experienced|bootcamps?|mini|modules?|short|workshops?|sessions?|half|day|live|online|programmes?|programs?|weeks?)$/;
export function searchTraining(query: string, limit = 6): TrainingItem[] {
  const words = query.toLowerCase().match(/[a-z0-9+#]+/g)?.filter((w) => !STOP.has(w) && w.length > 1) ?? [];
  if (!words.length) return [];
  const level = /\b(advanced|senior|lead)\b/i.test(query) ? 'Advanced' : /\b(mid|intermediate|experienced)\b/i.test(query) ? 'Mid-level' : /\b(junior|beginner|new|entry)\b/i.test(query) ? 'Junior' : null;
  const wantsBootcamp = /bootcamp|programme|program|weeks/i.test(query);
  const wantsMini = /mini|workshop|short|half.?day|session/i.test(query);
  return TRAINING.map((t) => {
    const hay = `${t.kind} ${t.title} ${t.field} ${t.role ?? ''} ${t.skills.join(' ')} ${t.summary}`.toLowerCase();
    // Plurals match too: "bootcamps", "dashboards"
    const title = t.title.toLowerCase();
    const scoreOf = (ws: string[]) =>
      ws.reduce((n, w) => {
        const stem = w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w;
        return n + (hay.includes(stem) ? (title.includes(stem) ? 3 : 1) : 0);
      }, 0);
    // Words about the subject (Excel, SOC, angry customers) must match when there are any; level and kind words
    // (advanced, bootcamp, mini) only rank
    const topic = words.filter((w) => !GENERIC.test(w));
    if (topic.length && !scoreOf(topic)) return { t, score: 0 };
    // Only general words ("live training for my team"): everything is a match, so a sample shows
    let score = scoreOf(words) || (topic.length ? 0 : 1);
    if (score && level) score += t.level === level ? 2 : 0;
    if (score && wantsBootcamp && t.kind === 'Bootcamp') score += 2;
    if (score && wantsMini && t.kind === 'Mini module') score += 2;
    return { t, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.t);
}

// Whether a message to the home chat is asking for training rather than a test or candidates
export const asksForTraining = (text: string) => /\b(train|training|trainings|course|courses|bootcamp|bootcamps|upskill|upskilling|teach|tutor|workshops?|learn|lessons?|mini modules?)\b/i.test(text);
