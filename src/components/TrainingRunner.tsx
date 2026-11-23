import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCircle2, GraduationCap, Lightbulb, MousePointerClick, SkipForward, X } from 'lucide-react';
import { AssessmentTest, TrainingStep } from '../types';
import { appDocument, matchesExpected, readAppMessage, readPath } from '../lib/appSimulation';

/**
 * Guided training: the copy of the app on one side, a coach on the other. Lesson by lesson, the coach says what to do
 * and why, glows on the control to use (the app's data-ref), and ticks the step off by itself as soon as the app's
 * state shows it's done. Hints and "show me" help anyone stuck; nothing is marked or ranked.
 */

// The glow, drawn inside the app's frame on the element the coach points at; the coach sends {source:'praxa-guide'}
const GUIDE = `<style>
#praxa-guide { position: fixed; inset: 0; pointer-events: none; z-index: 2147483646; }
#praxa-guide .pg-ring { position: fixed; border: 3px solid #6366f1; border-radius: 10px; box-shadow: 0 0 0 4px rgba(99,102,241,.25), 0 0 22px 4px rgba(99,102,241,.55); animation: pg 1.4s ease-in-out infinite; transition: all .2s; }
#praxa-guide .pg-tip { position: fixed; max-width: 260px; padding: 8px 10px; background: #312e81; color: #fff; font: 600 12px/1.4 system-ui, sans-serif; border-radius: 8px; box-shadow: 0 6px 20px rgba(15,23,42,.3); }
@keyframes pg { 50% { box-shadow: 0 0 0 7px rgba(99,102,241,.15), 0 0 30px 8px rgba(99,102,241,.4); } }
</style>
<script>
(function () {
  var target = null, label = '', layer, ring, tip;
  function draw() {
    if (!layer || !layer.isConnected) { layer = document.createElement('div'); layer.id = 'praxa-guide'; ring = document.createElement('div'); ring.className = 'pg-ring'; tip = document.createElement('div'); tip.className = 'pg-tip'; layer.appendChild(ring); layer.appendChild(tip); (document.body || document.documentElement).appendChild(layer); }
    var el = target ? document.querySelector('[data-ref="' + target.replace(/"/g, '') + '"]') : null;
    var shown = el && el.getClientRects().length;
    ring.style.display = tip.style.display = shown ? 'block' : 'none';
    if (!shown) return;
    var r = el.getBoundingClientRect();
    ring.style.left = (r.left - 5) + 'px'; ring.style.top = (r.top - 5) + 'px'; ring.style.width = (r.width + 10) + 'px'; ring.style.height = (r.height + 10) + 'px';
    tip.textContent = label;
    var below = r.bottom + 12 + 60 < innerHeight;
    tip.style.left = Math.max(8, Math.min(r.left, innerWidth - 270)) + 'px';
    tip.style.top = (below ? r.bottom + 12 : Math.max(8, r.top - 56)) + 'px';
  }
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.source !== 'praxa-guide') return;
    target = e.data.ref || null; label = e.data.text || '';
    var el = target && document.querySelector('[data-ref="' + target.replace(/"/g, '') + '"]');
    if (el && e.data.scroll) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    draw();
  });
  setInterval(draw, 400);
  window.addEventListener('resize', draw);
  document.addEventListener('scroll', draw, true);
})();
</script>`;

interface TrainingRunnerProps {
  test: AssessmentTest;
  onClose: () => void;
  // Finished: the share of steps done without skipping, as a score out of 100, and the time it took
  onFinish?: (score: number, seconds: number) => void;
  onBegin?: () => void;
  // The company trying it out (nothing saved)
  preview?: boolean;
}

export const TrainingRunner: React.FC<TrainingRunnerProps> = ({ test, onClose, onFinish, onBegin, preview }) => {
  const guide = test.guide!;
  const app = test.questions.find((q) => q.type === 'app');
  const steps = useMemo(() => guide.lessons.flatMap((l) => l.steps.map((s) => ({ ...s, lesson: l.id }))), [guide]);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [doc] = useState(() => {
    const page = appDocument(app?.appHtml ?? '<p>This training has no app.</p>');
    return page.replace(/<head[^>]*>/i, (tag) => `${tag}\n${GUIDE}`);
  });
  const [done, setDone] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  // The lesson whose intro was read
  const [started, setStarted] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState(false);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const began = useRef(Date.now());
  const state = useRef<unknown>(null);

  const current = steps.find((s) => !done.has(s.id) && !skipped.has(s.id));
  const lesson = guide.lessons.find((l) => l.id === (current?.lesson ?? guide.lessons[guide.lessons.length - 1].id))!;
  const onIntro = !!current && !started.has(lesson.id);
  const lessonIndex = guide.lessons.indexOf(lesson);
  const count = done.size + skipped.size;

  useEffect(() => {
    onBegin?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Steps done, from each state the app saves; earlier ones are kept even if a later action changes the value back
  const mark = (s: unknown) => {
    state.current = s;
    setDone((prev) => {
      const next = new Set(prev);
      for (const step of steps) if (!next.has(step.id) && matchesExpected(readPath(s, step.path), step.expected)) next.add(step.id);
      if (next.size === prev.size) return prev;
      const fresh = steps.find((x) => next.has(x.id) && !prev.has(x.id));
      if (fresh) setJustDone(fresh.id);
      return next;
    });
  };
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const msg = readAppMessage(e, frameRef.current);
      if (msg?.state) mark(msg.state);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!justDone) return;
    const t = setTimeout(() => setJustDone(null), 1600);
    return () => clearTimeout(t);
  }, [justDone]);

  // The glow follows the step being worked on
  const point = (step: TrainingStep | undefined, scroll = false) =>
    frameRef.current?.contentWindow?.postMessage({ source: 'praxa-guide', ref: step && !onIntro ? step.ref : null, text: step?.instruction ?? '', scroll }, '*');
  useEffect(() => {
    setHint(false);
    point(current, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, onIntro]);

  const finish = () => {
    setFinished(true);
    point(undefined);
    const score = Math.round((done.size / Math.max(1, steps.length)) * 100);
    onFinish?.(score, Math.round((Date.now() - began.current) / 1000));
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-100 flex flex-col" role="dialog" aria-modal="true" aria-label={test.title}>
      <header className="h-12 shrink-0 bg-white border-b border-slate-200 px-4 flex items-center gap-3">
        <GraduationCap className="w-5 h-5 text-indigo-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate">{test.title}</p>
        </div>
        {preview && <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Trying it out · nothing saved</span>}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <div className="w-32 h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all" style={{ width: `${(count / steps.length) * 100}%` }} />
          </div>
          {count}/{steps.length}
        </div>
        <button onClick={onClose} aria-label="Close training" className="p-1.5 text-slate-400 hover:text-slate-700">
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 min-h-0 flex flex-col-reverse lg:flex-row">
        {/* The coach */}
        <aside className="lg:w-[22rem] shrink-0 max-h-[45vh] lg:max-h-none overflow-y-auto bg-white border-t lg:border-t-0 lg:border-r border-slate-200 p-5 space-y-4">
          {finished || !current ? (
            <div className="space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">{finished ? 'Training complete' : 'That’s every step'}</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{guide.wrapUp}</p>
              {skipped.size > 0 && <p className="text-xs text-slate-500">You skipped {skipped.size} step{skipped.size === 1 ? '' : 's'}. You can go back over the app any time before closing.</p>}
              {!finished ? (
                <button onClick={finish} className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                  Finish training
                </button>
              ) : (
                <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700">
                  Close
                </button>
              )}
            </div>
          ) : onIntro ? (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                Lesson {lessonIndex + 1} of {guide.lessons.length}
              </p>
              <h2 className="text-lg font-bold text-slate-900">{lesson.title}</h2>
              <p className="text-sm text-slate-700 leading-relaxed">{lesson.intro}</p>
              <ol className="space-y-1.5 text-sm text-slate-600 list-decimal pl-5">
                {lesson.steps.map((s) => (
                  <li key={s.id}>{s.instruction}</li>
                ))}
              </ol>
              <button
                onClick={() => setStarted((p) => new Set(p).add(lesson.id))}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 inline-flex items-center justify-center gap-1.5"
              >
                {lessonIndex === 0 ? 'Start' : 'Start lesson'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                Lesson {lessonIndex + 1} · {lesson.title}
              </p>
              {justDone && (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <Check className="w-4 h-4" /> Nicely done.
                </p>
              )}
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-2">
                <p className="text-xs font-semibold text-indigo-700">
                  Step {lesson.steps.findIndex((s) => s.id === current.id) + 1} of {lesson.steps.length}
                </p>
                <p className="text-base font-semibold text-slate-900 leading-snug">{current.instruction}</p>
                <p className="text-sm text-slate-600">{current.why}</p>
              </div>
              {hint && <p className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-950">{current.hint}</p>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => point(current, true)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:border-indigo-400 inline-flex items-center gap-1">
                  <MousePointerClick className="w-3.5 h-3.5" /> Show me where
                </button>
                {!hint && (
                  <button onClick={() => setHint(true)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:border-indigo-400 inline-flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" /> I’m stuck
                  </button>
                )}
                <button
                  onClick={() => setSkipped((p) => new Set(p).add(current.id))}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                >
                  <SkipForward className="w-3.5 h-3.5" /> Skip
                </button>
              </div>
              <p className="text-xs text-slate-400">This ticks off by itself once you&rsquo;ve done it in the app.</p>

              <ol className="pt-2 border-t border-slate-100 space-y-1">
                {guide.lessons.map((l, i) => {
                  const all = l.steps.every((s) => done.has(s.id) || skipped.has(s.id));
                  return (
                    <li key={l.id} className={`flex items-center gap-2 text-xs ${l.id === lesson.id ? 'font-semibold text-slate-900' : all ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {all ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3.5 text-center tabular-nums">{i + 1}</span>}
                      {l.title}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </aside>

        {/* The app */}
        <main className="flex-1 min-h-0 p-2 sm:p-3">
          <div className="h-full rounded-xl overflow-hidden border border-slate-300 bg-white shadow-sm flex flex-col">
            <div className="h-8 shrink-0 bg-slate-100 border-b border-slate-200 px-3 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="ml-2 font-semibold">{guide.appName}</span>
            </div>
            <iframe
              ref={frameRef}
              title={guide.appName}
              srcDoc={doc}
              sandbox="allow-scripts"
              className="flex-1 w-full bg-white"
              onLoad={() => point(current, true)}
            />
          </div>
        </main>
      </div>
    </div>
  );
};
