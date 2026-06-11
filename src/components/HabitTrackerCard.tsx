import React, { useState, useTransition, useOptimistic, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import type { HabitMetricConfig, HabitMetricType, HabitRow, DailyLogRow } from '@/types/habits';
import HabitDetailModal from './HabitDetailModal';
import { useHaptic } from '@/hooks/useHaptic';
import StreakFlame from './StreakFlame';
import toast from '@/lib/toast';
import BottomSheet from './BottomSheet';
import { buildNegativeHabitInsights } from '@/lib/habits-utils';
import {
  addHabitMetricValue,
  clampHabitMetricValue,
  formatHabitMetricValue,
  getHabitMetric,
  toggleHabitMetricValue,
} from '@/lib/habit-metrics';
import ShareAchievementButton from './ShareAchievementButton';
import { Check, Plus, RotateCcw } from 'lucide-react';

interface HabitTrackerCardProps {
  habit: HabitRow;
  value: number;
  saving: boolean;
  onValueChange: (habitId: number, nextValue: number) => void;
  onSave: (habitId: number) => void;
  onSaveValue: (
    habitId: number,
    nextValue: number,
    metadata?: { relapseFactor?: 'stress' | 'social' | 'boredom' | 'craving' | 'other' | null }
  ) => Promise<void>;
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
}

export default function HabitTrackerCard({
  habit,
  value,
  saving,
  onValueChange,
  onSave,
  onSaveValue,
  onUpdateSettings,
  recentLogs,
}: HabitTrackerCardProps) {
  const haptic = useHaptic();
  const [isPending, startTransition] = useTransition();
  const [optimisticValue, setOptimisticValue] = useOptimistic(
    value,
    (state, newValue: number) => newValue
  );

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const cardControls = useAnimation();
  const buttonControls = useAnimation();
  const flameControls = useAnimation();
  const [showGlow, setShowGlow] = useState(false);
  const [showPerfectWeek, setShowPerfectWeek] = useState(false);
  const [isRelapseOpen, setIsRelapseOpen] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const longPressTimerRef = useRef<number | null>(null);
  const longPressConsumedRef = useRef(false);

  const prevStreakRef = useRef(habit.current_streak);
  const isPositive = habit.type === 'positive';
  const metric = getHabitMetric(habit);

  useEffect(() => {
    if (isPositive) return;
    const interval = window.setInterval(() => setClockNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [isPositive]);
  const targetValue = metric.targetValue;
  const graceLimit = Math.max(0, habit.tolerance_threshold ?? 0);
  const isGoalMetToday = isPositive
    ? optimisticValue >= targetValue
    : optimisticValue <= graceLimit;
  const isPerfectNegative = !isPositive && optimisticValue === 0;
  const isSlipNegative = !isPositive && optimisticValue > 0 && optimisticValue <= graceLimit;

  const displayedStreak = isPositive
    ? isGoalMetToday
      ? habit.current_streak + 1
      : habit.current_streak
    : isPerfectNegative
      ? habit.current_streak + 1
      : isSlipNegative
        ? habit.current_streak
        : 0;

  const prevDisplayedStreakRef = useRef(displayedStreak);

  // Micro-interaction: scale up flame and vibrate on streak change
  useEffect(() => {
    if (displayedStreak !== prevDisplayedStreakRef.current) {
      flameControls.start({
        scale: [1, 1.35, 1],
        transition: { type: 'spring', stiffness: 400, damping: 15 },
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([20, 30, 20]);
      }
      prevDisplayedStreakRef.current = displayedStreak;
    }
  }, [displayedStreak, flameControls]);

  // Milestone Celebration logic
  useEffect(() => {
    const prevStreak = prevStreakRef.current;
    const currentStreak = habit.current_streak;

    if (currentStreak > prevStreak) {
      const isMilestone =
        currentStreak > 0 &&
        (currentStreak % 7 === 0 ||
          currentStreak === 30 ||
          currentStreak === 50 ||
          currentStreak === 100);
      if (isMilestone) {
        cardControls.start({
          scale: [1, 1.3, 0.95, 1],
          transition: { type: 'spring', stiffness: 200, damping: 10 },
        });

        setShowPerfectWeek(true);
        setTimeout(() => setShowPerfectWeek(false), 3000);
      }
    }
    prevStreakRef.current = currentStreak;
  }, [habit.current_streak, cardControls]);

  // Sync prop changes
  useEffect(() => {
    startTransition(() => {
      setOptimisticValue(value);
    });
  }, [value, setOptimisticValue]);

  const undoHabitAction = (undoValue: number) => {
    onValueChange(habit.id, undoValue);
    startTransition(async () => {
      setOptimisticValue(undoValue);
      try {
        await onSaveValue(habit.id, undoValue);
        toast.success('Hábito revertido');
      } catch {
        onValueChange(habit.id, value);
      }
    });
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (longPressConsumedRef.current) {
      longPressConsumedRef.current = false;
      return;
    }
    if (!isPositive) {
      setIsRelapseOpen(true);
      return;
    }
    haptic.success();

    buttonControls.start({
      scale: [1, 1.15, 0.9, 1],
      transition: { duration: 0.25 },
    });

    const previousValue = optimisticValue;
    const nextVal = metric.isBoolean
      ? toggleHabitMetricValue(habit, optimisticValue)
      : addHabitMetricValue(habit, optimisticValue, metric.stepValue);
    onValueChange(habit.id, nextVal);

    setShowGlow(true);
    setTimeout(() => setShowGlow(false), 800);

    toast.warning(metric.isBoolean && nextVal === 0 ? 'Registro desmarcado' : 'Registro añadido', {
      description: metric.isBoolean
        ? `${habit.name}: ${formatHabitMetricValue(habit, nextVal)}.`
        : `Has sumado ${formatHabitMetricValue(habit, metric.stepValue)} a "${habit.name}" hoy.`,
      action: {
        label: 'Deshacer',
        onClick: () => undoHabitAction(previousValue),
      },
    });

    startTransition(async () => {
      setOptimisticValue(nextVal);
      try {
        await onSaveValue(habit.id, nextVal);
      } catch {
        onValueChange(habit.id, value);
      }
    });
  };

  const confirmRelapse = (factor: 'stress' | 'social' | 'boredom' | 'craving' | 'other') => {
    haptic.warning();
    const nextVal = addHabitMetricValue(habit, optimisticValue, metric.stepValue);
    setIsRelapseOpen(false);
    onValueChange(habit.id, nextVal);
    startTransition(async () => {
      setOptimisticValue(nextVal);
      try {
        await onSaveValue(habit.id, nextVal, { relapseFactor: factor });
        toast.warning('Recaída registrada', {
          description: 'No rompe tu progreso: ahora sabemos qué detonante vigilar.',
        });
      } catch {
        onValueChange(habit.id, value);
      }
    });
  };

  const handleSaveDirect = (val: number) => {
    const nextValue = clampHabitMetricValue(habit, val);
    startTransition(async () => {
      setOptimisticValue(nextValue);
      try {
        await onSaveValue(habit.id, nextValue);
      } catch {
        // Rollback is automated
      }
    });
  };

  const streakProgress =
    habit.longest_streak > 0
      ? (displayedStreak / habit.longest_streak) * 100
      : displayedStreak > 0
        ? 100
        : 0;

  const trendLabel = habit.type === 'negative' ? 'evitar' : 'cumplir';
  const isExceededNegative = !isPositive && optimisticValue > graceLimit;
  const negativeInsights = !isPositive
    ? buildNegativeHabitInsights(habit, recentLogs, clockNow)
    : null;
  const sharePayload = isPositive
    ? {
        title: habit.name,
        subtitle: 'Racha de constancia en BioAvatar',
        primaryValue: String(displayedStreak),
        primaryLabel: 'días en racha',
        secondaryValue: `Hoy llevas ${formatHabitMetricValue(habit, optimisticValue)} de ${formatHabitMetricValue(habit, targetValue)}.`,
        footer: 'Consistencia real, no motivación vacía.',
        accentFrom: '#10b981',
        accentTo: '#38bdf8',
        badge: 'Habit Streak',
        avatarLabel: habit.name.charAt(0),
        filename: `habit-${habit.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      }
    : {
        title: habit.name,
        subtitle: 'Reloj de sobriedad en BioAvatar',
        primaryValue: `${negativeInsights?.sobrietyDays ?? 0}d`,
        primaryLabel: `${negativeInsights?.sobrietyHours ?? 0}h limpio`,
        secondaryValue:
          graceLimit > 0
            ? `Límite flexible ${graceLimit}/día. Una recaída penaliza, pero no borra toda tu historia.`
            : 'Modo estricto: cada día limpio alimenta tu reloj de sobriedad.',
        footer: 'Resiliencia visible y medible.',
        accentFrom: '#fb7185',
        accentTo: '#f97316',
        badge: 'Sobriety Clock',
        avatarLabel: habit.name.charAt(0),
        filename: `sobriety-${habit.name.toLowerCase().replace(/\s+/g, '-')}.png`,
      };
  const primaryActionLabel = metric.isBoolean
    ? isGoalMetToday
      ? 'Hecho'
      : 'Marcar'
    : `+ ${formatHabitMetricValue(habit, metric.stepValue, { compact: true })}`;

  const startLongPress = () => {
    if (!isPositive) return;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressConsumedRef.current = true;
      setIsDetailOpen(true);
      longPressTimerRef.current = null;
    }, 550);
  };

  const cancelLongPress = () => {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <AnimatePresence>
          {showPerfectWeek && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
              className="flex min-h-[34px] items-center justify-center gap-1.5 rounded-full border border-amber-200 bg-amber-500 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-white shadow-sm"
            >
              <span>🏆</span> ¡SEMANA PERFECTA!
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{
            opacity: 1,
            y: 0,
            backgroundColor: isExceededNegative ? '#fef2f2' : 'transparent',
          }}
          transition={{ duration: 0.3 }}
          onClick={() => setIsDetailOpen(true)}
          className={`group flex flex-col sm:flex-row w-full min-w-0 items-stretch sm:items-center justify-between gap-3 p-4 cursor-pointer transition-all duration-300 hover:bg-slate-50 ${showGlow ? 'ring-2 ring-emerald-400' : ''}`}
        >
          <div className="flex items-start gap-3 min-w-0 w-full sm:w-auto sm:flex-1">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}
            >
              <span className="text-sm font-black">{habit.name.charAt(0).toUpperCase()}</span>
            </div>

            <div className="min-w-0 flex-1">
              <h3
                className={`text-sm font-black w-full break-words whitespace-normal transition-colors duration-300 ${isExceededNegative ? 'text-rose-900' : 'text-slate-900'}`}
              >
                {habit.name}
              </h3>
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] ${
                  isPositive
                    ? 'bg-emerald-100 text-emerald-700'
                    : isSlipNegative
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                }`}
              >
                {isPositive
                  ? 'Construcción'
                  : isSlipNegative
                    ? 'Penaliza, no rompe'
                    : 'Días limpio'}
              </span>
              {isPositive ? (
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Meta: {formatHabitMetricValue(habit, targetValue)}/día
                </p>
              ) : (
                <p
                  className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 transition-colors duration-300 ${isExceededNegative ? 'text-rose-600' : isSlipNegative ? 'text-amber-600' : 'text-slate-400'}`}
                >
                  {graceLimit > 0 ? `Límite flexible: ${graceLimit}/día` : 'Modo estricto: 0/día'}
                </p>
              )}
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className={`text-2xl font-black tabular-nums tracking-tighter transition-colors duration-300 ${isExceededNegative ? 'text-rose-600' : 'text-slate-900'}`}
                >
                  {metric.isBoolean ? (isGoalMetToday ? 'OK' : '--') : optimisticValue}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {metric.type === 'boolean' ? 'hoy' : metric.unitLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2.5 mt-3 pt-3 border-t border-slate-100 sm:border-t-0 sm:mt-0 sm:pt-0 sm:shrink-0">
            {isPositive ? (
              <motion.div animate={flameControls}>
                <StreakFlame streak={displayedStreak} />
              </motion.div>
            ) : (
              <div className="grid max-w-[132px] grid-cols-1 gap-1 text-right sm:max-w-none">
                <div className="rounded-2xl border border-rose-100 bg-white/85 px-3 py-2 shadow-sm">
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-rose-400">
                    Racha
                  </p>
                  <p className="mt-1 text-sm font-black leading-none text-slate-950">
                    {displayedStreak}d
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white/85 px-3 py-2 shadow-sm">
                  <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-400">
                    Reloj
                  </p>
                  <p className="mt-1 text-sm font-black leading-none text-slate-950">
                    {negativeInsights?.sobrietyDays ?? 0}d {negativeInsights?.sobrietyHours ?? 0}h
                  </p>
                </div>
              </div>
            )}

            <motion.button
              animate={buttonControls}
              whileTap={{ scale: 0.9 }}
              onClick={handleIncrement}
              onPointerDown={startLongPress}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              disabled={isPending}
              className={`flex min-h-[44px] items-center justify-center text-white font-black shadow-sm transition-all duration-200 ease-in-out disabled:opacity-50 ${
                isPositive
                  ? metric.isBoolean
                    ? 'h-11 min-w-11 rounded-full bg-emerald-500 px-3 text-[11px] uppercase tracking-[0.08em] hover:bg-emerald-600'
                    : 'rounded-2xl bg-emerald-500 px-3 text-[11px] uppercase tracking-[0.08em] hover:bg-emerald-600'
                  : 'rounded-2xl bg-rose-500 px-3 text-[11px] uppercase tracking-[0.08em] hover:bg-rose-600'
              }`}
            >
              {isPositive ? (
                <span className="inline-flex items-center gap-1">
                  {metric.isBoolean ? (
                    isGoalMetToday ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )
                  ) : (
                    <Plus className="h-3.5 w-3.5" />
                  )}
                  {primaryActionLabel}
                </span>
              ) : (
                'Registrar Recaída'
              )}
            </motion.button>
          </div>
        </motion.div>
        <div className="mt-2 flex justify-end">
          <ShareAchievementButton payload={sharePayload} />
        </div>
      </div>

      <BottomSheet
        isOpen={isRelapseOpen}
        onClose={() => setIsRelapseOpen(false)}
        title="Registrar recaída"
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-400">
            Resiliencia
          </p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">{habit.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Marca qué lo provocó. Sirve para detectar patrones y ayudarte mejor la próxima vez.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              ['stress', 'Estrés'],
              ['social', 'Social'],
              ['boredom', 'Aburrimiento'],
              ['craving', 'Antojo'],
              ['other', 'Otro'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  confirmRelapse(value as 'stress' | 'social' | 'boredom' | 'craving' | 'other')
                }
                className="min-h-[44px] rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 transition-all duration-200 ease-in-out hover:bg-white active:scale-95"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>

      <HabitDetailModal
        habit={habit}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        optimisticValue={optimisticValue}
        isPending={isPending}
        onValueChange={onValueChange}
        onSaveDirect={handleSaveDirect}
        onUpdateSettings={onUpdateSettings}
        recentLogs={recentLogs}
        streakProgress={streakProgress}
        trendLabel={trendLabel}
      />
    </>
  );
}
