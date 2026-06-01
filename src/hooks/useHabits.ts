import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';
import { isMissingHabitTableError } from '@/lib/habits';
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
  const [habits, setHabits] = useState<HabitRow[]>([]);
  const [values, setValues] = useState<Record<number, number>>({});
  const [recentLogs, setRecentLogs] = useState<DailyLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});

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

  const saveHabit = useCallback(
    async (habitId: number) => {
      const previousValue = values[habitId] ?? 0;
      setSavingMap((current) => ({ ...current, [habitId]: true }));

      try {
        const token = await getTokenOrThrow();
        const response = await fetch('/api/habits/update-today', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ habit_id: habitId, amount: previousValue }),
        });

        const payload = await parseJsonResponse<{ error?: string }>(response);
        if (!response.ok) {
          setValues((current) => ({ ...current, [habitId]: previousValue }));
          const message = payload?.error ? `Error al guardar: ${payload.error}` : 'Error al guardar el hábito.';
          setStatusMessage(message);
          toast.error(message);
          return;
        }

        const today = getTodayIsoDate();
        setRecentLogs((currentLogs) => {
          const nextLogs = [...currentLogs];
          const index = nextLogs.findIndex((log) => log.date === today);
          const trackingEntry: HabitTrackingEntry = { habit_id: habitId, amount: previousValue };

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
            nextLogs.unshift({ date: today, habit_tracking: [trackingEntry] });
          }

          return nextLogs.slice(0, 60);
        });

        const message = 'Guardado';
        setStatusMessage(message);
        toast.success(message);
      } catch (error) {
        const message = getSafeMessage(error);
        if (isUnauthorizedError(message)) {
          window.location.href = '/login';
          return;
        }

        setValues((current) => ({ ...current, [habitId]: previousValue }));
        setStatusMessage(message);
        toast.error(message);
      } finally {
        setSavingMap((current) => ({ ...current, [habitId]: false }));
      }
    },
    [values, getTokenOrThrow]
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
    createHabitQuick,
    updateHabitValue,
  };
}
