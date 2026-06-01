import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { type SupabaseClient, type User } from '@supabase/supabase-js';

import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { evaluateAndUpdateStreaks } from '@/lib/habits';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class ImageTooLargeError extends Error {}
export class AiServiceError extends Error {
  constructor(message: string, public reason?: string) {
    super(message);
  }
}
export class DatabaseError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

function normalizeBase64Image(value: string): string {
  const trimmedValue = value.trim();
  const commaIndex = trimmedValue.indexOf(',');
  return commaIndex >= 0 ? trimmedValue.slice(commaIndex + 1) : trimmedValue;
}

function approximateBase64Bytes(base64Value: string): number {
  const sanitized = base64Value.replace(/\s+/g, '');
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.floor((sanitized.length * 3) / 4) - padding;
}

function mapDatabaseError(message: string): { status: number; code: string } {
  const lower = message.toLowerCase();

  if (/permission|row-level security|policy|forbidden/.test(lower)) {
    return { status: 403, code: 'permission_denied' };
  }
  if (/relation .* does not exist|schema cache|user_habits/.test(lower)) {
    return { status: 503, code: 'missing_schema' };
  }
  if (/duplicate|unique constraint|already exists/.test(lower)) {
    return { status: 409, code: 'conflict' };
  }

  return { status: 503, code: 'database_unavailable' };
}

export function createSafeDemoResponse() {
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

  return {
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
  };
}

export interface AnalyzeParams {
  text: string;
  rawImage?: string | null;
  habitReports: Array<{ habit_id: number; amount: number }>;
  authHeader?: string;
  supabase: SupabaseClient;
  user: User;
}

export async function analyzeAndPersistDailyLog(params: AnalyzeParams) {
  const { text, rawImage, habitReports, authHeader, supabase, user } = params;

  if (rawImage) {
    const normalizedImage = normalizeBase64Image(rawImage);
    const approxBytes = approximateBase64Bytes(normalizedImage);

    if (approxBytes > MAX_IMAGE_BYTES) {
      throw new ImageTooLargeError('La imagen supera el máximo de 5MB.');
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
      throw new AiServiceError(
        'La IA no devolvió un objeto válido para el esquema esperado.',
        JSON.stringify(validatedResult.error.flatten())
      );
    }

    analyzedLog = validatedResult.data;
  } catch (aiError) {
    if (aiError instanceof AiServiceError) throw aiError;
    const message = aiError instanceof Error ? aiError.message : 'AI service failure.';
    throw new AiServiceError('No se pudo procesar la respuesta del motor de IA.', message);
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
    throw new DatabaseError('No se pudo leer el histórico del usuario.', dbStatus.code);
  }

  const previousMomentum = lastLog?.health_momentum ?? 100;
  const delta = analyzedLog.metricas.variacion_inercia;
  const nextMomentum = Math.min(100, Math.max(0, previousMomentum + delta));
  const today = new Date().toISOString().slice(0, 10);

  try {
    await evaluateAndUpdateStreaks(authHeader, user.id, habitReports);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to evaluate/update streaks';
    const dbStatus = mapDatabaseError(message);
    throw new DatabaseError('No se pudieron actualizar las rachas de hábitos.', dbStatus.code);
  }

  const insertPayload = {
    user_id: user.id,
    date: today,
    health_momentum: nextMomentum,
    ai_data: analyzedLog,
    habit_tracking: habitReports,
  };

  const { data: insertedLog, error: insertError } = await supabase
    .from('daily_logs')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) {
    const dbStatus = mapDatabaseError(insertError.message || '');
    throw new DatabaseError('No se pudo guardar el registro diario.', dbStatus.code);
  }

  return {
    user_id: user.id,
    previous_health_momentum: previousMomentum,
    health_momentum: nextMomentum,
    daily_log: insertedLog,
    ai_data: analyzedLog,
  };
}
