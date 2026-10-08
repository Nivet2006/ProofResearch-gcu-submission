export interface StudentExitRecord {
  id: string;
  project_id: string;
  user_id: string;
  charter_version: string;
  reason: string;
  accepted_contributions_count: number;
  accepted_contribution_score: number;
  pro_rata_share: number; // e.g. 0.6071
  percentage_share: number; // e.g. 60.71
  reward_amount: number; // e.g. 6071.43
  reward_status: 'NOT_APPLICABLE' | 'PENDING_ESCROW_RELEASE' | 'RELEASED';
  access_revoked: boolean;
  ledger_entry_id?: string;
  exited_at: string;
  student_name?: string;
  project_title?: string;
}

export interface StudentExitSummaryResult {
  exitRecord: StudentExitRecord;
  priorContributionsPreserved: boolean;
  credentialsPreserved: boolean;
  ledgerIntact: boolean;
}
