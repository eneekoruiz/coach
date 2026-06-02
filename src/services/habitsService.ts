import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { isMissingHabitTableError } from '@/lib/habits';
import { getNormalizedDate } from '@/lib/date-utils';
import { upsertDailyLog } from '@/services/dailyLogService';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';

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
  amount?: number;
  delta?: number;
  date?: string;
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

function normalizeHabitKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export async function updateTodayHabit(params: UpdateTodayHabitParams) {
  const { supabase, userId, habitId, amount, delta, date } = params;
  const targetDate = date || getNormalizedDate(new Date());

  // 1) Fetch habit to get its name and type
  const { data: habit, error: habitError } = await supabase
    .from('user_habits')
    .select('name, type')
    .eq('id', habitId)
    .single();

  if (habitError || !habit) {
    throw new Error(habitError?.message || 'No se encontró el hábito solicitado en la base de datos.');
  }

  const normalizedKey = normalizeHabitKey(habit.name);

  // 2) Fetch today's daily_log if exists
  const { data: existing, error: fetchError } = await supabase
    .from('daily_logs')
    .select('id, health_momentum, ai_data, habit_tracking')
    .eq('user_id', userId)
    .eq('date', targetDate)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  // Get previous health momentum from the last log before targetDate if none exists
  let healthMomentum = existing?.health_momentum ?? 100;
  if (!existing) {
    const { data: previousLog } = await supabase
      .from('daily_logs')
      .select('health_momentum')
      .eq('user_id', userId)
      .lt('date', targetDate)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previousLog) {
      healthMomentum = previousLog.health_momentum;
    }
  }

  // 3) Parse and initialize ai_data
  let aiData: DailyLog = {
    comidas: [],
    hidratacion_ml: 0,
    water_ml: 0,
    total_kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0,
    habits_count: {},
    toxinas: [],
    bio_avatar: { estado_fisiologico: 'estable', energia_fisica: 3, claridad_mental: 3 },
    metricas: { variacion_inercia: 0, aciertos: [], error_clave: '', accion_manana: '' },
  };

  if (existing?.ai_data) {
    const validated = dailyLogSchema.safeParse(existing.ai_data);
    if (validated.success) {
      aiData = validated.data;
    }
  }

  // 4) Calculate the new tracking value
  const currentTracking = existing?.habit_tracking
    ? parseHabitTracking(existing.habit_tracking)
    : [];

  const existingEntry = currentTracking.find((r) => Number(r.habit_id) === habitId);
  const oldAmount = existingEntry ? existingEntry.amount : 0;

  let newAmount = oldAmount;
  if (delta !== undefined) {
    newAmount = Math.max(0, oldAmount + delta);
  } else if (amount !== undefined) {
    newAmount = Math.max(0, amount);
  }

  // Update tracking entry
  if (existingEntry) {
    existingEntry.amount = newAmount;
  } else {
    currentTracking.push({ habit_id: habitId, amount: newAmount });
  }

  // 5) Sincronizar ai_data
  if (!aiData.habits_count) {
    aiData.habits_count = {};
  }
  aiData.habits_count[normalizedKey] = newAmount;

  // Si es un hábito de agua/hidratación, sincronizamos water_ml
  const isWater = normalizedKey.includes('agua') || normalizedKey.includes('hidratacion');
  if (isWater) {
    const waterVolume = newAmount > 100 ? newAmount : newAmount * 250;
    aiData.water_ml = waterVolume;
    aiData.hidratacion_ml = waterVolume;
  }

  // 6) Persistir usando la Fuente Única de Verdad
  const updatedLog = await upsertDailyLog({
    supabase,
    userId,
    date: targetDate,
    healthMomentum,
    aiData,
    habitTracking: currentTracking,
  });

  return updatedLog;
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
