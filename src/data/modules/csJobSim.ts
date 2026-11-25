import { DesktopConfig } from '../../lib/desktop';
import { helpdeskApp } from './helpdeskApp';
import { BLOOMVALE_POLICIES, BLOOM_TAGS, BLOOM_TICKETS } from './support';
import { jobSimulation } from './jobSimKit';

/**
 * The Customer Support job simulation: a Monday on Bloomvale's support desk, in the five timed parts every Praxa job
 * simulation has (jobSimKit.ts), on the desktop with two environments: Deskly (the help desk) and the Browser (the
 * help centre and the courier's tracking site).
 *
 * Core task: triage the queue, put a smashed pot right, and tell a Bloom Club member exactly where his late box is
 * (the courier's site shows it's held: his address has no house number). Curveball: the SPRING20 promotion is failing
 * at checkout; get Tier 2 what they need and pass on their workaround. Juggling and judgement: a refund that needs the
 * Team Lead's approval, an account-change request that looks like a takeover, and a goodwill call outside the policy.
 * Report back: the handover to the Team Lead, marked on how it's written and on whether it flags that the address on
 * Mark's account is incomplete (so every future box will be held too).
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

const ELLIE = `ellie.ward@${DOMAIN}`;

const DESKTOP: Omit<DesktopConfig, 'phases'> = {
  user: { name: 'Alex Morgan', email: ME, role: 'Customer Support Advisor' },
  company: 'Bloomvale',
  time: 'Mon 09:00',
  apps: ['mail', 'deskly', 'browser', 'files', 'ai'],
  customApps: [{ id: 'deskly', label: 'Deskly', html: DESKLY }],
  contacts: [
    { name: 'Jo Bennett', role: 'Team Lead, Customer Care', email: JO, helpsWith: 'approvals: refunds above your limit, escalations' },
    { name: 'Kit Adeyemi', role: 'Tier 2 Technical', email: KIT, helpsWith: 'bugs, checkout and promo code faults' },
    { name: 'Ellie Ward', role: 'Bloom Club Lead', email: ELLIE },
    { name: 'Wholesale team', role: 'Sales', email: `wholesale@${DOMAIN}` },
    { name: 'Trust & Safety', role: 'Account security', email: `trust@${DOMAIN}` },
  ],
  homepage: HELP,
  inbox: [
    {
      id: 'm-jo',
      from: `Jo Bennett <${JO}>`,
      to: [ME],
      date: 'Mon 08:45',
      subject: 'Monday: what I need from you',
      body: `Morning Alex,\n\nBusy queue this morning. In Deskly, please:\n\n1. Triage everything: a priority and the right team on every ticket.\n2. Sort Priya Shah's smashed pot under the policy.\n3. Mark Owens's Bloom Club box is late again. Check the courier's tracking (ParcelPath, ${COURIER}) before you reply, so you can tell him exactly what's happening.\n\nPolicies are on the help centre (${HELP}/policies).\n\nThanks!\nJo`,
    },
    {
      id: 'm-jo-spring20',
      phase: 'curveball',
      from: `Jo Bennett <${JO}>`,
      to: [ME],
      date: 'Mon 09:14',
      subject: 'URGENT: SPRING20 is broken',
      body: "Alex, Marketing put SPRING20 on Instagram on Saturday and it's failing at checkout. There are three tickets already (9003, 9006, 9008) and more coming.\n\nPlease email Kit in Tier 2 with what he needs to fix it, tag the SPRING20 tickets promo_bug, and once Kit replies tell Alex Turner (#9003) what to do.\n\nJo",
    },
    {
      id: 'm-jo-more',
      phase: 'juggling',
      from: `Jo Bennett <${JO}>`,
      to: [ME],
      date: 'Mon 09:22',
      subject: 'Two more',
      body: "Two more while I'm in meetings:\n\n• Tom Ainsley's refund (#9004) is over £100, so it needs my OK first. Email me what you recommend, then issue it once I approve.\n• Anything account-related that looks off goes to Trust & Safety, with a note.\n\nJo",
    },
    {
      id: 'm-ellie',
      phase: 'juggling',
      from: `Ellie Ward <${ELLIE}>`,
      to: [ME],
      date: 'Mon 09:24',
      subject: 'Your call: Sophie Lane',
      body: "Hi Alex,\n\nSophie Lane has been in Bloom Club for three years and never complained. Her October box plant (£24) died 17 days after delivery, and she sent a photo. The policy covers 14 days. She's asking for a replacement.\n\nI'm out this afternoon, so it's your call. What would you do, and why? Just reply to me and I'll action it.\n\nEllie",
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
        body: 'Approved: dead on arrival, within 14 days, with a photo. Go ahead and refund the £145 to his original payment method, and let him know.\n\nJo',
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

export const CS_JOB_SIM = jobSimulation({
  testId: 'test-sim-support-01',
  questionId: 'cs-sim-desk',
  role: 'Customer Support',
  company: 'Bloomvale',
  day: 'Monday on the Bloomvale Desk',
  description:
    'A Monday on an online plant shop’s support desk, in five timed parts on a full desktop: triage the help desk and put customers right (checking the courier’s tracking first); adapt when a promotion breaks at checkout; juggle a refund that needs approval, an account-takeover attempt and a goodwill call outside the policy; then write the handover. 40 minutes.',
  skillsTested: ['Ticket Triage', 'Written Communication', 'Escalation', 'Refund Policy', 'Account Security', 'Help Desk'],
  roles: ['Customer Support Agent'],
  category: 'Customer Support',
  scenario: `You're Alex Morgan, a customer support advisor at Bloomvale, an online plant shop with a monthly plant subscription (Bloom Club). It's Monday at 9am.

Your work computer has Mail, Deskly (the help desk), the Browser (the help centre and the courier's site), Files and an AI assistant.`,
  briefing: `You're Alex Morgan, a customer support advisor at Bloomvale, an online plant shop with a monthly plant subscription (Bloom Club). It's 9am on Monday.

Your manager: Jo Bennett, Team Lead, Customer Care.
Your tools: Mail, Deskly (the help desk, with this morning's queue), the Browser (the staff help centre with the policies, and the courier's tracking site), Files and an AI assistant.`,
  briefs: {
    core: 'Read Jo’s email. Triage Deskly’s queue (a priority and the right team on every ticket), put Priya Shah’s smashed pot right, and reply to Mark Owens about his late box once you’ve checked the courier’s tracking.',
    curveball: 'SPRING20 is failing at checkout. Read Jo’s email: get Kit what he needs, tag the tickets, and pass on his workaround.',
    juggling: 'Jo needs a refund approved and issued, and the account request handled safely. Ellie needs your decision on a goodwill case, with your reason.',
    report: 'Email Jo your handover: what you did, what’s still open, and anything she should know.',
  },
  desktop: DESKTOP,
  checks: [
    ['core', 'Julia’s account request goes to Trust & Safety', DESK('tickets.9002.group'), 'Trust & Safety'],
    ['core', 'The SPRING20 reports go to Tier 2 Technical', DESK('tickets.9003.group'), 'Tier 2 Technical'],
    ['core', 'The wholesale enquiry goes to Sales', DESK('tickets.9007.group'), 'Sales'],
    ['core', 'The account request is High or Urgent', DESK('tickets.9002.priority'), 'High|Urgent'],
    ['core', 'The wholesale enquiry isn’t over-prioritised', DESK('tickets.9007.priority'), 'Low|Normal'],
    ['core', 'Priya gets the damaged-item replacement', DESK('tickets.9001.tagSet.damaged'), 'true'],
    ['core', 'and a reply', DESK('tickets.9001.replied'), 'true'],
    ['core', 'Checked the courier’s tracking', `visited:${COURIER}/PP77310942GB`, 'true'],
    ['core', 'Gave Mark the late-delivery credit', DESK('tickets.9005.tagSet.late_delivery'), 'true'],
    ['core', 'The reply to Mark', DESK('tickets.9005.lastPublic'), { rubric: ['Says the box is held at the courier’s Exeter depot because the address is missing the flat or house number', 'Asks Mark for his full address (or says how it will be updated with ParcelPath) and when it will then arrive (next working day)', 'Apologises without blaming the courier and mentions the £5 credit', 'Warm, short and signed'] }],
    ['curveball', 'Kit got what Tier 2 needs, and replied', 'received:kit-spring20', 'true'],
    ['curveball', 'The escalation to Kit', `mail:${KIT}`, { rubric: ['Names the code and the exact error ("Something went wrong, please try again") at checkout', 'Gives the devices and browsers seen: iPhone, laptop Chrome, Android app', 'Gives the scope with ticket numbers (9003, 9006, 9008) and that it’s the live Instagram promotion', 'Asks for something specific: a fix time or a workaround'] }],
    ['curveball', 'All three SPRING20 tickets are tagged', DESK('tickets.9008.tagSet.promo_bug'), 'true'],
    ['curveball', 'The laptop report is tagged too', DESK('tickets.9006.tagSet.promo_bug'), 'true'],
    ['curveball', 'The reply to Alex Turner', DESK('tickets.9003.lastPublic'), { rubric: ['Says it’s a known fault on our side, being fixed today (by 3pm)', 'Gives the workaround: order at full price and reply with the order number, and the 20% is refunded to the original payment method', 'Clear, friendly and signed, without technical jargon'] }],
    ['juggling', 'Jo approved the refund', 'received:jo-approval', 'true'],
    ['juggling', 'Refunded £145', DESK('tickets.9004.refund.amount'), '145'],
    ['juggling', 'To the original payment method', DESK('tickets.9004.refund.method'), 'Original payment method'],
    ['juggling', 'The account request has a note for Trust & Safety', DESK('tickets.9002.noted'), 'true'],
    ['juggling', 'The goodwill decision for Ellie', `mail:${ELLIE}`, {
      rubric: [
        'Makes a clear decision (e.g. replace as a one-off goodwill gesture, or offer credit) rather than passing it back',
        'Gives the reason: a loyal three-year member, a photo, only 3 days outside the policy, a £24 plant against her yearly value',
        'Says it’s an exception, not a change to the policy, and how it’s recorded (e.g. a note on her account) so it stays consistent',
        'Short and actionable for Ellie',
      ],
    }],
    ['report', 'The handover to Jo', `mail:${JO}`, {
      rubric: [
        'Lists what was done: triage, Priya’s replacement, Mark’s late box, SPRING20 escalated with the workaround given, Tom’s refund issued after approval, the account request with Trust & Safety, the goodwill decision',
        'Says what’s still open: waiting on Mark’s address, SPRING20 fix due at 3pm and customers to refund the 20%, anything not finished',
        'Flags that the address on Mark’s account is incomplete (no house number), so his future Bloom Club boxes will be held too until it’s fixed',
        'Short and easy for Jo to scan',
      ],
    }],
  ],
});
