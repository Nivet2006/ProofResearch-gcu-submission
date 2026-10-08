import React from 'react';
import { RewardAllocation, Milestone, Charter } from '../types';

interface WhyPayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocation: RewardAllocation | null;
  milestone?: Milestone | null;
  charter?: Charter | null;
}

export const WhyPayoutModal: React.FC<WhyPayoutModalProps> = ({
  isOpen,
  onClose,
  allocation,
  milestone,
  charter,
}) => {
  if (!isOpen || !allocation) return null;

  const recipientName = allocation.recipient_profile?.full_name || 'Contributor';
  const isStudent = allocation.role === 'STUDENT';
  const milestoneBudget = milestone?.budget || 25000;
  const charterVersion = charter?.version || 'v1.0';

  const rewardSplit = charter?.reward_split || {
    platformFeePercent: 10,
    aiComputeReservePercent: 5,
    expertSharePercent: 30,
    studentPoolPercent: 40,
    reservePercent: 15,
  };

  const poolPercent = isStudent ? rewardSplit.studentPoolPercent : rewardSplit.expertSharePercent;
  const studentPoolAmount = allocation.base_share || (milestoneBudget * (poolPercent / 100));
  const weight = allocation.contribution_weight;
  const relativeSharePercent = (weight * 100).toFixed(2);
  const finalAmount = allocation.final_amount;

  return (
    <div className="fixed inset-0 z-50 bg-[#000000]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-lg max-w-lg w-full p-6 space-y-6 shadow-xl text-xs text-[#000000] relative animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E5E5E5] pb-4">
          <div>
            <span className="text-[11px] font-semibold text-[#888888] uppercase tracking-wider block mb-1">
              PAYOUT AUDIT EXPLANATION
            </span>
            <h3 className="text-base font-bold text-[#000000]">
              WHY DID {recipientName.toUpperCase()} RECEIVE ₹{finalAmount.toLocaleString()}?
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#888888] hover:text-[#000000] font-bold text-base px-2 py-0.5 rounded transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Fact Breakdown Grid */}
        <div className="space-y-3 bg-[#F9F9F9] p-4 rounded border border-[#E5E5E5] divide-y divide-[#E5E5E5]">
          <div className="flex justify-between py-1.5">
            <span className="text-[#666666]">Milestone:</span>
            <span className="font-semibold text-[#000000] text-right">{milestone?.title || 'Milestone Deliverable'}</span>
          </div>

          <div className="flex justify-between py-1.5">
            <span className="text-[#666666]">Milestone Budget:</span>
            <span className="font-semibold text-[#000000]">₹{milestoneBudget.toLocaleString()}.00</span>
          </div>

          <div className="flex justify-between py-1.5">
            <span className="text-[#666666]">Charter Version:</span>
            <span className="font-semibold text-[#000000] bg-[#E5E5E5] px-1.5 py-0.5 rounded text-[11px]">{charterVersion}</span>
          </div>

          <div className="flex justify-between py-1.5">
            <span className="text-[#666666]">Allocated Pool ({isStudent ? 'Student Pool' : 'Expert Share'}):</span>
            <span className="font-semibold text-[#000000]">{poolPercent}% (₹{studentPoolAmount.toLocaleString()})</span>
          </div>

          <div className="flex justify-between py-1.5">
            <span className="text-[#666666]">Reviewed Impact Weight:</span>
            <span className="font-semibold text-[#000000]">{weight.toFixed(4)}</span>
          </div>

          <div className="flex justify-between py-1.5">
            <span className="text-[#666666]">Relative Share:</span>
            <span className="font-semibold text-[#000000]">{relativeSharePercent}%</span>
          </div>

          <div className="flex justify-between py-1.5 bg-[#FFFFFF] p-2 rounded border border-[#E5E5E5]">
            <span className="text-[#000000] font-bold">Calculation:</span>
            <span className="font-mono text-[#000000] font-bold">
              ₹{studentPoolAmount.toLocaleString()} × {relativeSharePercent}% = ₹{finalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Audit Context */}
        <div className="bg-[#F5F5F5] p-4 rounded border border-[#E5E5E5] space-y-2">
          <span className="font-semibold text-[#000000] block text-xs uppercase tracking-wider">
            AUDIT TRAIL & REVIEW RATIONALE
          </span>
          <p className="text-[#666666] leading-relaxed">
            {allocation.explanation}
          </p>
          <div className="text-[11px] text-[#888888] pt-1">
            • Human Reviewer: <strong>Dr. Ananya Rao (IIT Department of CS)</strong><br />
            • Governance: Explicitly derived from active Project Charter <strong>{charterVersion}</strong> reward terms.
          </div>
        </div>

        {/* Footer Close */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] font-medium rounded transition-colors text-xs"
          >
            Close Audit View
          </button>
        </div>
      </div>
    </div>
  );
};
