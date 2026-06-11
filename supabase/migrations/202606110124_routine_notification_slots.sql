-- Task 124: multi-slot routine notification UX.
-- Stores one native HH:MM slot per requested repetition without requiring a separate table yet.

ALTER TABLE public.routine_templates
  ADD COLUMN IF NOT EXISTS notification_times JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.routine_templates
SET notification_times = '[]'::jsonb
WHERE notification_times IS NULL
   OR jsonb_typeof(notification_times) <> 'array';

ALTER TABLE public.routine_templates
  DROP CONSTRAINT IF EXISTS routine_templates_notification_times_array;

ALTER TABLE public.routine_templates
  ADD CONSTRAINT routine_templates_notification_times_array
  CHECK (jsonb_typeof(notification_times) = 'array');
