import React, { useState } from 'react';
import { Submission, Review } from '../types';
import { integrityService } from '../services/integrityService';

interface SimilarityResultProps {
  submission: Submission;
  reviewerId: string;
  reviewerName: string;
  onReviewed: (review: Review) => void;
}

export const SimilarityResult: React.FC<SimilarityResultProps> = ({
  submission,
  reviewerId,
  reviewerName,
  onReviewed
}) => {
  const [reason, setReason] = useState('Open-source pre-processing CLAHE utility function confirmed valid and non-plagiarized.');
  const [submitting, setSubmitting] = useState(false);

  const handleReviewAction = async (decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUIRED') => {
    setSubmitting(true);
    try {
      const review = await integrityService.reviewSubmission(submission.id, reviewerId, decision, reason);
      onReviewed(review);
    } catch (err) {
      console.error('Error recording expert review', err);
    } finally {
      setSubmitting(false);
    }
  };

  const isFlagged = submission.integrity_status === 'REQUIRES_HUMAN_REVIEW';
  const isApproved = submission.integrity_status === 'CLEAN';

  return (
    <div className="border border-[#E5E5E5] bg-[#FFFFFF] rounded p-6 space-y-6 text-xs">
      {/* Alert Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div className="space-y-1">
          <div className="font-medium text-[#000000] text-sm">
            Similarity Analysis: {submission.similarity_score}% Code Overlap Detected
          </div>
          <p className="text-xs text-[#666666]">
            Code overlap flagged against open-source repository index. Mandatory expert review required.
          </p>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[11px] text-[#888888] block">Status</span>
          <span className="font-semibold text-[#000000]">
            {isFlagged ? 'Human Review Required' : isApproved ? 'Approved' : submission.integrity_status}
          </span>
        </div>
      </div>

      {/* Deliverable Content */}
      <div className="bg-[#F5F5F5] p-4 rounded border border-[#E5E5E5] space-y-2">
        <div className="flex items-center justify-between text-[#666666]">
          <span>Deliverable: <strong className="text-[#000000]">{submission.title}</strong></span>
          <span>Submitter: <strong className="text-[#000000]">{submission.submitter_profile?.full_name || 'Rahul Sharma'}</strong></span>
        </div>
        <p className="text-[#000000] text-xs p-3 bg-[#FFFFFF] rounded border border-[#E5E5E5] font-mono">
          {submission.content}
        </p>
        <div className="text-[11px] text-[#888888]">
          Content Hash: <code className="font-mono text-[#000000]">{submission.content_hash}</code>
        </div>
      </div>

      {/* Expert Review Actions */}
      {isFlagged ? (
        <div className="bg-[#F5F5F5] p-5 rounded border border-[#E5E5E5] space-y-4">
          <div className="font-semibold text-[#000000]">
            Domain Expert Review ({reviewerName})
          </div>

          <div>
            <label className="block text-[#666666] mb-1">
              Verification Notes & Rationale:
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full bg-[#FFFFFF] border border-[#CCCCCC] text-[#000000] p-2.5 rounded focus:outline-none focus:border-[#000000] text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleReviewAction('APPROVED')}
              disabled={submitting}
              className="px-4 py-2 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] font-medium rounded transition-colors text-xs"
            >
              APPROVE DELIVERABLE
            </button>

            <button
              onClick={() => handleReviewAction('REJECTED')}
              disabled={submitting}
              className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#F5F5F5] text-[#000000] border border-[#CCCCCC] font-medium rounded transition-colors text-xs"
            >
              REJECT DELIVERABLE
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#F5F5F5] border border-[#E5E5E5] p-4 rounded text-[#000000] space-y-1">
          <div className="font-semibold text-sm">✓ Deliverable Approved by Expert Reviewer</div>
          <div className="text-xs text-[#666666]">Reason: {reason}</div>
        </div>
      )}
    </div>
  );
};
