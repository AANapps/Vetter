import React from 'react';
import { Business, Project, ProjectTask, TeamMember } from '../types';
import { firebaseEnabled } from '../lib/firebase';
import { useMemberBoards } from '../lib/memberBoards';
import { ProjectsPage } from './ProjectsPage';
import { Users } from 'lucide-react';
import { BoardPerson } from './ProjectBoard';
import { WorkspaceTeam } from './WorkspaceTeam';

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
  local: { projects: Project[]; tasks: ProjectTask[]; team: TeamMember[]; saveProject: (p: Project) => void; saveTask: (t: ProjectTask) => void; deleteTask: (t: ProjectTask) => void };
  // The training and tests the company sent them, shown in My work under their board items
  myWork?: { extra?: React.ReactNode; extraCount?: number };
  extraNav?: React.ComponentProps<typeof ProjectsPage>['extraNav'];
  header?: React.ReactNode;
  // Under the company's team on its Team page: their own teams and invitations
  teamExtra?: React.ReactNode;
  teamAlert?: boolean;
}> = ({ business, me, personOf, local, myWork, extraNav, header, teamExtra, teamAlert }) => {
  const live = useMemberBoards(firebaseEnabled ? business.id : null);
  const src = firebaseEnabled
    ? live
    : {
        projects: local.projects.filter((p) => p.businessId === business.id),
        tasks: local.tasks.filter((t) => t.businessId === business.id),
        team: local.team.filter((m) => m.businessId === business.id && m.status === 'active'),
        error: null,
        saveProject: local.saveProject,
        saveTask: local.saveTask,
        deleteTask: local.deleteTask,
      };
  // Their teammates (everyone who's joined), then anyone else who owns an item (the company's own staff)
  const teammates = src.team.filter((m) => m.uid && m.uid !== me.uid).map((m) => ({ uid: m.uid!, name: personOf(m.uid!)?.name ?? m.name, pic: personOf(m.uid!)?.pic }));
  const known = new Set([me.uid, ...teammates.map((p) => p.uid)]);
  const others = [...new Set(src.tasks.flatMap((t) => t.ownerUids))].filter((u) => !known.has(u)).map((u) => personOf(u) ?? { uid: u, name: `Someone at ${business.name}` });
  const people = [{ ...me, name: `${me.name} (you)` }, ...teammates, ...others];
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
        myWork={myWork ?? {}}
        extraNav={[
          {
            id: 'team',
            label: 'Team',
            icon: Users,
            count: src.team.filter((m) => m.status === 'active').length,
            alert: teamAlert,
            render: () => <WorkspaceTeam company={business.name} me={me} team={src.team} personOf={personOf} extra={teamExtra} />,
          },
          ...(extraNav ?? []),
        ]}
        header={header}
      />
    </div>
  );
};
