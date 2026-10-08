import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Submission, Review, UserProfile } from '../types';
import { integrityService } from '../services/integrityService';
import { authService } from '../services/authService';
import { SimilarityResult } from '../components/SimilarityResult';
import { SemanticSimilarityAnalysis } from '../components/SemanticSimilarityAnalysis';

export const ContributionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id || 'p1111111-1111-1111-1111-111111111111';

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    authService.getCurrentProfile().then(u => {
      setUser(u);
      integrityService.getSubmissions(projectId).then(setSubmissions);
    });
  }, [projectId]);

  const handleReviewed = (review: Review) => {
    integrityService.getSubmissions(projectId).then(setSubmissions);
  };

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5E5]">
        <h1 className="text-2xl md:text-3xl font-medium text-[#111111]">Evidence & Similarity Review</h1>
        <p className="text-sm text-[#6B6B6B] mt-1">
          Automated similarity scanning and domain expert verification for submitted research deliverables.
        </p>
      </div>

      {/* ─── ML Semantic Similarity Engine ─── */}
      <SemanticSimilarityAnalysis projectId={projectId} />

      {/* Submissions & Reviews */}
      {submissions.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-base font-semibold text-neutral-800 border-b border-neutral-100 pb-3">
            Submitted Contributions
          </h2>
          {submissions.map((s) => (
            <SimilarityResult
              key={s.id}
              submission={s}
              reviewerId={user.id}
              reviewerName={user.full_name}
              onReviewed={handleReviewed}
            />
          ))}
        </div>
      )}
    </div>
  );
};
