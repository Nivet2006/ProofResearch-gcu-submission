import { ResearchSourceAdapter, SourceQueryParams, SourceSearchResponse } from './sourceAdapter';
import { ResearchSourceId, ResearchSourceStatus, ResearchQueryResult } from '../../../types';

export const NDLIResearchSource: ResearchSourceAdapter = {
  sourceId: 'NDLI' as ResearchSourceId,
  displayName: 'National Digital Library of India (NDLI)',
  isLive: false, // Default false until official API credentials/endpoint are configured

  async search(query: SourceQueryParams): Promise<SourceSearchResponse> {
    const startMs = Date.now();
    const reqTime = new Date().toISOString();

    const apiBaseUrl = (typeof process !== 'undefined' && process.env?.VITE_NDLI_API_BASE_URL) || '';
    const apiKey = (typeof process !== 'undefined' && process.env?.VITE_NDLI_API_KEY) || '';

    // If official configured endpoint & credentials exist, execute live authorized request
    if (apiBaseUrl && apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const searchTerm = query.concepts.slice(0, 3).join(' ') || query.title;

        const response = await fetch(`${apiBaseUrl}/search?q=${encodeURIComponent(searchTerm)}`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'User-Agent': 'ProofResearch-NoveltyAgent/1.0'
          }
        });
        clearTimeout(timeoutId);

        const endMs = Date.now();
        const resTime = new Date().toISOString();

        if (response.ok) {
          const data = await response.json();
          const items = data.result || data.docs || [];

          const results: Omit<ResearchQueryResult, 'rank' | 'similarity_score'>[] = items.map((item: any, idx: number) => ({
            id: `ndli-${item.id || item.handle || Date.now()}-${idx}`,
            source: 'NDLI' as ResearchSourceId,
            source_status: 'LIVE' as ResearchSourceStatus,
            external_id: item.id || item.handle || `NDLI-${idx}`,
            title: item.title || item.dc_title || 'Untitled NDLI Research Record',
            authors: Array.isArray(item.author || item.dc_contributor_author)
              ? (item.author || item.dc_contributor_author).slice(0, 4)
              : [item.author || item.dc_contributor_author || 'NDLI Contributor'],
            publication_date: item.date || item.publication_year || '2025',
            url: item.url || (item.handle ? `https://ndl.iitkgp.ac.in/handle/${item.handle}` : 'https://ndl.iitkgp.ac.in/'),
            abstract_or_summary: item.abstract || item.dc_description || 'Institutional thesis/paper aggregated by National Digital Library of India.',
            overlap_summary: '',
            difference_summary: '',
            matched_concepts: ['NDLI', 'national-repository'],
            metadata: {
              institution: item.institution || 'IIT Kharagpur / NDLI',
              resource_type: item.type || 'Research Record',
              language: item.language || 'English',
              access_type: item.access_type || 'Open Access'
            }
          }));

          return {
            status: 'LIVE',
            results,
            responseTimeMs: endMs - startMs,
            requestTimestamp: reqTime,
            responseTimestamp: resTime
          };
        }
      } catch (err: any) {
        // Fall through to structured UNAVAILABLE response
      }
    }

    const endMs = Date.now();
    return {
      status: 'UNAVAILABLE',
      results: [],
      responseTimeMs: endMs - startMs,
      requestTimestamp: reqTime,
      responseTimestamp: new Date().toISOString(),
      errorMessage: 'Current public documentation is insufficient to verify a supported third-party API. Access requires official registration from IIT Kharagpur (support@ndl.gov.in).'
    };
  }
};
