export type NoveltyAssessmentStatus = 'NOT_CHECKED' | 'CHECKING' | 'COMPLETED' | 'CHECK_FAILED' | 'SUPERSEDED';

export type NoveltyHumanDecision =
  | 'SUFFICIENTLY_DIFFERENTIATED'
  | 'REQUIRES_REFINEMENT'
  | 'SIMILARITY_REQUIRES_FURTHER_REVIEW';

export type NoveltyOverlapBand = 'LOW_OVERLAP' | 'MODERATE_OVERLAP' | 'HIGH_OVERLAP' | 'REVIEW_RECOMMENDED';

export type ResearchSourceId = 'ProofResearch' | 'NDLI' | 'OpenAlex' | 'Crossref' | 'arXiv' | 'PubMed';

export type ResearchSourceStatus = 'LIVE' | 'MOCK' | 'UNAVAILABLE';

export interface ComponentScores {
  domain?: number;
  problem?: number;
  methodology?: number;
  technology?: number;
  dataset?: number;
  objective?: number;
}

export interface ResearchQueryResult {
  id: string;
  assessment_id?: string;
  source: ResearchSourceId;
  source_status: ResearchSourceStatus;
  external_id: string;
  title: string;
  authors: string[];
  publication_date: string;
  url: string;
  abstract_or_summary: string;
  similarity_score: number; // 0 to 100
  overlap_summary: string;
  difference_summary: string;
  matched_concepts: string[];
  component_scores?: ComponentScores;
  metadata?: Record<string, any>;
  rank: number;
}

export interface SourceSearchSummary {
  name: ResearchSourceId;
  displayName: string;
  status: ResearchSourceStatus;
  resultCount: number;
  responseTimeMs?: number;
  errorMessage?: string;
  requestTimestamp?: string;
  responseTimestamp?: string;
}

export interface ResearchNoveltyAssessment {
  id: string;
  project_id?: string;
  project_content_hash: string;
  status: NoveltyAssessmentStatus;
  query_hash: string;
  query_text: string;
  sources_searched: SourceSearchSummary[];
  result_count: number;
  highest_similarity: number;
  overlap_band: NoveltyOverlapBand;
  assessment_summary: string;
  why_similar: string;
  what_different: string;
  human_decision?: NoveltyHumanDecision;
  human_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  model_name: string;
  model_version: string;
  similarity_algorithm_version: string;
  search_started_at: string;
  search_completed_at?: string;
  created_at: string;
  results: ResearchQueryResult[];
}
