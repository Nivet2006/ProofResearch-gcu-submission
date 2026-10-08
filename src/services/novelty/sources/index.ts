import { ResearchSourceAdapter } from './sourceAdapter';
import { ProofResearchSource } from './ProofResearchSource';
import { NDLIResearchSource } from './NDLIResearchSource';
import { OpenAlexResearchSource } from './OpenAlexResearchSource';
import { CrossrefResearchSource } from './CrossrefResearchSource';
import { ArxivResearchSource } from './ArxivResearchSource';

export * from './sourceAdapter';
export * from './ProofResearchSource';
export * from './NDLIResearchSource';
export * from './OpenAlexResearchSource';
export * from './CrossrefResearchSource';
export * from './ArxivResearchSource';

export const ALL_RESEARCH_SOURCES: ResearchSourceAdapter[] = [
  ProofResearchSource,
  NDLIResearchSource,
  OpenAlexResearchSource,
  CrossrefResearchSource,
  ArxivResearchSource
];

export function getSourcesForDomain(domain?: string): ResearchSourceAdapter[] {
  // Domain aware source selection per requirement 9
  return ALL_RESEARCH_SOURCES;
}
