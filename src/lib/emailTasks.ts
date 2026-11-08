import { EmailContact, EmailMessage, EmailTask, Question } from '../types';

/**
 * Email tasks as the AI writes them, in the fields every question already has (a new field would grow the output
 * grammar past what compiles): items are the emails in the thread, oldest first, each written out with its headers;
 * options are the address book, "Name | Role | email"; pairs say who the reply goes to, { left: "to" | "cc" | "not",
 * right: an address }; acceptedAnswers are the reply's marking points and solutionCode a model reply.
 */

// "Priya Shah <priya@co.uk>" or a bare address, as a name and an address
export function parseAddress(raw: string): { name: string; email: string } {
  const m = String(raw ?? '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: '', email: String(raw ?? '').trim() };
}

const list = (value: string) => value.split(/[,;]/).map((a) => a.trim()).filter(Boolean);

// An email written out with its headers, as the AI sends it and the builder edits it
export const messageText = (m: EmailMessage) => `From: ${m.from}\nTo: ${m.to.join(', ')}\nCc: ${m.cc.join(', ')}\nDate: ${m.date}\nSubject: ${m.subject}\n\n${m.body}`;
export function parseMessage(text: string): EmailMessage {
  const src = String(text ?? '').replace(/\r\n?/g, '\n').trim();
  const m: EmailMessage = { from: '', to: [], cc: [], date: '', subject: '', body: '' };
  const lines = src.split('\n');
  let i = 0;
  for (; i < lines.length; i++) {
    const h = lines[i].match(/^(From|To|Cc|Date|Subject):\s*(.*)$/i);
    if (!h) break;
    const [key, value] = [h[1].toLowerCase(), h[2].trim()];
    if (key === 'from') m.from = value;
    else if (key === 'to') m.to = list(value);
    else if (key === 'cc') m.cc = list(value);
    else if (key === 'date') m.date = value;
    else m.subject = value;
  }
  m.body = lines.slice(i).join('\n').trim();
  return m;
}

export const contactText = (c: EmailContact) => `${c.name} | ${c.role} | ${c.email}`;
export function parseContact(text: string): EmailContact | null {
  const [name = '', role = '', email = ''] = String(text ?? '').split('|').map((p) => p.trim());
  return name && email.includes('@') ? { name, role, email } : null;
}

// The AI's email question as a real task, or null when it doesn't hold up: an email to reply to and someone to send it to
export function emailFromRaw(raw: { items?: string[]; options?: string[]; pairs?: { left: string; right: string }[] }): EmailTask | null {
  const thread = (raw.items ?? []).map(parseMessage).filter((m) => m.body.length >= 40 && m.from);
  const contacts = (raw.options ?? []).map(parseContact).filter((c): c is EmailContact => !!c);
  const who = (kind: string) => [...new Set((raw.pairs ?? []).filter((p) => p.left.trim().toLowerCase() === kind).map((p) => parseAddress(p.right).email).filter((e) => e.includes('@')))];
  const task: EmailTask = { thread, contacts, to: who('to'), cc: who('cc'), avoid: who('not') };
  return thread.length && task.to.length ? task : null;
}

// An email question as the AI is shown it, in the same fields it writes
export const emailToRaw = (q: Question) => ({
  items: (q.email?.thread ?? []).map(messageText),
  options: (q.email?.contacts ?? []).map(contactText),
  pairs: [...(q.email?.to ?? []).map((right) => ({ left: 'to', right })), ...(q.email?.cc ?? []).map((right) => ({ left: 'cc', right })), ...(q.email?.avoid ?? []).map((right) => ({ left: 'not', right }))],
  acceptedAnswers: q.rubric ?? [],
  solutionCode: q.solutionCode ?? '',
});
