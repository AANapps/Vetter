import React from 'react';
import { Users } from 'lucide-react';
import { TeamMember } from '../types';
import { BoardPerson } from './ProjectBoard';

/**
 * The company's team, inside a team member's workspace (Work mode): everyone who's joined, with them first, and their
 * own teams and invitations under it (extra). The company's own workspace shows its full Team page instead.
 */
export const WorkspaceTeam: React.FC<{
  company: string;
  me: BoardPerson;
  team: TeamMember[];
  personOf: (uid: string) => BoardPerson | undefined;
  extra?: React.ReactNode;
}> = ({ company, me, team, personOf, extra }) => {
  const others = team
    .filter((m) => m.status === 'active' && m.uid !== me.uid)
    .map((m) => ({ id: m.id, name: (m.uid && personOf(m.uid)?.name) || m.name, pic: m.uid ? personOf(m.uid)?.pic : undefined, joinedAt: m.joinedAt }));
  const people = [{ id: 'me', name: `${me.name} (you)`, pic: me.pic, joinedAt: undefined as string | undefined }, ...others];
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Team</h2>
        <p className="text-sm text-slate-500">
          {company}&rsquo;s team: {people.length} {people.length === 1 ? 'person' : 'people'}
        </p>
      </div>
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {people.map((p) => (
            <li key={p.id} className="px-4 py-3 flex items-center gap-3">
              {p.pic ? (
                <img src={p.pic} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover bg-slate-100" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold grid place-items-center">{p.name[0]}</span>
              )}
              <span className="flex-1 min-w-0 text-sm font-semibold text-slate-900 truncate">{p.name}</span>
              {p.joinedAt && <span className="text-xs text-slate-400">Joined {p.joinedAt.slice(0, 10)}</span>}
            </li>
          ))}
        </ul>
        {others.length === 0 && (
          <p className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            No one else has joined yet.
          </p>
        )}
      </section>
      {extra}
    </div>
  );
};
