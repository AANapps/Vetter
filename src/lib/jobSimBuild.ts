import { AssessmentTest, Business, SkillCategory, TEST_DIFFICULTIES, TestDifficulty } from '../types';
import { DeskBlock, DeskPage, DesktopConfig } from './desktop';
import { checkSheet, parseWorkbook, workbookStarter } from './spreadsheet';
import { JobSimCheck, JobSimPart, jobSimulation } from '../data/modules/jobSimKit';
import { categoriesFor, companySector } from './sectors';
import { matchesExpected, readPath } from './appSimulation';
import { withData } from './libraryApps';

/**
 * A job simulation written by Praxa's AI (server/writeJobSim.ts), turned into a test with jobSimulation(), so every
 * one a company makes in the chat has the shape of the Data Analyst's day at Ridgeway Coffee: 40 minutes on the
 * desktop in five timed parts, its data pre-loaded, two work apps, and checks numbered 2.1 … 5.x.
 *
 * The AI writes spreadsheet answers as formulas on the pre-loaded data, so the numbers are worked out here, never
 * trusted from the model. Then the day is checked: a check that can't be marked (an address nobody has, a page that
 * doesn't exist, a formula that errors, marks for nothing done) is a problem, sent back to the AI once to fix.
 */

type Rows = string[][];
interface RawFile {
  name: string;
  content: string;
}
interface RawMail {
  from: string;
  subject: string;
  body: string;
  attachments: RawFile[];
}
export interface RawJobSim {
  reply?: string;
  role: string;
  company: string;
  domain: string;
  day: string;
  description: string;
  category: string;
  skillsTested: string[];
  scenario: string;
  briefing: string;
  briefs: Record<JobSimPart, string>;
  user: { name: string; role: string };
  time: string;
  apps: string[];
  contacts: { name: string; role: string; email: string }[];
  workbookName: string;
  sheets: { name: string; rows: Rows }[];
  databaseName: string;
  tables: { name: string; columns: string[]; rows: Rows }[];
  homepage: string;
  pages: { url: string; site: string; title: string; blocks: { kind: string; text: string; url: string; columns: string[]; rows: Rows; file: RawFile }[] }[];
  files: RawFile[];
  project: { name: string; files: { name: string; content: string; readonly: boolean }[]; testFile: string; checks: { id: string; code: string }[] };
  inbox: (RawMail & { id: string; phase: string; to: string[]; cc: string[]; date: string })[];
  replies: { id: string; to: string; mustMention: string[][]; mustAttach: string; reply: RawMail; otherwise: RawMail }[];
  checks: { part: JobSimPart; description: string; input: string; expected: string; rubric: string[] }[];
  // Apps from Praxa's app library on the desktop, as the world asked for them, and software to build for the day
  libraryApps?: { id: string; label: string; brief: string }[];
  newApp?: { app: string; product: string; label: string; brief: string };
  // The apps as fitted to the day (added by the browser, not the AI): the library app, its version, its code with any
  // edits, and the day's data. The code isn't kept in the test's own copy of the day (it's in the desktop)
  customApps?: DayApp[];
}

export interface DayApp {
  id: string;
  label: string;
  envId: string;
  version: number;
  data: Record<string, unknown>;
  html?: string;
  // What the app saves, and what's planted in its data and how it's marked, for the script
  state?: string;
  planted?: string[];
}

const PARTS: JobSimPart[] = ['core', 'curveball', 'juggling', 'report'];
const lower = (s: string) => String(s ?? '').trim().toLowerCase();
// A cell as the AI wrote it: plain numbers become numbers, formulas and text stay as they are
const cell = (v: string): string | number | null => {
  const s = String(v ?? '');
  if (s === '') return null;
  return /^-?\d+(\.\d+)?$/.test(s.trim()) ? Number(s) : s;
};
const files = (list: RawFile[] = []) => list.filter((f) => f?.name?.trim()).map((f) => ({ name: f.name.trim(), content: String(f.content ?? '') }));
const slug = (s: string) => lower(s).replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'you';
// An address as written in "Name <address>", or the address itself
const addressOf = (s: string) => lower(/<([^>]+)>/.exec(s)?.[1] ?? s);

function block(b: RawJobSim['pages'][number]['blocks'][number]): DeskBlock | null {
  switch (b.kind) {
    case 'h1':
    case 'h2':
    case 'p':
    case 'note':
      return b.text?.trim() ? { kind: b.kind, text: b.text } : null;
    case 'link':
      return b.url?.trim() ? { kind: 'link', text: b.text || b.url, url: b.url.trim() } : null;
    case 'table':
      return b.columns?.length ? { kind: 'table', ...(b.text && { caption: b.text }), columns: b.columns, rows: (b.rows ?? []).map((r) => r.map((v) => cell(v) ?? '')) } : null;
    case 'download':
      return b.file?.name?.trim() ? { kind: 'download', text: b.text || b.file.name, file: { name: b.file.name.trim(), content: String(b.file.content ?? '') } } : null;
    default:
      return null;
  }
}

// The desktop as the AI described it
function desktopOf(raw: RawJobSim): Omit<DesktopConfig, 'phases'> {
  const domain = lower(raw.domain).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '') || 'company.co.uk';
  const me = `${slug(raw.user?.name)}@${domain}`;
  const custom = (raw.customApps ?? []).filter((a) => a.id && a.html);
  const work = [...new Set([...custom.map((a) => a.id), ...(raw.apps ?? []).filter((a) => ['sheet', 'browser', 'sql', 'code'].includes(a))])];
  const sheets = (raw.sheets ?? []).filter((s) => s.name?.trim() && s.rows?.length);
  const tables = (raw.tables ?? []).filter((t) => t.name?.trim() && t.columns?.length);
  const pages: DeskPage[] = (raw.pages ?? []).filter((p) => p.url?.trim()).map((p) => ({ url: p.url.trim(), site: p.site || raw.company, title: p.title || p.url, blocks: (p.blocks ?? []).map(block).filter((b): b is DeskBlock => !!b) }));
  const project = raw.project?.files?.length ? { name: raw.project.name || 'project', files: raw.project.files.map((f) => ({ name: f.name, content: f.content, ...(f.readonly && { readonly: true }) })), testFile: raw.project.testFile, checks: raw.project.checks ?? [] } : undefined;
  const mail = (m: RawMail) => ({ from: m.from, subject: m.subject, body: m.body, ...(files(m.attachments).length && { attachments: files(m.attachments) }) });
  return {
    user: { name: raw.user?.name || 'You', email: me, role: raw.user?.role || raw.role },
    company: raw.company,
    time: raw.time || 'Mon 09:00',
    apps: ['mail', ...work, 'files', 'ai'],
    ...(custom.length && { customApps: custom.map((a) => ({ id: a.id, label: a.label || a.id, html: withData(a.html!, a.data), ...(a.envId && a.version > 0 && { libraryApp: { id: a.envId, version: a.version } }) })) }),
    contacts: (raw.contacts ?? []).filter((c) => c.email?.trim()).map((c) => ({ name: c.name, role: c.role, email: lower(c.email) })),
    inbox: (raw.inbox ?? []).map((m, i) => ({
      id: m.id?.trim() || `m-${i + 1}`,
      ...mail(m),
      to: (m.to?.length ? m.to : [me]).map(addressOf),
      ...(m.cc?.length && { cc: m.cc.map(addressOf) }),
      date: m.date || raw.time,
      ...(m.phase && { phase: m.phase }),
    })),
    replies: (raw.replies ?? []).map((r) => ({
      id: r.id,
      to: addressOf(r.to),
      ...(r.mustMention?.filter((g) => g.length).length && { mustMention: r.mustMention.filter((g) => g.length) }),
      ...(r.mustAttach?.trim() && { mustAttach: r.mustAttach.trim() }),
      reply: mail(r.reply),
      ...(r.otherwise?.body?.trim() && { otherwise: mail(r.otherwise) }),
    })),
    ...(pages.length && { pages, homepage: raw.homepage?.trim() || pages[0].url }),
    ...(files(raw.files).length && { files: files(raw.files) }),
    ...(sheets.length && { workbook: workbookStarter(sheets.map((s) => ({ name: s.name.trim(), rows: s.rows.map((r) => r.map(cell)) }))), workbookName: raw.workbookName || 'workbook.xlsx' }),
    ...(tables.length && {
      tables: tables.map((t) => ({ name: t.name.trim(), columns: t.columns, rows: (t.rows ?? []).map((r) => Object.fromEntries(t.columns.map((c, i) => [c, cell(r[i] ?? '')]))) })),
      databaseName: raw.databaseName || 'company.db',
    }),
    ...(project && { project }),
  };
}

export interface AssembledJobSim {
  test?: AssessmentTest;
  // What's wrong with the day as written, for the AI to fix
  problems: string[];
}

// The AI's day as a test, with what's wrong with it. With lenient, checks that can't be marked are left out rather
// than reported, so a day that's otherwise sound is still made
// initial: each app's state as it starts (tried in a hidden frame), so a check that passes before any work is found
export function assembleJobSim(raw: RawJobSim, business?: Business, lenient = false, initial: Record<string, Record<string, unknown>> = {}): AssembledJobSim {
  const problems: string[] = [];
  if (!raw || typeof raw !== 'object') return { problems: ['Nothing came back.'] };
  const desktop = desktopOf(raw);
  const work = desktop.apps.filter((a) => !['mail', 'files', 'ai'].includes(a));
  if (!work.length) problems.push('The desktop has no work app: pick two of sheet, browser, sql and code (or a library app).');
  if (work.includes('sheet') && !desktop.workbook) problems.push('apps has sheet but the workbook has no sheets.');
  if (work.includes('browser') && !desktop.pages?.length) problems.push('apps has browser but there are no pages.');
  if (work.includes('sql') && !desktop.tables?.length) problems.push('apps has sql but there are no tables.');
  if (work.includes('code') && !desktop.project) problems.push('apps has code but the project has no files.');

  const people = new Set([desktop.user.email, ...desktop.contacts.map((c) => c.email)]);
  for (const m of desktop.inbox) {
    const from = addressOf(m.from);
    if (!people.has(from)) problems.push(`Email ${m.id} is from ${from}, who isn't in contacts.`);
  }
  const wb = desktop.workbook ? parseWorkbook(desktop.workbook) : undefined;
  const pageUrls = new Set((desktop.pages ?? []).map((p) => lower(p.url)));
  const projectChecks = new Set((desktop.project?.checks ?? []).map((c) => c.id));
  const replyIds = new Set((desktop.replies ?? []).map((r) => r.id));

  const checks: JobSimCheck[] = [];
  for (const [i, c] of (raw.checks ?? []).entries()) {
    const name = `Check ${i + 1} ("${c.description}", ${c.input})`;
    const input = String(c.input ?? '').trim();
    const at = input.indexOf(':');
    const kind = input.slice(0, at);
    const rest = input.slice(at + 1);
    const rubric = (c.rubric ?? []).map((r) => r.trim()).filter(Boolean);
    let problem = '';
    let expected: JobSimCheck[3] = String(c.expected ?? '').trim();
    if (!PARTS.includes(c.part)) problem = `${name} is in an unknown part.`;
    else if (['mail', 'mailwith', 'firstmail', 'earned'].includes(kind)) {
      if (!rubric.length) problem = `${name} reads an email but has no rubric.`;
      expected = { rubric };
    } else if (rubric.length) problem = `${name} has a rubric but isn't an email check (mail: or mailwith:).`;
    if (!problem)
      switch (kind) {
        case 'sheet': {
          if (!wb) {
            problem = `${name} checks the spreadsheet, but there's no workbook.`;
            break;
          }
          const want = String(expected);
          if (want.startsWith('=')) {
            const worked = checkSheet(wb, want, '').actual;
            if (!worked || worked.startsWith('#')) {
              problem = `${name}: its expected formula ${want} gives ${worked || 'nothing'} on the workbook as given.`;
              break;
            }
            expected = worked;
          }
          if (!String(expected)) problem = `${name} has no expected value.`;
          else if (checkSheet(wb, rest, String(expected)).passed) problem = `${name} already passes on the workbook as given, before the candidate does anything.`;
          break;
        }
        case 'sent':
        case 'attached':
        case 'mail':
        case 'mailwith':
        case 'firstmail':
        case 'mailcount': {
          const addr = lower(rest.split(':')[0]);
          if (!people.has(addr) || addr === desktop.user.email) problem = `${name} is about ${addr}, who isn't one of the contacts.`;
          if (kind === 'sent' || kind === 'attached') expected = 'true';
          break;
        }
        case 'visited':
          if (!pageUrls.has(lower(rest))) problem = `${name} is about a page that isn't in pages.`;
          expected = 'true';
          break;
        case 'received':
        case 'earned':
          if (!replyIds.has(rest)) problem = `${name} is about a reply rule that doesn't exist.`;
          if (kind === 'received') expected = 'true';
          break;
        case 'test':
          if (!projectChecks.has(rest)) problem = `${name} is about a project check that doesn't exist.`;
          expected = 'passes';
          break;
        case 'app': {
          const [id, ...path] = rest.split(':');
          const want = String(expected);
          if (!desktop.customApps?.some((a) => a.id === id)) problem = `${name} is about an app (${id}) that isn't on the desktop.`;
          else if (!path.join(':').trim()) problem = `${name} has no state path after the app's id.`;
          else if (!want) problem = `${name} has no expected value.`;
          else if (initial[id] && matchesExpected(readPath(initial[id], path.join(':')), want)) problem = `${name} already passes when the app opens, before the candidate does anything.`;
          break;
        }
        default:
          problem = `${name} isn't a kind of check Praxa can mark.`;
      }
    if (problem) {
      if (!lenient) problems.push(problem);
      continue;
    }
    checks.push([c.part, c.description, input, expected]);
  }
  for (const part of PARTS) if (!checks.some((c) => c[0] === part)) problems.push(`Nothing is marked in the ${part} part.`);
  if (!checks.some((c) => c[0] === 'report' && typeof c[3] !== 'string')) problems.push('The report back has no rubric-marked email to the manager.');

  const category = (categoriesFor(companySector(business)) as string[]).includes(raw.category) ? (raw.category as SkillCategory) : categoriesFor(companySector(business))[0] ?? ('Consulting' as SkillCategory);
  let test: AssessmentTest | undefined;
  try {
    const stamp = Date.now().toString(36);
    test = jobSimulation({
      testId: '',
      questionId: `q-${stamp}-desk0`,
      role: raw.role || desktop.user.role,
      company: raw.company || business?.name || 'the company',
      day: raw.day || `A day at ${raw.company}`,
      description: raw.description,
      skillsTested: (raw.skillsTested ?? []).slice(0, 8),
      roles: [],
      category,
      scenario: raw.scenario,
      briefing: raw.briefing,
      briefs: raw.briefs,
      desktop,
      checks,
    });
  } catch (err) {
    problems.push(String((err as Error).message ?? err).replace(/^: /, ''));
  }
  if (problems.length && !lenient) return { problems };
  return { test, problems };
}

// The job simulation as the company owns it: its company, level and the AI's own copy, kept so a change asked for later
// rewrites the day from it
export function finishJobSim(test: AssessmentTest, raw: RawJobSim, business: Business | undefined, level?: TestDifficulty, difficulty?: string): AssessmentTest {
  return {
    ...test,
    id: '',
    type: business ? 'custom' : 'standard',
    ...(business && { businessId: business.id, companyName: business.name }),
    difficulty: level ?? (TEST_DIFFICULTIES.includes(difficulty as TestDifficulty) ? (difficulty as TestDifficulty) : 'Professional'),
    madeWith: 'ai',
    // The day as the AI wrote it, without the apps' code (that's in the desktop)
    jobSimSource: JSON.stringify({ ...raw, ...(raw.customApps && { customApps: raw.customApps.map(({ html: _html, ...a }) => a) }) }),
  };
}

// Whether a test is a job simulation written this way (one desktop day), so a change to it rewrites the day
export const isJobSimDraft = (test?: AssessmentTest) => !!test && test.questions.length === 1 && test.questions[0].type === 'desktop' && !!test.questions[0].desktop?.phases?.length;
