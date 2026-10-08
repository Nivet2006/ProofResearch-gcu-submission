import { ResearchSourceAdapter, SourceQueryParams, SourceSearchResponse } from './sourceAdapter';
import { ResearchSourceId, ResearchSourceStatus, ResearchQueryResult } from '../../../types';
import { projectService } from '../../projectService';

export const ProofResearchSource: ResearchSourceAdapter = {
  sourceId: 'ProofResearch' as ResearchSourceId,
  displayName: 'ProofResearch Projects DB',
  isLive: true,

  async search(query: SourceQueryParams): Promise<SourceSearchResponse> {
    const startMs = Date.now();
    const reqTime = new Date().toISOString();

    try {
      // Fetch public projects ONLY from the live DB. NEVER access project_confidential!
      // If DB is empty (e.g. scrubbed), return zero results — never fall back to mock data.
      const allProjects = await projectService.getProjects();

      // EXCLUDE TARGET PROJECT BY ID (MUST NEVER match current project against itself)
      let projects = allProjects;
      if (query.targetProjectId) {
        const targetIdClean = query.targetProjectId.replace(/^proof-/, '');
        projects = allProjects.filter(proj => proj.id !== targetIdClean && `proof-${proj.id}` !== query.targetProjectId);
      }

      const results: Omit<ResearchQueryResult, 'rank' | 'similarity_score'>[] = projects.map(proj => ({
        id: `proof-${proj.id}`,
        source: 'ProofResearch' as ResearchSourceId,
        source_status: 'LIVE' as ResearchSourceStatus,
        external_id: proj.id,
        title: proj.title,
        authors: [proj.sponsor_profile?.full_name || 'ProofResearch Sponsor'],
        publication_date: proj.created_at ? proj.created_at.slice(0, 10) : '2026-10-06',
        url: `/projects/${proj.id}`,
        abstract_or_summary: proj.public_summary,
        overlap_summary: '',
        difference_summary: '',
        matched_concepts: [],
        metadata: {
          engagement_model: proj.engagement_model,
          budget: proj.budget,
          confidentiality_level: proj.confidentiality_level
        }
      }));

      const endMs = Date.now();
      return {
        status: 'LIVE',
        results,
        responseTimeMs: endMs - startMs,
        requestTimestamp: reqTime,
        responseTimestamp: new Date().toISOString()
      };
    } catch (err: any) {
      const endMs = Date.now();
      return {
        status: 'UNAVAILABLE',
        results: [],
        responseTimeMs: endMs - startMs,
        requestTimestamp: reqTime,
        responseTimestamp: new Date().toISOString(),
        errorMessage: err.message || 'Failed to search internal ProofResearch database'
      };
    }
  }
};
