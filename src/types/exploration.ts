export type MilestoneType = 'DELIVERABLE' | 'EXPLORATION';

export type ResearchOutcome = 'SUCCESS' | 'NEGATIVE_RESULT' | 'INCONCLUSIVE';

export interface ExplorationSubmission {
  id: string;
  project_id: string;
  milestone_id: string;
  contributor_id: string;
  research_question: string;
  hypothesis: string;
  methodology: string;
  experiments_performed: string;
  results_summary: string;
  research_outcome: ResearchOutcome;
  negative_findings?: string;
  lessons_learned?: string;
  limitations?: string;
  recommended_next_step?: string;
  review_status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  reviewed_by?: string;
  reviewed_at?: string;
  reviewer_notes?: string;
  ledger_entry_id?: string;
  created_at: string;
  contributor_name?: string;
  milestone_title?: string;
}

export interface ExplorationReviewResult {
  submission: ExplorationSubmission;
  milestoneStatus: 'ACCEPTED' | 'REJECTED';
  escrowStatus: 'LOCKED_IN_ESCROW' | 'RELEASED';
  rewardAllocated: boolean;
  ledgerAction: string;
  documentedEffortVerified: boolean;
}
