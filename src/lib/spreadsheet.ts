/**
 * The spreadsheet behind spreadsheet tasks: a workbook of sheets whose cells hold what the candidate typed,
 * and a formula engine that works them out the way Excel does (references, ranges, the common functions,
 * relative references that move when copied). Tasks are marked by formulas run against the finished workbook.
 */

export type CellFormat = 'general' | 'number' | 'currency' | 'percent';

export interface Sheet {
  name: string;
  // What was typed in each cell, by address ("B2"): a value, or a formula starting with "="
  cells: Record<string, string>;
  formats?: Record<string, CellFormat>;
}

export interface Workbook {
  sheets: Sheet[];
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
}

type Token =
  | { t: 'num'; v: number; pos: number; end: number }
  | { t: 'str'; v: string; pos: number; end: number }
  | { t: 'bool'; v: boolean; pos: number; end: number }
  | { t: 'err'; v: string; pos: number; end: number }
  | { t: 'ref'; v: RefToken; pos: number; end: number }
  | { t: 'func'; v: string; pos: number; end: number }
  | { t: 'op'; v: string; pos: number; end: number }
  | { t: 'name'; v: string; pos: number; end: number };

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
  return `${ref.sheet !== undefined ? `${quoteSheet(ref.sheet)}!` : ''}${writePart(ref.a)}${ref.b ? `:${writePart(ref.b)}` : ''}`;
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

type Evaluated = CellValue | Range;

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

  constructor(private wb: Workbook) {
    this.sizes = wb.sheets.map(usedSize);
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
    if (!raw.startsWith('=') || raw.length === 1) {
      const v = literal(raw);
      this.cache.set(key, v);
      return v;
    }
    if (this.visiting.has(key)) return err('#CIRC!');
    this.visiting.add(key);
    const v = this.single(this.evalFormula(raw, sheet));
    this.visiting.delete(key);
    this.cache.set(key, v);
    return v;
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
    if (!(v instanceof Range)) return v;
    if (v.rows === 1 && v.cols === 1) return this.value(v.sheet, v.r1, v.c1);
    return err('#VALUE!');
  }

  private range(ref: RefToken, current: number): Range | SheetError {
    const sheet = this.sheetIndex(ref.sheet, current);
    if (sheet < 0) return err('#REF!');
    const b = ref.b ?? ref.a;
    // Whole columns stop at the last row in use
    const lastRow = Math.max(this.sizes[sheet].rows - 1, 0);
    const r1 = ref.a.r ?? 0;
    const r2 = b.r ?? lastRow;
    return new Range(sheet, Math.min(r1, r2), Math.min(ref.a.c, b.c), Math.max(r1, r2), Math.max(ref.a.c, b.c));
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
      case 'neg': {
        const n = toNumber(this.single(this.eval(node.a, sheet)));
        return isErr(n) ? n : -n;
      }
      case 'pct': {
        const n = toNumber(this.single(this.eval(node.a, sheet)));
        return isErr(n) ? n : n / 100;
      }
      case 'bin':
        return this.binary(node.op, this.single(this.eval(node.a, sheet)), this.single(this.eval(node.b, sheet)));
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
      if (a instanceof Range) {
        for (const v of this.cells(a)) {
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
    return a instanceof Range ? this.cells(a) : [a];
  }

  private call(name: string, argNodes: Node[], sheet: number): Evaluated {
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
          return all().reduce<number>((n, a) => n + this.values(a).filter((v) => typeof v === 'number' || (!(a instanceof Range) && parseNumber(toText(v)) !== null)).length, 0);
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
        if (!(r instanceof Range)) return 1;
        return name === 'ROWS' ? r.rows : r.cols;
      }
    }
    return err('#NAME?');
  }
}

// ---------- Showing values ----------

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
  return { sheets: wb.sheets.map((s, i) => (i === sheet ? { ...s, cells } : s)) };
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

  return {
    sheets: wb.sheets.map((s, i) => {
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
  return { sheets: wb.sheets.map((x, i) => (i === sheet ? { ...x, cells, formats } : x)) };
}

// A sheet name that isn't taken yet: "Pivot", "Pivot (2)"...
export function freeSheetName(wb: Workbook, wanted: string): string {
  const base = wanted.replace(/[\\/?*[\]:!']/g, ' ').trim().slice(0, 28) || 'Sheet';
  const taken = new Set(wb.sheets.map((s) => s.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base} (${i})`.toLowerCase())) return `${base} (${i})`;
}
