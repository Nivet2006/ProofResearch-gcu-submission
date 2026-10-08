import React from 'react';
import { MatchingResult } from '../types';

interface CandidateMatchCardProps {
  match: MatchingResult;
  isTopRank?: boolean;
}

export const CandidateMatchCard: React.FC<CandidateMatchCardProps> = ({ match, isTopRank }) => {
  const profile = match.candidate_profile?.profile;
  const candidateSkills = match.candidate_profile?.skills || [];
  const evaluations = match.evaluations || [];

  return (
    <div className="py-6 border-b border-[#E5E5E5] space-y-4 text-xs">
      {/* Candidate Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-medium text-[#000000]">{profile?.full_name}</h3>
            {isTopRank && (
              <span className="text-[11px] font-semibold text-[#000000] border border-[#000000] px-2 py-0.5 rounded">
                Recommended Candidate
              </span>
            )}
            {match.requirement_set_version && (
              <span className="text-[10px] font-mono bg-[#F5F5F5] border border-[#E5E5E5] text-[#616161] px-2 py-0.5 rounded">
                Requirement Set {match.requirement_set_version}
              </span>
            )}
          </div>
          <p className="text-xs text-[#666666]">{profile?.institution}</p>
          <div className="text-xs text-[#888888] font-mono pt-0.5">
            Verified Skills: {candidateSkills.join(' · ')}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-base font-bold text-[#000000]">{match.match_score}% match score</div>
          <div className="text-[11px] text-[#888888] font-mono">
            Evaluated against Configured Requirement Set
          </div>
        </div>
      </div>

      {/* Rationale Explanation */}
      <div className="bg-[#F9F9F9] border border-[#E5E5E5] p-4 rounded space-y-2">
        <div className="font-semibold text-[#000000]">Transparent Rationale:</div>
        <p className="text-[#444444] leading-relaxed">{match.explanation}</p>
      </div>

      {/* Per-Requirement Evaluation Grid */}
      {evaluations.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-[#F0F0F0]">
          <h4 className="font-semibold text-[#111111] text-[11px] uppercase tracking-wider">
            Requirement Breakdown ({evaluations.length} Criteria)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {evaluations.map((e, idx) => (
              <div key={idx} className="p-2.5 bg-[#FAFAFA] border border-[#E5E5E5] rounded flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${
                      e.status === 'MATCHED' ? 'text-[#2E7D32]' :
                      e.status === 'PARTIAL' ? 'text-[#F57F17]' : 'text-[#C62828]'
                    }`}>
                      {e.status === 'MATCHED' ? '✓' : e.status === 'PARTIAL' ? '△' : '✗'} {e.requirementName}
                    </span>
                    <span className="text-[10px] text-[#888888] font-mono">({e.weight}%)</span>
                  </div>
                  <p className="text-[11px] text-[#666666]">{e.explanation}</p>
                </div>

                <div className="text-right shrink-0 font-mono">
                  <span className="font-bold text-[#111111]">{e.weightedScore.toFixed(1)} pts</span>
                  <span className="block text-[10px] text-[#888888]">Score: {e.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
