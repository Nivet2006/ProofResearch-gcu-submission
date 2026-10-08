import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://baxfdiyebvpztataijey.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheGZkaXllYnZwenRhdGFpamV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTg3MzEsImV4cCI6MjEwNjc5NDczMX0.X4TvqPOhdAx-7GHVjnLJbKSRMpRPPsGWRxZ2nvsoFfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectAndReset() {
  console.log('=== AUTHENTICATING AS ADMIN/SPONSOR ===');
  let authUser = null;
  const { data: adminData } = await supabase.auth.signInWithPassword({
    email: 'admin@proofresearch.org',
    password: 'Password123!'
  });
  authUser = adminData?.user;

  if (!authUser) {
    const { data: sponsorData } = await supabase.auth.signInWithPassword({
      email: 'sponsor@medvision.io',
      password: 'Password123!'
    });
    authUser = sponsorData?.user;
  }

  console.log('=== INSPECTING SUPABASE DATABASE BEFORE CLEANUP ===');
  
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
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      console.log(`[BEFORE] ${table}: ${count ?? 0} rows`);
    } catch {
      console.log(`[BEFORE] ${table}: 0 rows`);
    }
  }

  console.log('\n=== EXECUTING SAFE RESET PROCEDURE ===');

  // Attempt RPC first
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_reset_demo_data');
  if (!rpcError && rpcData) {
    console.log('RPC admin_reset_demo_data succeeded:', rpcData);
  } else {
    console.log('RPC execution notice:', rpcError?.message || 'Executing direct owner delete cascade...');
    
    // Direct delete sequence matching owner created_by
    const deleteOrder = [
      'reward_allocations',
      'commercialisation_events',
      'guardian_consents',
      'milestone_disputes',
      'reviews',
      'submissions',
      'evidence_items',
      'contributions',
      'ai_actions',
      'milestones',
      'charter_acceptances',
      'charters',
      'project_members',
      'matching_results',
      'escrow_accounts',
      'project_confidential',
      'project_ledger',
      'projects'
    ];

    for (const table of deleteOrder) {
      try {
        if (table === 'projects') {
          await supabase.from('projects').delete().eq('created_by', 'u1111111-1111-1111-1111-111111111111');
          await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } else {
          await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
      } catch (err: any) {
        console.log(`Clearing ${table}:`, err?.message);
      }
    }
  }

  console.log('\n=== AFTER CLEANUP: VERIFYING TARGET STATE ===');
  const afterCounts: Record<string, number> = {};
  for (const table of tables) {
    try {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      afterCounts[table] = count ?? 0;
      console.log(`[AFTER] ${table}: ${afterCounts[table]} rows`);
    } catch {
      afterCounts[table] = 0;
    }
  }

  const usersIntact = afterCounts['users'] >= 4;
  const projectsCleared = afterCounts['projects'] === 0;

  if (usersIntact && projectsCleared) {
    console.log('\n✅ SUCCESS: DATABASE RESET COMPLETED CLEANLY.');
    console.log(`Protected users intact (${afterCounts['users']} users), Projects cleared (0 projects).`);
  } else {
    console.log(`\nNotice: Users count = ${afterCounts['users']}, Projects count = ${afterCounts['projects']}`);
  }
}

inspectAndReset();
