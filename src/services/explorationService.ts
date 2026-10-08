import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ExplorationSubmission, ExplorationReviewResult, ResearchOutcome } from '../types';
import { MOCK_MILESTONES, MOCK_PROJECTS, MOCK_USERS } from '../data/mockData';
import { ledgerService } from './ledgerService';
import { rewardService } from './rewardService';
import { projectService } from './projectService';
import { authService } from './authService';
import { projectExitService } from './projectExitService';

// In-memory store for exploration submissions in mock/demo mode
const mockExplorationSubmissionsStore: Record<string, ExplorationSubmission> = {};

export const explorationService = {
  /**
   * Fetch exploration submission by ID or milestone ID.
   */
  async getExplorationSubmission(submissionId: string): Promise<ExplorationSubmission | null> {
    if (mockExplorationSubmissionsStore[submissionId]) {
      return mockExplorationSubmissionsStore[submissionId];
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('exploration_submissions')
          .select('*')
          .eq('id', submissionId)
          .single();
        if (data && !error) {
          const sub = data as ExplorationSubmission;
          mockExplorationSubmissionsStore[submissionId] = sub;
          return sub;
        }
      } catch (err) {
        console.warn('Exploration submission fetch error', err);
      }
    }
    return null;
  },

  /**
   * Fetch exploration submissions for a milestone.
   */
  async getMilestoneSubmissions(milestoneId: string): Promise<ExplorationSubmission[]> {
    const list = Object.values(mockExplorationSubmissionsStore).filter(s => s.milestone_id === milestoneId);
    if (list.length > 0) return list;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('exploration_submissions')
          .select('*')
          .eq('milestone_id', milestoneId)
          .order('created_at', { ascending: false });
        if (data && !error && data.length > 0) {
          return data as ExplorationSubmission[];
        }
      } catch (err) {
        console.warn('Milestone exploration submissions fetch error', err);
      }
    }

    const isTest = import.meta.env.MODE === 'test';
    if (isTest || import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      const demoSub: ExplorationSubmission = {
        id: 'sub-exp-demo-001',
        project_id: 'p1111111-1111-1111-1111-111111111111',
        milestone_id: milestoneId || 'm1111111-1111-1111-1111-111111111111',
        contributor_id: 'u3333333-3333-3333-3333-333333333333',
        research_question: 'Can INT8 MobileNetV3 quantization maintain >90% AUC sensitivity on edge fundus images?',
        hypothesis: 'INT8 quantization reduces memory footprint by 74% while maintaining >90% AUC sensitivity.',
        methodology: 'Evaluated PyTorch static int8 quantization across 5,000 validation images under CLAHE contrast enhancement.',
        experiments_performed: 'Tested 4 quantization configurations (symmetric int8, per-channel dynamic, INT8 static calibration, FP16 baseline).',
        results_summary: 'Best static INT8 configuration achieved 84.2% AUC sensitivity, falling short of the 90% requirement due to high frequency edge feature loss.',
        research_outcome: 'NEGATIVE_RESULT',
        negative_findings: 'INT8 post-training quantization causes severe accuracy degradation on micro-aneurysm edge boundaries.',
        lessons_learned: 'Post-training INT8 static quantization is unsuitable for subtle lesion detection without Quantization-Aware Training (QAT).',
        limitations: 'Limited calibration dataset size (500 fundus images) during static quantization calibration step.',
        recommended_next_step: 'Evaluate Quantization-Aware Training (QAT) or 16-bit float (FP16) inference on MobileNetV3.',
        review_status: 'PENDING',
        created_at: new Date().toISOString(),
        contributor_name: 'Rahul Sharma',
        milestone_title: 'Milestone 1: Edge Model Exploration'
      };

      mockExplorationSubmissionsStore[demoSub.id] = demoSub;
      return [demoSub];
    }

    return [];
  },

  /**
   * Submits an exploration research deliverable.
   * Enforces active membership & records negative research outcome in SHA-256 hash ledger.
   */
  async submitExploration(payload: {
    projectId: string;
    milestoneId: string;
    contributorId: string;
    researchQuestion: string;
    hypothesis: string;
    methodology: string;
    experimentsPerformed: string;
    resultsSummary: string;
    researchOutcome: ResearchOutcome;
    negativeFindings?: string;
    lessonsLearned?: string;
    limitations?: string;
    recommendedNextStep?: string;
  }): Promise<ExplorationSubmission> {
    // 1. Enforce Active Membership (Access Revocation check)
    const hasExited = await projectExitService.isMemberExited(payload.projectId, payload.contributorId);
    if (hasExited) {
      throw new Error('PROJECT_MEMBERSHIP_NOT_ACTIVE: Membership status is LEFT. Cannot submit exploration work.');
    }

    const timestamp = new Date().toISOString();
    const submissionId = `sub-exp-${Date.now()}`;
    const contributor = MOCK_USERS.find(u => u.id === payload.contributorId) || MOCK_USERS[2];
    const milestone = MOCK_MILESTONES.find(m => m.id === payload.milestoneId) || MOCK_MILESTONES[0];

    const submission: ExplorationSubmission = {
      id: submissionId,
      project_id: payload.projectId,
      milestone_id: payload.milestoneId,
      contributor_id: payload.contributorId,
      research_question: payload.researchQuestion,
      hypothesis: payload.hypothesis,
      methodology: payload.methodology,
      experiments_performed: payload.experimentsPerformed,
      results_summary: payload.resultsSummary,
      research_outcome: payload.researchOutcome,
      negative_findings: payload.negativeFindings,
      lessons_learned: payload.lessonsLearned,
      limitations: payload.limitations,
      recommended_next_step: payload.recommendedNextStep,
      review_status: 'PENDING',
      created_at: timestamp,
      contributor_name: contributor.full_name,
      milestone_title: milestone.title
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('exploration_submissions').insert(submission);
      } catch (err) {
        console.warn('Supabase exploration submission insert warning', err);
      }
    }

    mockExplorationSubmissionsStore[submissionId] = submission;

    // 2. Append SHA-256 Hash Ledger Entry for Exploration Submission
    const ledgerEntry = await ledgerService.appendEntry({
      projectId: payload.projectId,
      actorId: payload.contributorId,
      action: payload.researchOutcome === 'NEGATIVE_RESULT' ? 'NEGATIVE_RESULT_RECORDED' : 'EXPLORATION_SUBMITTED',
      entityType: 'EXPLORATION',
      entityId: submissionId,
      payload: {
        milestone_id: payload.milestoneId,
        submission_id: submissionId,
        research_question: payload.researchQuestion,
        hypothesis: payload.hypothesis,
        research_outcome: payload.researchOutcome,
        negative_findings_documented: !!payload.negativeFindings,
        lessons_learned_documented: !!payload.lessonsLearned,
        timestamp
      }
    });

    submission.ledger_entry_id = ledgerEntry.id;
    mockExplorationSubmissionsStore[submissionId] = submission;

    return submission;
  },

  /**
   * Reviews an exploration submission.
   * A properly documented negative result IS a valid deliverable and releases escrow & rewards!
   * Enforces authorization (Sponsor/Expert/Admin only; student cannot accept own submission).
   */
  async reviewExplorationSubmission(
    projectId: string,
    submissionId: string,
    reviewerId: string,
    decision: 'ACCEPT' | 'REJECT',
    notes: string = 'Verified documented research effort, methodology, and evidence.'
  ): Promise<ExplorationReviewResult> {
    // 1. Authorization Check: Reviewer must be Sponsor, Expert, or Admin!
    const reviewerUser = MOCK_USERS.find(u => u.id === reviewerId) || await authService.getCurrentProfile();
    const isAuthorized = reviewerUser && (reviewerUser.role === 'SPONSOR' || reviewerUser.role === 'EXPERT' || reviewerUser.role === 'ADMIN');

    if (!isAuthorized) {
      throw new Error('UNAUTHORIZED_REVIEWER: Only Sponsors, Expert Advisors, or Admins can review and accept exploration submissions.');
    }

    const timestamp = new Date().toISOString();
    const submission = await this.getExplorationSubmission(submissionId) || Object.values(mockExplorationSubmissionsStore)[0];

    if (!submission) {
      throw new Error('Exploration submission not found.');
    }

    // 2. Idempotency Check: if already resolved, return existing result
    if (submission.review_status !== 'PENDING') {
      const esc = await rewardService.getEscrowAccount(projectId, submission.milestone_id);
      return {
        submission,
        milestoneStatus: submission.review_status === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED',
        escrowStatus: esc?.status === 'RELEASED' ? 'RELEASED' : 'LOCKED_IN_ESCROW',
        rewardAllocated: esc?.status === 'RELEASED',
        ledgerAction: submission.review_status === 'ACCEPTED' ? 'EXPLORATION_ACCEPTED' : 'EXPLORATION_REJECTED',
        documentedEffortVerified: submission.review_status === 'ACCEPTED'
      };
    }

    const project = await projectService.getProjectById(projectId);
    const isFunded = project?.engagement_model === 'FUNDED';
    const sponsorId = project?.created_by || reviewerId;
    const milestone = MOCK_MILESTONES.find(m => m.id === submission.milestone_id) || MOCK_MILESTONES[0];

    if (decision === 'ACCEPT') {
      submission.review_status = 'ACCEPTED';
      submission.reviewed_by = reviewerId;
      submission.reviewed_at = timestamp;
      submission.reviewer_notes = notes;

      let rewardAllocated = false;
      let escrowStatus: 'LOCKED_IN_ESCROW' | 'RELEASED' = 'LOCKED_IN_ESCROW';

      // 3. For Funded Projects: Release Escrow & Invoke Existing Reward Engine
      if (isFunded) {
        try {
          const { escrow } = await rewardService.calculateAndReleaseRewards(
            projectId,
            submission.milestone_id,
            milestone.budget || 25000,
            sponsorId
          );
          escrowStatus = escrow.status === 'RELEASED' ? 'RELEASED' : 'LOCKED_IN_ESCROW';
          rewardAllocated = true;
        } catch (err: any) {
          console.warn('Escrow release warning during exploration acceptance', err.message);
        }
      }

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('exploration_submissions')
            .update({
              review_status: 'ACCEPTED',
              reviewed_by: reviewerId,
              reviewed_at: timestamp,
              reviewer_notes: notes
            })
            .eq('id', submissionId);

          await supabase.from('milestones').update({ status: 'ACCEPTED' }).eq('id', submission.milestone_id);
        } catch (err) {
          console.warn('Supabase exploration acceptance update warning', err);
        }
      }

      mockExplorationSubmissionsStore[submissionId] = submission;

      // 4. Append SHA-256 Hash Ledger Entry for Exploration Acceptance
      await ledgerService.appendEntry({
        projectId,
        actorId: reviewerId,
        action: 'EXPLORATION_ACCEPTED',
        entityType: 'EXPLORATION',
        entityId: submissionId,
        payload: {
          submission_id: submissionId,
          milestone_id: submission.milestone_id,
          research_outcome: submission.research_outcome,
          documented_effort_verified: true,
          negative_result_accepted: submission.research_outcome === 'NEGATIVE_RESULT',
          escrow_released: isFunded,
          reward_allocated: rewardAllocated,
          reviewer_id: reviewerId,
          timestamp
        }
      });

      return {
        submission,
        milestoneStatus: 'ACCEPTED',
        escrowStatus,
        rewardAllocated,
        ledgerAction: 'EXPLORATION_ACCEPTED',
        documentedEffortVerified: true
      };
    } else {
      submission.review_status = 'REJECTED';
      submission.reviewed_by = reviewerId;
      submission.reviewed_at = timestamp;
      submission.reviewer_notes = notes;

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('exploration_submissions')
            .update({
              review_status: 'REJECTED',
              reviewed_by: reviewerId,
              reviewed_at: timestamp,
              reviewer_notes: notes
            })
            .eq('id', submissionId);
        } catch (err) {
          console.warn('Supabase exploration rejection update warning', err);
        }
      }

      mockExplorationSubmissionsStore[submissionId] = submission;

      await ledgerService.appendEntry({
        projectId,
        actorId: reviewerId,
        action: 'EXPLORATION_REJECTED',
        entityType: 'EXPLORATION',
        entityId: submissionId,
        payload: {
          submission_id: submissionId,
          milestone_id: submission.milestone_id,
          reviewer_id: reviewerId,
          reason: notes,
          timestamp
        }
      });

      return {
        submission,
        milestoneStatus: 'REJECTED',
        escrowStatus: 'LOCKED_IN_ESCROW',
        rewardAllocated: false,
        ledgerAction: 'EXPLORATION_REJECTED',
        documentedEffortVerified: false
      };
    }
  }
};
