'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { dailyLogSchema } from '@/lib/schema';
import { z } from 'zod';

const dietPlanSchema = z.object({
  target_kcal: z.number().int().min(500).max(10000),
  target_protein: z.number().int().min(0).max(500),
  target_carbs: z.number().int().min(0).max(1000),
  target_fats: z.number().int().min(0).max(300),
  breakfast_plan: z.string().max(1000),
  lunch_plan: z.string().max(1000),
  dinner_plan: z.string().max(1000),
});

export type DietPlan = z.infer<typeof dietPlanSchema>;

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

    if (error) {
      console.error('Error fetching diet plan:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      target_kcal: Number(data.target_kcal ?? 2000),
      target_protein: Number(data.target_protein ?? 150),
      target_carbs: Number(data.target_carbs ?? 200),
      target_fats: Number(data.target_fats ?? 70),
      breakfast_plan: String(data.breakfast_plan ?? ''),
      lunch_plan: String(data.lunch_plan ?? ''),
      dinner_plan: String(data.dinner_plan ?? ''),
    };
  } catch (err) {
    console.error('getDietPlan server action error:', err);
    return null;
  }
}

export async function saveDietPlan(plan: DietPlan): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const parsed = dietPlanSchema.safeParse(plan);
    if (!parsed.success) {
      return { success: false, error: 'Datos de plan inválidos.' };
    }

    const { error } = await supabase
      .from('user_diet_plans')
      .upsert({
        user_id: user.id,
        target_kcal: parsed.data.target_kcal,
        target_protein: parsed.data.target_protein,
        target_carbs: parsed.data.target_carbs,
        target_fats: parsed.data.target_fats,
        breakfast_plan: parsed.data.breakfast_plan,
        lunch_plan: parsed.data.lunch_plan,
        dinner_plan: parsed.data.dinner_plan,
        updated_at: new Date().toISOString(),
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

export async function autocompleteDietWithAi(): Promise<{ success: boolean; data?: DietPlan; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    // Fetch user habits & historical logs to contextualize recommendations
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
        carbs_g: data?.carbs_g || 0,
        fats_g: data?.fats_g || 0,
        toxinas: (data?.toxinas || []).join(', '),
      };
    });

    const contextPrompt = 
      `El usuario actual de BioAvatar solicita recomendaciones para su plan de nutrición óptimo diario. Su perfil y comportamiento de los últimos 15 días son:\n` +
      `- Hábitos activos actuales: ${activeHabits || 'Ninguno'}\n` +
      `- Historial de logs diarios de ingestas y salud:\n${JSON.stringify(historicalLogs, null, 2)}\n\n` +
      `Tu rol es el de un nutricionista deportivo y coach metabólico experto. Diseña un plan de nutrición que cubra:\n` +
      `1. target_kcal: Calorías totales lógicas diarias estimadas en base a sus ingestas reales previas y objetivos de salud (debe estar entre 1200 y 4000 kcal).\n` +
      `2. target_protein: Proteínas en gramos recomendadas (aprox. 1.6g a 2.2g por kg de peso, típicamente entre 80g y 220g).\n` +
      `3. target_carbs: Carbohidratos en gramos recomendados.\n` +
      `4. target_fats: Grasas saludables en gramos recomendados.\n` +
      `5. breakfast_plan: Sugerencia concreta y saludable para el Desayuno.\n` +
      `6. lunch_plan: Sugerencia concreta y saludable para la Comida.\n` +
      `7. dinner_plan: Sugerencia concreta y saludable para la Cena.\n\n` +
      `Asegúrate de que la suma de macronutrientes (Proteínas*4 + Carbohidratos*4 + Grasas*9) coincida aproximadamente con el total de calorías de forma matemáticamente consistente.\n` +
      `Devuelve exclusivamente el objeto JSON que encaje con el esquema.`;

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      system: 'Eres un nutricionista de precisión experto y generas planes de macros y porciones balanceados en base al historial real del usuario.',
      prompt: contextPrompt,
      schema: dietPlanSchema,
    });

    const parsed = dietPlanSchema.safeParse(result.object);
    if (!parsed.success) {
      return { success: false, error: 'La IA generó un plan inválido. Por favor, reintenta.' };
    }

    return { success: true, data: parsed.data };
  } catch (err) {
    console.error('autocompleteDietWithAi server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error al conectar con la Inteligencia Artificial.' };
  }
}
