import { Submission, EvidenceItem } from '../types';
import { computeSHA256 } from '../lib/hash';
import { ledgerService } from './ledgerService';

export interface IntegrityReport {
  submissionId: string;
  similarityScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  integrityStatus: 'CLEAN' | 'REQUIRES_HUMAN_REVIEW' | 'REJECTED';
  matchedSubmissionId?: string;
  overlappingPassages: string[];
  suspiciousPatternAlerts: string[];
  contentHash: string;
  checkedAt: string;
}

export const integrityAgent = {
  /**
   * Integrity Agent: Performs text similarity, content hash comparison, duplicate detection,
   * and rule-based pattern analysis on submitted work.
   * AI Flags Suspicious Work -> Human Reviewer Investigates & Decides -> Ledger Records.
   */
  async checkSubmissionIntegrity(
    currentSubmission: { id: string; title: string; content: string; projectId: string },
    existingSubmissions: Submission[] = [],
    evidenceItems: EvidenceItem[] = []
  ): Promise<IntegrityReport> {
    const timestamp = new Date().toISOString();
    const contentHash = computeSHA256(currentSubmission.content);
    const textLower = currentSubmission.content.toLowerCase();
    const currentTokens = new Set((currentSubmission.content || '').toLowerCase().split(/\s+/).filter(w => w.length > 3));

    let maxSimilarity = 0.00;
    let matchedId: string | undefined = undefined;
    const overlappingPassages: string[] = [];
    const suspiciousPatternAlerts: string[] = [];

    // 1. Content Hash Duplicate Check
    const exactHashMatch = existingSubmissions.find(
      s => s.id !== currentSubmission.id && s.content_hash === contentHash
    );

    if (exactHashMatch) {
      maxSimilarity = 100.00;
      matchedId = exactHashMatch.id;
      overlappingPassages.push('Exact 100% duplicate content hash match detected against prior submission.');
      suspiciousPatternAlerts.push('CRITICAL: Duplicate deliverable submission detected.');
    } else {
      // 2. Token & N-Gram Similarity Analysis against existing submissions
      for (const prev of existingSubmissions) {
        if (prev.id === currentSubmission.id) continue;
        const prevTextLower = (prev.content || '').toLowerCase();
        
        const sim = this.calculateTokenSimilarity(currentTokens, prevTextLower);
        if (sim > maxSimilarity) {
          maxSimilarity = sim;
          matchedId = prev.id;
        }

        if (sim > 40) {
          overlappingPassages.push(`Overlapping section detected (${sim.toFixed(1)}% match with submission "${prev.title}").`);
        }
        if (sim >= 75) {
          suspiciousPatternAlerts.push(`High content similarity (${sim.toFixed(1)}%) detected against prior submission "${prev.title}".`);
        }
      }
    }

    // 3. Evidence Hash Match Check
    const evidenceHashMatch = evidenceItems.find(e => e.content_hash === contentHash);
    if (evidenceHashMatch) {
      suspiciousPatternAlerts.push(`Content hash matches existing evidence artifact "${evidenceHashMatch.title}".`);
    }

    // 4. Rule-Based Suspicious Pattern Checks (Gated behind mock/demo mode for production accuracy)
    const isDemoMode = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_USE_MOCK_DATA === 'true') ||
                       (typeof process !== 'undefined' && process.env.VITE_USE_MOCK_DATA === 'true');
    if (isDemoMode && textLower.includes('clahe') && textLower.includes('tflite') && textLower.includes('preprocessing')) {
      if (maxSimilarity === 0) maxSimilarity = 87.00;
      overlappingPassages.push('87% similarity detected with open-source pre-processing reference code (MedVision IRB baseline).');
      suspiciousPatternAlerts.push('Code uses open-source reference pipeline without explicit attribution header.');
    }

    // Determine Risk & Status (NEVER auto-accuses or auto-rejects; flags for human review)
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    let integrityStatus: 'CLEAN' | 'REQUIRES_HUMAN_REVIEW' | 'REJECTED' = 'CLEAN';

    if (maxSimilarity >= 75.00 || suspiciousPatternAlerts.length > 0) {
      riskLevel = 'HIGH';
      integrityStatus = 'REQUIRES_HUMAN_REVIEW';
    } else if (maxSimilarity >= 40.00) {
      riskLevel = 'MEDIUM';
      integrityStatus = 'REQUIRES_HUMAN_REVIEW';
    }

    const report: IntegrityReport = {
      submissionId: currentSubmission.id,
      similarityScore: parseFloat(maxSimilarity.toFixed(2)),
      riskLevel,
      integrityStatus,
      matchedSubmissionId: matchedId,
      overlappingPassages,
      suspiciousPatternAlerts,
      contentHash,
      checkedAt: timestamp
    };

    // Log integrity check in ledger
    if (integrityStatus === 'REQUIRES_HUMAN_REVIEW') {
      try {
        await ledgerService.appendEntry({
          projectId: currentSubmission.projectId,
          actorId: 'system-integrity-agent',
          action: 'INTEGRITY_FLAGGED',
          entityType: 'SUBMISSION',
          entityId: currentSubmission.id,
          payload: {
            similarity_score: report.similarityScore,
            risk_level: report.riskLevel,
            integrity_status: report.integrityStatus,
            alerts_count: report.suspiciousPatternAlerts.length
          }
        });
      } catch (ledgerErr) {
        console.warn('Failed to record integrity check in ledger:', ledgerErr);
      }
    }

    return report;
  },

  /**
   * Helper function calculating Jaccard / Token overlap similarity ratio (0 to 100%)
   */
  calculateTokenSimilarity(tokens1Input: Set<string> | string, str2: string): number {
    if (!tokens1Input || !str2) return 0;
    const tokens1 = typeof tokens1Input === 'string'
      ? new Set(tokens1Input.toLowerCase().split(/\s+/).filter(w => w.length > 3))
      : tokens1Input;
    const tokens2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    let intersection = 0;
    tokens1.forEach(t => {
      if (tokens2.has(t)) intersection++;
    });

    const union = tokens1.size + tokens2.size - intersection;
    return parseFloat(((intersection / union) * 100).toFixed(2));
  }
};
