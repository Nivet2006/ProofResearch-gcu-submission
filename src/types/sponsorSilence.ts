export type AcceptanceTimeoutPolicy = 'AUTO_ACCEPT' | 'MEDIATOR';

export type MediationCaseStatus = 'PENDING' | 'RESOLVED_ACCEPTED' | 'RESOLVED_REJECTED';

export interface MediationCase {
  id: string;
  project_id: string;
  milestone_id: string;
  sponsor_id: string;
  policy: AcceptanceTimeoutPolicy;
  reason: string;
  status: MediationCaseStatus;
  mediator_id?: string;
  mediator_decision?: 'ACCEPT' | 'REJECT';
  mediator_notes?: string;
  escrow_amount: number;
  ledger_entry_id?: string;
  created_at: string;
  resolved_at?: string;
  deliverables?: string[];
  acceptance_criteria?: string;
  project_title?: string;
  milestone_title?: string;
}

export interface SponsorSilenceProcessResult {
  milestoneId: string;
  previousStatus: string;
  newStatus: string;
  policy: AcceptanceTimeoutPolicy;
  escrowStatus: 'LOCKED_IN_ESCROW' | 'RELEASED';
  mediationCase?: MediationCase;
  rewardAllocated: boolean;
  ledgerAction: string;
}
