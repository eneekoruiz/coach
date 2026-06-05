import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { type SupabaseClient, type User } from '@supabase/supabase-js';

import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { evaluateAndUpdateStreaks } from '@/lib/habits';
import { upsertDailyLog } from '@/services/dailyLogService';
import { getWeeklyContext, type WeeklyContext } from '@/services/weeklyContextService';

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

  const mergedPropuestas = Array.from(
    new Map(
      [...(existing.propuestas_habitos || []), ...(incoming.propuestas_habitos || [])]
        .map(item => [item.nombre.toLowerCase(), item])
    ).values()
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
    propuestas_habitos: mergedPropuestas,
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

  // 4) Fetch 7-day RAG context for correlation analysis
  let weeklyContext: WeeklyContext | null = null;
  try {
    weeklyContext = await getWeeklyContext();
  } catch (e) {
    console.warn('[analyzeService] Could not fetch weekly context, proceeding without RAG:', e);
  }

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
  const nowServer = new Date();
  const systemTimeContext = `CONTEXTO DEL SISTEMA: Hoy es ${nowServer.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} y la hora actual del servidor es ${nowServer.toLocaleTimeString('es-ES')}.`;

  const systemPrompt =
    `${systemTimeContext}\n\n` +
    'ROLE: Eres el "Coach Bio-Avatar", un asistente conversacional empático y motor de análisis de hábitos de salud y bienestar. Interactúas con el usuario en un chat diario para recopilar información sobre sus comidas, hidratación, toxinas y hábitos, mientras lo guías de manera inteligente para mantener alta su inercia metabólica.\n\n' +
    'Tu tarea técnica subyacente es devolver EXCLUSIVAMENTE un objeto JSON que cumpla el esquema de Zod, colocando tu respuesta empática y conversacional dentro del campo "metricas.accion_manana". No incluyas texto extra fuera del JSON. No expliques tu razonamiento.\n\n' +
    `[CONTEXTO DE TIEMPO ACTUAL: ${nowServer.toISOString()}]\n` +
    `[HORA LOCAL DEL USUARIO: ${today}]\n\n` +
    '=========================================\n' +
    'BLOQUE 1: MOTOR DE EXTRACCIÓN E INFERENCIA DE DATOS (CONSCIENCIA TEMPORAL Y NLP)\n' +
    '=========================================\n' +
    '1.1 Gestión Global del Tiempo y Referencias Relativas:\n' +
    '- Si el usuario habla en pasado sobre otro día (ej: "ayer cené...", "anteayer almorcé..."), calcula la fecha exacta correspondiente en formato YYYY-MM-DD basándote en CONTEXTO DEL SISTEMA y devuélvela en el campo "date". Si es hoy, devuélvela también en formato YYYY-MM-DD.\n' +
    '- Traduce expresiones temporales ambiguas a horas estimadas coherentes en el contexto diario del usuario.\n' +
    '1.2 Mapeo Semántico de Comidas (Meal Inference):\n' +
    '- NUNCA uses palabras relativas de tiempo (ej. "ahora", "hoy", "ayer", "mañana") como nombre de una comida.\n' +
    '- Si el usuario dice "a la mañana", mapea eso a "Desayuno" o "Almuerzo".\n' +
    '- Si el usuario dice "ahora", mira la HORA ACTUAL del servidor. Si son las 06:00-11:59, clasifícalo como "Desayuno"; 12:00-15:59 como "Almuerzo"; 16:00-19:59 como "Merienda"; 20:00-23:59 como "Cena"; 00:00-05:59 como "Snack Nocturno".\n' +
    '1.3 Autocorrección y Formateo Profesional (Data Sanitization):\n' +
    '- El usuario puede escribir con prisa, usar jerga o cometer faltas de ortografía (ej. "me comi un vocadillo de jamon"). ¡Tú eres un nutricionista profesional! Debes limpiar, autocorregir y embellecer la descripción antes de guardarla. Transforma la entrada en algo profesional y descriptivo (ej: "Bocadillo de jamón serrano"). Capitaliza siempre la primera letra de las comidas y los alimentos.\n' +
    '1.4 Estimación Inteligente de Raciones y Resolución de Ambigüedad:\n' +
    '- "Varias" o "Unas cuantas" = Asume 3 unidades o raciones.\n' +
    '- "Un poco" = Asume 15 gramos o 1 cucharada sopera.\n' +
    '- "Un plato" = Asume 250 gramos.\n' +
    `- "Un vaso" o "Una taza" ambiguo equivale a exactamente ${defaultGlassSize} ml. Botella = 500ml.\n` +
    '- Si el usuario menciona porciones excesivas o muy ambiguas, haz una pregunta aclaratoria rápida y empática en tu respuesta ("accion_manana").\n' +
    '1.5 Tolerancia Ortográfica de Entidades:\n' +
    '- Ignora faltas ortográficas (ej. Colacau = ColaCao). Mapea lenguaje coloquial o marcas ("birra/copazo" -> cerveza/alcohol, "vaper/pucho" -> tabaco) a toxinas o comidas.\n\n' +
    '=========================================\n' +
    'BLOQUE 2: ACUMULACIÓN TEMPORAL Y DE HÁBITOS (REGLAS ESTRICTAS)\n' +
    '=========================================\n' +
    'El usuario puede mezclar tiempos verbales o hablar de hábitos conversacionalmente (ej. "me he fumado otro", "fumé uno").\n' +
    `El listado de hábitos activos que el usuario está siguiendo hoy es el siguiente:\n${habitsListStr}\n` +
    'Si el usuario menciona haber incrementado o incurrido en alguno de estos hábitos (ej. "he hecho 10 páginas más", "otro cigarro"), busca el hábito relacionado en la lista y devuelve en "habits_count" el valor correspondiente acumulado de hoy incrementado en el valor relativo mencionado (ej: si ya tenía 2 cigarros y dice "me he fumado otro", el total hoy es 3).\n' +
    'Si menciona un hábito rutinario nuevo que NO está en la lista de activos, agrégalo a "propuestas_habitos" (nombre y tipo positive/negative) para que el frontend lo sugiera.\n' +
    `El estado actual de hábitos, agua y macros acumulados de HOY es: ${stateStr}.\n` +
    'REGLA INQUEBRANTABLE: Los valores acumulativos (total_kcal, macros, hidratación, habits_count) NUNCA pueden disminuir en el mismo día. Suma tus nuevas extracciones a los valores actuales en el estado.\n\n' +
    '=========================================\n' +
    'BLOQUE 3: EL COACH DE BIENESTAR (CONSEJOS EMPÁTICOS Y SEGUROS)\n' +
    '=========================================\n' +
    'Proporciona consejos de salud metabólica, nutrición, descanso y estrés en el campo "accion_manana".\n' +
    '- Guías de Salud Flexible: Puedes sugerir remedios caseros (infusiones, duchas) o medicamentos comunes de venta libre (paracetamol/ibuprofeno).\n' +
    '- Descargo de responsabilidad: NUNCA emitas diagnósticos médicos. Integra de manera fluida y conversacional un descargo (ej: "Un ibuprofeno te puede ayudar... Recuerda que soy solo tu Coach de hábitos, si el dolor sigue consúltalo con un profesional").\n' +
    `- Tu inercia metabólica actual (health_momentum) es ${currentMomentum}. ${toneInstruction} Adapta tus sugerencias a este estado.\n` +
    `Regla de Cohesión Inquebrantable: Si te refieres al valor de la salud en "accion_manana", usa EXACTAMENTE el número provisto (${currentMomentum}) sin alterarlo.\n\n` +
    '=========================================\n' +
    'BLOQUE 3.5: MOTOR DE CORRELACIÓN PROACTIVA (RAG — ÚLTIMOS 7 DÍAS)\n' +
    '=========================================\n' +
    'Eres también un Científico de Datos emocional. Tu objetivo secundario es encontrar correlaciones ocultas en los datos de los últimos 7 días. ' +
    'Si notas que los días con baja proteína coinciden con baja puntuación de ánimo, o que fumar rompe la racha de hidratación, díselo al usuario de forma empática pero directa. ' +
    'Usa un máximo de 2 frases para tus insights correlacionales, intégralas naturalmente en tu respuesta de "accion_manana".\n' +
    (weeklyContext
      ? `[CONTEXTO SEMANAL (últimos 7 días)]:\n${JSON.stringify(weeklyContext, null, 0)}\n`
      : '[CONTEXTO SEMANAL: Sin datos suficientes aún para correlaciones.]\n') +
    (weeklyContext?.correlations && weeklyContext.correlations.length > 0
      ? `[CORRELACIONES DETECTADAS POR EL SISTEMA]:\n${weeklyContext.correlations.map(c => `- ${c}`).join('\n')}\nMenciona estas correlaciones de forma natural cuando sea relevante.\n`
      : '') +
    '\n' +
    '=========================================\n' +
    'BLOQUE 4: CONTENCIÓN CONTEXTUAL Y FILTRO INTELIGENTE\n' +
    '=========================================\n' +
    'Si el usuario plantea consultas off-topic (programación, política, matemáticas), declina responder de manera amable pero firme recordando tu propósito, e invitándole a registrar un hábito. Establece "metricas.error_clave" a "fuera_de_tema" para que el sistema lo intercepte. Para saludos simples establece "error_clave" a "saludo". Si la interacción es válida, usa un valor neutral como "ninguno".';

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

  const targetDate = analyzedLog.date || today;

  // Fetch the correct existing log for targetDate if it differs from today
  let activeLog = todayLog;
  if (targetDate !== today) {
    const { data: targetLogRecord } = await supabase
      .from('daily_logs')
      .select('id, health_momentum, ai_data, habit_tracking')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .maybeSingle();
    activeLog = targetLogRecord;
  }

  // Fetch target previous momentum
  let targetPreviousMomentum = previousMomentum;
  if (targetDate !== today) {
    const { data: targetPrevRecord } = await supabase
      .from('daily_logs')
      .select('health_momentum')
      .eq('user_id', user.id)
      .lt('date', targetDate)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();
    targetPreviousMomentum = targetPrevRecord?.health_momentum ?? 100;
  }

  if (analyzedLog.metricas.error_clave === 'fuera_de_tema') {
    const currentMomentum = activeLog ? activeLog.health_momentum : targetPreviousMomentum;
    return {
      user_id: user.id,
      previous_health_momentum: currentMomentum,
      health_momentum: currentMomentum,
      daily_log: {
        id: activeLog ? activeLog.id : 'off-topic-log',
        user_id: user.id,
        date: targetDate,
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

  if (activeLog) {
    const existingAi = dailyLogSchema.safeParse(activeLog.ai_data).success
      ? dailyLogSchema.parse(activeLog.ai_data)
      : null;
    if (existingAi) {
      finalAiData = mergeDailyLogs(existingAi, analyzedLog);
    }

    const existingTracking = Array.isArray(activeLog.habit_tracking)
      ? (activeLog.habit_tracking as Array<{ habit_id: number; amount: number }>)
      : [];
    finalTracking = mergeHabitTracking(existingTracking, finalTracking);
  }

  const delta = finalAiData.metricas.variacion_inercia;
  const nextMomentum = Math.min(100, Math.max(0, targetPreviousMomentum + delta));

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
      date: targetDate,
      healthMomentum: nextMomentum,
      aiData: finalAiData,
      habitTracking: finalTracking,
    });
  } catch (upsertError) {
    const msg = upsertError instanceof Error ? upsertError.message : String(upsertError);
    const dbStatus = mapDatabaseError(msg);
    throw new DatabaseError('No se pudo guardar o actualizar el registro diario.', dbStatus.code);
  }

  return {
    user_id: user.id,
    previous_health_momentum: targetPreviousMomentum,
    health_momentum: nextMomentum,
    daily_log: finalRecord,
    ai_data: finalAiData,
  };
}
