-- Migration: Create knowledge_items table for spaced repetition and game quest
-- Created at 2026-06-11 11:18:40

CREATE TABLE IF NOT EXISTS public.knowledge_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_concept TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inbox' CONSTRAINT knowledge_items_status_check CHECK (status IN ('inbox', 'learning', 'mastered')),
  streak INTEGER NOT NULL DEFAULT 0 CONSTRAINT knowledge_items_streak_check CHECK (streak >= 0),
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_items ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for user isolation
DROP POLICY IF EXISTS "knowledge_items_select_own" ON public.knowledge_items;
CREATE POLICY "knowledge_items_select_own" ON public.knowledge_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "knowledge_items_insert_own" ON public.knowledge_items;
CREATE POLICY "knowledge_items_insert_own" ON public.knowledge_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "knowledge_items_update_own" ON public.knowledge_items;
CREATE POLICY "knowledge_items_update_own" ON public.knowledge_items
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "knowledge_items_delete_own" ON public.knowledge_items;
CREATE POLICY "knowledge_items_delete_own" ON public.knowledge_items
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_items_user_status ON public.knowledge_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_review ON public.knowledge_items(user_id, next_review_at);
