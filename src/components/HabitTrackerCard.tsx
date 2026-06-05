import React, { useState, useTransition, useOptimistic, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { HabitRow, DailyLogRow } from '@/types/habits';
import HabitDetailModal from './HabitDetailModal';
import { useHaptic } from '@/hooks/useHaptic';
import StreakFlame from './StreakFlame';

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
  const controls = useAnimation();
  const [showGlow, setShowGlow] = useState(false);

  // Sync prop changes
  useEffect(() => {
    startTransition(() => {
      setOptimisticValue(value);
    });
  }, [value, setOptimisticValue]);

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.success();
    
    // Animate pop
    controls.start({
      scale: [1, 1.1, 0.95, 1],
      transition: { duration: 0.3 }
    });

    const nextVal = optimisticValue + 1;
    onValueChange(habit.id, nextVal);
    
    // Simulate completion glow
    setShowGlow(true);
    setTimeout(() => setShowGlow(false), 800);

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
  const isPositive = habit.type === 'positive';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        onClick={() => setIsDetailOpen(true)}
        className={`group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 ${showGlow ? 'ring-2 ring-emerald-400' : ''}`}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className={`flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 ${isPositive ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
            <span className="text-xl font-black">{habit.name.charAt(0).toUpperCase()}</span>
          </div>
          
          <div className="min-w-0">
            <h3 className="text-base font-black text-slate-900 truncate">{habit.name}</h3>
            <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
              Hoy: <span className="text-slate-900">{optimisticValue}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <StreakFlame streak={habit.current_streak} />

          <motion.button
            animate={controls}
            onClick={handleIncrement}
            disabled={isPending}
            className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-black text-xl shadow-sm hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 ${isPositive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-rose-500 hover:bg-rose-600'}`}
          >
            +
          </motion.button>
        </div>
      </motion.div>

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
