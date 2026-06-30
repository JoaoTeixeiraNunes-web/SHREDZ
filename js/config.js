/**
 * Shredz Season 1 - configuration.
 *
 * Fill these in with YOUR Supabase project values.
 * Find them in: Supabase Dashboard -> Project Settings -> API
 *
 * NOTE: The anon (public) key is SAFE to expose in a static site.
 * Your data is protected by Row Level Security (RLS), not by hiding this key.
 * NEVER put the service_role key here.
 */
export const SUPABASE_URL = 'https://qjzdzlmlsvketfcjcbaj.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_DG8w9dSbp7l48GN4a-jzmw_vjIXBcwd';

/** Email shown to users for sending check-in proof. */
export const PROOF_EMAIL = 'test@gmail.com';

/** Storage buckets (created in Supabase Storage). */
export const BUCKETS = {
  avatars: 'avatars',
  votes: 'vote-images',
  progress: 'progress-photos',
  challenges: 'challenge-banners',
};
