import React from 'react';
import { Business, Project, ProjectTask } from '../types';
import { firebaseEnabled } from '../lib/firebase';
import { useMemberBoards } from '../lib/memberBoards';
import { ProjectsPage } from './ProjectsPage';
import { BoardPerson } from './ProjectBoard';

/**
 * A company's projects and CRM, monday-style, for someone on its team (candidate Work mode): the same boards the company
 * works in. With accounts they're loaded live for the company (useMemberBoards); in the demo they come from the app's
 * own state, passed in.
 */
export const MemberBoards: React.FC<{
  business: Business;
  me: BoardPerson;
  // Who's who on the boards: a team member can't list the company's team, so the people are whoever owns an item (and
  // them), named from their public profiles
  personOf: (uid: string) => BoardPerson | undefined;
  // The demo's boards and how it saves them (unused with accounts)
  local: { projects: Project[]; tasks: ProjectTask[]; saveProject: (p: Project) => void; saveTask: (t: ProjectTask) => void; deleteTask: (t: ProjectTask) => void };
}> = ({ business, me, personOf, local }) => {
  const live = useMemberBoards(firebaseEnabled ? business.id : null);
  const src = firebaseEnabled
    ? live
    : { projects: local.projects.filter((p) => p.businessId === business.id), tasks: local.tasks.filter((t) => t.businessId === business.id), error: null, saveProject: local.saveProject, saveTask: local.saveTask, deleteTask: local.deleteTask };
  const uids = [...new Set(src.tasks.flatMap((t) => t.ownerUids))].filter((u) => u !== me.uid);
  const people = [{ ...me, name: `${me.name} (you)` }, ...uids.map((u) => personOf(u) ?? { uid: u, name: 'Someone on the team' })];
  return (
    <div className="space-y-3">
      {src.error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          Couldn&rsquo;t load or save {business.name}&rsquo;s boards: {src.error}
        </p>
      )}
      <ProjectsPage
        business={business}
        me={me}
        people={people}
        projects={src.projects}
        projectTasks={src.tasks}
        onSaveProject={src.saveProject}
        onDeleteProject={() => {}}
        onSaveTask={src.saveTask}
        onDeleteTask={src.deleteTask}
        member
      />
    </div>
  );
};
