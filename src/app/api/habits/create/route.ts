import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveAuthenticatedClient } from '@/services/authService';
import {
  createHabit,
  MissingHabitTableError,
  PermissionDeniedError,
} from '@/services/habitsService';

export const dynamic = 'force-dynamic';

const createHabitSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(['positive', 'negative']),
  target_number: z.number().int().positive().default(1),
  unit: z.string().nullable().optional(),
  tolerance: z.number().int().nonnegative().default(0),
});

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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const parsed = createHabitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data;

    try {
      const data = await createHabit({
        supabase,
        userId: user.id,
        name: payload.name,
        type: payload.type,
        target_number: payload.target_number,
        unit: payload.unit,
        tolerance: payload.tolerance,
      });

      return NextResponse.json({ data }, { status: 200 });
    } catch (err) {
      if (err instanceof MissingHabitTableError) {
        return NextResponse.json(
          {
            error:
              'La base de datos de hábitos todavía no tiene la tabla public.user_habits. Aplica la migración sql/migrations/20260526_create_user_habits_and_habit_tracking.sql y vuelve a intentarlo.',
          },
          { status: 503 }
        );
      }
      if (err instanceof PermissionDeniedError) {
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'Unexpected server error.' }, { status: 500 });
  }
}
