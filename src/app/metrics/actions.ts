'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { bodyMetricSchema, type BodyMetric } from '@/lib/schema';

export async function saveBodyMetric(metric: BodyMetric): Promise<{ success: boolean; data?: BodyMetric; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const parsed = bodyMetricSchema.safeParse(metric);
    if (!parsed.success) {
      return { success: false, error: 'Métrica corporal inválida.' };
    }

    const payload = {
      user_id: user.id,
      date: parsed.data.date,
      weight: parsed.data.weight,
      chest: parsed.data.chest ?? null,
      arm_left: parsed.data.arm_left ?? null,
      arm_right: parsed.data.arm_right ?? null,
      waist: parsed.data.waist ?? null,
      hip: parsed.data.hip ?? null,
      thigh: parsed.data.thigh ?? null,
      body_fat_percentage: parsed.data.body_fat_percentage ?? null,
      muscle_mass: parsed.data.muscle_mass ?? null,
      notes: parsed.data.notes ?? null,
    };

    const { data, error } = await supabase
      .from('body_metrics')
      .upsert(payload, { onConflict: 'user_id,date' })
      .select('*')
      .single();

    if (error) throw error;

    return {
      success: true,
      data: {
        id: data.id,
        user_id: data.user_id,
        date: data.date,
        weight: Number(data.weight),
        chest: data.chest === null ? null : Number(data.chest),
        arm_left: data.arm_left === null ? null : Number(data.arm_left),
        arm_right: data.arm_right === null ? null : Number(data.arm_right),
        waist: data.waist === null ? null : Number(data.waist),
        hip: data.hip === null ? null : Number(data.hip),
        thigh: data.thigh === null ? null : Number(data.thigh),
        body_fat_percentage: data.body_fat_percentage === null ? null : Number(data.body_fat_percentage),
        muscle_mass: data.muscle_mass === null ? null : Number(data.muscle_mass),
        notes: data.notes,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error guardando la métrica corporal.' };
  }
}

export async function getBodyMetrics(limit = 30): Promise<BodyMetric[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) {
      console.warn(`[Supabase] body_metrics: ${error.message}`);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      date: row.date,
      weight: Number(row.weight),
      chest: row.chest === null ? null : Number(row.chest),
      arm_left: row.arm_left === null ? null : Number(row.arm_left),
      arm_right: row.arm_right === null ? null : Number(row.arm_right),
      waist: row.waist === null ? null : Number(row.waist),
      hip: row.hip === null ? null : Number(row.hip),
      thigh: row.thigh === null ? null : Number(row.thigh),
      body_fat_percentage: row.body_fat_percentage === null ? null : Number(row.body_fat_percentage),
      muscle_mass: row.muscle_mass === null ? null : Number(row.muscle_mass),
      notes: row.notes,
    }));
  } catch (error) {
    console.error('getBodyMetrics error:', error);
    return [];
  }
}

export async function getLatestBodyMetric(): Promise<BodyMetric | null> {
  const metrics = await getBodyMetrics(1);
  return metrics.at(-1) ?? null;
}
