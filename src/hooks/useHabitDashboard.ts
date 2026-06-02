import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { type HabitRow, type DailyLogRow } from '@/types/habits';
import toast from '@/lib/toast';

export function useHabitDashboard() {
  const router = useRouter();
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [logs, setLogs] = useState<DailyLogRow[]>([]);
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
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

      const nextHabits = (habitsResult.data as HabitRow[]) ?? [];
      const nextLogs = (logsResult.data as DailyLogRow[]) ?? [];

      setHabits(nextHabits);
      setLogs(nextLogs);
      setSelectedHabitId((current) => current ?? nextHabits[0]?.id ?? null);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function updateToday(habitId: number, amount: number) {
    const delta = amount === 0 ? -1 : 1;
    try {
      const res = await fetch('/api/habits/update-today', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habit_id: habitId, delta }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || 'Error al actualizar el hábito.');
      }
      // reload data after updating today
      await loadData();
      router.refresh();
      toast.success('Hábito actualizado');
    } catch (err) {
      console.error('Failed to update habit value', err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
      throw err;
    }
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

  return {
    habits,
    logs,
    selectedHabitId,
    setSelectedHabitId,
    loading,
    selectedHabit,
    selectedHabitEntries,
    updateToday,
  };
}
