"use client";
import React from 'react';
import HabitDashboardDetail from '@/components/HabitDashboardDetail';
import HabitDashboardHabitCard from '@/components/HabitDashboardHabitCard';
import { useHabitDashboard } from '@/hooks/useHabitDashboard';

export default function HabitDashboard() {
  const {
    habits,
    selectedHabit,
    selectedHabitEntries,
    loading,
    setSelectedHabitId,
    updateToday,
  } = useHabitDashboard();

  return (
    <div className="space-y-4">
      {loading && <div className="text-sm text-slate-500">Cargando hábitos…</div>}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {habits.map((habit) => (
          <HabitDashboardHabitCard
            key={habit.id}
            habit={habit}
            selected={selectedHabit?.id === habit.id}
            onSelect={setSelectedHabitId}
            onQuickAdd={updateToday}
          />
        ))}
      </div>

      {selectedHabit ? (
        <HabitDashboardDetail habit={selectedHabit} entries={selectedHabitEntries} />
      ) : null}
    </div>
  );
}
