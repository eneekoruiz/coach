import React from 'react';
import { motion } from 'framer-motion';
import type { HabitRow, DailyLogRow } from '@/types/habits';
import { buildMiniSeries, buildNegativeHabitInsights, toNumber } from '@/lib/habits-utils';
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
  onUpdateSettings: (
    habitId: number,
    settings: {
      toleranceThreshold?: number;
      targetValue?: number;
      unit?: string | null;
      slipAllowance?: number;
      slipWindowDays?: number;
      slipPenaltyHours?: number;
    }
  ) => Promise<void>;
  recentLogs: DailyLogRow[];
  streakProgress: number;
  trendLabel: string;
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
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
    return <div className="mt-2 text-sm font-medium text-slate-400">Sin registros recientes.</div>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map((entry) => (
        <div
          key={`${habitId}-${entry.date}`}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm"
        >
          <span className="font-black text-slate-950">{entry.amount}</span>
          <span className="font-medium text-slate-400">{entry.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function HeatMap({
  entries,
  isPositive,
  targetValue,
  graceLimit,
}: {
  entries: Array<{ date: string; amount: number; relapseFactor: string | null }>;
  isPositive: boolean;
  targetValue: number;
  graceLimit: number;
}) {
  if (entries.length === 0) {
    return <div className="text-sm font-medium text-slate-400">Sin registros para dibujar el mapa.</div>;
  }

  return (
    <div className="grid w-full grid-cols-5 gap-1.5 sm:grid-cols-10">
      {entries
        .slice()
        .reverse()
        .map((entry) => {
          const completed = isPositive ? entry.amount >= targetValue : entry.amount === 0;
          const slipped = !isPositive && entry.amount > 0 && entry.amount <= graceLimit;
          const className = isPositive
            ? completed
              ? 'bg-emerald-500'
              : 'bg-slate-200'
            : completed
              ? 'bg-emerald-400'
              : slipped
                ? 'bg-amber-400'
                : 'bg-rose-500';

          return (
            <div
              key={entry.date}
              title={`${entry.date}: ${entry.amount}`}
              className={`h-7 rounded-lg border border-white shadow-sm ${className}`}
            />
          );
        })}
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
  onUpdateSettings,
  recentLogs,
  streakProgress,
  trendLabel,
}: HabitDetailModalProps) {
  const isPositive = habit.type === 'positive';
  const targetValue = habit.target_value ?? habit.tolerance_threshold ?? 1;
  const graceLimit = Math.max(0, habit.tolerance_threshold ?? 0);
  const [thresholdDraft, setThresholdDraft] = React.useState(isPositive ? targetValue : graceLimit);
  const [allowanceDraft, setAllowanceDraft] = React.useState(Math.max(0, habit.slip_allowance ?? 1));
  const [windowDraft, setWindowDraft] = React.useState(Math.max(1, habit.slip_window_days ?? 7));
  const [penaltyDraft, setPenaltyDraft] = React.useState(Math.max(0, habit.slip_penalty_hours ?? 24));
  const [clockNow, setClockNow] = React.useState(Date.now());
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

  React.useEffect(() => {
    setThresholdDraft(isPositive ? targetValue : graceLimit);
    setAllowanceDraft(Math.max(0, habit.slip_allowance ?? 1));
    setWindowDraft(Math.max(1, habit.slip_window_days ?? 7));
    setPenaltyDraft(Math.max(0, habit.slip_penalty_hours ?? 24));
  }, [graceLimit, habit.slip_allowance, habit.slip_penalty_hours, habit.slip_window_days, isPositive, targetValue]);

  React.useEffect(() => {
    if (isPositive) return;
    const interval = window.setInterval(() => setClockNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [isPositive]);

  const last30 = recentLogs.slice(0, 30).map((log) => {
    const record = (log.habit_tracking ?? []).find((entry) => entry.habit_id === habit.id);
    return { date: log.date, amount: record?.amount ?? 0, relapseFactor: record?.relapse_factor ?? null };
  });

  const totalVolume = last30.reduce((sum, entry) => sum + entry.amount, 0);
  const successfulDays = last30.filter((entry) => (isPositive ? entry.amount >= targetValue : entry.amount <= graceLimit)).length;
  const slipDays = last30.filter((entry) => !isPositive && entry.amount > 0 && entry.amount <= graceLimit).length;
  const relapseDays = last30.filter((entry) => !isPositive && entry.amount > graceLimit).length;
  const relapseUnits = last30.reduce((sum, entry) => sum + (!isPositive ? entry.amount : 0), 0);
  const savedMoney = relapseDays === 0
    ? Math.round((habit.relapse_unit_cost ?? 0) * Math.max(1, last30.length))
    : Math.max(0, Math.round((habit.relapse_unit_cost ?? 0) * Math.max(0, last30.length - relapseUnits)));
  const savedMinutes = Math.max(0, Math.round((habit.relapse_unit_minutes ?? 0) * Math.max(0, last30.length - relapseUnits)));

  const factorLabels: Record<string, string> = {
    stress: 'Estrés',
    social: 'Social',
    boredom: 'Aburrimiento',
    craving: 'Antojo',
    other: 'Otro',
  };

  const topFactor = Object.entries(
    last30.reduce<Record<string, number>>((acc, entry) => {
      if (entry.relapseFactor) acc[entry.relapseFactor] = (acc[entry.relapseFactor] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0]?.[0];

  const topFactorLabel = topFactor ? factorLabels[topFactor] ?? topFactor : 'Sin patrón';
  const negativeInsights = !isPositive ? buildNegativeHabitInsights(habit, recentLogs, clockNow) : null;

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title={habit.name}>
        <div className="space-y-6 pb-6">
          <div className="mb-2 -mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {habit.type === 'negative' ? 'Hábito a evitar' : 'Hábito positivo'}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {isPositive ? (
              <>
                <MetricPill label={`Volumen ${habit.unit ?? ''}`} value={Math.round(totalVolume)} />
                <MetricPill label="Consistencia" value={last30.length ? Math.round((successfulDays / last30.length) * 100) : 0} />
                <MetricPill label="Récord" value={habit.longest_streak} />
              </>
            ) : (
              <>
                <MetricPill label="Ahorro €" value={savedMoney} />
                <MetricPill label="Min ahorro" value={savedMinutes} />
                <MetricPill label="Deslices" value={slipDays} />
              </>
            )}
          </div>

          {!isPositive && (
            <div className="grid gap-3">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Reloj de sobriedad</p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                  {negativeInsights?.sobrietyDays ?? 0}d {negativeInsights?.sobrietyHours ?? 0}h
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">desde la última recaída registrada</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Configuración avanzada</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Tolerancia, detonantes y penalizaciones viven aquí para no sobrecargar la vista principal.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAdvancedOpen(true)}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-700 transition hover:bg-white active:scale-95"
                  >
                    Configurar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span>Progreso de racha</span>
              <span className="text-emerald-600">{Math.round(streakProgress)}%</span>
            </div>
            <ProgressBar value={streakProgress} />
            <p className="text-xs font-medium text-slate-500">
              {habit.current_streak > 0
                ? `Vas bien: el patrón actual ya tiene ${habit.current_streak} día(s) para ${trendLabel}.`
                : `Sin racha activa todavía. Registra hoy para empezar a ${trendLabel}.`}
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Ajuste manual del día
              </span>
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-sm font-black text-slate-900">
                Total: {optimisticValue}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onValueChange(habit.id, Math.max(0, optimisticValue - 5))}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              >
                -5
              </button>
              <button
                type="button"
                onClick={() => onValueChange(habit.id, Math.max(0, optimisticValue - 1))}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
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
                className="min-w-[50px] w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xl font-black text-slate-950 transition focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
              />

              <button
                type="button"
                onClick={() => onValueChange(habit.id, optimisticValue + 1)}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => onValueChange(habit.id, optimisticValue + 5)}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
              >
                +5
              </button>
            </div>

            <button
              type="button"
              onClick={() => onSaveDirect(optimisticValue)}
              disabled={isPending}
              className="mt-3 w-full rounded-xl bg-slate-950 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
            >
              {isPending ? 'Guardando...' : 'Confirmar Ajuste'}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {isPositive ? 'Histórico reciente' : 'Mapa inverso de resiliencia'}
            </div>
            {isPositive ? (
              <div className="mb-4 w-full overflow-hidden rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <Sparkline data={buildMiniSeries(recentLogs, habit.id)} width={280} height={60} />
              </div>
            ) : (
              <div className="mb-4 w-full overflow-hidden rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                <HeatMap entries={last30} isPositive={isPositive} targetValue={targetValue} graceLimit={graceLimit} />
                <div className="mt-3 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-emerald-400" /> limpio</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-amber-400" /> desliz</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-rose-500" /> recaída</span>
                </div>
              </div>
            )}
            <RecentMiniList logs={recentLogs} habitId={habit.id} />
          </div>
        </div>
      </BottomSheet>

      {!isPositive && (
        <BottomSheet isOpen={isAdvancedOpen} onClose={() => setIsAdvancedOpen(false)} title={`Configuración · ${habit.name}`}>
          <div className="space-y-4 pb-6">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Reglas de tolerancia</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">Límite/día</span>
                  <input
                    type="number"
                    min={0}
                    value={thresholdDraft}
                    onChange={(event) => setThresholdDraft(toNumber(event.target.value))}
                    className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">Recaídas</span>
                  <input
                    type="number"
                    min={0}
                    value={allowanceDraft}
                    onChange={(event) => setAllowanceDraft(toNumber(event.target.value))}
                    className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">Ventana</span>
                  <input
                    type="number"
                    min={1}
                    value={windowDraft}
                    onChange={(event) => setWindowDraft(toNumber(event.target.value))}
                    className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">Penaliza h</span>
                  <input
                    type="number"
                    min={0}
                    value={penaltyDraft}
                    onChange={(event) => setPenaltyDraft(toNumber(event.target.value))}
                    className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  onUpdateSettings(habit.id, {
                    toleranceThreshold: Math.max(0, Math.floor(thresholdDraft)),
                    slipAllowance: Math.max(0, Math.floor(allowanceDraft)),
                    slipWindowDays: Math.max(1, Math.floor(windowDraft)),
                    slipPenaltyHours: Math.max(0, Math.floor(penaltyDraft)),
                  })
                }
                className="mt-3 h-11 rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wider text-white transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-60"
              >
                Guardar reglas
              </button>
              <p className="mt-2 text-xs font-semibold leading-5 text-amber-800">
                Hasta el límite diario penaliza sin romper. Si superas las recaídas permitidas en la ventana, el reloj se reinicia.
              </p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">Detonante dominante 30d</p>
              <p className="mt-1 text-lg font-black text-slate-950">{topFactorLabel}</p>
              <p className="mt-2 text-xs font-semibold text-rose-700">
                {negativeInsights?.totalPenaltyHours ?? 0}h penalizadas · {negativeInsights?.remainingAllowance ?? 0} recaídas fuertes restantes
              </p>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
