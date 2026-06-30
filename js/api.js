/**
 * Data access layer. All Supabase queries live here so pages stay thin.
 * RLS in the database is the real authority; these helpers just shape data.
 */
import { supabase } from './supabase.js';

/* ---------------- Users ---------------- */
export async function listUsers({ includeAdmin = false } = {}) {
  let q = supabase.from('users').select('*').order('points', { ascending: false });
  if (!includeAdmin) q = q.eq('role', 'user');
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getUser(id) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(id, patch) {
  const { error } = await supabase.from('users').update(patch).eq('id', id);
  if (error) throw error;
}

/* ---------------- Leaderboard ---------------- */
export async function leaderboard() {
  const users = await listUsers();
  return users.map((u, i) => ({ ...u, rank: i + 1 }));
}

/* ---------------- Habits ---------------- */
export async function listHabits() {
  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('active', true)
    .order('points', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createHabit(habit) {
  const { error } = await supabase.from('habits').insert(habit);
  if (error) throw error;
}

export async function setHabitActive(id, active) {
  const { error } = await supabase.from('habits').update({ active }).eq('id', id);
  if (error) throw error;
}

/* ---------------- Daily submissions ---------------- */
export async function submitCheckin(userId, habit) {
  const { error } = await supabase.from('daily_submissions').insert({
    user_id: userId,
    habit_id: habit.id,
    habit_title: habit.title,
    points: habit.points,
    status: 'pending',
  });
  if (error) throw error;
}

export async function mySubmissions(userId) {
  const { data, error } = await supabase
    .from('daily_submissions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function pendingSubmissions() {
  const { data, error } = await supabase
    .from('daily_submissions')
    .select('*, users(display_name, avatar_url)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

/* ---------------- Transactions / points engine ---------------- */
/**
 * Award (or revoke with negative points) via an RPC that atomically
 * computes the running balance and updates the user's total. See schema.sql.
 */
export async function awardPoints({ userId, title, description, points, category }) {
  const { error } = await supabase.rpc('award_points', {
    p_user: userId,
    p_title: title,
    p_description: description || '',
    p_points: points,
    p_category: category || 'bonus',
  });
  if (error) throw error;
}

export async function notifyAll(title, body, type = 'info') {
  const { error } = await supabase.rpc('notify_all', {
    p_title: title,
    p_body: body || '',
    p_type: type,
  });
  if (error) throw error;
}

export async function resetAllData() {
  const { error } = await supabase.rpc('reset_all_data');
  if (error) throw error;
}

export async function approveSubmission(submissionId) {
  const { error } = await supabase.rpc('approve_submission', { p_submission: submissionId });
  if (error) throw error;
}

export async function rejectSubmission(submissionId) {
  const { error } = await supabase
    .from('daily_submissions')
    .update({ status: 'rejected' })
    .eq('id', submissionId);
  if (error) throw error;
}

export async function listTransactions(userId, { category } = {}) {
  let q = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (category && category !== 'all') q = q.eq('category', category);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/* ---------------- Weekly challenges ---------------- */
export async function listChallenges() {
  const { data, error } = await supabase
    .from('weekly_challenges')
    .select('*, challenge_results(*, users(display_name, avatar_url))')
    .order('start_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createChallenge(c) {
  const { error } = await supabase.from('weekly_challenges').insert(c);
  if (error) throw error;
}

export async function finalizeChallenge(challengeId, winners) {
  // winners: [{ user_id, place, points }]
  const { error } = await supabase.rpc('finalize_challenge', {
    p_challenge: challengeId,
    p_winners: winners,
  });
  if (error) throw error;
}

/* ---------------- Voting ---------------- */
export async function listVotes() {
  const { data, error } = await supabase
    .from('votes')
    .select('*, vote_options(*, users(display_name, avatar_url)), vote_responses(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createVote(vote, options) {
  const { data, error } = await supabase.from('votes').insert(vote).select().single();
  if (error) throw error;
  const rows = options.map((o) => ({ ...o, vote_id: data.id }));
  const { error: e2 } = await supabase.from('vote_options').insert(rows);
  if (e2) throw e2;
  return data;
}

export async function castVote({ voteId, optionId, voterId, rating }) {
  const { error } = await supabase.from('vote_responses').insert({
    vote_id: voteId,
    option_id: optionId,
    voter_id: voterId,
    rating: rating ?? null,
  });
  if (error) throw error;
}

/* ---------------- Notifications ---------------- */
export async function listNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(40);
  if (error) throw error;
  return data;
}

export async function markAllRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

/* ---------------- Storage ---------------- */
export async function uploadImage(bucket, file, pathPrefix = '') {
  const ext = file.name.split('.').pop();
  const path = `${pathPrefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/* ---------------- Realtime ---------------- */
export function subscribeNotifications(userId, cb) {
  return supabase
    .channel(`notif-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      cb
    )
    .subscribe();
}

export function subscribeTable(table, cb) {
  return supabase
    .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, cb)
    .subscribe();
}
