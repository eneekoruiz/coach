-- Tracks one-tap meal completion without duplicating daily nutrition logs.
create table if not exists public.nutrition_meal_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  meal_id text not null,
  meal_name text not null,
  template_id uuid null references public.diet_templates(id) on delete set null,
  kcal integer not null default 0 check (kcal >= 0),
  protein_g integer not null default 0 check (protein_g >= 0),
  carbs_g integer not null default 0 check (carbs_g >= 0),
  fats_g integer not null default 0 check (fats_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nutrition_meal_completions_user_date_meal_key unique (user_id, date, meal_id)
);

alter table public.nutrition_meal_completions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'nutrition_meal_completions'
      and policyname = 'nutrition_meal_completions_select_own'
  ) then
    create policy nutrition_meal_completions_select_own
      on public.nutrition_meal_completions
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'nutrition_meal_completions'
      and policyname = 'nutrition_meal_completions_insert_own'
  ) then
    create policy nutrition_meal_completions_insert_own
      on public.nutrition_meal_completions
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'nutrition_meal_completions'
      and policyname = 'nutrition_meal_completions_update_own'
  ) then
    create policy nutrition_meal_completions_update_own
      on public.nutrition_meal_completions
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'nutrition_meal_completions'
      and policyname = 'nutrition_meal_completions_delete_own'
  ) then
    create policy nutrition_meal_completions_delete_own
      on public.nutrition_meal_completions
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists nutrition_meal_completions_user_date_idx
  on public.nutrition_meal_completions(user_id, date desc);

create or replace function public.set_nutrition_meal_completions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_nutrition_meal_completions_updated_at on public.nutrition_meal_completions;
create trigger set_nutrition_meal_completions_updated_at
before update on public.nutrition_meal_completions
for each row
execute function public.set_nutrition_meal_completions_updated_at();
