import React, { useEffect, useState } from 'react';
import { Bot, Check, Copy, Flag, Loader2, Play, RotateCcw, Sparkles, X } from 'lucide-react';
import { AgentRun, AgentTask, AgentTaskWork, AgentsConfig, agentLines, agentRunFor, agentRunShowing, agentTasksNow } from '../../lib/deskApps';
import { DeskCtx, btn, primary } from './shared';

// How long an agent "works" before its run shows, so a run feels like one
const RUN_MS = 1400;

/**
 * AI agents at work, the AI-at-work layer of a job simulation: the candidate hands work to an agent with a brief, reads
 * its activity and output, flags lines that are wrong (what's wrong with each), and approves, sends back or rejects.
 * Scripted (src/lib/deskApps.ts AgentsConfig): what comes back depends on the brief, and each run has planted mistakes.
 * Everything they do is kept, with when, for the company's view of how they worked (agent: checks).
 */
export const AgentsApp: React.FC<{ ctx: DeskCtx; cfg: AgentsConfig }> = ({ ctx, cfg }) => {
  const work = ctx.state.desk?.agents ?? { tasks: {} };
  const tasks = agentTasksNow(cfg, ctx.reached);
  const [openId, setOpenId] = useState<string | null>(tasks[0]?.id ?? null);
  const task = tasks.find((t) => t.id === openId);
  useEffect(() => {
    if (task && !(work.opened ?? []).includes(task.id)) ctx.setWork('agents', { ...work, opened: [...(work.opened ?? []), task.id] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);
  const update = (id: string, change: (w: AgentTaskWork) => AgentTaskWork, what: string) => {
    const cur = ctx.state.desk?.agents ?? { tasks: {} };
    const w = cur.tasks[id] ?? {};
    const next = change(w);
    ctx.setWork('agents', { ...cur, tasks: { ...cur.tasks, [id]: { ...next, log: [...(w.log ?? []), { what, at: Date.now() }] } } });
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
          {tasks.map((t) => {
            const w = work.tasks[t.id];
            return (
              <li key={t.id}>
                <button
                  onClick={() => setOpenId(t.id)}
                  className={`w-full text-left px-2 py-2 rounded-md ${openId === t.id ? 'bg-violet-100/70' : 'hover:bg-slate-100'}`}
                  data-ref={`agent-task-${t.id}`}
                >
                  <span className="block font-medium leading-snug">{t.title}</span>
                  <span className="mt-0.5 block">
                    <Status t={t} w={w} />
                  </span>
                </button>
              </li>
            );
          })}
          {tasks.length === 0 && <li className="px-2 py-2 text-slate-500">No tasks yet.</li>}
        </ul>
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto">{task ? <TaskView key={task.id} ctx={ctx} cfg={cfg} t={task} w={work.tasks[task.id]} update={(c, what) => update(task.id, c, what)} /> : <p className="p-6 text-slate-500">Pick a task.</p>}</main>
    </div>
  );
};

const Status: React.FC<{ t: AgentTask; w?: AgentTaskWork }> = ({ t, w }) => {
  const run = agentRunShowing(t, w);
  const [label, tone] =
    w?.decision === 'approved'
      ? ['Approved', 'bg-emerald-100 text-emerald-800']
      : w?.decision === 'rejected'
        ? ['Rejected', 'bg-rose-100 text-rose-800']
        : w?.decision === 'returned'
          ? ['Sent back', 'bg-amber-100 text-amber-800']
          : run
            ? ['Needs review', 'bg-violet-100 text-violet-800']
            : ['Not started', 'bg-slate-200 text-slate-700'];
  return <span className={`inline-block px-1.5 py-px rounded text-[10.5px] font-semibold ${tone}`}>{label}{(w?.flags?.length ?? 0) > 0 && ` · ${w!.flags!.length} flagged`}</span>;
};

const TaskView: React.FC<{ ctx: DeskCtx; cfg: AgentsConfig; t: AgentTask; w?: AgentTaskWork; update: (change: (w: AgentTaskWork) => AgentTaskWork, what: string) => void }> = ({ ctx, cfg, t, w, update }) => {
  const run = agentRunShowing(t, w);
  const agentId = w?.agent ?? t.agent ?? '';
  const agent = cfg.agents.find((a) => a.id === agentId);
  // Briefing: a task not handed out yet, or one sent back to brief again
  const [briefing, setBriefing] = useState(!run);
  const [pick, setPick] = useState(agentId || '');
  const [brief, setBrief] = useState(w?.brief ?? '');
  const [busy, setBusy] = useState(false);
  const [flagging, setFlagging] = useState<string | null>(null);
  const [flagNote, setFlagNote] = useState('');
  const [deciding, setDeciding] = useState<'returned' | 'rejected' | null>(null);
  const [note, setNote] = useState('');
  const decided = w?.decision === 'approved' || w?.decision === 'rejected';

  const start = () => {
    if (!pick || !brief.trim()) return;
    setBusy(true);
    setTimeout(() => {
      const r = agentRunFor(t, brief);
      update((cur) => ({ ...cur, agent: pick, brief: brief.trim(), runs: [...(cur.runs ?? []), r.id], decision: undefined, note: cur.note }), `Gave it to ${cfg.agents.find((a) => a.id === pick)?.name ?? pick} with the brief: ${brief.trim()}`);
      setBusy(false);
      setBriefing(false);
    }, RUN_MS);
  };
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
    update((cur) => ({ ...cur, decision: 'approved', approved: run.id, note: '' }), `Approved${run.action ? `: ${run.action}` : ''}`);
    if (run.file) ctx.saveFile(run.file, `${run.file.name} saved to Files`);
    else ctx.toast('Approved');
  };
  const decide = () => {
    if (!deciding || !note.trim()) return;
    update((cur) => ({ ...cur, decision: deciding, note: note.trim() }), `${deciding === 'returned' ? 'Sent back' : 'Rejected'}: ${note.trim()}`);
    if (deciding === 'returned') {
      setBriefing(true);
      setPick(agentId);
      setBrief(w?.brief || t.brief || '');
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
          </div>
        )}
      </header>

      {briefing && (
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
            <button className={primary} disabled={!pick || !brief.trim() || busy} onClick={start} data-ref="agent-run">
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

      {run && !briefing && (
        <>
          <p className="text-[12px] text-slate-500">Click any line that's wrong to flag it and say what's wrong. Flags go with your decision.</p>
          {(run.steps?.length ?? 0) > 0 && (
            <section aria-label="What the agent did">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Activity</h2>
              <ol className="rounded-lg border border-slate-200 divide-y divide-slate-100 font-mono text-[12px]">
                {agentLines(run)
                  .filter((l) => l.key.startsWith('s:'))
                  .map((l, i) => (
                    <Line key={l.key} n={i + 1} text={l.text} flag={flagOf(l.key)} open={flagging === l.key} locked={decided} onOpen={() => (setFlagging(l.key), setFlagNote(flagOf(l.key)?.note ?? ''))} onClose={() => setFlagging(null)} note={flagNote} onNote={setFlagNote} onSave={() => saveFlag(l.key, l.text)} onRemove={() => unflag(l.key, l.text)} />
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
                  <Line key={l.key} text={l.text} flag={flagOf(l.key)} open={flagging === l.key} locked={decided} onOpen={() => (setFlagging(l.key), setFlagNote(flagOf(l.key)?.note ?? ''))} onClose={() => setFlagging(null)} note={flagNote} onNote={setFlagNote} onSave={() => saveFlag(l.key, l.text)} onRemove={() => unflag(l.key, l.text)} />
                ))}
            </ol>
          </section>

          <Decision run={run} w={w} decided={decided} deciding={deciding} setDeciding={setDeciding} note={note} setNote={setNote} onApprove={approve} onDecide={decide} onBrief={() => (setBriefing(true), setPick(agentId), setBrief(w?.brief || t.brief || ''))} />
        </>
      )}
    </div>
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
  run: AgentRun;
  w?: AgentTaskWork;
  decided: boolean;
  deciding: 'returned' | 'rejected' | null;
  setDeciding: (d: 'returned' | 'rejected' | null) => void;
  note: string;
  setNote: (v: string) => void;
  onApprove: () => void;
  onDecide: () => void;
  onBrief: () => void;
}> = ({ run, w, decided, deciding, setDeciding, note, setNote, onApprove, onDecide, onBrief }) => {
  if (decided)
    return (
      <div className={`rounded-lg border px-3 py-2.5 ${w?.decision === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
        <p className="font-semibold">{w?.decision === 'approved' ? `Approved${run.action ? `: ${run.action}` : ''}` : 'Rejected'}</p>
        {w?.note && <p className="text-slate-700 mt-0.5">{w.note}</p>}
      </div>
    );
  return (
    <section className="rounded-xl border border-slate-200 p-3 space-y-2.5" aria-label="Your decision">
      {run.action && <p className="text-[12.5px] text-slate-600">Approving will: <span className="font-semibold text-slate-800">{run.action}</span></p>}
      {w?.decision === 'returned' && w.note && <p className="text-[12.5px] text-amber-800">You sent it back: {w.note}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="h-8 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5" onClick={onApprove} data-ref="agent-approve">
          <Check className="w-3.5 h-3.5" />
          Approve
        </button>
        <button className={btn} onClick={() => setDeciding(deciding === 'returned' ? null : 'returned')} data-ref="agent-return">
          <RotateCcw className="w-3.5 h-3.5" />
          Send back
        </button>
        <button className={btn} onClick={() => setDeciding(deciding === 'rejected' ? null : 'rejected')} data-ref="agent-reject">
          <X className="w-3.5 h-3.5" />
          Reject
        </button>
        <button className={btn} onClick={onBrief}>
          <Play className="w-3.5 h-3.5" />
          Brief again
        </button>
      </div>
      {deciding && (
        <div className="space-y-2">
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={deciding === 'returned' ? 'What it must change' : 'Why not'} className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-violet-500" data-ref="agent-note" />
          <button className={primary} disabled={!note.trim()} onClick={onDecide} data-ref="agent-decide">
            {deciding === 'returned' ? 'Send back' : 'Reject'}
          </button>
        </div>
      )}
    </section>
  );
};

