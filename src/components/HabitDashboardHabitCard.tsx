import React from 'react';

type Habit = {
  id: number;
  name: string;
  type: 'positive' | 'negative';
  tolerance_threshold: number;
  current_streak: number;
  longest_streak: number;
  shields: number;
};

type Props = {
  habit: Habit;
  selected: boolean;
  onSelect: (habitId: number) => void;
  onQuickAdd: (habitId: number, amount: number) => Promise<void>;
};

export default function HabitDashboardHabitCard({ habit, selected, onSelect, onQuickAdd }: Props) {
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
      className={`cursor-pointer rounded-2xl border p-3 text-left shadow-sm transition ${selected ? 'border-slate-900 bg-slate-950 text-white' : 'bg-white hover:-translate-y-0.5 hover:border-slate-300'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{habit.name}</div>
          <div className={`text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
            Racha: {habit.current_streak} — Longest: {habit.longest_streak}
          </div>
        </div>

        <span className="rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.28em]">
          {habit.type}
        </span>
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
                await onQuickAdd(habit.id, 1);
              }}
              className="rounded-full bg-emerald-500 px-3 py-2 text-white"
            >
              ✓
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={async (event) => {
                  event.stopPropagation();
                  await onQuickAdd(habit.id, 0);
                }}
                className="rounded-full border px-2 py-1 text-sm"
              >
                -
              </button>
              <button
                onClick={async (event) => {
                  event.stopPropagation();
                  await onQuickAdd(habit.id, 1);
                }}
                className="rounded-full bg-slate-900 px-3 py-1 text-sm text-white"
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
