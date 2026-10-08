import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { COIDeclaration } from '../types';
import { computeSHA256 } from '../lib/hash';

export const coiService = {
  /**
   * Submits or updates a Conflict of Interest (COI) declaration.
   */
  async submitCOIDeclaration(
    userId: string,
    projectId: string,
    hasConflict: boolean,
    conflictDetails: string = ''
  ): Promise<COIDeclaration> {
    const timestamp = new Date().toISOString();
    const coiRecord: COIDeclaration = {
      id: `coi-${Date.now()}`,
      user_id: userId,
      project_id: projectId,
      has_conflict: hasConflict,
      conflict_details: conflictDetails,
      status: 'DECLARED',
      declared_at: timestamp
    };

    if (isSupabaseConfigured) {
      try {
        await supabase
          .from('coi_declarations')
          .upsert(coiRecord, { onConflict: 'user_id,project_id' });
      } catch (err) {
        console.warn('COI declaration upsert error:', err);
      }
    }

    return coiRecord;
  },

  /**
   * Checks for duplicate verified identity hash to prevent multiple accounts per person.
   */
  async verifyUniqueIdentity(userId: string, nationalIdOrEmail: string): Promise<{ isValid: boolean; identityHash: string; reason?: string }> {
    const identityHash = computeSHA256(`ID_VERIFY_${nationalIdOrEmail.toLowerCase().trim()}`);

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabase
          .from('candidate_profiles')
          .select('user_id, identity_hash')
          .eq('identity_hash', identityHash)
          .neq('user_id', userId);

        if (data && data.length > 0) {
          return {
            isValid: false,
            identityHash,
            reason: 'DUPLICATE_IDENTITY_DETECTED: A verified profile already exists for this identity credential.'
          };
        }
      } catch (err) {
        console.warn('Identity uniqueness check error:', err);
      }
    }

    return { isValid: true, identityHash };
  }
};
