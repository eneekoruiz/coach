-- Task 112
-- Incremental routine progress + advanced body anthropometry fields.

ALTER TABLE public.routine_templates
  ADD COLUMN IF NOT EXISTS target_repetitions INTEGER NOT NULL DEFAULT 1;

UPDATE public.routine_templates
SET target_repetitions = GREATEST(1, COALESCE(target_repetitions, habit_increment_amount, 1))
WHERE target_repetitions IS NULL OR target_repetitions < 1;

ALTER TABLE public.routine_logs
  ADD COLUMN IF NOT EXISTS progress_count INTEGER NOT NULL DEFAULT 1;

UPDATE public.routine_logs
SET progress_count = GREATEST(1, COALESCE(progress_count, 1))
WHERE progress_count IS NULL OR progress_count < 1;

ALTER TABLE public.body_metrics
  ADD COLUMN IF NOT EXISTS chest NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS arm_left NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS arm_right NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS waist NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS hip NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS thigh NUMERIC(6,2);
