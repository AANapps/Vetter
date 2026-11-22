import React, { useState } from 'react';
import { Briefcase, Building2, ContactRound, FolderKanban, Handshake, Magnet, Plus, Search, X } from 'lucide-react';
import { Business, Project, ProjectTask } from '../types';
import { BoardPerson, GROUP_COLOURS, ProjectBoard, newProject } from './ProjectBoard';
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
  // Someone on the company's team (Work mode): they work on the boards and their items, but making, setting up or
  // deleting boards stays with the company
  member?: boolean;
}> = ({ business, me, people, projects, projectTasks, onSaveProject, onDeleteProject, onSaveTask, onDeleteTask, onInviteTeam, member }) => {
  const key = `vetter.teamBoard.${business.id}`;
  const [openId, setOpenIdState] = useState<string | null>(() => store.get(key));
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
    const on = open?.id === p.id;
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
          <p className="text-xs text-slate-500">{business.name}</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search boards" aria-label="Search boards" className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <nav aria-label="Boards" className="space-y-4">
          {crm.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Briefcase className="w-3 h-3" />
                CRM
              </div>
              {crm.filter(match).map(boardButton)}
            </div>
          )}
          <div className="space-y-0.5">
            <div className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FolderKanban className="w-3 h-3" />
              Projects
            </div>
            {others.filter(match).map(boardButton)}
            {member ? null : naming === null ? (
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
          {!member && (
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
          )}
        </nav>
      </aside>

      <main className="min-w-0">
        {member && (projects.length === 0 || !open) ? (
          <section className="p-8 rounded-2xl border border-dashed border-slate-300 bg-white text-center space-y-1">
            <FolderKanban className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">No boards yet</p>
            <p className="text-sm text-slate-500">{business.name} hasn&rsquo;t set up any projects or CRM boards. They&rsquo;ll show here when it does.</p>
          </section>
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
