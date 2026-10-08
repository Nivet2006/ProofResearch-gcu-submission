import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  MOCK_USERS,
  MOCK_PROJECTS,
  MOCK_PROJECT_CONFIDENTIAL,
  MOCK_CHARTERS,
  MOCK_MILESTONES,
  MOCK_CONTRIBUTIONS,
  MOCK_MATCHING_RESULTS,
  MOCK_ESCROW,
  MOCK_REWARD_ALLOCATIONS,
  MOCK_LEDGER_ENTRIES
} from '../data/mockData';

export const seedService = {
  /**
   * Check if application tables in Supabase contain populated data.
   */
  async isDatabaseSeeded(): Promise<boolean> {
    if (!isSupabaseConfigured) return true; // Handled by in-memory mock fallback
    try {
      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });
      return !error && (count ?? 0) > 0;
    } catch {
      return false;
    }
  },

  /**
   * Seed all 14 application tables programmatically in Supabase.
   */
  async seedAllTables(): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) {
      return { success: true, message: 'Running in Mock Mode. Data is pre-populated in memory.' };
    }

    try {
      // 1. Users
      await supabase.from('users').upsert(
        MOCK_USERS.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.full_name,
          role: u.role,
          institution: u.institution,
          avatar_url: u.avatar_url
        })),
        { onConflict: 'id' }
      );

      // 2. Candidate Profiles
      await supabase.from('candidate_profiles').upsert(
        [
          {
            id: 'c3333333-3333-3333-3333-333333333333',
            user_id: 'u3333333-3333-3333-3333-333333333333',
            skills: ['Computer Vision', 'PyTorch', 'Edge ML', 'OpenCV', 'Python'],
            experience_score: 85.0,
            availability_score: 90.0,
            research_interest: 'Diabetic Retinopathy & Edge AI Optimization',
            verification_level: 'VERIFIED'
          },
          {
            id: 'c4444444-4444-4444-4444-444444444444',
            user_id: 'u4444444-4444-4444-4444-444444444444',
            skills: ['Data Preprocessing', 'TensorFlow', 'Image Segmentation'],
            experience_score: 78.0,
            availability_score: 85.0,
            research_interest: 'Medical Image Segmentation & Accessibility',
            verification_level: 'VERIFIED'
          }
        ],
        { onConflict: 'id' }
      );

      // 3. Projects
      await supabase.from('projects').upsert(
        MOCK_PROJECTS.map(p => ({
          id: p.id,
          title: p.title,
          public_summary: p.public_summary,
          engagement_model: p.engagement_model,
          budget: p.budget,
          currency: p.currency,
          status: p.status,
          created_by: p.created_by,
          confidentiality_level: p.confidentiality_level,
          created_at: p.created_at
        })),
        { onConflict: 'id' }
      );

      // 4. Project Confidential
      await supabase.from('project_confidential').upsert(
        MOCK_PROJECT_CONFIDENTIAL.map(b => ({
          id: b.id,
          project_id: b.project_id,
          confidential_brief: b.confidential_brief,
          created_at: b.created_at
        })),
        { onConflict: 'id' }
      );

      // 5. Charters
      await supabase.from('charters').upsert(
        MOCK_CHARTERS.map(c => ({
          id: c.id,
          project_id: c.project_id,
          version: c.version,
          status: c.status,
          engagement_model: c.engagement_model,
          reward_terms: c.reward_terms,
          scope: c.scope,
          deliverables: c.deliverables,
          acceptance_criteria: c.acceptance_criteria,
          ip_terms: c.ip_terms,
          publication_terms: c.publication_terms,
          confidentiality_terms: c.confidentiality_terms,
          credit_terms: c.credit_terms,
          exit_terms: c.exit_terms,
          dispute_terms: c.dispute_terms,
          commercialisation_terms: c.commercialisation_terms
        })),
        { onConflict: 'id' }
      );

      // 6. Project Memberships
      await supabase.from('project_members').upsert(
        [
          {
            id: 'pm111111-1111-1111-1111-111111111111',
            project_id: 'p1111111-1111-1111-1111-111111111111',
            user_id: 'u3333333-3333-3333-3333-333333333333',
            role: 'STUDENT',
            status: 'ACCEPTED',
            charter_version_accepted: 'v1.0',
            engagement_acknowledged: true
          },
          {
            id: 'pm222222-2222-2222-2222-222222222222',
            project_id: 'p1111111-1111-1111-1111-111111111111',
            user_id: 'u4444444-4444-4444-4444-444444444444',
            role: 'STUDENT',
            status: 'ACCEPTED',
            charter_version_accepted: 'v1.0',
            engagement_acknowledged: true
          },
          {
            id: 'pm333333-3333-3333-3333-333333333333',
            project_id: 'p1111111-1111-1111-1111-111111111111',
            user_id: 'u2222222-2222-2222-2222-222222222222',
            role: 'EXPERT',
            status: 'ACCEPTED',
            charter_version_accepted: 'v1.0',
            engagement_acknowledged: true
          }
        ],
        { onConflict: 'id' }
      );

      // 7. Milestones
      await supabase.from('milestones').upsert(
        MOCK_MILESTONES.map(m => ({
          id: m.id,
          project_id: m.project_id,
          title: m.title,
          description: m.description,
          budget: m.budget,
          due_date: (m as any).due_date || (m as any).created_at,
          status: m.status
        })),
        { onConflict: 'id' }
      );

      // 8. Contributions
      await supabase.from('contributions').upsert(
        MOCK_CONTRIBUTIONS.map(ct => ({
          id: ct.id,
          project_id: ct.project_id,
          milestone_id: ct.milestone_id,
          user_id: ct.user_id,
          title: ct.description,
          description: ct.description,
          artifact_url: 'https://github.com/proofresearch/dr-edge',
          artifact_hash: ct.artifact_hash,
          human_owner_id: ct.user_id,
          ai_assisted: ct.ai_assisted,
          ai_disclosure: ct.ai_assisted ? { mode: 'PREDOMINANT', summary: 'AI assisted development' } : null,
          reviewed_impact: ct.impact_score || 8.0,
          status: ct.review_status === 'APPROVED' ? 'ACCEPTED' : 'PENDING'
        })),
        { onConflict: 'id' }
      );

      // 9. Matching Results
      await supabase.from('matching_results').upsert(
        MOCK_MATCHING_RESULTS.map((mr: any) => ({
          id: mr.id,
          project_id: mr.project_id,
          candidate_id: mr.candidate_id,
          match_score: mr.match_score,
          match_reason: mr.explanation || 'Skill and background match',
          coi_status: 'NONE'
        })),
        { onConflict: 'id' }
      );

      // 10. Escrow Accounts
      await supabase.from('escrow_accounts').upsert(
        MOCK_ESCROW.map((e: any) => ({
          id: e.id,
          project_id: e.project_id,
          total_budget: e.amount || 25000.0,
          locked_amount: e.amount || 25000.0,
          released_amount: 0.0,
          status: e.status === 'LOCKED_IN_ESCROW' ? 'FUNDED' : e.status
        })),
        { onConflict: 'id' }
      );

      // 11. Reward Allocations
      await supabase.from('reward_allocations').upsert(
        MOCK_REWARD_ALLOCATIONS.map((r: any) => ({
          id: r.id,
          project_id: r.project_id,
          milestone_id: r.milestone_id,
          user_id: r.user_id,
          amount: r.final_amount,
          share_percentage: (r.contribution_weight || 0.5) * 100,
          reviewed_impact: r.contribution_weight ? r.contribution_weight * 10 : 8.0,
          status: 'ALLOCATED'
        })),
        { onConflict: 'id' }
      );

      // 12. Milestone Disputes
      await supabase.from('milestone_disputes').upsert(
        [
          {
            id: 'd1111111-1111-1111-1111-111111111111',
            project_id: 'p1111111-1111-1111-1111-111111111111',
            milestone_id: 'm1111111-1111-1111-1111-111111111111',
            filed_by: 'u3333333-3333-3333-3333-333333333333',
            reason: 'Submitted CLAHE scripts satisfy tensor criteria.',
            failed_criteria: ['Validation contrast results attached'],
            evidence_hashes: ['e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],
            status: 'PENDING'
          }
        ],
        { onConflict: 'id' }
      );

      // 13. AI Actions
      await supabase.from('ai_actions').upsert(
        [
          {
            id: 'ai111111-1111-1111-1111-111111111111',
            project_id: 'p1111111-1111-1111-1111-111111111111',
            action_type: 'PROPOSE_SCOPING',
            agent_name: 'ScopingAgent',
            payload: { scope: 'INT8 MobileNetV3 Quantization', confidence: 0.94 },
            status: 'PROPOSED'
          }
        ],
        { onConflict: 'id' }
      );

      // 14. Novelty Results
      await supabase.from('research_novelty_results').upsert(
        [
          {
            id: 'n1111111-1111-1111-1111-111111111111',
            project_id: 'p1111111-1111-1111-1111-111111111111',
            query_title: 'Low-cost detection of diabetic retinopathy from fundus images on edge devices',
            overall_similarity: 0.32,
            sources_checked: { ProofResearch: true, OpenAlex: true, Crossref: true, NDLI: true, arXiv: true },
            status: 'COMPLETED'
          }
        ],
        { onConflict: 'id' }
      );

      // 15. Commercialisation Events
      await supabase.from('commercialisation_events').upsert(
        [
          {
            id: 'cm111111-1111-1111-1111-111111111111',
            project_id: 'p1111111-1111-1111-1111-111111111111',
            declared_by: 'u1111111-1111-1111-1111-111111111111',
            status: 'COMMERCIALISED',
            royalty_pool: 50000.0
          }
        ],
        { onConflict: 'id' }
      );

      // 16. Guardian Consents
      await supabase.from('guardian_consents').upsert(
        [
          {
            id: 'g4444444-4444-4444-4444-444444444444',
            user_id: 'u4444444-4444-4444-4444-444444444444',
            is_minor: true,
            guardian_name: 'Ramesh Patel',
            status: 'VERIFIED'
          }
        ],
        { onConflict: 'user_id' }
      );

      // 17. Project Ledger
      await supabase.from('project_ledger').upsert(
        MOCK_LEDGER_ENTRIES.map((l: any) => ({
          id: l.id,
          project_id: l.project_id,
          sequence_number: l.sequence_number,
          event_type: l.action || 'PROJECT_UPDATED',
          payload: l.payload,
          previous_hash: l.previous_hash,
          current_hash: l.current_hash,
          created_at: l.created_at
        })),
        { onConflict: 'id' }
      );

      return { success: true, message: 'All 14 application data tables successfully seeded in Supabase!' };
    } catch (err: any) {
      console.error('Failed to seed Supabase database:', err);
      return { success: false, message: `Seeding failed: ${err?.message || 'Unknown error'}` };
    }
  },

  /**
   * Auto-seed if database tables are currently empty AND VITE_ENABLE_DEMO_SEED is explicitly true.
   */
  async ensureDatabaseSeeded(): Promise<void> {
    const enableDemoSeed = import.meta.env.VITE_ENABLE_DEMO_SEED === 'true';
    if (!enableDemoSeed) {
      // Auto-seeding disabled for normal/demo operations to preserve clean database state
      return;
    }
    const isSeeded = await this.isDatabaseSeeded();
    if (!isSeeded) {
      console.log('Database empty and VITE_ENABLE_DEMO_SEED=true. Automatically populating seed data...');
      await this.seedAllTables();
    }
  }
};
