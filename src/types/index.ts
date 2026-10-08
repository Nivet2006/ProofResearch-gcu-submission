export * from './novelty';
export * from './exit';
export * from './sponsorSilence';
export * from './exploration';
export * from './expertVerification';
export type UserRole = 'SPONSOR' | 'EXPERT' | 'STUDENT' | 'ADMIN';


export type EngagementModel = 'FUNDED' | 'STIPEND' | 'KNOWLEDGE_SHARING' | 'INSTITUTIONAL_CREDIT';

export type ProjectStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';

export type ConfidentialityLevel = 'PUBLIC' | 'MEDIUM' | 'HIGH';

export type MemberStatus = 'PENDING' | 'ACTIVE' | 'LEFT' | 'REMOVED';

export type MilestoneStatus = 'PENDING_HUMAN_APPROVAL' | 'ACTIVE' | 'SUBMITTED' | 'ACCEPTED';

export type ContributionType = 'DATASET' | 'CODE' | 'ANALYSIS' | 'REPORT' | 'REVIEW';

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'FLAGGED' | 'REJECTED';

export type EscrowStatus = 'LOCKED_IN_ESCROW' | 'RELEASED' | 'REFUNDED';

export type IntegrityStatus = 'CLEAN' | 'REQUIRES_HUMAN_REVIEW' | 'REJECTED';

export type CredentialType = 'CO_AUTHORSHIP' | 'CERTIFICATE' | 'REPUTATION_BADGE' | 'RECOMMENDATION';

export type BlockchainAnchorStatus = 'UNANCHORED' | 'PENDING' | 'VALID' | 'TAMPER_DETECTED' | 'TRANSACTION_FAILED';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  institution?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  title: string;
  public_summary: string;
  engagement_model: EngagementModel;
  budget: number;
  currency: string;
  status: ProjectStatus;
  created_by: string;
  confidentiality_level: ConfidentialityLevel;
  created_at?: string;
  updated_at?: string;
  sponsor_profile?: UserProfile;
}

export interface ProjectConfidential {
  id: string;
  project_id: string;
  confidential_brief: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: UserRole;
  status: MemberStatus;
  joined_at?: string;
  profile?: UserProfile;
}

export interface RewardSplit {
  platformFeePercent: number;
  aiComputeReservePercent: number;
  expertSharePercent: number;
  studentPoolPercent: number;
  reservePercent: number;
}

export interface Charter {
  id: string;
  project_id: string;
  version: string;
  status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED';
  engagement_model: EngagementModel;
  stipend_amount?: number;
  institutional_credit_terms?: string;
  institution_name?: string;
  eligibility_terms?: string;
  time_commitment_terms?: string;
  license_terms?: string;
  embargo_terms?: string;
  data_sensitivity_terms?: string;
  permitted_ai_tools?: string[];
  clawback_terms?: string;
  reward_terms: {
    expert_share: number;
    student_pool: number;
    ai_reserve: number;
    platform: number;
    reserve: number;
    platformFeePercent?: number;
    aiComputeReservePercent?: number;
    expertSharePercent?: number;
    studentPoolPercent?: number;
    reservePercent?: number;
  };
  reward_split?: RewardSplit;
  scope: string;
  deliverables: string[];
  acceptance_criteria: string;
  ip_terms: string;
  publication_terms: string;
  confidentiality_terms: string;
  credit_terms: string;
  exit_terms: string;
  dispute_terms: string;
  commercialisation_terms: string;
  created_at?: string;
}

export interface CharterAcceptance {
  id: string;
  charter_id: string;
  project_id: string;
  user_id: string;
  charter_version?: string;
  engagement_model?: EngagementModel;
  model_acknowledged?: boolean;
  accepted_at: string;
  acceptance_hash: string;
}

export interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string;
  required_skills: string[];
  deliverables: string[];
  acceptance_criteria: string;
  budget: number;
  status: MilestoneStatus;
  ai_generated: boolean;
  human_approved: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AIAction {
  id: string;
  project_id: string;
  human_owner_id: string;
  action_type: string;
  input_reference?: string;
  output_reference?: string;
  tools_used: string[];
  data_scope: string;
  approval_required: boolean;
  approved_by?: string;
  approved_at?: string;
  created_at?: string;
  human_owner?: UserProfile;
}

export interface AIDeclaration {
  ai_used: boolean;
  ai_tool?: string;
  ai_purpose?: string;
  ai_description?: string;
  ai_declared_at?: string;
}

export interface Contribution {
  id: string;
  project_id: string;
  milestone_id: string;
  user_id: string;
  type: ContributionType;
  description: string;
  ai_assisted: boolean;
  ai_tool?: string;
  ai_purpose?: string;
  ai_description?: string;
  ai_declared_at?: string;
  ai_action_id?: string;
  impact_score: number;
  review_status: ReviewStatus;
  reviewer_id?: string;
  artifact_hash: string;
  created_at?: string;
  profile?: UserProfile;
  evidence?: EvidenceItem[];
}

export interface EvidenceItem {
  id: string;
  project_id: string;
  contribution_id: string;
  title: string;
  description: string;
  source_type: 'FILE' | 'GIT' | 'DATASET' | 'URL';
  source_reference: string;
  content_hash: string;
  created_by: string;
  created_at?: string;
}

export interface Submission {
  id: string;
  project_id: string;
  milestone_id: string;
  submitted_by: string;
  title: string;
  content: string;
  content_hash: string;
  similarity_score: number;
  integrity_status: IntegrityStatus;
  created_at?: string;
  submitter_profile?: UserProfile;
}

export interface Review {
  id: string;
  submission_id: string;
  reviewer_id: string;
  decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUIRED';
  reason: string;
  reviewed_at?: string;
  reviewer_profile?: UserProfile;
}

export interface EscrowAccount {
  id: string;
  project_id: string;
  milestone_id: string;
  amount: number;
  currency: string;
  status: EscrowStatus;
  funded_at?: string;
  released_at?: string;
}

export interface RewardAllocation {
  id: string;
  project_id: string;
  milestone_id: string;
  user_id: string;
  role: string;
  base_share: number;
  contribution_weight: number;
  final_amount: number;
  reward_type: 'MONETARY' | 'CREDENTIAL';
  explanation: string;
  created_at?: string;
  recipient_profile?: UserProfile;
}

export interface CandidateProfile {
  id: string;
  user_id: string;
  skills: string[];
  experience_score: number;
  availability_score: number;
  research_interest: string;
  verification_level: string;
  identity_hash?: string;
  profile?: UserProfile;
}

export interface AccessLog {
  id: string;
  user_id: string;
  project_id: string;
  artifact_id: string;
  artifact_type: 'CONFIDENTIAL_BRIEF' | 'SUBMISSION' | 'CONTRIBUTION_EVIDENCE' | 'DATASET' | 'CODE_ARTIFACT';
  action: 'VIEW' | 'DOWNLOAD' | 'EXPORT';
  ip_address?: string;
  user_agent?: string;
  created_at?: string;
}

export interface COIDeclaration {
  id: string;
  user_id: string;
  project_id: string;
  has_conflict: boolean;
  conflict_details?: string;
  status: 'DECLARED' | 'REVIEWED' | 'CLEARED';
  declared_at?: string;
}

export type RequirementCategory = 
  | 'SKILL' 
  | 'TECHNOLOGY' 
  | 'DOMAIN' 
  | 'EXPERIENCE' 
  | 'ACHIEVEMENT' 
  | 'AVAILABILITY' 
  | 'EDUCATION' 
  | 'CERTIFICATION' 
  | 'RESEARCH_INTEREST' 
  | 'CUSTOM';

export type RequirementImportance = 'REQUIRED' | 'PREFERRED' | 'OPTIONAL';

export type MatchingMethod = 
  | 'EXACT' 
  | 'SEMANTIC' 
  | 'DOMAIN_AFFINITY' 
  | 'FRAMEWORK_AFFINITY' 
  | 'NUMERIC_THRESHOLD' 
  | 'BOOLEAN' 
  | 'RANGE' 
  | 'CUSTOM';

export type RequirementSetStatus = 
  | 'DRAFT' 
  | 'AI_PROPOSED' 
  | 'PENDING_EXPERT_REVIEW' 
  | 'CHANGES_REQUESTED' 
  | 'APPROVED' 
  | 'SUPERSEDED' 
  | 'ARCHIVED';

export interface MatchingRequirement {
  id: string;
  requirement_set_id: string;
  name: string;
  description?: string;
  category: RequirementCategory;
  weight: number; // 0 to 100
  importance: RequirementImportance;
  matching_method: MatchingMethod;
  metadata?: Record<string, any>;
  sort_order?: number;
  created_at?: string;
}

export interface MatchingRequirementSet {
  id: string;
  project_id: string;
  version: string;
  status: RequirementSetStatus;
  created_by: string;
  proposed_by?: string;
  approved_by?: string;
  created_at?: string;
  approved_at?: string;
  created_from_ai?: boolean;
  change_reason?: string;
  previous_version_id?: string;
  requirements?: MatchingRequirement[];
}

export interface RequirementEvaluationResult {
  requirementId: string;
  requirementName: string;
  category: RequirementCategory;
  weight: number;
  score: number; // 0 to 100
  weightedScore: number;
  status: 'MATCHED' | 'PARTIAL' | 'MISSING';
  evidence: string;
  explanation: string;
}

export interface MatchingResult {
  id: string;
  project_id: string;
  requirement_set_id?: string;
  requirement_set_version?: string;
  candidate_id: string;
  skill_score: number;
  experience_score: number;
  availability_score: number;
  interest_score: number;
  match_score: number;
  weights?: {
    skills: number;
    experience: number;
    availability: number;
    researchInterest: number;
  };
  matched_skills?: string[];
  missing_skills?: string[];
  evaluations?: RequirementEvaluationResult[];
  explanation: string;
  created_at?: string;
  candidate_profile?: CandidateProfile;
}

export interface Credential {
  id: string;
  project_id: string;
  user_id: string;
  credential_type: CredentialType;
  title: string;
  description: string;
  issued_at?: string;
}

export interface LedgerEntry {
  id: string;
  project_id: string;
  sequence_number: number;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, any>;
  previous_hash: string;
  current_hash: string;
  created_at: string;
  actor_profile?: UserProfile;
}

export interface VerificationResult {
  isValid: boolean;
  brokenSequenceNumber?: number;
  brokenEntryId?: string;
  reason?: string;
  expectedHash?: string;
  actualHash?: string;
  totalEntries: number;
}

export interface BlockchainAnchor {
  id: string;
  project_id: string;
  network: string;
  tx_hash: string;
  block_number: number;
  anchored_checkpoint: string;
  anchored_sequence: number;
  anchored_at: string;
  explorer_url: string;
}

export interface BlockchainVerificationResult {
  status: BlockchainAnchorStatus;
  isValid: boolean;
  network?: string;
  txHash?: string;
  blockNumber?: number;
  postgresqlCheckpoint?: string;
  blockchainCheckpoint?: string;
  anchoredAt?: string;
  explorerUrl?: string;
  reason?: string;
}
