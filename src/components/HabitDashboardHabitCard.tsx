import React, { useTransition, useOptimistic } from 'react';
import { type HabitRow } from '@/types/habits';

type Props = {
  habit: HabitRow;
  selected: boolean;
  onSelect: (habitId: number) => void;
  onQuickAdd: (habitId: number, amount: number) => Promise<void>;
  todayAmount: number;
};

export default function HabitDashboardHabitCard({ habit, selected, onSelect, onQuickAdd, todayAmount }: Props) {
  const [isPending, startTransition] = useTransition();
  const [optimisticAmount, setOptimisticAmount] = useOptimistic(
    todayAmount,
    (state, nextVal: number) => nextVal
  );

  const handleQuickAdd = (amount: number) => {
    // If it's a checklist habit (tolerance <= 1), toggle between 0 and 1
    // If it's a numeric count habit, increment or decrement
    let nextVal = optimisticAmount;
    if (habit.tolerance_threshold <= 1) {
      nextVal = optimisticAmount === 0 ? 1 : 0;
    } else {
      nextVal = amount === 1 ? optimisticAmount + 1 : Math.max(0, optimisticAmount - 1);
    }

    startTransition(async () => {
      setOptimisticAmount(nextVal);
      try {
        await onQuickAdd(habit.id, amount);
      } catch (err) {
        // Rollback is automatically triggered on rejection
      }
    });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(habit.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(habit.id);
        }
      }}
      className={`cursor-pointer rounded-2xl border p-3 text-left shadow-sm transition ${
        selected ? 'border-slate-900 bg-slate-950 text-white' : 'bg-white hover:-translate-y-0.5 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{habit.name}</div>
          <div className={`text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
            Racha: {habit.current_streak} — Longest: {habit.longest_streak}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full border px-2 py-0.5 text-[10px] bg-white/10 uppercase tracking-[0.15em]">
            {habit.type}
          </span>
          <span className="text-[11px] font-bold opacity-80">
            Hoy: {optimisticAmount}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className={`text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
          Tolerancia: {habit.tolerance_threshold} | Escudos: {habit.shields}
        </div>

        <div>
          {habit.tolerance_threshold <= 1 ? (
            <button
              onClick={async (event) => {
                event.stopPropagation();
                handleQuickAdd(1);
              }}
              disabled={isPending}
              className="rounded-full bg-emerald-500 px-3 py-2 text-white transition active:scale-95 disabled:opacity-50"
            >
              ✓
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={async (event) => {
                  event.stopPropagation();
                  handleQuickAdd(0);
                }}
                disabled={isPending}
                className="rounded-full border px-2 py-1 text-sm transition active:scale-95 disabled:opacity-50"
              >
                -
              </button>
              <button
                onClick={async (event) => {
                  event.stopPropagation();
                  handleQuickAdd(1);
                }}
                disabled={isPending}
                className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white transition active:scale-95 disabled:opacity-50"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
