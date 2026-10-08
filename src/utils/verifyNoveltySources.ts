import { ALL_RESEARCH_SOURCES } from '../services/novelty/sources';
import { SourceSearchSummary } from '../types/novelty';

export interface SourceDiagnosticReport {
  timestamp: string;
  totalSourcesTested: number;
  liveSourcesCount: number;
  unavailableSourcesCount: number;
  summaries: SourceSearchSummary[];
}

/**
 * Diagnostic utility to execute live health & search verification across all 5 novelty sources.
 * Never fakes live status; reports true runtime HTTP execution metrics.
 */
export async function verifyNoveltySources(
  testTitle = 'AI-based diabetic retinopathy detection using smartphone retinal images',
  testSummary = 'Developing a lightweight deep learning pipeline for low-cost diabetic retinopathy screening on mobile edge devices.'
): Promise<SourceDiagnosticReport> {
  const concepts = ['diabetic retinopathy', 'retinal imaging', 'edge AI', 'mobile screening'];
  const summaries: SourceSearchSummary[] = [];

  console.log('--------------------------------------------------');
  console.log('PROOFRESEARCH NOVELTY SOURCES LIVE DIAGNOSTIC');
  console.log('--------------------------------------------------');

  for (const adapter of ALL_RESEARCH_SOURCES) {
    try {
      const response = await adapter.search({
        title: testTitle,
        publicSummary: testSummary,
        concepts
      });

      const summary: SourceSearchSummary = {
        name: adapter.sourceId,
        displayName: adapter.displayName,
        status: response.status,
        resultCount: response.results.length,
        responseTimeMs: response.responseTimeMs,
        requestTimestamp: response.requestTimestamp,
        responseTimestamp: response.responseTimestamp,
        errorMessage: response.errorMessage
      };

      summaries.push(summary);

      const symbol = response.status === 'LIVE' ? '✓ LIVE       ' : response.status === 'MOCK' ? 'ℹ MOCK DEMO  ' : '⚠ UNAVAILABLE';
      const timeStr = response.responseTimeMs ? `${response.responseTimeMs}ms`.padStart(7) : '  ---ms';
      const countStr = `${response.results.length} results`.padStart(10);
      const nameStr = adapter.sourceId.padEnd(14);

      console.log(`${nameStr} ${symbol} ${timeStr}   ${countStr}`);
      if (response.errorMessage) {
        console.log(`               Notice: ${response.errorMessage}`);
      }
    } catch (err: any) {
      summaries.push({
        name: adapter.sourceId,
        displayName: adapter.displayName,
        status: 'UNAVAILABLE',
        resultCount: 0,
        errorMessage: err.message || 'Verification call failed'
      });

      console.log(`${adapter.sourceId.padEnd(14)} ⚠ UNAVAILABLE    ---ms    0 results`);
      console.log(`               Error: ${err.message}`);
    }
  }

  console.log('--------------------------------------------------');

  const liveSourcesCount = summaries.filter(s => s.status === 'LIVE' || s.status === 'MOCK').length;
  const unavailableSourcesCount = summaries.filter(s => s.status === 'UNAVAILABLE').length;

  return {
    timestamp: new Date().toISOString(),
    totalSourcesTested: ALL_RESEARCH_SOURCES.length,
    liveSourcesCount,
    unavailableSourcesCount,
    summaries
  };
}
