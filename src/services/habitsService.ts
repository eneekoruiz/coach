import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { isMissingHabitTableError } from '@/lib/habits';

const habitSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['positive', 'negative']),
  target_number: z.number().int().nonnegative().optional(),
  unit: z.string().nullable().optional(),
  tolerance: z.number().int().nonnegative().optional(),
});

type ParsedHabit = z.infer<typeof habitSchema>;

export class MissingHabitTableError extends Error {}
export class PermissionDeniedError extends Error {}

export interface CreateHabitParams {
  supabase: SupabaseClient;
  userId: string;
  name: string;
  type: 'positive' | 'negative';
  target_number: number;
  unit?: string | null;
  tolerance: number;
}

export async function createHabit(params: CreateHabitParams) {
  const { supabase, userId, name, type, tolerance } = params;

  const { data, error } = await supabase
    .from('user_habits')
    .insert({
      user_id: userId,
      name,
      type,
      is_custom: true,
      tolerance_threshold: tolerance,
      current_streak: 0,
      longest_streak: 0,
      shields: 0,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingHabitTableError(error)) {
      throw new MissingHabitTableError('La base de datos de hábitos todavía no tiene la tabla public.user_habits.');
    }

    const lower = (error.message || '').toLowerCase();
    if (/permission|row-level security|policy|forbidden/.test(lower)) {
      throw new PermissionDeniedError('Permission denied when creating habit.');
    }
    throw new Error(error.message || 'Failed to create habit.');
  }

  return data;
}

export interface UpdateTodayHabitParams {
  supabase: SupabaseClient;
  userId: string;
  habitId: number;
  amount: number;
}

type HabitTrackingEntry = {
  habit_id: number;
  amount: number;
};

function parseHabitTracking(value: unknown): HabitTrackingEntry[] {
  if (Array.isArray(value)) return value as HabitTrackingEntry[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as HabitTrackingEntry[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function updateTodayHabit(params: UpdateTodayHabitParams) {
  const { supabase, userId, habitId, amount } = params;
  const today = new Date().toISOString().slice(0, 10);

  // Fetch today's daily_log if exists
  const { data: existing, error: fetchError } = await supabase
    .from('daily_logs')
    .select('id, habit_tracking')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!existing) {
    // Insert new daily_log minimal
    const { data: inserted, error: insertError } = await supabase
      .from('daily_logs')
      .insert({
        user_id: userId,
        date: today,
        health_momentum: 100,
        ai_data: {},
        habit_tracking: [{ habit_id: habitId, amount }],
      })
      .select('*')
      .single();

    if (insertError) {
      throw new Error(insertError.message || 'Failed to insert daily log.');
    }
    return inserted;
  }

  const current = parseHabitTracking(existing.habit_tracking);
  const idx = current.findIndex((r) => Number(r.habit_id) === habitId);
  if (idx >= 0) {
    current[idx].amount = amount;
  } else {
    current.push({ habit_id: habitId, amount });
  }

  const { error: updateError, data: updated } = await supabase
    .from('daily_logs')
    .update({ habit_tracking: current })
    .eq('id', existing.id)
    .select('*')
    .single();

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update daily log.');
  }

  return updated;
}

export async function parseHabitFromText(text: string): Promise<ParsedHabit> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // fallback simple heuristic parser
    const numMatch = text.match(/(\d+)/);
    const target = numMatch ? Number(numMatch[1]) : 1;
    const negative = /no\s+|sin\s+|no\s+comer|no\s+beber|no\s+fumar/i.test(text);
    const unitMatch = text.match(/(páginas|paginas|veces|horas|minutos|cervezas|alcohol|cigarrillos|cigarros)/i);

    return {
      name: text.split(/[,.]/)[0].slice(0, 30),
      type: negative ? 'negative' : 'positive',
      target_number: target,
      unit: unitMatch ? unitMatch[1] : null,
      tolerance: 0,
    };
  }

  const system =
    "Eres un extractor de rutinas. El usuario te dirá qué hábito quiere crear. Devuelve un JSON con: name (string corto), type ('positive' | 'negative'), target_number (número, si no especifica asume 1), unit (string o null), tolerance (número de fallos permitidos, 0 por defecto). Responde solo el JSON conforme al esquema proporcionado, sin texto adicional.";

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    system,
    messages: [{ role: 'user', content: text }],
    schema: habitSchema,
  });

  return object;
}
