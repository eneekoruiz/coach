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

    // Concurrently fetch all relevant tables for GDPR export
    const [habitsResult, logsResult, moodResult] = await Promise.all([
      supabase
        .from('user_habits')
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),
      supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),
    ]);

    // Check for query errors
    if (habitsResult.error) {
      throw new Error(`Failed to fetch habits: ${habitsResult.error.message}`);
    }
    if (logsResult.error) {
      throw new Error(`Failed to fetch daily logs: ${logsResult.error.message}`);
    }
    if (moodResult.error) {
      throw new Error(`Failed to fetch mood logs: ${moodResult.error.message}`);
    }

    // Structure the data to match GDPR portability requirements
    const exportPayload = {
      export_version: '1.0',
      export_timestamp: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata || {},
      },
      nutritionHistory: logsResult.data || [],
      habits: habitsResult.data || [],
      mood: moodResult.data || [],
    };

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `bio-avatar-gdpr-export-${dateStr}.json`;

    // Return the response as a downloadable JSON file
    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('[GDPR_EXPORT_ERROR] Export failed:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
