import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { resolveAuthenticatedClient } from '@/services/authService';
import { updateTodayHabit } from '@/services/habitsService';
import { captureException } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

const MAX_SINGLE_DELTA = 10000;
const relapseFactorSchema = z.enum(['stress', 'social', 'boredom', 'craving', 'other']);
const updateTodayHabitSchema = z.object({
  habit_id: z.coerce.number().int().positive(),
  amount: z.coerce.number().min(0).optional(),
  delta: z.coerce.number().min(-MAX_SINGLE_DELTA).max(MAX_SINGLE_DELTA).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  relapse_factor: relapseFactorSchema.nullable().optional(),
});

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

    const parsed = updateTodayHabitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { habit_id: habitId, amount, delta, date, relapse_factor: relapseFactor } = parsed.data;

    try {
      const data = await updateTodayHabit({
        supabase,
        userId: user.id,
        habitId,
        amount,
        delta,
        date,
        relapseFactor: relapseFactor ?? undefined,
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
