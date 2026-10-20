import React, { useEffect } from 'react';
import { User } from '../types';
import { VerifiedSkillBadge } from './VerifiedSkillBadge';
import { MapPin, X } from 'lucide-react';

interface PersonProfileModalProps {
  person: User;
  isYou: boolean;
  // Left out where following doesn't apply (the business view)
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  onClose: () => void;
}

// A quick look at someone found through search: who they are and what they've verified
export const PersonProfileModal: React.FC<PersonProfileModalProps> = ({ person, isYou, isFollowing, onToggleFollow, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const skills = [...person.verifiedSkills].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={person.name}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 pr-8">
          <img
            src={person.avatarUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full object-cover bg-slate-100 shrink-0"
          />
          <div className="min-w-0 space-y-0.5">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {person.name}
              {isYou && <span className="text-slate-400 font-normal"> (you)</span>}
            </h2>
            <p className="text-xs text-slate-700 font-medium">{person.title}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {person.location} &middot; {person.yearsExperience} yrs experience &middot; {person.workPreference}
            </p>
          </div>
        </div>

        {!isYou && onToggleFollow && (
          <button
            onClick={onToggleFollow}
            className={`w-full py-2 text-xs font-semibold rounded-lg transition-colors ${
              isFollowing ? 'text-slate-700 bg-white' : 'text-white bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}

        {person.bio && <p className="text-sm text-slate-600 leading-relaxed">{person.bio}</p>}

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900">Verified skills</h3>
          {skills.length === 0 ? (
            <p className="text-xs text-slate-500">No verified skills yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <VerifiedSkillBadge key={s.skillId} skill={s} variant="compact" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
