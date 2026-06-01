import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveAuthenticatedClient } from '@/services/authService';
import {
  analyzeAndPersistDailyLog,
  createSafeDemoResponse,
  ImageTooLargeError,
  AiServiceError,
  DatabaseError,
} from '@/services/analyzeService';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Extend duration for Gemini API responses on Vercel

const MAX_TEXT_LENGTH = 5000;

const habitReportSchema = z
  .object({
    habit_id: z.number().int().positive(),
    amount: z.number().finite(),
  })
  .strict();

const analyzeRequestSchema = z
  .object({
    text: z.string().trim().max(MAX_TEXT_LENGTH).nullable().optional(),
    image: z.string().trim().min(1).nullable().optional(),
    habit_tracking: z.array(habitReportSchema).nullable().optional(),
    local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.text && !value.image) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['text'],
        message: 'El body debe incluir text, image o ambos.',
      });
    }
  });

type AnalyzeRequestBody = z.infer<typeof analyzeRequestSchema>;

function jsonError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown> | unknown[] | string
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    // 1) Verify presence of Gemini API key immediately
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error('La variable de entorno GOOGLE_GENERATIVE_AI_API_KEY no está configurada.');
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('Las variables de entorno de Supabase no están configuradas.');
    }

    const authHeader = request.headers.get('authorization') ?? undefined;
    
    let auth;
    try {
      auth = await resolveAuthenticatedClient(authHeader);
    } catch (authErr) {
      console.error('[ANALYZE_API_ERROR] Authentication failed:', authErr);
      return jsonError(401, 'unauthorized', 'No se pudo validar la sesión del usuario.');
    }

    const { supabase, user } = auth;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch (jsonErr) {
      console.error('[ANALYZE_API_ERROR] Invalid JSON body:', jsonErr);
      return jsonError(400, 'invalid_json', 'El body debe ser un JSON válido.');
    }

    const parsedBody = analyzeRequestSchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return jsonError(
        422,
        'invalid_input',
        'El body no cumple el contrato esperado.',
        parsedBody.error.flatten()
      );
    }

    const body: AnalyzeRequestBody = parsedBody.data;

    try {
      const result = await analyzeAndPersistDailyLog({
        text: body.text ?? '',
        rawImage: body.image,
        habitReports: body.habit_tracking ?? [],
        localDate: body.local_date,
        authHeader,
        supabase,
        user,
      });

      return NextResponse.json({ status: 200, data: result }, { status: 200 });
    } catch (err) {
      console.error('[ANALYZE_API_ERROR] Processing failed:', err);
      if (err instanceof ImageTooLargeError) {
        return jsonError(413, 'image_too_large', err.message);
      }
      if (err instanceof AiServiceError) {
        const isRateLimit = /quota exceeded|rate limit|429/i.test(err.message + ' ' + (err.reason || ''));
        if (isRateLimit) {
          return NextResponse.json(
            {
              success: false,
              error: 'RATE_LIMIT',
              message: 'El Bio-Avatar está procesando demasiada información. Por favor, espera un minuto.',
            },
            { status: 429 }
          );
        }
        return jsonError(502, 'ai_service_failure', err.message, err.reason);
      }
      if (err instanceof DatabaseError) {
        return jsonError(503, err.code, err.message);
      }
      throw err;
    }
  } catch (error) {
    console.error('[ANALYZE_API_ERROR] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return jsonError(500, 'unexpected_error', `Falló el análisis: ${message}`);
  }
}
