import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { JobProfile, VerifiedSkill } from '../types';

interface JobProfileEditorProps {
  profile: JobProfile;
  isNew: boolean;
  skills: VerifiedSkill[];
  // Deleting is left out when it's the only profile
  onDelete?: () => void;
  onSave: (profile: JobProfile) => void;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500';

// Create or change one job profile: what it's for, its headline and about, and which verified skills it shows
export const JobProfileEditor: React.FC<JobProfileEditorProps> = ({ profile, isNew, skills, onDelete, onSave, onClose }) => {
  const [draft, setDraft] = useState(profile);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleSkill = (skillId: string) =>
    setDraft((d) => ({
      ...d,
      skillIds: d.skillIds.includes(skillId) ? d.skillIds.filter((id) => id !== skillId) : [...d.skillIds, skillId],
    }));

  const canSave = draft.name.trim() !== '' && draft.title.trim() !== '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'New job profile' : `Edit ${profile.name} profile`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave) onSave({ ...draft, name: draft.name.trim(), title: draft.title.trim(), bio: draft.bio.trim() });
        }}
        className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="pr-8">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">{isNew ? 'New job profile' : `Edit ${profile.name} profile`}</h2>
          <p className="text-xs text-slate-500">
            Keep a profile for each kind of work you want. Companies see the one you apply with.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-700">Kind of work</span>
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Data, Customer service, Retail"
            className={inputClass}
            autoFocus
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-700">Headline</span>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="e.g. Customer Support Specialist"
            className={inputClass}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-700">About</span>
          <textarea
            value={draft.bio}
            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            rows={4}
            placeholder="What you've done and what you're looking for in this kind of work"
            className={inputClass}
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-700">Verified skills to show</legend>
          {skills.length === 0 ? (
            <p className="text-xs text-slate-500">Take a test to earn verified skills you can show here.</p>
          ) : (
            <div className="space-y-1.5">
              {skills.map((s) => (
                <label key={s.skillId} className="flex items-center gap-2 text-sm text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={draft.skillIds.includes(s.skillId)}
                    onChange={() => toggleSkill(s.skillId)}
                    className="accent-indigo-600"
                  />
                  <span className="font-medium">{s.skillName}</span>
                  <span className="text-xs font-mono text-slate-500">{s.score}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex items-center justify-between gap-3 pt-2">
          {onDelete && !isNew ? (
            <button type="button" onClick={onDelete} className="text-xs font-semibold text-rose-700 hover:underline">
              Delete profile
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {isNew ? 'Create profile' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
