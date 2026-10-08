import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://baxfdiyebvpztataijey.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJheGZkaXllYnZwenRhdGFpamV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTg3MzEsImV4cCI6MjEwNjc5NDczMX0.X4TvqPOhdAx-7GHVjnLJbKSRMpRPPsGWRxZ2nvsoFfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'sponsor@medvision.io',
    password: 'Password123!'
  });

  console.log('Logged in user ID:', auth.user?.id);

  const { data, error } = await supabase
    .from('projects')
    .update({ status: 'DRAFT' })
    .eq('id', '10000000-0000-0000-0000-000000000001')
    .select();

  console.log('Update result:', data, 'Error:', error);
}

testUpdate();
