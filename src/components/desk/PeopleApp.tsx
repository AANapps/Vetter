import React, { useState } from 'react';
import { FileText, Mail, Search } from 'lucide-react';
import { DesktopConfig, DeskEmail } from '../../lib/desktop';
import { parseAddress } from '../../lib/emailTasks';
import { Avatar } from './shared';

/**
 * The company's staff directory on a simulation desktop: everyone the candidate can contact, their role, what to ask
 * them for, and the files they've sent today. Email opens a new email to them; colleagues write back within seconds
 * when the email earns a reply (see the desktop's reply rules).
 */
export const PeopleApp: React.FC<{
  cfg: DesktopConfig;
  inbox: DeskEmail[];
  onEmail: (email: string) => void;
  onOpenFile: (name: string) => void;
}> = ({ cfg, inbox, onEmail, onOpenFile }) => {
  const [q, setQ] = useState('');
  const people = cfg.contacts.filter((c) => c.email.toLowerCase() !== cfg.user.email.toLowerCase());
  const shown = people.filter((c) => !q.trim() || `${c.name} ${c.role} ${c.helpsWith ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()));
  // Their resources: what they've sent the candidate so far
  const filesFrom = (email: string) => [
    ...new Set(inbox.filter((m) => parseAddress(m.from).email.toLowerCase() === email.toLowerCase()).flatMap((m) => (m.attachments ?? []).map((a) => a.name))),
  ];
  return (
    <div className="h-full flex flex-col text-sm bg-[#f5f5f5] text-[#242424]" data-ref="people">
      <div className="px-5 py-3 bg-white border-b border-[#e0e0e0] flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-semibold">People</div>
          <div className="text-xs text-[#616161]">{cfg.company} · {people.length} people. Email anyone: they usually reply within seconds.</div>
        </div>
        <label className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people or teams" className="pl-8 pr-3 h-8 w-64 rounded bg-[#f5f5f5] border-b-2 border-transparent text-xs focus:outline-none focus:border-[#5b5fc7]" />
        </label>
      </div>
      <ul className="flex-1 min-h-0 overflow-y-auto p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 content-start">
        {shown.map((c) => {
          const files = filesFrom(c.email);
          const initials = c.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
          return (
            <li key={c.email} className="bg-white rounded-lg shadow-[0_1px_2px_rgba(0,0,0,.14),0_0_2px_rgba(0,0,0,.12)] hover:shadow-md p-4 flex gap-3" data-initials={initials}>
              <span className="relative shrink-0 h-fit">
                <Avatar name={c.name} size={44} />
                <span className="absolute -right-0.5 -bottom-0.5 w-3.5 h-3.5 rounded-full bg-[#6bb700] border-2 border-white" title="Available" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="font-semibold truncate">{c.name}</div>
                <div className="text-xs text-slate-600">{c.role}</div>
                <div className="text-[11px] text-slate-500 truncate">{parseAddress(c.email).email}</div>
                {c.helpsWith && <div className="text-[11px] text-slate-700">Ask about: {c.helpsWith}</div>}
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {files.map((f) => (
                      <button key={f} onClick={() => onOpenFile(f)} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700">
                        <FileText className="w-3 h-3" />
                        {f}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => onEmail(c.email)} className="mt-1.5 h-7 px-2.5 rounded border border-[#d1d1d1] inline-flex items-center gap-1.5 text-xs font-semibold text-[#242424] hover:bg-[#f5f5f5]" data-ref={`people-email-${c.email}`}>
                  <Mail className="w-3.5 h-3.5" />
                  Email {c.name.split(' ')[0]}
                </button>
              </div>
            </li>
          );
        })}
        {!shown.length && <li className="text-xs text-slate-500 p-4">No one matches.</li>}
      </ul>
    </div>
  );
};
