import React, { useMemo, useState } from 'react';
import { FileUp, Plus, Trash2, X } from 'lucide-react';
import { CrmConfig, CrmField, CrmObject, crmRecords } from '../../lib/deskApps';
import { fileGrid, gridToRecords, recordsToGrid } from '../../lib/deskData';
import { DataGrid, DeskCtx, FilePicker, Modal, SearchBox, TableActions, btn, input, primary } from './shared';

// The field that names a record: "name", else the first text field
const nameField = (o: CrmObject) => o.fields.find((f) => /^(name|title|subject|full_?name)$/i.test(f.key))?.key ?? o.fields[0]?.key ?? 'id';

// A Salesforce/HubSpot-style CRM: an object per tab (Contacts, Companies, Deals…), a list of its records, and a record
// page to edit it and log notes. Records import from a CSV (matched by column name) and leave as a CSV or a copied table
export const CrmApp: React.FC<{ ctx: DeskCtx; cfg: CrmConfig }> = ({ ctx, cfg }) => {
  const work = ctx.state.desk?.crm ?? {};
  const [objId, setObjId] = useState(cfg.objects[0]?.id ?? '');
  const obj = cfg.objects.find((o) => o.id === objId) ?? cfg.objects[0];
  const records = useMemo(() => (obj ? crmRecords(cfg, work, obj.id) : []), [cfg, work, obj]);
  const [q, setQ] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [creating, setCreating] = useState(false);
  if (!obj) return <div className="p-6 text-xs text-slate-500">No records.</div>;
  const nf = nameField(obj);
  const shown = records.filter((r) => !q || Object.values(r).join(' ').toLowerCase().includes(q.toLowerCase()));
  const save = (next: Record<string, string>[]) => ctx.setWork('crm', { ...work, records: { ...(work.records ?? {}), [obj.id]: next } });
  const record = records.find((r) => r.id === openId);
  const label = (r: Record<string, string> | undefined, o: CrmObject) => (r ? r[nameField(o)] || r.id : '');
  const linkName = (f: CrmField, v: string) => {
    const o = f.object && cfg.objects.find((x) => x.id === f.object);
    return o ? label(crmRecords(cfg, work, o.id).find((r) => r.id === v), o) || v : v;
  };
  const newId = () => `${obj.id.slice(0, 3)}-${Date.now().toString(36)}`;

  const importFile = (content: string, name: string) => {
    const g = fileGrid({ name: name.match(/\.(csv|tsv)$/i) ? name : `${name}.csv`, content });
    if (!g || g.length < 2) return ctx.toast('That file has no rows to import.');
    // Columns match fields by key or label, ignoring case and spaces
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const map = g[0].map((h) => obj.fields.find((f) => norm(f.key) === norm(h) || norm(f.label) === norm(h))?.key ?? (norm(h) === 'id' ? 'id' : null));
    if (!map.some(Boolean)) return ctx.toast(`None of the file's columns match ${obj.label} fields (${obj.fields.map((f) => f.label).join(', ')}).`);
    const rows = gridToRecords(g).map((r) => Object.fromEntries(Object.entries(r).flatMap(([h, v]) => (map[g[0].findIndex((x) => x.trim() === h)] ? [[map[g[0].findIndex((x) => x.trim() === h)]!, v]] : []))));
    // A row whose id (or email) matches a record updates it; the rest are added
    const next = [...records];
    let added = 0;
    let updated = 0;
    for (const r of rows) {
      const at = next.findIndex((x) => (r.id && x.id === r.id) || (r.email && x.email && x.email.toLowerCase() === r.email.toLowerCase()));
      if (at >= 0) (next[at] = { ...next[at], ...r }), updated++;
      else next.push({ ...r, id: r.id || `${obj.id.slice(0, 3)}-${(Date.now() + added).toString(36)}` }), added++;
    }
    save(next);
    setImporting(false);
    ctx.toast(`Imported ${name}: ${added} added, ${updated} updated. Unmatched columns skipped: ${g[0].filter((_, i) => !map[i]).join(', ') || 'none'}.`);
  };

  return (
    <div className="h-full flex flex-col text-[13px]" data-ref="crm">
      <header className="h-11 shrink-0 flex items-center gap-1 px-3 bg-[#032d60] text-white">
        <span className="font-bold mr-4">{cfg.name ?? 'CRM'}</span>
        {cfg.objects.map((o) => (
          <button key={o.id} onClick={() => (setObjId(o.id), setOpenId(null), setQ(''))} className={`h-11 px-3 text-[13px] border-b-[3px] ${o.id === obj.id ? 'border-white font-semibold' : 'border-transparent text-white/70 hover:text-white'}`} data-ref={`crm-${o.id}`}>
            {o.label}
          </button>
        ))}
      </header>
      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 flex flex-col">
          <div className="h-12 shrink-0 px-3 flex items-center gap-2 border-b border-slate-200">
            <h2 className="font-semibold text-slate-900">{obj.label}</h2>
            <span className="text-xs text-slate-400">{shown.length} items</span>
            <span className="ml-auto flex items-center gap-1.5">
              <div className="w-48">
                <SearchBox value={q} onChange={setQ} placeholder={`Search ${obj.label.toLowerCase()}`} />
              </div>
              <button className={btn} onClick={() => setImporting(true)}>
                <FileUp className="w-3.5 h-3.5" />
                Import
              </button>
              <TableActions ctx={ctx} name={`${obj.label}.csv`} grid={() => recordsToGrid(shown, ['id', ...obj.fields.map((f) => f.key)])} />
              <button className={primary} onClick={() => setCreating(true)} data-ref="crm-new">
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </span>
          </div>
          <div className="flex-1 overflow-auto">
            <DataGrid
              rows={shown}
              onOpen={(r) => setOpenId(r.id)}
              selected={(r) => r.id === openId}
              columns={obj.fields
                .filter((f) => f.type !== 'textarea')
                .slice(0, 7)
                .map((f) => ({
                  key: f.key,
                  label: f.label,
                  num: f.type === 'number' || f.type === 'money',
                  render: (r: Record<string, string>) =>
                    f.key === nf ? <span className="text-sky-700 font-medium hover:underline">{r[f.key] || '(no name)'}</span> : f.type === 'link' ? linkName(f, r[f.key] ?? '') : f.type === 'money' && r[f.key] ? money(r[f.key]) : r[f.key] ?? '',
                }))}
            />
          </div>
        </section>
        {record && (
          <RecordPanel
            ctx={ctx}
            cfg={cfg}
            obj={obj}
            record={record}
            onClose={() => setOpenId(null)}
            onChange={(r) => save(records.map((x) => (x.id === r.id ? r : x)))}
            onDelete={() => (save(records.filter((x) => x.id !== record.id)), setOpenId(null), ctx.toast(`${label(record, obj)} deleted`))}
          />
        )}
      </div>
      {importing && <FilePicker ctx={ctx} kinds={['csv']} title={`Import ${obj.label.toLowerCase()} from a CSV`} pasteTable onClose={() => setImporting(false)} onPick={(f) => importFile(f.content, f.name)} />}
      {creating && (
        <RecordForm
          obj={obj}
          cfg={cfg}
          ctx={ctx}
          onClose={() => setCreating(false)}
          onSave={(r) => {
            const rec = { ...r, id: newId() };
            save([...records, rec]);
            setCreating(false);
            setOpenId(rec.id);
            ctx.toast(`${obj.label.replace(/s$/, '')} created`);
          }}
        />
      )}
    </div>
  );
};

const money = (v: string) => {
  const n = Number(String(v).replace(/[£$€,]/g, ''));
  return Number.isFinite(n) ? `£${n.toLocaleString('en-GB', { maximumFractionDigits: 2 })}` : v;
};

const FieldInput: React.FC<{ f: CrmField; value: string; onChange: (v: string) => void; cfg: CrmConfig; ctx: DeskCtx }> = ({ f, value, onChange, cfg, ctx }) => {
  if (f.type === 'select')
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={input} aria-label={f.label}>
        <option value="">—</option>
        {(f.options ?? []).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );
  if (f.type === 'link') {
    const o = cfg.objects.find((x) => x.id === f.object);
    const recs = o ? crmRecords(cfg, ctx.state.desk?.crm, o.id) : [];
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={input} aria-label={f.label}>
        <option value="">—</option>
        {recs.map((r) => (
          <option key={r.id} value={r.id}>
            {(o && r[nameField(o)]) || r.id}
          </option>
        ))}
      </select>
    );
  }
  if (f.type === 'textarea') return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-[13px]" aria-label={f.label} />;
  return <input type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : 'text'} value={value} onChange={(e) => onChange(e.target.value)} className={input} aria-label={f.label} />;
};

const RecordPanel: React.FC<{ ctx: DeskCtx; cfg: CrmConfig; obj: CrmObject; record: Record<string, string>; onClose: () => void; onChange: (r: Record<string, string>) => void; onDelete: () => void }> = ({
  ctx,
  cfg,
  obj,
  record,
  onClose,
  onChange,
  onDelete,
}) => {
  const work = ctx.state.desk?.crm ?? {};
  const [note, setNote] = useState('');
  const notes = (work.notes ?? []).filter((n) => n.object === obj.id && n.id === record.id);
  // Records elsewhere that point at this one (a company's contacts and deals)
  const related = cfg.objects.flatMap((o) =>
    o.fields
      .filter((f) => f.type === 'link' && f.object === obj.id)
      .map((f) => ({ o, rows: crmRecords(cfg, work, o.id).filter((r) => r[f.key] === record.id) }))
      .filter((x) => x.rows.length)
  );
  return (
    <aside className="w-96 shrink-0 border-l border-slate-200 flex flex-col bg-slate-50" aria-label="Record">
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-start gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-slate-400">{obj.label.replace(/s$/, '')}</div>
          <h3 className="text-base font-semibold text-slate-900 truncate">{record[nameField(obj)] || record.id}</h3>
        </div>
        <button onClick={onDelete} aria-label="Delete record" title="Delete" className="ml-auto w-7 h-7 grid place-items-center rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600">
          <Trash2 className="w-4 h-4" />
        </button>
        <button onClick={onClose} aria-label="Close record" className="w-7 h-7 grid place-items-center rounded hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5">
          {obj.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="text-[11px] font-semibold text-slate-500">{f.label}</span>
              <FieldInput f={f} cfg={cfg} ctx={ctx} value={record[f.key] ?? ''} onChange={(v) => onChange({ ...record, [f.key]: v })} />
            </label>
          ))}
        </div>
        {related.map(({ o, rows }) => (
          <div key={o.id} className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-slate-700 mb-1">
              {o.label} ({rows.length})
            </div>
            {rows.map((r) => (
              <div key={r.id} className="text-xs text-slate-600 py-0.5">
                {r[nameField(o)] || r.id}
              </div>
            ))}
          </div>
        ))}
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-700">Activity</div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Log a call, a meeting or a note" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md text-[13px]" data-ref="crm-note" />
          <button
            className={btn}
            disabled={!note.trim()}
            onClick={() => {
              ctx.setWork('crm', { ...work, notes: [...(work.notes ?? []), { object: obj.id, id: record.id, text: note.trim(), at: Date.now() }] });
              setNote('');
            }}
          >
            Log activity
          </button>
          {[...notes].reverse().map((n, i) => (
            <div key={i} className="border-t border-slate-100 pt-2 text-xs">
              <div className="text-slate-400">{ctx.me.name} · just now</div>
              <div className="whitespace-pre-wrap text-slate-800">{n.text}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

const RecordForm: React.FC<{ ctx: DeskCtx; cfg: CrmConfig; obj: CrmObject; onClose: () => void; onSave: (r: Record<string, string>) => void }> = ({ ctx, cfg, obj, onClose, onSave }) => {
  const [r, setR] = useState<Record<string, string>>({});
  return (
    <Modal
      title={`New ${obj.label.replace(/s$/, '').toLowerCase()}`}
      onClose={onClose}
      wide
      footer={
        <>
          <button className={btn} onClick={onClose}>
            Cancel
          </button>
          <button className={primary} disabled={!r[nameField(obj)]?.trim()} onClick={() => onSave(r)}>
            Save
          </button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {obj.fields.map((f) => (
          <label key={f.key} className={`block ${f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
            <span className="text-[11px] font-semibold text-slate-500">{f.label}</span>
            <FieldInput f={f} cfg={cfg} ctx={ctx} value={r[f.key] ?? ''} onChange={(v) => setR({ ...r, [f.key]: v })} />
          </label>
        ))}
      </div>
    </Modal>
  );
};
