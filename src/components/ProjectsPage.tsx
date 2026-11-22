import React, { useState } from 'react';
import { Briefcase, Building2, ContactRound, FolderKanban, Handshake, ListTodo, Magnet, Plus, Search, X } from 'lucide-react';
import { Business, Project, ProjectTask } from '../types';
import { BoardPerson, GROUP_COLOURS, ProjectBoard, TASK_STATUS, newProject } from './ProjectBoard';
import { setupCrm } from '../lib/crm';

/**
 * Project Manager → Projects: the company's workspace, laid out like monday CRM. A sidebar lists the CRM's boards
 * (Leads, Contacts, Accounts, Deals) and the project boards, with search and New; the open board fills the rest of the
 * screen. Set up CRM makes the four linked boards in one go; templates start a project. The board opened last opens
 * again, and a linked item on another board opens that board on it.
 */

const TEMPLATES: { name: string; blurb: string; groups: string[] }[] = [
  { name: 'Team tasks', blurb: 'A simple to-do list for the team', groups: ['To do', 'Completed'] },
  { name: 'Project plan', blurb: 'Phases from planning to launch', groups: ['Planning', 'In progress', 'Review', 'Completed'] },
  { name: 'New starter onboarding', blurb: 'Everything for someone’s first weeks', groups: ['Before day one', 'First week', 'First month', 'Completed'] },
  { name: 'Hiring pipeline', blurb: 'Roles to fill, from brief to offer', groups: ['To brief', 'Interviewing', 'Offer', 'Completed'] },
];

const CRM_ICON: Record<string, React.ComponentType<{ className?: string }>> = { leads: Magnet, contacts: ContactRound, accounts: Building2, deals: Handshake };
const CRM_ORDER = ['leads', 'contacts', 'accounts', 'deals'];

const store = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      // Private windows can refuse storage; the choice then lasts for the visit
    }
  },
};

const fromTemplate = (businessId: string, name: string, groups: string[]): Project => {
  const p = newProject(businessId, name);
  const made = groups.map((g, i) => ({ id: `${p.groups[0].id}-${i}`, name: g, colour: i % GROUP_COLOURS.length }));
  const done = made.find((g) => /complete/i.test(g.name));
  return { ...p, kind: 'project', groups: made, automations: done ? [{ ...p.automations![0], toGroupId: done.id }] : [] };
};

export const ProjectsPage: React.FC<{
  business: Business;
  me: BoardPerson;
  people: BoardPerson[];
  projects: Project[];
  projectTasks: ProjectTask[];
  onSaveProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onSaveTask: (task: ProjectTask) => void;
  onDeleteTask: (task: ProjectTask) => void;
  onInviteTeam?: () => void;
  // Someone on the company's team (Work mode): the same workspace as the company's, but deleting a board stays with the
  // company
  member?: boolean;
  // A "My work" view at the top of the workspace, as on monday: every item on the company's boards that's theirs, and
  // anything else given to them (extra: the training and tests the company sent). Open first when given
  myWork?: { extra?: React.ReactNode; extraCount?: number };
  // More pages in the sidebar, under the boards (a team member's training, certificates and teams)
  extraNav?: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; count?: number; alert?: boolean; render: () => React.ReactNode }[];
  // Above the workspace's name: a way to switch company, for someone on several teams
  header?: React.ReactNode;
  // Not on a company's team yet: the workspace without boards (My work and the sidebar pages), with this message
  noBoards?: string;
}> = ({ business, me, people, projects, projectTasks, onSaveProject, onDeleteProject, onSaveTask, onDeleteTask, onInviteTeam, member, myWork, extraNav, header, noBoards }) => {
  const key = `vetter.teamBoard.${business.id}`;
  const [openId, setOpenIdState] = useState<string | null>(() => (myWork ? MY_WORK : store.get(key)));
  const [openTask, setOpenTask] = useState<{ projectId: string; taskId: string; n: number } | null>(null);
  const setOpenId = (id: string) => {
    setOpenIdState(id);
    store.set(key, id);
  };
  const [naming, setNaming] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [showStart, setShowStart] = useState(false);
  const crm = CRM_ORDER.map((k) => projects.find((p) => p.kind === k)).filter((p): p is Project => !!p);
  const others = projects.filter((p) => !crm.includes(p));
  const open = projects.find((p) => p.id === openId) ?? crm.find((p) => p.kind === 'deals') ?? projects[0];
  const onMyWork = !!myWork && openId === MY_WORK;
  const openExtra = extraNav?.find((x) => openId === `extra:${x.id}`);
  const mine = projectTasks.filter((t) => t.ownerUids.includes(me.uid) && projects.some((p) => p.id === t.projectId));
  const mineOpen = mine.filter((t) => t.status !== 'done');
  const term = q.trim().toLowerCase();
  const match = (p: Project) => !term || p.name.toLowerCase().includes(term);
  const openCount = (p: Project) => projectTasks.filter((t) => t.projectId === p.id && (p.kind && p.kind !== 'project' ? true : t.status !== 'done')).length;

  const create = (p: Project) => {
    onSaveProject(p);
    setOpenId(p.id);
    setNaming(null);
    setShowStart(false);
  };
  const makeCrm = () => {
    const boards = setupCrm(business.id);
    boards.forEach(onSaveProject);
    setOpenId(boards.find((b) => b.kind === 'leads')!.id);
    setShowStart(false);
  };

  const boardButton = (p: Project, i: number) => {
    const Icon = p.kind && CRM_ICON[p.kind] ? CRM_ICON[p.kind] : FolderKanban;
    const on = !onMyWork && !openExtra && open?.id === p.id;
    const n = openCount(p);
    return (
      <button
        key={p.id}
        onClick={() => setOpenId(p.id)}
        aria-current={on ? 'page' : undefined}
        className={`w-full h-9 px-2.5 rounded-lg flex items-center gap-2.5 text-sm text-left ${on ? 'bg-indigo-50 text-indigo-800 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-indigo-600' : p.kind && CRM_ICON[p.kind] ? 'text-slate-400' : GROUP_COLOURS[i % GROUP_COLOURS.length].text}`} />
        <span className="flex-1 truncate">{p.name}</span>
        {n > 0 && <span className="text-[11px] tabular-nums text-slate-400">{n}</span>}
      </button>
    );
  };

  // Where to start: the CRM in one click, or a project from a template
  const start = (
    <section className="p-6 rounded-2xl border border-slate-200 bg-white space-y-6">
      {crm.length === 0 && (
        <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex -space-x-2">
            {CRM_ORDER.map((k) => {
              const Icon = CRM_ICON[k];
              return (
                <span key={k} className="w-10 h-10 rounded-xl bg-white border border-indigo-100 shadow-xs flex items-center justify-center text-indigo-600">
                  <Icon className="w-5 h-5" />
                </span>
              );
            })}
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-slate-900">Set up your CRM</h2>
            <p className="text-sm text-slate-600">
              Leads, Contacts, Accounts and Deals boards, linked to each other: work leads, convert the good ones into a contact, account and deal, and move deals
              through your pipeline with values and a forecast.
            </p>
          </div>
          <button onClick={makeCrm} className="h-10 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shrink-0">
            Set up CRM
          </button>
        </div>
      )}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Start a project</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <button key={t.name} onClick={() => create(fromTemplate(business.id, t.name, t.groups))} className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left space-y-2">
              <span className="block text-sm font-bold text-slate-900">{t.name}</span>
              <span className="block text-xs text-slate-500">{t.blurb}</span>
              <span className="flex flex-wrap gap-1">
                {t.groups.map((g, i) => (
                  <span key={g} className={`px-1.5 py-px rounded text-[10px] font-semibold text-white ${GROUP_COLOURS[i % GROUP_COLOURS.length].strip}`}>
                    {g}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[232px_minmax(0,1fr)] gap-6 items-start">
      {/* The workspace: CRM boards, then projects */}
      <aside className="lg:sticky lg:top-6 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Workspace</h1>
          {header ?? <p className="text-xs text-slate-500">{business.name}</p>}
        </div>
        {!noBoards && <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search boards" aria-label="Search boards" className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>}
        <nav aria-label="Boards" className="space-y-4">
          {myWork && (
            <button
              onClick={() => setOpenIdState(MY_WORK)}
              aria-current={onMyWork ? 'page' : undefined}
              className={`w-full h-9 px-2.5 rounded-lg flex items-center gap-2.5 text-sm text-left ${onMyWork ? 'bg-indigo-50 text-indigo-800 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <ListTodo className={`w-4 h-4 shrink-0 ${onMyWork ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="flex-1 truncate">My work</span>
              {mineOpen.length + (myWork.extraCount ?? 0) > 0 && <span className="text-[11px] tabular-nums text-slate-400">{mineOpen.length + (myWork.extraCount ?? 0)}</span>}
            </button>
          )}
          {!noBoards && crm.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3 h-3" />
                CRM
              </div>
              {crm.filter(match).map(boardButton)}
            </div>
          )}
          {!noBoards && (<>
          <div className="space-y-0.5">
            <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FolderKanban className="w-3 h-3" />
              Projects
            </div>
            {others.filter(match).map(boardButton)}
            {naming === null ? (
              <button onClick={() => setNaming('')} className="w-full h-9 px-2.5 rounded-lg flex items-center gap-2.5 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <Plus className="w-4 h-4" />
                New project
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (naming.trim()) create({ ...newProject(business.id, naming.trim()), kind: 'project' });
                }}
                className="flex items-center gap-1"
              >
                <input
                  autoFocus
                  value={naming}
                  onChange={(e) => setNaming(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setNaming(null)}
                  placeholder="Project name"
                  aria-label="Project name"
                  className="flex-1 min-w-0 h-9 px-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="button" onClick={() => setNaming(null)} aria-label="Cancel" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
          <div className="pt-2 border-t border-slate-200 space-y-0.5">
            {crm.length === 0 && (
              <button onClick={makeCrm} className="w-full h-9 px-2.5 rounded-lg flex items-center gap-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
                <Handshake className="w-4 h-4" />
                Set up CRM
              </button>
            )}
            <button onClick={() => setShowStart((s) => !s)} className="w-full h-9 px-2.5 rounded-lg flex items-center gap-2.5 text-sm text-slate-600 hover:bg-slate-100">
              <FolderKanban className="w-4 h-4" />
              Templates
            </button>
            {people.length <= 1 && onInviteTeam && (
              <button onClick={onInviteTeam} className="w-full h-9 px-2.5 rounded-lg flex items-center gap-2.5 text-sm text-slate-600 hover:bg-slate-100">
                <Plus className="w-4 h-4" />
                Invite your team
              </button>
            )}
          </div>
          </>)}
          {/* A team member's own pages (training, certificates, teams), under the boards */}
          {extraNav && extraNav.length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-0.5">
              {extraNav.map((x) => {
                const on = openId === `extra:${x.id}`;
                return (
                  <button
                    key={x.id}
                    onClick={() => setOpenIdState(`extra:${x.id}`)}
                    aria-current={on ? 'page' : undefined}
                    className={`w-full h-9 px-2.5 rounded-lg flex items-center gap-2.5 text-sm text-left ${on ? 'bg-indigo-50 text-indigo-800 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <x.icon className={`w-4 h-4 shrink-0 ${on ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="flex-1 truncate">{x.label}</span>
                    {x.alert && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                    {!!x.count && <span className="text-[11px] tabular-nums text-slate-400">{x.count}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </nav>
      </aside>

      <main className="min-w-0">
        {onMyWork ? (
          noBoards ? (
            myWork?.extra
          ) : (
          <MyWork
            company={business.name}
            tasks={mine}
            projects={projects}
            people={people}
            onOpen={(t) => {
              setOpenId(t.projectId);
              setOpenTask((o) => ({ projectId: t.projectId, taskId: t.id, n: (o?.n ?? 0) + 1 }));
            }}
            onStatus={(t, status) => onSaveTask({ ...t, status, updatedAt: new Date().toISOString(), log: [...(t.log ?? []), { at: new Date().toISOString(), by: me.name, text: `set the status to ${TASK_STATUS[status].label}` }].slice(-50) })}
            extra={myWork?.extra}
          />
          )
        ) : openExtra ? (
          openExtra.render()
        ) : noBoards ? (
          <p className="p-6 rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500 text-center">{noBoards}</p>
        ) : projects.length === 0 || showStart || !open ? (
          start
        ) : (
          <ProjectBoard
            key={open.id}
            project={open}
            tasks={projectTasks.filter((t) => t.projectId === open.id)}
            people={people}
            me={me}
            boards={projects}
            allTasks={projectTasks}
            company={business.name}
            openTaskId={openTask?.projectId === open.id ? openTask.taskId : undefined}
            onOpenItem={(projectId, taskId) => {
              setOpenId(projectId);
              setOpenTask((o) => ({ projectId, taskId, n: (o?.n ?? 0) + 1 }));
            }}
            onSaveProject={onSaveProject}
            onDeleteProject={member ? undefined : () => onDeleteProject(open)}
            onSaveTask={onSaveTask}
            onDeleteTask={onDeleteTask}
          />
        )}
      </main>
    </div>
  );
};

const MY_WORK = '__my-work';

// monday's My work: every item on the company's boards that's theirs, open ones first by due date, each with its board
// and a status to change in place; then the training and tests the company sent (extra)
const MyWork: React.FC<{
  company: string;
  tasks: ProjectTask[];
  projects: Project[];
  people: BoardPerson[];
  onOpen: (t: ProjectTask) => void;
  onStatus: (t: ProjectTask, status: ProjectTask['status']) => void;
  extra?: React.ReactNode;
}> = ({ company, tasks, projects, people, onOpen, onStatus, extra }) => {
  const today = new Date().toISOString().slice(0, 10);
  const byDue = (a: ProjectTask, b: ProjectTask) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
  const sections: { title: string; list: ProjectTask[] }[] = [
    { title: 'Overdue', list: tasks.filter((t) => t.status !== 'done' && !!t.dueDate && t.dueDate < today).sort(byDue) },
    { title: 'To do', list: tasks.filter((t) => t.status !== 'done' && !(t.dueDate && t.dueDate < today)).sort(byDue) },
    { title: 'Done', list: tasks.filter((t) => t.status === 'done').slice(-10).reverse() },
  ].filter((x) => x.list.length);
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">My work</h2>
        <p className="text-sm text-slate-500">Everything that&rsquo;s yours on {company}&rsquo;s boards, kept in step with the boards: change it here or there.</p>
      </div>
      {sections.length === 0 ? (
        <p className="p-6 rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500 text-center">Nothing on the boards is yours yet. Items you&rsquo;re made owner of show here.</p>
      ) : (
        sections.map((sec) => (
          <section key={sec.title} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <h3 className={`px-4 py-2.5 text-sm font-bold border-b border-slate-100 ${sec.title === 'Overdue' ? 'text-rose-700' : 'text-slate-800'}`}>
              {sec.title} <span className="font-normal text-slate-400 tabular-nums">{sec.list.length}</span>
            </h3>
            <ul className="divide-y divide-slate-100">
              {sec.list.map((t) => {
                const board = projects.find((p) => p.id === t.projectId);
                const group = board?.groups.find((g) => g.id === t.groupId);
                const others = people.filter((p) => t.ownerUids.includes(p.uid) && !p.name.endsWith('(you)'));
                return (
                  <li key={t.id} className="px-4 py-2.5 flex flex-wrap items-center gap-3">
                    <button onClick={() => onOpen(t)} className="min-w-0 flex-1 text-left group">
                      <span className="block text-sm font-semibold text-slate-900 group-hover:text-indigo-700 truncate">{t.title}</span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        {board?.name ?? 'Board'}
                        {group ? ` · ${group.name}` : ''}
                        {others.length ? ` · with ${others.map((p) => p.name).join(', ')}` : ''}
                      </span>
                    </button>
                    {t.dueDate && <span className={`text-xs tabular-nums ${t.status !== 'done' && t.dueDate < today ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>{t.dueDate}</span>}
                    <select
                      value={t.status}
                      onChange={(e) => onStatus(t, e.target.value as ProjectTask['status'])}
                      aria-label={`Status of ${t.title}`}
                      className={`h-8 px-2 rounded-md text-xs font-semibold border-0 ${TASK_STATUS[t.status].cell}`}
                    >
                      {(Object.keys(TASK_STATUS) as ProjectTask['status'][]).map((st) => (
                        <option key={st} value={st} className="bg-white text-slate-900">
                          {TASK_STATUS[st].label}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
      {extra}
    </div>
  );
};
