// Question text often carries data laid out in columns with spaces (a log, a results table, a confusion matrix).
// That only lines up in a fixed-width font, so it's split into blocks: plain text, and tables wherever several
// consecutive lines share the same columns. Delimited files (commas, semicolons) are left as they are, since reading
// the raw file is often the point of the question.

export type TextBlock = { kind: 'text'; text: string } | { kind: 'table'; head?: string[]; rows: string[][] };

const SPLIT = /\t+| {2,}/;

const parse = (line: string) => {
  const body = line.trim();
  const cells = body ? body.split(SPLIT) : [];
  const gaps = body.match(/\t+| {2,}/g)?.map((g) => (g.includes('\t') ? 9 : g.length)) ?? [];
  return { indented: /^( {2,}|\t)/.test(line), cells, gaps };
};

// A number, an amount or a percentage, with optional unit: 1,620 · £182,000 · −£8,000 · 89.0% · 0.41 · 3 s
export const isNumeric = (cell: string) =>
  /^[-−+]?[£$€]?\d[\d,.]*(%|[kmb]|p|\s?[a-z]{1,3})?$/i.test(cell.trim()) || /^[-−+]?[£$€]\d/.test(cell.trim());

const looksLikeCode = (line: string) =>
  /[{};]\s*$|^\s*[\w.\[\]'\"]+\s*=\s|\s#\s|^\s*for .+ in .+:|\w\(.*\)\s*(#.*)?$|^\s*(def |function |const |let |var |import |return |if \(|for \(|SELECT |FROM |WHERE |JOIN |ON |GROUP BY|ORDER BY|print\()/.test(
    line,
  );

// Where each cell starts in a line: the first character after the line's start or a gap of two or more spaces
const starts = (line: string) => {
  const out: number[] = [];
  const re = /(^|\t| {2,})(\S)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m.index + m[1].length);
  return out;
};

// A line that belongs in a table: at least two cells, clearly spaced, and not code
const tabular = (line: string) => {
  // An agent's trace ("Step 1  search_orders(…)  → 14 results") is data, though its cells hold calls
  if (!line.trim() || (looksLikeCode(line) && !/^Step \d+ {2,}/.test(line))) return false;
  const p = parse(line);
  // Two columns count when clearly spaced apart, or when both are short (not a log line like "Nov  4 02:11 sshd…")
  return p.cells.length >= 3 || (p.cells.length === 2 && (p.gaps.every((g) => g >= 3) || p.cells.every((c) => c.length <= 24)));
};

export function splitTables(text: string): TextBlock[] {
  const lines = text.split('\n');
  const blocks: TextBlock[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (buffer.length) blocks.push({ kind: 'text', text: buffer.join('\n') });
    buffer = [];
  };
  let i = 0;
  while (i < lines.length) {
    // A run of tabular lines (a header with an empty corner, shown by leading spaces, counts too)
    let j = i;
    while (
      j < lines.length &&
      (tabular(lines[j]) || (j === i && /^ {2,}\S/.test(lines[j]) && j + 1 < lines.length && tabular(lines[j + 1])))
    )
      j++;
    const run = lines.slice(i, j);
    if (run.length >= 2) {
      // Columns from the line with the most cells; every line is cut at those positions
      const widest = run.reduce((best, l) => (starts(l).length > starts(best).length ? l : best), run[0]);
      const cols = starts(widest);
      const cut = (l: string) => cols.map((c, k) => l.slice(c, k + 1 < cols.length ? cols[k + 1] : undefined).trim());
      // A cut through the middle of a word means the line isn't aligned to these columns
      // The character before each column must be a space (or the line has ended): a cut through a word means the
      // line isn't aligned to these columns
      const aligned = (l: string) => cols.slice(1).every((c) => c >= l.length || l[c - 1] === ' ');
      const rowsAligned = run.filter(aligned).length;
      if (rowsAligned >= Math.ceil(run.length * 0.75)) {
        flush();
        const rows = run.map((l) => (aligned(l) ? cut(l) : [...parse(l).cells, ...Array(cols.length).fill('')].slice(0, cols.length)));
        pushTable(rows, /^ {2,}\S/.test(run[0]) && rows[0][0] === '');
        i = j;
        continue;
      }
      // Not lined up by position (numbers right-aligned under a left-aligned header, uneven log lines): split on the
      // gaps instead, an indented first line being a header with an empty corner, and short rows padded
      flush();
      const split = run.map((l) => parse(l).cells);
      const corner = /^ {2,}\S/.test(run[0]) && split.length > 1 && split[0].length === split[1].length - 1;
      if (corner) split[0] = ['', ...split[0]];
      const width = Math.max(...split.map((r) => r.length));
      pushTable(
        split.map((r) => [...r, ...Array(width - r.length).fill('')]),
        corner,
      );
      i = j;
      continue;
    }
    buffer.push(lines[i]);
    i++;
  }
  flush();
  return blocks;

  function pushTable(rows: string[][], corner: boolean) {
    const top = rows[0];
    const later = rows.slice(1);
    const shape = (c: string) => c.replace(/\d/g, '9').replace(/[a-z]/gi, 'a');
    // The top row is a header when it's the corner kind, or holds no numbers while the rows below do, and doesn't
    // look like the rows below (a log's first line is data: "22:58" has the same shape as "23:02")
    const sameShape = later.length > 0 && /\d/.test(top[0]) && later.every((r) => shape(r[0]) === shape(top[0]));
    const head = corner || (!sameShape && top.every((c) => !isNumeric(c)) && later.some((r) => r.some(isNumeric))) ? top : undefined;
    blocks.push({ kind: 'table', ...(head && { head }), rows: head ? later : rows });
  }
}
