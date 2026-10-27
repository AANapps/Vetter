import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { CareerStage, User } from '../types';
import { CAREER_STAGES, SUBJECTS, stageOf } from '../lib/audience';

export type Studies = Pick<User, 'careerStage' | 'studySubject' | 'university' | 'location' | 'yearsExperience'>;

interface StudiesEditorProps {
  candidate: User;
  onSave: (studies: Studies) => void;
  onClose: () => void;
}

const inputClass =
  'w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500';

const STAGE_HINTS: Record<CareerStage, string> = {
  Student: 'Studying now',
  Graduate: 'Finished in the last couple of years',
  Working: 'In work',
};

// Where a candidate is in their career: companies use it to find students, graduates and juniors to send tests to
export const StudiesEditor: React.FC<StudiesEditorProps> = ({ candidate, onSave, onClose }) => {
  const [stage, setStage] = useState<CareerStage>(stageOf(candidate));
  const [subject, setSubject] = useState(candidate.studySubject ?? '');
  const [university, setUniversity] = useState(candidate.university ?? '');
  const [location, setLocation] = useState(candidate.location);
  const [years, setYears] = useState(candidate.yearsExperience);

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
        aria-label="Studies and experience"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({
            careerStage: stage,
            studySubject: subject || undefined,
            university: university.trim() || undefined,
            location: location.trim() || candidate.location,
            yearsExperience: Math.max(0, years),
          });
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
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Studies and experience</h2>
          <p className="text-xs text-slate-500">Companies use this to send tests to people like you. Invites arrive at {candidate.email}.</p>
        </div>

        <fieldset className="space-y-1.5">
          <legend className="text-xs font-semibold text-slate-700 mb-1.5">Right now I'm</legend>
          <div className="grid grid-cols-3 gap-2">
            {CAREER_STAGES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStage(s)}
                aria-pressed={stage === s}
                className={`px-3 py-2 rounded-lg border text-left ${
                  stage === s ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600' : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <span className="block text-sm font-semibold text-slate-900">{s === 'Working' ? 'Working' : `A ${s.toLowerCase()}`}</span>
                <span className="block text-[11px] text-slate-500">{STAGE_HINTS[s]}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Subject {stage === 'Working' && <span className="font-normal text-slate-400">(optional)</span>}</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass}>
              <option value="">None</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">University</span>
            <input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="e.g. UCL" className={inputClass} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Location</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. London, UK" className={inputClass} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-700">Years of work experience</span>
            <input type="number" min={0} max={50} value={years} onChange={(e) => setYears(Number(e.target.value))} className={`${inputClass} font-mono`} />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white rounded-lg">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
            Save
          </button>
        </div>
      </form>
    </div>
  );
};
