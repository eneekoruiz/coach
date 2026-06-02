import React, { useState, useTransition, useOptimistic } from 'react';
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
  onSaveValue: (habitId: number, nextValue: number) => Promise<void>;
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
  onSaveValue,
  recentLogs,
}: HabitTrackerCardProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticValue, setOptimisticValue] = useOptimistic(
    value,
    (state, newValue: number) => newValue
  );
  const [mode, setMode] = useState<'quick' | 'direct'>('quick');

  const handleIncrement = () => {
    const nextVal = optimisticValue + 1;
    onValueChange(habit.id, nextVal);
    startTransition(async () => {
      setOptimisticValue(nextVal);
      try {
        await onSaveValue(habit.id, nextVal);
      } catch {
        onValueChange(habit.id, value);
      }
    });
  };

  const handleDecrement = () => {
    const nextVal = Math.max(0, optimisticValue - 1);
    onValueChange(habit.id, nextVal);
    startTransition(async () => {
      setOptimisticValue(nextVal);
      try {
        await onSaveValue(habit.id, nextVal);
      } catch {
        onValueChange(habit.id, value);
      }
    });
  };

  const handleSaveDirect = (val: number) => {
    startTransition(async () => {
      setOptimisticValue(val);
      try {
        await onSaveValue(habit.id, val);
      } catch {
        // Rollback is automated
      }
    });
  };

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

      {/* Selector de Modo de Registro */}
      <div className="mt-4 flex rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode('quick')}
          className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all ${
            mode === 'quick'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ⚡ Registro 1 a 1
        </button>
        <button
          type="button"
          onClick={() => setMode('direct')}
          className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition-all ${
            mode === 'direct'
              ? 'bg-white text-slate-950 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          📅 Total del Día
        </button>
      </div>

      {/* Contenido según el Modo */}
      <div className="mt-3">
        {mode === 'quick' ? (
          <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-2xl border border-slate-100/60">
            <span className="text-4xl font-extrabold tracking-tight text-slate-950 select-none">
              {optimisticValue}
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 mt-1 select-none font-medium">
              {habit.type === 'negative' ? 'caídas hoy' : 'logros hoy'}
            </span>
            
            <div className="mt-4 flex items-center gap-4">
              {/* Decremento (-1) para deshacer error */}
              <button
                type="button"
                onClick={handleDecrement}
                disabled={isPending || optimisticValue === 0}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition active:scale-90 disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                title="Restar 1 (Deshacer error)"
              >
                <span className="text-base font-bold">-1</span>
              </button>

              {/* Botón principal gigante y animado para +1 */}
              <button
                type="button"
                onClick={handleIncrement}
                disabled={isPending}
                className={`relative group inline-flex h-20 w-20 flex-col items-center justify-center rounded-full text-white shadow-md transition active:scale-95 disabled:opacity-50 select-none ${
                  habit.type === 'negative'
                    ? 'bg-gradient-to-br from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700'
                    : 'bg-gradient-to-br from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700'
                }`}
              >
                <span className="text-2xl font-black">+1</span>
                <span className="text-[8px] uppercase tracking-wider font-bold opacity-90 mt-0.5">
                  {habit.type === 'negative' ? 'Añadir' : 'Registrar'}
                </span>
              </button>

              {/* Botón rápido o indicador */}
              {habit.type === 'negative' ? (
                <button
                  type="button"
                  onClick={() => {
                    onValueChange(habit.id, 0);
                    handleSaveDirect(0);
                  }}
                  disabled={isPending || optimisticValue === 0}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition active:scale-90 disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                  title="Marcar día limpio (0 consumos)"
                >
                  <span className="text-xs font-bold">Limpio</span>
                </button>
              ) : (
                <div className="w-11 h-11 flex items-center justify-center">
                  {optimisticValue > 0 && (
                    <span className="text-emerald-500 text-xl font-bold animate-bounce">✓</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total acumulado del día:
              </span>
              <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-100 shadow-sm">
                {optimisticValue}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(0, optimisticValue - 5);
                  onValueChange(habit.id, val);
                }}
                disabled={isPending}
                className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = Math.max(0, optimisticValue - 1);
                  onValueChange(habit.id, val);
                }}
                disabled={isPending}
                className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
              >
                -1
              </button>
              
              <input
                id={`habit-${habit.id}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={optimisticValue}
                onChange={(event) => onValueChange(habit.id, toNumber(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSaveDirect(optimisticValue);
                }}
                disabled={isPending}
                className="flex-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-base font-semibold text-slate-950 focus:border-slate-300 focus:outline-none transition shadow-inner min-w-[50px]"
                placeholder="0"
              />
              
              <button
                type="button"
                onClick={() => {
                  const val = optimisticValue + 1;
                  onValueChange(habit.id, val);
                }}
                disabled={isPending}
                className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = optimisticValue + 5;
                  onValueChange(habit.id, val);
                }}
                disabled={isPending}
                className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
              >
                +5
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSaveDirect(optimisticValue)}
              disabled={isPending}
              className="mt-2 w-full py-2.5 rounded-xl bg-slate-950 text-white font-bold text-sm hover:bg-slate-900 active:scale-[0.98] disabled:opacity-60 transition shadow-sm"
            >
              {isPending ? 'Guardando...' : 'Guardar Total del Día'}
            </button>
          </div>
        )}
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
