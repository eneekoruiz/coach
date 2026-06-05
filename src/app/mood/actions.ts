'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { moodEntrySchema, type MoodEntry } from '@/lib/schema';

/**
 * Save or update a mood entry for today
 */
export async function saveMoodEntry(
  moodScore: number,
  impactFactors: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .from('mood_logs')
      .upsert(
        {
          user_id: user.id,
          date: today,
          mood_score: moodScore,
          impact_factors: impactFactors,
        },
        { onConflict: 'user_id,date' }
      );

    if (error) {
      console.error('[saveMoodEntry] Supabase error:', error.message);
      return { success: false, error: 'Error al guardar en base de datos.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[saveMoodEntry] Unexpected error:', err);
    return { success: false, error: 'Error inesperado.' };
  }
}

/**
 * Get today's mood entry
 */
export async function getTodayMoodEntry(): Promise<MoodEntry | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.warn('[getTodayMoodEntry] Supabase error:', error.message);
      return null;
    }

    if (!data) return null;

    const parsed = moodEntrySchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.error('[getTodayMoodEntry] Unexpected error:', err);
    return null;
  }
}

/**
 * Get mood entries for a given month (for the heatmap calendar)
 */
export async function getMoodEntriesForMonth(
  year: number,
  month: number // 0-indexed (0 = January)
): Promise<MoodEntry[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.warn('[getMoodEntriesForMonth] Supabase error:', error.message);
      return [];
    }

    if (!data) return [];

    const entries: MoodEntry[] = [];
    for (const row of data) {
      const parsed = moodEntrySchema.safeParse(row);
      if (parsed.success) entries.push(parsed.data);
    }

    return entries;
  } catch (err) {
    console.error('[getMoodEntriesForMonth] Unexpected error:', err);
    return [];
  }
}
