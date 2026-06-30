-- ============================================================
-- Shredz Season 1 - Seed / sample data
-- Run LAST, after schema.sql, policies.sql, functions.sql, and after
-- creating the 7 Auth users. The UUIDs below MUST match Auth user IDs.
--
-- Safe to re-run: it cleans the relevant tables first.
-- ============================================================

-- ---- User id reference (edit here if you recreate auth users) ----
-- admin1  6328ee1f-3d9e-45bb-a82e-5e3a901c8731
-- joao    2a845d43-4860-4407-9a2d-a2f7c9979bee
-- alex    03c124af-4838-405e-b7d6-3dc597f4c484
-- angus   eae5f6d4-26da-4e87-8748-942dd5f239a2
-- rory    53fcaf08-0100-4138-895f-364cc5de8962
-- jaxon   044b709c-f96b-4a9c-b8a8-41d141c33983
-- michael b4144849-e0b7-4bfc-8137-72ff5bccaffe

begin;

-- Clean (children first) so this script is idempotent
delete from public.vote_responses;
delete from public.vote_options;
delete from public.votes;
delete from public.challenge_results;
delete from public.weekly_challenges;
delete from public.daily_submissions;
delete from public.transactions;
delete from public.notifications;
delete from public.achievements;
delete from public.badges;
delete from public.habits;
delete from public.users;
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','53fcaf08-0100-4138-895f-364cc5de8962','https://images.unsplash.com/photo-1594381898411-846e7d193883?w=600&q=80','Rory');

-- ============================================================
-- NOTIFICATIONS (a few per user)
-- ============================================================
insert into public.notifications (user_id, title, body, type, read, created_at) values
  ('2a845d43-4860-4407-9a2d-a2f7c9979bee','Points Approved','Sleep 8 Hours (+150 pts)','success', false, now()-interval '6 day'),
  ('2a845d43-4860-4407-9a2d-a2f7c9979bee','Vote Created','Funniest Gym Photo is live - cast your vote!','info', false, now()-interval '4 hour'),
  ('2a845d43-4860-4407-9a2d-a2f7c9979bee','Challenge Started','Summer Shred Sprint has begun','info', true, now()-interval '2 day'),
  ('03c124af-4838-405e-b7d6-3dc597f4c484','Points Revoked','Missed weigh-in (-250 pts)','penalty', false, now()-interval '9 day'),
  ('03c124af-4838-405e-b7d6-3dc597f4c484','Vote Ending Soon','Funniest Gym Photo ends in under 24h','info', false, now()-interval '1 hour'),
  ('eae5f6d4-26da-4e87-8748-942dd5f239a2','Bonus Awarded','Most Consistent winner (+250 pts)','success', false, now()-interval '3 day'),
  ('53fcaf08-0100-4138-895f-364cc5de8962','Challenge Started','Summer Shred Sprint has begun','info', true, now()-interval '2 day'),
  ('044b709c-f96b-4a9c-b8a8-41d141c33983','Points Approved','Sleep 8 Hours (+150 pts)','success', false, now()-interval '2 day'),
  ('b4144849-e0b7-4bfc-8137-72ff5bccaffe','Points Approved','Protein Goal (+100 pts)','success', true, now()-interval '1 day');

-- ============================================================
-- ACHIEVEMENTS & BADGES (sample)
-- ============================================================
insert into public.achievements (user_id, title, description, icon) values
  ('2a845d43-4860-4407-9a2d-a2f7c9979bee','First Win','Won your first weekly challenge','🏆'),
  ('2a845d43-4860-4407-9a2d-a2f7c9979bee','Crowd Favourite','Won a community vote','⭐'),
  ('eae5f6d4-26da-4e87-8748-942dd5f239a2','Consistency King','Voted most consistent','🔥');

insert into public.badges (user_id, title, icon) values
  ('2a845d43-4860-4407-9a2d-a2f7c9979bee','Leader','👑'),
  ('03c124af-4838-405e-b7d6-3dc597f4c484','Grinder','💪'),
  ('eae5f6d4-26da-4e87-8748-942dd5f239a2','Iron Will','⚙️');

commit;
