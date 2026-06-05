-- Migration: PWA Nutrition Mood Avatar Tables & Alterations
-- Path: sql/migrations/20260605_pwa_nutrition_mood_avatar.sql
-- Run in Supabase SQL Editor

-- 1) Ensure diet_templates exists and has correct columns
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

-- Ensure columns exist if table already existed without them
ALTER TABLE public.diet_templates ADD COLUMN IF NOT EXISTS target_kcal INTEGER NOT NULL DEFAULT 2000;
ALTER TABLE public.diet_templates ADD COLUMN IF NOT EXISTS target_protein INTEGER NOT NULL DEFAULT 150;
ALTER TABLE public.diet_templates ADD COLUMN IF NOT EXISTS target_carbs INTEGER NOT NULL DEFAULT 200;
ALTER TABLE public.diet_templates ADD COLUMN IF NOT EXISTS target_fats INTEGER NOT NULL DEFAULT 70;
ALTER TABLE public.diet_templates ADD COLUMN IF NOT EXISTS meals JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Enable RLS on diet_templates if not already
ALTER TABLE public.diet_templates ENABLE ROW LEVEL SECURITY;

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


-- 2) Create weekly_plans table
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

-- Enable RLS on weekly_plans
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

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

CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_date ON public.weekly_plans(user_id, week_start_date);


-- 3) Alter mood_logs to add valence_score and impact_tags
ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS valence_score NUMERIC CHECK (valence_score >= 1.0 AND valence_score <= 5.0);
ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS impact_tags TEXT[] DEFAULT '{}';

-- Migrate existing mood_score to valence_score if valence_score is NULL
UPDATE public.mood_logs SET valence_score = mood_score::numeric WHERE valence_score IS NULL AND mood_score IS NOT NULL;
