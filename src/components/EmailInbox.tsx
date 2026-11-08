import React, { useMemo, useState } from 'react';
import { BookUser, CornerUpLeft, Mail, Paperclip, Reply, ReplyAll, X } from 'lucide-react';
import { EmailContact, Question } from '../types';
import { EmailReply, emailAnswer } from '../lib/questionTypes';
import { parseAddress } from '../lib/emailTasks';

// An email task as the candidate meets it: the thread in their inbox, then the reply they write, with who it goes to
// and who's copied in picked from the company's address book (or typed). Reply and Reply all fill the recipients the
// way a mail app does, so the judgement is in who to add or take off
export const EmailInbox: React.FC<{ question: Question; answer: string; onChange: (answer: string) => void }> = ({ question: q, answer, onChange }) => {
  const task = q.email;
  const thread = task?.thread ?? [];
  const last = thread[thread.length - 1];
  const contacts = task?.contacts ?? [];
  const reply = emailAnswer(answer);
  const subject = reply.subject || (last ? (/^re:/i.test(last.subject) ? last.subject : `Re: ${last.subject}`) : '');
  const update = (change: Partial<EmailReply>) => onChange(JSON.stringify({ ...reply, subject, ...change }));
  // Everyone the candidate might write to: the address book first, then anyone else on the thread
  const people = useMemo(() => {
    const known = new Map<string, EmailContact>();
    for (const c of contacts) known.set(c.email.toLowerCase(), c);
    for (const m of thread)
      for (const raw of [m.from, ...m.to, ...m.cc]) {
        const { name, email } = parseAddress(raw);
        if (email && !known.has(email.toLowerCase())) known.set(email.toLowerCase(), { name, role: '', email });
      }
    return [...known.values()];
  }, [contacts, thread]);
  // The candidate on the thread: written as You <you@...>
  const isMe = (raw: string) => {
    const { name, email } = parseAddress(raw);
    return /^you$/i.test(name) || /^you@/i.test(email);
  };
  const [open, setOpen] = useState<number>(thread.length - 1);
  const [book, setBook] = useState(false);

  const replyTo = (all: boolean) => {
    if (!last) return;
    const from = parseAddress(last.from).email;
    // Reply all: everyone else on the last email, the candidate left out
    const others = all ? [...last.to, ...last.cc].filter((a) => !isMe(a)).map((a) => parseAddress(a).email).filter((e) => e && !same(e, from)) : [];
    update({ to: [from], cc: [...new Set(others)] });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden text-sm">
      {/* The thread */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
        <Mail className="w-4 h-4 text-slate-500" />
        <span className="font-semibold text-slate-800 truncate">{last?.subject || 'Inbox'}</span>
        <span className="ml-auto text-[11px] text-slate-500 shrink-0">
          {thread.length} {thread.length === 1 ? 'email' : 'emails'}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {thread.map((m, i) => {
          const from = parseAddress(m.from);
          const expanded = open === i;
          return (
            <li key={i}>
              <button onClick={() => setOpen(expanded ? -1 : i)} aria-expanded={expanded} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3">
                <Avatar name={from.name || from.email} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="font-semibold text-slate-900 truncate">{from.name || from.email}</span>
                    {roleOf(from.email, contacts) && <span className="text-[11px] text-slate-500 truncate">{roleOf(from.email, contacts)}</span>}
                    <span className="ml-auto text-[11px] text-slate-400 shrink-0">{m.date}</span>
                  </span>
                  {expanded ? (
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      To {m.to.join(', ') || 'you'}
                      {m.cc.length > 0 && <> &middot; Cc {m.cc.join(', ')}</>}
                    </span>
                  ) : (
                    <span className="block text-xs text-slate-500 truncate">{m.body.replace(/\s+/g, ' ')}</span>
                  )}
                </span>
              </button>
              {expanded && <div className="px-4 pb-4 pl-[3.75rem] whitespace-pre-wrap leading-relaxed text-slate-800">{m.body}</div>}
            </li>
          );
        })}
      </ul>

      {/* The reply */}
      <div className="border-t border-slate-200 bg-slate-50/60 p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mr-auto">
            <CornerUpLeft className="w-3.5 h-3.5" />
            Your reply
          </span>
          <button onClick={() => replyTo(false)} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-indigo-300 flex items-center gap-1">
            <Reply className="w-3.5 h-3.5" />
            Reply
          </button>
          <button onClick={() => replyTo(true)} className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-indigo-300 flex items-center gap-1">
            <ReplyAll className="w-3.5 h-3.5" />
            Reply all
          </button>
          {contacts.length > 0 && (
            <button
              onClick={() => setBook((b) => !b)}
              aria-expanded={book}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:border-indigo-300 flex items-center gap-1"
            >
              <BookUser className="w-3.5 h-3.5" />
              Address book
            </button>
          )}
        </div>
        {book && (
          <ul className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {contacts.map((c) => (
              <li key={c.email} className="flex items-center gap-2 px-3 py-2">
                <Avatar name={c.name} small />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-slate-800 truncate">{c.name}</span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {c.role} &middot; {c.email}
                  </span>
                </span>
                <button onClick={() => update({ to: add(reply.to, c.email), cc: remove(reply.cc, c.email) })} className="px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded">
                  To
                </button>
                <button onClick={() => update({ cc: add(reply.cc, c.email), to: remove(reply.to, c.email) })} className="px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded">
                  Cc
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          <RecipientField label="To" value={reply.to} people={people} onChange={(to) => update({ to, cc: reply.cc.filter((e) => !to.some((t) => same(t, e))) })} />
          <RecipientField label="Cc" value={reply.cc} people={people} onChange={(cc) => update({ cc, to: reply.to.filter((e) => !cc.some((c) => same(c, e))) })} />
          <label className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-8 text-xs text-slate-500">Subject</span>
            <input value={subject} onChange={(e) => update({ subject: e.target.value })} className="flex-1 min-w-0 py-1 text-sm outline-none bg-transparent" aria-label="Subject" />
          </label>
          <textarea
            value={reply.body}
            onChange={(e) => update({ body: e.target.value })}
            aria-label="Your reply"
            placeholder="Write your reply…"
            rows={9}
            className="w-full px-3 py-2.5 text-sm leading-relaxed outline-none resize-y bg-transparent"
          />
        </div>
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <Paperclip className="w-3 h-3" />
          Marked on who you send it to and copy in, and on what you say. It&rsquo;s saved as you type; nothing is really sent.
        </p>
      </div>
    </div>
  );
};

// One line of recipients: a chip per address, and typing suggests people from the address book and the thread
const RecipientField: React.FC<{ label: string; value: string[]; people: EmailContact[]; onChange: (value: string[]) => void }> = ({ label, value, people, onChange }) => {
  const [text, setText] = useState('');
  const query = text.trim().toLowerCase();
  const matches = query ? people.filter((p) => !value.some((v) => same(v, p.email)) && `${p.name} ${p.role} ${p.email}`.toLowerCase().includes(query)).slice(0, 6) : [];
  const commit = (email: string) => {
    if (email.trim()) onChange(add(value, email.trim()));
    setText('');
  };
  return (
    <div className="relative flex flex-wrap items-center gap-1.5 px-3 py-1.5">
      <span className="w-8 text-xs text-slate-500">{label}</span>
      {value.map((email) => {
        const person = people.find((p) => same(p.email, email));
        return (
          <span key={email} title={email} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-indigo-50 text-indigo-900 rounded-full text-xs">
            {person?.name || email}
            <button onClick={() => onChange(remove(value, email))} aria-label={`Remove ${person?.name || email}`} className="p-0.5 rounded-full hover:bg-indigo-100">
              <X className="w-3 h-3" />
            </button>
          </span>
        );
      })}
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ',' || e.key === 'Tab') && text.trim()) {
            e.preventDefault();
            commit(matches[0]?.email ?? text);
          } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => text.includes('@') && commit(text)}
        aria-label={label}
        placeholder={value.length ? '' : 'Name or email'}
        className="flex-1 min-w-[8rem] py-1 text-sm outline-none bg-transparent"
      />
      {matches.length > 0 && (
        <ul className="absolute left-12 top-full z-10 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {matches.map((p) => (
            <li key={p.email}>
              <button onMouseDown={(e) => (e.preventDefault(), commit(p.email))} className="w-full text-left px-3 py-1.5 hover:bg-slate-50">
                <span className="block text-xs font-semibold text-slate-800">{p.name}</span>
                <span className="block text-[11px] text-slate-500">
                  {p.role ? `${p.role} · ` : ''}
                  {p.email}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const Avatar: React.FC<{ name: string; small?: boolean }> = ({ name, small }) => {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0);
  return (
    <span
      aria-hidden="true"
      className={`${small ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'} shrink-0 rounded-full flex items-center justify-center font-semibold text-white`}
      style={{ background: `hsl(${hue} 45% 48%)` }}
    >
      {initials}
    </span>
  );
};

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const add = (list: string[], email: string) => (list.some((e) => same(e, email)) ? list : [...list, email]);
const remove = (list: string[], email: string) => list.filter((e) => !same(e, email));
const roleOf = (email: string, contacts: EmailContact[]) => contacts.find((c) => same(c.email, email))?.role ?? '';
