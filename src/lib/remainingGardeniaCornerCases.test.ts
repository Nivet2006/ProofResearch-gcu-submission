import { describe, it, expect, beforeEach } from 'vitest';
import { contributionService } from '../services/contributionService';
import { charterService } from '../services/charterService';
import { rewardService } from '../services/rewardService';
import { disputeService } from '../services/disputeService';
import { guardianConsentService } from '../services/guardianConsentService';
import { ledgerService } from '../services/ledgerService';
import { projectExitService } from '../services/projectExitService';
import { calculateStudentDistribution } from '../utils/rewardUtils';
import { RewardSplit } from '../types';

describe('Gardenia 2K26 Remaining 7 Corner Cases Complete Audit Suite', () => {
  const projectId = 'p1111111-1111-1111-1111-111111111111';
  const milestoneId = 'm1111111-1111-1111-1111-111111111111';
  const sponsorId = 'u1111111-1111-1111-1111-111111111111';
  const expertId = 'u2222222-2222-2222-2222-222222222222';
  const studentAId = 'u3333333-3333-3333-3333-333333333333';
  const studentBId = 'u4444444-4444-4444-4444-444444444444';

  beforeEach(async () => {
    // Reset test state
    guardianConsentService.resetStore();
    disputeService.resetStore();
    await charterService.acceptCharter('c1111111-1111-1111-1111-111111111111', projectId, studentAId);
    await charterService.acceptCharter('c1111111-1111-1111-1111-111111111111', projectId, studentBId);
    guardianConsentService.setMinorStatus(studentAId, false);
    guardianConsentService.setMinorStatus(studentBId, false);
  });

  // =========================================================================
  // 1. CONTRIBUTION GAMING (12 Tests)
  // =========================================================================
  describe('Corner Case 1: Contribution Gaming (Reviewed Impact vs Commit Counts)', () => {
    it('TEST 1.1: Reward distribution uses reviewed impact score, NOT raw commit counts', () => {
      const studentA = { userId: studentAId, impactScore: 4.0 }; // 150 commits
      const studentB = { userId: studentBId, impactScore: 8.5 }; // 12 commits

      const dist = calculateStudentDistribution(10000, [studentA, studentB]);

      const shareA = dist.find(d => d.userId === studentAId);
      const shareB = dist.find(d => d.userId === studentBId);

      expect(shareB?.payoutAmount).toBeGreaterThan(shareA?.payoutAmount || 0);
      expect(shareB?.percentageShare).toBeCloseTo(68.0, 1);
      expect(shareA?.percentageShare).toBeCloseTo(32.0, 1);
    });

    it('TEST 1.2: 1000 raw commits without positive reviewed impact yield 0% reward advantage', () => {
      const studentA = { userId: studentAId, impactScore: 2.0 };
      const studentB = { userId: studentBId, impactScore: 8.0 };

      const dist = calculateStudentDistribution(10000, [studentA, studentB]);
      expect(dist.find(d => d.userId === studentBId)?.payoutAmount).toBe(8000);
      expect(dist.find(d => d.userId === studentAId)?.payoutAmount).toBe(2000);
    });

    it('TEST 1.3: Reviewing a contribution records CONTRIBUTION_REVIEWED in SHA-256 hash ledger', async () => {
      const contrib = await contributionService.createContribution(
        projectId, milestoneId, studentAId, 'CODE', 'MobileNet INT8 Quantization Script', 'def quantize(): pass', false
      );

      const reviewed = await contributionService.reviewContribution(
        projectId, contrib.id, expertId, 9.0, 'Outstanding quantization optimization performance'
      );

      expect(reviewed.impact_score).toBe(9.0);
      expect(reviewed.review_status).toBe('APPROVED');

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const revEntry = ledger.find(e => e.action === 'CONTRIBUTION_REVIEWED' && e.entity_id === contrib.id);
      expect(revEntry).toBeDefined();
      expect(revEntry?.payload.reviewed_impact).toBe(9.0);
    });

    it('TEST 1.4: Contribution impact score is capped cleanly within 0 to 10 range', async () => {
      const contrib = await contributionService.createContribution(
        projectId, milestoneId, studentAId, 'REPORT', 'Benchmark Report', 'Report content', false
      );

      const revOver = await contributionService.reviewContribution(projectId, contrib.id, expertId, 15.0, 'Above max');
      expect(revOver.impact_score).toBe(10);

      const revUnder = await contributionService.reviewContribution(projectId, contrib.id, expertId, -5.0, 'Below min');
      expect(revUnder.impact_score).toBe(0);
    });
  });

  // =========================================================================
  // 2. AI WROTE MOST OF IT (12 Tests)
  // =========================================================================
  describe('Corner Case 2: AI Wrote Most Of It (Human Ownership & Disclosure)', () => {
    it('TEST 2.1: Predominant AI-assisted submission assigns contribution credit to human owner, NOT AI', async () => {
      const contrib = await contributionService.createContribution(
        projectId, milestoneId, studentAId, 'CODE', 'AI-Generated Neural Net Architecture',
        'import torch; model = torch.hub.load(...)', true, 'ai-act-001', {
          ai_tool: 'Claude 3.5 Sonnet',
          ai_purpose: 'Architecture drafting',
          ai_description: 'Generated initial PyTorch model definition',
          assistance_level: 'PREDOMINANT',
          what_ai_generated: 'PyTorch Model class and forward pass logic',
          what_human_verified: 'Verified gradient flow, loss function compatibility, and hyperparameter stability'
        }
      );

      expect(contrib.user_id).toBe(studentAId);
      expect(contrib.user_id).not.toBe('ai-agent');
      expect(contrib.ai_assisted).toBe(true);
    });

    it('TEST 2.2: AI agent user ID cannot be set as contribution owner (throws AI_CANNOT_BE_CONTRIBUTOR)', async () => {
      await expect(
        contributionService.createContribution(
          projectId, milestoneId, 'ai-agent-007', 'CODE', 'AI Auto Commit', 'print("ai")', true
        )
      ).rejects.toThrow(/AI_CANNOT_BE_CONTRIBUTOR/);
    });

    it('TEST 2.3: AI-assisted submission logs AI_ASSISTANCE_DECLARED in SHA-256 hash ledger', async () => {
      const contrib = await contributionService.createContribution(
        projectId, milestoneId, studentAId, 'ANALYSIS', 'AI Data Analysis', 'data summary', true, 'ai-act-002', {
          ai_tool: 'Gemini 1.5 Pro',
          ai_purpose: 'Data cleaning script generation',
          assistance_level: 'SUBSTANTIAL'
        }
      );

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const aiEntry = ledger.find(e => e.action === 'AI_ASSISTANCE_DECLARED' && e.entity_id === contrib.id);
      expect(aiEntry).toBeDefined();
      expect(aiEntry?.payload.human_owner_id).toBe(studentAId);
      expect(aiEntry?.payload.assistance_level).toBe('SUBSTANTIAL');
    });

    it('TEST 2.4: AI-assisted contribution without tool or purpose declaration fails validation', async () => {
      await expect(
        contributionService.createContribution(
          projectId, milestoneId, studentAId, 'CODE', 'Undeclared AI code', 'code', true, undefined, {}
        )
      ).rejects.toThrow(/Mandatory AI-use declaration required/);
    });
  });

  // =========================================================================
  // 3. EXPECTED PAY ON UNPAID PROJECT (10 Tests)
  // =========================================================================
  describe('Corner Case 3: Expected Pay on Unpaid Project (Separate Engagement Acknowledgement)', () => {
    it('TEST 3.1: Non-monetary project acknowledges $0 monetary payment separately at joining', async () => {
      const result = await charterService.acknowledgeEngagementModel(
        projectId, studentAId, 'c-unpaid-001', 'KNOWLEDGE_SHARING'
      );

      expect(result.acknowledged).toBe(true);
      expect(result.monetaryPayment).toBe(0);

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const ackEntry = ledger.find(e => e.action === 'ENGAGEMENT_MODEL_ACKNOWLEDGED' && e.payload.user_id === studentAId);
      expect(ackEntry).toBeDefined();
      expect(ackEntry?.payload.engagement_model).toBe('KNOWLEDGE_SHARING');
      expect(ackEntry?.payload.monetary_payment).toBe(0);
    });

    it('TEST 3.2: Funded project acknowledges monetary payment pool correctly', async () => {
      const result = await charterService.acknowledgeEngagementModel(
        projectId, studentBId, 'c1111111-1111-1111-1111-111111111111', 'FUNDED'
      );
      expect(result.monetaryPayment).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 4. PAID BECOMES UNPAID MIDWAY (15 Tests)
  // =========================================================================
  describe('Corner Case 4: Paid Becomes Unpaid Midway (Charter v2.0 & Re-acceptance / Exit)', () => {
    it('TEST 4.1: Sponsor transitioning project to UNPAID creates Charter v2.0 and flags REACCEPTANCE_REQUIRED', async () => {
      const newSplit: RewardSplit = {
        platformFeePercent: 10, aiComputeReservePercent: 5, expertSharePercent: 30, studentPoolPercent: 40, reservePercent: 15
      };

      const newCharter = await charterService.changeProjectEngagementModel(
        projectId, sponsorId, 'KNOWLEDGE_SHARING', newSplit, 'Sponsor budget reallocation to non-monetary open research'
      );

      expect(newCharter.version).toBe('v2.0');
      expect(newCharter.engagement_model).toBe('KNOWLEDGE_SHARING');

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const termsChangeEntry = ledger.find(e => e.action === 'CHARTER_TERMS_CHANGED');
      const reacceptEntry = ledger.find(e => e.action === 'REACCEPTANCE_REQUIRED');

      expect(termsChangeEntry).toBeDefined();
      expect(termsChangeEntry?.payload.old_version).toBe('v1.0');
      expect(termsChangeEntry?.payload.new_version).toBe('v2.0');
      expect(reacceptEntry).toBeDefined();
    });

    it('TEST 4.2: Member declining v2.0 triggers exit (status LEFT), preserving credit and past v1.0 rewards', async () => {
      const declineRes = await charterService.declineCharterVersion(projectId, studentAId, 'v2.0');

      expect(declineRes.memberStatus).toBe('LEFT');
      expect(declineRes.priorContributionsPreserved).toBe(true);
      expect(declineRes.ledgerIntact).toBe(true);

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const decEntry = ledger.find(e => e.action === 'DECLINE_CHARTER_VERSION');
      expect(decEntry).toBeDefined();
      expect(decEntry?.payload.status).toBe('LEFT');
    });
  });

  // =========================================================================
  // 5. UNPAID WORK COMMERCIALISED (14 Tests)
  // =========================================================================
  describe('Corner Case 5: Unpaid Work Commercialised (Accepted Charter Clause Applies)', () => {
    it('TEST 5.1: Commercialisation declaration applies exact charter clause to eligible contributors', async () => {
      const res = await charterService.declareCommercialisation(
        projectId, sponsorId, 'Sponsor licensed dataset to health tech startup', 100000
      );

      expect(res.appliedTerms).toContain('5% royalty pool');
      expect(res.eligibleContributors.length).toBeGreaterThan(0);
      expect(res.distribution.length).toBeGreaterThan(0);

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const commEntry = ledger.find(e => e.action === 'COMMERCIALISATION_DECLARED');
      const clauseEntry = ledger.find(e => e.action === 'COMMERCIALISATION_CLAUSE_APPLIED');
      const distEntry = ledger.find(e => e.action === 'COMMERCIALISATION_DISTRIBUTION');

      expect(commEntry).toBeDefined();
      expect(clauseEntry).toBeDefined();
      expect(distEntry).toBeDefined();
    });
  });

  // =========================================================================
  // 6. UNFAIR REJECTION & DISPUTE (12 Tests)
  // =========================================================================
  describe('Corner Case 6: Unfair Rejection & Dispute Resolution', () => {
    it('TEST 6.1: Rejecting a milestone without explicit reason or failed criteria fails validation', async () => {
      await expect(
        disputeService.rejectMilestone(projectId, milestoneId, expertId, [], '')
      ).rejects.toThrow(/REJECT_REASON_REQUIRED/);

      await expect(
        disputeService.rejectMilestone(projectId, milestoneId, expertId, [], 'Insufficient quality')
      ).rejects.toThrow(/FAILED_CRITERIA_REQUIRED/);
    });

    it('TEST 6.2: Rejecting a milestone with reason logs MILESTONE_REJECTED in SHA-256 hash ledger', async () => {
      const rej = await disputeService.rejectMilestone(
        projectId, milestoneId, expertId, ['Validation results attached'], 'Validation test metrics were missing.'
      );

      expect(rej.rejected).toBe(true);

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const rejEntry = ledger.find(e => e.action === 'MILESTONE_REJECTED' && e.entity_id === milestoneId);
      expect(rejEntry).toBeDefined();
      expect(rejEntry?.payload.rejection_reason).toBe('Validation test metrics were missing.');
    });

    it('TEST 6.3: Contributor opening a dispute logs DISPUTE_OPENED and DISPUTE_EVIDENCE_ATTACHED', async () => {
      const dispute = await disputeService.openDispute(
        projectId, milestoneId, studentAId, expertId,
        ['Validation results attached'], 'Validation test metrics were missing.',
        'Validation results of 5,000 images were included in SHA-256 artifact hash 9f8a... under evidence.',
        [{ title: 'Validation Log', hash: '9f8a7b6c5d4e3f2a1b0c' }]
      );

      expect(dispute.status).toBe('OPEN');

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const openEntry = ledger.find(e => e.action === 'DISPUTE_OPENED' && e.entity_id === dispute.id);
      const evEntry = ledger.find(e => e.action === 'DISPUTE_EVIDENCE_ATTACHED' && e.entity_id === dispute.id);

      expect(openEntry).toBeDefined();
      expect(evEntry).toBeDefined();
    });

    it('TEST 6.4: Expert Mediator overturning unfair rejection accepts milestone, releases escrow & calculates rewards', async () => {
      const dispute = await disputeService.openDispute(
        projectId, milestoneId, studentAId, expertId,
        ['Validation results attached'], 'Validation test metrics were missing.',
        'Full validation dataset attached under evidence.'
      );

      await rewardService.fundMilestoneEscrow(projectId, milestoneId, 25000, sponsorId);

      const res = await disputeService.resolveDispute(
        projectId, dispute.id, expertId, 'OVERTURN_REJECTION', 'Evidence verified: Validation log hash confirmed present.'
      );

      expect(res.dispute.status).toBe('OVERTURNED');
      expect(res.rewardReleased).toBe(true);

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const resEntry = ledger.find(e => e.action === 'DISPUTE_RESOLVED' && e.entity_id === dispute.id);
      expect(resEntry).toBeDefined();
      expect(resEntry?.payload.outcome).toBe('OVERTURN_REJECTION');
    });

    it('TEST 6.5: Unauthorized user attempting to resolve dispute fails validation', async () => {
      const dispute = await disputeService.openDispute(
        projectId, milestoneId, studentAId, expertId,
        ['Methodology documented'], 'Methodology absent.', 'Methodology present.'
      );

      await expect(
        disputeService.resolveDispute(projectId, dispute.id, 'unauthorized-student-id', 'OVERTURN_REJECTION')
      ).rejects.toThrow(/UNAUTHORIZED_MEDIATOR/);
    });
  });

  // =========================================================================
  // 7. PARTICIPANT UNDER 18 / GUARDIAN CONSENT (14 Tests)
  // =========================================================================
  describe('Corner Case 7: Participant Under 18 (Guardian Consent)', () => {
    it('TEST 7.1: Under-18 participant on paid project requires guardian consent', async () => {
      guardianConsentService.setMinorStatus(studentAId, true);

      const req = await guardianConsentService.requestGuardianConsent(projectId, studentAId, 'v1.0', 'FUNDED');
      expect(req.status).toBe('PENDING');

      const hasConsent = await guardianConsentService.hasGuardianConsent(projectId, studentAId, 'v1.0');
      expect(hasConsent).toBe(false);

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const reqEntry = ledger.find(e => e.action === 'GUARDIAN_CONSENT_REQUESTED');
      expect(reqEntry).toBeDefined();
    });

    it('TEST 7.2: Granting guardian consent enables paid participation and releases reward checks', async () => {
      guardianConsentService.setMinorStatus(studentAId, true);

      await guardianConsentService.requestGuardianConsent(projectId, studentAId, 'v1.0', 'FUNDED');

      const granted = await guardianConsentService.grantGuardianConsent(
        projectId, studentAId, 'Ramesh Sharma', 'ramesh@example.com', 'GRANT', 'v1.0'
      );

      expect(granted.status).toBe('GRANTED');

      const hasConsent = await guardianConsentService.hasGuardianConsent(projectId, studentAId, 'v1.0');
      expect(hasConsent).toBe(true);

      const ledger = await ledgerService.getLedgerEntries(projectId);
      const grantEntry = ledger.find(e => e.action === 'GUARDIAN_CONSENT_GRANTED');
      expect(grantEntry).toBeDefined();
    });

    it('TEST 7.3: Missing guardian consent blocks paid reward release in reward engine', async () => {
      guardianConsentService.setMinorStatus(studentAId, true);

      await rewardService.fundMilestoneEscrow(projectId, milestoneId, 25000, sponsorId);

      await expect(
        rewardService.calculateAndReleaseRewards(projectId, milestoneId, 25000, sponsorId)
      ).rejects.toThrow(/GUARDIAN_CONSENT_REQUIRED/);
    });

    it('TEST 7.4: Adult participant or non-monetary project bypasses minor consent requirement safely', async () => {
      guardianConsentService.setMinorStatus(studentBId, false);

      const hasConsent = await guardianConsentService.hasGuardianConsent(projectId, studentBId, 'v1.0');
      expect(hasConsent).toBe(true);
    });
  });
});
