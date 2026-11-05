import React from 'react';
import { ArrowRight, BookOpen, Clock, Lightbulb } from 'lucide-react';
import { GUIDES, GUIDE_AUDIENCES, Guide, guideBySlug } from '../data/guides';
import { BackButton } from './BackButton';

interface GuidesPageProps {
  // The guide open, or null for the list
  slug: string | null;
  onOpen: (slug: string | null) => void;
}

const GuideCard: React.FC<{ guide: Guide; onOpen: () => void }> = ({ guide, onOpen }) => (
  <button onClick={onOpen} className="group text-left rounded-2xl bg-white border border-slate-200 p-5 hover:border-indigo-300 transition-colors">
    <h3 className="font-bold text-slate-900 group-hover:text-indigo-700">{guide.title}</h3>
    <p className="mt-1.5 text-sm text-slate-600">{guide.summary}</p>
    <span className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
      <Clock className="w-3.5 h-3.5" /> {guide.minutes} min read
    </span>
  </button>
);

// How-to guides for companies and candidates, each at /guides/<slug>/
export const GuidesPage: React.FC<GuidesPageProps> = ({ slug, onOpen }) => {
  const guide = guideBySlug(slug);

  if (!guide) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Guides</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">How to use Vetter</h1>
        <p className="mt-3 text-slate-600 max-w-2xl">Short, step-by-step guides. Each one takes a few minutes to read.</p>
        {GUIDE_AUDIENCES.map((a) => (
          <section key={a.id} className="mt-10">
            <h2 className="text-lg font-bold text-slate-900">{a.label}</h2>
            <p className="text-sm text-slate-600">{a.intro}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GUIDES.filter((g) => g.audience === a.id).map((g) => (
                <GuideCard key={g.slug} guide={g} onOpen={() => onOpen(g.slug)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const next = (guide.next ?? []).map(guideBySlug).filter((g): g is Guide => !!g);
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <BackButton onClick={() => onOpen(null)}>All guides</BackButton>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-indigo-600">
        {GUIDE_AUDIENCES.find((a) => a.id === guide.audience)?.label} · {guide.minutes} min read
      </p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">{guide.title}</h1>
      <p className="mt-3 text-lg text-slate-600">{guide.summary}</p>

      <ol className="mt-8 space-y-6">
        {guide.steps.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-4">
            <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">{i + 1}</span>
            <div>
              <h2 className="font-bold text-slate-900">{s.title}</h2>
              <p className="mt-1 text-slate-700">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>

      {guide.tips && (
        <aside className="mt-10 rounded-2xl bg-indigo-50 border border-slate-200 p-5">
          <h2 className="flex items-center gap-2 font-bold text-slate-800">
            <Lightbulb className="w-4 h-4" /> Tips
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-800 list-disc pl-5">
            {guide.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </aside>
      )}

      {next.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <BookOpen className="w-4 h-4" /> Read next
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {next.map((g) => (
              <button
                key={g.slug}
                onClick={() => onOpen(g.slug)}
                className="text-left rounded-xl bg-white border border-slate-200 px-4 py-3 hover:border-indigo-300 flex items-center justify-between gap-3"
              >
                <span className="text-sm font-semibold text-slate-900">{g.title}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
