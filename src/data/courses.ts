/**
 * Vetter Learn: courses and bootcamps for job seekers and for employees whose companies are training them.
 * Every course ends in one or more Vetter tests, so finishing it gets you a verified score rather than a certificate
 * nobody checks.
 */

export type CourseFormat = 'Bootcamp' | 'Course';
export type CourseAudience = 'career-switchers' | 'employees';
export type LessonKind = 'video' | 'reading' | 'exercise' | 'project';

export interface CourseLesson {
  title: string;
  kind: LessonKind;
  minutes: number;
}

export interface CourseModule {
  title: string;
  summary: string;
  lessons: CourseLesson[];
}

export interface Course {
  // Also the course's address: /learn/<id>/
  id: string;
  title: string;
  tagline: string;
  description: string;
  category: string;
  format: CourseFormat;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  weeks: number;
  // Price in US dollars. Courses are sold by sign-up: the Vetter team contacts each person, there's no checkout
  price: number;
  hoursPerWeek: number;
  audiences: CourseAudience[];
  skills: string[];
  outcomes: string[];
  // Who it's for, in a sentence each
  forWho: string[];
  modules: CourseModule[];
  // The Vetter tests that prove you learned it, in the order to take them
  testIds: string[];
  // Jobs on Vetter whose titles contain any of these are suggested at the end
  jobKeywords: string[];
}

const v = (title: string, minutes = 12): CourseLesson => ({ title, kind: 'video', minutes });
const r = (title: string, minutes = 10): CourseLesson => ({ title, kind: 'reading', minutes });
const x = (title: string, minutes = 25): CourseLesson => ({ title, kind: 'exercise', minutes });
const p = (title: string, minutes = 120): CourseLesson => ({ title, kind: 'project', minutes });

export const coursePriceLabel = (c: Pick<Course, 'price'>) => `$${c.price.toLocaleString('en-US')}`;

export const COURSES: Course[] = [
  {
    id: 'data-analysis-bootcamp',
    title: 'Data Analysis Bootcamp',
    tagline: 'From spreadsheets to SQL to dashboards, in twelve weeks.',
    description:
      'A full bootcamp for becoming a data analyst. You clean messy data, write SQL against real databases, build models in spreadsheets, and turn the answers into dashboards and short write-ups a manager can act on. Every module ends in hands-on work, and the bootcamp finishes with the same job simulation companies on Vetter send their candidates.',
    category: 'Data',
    format: 'Bootcamp',
    level: 'Beginner',
    weeks: 12,
    price: 5000,
    hoursPerWeek: 10,
    audiences: ['career-switchers', 'employees'],
    skills: ['Excel', 'SQL', 'Data cleaning', 'Dashboards', 'Statistics', 'Storytelling with data'],
    outcomes: [
      'Clean and reshape a messy dataset without breaking it',
      'Answer business questions with joins, aggregations and window functions',
      'Build a lookup-driven margin report in a spreadsheet',
      'Design a dashboard that leads with the answer',
      'Present findings and a recommendation in five minutes',
    ],
    forWho: [
      'Career changers who want a first analyst job',
      'Graduates who need practical skills on top of a degree',
      'Employees in finance, operations or marketing who are asked for numbers every week',
    ],
    modules: [
      {
        title: 'Thinking like an analyst',
        summary: 'Turning a vague request into a question data can answer, and what a good answer looks like.',
        lessons: [v('What analysts actually do all day'), r('From request to question'), x('Rewrite five bad briefs')],
      },
      {
        title: 'Spreadsheets that hold up',
        summary: 'Tables, lookups, pivot tables and the formulas analysts use daily.',
        lessons: [v('Structuring data as tables'), v('XLOOKUP and INDEX/MATCH', 18), v('Pivot tables', 15), x('Build a margin report', 40)],
      },
      {
        title: 'Cleaning data',
        summary: 'Duplicates, missing values, inconsistent formats and how to fix them without losing rows.',
        lessons: [v('The five kinds of dirty data'), x('Clean a customer export', 35), r('Documenting what you changed')],
      },
      {
        title: 'SQL foundations',
        summary: 'SELECT, WHERE, GROUP BY and JOIN against a real shop database.',
        lessons: [v('Your first queries'), v('Joins without the confusion', 20), v('Grouping and aggregating', 15), x('Twenty questions about a shop', 45)],
      },
      {
        title: 'SQL for real questions',
        summary: 'Subqueries, CTEs and window functions for rankings, running totals and month-on-month change.',
        lessons: [v('CTEs for readable queries'), v('Window functions', 20), x('Top earner per department', 30), x('Month-on-month revenue', 30)],
      },
      {
        title: 'Statistics you will use',
        summary: 'Averages that lie, spread, correlation, and how to tell a real change from noise.',
        lessons: [v('Mean, median and outliers'), v('Correlation is not causation'), r('A/B tests in plain English', 15), x('Is the change real?')],
      },
      {
        title: 'Dashboards',
        summary: 'Choosing the right chart, laying out a page, and leading with the number that matters.',
        lessons: [v('Picking a chart'), v('Dashboard layout', 15), x('Redesign a cluttered dashboard', 40)],
      },
      {
        title: 'Capstone: a job simulation',
        summary: 'A full analyst task for a coffee chain: data, questions, a dashboard and a recommendation.',
        lessons: [r('The brief'), p('Analyse Ridgeway Coffee', 240), x('Write the five-minute summary', 40)],
      },
    ],
    testIds: ['test-clean-01', 'test-excel-01', 'test-sql-01', 'test-dash-01', 'test-sim-da-01'],
    jobKeywords: ['analyst', 'analytics', 'data'],
  },
  {
    id: 'sql-for-analysts',
    title: 'SQL for Analysts',
    tagline: 'Write the queries analyst interviews ask for.',
    description:
      'A focused course on SQL for people who need answers from a database. It starts at SELECT and ends at window functions, with every lesson run against a real database in your browser.',
    category: 'Data',
    format: 'Course',
    level: 'Beginner',
    weeks: 4,
    price: 3500,
    hoursPerWeek: 4,
    audiences: ['career-switchers', 'employees'],
    skills: ['SQL', 'Joins', 'Aggregation', 'Window functions'],
    outcomes: ['Query any table you are given access to', 'Combine tables with the right join', 'Rank, total and compare with window functions'],
    forWho: ['Anyone applying for analyst roles', 'Employees tired of waiting for someone else to pull the numbers'],
    modules: [
      { title: 'Reading data', summary: 'SELECT, WHERE, ORDER BY and LIMIT.', lessons: [v('Your first query', 8), x('Filter a product list', 20)] },
      { title: 'Joining tables', summary: 'Inner, left and self joins, and the mistakes that double your totals.', lessons: [v('Joins', 18), x('Orders and customers', 30)] },
      { title: 'Summarising', summary: 'GROUP BY, HAVING and aggregate functions.', lessons: [v('Grouping', 15), x('Headcount by department', 25)] },
      { title: 'Window functions', summary: 'RANK, ROW_NUMBER, LAG and running totals.', lessons: [v('Windows explained', 20), x('Rankings and running totals', 35)] },
    ],
    testIds: ['test-sql-01', 'test-sql-02'],
    jobKeywords: ['analyst', 'data', 'analytics'],
  },
  {
    id: 'excel-for-work',
    title: 'Excel for Work',
    tagline: 'Lookups, pivots and reports your manager will trust.',
    description:
      'The spreadsheet skills that come up in almost every office job: clean tables, lookups, pivot tables and a report that updates itself.',
    category: 'Data',
    format: 'Course',
    level: 'Beginner',
    weeks: 3,
    price: 3000,
    hoursPerWeek: 3,
    audiences: ['career-switchers', 'employees'],
    skills: ['Excel', 'Lookups', 'Pivot tables', 'Reporting'],
    outcomes: ['Build lookups that do not break', 'Summarise thousands of rows in a pivot table', 'Make a monthly report that refreshes itself'],
    forWho: ['Job seekers whose target roles list Excel', 'Employees who want to stop doing reports by hand'],
    modules: [
      { title: 'Tables and formulas', summary: 'Structured tables, references and the formulas worth learning.', lessons: [v('Tables', 10), x('Fix a broken sheet', 20)] },
      { title: 'Lookups', summary: 'XLOOKUP, INDEX/MATCH and handling missing matches.', lessons: [v('XLOOKUP', 15), x('Price lookups', 25)] },
      { title: 'Pivot tables and reports', summary: 'Summarising, slicing and building a report.', lessons: [v('Pivots', 15), p('Build a margin report', 60)] },
    ],
    testIds: ['test-excel-01'],
    jobKeywords: ['analyst', 'finance', 'operations'],
  },
  {
    id: 'software-testing-bootcamp',
    title: 'Software Testing Bootcamp',
    tagline: 'Become a QA tester: test cases, APIs and SQL checks.',
    description:
      'An eight-week bootcamp for a first job in quality assurance. You learn to write test cases that catch real bugs, test APIs by hand and with tools, and check a database with SQL to prove the app saved what it said it did.',
    category: 'Software',
    format: 'Bootcamp',
    level: 'Beginner',
    weeks: 8,
    price: 4500,
    hoursPerWeek: 8,
    audiences: ['career-switchers', 'employees'],
    skills: ['Test case design', 'Bug reports', 'API testing', 'SQL', 'Regression testing'],
    outcomes: ['Write test cases that find bugs, not just pass', 'Test a REST API for auth, errors and pagination', 'Write bug reports developers can act on', 'Validate data with SQL'],
    forWho: ['Career changers looking for a way into tech', 'Support staff moving into QA'],
    modules: [
      { title: 'How software breaks', summary: 'Where bugs hide and how testers think.', lessons: [v('The tester mindset'), r('Equivalence classes and boundaries', 15)] },
      { title: 'Test cases', summary: 'Designing cases, edge cases and clear steps.', lessons: [v('Writing a good test case'), x('Catch the bugs in a sign-up form', 35)] },
      { title: 'Bug reports', summary: 'Steps, expected, actual, severity.', lessons: [v('A bug report developers love'), x('Report three bugs', 25)] },
      { title: 'API testing', summary: 'Requests, status codes, auth and pagination.', lessons: [v('HTTP in ten minutes', 10), v('Testing auth', 15), x('Test a users API', 40)] },
      { title: 'SQL for testers', summary: 'Checking that what the app shows matches what it stored.', lessons: [v('SQL basics for QA'), x('Validate shop data', 35)] },
      { title: 'Capstone', summary: 'Test a full feature end to end and present your findings.', lessons: [p('Test a checkout flow', 180)] },
    ],
    testIds: ['test-qatc-01', 'test-qaapi-01', 'test-qasql-01'],
    jobKeywords: ['qa', 'test', 'quality'],
  },
  {
    id: 'frontend-development',
    title: 'Frontend Development',
    tagline: 'Components, state and the patterns teams use in production.',
    description:
      'For developers who know some JavaScript and want to work on real product teams. Covers component design, state management, performance and accessibility.',
    category: 'Software',
    format: 'Course',
    level: 'Intermediate',
    weeks: 6,
    price: 4000,
    hoursPerWeek: 6,
    audiences: ['career-switchers', 'employees'],
    skills: ['React', 'State management', 'TypeScript', 'Accessibility', 'Performance'],
    outcomes: ['Split a UI into components that stay simple', 'Choose where state should live', 'Find and fix slow renders', 'Ship pages that work with a keyboard and screen reader'],
    forWho: ['Junior developers going for their next role', 'Backend developers picking up frontend work'],
    modules: [
      { title: 'Components', summary: 'Props, composition and when to split.', lessons: [v('Component design', 15), x('Refactor a large component', 40)] },
      { title: 'State', summary: 'Local, lifted, shared and server state.', lessons: [v('Where state lives', 18), x('Fix a stale state bug', 30)] },
      { title: 'Performance', summary: 'Measuring, memoising and avoiding work.', lessons: [v('Why it re-renders', 15), x('Speed up a list', 30)] },
      { title: 'Accessibility', summary: 'Semantics, focus and labels.', lessons: [v('Accessible by default', 12), x('Audit a form', 25)] },
    ],
    testIds: ['test-fe-01'],
    jobKeywords: ['frontend', 'front-end', 'full-stack', 'web'],
  },
  {
    id: 'backend-and-apis',
    title: 'Backend & API Design',
    tagline: 'Design APIs and data models that survive real traffic.',
    description:
      'REST API design, database modelling and the resilience patterns (retries, backoff, idempotency) that backend interviews ask about.',
    category: 'Software',
    format: 'Course',
    level: 'Intermediate',
    weeks: 6,
    price: 4000,
    hoursPerWeek: 6,
    audiences: ['career-switchers', 'employees'],
    skills: ['REST', 'Database design', 'Retries and backoff', 'Idempotency'],
    outcomes: ['Design a clean REST API', 'Model data for a social app', 'Make calls safe to retry'],
    forWho: ['Developers moving into backend roles', 'Engineers preparing for system design interviews'],
    modules: [
      { title: 'API design', summary: 'Resources, verbs, errors and versioning.', lessons: [v('Designing resources', 15), x('Design a shop API', 40)] },
      { title: 'Data modelling', summary: 'Tables, keys, indexes and trade-offs.', lessons: [v('Modelling a social app', 18), x('Model followers and posts', 40)] },
      { title: 'Resilience', summary: 'Timeouts, retries, backoff and idempotency keys.', lessons: [v('When calls fail', 15), x('Write a backoff function', 30)] },
    ],
    testIds: ['test-api-01', 'test-db-01', 'test-be-01'],
    jobKeywords: ['backend', 'back-end', 'engineer', 'full-stack'],
  },
  {
    id: 'digital-marketing',
    title: 'Digital Marketing',
    tagline: 'Campaigns, channels and the numbers behind them.',
    description:
      'How modern marketing teams plan, run and measure campaigns across search, social and email, with a focus on reading the results and deciding what to do next.',
    category: 'Marketing',
    format: 'Course',
    level: 'Beginner',
    weeks: 5,
    price: 3750,
    hoursPerWeek: 4,
    audiences: ['career-switchers', 'employees'],
    skills: ['Campaign planning', 'SEO', 'Paid social', 'Email', 'Marketing metrics'],
    outcomes: ['Plan a campaign from goal to channel', 'Read CAC, CTR and conversion like a marketer', 'Decide where the next pound of budget goes'],
    forWho: ['Graduates aiming for marketing roles', 'Small business staff who now run the marketing'],
    modules: [
      { title: 'Planning', summary: 'Goals, audiences and channels.', lessons: [v('From goal to plan', 12), x('Plan a launch', 30)] },
      { title: 'Channels', summary: 'Search, social and email, and what each is good for.', lessons: [v('Search and SEO', 15), v('Paid social', 12), v('Email', 10)] },
      { title: 'Measuring', summary: 'The funnel, attribution and the metrics that matter.', lessons: [v('Marketing metrics', 15), x('Read a campaign report', 30)] },
    ],
    testIds: ['test-mkt-01'],
    jobKeywords: ['marketing', 'growth'],
  },
  {
    id: 'b2b-sales',
    title: 'B2B Sales',
    tagline: 'Prospecting, discovery and a pipeline you can forecast.',
    description: 'The sales process from first contact to signed contract, with practice calls and real pipeline reviews.',
    category: 'Sales',
    format: 'Course',
    level: 'Beginner',
    weeks: 4,
    price: 3500,
    hoursPerWeek: 4,
    audiences: ['career-switchers', 'employees'],
    skills: ['Prospecting', 'Discovery calls', 'Pipeline management', 'Negotiation'],
    outcomes: ['Run a discovery call that finds the real problem', 'Keep a pipeline clean and forecastable', 'Handle common objections'],
    forWho: ['People starting out as SDRs or account executives', 'Founders and employees who now have to sell'],
    modules: [
      { title: 'Prospecting', summary: 'Finding and reaching the right people.', lessons: [v('Who to call', 12), x('Write three openers', 20)] },
      { title: 'Discovery', summary: 'Questions that uncover need, budget and timing.', lessons: [v('Discovery calls', 15), x('Practise a call', 30)] },
      { title: 'Pipeline', summary: 'Stages, hygiene and forecasting.', lessons: [v('Pipeline stages', 12), x('Review a messy pipeline', 30)] },
    ],
    testIds: ['test-sales-01'],
    jobKeywords: ['sales', 'account', 'business development'],
  },
  {
    id: 'project-management',
    title: 'Project Management Essentials',
    tagline: 'Plan, deliver and keep stakeholders on side.',
    description: 'Scoping, planning, risks and status reporting for people who run projects, whether or not it is in their job title.',
    category: 'Management',
    format: 'Course',
    level: 'Beginner',
    weeks: 4,
    price: 3500,
    hoursPerWeek: 3,
    audiences: ['employees', 'career-switchers'],
    skills: ['Scoping', 'Planning', 'Risk management', 'Stakeholder updates', 'Agile'],
    outcomes: ['Write a scope people agree to', 'Build a plan with a critical path', 'Spot risks early and say so clearly'],
    forWho: ['Employees who have been handed a project', 'Job seekers moving into coordinator or PM roles'],
    modules: [
      { title: 'Scope', summary: 'What is in, what is out, and who decides.', lessons: [v('Scoping', 12), x('Scope a website relaunch', 25)] },
      { title: 'Planning', summary: 'Tasks, dependencies and estimates.', lessons: [v('The critical path', 15), x('Plan the relaunch', 35)] },
      { title: 'Delivery', summary: 'Risks, status and change.', lessons: [v('Risk registers that get used', 12), x('Write a status update', 20)] },
    ],
    testIds: ['test-pm-01'],
    jobKeywords: ['project', 'programme', 'delivery'],
  },
  {
    id: 'finance-fundamentals',
    title: 'Finance Fundamentals',
    tagline: 'Read a P&L, a balance sheet and a cash flow statement.',
    description: 'How the three financial statements fit together and how analysts use them to judge a business.',
    category: 'Accounting',
    format: 'Course',
    level: 'Beginner',
    weeks: 4,
    price: 3500,
    hoursPerWeek: 3,
    audiences: ['career-switchers', 'employees'],
    skills: ['Financial statements', 'Ratios', 'Cash flow', 'Budgeting'],
    outcomes: ['Read all three statements and link them', 'Work out margins and key ratios', 'Explain why a profitable company can run out of cash'],
    forWho: ['Graduates applying for finance roles', 'Managers who now own a budget'],
    modules: [
      { title: 'The income statement', summary: 'Revenue, costs and margins.', lessons: [v('Reading a P&L', 15), x('Work out the margins', 20)] },
      { title: 'The balance sheet', summary: 'Assets, liabilities and equity.', lessons: [v('Balance sheets', 15), x('Spot the problem', 20)] },
      { title: 'Cash flow', summary: 'Where the money actually went.', lessons: [v('Cash is not profit', 12), x('Link the three statements', 35)] },
    ],
    testIds: ['test-fin-01'],
    jobKeywords: ['finance', 'financial', 'accountant'],
  },
  {
    id: 'consulting-case-interviews',
    title: 'Case Interviews & Problem Solving',
    tagline: 'Structure any business problem and talk it through.',
    description: 'The frameworks and habits consulting interviewers look for: structuring, estimating, reading charts and landing a recommendation.',
    category: 'Consulting',
    format: 'Course',
    level: 'Intermediate',
    weeks: 3,
    price: 3000,
    hoursPerWeek: 4,
    audiences: ['career-switchers'],
    skills: ['Structuring', 'Market sizing', 'Chart reading', 'Recommendations'],
    outcomes: ['Break a problem into parts that do not overlap', 'Size a market in your head', 'Finish with a clear recommendation'],
    forWho: ['Students and graduates applying to consulting and strategy roles'],
    modules: [
      { title: 'Structuring', summary: 'Issue trees and hypotheses.', lessons: [v('Issue trees', 15), x('Structure three cases', 30)] },
      { title: 'Numbers', summary: 'Estimates and mental maths.', lessons: [v('Market sizing', 15), x('Size five markets', 25)] },
      { title: 'Landing it', summary: 'Synthesis and recommendations.', lessons: [v('Answer first', 10), p('A full mock case', 60)] },
    ],
    testIds: ['test-cs-01'],
    jobKeywords: ['consult', 'strategy', 'analyst'],
  },  {
    id: 'ai-engineering-bootcamp',
    title: 'AI Engineering Bootcamp',
    tagline: 'Build products on large language models, from first prompt to shipped feature.',
    description:
      'A full bootcamp for becoming an AI engineer. You call model APIs, design prompts that hold up, ground answers in your own documents, build agents that use tools, and measure quality with evaluations instead of guesswork. It finishes with an AI feature you build, test and ship end to end.',
    category: 'AI',
    format: 'Bootcamp',
    level: 'Intermediate',
    weeks: 12,
    price: 5000,
    hoursPerWeek: 10,
    audiences: ['career-switchers', 'employees'],
    skills: ['LLM APIs', 'Prompt design', 'Retrieval (RAG)', 'Agents and tools', 'Evaluations', 'Python'],
    outcomes: [
      'Call a model API and handle streaming, errors and cost',
      'Write prompts that give consistent, checkable output',
      'Answer questions from your own documents with retrieval',
      'Build an agent that uses tools safely',
      'Measure quality with an evaluation set before you ship',
    ],
    forWho: ['Developers moving into AI work', 'Analysts and engineers who want to build with models, not just use them'],
    modules: [
      { title: 'Models and APIs', summary: 'What a model is good and bad at, and how to call one.', lessons: [v('How LLMs work, without the maths', 18), v('Your first API call'), x('Build a summariser', 40)] },
      { title: 'Prompt design', summary: 'Instructions, examples and structured output.', lessons: [v('Prompts that hold up', 15), r('Structured output and JSON', 12), x('Extract fields from invoices', 40)] },
      { title: 'Retrieval', summary: 'Chunking, embeddings and grounding answers.', lessons: [v('Retrieval in plain terms', 15), x('Answer questions from a handbook', 60)] },
      { title: 'Agents and tools', summary: 'Letting a model take actions, and keeping it safe.', lessons: [v('Tool use', 15), x('An agent that books meetings', 60)] },
      { title: 'Evaluations', summary: 'Test sets, graders and catching regressions.', lessons: [v('Why evals beat vibes', 12), x('Write an eval set', 45)] },
      { title: 'Capstone', summary: 'Ship an AI feature and present how you tested it.', lessons: [p('Build and ship an AI feature', 240)] },
    ],
    testIds: ['test-api-01'],
    jobKeywords: ['ai', 'machine learning', 'ml ', 'llm'],
  },
  {
    id: 'ai-for-work',
    title: 'AI for Work: Prompting & Automation',
    tagline: 'Use AI tools to do real work faster, without writing code.',
    description:
      'For anyone who wants to be the person on their team who knows how to use AI well. You learn to write prompts that get usable results, check AI output before trusting it, and automate repetitive tasks across email, documents and spreadsheets.',
    category: 'AI',
    format: 'Course',
    level: 'Beginner',
    weeks: 4,
    price: 3500,
    hoursPerWeek: 4,
    audiences: ['career-switchers', 'employees'],
    skills: ['Prompting', 'Checking AI output', 'Workflow automation', 'AI policy and safety'],
    outcomes: ['Write prompts that get it right first time', 'Spot made-up facts and check sources', 'Automate a weekly task end to end', 'Know what not to paste into an AI tool'],
    forWho: ['Office and admin staff', 'Career changers adding an in-demand skill to their CV'],
    modules: [
      { title: 'Prompting', summary: 'Context, examples and asking for the format you need.', lessons: [v('Good prompts, bad prompts'), x('Rewrite five weak prompts', 25)] },
      { title: 'Trust but check', summary: 'Hallucinations, sources and review.', lessons: [v('When AI makes things up'), x('Fact-check an AI report', 30)] },
      { title: 'Automation', summary: 'Chaining tools so the work does itself.', lessons: [v('No-code automation', 15), p('Automate a weekly report', 90)] },
    ],
    testIds: [],
    jobKeywords: ['ai', 'operations', 'assistant'],
  },
  {
    id: 'sales-development-bootcamp',
    title: 'Sales Development Bootcamp',
    tagline: 'Become an SDR: prospect, open conversations and book meetings that close.',
    description:
      'The fastest route into tech sales. You learn to find the right accounts, write outreach people answer, run cold calls, handle objections and keep a clean pipeline. Every week includes live role-plays, and it ends with a full outbound campaign you run yourself.',
    category: 'Sales',
    format: 'Bootcamp',
    level: 'Beginner',
    weeks: 8,
    price: 4500,
    hoursPerWeek: 8,
    audiences: ['career-switchers'],
    skills: ['Prospecting', 'Cold email', 'Cold calling', 'Objection handling', 'CRM hygiene'],
    outcomes: ['Build a list of accounts that fit', 'Write outreach that gets replies', 'Run a cold call without a script', 'Handle the five most common objections', 'Keep a pipeline your manager can forecast'],
    forWho: ['People from retail, hospitality or customer service', 'Graduates who want a fast-moving, well-paid first job'],
    modules: [
      { title: 'Who to sell to', summary: 'Ideal customers, accounts and research.', lessons: [v('Ideal customer profiles'), x('Build a list of 50 accounts', 40)] },
      { title: 'Outreach', summary: 'Emails and messages people answer.', lessons: [v('Cold email that works', 15), x('Write a five-step sequence', 35)] },
      { title: 'Calls', summary: 'Openers, discovery and booking the meeting.', lessons: [v('The first 30 seconds', 10), x('Role-play: cold call', 30)] },
      { title: 'Objections', summary: 'Price, timing, "send me an email".', lessons: [v('Objections are questions', 12), x('Role-play: five objections', 30)] },
      { title: 'Capstone', summary: 'Run a real outbound campaign and report the numbers.', lessons: [p('Run a two-week campaign', 180)] },
    ],
    testIds: ['test-sales-01'],
    jobKeywords: ['sales', 'sdr', 'bdr', 'account executive', 'business development'],
  },
  {
    id: 'paralegal-bootcamp',
    title: 'Paralegal & Legal Operations Bootcamp',
    tagline: 'Start a career in law without a law degree.',
    description:
      'A practical route into legal work. You learn how legal teams run, draft and review common documents, manage matters and deadlines, research case law, and handle client information carefully. It ends with a full mock matter run from instruction to completion.',
    category: 'Law',
    format: 'Bootcamp',
    level: 'Beginner',
    weeks: 8,
    price: 4500,
    hoursPerWeek: 8,
    audiences: ['career-switchers'],
    skills: ['Legal research', 'Document drafting', 'Matter management', 'Contract review', 'Confidentiality and GDPR'],
    outcomes: ['Find and summarise relevant case law', 'Draft letters and standard documents', 'Run a matter without missing a deadline', 'Flag the risky clauses in a contract', 'Handle client data the right way'],
    forWho: ['Admin and office staff who want a professional career', 'Graduates of any degree considering law'],
    modules: [
      { title: 'How legal work runs', summary: 'Firms, in-house teams and who does what.', lessons: [v('Inside a legal team'), r('Key legal terms', 15)] },
      { title: 'Research', summary: 'Finding and summarising law.', lessons: [v('Legal research basics', 15), x('Research a question and write a note', 45)] },
      { title: 'Drafting', summary: 'Letters, forms and standard documents.', lessons: [v('Plain legal writing', 12), x('Draft a letter before action', 35)] },
      { title: 'Contracts', summary: 'Reading contracts and spotting risk.', lessons: [v('Anatomy of a contract', 15), x('Review a supplier contract', 45)] },
      { title: 'Capstone', summary: 'Run a mock matter from start to finish.', lessons: [p('A full mock matter', 180)] },
    ],
    testIds: [],
    jobKeywords: ['paralegal', 'legal', 'law', 'compliance'],
  },
  {
    id: 'commercial-contracts',
    title: 'Commercial Contracts Essentials',
    tagline: 'Read, negotiate and manage the contracts a business runs on.',
    description:
      'For people who work with contracts but were never taught how. Covers the clauses that matter, negotiating sensible changes, liability and termination, and keeping track of obligations once a contract is signed.',
    category: 'Law',
    format: 'Course',
    level: 'Intermediate',
    weeks: 5,
    price: 3750,
    hoursPerWeek: 5,
    audiences: ['career-switchers', 'employees'],
    skills: ['Contract structure', 'Liability and indemnities', 'Negotiation', 'Contract management'],
    outcomes: ['Read a contract and know what it commits you to', 'Push back on one-sided clauses', 'Track renewals and obligations'],
    forWho: ['Paralegals and legal assistants', 'Procurement, sales and operations staff'],
    modules: [
      { title: 'The clauses that matter', summary: 'Payment, liability, IP and termination.', lessons: [v('Reading a contract quickly', 15), x('Mark up an NDA', 30)] },
      { title: 'Negotiating', summary: 'Redlines and fallback positions.', lessons: [v('What to push back on', 15), x('Negotiate a services agreement', 45)] },
      { title: 'After signing', summary: 'Obligations, renewals and disputes.', lessons: [v('Contract management', 12), x('Build a contract tracker', 30)] },
    ],
    testIds: [],
    jobKeywords: ['contract', 'legal', 'procurement'],
  },
  {
    id: 'accounting-bootcamp',
    title: 'Accounting Bootcamp',
    tagline: 'From bookkeeping to month-end close and management accounts.',
    description:
      'A full bootcamp for becoming an accounts assistant or junior accountant. You learn double entry, bank reconciliations, VAT, payroll basics, month-end close and the management accounts a finance director reads. Every module uses real accounting software workflows and spreadsheets.',
    category: 'Accounting',
    format: 'Bootcamp',
    level: 'Beginner',
    weeks: 12,
    price: 5000,
    hoursPerWeek: 8,
    audiences: ['career-switchers'],
    skills: ['Double entry', 'Reconciliations', 'VAT', 'Month-end close', 'Management accounts', 'Excel'],
    outcomes: ['Post transactions correctly', 'Reconcile bank and supplier accounts', 'Prepare a VAT return', 'Run a month-end close', 'Build management accounts with commentary'],
    forWho: ['Admin and office staff who already handle invoices', 'Career changers who like numbers and want a stable profession'],
    modules: [
      { title: 'Bookkeeping', summary: 'Double entry, ledgers and the trial balance.', lessons: [v('Debits and credits made simple', 18), x('Post a month of transactions', 45)] },
      { title: 'Reconciliations', summary: 'Bank, suppliers and customers.', lessons: [v('Why reconciliations matter'), x('Reconcile a bank account', 40)] },
      { title: 'Tax basics', summary: 'VAT and payroll essentials.', lessons: [v('VAT in practice', 15), x('Prepare a VAT return', 40)] },
      { title: 'Month-end', summary: 'Accruals, prepayments and the close.', lessons: [v('Accruals and prepayments', 15), x('Close a month', 60)] },
      { title: 'Management accounts', summary: 'P&L, balance sheet and commentary.', lessons: [v('What the FD wants to see', 15), p('Build a management pack', 180)] },
    ],
    testIds: ['test-fin-01', 'test-excel-01'],
    jobKeywords: ['account', 'bookkeep', 'finance', 'payroll'],
  },
  {
    id: 'cybersecurity-analyst-bootcamp',
    title: 'Cybersecurity Analyst Bootcamp',
    tagline: 'Defend networks, investigate alerts and respond to incidents.',
    description:
      'A bootcamp for becoming a security operations (SOC) analyst. You learn how attacks work, read logs and alerts, investigate incidents, harden systems and write reports. Labs throughout, ending in a simulated incident you investigate and report on.',
    category: 'Cybersecurity',
    format: 'Bootcamp',
    level: 'Beginner',
    weeks: 12,
    price: 5000,
    hoursPerWeek: 10,
    audiences: ['career-switchers', 'employees'],
    skills: ['Networking', 'Log analysis', 'SIEM', 'Incident response', 'Threat intelligence'],
    outcomes: ['Explain how common attacks work', 'Triage alerts and tell real from noise', 'Investigate an incident from the logs', 'Write an incident report leaders can act on'],
    forWho: ['IT support staff moving into security', 'Career changers who like solving puzzles'],
    modules: [
      { title: 'Foundations', summary: 'Networks, systems and how attacks happen.', lessons: [v('How networks work', 18), v('The attacker playbook', 15)] },
      { title: 'Logs and alerts', summary: 'Reading logs and working a SIEM.', lessons: [v('Reading logs', 15), x('Triage a queue of alerts', 45)] },
      { title: 'Incident response', summary: 'Contain, investigate, recover.', lessons: [v('The incident lifecycle', 15), x('Investigate a phishing case', 60)] },
      { title: 'Capstone', summary: 'Investigate a simulated breach and report it.', lessons: [p('A simulated breach', 240)] },
    ],
    testIds: [],
    jobKeywords: ['security', 'soc', 'cyber'],
  },
  {
    id: 'ux-design',
    title: 'UX & Product Design',
    tagline: 'Research, design and test products people find easy to use.',
    description:
      'A course for becoming a product designer. You run user research, map journeys, sketch and prototype, design clean interfaces and test them with real people. You finish with portfolio case studies employers ask for.',
    category: 'Design',
    format: 'Course',
    level: 'Beginner',
    weeks: 8,
    price: 4500,
    hoursPerWeek: 8,
    audiences: ['career-switchers'],
    skills: ['User research', 'Wireframing', 'Prototyping', 'Visual design', 'Usability testing'],
    outcomes: ['Run interviews that uncover real problems', 'Turn findings into flows and wireframes', 'Build a clickable prototype', 'Test it and improve it', 'Write a portfolio case study'],
    forWho: ['Creative people from any background', 'Marketers and developers moving into design'],
    modules: [
      { title: 'Research', summary: 'Interviews, surveys and synthesis.', lessons: [v('Talking to users', 15), x('Run three interviews', 60)] },
      { title: 'Structure', summary: 'Journeys, flows and wireframes.', lessons: [v('From findings to flows'), x('Wireframe a sign-up flow', 45)] },
      { title: 'Interface', summary: 'Layout, type, colour and components.', lessons: [v('Visual design basics', 15), x('Design three screens', 60)] },
      { title: 'Testing', summary: 'Usability tests and iterating.', lessons: [v('Running a usability test', 12), p('Portfolio case study', 180)] },
    ],
    testIds: [],
    jobKeywords: ['design', 'ux', 'ui', 'product designer'],
  },
  {
    id: 'hr-people-operations',
    title: 'HR & People Operations',
    tagline: 'Hiring, onboarding, employee relations and the law that sits behind them.',
    description:
      'A practical course for moving into HR. You learn the employee lifecycle, structured hiring, onboarding, handling difficult conversations, absence and performance processes, and the employment law basics every HR person needs.',
    category: 'HR',
    format: 'Course',
    level: 'Beginner',
    weeks: 6,
    price: 4000,
    hoursPerWeek: 5,
    audiences: ['career-switchers', 'employees'],
    skills: ['Recruitment', 'Onboarding', 'Employee relations', 'Employment law basics', 'HR data'],
    outcomes: ['Run a fair, structured hiring process', 'Onboard a new starter well', 'Handle a grievance or disciplinary by the book', 'Report on headcount and turnover'],
    forWho: ['Office managers and team leads who already do some HR', 'Career changers who are good with people'],
    modules: [
      { title: 'Hiring', summary: 'Job specs, structured interviews and skills tests.', lessons: [v('Hiring on evidence', 15), x('Design an interview plan', 35)] },
      { title: 'The employee lifecycle', summary: 'Onboarding, reviews and leaving.', lessons: [v('Onboarding that sticks'), x('Write a 30-60-90 plan', 30)] },
      { title: 'Employee relations', summary: 'Grievances, discipline and absence.', lessons: [v('Difficult conversations', 15), x('Role-play: a grievance meeting', 30)] },
      { title: 'Law and data', summary: 'Employment law basics and HR reporting.', lessons: [r('Employment law essentials', 20), x('Build a people dashboard', 40)] },
    ],
    testIds: [],
    jobKeywords: ['hr', 'people', 'recruit', 'talent'],
  },
  {
    id: 'healthcare-administration',
    title: 'Healthcare Administration',
    tagline: 'Run the front desk, records and patient flow of a clinic or practice.',
    description:
      'A route into healthcare without clinical training. You learn patient booking and flow, medical records and confidentiality, clinical safety basics, billing and coding, and how to communicate with patients calmly and clearly.',
    category: 'Healthcare',
    format: 'Course',
    level: 'Beginner',
    weeks: 5,
    price: 3750,
    hoursPerWeek: 5,
    audiences: ['career-switchers'],
    skills: ['Patient communication', 'Medical records', 'Confidentiality', 'Clinical safety basics', 'Scheduling'],
    outcomes: ['Manage bookings and patient flow', 'Keep records accurate and confidential', 'Know when to escalate a safety concern', 'Handle upset patients calmly'],
    forWho: ['Receptionists and customer service staff', 'Anyone who wants to work in healthcare without clinical training'],
    modules: [
      { title: 'Patients first', summary: 'Communication and patient flow.', lessons: [v('The patient journey'), x('Role-play: a difficult call', 25)] },
      { title: 'Records', summary: 'Accuracy, confidentiality and consent.', lessons: [v('Confidentiality in practice'), x('Spot the records errors', 30)] },
      { title: 'Safety', summary: 'Red flags and escalation.', lessons: [v('When to escalate', 12), x('Safety scenarios', 30)] },
    ],
    testIds: ['test-health-01'],
    jobKeywords: ['health', 'clinic', 'patient', 'medical'],
  },
];

// The order categories appear in on the Career switch page
export const COURSE_CATEGORIES = ['AI', 'Data', 'Software', 'Sales', 'Marketing', 'Accounting', 'Law', 'Cybersecurity', 'Design', 'HR', 'Management', 'Consulting', 'Healthcare'];

export const coursePath = (course: Course) => `/learn/${course.id}/`;
export const isLearnIndexPath = (pathname: string) => /^\/learn\/?$/.test(pathname);
export const isUpskillIndexPath = (pathname: string) => /^\/upskill\/?$/.test(pathname);
export function courseIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/learn\/([a-z0-9-]+)\/?$/);
  return match && COURSES.some((c) => c.id === match[1]) ? match[1] : null;
}

export const courseLessons = (course: Course) => course.modules.flatMap((m, mi) => m.lessons.map((l, li) => ({ ...l, key: `${mi}.${li}` })));
export const courseHours = (course: Course) => course.weeks * course.hoursPerWeek;
