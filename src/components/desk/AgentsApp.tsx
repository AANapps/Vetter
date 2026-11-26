import React, { useEffect, useRef, useState } from 'react';
import { Bot, Check, ChevronDown, Copy, Flag, Loader2, MessageSquare, Play, RotateCcw, Send, Sparkles, X } from 'lucide-react';
import { AgentRun, AgentTask, AgentTaskWork, AgentsConfig, agentLines, agentRunShowing, agentTasksNow } from '../../lib/deskApps';
import { signedInHeaders } from '../../lib/aiRequest';
import { DeskCtx, btn, primary } from './shared';

/**
 * AI agents at work, the AI-at-work layer of a job simulation. Each agent is live AI (server/deskAgent.ts): the
 * candidate hands it work with a brief in their own words, asks it questions, reads its activity and output, flags
 * lines that are wrong (and what's wrong), and approves, sends back with what to change (it does the work again) or
 * rejects. The day sets only the agent's blind spots; each run says which it fell into and where, which is what's
 * marked (src/lib/deskApps.ts agent: checks). Everything they do is kept, with when.
 */

type Work = { tasks: Record<string, AgentTaskWork>; opened?: string[] };

async function callAgent(body: Record<string, unknown>): Promise<{ run?: Omit<AgentRun, 'id' | 'agent' | 'at'>; reply?: string }> {
  const res = await fetch('/api/desk-agent', { method: 'POST', headers: await signedInHeaders(), body: JSON.stringify(body) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || out.error) throw new Error(out.error === 'not-configured' ? "The AI agents aren't available on this site." : out.error || "The agent couldn't answer. Try again.");
  return out;
}

export const AgentsApp: React.FC<{ ctx: DeskCtx; cfg: AgentsConfig }> = ({ ctx, cfg }) => {
  const work: Work = ctx.state.desk?.agents ?? { tasks: {} };
  const tasks = agentTasksNow(cfg, ctx.reached);
  const [openId, setOpenId] = useState<string | null>(tasks[0]?.id ?? null);
  const task = tasks.find((t) => t.id === openId);
  useEffect(() => {
    if (!ctx.readOnly && task && !(work.opened ?? []).includes(task.id)) ctx.setWork('agents', { ...work, opened: [...(work.opened ?? []), task.id] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);
  // Changes one task's work on the desktop as it is now (an agent's answer arrives after the state it was asked from)
  const update = (id: string, change: (w: AgentTaskWork) => AgentTaskWork, what: string) => {
    if (ctx.readOnly) return;
    const cur: Work = ctx.latest().desk?.agents ?? { tasks: {} };
    const w = cur.tasks[id] ?? {};
    ctx.setWork('agents', { ...cur, tasks: { ...cur.tasks, [id]: { ...change(w), log: [...(w.log ?? []), { what, at: Date.now() }] } } });
  };
  return (
    <div className="h-full flex text-[13px] text-slate-800 bg-white" data-ref="agents" style={{ ['--accent' as string]: '#7c3aed', ['--accent-soft' as string]: '#ede9fe' }}>
      <aside className="w-64 shrink-0 bg-slate-50 border-r border-slate-200 overflow-y-auto">
        <div className="px-3 h-11 flex items-center gap-2 font-semibold border-b border-slate-200">
          <span className="w-6 h-6 rounded-md bg-violet-600 text-white grid place-items-center">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          {cfg.name ?? 'AI agents'}
        </div>
        <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Your agents</div>
        <ul className="px-2 space-y-1">
          {cfg.agents.map((a) => (
            <li key={a.id} className="flex items-start gap-2 px-1.5 py-1.5 rounded-md">
              <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 grid place-items-center shrink-0">
                <Bot className="w-4 h-4" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold leading-tight">{a.name}</span>
                <span className="block text-[11.5px] text-slate-500 leading-snug">{a.role}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tasks</div>
        <ul className="px-2 pb-3 space-y-0.5">
          {tasks.map((t) => (
            <li key={t.id}>
              <button onClick={() => setOpenId(t.id)} className={`w-full text-left px-2 py-2 rounded-md ${openId === t.id ? 'bg-violet-100/70' : 'hover:bg-slate-100'}`} data-ref={`agent-task-${t.id}`}>
                <span className="block font-medium leading-snug">{t.title}</span>
                <span className="mt-0.5 block">
                  <Status w={work.tasks[t.id]} />
                </span>
              </button>
            </li>
          ))}
          {tasks.length === 0 && <li className="px-2 py-2 text-slate-500">No tasks yet.</li>}
        </ul>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">
        {task ? <TaskView key={task.id} ctx={ctx} cfg={cfg} t={task} w={work.tasks[task.id]} update={(c, what) => update(task.id, c, what)} /> : <p className="p-6 text-slate-500">Pick a task.</p>}
      </main>
    </div>
  );
};

const Status: React.FC<{ w?: AgentTaskWork }> = ({ w }) => {
  const run = agentRunShowing(w);
  const [label, tone] =
    w?.decision === 'approved'
      ? ['Approved', 'bg-emerald-100 text-emerald-800']
      : w?.decision === 'rejected'
        ? ['Rejected', 'bg-rose-100 text-rose-800']
        : run
          ? ['Needs review', 'bg-violet-100 text-violet-800']
          : ['Not started', 'bg-slate-200 text-slate-700'];
  const flagged = (w?.flags ?? []).filter((f) => f.run === run?.id).length;
  return (
    <span className={`inline-block px-1.5 py-px rounded text-[10.5px] font-semibold ${tone}`}>
      {label}
      {flagged > 0 && ` · ${flagged} flagged`}
    </span>
  );
};

const TaskView: React.FC<{ ctx: DeskCtx; cfg: AgentsConfig; t: AgentTask; w?: AgentTaskWork; update: (change: (w: AgentTaskWork) => AgentTaskWork, what: string) => void }> = ({ ctx, cfg, t, w, update }) => {
  const run = agentRunShowing(w);
  const agentId = w?.agent ?? t.agent ?? '';
  const agent = cfg.agents.find((a) => a.id === agentId);
  const [briefing, setBriefing] = useState(!run && !t.agent);
  const [pick, setPick] = useState(agentId || '');
  const [brief, setBrief] = useState(w?.brief ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flagging, setFlagging] = useState<string | null>(null);
  const [flagNote, setFlagNote] = useState('');
  const [deciding, setDeciding] = useState<'returned' | 'rejected' | null>(null);
  const [note, setNote] = useState('');
  const decided = w?.decision === 'approved' || w?.decision === 'rejected';
  const locked = decided || !!ctx.readOnly;

  // The work handed to the agent: the task, the files it works from (as on the computer now), the brief and notes
  const request = (who: string, briefText: string, notes: string[], previous?: AgentRun) => {
    const a = cfg.agents.find((x) => x.id === who);
    return {
      company: ctx.cfg.company,
      agent: { name: a?.name ?? who, role: a?.role ?? '' },
      task: { title: t.title, context: t.context, goal: t.goal, facts: t.facts, pitfalls: t.pitfalls.map(({ id, mistake, avoidWhen }) => ({ id, mistake, avoidWhen })), file: t.file, action: t.action },
      data: (t.data ?? []).flatMap((name) => ctx.files.filter((f) => f.name.toLowerCase() === name.toLowerCase()).map((f) => ({ name: f.name, content: f.content }))),
      brief: briefText,
      notes,
      ...(previous && { previous: { steps: previous.steps, output: previous.output } }),
    };
  };
  const doRun = async (who: string, briefText: string, notes: string[], what: string, opts: { previous?: AgentRun; allSlips?: boolean } = {}) => {
    if (ctx.readOnly) return;
    setBusy(true);
    setError('');
    try {
      const out = await callAgent({ mode: 'run', ...request(who, briefText, notes, opts.previous), ...(opts.allSlips && { allSlips: true }) });
      if (!out.run) throw new Error("The agent couldn't answer. Try again.");
      const r: AgentRun = { ...out.run, id: `r${Date.now().toString(36)}`, agent: who, at: Date.now() };
      update((cur) => ({ ...cur, agent: who, brief: briefText, notes, runs: [...(cur.runs ?? []), r], decision: undefined }), what);
      setBriefing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The agent couldn't answer. Try again.");
    } finally {
      setBusy(false);
    }
  };
  // Work a colleague already handed out: the agent does it when the task is first opened
  const started = useRef(false);
  useEffect(() => {
    if (t.agent && t.brief && !run && !started.current && !ctx.readOnly) {
      started.current = true;
      doRun(t.agent, t.brief, [], `${agent?.name ?? t.agent} did the work it was given`, { allSlips: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flags = (w?.flags ?? []).filter((f) => f.run === run?.id);
  const flagOf = (key: string) => flags.find((f) => f.line === key);
  const saveFlag = (key: string, text: string) => {
    if (!run) return;
    update((cur) => ({ ...cur, flags: [...(cur.flags ?? []).filter((f) => !(f.run === run.id && f.line === key)), { line: key, run: run.id, text, note: flagNote.trim(), at: Date.now() }] }), `Flagged: “${text}”${flagNote.trim() ? ` (${flagNote.trim()})` : ''}`);
    setFlagging(null);
    setFlagNote('');
  };
  const unflag = (key: string, text: string) => run && update((cur) => ({ ...cur, flags: (cur.flags ?? []).filter((f) => !(f.run === run.id && f.line === key)) }), `Removed the flag on “${text}”`);
  const approve = () => {
    if (!run) return;
    update((cur) => ({ ...cur, decision: 'approved', approved: run.slips.length ? 'flawed' : 'clean', note: '' }), `Approved${t.action ? `: ${t.action}` : ''}`);
    if (run.file) ctx.saveFile(run.file, `${run.file.name} saved to Files`);
    else ctx.toast('Approved');
  };
  const decide = () => {
    if (!deciding || !note.trim() || !run) return;
    const text = note.trim();
    if (deciding === 'rejected') update((cur) => ({ ...cur, decision: 'rejected', note: text }), `Rejected: ${text}`);
    else {
      // Sent back: the agent does it again with what they said
      const notes = [...(w?.notes ?? []), text];
      update((cur) => ({ ...cur, decision: 'returned', note: text, notes }), `Sent back: ${text}`);
      doRun(agentId, w?.brief || t.brief || '', notes, `${agent?.name ?? agentId} did it again`, { previous: run });
    }
    setDeciding(null);
    setNote('');
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-5 space-y-4">
      <header>
        <h1 className="text-lg font-bold text-slate-900">{t.title}</h1>
        {t.context && <p className="mt-1 text-slate-600 whitespace-pre-wrap">{t.context}</p>}
        {agent && !briefing && (
          <p className="mt-2 text-[12px] text-slate-500 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-violet-600" />
            {agent.name} · {agent.role}
          </p>
        )}
        {!briefing && (w?.brief || t.brief) && (
          <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-[12.5px]">
            <span className="font-semibold text-slate-500">Brief: </span>
            {w?.brief || t.brief}
            {(w?.notes ?? []).map((n, i) => (
              <p key={i} className="mt-1 text-slate-600">
                <span className="font-semibold text-slate-500">Then: </span>
                {n}
              </p>
            ))}
          </div>
        )}
      </header>

      {briefing && !ctx.readOnly && (
        <section className="rounded-xl border border-violet-200 bg-violet-50/40 p-4 space-y-3" aria-label="Brief an agent">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">Give it to</span>
            {cfg.agents.map((a) => (
              <button key={a.id} onClick={() => setPick(a.id)} className={`h-8 px-3 rounded-full border text-[12.5px] font-medium ${pick === a.id ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-300 bg-white hover:border-violet-400'}`} data-ref={`agent-pick-${a.id}`}>
                {a.name}
              </button>
            ))}
          </div>
          <label className="block">
            <span className="block font-semibold mb-1">Your brief</span>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={4}
              placeholder="What to do, with what data, what to watch out for and what to hand back"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              data-ref="agent-brief"
            />
          </label>
          <div className="flex items-center gap-2">
            <button className={primary} disabled={!pick || !brief.trim() || busy} onClick={() => doRun(pick, brief.trim(), [], `Gave it to ${cfg.agents.find((a) => a.id === pick)?.name ?? pick} with the brief: ${brief.trim()}`)} data-ref="agent-run">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {busy ? 'Working…' : 'Run'}
            </button>
            {run && !busy && (
              <button className={btn} onClick={() => setBriefing(false)}>
                Cancel
              </button>
            )}
          </div>
        </section>
      )}

      {busy && !briefing && (
        <p className="flex items-center gap-2 text-violet-700 font-medium" role="status">
          <Loader2 className="w-4 h-4 animate-spin" />
          {agent?.name ?? 'The agent'} is working…
        </p>
      )}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-800 flex items-center justify-between gap-3" role="alert">
          {error}
          {t.agent && t.brief && !run && (
            <button className={btn} onClick={() => doRun(t.agent!, t.brief!, [], `${agent?.name ?? t.agent} did the work it was given`, { allSlips: true })}>
              Try again
            </button>
          )}
        </div>
      )}
      {ctx.readOnly && !run && <p className="text-slate-500">{briefing ? 'They didn’t hand this to an agent.' : 'They didn’t open this task.'}</p>}

      {run && !briefing && (
        <>
          {(w?.runs?.length ?? 0) > 1 && <Earlier runs={w!.runs!.slice(0, -1)} />}
          <p className="text-[12px] text-slate-500">Click any line that's wrong to flag it and say what's wrong.</p>
          {run.steps.length > 0 && (
            <section aria-label="What the agent did">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Activity</h2>
              <ol className="rounded-lg border border-slate-200 divide-y divide-slate-100 font-mono text-[12px]">
                {agentLines(run)
                  .filter((l) => l.key.startsWith('s:'))
                  .map((l, i) => (
                    <Line key={l.key} n={i + 1} text={l.text} flag={flagOf(l.key)} open={flagging === l.key} locked={locked} onOpen={() => (setFlagging(l.key), setFlagNote(flagOf(l.key)?.note ?? ''))} onClose={() => setFlagging(null)} note={flagNote} onNote={setFlagNote} onSave={() => saveFlag(l.key, l.text)} onRemove={() => unflag(l.key, l.text)} />
                  ))}
              </ol>
            </section>
          )}
          <section aria-label="What the agent handed back">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Output{run.file ? ` · ${run.file.name}` : ''}</h2>
              <button
                className={btn}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(run.output);
                    ctx.toast('Output copied');
                  } catch {
                    ctx.toast('Copy was blocked: select the text and press Ctrl+C.');
                  }
                }}
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
            <ol className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-[13px]">
              {agentLines(run)
                .filter((l) => l.key.startsWith('o:'))
                .map((l) => (
                  <Line key={l.key} text={l.text} flag={flagOf(l.key)} open={flagging === l.key} locked={locked} onOpen={() => (setFlagging(l.key), setFlagNote(flagOf(l.key)?.note ?? ''))} onClose={() => setFlagging(null)} note={flagNote} onNote={setFlagNote} onSave={() => saveFlag(l.key, l.text)} onRemove={() => unflag(l.key, l.text)} />
                ))}
            </ol>
          </section>

          {!ctx.readOnly && (
            <Decision
              action={t.action}
              w={w}
              decided={decided}
              busy={busy}
              deciding={deciding}
              setDeciding={setDeciding}
              note={note}
              setNote={setNote}
              onApprove={approve}
              onDecide={decide}
              onBrief={() => (setBriefing(true), setPick(agentId), setBrief(w?.brief || t.brief || ''))}
            />
          )}
          {ctx.readOnly && w?.decision && (
            <p className="text-slate-700">
              <span className="font-semibold">{w.decision === 'approved' ? `Approved (${w.approved === 'clean' ? 'clean work' : 'with mistakes in it'})` : w.decision === 'rejected' ? 'Rejected' : 'Sent back'}</span>
              {w.note && `: ${w.note}`}
            </p>
          )}
        </>
      )}

      {agent && (run || (w?.chat?.length ?? 0) > 0) && <Ask ctx={ctx} agentName={agent.name} w={w} request={() => request(agentId, w?.brief || t.brief || '', w?.notes ?? [])} update={update} />}
    </div>
  );
};

// Earlier attempts, folded away
const Earlier: React.FC<{ runs: AgentRun[] }> = ({ runs }) => {
  const [open, setOpen] = useState(false);
  return (
    <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <summary className="cursor-pointer text-[12px] font-semibold text-slate-600 flex items-center gap-1">
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? '' : '-rotate-90'}`} />
        Earlier attempts ({runs.length})
      </summary>
      {runs.map((r, i) => (
        <div key={r.id} className="mt-2 text-[12px] text-slate-600 whitespace-pre-wrap border-t border-slate-200 pt-2">
          <span className="font-semibold">Attempt {i + 1}: </span>
          {r.output}
        </div>
      ))}
    </details>
  );
};

// Questions for the agent, answered live
const Ask: React.FC<{ ctx: DeskCtx; agentName: string; w?: AgentTaskWork; request: () => Record<string, unknown>; update: (change: (w: AgentTaskWork) => AgentTaskWork, what: string) => void }> = ({ ctx, agentName, w, request, update }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const chat = w?.chat ?? [];
  const send = async () => {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...chat, { role: 'user' as const, text: q }];
    update((cur) => ({ ...cur, chat: next }), `Asked ${agentName}: ${q}`);
    setText('');
    setBusy(true);
    setError('');
    try {
      const out = await callAgent({ mode: 'ask', ...request(), messages: next });
      update((cur) => ({ ...cur, chat: [...(cur.chat ?? []), { role: 'assistant', text: out.reply ?? '' }] }), `${agentName} answered`);
    } catch (err) {
      update((cur) => ({ ...cur, chat: (cur.chat ?? []).slice(0, -1) }), 'Question not answered');
      setText(q);
      setError(err instanceof Error ? err.message : "The agent couldn't answer. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="rounded-xl border border-slate-200 p-3 space-y-2" aria-label={`Ask ${agentName}`}>
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5" />
        Ask {agentName}
      </h2>
      {chat.length > 0 && (
        <ul className="space-y-1.5">
          {chat.map((m, i) => (
            <li key={i} className={`rounded-lg px-3 py-1.5 whitespace-pre-wrap ${m.role === 'user' ? 'bg-violet-50 ml-10' : 'bg-slate-50 mr-10'}`}>
              {m.text}
            </li>
          ))}
        </ul>
      )}
      {busy && (
        <p className="flex items-center gap-1.5 text-slate-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {agentName} is typing…
        </p>
      )}
      {error && <p className="text-rose-700">{error}</p>}
      {!ctx.readOnly && (
        <div className="flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={`Ask ${agentName} about this work`} className="flex-1 h-8 px-2.5 rounded-md border border-slate-300 focus:outline-none focus:border-violet-500" data-ref="agent-ask" />
          <button className={primary} disabled={!text.trim() || busy} onClick={send} aria-label="Send">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </section>
  );
};

// One line of a run: click to flag it, with what's wrong
const Line: React.FC<{
  n?: number;
  text: string;
  flag?: { note: string };
  open: boolean;
  locked: boolean;
  onOpen: () => void;
  onClose: () => void;
  note: string;
  onNote: (v: string) => void;
  onSave: () => void;
  onRemove: () => void;
}> = ({ n, text, flag, open, locked, onOpen, onClose, note, onNote, onSave, onRemove }) => (
  <li className={flag ? 'bg-amber-50' : ''}>
    <button disabled={locked} onClick={open ? onClose : onOpen} className={`w-full text-left px-3 py-1.5 flex gap-2 ${locked ? '' : 'hover:bg-violet-50/60'} disabled:cursor-default`} data-ref="agent-line">
      {n !== undefined && <span className="text-slate-400 tabular-nums w-5 shrink-0">{n}</span>}
      <span className="flex-1 min-w-0 whitespace-pre-wrap break-words">{text}</span>
      {flag && <Flag className="w-3.5 h-3.5 mt-0.5 text-amber-600 shrink-0" aria-label="Flagged" />}
    </button>
    {flag && !open && flag.note && <p className="px-3 pb-1.5 pl-10 text-[11.5px] text-amber-800 font-sans">{flag.note}</p>}
    {open && (
      <div className="px-3 pb-2 pl-10 flex flex-wrap items-center gap-2 font-sans">
        <input autoFocus value={note} onChange={(e) => onNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSave()} placeholder="What's wrong?" className="flex-1 min-w-[12rem] h-8 px-2.5 rounded-md border border-amber-300 text-[12.5px] focus:outline-none focus:ring-2 focus:ring-amber-100" data-ref="agent-flag-note" />
        <button className="h-8 px-3 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold inline-flex items-center gap-1" onClick={onSave} data-ref="agent-flag">
          <Flag className="w-3.5 h-3.5" />
          {flag ? 'Update flag' : 'Flag'}
        </button>
        {flag && (
          <button className={btn} onClick={onRemove}>
            Remove flag
          </button>
        )}
      </div>
    )}
  </li>
);

const Decision: React.FC<{
  action?: string;
  w?: AgentTaskWork;
  decided: boolean;
  busy: boolean;
  deciding: 'returned' | 'rejected' | null;
  setDeciding: (d: 'returned' | 'rejected' | null) => void;
  note: string;
  setNote: (v: string) => void;
  onApprove: () => void;
  onDecide: () => void;
  onBrief: () => void;
}> = ({ action, w, decided, busy, deciding, setDeciding, note, setNote, onApprove, onDecide, onBrief }) => {
  if (decided)
    return (
      <div className={`rounded-lg border px-3 py-2.5 ${w?.decision === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
        <p className="font-semibold">{w?.decision === 'approved' ? `Approved${action ? `: ${action}` : ''}` : 'Rejected'}</p>
        {w?.note && <p className="text-slate-700 mt-0.5">{w.note}</p>}
      </div>
    );
  return (
    <section className="rounded-xl border border-slate-200 p-3 space-y-2.5" aria-label="Your decision">
      {action && (
        <p className="text-[12.5px] text-slate-600">
          Approving will: <span className="font-semibold text-slate-800">{action}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} className="h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40" onClick={onApprove} data-ref="agent-approve">
          <Check className="w-3.5 h-3.5" />
          Approve
        </button>
        <button disabled={busy} className={btn} onClick={() => setDeciding(deciding === 'returned' ? null : 'returned')} data-ref="agent-return">
          <RotateCcw className="w-3.5 h-3.5" />
          Send back
        </button>
        <button disabled={busy} className={btn} onClick={() => setDeciding(deciding === 'rejected' ? null : 'rejected')} data-ref="agent-reject">
          <X className="w-3.5 h-3.5" />
          Reject
        </button>
        <button disabled={busy} className={btn} onClick={onBrief}>
          <Play className="w-3.5 h-3.5" />
          Brief again
        </button>
      </div>
      {deciding && (
        <div className="space-y-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={deciding === 'returned' ? 'What it must change (it will do the work again)' : 'Why not'} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-violet-500" data-ref="agent-note" />
          <button className={primary} disabled={!note.trim()} onClick={onDecide} data-ref="agent-decide">
            {deciding === 'returned' ? 'Send back' : 'Reject'}
          </button>
        </div>
      )}
    </section>
  );
};
