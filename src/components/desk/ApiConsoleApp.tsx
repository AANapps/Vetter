import React, { useState } from 'react';
import { BookOpen, Clock, Plus, Send, X } from 'lucide-react';
import { MockApiConfig, MockApiState, callApi } from '../../lib/mockApi';
import { DeskCtx, btn, primary } from './shared';

/**
 * A Postman-style console on the company's API (src/lib/mockApi.ts): its docs, a request (method, URL, headers, JSON
 * body), the response with its status, and the history of what was sent. Every call is real against the simulated API
 * and kept, so records made or changed here are there for the checks, the automations and the AI tools.
 */

const METHODS = ['GET', 'POST', 'PATCH', 'DELETE'];
const TONE = (s: number) => (s < 300 ? 'bg-emerald-100 text-emerald-800' : s < 500 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800');

export const ApiConsoleApp: React.FC<{ ctx: DeskCtx; cfg: MockApiConfig }> = ({ ctx, cfg }) => {
  const state: MockApiState = ctx.state.desk?.api ?? { collections: {}, calls: [] };
  const [tab, setTab] = useState<'docs' | 'history'>('docs');
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState(`${cfg.baseUrl}/`);
  const [headers, setHeaders] = useState<[string, string][]>([['Content-Type', 'application/json']]);
  const [body, setBody] = useState('');
  const [res, setRes] = useState<{ status: number; text: string; ms: number } | null>(null);

  const send = () => {
    if (ctx.readOnly) return;
    const cur = ctx.latest().desk?.api ?? { collections: {}, calls: [] };
    const started = performance.now();
    const out = callApi(cfg, cur, { method, url, headers: Object.fromEntries(headers.filter(([k]) => k.trim())), body: method === 'GET' || method === 'DELETE' ? undefined : body }, 'console');
    const text = out.res.body === null ? '' : JSON.stringify(out.res.body, null, 2);
    const ms = Math.round(80 + (performance.now() - started) + Math.random() * 120);
    setRes({ status: out.res.status, text, ms });
    ctx.setWork('api', { ...out.state, history: [...(cur.history ?? []), { method, url, headers, body, status: out.res.status, response: text.slice(0, 20000), at: Date.now() }].slice(-60) });
  };
  const load = (h: NonNullable<MockApiState['history']>[number]) => {
    setMethod(h.method);
    setUrl(h.url);
    setHeaders(h.headers);
    setBody(h.body);
    setRes({ status: h.status, text: h.response, ms: 0 });
  };

  return (
    <div className="h-full flex text-[13px] text-slate-800 bg-white" data-ref="api" style={{ ['--accent' as string]: '#ff6c37', ['--accent-soft' as string]: '#ffe4d9' }}>
      <aside className="w-80 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        <div className="h-11 px-3 flex items-center gap-2 font-semibold border-b border-slate-200">
          <span className="w-6 h-6 rounded-full bg-[#ff6c37] text-white grid place-items-center text-[10px] font-bold">API</span>
          {cfg.name}
        </div>
        <div className="flex border-b border-slate-200 text-[12px]">
          {(['docs', 'history'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 h-9 inline-flex items-center justify-center gap-1.5 font-medium ${tab === t ? 'border-b-2 border-[#ff6c37] text-slate-900' : 'text-slate-500'}`}>
              {t === 'docs' ? <BookOpen className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {t === 'docs' ? 'Docs' : `History (${state.history?.length ?? 0})`}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3 select-text">
          {tab === 'docs' ? (
            <Docs text={cfg.docs} />
          ) : (
            <ul className="space-y-1">
              {[...(state.history ?? [])].reverse().map((h, i) => (
                <li key={i}>
                  <button onClick={() => load(h)} className="w-full text-left px-2 py-1.5 rounded hover:bg-white flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold w-12">{h.method}</span>
                    <span className="flex-1 truncate font-mono text-[11px]">{h.url.replace(cfg.baseUrl, '')}</span>
                    <span className={`px-1.5 rounded text-[10.5px] font-semibold ${TONE(h.status)}`}>{h.status}</span>
                  </button>
                </li>
              ))}
              {!state.history?.length && <li className="text-slate-500">Nothing sent yet.</li>}
            </ul>
          )}
        </div>
      </aside>
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="p-3 border-b border-slate-200 space-y-2">
          <div className="flex gap-2">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-9 px-2 rounded-md border border-slate-300 font-mono font-bold text-[12px]" data-ref="api-method">
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} className="flex-1 h-9 px-2.5 rounded-md border border-slate-300 font-mono text-[12px] focus:outline-none focus:border-[#ff6c37]" data-ref="api-url" spellCheck={false} />
            <button className={primary} onClick={send} disabled={ctx.readOnly} data-ref="api-send">
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-1">Headers</div>
            {headers.map(([k, v], i) => (
              <div key={i} className="flex gap-2 mb-1">
                <input value={k} onChange={(e) => setHeaders(headers.map((h, j) => (j === i ? [e.target.value, h[1]] : h)))} placeholder="Header" className="w-48 h-8 px-2 rounded border border-slate-200 font-mono text-[12px]" data-ref="api-header-key" spellCheck={false} />
                <input value={v} onChange={(e) => setHeaders(headers.map((h, j) => (j === i ? [h[0], e.target.value] : h)))} placeholder="Value" className="flex-1 h-8 px-2 rounded border border-slate-200 font-mono text-[12px]" data-ref="api-header-value" spellCheck={false} />
                <button onClick={() => setHeaders(headers.filter((_, j) => j !== i))} className="p-1 text-slate-400 hover:text-rose-600" aria-label="Remove header">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <button className={btn} onClick={() => setHeaders([...headers, ['', '']])} data-ref="api-header-add">
              <Plus className="w-3.5 h-3.5" />
              Header
            </button>
          </div>
          {method !== 'GET' && method !== 'DELETE' && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 mb-1">Body (JSON)</div>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="w-full px-2.5 py-2 rounded-md border border-slate-300 font-mono text-[12px] focus:outline-none focus:border-[#ff6c37]" placeholder={'{\n  "field": "value"\n}'} data-ref="api-body" spellCheck={false} />
            </div>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-3 bg-slate-50">
          {res ? (
            <>
              <div className="flex items-center gap-3 mb-2 text-[12px]">
                <span className={`px-2 py-0.5 rounded font-semibold ${TONE(res.status)}`}>{res.status}</span>
                {res.ms > 0 && <span className="text-slate-500">{res.ms} ms</span>}
                {res.text && (
                  <button className={btn} onClick={() => navigator.clipboard?.writeText(res.text).then(() => ctx.toast('Response copied'), () => ctx.toast('Copy was blocked'))}>
                    Copy
                  </button>
                )}
              </div>
              <pre className="font-mono text-[12px] whitespace-pre-wrap break-words select-text" data-ref="api-response">
                {res.text || '(no content)'}
              </pre>
            </>
          ) : (
            <p className="text-slate-500">Send a request to see the response.</p>
          )}
        </div>
      </main>
    </div>
  );
};

const Docs: React.FC<{ text: string }> = ({ text }) => (
  <div className="space-y-1.5 text-[12.5px] leading-relaxed">
    {text.split('\n').map((l, i) =>
      l.startsWith('# ') ? (
        <h3 key={i} className="pt-2 font-bold text-slate-900">
          {l.slice(2)}
        </h3>
      ) : l.startsWith('    ') ? (
        <pre key={i} className="font-mono text-[11.5px] bg-white border border-slate-200 rounded px-2 py-1 whitespace-pre-wrap">
          {l.trim()}
        </pre>
      ) : l.startsWith('- ') ? (
        <p key={i} className="pl-3 -indent-3">
          • {l.slice(2)}
        </p>
      ) : (
        l.trim() && <p key={i}>{l}</p>
      )
    )}
  </div>
);
