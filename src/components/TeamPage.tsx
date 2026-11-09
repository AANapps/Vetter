import React, { useMemo, useState } from 'react';
import { Check, GraduationCap, Lock, Mail, Plus, Search, Trash2, UserPlus, X } from 'lucide-react';
import { Assignment, AssessmentTest, Business, TeamMember, User, isPublic, levelName } from '../types';
import { Pic } from './Pic';

/**
 * A company's team on Vetter: the people it asked to join (candidates on Vetter, or anyone by email), and the tests, job
 * simulations and training it gives them. Results stay between the company and the person: never on their profile or a
 * leaderboard.
 */

interface TeamPageProps {
  business: Business;
  team: TeamMember[];
  assignments: Assignment[];
  tests: AssessmentTest[];
  candidates: User[];
  aiAllowed: boolean;
  onInviteEmail: (email: string) => void;
  onInviteCandidate: (candidate: User) => void;
  onRemoveMember: (member: TeamMember) => void;
  onAssign: (members: TeamMember[], test: AssessmentTest, dueDate?: string, note?: string) => void;
  onUnassign: (assignment: Assignment) => void;
  onCreateTraining: () => void;
  onSeePlans: () => void;
  onOpenTest: (testId: string) => void;
  onViewPerson: (personId: string) => void;
}

// What a piece of work is, as the team sees it
export const workKind = (test: AssessmentTest) => (test.purpose === 'training' ? 'Training' : test.scenario ? 'Job simulation' : 'Test');

const KIND_CHIP: Record<string, string> = {
  Training: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Job simulation': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Test: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const KindChip: React.FC<{ test: AssessmentTest }> = ({ test }) => {
  const kind = workKind(test);
  return <span className={`px-1.5 py-px rounded border text-[10px] font-semibold ${KIND_CHIP[kind]}`}>{kind}</span>;
};

const STATUS_CHIP: Record<TeamMember['status'], { label: string; cls: string }> = {
  invited: { label: 'Invited', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  active: { label: 'On the team', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  declined: { label: 'Declined', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const shortDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

export const TeamPage: React.FC<TeamPageProps> = ({
  business,
  team,
  assignments,
  tests,
  candidates,
  aiAllowed,
  onInviteEmail,
  onInviteCandidate,
  onRemoveMember,
  onAssign,
  onUnassign,
  onCreateTraining,
  onSeePlans,
  onOpenTest,
  onViewPerson,
}) => {
  const [invite, setInvite] = useState('');
  const [assigning, setAssigning] = useState<string[] | null>(null);
  const active = team.filter((m) => m.status === 'active');
  const person = (m: TeamMember) => (m.uid ? candidates.find((c) => c.id === m.uid) : undefined);
  const testOf = (id: string) => tests.find((t) => t.id === id);

  // Typing a name finds people on Vetter to ask; an address invites anyone
  const query = invite.trim().toLowerCase();
  const matches =
    query.length >= 2 && !query.includes('@')
      ? candidates.filter((c) => c.name.toLowerCase().includes(query) && !team.some((m) => m.uid === c.id && m.status !== 'declined')).slice(0, 5)
      : [];
  const sendEmail = () => {
    if (!EMAIL.test(invite.trim())) return;
    onInviteEmail(invite.trim().toLowerCase());
    setInvite('');
  };

  const training = tests.filter((t) => t.purpose === 'training' && t.businessId === business.id);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your team</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Invite your people to join {business.name} on Vetter, then send them tests, job simulations and training. What they score stays between you
            and them: it's never on their profile or a leaderboard.
          </p>
        </div>
        <button
          onClick={() => (aiAllowed ? onCreateTraining() : onSeePlans())}
          className="create-border shrink-0 self-start sm:self-auto px-4 py-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 rounded-lg inline-flex items-center gap-1.5"
        >
          {aiAllowed ? <GraduationCap className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
          Create training with AI
        </button>
      </div>

      {/* Inviting */}
      <section className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Invite someone</h2>
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendEmail()}
                placeholder="Their work email, or the name of someone on Vetter"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={sendEmail}
              disabled={!EMAIL.test(invite.trim())}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg inline-flex items-center gap-1.5"
            >
              <Mail className="w-4 h-4" />
              Invite
            </button>
          </div>
          {matches.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
              {matches.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      onInviteCandidate(c);
                      setInvite('');
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50"
                  >
                    <Pic src={c.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 truncate">{c.name}</span>
                      <span className="block text-xs text-slate-500 truncate">{c.title || 'On Vetter'}</span>
                    </span>
                    <span className="text-xs font-semibold text-indigo-700 inline-flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5" />
                      Invite to team
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-xs text-slate-500">They'll see the invitation on Vetter once they sign in with that address, and can accept or decline it.</p>
      </section>

      {/* The people */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900">
            People <span className="text-slate-400 font-normal">({team.length})</span>
          </h2>
          {active.length > 0 && (
            <button onClick={() => setAssigning(active.map((m) => m.id))} className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Send to the whole team
            </button>
          )}
        </div>
        {team.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500 bg-white border border-dashed border-slate-300 rounded-xl">No one yet. Invite your team above.</div>
        ) : (
          <ul className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {team.map((m) => {
              const p = person(m);
              const theirs = assignments.filter((a) => a.memberId === m.id);
              const done = theirs.filter((a) => a.completedAt);
              const avg = done.length ? Math.round(done.reduce((sum, a) => sum + (a.score ?? 0), 0) / done.length) : undefined;
              const chip = STATUS_CHIP[m.status];
              return (
                <li key={m.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <button onClick={() => p && onViewPerson(p.id)} disabled={!p} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                    {p ? (
                      <Pic src={p.avatarUrl} alt="" className="w-9 h-9 rounded-full shrink-0" />
                    ) : (
                      <span className="w-9 h-9 rounded-full shrink-0 bg-slate-100 flex items-center justify-center text-slate-400">
                        <Mail className="w-4 h-4" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 truncate">{p?.name ?? m.name}</span>
                      <span className="block text-xs text-slate-500 truncate">{m.email ?? p?.title ?? ''}</span>
                    </span>
                  </button>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${chip.cls}`}>{chip.label}</span>
                    {m.status === 'active' && (
                      <span className="text-xs text-slate-500 tabular-nums">
                        {done.length}/{theirs.length} done{avg !== undefined && ` · avg ${avg}`}
                      </span>
                    )}
                    {m.status === 'active' && (
                      <button onClick={() => setAssigning([m.id])} className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg">
                        Send work
                      </button>
                    )}
                    <button
                      onClick={() => window.confirm(`Remove ${p?.name ?? m.name} from your team? Work you sent them is kept.`) && onRemoveMember(m)}
                      aria-label="Remove from team"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* What's been sent, and how it's going */}
      {assignments.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Sent to your team</h2>
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="px-3 py-2 font-semibold">Person</th>
                  <th className="px-3 py-2 font-semibold">Work</th>
                  <th className="px-3 py-2 font-semibold">Sent</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments.map((a) => {
                  const m = team.find((x) => x.id === a.memberId);
                  const t = testOf(a.testId);
                  const overdue = !a.completedAt && a.dueDate && a.dueDate < new Date().toISOString().slice(0, 10);
                  return (
                    <tr key={a.id}>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-900">{(m && person(m)?.name) ?? m?.name ?? 'Left the team'}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => t && onOpenTest(t.id)} className="text-left font-medium text-slate-900 hover:text-indigo-700">
                          {t?.title ?? 'A test that was deleted'}
                        </button>{' '}
                        {t && <KindChip test={t} />}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                        {shortDate(a.assignedAt)}
                        {a.dueDate && <span className={overdue ? 'text-rose-600' : ''}> · due {shortDate(a.dueDate)}</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {a.completedAt ? (
                          <span className={`font-semibold tabular-nums ${t && (a.score ?? 0) >= t.passingScore ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {a.score}/100 <span className="font-normal text-slate-400">· {shortDate(a.completedAt)}</span>
                          </span>
                        ) : a.startedAt ? (
                          <span className="text-slate-600">Started</span>
                        ) : (
                          <span className="text-slate-400">Not started</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => onUnassign(a)} aria-label="Take back" className="p-1 text-slate-400 hover:text-rose-600">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {training.length === 0 && (
        <p className="text-sm text-slate-500">
          Training is a copy of an app your team uses, with guided tasks set at {business.name} and the worked answers at the end. Ask Vetter on the
          home chat (e.g. "train my support team on Zendesk") or press Create training with AI.
        </p>
      )}

      {assigning && (
        <AssignDialog
          members={active}
          initial={assigning}
          tests={tests}
          business={business}
          nameOf={(m) => person(m)?.name ?? m.name}
          onClose={() => setAssigning(null)}
          onAssign={(members, test, due, note) => {
            onAssign(members, test, due, note);
            setAssigning(null);
          }}
        />
      )}
    </div>
  );
};

// Picking who gets what: the company's training, its own simulations and tests, then Vetter's library
const AssignDialog: React.FC<{
  members: TeamMember[];
  initial: string[];
  tests: AssessmentTest[];
  business: Business;
  nameOf: (m: TeamMember) => string;
  onClose: () => void;
  onAssign: (members: TeamMember[], test: AssessmentTest, dueDate?: string, note?: string) => void;
}> = ({ members, initial, tests, business, nameOf, onClose, onAssign }) => {
  const [who, setWho] = useState<string[]>(initial);
  const [testId, setTestId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [due, setDue] = useState('');
  const [note, setNote] = useState('');
  const groups = useMemo(() => {
    const match = (t: AssessmentTest) => !q.trim() || `${t.title} ${t.category} ${t.skillsTested.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase());
    const own = tests.filter((t) => t.businessId === business.id && match(t));
    return [
      { label: 'Your training', items: own.filter((t) => t.purpose === 'training') },
      { label: 'Your job simulations and tests', items: own.filter((t) => t.purpose !== 'training') },
      { label: "Vetter's library", items: tests.filter((t) => isPublic(t) && t.businessId !== business.id && match(t)).slice(0, 30) },
    ].filter((g) => g.items.length);
  }, [tests, q, business.id]);
  const test = tests.find((t) => t.id === testId);
  const chosen = members.filter((m) => who.includes(m.id));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/60">
      <div role="dialog" aria-modal="true" aria-label="Send work to your team" className="bg-white sm:rounded-2xl rounded-t-2xl max-w-2xl w-full max-h-[90dvh] shadow-2xl flex flex-col">
        <div className="px-5 pt-4 pb-3 border-b border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Send work to your team</h2>
            <p className="text-sm text-slate-500">Training, a job simulation or a test. They'll find it on their Vetter home.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Who</div>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = who.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => setWho((prev) => (on ? prev.filter((x) => x !== m.id) : [...prev, m.id]))}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold inline-flex items-center gap-1 ${on ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'}`}
                  >
                    {on && <Check className="w-3.5 h-3.5" />}
                    {nameOf(m)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">What</div>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search training, simulations and tests"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {groups.length === 0 && <p className="text-sm text-slate-500">Nothing matches.</p>}
            {groups.map((g) => (
              <div key={g.label} className="space-y-1">
                <div className="text-xs font-semibold text-slate-500 pt-2">{g.label}</div>
                {g.items.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTestId(t.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border flex items-center gap-3 ${testId === t.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300'}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900 truncate">{t.title}</span>
                      <span className="block text-xs text-slate-500">
                        {levelName(t.difficulty)} · ~{t.estimatedMinutes} min · {t.totalQuestions} questions
                      </span>
                    </span>
                    <KindChip test={t} />
                  </button>
                ))}
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              Due (optional)
              <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full px-3 py-2 text-sm font-normal border border-slate-200 rounded-lg" />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-600">
              Note (optional)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 300))}
                placeholder="e.g. Before your first week on the desk"
                className="w-full px-3 py-2 text-sm font-normal border border-slate-200 rounded-lg"
              />
            </label>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => test && chosen.length && onAssign(chosen, test, due || undefined, note.trim() || undefined)}
            disabled={!test || !chosen.length}
            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-lg"
          >
            Send to {chosen.length} {chosen.length === 1 ? 'person' : 'people'}
          </button>
        </div>
      </div>
    </div>
  );
};
