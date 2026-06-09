-- Migration: Matryoshka nutrition architecture and template variations
-- Idempotent SQL script for Supabase SQL Editor.

-- 1) Daily template inheritance for visual grouping.
ALTER TABLE public.diet_templates
  ADD COLUMN IF NOT EXISTS parent_template_id UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'diet_templates_parent_template_id_fkey'
  ) THEN
    ALTER TABLE public.diet_templates
      ADD CONSTRAINT diet_templates_parent_template_id_fkey
      FOREIGN KEY (parent_template_id)
      REFERENCES public.diet_templates(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_diet_templates_parent
  ON public.diet_templates(parent_template_id);

-- 2) Normalize weekly plan templates for the Matryoshka weekly layer.
ALTER TABLE public.weekly_plans
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Semana Base';

ALTER TABLE public.weekly_plans
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weekly_plans'
      AND column_name = 'week_start_date'
  ) THEN
    ALTER TABLE public.weekly_plans
      ALTER COLUMN week_start_date DROP NOT NULL;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.weekly_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekly_plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  template_id UUID NOT NULL REFERENCES public.diet_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(weekly_plan_id, day_of_week)
);

ALTER TABLE public.weekly_plan_days ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.weekly_plan_days TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weekly_plan_days' AND policyname = 'weekly_plan_days_select_own'
  ) THEN
    CREATE POLICY weekly_plan_days_select_own ON public.weekly_plan_days
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weekly_plan_days' AND policyname = 'weekly_plan_days_insert_own'
  ) THEN
    CREATE POLICY weekly_plan_days_insert_own ON public.weekly_plan_days
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weekly_plan_days' AND policyname = 'weekly_plan_days_update_own'
  ) THEN
    CREATE POLICY weekly_plan_days_update_own ON public.weekly_plan_days
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weekly_plan_days' AND policyname = 'weekly_plan_days_delete_own'
  ) THEN
    CREATE POLICY weekly_plan_days_delete_own ON public.weekly_plan_days
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_weekly_plan_days_plan
  ON public.weekly_plan_days(weekly_plan_id, day_of_week);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_days_user
  ON public.weekly_plan_days(user_id);

-- 3) Optional projection audit table for month-filling flows.
CREATE TABLE IF NOT EXISTS public.user_diet_calendar_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weekly_plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.diet_templates(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.user_diet_calendar_projections ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_diet_calendar_projections TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_diet_calendar_projections' AND policyname = 'user_diet_calendar_projections_select_own'
  ) THEN
    CREATE POLICY user_diet_calendar_projections_select_own ON public.user_diet_calendar_projections
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_diet_calendar_projections' AND policyname = 'user_diet_calendar_projections_insert_own'
  ) THEN
    CREATE POLICY user_diet_calendar_projections_insert_own ON public.user_diet_calendar_projections
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_diet_calendar_projections' AND policyname = 'user_diet_calendar_projections_update_own'
  ) THEN
    CREATE POLICY user_diet_calendar_projections_update_own ON public.user_diet_calendar_projections
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_diet_calendar_projections' AND policyname = 'user_diet_calendar_projections_delete_own'
  ) THEN
    CREATE POLICY user_diet_calendar_projections_delete_own ON public.user_diet_calendar_projections
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_user_diet_calendar_projection_user_date
  ON public.user_diet_calendar_projections(user_id, date);

-- 4) Keep recipe preparation notes compatible with the recipe canvas.
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS instructions TEXT NOT NULL DEFAULT '';
