import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createHabitSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(['positive', 'negative']),
  target_number: z.number().int().positive().default(1),
  unit: z.string().nullable().optional(),
  tolerance: z.number().int().nonnegative().default(0),
});

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing Supabase service role credentials');
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? undefined;
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));

    if (userError) throw userError;
    const user = userData.user;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createHabitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data;

    const { data, error } = await supabase
      .from('user_habits')
      .insert({
        user_id: user.id,
        name: payload.name,
        type: payload.type,
        is_custom: true,
        tolerance_threshold: payload.tolerance,
        current_streak: 0,
        longest_streak: 0,
        shields: 0,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
