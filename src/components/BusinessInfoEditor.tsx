import React, { useEffect, useState } from 'react';
import { Building2, X } from 'lucide-react';
import { Business } from '../types';
import { Pic } from './Pic';

const inputClass =
  'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500';

export type BusinessInfo = Pick<Business, 'name' | 'logo' | 'industry' | 'headquarters' | 'companySize' | 'websiteUrl' | 'description'>;

const SIZES = ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,001–5,000', '5,000+'];

// A company's public details: what candidates see on its page and its jobs. Its owner or the Granyt team changes them
export const BusinessInfoEditor: React.FC<{ business: Business; onSave: (info: BusinessInfo) => void; onClose: () => void }> = ({ business, onSave, onClose }) => {
  const [info, setInfo] = useState<BusinessInfo>({
    name: business.name,
    logo: business.logo,
    industry: business.industry,
    headquarters: business.headquarters,
    companySize: business.companySize,
    websiteUrl: business.websiteUrl,
    description: business.description,
  });
  const set = (k: keyof BusinessInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setInfo((p) => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Company info"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!info.name.trim()) return;
          onSave({ ...info, name: info.name.trim(), websiteUrl: info.websiteUrl.trim(), logo: info.logo.trim() });
        }}
        className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
            {info.logo ? <Pic src={info.logo} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-slate-400" />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Company info</h2>
            <p className="text-xs text-slate-500">Shown on your company page and on every job you post.</p>
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700">Name</span>
          <input required value={info.name} onChange={set('name')} className={inputClass} />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700">Website</span>
            <input value={info.websiteUrl} onChange={set('websiteUrl')} placeholder="https://" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700">Logo (image link)</span>
            <input value={info.logo} onChange={set('logo')} placeholder="https://…/logo.png" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700">Industry</span>
            <input value={info.industry} onChange={set('industry')} placeholder="e.g. Fintech" className={inputClass} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-slate-700">Headquarters</span>
            <input value={info.headquarters} onChange={set('headquarters')} placeholder="e.g. London, UK" className={inputClass} />
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs font-semibold text-slate-700">Company size</span>
            <select value={info.companySize} onChange={set('companySize')} className={inputClass}>
              <option value="">Not set</option>
              {[...new Set([...SIZES, ...(info.companySize && !SIZES.includes(info.companySize) ? [info.companySize] : [])])].map((s) => (
                <option key={s} value={s}>
                  {s} employees
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-slate-700">About the company</span>
          <textarea value={info.description} onChange={set('description')} rows={4} className={inputClass} placeholder="What you do, who for, and what it's like to work there." />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 rounded-lg hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
            Save
          </button>
        </div>
      </form>
    </div>
  );
};
