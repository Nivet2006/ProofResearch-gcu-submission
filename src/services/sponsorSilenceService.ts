import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MediationCase, SponsorSilenceProcessResult, AcceptanceTimeoutPolicy, UserProfile } from '../types';
import { MOCK_MILESTONES, MOCK_PROJECTS, MOCK_USERS } from '../data/mockData';
import { ledgerService } from './ledgerService';
import { charterService } from './charterService';
import { rewardService } from './rewardService';
import { projectService } from './projectService';
import { authService } from './authService';

// In-memory store for mediation cases & milestone windows in mock/demo mode
const mockMediationCasesStore: Record<string, MediationCase> = {};
const mockMilestoneWindowsStore: Record<string, { startedAt: string; deadline: string; policy: AcceptanceTimeoutPolicy; timeoutProcessed: boolean }> = {};

export const sponsorSilenceService = {
  /**
   * Starts acceptance window for a submitted milestone.
   */
  async startAcceptanceWindow(
    projectId: string,
    milestoneId: string,
    timeoutHours: number = 48,
    policyOverride?: AcceptanceTimeoutPolicy
  ): Promise<{ startedAt: string; deadline: string; policy: AcceptanceTimeoutPolicy }> {
    const startedAt = new Date().toISOString();
    const deadlineDate = new Date(Date.now() + timeoutHours * 3600 * 1000);
    const deadline = deadlineDate.toISOString();

    const activeCharter = await charterService.getActiveCharter(projectId);
    const policy: AcceptanceTimeoutPolicy = policyOverride || (activeCharter as any)?.acceptance_timeout_policy || 'MEDIATOR';

    mockMilestoneWindowsStore[milestoneId] = {
      startedAt,
      deadline,
      policy,
      timeoutProcessed: false
    };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('milestones')
          .update({
            acceptance_started_at: startedAt,
            acceptance_deadline: deadline,
            acceptance_timeout_policy: policy
          })
          .eq('id', milestoneId);
      } catch (err) {
        console.warn('Supabase start acceptance window error', err);
      }
    }

    await ledgerService.appendEntry({
      projectId,
      actorId: 'SYSTEM',
      action: 'ACCEPTANCE_WINDOW_STARTED',
      entityType: 'MILESTONE',
      entityId: milestoneId,
      payload: {
        milestone_id: milestoneId,
        started_at: startedAt,
        deadline,
        timeout_hours: timeoutHours,
        policy
      }
    });

    return { startedAt, deadline, policy };
  },

  /**
   * Fetch mediation case for a milestone if one exists.
   */
  async getMediationCase(milestoneId: string): Promise<MediationCase | null> {
    if (mockMediationCasesStore[milestoneId]) {
      return mockMediationCasesStore[milestoneId];
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('mediation_cases')
          .select('*')
          .eq('milestone_id', milestoneId)
          .single();
        if (data && !error) {
          const mCase = data as MediationCase;
          mockMediationCasesStore[milestoneId] = mCase;
          return mCase;
        }
      } catch (err) {
        console.warn('Mediation case fetch error', err);
      }
    }
    return null;
  },

  /**
   * Fetch all pending mediation cases (for Expert Advisor / Admin panel).
   */
  async getPendingMediationCases(projectId?: string): Promise<MediationCase[]> {
    const cases = Object.values(mockMediationCasesStore).filter(
      c => (!projectId || c.project_id === projectId) && c.status === 'PENDING'
    );
    if (cases.length > 0) return cases;

    if (isSupabaseConfigured) {
      try {
        let query = supabase.from('mediation_cases').select('*').eq('status', 'PENDING');
        if (projectId) query = query.eq('project_id', projectId);
        const { data, error } = await query;
        if (data && !error) return data as MediationCase[];
      } catch (err) {
        console.warn('Pending mediation cases fetch error', err);
      }
    }

    const isTest = import.meta.env.MODE === 'test';
    if (isTest || import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      const demoCase: MediationCase = {
        id: 'med-demo-001',
        project_id: projectId || 'p1111111-1111-1111-1111-111111111111',
        milestone_id: 'm1111111-1111-1111-1111-111111111111',
        sponsor_id: 'u1111111-1111-1111-1111-111111111111',
        policy: 'MEDIATOR',
        reason: 'SPONSOR_UNRESPONSIVE',
        status: 'PENDING',
        escrow_amount: 25000,
        created_at: new Date().toISOString(),
        deliverables: ['Pre-processing Python pipeline', 'CLAHE dataset transformation report', 'MobileNetV3 int8 quantization benchmark'],
        acceptance_criteria: 'Dataset cleaned, missing values handled, pre-processing pipeline documented and tested.',
        project_title: 'Diabetic Retinopathy Edge AI',
        milestone_title: 'Milestone 1: Fundus Image Preprocessing'
      };
      return [demoCase];
    }
    return [];
  },

  /**
   * Processes sponsor silence / acceptance window timeout.
   * Idempotent: safe to invoke repeatedly.
   */
  async checkAndProcessTimeout(
    projectId: string,
    milestoneId: string,
    forceTimeoutDemo: boolean = false
  ): Promise<SponsorSilenceProcessResult> {
    const windowState = mockMilestoneWindowsStore[milestoneId] || {
      startedAt: new Date(Date.now() - 49 * 3600 * 1000).toISOString(),
      deadline: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      policy: 'MEDIATOR' as AcceptanceTimeoutPolicy,
      timeoutProcessed: false
    };

    // 1. Idempotency Guard
    const existingCase = await this.getMediationCase(milestoneId);
    if (existingCase || windowState.timeoutProcessed) {
      const esc = await rewardService.getEscrowAccount(projectId, milestoneId);
      return {
        milestoneId,
        previousStatus: 'ACCEPTANCE_PENDING',
        newStatus: existingCase ? (existingCase.status === 'PENDING' ? 'MEDIATION_REQUIRED' : existingCase.status) : 'ACCEPTED',
        policy: windowState.policy,
        escrowStatus: esc?.status === 'RELEASED' ? 'RELEASED' : 'LOCKED_IN_ESCROW',
        mediationCase: existingCase || undefined,
        rewardAllocated: esc?.status === 'RELEASED',
        ledgerAction: existingCase ? 'MEDIATION_REQUESTED' : 'MILESTONE_AUTO_ACCEPTED'
      };
    }

    const activeCharter = await charterService.getActiveCharter(projectId);
    const policy: AcceptanceTimeoutPolicy = windowState.policy || (activeCharter as any)?.acceptance_timeout_policy || 'MEDIATOR';
    const project = await projectService.getProjectById(projectId);
    const sponsorId = project?.created_by || 'u1111111-1111-1111-1111-111111111111';
    const milestone = MOCK_MILESTONES.find(m => m.id === milestoneId) || MOCK_MILESTONES[0];

    windowState.timeoutProcessed = true;
    mockMilestoneWindowsStore[milestoneId] = windowState;

    // Log expiration in ledger
    await ledgerService.appendEntry({
      projectId,
      actorId: 'SYSTEM',
      action: 'ACCEPTANCE_WINDOW_EXPIRED',
      entityType: 'MILESTONE',
      entityId: milestoneId,
      payload: {
        milestone_id: milestoneId,
        policy,
        reason: 'SPONSOR_UNRESPONSIVE',
        expired_at: new Date().toISOString()
      }
    });

    if (policy === 'AUTO_ACCEPT') {
      // 2A. Policy = AUTO_ACCEPT -> Pre-agreed acceptance, release escrow & rewards
      const { allocations, escrow } = await rewardService.calculateAndReleaseRewards(
        projectId,
        milestoneId,
        milestone.budget || 25000,
        sponsorId
      );

      await ledgerService.appendEntry({
        projectId,
        actorId: 'SYSTEM',
        action: 'MILESTONE_AUTO_ACCEPTED',
        entityType: 'MILESTONE',
        entityId: milestoneId,
        payload: {
          milestone_id: milestoneId,
          policy: 'AUTO_ACCEPT',
          status: 'ACCEPTED',
          escrow_status: 'RELEASED',
          reward_allocations_count: allocations.length,
          actor: 'SYSTEM_AUTOMATION'
        }
      });

      return {
        milestoneId,
        previousStatus: 'ACCEPTANCE_PENDING',
        newStatus: 'ACCEPTED',
        policy: 'AUTO_ACCEPT',
        escrowStatus: 'RELEASED',
        rewardAllocated: true,
        ledgerAction: 'MILESTONE_AUTO_ACCEPTED'
      };
    } else {
      // 2B. Policy = MEDIATOR -> Move to MEDIATION_REQUIRED, Escrow remains LOCKED_IN_ESCROW
      const timestamp = new Date().toISOString();
      const medCase: MediationCase = {
        id: `med-${Date.now()}`,
        project_id: projectId,
        milestone_id: milestoneId,
        sponsor_id: sponsorId,
        policy: 'MEDIATOR',
        reason: 'SPONSOR_UNRESPONSIVE',
        status: 'PENDING',
        escrow_amount: milestone.budget || 25000,
        created_at: timestamp,
        deliverables: milestone.deliverables || ['Pre-processing Python pipeline', 'Dataset transformation report'],
        acceptance_criteria: milestone.acceptance_criteria || 'Dataset cleaned and pre-processing pipeline documented.',
        project_title: project?.title || 'Unknown Project',
        milestone_title: milestone.title || 'Milestone 1: Preprocessing'
      };

      if (isSupabaseConfigured) {
        try {
          await supabase.from('mediation_cases').insert(medCase);
          await supabase.from('milestones').update({ status: 'MEDIATION_REQUIRED' }).eq('id', milestoneId);
        } catch (err) {
          console.warn('Supabase mediation case insert warning', err);
        }
      }

      mockMediationCasesStore[milestoneId] = medCase;

      const ledgerEntry = await ledgerService.appendEntry({
        projectId,
        actorId: 'SYSTEM',
        action: 'MEDIATION_REQUESTED',
        entityType: 'MEDIATION_CASE',
        entityId: medCase.id,
        payload: {
          milestone_id: milestoneId,
          case_id: medCase.id,
          policy: 'MEDIATOR',
          escrow_status: 'LOCKED_IN_ESCROW',
          status: 'PENDING'
        }
      });

      medCase.ledger_entry_id = ledgerEntry.id;
      mockMediationCasesStore[milestoneId] = medCase;

      return {
        milestoneId,
        previousStatus: 'ACCEPTANCE_PENDING',
        newStatus: 'MEDIATION_REQUIRED',
        policy: 'MEDIATOR',
        escrowStatus: 'LOCKED_IN_ESCROW',
        mediationCase: medCase,
        rewardAllocated: false,
        ledgerAction: 'MEDIATION_REQUESTED'
      };
    }
  },

  /**
   * Resolves mediation case by Mediator (Role: EXPERT or ADMIN).
   * Idempotent & authorization-enforced.
   */
  async processMediatorDecision(
    projectId: string,
    milestoneId: string,
    mediatorId: string,
    decision: 'ACCEPT' | 'REJECT',
    notes: string = 'Reviewed milestone deliverables and verified contribution ledger.'
  ): Promise<SponsorSilenceProcessResult> {
    // 1. Authorization Gate: Only Expert Advisor or Admin can resolve mediation!
    const mediatorUser = MOCK_USERS.find(u => u.id === mediatorId) || await authService.getCurrentProfile();
    const isAuthorized = mediatorUser && (mediatorUser.role === 'EXPERT' || mediatorUser.role === 'ADMIN');

    if (!isAuthorized) {
      throw new Error('UNAUTHORIZED_MEDIATOR: Only assigned Expert Advisors or Platform Admins can resolve mediation cases. Student contributors cannot approve mediation.');
    }

    const timestamp = new Date().toISOString();

    // 2. Fetch Pending Case
    let medCase = await this.getMediationCase(milestoneId);
    if (!medCase) {
      // Auto-create pending case if running in demo mode
      const res = await this.checkAndProcessTimeout(projectId, milestoneId, true);
      medCase = res.mediationCase || null;
    }

    // 3. Idempotency Check: if already resolved, return existing result
    if (medCase && medCase.status !== 'PENDING') {
      const esc = await rewardService.getEscrowAccount(projectId, milestoneId);
      return {
        milestoneId,
        previousStatus: 'MEDIATION_REQUIRED',
        newStatus: medCase.status === 'RESOLVED_ACCEPTED' ? 'ACCEPTED' : 'REJECTED',
        policy: 'MEDIATOR',
        escrowStatus: esc?.status === 'RELEASED' ? 'RELEASED' : 'LOCKED_IN_ESCROW',
        mediationCase: medCase,
        rewardAllocated: esc?.status === 'RELEASED',
        ledgerAction: medCase.status === 'RESOLVED_ACCEPTED' ? 'MEDIATOR_ACCEPTED' : 'MEDIATOR_REJECTED'
      };
    }

    const project = await projectService.getProjectById(projectId);
    const sponsorId = project?.created_by || 'u1111111-1111-1111-1111-111111111111';
    const milestone = MOCK_MILESTONES.find(m => m.id === milestoneId) || MOCK_MILESTONES[0];

    if (decision === 'ACCEPT') {
      // 4A. Mediator ACCEPT -> Release Escrow & Invoke Reward Engine
      const { allocations, escrow } = await rewardService.calculateAndReleaseRewards(
        projectId,
        milestoneId,
        milestone.budget || 25000,
        sponsorId
      );

      if (medCase) {
        medCase.status = 'RESOLVED_ACCEPTED';
        medCase.mediator_id = mediatorId;
        medCase.mediator_decision = 'ACCEPT';
        medCase.mediator_notes = notes;
        medCase.resolved_at = timestamp;
      }

      if (isSupabaseConfigured && medCase) {
        try {
          await supabase
            .from('mediation_cases')
            .update({
              status: 'RESOLVED_ACCEPTED',
              mediator_id: mediatorId,
              mediator_decision: 'ACCEPT',
              mediator_notes: notes,
              resolved_at: timestamp
            })
            .eq('id', medCase.id);
        } catch (err) {
          console.warn('Supabase mediation resolution warning', err);
        }
      }

      await ledgerService.appendEntry({
        projectId,
        actorId: mediatorId,
        action: 'MEDIATOR_ACCEPTED',
        entityType: 'MEDIATION_CASE',
        entityId: medCase?.id || milestoneId,
        payload: {
          milestone_id: milestoneId,
          mediator_id: mediatorId,
          decision: 'ACCEPT',
          notes,
          escrow_released: true,
          reward_allocations_count: allocations.length,
          timestamp
        }
      });

      return {
        milestoneId,
        previousStatus: 'MEDIATION_REQUIRED',
        newStatus: 'ACCEPTED',
        policy: 'MEDIATOR',
        escrowStatus: 'RELEASED',
        mediationCase: medCase || undefined,
        rewardAllocated: true,
        ledgerAction: 'MEDIATOR_ACCEPTED'
      };
    } else {
      // 4B. Mediator REJECT -> Keep Escrow LOCKED_IN_ESCROW
      if (medCase) {
        medCase.status = 'RESOLVED_REJECTED';
        medCase.mediator_id = mediatorId;
        medCase.mediator_decision = 'REJECT';
        medCase.mediator_notes = notes;
        medCase.resolved_at = timestamp;
      }

      await ledgerService.appendEntry({
        projectId,
        actorId: mediatorId,
        action: 'MEDIATOR_REJECTED',
        entityType: 'MEDIATION_CASE',
        entityId: medCase?.id || milestoneId,
        payload: {
          milestone_id: milestoneId,
          mediator_id: mediatorId,
          decision: 'REJECT',
          notes,
          escrow_status: 'LOCKED_IN_ESCROW',
          timestamp
        }
      });

      return {
        milestoneId,
        previousStatus: 'MEDIATION_REQUIRED',
        newStatus: 'REJECTED',
        policy: 'MEDIATOR',
        escrowStatus: 'LOCKED_IN_ESCROW',
        mediationCase: medCase || undefined,
        rewardAllocated: false,
        ledgerAction: 'MEDIATOR_REJECTED'
      };
    }
  }
};
