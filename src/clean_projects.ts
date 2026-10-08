import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://baxfdiyebvpztataijey.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheGZkaXllYnZwenRhdGFpamV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTg3MzEsImV4cCI6MjEwNjc5NDczMX0.X4TvqPOhdAx-7GHVjnLJbKSRMpRPPsGWRxZ2nvsoFfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanProjects() {
  await supabase.auth.signInWithPassword({
    email: 'sponsor@medvision.io',
    password: 'Password123!'
  });

  const { data: projects } = await supabase.from('projects').select('*');
  console.log('Projects currently in Supabase:', projects);

  if (projects && projects.length > 0) {
    for (const p of projects) {
      const { error } = await supabase.from('projects').delete().eq('id', p.id);
      console.log(`Deleting project ${p.id}:`, error ? error.message : 'SUCCESS');
    }
  }

  const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
  console.log('Projects count after delete attempt:', count);
}

cleanProjects();
