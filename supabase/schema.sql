-- DevQuest database schema. Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Row-level security makes every table private to its owner, except the public leaderboard columns.

-- One row per learner: their whole progress as event lists (merged on every sync).
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  profile    jsonb,
  attempts   jsonb not null default '[]'::jsonb,
  rewards    jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.progress enable row level security;

create policy "Learners read their own progress"
  on public.progress for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Learners create their own progress"
  on public.progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Learners update their own progress"
  on public.progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Weekly leaderboard. Only a display name and XP totals are public.
create table if not exists public.leaderboard (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Learner' check (char_length(display_name) <= 40),
  week_start   date not null,
  weekly_xp    integer not null default 0 check (weekly_xp >= 0 and weekly_xp <= 100000),
  total_xp     integer not null default 0 check (total_xp >= 0),
  updated_at   timestamptz not null default now()
);

alter table public.leaderboard enable row level security;

create policy "Signed-in learners can see the leaderboard"
  on public.leaderboard for select to authenticated
  using (true);

create policy "Learners create their own leaderboard row"
  on public.leaderboard for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Learners update their own leaderboard row"
  on public.leaderboard for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists leaderboard_week_xp on public.leaderboard (week_start, weekly_xp desc);
