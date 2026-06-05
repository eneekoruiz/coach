-- Migration: Achievements & User Achievements Schema
-- Date: 2026-06-05

CREATE TABLE IF NOT EXISTS public.achievements (
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
    achievement_id TEXT NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT user_achievements_user_id_achievement_id_key UNIQUE (user_id, achievement_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for achievements (Any authenticated user can read)
CREATE POLICY "Allow read access to achievements for all authenticated users"
    ON public.achievements
    FOR SELECT
    TO authenticated
    USING (true);

-- Policies for user_achievements (Users can read/write their own records)
CREATE POLICY "Allow read access to user_achievements for own user"
    ON public.user_achievements
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Allow insert access to user_achievements for own user"
    ON public.user_achievements
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Insert initial badges/achievements
INSERT INTO public.achievements (id, title, description, badge_icon, xp_reward)
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
