'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { moodEntrySchema, type MoodEntry } from '@/lib/schema';

/**
 * Save a new mood entry (allows multi-registration, supports custom date and daily summary flag)
 */
export async function saveMoodEntry(
  moodScore: number,
  impactFactors: string[],
  date?: string,
  isDailySummary?: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const today = new Date().toISOString().split('T')[0];
    const targetDate = date || today;

    const payload = {
        user_id: user.id,
        date: targetDate,
        mood_score: moodScore, // Compatibility field
        valence_score: moodScore,
        impact_factors: impactFactors, // Compatibility field
        impact_tags: impactFactors,
        is_daily_summary: isDailySummary || false,
        created_at_timestamp: new Date().toISOString(),
        logged_at: new Date().toISOString(), // Compatibility field
      };

    let error: { message: string } | null = null;
    if (isDailySummary) {
      const { data: existingSummary, error: lookupError } = await supabase
        .from('mood_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', targetDate)
        .eq('is_daily_summary', true)
        .maybeSingle();

      if (lookupError) {
        error = lookupError;
      } else if (existingSummary?.id) {
        const updateResult = await supabase
          .from('mood_logs')
          .update(payload)
          .eq('id', existingSummary.id)
          .eq('user_id', user.id);
        error = updateResult.error;
      } else {
        const insertResult = await supabase.from('mood_logs').insert(payload);
        error = insertResult.error;
      }
    } else {
      const insertResult = await supabase.from('mood_logs').insert(payload);
      error = insertResult.error;
    }

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
 * Delete a specific mood entry by ID
 */
export async function deleteMoodEntry(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado.' };

    const { error } = await supabase
      .from('mood_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[deleteMoodEntry] Supabase error:', error.message);
      return { success: false, error: 'Error al eliminar de la base de datos.' };
    }

    return { success: true };
  } catch (err) {
    console.error('[deleteMoodEntry] Unexpected error:', err);
    return { success: false, error: 'Error inesperado.' };
  }
}

/**
 * Get today's mood entries
 */
export async function getTodayMoodEntries(): Promise<MoodEntry[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at_timestamp', { ascending: false });

    if (error) {
      console.warn('[getTodayMoodEntries] Supabase error:', error.message);
      return [];
    }

    if (!data) return [];

    const entries: MoodEntry[] = [];
    for (const row of data) {
      // Inject fallback values for parsing compatibility
      const enrichedRow = {
        ...row,
        mood_score: row.mood_score ?? (row.valence_score ? Math.round(Number(row.valence_score)) : 3),
        valence_score: row.valence_score ?? row.mood_score ?? 3,
        impact_factors: row.impact_factors ?? row.impact_tags ?? [],
        impact_tags: row.impact_tags ?? row.impact_factors ?? [],
        created_at_timestamp: row.created_at_timestamp ?? row.logged_at ?? row.created_at,
        logged_at: row.logged_at ?? row.created_at_timestamp ?? row.created_at,
      };
      const parsed = moodEntrySchema.safeParse(enrichedRow);
      if (parsed.success) entries.push(parsed.data);
    }
    return entries;
  } catch (err) {
    console.error('[getTodayMoodEntries] Unexpected error:', err);
    return [];
  }
}

/**
 * Get today's latest mood entry (for compatibility)
 */
export async function getTodayMoodEntry(): Promise<MoodEntry | null> {
  try {
    const entries = await getTodayMoodEntries();
    return entries.length > 0 ? entries[0] : null;
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
      .order('date', { ascending: true })
      .order('created_at_timestamp', { ascending: true });

    if (error) {
      console.warn('[getMoodEntriesForMonth] Supabase error:', error.message);
      return [];
    }

    if (!data) return [];

    const entries: MoodEntry[] = [];
    for (const row of data) {
      const enrichedRow = {
        ...row,
        mood_score: row.mood_score ?? (row.valence_score ? Math.round(Number(row.valence_score)) : 3),
        valence_score: row.valence_score ?? row.mood_score ?? 3,
        impact_factors: row.impact_factors ?? row.impact_tags ?? [],
        impact_tags: row.impact_tags ?? row.impact_factors ?? [],
        created_at_timestamp: row.created_at_timestamp ?? row.logged_at ?? row.created_at,
        logged_at: row.logged_at ?? row.created_at_timestamp ?? row.created_at,
      };
      const parsed = moodEntrySchema.safeParse(enrichedRow);
      if (parsed.success) entries.push(parsed.data);
    }

    return entries;
  } catch (err) {
    console.error('[getMoodEntriesForMonth] Unexpected error:', err);
    return [];
  }
}
