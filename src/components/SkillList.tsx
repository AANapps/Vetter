import React, { useState } from 'react';
import { BadgeCheck, Plus, X } from 'lucide-react';

const MAX_SKILLS = 40;
const MAX_LENGTH = 40;

// Whether a skill they listed has been verified by one of Vetter's tests (matched by name, ignoring case)
const verifiedBy = (skill: string, verified: string[]) => {
  const a = skill.toLowerCase();
  return verified.some((v) => {
    const b = v.toLowerCase();
    return a === b || (a.length >= 3 && b.length >= 3 && (b.includes(a) || a.includes(b)));
  });
};

/**
 * The skills someone lists in their own words. Editable: type one and press + (or Enter) to add it, × to remove it.
 * A skill that matches one of their verified skills shows a tick; the rest are marked as their own claim.
 */
export const SkillList: React.FC<{ skills: string[]; verified?: string[]; onChange?: (skills: string[]) => void }> = ({ skills, verified = [], onChange }) => {
  const [draft, setDraft] = useState('');
  const add = () => {
    const skill = draft.trim().replace(/\s+/g, ' ').slice(0, MAX_LENGTH);
    if (!skill || !onChange) return;
    if (!skills.some((s) => s.toLowerCase() === skill.toLowerCase()) && skills.length < MAX_SKILLS) onChange([...skills, skill]);
    setDraft('');
  };

  return (
    <div className="space-y-3">
      {skills.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {skills.map((s) => {
            const checked = verifiedBy(s, verified);
            return (
              <li
                key={s}
                className={`inline-flex items-center gap-1.5 pl-3 ${onChange ? 'pr-1.5' : 'pr-3'} py-1 rounded-full border text-sm ${
                  checked ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
                title={checked ? 'Verified by a Vetter test' : 'Listed by them; not yet verified by a test'}
              >
                {checked && <BadgeCheck className="w-3.5 h-3.5" />}
                {s}
                {onChange && (
                  <button onClick={() => onChange(skills.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="p-0.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {onChange && (
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add();
              }
            }}
            maxLength={MAX_LENGTH}
            placeholder={skills.length ? 'Add another skill' : 'Type a skill, e.g. Excel, SQL, customer service'}
            aria-label="New skill"
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={add}
            disabled={!draft.trim() || skills.length >= MAX_SKILLS}
            aria-label="Add skill"
            className="w-10 h-10 shrink-0 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
