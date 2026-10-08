import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Milestone, Charter, AIAction } from '../types';
import { MOCK_MILESTONES, MOCK_CHARTERS } from '../data/mockData';
import { ledgerService } from './ledgerService';

export interface ScopingResult {
  scope: string;
  milestones: Milestone[];
  draftCharter: Partial<Charter>;
  aiActionId: string;
}

export const scopingAgent = {
  /**
   * Scoping Agent: Transforms a sponsor project problem statement into structured scope,
   * proposed milestones, and a draft charter.
   * AI Proposes -> Human Sponsor Approves -> Ledger Records.
   */
  async generateProjectScope(
    projectId: string,
    title: string,
    publicSummary: string,
    sponsorId: string
  ): Promise<ScopingResult> {
    const aiActionId = crypto.randomUUID();

    // 1. Generate structured scope & draft charter terms
    const generatedScope = `Develop a lightweight deep learning pipeline capable of running inference on low-power edge hardware for ${title}. Includes CLAHE preprocessing, model architecture selection, int8 quantization, and accuracy benchmarking.`;

    const proposedMilestones: Milestone[] = [
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        title: 'Milestone 1: Dataset Preprocessing & CLAHE Pipeline',
        description: `Clean raw image dataset, apply CLAHE contrast enhancement, resize to 224x224, and generate train/val/test splits with cryptographic evidence hashing for ${title}.`,
        required_skills: ['Computer Vision', 'PyTorch', 'Data Preprocessing', 'OpenCV'],
        deliverables: ['Preprocessed Dataset Split', 'CLAHE Preprocessing Script'],
        acceptance_criteria: 'Dataset split verified with SHA-256 content hashes; script executes reproducibly.',
        budget: 25000.00,
        status: 'PENDING_HUMAN_APPROVAL',
        ai_generated: true,
        human_approved: false,
        created_at: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        title: 'Milestone 2: MobileNetV3 Edge Quantization & Inference Engine',
        description: 'Train lightweight MobileNetV3 architecture, perform int8 quantization for TFLite runtime, and evaluate latency/accuracy trade-offs.',
        required_skills: ['PyTorch', 'Edge ML', 'TFLite', 'Model Quantization'],
        deliverables: ['Quantized TFLite Model Binary (<12MB)', 'Edge Execution Latency Report'],
        acceptance_criteria: 'Accuracy >= 88%, Memory <= 12MB, Latency <= 150ms on ARM processor.',
        budget: 75000.00,
        status: 'PENDING_HUMAN_APPROVAL',
        ai_generated: true,
        human_approved: false,
        created_at: new Date().toISOString()
      }
    ];

    const draftCharter: Partial<Charter> = {
      project_id: projectId,
      version: 'v1.0-DRAFT',
      status: 'DRAFT',
      engagement_model: 'FUNDED',
      reward_terms: {
        expert_share: 0.30,
        student_pool: 0.40,
        ai_reserve: 0.05,
        platform: 0.10,
        reserve: 0.15
      },
      scope: generatedScope,
      deliverables: [
        'Pre-processed Image Dataset Split (CLAHE applied)',
        'Quantized Model Binary (<12MB footprint)',
        'Benchmark Test Accuracy Metrics & Latency Report'
      ],
      acceptance_criteria: 'Model classification accuracy > 88% on held-out test split with under 150ms latency.',
      ip_terms: 'Sponsor retains commercial IP rights; Student retains academic attribution rights.',
      publication_terms: 'arXiv co-authorship granted to primary student contributor upon milestone acceptance.',
      confidentiality_terms: 'Raw clinical data must remain within the secure project workspace.',
      credit_terms: 'Credit distributed proportionally based on reviewed expert impact scores.',
      exit_terms: 'Pro-rata reward retained for accepted past milestones upon withdrawal.',
      dispute_terms: 'Binding arbitration by assigned domain expert.',
      commercialisation_terms: '5% royalty pool allocated to student contributors upon commercialisation.'
    };

    // 2. Record AI Action in DB & Ledger
    const aiActionRecord: AIAction = {
      id: aiActionId,
      project_id: projectId,
      human_owner_id: sponsorId,
      action_type: 'SCOPE_GENERATION',
      data_scope: 'Project_Public_Summary',
      tools_used: ['Scoping_LLM_Engine', 'Milestone_Decomposer_v2'],
      approval_required: true,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('ai_actions').insert(aiActionRecord);
      if (error) {
        console.error('AI Action insert error:', error.message);
        throw new Error(`Failed to record AI action: ${error.message}`);
      }
    }

    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'AI_SCOPE_GENERATED',
      entityType: 'AI_ACTION',
      entityId: aiActionId,
      payload: { title, milestones_proposed: proposedMilestones.length, draft_version: 'v1.0-DRAFT' }
    });

    return {
      scope: generatedScope,
      milestones: proposedMilestones,
      draftCharter,
      aiActionId
    };
  },

  /**
   * Human Sponsor Approval: Sponsor explicitly approves AI-proposed scope & charter.
   * Appends `AI_SCOPE_APPROVED` to authoritative ledger.
   */
  async approveScopeAndCharter(
    projectId: string,
    sponsorId: string,
    charterId: string
  ): Promise<void> {
    await ledgerService.appendEntry({
      projectId,
      actorId: sponsorId,
      action: 'AI_SCOPE_APPROVED',
      entityType: 'CHARTER',
      entityId: charterId,
      payload: { approved_by: sponsorId, status: 'ACTIVE', version: 'v1.0' }
    });
  }
};
