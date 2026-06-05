'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { dailyLogSchema } from '@/lib/schema';
import { z } from 'zod';

import { dietTemplateSchema, type DietTemplate, defaultTemplate } from '@/lib/schema';

export async function getDietTemplates(): Promise<DietTemplate[]> {
  try {
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
    console.error('getDietTemplates server action error:', err);
    return [];
  }
}

export async function saveDietTemplate(template: DietTemplate): Promise<{ success: boolean; data?: DietTemplate; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Usuario no autenticado.' };

    const parsed = dietTemplateSchema.safeParse(template);
    if (!parsed.success) {
      return { success: false, error: 'Estructura de plantilla inválida.' };
    }

    const templateData = {
      user_id: user.id,
      name: parsed.data.name,
      target_kcal: parsed.data.target_kcal,
      target_protein: parsed.data.target_protein,
      target_carbs: parsed.data.target_carbs,
      target_fats: parsed.data.target_fats,
      meals: parsed.data.meals,
    };

    let result;
    if (parsed.data.id) {
      result = await supabase
        .from('diet_templates')
        .update(templateData)
        .eq('id', parsed.data.id)
        .eq('user_id', user.id)
        .select('*')
        .single();
    } else {
      result = await supabase
        .from('diet_templates')
        .insert(templateData)
        .select('*')
        .single();
    }

    if (result.error) {
      const errDetails = [
        result.error.message,
        result.error.code ? `code=${result.error.code}` : '',
        result.error.details ? `details=${result.error.details}` : '',
        result.error.hint ? `hint=${result.error.hint}` : '',
      ].filter(Boolean).join(' | ');
      console.error('[Supabase] Error saving diet template:', errDetails);
      return { success: false, error: `Error al guardar: ${result.error.message}` };
    }

    const responseParsed = dietTemplateSchema.safeParse(result.data);
    if (!responseParsed.success) {
       return { success: false, error: 'Error al parsear la respuesta del servidor.' };
    }

    return { success: true, data: responseParsed.data };
  } catch (err) {
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
    console.error('getDietCalendar server action error:', err);
    return [];
  }
}

export async function assignTemplateToDates(templateId: string, dates: string[]): Promise<{ success: boolean; error?: string }> {
  try {
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
    console.error('assignTemplateToDates server action error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Error inesperado.' };
  }
}

export async function autocompleteDietWithAi(context: string): Promise<{ success: boolean; data?: DietTemplate; error?: string }> {
  try {
    const prompt = 
      `El usuario actual solicita una plantilla nutricional dinámica basándose en este contexto:\n` +
      `"${context}"\n\n` +
      `Tu rol: Nutricionista deportivo experto.\n` +
      `Genera un objeto JSON que cumpla el esquema dietTemplateSchema.\n` +
      `Debe incluir:\n` +
      `- name (ej. Día de Pierna, Volumen, Descanso)\n` +
      `- target_kcal (1200-4000)\n` +
      `- target_protein, target_carbs, target_fats (balanceados P*4+C*4+F*9 ~= kcal)\n` +
      `- meals: Array de objetos con { id: "m1", name: "Desayuno", text: "descripción o alimentos" }\n\n` +
      `Haz las comidas variadas y creativas.`;

    const result = await generateObject({
      model: google('gemini-2.5-flash'),
      system: 'Eres un nutricionista experto y devuelves planes precisos en JSON.',
      prompt,
      schema: dietTemplateSchema,
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
      return { success: false, error: 'Fallo en generación' };
    }

    return { success: true, data: parsed.data };
  } catch (err) {
    console.error('autocompleteDietWithAi server action error:', err);
    return { success: false, error: 'Fallo en generación' };
  }
}
