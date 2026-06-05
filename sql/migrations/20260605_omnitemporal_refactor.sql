-- Migration: Omnitemporal Mood & Nutrition Assignment Tables Refactor
-- Path: sql/migrations/20260605_omnitemporal_refactor.sql

-- 1) Create or Refactor mood_logs table
CREATE TABLE IF NOT EXISTS public.mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  valence_score NUMERIC CHECK (valence_score >= 1.0 AND valence_score <= 5.0),
  impact_tags TEXT[] DEFAULT '{}',
  is_daily_summary BOOLEAN DEFAULT false
);

-- Ensure all requested columns exist on public.mood_logs in case the table already existed
ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS created_at_timestamp TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS valence_score NUMERIC CHECK (valence_score >= 1.0 AND valence_score <= 5.0);
ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS impact_tags TEXT[] DEFAULT '{}';
ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS is_daily_summary BOOLEAN DEFAULT false;

-- Clean up/migration helper for existing fields: map logged_at to created_at_timestamp, and mood_score to valence_score
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mood_logs' AND column_name='logged_at'
  ) THEN
    UPDATE public.mood_logs SET created_at_timestamp = logged_at WHERE created_at_timestamp IS NULL OR created_at_timestamp = now();
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='mood_logs' AND column_name='mood_score'
  ) THEN
    UPDATE public.mood_logs SET valence_score = mood_score::numeric WHERE valence_score IS NULL;
  END IF;
END
$$;

-- Enable RLS on mood_logs
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.mood_logs TO authenticated;

-- Policies for mood_logs
DROP POLICY IF EXISTS mood_logs_select_own ON public.mood_logs;
CREATE POLICY mood_logs_select_own ON public.mood_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS mood_logs_insert_own ON public.mood_logs;
CREATE POLICY mood_logs_insert_own ON public.mood_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS mood_logs_update_own ON public.mood_logs;
CREATE POLICY mood_logs_update_own ON public.mood_logs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS mood_logs_delete_own ON public.mood_logs;
CREATE POLICY mood_logs_delete_own ON public.mood_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date_summary ON public.mood_logs(user_id, date DESC, is_daily_summary);


-- 2) Ensure weekly_plans and user_diet_calendar tables exist
CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  target_kcal INTEGER NOT NULL DEFAULT 2000,
  target_protein INTEGER NOT NULL DEFAULT 150,
  target_carbs INTEGER NOT NULL DEFAULT 200,
  target_fats INTEGER NOT NULL DEFAULT 70,
  water_target_ml INTEGER NOT NULL DEFAULT 2000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.weekly_plans TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weekly_plans' AND policyname = 'weekly_plans_select_own'
  ) THEN
    CREATE POLICY weekly_plans_select_own ON public.weekly_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weekly_plans' AND policyname = 'weekly_plans_insert_own'
  ) THEN
    CREATE POLICY weekly_plans_insert_own ON public.weekly_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weekly_plans' AND policyname = 'weekly_plans_update_own'
  ) THEN
    CREATE POLICY weekly_plans_update_own ON public.weekly_plans FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'weekly_plans' AND policyname = 'weekly_plans_delete_own'
  ) THEN
    CREATE POLICY weekly_plans_delete_own ON public.weekly_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Ensure diet templates and user_diet_calendar tables exist as they support nutrition assignments
CREATE TABLE IF NOT EXISTS public.diet_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Mi Plan',
  target_kcal INTEGER NOT NULL DEFAULT 2000,
  target_protein INTEGER NOT NULL DEFAULT 150,
  target_carbs INTEGER NOT NULL DEFAULT 200,
  target_fats INTEGER NOT NULL DEFAULT 70,
  meals JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.diet_templates TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_templates' AND policyname = 'diet_templates_select_own'
  ) THEN
    CREATE POLICY diet_templates_select_own ON public.diet_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_templates' AND policyname = 'diet_templates_insert_own'
  ) THEN
    CREATE POLICY diet_templates_insert_own ON public.diet_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_templates' AND policyname = 'diet_templates_update_own'
  ) THEN
    CREATE POLICY diet_templates_update_own ON public.diet_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_templates' AND policyname = 'diet_templates_delete_own'
  ) THEN
    CREATE POLICY diet_templates_delete_own ON public.diet_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.user_diet_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  template_id UUID NOT NULL REFERENCES public.diet_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.user_diet_calendar ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_diet_calendar TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_diet_calendar' AND policyname = 'user_diet_calendar_select_own'
  ) THEN
    CREATE POLICY user_diet_calendar_select_own ON public.user_diet_calendar FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_diet_calendar' AND policyname = 'user_diet_calendar_insert_own'
  ) THEN
    CREATE POLICY user_diet_calendar_insert_own ON public.user_diet_calendar FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_diet_calendar' AND policyname = 'user_diet_calendar_update_own'
  ) THEN
    CREATE POLICY user_diet_calendar_update_own ON public.user_diet_calendar FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_diet_calendar' AND policyname = 'user_diet_calendar_delete_own'
  ) THEN
    CREATE POLICY user_diet_calendar_delete_own ON public.user_diet_calendar FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;
