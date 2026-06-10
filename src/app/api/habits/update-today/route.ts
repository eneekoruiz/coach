import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { resolveAuthenticatedClient } from '@/services/authService';
import { updateTodayHabit } from '@/services/habitsService';
import { captureException } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

function mapDbErrorStatus(message: string) {
  const lower = message.toLowerCase();
  if (/permission|row-level security|policy|forbidden/.test(lower)) return 403;
  return 500;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? undefined;

    let auth;
    try {
      auth = await resolveAuthenticatedClient(authHeader);
    } catch {
      return NextResponse.json({ error: 'Failed to validate user token.' }, { status: 401 });
    }

    const { supabase, user } = auth;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const habitId = Number(body.habit_id);
    if (!Number.isFinite(habitId) || habitId <= 0) {
      return NextResponse.json({ error: 'habit_id required and must be positive' }, { status: 400 });
    }

    let amount: number | undefined;
    if (body.amount !== undefined) {
      amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: 'amount must be a non-negative number' }, { status: 400 });
      }
    }

    let delta: number | undefined;
    if (body.delta !== undefined) {
      delta = Number(body.delta);
      if (!Number.isFinite(delta)) {
        return NextResponse.json({ error: 'delta must be a finite number' }, { status: 400 });
      }
    }

    let date: string | undefined;
    if (body.date !== undefined) {
      if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
        return NextResponse.json({ error: 'date must be in YYYY-MM-DD format' }, { status: 400 });
      }
      date = body.date;
    }

    const allowedRelapseFactors = ['stress', 'social', 'boredom', 'craving', 'other'] as const;
    type RelapseFactor = (typeof allowedRelapseFactors)[number];
    const relapseFactor = typeof body.relapse_factor === 'string' && allowedRelapseFactors.includes(body.relapse_factor as RelapseFactor)
      ? body.relapse_factor
      : undefined;

    try {
      const data = await updateTodayHabit({
        supabase,
        userId: user.id,
        habitId,
        amount,
        delta,
        date,
        relapseFactor,
      });

      // Purge cache of the dashboard/home path to ensure fresh data
      revalidatePath('/');

      return NextResponse.json({ data }, { status: 200 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      captureException(err, {
        area: 'habits',
        action: 'updateTodayHabit',
        extra: {
          userId: user.id,
          habitId,
          hasAmount: amount !== undefined,
          hasDelta: delta !== undefined,
          date,
        },
      });
      const status = mapDbErrorStatus(msg);
      return NextResponse.json({ error: msg }, { status });
    }
  } catch (err) {
    captureException(err, { area: 'habits', action: 'updateTodayHabitRouteUnhandled' });
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
