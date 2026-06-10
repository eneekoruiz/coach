CREATE TABLE IF NOT EXISTS public.body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weight NUMERIC(6,2) NOT NULL,
  body_fat_percentage NUMERIC(5,2),
  muscle_mass NUMERIC(6,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.body_metrics TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'body_metrics' AND policyname = 'body_metrics_select_own') THEN
    CREATE POLICY body_metrics_select_own ON public.body_metrics FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'body_metrics' AND policyname = 'body_metrics_insert_own') THEN
    CREATE POLICY body_metrics_insert_own ON public.body_metrics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'body_metrics' AND policyname = 'body_metrics_update_own') THEN
    CREATE POLICY body_metrics_update_own ON public.body_metrics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'body_metrics' AND policyname = 'body_metrics_delete_own') THEN
    CREATE POLICY body_metrics_delete_own ON public.body_metrics FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_body_metrics_user_date ON public.body_metrics(user_id, date DESC);

CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  sport_type TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  intensity TEXT NOT NULL DEFAULT 'moderate' CHECK (intensity IN ('low', 'moderate', 'high')),
  kcal_burned INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workouts TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workouts' AND policyname = 'workouts_select_own') THEN
    CREATE POLICY workouts_select_own ON public.workouts FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workouts' AND policyname = 'workouts_insert_own') THEN
    CREATE POLICY workouts_insert_own ON public.workouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workouts' AND policyname = 'workouts_update_own') THEN
    CREATE POLICY workouts_update_own ON public.workouts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'workouts' AND policyname = 'workouts_delete_own') THEN
    CREATE POLICY workouts_delete_own ON public.workouts FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workouts(user_id, date DESC);

CREATE OR REPLACE FUNCTION public.import_scanned_diet_bundle(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_recipe JSONB;
  v_template JSONB;
  v_day JSONB;
  v_meal JSONB;
  v_recipe_id UUID;
  v_template_id UUID;
  v_weekly_plan_id UUID;
  v_week_start DATE := COALESCE((payload->'weekly_plan'->>'week_start_date')::date, current_date);
  v_recipe_map JSONB := '{}'::jsonb;
  v_template_map JSONB := '{}'::jsonb;
  v_meals JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.weekly_plans (
    user_id,
    week_start_date,
    name,
    is_active,
    target_kcal,
    target_protein,
    target_carbs,
    target_fats,
    water_target_ml
  )
  VALUES (
    v_user_id,
    v_week_start,
    COALESCE(payload->'weekly_plan'->>'name', 'Plan escaneado'),
    false,
    COALESCE((payload->'daily_templates'->0->>'target_kcal')::int, 2000),
    COALESCE((payload->'daily_templates'->0->>'target_protein')::int, 150),
    COALESCE((payload->'daily_templates'->0->>'target_carbs')::int, 200),
    COALESCE((payload->'daily_templates'->0->>'target_fats')::int, 70),
    2000
  )
  RETURNING id INTO v_weekly_plan_id;

  FOR v_recipe IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'recipes', '[]'::jsonb))
  LOOP
    INSERT INTO public.recipes (
      user_id,
      name,
      ingredients_json,
      instructions,
      total_kcal,
      total_protein,
      total_carbs,
      total_fats
    )
    VALUES (
      v_user_id,
      COALESCE(v_recipe->>'name', 'Receta escaneada'),
      COALESCE(v_recipe->'ingredients_json', '[]'::jsonb),
      COALESCE(v_recipe->>'instructions', ''),
      COALESCE((v_recipe->>'total_kcal')::int, 0),
      COALESCE((v_recipe->>'total_protein')::int, 0),
      COALESCE((v_recipe->>'total_carbs')::int, 0),
      COALESCE((v_recipe->>'total_fats')::int, 0)
    )
    RETURNING id INTO v_recipe_id;

    v_recipe_map := v_recipe_map || jsonb_build_object(COALESCE(v_recipe->>'key', v_recipe_id::text), v_recipe_id::text);
  END LOOP;

  FOR v_template IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'daily_templates', '[]'::jsonb))
  LOOP
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', COALESCE(v_meal->>'id', gen_random_uuid()::text),
        'name', COALESCE(v_meal->>'name', 'Comida'),
        'text', COALESCE(v_meal->>'text', ''),
        'target_kcal', COALESCE((v_meal->>'target_kcal')::int, 0),
        'target_protein', COALESCE((v_meal->>'target_protein')::int, 0),
        'target_carbs', COALESCE((v_meal->>'target_carbs')::int, 0),
        'target_fats', COALESCE((v_meal->>'target_fats')::int, 0),
        'recipe_id', NULLIF(v_recipe_map ->> COALESCE(v_meal->>'recipe_key', ''), '')
      )
    )
    INTO v_meals
    FROM jsonb_array_elements(COALESCE(v_template->'meals', '[]'::jsonb)) v_meal;

    INSERT INTO public.diet_templates (
      user_id,
      parent_template_id,
      name,
      target_kcal,
      target_protein,
      target_carbs,
      target_fats,
      meals
    )
    VALUES (
      v_user_id,
      NULL,
      COALESCE(v_template->>'name', 'Día escaneado'),
      COALESCE((v_template->>'target_kcal')::int, 0),
      COALESCE((v_template->>'target_protein')::int, 0),
      COALESCE((v_template->>'target_carbs')::int, 0),
      COALESCE((v_template->>'target_fats')::int, 0),
      COALESCE(v_meals, '[]'::jsonb)
    )
    RETURNING id INTO v_template_id;

    v_template_map := v_template_map || jsonb_build_object(COALESCE(v_template->>'key', v_template_id::text), v_template_id::text);
  END LOOP;

  FOR v_day IN SELECT * FROM jsonb_array_elements(COALESCE(payload->'weekly_plan'->'days', '[]'::jsonb))
  LOOP
    INSERT INTO public.weekly_plan_days (
      user_id,
      weekly_plan_id,
      day_of_week,
      template_id
    )
    VALUES (
      v_user_id,
      v_weekly_plan_id,
      COALESCE((v_day->>'day_of_week')::int, 1),
      (v_template_map ->> COALESCE(v_day->>'template_key', ''))::uuid
    )
    ON CONFLICT (weekly_plan_id, day_of_week)
    DO UPDATE SET template_id = EXCLUDED.template_id;
  END LOOP;

  RETURN jsonb_build_object(
    'weekly_plan_id', v_weekly_plan_id,
    'recipes_created', jsonb_array_length(COALESCE(payload->'recipes', '[]'::jsonb)),
    'templates_created', jsonb_array_length(COALESCE(payload->'daily_templates', '[]'::jsonb))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.import_scanned_diet_bundle(JSONB) TO authenticated;
