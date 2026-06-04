-- Migration: Create user_diet_plans table and enable RLS policies
-- Run in Supabase SQL editor or via psql

CREATE TABLE IF NOT EXISTS public.user_diet_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_kcal integer NOT NULL DEFAULT 2000,
  target_protein integer NOT NULL DEFAULT 150,
  target_carbs integer NOT NULL DEFAULT 200,
  target_fats integer NOT NULL DEFAULT 70,
  breakfast_plan text NOT NULL DEFAULT '',
  lunch_plan text NOT NULL DEFAULT '',
  dinner_plan text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_diet_plans ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_diet_plans TO authenticated;

-- Policies for RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_diet_plans' AND policyname = 'user_diet_plans_select_own'
  ) THEN
    CREATE POLICY user_diet_plans_select_own ON public.user_diet_plans
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_diet_plans' AND policyname = 'user_diet_plans_insert_own'
  ) THEN
    CREATE POLICY user_diet_plans_insert_own ON public.user_diet_plans
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_diet_plans' AND policyname = 'user_diet_plans_update_own'
  ) THEN
    CREATE POLICY user_diet_plans_update_own ON public.user_diet_plans
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_diet_plans' AND policyname = 'user_diet_plans_delete_own'
  ) THEN
    CREATE POLICY user_diet_plans_delete_own ON public.user_diet_plans
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;
