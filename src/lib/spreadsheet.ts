/**
 * The spreadsheet behind spreadsheet tasks: a workbook of sheets whose cells hold what the candidate typed,
 * and a formula engine that works them out the way Excel does (references, ranges, the common functions,
 * relative references that move when copied). Tasks are marked by formulas run against the finished workbook.
 */

export type CellFormat = 'general' | 'number' | 'currency' | 'percent';

// An Excel Table (Format as Table): a named range whose first row is the headers. Formulas can use structured
// references (Orders[Qty], Orders[@Qty], [@Qty]) that follow the table as it grows
export interface SheetTable {
  name: string;
  ref: string;
  style?: 'blue' | 'green' | 'orange' | 'gray';
}

// AutoFilter on a range (its first row the headers): per column, the values kept or a condition
export interface FilterCriterion {
  values?: string[];
  op?: '>' | '<' | '>=' | '<=' | '=' | '<>' | 'contains' | 'top' | 'bottom' | 'blank' | 'nonblank';
  value?: string;
}
export interface SheetFilter {
  ref: string;
  // Keyed by the column's offset in the range (0 = its first column)
  criteria: Record<string, FilterCriterion>;
}

// Conditional formatting: a rule on a range and the colour cells that meet it are shown in
export type CondRule = 'greater' | 'less' | 'between' | 'equal' | 'contains' | 'duplicate' | 'unique' | 'top' | 'bottom' | 'above' | 'below' | 'blank' | 'scale';
export interface CondFormat {
  ref: string;
  rule: CondRule;
  value?: string;
  value2?: string;
  style: 'red' | 'green' | 'yellow' | 'bold';
}

// A chart over a range: its first column the categories, the other columns the series, headers in its first row
export interface SheetChart {
  id: string;
  kind: 'column' | 'bar' | 'line' | 'pie';
  ref: string;
  title: string;
}

// A slicer: buttons for one column of a table; the values picked filter the table (none picked shows all)
export interface SheetSlicer {
  id: string;
  table: string;
  column: string;
  selected: string[];
}

export interface Sheet {
  name: string;
  // What was typed in each cell, by address ("B2"): a value, or a formula starting with "="
  cells: Record<string, string>;
  formats?: Record<string, CellFormat>;
  tables?: SheetTable[];
  filter?: SheetFilter;
  conditional?: CondFormat[];
  charts?: SheetChart[];
  slicers?: SheetSlicer[];
}

// A Power Query query: where its data comes from (files on the desktop, appended), the steps applied in order, and
// the sheet it loads to. Refresh runs it again on the files as they are now
export type QueryStep =
  | { kind: 'promote' }
  | { kind: 'remove-columns'; columns: string[] }
  | { kind: 'keep-columns'; columns: string[] }
  | { kind: 'rename'; column: string; to: string }
  | { kind: 'trim'; columns: string[] }
  | { kind: 'clean-case'; columns: string[]; mode: 'proper' | 'upper' | 'lower' }
  | { kind: 'replace'; column: string; find: string; with: string }
  | { kind: 'type'; column: string; to: 'number' | 'text' | 'date' }
  | { kind: 'remove-blank-rows' }
  | { kind: 'remove-duplicates'; columns: string[] }
  | { kind: 'filter'; column: string; op: '=' | '<>' | '>' | '<' | 'contains' | 'nonblank'; value: string }
  | { kind: 'split'; column: string; by: string; into: string[] }
  | { kind: 'merge'; query: string; on: string; otherOn: string; columns: string[] };
export interface Query {
  name: string;
  sources: string[];
  steps: QueryStep[];
  loadTo?: string;
}

export interface Workbook {
  sheets: Sheet[];
  queries?: Query[];
}

export class SheetError {
  constructor(public code: string) {}
  toString() {
    return this.code;
  }
}

export type CellValue = number | string | boolean | null | SheetError;

const err = (code: string) => new SheetError(code);
const isErr = (v: unknown): v is SheetError => v instanceof SheetError;

// ---------- Addresses ----------

export const colName = (c: number) => {
  let s = '';
  for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
export const colIndex = (letters: string) => [...letters.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
export const cellAddr = (r: number, c: number) => `${colName(c)}${r + 1}`;
export function parseAddr(a: string): { r: number; c: number } | null {
  const m = /^\$?([A-Z]{1,3})\$?(\d+)$/i.exec(a.trim());
  return m ? { r: Number(m[2]) - 1, c: colIndex(m[1]) } : null;
}

// How far a sheet's typed cells reach: rows and columns used, counted from A1
export function usedSize(sheet: Sheet): { rows: number; cols: number } {
  let rows = 0;
  let cols = 0;
  for (const [a, raw] of Object.entries(sheet.cells)) {
    if (raw === '') continue;
    const p = parseAddr(a);
    if (!p) continue;
    rows = Math.max(rows, p.r + 1);
    cols = Math.max(cols, p.c + 1);
  }
  return { rows, cols };
}

export function sheetFromRows(name: string, rows: (string | number | null)[][]): Sheet {
  const cells: Record<string, string> = {};
  rows.forEach((row, r) =>
    row.forEach((v, c) => {
      if (v !== null && v !== '') cells[cellAddr(r, c)] = String(v);
    })
  );
  return { name, cells };
}

// The starting workbook of a spreadsheet task, kept as its starter code
export const workbookStarter = (sheets: { name: string; rows: (string | number | null)[][] }[]) =>
  JSON.stringify({ sheets: sheets.map((s) => sheetFromRows(s.name, s.rows)) });

export function parseWorkbook(json: string): Workbook {
  try {
    const wb = JSON.parse(json) as Workbook;
    if (Array.isArray(wb?.sheets) && wb.sheets.length) return wb;
  } catch {
    /* falls through to an empty workbook */
  }
  return { sheets: [{ name: 'Sheet1', cells: {} }] };
}

// ---------- Typed values ----------

const NUMBER = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;
const GROUPED = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/;

// A number typed or held as text: plain, with thousands commas, a currency sign or a percent sign
export function parseNumber(text: string): number | null {
  let s = text.trim();
  if (!s) return null;
  let scale = 1;
  if (s.endsWith('%')) {
    scale = 0.01;
    s = s.slice(0, -1).trim();
  }
  s = s.replace(/^([-+]?)[£$€]/, '$1');
  if (NUMBER.test(s)) return Number(s) * scale;
  if (GROUPED.test(s)) return Number(s.replace(/,/g, '')) * scale;
  return null;
}

// What a typed entry (not a formula) is worth
function literal(raw: string): CellValue {
  if (raw === '') return null;
  if (raw.startsWith("'")) return raw.slice(1);
  const n = parseNumber(raw);
  if (n !== null) return n;
  const upper = raw.trim().toUpperCase();
  if (upper === 'TRUE') return true;
  if (upper === 'FALSE') return false;
  return raw;
}

// ---------- Tokens ----------

interface RefPart {
  c: number;
  r: number | null; // null for a whole column (A:A)
  absC: boolean;
  absR: boolean;
}
interface RefToken {
  sheet?: string; // as written, without quotes
  a: RefPart;
  b?: RefPart;
  // A2#: the whole range a dynamic array formula in A2 spills into
  spill?: boolean;
}

// A structured reference to an Excel Table: Orders[Qty], Orders[@Qty], Orders[#All], [@Qty] inside the table
interface TableRef {
  table?: string;
  part: 'data' | 'all' | 'headers' | 'this';
  c1?: string;
  c2?: string;
}

type Token =
  | { t: 'num'; v: number; pos: number; end: number }
  | { t: 'str'; v: string; pos: number; end: number }
  | { t: 'bool'; v: boolean; pos: number; end: number }
  | { t: 'err'; v: string; pos: number; end: number }
  | { t: 'ref'; v: RefToken; pos: number; end: number }
  | { t: 'func'; v: string; pos: number; end: number }
  | { t: 'op'; v: string; pos: number; end: number }
  | { t: 'name'; v: string; pos: number; end: number }
  | { t: 'sref'; v: TableRef; pos: number; end: number };

const SHEET_PREFIX = /(?:'((?:[^']|'')+)'|([A-Za-z_][\w.]*))!/y;
const CELL_PART = /(\$?)([A-Za-z]{1,3})(\$?)(\d+)/y;
const COL_PART = /(\$?)([A-Za-z]{1,3})(?![\w(])/y;

function matchAt(re: RegExp, s: string, i: number) {
  re.lastIndex = i;
  return re.exec(s);
}

function refAt(s: string, i: number): { v: RefToken; end: number } | null {
  let j = i;
  let sheet: string | undefined;
  const pre = matchAt(SHEET_PREFIX, s, j);
  if (pre) {
    sheet = pre[1] !== undefined ? pre[1].replace(/''/g, "'") : pre[2];
    j = SHEET_PREFIX.lastIndex;
  }
  const cell = matchAt(CELL_PART, s, j);
  if (cell && !/[\w(]/.test(s[CELL_PART.lastIndex] ?? '')) {
    const a: RefPart = { c: colIndex(cell[2]), r: Number(cell[4]) - 1, absC: !!cell[1], absR: !!cell[3] };
    let end = CELL_PART.lastIndex;
    if (s[end] === ':') {
      const second = matchAt(CELL_PART, s, end + 1);
      if (second && !/[\w(]/.test(s[CELL_PART.lastIndex] ?? '')) {
        const b: RefPart = { c: colIndex(second[2]), r: Number(second[4]) - 1, absC: !!second[1], absR: !!second[3] };
        return { v: { sheet, a, b }, end: CELL_PART.lastIndex };
      }
    }
    if (s[end] === '#') return { v: { sheet, a, spill: true }, end: end + 1 };
    return { v: { sheet, a }, end };
  }
  // A whole column, which only counts as a range: A:A, $B:$D
  const col = matchAt(COL_PART, s, j);
  if (col && s[COL_PART.lastIndex] === ':') {
    const second = matchAt(COL_PART, s, COL_PART.lastIndex + 1);
    if (second) {
      return {
        v: { sheet, a: { c: colIndex(col[2]), r: null, absC: !!col[1], absR: false }, b: { c: colIndex(second[2]), r: null, absC: !!second[1], absR: false } },
        end: COL_PART.lastIndex,
      };
    }
  }
  return null;
}

// Orders[Qty], Orders[@Qty], Orders[@[Unit Price]], Orders[[#All],[Qty]], Orders[[Qty]:[Price]], Orders[#All], Orders[],
// and [@Qty] inside a table
function tableRefAt(s: string, i: number): { v: TableRef; end: number } | null {
  const name = matchAt(/([A-Za-z_][\w.]*)?\[/y, s, i);
  if (!name) return null;
  let depth = 0;
  let j = i + (name[1]?.length ?? 0);
  const start = j;
  for (; j < s.length; j++) {
    if (s[j] === '[') depth++;
    else if (s[j] === ']' && --depth === 0) break;
  }
  if (depth !== 0) return null;
  const inner = s.slice(start + 1, j).trim();
  const v: TableRef = { ...(name[1] && { table: name[1] }), part: 'data' };
  const items = inner.startsWith('[') ? [...inner.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].trim()) : inner.startsWith('@') ? ['@', inner.slice(1).replace(/^\[|\]$/g, '').trim()] : inner ? [inner] : [];
  const cols: string[] = [];
  for (const it of items) {
    const low = it.toLowerCase();
    if (low === '#all') v.part = 'all';
    else if (low === '#headers') v.part = 'headers';
    else if (low === '#data') v.part = 'data';
    else if (low === '#this row' || low === '@') v.part = 'this';
    else if (it.startsWith('@')) {
      v.part = 'this';
      if (it.slice(1).trim()) cols.push(it.slice(1).trim());
    } else if (it) cols.push(it);
  }
  // [[Qty]:[Price]] is written as two items with a colon between them
  if (cols.length) v.c1 = cols[0];
  if (cols.length > 1) v.c2 = cols[cols.length - 1];
  return { v, end: j + 1 };
}

const OPERATORS = ['<=', '>=', '<>', '+', '-', '*', '/', '^', '&', '=', '<', '>', '(', ')', ',', '%', ':'];

export function tokenize(formula: string): Token[] {
  const s = formula;
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let v = '';
      while (j < s.length) {
        if (s[j] === '"') {
          if (s[j + 1] === '"') {
            v += '"';
            j += 2;
            continue;
          }
          break;
        }
        v += s[j++];
      }
      tokens.push({ t: 'str', v, pos: i, end: j + 1 });
      i = j + 1;
      continue;
    }
    const num = matchAt(/(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/iy, s, i);
    if (num && !/[A-Za-z]/.test(s[i + num[0].length] ?? '')) {
      tokens.push({ t: 'num', v: Number(num[0]), pos: i, end: i + num[0].length });
      i += num[0].length;
      continue;
    }
    if (ch === '#') {
      const e = matchAt(/#(DIV\/0!|VALUE!|REF!|NAME\?|N\/A|NUM!|NULL!)/y, s, i);
      if (e) {
        tokens.push({ t: 'err', v: e[0], pos: i, end: i + e[0].length });
        i += e[0].length;
        continue;
      }
    }
    const sref = tableRefAt(s, i);
    if (sref) {
      tokens.push({ t: 'sref', v: sref.v, pos: i, end: sref.end });
      i = sref.end;
      continue;
    }
    if (/[A-Za-z_'$]/.test(ch)) {
      const fn = matchAt(/([A-Za-z][A-Za-z0-9.]*)\s*\(/y, s, i);
      if (fn) {
        tokens.push({ t: 'func', v: fn[1].toUpperCase(), pos: i, end: i + fn[1].length });
        i += fn[1].length;
        continue;
      }
      const ref = refAt(s, i);
      if (ref) {
        tokens.push({ t: 'ref', v: ref.v, pos: i, end: ref.end });
        i = ref.end;
        continue;
      }
      const word = matchAt(/[A-Za-z_][\w.]*/y, s, i);
      if (word) {
        const upper = word[0].toUpperCase();
        if (upper === 'TRUE' || upper === 'FALSE') tokens.push({ t: 'bool', v: upper === 'TRUE', pos: i, end: i + word[0].length });
        else tokens.push({ t: 'name', v: word[0], pos: i, end: i + word[0].length });
        i += word[0].length;
        continue;
      }
    }
    const op = OPERATORS.find((o) => s.startsWith(o, i));
    if (!op) throw new Error(`Unexpected "${ch}"`);
    tokens.push({ t: 'op', v: op, pos: i, end: i + op.length });
    i += op.length;
  }
  return tokens;
}

// ---------- Parsing ----------

type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'bool'; v: boolean }
  | { k: 'err'; v: string }
  | { k: 'ref'; v: RefToken }
  | { k: 'sref'; v: TableRef }
  // A value already worked out (one cell of a range a function is applied across)
  | { k: 'val'; v: CellValue }
  | { k: 'fn'; name: string; args: Node[] }
  | { k: 'neg'; a: Node }
  | { k: 'pct'; a: Node }
  | { k: 'bin'; op: string; a: Node; b: Node };

function parseFormula(body: string): Node {
  const tokens = tokenize(body);
  let p = 0;
  const peek = () => tokens[p];
  const isOp = (v: string) => peek()?.t === 'op' && peek()!.v === v;
  const expectOp = (v: string) => {
    if (!isOp(v)) throw new Error(`Expected "${v}"`);
    p++;
  };

  const binary = (ops: string[], next: () => Node) => (): Node => {
    let left = next();
    while (peek()?.t === 'op' && ops.includes(peek()!.v as string)) {
      const op = tokens[p++].v as string;
      left = { k: 'bin', op, a: left, b: next() };
    }
    return left;
  };

  const primary = (): Node => {
    const tok = tokens[p++];
    if (!tok) throw new Error('The formula ends too soon');
    switch (tok.t) {
      case 'num':
        return { k: 'num', v: tok.v };
      case 'str':
        return { k: 'str', v: tok.v };
      case 'bool':
        return { k: 'bool', v: tok.v };
      case 'err':
        return { k: 'err', v: tok.v };
      case 'ref':
        return { k: 'ref', v: tok.v };
      case 'sref':
        return { k: 'sref', v: tok.v };
      case 'name':
        return { k: 'err', v: '#NAME?' };
      case 'func': {
        expectOp('(');
        const args: Node[] = [];
        if (!isOp(')')) {
          for (;;) {
            // An empty argument, as in IF(A1,,1), counts as blank
            args.push(isOp(',') || isOp(')') ? { k: 'str', v: '' } : comparison());
            if (isOp(',')) {
              p++;
              continue;
            }
            break;
          }
        }
        expectOp(')');
        return { k: 'fn', name: tok.v, args };
      }
      case 'op':
        if (tok.v === '(') {
          const inner = comparison();
          expectOp(')');
          return inner;
        }
        if (tok.v === '-') return { k: 'neg', a: unary() };
        if (tok.v === '+') return unary();
    }
    throw new Error(`Unexpected "${tok.t === 'op' ? tok.v : 'value'}"`);
  };
  const postfix = (): Node => {
    let n = primary();
    while (isOp('%')) {
      p++;
      n = { k: 'pct', a: n };
    }
    return n;
  };
  const unary = (): Node => postfix();
  const power = binary(['^'], unary);
  const product = binary(['*', '/'], power);
  const sum = binary(['+', '-'], product);
  const concat = binary(['&'], sum);
  const comparison = binary(['=', '<>', '<', '>', '<=', '>='], concat);

  const tree = comparison();
  if (p < tokens.length) throw new Error('Something after the end of the formula');
  return tree;
}

// ---------- Rewriting references ----------

const quoteSheet = (name: string) => (/^[A-Za-z_][\w.]*$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`);

function writePart(part: RefPart) {
  return `${part.absC ? '$' : ''}${colName(part.c)}${part.r === null ? '' : `${part.absR ? '$' : ''}${part.r + 1}`}`;
}
function writeRef(ref: RefToken) {
  return `${ref.sheet !== undefined ? `${quoteSheet(ref.sheet)}!` : ''}${writePart(ref.a)}${ref.b ? `:${writePart(ref.b)}` : ''}${ref.spill ? '#' : ''}`;
}

// Rewrites every reference in a formula; returning null for one makes it #REF!. Plain values pass through.
export function rewriteRefs(raw: string, fn: (ref: RefToken) => RefToken | null): string {
  if (!raw.startsWith('=')) return raw;
  let tokens: Token[];
  try {
    tokens = tokenize(raw.slice(1));
  } catch {
    return raw;
  }
  let out = '';
  let last = 0;
  const body = raw.slice(1);
  for (const tok of tokens) {
    if (tok.t !== 'ref') continue;
    const next = fn(tok.v);
    out += body.slice(last, tok.pos) + (next ? writeRef(next) : '#REF!');
    last = tok.end;
  }
  return `=${out}${body.slice(last)}`;
}

// A formula as it reads after copying it dr rows down and dc columns across: relative references move
export function shiftFormula(raw: string, dr: number, dc: number): string {
  const move = (part: RefPart): RefPart | null => {
    const c = part.absC ? part.c : part.c + dc;
    const r = part.r === null || part.absR ? part.r : part.r + dr;
    if (c < 0 || (r !== null && r < 0)) return null;
    return { ...part, c, r };
  };
  return rewriteRefs(raw, (ref) => {
    const a = move(ref.a);
    const b = ref.b ? move(ref.b) : undefined;
    if (!a || b === null) return null;
    return { ...ref, a, b };
  });
}

// ---------- Evaluating ----------

class Range {
  constructor(public sheet: number, public r1: number, public c1: number, public r2: number, public c2: number) {}
  get rows() {
    return this.r2 - this.r1 + 1;
  }
  get cols() {
    return this.c2 - this.c1 + 1;
  }
}

// A dynamic array's result (FILTER, UNIQUE, SORT, a calculation over ranges): it spills into the cells below and right
class Arr {
  constructor(public v: CellValue[][]) {}
  get rows() {
    return this.v.length;
  }
  get cols() {
    return this.v[0]?.length ?? 0;
  }
}

type Evaluated = CellValue | Range | Arr;

// A range written as A1:F41 (or one cell), on no sheet in particular
export function parseRange(ref: string): { r1: number; c1: number; r2: number; c2: number } | null {
  const [a, b = a] = ref.replace(/^.*!/, '').split(':');
  const p = parseAddr(a ?? '');
  const q = parseAddr(b ?? '');
  if (!p || !q) return null;
  return { r1: Math.min(p.r, q.r), c1: Math.min(p.c, q.c), r2: Math.max(p.r, q.r), c2: Math.max(p.c, q.c) };
}
export const rangeText = (r: { r1: number; c1: number; r2: number; c2: number }) => `${cellAddr(r.r1, r.c1)}:${cellAddr(r.r2, r.c2)}`;

export function formatGeneral(n: number): string {
  if (!Number.isFinite(n)) return '#NUM!';
  if (Number.isInteger(n)) return String(n);
  return String(Number(n.toPrecision(11)));
}

export function toText(v: CellValue): string {
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return formatGeneral(v);
  return String(v);
}

function toNumber(v: CellValue): number | SheetError {
  if (isErr(v)) return v;
  if (v === null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = parseNumber(v);
  return n === null ? err('#VALUE!') : n;
}

function toBool(v: CellValue): boolean | SheetError {
  if (isErr(v)) return v;
  if (typeof v === 'boolean') return v;
  if (v === null) return false;
  if (typeof v === 'number') return v !== 0;
  const upper = v.toUpperCase();
  if (upper === 'TRUE') return true;
  if (upper === 'FALSE') return false;
  return err('#VALUE!');
}

// Excel's ordering for comparisons: numbers, then text (ignoring case), then TRUE/FALSE; blank is 0 or ""
function compare(a: CellValue, b: CellValue): number {
  const rank = (v: CellValue) => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2);
  if (a === null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b === null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (typeof a === 'string') return a.toLowerCase().localeCompare(String(b).toLowerCase());
  return Number(a) - Number(b);
}

const wildcard = (pattern: string) =>
  new RegExp(
    `^${pattern.replace(/~([*?])|([*?])|[.+^${}()|[\]\\]/g, (m, escaped, wild) => (escaped ? `\\${escaped}` : wild === '*' ? '.*' : wild === '?' ? '.' : `\\${m}`))}$`,
    'is'
  );

// SUMIF-style criteria: 5, ">100", "<>North", "Nor*", "" (blank)
function criterion(c: CellValue): (v: CellValue) => boolean {
  if (typeof c === 'number') return (v) => (typeof v === 'number' ? v === c : typeof v === 'string' && parseNumber(v) === c);
  if (typeof c === 'boolean') return (v) => v === c;
  const text = toText(c);
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(text)!;
  const op = m[1] ?? '=';
  const target = m[2];
  const n = parseNumber(target);
  if (op === '=' || op === '<>') {
    let test: (v: CellValue) => boolean;
    if (target === '') test = (v) => v === null || v === '';
    else if (n !== null) test = (v) => (typeof v === 'number' ? v === n : typeof v === 'string' && v.trim() !== '' && parseNumber(v) === n);
    else {
      const re = wildcard(target);
      test = (v) => typeof v === 'string' && re.test(v);
    }
    return op === '=' ? test : (v) => !test(v);
  }
  const cmp = (v: CellValue) => {
    if (n !== null) return typeof v === 'number' ? v - n : NaN;
    return typeof v === 'string' ? v.toLowerCase().localeCompare(target.toLowerCase()) : NaN;
  };
  return (v) => {
    const d = cmp(v);
    if (Number.isNaN(d)) return false;
    return op === '<' ? d < 0 : op === '>' ? d > 0 : op === '<=' ? d <= 0 : d >= 0;
  };
}

function round(n: number, digits: number, mode: 'half' | 'up' | 'down') {
  const f = 10 ** digits;
  const x = Math.abs(n) * f;
  const r = mode === 'half' ? Math.round(Number(x.toPrecision(15))) : mode === 'up' ? Math.ceil(Number(x.toPrecision(15))) : Math.floor(Number(x.toPrecision(15)));
  return (Math.sign(n) * r) / f;
}

function isoParts(v: CellValue): [number, number, number] | null {
  const s = toText(v).trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(s);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) return [Number(m[3]), Number(m[2]), Number(m[1])];
  return null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

function textFormat(v: CellValue, fmt: string): string | SheetError {
  const f = fmt.toLowerCase();
  const date = isoParts(v);
  if (/[ymd]/.test(f) && date) {
    const [y, m, d] = date;
    return f
      .replace(/yyyy/g, String(y))
      .replace(/yy/g, String(y).slice(2))
      .replace(/mmmm|mmm/g, MONTHS[m - 1])
      .replace(/mm/g, pad(m))
      .replace(/dd/g, pad(d));
  }
  const n = toNumber(v);
  if (isErr(n)) return toText(v);
  const decimals = (/0\.(0+)/.exec(f)?.[1].length ?? 0) as number;
  const percent = f.includes('%');
  const value = percent ? n * 100 : n;
  let out = Math.abs(value).toFixed(decimals);
  if (f.includes(',')) out = Number(out).toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const prefix = /^[£$€]/.exec(fmt)?.[0] ?? '';
  return `${value < 0 ? '-' : ''}${prefix}${out}${percent ? '%' : ''}`;
}

export class Calc {
  private cache = new Map<string, CellValue>();
  private visiting = new Set<string>();
  private parsed = new Map<string, Node | SheetError>();
  private sizes: { rows: number; cols: number }[];
  // The cell being worked out (for [@Column] references), and dynamic arrays' spilled cells and sizes
  private here: { sheet: number; r: number; c: number } | null = null;
  private spilled = new Map<string, CellValue>();
  private spillSize = new Map<string, { rows: number; cols: number }>();
  private spillState: 'none' | 'running' | 'done' = 'none';

  constructor(private wb: Workbook) {
    this.sizes = wb.sheets.map(usedSize);
  }

  // Every formula worked out once so each dynamic array's spill is known, then again with the spills in place
  private ensureSpills() {
    if (this.spillState !== 'none') return;
    this.spillState = 'running';
    for (let pass = 0; pass < 2; pass++) {
      if (pass) this.cache.clear();
      this.wb.sheets.forEach((sh, i) => {
        for (const [a, raw] of Object.entries(sh.cells)) {
          if (!raw.startsWith('=')) continue;
          const p = parseAddr(a);
          if (p) this.value(i, p.r, p.c);
        }
      });
    }
    this.spillState = 'done';
  }

  // The size of the array a cell's formula spills (1 × 1 when it doesn't)
  spillOf(sheet: number, r: number, c: number): { rows: number; cols: number } | null {
    this.ensureSpills();
    return this.spillSize.get(`${sheet}:${r}:${c}`) ?? null;
  }
  // Whether a cell shows part of another cell's spilled array
  isSpilled(sheet: number, r: number, c: number): boolean {
    this.ensureSpills();
    return this.spilled.has(`${sheet}:${r}:${c}`);
  }

  sheetIndex(name: string | undefined, current: number): number {
    if (name === undefined) return current;
    return this.wb.sheets.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
  }

  raw(sheet: number, r: number, c: number): string {
    return this.wb.sheets[sheet]?.cells[cellAddr(r, c)] ?? '';
  }

  value(sheet: number, r: number, c: number): CellValue {
    const key = `${sheet}:${r}:${c}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const raw = this.raw(sheet, r, c);
    if (raw === '') {
      this.ensureSpills();
      const v = this.spilled.get(key) ?? null;
      if (this.spillState === 'done') this.cache.set(key, v);
      return v;
    }
    if (!raw.startsWith('=') || raw.length === 1) {
      const v = literal(raw);
      this.cache.set(key, v);
      return v;
    }
    if (this.visiting.has(key)) return err('#CIRC!');
    this.visiting.add(key);
    const before = this.here;
    this.here = { sheet, r, c };
    const res = this.evalFormula(raw, sheet);
    this.here = before;
    const v = this.isMulti(res) ? this.spill(sheet, r, c, this.mat(res)) : this.single(res);
    this.visiting.delete(key);
    this.cache.set(key, v);
    return v;
  }

  // A dynamic array spills from its cell into those below and right, unless one of them already holds something
  private spill(sheet: number, r: number, c: number, m: CellValue[][]): CellValue {
    const key = `${sheet}:${r}:${c}`;
    for (let i = 0; i < m.length; i++)
      for (let j = 0; j < m[i].length; j++) {
        if ((i || j) && this.raw(sheet, r + i, c + j) !== '') {
          this.spillSize.delete(key);
          return err('#SPILL!');
        }
      }
    for (let i = 0; i < m.length; i++) for (let j = 0; j < m[i].length; j++) if (i || j) this.spilled.set(`${sheet}:${r + i}:${c + j}`, m[i][j]);
    this.spillSize.set(key, { rows: m.length, cols: m[0]?.length ?? 1 });
    return m[0]?.[0] ?? null;
  }

  private isMulti(v: Evaluated): v is Range | Arr {
    return (v instanceof Range || v instanceof Arr) && (v.rows !== 1 || v.cols !== 1);
  }

  // Any value as a grid: a range's cells, an array, or one value
  private mat(v: Evaluated): CellValue[][] {
    if (v instanceof Range) return this.grid(v);
    if (v instanceof Arr) return v.v;
    return [[v]];
  }

  // Works out a formula ("=...") as if it sat on the given sheet
  evalFormula(raw: string, sheet: number): Evaluated {
    let node = this.parsed.get(raw);
    if (!node) {
      try {
        node = parseFormula(raw.slice(1));
      } catch {
        node = err('#ERROR!');
      }
      this.parsed.set(raw, node);
    }
    if (isErr(node)) return node;
    return this.eval(node, sheet);
  }

  // A formula's single value, as a cell holding it would show
  result(raw: string, sheet: number): CellValue {
    return this.single(this.evalFormula(raw, sheet));
  }

  // A range used where one value is wanted: its only cell, otherwise #VALUE!
  private single(v: Evaluated): CellValue {
    if (v instanceof Arr) return v.rows === 1 && v.cols === 1 ? v.v[0][0] : err('#VALUE!');
    if (!(v instanceof Range)) return v;
    if (v.rows === 1 && v.cols === 1) return this.value(v.sheet, v.r1, v.c1);
    return err('#VALUE!');
  }

  private range(ref: RefToken, current: number): Range | SheetError {
    const sheet = this.sheetIndex(ref.sheet, current);
    if (sheet < 0) return err('#REF!');
    if (ref.spill && ref.a.r !== null) {
      this.value(sheet, ref.a.r, ref.a.c);
      const size = this.spillSize.get(`${sheet}:${ref.a.r}:${ref.a.c}`) ?? { rows: 1, cols: 1 };
      return new Range(sheet, ref.a.r, ref.a.c, ref.a.r + size.rows - 1, ref.a.c + size.cols - 1);
    }
    const b = ref.b ?? ref.a;
    // Whole columns stop at the last row in use
    const lastRow = Math.max(this.sizes[sheet].rows - 1, 0);
    const r1 = ref.a.r ?? 0;
    const r2 = b.r ?? lastRow;
    return new Range(sheet, Math.min(r1, r2), Math.min(ref.a.c, b.c), Math.max(r1, r2), Math.max(ref.a.c, b.c));
  }

  // ---------- Filters, slicers, conditional formatting and charts, as shown and as marked ----------

  private hiddenCache = new Map<number, Set<number>>();
  // The rows a sheet's filter and slicers hide
  hiddenRows(sheet: number): Set<number> {
    const cached = this.hiddenCache.get(sheet);
    if (cached) return cached;
    const hidden = new Set<number>();
    const sh = this.wb.sheets[sheet];
    const shownText = (v: CellValue) => (v === null ? '' : toText(v));
    const f = sh?.filter;
    const area = f ? parseRange(f.ref) : null;
    if (f && area) {
      for (const [off, crit] of Object.entries(f.criteria)) {
        const c = area.c1 + Number(off);
        const col: CellValue[] = [];
        for (let r = area.r1 + 1; r <= area.r2; r++) col.push(this.value(sheet, r, c));
        const nums = col.filter((v): v is number => typeof v === 'number').sort((x, y) => x - y);
        const n = Number(crit.value ?? 10);
        const cut = crit.op === 'top' ? nums[Math.max(nums.length - n, 0)] : crit.op === 'bottom' ? nums[Math.min(n, nums.length) - 1] : undefined;
        col.forEach((v, i) => {
          const r = area.r1 + 1 + i;
          let keep = true;
          if (crit.values) keep = crit.values.some((x) => x.toLowerCase() === shownText(v).toLowerCase());
          else if (crit.op === 'blank') keep = v === null || v === '';
          else if (crit.op === 'nonblank') keep = !(v === null || v === '');
          else if (crit.op === 'contains') keep = shownText(v).toLowerCase().includes(String(crit.value ?? '').toLowerCase());
          else if (crit.op === 'top') keep = typeof v === 'number' && cut !== undefined && v >= cut;
          else if (crit.op === 'bottom') keep = typeof v === 'number' && cut !== undefined && v <= cut;
          else if (crit.op) {
            const want = literal(String(crit.value ?? ''));
            const d = compare(v, want);
            const comparable = typeof want === 'number' ? typeof v === 'number' : true;
            keep = comparable && (crit.op === '>' ? d > 0 : crit.op === '<' ? d < 0 : crit.op === '>=' ? d >= 0 : crit.op === '<=' ? d <= 0 : crit.op === '=' ? d === 0 : d !== 0);
          }
          if (!keep) hidden.add(r);
        });
      }
    }
    for (const sl of sh?.slicers ?? []) {
      if (!sl.selected.length) continue;
      const t = this.table(sl.table);
      if (!t || t.sheet !== sheet) continue;
      let c = -1;
      for (let j = t.r.c1; j <= t.r.c2; j++) if (toText(this.value(sheet, t.r.r1, j)).toLowerCase() === sl.column.toLowerCase()) c = j;
      if (c < 0) continue;
      for (let r = t.r.r1 + 1; r <= t.r.r2; r++) if (!sl.selected.some((x) => x.toLowerCase() === shownText(this.value(sheet, r, c)).toLowerCase())) hidden.add(r);
    }
    this.hiddenCache.set(sheet, hidden);
    return hidden;
  }

  filterText(sheet: number): string {
    const sh = this.wb.sheets[sheet];
    const area = sh?.filter ? parseRange(sh.filter.ref) : null;
    if (!sh?.filter || !area) return '';
    return Object.entries(sh.filter.criteria)
      .map(([off, c]) => {
        const head = toText(this.value(sheet, area.r1, area.c1 + Number(off)));
        if (c.values) return `${head}=${c.values.join(',')}`;
        if (c.op === 'blank' || c.op === 'nonblank') return `${head} ${c.op}`;
        return `${head}${c.op === 'contains' || c.op === 'top' || c.op === 'bottom' ? ` ${c.op} ` : c.op}${c.value ?? ''}`;
      })
      .join('; ');
  }

  private ruleStats = new Map<CondFormat, { nums: number[]; counts: Map<string, number> }>();
  // The colour a cell is shown in by the sheet's conditional formatting (the first rule it meets), and for a colour
  // scale how far along it is (0 to 1)
  condStyle(sheet: number, r: number, c: number): { style: CondFormat['style']; scale?: number } | null {
    for (const f of this.wb.sheets[sheet]?.conditional ?? []) {
      const area = parseRange(f.ref);
      if (!area || r < area.r1 || r > area.r2 || c < area.c1 || c > area.c2) continue;
      const v = this.value(sheet, r, c);
      let stats = this.ruleStats.get(f);
      if (!stats) {
        const all: CellValue[] = [];
        for (let i = area.r1; i <= area.r2; i++) for (let j = area.c1; j <= area.c2; j++) all.push(this.value(sheet, i, j));
        const counts = new Map<string, number>();
        for (const x of all) if (x !== null && x !== '') counts.set(toText(x).toLowerCase(), (counts.get(toText(x).toLowerCase()) ?? 0) + 1);
        stats = { nums: all.filter((x): x is number => typeof x === 'number').sort((a, b) => a - b), counts };
        this.ruleStats.set(f, stats);
      }
      const n = typeof v === 'number' ? v : null;
      const a = parseNumber(f.value ?? '');
      const b = parseNumber(f.value2 ?? '');
      const k = Math.max(1, Math.round(a ?? 10));
      const mean = stats.nums.length ? stats.nums.reduce((x, y) => x + y, 0) / stats.nums.length : 0;
      let hit = false;
      switch (f.rule) {
        case 'greater':
          hit = n !== null && a !== null && n > a;
          break;
        case 'less':
          hit = n !== null && a !== null && n < a;
          break;
        case 'between':
          hit = n !== null && a !== null && b !== null && n >= Math.min(a, b) && n <= Math.max(a, b);
          break;
        case 'equal':
          hit = a !== null ? n === a : v !== null && toText(v).toLowerCase() === String(f.value ?? '').toLowerCase();
          break;
        case 'contains':
          hit = v !== null && toText(v).toLowerCase().includes(String(f.value ?? '').toLowerCase());
          break;
        case 'duplicate':
          hit = v !== null && v !== '' && (stats.counts.get(toText(v).toLowerCase()) ?? 0) > 1;
          break;
        case 'unique':
          hit = v !== null && v !== '' && stats.counts.get(toText(v).toLowerCase()) === 1;
          break;
        case 'top':
          hit = n !== null && n >= stats.nums[Math.max(stats.nums.length - k, 0)];
          break;
        case 'bottom':
          hit = n !== null && n <= stats.nums[Math.min(k, stats.nums.length) - 1];
          break;
        case 'above':
          hit = n !== null && n > mean;
          break;
        case 'below':
          hit = n !== null && n < mean;
          break;
        case 'blank':
          hit = v === null || v === '';
          break;
        case 'scale': {
          if (n === null || !stats.nums.length) break;
          const lo = stats.nums[0];
          const hi = stats.nums[stats.nums.length - 1];
          return { style: f.style, scale: hi === lo ? 1 : (n - lo) / (hi - lo) };
        }
      }
      if (hit) return { style: f.style };
    }
    return null;
  }

  // A chart's categories and series, read from its range
  chartData(sheet: number, ch: SheetChart): { categories: string[]; series: { name: string; values: number[] }[] } | null {
    const r = parseRange(ch.ref);
    if (!r) return null;
    const hidden = this.hiddenRows(sheet);
    const rows: number[] = [];
    for (let i = r.r1 + 1; i <= r.r2; i++) if (!hidden.has(i)) rows.push(i);
    const categories = rows.map((i) => toText(this.value(sheet, i, r.c1)));
    const series = [];
    for (let j = r.c1 + 1; j <= r.c2; j++)
      series.push({
        name: toText(this.value(sheet, r.r1, j)),
        values: rows.map((i) => {
          const v = this.value(sheet, i, j);
          return typeof v === 'number' ? v : parseNumber(toText(v)) ?? 0;
        }),
      });
    return { categories, series };
  }

  chartText(sheet: number, ch: SheetChart): string {
    const r = parseRange(ch.ref);
    if (!r) return ch.kind;
    const cat = toText(this.value(sheet, r.r1, r.c1));
    const series: string[] = [];
    for (let j = r.c1 + 1; j <= r.c2; j++) series.push(toText(this.value(sheet, r.r1, j)));
    return `${ch.kind} ${cat} by ${series.join(', ')}${ch.title ? ` "${ch.title}"` : ''}`.toLowerCase();
  }

  // A table by name, on any sheet, or the table the cell being worked out sits in
  table(name?: string): { sheet: number; t: SheetTable; r: { r1: number; c1: number; r2: number; c2: number } } | null {
    for (let i = 0; i < this.wb.sheets.length; i++)
      for (const t of this.wb.sheets[i].tables ?? []) {
        const r = parseRange(t.ref);
        if (!r) continue;
        if (name ? t.name.toLowerCase() === name.toLowerCase() : this.here && this.here.sheet === i && this.here.r >= r.r1 && this.here.r <= r.r2 && this.here.c >= r.c1 && this.here.c <= r.c2)
          return { sheet: i, t, r };
      }
    return null;
  }

  private tableRange(ref: TableRef): Range | SheetError {
    const found = this.table(ref.table);
    if (!found) return err('#REF!');
    const { sheet, r } = found;
    const colOf = (name?: string) => {
      if (name === undefined) return null;
      for (let c = r.c1; c <= r.c2; c++) if (toText(literal(this.raw(sheet, r.r1, c))).trim().toLowerCase() === name.trim().toLowerCase()) return c;
      return -1;
    };
    const a = colOf(ref.c1);
    const b = ref.c2 !== undefined ? colOf(ref.c2) : a;
    if (a === -1 || b === -1) return err('#REF!');
    const c1 = a ?? r.c1;
    const c2 = b ?? r.c2;
    if (ref.part === 'this') {
      if (!this.here || this.here.sheet !== sheet || this.here.r <= r.r1 || this.here.r > r.r2) return err('#VALUE!');
      return new Range(sheet, this.here.r, Math.min(c1, c2), this.here.r, Math.max(c1, c2));
    }
    const r1 = ref.part === 'data' ? r.r1 + 1 : r.r1;
    const r2 = ref.part === 'headers' ? r.r1 : r.r2;
    return new Range(sheet, r1, Math.min(c1, c2), Math.max(r1, r2), Math.max(c1, c2));
  }

  private grid(r: Range): CellValue[][] {
    const out: CellValue[][] = [];
    for (let i = r.r1; i <= r.r2; i++) {
      const row: CellValue[] = [];
      for (let j = r.c1; j <= r.c2; j++) row.push(this.value(r.sheet, i, j));
      out.push(row);
    }
    return out;
  }

  private cells(r: Range): CellValue[] {
    return this.grid(r).flat();
  }

  private eval(node: Node, sheet: number): Evaluated {
    switch (node.k) {
      case 'num':
        return node.v;
      case 'str':
        return node.v;
      case 'bool':
        return node.v;
      case 'err':
        return err(node.v);
      case 'ref':
        return this.range(node.v, sheet);
      case 'sref':
        return this.tableRange(node.v);
      case 'val':
        return node.v;
      case 'neg': {
        const a = this.eval(node.a, sheet);
        if (this.isMulti(a)) return new Arr(this.mat(a).map((row) => row.map((v) => this.binary('*', v, -1))));
        const n = toNumber(this.single(a));
        return isErr(n) ? n : -n;
      }
      case 'pct': {
        const n = toNumber(this.single(this.eval(node.a, sheet)));
        return isErr(n) ? n : n / 100;
      }
      case 'bin': {
        const a = this.eval(node.a, sheet);
        const b = this.eval(node.b, sheet);
        // Over ranges or arrays, cell by cell (a single value goes with every cell), as Excel's dynamic arrays do
        if (this.isMulti(a) || this.isMulti(b)) {
          const x = this.mat(a);
          const y = this.mat(b);
          const rows = Math.max(x.length, y.length);
          const cols = Math.max(x[0]?.length ?? 1, y[0]?.length ?? 1);
          const at = (m: CellValue[][], i: number, j: number): CellValue => {
            const ii = m.length === 1 ? 0 : i;
            const jj = (m[0]?.length ?? 1) === 1 ? 0 : j;
            return m[ii]?.[jj] === undefined ? err('#N/A') : m[ii][jj];
          };
          return new Arr(Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => this.binary(node.op, at(x, i, j), at(y, i, j)))));
        }
        return this.binary(node.op, this.single(a), this.single(b));
      }
      case 'fn':
        return this.call(node.name, node.args, sheet);
    }
  }

  private binary(op: string, a: CellValue, b: CellValue): CellValue {
    if (isErr(a)) return a;
    if (isErr(b)) return b;
    if (op === '&') return toText(a) + toText(b);
    if (['=', '<>', '<', '>', '<=', '>='].includes(op)) {
      const d = compare(a, b);
      return op === '=' ? d === 0 : op === '<>' ? d !== 0 : op === '<' ? d < 0 : op === '>' ? d > 0 : op === '<=' ? d <= 0 : d >= 0;
    }
    const x = toNumber(a);
    const y = toNumber(b);
    if (isErr(x)) return x;
    if (isErr(y)) return y;
    switch (op) {
      case '+':
        return x + y;
      case '-':
        return x - y;
      case '*':
        return x * y;
      case '/':
        return y === 0 ? err('#DIV/0!') : x / y;
      case '^':
        return x ** y;
    }
    return err('#VALUE!');
  }

  // Numbers to add up, count or average: from ranges only real numbers count; typed arguments are converted
  private numbers(args: Evaluated[]): number[] | SheetError {
    const out: number[] = [];
    for (const a of args) {
      if (a instanceof Range || a instanceof Arr) {
        for (const v of this.mat(a).flat()) {
          if (isErr(v)) return v;
          if (typeof v === 'number') out.push(v);
        }
      } else {
        const n = toNumber(a);
        if (isErr(n)) return n;
        out.push(n);
      }
    }
    return out;
  }

  private values(a: Evaluated): CellValue[] {
    return a instanceof Range || a instanceof Arr ? this.mat(a).flat() : [a];
  }

  private call(name: string, argNodes: Node[], sheet: number): Evaluated {
    // A function of single values given a range or array works cell by cell and returns an array, as in Excel 365
    if (LIFTED.has(name)) {
      const evaluated = argNodes.map((n) => this.eval(n, sheet));
      if (evaluated.some((v) => this.isMulti(v))) {
        const ms = evaluated.map((v) => this.mat(v));
        const rows = Math.max(...ms.map((m) => m.length));
        const cols = Math.max(...ms.map((m) => m[0]?.length ?? 1));
        const at = (m: CellValue[][], i: number, j: number): CellValue => m[m.length === 1 ? 0 : i]?.[(m[0]?.length ?? 1) === 1 ? 0 : j] ?? err('#N/A');
        return new Arr(
          Array.from({ length: rows }, (_, i) =>
            Array.from({ length: cols }, (_, j) => this.single(this.call(name, ms.map((m) => ({ k: 'val' as const, v: at(m, i, j) })), sheet)))
          )
        );
      }
    }
    const arg = (i: number) => (i < argNodes.length ? this.eval(argNodes[i], sheet) : null);
    const one = (i: number) => this.single(arg(i));
    const all = () => argNodes.map((n) => this.eval(n, sheet));
    const num = (i: number, fallback?: number): number | SheetError => (i >= argNodes.length && fallback !== undefined ? fallback : toNumber(one(i)));
    const text = (i: number): string | SheetError => {
      const v = one(i);
      return isErr(v) ? v : toText(v);
    };
    const need = (min: number, max = Infinity) => argNodes.length >= min && argNodes.length <= max;

    switch (name) {
      case 'SUM':
      case 'AVERAGE':
      case 'MIN':
      case 'MAX':
      case 'COUNT':
      case 'MEDIAN':
      case 'STDEV':
      case 'STDEV.S':
      case 'PRODUCT': {
        if (name === 'COUNT') {
          return all().reduce<number>((n, a) => n + this.values(a).filter((v) => typeof v === 'number' || (!(a instanceof Range || a instanceof Arr) && parseNumber(toText(v)) !== null)).length, 0);
        }
        const ns = this.numbers(all());
        if (isErr(ns)) return ns;
        if (name === 'SUM') return ns.reduce((s, n) => s + n, 0);
        if (name === 'PRODUCT') return ns.reduce((s, n) => s * n, 1);
        if (name === 'MIN') return ns.length ? Math.min(...ns) : 0;
        if (name === 'MAX') return ns.length ? Math.max(...ns) : 0;
        if (!ns.length) return err('#DIV/0!');
        const mean = ns.reduce((s, n) => s + n, 0) / ns.length;
        if (name === 'AVERAGE') return mean;
        if (name === 'MEDIAN') {
          const sorted = [...ns].sort((x, y) => x - y);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        }
        if (ns.length < 2) return err('#DIV/0!');
        return Math.sqrt(ns.reduce((s, n) => s + (n - mean) ** 2, 0) / (ns.length - 1));
      }
      // Excel's inclusive method: the value at position (n − 1) × k in the sorted list, between neighbours
      case 'QUARTILE':
      case 'QUARTILE.INC':
      case 'PERCENTILE':
      case 'PERCENTILE.INC': {
        const ns = this.numbers([arg(0)]);
        if (isErr(ns)) return ns;
        const k0 = one(1);
        if (isErr(k0)) return k0;
        const k = typeof k0 === 'number' ? k0 : parseNumber(toText(k0));
        if (k === null || !ns.length) return err('#NUM!');
        const p = name.startsWith('QUARTILE') ? Math.trunc(k) / 4 : k;
        if (p < 0 || p > 1) return err('#NUM!');
        const sorted = [...ns].sort((x, y) => x - y);
        const pos = (sorted.length - 1) * p;
        const lo = Math.floor(pos);
        return sorted[lo] + (sorted[Math.min(lo + 1, sorted.length - 1)] - sorted[lo]) * (pos - lo);
      }
      case 'COUNTA':
        return all().reduce<number>((n, a) => n + this.values(a).filter((v) => v !== null && v !== '').length, 0);
      case 'COUNTBLANK':
        return all().reduce<number>((n, a) => n + this.values(a).filter((v) => v === null || v === '').length, 0);
      case 'ROUND':
      case 'ROUNDUP':
      case 'ROUNDDOWN': {
        const n = num(0);
        const d = num(1, 0);
        if (isErr(n)) return n;
        if (isErr(d)) return d;
        return round(n, Math.trunc(d), name === 'ROUND' ? 'half' : name === 'ROUNDUP' ? 'up' : 'down');
      }
      case 'ABS':
      case 'INT':
      case 'SQRT': {
        const n = num(0);
        if (isErr(n)) return n;
        if (name === 'SQRT') return n < 0 ? err('#NUM!') : Math.sqrt(n);
        return name === 'ABS' ? Math.abs(n) : Math.floor(n);
      }
      case 'MOD': {
        const n = num(0);
        const d = num(1);
        if (isErr(n)) return n;
        if (isErr(d)) return d;
        return d === 0 ? err('#DIV/0!') : n - d * Math.floor(n / d);
      }
      case 'IF': {
        if (!need(2, 3)) return err('#N/A');
        const cond = toBool(one(0));
        if (isErr(cond)) return cond;
        return cond ? one(1) : argNodes.length > 2 ? one(2) : false;
      }
      case 'IFS': {
        for (let i = 0; i + 1 < argNodes.length; i += 2) {
          const cond = toBool(one(i));
          if (isErr(cond)) return cond;
          if (cond) return one(i + 1);
        }
        return err('#N/A');
      }
      case 'IFERROR': {
        const v = one(0);
        return isErr(v) ? one(1) : v;
      }
      case 'IFNA': {
        const v = one(0);
        return isErr(v) && v.code === '#N/A' ? one(1) : v;
      }
      case 'AND':
      case 'OR': {
        const bools: boolean[] = [];
        for (const a of all()) {
          for (const v of this.values(a)) {
            if (v === null || (a instanceof Range && typeof v === 'string')) continue;
            const b = toBool(v);
            if (isErr(b)) return b;
            bools.push(b);
          }
        }
        if (!bools.length) return err('#VALUE!');
        return name === 'AND' ? bools.every(Boolean) : bools.some(Boolean);
      }
      case 'NOT': {
        const b = toBool(one(0));
        return isErr(b) ? b : !b;
      }
      case 'SUMIF':
      case 'AVERAGEIF':
      case 'COUNTIF': {
        const range = arg(0);
        if (!(range instanceof Range)) return err('#VALUE!');
        const test = criterion(one(1));
        const checked = this.grid(range);
        if (name === 'COUNTIF') return checked.flat().filter(test).length;
        const sumArg = argNodes.length > 2 ? arg(2) : range;
        if (!(sumArg instanceof Range)) return err('#VALUE!');
        // The sum range takes the shape of the checked range, from its top-left cell
        const sums = this.grid(new Range(sumArg.sheet, sumArg.r1, sumArg.c1, sumArg.r1 + range.rows - 1, sumArg.c1 + range.cols - 1));
        const picked: number[] = [];
        checked.forEach((row, i) => row.forEach((v, j) => test(v) && typeof sums[i][j] === 'number' && picked.push(sums[i][j] as number)));
        if (name === 'SUMIF') return picked.reduce((s, n) => s + n, 0);
        return picked.length ? picked.reduce((s, n) => s + n, 0) / picked.length : err('#DIV/0!');
      }
      case 'SUMIFS':
      case 'AVERAGEIFS':
      case 'COUNTIFS': {
        const start = name === 'COUNTIFS' ? 0 : 1;
        const target = name === 'COUNTIFS' ? null : arg(0);
        if (target !== null && !(target instanceof Range)) return err('#VALUE!');
        const pairs: { range: Range; test: (v: CellValue) => boolean }[] = [];
        for (let i = start; i + 1 < argNodes.length; i += 2) {
          const r = arg(i);
          if (!(r instanceof Range)) return err('#VALUE!');
          pairs.push({ range: r, test: criterion(one(i + 1)) });
        }
        if (!pairs.length) return err('#N/A');
        const shape = target ?? pairs[0].range;
        if (pairs.some((p) => p.range.rows !== shape.rows || p.range.cols !== shape.cols)) return err('#VALUE!');
        const picked: CellValue[] = [];
        for (let i = 0; i < shape.rows; i++)
          for (let j = 0; j < shape.cols; j++) {
            if (pairs.every((p) => p.test(this.value(p.range.sheet, p.range.r1 + i, p.range.c1 + j))))
              picked.push(target ? this.value(target.sheet, target.r1 + i, target.c1 + j) : true);
          }
        if (name === 'COUNTIFS') return picked.length;
        const ns = picked.filter((v): v is number => typeof v === 'number');
        if (name === 'SUMIFS') return ns.reduce((s, n) => s + n, 0);
        return ns.length ? ns.reduce((s, n) => s + n, 0) / ns.length : err('#DIV/0!');
      }
      case 'VLOOKUP':
      case 'HLOOKUP': {
        const key = one(0);
        if (isErr(key)) return key;
        const table = arg(1);
        if (!(table instanceof Range)) return err('#VALUE!');
        const idx = num(2);
        if (isErr(idx)) return idx;
        // The fourth argument is range_lookup: TRUE or left out looks for the nearest match, FALSE for an exact one
        const approximate = argNodes.length > 3 ? toBool(one(3)) : true;
        if (isErr(approximate)) return approximate;
        const vertical = name === 'VLOOKUP';
        const span = vertical ? table.cols : table.rows;
        if (idx < 1 || idx > span) return err('#REF!');
        const length = vertical ? table.rows : table.cols;
        const keyAt = (i: number) => (vertical ? this.value(table.sheet, table.r1 + i, table.c1) : this.value(table.sheet, table.r1, table.c1 + i));
        let found = -1;
        if (!approximate) {
          const test = typeof key === 'string' ? criterion(key) : (v: CellValue) => compare(v, key) === 0 && v !== null;
          for (let i = 0; i < length && found < 0; i++) if (test(keyAt(i))) found = i;
        } else {
          // Like Excel's: assumes the first column is sorted and takes the last value not above the key
          for (let i = 0; i < length; i++) {
            const v = keyAt(i);
            if (v === null) continue;
            if (compare(v, key) > 0) break;
            found = i;
          }
        }
        if (found < 0) return err('#N/A');
        return vertical ? this.value(table.sheet, table.r1 + found, table.c1 + idx - 1) : this.value(table.sheet, table.r1 + idx - 1, table.c1 + found);
      }
      case 'XLOOKUP': {
        const key = one(0);
        if (isErr(key)) return key;
        const look = arg(1);
        const ret = arg(2);
        if (!(look instanceof Range) || !(ret instanceof Range)) return err('#VALUE!');
        const keys = this.cells(look);
        const i = keys.findIndex((v) => v !== null && compare(v, key) === 0);
        if (i < 0) return argNodes.length > 3 ? one(3) : err('#N/A');
        return look.cols === 1 ? this.value(ret.sheet, ret.r1 + i, ret.c1) : this.value(ret.sheet, ret.r1, ret.c1 + i);
      }
      case 'MATCH': {
        const key = one(0);
        if (isErr(key)) return key;
        const look = arg(1);
        if (!(look instanceof Range)) return err('#N/A');
        const type = num(2, 1);
        if (isErr(type)) return type;
        const keys = this.cells(look);
        if (type === 0) {
          const test = typeof key === 'string' ? criterion(key) : (v: CellValue) => v !== null && compare(v, key) === 0;
          const i = keys.findIndex(test);
          return i < 0 ? err('#N/A') : i + 1;
        }
        let found = -1;
        for (let i = 0; i < keys.length; i++) {
          if (keys[i] === null) continue;
          const d = compare(keys[i], key);
          if (type > 0 ? d > 0 : d < 0) break;
          found = i;
        }
        return found < 0 ? err('#N/A') : found + 1;
      }
      case 'INDEX': {
        const r = arg(0);
        if (!(r instanceof Range)) return err('#VALUE!');
        const row = num(1);
        const col = num(2, 1);
        if (isErr(row)) return row;
        if (isErr(col)) return col;
        // INDEX(column, n) and INDEX(row, n) both pick the nth cell
        const [i, j] = r.rows === 1 && argNodes.length < 3 ? [1, row] : [row, col];
        if (i < 1 || j < 1 || i > r.rows || j > r.cols) return err('#REF!');
        return this.value(r.sheet, r.r1 + i - 1, r.c1 + j - 1);
      }
      case 'TRIM': {
        const t = text(0);
        return isErr(t) ? t : t.trim().replace(/ +/g, ' ');
      }
      case 'CLEAN': {
        const t = text(0);
        return isErr(t) ? t : t.replace(/[\x00-\x1f]/g, '');
      }
      case 'UPPER':
      case 'LOWER':
      case 'PROPER': {
        const t = text(0);
        if (isErr(t)) return t;
        if (name === 'UPPER') return t.toUpperCase();
        if (name === 'LOWER') return t.toLowerCase();
        return t.toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_m, before, ch) => before + ch.toUpperCase());
      }
      case 'LEN': {
        const t = text(0);
        return isErr(t) ? t : t.length;
      }
      case 'LEFT':
      case 'RIGHT': {
        const t = text(0);
        const n = num(1, 1);
        if (isErr(t)) return t;
        if (isErr(n)) return n;
        return name === 'LEFT' ? t.slice(0, n) : n <= 0 ? '' : t.slice(-n);
      }
      case 'MID': {
        const t = text(0);
        const start = num(1);
        const n = num(2);
        if (isErr(t)) return t;
        if (isErr(start)) return start;
        if (isErr(n)) return n;
        return start < 1 ? err('#VALUE!') : t.substr(start - 1, n);
      }
      case 'FIND':
      case 'SEARCH': {
        const needle = text(0);
        const hay = text(1);
        const from = num(2, 1);
        if (isErr(needle)) return needle;
        if (isErr(hay)) return hay;
        if (isErr(from)) return from;
        const i = name === 'FIND' ? hay.indexOf(needle, from - 1) : hay.toLowerCase().indexOf(needle.toLowerCase(), from - 1);
        return i < 0 ? err('#VALUE!') : i + 1;
      }
      case 'SUBSTITUTE': {
        const t = text(0);
        const from = text(1);
        const to = text(2);
        if (isErr(t)) return t;
        if (isErr(from)) return from;
        if (isErr(to)) return to;
        return from === '' ? t : t.split(from).join(to);
      }
      case 'CONCAT':
      case 'CONCATENATE': {
        let out = '';
        for (const a of all())
          for (const v of this.values(a)) {
            if (isErr(v)) return v;
            out += toText(v);
          }
        return out;
      }
      case 'TEXTJOIN': {
        const sep = text(0);
        const skip = toBool(one(1));
        if (isErr(sep)) return sep;
        if (isErr(skip)) return skip;
        const parts: string[] = [];
        for (const a of argNodes.slice(2).map((n) => this.eval(n, sheet)))
          for (const v of this.values(a)) {
            if (isErr(v)) return v;
            if (skip && (v === null || v === '')) continue;
            parts.push(toText(v));
          }
        return parts.join(sep);
      }
      case 'EXACT': {
        const a = text(0);
        const b = text(1);
        if (isErr(a)) return a;
        if (isErr(b)) return b;
        return a === b;
      }
      case 'VALUE': {
        const v = one(0);
        if (typeof v === 'number') return v;
        const n = parseNumber(toText(v));
        return n === null ? err('#VALUE!') : n;
      }
      case 'TEXT': {
        const v = one(0);
        const f = text(1);
        if (isErr(v)) return v;
        if (isErr(f)) return f;
        return textFormat(v, f);
      }
      case 'YEAR':
      case 'MONTH':
      case 'DAY': {
        const parts = isoParts(one(0));
        if (!parts) return err('#VALUE!');
        return parts[name === 'YEAR' ? 0 : name === 'MONTH' ? 1 : 2];
      }
      case 'DATE': {
        const y = num(0);
        const m = num(1);
        const d = num(2);
        if (isErr(y)) return y;
        if (isErr(m)) return m;
        if (isErr(d)) return d;
        const date = new Date(Date.UTC(y, m - 1, d));
        return date.toISOString().slice(0, 10);
      }
      case 'ISBLANK': {
        const v = one(0);
        return v === null;
      }
      case 'ISNUMBER':
        return typeof one(0) === 'number';
      case 'ISTEXT':
        return typeof one(0) === 'string';
      case 'ISERROR':
        return isErr(one(0));
      case 'ISNA': {
        const v = one(0);
        return isErr(v) && v.code === '#N/A';
      }
      case 'ISFORMULA': {
        const node = argNodes[0];
        if (node?.k !== 'ref') return err('#VALUE!');
        const r = this.range(node.v, sheet);
        if (isErr(r)) return r;
        return this.raw(r.sheet, r.r1, r.c1).startsWith('=');
      }
      case 'ROWS':
      case 'COLUMNS': {
        const r = arg(0);
        if (!(r instanceof Range || r instanceof Arr)) return 1;
        return name === 'ROWS' ? r.rows : r.cols;
      }
      // SUBTOTAL leaves out rows a filter hides (and, from 101 up, rows hidden by hand too)
      case 'SUBTOTAL': {
        const fnNum = num(0);
        if (isErr(fnNum)) return fnNum;
        const kind = [, 'AVERAGE', 'COUNT', 'COUNTA', 'MAX', 'MIN', 'PRODUCT', 'STDEV', , , , 'SUM'][Math.trunc(fnNum) % 100 === 9 ? 11 : Math.trunc(fnNum) % 100];
        if (!kind) return err('#VALUE!');
        const visible: CellValue[] = [];
        for (const a of argNodes.slice(1).map((n) => this.eval(n, sheet))) {
          if (!(a instanceof Range)) return err('#VALUE!');
          const hidden = this.hiddenRows(a.sheet);
          for (let i = a.r1; i <= a.r2; i++) if (!hidden.has(i)) for (let j = a.c1; j <= a.c2; j++) visible.push(this.value(a.sheet, i, j));
        }
        const ns = visible.filter((v): v is number => typeof v === 'number');
        if (kind === 'COUNT') return ns.length;
        if (kind === 'COUNTA') return visible.filter((v) => v !== null && v !== '').length;
        if (kind === 'SUM') return ns.reduce((x, y) => x + y, 0);
        if (kind === 'PRODUCT') return ns.reduce((x, y) => x * y, 1);
        if (kind === 'MAX') return ns.length ? Math.max(...ns) : 0;
        if (kind === 'MIN') return ns.length ? Math.min(...ns) : 0;
        if (!ns.length) return err('#DIV/0!');
        const mean = ns.reduce((x, y) => x + y, 0) / ns.length;
        if (kind === 'AVERAGE') return mean;
        return ns.length < 2 ? err('#DIV/0!') : Math.sqrt(ns.reduce((x, y) => x + (y - mean) ** 2, 0) / (ns.length - 1));
      }
      // ---------- Dynamic arrays ----------
      case 'FILTER': {
        if (!need(2, 3)) return err('#N/A');
        const m = this.mat(arg(0));
        const inc = this.mat(arg(1));
        const byRow = inc.length === m.length && (inc[0]?.length ?? 0) === 1;
        const byCol = !byRow && inc.length === 1 && (inc[0]?.length ?? 0) === (m[0]?.length ?? 0);
        if (!byRow && !byCol) return err('#VALUE!');
        const keep = (v: CellValue) => {
          if (isErr(v)) return v;
          const b = typeof v === 'string' ? parseNumber(v) ?? toBool(v) : toBool(v);
          return isErr(b) ? false : !!b;
        };
        const flags = byRow ? inc.map((row) => keep(row[0])) : inc[0].map(keep);
        const bad = flags.find(isErr);
        if (bad) return bad as SheetError;
        const out = byRow ? m.filter((_, i) => flags[i]) : m.map((row) => row.filter((_, j) => flags[j]));
        if (!out.length || !out[0].length) return argNodes.length > 2 ? one(2) : err('#CALC!');
        return new Arr(out);
      }
      case 'UNIQUE': {
        const m = this.mat(arg(0));
        const byCol = argNodes.length > 1 ? toBool(one(1)) : false;
        const once = argNodes.length > 2 ? toBool(one(2)) : false;
        if (isErr(byCol)) return byCol;
        if (isErr(once)) return once;
        const lines = byCol ? m[0].map((_, j) => m.map((row) => row[j])) : m;
        const keyOf = (line: CellValue[]) => line.map((v) => toText(v).toLowerCase()).join('\u0001');
        const counts = new Map<string, number>();
        for (const l of lines) counts.set(keyOf(l), (counts.get(keyOf(l)) ?? 0) + 1);
        const seen = new Set<string>();
        const kept = lines.filter((l) => {
          const k = keyOf(l);
          if (seen.has(k) || (once && counts.get(k)! > 1)) return false;
          seen.add(k);
          return true;
        });
        if (!kept.length) return err('#CALC!');
        return new Arr(byCol ? kept[0].map((_, i) => kept.map((l) => l[i])) : kept);
      }
      case 'SORT': {
        const m = this.mat(arg(0));
        const idx = num(1, 1);
        const order = num(2, 1);
        const byCol = argNodes.length > 3 ? toBool(one(3)) : false;
        if (isErr(idx)) return idx;
        if (isErr(order)) return order;
        if (isErr(byCol)) return byCol;
        const lines = byCol ? m[0].map((_, j) => m.map((row) => row[j])) : m;
        if (idx < 1 || idx > (lines[0]?.length ?? 0)) return err('#VALUE!');
        const sorted = [...lines].sort((a, b) => compare(a[idx - 1], b[idx - 1]) * (order < 0 ? -1 : 1));
        return new Arr(byCol ? sorted[0].map((_, i) => sorted.map((l) => l[i])) : sorted);
      }
      case 'SORTBY': {
        const m = this.mat(arg(0));
        const keys: { col: CellValue[]; dir: number }[] = [];
        for (let i = 1; i < argNodes.length; i += 2) {
          const k = this.mat(arg(i)).map((row) => row[0]);
          const d = i + 1 < argNodes.length ? num(i + 1) : 1;
          if (isErr(d)) return d;
          if (k.length !== m.length) return err('#VALUE!');
          keys.push({ col: k, dir: d < 0 ? -1 : 1 });
        }
        const order = m.map((_, i) => i).sort((a, b) => {
          for (const k of keys) {
            const d = compare(k.col[a], k.col[b]) * k.dir;
            if (d) return d;
          }
          return a - b;
        });
        return new Arr(order.map((i) => m[i]));
      }
      case 'SEQUENCE': {
        const rows = num(0);
        const cols = num(1, 1);
        const start = num(2, 1);
        const step = num(3, 1);
        for (const n of [rows, cols, start, step]) if (isErr(n)) return n;
        const [R, C, S, T] = [rows, cols, start, step] as number[];
        if (R < 1 || C < 1) return err('#CALC!');
        return new Arr(Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => S + (i * C + j) * T)));
      }
      case 'SUMPRODUCT': {
        const ms = all().map((a) => this.mat(a));
        if (!ms.length) return err('#VALUE!');
        const rows = ms[0].length;
        const cols = ms[0][0]?.length ?? 0;
        if (ms.some((m) => m.length !== rows || (m[0]?.length ?? 0) !== cols)) return err('#VALUE!');
        let total = 0;
        for (let i = 0; i < rows; i++)
          for (let j = 0; j < cols; j++) {
            let prod = 1;
            for (const m of ms) {
              const v = m[i][j];
              if (isErr(v)) return v;
              prod *= typeof v === 'number' ? v : typeof v === 'boolean' ? Number(v) : 0;
            }
            total += prod;
          }
        return total;
      }
      case 'DATEVALUE': {
        const t = text(0);
        if (isErr(t)) return t;
        const iso = dateText(t);
        return iso ?? err('#VALUE!');
      }
      // ---------- Corprax's marking: what the candidate built besides cells ----------
      case 'PRAXA.TABLE': {
        const t = text(0);
        if (isErr(t)) return t;
        const found = this.table(t);
        return found ? `${this.wb.sheets[found.sheet].name}!${rangeText(found.r)}` : err('#N/A');
      }
      case 'PRAXA.TABLES':
        return this.wb.sheets.reduce((n, sh) => n + (sh.tables?.length ?? 0), 0);
      case 'PRAXA.CHARTS':
        return this.wb.sheets
          .flatMap((sh, i) => (sh.charts ?? []).map((ch) => this.chartText(i, ch)))
          .join(' | ');
      case 'PRAXA.CF': {
        const t = text(0);
        if (isErr(t)) return t;
        const i = this.sheetIndex(t, sheet);
        if (i < 0) return err('#REF!');
        return (this.wb.sheets[i].conditional ?? []).map((f) => `${f.rule}${f.value !== undefined && f.value !== '' ? ` ${f.value}` : ''}${f.value2 ? ` ${f.value2}` : ''} on ${f.ref}`).join(' | ');
      }
      case 'PRAXA.CFCOUNT': {
        // How many cells of a range a sheet's rules colour
        const node = argNodes[0];
        if (node?.k !== 'ref') return err('#VALUE!');
        const r = this.range(node.v, sheet);
        if (isErr(r)) return r;
        let n = 0;
        for (let i = r.r1; i <= r.r2; i++) for (let j = r.c1; j <= r.c2; j++) if (this.condStyle(r.sheet, i, j)) n++;
        return n;
      }
      case 'PRAXA.FILTER': {
        const t = text(0);
        if (isErr(t)) return t;
        const i = this.sheetIndex(t, sheet);
        if (i < 0) return err('#REF!');
        return this.filterText(i);
      }
      case 'PRAXA.VISIBLE': {
        const t = text(0);
        if (isErr(t)) return t;
        const i = this.sheetIndex(t, sheet);
        if (i < 0) return err('#REF!');
        const sh = this.wb.sheets[i];
        const area = parseRange(sh.filter?.ref ?? sh.tables?.[0]?.ref ?? '') ?? { r1: 0, r2: Math.max(this.sizes[i].rows - 1, 0) };
        const hidden = this.hiddenRows(i);
        let n = 0;
        for (let r = area.r1 + 1; r <= area.r2; r++) if (!hidden.has(r)) n++;
        return n;
      }
      case 'PRAXA.SLICERS':
        return this.wb.sheets.flatMap((sh) => (sh.slicers ?? []).map((sl) => `${sl.table}.${sl.column}${sl.selected.length ? `=${sl.selected.join(',')}` : ''}`)).join(' | ');
      case 'PRAXA.QUERIES':
        return (this.wb.queries ?? []).map((q) => `${q.name}: ${q.sources.join('+')} -> ${q.steps.map((st) => st.kind).join(', ')}${q.loadTo ? ` -> ${q.loadTo}` : ''}`).join(' | ');
      case 'PRAXA.FORMAT': {
        const node = argNodes[0];
        if (node?.k !== 'ref') return err('#VALUE!');
        const r = this.range(node.v, sheet);
        if (isErr(r)) return r;
        return this.wb.sheets[r.sheet].formats?.[cellAddr(r.r1, r.c1)] ?? 'general';
      }
    }
    return err('#NAME?');
  }
}

// ---------- Showing values ----------

// Functions of single values, applied cell by cell when given a range
const LIFTED = new Set(['LEN', 'TRIM', 'CLEAN', 'UPPER', 'LOWER', 'PROPER', 'LEFT', 'RIGHT', 'MID', 'FIND', 'SEARCH', 'SUBSTITUTE', 'VALUE', 'DATEVALUE', 'TEXT', 'EXACT', 'ISNUMBER', 'ISTEXT', 'ISBLANK', 'ISERROR', 'ISNA', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'ABS', 'INT', 'SQRT', 'MOD', 'YEAR', 'MONTH', 'DAY', 'IF', 'IFERROR', 'IFNA', 'NOT']);

// A date typed any common way, as Corprax holds dates (YYYY-MM-DD): 14/03/2026, 14-03-2026, 14 Mar 2026, Mar 14 2026,
// 2026-03-14, 14.03.26
export function dateText(text: string): string | null {
  const t = text.trim();
  const mon = (m: string) => MONTHS.findIndex((x) => x.toLowerCase() === m.slice(0, 3).toLowerCase()) + 1;
  const iso = (y: number, m: number, d: number) => {
    if (y < 100) y += 2000;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return m >= 1 && m <= 12 && dt.getUTCDate() === d ? dt.toISOString().slice(0, 10) : null;
  };
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(t);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(t);
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = /^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s-,]+(\d{2,4})$/.exec(t);
  if (m && mon(m[2])) return iso(+m[3], mon(m[2]), +m[1]);
  m = /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/.exec(t);
  if (m && mon(m[1])) return iso(+m[3], mon(m[1]), +m[2]);
  return null;
}

export function displayValue(v: CellValue, format: CellFormat = 'general'): string {
  if (isErr(v)) return v.code;
  if (typeof v !== 'number') return toText(v);
  switch (format) {
    case 'number':
      return v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'currency':
      return `${v < 0 ? '-' : ''}£${Math.abs(v).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'percent':
      return `${(v * 100).toLocaleString('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    default:
      return formatGeneral(v);
  }
}

export const isError = isErr;

// ---------- Marking ----------

// A check is a formula run against the finished workbook (as if on its first sheet) and the value it should give.
// Numbers match within a small tolerance; text ignores case and outer spaces; "a|b" accepts either
export function checkSheet(wb: Workbook, formula: string, expected: string): { passed: boolean; actual: string } {
  const v = new Calc(wb).result(formula.startsWith('=') ? formula : `=${formula}`, 0);
  const actual = isErr(v) ? v.code : toText(v);
  const passed = expected.split('|').some((want) => {
    const n = parseNumber(want);
    if (n !== null && typeof v === 'number') return Math.abs(v - n) <= 0.005 + Math.abs(n) * 0.0005;
    return actual.trim().toLowerCase() === want.trim().toLowerCase();
  });
  return { passed, actual };
}

// ---------- Changing the workbook ----------

// A copy of the workbook with some of one sheet's cells changed; an empty string clears a cell
export function setCells(wb: Workbook, sheet: number, updates: Record<string, string>): Workbook {
  const cells = { ...wb.sheets[sheet].cells };
  for (const [a, raw] of Object.entries(updates)) {
    if (raw === '') delete cells[a];
    else cells[a] = raw;
  }
  return { ...wb, sheets: wb.sheets.map((s, i) => (i === sheet ? { ...s, cells } : s)) };
}

// Rows or columns inserted (count > 0) or deleted (count < 0) on one sheet. Cells move, and every formula in the
// workbook follows the cells it pointed at; references to deleted cells become #REF!
export function shiftCells(wb: Workbook, sheet: number, axis: 'row' | 'col', at: number, count: number): Workbook {
  const n = Math.abs(count);
  const target = wb.sheets[sheet].name.toLowerCase();
  const movePoint = (p: number): number | null => {
    if (count > 0) return p >= at ? p + count : p;
    if (p < at) return p;
    return p >= at + n ? p - n : null;
  };
  const moveSpan = (p1: number, p2: number): [number, number] | null => {
    if (count > 0) return [movePoint(p1)!, movePoint(p2)!];
    const a = p1 < at ? p1 : p1 >= at + n ? p1 - n : at;
    const b = p2 < at ? p2 : p2 >= at + n ? p2 - n : at - 1;
    return b < a ? null : [a, b];
  };
  const fixFormula = (raw: string, onSheet: number) =>
    rewriteRefs(raw, (ref) => {
      const pointsHere = ref.sheet === undefined ? onSheet === sheet : ref.sheet.toLowerCase() === target;
      if (!pointsHere) return ref;
      const key = axis === 'row' ? 'r' : 'c';
      const a = ref.a[key];
      if (a === null) return ref; // whole columns stretch across inserted and deleted rows
      if (!ref.b) {
        const moved = movePoint(a);
        return moved === null ? null : { ...ref, a: { ...ref.a, [key]: moved } };
      }
      const span = moveSpan(a, ref.b[key] as number);
      if (!span) return null;
      return { ...ref, a: { ...ref.a, [key]: span[0] }, b: { ...ref.b, [key]: span[1] } };
    });

  // A range on the changed sheet (a table, filter, rule or chart) stretches or shrinks with the rows or columns
  const fixRange = (ref: string): string | null => {
    const r = parseRange(ref);
    if (!r) return ref;
    const [p1, p2] = axis === 'row' ? [r.r1, r.r2] : [r.c1, r.c2];
    const span = moveSpan(p1, p2);
    if (!span) return null;
    return rangeText(axis === 'row' ? { ...r, r1: span[0], r2: span[1] } : { ...r, c1: span[0], c2: span[1] });
  };
  const keep = <T extends { ref: string }>(xs: T[] | undefined) => xs?.flatMap((x) => {
    const ref = fixRange(x.ref);
    return ref ? [{ ...x, ref }] : [];
  });
  return {
    ...wb,
    sheets: wb.sheets.map((s, i) => {
      if (i === sheet) {
        const filterRef = s.filter ? fixRange(s.filter.ref) : null;
        s = { ...s, tables: keep(s.tables), conditional: keep(s.conditional), charts: keep(s.charts), filter: s.filter && filterRef ? { ...s.filter, ref: filterRef } : undefined };
      }
      const cells: Record<string, string> = {};
      for (const [a, raw] of Object.entries(s.cells)) {
        const fixed = fixFormula(raw, i);
        const p = parseAddr(a)!;
        if (i !== sheet) {
          cells[a] = fixed;
          continue;
        }
        const moved = movePoint(axis === 'row' ? p.r : p.c);
        if (moved === null) continue;
        cells[axis === 'row' ? cellAddr(moved, p.c) : cellAddr(p.r, moved)] = fixed;
      }
      const formats = s.formats
        ? Object.fromEntries(
            Object.entries(s.formats).flatMap(([a, f]) => {
              const p = parseAddr(a)!;
              if (i !== sheet) return [[a, f]];
              const moved = movePoint(axis === 'row' ? p.r : p.c);
              return moved === null ? [] : [[axis === 'row' ? cellAddr(moved, p.c) : cellAddr(p.r, moved), f]];
            })
          )
        : undefined;
      return { ...s, cells, formats };
    }),
  };
}

// Rows of one sheet rearranged: row order[i] (counted from `from`) ends up at position i. Formulas move with
// their rows, their relative references with them, as when Excel sorts. Rows past the end of order are cleared.
export function reorderRows(wb: Workbook, sheet: number, from: number, order: number[], total: number): Workbook {
  const s = wb.sheets[sheet];
  const cells: Record<string, string> = {};
  const formats: Record<string, CellFormat> = {};
  for (const [a, raw] of Object.entries(s.cells)) {
    const p = parseAddr(a)!;
    if (p.r < from || p.r >= from + total) cells[a] = raw;
  }
  for (const [a, f] of Object.entries(s.formats ?? {})) {
    const p = parseAddr(a)!;
    if (p.r < from || p.r >= from + total) formats[a] = f;
  }
  order.forEach((src, i) => {
    const dr = i - src;
    for (const [a, raw] of Object.entries(s.cells)) {
      const p = parseAddr(a)!;
      if (p.r !== from + src) continue;
      cells[cellAddr(from + i, p.c)] = shiftFormula(raw, dr, 0);
    }
    for (const [a, f] of Object.entries(s.formats ?? {})) {
      const p = parseAddr(a)!;
      if (p.r === from + src) formats[cellAddr(from + i, p.c)] = f;
    }
  });
  return { ...wb, sheets: wb.sheets.map((x, i) => (i === sheet ? { ...x, cells, formats } : x)) };
}

// A sheet name that isn't taken yet: "Pivot", "Pivot (2)"...
export function freeSheetName(wb: Workbook, wanted: string): string {
  const base = wanted.replace(/[\\/?*[\]:!']/g, ' ').trim().slice(0, 28) || 'Sheet';
  const taken = new Set(wb.sheets.map((s) => s.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base} (${i})`.toLowerCase())) return `${base} (${i})`;
}
