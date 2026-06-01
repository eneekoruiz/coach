import { NextResponse } from 'next/server';

import { resolveAuthenticatedClient } from '@/services/authService';
import {
  closeUserDay,
  createSafeDemoCloseDayResponse,
  NoDailyLogsError,
  DatabaseError,
} from '@/services/closeDayService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (
      !process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.warn(
        '[BioAvatar] GOOGLE_GENERATIVE_AI_API_KEY or Supabase env vars are missing. Returning safe demo end-of-day summary.'
      );
      const demoData = createSafeDemoCloseDayResponse();
      return NextResponse.json({ status: 200, data: demoData }, { status: 200 });
    }

    const authHeader = request.headers.get('authorization') ?? undefined;

    let auth;
    try {
      auth = await resolveAuthenticatedClient(authHeader);
    } catch {
      return NextResponse.json(
        { error: 'No se pudo identificar al usuario autenticado.' },
        { status: 401 }
      );
    }

    const { supabase, user } = auth;

    try {
      const summary = await closeUserDay({ supabase, user });
      return NextResponse.json({ status: 200, data: summary }, { status: 200 });
    } catch (err) {
      if (err instanceof NoDailyLogsError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      if (err instanceof DatabaseError) {
        return NextResponse.json({ error: `Base de datos error: ${err.message}` }, { status: 503 });
      }
      throw err;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({ error: `Falló el cierre del día: ${message}` }, { status: 500 });
  }
}
