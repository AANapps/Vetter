import { AssessmentTest, Question } from '../types';
import { DeskApp, DesktopConfig } from './desktop';

/**
 * Skills tests are worked on the same desktop as job simulations: each hands-on task (a spreadsheet, a database, code,
 * an app simulation) opens in its own app window on the desktop, beside Files (the test's files and anything the
 * candidate saves or exports), Mail (the test's emails) and the AI assistant where the company allows it. One desktop
 * for the whole test, so a CSV exported in one task is there in the next. The task's own work stays in its answer and
 * is marked as before; the desktop around it is kept apart (see TestRunner).
 *
 * Tasks written as desktop questions (a help desk, a CRM, Docs, BI, a board…) bring their own desktop, opened at their
 * first work app.
 */

export const TASK_TYPES: Question['type'][] = ['sheet', 'database', 'app', 'code', 'sql'];

// The app a task opens in: its id on the desktop, its name and the built-in app whose icon it shows
export function taskSlot(q: Question): { id: string; label: string; look: DeskApp } {
  switch (q.type) {
    case 'sheet':
      return { id: 'sheet', label: 'Spreadsheet', look: 'sheet' };
    case 'database':
      return { id: 'sql', label: 'Database', look: 'sql' };
    case 'code':
    case 'sql':
      return { id: 'code', label: q.type === 'sql' ? 'SQL editor' : 'Code editor', look: q.type === 'sql' ? 'sql' : 'code' };
    default:
      return { id: 'task-app', label: q.contextData || q.title, look: 'crm' };
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'company';

// The desktop a skills test's task is worked on
export function taskDesktop(test: AssessmentTest, q: Question, aiHere: boolean): DesktopConfig {
  const company = test.scenario?.company ?? test.companyName ?? 'Your company';
  const domain = `${slug(company)}.example`;
  const me = `you@${domain}`;
  const slot = taskSlot(q);
  const inbox = (test.scenario?.inbox ?? []).map((m, i) => ({ id: `scenario-${i}`, from: m.from, to: m.to.length ? m.to : [me], cc: m.cc, date: m.date, subject: m.subject, body: m.body }));
  return {
    user: { name: 'You', email: me, role: test.scenario?.role ?? 'Candidate' },
    company,
    time: 'Mon 09:00',
    apps: [slot.id, 'files', ...(inbox.length ? ['mail'] : []), ...(aiHere ? ['ai'] : [])],
    contacts: test.scenario?.people ?? [],
    inbox,
    files: test.scenario?.files ?? [],
  };
}

// A desktop question in a skills test opens at its first work app, not the inbox
export const firstWorkApp = (cfg: DesktopConfig) => cfg.apps.find((a) => !['mail', 'files', 'ai'].includes(a));
