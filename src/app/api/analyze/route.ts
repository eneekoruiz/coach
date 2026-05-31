import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { dailyLogSchema } from '@/lib/schema';
import { evaluateAndUpdateStreaks } from '@/lib/habits';

export const dynamic = 'force-dynamic';

function createSafeDemoResponse() {
  const analyzedLog = {
    comidas: [
      {
        hora: '12:00',
        descripcion: 'Modo Prueba',
        calidad_nutricional: 'regular' as const,
      },
    ],
    hidratacion_ml: 0,
    toxinas: [],
    bio_avatar: {
      estado_fisiologico: 'Modo Prueba',
      energia_fisica: 3,
      claridad_mental: 3,
    },
    metricas: {
      variacion_inercia: 0,
      aciertos: ['Fallback de prueba activo'],
      error_clave: 'Falta GOOGLE_GENERATIVE_AI_API_KEY',
      accion_manana: 'Añade GOOGLE_GENERATIVE_AI_API_KEY en .env.local',
    },
  };

  return NextResponse.json(
    {
      status: 200,
      data: {
        user_id: 'local-demo',
        previous_health_momentum: 100,
        health_momentum: 100,
        daily_log: {
          id: 'local-demo',
          user_id: 'local-demo',
          date: new Date().toISOString().slice(0, 10),
          health_momentum: 100,
          ai_data: analyzedLog,
          avatar_image_url: null,
          close_day_data: null,
          created_at: new Date().toISOString(),
        },
        ai_data: analyzedLog,
      },
    },
    { status: 200 }
  );
}

function createSupabaseClient(authHeader?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: authHeader
      ? {
          headers: {
            Authorization: authHeader,
          },
        }
      : undefined,
  });
}

function normalizeBase64Image(value: string) {
  const trimmedValue = value.trim();
  const commaIndex = trimmedValue.indexOf(',');

  return commaIndex >= 0 ? trimmedValue.slice(commaIndex + 1) : trimmedValue;
}

export async function POST(request: Request) {
  try {
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.warn('[BioAvatar] GOOGLE_GENERATIVE_AI_API_KEY is missing. Returning safe demo response.');
      return createSafeDemoResponse();
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('[BioAvatar] Supabase env vars are missing. Returning safe demo response.');
      return createSafeDemoResponse();
    }

    const authHeader = request.headers.get('authorization') ?? undefined;
    console.info('[api/analyze] authHeader present:', !!authHeader);

    // Require auth header in normal mode (demo mode returns earlier)
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required. Send Authorization: Bearer <access_token>.' },
        { status: 401 }
      );
    }

    const supabase = createSupabaseClient(authHeader);

    console.info('[api/analyze] Calling supabase.auth.getUser()');
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('[api/analyze] supabase.auth.getUser error:', userError.message || userError);
      return NextResponse.json({ error: 'Failed to validate user token.' }, { status: 401 });
    }

    const user = userData.user;
    console.info('[api/analyze] supabase.getUser resolved user id:', user?.id ?? 'null');

    if (!user) {
      return NextResponse.json(
        { error: 'No se pudo identificar al usuario autenticado.' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { text?: unknown; image?: unknown; habit_tracking?: unknown };
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 });
    }

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const rawImage = typeof body.image === 'string' ? body.image.trim() : '';

    if (!text && !rawImage) {
      return NextResponse.json(
        { error: 'El body debe incluir text, image o ambos.' },
        { status: 400 }
      );
    }

    // Basic length checks to avoid excessive payloads
    if (text && text.length > 5000) {
      return NextResponse.json({ error: 'text field too long (max 5000 chars).' }, { status: 400 });
    }

    if (rawImage) {
      const b64 = normalizeBase64Image(rawImage);
      const approxBytes = Math.ceil((b64.length * 3) / 4);
      const maxBytes = 5 * 1024 * 1024; // 5MB
      if (approxBytes > maxBytes) {
        return NextResponse.json({ error: 'image payload too large (max 5MB).' }, { status: 413 });
      }
    }

    const systemPrompt =
      'Eres un evaluador metabólico proactivo. Tu tarea es analizar con rigor el texto y la imagen del usuario y devolver exclusivamente un objeto que cumpla el esquema. No incluyas texto extra, no expliques tu razonamiento y no inventes claves fuera del contrato. Debes inferir el estado fisiológico diario, detectar señales nutricionales, de hidratación y toxinas, y calcular una variación de inercia útil para el seguimiento longitudinal.';

    const analysisText = text
      ? `${systemPrompt}\n\nTexto del usuario:\n${text}`
      : `${systemPrompt}\n\nAnaliza únicamente la imagen proporcionada y extrae señales nutricionales, fisiológicas y de hidratación.`;

    const userMessageContent = rawImage
      ? [
          { type: 'text' as const, text: analysisText },
          { type: 'image' as const, image: normalizeBase64Image(rawImage) },
        ]
      : [{ type: 'text' as const, text: analysisText }];

    let analyzedLog: any;
    try {
      const result = await generateObject({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessageContent,
          },
        ],
        schema: dailyLogSchema,
      });
      analyzedLog = result.object;
    } catch (aiError) {
      console.error('[api/analyze] AI generateObject error:', aiError);
      return NextResponse.json({ error: 'AI service failure.' }, { status: 502 });
    }

    const { data: lastLog, error: lastLogError } = await supabase
      .from('daily_logs')
      .select('health_momentum')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLogError) {
      console.error('[api/analyze] Failed fetching lastLog:', lastLogError);
      return NextResponse.json({ error: 'Failed to read previous logs.' }, { status: 500 });
    }

    const previousMomentum = lastLog?.health_momentum ?? 100;
    const delta = analyzedLog.metricas.variacion_inercia;
    const nextMomentum = Math.min(100, Math.max(0, previousMomentum + delta));
    const today = new Date().toISOString().slice(0, 10);

    // If Gemini returned habit signals, use them; otherwise expect client to pass habit_tracking in request body
    const dynamicLog = analyzedLog as unknown as Record<string, unknown>;
    const dynamicBody = body as Record<string, unknown>;
    // Normalize and validate habit reports coming either from AI or client
    const rawHabitReports = (dynamicLog.habits || dynamicBody.habit_tracking || []) as unknown;
    let habitReports: Array<{ habit_id: number; amount: number }> = [];
    if (Array.isArray(rawHabitReports)) {
      habitReports = rawHabitReports
        .map((r) => {
          if (!r || typeof r !== 'object') return null;
          const hr = r as Record<string, unknown>;
          const habit_id = Number(hr.habit_id);
          const amount = Number(hr.amount ?? 0);
          if (Number.isFinite(habit_id) && Number.isFinite(amount)) return { habit_id, amount };
          return null;
        })
        .filter((x): x is { habit_id: number; amount: number } => x !== null);
    } else if (rawHabitReports) {
      console.warn('[api/analyze] habit_tracking provided but not an array; ignoring');
    }

    // Evaluate and update streaks in user_habits table
    try {
      await evaluateAndUpdateStreaks(authHeader, user.id, habitReports);
    } catch (e) {
      console.error('Failed to evaluate/update streaks', e);
    }

    const insertPayload = {
      user_id: user.id,
      date: today,
      health_momentum: nextMomentum,
      ai_data: analyzedLog,
      habit_tracking: JSON.stringify(habitReports),
    } as const;

    // Log minimal insert info for debugging (avoid dumping large ai_data)
    try {
      console.info('[api/analyze] Inserting daily_log', {
        user_id: insertPayload.user_id,
        date: insertPayload.date,
        health_momentum: insertPayload.health_momentum,
        habit_tracking_count: habitReports.length,
      });
    } catch (e) {
      console.error('[api/analyze] Failed to log insert payload summary', e);
    }

    const { data: insertedLog, error: insertError } = await supabase
      .from('daily_logs')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      console.error('[api/analyze] insert error:', insertError.message || insertError);
      const lower = (insertError.message || '').toLowerCase();
      if (/permission|row-level security|policy|forbidden/.test(lower)) {
        return NextResponse.json({ error: 'Permission denied when writing daily log.' }, { status: 403 });
      }
      return NextResponse.json({ error: insertError.message || 'Failed to insert daily log.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        status: 200,
        data: {
          user_id: user.id,
          previous_health_momentum: previousMomentum,
          health_momentum: nextMomentum,
          daily_log: insertedLog,
          ai_data: analyzedLog,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Log full error to server logs for easier debugging (appears in Vercel/Dev logs)
    try {
      console.error('[api/analyze] Unhandled error:', error);
      if (error instanceof Error && error.stack) console.error(error.stack);
    } catch (logErr) {
      // swallow logging errors
      console.error('[api/analyze] Failed to log error detail', logErr);
    }

    const message = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json(
      { error: `Falló el análisis o la persistencia en base de datos: ${message}` },
      { status: 500 }
    );
  }
}
