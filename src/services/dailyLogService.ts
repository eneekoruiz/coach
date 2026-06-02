import { type SupabaseClient } from '@supabase/supabase-js';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';

export interface UpsertDailyLogParams {
  supabase: SupabaseClient;
  userId: string;
  date: string; // YYYY-MM-DD
  healthMomentum: number;
  aiData: DailyLog;
  habitTracking: Array<{ habit_id: number; amount: number }>;
}

/**
 * Shared database helper that performs a single, validated .upsert()
 * on the daily_logs table on conflict of (user_id, date).
 */
export async function upsertDailyLog(params: UpsertDailyLogParams) {
  const { supabase, userId, date, healthMomentum, aiData, habitTracking } = params;

  // Validate the AI data object against our strict schema contract
  const validatedAiData = dailyLogSchema.parse(aiData);

  const { data, error } = await supabase
    .from('daily_logs')
    .upsert(
      {
        user_id: userId,
        date,
        health_momentum: healthMomentum,
        ai_data: validatedAiData,
        habit_tracking: habitTracking,
      },
      { onConflict: 'user_id,date' }
    )
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Error al persistir el registro diario en Supabase.');
  }

  return data;
}
