import { Query, QueryStep, dateText, parseNumber } from './spreadsheet';
import { parseCsv } from './csv';
import { parseTsv } from './deskData';

/**
 * Power Query, as the spreadsheet's Get Data: a query reads one or more files (several are appended, matched by their
 * headers, as Combine Files does), then runs its applied steps in order. The result loads to a sheet, and Refresh runs
 * every query again on the files as they are now.
 */

export interface QueryTable {
  headers: string[];
  rows: string[][];
  // Each column's type once a Change type step has set it
  types: Record<string, 'number' | 'text' | 'date'>;
}

export interface QueryFile {
  name: string;
  content: string;
}

const readFile = (f: QueryFile) => (/\.tsv$/i.test(f.name) ? parseTsv(f.content) : parseCsv(f.content));

export const STEP_LABEL: Record<QueryStep['kind'], string> = {
  promote: 'Promoted headers',
  'remove-columns': 'Removed columns',
  'keep-columns': 'Removed other columns',
  rename: 'Renamed column',
  trim: 'Trimmed text',
  'clean-case': 'Changed case',
  replace: 'Replaced value',
  type: 'Changed type',
  'remove-blank-rows': 'Removed blank rows',
  'remove-duplicates': 'Removed duplicates',
  filter: 'Filtered rows',
  split: 'Split column',
  merge: 'Merged queries',
};

export const stepText = (st: QueryStep): string => {
  switch (st.kind) {
    case 'remove-columns':
    case 'keep-columns':
    case 'trim':
      return `${STEP_LABEL[st.kind]}: ${st.columns.join(', ')}`;
    case 'clean-case':
      return `${st.mode === 'proper' ? 'Capitalised each word' : st.mode === 'upper' ? 'UPPERCASE' : 'lowercase'}: ${st.columns.join(', ')}`;
    case 'rename':
      return `Renamed ${st.column} to ${st.to}`;
    case 'replace':
      return `Replaced "${st.find}" with "${st.with}" in ${st.column}`;
    case 'type':
      return `${st.column} as ${st.to}`;
    case 'remove-duplicates':
      return `Removed duplicates${st.columns.length ? ` by ${st.columns.join(', ')}` : ''}`;
    case 'filter':
      return `Kept rows where ${st.column} ${st.op === 'nonblank' ? 'is not blank' : `${st.op} ${st.value}`}`;
    case 'split':
      return `Split ${st.column} by "${st.by}" into ${st.into.join(', ')}`;
    case 'merge':
      return `Merged ${st.query} on ${st.on} = ${st.otherOn}: ${st.columns.join(', ')}`;
    default:
      return STEP_LABEL[st.kind];
  }
};

const col = (t: QueryTable, name: string) => t.headers.findIndex((h) => h.toLowerCase() === name.toLowerCase());

function apply(t: QueryTable, st: QueryStep, others: (name: string) => QueryTable | null): QueryTable {
  const map = (names: string[], fn: (v: string) => string): QueryTable => {
    const idx = names.map((n) => col(t, n)).filter((i) => i >= 0);
    return { ...t, rows: t.rows.map((r) => r.map((v, i) => (idx.includes(i) ? fn(v) : v))) };
  };
  switch (st.kind) {
    case 'promote':
      return t;
    case 'remove-columns': {
      const drop = st.columns.map((n) => col(t, n));
      return { ...t, headers: t.headers.filter((_, i) => !drop.includes(i)), rows: t.rows.map((r) => r.filter((_, i) => !drop.includes(i))) };
    }
    case 'keep-columns': {
      const keep = st.columns.map((n) => col(t, n)).filter((i) => i >= 0);
      return { ...t, headers: keep.map((i) => t.headers[i]), rows: t.rows.map((r) => keep.map((i) => r[i] ?? '')) };
    }
    case 'rename': {
      const i = col(t, st.column);
      if (i < 0) return t;
      const { [t.headers[i]]: kept, ...types } = t.types;
      return { ...t, headers: t.headers.map((h, j) => (j === i ? st.to : h)), types: kept ? { ...types, [st.to]: kept } : types };
    }
    case 'trim':
      return map(st.columns, (v) => v.trim().replace(/\s+/g, ' '));
    case 'clean-case':
      return map(st.columns, (v) => (st.mode === 'upper' ? v.toUpperCase() : st.mode === 'lower' ? v.toLowerCase() : v.toLowerCase().replace(/(^|[^a-zà-ÿ'])([a-zà-ÿ])/g, (_m, a, b) => a + b.toUpperCase())));
    case 'replace': {
      const i = col(t, st.column);
      // A whole value replaced when it matches exactly; otherwise the text inside it
      return { ...t, rows: t.rows.map((r) => r.map((v, j) => (j !== i ? v : v === st.find ? st.with : st.find ? v.split(st.find).join(st.with) : v === '' ? st.with : v))) };
    }
    case 'type': {
      const i = col(t, st.column);
      if (i < 0) return t;
      const conv = (v: string) => {
        if (v.trim() === '') return '';
        if (st.to === 'number') {
          const n = parseNumber(v.replace(/\s/g, ''));
          return n === null ? 'Error' : String(n);
        }
        if (st.to === 'date') return dateText(v) ?? 'Error';
        return v;
      };
      return { ...t, rows: t.rows.map((r) => r.map((v, j) => (j === i ? conv(v) : v))), types: { ...t.types, [t.headers[i]]: st.to } };
    }
    case 'remove-blank-rows':
      return { ...t, rows: t.rows.filter((r) => r.some((v) => v.trim() !== '')) };
    case 'remove-duplicates': {
      const idx = st.columns.length ? st.columns.map((n) => col(t, n)) : t.headers.map((_, i) => i);
      const seen = new Set<string>();
      return {
        ...t,
        rows: t.rows.filter((r) => {
          const k = idx.map((i) => (r[i] ?? '').toLowerCase()).join('\u0001');
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }),
      };
    }
    case 'filter': {
      const i = col(t, st.column);
      if (i < 0) return t;
      const want = parseNumber(st.value);
      return {
        ...t,
        rows: t.rows.filter((r) => {
          const v = r[i] ?? '';
          const n = parseNumber(v);
          switch (st.op) {
            case 'nonblank':
              return v.trim() !== '';
            case 'contains':
              return v.toLowerCase().includes(st.value.toLowerCase());
            case '=':
              return want !== null && n !== null ? n === want : v.toLowerCase() === st.value.toLowerCase();
            case '<>':
              return want !== null && n !== null ? n !== want : v.toLowerCase() !== st.value.toLowerCase();
            case '>':
              return want !== null && n !== null ? n > want : v.localeCompare(st.value) > 0;
            case '<':
              return want !== null && n !== null ? n < want : v.localeCompare(st.value) < 0;
          }
          return true;
        }),
      };
    }
    case 'split': {
      const i = col(t, st.column);
      if (i < 0 || !st.by) return t;
      const parts = st.into.length || 2;
      const names = Array.from({ length: parts }, (_, k) => st.into[k] || `${t.headers[i]}.${k + 1}`);
      return {
        ...t,
        headers: [...t.headers.slice(0, i), ...names, ...t.headers.slice(i + 1)],
        rows: t.rows.map((r) => {
          const bits = (r[i] ?? '').split(st.by);
          // The last part keeps the rest, as splitting at the left-most delimiter does
          const out = Array.from({ length: parts }, (_, k) => (k === parts - 1 ? bits.slice(k).join(st.by) : bits[k] ?? '').trim());
          return [...r.slice(0, i), ...out, ...r.slice(i + 1)];
        }),
      };
    }
    case 'merge': {
      const other = others(st.query);
      const i = col(t, st.on);
      if (!other || i < 0) return t;
      const j = col(other, st.otherOn);
      const take = st.columns.map((n) => col(other, n)).filter((k) => k >= 0);
      const index = new Map<string, string[]>();
      for (const r of other.rows) if (!index.has((r[j] ?? '').toLowerCase())) index.set((r[j] ?? '').toLowerCase(), r);
      return {
        ...t,
        headers: [...t.headers, ...take.map((k) => other.headers[k])],
        rows: t.rows.map((r) => {
          const hit = index.get((r[i] ?? '').toLowerCase());
          return [...r, ...take.map((k) => (hit ? hit[k] ?? '' : ''))];
        }),
      };
    }
  }
}

// The query's source: its files appended. With headers promoted, each file's first row names its columns and the files
// line up by name (a column one file lacks is left blank)
function source(q: Query, files: QueryFile[]): QueryTable | string {
  const grids: string[][][] = [];
  for (const name of q.sources) {
    const f = files.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!f) return `The file ${name} isn't in Files any more.`;
    grids.push(readFile(f));
  }
  const promote = q.steps[0]?.kind === 'promote';
  if (!promote) {
    const width = Math.max(0, ...grids.flat().map((r) => r.length));
    return { headers: Array.from({ length: width }, (_, i) => `Column${i + 1}`), rows: grids.flat().map((r) => Array.from({ length: width }, (_, i) => r[i] ?? '')), types: {} };
  }
  const headers: string[] = [];
  for (const g of grids) for (const h of g[0] ?? []) if (!headers.some((x) => x.toLowerCase() === h.trim().toLowerCase())) headers.push(h.trim());
  const rows = grids.flatMap((g) => {
    const head = (g[0] ?? []).map((h) => h.trim().toLowerCase());
    return g.slice(1).map((r) => headers.map((h) => r[head.indexOf(h.toLowerCase())] ?? ''));
  });
  return { headers, rows, types: {} };
}

// A query's result after its first n steps (all of them by default), or what went wrong
export function runQuery(q: Query, files: QueryFile[], all: Query[] = [], upTo = q.steps.length, depth = 0): QueryTable | string {
  let t = source(q, files);
  if (typeof t === 'string') return t;
  const others = (name: string) => {
    if (depth > 4) return null;
    const o = all.find((x) => x.name.toLowerCase() === name.toLowerCase() && x !== q);
    if (!o) return null;
    const r = runQuery(o, files, all, o.steps.length, depth + 1);
    return typeof r === 'string' ? null : r;
  };
  for (const st of q.steps.slice(0, upTo)) t = apply(t, st, others);
  return t;
}

// The result as sheet rows: numbers and dates as values, text columns kept as text
export function queryRows(t: QueryTable): (string | number | null)[][] {
  return [
    t.headers,
    ...t.rows.map((r) =>
      r.map((v, i) => {
        if (v === '') return null;
        const type = t.types[t.headers[i]];
        if (type === 'text' && parseNumber(v) !== null) return `'${v}`;
        return v;
      })
    ),
  ];
}
