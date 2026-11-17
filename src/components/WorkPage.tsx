import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  Building2,
  CalendarClock,
  Check,
  Clock,
  GraduationCap,
  LayoutGrid,
  ListTodo,
  LogOut,
  Play,
  RotateCcw,
  Settings,
  ShieldCheck,
  SquareKanban,
  Users,
  X,
} from 'lucide-react';
import { Assignment, AssessmentTest, Business, TeamMember } from '../types';
import { KindChip } from './TeamPage';
import { Pic } from './Pic';
import { CertificateDetails, CertificateDialog } from './Certificate';
import { TASK_COLUMNS, TaskStatus, byUrgency, dueLabel, isOverdue, shortDate, statusOf } from '../lib/work';

/**
 * Someone's work from the companies whose teams they're on, like a task manager: the tasks (training, job simulations
 * and tests) on a board or as a list, their training and certificates, their teams and invitations, and settings, where
 * they can leave a team. Results here stay between them and the company.
 */

type Section = 'tasks' | 'training' | 'certificates' | 'teams' | 'settings';

interface WorkPageProps {
  invitations: TeamMember[];
  memberships: TeamMember[];
  assignments: Assignment[];
  tests: AssessmentTest[];
  businesses: Business[];
  personName: string;
  onRespond: (member: TeamMember, accept: boolean) => void;
  onLeave: (member: TeamMember) => void;
  onStart: (assignment: Assignment, test: AssessmentTest) => void;
  onFindTests: () => void;
}

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section className={`bg-white border border-slate-200 rounded-2xl shadow-xs ${className}`}>{children}</section>
);

export const WorkPage: React.FC<WorkPageProps> = ({ invitations, memberships, assignments, tests, businesses, personName, onRespond, onLeave, onStart, onFindTests }) => {
  const [section, setSection] = useState<Section>(invitations.length && !memberships.length ? 'teams' : 'tasks');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [company, setCompany] = useState<string>('all');
  const [cert, setCert] = useState<CertificateDetails | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);

  const testOf = (a: Assignment) => tests.find((t) => t.id === a.testId);
  const logoOf = (businessId: string) => businesses.find((b) => b.id === businessId)?.logo;
  const isTraining = (a: Assignment) => testOf(a)?.purpose === 'training';
  const mine = assignments.filter((a) => testOf(a)).filter((a) => company === 'all' || a.businessId === company);
  const open = assignments.filter((a) => !a.completedAt);
  const late = assignments.filter(isOverdue);
  const certified = assignments.filter((a) => a.certifiedAt);
  const certificateOf = (a: Assignment, t: AssessmentTest): CertificateDetails => ({
    id: a.id,
    name: personName,
    trainingTitle: t.title,
    companyName: a.companyName,
    skills: t.skillsTested,
    score: a.certificateScore ?? a.score ?? 0,
    certifiedAt: a.certifiedAt!,
  });

  const menu: { id: Section; label: string; icon: React.ComponentType<{ className?: string }>; count?: number; alert?: boolean }[] = [
    { id: 'tasks', label: 'My tasks', icon: ListTodo, count: open.length, alert: late.length > 0 },
    { id: 'training', label: 'Training', icon: GraduationCap, count: assignments.filter((a) => isTraining(a) && !a.completedAt).length },
    { id: 'certificates', label: 'Certificates', icon: Award, count: certified.length },
    { id: 'teams', label: 'Teams', icon: Users, count: memberships.length, alert: invitations.length > 0 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // The button on a task: start it, carry on, see the certificate or do training again
  const action = (a: Assignment, t: AssessmentTest, small = false) => {
    const size = small ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
    if (a.completedAt) {
      return (
        <span className="flex items-center gap-2 flex-wrap">
          {a.certifiedAt && (
            <button onClick={() => setCert(certificateOf(a, t))} className={`${size} rounded-full font-semibold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 inline-flex items-center gap-1`}>
              <Award className="w-3.5 h-3.5" />
              Certificate
            </button>
          )}
          {t.purpose === 'training' && (
            <button onClick={() => onStart(a, t)} className={`${size} rounded-full font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 inline-flex items-center gap-1`}>
              <RotateCcw className="w-3.5 h-3.5" />
              Again
            </button>
          )}
        </span>
      );
    }
    return (
      <button onClick={() => onStart(a, t)} className={`${size} rounded-full font-semibold text-white bg-indigo-600 hover:bg-indigo-700 inline-flex items-center gap-1.5`}>
        <Play className="w-3.5 h-3.5 fill-current" />
        {a.startedAt ? 'Continue' : t.purpose === 'training' ? 'Start training' : 'Start'}
      </button>
    );
  };

  const taskCard = (a: Assignment) => {
    const t = testOf(a)!;
    const due = dueLabel(a);
    const lateNow = isOverdue(a);
    return (
      <li key={a.id} className={`p-4 rounded-xl bg-white border shadow-2xs space-y-2.5 ${lateNow ? 'border-rose-200' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between gap-2">
          <KindChip test={t} />
          {a.completedAt ? (
            <span className={`font-mono text-sm font-bold tabular-nums ${(a.score ?? 0) >= t.passingScore ? 'text-emerald-700' : 'text-amber-700'}`}>{a.score}/100</span>
          ) : (
            due && (
              <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${lateNow ? 'text-rose-600' : 'text-slate-500'}`}>
                <CalendarClock className="w-3 h-3" />
                {due}
              </span>
            )
          )}
        </div>
        <div className="text-sm font-bold text-slate-900 leading-snug">{t.title}</div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Pic src={logoOf(a.businessId) ?? ''} alt="" className="w-4 h-4 rounded" />
          <span className="truncate">{a.companyName}</span>
          <span>·</span>
          <Clock className="w-3 h-3" />~{t.estimatedMinutes} min
        </div>
        {a.note && <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-1.5">“{a.note}”</p>}
        {a.completedAt && <p className="text-[11px] text-slate-500">Finished {shortDate(a.completedAt)}</p>}
        <div>{action(a, t, true)}</div>
      </li>
    );
  };

  const empty = (text: string, cta?: React.ReactNode) => (
    <div className="p-8 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-2">
      <ListTodo className="w-8 h-8 text-slate-300 mx-auto" />
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{text}</p>
      {cta}
    </div>
  );

  // The list view, grouped by when it's due
  const groups: { label: string; items: Assignment[] }[] = (() => {
    const todo = mine.filter((a) => !a.completedAt).sort(byUrgency);
    const week = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    return [
      { label: 'Late', items: todo.filter(isOverdue) },
      { label: 'This week', items: todo.filter((a) => !isOverdue(a) && a.dueDate && a.dueDate <= week) },
      { label: 'Later', items: todo.filter((a) => a.dueDate && a.dueDate > week) },
      { label: 'No due date', items: todo.filter((a) => !a.dueDate) },
      { label: 'Done', items: mine.filter((a) => a.completedAt).sort(byUrgency) },
    ].filter((g) => g.items.length);
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6 items-start">
        {/* Side menu: a strip of pills on phones */}
        <aside className="lg:sticky lg:top-20 space-y-3">
          <Card className="overflow-hidden hidden lg:block">
            <div className="h-12" style={{ background: 'linear-gradient(120deg, #312e81 0%, #4f46e5 45%, #7c3aed 100%)' }} />
            <div className="px-4 pb-4 -mt-5 space-y-1">
              <span className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-indigo-600">
                <SquareKanban className="w-5 h-5" />
              </span>
              <div className="text-sm font-bold text-slate-900 pt-1">Work</div>
              <div className="text-xs text-slate-500">
                {open.length} open{late.length > 0 && <span className="text-rose-600 font-semibold"> · {late.length} late</span>} · {memberships.length}{' '}
                {memberships.length === 1 ? 'team' : 'teams'}
              </div>
            </div>
          </Card>
          <nav aria-label="Work" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:bg-white lg:border lg:border-slate-200 lg:rounded-2xl lg:p-2 lg:shadow-xs">
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
        </aside>

        <main className="min-w-0 space-y-5">
          {/* Invitations stay on top wherever they are */}
          {invitations.length > 0 && section !== 'teams' && (
            <button onClick={() => setSection('teams')} className="w-full p-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 text-left flex items-center gap-3">
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <span className="flex-1 text-sm text-slate-800">
                <span className="font-bold">{invitations.map((i) => i.companyName).join(', ')}</span> invited you to {invitations.length === 1 ? 'its team' : 'their teams'}.
              </span>
              <span className="text-xs font-semibold text-indigo-700">Review</span>
            </button>
          )}

          {/* ---------- My tasks ---------- */}
          {section === 'tasks' && (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My tasks</h1>
                  <p className="text-sm text-slate-500">Training, job simulations and tests your teams sent you. Only you and that company see the results.</p>
                </div>
                <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold">
                  {(
                    [
                      ['board', 'Board', LayoutGrid],
                      ['list', 'List', ListTodo],
                    ] as const
                  ).map(([id, label, Icon]) => (
                    <button
                      key={id}
                      onClick={() => setView(id)}
                      aria-pressed={view === id}
                      className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 ${view === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'To do', value: assignments.filter((a) => statusOf(a) === 'todo').length, tone: 'text-slate-900' },
                  { label: 'In progress', value: assignments.filter((a) => statusOf(a) === 'doing').length, tone: 'text-amber-600' },
                  { label: 'Done', value: assignments.filter((a) => statusOf(a) === 'done').length, tone: 'text-emerald-600' },
                  { label: 'Late', value: late.length, tone: late.length ? 'text-rose-600' : 'text-slate-400' },
                ].map((s) => (
                  <Card key={s.label} className="p-4">
                    <div className={`text-2xl font-bold font-mono tabular-nums ${s.tone}`}>{s.value}</div>
                    <div className="text-xs font-medium text-slate-500">{s.label}</div>
                  </Card>
                ))}
              </div>

              {memberships.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  {[{ id: 'all', name: 'All teams' }, ...memberships.map((m) => ({ id: m.businessId, name: m.companyName }))].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCompany(c.id)}
                      className={`px-3 py-1 rounded-full border text-xs font-semibold ${company === c.id ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-300 text-slate-700 hover:border-slate-500'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}

              {memberships.length === 0 ? (
                empty('You’re not on a team yet. When a company invites you to its team, the work it sends you appears here.', (
                  <button onClick={onFindTests} className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold">
                    Take a Praxa test meanwhile
                  </button>
                ))
              ) : mine.length === 0 ? (
                empty('Nothing to do yet. Training and tests your team sends you will appear here.')
              ) : view === 'board' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {TASK_COLUMNS.map((col) => {
                    const items = mine.filter((a) => statusOf(a) === (col.id as TaskStatus)).sort(byUrgency);
                    return (
                      <div key={col.id} className="rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-600">{col.label}</span>
                          <span className="ml-auto text-xs font-mono text-slate-400">{items.length}</span>
                        </div>
                        {items.length === 0 ? <p className="px-1 pb-2 text-xs text-slate-400">Nothing here.</p> : <ul className="space-y-2.5">{items.map(taskCard)}</ul>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {groups.map((g) => (
                    <Card key={g.label} className="overflow-hidden">
                      <div className={`px-5 py-2.5 border-b border-slate-100 text-xs font-bold uppercase tracking-wide ${g.label === 'Late' ? 'text-rose-600 bg-rose-50/60' : 'text-slate-500 bg-slate-50/60'}`}>
                        {g.label} · {g.items.length}
                      </div>
                      <ul className="divide-y divide-slate-100">
                        {g.items.map((a) => {
                          const t = testOf(a)!;
                          const st = statusOf(a);
                          return (
                            <li key={a.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${st === 'done' ? 'bg-emerald-500 text-white' : st === 'doing' ? 'border-2 border-amber-400' : 'border-2 border-slate-300'}`}
                              >
                                {st === 'done' && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold text-slate-900">{t.title}</span>
                                  <KindChip test={t} />
                                </div>
                                <div className="text-xs text-slate-500">
                                  {a.companyName} · ~{t.estimatedMinutes} min
                                  {dueLabel(a) && <span className={isOverdue(a) ? 'text-rose-600 font-semibold' : ''}> · {dueLabel(a)}</span>}
                                  {a.completedAt && <span className="font-semibold text-slate-700"> · {a.score}/100</span>}
                                </div>
                              </div>
                              {action(a, t, true)}
                            </li>
                          );
                        })}
                      </ul>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ---------- Training ---------- */}
          {section === 'training' && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Training</h1>
                <p className="text-sm text-slate-500">Courses your teams set you. Untimed; pass it to earn a certificate, and do it again any time.</p>
              </div>
              {assignments.filter(isTraining).length === 0 ? (
                empty('No training yet. When your team sends you training, it appears here.')
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignments
                    .filter(isTraining)
                    .sort(byUrgency)
                    .map((a) => {
                      const t = testOf(a)!;
                      return (
                        <li key={a.id}>
                          <Card className="p-5 h-full flex flex-col gap-3">
                            <div className="flex items-start gap-3">
                              <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                <GraduationCap className="w-5 h-5" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900">{t.title}</div>
                                <div className="text-xs text-slate-500">
                                  {a.companyName} · ~{t.estimatedMinutes} min{dueLabel(a) && ` · ${dueLabel(a)}`}
                                </div>
                              </div>
                            </div>
                            {t.skillsTested.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {t.skillsTested.slice(0, 4).map((s) => (
                                  <span key={s} className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] text-slate-600">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="mt-auto flex items-center justify-between gap-2">
                              <span className="text-xs text-slate-500">
                                {a.completedAt ? `Best ${a.score}/100${a.certifiedAt ? ' · certified' : ''}` : a.startedAt ? 'In progress' : 'Not started'}
                              </span>
                              {action(a, t, true)}
                            </div>
                          </Card>
                        </li>
                      );
                    })}
                </ul>
              )}
            </>
          )}

          {/* ---------- Certificates ---------- */}
          {section === 'certificates' && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Certificates</h1>
                <p className="text-sm text-slate-500">Training you've passed. Open one to see, download or share it.</p>
              </div>
              {certified.length === 0 ? (
                empty('No certificates yet. Pass a piece of training your team sends you to earn one.')
              ) : (
                <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {certified.map((a) => {
                    const t = testOf(a);
                    if (!t) return null;
                    return (
                      <li key={a.id}>
                        <button onClick={() => setCert(certificateOf(a, t))} className="w-full text-left rounded-2xl overflow-hidden border border-amber-200 bg-white hover:shadow-md transition-shadow">
                          <div className="h-20 bg-gradient-to-br from-amber-200 via-amber-100 to-white flex items-center justify-center">
                            <Award className="w-9 h-9 text-amber-600" />
                          </div>
                          <div className="p-4 space-y-1">
                            <div className="text-sm font-bold text-slate-900">{t.title}</div>
                            <div className="text-xs text-slate-500">
                              {a.companyName} · {shortDate(a.certifiedAt)} · {a.certificateScore ?? a.score}/100
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}

          {/* ---------- Teams ---------- */}
          {section === 'teams' && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teams</h1>
                <p className="text-sm text-slate-500">Companies whose teams you're on, and invitations to join.</p>
              </div>
              {invitations.map((m) => (
                <Card key={m.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 border-indigo-200">
                  <Pic src={logoOf(m.businessId) ?? ''} alt="" className="w-12 h-12 rounded-xl bg-slate-100 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{m.companyName} invited you to its team</div>
                    <p className="text-xs text-slate-600">
                      They'll be able to send you training, job simulations and tests, and see how you do on those. Nothing else on your profile changes, and those results
                      aren't public.
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => onRespond(m, false)} className="px-4 py-2 rounded-full text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50">
                      Decline
                    </button>
                    <button onClick={() => onRespond(m, true)} className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 inline-flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Join
                    </button>
                  </div>
                </Card>
              ))}
              {memberships.length === 0 && invitations.length === 0 && empty('You’re not on a team yet. A company can invite you from its Team page.')}
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memberships.map((m) => {
                  const theirs = assignments.filter((a) => a.memberId === m.id);
                  const done = theirs.filter((a) => a.completedAt);
                  const avg = done.length ? Math.round(done.reduce((s, a) => s + (a.score ?? 0), 0) / done.length) : undefined;
                  return (
                    <li key={m.id}>
                      <Card className="overflow-hidden">
                        <div className="h-14 bg-gradient-to-r from-slate-800 to-indigo-800" />
                        <div className="px-5 pb-5 -mt-7 space-y-3">
                          <Pic src={logoOf(m.businessId) ?? ''} alt="" className="w-14 h-14 rounded-xl border-4 border-white bg-slate-100" />
                          <div>
                            <div className="text-base font-bold text-slate-900">{m.companyName}</div>
                            <div className="text-xs text-slate-500">On the team since {shortDate(m.joinedAt ?? m.invitedAt)}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-slate-100">
                            {[
                              ['Open', theirs.length - done.length],
                              ['Done', done.length],
                              ['Average', avg ?? '–'],
                            ].map(([k, v]) => (
                              <div key={k}>
                                <div className="text-base font-bold font-mono tabular-nums text-slate-900">{v}</div>
                                <div className="text-[11px] text-slate-500">{k}</div>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setCompany(m.businessId);
                                setSection('tasks');
                              }}
                              className="flex-1 px-3 py-2 rounded-full text-xs font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                            >
                              See tasks
                            </button>
                            <button onClick={() => setSection('settings')} className="px-3 py-2 rounded-full text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1">
                              <Settings className="w-3.5 h-3.5" />
                              Settings
                            </button>
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* ---------- Settings: what a team sees, and leaving it ---------- */}
          {section === 'settings' && (
            <>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
                <p className="text-sm text-slate-500">What your teams can see, and leaving a team.</p>
              </div>
              <Card className="p-5 flex gap-4">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                <div className="text-sm text-slate-700 space-y-1">
                  <p className="font-semibold text-slate-900">What a team can see</p>
                  <p>The work it sends you and how you do on it, and your public Praxa profile. Not your other teams, not other companies' tests, and not where you've applied.</p>
                </div>
              </Card>
              {memberships.length === 0 ? (
                empty('You’re not on any team.')
              ) : (
                <Card className="divide-y divide-slate-100">
                  {memberships.map((m) => (
                    <div key={m.id} className="p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <Pic src={logoOf(m.businessId) ?? ''} alt="" className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-slate-900">{m.companyName}</div>
                          <div className="text-xs text-slate-500">Joined {shortDate(m.joinedAt ?? m.invitedAt)}</div>
                        </div>
                        {leaving !== m.id && (
                          <button onClick={() => setLeaving(m.id)} className="px-4 py-2 rounded-full text-xs font-semibold text-rose-700 border border-rose-200 hover:bg-rose-50 inline-flex items-center gap-1.5">
                            <LogOut className="w-3.5 h-3.5" />
                            Leave team
                          </button>
                        )}
                      </div>
                      {leaving === m.id && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center gap-3">
                          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          <p className="flex-1 text-xs text-rose-900">
                            Leave {m.companyName}'s team? They won't be able to send you work any more. What you've already done stays with them; they'd need to invite you again.
                          </p>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => setLeaving(null)} className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-white border border-slate-200">
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                onLeave(m);
                                setLeaving(null);
                              }}
                              className="px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 inline-flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Leave
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}
        </main>
      </div>
      {cert && <CertificateDialog cert={cert} onClose={() => setCert(null)} />}
    </div>
  );
};
