import { type DailyLog } from '@/lib/schema';

export const AI_TIMEOUT_MS = 12000;

export function withTimeout<T>(promise: Promise<T>, ms = AI_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`AI timeout after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
}

export function createFallbackDailyLog(date: string, reason: string): DailyLog {
  return {
    date,
    comidas: [],
    hidratacion_ml: 0,
    water_ml: 0,
    total_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
    habits_count: {},
    toxinas: [],
    bio_avatar: {
      estado_fisiologico: 'sin datos suficientes',
      energia_fisica: 3,
      claridad_mental: 3,
    },
    metricas: {
      variacion_inercia: 0,
      aciertos: [],
      error_clave: reason,
      accion_manana: 'No he podido analizarlo con IA ahora mismo. Lo he guardado de forma segura; añade un detalle concreto y lo sincronizo cuando el servicio responda.',
    },
  };
}

export function buildDailyLogSystemPrompt(params: {
  localDate: string;
  currentState: unknown;
  habits: Array<{ id: number; name: string; type: string }>;
  weeklyContext: unknown;
}) {
  return [
    'Eres BioAvatar Coach. Responde SOLO con JSON válido para dailyLogSchema.',
    `Fecha local del usuario: ${params.localDate}. Usa esta fecha para date; no uses UTC del servidor.`,
    'Extrae comida, agua, toxinas, hábitos y una respuesta breve en metricas.accion_manana.',
    'La voz del coach debe sonar natural, cálida y contextual, como una conversación continua y no como un informe clínico.',
    'Ten en cuenta el contexto previo: si el usuario viene hablando de algo, responde como continuación de esa misma conversación.',
    'Si el mensaje es saludo/off-topic, deja macros en 0 y usa metricas.error_clave="saludo" o "fuera_de_tema".',
    'No inventes cantidades: estima solo si hay evidencia visual/textual. Números siempre finitos.',
    `Estado actual JSON compacto: ${JSON.stringify(params.currentState)}`,
    `Hábitos permitidos JSON: ${JSON.stringify(params.habits)}`,
    params.weeklyContext ? `Contexto 7d JSON: ${JSON.stringify(params.weeklyContext)}` : 'Contexto 7d: null',
  ].join('\n');
}
