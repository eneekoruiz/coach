ALTER TABLE public.user_habits
  ADD COLUMN IF NOT EXISTS sobriety_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_relapse_at TIMESTAMPTZ;

UPDATE public.user_habits
SET sobriety_started_at = COALESCE(sobriety_started_at, created_at, now())
WHERE type = 'negative';
