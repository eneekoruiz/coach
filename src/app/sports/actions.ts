'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { workoutSchema, type Workout } from '@/lib/schema';

const SPORT_BURN_RATE: Record<string, Record<'low' | 'moderate' | 'high', number>> = {
  'Pesas': { low: 4, moderate: 6, high: 8 },
  'Correr': { low: 8, moderate: 11, high: 14 },
  'Padel': { low: 6, moderate: 8, high: 10 },
  'Caminar': { low: 3, moderate: 4, high: 5 },
  'Bici': { low: 5, moderate: 8, high: 11 },
};

function estimateWorkoutCalories(sportType: string, duration: number, intensity: 'low' | 'moderate' | 'high') {
  const perMinute = SPORT_BURN_RATE[sportType]?.[intensity] ?? SPORT_BURN_RATE['Caminar'][intensity];
  return Math.round(duration * perMinute);
}

export async function saveWorkout(workout: Workout): Promise<{ success: boolean; data?: Workout; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const normalizedWorkout = {
      ...workout,
      kcal_burned:
        workout.kcal_burned > 0
          ? workout.kcal_burned
          : estimateWorkoutCalories(workout.sport_type, workout.duration_minutes, workout.intensity),
    };

    const parsed = workoutSchema.safeParse(normalizedWorkout);
    if (!parsed.success) {
      return { success: false, error: 'Entrenamiento inválido.' };
    }

    const payload = {
      user_id: user.id,
      date: parsed.data.date,
      sport_type: parsed.data.sport_type,
      duration_minutes: parsed.data.duration_minutes,
      intensity: parsed.data.intensity,
      kcal_burned: parsed.data.kcal_burned,
      notes: parsed.data.notes ?? null,
    };

    const { data, error } = await supabase.from('workouts').insert(payload).select('*').single();
    if (error) throw error;

    return {
      success: true,
      data: {
        id: data.id,
        user_id: data.user_id,
        date: data.date,
        sport_type: data.sport_type,
        duration_minutes: data.duration_minutes,
        intensity: data.intensity,
        kcal_burned: data.kcal_burned,
        notes: data.notes,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error guardando el entrenamiento.' };
  }
}

export async function getWorkouts(limit = 20): Promise<Workout[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn(`[Supabase] workouts: ${error.message}`);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      date: row.date,
      sport_type: row.sport_type,
      duration_minutes: row.duration_minutes,
      intensity: row.intensity,
      kcal_burned: row.kcal_burned,
      notes: row.notes,
    }));
  } catch (error) {
    console.error('getWorkouts error:', error);
    return [];
  }
}

export async function getTodayWorkoutSummary(date: string): Promise<{ totalCalories: number; totalMinutes: number; workouts: Workout[] }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { totalCalories: 0, totalMinutes: 0, workouts: [] };

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn(`[Supabase] today workouts: ${error.message}`);
      return { totalCalories: 0, totalMinutes: 0, workouts: [] };
    }

    const workouts = (data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      date: row.date,
      sport_type: row.sport_type,
      duration_minutes: row.duration_minutes,
      intensity: row.intensity,
      kcal_burned: row.kcal_burned,
      notes: row.notes,
    }));

    return {
      workouts,
      totalCalories: workouts.reduce((sum, workout) => sum + workout.kcal_burned, 0),
      totalMinutes: workouts.reduce((sum, workout) => sum + workout.duration_minutes, 0),
    };
  } catch (error) {
    console.error('getTodayWorkoutSummary error:', error);
    return { totalCalories: 0, totalMinutes: 0, workouts: [] };
  }
}
