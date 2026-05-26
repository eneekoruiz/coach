import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const habitSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['positive', 'negative']),
  target_number: z.number().int().nonnegative().optional(),
  unit: z.string().nullable().optional(),
  tolerance: z.number().int().nonnegative().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 });

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      // fallback simple heuristic parser
      const numMatch = text.match(/(\d+)/);
      const target = numMatch ? Number(numMatch[1]) : 1;
      const negative = /no\s+|sin\s+|no\s+comer|no\s+beber|no\s+fumar/i.test(text);
      const unitMatch = text.match(/(páginas|paginas|veces|horas|minutos|cervezas|alcohol|cigarrillos|cigarros)/i);

      const parsed = {
        name: text.split(/[,.]/)[0].slice(0, 30),
        type: negative ? 'negative' : 'positive',
        target_number: target,
        unit: unitMatch ? unitMatch[1] : null,
        tolerance: 0,
      };

      return NextResponse.json({ data: parsed }, { status: 200 });
    }

    const system =
      "Eres un extractor de rutinas. El usuario te dirá qué hábito quiere crear. Devuelve un JSON con: name (string corto), type ('positive' | 'negative'), target_number (número, si no especifica asume 1), unit (string o null), tolerance (número de fallos permitidos, 0 por defecto). Responde solo el JSON conforme al esquema proporcionado, sin texto adicional.";

    const { object } = await generateObject({
      model: google('gemini-2.5-flash'),
      system,
      messages: [{ role: 'user', content: text }],
      schema: habitSchema,
    });

    return NextResponse.json({ data: object }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
