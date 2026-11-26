import { AssessmentTest, Question, TestScenario } from '../../types';
import { choice, match, multi, order, short, written } from '../questionKit';
import { questionSet } from './daSets';
import { forField } from './moduleField';
import { HelpdeskConfig, HelpdeskTicket, helpdeskApp } from './helpdeskApp';
import { QUEUE_P, TALLYHUB_GROUPS, TALLYHUB_KB, TALLYHUB_SLA, TALLYHUB_TAGS } from './support';

/**
 * The Customer Support modules, built like the Data Analyst ones: one Mid-level test per pair of core skills, about 20
 * minutes. First two question sets (a piece of the job in front of you, with four questions about it of different
 * kinds), then two tasks in a working help desk (Deskly), each with four numbered questions marked on their own checks.
 * Writing done in the help desk (replies, notes, bug reports, a chat message) is marked against its points by Corprax's AI.
 *
 * Prioritising & Escalation · Customer Communication (angry customers, clear writing) · Policies & Refunds (applying
 * policy, attention to detail) · Listening & Troubleshooting. The Bloomvale job simulation follows them.
 */

const CS = ['Customer Support Agent'] as AssessmentTest['roles'];
const TASK_WEIGHT = 30;
const TASK_MINUTES = 5;

// A check: [question, what it checks, state path, the value expected] or, for writing, its marking points
type Check = [question: number, description: string, path: string, expected: string | { rubric: string[] }];

const deskTask = (id: string, title: string, prompt: string, cfg: HelpdeskConfig, checks: Check[]): Question => ({
  id,
  title,
  type: 'app',
  prompt,
  contextData: `${cfg.product}: ${cfg.company} support`,
  appHtml: helpdeskApp(cfg),
  starterCode: '',
  testCases: checks.map(([n, d, path, e], i) => ({
    id: `tc-${id}-${i + 1}`,
    description: `Q${n} · ${d}`,
    input: path,
    expectedOutput: typeof e === 'string' ? e : '',
    ...(typeof e !== 'string' && { rubric: e.rubric }),
  })),
  timeLimitMinutes: TASK_MINUTES,
  weight: TASK_WEIGHT,
});

const moduleTest = (id: string, title: string, description: string, skillsTested: string[], scenario: TestScenario, sets: Question[], tasks: Question[]): AssessmentTest => {
  const raw = [...sets, ...tasks];
  const total = raw.reduce((n, q) => n + q.weight, 0) || 1;
  const questions = raw.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) }));
  const drift = 100 - questions.reduce((n, q) => n + q.weight, 0);
  if (drift) questions.reduce((a, b) => (b.weight > a.weight ? b : a)).weight += drift;
  return {
    id,
    title,
    description,
    skillsTested,
    roles: CS,
    type: 'standard',
    category: 'Customer Support',
    difficulty: 'Professional',
    passingScore: 70,
    scenario,
    questions,
    totalQuestions: questions.filter((q) => q.type !== 'case').length,
    estimatedMinutes: 20,
  };
};

const ticket = (t: HelpdeskTicket) => t;
const msg = (name: string, at: string, body: string) => ({ from: 'customer' as const, name, at, body });

const tallyhub = (agent: string, tickets: HelpdeskTicket[], extra: Partial<HelpdeskConfig> = {}): HelpdeskConfig => ({
  product: 'Deskly',
  company: 'Tallyhub',
  agent,
  now: 'Monday 09:00',
  groups: TALLYHUB_GROUPS,
  tagOptions: TALLYHUB_TAGS,
  slaPolicy: TALLYHUB_SLA,
  kb: TALLYHUB_KB,
  tickets,
  ...extra,
});

const TALLYHUB_SCENARIO: TestScenario = {
  company: 'Tallyhub',
  role: 'Customer Support Agent',
  brief: `Tallyhub is invoicing and bookkeeping software for small businesses. You're on the support desk, working in Deskly, the help desk. Its knowledge base (the book icon) has the team's rules.

Each task opens its own queue.`,
};

// =====================================================================================================
// Prioritising & Escalation
// =====================================================================================================

const TRIAGE_SETS: Question[] = [
  ...questionSet(
    'cs-tr-s1',
    'Ranking a Queue',
    'The queue at 09:00',
    `Five tickets waiting:

#     Subject                                           Plan      Waiting
4101  I can see another company's invoices              Standard  10 min
4102  URGENT!!! where do I change my logo               Business  40 min
4103  Error 500 sending invoices, 40 to send today      Standard  25 min
4104  Can't log in after resetting my password          Standard  15 min
4105  Idea: a dark mode                                 Free      2 days

First-reply targets: Urgent 1 hour, High 4 hours, Normal 8 business hours, Low 2 business days.`,
    [
      order('cs-tr-s1-a', 'Most Urgent First', 'Put the tickets in the order you’d work them, most urgent first.', ['4101 · another company’s invoices', '4103 · error 500, 40 invoices today', '4104 · can’t log in', '4102 · where to change the logo', '4105 · dark mode idea']),
      choice(
        'cs-tr-s1-b',
        'Shouting and the Plan',
        '4102 is in capitals and from a Business customer. Why isn’t it Urgent?',
        ['Priority is impact and urgency: nothing is broken; the plan only changes how fast the reply target is', 'Business customers are never urgent', 'Capitals mean it’s spam', 'It’s Urgent: the plan decides priority'],
        0
      ),
      short('cs-tr-s1-c', 'Time Left', '4103 is set to High and has waited 25 minutes. How many minutes are left before its first-reply target is missed?', ['215', '215 minutes', '215 mins', '3h 35m', '3 hours 35 minutes']),
      written(
        'cs-tr-s1-d',
        'Forty Against One',
        'Forty new tickets say the dashboard is slow (it works, just takes 20 seconds), and one says a customer can see another company’s bank transactions. You’re the only senior agent on. What do you do first, and how do you handle the forty?',
        [
          'Deals with the data exposure first: a likely security and privacy incident, escalated to Trust & Safety / on-call at once',
          'Links the 40 slow-dashboard tickets as one incident instead of working them one by one, and tells engineering once',
          'Sends the 40 one holding reply (macro or status page) with when they’ll next hear',
          'Explains that volume doesn’t decide priority: one data exposure outweighs many slow-but-working tickets',
        ],
        'The data exposure first: it’s a possible breach, so I escalate to Trust & Safety straight away, ask the customer not to share what they saw, and keep the ticket restricted. The 40 slow-dashboard tickets are one incident: I link them, tell engineering once, and send them all the same holding reply with when they’ll next hear. Forty tickets make it visible, but slow-but-working is less urgent than another company’s financial data being exposed.'
      ),
    ]
  ),
  ...questionSet(
    'cs-tr-s2',
    'Tier 1 or Tier 2',
    'Escalation policy',
    `Tallyhub's escalation policy:

• Tier 1 (you): how-to questions, logins and password resets, billing questions, known issues with a published fix
• Tier 2 Technical: errors and bugs with no known fix, anything affecting several customers, data problems
• Trust & Safety: hacked accounts, someone seeing data that isn't theirs, phishing
• Billing: refunds, double charges, plan changes
• Before escalating: try the knowledge-base fix, and gather what, when, steps, screenshots, browser and device`,
    [
      match('cs-tr-s2-a', 'Who Takes It', 'Match each ticket to the team that should handle it.', [
        ['“How do I add a second user?”', 'Tier 1 (you)'],
        ['“Error 500 on every invoice since 08:10” (3 customers)', 'Tier 2 Technical'],
        ['“My account sent emails I didn’t write”', 'Trust & Safety'],
        ['“I was charged twice in November”', 'Billing'],
      ]),
      multi(
        'cs-tr-s2-b',
        'A Good Escalation',
        'What should an escalation to Tier 2 include? Tick all that apply.',
        ['Steps to reproduce', 'The exact error and any screenshots', 'How many customers are affected, with ticket numbers', 'The impact on the customer and any deadline', 'The customer’s password, so engineering can log in', 'How annoyed the customer is'],
        [0, 1, 2, 3]
      ),
      choice(
        'cs-tr-s2-c',
        'Expired Link',
        'A customer’s password-reset link has expired. What do you do?',
        ['Solve it yourself: send a fresh reset link as the knowledge base says (Tier 1)', 'Escalate it to Tier 2 Technical', 'Pass it to Trust & Safety', 'Ask them to wait for a fix'],
        0
      ),
      written(
        'cs-tr-s2-d',
        'The Escalation Note',
        'Write the internal note escalating 4103 (error 500 when sending invoices) to Tier 2. The customer tried Chrome and Edge, it started about 08:10, downloading a PDF still works, and two other customers have reported the same since.',
        [
          'States what’s broken and the exact error (error 500 when pressing Send on an invoice)',
          'Gives when it started (about 08:10), what was tried (Chrome and Edge) and the workaround that works (PDF download)',
          'Gives the scope: three customers, with the ticket numbers or a note to link them',
          'States the impact (40 invoices to send today, payday) and asks for something specific (a fix / an update time)',
        ],
        'Tier 2: error 500 when sending any invoice, since about 08:10. Tried in Chrome and Edge; downloading as PDF still works, so I’ve given the customer that workaround. Three customers so far (#4103 and two more, linked). Impact: this customer has 40 invoices to send today for payday. Can you look now and give us an update time to pass on?'
      ),
    ]
  ),
];

const SOLVE_KB = [
  ...TALLYHUB_KB,
  { title: 'Adding a user', body: 'Settings → Users → Invite user. Enter their email and pick a role (Admin, Standard or Read only). They get an email to set a password. Standard plan: up to 3 users; Business: unlimited.' },
  { title: 'Password reset links', body: 'Reset links last 1 hour and only the newest one works. If a link has expired, send a new one from the customer’s profile (Send reset link) and tell them to use the latest email.' },
];

const SOLVE_QUEUE: HelpdeskTicket[] = [
  ticket({ id: '3201', subject: 'How do I add my bookkeeper as a user?', requester: 'Nina Ross', email: 'nina@rossflorist.co.uk', plan: 'Standard', channel: 'Email', received: 'Today 08:40', ageMins: 20, slaMins: 460, messages: [msg('Nina Ross', 'Today 08:40', 'Hi, my bookkeeper needs to see my invoices but not change anything. How do I add her? Thanks')] }),
  ticket({ id: '3202', subject: 'Reset link says expired', requester: 'Omar Haddad', email: 'omar@haddadtiles.com', channel: 'Chat', received: 'Today 08:51', ageMins: 9, slaMins: 471, messages: [msg('Omar Haddad', 'Today 08:51', 'I asked for a reset link last night and clicked it this morning, it says the link has expired.')] }),
  ticket({
    id: '3203',
    subject: 'Bank feed not updating',
    requester: 'Nadia Rahman',
    email: 'nadia@rahmanlaw.co.uk',
    plan: 'Business',
    channel: 'Email',
    received: 'Today 07:12',
    ageMins: 108,
    slaMins: 12,
    messages: [msg('Nadia Rahman', 'Today 07:12', 'No Barclays transactions since Sunday evening. The connection page says Connected. I’ve disconnected and reconnected twice as your help article says, still nothing. Two people at my accountant’s office say their Barclays feeds stopped too.')],
  }),
  ticket({ id: '3204', subject: 'Charged twice this month', requester: 'Hannah Price', email: 'hannah@pricebookkeeping.com', channel: 'Web form', received: 'Today 08:05', ageMins: 55, slaMins: 425, messages: [msg('Hannah Price', 'Today 08:05', 'Two payments of £18 to Tallyhub on the 1st. I only have one account. Please refund one.')] }),
];

const TRIAGE_TEST = moduleTest(
  'test-support-triage-01',
  'Prioritising & Escalation',
  'Two question sets (ranking a queue, Tier 1 or Tier 2), then two tasks in a working help desk: triage a morning queue by impact and urgency, then solve what you can and escalate the rest with a note engineers can act on.',
  ['Ticket Triage', 'Prioritisation', 'Escalation', 'SLAs', 'Help Desk'],
  TALLYHUB_SCENARIO,
  TRIAGE_SETS,
  [
    deskTask(
      'cs-tr-t1',
      'Triage the Morning Queue',
      `Eight tickets are waiting in "Your unsolved tickets". The knowledge base has "Setting priority" and "Which team handles what".

Q1. Set a priority on the tickets, by impact and urgency, not tone or plan.
Q2. Assign each ticket to the right group.
Q3. Reply first to the customer whose ticket is most urgent (your first public reply of the morning goes to them).
Q4. The suspicious "Is this email from you?" ticket: tag it phishing.`,
      tallyhub('Sam Patel', QUEUE_P),
      [
        [1, 'The data exposure is Urgent', 'tickets.2201.priority', 'Urgent'],
        [1, 'The shouting how-to question isn’t over-prioritised', 'tickets.2202.priority', 'Low|Normal'],
        [1, 'The payday invoice error is High or Urgent', 'tickets.2204.priority', 'High|Urgent'],
        [1, 'The feature idea is Low', 'tickets.2206.priority', 'Low'],
        [2, 'The data exposure goes to Trust & Safety', 'tickets.2201.group', 'Trust & Safety'],
        [2, 'The double charge goes to Billing', 'tickets.2203.group', 'Billing'],
        [2, 'The invoice error goes to Tier 2 Technical', 'tickets.2204.group', 'Tier 2 Technical'],
        [2, 'The deletion request goes to Privacy', 'tickets.2205.group', 'Privacy'],
        [3, 'The first reply goes to the most urgent customer', 'replyOrder.0', '2201'],
        [4, 'The phishing report is tagged and with Trust & Safety', 'tickets.2208.tagSet.phishing', 'true'],
        [4, 'The phishing report is with Trust & Safety', 'tickets.2208.group', 'Trust & Safety'],
      ]
    ),
    deskTask(
      'cs-tr-t2',
      'Solve or Escalate',
      `Four tickets. Use the knowledge base and solve what Tier 1 can; send the rest on.

Q1. Route each ticket you can't solve to the right group.
Q2. Solve "How do I add my bookkeeper as a user?" yourself: reply with the steps (a read-only user) and submit it as Solved.
Q3. Escalate the bank feed ticket to Tier 2 with an internal note they can act on.
Q4. The expired reset link: reply with what to do, and submit it as Pending (you're waiting for the customer to try again).`,
      tallyhub('Sam Patel', SOLVE_QUEUE, { kb: SOLVE_KB }),
      [
        [1, 'The bank feed goes to Tier 2 Technical', 'tickets.3203.group', 'Tier 2 Technical'],
        [1, 'The double charge goes to Billing', 'tickets.3204.group', 'Billing'],
        [2, 'The user question is answered', 'tickets.3201.replied', 'true'],
        [2, 'and solved', 'tickets.3201.status', 'Solved'],
        [3, 'The escalation note', 'tickets.3203.lastNote', {
          rubric: [
            'Says what’s wrong: Barclays bank feed not importing transactions since Sunday evening while the connection shows Connected',
            'Says what was already tried (disconnect and reconnect twice, per the help article)',
            'Gives the scope: several customers / an accountant’s office affected, so likely a wider Barclays feed fault',
            'Gives impact and urgency (Business plan, first-reply target nearly breached) and asks for something specific',
          ],
        }],
        [4, 'The reset ticket is answered', 'tickets.3202.replied', 'true'],
        [4, 'and pending', 'tickets.3202.status', 'Pending'],
      ]
    ),
  ]
);

// =====================================================================================================
// Customer Communication
// =====================================================================================================

const HARTWELL_SCENARIO: TestScenario = {
  company: 'Hartwell Home',
  role: 'Customer Support Agent',
  brief: `Hartwell Home sells homeware online, with a monthly candle subscription called Glow Box. You're on the support desk in Deskly. The knowledge base (the book icon) has the policies.

Each task opens its own queue.`,
};

const HARTWELL_GROUPS = ['Customer Care', 'Team Leads', 'Tier 2 Technical', 'Trust & Safety', 'Warehouse'];
const HARTWELL_TAGS = ['late_delivery', 'damaged', 'refund', 'subscription', 'promo_bug', 'retention', 'account_security', 'change_of_mind'];
const HARTWELL_KB = [
  { title: 'Late Glow Box', body: 'A box more than 3 days late: apologise, give a £5 account credit (macro: Late box credit), and offer a free replacement if it hasn’t arrived 7 days after dispatch. Two or more late boxes in 3 months: also offer a free month.' },
  { title: 'Discount code fails at checkout', body: 'Known issue since the 4.12 checkout update: codes fail when the basket has a gift card in it. Workaround: buy the gift card in a separate order. Engineering issue ENG-2231 is open; link new reports to it.' },
  { title: 'Bug reports for engineering', body: 'Title: what’s broken and where. Steps to reproduce, numbered. Expected and actual result. Severity: Critical (no one can buy / data at risk), High (a key feature broken, no workaround), Medium (broken with a workaround), Low (cosmetic).' },
];

const COMMS_SETS: Question[] = [
  ...questionSet(
    'cs-cm-s1',
    'An Angry Customer',
    'Ticket #5101',
    `Mark Bell, a Glow Box subscriber for two years, writes:

"THIRD month running my box is late. It was meant to arrive on the 3rd, it's now the 9th. Your tracking page just says 'in transit'. I'm paying £24 a month for candles that turn up whenever you feel like it. Sort it out or I'm cancelling and telling everyone I know."`,
    [
      choice(
        'cs-cm-s1-a',
        'The First Line',
        'Which opening line is best?',
        [
          'Mark, I’m really sorry: a third late box in a row isn’t good enough, and I can see why you’re fed up.',
          'Thank you for contacting Hartwell Home. Your ticket has been received.',
          'Unfortunately delays happen with our courier partners.',
          'Please calm down so we can look into this.',
        ],
        0
      ),
      multi(
        'cs-cm-s1-b',
        'Phrases to Avoid',
        'Which of these would make the reply worse? Tick all that apply.',
        ['“As per our policy…”', '“Please calm down”', '“You should have checked the tracking page”', '“I’ve looked into your last three boxes”', '“Here’s what I’ve done for you today”'],
        [0, 1, 2]
      ),
      order('cs-cm-s1-c', 'Building the Reply', 'Put the parts of the reply in order.', [
        'Acknowledge how he feels and apologise for what went wrong',
        'Say what happened, briefly and honestly',
        'Say what you’ve done about it now',
        'Give the next step and when he’ll hear',
        'Sign off with your name',
      ]),
      written(
        'cs-cm-s1-d',
        'Rewrite It',
        'A colleague drafted: "Hi. Delays are caused by our courier. Your box will arrive soon. We can’t control this. Regards, Support." Rewrite it for Mark, using what the knowledge base allows (late box: £5 credit; two or more late in 3 months: a free month too).',
        [
          'Opens with a specific apology that recognises it’s the third late box',
          'Takes ownership instead of blaming the courier, and says what’s been checked',
          'Offers what policy allows: the £5 credit and a free month (and a replacement if it doesn’t arrive)',
          'Gives a clear next step and timescale, warm and personal, signed with a name',
        ],
        'Hi Mark, I’m really sorry. A third late box in a row isn’t good enough, and I understand why you’re thinking of cancelling. I’ve checked this month’s box: it left us on the 2nd and is stuck at the courier’s depot, and I’ve chased them today. I’ve added a £5 credit to your account and your next month is on us. If the box hasn’t reached you by Friday I’ll send a replacement straight away, and I’ll email you either way. Alex'
      ),
    ]
  ),
  ...questionSet(
    'cs-cm-s2',
    'Explaining Simply',
    'Engineering’s note',
    `Engineering's note on a login problem some customers had last week:

"Root cause: a race condition in the session token refresh. After a password change, the client cached a stale JWT. Hotfix 4.12.1 invalidates cached tokens on rotation. Affected users must sign out on all devices once, or clear site data."`,
    [
      choice(
        'cs-cm-s2-a',
        'For the Customer',
        'Which explanation is best for a customer?',
        [
          'After you changed your password, the app kept an old sign-in saved, so it kept logging you out. We’ve fixed it. Sign out on all your devices once and sign back in, and it’ll work.',
          'A race condition in the session token refresh caused a stale JWT. Hotfix 4.12.1 is live.',
          'It was a technical issue on our side which is now resolved.',
          'Please clear your cookies, cache, history and reinstall the app.',
        ],
        0
      ),
      match('cs-cm-s2-b', 'Plain English', 'Match each term to how you’d say it to a customer.', [
        ['Session token', 'What keeps you signed in'],
        ['Hotfix', 'A quick fix we’ve released'],
        ['Clear site data', 'Remove what your browser saved for our site'],
        ['Sign out on all devices', 'Log out everywhere you use the app'],
      ]),
      short('cs-cm-s2-c', 'The Release', 'Which version number has the fix? (As written.)', ['4.12.1', 'v4.12.1', 'hotfix 4.12.1']),
      written(
        'cs-cm-s2-d',
        'A Bug Report',
        'A customer writes: "when I add a gift card and then my discount code, it says something went wrong. without the gift card the code works. tried phone and laptop." Write the bug report for engineering: title, steps, expected, actual, severity.',
        [
          'A clear title saying what fails and where (discount code fails at checkout with a gift card in the basket)',
          'Numbered steps to reproduce (add an item and a gift card, enter the code, apply)',
          'Expected and actual result, with the error text ("Something went wrong")',
          'A sensible severity with a reason (e.g. Medium: there’s a workaround) and the devices tried',
        ],
        'Title: Discount code fails at checkout when the basket contains a gift card. Steps: 1. Add any product and a gift card to the basket. 2. Go to checkout. 3. Enter a valid discount code and press Apply. Expected: the discount is applied. Actual: “Something went wrong”; the same code works without the gift card. Seen on phone and laptop. Severity: Medium (workaround: buy the gift card separately).'
      ),
    ]
  ),
];

const COMMS_T1: HelpdeskTicket[] = [
  ticket({
    id: '5101',
    subject: 'THIRD late box. Sort it out or I cancel',
    requester: 'Mark Bell',
    email: 'mark.bell@outlook.com',
    plan: 'Glow Box',
    channel: 'Email',
    received: 'Today 08:12',
    ageMins: 48,
    slaMins: 190,
    messages: [msg('Mark Bell', 'Today 08:12', "THIRD month running my box is late. It was meant to arrive on the 3rd, it's now the 9th. Your tracking page just says 'in transit'. I'm paying £24 a month for candles that turn up whenever you feel like it. Sort it out or I'm cancelling and telling everyone I know.")],
    customer: { since: 'March 2024', location: 'Leeds', otherTickets: 2, note: 'Late boxes: July, August, September. Current box dispatched on the 2nd; held at the courier’s Leeds depot since the 4th.', orders: [{ id: 'GB-0925', item: 'Glow Box, September', date: 'Dispatched 2 Sep', total: '£24.00', status: 'In transit' }] },
  }),
];

const COMMS_T2: HelpdeskTicket[] = [
  ticket({
    id: '5201',
    subject: 'discount code not working??',
    requester: 'Leah Grant',
    email: 'leah.grant@gmail.com',
    channel: 'Chat',
    received: 'Today 08:30',
    ageMins: 30,
    slaMins: 210,
    messages: [msg('Leah Grant', 'Today 08:30', "Trying to use AUTUMN15 but it keeps saying something went wrong. I've got a gift card in the basket for my sister too. I'm not very techy, what do I do?")],
  }),
  ticket({
    id: '5202',
    subject: 'Checkout broken with codes',
    requester: 'Raj Mehta',
    email: 'raj@mehta.design',
    channel: 'Email',
    received: 'Today 07:58',
    ageMins: 62,
    slaMins: 178,
    messages: [msg('Raj Mehta', 'Today 07:58', "Your checkout is broken. Basket: a lamp and a £25 gift card. Code AUTUMN15 → 'Something went wrong, please try again'. Took the gift card out and the code worked fine. Same on iPhone Safari and Windows Chrome. Seems like a bug since your update last week?")],
  }),
];

const COMMS_TEST = moduleTest(
  'test-cs-comms-01',
  'Customer Communication',
  'Two question sets (an angry customer; explaining simply and reporting a bug), then two tasks in a working help desk: calm an angry subscriber and give what policy allows, then explain a workaround in plain words and file an engineering issue.',
  ['Written Communication', 'Empathy', 'De-escalation', 'Bug Reports', 'Help Desk'],
  HARTWELL_SCENARIO,
  COMMS_SETS,
  [
    deskTask(
      'cs-cm-t1',
      'The Angry Subscriber',
      `Mark Bell (#5101) is on his third late box. Check his customer panel and the "Late Glow Box" article.

Q1. Reply to Mark with empathy, and say what you can do for him.
Q2. Give him the late-box credit (the Late box credit macro).
Q3. Set Retention risk to High.
Q4. Leave an internal note for your team lead about why he's at risk and what you've given him.`,
      {
        product: 'Deskly',
        company: 'Hartwell Home',
        agent: 'Alex Morgan',
        now: 'Monday 09:00',
        groups: HARTWELL_GROUPS,
        tagOptions: HARTWELL_TAGS,
        kb: HARTWELL_KB,
        tickets: COMMS_T1,
        macros: [
          { name: 'Late box credit', body: "I've added a £5 credit to your account for the late box, which comes off your next payment.", tags: ['late_delivery'] },
          { name: 'Free month', body: 'Your next Glow Box is on us.', tags: ['retention'] },
        ],
        extraFields: [{ key: 'risk', label: 'Retention risk', options: ['Low', 'Medium', 'High'] }],
      },
      [
        [1, 'The reply to Mark', 'tickets.5101.lastPublic', {
          rubric: [
            'Opens with a specific, sincere apology that recognises it’s the third late box (no “as per our policy”, no blaming)',
            'Says what was checked and what happened to this box (held at the courier’s depot) honestly',
            'Says what you’ve done or offered: the £5 credit and a free month, and a replacement if it doesn’t arrive',
            'Gives a clear next step with a time, in a warm, personal tone, signed with a name',
          ],
        }],
        [2, 'The late-box credit is applied', 'tickets.5101.tagSet.late_delivery', 'true'],
        [3, 'Retention risk is High', 'tickets.5101.fields.risk', 'High'],
        [4, 'The note for the team lead', 'tickets.5101.lastNote', {
          rubric: [
            'Says he’s at risk of cancelling after three late boxes in a row (July, August, September)',
            'Says what he was given (credit / free month / replacement offer)',
            'Mentions the courier depot hold or a next step for the team (chase the courier, watch his next box)',
          ],
        }],
      ]
    ),
    deskTask(
      'cs-cm-t2',
      'Explain the Fix, Report the Bug',
      `Two customers can't use a discount code. The knowledge base has "Discount code fails at checkout" and "Bug reports for engineering".

Q1. Reply to Leah (#5201), who says she isn't very techy, explaining simply what to do.
Q2. Create an engineering issue from Raj's ticket (#5202), with the severity the article's scale gives.
Q3. Make the issue one engineering can act on: a clear title, numbered steps, expected and actual result.
Q4. Tag both tickets promo_bug and send Raj's to Tier 2 Technical.`,
      {
        product: 'Deskly',
        company: 'Hartwell Home',
        agent: 'Alex Morgan',
        now: 'Monday 09:00',
        groups: HARTWELL_GROUPS,
        tagOptions: HARTWELL_TAGS,
        kb: HARTWELL_KB,
        tickets: COMMS_T2,
        issues: { severities: ['Critical', 'High', 'Medium', 'Low'] },
      },
      [
        [1, 'The explanation for Leah', 'tickets.5201.lastPublic', {
          rubric: [
            'Explains in plain words, with no jargon, that the code won’t work while a gift card is in the same basket',
            'Gives the workaround as simple steps: remove the gift card, use the code on the order, buy the gift card separately',
            'Reassures her it’s a known problem on our side being fixed, not something she did',
            'Friendly, short and signed with a name',
          ],
        }],
        [2, 'The issue is filed', 'tickets.5202.issue.severity', 'Medium'],
        [3, 'The bug report', 'tickets.5202.issue.text', {
          rubric: [
            'A title that says what fails and where (discount code fails at checkout with a gift card in the basket)',
            'Numbered steps to reproduce: add a product and a gift card, enter AUTUMN15, apply',
            'Expected result (discount applied) and actual (“Something went wrong, please try again”), and that it works without the gift card',
            'Where it was seen (iPhone Safari, Windows Chrome) and since when (the update last week)',
          ],
        }],
        [4, 'Both reports are tagged', 'tickets.5201.tagSet.promo_bug', 'true'],
        [4, 'Raj’s report is tagged', 'tickets.5202.tagSet.promo_bug', 'true'],
        [4, 'Raj’s report is with Tier 2 Technical', 'tickets.5202.group', 'Tier 2 Technical'],
      ]
    ),
  ]
);

// =====================================================================================================
// Policies & Refunds
// =====================================================================================================

const REFUND_POLICY = `Refunds and returns (Hartwell Home)
• Change of mind: unused items returned within 30 days of delivery get a full refund of the item price. Return postage and the original delivery charge aren't refunded.
• Damaged or faulty: reported within 14 days of delivery with a photo: a refund or replacement, the customer's choice. If the whole order is affected, the original delivery charge is refunded too.
• Sale items: refunded only if damaged or faulty.
• Personalised items: no change-of-mind refunds.
• Over £150: needs a Team Lead's approval. Set Refund decision to Needs approval, assign to Team Leads and leave an internal note.
• Refunds go back to the original payment method only. Never to new bank details sent by email or chat: pass those to Trust & Safety.`;

const REFUND_SETS: Question[] = [
  ...questionSet(
    'cs-rf-s1',
    'Which Requests Qualify',
    'Refund policy',
    `${REFUND_POLICY}

Today is 20 May.`,
    [
      multi(
        'cs-rf-s1-a',
        'Allowed Now',
        'Which of these can you refund without anyone else’s approval? Tick all that apply.',
        [
          'An unused £45 cushion, delivered 2 May, customer changed their mind',
          'A £28 mug set, delivered 12 May, arrived chipped, photo sent',
          'A £60 lamp bought in the sale, delivered 10 May, customer changed their mind',
          'A £35 doormat personalised with the customer’s name, they’ve changed their mind',
          'A £640 sofa, delivered 15 May, arrived with a torn arm, photo sent',
        ],
        [0, 1]
      ),
      short('cs-rf-s1-b', 'Part of an Order', 'An order had three items (£36, £18 and £24) and £4.95 delivery. Six days after delivery the £18 item arrives broken, with a photo; the rest are fine. How much do you refund, in pounds?', ['18', '£18', '18.00', '£18.00']),
      choice(
        'cs-rf-s1-c',
        'The Sale Lamp',
        'The customer with the sale lamp is upset you can’t refund it. What do you do?',
        [
          'Explain kindly that sale items are refunded only if they’re faulty, and tell them what would still apply (help if it turns out to be faulty)',
          'Refund it to keep them happy',
          'Refund half as a compromise',
          'Close the ticket without replying',
        ],
        0
      ),
      written(
        'cs-rf-s1-d',
        'Saying No Well',
        'Write the reply declining the personalised doormat refund.',
        [
          'Declines clearly and early, without hiding it',
          'Gives the reason in plain words (personalised items can’t be resold, so no change-of-mind refunds)',
          'Is warm and acknowledges their disappointment',
          'Offers anything that does apply (e.g. if it’s faulty we’ll help; how to get in touch) and signs off with a name',
        ],
        'Hi Jo, thanks for getting in touch, and I’m sorry this one isn’t right for you. Because the doormat was made with your name on it, we can’t resell it, so personalised items can’t be returned for a change of mind. If it ever turns out to be faulty, though, just send me a photo and I’ll sort it straight away. Alex'
      ),
    ]
  ),
  ...questionSet(
    'cs-rf-s2',
    'Checking the Details',
    'Refund form #6107',
    `Ticket #6107 from Priya Nair: "The chair arrived with a torn seat, photo attached. I'd like my money back."

Order HH-20871, delivered 16 May: Oslo armchair £249.00, delivery £19.00. (Her other order, HH-20817, was a £49 lamp.)

A colleague filled in the refund form:

Order:      HH-20817
Amount:     £249.00
Refund to:  Bank transfer to the details in the customer's latest email
Reason:     Change of mind`,
    [
      multi(
        'cs-rf-s2-a',
        'What’s Wrong',
        'Which mistakes are on the form? Tick all that apply.',
        ['The order number is the lamp order, not the chair', 'The refund should go to the original payment method', 'The reason should be damaged or faulty', 'It needs a Team Lead’s approval first', 'The delivery charge is missing from the amount', 'Personalised furniture can’t be refunded at all'],
        [0, 1, 2, 3, 4]
      ),
      short('cs-rf-s2-b', 'The Right Amount', 'What is the correct refund, in pounds?', ['268', '£268', '268.00', '£268.00']),
      choice(
        'cs-rf-s2-c',
        'New Bank Details',
        'An email from a different address, signed "Priya", asks for the refund to go to new bank details. What do you do?',
        ['Don’t use them: refund to the original payment method and pass the email to Trust & Safety', 'Use them, since it’s signed Priya', 'Ask Priya to confirm by replying to that email', 'Split the refund between both'],
        0
      ),
      order('cs-rf-s2-d', 'Processing a Refund', 'Put these steps in order.', [
        'Find the right order and item',
        'Check it against the policy and the evidence',
        'Work out the amount',
        'Check whether it needs approval',
        'Refund to the original payment method',
        'Note it on the ticket and tell the customer',
      ]),
    ]
  ),
];

const refundOrders = (orders: { id: string; item: string; date: string; total: string; status?: string }[]) => orders.map((o) => ({ status: 'Delivered', ...o }));
const REFUND_T1: HelpdeskTicket[] = [
  ticket({ id: '6101', subject: 'Return a cushion', requester: 'Ella Ward', email: 'ella.ward@gmail.com', channel: 'Email', received: 'Today 08:02', ageMins: 58, slaMins: 420, messages: [msg('Ella Ward', 'Today 08:02', "Hi, the velvet cushion isn't the colour I expected. It's unused and still in the bag; I've posted it back. Can I have a refund?")], customer: { since: '2025', orders: refundOrders([{ id: 'HH-30115', item: 'Velvet cushion £45.00 · delivery £4.95', date: 'Delivered 2 May', total: '£49.95' }]) } }),
  ticket({ id: '6102', subject: 'Changed my mind on the lamp', requester: 'Tom Hale', email: 'tom.hale@outlook.com', channel: 'Web form', received: 'Today 08:20', ageMins: 40, slaMins: 400, messages: [msg('Tom Hale', 'Today 08:20', "Bought the brass lamp in your sale, but it doesn't suit the room. Can I return it for a refund?")], customer: { since: '2024', orders: refundOrders([{ id: 'HH-30140', item: 'Brass lamp (sale) £60.00', date: 'Delivered 10 May', total: '£60.00' }]) } }),
  ticket({ id: '6103', subject: 'Mugs arrived chipped', requester: 'Ana Silva', email: 'ana.silva@me.com', channel: 'Email', received: 'Today 07:45', ageMins: 75, slaMins: 360, messages: [msg('Ana Silva', 'Today 07:45', "Two of the four stoneware mugs arrived chipped (photo attached). The bowls in the same order are fine. I'd like a refund for the mug set please.")], customer: { since: '2023', orders: refundOrders([{ id: 'HH-30152', item: 'Stoneware mug set £28.00 · bowls £32.00 · delivery £4.95', date: 'Delivered 12 May', total: '£64.95' }]) } }),
  ticket({ id: '6104', subject: 'Doormat refund', requester: 'Jo Patel', email: 'jo.patel@gmail.com', channel: 'Email', received: 'Today 08:31', ageMins: 29, slaMins: 450, messages: [msg('Jo Patel', 'Today 08:31', "I ordered the doormat with our family name on it, but we're moving house so it's no use now. Can I send it back for a refund?")], customer: { since: '2025', orders: refundOrders([{ id: 'HH-30166', item: 'Personalised doormat £35.00', date: 'Delivered 14 May', total: '£35.00' }]) } }),
  ticket({ id: '6105', subject: 'Sofa arm torn', requester: 'Ben Cole', email: 'ben@colefamily.co.uk', channel: 'Email', received: 'Today 07:30', ageMins: 90, slaMins: 330, messages: [msg('Ben Cole', 'Today 07:30', 'The new sofa arrived on Thursday with a tear along the left arm, photos attached. I would like a full refund please.')], customer: { since: '2022', orders: refundOrders([{ id: 'HH-30171', item: 'Harlow sofa £640.00 · delivery £0.00', date: 'Delivered 15 May', total: '£640.00' }]) } }),
];

const REFUND_T2: HelpdeskTicket[] = [
  ticket({
    id: '6201',
    subject: 'Torn chair seat',
    requester: 'Priya Nair',
    email: 'priya.nair@gmail.com',
    channel: 'Email',
    received: 'Today 08:10',
    ageMins: 50,
    slaMins: 410,
    messages: [msg('Priya Nair', 'Friday 17:02', 'The chair arrived with a torn seat, photo attached. I would like my money back please.'), { from: 'note', name: 'Kim Shah (Team Lead)', at: 'Today 08:05', body: 'Approved: full refund for the damaged Oslo armchair, including delivery. Process it to the original payment method. Kim' }],
    customer: {
      since: '2021',
      orders: refundOrders([
        { id: 'HH-20817', item: 'Arc floor lamp £49.00 · delivery £4.95', date: 'Delivered 2 Apr', total: '£53.95' },
        { id: 'HH-20871', item: 'Oslo armchair £249.00 · delivery £19.00', date: 'Delivered 16 May', total: '£268.00' },
        { id: 'HH-20781', item: 'Oslo footstool £89.00 · delivery £9.00', date: 'Delivered 1 Mar', total: '£98.00' },
      ]),
      note: 'Payment on file: Visa ending 4417 (used for every order).',
    },
  }),
  ticket({
    id: '6202',
    subject: 'Re: refund, new bank details',
    requester: 'Priya N',
    email: 'priya.refunds@protonmail.com',
    channel: 'Email',
    received: 'Today 08:40',
    ageMins: 20,
    slaMins: 440,
    messages: [msg('Priya N', 'Today 08:40', 'Hi, about my chair refund, my card has been cancelled so please send the money to my new account instead: sort code 20-45-77, account 61190342. Thanks, Priya')],
  }),
];

const REFUNDS_TEST = moduleTest(
  'test-cs-refunds-01',
  'Policies & Refunds',
  'Two question sets (which requests qualify; checking a refund’s details), then two tasks in a working help desk: decide five refund requests against the policy and issue the right ones, then process one refund with the exact order, amount and payment method, and spot an attempt to redirect it.',
  ['Refund Policy', 'Attention to Detail', 'Written Communication', 'Fraud Awareness', 'Help Desk'],
  HARTWELL_SCENARIO,
  REFUND_SETS,
  [
    deskTask(
      'cs-rf-t1',
      'Five Refund Requests',
      `Five customers want refunds. Today is 20 May. The policy is in the knowledge base ("Refunds and returns"); each customer's order is in their panel.

Q1. Set the Refund decision on every ticket: Approve, Decline or Needs approval.
Q2. Issue the refunds you approved (Issue refund in the Actions panel), with the right order and amount, to the original payment method.
Q3. The one that needs approval: assign it to Team Leads with an internal note.
Q4. Reply to Jo (#6104) declining the doormat refund.`,
      {
        product: 'Deskly',
        company: 'Hartwell Home',
        agent: 'Alex Morgan',
        now: 'Tuesday 20 May, 09:00',
        groups: HARTWELL_GROUPS,
        tagOptions: HARTWELL_TAGS,
        kb: [{ title: 'Refunds and returns', body: REFUND_POLICY }],
        tickets: REFUND_T1,
        extraFields: [{ key: 'decision', label: 'Refund decision', options: ['Approve', 'Decline', 'Needs approval'] }],
        refunds: { methods: ['Original payment method', 'Store credit', 'Bank transfer to new details'], reasons: ['Change of mind', 'Damaged or faulty', 'Late or lost', 'Other'] },
      },
      [
        [1, 'Change of mind, unused, in time: approve', 'tickets.6101.fields.decision', 'Approve'],
        [1, 'Sale item, change of mind: decline', 'tickets.6102.fields.decision', 'Decline'],
        [1, 'Damaged mugs with a photo: approve', 'tickets.6103.fields.decision', 'Approve'],
        [1, 'Personalised, change of mind: decline', 'tickets.6104.fields.decision', 'Decline'],
        [1, 'The £640 sofa needs approval', 'tickets.6105.fields.decision', 'Needs approval'],
        [2, 'The cushion: £45 (no postage or delivery)', 'tickets.6101.refund.amount', '45'],
        [2, 'The mugs: £28 (part of the order, so no delivery)', 'tickets.6103.refund.amount', '28'],
        [2, 'Both to the original payment method', 'tickets.6103.refund.method', 'Original payment method'],
        [3, 'The sofa is with Team Leads', 'tickets.6105.group', 'Team Leads'],
        [3, 'with a note', 'tickets.6105.noted', 'true'],
        [4, 'The reply to Jo', 'tickets.6104.lastPublic', {
          rubric: [
            'Declines clearly, without hiding it in the middle',
            'Explains why in plain words: personalised items can’t be resold, so there are no change-of-mind refunds',
            'Warm and understanding about the house move',
            'Says what would still apply (e.g. help if it’s faulty) and signs off with a name',
          ],
        }],
      ]
    ),
    deskTask(
      'cs-rf-t2',
      'Process the Refund',
      `Priya Nair's damaged armchair refund has been approved by your Team Lead (see the note on #6201). Check her orders carefully.

Q1. Issue the refund on the right order.
Q2. For the right amount: the chair and its delivery.
Q3. To the right place, with the right reason.
Q4. Deal with #6202, which asks for the refund to go to new bank details.`,
      {
        product: 'Deskly',
        company: 'Hartwell Home',
        agent: 'Alex Morgan',
        now: 'Tuesday 20 May, 09:00',
        groups: HARTWELL_GROUPS,
        tagOptions: HARTWELL_TAGS,
        kb: [{ title: 'Refunds and returns', body: REFUND_POLICY }],
        tickets: REFUND_T2,
        refunds: { methods: ['Original payment method', 'Store credit', 'Bank transfer to new details'], reasons: ['Change of mind', 'Damaged or faulty', 'Late or lost', 'Other'] },
      },
      [
        [1, 'The armchair order', 'tickets.6201.refund.order', 'HH-20871'],
        [2, '£268.00', 'tickets.6201.refund.amount', '268'],
        [3, 'To the original payment method', 'tickets.6201.refund.method', 'Original payment method'],
        [3, 'As damaged or faulty', 'tickets.6201.refund.reason', 'Damaged or faulty'],
        [4, 'The request goes to Trust & Safety', 'tickets.6202.group', 'Trust & Safety'],
        [4, 'and is tagged as a security concern', 'tickets.6202.tagSet.account_security', 'true'],
      ]
    ),
  ]
);

// =====================================================================================================
// Listening & Troubleshooting
// =====================================================================================================

const LONG_MESSAGE = `Hello, sorry this is long, I've been meaning to write for a while. First of all I love the app, I've used it since 2021, although I'm not a fan of the new green colour, it was nicer before. I spoke to someone called Dan last month about the reports page loading slowly but that seems fine now. I was away in Portugal for two weeks so I'm catching up on everything. Also is there a way to add my logo bigger? Not urgent. Anyway the real reason I'm writing: on Monday I sent invoice INV-0412 to my biggest client, Harlow Joinery, for £2,400, but it went out with last year's prices on it, so it showed £2,160 and they've already paid the £2,160. I didn't change anything; I updated my price list on the 1st. Can you help me work out what's happened? I don't want to look unprofessional.`;

const LISTEN_SETS: Question[] = [
  ...questionSet(
    'cs-ls-s1',
    'Finding the Real Problem',
    'Ticket #7101',
    `Ruth Ames, who runs a joinery supplies shop, writes:

"${LONG_MESSAGE}"`,
    [
      choice(
        'cs-ls-s1-a',
        'The Real Problem',
        'What is the problem you need to solve?',
        ['An invoice went out with last year’s prices although she updated her price list, so a client paid £240 too little', 'The reports page loads slowly', 'She doesn’t like the new green colour', 'She wants a bigger logo'],
        0
      ),
      multi(
        'cs-ls-s1-b',
        'Details That Matter',
        'Which details matter for solving it? Tick all that apply.',
        ['Invoice INV-0412, sent on Monday', 'It showed last year’s prices (£2,160 instead of £2,400)', 'She updated her price list on the 1st', 'The client has already paid', 'She was in Portugal for two weeks', 'She spoke to Dan last month'],
        [0, 1, 2, 3]
      ),
      short('cs-ls-s1-c', 'What’s Still Owed', 'How much does Harlow Joinery still owe her, in pounds?', ['240', '£240', '240.00', '£240.00']),
      written(
        'cs-ls-s1-d',
        'Two Sentences',
        'Summarise the problem in two sentences for the internal note, so a colleague can pick it up without reading her message.',
        [
          'Says invoice INV-0412 (sent Monday to Harlow Joinery) used last year’s prices: £2,160 instead of £2,400',
          'Says she updated her price list on the 1st and didn’t change anything else, so it may be a fault',
          'Says the client has already paid £2,160, leaving £240 outstanding, and what she needs (find the cause and fix the shortfall)',
        ],
        'INV-0412, sent on Monday to Harlow Joinery, used last year’s prices (£2,160 instead of £2,400), although she updated her price list on the 1st. The client has already paid £2,160, so £240 is outstanding; she needs to know why and how to bill the difference.'
      ),
    ]
  ),
  ...questionSet(
    'cs-ls-s2',
    'Troubleshooting a Login',
    'Knowledge base: can’t log in',
    `Can't log in: checklist

1. Which email are they using? (typos, an old work email)
2. The exact error message
3. Did they sign up with Google? (then there's no password: use Continue with Google)
4. Is 2-step verification on, and do they have their codes?
5. Reset links last 1 hour, and only the newest works

Never ask for: their password, 2-step codes, card numbers.`,
    [
      order('cs-ls-s2-a', 'Asking in Order', 'Put these questions in a sensible order.', ['Which email address are you signing in with?', 'What exactly does the error say?', 'Did you first sign up with Continue with Google?', 'Is 2-step verification turned on?']),
      choice(
        'cs-ls-s2-b',
        'The Password Offered',
        'A customer starts typing their password into the chat “so you can check it”. What do you do?',
        ['Stop them: say you never need their password, and suggest changing it if they’ve shared it', 'Use it to log in and look', 'Thank them and note it on the ticket', 'Ask for their 2-step code too'],
        0
      ),
      match('cs-ls-s2-c', 'Error and Cause', 'Match each error to its likely cause.', [
        ['“No account with that email”', 'A typo or a different email address'],
        ['“This account uses Google sign-in”', 'They signed up with Google'],
        ['“Code invalid” for 2-step verification', 'The phone’s clock is wrong or the wrong app'],
        ['“This link has expired”', 'An old reset email was used'],
      ]),
      written(
        'cs-ls-s2-d',
        'Explain the Fix',
        'Write the message telling a customer who signed up with Google how to get in.',
        [
          'Explains simply why: they signed up with Google, so there’s no separate password',
          'Gives the steps: go to the sign-in page, press Continue with Google, choose the same Google account',
          'Offers what to do if it still fails, in a friendly tone without jargon',
        ],
        'Good news, I can see what’s happening: you created your account with Google, so there isn’t a separate Tallyhub password. On the sign-in page, press Continue with Google and pick the same Google account you used before, and you’ll be straight in. If that doesn’t work, reply here and I’ll help.'
      ),
    ]
  ),
];

const LISTEN_T1: HelpdeskTicket[] = [
  ticket({ id: '7101', subject: 'Couple of things', requester: 'Ruth Ames', email: 'ruth@amessupplies.co.uk', plan: 'Standard', channel: 'Email', received: 'Today 08:22', ageMins: 38, slaMins: 442, messages: [msg('Ruth Ames', 'Today 08:22', LONG_MESSAGE)], customer: { since: 'May 2021', location: 'Norwich', otherTickets: 3, note: 'Price list updated 1 May. Invoice INV-0412 created 28 April as a draft, sent Monday.' } }),
];

const LOGIN_KB = [
  { title: 'Can’t log in: checklist', body: "1. Which email are they using? (typos, an old work email)\n2. The exact error message\n3. Did they sign up with Google? (then there's no password: use Continue with Google)\n4. Is 2-step verification on, and do they have their codes?\n5. Reset links last 1 hour, and only the newest works\n\nNever ask for: their password, 2-step codes, card numbers." },
  { title: 'Draft invoices and price changes', body: 'An invoice keeps the prices it had when it was created. A draft made before a price-list change keeps the old prices when it is sent later. To fix: create a credit note or a new invoice for the difference.' },
];

const LISTEN_TEST = moduleTest(
  'test-cs-troubleshoot-01',
  'Listening & Troubleshooting',
  'Two question sets (finding the real problem in a long message; troubleshooting a login), then two tasks in a working help desk: pick out and act on the real problem in a rambling email, and work a live chat with a customer who can’t log in, asking the right questions to find the cause.',
  ['Active Listening', 'Troubleshooting', 'Live Chat', 'Written Communication', 'Help Desk'],
  TALLYHUB_SCENARIO,
  LISTEN_SETS,
  [
    deskTask(
      'cs-ls-t1',
      'The Long Email',
      `Ruth Ames (#7101) wrote a long email. Read it all, and check her customer panel and the knowledge base.

Q1. Set the Type to Incident and the priority to High: a customer has been under-billed.
Q2. Tag it invoices, and keep it with Tier 1 Support (the knowledge base explains the cause).
Q3. Leave an internal note summarising the real problem in a sentence or two.
Q4. Reply to Ruth: explain what happened and how to fix the £240 shortfall.`,
      tallyhub('Sam Patel', LISTEN_T1, { kb: [...TALLYHUB_KB, ...LOGIN_KB] }),
      [
        [1, 'Type is Incident', 'tickets.7101.type', 'Incident'],
        [1, 'Priority is High', 'tickets.7101.priority', 'High'],
        [2, 'Tagged invoices', 'tickets.7101.tagSet.invoices', 'true'],
        [2, 'With Tier 1 Support', 'tickets.7101.group', 'Tier 1 Support'],
        [3, 'The summary note', 'tickets.7101.lastNote', {
          rubric: [
            'Names the real problem: INV-0412 to Harlow Joinery went out at last year’s prices (£2,160 instead of £2,400)',
            'Notes the client has paid, leaving £240 outstanding',
            'Notes the likely cause from her panel: the invoice was drafted on 28 April, before the 1 May price change',
          ],
        }],
        [4, 'The reply to Ruth', 'tickets.7101.lastPublic', {
          rubric: [
            'Explains simply why: the invoice was created as a draft before she updated her prices, and invoices keep the prices they were created with',
            'Gives the fix: a new invoice (or adjustment) to Harlow Joinery for the £240 difference',
            'Reassures her it wasn’t a mistake on her part and how to avoid it (check drafts after a price change)',
            'Ignores the side remarks or answers them briefly without losing the main point; warm and signed',
          ],
        }],
      ]
    ),
    deskTask(
      'cs-ls-t2',
      'Live Chat: Can’t Log In',
      `Sam Ellis is on live chat (the chat icon on the left) and can't log in. Use your question library to find out what's wrong; the customer answers each question you send. The knowledge base has "Can't log in: checklist".

Q1. Ask the questions that find the cause.
Q2. Stay safe: never ask for a password or card number.
Q3. Set the cause in the Wrap-up panel.
Q4. Type a message explaining, simply, how Sam can get in.`,
      tallyhub('Sam Patel', [], {
        kb: LOGIN_KB,
        chat: {
          customer: 'Sam Ellis',
          topic: 'Can’t log in',
          opening: ['Hi, I can’t get into my account. I’ve reset my password twice and it still won’t let me in!!'],
          questions: [
            { id: 'q-email', text: 'Which email address are you signing in with?', reply: 'sam@ellisdesign.co.uk, same as always.' },
            { id: 'q-error', text: 'What exactly does the error message say?', reply: 'It says "This account uses Google sign-in. Continue with Google." But I want to use my password.' },
            { id: 'q-google', text: 'When you first signed up, did you use the Continue with Google button?', reply: 'Oh… yes, I think I did, last year. Is that why?' },
            { id: 'q-2fa', text: 'Do you have 2-step verification turned on?', reply: 'No, I don’t think so.' },
            { id: 'q-browser', text: 'Which browser and device are you using?', reply: 'Chrome on my laptop.' },
            { id: 'q-restart', text: 'Have you tried turning your computer off and on again?', reply: 'Yes, twice. Didn’t help.' },
            { id: 'q-password', text: 'Can you tell me your password so I can check it?', reply: 'Erm, okay… it’s Sunflower2024!' },
            { id: 'q-card', text: 'Can you confirm the long number on the card you pay with?', reply: 'It’s 4929 1234 5678 9012.' },
          ],
          causes: ['A typo in the email address', 'Signed up with Google, so there’s no password', '2-step verification codes out of sync', 'The reset link had expired', 'Account locked after too many attempts'],
        },
      }),
      [
        [1, 'Asked for the exact error', 'chat.askedSet.q-error', 'true'],
        [1, 'Asked how they signed up', 'chat.askedSet.q-google', 'true'],
        [2, 'Never asked for the password', 'chat.askedSet.q-password', ''],
        [2, 'Never asked for the card number', 'chat.askedSet.q-card', ''],
        [3, 'The right cause', 'chat.cause', 'Signed up with Google, so there’s no password'],
        [4, 'The explanation to Sam', 'chat.lastAgent', {
          rubric: [
            'Explains simply why: the account was created with Google, so there’s no separate password and resets won’t help',
            'Gives the steps: on the sign-in page press Continue with Google and pick the same Google account',
            'Friendly and jargon-free, offering help if it still doesn’t work',
          ],
        }],
      ]
    ),
  ]
);

// Each module is made for customer support: Ticket Support for Customer Support …
export const SUPPORT_MODULE_TESTS: AssessmentTest[] = [
  forField(TRIAGE_TEST, 'Ticket Support', 'Customer Support'),
  forField(COMMS_TEST, 'Communication', 'Customer Support'),
  forField(REFUNDS_TEST, 'Refunds & Policy', 'Customer Support'),
  forField(LISTEN_TEST, 'Troubleshooting', 'Customer Support'),
];
