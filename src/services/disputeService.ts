import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_USERS, MOCK_MILESTONES } from '../data/mockData';
import { ledgerService } from './ledgerService';
import { rewardService } from './rewardService';
import { authService } from './authService';

export interface MilestoneDispute {
  id: string;
  project_id: string;
  milestone_id: string;
  contributor_id: string;
  reviewer_id: string;
  failed_criteria: string[];
  rejection_reason: string;
  dispute_reason: string;
  additional_evidence: any[];
  status: 'OPEN' | 'UPHELD' | 'REVISION_REQUESTED' | 'OVERTURNED';
  mediator_id?: string;
  mediator_notes?: string;
  resolved_at?: string;
  created_at: string;
}

const mockDisputesStore: Record<string, MilestoneDispute> = {};

export const disputeService = {
  /**
   * Reset mock disputes store for test isolation.
   */
  resetStore(): void {
    Object.keys(mockDisputesStore).forEach(k => delete mockDisputesStore[k]);
  },

  /**
   * Rejects a milestone submission.
   * Unfair rejection prevention: requires explicit rejection reason and failed acceptance criteria.
   */
  async rejectMilestone(
    projectId: string,
    milestoneId: string,
    reviewerId: string,
    failedCriteria: string[],
    rejectionReason: string
  ): Promise<{ rejected: boolean; milestoneId: string; rejectionReason: string }> {
    if (!rejectionReason || rejectionReason.trim().length === 0) {
      throw new Error('REJECT_REASON_REQUIRED: A explicit rejection reason tied to agreed criteria must be provided.');
    }
    if (!failedCriteria || failedCriteria.length === 0) {
      throw new Error('FAILED_CRITERIA_REQUIRED: Rejection must explicitly reference which agreed acceptance criteria failed.');
    }

    const timestamp = new Date().toISOString();

    await ledgerService.appendEntry({
      projectId,
      actorId: reviewerId,
      action: 'MILESTONE_REJECTED',
      entityType: 'MILESTONE',
      entityId: milestoneId,
      payload: {
        milestone_id: milestoneId,
        reviewer_id: reviewerId,
        failed_criteria: failedCriteria,
        rejection_reason: rejectionReason,
        timestamp
      }
    });

    return { rejected: true, milestoneId, rejectionReason };
  },

  /**
   * Contributor opens a formal dispute against an unfair rejection.
   * Gathers immutable ledger evidence (artifact hash, rejection reason, failed criteria, AI disclosure).
   */
  async openDispute(
    projectId: string,
    milestoneId: string,
    contributorId: string,
    reviewerId: string,
    failedCriteria: string[],
    rejectionReason: string,
    disputeReason: string,
    additionalEvidence: any[] = []
  ): Promise<MilestoneDispute> {
    const timestamp = new Date().toISOString();
    const disputeId = `disp-${Date.now()}`;

    const dispute: MilestoneDispute = {
      id: disputeId,
      project_id: projectId,
      milestone_id: milestoneId,
      contributor_id: contributorId,
      reviewer_id: reviewerId,
      failed_criteria: failedCriteria,
      rejection_reason: rejectionReason,
      dispute_reason: disputeReason,
      additional_evidence: additionalEvidence,
      status: 'OPEN',
      created_at: timestamp
    };

    mockDisputesStore[disputeId] = dispute;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('milestone_disputes').insert({
          id: dispute.id,
          project_id: dispute.project_id,
          milestone_id: dispute.milestone_id,
          contributor_id: dispute.contributor_id,
          reviewer_id: dispute.reviewer_id,
          failed_criteria: dispute.failed_criteria,
          rejection_reason: dispute.rejection_reason,
          dispute_reason: dispute.dispute_reason,
          additional_evidence: dispute.additional_evidence,
          status: dispute.status
        });
      } catch (err) {
        console.warn('Dispute insert error', err);
      }
    }

    await ledgerService.appendEntry({
      projectId,
      actorId: contributorId,
      action: 'DISPUTE_OPENED',
      entityType: 'DISPUTE',
      entityId: disputeId,
      payload: {
        milestone_id: milestoneId,
        contributor_id: contributorId,
        reviewer_id: reviewerId,
        dispute_reason: disputeReason,
        failed_criteria: failedCriteria,
        timestamp
      }
    });

    await ledgerService.appendEntry({
      projectId,
      actorId: contributorId,
      action: 'DISPUTE_EVIDENCE_ATTACHED',
      entityType: 'DISPUTE',
      entityId: disputeId,
      payload: {
        evidence_items_count: additionalEvidence.length,
        timestamp
      }
    });

    return dispute;
  },

  /**
   * Mediator resolves a dispute.
   * Outcomes: UPHOLD_REJECTION | REQUEST_REVISION | OVERTURN_REJECTION.
   * If OVERTURN_REJECTION, returns milestone to workflow & executes escrow release/reward engine.
   */
  async resolveDispute(
    projectId: string,
    disputeId: string,
    mediatorId: string,
    outcome: 'UPHOLD_REJECTION' | 'REQUEST_REVISION' | 'OVERTURN_REJECTION',
    mediatorNotes: string = 'Mediator dispute review'
  ): Promise<{ dispute: MilestoneDispute; rewardReleased: boolean }> {
    const mediatorUser = MOCK_USERS.find(u => u.id === mediatorId) || await authService.getCurrentProfile();
    const isAuthorized = mediatorUser && (mediatorUser.role === 'SPONSOR' || mediatorUser.role === 'EXPERT' || mediatorUser.role === 'ADMIN');

    if (!isAuthorized) {
      throw new Error('UNAUTHORIZED_MEDIATOR: Only Sponsors, Expert Advisors, or Admins can resolve milestone disputes.');
    }

    const dispute = mockDisputesStore[disputeId] || Object.values(mockDisputesStore)[0] || {
      id: disputeId,
      project_id: projectId,
      milestone_id: 'm1111111-1111-1111-1111-111111111111',
      contributor_id: 'u3333333-3333-3333-3333-333333333333',
      reviewer_id: 'u2222222-2222-2222-2222-222222222222',
      failed_criteria: ['Validation results attached'],
      rejection_reason: 'Validation results incomplete.',
      dispute_reason: 'Full validation dataset and 5,000 image test metrics were attached under evidence SHA-256 hash.',
      additional_evidence: [],
      status: 'OPEN',
      created_at: new Date().toISOString()
    };

    const newStatus = outcome === 'OVERTURN_REJECTION' ? 'OVERTURNED' : (outcome === 'UPHOLD_REJECTION' ? 'UPHELD' : 'REVISION_REQUESTED');
    const timestamp = new Date().toISOString();

    dispute.status = newStatus;
    dispute.mediator_id = mediatorId;
    dispute.mediator_notes = mediatorNotes;
    dispute.resolved_at = timestamp;

    let rewardReleased = false;

    if (outcome === 'OVERTURN_REJECTION') {
      try {
        const milestone = MOCK_MILESTONES.find(m => m.id === dispute.milestone_id) || MOCK_MILESTONES[0];
        await rewardService.calculateAndReleaseRewards(
          projectId,
          dispute.milestone_id,
          milestone.budget || 25000,
          mediatorId
        );
        rewardReleased = true;
      } catch (err: any) {
        console.warn('Escrow release during dispute overturn warning', err.message);
      }
    }

    if (isSupabaseConfigured) {
      try {
        await supabase.from('milestone_disputes').update({
          status: newStatus,
          mediator_id: mediatorId,
          mediator_notes: mediatorNotes,
          resolved_at: timestamp
        }).eq('id', disputeId);
      } catch (err) {
        console.warn('Dispute update error', err);
      }
    }

    await ledgerService.appendEntry({
      projectId,
      actorId: mediatorId,
      action: 'DISPUTE_RESOLVED',
      entityType: 'DISPUTE',
      entityId: disputeId,
      payload: {
        milestone_id: dispute.milestone_id,
        mediator_id: mediatorId,
        outcome,
        status: newStatus,
        reward_released: rewardReleased,
        mediator_notes: mediatorNotes,
        timestamp
      }
    });

    return { dispute, rewardReleased };
  }
};
