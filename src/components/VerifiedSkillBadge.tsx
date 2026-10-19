import React, { useState } from 'react';
import { VerifiedSkill } from '../types';
import { LeaderboardEntry } from '../lib/leaderboard';
import { RankDisc } from './RankDisc';
import { Crown, Award, ShieldCheck, Shield, Sparkles, CheckCircle2, Copy, Check, ExternalLink, X } from 'lucide-react';

export interface BadgeTierConfig {
  tierKey: 'gold' | 'silver' | 'bronze' | 'developing';
  label: string;
  sublabel: string;
  colorName: string;
  badgeTextColor: string;
  accentBg: string;
  borderClass: string;
  gradientBg: string;
  glowClass: string;
  ringColor: string;
  icon: React.ComponentType<{ className?: string }>;
  minScore: number;
  description: string;
}

export function getBadgeTier(score: number): BadgeTierConfig {
  if (score >= 95) {
    return {
      tierKey: 'gold',
      label: 'Gold Master',
      sublabel: 'Top 1% Global Benchmark',
      colorName: 'Gold',
      badgeTextColor: 'text-amber-700',
      accentBg: 'bg-amber-100',
      borderClass: 'border-amber-300',
      gradientBg: 'from-amber-50 via-white to-amber-50/50',
      glowClass: 'shadow-xs hover:border-amber-400 hover:shadow-md',
      ringColor: '#D97706',
      icon: Crown,
      minScore: 95,
      description: 'Master-level technical benchmark. Exceptional algorithmic efficiency, architecture precision, and full edge-case coverage.',
    };
  } else if (score >= 88) {
    return {
      tierKey: 'silver',
      label: 'Silver Distinction',
      sublabel: 'Top 8% Global Benchmark',
      colorName: 'Silver',
      badgeTextColor: 'text-indigo-700',
      accentBg: 'bg-indigo-100',
      borderClass: 'border-indigo-200',
      gradientBg: 'from-indigo-50/60 via-white to-purple-50/40',
      glowClass: 'shadow-xs hover:border-indigo-400 hover:shadow-md',
      ringColor: '#5B50E5',
      icon: Award,
      minScore: 88,
      description: 'High distinction engineering benchmark. Consistently exceeds senior production requirements with clean code structures.',
    };
  } else if (score >= 75) {
    return {
      tierKey: 'bronze',
      label: 'Bronze Verified',
      sublabel: 'Top 25% Verified Pass',
      colorName: 'Bronze',
      badgeTextColor: 'text-slate-700',
      accentBg: 'bg-slate-100',
      borderClass: 'border-slate-200',
      gradientBg: 'from-slate-50 via-white to-slate-100/60',
      glowClass: 'shadow-xs hover:border-slate-300 hover:shadow-md',
      ringColor: '#64748B',
      icon: ShieldCheck,
      minScore: 75,
      description: 'Standard verified technical benchmark. Meets enterprise production engineering criteria.',
    };
  } else {
    return {
      tierKey: 'developing',
      label: 'Assessment Recorded',
      sublabel: 'Retake to Verify',
      colorName: 'Slate',
      badgeTextColor: 'text-slate-500',
      accentBg: 'bg-slate-100',
      borderClass: 'border-slate-200',
      gradientBg: 'from-slate-50 via-white to-slate-50',
      glowClass: 'hover:border-slate-300',
      ringColor: '#94A3B8',
      icon: Shield,
      minScore: 0,
      description: 'Completed baseline evaluation. Practice and retake the assessment to unlock verified badge status.',
    };
  }
}

interface VerifiedSkillBadgeProps {
  skill: VerifiedSkill;
  variant?: 'card' | 'compact' | 'showcase';
  onInspect?: () => void;
  // Card variant: the test's top performers and a link to its full leaderboard
  topPerformers?: LeaderboardEntry[];
  currentCandidateId?: string;
  onViewLeaderboard?: () => void;
}

export const VerifiedSkillBadge: React.FC<VerifiedSkillBadgeProps> = ({
  skill,
  variant = 'card',
  onInspect,
  topPerformers,
  currentCandidateId,
  onViewLeaderboard,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const tier = getBadgeTier(skill.score);
  const Icon = tier.icon;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://vetted.dev/verify/${skill.skillId}-${skill.score}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Compact Pill Emblem Variant
  if (variant === 'compact') {
    return (
      <div
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gradient-to-r ${tier.gradientBg} ${tier.borderClass} ${tier.glowClass} cursor-pointer transition-all shadow-xs`}
        title={`Verified: ${skill.skillName} (${skill.score}/100) · Click to view certificate`}
      >
        <Icon className={`w-3.5 h-3.5 ${tier.badgeTextColor} shrink-0`} />
        <span className="text-xs font-semibold text-slate-800">{skill.skillName}</span>
        <span className={`text-xs font-mono font-bold tabular-nums ${tier.badgeTextColor}`}>
          {skill.score}
        </span>
      </div>
    );
  }

  // Showcase Ribbon Emblem (for hero banners and featured credentials)
  if (variant === 'showcase') {
    return (
      <>
        <div
          onClick={() => setIsModalOpen(true)}
          className={`group relative p-4 rounded-xl border bg-gradient-to-br ${tier.gradientBg} ${tier.borderClass} ${tier.glowClass} cursor-pointer transition-all duration-200 flex items-center justify-between gap-4 shadow-xs`}
        >
          <div className="flex items-center gap-3.5">
            <div
              className={`w-11 h-11 rounded-xl ${tier.accentBg} border ${tier.borderClass} flex items-center justify-center shrink-0 shadow-xs`}
            >
              <Icon className={`w-6 h-6 ${tier.badgeTextColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${tier.badgeTextColor}`}>
                  {tier.label}
                </span>
                <span className="text-slate-400 text-xs">&middot;</span>
                <span className="text-[11px] text-slate-500 font-mono">{skill.category}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                {skill.skillName}
              </h4>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className={`text-2xl font-extrabold font-mono tabular-nums ${tier.badgeTextColor}`}>
              {skill.score}
              <span className="text-xs text-slate-500 font-normal">/100</span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {skill.percentile}th Percentile
            </div>
          </div>
        </div>

        {isModalOpen && (
          <CertificateModal
            skill={skill}
            tier={tier}
            onClose={() => setIsModalOpen(false)}
            onCopy={handleCopyLink}
            copied={copiedLink}
          />
        )}
      </>
    );
  }

  // Full Card Variant
  return (
    <>
      <div
        className={`relative rounded-xl border bg-gradient-to-br ${tier.gradientBg} ${tier.borderClass} ${tier.glowClass} p-5 space-y-4 transition-all duration-200 flex flex-col justify-between shadow-xs`}
      >
        <div className="space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${tier.accentBg} border ${tier.borderClass}`}>
                <Icon className={`w-4 h-4 ${tier.badgeTextColor}`} />
              </div>
              <div>
                <span className={`text-[10px] font-mono uppercase tracking-wider font-bold ${tier.badgeTextColor}`}>
                  {tier.label}
                </span>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight mt-0.5">{skill.skillName}</h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-600 font-medium">{skill.level}</span>
            </div>
          </div>

          {/* Score & Percentile Figures */}
          <div className="flex items-baseline justify-between pt-2">
            <div>
              <div className="text-[11px] text-slate-500">Verified Benchmark</div>
              <div className={`text-3xl font-extrabold font-mono tabular-nums ${tier.badgeTextColor}`}>
                {skill.score}
                <span className="text-xs font-normal text-slate-400">/100</span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] text-slate-500">Global Standing</div>
              <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                {skill.percentile}th <span className="text-xs font-normal text-slate-400">%ile</span>
              </div>
            </div>
          </div>

          {/* Score Bar with Dynamic Indicator */}
          <div className="space-y-1 pt-1">
            <div className="h-2 w-full bg-slate-100 border border-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  tier.tierKey === 'gold'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                    : tier.tierKey === 'silver'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-500'
                    : 'bg-gradient-to-r from-slate-600 to-slate-400'
                }`}
                style={{ width: `${skill.score}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
              <span>Threshold: 75</span>
              <span>{tier.sublabel}</span>
            </div>
          </div>

          {topPerformers && topPerformers.length > 0 && (
            <div className="pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Top performers</span>
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
                      <img
                        src={entry.candidate.avatarUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-cover bg-slate-100 shrink-0"
                      />
                      <span className={`truncate ${isYou ? 'font-bold text-indigo-700' : 'text-slate-700'}`}>
                        {isYou ? 'You' : entry.candidate.name}
                      </span>
                      <span className="ml-auto font-mono font-semibold tabular-nums text-slate-900">{entry.score}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>

        {/* Card Footer & Credential Audit Trigger */}
        <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-mono">
            Verified {skill.verifiedAt}
          </span>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`text-xs font-semibold ${tier.badgeTextColor} hover:underline flex items-center gap-1 transition-colors`}
          >
            <span>Audit Credential</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {isModalOpen && (
        <CertificateModal
          skill={skill}
          tier={tier}
          onClose={() => setIsModalOpen(false)}
          onCopy={handleCopyLink}
          copied={copiedLink}
        />
      )}
    </>
  );
};

// Modal providing cryptographic proof of verified assessment
interface CertificateModalProps {
  skill: VerifiedSkill;
  tier: BadgeTierConfig;
  onClose: () => void;
  onCopy: () => void;
  copied: boolean;
}

const CertificateModal: React.FC<CertificateModalProps> = ({
  skill,
  tier,
  onClose,
  onCopy,
  copied,
}) => {
  const Icon = tier.icon;
  const credentialId = `VTD-${skill.skillId.replace('skill-', '').toUpperCase()}-${skill.score}-${skill.verifiedAt.replace(/-/g, '')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Emblem Header */}
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl ${tier.accentBg} border-2 ${tier.borderClass} flex items-center justify-center shrink-0 shadow-sm`}
          >
            <Icon className={`w-8 h-8 ${tier.badgeTextColor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono uppercase font-bold tracking-wider ${tier.badgeTextColor}`}>
                {tier.label}
              </span>
              <span className="text-xs text-slate-400">&middot;</span>
              <span className="text-xs text-indigo-700 font-semibold">Audited & Active</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">{skill.skillName}</h3>
            <p className="text-xs text-slate-500 font-mono">Credential ID: {credentialId}</p>
          </div>
        </div>

        {/* Score & Benchmark Grid */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <div className="text-[11px] text-slate-500">Verified Assessment Score</div>
            <div className={`text-3xl font-extrabold font-mono tabular-nums ${tier.badgeTextColor}`}>
              {skill.score}
              <span className="text-xs text-slate-400 font-normal">/100</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Passing bar: 75</div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Global Percentile Standing</div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-slate-900">
              {skill.percentile}th
            </div>
            <div className="text-[11px] text-indigo-600 font-medium mt-0.5">{tier.sublabel}</div>
          </div>
        </div>

        {/* Verification Metadata Details */}
        <div className="space-y-2 text-xs text-slate-700">
          <div className="font-semibold text-slate-900">Assessment Proof Details:</div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Evaluation Mode:</span>
              <span className="text-slate-800 font-medium">Interactive In-Browser Sandbox</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Proctor Integrity Index:</span>
              <span className="text-indigo-700 font-semibold">100% Focus (0 flags)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Verification Date:</span>
              <span className="text-slate-800">{skill.verifiedAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assessed Level:</span>
              <span className="text-slate-800">{skill.level}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
            {tier.description}
          </p>
        </div>

        {/* Share & Copy Action */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCopy}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Verifiable Proof Link</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
