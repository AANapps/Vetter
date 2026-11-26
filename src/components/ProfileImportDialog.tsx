import React, { useEffect, useRef, useState } from 'react';
import { Check, FileUp, Loader2, Sparkles, X } from 'lucide-react';
import { User } from '../types';
import { ProfilePatch, mergeProfile, readCv } from '../lib/cvImport';
import { CertificationList, EducationList, ExperienceList } from './ExperienceList';

// Filling the profile from a CV: add the PDF (or paste the text from a CV or LinkedIn), Corprax's AI reads it, and the
// candidate checks what it found before it goes on their profile. Everything can be changed by hand afterwards
export const ProfileImportDialog: React.FC<{ candidate: User; onSave: (change: Partial<User>) => void; onClose: () => void }> = ({ candidate, onSave, onClose }) => {
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [pasted, setPasted] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [found, setFound] = useState<ProfilePatch | null>(null);
  const [replace, setReplace] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const hasProfile = !!(candidate.experience?.length || candidate.education?.length || candidate.certifications?.length || candidate.bio?.trim());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !reading && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, reading]);

  const read = async (input: { file?: File; text?: string }) => {
    setReading(true);
    setError('');
    const out = await readCv(input);
    setReading(false);
    if (out.error) return setError(out.error);
    setFound(out.patch!);
  };

  const counts = found && [
    found.experience?.length && `${found.experience.length} ${found.experience.length === 1 ? 'job' : 'jobs'}`,
    found.education?.length && `${found.education.length} in education`,
    found.certifications?.length && `${found.certifications.length} ${found.certifications.length === 1 ? 'certification' : 'certifications'}`,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => !reading && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Fill in your profile from your CV" onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] flex flex-col">
        <div className="p-6 pb-4 pr-14 border-b border-slate-100">
          <button type="button" onClick={onClose} disabled={reading} aria-label="Close" className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight inline-flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Fill in your profile from your CV
          </h2>
          <p className="text-xs text-slate-500">Corprax reads your CV and fills in your experience, education and certifications. You check it before anything is saved.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!found && (
            <>
              <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold" role="tablist">
                {(['file', 'paste'] as const).map((m) => (
                  <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-md ${mode === m ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}>
                    {m === 'file' ? 'Upload a PDF' : 'Paste the text'}
                  </button>
                ))}
              </div>
              {mode === 'file' ? (
                <button
                  type="button"
                  disabled={reading}
                  onClick={() => fileRef.current?.click()}
                  className="w-full p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 text-center space-y-2 disabled:opacity-60"
                >
                  {reading ? <Loader2 className="w-7 h-7 mx-auto text-indigo-600 animate-spin" /> : <FileUp className="w-7 h-7 mx-auto text-indigo-600" />}
                  <div className="text-sm font-semibold text-slate-900">{reading ? 'Reading your CV…' : 'Choose your CV'}</div>
                  <div className="text-xs text-slate-500">A PDF up to 3MB. Saved in Word? Save it as PDF first, or paste the text instead.</div>
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    rows={10}
                    placeholder="Paste your CV, or the text of your LinkedIn profile (open it, select everything and copy)."
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    disabled={reading || pasted.trim().length < 40}
                    onClick={() => read({ text: pasted })}
                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {reading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {reading ? 'Reading…' : 'Read it'}
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf,text/plain,.txt"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  if (file) read({ file });
                }}
              />
              {error && <p className="text-xs text-rose-600">{error}</p>}
            </>
          )}

          {found && (
            <div className="space-y-5">
              <p className="text-sm text-slate-700">
                <Check className="w-4 h-4 inline text-emerald-600 mr-1" />
                Found {counts?.length ? counts.join(', ') : 'your details'}. Check it below.
              </p>
              {(found.title || found.bio) && (
                <section className="space-y-1">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">About</h3>
                  {found.title && <p className="text-sm font-semibold text-slate-900">{found.title}</p>}
                  {found.bio && <p className="text-sm text-slate-600 leading-relaxed">{found.bio}</p>}
                </section>
              )}
              {!!found.experience?.length && (
                <section className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Experience</h3>
                  <ExperienceList items={found.experience} />
                </section>
              )}
              {!!found.education?.length && (
                <section className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Education</h3>
                  <EducationList items={found.education} />
                </section>
              )}
              {!!found.certifications?.length && (
                <section className="space-y-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Certifications</h3>
                  <CertificationList items={found.certifications} />
                </section>
              )}
              {hasProfile && (
                <fieldset className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
                  <legend className="sr-only">What to do with what's already on your profile</legend>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" checked={!replace} onChange={() => setReplace(false)} className="mt-1 accent-indigo-600" />
                    <span>
                      <span className="font-semibold text-slate-900">Add to my profile</span>
                      <span className="block text-xs text-slate-500">Keeps what you've written and adds anything new from the CV.</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="radio" checked={replace} onChange={() => setReplace(true)} className="mt-1 accent-indigo-600" />
                    <span>
                      <span className="font-semibold text-slate-900">Replace with the CV</span>
                      <span className="block text-xs text-slate-500">Your experience, education, certifications and about become the CV's.</span>
                    </span>
                  </label>
                </fieldset>
              )}
            </div>
          )}
        </div>

        {found && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setFound(null)} className="text-sm font-semibold text-slate-600 hover:text-slate-900">
              Try another CV
            </button>
            <button type="button" onClick={() => onSave(mergeProfile(candidate, found, replace))} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">
              Save to my profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
