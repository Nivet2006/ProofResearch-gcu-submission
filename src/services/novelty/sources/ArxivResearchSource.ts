import { ResearchSourceAdapter, SourceQueryParams, SourceSearchResponse } from './sourceAdapter';
import { ResearchSourceId, ResearchSourceStatus, ResearchQueryResult } from '../../../types';

/**
 * Parses arXiv Atom XML response into structured results.
 * Works seamlessly in both Browser (DOMParser) and Node/Vite environments.
 */
function parseArxivXml(xmlText: string): Omit<ResearchQueryResult, 'rank' | 'similarity_score'>[] {
  const results: Omit<ResearchQueryResult, 'rank' | 'similarity_score'>[] = [];

  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const entries = xmlDoc.getElementsByTagName('entry');

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const id = entry.getElementsByTagName('id')[0]?.textContent?.trim() || '';
        const rawTitle = entry.getElementsByTagName('title')[0]?.textContent?.trim() || 'Untitled arXiv Paper';
        const title = rawTitle.replace(/\s+/g, ' ');
        const summary = entry.getElementsByTagName('summary')[0]?.textContent?.trim() || '';
        const published = entry.getElementsByTagName('published')[0]?.textContent?.trim() || '';

        const authorNodes = entry.getElementsByTagName('author');
        const authors: string[] = [];
        for (let j = 0; j < authorNodes.length; j++) {
          const name = authorNodes[j].getElementsByTagName('name')[0]?.textContent?.trim();
          if (name) authors.push(name);
        }

        const categoryNodes = entry.getElementsByTagName('category');
        const categories: string[] = [];
        for (let k = 0; k < categoryNodes.length; k++) {
          const term = categoryNodes[k].getAttribute('term');
          if (term) categories.push(term);
        }

        const cleanId = id.replace('http://arxiv.org/abs/', '').replace('https://arxiv.org/abs/', '');

        results.push({
          id: `arxiv-${cleanId || Date.now()}-${i}`,
          source: 'arXiv' as ResearchSourceId,
          source_status: 'LIVE' as ResearchSourceStatus,
          external_id: cleanId,
          title,
          authors: authors.length > 0 ? authors.slice(0, 4) : ['arXiv Author'],
          publication_date: published.slice(0, 10) || '2025',
          url: id.startsWith('http') ? id : `https://arxiv.org/abs/${cleanId}`,
          abstract_or_summary: summary.replace(/\s+/g, ' ').slice(0, 400),
          overlap_summary: '',
          difference_summary: '',
          matched_concepts: categories.slice(0, 5),
          metadata: { arxiv_id: cleanId, categories }
        });
      }
      return results;
    } catch (e) {
      console.warn('DOMParser failed for arXiv XML, using regex fallback:', e);
    }
  }

  // Fallback Regex XML Extractor for Node/headless test runner
  const entryMatches = xmlText.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  entryMatches.forEach((entryXml, idx) => {
    const idMatch = entryXml.match(/<id>([\s\S]*?)<\/id>/i);
    const titleMatch = entryXml.match(/<title>([\s\S]*?)<\/title>/i);
    const summaryMatch = entryXml.match(/<summary>([\s\S]*?)<\/summary>/i);
    const publishedMatch = entryXml.match(/<published>([\s\S]*?)<\/published>/i);

    const authorMatches = [...entryXml.matchAll(/<name>([\s\S]*?)<\/name>/gi)].map(m => m[1].trim());
    const id = idMatch ? idMatch[1].trim() : '';
    const cleanId = id.replace(/^https?:\/\/arxiv\.org\/abs\//i, '');

    results.push({
      id: `arxiv-${cleanId || Date.now()}-${idx}`,
      source: 'arXiv' as ResearchSourceId,
      source_status: 'LIVE' as ResearchSourceStatus,
      external_id: cleanId,
      title: titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Untitled arXiv Paper',
      authors: authorMatches.length > 0 ? authorMatches.slice(0, 4) : ['arXiv Author'],
      publication_date: publishedMatch ? publishedMatch[1].slice(0, 10) : '2025',
      url: id.startsWith('http') ? id : `https://arxiv.org/abs/${cleanId}`,
      abstract_or_summary: summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim().slice(0, 400) : '',
      overlap_summary: '',
      difference_summary: '',
      matched_concepts: ['computer-science', 'preprints'],
      metadata: { arxiv_id: cleanId }
    });
  });

  return results;
}

export const ArxivResearchSource: ResearchSourceAdapter = {
  sourceId: 'arXiv' as ResearchSourceId,
  displayName: 'arXiv Preprint Server',
  isLive: true,

  async search(query: SourceQueryParams): Promise<SourceSearchResponse> {
    const startMs = Date.now();
    const reqTime = new Date().toISOString();
    const searchTerm = query.concepts.slice(0, 3).join(' ') || query.title;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(searchTerm)}&start=0&max_results=5`;
      let response: Response;
      try {
        response = await fetch(url, { signal: controller.signal });
      } catch (directErr: any) {
        // If direct fetch fails (e.g. CORS block in browser), attempt via CORS proxy
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          response = await fetch(proxyUrl, { signal: controller.signal });
        } catch (proxyErr) {
          throw directErr;
        }
      }
      clearTimeout(timeoutId);

      const endMs = Date.now();
      const resTime = new Date().toISOString();

      if (response.ok) {
        const xmlText = await response.text();
        const results = parseArxivXml(xmlText);

        return {
          status: 'LIVE',
          results,
          responseTimeMs: endMs - startMs,
          requestTimestamp: reqTime,
          responseTimestamp: resTime
        };
      }

      return {
        status: 'UNAVAILABLE',
        results: [],
        responseTimeMs: endMs - startMs,
        requestTimestamp: reqTime,
        responseTimestamp: resTime,
        errorMessage: `arXiv HTTP ${response.status}: ${response.statusText}`
      };
    } catch (err: any) {
      const endMs = Date.now();
      return {
        status: 'UNAVAILABLE',
        results: [],
        responseTimeMs: endMs - startMs,
        requestTimestamp: reqTime,
        responseTimestamp: new Date().toISOString(),
        errorMessage: err.name === 'AbortError' ? 'arXiv API request timed out (5s)' : (err.message || 'arXiv API unreachable')
      };
    }
  }
};
