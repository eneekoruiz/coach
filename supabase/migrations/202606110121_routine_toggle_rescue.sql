-- Task 121: routine toggle rescue.
-- Keeps all-day tasks valid and makes daily completion logs deterministic.

DO $$
BEGIN
  IF to_regclass('public.routine_templates') IS NOT NULL THEN
    ALTER TABLE public.routine_templates
      DROP CONSTRAINT IF EXISTS routine_templates_time_of_day_check;

    ALTER TABLE public.routine_templates
      ADD CONSTRAINT routine_templates_time_of_day_check
      CHECK (time_of_day IN ('morning', 'afternoon', 'night', 'all_day'));
  END IF;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.routine_logs') IS NOT NULL THEN
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY user_id, routine_id, completed_date
          ORDER BY created_at DESC, id DESC
        ) AS row_num
      FROM public.routine_logs
    )
    DELETE FROM public.routine_logs
    USING ranked
    WHERE public.routine_logs.id = ranked.id
      AND ranked.row_num > 1;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'routine_logs_user_routine_date_unique'
        AND conrelid = 'public.routine_logs'::regclass
    ) THEN
      ALTER TABLE public.routine_logs
        ADD CONSTRAINT routine_logs_user_routine_date_unique
        UNIQUE (user_id, routine_id, completed_date);
    END IF;
  END IF;
END;
$$;
