import { z } from 'zod';

export const mealItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  text: z.string().max(2000),
  target_kcal: z.number().min(0).max(5000),
  target_protein: z.number().min(0).max(300),
  target_carbs: z.number().min(0).max(500),
  target_fats: z.number().min(0).max(200),
  recipe_id: z.string().uuid().optional(),
});

export const dietTemplateSchema = z.object({
  id: z.string().uuid().optional(),
  parent_template_id: z.string().uuid().nullable().optional(),
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

export const ingredientItemSchema = z.object({
  name: z.string().min(1),
  amount: z.number().min(0),
  unit: z.string().default('g'),
  kcal: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fats: z.number().min(0),
});

export const recipeSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  ingredients_json: z.array(ingredientItemSchema).default([]),
  instructions: z.string().default(''),
  total_kcal: z.number().min(0),
  total_protein: z.number().min(0),
  total_carbs: z.number().min(0),
  total_fats: z.number().min(0),
});

export const dietProgramSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  start_date: z.string(), // YYYY-MM-DD
  microcycle_length: z.number().int().min(1).max(365),
  is_active: z.boolean().default(true),
});

export const dietProgramDaySchema = z.object({
  id: z.string().uuid().optional(),
  program_id: z.string().uuid(),
  day_number: z.number().int().min(1),
  template_id: z.string().uuid(),
});

export const dailyDietOverrideSchema = z.object({
  id: z.string().uuid().optional(),
  date: z.string(), // YYYY-MM-DD
  custom_diet: dietTemplateSchema,
  total_kcal: z.number().min(0),
  total_protein: z.number().min(0),
  total_carbs: z.number().min(0),
  total_fats: z.number().min(0),
});

export type IngredientItem = z.infer<typeof ingredientItemSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type DietProgram = z.infer<typeof dietProgramSchema>;
export type DietProgramDay = z.infer<typeof dietProgramDaySchema>;
export type DailyDietOverride = z.infer<typeof dailyDietOverrideSchema>;

// ── Task 94: Relational UX Types ─────────────────────────────────────────────

export const dailyTemplateRecipeSchema = z.object({
  id: z.string().uuid().optional(),
  daily_template_id: z.string().uuid(),
  recipe_id: z.string().uuid(),
  meal_type: z.enum(['Desayuno', 'Almuerzo', 'Cena', 'Snacks', 'Brunch', 'Merienda', 'Post-Entreno', 'Cena Libre', 'Comida Extra']),
});

export const weeklyPlanSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  is_active: z.boolean().default(false),
});

export const weeklyPlanDaySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  weekly_plan_id: z.string().uuid(),
  day_of_week: z.number().int().min(1).max(7),
  template_id: z.string().uuid(),
});

export type DailyTemplateRecipe = z.infer<typeof dailyTemplateRecipeSchema>;
export type WeeklyPlan = z.infer<typeof weeklyPlanSchema>;
export type WeeklyPlanDay = z.infer<typeof weeklyPlanDaySchema>;

export const dailyLogSchema = z
  .object({
    date: z.string().optional(),
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
        aciertos: z.array(z.string()).default([]),
        error_clave: z.string().optional().or(z.literal('')).default('ninguno'),
        accion_manana: z.string().optional().or(z.literal('')).default('Ninguna'),
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
    alimentos_registrados: z
      .array(
        z.object({
          id: z.string(),
          nombre: z.string(),
          gramos: z.number(),
          kcal: z.number(),
          proteinas: z.number(),
          carbohidratos: z.number(),
          grasas: z.number(),
        })
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

export const moodEntrySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  date: z.string().optional(), // YYYY-MM-DD
  mood_score: z.number().int().min(1).max(5).optional(),
  valence_score: z.number().min(1).max(5).optional(),
  impact_factors: z.array(z.string()).optional(),
  impact_tags: z.array(z.string()).optional(),
  logged_at: z.string().optional(),
  created_at_timestamp: z.string().optional(),
  is_daily_summary: z.boolean().optional().default(false),
});

export type MoodEntry = z.infer<typeof moodEntrySchema>;
