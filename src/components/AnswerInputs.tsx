import React, { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical, X } from 'lucide-react';
import { Question } from '../types';
import { matchAnswer, multiAnswer, orderAnswer, shuffledIndexes } from '../lib/questionTypes';

interface AnswerInputProps {
  question: Question;
  answer: string;
  onChange: (answer: string) => void;
}

// The right-hand pane of the test runner for questions answered by picking, typing or arranging
export const AnswerInput: React.FC<AnswerInputProps> = (props) => {
  const { question: q } = props;
  const heading: Record<string, string> = {
    choice: 'Choose one answer',
    multi: 'Select all that apply',
    text: 'Type your answer',
    order: 'Drag the items into the right order',
    match: 'Drag each answer onto the prompt it belongs to',
  };
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-800">{heading[q.type]}</h3>
      {q.type === 'choice' && <SingleChoice {...props} />}
      {q.type === 'multi' && <MultiChoice {...props} />}
      {q.type === 'text' && <ShortAnswer {...props} />}
      {q.type === 'order' && <OrderItems {...props} />}
      {q.type === 'match' && <MatchPairs {...props} />}
      <p className="text-[11px] text-slate-500 pt-1">
        You can change your answer until you submit. Answers are marked when you submit the test
        {q.type === 'multi' || q.type === 'order' || q.type === 'match' ? ', with credit for each part you get right' : ''}.
      </p>
    </div>
  );
};

const optionClass = (selected: boolean) =>
  `flex items-start gap-3 p-4 rounded-lg bg-white cursor-pointer text-sm transition-colors ${
    selected ? 'ring-2 ring-indigo-500 text-slate-900' : 'text-slate-700 hover:bg-slate-100'
  }`;

const Letter: React.FC<{ i: number }> = ({ i }) => <span className="font-mono text-xs text-slate-400 mr-2">{String.fromCharCode(65 + i)}</span>;

const SingleChoice: React.FC<AnswerInputProps> = ({ question: q, answer, onChange }) => (
  <fieldset className="space-y-3">
    <legend className="sr-only">Choose one answer</legend>
    {(q.options ?? []).map((option, i) => (
      <label key={i} className={optionClass(answer === String(i))}>
        <input type="radio" name={`answer-${q.id}`} checked={answer === String(i)} onChange={() => onChange(String(i))} className="mt-0.5 accent-indigo-600" />
        <span>
          <Letter i={i} />
          {option}
        </span>
      </label>
    ))}
  </fieldset>
);

const MultiChoice: React.FC<AnswerInputProps> = ({ question: q, answer, onChange }) => {
  const picked = multiAnswer(answer);
  const toggle = (i: number) => onChange(JSON.stringify(picked.includes(i) ? picked.filter((x) => x !== i) : [...picked, i].sort()));
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Select all that apply</legend>
      {(q.options ?? []).map((option, i) => (
        <label key={i} className={optionClass(picked.includes(i))}>
          <input type="checkbox" checked={picked.includes(i)} onChange={() => toggle(i)} className="mt-0.5 accent-indigo-600" />
          <span>
            <Letter i={i} />
            {option}
          </span>
        </label>
      ))}
    </fieldset>
  );
};

const ShortAnswer: React.FC<AnswerInputProps> = ({ question: q, answer, onChange }) => (
  <input
    value={answer}
    onChange={(e) => onChange(e.target.value)}
    aria-label={`Answer to ${q.title}`}
    placeholder="Your answer"
    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
  />
);

// Drag a row by its handle, or move it with the arrow buttons
const OrderItems: React.FC<AnswerInputProps> = ({ question: q, answer, onChange }) => {
  const order = orderAnswer(q, answer);
  const items = q.items ?? [];
  const [dragging, setDragging] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(JSON.stringify(next));
  };
  return (
    <ol className="space-y-2">
      {order.map((itemIndex, position) => (
        <li
          key={itemIndex}
          draggable
          onDragStart={(e) => {
            setDragging(position);
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (dragging !== null) move(dragging, position);
            setDragging(null);
          }}
          onDragEnd={() => setDragging(null)}
          className={`flex items-center gap-2 p-3 bg-white rounded-lg border text-sm text-slate-800 cursor-grab active:cursor-grabbing ${
            dragging === position ? 'border-indigo-400 opacity-50' : 'border-slate-200'
          }`}
        >
          <GripVertical className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="font-mono text-xs text-slate-400 w-4">{position + 1}</span>
          <span className="flex-1 min-w-0">{items[itemIndex]}</span>
          <button
            type="button"
            onClick={() => move(position, position - 1)}
            disabled={position === 0}
            aria-label={`Move "${items[itemIndex]}" up`}
            className="p-1 text-slate-400 hover:text-indigo-700 disabled:opacity-30"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => move(position, position + 1)}
            disabled={position === order.length - 1}
            aria-label={`Move "${items[itemIndex]}" down`}
            className="p-1 text-slate-400 hover:text-indigo-700 disabled:opacity-30"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </li>
      ))}
    </ol>
  );
};

// Drag an answer chip onto a prompt, or click a chip then click the prompt
const MatchPairs: React.FC<AnswerInputProps> = ({ question: q, answer, onChange }) => {
  const pairs = q.pairs ?? [];
  const placed = matchAnswer(q, answer);
  const [held, setHeld] = useState<number | null>(null);
  const pool = shuffledIndexes(q.id, pairs.length).filter((i) => !placed.includes(i));

  const place = (answerIndex: number, prompt: number) => {
    const next = placed.map((a) => (a === answerIndex ? null : a));
    next[prompt] = answerIndex;
    onChange(JSON.stringify(next));
    setHeld(null);
  };
  const clear = (prompt: number) => onChange(JSON.stringify(placed.map((a, i) => (i === prompt ? null : a))));

  const chip = (answerIndex: number, inSlot?: number) => (
    <button
      type="button"
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(answerIndex))}
      onClick={() => (inSlot === undefined ? setHeld(held === answerIndex ? null : answerIndex) : clear(inSlot))}
      aria-pressed={inSlot === undefined ? held === answerIndex : undefined}
      aria-label={inSlot === undefined ? undefined : `Remove "${pairs[answerIndex].right}"`}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium cursor-grab active:cursor-grabbing transition-colors ${
        held === answerIndex ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-900 hover:bg-indigo-100'
      }`}
    >
      {pairs[answerIndex].right}
      {inSlot !== undefined && <X className="w-3 h-3" />}
    </button>
  );

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {pairs.map((pair, prompt) => (
          <li
            key={prompt}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const index = Number(e.dataTransfer.getData('text/plain'));
              if (!Number.isNaN(index)) place(index, prompt);
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center p-3 bg-white rounded-lg border border-slate-200"
          >
            <span className="text-sm text-slate-800">{pair.left}</span>
            <div
              role={held !== null ? 'button' : undefined}
              tabIndex={held !== null ? 0 : undefined}
              onClick={() => held !== null && place(held, prompt)}
              onKeyDown={(e) => held !== null && (e.key === 'Enter' || e.key === ' ') && place(held, prompt)}
              className={`min-h-10 px-2 py-1.5 rounded-lg border-2 border-dashed flex items-center ${
                held !== null ? 'border-indigo-300 bg-indigo-50/50 cursor-pointer' : 'border-slate-200'
              }`}
            >
              {placed[prompt] !== null && placed[prompt] !== undefined ? (
                chip(placed[prompt]!, prompt)
              ) : (
                <span className="text-xs text-slate-400">{held !== null ? 'Click to place here' : 'Drop an answer here'}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-slate-500">Answers</div>
        <div className="flex flex-wrap gap-2 min-h-10 p-2 bg-white border border-slate-200 rounded-lg">
          {pool.length === 0 ? <span className="text-xs text-slate-400 px-1 py-1.5">All placed</span> : pool.map((i) => <React.Fragment key={i}>{chip(i)}</React.Fragment>)}
        </div>
      </div>
    </div>
  );
};
