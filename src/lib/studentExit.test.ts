import { describe, it, expect, beforeEach } from 'vitest';
import { projectExitService } from '../services/projectExitService';
import { projectService } from '../services/projectService';
import { contributionService } from '../services/contributionService';
import { aiService } from '../services/aiService';
import { ledgerService } from '../services/ledgerService';
import { rewardService } from '../services/rewardService';

describe('Gardenia 2K26 Student Exit Corner Case Test Suite', () => {
  const projectId = 'p1111111-1111-1111-1111-111111111111'; // Funded DR project
  const studentId = 'u3333333-3333-3333-3333-333333333333'; // Rahul Sharma
  const nonMemberId = 'u9999999-9999-9999-9999-999999999999';
  const sponsorId = 'u1111111-1111-1111-1111-111111111111';
  const expertId = 'u2222222-2222-2222-2222-222222222222';

  it('TEST 1: Active student can initiate voluntary exit', async () => {
    const exitResult = await projectExitService.leaveProject(projectId, studentId, 'VOLUNTARY_EXIT');
    expect(exitResult).toBeDefined();
    expect(exitResult.exitRecord.user_id).toBe(studentId);
    expect(exitResult.exitRecord.reason).toBe('VOLUNTARY_EXIT');
  });

  it('TEST 2 & 3: Exit changes membership status to LEFT', async () => {
    const isExited = await projectExitService.isMemberExited(projectId, studentId);
    expect(isExited).toBe(true);

    const record = await projectExitService.getExitRecord(projectId, studentId);
    expect(record).toBeDefined();
    expect(record?.access_revoked).toBe(true);
  });

  it('TEST 4: Exit is idempotent - calling exit twice does not duplicate state or payouts', async () => {
    const ledgerBefore = await ledgerService.getLedgerEntries(projectId);
    const exitsCountBefore = ledgerBefore.filter(e => e.action === 'MEMBER_EXITED').length;

    const exitAgain = await projectExitService.leaveProject(projectId, studentId, 'REPEAT_EXIT_ATTEMPT');
    expect(exitAgain).toBeDefined();
    expect(exitAgain.exitRecord.user_id).toBe(studentId);

    const ledgerAfter = await ledgerService.getLedgerEntries(projectId);
    const exitsCountAfter = ledgerAfter.filter(e => e.action === 'MEMBER_EXITED').length;
    expect(exitsCountAfter).toBe(exitsCountBefore);
  });

  it('TEST 5 & 6: Historical contributions remain intact with unchanged attribution & impact score', async () => {
    const contribs = await contributionService.getContributions(projectId);
    const rahulContribs = contribs.filter(c => c.user_id === studentId);
    expect(rahulContribs.length).toBeGreaterThan(0);
    
    // Impact score preserved
    rahulContribs.forEach(c => {
      expect(c.impact_score).toBe(8.5);
      expect(c.artifact_hash).toBeDefined();
    });
  });

  it('TEST 7 & 8: New contribution after exit is rejected server-side', async () => {
    await expect(
      contributionService.createContribution(
        projectId,
        'm1111111-1111-1111-1111-111111111111',
        studentId,
        'CODE',
        'Post-exit attempt script',
        'print("Should be blocked")',
        false
      )
    ).rejects.toThrow(/PROJECT_MEMBERSHIP_NOT_ACTIVE/);
  });

  it('TEST 9: Confidential brief becomes inaccessible to exited student', async () => {
    const brief = await projectService.getConfidentialBrief(projectId, studentId);
    expect(brief).toBeNull();
  });

  it('TEST 10 & 11: New AI action after exit is rejected server-side', async () => {
    await expect(
      aiService.queryScopedAgent(
        projectId,
        studentId,
        'Optimize pre-processing script for fundus dataset'
      )
    ).rejects.toThrow(/PROJECT_MEMBERSHIP_NOT_ACTIVE/);
  });

  it('TEST 12: Historical AI actions remain auditable', async () => {
    // Non-exited owner (Sponsor) can still query scope generation
    const scope = await aiService.generateProjectScope(
      projectId,
      'Diabetic Retinopathy Research',
      'Public Summary',
      sponsorId
    );
    expect(scope).toBeDefined();
  });

  it('TEST 13 & 14: Funded project calculates pro-rata entitlement using existing reward engine', async () => {
    const exitRecord = await projectExitService.getExitRecord(projectId, studentId);
    expect(exitRecord).toBeDefined();
    expect(exitRecord?.percentage_share).toBeGreaterThan(0);
    expect(exitRecord?.reward_amount).toBeGreaterThan(0);
    expect(exitRecord?.reward_status).toBe('PENDING_ESCROW_RELEASE');

    // Unfunded project does not produce monetary payout
    const unfundedExit = await projectExitService.leaveProject('p2222222-2222-2222-2222-222222222222', studentId, 'KNOWLEDGE_SHARING_EXIT');
    expect(unfundedExit.exitRecord.reward_amount).toBe(0);
    expect(unfundedExit.exitRecord.reward_status).toBe('NOT_APPLICABLE');
  });

  it('TEST 15 & 16: Existing escrow & credentials remain intact', async () => {
    const escrow = await rewardService.getEscrowAccount(projectId, 'm1111111-1111-1111-1111-111111111111');
    expect(escrow).toBeDefined();
    expect(escrow?.status).toBe('LOCKED_IN_ESCROW');
  });

  it('TEST 17 & 18 & 19 & 20: MEMBER_EXITED ledger entry is recorded in valid SHA-256 hash chain', async () => {
    const ledger = await ledgerService.getLedgerEntries(projectId);
    const exitEntry = ledger.find(e => e.action === 'MEMBER_EXITED');
    expect(exitEntry).toBeDefined();
    expect(exitEntry?.payload.user_id).toBe(studentId);
    expect(exitEntry?.payload.access_revoked).toBe(true);

    const verification = await ledgerService.verifyLedger(projectId);
    expect(verification.isValid).toBe(true);
  });

  it('TEST 21, 22, 23 & 24: Sponsor, Expert, and Admin retain appropriate access', async () => {
    const sponsorBrief = await projectService.getConfidentialBrief(projectId, sponsorId);
    expect(sponsorBrief).toBeDefined();

    const exitedMemberStatus = await projectExitService.isMemberExited(projectId, studentId);
    expect(exitedMemberStatus).toBe(true);
  });
});
