import type { HabitRow, DailyLogRow, SummaryCardSpec, HabitType, HabitTrackingEntry } from '@/types/habits';

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isHabitType(value: unknown): value is HabitType {
  return value === 'positive' || value === 'negative';
}

export function toNumber(value: unknown): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function isHabitRow(value: unknown): value is HabitRow {
  if (!isObject(value)) return false;

  return (
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    isHabitType(value.type) &&
    typeof value.tolerance_threshold === 'number' &&
    typeof value.current_streak === 'number' &&
    typeof value.longest_streak === 'number' &&
    typeof value.shields === 'number'
  );
}

export function getNegativeHabitPolicy(habit: HabitRow) {
  return {
    graceLimit: Math.max(0, habit.tolerance_threshold ?? 0),
    slipAllowance: Math.max(0, habit.slip_allowance ?? 1),
    slipWindowDays: Math.max(1, habit.slip_window_days ?? 7),
    slipPenaltyHours: Math.max(0, habit.slip_penalty_hours ?? 24),
  };
}

export function buildNegativeHabitInsights(
  habit: HabitRow,
  logs: DailyLogRow[],
  nowMs: number = Date.now()
) {
  const { graceLimit, slipAllowance, slipWindowDays, slipPenaltyHours } = getNegativeHabitPolicy(habit);
  const entries = logs.slice(0, slipWindowDays).map((log) => {
    const tracking = log.habit_tracking ?? [];
    const record = tracking.find((entry) => entry.habit_id === habit.id);
    return {
      date: log.date,
      amount: Number(record?.amount ?? 0),
      relapseFactor: record?.relapse_factor ?? null,
    };
  });

  const slipDays = entries.filter((entry) => entry.amount > 0 && entry.amount <= graceLimit).length;
  const relapseDays = entries.filter((entry) => entry.amount > graceLimit).length;
  const totalPenaltyUnits = entries.reduce((sum, entry) => sum + (entry.amount > 0 ? Math.max(1, entry.amount) : 0), 0);
  const totalPenaltyHours = totalPenaltyUnits * slipPenaltyHours;
  const exceededAllowance = relapseDays > slipAllowance;
  const remainingAllowance = Math.max(0, slipAllowance - relapseDays);
  const startedAtMs = habit.sobriety_started_at ? new Date(habit.sobriety_started_at).getTime() : nowMs;
  const effectiveStartMs = exceededAllowance
    ? nowMs
    : Math.min(nowMs, startedAtMs + totalPenaltyHours * 60 * 60 * 1000);
  const effectiveSobrietyMs = Math.max(0, nowMs - effectiveStartMs);

  return {
    entries,
    graceLimit,
    slipAllowance,
    slipWindowDays,
    slipPenaltyHours,
    slipDays,
    relapseDays,
    totalPenaltyHours,
    exceededAllowance,
    remainingAllowance,
    effectiveSobrietyMs,
    sobrietyDays: Math.floor(effectiveSobrietyMs / (1000 * 60 * 60 * 24)),
    sobrietyHours: Math.floor((effectiveSobrietyMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
  };
}

export function isHabitTrackingEntry(value: unknown): value is HabitTrackingEntry {
  if (!isObject(value)) return false;
  return typeof value.habit_id === 'number' && typeof value.amount === 'number';
}

export function isDailyLogRow(value: unknown): value is DailyLogRow {
  if (!isObject(value)) return false;

  const tracking = value.habit_tracking;
  if (typeof value.date !== 'string') return false;
  if (tracking !== null && !Array.isArray(tracking)) return false;

  return tracking === null || tracking.every(isHabitTrackingEntry);
}

export function isUnauthorizedError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return lower.includes('session') || lower.includes('unauthorized') || lower.includes('not authenticated');
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getSafeMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
  }
  return String(error);
}

export async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function buildMiniSeries(logs: DailyLogRow[], habitId: number): number[] {
  return logs
    .slice(0, 30)
    .map((log) => {
      const entries = log.habit_tracking ?? [];
      const entry = entries.find((currentEntry) => currentEntry.habit_id === habitId);
      return Number(entry?.amount ?? 0);
    })
    .reverse();
}

export function buildSummaryCards(habits: HabitRow[], logs: DailyLogRow[]): SummaryCardSpec[] {
  const activeHabits = habits.length;
  const activeStreaks = habits.filter((habit) => habit.current_streak > 0).length;
  const maxCurrentStreak = habits.reduce((max, habit) => Math.max(max, habit.current_streak), 0);
  const maxLongstreak = habits.reduce((max, habit) => Math.max(max, habit.longest_streak), 0);
  
  const recentDays = Math.min(7, logs.length);
  const trackedDays = recentDays === 0 ? 0 : logs.slice(0, recentDays).filter((log) => {
    const entries = log.habit_tracking ?? [];
    return entries.some((entry) => entry.amount > 0);
  }).length;
  const recentConsistency = recentDays === 0 ? 0 : Math.round((trackedDays / recentDays) * 100);

  return [
    {
      label: 'Hábitos activos',
      value: String(activeHabits),
      detail: activeHabits === 1 ? '1 hábito monitorizado' : `${activeHabits} hábitos monitorizados`,
    },
    {
      label: 'Rachas vivas',
      value: String(activeStreaks),
      detail: activeStreaks === 0 ? 'Ninguna racha activa' : 'Hay momentum visible',
    },
    {
      label: 'Mejor racha',
      value: String(maxLongstreak),
      detail: maxCurrentStreak > 0 ? `Actual: ${maxCurrentStreak}` : 'Sin rachas actuales',
    },
    {
      label: 'Consistencia 7 días',
      value: `${recentConsistency}%`,
      detail: recentDays > 0 ? `${trackedDays}/${recentDays} días con registro` : 'Aún sin histórico reciente',
    },
  ];
}
