import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Copy, FileText } from 'lucide-react';
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
    <div className="h-full flex text-[14px] text-[#37352f] bg-white" data-ref="kb">
      {/* The wiki's sidebar: the space, search and its pages */}
      <aside className="w-60 shrink-0 bg-[#f7f7f5] border-r border-[#ededeb] overflow-y-auto py-2 text-[13.5px]">
        <div className="px-3 h-8 flex items-center gap-2 font-medium">
          <span className="w-5 h-5 rounded bg-[#37352f] text-white grid place-items-center text-[11px] font-bold">{(cfg.name ?? 'K')[0]}</span>
          <span className="truncate">{cfg.name ?? 'Knowledge base'}</span>
        </div>
        <div className="px-2 py-1">
          <SearchBox value={q} onChange={(v) => (setQ(v), setOpenId(null))} placeholder="Search" />
        </div>
        <div className="px-3 pt-3 pb-1 text-[11.5px] font-medium text-[#91918e]">Pages</div>
        <button onClick={() => (setCat(null), setOpenId(null))} className={`w-[calc(100%-8px)] mx-1 h-7 px-2 rounded flex items-center gap-2 text-left ${!cat && !art ? 'bg-[#ebebea] font-medium' : 'hover:bg-[#ebebea]'}`}>
          <BookOpen className="w-4 h-4 text-[#91918e]" />
          All articles
        </button>
        {cats.map((c) => (
          <div key={c}>
            <button onClick={() => (setCat(c), setOpenId(null))} className={`w-[calc(100%-8px)] mx-1 h-7 px-2 rounded flex items-center gap-2 text-left ${cat === c && !art ? 'bg-[#ebebea] font-medium' : 'hover:bg-[#ebebea]'}`}>
              <ChevronRight className={`w-3.5 h-3.5 text-[#91918e] transition-transform ${cat === c ? 'rotate-90' : ''}`} />
              <span className="truncate">{c}</span>
            </button>
            {cat === c &&
              cfg.articles
                .filter((x) => x.category === c)
                .map((x) => (
                  <button key={x.id} onClick={() => setOpenId(x.id)} className={`w-[calc(100%-8px)] mx-1 h-7 pl-8 pr-2 rounded flex items-center gap-2 text-left ${art?.id === x.id ? 'bg-[#ebebea] font-medium' : 'hover:bg-[#ebebea]'}`}>
                    <FileText className="w-3.5 h-3.5 text-[#91918e] shrink-0" />
                    <span className="truncate">{x.title}</span>
                  </button>
                ))}
          </div>
        ))}
      </aside>
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Breadcrumbs */}
        <div className="h-11 shrink-0 px-4 flex items-center gap-1.5 text-[13px] text-[#37352f]">
          <span className="text-[#91918e]">{cfg.name ?? 'Knowledge base'}</span>
          {(art?.category ?? cat) && (
            <>
              <span className="text-[#c7c7c5]">/</span>
              <span className={art ? 'text-[#91918e]' : ''}>{art?.category ?? cat}</span>
            </>
          )}
          {art && (
            <>
              <span className="text-[#c7c7c5]">/</span>
              <span className="truncate">{art.title}</span>
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {art ? (
            <Article ctx={ctx} a={art} onBack={() => setOpenId(null)} words={words} />
          ) : (
            <div className="max-w-3xl mx-auto px-12 py-8">
              <div className="text-[40px] leading-none mb-3" aria-hidden="true">📚</div>
              <h1 className="text-[32px] font-bold leading-tight mb-6">{cat ?? (q ? `Search: ${q}` : 'All articles')}</h1>
              <ul className="border-t border-[#ededeb]">
                {results.map((a) => (
                  <li key={a.id} className="border-b border-[#ededeb]">
                    <button onClick={() => setOpenId(a.id)} className="w-full text-left py-2.5 px-1 hover:bg-[#f7f7f5] rounded group flex gap-3" data-ref={`kb-${a.id}`}>
                      <FileText className="w-4 h-4 mt-0.5 text-[#91918e] shrink-0" />
                      <span className="min-w-0">
                        <span className="block font-medium underline decoration-[#d3d3d1] underline-offset-2">{a.title}</span>
                        <span className="block text-[12.5px] text-[#91918e]">
                          {a.category}
                          {a.updated ? ` · Updated ${a.updated}` : ''}
                          {viewed.includes(a.id) ? ' · Viewed' : ''}
                        </span>
                        <span className="block text-[13px] text-[#5f5e5b] line-clamp-2">{snippet(a.body, words)}</span>
                      </span>
                    </button>
                  </li>
                ))}
                {results.length === 0 && <li className="py-6 text-[#91918e]">No articles match “{q}”.</li>}
              </ul>
            </div>
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
    <article className="max-w-3xl mx-auto px-12 py-8 space-y-3 select-text text-[16px] leading-[1.6]">
      <button onClick={onBack} className="text-[13px] text-[#91918e] hover:text-[#37352f]">
        ← Back
      </button>
      <div className="text-[40px] leading-none" aria-hidden="true">📄</div>
      <h1 className="text-[36px] font-bold leading-tight text-[#37352f]">{a.title}</h1>
      <div className="text-[13px] text-[#91918e] flex gap-6">
        <span>Category&nbsp;&nbsp;<span className="text-[#37352f]">{a.category}</span></span>
        {a.updated && <span>Last edited&nbsp;&nbsp;<span className="text-[#37352f]">{a.updated}</span></span>}
      </div>
      <hr className="border-[#ededeb]" />
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
          <ul key={i} className="list-disc pl-6 space-y-0.5">
            {para.split('\n').map((l, j) => (
              <li key={j}>{mark(l.replace(/^\s*[-•*]\s/, ''))}</li>
            ))}
          </ul>
        ) : /^#{1,3}\s/.test(para) ? (
          <h2 key={i} className="text-[24px] font-semibold pt-3">
            {mark(para.replace(/^#+\s/, ''))}
          </h2>
        ) : (
          <p key={i} className="whitespace-pre-wrap">
            {mark(para)}
          </p>
        )
      )}
    </article>
  );
};
