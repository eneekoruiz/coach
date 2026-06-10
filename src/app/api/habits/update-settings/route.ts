import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveAuthenticatedClient } from '@/services/authService';
import { updateHabitSettings } from '@/services/habitsService';
import { habitMetricConfigSchema, habitMetricTypeSchema } from '@/lib/schema';

export const dynamic = 'force-dynamic';

const settingsSchema = z.object({
  habit_id: z.number().int().positive(),
  tolerance_threshold: z.number().min(0).max(100000).optional(),
  target_value: z.number().min(0).max(1000000).optional(),
  unit: z.string().max(32).nullable().optional(),
  metric_type: habitMetricTypeSchema.optional(),
  unit_label: z.string().max(32).nullable().optional(),
  step_value: z.number().positive().max(100000).optional(),
  metric_config: habitMetricConfigSchema.optional(),
  slip_allowance: z.number().int().min(0).max(30).optional(),
  slip_window_days: z.number().int().min(1).max(90).optional(),
  slip_penalty_hours: z.number().int().min(0).max(168).optional(),
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
      metricType: parsed.data.metric_type,
      unitLabel: parsed.data.unit_label,
      stepValue: parsed.data.step_value,
      metricConfig: parsed.data.metric_config,
      slipAllowance: parsed.data.slip_allowance,
      slipWindowDays: parsed.data.slip_window_days,
      slipPenaltyHours: parsed.data.slip_penalty_hours,
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = /validate user token|auth/i.test(message) ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
