import { ResearchSourceAdapter, SourceQueryParams, SourceSearchResponse } from './sourceAdapter';
import { ResearchSourceId, ResearchSourceStatus, ResearchQueryResult } from '../../../types';

export const CrossrefResearchSource: ResearchSourceAdapter = {
  sourceId: 'Crossref' as ResearchSourceId,
  displayName: 'Crossref Metadata Search',
  isLive: true,

  async search(query: SourceQueryParams): Promise<SourceSearchResponse> {
    const startMs = Date.now();
    const reqTime = new Date().toISOString();
    const searchTerm = query.concepts.slice(0, 3).join(' ') || query.title;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const mailto = (typeof process !== 'undefined' && process.env?.VITE_CROSSREF_MAILTO) || 'research@proofresearch.org';
      const url = `https://api.crossref.org/works?query=${encodeURIComponent(searchTerm)}&rows=5`;

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
        const items = data.message?.items;

        if (items && Array.isArray(items)) {
          const mapped: Omit<ResearchQueryResult, 'rank' | 'similarity_score'>[] = items.map((item: any) => {
            const doi = item.DOI || '';
            const authorsList = (item.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean);

            return {
              id: `crossref-${doi || Date.now()}`,
              source: 'Crossref' as ResearchSourceId,
              source_status: 'LIVE' as ResearchSourceStatus,
              external_id: doi,
              title: Array.isArray(item.title) ? item.title[0] : (item.title || 'Untitled Crossref Article'),
              authors: authorsList.length > 0 ? authorsList.slice(0, 4) : ['Crossref Publisher Author'],
              publication_date: item.created?.['date-time']?.slice(0, 10) || item.published?.['date-parts']?.[0]?.join('-') || '2025',
              url: item.URL || (doi ? `https://doi.org/${doi}` : 'https://crossref.org'),
              abstract_or_summary: item.abstract?.replace(/<[^>]*>/g, '') || `Article published in ${item['container-title']?.[0] || 'Peer-reviewed Journal'}.`,
              overlap_summary: '',
              difference_summary: '',
              matched_concepts: (item.subject || []).slice(0, 5),
              metadata: {
                doi,
                publisher: item.publisher,
                journal: item['container-title']?.[0]
              }
            };
          });

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
        errorMessage: `Crossref HTTP ${response.status}: ${response.statusText}`
      };
    } catch (err: any) {
      const endMs = Date.now();
      return {
        status: 'UNAVAILABLE',
        results: [],
        responseTimeMs: endMs - startMs,
        requestTimestamp: reqTime,
        responseTimestamp: new Date().toISOString(),
        errorMessage: err.name === 'AbortError' ? 'Crossref API request timed out (5s)' : (err.message || 'Crossref API unreachable')
      };
    }
  }
};
