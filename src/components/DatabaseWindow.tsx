import React, { useEffect, useRef, useState } from 'react';
import type { Database } from 'sql.js';
import { ChevronDown, ChevronRight, Columns3, Database as DatabaseIcon, Download, Eye, FileUp, Folder, Play, RotateCcw, Server, Table2 } from 'lucide-react';
import { CaseFile, DataTable } from '../types';
import { BatchResult, describeDatabase, importStatements, openTaskDatabase, runBatch, sqlIdent } from '../lib/sqlEngine';
import { parseDatabaseWork } from '../lib/databaseWork';
import { downloadFile, parseCsv, toCsv } from '../lib/csv';
import { DialogShell, ImportDialog, RibbonButton } from './SpreadsheetWindow';
import { Pulse } from './Pulse';

const MAX_ROWS_SHOWN = 1000;

interface DatabaseWindowProps {
  value: string;
  onChange: (json: string) => void;
  tables: DataTable[];
  databaseName: string;
  files?: CaseFile[];
}

type DbObject = ReturnType<typeof describeDatabase>[number];

export const DatabaseWindow: React.FC<DatabaseWindowProps> = ({ value, onChange, tables, databaseName, files = [] }) => {
  const initial = useRef(parseDatabaseWork(value));
  const [script, setScript] = useState(initial.current.script);
  const changes = useRef<string[]>(initial.current.changes);
  const dbRef = useRef<Database | null>(null);
  const [ready, setReady] = useState(false);
  const [objects, setObjects] = useState<DbObject[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({ server: true, dbs: true, db: true, tables: true, views: true });
  const [result, setResult] = useState<BatchResult | null>(null);
  const [tab, setTab] = useState<'results' | 'messages'>('results');
  const [running, setRunning] = useState(false);
  const [importing, setImporting] = useState<{ name: string; text: string } | null>(null);
  const [picking, setPicking] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const save = (nextScript = script) => onChange(JSON.stringify({ script: nextScript, changes: changes.current }));
  const refresh = () => dbRef.current && setObjects(describeDatabase(dbRef.current));

  useEffect(() => {
    let alive = true;
    openTaskDatabase(tables, changes.current).then((db) => {
      if (!alive) return db.close();
      dbRef.current = db;
      setObjects(describeDatabase(db));
      setReady(true);
    });
    return () => {
      alive = false;
      dbRef.current?.close();
      dbRef.current = null;
    };
  }, []);

  const execute = (sql?: string) => {
    const db = dbRef.current;
    if (!db) return;
    const el = editorRef.current;
    const selected = el && el.selectionStart !== el.selectionEnd ? script.slice(el.selectionStart, el.selectionEnd) : '';
    const batch = sql ?? (selected.trim() ? selected : script);
    if (!batch.trim()) return;
    setRunning(true);
    // Lets the "Executing" state show before a long query blocks the page
    window.setTimeout(() => {
      const res = runBatch(db, batch);
      if (res.changes.length) {
        changes.current = [...changes.current, ...res.changes];
        save();
        refresh();
      }
      setResult(res);
      setTab(res.resultSets.length && !res.messages.some((m) => m.error) ? 'results' : 'messages');
      setRunning(false);
    }, 10);
  };

  const reset = async () => {
    if (!window.confirm('Put the database back the way it started? Every change you made to it is undone. Your query window stays as it is.')) return;
    dbRef.current?.close();
    changes.current = [];
    dbRef.current = await openTaskDatabase(tables, []);
    save();
    refresh();
    setResult({ resultSets: [], messages: [{ text: 'The database was reset to how it started.' }], changes: [], ms: 0 });
    setTab('messages');
  };

  const insertAtCaret = (text: string) => {
    const el = editorRef.current;
    const at = el ? el.selectionStart : script.length;
    const to = el ? el.selectionEnd : script.length;
    const next = script.slice(0, at) + text + script.slice(to);
    setScript(next);
    save(next);
    window.setTimeout(() => {
      el?.focus();
      el?.setSelectionRange(at + text.length, at + text.length);
    }, 0);
  };

  const selectTop = (name: string) => {
    const sql = `SELECT *\nFROM ${/^\w+$/.test(name) ? name : sqlIdent(name)}\nLIMIT 100;`;
    const next = script.trim() ? `${script.replace(/\s*$/, '')}\n\n${sql}` : sql;
    setScript(next);
    save(next);
    execute(sql);
  };

  const onEditorKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
      e.preventDefault();
      execute();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCaret('    ');
    }
  };

  const lines = script.split('\n').length;
  const hasError = result?.messages.some((m) => m.error);
  const tableObjects = objects.filter((o) => o.kind === 'table');
  const viewObjects = objects.filter((o) => o.kind === 'view');

  return (
    <div className="flex flex-col h-full min-h-0 bg-white border border-slate-300 rounded-lg overflow-hidden shadow-sm text-slate-900">
      {/* Title bar */}
      <div className="h-8 bg-slate-800 text-white flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <DatabaseIcon className="w-3.5 h-3.5 text-sky-300" />
          <span>SQL workbench &mdash; {databaseName}</span>
        </div>
        <span className="text-[10px] text-slate-300">SQLite dialect: use LIMIT, not TOP</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-slate-200 bg-slate-50 shrink-0 text-[11px] overflow-x-auto">
        <button
          onClick={() => execute()}
          disabled={!ready || running}
          title="Run the selected text, or everything if nothing is selected (F5 or Ctrl+Enter)"
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
        >
          <Play className="w-3 h-3 fill-current" />
          {running ? 'Executing…' : 'Execute'}
        </button>
        <div className="flex items-center gap-1 px-2 h-6 border border-slate-300 rounded bg-white text-slate-700 ml-1">
          <DatabaseIcon className="w-3 h-3 text-slate-500" />
          <span className="font-mono">{databaseName}</span>
        </div>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <RibbonButton icon={<FileUp className="w-3.5 h-3.5" />} label="Import flat file" title="Create a table from a CSV file" onClick={() => setPicking(true)} />
        <RibbonButton
          icon={<Download className="w-3.5 h-3.5" />}
          label="Save results as CSV"
          title="Download the last result set"
          disabled={!result?.resultSets.length}
          onClick={() => {
            const set = result?.resultSets[result.resultSets.length - 1];
            if (set) downloadFile('results.csv', toCsv([set.columns, ...set.rows]));
          }}
        />
        <RibbonButton icon={<RotateCcw className="w-3.5 h-3.5" />} label="Reset database" title="Undo every change made to the database" onClick={reset} />
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Object explorer */}
        <div className="w-52 shrink-0 border-r border-slate-200 flex flex-col min-h-0 bg-white">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-600 border-b border-slate-200 bg-slate-50">Object Explorer</div>
          <div className="flex-1 overflow-auto py-1 text-[11px] font-mono">
            {!ready ? (
              <div className="px-3 py-2 text-slate-400 font-sans">Connecting…</div>
            ) : (
              <>
                <TreeRow depth={0} icon={<Server className="w-3 h-3 text-slate-500" />} label="localhost" open={open.server} onToggle={() => setOpen((o) => ({ ...o, server: !o.server }))} />
                {open.server && (
                  <>
                    <TreeRow depth={1} icon={<Folder className="w-3 h-3 text-amber-500" />} label="Databases" open={open.dbs} onToggle={() => setOpen((o) => ({ ...o, dbs: !o.dbs }))} />
                    {open.dbs && (
                      <>
                        <TreeRow depth={2} icon={<DatabaseIcon className="w-3 h-3 text-sky-600" />} label={databaseName} open={open.db} onToggle={() => setOpen((o) => ({ ...o, db: !o.db }))} />
                        {open.db && (
                          <>
                            <TreeRow depth={3} icon={<Folder className="w-3 h-3 text-amber-500" />} label="Tables" open={open.tables} onToggle={() => setOpen((o) => ({ ...o, tables: !o.tables }))} />
                            {open.tables &&
                              tableObjects.map((t) => (
                                <ObjectNode key={t.name} obj={t} depth={4} open={!!open[`t:${t.name}`]} onToggle={() => setOpen((o) => ({ ...o, [`t:${t.name}`]: !o[`t:${t.name}`] }))} onSelectTop={() => selectTop(t.name)} onInsert={insertAtCaret} />
                              ))}
                            <TreeRow depth={3} icon={<Folder className="w-3 h-3 text-amber-500" />} label="Views" open={open.views} onToggle={() => setOpen((o) => ({ ...o, views: !o.views }))} />
                            {open.views &&
                              (viewObjects.length ? (
                                viewObjects.map((v) => (
                                  <ObjectNode key={v.name} obj={v} depth={4} open={!!open[`v:${v.name}`]} onToggle={() => setOpen((o) => ({ ...o, [`v:${v.name}`]: !o[`v:${v.name}`] }))} onSelectTop={() => selectTop(v.name)} onInsert={insertAtCaret} />
                                ))
                              ) : (
                                <div className="pl-[76px] py-0.5 text-slate-400 font-sans italic">None yet</div>
                              ))}
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          <div className="px-2 py-1.5 text-[10px] text-slate-400 border-t border-slate-100 font-sans leading-snug">Double-click a name to type it. Hover a table to select its top rows.</div>
        </div>

        {/* Query editor and results */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex items-center h-7 border-b border-slate-200 bg-slate-100 shrink-0">
            <div className="h-full px-3 flex items-center gap-1.5 text-[11px] bg-white border-r border-slate-200 font-semibold text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              SQLQuery1.sql
            </div>
          </div>
          <div className="flex min-h-0 bg-white border-b border-slate-300" style={{ height: '45%' }}>
            <div ref={gutterRef} className="w-10 shrink-0 overflow-hidden bg-slate-50 border-r border-slate-200 text-right pr-2 pt-2 font-mono text-[11px] leading-5 text-slate-400 select-none">
              {Array.from({ length: lines }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              ref={editorRef}
              value={script}
              spellCheck={false}
              aria-label="Query editor"
              onChange={(e) => {
                setScript(e.target.value);
                save(e.target.value);
              }}
              onKeyDown={onEditorKey}
              onScroll={(e) => {
                if (gutterRef.current) gutterRef.current.scrollTop = (e.target as HTMLTextAreaElement).scrollTop;
              }}
              className="flex-1 min-w-0 p-2 font-mono text-xs leading-5 text-slate-900 resize-none focus:outline-none whitespace-pre overflow-auto"
              placeholder="-- Write SQL here, then press Execute (F5)"
            />
          </div>

          {/* Results */}
          <div className="flex items-center gap-1 px-2 h-7 border-b border-slate-200 bg-slate-50 shrink-0 text-[11px]">
            {(['results', 'messages'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded ${tab === t ? 'bg-white shadow-2xs text-slate-900 font-semibold border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {t === 'results' ? <Table2 className="w-3 h-3" /> : null}
                {t === 'results' ? 'Results' : 'Messages'}
              </button>
            ))}
          </div>
          <div className="flex-1 min-h-0 overflow-auto bg-white">
            {running && (
              <div className="h-full flex items-center justify-center">
                <Pulse label="Executing query" />
              </div>
            )}
            {!running && !result && <div className="p-4 text-xs text-slate-400">Results and messages from your queries show here.</div>}
            {!running && result && tab === 'results' && (
              <div className="space-y-3 p-2">
                {result.resultSets.length === 0 && <div className="p-2 text-xs text-slate-400">No result sets. See Messages.</div>}
                {result.resultSets.map((set, i) => (
                  <div key={i} className="border border-slate-200 rounded overflow-auto max-h-80">
                    <table className="text-[11px] font-mono border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="sticky top-0 bg-slate-100 border-b border-r border-slate-200 px-2 py-1 text-slate-400 font-normal" />
                          {set.columns.map((c, j) => (
                            <th key={j} className="sticky top-0 bg-slate-100 border-b border-r border-slate-200 px-2 py-1 text-left font-semibold text-slate-700 whitespace-nowrap">
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {set.rows.slice(0, MAX_ROWS_SHOWN).map((row, r) => (
                          <tr key={r} className="hover:bg-sky-50">
                            <td className="bg-slate-50 border-b border-r border-slate-200 px-2 text-right text-slate-400">{r + 1}</td>
                            {row.map((v, j) => (
                              <td key={j} className={`border-b border-r border-slate-100 px-2 py-0.5 whitespace-pre ${typeof v === 'number' ? 'text-right tabular-nums' : ''} ${v === null ? 'bg-amber-50/60 text-slate-400 italic' : ''}`}>
                                {v === null ? 'NULL' : String(v)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {set.rows.length > MAX_ROWS_SHOWN && (
                      <div className="px-2 py-1 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-200">
                        Showing the first {MAX_ROWS_SHOWN} of {set.rows.length} rows.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!running && result && tab === 'messages' && (
              <div className="p-3 font-mono text-[11px] space-y-1">
                {result.messages.map((m, i) => (
                  <div key={i} className={m.error ? 'text-rose-700' : 'text-slate-700'}>
                    {m.error ? `Msg: ${m.text}` : m.text}
                  </div>
                ))}
                <div className="pt-2 text-slate-400">Completion time: {new Date().toLocaleTimeString()}</div>
              </div>
            )}
          </div>
          <div className={`h-6 flex items-center justify-between px-3 text-[11px] shrink-0 ${hasError ? 'bg-rose-100 text-rose-900' : 'bg-amber-100 text-amber-950'}`}>
            <span>{!result ? (ready ? 'Connected.' : 'Connecting…') : hasError ? 'Query completed with errors.' : 'Query executed successfully.'}</span>
            <span className="tabular-nums space-x-4">
              <span>{databaseName}</span>
              {result && <span>{result.resultSets.reduce((n, s) => n + s.rows.length, 0)} rows</span>}
              {result && <span>{result.ms} ms</span>}
            </span>
          </div>
        </div>
      </div>

      {picking && (
        <ImportDialog
          files={files}
          accept="flat file"
          onClose={() => setPicking(false)}
          onImport={(name, text) => {
            setPicking(false);
            setImporting({ name: name.replace(/\.csv$/i, '').replace(/[^\w]+/g, '_'), text });
          }}
        />
      )}
      {importing && (
        <ImportTableDialog
          defaultName={importing.name}
          text={importing.text}
          taken={objects.map((o) => o.name.toLowerCase())}
          onClose={() => setImporting(null)}
          onImport={(table) => {
            setImporting(null);
            execute(importStatements(table, parseCsv(importing.text)));
          }}
        />
      )}
    </div>
  );
};

const TreeRow: React.FC<{ depth: number; icon: React.ReactNode; label: string; open?: boolean; onToggle?: () => void; children?: React.ReactNode; onDoubleClick?: () => void }> = ({
  depth,
  icon,
  label,
  open,
  onToggle,
  children,
  onDoubleClick,
}) => (
  <div className="group flex items-center gap-1 pr-2 py-0.5 hover:bg-sky-50 cursor-default whitespace-nowrap" style={{ paddingLeft: 6 + depth * 12 }} onDoubleClick={onDoubleClick}>
    {onToggle ? (
      <button onClick={onToggle} className="text-slate-400 hover:text-slate-700" aria-label={open ? `Collapse ${label}` : `Expand ${label}`}>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>
    ) : (
      <span className="w-3" />
    )}
    {icon}
    <span className="truncate text-slate-800">{label}</span>
    {children}
  </div>
);

const ObjectNode: React.FC<{ obj: DbObject; depth: number; open: boolean; onToggle: () => void; onSelectTop: () => void; onInsert: (text: string) => void }> = ({
  obj,
  depth,
  open,
  onToggle,
  onSelectTop,
  onInsert,
}) => (
  <>
    <TreeRow depth={depth} icon={obj.kind === 'view' ? <Eye className="w-3 h-3 text-violet-500" /> : <Table2 className="w-3 h-3 text-sky-600" />} label={obj.name} open={open} onToggle={onToggle} onDoubleClick={() => onInsert(obj.name)}>
      <button onClick={onSelectTop} title="Select top 100 rows" className="ml-auto opacity-0 group-hover:opacity-100 text-[10px] font-sans text-sky-700 hover:underline">
        top 100
      </button>
    </TreeRow>
    {open &&
      obj.columns.map((c) => (
        <TreeRow key={c.name} depth={depth + 1} icon={<Columns3 className="w-3 h-3 text-slate-400" />} label={`${c.name} (${c.type.toLowerCase()})`} onDoubleClick={() => onInsert(c.name)} />
      ))}
  </>
);

const ImportTableDialog: React.FC<{ defaultName: string; text: string; taken: string[]; onClose: () => void; onImport: (table: string) => void }> = ({
  defaultName,
  text,
  taken,
  onClose,
  onImport,
}) => {
  const [name, setName] = useState(defaultName);
  const rows = parseCsv(text);
  const clean = name.trim();
  const problem = !/^[A-Za-z_]\w*$/.test(clean) ? 'Use letters, numbers and underscores, starting with a letter.' : taken.includes(clean.toLowerCase()) ? 'A table or view with that name already exists.' : null;
  return (
    <DialogShell
      title="Import flat file"
      onClose={onClose}
      footer={
        <>
          <button className="px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold" onClick={onClose}>
            Cancel
          </button>
          <button className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold disabled:opacity-50" disabled={!!problem} onClick={() => onImport(clean)}>
            Import
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-slate-600">New table name</span>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="w-full h-7 px-2 border border-slate-300 rounded font-mono focus:outline-none focus:border-emerald-500" />
      </label>
      {problem && <p className="text-rose-700">{problem}</p>}
      <div className="text-slate-600">Preview ({Math.max(rows.length - 1, 0)} rows; column types are guessed from the values)</div>
      <div className="border border-slate-200 rounded overflow-auto max-h-36">
        <table className="text-[11px] font-mono">
          <tbody>
            {rows.slice(0, 6).map((r, i) => (
              <tr key={i} className={i === 0 ? 'bg-slate-100 font-semibold' : ''}>
                {r.map((v, j) => (
                  <td key={j} className="px-2 py-0.5 border-b border-r border-slate-100 whitespace-nowrap">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DialogShell>
  );
};
