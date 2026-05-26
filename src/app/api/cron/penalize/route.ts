import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase service role env vars');
  return createClient(url, key);
}

export async function GET(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    if (!process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
    }
    if (!auth || auth !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 1) get all users
    let userIds: string[] = [];
    try {
      // try admin API first
      // @ts-ignore
      const all = await supabase.auth.admin.listUsers();
      if (all?.data?.users) {
        userIds = (all.data.users || []).map((u: any) => u.id).filter(Boolean);
      }
    } catch (e) {
      // fallback: select from auth.users
      const { data } = await supabase.from('auth.users').select('id');
      userIds = (data || []).map((r: any) => r.id).filter(Boolean);
    }

    const today = new Date().toISOString().split('T')[0];

    // 2) get users who have a daily_log for today
    const { data: logsToday } = await supabase.from('daily_logs').select('user_id').eq('date', today);
    const activeSet = new Set((logsToday || []).map((r: any) => String(r.user_id)));

    const inactive = userIds.filter((id) => !activeSet.has(String(id)));

    const results: Array<{ user_id: string; ok: boolean; error?: string }> = [];

    for (const uid of inactive) {
      try {
        // fetch last momentum
        const { data: last } = await supabase
          .from('daily_logs')
          .select('health_momentum')
          .eq('user_id', uid)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastMomentum = last?.health_momentum ?? 100;
        const newMomentum = Math.max(0, Number(lastMomentum) - 15);

        // reset all current_streak for this user
        await supabase.from('user_habits').update({ current_streak: 0 }).eq('user_id', uid);

        // insert a daily_log for today documenting the penalty
        const aiData = {
          estado: 'Abandono crítico',
          error_clave: 'El usuario ha ignorado a su mascota todo el día',
          aciertos: [],
        };

        const insertRow: any = {
          user_id: uid,
          date: today,
          health_momentum: newMomentum,
          ai_data: aiData,
        };

        if (process.env.DEFAULT_SAD_AVATAR_URL) insertRow.avatar_image_url = process.env.DEFAULT_SAD_AVATAR_URL;

        await supabase.from('daily_logs').insert(insertRow);

        results.push({ user_id: uid, ok: true });
      } catch (err) {
        results.push({ user_id: uid, ok: false, error: (err as Error)?.message ?? String(err) });
      }
    }

    return NextResponse.json({ penalized: results.length, results }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
