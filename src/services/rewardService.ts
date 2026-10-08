import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { EscrowAccount, RewardAllocation, Credential } from '../types';
import { MOCK_ESCROW, MOCK_REWARD_ALLOCATIONS, MOCK_CREDENTIALS, MOCK_USERS, MOCK_CONTRIBUTIONS } from '../data/mockData';
import { ledgerService } from './ledgerService';

import { charterService } from './charterService';
import { parseRewardSplit, calculateCategoryBreakdown, calculateStudentDistribution } from '../utils/rewardUtils';

export const rewardService = {
  /**
   * Fetch escrow account state for a project milestone.
   */
  async getEscrowAccount(projectId: string, milestoneId: string): Promise<EscrowAccount | null> {
    const isTest = import.meta.env.MODE === 'test';
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('escrow_accounts')
          .select('*')
          .eq('milestone_id', milestoneId)
          .single();
        if (data && !error) {
          return data as EscrowAccount;
        }
      } catch (err) {
        console.warn('Escrow fetch error', err);
      }
    }
    return (isTest || import.meta.env.VITE_USE_MOCK_DATA === 'true') ? (MOCK_ESCROW.find(e => e.milestone_id === milestoneId) || null) : null;
  },

  /**
   * Locks milestone funds into simulated escrow (Sponsor action).
   */
  async fundMilestoneEscrow(projectId: string, milestoneId: string, amount: number, sponsorId: string): Promise<EscrowAccount> {
    const timestamp = new Date().toISOString();
    const escrow: EscrowAccount = {
      id: `es-${Date.now()}`,
      project_id: projectId,
      milestone_id: milestoneId,
      amount: amount,
      currency: 'INR',
      status: 'LOCKED_IN_ESCROW',
      funded_at: timestamp
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('escrow_accounts').insert(escrow);
      } catch (err) {
        console.warn('Escrow insert error', err);
      }
    }

    const existingIdx = MOCK_ESCROW.findIndex(e => e.milestone_id === milestoneId);
    if (existingIdx >= 0) {
      MOCK_ESCROW[existingIdx] = escrow;
    } else {
      MOCK_ESCROW.unshift(escrow);
    }

    // Record in ledger
    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'FUND_ESCROW',
      entityType: 'ESCROW',
      entityId: escrow.id,
      payload: { milestone_id: milestoneId, amount, status: 'LOCKED_IN_ESCROW' }
    });

    return escrow;
  },

  /**
   * Calculates deterministic reward allocations when a milestone is accepted and releases escrow funds.
   * Reads percentages from active Project Charter version.
   * Enforces escrow-first rule: unfunded milestones cannot calculate or release rewards.
   */
  async calculateAndReleaseRewards(
    projectId: string,
    milestoneId: string,
    budget: number,
    sponsorId: string,
    distributionMode: 'WORK_SPLIT' | 'EQUAL_SPLIT' | 'IMPACT_THRESHOLD' = 'WORK_SPLIT',
    customCharter?: any
  ): Promise<{ allocations: RewardAllocation[]; escrow: EscrowAccount }> {
    const timestamp = new Date().toISOString();

    // 1. Enforce Escrow-First Rule
    const existingEscrow = await this.getEscrowAccount(projectId, milestoneId);
    if (!existingEscrow || existingEscrow.status !== 'LOCKED_IN_ESCROW') {
      throw new Error('Unfunded milestone: Escrow funds must be locked prior to reward calculation and release.');
    }

    // 2. Fetch Active Project Charter and Configured Reward Split
    const activeCharter = customCharter || (await charterService.getActiveCharter(projectId));
    const rewardSplit = parseRewardSplit(activeCharter?.reward_terms, activeCharter?.reward_split);
    const charterVersion = activeCharter?.version || 'v1.0';

    // 2b. Enforce Guardian Consent for Under-18 Participants on Paid Projects
    const { guardianConsentService } = await import('./guardianConsentService');
    const contribsForConsent = MOCK_CONTRIBUTIONS.filter(c => c.milestone_id === milestoneId);
    for (const c of contribsForConsent) {
      const hasConsent = await guardianConsentService.hasGuardianConsent(projectId, c.user_id, charterVersion);
      if (!hasConsent) {
        throw new Error(`GUARDIAN_CONSENT_REQUIRED: Participant ${c.user_id} is under 18 and lacks verified guardian consent for paid participation under Charter ${charterVersion}.`);
      }
    }

    // 3. Mark Escrow as RELEASED
    existingEscrow.status = 'RELEASED';
    existingEscrow.released_at = timestamp;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('escrow_accounts').update({ status: 'RELEASED', released_at: timestamp }).eq('milestone_id', milestoneId);
      } catch (err) {
        console.warn('Escrow status update error', err);
      }
    }

    // 4. Calculate Category Allocation Amounts from Charter Percentages
    const categories = calculateCategoryBreakdown(budget, rewardSplit);
    const newAllocations: RewardAllocation[] = [];

    // Expert Advisor Allocation
    const expertUser = MOCK_USERS.find(u => u.role === 'EXPERT') || MOCK_USERS[1];
    newAllocations.push({
      id: `rw-exp-${Date.now()}`,
      project_id: projectId,
      milestone_id: milestoneId,
      user_id: expertUser.id,
      role: 'EXPERT',
      base_share: categories.expertShareAmount,
      contribution_weight: 1.000000,
      final_amount: categories.expertShareAmount,
      reward_type: 'MONETARY',
      explanation: `Expert Share (${rewardSplit.expertSharePercent}%) from ₹${budget.toLocaleString()} budget under Charter ${charterVersion}. Reviewer: ${expertUser.full_name}.`,
      created_at: timestamp,
      recipient_profile: expertUser
    });

    // Student Contributor Allocation using Reviewed Contribution Impact Weights
    const contribs = MOCK_CONTRIBUTIONS.filter(c => c.milestone_id === milestoneId || true);

    let studentInputs: { userId: string; impactScore: number }[] = [];
    if (distributionMode === 'EQUAL_SPLIT') {
      studentInputs = contribs.map(c => ({ userId: c.user_id, impactScore: 1.0 }));
    } else if (distributionMode === 'IMPACT_THRESHOLD') {
      studentInputs = contribs.map(c => ({ userId: c.user_id, impactScore: c.impact_score >= 5.0 ? c.impact_score : 0 }));
    } else {
      // Default: WORK_SPLIT
      studentInputs = contribs.map(c => ({ userId: c.user_id, impactScore: c.impact_score }));
    }

    const studentDist = calculateStudentDistribution(categories.studentPoolAmount, studentInputs);

    studentDist.forEach(dist => {
      const contrib = contribs.find(c => c.user_id === dist.userId);
      const recipient = MOCK_USERS.find(u => u.id === dist.userId) || MOCK_USERS[2];

      newAllocations.push({
        id: `rw-stu-${dist.userId}-${Date.now()}`,
        project_id: projectId,
        milestone_id: milestoneId,
        user_id: dist.userId,
        role: 'STUDENT',
        base_share: categories.studentPoolAmount,
        contribution_weight: dist.normalizedWeight,
        final_amount: dist.payoutAmount,
        reward_type: 'MONETARY',
        explanation: `Student Pool (${rewardSplit.studentPoolPercent}%) share of ₹${categories.studentPoolAmount.toLocaleString()} based on reviewed impact weight ${dist.impactScore}/10 (${dist.percentageShare.toFixed(2)}% relative share) under Charter ${charterVersion}.`,
        created_at: timestamp,
        recipient_profile: recipient
      });
    });

    if (isSupabaseConfigured) {
      try {
        await supabase.from('reward_allocations').insert(newAllocations.map(a => ({
          id: a.id,
          project_id: a.project_id,
          milestone_id: a.milestone_id,
          user_id: a.user_id,
          role: a.role,
          base_share: a.base_share,
          contribution_weight: a.contribution_weight,
          final_amount: a.final_amount,
          reward_type: a.reward_type,
          explanation: a.explanation
        })));
      } catch (err) {
        console.warn('Reward allocations insert error', err);
      }
    }

    // Record release & payout event in append-only ledger
    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'RELEASE_REWARDS',
      entityType: 'ESCROW',
      entityId: existingEscrow.id,
      payload: {
        milestone_id: milestoneId,
        charter_version: charterVersion,
        reward_split: rewardSplit,
        total_released: budget,
        category_breakdown: categories,
        allocations_count: newAllocations.length
      }
    });

    return { allocations: newAllocations, escrow: existingEscrow };
  },

  /**
   * Fetch issued credentials for Knowledge Sharing projects.
   */
  async getCredentials(projectId: string): Promise<Credential[]> {
    const isTest = import.meta.env.MODE === 'test';
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('credentials')
          .select('*')
          .eq('project_id', projectId);
        if (!error && data) {
          return data as Credential[];
        }
      } catch (err) {
        console.warn('Credentials fetch error', err);
      }
    }
    return (isTest || import.meta.env.VITE_USE_MOCK_DATA === 'true') ? MOCK_CREDENTIALS.filter(c => c.project_id === projectId) : [];
  }
};
