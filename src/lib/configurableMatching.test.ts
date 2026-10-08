import { describe, it, expect } from 'vitest';
import { requirementService } from '../services/requirementService';
import { matchingAgent } from '../services/matchingAgent';
import { MOCK_CANDIDATE_PROFILES } from '../data/mockData';
import { MatchingRequirementSet } from '../types';

describe('ProofResearch Configurable Requirement System & Generic Matching Engine Test Suite', () => {

  const demoProjectId = '11111111-2222-3333-4444-555555555555';
  const sponsorId = 'u1111111-1111-1111-1111-111111111111';
  const expertId = 'u2222222-2222-2222-2222-222222222222';

  // TEST A: Requirement CRUD & Weight Validation (Total 100%)
  it('TEST A: Enforces requirement weight summation (total must equal 100%)', async () => {
    const validReqs = [
      { name: 'Computer Vision', category: 'DOMAIN' as const, weight: 50.0, importance: 'REQUIRED' as const, matching_method: 'DOMAIN_AFFINITY' as const },
      { name: 'PyTorch', category: 'TECHNOLOGY' as const, weight: 50.0, importance: 'REQUIRED' as const, matching_method: 'FRAMEWORK_AFFINITY' as const }
    ];

    const draft = await requirementService.createDraftRequirementSet('p-test-a-1', sponsorId, validReqs);
    expect(draft.status).toBe('DRAFT');
    expect(draft.requirements?.length).toBe(2);

    const invalidReqs = [
      { name: 'Computer Vision', category: 'DOMAIN' as const, weight: 50.0, importance: 'REQUIRED' as const, matching_method: 'DOMAIN_AFFINITY' as const },
      { name: 'PyTorch', category: 'TECHNOLOGY' as const, weight: 40.0, importance: 'REQUIRED' as const, matching_method: 'FRAMEWORK_AFFINITY' as const }
    ];

    await expect(
      requirementService.createDraftRequirementSet('p-test-a-1', sponsorId, invalidReqs)
    ).rejects.toThrow(/Requirement weights must sum to exactly 100%/);
  });

  // TEST B: Sponsor Submit & Expert Approval Workflow
  it('TEST B: Executes Sponsor Submit -> Expert Approval state machine cleanly', async () => {
    const reqs = [
      { name: 'Solidity', category: 'SKILL' as const, weight: 60.0, importance: 'REQUIRED' as const, matching_method: 'EXACT' as const },
      { name: 'Blockchain', category: 'TECHNOLOGY' as const, weight: 40.0, importance: 'REQUIRED' as const, matching_method: 'DOMAIN_AFFINITY' as const }
    ];

    const draft = await requirementService.createDraftRequirementSet('p-blockchain-1', sponsorId, reqs);
    expect(draft.status).toBe('DRAFT');

    const submitted = await requirementService.submitForExpertReview(draft.id, sponsorId);
    expect(submitted.status).toBe('PENDING_EXPERT_REVIEW');

    const approved = await requirementService.approveRequirementSet(submitted.id, expertId);
    expect(approved.status).toBe('APPROVED');
    expect(approved.approved_by).toBe(expertId);
  });

  // TEST C: Versioning Immutability
  it('TEST C: Preserves immutable approved requirement set versioning (v1.0 -> v2.0)', async () => {
    const reqsV1 = [
      { name: 'Computer Vision', category: 'DOMAIN' as const, weight: 50.0, importance: 'REQUIRED' as const, matching_method: 'DOMAIN_AFFINITY' as const },
      { name: 'PyTorch', category: 'TECHNOLOGY' as const, weight: 50.0, importance: 'REQUIRED' as const, matching_method: 'FRAMEWORK_AFFINITY' as const }
    ];
    const draftV1 = await requirementService.createDraftRequirementSet('p-test-c-1', sponsorId, reqsV1);
    const submittedV1 = await requirementService.submitForExpertReview(draftV1.id, sponsorId);
    const setV1 = await requirementService.approveRequirementSet(submittedV1.id, expertId);
    expect(setV1.version).toBe('v1.0');
    expect(setV1.status).toBe('APPROVED');

    // Create v2 edit
    const reqsV2 = [
      { name: 'Computer Vision', category: 'DOMAIN' as const, weight: 40.0, importance: 'REQUIRED' as const, matching_method: 'DOMAIN_AFFINITY' as const },
      { name: 'PyTorch', category: 'TECHNOLOGY' as const, weight: 60.0, importance: 'REQUIRED' as const, matching_method: 'FRAMEWORK_AFFINITY' as const }
    ];

    const draftV2 = await requirementService.createDraftRequirementSet('p-test-c-1', sponsorId, reqsV2);
    const submittedV2 = await requirementService.submitForExpertReview(draftV2.id, sponsorId);
    const approvedV2 = await requirementService.approveRequirementSet(submittedV2.id, expertId);

    expect(approvedV2.version).toBe('v2.0');
    expect(approvedV2.status).toBe('APPROVED');
  });

  // TEST D: Generic Matching Engine across 3 completely different projects
  it('TEST D: Generic matching engine evaluates 3 distinct project domain requirement sets without code changes', async () => {
    // Project 1: Medical AI
    const set1: MatchingRequirementSet = {
      id: 'set-med-1',
      project_id: 'p-med',
      version: 'v1.0',
      status: 'APPROVED',
      created_by: sponsorId,
      requirements: [
        { id: 'r1', requirement_set_id: 'set-med-1', name: 'Computer Vision', category: 'DOMAIN', weight: 50, importance: 'REQUIRED', matching_method: 'DOMAIN_AFFINITY' },
        { id: 'r2', requirement_set_id: 'set-med-1', name: 'PyTorch', category: 'TECHNOLOGY', weight: 50, importance: 'REQUIRED', matching_method: 'FRAMEWORK_AFFINITY' }
      ]
    };

    // Project 2: Blockchain
    const set2: MatchingRequirementSet = {
      id: 'set-chain-1',
      project_id: 'p-chain',
      version: 'v1.0',
      status: 'APPROVED',
      created_by: sponsorId,
      requirements: [
        { id: 'r3', requirement_set_id: 'set-chain-1', name: 'Solidity', category: 'SKILL', weight: 60, importance: 'REQUIRED', matching_method: 'EXACT' },
        { id: 'r4', requirement_set_id: 'set-chain-1', name: 'Distributed Systems', category: 'DOMAIN', weight: 40, importance: 'REQUIRED', matching_method: 'EXACT' }
      ]
    };

    // Project 3: SQL Analytics
    const set3: MatchingRequirementSet = {
      id: 'set-sql-1',
      project_id: 'p-sql',
      version: 'v1.0',
      status: 'APPROVED',
      created_by: sponsorId,
      requirements: [
        { id: 'r5', requirement_set_id: 'set-sql-1', name: 'SQL', category: 'SKILL', weight: 50, importance: 'REQUIRED', matching_method: 'EXACT' },
        { id: 'r6', requirement_set_id: 'set-sql-1', name: 'Python', category: 'TECHNOLOGY', weight: 50, importance: 'REQUIRED', matching_method: 'EXACT' }
      ]
    };

    const rahul = MOCK_CANDIDATE_PROFILES[0];

    const eval1 = matchingAgent.evaluateCandidateAgainstRequirementSet(rahul, set1);
    const eval2 = matchingAgent.evaluateCandidateAgainstRequirementSet(rahul, set2);
    const eval3 = matchingAgent.evaluateCandidateAgainstRequirementSet(rahul, set3);

    expect(eval1.match_score).toBe(100);
    expect(eval2.match_score).toBe(0);
    expect(eval3.match_score).toBe(50); // Rahul has Python (50%), lacks SQL (0%)
  });

  // TEST E: Current Demo Regression (Rahul 92.5%, Priya 78.1%)
  it('TEST E: Preserves exact demo scores (Rahul = 92.5%, Priya = 78.1%) from configured approved requirement set', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    expect(reqSet).not.toBeNull();

    const ranked = await matchingAgent.rankCandidates(demoProjectId, reqSet || undefined);

    const rahulMatch = ranked.find(r => r.candidate_id === MOCK_CANDIDATE_PROFILES[0].user_id);
    const priyaMatch = ranked.find(r => r.candidate_id === MOCK_CANDIDATE_PROFILES[1].user_id);

    expect(rahulMatch?.match_score).toBe(92.5);
    expect(priyaMatch?.match_score).toBe(78.1);
  });

});
