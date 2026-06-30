-- ============================================================
-- Shredz Season 1 - Row Level Security policies
-- Run AFTER schema.sql. This is the REAL authorization layer.
-- ============================================================

-- Helper: is the current auth user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Enable RLS everywhere
alter table public.users              enable row level security;
alter table public.habits             enable row level security;
alter table public.daily_submissions  enable row level security;
alter table public.transactions       enable row level security;
alter table public.weekly_challenges  enable row level security;
alter table public.challenge_results  enable row level security;
alter table public.votes              enable row level security;
alter table public.vote_options       enable row level security;
alter table public.vote_responses     enable row level security;
alter table public.notifications      enable row level security;
alter table public.achievements       enable row level security;
alter table public.badges             enable row level security;

-- ---------- USERS ----------
-- Everyone authenticated can read profiles (needed for leaderboard).
create policy users_read on public.users
  for select to authenticated using (true);
-- Users may update only their own profile; admins may update anyone.
create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- Only admins may insert profile rows (handled normally by a trigger/seed).
create policy users_admin_insert on public.users
  for insert to authenticated with check (public.is_admin());

-- ---------- HABITS ----------
create policy habits_read on public.habits
  for select to authenticated using (true);
create policy habits_admin_write on public.habits
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- DAILY SUBMISSIONS ----------
create policy sub_read on public.daily_submissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy sub_insert_self on public.daily_submissions
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy sub_admin_update on public.daily_submissions
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- TRANSACTIONS ----------
-- Read your own; admins read all. Writes happen only via SECURITY DEFINER RPCs.
create policy tx_read on public.transactions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy tx_admin_write on public.transactions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- WEEKLY CHALLENGES ----------
create policy ch_read on public.weekly_challenges
  for select to authenticated using (true);
create policy ch_admin_write on public.weekly_challenges
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy chres_read on public.challenge_results
  for select to authenticated using (true);
create policy chres_admin_write on public.challenge_results
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- VOTES ----------
create policy votes_read on public.votes
  for select to authenticated using (true);
create policy votes_admin_write on public.votes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy vopt_read on public.vote_options
  for select to authenticated using (true);
create policy vopt_admin_write on public.vote_options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Vote responses: read all (to tally), insert only your own single response.
create policy vresp_read on public.vote_responses
  for select to authenticated using (true);
create policy vresp_insert_self on public.vote_responses
  for insert to authenticated with check (voter_id = auth.uid());

-- ---------- NOTIFICATIONS ----------
create policy notif_read on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy notif_update_self on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_admin_insert on public.notifications
  for insert to authenticated with check (public.is_admin());

-- ---------- ACHIEVEMENTS / BADGES ----------
create policy ach_read on public.achievements
  for select to authenticated using (true);
create policy ach_admin_write on public.achievements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy badge_read on public.badges
  for select to authenticated using (true);
create policy badge_admin_write on public.badges
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
