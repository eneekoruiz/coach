import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { isMissingHabitTableError } from '@/lib/habits';
import {
  buildDefaultMetricConfig,
  clampHabitMetricValue,
  getHabitMetric,
  inferHabitMetricType,
} from '@/lib/habit-metrics';
import { getSafeLocalDate } from '@/lib/date-utils';
import { upsertDailyLog } from '@/services/dailyLogService';
import {
  dailyLogSchema,
  habitMetricConfigSchema,
  habitMetricTypeSchema,
  type DailyLog,
} from '@/lib/schema';
import type { HabitMetricConfig, HabitMetricType, HabitRow } from '@/types/habits';

const habitSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['positive', 'negative']),
  target_number: z.number().int().nonnegative().optional(),
  unit: z.string().nullable().optional(),
  tolerance: z.number().int().nonnegative().optional(),
  metric_type: habitMetricTypeSchema.optional(),
  unit_label: z.string().max(32).nullable().optional(),
  step_value: z.number().positive().optional(),
  metric_config: habitMetricConfigSchema.optional(),
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
  metricType?: HabitMetricType;
  unitLabel?: string | null;
  stepValue?: number;
  metricConfig?: HabitMetricConfig;
}

export async function createHabit(params: CreateHabitParams) {
  const {
    supabase,
    userId,
    name,
    type,
    target_number,
    unit,
    tolerance,
    metricType,
    unitLabel,
    stepValue,
    metricConfig,
  } = params;
  const metricSeed: HabitRow = {
    id: 0,
    user_id: userId,
    name,
    type,
    is_custom: true,
    tolerance_threshold: tolerance,
    target_value: target_number,
    unit: unitLabel ?? unit ?? null,
    metric_type:
      metricType ??
      inferHabitMetricType({
        name,
        type,
        unit: unit ?? unitLabel ?? null,
        target_value: target_number,
      }),
    unit_label: unitLabel ?? unit ?? null,
    step_value: stepValue ?? null,
    metric_config: metricConfig ?? null,
    current_streak: 0,
    longest_streak: 0,
    shields: 0,
  };
  const normalizedMetric = getHabitMetric(metricSeed);
  const normalizedConfig = {
    ...buildDefaultMetricConfig(
      normalizedMetric.type,
      normalizedMetric.unitLabel,
      normalizedMetric.stepValue
    ),
    ...(metricConfig ?? {}),
  };

  const { data, error } = await supabase
    .from('user_habits')
    .insert({
      user_id: userId,
      name,
      type,
      is_custom: true,
      tolerance_threshold: tolerance,
      target_value: target_number,
      unit: normalizedMetric.unitLabel,
      metric_type: normalizedMetric.type,
      unit_label: normalizedMetric.unitLabel,
      step_value: normalizedMetric.stepValue,
      metric_config: normalizedConfig,
      sobriety_started_at: type === 'negative' ? new Date().toISOString() : null,
      last_relapse_at: null,
      slip_allowance: type === 'negative' ? 1 : 0,
      slip_window_days: type === 'negative' ? 7 : 1,
      slip_penalty_hours: type === 'negative' ? 24 : 0,
      current_streak: 0,
      longest_streak: 0,
      shields: 0,
    })
    .select('*')
    .single();

  if (error) {
    if (isMissingHabitTableError(error)) {
      throw new MissingHabitTableError(
        'La base de datos de hábitos todavía no tiene la tabla public.user_habits.'
      );
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
  relapseFactor?: HabitTrackingEntry['relapse_factor'];
}

export interface UpdateHabitSettingsParams {
  supabase: SupabaseClient;
  userId: string;
  habitId: number;
  toleranceThreshold?: number;
  targetValue?: number;
  unit?: string | null;
  metricType?: HabitMetricType;
  unitLabel?: string | null;
  stepValue?: number;
  metricConfig?: HabitMetricConfig;
  slipAllowance?: number;
  slipWindowDays?: number;
  slipPenaltyHours?: number;
}

type HabitTrackingEntry = {
  habit_id: number;
  amount: number;
  relapse_factor?: 'stress' | 'social' | 'boredom' | 'craving' | 'other' | null;
  metric_type?: HabitMetricType | null;
  unit_label?: string | null;
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
  const { supabase, userId, habitId, amount, delta, date, relapseFactor } = params;
  const targetDate = getSafeLocalDate(date);

  // 1) Fetch habit to get its name and type
  const { data: habit, error: habitError } = await supabase
    .from('user_habits')
    .select(
      'id, name, type, unit, unit_label, metric_type, metric_config, step_value, target_value, sobriety_started_at, tolerance_threshold, slip_allowance, slip_window_days'
    )
    .eq('id', habitId)
    .eq('user_id', userId)
    .single();

  if (habitError || !habit) {
    throw new Error(
      habitError?.message || 'No se encontró el hábito solicitado en la base de datos.'
    );
  }

  const habitRow = habit as HabitRow;
  const metric = getHabitMetric(habitRow);
  const normalizedKey = normalizeHabitKey(habitRow.name);
  const isWater = normalizedKey.includes('agua') || normalizedKey.includes('hidratacion');

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
    newAmount = clampHabitMetricValue(habitRow, oldAmount + delta);
  } else if (amount !== undefined) {
    newAmount = clampHabitMetricValue(habitRow, amount);
  }

  // Update tracking entry
  if (existingEntry) {
    existingEntry.amount = newAmount;
    existingEntry.metric_type = metric.type;
    existingEntry.unit_label = metric.unitLabel;
    existingEntry.relapse_factor = relapseFactor ?? existingEntry.relapse_factor ?? null;
  } else {
    currentTracking.push({
      habit_id: habitId,
      amount: newAmount,
      metric_type: metric.type,
      unit_label: metric.unitLabel,
      relapse_factor: relapseFactor ?? null,
    });
  }

  // 5) Sincronizar ai_data
  if (!aiData.habits_count) {
    aiData.habits_count = {};
  }
  aiData.habits_count[normalizedKey] = newAmount;

  // Si es un hábito de agua/hidratación, sincronizamos water_ml
  if (isWater && metric.type === 'volume') {
    const unit = metric.unitLabel.toLowerCase();
    const waterVolume =
      unit === 'l' || unit === 'litro' || unit === 'litros'
        ? Math.round(newAmount * 1000)
        : Math.round(newAmount);
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

  if (habitRow.type === 'negative') {
    const graceLimit = Math.max(0, habitRow.tolerance_threshold ?? 0);
    const slipAllowance = Math.max(0, habitRow.slip_allowance ?? 1);
    const slipWindowDays = Math.max(1, habitRow.slip_window_days ?? 7);
    const nowIso = new Date().toISOString();
    let timestampUpdates: Record<string, string> | null = null;

    if (newAmount === 0 && !habitRow.sobriety_started_at) {
      timestampUpdates = { sobriety_started_at: nowIso };
    }

    if (newAmount > 0) {
      timestampUpdates = {
        ...(timestampUpdates ?? {}),
        last_relapse_at: nowIso,
      };
    }

    if (newAmount > graceLimit) {
      const { data: recentLogs } = await supabase
        .from('daily_logs')
        .select('date, habit_tracking')
        .eq('user_id', userId)
        .lt('date', targetDate)
        .order('date', { ascending: false })
        .limit(Math.max(0, slipWindowDays - 1));

      const relapseDaysInWindow =
        (recentLogs ?? []).filter((log) => {
          const tracking = parseHabitTracking(log.habit_tracking);
          const entry = tracking.find((item) => Number(item.habit_id) === habitId);
          return Number(entry?.amount ?? 0) > graceLimit;
        }).length + 1;

      if (relapseDaysInWindow > slipAllowance) {
        timestampUpdates = {
          ...(timestampUpdates ?? {}),
          sobriety_started_at: nowIso,
        };
      }
    }

    if (timestampUpdates) {
      await supabase
        .from('user_habits')
        .update(timestampUpdates)
        .eq('id', habitId)
        .eq('user_id', userId);
    }
  }

  return updatedLog;
}

export async function updateHabitSettings(params: UpdateHabitSettingsParams) {
  const {
    supabase,
    userId,
    habitId,
    toleranceThreshold,
    targetValue,
    unit,
    metricType,
    unitLabel,
    stepValue,
    metricConfig,
    slipAllowance,
    slipWindowDays,
    slipPenaltyHours,
  } = params;
  const updates: Record<string, number | string | null | HabitMetricConfig> = {};

  if (typeof toleranceThreshold === 'number') {
    updates.tolerance_threshold = Math.max(0, Math.floor(toleranceThreshold));
  }
  if (typeof targetValue === 'number') {
    updates.target_value = Math.max(0, targetValue);
  }
  if (unit !== undefined) {
    updates.unit = unit;
  }
  if (metricType !== undefined) {
    updates.metric_type = metricType;
  }
  if (unitLabel !== undefined) {
    updates.unit_label = unitLabel;
    updates.unit = unitLabel;
  }
  if (typeof stepValue === 'number') {
    updates.step_value = Math.max(0.0001, stepValue);
  }
  if (metricConfig !== undefined) {
    updates.metric_config = metricConfig;
  }
  if (typeof slipAllowance === 'number') {
    updates.slip_allowance = Math.max(0, Math.floor(slipAllowance));
  }
  if (typeof slipWindowDays === 'number') {
    updates.slip_window_days = Math.max(1, Math.floor(slipWindowDays));
  }
  if (typeof slipPenaltyHours === 'number') {
    updates.slip_penalty_hours = Math.max(0, Math.floor(slipPenaltyHours));
  }

  if (Object.keys(updates).length === 0) {
    throw new Error('No hay ajustes que guardar.');
  }

  const { data, error } = await supabase
    .from('user_habits')
    .update(updates)
    .eq('id', habitId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'No se pudieron guardar los ajustes del hábito.');
  }

  return data;
}

export async function parseHabitFromText(text: string): Promise<ParsedHabit> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    // fallback simple heuristic parser
    const numMatch = text.match(/(\d+)/);
    const target = numMatch ? Number(numMatch[1]) : 1;
    const negative = /no\s+|sin\s+|no\s+comer|no\s+beber|no\s+fumar/i.test(text);
    const unitMatch = text.match(
      /(ml|litros|vasos|páginas|paginas|veces|horas|minutos|cervezas|alcohol|cigarrillos|cigarros)/i
    );
    const metricType =
      unitMatch?.[1] && /ml|litro|vaso/i.test(unitMatch[1])
        ? 'volume'
        : unitMatch?.[1] && /hora|minuto/i.test(unitMatch[1])
          ? 'duration'
          : target <= 1 && !negative
            ? 'boolean'
            : 'counter';
    const unitLabel = unitMatch ? unitMatch[1] : metricType === 'boolean' ? 'hecho' : null;

    return {
      name: text.split(/[,.]/)[0].slice(0, 30),
      type: negative ? 'negative' : 'positive',
      target_number: target,
      unit: unitLabel,
      tolerance: 0,
      metric_type: metricType,
      unit_label: unitLabel,
      step_value: metricType === 'volume' ? 250 : metricType === 'duration' ? 5 : 1,
    };
  }

  const system =
    "Eres un extractor de rutinas. El usuario te dirá qué hábito quiere crear. Devuelve un JSON con: name (string corto), type ('positive' | 'negative'), target_number (número, si no especifica asume 1), unit (string o null), tolerance (número de fallos permitidos, 0 por defecto), metric_type ('boolean', 'counter', 'volume' o 'duration'), unit_label y step_value cuando sean evidentes. Para agua usa volume/ml/250, lectura counter/páginas/1, meditación duration/min/5, hábitos hecho/no hecho boolean/hecho/1. Responde solo el JSON conforme al esquema proporcionado, sin texto adicional.";

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    system,
    messages: [{ role: 'user', content: text }],
    schema: habitSchema,
  });

  return object;
}
