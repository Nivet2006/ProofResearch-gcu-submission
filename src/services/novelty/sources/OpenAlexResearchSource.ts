import { ResearchSourceAdapter, SourceQueryParams, SourceSearchResponse } from './sourceAdapter';
import { ResearchSourceId, ResearchSourceStatus, ResearchQueryResult } from '../../../types';

export const OpenAlexResearchSource: ResearchSourceAdapter = {
  sourceId: 'OpenAlex' as ResearchSourceId,
  displayName: 'OpenAlex Scholarly Index',
  isLive: true,

  async search(query: SourceQueryParams): Promise<SourceSearchResponse> {
    const startMs = Date.now();
    const reqTime = new Date().toISOString();
    const searchTerm = query.concepts.slice(0, 3).join(' ') || query.title;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const url = `https://api.openalex.org/works?search=${encodeURIComponent(searchTerm)}&per_page=5`;
      const mailto = (typeof process !== 'undefined' && process.env?.VITE_OPENALEX_MAILTO) || 'research@proofresearch.org';

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': `ProofResearch-NoveltyAgent/1.0 (mailto:${mailto})`
        }
      });
      clearTimeout(timeoutId);

      const endMs = Date.now();
      const resTime = new Date().toISOString();

      if (response.ok) {
        const data = await response.json();
        if (data.results && Array.isArray(data.results)) {
          const mapped: Omit<ResearchQueryResult, 'rank' | 'similarity_score'>[] = data.results.map((item: any) => ({
            id: `openalex-${item.id?.replace('https://openalex.org/', '') || Date.now()}`,
            source: 'OpenAlex' as ResearchSourceId,
            source_status: 'LIVE' as ResearchSourceStatus,
            external_id: item.id || '',
            title: item.title || item.display_name || 'Untitled OpenAlex Publication',
            authors: (item.authorships || []).map((a: any) => a.author?.display_name || 'Unknown Author').slice(0, 4),
            publication_date: item.publication_date || item.publication_year?.toString() || '2025',
            url: item.doi || item.id || 'https://openalex.org',
            abstract_or_summary: item.abstract || `Scholarly work indexed in OpenAlex under ${item.primary_topic?.display_name || 'General Field'}.`,
            overlap_summary: '',
            difference_summary: '',
            matched_concepts: (item.concepts || []).map((c: any) => c.display_name).slice(0, 5),
            metadata: {
              doi: item.doi,
              cited_by_count: item.cited_by_count,
              topic: item.primary_topic?.display_name
            }
          }));

          return {
            status: 'LIVE',
            results: mapped,
            responseTimeMs: endMs - startMs,
            requestTimestamp: reqTime,
            responseTimestamp: resTime
          };
        }
      }

      return {
        status: 'UNAVAILABLE',
        results: [],
        responseTimeMs: endMs - startMs,
        requestTimestamp: reqTime,
        responseTimestamp: resTime,
        errorMessage: `OpenAlex HTTP ${response.status}: ${response.statusText}`
      };
    } catch (err: any) {
      const endMs = Date.now();
      return {
        status: 'UNAVAILABLE',
        results: [],
        responseTimeMs: endMs - startMs,
        requestTimestamp: reqTime,
        responseTimestamp: new Date().toISOString(),
        errorMessage: err.name === 'AbortError' ? 'OpenAlex API request timed out (5s)' : (err.message || 'OpenAlex API unreachable')
      };
    }
  }
};
