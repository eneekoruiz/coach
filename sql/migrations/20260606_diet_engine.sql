-- Migration: Clinical Nutrition Engine (Recipes, Programs, Overrides)
-- Idempotent SQL Script - Safe to run multiple times in Supabase SQL Editor

-- 1) recipes table
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Nueva Receta',
  ingredients_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_kcal INTEGER NOT NULL DEFAULT 0,
  total_protein INTEGER NOT NULL DEFAULT 0,
  total_carbs INTEGER NOT NULL DEFAULT 0,
  total_fats INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for recipes
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recipes TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recipes' AND policyname = 'recipes_select_own'
  ) THEN
    CREATE POLICY recipes_select_own ON public.recipes FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recipes' AND policyname = 'recipes_insert_own'
  ) THEN
    CREATE POLICY recipes_insert_own ON public.recipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recipes' AND policyname = 'recipes_update_own'
  ) THEN
    CREATE POLICY recipes_update_own ON public.recipes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recipes' AND policyname = 'recipes_delete_own'
  ) THEN
    CREATE POLICY recipes_delete_own ON public.recipes FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_recipes_user ON public.recipes(user_id);


-- 2) diet_programs table
CREATE TABLE IF NOT EXISTS public.diet_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Programa Nutricional',
  start_date DATE NOT NULL DEFAULT current_date,
  microcycle_length INTEGER NOT NULL DEFAULT 7 CHECK (microcycle_length > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for diet_programs
ALTER TABLE public.diet_programs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.diet_programs TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_programs' AND policyname = 'diet_programs_select_own'
  ) THEN
    CREATE POLICY diet_programs_select_own ON public.diet_programs FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_programs' AND policyname = 'diet_programs_insert_own'
  ) THEN
    CREATE POLICY diet_programs_insert_own ON public.diet_programs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_programs' AND policyname = 'diet_programs_update_own'
  ) THEN
    CREATE POLICY diet_programs_update_own ON public.diet_programs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_programs' AND policyname = 'diet_programs_delete_own'
  ) THEN
    CREATE POLICY diet_programs_delete_own ON public.diet_programs FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_diet_programs_user ON public.diet_programs(user_id);


-- 3) diet_program_days table
CREATE TABLE IF NOT EXISTS public.diet_program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES public.diet_programs(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  template_id UUID NOT NULL REFERENCES public.diet_templates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(program_id, day_number)
);

-- Enable RLS for diet_program_days
ALTER TABLE public.diet_program_days ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.diet_program_days TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_program_days' AND policyname = 'diet_program_days_select_own'
  ) THEN
    -- Join with diet_programs to verify user ownership
    CREATE POLICY diet_program_days_select_own ON public.diet_program_days FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.diet_programs p WHERE p.id = program_id AND p.user_id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_program_days' AND policyname = 'diet_program_days_insert_own'
  ) THEN
    CREATE POLICY diet_program_days_insert_own ON public.diet_program_days FOR INSERT TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.diet_programs p WHERE p.id = program_id AND p.user_id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_program_days' AND policyname = 'diet_program_days_update_own'
  ) THEN
    CREATE POLICY diet_program_days_update_own ON public.diet_program_days FOR UPDATE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.diet_programs p WHERE p.id = program_id AND p.user_id = auth.uid()
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.diet_programs p WHERE p.id = program_id AND p.user_id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'diet_program_days' AND policyname = 'diet_program_days_delete_own'
  ) THEN
    CREATE POLICY diet_program_days_delete_own ON public.diet_program_days FOR DELETE TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.diet_programs p WHERE p.id = program_id AND p.user_id = auth.uid()
      ));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_diet_program_days_program ON public.diet_program_days(program_id);


-- 4) daily_diet_overrides table
CREATE TABLE IF NOT EXISTS public.daily_diet_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  custom_diet JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_kcal INTEGER NOT NULL DEFAULT 0,
  total_protein INTEGER NOT NULL DEFAULT 0,
  total_carbs INTEGER NOT NULL DEFAULT 0,
  total_fats INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS for daily_diet_overrides
ALTER TABLE public.daily_diet_overrides ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.daily_diet_overrides TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_diet_overrides' AND policyname = 'daily_diet_overrides_select_own'
  ) THEN
    CREATE POLICY daily_diet_overrides_select_own ON public.daily_diet_overrides FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_diet_overrides' AND policyname = 'daily_diet_overrides_insert_own'
  ) THEN
    CREATE POLICY daily_diet_overrides_insert_own ON public.daily_diet_overrides FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_diet_overrides' AND policyname = 'daily_diet_overrides_update_own'
  ) THEN
    CREATE POLICY daily_diet_overrides_update_own ON public.daily_diet_overrides FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_diet_overrides' AND policyname = 'daily_diet_overrides_delete_own'
  ) THEN
    CREATE POLICY daily_diet_overrides_delete_own ON public.daily_diet_overrides FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_daily_diet_overrides_user_date ON public.daily_diet_overrides(user_id, date);
