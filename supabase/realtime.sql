-- ============================================================
-- Shredz Season 1 - Enable Realtime
-- Run this so the app updates live (no page refresh).
-- ============================================================
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.daily_submissions;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.users;
alter publication supabase_realtime add table public.weekly_challenges;
alter publication supabase_realtime add table public.challenge_results;
alter publication supabase_realtime add table public.votes;
alter publication supabase_realtime add table public.vote_responses;
