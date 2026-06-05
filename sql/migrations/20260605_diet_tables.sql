-- Migration: Create diet_templates and user_diet_calendar tables
-- Run this in your Supabase SQL Editor
-- All statements are idempotent (safe to run multiple times)

-- 1) diet_templates table
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

CREATE INDEX IF NOT EXISTS idx_diet_templates_user ON public.diet_templates(user_id);


-- 2) user_diet_calendar table
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

CREATE INDEX IF NOT EXISTS idx_user_diet_calendar_user_date ON public.user_diet_calendar(user_id, date);
