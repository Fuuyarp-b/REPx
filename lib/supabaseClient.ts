import { createClient } from '@supabase/supabase-js';

// Declare process to satisfy TypeScript
declare const process: {
  env: {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  }
};

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Fail-safe Mechanism:
// Check if credentials exist and are not empty strings (due to fallback logic in vite config)
const isValid = !!supabaseUrl && supabaseUrl !== '' && !!supabaseKey && supabaseKey !== '';

const clientUrl = isValid ? supabaseUrl : 'https://placeholder.supabase.co';
const clientKey = isValid ? supabaseKey : 'placeholder';

if (!isValid) {
  console.warn('⚠️ Supabase credentials are missing. Using placeholder client. Data will NOT be saved to cloud.');
}

export const isSupabaseConfigured = isValid;
export const supabase = createClient(clientUrl, clientKey);