import { ResearchSourceId, ResearchSourceStatus, ResearchQueryResult } from '../../../types';

export interface SourceQueryParams {
  title: string;
  publicSummary: string;
  concepts: string[];
  targetProjectId?: string;
}

export interface SourceSearchResponse {
  status: ResearchSourceStatus;
  results: Omit<ResearchQueryResult, 'rank' | 'similarity_score'>[];
  responseTimeMs?: number;
  requestTimestamp?: string;
  responseTimestamp?: string;
  errorMessage?: string;
}

export interface ResearchSourceAdapter {
  sourceId: ResearchSourceId;
  displayName: string;
  isLive: boolean; // Indicates whether adapter communicates with live endpoints
  search(query: SourceQueryParams): Promise<SourceSearchResponse>;
}
