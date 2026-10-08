import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { computeSHA256 } from '../lib/hash';
import {
  ExpertApplication,
  ExpertEvidence,
  ExpertReview,
  ExpertBadge,
  ExpertTier,
  EvidenceCategory,
  EvidenceVerificationStatus,
  ReviewVote,
  ScoringBreakdown,
  ExpertLedgerAction,
} from '../types/expertVerification';

// ─── Scoring Engine (Deterministic, No AI) ────────────────────────────────────

const SCORE_WEIGHTS = {
  government_empanelment: 30,
  phd_qualification: 25,
  years_experience: 20,      // 10+ years
  publications: 15,           // 5+ peer-reviewed
  patents: 10,                // any patent
  institutional_affiliation: 10,
  references: 10,             // 2+ references provided
} as const;

export function computePreliminaryScore(params: {
  government_empanelled: boolean;
  highest_qualification: string;
  years_of_experience: number;
  publication_count: number;
  patent_count: number;
  institution: string;
  reference_contacts: string;
}): ScoringBreakdown {
  const scores = {
    government_empanelment: params.government_empanelled ? SCORE_WEIGHTS.government_empanelment : 0,
    phd_qualification: /phd|doctor|d\.phil|post.?doc|professor/i.test(params.highest_qualification)
      ? SCORE_WEIGHTS.phd_qualification : 0,
    years_experience: params.years_of_experience >= 10 ? SCORE_WEIGHTS.years_experience
      : params.years_of_experience >= 5 ? Math.round(SCORE_WEIGHTS.years_experience * 0.5) : 0,
    publications: params.publication_count >= 5 ? SCORE_WEIGHTS.publications
      : params.publication_count >= 1 ? Math.round(SCORE_WEIGHTS.publications * 0.4) : 0,
    patents: params.patent_count >= 1 ? SCORE_WEIGHTS.patents : 0,
    institutional_affiliation: params.institution.trim().length > 3 ? SCORE_WEIGHTS.institutional_affiliation : 0,
    references: (() => {
      try {
        const refs = JSON.parse(params.reference_contacts || '[]');
        return Array.isArray(refs) && refs.length >= 2 ? SCORE_WEIGHTS.references
          : refs.length >= 1 ? Math.round(SCORE_WEIGHTS.references * 0.5) : 0;
      } catch {
        // plain text: count commas/newlines as separators
        const count = (params.reference_contacts.match(/[,\n]/g) || []).length + 1;
        return count >= 2 ? SCORE_WEIGHTS.references : Math.round(SCORE_WEIGHTS.references * 0.5);
      }
    })(),
  };

  const rawTotal = Object.values(scores).reduce((a, b) => a + b, 0);
  const total = Math.min(100, rawTotal);

  const tier: ExpertTier =
    total >= 85 ? 'GOVERNMENT_EXPERT' :
    total >= 70 ? 'ACADEMIC_EXPERT' :
    total >= 55 ? 'PRACTITIONER_EXPERT' :
    'DOMAIN_REVIEWER';

  const tier_label =
    total >= 85 ? 'Government / Senior Expert Candidate' :
    total >= 70 ? 'Academic Expert Candidate' :
    total >= 55 ? 'Practitioner Expert Candidate' :
    'Needs More Evidence';

  return { ...scores, total, tier, tier_label };
}

// ─── Review Committee Logic ───────────────────────────────────────────────────

export function computeCommitteeDecision(reviews: ExpertReview[]): {
  canApprove: boolean;
  reason: string;
  approvals: number;
  rejections: number;
  moreEvidenceRequests: number;
} {
  const approvals = reviews.filter(r => r.vote === 'APPROVE').length;
  const rejections = reviews.filter(r => r.vote === 'REJECT').length;
  const moreEvidenceRequests = reviews.filter(r => r.vote === 'REQUEST_MORE_EVIDENCE').length;
  const unresolvedRejections = rejections > 0;
  const canApprove = approvals >= 2 && !unresolvedRejections;

  return {
    canApprove,
    approvals,
    rejections,
    moreEvidenceRequests,
    reason: canApprove
      ? `${approvals} approvals with no rejections — eligible for final approval.`
      : unresolvedRejections
        ? `${rejections} unresolved rejection(s) — cannot approve until resolved.`
        : `Only ${approvals}/2 required approvals — need more reviewer votes.`,
  };
}

// ─── Ledger Helper ────────────────────────────────────────────────────────────

async function appendExpertLedgerEntry(params: {
  applicationId: string;
  actorId: string;
  action: ExpertLedgerAction;
  payload: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const payloadStr = JSON.stringify(params.payload);
    const payloadHash = await computeSHA256(payloadStr);
    await supabase.from('expert_ledger').insert({
      application_id: params.applicationId,
      actor_id: params.actorId,
      action: params.action,
      payload: params.payload,
      payload_hash: payloadHash,
      created_at: new Date().toISOString(),
    });
  } catch (_) {
    // Ledger is best-effort; don't block main flow
  }
}

// ─── Expert Verification Service ─────────────────────────────────────────────

export const expertVerificationService = {

  // ── Applications ────────────────────────────────────────────────────────────

  async submitApplication(params: {
    userId: string;
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
    reference_contacts: string;
    expertise_statement: string;
  }): Promise<{ success: boolean; applicationId?: string; message: string; score?: ScoringBreakdown }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured.' };

    const score = computePreliminaryScore(params);

    const id = `ea-${params.userId}-${Date.now()}`;
    const { data, error } = await supabase.from('expert_applications').insert({
      id,
      user_id: params.userId,
      status: 'PENDING_REVIEW',
      full_name: params.full_name,
      current_role_title: params.current_role_title,
      institution: params.institution,
      primary_domain: params.primary_domain,
      secondary_domains: params.secondary_domains,
      years_of_experience: params.years_of_experience,
      highest_qualification: params.highest_qualification,
      publication_count: params.publication_count,
      patent_count: params.patent_count,
      government_empanelled: params.government_empanelled,
      reference_contacts: params.reference_contacts,
      expertise_statement: params.expertise_statement,
      preliminary_score: score.total,
      preliminary_tier: score.tier,
      verified_domains: [],
      evidence_reviewed_count: 0,
    }).select().single();

    if (error) return { success: false, message: error.message };

    await appendExpertLedgerEntry({
      applicationId: (data as ExpertApplication).id,
      actorId: params.userId,
      action: 'EXPERT_APPLICATION_SUBMITTED',
      payload: { preliminary_score: score.total, tier: score.tier, primary_domain: params.primary_domain },
    });

    return { success: true, applicationId: (data as ExpertApplication).id, message: 'Application submitted.', score };
  },

  async getMyApplication(userId: string): Promise<ExpertApplication | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase
        .from('expert_applications')
        .select('*, evidence:expert_evidence(*), reviews:expert_reviews(*), badge:expert_badges(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as ExpertApplication | null;
    } catch { return null; }
  },

  async getAllApplications(): Promise<ExpertApplication[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data } = await supabase
        .from('expert_applications')
        .select('*, applicant_profile:user_id(full_name, email, role), evidence:expert_evidence(*), reviews:expert_reviews(*, reviewer_profile:reviewer_id(full_name, email))')
        .order('created_at', { ascending: false });
      return (data as ExpertApplication[]) || [];
    } catch { return []; }
  },

  async updateApplicationStatus(params: {
    applicationId: string;
    adminId: string;
    status: ExpertApplication['status'];
    adminNotes?: string;
    finalTier?: ExpertTier;
    verifiedDomains?: string[];
  }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured.' };
    const updates: Record<string, unknown> = {
      status: params.status,
      updated_at: new Date().toISOString(),
    };
    if (params.adminNotes !== undefined) updates.admin_notes = params.adminNotes;
    if (params.finalTier) updates.final_tier = params.finalTier;
    if (params.verifiedDomains) updates.verified_domains = params.verifiedDomains;
    if (params.status === 'APPROVED') {
      updates.approved_by = params.adminId;
      updates.approved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('expert_applications')
      .update(updates)
      .eq('id', params.applicationId);

    if (error) return { success: false, message: error.message };

    const action: ExpertLedgerAction =
      params.status === 'APPROVED' ? 'EXPERT_APPLICATION_APPROVED' :
      params.status === 'REJECTED' ? 'EXPERT_APPLICATION_REJECTED' :
      params.status === 'NEEDS_MORE_EVIDENCE' ? 'EXPERT_MORE_EVIDENCE_REQUESTED' :
      'EXPERT_APPLICATION_SUBMITTED';

    await appendExpertLedgerEntry({
      applicationId: params.applicationId,
      actorId: params.adminId,
      action,
      payload: { status: params.status, final_tier: params.finalTier, domains: params.verifiedDomains },
    });

    return { success: true, message: `Application status updated to ${params.status}.` };
  },

  // ── Evidence ────────────────────────────────────────────────────────────────

  async uploadEvidence(params: {
    applicationId: string;
    uploaderId: string;
    file: File;
    category: EvidenceCategory;
  }): Promise<{ success: boolean; evidenceId?: string; message: string }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured.' };

    // Compute content hash from file bytes
    const arrayBuffer = await params.file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const evidenceId = `ev-${params.applicationId}-${Date.now()}`;
    const { data, error } = await supabase.from('expert_evidence').insert({
      id: evidenceId,
      application_id: params.applicationId,
      uploader_id: params.uploaderId,
      filename: params.file.name,
      file_type: params.file.type || 'application/octet-stream',
      file_size_bytes: params.file.size,
      category: params.category,
      content_hash: hashHex,
      verification_status: 'PENDING',
      admin_notes: '',
    }).select().single();

    if (error) return { success: false, message: error.message };

    await appendExpertLedgerEntry({
      applicationId: params.applicationId,
      actorId: params.uploaderId,
      action: 'EXPERT_EVIDENCE_UPLOADED',
      payload: { evidenceId, filename: params.file.name, category: params.category, hash: hashHex },
    });

    return { success: true, evidenceId: (data as ExpertEvidence).id, message: 'Evidence submitted.' };
  },

  async reviewEvidence(params: {
    evidenceId: string;
    adminId: string;
    status: EvidenceVerificationStatus;
    adminNotes: string;
    applicationId: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured.' };

    const { error } = await supabase
      .from('expert_evidence')
      .update({
        verification_status: params.status,
        admin_notes: params.adminNotes,
        reviewed_by: params.adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', params.evidenceId);

    if (error) return { success: false, message: error.message };

    // Update reviewed count on application
    const { data: evidenceList } = await supabase
      .from('expert_evidence')
      .select('verification_status')
      .eq('application_id', params.applicationId);

    const reviewedCount = (evidenceList || []).filter(
      (e: { verification_status: string }) => e.verification_status !== 'PENDING'
    ).length;

    await supabase
      .from('expert_applications')
      .update({ evidence_reviewed_count: reviewedCount })
      .eq('id', params.applicationId);

    await appendExpertLedgerEntry({
      applicationId: params.applicationId,
      actorId: params.adminId,
      action: 'EXPERT_EVIDENCE_REVIEWED',
      payload: { evidenceId: params.evidenceId, status: params.status },
    });

    return { success: true, message: 'Evidence reviewed.' };
  },

  // ── Reviews ─────────────────────────────────────────────────────────────────

  async submitReview(params: {
    applicationId: string;
    reviewerId: string;
    vote: ReviewVote;
    confidenceScore: number;
    notes: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured.' };

    // Upsert (one vote per reviewer per application)
    const { error } = await supabase.from('expert_reviews').upsert({
      id: `rev-${params.applicationId}-${params.reviewerId}`,
      application_id: params.applicationId,
      reviewer_id: params.reviewerId,
      vote: params.vote,
      confidence_score: Math.min(100, Math.max(0, params.confidenceScore)),
      notes: params.notes,
      created_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Review submitted.' };
  },

  // ── Badge ────────────────────────────────────────────────────────────────────

  async grantBadge(params: {
    application: ExpertApplication;
    adminId: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured.' };

    const { application, adminId } = params;
    if (application.status !== 'APPROVED' || !application.final_tier) {
      return { success: false, message: 'Application must be APPROVED with a final tier.' };
    }

    const badgeId = `badge-${application.user_id}`;
    const { error } = await supabase.from('expert_badges').upsert({
      id: badgeId,
      user_id: application.user_id,
      application_id: application.id,
      tier: application.final_tier,
      verified_domains: application.verified_domains || [],
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      evidence_reviewed_count: application.evidence_reviewed_count,
      is_active: true,
    }, { onConflict: 'id' });

    if (error) return { success: false, message: error.message };

    // Update candidate_profiles verification_level
    await supabase
      .from('candidate_profiles')
      .update({ verification_level: 'EXPERT_VERIFIED' })
      .eq('user_id', application.user_id);

    await appendExpertLedgerEntry({
      applicationId: application.id,
      actorId: adminId,
      action: 'EXPERT_BADGE_GRANTED',
      payload: { tier: application.final_tier, domains: application.verified_domains, badgeId },
    });

    return { success: true, message: 'Expert badge granted.' };
  },

  async getBadge(userId: string): Promise<ExpertBadge | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data } = await supabase
        .from('expert_badges')
        .select('*, admin_profile:approved_by(full_name, email)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      return data as ExpertBadge | null;
    } catch { return null; }
  },

  async suspendBadge(params: {
    userId: string;
    adminId: string;
    reason: string;
    applicationId: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!isSupabaseConfigured) return { success: false, message: 'Supabase not configured.' };

    const { error: badgeError } = await supabase
      .from('expert_badges')
      .update({ is_active: false, suspended_at: new Date().toISOString(), suspension_reason: params.reason })
      .eq('user_id', params.userId);

    if (badgeError) return { success: false, message: badgeError.message };

    const { error: appError } = await supabase
      .from('expert_applications')
      .update({ status: 'SUSPENDED' })
      .eq('id', params.applicationId);

    if (appError) return { success: false, message: appError.message };

    await appendExpertLedgerEntry({
      applicationId: params.applicationId,
      actorId: params.adminId,
      action: 'EXPERT_BADGE_SUSPENDED',
      payload: { reason: params.reason },
    });

    return { success: true, message: 'Badge suspended.' };
  },
};
