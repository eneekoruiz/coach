import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { evaluateAndUpdateStreaks } from '@/lib/habits';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const MAX_TEXT_LENGTH = 5000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const habitReportSchema = z
  .object({
    habit_id: z.number().int().positive(),
    amount: z.number().finite(),
  })
  .strict();

const analyzeRequestSchema = z
  .object({
    text: z.string().trim().max(MAX_TEXT_LENGTH).optional(),
    image: z.string().trim().min(1).optional(),
    habit_tracking: z.array(habitReportSchema).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.text && !value.image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['text'],
        message: 'El body debe incluir text, image o ambos.',
      });
    }
  });

type AnalyzeRequestBody = z.infer<typeof analyzeRequestSchema>;
type HabitReport = z.infer<typeof habitReportSchema>;

function jsonError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown> | unknown[] | string
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status }
  );
}

function createSafeDemoResponse() {
  const analyzedLog: DailyLog = {
    comidas: [
      {
        hora: '12:00',
        descripcion: 'Modo Prueba',
        calidad_nutricional: 'regular',
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

async function resolveAuthenticatedClient(authHeader?: string) {
  const cookieSupabase = await createSupabaseServerClient();
  const preferredClient = authHeader ? createSupabaseClient(authHeader) : cookieSupabase;

  const preferredResult = await preferredClient.auth.getUser();
  if (!authHeader && preferredResult.data.user) {
    return { supabase: preferredClient, userResult: preferredResult };
  }

  if (authHeader && preferredResult.data.user && !preferredResult.error) {
    return { supabase: preferredClient, userResult: preferredResult };
  }

  if (authHeader) {
    const cookieResult = await cookieSupabase.auth.getUser();
    if (cookieResult.data.user && !cookieResult.error) {
      return { supabase: cookieSupabase, userResult: cookieResult };
    }

    return { supabase: cookieSupabase, userResult: cookieResult };
  }

  return { supabase: preferredClient, userResult: preferredResult };
}

function normalizeBase64Image(value: string) {
  const trimmedValue = value.trim();
  const commaIndex = trimmedValue.indexOf(',');

  return commaIndex >= 0 ? trimmedValue.slice(commaIndex + 1) : trimmedValue;
}

function approximateBase64Bytes(base64Value: string) {
  const sanitized = base64Value.replace(/\s+/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.floor((sanitized.length * 3) / 4) - padding;
}

function mapDatabaseError(message: string) {
  const lower = message.toLowerCase();

  if (/permission|row-level security|policy|forbidden/.test(lower)) {
    return { status: 403, code: 'permission_denied' as const };
  }

  if (/relation .* does not exist|schema cache|user_habits/.test(lower)) {
    return { status: 503, code: 'missing_schema' as const };
  }

  if (/duplicate|unique constraint|already exists/.test(lower)) {
    return { status: 409, code: 'conflict' as const };
  }

  return { status: 503, code: 'database_unavailable' as const };
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
    const { supabase, userResult } = await resolveAuthenticatedClient(authHeader);

    if (userResult.error || !userResult.data.user) {
      return jsonError(401, 'unauthorized', 'No se pudo validar la sesión del usuario.');
    }

    const user = userResult.data.user;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonError(400, 'invalid_json', 'El body debe ser un JSON válido.');
    }

    const parsedBody = analyzeRequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return jsonError(
        422,
        'invalid_input',
        'El body no cumple el contrato esperado.',
        parsedBody.error.flatten()
      );
    }

    const body: AnalyzeRequestBody = parsedBody.data;
    const text = body.text ?? '';
    const rawImage = body.image ?? '';

    if (rawImage) {
      const normalizedImage = normalizeBase64Image(rawImage);
      const approxBytes = approximateBase64Bytes(normalizedImage);

      if (approxBytes > MAX_IMAGE_BYTES) {
        return jsonError(413, 'image_too_large', 'La imagen supera el máximo de 5MB.');
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

    let analyzedLog: DailyLog;
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
      const validatedResult = dailyLogSchema.safeParse(result.object);
      if (!validatedResult.success) {
        return jsonError(
          422,
          'invalid_ai_output',
          'La IA no devolvió un objeto válido para el esquema esperado.',
          validatedResult.error.flatten()
        );
      }

      analyzedLog = validatedResult.data;
    } catch (aiError) {
      const message = aiError instanceof Error ? aiError.message : 'AI service failure.';
      return jsonError(502, 'ai_service_failure', 'No se pudo procesar la respuesta del motor de IA.', {
        reason: message,
      });
    }

    const { data: lastLog, error: lastLogError } = await supabase
      .from('daily_logs')
      .select('health_momentum')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLogError) {
      const dbStatus = mapDatabaseError(lastLogError.message || '');
      return jsonError(dbStatus.status, dbStatus.code, 'No se pudo leer el histórico del usuario.', {
        reason: lastLogError.message,
      });
    }

    const previousMomentum = lastLog?.health_momentum ?? 100;
    const delta = analyzedLog.metricas.variacion_inercia;
    const nextMomentum = Math.min(100, Math.max(0, previousMomentum + delta));
    const today = new Date().toISOString().slice(0, 10);

    const habitReports: HabitReport[] = body.habit_tracking ?? [];

    // Evaluate and update streaks in user_habits table
    try {
      await evaluateAndUpdateStreaks(authHeader, user.id, habitReports);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to evaluate/update streaks';
      const dbStatus = mapDatabaseError(message);
      return jsonError(dbStatus.status, dbStatus.code, 'No se pudieron actualizar las rachas de hábitos.', {
        reason: message,
      });
    }

    const insertPayload = {
      user_id: user.id,
      date: today,
      health_momentum: nextMomentum,
      ai_data: analyzedLog,
      habit_tracking: habitReports,
    } as const;

    const { data: insertedLog, error: insertError } = await supabase
      .from('daily_logs')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      const dbStatus = mapDatabaseError(insertError.message || '');
      return jsonError(dbStatus.status, dbStatus.code, 'No se pudo guardar el registro diario.', {
        reason: insertError.message,
      });
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

    return jsonError(503, 'unexpected_error', 'Falló el análisis o la persistencia en base de datos.', {
      reason: message,
    });
  }
}
