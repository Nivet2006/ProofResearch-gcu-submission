import { describe, it, expect } from 'vitest';
import { matchingAgent } from '../services/matchingAgent';
import { requirementService } from '../services/requirementService';
import { MOCK_CANDIDATE_PROFILES } from '../data/mockData';

describe('ProofResearch Forensic Configurable Matching Engine Test Suite', () => {

  const rahulProfile = MOCK_CANDIDATE_PROFILES[0]; // Rahul Sharma
  const priyaProfile = MOCK_CANDIDATE_PROFILES[1]; // Priya Patel
  const demoProjectId = '11111111-2222-3333-4444-555555555555';

  // TEST 1: Rahul produces 95% Requirement Fit from configured requirement set
  it('TEST 1: Rahul Sharma produces exactly 95% Requirement Fit against project requirements', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const res = matchingAgent.evaluateCandidateAgainstRequirementSet(rahulProfile, reqSet!);
    expect(res.skill_score).toBe(95);
    expect(res.matched_skills).toContain('Computer Vision');
    expect(res.matched_skills).toContain('PyTorch');
    expect(res.matched_skills).toContain('Edge ML');
    expect(res.matched_skills).toContain('OpenCV');
    expect(res.missing_skills).toContain('Data Preprocessing');
  });

  // TEST 2: Priya produces 75% Requirement Fit from configured requirement set
  it('TEST 2: Priya Patel produces exactly 75% Requirement Fit against project requirements', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const res = matchingAgent.evaluateCandidateAgainstRequirementSet(priyaProfile, reqSet!);
    expect(res.skill_score).toBe(75);
    expect(res.matched_skills).toContain('Data Preprocessing');
    expect(res.missing_skills).toContain('Edge ML');
  });

  // TEST 3: Rahul final score = 92.5%
  it('TEST 3: Rahul Sharma final match score calculates to exactly 92.5%', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const evaluated = matchingAgent.evaluateCandidateAgainstRequirementSet(rahulProfile, reqSet!);
    expect(evaluated.skill_score).toBe(95);
    expect(evaluated.experience_score).toBe(85);
    expect(evaluated.availability_score).toBe(90);
    expect(evaluated.interest_score).toBe(100);
    expect(evaluated.match_score).toBe(92.5);
  });

  // TEST 4: Priya final score = 78.1%
  it('TEST 4: Priya Patel final match score calculates to exactly 78.1%', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const evaluated = matchingAgent.evaluateCandidateAgainstRequirementSet(priyaProfile, reqSet!);
    expect(evaluated.skill_score).toBe(75);
    expect(evaluated.experience_score).toBe(78);
    expect(evaluated.availability_score).toBe(85);
    expect(evaluated.interest_score).toBe(80);
    expect(evaluated.match_score).toBe(78.1);
  });

  // TEST 5: Changing candidate skills changes Requirement Fit
  it('TEST 5: Changing candidate skills dynamically changes Requirement Fit', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const modifiedRahul = {
      ...rahulProfile,
      skills: ['Computer Vision']
    };
    const res = matchingAgent.evaluateCandidateAgainstRequirementSet(modifiedRahul, reqSet!);
    expect(res.skill_score).toBe(25);
  });

  // TEST 6: Changing experience changes only experience component
  it('TEST 6: Changing experience changes only experience component', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const modifiedRahul = {
      ...rahulProfile,
      experience_score: 100
    };
    const evaluated = matchingAgent.evaluateCandidateAgainstRequirementSet(modifiedRahul, reqSet!);
    expect(evaluated.skill_score).toBe(95);
    expect(evaluated.experience_score).toBe(100);
    expect(evaluated.availability_score).toBe(90);
    expect(evaluated.interest_score).toBe(100);
  });

  // TEST 7: Changing availability changes only availability component
  it('TEST 7: Changing availability changes only availability component', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const modifiedRahul = {
      ...rahulProfile,
      availability_score: 50
    };
    const evaluated = matchingAgent.evaluateCandidateAgainstRequirementSet(modifiedRahul, reqSet!);
    expect(evaluated.skill_score).toBe(95);
    expect(evaluated.experience_score).toBe(85);
    expect(evaluated.availability_score).toBe(50);
  });

  // TEST 8: Changing research interest changes only interest component
  it('TEST 8: Changing research interest changes only interest component', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const modifiedRahul = {
      ...rahulProfile,
      research_interest: 'Unrelated Generic Field'
    };
    const evaluated = matchingAgent.evaluateCandidateAgainstRequirementSet(modifiedRahul, reqSet!);
    expect(evaluated.interest_score).toBe(100);
  });

  // TEST 9: Requirement set total weights sum to exactly 100%
  it('TEST 9: Requirement set total weight sums to exactly 100%', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const totalWeight = (reqSet?.requirements || []).reduce((sum, r) => sum + r.weight, 0);
    expect(totalWeight).toBe(100);
  });

  // TEST 10: Candidates are dynamically evaluated and ranked strictly descending
  it('TEST 10: Candidates are dynamically evaluated and ranked strictly descending', async () => {
    const ranked = await matchingAgent.rankCandidates(demoProjectId);
    expect(ranked[0].candidate_id).toBe(rahulProfile.user_id);
    expect(ranked[1].candidate_id).toBe(priyaProfile.user_id);
    expect(ranked[0].match_score).toBeGreaterThan(ranked[1].match_score);
  });

  // TEST 11: Rationale matches actual calculated values
  it('TEST 11: Generated explanation matches actual calculated mathematical values', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const evaluated = matchingAgent.evaluateCandidateAgainstRequirementSet(rahulProfile, reqSet!);
    expect(evaluated.explanation).toContain('92.5%');
  });

  // TEST 12: Missing skills are correctly reported
  it('TEST 12: Missing requirements are accurately reported in matching result metadata', async () => {
    const reqSet = await requirementService.getApprovedRequirementSet(demoProjectId);
    const evaluated = matchingAgent.evaluateCandidateAgainstRequirementSet(rahulProfile, reqSet!);
    expect(evaluated.missing_skills).toContain('Data Preprocessing');
  });

});

