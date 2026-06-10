import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:support@bioavatar.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

type PushError = Error & { statusCode?: number };

function buildBrief(params: {
  momentum: number;
  waterMl: number;
  pendingTasks: number;
  activeStreak: number;
}) {
  const focus = params.pendingTasks > 0
    ? `tienes ${params.pendingTasks} tarea${params.pendingTasks === 1 ? '' : 's'} clave por delante`
    : 'tu checklist está limpio para empezar sin ruido';
  const hydration = params.waterMl < 500 ? 'primer vaso antes de cualquier decisión grande' : 'mantén la hidratación estable';
  const streak = params.activeStreak > 0 ? `racha viva de ${params.activeStreak} día${params.activeStreak === 1 ? '' : 's'}` : 'hoy puede ser el primer día de una racha nueva';

  return `Buenos días. Inercia ${Math.round(params.momentum)}%, ${focus}. Prioridad suave: ${hydration}. ${streak}.`;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized CRON execution' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Missing Supabase env variables' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const today = new Date().toISOString().slice(0, 10);

  const { data: subscriptions } = await supabase
    .from('user_push_subscriptions')
    .select('user_id, subscription');

  const userIds = [...new Set((subscriptions || []).map((row) => String(row.user_id)))];
  let createdCount = 0;
  let pushedCount = 0;

  for (const userId of userIds) {
    const { data: existingBrief } = await supabase
      .from('chat_history')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'assistant')
      .ilike('content', `Buenos días. Inercia%${today}%`)
      .maybeSingle();

    if (existingBrief) continue;

    const [{ data: latestLog }, { data: templates }, { data: logs }, { data: habits }] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('health_momentum, ai_data')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('routine_templates').select('id').eq('user_id', userId),
      supabase.from('routine_logs').select('routine_id').eq('user_id', userId).eq('completed_date', today),
      supabase.from('user_habits').select('current_streak').eq('user_id', userId),
    ]);

    const aiData = latestLog?.ai_data as { water_ml?: number; hidratacion_ml?: number } | null;
    const brief = `${buildBrief({
      momentum: Number(latestLog?.health_momentum ?? 100),
      waterMl: Number(aiData?.water_ml ?? aiData?.hidratacion_ml ?? 0),
      pendingTasks: Math.max(0, (templates?.length ?? 0) - (logs?.length ?? 0)),
      activeStreak: Math.max(0, ...(habits || []).map((habit) => Number(habit.current_streak ?? 0))),
    })} [${today}]`;

    const { error: insertError } = await supabase
      .from('chat_history')
      .insert({ user_id: userId, role: 'assistant', content: brief, session_id: null });

    if (insertError) continue;
    createdCount++;

    const subscription = (subscriptions || []).find((row) => String(row.user_id) === userId)?.subscription;
    if (subscription && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      try {
        await webpush.sendNotification(subscription, JSON.stringify({
          title: 'Tu Coach ya preparó el día',
          body: brief.replace(` [${today}]`, ''),
          url: '/',
        }));
        pushedCount++;
      } catch (error) {
        const pushError = error as PushError;
        if (pushError.statusCode === 410) {
          await supabase.from('user_push_subscriptions').delete().eq('user_id', userId);
        }
      }
    }
  }

  return NextResponse.json({ success: true, createdCount, pushedCount });
}
