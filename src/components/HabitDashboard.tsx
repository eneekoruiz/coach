"use client";
import React, { useEffect, useMemo, useState } from 'react';
import HabitDashboardDetail from '@/components/HabitDashboardDetail';
import HabitDashboardHabitCard from '@/components/HabitDashboardHabitCard';
import { supabase } from '@/lib/supabase';

type Habit = {
  id: number;
  name: string;
  type: 'positive' | 'negative';
  tolerance_threshold: number;
  current_streak: number;
  longest_streak: number;
  shields: number;
};

type HabitTrackingRecord = { habit_id: number; amount: number };
type DailyLogRow = { date: string; habit_tracking: HabitTrackingRecord[] | null };

export default function HabitDashboard() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLogRow[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const [habitsResult, logsResult] = await Promise.all([
      supabase.from('user_habits').select('*').eq('user_id', userId),
      supabase.from('daily_logs').select('date, habit_tracking').eq('user_id', userId).order('date', { ascending: true }),
    ]);

    const nextHabits = (habitsResult.data as Habit[]) ?? [];
    const nextLogs = (logsResult.data as DailyLogRow[]) ?? [];

    setHabits(nextHabits);
    setLogs(nextLogs);
    setSelectedHabitId((current) => current ?? nextHabits[0]?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateToday(habitId: number, amount: number) {
    await fetch('/api/habits/update-today', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habit_id: habitId, amount }),
    });
  }

  const selectedHabit = useMemo(
    () => habits.find((habit) => habit.id === selectedHabitId) ?? habits[0] ?? null,
    [habits, selectedHabitId]
  );

  const selectedHabitEntries = useMemo(() => {
    if (!selectedHabit) return [];

    return logs.slice(-30).map((log) => {
      const tracking = Array.isArray(log.habit_tracking) ? log.habit_tracking : [];
      const record = tracking.find((item) => Number(item.habit_id) === selectedHabit.id);
      const amount = Number(record?.amount ?? 0);

      let status: 'perfect' | 'yellow' | 'broken' | 'missed' = 'missed';
      if (selectedHabit.type === 'negative') {
        if (amount === 0) status = 'perfect';
        else if (amount > 0 && amount < selectedHabit.tolerance_threshold) status = 'yellow';
        else status = 'broken';
      } else if (amount > 0) {
        status = 'perfect';
      }

      return { date: log.date, status };
    });
  }, [logs, selectedHabit]);

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

      {selectedHabit ? <HabitDashboardDetail habit={selectedHabit} entries={selectedHabitEntries} /> : null}
    </div>
  );
}
