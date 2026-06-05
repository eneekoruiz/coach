import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';
import { isMissingHabitTableError } from '@/lib/habits';
import { getNormalizedDate } from '@/lib/date-utils';
import type { HabitRow, DailyLogRow, HabitType, HabitTrackingEntry } from '@/types/habits';
import {
  isHabitRow,
  isDailyLogRow,
  getSafeMessage,
  isUnauthorizedError,
  parseJsonResponse,
  getTodayIsoDate,
} from '@/lib/habits-utils';

export function useHabits() {
  const router = useRouter();
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [values, setValues] = useState<Record<number, number>>({});
  const [recentLogs, setRecentLogs] = useState<DailyLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [selectedDate, setSelectedDate] = useState(() => getNormalizedDate(new Date()));

  // Auto-sync input values with logs of the selectedDate
  useEffect(() => {
    if (habits.length === 0) return;
    const targetLog = recentLogs.find((l) => l.date === selectedDate);
    const tracking = targetLog?.habit_tracking ?? [];
    setValues((prev) => {
      const nextValues = { ...prev };
      for (const habit of habits) {
        const match = tracking.find((entry) => Number(entry.habit_id) === habit.id);
        nextValues[habit.id] = match ? Number(match.amount) : 0;
      }
      return nextValues;
    });
  }, [selectedDate, recentLogs, habits]);

  // Auto-clear status messages
  useEffect(() => {
    if (!statusMessage) return;
    const timeout = window.setTimeout(() => setStatusMessage(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  const loadData = useCallback(async (cancelled: boolean) => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData.user;

      if (userError || !user) {
        if (!cancelled) {
          setAuthRequired(true);
          setHabits([]);
          setRecentLogs([]);
          setValues({});
        }
        return;
      }

      const [habitsResult, logsResult] = await Promise.all([
        supabase.from('user_habits').select('*').eq('user_id', user.id),
        supabase
          .from('daily_logs')
          .select('date, habit_tracking')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(60),
      ]);

      if (habitsResult.error) {
        if (isMissingHabitTableError(habitsResult.error)) {
          throw new Error(
            'La tabla public.user_habits no está aplicada. Ejecuta la migración de hábitos antes de usar este panel.'
          );
        }
        throw new Error(getSafeMessage(habitsResult.error));
      }

      if (logsResult.error) {
        throw new Error(getSafeMessage(logsResult.error));
      }

      const nextHabits = Array.isArray(habitsResult.data)
        ? habitsResult.data.filter(isHabitRow)
        : [];
      const nextLogs = Array.isArray(logsResult.data) ? logsResult.data.filter(isDailyLogRow) : [];

      if (!cancelled) {
        setHabits(nextHabits);
        setRecentLogs(nextLogs);
        setValues(
          nextHabits.reduce<Record<number, number>>((acc, habit) => {
            acc[habit.id] = 0;
            return acc;
          }, {})
        );
      }
    } catch (error) {
      if (!cancelled) {
        const message = getSafeMessage(error);
        setErrorMessage(message);
        toast.error(message);
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    setAuthRequired(false);

    void loadData(cancelled);

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const refreshUserData = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const [habitsResult, logsResult] = await Promise.all([
      supabase.from('user_habits').select('*').eq('user_id', user.id),
      supabase
        .from('daily_logs')
        .select('date, habit_tracking')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(60),
    ]);

    const nextHabits = Array.isArray(habitsResult.data)
      ? habitsResult.data.filter(isHabitRow)
      : [];
    const nextLogs = Array.isArray(logsResult.data) ? logsResult.data.filter(isDailyLogRow) : [];

    setHabits(nextHabits);
    setRecentLogs(nextLogs);
  }, []);

  const getTokenOrThrow = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token ?? null;
    if (!token) {
      throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    }
    return token;
  }, []);

  const saveHabitValue = useCallback(
    async (habitId: number, nextValue: number) => {
      const previousValue = values[habitId] ?? 0;
      setValues((current) => ({ ...current, [habitId]: nextValue }));

      try {
        const token = await getTokenOrThrow();
        const response = await fetch('/api/habits/update-today', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ habit_id: habitId, amount: nextValue, date: selectedDate }),
        });

        if (!response.ok) {
          const payload = await parseJsonResponse<{ error?: string }>(response);
          throw new Error(payload?.error || 'Error al guardar.');
        }

        setRecentLogs((currentLogs) => {
          const nextLogs = [...currentLogs];
          const index = nextLogs.findIndex((log) => log.date === selectedDate);
          const trackingEntry: HabitTrackingEntry = { habit_id: habitId, amount: nextValue };

          if (index >= 0) {
            const existingTracking = nextLogs[index].habit_tracking ?? [];
            const nextTracking = [...existingTracking];
            const trackingIndex = nextTracking.findIndex((entry) => entry.habit_id === habitId);

            if (trackingIndex >= 0) {
              nextTracking[trackingIndex] = trackingEntry;
            } else {
              nextTracking.unshift(trackingEntry);
            }

            nextLogs[index] = { ...nextLogs[index], habit_tracking: nextTracking };
          } else {
            nextLogs.unshift({ date: selectedDate, habit_tracking: [trackingEntry] });
          }

          return nextLogs;
        });

        const message = 'Guardado';
        setStatusMessage(message);
        toast.success(message);

        // Dopamina visual: Check streak rewards
        try {
          const { data: updatedHabit } = await supabase
            .from('user_habits')
            .select('current_streak')
            .eq('id', habitId)
            .single();

          if (updatedHabit && updatedHabit.current_streak > 0 && updatedHabit.current_streak % 7 === 0) {
            const { triggerStreakConfetti } = await import('@/utils/rewards');
            triggerStreakConfetti();
          }
        } catch (e) {
          console.warn('[useHabits] Could not fetch habit streak for reward:', e);
        }

        router.refresh();
      } catch (error) {
        setValues((current) => ({ ...current, [habitId]: previousValue }));
        const message = getSafeMessage(error);
        if (isUnauthorizedError(message)) {
          window.location.href = '/login';
          return;
        }
        toast.error(message);
        throw error;
      }
    },
    [values, getTokenOrThrow, router, selectedDate]
  );

  const saveHabit = useCallback(
    async (habitId: number) => {
      setSavingMap((current) => ({ ...current, [habitId]: true }));
      try {
        await saveHabitValue(habitId, values[habitId] ?? 0);
      } catch {
        // Error already handled and toasted
      } finally {
        setSavingMap((current) => ({ ...current, [habitId]: false }));
      }
    },
    [saveHabitValue, values]
  );

  const createHabitQuick = useCallback(
    async (name: string, type: HabitType) => {
      try {
        const token = await getTokenOrThrow();
        const response = await fetch('/api/habits/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, type }),
        });

        const payload = await parseJsonResponse<{ data?: unknown; error?: string }>(response);
        if (!response.ok) {
          const message = payload?.error ? `Error creando hábito: ${payload.error}` : 'Error creando hábito.';
          setStatusMessage(message);
          toast.error(message);
          return;
        }

        const createdHabit = payload?.data;
        if (isHabitRow(createdHabit)) {
          setHabits((current) => [createdHabit, ...current]);
          setValues((current) => ({ ...current, [createdHabit.id]: 0 }));
          const message = 'Hábito creado';
          setStatusMessage(message);
          toast.success(message);
          await refreshUserData();
        }
      } catch (error) {
        const message = getSafeMessage(error);
        if (isUnauthorizedError(message)) {
          window.location.href = '/login';
          return;
        }

        setStatusMessage(message);
        toast.error(message);
      }
    },
    [getTokenOrThrow, refreshUserData]
  );

  const updateHabitValue = useCallback((habitId: number, value: number) => {
    setValues((current) => ({ ...current, [habitId]: value }));
  }, []);

  return {
    habits,
    values,
    recentLogs,
    loading,
    authRequired,
    statusMessage,
    errorMessage,
    savingMap,
    saveHabit,
    saveHabitValue,
    createHabitQuick,
    updateHabitValue,
    selectedDate,
    setSelectedDate,
  };
}
