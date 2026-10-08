import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Charter, CharterAcceptance, RewardSplit, EngagementModel } from '../types';
import { MOCK_CHARTERS } from '../data/mockData';
import { computeSHA256 } from '../lib/hash';
import { ledgerService } from './ledgerService';
import { parseRewardSplit, validateRewardSplit, calculateStudentDistribution } from '../utils/rewardUtils';

// In-memory acceptance tracking for demo fallback
const localAcceptances: CharterAcceptance[] = [];

export const charterService = {
  /**
   * Fetch active charter for a project.
   */
  async getActiveCharter(projectId: string): Promise<Charter | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('charters')
          .select('*')
          .eq('project_id', projectId)
          .eq('status', 'ACTIVE')
          .maybeSingle();
        if (data && !error) {
          const char = data as Charter;
          char.reward_split = parseRewardSplit(char.reward_terms, char.reward_split);
          return char;
        }
      } catch (err) {
        console.warn('Charter fetch error', err);
      }
    }
    const base = MOCK_CHARTERS.find(c => c.project_id === projectId && c.status === 'ACTIVE') || MOCK_CHARTERS[0];
    const activeCharter: Charter = {
      ...base,
      project_id: projectId
    };
    activeCharter.reward_split = parseRewardSplit(activeCharter.reward_terms, activeCharter.reward_split);
    return activeCharter;
  },

  /**
   * Check if a user has explicitly accepted the active charter for a project.
   */
  async hasAcceptedCharter(projectId: string, userId: string, charterId?: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('charter_acceptances')
          .select('id')
          .eq('project_id', projectId)
          .eq('user_id', userId);
        if (charterId) {
          query = query.eq('charter_id', charterId);
        }
        const { data } = await query;
        if (data && data.length > 0) return true;
      } catch (err) {
        console.warn('Charter acceptance check error', err);
      }
    }
    return localAcceptances.some(a => a.project_id === projectId && a.user_id === userId && (!charterId || a.charter_id === charterId));
  },

  /**
   * Accepts a project charter, creates acceptance signature hash, unlocks confidential brief,
   * and appends entry to the ledger.
   */
  async acceptCharter(
    charterId: string,
    projectId: string,
    userId: string,
    engagementModel?: EngagementModel,
    modelAcknowledged: boolean = true
  ): Promise<CharterAcceptance> {
    const timestamp = new Date().toISOString();
    // SHA-256 acceptance signature: hash of charter_id + user_id + timestamp
    const acceptanceHash = computeSHA256(`CHARTER_ACCEPT_${charterId}_${userId}_${timestamp}`);

    const charter = MOCK_CHARTERS.find(c => c.id === charterId);
    const version = charter?.version || 'v1.0';
    const model = engagementModel || charter?.engagement_model || 'FUNDED';

    const acceptance: CharterAcceptance = {
      id: `ca-${Date.now()}`,
      charter_id: charterId,
      project_id: projectId,
      user_id: userId,
      charter_version: version,
      engagement_model: model,
      model_acknowledged: modelAcknowledged,
      accepted_at: timestamp,
      acceptance_hash: acceptanceHash
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('charter_acceptances').insert(acceptance);
        // Ensure user is marked ACTIVE in project_members
        await supabase.from('project_members').upsert({
          project_id: projectId,
          user_id: userId,
          role: 'STUDENT',
          status: 'ACTIVE'
        });
      } catch (err) {
        console.warn('Supabase charter acceptance insert error', err);
      }
    }

    localAcceptances.push(acceptance);

    // Record acceptance hash in append-only ledger
    await ledgerService.appendEntry({
      projectId: projectId,
      actorId: userId,
      action: 'ACCEPT_CHARTER',
      entityType: 'CHARTER',
      entityId: charterId,
      payload: {
        charter_id: charterId,
        version: version,
        engagement_model: model,
        model_acknowledged: modelAcknowledged,
        acceptance_hash: acceptanceHash,
        status: 'ACCEPTED'
      }
    });

    return acceptance;
  },

  /**
   * Publishes or updates a project charter.
   * If an active charter already has acceptances, creates a new version (e.g. v2.0)
   * and supersedes the old version, preserving historical immutable terms.
   */
  async publishCharterVersion(
    projectId: string,
    sponsorId: string,
    newSplit: RewardSplit,
    charterDetails?: Partial<Charter>
  ): Promise<Charter> {
    const validation = validateRewardSplit(newSplit);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid reward split configuration.');
    }

    const currentCharter = await this.getActiveCharter(projectId);
    let newVersion = 'v1.0';

    if (currentCharter) {
      const hasAcceptances = localAcceptances.some(a => a.project_id === projectId || a.charter_id === currentCharter.id);
      if (hasAcceptances) {
        const match = currentCharter.version.match(/^v?(\d+)/i);
        const currentMajor = match ? parseInt(match[1], 10) : 1;
        newVersion = `v${currentMajor + 1}.0`;
        currentCharter.status = 'SUPERSEDED';

        if (isSupabaseConfigured) {
          await supabase.from('charters').update({ status: 'SUPERSEDED' }).eq('id', currentCharter.id);
        }
      } else {
        newVersion = currentCharter.version;
      }
    }

    const timestamp = new Date().toISOString();
    const charterRecord: Charter = {
      id: `ch-${Date.now()}`,
      project_id: projectId,
      version: newVersion,
      status: 'ACTIVE',
      engagement_model: charterDetails?.engagement_model || currentCharter?.engagement_model || 'FUNDED',
      reward_terms: {
        expert_share: newSplit.expertSharePercent / 100,
        student_pool: newSplit.studentPoolPercent / 100,
        ai_reserve: newSplit.aiComputeReservePercent / 100,
        platform: newSplit.platformFeePercent / 100,
        reserve: newSplit.reservePercent / 100,
        platformFeePercent: newSplit.platformFeePercent,
        aiComputeReservePercent: newSplit.aiComputeReservePercent,
        expertSharePercent: newSplit.expertSharePercent,
        studentPoolPercent: newSplit.studentPoolPercent,
        reservePercent: newSplit.reservePercent,
      },
      reward_split: newSplit,
      scope: charterDetails?.scope || currentCharter?.scope || 'Build edge DR detection model pipeline and quantize binary.',
      deliverables: charterDetails?.deliverables || currentCharter?.deliverables || [
        'Pre-processed Fundus Dataset Split (CLAHE applied)',
        'Quantized TFLite Model Binary (<12MB footprint)',
        'Benchmark Test Accuracy Metrics & Memory Profiling Report'
      ],
      acceptance_criteria: charterDetails?.acceptance_criteria || currentCharter?.acceptance_criteria || 'Model accuracy > 88%.',
      ip_terms: charterDetails?.ip_terms || currentCharter?.ip_terms || 'Sponsor retains commercial IP rights; Student retains attribution & academic presentation rights.',
      publication_terms: charterDetails?.publication_terms || currentCharter?.publication_terms || 'arXiv co-authorship granted to primary student contributor upon peer-reviewed milestone acceptance.',
      confidentiality_terms: charterDetails?.confidentiality_terms || currentCharter?.confidentiality_terms || 'Raw clinical images must remain within the secure project workspace environment.',
      credit_terms: charterDetails?.credit_terms || currentCharter?.credit_terms || 'Credit & reward pool distributed proportionally based on reviewed expert impact scores (1-10).',
      exit_terms: charterDetails?.exit_terms || currentCharter?.exit_terms || 'Pro-rata reward retained for accepted past milestones if student withdraws.',
      dispute_terms: charterDetails?.dispute_terms || currentCharter?.dispute_terms || 'Binding expert arbitration conducted by assigned domain expert.',
      commercialisation_terms: charterDetails?.commercialisation_terms || currentCharter?.commercialisation_terms || 'Future commercial revenue grants 5% royalty pool to student contributors.',
      created_at: timestamp
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('charters').insert(charterRecord);
      } catch (err) {
        console.warn('Charter insert error', err);
      }
    }

    const existingIdx = MOCK_CHARTERS.findIndex(c => c.id === charterRecord.id);
    if (existingIdx >= 0) {
      MOCK_CHARTERS[existingIdx] = charterRecord;
    } else {
      MOCK_CHARTERS.unshift(charterRecord);
    }

    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'REWARD_CONFIG_PUBLISHED',
      entityType: 'CHARTER',
      entityId: charterRecord.id,
      payload: {
        version: newVersion,
        reward_split: newSplit,
        status: 'ACTIVE'
      }
    });

    return charterRecord;
  },

  /**
   * Contributor declines a new charter version.
   * Updates member status to 'LEFT' while preserving all historical accepted contributions,
   * attribution, earned credits, and cryptographic ledger history intact.
   */
  async declineCharterVersion(
    projectId: string,
    userId: string,
    charterVersion: string
  ): Promise<{ memberStatus: string; priorContributionsPreserved: boolean; ledgerIntact: boolean }> {
    const timestamp = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('project_members')
          .update({ status: 'LEFT' })
          .eq('project_id', projectId)
          .eq('user_id', userId);
      } catch (err) {
        console.warn('Supabase member decline update error', err);
      }
    }

    await ledgerService.appendEntry({
      projectId,
      actorId: userId,
      action: 'DECLINE_CHARTER_VERSION',
      entityType: 'CHARTER',
      entityId: projectId,
      payload: {
        declined_version: charterVersion,
        user_id: userId,
        status: 'LEFT',
        preserves_prior_credit: true,
        preserves_contributions: true,
        timestamp
      }
    });

    return {
      memberStatus: 'LEFT' as const,
      priorContributionsPreserved: true,
      ledgerIntact: true
    };
  },

  /**
   * Corner Case 3: Acknowledges engagement model separately at joining for non-monetary projects ($0 payment).
   */
  async acknowledgeEngagementModel(
    projectId: string,
    userId: string,
    charterId: string,
    engagementModel: EngagementModel
  ): Promise<{ acknowledged: boolean; monetaryPayment: number; timestamp: string }> {
    const timestamp = new Date().toISOString();
    const monetaryPayment = (engagementModel === 'KNOWLEDGE_SHARING' || engagementModel === 'INSTITUTIONAL_CREDIT') ? 0 : 25000;

    await ledgerService.appendEntry({
      projectId,
      actorId: userId,
      action: 'ENGAGEMENT_MODEL_ACKNOWLEDGED',
      entityType: 'CHARTER',
      entityId: charterId,
      payload: {
        user_id: userId,
        project_id: projectId,
        charter_id: charterId,
        engagement_model: engagementModel,
        monetary_payment: monetaryPayment,
        acknowledged_at: timestamp
      }
    });

    return { acknowledged: true, monetaryPayment, timestamp };
  },

  /**
   * Corner Case 4: Paid becomes unpaid midway.
   * Creates new charter version v2.0 (preserving v1.0 immutable), flags re-acceptance required for members.
   */
  async changeProjectEngagementModel(
    projectId: string,
    sponsorId: string,
    newEngagementModel: EngagementModel,
    newSplit: RewardSplit,
    changeReason: string = 'Sponsor transition of engagement terms'
  ): Promise<Charter> {
    const currentCharter = await this.getActiveCharter(projectId);
    const oldVersion = currentCharter?.version || 'v1.0';

    const newCharter = await this.publishCharterVersion(projectId, sponsorId, newSplit, {
      engagement_model: newEngagementModel,
      credit_terms: newEngagementModel === 'KNOWLEDGE_SHARING' 
        ? 'Unpaid knowledge sharing project: $0 monetary payment; Certificate & credit preserved.' 
        : currentCharter?.credit_terms
    });

    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'CHARTER_TERMS_CHANGED',
      entityType: 'CHARTER',
      entityId: newCharter.id,
      payload: {
        old_version: oldVersion,
        new_version: newCharter.version,
        old_model: currentCharter?.engagement_model,
        new_model: newEngagementModel,
        change_reason: changeReason
      }
    });

    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'REACCEPTANCE_REQUIRED',
      entityType: 'CHARTER',
      entityId: newCharter.id,
      payload: {
        charter_version: newCharter.version,
        new_engagement_model: newEngagementModel,
        reacceptance_deadline: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
      }
    });

    return newCharter;
  },

  /**
   * Corner Case 5: Unpaid work commercialised.
   * Applies accepted charter's commercialisation clause to eligible contributors based on reviewed impact.
   */
  async declareCommercialisation(
    projectId: string,
    sponsorId: string,
    commercialisationEvent: string,
    royaltyAmount: number = 50000
  ): Promise<{
    event: any;
    appliedTerms: string;
    eligibleContributors: string[];
    distribution: any[];
  }> {
    const charter = await this.getActiveCharter(projectId);
    const appliedTerms = charter?.commercialisation_terms || 'Future commercial revenue grants 5% royalty pool to student contributors.';
    const timestamp = new Date().toISOString();

    const { contributionService } = await import('./contributionService');
    const contribs = await contributionService.getContributions(projectId);
    const eligibleContributorIds = Array.from(new Set(contribs.map(c => c.user_id)));

    const impactList = eligibleContributorIds.map(uid => {
      const userContribs = contribs.filter(c => c.user_id === uid);
      const avgImpact = userContribs.reduce((acc, c) => acc + (c.impact_score || 8.5), 0) / (userContribs.length || 1);
      return { userId: uid, impactScore: avgImpact };
    });

    const distribution = calculateStudentDistribution(royaltyAmount * 0.05, impactList);

    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'COMMERCIALISATION_DECLARED',
      entityType: 'CHARTER',
      entityId: charter?.id || projectId,
      payload: {
        charter_version: charter?.version || 'v1.0',
        event_description: commercialisationEvent,
        applied_terms: appliedTerms,
        eligible_contributors: eligibleContributorIds,
        royalty_pool_amount: royaltyAmount * 0.05,
        distribution_summary: distribution,
        timestamp
      }
    });

    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'COMMERCIALISATION_CLAUSE_APPLIED',
      entityType: 'CHARTER',
      entityId: charter?.id || projectId,
      payload: {
        charter_version: charter?.version || 'v1.0',
        applied_clause: appliedTerms,
        timestamp
      }
    });

    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'COMMERCIALISATION_DISTRIBUTION',
      entityType: 'REWARD',
      entityId: `comm-dist-${Date.now()}`,
      payload: {
        distribution,
        timestamp
      }
    });

    return {
      event: { projectId, commercialisationEvent, timestamp },
      appliedTerms,
      eligibleContributors: eligibleContributorIds,
      distribution
    };
  }
};


