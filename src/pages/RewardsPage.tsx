import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Project, Milestone, EscrowAccount, RewardAllocation, Credential, UserProfile } from '../types';
import { projectService } from '../services/projectService';
import { rewardService } from '../services/rewardService';
import { authService } from '../services/authService';
import { RewardBreakdown } from '../components/RewardBreakdown';

import { Charter } from '../types';
import { charterService } from '../services/charterService';

export const RewardsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = id || 'p1111111-1111-1111-1111-111111111111';

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [escrow, setEscrow] = useState<EscrowAccount | null>(null);
  const [allocations, setAllocations] = useState<RewardAllocation[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [charter, setCharter] = useState<Charter | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    authService.getCurrentProfile().then(u => {
      setUser(u);
      loadRewardData(projectId);
    });
  }, [projectId]);

  const loadRewardData = async (pId: string) => {
    const proj = await projectService.getProjectById(pId);
    setProject(proj);

    const activeChar = await charterService.getActiveCharter(pId);
    setCharter(activeChar);

    const ms = await projectService.getMilestones(pId);
    setMilestones(ms);

    const targetMilestoneId = ms[0]?.id || `m-${pId.substring(0, 8)}`;
    const esc = await rewardService.getEscrowAccount(pId, targetMilestoneId);
    setEscrow(esc);

    const creds = await rewardService.getCredentials(pId);
    setCredentials(creds);
  };

  const handleRewardsCalculated = (newAllocations: RewardAllocation[], updatedEscrow: EscrowAccount) => {
    setAllocations(newAllocations);
    setEscrow(updatedEscrow);
  };

  if (!project || !user) return null;

  const isKnowledgeSharing = project.engagement_model === 'KNOWLEDGE_SHARING';
  const activeMilestone = milestones[0];
  const targetMilestoneId = activeMilestone?.id || `m-${projectId.substring(0, 8)}`;
  const milestoneTitle = activeMilestone?.title || 'Milestone 01: Core Research Deliverable';
  const milestoneBudget = activeMilestone?.budget || project.budget || 25000;
  const isAccepted = activeMilestone ? (activeMilestone.status === 'ACCEPTED' || activeMilestone.human_approved) : true;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#E5E5E5]">
        <div className="text-xs font-semibold text-[#888888] uppercase tracking-widest mb-1">
          ESCROW & CREDENTIALS
        </div>
        <h1 className="text-3xl font-medium text-[#000000]">
          {isKnowledgeSharing ? 'Non-Monetary Credential Recognition' : 'Escrow & Reward Distribution'}
        </h1>
        <p className="text-sm text-[#666666] mt-1">
          {isKnowledgeSharing
            ? 'Knowledge sharing initiatives recognize contribution through academic co-authorship, digital certificates, and badges.'
            : 'Escrow status transitions and precision payout allocations governed by Research Charter terms.'}
        </p>
      </div>

      {/* Escrow Breakdown */}
      {!isKnowledgeSharing && (
        <RewardBreakdown
          projectId={projectId}
          milestoneId={targetMilestoneId}
          milestoneTitle={milestoneTitle}
          budget={milestoneBudget}
          escrow={escrow}
          allocations={allocations}
          sponsorId={user.id}
          userRole={user.role}
          isMilestoneAccepted={isAccepted}
          charter={charter}
          milestoneObj={activeMilestone}
          onRewardsCalculated={handleRewardsCalculated}
        />
      )}

      {/* Credentials Section */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold text-[#888888] uppercase tracking-widest">
          VERIFIABLE CREDENTIALS ({credentials.length})
        </h2>

        <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
          {credentials.map((c) => (
            <div key={c.id} className="py-5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#000000] border border-[#000000] px-2 py-0.5 rounded">
                  {c.credential_type}
                </span>
                <span className="text-[11px] text-[#888888]">ProofResearch Verified</span>
              </div>
              <h3 className="text-base font-medium text-[#000000]">{c.title}</h3>
              <p className="text-[#666666]">{c.description}</p>
              <div className="text-[11px] text-[#000000] font-medium pt-1">
                ✓ Cryptographically Signed Record
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
