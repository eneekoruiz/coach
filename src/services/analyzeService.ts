import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { type SupabaseClient, type User } from '@supabase/supabase-js';

import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { evaluateAndUpdateStreaks } from '@/lib/habits';
import { upsertDailyLog } from '@/services/dailyLogService';

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

function normalizeHabitKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
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
    existing.water_ml || existing.hidratacion_ml || 0,
    incoming.water_ml || incoming.hidratacion_ml || 0
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

  const metadata = user.user_metadata || {};
  const defaultGlassSize = Number(metadata.default_glass_size_ml ?? 250);

  if (rawImage) {
    const normalizedImage = normalizeBase64Image(rawImage);
    const approxBytes = approximateBase64Bytes(normalizedImage);

    if (approxBytes > MAX_IMAGE_BYTES) {
      throw new ImageTooLargeError('La imagen supera el máximo de 5MB.');
    }
  }

  const today = localDate || new Date().toISOString().slice(0, 10);

  // 1) Fetch active habits to inject into systemPrompt and map habits_count to actual IDs
  const { data: userHabits, error: habitsError } = await supabase
    .from('user_habits')
    .select('id, name, type')
    .eq('user_id', user.id);

  if (habitsError) {
    const dbStatus = mapDatabaseError(habitsError.message || '');
    throw new DatabaseError('No se pudo verificar el listado de hábitos del usuario.', dbStatus.code);
  }

  const habitKeysMap: Record<string, { id: number; name: string; type: string }> = {};
  if (userHabits) {
    for (const h of userHabits) {
      const key = normalizeHabitKey(h.name);
      habitKeysMap[key] = { id: h.id, name: h.name, type: h.type };
    }
  }

  const habitsListStr = userHabits && userHabits.length > 0
    ? userHabits.map((h) => `- "${h.name}" (usar clave: "${normalizeHabitKey(h.name)}" en habits_count). Tipo: ${h.type}.`).join('\n')
    : 'Ninguno';

  // 2) Check if a daily log already exists for today
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

  // 3) Get previous health momentum from the last log before today
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
    `El listado de hábitos activos que el usuario está siguiendo hoy es el siguiente:\n${habitsListStr}\n` +
    'Si el usuario menciona que ha realizado o incurrido en alguno de estos hábitos (ej: "he fumado", "me tomé un cigarro", "he bebido agua", "completé mi caminata"), debes registrarlo e incrementar su valor en "habits_count" usando exactamente la clave provista en la lista anterior.\n' +
    `El estado actual de hábitos acumulados de HOY es: ${stateStr}. Tu tarea es leer el nuevo mensaje del usuario y SUMAR las nuevas ocurrencias al estado actual de hábitos. Regla inquebrantable: Los hábitos acumulativos (como fumar o beber agua) NUNCA pueden disminuir en el mismo día. Si el estado actual es 3 y el usuario dice 'me fumé otro', el nuevo valor es 4. Nunca devuelvas un valor menor al estado de hábitos actual. \n` +
    `Regla de conversión de líquidos: Si el usuario menciona beber un vaso/taza o porción de agua estándar, equivale a exactamente ${defaultGlassSize} ml. Si menciona una botella de agua, equivale a exactamente 500 ml (a menos que se diga otra cantidad específica). Debes retornar el total acumulado de agua del día en "water_ml" y "hidratacion_ml" sumando estas porciones al estado actual.\n` +
    `Tu salud actual (health_momentum) es ${currentMomentum}. ${toneInstruction} \n` +
    `Regla de Cohesión Inquebrantable: En "metricas.accion_manana" y en cualquier texto explicativo que redactes, si te refieres al valor de la salud del usuario o inercia de salud de su Bio-Avatar, debes usar EXACTAMENTE el valor de salud actual provisto (${currentMomentum}) sin alterarlo ni inventarte otro número diferente. \n` +
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

  // Map parsed habits_count back to database tracking entries
  const aiTracking: Array<{ habit_id: number; amount: number }> = [];
  if (analyzedLog.habits_count) {
    for (const [key, amount] of Object.entries(analyzedLog.habits_count)) {
      const habitInfo = habitKeysMap[key];
      if (habitInfo) {
        aiTracking.push({ habit_id: habitInfo.id, amount: Number(amount) });
      }
    }
  }

  let finalAiData = analyzedLog;
  let finalTracking = mergeHabitTracking(habitReports, aiTracking);

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
    finalTracking = mergeHabitTracking(existingTracking, finalTracking);
  }

  const delta = finalAiData.metricas.variacion_inercia;
  const nextMomentum = Math.min(100, Math.max(0, previousMomentum + delta));

  // Health Score Alignment Parser (fail-safe to align AI text to true nextMomentum)
  if (finalAiData.metricas && typeof finalAiData.metricas.accion_manana === 'string') {
    finalAiData.metricas.accion_manana = finalAiData.metricas.accion_manana.replace(
      /(salud(?:\s+actual)?(?:\s+(?:es|esta|en|de))?\s*)(\d+)/gi,
      `$1${nextMomentum}`
    );
  }

  try {
    await evaluateAndUpdateStreaks(supabase, user.id, finalTracking);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to evaluate/update streaks';
    const dbStatus = mapDatabaseError(message);
    throw new DatabaseError('No se pudieron actualizar las rachas de hábitos.', dbStatus.code);
  }

  let finalRecord;
  try {
    finalRecord = await upsertDailyLog({
      supabase,
      userId: user.id,
      date: today,
      healthMomentum: nextMomentum,
      aiData: finalAiData,
      habitTracking: finalTracking,
    });
  } catch (upsertError) {
    const msg = upsertError instanceof Error ? upsertError.message : String(upsertError);
    const dbStatus = mapDatabaseError(msg);
    throw new DatabaseError('No se pudo guardar o actualizar el registro diario de hoy.', dbStatus.code);
  }

  return {
    user_id: user.id,
    previous_health_momentum: previousMomentum,
    health_momentum: nextMomentum,
    daily_log: finalRecord,
    ai_data: finalAiData,
  };
}
