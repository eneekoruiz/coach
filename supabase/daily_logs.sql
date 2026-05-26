create extension if not exists "pgcrypto";

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  "date" date not null,
  health_momentum integer not null check (health_momentum between 0 and 100),
  avatar_image_url text,
  close_day_data jsonb,
  ai_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, "date")
);

alter table public.daily_logs
  add column if not exists close_day_data jsonb;

alter table public.daily_logs enable row level security;

drop policy if exists "daily_logs_select_own" on public.daily_logs;
create policy "daily_logs_select_own"
  on public.daily_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "daily_logs_insert_own" on public.daily_logs;
create policy "daily_logs_insert_own"
  on public.daily_logs
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "daily_logs_update_own" on public.daily_logs;
create policy "daily_logs_update_own"
  on public.daily_logs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "daily_logs_delete_own" on public.daily_logs;
create policy "daily_logs_delete_own"
  on public.daily_logs
  for delete
  using (auth.uid() = user_id);