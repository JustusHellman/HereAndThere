
import { createClient } from '@supabase/supabase-js';

/**
 * We use placeholders to prevent the createClient function from throwing 
 * an 'URL is required' error during initial load when environment 
 * variables haven't been configured yet (e.g., before GitHub Secrets are set).
 */
const supabaseUrl = process.env.HERE_AND_THERE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.HERE_AND_THERE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * This flag allows the UI to show a helpful "Configuration Required" 
 * state instead of simply failing silently.
 */
export const isSupabaseConfigured = !!(
  process.env.HERE_AND_THERE_SUPABASE_URL && 
  process.env.HERE_AND_THERE_SUPABASE_URL !== '' &&
  process.env.HERE_AND_THERE_SUPABASE_ANON_KEY &&
  process.env.HERE_AND_THERE_SUPABASE_ANON_KEY !== ''
);

if (!isSupabaseConfigured) {
  console.warn("Supabase is not configured. Using placeholder URL. Ensure HERE_AND_THERE_SUPABASE_URL and HERE_AND_THERE_SUPABASE_ANON_KEY are set in GitHub Secrets.");
} else {
  console.log("Supabase configuration detected successfully.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Legacy helper maintained for compatibility with previous versions.
 */
export const updateSupabaseConfig = (url: string, key: string) => {
  console.warn("Supabase configuration is now handled via Environment Variables (HERE_AND_THERE_SUPABASE_URL and HERE_AND_THERE_SUPABASE_ANON_KEY).");
};
