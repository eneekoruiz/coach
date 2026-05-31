import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

function mapDbErrorStatus(message: string) {
  const lower = message.toLowerCase();
  if (/permission|row-level security|policy|forbidden/.test(lower)) return 403;
  return 500;
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
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 });
    }

    const cookieClient = createServerClient(url, anonKey, {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    });

    const bearerClient = authHeader ? createSupabaseClient(authHeader) : null;
    let supabase = bearerClient ?? cookieClient;

    let { data: userData, error: userError } = authHeader
      ? await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
      : await supabase.auth.getUser();

    if ((userError || !userData.user) && authHeader) {
      const cookieResult = await cookieClient.auth.getUser();
      if (!cookieResult.error && cookieResult.data.user) {
        supabase = cookieClient;
        userData = cookieResult.data;
        userError = null;
      }
    }

    if (userError) {
      return NextResponse.json({ error: 'Failed to validate user token.' }, { status: 401 });
    }

    const user = userData.user;
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const habitId = Number(body.habit_id);
    const amount = Number(body.amount || 0);

    if (!Number.isFinite(habitId) || habitId <= 0) {
      return NextResponse.json({ error: 'habit_id required' }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'amount must be a non-negative number' }, { status: 400 });
    }

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

      if (insertError) {
        const status = mapDbErrorStatus(insertError.message || '');
        return NextResponse.json({ error: insertError.message || 'Failed to insert daily log.' }, { status });
      }
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

    if (updateError) {
      const status = mapDbErrorStatus(updateError.message || '');
      return NextResponse.json({ error: updateError.message || 'Failed to update daily log.' }, { status });
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
