import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownAZ,
  ArrowDownToLine,
  ArrowUpZA,
  ClipboardPaste,
  Download,
  FileUp,
  Layers,
  Plus,
  Redo2,
  Replace,
  Rows3,
  Table2,
  Undo2,
  X,
  BarChart3,
  Filter,
  Paintbrush,
  SlidersHorizontal,
  Sparkles,
  Grid3x3,
  Database,
  RefreshCw,
} from 'lucide-react';
import { ChartBox, CondFormatDialog, FilterMenu, PickDialog, STYLE_CLASS, SlicerBox, TABLE_STYLE, TableDialog, columnValues } from './SheetExtras';
import { flashFill } from '../lib/flashFill';
import { PowerQueryEditor } from './PowerQueryEditor';
import { queryRows, runQuery } from '../lib/powerQuery';
import { CaseFile } from '../types';
import {
  Calc,
  CellFormat,
  Workbook,
  cellAddr,
  colName,
  displayValue,
  freeSheetName,
  isError,
  parseAddr,
  parseNumber,
  parseWorkbook,
  parseRange,
  rangeText,
  Sheet,
  reorderRows,
  setCells,
  sheetFromRows,
  shiftCells,
  shiftFormula,
  toText,
  usedSize,
} from '../lib/spreadsheet';
import { downloadFile, parseCsv, readTextFile, toCsv } from '../lib/csv';
import { gridFromClipboard, parseTsv } from '../lib/deskData';

interface Pos {
  r: number;
  c: number;
}

interface Edit {
  sheet: number;
  r: number;
  c: number;
  draft: string;
  // Where a reference picked by clicking sits in the draft, so the next click replaces it
  point?: { start: number; end: number; anchor: Pos };
}

interface Clip {
  sheet: number;
  r: number;
  c: number;
  raw: string[][];
  values: string[][];
  tsv: string;
  cut: boolean;
}

type Dialog = 'find' | 'dupes' | 'pivot' | 'import' | 'table' | 'cf' | 'slicer' | 'query' | null;

const DEFAULT_WIDTH = 96;
const ROW_HEIGHT = 22;
const POINT_AFTER = /[=(,+\-*/^&<>:]\s*$/;

const quoteSheet = (name: string) => (/^[A-Za-z_][\w.]*$/.test(name) ? name : `'${name.replace(/'/g, "''")}'`);

// Closes brackets left open, as Excel does when a formula is entered
function closeBrackets(draft: string) {
  if (!draft.startsWith('=')) return draft;
  let depth = 0;
  let inString = false;
  for (const ch of draft) {
    if (ch === '"') inString = !inString;
    else if (!inString && ch === '(') depth++;
    else if (!inString && ch === ')') depth--;
  }
  return depth > 0 ? draft + ')'.repeat(depth) : draft;
}

interface SpreadsheetWindowProps {
  value: string;
  onChange: (json: string) => void;
  fileName: string;
  files?: CaseFile[];
  // On a desktop: exports are saved to its Files, and a file opened from Files arrives here to import
  onSaveFile?: (f: CaseFile) => void;
  incoming?: { name: string; content: string; key: number };
}

export const SpreadsheetWindow: React.FC<SpreadsheetWindowProps> = ({ value, onChange, fileName, files = [], onSaveFile, incoming }) => {
  const [wb, setWb] = useState<Workbook>(() => parseWorkbook(value));
  const [sheet, setSheet] = useState(0);
  const [active, setActive] = useState<Pos>({ r: 0, c: 0 });
  const [end, setEnd] = useState<Pos>({ r: 0, c: 0 });
  const [edit, setEdit] = useState<Edit | null>(null);
  const [undo, setUndo] = useState<Workbook[]>([]);
  const [redo, setRedo] = useState<Workbook[]>([]);
  const [clip, setClip] = useState<Clip | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [renaming, setRenaming] = useState<number | null>(null);
  const [fillTo, setFillTo] = useState<Pos | null>(null);
  // The column whose filter menu is open (its offset in the filtered range)
  const [filterMenu, setFilterMenu] = useState<number | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const barInputRef = useRef<HTMLInputElement>(null);
  const mouse = useRef<null | 'select' | 'point' | 'fill'>(null);
  const resize = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const calc = useMemo(() => new Calc(wb), [wb]);
  const current = wb.sheets[sheet];
  const used = usedSize(current);
  const rowCount = Math.max(used.rows + 30, 60);
  const colCount = Math.max(used.cols + 4, 14);
  const range = { r1: Math.min(active.r, end.r), c1: Math.min(active.c, end.c), r2: Math.max(active.r, end.r), c2: Math.max(active.c, end.c) };
  const multi = range.r1 !== range.r2 || range.c1 !== range.c2;
  const widthOf = (c: number) => widths[`${sheet}:${c}`] ?? DEFAULT_WIDTH;
  const rawAt = (r: number, c: number, s = sheet) => wb.sheets[s]?.cells[cellAddr(r, c)] ?? '';
  const shown = (r: number, c: number, s = sheet) => displayValue(calc.value(s, r, c), wb.sheets[s].formats?.[cellAddr(r, c)]);

  const flash = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast((t) => (t === text ? null : t)), 4000);
  };

  // Every change goes through here: it can be undone, and the answer is saved
  const commit = (next: Workbook) => {
    setUndo((u) => [...u.slice(-49), wb]);
    setRedo([]);
    setWb(next);
    onChange(JSON.stringify(next));
  };

  // A change to the sheet on show (its tables, filter, rules, charts, slicers)
  const updateSheet = (fn: (s: Sheet) => Sheet, base = wb) => commit({ ...base, sheets: base.sheets.map((s, i) => (i === sheet ? fn(s) : s)) });

  // The block of data around a cell, as Excel picks it for a table or a chart: every touching filled row and column
  const currentRegion = (p: Pos) => {
    let r1 = p.r;
    let r2 = p.r;
    let c1 = p.c;
    let c2 = p.c;
    const filledRow = (r: number) => Array.from({ length: c2 - c1 + 3 }, (_, j) => c1 - 1 + j).some((c) => c >= 0 && rawAt(r, c) !== '');
    const filledCol = (c: number) => Array.from({ length: r2 - r1 + 3 }, (_, i) => r1 - 1 + i).some((r) => r >= 0 && rawAt(r, c) !== '');
    for (let grown = true; grown; ) {
      grown = false;
      if (r1 > 0 && filledRow(r1 - 1)) (r1--, (grown = true));
      if (filledRow(r2 + 1)) (r2++, (grown = true));
      if (c1 > 0 && filledCol(c1 - 1)) (c1--, (grown = true));
      if (filledCol(c2 + 1)) (c2++, (grown = true));
    }
    return { r1, c1, r2, c2 };
  };
  const tableAt = (p: Pos, s: Sheet = current) =>
    (s.tables ?? []).find((t) => {
      const r = parseRange(t.ref);
      return r && p.r >= r.r1 && p.r <= r.r2 && p.c >= r.c1 && p.c <= r.c2;
    });
  const selectionOrRegion = () => (multi ? range : currentRegion(active));

  const allTables = wb.sheets.flatMap((s) => s.tables ?? []);
  const makeTable = (name: string, ref: string, style: 'blue' | 'green' | 'orange' | 'gray') => {
    updateSheet((s) => ({ ...s, tables: [...(s.tables ?? []), { name, ref, style }], filter: s.filter ?? { ref, criteria: {} } }));
    setDialog(null);
    flash(`Table ${name} made from ${ref}. Use ${name}[Column] in formulas.`);
    focusGrid();
  };

  const toggleFilter = () => {
    if (current.filter) {
      updateSheet((s) => ({ ...s, filter: undefined }));
      flash('Filter removed.');
      return;
    }
    const t = tableAt(active);
    const ref = t?.ref ?? rangeText(selectionOrRegion());
    updateSheet((s) => ({ ...s, filter: { ref, criteria: {} } }));
    flash(`Filter on ${ref}: use the ▾ buttons on the headers.`);
  };

  const filterArea = current.filter ? parseRange(current.filter.ref) : null;

  // Sorts the rows of a block (its first row the headers) by one of its columns
  const sortArea = (area: { r1: number; r2: number }, col: number, descending: boolean) => {
    const total = area.r2 - area.r1;
    if (total < 2) return;
    const order = Array.from({ length: total }, (_, i) => i).sort((a, b) => {
      const x = calc.value(sheet, area.r1 + 1 + a, col);
      const y = calc.value(sheet, area.r1 + 1 + b, col);
      const blank = (v: unknown) => v === null || v === '';
      if (blank(x) !== blank(y)) return blank(x) ? 1 : -1;
      const nx = typeof x === 'number' ? x : null;
      const ny = typeof y === 'number' ? y : null;
      let d = nx !== null && ny !== null ? nx - ny : nx !== null ? -1 : ny !== null ? 1 : toText(x).toLowerCase().localeCompare(toText(y).toLowerCase());
      if (descending) d = -d;
      return d || a - b;
    });
    commit(reorderRows(wb, sheet, area.r1 + 1, order, total));
    flash(`Sorted ${total} rows by ${toText(calc.value(sheet, area.r1, col)) || `column ${colName(col)}`}, ${descending ? 'largest or Z first' : 'smallest or A first'}.`);
  };

  const addChart = () => {
    const area = selectionOrRegion();
    if (area.r2 <= area.r1 || area.c2 <= area.c1) return flash('Select the data for the chart first: a column of labels and at least one column of numbers, with headers.');
    const ref = rangeText(area);
    const header = toText(calc.value(sheet, area.r1, area.c1 + 1));
    updateSheet((s) => ({ ...s, charts: [...(s.charts ?? []), { id: `chart-${Date.now().toString(36)}`, kind: 'column', ref, title: header ? `${header} by ${toText(calc.value(sheet, area.r1, area.c1))}` : 'Chart' }] }));
    flash(`Chart added from ${ref}. Change its type or title on the chart.`);
  };

  const addSlicer = (column: string) => {
    const t = tableAt(active)!;
    updateSheet((s) => ({ ...s, slicers: [...(s.slicers ?? []), { id: `slicer-${Date.now().toString(36)}`, table: t.name, column, selected: [] }] }));
    setDialog(null);
    flash(`Slicer for ${column} added: click a value to filter ${t.name}.`);
    focusGrid();
  };

  // Flash Fill: the column is filled from the examples typed at its top
  const doFlashFill = () => {
    const c = active.c;
    const t = tableAt(active);
    const area = t ? parseRange(t.ref)! : { r1: 0, r2: Math.max(used.rows - 1, 0), c1: 0, c2: Math.max(used.cols - 1, 0) };
    const first = area.r1 + 1;
    const rows: string[][] = [];
    const examples: Record<number, string> = {};
    for (let r = first; r <= area.r2; r++) {
      rows.push(Array.from({ length: Math.max(area.c2 + 1, used.cols) }, (_, j) => (j === c ? '' : toText(calc.value(sheet, r, j)))));
      const typed = rawAt(r, c);
      if (typed && !typed.startsWith('=')) examples[r - first] = typed;
    }
    const filled = flashFill(rows, examples);
    if (!filled) return flash("Flash Fill couldn't see a pattern. Type one or two more examples in this column, then try again (Ctrl+E).");
    const updates: Record<string, string> = {};
    filled.forEach((v, i) => {
      if (!rawAt(first + i, c) && v) updates[cellAddr(first + i, c)] = v;
    });
    if (!Object.keys(updates).length) return flash('Flash Fill had nothing left to fill.');
    commit(setCells(wb, sheet, updates));
    flash(`Flash Fill filled ${Object.keys(updates).length} cells.`);
  };

  // Power Query: each query loads to its own sheet as a table named after it; Refresh runs them all again
  const loadQueries = (queries: NonNullable<typeof wb.queries>, base = wb) => {
    let sheets = [...base.sheets];
    const out: typeof queries = [];
    const problems: string[] = [];
    for (const q of queries) {
      const t = runQuery(q, files, queries);
      if (typeof t === 'string') {
        problems.push(`${q.name}: ${t}`);
        out.push(q);
        continue;
      }
      const rows = queryRows(t);
      const loaded = sheetFromRows('', rows);
      const ref = rangeText({ r1: 0, c1: 0, r2: Math.max(rows.length - 1, 1), c2: Math.max(t.headers.length - 1, 0) });
      const name = q.loadTo && sheets.some((x) => x.name.toLowerCase() === q.loadTo!.toLowerCase()) ? q.loadTo : freeSheetName({ sheets }, q.name);
      const i = sheets.findIndex((x) => x.name.toLowerCase() === name.toLowerCase());
      const tableName = q.name.replace(/[^A-Za-z0-9_]/g, '_');
      const takenElsewhere = sheets.some((x, j) => j !== i && (x.tables ?? []).some((tb) => tb.name.toLowerCase() === tableName.toLowerCase()));
      const tables = takenElsewhere ? [] : [{ name: tableName, ref, style: 'green' as const }];
      const sh = { ...(i >= 0 ? sheets[i] : {}), name, cells: loaded.cells, tables, filter: { ref, criteria: {} } };
      if (i >= 0) sheets[i] = sh;
      else sheets = [...sheets, sh];
      out.push({ ...q, loadTo: name });
    }
    commit({ ...base, sheets, queries: out });
    return problems;
  };
  const refreshAll = () => {
    if (!wb.queries?.length) return flash('There are no queries to refresh. Use Get data first.');
    const problems = loadQueries(wb.queries);
    flash(problems.length ? `Refreshed with problems: ${problems.join('; ')}` : `Refreshed ${wb.queries.length} ${wb.queries.length === 1 ? 'query' : 'queries'}.`);
  };

  const doUndo = () => {
    const prev = undo[undo.length - 1];
    if (!prev) return;
    setUndo((u) => u.slice(0, -1));
    setRedo((r) => [...r, wb]);
    setWb(prev);
    setSheet((s) => Math.min(s, prev.sheets.length - 1));
    onChange(JSON.stringify(prev));
  };
  const doRedo = () => {
    const next = redo[redo.length - 1];
    if (!next) return;
    setRedo((r) => r.slice(0, -1));
    setUndo((u) => [...u, wb]);
    setWb(next);
    onChange(JSON.stringify(next));
  };

  const focusGrid = () => window.setTimeout(() => gridRef.current?.focus({ preventScroll: true }), 0);

  const select = (p: Pos, extend = false) => {
    const clamped = { r: Math.max(0, p.r), c: Math.max(0, p.c) };
    if (extend) setEnd(clamped);
    else {
      setActive(clamped);
      setEnd(clamped);
    }
  };

  // Keep the cell being moved to on screen
  useEffect(() => {
    const box = gridRef.current;
    const cell = box?.querySelector(`[data-cell="${end.r}:${end.c}"]`);
    if (!box || !cell) return;
    // Measured by hand: the sticky headers cover the top row and first column
    const b = box.getBoundingClientRect();
    const e = cell.getBoundingClientRect();
    if (e.top < b.top + ROW_HEIGHT) box.scrollTop -= b.top + ROW_HEIGHT - e.top;
    else if (e.bottom > b.bottom - 14) box.scrollTop += e.bottom - b.bottom + 14;
    if (e.left < b.left + 40) box.scrollLeft -= b.left + 40 - e.left;
    else if (e.right > b.right - 14) box.scrollLeft += e.right - b.right + 14;
  }, [end.r, end.c, sheet]);

  // Typing goes to the cell, or to the formula bar while a formula points at another sheet
  useEffect(() => {
    if (!edit) return;
    const input = edit.sheet === sheet ? cellInputRef.current : barInputRef.current;
    if (input && document.activeElement !== barInputRef.current) {
      input.focus();
      const at = edit.point ? edit.point.end : input.value.length;
      input.setSelectionRange(at, at);
    }
  }, [edit?.sheet, edit?.r, edit?.c, sheet, edit?.point?.end]);

  useEffect(() => {
    const up = () => {
      if (mouse.current === 'fill' && fillTo) applyFill(fillTo);
      mouse.current = null;
      setFillTo(null);
      resize.current = null;
    };
    const move = (e: MouseEvent) => {
      const r = resize.current;
      if (r) setWidths((w) => ({ ...w, [r.key]: Math.max(36, r.startW + e.clientX - r.startX) }));
    };
    window.addEventListener('mouseup', up);
    window.addEventListener('mousemove', move);
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('mousemove', move);
    };
  });

  // ---------- Editing ----------

  const startEdit = (draft?: string) => setEdit({ sheet, r: active.r, c: active.c, draft: draft ?? rawAt(active.r, active.c) });

  const commitEdit = (move: 'down' | 'right' | 'up' | 'left' | 'none' = 'down') => {
    if (!edit) return;
    const raw = closeBrackets(edit.draft);
    if (raw !== rawAt(edit.r, edit.c, edit.sheet)) {
      let next = setCells(wb, edit.sheet, { [cellAddr(edit.r, edit.c)]: raw });
      const sh = next.sheets[edit.sheet];
      // A table grows to take in a row typed just below it or a column typed just right of it
      const grow = (sh.tables ?? []).map((t) => {
        const r = parseRange(t.ref)!;
        if (raw && edit.r === r.r2 + 1 && edit.c >= r.c1 && edit.c <= r.c2) return { t, to: rangeText({ ...r, r2: r.r2 + 1 }) };
        if (raw && edit.c === r.c2 + 1 && edit.r >= r.r1 && edit.r <= r.r2) return { t, to: rangeText({ ...r, c2: r.c2 + 1 }) };
        return null;
      }).find(Boolean);
      if (grow) {
        next = {
          ...next,
          sheets: next.sheets.map((x, i) =>
            i === edit.sheet ? { ...x, tables: x.tables!.map((t) => (t === grow.t ? { ...t, ref: grow.to } : t)), filter: x.filter && x.filter.ref === grow.t.ref ? { ...x.filter, ref: grow.to } : x.filter } : x
          ),
        };
      }
      // A formula typed in an empty table column fills the whole column (a calculated column)
      const t = tableAt({ r: edit.r, c: edit.c }, next.sheets[edit.sheet]);
      const tr = t && parseRange(t.ref);
      if (tr && raw.startsWith('=') && edit.r > tr.r1) {
        const others = Array.from({ length: tr.r2 - tr.r1 }, (_, i) => tr.r1 + 1 + i).filter((r) => r !== edit.r);
        if (others.every((r) => !(next.sheets[edit.sheet].cells[cellAddr(r, edit.c)] ?? ''))) {
          const fillUp: Record<string, string> = {};
          for (const r of others) fillUp[cellAddr(r, edit.c)] = shiftFormula(raw, r - edit.r, 0);
          next = setCells(next, edit.sheet, fillUp);
        }
      }
      commit(next);
    }
    setSheet(edit.sheet);
    const next = {
      r: edit.r + (move === 'down' ? 1 : move === 'up' ? -1 : 0),
      c: edit.c + (move === 'right' ? 1 : move === 'left' ? -1 : 0),
    };
    setEdit(null);
    select(next);
    focusGrid();
  };

  const cancelEdit = () => {
    if (!edit) return;
    setSheet(edit.sheet);
    setEdit(null);
    focusGrid();
  };

  const pointable = (e: Edit) => e.draft.startsWith('=') && (!!e.point || POINT_AFTER.test(e.draft));

  // Clicking a cell while writing a formula puts its address in the formula
  const pointAt = (anchor: Pos, to: Pos) => {
    if (!edit) return;
    const prefix = sheet !== edit.sheet ? `${quoteSheet(current.name)}!` : '';
    const r1 = Math.min(anchor.r, to.r);
    const r2 = Math.max(anchor.r, to.r);
    const c1 = Math.min(anchor.c, to.c);
    const c2 = Math.max(anchor.c, to.c);
    const text = prefix + cellAddr(r1, c1) + (r1 !== r2 || c1 !== c2 ? `:${cellAddr(r2, c2)}` : '');
    const start = edit.point ? edit.point.start : edit.draft.length;
    const before = edit.draft.slice(0, start);
    const after = edit.point ? edit.draft.slice(edit.point.end) : '';
    setEdit({ ...edit, draft: before + text + after, point: { start, end: start + text.length, anchor } });
  };

  // ---------- Cells ----------

  const clearRange = () => {
    const updates: Record<string, string> = {};
    for (let r = range.r1; r <= range.r2; r++) for (let c = range.c1; c <= range.c2; c++) if (rawAt(r, c)) updates[cellAddr(r, c)] = '';
    if (Object.keys(updates).length) commit(setCells(wb, sheet, updates));
  };

  const fill = (direction: 'down' | 'right', target = range) => {
    const updates: Record<string, string> = {};
    if (direction === 'down') {
      const from = target.r1 === target.r2 ? target.r1 - 1 : target.r1;
      if (from < 0) return;
      for (let c = target.c1; c <= target.c2; c++)
        for (let r = from + 1; r <= target.r2; r++) updates[cellAddr(r, c)] = shiftFormula(rawAt(from, c), r - from, 0);
    } else {
      const from = target.c1 === target.c2 ? target.c1 - 1 : target.c1;
      if (from < 0) return;
      for (let r = target.r1; r <= target.r2; r++)
        for (let c = from + 1; c <= target.c2; c++) updates[cellAddr(r, c)] = shiftFormula(rawAt(r, from), 0, c - from);
    }
    commit(setCells(wb, sheet, updates));
  };

  // Dragging the fill handle copies the selection down or across to where it's let go
  const applyFill = (to: Pos) => {
    if (to.r > range.r2 && to.r - range.r2 >= to.c - range.c2) {
      fill('down', { ...range, r2: to.r });
      setEnd({ r: to.r, c: range.c2 });
    } else if (to.c > range.c2) {
      fill('right', { ...range, c2: to.c });
      setEnd({ r: range.r2, c: to.c });
    }
  };

  // Double-clicking the fill handle fills down as far as the data next to it goes
  const autoFill = () => {
    const filled = (c: number) => {
      let r = range.r2;
      while (c >= 0 && rawAt(r + 1, c) !== '') r++;
      return r;
    };
    const last = Math.max(filled(range.c1 - 1), filled(range.c2 + 1));
    if (last > range.r2) {
      fill('down', { ...range, r2: last });
      setEnd({ r: last, c: range.c2 });
    }
  };

  const grab = (cut: boolean): Clip => {
    const raw: string[][] = [];
    const values: string[][] = [];
    for (let r = range.r1; r <= range.r2; r++) {
      raw.push([]);
      values.push([]);
      for (let c = range.c1; c <= range.c2; c++) {
        raw[raw.length - 1].push(rawAt(r, c));
        values[values.length - 1].push(toText(calc.value(sheet, r, c)));
      }
    }
    return { sheet, r: range.r1, c: range.c1, raw, values, tsv: values.map((row) => row.join('\t')).join('\n'), cut };
  };

  const pasteGrid = (grid: string[][], shiftFrom?: Pos, cutFrom?: Clip) => {
    let next = wb;
    if (cutFrom) {
      const cleared: Record<string, string> = {};
      cutFrom.raw.forEach((row, i) => row.forEach((_, j) => (cleared[cellAddr(cutFrom.r + i, cutFrom.c + j)] = '')));
      next = setCells(next, cutFrom.sheet, cleared);
    }
    const updates: Record<string, string> = {};
    grid.forEach((row, i) =>
      row.forEach((raw, j) => {
        const dr = shiftFrom ? active.r + i - (shiftFrom.r + i) : 0;
        const dc = shiftFrom ? active.c + j - (shiftFrom.c + j) : 0;
        updates[cellAddr(active.r + i, active.c + j)] = shiftFrom && !cutFrom ? shiftFormula(raw, dr, dc) : raw;
      })
    );
    commit(setCells(next, sheet, updates));
    setEnd({ r: active.r + grid.length - 1, c: active.c + Math.max(...grid.map((r) => r.length)) - 1 });
  };

  const onCopy = (e: React.ClipboardEvent, cut: boolean) => {
    if (edit) return;
    e.preventDefault();
    const c = grab(cut);
    e.clipboardData.setData('text/plain', c.tsv);
    setClip(c);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (edit) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (clip && text.replace(/\r/g, '') === clip.tsv) {
      pasteGrid(clip.raw, { r: clip.r, c: clip.c }, clip.cut ? clip : undefined);
      if (clip.cut) setClip(null);
      return;
    }
    // Cells from another spreadsheet (tab-separated), a table from a page, document or report (HTML), or a CSV's lines
    // all land a value a cell; anything else goes in as lines down the column
    const grid = gridFromClipboard(text, e.clipboardData.getData('text/html'));
    if (grid && !text.includes('\t')) flash(`Pasted ${grid.length} rows split into ${grid[0]?.length ?? 1} columns.`);
    pasteGrid(grid ?? text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((line) => [line]));
  };

  const pasteValues = () => {
    if (!clip) return flash('Copy some cells first (Ctrl+C), then paste their values.');
    pasteGrid(clip.values);
  };

  const setFormat = (format: CellFormat) => {
    const formats = { ...(current.formats ?? {}) };
    for (let r = range.r1; r <= range.r2; r++)
      for (let c = range.c1; c <= range.c2; c++) {
        if (format === 'general') delete formats[cellAddr(r, c)];
        else formats[cellAddr(r, c)] = format;
      }
    commit({ ...wb, sheets: wb.sheets.map((s, i) => (i === sheet ? { ...s, formats } : s)) });
  };

  const insertOrDelete = (axis: 'row' | 'col', insert: boolean) => {
    const at = axis === 'row' ? range.r1 : range.c1;
    const count = axis === 'row' ? range.r2 - range.r1 + 1 : range.c2 - range.c1 + 1;
    commit(shiftCells(wb, sheet, axis, at, insert ? count : -count));
  };

  // Sorts the rows under the header row by the active cell's column, as Excel's sort with headers does
  const sortBy = (descending: boolean) => {
    const t = tableAt(active);
    const area = t ? parseRange(t.ref) : filterArea && active.r >= filterArea.r1 && active.r <= filterArea.r2 ? filterArea : null;
    if (area) return sortArea(area, active.c, descending);
    const total = used.rows - 1;
    if (total < 2) return;
    const col = active.c;
    const order = Array.from({ length: total }, (_, i) => i).sort((a, b) => {
      const x = calc.value(sheet, a + 1, col);
      const y = calc.value(sheet, b + 1, col);
      const blank = (v: unknown) => v === null || v === '';
      if (blank(x) !== blank(y)) return blank(x) ? 1 : -1;
      const nx = typeof x === 'number' ? x : null;
      const ny = typeof y === 'number' ? y : null;
      let d = nx !== null && ny !== null ? nx - ny : nx !== null ? -1 : ny !== null ? 1 : toText(x).toLowerCase().localeCompare(toText(y).toLowerCase());
      if (descending) d = -d;
      return d || a - b;
    });
    commit(reorderRows(wb, sheet, 1, order, total));
    flash(`Sorted ${total} rows by ${toText(calc.value(sheet, 0, col)) || `column ${colName(col)}`}, ${descending ? 'Z to A' : 'A to Z'}.`);
  };

  const exportCsv = () => {
    const rows = Array.from({ length: used.rows }, (_, r) => Array.from({ length: used.cols }, (_, c) => toText(calc.value(sheet, r, c))));
    if (onSaveFile) onSaveFile({ name: `${current.name}.csv`, content: toCsv(rows) });
    else downloadFile(`${current.name}.csv`, toCsv(rows));
  };

  const importCsv = (name: string, text: string) => {
    const rows = /\.tsv$/i.test(name) ? parseTsv(text) : parseCsv(text);
    const sheetName = freeSheetName(wb, name.replace(/\.(csv|tsv|txt)$/i, ''));
    const next = { ...wb, sheets: [...wb.sheets, sheetFromRows(sheetName, rows)] };
    commit(next);
    setSheet(next.sheets.length - 1);
    select({ r: 0, c: 0 });
    setDialog(null);
    flash(`Imported ${name}: ${Math.max(rows.length - 1, 0)} rows into the sheet "${sheetName}".`);
    focusGrid();
  };

  // A file opened from Files comes in as a new sheet, once per opening
  const took = useRef(0);
  useEffect(() => {
    if (!incoming || took.current === incoming.key) return;
    took.current = incoming.key;
    importCsv(incoming.name, incoming.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.key]);

  const addSheet = () => {
    const next = { ...wb, sheets: [...wb.sheets, { name: freeSheetName(wb, `Sheet${wb.sheets.length + 1}`), cells: {} }] };
    commit(next);
    setSheet(next.sheets.length - 1);
    select({ r: 0, c: 0 });
  };

  const renameSheet = (i: number, name: string) => {
    setRenaming(null);
    const clean = name.trim();
    if (!clean || clean === wb.sheets[i].name) return;
    if (wb.sheets.some((s, j) => j !== i && s.name.toLowerCase() === clean.toLowerCase())) return flash(`There's already a sheet called "${clean}".`);
    commit({ ...wb, sheets: wb.sheets.map((s, j) => (j === i ? { ...s, name: clean } : s)) });
  };

  const deleteSheet = (i: number) => {
    if (wb.sheets.length < 2) return;
    if (!window.confirm(`Delete the sheet "${wb.sheets[i].name}"? Formulas that use it will show #REF!.`)) return;
    commit({ ...wb, sheets: wb.sheets.filter((_, j) => j !== i) });
    setSheet(Math.max(0, i - 1));
  };

  // Ctrl+arrow: to the edge of the block of data, as in Excel
  const jump = (dr: number, dc: number): Pos => {
    let { r, c } = end;
    const filled = (p: Pos) => rawAt(p.r, p.c) !== '';
    const inside = (p: Pos) => p.r >= 0 && p.c >= 0 && p.r < rowCount && p.c < colCount;
    const step = (p: Pos) => ({ r: p.r + dr, c: p.c + dc });
    let p = { r, c };
    if (filled(p) && inside(step(p)) && filled(step(p))) {
      while (inside(step(p)) && filled(step(p))) p = step(p);
      return p;
    }
    p = step(p);
    while (inside(p) && !filled(p)) {
      if (!inside(step(p))) return p;
      p = step(p);
    }
    return inside(p) ? p : { r: Math.max(0, Math.min(rowCount - 1, p.r)), c: Math.max(0, Math.min(colCount - 1, p.c)) };
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    if (edit || dialog || renaming !== null) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (moves[e.key]) {
      e.preventDefault();
      const [dr, dc] = moves[e.key];
      const to = ctrl ? jump(dr, dc) : { r: end.r + dr, c: end.c + dc };
      select(to, e.shiftKey);
      return;
    }
    if (ctrl) {
      const k = e.key.toLowerCase();
      if (k === 'z') {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
      } else if (k === 'y') {
        e.preventDefault();
        doRedo();
      } else if (k === 'd') {
        e.preventDefault();
        fill('down');
      } else if (k === 'r') {
        e.preventDefault();
        fill('right');
      } else if (k === 'a') {
        e.preventDefault();
        setActive({ r: 0, c: 0 });
        setEnd({ r: Math.max(used.rows - 1, 0), c: Math.max(used.cols - 1, 0) });
      } else if (k === 'f' || k === 'h') {
        e.preventDefault();
        setDialog('find');
      } else if (k === 'e') {
        e.preventDefault();
        doFlashFill();
      } else if (k === 't') {
        e.preventDefault();
        setDialog('table');
      } else if (k === 'l' && e.shiftKey) {
        e.preventDefault();
        toggleFilter();
      }
      return;
    }
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        select({ r: active.r + (e.shiftKey ? -1 : 1), c: active.c });
        return;
      case 'Tab':
        e.preventDefault();
        select({ r: active.r, c: active.c + (e.shiftKey ? -1 : 1) });
        return;
      case 'F2':
        e.preventDefault();
        startEdit();
        return;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        clearRange();
        return;
      case 'Escape':
        setClip(null);
        return;
    }
    if (e.key.length === 1 && !e.altKey) {
      e.preventDefault();
      startEdit(e.key);
    }
  };

  const onEditKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(e.shiftKey ? 'up' : 'down');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitEdit(e.shiftKey ? 'left' : 'right');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const onCellDown = (e: React.MouseEvent, p: Pos) => {
    if (e.button !== 0) return;
    if (edit && pointable(edit) && !(edit.sheet === sheet && edit.r === p.r && edit.c === p.c)) {
      e.preventDefault();
      pointAt(p, p);
      mouse.current = 'point';
      return;
    }
    if (edit) {
      if (edit.sheet === sheet && edit.r === p.r && edit.c === p.c) return;
      commitEdit('none');
    }
    e.preventDefault();
    gridRef.current?.focus({ preventScroll: true });
    select(p, e.shiftKey);
    mouse.current = 'select';
  };

  const onCellEnter = (p: Pos) => {
    if (mouse.current === 'select') setEnd(p);
    else if (mouse.current === 'point' && edit?.point) pointAt(edit.point.anchor, p);
    else if (mouse.current === 'fill') setFillTo(p);
  };

  // ---------- Status bar ----------

  const stats = useMemo(() => {
    if (!multi) return null;
    let count = 0;
    let numbers = 0;
    let sum = 0;
    for (let r = range.r1; r <= Math.min(range.r2, range.r1 + 5000); r++)
      for (let c = range.c1; c <= range.c2; c++) {
        const v = calc.value(sheet, r, c);
        if (v === null || v === '') continue;
        count++;
        if (typeof v === 'number') {
          numbers++;
          sum += v;
        }
      }
    return { count, numbers, sum };
  }, [calc, sheet, range.r1, range.r2, range.c1, range.c2, multi]);

  const headers = Array.from({ length: Math.max(used.cols, 1) }, (_, c) => ({ c, label: toText(calc.value(sheet, 0, c)) || `Column ${colName(c)}` }));
  const hiddenRows = calc.hiddenRows(sheet);
  // Each table's look: its header row and banded rows
  const tableLook = new Map<string, string>();
  for (const t of current.tables ?? []) {
    const r = parseRange(t.ref);
    if (!r) continue;
    const look = TABLE_STYLE[t.style ?? 'blue'];
    for (let i = r.r1; i <= r.r2; i++) for (let j = r.c1; j <= r.c2; j++) tableLook.set(`${i}:${j}`, i === r.r1 ? look.head : (i - r.r1) % 2 === 0 ? look.band : '');
  }
  // Charts and slicers sit to the right of the data
  const besideData = 40 + Array.from({ length: used.cols + 1 }, (_, c) => widthOf(c)).reduce((a, b) => a + b, 0) + 12;
  const activeRaw = rawAt(active.r, active.c);
  const barValue = edit ? edit.draft : activeRaw;
  const mode = edit ? (pointable(edit) ? 'Point' : 'Edit') : 'Ready';
  const fillRange = fillTo
    ? fillTo.r > range.r2 && fillTo.r - range.r2 >= fillTo.c - range.c2
      ? { ...range, r2: fillTo.r }
      : fillTo.c > range.c2
        ? { ...range, c2: fillTo.c }
        : null
    : null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm text-slate-900 select-none">
      {/* Title bar */}
      <div className="h-8 bg-[#217346] text-white flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-4 h-4 rounded-sm bg-white text-[#217346] grid place-items-center"><Table2 className="w-3 h-3" /></span>
          <span>{fileName}</span>
          <span className="text-white/70">&middot; Saved</span>
        </div>
        <span className="w-6 h-6 rounded-full bg-white/20" aria-hidden="true" />
      </div>
      {/* Ribbon tabs */}
      <div className="h-8 flex items-end gap-0.5 px-2 bg-[#f3f2f1] shrink-0 text-[12px] text-[#424242]" aria-hidden="true">
        {['File', 'Home', 'Insert', 'Page Layout', 'Formulas', 'Data', 'Review', 'View'].map((t) => (
          <span key={t} className={`px-3 h-7 grid place-items-center ${t === 'Home' ? 'bg-white rounded-t text-[#217346] font-semibold border-b-2 border-[#217346]' : ''}`}>{t}</span>
        ))}
      </div>

      {/* Ribbon */}
      <div className="flex flex-wrap items-stretch gap-y-1 gap-x-1 px-2 py-1.5 border-b border-[#e1dfdd] bg-white shadow-[0_1px_2px_rgba(0,0,0,.06)] shrink-0 text-[11px]">
        <RibbonGroup label="Edit">
          <RibbonButton icon={<Undo2 className="w-3.5 h-3.5" />} label="" title="Undo (Ctrl+Z)" onClick={doUndo} disabled={!undo.length} />
          <RibbonButton icon={<Redo2 className="w-3.5 h-3.5" />} label="" title="Redo (Ctrl+Y)" onClick={doRedo} disabled={!redo.length} />
          <RibbonButton icon={<ClipboardPaste className="w-3.5 h-3.5" />} label="Paste values" title="Paste the values of the cells you copied, not their formulas" onClick={pasteValues} />
        </RibbonGroup>
        <RibbonGroup label="Number">
          <div className="flex items-center gap-0.5">
            {(
              [
                ['general', 'General'],
                ['number', '0.00'],
                ['currency', '£'],
                ['percent', '%'],
              ] as [CellFormat, string][]
            ).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-1.5 py-1 rounded font-semibold ${
                  (current.formats?.[cellAddr(active.r, active.c)] ?? 'general') === f ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </RibbonGroup>
        <RibbonGroup label="Cells">
          <RibbonButton icon={<Rows3 className="w-3.5 h-3.5" />} label="+Row" title="Insert rows above the selection" onClick={() => insertOrDelete('row', true)} />
          <RibbonButton icon={<Rows3 className="w-3.5 h-3.5" />} label="−Row" title="Delete the selected rows" onClick={() => insertOrDelete('row', false)} />
          <RibbonButton icon={<Layers className="w-3.5 h-3.5 rotate-90" />} label="+Col" title="Insert columns left of the selection" onClick={() => insertOrDelete('col', true)} />
          <RibbonButton icon={<Layers className="w-3.5 h-3.5 rotate-90" />} label="−Col" title="Delete the selected columns" onClick={() => insertOrDelete('col', false)} />
          <RibbonButton icon={<ArrowDownToLine className="w-3.5 h-3.5" />} label="Fill down" title="Copy the top cell down the selection (Ctrl+D)" onClick={() => fill('down')} />
        </RibbonGroup>
        <RibbonGroup label="Data">
          <RibbonButton icon={<ArrowDownAZ className="w-3.5 h-3.5" />} label="Sort A–Z" title="Sort the rows under the header by this column" onClick={() => sortBy(false)} />
          <RibbonButton icon={<ArrowUpZA className="w-3.5 h-3.5" />} label="Sort Z–A" title="Sort the rows under the header by this column, largest first" onClick={() => sortBy(true)} />
          <RibbonButton icon={<Rows3 className="w-3.5 h-3.5" />} label="Remove duplicates" onClick={() => setDialog('dupes')} />
          <RibbonButton icon={<Replace className="w-3.5 h-3.5" />} label="Find & replace" title="Find and replace (Ctrl+H)" onClick={() => setDialog('find')} />
          <RibbonButton icon={<Filter className="w-3.5 h-3.5" />} label={current.filter ? 'Clear filter' : 'Filter'} title="Filter buttons on the headers (Ctrl+Shift+L)" onClick={toggleFilter} />
          <RibbonButton icon={<Sparkles className="w-3.5 h-3.5" />} label="Flash Fill" title="Fill the column from the examples you typed (Ctrl+E)" onClick={doFlashFill} />
        </RibbonGroup>
        <RibbonGroup label="Get & transform">
          <RibbonButton icon={<Database className="w-3.5 h-3.5" />} label="Get data" title="Power Query: load, clean and combine files" onClick={() => setDialog('query')} />
          <RibbonButton icon={<RefreshCw className="w-3.5 h-3.5" />} label="Refresh all" title="Run every query again on the files" onClick={refreshAll} disabled={!wb.queries?.length} />
        </RibbonGroup>
        <RibbonGroup label="Insert">
          <RibbonButton icon={<Grid3x3 className="w-3.5 h-3.5" />} label="Table" title="Format as Table (Ctrl+T)" onClick={() => setDialog('table')} />
          <RibbonButton icon={<Table2 className="w-3.5 h-3.5" />} label="PivotTable" onClick={() => setDialog('pivot')} />
          <RibbonButton icon={<BarChart3 className="w-3.5 h-3.5" />} label="Chart" title="A chart of the selected data (labels in the first column)" onClick={addChart} />
          <RibbonButton
            icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            label="Slicer"
            title="Buttons that filter a table by one column"
            onClick={() => (tableAt(active) ? setDialog('slicer') : flash('Click a cell in a table first (Insert > Table), then add a slicer.'))}
          />
        </RibbonGroup>
        <RibbonGroup label="Styles">
          <RibbonButton icon={<Paintbrush className="w-3.5 h-3.5" />} label="Conditional formatting" title="Colour cells by a rule" onClick={() => setDialog('cf')} />
        </RibbonGroup>
        <RibbonGroup label="File">
          <RibbonButton icon={<FileUp className="w-3.5 h-3.5" />} label="Import CSV" onClick={() => setDialog('import')} />
          <RibbonButton icon={<Download className="w-3.5 h-3.5" />} label="Export CSV" title={onSaveFile ? 'Save this sheet to Files as a CSV' : 'Download this sheet as a CSV file'} onClick={exportCsv} />
        </RibbonGroup>
      </div>

      {/* Formula bar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-slate-200 shrink-0">
        <NameBox address={multi ? `${cellAddr(range.r1, range.c1)}:${cellAddr(range.r2, range.c2)}` : cellAddr(active.r, active.c)} onGo={(p) => {
            select(p);
            focusGrid();
          }} />
        <span className="text-slate-400 italic font-serif text-sm px-1" aria-hidden="true">
          fx
        </span>
        <input
          ref={barInputRef}
          value={barValue}
          aria-label="Formula bar"
          spellCheck={false}
          onFocus={() => !edit && startEdit()}
          onChange={(e) => setEdit((ed) => (ed ? { ...ed, draft: e.target.value, point: undefined } : { sheet, r: active.r, c: active.c, draft: e.target.value }))}
          onKeyDown={onEditKey}
          className="flex-1 min-w-0 h-6 px-2 text-xs font-mono border border-slate-200 rounded focus:outline-none focus:border-emerald-500 select-text"
        />
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onGridKey}
        onCopy={(e) => onCopy(e, false)}
        onCut={(e) => onCopy(e, true)}
        onPaste={onPaste}
        className="flex-1 min-h-0 overflow-auto focus:outline-none relative bg-white"
        aria-label={`Sheet ${current.name}`}
      >
        <table className="border-separate border-spacing-0 text-xs table-fixed" style={{ width: 40 + Array.from({ length: colCount }, (_, c) => widthOf(c)).reduce((a, b) => a + b, 0) }}>
          <colgroup>
            <col style={{ width: 40 }} />
            {Array.from({ length: colCount }, (_, c) => (
              <col key={c} style={{ width: widthOf(c) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 bg-slate-100 border-r border-b border-slate-300" style={{ height: ROW_HEIGHT }} />
              {Array.from({ length: colCount }, (_, c) => (
                <th
                  key={c}
                  onMouseDown={(e) => {
                    if (edit) commitEdit('none');
                    e.preventDefault();
                    gridRef.current?.focus({ preventScroll: true });
                    setActive({ r: 0, c: e.shiftKey ? active.c : c });
                    setEnd({ r: rowCount - 1, c });
                  }}
                  className={`sticky top-0 z-20 border-r border-b border-slate-300 font-normal text-[11px] relative cursor-default ${
                    c >= range.c1 && c <= range.c2 ? 'bg-emerald-100 text-emerald-900 font-semibold' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {colName(c)}
                  <span
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      resize.current = { key: `${sheet}:${c}`, startX: e.clientX, startW: widthOf(c) };
                    }}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rowCount }, (_, r) => r).filter((r) => !hiddenRows.has(r)).map((r) => (
              <tr key={r} style={{ height: ROW_HEIGHT }}>
                <td
                  onMouseDown={(e) => {
                    if (edit) commitEdit('none');
                    e.preventDefault();
                    gridRef.current?.focus({ preventScroll: true });
                    setActive({ r: e.shiftKey ? active.r : r, c: 0 });
                    setEnd({ r, c: colCount - 1 });
                  }}
                  className={`sticky left-0 z-10 border-r border-b border-slate-300 text-center text-[11px] ${
                    r >= range.r1 && r <= range.r2 ? 'bg-emerald-100 text-emerald-900 font-semibold' : 'bg-slate-100 text-slate-500'
                  } ${hiddenRows.has(r + 1) || (r > 0 && hiddenRows.has(r - 1)) ? 'text-sky-700' : ''}`}
                >
                  {r + 1}
                </td>
                {Array.from({ length: colCount }, (_, c) => {
                  const isActive = active.r === r && active.c === c;
                  const inRange = r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;
                  const editingHere = edit && edit.sheet === sheet && edit.r === r && edit.c === c;
                  const inFill = fillRange && r >= fillRange.r1 && r <= fillRange.r2 && c >= fillRange.c1 && c <= fillRange.c2;
                  const inClip = clip && clip.sheet === sheet && r >= clip.r && r < clip.r + clip.raw.length && c >= clip.c && c < clip.c + clip.raw[0].length;
                  const v = editingHere ? null : calc.value(sheet, r, c);
                  const text = editingHere ? '' : displayValue(v, current.formats?.[cellAddr(r, c)]);
                  const numeric = typeof v === 'number';
                  const isErrorValue = isError(v);
                  const cond = editingHere ? null : calc.condStyle(sheet, r, c);
                  const look = tableLook.get(`${r}:${c}`) ?? '';
                  const filterCol = filterArea && r === filterArea.r1 && c >= filterArea.c1 && c <= filterArea.c2 ? c - filterArea.c1 : null;
                  const filtered = filterCol !== null && !!current.filter?.criteria[String(filterCol)];
                  return (
                    <td
                      key={c}
                      data-cell={`${r}:${c}`}
                      onMouseDown={(e) => onCellDown(e, { r, c })}
                      onMouseEnter={() => onCellEnter({ r, c })}
                      onDoubleClick={() => {
                        if (!edit) startEdit();
                      }}
                      className={`relative border-r border-b border-slate-200 px-1 overflow-hidden whitespace-nowrap ${numeric ? 'text-right tabular-nums' : 'text-left'} ${look} ${
                        cond && cond.scale === undefined ? STYLE_CLASS[cond.style] : ''
                      } ${inRange && !isActive ? 'bg-emerald-50 text-slate-900' : ''} ${inFill ? 'bg-emerald-50/70' : ''} ${isErrorValue ? 'text-rose-700' : ''} ${filterCol !== null ? 'pr-5' : ''}`}
                      style={{ maxWidth: widthOf(c), ...(cond?.scale !== undefined && !inRange && { background: `rgba(16,185,129,${0.1 + 0.55 * cond.scale})` }) }}
                    >
                      {editingHere ? (
                        <input
                          ref={cellInputRef}
                          value={edit!.draft}
                          spellCheck={false}
                          onChange={(e) => setEdit({ ...edit!, draft: e.target.value, point: undefined })}
                          onKeyDown={onEditKey}
                          className="absolute inset-0 w-full h-full px-1 text-xs font-mono bg-white border-2 border-emerald-600 focus:outline-none z-10 select-text"
                        />
                      ) : (
                        text
                      )}
                      {filterCol !== null && !editingHere && (
                        <button
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => setFilterMenu(filterCol)}
                          title={filtered ? 'Filtered: click to change' : 'Filter or sort this column'}
                          aria-label={`Filter ${text}`}
                          className={`absolute right-0.5 top-1/2 -translate-y-1/2 w-4 h-4 grid place-items-center rounded-sm border text-[9px] leading-none z-[5] ${
                            filtered ? 'bg-sky-600 border-sky-700 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {filtered ? <Filter className="w-2.5 h-2.5" /> : '▾'}
                        </button>
                      )}
                      {isActive && !editingHere && <span className="pointer-events-none absolute inset-0 border-2 border-emerald-600" />}
                      {inClip && <span className="pointer-events-none absolute inset-0 border border-dashed border-emerald-500" />}
                      {!edit && r === range.r2 && c === range.c2 && (
                        <span
                          title="Drag to fill, double-click to fill down"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            mouse.current = 'fill';
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            autoFill();
                          }}
                          className="absolute -bottom-[3px] -right-[3px] w-[7px] h-[7px] bg-emerald-600 border border-white cursor-crosshair z-10"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Charts and slicers, beside the data */}
        {((current.charts?.length ?? 0) > 0 || (current.slicers?.length ?? 0) > 0) && (
          <div className="absolute top-7 flex flex-col gap-3 z-20" style={{ left: besideData }}>
            {(current.slicers ?? []).length > 0 && (
              <div className="flex gap-2">
                {(current.slicers ?? []).map((sl) => {
                  const t = (current.tables ?? []).find((x) => x.name.toLowerCase() === sl.table.toLowerCase());
                  const tr = t && parseRange(t.ref);
                  const col = tr ? Array.from({ length: tr.c2 - tr.c1 + 1 }, (_, j) => tr.c1 + j).find((j) => toText(calc.value(sheet, tr.r1, j)).toLowerCase() === sl.column.toLowerCase()) : undefined;
                  const vals = tr && col !== undefined ? [...new Set(columnValues(calc, sheet, tr.r1 + 1, tr.r2, col))].sort() : [];
                  return (
                    <SlicerBox
                      key={sl.id}
                      slicer={sl}
                      values={vals}
                      onChange={(next) => updateSheet((x) => ({ ...x, slicers: x.slicers!.map((y) => (y.id === sl.id ? next : y)) }))}
                      onDelete={() => updateSheet((x) => ({ ...x, slicers: x.slicers!.filter((y) => y.id !== sl.id) }))}
                    />
                  );
                })}
              </div>
            )}
            {(current.charts ?? []).map((ch) => (
              <ChartBox
                key={ch.id}
                calc={calc}
                sheet={sheet}
                chart={ch}
                onChange={(next) => updateSheet((x) => ({ ...x, charts: x.charts!.map((y) => (y.id === ch.id ? next : y)) }))}
                onDelete={() => updateSheet((x) => ({ ...x, charts: x.charts!.filter((y) => y.id !== ch.id) }))}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sheet tabs */}
      <div className="flex items-center gap-0.5 px-2 border-t border-[#e1dfdd] bg-[#f3f2f1] shrink-0 overflow-x-auto h-8">
        {wb.sheets.map((s, i) =>
          renaming === i ? (
            <input
              key={i}
              autoFocus
              defaultValue={s.name}
              onBlur={(e) => renameSheet(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameSheet(i, (e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setRenaming(null);
              }}
              className="h-6 w-28 px-2 text-xs border border-emerald-500 rounded focus:outline-none"
            />
          ) : (
            <div
              key={i}
              onMouseDown={(e) => {
                // While a formula is being written, switching sheets lets it point at cells there
                if (edit && pointable(edit)) e.preventDefault();
                else if (edit) commitEdit('none');
                setSheet(i);
                if (!edit) select({ r: 0, c: 0 });
              }}
              onDoubleClick={() => setRenaming(i)}
              title="Double-click to rename"
              className={`group flex items-center gap-1 h-6 px-3 text-xs rounded-b cursor-pointer ${
                i === sheet ? 'bg-white text-emerald-800 font-semibold border-x border-b border-slate-300 -mt-px' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{s.name}</span>
              {i === sheet && wb.sheets.length > 1 && (
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => deleteSheet(i)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600"
                  aria-label={`Delete sheet ${s.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )
        )}
        <button onClick={addSheet} className="ml-1 p-1 text-slate-500 hover:text-emerald-700 hover:bg-slate-200 rounded" aria-label="Add a sheet" title="Add a sheet">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Status bar */}
      <div className="h-6 flex items-center justify-between px-3 bg-[#f3f2f1] border-t border-[#e1dfdd] text-[11px] text-[#424242] shrink-0">
        <span>{toast ?? mode}</span>
        {stats && (
          <span className="tabular-nums space-x-4">
            {stats.numbers > 0 && <span>Average: {displayValue(stats.sum / stats.numbers)}</span>}
            <span>Count: {stats.count}</span>
            {stats.numbers > 0 && <span>Sum: {displayValue(stats.sum)}</span>}
          </span>
        )}
      </div>

      {dialog === 'find' && (
        <FindReplaceDialog
          onClose={() => {
            setDialog(null);
            focusGrid();
          }}
          onFindNext={(find, matchCase, whole) => {
            const cells = Object.keys(current.cells)
              .map((a) => ({ a, p: parseAddr(a)! }))
              .sort((x, y) => x.p.r - y.p.r || x.p.c - y.p.c);
            const hits = cells.filter(({ a }) => matches(current.cells[a], find, matchCase, whole));
            if (!hits.length) return flash(`Couldn't find "${find}".`);
            const next = hits.find(({ p }) => p.r > active.r || (p.r === active.r && p.c > active.c)) ?? hits[0];
            select(next.p);
          }}
          onReplaceAll={(find, replacement, matchCase, whole) => {
            const updates: Record<string, string> = {};
            for (const [a, raw] of Object.entries(current.cells)) {
              if (!matches(raw, find, matchCase, whole)) continue;
              updates[a] = whole ? replacement : raw.replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi'), () => replacement);
            }
            const n = Object.keys(updates).length;
            if (n) commit(setCells(wb, sheet, updates));
            flash(n ? `All done. We made ${n} replacement${n === 1 ? '' : 's'}.` : `Couldn't find "${find}".`);
          }}
        />
      )}

      {dialog === 'dupes' && (
        <DuplicatesDialog
          headers={headers}
          onClose={() => {
            setDialog(null);
            focusGrid();
          }}
          onRemove={(cols) => {
            const total = used.rows - 1;
            const seen = new Set<string>();
            const keep: number[] = [];
            for (let i = 0; i < total; i++) {
              const key = JSON.stringify(cols.map((c) => toText(calc.value(sheet, i + 1, c)).toLowerCase()));
              if (seen.has(key)) continue;
              seen.add(key);
              keep.push(i);
            }
            const removed = total - keep.length;
            if (removed) commit(reorderRows(wb, sheet, 1, keep, total));
            setDialog(null);
            flash(removed ? `${removed} duplicate row${removed === 1 ? '' : 's'} found and removed; ${keep.length} unique rows remain.` : 'No duplicate rows found.');
            focusGrid();
          }}
        />
      )}

      {dialog === 'pivot' && (
        <PivotDialog
          headers={headers}
          onClose={() => {
            setDialog(null);
            focusGrid();
          }}
          onCreate={(rowsCol, valueCol, how, colsCol) => {
            // Each data row's group (and column group), its value, and whether it counts
            const cells: { row: string; col: string; n: number | null; filled: boolean }[] = [];
            const labelOf = (v: string) => v || '(blank)';
            for (let r = 1; r < used.rows; r++) {
              const v = calc.value(sheet, r, valueCol);
              cells.push({
                row: labelOf(toText(calc.value(sheet, r, rowsCol))),
                col: colsCol === null ? '' : labelOf(toText(calc.value(sheet, r, colsCol))),
                n: typeof v === 'number' ? v : typeof v === 'string' ? parseNumber(v) : null,
                filled: v !== null && v !== '',
              });
            }
            const summarise = (xs: typeof cells) => {
              const ns = xs.map((x) => x.n).filter((n): n is number => n !== null);
              const v = how === 'Count' ? xs.filter((x) => x.filled).length : how === 'Sum' ? ns.reduce((a, b) => a + b, 0) : how === 'Max' ? (ns.length ? Math.max(...ns) : 0) : how === 'Min' ? (ns.length ? Math.min(...ns) : 0) : ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
              return Number(v.toFixed(10));
            };
            const distinct = (key: 'row' | 'col') => {
              const seen = new Map<string, string>();
              for (const x of cells) if (!seen.has(x[key].toLowerCase())) seen.set(x[key].toLowerCase(), x[key]);
              return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            };
            const rowKeys = distinct('row');
            const colKeys = colsCol === null ? [] : distinct('col');
            const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
            const rows: (string | number)[][] =
              colsCol === null
                ? [
                    [headers[rowsCol].label, `${how} of ${headers[valueCol].label}`],
                    ...rowKeys.map((k) => [k, summarise(cells.filter((x) => same(x.row, k)))]),
                    ['Grand Total', summarise(cells)],
                  ]
                : [
                    [`${how} of ${headers[valueCol].label}`, ...colKeys, 'Grand Total'],
                    ...rowKeys.map((k) => [k, ...colKeys.map((ck) => summarise(cells.filter((x) => same(x.row, k) && same(x.col, ck)))), summarise(cells.filter((x) => same(x.row, k)))]),
                    ['Grand Total', ...colKeys.map((ck) => summarise(cells.filter((x) => same(x.col, ck)))), summarise(cells)],
                  ];
            const name = freeSheetName(wb, 'Pivot');
            const next = { ...wb, sheets: [...wb.sheets, sheetFromRows(name, rows)] };
            commit(next);
            setSheet(next.sheets.length - 1);
            select({ r: 0, c: 0 });
            setDialog(null);
            flash(`PivotTable added on the sheet "${name}".`);
            focusGrid();
          }}
        />
      )}

      {dialog === 'query' && (
        <PowerQueryEditor
          files={files}
          queries={wb.queries ?? []}
          onClose={() => {
            setDialog(null);
            focusGrid();
          }}
          onLoad={(queries) => {
            const problems = loadQueries(queries);
            setDialog(null);
            flash(problems.length ? `Loaded with problems: ${problems.join('; ')}` : `Loaded ${queries.length} ${queries.length === 1 ? 'query' : 'queries'} to ${queries.length === 1 ? 'a sheet' : 'sheets'}.`);
            focusGrid();
          }}
        />
      )}

      {dialog === 'table' && (
        <TableDialog
          title="Create table"
          range={rangeText(selectionOrRegion())}
          name={(() => {
            for (let i = 1; ; i++) if (!allTables.some((t) => t.name.toLowerCase() === `table${i}`)) return `Table${i}`;
          })()}
          taken={allTables.map((t) => t.name)}
          onSave={makeTable}
          onClose={() => {
            setDialog(null);
            focusGrid();
          }}
        />
      )}

      {dialog === 'slicer' && tableAt(active) && (
        <PickDialog
          title={`Insert slicer: ${tableAt(active)!.name}`}
          label="Filter the table by"
          options={(() => {
            const r = parseRange(tableAt(active)!.ref)!;
            return Array.from({ length: r.c2 - r.c1 + 1 }, (_, j) => toText(calc.value(sheet, r.r1, r.c1 + j))).filter(Boolean);
          })()}
          onPick={addSlicer}
          onClose={() => {
            setDialog(null);
            focusGrid();
          }}
        />
      )}

      {dialog === 'cf' && (
        <CondFormatDialog
          range={rangeText(range)}
          rules={current.conditional ?? []}
          onAdd={(f) => {
            updateSheet((x) => ({ ...x, conditional: [...(x.conditional ?? []), f] }));
            flash(`Rule added to ${f.ref}.`);
          }}
          onRemove={(i) => updateSheet((x) => ({ ...x, conditional: (x.conditional ?? []).filter((_, j) => j !== i) }))}
          onClose={() => {
            setDialog(null);
            focusGrid();
          }}
        />
      )}

      {filterMenu !== null && filterArea && current.filter && (
        <FilterMenu
          header={toText(calc.value(sheet, filterArea.r1, filterArea.c1 + filterMenu)) || colName(filterArea.c1 + filterMenu)}
          values={columnValues(calc, sheet, filterArea.r1 + 1, filterArea.r2, filterArea.c1 + filterMenu)}
          numeric={Array.from({ length: filterArea.r2 - filterArea.r1 }, (_, i) => calc.value(sheet, filterArea.r1 + 1 + i, filterArea.c1 + filterMenu)).some((v) => typeof v === 'number')}
          current={current.filter.criteria[String(filterMenu)]}
          onSort={(desc) => {
            sortArea(filterArea, filterArea.c1 + filterMenu, desc);
            setFilterMenu(null);
          }}
          onApply={(crit) => {
            const off = String(filterMenu);
            updateSheet((x) => {
              const criteria = { ...(x.filter?.criteria ?? {}) };
              if (crit) criteria[off] = crit;
              else delete criteria[off];
              return { ...x, filter: { ref: x.filter!.ref, criteria } };
            });
            setFilterMenu(null);
            focusGrid();
          }}
          onClose={() => setFilterMenu(null)}
        />
      )}

      {dialog === 'import' && <ImportDialog files={files} accept="CSV" onClose={() => setDialog(null)} onImport={importCsv} />}
    </div>
  );
};

function matches(raw: string, find: string, matchCase: boolean, whole: boolean) {
  if (!find) return false;
  const a = matchCase ? raw : raw.toLowerCase();
  const b = matchCase ? find : find.toLowerCase();
  return whole ? a === b : a.includes(b);
}

const RibbonGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col justify-between px-1.5 border-r border-slate-200 last:border-r-0 shrink-0">
    <div className="flex items-center gap-0.5">{children}</div>
    <div className="text-[10px] text-[#605e5c] text-center mt-0.5">{label}</div>
  </div>
);

export const RibbonButton: React.FC<{ icon: React.ReactNode; label: string; title?: string; onClick: () => void; disabled?: boolean }> = ({
  icon,
  label,
  title,
  onClick,
  disabled,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title ?? label}
    className="flex items-center gap-1 px-1.5 py-1 rounded text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent whitespace-nowrap"
  >
    {icon}
    {label && <span>{label}</span>}
  </button>
);

const NameBox: React.FC<{ address: string; onGo: (p: Pos) => void }> = ({ address, onGo }) => {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      value={draft ?? address}
      aria-label="Name box"
      onFocus={(e) => {
        setDraft(address);
        e.target.select();
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => setDraft(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const p = parseAddr(draft ?? '');
          if (p) onGo(p);
          setDraft(null);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-24 h-6 px-2 text-xs font-mono border border-slate-200 rounded focus:outline-none focus:border-emerald-500 select-text"
    />
  );
};

export const DialogShell: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }> = ({ title, onClose, children, footer }) => (
  <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-900/20" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div role="dialog" aria-label={title} className="bg-white border border-slate-300 rounded-lg shadow-xl w-[380px] max-w-[92%] text-xs select-text">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200">
        <span className="font-semibold text-slate-900">{title}</span>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-3">{children}</div>
      <div className="flex justify-end gap-2 px-4 py-2.5 border-t border-slate-200 bg-slate-50 rounded-b-lg">{footer}</div>
    </div>
  </div>
);

const primaryBtn = 'px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold disabled:opacity-50';
const secondaryBtn = 'px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold';
const fieldClass = 'w-full h-7 px-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-500';

const FindReplaceDialog: React.FC<{
  onClose: () => void;
  onFindNext: (find: string, matchCase: boolean, whole: boolean) => void;
  onReplaceAll: (find: string, replacement: string, matchCase: boolean, whole: boolean) => void;
}> = ({ onClose, onFindNext, onReplaceAll }) => {
  const [find, setFind] = useState('');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [whole, setWhole] = useState(false);
  return (
    <DialogShell
      title="Find and replace"
      onClose={onClose}
      footer={
        <>
          <button className={secondaryBtn} disabled={!find} onClick={() => onFindNext(find, matchCase, whole)}>
            Find next
          </button>
          <button className={primaryBtn} disabled={!find} onClick={() => onReplaceAll(find, replacement, matchCase, whole)}>
            Replace all
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-slate-600">Find what</span>
        <input autoFocus value={find} onChange={(e) => setFind(e.target.value)} className={fieldClass} />
      </label>
      <label className="block space-y-1">
        <span className="text-slate-600">Replace with</span>
        <input value={replacement} onChange={(e) => setReplacement(e.target.value)} className={fieldClass} />
      </label>
      <div className="flex gap-4 text-slate-700">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} className="accent-emerald-700" />
          Match case
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} className="accent-emerald-700" />
          Match entire cell contents
        </label>
      </div>
      <p className="text-[11px] text-slate-500">Searches this sheet, including inside formulas. Spaces count: search for a space to find stray ones.</p>
    </DialogShell>
  );
};

const DuplicatesDialog: React.FC<{ headers: { c: number; label: string }[]; onClose: () => void; onRemove: (cols: number[]) => void }> = ({ headers, onClose, onRemove }) => {
  const [cols, setCols] = useState<number[]>(headers.map((h) => h.c));
  return (
    <DialogShell
      title="Remove duplicates"
      onClose={onClose}
      footer={
        <>
          <button className={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryBtn} disabled={!cols.length} onClick={() => onRemove(cols)}>
            OK
          </button>
        </>
      }
    >
      <p className="text-slate-600">Rows count as duplicates when they match in every column ticked. The first of each stays. Row 1 is treated as headers.</p>
      <div className="flex gap-3 text-[11px]">
        <button className="text-emerald-700 font-semibold" onClick={() => setCols(headers.map((h) => h.c))}>
          Select all
        </button>
        <button className="text-emerald-700 font-semibold" onClick={() => setCols([])}>
          Unselect all
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded p-2 space-y-1">
        {headers.map((h) => (
          <label key={h.c} className="flex items-center gap-2 text-slate-800">
            <input
              type="checkbox"
              className="accent-emerald-700"
              checked={cols.includes(h.c)}
              onChange={(e) => setCols((cs) => (e.target.checked ? [...cs, h.c].sort((a, b) => a - b) : cs.filter((c) => c !== h.c)))}
            />
            {h.label}
          </label>
        ))}
      </div>
    </DialogShell>
  );
};

type PivotHow = 'Sum' | 'Count' | 'Average' | 'Max' | 'Min';

const PivotDialog: React.FC<{
  headers: { c: number; label: string }[];
  onClose: () => void;
  onCreate: (rowsCol: number, valueCol: number, how: PivotHow, colsCol: number | null) => void;
}> = ({ headers, onClose, onCreate }) => {
  const [rowsCol, setRowsCol] = useState(headers[0]?.c ?? 0);
  const [colsCol, setColsCol] = useState<number | null>(null);
  const [valueCol, setValueCol] = useState(headers[headers.length - 1]?.c ?? 0);
  const [how, setHow] = useState<PivotHow>('Sum');
  return (
    <DialogShell
      title="Create PivotTable"
      onClose={onClose}
      footer={
        <>
          <button className={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryBtn} onClick={() => onCreate(rowsCol, valueCol, how, colsCol)}>
            Create
          </button>
        </>
      }
    >
      <p className="text-slate-600">Summarises the data on this sheet (row 1 as headers) on a new sheet. The result is values: it won't update if the data changes.</p>
      <label className="block space-y-1">
        <span className="text-slate-600">Rows</span>
        <select value={rowsCol} onChange={(e) => setRowsCol(Number(e.target.value))} className={fieldClass}>
          {headers.map((h) => (
            <option key={h.c} value={h.c}>
              {h.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-slate-600">Columns (optional)</span>
        <select value={colsCol ?? ''} onChange={(e) => setColsCol(e.target.value === '' ? null : Number(e.target.value))} className={fieldClass}>
          <option value="">(none)</option>
          {headers.map((h) => (
            <option key={h.c} value={h.c}>
              {h.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-slate-600">Values</span>
        <select value={valueCol} onChange={(e) => setValueCol(Number(e.target.value))} className={fieldClass}>
          {headers.map((h) => (
            <option key={h.c} value={h.c}>
              {h.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-slate-600">Summarise values by</span>
        <select value={how} onChange={(e) => setHow(e.target.value as PivotHow)} className={fieldClass}>
          <option>Sum</option>
          <option>Count</option>
          <option>Average</option>
          <option>Max</option>
          <option>Min</option>
        </select>
      </label>
    </DialogShell>
  );
};

// Picks a file to import: one of the scenario's files, or one from the candidate's computer
export const ImportDialog: React.FC<{
  files: CaseFile[];
  accept: string;
  onClose: () => void;
  onImport: (name: string, text: string) => void;
  extra?: React.ReactNode;
}> = ({ files, accept, onClose, onImport, extra }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <DialogShell
      title={`Import ${accept}`}
      onClose={onClose}
      footer={
        <button className={secondaryBtn} onClick={onClose}>
          Cancel
        </button>
      }
    >
      {extra}
      {files.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-slate-600">Files shared with you</div>
          {files.map((f) => (
            <button
              key={f.name}
              onClick={() => onImport(f.name, f.content)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 rounded hover:border-emerald-500 hover:bg-emerald-50 text-left"
            >
              <span className="font-mono text-slate-800">{f.name}</span>
              <span className="text-slate-400">{Math.max(parseCsv(f.content).length - 1, 0)} rows</span>
            </button>
          ))}
        </div>
      )}
      <div className="space-y-1.5">
        <div className="text-slate-600">From your computer</div>
        <button className={secondaryBtn} onClick={() => inputRef.current?.click()}>
          Choose a .csv file…
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file.name, await readTextFile(file));
          }}
        />
      </div>
    </DialogShell>
  );
};
