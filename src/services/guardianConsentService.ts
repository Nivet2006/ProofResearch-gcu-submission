import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MOCK_USERS } from '../data/mockData';
import { ledgerService } from './ledgerService';
import { projectService } from './projectService';

export interface GuardianConsentRecord {
  id: string;
  participant_id: string;
  project_id: string;
  charter_version: string;
  engagement_model: string;
  status: 'PENDING' | 'GRANTED' | 'DECLINED';
  guardian_name?: string;
  guardian_email?: string;
  consented_at?: string;
  created_at: string;
}

// In-memory store for demo/mock mode
const mockConsentsStore: Record<string, GuardianConsentRecord> = {};
const mockMinorUsers: Set<string> = new Set(['u-minor-001', 'u-minor-rahul']);

export const guardianConsentService = {
  /**
   * Reset in-memory consents store for clean test isolation.
   */
  resetStore(): void {
    Object.keys(mockConsentsStore).forEach(k => delete mockConsentsStore[k]);
    mockMinorUsers.clear();
    mockMinorUsers.add('u-minor-001');
    mockMinorUsers.add('u-minor-rahul');
  },

  /**
   * Check if a user is a minor (under 18).
   */
  async checkMinorStatus(userId: string): Promise<{ isMinor: boolean; age: number }> {
    if (mockMinorUsers.has(userId)) {
      return { isMinor: true, age: 17 };
    }
    return { isMinor: false, age: 21 };
  },

  /**
   * Set user minor status for testing/demo scenarios.
   */
  setMinorStatus(userId: string, isMinor: boolean): void {
    if (isMinor) {
      mockMinorUsers.add(userId);
    } else {
      mockMinorUsers.delete(userId);
    }
  },

  /**
   * Request guardian consent for an under-18 participant on a paid project.
   */
  async requestGuardianConsent(
    projectId: string,
    participantId: string,
    charterVersion: string = 'v1.0',
    engagementModel: string = 'FUNDED'
  ): Promise<GuardianConsentRecord> {
    const timestamp = new Date().toISOString();
    const consentId = `gc-${Date.now()}`;

    const record: GuardianConsentRecord = {
      id: consentId,
      participant_id: participantId,
      project_id: projectId,
      charter_version: charterVersion,
      engagement_model: engagementModel,
      status: 'PENDING',
      created_at: timestamp
    };

    mockConsentsStore[`${projectId}_${participantId}_${charterVersion}`] = record;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('guardian_consents').insert({
          id: record.id,
          participant_id: record.participant_id,
          project_id: record.project_id,
          charter_version: record.charter_version,
          engagement_model: record.engagement_model,
          status: record.status
        });
      } catch (err) {
        console.warn('Guardian consent insert error', err);
      }
    }

    await ledgerService.appendEntry({
      projectId,
      actorId: participantId,
      action: 'GUARDIAN_CONSENT_REQUESTED',
      entityType: 'GUARDIAN_CONSENT',
      entityId: consentId,
      payload: {
        participant_id: participantId,
        project_id: projectId,
        charter_version: charterVersion,
        engagement_model: engagementModel,
        status: 'PENDING',
        timestamp
      }
    });

    return record;
  },

  /**
   * Grant or decline guardian consent.
   */
  async grantGuardianConsent(
    projectId: string,
    participantId: string,
    guardianName: string,
    guardianEmail: string,
    decision: 'GRANT' | 'DECLINE' = 'GRANT',
    charterVersion: string = 'v1.0'
  ): Promise<GuardianConsentRecord> {
    const key = `${projectId}_${participantId}_${charterVersion}`;
    let record = mockConsentsStore[key];

    const timestamp = new Date().toISOString();
    const newStatus = decision === 'GRANT' ? 'GRANTED' : 'DECLINED';

    if (!record) {
      record = {
        id: `gc-${Date.now()}`,
        participant_id: participantId,
        project_id: projectId,
        charter_version: charterVersion,
        engagement_model: 'FUNDED',
        status: newStatus,
        guardian_name: guardianName,
        guardian_email: guardianEmail,
        consented_at: timestamp,
        created_at: timestamp
      };
    } else {
      record.status = newStatus;
      record.guardian_name = guardianName;
      record.guardian_email = guardianEmail;
      record.consented_at = timestamp;
    }

    mockConsentsStore[key] = record;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('guardian_consents').update({
          status: newStatus,
          guardian_name: guardianName,
          guardian_email: guardianEmail,
          consented_at: timestamp
        }).eq('project_id', projectId).eq('participant_id', participantId).eq('charter_version', charterVersion);
      } catch (err) {
        console.warn('Guardian consent update error', err);
      }
    }

    await ledgerService.appendEntry({
      projectId,
      actorId: participantId,
      action: decision === 'GRANT' ? 'GUARDIAN_CONSENT_GRANTED' : 'GUARDIAN_CONSENT_DECLINED',
      entityType: 'GUARDIAN_CONSENT',
      entityId: record.id,
      payload: {
        participant_id: participantId,
        project_id: projectId,
        charter_version: charterVersion,
        status: newStatus,
        guardian_name: guardianName,
        timestamp
      }
    });

    return record;
  },

  /**
   * Verifies if a participant has valid guardian consent for paid participation under a specific charter version.
   * If user is an adult or project is unpaid: returns true.
   * If user is a minor on a paid project: requires GRANTED status for the exact charter version.
   */
  async hasGuardianConsent(projectId: string, participantId: string, charterVersion: string = 'v1.0'): Promise<boolean> {
    const { isMinor } = await this.checkMinorStatus(participantId);
    if (!isMinor) return true;

    const project = await projectService.getProjectById(projectId);
    if (project && (project.engagement_model === 'KNOWLEDGE_SHARING' || project.engagement_model === 'INSTITUTIONAL_CREDIT')) {
      return true;
    }

    const key = `${projectId}_${participantId}_${charterVersion}`;
    const record = mockConsentsStore[key];

    if (record && record.status === 'GRANTED') {
      return true;
    }

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('guardian_consents')
          .select('status')
          .eq('project_id', projectId)
          .eq('participant_id', participantId)
          .eq('charter_version', charterVersion)
          .eq('status', 'GRANTED')
          .single();
        if (data) return true;
      } catch (err) {
        console.warn('Guardian consent fetch error', err);
      }
    }

    return false;
  }
};
