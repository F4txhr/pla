import { createClient } from '@supabase/supabase-js';

// It's crucial to use environment variables for security and portability.
// These will be loaded from the .env.local file during local development
// and from Vercel's environment variables in production.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if the environment variables are set, and throw an error if not.
// This prevents the application from running with a misconfigured environment.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are not set. Please check your .env.local file or Vercel environment variables.");
}

// Initialize and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);