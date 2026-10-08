import React from 'react';
import { ExpertBadge, ExpertTier } from '../types/expertVerification';

// ─── Badge Config ─────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<ExpertTier, {
  label: string;
  shortLabel: string;
  icon: string;
  bg: string;
  border: string;
  text: string;
  dotColor: string;
}> = {
  GOVERNMENT_EXPERT: {
    label: 'Government-Verified Expert',
    shortLabel: 'Gov. Expert',
    icon: '🏛️',
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-800',
    dotColor: 'bg-purple-500',
  },
  ACADEMIC_EXPERT: {
    label: 'Academic Expert',
    shortLabel: 'Academic Expert',
    icon: '🎓',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-800',
    dotColor: 'bg-blue-500',
  },
  PRACTITIONER_EXPERT: {
    label: 'Practitioner Expert',
    shortLabel: 'Practitioner',
    icon: '⚙️',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    dotColor: 'bg-emerald-500',
  },
  DOMAIN_REVIEWER: {
    label: 'Domain Reviewer',
    shortLabel: 'Reviewer',
    icon: '🔍',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    dotColor: 'bg-amber-500',
  },
};

// ─── Full Badge Card ──────────────────────────────────────────────────────────

interface ExpertBadgeCardProps {
  badge: ExpertBadge;
}

export const ExpertBadgeCard: React.FC<ExpertBadgeCardProps> = ({ badge }) => {
  const cfg = TIER_CONFIG[badge.tier] || TIER_CONFIG.DOMAIN_REVIEWER;
  const approvedDate = badge.approved_at
    ? new Date(badge.approved_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className={`border ${cfg.border} ${cfg.bg} rounded-lg p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="text-2xl">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-bold ${cfg.text} flex items-center gap-2`}>
            {cfg.label}
            <span className={`inline-block w-2 h-2 rounded-full ${cfg.dotColor} animate-pulse`} />
          </div>
          <div className="text-[10px] text-[#888] font-mono uppercase tracking-wider mt-0.5">
            VERIFIED EXPERT BADGE
          </div>
        </div>
      </div>

      {/* Domains */}
      {badge.verified_domains && badge.verified_domains.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">Verified Domains</div>
          <div className="flex flex-wrap gap-1">
            {badge.verified_domains.map(d => (
              <span key={d} className={`px-2 py-0.5 border ${cfg.border} ${cfg.bg} ${cfg.text} text-[10px] font-mono rounded`}>
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 text-[11px] text-[#555] border-t border-[#E5E5E5] pt-2">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#888]">Approved Date</div>
          <div className="font-medium text-[#333]">{approvedDate}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-[#888]">Evidence Reviewed</div>
          <div className="font-medium text-[#333]">{badge.evidence_reviewed_count} document{badge.evidence_reviewed_count !== 1 ? 's' : ''}</div>
        </div>
        {badge.admin_profile && (
          <div className="col-span-2">
            <div className="text-[9px] uppercase tracking-wider text-[#888]">Approved By</div>
            <div className="font-medium text-[#333]">{badge.admin_profile.full_name}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Inline Badge Chip (for profile cards / project reviewer cards) ────────────

interface ExpertBadgeChipProps {
  badge: ExpertBadge;
  size?: 'sm' | 'xs';
}

export const ExpertBadgeChip: React.FC<ExpertBadgeChipProps> = ({ badge, size = 'sm' }) => {
  const cfg = TIER_CONFIG[badge.tier] || TIER_CONFIG.DOMAIN_REVIEWER;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 border ${cfg.border} ${cfg.bg} ${cfg.text} rounded-full ${size === 'xs' ? 'text-[9px]' : 'text-[10px]'} font-semibold`}>
      <span>{cfg.icon}</span>
      <span>{cfg.shortLabel}</span>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dotColor}`} />
    </span>
  );
};
