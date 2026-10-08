import { describe, it, expect, beforeEach } from 'vitest';
import { semanticSimilarityService } from '../services/semanticSimilarityService';
import { computeSHA256 } from './hash';
import { ledgerService } from '../services/ledgerService';

describe('ML Semantic Similarity Engine Test Suite (sentence-transformers/all-MiniLM-L6-v2)', () => {

  it('TEST 1: Model metadata returns 384-dimensional all-MiniLM-L6-v2 specifications', async () => {
    const textA = 'Develop a CNN-based diabetic retinopathy screening system using retinal fundus images.';
    const textB = 'Create an automated ophthalmology disease detection pipeline using deep neural networks.';
    
    const result = await semanticSimilarityService.analyzeSimilarity(textA, textB);

    expect(result.model.name).toBe('sentence-transformers/all-MiniLM-L6-v2');
    expect(result.model.version).toBe('proofresearch-semantic-v1');
    expect(result.model.embedding_dimension).toBe(384);
  });

  it('TEST 2: Hard Positive (Different Wording, Same Concept) yields HIGH/VERY_HIGH similarity', async () => {
    const textA = 'Develop a CNN-based diabetic retinopathy screening system using retinal fundus images.';
    const textB = 'Create an automated ophthalmology disease detection pipeline using deep neural networks and clinical photographs.';

    const result = await semanticSimilarityService.analyzeSimilarity(textA, textB);

    expect(result.similarity.percentage).toBeGreaterThanOrEqual(60.0);
    expect(result.machine_learning.relationship_probability).toBeGreaterThanOrEqual(0.70);
    expect(['HIGH', 'VERY_HIGH']).toContain(result.classification);
    expect(result.review.required).toBe(true);
  });

  it('TEST 3: Hard Negative (Shared Keywords "Python/CNN", Different Domain) yields lower relationship score', async () => {
    const textA = 'Develop a CNN-based diabetic retinopathy screening system using Python.';
    const textB = 'Python-based image segmentation for satellite environmental monitoring and flood bounds.';

    const result = await semanticSimilarityService.analyzeSimilarity(textA, textB);

    // Hard negatives should not be classified as VERY_HIGH purely due to "Python" or "image"
    expect(result.classification).not.toBe('VERY_HIGH');
  });

  it('TEST 4: Content hashes and analysis ID are correctly generated and stored', async () => {
    const textA = 'Autonomous vehicle perception using real-time road object detection.';
    const textB = 'YOLO-based vehicle and pedestrian recognition for self-driving cars.';

    const hashA = computeSHA256(textA);
    const hashB = computeSHA256(textB);

    const result = await semanticSimilarityService.analyzeSimilarity(textA, textB);

    expect(result.content_hashes.reference_text_hash).toBe(hashA);
    expect(result.content_hashes.submission_text_hash).toBe(hashB);
    expect(result.analysis_id).toBeTruthy();
  });

  it('TEST 5: Appends SEMANTIC_SIMILARITY_ANALYZED event to SHA-256 ledger without storing raw text', async () => {
    const projectId = 'p1111111-1111-1111-1111-111111111111';
    const actorId = 'u1111111-1111-1111-1111-111111111111';
    const textA = 'Project A text';
    const textB = 'Project B text';

    const result = await semanticSimilarityService.analyzeSimilarity(textA, textB, projectId, 'sub-123', actorId);

    const ledger = await ledgerService.getLedgerEntries(projectId);
    const lastEntry = ledger[ledger.length - 1];

    expect(lastEntry).toBeDefined();
    const entryAction = lastEntry.action || (lastEntry as any).event_type;
    expect(entryAction).toBe('SEMANTIC_SIMILARITY_ANALYZED');
    expect(lastEntry.payload.analysis_id).toBe(result.analysis_id);
    expect(lastEntry.payload.embedding_dimension).toBe(384);
    expect(lastEntry.payload.cosine_similarity).toBe(result.similarity.cosine);
    
    // Ensure raw text is NEVER logged in the ledger
    expect(JSON.stringify(lastEntry.payload)).not.toContain('Project A text');
    expect(JSON.stringify(lastEntry.payload)).not.toContain('Project B text');
  });

  it('TEST 6: Plant Disease CNN similarity test case (Project A vs Project B) yields HIGH or VERY_HIGH', async () => {
    const projectA = "AI-powered plant leaf disease detection using CNNs";
    const projectB = "Automated crop infection diagnosis from photographs via deep convolutional neural networks";

    const result = await semanticSimilarityService.analyzeSimilarity(projectA, projectB);

    expect(result.similarity.percentage).toBeGreaterThanOrEqual(70.0);
    expect(result.machine_learning.relationship_probability).toBeGreaterThanOrEqual(0.70);
    expect(['HIGH', 'VERY_HIGH']).toContain(result.classification);
    expect(result.review.required).toBe(true);
    expect(result.explanation).toBeTruthy();
  });

  it('TEST 7: Fallback concept matching detects 4/4 groups for Plant Disease CNN pair and requires human review', () => {
    const projectA = "AI-powered plant leaf disease detection using CNNs";
    const projectB = "Automated crop infection diagnosis from photographs via deep convolutional neural networks";

    const localResult = semanticSimilarityService.computeLocalSemanticSimilarity(
      projectA,
      projectB,
      computeSHA256(projectA),
      computeSHA256(projectB)
    );

    expect(localResult.fallback_reasoning).toBeDefined();
    const fb = localResult.fallback_reasoning!;
    expect(fb.used_fallback).toBe(true);
    expect(fb.matched_concept_groups_count).toBe(4);
    expect(fb.total_concept_groups).toBe(4);
    expect(fb.fallback_classification).toBe('VERY_HIGH');
    expect(fb.human_review_required).toBe(true);
    expect(fb.explanation).toContain("Both projects describe visual plant/crop disease diagnosis");
  });

  it('TEST 8: Unrelated negative test case (Project A vs Project C: Blockchain) yields LOW similarity', async () => {
    const projectA = "AI-powered plant leaf disease detection using CNNs";
    const projectC = "Blockchain-based land record management system for rural property ownership";

    const result = await semanticSimilarityService.analyzeSimilarity(projectA, projectC);

    expect(result.classification).toBe('LOW');
    if (result.fallback_reasoning) {
      expect(result.fallback_reasoning.fallback_classification).toBe('LOW');
      expect(result.fallback_reasoning.matched_concept_groups_count).toBeLessThan(3);
    }
  });
});
