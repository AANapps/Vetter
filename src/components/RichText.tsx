import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { TestCase } from '../types';
import { isNumeric, splitTables } from '../lib/textTables';

// Question text with its column-aligned data drawn as tables, so headers line up with their values in any font
export const RichText: React.FC<{ text: string; className?: string }> = ({ text, className = '' }) => {
  // Code fenced with ``` (a formula, a query, a few lines of pandas) is shown as code, the rest as text and tables
  if (text.includes('```')) {
    const pieces = text.split(/```[a-z]*\n?([\s\S]*?)```/);
    return (
      <div className={`space-y-3 ${className}`}>
        {pieces.map((piece, i) =>
          i % 2 ? (
            <pre key={i} className="m-0 p-3 rounded-lg bg-slate-900 text-slate-100 text-[12.5px] leading-relaxed font-mono overflow-x-auto whitespace-pre">
              {piece.replace(/\n$/, '')}
            </pre>
          ) : piece.trim() ? (
            <RichText key={i} text={piece.trim()} />
          ) : null
        )}
      </div>
    );
  }
  const blocks = splitTables(text);
  return (
    <div className={className}>
      {blocks.map((b, i) =>
        b.kind === 'text' ? (
          // Paragraphs (split at blank lines) get space between them, so a long prompt isn't one block
          <div key={i} className="space-y-3">
            {b.text
              .split(/\n[ \t]*\n/)
              .filter((para) => para.trim())
              .map((para, k) => (
                <p key={k} className="whitespace-pre-wrap">
                  {para.replace(/^\n+|\n+$/g, '')}
                </p>
              ))}
          </div>
        ) : (
          <div key={i} className="my-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-[13px] leading-snug">
              {b.head && (
                <thead className="bg-slate-50">
                  <tr>
                    {b.head.map((h, k) => (
                      <th key={k} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap border-b border-slate-200">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r} className="border-b border-slate-100 last:border-0">
                    {row.map((c, k) => (
                      <td key={k} className={`px-3 py-1.5 text-slate-800 align-top ${isNumeric(c) ? 'text-right tabular-nums font-mono text-[12.5px]' : ''} ${k === 0 ? 'font-medium' : ''}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
};

// A task's numbered questions: lines starting "Q1.", "Q2." and so on begin a question
const PART = /^Q(\d+)\.\s+/;
export function splitParts(text: string): { intro: string; parts: { n: number; text: string }[] } {
  const lines = text.split('\n');
  const first = lines.findIndex((l) => PART.test(l));
  if (first < 0) return { intro: text, parts: [] };
  const parts: { n: number; text: string }[] = [];
  for (const line of lines.slice(first)) {
    const m = line.match(PART);
    if (m) parts.push({ n: Number(m[1]), text: line.replace(PART, '') });
    else if (parts.length) parts[parts.length - 1].text += `\n${line}`;
  }
  return { intro: lines.slice(0, first).join('\n').trim(), parts: parts.map((p) => ({ ...p, text: p.text.trim() })) };
}

/**
 * A task's instructions: its introduction, then each numbered question in its own card under its own header, with the
 * checks it's marked on (checks named "Q1 · ...") listed under it. A prompt without numbered questions reads as before.
 */
export const TaskPrompt: React.FC<{ text: string; checks?: TestCase[]; className?: string; only?: number; prefix?: number }> = ({ text, checks = [], className = '', only, prefix }) => {
  const { intro, parts: all } = splitParts(text);
  // One question at a time when the task is shown as slides; the introduction stays above each
  const parts = only === undefined ? all : all.slice(only, only + 1);
  if (all.length === 0) return <RichText text={text} className={`p-4 bg-slate-50 border border-slate-200 rounded-lg ${className}`} />;
  const checksFor = (n: number) => checks.filter((c) => c.description.startsWith(`Q${n} · `));
  return (
    <div className="space-y-4">
      {intro && <RichText text={intro} className={`p-4 bg-slate-50 border border-slate-200 rounded-lg ${className}`} />}
      {parts.map((p) => {
        const marked = checksFor(p.n);
        return (
          <section key={p.n} aria-labelledby={`task-part-${p.n}`} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
            <h3 id={`task-part-${p.n}`} className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className="inline-flex items-center justify-center min-w-[2.25rem] h-6 px-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs tabular-nums">
                {prefix ? `${prefix}.${p.n}` : p.n}
              </span>
              Question {prefix ? `${prefix}.${p.n}` : p.n}
            </h3>
            <RichText text={p.text} className={className} />
            {marked.length > 0 && (
              <ul className="pt-3 border-t border-slate-100 space-y-1.5" aria-label={`What's marked in question ${p.n}`}>
                {[...new Set(marked.map((c) => c.description.slice(`Q${p.n} · `.length)))].map((d) => (
                  <li key={d} className="flex items-start gap-2 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-px shrink-0 text-slate-300" aria-hidden="true" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};
