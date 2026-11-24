import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Copy } from 'lucide-react';
import { KbArticle, KbConfig } from '../../lib/deskApps';
import { DeskCtx, SearchBox, btn } from './shared';

// A help centre or policy library: categories, search ranked by where the words are found, and articles to read and
// copy from. Which articles were opened is kept (kbviewed: checks)
export const KbApp: React.FC<{ ctx: DeskCtx; cfg: KbConfig }> = ({ ctx, cfg }) => {
  const viewed = ctx.state.desk?.kb?.viewed ?? [];
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const cats = [...new Set(cfg.articles.map((a) => a.category))];
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = useMemo(() => {
    const scored = cfg.articles
      .filter((a) => !cat || a.category === cat)
      .map((a) => ({ a, score: words.reduce((s, w) => s + (a.title.toLowerCase().includes(w) ? 5 : 0) + (a.body.toLowerCase().split(w).length - 1), 0) }))
      .filter((x) => !words.length || words.every((w) => `${x.a.title} ${x.a.body}`.toLowerCase().includes(w)));
    return words.length ? scored.sort((x, y) => y.score - x.score).map((x) => x.a) : scored.map((x) => x.a);
  }, [cfg.articles, cat, q]);
  const art = cfg.articles.find((a) => a.id === openId);
  useEffect(() => {
    if (art && !viewed.includes(art.id)) ctx.setWork('kb', { viewed: [...viewed, art.id] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [art?.id]);
  return (
    <div className="h-full flex flex-col text-[13px]" data-ref="kb">
      <header className="shrink-0 bg-teal-700 text-white px-6 py-4 space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <BookOpen className="w-4 h-4" />
          {cfg.name ?? 'Knowledge base'}
        </div>
        <div className="max-w-xl text-slate-900">
          <SearchBox value={q} onChange={(v) => (setQ(v), setOpenId(null))} placeholder="Search articles" />
        </div>
      </header>
      <div className="flex-1 min-h-0 flex">
        <aside className="w-52 shrink-0 border-r border-slate-200 overflow-y-auto py-2 bg-slate-50">
          <button onClick={() => (setCat(null), setOpenId(null))} className={`w-full text-left px-4 py-1.5 ${!cat ? 'font-semibold text-teal-800' : 'text-slate-600 hover:text-slate-900'}`}>
            All articles
          </button>
          {cats.map((c) => (
            <button key={c} onClick={() => (setCat(c), setOpenId(null))} className={`w-full text-left px-4 py-1.5 ${cat === c ? 'font-semibold text-teal-800' : 'text-slate-600 hover:text-slate-900'}`}>
              {c} <span className="text-slate-400">({cfg.articles.filter((a) => a.category === c).length})</span>
            </button>
          ))}
        </aside>
        <div className="flex-1 overflow-y-auto">
          {art ? (
            <Article ctx={ctx} a={art} onBack={() => setOpenId(null)} words={words} />
          ) : (
            <ul className="max-w-3xl px-6 py-4 divide-y divide-slate-100">
              {results.map((a) => (
                <li key={a.id}>
                  <button onClick={() => setOpenId(a.id)} className="w-full text-left py-3 group" data-ref={`kb-${a.id}`}>
                    <div className="font-semibold text-teal-800 group-hover:underline">{a.title}</div>
                    <div className="text-xs text-slate-400">
                      {a.category}
                      {a.updated ? ` · Updated ${a.updated}` : ''}
                      {viewed.includes(a.id) ? ' · Viewed' : ''}
                    </div>
                    <div className="text-slate-600 line-clamp-2">{snippet(a.body, words)}</div>
                  </button>
                </li>
              ))}
              {results.length === 0 && <li className="py-6 text-slate-500">No articles match “{q}”.</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const snippet = (body: string, words: string[]) => {
  const flat = body.replace(/\s+/g, ' ');
  const at = words.length ? flat.toLowerCase().indexOf(words[0]) : -1;
  return at > 60 ? `…${flat.slice(at - 50, at + 150)}…` : flat.slice(0, 200);
};

const Article: React.FC<{ ctx: DeskCtx; a: KbArticle; onBack: () => void; words: string[] }> = ({ ctx, a, onBack, words }) => {
  const mark = (text: string) => {
    if (!words.length) return text;
    const re = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return text.split(re).map((p, i) => (i % 2 ? <mark key={i} className="bg-yellow-200">{p}</mark> : p));
  };
  return (
    <article className="max-w-3xl px-6 py-5 space-y-3 select-text">
      <button onClick={onBack} className="text-xs text-teal-700 hover:underline">
        ← Back
      </button>
      <div className="text-xs text-slate-400">{a.category}</div>
      <h1 className="text-xl font-bold text-slate-900">{a.title}</h1>
      {a.updated && <div className="text-xs text-slate-400">Updated {a.updated}</div>}
      <button
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(`${a.title}\n\n${a.body}`);
            ctx.toast('Article copied');
          } catch {
            ctx.toast('Copy was blocked: select the text and press Ctrl+C.');
          }
        }}
      >
        <Copy className="w-3.5 h-3.5" />
        Copy article
      </button>
      {a.body.split(/\n{2,}/).map((para, i) =>
        para.split('\n').every((l) => /^\s*[-•*]\s/.test(l)) ? (
          <ul key={i} className="list-disc pl-6 space-y-0.5 text-slate-800 leading-relaxed">
            {para.split('\n').map((l, j) => (
              <li key={j}>{mark(l.replace(/^\s*[-•*]\s/, ''))}</li>
            ))}
          </ul>
        ) : /^#{1,3}\s/.test(para) ? (
          <h2 key={i} className="text-base font-semibold text-slate-900 pt-1">
            {mark(para.replace(/^#+\s/, ''))}
          </h2>
        ) : (
          <p key={i} className="leading-relaxed text-slate-800 whitespace-pre-wrap">
            {mark(para)}
          </p>
        )
      )}
    </article>
  );
};
