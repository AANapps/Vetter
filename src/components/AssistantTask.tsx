import React, { useRef, useState } from 'react';
import { ClipboardCopy, FileText, Sparkles } from 'lucide-react';
import { ChatMessages, Composer, plainText, useStickToBottom } from './AiChat';
import { Question } from '../types';
import { ASSISTANT_PROMPTS, AssistantTurn, assistantAnswer } from '../lib/questionTypes';
import { signedInHeaders } from '../lib/aiRequest';

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
  // Replies that arrive while it's open appear word by word
  const animateFrom = useRef(current.chat.length);
  const { box, toBottom } = useStickToBottom([current.chat.length, busy]);

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
        headers: await signedInHeaders(),
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
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100">
          <Sparkles className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-semibold text-slate-800">Assistant</span>
          <span className={`ml-auto text-[11px] ${left <= 3 ? 'text-amber-700 font-semibold' : 'text-slate-500'}`}>
            {left} of {ASSISTANT_PROMPTS} messages left
          </span>
        </div>
        <div ref={box} className="max-h-[32rem] min-h-[12rem] overflow-y-auto px-4 sm:px-6 py-5" aria-live="polite">
          {current.chat.length === 0 && !busy ? (
            <div className="py-6 text-center">
              <p className="text-xl font-semibold tracking-tight text-slate-800">How can I help with this task?</p>
              <p className="mt-2 text-sm text-slate-500">
                Ask as you would at work. It only knows what&rsquo;s in the material and what you tell it, and it can be wrong.
              </p>
            </div>
          ) : (
            <ChatMessages chat={current.chat} busy={busy} animateFrom={animateFrom.current} onStep={toBottom} />
          )}
        </div>
        {error && <p className="px-4 pb-2 text-xs text-rose-700">{error}</p>}
        <div className="px-3 pb-3">
          <Composer
            value={text}
            onChange={setText}
            onSend={send}
            busy={busy}
            disabled={left === 0}
            placeholder={left === 0 ? "You've used every message for this task" : 'Ask anything (Shift+Enter for a new line)'}
          />
          <p className="mt-1.5 text-center text-[11px] text-slate-400">The assistant can make mistakes, so check its work.</p>
        </div>
      </div>

      {/* What they hand in */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`${q.id}-final`} className="text-sm font-bold text-slate-800">
            Your final work
          </label>
          {lastReply && (
            <button onClick={() => save({ final: plainText(lastReply) })} className="text-xs font-medium text-slate-600 hover:text-indigo-700">
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
