import { createClient } from '@supabase/supabase-js';

// Use the provided Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vhblipebrprninrvqyyf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYmxpcGVicnBybmlucnZxeXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTUwMjcsImV4cCI6MjA1OTMzMTAyN30.m_tUUCVygwhN2YTYQwh-VADH4-bYz9sPxpTQhITS5KM';

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;