import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Certification, Education, User } from '../types';
import { safeUrl } from '../lib/experience';

export type EducationDetails = Pick<User, 'education' | 'certifications'>;

const inputClass =
  'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const MAX_ITEMS = 10;
const thisMonth = () => new Date().toISOString().slice(0, 7);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block space-y-1">
    <span className="text-[11px] font-semibold text-slate-600">{label}</span>
    {children}
  </label>
);

// A candidate's education and certifications, in their own words, as on a CV
export const EducationEditor: React.FC<{ candidate: User; onSave: (details: EducationDetails) => void; onClose: () => void }> = ({ candidate, onSave, onClose }) => {
  const [schools, setSchools] = useState<Education[]>(candidate.education ?? []);
  const [certs, setCerts] = useState<Certification[]>(candidate.certifications ?? []);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setSchool = (id: string, change: Partial<Education>) => setSchools((prev) => prev.map((x) => (x.id === id ? { ...x, ...change } : x)));
  const setCert = (id: string, change: Partial<Certification>) => setCerts((prev) => prev.map((x) => (x.id === id ? { ...x, ...change } : x)));
  const clean = (s?: string, max = 100) => s?.trim().slice(0, max) || undefined;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const filledSchools = schools.filter((x) => x.school.trim() || x.subject?.trim());
    if (filledSchools.some((x) => !x.school.trim())) return setError('Each place of study needs its name.');
    if (filledSchools.some((x) => x.start && x.end && x.end < x.start)) return setError('Studies can’t end before they start.');
    const filledCerts = certs.filter((x) => x.name.trim());
    if (filledCerts.some((x) => x.url?.trim() && !safeUrl(x.url))) return setError('A certification’s link isn’t a web address.');
    const drop = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
    onSave({
      education: filledSchools.map((x) => drop({ id: x.id, school: x.school.trim().slice(0, 100), qualification: clean(x.qualification, 60), subject: clean(x.subject), start: x.start || undefined, end: x.end || undefined, grade: clean(x.grade, 40) })),
      certifications: filledCerts.map((x) => drop({ id: x.id, name: x.name.trim().slice(0, 100), issuer: clean(x.issuer, 80), issued: x.issued || undefined, expires: x.expires || undefined, url: x.url?.trim() ? safeUrl(x.url) ?? undefined : undefined })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <form role="dialog" aria-modal="true" aria-label="Education and certifications" onClick={(e) => e.stopPropagation()} onSubmit={save} className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] flex flex-col">
        <div className="p-6 pb-4 pr-14 border-b border-slate-100">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Education and certifications</h2>
          <p className="text-xs text-slate-500">Where you studied and the certifications you hold, as on your CV.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700">Education</h3>
              {schools.length < MAX_ITEMS && (
                <button type="button" onClick={() => setSchools((p) => [{ id: `edu-${Date.now()}`, school: '' }, ...p])} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Add education
                </button>
              )}
            </div>
            {schools.length === 0 && <p className="text-xs text-slate-500">A degree, school qualifications, a bootcamp or a course.</p>}
            {schools.map((x) => (
              <div key={x.id} className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="School, college or university">
                    <input value={x.school} onChange={(e) => setSchool(x.id, { school: e.target.value })} placeholder="University of Leeds" className={inputClass} />
                  </Field>
                  <Field label="Qualification">
                    <input value={x.qualification ?? ''} onChange={(e) => setSchool(x.id, { qualification: e.target.value })} placeholder="BSc" className={inputClass} />
                  </Field>
                  <Field label="Subject">
                    <input value={x.subject ?? ''} onChange={(e) => setSchool(x.id, { subject: e.target.value })} placeholder="Computer Science" className={inputClass} />
                  </Field>
                  <Field label="Grade (optional)">
                    <input value={x.grade ?? ''} onChange={(e) => setSchool(x.id, { grade: e.target.value })} placeholder="First" className={inputClass} />
                  </Field>
                  <Field label="Started">
                    <input type="month" value={x.start ?? ''} onChange={(e) => setSchool(x.id, { start: e.target.value || undefined })} className={inputClass} />
                  </Field>
                  <Field label="Finished (or expected)">
                    <input type="month" value={x.end ?? ''} onChange={(e) => setSchool(x.id, { end: e.target.value || undefined })} className={inputClass} />
                  </Field>
                </div>
                <div className="text-right">
                  <button type="button" onClick={() => setSchools((p) => p.filter((y) => y.id !== x.id))} className="text-xs text-slate-400 hover:text-rose-600 inline-flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700">Certifications</h3>
              {certs.length < MAX_ITEMS && (
                <button type="button" onClick={() => setCerts((p) => [{ id: `cert-${Date.now()}`, name: '' }, ...p])} className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Add a certification
                </button>
              )}
            </div>
            {certs.length === 0 && <p className="text-xs text-slate-500">AWS, CompTIA, CIPD, a first aid certificate, a driving licence class.</p>}
            {certs.map((x) => (
              <div key={x.id} className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Certification">
                    <input value={x.name} onChange={(e) => setCert(x.id, { name: e.target.value })} placeholder="AWS Certified Cloud Practitioner" className={inputClass} />
                  </Field>
                  <Field label="Issued by">
                    <input value={x.issuer ?? ''} onChange={(e) => setCert(x.id, { issuer: e.target.value })} placeholder="Amazon Web Services" className={inputClass} />
                  </Field>
                  <Field label="Issued">
                    <input type="month" value={x.issued ?? ''} max={thisMonth()} onChange={(e) => setCert(x.id, { issued: e.target.value || undefined })} className={inputClass} />
                  </Field>
                  <Field label="Expires (optional)">
                    <input type="month" value={x.expires ?? ''} onChange={(e) => setCert(x.id, { expires: e.target.value || undefined })} className={inputClass} />
                  </Field>
                </div>
                <Field label="Link to check it (optional)">
                  <input value={x.url ?? ''} onChange={(e) => setCert(x.id, { url: e.target.value })} placeholder="credly.com/badges/…" className={inputClass} />
                </Field>
                <div className="text-right">
                  <button type="button" onClick={() => setCerts((p) => p.filter((y) => y.id !== x.id))} className="text-xs text-slate-400 hover:text-rose-600 inline-flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-rose-600">{error}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
