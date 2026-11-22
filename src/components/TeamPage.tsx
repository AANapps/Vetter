import React, { useMemo, useState } from 'react';
import { Award, Check, Sparkles, GraduationCap, LayoutGrid, ListTodo, Lock, Mail, Plus, Search, SquareKanban, Trash2, UserPlus, X } from 'lucide-react';
import { byUrgency, dueLabel, isOverdue, shortDate } from '../lib/work';
import { Assignment, AssessmentTest, Business, TeamMember, User, isPublic, levelName } from '../types';
import { Pic } from './Pic';
import { PageHeader } from './PageHeader';
import { WorkBoard } from './WorkBoard';

/**
 * A company's team on Praxa: the people it asked to join (candidates on Praxa, or anyone by email), and the tests, job
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

type TeamSection = 'overview' | 'tests' | 'people';


const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`bg-white border border-slate-200 rounded-2xl shadow-xs ${className}`}>{children}</section>
);

// A score's colour, as on profiles: green from 88, amber from 75, grey below
const scoreTone = (score: number) =>
  score >= 88 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : score >= 75 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200';

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
  const [section, setSection] = useState<TeamSection>(assignments.length ? 'tests' : team.length ? 'overview' : 'people');
  const [invite, setInvite] = useState('');
  const [assigning, setAssigning] = useState<string[] | null>(null);
  const [openMember, setOpenMember] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const active = team.filter((m) => m.status === 'active');
  const person = (m: TeamMember) => (m.uid ? candidates.find((c) => c.id === m.uid) : undefined);
  const nameOf = (m: TeamMember) => person(m)?.name ?? m.name;
  const testOf = (id: string) => tests.find((t) => t.id === id);
  const live = assignments.filter((a) => testOf(a.testId));

  // What each person is good at: their best Praxa test scores, and the team work they passed
  const strengths = (m: TeamMember) => {
    const p = person(m);
    const verified = [...(p?.verifiedSkills ?? [])].sort((a, b) => b.score - a.score).map((v) => ({ name: v.skillName, score: v.score, from: 'Praxa' as const, testId: v.testId }));
    const fromTeam = live
      .filter((a) => a.memberId === m.id && a.completedAt && (a.score ?? 0) >= (testOf(a.testId)?.passingScore ?? 75))
      .map((a) => ({ name: testOf(a.testId)!.title.replace(/:.*$/, ''), score: a.score ?? 0, from: 'Team' as const, testId: a.testId }));
    return [...verified, ...fromTeam].sort((a, b) => b.score - a.score);
  };
  const statsOf = (m: TeamMember) => {
    const theirs = live.filter((a) => a.memberId === m.id);
    const done = theirs.filter((a) => a.completedAt);
    const avg = done.length ? Math.round(done.reduce((sum, a) => sum + (a.score ?? 0), 0) / done.length) : undefined;
    return { theirs, done, avg, late: theirs.filter(isOverdue).length };
  };

  // Typing a name finds people on Praxa to ask; an address invites anyone
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

  const late = live.filter(isOverdue);
  const doneAll = live.filter((a) => a.completedAt);
  const teamAvg = doneAll.length ? Math.round(doneAll.reduce((s, a) => s + (a.score ?? 0), 0) / doneAll.length) : undefined;
  const menu: { id: TeamSection; label: string; icon: React.ComponentType<{ className?: string }>; count?: number; alert?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid, count: active.length },
    { id: 'tests', label: 'Work sent', icon: SquareKanban, count: live.filter((a) => !a.completedAt).length, alert: late.length > 0 },
    { id: 'people', label: 'People & invites', icon: UserPlus, count: team.filter((m) => m.status === 'invited').length || undefined },
  ];
  const member = openMember ? team.find((m) => m.id === openMember) : undefined;

  // The skills matrix: the skills most of the team has proven, by person
  const skillColumns = (() => {
    const counts = new Map<string, number>();
    active.forEach((m) => person(m)?.verifiedSkills.forEach((v) => counts.set(v.skillName, (counts.get(v.skillName) ?? 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
  })();
  // The tests matrix: every test sent to the team, by person
  const testColumns = [...new Set(live.map((a) => a.testId))].slice(0, 10);

  const taskCard = (a: Assignment, withPerson = true) => {
    const t = testOf(a.testId)!;
    const m = team.find((x) => x.id === a.memberId);
    const p = m && person(m);
    const lateNow = isOverdue(a);
    return (
      <li key={a.id} className={`p-3.5 rounded-xl bg-white border shadow-2xs space-y-2 ${lateNow ? 'border-rose-200' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between gap-2">
          <KindChip test={t} />
          <button onClick={() => onUnassign(a)} aria-label="Take back" title="Take back" className="p-0.5 text-slate-300 hover:text-rose-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <button onClick={() => onOpenTest(t.id)} className="block text-left text-sm font-bold text-slate-900 hover:text-indigo-700 leading-snug">
          {t.title}
        </button>
        <div className="flex items-center justify-between gap-2">
          {withPerson && (
            <button onClick={() => m && setOpenMember(m.id)} className="flex items-center gap-1.5 min-w-0 text-xs text-slate-600 hover:text-slate-900">
              {p ? <Pic src={p.avatarUrl} alt="" className="w-5 h-5 rounded-full" /> : <span className="w-5 h-5 rounded-full bg-slate-100" />}
              <span className="truncate">{m ? nameOf(m) : 'Left the team'}</span>
            </button>
          )}
          {a.completedAt ? (
            <span className={`ml-auto px-2 py-0.5 rounded-full border text-[11px] font-bold font-mono tabular-nums ${scoreTone(a.score ?? 0)}`}>{a.score}</span>
          ) : (
            dueLabel(a) && <span className={`ml-auto text-[11px] font-semibold ${lateNow ? 'text-rose-600' : 'text-slate-500'}`}>{dueLabel(a)}</span>
          )}
        </div>
        {a.certifiedAt && <span className="inline-block px-1.5 py-px rounded border text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200">Certified</span>}
      </li>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 items-start">
      {/* Side menu: a strip of pills on phones */}
      <aside className="lg:sticky lg:top-8 space-y-3">
        <Card className="overflow-hidden hidden lg:block">
          <div className="h-12" style={{ background: 'linear-gradient(120deg, #312e81 0%, #4f46e5 45%, #7c3aed 100%)' }} />
          <div className="px-4 pb-4 -mt-5 space-y-1">
            <Pic src={business.logo} alt="" className="w-10 h-10 rounded-xl border-2 border-white bg-slate-100 shadow-xs" />
            <div className="text-sm font-bold text-slate-900 pt-1 truncate">{business.name} team</div>
            <div className="text-xs text-slate-500">
              {active.length} {active.length === 1 ? 'person' : 'people'}
              {late.length > 0 && <span className="text-rose-600 font-semibold"> · {late.length} late</span>}
            </div>
          </div>
        </Card>
        <nav aria-label="Team" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:bg-white lg:border lg:border-slate-200 lg:rounded-2xl lg:p-2 lg:shadow-xs">
          {menu.map((m) => (
            <button
              key={m.id}
              onClick={() => setSection(m.id)}
              aria-current={section === m.id ? 'page' : undefined}
              className={`shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                section === m.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <m.icon className="w-4 h-4" />
              <span className="flex-1 text-left">{m.label}</span>
              {m.alert && <span className="w-2 h-2 rounded-full bg-rose-500" />}
              {!!m.count && <span className="text-[11px] font-mono tabular-nums text-slate-400">{m.count}</span>}
            </button>
          ))}
        </nav>
        <div className="hidden lg:flex flex-col gap-2">
          {active.length > 0 && (
            <button onClick={() => setAssigning(active.map((m) => m.id))} className="w-full h-10 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" />
              Send a test
            </button>
          )}
          <button
            onClick={() => (aiAllowed ? onCreateTraining() : onSeePlans())}
            className="group w-full h-10 px-4 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 hover:from-indigo-500 hover:via-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5 shadow-sm shadow-violet-200 transition-all"
          >
            {aiAllowed ? <Sparkles className="w-4 h-4 transition-transform group-hover:rotate-12" /> : <Lock className="w-3.5 h-3.5" />}
            Create training with AI
          </button>
        </div>
      </aside>

      <main className="min-w-0 space-y-5">
        {/* ---------- Overview: each person, what they're good at and how their work is going ---------- */}
        {section === 'overview' && (
          <>
            <PageHeader
              title="Your team"
              sub="What each person is good at, and how the tests you send them are going."
              action={
                active.length > 0 && (
                  <button onClick={() => setAssigning(active.map((m) => m.id))} className="lg:hidden h-10 px-4 rounded-full bg-slate-900 text-white text-sm font-semibold inline-flex items-center gap-1.5">
                    <Plus className="w-4 h-4" />
                    Send a test
                  </button>
                )
              }
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'On the team', value: active.length, tone: 'text-slate-900' },
                { label: 'Open tasks', value: live.filter((a) => !a.completedAt).length, tone: 'text-indigo-600' },
                { label: 'Late', value: late.length, tone: late.length ? 'text-rose-600' : 'text-slate-400' },
                { label: 'Average score', value: teamAvg ?? '–', tone: 'text-emerald-600' },
              ].map((s) => (
                <Card key={s.label} className="p-4">
                  <div className={`text-2xl font-bold font-mono tabular-nums ${s.tone}`}>{s.value}</div>
                  <div className="text-xs font-medium text-slate-500">{s.label}</div>
                </Card>
              ))}
            </div>
            {active.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3">
                <UserPlus className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-500">No one on the team yet.</p>
                <button onClick={() => setSection('people')} className="px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                  Invite your team
                </button>
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {active.map((m) => {
                  const p = person(m);
                  const st = statsOf(m);
                  const good = strengths(m);
                  return (
                    <li key={m.id}>
                      <Card className="h-full overflow-hidden flex flex-col">
                        <div className="h-12 bg-gradient-to-r from-indigo-100 via-violet-100 to-sky-100" />
                        <div className="px-5 pb-5 -mt-7 flex-1 flex flex-col gap-3">
                          <button onClick={() => setOpenMember(m.id)} className="text-left">
                            {p ? (
                              <Pic src={p.avatarUrl} alt="" className="w-14 h-14 rounded-full border-4 border-white bg-slate-100" />
                            ) : (
                              <span className="w-14 h-14 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-slate-400">
                                <Mail className="w-5 h-5" />
                              </span>
                            )}
                            <span className="block mt-1 text-base font-bold text-slate-900 hover:underline">{nameOf(m)}</span>
                            <span className="block text-xs text-slate-500 truncate">{p?.title || m.email || 'On the team'}</span>
                          </button>
                          <div>
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Good at</div>
                            {good.length === 0 ? (
                              <p className="text-xs text-slate-400">Nothing proven yet. Send them a test to find out.</p>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {good.slice(0, 3).map((g) => (
                                  <span key={`${g.from}-${g.name}`} className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${scoreTone(g.score)}`}>
                                    {g.name} <span className="font-mono">{g.score}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mt-auto space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">
                                {st.done.length}/{st.theirs.length} done{st.avg !== undefined && ` · avg ${st.avg}`}
                              </span>
                              {st.late > 0 && <span className="font-semibold text-rose-600">{st.late} late</span>}
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${st.theirs.length ? (st.done.length / st.theirs.length) * 100 : 0}%` }} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setAssigning([m.id])} className="flex-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
                              Send a test
                            </button>
                            <button onClick={() => setOpenMember(m.id)} className="flex-1 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50">
                              Tests & skills
                            </button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            )}
            {active.length > 0 && (
                <Card className="overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 text-sm font-bold text-slate-900">Team skills <span className="font-normal text-slate-400">· proven on Praxa, green 88+, amber 75–87</span></div>
                {skillColumns.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-slate-500">No one has proven a skill on Praxa yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] text-slate-500 border-b border-slate-100">
                          <th className="px-5 py-2 font-semibold sticky left-0 bg-white">Person</th>
                          {skillColumns.map((k) => (
                            <th key={k} className="px-2 py-2 font-semibold text-center whitespace-nowrap">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {active.map((m) => (
                          <tr key={m.id}>
                            <td className="px-5 py-2 whitespace-nowrap sticky left-0 bg-white">
                              <button onClick={() => setOpenMember(m.id)} className="font-semibold text-slate-900 hover:text-indigo-700">
                                {nameOf(m)}
                              </button>
                            </td>
                            {skillColumns.map((k) => {
                              const v = person(m)?.verifiedSkills.find((x) => x.skillName === k);
                              return (
                                <td key={k} className="px-2 py-2 text-center">
                                  {v ? (
                                    <span className={`inline-block min-w-9 px-1.5 py-0.5 rounded-md border text-xs font-bold font-mono tabular-nums ${scoreTone(v.score)}`}>{v.score}</span>
                                  ) : (
                                    <span className="text-slate-300">·</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>

            )}
          </>
        )}

        {/* ---------- Board: everything sent the team, like a work-management board ---------- */}
        {section === 'tests' && (
          <>
            <PageHeader title="Work sent" sub="The tests, simulations and training you've sent your team: who it's for, where it's up to, and the score." />
            <WorkBoard
              side="company"
              whoLabel="Person"
              rows={live.map((a) => {
                const m = team.find((x) => x.id === a.memberId);
                const p = m && person(m);
                return { a, test: testOf(a.testId)!, who: m ? nameOf(m) : 'Left the team', whoPic: p?.avatarUrl, whoId: a.memberId };
              })}
              onOpen={(r) => onOpenTest(r.test.id)}
              onOpenWho={(r) => team.some((m) => m.id === r.whoId) && setOpenMember(r.whoId)}
              onRemove={onUnassign}
              newLabel="Send a test"
              onNew={active.length ? () => setAssigning(active.map((m) => m.id)) : undefined}
            />
          </>
        )}

        {/* ---------- People & invites ---------- */}
        {section === 'people' && (
          <>
            <PageHeader title="People & invites" sub={`Invite your people to join ${business.name} on Praxa, and manage who's on the team.`} />
            <Card className="p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Invite someone</h2>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={invite}
                      onChange={(e) => setInvite(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendEmail()}
                      placeholder="Their work email, or the name of someone on Praxa"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={sendEmail}
                    disabled={!EMAIL.test(invite.trim())}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 rounded-full inline-flex items-center gap-1.5"
                  >
                    <Mail className="w-4 h-4" />
                    Invite
                  </button>
                </div>
                {matches.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
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
                            <span className="block text-xs text-slate-500 truncate">{c.title || 'On Praxa'}</span>
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
              <p className="text-xs text-slate-500">They'll see the invitation on Praxa once they sign in with that address, and can accept or decline it.</p>
            </Card>

            <Card className="divide-y divide-slate-100">
              {team.length === 0 && <p className="p-5 text-sm text-slate-500">No one yet. Invite your team above.</p>}
              {team.map((m) => {
                const p = person(m);
                const chip = STATUS_CHIP[m.status];
                return (
                  <div key={m.id} className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <button onClick={() => (m.status === 'active' ? setOpenMember(m.id) : p && onViewPerson(p.id))} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                        {p ? (
                          <Pic src={p.avatarUrl} alt="" className="w-10 h-10 rounded-full shrink-0" />
                        ) : (
                          <span className="w-10 h-10 rounded-full shrink-0 bg-slate-100 flex items-center justify-center text-slate-400">
                            <Mail className="w-4 h-4" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900 truncate">{nameOf(m)}</span>
                          <span className="block text-xs text-slate-500 truncate">
                            {m.status === 'invited' ? `Invited ${shortDate(m.invitedAt)}` : m.joinedAt ? `Joined ${shortDate(m.joinedAt)}` : m.email ?? p?.title ?? ''}
                          </span>
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${chip.cls}`}>{chip.label}</span>
                        {removing !== m.id && (
                          <button onClick={() => setRemoving(m.id)} className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 hover:text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1">
                            <Trash2 className="w-3.5 h-3.5" />
                            {m.status === 'invited' ? 'Cancel invite' : 'Remove'}
                          </button>
                        )}
                      </div>
                    </div>
                    {removing === m.id && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center gap-3">
                        <p className="flex-1 text-xs text-rose-900">
                          {m.status === 'invited' ? `Cancel ${nameOf(m)}'s invitation?` : `Remove ${nameOf(m)} from your team? Work you sent them is kept.`}
                        </p>
                        <div className="flex gap-2">
                          <button onClick={() => setRemoving(null)} className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200">
                            Keep
                          </button>
                          <button
                            onClick={() => {
                              onRemoveMember(m);
                              setRemoving(null);
                            }}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700"
                          >
                            {m.status === 'invited' ? 'Cancel invite' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
          </>
        )}
      </main>

      {/* One person: what they're good at, and every test you've sent them */}
      {member && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-[1px]" onClick={() => setOpenMember(null)}>
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={nameOf(member)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto"
          >
            {(() => {
              const p = person(member);
              const st = statsOf(member);
              const good = strengths(member);
              return (
                <>
                  <div className="h-24 relative" style={{ background: 'linear-gradient(120deg, #312e81 0%, #4f46e5 45%, #7c3aed 100%)' }}>
                    <button onClick={() => setOpenMember(null)} aria-label="Close" className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="px-6 pb-6 -mt-10 space-y-5">
                    <div>
                      {p ? (
                        <Pic src={p.avatarUrl} alt="" className="w-20 h-20 rounded-full border-4 border-white bg-slate-100" />
                      ) : (
                        <span className="w-20 h-20 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-slate-400">
                          <Mail className="w-6 h-6" />
                        </span>
                      )}
                      <h2 className="mt-1 text-xl font-bold text-slate-900">{nameOf(member)}</h2>
                      <p className="text-sm text-slate-600">{p?.title || member.email}</p>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => setAssigning([member.id])} className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
                          Send a test
                        </button>
                        {p && (
                          <button onClick={() => onViewPerson(p.id)} className="px-4 py-2 rounded-full text-xs font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50">
                            Full profile
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-slate-50">
                      {[
                        ['Sent', st.theirs.length],
                        ['Done', st.done.length],
                        ['Average', st.avg ?? '–'],
                      ].map(([k, v]) => (
                        <div key={k}>
                          <div className="text-lg font-bold font-mono tabular-nums text-slate-900">{v}</div>
                          <div className="text-[11px] text-slate-500">{k}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-indigo-600" />
                        Good at
                      </h3>
                      {good.length === 0 ? (
                        <p className="text-xs text-slate-500">Nothing proven yet. Send them a test to find out.</p>
                      ) : (
                        <ul className="space-y-2">
                          {good.slice(0, 8).map((g) => (
                            <li key={`${g.from}-${g.name}`}>
                              <button onClick={() => onOpenTest(g.testId)} className="w-full flex items-center gap-3 text-left group">
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold text-slate-900 group-hover:text-indigo-700 truncate">{g.name}</span>
                                  <span className="block h-1.5 mt-1 rounded-full bg-slate-100 overflow-hidden">
                                    <span className={`block h-full rounded-full ${g.score >= 88 ? 'bg-emerald-500' : g.score >= 75 ? 'bg-amber-400' : 'bg-slate-300'}`} style={{ width: `${g.score}%` }} />
                                  </span>
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 w-10 text-right">{g.from === 'Praxa' ? 'Praxa' : 'Team'}</span>
                                <span className="font-mono text-sm font-bold tabular-nums text-slate-900 w-8 text-right">{g.score}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5">
                        <ListTodo className="w-4 h-4 text-indigo-600" />
                        Their tests
                      </h3>
                      {st.theirs.length === 0 ? (
                        <p className="text-xs text-slate-500">You haven't sent them anything yet.</p>
                      ) : (
                        <ul className="space-y-2">{[...st.theirs].sort(byUrgency).map((a) => taskCard(a, false))}</ul>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </aside>
        </div>
      )}

      {assigning && (
        <AssignDialog
          members={active}
          initial={assigning}
          tests={tests}
          business={business}
          nameOf={nameOf}
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

// Picking who gets what: the company's training, its own simulations and tests, then Praxa's library
export const AssignDialog: React.FC<{
  members: TeamMember[];
  initial: string[];
  initialTestId?: string;
  tests: AssessmentTest[];
  business: Business;
  nameOf: (m: TeamMember) => string;
  onClose: () => void;
  onAssign: (members: TeamMember[], test: AssessmentTest, dueDate?: string, note?: string) => void;
}> = ({ members, initial, initialTestId, tests, business, nameOf, onClose, onAssign }) => {
  const [who, setWho] = useState<string[]>(initial);
  const [testId, setTestId] = useState<string | null>(initialTestId ?? null);
  const [q, setQ] = useState('');
  const [due, setDue] = useState('');
  const [note, setNote] = useState('');
  const groups = useMemo(() => {
    const match = (t: AssessmentTest) => !q.trim() || `${t.title} ${t.category} ${t.skillsTested.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase());
    const own = tests.filter((t) => t.businessId === business.id && match(t));
    return [
      { label: 'Your training', items: own.filter((t) => t.purpose === 'training') },
      { label: 'Your job simulations and tests', items: own.filter((t) => t.purpose !== 'training') },
      { label: "Praxa's library", items: tests.filter((t) => isPublic(t) && t.businessId !== business.id && match(t)).slice(0, 30) },
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
            <p className="text-sm text-slate-500">Training, a job simulation or a test. They'll find it on their Praxa home.</p>
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
