import React, { useMemo, useState } from 'react';
import { ArrowRight, Columns3, Database, FileText, Filter, Merge, Plus, Rows3, Scissors, Type, X } from 'lucide-react';
import { Query, QueryStep } from '../lib/spreadsheet';
import { QueryFile, runQuery, stepText } from '../lib/powerQuery';

/**
 * The Power Query Editor: queries on the left, the selected query's data in the middle (click column headers to pick
 * the columns a step works on), its source files and applied steps on the right. Close & Load puts every query on its
 * own sheet as a table.
 */

const btn = 'flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent whitespace-nowrap';
const field = 'h-7 px-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-amber-500';
const primary = 'px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold disabled:opacity-50';
const secondary = 'px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold';

type Form = 'rename' | 'replace' | 'filter' | 'split' | 'merge' | null;

const safeName = (s: string) => s.replace(/\.(csv|tsv|txt)$/i, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^(\d)/, '_$1') || 'Query';

export const PowerQueryEditor: React.FC<{
  files: QueryFile[];
  queries: Query[];
  onLoad: (queries: Query[]) => void;
  onClose: () => void;
}> = ({ files, queries: start, onLoad, onClose }) => {
  const csvs = files.filter((f) => /\.(csv|tsv|txt)$/i.test(f.name));
  const [queries, setQueries] = useState<Query[]>(start);
  const [at, setAt] = useState(start.length ? 0 : -1);
  const [picking, setPicking] = useState(!start.length);
  const [chosen, setChosen] = useState<string[]>([]);
  const [cols, setCols] = useState<string[]>([]);
  const [viewStep, setViewStep] = useState<number | null>(null);
  const [form, setForm] = useState<Form>(null);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [op, setOp] = useState<'=' | '<>' | '>' | '<' | 'contains' | 'nonblank'>('=');
  const [mergeCols, setMergeCols] = useState<string[]>([]);

  const q = queries[at];
  const result = useMemo(() => (q ? runQuery(q, files, queries, viewStep ?? q.steps.length) : null), [q, files, queries, viewStep]);
  const table = typeof result === 'object' ? result : null;
  const update = (next: Query) => setQueries((qs) => qs.map((x, i) => (i === at ? next : x)));
  const addStep = (st: QueryStep) => {
    if (!q) return;
    update({ ...q, steps: [...q.steps, st] });
    setViewStep(null);
    setForm(null);
    setA('');
    setB('');
    setC('');
  };
  const needCols = !cols.length;
  const one = cols[0];

  const newQuery = () => {
    if (!chosen.length) return;
    const taken = new Set(queries.map((x) => x.name.toLowerCase()));
    let name = chosen.length > 1 ? 'Combined' : safeName(chosen[0]);
    for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${chosen.length > 1 ? 'Combined' : safeName(chosen[0])}_${i}`;
    const next = [...queries, { name, sources: chosen, steps: [{ kind: 'promote' as const }] }];
    setQueries(next);
    setAt(next.length - 1);
    setPicking(false);
    setChosen([]);
    setCols([]);
  };

  const other = queries.filter((_, i) => i !== at);
  const otherTable = useMemo(() => {
    const o = queries.find((x) => x.name === a);
    if (!o) return null;
    const r = runQuery(o, files, queries);
    return typeof r === 'object' ? r : null;
  }, [a, queries, files]);

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col text-xs select-text" role="dialog" aria-label="Power Query Editor">
      <div className="h-9 shrink-0 bg-amber-600 text-white flex items-center gap-2 px-3">
        <Database className="w-4 h-4" />
        <span className="font-semibold">Power Query Editor</span>
        <span className="flex-1" />
        <button className="px-3 py-1 rounded bg-white text-amber-800 font-semibold hover:bg-amber-50 disabled:opacity-50" disabled={!queries.length} onClick={() => onLoad(queries)}>
          Close &amp; Load
        </button>
        <button onClick={onClose} className="p-1 hover:bg-amber-700 rounded" aria-label="Close without loading">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Transform ribbon */}
      <div className="shrink-0 flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50">
        <button className={btn} onClick={() => setPicking(true)}>
          <Plus className="w-3.5 h-3.5" /> New source
        </button>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <button className={btn} disabled={!q} onClick={() => q && update({ ...q, steps: q.steps[0]?.kind === 'promote' ? q.steps.slice(1) : [{ kind: 'promote' }, ...q.steps] })}>
          <Rows3 className="w-3.5 h-3.5" /> {q?.steps[0]?.kind === 'promote' ? 'Use headers as first row' : 'Use first row as headers'}
        </button>
        <button className={btn} disabled={!q || needCols} onClick={() => addStep({ kind: 'remove-columns', columns: cols })} title="Remove the selected columns">
          <Columns3 className="w-3.5 h-3.5" /> Remove columns
        </button>
        <button className={btn} disabled={!q || needCols} onClick={() => addStep({ kind: 'keep-columns', columns: cols })} title="Keep only the selected columns">
          Remove other columns
        </button>
        <button className={btn} disabled={!q || cols.length !== 1} onClick={() => (setForm('rename'), setA(one))}>
          Rename
        </button>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <button className={btn} disabled={!q || needCols} onClick={() => addStep({ kind: 'trim', columns: cols })}>
          <Type className="w-3.5 h-3.5" /> Trim
        </button>
        <select
          className="h-6 text-[11px] border border-slate-300 rounded disabled:opacity-40"
          disabled={!q || needCols}
          value=""
          onChange={(e) => e.target.value && addStep({ kind: 'clean-case', columns: cols, mode: e.target.value as 'proper' })}
          aria-label="Format"
        >
          <option value="">Format…</option>
          <option value="proper">Capitalize Each Word</option>
          <option value="upper">UPPERCASE</option>
          <option value="lower">lowercase</option>
        </select>
        <button className={btn} disabled={!q || cols.length !== 1} onClick={() => setForm('replace')}>
          Replace values
        </button>
        <select
          className="h-6 text-[11px] border border-slate-300 rounded disabled:opacity-40"
          disabled={!q || cols.length !== 1}
          value=""
          onChange={(e) => e.target.value && addStep({ kind: 'type', column: one, to: e.target.value as 'number' })}
          aria-label="Data type"
        >
          <option value="">Data type…</option>
          <option value="number">Decimal number</option>
          <option value="date">Date</option>
          <option value="text">Text</option>
        </select>
        <button className={btn} disabled={!q || cols.length !== 1} onClick={() => setForm('split')}>
          <Scissors className="w-3.5 h-3.5" /> Split column
        </button>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <button className={btn} disabled={!q} onClick={() => addStep({ kind: 'remove-blank-rows' })}>
          Remove blank rows
        </button>
        <button className={btn} disabled={!q} onClick={() => addStep({ kind: 'remove-duplicates', columns: cols })} title={cols.length ? 'Duplicates of the selected columns' : 'Rows repeated in every column'}>
          Remove duplicates
        </button>
        <button className={btn} disabled={!q || cols.length !== 1} onClick={() => setForm('filter')}>
          <Filter className="w-3.5 h-3.5" /> Filter rows
        </button>
        <button className={btn} disabled={!q || cols.length !== 1 || !other.length} onClick={() => (setForm('merge'), setA(other[0]?.name ?? ''), setMergeCols([]))}>
          <Merge className="w-3.5 h-3.5" /> Merge queries
        </button>
      </div>

      {/* A step's settings */}
      {form && q && (
        <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 py-2 border-b border-amber-200 bg-amber-50">
          {form === 'rename' && (
            <>
              <span>Rename {one} to</span>
              <input autoFocus value={b} onChange={(e) => setB(e.target.value)} className={field} />
              <button className={primary} disabled={!b.trim()} onClick={() => addStep({ kind: 'rename', column: one, to: b.trim() })}>
                OK
              </button>
            </>
          )}
          {form === 'replace' && (
            <>
              <span>In {one}, replace</span>
              <input autoFocus value={a} onChange={(e) => setA(e.target.value)} placeholder="value to find (empty = blanks)" className={field} />
              <span>with</span>
              <input value={b} onChange={(e) => setB(e.target.value)} className={field} />
              <button className={primary} onClick={() => addStep({ kind: 'replace', column: one, find: a, with: b })}>
                OK
              </button>
            </>
          )}
          {form === 'filter' && (
            <>
              <span>Keep rows where {one}</span>
              <select value={op} onChange={(e) => setOp(e.target.value as typeof op)} className={field}>
                <option value="=">equals</option>
                <option value="<>">does not equal</option>
                <option value=">">is greater than</option>
                <option value="<">is less than</option>
                <option value="contains">contains</option>
                <option value="nonblank">is not blank</option>
              </select>
              {op !== 'nonblank' && <input autoFocus value={a} onChange={(e) => setA(e.target.value)} className={field} />}
              <button className={primary} onClick={() => addStep({ kind: 'filter', column: one, op, value: a })}>
                OK
              </button>
            </>
          )}
          {form === 'split' && (
            <>
              <span>Split {one} at</span>
              <input autoFocus value={a} onChange={(e) => setA(e.target.value)} placeholder='delimiter, e.g. "," or " - "' className={field} />
              <span>into</span>
              <input value={b} onChange={(e) => setB(e.target.value)} placeholder="new column names, comma-separated" className={`${field} w-64`} />
              <button
                className={primary}
                disabled={!a}
                onClick={() => addStep({ kind: 'split', column: one, by: a, into: b.split(',').map((x) => x.trim()).filter(Boolean) })}
              >
                OK
              </button>
            </>
          )}
          {form === 'merge' && (
            <>
              <span>Match {one} with</span>
              <select value={a} onChange={(e) => (setA(e.target.value), setB(''), setMergeCols([]))} className={field}>
                {other.map((o) => (
                  <option key={o.name}>{o.name}</option>
                ))}
              </select>
              <span>column</span>
              <select value={b} onChange={(e) => setB(e.target.value)} className={field}>
                <option value="">pick…</option>
                {otherTable?.headers.map((h) => <option key={h}>{h}</option>)}
              </select>
              <span>and add</span>
              {otherTable?.headers
                .filter((h) => h !== b)
                .map((h) => (
                  <label key={h} className="flex items-center gap-1">
                    <input type="checkbox" checked={mergeCols.includes(h)} onChange={() => setMergeCols((m) => (m.includes(h) ? m.filter((x) => x !== h) : [...m, h]))} />
                    {h}
                  </label>
                ))}
              <button className={primary} disabled={!b || !mergeCols.length} onClick={() => addStep({ kind: 'merge', query: a, on: one, otherOn: b, columns: mergeCols })}>
                OK
              </button>
            </>
          )}
          <button className={secondary} onClick={() => setForm(null)}>
            Cancel
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {/* Queries */}
        <div className="w-44 shrink-0 border-r border-slate-200 overflow-y-auto">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Queries [{queries.length}]</div>
          {queries.map((x, i) => (
            <button
              key={x.name + i}
              onClick={() => (setAt(i), setCols([]), setViewStep(null), setForm(null), setPicking(false))}
              className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-left ${i === at && !picking ? 'bg-amber-100 text-amber-900 font-semibold' : 'hover:bg-slate-100'}`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{x.name}</span>
            </button>
          ))}
        </div>

        {/* Data */}
        <div className="flex-1 min-w-0 overflow-auto">
          {picking ? (
            <div className="p-4 space-y-3 max-w-lg">
              <div className="font-semibold text-slate-900">Get data from files</div>
              <p className="text-slate-600">Pick one file, or several with the same columns to append them into one query (as Combine Files does).</p>
              {csvs.length ? (
                csvs.map((f) => (
                  <label key={f.name} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded hover:border-amber-500">
                    <input type="checkbox" checked={chosen.includes(f.name)} onChange={() => setChosen((cs) => (cs.includes(f.name) ? cs.filter((x) => x !== f.name) : [...cs, f.name]))} />
                    <span className="font-mono">{f.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-slate-500">There are no CSV files in Files yet.</p>
              )}
              <div className="flex gap-2">
                <button className={primary} disabled={!chosen.length} onClick={newQuery}>
                  {chosen.length > 1 ? `Combine ${chosen.length} files` : 'Load into the editor'}
                </button>
                {queries.length > 0 && (
                  <button className={secondary} onClick={() => setPicking(false)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ) : !q ? (
            <p className="p-4 text-slate-500">No query yet.</p>
          ) : typeof result === 'string' ? (
            <p className="p-4 text-rose-700">{result}</p>
          ) : (
            table && (
              <table className="border-separate border-spacing-0 text-[11px]">
                <thead>
                  <tr>
                    <th className="sticky top-0 bg-slate-100 border-b border-r border-slate-300 px-2 text-slate-400">#</th>
                    {table.headers.map((h) => {
                      const on = cols.includes(h);
                      return (
                        <th
                          key={h}
                          onClick={(e) => setCols((cs) => (e.ctrlKey || e.metaKey || e.shiftKey ? (cs.includes(h) ? cs.filter((x) => x !== h) : [...cs, h]) : on && cs.length === 1 ? [] : [h]))}
                          title="Click to select; Ctrl+click for several"
                          className={`sticky top-0 border-b border-r border-slate-300 px-2 py-1 text-left font-semibold cursor-pointer whitespace-nowrap ${on ? 'bg-amber-200 text-amber-950' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          <span className="text-[9px] font-normal text-slate-500 mr-1">{table.types[h] === 'number' ? '1.2' : table.types[h] === 'date' ? '📅' : 'ABC'}</span>
                          {h}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.slice(0, 200).map((r, i) => (
                    <tr key={i}>
                      <td className="border-b border-r border-slate-200 px-2 text-slate-400 text-right">{i + 1}</td>
                      {r.map((v, j) => (
                        <td key={j} className={`border-b border-r border-slate-200 px-2 py-0.5 whitespace-nowrap ${cols.includes(table.headers[j]) ? 'bg-amber-50' : ''} ${v === 'Error' ? 'text-rose-700 font-semibold' : v === '' ? 'text-slate-300 italic' : ''}`}>
                          {v === '' ? 'null' : v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        {/* Query settings */}
        {q && !picking && (
          <div className="w-64 shrink-0 border-l border-slate-200 overflow-y-auto p-3 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Query settings</div>
            <label className="block space-y-1">
              <span className="text-slate-600">Name</span>
              <input
                value={q.name}
                onChange={(e) => update({ ...q, name: e.target.value.replace(/[^A-Za-z0-9_ ]/g, '') })}
                className={`${field} w-full`}
              />
            </label>
            <div className="space-y-1">
              <div className="text-slate-600">Source files</div>
              {csvs.map((f) => (
                <label key={f.name} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={q.sources.some((s) => s.toLowerCase() === f.name.toLowerCase())}
                    onChange={() => {
                      const has = q.sources.some((s) => s.toLowerCase() === f.name.toLowerCase());
                      const sources = has ? q.sources.filter((s) => s.toLowerCase() !== f.name.toLowerCase()) : [...q.sources, f.name];
                      if (sources.length) update({ ...q, sources });
                    }}
                  />
                  <span className="font-mono truncate">{f.name}</span>
                </label>
              ))}
            </div>
            <div className="space-y-1">
              <div className="text-slate-600">Applied steps</div>
              <button onClick={() => setViewStep(0)} className={`w-full text-left px-2 py-1 rounded ${viewStep === 0 ? 'bg-amber-100' : 'hover:bg-slate-100'}`}>
                Source
              </button>
              {q.steps.map((st, i) => (
                <div key={i} className={`flex items-center gap-1 rounded ${(viewStep ?? q.steps.length) === i + 1 ? 'bg-amber-100' : 'hover:bg-slate-100'}`}>
                  <button onClick={() => setViewStep(i + 1 === q.steps.length ? null : i + 1)} className="flex-1 text-left px-2 py-1">
                    <ArrowRight className="inline w-3 h-3 mr-1 text-slate-400" />
                    {stepText(st)}
                  </button>
                  <button onClick={() => (update({ ...q, steps: q.steps.filter((_, j) => j !== i) }), setViewStep(null))} className="p-1 text-slate-400 hover:text-rose-600" aria-label="Delete step">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="text-rose-700 hover:underline"
              onClick={() => {
                setQueries((qs) => qs.filter((_, i) => i !== at));
                setAt(-1);
                setPicking(queries.length <= 1);
              }}
            >
              Delete this query
            </button>
            {table && <div className="text-slate-500">{table.rows.length} rows, {table.headers.length} columns</div>}
          </div>
        )}
      </div>
    </div>
  );
};
