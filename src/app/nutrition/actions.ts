'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { dailyLogSchema } from '@/lib/schema';
import { z } from 'zod';

import { dailyDietTargetSchema, weeklyDietScheduleSchema, type DailyDietTarget, type WeeklyDietSchedule, defaultDailyPlan, defaultWeeklyPlan } from '@/lib/schema';

export type DietPlan = {
  active: boolean;
  weekly_schedule: WeeklyDietSchedule;
};

export async function getDietPlan(): Promise<DietPlan | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_diet_plans')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    // 1. Interceptar el error de la DB ANTES de pasarlo a Zod
    if (error) {
      console.warn(`[Supabase Fetch Warning] Tabla user_diet_plans: ${error.message}`);
      // 2. Retornar SIEMPRE un Fallback válido según la vista (null o { valores: 0 })
      return null;
    }
    if (!data) return null;

    // 3. Solo si hay datos limpios, usamos Zod con safeParse
    const parsed = weeklyDietScheduleSchema.safeParse(data.weekly_schedule);
    if (!parsed.success) {
      console.error('[Zod Parse Error]', parsed.error);
      return null;
    }

    return {
      active: data.active ?? true,
      weekly_schedule: parsed.data,
    };
  } catch (err) {
    console.error('getDietPlan server action error:', err);
    return null;
  }
}

export async function saveDietPlan(schedule: WeeklyDietSchedule): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const parsed = weeklyDietScheduleSchema.safeParse(schedule);
    if (!parsed.success) {
      return { success: false, error: 'Estructura semanal inválida.' };
    }

    const { error } = await supabase
      .from('user_diet_plans')
      .upsert({
        user_id: user.id,
        active: true,
        weekly_schedule: parsed.data,
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving diet plan:', error.message);
      return { success: false, error: 'Error al guardar en base de datos. Asegúrate de ejecutar la migración SQL en Supabase.' };
    }

    return { success: true };
  } catch (err) {
    console.error('saveDietPlan server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

export async function autocompleteDietWithAi(): Promise<{ success: boolean; data?: WeeklyDietSchedule; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const [habitsRes, logsRes] = await Promise.all([
      supabase.from('user_habits').select('name, type').eq('user_id', user.id),
      supabase.from('daily_logs').select('date, ai_data, health_momentum').order('date', { ascending: false }).limit(15),
    ]);

    const activeHabits = (habitsRes.data || []).map(h => `${h.name} (${h.type === 'positive' ? 'positivo' : 'negativo'})`).join(', ');

    const historicalLogs = (logsRes.data || []).map(log => {
      const validated = dailyLogSchema.safeParse(log.ai_data);
      const data = validated.success ? validated.data : null;
      return {
        date: log.date,
        health_momentum: log.health_momentum,
        water_ml: data?.water_ml || 0,
        total_kcal: data?.total_kcal || 0,
        protein_g: data?.protein_g || 0,
      };
    });

    const contextPrompt = 
      `El usuario actual de BioAvatar solicita un plan nutricional semanal completo. Perfil:\n` +
      `- Hábitos activos: ${activeHabits || 'Ninguno'}\n` +
      `- Logs previos:\n${JSON.stringify(historicalLogs, null, 2)}\n\n` +
      `Tu rol: Nutricionista deportivo experto.\n` +
      `Genera un objeto JSON con 7 claves (lunes, martes, miercoles, jueves, viernes, sabado, domingo).\n` +
      `Cada día debe incluir:\n` +
      `- target_kcal (1200-4000)\n` +
      `- target_protein, target_carbs, target_fats (balanceados y matemáticamente consistentes P*4+C*4+F*9 ~= kcal)\n` +
      `- meals: { breakfast, lunch, dinner, snacks }\n\n` +
      `Importante: Varía las comidas cada día para no aburrir al usuario, manteniendo los macros constantes o adaptándolos ligeramente si hay días de más desgaste (ej. fin de semana).`;

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      system: 'Eres un nutricionista de precisión experto y generas planes de macros y menús variados para toda la semana.',
      prompt: contextPrompt,
      schema: weeklyDietScheduleSchema,
    });

    const parsed = weeklyDietScheduleSchema.safeParse(result.object);
    if (!parsed.success) {
      return { success: false, error: 'La IA generó un plan inválido.' };
    }

    return { success: true, data: parsed.data };
  } catch (err) {
    console.error('autocompleteDietWithAi server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error al conectar con la Inteligencia Artificial.' };
  }
}
