import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveAuthenticatedClient } from '@/services/authService';
import { getSafeLocalDate } from '@/lib/date-utils';

export const dynamic = 'force-dynamic';

const recoveryCheckInSchema = z.object({
  habit_id: z.coerce.number().int().positive(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  action: z.enum(['pledge', 'skip_pledge', 'review']),
  pledge_text: z.string().max(240).optional(),
  kept_promise: z.boolean().optional(),
  difficulty: z.coerce.number().int().min(1).max(5).optional(),
  trigger_tags: z.array(z.string().min(1).max(40)).max(8).optional(),
  notes: z.string().max(500).optional(),
});

function mapDbErrorStatus(message: string) {
  const lower = message.toLowerCase();
  if (/permission|row-level security|policy|forbidden/.test(lower)) return 403;
  if (/does not exist|schema cache|relation/.test(lower)) return 503;
  return 500;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? undefined;
    const { supabase, user } = await resolveAuthenticatedClient(authHeader);
    const body = await request.json().catch(() => null);
    const parsed = recoveryCheckInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data;
    const checkinDate = getSafeLocalDate(payload.date);

    const { data: habit, error: habitError } = await supabase
      .from('user_habits')
      .select('id, type, name')
      .eq('id', payload.habit_id)
      .eq('user_id', user.id)
      .single();

    if (habitError || !habit) {
      return NextResponse.json({ error: 'Hábito no encontrado.' }, { status: 404 });
    }

    if (habit.type !== 'negative') {
      return NextResponse.json(
        { error: 'Los check-ins de recuperación solo aplican a hábitos negativos.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const row: Record<string, unknown> = {
      user_id: user.id,
      habit_id: payload.habit_id,
      checkin_date: checkinDate,
    };

    if (payload.action === 'pledge') {
      row.pledged_at = nowIso;
      row.pledge_text = payload.pledge_text ?? `Hoy prometo mantenerme libre de ${habit.name}.`;
      row.pledge_status = 'pledged';
    }

    if (payload.action === 'skip_pledge') {
      row.pledge_status = 'skipped';
    }

    if (payload.action === 'review') {
      if (payload.kept_promise === undefined || payload.difficulty === undefined) {
        return NextResponse.json(
          { error: 'kept_promise y difficulty son obligatorios para la revisión.' },
          { status: 400 }
        );
      }
      row.reviewed_at = nowIso;
      row.kept_promise = payload.kept_promise;
      row.difficulty = payload.difficulty;
      row.trigger_tags = payload.trigger_tags ?? [];
      row.notes = payload.notes ?? null;
    }

    const { data, error } = await supabase
      .from('habit_recovery_checkins')
      .upsert(row, { onConflict: 'user_id,habit_id,checkin_date' })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: mapDbErrorStatus(error.message) }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message },
      { status: /auth|token|session/i.test(message) ? 401 : 500 }
    );
  }
}
