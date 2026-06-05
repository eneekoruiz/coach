import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HabitRow, DailyLogRow } from '@/types/habits';
import { toNumber, buildMiniSeries } from '@/lib/habits-utils';
import Sparkline from './Sparkline';
import BottomSheet from './BottomSheet';

interface HabitDetailModalProps {
  habit: HabitRow;
  isOpen: boolean;
  onClose: () => void;
  optimisticValue: number;
  isPending: boolean;
  onValueChange: (habitId: number, nextValue: number) => void;
  onSaveDirect: (val: number) => void;
  recentLogs: DailyLogRow[];
  streakProgress: number;
  trendLabel: string;
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-center">
      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-bold">{label}</div>
      <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
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
        className="h-full rounded-full bg-emerald-500"
      />
    </div>
  );
}

function RecentMiniList({ logs, habitId }: { logs: DailyLogRow[]; habitId: number }) {
  const entries = logs
    .slice(0, 7)
    .map((log) => {
      const tracking = log.habit_tracking ?? [];
      const record = tracking.find((entry) => entry.habit_id === habitId);
      return { date: log.date, amount: record ? record.amount : null };
    })
    .filter((entry): entry is { date: string; amount: number } => entry.amount !== null);

  if (entries.length === 0) {
    return <div className="mt-2 text-sm text-slate-400 font-medium">Sin registros recientes.</div>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map((entry) => (
        <div
          key={`${habitId}-${entry.date}`}
          className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs text-slate-700 shadow-sm flex items-center gap-2"
        >
          <span className="font-black text-slate-950">{entry.amount}</span>
          <span className="text-slate-400 font-medium">{entry.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function HabitDetailModal({
  habit,
  isOpen,
  onClose,
  optimisticValue,
  isPending,
  onValueChange,
  onSaveDirect,
  recentLogs,
  streakProgress,
  trendLabel,
}: HabitDetailModalProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={habit.name}>
      <div className="space-y-6 pb-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 -mt-4 mb-2">
          {habit.type === 'negative' ? 'Hábito a evitar' : 'Hábito positivo'}
        </div>

        {/* Métricas Principales */}
        <div className="grid grid-cols-3 gap-3">
          <MetricPill label="Actual" value={habit.current_streak} />
          <MetricPill label="Récord" value={habit.longest_streak} />
          <MetricPill label="Escudos" value={habit.shields} />
        </div>

        {/* Progreso */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Progreso de racha</span>
            <span className="text-emerald-600">{Math.round(streakProgress)}%</span>
          </div>
          <ProgressBar value={streakProgress} />
          <p className="text-xs text-slate-500 font-medium">
            {habit.current_streak > 0
              ? `Vas bien: el patrón actual ya tiene ${habit.current_streak} día(s) para ${trendLabel}.`
              : `Sin racha activa todavía. Registra hoy para empezar a ${trendLabel}.`}
          </p>
        </div>

        {/* Ajuste Manual (Direct Mode) */}
        <div className="flex flex-col gap-3 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ajuste manual del día
            </span>
            <span className="text-sm font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
              Total: {optimisticValue}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={() => onValueChange(habit.id, Math.max(0, optimisticValue - 5))}
              disabled={isPending}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
            >
              -5
            </button>
            <button
              type="button"
              onClick={() => onValueChange(habit.id, Math.max(0, optimisticValue - 1))}
              disabled={isPending}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
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
                if (event.key === 'Enter') onSaveDirect(optimisticValue);
              }}
              disabled={isPending}
              className="flex-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xl font-black text-slate-950 focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100 transition min-w-[50px]"
            />
            
            <button
              type="button"
              onClick={() => onValueChange(habit.id, optimisticValue + 1)}
              disabled={isPending}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
            >
              +1
            </button>
            <button
              type="button"
              onClick={() => onValueChange(habit.id, optimisticValue + 5)}
              disabled={isPending}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition disabled:opacity-50"
            >
              +5
            </button>
          </div>

          <button
            type="button"
            onClick={() => onSaveDirect(optimisticValue)}
            disabled={isPending}
            className="mt-3 w-full py-3 rounded-xl bg-slate-950 text-white font-bold text-sm hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60 transition shadow-sm"
          >
            {isPending ? 'Guardando...' : 'Confirmar Ajuste'}
          </button>
        </div>

        {/* Sparkline & MiniList */}
        <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 mb-4">
            Histórico reciente
          </div>
          <div className="w-full overflow-hidden bg-white rounded-xl p-3 border border-slate-100 mb-4 shadow-sm">
             <Sparkline data={buildMiniSeries(recentLogs, habit.id)} width={400} height={60} />
          </div>
          <RecentMiniList logs={recentLogs} habitId={habit.id} />
        </div>
      </div>
    </BottomSheet>
  );
}
