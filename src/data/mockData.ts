import {
  UserProfile,
  Project,
  ProjectConfidential,
  Charter,
  Milestone,
  CandidateProfile,
  MatchingResult,
  Contribution,
  EvidenceItem,
  Submission,
  Review,
  EscrowAccount,
  RewardAllocation,
  Credential,
  LedgerEntry
} from '../types';
import { computeSHA256 } from '../lib/hash';

// Pre-seeded Users
export const MOCK_USERS: UserProfile[] = [
  {
    id: 'u1111111-1111-1111-1111-111111111111',
    email: 'sponsor@medvision.io',
    full_name: 'MedVision Labs (Dr. Vikram Seth)',
    role: 'SPONSOR',
    institution: 'MedVision AI Research Institute',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'u2222222-2222-2222-2222-222222222222',
    email: 'ananya@research.edu',
    full_name: 'Dr. Ananya Rao',
    role: 'EXPERT',
    institution: 'IIT Department of Computer Science',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'u3333333-3333-3333-3333-333333333333',
    email: 'rahul@student.edu',
    full_name: 'Rahul Sharma',
    role: 'STUDENT',
    institution: 'National Institute of Technology',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'u4444444-4444-4444-4444-444444444444',
    email: 'priya@student.edu',
    full_name: 'Priya Patel',
    role: 'STUDENT',
    institution: 'Bits Pilani AI Research Club',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'u9999999-9999-9999-9999-999999999999',
    email: 'admin@proofresearch.org',
    full_name: 'System Admin',
    role: 'ADMIN',
    institution: 'ProofResearch Governance Board',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80'
  }
];

// Pre-seeded Projects
export const MOCK_PROJECTS: Project[] = [];

// Pre-seeded Project Confidential Records
export const MOCK_PROJECT_CONFIDENTIAL: ProjectConfidential[] = [];

// Pre-seeded Charter v1.0
export const MOCK_CHARTERS: Charter[] = [
  {
    id: 'ch111111-1111-1111-1111-111111111111',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    version: 'v1.0',
    status: 'ACTIVE',
    engagement_model: 'FUNDED',
    reward_terms: {
      expert_share: 0.30,
      student_pool: 0.40,
      ai_reserve: 0.05,
      platform: 0.10,
      reserve: 0.15
    },
    scope: 'Build edge DR detection model pipeline and quantize binary.',
    deliverables: [
      'Pre-processed Fundus Dataset Split (CLAHE applied)',
      'Quantized TFLite Model Binary (<12MB footprint)',
      'Benchmark Test Accuracy Metrics & Memory Profiling Report'
    ],
    acceptance_criteria: 'Model classification accuracy > 88% on held-out test split with under 150ms latency on Raspberry Pi 4.',
    ip_terms: 'Sponsor retains commercial IP rights; Student retains attribution & academic presentation rights.',
    publication_terms: 'arXiv co-authorship granted to primary student contributor upon peer-reviewed milestone acceptance.',
    confidentiality_terms: 'Raw clinical images must remain within the secure project workspace environment.',
    credit_terms: 'Credit & reward pool distributed proportionally based on reviewed expert impact scores (1-10).',
    exit_terms: 'Pro-rata reward retained for accepted past milestones if student withdraws.',
    dispute_terms: 'Binding expert arbitration conducted by assigned domain expert Dr. Ananya Rao.',
    commercialisation_terms: 'Future commercial revenue grants 5% royalty pool to student contributors.',
    created_at: '2026-10-06T09:10:00.000Z'
  }
];

// Pre-seeded Milestones
export const MOCK_MILESTONES: Milestone[] = [
  {
    id: 'm1111111-1111-1111-1111-111111111111',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    title: 'Milestone 1: Dataset Preprocessing & CLAHE Pipeline',
    description: 'Clean raw fundus images, apply CLAHE contrast enhancement, resize to 224x224, and generate train/val/test splits with SHA-256 evidence hashing.',
    required_skills: ['Computer Vision', 'PyTorch', 'Data Preprocessing', 'OpenCV'],
    deliverables: ['Preprocessed Dataset Split (5,000 images)', 'CLAHE Preprocessing Script'],
    acceptance_criteria: 'Dataset split verified with cryptographic hashes; script executes reproducibly under 1.2s per image.',
    budget: 25000.00,
    status: 'ACTIVE',
    ai_generated: true,
    human_approved: true,
    created_at: '2026-10-06T09:15:00.000Z'
  },
  {
    id: 'm2222222-2222-2222-2222-222222222222',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    title: 'Milestone 2: MobileNetV3 Edge Quantization & Inference Engine',
    description: 'Train MobileNetV3 architecture, perform int8 quantization for TFLite runtime, and evaluate latency/accuracy trade-offs.',
    required_skills: ['PyTorch', 'Edge ML', 'TFLite', 'Model Quantization'],
    deliverables: ['Quantized TFLite Model Binary (<12MB)', 'Edge Execution Latency Report'],
    acceptance_criteria: 'Accuracy >= 88%, Memory <= 12MB, Latency <= 150ms on ARMv8 processor.',
    budget: 75000.00,
    status: 'PENDING_HUMAN_APPROVAL',
    ai_generated: true,
    human_approved: false,
    created_at: '2026-10-06T09:15:00.000Z'
  }
];

// Pre-seeded Candidate Profiles
export const MOCK_CANDIDATE_PROFILES: CandidateProfile[] = [
  {
    id: 'c3333333-3333-3333-3333-333333333333',
    user_id: 'u3333333-3333-3333-3333-333333333333',
    skills: ['Computer Vision', 'PyTorch', 'Edge ML', 'OpenCV', 'Python'],
    experience_score: 85.00,
    availability_score: 90.00,
    research_interest: 'Diabetic Retinopathy & Edge AI Optimization',
    verification_level: 'VERIFIED',
    profile: MOCK_USERS[2]
  },
  {
    id: 'c4444444-4444-4444-4444-444444444444',
    user_id: 'u4444444-4444-4444-4444-444444444444',
    skills: ['Data Preprocessing', 'TensorFlow', 'Image Segmentation'],
    experience_score: 78.00,
    availability_score: 85.00,
    research_interest: 'Medical Image Segmentation & Accessibility',
    verification_level: 'VERIFIED',
    profile: MOCK_USERS[3]
  }
];

// Pre-seeded Matching Results
export const MOCK_MATCHING_RESULTS: MatchingResult[] = [
  {
    id: 'mr111111-1111-1111-1111-111111111111',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    candidate_id: 'u3333333-3333-3333-3333-333333333333',
    skill_score: 95.00,
    experience_score: 85.00,
    availability_score: 90.00,
    interest_score: 100.00,
    match_score: 92.50,
    explanation: 'Recommended with 92.5% match because candidate possesses 95% skill fit in Computer Vision & Edge ML, has 90% availability during Milestone 1, and strong research alignment in Medical Image Processing.',
    candidate_profile: MOCK_CANDIDATE_PROFILES[0]
  },
  {
    id: 'mr222222-2222-2222-2222-222222222222',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    candidate_id: 'u4444444-4444-4444-4444-444444444444',
    skill_score: 75.00,
    experience_score: 78.00,
    availability_score: 85.00,
    interest_score: 80.00,
    match_score: 78.10,
    explanation: 'Recommended with 78.1% match with strong background in Data Preprocessing and Medical Image Segmentation.',
    candidate_profile: MOCK_CANDIDATE_PROFILES[1]
  }
];

// Pre-seeded Contributions
export const MOCK_CONTRIBUTIONS: Contribution[] = [
  {
    id: 'ct111111-1111-1111-1111-111111111111',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    milestone_id: 'm1111111-1111-1111-1111-111111111111',
    user_id: 'u3333333-3333-3333-3333-333333333333',
    type: 'CODE',
    description: 'Implemented CLAHE image enhancement pipeline with TFLite pre-processing normalization (224x224 RGB).',
    ai_assisted: true,
    impact_score: 8.50,
    review_status: 'APPROVED',
    reviewer_id: 'u2222222-2222-2222-2222-222222222222',
    artifact_hash: 'a3f890b21c4e7d8f9a2b1c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
    created_at: '2026-10-06T10:15:00.000Z',
    profile: MOCK_USERS[2]
  },
  {
    id: 'ct222222-2222-2222-2222-222222222222',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    milestone_id: 'm1111111-1111-1111-1111-111111111111',
    user_id: 'u4444444-4444-4444-4444-444444444444',
    type: 'DATASET',
    description: 'Annotated 1,200 fundus images for optic disc centering validation.',
    ai_assisted: false,
    impact_score: 5.50,
    review_status: 'APPROVED',
    reviewer_id: 'u2222222-2222-2222-2222-222222222222',
    artifact_hash: 'b4e901c32d5f8e9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a',
    created_at: '2026-10-06T10:30:00.000Z',
    profile: MOCK_USERS[3]
  }
];

// Pre-seeded Evidence Items
export const MOCK_EVIDENCE_ITEMS: EvidenceItem[] = [
  {
    id: 'ev111111-1111-1111-1111-111111111111',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    contribution_id: 'ct111111-1111-1111-1111-111111111111',
    title: 'CLAHE Optimization Source Script',
    description: 'Python PyTorch pre-processing module applying OpenCV CLAHE algorithm to fundus images.',
    source_type: 'GIT',
    source_reference: 'git@github.com:proofresearch/dr-edge-preprocessing.git#commit/a3f890b',
    content_hash: 'a3f890b21c4e7d8f9a2b1c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
    created_by: 'u3333333-3333-3333-3333-333333333333',
    created_at: '2026-10-06T10:16:00.000Z'
  }
];

// Pre-seeded Submissions
export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 's1111111-1111-1111-1111-111111111111',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    milestone_id: 'm1111111-1111-1111-1111-111111111111',
    submitted_by: 'u3333333-3333-3333-3333-333333333333',
    title: 'Milestone 1 Deliverable: Preprocessed Dataset & Pipeline Script',
    content: 'Completed raw image cleaning and CLAHE contrast adjustment. 5,000 fundus images transformed and verified with SHA-256 evidence pointers.',
    content_hash: '9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e',
    similarity_score: 87.00,
    integrity_status: 'REQUIRES_HUMAN_REVIEW',
    created_at: '2026-10-06T11:00:00.000Z',
    submitter_profile: MOCK_USERS[2]
  }
];

// Pre-seeded Escrow Account
export const MOCK_ESCROW: EscrowAccount[] = [
  {
    id: 'es111111-1111-1111-1111-111111111111',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    milestone_id: 'm1111111-1111-1111-1111-111111111111',
    amount: 25000.00,
    currency: 'INR',
    status: 'LOCKED_IN_ESCROW',
    funded_at: '2026-10-06T09:20:00.000Z'
  }
];

// Pre-seeded Reward Allocations
export const MOCK_REWARD_ALLOCATIONS: RewardAllocation[] = [
  {
    id: 'rw111111-1111-1111-1111-111111111111',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    milestone_id: 'm1111111-1111-1111-1111-111111111111',
    user_id: 'u2222222-2222-2222-2222-222222222222',
    role: 'EXPERT',
    base_share: 7500.00,
    contribution_weight: 1.000000,
    final_amount: 7500.00,
    reward_type: 'MONETARY',
    explanation: '30% Expert Advisor Share from ₹25,000 Milestone Budget.',
    created_at: '2026-10-06T11:30:00.000Z',
    recipient_profile: MOCK_USERS[1]
  },
  {
    id: 'rw222222-2222-2222-2222-222222222222',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    milestone_id: 'm1111111-1111-1111-1111-111111111111',
    user_id: 'u3333333-3333-3333-3333-333333333333',
    role: 'STUDENT',
    base_share: 10000.00,
    contribution_weight: 0.607143,
    final_amount: 6071.43,
    reward_type: 'MONETARY',
    explanation: 'Rahul Sharma received 60.71% of Student Pool (₹10,000) based on reviewed impact score of 8.5/10.',
    created_at: '2026-10-06T11:30:00.000Z',
    recipient_profile: MOCK_USERS[2]
  },
  {
    id: 'rw333333-3333-3333-3333-333333333333',
    project_id: 'p1111111-1111-1111-1111-111111111111',
    milestone_id: 'm1111111-1111-1111-1111-111111111111',
    user_id: 'u4444444-4444-4444-4444-444444444444',
    role: 'STUDENT',
    base_share: 10000.00,
    contribution_weight: 0.392857,
    final_amount: 3928.57,
    reward_type: 'MONETARY',
    explanation: 'Priya Patel received 39.29% of Student Pool (₹10,000) based on reviewed impact score of 5.5/10.',
    created_at: '2026-10-06T11:30:00.000Z',
    recipient_profile: MOCK_USERS[3]
  }
];

// Pre-seeded Non-Monetary Credentials
export const MOCK_CREDENTIALS: Credential[] = [
  {
    id: 'cd111111-1111-1111-1111-111111111111',
    project_id: 'p2222222-2222-2222-2222-222222222222',
    user_id: 'u3333333-3333-3333-3333-333333333333',
    credential_type: 'CO_AUTHORSHIP',
    title: 'Co-Author: Open Image Accessibility Benchmark Paper',
    description: 'Recognized co-author on paper "Benchmarking Vision-Language Models for Scientific Diagram Accessibility".',
    issued_at: '2026-10-06T12:00:00.000Z'
  },
  {
    id: 'cd222222-2222-2222-2222-222222222222',
    project_id: 'p2222222-2222-2222-2222-222222222222',
    user_id: 'u3333333-3333-3333-3333-333333333333',
    credential_type: 'CERTIFICATE',
    title: 'Verified Research Contributor Certificate',
    description: 'Issued by ProofResearch Governance Board & IIT Department of Computer Science.',
    issued_at: '2026-10-06T12:00:00.000Z'
  }
];

// Helper to construct sequence ledger entries dynamically
export function buildInitialMockLedger(): LedgerEntry[] {
  const pId = 'p1111111-1111-1111-1111-111111111111';
  let prevHash = 'GENESIS_PROOF_RESEARCH_2026';

  const rawEvents = [
    {
      seq: 1,
      actor: 'u1111111-1111-1111-1111-111111111111',
      action: 'CREATE_PROJECT',
      type: 'PROJECT',
      entity: pId,
      payload: { title: 'Low-cost detection of diabetic retinopathy', budget: 100000 },
      time: '2026-10-06T09:00:00.000Z'
    },
    {
      seq: 2,
      actor: 'u3333333-3333-3333-3333-333333333333',
      action: 'ACCEPT_CHARTER',
      type: 'CHARTER',
      entity: 'ch111111-1111-1111-1111-111111111111',
      payload: { version: 'v1.0', acceptance_hash: 'a1b2c3d4e5f6' },
      time: '2026-10-06T09:12:00.000Z'
    },
    {
      seq: 3,
      actor: 'u1111111-1111-1111-1111-111111111111',
      action: 'FUND_ESCROW',
      type: 'ESCROW',
      entity: 'es111111-1111-1111-1111-111111111111',
      payload: { milestone_id: 'm1111111-1111-1111-1111-111111111111', amount: 25000, status: 'LOCKED_IN_ESCROW' },
      time: '2026-10-06T09:20:00.000Z'
    },
    {
      seq: 4,
      actor: 'u3333333-3333-3333-3333-333333333333',
      action: 'ADD_CONTRIBUTION',
      type: 'CONTRIBUTION',
      entity: 'ct111111-1111-1111-1111-111111111111',
      payload: { type: 'CODE', ai_assisted: true, artifact_hash: 'a3f890b21c4e7d8f9a2b1c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f' },
      time: '2026-10-06T10:15:00.000Z'
    },
    {
      seq: 5,
      actor: 'u2222222-2222-2222-2222-222222222222',
      action: 'APPROVE_SUBMISSION',
      type: 'REVIEW',
      entity: 's1111111-1111-1111-1111-111111111111',
      payload: { similarity_score: 87.00, decision: 'APPROVED', reason: 'Open-source pre-processing utility confirmed valid.' },
      time: '2026-10-06T11:15:00.000Z'
    }
  ];

  return rawEvents.map(e => {
    const hashInput = prevHash + e.actor + e.action + e.type + e.entity + JSON.stringify(e.payload) + e.time;
    const currentHash = computeSHA256(hashInput);
    const entry: LedgerEntry = {
      id: `led-${e.seq}`,
      project_id: pId,
      sequence_number: e.seq,
      actor_id: e.actor,
      action: e.action,
      entity_type: e.type,
      entity_id: e.entity,
      payload: e.payload,
      previous_hash: prevHash,
      current_hash: currentHash,
      created_at: e.time,
      actor_profile: MOCK_USERS.find(u => u.id === e.actor)
    };
    prevHash = currentHash;
    return entry;
  });
}

export const MOCK_LEDGER_ENTRIES = buildInitialMockLedger();
