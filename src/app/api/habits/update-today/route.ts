import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type HabitTrackingEntry = {
  habit_id: number;
  amount: number;
};

function createSupabaseClient(authHeader?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Missing Supabase env vars');

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: authHeader
      ? {
          headers: { Authorization: authHeader },
        }
      : undefined,
  });
}

function parseHabitTracking(value: unknown): HabitTrackingEntry[] {
  if (Array.isArray(value)) return value as HabitTrackingEntry[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as HabitTrackingEntry[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? undefined;
    const supabase = createSupabaseClient(authHeader);

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const habitId = Number(body.habit_id);
    const amount = Number(body.amount || 0);

    if (!habitId) return NextResponse.json({ error: 'habit_id required' }, { status: 400 });

    const today = new Date().toISOString().slice(0, 10);

    // Fetch today's daily_log if exists
    const { data: existing } = await supabase
      .from('daily_logs')
      .select('id, habit_tracking')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    if (!existing) {
      // Insert new daily_log minimal
      const { data: inserted, error: insertError } = await supabase.from('daily_logs').insert({
        user_id: user.id,
        date: today,
        health_momentum: 100,
        ai_data: null,
        habit_tracking: [{ habit_id: habitId, amount }],
      }).select('*').single();

      if (insertError) throw insertError;
      return NextResponse.json({ data: inserted }, { status: 200 });
    }

    const current = parseHabitTracking(existing.habit_tracking);
    const idx = current.findIndex((r) => Number(r.habit_id) === habitId);
    if (idx >= 0) {
      current[idx].amount = amount;
    } else {
      current.push({ habit_id: habitId, amount });
    }

    const { error: updateError, data: updated } = await supabase
      .from('daily_logs')
      .update({ habit_tracking: current })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
