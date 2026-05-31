import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { endOfDaySchema } from '@/lib/schema';
import { buildHabitVisualDescriptors, isMissingHabitTableError } from '@/lib/habits';

export const dynamic = 'force-dynamic';

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

export async function POST(request: Request) {
  try {
    if (
      !process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.warn(
        '[BioAvatar] GOOGLE_GENERATIVE_AI_API_KEY or Supabase env vars are missing. Returning safe demo end-of-day summary.'
      );
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

      return NextResponse.json(
        {
          status: 200,
          data: {
            ...summary,
            imageUrl,
          },
        },
        { status: 200 }
      );
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

    const today = new Date().toISOString().slice(0, 10);

    const { data: records, error: recordsError } = await supabase
      .from('daily_logs')
      .select('id, ai_data, date, health_momentum')
      .eq('user_id', user.id)
      .eq('date', today)
      .order('created_at', { ascending: true });

    if (recordsError) {
      throw recordsError;
    }

    if (!records || records.length === 0) {
      return NextResponse.json(
        { error: 'No hay registros para cerrar el día de hoy.' },
        { status: 404 }
      );
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
      throw updateError;
    }

    return NextResponse.json(
      {
        status: 200,
        data: {
          ...summary,
          imageUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';

    return NextResponse.json({ error: `Falló el cierre del día: ${message}` }, { status: 500 });
  }
}
