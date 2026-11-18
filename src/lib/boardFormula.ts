import { ProjectColumn, ProjectTask } from '../types';
import { PRIORITY_LABEL, STATUS_LABEL } from './projectAutomations';

/**
 * Formula columns on project and CRM boards, as monday's: {Column name} reads that column on the same item, with
 * numbers, "text", + - * / ^, & to join text, comparisons (= <> < > <= >=) and functions such as IF, SUM, ROUND,
 * DAYS, TODAY, CONCATENATE. Parsed and worked out here (nothing is run as code), so any formula, even one the AI wrote,
 * is safe. A formula that can't be read gives an error message the editor shows.
 *
 * Values: number and money columns are numbers; dates are 'YYYY-MM-DD' text (date functions read them); labels give
 * the label's name; checkboxes TRUE or FALSE; people their names; connect columns the linked items' names. Built-in
 * fields can be named too: {Name}, {Status}, {Priority}, {Owner}, {Start date}, {Due date}, {Created}.
 */

export type FValue = number | string | boolean | null;

export interface FormulaContext {
  columns: ProjectColumn[];
  // People's names by account, for {Owner} and people columns
  names?: Record<string, string>;
  // Every item on every board, for connect columns
  allTasks?: ProjectTask[];
  // Today, for TODAY() and tests; defaults to now
  today?: Date;
}

type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'bool'; v: boolean }
  | { k: 'ref'; name: string }
  | { k: 'neg'; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'call'; fn: string; args: Node[] };

class FormulaError extends Error {}

// ---- Reading a formula

type Tok = { t: 'num' | 'str' | 'ref' | 'name' | 'op' | '(' | ')' | ','; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
    } else if (/[\d.]/.test(c)) {
      const m = /^\d*\.?\d+(e[+-]?\d+)?|^\d+\.?/i.exec(src.slice(i))!;
      out.push({ t: 'num', v: m[0] });
      i += m[0].length;
    } else if (c === '"' || c === '“' || c === '”' || c === "'") {
      const close = c === '“' ? '”' : c;
      let j = i + 1;
      let s = '';
      while (j < src.length && src[j] !== close && !(close === '”' && src[j] === '"')) s += src[j++];
      if (j >= src.length) throw new FormulaError('A piece of text in quotes is never closed');
      out.push({ t: 'str', v: s });
      i = j + 1;
    } else if (c === '{') {
      const j = src.indexOf('}', i);
      if (j < 0) throw new FormulaError('A { is never closed with }');
      out.push({ t: 'ref', v: src.slice(i + 1, j).trim() });
      i = j + 1;
    } else if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      out.push({ t: 'name', v: m[0].toUpperCase() });
      i += m[0].length;
    } else if (src.startsWith('<=', i) || src.startsWith('>=', i) || src.startsWith('<>', i) || src.startsWith('!=', i) || src.startsWith('==', i)) {
      out.push({ t: 'op', v: src.slice(i, i + 2) === '!=' ? '<>' : src.slice(i, i + 2) === '==' ? '=' : src.slice(i, i + 2) });
      i += 2;
    } else if ('+-*/^&=<>%'.includes(c)) {
      out.push({ t: 'op', v: c });
      i++;
    } else if (c === '(' || c === ')' || c === ',' || c === ';') {
      out.push({ t: c === ';' ? ',' : (c as '(' | ')'), v: c });
      i++;
    } else {
      throw new FormulaError(`"${c}" can't be used in a formula`);
    }
  }
  return out;
}

function parse(src: string): Node {
  const toks = tokenize(src.trim().replace(/^=/, ''));
  if (!toks.length) throw new FormulaError('The formula is empty');
  let p = 0;
  const peek = () => toks[p];
  const isOp = (...ops: string[]) => peek()?.t === 'op' && ops.includes(peek().v);
  const expect = (t: Tok['t']) => {
    if (peek()?.t !== t) throw new FormulaError(t === ')' ? 'A bracket ( is never closed' : `Expected ${t} here`);
    p++;
  };
  // Lowest to highest: comparisons, &, + -, * /, ^, unary minus, values
  const compare = (): Node => {
    let a = concat();
    while (isOp('=', '<>', '<', '>', '<=', '>=')) {
      const op = toks[p++].v;
      a = { k: 'bin', op, a, b: concat() };
    }
    return a;
  };
  const concat = (): Node => {
    let a = add();
    while (isOp('&')) {
      p++;
      a = { k: 'bin', op: '&', a, b: add() };
    }
    return a;
  };
  const add = (): Node => {
    let a = mul();
    while (isOp('+', '-')) {
      const op = toks[p++].v;
      a = { k: 'bin', op, a, b: mul() };
    }
    return a;
  };
  const mul = (): Node => {
    let a = pow();
    while (isOp('*', '/')) {
      const op = toks[p++].v;
      a = { k: 'bin', op, a, b: pow() };
    }
    return a;
  };
  const pow = (): Node => {
    const a = unary();
    if (isOp('^')) {
      p++;
      return { k: 'bin', op: '^', a, b: pow() };
    }
    return a;
  };
  const unary = (): Node => {
    if (isOp('-')) {
      p++;
      return { k: 'neg', a: unary() };
    }
    if (isOp('+')) {
      p++;
      return unary();
    }
    let n = atom();
    if (isOp('%')) {
      p++;
      n = { k: 'bin', op: '/', a: n, b: { k: 'num', v: 100 } };
    }
    return n;
  };
  const atom = (): Node => {
    const tok = toks[p++];
    if (!tok) throw new FormulaError('The formula ends too soon');
    if (tok.t === 'num') return { k: 'num', v: Number(tok.v) };
    if (tok.t === 'str') return { k: 'str', v: tok.v };
    if (tok.t === 'ref') return { k: 'ref', name: tok.v };
    if (tok.t === '(') {
      const n = compare();
      expect(')');
      return n;
    }
    if (tok.t === 'name') {
      if (tok.v === 'TRUE' || tok.v === 'FALSE') {
        if (peek()?.t === '(') (p++, expect(')'));
        return { k: 'bool', v: tok.v === 'TRUE' };
      }
      if (!FUNCTIONS[tok.v]) throw new FormulaError(`There's no function called ${tok.v}`);
      expect('(');
      const args: Node[] = [];
      if (peek()?.t !== ')') {
        args.push(compare());
        while (peek()?.t === ',') (p++, args.push(compare()));
      }
      expect(')');
      const [min, max] = FUNCTIONS[tok.v].args;
      if (args.length < min || args.length > max)
        throw new FormulaError(`${tok.v} takes ${min === max ? min : max === Infinity ? `${min} or more` : `${min} to ${max}`} value${max === 1 ? '' : 's'}`);
      return { k: 'call', fn: tok.v, args };
    }
    throw new FormulaError(tok.t === ')' ? 'A ) has nothing to close' : tok.t === ',' ? 'A comma is out of place' : `"${tok.v}" is out of place`);
  };
  const n = compare();
  if (p < toks.length) throw new FormulaError(`Something after the end of the formula ("${toks[p].v}")`);
  return n;
}

// ---- Values

const num = (v: FValue): number => {
  if (v === null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v.replace(/[,£$€\s]/g, ''));
  if (!isNaN(n)) return n;
  const d = dateOf(v);
  if (d) return Math.round(d.getTime() / 86400000);
  throw new FormulaError(`"${v}" isn't a number`);
};
const str = (v: FValue): string => (v === null ? '' : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : typeof v === 'number' ? String(Math.round(v * 1e6) / 1e6) : v);
const bool = (v: FValue): boolean => (typeof v === 'string' ? v !== '' && v.toLowerCase() !== 'false' && v !== '0' : !!v);
const dateOf = (v: FValue): Date | undefined => {
  if (v === null || v === '' || typeof v === 'boolean') return undefined;
  if (typeof v === 'number') return new Date(v * 86400000);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : undefined;
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const needDate = (v: FValue, _fn?: string) => {
  const d = dateOf(v);
  if (!d) throw new Blank();
  return d;
};
// An empty date makes date sums empty rather than an error (as monday shows nothing)
class Blank extends Error {}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const workdays = (a: Date, b: Date) => {
  const sign = a <= b ? 1 : -1;
  const [from, to] = sign > 0 ? [a, b] : [b, a];
  let n = 0;
  for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86400000)) if (d.getUTCDay() % 6 !== 0) n++;
  return n * sign;
};
const flat = (vals: FValue[]) => vals.filter((v) => v !== null && v !== '');

type Fn = { args: [number, number]; lazy?: boolean; run: (a: FValue[], ctx: { today: Date }) => FValue; help: string };
const FUNCTIONS: Record<string, Fn> = {
  IF: { args: [2, 3], help: 'IF(condition, then, else)', run: () => null, lazy: true },
  SWITCH: { args: [3, Infinity], help: 'SWITCH({Stage}, "Won", 1, "Lost", 0, 0.5)', run: () => null, lazy: true },
  IFERROR: { args: [2, 2], help: 'IFERROR(value, if it fails)', run: () => null, lazy: true },
  AND: { args: [1, Infinity], help: 'AND(a, b, ...)', run: (a) => a.every(bool) },
  OR: { args: [1, Infinity], help: 'OR(a, b, ...)', run: (a) => a.some(bool) },
  NOT: { args: [1, 1], help: 'NOT(a)', run: (a) => !bool(a[0]) },
  XOR: { args: [2, 2], help: 'XOR(a, b)', run: (a) => bool(a[0]) !== bool(a[1]) },
  ISBLANK: { args: [1, 1], help: 'ISBLANK({Email})', run: (a) => a[0] === null || a[0] === '' },
  SUM: { args: [1, Infinity], help: 'SUM(a, b, ...)', run: (a) => a.reduce<number>((s, v) => s + num(v), 0) },
  AVERAGE: { args: [1, Infinity], help: 'AVERAGE(a, b, ...)', run: (a) => (flat(a).length ? flat(a).reduce<number>((s, v) => s + num(v), 0) / flat(a).length : null) },
  MIN: { args: [1, Infinity], help: 'MIN(a, b, ...)', run: (a) => (flat(a).length ? Math.min(...flat(a).map(num)) : null) },
  MAX: { args: [1, Infinity], help: 'MAX(a, b, ...)', run: (a) => (flat(a).length ? Math.max(...flat(a).map(num)) : null) },
  COUNT: { args: [1, Infinity], help: 'COUNT(a, b, ...): how many are filled in', run: (a) => flat(a).length },
  ROUND: { args: [1, 2], help: 'ROUND(number, places)', run: (a) => { const f = 10 ** num(a[1] ?? 0); return Math.round(num(a[0]) * f) / f; } },
  ROUNDUP: { args: [1, 2], help: 'ROUNDUP(number, places)', run: (a) => { const f = 10 ** num(a[1] ?? 0); return Math.ceil(num(a[0]) * f) / f; } },
  ROUNDDOWN: { args: [1, 2], help: 'ROUNDDOWN(number, places)', run: (a) => { const f = 10 ** num(a[1] ?? 0); return Math.floor(num(a[0]) * f) / f; } },
  ABS: { args: [1, 1], help: 'ABS(number)', run: (a) => Math.abs(num(a[0])) },
  MOD: { args: [2, 2], help: 'MOD(number, by)', run: (a) => num(a[0]) % num(a[1]) },
  POWER: { args: [2, 2], help: 'POWER(number, power)', run: (a) => num(a[0]) ** num(a[1]) },
  SQRT: { args: [1, 1], help: 'SQRT(number)', run: (a) => Math.sqrt(num(a[0])) },
  PERCENT: { args: [2, 2], help: 'PERCENT(part, whole): part as % of whole', run: (a) => (num(a[1]) ? (num(a[0]) / num(a[1])) * 100 : null) },
  CONCATENATE: { args: [1, Infinity], help: 'CONCATENATE(a, " ", b)', run: (a) => a.map(str).join('') },
  LEFT: { args: [1, 2], help: 'LEFT(text, count)', run: (a) => str(a[0]).slice(0, num(a[1] ?? 1)) },
  RIGHT: { args: [1, 2], help: 'RIGHT(text, count)', run: (a) => { const s = str(a[0]); const n = num(a[1] ?? 1); return n ? s.slice(-n) : ''; } },
  MID: { args: [3, 3], help: 'MID(text, start, count)', run: (a) => str(a[0]).substr(num(a[1]) - 1, num(a[2])) },
  LEN: { args: [1, 1], help: 'LEN(text)', run: (a) => str(a[0]).length },
  UPPER: { args: [1, 1], help: 'UPPER(text)', run: (a) => str(a[0]).toUpperCase() },
  LOWER: { args: [1, 1], help: 'LOWER(text)', run: (a) => str(a[0]).toLowerCase() },
  TRIM: { args: [1, 1], help: 'TRIM(text)', run: (a) => str(a[0]).trim().replace(/\s+/g, ' ') },
  SUBSTITUTE: { args: [3, 3], help: 'SUBSTITUTE(text, old, new)', run: (a) => str(a[0]).split(str(a[1])).join(str(a[2])) },
  SEARCH: { args: [2, 2], help: 'SEARCH(find, text): its place, or 0', run: (a) => str(a[1]).toLowerCase().indexOf(str(a[0]).toLowerCase()) + 1 },
  CONTAINS: { args: [2, 2], help: 'CONTAINS(text, find)', run: (a) => str(a[0]).toLowerCase().includes(str(a[1]).toLowerCase()) },
  TEXT: { args: [1, 2], help: 'TEXT(number, "0.00")', run: (a) => { const dp = (/\.(0+)/.exec(str(a[1] ?? '')) ?? ['', ''])[1].length; return num(a[0]).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp }); } },
  TODAY: { args: [0, 0], help: 'TODAY()', run: (_, c) => iso(c.today) },
  DAYS: { args: [2, 2], help: 'DAYS(end, start): days between two dates', run: (a) => Math.round((needDate(a[0], 'DAYS').getTime() - needDate(a[1], 'DAYS').getTime()) / 86400000) },
  WORKDAYS: { args: [2, 2], help: 'WORKDAYS(end, start): weekdays between, both counted', run: (a) => workdays(needDate(a[1], 'WORKDAYS'), needDate(a[0], 'WORKDAYS')) },
  ADD_DAYS: { args: [2, 2], help: 'ADD_DAYS(date, days)', run: (a) => iso(new Date(needDate(a[0], 'ADD_DAYS').getTime() + num(a[1]) * 86400000)) },
  SUBTRACT_DAYS: { args: [2, 2], help: 'SUBTRACT_DAYS(date, days)', run: (a) => iso(new Date(needDate(a[0], 'SUBTRACT_DAYS').getTime() - num(a[1]) * 86400000)) },
  YEAR: { args: [1, 1], help: 'YEAR(date)', run: (a) => needDate(a[0], 'YEAR').getUTCFullYear() },
  MONTH: { args: [1, 1], help: 'MONTH(date)', run: (a) => needDate(a[0], 'MONTH').getUTCMonth() + 1 },
  DAY: { args: [1, 1], help: 'DAY(date)', run: (a) => needDate(a[0], 'DAY').getUTCDate() },
  WEEKDAY: { args: [1, 1], help: 'WEEKDAY(date): 1 Sunday to 7 Saturday', run: (a) => needDate(a[0], 'WEEKDAY').getUTCDay() + 1 },
  WEEKNUM: {
    args: [1, 1],
    help: 'WEEKNUM(date): ISO week',
    run: (a) => {
      const d = needDate(a[0], 'WEEKNUM');
      const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - (d.getUTCDay() || 7)));
      return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
    },
  },
  FORMAT_DATE: { args: [1, 1], help: 'FORMAT_DATE(date): e.g. 4 Mar 2026', run: (a) => { const d = needDate(a[0], 'FORMAT_DATE'); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; } },
};

// The functions, for the editor's help list
export const FORMULA_FUNCTIONS = Object.entries(FUNCTIONS).map(([name, f]) => ({ name, help: f.help }));

const BUILT_INS: Record<string, (t: ProjectTask, ctx: FormulaContext) => FValue> = {
  name: (t) => t.title,
  item: (t) => t.title,
  title: (t) => t.title,
  status: (t) => STATUS_LABEL[t.status] ?? t.status,
  priority: (t) => (t.priority ? PRIORITY_LABEL[t.priority] : null),
  owner: (t, c) => t.ownerUids.map((u) => c.names?.[u] ?? 'someone').join(', ') || null,
  'start date': (t) => t.startDate ?? null,
  'due date': (t) => t.dueDate ?? null,
  due: (t) => t.dueDate ?? null,
  created: (t) => t.createdAt.slice(0, 10),
};
export const BUILT_IN_REFS = ['Name', 'Status', 'Priority', 'Owner', 'Start date', 'Due date', 'Created'];

function refValue(name: string, t: ProjectTask, ctx: FormulaContext, depth: number): FValue {
  const key = name.toLowerCase().replace(/\s+/g, ' ');
  const col = ctx.columns.find((c) => c.title.toLowerCase().replace(/\s+/g, ' ') === key);
  if (!col) {
    if (BUILT_INS[key]) return BUILT_INS[key](t, ctx);
    throw new FormulaError(`There's no column called {${name}}`);
  }
  if (col.type === 'formula') {
    if (depth > 4) throw new FormulaError(`{${name}} goes round in a circle`);
    return run(compile(col.formula ?? ''), t, ctx, depth + 1);
  }
  const v = t.values?.[col.id];
  if (v === undefined) return col.type === 'checkbox' ? false : null;
  switch (col.type) {
    case 'number':
    case 'money':
      return typeof v === 'number' ? v : null;
    case 'checkbox':
      return !!v;
    case 'label':
      return col.options?.find((o) => o.id === v)?.label ?? null;
    case 'people':
      return (v as string[]).map((u) => ctx.names?.[u] ?? 'someone').join(', ') || null;
    case 'connect':
      return (v as string[]).map((i) => ctx.allTasks?.find((x) => x.id === i)?.title).filter(Boolean).join(', ') || null;
    default:
      return typeof v === 'string' ? v : String(v);
  }
}

function evaluate(n: Node, t: ProjectTask, ctx: FormulaContext, depth: number, today: Date): FValue {
  const ev = (x: Node) => evaluate(x, t, ctx, depth, today);
  switch (n.k) {
    case 'num':
      return n.v;
    case 'str':
    case 'bool':
      return n.v;
    case 'ref':
      return refValue(n.name, t, ctx, depth);
    case 'neg':
      return -num(ev(n.a));
    case 'bin': {
      const a = ev(n.a);
      const b = ev(n.b);
      switch (n.op) {
        case '+':
          return num(a) + num(b);
        case '-':
          return num(a) - num(b);
        case '*':
          return num(a) * num(b);
        case '/':
          if (num(b) === 0) throw new Blank();
          return num(a) / num(b);
        case '^':
          return num(a) ** num(b);
        case '&':
          return str(a) + str(b);
        default: {
          // Compare as numbers when both are, else as text ignoring case
          const bothNum = (x: FValue) => typeof x === 'number' || typeof x === 'boolean' || x === null;
          const c = bothNum(a) && bothNum(b) ? num(a) - num(b) : str(a).toLowerCase().localeCompare(str(b).toLowerCase());
          return n.op === '=' ? c === 0 : n.op === '<>' ? c !== 0 : n.op === '<' ? c < 0 : n.op === '>' ? c > 0 : n.op === '<=' ? c <= 0 : c >= 0;
        }
      }
    }
    case 'call': {
      if (n.fn === 'IF') return bool(ev(n.args[0])) ? ev(n.args[1]) : n.args[2] ? ev(n.args[2]) : null;
      if (n.fn === 'IFERROR') {
        try {
          return ev(n.args[0]);
        } catch (e) {
          if (e instanceof FormulaError && /no column|no function/.test(e.message)) throw e;
          return ev(n.args[1]);
        }
      }
      if (n.fn === 'SWITCH') {
        const v = str(ev(n.args[0])).toLowerCase();
        for (let i = 1; i + 1 < n.args.length; i += 2) if (str(ev(n.args[i])).toLowerCase() === v) return ev(n.args[i + 1]);
        return n.args.length % 2 === 0 ? ev(n.args[n.args.length - 1]) : null;
      }
      return FUNCTIONS[n.fn].run(n.args.map(ev), { today });
    }
  }
}

// Parsed formulas, kept so a board of hundreds of items reads each formula once
const cache = new Map<string, Node | FormulaError>();
function compile(formula: string): Node {
  let n = cache.get(formula);
  if (!n) {
    try {
      n = parse(formula);
    } catch (e) {
      n = e instanceof FormulaError ? e : new FormulaError('The formula can’t be read');
    }
    if (cache.size > 500) cache.clear();
    cache.set(formula, n);
  }
  if (n instanceof FormulaError) throw n;
  return n;
}

function run(node: Node, t: ProjectTask, ctx: FormulaContext, depth: number): FValue {
  const v = evaluate(node, t, ctx, depth, ctx.today ?? new Date());
  return typeof v === 'number' && !isFinite(v) ? null : v;
}

export type FormulaResult = { value: FValue; error?: undefined } | { value: null; error: string };

// A formula's value on one item; an empty formula, or one that divides by zero or reads an empty date, is empty
export function formulaResult(formula: string, t: ProjectTask, ctx: FormulaContext): FormulaResult {
  if (!formula.trim()) return { value: null };
  try {
    return { value: run(compile(formula), t, ctx, 0) };
  } catch (e) {
    if (e instanceof Blank) return { value: null };
    return { value: null, error: e instanceof FormulaError ? e.message : 'The formula can’t be worked out' };
  }
}

// Whether a formula can be read, and if not why (column names are checked against the board)
export function checkFormula(formula: string, ctx: FormulaContext): string | undefined {
  if (!formula.trim()) return 'Write a formula first';
  try {
    const node = compile(formula);
    const missing: string[] = [];
    const walk = (n: Node) => {
      if (n.k === 'ref') {
        const key = n.name.toLowerCase().replace(/\s+/g, ' ');
        if (!ctx.columns.some((c) => c.title.toLowerCase().replace(/\s+/g, ' ') === key) && !BUILT_INS[key]) missing.push(n.name);
      } else if (n.k === 'neg') walk(n.a);
      else if (n.k === 'bin') (walk(n.a), walk(n.b));
      else if (n.k === 'call') n.args.forEach(walk);
    };
    walk(node);
    return missing.length ? `There's no column called ${missing.map((m) => `{${m}}`).join(', ')}` : undefined;
  } catch (e) {
    return e instanceof FormulaError ? e.message : 'The formula can’t be read';
  }
}

// How a formula's value shows in its cell: numbers with the column's currency, TRUE as a tick, dates as dates
export function showFormula(r: FormulaResult, currency = ''): string {
  if (r.error) return '!';
  const v = r.value;
  if (v === null || v === '') return '';
  if (typeof v === 'boolean') return v ? '✓' : '';
  if (typeof v === 'number') return `${currency}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return d ? `${+d[3]} ${MONTHS[+d[2] - 1]} ${d[1]}` : v;
}
