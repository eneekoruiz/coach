-- Migration: Create chat_history and refactor mood_logs for multi-registration
-- Run this in your Supabase SQL Editor

-- 1) Create chat_history table
CREATE TABLE IF NOT EXISTS public.chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on chat_history
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for chat_history
DROP POLICY IF EXISTS "chat_history_select_own" ON public.chat_history;
CREATE POLICY "chat_history_select_own" ON public.chat_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_history_insert_own" ON public.chat_history;
CREATE POLICY "chat_history_insert_own" ON public.chat_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_history_user ON public.chat_history(user_id, created_at DESC);


-- 2) Refactor mood_logs table
-- Remove unique constraint to allow multi-registration per day
ALTER TABLE public.mood_logs DROP CONSTRAINT IF EXISTS mood_logs_user_id_date_key;

-- Add logged_at column to record the exact timestamp
ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS logged_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Drop existing unique indexes if they restrict date/user combinations
DROP INDEX IF EXISTS idx_mood_logs_user_date;
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date ON mood_logs(user_id, date DESC, logged_at DESC);
