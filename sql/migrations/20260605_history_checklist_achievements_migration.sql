-- Consolidated migration for Tarea 74
-- Consolidates routine_templates, routine_logs, achievements_locked, user_achievements, and mood_logs

-- 1) mood_logs table (ensure fields match specification)
CREATE TABLE IF NOT EXISTS public.mood_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    valence_score NUMERIC CHECK (valence_score >= 1.0 AND valence_score <= 5.0),
    impact_tags TEXT[] DEFAULT '{}',
    is_daily_summary BOOLEAN DEFAULT false
);

ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS created_at_timestamp TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS valence_score NUMERIC CHECK (valence_score >= 1.0 AND valence_score <= 5.0);
ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS impact_tags TEXT[] DEFAULT '{}';
ALTER TABLE public.mood_logs ADD COLUMN IF NOT EXISTS is_daily_summary BOOLEAN DEFAULT false;

-- 2) routine_templates & routine_logs
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

-- 3) achievements_locked & user_achievements
CREATE TABLE IF NOT EXISTS public.achievements_locked (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    badge_icon TEXT,
    xp_reward INTEGER DEFAULT 100 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES public.achievements_locked(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements_locked ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
    -- mood_logs policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mood_logs_select_own') THEN
        CREATE POLICY mood_logs_select_own ON public.mood_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'mood_logs_insert_own') THEN
        CREATE POLICY mood_logs_insert_own ON public.mood_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;

    -- routine_templates policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own routine templates') THEN
        CREATE POLICY "Users can view their own routine templates" ON public.routine_templates FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own routine templates') THEN
        CREATE POLICY "Users can insert their own routine templates" ON public.routine_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own routine templates') THEN
        CREATE POLICY "Users can delete their own routine templates" ON public.routine_templates FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- routine_logs policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own routine logs') THEN
        CREATE POLICY "Users can view their own routine logs" ON public.routine_logs FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own routine logs') THEN
        CREATE POLICY "Users can insert their own routine logs" ON public.routine_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own routine logs') THEN
        CREATE POLICY "Users can delete their own routine logs" ON public.routine_logs FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- achievements_locked policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to achievements_locked for authenticated') THEN
        CREATE POLICY "Allow read access to achievements_locked for authenticated" ON public.achievements_locked FOR SELECT TO authenticated USING (true);
    END IF;

    -- user_achievements policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read access to user_achievements for own user') THEN
        CREATE POLICY "Allow read access to user_achievements for own user" ON public.user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert access to user_achievements for own user') THEN
        CREATE POLICY "Allow insert access to user_achievements for own user" ON public.user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- Seed initial achievements in achievements_locked
INSERT INTO public.achievements_locked (id, title, description, badge_icon, xp_reward)
VALUES
    ('streak_3', 'Racha Inicial', 'Registra tus hábitos durante 3 días consecutivos.', '🔥', 150),
    ('streak_7', 'Súper Racha', 'Registra tus hábitos durante 7 días consecutivos.', '👑', 300),
    ('hydration_master', 'Maestro de la Hidratación', 'Consigue beber más de 3000 ml de agua en un solo día.', '💧', 200),
    ('momentum_hero', 'Héroe del Momentum', 'Alcanza una inercia/momentum superior a 120 puntos.', '🚀', 250),
    ('close_day_first', 'Día Completado', 'Genera tu primer informe de cierre de día.', '🌅', 100)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    badge_icon = EXCLUDED.badge_icon,
    xp_reward = EXCLUDED.xp_reward;
