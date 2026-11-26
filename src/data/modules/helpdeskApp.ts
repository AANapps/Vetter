/**
 * Deskly, the help desk app in Corprax's app library (library-apps/deskly/app.html): the data a test gives it. A help
 * desk agent workspace, hand-built for Corprax's customer support tests: a modern, 1:1 copy of how today's help
 * desks look and work (views with live counts and SLA countdowns, a ticket with its properties, conversation, reply
 * composer with macros and internal notes, the customer's orders, and the knowledge base), with only what support
 * tasks need. Built from data, so every test gets its own queue.
 *
 * State, as Corprax marks it: { tickets: { <id>: { priority, type, group, status, tags: [], tagSet: { <tag>: true },
 * replies: [{ public, text, status }], replied, noted, macros: [], fields: {}, refund, issue, lastPublic, lastNote } },
 * opened: [ids], read: [article titles], replyOrder: [ids in the order first replied to], chat }
 */

export interface HelpdeskMessage {
  from: 'customer' | 'agent' | 'note';
  name: string;
  at: string;
  body: string;
}

export interface HelpdeskOrder {
  id: string;
  item: string;
  date: string;
  total: string;
  status: string;
}

export interface HelpdeskTicket {
  id: string;
  subject: string;
  requester: string;
  email: string;
  // A customer's plan or tier, shown on their card ("Plus", "Business")
  plan?: string;
  channel: 'Email' | 'Chat' | 'Web form' | 'Phone';
  // When it came in, as shown ("Today 08:12")
  received: string;
  // How long ago, in minutes, for sorting
  ageMins: number;
  // Minutes left on the first-reply target (negative: already breached); unset for none
  slaMins?: number;
  messages: HelpdeskMessage[];
  // Starting values (blank means not set yet)
  priority?: string;
  type?: string;
  group?: string;
  status?: 'New' | 'Open' | 'Pending' | 'Solved';
  tags?: string[];
  customer?: { since: string; location?: string; orders?: HelpdeskOrder[]; otherTickets?: number; note?: string };
}

export interface HelpdeskConfig {
  // The help desk's invented name, and the company using it
  product: string;
  company: string;
  agent: string;
  // The time "now" is, as shown
  now: string;
  groups: string[];
  tagOptions: string[];
  macros?: { name: string; body: string; tags?: string[] }[];
  // The service-level targets, shown in the views panel
  slaPolicy?: string[];
  kb?: { title: string; body: string }[];
  tickets: HelpdeskTicket[];
  // Extra ticket fields (a refund decision, a reason), under the standard ones: saved as tickets.<id>.fields.<key>
  extraFields?: { key: string; label: string; options: string[] }[];
  // An Issue refund action on each ticket: saved as tickets.<id>.refund { order, amount, method, reason }
  refunds?: { methods: string[]; reasons: string[] };
  // A Create engineering issue action: saved as tickets.<id>.issue { title, steps, expected, actual, severity }
  issues?: { severities: string[] };
  // A live chat with one customer: each question sent from the library gets the customer's scripted answer. Saved as
  // chat { messages, asked: [question ids], askedSet: { id: true }, cause, lastAgent (the last message typed by hand) }
  chat?: { customer: string; topic: string; opening: string[]; questions: { id: string; text: string; reply: string }[]; causes: string[] };
}

import { libraryPage } from '../../lib/libraryApps';

// The page for a test: the library's Deskly, filled with this test's queue
export const helpdeskApp = (cfg: HelpdeskConfig): string => libraryPage('deskly', cfg);
