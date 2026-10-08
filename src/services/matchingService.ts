import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { MatchingResult } from '../types';
import { matchingAgent } from './matchingAgent';

export const matchingService = {
  /**
   * Evaluates candidates for a project using project-configurable approved requirement sets.
   * Returns candidates sorted strictly descending by match_score.
   */
  async getMatchingResults(projectId: string): Promise<MatchingResult[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('matching_results')
          .select('*, candidate_profile:candidate_id(*, profile:user_id(*))')
          .eq('project_id', projectId)
          .order('match_score', { ascending: false });

        if (data && !error && data.length > 0) {
          return data as MatchingResult[];
        }
      } catch (err) {
        console.warn('DB matching_results fetch error, invoking dynamic matching engine', err);
      }
    }

    // Dynamic calculated evaluation using project-agnostic matching agent
    return matchingAgent.rankCandidates(projectId);
  }
};
