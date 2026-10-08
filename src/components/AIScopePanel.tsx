import React, { useState } from 'react';
import { Milestone } from '../types';
import { aiService } from '../services/aiService';
import { projectService } from '../services/projectService';

interface AIScopePanelProps {
  projectId: string;
  projectTitle: string;
  publicSummary: string;
  sponsorId: string;
  userRole?: string;
  milestones: Milestone[];
  onMilestonesUpdated: (updated: Milestone[]) => void;
}

export const AIScopePanel: React.FC<AIScopePanelProps> = ({
  projectId,
  projectTitle,
  publicSummary,
  sponsorId,
  userRole = 'STUDENT',
  milestones,
  onMilestonesUpdated
}) => {
  const [generating, setGenerating] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const isSponsorOrAdmin = userRole === 'SPONSOR' || userRole === 'ADMIN';

  const handleGenerateScope = async () => {
    if (!isSponsorOrAdmin) return;
    setGenerating(true);
    try {
      const generated = await aiService.generateProjectScope(projectId, projectTitle, publicSummary, sponsorId);
      onMilestonesUpdated(generated);
    } catch (err) {
      console.error('Error generating AI scope', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveMilestone = async (milestoneId: string) => {
    if (!isSponsorOrAdmin) return;
    setApprovingId(milestoneId);
    try {
      const updated = await projectService.approveMilestone(milestoneId, sponsorId);
      const newMilestones = milestones.map(m => m.id === milestoneId ? updated : m);
      onMilestonesUpdated(newMilestones);
    } catch (err) {
      console.error('Error approving milestone', err);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-1">
            SCOPE PROPOSAL
          </div>
          <h2 className="text-lg font-medium text-[#000000]">
            Generated Milestone Scope
          </h2>
          <p className="text-xs text-[#666666] mt-0.5">
            Proposed by AI based on project brief. Requires human sponsor approval.
          </p>
        </div>

        {milestones.length === 0 && isSponsorOrAdmin && (
          <button
            onClick={handleGenerateScope}
            disabled={generating}
            className="px-4 py-2 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] text-xs font-medium rounded transition-colors"
          >
            {generating ? 'Generating Proposal...' : 'Generate Scope Proposal'}
          </button>
        )}
      </div>

      {/* Proposed Milestones List */}
      <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
        {milestones.map((m, idx) => {
          const isPending = m.status === 'PENDING_HUMAN_APPROVAL';

          return (
            <div key={m.id} className="py-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[#888888]">0{idx + 1}</span>
                    <h3 className="text-base font-medium text-[#000000]">{m.title}</h3>
                    {isPending ? (
                      <span className="text-[11px] font-medium text-[#666666] border border-[#CCCCCC] px-2 py-0.5 rounded">
                        Pending Approval
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#000000] border border-[#000000] px-2 py-0.5 rounded">
                        Active / Approved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#666666] leading-relaxed pl-7">{m.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-[#888888]">Budget</div>
                  <div className="text-sm font-semibold text-[#000000]">₹{m.budget.toLocaleString()}</div>
                </div>
              </div>

              {/* Required Expertise & Criteria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7 text-xs text-[#666666]">
                <div>
                  <span className="font-medium text-[#000000] block mb-1">Required Expertise:</span>
                  <div className="flex flex-wrap gap-1">
                    {m.required_skills.map((skill, sIdx) => (
                      <span key={sIdx} className="px-2 py-0.5 bg-[#F5F5F5] border border-[#E5E5E5] text-[#111111] rounded text-[11px]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-medium text-[#000000] block mb-1">Acceptance Criteria:</span>
                  <p className="text-[#111111] text-[11px]">{m.acceptance_criteria}</p>
                </div>
              </div>

              {/* Human Approval Action Button */}
              {isPending && (
                <div className="pl-7 pt-2 flex items-center justify-between">
                  <span className="text-xs text-[#666666]">
                    Proposed by AI · {isSponsorOrAdmin ? 'Sponsor approval required.' : 'Awaiting Sponsor approval.'}
                  </span>
                  {isSponsorOrAdmin ? (
                    <button
                      onClick={() => handleApproveMilestone(m.id)}
                      disabled={approvingId === m.id}
                      className="px-4 py-2 bg-[#000000] hover:bg-[#1A1A1A] text-[#FFFFFF] font-medium text-xs rounded transition-colors"
                    >
                      {approvingId === m.id ? 'Approving...' : 'APPROVE PROPOSAL'}
                    </button>
                  ) : (
                    <span className="text-xs text-[#888888] font-medium italic">
                      Sponsor Approval Only
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
