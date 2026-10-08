// ─── Expert Verification Types ────────────────────────────────────────────────

export type ExpertApplicationStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'NEEDS_MORE_EVIDENCE'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type ExpertTier =
  | 'GOVERNMENT_EXPERT'
  | 'ACADEMIC_EXPERT'
  | 'PRACTITIONER_EXPERT'
  | 'DOMAIN_REVIEWER';

export type EvidenceCategory =
  | 'PHD_CERTIFICATE'
  | 'PUBLICATION_LIST'
  | 'PATENT_DOCUMENT'
  | 'INSTITUTIONAL_ID'
  | 'EMPLOYMENT_PROOF'
  | 'GOVERNMENT_EMPANELMENT'
  | 'PROFESSIONAL_REFERENCE'
  | 'EXPERIENCE_LETTER'
  | 'OTHER';

export type EvidenceVerificationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type ReviewVote = 'APPROVE' | 'REJECT' | 'REQUEST_MORE_EVIDENCE';

export type ExpertLedgerAction =
  | 'EXPERT_APPLICATION_SUBMITTED'
  | 'EXPERT_EVIDENCE_UPLOADED'
  | 'EXPERT_EVIDENCE_REVIEWED'
  | 'EXPERT_APPLICATION_APPROVED'
  | 'EXPERT_APPLICATION_REJECTED'
  | 'EXPERT_BADGE_GRANTED'
  | 'EXPERT_BADGE_SUSPENDED'
  | 'EXPERT_MORE_EVIDENCE_REQUESTED';

// ─── Application ──────────────────────────────────────────────────────────────

export interface ExpertApplication {
  id: string;
  user_id: string;
  status: ExpertApplicationStatus;

  // Personal / professional info
  full_name: string;
  current_role_title: string;
  institution: string;
  primary_domain: string;
  secondary_domains: string[];
  years_of_experience: number;
  highest_qualification: string;
  publication_count: number;
  patent_count: number;
  government_empanelled: boolean;
  reference_contacts: string;       // JSON-encoded list of {name, contact}
  expertise_statement: string;

  // Computed at submission
  preliminary_score: number;        // 0–100 deterministic rule-based
  preliminary_tier: ExpertTier | null;

  // Admin fields
  assigned_to: string | null;       // admin user_id
  final_tier: ExpertTier | null;
  verified_domains: string[];
  admin_notes: string;
  approved_by: string | null;       // admin user_id
  approved_at: string | null;
  evidence_reviewed_count: number;

  created_at: string;
  updated_at: string;

  // Joined
  applicant_profile?: { full_name: string; email: string; role: string };
  evidence?: ExpertEvidence[];
  reviews?: ExpertReview[];
  badge?: ExpertBadge | null;
}

// ─── Evidence Document ────────────────────────────────────────────────────────

export interface ExpertEvidence {
  id: string;
  application_id: string;
  uploader_id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  category: EvidenceCategory;
  content_hash: string;             // SHA-256 of file content
  verification_status: EvidenceVerificationStatus;
  admin_notes: string;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

// ─── Review Vote ──────────────────────────────────────────────────────────────

export interface ExpertReview {
  id: string;
  application_id: string;
  reviewer_id: string;
  vote: ReviewVote;
  confidence_score: number;         // 0–100 reviewer's confidence
  notes: string;
  created_at: string;
  reviewer_profile?: { full_name: string; email: string };
}

// ─── Verified Badge ───────────────────────────────────────────────────────────

export interface ExpertBadge {
  id: string;
  user_id: string;
  application_id: string;
  tier: ExpertTier;
  verified_domains: string[];
  approved_by: string;
  approved_at: string;
  evidence_reviewed_count: number;
  is_active: boolean;
  suspended_at: string | null;
  suspension_reason: string | null;
  admin_profile?: { full_name: string; email: string };
}

// ─── Scoring Result ───────────────────────────────────────────────────────────

export interface ScoringBreakdown {
  government_empanelment: number;
  phd_qualification: number;
  years_experience: number;
  publications: number;
  patents: number;
  institutional_affiliation: number;
  references: number;
  total: number;
  tier: ExpertTier;
  tier_label: string;
}
