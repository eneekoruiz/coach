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
    hidratacion_ml: z.number().int().nonnegative(),
    toxinas: z.array(z.string().min(1)),
    bio_avatar: z
      .object({
        estado_fisiologico: z.string().min(1),
        energia_fisica: z.number().int().min(1).max(5),
        claridad_mental: z.number().int().min(1).max(5),
      })
      .strict(),
    metricas: z
      .object({
        variacion_inercia: z.number().int(),
        aciertos: z.array(z.string().min(1)),
        error_clave: z.string().min(1),
        accion_manana: z.string().min(1),
      })
      .strict(),
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
