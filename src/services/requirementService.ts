import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MatchingRequirementSet, MatchingRequirement, RequirementCategory, MatchingMethod, RequirementImportance } from '../types';
import { ledgerService } from './ledgerService';

// Pre-seeded Default Requirement Sets (for Offline/Demo mode)
const MOCK_REQUIREMENT_SETS: MatchingRequirementSet[] = [
  {
    id: 'reqset-p1111111-v1',
    project_id: '11111111-2222-3333-4444-555555555555',
    version: 'v1.0',
    status: 'APPROVED',
    created_by: 'u1111111-1111-1111-1111-111111111111',
    approved_by: 'u2222222-2222-2222-2222-222222222222',
    created_at: '2026-10-06T09:00:00.000Z',
    approved_at: '2026-10-06T09:30:00.000Z',
    created_from_ai: false,
    change_reason: 'Initial Sponsor Configured & Expert Approved Requirement Set',
    requirements: [
      {
        id: 'req-1',
        requirement_set_id: 'reqset-p1111111-v1',
        name: 'Computer Vision',
        description: 'Core domain expertise in Computer Vision algorithms and image processing.',
        category: 'DOMAIN',
        weight: 25.0,
        importance: 'REQUIRED',
        matching_method: 'DOMAIN_AFFINITY',
        sort_order: 1
      },
      {
        id: 'req-2',
        requirement_set_id: 'reqset-p1111111-v1',
        name: 'PyTorch',
        description: 'Deep Learning framework experience for model training and quantization.',
        category: 'TECHNOLOGY',
        weight: 25.0,
        importance: 'REQUIRED',
        matching_method: 'FRAMEWORK_AFFINITY',
        sort_order: 2
      },
      {
        id: 'req-3',
        requirement_set_id: 'reqset-p1111111-v1',
        name: 'Edge ML',
        description: 'Edge deployment, model optimization, and TFLite quantization.',
        category: 'TECHNOLOGY',
        weight: 25.0,
        importance: 'REQUIRED',
        matching_method: 'EXACT',
        sort_order: 3
      },
      {
        id: 'req-4',
        requirement_set_id: 'reqset-p1111111-v1',
        name: 'OpenCV',
        description: 'Computer vision library for image filtering and CLAHE enhancement.',
        category: 'SKILL',
        weight: 20.0,
        importance: 'PREFERRED',
        matching_method: 'EXACT',
        sort_order: 4
      },
      {
        id: 'req-5',
        requirement_set_id: 'reqset-p1111111-v1',
        name: 'Data Preprocessing',
        description: 'Raw dataset preparation, image normalization, and data pipeline scripting.',
        category: 'SKILL',
        weight: 5.0,
        importance: 'REQUIRED',
        matching_method: 'EXACT',
        sort_order: 5
      }
    ]
  }
];

export const requirementService = {
  /**
   * Fetches the active/approved requirement set for a project.
   */
  async getApprovedRequirementSet(projectId: string): Promise<MatchingRequirementSet | null> {
    if (isSupabaseConfigured) {
      try {
        const { data: set, error: setErr } = await supabase
          .from('matching_requirement_sets')
          .select('*, requirements:matching_requirements(*)')
          .eq('project_id', projectId)
          .eq('status', 'APPROVED')
          .order('version', { ascending: false })
          .limit(1)
          .single();

        if (set && set.requirements && Array.isArray(set.requirements) && set.requirements.length > 0 && !setErr) {
          return set as MatchingRequirementSet;
        }
      } catch (err) {
        console.warn('Supabase requirement set fetch error, using pre-seeded set', err);
      }
    }

    const matched = MOCK_REQUIREMENT_SETS.find(s => s.project_id === projectId && s.status === 'APPROVED');
    return matched || MOCK_REQUIREMENT_SETS[0];
  },

  /**
   * Fetches all requirement sets (drafts, pending review, approved, superseded) for a project.
   */
  async getProjectRequirementSets(projectId: string): Promise<MatchingRequirementSet[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('matching_requirement_sets')
          .select('*, requirements:matching_requirements(*)')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (data && !error && data.length > 0) {
          return data as MatchingRequirementSet[];
        }
      } catch (err) {
        console.warn('Requirement sets list error', err);
      }
    }

    return MOCK_REQUIREMENT_SETS.filter(s => s.project_id === projectId || true);
  },

  /**
   * Calculates total weight of a requirement list (must equal 100%).
   */
  calculateTotalWeight(requirements: Partial<MatchingRequirement>[]): number {
    const sum = requirements.reduce((acc, r) => acc + (r.weight || 0), 0);
    return parseFloat(sum.toFixed(2));
  },

  /**
   * Sponsor creates a new Draft Requirement Set or updates an existing draft.
   */
  async createDraftRequirementSet(
    projectId: string,
    sponsorId: string,
    requirements: Omit<MatchingRequirement, 'id' | 'requirement_set_id'>[],
    createdFromAI: boolean = false
  ): Promise<MatchingRequirementSet> {
    const totalWeight = this.calculateTotalWeight(requirements);
    if (Math.abs(totalWeight - 100.0) > 0.01) {
      throw new Error(`Validation Error: Requirement weights must sum to exactly 100%. Current total: ${totalWeight}%.`);
    }

    const timestamp = new Date().toISOString();
    const setId = `reqset-${projectId}-${Date.now()}`;
    const version = 'v1.0-DRAFT';

    const reqSet: MatchingRequirementSet = {
      id: setId,
      project_id: projectId,
      version,
      status: 'DRAFT',
      created_by: sponsorId,
      created_at: timestamp,
      created_from_ai: createdFromAI,
      requirements: requirements.map((r, idx) => ({
        ...r,
        id: `req-${setId}-${idx + 1}`,
        requirement_set_id: setId,
        sort_order: idx + 1
      }))
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('matching_requirement_sets').insert({
          id: reqSet.id,
          project_id: reqSet.project_id,
          version: reqSet.version,
          status: reqSet.status,
          created_by: reqSet.created_by,
          created_from_ai: reqSet.created_from_ai
        });

        if (reqSet.requirements) {
          await supabase.from('matching_requirements').insert(reqSet.requirements);
        }
      } catch (err) {
        console.warn('Requirement set draft insert error:', err);
      }
    }

    MOCK_REQUIREMENT_SETS.unshift(reqSet);

    // Record in ledger
    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'MATCHING_REQUIREMENTS_CREATED',
      entityType: 'MATCHING_REQUIREMENT_SET',
      entityId: setId,
      payload: { version, total_requirements: requirements.length, total_weight: totalWeight }
    });

    return reqSet;
  },

  /**
   * Generates AI-proposed requirements for a project based on its research scope.
   */
  generateAIProposedRequirements(
    projectId: string,
    sponsorId: string,
    projectTitle: string,
    projectSummary: string
  ): Omit<MatchingRequirement, 'id' | 'requirement_set_id'>[] {
    const lower = (projectTitle + ' ' + projectSummary).toLowerCase();

    if (lower.includes('retinopathy') || lower.includes('vision') || lower.includes('fundus')) {
      return [
        { name: 'Computer Vision', category: 'DOMAIN', weight: 25.0, importance: 'REQUIRED', matching_method: 'DOMAIN_AFFINITY', description: 'AI Suggested: Essential for fundus image processing.' },
        { name: 'PyTorch', category: 'TECHNOLOGY', weight: 20.0, importance: 'REQUIRED', matching_method: 'FRAMEWORK_AFFINITY', description: 'AI Suggested: Primary ML framework in research scope.' },
        { name: 'Medical Imaging', category: 'DOMAIN', weight: 20.0, importance: 'REQUIRED', matching_method: 'DOMAIN_AFFINITY', description: 'AI Suggested: Medical image classification & segmentation.' },
        { name: 'Python', category: 'SKILL', weight: 10.0, importance: 'REQUIRED', matching_method: 'EXACT', description: 'AI Suggested: Standard language requirement.' },
        { name: 'Edge ML', category: 'TECHNOLOGY', weight: 10.0, importance: 'PREFERRED', matching_method: 'EXACT', description: 'AI Suggested: Needed for mobile edge quantization.' },
        { name: 'Research Experience', category: 'EXPERIENCE', weight: 10.0, importance: 'PREFERRED', matching_method: 'NUMERIC_THRESHOLD', description: 'AI Suggested: Algorithmic experimentation experience.' },
        { name: 'Medical AI Publication', category: 'ACHIEVEMENT', weight: 5.0, importance: 'OPTIONAL', matching_method: 'BOOLEAN', description: 'AI Suggested: Publication bonus.' }
      ];
    } else if (lower.includes('blockchain') || lower.includes('solidity')) {
      return [
        { name: 'Solidity', category: 'SKILL', weight: 30.0, importance: 'REQUIRED', matching_method: 'EXACT', description: 'AI Suggested: Smart contract development.' },
        { name: 'Blockchain Architecture', category: 'TECHNOLOGY', weight: 25.0, importance: 'REQUIRED', matching_method: 'DOMAIN_AFFINITY', description: 'AI Suggested: Distributed ledger protocols.' },
        { name: 'Distributed Systems', category: 'DOMAIN', weight: 20.0, importance: 'REQUIRED', matching_method: 'EXACT', description: 'AI Suggested: Consensus & network architecture.' },
        { name: 'TypeScript', category: 'SKILL', weight: 15.0, importance: 'REQUIRED', matching_method: 'EXACT', description: 'AI Suggested: Client & SDK integration.' },
        { name: 'Security Audit Experience', category: 'EXPERIENCE', weight: 10.0, importance: 'PREFERRED', matching_method: 'NUMERIC_THRESHOLD', description: 'AI Suggested: Smart contract vulnerability auditing.' }
      ];
    } else {
      return [
        { name: 'SQL & Data Analysis', category: 'SKILL', weight: 30.0, importance: 'REQUIRED', matching_method: 'EXACT', description: 'AI Suggested: Database querying & analytics.' },
        { name: 'Python', category: 'TECHNOLOGY', weight: 25.0, importance: 'REQUIRED', matching_method: 'EXACT', description: 'AI Suggested: Data manipulation & statistics.' },
        { name: 'Data Visualization', category: 'SKILL', weight: 25.0, importance: 'PREFERRED', matching_method: 'EXACT', description: 'AI Suggested: Dashboard & reporting tools.' },
        { name: 'Research Experience', category: 'EXPERIENCE', weight: 20.0, importance: 'PREFERRED', matching_method: 'NUMERIC_THRESHOLD', description: 'AI Suggested: Analytical experience.' }
      ];
    }
  },

  /**
   * Sponsor submits requirement set for Expert Review.
   */
  async submitForExpertReview(setId: string, sponsorId: string): Promise<MatchingRequirementSet> {
    const targetSet = MOCK_REQUIREMENT_SETS.find(s => s.id === setId);
    if (!targetSet) throw new Error(`Requirement set ${setId} not found.`);

    const totalWeight = this.calculateTotalWeight(targetSet.requirements || []);
    if (Math.abs(totalWeight - 100.0) > 0.01) {
      throw new Error(`Validation Error: Requirements must sum to exactly 100%. Current total: ${totalWeight}%.`);
    }

    targetSet.status = 'PENDING_EXPERT_REVIEW';

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('matching_requirement_sets')
          .update({ status: 'PENDING_EXPERT_REVIEW' })
          .eq('id', setId);
      } catch (err) {
        console.warn('Requirement set status update error:', err);
      }
    }

    // Record in ledger
    await ledgerService.appendEntry({
      projectId: targetSet.project_id,
      actorId: sponsorId,
      action: 'MATCHING_REQUIREMENTS_SUBMITTED',
      entityType: 'MATCHING_REQUIREMENT_SET',
      entityId: setId,
      payload: { status: 'PENDING_EXPERT_REVIEW', total_weight: totalWeight }
    });

    return targetSet;
  },

  /**
   * Expert approves requirement set. Makes current set APPROVED and marks previous version as SUPERSEDED.
   */
  async approveRequirementSet(setId: string, expertId: string): Promise<MatchingRequirementSet> {
    const targetSet = MOCK_REQUIREMENT_SETS.find(s => s.id === setId);
    if (!targetSet) throw new Error(`Requirement set ${setId} not found.`);

    const totalWeight = this.calculateTotalWeight(targetSet.requirements || []);
    if (Math.abs(totalWeight - 100.0) > 0.01) {
      throw new Error(`Approval Failed: Requirements must sum to exactly 100%. Current total: ${totalWeight}%.`);
    }

    // Version tag increment (v1.0, v2.0, etc.)
    const prevApproved = MOCK_REQUIREMENT_SETS.find(s => s.project_id === targetSet.project_id && s.status === 'APPROVED');
    let versionTag = 'v1.0';
    if (prevApproved) {
      const match = prevApproved.version.match(/v?(\d+)/);
      const major = match ? parseInt(match[1], 10) : 1;
      versionTag = `v${major + 1}.0`;
      prevApproved.status = 'SUPERSEDED';
    }

    targetSet.status = 'APPROVED';
    targetSet.version = versionTag;
    targetSet.approved_by = expertId;
    targetSet.approved_at = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        if (prevApproved) {
          await supabase
            .from('matching_requirement_sets')
            .update({ status: 'SUPERSEDED' })
            .eq('id', prevApproved.id);
        }

        await supabase
          .from('matching_requirement_sets')
          .update({
            status: 'APPROVED',
            version: versionTag,
            approved_by: expertId,
            approved_at: targetSet.approved_at
          })
          .eq('id', setId);
      } catch (err) {
        console.warn('Requirement set approval error:', err);
      }
    }

    // Record in ledger
    await ledgerService.appendEntry({
      projectId: targetSet.project_id,
      actorId: expertId,
      action: 'MATCHING_REQUIREMENTS_APPROVED',
      entityType: 'MATCHING_REQUIREMENT_SET',
      entityId: setId,
      payload: { version: versionTag, status: 'APPROVED', approved_by: expertId }
    });

    return targetSet;
  }
};
