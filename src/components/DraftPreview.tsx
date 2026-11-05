import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Eye, ListTree, Pencil, Plus, Trash2 } from 'lucide-react';
import { AssessmentTest, Question, QuestionType } from '../types';
import { QUESTION_STYLES, blankQuestion, groupQuestions, isAnswerType, isGroupType, isWorkspaceType, questionProblems, tidyQuestion } from '../lib/questionTypes';
import { CaseMaterial } from './TestRunner';
import { AnswerInput } from './AnswerInputs';
import { AppWindow } from './AppWindow';
import { CaseBrief } from './CaseBrief';
import { DatabaseWindow } from './DatabaseWindow';
import { QuestionEditor } from './QuestionEditors';
import { SpreadsheetWindow } from './SpreadsheetWindow';

const styleLabel = (q: Question) => QUESTION_STYLES.find((s) => s.type === q.type)?.label ?? q.type;

// Styles a company can add by hand; hands-on tasks are only written by Vetter
const ADDABLE: QuestionType[] = ['choice', 'multi', 'text', 'written', 'order', 'match', 'case'];

// The draft with its totals worked out again after a change
const withQuestions = (test: AssessmentTest, questions: Question[]): AssessmentTest => ({
  ...test,
  questions,
  totalQuestions: questions.length,
  estimatedMinutes: Math.max(1, questions.reduce((sum, q) => sum + q.timeLimitMinutes, 0)),
});

// The test as candidates will get it: blanks dropped, and points turned into percentages of the score
export function finaliseDraft(test: AssessmentTest): AssessmentTest {
  const tidy = test.questions.map(tidyQuestion);
  const total = tidy.reduce((sum, q) => sum + q.weight, 0) || 1;
  return withQuestions(test, tidy.map((q) => ({ ...q, weight: q.type === 'case' ? 0 : Math.max(1, Math.round((q.weight / total) * 100)) })));
}

// What still needs fixing in the company's edits before the test can be saved
export const draftProblems = (test?: AssessmentTest) => (test ? test.questions.filter((q) => questionProblems(q).length > 0).length : 0);

interface DraftPreviewProps {
  test: AssessmentTest;
  onChange: (test: AssessmentTest) => void;
  // While Vetter is changing the draft, hand edits would be lost, so they wait
  locked: boolean;
  // Glows briefly when Vetter changes the draft
  flash: boolean;
  onOpenBuilder: () => void;
  // More buttons for the toolbar, e.g. the library picks
  toolbarExtra?: React.ReactNode;
  // Told which task or question is on screen, with its label ("Task 2"), so the chat can talk about it
  onViewing?: (question: Question | undefined, label: string) => void;
}

// The draft as the candidate will meet it, one task or question at a time, with the outline in a dropdown and every
// question editable in place while the conversation goes on
export const DraftPreview: React.FC<DraftPreviewProps> = ({ test, onChange, locked, flash, onOpenBuilder, toolbarExtra, onViewing }) => {
  const groups = useMemo(() => groupQuestions(test.questions), [test.questions]);
  const ordered = useMemo(() => groups.flatMap((g) => g.questions), [groups]);
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  // Answers tried out in the preview; nothing is kept
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const body = useRef<HTMLDivElement>(null);

  const at = Math.min(index, groups.length - 1);
  const group = groups[at];
  // Cases are read, not answered, so only questions are numbered
  const numberOf = (q: Question) => ordered.filter((x) => x.type !== 'case').indexOf(q) + 1;
  // Cases and tasks are numbered separately
  const isCase = (i: number) => groups[i].task?.type === 'case';
  const taskNumber = (i: number) => groups.slice(0, i + 1).filter((g, j) => g.task && isCase(j) === isCase(i)).length;
  const label = (i: number) => (groups[i].task ? `${isCase(i) ? 'Case' : 'Task'} ${taskNumber(i)}` : `Question ${numberOf(groups[i].questions[0])}`);
  const totalPoints = test.questions.reduce((sum, q) => sum + q.weight, 0) || 1;
  const broken = draftProblems(test);

  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(groups.length - 1, i)));
    body.current?.scrollTo({ top: 0 });
  };
  const shown = group?.questions[0];
  const shownLabel = group ? label(at) : '';
  useEffect(() => {
    onViewing?.(shown, shownLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown?.id, shownLabel]);
  // Back to preview while Vetter works, so nothing half-edited is replaced under the company
  useEffect(() => {
    if (locked) setMode('preview');
  }, [locked]);

  const update = (id: string, change: Partial<Question>) => onChange(withQuestions(test, test.questions.map((q) => (q.id === id ? { ...q, ...change } : q))));
  const remove = (q: Question) => {
    const followUps = isGroupType(q.type) ? test.questions.filter((f) => f.taskId === q.id) : [];
    const what = followUps.length ? `this ${q.type === 'case' ? 'case' : 'task'} and its ${followUps.length} ${followUps.length === 1 ? 'question' : 'questions'}` : 'this question';
    if (!window.confirm(`Delete ${what} from the draft?`)) return;
    const gone = new Set([q.id, ...followUps.map((f) => f.id)]);
    onChange(withQuestions(test, test.questions.filter((x) => !gone.has(x.id))));
  };
  const add = (type: QuestionType) => {
    const blank = blankQuestion(type);
    // Added while a case or task is on screen, an answer-style question becomes one of its questions
    const into = group?.task && isAnswerType(type) ? group.task.id : undefined;
    const q = into ? { ...blank, taskId: into } : blank;
    // Straight after what's on screen, so it shows next (or with it, when it joins it)
    const last = group?.questions[group.questions.length - 1];
    const pos = last ? test.questions.indexOf(last) + 1 : test.questions.length;
    onChange(withQuestions(test, [...test.questions.slice(0, pos), q, ...test.questions.slice(pos)]));
    setIndex(into ? at : group ? at + 1 : 0);
    setMode('edit');
  };
  const move = (dir: -1 | 1) => {
    const target = groups[at + dir];
    if (!target) return;
    // Groups swap whole, so a task keeps its questions with it
    const order = groups.map((g, i) => (i === at ? groups[at + dir] : i === at + dir ? group : g));
    onChange(withQuestions(test, order.flatMap((g) => g.questions)));
    setIndex(at + dir);
  };

  if (!group) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
        <p className="text-sm font-semibold text-slate-700">The draft has no questions left</p>
        <p className="text-xs text-slate-500">Ask Vetter for some in the chat, or add one yourself.</p>
        <AddMenu onAdd={add} disabled={locked} />
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col min-h-0 transition-shadow ${flash ? 'shadow-[inset_0_0_0_3px_rgba(99,102,241,0.35)]' : ''}`}>
      {/* The draft's name, the outline, moving between tasks and questions, and preview or edit */}
      <div className="px-4 py-2 border-b border-slate-200 bg-white flex items-center gap-2 flex-wrap">
        <Dropdown
          label={
            <>
              <ListTree className="w-3.5 h-3.5" />
              Structure
            </>
          }
          width="w-[22rem]"
        >
          {(close) => (
            <div className="max-h-[60vh] overflow-y-auto">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-sm font-bold text-slate-900">{test.title}</div>
                <div className="text-[11px] text-slate-500">
                  {test.difficulty} &middot; {test.questions.filter((q) => q.type !== 'case').length} questions &middot; ~{test.estimatedMinutes} min &middot; pass {test.passingScore}%
                </div>
              </div>
              {test.blueprint && test.blueprint.length > 0 && (
                <div className="px-3 py-2 border-b border-slate-100 space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">What this hire needs</div>
                  <ul className="space-y-1.5">
                    {test.blueprint.map((b) => (
                      <li key={b.skill} className="text-xs">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-slate-800">{b.skill}</span>
                          <span className="font-mono text-[11px] text-indigo-700 shrink-0">{b.weight}%</span>
                        </div>
                        <div className="text-[11px] text-slate-500 leading-snug">{b.why}</div>
                        <div className="text-[11px] text-slate-400 leading-snug">Tested by: {b.how}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ol className="py-1">
                {groups.map((g, i) => (
                  <li key={g.questions[0].id}>
                    {g.questions.map((q, j) => {
                      const problems = questionProblems(q).length > 0;
                      return (
                        <button
                          key={q.id}
                          onClick={() => (go(i), close())}
                          className={`w-full px-3 py-1.5 flex items-start gap-2 text-left hover:bg-slate-100 ${i === at ? 'bg-indigo-50/60' : ''} ${j > 0 ? 'pl-8' : ''}`}
                        >
                          <span className={`text-[11px] font-mono mt-0.5 shrink-0 ${g.task && j === 0 ? 'text-indigo-700 font-bold' : 'text-slate-400'}`}>
                            {g.task && j === 0 ? `${isCase(i) ? 'C' : 'T'}${taskNumber(i)}` : `${numberOf(q)}.`}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs text-slate-800 truncate">{q.title || 'Untitled question'}</span>
                            <span className="block text-[10px] text-slate-400">
                              {styleLabel(q)}
                              {q.type === 'app' && q.contextData ? ` · ${q.contextData}` : ''} · {q.timeLimitMinutes} min{q.type === 'case' ? ' to read' : ` · ${Math.round((q.weight / totalPoints) * 100)}%`}
                            </span>
                          </span>
                          {problems && <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-indigo-600 shrink-0" aria-label="Needs finishing" />}
                        </button>
                      );
                    })}
                  </li>
                ))}
              </ol>
              <div className="px-3 py-2 border-t border-slate-100">
                <button onClick={() => (close(), onOpenBuilder())} disabled={locked} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 disabled:opacity-40">
                  Open in the full test builder
                </button>
              </div>
            </div>
          )}
        </Dropdown>
        {toolbarExtra}

        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous" className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-700 tabular-nums min-w-[6.5rem] text-center">
            {label(at)} <span className="font-normal text-slate-400">of {groups.length}</span>
          </span>
          <button onClick={() => go(at + 1)} disabled={at === groups.length - 1} aria-label="Next" className="p-1 rounded text-slate-500 hover:bg-slate-100 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex p-0.5 bg-slate-100 rounded-lg text-xs font-semibold" role="tablist" aria-label="Preview or edit">
          {(['preview', 'edit'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              disabled={m === 'edit' && locked}
              title={m === 'edit' && locked ? 'You can edit once Vetter has finished' : undefined}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 disabled:opacity-40 ${mode === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {m === 'preview' ? <Eye className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              {m === 'preview' ? 'Preview' : 'Edit'}
            </button>
          ))}
        </div>
      </div>

      {broken > 0 && (
        <div className="px-4 py-1.5 bg-indigo-50 border-b border-slate-200 text-[11px] text-slate-800 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {broken} {broken === 1 ? 'question needs' : 'questions need'} finishing before the test can be saved. Find {broken === 1 ? 'it' : 'them'} under Structure.
        </div>
      )}

      <div ref={body} className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
        {mode === 'preview' ? (
          <PreviewGroup
            test={test}
            questions={group.questions}
            isTask={!!group.task}
            heading={label(at)}
            numberOf={numberOf}
            answers={answers}
            setAnswer={(id, val) => setAnswers((prev) => ({ ...prev, [id]: val }))}
          />
        ) : (
          <div className="p-4 space-y-4">
            {group.questions.map((q, j) => (
              <section key={q.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex-1">
                    {group.task && j === 0
                      ? `${label(at)}: ${q.type === 'case' ? 'the material to read' : 'the hands-on part'}`
                      : `Question ${numberOf(q)}${group.task ? ` (about the ${group.task.type === 'case' ? 'case' : 'task'})` : ''}`}
                  </h3>
                  <button onClick={() => remove(q)} className="p-1.5 text-slate-400 hover:text-rose-600" aria-label={`Delete question ${numberOf(q)}`} title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {questionProblems(q).length > 0 && (
                  <p className="text-[11px] text-slate-800 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    {questionProblems(q).join(' · ')}
                  </p>
                )}
                <QuestionEditor question={q} onChange={(change) => update(q.id, change)} share={Math.round((q.weight / totalPoints) * 100)} />
                {isWorkspaceType(q.type) && (
                  <p className="text-[11px] text-slate-500">The {styleLabel(q).toLowerCase()} itself is built by Vetter. Ask in the chat to change what's in it.</p>
                )}
              </section>
            ))}
            <div className="flex items-center gap-3 flex-wrap">
              <AddMenu onAdd={add} disabled={locked} />
              <button onClick={() => move(-1)} disabled={at === 0} className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-30">
                Move earlier
              </button>
              <button onClick={() => move(1)} disabled={at === groups.length - 1} className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-30">
                Move later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// One task with its questions, or one question, laid out as the candidate sees it
const PreviewGroup: React.FC<{
  test: AssessmentTest;
  questions: Question[];
  isTask: boolean;
  heading: string;
  numberOf: (q: Question) => number;
  answers: Record<string, string>;
  setAnswer: (id: string, val: string) => void;
}> = ({ test, questions, isTask, heading, numberOf, answers, setAnswer }) => {
  const [first, ...rest] = questions;
  const followUps = isTask ? rest : [];
  const answer = (q: Question) => answers[q.id] ?? (isWorkspaceType(q.type) || q.type === 'code' || q.type === 'sql' ? q.starterCode : '');
  return (
    <div className="p-4 space-y-4">
      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5" />
        What the candidate sees. Try it out: nothing you do here is kept.
      </p>
      {test.scenario && <CaseBrief scenario={test.scenario} />}
      {isTask && (
        <div className={first.type === 'case' ? 'max-h-[70vh] overflow-y-auto rounded-lg' : 'h-[30rem] max-h-[70vh]'}>
          {first.type === 'case' ? (
            <CaseMaterial question={first} />
          ) : first.type === 'sheet' ? (
            <SpreadsheetWindow key={first.id} value={answer(first)} onChange={(v) => setAnswer(first.id, v)} fileName={first.contextData || `${first.title}.xlsx`} files={test.scenario?.files} />
          ) : first.type === 'database' ? (
            <DatabaseWindow
              key={first.id}
              value={answer(first)}
              onChange={(v) => setAnswer(first.id, v)}
              tables={first.tables ?? []}
              databaseName={first.contextData || 'Database'}
              files={test.scenario?.files}
            />
          ) : (
            <AppWindow key={`${first.id}-${first.appHtml?.length ?? 0}-${first.starterCode?.length ?? 0}`} value={answers[first.id] ?? ''} onChange={(v) => setAnswer(first.id, v)} html={first.appHtml ?? ''} appName={first.contextData || first.title} />
          )}
        </div>
      )}
      {first.type !== 'case' && (
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <div className="text-xs text-slate-500 font-medium mb-1">
            {heading} &middot; {styleLabel(first)} &middot; {first.timeLimitMinutes} min
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {numberOf(first)}. {first.title || 'Untitled question'}
          </h2>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-base leading-[1.65] text-slate-700 whitespace-pre-wrap">{first.prompt || 'No question written yet.'}</div>
        {first.testCases.length > 0 && (first.type === 'sheet' || first.type === 'database' || first.type === 'app' || first.type === 'code') && (
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-800">What&rsquo;s marked ({first.testCases.length} checks)</div>
            <ul className="text-xs text-slate-600 list-disc pl-5 space-y-0.5">
              {first.testCases.map((tc) => (
                <li key={tc.id}>{tc.description}</li>
              ))}
            </ul>
          </div>
        )}
        {!isTask && (first.type === 'code' || first.type === 'sql') && (
          <textarea
            value={answer(first)}
            onChange={(e) => setAnswer(first.id, e.target.value)}
            spellCheck={false}
            aria-label="Code"
            className="w-full h-48 p-3 font-mono text-xs text-emerald-400 bg-slate-950 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        )}
        {!isTask && !(first.type === 'code' || first.type === 'sql') && <AnswerInput key={first.id} question={first} answer={answer(first)} onChange={(v) => setAnswer(first.id, v)} />}
      </div>
      )}
      {followUps.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="text-xs font-bold text-slate-800">Questions about this task</div>
          {followUps.map((q) => (
            <section key={q.id} className="space-y-2 pt-4 first:pt-0 border-t first:border-t-0 border-slate-100" aria-label={`Question ${numberOf(q)}`}>
              <h3 className="text-base font-bold text-slate-900">
                {numberOf(q)}. {q.title || 'Untitled question'}
              </h3>
              <p className="text-base leading-[1.65] text-slate-700 whitespace-pre-wrap">{q.prompt}</p>
              <AnswerInput question={q} answer={answers[q.id] ?? ''} onChange={(v) => setAnswer(q.id, v)} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

const AddMenu: React.FC<{ onAdd: (type: QuestionType) => void; disabled?: boolean }> = ({ onAdd, disabled }) => (
  <Dropdown
    disabled={disabled}
    label={
      <>
        <Plus className="w-3.5 h-3.5" />
        Add a question
      </>
    }
    width="w-56"
  >
    {(close) => (
      <ul className="py-1">
        {ADDABLE.map((type) => {
          const style = QUESTION_STYLES.find((s) => s.type === type)!;
          return (
            <li key={type}>
              <button onClick={() => (onAdd(type), close())} className="w-full px-3 py-1.5 text-left hover:bg-slate-100">
                <span className="block text-xs font-semibold text-slate-800">{style.label}</span>
                <span className="block text-[10px] text-slate-500">{style.hint}</span>
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </Dropdown>
);

// A button that opens a panel under it; closes on a click outside or Escape
export const Dropdown: React.FC<{
  label: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  width?: string;
  disabled?: boolean;
}> = ({ label, children, width = 'w-72', disabled }) => {
  const [open, setOpen] = useState(false);
  // Like every dropdown: it opens below its button, and only above when there isn't room below on screen
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      setUp(below < 320 && r.top > below);
    }
    setOpen((o) => !o);
  };
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        // Escape closes this, not the whole window
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-expanded={open}
        className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:border-indigo-400 flex items-center gap-1.5 disabled:opacity-40"
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute left-0 z-20 ${up ? 'bottom-full mb-1' : 'top-full mt-1'} ${width} max-w-[calc(100vw-2rem)] menu-panel`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};
