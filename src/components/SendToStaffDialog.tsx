import React, { useEffect, useState } from 'react';
import { Check, Mail, Send, UserRound, X } from 'lucide-react';
import { AssessmentTest, TeamMember } from '../types';
import { Pic } from './Pic';

/**
 * Sending one test to the company's own staff, from the test's page. People already on the team are ticked from a
 * list; anyone else is invited by email, and the test waits on their invitation until they join, then is sent.
 * Results stay between the company and the person, as all team work does.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SendToStaffDialog: React.FC<{
  test: AssessmentTest;
  team: TeamMember[];
  nameOf: (m: TeamMember) => string;
  picOf: (m: TeamMember) => string | undefined;
  onSend: (members: TeamMember[], emails: string[], dueDate?: string, note?: string) => void;
  onClose: () => void;
}> = ({ test, team, nameOf, picOf, onSend, onClose }) => {
  const active = team.filter((m) => m.status === 'active' && m.uid);
  const invited = team.filter((m) => m.status === 'invited');
  const [who, setWho] = useState<string[]>([]);
  const [emails, setEmails] = useState('');
  const [due, setDue] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [onClose]);
  const typed = emails.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
  const good = [...new Set(typed.filter((e) => EMAIL.test(e)))];
  const bad = typed.filter((e) => !EMAIL.test(e));
  const count = who.length + good.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Send to your staff" onClick={(e) => e.stopPropagation()} className="bg-white sm:rounded-2xl rounded-t-2xl max-w-lg w-full max-h-[90dvh] shadow-2xl flex flex-col">
        <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900">Send to your staff</h2>
            <p className="text-sm text-slate-500 truncate">{test.title}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700">On your team · {active.length}</h3>
              {active.length > 1 && (
                <button onClick={() => setWho(who.length === active.length ? [] : active.map((m) => m.id))} className="text-xs font-semibold text-indigo-700 hover:underline">
                  {who.length === active.length ? 'Clear' : 'Everyone'}
                </button>
              )}
            </div>
            {active.length === 0 ? (
              <p className="text-sm text-slate-500">No one has joined your team yet. Invite your staff by email below.</p>
            ) : (
              <ul className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {active.map((m) => {
                  const on = who.includes(m.id);
                  return (
                    <li key={m.id}>
                      <button onClick={() => setWho(on ? who.filter((x) => x !== m.id) : [...who, m.id])} aria-pressed={on} className={`w-full px-3 py-2 flex items-center gap-3 text-left ${on ? 'bg-indigo-50/70' : 'hover:bg-slate-50'}`}>
                        {picOf(m) ? <Pic src={picOf(m)!} alt="" className="w-7 h-7 rounded-full" /> : <UserRound className="w-7 h-7 p-1 rounded-full bg-slate-100 text-slate-400" />}
                        <span className="flex-1 text-sm font-medium text-slate-900 truncate">{nameOf(m)}</span>
                        <span className={`w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>{on && <Check className="w-3 h-3" />}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700">Invite staff by email</h3>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              rows={3}
              placeholder="sam@yourcompany.com, alex@yourcompany.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500">
              They're asked to join your team on Praxa; the test is sent to them as soon as they accept.
              {invited.length > 0 && ` ${invited.length} already invited ${invited.length === 1 ? 'hasn’t' : 'haven’t'} joined yet; adding their address queues it for them too.`}
            </p>
            {bad.length > 0 && <p className="text-[11px] font-semibold text-rose-600">Not an email address: {bad.join(', ')}</p>}
          </section>
          <section className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-700">Due by (optional)</span>
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-slate-700">Note (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you're sending it" className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm" />
            </label>
          </section>
          <p className="text-[11px] text-slate-400">Their results stay between your company and them: never on their public profile or a leaderboard.</p>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 inline-flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" />
            {count} {count === 1 ? 'person' : 'people'}
          </span>
          <button
            disabled={!count || bad.length > 0}
            onClick={() => onSend(active.filter((m) => who.includes(m.id)), good, due || undefined, note.trim() || undefined)}
            className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
