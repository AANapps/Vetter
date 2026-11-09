import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Bot, Download, FileText, Inbox, Lock, Paperclip, X } from 'lucide-react';
import { CaseFile, EmailMessage } from '../types';
import { parseAddress } from '../lib/emailTasks';

/**
 * The candidate's workspace around a job simulation, like a real desk: the task, an Inbox of the emails waiting for
 * them, the Files they've been given and, on the questions the company allows it, an AI assistant. Each opens as a
 * tab over the task, which stays as it was underneath.
 */

export type WorkspaceView = 'task' | 'inbox' | 'files' | 'ai';
export interface InboxItem {
  message: EmailMessage;
  // Where the reply is written, for a thread that is itself a question
  replyIn?: string;
}
export type AiTurn = { role: 'user' | 'assistant'; text: string };

const MAX_AI_MESSAGES = 15;

export const WorkspaceTabs: React.FC<{
  view: WorkspaceView;
  onView: (v: WorkspaceView) => void;
  taskLabel: string;
  inboxCount: number;
  unread: number;
  fileCount: number;
  // Whether the test lets candidates use AI anywhere, and on the question open now
  aiInTest: boolean;
  aiHere: boolean;
}> = ({ view, onView, taskLabel, inboxCount, unread, fileCount, aiInTest, aiHere }) => {
  const tab = (id: WorkspaceView, label: React.ReactNode, opts: { disabled?: boolean; title?: string } = {}) => (
    <button
      key={id}
      role="tab"
      aria-selected={view === id}
      disabled={opts.disabled}
      title={opts.title}
      onClick={() => onView(id)}
      className={`h-9 px-4 -mb-px text-xs font-semibold inline-flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
        view === id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-900'
      } disabled:text-slate-300 disabled:cursor-not-allowed`}
    >
      {label}
    </button>
  );
  return (
    <div role="tablist" aria-label="Workspace" className="h-9 px-4 flex items-end gap-1 bg-slate-100 border-b border-slate-200 shrink-0 overflow-x-auto">
      {tab('task', taskLabel)}
      {inboxCount > 0 &&
        tab(
          'inbox',
          <>
            <Inbox className="w-3.5 h-3.5" />
            Inbox {unread > 0 && <span className="px-1.5 rounded-full bg-indigo-600 text-white text-[10px]">{unread}</span>}
          </>
        )}
      {fileCount > 0 &&
        tab(
          'files',
          <>
            <Paperclip className="w-3.5 h-3.5" />
            Files ({fileCount})
          </>
        )}
      {aiInTest &&
        tab(
          'ai',
          <>
            {aiHere ? <Bot className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            AI assistant
          </>,
          { disabled: !aiHere, title: aiHere ? 'The company allows AI on this question' : 'The company doesn’t allow AI on this question' }
        )}
    </div>
  );
};

const nameOf = (raw: string) => {
  const { name, email } = parseAddress(raw);
  return name || email;
};

// A read-only mail client: the list on the left, the open email on the right
export const InboxPanel: React.FC<{ items: InboxItem[]; read: Set<number>; onRead: (i: number) => void }> = ({ items, read, onRead }) => {
  const [open, setOpen] = useState(0);
  useEffect(() => onRead(open), [open]);
  const m = items[open]?.message;
  return (
    <div className="h-full flex bg-white">
      <ul className="w-72 shrink-0 border-r border-slate-200 overflow-y-auto divide-y divide-slate-100">
        {items.map((it, i) => (
          <li key={i}>
            <button onClick={() => setOpen(i)} className={`w-full text-left px-4 py-3 ${open === i ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm truncate ${read.has(i) ? 'text-slate-700' : 'font-bold text-slate-900'}`}>{nameOf(it.message.from)}</span>
                <span className="text-[11px] text-slate-400 shrink-0">{it.message.date}</span>
              </div>
              <div className={`text-xs truncate ${read.has(i) ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>{it.message.subject}</div>
              <div className="text-xs text-slate-400 truncate">{it.message.body.slice(0, 80)}</div>
              {it.replyIn && <div className="mt-1 text-[10px] font-semibold text-indigo-700">Reply in {it.replyIn}</div>}
            </button>
          </li>
        ))}
      </ul>
      {m ? (
        <article className="flex-1 min-w-0 overflow-y-auto px-8 py-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">{m.subject}</h2>
          <div className="text-xs text-slate-600 space-y-0.5">
            <div>
              <span className="text-slate-400">From</span> <span className="font-semibold text-slate-900">{m.from}</span>
            </div>
            <div>
              <span className="text-slate-400">To</span> {m.to.join(', ')}
            </div>
            {m.cc.length > 0 && (
              <div>
                <span className="text-slate-400">Cc</span> {m.cc.join(', ')}
              </div>
            )}
            <div className="text-slate-400">{m.date}</div>
          </div>
          <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap border-t border-slate-200 pt-4">{m.body}</div>
          {items[open].replyIn && <p className="text-xs text-indigo-700 font-semibold">This one needs your reply: answer it in {items[open].replyIn}.</p>}
        </article>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">No emails</div>
      )}
    </div>
  );
};

export const FilesPanel: React.FC<{ files: CaseFile[] }> = ({ files }) => {
  const [open, setOpen] = useState(0);
  const f = files[open];
  const download = (file: CaseFile) => {
    const url = URL.createObjectURL(new Blob([file.content], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="h-full flex bg-white">
      <ul className="w-64 shrink-0 border-r border-slate-200 overflow-y-auto">
        {files.map((file, i) => (
          <li key={file.name}>
            <button onClick={() => setOpen(i)} className={`w-full text-left px-4 py-3 text-sm inline-flex items-center gap-2 ${open === i ? 'bg-indigo-50 text-indigo-800 font-semibold' : 'hover:bg-slate-50 text-slate-700'}`}>
              <FileText className="w-4 h-4 shrink-0" />
              <span className="truncate">{file.name}</span>
            </button>
          </li>
        ))}
      </ul>
      {f && (
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="px-4 py-2 border-b border-slate-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">{f.name}</span>
            <button onClick={() => download(f)} className="text-xs font-semibold text-indigo-700 inline-flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
          </div>
          <pre className="flex-1 overflow-auto p-4 text-xs font-mono text-slate-800 whitespace-pre">{f.content}</pre>
        </div>
      )}
    </div>
  );
};

// The AI tab: an ordinary assistant, on the questions the company allows it on. The conversation goes to the company
// with the answers
export const AiPanel: React.FC<{ task: string; company?: string; chat: AiTurn[]; onChat: (chat: AiTurn[]) => void }> = ({ task, company, chat, onChat }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const latest = useRef(chat);
  latest.current = chat;
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'end' }), [chat.length, busy]);
  const used = chat.filter((t) => t.role === 'user').length;
  const left = MAX_AI_MESSAGES - used;

  const send = async () => {
    const prompt = text.trim();
    if (!prompt || busy || left <= 0) return;
    const next: AiTurn[] = [...latest.current, { role: 'user', text: prompt }];
    onChat(next);
    setText('');
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/task-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'helper', company, task, brief: '', messages: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body.reply !== 'string') throw new Error(body.error === 'not-configured' ? "The AI assistant isn't available on this site." : body.error || "The assistant couldn't answer. Try again.");
      onChat([...next, { role: 'assistant', text: body.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant couldn't answer. Try again.");
      onChat(next.slice(0, -1));
      setText(prompt);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-6 py-2 border-b border-slate-200 text-xs text-slate-500">
        The company allows AI on this question. Your conversation is shared with them alongside your answers. {left} of {MAX_AI_MESSAGES} messages left.
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {chat.length === 0 && <p className="text-sm text-slate-500 text-center py-10">Ask the assistant anything about this question: to explain, check, draft or work something out.</p>}
          {chat.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${t.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {t.text}
              </div>
            </div>
          ))}
          {busy && <div className="text-sm text-slate-400">Thinking…</div>}
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <div ref={end} />
        </div>
      </div>
      <div className="border-t border-slate-200 p-3">
        <div className="max-w-3xl mx-auto flex gap-2 items-end">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            disabled={left <= 0}
            placeholder={left > 0 ? 'Message the AI assistant' : 'You’ve used every message on this question'}
            className="flex-1 resize-none px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button onClick={send} disabled={!text.trim() || busy || left <= 0} aria-label="Send" className="w-10 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white flex items-center justify-center">
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const CloseOverlay: React.FC<{ onClose: () => void; label: string }> = ({ onClose, label }) => (
  <button onClick={onClose} className="absolute top-2 right-3 z-10 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label={label}>
    <X className="w-4 h-4" />
  </button>
);
