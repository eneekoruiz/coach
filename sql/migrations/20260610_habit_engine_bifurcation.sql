-- Habit Engine Bifurcation: positive/negative analytics metadata.
-- Existing installations already have type; this migration is idempotent.

ALTER TABLE public.user_habits
  ADD COLUMN IF NOT EXISTS target_value numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS relapse_unit_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS relapse_unit_minutes integer NOT NULL DEFAULT 0;

ALTER TABLE public.user_habits
  DROP CONSTRAINT IF EXISTS user_habits_type_check;

ALTER TABLE public.user_habits
  ADD CONSTRAINT user_habits_type_check CHECK (type IN ('positive', 'negative'));

UPDATE public.user_habits
SET target_value = CASE
  WHEN target_value IS NULL OR target_value <= 0 THEN GREATEST(tolerance_threshold, 1)
  ELSE target_value
END;

CREATE INDEX IF NOT EXISTS idx_user_habits_user_type ON public.user_habits(user_id, type);
