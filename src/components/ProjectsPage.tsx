import React, { useState } from 'react';
import { FolderKanban, Plus, X } from 'lucide-react';
import { Business, Project, ProjectTask } from '../types';
import { PageHeader } from './PageHeader';
import { BoardPerson, GROUP_COLOURS, ProjectBoard, newProject } from './ProjectBoard';

/**
 * Project Manager → Projects: the company's project boards, like monday.com's workspace. The boards are listed across
 * the top (the one opened last opens again), with New project beside them; with none yet, a few templates to start
 * from. The board itself is src/components/ProjectBoard.tsx.
 */

// Ready-made starts: a name and its groups
const TEMPLATES: { name: string; blurb: string; groups: string[] }[] = [
  { name: 'Team tasks', blurb: 'A simple to-do list for the team', groups: ['To do', 'Completed'] },
  { name: 'Project plan', blurb: 'Phases from planning to launch', groups: ['Planning', 'In progress', 'Review', 'Completed'] },
  { name: 'New starter onboarding', blurb: 'Everything for someone’s first weeks', groups: ['Before day one', 'First week', 'First month', 'Completed'] },
  { name: 'Hiring pipeline', blurb: 'Roles to fill, from brief to offer', groups: ['To brief', 'Interviewing', 'Offer', 'Completed'] },
];

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
  return { ...p, groups: made, automations: done ? [{ ...p.automations![0], toGroupId: done.id }] : [] };
};

export const ProjectsPage: React.FC<{
  business: Business;
  me: BoardPerson;
  // Everyone tasks can be given to: whoever is signed in, then the people on the team
  people: BoardPerson[];
  projects: Project[];
  projectTasks: ProjectTask[];
  onSaveProject: (project: Project) => void;
  onDeleteProject: (project: Project) => void;
  onSaveTask: (task: ProjectTask) => void;
  onDeleteTask: (task: ProjectTask) => void;
  onInviteTeam: () => void;
}> = ({ business, me, people, projects, projectTasks, onSaveProject, onDeleteProject, onSaveTask, onDeleteTask, onInviteTeam }) => {
  const key = `vetter.teamBoard.${business.id}`;
  const [openId, setOpenIdState] = useState<string | null>(() => store.get(key));
  const setOpenId = (id: string) => {
    setOpenIdState(id);
    store.set(key, id);
  };
  const [naming, setNaming] = useState<string | null>(null);
  const open = projects.find((p) => p.id === openId) ?? projects[0];

  const create = (p: Project) => {
    onSaveProject(p);
    setOpenId(p.id);
    setNaming(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Projects"
        sub="Plan and track your team's work: boards of tasks with owners, statuses, dates and automations."
        action={
          people.length <= 1 ? (
            <button onClick={onInviteTeam} className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Invite your team
            </button>
          ) : undefined
        }
      />

      {projects.length === 0 ? (
        // No projects yet: start from a template or a blank board
        <section className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Start your first project</h2>
              <p className="text-sm text-slate-500">Pick a template; you can rename anything, add columns, views and automations after.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        </section>
      ) : (
        <>
          {/* The boards, the one open highlighted, and New project */}
          <div className="flex flex-wrap items-center gap-2">
            {projects.map((p, i) => {
              const open = projectTasks.filter((t) => t.projectId === p.id && t.status !== 'done').length;
              const on = p.id === (projects.find((x) => x.id === openId) ?? projects[0]).id;
              return (
                <button
                  key={p.id}
                  onClick={() => setOpenId(p.id)}
                  aria-pressed={on}
                  className={`h-9 px-3 rounded-lg border text-sm font-semibold inline-flex items-center gap-2 ${on ? 'border-indigo-600 bg-indigo-50 text-indigo-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-sm ${GROUP_COLOURS[i % GROUP_COLOURS.length].strip}`} />
                  <span className="max-w-[180px] truncate">{p.name}</span>
                  {open > 0 && <span className="text-xs text-slate-400">{open}</span>}
                </button>
              );
            })}
            {naming === null ? (
              <button onClick={() => setNaming('')} className="h-9 px-3 rounded-lg border border-dashed border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                New project
              </button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (naming.trim()) create(newProject(business.id, naming.trim()));
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  autoFocus
                  value={naming}
                  onChange={(e) => setNaming(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setNaming(null)}
                  placeholder="Project name"
                  aria-label="Project name"
                  className="h-9 w-48 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button type="submit" disabled={!naming.trim()} className="h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                  Create
                </button>
                <button type="button" onClick={() => setNaming(null)} aria-label="Cancel" className="p-2 rounded-lg text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
          {open && (
            <ProjectBoard
              key={open.id}
              project={open}
              tasks={projectTasks.filter((t) => t.projectId === open.id)}
              people={people}
              me={me}
              onSaveProject={onSaveProject}
              onDeleteProject={() => onDeleteProject(open)}
              onSaveTask={onSaveTask}
              onDeleteTask={onDeleteTask}
            />
          )}
        </>
      )}
    </div>
  );
};
