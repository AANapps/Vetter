import { AssessmentTest, Question } from '../../types';
import { choice, match, multi, order, short, written } from '../questionKit';
import { J, P, S, ModuleSkeleton, tagged } from './kit';
import { roleMain } from './roleKit';
import { simTask } from './simKit';
import { HelpdeskTicket, helpdeskApp } from './helpdeskApp';

// Customer support: triage and service targets (prioritising, routing, typing and tagging a ticket queue, and meeting
// first-reply targets), worked in a real help desk from Mid-level up.

const CS: ['Customer Support Agent'] = ['Customer Support Agent'];

export const SUPPORT_TESTS: AssessmentTest[] = [
  roleMain(
    'test-support-triage-01',
    'Ticket Triage & SLAs',
    'Customer Support',
    'Prioritise by impact and urgency, meet first-reply targets, route and escalate to the right team, and type and tag tickets so problems show up early. From Mid-level, triage a live queue in a help desk.',
    ['Ticket Triage', 'SLAs', 'Prioritisation', 'Escalation', 'Help Desk'],
    CS
  ),
];

// ---------- The help desk queues ----------

export const TALLYHUB_GROUPS = ['Tier 1 Support', 'Billing', 'Tier 2 Technical', 'Trust & Safety', 'Privacy'];
export const TALLYHUB_TAGS = ['how_to', 'billing', 'double_charge', 'login', 'bug', 'outage', 'bank_feed', 'security', 'phishing', 'data_request', 'feature_request', 'invoices'];
export const TALLYHUB_SLA = ['Urgent: first reply within 1 hour', 'High: within 4 hours', 'Normal: within 8 business hours', 'Low: within 2 business days', 'Business plan: half those times'];
export const TALLYHUB_KB = [
  {
    title: 'Which team handles what',
    body: 'Tier 1 Support: how-to questions, logins, settings.\nBilling: charges, refunds, invoices from Tallyhub, plan changes.\nTier 2 Technical: anything broken (errors, features not working, sync failures).\nTrust & Safety: hacked or suspicious accounts, phishing, someone seeing data that isn\'t theirs.\nPrivacy: requests to see, export or delete personal data (legal deadline: one month).',
  },
  {
    title: 'Setting priority',
    body: 'Priority is impact × urgency, not how upset the customer sounds or what plan they pay for.\nUrgent: security or data exposure, or the service down for many customers.\nHigh: a customer blocked from core work (can\'t send invoices, charged wrongly) or a likely security threat.\nNormal: something not working with a workaround, account access for one person.\nLow: questions, feedback and feature ideas.',
  },
];

const ticket = (t: HelpdeskTicket) => t;

export const QUEUE_P: HelpdeskTicket[] = [
  ticket({
    id: '2201',
    subject: "Someone else's invoices are showing in my account",
    requester: 'Grace Okoro',
    email: 'grace@okorodesign.co.uk',
    plan: 'Standard',
    channel: 'Email',
    received: 'Today 08:51',
    ageMins: 9,
    slaMins: 471,
    messages: [{ from: 'customer', name: 'Grace Okoro', at: 'Today 08:51', body: "Morning. When I logged in just now, my Invoices page listed six invoices for a company called Harlow Joinery, with their customers' names and addresses. They're definitely not mine. I haven't touched anything." }],
    customer: { since: 'June 2023', location: 'Bristol', otherTickets: 1 },
  }),
  ticket({
    id: '2202',
    subject: 'URGENT!!! HOW DO I PUT MY LOGO ON INVOICES',
    requester: 'Dev Malhotra',
    email: 'dev@malhotraplumbing.co.uk',
    plan: 'Business',
    channel: 'Email',
    received: 'Today 08:20',
    ageMins: 40,
    slaMins: 200,
    messages: [{ from: 'customer', name: 'Dev Malhotra', at: 'Today 08:20', body: 'I NEED MY LOGO ON MY INVOICES. WHERE IS THE SETTING. THIS IS URGENT.' }],
    customer: { since: 'January 2025', location: 'Leicester', otherTickets: 0 },
  }),
  ticket({
    id: '2203',
    subject: 'Charged twice for November',
    requester: 'Hannah Price',
    email: 'hannah@pricebookkeeping.com',
    plan: 'Standard',
    channel: 'Web form',
    received: 'Today 07:55',
    ageMins: 65,
    slaMins: 415,
    messages: [{ from: 'customer', name: 'Hannah Price', at: 'Today 07:55', body: 'My bank shows two payments of £18 to Tallyhub on 1 November. I only have one account. Can you refund the second one?' }],
    customer: { since: 'March 2022', location: 'York', otherTickets: 3 },
  }),
  ticket({
    id: '2204',
    subject: 'Invoices won’t send, it’s payday',
    requester: 'Marcus Bell',
    email: 'accounts@bellbuild.co.uk',
    plan: 'Business',
    channel: 'Chat',
    received: 'Today 08:34',
    ageMins: 26,
    slaMins: 94,
    messages: [
      { from: 'customer', name: 'Marcus Bell', at: 'Today 08:34', body: 'Every time I press Send on an invoice I get "Error 500: something went wrong". Started about 08:10. I have 40 invoices to get out today so my subcontractors get paid.' },
      { from: 'customer', name: 'Marcus Bell', at: 'Today 08:36', body: 'Tried Chrome and Edge, same thing. Downloading as PDF still works.' },
    ],
    customer: { since: 'August 2021', location: 'Manchester', otherTickets: 5 },
  }),
  ticket({
    id: '2205',
    subject: 'Delete all my data please',
    requester: 'Owen Hughes',
    email: 'owen.hughes@gmail.com',
    channel: 'Email',
    received: 'Yesterday 17:40',
    ageMins: 920,
    slaMins: 380,
    messages: [{ from: 'customer', name: 'Owen Hughes', at: 'Yesterday 17:40', body: "I've closed my business. Under GDPR please delete everything you hold about me and confirm when it's done." }],
    customer: { since: 'May 2024', otherTickets: 0 },
  }),
  ticket({
    id: '2206',
    subject: 'Idea: dark mode?',
    requester: 'Lucy Fernandes',
    email: 'lucy@fernandesphoto.com',
    channel: 'Web form',
    received: 'Yesterday 14:02',
    ageMins: 1138,
    slaMins: 1500,
    messages: [{ from: 'customer', name: 'Lucy Fernandes', at: 'Yesterday 14:02', body: 'Love Tallyhub. Any chance of a dark mode? I do my invoicing late at night.' }],
  }),
  ticket({
    id: '2207',
    subject: "Can't log in after resetting password",
    requester: 'Tom Ellis',
    email: 'tom@elliscarpentry.co.uk',
    channel: 'Chat',
    received: 'Today 08:42',
    ageMins: 18,
    slaMins: 462,
    messages: [{ from: 'customer', name: 'Tom Ellis', at: 'Today 08:42', body: 'Reset my password twice, it still says "incorrect password". Using the link from your email.' }],
  }),
  ticket({
    id: '2208',
    subject: 'Is this email from you?',
    requester: 'Sarah Kemp',
    email: 'sarah@kempflorals.co.uk',
    channel: 'Email',
    received: 'Today 08:05',
    ageMins: 55,
    slaMins: 185,
    messages: [{ from: 'customer', name: 'Sarah Kemp', at: 'Today 08:05', body: 'I got an email "from Tallyhub Billing" saying my card failed and asking me to re-enter my bank details at tallyhub-billing-secure.com. Is that you? Two of my friends who use Tallyhub got it too.' }],
  }),
];

const QUEUE_S: HelpdeskTicket[] = [
  ticket({
    id: '3101',
    subject: 'Bank feed stopped syncing',
    requester: 'Nadia Rahman',
    email: 'nadia@rahmanlaw.co.uk',
    plan: 'Business',
    channel: 'Email',
    received: 'Today 07:12',
    ageMins: 108,
    slaMins: 12,
    messages: [{ from: 'customer', name: 'Nadia Rahman', at: 'Today 07:12', body: 'No transactions from Barclays since yesterday evening. The bank connection page says "Connected" but nothing new comes in.' }],
  }),
  ticket({
    id: '3102',
    subject: 'Transactions missing',
    requester: 'Chris Walker',
    email: 'chris@walkerhvac.com',
    channel: 'Chat',
    received: 'Today 08:31',
    ageMins: 29,
    slaMins: 451,
    messages: [{ from: 'customer', name: 'Chris Walker', at: 'Today 08:31', body: "My Barclays payments from the weekend aren't showing up to reconcile. Is something wrong?" }],
  }),
  ticket({
    id: '3103',
    subject: 'bank sync broken AGAIN',
    requester: 'Imogen Lacey',
    email: 'imogen@laceyevents.co.uk',
    channel: 'Email',
    received: 'Today 08:47',
    ageMins: 13,
    slaMins: 467,
    messages: [{ from: 'customer', name: 'Imogen Lacey', at: 'Today 08:47', body: 'Barclays feed not updating since Sunday night. Second time this year. I pay for this to work.' }],
  }),
  ticket({
    id: '3104',
    subject: 'Locked out, please update my email',
    requester: 'Daniel Price',
    email: 'd.price.accounts@outlook.com',
    channel: 'Email',
    received: 'Today 08:15',
    ageMins: 45,
    slaMins: 195,
    messages: [{ from: 'customer', name: 'Daniel Price', at: 'Today 08:15', body: "Hi, I've lost access to my old work email so I can't reset my password. Please change the login email on my Tallyhub account (Price Electrical Ltd) to this address, d.price.accounts@outlook.com, as soon as possible. I need to send invoices today." }],
    customer: { since: 'April 2020', location: 'Cardiff', otherTickets: 0, note: 'Login email on file: dan@priceelectrical.co.uk. Last login yesterday 18:02 from Cardiff, UK.' },
  }),
  ticket({
    id: '3105',
    subject: 'How do I add a second user?',
    requester: 'Fiona Grant',
    email: 'fiona@grantandco.com',
    plan: 'Enterprise',
    channel: 'Email',
    received: 'Today 08:40',
    ageMins: 20,
    slaMins: 100,
    messages: [{ from: 'customer', name: 'Fiona Grant', at: 'Today 08:40', body: 'We have a new bookkeeper starting next week. How do I give her access? Not urgent, whenever you can.' }],
    customer: { since: 'February 2019', location: 'Edinburgh', otherTickets: 12, note: 'Enterprise account: 45 users. Account manager: Ben Ade.' },
  }),
  ticket({
    id: '3106',
    subject: 'Disputing this with my bank',
    requester: 'Ravi Patel',
    email: 'ravi@patelcleaning.co.uk',
    channel: 'Email',
    received: 'Yesterday 16:20',
    ageMins: 1000,
    slaMins: -40,
    priority: 'Low',
    messages: [{ from: 'customer', name: 'Ravi Patel', at: 'Yesterday 16:20', body: "I cancelled in October and you charged me £36 for November anyway. I've emailed twice. If I don't hear back today I'm raising a chargeback and leaving a review." }],
    customer: { since: 'July 2023', otherTickets: 2, note: 'Plan cancelled 28 Oct, effective end of October. November charge £36 taken 1 Nov.' },
  }),
  ticket({
    id: '3107',
    subject: 'Recurring invoices: change the day?',
    requester: 'Ben Shaw',
    email: 'ben@shawgardens.co.uk',
    channel: 'Web form',
    received: 'Yesterday 11:00',
    ageMins: 1320,
    slaMins: 1080,
    messages: [{ from: 'customer', name: 'Ben Shaw', at: 'Yesterday 11:00', body: 'Can I make my monthly invoices go out on the 1st instead of the 28th?' }],
  }),
];

const helpdesk = (agent: string, tickets: HelpdeskTicket[]) =>
  helpdeskApp({
    product: 'Deskly',
    company: 'Tallyhub',
    agent,
    now: 'Monday 09:00',
    groups: TALLYHUB_GROUPS,
    tagOptions: TALLYHUB_TAGS,
    slaPolicy: TALLYHUB_SLA,
    kb: TALLYHUB_KB,
    tickets,
  });

const SIM_P: Question = simTask(
  'm-sup-sim-p1',
  'Triage the Morning Queue',
  `You're on Tallyhub's support desk (Tallyhub makes invoicing software for small businesses). It's 09:00 and eight tickets are waiting, none of them triaged.

1. Open every ticket.
2. Set each one's priority, using impact and urgency rather than tone or plan.
3. Put each in the right assignee group.
4. Set the type (Question, Incident, Problem or Task) where you can tell.

You don't need to reply to anyone. The knowledge base (book icon, or the panel in a ticket) has the team guide.`,
  'Deskly: Tallyhub support',
  helpdesk('Sam Patel', QUEUE_P),
  [
    ["Grace's ticket (other customers' invoices visible) has the right priority", 'tickets.2201.priority', 'Urgent'],
    ["Grace's ticket is with the right team", 'tickets.2201.group', 'Trust & Safety'],
    ["Dev's logo question isn't over-prioritised", 'tickets.2202.priority', 'Low|Normal'],
    ["Hannah's double charge is with the right team", 'tickets.2203.group', 'Billing'],
    ["Marcus's failing invoices are with the right team", 'tickets.2204.group', 'Tier 2 Technical'],
    ["Marcus's failing invoices have the right priority", 'tickets.2204.priority', 'High|Urgent'],
    ["Owen's deletion request is with the right team", 'tickets.2205.group', 'Privacy'],
    ["Sarah's suspicious email is with the right team", 'tickets.2208.group', 'Trust & Safety'],
  ],
  { minutes: 12, weight: 45 }
);

const SIM_S: Question = simTask(
  'm-sup-sim-s1',
  'Monday Morning: Triage Under Pressure',
  `It's 09:00 on Monday at Tallyhub. Seven tickets came in over the weekend and this morning. Some are connected, one isn't what it seems, and one target has already been missed.

1. Triage every ticket: priority, assignee group and type.
2. Tag every ticket about the same fault with the team’s tag for it (from the tag list), so they can be tracked together.
3. Leave an internal note on any ticket where the next person needs to know something before acting.

Don't reply to customers. The service targets are in the views panel and the team guide is in the knowledge base.`,
  'Deskly: Tallyhub support',
  helpdesk('Sam Patel', QUEUE_S),
  [
    ['The newest bank-feed ticket is with the right team', 'tickets.3102.group', 'Tier 2 Technical'],
    ['The bank-feed tickets share a tag (the latest one checked)', 'tickets.3103.tagSet.bank_feed', 'true'],
    ['The first bank-feed ticket shares the tag', 'tickets.3101.tagSet.bank_feed', 'true'],
    ['The email-change request is with the right team', 'tickets.3104.group', 'Trust & Safety'],
    ['The email-change request has a note for the next person', 'tickets.3104.noted', 'true'],
    ["The Enterprise customer's how-to question isn't over-prioritised", 'tickets.3105.priority', 'Normal|Low'],
    ['The chargeback threat is with the right team', 'tickets.3106.group', 'Billing'],
    ['The chargeback threat is re-prioritised', 'tickets.3106.priority', 'High|Urgent'],
  ],
  { minutes: 15, weight: 50 }
);

// ---------- The module ----------

export const SUPPORT_TRIAGE_MODULE: ModuleSkeleton = {
  familyId: 'test-support-triage-01',
  maxMinutes: 20,
  onlyLevel: 'Professional',
  aspects: [
    { id: 'priority', name: 'Priority & Impact', summary: 'Judging how urgent a ticket really is, whatever its tone or plan.' },
    { id: 'sla', name: 'Service Targets', summary: 'First-reply and resolution targets: working them out and meeting them.' },
    { id: 'route', name: 'Routing & Escalation', summary: 'The right team first time, and escalations they can act on.' },
    { id: 'type', name: 'Types, Tags & Patterns', summary: 'Typing, tagging and linking tickets so problems show early.' },
    { id: 'sim', name: 'Hands-on: The Queue', summary: 'Triaging a real queue in a help desk.' },
  ],
  tags: {},
  bank: [
    // ----- Priority & Impact -----
    ...tagged(
      'priority',
      J,
      choice(
        'm-sup-p-j1',
        'The Real Emergency',
        'Four tickets have just arrived. Which one should be Urgent?',
        [
          'A customer can see another business’s invoices and customer addresses in their account',
          'A customer writes “URGENT!!!” asking where to change their invoice colour',
          'A long-standing customer asks how to export last year’s invoices',
          'A customer suggests adding a dark mode',
        ],
        0
      ),
      order(
        'm-sup-p-j2',
        'Most Urgent First',
        'Put these tickets in the order they should be dealt with, most urgent first.',
        [
          'Card details of several customers appear in a support chat transcript sent to the wrong person',
          'Invoices fail to send for one business with 40 to send today',
          'A customer can’t log in after a password reset',
          'A customer asks how to add a logo to invoices',
        ]
      ),
      short(
        'm-sup-p-j3',
        'Shouting Isn’t Severity',
        'A customer writes in capitals, "THIS IS URGENT", asking which menu has the invoice logo setting. Nothing is broken. What priority do you give it? (One word.)',
        ['low', 'normal', 'low priority', 'normal priority']
      )
    ),
    ...tagged(
      'priority',
      P,
      multi(
        'm-sup-p-p1',
        'Raise to Urgent',
        'Which of these should be Urgent? Tick all that apply.',
        [
          'Customers report seeing other customers’ data after this morning’s release',
          'Nobody can log in: the login page has errored for every customer since 08:00',
          'An Enterprise customer asks how to add a user “when you get a chance”',
          'A customer is upset that a refund will take 5 to 10 days to reach their bank',
          'A customer reports a phishing email using the company’s name that several of their contacts also received',
        ],
        [0, 1, 4]
      ),
      choice(
        'm-sup-p-p2',
        'The Big Account',
        'An Enterprise customer paying £40,000 a year asks a how-to question and says there’s no rush. What priority, and what does their plan change?',
        [
          'Normal (or Low): priority is about impact and urgency; the plan only changes the response target',
          'Urgent, because Enterprise customers always come first',
          'High, as a compromise between their plan and the question',
          'Low, and their plan changes nothing about how quickly they hear back',
        ],
        0
      ),
      written(
        'm-sup-p-p3',
        'Payday',
        'A builder on the Standard plan writes at 08:30 on the last Friday of the month: "Invoices won’t send, error 500. My subbies get paid from these today." Downloading a PDF still works. What priority do you set, and why? Mention anything you’d do straight away.',
        [
          'Sets High (blocked from core work with a deadline today), not Low or Normal because of the plan',
          'Explains it with impact and urgency (core feature broken, money depends on it today)',
          'Offers the workaround straight away (download the PDF and email it) so they can get paid today',
          'Routes it to the technical team (and checks whether others report the same error, in case it’s wider)',
        ],
        'High. Impact: they can’t use the core feature; urgency: payment depends on it today. I’d reply right away with the workaround (download each invoice as a PDF and email it) so they aren’t stuck, send it to Tier 2 with the error and browsers tried, and check the queue for others reporting error 500 in case it’s an outage that needs Urgent.',
        { minutes: 5 }
      )
    ),
    ...tagged(
      'priority',
      S,
      written(
        'm-sup-p-s1',
        'Forty Against One',
        'At 10:00 you have 40 new tickets saying the dashboard is slow (it loads, just takes 20 seconds) and one ticket from a customer who says they can see a different company’s bank transactions. You’re the only senior agent on. What do you do first, and how do you handle the 40?',
        [
          'Deals with the data exposure first: a likely security and privacy incident, escalated to security / on-call at once',
          'Asks the customer not to share or act on the data and gathers what’s needed (what they saw, when, screenshots) without spreading it further',
          'Links or groups the 40 slow-dashboard tickets as one incident or problem rather than working them one by one',
          'Sends the 40 one holding reply (a macro or status page update) with a real next update time',
          'Explains why volume doesn’t decide priority: one data exposure outweighs many slow-but-working tickets',
        ],
        'The data exposure first: it’s a possible breach, so I escalate to security/on-call right away, ask the customer not to share what they saw and to tell us exactly what and when, and keep the ticket restricted. The 40 slow-dashboard tickets are one incident: I link them to a single problem ticket, tell engineering once, and send all 40 the same holding reply with when they’ll next hear from us (and a status page note). Volume makes it visible, but a working-but-slow dashboard is less urgent than another company’s financial data being exposed.',
        { minutes: 8 }
      ),
      choice(
        'm-sup-p-s2',
        'New Information',
        'You set a ticket to Normal: “Invoice PDFs show the wrong VAT number.” An hour later the customer adds that it’s on every invoice sent this month, and HMRC has queried one. What now?',
        [
          'Raise the priority: the impact has grown (every invoice, a tax authority involved), so the triage changes with it',
          'Keep it at Normal: priority is set once, when the ticket arrives',
          'Close it and ask the customer to open a new ticket for the HMRC part',
          'Make it Urgent only if they complain again',
        ],
        0
      )
    ),

    // ----- Service Targets -----
    ...tagged(
      'sla',
      J,
      choice(
        'm-sup-s-j1',
        'First Reply',
        'What does a “first reply time” target measure?',
        [
          'How long until the customer gets the first response from a person, counted from when the ticket arrives',
          'How long until the ticket is solved',
          'How long the customer waits on hold on the phone',
          'How quickly the automatic “we’ve got your email” message is sent',
        ],
        0
      ),
      short(
        'm-sup-s-j2',
        'Over the Weekend',
        'Your first-reply target for High tickets is 4 business hours. Business hours are 09:00 to 17:00, Monday to Friday. A High ticket arrives on Friday at 15:30. When is the first reply due? (Day and time, e.g. "Tuesday 10:00".)',
        ['monday 11:30', 'mon 11:30', 'monday at 11:30', '11:30 monday', '11:30 on monday', 'monday 11.30', 'monday 1130']
      ),
      match('m-sup-s-j3', 'The Words', 'Match each term to what it means.', [
        ['First reply time', 'Time until a person first responds'],
        ['Resolution time', 'Time until the ticket is solved'],
        ['Breach', 'The target time passed without the response'],
        ['Pending', 'Waiting on the customer, so the clock usually pauses'],
      ])
    ),
    ...tagged(
      'sla',
      P,
      short(
        'm-sup-s-p1',
        'Half the Time',
        'Targets: High tickets get a first reply within 4 hours, and Business-plan customers get half the usual target. A Business-plan customer’s High ticket arrives at 10:20 on a Tuesday (you work 09:00 to 17:00). When is the first reply due? (A time.)',
        ['12:20', '12.20', '12:20pm', '12:20 pm', '1220']
      ),
      order(
        'm-sup-s-p2',
        'Which Reply First',
        'You can answer one ticket at a time. Put these in the order you should reply, first at the top.',
        [
          'Urgent: target in 15 minutes',
          'High: target already breached by 10 minutes',
          'High: target in 40 minutes',
          'Low: target in 3 hours',
        ]
      ),
      choice(
        'm-sup-s-p3',
        'Stopping the Clock',
        'A colleague sets tickets to Pending as soon as they open them, before replying, “so the target doesn’t breach”. What’s wrong with that?',
        [
          'Pending means waiting on the customer; using it to pause the clock hides real waits and makes the figures lie',
          'Nothing: it’s a sensible way to protect the team’s targets',
          'Only that Pending should be used for Urgent tickets',
          'It’s fine as long as they reply within a day',
        ],
        0
      )
    ),
    ...tagged(
      'sla',
      S,
      short(
        'm-sup-s-s1',
        'Hit Rate',
        'Last week 240 tickets had a first-reply target. 216 were answered within it. What percentage met the target? (A number.)',
        ['90', '90%', '90.0', '90.0%']
      ),
      written(
        'm-sup-s-s2',
        'Monday Mornings',
        'Your team meets its first-reply target 94% of the time, but on Mondays it’s 71%: weekend tickets pile up and the morning is spent catching up. Suggest how you’d fix Mondays, and how you’d know it worked.',
        [
          'Looks at the cause in the data (volume by hour, ticket types arriving at the weekend) before choosing a fix',
          'Proposes staffing or shift changes for Monday mornings (earlier start, weekend cover, rota)',
          'Proposes reducing the volume itself (self-service articles, macros or automation for the common weekend issues)',
          'Proposes working the backlog in the right order (by target and priority, not oldest first) at the start of Monday',
          'Says how they’d measure it (Monday hit rate by week, compared with before) and watch for side effects',
        ],
        'First I’d look at what arrives at the weekend and when, by type. Then: start one or two people earlier on Mondays (or add light weekend cover), and work the backlog in target order rather than oldest first. Cut the volume too: the top weekend questions get help articles and a macro, and simple ones get an automatic answer. I’d track Monday’s hit rate week by week against the 71% baseline, and check the other days don’t drop and CSAT holds.',
        { minutes: 8 }
      ),
      choice(
        'm-sup-s-s3',
        'The Flattering Average',
        'Your average first reply is 2 hours, inside the 4-hour target, but complaints about slow replies are rising. What figure would show the problem better?',
        [
          'The share of tickets answered within target (and the slowest 10%), since an average hides a long tail of very slow replies',
          'The average resolution time',
          'The number of tickets solved per agent',
          'The average first reply time per agent',
        ],
        0
      )
    ),

    // ----- Routing & Escalation -----
    ...tagged(
      'route',
      J,
      match('m-sup-r-j1', 'Right Team', 'Match each ticket to the team that should own it.', [
        ['Charged twice this month', 'Billing'],
        ['Every invoice send gives “Error 500”', 'Tier 2 Technical'],
        ['“Someone changed my password and bank details”', 'Trust & Safety'],
        ['“Delete everything you hold about me”', 'Privacy'],
      ]),
      multi(
        'm-sup-r-j2',
        'A Useful Escalation',
        'You’re escalating a bug to the technical team. What should your note include? Tick all that apply.',
        [
          'The exact error and what the customer was doing when it appeared',
          'Steps to reproduce it',
          'The customer’s account and the ticket number(s)',
          'What you’ve already tried, and any workaround',
          'How annoyed the customer sounds',
          'Your guess at which line of code is wrong',
        ],
        [0, 1, 2, 3]
      ),
      choice(
        'm-sup-r-j3',
        'Solve or Pass On?',
        'A customer can’t find where to change their invoice due date. You know the setting. What do you do?',
        ['Answer it yourself and solve the ticket', 'Escalate to Tier 2 so a specialist answers', 'Pass it to the product team as feedback', 'Ask the customer to search the help centre'],
        0
      )
    ),
    ...tagged(
      'route',
      P,
      written(
        'm-sup-r-p1',
        'Write the Escalation',
        'Ticket #2204: Marcus at Bell Build (Business plan) gets "Error 500: something went wrong" on every invoice Send since about 08:10. He tried Chrome and Edge; downloading a PDF works. He has 40 invoices to send today. Write the internal note you’d send to Tier 2 Technical.',
        [
          'States the problem precisely: the exact error, on Send, since about 08:10',
          'Gives steps to reproduce and what was tried (both browsers; PDF download works)',
          'Identifies the customer and ticket (Bell Build, #2204, Business plan)',
          'States the impact and urgency (40 invoices today; whether others are affected)',
          'Says what’s been done for the customer and what’s needed from Tier 2',
        ],
        'Tier 2: Bell Build (Business plan, ticket #2204). Every invoice Send fails with "Error 500: something went wrong" since about 08:10 today. Steps: open any draft invoice, press Send. Same in Chrome and Edge; Download PDF works. Impact: 40 invoices to send today for subcontractor pay. I’ve given them the PDF workaround and said we’ll update by 10:00. I’m checking the queue for other 500s on Send. Can you check the send service logs for this account from 08:10?',
        { minutes: 6 }
      ),
      choice(
        'm-sup-r-p2',
        'Ask for a Manager',
        'A customer demands to “speak to a manager” about a refund you can grant yourself under the policy. What’s the best response?',
        [
          'Acknowledge it, fix the refund now within policy, and offer the manager contact if they still want it',
          'Escalate to a manager immediately without doing anything else',
          'Explain that managers don’t speak to customers',
          'Refuse the refund until they stop asking for a manager',
        ],
        0
      ),
      choice(
        'm-sup-r-p3',
        'The Ping-Pong Ticket',
        'A ticket has been passed between Billing and Tier 2 three times, each saying it’s the other’s. The customer has waited two days. What should happen?',
        [
          'One person takes ownership, gets both teams to agree on the next step, and keeps the customer updated',
          'Send it back to Tier 1 to start again',
          'Close it and ask the customer to raise a new ticket',
          'Leave it with whichever team had it last',
        ],
        0
      )
    ),
    ...tagged(
      'route',
      S,
      written(
        'm-sup-r-s1',
        'The First 15 Minutes',
        'Between 08:00 and 08:30, 25 tickets arrive saying invoices won’t send. You’re the senior agent on shift. What do you do in the first 15 minutes?',
        [
          'Raises it as an incident with engineering/on-call once (not 25 separate escalations)',
          'Creates one problem ticket and links the incidents to it (and tags them)',
          'Sends the affected customers a holding reply with a workaround if there is one and when they’ll hear next',
          'Updates the status page or in-app notice so new customers don’t need to write in',
          'Tells the rest of the team how to handle new tickets about it (macro, tag, no individual escalations)',
        ],
        'Declare an incident with on-call right away with the facts (since 08:00, 25 tickets, error, any common factor). Create one problem ticket, link and tag the 25 as incidents. Send them all a holding reply with the PDF workaround and an update time. Ask for a status page notice so others don’t need to write in, and tell the team: tag new ones, link them, use the macro, no separate escalations.',
        { minutes: 8 }
      ),
      choice(
        'm-sup-r-s2',
        'The Deletion Request',
        'A customer emails: “Under GDPR, delete everything you hold about me.” What’s the right way to handle it?',
        [
          'Verify they’re the account holder, send it to the privacy team, and tell the customer it will be done within one month (the legal deadline)',
          'Delete their account straight away from the admin panel',
          'Reply that you can’t delete data because of the company’s accounting records, and close it',
          'Ask them to post a letter to head office',
        ],
        0
      )
    ),

    // ----- Types, Tags & Patterns -----
    ...tagged(
      'type',
      J,
      match('m-sup-t-j1', 'Ticket Types', 'Match each ticket to its type.', [
        ['“How do I export my invoices to CSV?”', 'Question'],
        ['“Send gives me Error 500”', 'Incident'],
        ['The root cause behind 30 customers’ Error 500 tickets', 'Problem'],
        ['“Please send me a copy of last year’s receipts”', 'Task'],
      ]),
      short(
        'm-sup-t-j2',
        'Three Emails, One Issue',
        'A customer has emailed three times in an hour about the same login problem, creating three tickets. What should you do with them? (A word or two.)',
        ['merge', 'merge them', 'merge into one', 'merge the tickets', 'merge into the first', 'merge into the oldest']
      )
    ),
    ...tagged(
      'type',
      P,
      multi(
        'm-sup-t-p1',
        'Good Tags',
        'Your team is cleaning up its tags. Which practices help? Tick all that apply.',
        [
          'A short agreed list of tags, with one way of writing each (bank_feed, not “bankfeed” and “bank-feed”)',
          'Tagging tickets about the same fault the same way so they can be counted and linked',
          'Letting each agent invent tags as they go',
          'Removing tags nobody has used in months',
          'Putting the customer’s mood in a tag on every ticket',
        ],
        [0, 1, 3]
      ),
      written(
        'm-sup-t-p2',
        'Refunds Are Up',
        'This week 64 tickets were tagged refund, against about 40 a week usually. Your manager asks what’s going on. What do you look at, and what might you do?',
        [
          'Reads a sample of the tickets to find what they have in common (product, reason, date) rather than guessing',
          'Checks for a cause such as a release, price change, delivery problem or billing error that week',
          'Checks the tagging itself (a new macro or agent tagging differently can inflate it)',
          'Says what they’d do with the finding (escalate a fault, fix a policy or help article, tell the team)',
        ],
        'I’d read 15 to 20 of them to see what they share (product, reason, when they started), then check for a cause that week: a release, a price or billing change, a courier problem. I’d also check the tag is used the same way (a new macro can add it automatically). If it’s a fault, escalate it with the count and examples; if it’s confusion, fix the help article or email that causes it and brief the team.',
        { minutes: 6 }
      )
    ),
    ...tagged(
      'type',
      S,
      choice(
        'm-sup-t-s1',
        'Problem and Incidents',
        'Thirty customers report the same bank-feed fault. How should the tickets be organised?',
        [
          'One Problem ticket for the cause, with the thirty linked to it as Incidents, so they can all be updated and solved together',
          'Thirty separate Problem tickets',
          'Merge all thirty into one ticket, so only one customer gets replies',
          'Close them all and point to the status page',
        ],
        0
      ),
      written(
        'm-sup-t-s2',
        'Tags Nobody Trusts',
        'Leadership wants to know the top reasons customers contact support, but your tags are a mess: 300 of them, used inconsistently, and 40% of tickets have none. Outline how you’d fix this so the numbers can be trusted.',
        [
          'Defines a small agreed set of contact reasons (a taxonomy) with clear definitions',
          'Makes the reason required or set automatically (a field, macros, forms) rather than optional free tags',
          'Maps or retires the old tags rather than starting with no history',
          'Trains the team and checks consistency (sample reviews, an owner for the list)',
          'Reports on it and reviews the list regularly as products change',
        ],
        'Agree 15 to 20 contact reasons with clear definitions and an owner. Make it a required field set by forms and macros, not free tags. Map the old tags onto the new reasons where possible and retire the rest. Train the team, spot-check a sample each week for consistency, and review the list each quarter. Only then report the top reasons.',
        { minutes: 8 }
      )
    ),

    // ----- Hands-on: the queue -----
    ...tagged('sim', P, SIM_P, short('m-sup-sim-p2', 'Not the Loudest', 'Which ticket number in the queue looked the most urgent from its subject line, but wasn’t? (The number.)', ['2202', '#2202'], { taskId: 'm-sup-sim-p1', minutes: 2 })),
    ...tagged(
      'sim',
      S,
      SIM_S,
      short('m-sup-sim-s2', 'Not What It Seems', 'Which ticket is most likely an attempt to take over someone else’s account? (The number.)', ['3104', '#3104'], { taskId: 'm-sup-sim-s1', minutes: 2 })
    ),
  ],
};

export const SUPPORT_MODULES: ModuleSkeleton[] = [SUPPORT_TRIAGE_MODULE];

// ---------- The job simulation: a Monday on Bloomvale's support desk ----------

export const BLOOMVALE_POLICIES = `# Bloomvale customer support: policies and targets

## First-reply targets
- Urgent: 1 hour · High: 4 hours · Normal: 8 business hours · Low: 2 business days
- Bloom Club members (our plant subscription): half those times
- Business hours: 09:00 to 17:30, Monday to Saturday

## Refunds and replacements
- Change of mind: full refund within 30 days of delivery, once the plant is returned.
- Damaged or dead on arrival, reported within 14 days of delivery: replace it or refund that item, whichever the
  customer prefers. No need to send it back. Ask for a photo if there isn't one. Delivery is only refunded when the
  whole order was affected.
- A refund over £100 needs a Team Lead's approval: assign the ticket to Team Leads with an internal note saying what
  you recommend and why. Don't promise the refund to the customer before it's approved; tell them it's with a lead.

## Late deliveries
- Late means more than 3 working days after dispatch. Give the tracking update and a £5 credit (macro: "Late delivery:
  £5 credit").

## Account security
- Never change an account's email, password or delivery address because someone asks from an email address that
  isn't the one on the account. Ask them to write from the email on file, or send a verification link to it.
- Anything that looks like someone trying to get into an account that isn't theirs: assign to Trust & Safety with an
  internal note. Don't tell the requester what's on the account.

## Website problems
- Assign to Tier 2 Technical with an internal note: what's broken, the exact error, steps to reproduce, device and
  browser, order or basket details, and how many customers have reported it. Tag it so reports can be counted.

## Tone
- Use the customer's first name, own the problem (no blaming the courier), give a specific next step and when it
  will happen, and keep it short.`;

export const BLOOM_TAGS = ['damaged', 'dead_on_arrival', 'late_delivery', 'refund', 'promo_bug', 'account_security', 'wholesale', 'care_advice', 'subscription'];

export const BLOOM_TICKETS: HelpdeskTicket[] = [
  ticket({
    id: '9001',
    subject: 'Pot smashed in delivery',
    requester: 'Priya Shah',
    email: 'priya.shah@gmail.com',
    plan: 'Bloom Club',
    channel: 'Email',
    received: 'Today 08:12',
    ageMins: 48,
    slaMins: 12,
    messages: [{ from: 'customer', name: 'Priya Shah', at: 'Today 08:12', body: 'Hi, my monstera arrived on Saturday and the ceramic pot was in pieces. The plant itself looks fine. Photo attached. Order BV-20391.\n\n[photo: cracked white pot, soil in the box]' }],
    customer: { since: 'March 2024', location: 'Leeds', otherTickets: 1, orders: [{ id: 'BV-20391', item: 'Monstera deliciosa 80cm + Ceramic pot (white)', date: 'Delivered Sat 14 Nov', total: '£64.00', status: 'Delivered' }] },
  }),
  ticket({
    id: '9002',
    subject: 'Change my email and delivery address',
    requester: 'J. Morgan',
    email: 'jmorgan.uk2025@proton.me',
    channel: 'Email',
    received: 'Today 07:58',
    ageMins: 62,
    slaMins: 418,
    messages: [{ from: 'customer', name: 'J. Morgan', at: 'Today 07:58', body: "Hello, I'm Julia Morgan, I've lost access to my old email. Please change the email on my account to this one and send my Bloom Club box to my new address: Flat 3, 18 Canal Street, Birmingham B1 2NP. Thanks." }],
    customer: { since: 'October 2022', location: 'Bath', otherTickets: 0, note: 'Account: Julia Morgan, email on file julia.morgan@btinternet.com, delivery address in Bath. Bloom Club box dispatching Wednesday.' },
  }),
  ticket({
    id: '9003',
    subject: 'Promo code not working',
    requester: 'Alex Turner',
    email: 'alex.t@outlook.com',
    channel: 'Chat',
    received: 'Today 08:40',
    ageMins: 20,
    slaMins: 460,
    messages: [{ from: 'customer', name: 'Alex Turner', at: 'Today 08:40', body: 'Trying to use SPRING20 at checkout and it says "Something went wrong, please try again". Tried 3 times on my iPhone. Basket is £52 of houseplants.' }],
  }),
  ticket({
    id: '9004',
    subject: 'Fiddle leaf fig died within a week',
    requester: 'Tom Ainsley',
    email: 'tom.ainsley@gmail.com',
    channel: 'Email',
    received: 'Yesterday 15:30',
    ageMins: 1050,
    slaMins: 300,
    messages: [{ from: 'customer', name: 'Tom Ainsley', at: 'Yesterday 15:30', body: "Our large fiddle leaf fig (£145) was delivered last Monday and every leaf has dropped. We followed the care card. We'd like a refund please, not a replacement.\n\n[photo: bare stems, leaves on the floor]" }],
    customer: { since: 'November 2025', location: 'Norwich', otherTickets: 0, orders: [{ id: 'BV-20188', item: 'Fiddle leaf fig, extra large 160cm', date: 'Delivered Mon 9 Nov', total: '£145.00', status: 'Delivered' }] },
  }),
  ticket({
    id: '9005',
    subject: 'Where is my order??',
    requester: 'Mark Owens',
    email: 'mark.owens@yahoo.co.uk',
    plan: 'Bloom Club',
    channel: 'Web form',
    received: 'Today 08:55',
    ageMins: 5,
    slaMins: 115,
    messages: [{ from: 'customer', name: 'Mark Owens', at: 'Today 08:55', body: 'Order BV-20402 was dispatched last Monday. Still nothing. This is the third late box this year.' }],
    customer: { since: 'January 2023', location: 'Exeter', otherTickets: 4, orders: [{ id: 'BV-20402', item: 'Bloom Club November box', date: 'Dispatched Mon 9 Nov', total: '£29.00', status: 'Held at courier depot since Thu' }] },
  }),
  ticket({
    id: '9006',
    subject: 'Discount code error',
    requester: 'Chloe Brennan',
    email: 'chloe.b@icloud.com',
    channel: 'Email',
    received: 'Today 08:22',
    ageMins: 38,
    slaMins: 442,
    messages: [{ from: 'customer', name: 'Chloe Brennan', at: 'Today 08:22', body: 'Your Instagram ad says 20% off with SPRING20 but checkout just errors. On a laptop, Chrome.' }],
  }),
  ticket({
    id: '9007',
    subject: 'Wholesale for our café?',
    requester: 'Ollie Hart',
    email: 'ollie@harthouse.cafe',
    channel: 'Web form',
    received: 'Yesterday 12:10',
    ageMins: 1250,
    slaMins: 1900,
    messages: [{ from: 'customer', name: 'Ollie Hart', at: 'Yesterday 12:10', body: 'We run two cafés in Bristol and would love to buy plants wholesale every month. Who do I speak to?' }],
  }),
  ticket({
    id: '9008',
    subject: 'SPRING20',
    requester: 'Dina Kovac',
    email: 'dina.kovac@gmail.com',
    channel: 'Chat',
    received: 'Today 08:50',
    ageMins: 10,
    slaMins: 470,
    messages: [{ from: 'customer', name: 'Dina Kovac', at: 'Today 08:50', body: 'code SPRING20 doesnt work?? android app' }],
  }),
];

const BLOOM_APP = helpdeskApp({
  product: 'Deskly',
  company: 'Bloomvale',
  agent: 'Alex Morgan',
  now: 'Monday 09:00',
  groups: ['Customer Care', 'Team Leads', 'Tier 2 Technical', 'Trust & Safety', 'Sales'],
  tagOptions: BLOOM_TAGS,
  slaPolicy: ['Urgent: 1 hour', 'High: 4 hours', 'Normal: 8 business hours', 'Low: 2 business days', 'Bloom Club: half those times'],
  macros: [
    { name: 'Damaged item: free replacement', body: "Hi {{first_name}},\n\nI'm so sorry your order arrived damaged. I've sent a replacement today at no cost, and there's no need to return anything. You'll get a tracking email this afternoon.\n\nBest wishes,\n{{agent}}", tags: ['damaged'] },
    { name: 'Late delivery: £5 credit', body: "Hi {{first_name}},\n\nI'm sorry your order is late. I've checked with the courier: [TRACKING UPDATE]. I've added a £5 credit to your account for the wait.\n\nBest wishes,\n{{agent}}", tags: ['late_delivery'] },
    { name: 'Wholesale enquiry: pass to Sales', body: "Hi {{first_name}},\n\nThanks for your interest in wholesale! I've passed your details to our wholesale team, who'll be in touch within two working days.\n\nBest wishes,\n{{agent}}", tags: ['wholesale'] },
  ],
  kb: [
    { title: 'Support policies (summary)', body: 'Damaged or dead on arrival within 14 days: replace or refund that item, no return needed.\nRefunds over £100: Team Lead approval (assign to Team Leads with an internal note).\nAccount changes only from the email on file.\nWebsite faults: Tier 2 Technical, tagged.' },
    { title: 'Bloom Club', body: 'Monthly plant subscription, £29 a box. Members get half the usual first-reply target. Boxes dispatch on the first Monday of the month (November: Monday 9th).' },
  ],
  tickets: BLOOM_TICKETS,
});

const sup = (q: Partial<Question> & Pick<Question, 'id' | 'title' | 'type' | 'prompt'>): Question => ({ starterCode: '', testCases: [], timeLimitMinutes: 4, weight: 8, ...q });

const BLOOMVALE_SIM: AssessmentTest = {
  id: 'test-sim-support-01',
  title: 'Customer Support Simulation: Bloomvale',
  category: 'Customer Support',
  difficulty: 'Professional',
  type: 'standard',
  description:
    "A Monday morning on the support desk of an online plant shop. Work the queue in a real help desk (triage, replies, macros, internal notes, escalations), reply to an unhappy subscriber, escalate a checkout fault so engineers can act on it, and apply the refund and security policies under time pressure.",
  estimatedMinutes: 20,
  passingScore: 70,
  totalQuestions: 6,
  skillsTested: ['Ticket Triage', 'Written Communication', 'Escalation', 'Refund Policy', 'Account Security', 'Help Desk'],
  roles: ['Customer Support Agent'],
  scenario: {
    company: 'Bloomvale',
    role: 'Customer Support Advisor',
    brief: `You've just joined Bloomvale, an online plant shop with a monthly plant subscription called Bloom Club, as a customer support advisor.

It's 09:00 on Monday. The weekend's tickets are waiting in Deskly, the help desk, and a promotion (code SPRING20, advertised on Instagram since Saturday) went live this weekend.

You have:
• Deskly, with the morning's queue
• bloomvale_support_policies.md: targets, refunds, late deliveries, account security and escalations

Jo Bennett, your Team Lead: "Follow the policies, keep customers posted, and flag anything odd to me or the right team. Don't leave anything sitting in the queue untouched."`,
    files: [{ name: 'bloomvale_support_policies.md', content: BLOOMVALE_POLICIES }],
    people: [
      { name: 'Jo Bennett', role: 'Team Lead, Customer Care', email: 'jo.bennett@bloomvale.co.uk' },
      { name: 'Kit Adeyemi', role: 'Tier 2 Technical', email: 'kit.adeyemi@bloomvale.co.uk' },
    ],
  },
  questions: [
    simTask(
      'q-sup-sim-1',
      'Work the Monday Queue',
      `Eight tickets are waiting in Deskly. Work through all of them, following bloomvale_support_policies.md.

1. Triage each one: priority, assignee group and the right tags.
2. Reply to Priya (her target is closest) and solve her ticket.
3. Handle Julia's account change and Tom's refund exactly as the policies say, with internal notes where they ask for one.
4. Get the SPRING20 reports to the team that can fix them, tagged so they can be counted.
5. Send Mark's late-delivery update and credit.`,
      'Deskly: Bloomvale support',
      BLOOM_APP,
      [
        ["Priya's damaged pot is replied to", 'tickets.9001.replied', 'true'],
        ["Priya's ticket is solved", 'tickets.9001.status', 'Solved'],
        ["Julia's account change is with the right team", 'tickets.9002.group', 'Trust & Safety'],
        ["Julia's account change has an internal note", 'tickets.9002.noted', 'true'],
        ['The first SPRING20 report is with the right team', 'tickets.9003.group', 'Tier 2 Technical'],
        ['The SPRING20 report from the Android app is tagged for counting', 'tickets.9008.tagSet.promo_bug', 'true'],
        ['The laptop SPRING20 report is tagged for counting', 'tickets.9006.tagSet.promo_bug', 'true'],
        ["Tom's £145 refund is with the right team", 'tickets.9004.group', 'Team Leads'],
        ["Tom's refund has an internal note for the lead", 'tickets.9004.noted', 'true'],
        ["Mark's late box gets the credit", 'tickets.9005.tagSet.late_delivery', 'true'],
        ["Mark's ticket is replied to", 'tickets.9005.replied', 'true'],
        ["The café's wholesale enquiry is with the right team", 'tickets.9007.group', 'Sales'],
      ],
      { minutes: 10, weight: 45 }
    ),
    sup({
      id: 'q-sup-sim-2',
      title: 'How Many?',
      type: 'text',
      prompt: 'How many customers have reported the SPRING20 problem so far? (A number.)',
      acceptedAnswers: ['3', 'three'],
      taskId: 'q-sup-sim-1',
      timeLimitMinutes: 1,
      weight: 4,
    }),
    sup({
      id: 'q-sup-sim-3',
      title: 'Julia, or Not?',
      type: 'choice',
      prompt: "In the queue, someone signing as Julia Morgan asks you to change her account's email and send this month's Bloom Club box to a new address in Birmingham. They wrote from jmorgan.uk2025@proton.me. What should you reply to them?",
      options: [
        "Tell them you can only change account details when asked from the account's email, and ask them to write from it or use the verification link sent to it, without saying what that email is",
        'Make the change, since they know the account name and the box is due Wednesday',
        'Ask them to confirm the email address and postcode currently on the account',
        "Tell them their old email is julia.morgan@btinternet.com and ask if they can still get into it",
      ],
      correctOption: 0,
      timeLimitMinutes: 1,
      weight: 8,
    }),
    sup({
      id: 'q-sup-sim-4',
      title: 'Reply to Mark',
      type: 'email',
      prompt: "Mark Owens has emailed again, angry. Write the reply. Bloom Club box BV-20402 was dispatched last Monday and has been held at the courier's Exeter depot since Thursday; the courier says it will go out on today's van. Follow the policies.",
      email: {
        thread: [
          {
            from: 'Mark Owens <mark.owens@yahoo.co.uk>',
            to: ['support@bloomvale.co.uk'],
            cc: [],
            date: 'Mon 16 Nov, 09:20',
            subject: 'Re: Where is my order??',
            body: "Still nothing and no reply. That's the THIRD late box this year. I'm paying £29 a month for plants that turn up whenever your courier feels like it. Sort it out or I'm cancelling, and I'm telling everyone in my gardening group.\n\nMark",
          },
        ],
        contacts: [
          { name: 'Mark Owens', role: 'Customer (Bloom Club member)', email: 'mark.owens@yahoo.co.uk' },
          { name: 'Jo Bennett', role: 'Team Lead, Customer Care', email: 'jo.bennett@bloomvale.co.uk' },
          { name: 'Swiftway Couriers', role: 'Courier account team', email: 'accounts@swiftway-couriers.co.uk' },
        ],
        to: ['mark.owens@yahoo.co.uk'],
        cc: [],
        avoid: ['accounts@swiftway-couriers.co.uk'],
      },
      rubric: [
        'Apologises sincerely and owns it (no blaming the courier to the customer), acknowledging it is the third late box',
        'Gives the specific update: held at the Exeter depot since Thursday, out for delivery today',
        'Applies the policy: adds the £5 credit for the late delivery',
        'Responds to the cancel threat helpfully (e.g. offers to pause or cancel if he wants, or what will be done to stop it happening) without pressure or arguing',
        'Short, calm and personal (uses his first name, clear next step and when)',
      ],
      solutionCode:
        "Hi Mark,\n\nI'm really sorry: a third late box isn't good enough, and you shouldn't have had to chase us. I've checked: BV-20402 has been held at the Exeter depot since Thursday, and it's on today's van, so it should be with you this afternoon. I've added a £5 credit to your account for the wait.\n\nI've also flagged your last three deliveries to my team lead so we can look at what's going wrong on your route. If you'd rather pause or cancel Bloom Club, just reply and I'll sort it straight away, but I hope today's box changes your mind.\n\nBest wishes,\nAlex",
      timeLimitMinutes: 3,
      weight: 14,
    }),
    sup({
      id: 'q-sup-sim-5',
      title: 'Escalate SPRING20',
      type: 'written',
      prompt: 'Write the internal note for Kit in Tier 2 Technical about the SPRING20 problem, using what the customers told you in the queue. Kit has never seen these tickets.',
      rubric: [
        'States what is broken and the exact error ("Something went wrong, please try again" when applying SPRING20 at checkout)',
        'Shows it happens across devices/platforms (iPhone, laptop Chrome, Android app), with steps to reproduce',
        'Gives the scope: three reports since this morning, with the ticket numbers (9003, 9006, 9008) and the tag used',
        'States the business impact (live Instagram promotion since Saturday, lost sales and basket values)',
        'Says what has been done for customers and asks for something specific (fix, ETA, or a workaround such as applying the discount manually)',
      ],
      solutionCode:
        'Kit: SPRING20 (20% off, live on Instagram since Saturday) fails at checkout with "Something went wrong, please try again". Reported 3 times this morning: #9003 (iPhone, £52 basket), #9006 (laptop, Chrome), #9008 (Android app), all tagged promo_bug. Steps: add any plant to the basket, enter SPRING20 at checkout, apply. Looks platform-wide. Impact: it\'s our live promotion, so we\'re losing orders. I\'ve told customers we\'re on it. Can you confirm a fix ETA, and whether we can honour the 20% manually (refund the difference) meanwhile?',
      timeLimitMinutes: 3,
      weight: 12,
    }),
    sup({
      id: 'q-sup-sim-7',
      title: 'Part of an Order',
      type: 'text',
      prompt: 'An order had three plants (£24, £18 and £36) plus £4.95 delivery. Six days after delivery the customer reports the £18 plant arrived dead, with a photo, and asks for a refund. The other two are fine. How much do you refund, in pounds? (A number.)',
      acceptedAnswers: ['18', '£18', '18.00', '£18.00'],
      timeLimitMinutes: 1,
      weight: 6,
    }),
  ],
};

// Asked like every Granyt test: the questions first and the hands-on task (with the questions about it) last, marks out of 100
export const SUPPORT_SIM_TEST: AssessmentTest = (() => {
  const isTask = (q: Question) => q.type === 'app' || q.taskId === 'q-sup-sim-1';
  const ordered = [...BLOOMVALE_SIM.questions.filter((q) => !isTask(q)), ...BLOOMVALE_SIM.questions.filter(isTask)];
  const total = ordered.reduce((n, q) => n + q.weight, 0) || 1;
  const questions = ordered.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) }));
  const drift = 100 - questions.reduce((n, q) => n + q.weight, 0);
  if (drift) questions.reduce((a, b) => (b.weight > a.weight ? b : a)).weight += drift;
  return { ...BLOOMVALE_SIM, questions };
})();
