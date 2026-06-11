import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // Gemini response buffer

// Strict schema matching user requirements
const questionSchema = z.object({
  id: z.string().describe('Unique identifier for the question (e.g., q1, q2)'),
  concept_id: z.string().describe('The database id of the corresponding knowledge item'),
  type: z.enum(['mcq', 'blank', 'short']).describe('Question format: Multiple Choice (mcq), Fill-in-the-blank (blank), or Free short response (short)'),
  question: z.string().describe('Question text or sentence with ____ for blank questions'),
  options: z.array(z.string()).optional().describe('4 choices (only for mcq; omit or empty for others)'),
  correctAnswer: z.string().describe('Correct option text (for mcq), exact fill-in word (for blank), or concise answer (for short)'),
  keywords: z.array(z.string()).optional().describe('1-3 essential lowercase keywords that must be present in a valid user answer (only for short response)'),
  explanation: z.string().describe('A brief explanatory tip or reference for the user'),
});

const quizSchema = z.object({
  questions: z.array(questionSchema),
});

const requestSchema = z.object({
  concepts: z.array(
    z.object({
      id: z.string(),
      raw_concept: z.string(),
    })
  ),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsedBody = requestSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 422 });
    }

    const { concepts } = parsedBody.data;

    if (concepts.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    // Build standard prompt in Spanish as the app is in Spanish
    const systemPrompt = `Eres un motor educativo de IA de alto rendimiento. Tu tarea es generar preguntas de quiz basadas en una lista de conceptos clave proporcionados por el usuario.
Genera exactamente una pregunta para cada concepto provisto.
Elige un tipo de pregunta aleatorio para cada una ('mcq', 'blank' o 'short') balanceando la variedad:
1. 'mcq': Pregunta de opción múltiple. Crea 4 opciones claras y una respuesta correcta.
2. 'blank': Oración con hueco marcada con '____'. La respuesta correcta debe ser exactamente la palabra o frase que falta.
3. 'short': Pregunta corta de respuesta libre. Define una respuesta sugerida muy concisa y una lista de 1 a 3 'keywords' clave obligatorios en minúsculas para validar la respuesta.

Todos los textos deben estar en Español, con un tono motivador e interactivo.`;

    const prompt = `Lista de conceptos para evaluar:\n${concepts
      .map((c) => `- [ID: ${c.id}] Concepto: "${c.raw_concept}"`)
      .join('\n')}\n\nGenera un quiz estructurado donde cada pregunta se asocie al concept_id correspondiente.`;

    const result = await generateObject({
      model: google('gemini-1.5-flash'),
      system: systemPrompt,
      prompt: prompt,
      schema: quizSchema,
      temperature: 0.7,
    });

    return NextResponse.json(result.object);
  } catch (error: any) {
    console.error('[QUIZ_GEN_API_ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}
