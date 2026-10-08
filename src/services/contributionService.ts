import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Contribution, EvidenceItem } from '../types';
import { MOCK_CONTRIBUTIONS, MOCK_EVIDENCE_ITEMS, MOCK_USERS } from '../data/mockData';
import { computeSHA256 } from '../lib/hash';
import { ledgerService } from './ledgerService';

import { charterService } from './charterService';
import { rewardService } from './rewardService';
import { projectService } from './projectService';

import { projectExitService } from './projectExitService';

export const contributionService = {
  /**
   * Fetch all workspace contributions for a project.
   */
  async getContributions(projectId: string): Promise<Contribution[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('contributions')
          .select('*, profile:user_id(*), evidence:evidence_items(*)')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          return data as Contribution[];
        }
      } catch (err) {
        console.warn('Contributions fetch error', err);
      }
    }

    return MOCK_CONTRIBUTIONS.filter(c => c.project_id === projectId || true).map(c => ({
      ...c,
      evidence: MOCK_EVIDENCE_ITEMS.filter(e => e.contribution_id === c.id)
    }));
  },

  /**
   * Create a new research contribution with SHA-256 artifact hash and optional AI assistance tag.
   * Enforces Principle 1 (Terms Before Work) and Principle 2 (Escrow First).
   */
  async createContribution(
    projectId: string,
    milestoneId: string,
    userId: string,
    type: 'DATASET' | 'CODE' | 'ANALYSIS' | 'REPORT' | 'REVIEW',
    description: string,
    content: string,
    aiAssisted: boolean,
    aiActionId?: string,
    aiDeclaration?: {
      ai_tool?: string;
      ai_purpose?: string;
      ai_description?: string;
      assistance_level?: 'NONE' | 'MINOR' | 'SUBSTANTIAL' | 'PREDOMINANT';
      what_ai_generated?: string;
      what_human_verified?: string;
    }
  ): Promise<Contribution> {
    // AI cannot be a contributor or owner
    if (userId === 'ai-agent' || userId.startsWith('ai-')) {
      throw new Error('AI_CANNOT_BE_CONTRIBUTOR: AI agents cannot own contributions or receive rewards. Human owner must be recorded as contributor.');
    }

    // 0. Access Revocation Enforcement: Block exited members
    const hasExited = await projectExitService.isMemberExited(projectId, userId);
    if (hasExited) {
      throw new Error('PROJECT_MEMBERSHIP_NOT_ACTIVE: Membership status is LEFT. Active workspace access is revoked.');
    }
    // Mandatory AI declaration check
    if (aiAssisted && (!aiDeclaration?.ai_tool || !aiDeclaration?.ai_purpose)) {
      throw new Error('Mandatory AI-use declaration required: Please specify the AI tool and purpose when tagging a contribution as AI-assisted.');
    }

    // 1. Principle 1 Enforcement: Terms Before Work
    const hasAccepted = await charterService.hasAcceptedCharter(projectId, userId);
    if (!hasAccepted) {
      throw new Error('Terms before work: Contributor must accept the active Project Charter before submitting work.');
    }

    // 2. Principle 2 Enforcement: Escrow First
    const proj = await projectService.getProjectById(projectId);
    if (proj && proj.engagement_model === 'FUNDED') {
      const escrow = await rewardService.getEscrowAccount(projectId, milestoneId);
      if (!escrow || (escrow.status !== 'LOCKED_IN_ESCROW' && escrow.status !== 'RELEASED')) {
        throw new Error('Escrow first: Milestone funds must be locked in escrow before work contributions can be submitted.');
      }
    }

    const timestamp = new Date().toISOString();
    // SHA-256 hash of content artifact
    const artifactHash = computeSHA256(content);
    const newContribId = `ct-${Date.now()}`;

    const newContrib: Contribution = {
      id: newContribId,
      project_id: projectId,
      milestone_id: milestoneId,
      user_id: userId,
      type,
      description,
      ai_assisted: aiAssisted,
      ai_tool: aiDeclaration?.ai_tool || (aiAssisted ? 'LLM Assistant' : undefined),
      ai_purpose: aiDeclaration?.ai_purpose || (aiAssisted ? 'Code Drafting & Optimisation' : undefined),
      ai_description: aiDeclaration?.ai_description,
      ai_declared_at: aiAssisted ? timestamp : undefined,
      ai_action_id: aiActionId,
      impact_score: 8.50, // Initial default reviewed score
      review_status: 'PENDING',
      artifact_hash: artifactHash,
      created_at: timestamp,
      profile: MOCK_USERS.find(u => u.id === userId) || MOCK_USERS[2],
      evidence: []
    };

    // Create evidence item pointer
    const newEvidence: EvidenceItem = {
      id: `ev-${Date.now()}`,
      project_id: projectId,
      contribution_id: newContribId,
      title: `${type} Evidence Pointer`,
      description: `Cryptographic SHA-256 verification hash pointer for ${description}`,
      source_type: type === 'CODE' ? 'GIT' : 'FILE',
      source_reference: `git@github.com:proofresearch/workspace.git#commit/${artifactHash.substring(0, 7)}`,
      content_hash: artifactHash,
      created_by: userId,
      created_at: timestamp
    };

    newContrib.evidence = [newEvidence];

    if (isSupabaseConfigured) {
      try {
        await supabase.from('contributions').insert({
          id: newContrib.id,
          project_id: newContrib.project_id,
          milestone_id: newContrib.milestone_id,
          user_id: newContrib.user_id,
          type: newContrib.type,
          description: newContrib.description,
          ai_assisted: newContrib.ai_assisted,
          ai_tool: newContrib.ai_tool,
          ai_purpose: newContrib.ai_purpose,
          ai_description: newContrib.ai_description,
          ai_declared_at: newContrib.ai_declared_at,
          ai_action_id: newContrib.ai_action_id,
          impact_score: newContrib.impact_score,
          review_status: newContrib.review_status,
          artifact_hash: newContrib.artifact_hash,
          assistance_level: aiDeclaration?.assistance_level || (aiAssisted ? 'SUBSTANTIAL' : 'NONE'),
          what_ai_generated: aiDeclaration?.what_ai_generated,
          what_human_verified: aiDeclaration?.what_human_verified,
          human_verified_at: timestamp
        });

        await supabase.from('evidence_items').insert(newEvidence);
      } catch (err) {
        console.warn('Supabase contribution save error', err);
      }
    }

    MOCK_CONTRIBUTIONS.unshift(newContrib);
    MOCK_EVIDENCE_ITEMS.unshift(newEvidence);

    // Record in ledger
    if (aiAssisted) {
      await ledgerService.appendEntry({
        projectId,
        actorId: userId,
        action: 'AI_ASSISTANCE_DECLARED',
        entityType: 'CONTRIBUTION',
        entityId: newContribId,
        payload: {
          human_owner_id: userId,
          ai_tool: newContrib.ai_tool,
          ai_purpose: newContrib.ai_purpose,
          assistance_level: aiDeclaration?.assistance_level || 'SUBSTANTIAL',
          what_ai_generated: aiDeclaration?.what_ai_generated,
          what_human_verified: aiDeclaration?.what_human_verified,
          artifact_hash: artifactHash,
          timestamp
        }
      });
    }

    await ledgerService.appendEntry({
      projectId,
      actorId: userId,
      action: 'ADD_CONTRIBUTION',
      entityType: 'CONTRIBUTION',
      entityId: newContribId,
      payload: { 
        type, 
        ai_assisted: aiAssisted, 
        ai_tool: newContrib.ai_tool,
        ai_purpose: newContrib.ai_purpose,
        artifact_hash: artifactHash 
      }
    });

    return newContrib;
  },

  /**
   * Reviews a contribution and assigns a reviewed impact score (0 - 10).
   * Contribution gaming protection: reward distribution is driven strictly by this reviewed impact score, NOT raw commit counts.
   */
  async reviewContribution(
    projectId: string,
    contributionId: string,
    reviewerId: string,
    reviewedImpact: number,
    rationale: string = 'Expert quality and impact evaluation'
  ): Promise<Contribution> {
    const score = Math.max(0, Math.min(10, reviewedImpact));
    const timestamp = new Date().toISOString();

    const contrib = MOCK_CONTRIBUTIONS.find(c => c.id === contributionId);
    if (contrib) {
      contrib.impact_score = score;
      contrib.review_status = 'APPROVED';
      contrib.reviewer_id = reviewerId;
    }

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('contributions')
          .update({
            impact_score: score,
            review_status: 'APPROVED',
            reviewed_by: reviewerId,
            reviewer_rationale: rationale
          })
          .eq('id', contributionId);
      } catch (err) {
        console.warn('Supabase contribution review update warning', err);
      }
    }

    await ledgerService.appendEntry({
      projectId,
      actorId: reviewerId,
      action: 'CONTRIBUTION_REVIEWED',
      entityType: 'CONTRIBUTION',
      entityId: contributionId,
      payload: {
        contributor_id: contrib?.user_id || reviewerId,
        contribution_id: contributionId,
        reviewed_impact: score,
        reviewer_id: reviewerId,
        rationale,
        timestamp
      }
    });

    return contrib || ({} as Contribution);
  }
};

