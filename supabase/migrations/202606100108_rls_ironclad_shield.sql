-- Task 116: Ironclad Shield
-- Final defensive RLS sweep for user-owned tables.
-- Note: this migration is intentionally idempotent.

create or replace function public.apply_owner_rls(target_table regclass, owner_column text default 'user_id')
returns void
language plpgsql
as $$
declare
  fq_table text := target_table::text;
  table_name text := split_part(fq_table, '.', 2);
begin
  execute format('alter table %s enable row level security', fq_table);
  execute format('alter table %s force row level security', fq_table);

  execute format('drop policy if exists %I on %s', table_name || '_select_own', fq_table);
  execute format('drop policy if exists %I on %s', table_name || '_insert_own', fq_table);
  execute format('drop policy if exists %I on %s', table_name || '_update_own', fq_table);
  execute format('drop policy if exists %I on %s', table_name || '_delete_own', fq_table);

  execute format(
    'create policy %I on %s for select to authenticated using (auth.uid() is not null and %I = auth.uid())',
    table_name || '_select_own',
    fq_table,
    owner_column
  );

  execute format(
    'create policy %I on %s for insert to authenticated with check (auth.uid() is not null and %I = auth.uid())',
    table_name || '_insert_own',
    fq_table,
    owner_column
  );

  execute format(
    'create policy %I on %s for update to authenticated using (auth.uid() is not null and %I = auth.uid()) with check (auth.uid() is not null and %I = auth.uid())',
    table_name || '_update_own',
    fq_table,
    owner_column,
    owner_column
  );

  execute format(
    'create policy %I on %s for delete to authenticated using (auth.uid() is not null and %I = auth.uid())',
    table_name || '_delete_own',
    fq_table,
    owner_column
  );
end;
$$;

do $$
begin
  if to_regclass('public.user_habits') is not null then
    perform public.apply_owner_rls('public.user_habits'::regclass);
  end if;
  if to_regclass('public.daily_logs') is not null then
    perform public.apply_owner_rls('public.daily_logs'::regclass);
  end if;
  if to_regclass('public.mood_logs') is not null then
    perform public.apply_owner_rls('public.mood_logs'::regclass);
  end if;
  if to_regclass('public.recipes') is not null then
    perform public.apply_owner_rls('public.recipes'::regclass);
  end if;
  if to_regclass('public.diet_templates') is not null then
    perform public.apply_owner_rls('public.diet_templates'::regclass);
  end if;
  if to_regclass('public.user_diet_calendar') is not null then
    perform public.apply_owner_rls('public.user_diet_calendar'::regclass);
  end if;
  if to_regclass('public.daily_diet_overrides') is not null then
    perform public.apply_owner_rls('public.daily_diet_overrides'::regclass);
  end if;
  if to_regclass('public.weekly_plans') is not null then
    perform public.apply_owner_rls('public.weekly_plans'::regclass);
  end if;
  if to_regclass('public.weekly_plan_days') is not null then
    perform public.apply_owner_rls('public.weekly_plan_days'::regclass);
  end if;
  if to_regclass('public.user_diet_calendar_projections') is not null then
    perform public.apply_owner_rls('public.user_diet_calendar_projections'::regclass);
  end if;
  if to_regclass('public.nutrition_meal_completions') is not null then
    perform public.apply_owner_rls('public.nutrition_meal_completions'::regclass);
  end if;
  if to_regclass('public.body_metrics') is not null then
    perform public.apply_owner_rls('public.body_metrics'::regclass);
  end if;
  if to_regclass('public.workouts') is not null then
    perform public.apply_owner_rls('public.workouts'::regclass);
  end if;
  if to_regclass('public.routine_templates') is not null then
    perform public.apply_owner_rls('public.routine_templates'::regclass);
  end if;
  if to_regclass('public.routine_logs') is not null then
    perform public.apply_owner_rls('public.routine_logs'::regclass);
  end if;
  if to_regclass('public.chat_sessions') is not null then
    perform public.apply_owner_rls('public.chat_sessions'::regclass);
  end if;
  if to_regclass('public.chat_history') is not null then
    perform public.apply_owner_rls('public.chat_history'::regclass);
  end if;
  if to_regclass('public.user_push_subscriptions') is not null then
    perform public.apply_owner_rls('public.user_push_subscriptions'::regclass);
  end if;
  if to_regclass('public.user_diet_plans') is not null then
    perform public.apply_owner_rls('public.user_diet_plans'::regclass);
  end if;
  if to_regclass('public.user_achievements') is not null then
    perform public.apply_owner_rls('public.user_achievements'::regclass);
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles enable row level security;
    alter table public.profiles force row level security;

    drop policy if exists profiles_select_own on public.profiles;
    drop policy if exists profiles_insert_own on public.profiles;
    drop policy if exists profiles_update_own on public.profiles;
    drop policy if exists profiles_delete_own on public.profiles;

    create policy profiles_select_own
      on public.profiles
      for select
      to authenticated
      using (auth.uid() is not null and id = auth.uid());

    create policy profiles_insert_own
      on public.profiles
      for insert
      to authenticated
      with check (auth.uid() is not null and id = auth.uid());

    create policy profiles_update_own
      on public.profiles
      for update
      to authenticated
      using (auth.uid() is not null and id = auth.uid())
      with check (auth.uid() is not null and id = auth.uid());

    create policy profiles_delete_own
      on public.profiles
      for delete
      to authenticated
      using (auth.uid() is not null and id = auth.uid());
  end if;
end;
$$;
