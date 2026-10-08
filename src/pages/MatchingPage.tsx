import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MatchingResult, UserProfile, MatchingRequirementSet } from '../types';
import { matchingService } from '../services/matchingService';
import { authService } from '../services/authService';
import { CandidateMatchCard } from '../components/CandidateMatchCard';
import { RequirementConfigEditor } from '../components/RequirementConfigEditor';

export const MatchingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id || 'p1111111-1111-1111-1111-111111111111';

  const [user, setUser] = useState<UserProfile | null>(null);
  const [matches, setMatches] = useState<MatchingResult[]>([]);
  const [showConfigEditor, setShowConfigEditor] = useState(false);

  useEffect(() => {
    authService.getCurrentProfile().then(u => {
      setUser(u);
      loadMatches(projectId);
    });
  }, [projectId]);

  const loadMatches = async (pId: string) => {
    const res = await matchingService.getMatchingResults(pId);
    setMatches(res);
  };

  const handleRequirementApproved = (approvedSet: MatchingRequirementSet) => {
    loadMatches(projectId);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5E5] flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-1">
            MATCHING ENGINE
          </div>
          <h1 className="text-3xl font-medium text-[#000000]">Matched Contributors</h1>
          <p className="text-sm text-[#666666] mt-1">
            Candidate profiles ranked by transparent evaluation against configured, versioned requirement sets.
          </p>
        </div>

        {user && (user.role === 'SPONSOR' || user.role === 'EXPERT' || user.role === 'ADMIN') && (
          <button
            onClick={() => setShowConfigEditor(!showConfigEditor)}
            className="px-4 py-2 border border-[#111111] bg-white hover:bg-[#F5F5F5] text-[#111111] text-xs font-semibold rounded transition-colors shrink-0"
          >
            {showConfigEditor ? 'Hide Requirements Config' : '⚙ Manage Project Requirements'}
          </button>
        )}
      </div>

      {/* Requirement Editor Panel */}
      {showConfigEditor && user && (
        <RequirementConfigEditor
          projectId={projectId}
          user={user}
          onRequirementApproved={handleRequirementApproved}
        />
      )}

      {/* Candidates List */}
      <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
        {matches.map((m, idx) => (
          <CandidateMatchCard key={m.id} match={m} isTopRank={idx === 0} />
        ))}
      </div>
    </div>
  );
};
