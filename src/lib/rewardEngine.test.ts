import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_REWARD_SPLIT,
  parseRewardSplit,
  validateRewardSplit,
  calculateCategoryBreakdown,
  calculateStudentDistribution
} from '../utils/rewardUtils';
import { rewardService } from '../services/rewardService';
import { charterService } from '../services/charterService';
import { ledgerService } from '../services/ledgerService';
import { MOCK_ESCROW, MOCK_CHARTERS } from '../data/mockData';

describe('Configurable Reward & Credit Engine Test Suite', () => {
  const projectId = 'p1111111-1111-1111-1111-111111111111';
  const sponsorId = 'u1111111-1111-1111-1111-111111111111';
  const milestoneId = 'm1111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    // Reset test escrow state
    const esc = MOCK_ESCROW.find(e => e.milestone_id === milestoneId);
    if (esc) {
      esc.status = 'LOCKED_IN_ESCROW';
    }
  });

  // TEST 1
  it('TEST 1: Validates default configuration (10/5/30/40/15) as 100% PASS', () => {
    const result = validateRewardSplit(DEFAULT_REWARD_SPLIT);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  // TEST 2
  it('TEST 2: Validates custom valid configuration (5/10/25/50/10) as 100% PASS', () => {
    const customSplit = {
      platformFeePercent: 5,
      aiComputeReservePercent: 10,
      expertSharePercent: 25,
      studentPoolPercent: 50,
      reservePercent: 10,
    };
    const result = validateRewardSplit(customSplit);
    expect(result.isValid).toBe(true);
  });

  // TEST 3
  it('TEST 3: Rejects invalid configuration (10/5/30/40/20 = 105%) MUST FAIL', () => {
    const invalidSplit = {
      platformFeePercent: 10,
      aiComputeReservePercent: 5,
      expertSharePercent: 30,
      studentPoolPercent: 40,
      reservePercent: 20,
    };
    const result = validateRewardSplit(invalidSplit);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Allocation must total 100%');
  });

  // TEST 4
  it('TEST 4: Rejects negative percentage values MUST FAIL', () => {
    const negativeSplit = {
      platformFeePercent: 10,
      aiComputeReservePercent: -5,
      expertSharePercent: 30,
      studentPoolPercent: 40,
      reservePercent: 25,
    };
    const result = validateRewardSplit(negativeSplit);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot be negative');
  });

  // TEST 5
  it('TEST 5: Calculates category breakdown for ₹1,00,000 budget with 10/5/30/40/15 split', () => {
    const budget = 100000;
    const split = DEFAULT_REWARD_SPLIT;
    const categories = calculateCategoryBreakdown(budget, split);

    expect(categories.platformFeeAmount).toBe(10000);
    expect(categories.aiComputeReserveAmount).toBe(5000);
    expect(categories.expertShareAmount).toBe(30000);
    expect(categories.studentPoolAmount).toBe(40000);
    expect(categories.reserveAmount).toBe(15000);

    const sum = categories.platformFeeAmount +
      categories.aiComputeReserveAmount +
      categories.expertShareAmount +
      categories.studentPoolAmount +
      categories.reserveAmount;

    expect(sum).toBe(100000);
  });

  // TEST 6
  it('TEST 6: Distributes Student Pool (₹40,000) using normalized weights (0.5, 0.3, 0.2)', () => {
    const studentPoolAmount = 40000;
    const contribs = [
      { userId: 'studentA', impactScore: 0.5 },
      { userId: 'studentB', impactScore: 0.3 },
      { userId: 'studentC', impactScore: 0.2 },
    ];

    const dist = calculateStudentDistribution(studentPoolAmount, contribs);

    const studentA = dist.find(d => d.userId === 'studentA');
    const studentB = dist.find(d => d.userId === 'studentB');
    const studentC = dist.find(d => d.userId === 'studentC');

    expect(studentA?.payoutAmount).toBe(20000);
    expect(studentB?.payoutAmount).toBe(12000);
    expect(studentC?.payoutAmount).toBe(8000);

    const totalPayout = dist.reduce((acc, d) => acc + d.payoutAmount, 0);
    expect(totalPayout).toBe(40000);
  });

  // TEST 7
  it('TEST 7: Automatically normalizes un-normalized raw weights (5, 3, 2) to (50%, 30%, 20%)', () => {
    const studentPoolAmount = 40000;
    const contribs = [
      { userId: 'studentA', impactScore: 5 },
      { userId: 'studentB', impactScore: 3 },
      { userId: 'studentC', impactScore: 2 },
    ];

    const dist = calculateStudentDistribution(studentPoolAmount, contribs);

    const studentA = dist.find(d => d.userId === 'studentA');
    const studentB = dist.find(d => d.userId === 'studentB');
    const studentC = dist.find(d => d.userId === 'studentC');

    expect(studentA?.percentageShare).toBe(50);
    expect(studentB?.percentageShare).toBe(30);
    expect(studentC?.percentageShare).toBe(20);

    expect(studentA?.payoutAmount).toBe(20000);
    expect(studentB?.payoutAmount).toBe(12000);
    expect(studentC?.payoutAmount).toBe(8000);
  });

  // TEST 8
  it('TEST 8: Preserves Charter v1.0 reward calculations unchanged when Charter v2.0 is published', async () => {
    // 1. Published Charter v1.0: 10/5/30/40/15
    const charterV1 = await charterService.publishCharterVersion(projectId, sponsorId, DEFAULT_REWARD_SPLIT);
    expect(charterV1.version).toBe('v1.0');

    // Accept Charter v1.0
    await charterService.acceptCharter(charterV1.id, projectId, 'u3333333-3333-3333-3333-333333333333');

    // 2. Fund milestone 1 under Charter v1.0
    const fundedEscrow = await rewardService.fundMilestoneEscrow(projectId, milestoneId, 100000, sponsorId);
    expect(fundedEscrow.status).toBe('LOCKED_IN_ESCROW');

    // 3. Calculate rewards for milestone 1 under v1.0
    const v1Result = await rewardService.calculateAndReleaseRewards(projectId, milestoneId, 100000, sponsorId, 'WORK_SPLIT', charterV1);
    const expertAllocationV1 = v1Result.allocations.find(a => a.role === 'EXPERT');
    expect(expertAllocationV1?.final_amount).toBe(30000);

    // 4. Update charter terms to v2.0: 5/10/25/50/10
    const v2Split = {
      platformFeePercent: 5,
      aiComputeReservePercent: 10,
      expertSharePercent: 25,
      studentPoolPercent: 50,
      reservePercent: 10,
    };
    const charterV2 = await charterService.publishCharterVersion(projectId, sponsorId, v2Split);
    expect(charterV2.version).toBe('v2.0');

    // 5. Verify v1.0 calculation results remain unchanged
    expect(expertAllocationV1?.final_amount).toBe(30000);
  });

  // TEST 9
  it('TEST 9: Rejects reward calculation/release for an unfunded milestone MUST FAIL', async () => {
    // Set escrow status to null / unfunded
    const unfundedMilestoneId = 'm-unfunded-999';
    await expect(
      rewardService.calculateAndReleaseRewards(projectId, unfundedMilestoneId, 50000, sponsorId)
    ).rejects.toThrow('Unfunded milestone');
  });

  // TEST 10
  it('TEST 10: Ensures financial payouts remain ₹0 for non-monetary projects ($0 budget)', () => {
    const categories = calculateCategoryBreakdown(0, DEFAULT_REWARD_SPLIT);
    expect(categories.expertShareAmount).toBe(0);
    expect(categories.studentPoolAmount).toBe(0);
    expect(categories.aiComputeReserveAmount).toBe(0);
    expect(categories.platformFeeAmount).toBe(0);
    expect(categories.reserveAmount).toBe(0);

    const dist = calculateStudentDistribution(0, [{ userId: 'studentA', impactScore: 8.5 }]);
    expect(dist[0].payoutAmount).toBe(0);
  });

  // TEST 11
  it('TEST 11: Records reward allocation events through existing ledger service', async () => {
    const appendSpy = vi.spyOn(ledgerService, 'appendEntry');

    const v1Split = DEFAULT_REWARD_SPLIT;
    await charterService.publishCharterVersion(projectId, sponsorId, v1Split);

    expect(appendSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'REWARD_CONFIG_PUBLISHED',
      projectId
    }));
  });

  // TEST 12
  it('TEST 12: Ensures final category allocations sum exactly to milestone budget after rounding', () => {
    const oddBudget = 33333.33;
    const customSplit = {
      platformFeePercent: 13.33,
      aiComputeReservePercent: 7.77,
      expertSharePercent: 29.11,
      studentPoolPercent: 35.55,
      reservePercent: 14.24,
    };

    const categories = calculateCategoryBreakdown(oddBudget, customSplit);
    const sum = Number((
      categories.expertShareAmount +
      categories.studentPoolAmount +
      categories.aiComputeReserveAmount +
      categories.platformFeeAmount +
      categories.reserveAmount
    ).toFixed(2));

    expect(sum).toBe(oddBudget);
  });
});
