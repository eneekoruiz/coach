-- Migration: Routine Checklist
-- Path: sql/migrations/20260605_routine_checklist.sql

CREATE TABLE IF NOT EXISTS public.routine_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.routine_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID NOT NULL REFERENCES public.routine_templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (routine_id, completed_date)
);

-- Habilitar RLS
ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para routine_templates
CREATE POLICY "Users can view their own routine templates"
    ON public.routine_templates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routine templates"
    ON public.routine_templates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routine templates"
    ON public.routine_templates FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routine templates"
    ON public.routine_templates FOR DELETE
    USING (auth.uid() = user_id);

-- Políticas para routine_logs
CREATE POLICY "Users can view their own routine logs"
    ON public.routine_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routine logs"
    ON public.routine_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routine logs"
    ON public.routine_logs FOR DELETE
    USING (auth.uid() = user_id);

-- Índice en routine_logs(user_id, completed_date)
CREATE INDEX IF NOT EXISTS idx_routine_logs_user_date ON public.routine_logs (user_id, completed_date);
