import React, { useState } from 'react';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { DeskForm, FormEntry, FormsConfig } from '../../lib/deskApps';
import { recordsToGrid } from '../../lib/deskData';
import { DataGrid, DeskCtx, TableActions, btn, input, primary } from './shared';

// Internal forms built from a schema (a refund request, an incident report, a new starter): fill one in with its
// checks (required fields, emails, numbers, dates), submit it, and see every entry, which leaves as a CSV or a table
export const FormsApp: React.FC<{ ctx: DeskCtx; cfg: FormsConfig }> = ({ ctx, cfg }) => {
  const entries = ctx.state.desk?.forms?.entries ?? [];
  const [formId, setFormId] = useState(cfg.forms[0]?.id ?? '');
  const [tab, setTab] = useState<'fill' | 'entries'>('fill');
  const form = cfg.forms.find((f) => f.id === formId) ?? cfg.forms[0];
  if (!form) return <div className="p-6 text-xs text-slate-500">No forms.</div>;
  const mine = entries.filter((e) => e.form === form.id);
  const all = [...(form.entries ?? []).map((v) => ({ ...v, submitted_by: v.submitted_by ?? '' })), ...mine.map((e) => ({ ...e.values, submitted_by: ctx.me.name }))];
  return (
    <div className="h-full flex text-[13px]" data-ref="forms">
      <aside className="w-60 shrink-0 bg-slate-50 border-r border-slate-200 overflow-y-auto">
        <div className="px-3 h-11 flex items-center gap-2 font-bold text-slate-800 border-b border-slate-200">
          <ClipboardList className="w-4 h-4 text-violet-600" />
          {cfg.name ?? 'Forms'}
        </div>
        {cfg.forms.map((f) => (
          <button key={f.id} onClick={() => (setFormId(f.id), setTab('fill'))} className={`w-full text-left px-3 py-2 border-b border-slate-100 ${f.id === form.id ? 'bg-white font-semibold text-slate-900' : 'text-slate-600 hover:bg-white/70'}`} data-ref={`form-${f.id}`}>
            {f.title}
            <span className="block text-[11px] font-normal text-slate-400">{entries.filter((e) => e.form === f.id).length} submitted by you</span>
          </button>
        ))}
      </aside>
      <section className="flex-1 min-w-0 flex flex-col">
        <div className="h-11 shrink-0 px-3 flex items-center gap-1 border-b border-slate-200">
          {(['fill', 'entries'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`h-11 px-3 border-b-2 ${tab === t ? 'border-violet-600 font-semibold text-slate-900' : 'border-transparent text-slate-500'}`}>
              {t === 'fill' ? 'Fill in' : `Entries (${all.length})`}
            </button>
          ))}
          {tab === 'entries' && (
            <span className="ml-auto flex gap-1.5">
              <TableActions ctx={ctx} name={`${form.title} entries.csv`} grid={() => recordsToGrid(all, [...form.fields.map((f) => f.key), 'submitted_by'])} />
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {tab === 'fill' ? (
            <FormFill
              key={form.id + mine.length}
              form={form}
              onSubmit={(values) => {
                const e: FormEntry = { form: form.id, values, at: Date.now() };
                ctx.setWork('forms', { entries: [...entries, e] });
                ctx.toast(`${form.title} submitted`);
              }}
              done={mine.length}
            />
          ) : (
            <DataGrid rows={all.map((r, i) => ({ id: i, ...r }))} columns={[...form.fields.map((f) => ({ key: f.key, label: f.label })), { key: 'submitted_by', label: 'Submitted by' }]} empty="No entries yet." />
          )}
        </div>
      </section>
    </div>
  );
};

const FormFill: React.FC<{ form: DeskForm; onSubmit: (v: Record<string, string>) => void; done: number }> = ({ form, onSubmit, done }) => {
  const [v, setV] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);
  const check = () => {
    const e: Record<string, string> = {};
    for (const f of form.fields) {
      const x = (v[f.key] ?? '').trim();
      if (f.required && !x && f.type !== 'checkbox') e[f.key] = 'Required';
      else if (f.required && f.type === 'checkbox' && x !== 'yes') e[f.key] = 'Required';
      else if (x && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)) e[f.key] = 'Enter a valid email';
      else if (x && (f.type === 'number' || f.type === 'money') && !Number.isFinite(Number(x.replace(/[£$€,]/g, '')))) e[f.key] = 'Enter a number';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  if (sent)
    return (
      <div className="max-w-xl mx-auto p-8 text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
        <p className="font-semibold text-slate-900">Your response has been recorded.</p>
        <button className={btn} onClick={() => (setSent(false), setV({}))}>
          Submit another response
        </button>
      </div>
    );
  return (
    <form
      className="max-w-xl mx-auto p-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!check()) return;
        onSubmit(v);
        setSent(true);
      }}
      noValidate
    >
      <div className="border-t-8 border-violet-600 rounded-lg bg-white shadow-sm p-5 border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900">{form.title}</h2>
        {form.description && <p className="text-slate-600 mt-1 whitespace-pre-wrap">{form.description}</p>}
        {done > 0 && <p className="text-[11px] text-slate-400 mt-2">You've submitted this {done} time{done > 1 ? 's' : ''}.</p>}
      </div>
      {form.fields.map((f) => (
        <div key={f.key} className={`rounded-lg bg-white shadow-sm p-4 border ${errors[f.key] ? 'border-rose-400' : 'border-slate-200'}`}>
          <label className="block font-medium text-slate-800 mb-1.5" htmlFor={`ff-${f.key}`}>
            {f.label}
            {f.required && <span className="text-rose-600"> *</span>}
          </label>
          {f.help && <p className="text-[11.5px] text-slate-500 -mt-1 mb-1.5">{f.help}</p>}
          {f.type === 'textarea' ? (
            <textarea id={`ff-${f.key}`} value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} rows={4} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md" />
          ) : f.type === 'select' ? (
            <select id={`ff-${f.key}`} value={v[f.key] ?? ''} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} className={input}>
              <option value="">Choose</option>
              {(f.options ?? []).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : f.type === 'radio' ? (
            <div className="space-y-1">
              {(f.options ?? []).map((o) => (
                <label key={o} className="flex items-center gap-2">
                  <input type="radio" name={f.key} checked={v[f.key] === o} onChange={() => setV({ ...v, [f.key]: o })} />
                  {o}
                </label>
              ))}
            </div>
          ) : f.type === 'checkbox' ? (
            <label className="flex items-center gap-2">
              <input id={`ff-${f.key}`} type="checkbox" checked={v[f.key] === 'yes'} onChange={(e) => setV({ ...v, [f.key]: e.target.checked ? 'yes' : '' })} />
              Yes
            </label>
          ) : (
            <input
              id={`ff-${f.key}`}
              type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
              inputMode={f.type === 'number' || f.type === 'money' ? 'decimal' : undefined}
              value={v[f.key] ?? ''}
              onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              className={input}
            />
          )}
          {errors[f.key] && <p className="text-[11.5px] text-rose-600 mt-1">{errors[f.key]}</p>}
        </div>
      ))}
      <div className="flex gap-2">
        <button className={primary} data-ref="form-submit">
          Submit
        </button>
        <button type="button" className={btn} onClick={() => (setV({}), setErrors({}))}>
          Clear form
        </button>
      </div>
    </form>
  );
};
