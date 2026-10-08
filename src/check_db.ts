import { supabase } from './lib/supabase';

async function checkDatabase() {
  console.log('--- Checking Supabase Counts ---');
  
  const tables = [
    'users',
    'candidate_profiles',
    'projects',
    'project_confidential',
    'project_members',
    'charters',
    'charter_acceptances',
    'milestones',
    'contributions',
    'evidence_items',
    'submissions',
    'reviews',
    'ai_actions',
    'matching_results',
    'escrow_accounts',
    'reward_allocations',
    'milestone_disputes',
    'guardian_consents',
    'commercialisation_events',
    'project_ledger'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table ${table}: ERROR (${error.message})`);
      } else {
        console.log(`Table ${table}: ${count ?? 0} rows`);
      }
    } catch (err: any) {
      console.log(`Table ${table}: EXCEPTION (${err.message})`);
    }
  }
}

checkDatabase();
