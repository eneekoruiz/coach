import { NextResponse } from 'next/server';
import { resolveAuthenticatedClient } from '@/services/authService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? undefined;

    let auth;
    try {
      auth = await resolveAuthenticatedClient(authHeader);
    } catch (authErr) {
      console.error('[GDPR_EXPORT_ERROR] Authentication failed:', authErr);
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { supabase, user } = auth;

    // Fetch user habits
    const { data: habits, error: habitsError } = await supabase
      .from('user_habits')
      .select('*')
      .eq('user_id', user.id);

    if (habitsError) {
      throw new Error(`Failed to fetch habits: ${habitsError.message}`);
    }

    // Fetch user logs
    const { data: logs, error: logsError } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (logsError) {
      throw new Error(`Failed to fetch daily logs: ${logsError.message}`);
    }

    // Structure the data to match GDPR port requirements
    const exportPayload = {
      export_version: '1.0',
      export_timestamp: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      },
      habits: habits || [],
      daily_logs: logs || [],
    };

    // Return the response as a downloadable JSON file
    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="bio-avatar-user-data.json"',
      },
    });
  } catch (err) {
    console.error('[GDPR_EXPORT_ERROR] Export failed:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
