import React, { useMemo, useState } from 'react';
import { BarChart3, X } from 'lucide-react';
import { Calc, CondFormat, CondRule, FilterCriterion, SheetChart, SheetSlicer, toText } from '../lib/spreadsheet';
import { DialogShell } from './SpreadsheetWindow';

/**
 * The spreadsheet's Excel features beyond cells: the filter menu on a header, conditional formatting rules, charts,
 * slicers and naming a table. Each changes the workbook through the window's commit, so it can be undone and is saved.
 */

const primaryBtn = 'px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold disabled:opacity-50';
const secondaryBtn = 'px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold';
const fieldClass = 'w-full h-7 px-2 border border-slate-300 rounded focus:outline-none focus:border-emerald-500';

// ---------- Filter ----------

// A header's filter: sort, tick the values to keep, or a number or text condition
export const FilterMenu: React.FC<{
  header: string;
  values: string[];
  current?: FilterCriterion;
  numeric: boolean;
  onApply: (c: FilterCriterion | null) => void;
  onSort: (descending: boolean) => void;
  onClose: () => void;
}> = ({ header, values, current, numeric, onApply, onSort, onClose }) => {
  const distinct = useMemo(() => [...new Set(values.map((v) => v))].sort((a, b) => (numeric ? Number(a) - Number(b) : a.localeCompare(b))), [values, numeric]);
  const [picked, setPicked] = useState<string[]>(current?.values ?? distinct);
  const [search, setSearch] = useState('');
  const [op, setOp] = useState<FilterCriterion['op'] | ''>(current?.op ?? '');
  const [value, setValue] = useState(current?.value ?? '');
  const shown = distinct.filter((v) => v.toLowerCase().includes(search.toLowerCase()));
  const all = picked.length === distinct.length;
  const apply = () => {
    if (op) return onApply({ op, value });
    onApply(all ? null : { values: picked });
  };
  return (
    <DialogShell
      title={`Filter: ${header}`}
      onClose={onClose}
      footer={
        <>
          <button className={secondaryBtn} onClick={() => onApply(null)}>
            Clear filter
          </button>
          <button className={primaryBtn} onClick={apply} disabled={!op && !picked.length}>
            OK
          </button>
        </>
      }
    >
      <div className="flex gap-2">
        <button className={secondaryBtn} onClick={() => onSort(false)}>
          Sort {numeric ? 'smallest to largest' : 'A to Z'}
        </button>
        <button className={secondaryBtn} onClick={() => onSort(true)}>
          Sort {numeric ? 'largest to smallest' : 'Z to A'}
        </button>
      </div>
      <label className="block space-y-1">
        <span className="text-slate-600">{numeric ? 'Number filters' : 'Text filters'}</span>
        <div className="flex gap-1.5">
          <select value={op ?? ''} onChange={(e) => setOp(e.target.value as FilterCriterion['op'] | '')} className={fieldClass}>
            <option value="">(tick values below)</option>
            {numeric ? (
              <>
                <option value=">">Greater than</option>
                <option value=">=">Greater than or equal to</option>
                <option value="<">Less than</option>
                <option value="<=">Less than or equal to</option>
                <option value="=">Equals</option>
                <option value="<>">Does not equal</option>
                <option value="top">Top N</option>
                <option value="bottom">Bottom N</option>
              </>
            ) : (
              <>
                <option value="=">Equals</option>
                <option value="<>">Does not equal</option>
                <option value="contains">Contains</option>
              </>
            )}
            <option value="blank">Blanks only</option>
            <option value="nonblank">Not blank</option>
          </select>
          {op && op !== 'blank' && op !== 'nonblank' && <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={op === 'top' || op === 'bottom' ? '10' : 'value'} className={`${fieldClass} w-28`} />}
        </div>
      </label>
      {!op && (
        <div className="space-y-1.5">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className={fieldClass} />
          <div className="max-h-48 overflow-y-auto border border-slate-200 rounded p-1.5 space-y-0.5">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" checked={all} onChange={() => setPicked(all ? [] : distinct)} />
              (Select all)
            </label>
            {shown.map((v) => (
              <label key={v} className="flex items-center gap-2">
                <input type="checkbox" checked={picked.includes(v)} onChange={() => setPicked((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]))} />
                {v === '' ? '(Blanks)' : v}
              </label>
            ))}
          </div>
        </div>
      )}
    </DialogShell>
  );
};

// ---------- Conditional formatting ----------

const RULES: { rule: CondRule; label: string; values: 0 | 1 | 2 }[] = [
  { rule: 'greater', label: 'Greater than', values: 1 },
  { rule: 'less', label: 'Less than', values: 1 },
  { rule: 'between', label: 'Between', values: 2 },
  { rule: 'equal', label: 'Equal to', values: 1 },
  { rule: 'contains', label: 'Text that contains', values: 1 },
  { rule: 'duplicate', label: 'Duplicate values', values: 0 },
  { rule: 'unique', label: 'Unique values', values: 0 },
  { rule: 'top', label: 'Top N items', values: 1 },
  { rule: 'bottom', label: 'Bottom N items', values: 1 },
  { rule: 'above', label: 'Above average', values: 0 },
  { rule: 'below', label: 'Below average', values: 0 },
  { rule: 'blank', label: 'Blank cells', values: 0 },
  { rule: 'scale', label: 'Colour scale (green, by value)', values: 0 },
];
export const STYLE_CLASS: Record<CondFormat['style'], string> = {
  red: 'bg-rose-100 text-rose-800',
  green: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-amber-100 text-amber-900',
  bold: 'font-bold',
};

export const CondFormatDialog: React.FC<{
  range: string;
  rules: CondFormat[];
  onAdd: (f: CondFormat) => void;
  onRemove: (i: number) => void;
  onClose: () => void;
}> = ({ range, rules, onAdd, onRemove, onClose }) => {
  const [rule, setRule] = useState<CondRule>('greater');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [style, setStyle] = useState<CondFormat['style']>('red');
  const spec = RULES.find((r) => r.rule === rule)!;
  return (
    <DialogShell
      title="Conditional formatting"
      onClose={onClose}
      footer={
        <>
          <button className={secondaryBtn} onClick={onClose}>
            Close
          </button>
          <button
            className={primaryBtn}
            disabled={(spec.values > 0 && !value.trim() && rule !== 'top' && rule !== 'bottom') || (spec.values > 1 && !value2.trim())}
            onClick={() => onAdd({ ref: range, rule, ...(spec.values > 0 && { value: value.trim() || '10' }), ...(spec.values > 1 && { value2: value2.trim() }), style })}
          >
            Add rule to {range}
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-slate-600">Format cells that are</span>
        <select value={rule} onChange={(e) => setRule(e.target.value as CondRule)} className={fieldClass}>
          {RULES.map((r) => (
            <option key={r.rule} value={r.rule}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      {spec.values > 0 && (
        <div className="flex gap-2 items-center">
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={rule === 'top' || rule === 'bottom' ? '10' : 'value'} className={fieldClass} />
          {spec.values > 1 && (
            <>
              <span className="text-slate-500">and</span>
              <input value={value2} onChange={(e) => setValue2(e.target.value)} placeholder="value" className={fieldClass} />
            </>
          )}
        </div>
      )}
      {rule !== 'scale' && (
        <label className="block space-y-1">
          <span className="text-slate-600">With</span>
          <select value={style} onChange={(e) => setStyle(e.target.value as CondFormat['style'])} className={fieldClass}>
            <option value="red">Light red fill with dark red text</option>
            <option value="green">Green fill with dark green text</option>
            <option value="yellow">Yellow fill with dark yellow text</option>
            <option value="bold">Bold text</option>
          </select>
        </label>
      )}
      {rules.length > 0 && (
        <div className="space-y-1">
          <div className="text-slate-600">Rules on this sheet</div>
          {rules.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1 border border-slate-200 rounded">
              <span className={`w-3 h-3 rounded-sm ${STYLE_CLASS[f.style]} border border-slate-300`} />
              <span className="flex-1">
                {RULES.find((r) => r.rule === f.rule)?.label} {f.value ?? ''} {f.value2 ? `and ${f.value2}` : ''} · {f.ref}
              </span>
              <button onClick={() => onRemove(i)} className="text-slate-400 hover:text-rose-600" aria-label="Delete rule">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </DialogShell>
  );
};

// ---------- Charts ----------

const SERIES = ['#2563eb', '#f59e0b', '#10b981', '#e11d48', '#8b5cf6', '#0891b2'];
const short = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(1)}m` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(Math.round(n * 100) / 100));

export const ChartBox: React.FC<{ calc: Calc; sheet: number; chart: SheetChart; onChange: (c: SheetChart) => void; onDelete: () => void }> = ({ calc, sheet, chart, onChange, onDelete }) => {
  const data = calc.chartData(sheet, chart);
  const [editing, setEditing] = useState(false);
  const W = 420;
  const H = 230;
  const pad = { l: 44, r: 10, t: 8, b: 40 };
  const body = (() => {
    if (!data || !data.categories.length || !data.series.length) return <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-slate-400 text-[11px]">No data in {chart.ref}</text>;
    const { categories, series } = data;
    if (chart.kind === 'pie') {
      const vals = series[0].values.map((v) => Math.max(v, 0));
      const total = vals.reduce((a, b) => a + b, 0) || 1;
      let angle = -Math.PI / 2;
      const cx = 115;
      const cy = H / 2;
      const rr = 90;
      return (
        <>
          {vals.map((v, i) => {
            const a2 = angle + (v / total) * Math.PI * 2;
            const large = a2 - angle > Math.PI ? 1 : 0;
            const d = `M${cx},${cy} L${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)} A${rr},${rr} 0 ${large} 1 ${cx + rr * Math.cos(a2)},${cy + rr * Math.sin(a2)} Z`;
            angle = a2;
            return <path key={i} d={d} fill={SERIES[i % SERIES.length]} stroke="white" strokeWidth={1} />;
          })}
          {categories.slice(0, 10).map((c, i) => (
            <g key={c + i} transform={`translate(230,${20 + i * 18})`}>
              <rect width={10} height={10} fill={SERIES[i % SERIES.length]} />
              <text x={14} y={9} className="fill-slate-700 text-[10px]">
                {c} ({Math.round((vals[i] / total) * 100)}%)
              </text>
            </g>
          ))}
        </>
      );
    }
    const all = series.flatMap((s) => s.values);
    const max = Math.max(0, ...all);
    const min = Math.min(0, ...all);
    const span = max - min || 1;
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => min + span * f);
    const n = categories.length;
    if (chart.kind === 'bar') {
      const band = ih / n;
      const bh = (band * 0.7) / series.length;
      const x = (v: number) => pad.l + ((v - min) / span) * iw;
      return (
        <>
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={x(t)} x2={x(t)} y1={pad.t} y2={pad.t + ih} className="stroke-slate-200" />
              <text x={x(t)} y={H - pad.b + 12} textAnchor="middle" className="fill-slate-500 text-[9px]">
                {short(t)}
              </text>
            </g>
          ))}
          {categories.map((c, i) => (
            <g key={c + i}>
              <text x={pad.l - 4} y={pad.t + band * i + band / 2 + 3} textAnchor="end" className="fill-slate-600 text-[9px]">
                {c.slice(0, 8)}
              </text>
              {series.map((s, j) => (
                <rect key={j} x={x(Math.min(0, s.values[i]))} y={pad.t + band * i + band * 0.15 + bh * j} width={Math.abs(x(s.values[i]) - x(0))} height={bh} fill={SERIES[j % SERIES.length]} />
              ))}
            </g>
          ))}
        </>
      );
    }
    const y = (v: number) => pad.t + ih - ((v - min) / span) * ih;
    const band = iw / n;
    return (
      <>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-slate-200" />
            <text x={pad.l - 4} y={y(t) + 3} textAnchor="end" className="fill-slate-500 text-[9px]">
              {short(t)}
            </text>
          </g>
        ))}
        {categories.map((c, i) => (
          <text key={c + i} x={pad.l + band * i + band / 2} y={H - pad.b + 12} textAnchor="middle" className="fill-slate-600 text-[9px]">
            {c.slice(0, Math.max(3, Math.floor(band / 6)))}
          </text>
        ))}
        {series.map((s, j) =>
          chart.kind === 'line' ? (
            <polyline key={j} fill="none" stroke={SERIES[j % SERIES.length]} strokeWidth={2} points={s.values.map((v, i) => `${pad.l + band * i + band / 2},${y(v)}`).join(' ')} />
          ) : (
            s.values.map((v, i) => {
              const bw = (band * 0.7) / series.length;
              return <rect key={`${j}-${i}`} x={pad.l + band * i + band * 0.15 + bw * j} y={Math.min(y(v), y(0))} width={bw} height={Math.abs(y(0) - y(v))} fill={SERIES[j % SERIES.length]} />;
            })
          )
        )}
      </>
    );
  })();
  return (
    <div className="bg-white border border-slate-300 rounded shadow-md w-[440px] select-none" onMouseDown={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1 px-2 py-1 border-b border-slate-200 bg-slate-50">
        <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
        {editing ? (
          <input
            autoFocus
            defaultValue={chart.title}
            onBlur={(e) => (setEditing(false), onChange({ ...chart, title: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="flex-1 h-6 px-1 text-xs border border-emerald-500 rounded focus:outline-none select-text"
          />
        ) : (
          <button onClick={() => setEditing(true)} title="Click to edit the chart title" className="flex-1 text-left text-xs font-semibold text-slate-800 truncate">
            {chart.title || 'Chart title'}
          </button>
        )}
        <select value={chart.kind} onChange={(e) => onChange({ ...chart, kind: e.target.value as SheetChart['kind'] })} className="h-6 text-[11px] border border-slate-300 rounded" aria-label="Chart type">
          <option value="column">Column</option>
          <option value="bar">Bar</option>
          <option value="line">Line</option>
          <option value="pie">Pie</option>
        </select>
        <button onClick={onDelete} className="p-0.5 text-slate-400 hover:text-rose-600" aria-label="Delete chart">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        {body}
      </svg>
      {data && data.series.length > 1 && chart.kind !== 'pie' && (
        <div className="flex flex-wrap gap-3 px-3 pb-2 text-[10px] text-slate-600">
          {data.series.map((s, j) => (
            <span key={j} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: SERIES[j % SERIES.length] }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="px-3 pb-1.5 text-[10px] text-slate-400">Data: {chart.ref}</div>
    </div>
  );
};

// ---------- Slicers ----------

export const SlicerBox: React.FC<{ slicer: SheetSlicer; values: string[]; onChange: (s: SheetSlicer) => void; onDelete: () => void }> = ({ slicer, values, onChange, onDelete }) => (
  <div className="bg-white border border-slate-300 rounded shadow-md w-44 select-none" onMouseDown={(e) => e.stopPropagation()}>
    <div className="flex items-center gap-1 px-2 py-1 border-b border-slate-200 bg-slate-50">
      <span className="flex-1 text-xs font-semibold text-slate-800 truncate">{slicer.column}</span>
      {slicer.selected.length > 0 && (
        <button onClick={() => onChange({ ...slicer, selected: [] })} className="text-[10px] text-emerald-700 hover:underline" title="Clear filter">
          Clear
        </button>
      )}
      <button onClick={onDelete} className="p-0.5 text-slate-400 hover:text-rose-600" aria-label="Delete slicer">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
    <div className="p-1.5 space-y-1 max-h-48 overflow-y-auto">
      {values.map((v) => {
        const on = slicer.selected.includes(v);
        return (
          <button
            key={v}
            onClick={(e) => onChange({ ...slicer, selected: e.ctrlKey || e.metaKey ? (on ? slicer.selected.filter((x) => x !== v) : [...slicer.selected, v]) : on && slicer.selected.length === 1 ? [] : [v] })}
            className={`w-full text-left px-2 py-1 rounded text-[11px] border ${on ? 'bg-sky-100 border-sky-400 text-sky-900 font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {v || '(blank)'}
          </button>
        );
      })}
      <p className="text-[9px] text-slate-400 px-1">Ctrl+click to pick several</p>
    </div>
  </div>
);

// ---------- Tables ----------

export const TableDialog: React.FC<{ range: string; name: string; taken: string[]; title: string; onSave: (name: string, ref: string, style: 'blue' | 'green' | 'orange' | 'gray') => void; onClose: () => void }> = ({
  range,
  name,
  taken,
  title,
  onSave,
  onClose,
}) => {
  const [n, setN] = useState(name);
  const [ref, setRef] = useState(range);
  const [style, setStyle] = useState<'blue' | 'green' | 'orange' | 'gray'>('blue');
  const valid = /^[A-Za-z_][A-Za-z0-9_.]*$/.test(n) && !/^[A-Za-z]{1,3}\d+$/.test(n);
  const clash = taken.some((t) => t.toLowerCase() === n.toLowerCase());
  return (
    <DialogShell
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryBtn} disabled={!valid || clash || !/^[A-Z]+\d+:[A-Z]+\d+$/i.test(ref)} onClick={() => onSave(n, ref.toUpperCase(), style)}>
            OK
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-slate-600">Where is the data for your table? (row 1 holds the headers)</span>
        <input value={ref} onChange={(e) => setRef(e.target.value)} className={`${fieldClass} font-mono`} />
      </label>
      <label className="block space-y-1">
        <span className="text-slate-600">Table name</span>
        <input value={n} onChange={(e) => setN(e.target.value)} className={`${fieldClass} font-mono`} />
        {!valid && <span className="text-rose-600">Start with a letter; letters, numbers and _ only, and not a cell address.</span>}
        {valid && clash && <span className="text-rose-600">There's already a table with that name.</span>}
      </label>
      <label className="block space-y-1">
        <span className="text-slate-600">Style</span>
        <select value={style} onChange={(e) => setStyle(e.target.value as 'blue')} className={fieldClass}>
          <option value="blue">Blue, banded rows</option>
          <option value="green">Green, banded rows</option>
          <option value="orange">Orange, banded rows</option>
          <option value="gray">Grey, banded rows</option>
        </select>
      </label>
    </DialogShell>
  );
};

export const TABLE_STYLE: Record<string, { head: string; band: string }> = {
  blue: { head: 'bg-sky-700 text-white font-semibold', band: 'bg-sky-50' },
  green: { head: 'bg-emerald-700 text-white font-semibold', band: 'bg-emerald-50' },
  orange: { head: 'bg-orange-600 text-white font-semibold', band: 'bg-orange-50' },
  gray: { head: 'bg-slate-600 text-white font-semibold', band: 'bg-slate-100' },
};

export const PickDialog: React.FC<{ title: string; label: string; options: string[]; onPick: (v: string) => void; onClose: () => void }> = ({ title, label, options, onPick, onClose }) => {
  const [v, setV] = useState(options[0] ?? '');
  return (
    <DialogShell
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className={secondaryBtn} onClick={onClose}>
            Cancel
          </button>
          <button className={primaryBtn} disabled={!v} onClick={() => onPick(v)}>
            OK
          </button>
        </>
      }
    >
      <label className="block space-y-1">
        <span className="text-slate-600">{label}</span>
        <select value={v} onChange={(e) => setV(e.target.value)} className={fieldClass}>
          {options.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
    </DialogShell>
  );
};

export const columnValues = (calc: Calc, sheet: number, r1: number, r2: number, c: number) => {
  const out: string[] = [];
  for (let r = r1; r <= r2; r++) {
    const v = calc.value(sheet, r, c);
    out.push(v === null ? '' : toText(v));
  }
  return out;
};
