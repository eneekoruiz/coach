import React from 'react';
import { motion } from 'framer-motion';
import type { HabitMetricConfig, HabitMetricType, HabitRow, DailyLogRow } from '@/types/habits';
import { buildMiniSeries, buildNegativeHabitInsights, toNumber } from '@/lib/habits-utils';
import {
  addHabitMetricValue,
  clampHabitMetricValue,
  formatHabitMetricValue,
  getHabitMetric,
  toggleHabitMetricValue,
} from '@/lib/habit-metrics';
import Sparkline from './Sparkline';
import BottomSheet from './BottomSheet';
import ShareAchievementButton from './ShareAchievementButton';

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
      metricType?: HabitMetricType;
      unitLabel?: string | null;
      stepValue?: number;
      metricConfig?: HabitMetricConfig;
      slipAllowance?: number;
      slipWindowDays?: number;
      slipPenaltyHours?: number;
    }
  ) => Promise<void>;
  recentLogs: DailyLogRow[];
  streakProgress: number;
  trendLabel: string;
  sharePayload?: {
    title: string;
    subtitle: string;
    primaryValue: string;
    primaryLabel: string;
    secondaryValue: string;
    footer: string;
    accentFrom: string;
    accentTo: string;
    badge: string;
    avatarLabel: string;
    filename: string;
  };
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-center">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
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

function RecentMiniList({ logs, habit }: { logs: DailyLogRow[]; habit: HabitRow }) {
  const entries = logs
    .slice(0, 7)
    .map((log) => {
      const tracking = log.habit_tracking ?? [];
      const record = tracking.find((entry) => entry.habit_id === habit.id);
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
          key={`${habit.id}-${entry.date}`}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm"
        >
          <span className="font-black text-slate-950">
            {formatHabitMetricValue(habit, entry.amount, { compact: true })}
          </span>
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
    return (
      <div className="text-sm font-medium text-slate-400">Sin registros para dibujar el mapa.</div>
    );
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
  sharePayload,
}: HabitDetailModalProps) {
  const isPositive = habit.type === 'positive';
  const metric = getHabitMetric(habit);
  const targetValue = metric.targetValue;
  const graceLimit = Math.max(0, habit.tolerance_threshold ?? 0);
  const [thresholdDraft, setThresholdDraft] = React.useState(isPositive ? targetValue : graceLimit);
  const [targetDraft, setTargetDraft] = React.useState(targetValue);
  const [unitDraft, setUnitDraft] = React.useState(metric.unitLabel);
  const [stepDraft, setStepDraft] = React.useState(metric.stepValue);
  const [maxDraft, setMaxDraft] = React.useState<number | ''>(metric.maxValue ?? '');
  const [allowanceDraft, setAllowanceDraft] = React.useState(
    Math.max(0, habit.slip_allowance ?? 1)
  );
  const [windowDraft, setWindowDraft] = React.useState(Math.max(1, habit.slip_window_days ?? 7));
  const [penaltyDraft, setPenaltyDraft] = React.useState(
    Math.max(0, habit.slip_penalty_hours ?? 24)
  );
  const [clockNow, setClockNow] = React.useState(Date.now());
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);

  React.useEffect(() => {
    setThresholdDraft(isPositive ? targetValue : graceLimit);
    setTargetDraft(targetValue);
    setUnitDraft(metric.unitLabel);
    setStepDraft(metric.stepValue);
    setMaxDraft(metric.maxValue ?? '');
    setAllowanceDraft(Math.max(0, habit.slip_allowance ?? 1));
    setWindowDraft(Math.max(1, habit.slip_window_days ?? 7));
    setPenaltyDraft(Math.max(0, habit.slip_penalty_hours ?? 24));
  }, [
    graceLimit,
    habit.slip_allowance,
    habit.slip_penalty_hours,
    habit.slip_window_days,
    isPositive,
    metric.maxValue,
    metric.stepValue,
    metric.unitLabel,
    targetValue,
  ]);

  React.useEffect(() => {
    if (isPositive) return;
    const interval = window.setInterval(() => setClockNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [isPositive]);

  const last30 = recentLogs.slice(0, 30).map((log) => {
    const record = (log.habit_tracking ?? []).find((entry) => entry.habit_id === habit.id);
    return {
      date: log.date,
      amount: record?.amount ?? 0,
      relapseFactor: record?.relapse_factor ?? null,
    };
  });

  const totalVolume = last30.reduce((sum, entry) => sum + entry.amount, 0);
  const successfulDays = last30.filter((entry) =>
    isPositive ? entry.amount >= targetValue : entry.amount <= graceLimit
  ).length;
  const slipDays = last30.filter(
    (entry) => !isPositive && entry.amount > 0 && entry.amount <= graceLimit
  ).length;
  const relapseDays = last30.filter((entry) => !isPositive && entry.amount > graceLimit).length;
  const relapseUnits = last30.reduce((sum, entry) => sum + (!isPositive ? entry.amount : 0), 0);
  const savedMoney =
    relapseDays === 0
      ? Math.round((habit.relapse_unit_cost ?? 0) * Math.max(1, last30.length))
      : Math.max(
          0,
          Math.round((habit.relapse_unit_cost ?? 0) * Math.max(0, last30.length - relapseUnits))
        );
  const savedMinutes = Math.max(
    0,
    Math.round((habit.relapse_unit_minutes ?? 0) * Math.max(0, last30.length - relapseUnits))
  );

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

  const topFactorLabel = topFactor ? (factorLabels[topFactor] ?? topFactor) : 'Sin patrón';
  const negativeInsights = !isPositive
    ? buildNegativeHabitInsights(habit, recentLogs, clockNow)
    : null;

  return (
    <>
      <BottomSheet isOpen={isOpen} onClose={onClose} title={habit.name}>
        <div className="space-y-6 pb-6">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {habit.type === 'negative' ? 'Hábito a evitar' : 'Hábito positivo'}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {isPositive ? (
              <>
                <MetricPill label={`Total ${metric.unitLabel}`} value={Math.round(totalVolume)} />
                <MetricPill
                  label="Consistencia"
                  value={last30.length ? Math.round((successfulDays / last30.length) * 100) : 0}
                />
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
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                  Reloj de sobriedad
                </p>
                <p className="mt-2 text-4xl font-black tracking-tight text-slate-950">
                  {negativeInsights?.sobrietyDays ?? 0}d {negativeInsights?.sobrietyHours ?? 0}h
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  desde la última recaída registrada
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Configuración avanzada
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Tolerancia, detonantes y penalizaciones viven aquí para no sobrecargar la
                      vista principal.
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
                Total: {formatHabitMetricValue(habit, optimisticValue)}
              </span>
            </div>

            {metric.isBoolean ? (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() =>
                    onValueChange(habit.id, toggleHabitMetricValue(habit, optimisticValue))
                  }
                  disabled={isPending}
                  className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-black text-slate-950 transition hover:bg-white active:scale-95 disabled:opacity-50"
                >
                  {optimisticValue >= targetValue ? 'Hecho' : 'Pendiente'}
                </button>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onValueChange(
                      habit.id,
                      addHabitMetricValue(habit, optimisticValue, -metric.stepValue * 5)
                    )
                  }
                  disabled={isPending}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                >
                  -{formatHabitMetricValue(habit, metric.stepValue * 5, { compact: true })}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onValueChange(
                      habit.id,
                      addHabitMetricValue(habit, optimisticValue, -metric.stepValue)
                    )
                  }
                  disabled={isPending}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                >
                  -{formatHabitMetricValue(habit, metric.stepValue, { compact: true })}
                </button>

                <input
                  id={`habit-${habit.id}`}
                  type="number"
                  min={metric.minValue}
                  max={metric.maxValue ?? undefined}
                  step="any"
                  inputMode="decimal"
                  value={optimisticValue}
                  onChange={(event) =>
                    onValueChange(
                      habit.id,
                      clampHabitMetricValue(habit, toNumber(event.target.value))
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onSaveDirect(optimisticValue);
                  }}
                  disabled={isPending}
                  className="min-w-[50px] w-full flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xl font-black text-slate-950 transition focus:border-cyan-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    onValueChange(
                      habit.id,
                      addHabitMetricValue(habit, optimisticValue, metric.stepValue)
                    )
                  }
                  disabled={isPending}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                >
                  +{formatHabitMetricValue(habit, metric.stepValue, { compact: true })}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onValueChange(
                      habit.id,
                      addHabitMetricValue(habit, optimisticValue, metric.stepValue * 5)
                    )
                  }
                  disabled={isPending}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50"
                >
                  +{formatHabitMetricValue(habit, metric.stepValue * 5, { compact: true })}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onSaveDirect(optimisticValue)}
              disabled={isPending}
              className="mt-3 w-full rounded-xl bg-slate-950 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-60"
            >
              {isPending ? 'Guardando...' : 'Confirmar Ajuste'}
            </button>

            {sharePayload && (
              <div className="mt-3 flex justify-center w-full">
                <ShareAchievementButton payload={sharePayload} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">
                  Métrica
                </p>
                <p className="mt-1 text-xs font-semibold text-cyan-800">
                  {metric.type} · paso {formatHabitMetricValue(habit, metric.stepValue)}
                </p>
              </div>
              <span className="rounded-xl bg-white px-3 py-1 text-xs font-black text-cyan-700 ring-1 ring-cyan-100">
                {metric.maxValue === null
                  ? 'Sin límite'
                  : `Máx ${formatHabitMetricValue(habit, metric.maxValue)}`}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-700">
                  Meta
                </span>
                <input
                  type="number"
                  min={0}
                  value={targetDraft}
                  onChange={(event) => setTargetDraft(toNumber(event.target.value))}
                  disabled={!isPositive}
                  className="h-11 w-full rounded-xl border border-cyan-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none disabled:text-slate-400"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-700">
                  Unidad
                </span>
                <input
                  value={unitDraft}
                  onChange={(event) => setUnitDraft(event.target.value.slice(0, 32))}
                  className="h-11 w-full rounded-xl border border-cyan-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-700">
                  Paso
                </span>
                <input
                  type="number"
                  min={0.0001}
                  step="any"
                  value={stepDraft}
                  onChange={(event) => setStepDraft(toNumber(event.target.value))}
                  className="h-11 w-full rounded-xl border border-cyan-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-700">
                  Máx
                </span>
                <input
                  type="number"
                  min={0}
                  value={maxDraft}
                  onChange={(event) =>
                    setMaxDraft(event.target.value === '' ? '' : toNumber(event.target.value))
                  }
                  placeholder="Sin"
                  className="h-11 w-full rounded-xl border border-cyan-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none placeholder:text-slate-400"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                onUpdateSettings(habit.id, {
                  targetValue: isPositive ? Math.max(0, targetDraft) : 0,
                  unit: unitDraft.trim() || null,
                  metricType: metric.type,
                  unitLabel: unitDraft.trim() || null,
                  stepValue: Math.max(0.0001, stepDraft),
                  metricConfig: {
                    min: 0,
                    max: maxDraft === '' ? undefined : Math.max(0, Number(maxDraft)),
                    precision: Number.isInteger(stepDraft) ? 0 : 2,
                    presets: metric.presets,
                    base_unit: unitDraft.trim() || undefined,
                    display_unit: unitDraft.trim() || undefined,
                  },
                })
              }
              className="mt-3 h-11 rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wider text-white transition-all duration-200 ease-in-out active:scale-95 disabled:opacity-60"
            >
              Guardar métrica
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
                <HeatMap
                  entries={last30}
                  isPositive={isPositive}
                  targetValue={targetValue}
                  graceLimit={graceLimit}
                />
                <div className="mt-3 flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-emerald-400" /> limpio
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-amber-400" /> desliz
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded bg-rose-500" /> recaída
                  </span>
                </div>
              </div>
            )}
            <RecentMiniList logs={recentLogs} habit={habit} />
          </div>
        </div>
      </BottomSheet>

      {!isPositive && (
        <BottomSheet
          isOpen={isAdvancedOpen}
          onClose={() => setIsAdvancedOpen(false)}
          title={`Configuración · ${habit.name}`}
        >
          <div className="space-y-4 pb-6">
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">
                Reglas de tolerancia
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">
                    Límite/día
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={thresholdDraft}
                    onChange={(event) => setThresholdDraft(toNumber(event.target.value))}
                    className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">
                    Recaídas
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={allowanceDraft}
                    onChange={(event) => setAllowanceDraft(toNumber(event.target.value))}
                    className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">
                    Ventana
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={windowDraft}
                    onChange={(event) => setWindowDraft(toNumber(event.target.value))}
                    className="h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-center text-sm font-black text-slate-950 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">
                    Penaliza h
                  </span>
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
                Hasta el límite diario penaliza sin romper. Si superas las recaídas permitidas en la
                ventana, el reloj se reinicia.
              </p>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-500">
                Detonante dominante 30d
              </p>
              <p className="mt-1 text-lg font-black text-slate-950">{topFactorLabel}</p>
              <p className="mt-2 text-xs font-semibold text-rose-700">
                {negativeInsights?.totalPenaltyHours ?? 0}h penalizadas ·{' '}
                {negativeInsights?.remainingAllowance ?? 0} recaídas fuertes restantes
              </p>
            </div>
          </div>
        </BottomSheet>
      )}
    </>
  );
}
