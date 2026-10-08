import { describe, it, expect, beforeEach } from 'vitest';
import { sponsorSilenceService } from '../services/sponsorSilenceService';
import { ledgerService } from '../services/ledgerService';
import { rewardService } from '../services/rewardService';
import { MOCK_USERS } from '../data/mockData';

describe('Gardenia 2K26 Sponsor Silence & Mediation Corner Case Test Suite', () => {
  const projectId = 'p1111111-1111-1111-1111-111111111111';
  const milestoneId = 'm1111111-1111-1111-1111-111111111111';
  const expertId = 'u2222222-2222-2222-2222-222222222222'; // Dr. Ananya Rao (EXPERT)
  const studentId = 'u3333333-3333-3333-3333-333333333333'; // Rahul Sharma (STUDENT)
  const sponsorId = 'u1111111-1111-1111-1111-111111111111'; // Sponsor

  it('TEST 1: Acceptance window created with 48h deadline & policy', async () => {
    const window = await sponsorSilenceService.startAcceptanceWindow(projectId, milestoneId, 48, 'MEDIATOR');
    expect(window).toBeDefined();
    expect(window.policy).toBe('MEDIATOR');
    expect(new Date(window.deadline).getTime()).toBeGreaterThan(new Date(window.startedAt).getTime());
  });

  it('TEST 2 & 3: Ledger logs ACCEPTANCE_WINDOW_STARTED', async () => {
    const ledger = await ledgerService.getLedgerEntries(projectId);
    const startEntry = ledger.find(e => e.action === 'ACCEPTANCE_WINDOW_STARTED');
    expect(startEntry).toBeDefined();
  });

  it('TEST 4, 6 & 9: Timeout under MEDIATOR policy moves to MEDIATION_REQUIRED while escrow remains LOCKED_IN_ESCROW', async () => {
    const result = await sponsorSilenceService.checkAndProcessTimeout(projectId, milestoneId, true);
    expect(result.newStatus).toBe('MEDIATION_REQUIRED');
    expect(result.policy).toBe('MEDIATOR');
    expect(result.escrowStatus).toBe('LOCKED_IN_ESCROW');
    expect(result.rewardAllocated).toBe(false);
    expect(result.mediationCase).toBeDefined();
    expect(result.mediationCase?.status).toBe('PENDING');
  });

  it('TEST 12, 14 & 15: Duplicate timeout processing is idempotent (prevents duplicate payouts or ledger entries)', async () => {
    const ledgerBefore = await ledgerService.getLedgerEntries(projectId);
    const eventsBefore = ledgerBefore.filter(e => e.action === 'MEDIATION_REQUESTED').length;

    const repeatResult = await sponsorSilenceService.checkAndProcessTimeout(projectId, milestoneId, true);
    expect(repeatResult.newStatus).toBe('MEDIATION_REQUIRED');
    expect(repeatResult.escrowStatus).toBe('LOCKED_IN_ESCROW');

    const ledgerAfter = await ledgerService.getLedgerEntries(projectId);
    const eventsAfter = ledgerAfter.filter(e => e.action === 'MEDIATION_REQUESTED').length;
    expect(eventsAfter).toBe(eventsBefore);
  });

  it('TEST 16 & 17: Unauthorized student cannot approve mediation case or own milestone', async () => {
    await expect(
      sponsorSilenceService.processMediatorDecision(
        projectId,
        milestoneId,
        studentId,
        'ACCEPT',
        'Student attempt'
      )
    ).rejects.toThrow(/UNAUTHORIZED_MEDIATOR/);
  });

  it('TEST 7, 10, 11 & 13: Expert Mediator ACCEPT resolves case, releases escrow & calculates rewards', async () => {
    const res = await sponsorSilenceService.processMediatorDecision(
      projectId,
      milestoneId,
      expertId,
      'ACCEPT',
      'Verified pre-processing deliverables and CLAHE transformation scripts.'
    );

    expect(res.newStatus).toBe('ACCEPTED');
    expect(res.escrowStatus).toBe('RELEASED');
    expect(res.rewardAllocated).toBe(true);
    expect(res.mediationCase?.status).toBe('RESOLVED_ACCEPTED');

    // Re-invocation is idempotent
    const repeatRes = await sponsorSilenceService.processMediatorDecision(
      projectId,
      milestoneId,
      expertId,
      'ACCEPT',
      'Repeat call'
    );
    expect(repeatRes.newStatus).toBe('ACCEPTED');
    expect(repeatRes.escrowStatus).toBe('RELEASED');
  });

  it('TEST 5, 18, 19 & 20: Timeout under AUTO_ACCEPT policy automatically accepts milestone & verifies hash ledger chain', async () => {
    const autoMilestoneId = 'm2222222-2222-2222-2222-222222222222';
    await rewardService.fundMilestoneEscrow(projectId, autoMilestoneId, 25000, sponsorId);
    await sponsorSilenceService.startAcceptanceWindow(projectId, autoMilestoneId, 48, 'AUTO_ACCEPT');
    
    const autoRes = await sponsorSilenceService.checkAndProcessTimeout(projectId, autoMilestoneId, true);
    expect(autoRes.newStatus).toBe('ACCEPTED');
    expect(autoRes.policy).toBe('AUTO_ACCEPT');
    expect(autoRes.escrowStatus).toBe('RELEASED');

    // SHA-256 Ledger chain verification
    const verification = await ledgerService.verifyLedger(projectId);
    expect(verification.isValid).toBe(true);
  });
});
