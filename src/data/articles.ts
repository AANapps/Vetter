/**
 * Articles for hiring teams: plain answers to the questions people ask search engines and AI assistants about
 * skills-based hiring. Each opens with the answer, then goes deeper with steps, tables and examples. Corprax is mentioned
 * as one practical way to do it, never as the only one. Written as data so the build turns each into a static page
 * (seoPages.ts) that crawlers read without running the app, with Article and FAQ structured data.
 *
 * No invented figures: only numbers that are true of Corprax itself (test lengths, prices) or plainly labelled as
 * examples. Update `updated` whenever an article changes.
 */

export interface ArticleSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  numbered?: boolean;
  table?: { head: string[]; rows: string[][] };
}

export interface Article {
  slug: string;
  title: string;
  // One or two sentences for search results and link previews
  description: string;
  // The direct answer, shown first
  answer: string;
  updated: string;
  sections: ArticleSection[];
  faqs: { q: string; a: string }[];
  related: string[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'how-to-test-candidates-skills-before-hiring',
    title: "How to test candidates' skills before hiring",
    description: 'A practical, step-by-step way to test what candidates can actually do before you hire them: pick the skills that matter, test them in realistic work, and compare people on the same tasks.',
    answer:
      "To test a candidate's skills before hiring, decide the three to five things the job really needs, then have every candidate do short, realistic tasks that need those skills (in the same tools the job uses), marked the same way for everyone. Do it early, before interviews, so you spend interview time on the people who can do the work.",
    updated: '2026-11-24',
    sections: [
      {
        heading: 'Step by step',
        numbered: true,
        list: [
          'List what the job needs in its first three months. Not the CV wish list: the work. "Answers 40 support tickets a day within policy", "builds the weekly sales report in Excel".',
          'Turn each need into a skill you can see someone do: triaging a queue, writing a clear reply, cleaning data, building a lookup, debugging a function.',
          'Choose tasks that copy the real work, in the tools the job uses: a help desk for support, a spreadsheet for an analyst, a code editor for a developer.',
          'Keep it short. 20 minutes per skill area is enough to separate people who can do the work from people who can describe it.',
          'Mark everyone the same way: decide in advance what a right answer is (a number, a ticket status, a passing test), so scores are comparable and fair.',
          'Test before interviews. Send the test with the application, then interview the top scorers about how they did it.',
        ],
      },
      {
        heading: 'Which kind of test fits which job',
        table: {
          head: ['Job', 'What to test', 'Good format'],
          rows: [
            ['Customer support', 'Triage, policy judgement, written replies', 'A help desk simulation with a real-looking ticket queue'],
            ['Data analyst', 'Cleaning, lookups, summaries, charts', 'Spreadsheet and SQL tasks on a messy dataset'],
            ['Software developer', 'Reading code, fixing bugs, writing tests', 'A small codebase with failing tests'],
            ['Sales / account roles', 'Prioritising leads, CRM hygiene, follow-ups', 'A CRM simulation with a pipeline to work'],
            ['Operations / admin', 'Accuracy, scheduling, using documents and forms', 'A desktop with email, calendar and documents'],
          ],
        },
      },
      {
        heading: 'Mistakes to avoid',
        list: [
          'Quiz questions only. Knowing the name of a function is not the same as using it on a messy file.',
          'Take-home projects that run for days. Strong candidates with jobs drop out; you end up testing free time.',
          'Different tasks for different people. You cannot compare scores that came from different work.',
          'Marking on gut feel. Write down what good looks like before anyone takes the test.',
        ],
      },
      {
        heading: 'How Corprax does it',
        paragraphs: [
          'Corprax has a library of ready-made skills tests and job simulations, mostly simulation tasks done in working copies of the tools (spreadsheet, SQL workbench, help desk, CRM, code editor) on a realistic desktop. Each skills module takes about 20 minutes and every candidate gets the same tasks, marked automatically on what they leave behind. Companies can also describe a role and have Corprax build a test for it.',
        ],
      },
    ],
    faqs: [
      { q: 'How long should a pre-hire skills test be?', a: 'About 20 minutes per skill area. Long enough to do real work, short enough that good candidates who already have jobs will finish it.' },
      { q: 'Should the test come before or after the interview?', a: 'Before. Use the scores to decide who to interview, then use the interview to ask how they approached the tasks.' },
      { q: 'Is a skills test fairer than a CV screen?', a: 'It can be, when every candidate does the same tasks, marked against criteria set in advance. It judges the work rather than where someone studied or how their CV is written.' },
    ],
    related: ['skills-tests-vs-job-simulations', 'how-to-create-a-job-simulation', 'hiring-when-every-cv-looks-the-same'],
  },
  {
    slug: 'hiring-when-every-cv-looks-the-same',
    title: 'How to hire the right candidate when every CV looks the same',
    description: 'When AI tools help everyone write a polished CV, CVs stop separating candidates. Here is how to shortlist on evidence of skill instead.',
    answer:
      'When every CV looks the same, stop using the CV to shortlist and use it only to check basics (right to work, location, minimum experience). Shortlist on a short, realistic skills test that every applicant takes, then interview the people who did the work best.',
    updated: '2026-11-24',
    sections: [
      {
        heading: 'Why CVs have stopped working as a filter',
        paragraphs: [
          'AI writing tools make it easy to produce a well-structured, keyword-matched CV for every application. That is not dishonest in itself, but it means the CV now shows how well someone can present themselves, not how well they can do the job. When a hundred applications all claim "advanced Excel" and "excellent communication", the CV cannot tell them apart.',
        ],
      },
      {
        heading: 'A shortlist process that still works',
        numbered: true,
        list: [
          'Screen on facts only: right to work, location or remote fit, notice period, any licence the job legally needs.',
          'Send every remaining applicant the same short skills test, built from the real work of the job.',
          'Rank on the test score. Read the work of the top group, not just the number.',
          'Interview the top scorers. Ask them to walk you through how they did one of the tasks.',
          'Use the CV in the interview, to talk about experience, not to decide who gets one.',
        ],
      },
      {
        heading: 'CV screen vs skills-first screen',
        table: {
          head: ['', 'CV screen', 'Skills-first screen'],
          rows: [
            ['What it measures', 'How the CV is written', 'What the candidate can do'],
            ['Affected by AI writing tools', 'Heavily', 'Much less (the work has to be done)'],
            ['Comparable across candidates', 'Hard: every CV is different', 'Yes: same tasks, same marking'],
            ['Time per candidate for the hiring team', 'Reading every CV', 'Reading a ranked list'],
          ],
        },
      },
      {
        heading: 'Where Corprax fits',
        paragraphs: [
          'Corprax ranks applicants by their scores on job simulations and skills tests rather than by their CVs. Candidates can also keep their Corprax scores on their profile, and in Corprax a profile lists only skills that were proven in a test, never self-listed ones.',
        ],
      },
    ],
    faqs: [
      { q: 'Should I reject CVs written with AI?', a: 'No. Most people now use some AI help with writing. Judge the person on work they do in front of you, not on whether their CV had help.' },
      { q: 'Will a skills test put candidates off?', a: 'A short, realistic test usually does not; a long or irrelevant one does. Keep it to about 20 minutes per skill area and make it look like the actual job.' },
    ],
    related: ['how-to-vet-candidates-when-cvs-are-written-by-ai', 'how-to-test-candidates-skills-before-hiring', 'skills-tests-vs-job-simulations'],
  },
  {
    slug: 'how-to-vet-candidates-when-cvs-are-written-by-ai',
    title: 'How to vet candidates in the age of AI-written CVs',
    description: 'AI can write a convincing CV and cover letter in seconds. Vetting now means checking real ability: work samples under fair conditions, and interviews that test understanding.',
    answer:
      'To vet candidates when CVs may be written by AI, rely on evidence produced under known conditions: a timed work-sample test that everyone takes, marked on the result, followed by an interview where the candidate explains their own work. Treat the CV as a claim to check, not as evidence.',
    updated: '2026-11-24',
    sections: [
      {
        heading: 'What changes, and what does not',
        paragraphs: [
          'What changes: polished writing, perfect keyword matches and confident claims are now cheap, so they carry little information. What does not change: whether someone can actually do the work, and whether they understand it well enough to explain it.',
        ],
      },
      {
        heading: 'A vetting checklist',
        list: [
          'A work-sample test done in a timed session, the same for everyone, in realistic tools.',
          'Clear rules on outside help, and a test design that makes copying answers hard: tasks on data unique to the test, answers that depend on the candidate\'s own work.',
          'An interview question for every score that matters: "talk me through how you did task 2".',
          'A reference check on the specific skills the job needs, not a general character reference.',
        ],
      },
      {
        heading: 'Should candidates be allowed to use AI in the test?',
        paragraphs: [
          "It depends on the job. If people in the role use AI tools every day, testing them without AI tests a way of working they will never use. A better question is whether they use AI well: what they ask, whether they check its answers, and whether the final work is right. Corprax lets companies choose per job whether the job simulation includes an AI assistant (on by default), and shows the company the candidate's full conversation with it.",
        ],
      },
    ],
    faqs: [
      { q: 'Can you tell if a CV was written by AI?', a: 'Not reliably, and it matters less than you might think. Focus on evidence of skill rather than on detecting tools.' },
      { q: 'What is the most reliable signal of ability?', a: 'A realistic work sample done under fair, consistent conditions, followed by the candidate explaining their approach.' },
    ],
    related: ['should-candidates-use-ai-in-hiring-tests', 'hiring-when-every-cv-looks-the-same', 'how-to-test-candidates-skills-before-hiring'],
  },
  {
    slug: 'how-to-create-a-job-simulation',
    title: 'How to create a job simulation (with examples)',
    description: 'A job simulation puts a candidate in a realistic working day for the role. Here is how to design one: the scenario, the tasks, the curveball, and how to mark it.',
    answer:
      'A job simulation is a short, realistic working session for the role: the candidate gets a scenario, the tools and data the job uses, and a sequence of tasks, including an interruption or change of plan, and is marked on the work they leave behind. To create one, pick the job\'s most important work, build a believable day around it with planted issues to spot, and decide in advance how each part is marked.',
    updated: '2026-11-24',
    sections: [
      {
        heading: 'The parts of a good job simulation',
        table: {
          head: ['Part', 'What happens', 'What it shows'],
          rows: [
            ['Briefing', 'Who they are, where, what is on the computer', 'Not marked: sets the scene'],
            ['Core task', 'The most important work of the job, simple first, then harder', 'Can they do the job?'],
            ['Curveball', 'A message changes the plan part-way through', 'Do they adapt their work?'],
            ['Juggling', 'Several small requests at once, one a judgement call', 'Do they prioritise sensibly?'],
            ['Report back', 'A short write-up to the manager', 'Can they explain what they did and what matters?'],
          ],
        },
      },
      {
        heading: 'How to design one',
        numbered: true,
        list: [
          'Pick the job\'s core work and the tools it is done in (help desk, spreadsheet, CRM, code editor).',
          'Write a believable company and day: a few colleagues, an inbox, data that looks real.',
          'Plant two or three issues nobody mentions: a duplicate record, a policy breach, a number that does not add up. Spotting them separates good candidates from great ones.',
          'Add one curveball: a manager changes the deadline or a figure part-way through.',
          'Write the marking first: a check for each thing the candidate should do (a ticket set to the right priority, the right total in a cell, a reply that mentions the refund policy).',
          'Keep it to about 40 minutes for a full day, or 20 for a single skill.',
        ],
      },
      {
        heading: 'Example: a customer support simulation',
        paragraphs: [
          'Corprax\'s customer support simulation is a Monday on the support desk of an online plant shop. The candidate triages a ticket queue in a help desk, replies to a customer whose delivery is late (the courier\'s tracking page shows why), handles a failing discount code by escalating to the technical team, decides on a refund that needs a team lead\'s approval, spots an account-change request that looks like a takeover, and writes a handover to their team lead.',
        ],
      },
      {
        heading: 'Building one with Corprax',
        paragraphs: [
          'Companies on Corprax can use ready-made job simulations or describe a role in a chat and have Corprax build one. Every Corprax job simulation follows the same 40-minute, five-part structure on a realistic desktop with email, files and the job\'s own tools.',
        ],
      },
    ],
    faqs: [
      { q: 'How long should a job simulation take?', a: 'About 40 minutes for a full working day, or around 20 minutes for one skill. Longer simulations lose good candidates.' },
      { q: 'How is a job simulation different from a work trial?', a: 'A work trial is unpaid or paid time in your real business; a simulation is a controlled, identical scenario for every candidate, so results are comparable and nobody works for free.' },
    ],
    related: ['skills-tests-vs-job-simulations', 'example-customer-support-job-simulation', 'how-to-test-candidates-skills-before-hiring'],
  },
  {
    slug: 'skills-tests-vs-job-simulations',
    title: 'Skills tests vs job simulations: which should you use?',
    description: 'Skills tests check one skill in depth; job simulations check whether someone can do the whole job on a realistic day. Here is when to use each, and how to combine them.',
    answer:
      'Use a skills test to check one specific skill in depth (for example Excel, SQL or writing support replies) and a job simulation to check whether someone can do the whole job: prioritise, switch between tools, handle a change of plan and report back. For most roles the best approach is both: two or three short skills tests, then one job simulation for the shortlist.',
    updated: '2026-11-24',
    sections: [
      {
        heading: 'Side by side',
        table: {
          head: ['', 'Skills test', 'Job simulation'],
          rows: [
            ['Measures', 'One skill, in depth', 'The whole job, together'],
            ['Typical length', 'About 20 minutes', 'About 40 minutes'],
            ['Format', 'Tasks in one tool (a spreadsheet, a database, a code editor)', 'A working day across several tools, with emails arriving'],
            ['Best for', 'Screening many applicants on a must-have skill', 'Choosing between a shortlist'],
            ['Shows', 'Can they do this task?', 'Can they do this job, under realistic pressure?'],
          ],
        },
      },
      {
        heading: 'How to combine them',
        numbered: true,
        list: [
          'Send everyone the skills tests for the must-have skills.',
          'Invite the top scorers to the job simulation.',
          'Interview the best few, using their simulation work as the conversation.',
        ],
      },
      {
        heading: 'In Corprax',
        paragraphs: [
          'On Corprax, skills tests are simulation-based too: a candidate does the task in a working copy of the tool (for example cleaning data and building a PivotTable in a spreadsheet), with a few questions answered from their own work. Job simulations put several tools on one desktop for a timed, five-part working day.',
        ],
      },
    ],
    faqs: [
      { q: 'Are multiple-choice skills tests still useful?', a: 'They are quick, but they test recall rather than ability and are easy to look up. Task-based tests in the real tools tell you more.' },
      { q: 'Can a job simulation replace an interview?', a: 'No. It replaces the guesswork before the interview, so the interview can be about how the candidate works.' },
    ],
    related: ['how-to-create-a-job-simulation', 'example-data-analyst-skills-test', 'how-to-test-candidates-skills-before-hiring'],
  },
  {
    slug: 'example-customer-support-job-simulation',
    title: 'Example customer support job simulation',
    description: "A worked example of a customer support job simulation: the scenario, the tasks in each part, the hidden issues, and how each part is marked.",
    answer:
      'A good customer support job simulation gives the candidate a real-looking help desk queue and an inbox, then marks how they triage, follow policy, write to customers, escalate and hand over. Here is the structure of the one in Corprax\'s library, a Monday on the support desk of an online plant shop called Bloomvale.',
    updated: '2026-11-24',
    sections: [
      {
        heading: 'The setting',
        paragraphs: [
          'The candidate is a support advisor at Bloomvale. Their desktop has a help desk with a ticket queue, the company\'s help centre and policies in a browser, a courier tracking site, email with their team lead and colleagues, files, and (if the company allows it) an AI assistant.',
        ],
      },
      {
        heading: 'What happens in each part',
        table: {
          head: ['Part', 'What the candidate does', 'Marked on'],
          rows: [
            ['Briefing', 'Reads who they are and how the day runs', 'Not marked'],
            ['Core task', 'Triages the queue, sorts out a damaged order, finds out from the courier why a member\'s box is late', 'Right priorities and groups, policy followed, an accurate reply'],
            ['Curveball', 'A discount code starts failing at checkout', 'Escalating to the technical team with what they need, passing on the workaround'],
            ['Juggling', 'A refund over the approval limit, an account change that looks like a takeover, a goodwill request outside policy', 'Judgement: approval asked for, security protected, a fair decision explained'],
            ['Report back', 'A handover email to the team lead', 'Clear summary that flags the root cause they found'],
          ],
        },
      },
      {
        heading: 'The hidden issue',
        paragraphs: [
          "The late box is held because the customer's saved address has no house number. A candidate who only apologises gets some marks; one who spots the address problem, fixes the cause and flags that every future box would be held too stands out. Planted issues like this are what make a simulation tell candidates apart.",
        ],
      },
      {
        heading: 'Use it',
        paragraphs: ["The simulation is in Corprax's library of ready-made job simulations, alongside four 20-minute customer support skills modules (ticket triage, communication, refunds and policy, troubleshooting)."],
      },
    ],
    faqs: [
      { q: 'How long does it take?', a: 'About 40 minutes across five timed parts.' },
      { q: 'Can candidates use AI?', a: 'If the hiring company allows it. It is on by default, because support teams increasingly use AI to draft replies; the company sees how the candidate used it.' },
    ],
    related: ['how-to-create-a-job-simulation', 'skills-tests-vs-job-simulations', 'should-candidates-use-ai-in-hiring-tests'],
  },
  {
    slug: 'example-data-analyst-skills-test',
    title: 'Example data analyst skills test (Excel)',
    description: 'A worked example of a 20-minute Excel skills test for data analysts, built from real tasks: cleaning an export, lookups and conditional totals, dynamic arrays, and a quarterly report with Power Query, a PivotTable and a chart.',
    answer:
      "A useful data analyst Excel test has the candidate do the work, not answer questions about it: clean a messy export, look up and summarise data with formulas, answer questions with sorting and filtering, and build a small report. Here is the structure of Corprax's 20-minute Excel test.",
    updated: '2026-11-24',
    sections: [
      {
        heading: 'The four tasks',
        table: {
          head: ['Task', 'What the candidate does', 'Skills covered'],
          rows: [
            ['1. Clean the till export', 'Removes duplicates and a blank row, turns text amounts and mixed-format dates into real values, extracts first names, formats the data as a Table', 'Data cleaning, TRIM, Flash Fill, DATEVALUE, Excel Tables'],
            ['2. Lookups, rules and totals', 'Looks up product names and prices, works out line totals and sizes, builds a summary by region', 'XLOOKUP, IF, IFERROR, SUM, AVERAGE, MEDIAN, MIN, MAX, COUNTA, SUMIFS, COUNTIFS, AVERAGEIFS'],
            ['3. Find the answers', 'Sorts and filters a month of sales, lists each rep once with one formula, returns every large paid sale', 'Sorting, AutoFilter, SORT, UNIQUE, FILTER'],
            ['4. Build the quarterly report', 'Combines three monthly files, summarises revenue by region, charts it, highlights big sales, adds a slicer', 'Power Query, PivotTables, charts, conditional formatting, slicers'],
          ],
        },
      },
      {
        heading: 'How it is marked',
        paragraphs: [
          'Each numbered step is checked on the finished workbook (for example: the duplicates are gone, the totals are right and done by formula, the table is named correctly). Beside each task are one or two questions answered from the candidate\'s own work, such as "which region had the highest web sales?", so the answers cannot simply be looked up.',
        ],
      },
      {
        heading: 'Why tasks rather than quiz questions',
        paragraphs: [
          'Knowing that XLOOKUP exists is not the same as using it on data with a missing product code. A task-based test shows exactly that, and it is much harder to answer with a search engine or a chatbot, because the answers depend on the candidate\'s own workbook.',
        ],
      },
    ],
    faqs: [
      { q: 'Does it need Microsoft Excel installed?', a: 'No. The test runs in a browser-based spreadsheet that works like Excel, including Tables, dynamic arrays, PivotTables and Power Query.' },
      { q: 'What level is it?', a: 'Mid-level: what an analyst should handle comfortably in their first months on the job.' },
    ],
    related: ['skills-tests-vs-job-simulations', 'how-to-test-candidates-skills-before-hiring', 'example-customer-support-job-simulation'],
  },
  {
    slug: 'should-candidates-use-ai-in-hiring-tests',
    title: 'Should candidates be allowed to use AI in hiring tests?',
    description: 'If the job uses AI every day, testing without it tests the wrong thing. Here is how to decide, and how to assess how well candidates use AI.',
    answer:
      'For most office, analyst, support and developer roles, yes: allow AI in at least part of the assessment, because people in those jobs use AI tools every day. Then assess how well they use it (what they ask, whether they check its answers, and whether the final work is right) rather than banning it. Keep AI out only where the job needs the skill unaided.',
    updated: '2026-11-24',
    sections: [
      {
        heading: 'How to decide',
        table: {
          head: ['Situation', 'Recommendation'],
          rows: [
            ['The team uses AI assistants day to day', 'Allow AI, and assess how it is used'],
            ['The job needs the skill without help (e.g. live calls, regulated sign-off)', 'Test without AI for that part'],
            ['You want both', 'Allow AI in the job simulation, keep a short skills test without it'],
          ],
        },
      },
      {
        heading: 'What good AI use looks like',
        list: [
          'Clear, specific prompts with the context the AI needs.',
          'Checking its output against the data or the policy, and fixing what is wrong.',
          'Using it to go faster on drafting, not to skip understanding.',
          'Final work that is correct, whether or not AI helped.',
        ],
      },
      {
        heading: 'How Corprax handles it',
        paragraphs: [
          "Corprax's job simulations include an AI assistant on the candidate's desktop by default, and companies can turn it off per job. Candidates are told before they start whether it is available. When it is on, the company can read the candidate's full conversation with the assistant next to their work.",
        ],
      },
    ],
    faqs: [
      { q: 'Does allowing AI make the test too easy?', a: 'Not if the tasks depend on the candidate\'s own data and judgement. AI can help draft and calculate, but it cannot know which ticket is a takeover attempt unless the candidate reads it properly.' },
      { q: 'Can I see how a candidate used the AI?', a: 'On Corprax, yes: the full conversation is saved with their answers.' },
    ],
    related: ['how-to-vet-candidates-when-cvs-are-written-by-ai', 'how-to-create-a-job-simulation', 'skills-tests-vs-job-simulations'],
  },
];

export const articlePath = (a: Article) => `/resources/${a.slug}/`;
