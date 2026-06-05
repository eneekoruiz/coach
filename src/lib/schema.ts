import { z } from 'zod';

export const mealItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  text: z.string().max(2000),
  target_kcal: z.number().min(0).max(5000),
  target_protein: z.number().min(0).max(300),
  target_carbs: z.number().min(0).max(500),
  target_fats: z.number().min(0).max(200),
});

export const dietTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  target_kcal: z.number().min(500).max(10000),
  target_protein: z.number().min(0).max(500),
  target_carbs: z.number().min(0).max(1000),
  target_fats: z.number().min(0).max(300),
  meals: z.array(mealItemSchema),
});

export type MealItem = z.infer<typeof mealItemSchema>;
export type DietTemplate = z.infer<typeof dietTemplateSchema>;

export const defaultTemplate: DietTemplate = {
  name: 'Nueva Plantilla',
  target_kcal: 2000,
  target_protein: 150,
  target_carbs: 200,
  target_fats: 70,
  meals: [
    { id: 'm1', name: 'Desayuno', text: '', target_kcal: 0, target_protein: 0, target_carbs: 0, target_fats: 0 },
    { id: 'm2', name: 'Almuerzo', text: '', target_kcal: 0, target_protein: 0, target_carbs: 0, target_fats: 0 },
    { id: 'm3', name: 'Cena', text: '', target_kcal: 0, target_protein: 0, target_carbs: 0, target_fats: 0 },
  ],
};

export const dailyLogSchema = z
  .object({
    comidas: z
      .array(
        z
          .object({
            hora: z.string().min(1),
            descripcion: z.string().min(1),
            calidad_nutricional: z.enum(['buena', 'regular', 'mala']),
          })
          .strict()
      )
      .min(0),
    hidratacion_ml: z.preprocess((val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.round(num));
    }, z.number().int().nonnegative()),
    toxinas: z.array(z.string().min(1)),
    bio_avatar: z
      .object({
        estado_fisiologico: z.string().min(1),
        energia_fisica: z.preprocess((val) => {
          const num = Number(val);
          return isNaN(num) ? 3 : Math.min(5, Math.max(1, Math.round(num)));
        }, z.number().int().min(1).max(5)),
        claridad_mental: z.preprocess((val) => {
          const num = Number(val);
          return isNaN(num) ? 3 : Math.min(5, Math.max(1, Math.round(num)));
        }, z.number().int().min(1).max(5)),
      })
      .strict(),
    metricas: z
      .object({
        variacion_inercia: z.preprocess((val) => {
          const num = Number(val);
          return isNaN(num) ? 0 : Math.round(num);
        }, z.number().int()),
        aciertos: z.array(z.string().min(1)),
        error_clave: z.string().min(1),
        accion_manana: z.string().min(1),
      })
      .strict(),
    water_ml: z.preprocess((val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.round(num));
    }, z.number().int().nonnegative()),
    total_kcal: z.preprocess((val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.round(num));
    }, z.number().int().nonnegative()),
    protein_g: z.preprocess((val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.round(num));
    }, z.number().int().nonnegative()),
    carbs_g: z.preprocess((val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.round(num));
    }, z.number().int().nonnegative()),
    fats_g: z.preprocess((val) => {
      const num = Number(val);
      return isNaN(num) ? 0 : Math.max(0, Math.round(num));
    }, z.number().int().nonnegative()),
    habits_count: z.record(
      z.string(),
      z.preprocess((val) => {
        const num = Number(val);
        return isNaN(num) ? 0 : Math.max(0, Math.round(num));
      }, z.number().int().nonnegative())
    ),
    propuestas_habitos: z
      .array(
        z
          .object({
            nombre: z.string().min(1),
            tipo: z.enum(['positive', 'negative']),
          })
          .strict()
      )
      .optional(),
  })
  .strict();

export type DailyLog = z.infer<typeof dailyLogSchema>;

export const endOfDaySchema = z
  .object({
    puntuacion_global: z.number().int().min(0).max(100),
    aciertos: z.array(z.string().min(1)).length(3),
    error_clave: z.string().min(1),
    accion_manana: z.string().min(1),
    prompt_imagen: z.string().min(1),
  })
  .strict();

export type EndOfDaySummary = z.infer<typeof endOfDaySchema>;

// ─── Mood Tracker ───────────────────────────────────────────────────────────

export const moodEntrySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  date: z.string().optional(), // YYYY-MM-DD
  mood_score: z.number().int().min(1).max(5),
  impact_factors: z.array(z.string()),
});

export type MoodEntry = z.infer<typeof moodEntrySchema>;
