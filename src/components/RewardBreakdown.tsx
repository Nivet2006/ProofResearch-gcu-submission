import React, { useState } from 'react';
import { EscrowAccount, RewardAllocation, Charter, Milestone } from '../types';
import { rewardService } from '../services/rewardService';
import { calculateCategoryBreakdown, parseRewardSplit } from '../utils/rewardUtils';
import { WhyPayoutModal } from './WhyPayoutModal';

interface RewardBreakdownProps {
  projectId: string;
  milestoneId: string;
  milestoneTitle: string;
  budget: number;
  escrow: EscrowAccount | null;
  allocations: RewardAllocation[];
  sponsorId: string;
  userRole?: string;
  isMilestoneAccepted: boolean;
  charter?: Charter | null;
  milestoneObj?: Milestone | null;
  onRewardsCalculated: (newAllocations: RewardAllocation[], updatedEscrow: EscrowAccount) => void;
}

export const RewardBreakdown: React.FC<RewardBreakdownProps> = ({
  projectId,
  milestoneId,
  milestoneTitle,
  budget,
  escrow,
  allocations,
  sponsorId,
  userRole = 'STUDENT',
  isMilestoneAccepted,
  charter,
  milestoneObj,
  onRewardsCalculated
}) => {
  const [releasing, setReleasing] = useState(false);
  const [distributionMode, setDistributionMode] = useState<'WORK_SPLIT' | 'EQUAL_SPLIT' | 'IMPACT_THRESHOLD'>('WORK_SPLIT');
  const [selectedAllocation, setSelectedAllocation] = useState<RewardAllocation | null>(null);

  const isReleased = escrow?.status === 'RELEASED';
  const isFunded = escrow?.status === 'LOCKED_IN_ESCROW' || isReleased;
  const isSponsorOrAdmin = userRole === 'SPONSOR' || userRole === 'ADMIN';

  const rewardSplit = parseRewardSplit(charter?.reward_terms, charter?.reward_split);
  const categories = calculateCategoryBreakdown(budget, rewardSplit);
  const charterVersion = charter?.version || 'v1.0';

  const [funding, setFunding] = useState(false);

  const handleFundEscrow = async () => {
    if (!isSponsorOrAdmin) return;
    setFunding(true);
    try {
      const updatedEscrow = await rewardService.fundMilestoneEscrow(projectId, milestoneId, budget, sponsorId);
      onRewardsCalculated(allocations, updatedEscrow);
    } catch (err: any) {
      console.error('Error funding escrow', err);
      alert(err.message || 'Error funding escrow');
    } finally {
      setFunding(false);
    }
  };

  const handleReleaseEscrow = async () => {
    if (!isSponsorOrAdmin || !isFunded) return;
    setReleasing(true);
    try {
      const res = await rewardService.calculateAndReleaseRewards(projectId, milestoneId, budget, sponsorId, distributionMode, charter);
      onRewardsCalculated(res.allocations, res.escrow);
    } catch (err: any) {
      console.error('Error calculating and releasing rewards', err);
      alert(err.message || 'Error releasing rewards');
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="border border-[#E5E5E5] bg-[#FFFFFF] rounded p-6 space-y-6 text-xs">
      {/* Escrow Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-1 flex items-center gap-2">
            <span>MILESTONE ESCROW</span>
            <span className="bg-[#F5F5F5] border border-[#E5E5E5] px-1.5 py-0.5 rounded text-[10px] text-[#000000]">Charter {charterVersion}</span>
          </div>
          <h3 className="text-lg font-medium text-[#000000]">
            {milestoneTitle}
          </h3>
        </div>

        <div className="flex items-center gap-6 bg-[#F5F5F5] px-4 py-2 rounded border border-[#E5E5E5] shrink-0">
          <div>
            <span className="text-[11px] text-[#888888] block">Milestone Budget</span>
            <span className="text-base font-semibold text-[#000000]">₹{budget.toLocaleString()}.00</span>
          </div>

          <div className="pl-6 border-l border-[#E5E5E5]">
            <span className="text-[11px] text-[#888888] block">Escrow Status</span>
            <span className={`font-semibold ${isReleased ? 'text-[#008000]' : isFunded ? 'text-[#000000]' : 'text-[#D32F2F]'}`}>
              {isReleased ? 'RELEASED' : isFunded ? 'LOCKED IN ESCROW' : 'UNFUNDED'}
            </span>
          </div>
        </div>
      </div>

      {/* Distribution Mode Selection (Work Split / Equal / Threshold) */}
      {!isReleased && (
        <div className="bg-[#FFFFFF] p-4 rounded border border-[#E5E5E5] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#000000] text-xs uppercase tracking-wider">
              Student Pool Payout Mode (₹{categories.studentPoolAmount.toLocaleString()}.00 Pool)
            </span>
            <span className="text-[11px] text-[#888888]">Govern how student rewards are split</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setDistributionMode('WORK_SPLIT')}
              className={`p-3 text-left border transition-colors ${
                distributionMode === 'WORK_SPLIT'
                  ? 'border-[#000000] bg-[#F5F5F5] font-semibold text-[#000000]'
                  : 'border-[#E5E5E5] bg-[#FFFFFF] text-[#666666] hover:border-[#CCCCCC]'
              }`}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>Proportional Work Split</span>
                {distributionMode === 'WORK_SPLIT' && <span>✓ Selected</span>}
              </div>
              <p className="text-[11px] font-normal text-[#666666] mt-1 leading-snug">
                Payout is strictly based on verified work % done. Zero work = ₹0 payout.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDistributionMode('IMPACT_THRESHOLD')}
              className={`p-3 text-left border transition-colors ${
                distributionMode === 'IMPACT_THRESHOLD'
                  ? 'border-[#000000] bg-[#F5F5F5] font-semibold text-[#000000]'
                  : 'border-[#E5E5E5] bg-[#FFFFFF] text-[#666666] hover:border-[#CCCCCC]'
              }`}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>Quality Gate (&gt;= 5.0)</span>
                {distributionMode === 'IMPACT_THRESHOLD' && <span>✓ Selected</span>}
              </div>
              <p className="text-[11px] font-normal text-[#666666] mt-1 leading-snug">
                Requires expert-reviewed impact score &gt;= 5.0 to qualify for pool payout.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setDistributionMode('EQUAL_SPLIT')}
              className={`p-3 text-left border transition-colors ${
                distributionMode === 'EQUAL_SPLIT'
                  ? 'border-[#000000] bg-[#F5F5F5] font-semibold text-[#000000]'
                  : 'border-[#E5E5E5] bg-[#FFFFFF] text-[#666666] hover:border-[#CCCCCC]'
              }`}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>Equal Split</span>
                {distributionMode === 'EQUAL_SPLIT' && <span>✓ Selected</span>}
              </div>
              <p className="text-[11px] font-normal text-[#666666] mt-1 leading-snug">
                Divided equally among all registered contributors regardless of output.
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Configured Charter Split Formula */}
      <div className="bg-[#F5F5F5] p-4 rounded border border-[#E5E5E5] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#000000] block text-xs uppercase tracking-wider">
            Charter {charterVersion} Configured Split (Budget: ₹{budget.toLocaleString()}.00)
          </span>
          <span className="text-[11px] text-[#666666]">Configured in Project Charter</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-[#FFFFFF] rounded border border-[#E5E5E5]">
            <span className="text-[#888888] block text-[11px]">Platform Fee ({rewardSplit.platformFeePercent}%)</span>
            <span className="font-semibold text-[#000000]">₹{categories.platformFeeAmount.toLocaleString()}.00</span>
          </div>
          <div className="p-3 bg-[#FFFFFF] rounded border border-[#E5E5E5]">
            <span className="text-[#888888] block text-[11px]">AI Compute Reserve ({rewardSplit.aiComputeReservePercent}%)</span>
            <span className="font-semibold text-[#000000]">₹{categories.aiComputeReserveAmount.toLocaleString()}.00</span>
          </div>
          <div className="p-3 bg-[#FFFFFF] rounded border border-[#E5E5E5]">
            <span className="text-[#888888] block text-[11px]">Expert Advisor ({rewardSplit.expertSharePercent}%)</span>
            <span className="font-semibold text-[#000000]">₹{categories.expertShareAmount.toLocaleString()}.00</span>
          </div>
          <div className="p-3 bg-[#FFFFFF] rounded border border-[#E5E5E5]">
            <span className="text-[#888888] block text-[11px]">Student Pool ({rewardSplit.studentPoolPercent}%)</span>
            <span className="font-semibold text-[#000000]">₹{categories.studentPoolAmount.toLocaleString()}.00</span>
          </div>
          <div className="p-3 bg-[#FFFFFF] rounded border border-[#E5E5E5]">
            <span className="text-[#888888] block text-[11px]">Reserve / Buffer ({rewardSplit.reservePercent}%)</span>
            <span className="font-semibold text-[#000000]">₹{categories.reserveAmount.toLocaleString()}.00</span>
          </div>
        </div>
      </div>

      {/* Release Escrow Button */}
      {!isReleased && (
        <div className="bg-[#F5F5F5] p-4 rounded border border-[#E5E5E5] flex items-center justify-between gap-4">
          <div className="text-xs text-[#000000]">
            {!isFunded ? (
              <span className="text-[#D32F2F] font-medium">
                ⚠ Milestone escrow is not funded. Sponsor must lock funds in escrow first.
              </span>
            ) : isMilestoneAccepted ? (
              <span className="font-medium">
                ✓ Milestone accepted by sponsor. {isSponsorOrAdmin ? 'Ready to release escrow funds.' : 'Awaiting sponsor escrow release.'}
              </span>
            ) : (
              <span className="text-[#666666]">
                Milestone acceptance required prior to escrow release.
              </span>
            )}
          </div>

          {isSponsorOrAdmin ? (
            <div className="flex items-center gap-2">
              {!isFunded && (
                <button
                  type="button"
                  onClick={handleFundEscrow}
                  disabled={funding}
                  className="px-3 py-2 bg-[#1B5E20] hover:bg-[#2E7D32] disabled:opacity-50 text-[#FFFFFF] font-medium rounded transition-colors text-xs shrink-0 flex items-center gap-1"
                >
                  {funding ? 'Locking...' : `🔒 Lock ₹${budget.toLocaleString()} in Escrow`}
                </button>
              )}
              <button
                type="button"
                onClick={handleReleaseEscrow}
                disabled={!isMilestoneAccepted || !isFunded || releasing}
                className="px-4 py-2 bg-[#000000] hover:bg-[#1A1A1A] disabled:opacity-50 text-[#FFFFFF] font-medium rounded transition-colors text-xs shrink-0"
              >
                {releasing ? 'Calculating...' : 'RELEASE ESCROW & CALCULATE REWARDS'}
              </button>
            </div>
          ) : (
            <span className="text-xs text-[#888888] font-medium italic">
              Sponsor Action Only
            </span>
          )}
        </div>
      )}

      {/* Calculated Allocations */}
      {allocations.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-[#888888] uppercase tracking-widest">
              CALCULATED PAYOUT ALLOCATIONS
            </h4>
            <span className="text-[11px] text-[#666666]">Click any contributor row to inspect payout breakdown</span>
          </div>

          <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
            {allocations.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedAllocation(a)}
                className="py-4 space-y-2 cursor-pointer hover:bg-[#F9F9F9] transition-colors px-2 rounded"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#000000] text-sm">{a.recipient_profile?.full_name}</span>
                    <span className="text-[#888888] text-xs ml-2">({a.role})</span>
                  </div>

                  <div className="text-right">
                    <span className="font-semibold text-base text-[#000000]">₹{a.final_amount.toLocaleString()}</span>
                    <span className="text-[11px] text-[#888888] block">
                      Share Weight: {(a.contribution_weight * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="bg-[#F5F5F5] p-3 rounded border border-[#E5E5E5] text-xs text-[#666666] flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[#000000]">Rationale:</span> {a.explanation}
                  </div>
                  <span className="text-[11px] font-medium text-[#000000] underline shrink-0 ml-3">Why this payout? →</span>
                </div>
              </div>
            ))}
          </div>

          {/* WHY THIS PAYOUT Section */}
          <div className="bg-[#F9F9F9] p-4 rounded border border-[#E5E5E5] space-y-2 text-xs">
            <span className="font-semibold text-[#000000] uppercase tracking-wider block">
              WHY THIS PAYOUT?
            </span>
            <ul className="space-y-1.5 text-[#666666] list-disc list-inside">
              <li>Charter <strong>{charterVersion}</strong> defined the reward split ({rewardSplit.platformFeePercent}% Platform, {rewardSplit.aiComputeReservePercent}% AI Reserve, {rewardSplit.expertSharePercent}% Expert, {rewardSplit.studentPoolPercent}% Student Pool, {rewardSplit.reservePercent}% Reserve).</li>
              <li>Milestone budget of ₹{budget.toLocaleString()} was funded in escrow.</li>
              <li>Contributions were human-reviewed and impact weights approved.</li>
              <li>Milestone was accepted by sponsor.</li>
              <li>Reward calculation was executed deterministically using money-safe integer arithmetic with zero floating-point discrepancies.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Why Payout Modal */}
      <WhyPayoutModal
        isOpen={!!selectedAllocation}
        onClose={() => setSelectedAllocation(null)}
        allocation={selectedAllocation}
        milestone={milestoneObj || { id: milestoneId, title: milestoneTitle, budget } as any}
        charter={charter}
      />
    </div>
  );
};

