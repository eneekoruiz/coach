import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveAuthenticatedClient } from '@/services/authService';
import { updateHabitSettings } from '@/services/habitsService';

export const dynamic = 'force-dynamic';

const settingsSchema = z.object({
  habit_id: z.number().int().positive(),
  tolerance_threshold: z.number().min(0).max(100000).optional(),
  target_value: z.number().min(0).max(1000000).optional(),
  unit: z.string().max(32).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? undefined;
    const { supabase, user } = await resolveAuthenticatedClient(authHeader);
    const body = await request.json().catch(() => null);
    const parsed = settingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = await updateHabitSettings({
      supabase,
      userId: user.id,
      habitId: parsed.data.habit_id,
      toleranceThreshold: parsed.data.tolerance_threshold,
      targetValue: parsed.data.target_value,
      unit: parsed.data.unit,
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /validate user token|auth/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
