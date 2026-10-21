import React from 'react';

interface ChartSpec {
  type: 'bar' | 'line';
  labels: string[];
  values: number[];
}

// A chart spec returned by a candidate's code, if it is one we can draw
export function parseChartSpec(raw: string | undefined): ChartSpec | null {
  try {
    const spec = JSON.parse(raw ?? '');
    const ok =
      spec &&
      (spec.type === 'bar' || spec.type === 'line') &&
      Array.isArray(spec.labels) &&
      Array.isArray(spec.values) &&
      spec.labels.length > 0 &&
      spec.values.every((v: unknown) => typeof v === 'number' && Number.isFinite(v));
    return ok ? spec : null;
  } catch {
    return null;
  }
}

// Draws what a dashboard task's code returns: horizontal bars, or a line over time
export const ChartPreview: React.FC<{ spec: ChartSpec }> = ({ spec }) => {
  const max = Math.max(...spec.values, 0) || 1;

  if (spec.type === 'bar') {
    return (
      <div className="space-y-1.5">
        {spec.labels.map((label, i) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span className="w-24 shrink-0 truncate text-slate-600 font-sans">{label}</span>
            <div className="flex-1 h-4 bg-slate-100 rounded-sm overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-sm" style={{ width: `${Math.max(0, ((spec.values[i] ?? 0) / max) * 100)}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right tabular-nums text-slate-800">{spec.values[i]}</span>
          </div>
        ))}
      </div>
    );
  }

  const w = 320;
  const h = 120;
  const pad = 8;
  const step = spec.values.length > 1 ? (w - pad * 2) / (spec.values.length - 1) : 0;
  const points = spec.values.map((v, i) => [pad + i * step, h - pad - (Math.max(0, v) / max) * (h - pad * 2)]);
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32" role="img" aria-label="Line chart preview">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} className="stroke-slate-200" />
        <polyline points={points.map((p) => p.join(',')).join(' ')} fill="none" className="stroke-indigo-500" strokeWidth={2} />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3} className="fill-indigo-600" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
        {spec.labels.map((l, i) => (
          <span key={i}>{l}</span>
        ))}
      </div>
    </div>
  );
};
