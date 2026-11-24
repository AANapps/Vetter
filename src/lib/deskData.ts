import { CaseFile } from '../types';
import { parseCsv, toCsv } from './csv';

/**
 * How data moves between the desktop's apps, the way it does between real ones: every table can leave an app as a CSV
 * file (saved to Files, then attached to an email, imported into the spreadsheet, the database, the CRM, BI or a board)
 * or be copied as tab-separated text (what Excel and Google Sheets put on the clipboard), and every app that takes a
 * table reads CSV, tab-separated text and HTML tables (copied from a web page or a document) alike.
 */

export type Grid = string[][];

// What kind of file a name is, which decides which app opens it
export type FileKind = 'csv' | 'doc' | 'text' | 'image' | 'other';
export const fileKind = (name: string): FileKind =>
  /\.(csv|tsv)$/i.test(name) ? 'csv' : /\.(docx?|html?|rtf)$/i.test(name) ? 'doc' : /\.(txt|md|json|log|sql|py|js)$/i.test(name) ? 'text' : /\.(svg|png|jpe?g|gif)$/i.test(name) ? 'image' : 'other';

// A file's table: a CSV or TSV file's rows
export const fileGrid = (f: CaseFile): Grid | null =>
  fileKind(f.name) === 'csv' ? (/\.tsv$/i.test(f.name) ? parseTsv(f.content) : parseCsv(f.content)) : null;

export const parseTsv = (text: string): Grid =>
  text
    .replace(/\r/g, '')
    .replace(/\n+$/, '')
    .split('\n')
    .map((l) => l.split('\t'))
    .filter((r) => r.some((c) => c !== ''));

// Tab-separated text, as spreadsheets copy cells: one row a line, and a value with a tab or line break in quotes
export const toTsv = (rows: unknown[][]) =>
  rows
    .map((r) =>
      r
        .map((v) => {
          const s = v === null || v === undefined ? '' : String(v);
          return /[\t\n"]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join('\t')
    )
    .join('\n');

export { toCsv };

// Reads a table out of whatever was pasted: an HTML table (from a page, a document or Excel), tab-separated cells
// (from a spreadsheet), or comma-separated lines (a CSV opened as text). Null when it isn't a table.
export function gridFromClipboard(text: string, html?: string): Grid | null {
  if (html && /<table/i.test(html)) {
    const g = gridFromHtml(html);
    if (g?.length) return g;
  }
  const clean = text.replace(/\r/g, '').replace(/\n+$/, '');
  if (!clean) return null;
  if (clean.includes('\t')) return parseQuotedTsv(clean);
  const lines = clean.split('\n');
  // Comma-separated: at least two lines with the same number of fields, more than one
  if (lines.length >= 2) {
    const rows = parseCsv(clean);
    const widths = new Set(rows.map((r) => r.length));
    if (rows.length >= 2 && widths.size === 1 && rows[0].length > 1) return rows;
  }
  return null;
}

// Tab-separated text where a cell may be quoted (Excel quotes a cell holding a line break)
function parseQuotedTsv(text: string): Grid {
  const rows: Grid = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') (field += '"'), i++;
      else quoted = false;
    } else if (ch === '"' && field === '') quoted = true;
    else if (ch === '\t') row.push(field), (field = '');
    else if (ch === '\n') row.push(field), rows.push(row), (row = []), (field = '');
    else field += ch;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

export function gridFromHtml(html: string): Grid | null {
  if (typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return null;
  return [...table.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('th,td')].map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim()));
}

// A grid as an HTML table, for pasting into a document or an email that keeps formatting
export const gridToHtml = (g: Grid) =>
  `<table><thead><tr>${(g[0] ?? []).map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${g
    .slice(1)
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// A table as plain text lined up in columns, for an email body
export function gridToText(g: Grid): string {
  const widths = g[0]?.map((_, c) => Math.min(30, Math.max(...g.map((r) => (r[c] ?? '').length)))) ?? [];
  return g.map((r) => r.map((c, i) => (c ?? '').padEnd(widths[i] ?? 0)).join('  ').trimEnd()).join('\n');
}

// Puts a table on the clipboard both ways: tab-separated for spreadsheets, HTML for documents and email
export async function copyGrid(g: Grid): Promise<boolean> {
  const tsv = toTsv(g);
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([tsv], { type: 'text/plain' }), 'text/html': new Blob([gridToHtml(g)], { type: 'text/html' }) })]);
      return true;
    }
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch {
    return false;
  }
}

// Records (objects keyed by field) to a grid and back, for CRM records, tickets, board items and form entries
export function recordsToGrid(records: Record<string, unknown>[], fields?: string[]): Grid {
  const cols = fields ?? [...new Set(records.flatMap((r) => Object.keys(r)))];
  return [cols, ...records.map((r) => cols.map((c) => (Array.isArray(r[c]) ? (r[c] as unknown[]).join('; ') : r[c] == null ? '' : String(r[c]))))];
}
export function gridToRecords(g: Grid): Record<string, string>[] {
  const [head, ...rows] = g;
  if (!head) return [];
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

// A number in a cell as people write them: "£1,240.50", "12%", "(300)"
export function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').trim();
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s) || /^-/.test(s.replace(/^[£$€]/, ''));
  const n = Number(s.replace(/[£$€,%\s()]/g, '').replace(/^-/, ''));
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

// HTML from a document, kept to plain formatting: no scripts, styles, links or attributes. Documents are shown to the
// company reviewing the work, so nothing a candidate writes may run there.
const KEEP = new Set(['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'div', 'span']);
export function cleanHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return esc(htmlToText(html)).replace(/\n/g, '<br>');
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const walk = (node: Node): string => {
    if (node.nodeType === 3) return esc(node.textContent ?? '');
    if (node.nodeType !== 1) return '';
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'head', 'meta', 'link'].includes(tag)) return '';
    const inner = [...el.childNodes].map(walk).join('');
    if (!KEEP.has(tag)) return inner;
    if (tag === 'br' || tag === 'hr') return `<${tag}>`;
    return `<${tag}>${inner}</${tag}>`;
  };
  return [...doc.body.childNodes].map(walk).join('');
}

// A document's words: its HTML as plain text, a line per block and table rows tab-separated
export function htmlToText(html: string): string {
  return html
    .replace(/<\/(td|th)>/gi, '\t')
    .replace(/<(br|\/p|\/div|\/h\d|\/li|\/tr|\/blockquote|\/pre)[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// A file's words, whatever it is: a document's text, a table's rows, or the text itself
export const fileText = (f: CaseFile) => (fileKind(f.name) === 'doc' ? htmlToText(f.content) : fileKind(f.name) === 'image' ? '' : f.content);

// A name not already taken among files: "report.csv", then "report (2).csv"
export function freeName(name: string, taken: string[]): string {
  if (!taken.includes(name)) return name;
  const m = name.match(/^(.*?)(\.[^.]*)?$/)!;
  for (let i = 2; ; i++) {
    const n = `${m[1]} (${i})${m[2] ?? ''}`;
    if (!taken.includes(n)) return n;
  }
}
