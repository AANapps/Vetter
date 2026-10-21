import React, { useId, useState } from 'react';
import { VerifiedSkill } from '../types';
import { LeaderboardEntry } from '../lib/leaderboard';
import { RankDisc } from './RankDisc';
import { Copy, Check, X, BadgeCheck } from 'lucide-react';

export type TierKey = 'gold' | 'silver' | 'bronze' | 'developing';

export interface BadgeTierConfig {
  tierKey: TierKey;
  label: string;
  sublabel: string;
  colorName: string;
  // Tier-coloured text for scores and labels
  badgeTextColor: string;
  // A small tinted chip naming the tier
  chipClass: string;
  // Fill for score bars
  barClass: string;
  minScore: number;
  description: string;
}

const TIERS: BadgeTierConfig[] = [
  {
    tierKey: 'gold',
    label: 'Gold',
    sublabel: 'Top 1% benchmark',
    colorName: 'Gold',
    badgeTextColor: 'text-amber-700',
    chipClass: 'bg-amber-50 text-amber-800 ring-amber-200',
    barClass: 'medal-bar-gold',
    minScore: 95,
    description: 'Master-level result. Efficient, precise solutions with every edge case covered.',
  },
  {
    tierKey: 'silver',
    label: 'Silver',
    sublabel: 'Top 8% benchmark',
    colorName: 'Silver',
    badgeTextColor: 'text-slate-600',
    chipClass: 'bg-slate-100 text-slate-700 ring-slate-300',
    barClass: 'medal-bar-silver',
    minScore: 88,
    description: 'High distinction. Consistently above what senior production work demands.',
  },
  {
    tierKey: 'bronze',
    label: 'Bronze',
    sublabel: 'Top 25% verified pass',
    colorName: 'Bronze',
    badgeTextColor: 'text-orange-800',
    chipClass: 'bg-orange-50 text-orange-800 ring-orange-200',
    barClass: 'medal-bar-bronze',
    minScore: 75,
    description: 'Verified pass. Meets the bar for production engineering work.',
  },
  {
    tierKey: 'developing',
    label: 'Recorded',
    sublabel: 'Retake to verify',
    colorName: 'Unranked',
    badgeTextColor: 'text-slate-500',
    chipClass: 'bg-slate-50 text-slate-500 ring-slate-200',
    barClass: 'medal-bar-developing',
    minScore: 0,
    description: 'Result recorded below the verified bar. Retake the test to earn a badge.',
  },
];

export function getBadgeTier(score: number): BadgeTierConfig {
  return TIERS.find((t) => score >= t.minScore)!;
}

// Metallic colours for each medal: highlight, body, shadow, and the text that sits on it
const MEDAL_COLOURS: Record<TierKey, { light: string; mid: string; dark: string; ink: string }> = {
  gold: { light: '#FFF1BF', mid: '#E6B43C', dark: '#9C6A0E', ink: '#5A3B00' },
  silver: { light: '#FFFFFF', mid: '#C3CCD8', dark: '#6F7C8F', ink: '#273445' },
  bronze: { light: '#FFDCC0', mid: '#CD8550', dark: '#7F431C', ink: '#4A2307' },
  developing: { light: '#F8FAFC', mid: '#CBD5E1', dark: '#94A3B8', ink: '#475569' },
};

const EMBLEM_SIZES = { xs: 18, sm: 24, md: 40, lg: 52, xl: 72 } as const;

// A hexagonal medal in the tier's metal, with the score struck into it
export const BadgeEmblem: React.FC<{ tier: TierKey; score?: number; size?: keyof typeof EMBLEM_SIZES; className?: string }> = ({
  tier,
  score,
  size = 'md',
  className = '',
}) => {
  const id = useId().replace(/:/g, '');
  const c = MEDAL_COLOURS[tier];
  const px = EMBLEM_SIZES[size];
  const hex = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`;
    }).join(' ');
  const showScore = score !== undefined && px >= 24;

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 100 100"
      className={`shrink-0 drop-shadow-sm ${className}`}
      role="img"
      aria-label={`${getBadgeTier(score ?? TIERS.find((t) => t.tierKey === tier)!.minScore).label} badge${score !== undefined ? `, ${score}` : ''}`}
    >
      <defs>
        <linearGradient id={`rim-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.light} />
          <stop offset="0.45" stopColor={c.mid} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
        <linearGradient id={`face-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.mid} />
          <stop offset="1" stopColor={c.light} />
        </linearGradient>
      </defs>
      <polygon points={hex(48)} fill={`url(#rim-${id})`} />
      <polygon points={hex(39)} fill={`url(#face-${id})`} stroke={c.dark} strokeOpacity="0.35" strokeWidth="1.5" />
      {/* Sheen across the top */}
      <path d={`M ${hex(39).split(' ')[5]} L ${hex(39).split(' ')[0]} L ${hex(39).split(' ')[1]} L 50 42 Z`} fill="#fff" opacity="0.28" />
      {showScore ? (
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          fontWeight="800"
          fontSize={score! >= 100 ? 28 : 34}
          fill={c.ink}
        >
          {score}
        </text>
      ) : (
        <path d="M34 51 l11 11 l22 -24" fill="none" stroke={c.ink} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
};

// The score bands, for legends
export const TierLegend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
    {TIERS.slice(0, 3).map((t, i) => (
      <span key={t.tierKey} className="flex items-center gap-1.5">
        <BadgeEmblem tier={t.tierKey} size="xs" />
        <span>
          <span className="font-semibold text-slate-800">{t.label}</span> {i === 0 ? `${t.minScore}+` : `${t.minScore}–${TIERS[i - 1].minScore - 1}`}
        </span>
      </span>
    ))}
  </div>
);

const TierChip: React.FC<{ tier: BadgeTierConfig }> = ({ tier }) => (
  <span className={`inline-flex items-center px-2 py-px rounded-full text-[11px] font-semibold ring-1 ring-inset ${tier.chipClass}`}>
    {tier.label}
  </span>
);

interface VerifiedSkillBadgeProps {
  skill: VerifiedSkill;
  variant?: 'card' | 'compact' | 'showcase';
  onInspect?: () => void;
  // Card variant: the test's top performers and a link to its full leaderboard
  topPerformers?: LeaderboardEntry[];
  currentCandidateId?: string;
  onViewLeaderboard?: () => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const VerifiedSkillBadge: React.FC<VerifiedSkillBadgeProps> = ({
  skill,
  variant = 'card',
  topPerformers,
  currentCandidateId,
  onViewLeaderboard,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const tier = getBadgeTier(skill.score);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://vetted.dev/verify/${skill.skillId}-${skill.score}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const modal = isModalOpen && (
    <CertificateModal skill={skill} tier={tier} onClose={() => setIsModalOpen(false)} onCopy={handleCopyLink} copied={copiedLink} />
  );

  // A chip for rows of badges, like skills on a LinkedIn profile
  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="badge-chip inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white ring-1 ring-slate-200 hover:ring-slate-300 hover:shadow-sm transition-all"
          title={`${tier.label} badge: ${skill.skillName}, ${skill.score}/100. View credential`}
        >
          <BadgeEmblem tier={tier.tierKey} score={skill.score} size="sm" />
          <span className="text-xs font-semibold text-slate-800">{skill.skillName}</span>
          <span className={`text-[11px] font-semibold ${tier.badgeTextColor}`}>{tier.label}</span>
        </button>
        {modal}
      </>
    );
  }

  // A wide feature tile for standout results
  if (variant === 'showcase') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group w-full text-left p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all flex items-center gap-4 shadow-xs"
        >
          <BadgeEmblem tier={tier.tierKey} score={skill.score} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <TierChip tier={tier} />
              <span className="text-[11px] text-slate-500">{tier.sublabel}</span>
            </div>
            <h4 className="text-sm font-bold text-slate-900 mt-1 truncate group-hover:underline">{skill.skillName}</h4>
            <p className="text-[11px] text-slate-500">
              Vetter &middot; {skill.percentile}th percentile
            </p>
          </div>
        </button>
        {modal}
      </>
    );
  }

  // Full card: the credential, where it stands, and who leads the test
  return (
    <>
      <div className="rounded-xl bg-white border border-slate-200 p-5 flex flex-col gap-4 shadow-xs hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3.5">
          <BadgeEmblem tier={tier.tierKey} score={skill.score} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 leading-snug">{skill.skillName}</h3>
            <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5">
              <BadgeCheck className="w-3.5 h-3.5 text-indigo-600" />
              Verified by Vetter
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">Issued {formatDate(skill.verifiedAt)}</p>
          </div>
          <TierChip tier={tier} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-slate-600">
              <span className={`font-bold font-mono tabular-nums text-base ${tier.badgeTextColor}`}>{skill.score}</span>
              <span className="text-slate-400">/100</span> &middot; {skill.level}
            </span>
            <span className="text-slate-600">
              <span className="font-semibold text-slate-900 tabular-nums">{skill.percentile}th</span> percentile
            </span>
          </div>
          <div className="relative h-1.5 w-full bg-slate-100 rounded-full">
            <div className={`h-full rounded-full ${tier.barClass}`} style={{ width: `${skill.score}%` }} />
            <div className="absolute -top-0.5 -bottom-0.5 w-px bg-slate-400" style={{ left: '75%' }} title="Verified at 75" />
          </div>
        </div>

        {topPerformers && topPerformers.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-700">Top performers</span>
              {onViewLeaderboard && (
                <button onClick={onViewLeaderboard} className="text-[11px] font-semibold text-indigo-700 hover:underline">
                  Leaderboard &rarr;
                </button>
              )}
            </div>
            <ol className="space-y-1.5">
              {topPerformers.map((entry) => {
                const isYou = entry.candidate.id === currentCandidateId;
                return (
                  <li key={entry.candidate.id} className="flex items-center gap-2 text-xs">
                    <RankDisc rank={entry.rank} size="sm" />
                    <img src={entry.candidate.avatarUrl} alt="" referrerPolicy="no-referrer" className="w-5 h-5 rounded-full object-cover bg-slate-100 shrink-0" />
                    <span className={`truncate ${isYou ? 'font-bold text-indigo-700' : 'text-slate-700'}`}>{isYou ? 'You' : entry.candidate.name}</span>
                    <span className="ml-auto font-mono font-semibold tabular-nums text-slate-900">{entry.score}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-auto self-start px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:ring-slate-500 hover:bg-slate-50 transition-colors"
        >
          Show credential
        </button>
      </div>
      {modal}
    </>
  );
};

interface CertificateModalProps {
  skill: VerifiedSkill;
  tier: BadgeTierConfig;
  onClose: () => void;
  onCopy: () => void;
  copied: boolean;
}

// The credential itself: what was verified, how, and a link to share
const CertificateModal: React.FC<CertificateModalProps> = ({ skill, tier, onClose, onCopy, copied }) => {
  const credentialId = `VTD-${skill.skillId.replace('skill-', '').toUpperCase()}-${skill.score}-${skill.verifiedAt.replace(/-/g, '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div
        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`${skill.skillName} credential`}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className={`medal-banner medal-banner-${tier.tierKey} px-6 pt-8 pb-6 flex flex-col items-center text-center gap-3`}>
          <BadgeEmblem tier={tier.tierKey} score={skill.score} size="xl" />
          <div>
            <TierChip tier={tier} />
            <h3 className="text-lg font-bold text-slate-900 mt-2">{skill.skillName}</h3>
            <p className="text-xs text-slate-600 flex items-center justify-center gap-1 mt-0.5">
              <BadgeCheck className="w-3.5 h-3.5 text-indigo-600" />
              Verified by Vetter &middot; Issued {formatDate(skill.verifiedAt)}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div>
              <dt className="text-[11px] text-slate-500">Score</dt>
              <dd className={`text-xl font-bold font-mono tabular-nums ${tier.badgeTextColor}`}>{skill.score}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-500">Percentile</dt>
              <dd className="text-xl font-bold font-mono tabular-nums text-slate-900">{skill.percentile}th</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-500">Level</dt>
              <dd className="text-sm font-bold text-slate-900 pt-1">{skill.level}</dd>
            </div>
          </dl>

          <p className="text-xs text-slate-600 leading-relaxed">{tier.description}</p>

          <dl className="text-[11px] space-y-1.5 border-t border-slate-100 pt-4">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Credential ID</dt>
              <dd className="font-mono text-slate-800 truncate">{credentialId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Assessed in</dt>
              <dd className="text-slate-800">Proctored in-browser sandbox</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Integrity</dt>
              <dd className="text-slate-800">100% focus, no flags</dd>
            </div>
          </dl>

          <div className="flex items-center gap-3">
            <button
              onClick={onCopy}
              className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Link copied' : 'Copy credential link'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
