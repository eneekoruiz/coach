ALTER TABLE public.user_habits
  ADD COLUMN IF NOT EXISTS slip_allowance INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS slip_window_days INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS slip_penalty_hours INTEGER NOT NULL DEFAULT 24;

UPDATE public.user_habits
SET
  slip_allowance = COALESCE(slip_allowance, 1),
  slip_window_days = COALESCE(slip_window_days, 7),
  slip_penalty_hours = COALESCE(slip_penalty_hours, 24)
WHERE type = 'negative';
