import React, { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Check, FlaskConical, Loader2, Play, Plus, Trash2, Workflow, X, Zap } from 'lucide-react';
import { AutomationsConfig, AutomationsState, FILTER_OPS, Flow, FlowRun, FlowStep, STEP_INFO, StepKind, TextFn, runFlow, undoEffects } from '../../lib/automations';
import { DeskAppsState } from '../../lib/deskApps';
import { signedInHeaders } from '../../lib/aiRequest';
import { DeskCtx, btn, input, primary } from './shared';

/**
 * Automations: Zapier/n8n-style workflows (src/lib/automations.ts). Pick a trigger (a source of events), add steps
 * (filter, set a field, an AI step, skip duplicates, and actions on the desktop's CRM, Chat, help desk and Files), choose
 * what an error does, test on a few events without changing anything, then run on every event. Each run's log shows
 * what happened to every event; running again first takes the last run's changes back out.
 */

const uid = () => Math.random().toString(36).slice(2, 9);
const blank = (kind: StepKind): FlowStep => {
  const id = uid();
  switch (kind) {
    case 'filter':
      return { id, kind, field: '', op: 'equals', value: '' };
    case 'set':
      return { id, kind, field: '', value: '', fn: 'none' };
    case 'ai':
      return { id, kind, prompt: '', output: 'ai_output', options: '' };
    case 'skipif':
      return { id, kind, object: '', match: '', value: '' };
    case 'crm':
      return { id, kind, object: '', values: {} };
    case 'chat':
      return { id, kind, channel: '', text: '' };
    case 'ticket':
      return { id, kind, ticket: '', status: '', priority: '', tags: '' };
    case 'row':
      return { id, kind, file: 'automation_output.csv', values: { column_1: '' } };
  }
};

async function aiStep(prompt: string, events: Record<string, string>[], options: string[]): Promise<string[]> {
  const res = await fetch('/api/desk-agent', { method: 'POST', headers: await signedInHeaders(), body: JSON.stringify({ mode: 'step', prompt, events, options }) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.error || !Array.isArray(out.outputs)) throw new Error(out.error === 'not-configured' ? "AI steps aren't available on this site." : out.error || 'The AI step failed.');
  return out.outputs;
}

export const AutomationsApp: React.FC<{ ctx: DeskCtx; cfg: AutomationsConfig }> = ({ ctx, cfg }) => {
  const state: AutomationsState = ctx.state.desk?.automations ?? { flows: cfg.flows ?? [], runs: [] };
  const [openId, setOpenId] = useState<string | null>(state.flows[0]?.id ?? null);
  const flow = state.flows.find((f) => f.id === openId);
  const save = (next: AutomationsState) => !ctx.readOnly && ctx.setWork('automations', next);
  const cur = () => ctx.latest().desk?.automations ?? { flows: cfg.flows ?? [], runs: [] };
  const change = (f: Flow) => save({ ...cur(), flows: cur().flows.map((x) => (x.id === f.id ? f : x)) });
  const add = () => {
    const f: Flow = { id: `flow-${uid()}`, name: `Workflow ${state.flows.length + 1}`, source: cfg.sources[0]?.id ?? '', steps: [], onError: 'stop' };
    save({ ...cur(), flows: [...cur().flows, f] });
    setOpenId(f.id);
  };
  return (
    <div className="h-full flex text-[13px] text-slate-800 bg-[#f6f7f9]" data-ref="automations" style={{ ['--accent' as string]: '#ea580c', ['--accent-soft' as string]: '#ffedd5' }}>
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
        <div className="px-3 h-11 flex items-center gap-2 font-semibold border-b border-slate-200">
          <span className="w-6 h-6 rounded-md bg-orange-600 text-white grid place-items-center">
            <Zap className="w-3.5 h-3.5" />
          </span>
          {cfg.name ?? 'Automations'}
        </div>
        <div className="p-2">
          {!ctx.readOnly && (
            <button className={`${primary} w-full justify-center`} onClick={add} data-ref="flow-new">
              <Plus className="w-3.5 h-3.5" />
              New workflow
            </button>
          )}
        </div>
        <ul className="px-2 pb-3 space-y-0.5">
          {state.flows.map((f) => {
            const last = [...state.runs].reverse().find((r) => r.flow === f.id && !r.test);
            return (
              <li key={f.id}>
                <button onClick={() => setOpenId(f.id)} className={`w-full text-left px-2 py-2 rounded-md ${openId === f.id ? 'bg-orange-50 ring-1 ring-orange-200' : 'hover:bg-slate-100'}`}>
                  <span className="block font-medium truncate">{f.name}</span>
                  <span className="block text-[11px] text-slate-500 truncate">
                    {cfg.sources.find((s) => s.id === f.source)?.label ?? 'No trigger'} · {f.steps.length} steps{last ? ` · ran ${last.events.filter((e) => e.status === 'error').length ? 'with errors' : 'OK'}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
          {!state.flows.length && <li className="px-2 py-2 text-slate-500">No workflows yet.</li>}
        </ul>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">{flow ? <Editor key={flow.id} ctx={ctx} cfg={cfg} flow={flow} runs={state.runs.filter((r) => r.flow === flow.id)} onChange={change} save={save} cur={cur} onDelete={() => (save({ ...cur(), flows: cur().flows.filter((x) => x.id !== flow.id) }), setOpenId(null))} /> : <p className="p-6 text-slate-500">Pick a workflow, or make a new one.</p>}</main>
    </div>
  );
};

const Editor: React.FC<{
  ctx: DeskCtx;
  cfg: AutomationsConfig;
  flow: Flow;
  runs: FlowRun[];
  onChange: (f: Flow) => void;
  save: (s: AutomationsState) => void;
  cur: () => AutomationsState;
  onDelete: () => void;
}> = ({ ctx, cfg, flow, runs, onChange, save, cur, onDelete }) => {
  const [busy, setBusy] = useState<'test' | 'run' | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const ro = !!ctx.readOnly;
  const source = cfg.sources.find((s) => s.id === flow.source);
  // Every field a step can use: the trigger's, then each set or AI step's output
  const fields = [...(source?.fields ?? []), ...flow.steps.flatMap((s) => (s.kind === 'set' ? [s.field] : s.kind === 'ai' ? [s.output] : [])).filter(Boolean)];
  const work = ctx.cfg.work ?? {};
  const setStep = (i: number, s: FlowStep) => onChange({ ...flow, steps: flow.steps.map((x, j) => (j === i ? s : x)) });
  const move = (i: number, d: number) => {
    const steps = [...flow.steps];
    const [s] = steps.splice(i, 1);
    steps.splice(i + d, 0, s);
    onChange({ ...flow, steps });
  };

  const go = async (test: boolean) => {
    if (!source || ro) return;
    setBusy(test ? 'test' : 'run');
    setError('');
    try {
      const before = ctx.latest();
      const last = before.desk?.automations?.effects?.[flow.id];
      // A real run first takes this workflow's last run back out
      const undone = test ? { work: before.desk ?? {}, files: ctx.files } : undoEffects(before.desk ?? {}, work, last, ctx.files);
      const out = await runFlow(flow, source, { apps: work, work: undone.work, files: undone.files, required: cfg.required, ai: aiStep }, test, test ? 3 : undefined);
      const auto = cur();
      const next: AutomationsState = { ...auto, runs: [...auto.runs, out.run].slice(-30), ...(!test && { effects: { ...(auto.effects ?? {}), [flow.id]: out.effects } }) };
      if (!test) {
        for (const k of ['crm', 'chat', 'helpdesk'] as (keyof DeskAppsState)[]) if (out.work[k] !== (before.desk ?? {})[k]) ctx.setWork(k, out.work[k] as never);
        for (const name of last?.files ?? []) if (!out.effects.files.includes(name)) ctx.removeFile(name);
        for (const name of out.effects.files) {
          const f = out.files.find((x) => x.name === name);
          if (f) ctx.saveFile(f, '');
        }
      }
      save(next);
      ctx.toast(test ? 'Test run done: nothing was changed' : `Ran on ${out.run.events.length} events`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The run failed.');
    } finally {
      setBusy(null);
    }
  };
  const last = runs[runs.length - 1];

  return (
    <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">
      <div className="flex items-center gap-2">
        <Workflow className="w-5 h-5 text-orange-600" />
        <input value={flow.name} disabled={ro} onChange={(e) => onChange({ ...flow, name: e.target.value })} className="flex-1 h-9 px-2 text-base font-semibold bg-transparent border border-transparent hover:border-slate-200 focus:border-orange-400 rounded-md focus:outline-none" aria-label="Workflow name" />
        {!ro && (
          <button className={btn} onClick={onDelete} title="Delete workflow">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Trigger */}
      <Card n="When" title="Trigger">
        <select value={flow.source} disabled={ro} onChange={(e) => onChange({ ...flow, source: e.target.value })} className={input} data-ref="flow-source">
          {cfg.sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {source && (
          <p className="mt-2 text-[11.5px] text-slate-500">
            {source.events.length} events. Fields you can use as {'{{field}}'}: {fields.map((f) => <code key={f} className="mx-0.5 px-1 rounded bg-slate-100 text-slate-700">{f}</code>)}
          </p>
        )}
      </Card>

      {/* Steps */}
      {flow.steps.map((s, i) => (
        <Card
          key={s.id}
          n={String(i + 1)}
          title={STEP_INFO[s.kind].label}
          ai={s.kind === 'ai'}
          tools={
            !ro && (
              <span className="flex gap-1">
                <button className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30" disabled={i === flow.steps.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 text-slate-400 hover:text-rose-600" onClick={() => onChange({ ...flow, steps: flow.steps.filter((_, j) => j !== i) })} aria-label="Delete step">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )
          }
        >
          <StepForm step={s} ro={ro} fields={fields} work={work} onChange={(x) => setStep(i, x)} />
        </Card>
      ))}
      {!ro &&
        (adding ? (
          <div className="rounded-xl border border-dashed border-orange-300 bg-white p-3 grid sm:grid-cols-2 gap-2">
            {(Object.keys(STEP_INFO) as StepKind[]).map((k) => (
              <button key={k} onClick={() => (onChange({ ...flow, steps: [...flow.steps, blank(k)] }), setAdding(false))} className="text-left p-2 rounded-lg hover:bg-orange-50 border border-slate-200" data-ref={`flow-add-${k}`}>
                <span className="block font-semibold">{STEP_INFO[k].label}</span>
                <span className="block text-[11.5px] text-slate-500">{STEP_INFO[k].about}</span>
              </button>
            ))}
          </div>
        ) : (
          <button className={btn} onClick={() => setAdding(true)} data-ref="flow-add">
            <Plus className="w-3.5 h-3.5" />
            Add a step
          </button>
        ))}

      {/* Errors */}
      <Card n="!" title="If a step fails">
        <div className="grid sm:grid-cols-2 gap-2">
          <select value={flow.onError} disabled={ro} onChange={(e) => onChange({ ...flow, onError: e.target.value as Flow['onError'] })} className={input} data-ref="flow-onerror">
            <option value="stop">Stop the whole run</option>
            <option value="skip">Skip that event and carry on</option>
          </select>
          <select value={flow.errorChannel ?? ''} disabled={ro} onChange={(e) => onChange({ ...flow, errorChannel: e.target.value || undefined })} className={input} data-ref="flow-errorchannel">
            <option value="">Don’t tell anyone</option>
            {(work.chat?.channels ?? []).filter((c) => c.kind === 'channel').map((c) => (
              <option key={c.id} value={c.id}>
                Post the error in #{c.name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {!ro && (
        <div className="flex flex-wrap items-center gap-2">
          <button className={btn} disabled={!!busy || !flow.steps.length} onClick={() => go(true)} data-ref="flow-test">
            {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5" />}
            Test on 3 events
          </button>
          <button className={primary} disabled={!!busy || !flow.steps.length} onClick={() => go(false)} data-ref="flow-run">
            {busy === 'run' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run on all {source?.events.length ?? ''} events
          </button>
          <span className="text-[11.5px] text-slate-500">A test changes nothing. Running again replaces this workflow’s last run.</span>
        </div>
      )}
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800" role="alert">
          {error}
        </p>
      )}
      {last && <RunLog run={last} />}
    </div>
  );
};

const Card: React.FC<{ n: string; title: string; ai?: boolean; tools?: React.ReactNode; children: React.ReactNode }> = ({ n, title, ai, tools, children }) => (
  <section className={`rounded-xl border bg-white p-3 ${ai ? 'border-violet-300' : 'border-slate-200'}`}>
    <div className="flex items-center gap-2 mb-2">
      <span className={`min-w-6 h-6 px-1.5 rounded-md grid place-items-center text-[11px] font-bold text-white ${ai ? 'bg-violet-600' : 'bg-orange-600'}`}>{n}</span>
      <span className="font-semibold flex-1">{title}</span>
      {tools}
    </div>
    {children}
  </section>
);

const Field: React.FC<{ label: string; children: React.ReactNode; wide?: boolean }> = ({ label, children, wide }) => (
  <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
    <span className="block text-[11px] font-semibold text-slate-500 mb-0.5">{label}</span>
    {children}
  </label>
);

const StepForm: React.FC<{ step: FlowStep; ro: boolean; fields: string[]; work: NonNullable<DeskCtx['cfg']['work']>; onChange: (s: FlowStep) => void }> = ({ step: s, ro, fields, work, onChange }) => {
  const fieldPick = (value: string, set: (v: string) => void) => (
    <select value={value} disabled={ro} onChange={(e) => set(e.target.value)} className={input}>
      <option value="">Pick a field</option>
      {[...new Set([...fields, ...(value && !fields.includes(value) ? [value] : [])])].map((f) => (
        <option key={f} value={f}>
          {f}
        </option>
      ))}
    </select>
  );
  const text = (value: string, set: (v: string) => void, placeholder = '', ref?: string) => <input value={value} disabled={ro} onChange={(e) => set(e.target.value)} placeholder={placeholder} className={input} {...(ref && { 'data-ref': ref })} />;
  const objects = work.crm?.objects ?? [];
  switch (s.kind) {
    case 'filter':
      return (
        <div className="grid sm:grid-cols-3 gap-2">
          <Field label="Field">{fieldPick(s.field, (field) => onChange({ ...s, field }))}</Field>
          <Field label="Condition">
            <select value={s.op} disabled={ro} onChange={(e) => onChange({ ...s, op: e.target.value as typeof s.op })} className={input}>
              {FILTER_OPS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          {!s.op.startsWith('is ') && <Field label="Value">{text(s.value, (value) => onChange({ ...s, value }))}</Field>}
          <p className="sm:col-span-3 text-[11px] text-slate-500">Only events that meet this carry on.</p>
        </div>
      );
    case 'set':
      return (
        <div className="grid sm:grid-cols-3 gap-2">
          <Field label="Field to set">{text(s.field, (field) => onChange({ ...s, field }), 'e.g. email_clean')}</Field>
          <Field label="Value">{text(s.value, (value) => onChange({ ...s, value }), 'e.g. {{email}}')}</Field>
          <Field label="Then">
            <select value={s.fn} disabled={ro} onChange={(e) => onChange({ ...s, fn: e.target.value as TextFn })} className={input}>
              {(['none', 'trim', 'lowercase', 'uppercase', 'capitalise'] as TextFn[]).map((f) => (
                <option key={f} value={f}>
                  {f === 'none' ? 'leave as is' : f}
                </option>
              ))}
            </select>
          </Field>
        </div>
      );
    case 'ai':
      return (
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="Instruction for the AI (runs on every event; use {{field}} or it sees the whole event)" wide>
            <textarea value={s.prompt} disabled={ro} rows={4} onChange={(e) => onChange({ ...s, prompt: e.target.value })} className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-[13px] focus:outline-none focus:border-violet-500" placeholder="e.g. Classify this enquiry as sales, support or spam…" data-ref="flow-ai-prompt" />
          </Field>
          <Field label="Save the answer as field">{text(s.output, (output) => onChange({ ...s, output: output.replace(/\s+/g, '_') }), 'e.g. category', 'flow-ai-output')}</Field>
          <Field label="Allowed answers (optional, comma-separated)">{text(s.options, (options) => onChange({ ...s, options }), 'e.g. sales, support, spam', 'flow-ai-options')}</Field>
        </div>
      );
    case 'skipif': {
      const obj = objects.find((o) => o.id === s.object);
      return (
        <div className="grid sm:grid-cols-3 gap-2">
          <Field label="CRM object">
            <select value={s.object} disabled={ro} onChange={(e) => onChange({ ...s, object: e.target.value, match: '' })} className={input}>
              <option value="">Pick one</option>
              {objects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Where its field">
            <select value={s.match} disabled={ro} onChange={(e) => onChange({ ...s, match: e.target.value })} className={input}>
              <option value="">Pick one</option>
              {(obj?.fields ?? []).map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Matches">{text(s.value, (value) => onChange({ ...s, value }), 'e.g. {{email}}')}</Field>
        </div>
      );
    }
    case 'crm': {
      const obj = objects.find((o) => o.id === s.object);
      return (
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="Create a record in" wide>
            <select value={s.object} disabled={ro} onChange={(e) => onChange({ ...s, object: e.target.value, values: {} })} className={input} data-ref="flow-crm-object">
              <option value="">Pick one</option>
              {objects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          {(obj?.fields ?? []).map((f) => (
            <Field key={f.key} label={`${f.label}${f.options?.length ? ` (${f.options.join(', ')})` : ''}`}>
              {text(s.values[f.key] ?? '', (v) => onChange({ ...s, values: { ...s.values, [f.key]: v } }), `e.g. {{${f.key}}}`)}
            </Field>
          ))}
        </div>
      );
    }
    case 'chat':
      return (
        <div className="grid gap-2">
          <Field label="Channel">
            <select value={s.channel} disabled={ro} onChange={(e) => onChange({ ...s, channel: e.target.value })} className={input}>
              <option value="">Pick one</option>
              {(work.chat?.channels ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.kind === 'channel' ? `#${c.name}` : c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Message">
            <textarea value={s.text} disabled={ro} rows={2} onChange={(e) => onChange({ ...s, text: e.target.value })} className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-[13px] focus:outline-none focus:border-orange-500" placeholder="e.g. New lead: {{name}} from {{company}}" />
          </Field>
        </div>
      );
    case 'ticket':
      return (
        <div className="grid sm:grid-cols-2 gap-2">
          <Field label="Ticket">{text(s.ticket, (ticket) => onChange({ ...s, ticket }), 'e.g. {{ticket_id}}')}</Field>
          <Field label="Priority (low, normal, high, urgent)">{text(s.priority, (priority) => onChange({ ...s, priority }), 'e.g. {{priority}} or high')}</Field>
          <Field label="Status">
            <select value={s.status} disabled={ro} onChange={(e) => onChange({ ...s, status: e.target.value })} className={input}>
              <option value="">Leave as is</option>
              {['new', 'open', 'pending', 'on-hold', 'solved'].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Add tags (comma-separated)">{text(s.tags, (tags) => onChange({ ...s, tags }), 'e.g. {{category}}')}</Field>
        </div>
      );
    case 'row': {
      const cols = Object.entries(s.values);
      return (
        <div className="grid gap-2">
          <Field label="CSV file in Files">{text(s.file, (file) => onChange({ ...s, file }))}</Field>
          {cols.map(([k, v], i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
              {text(k, (nk) => onChange({ ...s, values: Object.fromEntries(cols.map(([a, b], j) => (j === i ? [nk, b] : [a, b]))) }), 'column')}
              {text(v, (nv) => onChange({ ...s, values: { ...s.values, [k]: nv } }), 'e.g. {{name}}')}
              {!ro && (
                <button className="p-1 text-slate-400 hover:text-rose-600" onClick={() => onChange({ ...s, values: Object.fromEntries(cols.filter((_, j) => j !== i)) })} aria-label="Remove column">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          {!ro && (
            <button className={`${btn} w-fit`} onClick={() => onChange({ ...s, values: { ...s.values, [`column_${cols.length + 1}`]: '' } })}>
              <Plus className="w-3.5 h-3.5" />
              Column
            </button>
          )}
        </div>
      );
    }
  }
};

const TONE: Record<string, string> = { done: 'bg-emerald-100 text-emerald-800', filtered: 'bg-slate-200 text-slate-700', skipped: 'bg-sky-100 text-sky-800', error: 'bg-rose-100 text-rose-800', 'not run': 'bg-amber-100 text-amber-800' };

const RunLog: React.FC<{ run: FlowRun }> = ({ run }) => {
  const count = (st: string) => run.events.filter((e) => e.status === st).length;
  return (
    <section className="rounded-xl border border-slate-200 bg-white" aria-label="Run log">
      <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap items-center gap-2">
        <span className="font-semibold">{run.test ? 'Test run' : 'Last run'}</span>
        <span className="text-[11.5px] text-slate-500">
          {run.events.length} events · {count('done')} done · {count('filtered')} filtered · {count('skipped')} skipped · {count('error')} errors
          {run.stopped && ' · stopped at an error'}
        </span>
        {run.events.some((e) => e.status === 'error') ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <Check className="w-4 h-4 text-emerald-600" />}
      </div>
      <ol className="divide-y divide-slate-100">
        {run.events.map((e) => (
          <li key={e.n} className="px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 tabular-nums w-6">#{e.n}</span>
              <span className={`px-1.5 py-px rounded text-[10.5px] font-semibold ${TONE[e.status]}`}>{e.status}</span>
            </div>
            {e.lines.length > 0 && (
              <ul className="mt-1 pl-8 space-y-0.5 font-mono text-[11.5px] text-slate-600">
                {e.lines.map((l, i) => (
                  <li key={i} className={l.startsWith('✗') ? 'text-rose-700' : ''}>
                    {l}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
};
