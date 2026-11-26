import React, { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Copy, FileDown, FileUp, Search, X } from 'lucide-react';
import { CaseFile } from '../../types';
import { DesktopConfig, DesktopState } from '../../lib/desktop';
import { DeskAppsState } from '../../lib/deskApps';
import { FileKind, Grid, copyGrid, fileKind, gridFromClipboard, toCsv } from '../../lib/deskData';
import { readTextFile } from '../../lib/csv';

// What every work app gets from the desktop: the day, the computer's files, and ways to save and hand things on
export interface DeskCtx {
  cfg: DesktopConfig;
  state: DesktopState;
  files: CaseFile[];
  // Saves a file to the computer (replacing one of that name, or the one it was renamed from) and says so; a note of ''
  // saves quietly
  saveFile: (f: CaseFile, note?: string, renamedFrom?: string) => void;
  // Takes one of the candidate's own files off the computer
  removeFile: (name: string) => void;
  // Opens a file in the app that reads it (Spreadsheet, Docs, BI…), or in Files
  openFile: (name: string, app?: string) => void;
  toast: (text: string) => void;
  // Updates one work app's state
  setWork: <K extends keyof DeskAppsState>(app: K, next: DeskAppsState[K]) => void;
  // Whether the day has reached a phase
  reached: (phase?: string) => boolean;
  // The desktop's state now (after an await, ctx.state may be out of date)
  latest: () => DesktopState;
  // The company looking back at the candidate's desktop: nothing changes and nothing is sent
  readOnly?: boolean;
  me: { name: string; email: string };
}

export const btn = 'h-8 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1.5 disabled:opacity-40';
// Each app sets its own accent (--accent, --accent-soft, --accent-ink) on its root, like the real tool's brand colour
export const primary = 'h-8 px-3 rounded-md bg-[var(--accent,#0284c7)] hover:brightness-95 text-[var(--accent-ink,#fff)] text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40';
export const input = 'w-full h-8 px-2.5 border border-slate-200 rounded-md text-[13px] bg-white focus:outline-none focus:border-[var(--accent,#0284c7)] focus:ring-2 focus:ring-[var(--accent-soft,#e0f2fe)]';

// A name from "Name <email>" or an email, for showing people
export const personName = (cfg: DesktopConfig, who: string) => {
  const email = (who.match(/<([^>]+)>/)?.[1] ?? who).trim().toLowerCase();
  if (email === cfg.user.email.toLowerCase()) return cfg.user.name;
  return cfg.contacts.find((c) => c.email.toLowerCase() === email)?.name ?? who.replace(/<[^>]+>/, '').trim() ?? who;
};
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
const TINTS = ['bg-sky-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600', 'bg-teal-600', 'bg-indigo-600', 'bg-fuchsia-600'];
export const Avatar: React.FC<{ name: string; size?: number; square?: boolean }> = ({ name, size = 28, square }) => {
  const tint = TINTS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
  return (
    <span className={`shrink-0 ${square ? 'rounded-md' : 'rounded-full'} ${tint} text-white grid place-items-center font-semibold`} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {initials(name) || '?'}
    </span>
  );
};

// The buttons every table has: copy it (pastes into Spreadsheet, Docs, Mail as a table) and save it as a CSV in Files
export const TableActions: React.FC<{ ctx: DeskCtx; grid: () => Grid; name: string }> = ({ ctx, grid, name }) => (
  <>
    <button className={btn} onClick={async () => ctx.toast((await copyGrid(grid())) ? 'Copied. Paste it into Spreadsheet, Docs, Mail or Chat.' : 'Copy was blocked by the browser: use Save as CSV instead.')} title="Copy as a table">
      <Copy className="w-3.5 h-3.5" />
      Copy
    </button>
    <button className={btn} onClick={() => ctx.saveFile({ name: name.endsWith('.csv') ? name : `${name}.csv`, content: toCsv(grid()) })} title="Save to Files as a CSV">
      <FileDown className="w-3.5 h-3.5" />
      Save as CSV
    </button>
  </>
);

// A sortable, searchable table of records, the list view of the CRM, the help desk and forms
export function DataGrid<T extends Record<string, unknown>>({
  rows,
  columns,
  onOpen,
  selected,
  empty = 'Nothing here.',
}: {
  rows: T[];
  columns: { key: string; label: string; render?: (r: T) => React.ReactNode; num?: boolean; width?: number }[];
  onOpen?: (r: T) => void;
  selected?: (r: T) => boolean;
  empty?: string;
}) {
  const [sort, setSort] = useState<{ key: string; desc: boolean } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const val = (r: T) => r[sort.key];
    return [...rows].sort((a, b) => {
      const x = String(val(a) ?? '');
      const y = String(val(b) ?? '');
      const nx = Number(x.replace(/[£$€,%]/g, ''));
      const ny = Number(y.replace(/[£$€,%]/g, ''));
      const d = x && y && Number.isFinite(nx) && Number.isFinite(ny) ? nx - ny : x.localeCompare(y, undefined, { numeric: true });
      return sort.desc ? -d : d;
    });
  }, [rows, sort]);
  return (
    <table className="min-w-full text-[12.5px] select-text">
      <thead className="sticky top-0 bg-slate-50 z-[1]">
        <tr>
          {columns.map((c) => (
            <th key={c.key} style={c.width ? { width: c.width } : undefined} className={`px-3 py-2 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap ${c.num ? 'text-right' : 'text-left'}`}>
              <button onClick={() => setSort((s) => (s?.key === c.key ? (s.desc ? null : { key: c.key, desc: true }) : { key: c.key, desc: false }))} className="inline-flex items-center gap-1 hover:text-slate-900">
                {c.label}
                {sort?.key === c.key && (sort.desc ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((r, i) => (
          <tr key={String(r.id ?? i)} onClick={() => onOpen?.(r)} className={`border-b border-slate-100 ${onOpen ? 'cursor-pointer' : ''} ${selected?.(r) ? 'bg-[var(--accent-soft,#f0f9ff)]' : 'hover:bg-slate-50'}`}>
            {columns.map((c) => (
              <td key={c.key} className={`px-3 py-1.5 align-top ${c.num ? 'text-right tabular-nums' : ''}`}>
                {c.render ? c.render(r) : String(r[c.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
        {sorted.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="px-3 py-6 text-center text-xs text-slate-400">
              {empty}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export const SearchBox: React.FC<{ value: string; onChange: (v: string) => void; placeholder?: string }> = ({ value, onChange, placeholder = 'Search' }) => (
  <label className="flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-slate-200 bg-white focus-within:border-[var(--accent,#0284c7)] min-w-0">
    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 min-w-0 text-[13px] outline-none bg-transparent" />
    {value && (
      <button onClick={() => onChange('')} aria-label="Clear search" className="text-slate-400 hover:text-slate-700">
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </label>
);

export const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, footer, wide }) => (
  <div className="absolute inset-0 z-50 bg-slate-900/30 grid place-items-center p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
    <div role="dialog" aria-label={title} className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-full flex flex-col bg-white rounded-lg shadow-2xl border border-slate-200`}>
      <div className="flex items-center px-4 h-11 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="ml-auto w-7 h-7 grid place-items-center rounded hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 overflow-y-auto space-y-3 text-[13px]">{children}</div>
      {footer && <div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">{footer}</div>}
    </div>
  </div>
);

// Picks a file on the computer (of the kinds the app reads), or one from the candidate's own computer
export const FilePicker: React.FC<{ ctx: DeskCtx; kinds: FileKind[]; title: string; onPick: (f: CaseFile) => void; onClose: () => void; pasteTable?: boolean }> = ({ ctx, kinds, title, onPick, onClose, pasteTable }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState('');
  const files = ctx.files.filter((f) => kinds.includes(fileKind(f.name)));
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-slate-600">On this computer</div>
        {files.length === 0 && <p className="text-xs text-slate-400">No files of that kind yet. Save or export one, or download it from an email or a site.</p>}
        {files.map((f) => (
          <button key={f.name} onClick={() => onPick(f)} className="w-full flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md hover:border-[var(--accent,#0284c7)] hover:bg-[var(--accent-soft,#f0f9ff)] text-left">
            <FileUp className="w-4 h-4 text-slate-400" />
            <span className="truncate">{f.name}</span>
          </button>
        ))}
      </div>
      {pasteTable && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-600">Or paste a table (from Spreadsheet, a web page or a CSV)</div>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            onPaste={(e) => {
              const g = gridFromClipboard(e.clipboardData.getData('text/plain'), e.clipboardData.getData('text/html'));
              if (g) {
                e.preventDefault();
                setPasted(toCsv(g));
              }
            }}
            rows={4}
            className="w-full px-2 py-1.5 border border-slate-200 rounded-md font-mono text-[11.5px]"
            placeholder="Ctrl+V here"
          />
          <button className={btn} disabled={!pasted.trim()} onClick={() => onPick({ name: 'Pasted table.csv', content: gridFromClipboard(pasted) ? toCsv(gridFromClipboard(pasted)!) : pasted })}>
            Use the pasted table
          </button>
        </div>
      )}
      <div className="space-y-1.5">
        <div className="text-xs font-semibold text-slate-600">From your own computer</div>
        <button className={btn} onClick={() => ref.current?.click()}>
          Choose a file…
        </button>
        <input
          ref={ref}
          type="file"
          className="hidden"
          accept=".csv,.tsv,.txt,.md,.html,.htm"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) onPick({ name: f.name, content: await readTextFile(f) });
          }}
        />
      </div>
    </Modal>
  );
};

// Fills a select from a list, with an empty choice
export const Select: React.FC<{ value: string; onChange: (v: string) => void; options: string[]; empty?: string; className?: string; label?: string }> = ({ value, onChange, options, empty, className = input, label }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={className} aria-label={label}>
    {empty !== undefined && <option value="">{empty}</option>}
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
);

export const nowLabel = () => 'Just now';

// An app's accent colours, set on its root element
export const accent = (main: string, soft: string, ink = '#fff') => ({ '--accent': main, '--accent-soft': soft, '--accent-ink': ink }) as React.CSSProperties;
