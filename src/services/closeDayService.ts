import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { type SupabaseClient, type User } from '@supabase/supabase-js';

import { endOfDaySchema } from '@/lib/schema';
import { buildHabitVisualDescriptors, isMissingHabitTableError } from '@/lib/habits';

export class NoDailyLogsError extends Error {}
export class DatabaseError extends Error {}

export function createSafeDemoCloseDayResponse() {
  const summary = {
    puntuacion_global: 72,
    aciertos: ['Mascota estable', 'Sesión local activa', 'Chat disponible'],
    error_clave: 'Faltan variables de entorno',
    accion_manana: 'Configura el backend real y vuelve a registrar el día',
    prompt_imagen:
      'a photorealistic german shepherd in a calm bright forest, clean composition, soft morning light, no text',
  };

  const encodedPrompt = encodeURIComponent(summary.prompt_imagen);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

  return {
    ...summary,
    imageUrl,
  };
}

export interface CloseDayParams {
  supabase: SupabaseClient;
  user: User;
}

export async function closeUserDay(params: CloseDayParams) {
  const { supabase, user } = params;

  const today = new Date().toISOString().slice(0, 10);

  const { data: records, error: recordsError } = await supabase
    .from('daily_logs')
    .select('id, ai_data, date, health_momentum')
    .eq('user_id', user.id)
    .eq('date', today)
    .order('created_at', { ascending: true });

  if (recordsError) {
    throw new DatabaseError(recordsError.message);
  }

  if (!records || records.length === 0) {
    throw new NoDailyLogsError('No hay registros para cerrar el día de hoy.');
  }

  const recordsForToday = records.map((record) => record.ai_data);

  // Fetch user's habits to inject state into the visual prompt
  const { data: userHabits, error: userHabitsError } = await supabase
    .from('user_habits')
    .select('*')
    .eq('user_id', user.id);

  const habitStateDescriptor =
    userHabitsError && isMissingHabitTableError(userHabitsError)
      ? ''
      : userHabits
      ? buildHabitVisualDescriptors(userHabits)
      : '';

  const systemPrompt = `Eres el evaluador final. Analiza este array de registros de hoy del usuario. Genera un objeto JSON con: 1) puntuacion_global (0-100), 2) aciertos (array de 3 strings), 3) error_clave (string), 4) accion_manana (string), y 5) prompt_imagen (una descripción fotorrealista en INGLÉS del estado de un perro Pastor Alemán basada en el día). Incorpora explícitamente el estado de los hábitos en la descripción visual: ${habitStateDescriptor}. Si fue bueno: athletic posture, golden hour sunlight, pristine nature. Si fue malo: coughing, smoggy, tired eyes, dirty environment. NO TEXT in image.`;

  const { object: summary } = await generateObject({
    model: google('gemini-2.5-flash'),
    system: systemPrompt,
    prompt: `Registros de hoy:\n${JSON.stringify(recordsForToday, null, 2)}`,
    schema: endOfDaySchema,
  });

  const encodedPrompt = encodeURIComponent(summary.prompt_imagen);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

  const { error: updateError } = await supabase
    .from('daily_logs')
    .update({
      avatar_image_url: imageUrl,
      close_day_data: {
        ...summary,
        imageUrl,
        generated_at: new Date().toISOString(),
        records_count: records.length,
      },
    })
    .eq('user_id', user.id)
    .eq('date', today);

  if (updateError) {
    throw new DatabaseError(updateError.message);
  }

  return {
    ...summary,
    imageUrl,
  };
}
