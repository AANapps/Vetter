import { Project, ProjectColumn, ProjectColumnType, ProjectTask } from '../types';
import { withLog } from './projectAutomations';

/**
 * The changes Ask AI suggests on the project and CRM boards (server/crmAssistant.ts), made only when the person presses
 * Apply. Everything is named as the person sees it (board, item, column, group and label names), so each name is
 * looked up here; whatever can't be found is skipped and said so. Applying returns an undo that puts every board and
 * item it touched back as it was.
 */

export interface CrmAction {
  op: 'add_item' | 'update_item' | 'delete_item' | 'add_column' | 'remove_column' | 'add_group' | 'remove_group' | 'add_label';
  board: string;
  item?: string;
  title?: string;
  group?: string;
  column?: string;
  columnType?: ProjectColumnType;
  values?: { column: string; value: string }[];
  owner?: string;
  due?: string;
  why: string;
}

interface Ctx {
  boards: Project[];
  tasks: ProjectTask[];
  people: { uid: string; name: string }[];
  // Who pressed Apply, for each item's activity
  by: string;
  current: Project;
  saveProject: (p: Project) => void;
  saveTask: (t: ProjectTask) => void;
  deleteTask: (t: ProjectTask) => void;
}

const id = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const norm = (s = '') => s.trim().toLowerCase().replace(/\s+/g, ' ');
const find = <T>(list: T[], name: string | undefined, nameOf: (x: T) => string) => {
  if (!name) return undefined;
  const n = norm(name);
  return list.find((x) => norm(nameOf(x)) === n) ?? list.find((x) => norm(nameOf(x)).includes(n) || n.includes(norm(nameOf(x))));
};

// What the action does, in a few words, for the list the person ticks
export function describeAction(a: CrmAction): string {
  const on = a.board ? ` on ${a.board}` : '';
  switch (a.op) {
    case 'add_item':
      return `Add "${a.title}"${a.group ? ` to ${a.group}` : ''}${on}${a.values?.length ? ` (${a.values.map((v) => `${v.column}: ${v.value}`).join(', ')})` : ''}`;
    case 'update_item': {
      const parts = [a.title && `rename to "${a.title}"`, a.group && `move to ${a.group}`, ...(a.values ?? []).map((v) => `${v.column}: ${v.value}`), a.owner && `owner ${a.owner}`, a.due && `due ${a.due}`].filter(Boolean);
      return `Change "${a.item}"${on}: ${parts.join(', ') || 'no change'}`;
    }
    case 'delete_item':
      return `Delete "${a.item}"${on}`;
    case 'add_column':
      return `Add a ${a.columnType ?? 'text'} column "${a.title}"${on}${a.values?.length ? ` (${a.values.map((v) => v.value).join(', ')})` : ''}`;
    case 'remove_column':
      return `Remove the "${a.column}" column${on}`;
    case 'add_group':
      return `Add a group "${a.title}"${on}`;
    case 'remove_group':
      return `Remove the "${a.group}" group${on}`;
    case 'add_label':
      return `Add the label "${a.title}" to ${a.column}${on}`;
  }
}

export function applyActions(actions: CrmAction[], ctx: Ctx): { done: number; skipped: string[]; undo: () => void } {
  // Working copies, so later actions see earlier ones (an item added then updated, a column added then filled)
  const boards = new Map(ctx.boards.map((b) => [b.id, b]));
  const tasks = new Map(ctx.tasks.map((t) => [t.id, t]));
  const beforeBoards = new Map(ctx.boards.map((b) => [b.id, b]));
  const beforeTasks = new Map(ctx.tasks.map((t) => [t.id, t]));
  const touchedBoards = new Set<string>();
  const touchedTasks = new Set<string>();
  const skipped: string[] = [];
  let done = 0;

  const boardOf = (name: string) => find([...boards.values()], name, (b) => b.name) ?? (name ? undefined : boards.get(ctx.current.id));
  const putBoard = (b: Project) => {
    boards.set(b.id, b);
    touchedBoards.add(b.id);
  };
  const putTask = (t: ProjectTask) => {
    tasks.set(t.id, t);
    touchedTasks.add(t.id);
  };
  const itemsOn = (b: Project) => [...tasks.values()].filter((t) => t.projectId === b.id);

  // A value as the column stores it; a label that isn't there yet is added
  const valueFor = (b: Project, col: ProjectColumn, raw: string): { board: Project; value: ProjectTask['values'] extends Record<string, infer V> | undefined ? V | undefined : never } => {
    const v = raw.trim();
    switch (col.type) {
      case 'number':
      case 'money': {
        const n = Number(v.replace(/[^\d.-]/g, ''));
        return { board: b, value: v && !isNaN(n) ? n : undefined };
      }
      case 'checkbox':
        return { board: b, value: /^(yes|true|ticked|checked|done|1)$/i.test(v) ? true : undefined };
      case 'label': {
        if (!v) return { board: b, value: undefined };
        const opt = find(col.options ?? [], v, (o) => o.label);
        if (opt) return { board: b, value: opt.id };
        const added = { id: id('opt'), label: v, colour: (col.options ?? []).length };
        const next = { ...b, columns: (b.columns ?? []).map((c) => (c.id === col.id ? { ...c, options: [...(c.options ?? []), added] } : c)) };
        return { board: next, value: added.id };
      }
      case 'people': {
        const p = find(ctx.people, v, (x) => x.name.replace(/ \(you\)$/, ''));
        return { board: b, value: p ? [p.uid] : undefined };
      }
      case 'connect': {
        const target = boards.get(col.boardId ?? '');
        const item = target ? find(itemsOn(target), v, (t) => t.title) : undefined;
        return { board: b, value: item ? [item.id] : undefined };
      }
      default:
        return { board: b, value: v || undefined };
    }
  };
  const withValues = (b: Project, t: ProjectTask, values: CrmAction['values']): { board: Project; task: ProjectTask; missing: string[] } => {
    let board = b;
    const next = { ...(t.values ?? {}) };
    const missing: string[] = [];
    for (const { column, value } of values ?? []) {
      const col = find(board.columns ?? [], column, (c) => c.title);
      if (!col || col.type === 'formula') {
        missing.push(column);
        continue;
      }
      const r = valueFor(board, col, value);
      board = r.board;
      if (r.value === undefined) delete next[col.id];
      else next[col.id] = r.value;
    }
    return { board, task: { ...t, values: next }, missing };
  };

  for (const a of actions) {
    const b = boardOf(a.board);
    if (!b) {
      skipped.push(`${describeAction(a)}: no board called ${a.board}`);
      continue;
    }
    const groupOf = (name?: string) => find(b.groups, name, (g) => g.name);
    switch (a.op) {
      case 'add_item': {
        if (!a.title?.trim()) {
          skipped.push(`${describeAction(a)}: no name`);
          break;
        }
        const g = groupOf(a.group) ?? b.groups[0];
        const owner = a.owner ? find(ctx.people, a.owner, (p) => p.name.replace(/ \(you\)$/, '')) : undefined;
        const base: ProjectTask = {
          id: id('task'),
          businessId: b.businessId,
          projectId: b.id,
          groupId: g.id,
          title: a.title.trim(),
          status: 'todo',
          ownerUids: owner ? [owner.uid] : [],
          ...(a.due && /^\d{4}-\d{2}-\d{2}$/.test(a.due) && { dueDate: a.due }),
          createdAt: new Date().toISOString(),
        };
        const r = withValues(b, base, a.values);
        if (r.board !== b) putBoard(r.board);
        putTask(withLog(r.task, ctx.by, 'created it with Ask AI'));
        done++;
        break;
      }
      case 'update_item':
      case 'delete_item': {
        const t = find(itemsOn(b), a.item, (x) => x.title);
        if (!t) {
          skipped.push(`${describeAction(a)}: no item called ${a.item}`);
          break;
        }
        if (a.op === 'delete_item') {
          tasks.delete(t.id);
          touchedTasks.add(t.id);
          done++;
          break;
        }
        const g = a.group ? groupOf(a.group) : undefined;
        const owner = a.owner ? find(ctx.people, a.owner, (p) => p.name.replace(/ \(you\)$/, '')) : undefined;
        const r = withValues(b, t, a.values);
        const next: ProjectTask = {
          ...r.task,
          ...(a.title?.trim() && { title: a.title.trim() }),
          ...(g && { groupId: g.id }),
          ...(owner && !t.ownerUids.includes(owner.uid) && { ownerUids: [...t.ownerUids, owner.uid] }),
          ...(a.due && /^\d{4}-\d{2}-\d{2}$/.test(a.due) && { dueDate: a.due }),
          updatedAt: new Date().toISOString(),
        };
        if (r.board !== b) putBoard(r.board);
        putTask(withLog(next, ctx.by, 'changed it with Ask AI'));
        if (r.missing.length) skipped.push(`${describeAction(a)}: no column called ${r.missing.join(', ')}`);
        done++;
        break;
      }
      case 'add_column': {
        const type = a.columnType ?? 'text';
        if (!a.title?.trim()) {
          skipped.push(`${describeAction(a)}: no name`);
          break;
        }
        if (find(b.columns ?? [], a.title, (c) => c.title)) {
          skipped.push(`${describeAction(a)}: there's one already`);
          break;
        }
        const col: ProjectColumn = {
          id: id('col'),
          title: a.title.trim(),
          type,
          ...(type === 'label' && { options: (a.values ?? []).map((v, i) => ({ id: id('opt'), label: v.value, colour: i })) }),
          ...(type === 'money' && { currency: '£' }),
        };
        putBoard({ ...b, columns: [...(b.columns ?? []), col] });
        done++;
        break;
      }
      case 'remove_column': {
        const col = find(b.columns ?? [], a.column, (c) => c.title);
        if (!col) {
          skipped.push(`${describeAction(a)}: no such column`);
          break;
        }
        putBoard({ ...b, columns: (b.columns ?? []).filter((c) => c.id !== col.id) });
        done++;
        break;
      }
      case 'add_group': {
        if (!a.title?.trim() || groupOf(a.title)) {
          skipped.push(`${describeAction(a)}: ${a.title ? 'there is one already' : 'no name'}`);
          break;
        }
        putBoard({ ...b, groups: [...b.groups, { id: id('grp'), name: a.title.trim(), colour: b.groups.length }] });
        done++;
        break;
      }
      case 'remove_group': {
        const g = groupOf(a.group);
        if (!g || b.groups.length < 2) {
          skipped.push(`${describeAction(a)}: ${g ? 'a board needs one group' : 'no such group'}`);
          break;
        }
        // Its items move to the first group left, so nothing is lost
        const rest = b.groups.filter((x) => x.id !== g.id);
        itemsOn(b)
          .filter((t) => t.groupId === g.id)
          .forEach((t) => putTask({ ...t, groupId: rest[0].id }));
        putBoard({ ...b, groups: rest });
        done++;
        break;
      }
      case 'add_label': {
        const col = find((b.columns ?? []).filter((c) => c.type === 'label'), a.column, (c) => c.title);
        if (!col || !a.title?.trim()) {
          skipped.push(`${describeAction(a)}: no label column called ${a.column}`);
          break;
        }
        if (!find(col.options ?? [], a.title, (o) => o.label)) putBoard({ ...b, columns: (b.columns ?? []).map((c) => (c.id === col.id ? { ...c, options: [...(c.options ?? []), { id: id('opt'), label: a.title!.trim(), colour: (c.options ?? []).length }] } : c)) });
        done++;
        break;
      }
    }
  }

  // Save what changed
  touchedBoards.forEach((bid) => ctx.saveProject(boards.get(bid)!));
  touchedTasks.forEach((tid) => {
    const now = tasks.get(tid);
    if (now) ctx.saveTask(now);
    else if (beforeTasks.get(tid)) ctx.deleteTask(beforeTasks.get(tid)!);
  });

  const undo = () => {
    touchedBoards.forEach((bid) => {
      const was = beforeBoards.get(bid);
      if (was) ctx.saveProject(was);
    });
    touchedTasks.forEach((tid) => {
      const was = beforeTasks.get(tid);
      const now = tasks.get(tid);
      if (was) ctx.saveTask(was);
      else if (now) ctx.deleteTask(now);
    });
  };
  return { done, skipped, undo };
}
