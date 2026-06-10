import React, { useState, useTransition, useOptimistic, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import type { HabitRow, DailyLogRow } from '@/types/habits';
import HabitDetailModal from './HabitDetailModal';
import { useHaptic } from '@/hooks/useHaptic';
import StreakFlame from './StreakFlame';
import toast from '@/lib/toast';
import BottomSheet from './BottomSheet';
import { buildNegativeHabitInsights } from '@/lib/habits-utils';
import ShareAchievementButton from './ShareAchievementButton';

interface HabitTrackerCardProps {
  habit: HabitRow;
  value: number;
  saving: boolean;
  onValueChange: (habitId: number, nextValue: number) => void;
  onSave: (habitId: number) => void;
  onSaveValue: (habitId: number, nextValue: number, metadata?: { relapseFactor?: 'stress' | 'social' | 'boredom' | 'craving' | 'other' | null }) => Promise<void>;
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

  const prevStreakRef = useRef(habit.current_streak);
  const isPositive = habit.type === 'positive';

  useEffect(() => {
    if (isPositive) return;
    const interval = window.setInterval(() => setClockNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [isPositive]);
  const targetValue = habit.target_value ?? habit.tolerance_threshold ?? 1;
  const graceLimit = Math.max(0, habit.tolerance_threshold ?? 0);
  const isGoalMetToday = isPositive
    ? optimisticValue >= targetValue
    : optimisticValue <= graceLimit;
  const isPerfectNegative = !isPositive && optimisticValue === 0;
  const isSlipNegative = !isPositive && optimisticValue > 0 && optimisticValue <= graceLimit;

  const displayedStreak = isPositive
    ? (isGoalMetToday ? habit.current_streak + 1 : habit.current_streak)
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
        transition: { type: 'spring', stiffness: 400, damping: 15 }
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
      const isMilestone = currentStreak > 0 && (currentStreak % 7 === 0 || currentStreak === 30 || currentStreak === 50 || currentStreak === 100);
      if (isMilestone) {
        cardControls.start({
          scale: [1, 1.3, 0.95, 1],
          transition: { type: 'spring', stiffness: 200, damping: 10 }
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

  const undoLastHabitAction = () => {
    const nextVal = Math.max(0, optimisticValue - 1);
    onValueChange(habit.id, nextVal);
    startTransition(async () => {
      setOptimisticValue(nextVal);
      try {
        await onSaveValue(habit.id, nextVal);
        toast.success("Hábito revertido");
      } catch {
        onValueChange(habit.id, value);
      }
    });
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isPositive) {
      setIsRelapseOpen(true);
      return;
    }
    haptic.success();
    
    buttonControls.start({
      scale: [1, 1.15, 0.9, 1],
      transition: { duration: 0.25 }
    });

    const nextVal = optimisticValue + 1;
    onValueChange(habit.id, nextVal);
    
    setShowGlow(true);
    setTimeout(() => setShowGlow(false), 800);

    toast.warning("Registro añadido", {
      description: `Has sumado 1 unidad a "${habit.name}" hoy.`,
      action: {
        label: 'Deshacer',
        onClick: () => undoLastHabitAction(),
      }
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
    const nextVal = optimisticValue + 1;
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
      ? (displayedStreak / habit.longest_streak) * 100
      : displayedStreak > 0
      ? 100
      : 0;

  const trendLabel = habit.type === 'negative' ? 'evitar' : 'cumplir';
  const isExceededNegative = !isPositive && optimisticValue > graceLimit;
  const negativeInsights = !isPositive ? buildNegativeHabitInsights(habit, recentLogs, clockNow) : null;
  const sharePayload = isPositive
    ? {
        title: habit.name,
        subtitle: 'Racha de constancia en BioAvatar',
        primaryValue: String(displayedStreak),
        primaryLabel: 'días en racha',
        secondaryValue: `Hoy llevas ${optimisticValue}/${targetValue}${habit.unit ? ` ${habit.unit}` : ''}.`,
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

  return (
    <>
      <div className="relative">
        <AnimatePresence>
          {showPerfectWeek && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.8, x: '-50%' }}
              animate={{ opacity: 1, y: -45, scale: 1.2, x: '-50%' }}
              exit={{ opacity: 0, y: -60, scale: 0.8, x: '-50%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 12 }}
              className="absolute top-0 left-1/2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-white font-extrabold text-xs px-4 py-1.5 rounded-full shadow-lg border border-yellow-300 z-30 uppercase tracking-widest flex items-center gap-1.5 pointer-events-none"
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
            backgroundColor: isExceededNegative ? '#fef2f2' : '#ffffff',
            borderColor: isExceededNegative ? '#fecaca' : '#e2e8f0',
          }}
          transition={{ duration: 0.3 }}
          onClick={() => setIsDetailOpen(true)}
          className={`group flex items-center justify-between p-3 rounded-2xl border shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 ${
            isPositive
              ? 'bg-[linear-gradient(135deg,#ffffff_0%,#f0fdf4_100%)]'
              : 'bg-[linear-gradient(135deg,#ffffff_0%,#fff1f2_100%)]'
          } ${showGlow ? 'ring-2 ring-emerald-400 shadow-emerald-100' : ''}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              <span className="text-sm font-black">{habit.name.charAt(0).toUpperCase()}</span>
            </div>
            
            <div className="min-w-0 flex-1">
              <h3 className={`text-sm font-black truncate transition-colors duration-300 ${isExceededNegative ? 'text-rose-900' : 'text-slate-900'}`}>{habit.name}</h3>
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] ${
                isPositive
                  ? 'bg-emerald-100 text-emerald-700'
                  : isSlipNegative
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-rose-100 text-rose-700'
              }`}>
                {isPositive ? 'Construcción' : isSlipNegative ? 'Penaliza, no rompe' : 'Días limpio'}
              </span>
              {isPositive ? (
                <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Meta: {targetValue}{habit.unit ? ` ${habit.unit}` : ''}/día
                </p>
              ) : (
                <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 transition-colors duration-300 ${isExceededNegative ? 'text-rose-600' : isSlipNegative ? 'text-amber-600' : 'text-slate-400'}`}>
                  {graceLimit > 0 ? `Límite flexible: ${graceLimit}/día` : 'Modo estricto: 0/día'}
                </p>
              )}
              <div className="mt-1 flex items-baseline gap-1">
                <span className={`text-2xl font-black tabular-nums tracking-tighter transition-colors duration-300 ${isExceededNegative ? 'text-rose-600' : 'text-slate-900'}`}>
                  {optimisticValue}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">hoy</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {isPositive ? (
              <motion.div animate={flameControls}>
                <StreakFlame streak={displayedStreak} />
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-rose-100 bg-white/85 px-3 py-2 text-right shadow-sm">
                <p className="text-[8px] font-black uppercase tracking-[0.16em] text-rose-400">Sobriedad</p>
                <p className="mt-1 text-sm font-black leading-none text-slate-950">
                  {negativeInsights?.sobrietyDays ?? 0}d {negativeInsights?.sobrietyHours ?? 0}h
                </p>
                <p className="mt-1 text-[9px] font-bold text-slate-400">sin hacerlo</p>
              </div>
            )}

            <motion.button
              animate={buttonControls}
              whileTap={{ scale: 0.90 }}
              onClick={handleIncrement}
              disabled={isPending}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-white font-black text-lg shadow-sm transition-all duration-200 ease-in-out disabled:opacity-50 ${isPositive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
            >
              {isPositive ? '+' : '!'}
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
            Elige el detonante. Esto alimenta tus estadísticas de resiliencia, no un juicio.
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
                onClick={() => confirmRelapse(value as 'stress' | 'social' | 'boredom' | 'craving' | 'other')}
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
