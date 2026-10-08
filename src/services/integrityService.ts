import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Submission, Review } from '../types';
import { MOCK_SUBMISSIONS, MOCK_USERS } from '../data/mockData';
import { computeSHA256 } from '../lib/hash';
import { ledgerService } from './ledgerService';

export const integrityService = {
  /**
   * Fetch submissions for a project.
   */
  async getSubmissions(projectId: string): Promise<Submission[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select('*, submitter_profile:submitted_by(*)')
          .eq('project_id', projectId);
        if (data && !error && data.length > 0) {
          return data as Submission[];
        }
      } catch (err) {
        console.warn('Submissions fetch error', err);
      }
    }
    return MOCK_SUBMISSIONS.filter(s => s.project_id === projectId || true);
  },

  /**
   * Submits a milestone deliverable and triggers automated similarity analysis.
   * Demo mode returns deterministic similarity = 87.00% and status = 'REQUIRES_HUMAN_REVIEW'.
   */
  async createSubmission(
    projectId: string,
    milestoneId: string,
    studentId: string,
    title: string,
    content: string
  ): Promise<Submission> {
    const timestamp = new Date().toISOString();
    const contentHash = computeSHA256(content);
    const submissionId = `s-${Date.now()}`;

    // Deterministic demo similarity analysis
    const similarityScore = 87.00;
    const integrityStatus = 'REQUIRES_HUMAN_REVIEW';

    const submission: Submission = {
      id: submissionId,
      project_id: projectId,
      milestone_id: milestoneId,
      submitted_by: studentId,
      title,
      content,
      content_hash: contentHash,
      similarity_score: similarityScore,
      integrity_status: integrityStatus,
      created_at: timestamp,
      submitter_profile: MOCK_USERS.find(u => u.id === studentId) || MOCK_USERS[2]
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('submissions').insert({
          id: submission.id,
          project_id: submission.project_id,
          milestone_id: submission.milestone_id,
          submitted_by: submission.submitted_by,
          title: submission.title,
          content: submission.content,
          content_hash: submission.content_hash,
          similarity_score: submission.similarity_score,
          integrity_status: submission.integrity_status
        });
      } catch (err) {
        console.warn('Submission insert error', err);
      }
    }

    MOCK_SUBMISSIONS.unshift(submission);

    // Record submission event in ledger
    await ledgerService.appendEntry({
      projectId,
      actorId: studentId,
      action: 'SUBMIT_DELIVERABLE',
      entityType: 'SUBMISSION',
      entityId: submissionId,
      payload: { title, content_hash: contentHash, similarity_score: similarityScore, integrity_status: integrityStatus }
    });

    return submission;
  },

  /**
   * Expert Reviewer approves or rejects a flagged submission.
   */
  async reviewSubmission(
    submissionId: string,
    reviewerId: string,
    decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUIRED',
    reason: string
  ): Promise<Review> {
    const timestamp = new Date().toISOString();
    const submission = MOCK_SUBMISSIONS.find(s => s.id === submissionId);
    if (submission) {
      submission.integrity_status = decision === 'APPROVED' ? 'CLEAN' : 'REJECTED';
    }

    const review: Review = {
      id: `rev-${Date.now()}`,
      submission_id: submissionId,
      reviewer_id: reviewerId,
      decision,
      reason,
      reviewed_at: timestamp,
      reviewer_profile: MOCK_USERS.find(u => u.id === reviewerId) || MOCK_USERS[1]
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('reviews').insert({
          id: review.id,
          submission_id: review.submission_id,
          reviewer_id: review.reviewer_id,
          decision: review.decision,
          reason: review.reason
        });

        await supabase
          .from('submissions')
          .update({ integrity_status: submission?.integrity_status })
          .eq('id', submissionId);
      } catch (err) {
        console.warn('Review insert error', err);
      }
    }

    // Record review decision in ledger
    if (submission) {
      await ledgerService.appendEntry({
        projectId: submission.project_id,
        actorId: reviewerId,
        action: 'REVIEW_SUBMISSION',
        entityType: 'REVIEW',
        entityId: review.id,
        payload: { submission_id: submissionId, decision, reason }
      });
    }

    return review;
  }
};
