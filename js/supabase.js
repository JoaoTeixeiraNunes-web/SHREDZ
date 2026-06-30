/**
 * Supabase client singleton.
 * Loads the supabase-js v2 UMD/ESM build from the CDN.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

if (SUPABASE_URL.includes('YOUR-PROJECT')) {
  console.warn(
    '[Shredz] Supabase is not configured. Edit js/config.js with your project URL and anon key.'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
