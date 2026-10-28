import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Play, Plus, X } from 'lucide-react';
import { Question } from '../types';
import { MOCK_DATABASE, SqlExecutionResult, executeSqlQuery } from '../lib/sqlEngine';
import { CodeExecutionResult, runJavaScriptCode } from '../lib/codeEngine';
import { QUESTION_STYLES } from '../lib/questionTypes';

// Editing one question in the test builder: what every question has, then what its style needs

export const inputClass =
  'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
export const labelClass = 'block text-xs font-semibold text-slate-700 mb-1';
const codeClass = 'w-full p-3 font-mono text-xs bg-slate-950 text-emerald-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed';

interface EditorProps {
  question: Question;
  onChange: (change: Partial<Question>) => void;
}

export const QuestionEditor: React.FC<EditorProps & { share: number }> = ({ question: q, onChange, share }) => {
  const style = QUESTION_STYLES.find((s) => s.type === q.type);
  return (
    <div className="space-y-5">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-700 font-bold">{style?.label ?? q.type}</div>
        <p className="text-xs text-slate-500">{style?.hint}</p>
      </div>

      <div>
        <label htmlFor={`${q.id}-title`} className={labelClass}>
          Title
        </label>
        <input id={`${q.id}-title`} value={q.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="e.g. Month-over-month change" className={inputClass} />
      </div>

      <div>
        <label htmlFor={`${q.id}-prompt`} className={labelClass}>
          Question
        </label>
        <textarea
          id={`${q.id}-prompt`}
          rows={4}
          value={q.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
          placeholder="What the candidate reads. Include any figures or context they need."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-sm">
        <div>
          <label htmlFor={`${q.id}-time`} className={labelClass}>
            Time (minutes)
          </label>
          <input
            id={`${q.id}-time`}
            type="number"
            min={1}
            max={120}
            value={q.timeLimitMinutes}
            onChange={(e) => onChange({ timeLimitMinutes: Math.max(1, Number(e.target.value)) })}
            className={`${inputClass} font-mono`}
          />
        </div>
        <div>
          <label htmlFor={`${q.id}-weight`} className={labelClass}>
            Points <span className="font-normal text-slate-400">({share}% of score)</span>
          </label>
          <input
            id={`${q.id}-weight`}
            type="number"
            min={1}
            max={100}
            value={q.weight}
            onChange={(e) => onChange({ weight: Math.max(1, Number(e.target.value)) })}
            className={`${inputClass} font-mono`}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200">
        {q.type === 'choice' && <OptionsEditor question={q} onChange={onChange} multiple={false} />}
        {q.type === 'multi' && <OptionsEditor question={q} onChange={onChange} multiple />}
        {q.type === 'text' && <AcceptedAnswersEditor question={q} onChange={onChange} />}
        {q.type === 'order' && <OrderEditor question={q} onChange={onChange} />}
        {q.type === 'match' && <MatchEditor question={q} onChange={onChange} />}
        {q.type === 'code' && <CodeEditor question={q} onChange={onChange} />}
        {q.type === 'sql' && <SqlEditor question={q} onChange={onChange} />}
      </div>
    </div>
  );
};

const AddButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button type="button" onClick={onClick} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1">
    <Plus className="w-3.5 h-3.5" />
    {label}
  </button>
);

const RemoveButton: React.FC<{ label: string; onClick: () => void; disabled?: boolean }> = ({ label, onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled} aria-label={label} className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 shrink-0">
    <X className="w-4 h-4" />
  </button>
);

const withItem = <T,>(list: T[], index: number, value: T) => list.map((x, i) => (i === index ? value : x));

// Multiple choice marks one right option; select-all ticks any number
const OptionsEditor: React.FC<EditorProps & { multiple: boolean }> = ({ question: q, onChange, multiple }) => {
  const options = q.options ?? [];
  const correct = new Set(multiple ? q.correctOptions ?? [] : [q.correctOption ?? 0]);
  const toggle = (i: number) =>
    multiple
      ? onChange({ correctOptions: correct.has(i) ? [...correct].filter((x) => x !== i) : [...correct, i].sort() })
      : onChange({ correctOption: i });
  const remove = (i: number) =>
    onChange({
      options: options.filter((_, x) => x !== i),
      correctOption: multiple ? undefined : Math.max(0, (q.correctOption ?? 0) - ((q.correctOption ?? 0) >= i ? 1 : 0)),
      correctOptions: multiple ? [...correct].filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)) : undefined,
    });
  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>Options {multiple ? '(tick every right one)' : '(mark the right one)'}</legend>
      {options.map((option, i) => (
        <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${correct.has(i) ? 'bg-emerald-50' : ''}`}>
          <input
            type={multiple ? 'checkbox' : 'radio'}
            name={`${q.id}-correct`}
            checked={correct.has(i)}
            onChange={() => toggle(i)}
            aria-label={`Option ${String.fromCharCode(65 + i)} is right`}
            className="accent-emerald-600"
          />
          <span className="font-mono text-xs text-slate-400 w-4">{String.fromCharCode(65 + i)}</span>
          <input
            value={option}
            onChange={(e) => onChange({ options: withItem(options, i, e.target.value) })}
            aria-label={`Option ${String.fromCharCode(65 + i)}`}
            placeholder={`Option ${String.fromCharCode(65 + i)}`}
            className={inputClass}
          />
          <RemoveButton label={`Remove option ${String.fromCharCode(65 + i)}`} onClick={() => remove(i)} disabled={options.length <= 2} />
        </div>
      ))}
      {options.length < 8 && <AddButton label="Add option" onClick={() => onChange({ options: [...options, ''] })} />}
    </fieldset>
  );
};

const AcceptedAnswersEditor: React.FC<EditorProps> = ({ question: q, onChange }) => {
  const answers = q.acceptedAnswers ?? [];
  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>Accepted answers</legend>
      <p className="text-[11px] text-slate-500 -mt-1">Any of these counts as right. Case, extra spaces and punctuation are ignored, so add each wording or spelling you'd accept.</p>
      {answers.map((a, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={a}
            onChange={(e) => onChange({ acceptedAnswers: withItem(answers, i, e.target.value) })}
            aria-label={`Accepted answer ${i + 1}`}
            placeholder="e.g. 25%"
            className={inputClass}
          />
          <RemoveButton label={`Remove accepted answer ${i + 1}`} onClick={() => onChange({ acceptedAnswers: answers.filter((_, x) => x !== i) })} disabled={answers.length <= 1} />
        </div>
      ))}
      <AddButton label="Add another accepted answer" onClick={() => onChange({ acceptedAnswers: [...answers, ''] })} />
    </fieldset>
  );
};

const OrderEditor: React.FC<EditorProps> = ({ question: q, onChange }) => {
  const items = q.items ?? [];
  const move = (from: number, to: number) => {
    const next = [...items];
    [next[from], next[to]] = [next[to], next[from]];
    onChange({ items: next });
  };
  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>Items in the right order</legend>
      <p className="text-[11px] text-slate-500 -mt-1">Candidates see them shuffled and drag them into this order. Each item in the right place earns its share.</p>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="font-mono text-xs text-slate-400 w-4">{i + 1}</span>
          <input value={item} onChange={(e) => onChange({ items: withItem(items, i, e.target.value) })} aria-label={`Item ${i + 1}`} placeholder={`Step ${i + 1}`} className={inputClass} />
          <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move item ${i + 1} up`} className="p-1.5 text-slate-400 hover:text-indigo-700 disabled:opacity-30">
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => move(i, i + 1)}
            disabled={i === items.length - 1}
            aria-label={`Move item ${i + 1} down`}
            className="p-1.5 text-slate-400 hover:text-indigo-700 disabled:opacity-30"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <RemoveButton label={`Remove item ${i + 1}`} onClick={() => onChange({ items: items.filter((_, x) => x !== i) })} disabled={items.length <= 3} />
        </div>
      ))}
      {items.length < 10 && <AddButton label="Add item" onClick={() => onChange({ items: [...items, ''] })} />}
    </fieldset>
  );
};

const MatchEditor: React.FC<EditorProps> = ({ question: q, onChange }) => {
  const pairs = q.pairs ?? [];
  const set = (i: number, side: 'left' | 'right', value: string) => onChange({ pairs: withItem(pairs, i, { ...pairs[i], [side]: value }) });
  return (
    <fieldset className="space-y-2">
      <legend className={labelClass}>Pairs</legend>
      <p className="text-[11px] text-slate-500 -mt-1">Candidates drag the answers, shuffled, onto the prompts. Each right match earns its share.</p>
      <div className="hidden sm:grid grid-cols-[1fr_1fr_2rem] gap-2 text-[11px] font-semibold text-slate-500">
        <span>Prompt</span>
        <span>Its answer</span>
      </div>
      {pairs.map((pair, i) => (
        <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_2rem] gap-2 items-center">
          <input value={pair.left} onChange={(e) => set(i, 'left', e.target.value)} aria-label={`Prompt ${i + 1}`} placeholder="e.g. Accrual" className={inputClass} />
          <input value={pair.right} onChange={(e) => set(i, 'right', e.target.value)} aria-label={`Answer for prompt ${i + 1}`} placeholder="e.g. Recorded when earned" className={inputClass} />
          <RemoveButton label={`Remove pair ${i + 1}`} onClick={() => onChange({ pairs: pairs.filter((_, x) => x !== i) })} disabled={pairs.length <= 2} />
        </div>
      ))}
      {pairs.length < 8 && <AddButton label="Add pair" onClick={() => onChange({ pairs: [...pairs, { left: '', right: '' }] })} />}
    </fieldset>
  );
};

// Coding: the starter code, test cases as arguments and expected results, and a reference solution to check them with
const CodeEditor: React.FC<EditorProps> = ({ question: q, onChange }) => {
  const [check, setCheck] = useState<CodeExecutionResult | null>(null);
  const cases = q.testCases;
  const setCase = (i: number, change: Partial<Question['testCases'][number]>) => {
    onChange({ testCases: withItem(cases, i, { ...cases[i], ...change }) });
    setCheck(null);
  };
  const runSolution = () => setCheck(runJavaScriptCode(q.solutionCode ?? '', cases));
  const fillExpected = () => {
    const result = runJavaScriptCode(q.solutionCode ?? '', cases);
    onChange({ testCases: cases.map((tc, i) => ({ ...tc, expectedOutput: result.testCaseResults[i]?.actual ?? tc.expectedOutput })) });
    setCheck(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={`${q.id}-starter`} className={labelClass}>
          Starter code
        </label>
        <p className="text-[11px] text-slate-500 mb-1.5">Candidates write a JavaScript function called solution. Its arguments come from each test case.</p>
        <textarea id={`${q.id}-starter`} rows={6} spellCheck={false} value={q.starterCode} onChange={(e) => onChange({ starterCode: e.target.value })} className={codeClass} />
      </div>

      <div className="space-y-2">
        <div className={labelClass}>Test cases</div>
        <p className="text-[11px] text-slate-500 -mt-1">
          Arguments as a JSON list, e.g. <code className="font-mono">[[3, 1, 2]]</code> calls solution([3, 1, 2]). The expected result is JSON too. Tick hidden for
          cases candidates shouldn't see before submitting.
        </p>
        {cases.map((tc, i) => (
          <div key={tc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={tc.description}
                onChange={(e) => setCase(i, { description: e.target.value })}
                aria-label={`Test case ${i + 1}: what it checks`}
                placeholder={`Case ${i + 1}: what it checks`}
                className={inputClass}
              />
              <label className="flex items-center gap-1 text-[11px] text-slate-600 shrink-0">
                <input type="checkbox" checked={!!tc.isHidden} onChange={(e) => setCase(i, { isHidden: e.target.checked })} className="accent-indigo-600" />
                Hidden
              </label>
              <RemoveButton label={`Remove test case ${i + 1}`} onClick={() => onChange({ testCases: cases.filter((_, x) => x !== i) })} disabled={cases.length <= 1} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input value={tc.input} onChange={(e) => setCase(i, { input: e.target.value })} aria-label={`Test case ${i + 1}: arguments`} placeholder="Arguments, e.g. [[3, 1, 2]]" className={`${inputClass} font-mono text-xs`} />
              <input
                value={tc.expectedOutput}
                onChange={(e) => setCase(i, { expectedOutput: e.target.value })}
                aria-label={`Test case ${i + 1}: expected result`}
                placeholder="Expected result, e.g. [1, 2, 3]"
                className={`${inputClass} font-mono text-xs`}
              />
            </div>
            {check?.testCaseResults[i] && (
              <p className={`text-[11px] font-mono ${check.testCaseResults[i].passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                {check.testCaseResults[i].passed ? 'Solution passes' : `Solution gives ${check.testCaseResults[i].actual || check.testCaseResults[i].error}`}
              </p>
            )}
          </div>
        ))}
        <AddButton label="Add test case" onClick={() => onChange({ testCases: [...cases, { id: `tc-${Date.now().toString(36)}`, description: '', input: '[]', expectedOutput: '' }] })} />
      </div>

      <div>
        <label htmlFor={`${q.id}-solution`} className={labelClass}>
          Reference solution <span className="font-normal text-slate-400">(optional, never shown to candidates)</span>
        </label>
        <textarea
          id={`${q.id}-solution`}
          rows={6}
          spellCheck={false}
          value={q.solutionCode ?? ''}
          onChange={(e) => {
            onChange({ solutionCode: e.target.value });
            setCheck(null);
          }}
          placeholder="function solution(input) { ... }"
          className={codeClass}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" onClick={runSolution} disabled={!q.solutionCode?.trim()} className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5">
            <Play className="w-3 h-3 fill-current" />
            Check test cases
          </button>
          <button type="button" onClick={fillExpected} disabled={!q.solutionCode?.trim()} className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-indigo-400 disabled:opacity-40 rounded-lg">
            Fill expected results from solution
          </button>
          {check && (
            <span className={`text-xs font-semibold self-center ${check.allPassed ? 'text-emerald-700' : 'text-rose-700'}`}>
              {check.testCaseResults.filter((r) => r.passed).length}/{check.testCaseResults.length} pass
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const TABLES = Object.keys(MOCK_DATABASE);
const tablesOf = (q: Question) => Array.from(q.contextData?.matchAll(/Table:\s*(\w+)/g) ?? []).map((m) => m[1]);

// SQL: which sample tables candidates query, and the solution whose result their query must match
const SqlEditor: React.FC<EditorProps> = ({ question: q, onChange }) => {
  const [result, setResult] = useState<SqlExecutionResult | null>(null);
  const chosen = tablesOf(q);
  const toggleTable = (name: string) => {
    const next = chosen.includes(name) ? chosen.filter((t) => t !== name) : [...chosen, name];
    onChange({ contextData: next.map((t) => `Table: ${t}`).join('\n') });
  };
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className={labelClass}>Sample tables candidates see</legend>
        <div className="flex flex-wrap gap-2">
          {TABLES.map((name) => (
            <label
              key={name}
              className={`px-2.5 py-1 rounded-full border text-xs font-mono cursor-pointer ${
                chosen.includes(name) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              <input type="checkbox" checked={chosen.includes(name)} onChange={() => toggleTable(name)} className="sr-only" />
              {name}
              <span className="opacity-60"> ({MOCK_DATABASE[name].columns.join(', ')})</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${q.id}-starter`} className={labelClass}>
          Starter query
        </label>
        <textarea id={`${q.id}-starter`} rows={3} spellCheck={false} value={q.starterCode} onChange={(e) => onChange({ starterCode: e.target.value })} className={codeClass} />
      </div>

      <div>
        <label htmlFor={`${q.id}-solution`} className={labelClass}>
          Solution query
        </label>
        <p className="text-[11px] text-slate-500 mb-1.5">
          A candidate's query passes when it returns the same rows. Row order only counts if your solution uses ORDER BY.
        </p>
        <textarea
          id={`${q.id}-solution`}
          rows={4}
          spellCheck={false}
          value={q.solutionCode ?? ''}
          onChange={(e) => {
            onChange({ solutionCode: e.target.value });
            setResult(null);
          }}
          placeholder="SELECT department, AVG(salary) FROM employees GROUP BY department ORDER BY department;"
          className={codeClass}
        />
        <button
          type="button"
          onClick={async () => setResult(await executeSqlQuery(q.solutionCode ?? ''))}
          disabled={!q.solutionCode?.trim()}
          className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-700 disabled:opacity-40 rounded-lg flex items-center gap-1.5"
        >
          <Play className="w-3 h-3 fill-current" />
          Run solution
        </button>
        {result &&
          (result.success ? (
            <div className="mt-2 border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    {result.columns.map((c) => (
                      <th key={c} className="p-2 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.rows.slice(0, 8).map((row, i) => (
                    <tr key={i}>
                      {result.columns.map((c) => (
                        <td key={c} className="p-2">
                          {String(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2 bg-slate-50 text-[11px] text-slate-500 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                {result.rowCount} {result.rowCount === 1 ? 'row' : 'rows'}: this is what candidates must return
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs font-semibold text-rose-700">{result.errorMessage}</p>
          ))}
      </div>
    </div>
  );
};

