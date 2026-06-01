import { NextResponse } from 'next/server';
import { resolveAuthenticatedClient } from '@/services/authService';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') ?? undefined;
    let auth;
    try {
      auth = await resolveAuthenticatedClient(authHeader);
    } catch (authErr) {
      console.error('[SEED_API_ERROR] Authentication failed:', authErr);
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { supabase, user } = auth;

    const logs = [];
    let currentMomentum = 75; // Initial momentum seed

    for (let i = 60; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      // Create realistic waves of good and bad health cycles
      const cycleDay = (60 - i) % 30;
      let momentumChange = 0;
      let kcal = 0;
      let protein = 0;
      let carbs = 0;
      let fats = 0;
      let water = 0;
      let smokeCount = 0;
      let state = '';
      let errorClave = '';
      let accionManana = '';
      let aciertos: string[] = [];

      if (cycleDay < 18) {
        // Good/Healthy streak: active exercise, high water, clean diet, no smoking
        momentumChange = Math.floor(Math.random() * 5) + 2; // +2 to +6
        kcal = Math.floor(Math.random() * 350) + 1850; // 1850-2200 kcal
        protein = Math.floor(Math.random() * 30) + 130; // 130-160g
        carbs = Math.floor(Math.random() * 50) + 180; // 180-230g
        fats = Math.floor(Math.random() * 15) + 55; // 55-70g
        water = Math.floor(Math.random() * 700) + 1900; // 1900-2600ml
        smokeCount = 0;
        state = 'metabolismo optimizado, hidratación excelente';
        errorClave = 'ninguno';
        accionManana = 'Excelente consistencia. Mantén la inercia metabólica de hoy.';
        aciertos = ['Meta de agua superada', 'Proteínas en rango óptimo', 'Cero tabaco hoy'];
      } else {
        // Bad/Sluggish streak: sedentary, poor hydration, junk food, smoking
        momentumChange = -(Math.floor(Math.random() * 6) + 2); // -2 to -7
        kcal = Math.floor(Math.random() * 700) + 2400; // 2400-3100 kcal
        protein = Math.floor(Math.random() * 30) + 75; // 75-105g
        carbs = Math.floor(Math.random() * 100) + 260; // 260-360g
        fats = Math.floor(Math.random() * 25) + 80; // 80-105g
        water = Math.floor(Math.random() * 600) + 700; // 700-1300ml
        smokeCount = Math.floor(Math.random() * 3) + 1; // 1-3 cigarettes
        state = 'sobrecarga glucémica, deshidratación leve, toxinas detectadas';
        errorClave = 'deshidratación y consumo de tabaco';
        accionManana = 'Intenta iniciar mañana con 2 vasos de agua y reduce el tabaco a la mitad.';
        aciertos = ['Registro diario completado'];
      }

      currentMomentum = Math.min(100, Math.max(10, currentMomentum + momentumChange));

      const aiData = {
        comidas: [
          {
            hora: '08:30',
            descripcion: cycleDay < 18 ? 'Tortilla de claras con espinacas y café solo' : 'Bollos industriales con café con leche entero',
            calidad_nutricional: cycleDay < 18 ? 'buena' as const : 'mala' as const,
          },
          {
            hora: '14:15',
            descripcion: cycleDay < 18 ? 'Salmón al horno con quinoa y espárragos' : 'Hamburguesa con patatas fritas y refresco',
            calidad_nutricional: cycleDay < 18 ? 'buena' as const : 'mala' as const,
          },
        ],
        hidratacion_ml: water,
        water_ml: water,
        total_kcal: kcal,
        protein_g: protein,
        carbs_g: carbs,
        fats_g: fats,
        habits_count: {
          smoke: smokeCount,
          ejercicio_minutos: cycleDay < 18 ? 40 : 0,
        },
        toxinas: smokeCount > 0 ? ['nicotina', 'alquitrán'] : [],
        bio_avatar: {
          estado_fisiologico: state,
          energia_fisica: cycleDay < 18 ? 4 : 2,
          claridad_mental: cycleDay < 18 ? 4 : 2,
        },
        metricas: {
          variacion_inercia: momentumChange,
          aciertos,
          error_clave: errorClave,
          accion_manana: accionManana,
        },
      };

      const dailyLogPayload = {
        user_id: user.id,
        date: dateStr,
        health_momentum: currentMomentum,
        ai_data: aiData,
      };

      logs.push(dailyLogPayload);
    }

    const { error } = await supabase
      .from('daily_logs')
      .upsert(logs, { onConflict: 'user_id,date' });

    if (error) {
      console.error('[SEED_API_ERROR] Supabase upsert failed:', error);
      return NextResponse.json({ error: `Fallo al insertar registros: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: logs.length });
  } catch (err) {
    console.error('[SEED_API_ERROR] Unexpected error:', err);
    return NextResponse.json({ error: 'Error inesperado al sembrar datos' }, { status: 500 });
  }
}
