import React, { useMemo, useState } from 'react';
import { BarChart3, BarChartHorizontal, Copy, Database, FileDown, Hash, Image, LineChart, Pencil, PieChart, Plus, Table2, Trash2 } from 'lucide-react';
import { Agg, BiChart, BiConfig, ChartKind, Dataset, chartData, datasetsOf } from '../../lib/deskApps';
import { copyGrid, toCsv } from '../../lib/deskData';
import { DataGrid, DeskCtx, FilePicker, Modal, Select, accent, btn, primary } from './shared';

const KINDS: { id: ChartKind; label: string }[] = [
  { id: 'column', label: 'Column' },
  { id: 'bar', label: 'Bar' },
  { id: 'line', label: 'Line' },
  { id: 'pie', label: 'Pie' },
  { id: 'card', label: 'Card (one number)' },
  { id: 'table', label: 'Table' },
];
const AGGS: { id: Agg; label: string }[] = [
  { id: 'sum', label: 'Sum' },
  { id: 'avg', label: 'Average' },
  { id: 'count', label: 'Count' },
  { id: 'distinct', label: 'Count (distinct)' },
  { id: 'min', label: 'Minimum' },
  { id: 'max', label: 'Maximum' },
];
const COLORS = ['#118dff', '#12239e', '#e66c37', '#6b007b', '#e044a7', '#744ec2', '#d9b300', '#d64550', '#197278', '#1aab40'];

// A Power BI-style report: its data is any table on the computer (CSV files from email, the browser, Spreadsheet or
// Database exports, and the database's tables), and its visuals are built by picking fields, as Power BI's are.
// Each visual's numbers can be copied or saved as a CSV, and the visual saved as an image to attach to an email.
export const BiApp: React.FC<{ ctx: DeskCtx; cfg: BiConfig }> = ({ ctx, cfg }) => {
  const charts = ctx.state.desk?.bi?.charts ?? cfg.charts ?? [];
  const datasets = useMemo(() => datasetsOf(ctx.files, ctx.cfg.tables ?? []), [ctx.files, ctx.cfg.tables]);
  const [editing, setEditing] = useState<BiChart | null>(null);
  const [tab, setTab] = useState<'report' | 'data'>('report');
  const [dataAt, setDataAt] = useState(datasets[0]?.name ?? '');
  const [adding, setAdding] = useState(false);
  const save = (next: BiChart[]) => ctx.setWork('bi', { charts: next });
  const blank = (): BiChart => {
    const ds = datasets[0];
    return { id: `c${Date.now().toString(36)}`, title: '', source: ds?.name ?? '', kind: 'column', x: ds?.grid[0]?.[0], y: ds?.grid[0]?.[1], agg: 'sum', sort: 'value-desc' };
  };
  const ds = datasets.find((d) => d.name === dataAt) ?? datasets[0];

  return (
    <div className="h-full flex flex-col bg-[#eaeaea] text-[13px] text-[#252423]" data-ref="bi" style={accent('#f2c811', '#fff8d6', '#252423')}>
      {/* Title bar and ribbon, as desktop BI tools have */}
      <div className="h-8 shrink-0 bg-[#252423] text-white/90 flex items-center px-3 gap-2 text-xs">
        <span className="w-4 h-4 rounded-sm bg-[#f2c811] grid place-items-center"><BarChart3 className="w-3 h-3 text-[#252423]" /></span>
        <span>{cfg.name ?? 'Report'}</span>
      </div>
      <div className="shrink-0 bg-white border-b border-[#e1dfdd]">
        <div className="flex gap-4 px-3 pt-1 text-xs text-[#605e5c]" aria-hidden="true">
          {['File', 'Home', 'Insert', 'Modeling', 'View', 'Help'].map((t) => (
            <span key={t} className={`pb-1 ${t === 'Home' ? 'text-[#252423] font-semibold border-b-2 border-[#f2c811]' : ''}`}>{t}</span>
          ))}
        </div>
        <div className="h-[60px] flex items-stretch gap-1 px-2 py-1 border-t border-[#edebe9]">
          <button className="w-16 rounded hover:bg-[#f3f2f1] flex flex-col items-center justify-center gap-1 text-[11px]" onClick={() => setAdding(true)} title="Add a CSV or a pasted table as data">
            <Database className="w-5 h-5 text-[#605e5c]" />
            Get data
          </button>
          <button className="w-16 rounded hover:bg-[#f3f2f1] flex flex-col items-center justify-center gap-1 text-[11px] disabled:opacity-40" disabled={!datasets.length} onClick={() => setEditing(blank())} data-ref="bi-new">
            <Plus className="w-5 h-5 text-[#605e5c]" />
            New visual
          </button>
          <span className="w-px bg-[#edebe9] mx-1" />
        </div>
      </div>
      <div className="flex-1 min-h-0 flex">
        {/* View switcher */}
        <nav className="w-11 shrink-0 bg-[#f3f2f1] border-r border-[#e1dfdd] flex flex-col items-center pt-2 gap-1" aria-label="Views">
          {(
            [
              ['report', BarChart3, 'Report view'],
              ['data', Table2, 'Table view'],
            ] as const
          ).map(([t, Icon, label]) => (
            <button key={t} onClick={() => setTab(t)} title={label} aria-label={label} className={`relative w-9 h-9 grid place-items-center rounded ${tab === t ? 'bg-white' : 'hover:bg-white/60'}`}>
              {tab === t && <span className="absolute left-[-4px] top-1.5 bottom-1.5 w-[3px] rounded bg-[#f2c811]" />}
              <Icon className="w-4 h-4 text-[#605e5c]" />
            </button>
          ))}
        </nav>
      {tab === 'data' ? (
        <div className="flex-1 min-h-0 flex bg-white">
          <aside className="w-56 shrink-0 border-r border-slate-200 overflow-y-auto">
            <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-slate-400">Tables</div>
            {datasets.map((d) => (
              <button key={d.name} onClick={() => setDataAt(d.name)} className={`w-full text-left px-3 py-1.5 truncate ${d.name === ds?.name ? 'bg-amber-50 font-semibold' : 'hover:bg-slate-50'}`}>
                {d.label}
              </button>
            ))}
            {!datasets.length && <p className="px-3 text-xs text-slate-400">No data yet. Save a CSV to Files or use Get data.</p>}
          </aside>
          <div className="flex-1 overflow-auto">{ds && <DataGrid rows={ds.grid.slice(1).map((r, i) => ({ id: i, ...Object.fromEntries(ds.grid[0].map((h, j) => [h, r[j]])) }))} columns={ds.grid[0].map((h) => ({ key: h, label: h }))} />}</div>
        </div>
      ) : (
        <>
        <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="min-h-full bg-white shadow-sm p-4">
          {charts.length === 0 ? (
            <div className="h-full min-h-[300px] grid place-items-center text-center text-slate-500">
              <div>
                <BarChart3 className="w-10 h-10 mx-auto text-slate-300" />
                <p className="mt-2">{datasets.length ? 'Build a visual from your data: New visual.' : 'Get some data first: any CSV in Files, or a database table, can be used.'}</p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {charts.map((c) => (
                <Tile
                  key={c.id}
                  ctx={ctx}
                  chart={c}
                  ds={datasets.find((d) => d.name === c.source)}
                  onEdit={() => setEditing(c)}
                  onDelete={() => save(charts.filter((x) => x.id !== c.id))}
                />
              ))}
            </div>
          )}
          </div>
        </div>
        {/* Page tabs */}
        <div className="h-8 shrink-0 bg-[#f3f2f1] border-t border-[#e1dfdd] flex items-end px-2">
          <span className="h-7 px-4 bg-white border-x border-t border-[#e1dfdd] text-xs grid place-items-center relative">
            <span className="absolute inset-x-0 bottom-0 h-[3px] bg-[#f2c811]" />
            Page 1
          </span>
        </div>
        </div>
        {/* Visualizations and Data panes */}
        <aside className="w-52 shrink-0 bg-white border-l border-[#e1dfdd] flex flex-col text-xs">
          <div className="px-3 pt-2 pb-1 font-semibold text-[13px]">Visualizations</div>
          <div className="px-3 pb-3 grid grid-cols-5 gap-1 border-b border-[#edebe9]">
            {KINDS.map((k) => (
              <button key={k.id} title={k.label} aria-label={`New ${k.label.toLowerCase()} visual`} disabled={!datasets.length} onClick={() => setEditing({ ...blank(), kind: k.id })} className="h-7 rounded border border-transparent hover:border-[#c8c6c4] grid place-items-center text-[#605e5c] disabled:opacity-40">
                {k.id === 'pie' ? <PieChart className="w-4 h-4" /> : k.id === 'line' ? <LineChart className="w-4 h-4" /> : k.id === 'card' ? <Hash className="w-4 h-4" /> : k.id === 'bar' ? <BarChartHorizontal className="w-4 h-4" /> : k.id === 'column' ? <BarChart3 className="w-4 h-4" /> : <Table2 className="w-4 h-4" />}
              </button>
            ))}
          </div>
          <div className="px-3 pt-2 pb-1 font-semibold text-[13px]">Data</div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {datasets.map((d) => (
              <details key={d.name} className="mb-1">
                <summary className="px-1 py-1 cursor-pointer truncate hover:bg-[#f3f2f1] rounded">{d.label}</summary>
                <ul className="pl-5">
                  {d.grid[0].map((h) => (
                    <li key={h} className="py-0.5 text-[#605e5c] truncate">{h}</li>
                  ))}
                </ul>
              </details>
            ))}
            {!datasets.length && <p className="px-1 text-[#a19f9d]">No data yet.</p>}
          </div>
        </aside>
        </>
      )}
      </div>
      {editing && (
        <ChartEditor
          datasets={datasets}
          chart={editing}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            save(charts.some((x) => x.id === c.id) ? charts.map((x) => (x.id === c.id ? c : x)) : [...charts, c]);
            setEditing(null);
          }}
        />
      )}
      {adding && (
        <FilePicker
          ctx={ctx}
          kinds={['csv']}
          title="Get data"
          pasteTable
          onClose={() => setAdding(false)}
          onPick={(f) => {
            // Data from outside Files (a pasted table, an upload) is kept in Files so the report can use it
            if (!ctx.files.some((x) => x.name === f.name)) ctx.saveFile(f, '');
            setAdding(false);
            setDataAt(f.name);
            setTab('data');
          }}
        />
      )}
    </div>
  );
};

const Tile: React.FC<{ ctx: DeskCtx; chart: BiChart; ds?: Dataset; onEdit: () => void; onDelete: () => void }> = ({ ctx, chart, ds, onEdit, onDelete }) => {
  const d = chartData(chart, ds);
  const grid = () => [[chart.x || 'Category', `${chart.agg} of ${chart.y || 'rows'}`], ...d.labels.map((l, i) => [l, String(d.values[i])])];
  const svgId = `bi-${chart.id}`;
  return (
    <section className="bg-white shadow-sm border border-slate-200 rounded p-3 group" aria-label={chart.title || 'Visual'}>
      <div className="flex items-center gap-1">
        <h3 className="font-semibold text-slate-800 truncate">{chart.title || `${aggLabel(chart.agg)} of ${chart.y ?? 'rows'} by ${chart.x ?? ''}`}</h3>
        <span className="ml-auto flex opacity-60 group-hover:opacity-100">
          {[
            { label: 'Edit', Icon: Pencil, run: onEdit },
            { label: 'Copy data', Icon: Copy, run: async () => ctx.toast((await copyGrid(grid())) ? 'Copied the numbers. Paste them into Spreadsheet, Docs or Mail.' : 'Copy was blocked: use Save data as CSV.') },
            { label: 'Save data as CSV', Icon: FileDown, run: () => ctx.saveFile({ name: `${chart.title || 'visual'}.csv`, content: toCsv(grid()) }) },
            {
              label: 'Save as image',
              Icon: Image,
              run: () => {
                const svg = document.getElementById(svgId)?.outerHTML;
                if (svg) ctx.saveFile({ name: `${chart.title || 'visual'}.svg`, content: svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg" style="background:#fff"') });
              },
            },
            { label: 'Delete', Icon: Trash2, run: onDelete },
          ].map(({ label, Icon, run }) => (
            <button key={label} onClick={run} title={label} aria-label={label} className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100 text-slate-600">
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </span>
      </div>
      {!ds ? <p className="py-8 text-center text-xs text-rose-600">Its data ({chart.source}) is no longer on the computer.</p> : <ChartView id={svgId} chart={chart} labels={d.labels} values={d.values} />}
      {(chart.filters ?? []).some((f) => f.values.length) && <p className="text-[11px] text-slate-500 mt-1">Filtered: {(chart.filters ?? []).filter((f) => f.values.length).map((f) => `${f.field} is ${f.values.join(', ')}`).join('; ')}</p>}
    </section>
  );
};

const aggLabel = (a: Agg) => AGGS.find((x) => x.id === a)?.label ?? a;
const fmt = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : Math.abs(n) >= 1e4 ? `${(n / 1e3).toFixed(1)}K` : n.toLocaleString('en-GB', { maximumFractionDigits: Math.abs(n) >= 100 ? 0 : 2 }));

export const ChartView: React.FC<{ id?: string; chart: BiChart; labels: string[]; values: number[] }> = ({ id, chart, labels, values }) => {
  const W = 460;
  const H = 240;
  if (!labels.length) return <p className="py-8 text-center text-xs text-slate-400">No rows match.</p>;
  if (chart.kind === 'card') {
    const total = chart.agg === 'avg' ? values.reduce((a, b) => a + b, 0) / values.length : chart.agg === 'min' ? Math.min(...values) : chart.agg === 'max' ? Math.max(...values) : values.reduce((a, b) => a + b, 0);
    return (
      <svg id={id} viewBox={`0 0 ${W} 120`} className="w-full" role="img" aria-label={`${fmt(total)}`}>
        <text x={W / 2} y={68} textAnchor="middle" fontSize="44" fontWeight="600" fill="#252423" fontFamily="Segoe UI, sans-serif">
          {fmt(total)}
        </text>
        <text x={W / 2} y={98} textAnchor="middle" fontSize="13" fill="#605e5c" fontFamily="Segoe UI, sans-serif">
          {aggLabel(chart.agg)} of {chart.y ?? 'rows'}
        </text>
      </svg>
    );
  }
  if (chart.kind === 'table')
    return (
      <div className="max-h-64 overflow-auto mt-2">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-slate-300">
              <th className="text-left py-1">{chart.x}</th>
              <th className="text-right py-1">
                {aggLabel(chart.agg)} of {chart.y}
              </th>
            </tr>
          </thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={l} className="border-b border-slate-100">
                <td className="py-1">{l}</td>
                <td className="py-1 text-right tabular-nums">{fmt(values[i])}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-1">Total</td>
              <td className="py-1 text-right tabular-nums">{fmt(values.reduce((a, b) => a + b, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  if (chart.kind === 'pie') {
    const total = values.reduce((a, b) => a + Math.max(b, 0), 0) || 1;
    let a0 = -Math.PI / 2;
    return (
      <svg id={id} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={labels.map((l, i) => `${l} ${fmt(values[i])}`).join(', ')}>
        {values.map((v, i) => {
          const a1 = a0 + (Math.max(v, 0) / total) * Math.PI * 2;
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const p = (a: number) => `${120 + 95 * Math.cos(a)} ${120 + 95 * Math.sin(a)}`;
          const path = values.length === 1 ? 'M 120 25 A 95 95 0 1 1 119.99 25 Z' : `M 120 120 L ${p(a0)} A 95 95 0 ${large} 1 ${p(a1)} Z`;
          a0 = a1;
          return <path key={i} d={path} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1.5" />;
        })}
        {labels.slice(0, 10).map((l, i) => (
          <g key={l} transform={`translate(250 ${24 + i * 20})`}>
            <rect width="10" height="10" fill={COLORS[i % COLORS.length]} />
            <text x="16" y="9" fontSize="11" fill="#252423" fontFamily="Segoe UI, sans-serif">
              {l.slice(0, 22)} · {Math.round((Math.max(values[i], 0) / total) * 100)}%
            </text>
          </g>
        ))}
      </svg>
    );
  }
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  if (chart.kind === 'bar') {
    const rowH = Math.min(24, (H - 10) / labels.length);
    const left = 120;
    return (
      <svg id={id} viewBox={`0 0 ${W} ${Math.max(H, labels.length * rowH + 10)}`} className="w-full" role="img">
        {labels.map((l, i) => {
          const w = ((values[i] - Math.min(min, 0)) / span) * (W - left - 60);
          return (
            <g key={l} transform={`translate(0 ${5 + i * rowH})`}>
              <text x={left - 6} y={rowH / 2 + 4} textAnchor="end" fontSize="11" fill="#252423" fontFamily="Segoe UI, sans-serif">
                {l.slice(0, 18)}
              </text>
              <rect x={left} y={3} width={Math.max(w, 1)} height={rowH - 6} fill={COLORS[0]} />
              <text x={left + w + 4} y={rowH / 2 + 4} fontSize="10.5" fill="#605e5c" fontFamily="Segoe UI, sans-serif">
                {fmt(values[i])}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }
  // Column and line: a value axis, categories along the bottom
  const L = 48;
  const B = 36;
  const plotW = W - L - 10;
  const plotH = H - B - 14;
  const y = (v: number) => 14 + plotH - ((v - min) / span) * plotH;
  const step = plotW / labels.length;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + span * t);
  return (
    <svg id={id} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - 10} y1={y(t)} y2={y(t)} stroke="#e1dfdd" />
          <text x={L - 4} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#605e5c" fontFamily="Segoe UI, sans-serif">
            {fmt(t)}
          </text>
        </g>
      ))}
      {chart.kind === 'column'
        ? values.map((v, i) => <rect key={i} x={L + i * step + step * 0.15} width={step * 0.7} y={Math.min(y(v), y(0))} height={Math.max(Math.abs(y(0) - y(v)), 1)} fill={COLORS[0]} />)
        : (
            <>
              <polyline fill="none" stroke={COLORS[0]} strokeWidth="2" points={values.map((v, i) => `${L + i * step + step / 2},${y(v)}`).join(' ')} />
              {values.map((v, i) => (
                <circle key={i} cx={L + i * step + step / 2} cy={y(v)} r="3" fill={COLORS[0]} />
              ))}
            </>
          )}
      {labels.map((l, i) =>
        labels.length <= 16 || i % Math.ceil(labels.length / 16) === 0 ? (
          <text key={l} x={L + i * step + step / 2} y={H - B + 16} textAnchor="middle" fontSize="10" fill="#252423" fontFamily="Segoe UI, sans-serif">
            {l.slice(0, Math.max(4, Math.floor(step / 6)))}
          </text>
        ) : null
      )}
    </svg>
  );
};

const ChartEditor: React.FC<{ datasets: Dataset[]; chart: BiChart; onClose: () => void; onSave: (c: BiChart) => void }> = ({ datasets, chart, onClose, onSave }) => {
  const [c, setC] = useState(chart);
  const ds = datasets.find((d) => d.name === c.source);
  const cols = ds?.grid[0] ?? [];
  const data = chartData(c, ds);
  const filter = c.filters?.[0];
  const values = filter?.field && ds ? [...new Set(ds.grid.slice(1).map((r) => r[cols.indexOf(filter.field)] ?? ''))].sort().slice(0, 60) : [];
  return (
    <Modal
      title={chart.title ? `Edit ${chart.title}` : 'New visual'}
      onClose={onClose}
      wide
      footer={
        <>
          <button className={btn} onClick={onClose}>
            Cancel
          </button>
          <button className={primary} disabled={!ds} onClick={() => onSave({ ...c, title: c.title.trim() })} data-ref="bi-save">
            Save visual
          </button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block sm:col-span-2">
          <span className="text-[11px] font-semibold text-slate-500">Title</span>
          <input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} placeholder={`${aggLabel(c.agg)} of ${c.y ?? 'rows'} by ${c.x ?? ''}`} className="w-full h-8 px-2.5 border border-slate-200 rounded-md" data-ref="bi-title" />
        </label>
        <Labeled label="Data">
          <select value={c.source} onChange={(e) => setC({ ...c, source: e.target.value, x: undefined, y: undefined, filters: [] })} className="w-full h-8 px-2 border border-slate-200 rounded-md" aria-label="Data">
            {datasets.map((d) => (
              <option key={d.name} value={d.name}>
                {d.label}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Visual">
          <Select value={c.kind} onChange={(v) => setC({ ...c, kind: v as ChartKind })} options={KINDS.map((k) => k.id)} label="Visual" />
        </Labeled>
        {c.kind !== 'card' && (
          <Labeled label="Axis (category)">
            <Select value={c.x ?? ''} onChange={(v) => setC({ ...c, x: v || undefined })} options={cols} empty="(none)" label="Axis" />
          </Labeled>
        )}
        <Labeled label="Values">
          <div className="flex gap-1">
            <select value={c.agg} onChange={(e) => setC({ ...c, agg: e.target.value as Agg })} className="h-8 px-2 border border-slate-200 rounded-md" aria-label="Summarise by">
              {AGGS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
            <Select value={c.y ?? ''} onChange={(v) => setC({ ...c, y: v || undefined })} options={cols} empty="(rows)" label="Value field" />
          </div>
        </Labeled>
        <Labeled label="Sort">
          <select value={c.sort ?? ''} onChange={(e) => setC({ ...c, sort: (e.target.value || undefined) as BiChart['sort'] })} className="w-full h-8 px-2 border border-slate-200 rounded-md" aria-label="Sort">
            <option value="">As in the data</option>
            <option value="value-desc">Largest first</option>
            <option value="value-asc">Smallest first</option>
            <option value="label">By category</option>
          </select>
        </Labeled>
        <Labeled label="Top N (blank for all)">
          <input type="number" min={1} value={c.top ?? ''} onChange={(e) => setC({ ...c, top: e.target.value ? Number(e.target.value) : undefined })} className="w-full h-8 px-2.5 border border-slate-200 rounded-md" />
        </Labeled>
        <Labeled label="Filter on">
          <Select value={filter?.field ?? ''} onChange={(v) => setC({ ...c, filters: v ? [{ field: v, values: [] }] : [] })} options={cols} empty="(no filter)" label="Filter field" />
        </Labeled>
        {filter?.field && (
          <div className="sm:col-span-2 max-h-28 overflow-y-auto border border-slate-200 rounded-md p-2 grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
            {values.map((v) => (
              <label key={v} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={filter.values.includes(v)}
                  onChange={(e) => setC({ ...c, filters: [{ field: filter.field, values: e.target.checked ? [...filter.values, v] : filter.values.filter((x) => x !== v) }] })}
                />
                <span className="truncate">{v || '(blank)'}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="border border-slate-200 rounded-md p-2 bg-white">
        <ChartView chart={c} labels={data.labels} values={data.values} />
        <p className="text-[11px] text-slate-400">{data.rows} rows used</p>
      </div>
    </Modal>
  );
};

const Labeled: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-[11px] font-semibold text-slate-500">{label}</span>
    {children}
  </label>
);
