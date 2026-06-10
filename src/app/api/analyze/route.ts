import { NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveAuthenticatedClient } from '@/services/authService';
import {
  streamAnalyzeAndPersistDailyLog,
  ImageTooLargeError,
} from '@/services/analyzeService';
import { createFallbackDailyLog, withTimeout } from '@/services/aiRuntime';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
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
    history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).optional(),
    session_id: z.string().uuid().nullable().optional(),
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

const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 10000; // 10 seconds
  const maxRequests = 5;

  if (Math.random() < 0.05) {
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const active = timestamps.filter(t => now - t < windowMs);
      if (active.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, active);
      }
    }
  }

  const timestamps = rateLimitMap.get(userId) || [];
  const activeTimestamps = timestamps.filter(t => now - t < windowMs);

  if (activeTimestamps.length >= maxRequests) {
    return false;
  }

  activeTimestamps.push(now);
  rateLimitMap.set(userId, activeTimestamps);
  return true;
}

export async function POST(request: Request) {
  try {
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

    if (!checkRateLimit(user.id)) {
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMIT',
          message: 'Has hecho demasiadas peticiones. Por favor, espera un momento.',
        },
        { status: 429 }
      );
    }

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

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(
        JSON.stringify(createFallbackDailyLog(body.local_date || new Date().toISOString().slice(0, 10), 'ai_key_missing')),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      const result = await withTimeout(
        streamAnalyzeAndPersistDailyLog({
          text: body.text ?? '',
          rawImage: body.image,
          habitReports: body.habit_tracking ?? [],
          localDate: body.local_date,
          authHeader,
          supabase,
          user,
          history: body.history,
          sessionId: body.session_id,
        })
      );

      return result.toTextStreamResponse();
    } catch (err) {
      console.error('[ANALYZE_API_STREAM_ERROR] Processing failed:', err);
      
      if (err instanceof ImageTooLargeError) {
        return jsonError(413, 'image_too_large', err.message);
      }

      const fallbackData = createFallbackDailyLog(
        body.local_date || new Date().toISOString().slice(0, 10),
        err instanceof Error && err.message.includes('timeout') ? 'ai_timeout' : 'error_ia'
      );

      // Return a simulated structured JSON response matching the schema contract
      return new Response(JSON.stringify(fallbackData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('[ANALYZE_API_ERROR] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return jsonError(500, 'unexpected_error', `Falló el análisis: ${message}`);
  }
}
