import { Project, ProjectAutomation, ProjectTask, ProjectTaskPriority, ProjectTaskStatus } from '../types';

/**
 * A project's automations, as on monday.com: when a task changes in a certain way, change something else on it. They
 * run on every save of a task (and, for dates passing, when the board is opened), once each: an automation's change
 * never sets off another, so two rules can't bounce a task back and forth.
 */

export const STATUS_LABEL: Record<ProjectTaskStatus, string> = { todo: 'Not started', working: 'Working on it', stuck: 'Stuck', done: 'Done' };
export const PRIORITY_LABEL: Record<ProjectTaskPriority, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

const today = () => new Date().toISOString().slice(0, 10);
export const isLate = (t: ProjectTask) => t.status !== 'done' && !!t.dueDate && t.dueDate < today();

// Whether the automation's trigger happened between before and after
function fires(a: ProjectAutomation, before: ProjectTask | undefined, after: ProjectTask): boolean {
  if (a.off) return false;
  switch (a.when) {
    case 'status':
      return !!before && before.status !== after.status && (!a.status || after.status === a.status);
    case 'created':
      return !before && (!a.groupId || after.groupId === a.groupId);
    case 'assigned':
      return after.ownerUids.some((u) => !(before?.ownerUids ?? []).includes(u));
    case 'checked':
      return !!a.columnId && after.values?.[a.columnId] === true && before?.values?.[a.columnId] !== true;
    case 'overdue':
      return isLate(after);
  }
}

// The change the automation makes, or nothing when the task already looks like that
function act(a: ProjectAutomation, t: ProjectTask, project: Project): Partial<ProjectTask> | null {
  switch (a.then) {
    case 'move':
      return a.toGroupId && t.groupId !== a.toGroupId && project.groups.some((g) => g.id === a.toGroupId) ? { groupId: a.toGroupId } : null;
    case 'setStatus':
      return a.toStatus && t.status !== a.toStatus ? { status: a.toStatus } : null;
    case 'setPriority':
      return a.toPriority && t.priority !== a.toPriority ? { priority: a.toPriority } : null;
    case 'assign':
      return a.toUid && !t.ownerUids.includes(a.toUid) ? { ownerUids: [...t.ownerUids, a.toUid] } : null;
  }
}

// What the automation does, in a few words, for the task's activity
const didText = (a: ProjectAutomation, project: Project, names: Record<string, string>) =>
  a.then === 'move'
    ? `moved it to ${project.groups.find((g) => g.id === a.toGroupId)?.name ?? 'a group'}`
    : a.then === 'setStatus'
      ? `set status to ${STATUS_LABEL[a.toStatus!]}`
      : a.then === 'setPriority'
        ? `set priority to ${PRIORITY_LABEL[a.toPriority!]}`
        : `assigned ${names[a.toUid!] ?? 'someone'}`;

// The task after the project's automations have run on a change from before to after
export function runAutomations(project: Project, before: ProjectTask | undefined, after: ProjectTask, names: Record<string, string> = {}): ProjectTask {
  let next = after;
  const notes: string[] = [];
  for (const a of project.automations ?? []) {
    if (a.when === 'overdue' && before && isLate(before)) continue; // only as it passes, not on every later save
    if (!fires(a, before, after)) continue;
    const change = act(a, next, project);
    if (!change) continue;
    next = { ...next, ...change };
    notes.push(didText(a, project, names));
  }
  return notes.length ? withLog(next, 'Automation', notes.join(', ')) : next;
}

// Dates that have passed since the board was last open: the overdue automations, run once on each late task
export function overdueChanges(project: Project, tasks: ProjectTask[], names: Record<string, string> = {}): ProjectTask[] {
  const rules = (project.automations ?? []).filter((a) => a.when === 'overdue' && !a.off);
  if (!rules.length) return [];
  return tasks.flatMap((t) => {
    if (!isLate(t)) return [];
    let next = t;
    const notes: string[] = [];
    for (const a of rules) {
      const change = act(a, next, project);
      if (!change) continue;
      next = { ...next, ...change };
      notes.push(didText(a, project, names));
    }
    return notes.length ? [withLog({ ...next, updatedAt: new Date().toISOString() }, 'Automation', `Due date passed: ${notes.join(', ')}`)] : [];
  });
}

export const withLog = (t: ProjectTask, by: string, text: string): ProjectTask => ({
  ...t,
  log: [...(t.log ?? []), { at: new Date().toISOString(), by, text }].slice(-50),
});

// The automation as a sentence, as monday writes them
export function describeAutomation(a: ProjectAutomation, project: Project, names: Record<string, string> = {}): string {
  const col = project.columns?.find((c) => c.id === a.columnId);
  const when =
    a.when === 'status'
      ? a.status
        ? `When status changes to ${STATUS_LABEL[a.status]}`
        : 'When status changes'
      : a.when === 'created'
        ? a.groupId
          ? `When a task is created in ${project.groups.find((g) => g.id === a.groupId)?.name ?? 'a group'}`
          : 'When a task is created'
        : a.when === 'assigned'
          ? 'When someone is assigned'
          : a.when === 'overdue'
            ? 'When the due date passes and it isn’t done'
            : `When ${col?.title ?? 'a checkbox'} is checked`;
  const then = didText(a, project, names).replace(/^moved it/, 'move it').replace(/^assigned /, 'assign ');
  return `${when}, ${then}`;
}

// Ready-made automations offered with one click, like monday's recipes
export function recipes(project: Project): Omit<ProjectAutomation, 'id'>[] {
  const done = project.groups.find((g) => /complete|done|finished/i.test(g.name));
  const first = project.groups[0];
  return [
    ...(done ? [{ when: 'status' as const, status: 'done' as const, then: 'move' as const, toGroupId: done.id }] : []),
    ...(first && done && first.id !== done.id ? [{ when: 'status' as const, status: 'working' as const, then: 'move' as const, toGroupId: first.id }] : []),
    { when: 'overdue', then: 'setStatus', toStatus: 'stuck' },
    { when: 'assigned', then: 'setStatus', toStatus: 'working' },
    { when: 'status', status: 'stuck', then: 'setPriority', toPriority: 'high' },
  ];
}
