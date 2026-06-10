-- Task 120: recovery pledge/review layer for negative habits.

CREATE TABLE IF NOT EXISTS public.habit_recovery_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_id bigint NOT NULL REFERENCES public.user_habits(id) ON DELETE CASCADE,
  checkin_date date NOT NULL,
  pledged_at timestamptz,
  pledge_text text,
  pledge_status text NOT NULL DEFAULT 'pledged',
  reviewed_at timestamptz,
  kept_promise boolean,
  difficulty smallint,
  trigger_tags text[] NOT NULL DEFAULT '{}'::text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT habit_recovery_checkins_status_check CHECK (pledge_status IN ('pledged', 'skipped')),
  CONSTRAINT habit_recovery_checkins_difficulty_check CHECK (difficulty IS NULL OR difficulty BETWEEN 1 AND 5),
  CONSTRAINT habit_recovery_checkins_user_habit_day_key UNIQUE (user_id, habit_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_recovery_checkins_user_date
  ON public.habit_recovery_checkins(user_id, checkin_date DESC);

CREATE INDEX IF NOT EXISTS idx_habit_recovery_checkins_habit_date
  ON public.habit_recovery_checkins(habit_id, checkin_date DESC);

ALTER TABLE public.habit_recovery_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS habit_recovery_checkins_select_own ON public.habit_recovery_checkins;
DROP POLICY IF EXISTS habit_recovery_checkins_insert_own ON public.habit_recovery_checkins;
DROP POLICY IF EXISTS habit_recovery_checkins_update_own ON public.habit_recovery_checkins;
DROP POLICY IF EXISTS habit_recovery_checkins_delete_own ON public.habit_recovery_checkins;

CREATE POLICY habit_recovery_checkins_select_own
  ON public.habit_recovery_checkins
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY habit_recovery_checkins_insert_own
  ON public.habit_recovery_checkins
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.user_habits h
      WHERE h.id = habit_id
        AND h.user_id = auth.uid()
        AND h.type = 'negative'
    )
  );

CREATE POLICY habit_recovery_checkins_update_own
  ON public.habit_recovery_checkins
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY habit_recovery_checkins_delete_own
  ON public.habit_recovery_checkins
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_habit_recovery_checkins_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_habit_recovery_checkins_updated_at ON public.habit_recovery_checkins;
CREATE TRIGGER trg_habit_recovery_checkins_updated_at
  BEFORE UPDATE ON public.habit_recovery_checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.set_habit_recovery_checkins_updated_at();

