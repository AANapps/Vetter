/**
 * Flash Fill (Ctrl+E), as Excel does it: from the examples typed at the top of a column, works out how each is made
 * from the other cells in its row (words picked out, initials, changes of case, text in between) and fills the rest of
 * the column the same way. Returns null when no single pattern explains every example.
 */

type Case = 'same' | 'lower' | 'upper' | 'proper';
type Piece =
  | { kind: 'lit'; text: string }
  | { kind: 'cell'; col: number; mode: Case }
  | { kind: 'tok'; col: number; idx: number; fromEnd: boolean; mode: Case; first: boolean };

const CASES: Case[] = ['same', 'lower', 'upper', 'proper'];
const words = (s: string) => s.match(/[A-Za-z0-9À-ÿ']+/g) ?? [];
const withCase = (s: string, mode: Case) =>
  mode === 'lower' ? s.toLowerCase() : mode === 'upper' ? s.toUpperCase() : mode === 'proper' ? s.toLowerCase().replace(/(^|[^a-zà-ÿ'])([a-zà-ÿ])/g, (_m, a, b) => a + b.toUpperCase()) : s;

function run(p: Piece, row: string[]): string | null {
  if (p.kind === 'lit') return p.text;
  const cell = (row[p.col] ?? '').trim();
  if (p.kind === 'cell') return cell ? withCase(cell, p.mode) : null;
  const ws = words(cell);
  const w = p.fromEnd ? ws[ws.length - 1 - p.idx] : ws[p.idx];
  if (!w) return null;
  return withCase(p.first ? w[0] : w, p.mode);
}

const program = (ps: Piece[], row: string[]) => {
  let out = '';
  for (const p of ps) {
    const v = run(p, row);
    if (v === null) return null;
    out += v;
  }
  return out;
};

// Every way the start of the example (from position i) can be made from one piece of the row
function options(example: string, i: number, row: string[]): { piece: Piece; len: number }[] {
  const out: { piece: Piece; len: number }[] = [];
  row.forEach((raw, col) => {
    const cell = (raw ?? '').trim();
    if (!cell) return;
    const ws = words(cell);
    for (const mode of CASES) {
      const whole = withCase(cell, mode);
      if (whole.length > 1 && example.startsWith(whole, i)) out.push({ piece: { kind: 'cell', col, mode }, len: whole.length });
      ws.forEach((w, idx) => {
        for (const first of [false, true]) {
          const text = withCase(first ? w[0] : w, mode);
          if (!example.startsWith(text, i)) continue;
          for (const fromEnd of [false, true])
            out.push({ piece: { kind: 'tok', col, idx: fromEnd ? ws.length - 1 - idx : idx, fromEnd, mode, first }, len: text.length });
        }
      });
    }
  });
  // Longer matches first, so the simplest programs are found first
  return out.sort((a, b) => b.len - a.len);
}

function programsFor(example: string, row: string[], limit = 400): Piece[][] {
  const found: Piece[][] = [];
  const walk = (i: number, acc: Piece[]) => {
    if (found.length >= limit) return;
    if (i >= example.length) {
      found.push(acc);
      return;
    }
    for (const o of options(example, i, row)) walk(i + o.len, [...acc, o.piece]);
    // Or the next character is typed as it is
    const last = acc[acc.length - 1];
    const lit = last?.kind === 'lit' ? [...acc.slice(0, -1), { kind: 'lit' as const, text: last.text + example[i] }] : [...acc, { kind: 'lit' as const, text: example[i] }];
    walk(i + 1, lit);
  };
  walk(0, []);
  const literal = (ps: Piece[]) => ps.reduce((n, p) => n + (p.kind === 'lit' ? p.text.length : 0), 0);
  return found.sort((a, b) => literal(a) - literal(b) || a.length - b.length);
}

// rows: each row's other cells; examples: row index → what was typed. The filled values for every row, or null
export function flashFill(rows: string[][], examples: Record<number, string>): string[] | null {
  const given = Object.entries(examples).map(([i, v]) => [Number(i), v] as const).filter(([, v]) => v.trim() !== '');
  if (!given.length) return null;
  const [first, ...rest] = given;
  for (const ps of programsFor(first[1], rows[first[0]] ?? [])) {
    if (rest.every(([i, v]) => program(ps, rows[i] ?? []) === v)) return rows.map((row, i) => examples[i]?.trim() ? examples[i] : program(ps, row) ?? '');
  }
  return null;
}
