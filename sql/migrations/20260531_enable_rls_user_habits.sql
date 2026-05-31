-- Enable RLS and policies for user_habits.
-- Safe to run multiple times (idempotent checks included).

ALTER TABLE IF EXISTS public.user_habits ENABLE ROW LEVEL SECURITY;

-- Ensure authenticated users can use the table and identity sequence.
DO $$
BEGIN
  IF to_regclass('public.user_habits') IS NOT NULL THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_habits TO authenticated;
  END IF;

  IF to_regclass('public.user_habits_id_seq') IS NOT NULL THEN
    GRANT USAGE, SELECT ON SEQUENCE public.user_habits_id_seq TO authenticated;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.user_habits') IS NOT NULL
    AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_habits'
      AND policyname = 'user_habits_select_own'
  ) THEN
    CREATE POLICY user_habits_select_own
      ON public.user_habits
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.user_habits') IS NOT NULL
    AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_habits'
      AND policyname = 'user_habits_insert_own'
  ) THEN
    CREATE POLICY user_habits_insert_own
      ON public.user_habits
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.user_habits') IS NOT NULL
    AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_habits'
      AND policyname = 'user_habits_update_own'
  ) THEN
    CREATE POLICY user_habits_update_own
      ON public.user_habits
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.user_habits') IS NOT NULL
    AND NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_habits'
      AND policyname = 'user_habits_delete_own'
  ) THEN
    CREATE POLICY user_habits_delete_own
      ON public.user_habits
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;
