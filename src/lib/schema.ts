import { z } from 'zod';

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
