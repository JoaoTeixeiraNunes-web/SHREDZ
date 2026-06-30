/**
 * Authentication helpers built on Supabase Auth.
 *
 * Security model:
 *  - Supabase Auth handles password hashing server-side.
 *  - Each auth user has a matching row in `public.users` with a `role`.
 *  - Real authorization is enforced by RLS policies in the database.
 *    The guards here are UX only (redirects), never the security boundary.
 */
import { supabase } from './supabase.js';

let _profileCache = null;

/** Returns the current Supabase auth session or null. */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

/** Sign in with email + password. */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  _profileCache = null;
  return data;
}

export async function signOut() {
  _profileCache = null;
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

/** Loads the public.users profile row for the logged-in user. */
export async function getProfile(force = false) {
  if (_profileCache && !force) return _profileCache;
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();
  if (error) {
    console.error('[auth] failed to load profile', error);
    return null;
  }
  _profileCache = data;
  return data;
}

export async function isAdmin() {
  const p = await getProfile();
  return !!p && p.role === 'admin';
}

/**
 * Page guard. Call at the top of every protected page.
 * @param {{ admin?: boolean }} opts
 * @returns {Promise<object|null>} the profile, or redirects.
 */
export async function requireAuth(opts = {}) {
  const session = await getSession();
  if (!session) {
    window.location.replace('login.html');
    return null;
  }
  const profile = await getProfile();
  if (!profile) {
    await signOut();
    return null;
  }
  if (opts.admin && profile.role !== 'admin') {
    window.location.replace('dashboard.html');
    return null;
  }
  return profile;
}
