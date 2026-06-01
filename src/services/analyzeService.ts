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

function mergeDailyLogs(existing: DailyLog, incoming: DailyLog): DailyLog {
  const mergedHabits: Record<string, number> = { ...(existing.habits_count || {}) };
  if (incoming.habits_count) {
    for (const [key, val] of Object.entries(incoming.habits_count)) {
      mergedHabits[key] = Math.max(mergedHabits[key] || 0, val || 0);
    }
  }

  const finalWater = Math.max(
    existing.water_ml || 0,
    existing.hidratacion_ml || 0,
    incoming.water_ml || 0,
    incoming.hidratacion_ml || 0
  );

  return {
    comidas: [...(existing.comidas || []), ...(incoming.comidas || [])],
    hidratacion_ml: finalWater,
    water_ml: finalWater,
    total_kcal: Math.max(existing.total_kcal || 0, incoming.total_kcal || 0),
    protein_g: Math.max(existing.protein_g || 0, incoming.protein_g || 0),
    carbs_g: Math.max(existing.carbs_g || 0, incoming.carbs_g || 0),
    fats_g: Math.max(existing.fats_g || 0, incoming.fats_g || 0),
    habits_count: mergedHabits,
    toxinas: Array.from(new Set([...(existing.toxinas || []), ...(incoming.toxinas || [])])),
    bio_avatar: {
      estado_fisiologico: incoming.bio_avatar?.estado_fisiologico || existing.bio_avatar?.estado_fisiologico || '',
      energia_fisica: incoming.bio_avatar?.energia_fisica ?? existing.bio_avatar?.energia_fisica ?? 3,
      claridad_mental: incoming.bio_avatar?.claridad_mental ?? existing.bio_avatar?.claridad_mental ?? 3,
    },
    metricas: {
      variacion_inercia: (existing.metricas?.variacion_inercia || 0) + (incoming.metricas?.variacion_inercia || 0),
      aciertos: Array.from(new Set([...(existing.metricas?.aciertos || []), ...(incoming.metricas?.aciertos || [])])),
      error_clave: incoming.metricas?.error_clave || existing.metricas?.error_clave || '',
      accion_manana: incoming.metricas?.accion_manana || existing.metricas?.accion_manana || '',
    },
  };
}

function mergeHabitTracking(
  existing: Array<{ habit_id: number; amount: number }>,
  incoming: Array<{ habit_id: number; amount: number }>
): Array<{ habit_id: number; amount: number }> {
  const merged = [...existing];
  for (const item of incoming) {
    const idx = merged.findIndex((r) => r.habit_id === item.habit_id);
    if (idx >= 0) {
      merged[idx].amount = item.amount;
    } else {
      merged.push(item);
    }
  }
  return merged;
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
    water_ml: 0,
    total_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
    habits_count: {},
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
  localDate?: string;
  authHeader?: string;
  supabase: SupabaseClient;
  user: User;
}

export async function analyzeAndPersistDailyLog(params: AnalyzeParams) {
  const { text, rawImage, habitReports, localDate, authHeader, supabase, user } = params;

  if (rawImage) {
    const normalizedImage = normalizeBase64Image(rawImage);
    const approxBytes = approximateBase64Bytes(normalizedImage);

    if (approxBytes > MAX_IMAGE_BYTES) {
      throw new ImageTooLargeError('La imagen supera el máximo de 5MB.');
    }
  }

  const today = localDate || new Date().toISOString().slice(0, 10);

  // 1) Check if a daily log already exists for today
  const { data: todayLog, error: todayLogError } = await supabase
    .from('daily_logs')
    .select('id, health_momentum, ai_data, habit_tracking')
    .eq('user_id', user.id)
    .eq('date', today)
    .maybeSingle();

  if (todayLogError) {
    const dbStatus = mapDatabaseError(todayLogError.message || '');
    throw new DatabaseError('No se pudo verificar el registro diario de hoy.', dbStatus.code);
  }

  // 2) Get previous health momentum from the last log before today
  const { data: previousLog, error: previousLogError } = await supabase
    .from('daily_logs')
    .select('health_momentum')
    .eq('user_id', user.id)
    .lt('date', today)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousLogError) {
    const dbStatus = mapDatabaseError(previousLogError.message || '');
    throw new DatabaseError('No se pudo leer el histórico del usuario.', dbStatus.code);
  }

  const previousMomentum = previousLog?.health_momentum ?? 100;
  const currentMomentum = todayLog ? todayLog.health_momentum : previousMomentum;

  let currentState = {
    water_ml: 0,
    total_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
    habits_count: {} as Record<string, number>,
  };

  if (todayLog && todayLog.ai_data) {
    const aiData = todayLog.ai_data as unknown as DailyLog;
    currentState = {
      water_ml: Math.max(
        typeof aiData.water_ml === 'number' ? aiData.water_ml : 0,
        typeof aiData.hidratacion_ml === 'number' ? aiData.hidratacion_ml : 0
      ),
      total_kcal: typeof aiData.total_kcal === 'number' ? aiData.total_kcal : 0,
      protein_g: typeof aiData.protein_g === 'number' ? aiData.protein_g : 0,
      carbs_g: typeof aiData.carbs_g === 'number' ? aiData.carbs_g : 0,
      fats_g: typeof aiData.fats_g === 'number' ? aiData.fats_g : 0,
      habits_count: (aiData.habits_count && typeof aiData.habits_count === 'object') ? aiData.habits_count : {},
    };
  }

  let toneInstruction = '';
  if (currentMomentum > 80) {
    toneInstruction = 'Tu tono de voz debe ser alegre, orgulloso y con mucha energía. Felicita al usuario con entusiasmo por mantener la salud de su Bio-Avatar tan alta.';
  } else if (currentMomentum >= 30) {
    toneInstruction = 'Tu tono de voz debe ser el de un coach neutral, motivador y alentador, ayudando al usuario a seguir adelante y mejorar.';
  } else {
    toneInstruction = 'Tu tono de voz debe ser de preocupación genuina, debilidad y tristeza. Suplícale al usuario que beba agua o coma sano para salvarte y restaurar tu energía.';
  }

  const stateStr = JSON.stringify(currentState);
  const systemPrompt =
    'Eres un evaluador metabólico proactivo. Tu tarea es analizar con rigor el texto y la imagen del usuario y devolver exclusivamente un objeto que cumpla el esquema. No incluyas texto extra, no expliques tu razonamiento y no inventes claves fuera del contrato. Debes inferir el estado fisiológico diario, detectar señales nutricionales, de hidratación y toxinas, y calcular una variación de inercia útil para el seguimiento longitudinal. \n' +
    `El estado actual del usuario HOY es: ${stateStr}. Tu tarea es leer el nuevo mensaje del usuario y SUMAR los nuevos valores al estado actual. Regla inquebrantable: Los hábitos acumulativos (como fumar o beber agua) NUNCA pueden disminuir en el mismo día. Si el estado actual es 3 y el usuario dice 'me fumé otro', el nuevo valor es 4. Nunca devuelvas un valor menor al estado actual. \n` +
    `Tu salud actual (health_momentum) es ${currentMomentum}. ${toneInstruction} \n` +
    'IMPORTANTE: Los saludos simples (como "hola", "buenos días") o check-ins conversacionales comunes (como "te mando un audio", "comencemos") NO deben ser considerados fuera de tema. En estos casos, establece "metricas.error_clave" en un valor neutral (como "saludo") y pon en "metricas.accion_manana" un mensaje cordial en primera persona invitando al usuario a registrar sus hábitos (ej: "¡Hola! Estoy listo para registrar tus comidas, bebida y hábitos de hoy. ¿Qué te gustaría apuntar?"). ' +
    'Únicamente cuando el mensaje sea totalmente ajeno a hábitos, nutrición, salud o bienestar (como problemas de matemáticas avanzadas, programación de software, debates políticos, etc.), debes establecer el valor exacto de "fuera_de_tema" en el campo "metricas.error_clave", y colocar en "metricas.accion_manana" un mensaje explicativo cordial indicando que tu propósito es el seguimiento de hábitos.';

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

  if (analyzedLog.metricas.error_clave === 'fuera_de_tema') {
    const currentMomentum = todayLog ? todayLog.health_momentum : previousMomentum;
    return {
      user_id: user.id,
      previous_health_momentum: currentMomentum,
      health_momentum: currentMomentum,
      daily_log: {
        id: todayLog ? todayLog.id : 'off-topic-log',
        user_id: user.id,
        date: today,
        health_momentum: currentMomentum,
        ai_data: analyzedLog,
        avatar_image_url: null,
        close_day_data: null,
        created_at: new Date().toISOString(),
      },
      ai_data: analyzedLog,
    };
  }

  let finalAiData = analyzedLog;
  let finalTracking = habitReports;

  if (todayLog) {
    const existingAi = dailyLogSchema.safeParse(todayLog.ai_data).success
      ? dailyLogSchema.parse(todayLog.ai_data)
      : null;
    if (existingAi) {
      finalAiData = mergeDailyLogs(existingAi, analyzedLog);
    }

    const existingTracking = Array.isArray(todayLog.habit_tracking)
      ? (todayLog.habit_tracking as Array<{ habit_id: number; amount: number }>)
      : [];
    finalTracking = mergeHabitTracking(existingTracking, habitReports);
  }

  const delta = finalAiData.metricas.variacion_inercia;
  const nextMomentum = Math.min(100, Math.max(0, previousMomentum + delta));

  try {
    await evaluateAndUpdateStreaks(supabase, user.id, habitReports);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to evaluate/update streaks';
    const dbStatus = mapDatabaseError(message);
    throw new DatabaseError('No se pudieron actualizar las rachas de hábitos.', dbStatus.code);
  }

  const upsertPayload = {
    user_id: user.id,
    date: today,
    health_momentum: nextMomentum,
    ai_data: finalAiData,
    habit_tracking: finalTracking,
  };

  const { data: upsertedLog, error: upsertError } = await supabase
    .from('daily_logs')
    .upsert(upsertPayload, { onConflict: 'user_id,date' })
    .select('*')
    .single();

  if (upsertError) {
    const dbStatus = mapDatabaseError(upsertError.message || '');
    throw new DatabaseError('No se pudo guardar o actualizar el registro diario de hoy.', dbStatus.code);
  }
  const finalRecord = upsertedLog;

  return {
    user_id: user.id,
    previous_health_momentum: previousMomentum,
    health_momentum: nextMomentum,
    daily_log: finalRecord,
    ai_data: finalAiData,
  };
}
