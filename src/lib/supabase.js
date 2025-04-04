import { createClient } from '@supabase/supabase-js';

// Use the provided Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vhblipebrprninrvqyyf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYmxpcGVicnBybmlucnZxeXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTUwMjcsImV4cCI6MjA1OTMzMTAyN30.m_tUUCVygwhN2YTYQwh-VADH4-bYz9sPxpTQhITS5KM';

// Log the Supabase configuration (don't log the full key in production)
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key available:', !!supabaseKey);

// Create the Supabase client with additional options
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Test the connection when the module is loaded
(async () => {
  try {
    const { data, error } = await supabase.from('wallets').select('count');
    if (error) {
      console.error('Error connecting to Supabase:', error);
    } else {
      console.log('Successfully connected to Supabase');
    }
  } catch (err) {
    console.error('Unexpected error testing Supabase connection:', err);
  }
})();

export default supabase;