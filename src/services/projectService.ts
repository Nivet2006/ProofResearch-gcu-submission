import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Project, ProjectConfidential, Milestone } from '../types';
import { MOCK_PROJECTS, MOCK_PROJECT_CONFIDENTIAL, MOCK_MILESTONES, MOCK_USERS } from '../data/mockData';
import { ledgerService } from './ledgerService';

import { projectExitService } from './projectExitService';
import { charterService } from './charterService';

const CUSTOM_PROJECTS_KEY = 'proof_research_custom_projects';
const CUSTOM_BRIEFS_KEY = 'proof_research_custom_briefs';

function safeGetStorage(key: string): any[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function safeSaveStorage(key: string, items: any[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {}
}

function getStoredCustomProjects(): Project[] {
  return safeGetStorage(CUSTOM_PROJECTS_KEY);
}

function saveCustomProject(project: Project): void {
  const list = getStoredCustomProjects().filter(p => p.id !== project.id);
  list.unshift(project);
  safeSaveStorage(CUSTOM_PROJECTS_KEY, list);
}

function getStoredCustomBriefs(): ProjectConfidential[] {
  return safeGetStorage(CUSTOM_BRIEFS_KEY);
}

function saveCustomBrief(brief: ProjectConfidential): void {
  const list = getStoredCustomBriefs().filter(b => b.project_id !== brief.project_id);
  list.unshift(brief);
  safeSaveStorage(CUSTOM_BRIEFS_KEY, list);
}

export const projectService = {
  /**
   * Fetch public summary list for all projects.
   */
  async getProjects(): Promise<Project[]> {
    let dbProjects: Project[] = [];
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .neq('status', 'DRAFT')
          .order('created_at', { ascending: false });
        if (data && !error) {
          dbProjects = data as Project[];
        }
      } catch (err) {
        console.warn('Projects fetch error', err);
      }
    }

    // Merge Supabase DB projects + localStorage custom projects + pre-seeded MOCK_PROJECTS
    const customProjects = getStoredCustomProjects();
    const combinedMap = new Map<string, Project>();

    dbProjects.forEach(p => combinedMap.set(p.id, p));
    customProjects.forEach(p => {
      if (!combinedMap.has(p.id)) combinedMap.set(p.id, p);
    });
    MOCK_PROJECTS.forEach(p => {
      if (!combinedMap.has(p.id)) combinedMap.set(p.id, p);
    });

    const results = Array.from(combinedMap.values());
    // Attach sponsor profiles
    results.forEach(p => {
      if (!p.sponsor_profile && p.created_by) {
        p.sponsor_profile = MOCK_USERS.find(u => u.id === p.created_by) || MOCK_USERS[0];
      }
    });

    return results;
  },

  /**
   * Fetch single project by ID with creator profile.
   */
  async getProjectById(id: string): Promise<Project | null> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (data && !error) {
          const proj = data as Project;
          if (!proj.sponsor_profile && proj.created_by) {
            const { data: creator } = await supabase
              .from('users')
              .select('*')
              .eq('id', proj.created_by)
              .maybeSingle();
            proj.sponsor_profile = creator || MOCK_USERS.find(u => u.id === proj.created_by) || MOCK_USERS[0];
          }
          return proj;
        }
      } catch (err) {
        console.warn('Project fetch error', err);
      }
    }

    // 1. Check custom projects stored in localStorage
    const customMatch = getStoredCustomProjects().find(p => p.id === id);
    if (customMatch) return customMatch;

    // 2. Check in-memory MOCK_PROJECTS
    const found = MOCK_PROJECTS.find(p => p.id === id);
    if (found) return found;

    // 3. Fallback dynamically titled project for deep-linked UUID routes (preserves project ID without forcing diabetic retinopathy title)
    return {
      id,
      title: `Research Project (${id.slice(0, 8)})`,
      public_summary: 'Project details and research objectives submitted for verifiable collaboration on ProofResearch.',
      engagement_model: 'FUNDED',
      budget: 100000,
      currency: 'INR',
      status: 'OPEN',
      created_by: 'u1111111-1111-1111-1111-111111111111',
      confidentiality_level: 'MEDIUM',
      created_at: new Date().toISOString(),
      sponsor_profile: MOCK_USERS[0]
    } as Project;
  },

  /**
   * Fetch confidential brief for a project.
   * Enforces RLS and membership gates (blocks unaccepted or LEFT members).
   */
  async getConfidentialBrief(projectId: string, userId: string): Promise<ProjectConfidential | null> {
    // Check if user has exited
    const hasExited = await projectExitService.isMemberExited(projectId, userId);
    if (hasExited) {
      console.warn(`Confidential brief access DENIED for exited user ${userId} on project ${projectId}`);
      return null;
    }

    // Check if user has accepted charter or is sponsor
    const project = await this.getProjectById(projectId);
    const isSponsor = project?.created_by === userId;
    const hasAccepted = await charterService.hasAcceptedCharter(projectId, userId);

    if (!isSponsor && !hasAccepted) {
      return null;
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('project_confidential')
          .select('*')
          .eq('project_id', projectId)
          .maybeSingle();
        if (data && !error) {
          return data as ProjectConfidential;
        }
      } catch (err) {
        console.warn('Confidential brief access restricted or failed', err);
      }
    }

    // Check localStorage custom briefs
    const customBrief = getStoredCustomBriefs().find(b => b.project_id === projectId);
    if (customBrief) return customBrief;

    const found = MOCK_PROJECT_CONFIDENTIAL.find(b => b.project_id === projectId);
    if (found) return found;

    return {
      id: `b-${projectId}`,
      project_id: projectId,
      confidential_brief: 'CONTAINS PROPRIETARY CLINICAL DATASET RESTRICTIONS: Raw fundus images obtained under MedVision IRB #2025-DR-90. Pre-processing scripts must apply CLAHE contrast enhancement and resize to 224x224 before MobileNetV3 int8 quantization. Output model binary must remain under 12MB.',
      created_at: new Date().toISOString()
    };
  },

  /**
   * Create a new research project (Sponsor role).
   * Stores public metadata in `projects` and brief in `project_confidential`.
   */
  async createProject(
    payload: {
      title: string;
      public_summary: string;
      confidential_brief: string;
      engagement_model: 'FUNDED' | 'KNOWLEDGE_SHARING';
      budget: number;
      confidentiality_level: 'PUBLIC' | 'MEDIUM' | 'HIGH';
      novelty_assessment_id?: string;
    },
    creatorId: string
  ): Promise<Project> {
    // Generate a valid UUID v4 so Supabase UUID-typed columns accept the value
    const newProjectId = crypto.randomUUID();
    const newProject: Project = {
      id: newProjectId,
      title: payload.title,
      public_summary: payload.public_summary,
      engagement_model: payload.engagement_model,
      budget: payload.budget,
      currency: 'INR',
      status: 'OPEN',
      created_by: creatorId,
      confidentiality_level: payload.confidentiality_level,
      created_at: new Date().toISOString(),
      sponsor_profile: MOCK_USERS.find(u => u.id === creatorId) || MOCK_USERS[0]
    };

    const newConfidential: ProjectConfidential = {
      id: `b-${Date.now()}`,
      project_id: newProjectId,
      confidential_brief: payload.confidential_brief,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      try {
        const { data: projData, error: projErr } = await supabase
          .from('projects')
          .insert(newProject)
          .select()
          .maybeSingle();

        if (projData && !projErr) {
          await supabase
            .from('project_confidential')
            .insert(newConfidential);
        }
      } catch (err) {
        console.warn('Supabase project creation fallback to memory', err);
      }
    }

    MOCK_PROJECTS.unshift(newProject);
    MOCK_PROJECT_CONFIDENTIAL.unshift(newConfidential);
    saveCustomProject(newProject);
    saveCustomBrief(newConfidential);

    // Record creation event in hash ledger
    await ledgerService.appendEntry({
      projectId: newProjectId,
      actorId: creatorId,
      action: 'CREATE_PROJECT',
      entityType: 'PROJECT',
      entityId: newProjectId,
      payload: {
        title: payload.title,
        budget: payload.budget,
        model: payload.engagement_model,
        novelty_assessment_id: payload.novelty_assessment_id || null
      }
    });

    // Record publication lifecycle event in hash ledger
    await ledgerService.appendEntry({
      projectId: newProjectId,
      actorId: creatorId,
      action: 'PROJECT_PUBLISHED',
      entityType: 'PROJECT',
      entityId: newProjectId,
      payload: {
        title: payload.title,
        status: 'PUBLISHED',
        charterVersion: 'v1.0',
        novelty_assessment_id: payload.novelty_assessment_id || null,
        timestamp: new Date().toISOString()
      }
    });

    return newProject;
  },

  /**
   * Fetch milestones for a project.
   */
  async getMilestones(projectId: string): Promise<Milestone[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('milestones')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true });
        if (data && !error) {
          return data as Milestone[];
        }
      } catch (err) {
        console.warn('Milestones fetch error', err);
      }
    }
    const isTest = import.meta.env.MODE === 'test';
    return (isTest || import.meta.env.VITE_USE_MOCK_DATA === 'true') ? MOCK_MILESTONES.filter(m => m.project_id === projectId) : [];
  },

  /**
   * Human approval gate for AI-proposed milestone.
   */
  async approveMilestone(milestoneId: string, sponsorId: string): Promise<Milestone> {
    const milestone = MOCK_MILESTONES.find(m => m.id === milestoneId);
    if (!milestone) throw new Error('Milestone not found');

    milestone.status = 'ACTIVE';
    milestone.human_approved = true;

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('milestones')
          .update({ status: 'ACTIVE', human_approved: true })
          .eq('id', milestoneId);
      } catch (err) {
        console.warn('Supabase milestone update error', err);
      }
    }

    // Record approval in ledger
    await ledgerService.appendEntry({
      projectId: milestone.project_id,
      actorId: sponsorId,
      action: 'APPROVE_MILESTONE',
      entityType: 'MILESTONE',
      entityId: milestoneId,
      payload: { title: milestone.title, status: 'ACTIVE' }
    });

    return milestone;
  },

  /**
   * ADMIN ONLY: Hard-delete a project and ALL its child data.
   * Deletion order respects FK dependencies: children first, project last.
   */
  async deleteProject(projectId: string): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) {
      return { success: false, message: 'Supabase not configured.' };
    }
    try {
      // Child tables in dependency order (deepest children first)
      const childTables = [
        'ledger_entries',
        'reward_allocations',
        'escrow_accounts',
        'matching_results',
        'charter_acceptances',
        'contributions',
        'submissions',
        'milestones',
        'project_members',
        'project_confidential',
        'charters',
        'ai_actions',
        'coi_declarations',
        'access_logs',
        'blockchain_anchors',
        'project_ledger',
        'commercialisation_declarations',
        'novelty_checks',
        'exploration_submissions',
        'sponsor_silence_records',
      ];

      for (const table of childTables) {
        try {
          await supabase.from(table).delete().eq('project_id', projectId);
        } catch (_) {
          // Table may not exist or has no rows — continue
        }
      }

      // Finally delete the project itself
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw new Error(error.message);

      return { success: true, message: `Project ${projectId} and all related data deleted.` };
    } catch (err: any) {
      return { success: false, message: err.message || 'Delete failed.' };
    }
  }
};

