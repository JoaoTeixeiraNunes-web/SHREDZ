-- ============================================================
-- Shredz Season 1 - Stored procedures (points engine)
-- Run AFTER schema.sql and policies.sql.
-- All are SECURITY DEFINER so they can write the ledger atomically,
-- but each re-checks admin rights for privileged operations.
-- ============================================================

-- ---------- award_points ----------
-- Inserts a transaction with a correct running balance and bumps user total.
-- Admin-only (revokes use negative points + category 'penalty').
create or replace function public.award_points(
  p_user uuid,
  p_title text,
  p_description text,
  p_points integer,
  p_category text default 'bonus'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if not public.is_admin() then
    raise exception 'Only admins can modify points';
  end if;

  update public.users
    set points = points + p_points
    where id = p_user
    returning points into v_balance;

  if v_balance is null then
    raise exception 'User not found';
  end if;

  insert into public.transactions
    (user_id, title, description, points, running_balance, category)
  values
    (p_user, p_title, p_description, p_points, v_balance, p_category);

  insert into public.notifications (user_id, title, body, type)
  values (
    p_user,
    case when p_points >= 0 then 'Points Awarded' else 'Points Revoked' end,
    p_title || ' (' || (case when p_points >= 0 then '+' else '' end) || p_points || ' pts)',
    case when p_points >= 0 then 'success' else 'penalty' end
  );
end;
$$;

-- ---------- approve_submission ----------
-- Marks a pending submission approved and awards its points.
create or replace function public.approve_submission(p_submission uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.daily_submissions%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only admins can approve submissions';
  end if;

  select * into v_sub from public.daily_submissions
    where id = p_submission and status = 'pending'
    for update;
  if not found then
    raise exception 'Submission not found or already reviewed';
  end if;

  update public.daily_submissions
    set status = 'approved', reviewed_at = now()
    where id = p_submission;

  perform public.award_points(
    v_sub.user_id,
    v_sub.habit_title,
    'Daily check-in approved',
    v_sub.points,
    'daily'
  );
end;
$$;

-- ---------- finalize_challenge ----------
-- Accepts a JSON array of winners and awards points to each.
-- Example p_winners: '[{"user_id":"...","place":1,"points":500}]'::jsonb
create or replace function public.finalize_challenge(
  p_challenge uuid,
  p_winners jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  w jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only admins can finalize challenges';
  end if;

  select title into v_title from public.weekly_challenges where id = p_challenge;
  if v_title is null then
    raise exception 'Challenge not found';
  end if;

  update public.weekly_challenges set status = 'finished' where id = p_challenge;

  for w in select * from jsonb_array_elements(p_winners)
  loop
    insert into public.challenge_results (challenge_id, user_id, place, points)
    values (
      p_challenge,
      (w->>'user_id')::uuid,
      (w->>'place')::int,
      (w->>'points')::int
    );

    perform public.award_points(
      (w->>'user_id')::uuid,
      v_title || ' - ' ||
        case (w->>'place')::int when 1 then '1st Place'
                                when 2 then '2nd Place'
                                else '3rd Place' end,
      'Weekly challenge result',
      (w->>'points')::int,
      'challenge'
    );
  end loop;
end;
$$;

-- ---------- finish_vote ----------
-- Tallies a vote, sets the winner, optionally awards bonus points.
create or replace function public.finish_vote(
  p_vote uuid,
  p_bonus integer default 0
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner uuid;
  v_type text;
  v_title text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can finish votes';
  end if;

  select vote_type, title into v_type, v_title from public.votes where id = p_vote;

  if v_type = 'rating' then
    select o.user_id into v_winner
    from public.vote_responses r
    join public.vote_options o on o.id = r.option_id
    where r.vote_id = p_vote
    group by o.user_id
    order by avg(r.rating) desc nulls last
    limit 1;
  else
    select o.user_id into v_winner
    from public.vote_responses r
    join public.vote_options o on o.id = r.option_id
    where r.vote_id = p_vote
    group by o.user_id
    order by count(*) desc
    limit 1;
  end if;

  update public.votes
    set status = 'finished', winner_id = v_winner
    where id = p_vote;

  if p_bonus > 0 and v_winner is not null then
    perform public.award_points(
      v_winner, v_title || ' - Winner', 'Vote bonus', p_bonus, 'vote'
    );
  end if;

  return v_winner;
end;
$$;

-- ---------- notify_all (admin broadcast helper) ----------
create or replace function public.notify_all(
  p_title text,
  p_body text,
  p_type text default 'info'
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can broadcast';
  end if;
  insert into public.notifications (user_id, title, body, type)
  select id, p_title, p_body, p_type from public.users where role = 'user';
end;
$$;

create or replace function public.reset_all_data() returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can reset data';
  end if;
  -- Clean all data (children first to avoid FK constraints)
  delete from public.vote_responses where 1=1;
  delete from public.vote_options where 1=1;
  delete from public.votes where 1=1;
  delete from public.challenge_results where 1=1;
  delete from public.weekly_challenges where 1=1;
  delete from public.daily_submissions where 1=1;
  delete from public.transactions where 1=1;
  -- Reset user points and weekly gain
  update public.users
    set points = 0, weekly_gain = 0
    where role = 'user';
end;
$$;
