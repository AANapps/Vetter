import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ClipboardCopy, FileText, Loader2, Sparkles } from 'lucide-react';
import { Question } from '../types';
import { ASSISTANT_PROMPTS, AssistantTurn, assistantAnswer } from '../lib/questionTypes';

// An AI-assisted task as the candidate meets it: what they're handed, a chat with an AI assistant to get the work done,
// and the work they hand in. The whole conversation is kept with the answer, since how they used the AI is marked too
export const AssistantTask: React.FC<{ question: Question; answer: string; onChange: (answer: string) => void; company?: string }> = ({ question: q, answer, onChange, company }) => {
  const current = assistantAnswer(answer);
  // The latest answer, for a reply that arrives after the candidate has typed more of their final work
  const latest = useRef(current);
  latest.current = current;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showMaterial, setShowMaterial] = useState(true);
  const used = current.chat.filter((t) => t.role === 'user').length;
  const left = Math.max(0, ASSISTANT_PROMPTS - used);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [current.chat.length, busy]);

  const save = (change: Partial<typeof current>) => onChange(JSON.stringify({ ...latest.current, ...change }));
  const send = async () => {
    const prompt = text.trim();
    if (!prompt || busy || left === 0) return;
    const chat: AssistantTurn[] = [...latest.current.chat, { role: 'user', text: prompt }];
    save({ chat });
    setText('');
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/task-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, task: q.prompt, material: q.assistant?.material ?? '', brief: q.assistant?.brief ?? '', messages: chat }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || typeof body.reply !== 'string') throw new Error(body.error === 'not-configured' ? "The AI assistant isn't available on this site." : body.error || "The assistant couldn't answer. Try again.");
      save({ chat: [...latest.current.chat, { role: 'assistant', text: body.reply }] });
    } catch (err) {
      // The message stays in the conversation so it can be sent again; it doesn't count as answered
      setError(err instanceof Error ? err.message : "The assistant couldn't answer. Try again.");
      save({ chat: latest.current.chat.slice(0, -1) });
      setText(prompt);
    } finally {
      setBusy(false);
    }
  };
  const lastReply = [...current.chat].reverse().find((t) => t.role === 'assistant')?.text;

  return (
    <div className="space-y-4">
      {q.assistant?.material && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <button onClick={() => setShowMaterial((s) => !s)} aria-expanded={showMaterial} className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-800">
            <FileText className="w-4 h-4 text-slate-500" />
            What you&rsquo;ve been given
            <span className="ml-auto text-xs font-normal text-slate-500">{showMaterial ? 'Hide' : 'Show'}</span>
          </button>
          {showMaterial && (
            <div className="px-4 pb-4">
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3">{q.assistant.material}</div>
              {/* Put in the message box here rather than copied: a paste from the clipboard would read as from outside the test */}
              <button
                onClick={() => setText((t) => `${t}${t.trim() ? '\n\n' : ''}${q.assistant?.material ?? ''}`)}
                className="mt-2 text-xs font-medium text-slate-600 hover:text-indigo-700 inline-flex items-center gap-1"
              >
                <ClipboardCopy className="w-3.5 h-3.5" />
                Add it to my message
              </button>
            </div>
          )}
        </div>
      )}

      {/* The conversation */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50">
          <Sparkles className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-semibold text-slate-800">AI assistant</span>
          <span className={`ml-auto text-[11px] ${left <= 3 ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>
            {left} of {ASSISTANT_PROMPTS} messages left
          </span>
        </div>
        <div className="max-h-[28rem] min-h-[10rem] overflow-y-auto p-4 space-y-3" aria-live="polite">
          {current.chat.length === 0 && !busy && (
            <p className="text-sm text-slate-500">
              Ask the assistant to help with the task, as you would at work. It only knows what&rsquo;s in the material and what you tell it, and it can be wrong.
            </p>
          )}
          {current.chat.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  t.role === 'user' ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-900 rounded-bl-md'
                }`}
              >
                {t.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Thinking…
            </div>
          )}
          <div ref={end} />
        </div>
        {error && <p className="px-4 pb-2 text-xs text-rose-700">{error}</p>}
        <div className="border-t border-slate-200 p-2 flex items-end gap-2">
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
            disabled={left === 0}
            aria-label="Message the assistant"
            placeholder={left === 0 ? "You've used every message for this task" : 'Message the assistant (Enter to send, Shift+Enter for a new line)'}
            className="flex-1 min-w-0 px-3 py-2 text-sm leading-relaxed outline-none resize-none bg-transparent disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={busy || !text.trim() || left === 0}
            aria-label="Send"
            className="w-9 h-9 shrink-0 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* What they hand in */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${q.id}-final`} className="text-sm font-bold text-slate-800">
            Your final work
          </label>
          {lastReply && (
            <button onClick={() => save({ final: lastReply })} className="text-xs font-medium text-slate-600 hover:text-indigo-700">
              Start from the assistant&rsquo;s last reply
            </button>
          )}
        </div>
        <textarea
          id={`${q.id}-final`}
          value={current.final}
          onChange={(e) => save({ final: e.target.value })}
          rows={10}
          placeholder="What you'd hand in: edit and check it, it's yours"
          className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm leading-relaxed focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <p className="text-[11px] text-slate-500">
          Marked on the work you hand in and on how you used the assistant: the context you gave it, and whether you checked what it told you.
        </p>
      </div>
    </div>
  );
};
