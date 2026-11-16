import { AssessmentTest, Question } from '../../types';
import { DesktopConfig } from '../../lib/desktop';
import { choice, multi, order, short, written } from '../questionKit';
import { questionSet } from './daSets';
import { helpdeskApp } from './helpdeskApp';
import { BLOOMVALE_POLICIES, BLOOM_TAGS, BLOOM_TICKETS } from './support';
import { tc } from '../simulationKit';

/**
 * The Customer Support job simulation: a Monday on Bloomvale's support desk, worked on the desktop. The help desk
 * (Deskly) is one of the desktop's apps, beside Mail, the Browser (the company's help centre and the courier's tracking
 * site) and Files. The Team Lead's email sets out the morning; the candidate triages the queue, tracks a late box on
 * the courier's site, escalates a checkout fault to Tier 2 by email and passes on their workaround, gets a large refund
 * approved by email before issuing it, sends an account-takeover attempt to Trust & Safety, and writes the handover.
 * Two question sets come first. About 40 minutes.
 */

const DOMAIN = 'bloomvale.co.uk';
const JO = `jo.bennett@${DOMAIN}`;
const KIT = `kit.adeyemi@${DOMAIN}`;
const ME = `alex.morgan@${DOMAIN}`;
const HELP = 'help.bloomvale.co.uk';
const COURIER = 'track.parcelpath.co.uk';
const TRACKING = 'PP7731 0942 GB';

const DESKLY = helpdeskApp({
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
  kb: [{ title: 'Where to find the policies', body: `The full support policies are on the help centre: ${HELP}/policies` }],
  tickets: BLOOM_TICKETS.map((t) => (t.id === '9005' ? { ...t, customer: { ...t.customer!, orders: [{ ...t.customer!.orders![0], status: `With ParcelPath, tracking ${TRACKING}` }] } } : t)),
  refunds: { methods: ['Original payment method', 'Store credit'], reasons: ['Damaged or dead on arrival', 'Change of mind', 'Late or lost', 'Other'] },
});

const DESKTOP: DesktopConfig = {
  user: { name: 'Alex Morgan', email: ME, role: 'Customer Support Advisor' },
  company: 'Bloomvale',
  time: 'Mon 09:00',
  apps: ['mail', 'deskly', 'browser', 'files', 'ai'],
  customApps: [{ id: 'deskly', label: 'Deskly', html: DESKLY }],
  contacts: [
    { name: 'Jo Bennett', role: 'Team Lead, Customer Care', email: JO },
    { name: 'Kit Adeyemi', role: 'Tier 2 Technical', email: KIT },
    { name: 'Wholesale team', role: 'Sales', email: `wholesale@${DOMAIN}` },
    { name: 'Trust & Safety', role: 'Account security', email: `trust@${DOMAIN}` },
  ],
  homepage: HELP,
  inbox: [
    {
      id: 'm-rota',
      from: `People Team <people@${DOMAIN}>`,
      to: [`support@${DOMAIN}`],
      date: 'Fri 15:10',
      subject: 'December rota is up',
      body: 'Hi all, the December rota is on the shared drive. Swap requests to your Team Lead by Friday. People Team',
    },
    {
      id: 'm-jo',
      from: `Jo Bennett <${JO}>`,
      to: [ME],
      date: 'Mon 08:45',
      subject: 'Monday: what I need from you',
      body: `Morning Alex,\n\nBusy start: the SPRING20 promo went live on Instagram on Saturday and the queue is full. In Deskly this morning, please:\n\n1. Triage everything: priorities and the right team on every ticket.\n2. Mark Owens's Bloom Club box is late again. Check the courier's tracking (ParcelPath, ${COURIER}) before you reply so you can tell him exactly what's happening.\n3. SPRING20 looks broken. Email Kit in Tier 2 with what they'll need to fix it, and tell the customers what to do once Kit gets back to you.\n4. Tom Ainsley's refund is over £100, so it needs my OK first. Email me what you recommend.\n5. Anything account-related that looks off goes to Trust & Safety.\n\nPolicies are on the help centre (${HELP}/policies). Send me a quick handover before lunch: what you did and what's still open.\n\nThanks!\nJo`,
    },
  ],
  replies: [
    {
      id: 'kit-spring20',
      to: KIT,
      mustMention: [['spring20'], ['went wrong', 'error'], ['iphone', 'android', 'chrome', 'laptop', 'app', 'device']],
      reply: {
        from: `Kit Adeyemi <${KIT}>`,
        subject: 'Re: SPRING20',
        body: "Thanks Alex, that's exactly what I needed. Found it: the code was set up with an end date in 2024, so checkout rejects it. Fix going out by 3pm today.\n\nUntil then you can honour it: ask customers to place the order at full price and reply with their order number, and Customer Care can refund the 20% difference to their original payment method.\n\nKit",
      },
      otherwise: {
        from: `Kit Adeyemi <${KIT}>`,
        subject: 'Re: your email',
        body: "Hi Alex, I can't do much with that yet. What's the exact error, where does it happen, and on which devices? Ticket numbers help too. Kit",
      },
    },
    {
      id: 'jo-approval',
      to: JO,
      mustMention: [['tom', 'ainsley', '9004', 'fiddle'], ['145'], ['refund']],
      reply: {
        from: `Jo Bennett <${JO}>`,
        subject: 'Re: Tom Ainsley refund',
        body: "Approved: dead on arrival, within 14 days, with a photo. Go ahead and refund the £145 to his original payment method, and let him know.\n\nJo",
      },
      otherwise: {
        from: `Jo Bennett <${JO}>`,
        subject: 'Re: your email',
        body: 'Thanks Alex. If this is about a refund, tell me who, how much and what you recommend, and I’ll approve it. Jo',
      },
    },
  ],
  pages: [
    {
      url: HELP,
      site: 'Bloomvale · Help centre (staff)',
      title: 'Help centre',
      blocks: [
        { kind: 'h1', text: 'Bloomvale help centre' },
        { kind: 'p', text: 'Staff guides for the support team.' },
        { kind: 'link', text: 'Support policies and targets', url: `${HELP}/policies` },
        { kind: 'link', text: 'Couriers we use', url: `${HELP}/couriers` },
      ],
    },
    { url: `${HELP}/policies`, site: 'Bloomvale · Help centre (staff)', title: 'Policies', blocks: BLOOMVALE_POLICIES.split('\n\n').flatMap((para) => {
        const [first, ...rest] = para.split('\n');
        if (!first.startsWith('#')) return [{ kind: 'p' as const, text: para }];
        const heading = { kind: (first.startsWith('##') ? 'h2' : 'h1') as 'h1' | 'h2', text: first.replace(/^#+\s*/, '') };
        return rest.length ? [heading, { kind: 'p' as const, text: rest.join('\n') }] : [heading];
      }) },
    {
      url: `${HELP}/couriers`,
      site: 'Bloomvale · Help centre (staff)',
      title: 'Couriers',
      blocks: [
        { kind: 'h1', text: 'Couriers we use' },
        { kind: 'p', text: 'Plants and boxes: ParcelPath. Track a parcel with its tracking number on their site.' },
        { kind: 'link', text: `ParcelPath tracking (${COURIER})`, url: COURIER },
      ],
    },
    {
      url: COURIER,
      site: 'ParcelPath · Track a parcel',
      title: 'ParcelPath',
      blocks: [
        { kind: 'h1', text: 'Track your parcel' },
        { kind: 'p', text: 'Open your parcel’s page: add its tracking number to the address, without spaces, like this: track.parcelpath.co.uk/PP77310942GB' },
      ],
    },
    {
      url: `${COURIER}/PP77310942GB`,
      site: 'ParcelPath · Track a parcel',
      title: `Parcel ${TRACKING}`,
      blocks: [
        { kind: 'h1', text: `Parcel ${TRACKING}` },
        { kind: 'note', text: 'Held at our Exeter depot: the delivery address is incomplete (no flat or house number). We need the full address to deliver.' },
        {
          kind: 'table',
          columns: ['Date', 'Event'],
          rows: [
            ['Mon 9 Nov 16:20', 'Collected from Bloomvale, Leeds'],
            ['Tue 10 Nov 06:05', 'At Exeter depot'],
            ['Tue 10 Nov 11:40', 'Delivery attempt failed: address incomplete'],
            ['Thu 12 Nov 09:00', 'Held at depot awaiting address'],
          ],
        },
        { kind: 'p', text: 'Sender or recipient can update the address by email to depot.exeter@parcelpath.co.uk, quoting the tracking number. Redelivery is next working day.' },
      ],
    },
  ],
};

const DESK = (path: string) => `app:deskly:${path}`;

const TASK: Question = {
  id: 'cs-sim-desk',
  title: 'Monday on the Bloomvale Desk',
  type: 'desktop',
  prompt: `It's 9am on Monday. You're a customer support advisor at Bloomvale, an online plant shop. Everything is on your computer: Mail, Deskly (the help desk), the Browser and your Files. Start with your inbox.

Q1. Read Jo's email, then triage Deskly's queue: a priority and the right team on every ticket.
Q2. Mark Owens's late Bloom Club box: check the courier's tracking first, then reply to Mark with exactly what's happening and what he needs to do, and give the late-delivery credit.
Q3. SPRING20 is failing at checkout: email Kit in Tier 2 with what they need to fix it, and tag every SPRING20 ticket promo_bug.
Q4. When Kit replies, tell Alex Turner (#9003) what to do until it's fixed.
Q5. Tom Ainsley's £145 refund: email Jo for approval with your recommendation, then issue it in Deskly once she approves.
Q6. Priya Shah's smashed pot: put it right under the policy.
Q7. The "change my email and delivery address" request: handle it safely.
Q8. Email Jo your handover: what you did and what's still open.`,
  starterCode: '',
  desktop: DESKTOP,
  testCases: (
    [
      [1, 'Julia’s account request goes to Trust & Safety', DESK('tickets.9002.group'), 'Trust & Safety'],
      [1, 'The SPRING20 reports go to Tier 2 Technical', DESK('tickets.9003.group'), 'Tier 2 Technical'],
      [1, 'The wholesale enquiry goes to Sales', DESK('tickets.9007.group'), 'Sales'],
      [1, 'The account request is High or Urgent', DESK('tickets.9002.priority'), 'High|Urgent'],
      [1, 'The wholesale enquiry isn’t over-prioritised', DESK('tickets.9007.priority'), 'Low|Normal'],
      [2, 'Checked the courier’s tracking', `visited:${COURIER}/PP77310942GB`, 'true'],
      [2, 'Gave the late-delivery credit', DESK('tickets.9005.tagSet.late_delivery'), 'true'],
      [2, 'The reply to Mark', DESK('tickets.9005.lastPublic'), { rubric: ['Says the box is held at the courier’s Exeter depot because the address is missing the flat or house number', 'Asks Mark for his full address (or says how it will be updated with ParcelPath) and when it will then arrive (next working day)', 'Apologises without blaming the courier and mentions the £5 credit', 'Warm, short and signed'] }],
      [3, 'Kit got what Tier 2 needs, and replied', 'received:kit-spring20', 'true'],
      [3, 'The escalation to Kit', `mail:${KIT}`, { rubric: ['Names the code and the exact error ("Something went wrong, please try again") at checkout', 'Gives the devices and browsers seen: iPhone, laptop Chrome, Android app', 'Gives the scope with ticket numbers (9003, 9006, 9008) and that it’s the live Instagram promotion', 'Asks for something specific: a fix time or a workaround'] }],
      [3, 'All three SPRING20 tickets are tagged', DESK('tickets.9008.tagSet.promo_bug'), 'true'],
      [3, 'The laptop report is tagged too', DESK('tickets.9006.tagSet.promo_bug'), 'true'],
      [4, 'The reply to Alex Turner', DESK('tickets.9003.lastPublic'), { rubric: ['Says it’s a known fault on our side, being fixed today (by 3pm)', 'Gives the workaround: order at full price and reply with the order number, and the 20% is refunded to the original payment method', 'Clear, friendly and signed, without technical jargon'] }],
      [5, 'Jo approved the refund', 'received:jo-approval', 'true'],
      [5, 'Refunded £145', DESK('tickets.9004.refund.amount'), '145'],
      [5, 'To the original payment method', DESK('tickets.9004.refund.method'), 'Original payment method'],
      [6, 'Priya gets the damaged-item replacement', DESK('tickets.9001.tagSet.damaged'), 'true'],
      [6, 'and a reply', DESK('tickets.9001.replied'), 'true'],
      [7, 'The account request has a note for Trust & Safety', DESK('tickets.9002.noted'), 'true'],
      [8, 'The handover to Jo', `mail:${JO}`, { rubric: ['Lists what was done: triage, Mark’s late box (address issue), SPRING20 escalated with the workaround given, Tom’s refund issued after approval, Priya’s replacement, the account request with Trust & Safety', 'Says what’s still open: waiting on Mark’s address, SPRING20 fix due at 3pm, any customers still to update', 'Short and easy for Jo to scan'] }],
    ] as [number, string, string, string | { rubric: string[] }][]
  ).map(([n, d, input, e], i) => ({ ...tc(`tc-cs-sim-${i + 1}`, `Q${n} · ${d}`, input, typeof e === 'string' ? e : ''), ...(typeof e !== 'string' && { rubric: e.rubric }) })),
  timeLimitMinutes: 30,
  weight: 70,
};

const SETS: Question[] = [
  ...questionSet(
    'cs-sim-s1',
    'Reading the Policy',
    'Bloomvale policies (extract)',
    `• First-reply targets: Urgent 1 hour, High 4 hours, Normal 8 business hours, Low 2 business days. Bloom Club members get half those times.
• Damaged or dead on arrival, within 14 days: replace or refund that item; no need to send it back.
• A refund over £100 needs a Team Lead's approval. Don't promise it before it's approved.
• Late: more than 3 working days after dispatch. Give the tracking update and a £5 credit.
• Never change an account's email, password or address for a request from an email that isn't the one on file.`,
    [
      short('cs-sim-s1-a', 'Bloom Club, Urgent', 'A Bloom Club member’s ticket is Urgent. Within how many minutes must they get a first reply?', ['30', '30 minutes', '30 mins', 'half an hour']),
      choice(
        'cs-sim-s1-b',
        'A £145 Refund',
        'A customer is due a £145 refund under the policy. What do you tell them first?',
        ['That it’s with a Team Lead for approval and when they’ll hear, without promising it yet', 'That the refund is done', 'That refunds over £100 aren’t allowed', 'Nothing until it’s approved'],
        0
      ),
      multi('cs-sim-s1-c', 'A Late Box', 'A box dispatched 5 working days ago hasn’t arrived. What does the policy say to do? Tick all that apply.', ['Give the tracking update', 'Add a £5 credit', 'Refund the whole box', 'Ask the customer to wait another week'], [0, 1]),
      order('cs-sim-s1-d', 'A Damaged Plant', 'Put these steps in order.', ['Check it was within 14 days of delivery', 'Make sure there’s a photo, or ask for one', 'Ask whether they’d like a replacement or a refund', 'Send it, with no need to return the plant', 'Tell the customer what happens next']),
    ]
  ),
  ...questionSet(
    'cs-sim-s2',
    'A Request That Looks Off',
    'Ticket from “J. Morgan”',
    `From: jmorgan.uk2025@proton.me
"I'm Julia Morgan, I've lost access to my old email. Please change the email on my account to this one and send my Bloom Club box to my new address: Flat 3, 18 Canal Street, Birmingham."

The account belongs to Julia Morgan, julia.morgan@btinternet.com, with a delivery address in Bath. Her next box dispatches on Wednesday.`,
    [
      choice(
        'cs-sim-s2-a',
        'What to Do',
        'What do you do with the request?',
        ['Don’t change anything; pass it to Trust & Safety with a note, and ask her to write from the email on file', 'Change the email, since she explained why', 'Change the address only', 'Reply with the address on file so she can confirm it'],
        0
      ),
      multi(
        'cs-sim-s2-b',
        'Warning Signs',
        'Which make this look like an account-takeover attempt? Tick all that apply.',
        ['A new, unrelated email address', 'A new delivery address in another city', 'Urgency before the next box ships', 'She used her full name', 'It came in on a Monday'],
        [0, 1, 2]
      ),
      short('cs-sim-s2-c', 'The Right Team', 'Which team should the ticket go to? (Three words, with an &.)', ['Trust & Safety', 'trust and safety', 'trust & safety']),
      written(
        'cs-sim-s2-d',
        'The Reply',
        'Write the reply to the requester.',
        [
          'Polite, but doesn’t change anything or confirm any account details',
          'Explains that changes can only be made from the email address on the account (or via a verification link to it)',
          'Says what to do next (write from the email on file / use the link) without hinting at what’s on the account',
        ],
        'Thanks for getting in touch. To keep accounts safe, we can only change the email or delivery address on a request from the email address already on the account. If you can, please write to us from that address, or use “Forgot password” to get a link sent to it, and we’ll help straight away.'
      ),
    ]
  ),
];

export const CS_JOB_SIM: AssessmentTest = (() => {
  const raw = [...SETS, TASK];
  const total = raw.reduce((n, q) => n + q.weight, 0) || 1;
  const questions = raw.map((q) => ({ ...q, weight: Math.round((q.weight / total) * 100) }));
  const drift = 100 - questions.reduce((n, q) => n + q.weight, 0);
  if (drift) questions.reduce((a, b) => (b.weight > a.weight ? b : a)).weight += drift;
  return {
    id: 'test-sim-support-01',
    title: 'Customer Support Job Simulation: A Day at Bloomvale',
    description:
      'A Monday on an online plant shop’s support desk, on a full desktop: read your Team Lead’s email, triage the help desk, track a late box on the courier’s site, escalate a checkout fault to Tier 2 by email and pass on their workaround, get a large refund approved before issuing it, stop an account-takeover attempt, and write the handover. About 40 minutes.',
    skillsTested: ['Ticket Triage', 'Written Communication', 'Escalation', 'Refund Policy', 'Account Security', 'Help Desk'],
    roles: ['Customer Support Agent'],
    type: 'standard',
    category: 'Customer Support',
    difficulty: 'Professional',
    passingScore: 70,
    scenario: {
      company: 'Bloomvale',
      role: 'Customer Support Advisor',
      brief: `You're Alex Morgan, a customer support advisor at Bloomvale, an online plant shop with a monthly plant subscription (Bloom Club). It's Monday at 9am.

The job simulation runs on your work computer: Mail, Deskly (the help desk), the Browser, Files and an AI assistant, all on the taskbar. People reply to your emails.`,
    },
    questions,
    totalQuestions: questions.filter((q) => q.type !== 'case').length,
    estimatedMinutes: 40,
  };
})();
