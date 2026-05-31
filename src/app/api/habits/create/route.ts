import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createHabitSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(['positive', 'negative']),
  target_number: z.number().int().positive().default(1),
  unit: z.string().nullable().optional(),
  tolerance: z.number().int().nonnegative().default(0),
});

function createAuthClient(authHeader?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, anonKey, {
    global: authHeader
      ? {
          headers: { Authorization: authHeader },
        }
      : undefined,
  });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? undefined;
    const cookieStore = await cookies();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      throw new Error('Missing Supabase credentials');
    }

    const serverClient = createServerClient(url, anonKey, {
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

    const bearerClient = authHeader ? createAuthClient(authHeader) : null;
    let authClient = bearerClient ?? serverClient;
    let { data: userData, error: userError } = authHeader
      ? await authClient.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''))
      : await authClient.auth.getUser();

    if ((userError || !userData.user) && authHeader) {
      const cookieResult = await serverClient.auth.getUser();
      if (!cookieResult.error && cookieResult.data.user) {
        authClient = serverClient;
        userData = cookieResult.data;
        userError = null;
      }
    }

    if (userError) {
      return NextResponse.json({ error: 'Failed to validate user token.' }, { status: 401 });
    }

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

    const { data, error } = await authClient
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

    if (error) {
      const lower = (error.message || '').toLowerCase();
      if (/permission|row-level security|policy|forbidden/.test(lower)) {
        return NextResponse.json({ error: 'Permission denied when creating habit.' }, { status: 403 });
      }
      return NextResponse.json({ error: error.message || 'Failed to create habit.' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'Unexpected server error.' }, { status: 500 });
  }
}
