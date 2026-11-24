import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AtSign, FileText, Hash, Paperclip, Send, X } from 'lucide-react';
import { ChatConfig, ChatPost, chatChannels, chatRepliesFor } from '../../lib/deskApps';
import { gridFromClipboard, gridToText } from '../../lib/deskData';
import { Avatar, DeskCtx, personName } from './shared';

const REPLY_DELAY_MS = 2500;

// Slack/Teams: channels and direct messages. Colleagues answer by the day's rules, and files shared in chat land in Files
export const ChatApp: React.FC<{ ctx: DeskCtx; cfg: ChatConfig }> = ({ ctx, cfg }) => {
  const work = ctx.state.desk?.chat ?? { posts: [], received: [] };
  const workRef = useRef(work);
  workRef.current = work;
  const channels = useMemo(() => chatChannels(cfg, work, ctx.me.email, ctx.reached), [cfg, work, ctx]);
  const [at, setAt] = useState(channels[0]?.id ?? '');
  const ch = channels.find((c) => c.id === at) ?? channels[0];
  const [text, setText] = useState('');
  const [attach, setAttach] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [ch?.all.length, at]);
  // Unread: messages since the channel was last opened
  const seen = work.read ?? [];
  const unread = (c: (typeof channels)[number]) => c.all.filter((m) => !m.mine && !seen.includes(m.id)).length;
  useEffect(() => {
    if (!ch) return;
    const ids = ch.all.filter((m) => !m.mine && !seen.includes(m.id)).map((m) => m.id);
    if (ids.length) ctx.setWork('chat', { ...workRef.current, read: [...(workRef.current.read ?? []), ...ids] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, ch?.all.length]);

  const post = () => {
    if (!ch || (!text.trim() && !attach.length)) return;
    const p: ChatPost = { channel: ch.id, text: text.trim(), attachments: attach, at: Date.now() };
    const coming = chatRepliesFor(cfg, workRef.current.received, p);
    ctx.setWork('chat', { ...workRef.current, posts: [...workRef.current.posts, p] });
    setText('');
    setAttach([]);
    if (coming.length) {
      const rule = cfg.replies!.find((r) => r.id === coming[0].split('#')[0])!;
      setTyping(personName(ctx.cfg, (coming[0].includes('#') ? rule.otherwise : rule.reply)?.from ?? ''));
      setTimeout(() => {
        setTyping(null);
        const now = Date.now();
        ctx.setWork('chat', { ...workRef.current, received: [...workRef.current.received, ...coming.map((c) => `${c}@${now}`)] });
        if (workRef.current && at !== ch.id) ctx.toast(`New message in ${ch.name}`);
      }, REPLY_DELAY_MS);
    }
  };

  if (!ch) return <div className="p-6 text-xs text-slate-500">No channels.</div>;
  const rows = ch.all;
  return (
    <div className="h-full flex text-[13px]" data-ref="chat">
      <aside className="w-56 shrink-0 bg-[#3f0e40] text-white/80 flex flex-col">
        <div className="px-4 h-11 flex items-center font-bold text-white border-b border-white/10">{ctx.cfg.company}</div>
        <div className="flex-1 overflow-y-auto py-2">
          {(['channel', 'dm'] as const).map((kind) => (
            <div key={kind} className="mb-3">
              <div className="px-4 py-1 text-[11px] uppercase tracking-wider text-white/50">{kind === 'channel' ? 'Channels' : 'Direct messages'}</div>
              {channels
                .filter((c) => c.kind === kind)
                .map((c) => {
                  const n = unread(c);
                  return (
                    <button key={c.id} onClick={() => setAt(c.id)} className={`w-full h-7 px-4 flex items-center gap-1.5 text-left ${c.id === ch.id ? 'bg-[#1164a3] text-white' : 'hover:bg-white/10'} ${n ? 'font-bold text-white' : ''}`} data-ref={`chat-${c.id}`}>
                      {kind === 'channel' ? <Hash className="w-3.5 h-3.5 opacity-70" /> : <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                      <span className="truncate">{c.name.replace(/^#/, '')}</span>
                      {n > 0 && <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] grid place-items-center">{n}</span>}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </aside>
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="h-11 shrink-0 px-4 flex items-center gap-2 border-b border-slate-200">
          <span className="font-bold text-slate-900">{ch.kind === 'channel' ? `#${ch.name.replace(/^#/, '')}` : ch.name}</span>
          {ch.topic && <span className="text-xs text-slate-500 truncate">{ch.topic}</span>}
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 select-text">
          {rows.map((m) => {
            const who = m.mine ? ctx.me.name : personName(ctx.cfg, m.from);
            return (
              <div key={m.id} className="flex gap-2.5">
                <Avatar name={who} size={32} />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-900">{who}</span>
                    <span className="text-[11px] text-slate-400">{m.mine || m.at ? 'Just now' : m.time ?? ''}</span>
                  </div>
                  {m.text && <MessageText text={m.text} />}
                  {(m.attachments ?? []).map((a) => (
                    <button key={a.name} onClick={() => ctx.openFile(a.name)} className="mt-1 h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {typing && <div className="text-xs text-slate-400 italic">{typing} is typing…</div>}
          <div ref={end} />
        </div>
        <div className="p-3 shrink-0">
          <div className="border border-slate-300 rounded-lg focus-within:border-slate-500">
            {attach.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-2 pt-2">
                {attach.map((a) => (
                  <span key={a} className="h-7 pl-2 pr-1 rounded bg-slate-100 text-xs flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {a}
                    <button onClick={() => setAttach(attach.filter((x) => x !== a))} aria-label={`Remove ${a}`} className="w-5 h-5 grid place-items-center rounded hover:bg-slate-200">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  post();
                }
              }}
              onPaste={(e) => {
                // A table pasted from a spreadsheet or a page comes in lined up, as chat apps show it
                const g = gridFromClipboard(e.clipboardData.getData('text/plain'), e.clipboardData.getData('text/html'));
                if (g && e.clipboardData.getData('text/plain').includes('\t')) {
                  e.preventDefault();
                  setText((t) => (t ? t + '\n' : '') + '```\n' + gridToText(g) + '\n```');
                }
              }}
              rows={2}
              placeholder={`Message ${ch.kind === 'channel' ? `#${ch.name.replace(/^#/, '')}` : ch.name}`}
              className="w-full px-3 pt-2 text-[13px] outline-none resize-none bg-transparent"
              data-ref="chat-input"
            />
            <div className="flex items-center gap-1 px-2 pb-2">
              <div className="relative">
                <button onClick={() => setPicking((v) => !v)} aria-label="Share a file" title="Share a file from Files" className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100 text-slate-500">
                  <Paperclip className="w-4 h-4" />
                </button>
                {picking && (
                  <div className="absolute bottom-8 left-0 z-10 w-64 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg">
                    {ctx.files.length === 0 && <p className="p-3 text-xs text-slate-400">No files yet.</p>}
                    {ctx.files.map((f) => (
                      <button key={f.name} onClick={() => (setAttach((a) => (a.includes(f.name) ? a : [...a, f.name])), setPicking(false))} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 truncate">
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setText((t) => `${t}@`)}
                aria-label="Mention someone"
                title="Mention someone"
                className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100 text-slate-500"
              >
                <AtSign className="w-4 h-4" />
              </button>
              <button onClick={post} disabled={!text.trim() && !attach.length} aria-label="Send" className="ml-auto w-8 h-7 grid place-items-center rounded bg-emerald-700 text-white disabled:bg-slate-200 disabled:text-slate-400" data-ref="chat-send">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

// A message's text, with ``` blocks (a pasted table, code) in a fixed-width font as Slack shows them
const MessageText: React.FC<{ text: string }> = ({ text }) => (
  <div className="leading-relaxed text-slate-800">
    {text.split(/```\n?([\s\S]*?)\n?```/).map((part, i) =>
      i % 2 ? (
        <pre key={i} className="my-1 px-2 py-1.5 rounded bg-slate-50 border border-slate-200 font-mono text-[12px] overflow-x-auto">
          {part}
        </pre>
      ) : part ? (
        <span key={i} className="whitespace-pre-wrap">
          {part}
        </span>
      ) : null
    )}
  </div>
);
