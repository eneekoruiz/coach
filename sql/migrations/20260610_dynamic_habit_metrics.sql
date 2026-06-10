-- Task 119: Dynamic Habit Metrics Engine.
-- Keeps legacy target_value/unit while adding explicit metric semantics.

ALTER TABLE public.user_habits
  ADD COLUMN IF NOT EXISTS metric_type text NOT NULL DEFAULT 'counter',
  ADD COLUMN IF NOT EXISTS unit_label text,
  ADD COLUMN IF NOT EXISTS step_value numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS metric_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.user_habits
  DROP CONSTRAINT IF EXISTS user_habits_metric_type_check;

ALTER TABLE public.user_habits
  ADD CONSTRAINT user_habits_metric_type_check
  CHECK (metric_type IN ('boolean', 'counter', 'volume', 'duration'));

UPDATE public.user_habits
SET metric_type = CASE
  WHEN type = 'negative' THEN 'counter'
  WHEN lower(coalesce(unit, '')) IN ('ml', 'l', 'litro', 'litros', 'vaso', 'vasos')
    OR translate(lower(coalesce(name, '')), 'áéíóúü', 'aeiouu') LIKE '%agua%'
    OR translate(lower(coalesce(name, '')), 'áéíóúü', 'aeiouu') LIKE '%hidratacion%'
    THEN 'volume'
  WHEN lower(coalesce(unit, '')) IN ('min', 'mins', 'minuto', 'minutos', 'h', 'hora', 'horas')
    THEN 'duration'
  WHEN coalesce(target_value, tolerance_threshold, 1) <= 1
    AND nullif(coalesce(unit, ''), '') IS NULL
    THEN 'boolean'
  ELSE 'counter'
END
WHERE (metric_type IS NULL OR metric_type = 'counter')
  AND (coalesce(metric_config, '{}'::jsonb) = '{}'::jsonb OR unit_label IS NULL);

UPDATE public.user_habits
SET unit_label = coalesce(
  nullif(unit_label, ''),
  nullif(unit, ''),
  CASE metric_type
    WHEN 'boolean' THEN CASE WHEN type = 'negative' THEN 'evento' ELSE 'hecho' END
    WHEN 'volume' THEN 'ml'
    WHEN 'duration' THEN 'min'
    ELSE CASE WHEN type = 'negative' THEN 'recaídas' ELSE 'veces' END
  END
);

UPDATE public.user_habits
SET step_value = CASE
  WHEN step_value IS NULL OR step_value <= 0 THEN
    CASE metric_type
      WHEN 'volume' THEN 250
      WHEN 'duration' THEN 15
      ELSE 1
    END
  ELSE step_value
END;

UPDATE public.user_habits
SET metric_config = jsonb_strip_nulls(
  jsonb_build_object(
    'min', 0,
    'max', CASE
      WHEN metric_type = 'boolean' THEN 1
      WHEN metric_type = 'volume'
        AND (
          translate(lower(coalesce(name, '')), 'áéíóúü', 'aeiouu') LIKE '%agua%'
          OR translate(lower(coalesce(name, '')), 'áéíóúü', 'aeiouu') LIKE '%hidratacion%'
        )
        THEN 10000
      WHEN metric_type = 'duration' THEN 1440
      ELSE NULL
    END,
    'precision', CASE WHEN step_value = floor(step_value) THEN 0 ELSE 2 END,
    'presets', CASE metric_type
      WHEN 'volume' THEN jsonb_build_array(step_value, step_value * 2, step_value * 4)
      WHEN 'duration' THEN jsonb_build_array(step_value, step_value * 2, step_value * 4)
      ELSE jsonb_build_array(step_value)
    END,
    'base_unit', unit_label,
    'display_unit', unit_label
  )
) || coalesce(metric_config, '{}'::jsonb);

UPDATE public.user_habits
SET unit = unit_label
WHERE unit IS NULL OR unit = '';

CREATE INDEX IF NOT EXISTS idx_user_habits_user_metric_type
  ON public.user_habits(user_id, metric_type);

