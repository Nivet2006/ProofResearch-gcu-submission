import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AccessLog } from '../types';
import { computeSHA256 } from '../lib/hash';

export const accessLogService = {
  /**
   * Records an artifact view/download access event (Insider Theft Protection).
   */
  async logAccess(params: {
    userId: string;
    projectId: string;
    artifactId: string;
    artifactType: 'CONFIDENTIAL_BRIEF' | 'SUBMISSION' | 'CONTRIBUTION_EVIDENCE' | 'DATASET' | 'CODE_ARTIFACT';
    action: 'VIEW' | 'DOWNLOAD' | 'EXPORT';
  }): Promise<AccessLog> {
    const timestamp = new Date().toISOString();
    const logId = `acc-${Date.now()}`;

    const logRecord: AccessLog = {
      id: logId,
      user_id: params.userId,
      project_id: params.projectId,
      artifact_id: params.artifactId,
      artifact_type: params.artifactType,
      action: params.action,
      ip_address: '127.0.0.1',
      user_agent: 'ProofResearch Secure Client v1.0',
      created_at: timestamp
    };

    if (isSupabaseConfigured) {
      try {
        await supabase.from('access_logs').insert(logRecord);
      } catch (err) {
        console.warn('Failed to insert access log to Supabase:', err);
      }
    }

    return logRecord;
  },

  /**
   * Generates a deterministic per-viewer digital watermark / fingerprint payload.
   */
  generateWatermark(userId: string, userEmail: string, artifactId: string): string {
    const timestamp = new Date().toISOString();
    const rawFingerprint = `${userId}:${userEmail}:${artifactId}:${timestamp}`;
    const hash = computeSHA256(rawFingerprint).substring(0, 16);
    return `PROOFRESEARCH-CONFIDENTIAL | VIEWER: ${userEmail} (${userId.substring(0, 8)}) | FINGERPRINT: ${hash} | ${timestamp}`;
  }
};
