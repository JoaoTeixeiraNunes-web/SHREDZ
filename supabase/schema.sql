-- ============================================================
-- Shredz Season 1 - Database schema
-- Run this in the Supabase SQL Editor (after creating a project).
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- USERS (profile rows linked 1:1 to auth.users)
-- ============================================================
create table if not exists public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique not null,
  display_name text not null,
  role         text not null default 'user' check (role in ('user','admin')),
  avatar_url   text,
  points       integer not null default 0,
  weekly_gain  integer not null default 0,
  prev_rank    integer,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- HABITS
-- ============================================================
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  points      integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- DAILY SUBMISSIONS
-- ============================================================
create table if not exists public.daily_submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  habit_id    uuid references public.habits(id) on delete set null,
  habit_title text not null,
  points      integer not null default 0,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ============================================================
-- TRANSACTIONS (bank-account style ledger)
-- ============================================================
create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  title           text not null,
  description     text,
  points          integer not null,
  running_balance integer not null,
  category        text not null default 'bonus'
                  check (category in ('daily','bonus','penalty','challenge','vote')),
  created_at      timestamptz not null default now()
);

-- ============================================================
-- WEEKLY CHALLENGES
-- ============================================================
create table if not exists public.weekly_challenges (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  image_url   text,
  points      integer not null default 0,
  start_date  timestamptz not null,
  end_date    timestamptz not null,
  status      text not null default 'active' check (status in ('active','finished')),
  created_at  timestamptz not null default now()
);

create table if not exists public.challenge_results (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.weekly_challenges(id) on delete cascade,
  user_id      uuid not null references public.users(id) on delete cascade,
  place        integer not null check (place between 1 and 3),
  points       integer not null default 0,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- VOTING
-- ============================================================
create table if not exists public.votes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  category    text not null,
  vote_type   text not null default 'single' check (vote_type in ('single','rating')),
  end_date    timestamptz not null,
  status      text not null default 'active' check (status in ('active','finished')),
  winner_id   uuid references public.users(id),
  created_at  timestamptz not null default now()
);

create table if not exists public.vote_options (
  id        uuid primary key default gen_random_uuid(),
  vote_id   uuid not null references public.votes(id) on delete cascade,
  user_id   uuid references public.users(id) on delete set null,
  image_url text,
  label     text
);

create table if not exists public.vote_responses (
  id        uuid primary key default gen_random_uuid(),
  vote_id   uuid not null references public.votes(id) on delete cascade,
  option_id uuid not null references public.vote_options(id) on delete cascade,
  voter_id  uuid not null references public.users(id) on delete cascade,
  rating    integer check (rating between 1 and 10),
  created_at timestamptz not null default now(),
  unique (vote_id, voter_id)   -- one vote per user per poll
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  title      text not null,
  body       text,
  type       text default 'info',
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ACHIEVEMENTS & BADGES
-- ============================================================
create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  description text,
  icon        text,
  created_at  timestamptz not null default now()
);

create table if not exists public.badges (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  title       text not null,
  icon        text,
  created_at  timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_tx_user on public.transactions(user_id, created_at desc);
create index if not exists idx_sub_status on public.daily_submissions(status);
create index if not exists idx_notif_user on public.notifications(user_id, read);
