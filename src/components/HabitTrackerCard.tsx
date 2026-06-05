import React, { useState, useTransition, useOptimistic, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import type { HabitRow, DailyLogRow } from '@/types/habits';
import HabitDetailModal from './HabitDetailModal';
import { useHaptic } from '@/hooks/useHaptic';
import StreakFlame from './StreakFlame';
import toast from '@/lib/toast';

interface HabitTrackerCardProps {
  habit: HabitRow;
  value: number;
  saving: boolean;
  onValueChange: (habitId: number, nextValue: number) => void;
  onSave: (habitId: number) => void;
  onSaveValue: (habitId: number, nextValue: number) => Promise<void>;
  recentLogs: DailyLogRow[];
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

  const prevStreakRef = useRef(habit.current_streak);

  const isPositive = habit.type === 'positive';
  const isGoalMetToday = isPositive
    ? (habit.tolerance_threshold > 0 ? optimisticValue >= habit.tolerance_threshold : optimisticValue >= 1)
    : (optimisticValue <= habit.tolerance_threshold);

  const displayedStreak = isPositive
    ? (isGoalMetToday ? habit.current_streak + 1 : habit.current_streak)
    : (isGoalMetToday ? habit.current_streak : 0);

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
  const isExceededNegative = !isPositive && optimisticValue > habit.tolerance_threshold;

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
          className={`group flex items-center justify-between p-4 rounded-2xl border shadow-sm hover:shadow-md cursor-pointer transition-shadow duration-300 ${showGlow ? 'ring-2 ring-emerald-400 shadow-emerald-100' : ''}`}
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            <div className={`flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
              <span className="text-xl font-black">{habit.name.charAt(0).toUpperCase()}</span>
            </div>
            
            <div className="min-w-0 flex-1">
              <h3 className={`text-base font-black truncate transition-colors duration-300 ${isExceededNegative ? 'text-rose-900' : 'text-slate-900'}`}>{habit.name}</h3>
              {!isPositive && (
                <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 transition-colors duration-300 ${isExceededNegative ? 'text-rose-600' : 'text-slate-400'}`}>
                  Objetivo: Máx {habit.tolerance_threshold}/día
                </p>
              )}
              <div className="mt-2 flex items-baseline gap-1">
                <span className={`text-4xl font-black tabular-nums tracking-tighter transition-colors duration-300 ${isExceededNegative ? 'text-rose-600' : 'text-slate-900'}`}>
                  {optimisticValue}
                </span>
                <span className="text-xs font-semibold text-slate-400">hoy</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <motion.div animate={flameControls}>
              <StreakFlame streak={displayedStreak} />
            </motion.div>

            <motion.button
              animate={buttonControls}
              whileTap={{ scale: 0.90 }}
              onClick={handleIncrement}
              disabled={isPending}
              className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-black text-xl shadow-sm transition-colors disabled:opacity-50 ${isPositive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
            >
              +
            </motion.button>
          </div>
        </motion.div>
      </div>

      <HabitDetailModal
        habit={habit}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        optimisticValue={optimisticValue}
        isPending={isPending}
        onValueChange={onValueChange}
        onSaveDirect={handleSaveDirect}
        recentLogs={recentLogs}
        streakProgress={streakProgress}
        trendLabel={trendLabel}
      />
    </>
  );
}
