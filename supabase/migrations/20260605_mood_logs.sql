-- Mood Tracker: mood_logs table
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS mood_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood_score INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 5),
  impact_factors TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- Index for fast lookups by user and date range
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date ON mood_logs(user_id, date DESC);

-- RLS policies
ALTER TABLE mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mood logs"
  ON mood_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mood logs"
  ON mood_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mood logs"
  ON mood_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mood logs"
  ON mood_logs FOR DELETE
  USING (auth.uid() = user_id);
