import { describe, it, expect, beforeEach, vi } from 'vitest';
import { noveltyAgent } from '../services/noveltyAgent';
import { projectService } from '../services/projectService';
import { ledgerService } from '../services/ledgerService';
import { ProofResearchSource } from '../services/novelty/sources/ProofResearchSource';
import { NDLIResearchSource } from '../services/novelty/sources/NDLIResearchSource';
import { OpenAlexResearchSource } from '../services/novelty/sources/OpenAlexResearchSource';
import { CrossrefResearchSource } from '../services/novelty/sources/CrossrefResearchSource';
import { ArxivResearchSource } from '../services/novelty/sources/ArxivResearchSource';
import { verifyNoveltySources } from '../utils/verifyNoveltySources';

describe('Research Novelty Check & All Source Adapters Test Suite', () => {
  const sampleTitle = 'AI-based diabetic retinopathy detection using smartphone retinal images';
  const samplePublicSummary = 'Developing a lightweight deep learning pipeline for low-cost diabetic retinopathy screening on mobile edge devices in rural clinics.';
  const userId = 'u1111111-1111-1111-1111-111111111111';

  beforeEach(() => {
    ledgerService.resetDemoLedger();
    vi.restoreAllMocks();
  });

  it('1. ProofResearchSource: Searches internal public projects, strictly excludes confidential brief', async () => {
    const getProjectsSpy = vi.spyOn(projectService, 'getProjects');
    const getConfidentialSpy = vi.spyOn(projectService, 'getConfidentialBrief');

    const res = await ProofResearchSource.search({
      title: sampleTitle,
      publicSummary: samplePublicSummary,
      concepts: ['diabetic retinopathy', 'retinal imaging']
    });

    expect(getProjectsSpy).toHaveBeenCalled();
    expect(getConfidentialSpy).not.toHaveBeenCalled();
    expect(res.status).toBe('LIVE');
    expect(res.results.length).toBeGreaterThan(0);
    expect(res.results[0].source).toBe('ProofResearch');
    expect(res.responseTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('2. OpenAlexResearchSource: Normalizes OpenAlex API response and handles failures gracefully', async () => {
    const mockOpenAlexData = {
      results: [
        {
          id: 'https://openalex.org/W318920194',
          title: 'Deep Learning for Automated Detection of Diabetic Retinopathy',
          publication_date: '2025-01-20',
          doi: 'https://doi.org/10.1016/j.aiim.2024.102891',
          authorships: [{ author: { display_name: 'Dr. J. Zhang' } }],
          concepts: [{ display_name: 'Ophthalmology' }]
        }
      ]
    };

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      return new Response(JSON.stringify(mockOpenAlexData), { status: 200, statusText: 'OK' });
    });

    const res = await OpenAlexResearchSource.search({
      title: sampleTitle,
      publicSummary: samplePublicSummary,
      concepts: ['diabetic retinopathy']
    });

    expect(res.status).toBe('LIVE');
    expect(res.results.length).toBe(1);
    expect(res.results[0].title).toBe('Deep Learning for Automated Detection of Diabetic Retinopathy');
    expect(res.results[0].external_id).toContain('W318920194');

    // Test API Failure handling
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      return new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    const failRes = await OpenAlexResearchSource.search({
      title: sampleTitle,
      publicSummary: samplePublicSummary,
      concepts: ['diabetic retinopathy']
    });

    expect(failRes.status).toBe('UNAVAILABLE');
    expect(failRes.results.length).toBe(0);
    expect(failRes.errorMessage).toContain('500');
  });

  it('3. CrossrefResearchSource: Normalizes Crossref DOI response and handles empty responses', async () => {
    const mockCrossrefData = {
      message: {
        items: [
          {
            DOI: '10.1109/TMI.2024.3391012',
            title: ['Smartphone-Based Retinal Imaging with Embedded Convolutional Networks'],
            author: [{ given: 'Kiran', family: 'Patel' }],
            created: { 'date-time': '2024-09-12T00:00:00Z' },
            URL: 'https://doi.org/10.1109/TMI.2024.3391012'
          }
        ]
      }
    };

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      return new Response(JSON.stringify(mockCrossrefData), { status: 200, statusText: 'OK' });
    });

    const res = await CrossrefResearchSource.search({
      title: sampleTitle,
      publicSummary: samplePublicSummary,
      concepts: ['smartphone imaging']
    });

    expect(res.status).toBe('LIVE');
    expect(res.results.length).toBe(1);
    expect(res.results[0].external_id).toBe('10.1109/TMI.2024.3391012');
    expect(res.results[0].authors[0]).toBe('Kiran Patel');
  });

  it('4. ArxivResearchSource: Parses arXiv Atom XML safely and extracts preprints', async () => {
    const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>http://arxiv.org/abs/2408.11204v1</id>
        <title>Edge-AI Retinal Disease Screening: Benchmark Strategies</title>
        <summary>Preprint studying MobileNetV3 int8 quantization for diabetic retinopathy.</summary>
        <published>2024-08-20T12:00:00Z</published>
        <author><name>Vikram Sharma</name></author>
        <category term="cs.CV"/>
      </entry>
    </feed>`;

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      return new Response(mockXml, { status: 200, statusText: 'OK' });
    });

    const res = await ArxivResearchSource.search({
      title: sampleTitle,
      publicSummary: samplePublicSummary,
      concepts: ['edge AI']
    });

    expect(res.status).toBe('LIVE');
    expect(res.results.length).toBe(1);
    expect(res.results[0].title).toContain('Edge-AI Retinal Disease Screening');
    expect(res.results[0].authors[0]).toBe('Vikram Sharma');

    // Test malformed XML / API failure handling
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async () => {
      throw new Error('Network timeout connecting to export.arxiv.org');
    });

    const failRes = await ArxivResearchSource.search({
      title: sampleTitle,
      publicSummary: samplePublicSummary,
      concepts: ['edge AI']
    });

    expect(failRes.status).toBe('UNAVAILABLE');
    expect(failRes.results.length).toBe(0);
    expect(failRes.errorMessage).toContain('Network timeout');
  });

  it('5. NDLIResearchSource: Truthfully reports UNAVAILABLE when public API documentation is unverified', async () => {
    const res = await NDLIResearchSource.search({
      title: sampleTitle,
      publicSummary: samplePublicSummary,
      concepts: ['retinal imaging']
    });

    expect(res.status).toBe('UNAVAILABLE');
    expect(res.results.length).toBe(0);
    expect(res.errorMessage).toContain('Current public documentation is insufficient to verify a supported third-party API');
  });

  it('6. Resilience: One source failure does NOT fail the complete novelty check', async () => {
    // Mock arXiv failure, while OpenAlex and ProofResearch succeed
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: any) => {
      const urlStr = String(url);
      if (urlStr.includes('arxiv')) {
        throw new Error('arXiv server busy');
      }
      return new Response(JSON.stringify({ results: [] }), { status: 200, statusText: 'OK' });
    });

    const assessment = await noveltyAgent.runNoveltyCheck({
      title: sampleTitle,
      publicSummary: samplePublicSummary,
      creatorId: userId
    });

    expect(assessment.status).toBe('COMPLETED');
    expect(assessment.sources_searched.length).toBe(5);

    const arxivSource = assessment.sources_searched.find(s => s.name === 'arXiv');
    expect(arxivSource?.status).toBe('UNAVAILABLE');
  });

  it('7. Deduplication: Removes duplicate results returned across queries or adapters', async () => {
    const mockDupData = {
      results: [
        { id: 'https://openalex.org/W100', title: 'Duplicate Paper Title', authorships: [] },
        { id: 'https://openalex.org/W100', title: 'Duplicate Paper Title', authorships: [] }
      ]
    };

    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return new Response(JSON.stringify(mockDupData), { status: 200, statusText: 'OK' });
    });

    const assessment = await noveltyAgent.runNoveltyCheck({
      title: sampleTitle,
      publicSummary: samplePublicSummary,
      creatorId: userId
    });

    const duplicateTitles = assessment.results.filter(r => r.title === 'Duplicate Paper Title');
    expect(duplicateTitles.length).toBeLessThanOrEqual(1);
  });

  it('8. Live Verification Diagnostic: Runs verifyNoveltySources diagnostic tool cleanly', async () => {
    const report = await verifyNoveltySources();
    expect(report.totalSourcesTested).toBe(5);
    expect(report.summaries.length).toBe(5);
  });

  describe('Self-Match Prevention & Project ID Exclusion Test Suite', () => {
    it('9. Target Project ID Exclusion: Running novelty check for Project A excludes A and permits B', async () => {
      const targetProjectId = 'p1111111-1111-1111-1111-111111111111'; // Project A in MOCK_PROJECTS
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ results: [] }), { status: 200, statusText: 'OK' });
      });

      const assessment = await noveltyAgent.runNoveltyCheck({
        projectId: targetProjectId,
        title: 'Low-cost detection of diabetic retinopathy from fundus images on edge devices',
        publicSummary: 'Developing a lightweight deep learning pipeline capable of running inference on low-power edge hardware...',
        creatorId: userId
      });

      const proofResults = assessment.results.filter(r => r.source === 'ProofResearch');
      const containsTargetId = proofResults.some(r => r.external_id === targetProjectId || r.id === `proof-${targetProjectId}`);
      
      expect(containsTargetId).toBe(false);
      expect(assessment.results.map(r => r.external_id)).not.toContain(targetProjectId);
    });

    it('10. Title-Independent Exclusion: Identical title/summary between Project A and B excludes A strictly by ID', async () => {
      const targetProjectId = 'p-project-a';
      const mockProjects = [
        {
          id: 'p-project-a',
          title: 'Autonomous Road Scene Perception System',
          public_summary: 'Computer vision pipeline for detecting vehicles and pedestrians on autonomous cars.',
          engagement_model: 'FUNDED',
          budget: 50000,
          currency: 'INR',
          status: 'OPEN',
          created_by: 'user-a',
          confidentiality_level: 'PUBLIC',
          created_at: '2026-10-06'
        },
        {
          id: 'p-project-b',
          title: 'Autonomous Road Scene Perception System',
          public_summary: 'Computer vision pipeline for detecting vehicles and pedestrians on autonomous cars.',
          engagement_model: 'FUNDED',
          budget: 50000,
          currency: 'INR',
          status: 'OPEN',
          created_by: 'user-b',
          confidentiality_level: 'PUBLIC',
          created_at: '2026-10-06'
        }
      ];

      vi.spyOn(projectService, 'getProjects').mockResolvedValue(mockProjects as any);
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ results: [] }), { status: 200, statusText: 'OK' });
      });

      const assessment = await noveltyAgent.runNoveltyCheck({
        projectId: targetProjectId,
        title: 'Autonomous Road Scene Perception System',
        publicSummary: 'Computer vision pipeline for detecting vehicles and pedestrians on autonomous cars.',
        creatorId: userId
      });

      const proofResults = assessment.results.filter(r => r.source === 'ProofResearch');
      expect(proofResults.some(r => r.external_id === 'p-project-a')).toBe(false);
      expect(proofResults.some(r => r.external_id === 'p-project-b')).toBe(true);
    });

    it('11. Single Project Isolation: When only target Project A exists, internal ProofResearch results count is 0', async () => {
      const singleProject = [
        {
          id: 'p-only-one',
          title: 'Unique Quantum Machine Learning Optimization',
          public_summary: 'Exploring variational quantum eigensolvers for chemical reaction simulation.',
          engagement_model: 'FUNDED',
          budget: 100000,
          currency: 'INR',
          status: 'OPEN',
          created_by: 'user-x',
          confidentiality_level: 'PUBLIC',
          created_at: '2026-10-06'
        }
      ];

      vi.spyOn(projectService, 'getProjects').mockResolvedValue(singleProject as any);
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ results: [] }), { status: 200, statusText: 'OK' });
      });

      const assessment = await noveltyAgent.runNoveltyCheck({
        projectId: 'p-only-one',
        title: 'Unique Quantum Machine Learning Optimization',
        publicSummary: 'Exploring variational quantum eigensolvers for chemical reaction simulation.',
        creatorId: userId
      });

      const proofResults = assessment.results.filter(r => r.source === 'ProofResearch');
      expect(proofResults.length).toBe(0);
      expect(assessment.highest_similarity).toBe(0);
    });

    it('12. High Content Similarity with Another Project: Other project appears, target project itself does not', async () => {
      const targetProjectId = 'p1111111-1111-1111-1111-111111111111';
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ results: [] }), { status: 200, statusText: 'OK' });
      });

      const assessment = await noveltyAgent.runNoveltyCheck({
        projectId: targetProjectId,
        title: 'Low-cost detection of diabetic retinopathy from fundus images on edge devices',
        publicSummary: 'Developing a lightweight deep learning pipeline capable of running inference on low-power edge hardware...',
        creatorId: userId
      });

      const returnedProjectIds = assessment.results.map(r => r.external_id);
      expect(returnedProjectIds).not.toContain(targetProjectId);
      expect(returnedProjectIds.every(id => id !== targetProjectId)).toBe(true);
    });

    it('13. Screenshot 90.3% Self-Match Verification: Target project cannot return 90.3% self-match score', async () => {
      const targetProjectId = 'p1111111-1111-1111-1111-111111111111';
      vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
        return new Response(JSON.stringify({ results: [] }), { status: 200, statusText: 'OK' });
      });

      const assessment = await noveltyAgent.runNoveltyCheck({
        projectId: targetProjectId,
        title: 'Low-cost detection of diabetic retinopathy from fundus images on edge devices',
        publicSummary: 'Developing a lightweight deep learning pipeline capable of running inference on low-power edge hardware (Raspberry Pi 4 / Jetson Nano) to detect diabetic retinopathy stage from raw fundus images in rural healthcare clinics.',
        creatorId: userId
      });

      const selfMatches = assessment.results.filter(r => r.external_id === targetProjectId || r.title === 'Low-cost detection of diabetic retinopathy from fundus images on edge devices');
      expect(selfMatches.length).toBe(0);
    });
  });
});
