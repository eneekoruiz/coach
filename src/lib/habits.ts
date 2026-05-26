import { createClient } from '@supabase/supabase-js';

type UserHabit = {
  id: number;
  user_id: string;
  name: string;
  type: 'positive' | 'negative';
  is_custom: boolean;
  tolerance_threshold: number;
  current_streak: number;
  longest_streak: number;
  shields: number;
};

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

export function computeHabitOutcome(habit: UserHabit, amount: number) {
  // returns state: 'perfect' | 'yellow' | 'broken' | 'no-data'
  if (habit.type === 'negative') {
    if (amount === 0) return 'perfect';
    if (amount > 0 && amount < habit.tolerance_threshold) return 'yellow';
    return 'broken';
  }

  // positive
  if (amount > 0) return 'perfect';
  return 'missed';
}

export async function evaluateAndUpdateStreaks(
  authHeader: string | undefined,
  userId: string,
  reports: Array<{ habit_id: number; amount: number }>
) {
  const supabase = createSupabaseClient(authHeader);

  const { data: habits } = await supabase.from('user_habits').select('*').eq('user_id', userId);

  if (!habits) return [];

  const updates: Array<any> = [];

  for (const h of habits as UserHabit[]) {
    const report = reports.find((r) => Number(r.habit_id) === Number(h.id));
    const amount = report ? Number(report.amount || 0) : 0;

    if (h.type === 'negative') {
      if (amount === 0) {
        // increment streak
        const next = (h.current_streak ?? 0) + 1;
        const longest = Math.max(h.longest_streak ?? 0, next);
        updates.push({ id: h.id, current_streak: next, longest_streak: longest });
      } else if (amount > 0 && amount < h.tolerance_threshold) {
        // freeze: no change
        updates.push({ id: h.id });
      } else {
        // broken
        updates.push({ id: h.id, current_streak: 0 });
      }
    } else {
      // positive
      if (amount > 0) {
        const next = (h.current_streak ?? 0) + 1;
        const longest = Math.max(h.longest_streak ?? 0, next);
        updates.push({ id: h.id, current_streak: next, longest_streak: longest });
      } else {
        // missed: consume shield if any, else break
        if ((h.shields ?? 0) > 0) {
          updates.push({ id: h.id, shields: (h.shields ?? 0) - 1 });
        } else {
          updates.push({ id: h.id, current_streak: 0 });
        }
      }
    }
  }

  // Apply updates sequentially
  for (const u of updates) {
    const { id, ...cols } = u;
    const { error } = await supabase.from('user_habits').update(cols).eq('id', id);
    if (error) console.error('Failed to update habit', id, error.message);
  }

  return updates;
}

export function buildHabitVisualDescriptors(habits: UserHabit[]) {
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
