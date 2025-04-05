import { createClient } from '@supabase/supabase-js';

/**
 * Enhanced Supabase client with better error handling and connection management
 */

// Use the provided Supabase credentials from environment variables
// with fallback for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vhblipebrprninrvqyyf.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoYmxpcGVicnBybmlucnZxeXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM3NTUwMjcsImV4cCI6MjA1OTMzMTAyN30.m_tUUCVygwhN2YTYQwh-VADH4-bYz9sPxpTQhITS5KM';

// Log basic connection info in development
if (process.env.NODE_ENV !== 'production') {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key available:', !!supabaseKey);
}

// Enhanced client options for better performance and reliability
const options = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  // Better local caching strategy
  global: {
    headers: { 'x-application-name': 'crypto-tracker' },
  },
  // Improve data fetch performance
  db: {
    schema: 'public',
  },
  // Configurable request timeouts
  realtime: {
    timeout: 30000, // 30 seconds
  }
};

// Create the Supabase client with optimized options
const supabase = createClient(supabaseUrl, supabaseKey, options);

// Connection state management
let isConnected = false;
let connectionError = null;

// Helper function for error handling
const handleSupabaseError = (error, operation = 'operation') => {
  // Common error patterns
  if (error?.code === 'PGRST301') {
    console.error(`Row-level security policy violation during ${operation}`);
  } else if (error?.code?.startsWith('22')) {
    console.error(`Data type error during ${operation}: ${error.message}`);
  } else if (error?.code?.startsWith('23')) {
    console.error(`Constraint violation during ${operation}: ${error.message}`);
  } else {
    console.error(`Error during ${operation}:`, error);
  }
  
  // Return the error for caller handling
  return error;
};

// Wrapper function for common DB operations with error handling
export const supabaseQuery = async (operation, options = {}) => {
  try {
    const { table, query, data, id, column = 'id', errorMessage } = options;
    
    let result;
    
    switch (operation) {
      case 'select':
        result = await supabase.from(table).select(query || '*');
        break;
      case 'selectSingle':
        result = await supabase.from(table).select(query || '*').eq(column, id).single();
        break;
      case 'insert':
        result = await supabase.from(table).insert(data).select();
        break;
      case 'update':
        result = await supabase.from(table).update(data).eq(column, id).select();
        break;
      case 'delete':
        result = await supabase.from(table).delete().eq(column, id);
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
    
    if (result.error) {
      handleSupabaseError(result.error, `${operation} on ${table}`);
      throw new Error(errorMessage || `Error during ${operation} on ${table}: ${result.error.message}`);
    }
    
    return result.data;
  } catch (err) {
    console.error('Unexpected error in supabaseQuery:', err);
    throw err;
  }
};

// Test the connection when the module is loaded (only in browser)
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const { data, error } = await supabase.from('trading_wallets').select('count');
      if (error) {
        connectionError = error;
        isConnected = false;
        console.error('Error connecting to Supabase:', error);
      } else {
        isConnected = true;
        connectionError = null;
        console.log('Successfully connected to Supabase');
      }
    } catch (err) {
      connectionError = err;
      isConnected = false;
      console.error('Unexpected error testing Supabase connection:', err);
    }
  })();
}

// Export connection state and raw client for direct access when needed
export const getConnectionState = () => ({
  isConnected,
  connectionError
});

export default supabase;