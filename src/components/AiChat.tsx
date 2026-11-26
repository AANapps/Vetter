import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, Check, Copy, Sparkles } from 'lucide-react';

/**
 * The pieces of the AI assistant candidates use in tests and job simulations, made to look and feel like the AI chat
 * apps people use at work: a centred conversation, the assistant's replies as formatted text (headings, lists, tables,
 * code blocks with Copy) appearing word by word, the person's messages in soft bubbles, a "thinking" indicator and a
 * rounded message box that grows as they type. Plain styling of Granyt's own; no other product's name or logo.
 *
 * Copying a reply is copying inside the test, so pasting it back into the work isn't flagged as from outside.
 */

export type ChatTurn = { role: 'user' | 'assistant'; text: string };

// ---------- Formatted text (a small Markdown subset, built as React nodes: nothing is injected as HTML) ----------

const inline = (text: string, key = ''): React.ReactNode[] => {
  const out: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = `${key}-${i++}`;
    if (t.startsWith('`')) out.push(<code key={k} className="px-1 py-0.5 rounded bg-slate-100 text-[0.9em] font-mono text-slate-800">{t.slice(1, -1)}</code>);
    else if (t.startsWith('**') || t.startsWith('__')) out.push(<strong key={k} className="font-semibold text-slate-900">{inline(t.slice(2, -2), k)}</strong>);
    else out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

const CopyButton: React.FC<{ text: string; label?: string; className?: string }> = ({ text, label = 'Copy', className = '' }) => {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className={`inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 ${className}`}
      aria-label={label}
      title={label}
    >
      {done ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {label !== 'Copy reply' && <span>{done ? 'Copied' : label}</span>}
    </button>
  );
};

const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export const Markdown: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let n = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${n++}`;
    // Code block
    const fence = line.match(/^\s*```\s*([\w+#.-]*)/);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++]);
      i++;
      const body = code.join('\n');
      blocks.push(
        <div key={key} className="rounded-xl overflow-hidden border border-slate-200 my-3">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 text-[11px] text-slate-500">
            <span className="font-mono">{fence[1] || 'code'}</span>
            <CopyButton text={body} label="Copy code" />
          </div>
          <pre className="px-4 py-3 bg-slate-50 overflow-x-auto text-[13px] leading-relaxed font-mono text-slate-800">
            <code>{body}</code>
          </pre>
        </div>
      );
      continue;
    }
    // Heading
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const size = h[1].length === 1 ? 'text-lg' : h[1].length === 2 ? 'text-base' : 'text-[15px]';
      blocks.push(<p key={key} className={`${size} font-semibold text-slate-900 mt-4 mb-1.5`}>{inline(h[2], key)}</p>);
      i++;
      continue;
    }
    // Table
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? '')) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      blocks.push(
        <div key={key} className="my-3 overflow-x-auto">
          <table className="text-sm border-collapse">
            <thead>
              <tr>{head.map((c, j) => <th key={j} className="text-left font-semibold px-3 py-1.5 border-b border-slate-300">{inline(c, `${key}h${j}`)}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j} className="px-3 py-1.5 border-b border-slate-100 align-top">{inline(c, `${key}r${ri}c${j}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    // Lists
    const bullet = /^\s*[-*•]\s+/;
    const numbered = /^\s*\d+[.)]\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const re = ordered ? numbered : bullet;
      const items: string[] = [];
      while (i < lines.length && re.test(lines[i])) items.push(lines[i++].replace(re, ''));
      const Tag = ordered ? 'ol' : 'ul';
      blocks.push(
        <Tag key={key} className={`my-2 pl-6 space-y-1 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-slate-400`}>
          {items.map((it, j) => <li key={j}>{inline(it, `${key}-${j}`)}</li>)}
        </Tag>
      );
      continue;
    }
    // Quote
    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push(<blockquote key={key} className="my-2 pl-3 border-l-2 border-slate-300 text-slate-600">{inline(quote.join(' '), key)}</blockquote>);
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    // Paragraph: lines up to a blank line or another block
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*(```|#{1,4}\s|[-*•]\s|\d+[.)]\s|>|\|)/.test(lines[i])) para.push(lines[i++]);
    if (!para.length) para.push(lines[i++]);
    blocks.push(
      <p key={key} className="my-2 whitespace-pre-wrap">
        {inline(para.join('\n'), key)}
      </p>
    );
  }
  return <>{blocks}</>;
};

// A reply as plain text, for handing in as written work: the formatting marks taken out
export const plainText = (md: string) =>
  md
    .replace(/^\s*```[\w+#.-]*\s*$/gm, '')
    .replace(/^#{1,4}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*\|?\s*:?-{2,}.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// ---------- The conversation ----------

// The assistant's reply appearing word by word, as AI chat apps stream it
function useReveal(text: string, on: boolean, onStep?: () => void) {
  const [shown, setShown] = useState(on ? 0 : text.length);
  useEffect(() => {
    if (!on) return setShown(text.length);
    let n = 0;
    // About two seconds for a long reply, quicker for short ones
    const step = Math.max(3, Math.ceil(text.length / 120));
    const id = setInterval(() => {
      n = Math.min(text.length, n + step);
      setShown(n);
      onStep?.();
      if (n >= text.length) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [text, on]);
  return text.slice(0, shown);
}

const Avatar = () => (
  <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
    <Sparkles className="w-3.5 h-3.5" />
  </div>
);

const AssistantMessage: React.FC<{ text: string; animate: boolean; onStep?: () => void; actions: boolean }> = ({ text, animate, onStep, actions }) => {
  const shown = useReveal(text, animate, onStep);
  const done = shown.length >= text.length;
  return (
    <div className="flex gap-3">
      <Avatar />
      <div className="min-w-0 flex-1 text-[15px] leading-7 text-slate-800 pt-0.5">
        <Markdown text={shown} />
        {actions && done && (
          <div className="mt-1 -ml-1 flex items-center gap-2">
            <CopyButton text={text} label="Copy reply" className="p-1 rounded-md hover:bg-slate-100" />
          </div>
        )}
      </div>
    </div>
  );
};

export const Thinking: React.FC = () => (
  <div className="flex gap-3 items-center" role="status" aria-label="The assistant is thinking">
    <Avatar />
    <div className="flex items-center gap-1.5 text-sm text-slate-500">
      <span className="animate-pulse">Thinking</span>
      <span className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </span>
    </div>
  </div>
);

export const ChatMessages: React.FC<{
  chat: ChatTurn[];
  busy?: boolean;
  // Replies from this index on appear word by word (the ones that arrived while this is open)
  animateFrom?: number;
  // A company reading the conversation afterwards: no actions, labels on each message
  readOnly?: boolean;
  onStep?: () => void;
}> = ({ chat, busy, animateFrom = Infinity, readOnly, onStep }) => (
  <div className="space-y-6">
    {chat.map((t, i) =>
      t.role === 'user' ? (
        <div key={i} className="flex justify-end">
          <div className="max-w-[80%]">
            {readOnly && <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right mb-1">Candidate</div>}
            <div className="px-4 py-2.5 rounded-3xl bg-slate-100 text-[15px] leading-relaxed text-slate-900 whitespace-pre-wrap break-words">{t.text}</div>
          </div>
        </div>
      ) : (
        <AssistantMessage key={i} text={t.text} animate={!readOnly && i >= animateFrom} onStep={onStep} actions={!readOnly} />
      )
    )}
    {busy && <Thinking />}
  </div>
);

// ---------- The message box ----------

export const Composer: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy?: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}> = ({ value, onChange, onSend, busy, disabled, placeholder = 'Message the assistant', autoFocus }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  // Grows with what's typed, up to about eight lines
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 208)}px`;
  }, [value]);
  const can = !!value.trim() && !busy && !disabled;
  return (
    <div className={`rounded-3xl border bg-white shadow-sm transition-colors ${disabled ? 'border-slate-200 opacity-70' : 'border-slate-300 focus-within:border-slate-400 focus-within:shadow-md'}`}>
      <textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (can) onSend();
          }
        }}
        rows={1}
        disabled={disabled}
        aria-label="Message the assistant"
        placeholder={placeholder}
        className="block w-full resize-none bg-transparent px-5 pt-3.5 pb-1 text-[15px] leading-6 text-slate-900 placeholder:text-slate-400 outline-none disabled:cursor-not-allowed"
      />
      <div className="flex items-center justify-end px-2.5 pb-2.5">
        <button
          type="button"
          onClick={onSend}
          disabled={!can}
          aria-label="Send"
          className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Keeps the newest message in view while the conversation grows
export function useStickToBottom(deps: unknown[]) {
  const box = useRef<HTMLDivElement>(null);
  const toBottom = () => {
    const el = box.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  useEffect(toBottom, deps);
  return { box, toBottom };
}
