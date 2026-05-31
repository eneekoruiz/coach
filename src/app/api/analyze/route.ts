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
    const supabase = createSupabaseClient(authHeader);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    const user = userData.user;

    if (!user) {
      return NextResponse.json(
        { error: 'No se pudo identificar al usuario autenticado.' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as { text?: unknown; image?: unknown };
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    const rawImage = typeof body.image === 'string' ? body.image.trim() : '';

    if (!text && !rawImage) {
      return NextResponse.json(
        { error: 'El body debe incluir text, image o ambos.' },
        { status: 400 }
      );
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

    const { object: analyzedLog } = await generateObject({
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

    const { data: lastLog, error: lastLogError } = await supabase
      .from('daily_logs')
      .select('health_momentum')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLogError) {
      throw lastLogError;
    }

    const previousMomentum = lastLog?.health_momentum ?? 100;
    const delta = analyzedLog.metricas.variacion_inercia;
    const nextMomentum = Math.min(100, Math.max(0, previousMomentum + delta));
    const today = new Date().toISOString().slice(0, 10);

    // If Gemini returned habit signals, use them; otherwise expect client to pass habit_tracking in request body
    const dynamicLog = analyzedLog as unknown as Record<string, unknown>;
    const dynamicBody = body as Record<string, unknown>;
    const habitReports = ((dynamicLog.habits || dynamicBody.habit_tracking || []) as Array<{
      habit_id: number;
      amount: number;
    }>);

    // Evaluate and update streaks in user_habits table
    try {
      await evaluateAndUpdateStreaks(authHeader, user.id, habitReports);
    } catch (e) {
      console.error('Failed to evaluate/update streaks', e);
    }

    const { data: insertedLog, error: insertError } = await supabase
      .from('daily_logs')
      .insert({
        user_id: user.id,
        date: today,
        health_momentum: nextMomentum,
        ai_data: analyzedLog,
        habit_tracking: JSON.stringify(habitReports),
      })
      .select('*')
      .single();

    if (insertError) {
      throw insertError;
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
    const message = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json(
      { error: `Falló el análisis o la persistencia en base de datos: ${message}` },
      { status: 500 }
    );
  }
}
