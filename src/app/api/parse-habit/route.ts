import { NextResponse } from 'next/server';
import { parseHabitFromText } from '@/services/habitsService';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === 'string' ? body.text.trim() : '';

    if (!text) {
      return NextResponse.json({ error: 'Text required' }, { status: 400 });
    }

    const object = await parseHabitFromText(text);

    return NextResponse.json({ data: object }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
