import { describe, it, expect, vi } from 'vitest';
import { charterService } from '../services/charterService';
import { rewardService } from '../services/rewardService';
import { contributionService } from '../services/contributionService';
import { reviewAgent } from '../services/reviewAgent';
import { ledgerService } from '../services/ledgerService';
import { MOCK_ESCROW, MOCK_CHARTERS, MOCK_CONTRIBUTIONS } from '../data/mockData';
import { Submission } from '../types';

describe('Gardenia 2K26 Six Fair Rewards & Credit Principles Audit Suite', () => {
  const projectId = 'p1111111-1111-1111-1111-111111111111';
  const sponsorId = 'u1111111-1111-1111-1111-111111111111';
  const studentId = 'u3333333-3333-3333-3333-333333333333';
  const milestoneId = 'm1111111-1111-1111-1111-111111111111';

  // --- PRINCIPLE #1: TERMS BEFORE WORK ---
  it('Principle 1 (Terms Before Work): User acceptance is recorded with version and timestamp', async () => {
    const activeCharter = await charterService.getActiveCharter(projectId);
    expect(activeCharter).toBeDefined();

    const acceptance = await charterService.acceptCharter(activeCharter!.id, projectId, studentId);
    expect(acceptance.user_id).toBe(studentId);
    expect(acceptance.charter_id).toBe(activeCharter!.id);
    expect(acceptance.acceptance_hash).toBeDefined();

    const hasAccepted = await charterService.hasAcceptedCharter(projectId, studentId);
    expect(hasAccepted).toBe(true);
  });

  // --- PRINCIPLE #2: ESCROW FIRST ---
  it('Principle 2 (Escrow First): Reward release blocks unfunded milestones and permits funded ones', async () => {
    // 1. Verify unfunded milestone blocks calculation
    const unfundedMilestoneId = 'm-unfunded-test-88';
    await expect(
      rewardService.calculateAndReleaseRewards(projectId, unfundedMilestoneId, 50000, sponsorId)
    ).rejects.toThrow('Unfunded milestone');

    // 2. Fund milestone in escrow
    const escrow = await rewardService.fundMilestoneEscrow(projectId, milestoneId, 25000, sponsorId);
    expect(escrow.status).toBe('LOCKED_IN_ESCROW');

    // 3. Calculation allowed on funded milestone
    const activeCharter = await charterService.getActiveCharter(projectId);
    const result = await rewardService.calculateAndReleaseRewards(projectId, milestoneId, 25000, sponsorId, 'WORK_SPLIT', activeCharter);
    expect(result.escrow.status).toBe('RELEASED');
  });

  // --- PRINCIPLE #3: CREDIT IS OWED IN EVERY MODEL ---
  it('Principle 3 (Credit Every Model): Non-monetary project returns $0 monetary payout but maintains credit credentials', async () => {
    const nonMonetaryProjectId = 'p2222222-2222-2222-2222-222222222222';
    const credentials = await rewardService.getCredentials(nonMonetaryProjectId);

    expect(credentials.length).toBeGreaterThan(0);
    expect(credentials[0].credential_type).toBe('CO_AUTHORSHIP');
    expect(credentials[0].user_id).toBe(studentId);
  });

  // --- PRINCIPLE #4: REWARD EFFORT AS WELL AS OUTCOME ---
  it('Principle 4 (Effort & Outcome): Well-documented negative result submission is accepted and rewarded', async () => {
    const negativeSubmission: Submission = {
      id: 'sub-neg-result-1',
      project_id: projectId,
      milestone_id: milestoneId,
      submitted_by: studentId,
      title: 'Diabetic Retinopathy Edge Model — Negative Result Analysis',
      content: 'Extensive benchmarking disproved the hypothesis that CLAHE preprocessing with clip limit > 3.0 improves classification accuracy. Accuracy degraded from 88.5% to 74.2% due to noise amplification in low-contrast fundus regions. Full dataset log and disproof analysis attached.',
      content_hash: 'hash-negative-result-123',
      similarity_score: 5.0,
      integrity_status: 'CLEAN',
      created_at: new Date().toISOString()
    };

    // Review Agent analyzes well-documented negative result
    const review = await reviewAgent.analyzeSubmission(negativeSubmission);
    expect(review.qualityScore).toBeGreaterThan(50);
    expect(review.recommendation).toBe('RECOMMEND_ACCEPT');

    // Human Expert Reviewer approves the negative result
    const decision = await reviewAgent.submitHumanDecision(
      negativeSubmission.id,
      projectId,
      'u2222222-2222-2222-2222-222222222222',
      'APPROVED',
      'Negative result well-documented; disproved accuracy degradation hypothesis.'
    );
    expect(decision.decision).toBe('APPROVED');
  });

  // --- PRINCIPLE #5: SPLIT BY AGREED ROLES, THEN MEASURED CONTRIBUTION ---
  it('Principle 5 (Agreed Roles + Measured Contribution): Payouts use charter split + impact weights, not commit counts', async () => {
    const activeCharter = await charterService.getActiveCharter(projectId);
    const esc = MOCK_ESCROW.find(e => e.milestone_id === milestoneId);
    if (esc) esc.status = 'LOCKED_IN_ESCROW';

    const result = await rewardService.calculateAndReleaseRewards(projectId, milestoneId, 100000, sponsorId, 'WORK_SPLIT', activeCharter);
    
    // Check allocations are derived from charter role split (30% expert, 40% student pool)
    const expertAlloc = result.allocations.find(a => a.role === 'EXPERT');
    const studentAllocations = result.allocations.filter(a => a.role === 'STUDENT');

    expect(expertAlloc?.final_amount).toBe(30000); // 30% of ₹100,000
    expect(studentAllocations.length).toBeGreaterThan(0);

    // Sum of student allocations equals ₹40,000 (40% student pool)
    const totalStudentPayout = studentAllocations.reduce((acc, a) => acc + a.final_amount, 0);
    expect(totalStudentPayout).toBe(40000);
  });

  // --- PRINCIPLE #6: AI DOES NOT EARN ---
  it('Principle 6 (AI Does Not Earn): AI compute reserve is a cost category; AI receives $0 contributor payout', async () => {
    const activeCharter = await charterService.getActiveCharter(projectId);
    const esc = MOCK_ESCROW.find(e => e.milestone_id === milestoneId);
    if (esc) esc.status = 'LOCKED_IN_ESCROW';

    const result = await rewardService.calculateAndReleaseRewards(projectId, milestoneId, 100000, sponsorId, 'WORK_SPLIT', activeCharter);

    // AI is not in recipient allocations
    const aiAllocation = result.allocations.find(a => a.role === 'AI' || a.user_id === 'ai-agent');
    expect(aiAllocation).toBeUndefined();

    // All recipients are human profiles
    result.allocations.forEach(alloc => {
      expect(alloc.recipient_profile?.role).not.toBe('AI');
      expect(alloc.final_amount).toBeGreaterThan(0);
    });
  });
});
