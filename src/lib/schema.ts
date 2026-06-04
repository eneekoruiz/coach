import { z } from 'zod';

export const dailyDietTargetSchema = z.object({
  target_kcal: z.number().int().min(500).max(10000),
  target_protein: z.number().int().min(0).max(500),
  target_carbs: z.number().int().min(0).max(1000),
  target_fats: z.number().int().min(0).max(300),
  meals: z.object({
    breakfast: z.string().max(1000).optional().default(''),
    lunch: z.string().max(1000).optional().default(''),
    dinner: z.string().max(1000).optional().default(''),
    snacks: z.string().max(1000).optional().default(''),
  }),
});

export const weeklyDietScheduleSchema = z.object({
  lunes: dailyDietTargetSchema,
  martes: dailyDietTargetSchema,
  miercoles: dailyDietTargetSchema,
  jueves: dailyDietTargetSchema,
  viernes: dailyDietTargetSchema,
  sabado: dailyDietTargetSchema,
  domingo: dailyDietTargetSchema,
});

export type DailyDietTarget = z.infer<typeof dailyDietTargetSchema>;
export type WeeklyDietSchedule = z.infer<typeof weeklyDietScheduleSchema>;

export const defaultDailyPlan: DailyDietTarget = {
  target_kcal: 2000,
  target_protein: 150,
  target_carbs: 200,
  target_fats: 70,
  meals: {
    breakfast: '',
    lunch: '',
    dinner: '',
    snacks: '',
  },
};

export const defaultWeeklyPlan: WeeklyDietSchedule = {
  lunes: defaultDailyPlan,
  martes: defaultDailyPlan,
  miercoles: defaultDailyPlan,
  jueves: defaultDailyPlan,
  viernes: defaultDailyPlan,
  sabado: defaultDailyPlan,
  domingo: defaultDailyPlan,
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
