import { describe, it, expect, vi } from 'vitest';
import { scopingAgent } from '../services/scopingAgent';
import { matchingAgent } from '../services/matchingAgent';
import { reviewAgent } from '../services/reviewAgent';
import { integrityAgent } from '../services/integrityAgent';
import { ledgerService } from '../services/ledgerService';
import { supabase } from '../lib/supabase';
import { Submission } from '../types';

describe('ProofResearch Four AI Agents Test Suite', () => {
  // --- 1. SCOPING AGENT TEST ---
  it('Scoping Agent generates scope, milestones, draft charter, and enforces human sponsor approval', async () => {
    const projectId = '11111111-2222-3333-4444-555555555555';
    const sponsorId = '11111111-1111-1111-1111-111111111111';
    const charterId = '11111111-3333-4444-5555-666666666666';
    const appendSpy = vi.spyOn(ledgerService, 'appendEntry');
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'ai_actions') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null })
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      } as any;
    });

    const result = await scopingAgent.generateProjectScope(
      projectId,
      'Diabetic Retinopathy Detection',
      'Edge AI image analysis pipeline for fundus images.',
      sponsorId
    );

    expect(result.scope).toBeDefined();
    expect(result.milestones.length).toBe(2);
    expect(result.draftCharter.version).toBe('v1.0-DRAFT');
    expect(result.milestones[0].status).toBe('PENDING_HUMAN_APPROVAL');
    expect(appendSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'AI_SCOPE_GENERATED',
      projectId
    }));

    // Human sponsor approval action
    await scopingAgent.approveScopeAndCharter(projectId, sponsorId, charterId);
    expect(appendSpy).toHaveBeenCalledWith(expect.objectContaining({
      action: 'AI_SCOPE_APPROVED',
      projectId
    }));
  });

  // --- 2. MATCHING AGENT TEST ---
  it('Matching Agent calculates explainable scores, ranks candidates, and supports human selection', async () => {
    const projectId = 'p-test-matching-1';
    const sponsorId = '11111111-1111-1111-1111-111111111111';

    const ranked = await matchingAgent.rankCandidates(projectId);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].match_score).toBeGreaterThan(0);
    expect(ranked[0].explanation).toContain('match');

    // Human sponsor selection action
    await matchingAgent.selectCandidate(projectId, sponsorId, ranked[0].candidate_id, ranked[0].match_score);
  });

  // --- 3. REVIEW AGENT TEST ---
  it('Review Agent analyzes deliverable quality, produces recommendation, and respects human decision', async () => {
    const submission: Submission = {
      id: 'sub-test-1',
      project_id: 'p1',
      milestone_id: 'm1',
      submitted_by: '33333333-3333-3333-3333-333333333333',
      title: 'CLAHE Image Preprocessing Pipeline',
      content: 'Implemented PyTorch CLAHE normalization script with int8 TFLite model binary.',
      content_hash: 'hash123',
      similarity_score: 12.5,
      integrity_status: 'CLEAN',
      created_at: new Date().toISOString()
    };

    const analysis = await reviewAgent.analyzeSubmission(submission);
    expect(analysis.qualityScore).toBeGreaterThan(50);
    expect(analysis.recommendation).toBe('RECOMMEND_ACCEPT');

    // Test short content with keywords triggers RECOMMEND_REVISION
    const shortSubmission: Submission = {
      ...submission,
      id: 'sub-short-content',
      content: 'Short script.'
    };
    const shortAnalysis = await reviewAgent.analyzeSubmission(shortSubmission);
    expect(shortAnalysis.recommendation).toBe('RECOMMEND_REVISION');
    expect(shortAnalysis.qualityScore).toBe(45);

    // Test high similarity submission overrides recommendation to RECOMMEND_REJECT
    const highSimSubmission: Submission = {
      ...submission,
      id: 'sub-test-high-sim',
      similarity_score: 85.0
    };
    const highSimAnalysis = await reviewAgent.analyzeSubmission(highSimSubmission);
    expect(highSimAnalysis.recommendation).toBe('RECOMMEND_REJECT');
    expect(highSimAnalysis.qualityScore).toBeLessThanOrEqual(30);

    // Human expert decision action
    const decision = await reviewAgent.submitHumanDecision(
      submission.id,
      'p1',
      '22222222-2222-2222-2222-222222222222',
      'APPROVED',
      'Open-source pre-processing script verified.'
    );
    expect(decision.decision).toBe('APPROVED');
  });

  // --- 4. INTEGRITY AGENT TEST ---
  it('Integrity Agent detects text similarity, flags suspicious duplicates, and enforces human review', async () => {
    const currentSub = {
      id: 'sub-test-dup',
      projectId: 'p1',
      title: 'CLAHE Pipeline Duplicate',
      content: 'Implemented PyTorch CLAHE normalization script with int8 TFLite model binary.'
    };

    const priorSubmissions: Submission[] = [
      {
        id: 'sub-test-prior',
        project_id: 'p1',
        milestone_id: 'm1',
        submitted_by: '44444444-4444-4444-4444-444444444444',
        title: 'Prior CLAHE Script',
        content: 'Implemented PyTorch CLAHE normalization script with int8 TFLite model binary.',
        content_hash: 'hash123',
        similarity_score: 0,
        integrity_status: 'CLEAN'
      }
    ];

    const report = await integrityAgent.checkSubmissionIntegrity(currentSub, priorSubmissions, []);
    expect(report.similarityScore).toBe(100);
    expect(report.riskLevel).toBe('HIGH');
    expect(report.integrityStatus).toBe('REQUIRES_HUMAN_REVIEW');
    expect(report.suspiciousPatternAlerts.length).toBeGreaterThan(0);
  });

  it('Integrity Agent classifies distinct content as CLEAN', async () => {
    const currentSub = {
      id: 'sub-distinct',
      projectId: 'p1',
      title: 'Unique Alt-Text Accessibility Report',
      content: 'Analyzed chart SVG semantic labels and screen reader contrast ratios under CC-BY 4.0.'
    };

    const report = await integrityAgent.checkSubmissionIntegrity(currentSub, [], []);
    expect(report.riskLevel).toBe('LOW');
    expect(report.integrityStatus).toBe('CLEAN');
  });
});
