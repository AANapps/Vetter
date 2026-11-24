import { DeskAppsConfig } from '../lib/deskApps';

/**
 * Sample data for the desktop's work apps, for the admin test lab: a small online retailer (Northwind Home) with a
 * support queue, a CRM, a team chat, forms, a calendar, a help centre and project boards, so every app and every hand-off
 * between them (CSV out of one, into another) can be tried. Not used in any test.
 */

const ME = 'admin@praxa.test';
const SAM = 'sam.patel@northwind.test';
const LEE = 'lee.chen@northwind.test';
const RIA = 'ria.okafor@northwind.test';

export const SAMPLE_CONTACTS = [
  { name: 'Sam Patel', role: 'Support lead', email: SAM },
  { name: 'Lee Chen', role: 'Sales manager', email: LEE },
  { name: 'Ria Okafor', role: 'Operations', email: RIA },
];

export const SAMPLE_FILES = [
  {
    name: 'orders_november.csv',
    content:
      'order_id,date,region,product,category,qty,revenue\n1001,2026-11-02,North,Oak desk,Furniture,2,598\n1002,2026-11-02,South,Desk lamp,Lighting,5,175\n1003,2026-11-03,North,Bookcase,Furniture,1,249\n1004,2026-11-04,West,Floor lamp,Lighting,3,267\n1005,2026-11-05,South,Oak desk,Furniture,1,299\n1006,2026-11-06,East,Rug,Textiles,2,180\n1007,2026-11-07,West,Cushion set,Textiles,6,144\n1008,2026-11-08,North,Desk lamp,Lighting,4,140\n1009,2026-11-09,East,Bookcase,Furniture,2,498\n1010,2026-11-10,South,Rug,Textiles,1,90\n',
  },
];

export const SAMPLE_WORK: DeskAppsConfig = {
  chat: {
    channels: [
      {
        id: 'ops',
        name: 'ops',
        kind: 'channel',
        topic: 'Day-to-day operations',
        messages: [
          { id: 'c1', from: RIA, text: 'Morning all. Warehouse is short on oak desks until Friday.', time: '08:41' },
          { id: 'c2', from: SAM, text: 'Noted, I’ll add a macro for delay replies.', time: '08:44', attachments: [{ name: 'stock_levels.csv', content: 'product,in_stock\nOak desk,0\nBookcase,14\nDesk lamp,52\nRug,9\n' }] },
        ],
      },
      { id: 'dm-lee', name: 'Lee Chen', kind: 'dm', with: LEE, messages: [{ id: 'c3', from: LEE, text: 'Can you send me November revenue by region? A quick table is fine.', time: '09:02' }] },
    ],
    replies: [{ id: 'lee-thanks', channel: 'dm-lee', mustMention: [['north', 'south', 'region']], reply: { from: LEE, text: 'Perfect, thanks! North looks strong.' }, otherwise: { from: LEE, text: 'Thanks, but I need it split by region.' } }],
  },
  helpdesk: {
    name: 'Northwind Support',
    agents: ['Sam Patel'],
    sla: { urgent: 1, high: 4, normal: 24, low: 48 },
    macros: [
      { name: 'Delivery delay apology', body: 'Hi {{requester.first_name}},\n\nSorry for the wait. Your order is delayed because of a stock shortage; it will ship by Friday.\n\nBest,\n{{agent.name}}', status: 'pending', tags: ['delay'] },
      { name: 'Refund processed', body: 'Hi {{requester.first_name}},\n\nYour refund has been processed and should reach you in 3 to 5 working days.\n\nBest,\n{{agent.name}}', status: 'solved', tags: ['refund'] },
    ],
    tickets: [
      { id: '4471', subject: 'Where is my oak desk?', requester: 'Maya Brooks <maya@example.com>', status: 'new', priority: 'high', created: 'Today 08:12', channel: 'email', fields: { Order: '1005', Plan: 'Standard' }, thread: [{ from: 'Maya Brooks <maya@example.com>', body: 'I ordered an oak desk on the 5th and it still hasn’t shipped. I need it for Monday.', time: 'Today 08:12' }] },
      { id: '4472', subject: 'Refund for broken lamp', requester: 'Tom Hale <tom@example.com>', status: 'open', priority: 'normal', created: 'Yesterday', channel: 'web', tags: ['damaged'], assignee: 'Sam Patel', fields: { Order: '1002' }, thread: [{ from: 'Tom Hale <tom@example.com>', body: 'One of the five desk lamps arrived cracked. Photos attached. Can I get a refund for that one?', time: 'Yesterday 16:40' }] },
      { id: '4473', subject: 'Change delivery address', requester: 'Ana Ruiz <ana@example.com>', status: 'pending', priority: 'low', created: 'Mon', channel: 'chat', fields: { Order: '1010' }, thread: [{ from: 'Ana Ruiz <ana@example.com>', body: 'Please send my rug to my office instead.', time: 'Mon 11:00' }] },
    ],
  },
  crm: {
    name: 'Northwind CRM',
    objects: [
      {
        id: 'accounts',
        label: 'Accounts',
        fields: [
          { key: 'name', label: 'Account name' },
          { key: 'industry', label: 'Industry', type: 'select', options: ['Hospitality', 'Education', 'Office', 'Retail'] },
          { key: 'city', label: 'City' },
        ],
        records: [
          { id: 'acc-1', name: 'Brightside Hotels', industry: 'Hospitality', city: 'Leeds' },
          { id: 'acc-2', name: 'Kingsway College', industry: 'Education', city: 'York' },
        ],
      },
      {
        id: 'contacts',
        label: 'Contacts',
        fields: [
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email', type: 'email' },
          { key: 'phone', label: 'Phone', type: 'phone' },
          { key: 'account', label: 'Account', type: 'link', object: 'accounts' },
          { key: 'title', label: 'Job title' },
        ],
        records: [
          { id: 'con-1', name: 'Priya Shah', email: 'priya@brightside.test', phone: '0113 555 0101', account: 'acc-1', title: 'Procurement' },
          { id: 'con-2', name: 'Ben Ward', email: 'ben@kingsway.test', phone: '01904 555 0199', account: 'acc-2', title: 'Facilities manager' },
        ],
      },
      {
        id: 'deals',
        label: 'Deals',
        fields: [
          { key: 'name', label: 'Deal name' },
          { key: 'account', label: 'Account', type: 'link', object: 'accounts' },
          { key: 'stage', label: 'Stage', type: 'select', options: ['Prospecting', 'Proposal', 'Negotiation', 'Closed won', 'Closed lost'] },
          { key: 'amount', label: 'Amount', type: 'money' },
          { key: 'close', label: 'Close date', type: 'date' },
          { key: 'notes', label: 'Notes', type: 'textarea' },
        ],
        records: [
          { id: 'deal-1', name: 'Brightside lobby refit', account: 'acc-1', stage: 'Proposal', amount: '18500', close: '2026-12-12' },
          { id: 'deal-2', name: 'Kingsway library desks', account: 'acc-2', stage: 'Negotiation', amount: '9200', close: '2026-11-30' },
        ],
      },
    ],
  },
  docs: { templates: [{ name: 'Weekly update.docx', html: '<h1>Weekly update</h1><p>Highlights:</p><ul><li></li></ul><h2>Numbers</h2><p>Paste the table here.</p>' }] },
  bi: { name: 'Sales report' },
  forms: {
    name: 'Northwind forms',
    forms: [
      {
        id: 'refund',
        title: 'Refund request',
        description: 'For refunds over £50, or any damaged item. Finance processes requests daily.',
        fields: [
          { key: 'order', label: 'Order number', type: 'text', required: true },
          { key: 'email', label: 'Customer email', type: 'email', required: true },
          { key: 'amount', label: 'Refund amount (£)', type: 'money', required: true },
          { key: 'reason', label: 'Reason', type: 'select', options: ['Damaged', 'Late delivery', 'Wrong item', 'Changed mind'], required: true },
          { key: 'notes', label: 'Notes', type: 'textarea' },
        ],
        entries: [{ order: '0987', email: 'kim@example.com', amount: '45', reason: 'Wrong item', notes: '', submitted_by: 'Sam Patel' }],
      },
      {
        id: 'incident',
        title: 'Incident report',
        fields: [
          { key: 'what', label: 'What happened?', type: 'textarea', required: true },
          { key: 'severity', label: 'Severity', type: 'radio', options: ['Low', 'Medium', 'High'], required: true },
          { key: 'date', label: 'When', type: 'date', required: true },
          { key: 'customer_told', label: 'Customer informed', type: 'checkbox' },
        ],
      },
    ],
  },
  calendar: {
    weekOf: '2026-11-23',
    today: '2026-11-24',
    events: [
      { id: 'e1', title: 'Team stand-up', date: '2026-11-24', start: '09:30', end: '09:45', attendees: [ME, SAM, RIA] },
      { id: 'e2', title: 'Quarterly review', date: '2026-11-25', start: '14:00', end: '15:00', attendees: [ME, LEE], location: 'Room 2', notes: 'Bring the November revenue numbers.' },
      { id: 'e3', title: 'Supplier call', date: '2026-11-24', start: '11:00', end: '12:00', owner: LEE },
      { id: 'e4', title: 'Warehouse visit', date: '2026-11-24', start: '13:00', end: '16:00', owner: RIA },
    ],
  },
  kb: {
    name: 'Northwind Help Centre',
    articles: [
      { id: 'kb-refunds', title: 'Refund policy', category: 'Orders', updated: '1 Nov 2026', body: 'Customers can return any item within 30 days.\n\n- Damaged items: full refund, no return needed under £50\n- Changed mind: refund minus £8 return postage\n- Refunds over £50 need a Refund request form\n\nRefunds reach the customer in 3 to 5 working days.' },
      { id: 'kb-delays', title: 'Handling delivery delays', category: 'Delivery', updated: '12 Oct 2026', body: 'If an item is out of stock, tell the customer the new ship date from the stock sheet.\n\nOffer a 10% voucher when the delay is over 5 days. Tag the ticket "delay".' },
      { id: 'kb-address', title: 'Changing a delivery address', category: 'Delivery', body: 'Addresses can be changed until the order ships. Update the order, then confirm to the customer in writing.' },
    ],
  },
  board: {
    boards: [
      {
        id: 'launch',
        name: 'Winter range launch',
        style: 'monday',
        statuses: ['Not started', 'Working on it', 'Stuck', 'Done'],
        groups: ['This week', 'Next week'],
        people: ['Sam Patel', 'Lee Chen', 'Ria Okafor'],
        items: [
          { id: 'l1', title: 'Photograph new rugs', status: 'Working on it', group: 'This week', owner: 'Ria Okafor', due: '2026-11-26', priority: 'High' },
          { id: 'l2', title: 'Write product copy', status: 'Not started', group: 'This week', owner: 'Lee Chen', due: '2026-11-27' },
          { id: 'l3', title: 'Set launch prices', status: 'Stuck', group: 'Next week', priority: 'Critical' },
        ],
      },
      {
        id: 'web',
        name: 'Website (WEB)',
        style: 'jira',
        key: 'WEB',
        statuses: ['To Do', 'In Progress', 'In Review', 'Done'],
        people: ['Sam Patel', 'Lee Chen'],
        items: [
          { id: 'WEB-12', title: 'Checkout fails on Safari', status: 'In Progress', type: 'Bug', priority: 'High', points: '3', owner: 'Sam Patel' },
          { id: 'WEB-13', title: 'Add winter range landing page', status: 'To Do', type: 'Story', points: '5' },
          { id: 'WEB-14', title: 'Update delivery times copy', status: 'Done', type: 'Task', points: '1', owner: 'Lee Chen' },
        ],
      },
    ],
  },
};
