import { NextResponse } from 'next/server';

import { resolveAuthenticatedClient } from '@/services/authService';
import { updateTodayHabit } from '@/services/habitsService';

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
    const amount = Number(body.amount ?? 0);

    if (!Number.isFinite(habitId) || habitId <= 0) {
      return NextResponse.json({ error: 'habit_id required' }, { status: 400 });
    }

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'amount must be a non-negative number' }, { status: 400 });
    }

    try {
      const data = await updateTodayHabit({
        supabase,
        userId: user.id,
        habitId,
        amount,
      });

      return NextResponse.json({ data }, { status: 200 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const status = mapDbErrorStatus(msg);
      return NextResponse.json({ error: msg }, { status });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
