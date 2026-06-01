import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface PenalizeResult {
  user_id: string;
  ok: boolean;
  error?: string;
}

function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role env vars');
  return createClient(url, key);
}

export async function penalizeInactiveUsers() {
  const supabase = createServiceClient();

  // 1) get all user ids (admin API preferred, fallback to auth.users query)
  let userIds: string[] = [];
  try {
    const allUsers = await supabase.auth.admin.listUsers();
    if (allUsers.data.users && Array.isArray(allUsers.data.users)) {
      userIds = allUsers.data.users.map((user) => String(user.id)).filter(Boolean);
    }
  } catch (e) {
    // fallback: query auth.users
    const { data: rows, error } = await supabase.from('auth.users').select('id');
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }
    userIds = (rows ?? []).map((r: { id?: string }) => String(r.id)).filter(Boolean);
  }

  const today = new Date().toISOString().split('T')[0];

  // 2) get users who have a daily_log for today
  const { data: logsToday, error: logsError } = await supabase
    .from('daily_logs')
    .select('user_id')
    .eq('date', today);

  if (logsError) {
    throw new Error(`Failed to read daily logs: ${logsError.message}`);
  }

  const activeSet = new Set((logsToday ?? []).map((r: { user_id?: string }) => String(r.user_id)));
  const inactive = userIds.filter((id) => !activeSet.has(String(id)));

  const results: PenalizeResult[] = [];

  for (const uid of inactive) {
    try {
      const { data: last, error: lastError } = await supabase
        .from('daily_logs')
        .select('health_momentum')
        .eq('user_id', uid)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastError) {
        results.push({ user_id: uid, ok: false, error: lastError.message });
        continue;
      }

      const lastMomentum = (last as { health_momentum?: number } | null)?.health_momentum ?? 100;
      const newMomentum = Math.max(0, Number(lastMomentum) - 15);

      // reset all current_streak for this user
      const { error: resetError } = await supabase
        .from('user_habits')
        .update({ current_streak: 0 })
        .eq('user_id', uid);

      if (resetError) {
        results.push({ user_id: uid, ok: false, error: resetError.message });
        continue;
      }

      // insert a daily_log for today documenting the penalty
      const aiData = {
        estado: 'Abandono crítico',
        error_clave: 'El usuario ha ignorado a su mascota todo el día',
        aciertos: [],
      };

      const insertRow: Record<string, unknown> = {
        user_id: uid,
        date: today,
        health_momentum: newMomentum,
        ai_data: aiData,
      };

      if (process.env.DEFAULT_SAD_AVATAR_URL) {
        insertRow.avatar_image_url = process.env.DEFAULT_SAD_AVATAR_URL;
      }

      const { error: insertError } = await supabase.from('daily_logs').insert(insertRow);
      if (insertError) {
        results.push({ user_id: uid, ok: false, error: insertError.message });
        continue;
      }

      results.push({ user_id: uid, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ user_id: uid, ok: false, error: message });
    }
  }

  return results;
}
