'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { dailyLogSchema, scannedDietImportSchema } from '@/lib/schema';
import { z } from 'zod';
import { isE2EMockMode } from '@/lib/e2e';
import { getE2EMockStore } from '@/lib/e2e-mock-store';
import { captureException } from '@/lib/monitoring';

import { dietTemplateSchema, type DietTemplate, defaultTemplate, type MealItem } from '@/lib/schema';

export async function getDietTemplates(): Promise<DietTemplate[]> {
  try {
    if (isE2EMockMode()) {
      return getE2EMockStore().nutrition.templates;
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('diet_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn(`[Supabase Fetch Warning] Tabla diet_templates: ${error.message}`);
      return [];
    }

    if (!data || data.length === 0) {
      // Seed Data: 3 plantillas base
      const seedTemplates = [
        {
          user_id: user.id,
          name: 'Día Base',
          target_kcal: 2000,
          target_protein: 150,
          target_carbs: 200,
          target_fats: 66,
          meals: [
            { id: `m1-${Date.now()}`, name: 'Desayuno', text: 'Huevos, avena', target_kcal: 500, target_protein: 40, target_carbs: 50, target_fats: 15 },
            { id: `m2-${Date.now()}`, name: 'Almuerzo', text: 'Pollo, arroz, verduras', target_kcal: 700, target_protein: 50, target_carbs: 80, target_fats: 20 },
            { id: `m3-${Date.now()}`, name: 'Cena', text: 'Pescado, patata asada', target_kcal: 600, target_protein: 40, target_carbs: 50, target_fats: 20 },
            { id: `m4-${Date.now()}`, name: 'Snack', text: 'Yogur griego, nueces', target_kcal: 200, target_protein: 20, target_carbs: 20, target_fats: 11 }
          ]
        },
        {
          user_id: user.id,
          name: 'Día de Entrenamiento',
          target_kcal: 2400,
          target_protein: 170,
          target_carbs: 280,
          target_fats: 66,
          meals: [
            { id: `m1-${Date.now()}`, name: 'Desayuno', text: 'Huevos, avena doble', target_kcal: 600, target_protein: 40, target_carbs: 70, target_fats: 15 },
            { id: `m2-${Date.now()}`, name: 'Almuerzo', text: 'Pollo, arroz, verduras', target_kcal: 700, target_protein: 50, target_carbs: 80, target_fats: 20 },
            { id: `m3-${Date.now()}`, name: 'Post-Entreno', text: 'Batido de proteína, plátano', target_kcal: 300, target_protein: 30, target_carbs: 40, target_fats: 2 },
            { id: `m4-${Date.now()}`, name: 'Cena', text: 'Ternera, patata asada grande', target_kcal: 800, target_protein: 50, target_carbs: 90, target_fats: 29 }
          ]
        },
        {
          user_id: user.id,
          name: 'Día Libre',
          target_kcal: 2600,
          target_protein: 120,
          target_carbs: 300,
          target_fats: 100,
          meals: [
            { id: `m1-${Date.now()}`, name: 'Brunch', text: 'Tostadas francesas, bacon', target_kcal: 1000, target_protein: 40, target_carbs: 100, target_fats: 50 },
            { id: `m2-${Date.now()}`, name: 'Cena Libre', text: 'Pizza o Hamburguesa', target_kcal: 1600, target_protein: 80, target_carbs: 200, target_fats: 50 }
          ]
        }
      ];

      const { data: inserted, error: insertError } = await supabase
        .from('diet_templates')
        .insert(seedTemplates)
        .select('*');

      if (insertError) {
        console.error('[Supabase] Error seeding diet_templates:', insertError.message, insertError.code, insertError.details);
      }

      if (!insertError && inserted) {
        return inserted.map(row => dietTemplateSchema.parse(row));
      }
    }

    const validTemplates: DietTemplate[] = [];
    for (const row of data) {
      const parsed = dietTemplateSchema.safeParse(row);
      if (parsed.success) {
        validTemplates.push(parsed.data);
      } else {
        console.error('[Zod Parse Error]', parsed.error);
      }
    }

    return validTemplates;
  } catch (err) {
    captureException(err, { area: 'nutrition', action: 'getDietTemplates' });
    console.error('getDietTemplates server action error:', err);
    return [];
  }
}

export async function saveDietTemplate(template: DietTemplate): Promise<{ success: boolean; data?: DietTemplate; error?: string }> {
  try {
    if (isE2EMockMode()) {
      const store = getE2EMockStore();
      const savedTemplate: DietTemplate = {
        ...template,
        id: template.id ?? `diet-template-${Date.now()}`,
      };
      const existingIndex = store.nutrition.templates.findIndex((item) => item.id === savedTemplate.id);
      if (existingIndex >= 0) {
        store.nutrition.templates[existingIndex] = savedTemplate;
      } else {
        store.nutrition.templates.unshift(savedTemplate);
      }
      return { success: true, data: savedTemplate };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const parsed = dietTemplateSchema.safeParse(template);
    if (!parsed.success) {
      return { success: false, error: 'Estructura de plantilla inválida.' };
    }

    const templateData = {
      user_id: user.id,
      parent_template_id: parsed.data.parent_template_id ?? null,
      name: parsed.data.name,
      target_kcal: parsed.data.target_kcal,
      target_protein: parsed.data.target_protein,
      target_carbs: parsed.data.target_carbs,
      target_fats: parsed.data.target_fats,
      meals: parsed.data.meals,
    };

    let result;
    try {
      const persistTemplate = async (data: typeof templateData | Omit<typeof templateData, 'parent_template_id'>) => {
        if (parsed.data.id) {
          return supabase
            .from('diet_templates')
            .update(data)
            .eq('id', parsed.data.id)
            .eq('user_id', user.id)
            .select('*')
            .single();
        }

        return supabase
          .from('diet_templates')
          .insert(data)
          .select('*')
          .single();
      };

      result = await persistTemplate(templateData);

      if (
        result.error &&
        result.error.message?.toLowerCase().includes('parent_template_id')
      ) {
        const { parent_template_id: _parentTemplateId, ...legacyTemplateData } = templateData;
        result = await persistTemplate(legacyTemplateData);
      }

      if (result.error) {
        throw result.error;
      }
    } catch (dbError: any) {
      console.error("ERROR IA DB:", dbError);
      return { success: false, error: dbError.message || 'Error en la base de datos.' };
    }

    const responseData = parsed.data.parent_template_id && !result.data.parent_template_id
      ? { ...result.data, parent_template_id: parsed.data.parent_template_id }
      : result.data;

    const responseParsed = dietTemplateSchema.safeParse(responseData);
    if (!responseParsed.success) {
       return { success: false, error: 'Error al parsear la respuesta del servidor.' };
    }

    return { success: true, data: responseParsed.data };
  } catch (err) {
    captureException(err, { area: 'nutrition', action: 'saveDietTemplate', extra: { templateName: template?.name } });
    console.error('saveDietTemplate server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

export async function deleteDietTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const { error } = await supabase
      .from('diet_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting diet template:', error.message);
      return { success: false, error: 'Error al eliminar en base de datos.' };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteDietTemplate server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

export async function getDietCalendar(startDate: string, endDate: string): Promise<Array<{ date: string; template_id: string }>> {
  try {
    if (isE2EMockMode()) {
      return getE2EMockStore().nutrition.calendar.filter((item) => item.date >= startDate && item.date <= endDate);
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_diet_calendar')
      .select('date, template_id')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.warn(`[Supabase Fetch Warning] Tabla user_diet_calendar: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (err) {
    captureException(err, { area: 'nutrition', action: 'getDietCalendar' });
    console.error('getDietCalendar server action error:', err);
    return [];
  }
}

export async function assignTemplateToDates(templateId: string, dates: string[]): Promise<{ success: boolean; error?: string }> {
  try {
    if (isE2EMockMode()) {
      const store = getE2EMockStore();
      for (const date of dates) {
        const existingIndex = store.nutrition.calendar.findIndex((item) => item.date === date);
        const row = { date, template_id: templateId };
        if (existingIndex >= 0) {
          store.nutrition.calendar[existingIndex] = row;
        } else {
          store.nutrition.calendar.push(row);
        }
      }
      return { success: true };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const rowsToInsert = dates.map(dateStr => ({
      user_id: user.id,
      date: dateStr,
      template_id: templateId,
    }));

    const { error } = await supabase
      .from('user_diet_calendar')
      .upsert(rowsToInsert, { onConflict: 'user_id,date' });

    if (error) {
      console.error('Error assigning template:', error.message);
      return { success: false, error: 'Error al asignar la plantilla en la base de datos.' };
    }

    return { success: true };
  } catch (err) {
    captureException(err, { area: 'nutrition', action: 'assignTemplateToDates', extra: { templateId, datesCount: dates.length } });
    console.error('assignTemplateToDates server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

export async function markMealAsEaten(
  meal: MealItem,
  date: string,
  templateId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const parsedMeal = z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      text: z.string().default(''),
      target_kcal: z.number().min(0).default(0),
      target_protein: z.number().min(0).default(0),
      target_carbs: z.number().min(0).default(0),
      target_fats: z.number().min(0).default(0),
    }).safeParse(meal);

    if (!parsedMeal.success || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { success: false, error: 'Comida o fecha inválida.' };
    }

    const mealData = parsedMeal.data;
    const completionPayload = {
      user_id: user.id,
      date,
      meal_id: mealData.id,
      meal_name: mealData.name,
      template_id: templateId ?? null,
      kcal: Math.round(mealData.target_kcal),
      protein_g: Math.round(mealData.target_protein),
      carbs_g: Math.round(mealData.target_carbs),
      fats_g: Math.round(mealData.target_fats),
    };

    const { error: completionError } = await supabase
      .from('nutrition_meal_completions')
      .upsert(completionPayload, { onConflict: 'user_id,date,meal_id' });

    if (completionError && completionError.code !== '42P01') {
      return { success: false, error: completionError.message };
    }

    const { data: existing, error: fetchError } = await supabase
      .from('daily_logs')
      .select('health_momentum, ai_data, habit_tracking')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: fetchError.message };
    }

    const existingAiData = existing?.ai_data && typeof existing.ai_data === 'object'
      ? existing.ai_data
      : {};

    const existingLog = dailyLogSchema.safeParse(existingAiData);
    const baseLog = existingLog.success
      ? existingLog.data
      : {
          date,
          comidas: [],
          hidratacion_ml: 0,
          toxinas: [],
          bio_avatar: {
            estado_fisiologico: 'Estable',
            energia_fisica: 3,
            claridad_mental: 3,
          },
          metricas: {
            variacion_inercia: 0,
            aciertos: [],
            error_clave: 'ninguno',
            accion_manana: 'Ninguna',
          },
          water_ml: 0,
          total_kcal: 0,
          protein_g: 0,
          carbs_g: 0,
          fats_g: 0,
          habits_count: {},
          propuestas_habitos: [],
        };

    const alreadyRegistered = baseLog.comidas.some(
      (item) => item.hora === mealData.name && item.descripcion === mealData.text
    );

    const nextLog = {
      ...baseLog,
      date,
      comidas: alreadyRegistered
        ? baseLog.comidas
        : [
            ...baseLog.comidas,
            {
              hora: mealData.name,
              descripcion: mealData.text || mealData.name,
              calidad_nutricional: 'buena' as const,
            },
          ],
      total_kcal: alreadyRegistered ? baseLog.total_kcal : baseLog.total_kcal + Math.round(mealData.target_kcal),
      protein_g: alreadyRegistered ? baseLog.protein_g : baseLog.protein_g + Math.round(mealData.target_protein),
      carbs_g: alreadyRegistered ? baseLog.carbs_g : baseLog.carbs_g + Math.round(mealData.target_carbs),
      fats_g: alreadyRegistered ? baseLog.fats_g : baseLog.fats_g + Math.round(mealData.target_fats),
    };

    const validatedLog = dailyLogSchema.parse(nextLog);
    const { error: upsertError } = await supabase
      .from('daily_logs')
      .upsert({
        user_id: user.id,
        date,
        health_momentum: existing?.health_momentum ?? 70,
        ai_data: validatedLog,
        habit_tracking: existing?.habit_tracking ?? [],
      }, { onConflict: 'user_id,date' });

    if (upsertError) {
      return { success: false, error: upsertError.message };
    }

    return { success: true };
  } catch (err) {
    console.error('markMealAsEaten server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

export async function autocompleteDietWithAi(context: string): Promise<{ success: boolean; data?: DietTemplate; error?: string }> {
  try {
    if (isE2EMockMode()) {
      return {
        success: true,
        data: {
          id: `diet-ai-${Date.now()}`,
          parent_template_id: null,
          name: 'Menú de Hoy IA',
          target_kcal: 2200,
          target_protein: 165,
          target_carbs: 230,
          target_fats: 72,
          meals: [
            { id: 'e2e-m1', name: 'Desayuno', text: 'Huevos, avena y fruta', target_kcal: 600, target_protein: 35, target_carbs: 70, target_fats: 18 },
            { id: 'e2e-m2', name: 'Comida', text: 'Pechuga con arroz y verduras', target_kcal: 850, target_protein: 65, target_carbs: 90, target_fats: 20 },
            { id: 'e2e-m3', name: 'Cena', text: 'Salmón con patata y ensalada', target_kcal: 750, target_protein: 65, target_carbs: 70, target_fats: 34 },
          ],
        },
      };
    }

    const prompt = 
      `El usuario solicita un menú para HOY basándose en este contexto:\n` +
      `"${context}"\n\n` +
      `Tu rol: Nutricionista deportivo experto.\n` +
      `Devuelve únicamente un objeto que cumpla el esquema dietTemplateSchema.\n` +
      `Debe incluir:\n` +
      `- name: "Menú de Hoy IA"\n` +
      `- target_kcal (1200-4000)\n` +
      `- target_protein, target_carbs, target_fats (balanceados P*4+C*4+F*9 ~= kcal)\n` +
      `- meals: exactamente 3 o 4 comidas con id estable, name, text y macros por comida.\n` +
      `Prioriza alimentos cotidianos, cantidades claras y cero texto fuera del JSON.`;

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      system: 'Eres un nutricionista experto. Responde con JSON determinista y sin prosa.',
      prompt,
      schema: dietTemplateSchema,
      temperature: 0,
    });

    const rawObject = result.object as any;
    const sanitizedData: DietTemplate = {
      id: rawObject.id,
      name: rawObject.name || 'Plan Generado',
      target_kcal: Math.round(Number(rawObject.target_kcal || 2000)),
      target_protein: Math.round(Number(rawObject.target_protein || 150)),
      target_carbs: Math.round(Number(rawObject.target_carbs || 200)),
      target_fats: Math.round(Number(rawObject.target_fats || 70)),
      meals: Array.isArray(rawObject.meals)
        ? rawObject.meals.map((m: any, index: number) => ({
            id: m.id ? String(m.id) : `m-${index}-${Date.now()}`,
            name: m.name ? String(m.name) : `Comida ${index + 1}`,
            text: m.text ? String(m.text) : 'Alimentos generados',
            target_kcal: Math.round(Number(m.target_kcal || 0)),
            target_protein: Math.round(Number(m.target_protein || 0)),
            target_carbs: Math.round(Number(m.target_carbs || 0)),
            target_fats: Math.round(Number(m.target_fats || 0)),
          }))
        : [],
    };

    const parsed = dietTemplateSchema.safeParse(sanitizedData);
    if (!parsed.success) {
      const formattedErrors = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      return { success: false, error: `Error de validación del plan: ${formattedErrors}` };
    }

    return { success: true, data: parsed.data };
  } catch (err) {
    captureException(err, { area: 'nutrition', action: 'autocompleteDietWithAi', extra: { context } });
    console.error('autocompleteDietWithAi server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Fallo en generación' };
  }
}

export async function analyzeFoodImage(
  base64Image: string,
  mimeType: string
): Promise<{
  success: boolean;
  data?: {
    items: Array<{
      name: string;
      quantity_grams: number;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
  };
  error?: string;
}> {
  try {
    // Clean base64 header if present
    const base64Data = base64Image.includes(';base64,')
      ? base64Image.split(';base64,')[1]
      : base64Image;

    const systemPrompt =
      "Eres un nutricionista clínico. Analiza esta imagen. Extrae cada alimento visible o etiqueta nutricional. Devuelve un JSON estricto con un array items: [{ name: string, quantity_grams: number, calories: number, protein: number, carbs: number, fat: number }]. Si no estás seguro del peso exacto, haz una estimación experta basada en el tamaño de la ración estándar.";

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      schema: z.object({
        items: z.array(
          z.object({
            name: z.string(),
            quantity_grams: z.number(),
            calories: z.number(),
            protein: z.number(),
            carbs: z.number(),
            fat: z.number(),
          })
        ),
      }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: base64Data,
              mediaType: mimeType,
            },
            {
              type: 'text',
              text: 'Analiza esta imagen de comida y extrae la información nutricional.',
            },
          ],
        },
      ],
    });

    return { success: true, data: result.object };
  } catch (err) {
    console.error('analyzeFoodImage server action error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error al procesar la imagen con IA.',
    };
  }
}

export async function scanDietPhotoWithAi(
  base64Image: string,
  mimeType: string,
  context = ''
): Promise<{
  success: boolean;
  data?: {
    weekly_plan_id: string;
    recipes_created: number;
    templates_created: number;
    structured: z.infer<typeof scannedDietImportSchema>;
  };
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Usuario no autenticado.' };
    }

    const base64Data = base64Image.includes(';base64,')
      ? base64Image.split(';base64,')[1]
      : base64Image;

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      temperature: 0,
      system:
        'Eres un dietista clínico experto en digitalizar dietas escritas o impresas. Debes reconstruir recetas, días base y una semana completa en JSON estricto. Nunca escribas prosa fuera del esquema. Si un dato exacto no aparece, estima con criterio profesional y mantenlo coherente.',
      schema: scannedDietImportSchema,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: base64Data,
              mediaType: mimeType,
            },
            {
              type: 'text',
              text:
                `Digitaliza esta dieta en papel y conviértela en recetas reutilizables, plantillas diarias y un plan semanal completo. ${context.trim()}`.trim() +
                ' Usa nombres de comidas naturales en español. En ingredients_json devuelve cantidad, unidad y macros por ingrediente. En instructions resume la preparación real de cada receta. Si el documento tiene estructura por días, respétala al formar weekly_plan.days.',
            },
          ],
        },
      ],
    });

    const parsed = scannedDietImportSchema.safeParse(result.object);
    if (!parsed.success) {
      return { success: false, error: 'La IA no devolvió una estructura clínica válida.' };
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc('import_scanned_diet_bundle', {
      payload: parsed.data,
    });

    if (rpcError) {
      throw rpcError;
    }

    return {
      success: true,
      data: {
        weekly_plan_id: String(rpcData?.weekly_plan_id ?? ''),
        recipes_created: Number(rpcData?.recipes_created ?? 0),
        templates_created: Number(rpcData?.templates_created ?? 0),
        structured: parsed.data,
      },
    };
  } catch (err) {
    console.error('scanDietPhotoWithAi error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'No se pudo digitalizar la dieta.',
    };
  }
}

export async function importDailyLogsBulk(
  entries: Array<{
    date: string;
    meals: Array<{ hora: string; descripcion: string; calidad_nutricional: 'buena' | 'regular' | 'mala' }>;
    total_kcal: number;
    protein_g: number;
    carbs_g: number;
    fats_g: number;
    water_ml: number;
  }>
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    if (!entries || entries.length === 0) {
      return { success: false, error: 'No hay registros para importar.' };
    }

    // Extract all dates to query existing daily logs in one go
    const dates = entries.map(e => e.date);

    // Fetch existing logs for these dates to merge metadata
    const { data: existingLogs, error: fetchError } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .in('date', dates);

    if (fetchError) {
      console.warn(`[Supabase Fetch Warning] importDailyLogsBulk fetch: ${fetchError.message}`);
    }

    const existingLogsMap = new Map<string, any>();
    if (existingLogs) {
      existingLogs.forEach(row => {
        existingLogsMap.set(row.date, row);
      });
    }

    const rowsToUpsert = entries.map(entry => {
      const existing = existingLogsMap.get(entry.date);
      const existingAiData = existing?.ai_data || {};

      const newAiData: any = {
        date: entry.date,
        comidas: entry.meals,
        hidratacion_ml: entry.water_ml,
        toxinas: existingAiData.toxinas || [],
        bio_avatar: existingAiData.bio_avatar || {
          estado_fisiologico: 'Estable',
          energia_fisica: 3,
          claridad_mental: 3,
        },
        metricas: existingAiData.metricas || {
          variacion_inercia: 0,
          aciertos: [],
          error_clave: 'ninguno',
          accion_manana: 'Ninguna',
        },
        water_ml: entry.water_ml,
        total_kcal: entry.total_kcal,
        protein_g: entry.protein_g,
        carbs_g: entry.carbs_g,
        fats_g: entry.fats_g,
        habits_count: existingAiData.habits_count || {},
        propuestas_habitos: existingAiData.propuestas_habitos || [],
      };

      return {
        user_id: user.id,
        date: entry.date,
        health_momentum: existing?.health_momentum ?? 50,
        ai_data: newAiData,
        habit_tracking: existing?.habit_tracking ?? [],
      };
    });

    const { error: upsertError } = await supabase
      .from('daily_logs')
      .upsert(rowsToUpsert, { onConflict: 'user_id,date' });

    if (upsertError) {
      console.error('[Supabase] Error bulk upserting daily_logs:', upsertError.message);
      return { success: false, error: `Error en base de datos: ${upsertError.message}` };
    }

    return { success: true, count: rowsToUpsert.length };
    return { success: true, count: rowsToUpsert.length };
  } catch (err) {
    console.error('importDailyLogsBulk server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado al importar.' };
  }
}

// ── Recipe Actions ──────────────────────────────────────────────────────────
import { recipeSchema, ingredientItemSchema, type Recipe, type DietProgram, type DailyDietOverride, dietProgramSchema, dailyDietOverrideSchema, weeklyPlanSchema, weeklyPlanDaySchema, type WeeklyPlan, type WeeklyPlanDay } from '@/lib/schema';

export async function getRecipes(): Promise<Recipe[]> {
  try {
    if (isE2EMockMode()) {
      return [];
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      console.warn(`[Supabase Fetch Warning] Tabla recipes: ${error.message}`);
      return [];
    }

    return (data || []).map(row => {
      // Parse ingredients_json if it comes as a string or keep if it is already parsed object
      const ingredients = typeof row.ingredients_json === 'string'
        ? JSON.parse(row.ingredients_json)
        : row.ingredients_json;
      return {
        id: row.id,
        name: row.name,
        ingredients_json: ingredients,
        instructions: row.instructions || '',
        total_kcal: row.total_kcal,
        total_protein: row.total_protein,
        total_carbs: row.total_carbs,
        total_fats: row.total_fats,
      };
    });
  } catch (err) {
    captureException(err, { area: 'nutrition', action: 'getRecipes' });
    console.error('getRecipes server action error:', err);
    return [];
  }
}

export async function saveRecipe(recipe: Recipe): Promise<{ success: boolean; data?: Recipe; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const parsed = recipeSchema.safeParse(recipe);
    if (!parsed.success) {
      return { success: false, error: 'Estructura de receta inválida.' };
    }

    const recipeData = {
      user_id: user.id,
      name: parsed.data.name,
      ingredients_json: parsed.data.ingredients_json,
      instructions: parsed.data.instructions || '',
      total_kcal: parsed.data.total_kcal,
      total_protein: parsed.data.total_protein,
      total_carbs: parsed.data.total_carbs,
      total_fats: parsed.data.total_fats,
    };

    let result;
    if (parsed.data.id) {
      result = await supabase
        .from('recipes')
        .update(recipeData)
        .eq('id', parsed.data.id)
        .eq('user_id', user.id)
        .select('*')
        .single();
    } else {
      result = await supabase
        .from('recipes')
        .insert(recipeData)
        .select('*')
        .single();
    }

    if (result.error) throw result.error;

    return {
      success: true,
      data: {
        id: result.data.id,
        name: result.data.name,
        ingredients_json: typeof result.data.ingredients_json === 'string'
          ? JSON.parse(result.data.ingredients_json)
          : result.data.ingredients_json,
        instructions: result.data.instructions || '',
        total_kcal: result.data.total_kcal,
        total_protein: result.data.total_protein,
        total_carbs: result.data.total_carbs,
        total_fats: result.data.total_fats,
      }
    };
  } catch (err) {
    console.error('saveRecipe server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

const recipeAiSchema = z.object({
  name: z.string().min(1).max(100),
  ingredients_json: z.array(ingredientItemSchema).min(1).max(30),
  instructions: z.string().min(12).describe('Instrucciones paso a paso de la preparación.'),
  total_kcal: z.number().min(0),
  total_protein: z.number().min(0),
  total_carbs: z.number().min(0),
  total_fats: z.number().min(0),
});

export async function autocompleteRecipeWithAi(context: string): Promise<{ success: boolean; data?: Recipe; error?: string }> {
  try {
    if (!context.trim()) {
      return { success: false, error: 'Describe la receta o los ingredientes.' };
    }

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      temperature: 0,
      system:
        'Eres un dietista clínico. Devuelve solo datos estructurados. Estima macros por ingrediente con valores realistas para la cantidad indicada.',
      prompt:
        `Estructura esta receta en español: "${context}". ` +
        'Si no hay nombre, crea uno breve. Usa unidades g, ml o unidad. Calcula totales sumando ingredientes. ' +
        'Incluye instrucciones claras de preparación en pasos cortos, con timing, orden y textura esperada.',
      schema: recipeAiSchema,
    });

    const parsed = recipeSchema.safeParse({
      ...result.object,
      ingredients_json: result.object.ingredients_json.map((ingredient) => ({
        name: ingredient.name,
        amount: Math.round(Number(ingredient.amount || 0)),
        unit: ingredient.unit || 'g',
        kcal: Math.round(Number(ingredient.kcal || 0)),
        protein: Math.round(Number(ingredient.protein || 0)),
        carbs: Math.round(Number(ingredient.carbs || 0)),
        fats: Math.round(Number(ingredient.fats || 0)),
      })),
      total_kcal: Math.round(Number(result.object.total_kcal || 0)),
      total_protein: Math.round(Number(result.object.total_protein || 0)),
      total_carbs: Math.round(Number(result.object.total_carbs || 0)),
      total_fats: Math.round(Number(result.object.total_fats || 0)),
    });

    if (!parsed.success) {
      return { success: false, error: 'La IA devolvió una receta incompleta.' };
    }

    return { success: true, data: parsed.data };
  } catch (err) {
    console.error('autocompleteRecipeWithAi error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error IA al rellenar receta.' };
  }
}

export async function generateFullDayTemplateWithAi(context: string): Promise<{ success: boolean; data?: DietTemplate; error?: string }> {
  try {
    if (!context.trim()) {
      return { success: false, error: 'Describe qué tipo de día quieres generar.' };
    }

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      temperature: 0,
      system:
        'Eres un dietista clínico. Devuelve solo un objeto JSON válido para una plantilla diaria. No incluyas prosa.',
      prompt:
        `Genera un Día Base completo para este objetivo: "${context}". ` +
        'Incluye 3 o 4 comidas tipo receta completa para desayuno, comida, merienda opcional y cena. ' +
        'En cada meal.text escribe ingredientes con cantidades y una mini preparación accionable. ' +
        'Calcula macros por comida y totales coherentes.',
      schema: dietTemplateSchema,
    });

    const rawObject = result.object;
    const sanitizedTemplate: DietTemplate = {
      id: rawObject.id,
      parent_template_id: rawObject.parent_template_id ?? null,
      name: rawObject.name || `Día IA - ${context.slice(0, 32)}`,
      target_kcal: Math.round(Number(rawObject.target_kcal || 2000)),
      target_protein: Math.round(Number(rawObject.target_protein || 140)),
      target_carbs: Math.round(Number(rawObject.target_carbs || 220)),
      target_fats: Math.round(Number(rawObject.target_fats || 65)),
      meals: rawObject.meals.map((meal, index) => ({
        id: meal.id ? String(meal.id) : `ai-meal-${index + 1}-${Date.now()}`,
        name: meal.name,
        text: meal.text,
        target_kcal: Math.round(Number(meal.target_kcal || 0)),
        target_protein: Math.round(Number(meal.target_protein || 0)),
        target_carbs: Math.round(Number(meal.target_carbs || 0)),
        target_fats: Math.round(Number(meal.target_fats || 0)),
        recipe_id: meal.recipe_id,
      })),
    };

    const parsed = dietTemplateSchema.safeParse(sanitizedTemplate);
    if (!parsed.success) {
      return { success: false, error: 'La IA devolvió un Día Base incompleto.' };
    }

    return { success: true, data: parsed.data };
  } catch (err) {
    console.error('generateFullDayTemplateWithAi error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error IA al generar el Día Base.' };
  }
}

export async function deleteRecipe(recipeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting recipe:', error.message);
      return { success: false, error: 'Error al eliminar en base de datos.' };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteRecipe server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

// ── Diet Program Actions (Microcycles) ───────────────────────────────────────
export async function getActiveDietProgram(): Promise<{ program: DietProgram | null; days: Array<{ day_number: number; template_id: string }> }> {
  try {
    if (isE2EMockMode()) {
      return { program: null, days: [] };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { program: null, days: [] };

    // Fetch active program
    const { data: programData, error: programError } = await supabase
      .from('diet_programs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (programError) {
      console.warn(`[Supabase Fetch Warning] getActiveDietProgram: ${programError.message}`);
      return { program: null, days: [] };
    }

    if (!programData) return { program: null, days: [] };

    // Fetch program days
    const { data: daysData, error: daysError } = await supabase
      .from('diet_program_days')
      .select('day_number, template_id')
      .eq('program_id', programData.id)
      .order('day_number', { ascending: true });

    if (daysError) {
      console.warn(`[Supabase Fetch Warning] diet_program_days: ${daysError.message}`);
      return { program: programData, days: [] };
    }

    return {
      program: {
        id: programData.id,
        name: programData.name,
        start_date: programData.start_date,
        microcycle_length: programData.microcycle_length,
        is_active: programData.is_active,
      },
      days: daysData || []
    };
  } catch (err) {
    captureException(err, { area: 'nutrition', action: 'getActiveDietProgram' });
    console.error('getActiveDietProgram server action error:', err);
    return { program: null, days: [] };
  }
}

export async function saveDietProgram(
  program: DietProgram,
  days: Array<{ day_number: number; template_id: string }>
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const parsedProgram = dietProgramSchema.safeParse(program);
    if (!parsedProgram.success) {
      return { success: false, error: 'Estructura de programa inválida.' };
    }

    // Deactivate existing programs for this user if this program is active
    if (parsedProgram.data.is_active) {
      await supabase
         .from('diet_programs')
         .update({ is_active: false })
         .eq('user_id', user.id);
    }

    const programData = {
      user_id: user.id,
      name: parsedProgram.data.name,
      start_date: parsedProgram.data.start_date,
      microcycle_length: parsedProgram.data.microcycle_length,
      is_active: parsedProgram.data.is_active,
    };

    let pId: string;
    if (parsedProgram.data.id) {
      const { data, error } = await supabase
         .from('diet_programs')
         .update(programData)
         .eq('id', parsedProgram.data.id)
         .eq('user_id', user.id)
         .select('id')
         .single();
      if (error) throw error;
      pId = data.id;
    } else {
      const { data, error } = await supabase
         .from('diet_programs')
         .insert(programData)
         .select('id')
         .single();
      if (error) throw error;
      pId = data.id;
    }

    // Clear old days for this program and insert new ones
    await supabase.from('diet_program_days').delete().eq('program_id', pId);

    if (days && days.length > 0) {
      const daysToInsert = days.map(d => ({
        program_id: pId,
        day_number: d.day_number,
        template_id: d.template_id,
      }));

      const { error: daysError } = await supabase
         .from('diet_program_days')
         .insert(daysToInsert);

      if (daysError) throw daysError;
    }

    return { success: true, data: { id: pId } };
  } catch (err) {
    console.error('saveDietProgram server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

export async function deleteDietProgram(programId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const { error } = await supabase
      .from('diet_programs')
      .delete()
      .eq('id', programId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting program:', error.message);
      return { success: false, error: 'Error al eliminar en base de datos.' };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteDietProgram server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

// ── Daily Diet Overrides Actions (Micro-management) ─────────────────────────
export async function getDailyDietOverrides(startDate: string, endDate: string): Promise<DailyDietOverride[]> {
  try {
    if (isE2EMockMode()) {
      return [];
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('daily_diet_overrides')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (error) {
      console.warn(`[Supabase Fetch Warning] Tabla daily_diet_overrides: ${error.message}`);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      date: row.date,
      custom_diet: typeof row.custom_diet === 'string' ? JSON.parse(row.custom_diet) : row.custom_diet,
      total_kcal: row.total_kcal,
      total_protein: row.total_protein,
      total_carbs: row.total_carbs,
      total_fats: row.total_fats,
    }));
  } catch (err) {
    captureException(err, { area: 'nutrition', action: 'getDailyDietOverrides', extra: { startDate, endDate } });
    console.error('getDailyDietOverrides server action error:', err);
    return [];
  }
}

export async function saveDailyDietOverride(override: DailyDietOverride): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const parsed = dailyDietOverrideSchema.safeParse(override);
    if (!parsed.success) {
      return { success: false, error: 'Estructura de excepción inválida.' };
    }

    const overrideData = {
      user_id: user.id,
      date: parsed.data.date,
      custom_diet: parsed.data.custom_diet,
      total_kcal: parsed.data.total_kcal,
      total_protein: parsed.data.total_protein,
      total_carbs: parsed.data.total_carbs,
      total_fats: parsed.data.total_fats,
    };

    const { error } = await supabase
      .from('daily_diet_overrides')
      .upsert(overrideData, { onConflict: 'user_id,date' });

    if (error) throw error;

    return { success: true };
  } catch (err) {
    console.error('saveDailyDietOverride server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

export async function deleteDailyDietOverride(date: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const { error } = await supabase
      .from('daily_diet_overrides')
      .delete()
      .eq('date', date)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting daily override:', error.message);
      return { success: false, error: 'Error al eliminar override en base de datos.' };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteDailyDietOverride server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

// ── Analytics & Correlation Insights Actions ──────────────────────────────────
import { generateText } from 'ai';

export async function getHealthCorrelationData(): Promise<{
  success: boolean;
  data: Array<{
    date: string;
    dayLabel: string;
    valence: number;
    kcalPercent: number;
    kcalConsumed: number;
    kcalTarget: number;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, data: [], error: 'No autenticado.' };

    // Generate last 7 days dates in YYYY-MM-DD
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }

    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    // Fetch daily logs
    const { data: logs, error: logsError } = await supabase
      .from('daily_logs')
      .select('date, ai_data')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (logsError) {
      console.warn(`[Supabase Fetch Warning] getHealthCorrelationData logs: ${logsError.message}`);
    }

    // Fetch mood logs
    const { data: moods, error: moodsError } = await supabase
      .from('mood_logs')
      .select('date, valence_score, mood_score')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (moodsError) {
      console.warn(`[Supabase Fetch Warning] getHealthCorrelationData moods: ${moodsError.message}`);
    }

    // Default values
    const metadata = user.user_metadata || {};
    const defaultKcal = Number(metadata.daily_kcal_target ?? 2000);

    const logsMap = new Map<string, any>();
    (logs || []).forEach(l => {
      const aiData = typeof l.ai_data === 'string' ? JSON.parse(l.ai_data) : l.ai_data;
      logsMap.set(l.date, aiData);
    });

    const moodsMap = new Map<string, number[]>();
    (moods || []).forEach(m => {
      const valence = m.valence_score ?? m.mood_score ?? 3;
      const list = moodsMap.get(m.date) || [];
      list.push(Number(valence));
      moodsMap.set(m.date, list);
    });

    const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const correlationData = dates.map(dateStr => {
      const d = new Date(dateStr + 'T12:00:00');
      const dayLabel = `${weekdayNames[d.getDay()]} ${d.getDate()}`;

      // Mood valence average
      const valences = moodsMap.get(dateStr);
      const valence = valences && valences.length > 0 
        ? Math.round((valences.reduce((acc, v) => acc + v, 0) / valences.length) * 10) / 10 
        : 3.0; // baseline

      // Calorie stats
      const log = logsMap.get(dateStr);
      const kcalConsumed = log?.total_kcal ?? 0;
      const kcalTarget = log?.target_kcal ?? defaultKcal;
      const kcalPercent = kcalTarget > 0 ? Math.min(150, Math.round((kcalConsumed / kcalTarget) * 100)) : 0;

      return {
        date: dateStr,
        dayLabel,
        valence,
        kcalPercent,
        kcalConsumed,
        kcalTarget
      };
    });

    return { success: true, data: correlationData };
  } catch (err) {
    console.error('getHealthCorrelationData error:', err);
    return { success: false, data: [], error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

export async function generateHealthInsights(
  data: Array<{
    date: string;
    dayLabel: string;
    valence: number;
    kcalPercent: number;
    kcalConsumed: number;
    kcalTarget: number;
  }>
): Promise<{ success: boolean; insight?: string; error?: string }> {
  try {
    if (!data || data.length === 0) {
      return { success: false, error: 'No hay datos de correlación disponibles.' };
    }

    const dataString = data.map(d => 
      `${d.dayLabel} (${d.date}): Estado de ánimo (Valence)=${d.valence}/5, Calorías consumidas=${d.kcalConsumed} kcal (${d.kcalPercent}% de la meta de ${d.kcalTarget} kcal).`
    ).join('\n');

    const prompt = 
      `Analiza la relación entre el estado de ánimo diario del usuario (escala 1 a 5, donde 5 es óptimo y 1 es crítico) y su adherencia a la meta calórica en los últimos 7 días:\n\n` +
      `${dataString}\n\n` +
      `Tu rol: Coach fisiológico y nutricionista clínico de élite.\n` +
      `Genera un único párrafo de análisis en español que responda exactamente a las siguientes directrices:\n` +
      `- Redacta un máximo de 3 líneas.\n` +
      `- Concluye si se observa una mejoría en el ánimo al cumplir con la alimentación (o viceversa).\n` +
      `- Ofrece una recomendación práctica, empática y de bio-hackeo directo.\n` +
      `- No uses viñetas, listas ni títulos.`;

    const result = await generateText({
      model: google('gemini-2.5-flash'),
      system: 'Eres un coach fisiológico clínico experto en analizar hábitos y dar sugerencias de estilo de vida de forma extremadamente concisa (máximo 3 líneas).',
      prompt,
    });

    return { success: true, insight: result.text.trim() };
  } catch (err) {
    console.error('generateHealthInsights error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado al generar insights.' };
  }
}

// ── Task 94: Weekly Plan Actions ─────────────────────────────────────────────

export async function getWeeklyPlans(): Promise<WeeklyPlan[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn(`[Supabase Fetch Warning] weekly_plans: ${error.message}`);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      is_active: row.is_active,
    }));
  } catch (err) {
    console.error('getWeeklyPlans error:', err);
    return [];
  }
}

export async function getWeeklyPlanDetails(planId: string): Promise<{
  plan: WeeklyPlan | null;
  days: Array<{ day_of_week: number; template_id: string }>;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { plan: null, days: [] };

    const { data: planData, error: planError } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('id', planId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (planError || !planData) return { plan: null, days: [] };

    const { data: daysData, error: daysError } = await supabase
      .from('weekly_plan_days')
      .select('day_of_week, template_id')
      .eq('weekly_plan_id', planId)
      .order('day_of_week', { ascending: true });

    if (daysError) {
      console.warn(`[Supabase] weekly_plan_days fetch: ${daysError.message}`);
    }

    return {
      plan: { id: planData.id, name: planData.name, is_active: planData.is_active },
      days: daysData || [],
    };
  } catch (err) {
    console.error('getWeeklyPlanDetails error:', err);
    return { plan: null, days: [] };
  }
}

export async function saveWeeklyPlan(
  plan: WeeklyPlan,
  days: Array<{ day_of_week: number; template_id: string }>
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const parsed = weeklyPlanSchema.safeParse(plan);
    if (!parsed.success) {
      return { success: false, error: 'Estructura de plan semanal inválida.' };
    }

    // If activating this plan, deactivate others
    if (parsed.data.is_active) {
      await supabase
        .from('weekly_plans')
        .update({ is_active: false })
        .eq('user_id', user.id);
    }

    const planData = {
      user_id: user.id,
      name: parsed.data.name,
      is_active: parsed.data.is_active,
    };

    let pId: string;
    if (parsed.data.id) {
      const { data, error } = await supabase
        .from('weekly_plans')
        .update(planData)
        .eq('id', parsed.data.id)
        .eq('user_id', user.id)
        .select('id')
        .single();
      if (error) throw error;
      pId = data.id;
    } else {
      const { data, error } = await supabase
        .from('weekly_plans')
        .insert(planData)
        .select('id')
        .single();
      if (error) throw error;
      pId = data.id;
    }

    // Clear old days and insert new ones
    await supabase.from('weekly_plan_days').delete().eq('weekly_plan_id', pId);

    if (days && days.length > 0) {
      const daysToInsert = days.map(d => ({
        user_id: user.id,
        weekly_plan_id: pId,
        day_of_week: d.day_of_week,
        template_id: d.template_id,
      }));

      const { error: daysError } = await supabase
        .from('weekly_plan_days')
        .insert(daysToInsert);

      if (daysError) throw daysError;
    }

    return { success: true, data: { id: pId } };
  } catch (err) {
    console.error('saveWeeklyPlan error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

export async function deleteWeeklyPlan(planId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const { error } = await supabase
      .from('weekly_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting weekly plan:', error.message);
      return { success: false, error: 'Error al eliminar en base de datos.' };
    }

    return { success: true };
  } catch (err) {
    console.error('deleteWeeklyPlan error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

// ── Task 94: Calendar Projection Actions ─────────────────────────────────────

export async function projectWeeklyPlanToCalendar(
  weeklyPlanId: string,
  startDate: string,
  weeksCount: number
): Promise<{ success: boolean; daysProjected?: number; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const start = new Date(startDate + 'T00:00:00');
    if (Number.isNaN(start.getTime())) {
      return { success: false, error: 'Fecha de inicio inválida.' };
    }
    if (start.getDay() !== 1) {
      return { success: false, error: 'Elige un lunes como fecha de inicio.' };
    }

    const safeWeeksCount = Math.min(52, Math.max(1, Math.floor(weeksCount)));
    const formatLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Fetch the weekly plan days mapping
    const { data: planDays, error: planDaysError } = await supabase
      .from('weekly_plan_days')
      .select('day_of_week, template_id')
      .eq('weekly_plan_id', weeklyPlanId)
      .eq('user_id', user.id);

    if (planDaysError || !planDays || planDays.length === 0) {
      return { success: false, error: 'No se encontraron días en el plan semanal.' };
    }

    const planDaysMap = new Map<number, string>();
    planDays.forEach(d => planDaysMap.set(d.day_of_week, d.template_id));

    // Calculate all dates to project
    const rowsToInsert: Array<{
      user_id: string;
      date: string;
      weekly_plan_id: string;
      template_id: string;
      day_of_week: number;
    }> = [];

    for (let week = 0; week < safeWeeksCount; week++) {
      for (let dow = 1; dow <= 7; dow++) {
        const templateId = planDaysMap.get(dow);
        if (!templateId) continue;

        const currentDate = new Date(start);
        currentDate.setDate(currentDate.getDate() + (week * 7) + (dow - 1));
        const dateStr = formatLocalDate(currentDate);

        rowsToInsert.push({
          user_id: user.id,
          date: dateStr,
          weekly_plan_id: weeklyPlanId,
          template_id: templateId,
          day_of_week: dow,
        });
      }
    }

    if (rowsToInsert.length === 0) {
      return { success: false, error: 'No hay días para proyectar.' };
    }

    // Upsert into user_diet_calendar (for UI compatibility) AND insert into projections table
    const calendarRows = rowsToInsert.map(r => ({
      user_id: r.user_id,
      date: r.date,
      template_id: r.template_id,
    }));

    const { error: calendarError } = await supabase
      .from('user_diet_calendar')
      .upsert(calendarRows, { onConflict: 'user_id,date' });

    if (calendarError) {
      console.error('Error upserting calendar:', calendarError.message);
      return { success: false, error: `Error en calendario: ${calendarError.message}` };
    }

    // Also insert into projections table for tracking
    const { error: projectionError } = await supabase
      .from('user_diet_calendar_projections')
      .upsert(rowsToInsert, { onConflict: 'user_id,date' });

    if (projectionError) {
      console.error('Error upserting projections:', projectionError.message);
      // Non-fatal: calendar is the source of truth for UI
    }

    return { success: true, daysProjected: rowsToInsert.length };
  } catch (err) {
    console.error('projectWeeklyPlanToCalendar error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado al proyectar.' };
  }
}

export async function getActiveWeeklyPlan(): Promise<{
  plan: WeeklyPlan | null;
  days: Array<{ day_of_week: number; template_id: string }>;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { plan: null, days: [] };

    const { data: planData, error: planError } = await supabase
      .from('weekly_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (planError || !planData) return { plan: null, days: [] };

    const { data: daysData, error: daysError } = await supabase
      .from('weekly_plan_days')
      .select('day_of_week, template_id')
      .eq('weekly_plan_id', planData.id)
      .order('day_of_week', { ascending: true });

    if (daysError) {
      console.warn(`[Supabase] active weekly_plan_days: ${daysError.message}`);
    }

    return {
      plan: { id: planData.id, name: planData.name, is_active: planData.is_active },
      days: daysData || [],
    };
  } catch (err) {
    console.error('getActiveWeeklyPlan error:', err);
    return { plan: null, days: [] };
  }
}
