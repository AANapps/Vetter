import React, { useState } from 'react';
import { Bot, Check, Loader2, Play, Plus, ShieldCheck, Trash2, User, Wrench, X } from 'lucide-react';
import { McpConfig, McpRun, McpState, McpStep, McpTool, TOOL_NAME, runTool, toolSchema } from '../../lib/mcp';
import { signedInHeaders } from '../../lib/aiRequest';
import { DeskCtx, btn, input, primary } from './shared';

/**
 * AI Tools: set up the tools (MCP-style) an AI agent gets on the company's systems (src/lib/mcp.ts), then try real
 * customer requests on the live agent. Each tool is one of the API's operations, with a name and description the AI
 * reads, the inputs it takes, and whether a person must confirm it before it runs (the run pauses and asks).
 */

type Block = { type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };
type Msg = { role: 'user' | 'assistant'; content: string | Block[] };
const MAX_TURNS = 8;

export const McpApp: React.FC<{ ctx: DeskCtx; cfg: McpConfig }> = ({ ctx, cfg }) => {
  const state: McpState = ctx.state.desk?.mcp ?? { tools: cfg.tools ?? [], runs: {} };
  const [view, setView] = useState<string>(state.tools[0]?.id ?? 'try');
  const cur = (): McpState => ctx.latest().desk?.mcp ?? { tools: cfg.tools ?? [], runs: {} };
  const save = (next: McpState) => !ctx.readOnly && ctx.setWork('mcp', next);
  const add = (op: string) => {
    const o = cfg.operations.find((x) => x.id === op)!;
    const t: McpTool = { id: `t-${Math.random().toString(36).slice(2, 8)}`, name: o.id, description: '', op, confirm: false, params: o.params.map((p) => ({ name: p.name, description: '' })) };
    save({ ...cur(), tools: [...cur().tools, t] });
    setView(t.id);
  };
  const tool = state.tools.find((t) => t.id === view);
  return (
    <div className="h-full flex text-[13px] text-slate-800 bg-white" data-ref="mcp" style={{ ['--accent' as string]: '#0f766e', ['--accent-soft' as string]: '#ccfbf1' }}>
      <aside className="w-64 shrink-0 bg-slate-50 border-r border-slate-200 overflow-y-auto">
        <div className="px-3 h-11 flex items-center gap-2 font-semibold border-b border-slate-200">
          <span className="w-6 h-6 rounded-md bg-teal-700 text-white grid place-items-center">
            <Wrench className="w-3.5 h-3.5" />
          </span>
          {cfg.name ?? 'AI Tools'}
        </div>
        <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">The agent’s tools</div>
        <ul className="px-2 space-y-0.5">
          {state.tools.map((t) => (
            <li key={t.id}>
              <button onClick={() => setView(t.id)} className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 ${view === t.id ? 'bg-teal-100/70' : 'hover:bg-slate-100'}`}>
                <span className="font-mono text-[12px] truncate flex-1">{t.name || '(no name)'}</span>
                {t.confirm && <ShieldCheck className="w-3.5 h-3.5 text-teal-700" aria-label="Needs a person's OK" />}
              </button>
            </li>
          ))}
          {!state.tools.length && <li className="px-2 py-1 text-slate-500">No tools yet: the agent can only talk.</li>}
        </ul>
        {!ctx.readOnly && (
          <>
            <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Add a tool from the API</div>
            <ul className="px-2 space-y-0.5">
              {cfg.operations.map((o) => (
                <li key={o.id}>
                  <button onClick={() => add(o.id)} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-100 flex items-start gap-2" data-ref={`mcp-add-${o.id}`}>
                    <Plus className="w-3.5 h-3.5 mt-0.5 text-teal-700 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{o.label}</span>
                      <span className="block font-mono text-[10.5px] text-slate-500 truncate">
                        {o.method} {o.path}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="p-2 mt-2 border-t border-slate-200">
          <button onClick={() => setView('try')} className={`w-full h-9 rounded-md font-semibold inline-flex items-center justify-center gap-1.5 ${view === 'try' ? 'bg-teal-700 text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'}`} data-ref="mcp-try">
            <Play className="w-3.5 h-3.5" />
            Try it on the agent
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        {tool ? (
          <ToolEditor key={tool.id} ctx={ctx} cfg={cfg} tool={tool} onChange={(t) => save({ ...cur(), tools: cur().tools.map((x) => (x.id === t.id ? t : x)) })} onDelete={() => (save({ ...cur(), tools: cur().tools.filter((x) => x.id !== tool.id) }), setView('try'))} />
        ) : (
          <Tryouts ctx={ctx} cfg={cfg} state={state} cur={cur} save={save} />
        )}
      </main>
    </div>
  );
};

const ToolEditor: React.FC<{ ctx: DeskCtx; cfg: McpConfig; tool: McpTool; onChange: (t: McpTool) => void; onDelete: () => void }> = ({ ctx, cfg, tool, onChange, onDelete }) => {
  const op = cfg.operations.find((o) => o.id === tool.op)!;
  const ro = !!ctx.readOnly;
  const badName = !!tool.name && !TOOL_NAME.test(tool.name);
  return (
    <div className="max-w-2xl mx-auto px-6 py-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tool on</div>
          <div className="font-semibold">
            {op.label} <span className="font-mono text-[11.5px] text-slate-500">{op.method} {op.path}</span>
          </div>
          <p className="text-[12px] text-slate-500">{op.about}</p>
        </div>
        {!ro && (
          <button className={btn} onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>
      <label className="block">
        <span className="block text-[11px] font-semibold text-slate-500 mb-0.5">Name (letters, numbers, _ and -)</span>
        <input value={tool.name} disabled={ro} onChange={(e) => onChange({ ...tool, name: e.target.value.replace(/\s+/g, '_') })} className={`${input} font-mono`} data-ref="mcp-name" />
        {badName && <span className="text-[11px] text-rose-700">Use only letters, numbers, _ and -.</span>}
      </label>
      <label className="block">
        <span className="block text-[11px] font-semibold text-slate-500 mb-0.5">Description: what it does and when the AI should use it (the AI decides from this)</span>
        <textarea value={tool.description} disabled={ro} rows={3} onChange={(e) => onChange({ ...tool, description: e.target.value })} className="w-full px-2.5 py-2 border border-slate-200 rounded-md text-[13px] focus:outline-none focus:border-teal-600" data-ref="mcp-description" />
      </label>
      <div>
        <div className="text-[11px] font-semibold text-slate-500 mb-1">Inputs the AI can give</div>
        <ul className="space-y-1.5">
          {op.params.map((p) => {
            const on = tool.params.find((x) => x.name === p.name);
            return (
              <li key={p.name} className="rounded-lg border border-slate-200 p-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" disabled={ro || p.required} checked={!!on || !!p.required} onChange={(e) => onChange({ ...tool, params: e.target.checked ? [...tool.params, { name: p.name, description: '' }] : tool.params.filter((x) => x.name !== p.name) })} className="accent-teal-700" />
                  <span className="font-mono text-[12px]">{p.name}</span>
                  <span className="text-[11px] text-slate-500">
                    {p.type}
                    {p.required ? ', required' : ''} · {p.about}
                  </span>
                </label>
                {(on || p.required) && (
                  <input value={on?.description ?? ''} disabled={ro} onChange={(e) => onChange({ ...tool, params: [...tool.params.filter((x) => x.name !== p.name), { name: p.name, description: e.target.value }] })} placeholder="What the AI should put here (optional)" className={`${input} mt-1.5`} />
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <label className={`flex items-start gap-2 rounded-lg border p-3 ${tool.confirm ? 'border-teal-300 bg-teal-50' : 'border-slate-200'}`}>
        <input type="checkbox" disabled={ro} checked={tool.confirm} onChange={(e) => onChange({ ...tool, confirm: e.target.checked })} className="mt-0.5 accent-teal-700" data-ref="mcp-confirm" />
        <span>
          <span className="font-semibold inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
            A person must OK it every time
          </span>
          <span className="block text-[12px] text-slate-600">The agent stops and asks before this tool runs.{op.destructive ? ' This operation changes money or data.' : ''}</span>
        </span>
      </label>
    </div>
  );
};

const Tryouts: React.FC<{ ctx: DeskCtx; cfg: McpConfig; state: McpState; cur: () => McpState; save: (s: McpState) => void }> = ({ ctx, cfg, state, cur, save }) => {
  const [pick, setPick] = useState(cfg.scenarios[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ask, setAsk] = useState<{ step: McpStep; resolve: (ok: boolean) => void } | null>(null);
  const scenario = cfg.scenarios.find((s) => s.id === pick);
  const run = state.runs[pick];
  const api = ctx.cfg.work?.api;

  const go = async () => {
    if (!scenario || !api || ctx.readOnly) return;
    setBusy(true);
    setError('');
    const tools = cur().tools.filter((t) => TOOL_NAME.test(t.name));
    const schemas = tools.map((t) => toolSchema(t, cfg.operations.find((o) => o.id === t.op)!));
    const steps: McpStep[] = [{ kind: 'customer', text: scenario.message }];
    const msgs: Msg[] = [{ role: 'user', content: scenario.message }];
    const put = (done: boolean, final = '') => save({ ...cur(), runs: { ...cur().runs, [scenario.id]: { scenario: scenario.id, steps: [...steps], final, at: Date.now(), done } as McpRun } });
    put(false);
    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const res = await fetch('/api/desk-agent', { method: 'POST', headers: await signedInHeaders(), body: JSON.stringify({ mode: 'tools', company: ctx.cfg.company, role: cfg.agentRole, tools: schemas, messages: msgs }) });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || out.error) throw new Error(out.error === 'not-configured' ? "The AI agent isn't available on this site." : out.error || 'The agent failed.');
        const content = (out.content ?? []) as Block[];
        msgs.push({ role: 'assistant', content });
        const text = content.filter((b): b is Extract<Block, { type: 'text' }> => b.type === 'text').map((b) => b.text).join('\n').trim();
        if (text) steps.push({ kind: 'agent', text });
        const calls = content.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
        if (!calls.length || out.stop_reason !== 'tool_use') {
          put(true, text);
          return;
        }
        const results: Block[] = [];
        for (const c of calls) {
          const t = tools.find((x) => x.name === c.name);
          const op = t && cfg.operations.find((o) => o.id === t.op);
          const step: McpStep = { kind: 'tool', tool: c.name, input: c.input };
          if (!t || !op) {
            results.push({ type: 'tool_result', tool_use_id: c.id, content: `No tool called ${c.name}.`, is_error: true });
            continue;
          }
          if (t.confirm) {
            put(false);
            const ok = await new Promise<boolean>((resolve) => setAsk({ step, resolve }));
            setAsk(null);
            step.confirmed = ok;
            if (!ok) {
              step.status = 403;
              step.result = 'Declined by the person in charge';
              steps.push(step);
              results.push({ type: 'tool_result', tool_use_id: c.id, content: 'The person in charge declined this action. Do not try it again; tell the customer what happens next.', is_error: true });
              continue;
            }
          }
          const { res: r, state: apiState } = runTool(api, ctx.latest().desk?.api, t, op, c.input ?? {});
          ctx.setWork('api', apiState);
          step.status = r.status;
          step.result = JSON.stringify(r.body).slice(0, 4000);
          steps.push(step);
          results.push({ type: 'tool_result', tool_use_id: c.id, content: `HTTP ${r.status}\n${step.result}`, ...(r.status >= 400 && { is_error: true }) });
        }
        msgs.push({ role: 'user', content: results });
        put(false);
      }
      put(true, steps.filter((s) => s.kind === 'agent').pop()?.text ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The agent failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">
      <div>
        <h1 className="text-lg font-bold">Try it on the agent</h1>
        <p className="text-slate-600">The agent ({cfg.agentRole}) gets only the tools on the left. Pick a customer request and run it: its calls go to the real API.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {cfg.scenarios.map((s) => (
          <button key={s.id} onClick={() => setPick(s.id)} className={`text-left p-2.5 rounded-lg border ${pick === s.id ? 'border-teal-600 bg-teal-50' : 'border-slate-200 hover:border-teal-300'}`} data-ref={`mcp-scenario-${s.id}`}>
            <span className="block font-semibold">{s.title}</span>
            <span className="block text-[11.5px] text-slate-500">{state.runs[s.id]?.done ? 'Tried' : 'Not tried yet'}</span>
          </button>
        ))}
      </div>
      {scenario && (
        <div className="rounded-xl border border-slate-200 p-3 space-y-3">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 mt-0.5 text-slate-500" />
            <p className="flex-1 whitespace-pre-wrap">{scenario.message}</p>
          </div>
          {!ctx.readOnly && (
            <button className={primary} disabled={busy} onClick={go} data-ref="mcp-run">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {run ? 'Run again' : 'Run'}
            </button>
          )}
        </div>
      )}
      {ask && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-3 space-y-2" role="alertdialog" aria-label="The agent needs your OK">
          <p className="font-semibold">The agent wants to use {ask.step.tool}</p>
          <pre className="font-mono text-[12px] bg-white rounded border border-amber-200 p-2 whitespace-pre-wrap">{JSON.stringify(ask.step.input, null, 2)}</pre>
          <div className="flex gap-2">
            <button className="h-8 px-3 rounded-md bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1" onClick={() => ask.resolve(true)} data-ref="mcp-approve">
              <Check className="w-3.5 h-3.5" />
              Allow
            </button>
            <button className={btn} onClick={() => ask.resolve(false)} data-ref="mcp-deny">
              <X className="w-3.5 h-3.5" />
              Don’t allow
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800" role="alert">
          {error}
        </p>
      )}
      {run && (
        <ol className="space-y-2" aria-label="What happened">
          {run.steps.slice(1).map((s, i) => (
            <li key={i} className={`rounded-lg px-3 py-2 ${s.kind === 'agent' ? 'bg-slate-50' : 'border border-slate-200 font-mono text-[11.5px]'}`}>
              {s.kind === 'agent' ? (
                <span className="flex gap-2">
                  <Bot className="w-4 h-4 mt-0.5 text-teal-700 shrink-0" />
                  <span className="whitespace-pre-wrap">{s.text}</span>
                </span>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-teal-700" />
                    <b>{s.tool}</b>({JSON.stringify(s.input)})<span className={`ml-auto px-1.5 rounded ${(s.status ?? 500) < 400 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{s.status}</span>
                  </div>
                  {s.confirmed !== undefined && <div className="text-[11px] text-amber-800">{s.confirmed ? 'You allowed it' : 'You didn’t allow it'}</div>}
                  <div className="mt-1 text-slate-500 break-words">{(s.result ?? '').slice(0, 400)}</div>
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
