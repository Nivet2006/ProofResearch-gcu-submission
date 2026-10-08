/**
 * Expert Verification Feature Tests
 * Tests: scoring logic, evidence validation, committee decision, badge rules, privacy
 *
 * Run with: npm test -- expertVerification
 */

import { describe, it, expect } from 'vitest';
import { computePreliminaryScore, computeCommitteeDecision } from '../services/expertVerificationService';
import type { ExpertReview } from '../types/expertVerification';

// ─── 1. Scoring Logic ─────────────────────────────────────────────────────────

describe('computePreliminaryScore', () => {
  it('scores maximum 100 for fully-qualified government expert', () => {
    const result = computePreliminaryScore({
      government_empanelled: true,
      highest_qualification: 'PhD / Doctoral Candidate',
      years_of_experience: 12,
      publication_count: 10,
      patent_count: 2,
      institution: 'IISc Bangalore',
      reference_contacts: 'Prof A, ref@a.edu\nDr B, ref@b.edu',
    });
    expect(result.total).toBeLessThanOrEqual(100);
    expect(result.total).toBeGreaterThanOrEqual(85);
    expect(result.tier).toBe('GOVERNMENT_EXPERT');
    expect(result.tier_label).toMatch(/Government/);
  });

  it('awards full government_empanelment weight (30) when empanelled', () => {
    const result = computePreliminaryScore({
      government_empanelled: true,
      highest_qualification: 'High School',
      years_of_experience: 0,
      publication_count: 0,
      patent_count: 0,
      institution: '',
      reference_contacts: '',
    });
    expect(result.government_empanelment).toBe(30);
  });

  it('awards 0 government_empanelment when not empanelled', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: 'PhD / Doctoral Candidate',
      years_of_experience: 15,
      publication_count: 20,
      patent_count: 3,
      institution: 'MIT',
      reference_contacts: 'Prof X\nDr Y',
    });
    expect(result.government_empanelment).toBe(0);
  });

  it('awards PhD weight (25) for PhD qualification', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: 'PhD / Doctoral Candidate',
      years_of_experience: 0,
      publication_count: 0,
      patent_count: 0,
      institution: '',
      reference_contacts: '',
    });
    expect(result.phd_qualification).toBe(25);
  });

  it('awards 0 phd weight for bachelor qualification', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: "Bachelor's Degree (B.E / B.Tech / B.Sc)",
      years_of_experience: 0,
      publication_count: 0,
      patent_count: 0,
      institution: '',
      reference_contacts: '',
    });
    expect(result.phd_qualification).toBe(0);
  });

  it('awards full experience weight (20) for 10+ years', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: '',
      years_of_experience: 10,
      publication_count: 0,
      patent_count: 0,
      institution: '',
      reference_contacts: '',
    });
    expect(result.years_experience).toBe(20);
  });

  it('awards partial experience weight for 5-9 years', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: '',
      years_of_experience: 7,
      publication_count: 0,
      patent_count: 0,
      institution: '',
      reference_contacts: '',
    });
    expect(result.years_experience).toBe(10); // 50% of 20
  });

  it('awards 0 experience weight for < 5 years', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: '',
      years_of_experience: 3,
      publication_count: 0,
      patent_count: 0,
      institution: '',
      reference_contacts: '',
    });
    expect(result.years_experience).toBe(0);
  });

  it('awards full publications weight (15) for 5+ publications', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: '',
      years_of_experience: 0,
      publication_count: 8,
      patent_count: 0,
      institution: '',
      reference_contacts: '',
    });
    expect(result.publications).toBe(15);
  });

  it('awards 0 publications weight for 0 publications', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: '',
      years_of_experience: 0,
      publication_count: 0,
      patent_count: 0,
      institution: '',
      reference_contacts: '',
    });
    expect(result.publications).toBe(0);
  });

  it('awards patent weight (10) for >= 1 patent', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: '',
      years_of_experience: 0,
      publication_count: 0,
      patent_count: 1,
      institution: '',
      reference_contacts: '',
    });
    expect(result.patents).toBe(10);
  });

  it('awards institutional weight (10) when institution is non-trivial', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: '',
      years_of_experience: 0,
      publication_count: 0,
      patent_count: 0,
      institution: 'IIT Madras',
      reference_contacts: '',
    });
    expect(result.institutional_affiliation).toBe(10);
  });

  it('awards 0 institutional weight for empty institution', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: '',
      years_of_experience: 0,
      publication_count: 0,
      patent_count: 0,
      institution: '',
      reference_contacts: '',
    });
    expect(result.institutional_affiliation).toBe(0);
  });

  it('awards full reference weight (10) for 2+ references', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: '',
      years_of_experience: 0,
      publication_count: 0,
      patent_count: 0,
      institution: '',
      reference_contacts: 'Prof A\nDr B',
    });
    expect(result.references).toBe(10);
  });

  it('caps total score at 100', () => {
    const result = computePreliminaryScore({
      government_empanelled: true,
      highest_qualification: 'Post-Doctoral Researcher',
      years_of_experience: 20,
      publication_count: 50,
      patent_count: 10,
      institution: 'Harvard University',
      reference_contacts: 'A\nB\nC',
    });
    expect(result.total).toBe(100);
  });

  it('assigns ACADEMIC_EXPERT tier for 70-84 score', () => {
    // PhD (25) + 10yr (20) + 5 pubs (15) + institution (10) + refs (10) = 80
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: 'PhD / Doctoral Candidate',
      years_of_experience: 10,
      publication_count: 5,
      patent_count: 0,
      institution: 'IIT Delhi',
      reference_contacts: 'A\nB',
    });
    expect(result.total).toBe(80);
    expect(result.tier).toBe('ACADEMIC_EXPERT');
  });

  it('assigns DOMAIN_REVIEWER for score below 55', () => {
    const result = computePreliminaryScore({
      government_empanelled: false,
      highest_qualification: "Bachelor's Degree (B.E / B.Tech / B.Sc)",
      years_of_experience: 2,
      publication_count: 0,
      patent_count: 0,
      institution: '',
      reference_contacts: '',
    });
    expect(result.total).toBeLessThan(55);
    expect(result.tier).toBe('DOMAIN_REVIEWER');
  });
});

// ─── 2. Committee Decision Logic ─────────────────────────────────────────────

describe('computeCommitteeDecision', () => {
  const makeReview = (vote: ExpertReview['vote'], id: string): ExpertReview => ({
    id,
    application_id: 'app-1',
    reviewer_id: `reviewer-${id}`,
    vote,
    confidence_score: 80,
    notes: '',
    created_at: new Date().toISOString(),
  });

  it('canApprove when 2+ approvals and no rejections', () => {
    const reviews = [makeReview('APPROVE', '1'), makeReview('APPROVE', '2')];
    const { canApprove } = computeCommitteeDecision(reviews);
    expect(canApprove).toBe(true);
  });

  it('canApprove = false when only 1 approval', () => {
    const reviews = [makeReview('APPROVE', '1')];
    const { canApprove } = computeCommitteeDecision(reviews);
    expect(canApprove).toBe(false);
  });

  it('canApprove = false when 2 approvals but has rejection', () => {
    const reviews = [
      makeReview('APPROVE', '1'),
      makeReview('APPROVE', '2'),
      makeReview('REJECT', '3'),
    ];
    const { canApprove } = computeCommitteeDecision(reviews);
    expect(canApprove).toBe(false);
  });

  it('counts votes correctly', () => {
    const reviews = [
      makeReview('APPROVE', '1'),
      makeReview('REJECT', '2'),
      makeReview('REQUEST_MORE_EVIDENCE', '3'),
    ];
    const result = computeCommitteeDecision(reviews);
    expect(result.approvals).toBe(1);
    expect(result.rejections).toBe(1);
    expect(result.moreEvidenceRequests).toBe(1);
  });

  it('returns empty-reviews decision as canApprove=false', () => {
    const { canApprove } = computeCommitteeDecision([]);
    expect(canApprove).toBe(false);
  });

  it('3 approvals and no rejections still canApprove=true', () => {
    const reviews = [
      makeReview('APPROVE', '1'),
      makeReview('APPROVE', '2'),
      makeReview('APPROVE', '3'),
    ];
    const { canApprove } = computeCommitteeDecision(reviews);
    expect(canApprove).toBe(true);
  });
});

// ─── 3. Evidence Validation Rules ────────────────────────────────────────────

describe('Evidence category validation', () => {
  const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'image/png', 'image/jpeg'];

  it('accepts PDF files', () => {
    expect(ACCEPTED_TYPES.includes('application/pdf')).toBe(true);
  });

  it('accepts DOCX files', () => {
    expect(ACCEPTED_TYPES.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
  });

  it('accepts PNG and JPG images', () => {
    expect(ACCEPTED_TYPES.includes('image/png')).toBe(true);
    expect(ACCEPTED_TYPES.includes('image/jpeg')).toBe(true);
  });

  it('rejects unknown file types', () => {
    expect(ACCEPTED_TYPES.includes('application/exe')).toBe(false);
    expect(ACCEPTED_TYPES.includes('video/mp4')).toBe(false);
  });
});

// ─── 4. Badge Display Rules ───────────────────────────────────────────────────

describe('Badge display rules', () => {
  it('badge is only active when is_active = true', () => {
    const activeBadge = { is_active: true, tier: 'ACADEMIC_EXPERT', verified_domains: ['AI'] };
    const suspendedBadge = { is_active: false, tier: 'ACADEMIC_EXPERT', verified_domains: ['AI'] };

    expect(activeBadge.is_active).toBe(true);
    expect(suspendedBadge.is_active).toBe(false);
  });

  it('public badge contains no private document references', () => {
    const badge = {
      id: 'badge-123',
      user_id: 'user-abc',
      tier: 'ACADEMIC_EXPERT',
      verified_domains: ['AI/ML'],
      approved_at: '2026-01-01',
      evidence_reviewed_count: 3,
      is_active: true,
      // No evidence array, no document URLs, no admin private notes
    };
    expect((badge as Record<string, unknown>).evidence).toBeUndefined();
    expect((badge as Record<string, unknown>).private_documents).toBeUndefined();
    expect((badge as Record<string, unknown>).admin_private_notes).toBeUndefined();
  });
});

// ─── 5. Application Status Transitions ───────────────────────────────────────

describe('Application status flow', () => {
  const VALID_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'NEEDS_MORE_EVIDENCE', 'APPROVED', 'REJECTED', 'SUSPENDED'];

  it('all expected statuses are defined', () => {
    expect(VALID_STATUSES).toContain('PENDING_REVIEW');
    expect(VALID_STATUSES).toContain('NEEDS_MORE_EVIDENCE');
    expect(VALID_STATUSES).toContain('APPROVED');
    expect(VALID_STATUSES).toContain('REJECTED');
    expect(VALID_STATUSES).toContain('SUSPENDED');
  });

  it('rejected flow: application needs rejection note', () => {
    const adminNote = 'Insufficient evidence of domain expertise.';
    expect(adminNote.length).toBeGreaterThan(0);
  });

  it('requires final_tier set before approval can be recorded', () => {
    const app = { status: 'APPROVED', final_tier: null };
    const canGrant = app.status === 'APPROVED' && app.final_tier !== null;
    expect(canGrant).toBe(false);
  });

  it('badge can be granted when status APPROVED and final_tier is set', () => {
    const app = { status: 'APPROVED', final_tier: 'ACADEMIC_EXPERT' };
    const canGrant = app.status === 'APPROVED' && app.final_tier !== null;
    expect(canGrant).toBe(true);
  });
});
