import React from 'react';
import { motion } from 'framer-motion';
import type { HabitRow, DailyLogRow } from '@/types/habits';
import { toNumber, buildMiniSeries } from '@/lib/habits-utils';
import Sparkline from './Sparkline';

interface HabitTrackerCardProps {
  habit: HabitRow;
  value: number;
  saving: boolean;
  onValueChange: (habitId: number, nextValue: number) => void;
  onSave: (habitId: number) => void;
  recentLogs: DailyLogRow[];
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-2 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="h-full rounded-full bg-slate-950"
      />
    </div>
  );
}

function RecentMiniList({ logs, habitId }: { logs: DailyLogRow[]; habitId: number }) {
  const entries = logs
    .slice(0, 6)
    .map((log) => {
      const tracking = log.habit_tracking ?? [];
      const record = tracking.find((entry) => entry.habit_id === habitId);
      return { date: log.date, amount: record ? record.amount : null };
    })
    .filter((entry): entry is { date: string; amount: number } => entry.amount !== null);

  if (entries.length === 0) {
    return <div className="mt-2 text-xs text-slate-400">Sin registros recientes.</div>;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {entries.map((entry) => (
        <div
          key={`${habitId}-${entry.date}`}
          className="rounded-full bg-white px-3 py-1 text-xs text-slate-700 shadow-sm"
        >
          <span className="font-semibold text-slate-950">{entry.amount}</span>
          <span className="ml-2 text-slate-400">{entry.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function HabitTrackerCard({
  habit,
  value,
  saving,
  onValueChange,
  onSave,
  recentLogs,
}: HabitTrackerCardProps) {
  const streakProgress =
    habit.longest_streak > 0
      ? (habit.current_streak / habit.longest_streak) * 100
      : habit.current_streak > 0
      ? 100
      : 0;

  const trendLabel = habit.type === 'negative' ? 'evitar' : 'cumplir';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-[1.45rem] border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-slate-950">{habit.name}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
            {habit.type === 'negative' ? 'Hábito a evitar' : 'Hábito positivo'}
          </div>
        </div>
        <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
          {habit.current_streak} en curso
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <MetricPill label="Actual" value={habit.current_streak} />
        <MetricPill label="Récord" value={habit.longest_streak} />
        <MetricPill label="Escudos" value={habit.shields} />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Progreso de racha</span>
          <span>{Math.round(streakProgress)}%</span>
        </div>
        <ProgressBar value={streakProgress} />
        <p className="text-xs text-slate-500">
          {habit.current_streak > 0
            ? `Vas bien: el patrón actual ya tiene ${habit.current_streak} día(s) para ${trendLabel}.`
            : `Sin racha activa todavía. Registra hoy para empezar a ${trendLabel}.`}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <label className="sr-only" htmlFor={`habit-${habit.id}`}>{`Cantidad para ${habit.name}`}</label>
        <input
          id={`habit-${habit.id}`}
          type="number"
          min={0}
          inputMode="numeric"
          value={value}
          onChange={(event) => onValueChange(habit.id, toNumber(event.target.value))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSave(habit.id);
          }}
          className="w-24 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right text-sm font-medium text-slate-950 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
        />
        <button
          type="button"
          onClick={() => onSave(habit.id)}
          disabled={saving}
          className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {habit.type === 'negative' ? (
          <button
            type="button"
            onClick={() => {
              onValueChange(habit.id, 0);
              onSave(habit.id);
            }}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Marcar 0
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Histórico reciente
          </div>
          <RecentMiniList logs={recentLogs} habitId={habit.id} />
        </div>
        <div className="hidden sm:block">
          <Sparkline data={buildMiniSeries(recentLogs, habit.id)} width={120} height={28} />
        </div>
      </div>
    </motion.div>
  );
}
