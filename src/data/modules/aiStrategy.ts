import { AssessmentTest } from '../../types';
import { caseStudy, choice, match, multi, order, short, written } from '../questionKit';
import { B, J, P, S, ModuleSkeleton, tagged } from './kit';
import { roleMain } from './roleKit';

// The AI consultant's fundamentals: what AI tools can and can't do, finding use cases, ROI, risk and law, and change
// management, then a project advising a small business. Client communication is covered by the consulting case test
// (Hypotheses & Communication), tagged for AI consultants in roleTracks.ts.

const AIC: ['AI Consultant'] = ['AI Consultant'];

export const AI_STRATEGY_TESTS: AssessmentTest[] = [
  roleMain(
    'test-aitools-01',
    'AI Tools & Capabilities',
    'AI Strategy',
    'The kinds of AI tool on the market, what today’s models do well and badly, and when to buy, configure or build, then check an AI’s own tool recommendations.',
    ['AI Tools', 'Generative AI', 'Copilots', 'Automation'],
    [...AIC, 'Business Analyst']
  ),
  roleMain(
    'test-usecase-01',
    'Finding AI Use Cases',
    'AI Strategy',
    'Discover where AI helps by mapping real work, prioritise by value, feasibility and data readiness, and scope a pilot with success measures.',
    ['Use Case Discovery', 'Process Mapping', 'Prioritisation', 'Pilot Design'],
    [...AIC, 'Business Analyst']
  ),
  roleMain(
    'test-roi-01',
    'AI ROI & Business Cases',
    'AI Strategy',
    'Count the full costs and the real benefits, build a payback case with sensitivity, and correct an AI-written business case that overclaims.',
    ['ROI', 'Business Cases', 'Cost Modelling', 'Sensitivity Analysis'],
    [...AIC, 'Business Analyst', 'Financial Analyst']
  ),
  roleMain(
    'test-airisk-01',
    'AI Risk, Privacy & Law',
    'AI Strategy',
    'UK GDPR and DPIAs, the EU AI Act’s risk tiers, automated decisions and IP, and operational risks like hallucination, bias and shadow AI.',
    ['AI Governance', 'UK GDPR', 'EU AI Act', 'Risk Management'],
    AIC
  ),
  roleMain(
    'test-aichange-01',
    'AI Change Management & Adoption',
    'AI Strategy',
    'Bring people with you: address fears, train and build champions, and measure real adoption rather than licences bought.',
    ['Change Management', 'AI Adoption', 'Training', 'Stakeholder Management'],
    [...AIC, 'Project Manager']
  ),
  roleMain(
    'test-sim-aic-01',
    'AI Consultant Project: Greenfield Lettings',
    'AI Strategy',
    'A 28-person lettings agency wants to “do AI”. Recommend where to use it, estimate the ROI, flag the risks and present a rollout plan to the owners.',
    ['AI Strategy', 'ROI', 'AI Risk', 'Rollout Planning'],
    AIC,
    'Professional'
  ),
];

// ---------- AI tools ----------
export const AI_TOOLS_MODULE: ModuleSkeleton = {
  familyId: 'test-aitools-01',
  aspects: [
    { id: 'landscape', name: 'The Tool Landscape', summary: 'Assistants, copilots, agents, automation and specialist tools.' },
    { id: 'fit', name: 'Strengths & Limits', summary: 'What today’s AI does well, badly and unpredictably.' },
    { id: 'buy', name: 'Buy, Configure or Build', summary: 'Choosing the cheapest route that does the job.' },
    { id: 'case', name: 'Tool Cases', summary: 'Real client needs: pick and justify.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'landscape',
      B,
      match('m-at-l-b1', 'Kinds of Tool', 'Match each kind of tool to an example of what it does.', [
        ['General AI assistant (chat)', 'Drafts, summarises and answers questions for one person'],
        ['Copilot in an existing app', 'Writes formulas in a spreadsheet or replies in an email client'],
        ['Workflow automation with AI steps', 'Reads incoming invoices and files them in the accounts system'],
        ['AI agent', 'Takes a goal and uses several tools on its own to reach it'],
      ])
    ),
    ...tagged(
      'landscape',
      J,
      choice(
        'm-at-l-j1',
        'Meeting Notes',
        'A 15-person firm wants meeting summaries and actions. They already pay for Microsoft 365 or Google Workspace. What do you look at first?',
        ['The AI features in the suite they have (or its add-on), before buying another tool', 'A custom-built model', 'A new CRM', 'Hiring a data scientist'],
        0
      )
    ),
    ...tagged(
      'landscape',
      P,
      choice(
        'm-at-l-p1',
        'Consumer vs Business',
        'Staff are using free consumer AI chat apps with client documents. What’s the key difference with business plans?',
        ['Business plans typically offer contracts on data use (e.g. not training on your data), admin controls, retention settings and audit; free consumer use may not', 'Business plans are just faster', 'There is no difference', 'Consumer apps are more secure'],
        0
      )
    ),
    ...tagged(
      'landscape',
      S,
      choice(
        'm-at-l-s1',
        'Vendor Lock-in',
        'A client wants to build every workflow on one vendor’s proprietary agent platform. What do you raise?',
        ['Lock-in and portability: how prompts, data and workflows could move, the vendor’s pricing power, and keeping the AI layer swappable where it matters', 'Nothing; one vendor is simpler', 'Use five vendors for everything', 'Avoid AI'],
        0
      )
    ),
    ...tagged(
      'fit',
      B,
      multi(
        'm-at-f-b1',
        'Good Fits',
        'Which tasks does today’s generative AI usually do well? Tick all that apply.',
        ['Drafting a first version of an email or document', 'Summarising a long report', 'Pulling fields out of varied documents', 'Guaranteeing every fact it states is true'],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'fit',
      J,
      choice(
        'm-at-f-j1',
        'Exact Sums',
        'A client wants AI to calculate VAT returns directly. What do you advise?',
        ['Use accounting software for the calculation; AI can help extract and categorise transactions, with checks before filing', 'Let the chatbot calculate and file them', 'AI is always precise with numbers', 'Don’t use software'],
        0
      )
    ),
    ...tagged(
      'fit',
      P,
      choice(
        'm-at-f-p1',
        'Variability',
        'The same prompt gives slightly different answers each time. When does that matter most?',
        ['Where outputs must be consistent and auditable (decisions about people, compliance), so design with fixed rules, structured outputs and review', 'Never', 'Only for creative writing', 'Only on weekends'],
        0
      )
    ),
    ...tagged(
      'fit',
      S,
      choice(
        'm-at-f-s1',
        'The Demo Gap',
        'A vendor demo answered every question perfectly. What do you insist on before buying?',
        ['A trial on the client’s own messy data and real cases, measured against agreed success criteria', 'Nothing; the demo was great', 'A longer demo', 'A discount'],
        0
      )
    ),
    ...tagged(
      'buy',
      B,
      choice(
        'm-at-b-b1',
        'Buy First',
        'For a common need (transcribing calls), what’s usually the best first option?',
        ['Buy an established tool, rather than build one', 'Build your own model', 'Hire a team to build it', 'Wait'],
        0
      )
    ),
    ...tagged(
      'buy',
      J,
      choice(
        'm-at-b-j1',
        'When to Build',
        'When does a custom build make sense?',
        ['When the process is core to how the business competes, off-the-shelf tools don’t fit, and the volume justifies the cost of building and maintaining it', 'Always', 'When the CEO likes AI', 'When there’s no data'],
        0
      )
    ),
    ...tagged(
      'buy',
      P,
      multi(
        'm-at-b-p1',
        'Choosing a Vendor',
        'What do you check when choosing an AI vendor? Tick all that apply.',
        ['Where data is stored and whether it’s used for training', 'Security certifications (e.g. ISO 27001, SOC 2)', 'Performance on the client’s own sample data', 'Pricing at the client’s expected volume', 'How many AI buzzwords are on the website'],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'buy',
      S,
      choice(
        'm-at-b-s1',
        'Total Cost',
        'Building seems cheaper than a £30k/year licence. What’s usually missing from the build estimate?',
        ['Ongoing maintenance, monitoring, model and API changes, security, support and the people to run it', 'Nothing', 'The licence cost', 'Office rent'],
        0
      )
    ),
    ...tagged('case', B, short('m-at-x-b1', 'Annual Licences', 'An AI assistant costs £25 per user per month. What does it cost for 20 users for a year, in £?', ['6000', '£6,000', '6,000', '£6000'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-at-x-j',
        'The Client’s Wishes',
        `A 40-person architecture practice wants to:
1. Summarise client meetings and list actions
2. Draft planning-application cover letters from project notes
3. Produce design renders from sketches
4. Automatically decide which job applicants to interview

They use Microsoft 365, a project tool, and a CAD package that has just added AI rendering.`,
        'Client brief'
      ),
      match(
        'm-at-x-j1',
        'Match the Route',
        'Match each wish to the most sensible route.',
        [
          ['1. Meeting summaries', 'The AI features in their office suite'],
          ['2. Cover letters', 'A business AI assistant with their templates, reviewed by an architect'],
          ['3. Renders', 'Trial the CAD package’s new AI features'],
          ['4. Choosing applicants', 'Don’t automate the decision; a high-risk use that needs human judgement'],
        ],
        { taskId: 'm-at-x-j' }
      ),
      written(
        'm-at-x-j2',
        'Your Advice',
        'Write a short note to the practice’s partners with your advice on the four wishes.',
        [
          'Uses tools they already have where possible (office suite, CAD) before buying new ones',
          'Keeps people reviewing anything that goes to clients or planners',
          'Advises against automating applicant decisions and explains why (fairness, law, high-risk), offering a safer use',
          'Suggests starting small with a measured trial',
        ],
        `Start with what you already pay for. Meeting summaries are built into Microsoft 365's AI add-on, and your CAD package's new rendering features are worth a two-week trial on a live project. For cover letters, a business AI assistant loaded with your best past letters will produce good first drafts, which an architect then checks before anything goes to a planning officer. I'd advise against letting AI decide who to interview: it's a high-risk use under data protection law, easy to get unfair, and you'd need to explain each decision. AI can help write clearer job adverts or summarise CVs for a person to read. Trial one or two of these for a month and measure the time saved before rolling out.`,
        { taskId: 'm-at-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-at-x-p',
        'An AI’s Tool Recommendation',
        `A client asked an AI assistant which tools to adopt. It replied:

"For your 12-person accountancy firm I recommend:
1. Train your own large language model on client files for full control (approx. £5,000).
2. Use a free consumer chatbot for client tax queries; it's GDPR compliant by default.
3. Replace your accounting software with an AI agent that files returns automatically.
4. Adopt an AI meeting assistant for client calls."`,
        'AI assistant’s answer'
      ),
      multi(
        'm-at-x-p1',
        'What’s Wrong',
        'Which recommendations are wrong or unsafe? Tick all that apply.',
        [
          'Training their own LLM for about £5,000 is unrealistic for a 12-person firm and unnecessary',
          '“GDPR compliant by default” is false: using a free consumer tool with client data needs checking and likely isn’t appropriate',
          'Replacing accounting software with an agent that files returns unattended is unsafe',
          'An AI meeting assistant for client calls can be reasonable, with consent and a business plan',
        ],
        [0, 1, 2],
        { taskId: 'm-at-x-p' }
      ),
      written(
        'm-at-x-p2',
        'Your Corrected Advice',
        'Write the advice you’d give instead.',
        [
          'Use business-grade AI tools with data-use terms, not free consumer ones, for anything with client data',
          'Keep accounting software for calculations and filing; use AI around it (categorising, drafting client emails) with review',
          'No custom model: configure existing tools with the firm’s templates and knowledge',
          'Keeps the meeting assistant with client consent, a DPIA where needed, and a trial',
        ],
        `Don't train a model of your own — it would cost far more than £5,000 and you don't need it; a business AI assistant set up with your templates and guidance notes will do the drafting work. Keep client data out of free consumer chatbots: use a business plan with a contract that says your data isn't used for training, and check it against your GDPR duties. Keep your accounting software doing the sums and filing; use AI around it, for example to categorise bank transactions or draft client emails, always checked by an accountant. An AI meeting assistant is a sensible start — tell clients it's recording, get their agreement, and trial it for a month.`,
        { taskId: 'm-at-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-at-x-s',
        'Build or Buy?',
        `A 300-person insurer wants AI to read incoming claim emails and attachments, extract details and route them. 9,000 claims a month.

Option A: a claims-AI product. £60,000/year licence, live in 3 months, 85% of fields extracted correctly in their trial on 500 real claims.
Option B: build in-house on an LLM API. Estimated £90,000 to build, £35,000/year to run and maintain, live in 9 months, untested.`,
        'Options'
      ),
      short(
        'm-at-x-s1',
        'Three-year Cost of B',
        'What is the three-year cost of Option B, in £? (Build plus three years of running.)',
        ['195000', '£195,000', '195,000', '£195000'],
        { taskId: 'm-at-x-s' }
      ),
      written(
        'm-at-x-s2',
        'Your Recommendation',
        'Write your recommendation to the insurer’s board.',
        [
          'Compares costs: A £180,000 over three years vs B £195,000, before any build overrun',
          'Weighs evidence: A is tested on their own claims (85%); B is an estimate with no results',
          'Weighs time: A is live 6 months sooner, so savings start earlier',
          'Recommends A with conditions (contract terms on data, exit, performance), and a review point, while noting when building would make sense',
        ],
        `Go with Option A. Over three years it costs £180,000 against £195,000 for building, and building estimates usually grow. More importantly, A has been tested on 500 of your own claims at 85% accuracy, while B is a plan with no results, and A goes live six months sooner, so savings start six months earlier. Conditions: a contract that keeps your data out of the vendor's training, lets you export your data and configuration if you leave, and commits to accuracy targets; and a review at 12 months. If claims handling becomes something you want to compete on, or volumes grow a lot, revisit building then with A's results as the benchmark.`,
        { taskId: 'm-at-x-s' }
      )
    ),
  ],
};

// ---------- Use cases ----------
export const USE_CASE_MODULE: ModuleSkeleton = {
  familyId: 'test-usecase-01',
  aspects: [
    { id: 'discover', name: 'Discovery', summary: 'Finding where time, cost and errors really go.' },
    { id: 'prioritise', name: 'Prioritising', summary: 'Value, feasibility, risk and data readiness.' },
    { id: 'pilot', name: 'Scoping Pilots', summary: 'Small, measurable trials that answer one question.' },
    { id: 'case', name: 'Use Case Cases', summary: 'Real businesses: find, rank and scope.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'discover',
      B,
      choice(
        'm-uc-d-b1',
        'Where to Start',
        'How do you start finding AI use cases in a business?',
        ['Look at the work: which tasks take most time, are repetitive, or cause errors and delays', 'Ask which AI tools are trendy', 'Start with the biggest model', 'Buy licences for everyone first'],
        0
      )
    ),
    ...tagged(
      'discover',
      J,
      multi(
        'm-uc-d-j1',
        'Good Signs',
        'Which make a task a promising AI use case? Tick all that apply.',
        ['High volume and repetitive', 'Mostly reading, writing or sorting text', 'Errors are easy to check', 'One-off and rare', 'Needs a legally binding decision with no review'],
        [0, 1, 2]
      )
    ),
    ...tagged(
      'discover',
      P,
      choice(
        'm-uc-d-p1',
        'Ask the Doers',
        'Managers say the bottleneck is reporting; frontline staff say it’s chasing missing documents. What do you do?',
        ['Measure it: time a sample of work or look at the system data, since the people doing the work often see a different bottleneck', 'Believe the managers', 'Believe the staff', 'Do both projects at once'],
        0
      )
    ),
    ...tagged(
      'discover',
      S,
      choice(
        'm-uc-d-s1',
        'Fix the Process First',
        'An approval takes 12 days because it waits in four inboxes. The client wants AI to speed it up. What’s your view?',
        ['The delay is the process, not the work; cut approval steps and set rules first, then see where AI still helps', 'AI will fix it', 'Add a fifth approver', 'Nothing can be done'],
        0
      )
    ),
    ...tagged(
      'prioritise',
      B,
      choice(
        'm-uc-p-b1',
        'Quick Wins',
        'On a value vs effort chart, which use cases go first?',
        ['High value, low effort', 'Low value, high effort', 'Low value, low effort', 'High value, high effort'],
        0
      )
    ),
    ...tagged(
      'prioritise',
      J,
      choice(
        'm-uc-p-j1',
        'Data Readiness',
        'A use case needs five years of customer emails, which are spread across personal inboxes and partly deleted. What does that do to its priority?',
        ['Lowers it until the data is gathered and usable, which is a project of its own', 'Nothing', 'Raises it', 'Makes it a quick win'],
        0
      )
    ),
    ...tagged(
      'prioritise',
      P,
      choice(
        'm-uc-p-p1',
        'Risk in the Ranking',
        'Two use cases save similar time: drafting marketing copy, and screening loan applications. Why rank them differently?',
        ['Loan screening affects people’s finances and is high-risk under data protection and AI rules, needing far more controls; start with the low-risk one', 'They’re the same', 'Loans first; more money', 'Do neither'],
        0
      )
    ),
    ...tagged(
      'prioritise',
      S,
      choice(
        'm-uc-p-s1',
        'A Portfolio',
        'A client has 25 ideas. What do you recommend?',
        ['A short portfolio: two or three quick, low-risk wins to build skills and trust, one bigger bet with a clear business case, and the rest parked with reasons', 'All 25 at once', 'Only the biggest', 'Only the cheapest'],
        0
      )
    ),
    ...tagged(
      'pilot',
      B,
      choice(
        'm-uc-l-b1',
        'A Pilot',
        'What is the point of a pilot?',
        ['To test on a small scale whether the use case works and is worth it, before rolling out', 'To launch to everyone', 'To impress the board', 'To buy licences'],
        0
      )
    ),
    ...tagged(
      'pilot',
      J,
      choice(
        'm-uc-l-j1',
        'Success Measure',
        'Which is the best success measure for an AI email-drafting pilot in customer service?',
        ['Average handling time per email and customer satisfaction, compared with a baseline', '“Staff like it”', 'Number of logins', 'Number of AI features used'],
        0
      )
    ),
    ...tagged(
      'pilot',
      P,
      choice(
        'm-uc-l-p1',
        'A Fair Comparison',
        'How do you know the time savings came from the AI and not something else?',
        ['Measure a baseline before, and compare with a similar team not using it over the same period', 'Ask the users', 'Compare with last year', 'Assume it'],
        0
      )
    ),
    ...tagged(
      'pilot',
      S,
      choice(
        'm-uc-l-s1',
        'Pilot Purgatory',
        'A client has run six AI pilots in a year and scaled none. What’s missing?',
        ['Up-front criteria for scaling or stopping, an owner and budget for rollout, and pilots chosen where a scale decision is realistic', 'More pilots', 'Bigger models', 'More consultants'],
        0
      )
    ),
    ...tagged('case', B, short('m-uc-x-b1', 'Hours Saved', 'A task takes 10 minutes and happens 600 times a month. AI halves it. How many hours a month are saved?', ['50', '50 hours'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-uc-x-j',
        'A Dental Group',
        `A dental group with 6 practices. What staff told you:

Task                                   Volume / month   Time each   Notes
Answering appointment-booking calls    4,000            4 min       Many after hours; missed calls lose bookings
Writing referral letters               300              15 min      Template-based, dentist must sign
Chasing unpaid invoices                500              6 min       Mostly standard reminders
Reading X-rays for decay               2,500            2 min       Clinical judgement; regulated`,
        'Discovery notes'
      ),
      short('m-uc-x-j1', 'Most Hours', 'Which task takes the most staff hours a month?', ['appointment-booking calls', 'booking calls', 'answering appointment-booking calls', 'appointment booking', 'calls'], { taskId: 'm-uc-x-j' }),
      written(
        'm-uc-x-j2',
        'Your Ranking',
        'Rank the four tasks as AI use cases and explain your reasoning.',
        [
          'Ranks booking calls high: most hours (about 267/month), missed calls lose revenue, mature tools exist (AI phone/booking, online booking)',
          'Referral letters and invoice reminders as quick, low-risk wins with a person signing off',
          'X-ray reading last or out of scope for now: regulated clinical decision needing approved medical devices',
          'Mentions measuring and patient-data protection',
        ],
        `1. Booking calls: by far the most time (4,000 × 4 min, about 267 hours a month) and missed after-hours calls lose bookings. An online/AI booking assistant linked to the diary is a mature option. 2. Referral letters: drafting from the notes and template saves 300 × most of 15 minutes, low risk because the dentist reviews and signs. 3. Invoice reminders: mostly standard, so automate them in the practice software (with AI only for unusual replies). 4. X-rays: leave for now. It's a clinical decision, and any tool must be an approved medical device with clinical governance; a separate, slower project if at all. Throughout, patient data needs a DPIA and business-grade tools.`,
        { taskId: 'm-uc-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-uc-x-p',
        'An AI’s Use Case List',
        `A client asked an AI assistant for their top AI use cases. It said, for a 50-person logistics firm:

"Top 3 opportunities (estimated savings):
1. AI route optimisation: saves 40% of fuel (£400,000/year).
2. Fully autonomous customer service agent replacing all 8 support staff (£280,000/year).
3. AI to write and send driver disciplinary letters automatically (£20,000/year)."

The firm's annual fuel bill is £600,000. It already uses route-planning software.`,
        'AI assistant’s answer'
      ),
      multi(
        'm-uc-x-p1',
        'Problems',
        'Which are real problems with the AI’s list? Tick all that apply.',
        [
          '40% fuel savings is implausible, especially as they already plan routes; and 40% of £600,000 is £240,000, not £400,000',
          'Replacing all support staff overnight ignores complex cases, quality and the change itself',
          'Automated disciplinary letters with no human decision is an employment-law and fairness risk',
          'No figures are tied to the firm’s own data',
          'Logistics firms can’t use AI',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-uc-x-p' }
      ),
      written(
        'm-uc-x-p2',
        'What You’d Do Instead',
        'Write how you’d actually build the use-case list for this client.',
        [
          'Starts from discovery with the firm’s data: where hours, costs and errors are',
          'Sizes savings from their own baselines with conservative ranges (e.g. a few % on fuel beyond current routing)',
          'Proposes realistic use cases, e.g. AI drafts for support with escalation, proof-of-delivery and invoice processing',
          'Excludes or adds human control to people decisions like discipline',
        ],
        `I'd start with discovery: two days with the operations and support teams and their system data — fuel, routes, support tickets, invoice volumes — to see where time and money really go. Savings get sized from their own baselines, as ranges: since they already plan routes, AI might add a few percent on fuel, worth testing on one depot. Likely candidates: support emails drafted by AI with staff reviewing and taking the hard cases, reading proof-of-delivery and invoice documents automatically, and forecasting volumes for staffing. Anything that decides about people, like discipline, stays a manager's decision; AI could at most help draft a letter a manager writes and signs.`,
        { taskId: 'm-uc-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-uc-x-s',
        'Scoring the Shortlist',
        `Five use cases for a 200-person housing association, scored 1–5 (5 is best):

Use case                          Value  Feasibility  Data ready  Risk (5 = low)
Repairs request triage            5      4            5           4
Tenant letter drafting            3      5            5           4
Rent arrears prediction           4      3            2           2
Board report summaries            2      5            5           5
Automated tenancy decisions       4      2            3           1`,
        'Scoring table'
      ),
      short(
        'm-uc-x-s1',
        'Top Total',
        'Adding the four scores, which use case scores highest?',
        ['repairs request triage', 'repairs triage', 'repairs'],
        { taskId: 'm-uc-x-s' }
      ),
      written(
        'm-uc-x-s2',
        'Your Roadmap',
        'Write a 12-month roadmap from this table.',
        [
          'Starts with repairs triage (18), then tenant letters (17), with board summaries (17) as a quick, low-risk add-on',
          'Treats arrears prediction as later, after data work and a fairness/DPIA review, with humans deciding',
          'Rejects or heavily limits automated tenancy decisions: high risk to tenants and likely unlawful as a solely automated decision',
          'Gives phases, owners and measures, e.g. repair response times, letter turnaround',
        ],
        `Months 1–4: repairs triage (the top score, 18), sorting and prioritising requests so urgent repairs go first, measured by response times; and tenant letter drafting (17), with staff reviewing every letter. Board summaries (also 17) is a quick add-on using the AI features of tools we already have. Months 5–8: data work for arrears prediction (only 11, with data readiness 2): clean the payment history and run a DPIA and fairness review, then a pilot that flags tenants for supportive contact, never for automatic action. Not on the roadmap: automated tenancy decisions (10, risk 1). Decisions about people's homes need a person, and solely automated decisions with that effect are legally restricted.`,
        { taskId: 'm-uc-x-s' }
      )
    ),
  ],
};

// ---------- ROI ----------
export const ROI_MODULE: ModuleSkeleton = {
  familyId: 'test-roi-01',
  aspects: [
    { id: 'costs', name: 'Counting Costs', summary: 'Licences, usage, set-up, training and running it.' },
    { id: 'benefits', name: 'Counting Benefits', summary: 'Time saved, valued honestly, and what it really frees up.' },
    { id: 'model', name: 'Building the Case', summary: 'Payback, ranges and the assumptions that matter.' },
    { id: 'case', name: 'ROI Cases', summary: 'Real numbers to work through and challenge.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'costs',
      B,
      multi(
        'm-roi-c-b1',
        'Costs to Count',
        'Which belong in the cost of rolling out an AI tool? Tick all that apply.',
        ['Licences or usage fees', 'Set-up and integration', 'Staff training time', 'Ongoing support and review', 'The office coffee budget'],
        [0, 1, 2, 3]
      )
    ),
    ...tagged(
      'costs',
      J,
      short(
        'm-roi-c-j1',
        'Year One',
        'Licences cost £30 per user per month for 50 users. Set-up is £8,000 and training is £4,000. What is the first-year cost in £?',
        ['30000', '£30,000', '30,000', '£30000']
      )
    ),
    ...tagged(
      'costs',
      P,
      choice(
        'm-roi-c-p1',
        'Usage-based Pricing',
        'An AI tool is priced per use, and the pilot used it lightly. What do you do for the business case?',
        ['Model costs at full expected volume with a range, and set a budget alert or cap', 'Use the pilot’s bill', 'Assume it’s free', 'Ignore usage'],
        0
      )
    ),
    ...tagged(
      'costs',
      S,
      choice(
        'm-roi-c-s1',
        'Hidden Costs',
        'Which cost is most often left out of AI business cases?',
        ['The time people spend reviewing and fixing AI output, and keeping the system up to date', 'Licences', 'Laptops', 'Internet'],
        0
      )
    ),
    ...tagged(
      'benefits',
      B,
      short(
        'm-roi-b-b1',
        'Time Saved',
        'AI saves each of 10 staff 2 hours a week. How many hours a week in total?',
        ['20', '20 hours']
      )
    ),
    ...tagged(
      'benefits',
      J,
      choice(
        'm-roi-b-j1',
        'Is Time Saved Money?',
        'Staff save 3 hours a week. When does that become a financial saving?',
        ['When it’s turned into something: less overtime or agency spend, avoided hiring, or more billable or sales work', 'Always, at their full salary', 'Never', 'Only if they go home early'],
        0
      )
    ),
    ...tagged(
      'benefits',
      P,
      choice(
        'm-roi-b-p1',
        'Adoption Rate',
        'The case assumes all 200 staff save 2 hours a week. What’s the first assumption to challenge?',
        ['Adoption: not everyone will use it well, so model a realistic share (e.g. 40–60%) and ramp-up', 'The number of staff', 'The hours in a week', 'The currency'],
        0
      )
    ),
    ...tagged(
      'benefits',
      S,
      choice(
        'm-roi-b-s1',
        'Beyond Time',
        'Which benefits can matter as much as time saved?',
        ['Faster response to customers, fewer errors, and capacity to grow without hiring, each measured, not assumed', 'Using the latest technology', 'Staff talking about AI', 'Press coverage'],
        0
      )
    ),
    ...tagged(
      'model',
      B,
      short(
        'm-roi-m-b1',
        'Payback',
        'A tool costs £12,000 and saves £1,000 a month. How many months until it pays back?',
        ['12', '12 months']
      )
    ),
    ...tagged(
      'model',
      J,
      short(
        'm-roi-m-j1',
        'ROI',
        'Over a year, benefits are £45,000 and costs £30,000. What is the ROI as a %? (Net benefit divided by cost.)',
        ['50%', '50', '0.5']
      )
    ),
    ...tagged(
      'model',
      P,
      choice(
        'm-roi-m-p1',
        'Sensitivity',
        'Which part of a business case should you show the client most clearly?',
        ['How the result changes when the key assumptions (adoption, time saved per task, value of time) are lower than hoped', 'The best case only', 'The total licence cost only', 'The vendor’s brochure figures'],
        0
      )
    ),
    ...tagged(
      'model',
      S,
      choice(
        'm-roi-m-s1',
        'Proving It Afterwards',
        'How do you set up a business case so the ROI can be checked a year later?',
        ['Record the baseline measures now, agree who measures what and when, and review against them', 'Rely on staff surveys', 'Assume it worked', 'Count logins'],
        0
      )
    ),
    ...tagged('case', B, short('m-roi-x-b1', 'Annual Value', 'AI saves 20 hours a week of staff time valued at £25 an hour. What is that worth over 48 working weeks, in £?', ['24000', '£24,000', '24,000', '£24000'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-roi-x-j',
        'A Recruitment Agency',
        `A 20-consultant recruitment agency is considering an AI tool that drafts candidate summaries and job adverts.

- Licence: £40 per consultant per month
- Set-up and training: £6,000 one-off
- Pilot result: each consultant saves 3 hours a week
- Consultants' time is valued at £30/hour
- 46 working weeks a year
- Expected adoption: 70% of consultants use it regularly`,
        'Business case inputs'
      ),
      short('m-roi-x-j1', 'Annual Cost', 'What is the first-year cost, in £?', ['15600', '£15,600', '15,600', '£15600'], { taskId: 'm-roi-x-j' }),
      short(
        'm-roi-x-j2',
        'Annual Benefit',
        'What is the annual value of time saved, allowing for 70% adoption, in £?',
        ['57960', '£57,960', '57,960', '£57960'],
        { taskId: 'm-roi-x-j' }
      ),
      written(
        'm-roi-x-j3',
        'The Case',
        'Write a short summary of the business case for the agency’s director.',
        [
          'Gives cost £15,600 (licences £9,600 + £6,000) and benefit about £58,000 at 70% adoption',
          'Says how the time saved turns into money (more placements or calls), not just hours',
          'Shows a downside case, e.g. half the time saving or lower adoption',
          'Recommends with a way to measure it (placements, time per submission)',
        ],
        `Year one costs £15,600: £9,600 of licences and £6,000 to set up and train. If 14 of the 20 consultants use it regularly and save 3 hours a week, that's about 1,930 hours a year, worth £57,960 at £30 an hour. Even if it saves half as much as in the pilot, it still pays for itself. The money only turns up if consultants spend those hours on sourcing and calls, so we should track placements and time per submission against today's numbers. My recommendation: go ahead, review at six months.`,
        { taskId: 'm-roi-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-roi-x-p',
        'An AI-Written Business Case',
        `An AI assistant wrote this business case for an AI customer-service assistant at a 60-agent contact centre:

"Each agent handles 50 contacts a day. AI handles 80% of contacts, so we need 80% fewer agents: 48 fewer agents × £28,000 = £1,344,000 saved per year. Cost: £50,000/year. ROI: 2,588%. Payback: 2 weeks."

The vendor's pilot elsewhere: the AI fully resolved 30% of chat contacts; phone contacts (60% of volume here) weren't in scope.`,
        'AI-written business case'
      ),
      multi(
        'm-roi-x-p1',
        'The Flaws',
        'Which are real flaws? Tick all that apply.',
        [
          '80% resolution has no basis; the pilot showed 30% on chats only',
          'Phone contacts (60% of volume) weren’t in the pilot at all',
          'It assumes contacts handled turn straight into agents removed, ignoring harder remaining contacts and change costs',
          'Costs leave out set-up, integration, training and review',
          'ROI can’t be calculated for software',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-roi-x-p' }
      ),
      short(
        'm-roi-x-p2',
        'Share Resolved',
        'If the AI resolves 30% of chat contacts and chats are 40% of all contacts, what share of all contacts does it resolve? (As a %.)',
        ['12%', '12', '0.12'],
        { taskId: 'm-roi-x-p' }
      ),
      written(
        'm-roi-x-p3',
        'A Realistic Case',
        'Rewrite the case realistically, with your assumptions stated.',
        [
          'Starts from evidence: about 12% of all contacts resolved (30% of the 40% that are chats)',
          'Turns that into capacity (about 7 agents’ work) used through attrition, redeployment or less overtime, not instant cuts',
          'Includes full costs (licence plus set-up, integration, training and quality review)',
          'Shows a range and proposes a pilot on their own chats to confirm before any phone rollout',
        ],
        `Based on the vendor's evidence, the AI resolves about 30% of chats, and chats are 40% of contacts here, so about 12% of all contacts. That's roughly 7 agents' worth of work out of 60 — around £200,000 a year of capacity — realised over time through normal staff turnover and less overtime, not redundancies on day one, and partly offset because the remaining contacts are harder. Costs: £50,000 a year plus perhaps £40,000 to set up, integrate and train, and a person reviewing AI conversations. Net benefit in year one is roughly £60,000–£110,000 depending on how quickly capacity is used. Before committing: a three-month pilot on our own chats, measuring resolution, satisfaction and handling time; phones only once chats prove out.`,
        { taskId: 'm-roi-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-roi-x-s',
        'Sensitivity',
        `Invoice-processing AI for a wholesaler:

Base case: 6,000 invoices/month, 8 minutes each today, AI cuts it to 2 minutes, staff cost £24/hour.
Costs: £36,000/year all-in.

The finance director asks: "What if it only cuts it to 5 minutes, and only for 70% of invoices?"`,
        'Inputs'
      ),
      short(
        'm-roi-x-s1',
        'Base Case Saving',
        'What is the base-case annual saving in staff cost, in £? (12 months.)',
        ['172800', '£172,800', '172,800', '£172800'],
        { taskId: 'm-roi-x-s' }
      ),
      short(
        'm-roi-x-s2',
        'Downside Saving',
        'What is the annual saving in the finance director’s downside case, in £?',
        ['60480', '£60,480', '60,480', '£60480'],
        { taskId: 'm-roi-x-s' }
      ),
      written(
        'm-roi-x-s3',
        'Your Answer',
        'Write your answer to the finance director.',
        [
          'Base case: 6 minutes saved × 6,000 × 12 = 7,200 hours, £172,800 against £36,000 cost',
          'Downside: 3 minutes × 4,200 × 12 = 2,520 hours, £60,480, still above £36,000',
          'Notes the break-even point (e.g. about 1.25 minutes saved per invoice across all invoices) and what drives it',
          'Proposes measuring actual minutes per invoice in the first months, with a stop or renegotiate point',
        ],
        `Even in your downside case it pays. Base case: 6 minutes saved on each of 6,000 invoices a month is 7,200 hours a year, £172,800 against £36,000 of cost. Your case: 3 minutes saved on 4,200 invoices a month is 2,520 hours, £60,480 — still £24,480 more than it costs. It breaks even at about 1,500 hours a year, which is 1 minute 15 seconds saved per invoice across all of them. I'd measure the real minutes per invoice for the first three months against today's 8, with a break clause in the contract if it saves less than 2 minutes.`,
        { taskId: 'm-roi-x-s' }
      )
    ),
  ],
};

// ---------- Risk, privacy & law ----------
export const AI_RISK_MODULE: ModuleSkeleton = {
  familyId: 'test-airisk-01',
  aspects: [
    { id: 'privacy', name: 'Data Protection', summary: 'UK GDPR, DPIAs, lawful basis and suppliers.' },
    { id: 'law', name: 'AI Law & IP', summary: 'The EU AI Act, automated decisions, copyright and transparency.' },
    { id: 'ops', name: 'Operational Risk', summary: 'Hallucinations, bias, security and shadow AI.' },
    { id: 'case', name: 'Risk Cases', summary: 'Real proposals: find the risks and the controls.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'privacy',
      B,
      choice(
        'm-rk-p-b1',
        'Personal Data',
        'Under UK GDPR, which is personal data?',
        ['A customer’s name and email in a support ticket', 'A company’s annual revenue', 'A weather forecast', 'A product price list'],
        0
      )
    ),
    ...tagged(
      'privacy',
      J,
      choice(
        'm-rk-p-j1',
        'A DPIA',
        'When is a Data Protection Impact Assessment needed?',
        ['When processing is likely to be high-risk to people, e.g. new technology on personal data at scale or profiling', 'Never for AI', 'Only after a breach', 'Only for paper records'],
        0
      )
    ),
    ...tagged(
      'privacy',
      P,
      choice(
        'm-rk-p-p1',
        'The AI Vendor',
        'An AI vendor will process customer data for the client. What must be in place?',
        ['A data processing agreement setting out what they may do with the data, security, sub-processors, international transfers and deletion', 'Nothing; it’s the vendor’s problem', 'A non-disclosure agreement only', 'Customer consent for every use'],
        0
      )
    ),
    ...tagged(
      'privacy',
      S,
      choice(
        'm-rk-p-s1',
        'Data Minimisation',
        'A team wants to send full customer records to an AI model to write marketing emails. What do you advise?',
        ['Send only the fields needed (e.g. first name and last purchase), check the lawful basis and marketing consent, and keep special-category data out', 'Send everything; more context is better', 'Anonymise nothing', 'Ask the model to forget it afterwards'],
        0
      )
    ),
    ...tagged(
      'law',
      B,
      match('m-rk-l-b1', 'EU AI Act Tiers', 'Match each example to its EU AI Act risk tier.', [
        ['Social scoring of citizens by public authorities', 'Prohibited'],
        ['AI screening job applicants', 'High-risk'],
        ['A customer-service chatbot', 'Limited risk: tell people it’s AI'],
        ['A spam filter', 'Minimal risk'],
      ])
    ),
    ...tagged(
      'law',
      J,
      choice(
        'm-rk-l-j1',
        'A UK Firm and the EU',
        'A UK company offers an AI hiring tool to employers in France. Does the EU AI Act matter to it?',
        ['Yes: it applies to AI systems placed on the EU market or used in the EU, wherever the provider is based', 'No; the UK left the EU', 'Only if it has an EU office', 'Only for public sector clients'],
        0
      )
    ),
    ...tagged(
      'law',
      P,
      choice(
        'm-rk-l-p1',
        'Automated Decisions',
        'A lender wants AI to approve or decline loans with no human involved. What does UK GDPR require?',
        ['Solely automated decisions with legal or similarly significant effects are restricted: safeguards including the right to human review, to contest, and an explanation', 'Nothing special', 'Only a privacy notice', 'Customer consent to use AI at all'],
        0
      )
    ),
    ...tagged(
      'law',
      S,
      choice(
        'm-rk-l-s1',
        'Copyright',
        'A marketing team wants to publish AI-generated images and copy commercially. What do you check?',
        ['The tool’s terms on commercial use and indemnity, that outputs don’t copy protected work or trademarks, and how the company’s own ownership claim may be limited', 'Nothing; AI output is always free to use', 'Only the image resolution', 'That it was generated in the UK'],
        0
      )
    ),
    ...tagged(
      'ops',
      B,
      choice(
        'm-rk-o-b1',
        'Hallucination Risk',
        'What is the main risk of using AI-written answers without checking them?',
        ['They can be confidently wrong (hallucinations)', 'They’re too slow', 'They’re too short', 'They use too much colour'],
        0
      )
    ),
    ...tagged(
      'ops',
      J,
      choice(
        'm-rk-o-j1',
        'Shadow AI',
        'Staff are using personal AI accounts for work because the company hasn’t provided any. What’s the best response?',
        ['Provide an approved business tool with clear, simple guidance on what data can be used, rather than only banning it', 'Ban AI and monitor everyone', 'Ignore it', 'Let everyone use any tool'],
        0
      )
    ),
    ...tagged(
      'ops',
      P,
      choice(
        'm-rk-o-p1',
        'Bias',
        'An AI tool ranks CVs and favours candidates from certain universities. What do you recommend?',
        ['Test outcomes across groups, remove proxies, keep humans deciding, and document it; or stop using it for ranking', 'Nothing; universities matter', 'Use it but don’t tell anyone', 'Add more universities'],
        0
      )
    ),
    ...tagged(
      'ops',
      S,
      choice(
        'm-rk-o-s1',
        'An AI Policy',
        'What should a small company’s AI use policy cover?',
        ['Approved tools, what data may and may not go in, human review of outputs, disclosure where needed, who to ask, and how incidents are reported', 'A list of banned websites', 'Only a ban on ChatGPT', 'Nothing; AI is optional'],
        0
      )
    ),
    ...tagged('case', B, short('m-rk-x-b1', 'The Assessment', 'What is the three-letter abbreviation for the impact assessment UK GDPR requires for high-risk processing?', ['DPIA'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-rk-x-j',
        'A Proposal',
        `A GP practice manager proposes:

"We'll record every consultation with an AI scribe (a free app a doctor found), have it write the notes straight into the patient record, and use the same app to draft referral letters that go out automatically each evening."`,
        'Proposal'
      ),
      multi(
        'm-rk-x-j1',
        'The Risks',
        'Which are real risks? Tick all that apply.',
        [
          'Health data is special-category data; a free app may lack the contracts, security and data location needed',
          'Notes go into the record with no clinician checking them',
          'Referral letters go out unreviewed, so errors reach other clinicians',
          'Patients aren’t told or asked about recording',
          'AI can’t transcribe speech',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-rk-x-j' }
      ),
      written(
        'm-rk-x-j2',
        'Your Advice',
        'Write your advice to the practice manager.',
        [
          'Use an approved, NHS-assured or properly contracted tool, not a free app, after a DPIA',
          'The clinician reviews and approves every note and letter before it’s saved or sent',
          'Tell patients, and let them opt out of recording',
          'Start with a small pilot, with clinical safety sign-off and a check of accuracy',
        ],
        `It's a good idea done the wrong way. Use an AI scribe that's approved for NHS use and properly contracted, not a free app, and complete a DPIA first, because this is health data. Nothing goes into a patient's record or out to another clinician without the GP reading and approving it: AI notes can mishear doses or invent details. Tell patients the consultation is being recorded and let them say no. Then pilot it with two or three GPs for a month, checking accuracy and time saved, with the practice's clinical safety lead signing it off before wider use.`,
        { taskId: 'm-rk-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-rk-x-p',
        'An AI’s Legal Summary',
        `A client asked an AI assistant whether their plan is legal. The plan: an AI tool scores job applicants and automatically rejects the bottom 60%, for roles in the UK and Germany.

The AI said: "This is legal. The EU AI Act does not apply to UK companies. UK GDPR allows automated decisions if you mention it in your privacy notice. Recruitment AI is classed as minimal risk."`,
        'AI assistant’s answer'
      ),
      multi(
        'm-rk-x-p1',
        'What’s Wrong',
        'Which statements are wrong? Tick all that apply.',
        [
          '“The EU AI Act does not apply to UK companies”: it can apply when the system is used in the EU, as in Germany',
          '“A privacy-notice mention allows automated decisions”: solely automated decisions with significant effects need stronger grounds and safeguards',
          '“Recruitment AI is minimal risk”: it is high-risk under the EU AI Act',
          'It mentions the EU AI Act',
        ],
        [0, 1, 2],
        { taskId: 'm-rk-x-p' }
      ),
      written(
        'm-rk-x-p2',
        'Your Corrected Advice',
        'Write the corrected advice (you’re not giving legal advice; say what to check and with whom).',
        [
          'Flags the EU AI Act high-risk duties for use in Germany (risk management, data quality, human oversight, documentation), as they come into force',
          'Explains automatic rejection is a solely automated significant decision: needs a lawful route, safeguards, human review on request, and is risky',
          'Recommends a human reviewing rejections (or AI only assisting), bias testing and a DPIA',
          'Recommends checking with an employment and data-protection lawyer before going live',
        ],
        `Not as planned. Recruitment AI used in Germany is high-risk under the EU AI Act, which brings duties on risk management, data quality, documentation, human oversight and transparency for whoever provides and uses it, whatever country the company is in. Automatically rejecting 60% of applicants is a solely automated decision with a significant effect, which UK GDPR (and EU GDPR in Germany) only allows on narrow grounds with safeguards like human review on request — a line in the privacy notice isn't enough. Safer: the AI helps recruiters sort and summarise, a person makes every reject decision, you test outcomes for bias and run a DPIA. Check the final design with an employment and data-protection lawyer before launch.`,
        { taskId: 'm-rk-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-rk-x-s',
        'A Risk Register',
        `A building society wants an AI assistant that answers members' mortgage questions on its website, using its product documents. Volume: 15,000 chats a month.`,
        'Proposal'
      ),
      written(
        'm-rk-x-s1',
        'Risk Register',
        'Write the top risks with a control for each.',
        [
          'Wrong or made-up product or rate information, which could be a regulatory and complaints risk: grounding in approved documents, citations, testing and review',
          'Straying into personal financial advice: clear limits and hand-off to an adviser',
          'Data protection: members typing personal details; minimisation, retention, a DPIA, vendor contract',
          'Prompt injection and abuse, vulnerable customers, and monitoring: guardrails, escalation routes, logging, regular audits, owner',
        ],
        `1. Wrong information about products or rates leads members to bad decisions or complaints. Control: answers only from approved, current documents with citations, an eval set signed off by the mortgage team, and weekly sampling of chats.
2. It drifts into personal advice it isn't authorised to give. Control: clear scope in the prompt, detection of advice-seeking questions, and hand-off to a qualified adviser.
3. Members share personal and financial details. Control: a DPIA, warnings not to share account details, redaction in logs, short retention, and a processor agreement with the vendor.
4. Vulnerable customers (in arrears, bereaved) need care. Control: detect these topics and route to trained staff.
5. Misuse and prompt injection. Control: no access to member accounts, output filtering, and red-team tests.
Owner: head of mortgages, with compliance reviewing monthly.`,
        { taskId: 'm-rk-x-s' }
      ),
      choice(
        'm-rk-x-s2',
        'The Tier',
        'Under the EU AI Act, which tier does a customer-facing information chatbot most likely fall into?',
        ['Limited risk: people must be told they’re talking to AI', 'Prohibited', 'High-risk', 'Not covered at all'],
        0,
        { taskId: 'm-rk-x-s' }
      )
    ),
  ],
};

// ---------- Change management ----------
export const AI_CHANGE_MODULE: ModuleSkeleton = {
  familyId: 'test-aichange-01',
  aspects: [
    { id: 'people', name: 'People & Concerns', summary: 'Fears about jobs, skills and being watched.' },
    { id: 'enable', name: 'Training & Champions', summary: 'Getting people confident with the tools.' },
    { id: 'measure', name: 'Measuring Adoption', summary: 'Use that sticks and changes the work.' },
    { id: 'case', name: 'Change Cases', summary: 'Real rollouts: plan, rescue and report.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'people',
      B,
      choice(
        'm-ch-p-b1',
        'The First Worry',
        'Announcing an AI rollout, what is staff’s most common first worry?',
        ['Whether their job is at risk', 'The colour of the interface', 'Which model it uses', 'The licence price'],
        0
      )
    ),
    ...tagged(
      'people',
      J,
      choice(
        'm-ch-p-j1',
        'Being Honest',
        'Leadership says “no jobs will change” but plans to reduce agency staff. What do you advise?',
        ['Be honest about what will change and how it will be handled; false reassurance destroys trust when the truth comes out', 'Keep saying no jobs will change', 'Say nothing', 'Announce cuts on day one without a plan'],
        0
      )
    ),
    ...tagged(
      'people',
      P,
      choice(
        'm-ch-p-p1',
        'Involving Staff',
        'What is the best way to design how AI fits into a team’s work?',
        ['With the people who do the work: they know where it helps and where it would break things', 'By the IT team alone', 'By the vendor', 'By the board'],
        0
      )
    ),
    ...tagged(
      'people',
      S,
      choice(
        'm-ch-p-s1',
        'Monitoring Fears',
        'Staff fear the AI tool will be used to watch their productivity. What do you put in place?',
        ['A clear, written statement of what data is and isn’t collected and used for, agreed with staff representatives, and kept to', 'Tell them not to worry', 'Collect everything anyway', 'Hide the settings'],
        0
      )
    ),
    ...tagged(
      'enable',
      B,
      choice(
        'm-ch-e-b1',
        'Training That Works',
        'Which training helps staff most?',
        ['Short, hands-on sessions using their own real tasks', 'A two-hour lecture on how AI works', 'A PDF manual', 'A link to the vendor’s website'],
        0
      )
    ),
    ...tagged(
      'enable',
      J,
      choice(
        'm-ch-e-j1',
        'Champions',
        'What is an AI champion network?',
        ['Respected staff in each team who learn the tools early, help colleagues and feed back what isn’t working', 'The IT helpdesk', 'Senior managers who approve budgets', 'The vendor’s sales team'],
        0
      )
    ),
    ...tagged(
      'enable',
      P,
      choice(
        'm-ch-e-p1',
        'A Prompt Library',
        'Teams keep reinventing prompts for the same tasks. What helps?',
        ['A shared library of tested prompts and examples for each team’s common tasks, kept up to date by the champions', 'Tell them to try harder', 'Ban custom prompts', 'Buy a bigger model'],
        0
      )
    ),
    ...tagged(
      'enable',
      S,
      choice(
        'm-ch-e-s1',
        'Changing the Work',
        'A year in, staff use the AI tool but do the job the same way, with AI as an extra step. What’s needed?',
        ['Redesign the process around the tool: change steps, templates, approval rules and targets so the time saved is actually used', 'More training on the same tool', 'A different tool', 'Nothing'],
        0
      )
    ),
    ...tagged(
      'measure',
      B,
      choice(
        'm-ch-m-b1',
        'A Weak Measure',
        'Which is the weakest measure of adoption?',
        ['Number of licences bought', 'Share of staff using it each week', 'Time saved per task', 'Quality of the output'],
        0
      )
    ),
    ...tagged(
      'measure',
      J,
      short(
        'm-ch-m-j1',
        'Weekly Users',
        '300 staff have licences; 120 used the tool at least once a week last month. What is the weekly active rate? (As a %.)',
        ['40%', '40', '0.4']
      )
    ),
    ...tagged(
      'measure',
      P,
      choice(
        'm-ch-m-p1',
        'Uneven Adoption',
        'Use is 80% in marketing and 10% in finance. What do you do first?',
        ['Ask finance why: the tool may not fit their tasks, data rules may block it, or they need examples; then fix that', 'Remove finance’s licences', 'Mandate use', 'Celebrate marketing and move on'],
        0
      )
    ),
    ...tagged(
      'measure',
      S,
      choice(
        'm-ch-m-s1',
        'Reporting to the Board',
        'What should a six-month AI adoption report to the board show?',
        ['Use, outcomes against the business case’s baseline (time, quality, cost), issues and risks, and what’s changing next', 'Only the number of users', 'Only success stories', 'Only the cost'],
        0
      )
    ),
    ...tagged('case', B, short('m-ch-x-b1', 'Licences Used', '200 licences, 50 used weekly. How many licences are going unused weekly?', ['150'])),
    ...tagged(
      'case',
      J,
      caseStudy(
        'm-ch-x-j',
        'A Stalled Rollout',
        `An insurance broker rolled out an AI assistant to 150 staff three months ago.

- Weekly active users: 30 (20%)
- Training: one 60-minute webinar on launch day
- Staff survey: "I don't know what I'm allowed to put in it" (58%), "It doesn't help with my work" (34%), "I'm worried it's to replace us" (41%)
- No guidance on data has been issued`,
        'Rollout data'
      ),
      multi(
        'm-ch-x-j1',
        'The Causes',
        'Which are likely causes of low use? Tick all that apply.',
        ['No clear guidance on what data can be used', 'Training wasn’t tied to people’s real tasks', 'Fear about jobs hasn’t been addressed', 'The tool needs a dark mode'],
        [0, 1, 2],
        { taskId: 'm-ch-x-j' }
      ),
      written(
        'm-ch-x-j2',
        'Your Rescue Plan',
        'Write a 60-day plan to fix the rollout.',
        [
          'Issues simple data guidance (what can and can’t go in) in week one',
          'Leadership says honestly how AI will and won’t affect jobs',
          'Team-by-team hands-on sessions on real tasks, with champions and a prompt library',
          'Sets targets and measures (weekly use, time saved on named tasks) and reviews at day 60',
        ],
        `Week 1: a one-page guide on what can and can't be put into the assistant (client policy details yes in the business tool; card details and medical information no), and a message from the MD saying plainly how AI fits into roles and that there are no plans to cut jobs because of it — if that's true; if it isn't, saying what will happen. Weeks 2–6: a 45-minute session with each team on three of their own tasks, run with a champion from that team, who keeps a shared prompt library. Weeks 6–8: drop-in clinics and sharing what's working. Measures: weekly active users (target 60%) and time saved on two named tasks per team, reviewed at day 60.`,
        { taskId: 'm-ch-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-ch-x-p',
        'An AI-Written Change Plan',
        `An AI assistant wrote this change plan for a 400-person council department adopting AI tools:

"Week 1: Mandate that all staff use AI for every task. Week 2: Track each employee's AI usage and rank them on a league table. Week 3: Staff with low usage are put on performance plans. Week 4: Reduce headcount by 20% based on productivity gains."`,
        'AI-written plan'
      ),
      multi(
        'm-ch-x-p1',
        'What’s Wrong',
        'Which are real problems? Tick all that apply.',
        [
          'Mandating AI for every task ignores where it doesn’t fit or isn’t safe',
          'Ranking individual usage invites gaming and fear, and raises monitoring and data concerns',
          'Punishing low usage targets the tool, not the work outcomes',
          'Cutting 20% after four weeks has no evidence, ignores consultation duties and destroys trust',
          'Four weeks is too long',
        ],
        [0, 1, 2, 3],
        { taskId: 'm-ch-x-p' }
      ),
      written(
        'm-ch-x-p2',
        'Your Plan',
        'Write a better outline plan.',
        [
          'Starts with the work: use cases chosen with staff and unions, with clear guidance and safeguards',
          'Enablement: training on real tasks, champions, time to learn',
          'Measures outcomes (service times, backlog, quality), not individual usage league tables',
          'Handles workforce changes honestly over time, with consultation, using natural turnover and redeployment where possible',
        ],
        `Months 1–2: with staff and the unions, pick three use cases that matter to residents (e.g. drafting responses to common enquiries, summarising case notes), publish guidance on safe use, and agree what usage data will and won't be collected. Months 2–4: hands-on training for each team on those tasks, with champions and protected time to learn. Measure outcomes — response times, backlog, quality checks — not individual league tables. Months 4–6: review results with staff and the board. If capacity is freed, decide openly how to use it, starting with backlog and service improvements; any change in roles follows proper consultation and uses vacancies and redeployment first.`,
        { taskId: 'm-ch-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy(
        'm-ch-x-s',
        'Six Months In',
        `Law firm, AI rollout to 220 fee-earners, six months in:

                         Target   Actual
Weekly active users      70%      64%
Hours saved per user/wk  3        1.5 (self-reported)
Billable hours           +5%      +0.5%
Client complaints        no rise  2 complaints about errors in AI-drafted letters
Spend                    £180k    £210k`,
        'Six-month results'
      ),
      written(
        'm-ch-x-s1',
        'Report to the Partners',
        'Write your six-month report to the partners: what’s working, what isn’t, and what you recommend.',
        [
          'Honest summary: adoption near target, but savings half of plan and billable hours barely moved; spend over by £30k',
          'Treats the two complaints seriously: review rules for client-facing drafts and checking',
          'Diagnoses why savings aren’t turning into billable work (self-reported data, process not redesigned, time absorbed)',
          'Recommends specific changes with measures, e.g. focus on 3 high-value workflows, measured time data, review controls, and a decision point',
        ],
        `Use is close to target (64% weekly against 70%), so people have taken to it. The value hasn't followed: fee-earners report saving 1.5 hours a week, half the plan and self-reported, and billable hours are up just 0.5% against 5%. Spend is £30k over. Two clients complained about errors in AI-drafted letters; that has to stop. Recommendations: 1) every client-facing AI draft is checked by the fee-earner against a short checklist, starting now; 2) focus on three workflows where saved time turns into billable work (first drafts of standard contracts, disclosure review, research memos), redesigning those processes rather than adding AI on top; 3) measure time from the matter system instead of surveys; 4) cap spend at the budget. Decide at month nine whether to expand or cut back, based on billable hours and complaints.`,
        { taskId: 'm-ch-x-s' }
      )
    ),
  ],
};

// ---------- AI consultant final project ----------
const GREENFIELD = `Greenfield Lettings: 28 staff, 2 offices, manages 1,400 rental homes for 600 landlords. Turnover £3.2m. The owners want to "do something with AI" this year, with a budget of up to £40,000.

What you found in discovery:
- Tenants' maintenance requests: 900/month by phone and email; staff log each one (6 min) and chase contractors
- Property listings: 60/month; each description takes 40 min to write
- Tenant referencing: 70/month; checking documents and affordability takes 90 min each; decisions affect who gets a home
- Landlord monthly statements: 600/month, produced by the lettings software already
- Viewing bookings: 500/month, mostly by phone; 30% of calls after hours go unanswered
- Staff cost averages £18/hour
- Systems: a lettings platform (with an API), Microsoft 365, a phone system
- Data: tenant and landlord personal data, including bank details and references`;

export const AIC_SIM_MODULE: ModuleSkeleton = {
  familyId: 'test-sim-aic-01',
  aspects: [
    { id: 'recommend', name: 'Where to Use AI', summary: 'Picking the use cases that fit the business.' },
    { id: 'roi', name: 'Estimating ROI', summary: 'What it costs and what it’s worth, honestly.' },
    { id: 'risk', name: 'Flagging Risks', summary: 'Data, fairness, accuracy and people.' },
    { id: 'case', name: 'Greenfield Lettings', summary: 'Discovery to a rollout plan for the owners.' },
  ],
  tags: {},
  bank: [
    ...tagged(
      'recommend',
      B,
      choice(
        'm-aics-r-b1',
        'Already Done',
        'Landlord statements are produced by the lettings software already. Is that an AI use case?',
        ['No: it’s already automated, so there’s little to gain', 'Yes, the biggest one', 'Yes, rebuild it with AI', 'Only if it’s cheap'],
        0
      )
    ),
    ...tagged(
      'recommend',
      J,
      choice(
        'm-aics-r-j1',
        'Missed Calls',
        '30% of after-hours viewing calls go unanswered. What’s a sensible option?',
        ['Online booking linked to the diary, with an AI assistant on the phone and web to book viewings out of hours', 'Hire night staff', 'A custom AI model', 'Ignore it'],
        0
      )
    ),
    ...tagged(
      'recommend',
      P,
      choice(
        'm-aics-r-p1',
        'Referencing',
        'Referencing takes 90 minutes each and decides who gets a home. How should AI be used?',
        ['To gather and check documents and summarise for a person, who makes the decision; never automatic accept or reject', 'Fully automate the decision', 'Not at all, ever', 'Let tenants self-certify'],
        0
      )
    ),
    ...tagged(
      'recommend',
      S,
      choice(
        'm-aics-r-s1',
        'Sequencing',
        'Which order makes most sense for Greenfield?',
        ['Low-risk, high-volume wins first (maintenance intake, listings, viewing bookings), referencing support later with safeguards', 'Referencing first; biggest time per case', 'All at once', 'Start with landlord statements'],
        0
      )
    ),
    ...tagged(
      'roi',
      B,
      short('m-aics-o-b1', 'Listing Hours', '60 listings a month take 40 minutes each. How many hours a month is that?', ['40', '40 hours'])
    ),
    ...tagged(
      'roi',
      J,
      short(
        'm-aics-o-j1',
        'Maintenance Hours',
        'Logging 900 maintenance requests a month takes 6 minutes each. How many hours a month?',
        ['90', '90 hours']
      )
    ),
    ...tagged(
      'roi',
      P,
      choice(
        'm-aics-o-p1',
        'Revenue, Not Just Time',
        'Which benefit of answering after-hours viewing calls could be worth more than staff time saved?',
        ['Fewer lost viewings, so homes let faster and fewer landlords leave', 'Lower phone bills', 'Shorter calls', 'Staff going home earlier'],
        0
      )
    ),
    ...tagged(
      'roi',
      S,
      choice(
        'm-aics-o-s1',
        'Honest Value',
        'Staff time saved is valued at £18/hour. When should you count it as a saving in the business case?',
        ['Only where it avoids hiring, overtime or temps, or goes into work that earns money (more properties managed per person)', 'Always, in full', 'Never', 'Only for managers'],
        0
      )
    ),
    ...tagged(
      'risk',
      B,
      choice(
        'm-aics-k-b1',
        'The Data',
        'Greenfield holds tenants’ bank details and references. What does that mean for any AI tool?',
        ['It must be a business-grade tool with a proper data agreement, and staff must know what can be put in it', 'Nothing', 'Use free tools', 'Put everything in'],
        0
      )
    ),
    ...tagged(
      'risk',
      J,
      choice(
        'm-aics-k-j1',
        'Listing Accuracy',
        'An AI-written listing says “two double bedrooms” when one is a single. What’s the risk and control?',
        ['Misleading property descriptions breach consumer and property-advertising rules; a person checks every listing against the property facts', 'None; it’s just marketing', 'Tenants won’t notice', 'Remove bedroom counts'],
        0
      )
    ),
    ...tagged(
      'risk',
      P,
      choice(
        'm-aics-k-p1',
        'Fair Referencing',
        'What’s the main risk in AI-assisted tenant referencing?',
        ['Unfair or discriminatory outcomes (e.g. against people on benefits or with non-UK documents), and solely automated decisions; keep a person deciding, test for bias, and do a DPIA', 'It’s too fast', 'Landlords like it', 'There isn’t one'],
        0
      )
    ),
    ...tagged(
      'risk',
      S,
      choice(
        'm-aics-k-s1',
        'Staff Concerns',
        'Staff hear “AI project” and worry about jobs. How should the owners handle it?',
        ['Say clearly what’s planned (taking on more properties without more hires, not cuts, if that’s true), involve staff in choosing and testing tools, and train everyone', 'Say nothing', 'Announce cuts', 'Tell them AI won’t change anything'],
        0
      )
    ),
    ...tagged('case', B, short('m-aics-x-b1', 'Hours to £', '40 hours a month of staff time at £18/hour is worth how much a year, in £? (12 months.)', ['8640', '£8,640', '8,640', '£8640'])),
    ...tagged(
      'case',
      J,
      caseStudy('m-aics-x-j', 'Discovery', GREENFIELD, 'Discovery notes'),
      short(
        'm-aics-x-j1',
        'Referencing Hours',
        'How many staff hours a month does tenant referencing take?',
        ['105', '105 hours'],
        { taskId: 'm-aics-x-j' }
      ),
      written(
        'm-aics-x-j2',
        'Where to Use AI',
        'Recommend where Greenfield should use AI this year, in priority order, with a sentence on why for each.',
        [
          'Viewing bookings: lost after-hours calls cost lettings, and online/AI booking tools are mature',
          'Maintenance intake: 90 hours/month of logging, plus faster contractor dispatch, via AI triage of emails/calls into the platform’s API',
          'Listing descriptions: 40 hours/month, low risk with a person checking facts',
          'Referencing: AI assistance only, with a person deciding, later and with safeguards; statements left alone as already automated',
        ],
        `1. Viewing bookings: 30% of after-hours calls are missed, and each missed viewing can mean a home empty for longer. Online booking with an AI assistant on the phone and website, linked to the diary, is a proven, low-risk fix. 2. Maintenance requests: 900 a month at 6 minutes is 90 hours of logging; AI can read emails and call transcripts, log the job in the lettings platform and suggest the contractor, with staff checking urgent ones. 3. Listings: 40 hours a month; AI drafts from the property details and photos, a negotiator checks every fact. 4. Referencing, later: AI gathers documents and summarises affordability for a person who decides, after a DPIA and bias check. Landlord statements are already automated, so leave them.`,
        { taskId: 'm-aics-x-j' }
      )
    ),
    ...tagged(
      'case',
      P,
      caseStudy(
        'm-aics-x-p',
        'An AI-Written Proposal',
        `${GREENFIELD}

A junior colleague asked an AI assistant to draft the proposal. It wrote:

"Recommendation: automate tenant referencing end to end with AI, auto-approving or rejecting applicants. Saves 105 hours/month = £45,360/year. Also replace 6 negotiators with an AI agent (£150,000/year). Total savings: £195,360/year for a £40,000 investment. Risks: none significant, as AI is now highly accurate."`,
        'Discovery and AI draft'
      ),
      multi(
        'm-aics-x-p1',
        'What’s Wrong',
        'Which are real problems with the AI draft? Tick all that apply.',
        [
          '105 hours/month at £18/hour is £22,680 a year, not £45,360',
          'Auto-rejecting tenants is a solely automated decision with significant effects, and a fairness risk',
          'Replacing 6 negotiators has no basis in the discovery and ignores what they do',
          '“Risks: none significant” ignores data protection, accuracy, fairness and staff',
          'Its top priority skips the safer, bigger wins (viewings, maintenance)',
        ],
        [0, 1, 2, 3, 4],
        { taskId: 'm-aics-x-p' }
      ),
      written(
        'm-aics-x-p2',
        'Corrected ROI',
        'Write a corrected ROI estimate for your top three recommendations, with your assumptions.',
        [
          'Maintenance: e.g. 90 hours/month, AI cuts logging by about two-thirds → ~60 hours ≈ £13,000/year',
          'Listings: 40 hours/month, AI halves it → 20 hours ≈ £4,300/year; viewings valued by lettings not lost, as an assumption to test',
          'Costs within the £40k budget: tools, set-up/integration, training, review time',
          'Says time saved becomes capacity to grow (more homes per person), not cuts, and gives a range',
        ],
        `Maintenance intake: 90 hours a month today; if AI logging cuts that by two-thirds, about 60 hours a month, £12,960 a year. Listings: 40 hours a month; halving it saves 20 hours, £4,320 a year. Viewings: the bigger prize is lettings not lost. If answering missed calls fills each of, say, 5 extra homes a month a week sooner, at a typical £1,000 a month rent and 10% fee, that's about £1,400 a year in fees plus happier landlords — an assumption to test in the pilot. Costs: roughly £15,000–£20,000 in year one for an AI booking/phone service, integration with the lettings platform, a business AI assistant and training, inside the £40,000 budget. Net: about break-even in year one (£18,700 of value against £15,000–£20,000), rising after, mostly as capacity to take on more homes without hiring, not as cuts.`,
        { taskId: 'm-aics-x-p' }
      )
    ),
    ...tagged(
      'case',
      S,
      caseStudy('m-aics-x-s', 'Presenting to the Owners', `${GREENFIELD}\n\nYou present to the two owners next week.`, 'Discovery notes'),
      written(
        'm-aics-x-s1',
        'Rollout Plan',
        'Write the rollout plan you’d present: phases, what’s done in each, risks and controls, measures, and decision points.',
        [
          'Phase 1 (months 1–3): viewing booking assistant and maintenance intake pilots, with baseline measures',
          'Phase 2 (months 3–6): listing drafting and wider rollout of what worked; Phase 3 later: referencing assistance with DPIA, bias testing and a person deciding',
          'Controls: business-grade tools with data agreements, an AI use policy, human checks on listings and urgent repairs, staff involvement and training',
          'Measures and decision points: missed calls, time per request, listing time, staff and landlord feedback; go/stop at the end of each phase; stays within £40k',
        ],
        `Phase 1, months 1–3 (about £15k): an AI viewing-booking assistant on the phone line and website, linked to the diary, and AI intake for maintenance emails and calls, logging jobs in the lettings platform. Measures: after-hours calls answered (from 70%), minutes per maintenance request (from 6), time to contractor dispatch. Decision at month 3: keep, change or stop each.

Phase 2, months 4–6 (about £10k): listing descriptions drafted by AI, checked by a negotiator against the property facts; roll out whatever worked in phase 1 to both offices. Measure time per listing and complaints.

Phase 3, from month 7 (if phases 1–2 pay off): AI help with referencing — collecting documents and summarising affordability — after a DPIA and bias test, with a person making every decision.

Throughout: business-grade tools with data agreements; a one-page AI policy on what data goes where; staff choose and test the tools with us and get hands-on training; a named owner. We're using AI to take on more homes without more hires, not to cut jobs. Total within the £40k budget, with a go/no-go at the end of each phase.`,
        { taskId: 'm-aics-x-s' }
      ),
      choice(
        'm-aics-x-s2',
        'The First Decision',
        'What should the owners decide at the end of phase 1?',
        ['Whether each pilot met its measures, and so whether to keep, change or stop it before spending more', 'Whether to buy more licences regardless', 'Whether AI is good in general', 'Nothing; carry on'],
        0,
        { taskId: 'm-aics-x-s' }
      )
    ),
  ],
};

export const AI_STRATEGY_MODULES = [AI_TOOLS_MODULE, USE_CASE_MODULE, ROI_MODULE, AI_RISK_MODULE, AI_CHANGE_MODULE, AIC_SIM_MODULE];
