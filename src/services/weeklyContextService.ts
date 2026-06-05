'use server';

import { createSupabaseServerClient } from '@/lib/supabase-server';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';

/**
 * Compact 7-day summary for RAG injection into the AI system prompt.
 * Returns a JSON-serializable object with averages, streaks, and mood data.
 */
export interface WeeklyContext {
  period: string;
  days_with_data: number;
  avg_kcal: number;
  avg_water_ml: number;
  avg_protein_g: number;
  avg_carbs_g: number;
  avg_fats_g: number;
  avg_momentum: number;
  momentum_trend: 'up' | 'down' | 'stable';
  mood_scores: Array<{ date: string; score: number }>;
  avg_mood: number | null;
  top_impact_factors: string[];
  habit_compliance: Record<string, { days_active: number; total: number }>;
  toxins_this_week: string[];
  correlations: string[];
}

export async function getWeeklyContext(): Promise<WeeklyContext | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    // Fetch daily_logs for last 7 days
    const { data: logs, error: logsError } = await supabase
      .from('daily_logs')
      .select('date, health_momentum, ai_data')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (logsError || !logs) return null;

    // Fetch mood_logs for last 7 days
    const { data: moodLogs, error: moodError } = await supabase
      .from('mood_logs')
      .select('date, mood_score, impact_factors')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    // Parse daily logs
    const parsedLogs: Array<{ date: string; momentum: number; data: DailyLog }> = [];
    for (const row of logs) {
      if (row.ai_data) {
        const parsed = dailyLogSchema.safeParse(row.ai_data);
        if (parsed.success) {
          parsedLogs.push({ date: row.date, momentum: row.health_momentum, data: parsed.data });
        }
      }
    }

    if (parsedLogs.length === 0) return null;

    // Calculate averages
    const n = parsedLogs.length;
    const avgKcal = Math.round(parsedLogs.reduce((s, l) => s + (l.data.total_kcal || 0), 0) / n);
    const avgWater = Math.round(parsedLogs.reduce((s, l) => s + (l.data.water_ml || l.data.hidratacion_ml || 0), 0) / n);
    const avgProtein = Math.round(parsedLogs.reduce((s, l) => s + (l.data.protein_g || 0), 0) / n);
    const avgCarbs = Math.round(parsedLogs.reduce((s, l) => s + (l.data.carbs_g || 0), 0) / n);
    const avgFats = Math.round(parsedLogs.reduce((s, l) => s + (l.data.fats_g || 0), 0) / n);
    const avgMomentum = Math.round(parsedLogs.reduce((s, l) => s + l.momentum, 0) / n);

    // Momentum trend
    const firstMomentum = parsedLogs[0].momentum;
    const lastMomentum = parsedLogs[parsedLogs.length - 1].momentum;
    const momentumTrend: 'up' | 'down' | 'stable' =
      lastMomentum > firstMomentum + 3 ? 'up' :
      lastMomentum < firstMomentum - 3 ? 'down' : 'stable';

    // Mood data
    const moodScores = (moodLogs || []).map(m => ({ date: m.date, score: m.mood_score }));
    const avgMood = moodScores.length > 0
      ? Math.round((moodScores.reduce((s, m) => s + m.score, 0) / moodScores.length) * 10) / 10
      : null;

    // Impact factors frequency
    const factorCount: Record<string, number> = {};
    for (const m of (moodLogs || [])) {
      if (Array.isArray(m.impact_factors)) {
        for (const f of m.impact_factors) {
          factorCount[f] = (factorCount[f] || 0) + 1;
        }
      }
    }
    const topFactors = Object.entries(factorCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([f]) => f);

    // Habit compliance
    const habitCompliance: Record<string, { days_active: number; total: number }> = {};
    for (const log of parsedLogs) {
      if (log.data.habits_count) {
        for (const [key, val] of Object.entries(log.data.habits_count)) {
          if (!habitCompliance[key]) habitCompliance[key] = { days_active: 0, total: 0 };
          if (val > 0) habitCompliance[key].days_active++;
          habitCompliance[key].total += val;
        }
      }
    }

    // Toxins
    const allToxins = new Set<string>();
    for (const log of parsedLogs) {
      if (log.data.toxinas) {
        for (const t of log.data.toxinas) allToxins.add(t);
      }
    }

    // Simple correlations
    const correlations: string[] = [];

    // Correlation: mood vs water
    if (moodScores.length >= 3) {
      const moodMap = new Map(moodScores.map(m => [m.date, m.score]));
      const highWaterDays = parsedLogs.filter(l => (l.data.water_ml || l.data.hidratacion_ml || 0) >= 1500);
      const lowWaterDays = parsedLogs.filter(l => (l.data.water_ml || l.data.hidratacion_ml || 0) < 1000);

      const avgMoodHighWater = highWaterDays.length > 0
        ? highWaterDays.reduce((s, l) => s + (moodMap.get(l.date) || 3), 0) / highWaterDays.length
        : 0;
      const avgMoodLowWater = lowWaterDays.length > 0
        ? lowWaterDays.reduce((s, l) => s + (moodMap.get(l.date) || 3), 0) / lowWaterDays.length
        : 0;

      if (avgMoodHighWater > avgMoodLowWater + 0.5 && highWaterDays.length >= 2) {
        correlations.push('Los días con buena hidratación (>1.5L) coinciden con mejor ánimo.');
      }
    }

    // Correlation: protein vs momentum
    const highProteinDays = parsedLogs.filter(l => (l.data.protein_g || 0) >= 100);
    const lowProteinDays = parsedLogs.filter(l => (l.data.protein_g || 0) < 50 && (l.data.protein_g || 0) > 0);
    if (highProteinDays.length >= 2 && lowProteinDays.length >= 1) {
      const avgMomHigh = highProteinDays.reduce((s, l) => s + l.momentum, 0) / highProteinDays.length;
      const avgMomLow = lowProteinDays.reduce((s, l) => s + l.momentum, 0) / lowProteinDays.length;
      if (avgMomHigh > avgMomLow + 5) {
        correlations.push('Los días con proteína alta (>100g) muestran mejor inercia metabólica.');
      }
    }

    // Correlation: toxins vs mood
    if (allToxins.size > 0 && moodScores.length >= 2) {
      const moodMap = new Map(moodScores.map(m => [m.date, m.score]));
      const toxinDays = parsedLogs.filter(l => l.data.toxinas && l.data.toxinas.length > 0);
      const cleanDays = parsedLogs.filter(l => !l.data.toxinas || l.data.toxinas.length === 0);
      if (toxinDays.length >= 1 && cleanDays.length >= 1) {
        const avgMoodToxin = toxinDays.reduce((s, l) => s + (moodMap.get(l.date) || 3), 0) / toxinDays.length;
        const avgMoodClean = cleanDays.reduce((s, l) => s + (moodMap.get(l.date) || 3), 0) / cleanDays.length;
        if (avgMoodClean > avgMoodToxin + 0.3) {
          correlations.push('Los días sin toxinas correlacionan con mejor estado de ánimo.');
        }
      }
    }

    return {
      period: `${startDate} → ${endDate}`,
      days_with_data: n,
      avg_kcal: avgKcal,
      avg_water_ml: avgWater,
      avg_protein_g: avgProtein,
      avg_carbs_g: avgCarbs,
      avg_fats_g: avgFats,
      avg_momentum: avgMomentum,
      momentum_trend: momentumTrend,
      mood_scores: moodScores,
      avg_mood: avgMood,
      top_impact_factors: topFactors,
      habit_compliance: habitCompliance,
      toxins_this_week: Array.from(allToxins),
      correlations,
    };
  } catch (err) {
    console.error('[getWeeklyContext] Error:', err);
    return null;
  }
}
