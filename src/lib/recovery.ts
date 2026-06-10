import type { HabitRecoveryCheckIn, HabitRow } from '@/types/habits';

export type SoberDuration = {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type RecoveryMilestone = {
  label: string;
  days: number;
  targetAt: Date;
  remainingDays: number;
  reached: boolean;
};

const MILESTONES = [
  { label: '24 horas', days: 1 },
  { label: '3 días', days: 3 },
  { label: '1 semana', days: 7 },
  { label: '2 semanas', days: 14 },
  { label: '1 mes', days: 30 },
  { label: '3 meses', days: 90 },
  { label: '6 meses', days: 180 },
  { label: '1 año', days: 365 },
  { label: '2 años', days: 730 },
] as const;

export function getSobrietyStart(habit: HabitRow) {
  const startedAt = habit.sobriety_started_at ?? habit.last_relapse_at ?? null;
  const parsed = startedAt ? new Date(startedAt) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function getSoberDuration(habit: HabitRow, nowMs: number = Date.now()): SoberDuration {
  const startMs = getSobrietyStart(habit).getTime();
  const totalMs = Math.max(0, nowMs - startMs);
  const totalSeconds = Math.floor(totalMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { totalMs, days, hours, minutes, seconds };
}

export function getNextRecoveryMilestone(
  habit: HabitRow,
  nowMs: number = Date.now()
): RecoveryMilestone {
  const start = getSobrietyStart(habit);
  const duration = getSoberDuration(habit, nowMs);
  const next =
    MILESTONES.find((milestone) => duration.days < milestone.days) ??
    MILESTONES[MILESTONES.length - 1];
  const targetAt = new Date(start.getTime() + next.days * 86400 * 1000);
  const remainingMs = Math.max(0, targetAt.getTime() - nowMs);

  return {
    label: next.label,
    days: next.days,
    targetAt,
    remainingDays: Math.ceil(remainingMs / (86400 * 1000)),
    reached: remainingMs === 0,
  };
}

export function buildDailyPledgeText(habit: HabitRow) {
  const cleanName = habit.name.replace(/^sin\s+/i, '').trim();
  return `Hoy prometo mantenerme libre de ${cleanName || habit.name}.`;
}

export function getRecoveryCheckInState(checkIn?: HabitRecoveryCheckIn | null) {
  return {
    hasPledged: Boolean(checkIn?.pledged_at || checkIn?.pledge_status === 'pledged'),
    hasReview: Boolean(checkIn?.reviewed_at),
    skippedPledge: checkIn?.pledge_status === 'skipped',
    difficulty: checkIn?.difficulty ?? null,
    keptPromise: checkIn?.kept_promise ?? null,
  };
}
