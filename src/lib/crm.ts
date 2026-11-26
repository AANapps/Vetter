import { Project, ProjectColumn, ProjectGroup, ProjectTask } from '../types';
import { STATUS_LABEL, PRIORITY_LABEL, withLog } from './projectAutomations';
import { FormulaContext, formulaResult, showFormula } from './boardFormula';

/**
 * Corprax's CRM, built the way monday CRM is: linked boards. Leads come in and are worked; a qualified lead is converted
 * into a contact, its company's account and a deal, all linked to each other; deals move through a pipeline of stages
 * with a value, a close probability and the forecast worked out from them. Calls, emails, meetings and notes are
 * logged on any item.
 */

const id = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const opts = (labels: string[], colours: number[]) => labels.map((label, i) => ({ id: label.toLowerCase().replace(/[^a-z]+/g, '-'), label, colour: colours[i] ?? i }));
const groups = (names: string[]): ProjectGroup[] => names.map((name, i) => ({ id: `g-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`, name, colour: i }));

// The four boards, linked: each connect column points at another board by id
export function setupCrm(businessId: string, currency = '£'): Project[] {
  const now = new Date().toISOString();
  const ids = { leads: id('crm-leads'), contacts: id('crm-contacts'), accounts: id('crm-accounts'), deals: id('crm-deals') };
  const base = (key: keyof typeof ids, name: string, itemName: string, g: ProjectGroup[], columns: ProjectColumn[], extra: Partial<Project> = {}): Project => ({
    id: ids[key],
    businessId,
    name,
    kind: key,
    itemName,
    groups: g,
    columns,
    hidden: key === 'leads' ? ['status', 'priority', 'timeline'] : ['status', 'priority', 'timeline', 'due'],
    views: [{ id: 'main', name: 'Main table', type: 'table' }],
    automations: [],
    createdAt: now,
    ...extra,
  });

  const leadGroups = groups(['New leads', 'Working on it', 'Qualified', 'Unqualified']);
  const leads = base(
    'leads',
    'Leads',
    'Lead',
    leadGroups,
    [
      { id: 'status', title: 'Lead status', type: 'label', options: opts(['New', 'Contacted', 'Qualified', 'Unqualified'], [3, 1, 0, 2]) },
      { id: 'company', title: 'Company', type: 'text' },
      { id: 'title', title: 'Job title', type: 'text' },
      { id: 'email', title: 'Email', type: 'email' },
      { id: 'phone', title: 'Phone', type: 'phone' },
      { id: 'source', title: 'Source', type: 'label', options: opts(['Website', 'Referral', 'Event', 'LinkedIn', 'Cold outreach'], [3, 0, 4, 6, 7]) },
    ],
    {
      views: [
        { id: 'main', name: 'Main table', type: 'table' },
        { id: 'board', name: 'By status', type: 'kanban', by: 'status' },
        { id: 'sources', name: 'Sources', type: 'chart', by: 'source' },
      ],
      automations: [
        { id: id('auto'), when: 'label', columnId: 'status', optionId: 'contacted', then: 'move', toGroupId: leadGroups[1].id },
        { id: id('auto'), when: 'label', columnId: 'status', optionId: 'qualified', then: 'move', toGroupId: leadGroups[2].id },
        { id: id('auto'), when: 'label', columnId: 'status', optionId: 'unqualified', then: 'move', toGroupId: leadGroups[3].id },
        { id: id('auto'), when: 'created', then: 'setLabel', toColumnId: 'status', toOptionId: 'new' },
      ],
    }
  );

  const contacts = base('contacts', 'Contacts', 'Contact', groups(['Contacts']), [
    { id: 'title', title: 'Job title', type: 'text' },
    { id: 'email', title: 'Email', type: 'email' },
    { id: 'phone', title: 'Phone', type: 'phone' },
    { id: 'account', title: 'Account', type: 'connect', boardId: ids.accounts },
    { id: 'deals', title: 'Deals', type: 'connect', boardId: ids.deals },
    { id: 'type', title: 'Type', type: 'label', options: opts(['Prospect', 'Customer', 'Partner'], [3, 0, 4]) },
  ]);

  const accounts = base('accounts', 'Accounts', 'Account', groups(['Accounts']), [
    { id: 'industry', title: 'Industry', type: 'label', options: opts(['Technology', 'Finance', 'Healthcare', 'Retail', 'Other'], [3, 4, 0, 1, 7]) },
    { id: 'website', title: 'Website', type: 'link' },
    { id: 'employees', title: 'Employees', type: 'number' },
    { id: 'contacts', title: 'Contacts', type: 'connect', boardId: ids.contacts },
    { id: 'deals', title: 'Deals', type: 'connect', boardId: ids.deals },
  ]);

  const dealGroups = groups(['Active deals', 'Won', 'Lost']);
  const deals = base(
    'deals',
    'Deals',
    'Deal',
    dealGroups,
    [
      { id: 'stage', title: 'Stage', type: 'label', options: opts(['New', 'Discovery', 'Proposal', 'Negotiation', 'Won', 'Lost'], [7, 3, 4, 1, 0, 2]) },
      { id: 'value', title: 'Deal value', type: 'money', currency },
      { id: 'probability', title: 'Close probability', type: 'number' },
      { id: 'forecast', title: 'Forecast value', type: 'formula', formula: '{Deal value} * {Close probability} / 100', currency },
      { id: 'close', title: 'Expected close', type: 'date' },
      { id: 'account', title: 'Account', type: 'connect', boardId: ids.accounts },
      { id: 'contacts', title: 'Contacts', type: 'connect', boardId: ids.contacts },
    ],
    {
      views: [
        { id: 'main', name: 'Main table', type: 'table' },
        { id: 'pipeline', name: 'Pipeline', type: 'kanban', by: 'stage', measure: 'value' },
        { id: 'forecast', name: 'Forecast', type: 'chart', by: 'stage', measure: 'forecast' },
      ],
      automations: [
        { id: id('auto'), when: 'created', then: 'setLabel', toColumnId: 'stage', toOptionId: 'new' },
        { id: id('auto'), when: 'label', columnId: 'stage', optionId: 'won', then: 'move', toGroupId: dealGroups[1].id },
        { id: id('auto'), when: 'label', columnId: 'stage', optionId: 'lost', then: 'move', toGroupId: dealGroups[2].id },
        { id: id('auto'), when: 'label', columnId: 'stage', optionId: 'negotiation', then: 'move', toGroupId: dealGroups[0].id },
      ],
    }
  );
  return [leads, contacts, accounts, deals];
}

// A column's value as a number, for sums and formulas
export const numberOf = (t: ProjectTask, col: ProjectColumn, columns: ProjectColumn[]): number | undefined => {
  if (col.type === 'formula') return evalFormula(col.formula ?? '', t, columns);
  const v = t.values?.[col.id];
  return typeof v === 'number' ? v : undefined;
};

// A formula column's number on an item (for sums, totals and charts); text and yes/no results aren't numbers.
// The formula language is in boardFormula.ts
export function evalFormula(formula: string, t: ProjectTask, columns: ProjectColumn[], ctx: Omit<FormulaContext, 'columns'> = {}): number | undefined {
  const r = formulaResult(formula, t, { ...ctx, columns });
  return typeof r.value === 'number' ? Math.round(r.value * 100) / 100 : undefined;
}

export const money = (n: number | undefined, currency = '') => (n === undefined ? '' : `${currency}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);

// A qualified lead becomes a contact, its company's account (one already there with that name is reused) and a deal,
// all linked; the lead is marked Qualified
export function convertLead(
  lead: ProjectTask,
  boards: Project[],
  tasks: ProjectTask[],
  by: string
): { saves: ProjectTask[]; dealId?: string } | null {
  const contacts = boards.find((b) => b.kind === 'contacts');
  const accounts = boards.find((b) => b.kind === 'accounts');
  const deals = boards.find((b) => b.kind === 'deals');
  if (!contacts || !deals) return null;
  const now = new Date().toISOString();
  const v = lead.values ?? {};
  const company = typeof v.company === 'string' ? v.company.trim() : '';
  const item = (board: Project, title: string, values: ProjectTask['values']): ProjectTask =>
    withLog({ id: id('task'), businessId: board.businessId, projectId: board.id, groupId: board.groups[0].id, title, status: 'todo', ownerUids: lead.ownerUids, values, createdAt: now }, by, `converted from the lead ${lead.title}`);

  const existing = accounts && company ? tasks.find((t) => t.projectId === accounts.id && t.title.trim().toLowerCase() === company.toLowerCase()) : undefined;
  const account = accounts && company ? existing ?? item(accounts, company, {}) : undefined;
  const contact = item(contacts, lead.title, { ...(v.email && { email: v.email }), ...(v.phone && { phone: v.phone }), ...(v.title && { title: v.title }), type: 'prospect' });
  const deal = item(deals, `${company || lead.title} deal`, { stage: 'new', probability: 10 });
  // Link them every way
  if (account) contact.values = { ...contact.values, account: [account.id] };
  contact.values = { ...contact.values, deals: [deal.id] };
  deal.values = { ...deal.values, contacts: [contact.id], ...(account && { account: [account.id] }) };
  const linkedAccount = account
    ? {
        ...account,
        values: {
          ...account.values,
          contacts: [...((account.values?.contacts as string[]) ?? []), contact.id],
          deals: [...((account.values?.deals as string[]) ?? []), deal.id],
        },
      }
    : undefined;
  const leadsBoard = boards.find((b) => b.id === lead.projectId);
  const qualifiedGroup = leadsBoard?.groups.find((g) => /qualified/i.test(g.name) && !/un/i.test(g.name));
  const doneLead = withLog({ ...lead, values: { ...v, status: 'qualified' }, ...(qualifiedGroup && { groupId: qualifiedGroup.id }), updatedAt: now }, by, `converted it into a contact${account ? ', an account' : ''} and a deal`);
  return { saves: [doneLead, contact, ...(linkedAccount ? [linkedAccount] : []), deal], dealId: deal.id };
}

// The board as plain text for the AI: its set-up, then its items with every value spelled out
export function boardForAi(project: Project, tasks: ProjectTask[], allTasks: ProjectTask[], names: Record<string, string>): string {
  const cols = project.columns ?? [];
  const value = (t: ProjectTask, c: ProjectColumn) => {
    if (c.type === 'formula') return showFormula(formulaResult(c.formula ?? '', t, { columns: cols, names, allTasks }), c.currency);
    const v = t.values?.[c.id];
    if (v === undefined) return '';
    if (c.type === 'label') return c.options?.find((o) => o.id === v)?.label ?? '';
    if (c.type === 'connect') return (v as string[]).map((i) => allTasks.find((x) => x.id === i)?.title ?? '').filter(Boolean).join(', ');
    if (c.type === 'people') return (v as string[]).map((u) => names[u] ?? 'someone').join(', ');
    if (c.type === 'money') return money(v as number, c.currency);
    if (c.type === 'checkbox') return v ? 'yes' : '';
    return String(v);
  };
  const lines = tasks.slice(0, 150).map((t) => {
    const parts = [
      `group: ${project.groups.find((g) => g.id === t.groupId)?.name ?? ''}`,
      ...(!(project.hidden ?? []).includes('status') ? [`status: ${STATUS_LABEL[t.status]}`] : []),
      ...(t.priority ? [`priority: ${PRIORITY_LABEL[t.priority]}`] : []),
      ...(t.ownerUids.length ? [`owner: ${t.ownerUids.map((u) => names[u] ?? 'someone').join(', ')}`] : []),
      ...(t.dueDate ? [`due: ${t.dueDate}`] : []),
      ...cols.map((c) => [c.title, value(t, c)] as const).filter(([, x]) => x).map(([k, x]) => `${k}: ${x}`),
      ...(t.activities?.length ? [`last activity: ${t.activities.at(-1)!.type} on ${t.activities.at(-1)!.at.slice(0, 10)}`] : []),
    ];
    return `- ${t.title} (${parts.join('; ')})`;
  });
  return [
    `Board: ${project.name} (${project.kind ?? 'project'} board; items are called ${project.itemName ?? 'Task'})`,
    `Groups: ${project.groups.map((g) => g.name).join(', ')}`,
    `Columns: ${cols.map((c) => `${c.title} (${c.type}${c.options ? `: ${c.options.map((o) => o.label).join('/')}` : ''}${c.formula ? ` = ${c.formula}` : ''})`).join(', ') || 'none added'}`,
    `Automations: ${(project.automations ?? []).filter((a) => !a.off).length} on`,
    `Items (${tasks.length}${tasks.length > 150 ? ', first 150 shown' : ''}):`,
    ...lines,
  ].join('\n');
}
