import React, { useMemo } from 'react';
import HabitDashboardDetail from '@/components/HabitDashboardDetail';
import HabitDashboardHabitCard from '@/components/HabitDashboardHabitCard';
import { useHabitDashboard } from '@/hooks/useHabitDashboard';
import { getNormalizedDate } from '@/lib/date-utils';

export default function HabitDashboard() {
  const {
    habits,
    logs,
    selectedHabit,
    selectedHabitEntries,
    loading,
    setSelectedHabitId,
    updateToday,
  } = useHabitDashboard();

  const todayStr = getNormalizedDate(new Date());
  const todayLog = logs.find((l) => l.date === todayStr);

  const todayAmounts = useMemo(() => {
    const map: Record<number, number> = {};
    if (todayLog && Array.isArray(todayLog.habit_tracking)) {
      for (const entry of todayLog.habit_tracking) {
        map[entry.habit_id] = entry.amount;
      }
    }
    return map;
  }, [todayLog]);

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
            todayAmount={todayAmounts[habit.id] ?? 0}
          />
        ))}
      </div>

      {selectedHabit ? (
        <HabitDashboardDetail habit={selectedHabit} entries={selectedHabitEntries} />
      ) : null}
    </div>
  );
}
