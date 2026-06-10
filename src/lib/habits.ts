import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { type HabitRow } from '@/types/habits';

export function isMissingHabitTableError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  return (
    lower.includes('user_habits') &&
    (lower.includes('schema cache') || lower.includes('does not exist') || lower.includes('relation'))
  );
}

function createSupabaseClient(authHeader?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase env vars');

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: authHeader
      ? {
          headers: {
            Authorization: authHeader,
          },
        }
      : undefined,
  });
}

export function computeHabitOutcome(habit: HabitRow, amount: number) {
  if (habit.type === 'negative') {
    if (amount === 0) return 'perfect';
    return 'broken';
  }

  // positive
  if (amount >= (habit.target_value ?? habit.tolerance_threshold ?? 1)) return 'perfect';
  return 'missed';
}

export async function evaluateAndUpdateStreaks(
  supabase: SupabaseClient,
  userId: string,
  reports: Array<{ habit_id: number; amount: number }>
) {
  const { data: habits, error } = await supabase.from('user_habits').select('*').eq('user_id', userId);

  if (error) {
    if (isMissingHabitTableError(error)) {
      console.warn('[habits] user_habits table is not available yet; skipping streak updates.');
      return [];
    }

    throw error;
  }

  if (!habits) return [];

  const updates: Array<Partial<HabitRow> & { id: number }> = [];

  for (const h of habits as HabitRow[]) {
    const report = reports.find((r) => Number(r.habit_id) === Number(h.id));
    const amount = report ? Number(report.amount || 0) : 0;

    if (h.type === 'negative') {
      if (amount === 0) {
        const next = (h.current_streak ?? 0) + 1;
        const longest = Math.max(h.longest_streak ?? 0, next);
        updates.push({ id: h.id, current_streak: next, longest_streak: longest });
      } else {
        updates.push({ id: h.id, current_streak: 0 });
      }
    } else {
      if (amount >= (h.target_value ?? h.tolerance_threshold ?? 1)) {
        const next = (h.current_streak ?? 0) + 1;
        const longest = Math.max(h.longest_streak ?? 0, next);
        updates.push({ id: h.id, current_streak: next, longest_streak: longest });
      } else {
        if ((h.shields ?? 0) > 0) {
          updates.push({ id: h.id, shields: (h.shields ?? 0) - 1 });
        } else {
          updates.push({ id: h.id, current_streak: 0 });
        }
      }
    }
  }

  // Apply updates in parallel
  await Promise.all(
    updates.map(async (u) => {
      const { id, ...cols } = u;
      const { error } = await supabase.from('user_habits').update(cols).eq('id', id);
      if (error) console.error('Failed to update habit', id, error.message);
    })
  );

  return updates;
}

export function buildHabitVisualDescriptors(habits: HabitRow[]) {
  const descriptors: string[] = [];

  let allPerfect = true;

  for (const h of habits) {
    const name = h.name.toLowerCase();
    if (h.current_streak === 0) {
      allPerfect = false;
      if (name.includes('fumar') || name.includes('cigar')) {
        descriptors.push('smoggy background, coughing, tired eyes, dirty fur');
      } else if (name.includes('azúcar') || name.includes('sugar')) {
        descriptors.push('sluggish, heavy, surrounded by synthetic neon lights');
      } else {
        descriptors.push(`${name} struggle, subtle signs of neglect`);
      }
    } else if (h.current_streak > 0 && h.current_streak < (h.longest_streak ?? 0)) {
      allPerfect = false;
      descriptors.push(`${name} partial, tired but recovering`);
    }
  }

  if (allPerfect) descriptors.push('athletic posture, golden hour sunlight, sharp eyes, pristine nature');

  return descriptors.join(', ');
}
