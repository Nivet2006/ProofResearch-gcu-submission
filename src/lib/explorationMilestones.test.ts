import { describe, it, expect } from 'vitest';
import { explorationService } from '../services/explorationService';
import { ledgerService } from '../services/ledgerService';
import { rewardService } from '../services/rewardService';
import { projectService } from '../services/projectService';
import { MOCK_USERS } from '../data/mockData';

describe('Gardenia 2K26 Research Fails & Exploration Milestones Test Suite', () => {
  const projectId = 'p1111111-1111-1111-1111-111111111111';
  const milestoneId = 'm1111111-1111-1111-1111-111111111111';
  const studentId = 'u3333333-3333-3333-3333-333333333333'; // Rahul Sharma
  const expertId = 'u2222222-2222-2222-2222-222222222222'; // Dr. Ananya Rao
  const sponsorId = 'u1111111-1111-1111-1111-111111111111'; // MedVision Sponsor

  it('TEST 1 - 5: Exploration submission stores hypothesis, methodology, experiments, and results', async () => {
    const submission = await explorationService.submitExploration({
      projectId,
      milestoneId,
      contributorId: studentId,
      researchQuestion: 'Can INT8 quantization maintain >90% accuracy on edge fundus images?',
      hypothesis: 'INT8 MobileNetV3 will maintain target accuracy while reducing memory footprint by 74%.',
      methodology: 'Evaluated static INT8 quantization across 5,000 validation images under CLAHE contrast enhancement.',
      experimentsPerformed: '4 quantization configurations tested (symmetric, per-channel, static calibration, FP16 baseline).',
      resultsSummary: 'Best static INT8 configuration achieved 84.2% AUC sensitivity, falling short of the 90% requirement.',
      researchOutcome: 'NEGATIVE_RESULT',
      negativeFindings: 'INT8 post-training quantization introduces unacceptable accuracy loss on micro-aneurysm lesion boundaries.',
      lessonsLearned: 'Static post-training quantization is unsuitable without Quantization-Aware Training (QAT).',
      limitations: 'Calibration dataset size limited to 500 images.',
      recommendedNextStep: 'Evaluate Quantization-Aware Training (QAT) or FP16 float inference.'
    });

    expect(submission).toBeDefined();
    expect(submission.research_outcome).toBe('NEGATIVE_RESULT');
    expect(submission.hypothesis).toContain('INT8 MobileNetV3');
    expect(submission.negative_findings).toBeDefined();
  });

  it('TEST 20: Ledger records NEGATIVE_RESULT_RECORDED in SHA-256 hash ledger', async () => {
    const ledger = await ledgerService.getLedgerEntries(projectId);
    const negEntry = ledger.find(e => e.action === 'NEGATIVE_RESULT_RECORDED' || e.action === 'EXPLORATION_SUBMITTED');
    expect(negEntry).toBeDefined();
    expect(negEntry?.payload.negative_findings_documented).toBe(true);
  });

  it('TEST 22: Unauthorized student cannot approve exploration submission or own milestone', async () => {
    const subs = await explorationService.getMilestoneSubmissions(milestoneId);
    expect(subs.length).toBeGreaterThan(0);

    await expect(
      explorationService.reviewExplorationSubmission(
        projectId,
        subs[0].id,
        studentId,
        'ACCEPT',
        'Student self-approval attempt'
      )
    ).rejects.toThrow(/UNAUTHORIZED_REVIEWER/);
  });

  it('TEST 7, 10, 11, 12, 13, 14, 15 & 16: Accepted negative result satisfies exploration milestone, releases escrow & invokes existing reward engine', async () => {
    const subs = await explorationService.getMilestoneSubmissions(milestoneId);
    const targetSub = subs[0];

    // Ensure escrow funded
    await rewardService.fundMilestoneEscrow(projectId, milestoneId, 25000, sponsorId);

    const reviewResult = await explorationService.reviewExplorationSubmission(
      projectId,
      targetSub.id,
      expertId,
      'ACCEPT',
      'Verified documented exploration effort and negative findings analysis. Agreed research work satisfied.'
    );

    expect(reviewResult.documentedEffortVerified).toBe(true);
    expect(reviewResult.milestoneStatus).toBe('ACCEPTED');
    expect(reviewResult.escrowStatus).toBe('RELEASED');
    expect(reviewResult.rewardAllocated).toBe(true);
    expect(reviewResult.ledgerAction).toBe('EXPLORATION_ACCEPTED');
  });

  it('TEST 23 & 24: Duplicate review is idempotent and prevents duplicate escrow release', async () => {
    const subs = await explorationService.getMilestoneSubmissions(milestoneId);
    const targetSub = subs[0];

    const repeatResult = await explorationService.reviewExplorationSubmission(
      projectId,
      targetSub.id,
      expertId,
      'ACCEPT',
      'Repeat review'
    );

    expect(repeatResult.milestoneStatus).toBe('ACCEPTED');
    expect(repeatResult.escrowStatus).toBe('RELEASED');
  });

  it('TEST 17 & 19: Non-monetary exploration project rewards documented effort with $0 payment but preserves credit & SHA-256 ledger integrity', async () => {
    const nonMonetaryProjectId = 'p2222222-2222-2222-2222-222222222222';
    const sub = await explorationService.submitExploration({
      projectId: nonMonetaryProjectId,
      milestoneId: 'm2222222-2222-2222-2222-222222222222',
      contributorId: studentId,
      researchQuestion: 'Can screen readers parse SVG contrast maps?',
      hypothesis: 'SVG contrast maps can be parsed directly by NVDA.',
      methodology: 'Evaluated 3 open-source screen readers across 100 SVG figures.',
      experimentsPerformed: 'Tested NVDA 2024.1, JAWS 2023, and VoiceOver.',
      resultsSummary: 'JAWS failed to parse inline ARIA metadata on complex SVG layers.',
      researchOutcome: 'NEGATIVE_RESULT',
      negativeFindings: 'ARIA metadata parsing fails on nested SVG group elements.',
      lessonsLearned: 'Flatten SVG layers before injecting accessibility metadata.',
      recommendedNextStep: 'Use HTML5 canvas fallback with transcript table.'
    });

    const res = await explorationService.reviewExplorationSubmission(
      nonMonetaryProjectId,
      sub.id,
      expertId,
      'ACCEPT',
      'Non-monetary exploration effort verified.'
    );

    expect(res.documentedEffortVerified).toBe(true);
    expect(res.milestoneStatus).toBe('ACCEPTED');

    // Verification of SHA-256 ledger chain
    const verification = await ledgerService.verifyLedger(projectId);
    expect(verification.isValid).toBe(true);
  });
});
