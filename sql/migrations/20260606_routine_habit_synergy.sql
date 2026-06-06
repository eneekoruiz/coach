-- Migration: Routine Habit Synergy
-- Path: sql/migrations/20260606_routine_habit_synergy.sql

ALTER TABLE public.routine_templates
    ADD COLUMN IF NOT EXISTS time_of_day TEXT CHECK (time_of_day IN ('morning', 'afternoon', 'night')) DEFAULT 'morning' NOT NULL,
    ADD COLUMN IF NOT EXISTS linked_habit_id BIGINT REFERENCES public.user_habits(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS habit_increment_amount INTEGER DEFAULT 1 NOT NULL;
