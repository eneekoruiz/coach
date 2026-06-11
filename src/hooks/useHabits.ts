import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from '@/lib/toast';
import { hapticLight, hapticSuccess, hapticError } from '@/utils/haptics';
import { useOfflineMutation } from './useOfflineMutation';
import { isMissingHabitTableError } from '@/lib/habits';
import { getNormalizedDate } from '@/lib/date-utils';
import { getHabitMetric } from '@/lib/habit-metrics';
import type {
  HabitMetricConfig,
  HabitMetricType,
  HabitRecoveryCheckIn,
  HabitRow,
  DailyLogRow,
  HabitType,
  HabitTrackingEntry,
  RecoveryDifficulty,
} from '@/types/habits';
import {
  isHabitRow,
  isDailyLogRow,
  getSafeMessage,
  isUnauthorizedError,
  parseJsonResponse,
  getTodayIsoDate,
} from '@/lib/habits-utils';
import { readSessionViewCache, writeSessionViewCache } from '@/lib/session-view-cache';
import { isE2EMockMode } from '@/lib/e2e';

type HabitsViewCache = {
  habits: HabitRow[];
  recentLogs: DailyLogRow[];
  values: Record<number, number>;
  recoveryCheckIns: HabitRecoveryCheckIn[];
};

export type CreateHabitInput = {
  name: string;
  type: HabitType;
  targetValue: number;
  metricType: HabitMetricType;
  unitLabel?: string | null;
  stepValue: number;
  metricConfig?: HabitMetricConfig;
  tolerance?: number;
};

const HABITS_CACHE_KEY = 'coach.view.habits.v1';

function isRecoveryCheckIn(value: unknown): value is HabitRecoveryCheckIn {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return typeof row.habit_id === 'number' && typeof row.checkin_date === 'string';
}

export function useHabits() {
  const router = useRouter();
  const { executeMutation } = useOfflineMutation();
  const cached = readSessionViewCache<HabitsViewCache>(HABITS_CACHE_KEY);
  const [habits, setHabits] = useState<HabitRow[]>(cached?.habits ?? []);
  const [values, setValues] = useState<Record<number, number>>(cached?.values ?? {});
  const [recentLogs, setRecentLogs] = useState<DailyLogRow[]>(cached?.recentLogs ?? []);
  const [recoveryCheckIns, setRecoveryCheckIns] = useState<HabitRecoveryCheckIn[]>(
    cached?.recoveryCheckIns ?? []
  );
  const [loading, setLoading] = useState(!cached);
  const [authRequired, setAuthRequired] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [selectedDate, setSelectedDate] = useState(() => getNormalizedDate(new Date()));

  useEffect(() => {
    if (habits.length === 0 && recentLogs.length === 0 && Object.keys(values).length === 0) {
      return;
    }

    writeSessionViewCache(HABITS_CACHE_KEY, {
      habits,
      recentLogs,
      values,
      recoveryCheckIns,
    });
  }, [habits, recentLogs, values, recoveryCheckIns]);

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
      if (isE2EMockMode()) {
        const today = getNormalizedDate(new Date());
        const mockHabits: HabitRow[] = [
          {
            id: 1,
            user_id: 'e2e-user',
            name: 'Agua',
            type: 'positive',
            is_custom: false,
            tolerance_threshold: 2000,
            target_value: 2000,
            unit: 'ml',
            metric_type: 'volume',
            unit_label: 'ml',
            step_value: 250,
            metric_config: {
              min: 0,
              max: 10000,
              precision: 0,
              presets: [250, 500, 1000],
              base_unit: 'ml',
              display_unit: 'ml',
            },
            current_streak: 4,
            longest_streak: 10,
            shields: 1,
            sobriety_started_at: null,
            last_relapse_at: null,
            relapse_unit_cost: undefined,
            relapse_unit_minutes: undefined,
            slip_allowance: 1,
            slip_window_days: 7,
            slip_penalty_hours: 24,
          },
          {
            id: 2,
            user_id: 'e2e-user',
            name: 'Sin tabaco',
            type: 'negative',
            is_custom: false,
            tolerance_threshold: 0,
            target_value: 0,
            unit: 'recaídas',
            metric_type: 'counter',
            unit_label: 'recaídas',
            step_value: 1,
            metric_config: {
              min: 0,
              precision: 0,
              presets: [1],
              base_unit: 'recaídas',
              display_unit: 'recaídas',
            },
            current_streak: 12,
            longest_streak: 21,
            shields: 0,
            sobriety_started_at: new Date(
              Date.now() - 12 * 86400 * 1000 - 5 * 3600 * 1000
            ).toISOString(),
            last_relapse_at: null,
            relapse_unit_cost: 6,
            relapse_unit_minutes: 15,
            slip_allowance: 0,
            slip_window_days: 7,
            slip_penalty_hours: 24,
          },
        ];
        const mockLogs: DailyLogRow[] = [{ date: today, habit_tracking: [] }];
        const mockValues = { 1: 0, 2: 0 };
        const mockRecoveryCheckIns: HabitRecoveryCheckIn[] = [];
        if (!cancelled) {
          setAuthRequired(false);
          setHabits(mockHabits);
          setRecentLogs(mockLogs);
          setValues(mockValues);
          setRecoveryCheckIns(mockRecoveryCheckIns);
        }
        return;
      }

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

      const [habitsResult, logsResult, recoveryResult] = await Promise.all([
        supabase.from('user_habits').select('*').eq('user_id', user.id),
        supabase
          .from('daily_logs')
          .select('date, habit_tracking')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(60),
        supabase
          .from('habit_recovery_checkins')
          .select('*')
          .eq('user_id', user.id)
          .gte('checkin_date', getNormalizedDate(new Date(Date.now() - 14 * 86400 * 1000)))
          .order('checkin_date', { ascending: false }),
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

      let nextHabits = Array.isArray(habitsResult.data) ? habitsResult.data.filter(isHabitRow) : [];
      const nextLogs = Array.isArray(logsResult.data) ? logsResult.data.filter(isDailyLogRow) : [];
      const nextRecoveryCheckIns =
        recoveryResult.error || !Array.isArray(recoveryResult.data)
          ? []
          : recoveryResult.data.filter(isRecoveryCheckIn);

      if (nextHabits.length === 0) {
        const seedRows = [
          {
            user_id: user.id,
            name: 'Beber 2L de Agua',
            type: 'positive',
            is_custom: false,
            tolerance_threshold: 2000,
            target_value: 2000,
            unit: 'ml',
            metric_type: 'volume',
            unit_label: 'ml',
            step_value: 250,
            metric_config: {
              min: 0,
              max: 10000,
              precision: 0,
              presets: [250, 500, 1000],
              base_unit: 'ml',
              display_unit: 'ml',
            },
            current_streak: 0,
            longest_streak: 0,
            shields: 1,
          },
          {
            user_id: user.id,
            name: 'Caminar 8k pasos',
            type: 'positive',
            is_custom: false,
            tolerance_threshold: 8000,
            target_value: 8000,
            unit: 'pasos',
            metric_type: 'counter',
            unit_label: 'pasos',
            step_value: 1000,
            metric_config: {
              min: 0,
              precision: 0,
              presets: [1000, 2000, 5000],
              base_unit: 'pasos',
              display_unit: 'pasos',
            },
            current_streak: 0,
            longest_streak: 0,
            shields: 1,
          },
          {
            user_id: user.id,
            name: 'Sin comida basura',
            type: 'negative',
            is_custom: false,
            tolerance_threshold: 1,
            target_value: 0,
            unit: 'recaídas',
            metric_type: 'counter',
            unit_label: 'recaídas',
            step_value: 1,
            metric_config: {
              min: 0,
              precision: 0,
              presets: [1],
              base_unit: 'recaídas',
              display_unit: 'recaídas',
            },
            relapse_unit_cost: 8,
            relapse_unit_minutes: 20,
            slip_allowance: 1,
            slip_window_days: 7,
            slip_penalty_hours: 24,
            sobriety_started_at: new Date().toISOString(),
            current_streak: 0,
            longest_streak: 0,
            shields: 0,
          },
        ];

        const { data: insertedHabits } = await supabase
          .from('user_habits')
          .insert(seedRows)
          .select('*');

        nextHabits = Array.isArray(insertedHabits) ? insertedHabits.filter(isHabitRow) : nextHabits;
      }

      if (!cancelled) {
        const nextValues = nextHabits.reduce<Record<number, number>>((acc, habit) => {
          acc[habit.id] = 0;
          return acc;
        }, {});
        setHabits(nextHabits);
        setRecentLogs(nextLogs);
        setRecoveryCheckIns(nextRecoveryCheckIns);
        setValues(nextValues);
      }
    } catch (error) {
      if (!cancelled) {
        console.error('[useHabits] Error loading habits:', error);
        const message = 'No se pudieron cargar los hábitos.';
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

    const [habitsResult, logsResult, recoveryResult] = await Promise.all([
      supabase.from('user_habits').select('*').eq('user_id', user.id),
      supabase
        .from('daily_logs')
        .select('date, habit_tracking')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(60),
      supabase
        .from('habit_recovery_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('checkin_date', getNormalizedDate(new Date(Date.now() - 14 * 86400 * 1000)))
        .order('checkin_date', { ascending: false }),
    ]);

    const nextHabits = Array.isArray(habitsResult.data) ? habitsResult.data.filter(isHabitRow) : [];
    const nextLogs = Array.isArray(logsResult.data) ? logsResult.data.filter(isDailyLogRow) : [];
    const nextRecoveryCheckIns =
      recoveryResult.error || !Array.isArray(recoveryResult.data)
        ? []
        : recoveryResult.data.filter(isRecoveryCheckIn);

    setHabits(nextHabits);
    setRecentLogs(nextLogs);
    setRecoveryCheckIns(nextRecoveryCheckIns);
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
    async (
      habitId: number,
      nextValue: number,
      metadata?: { relapseFactor?: HabitTrackingEntry['relapse_factor'] }
    ) => {
      const previousValue = values[habitId] ?? 0;
      const habit = habits.find((currentHabit) => currentHabit.id === habitId);
      const metric = habit ? getHabitMetric(habit) : null;
      setValues((current) => ({ ...current, [habitId]: nextValue }));

      const updateStateLogs = () => {
        setRecentLogs((currentLogs) => {
          const nextLogs = [...currentLogs];
          const index = nextLogs.findIndex((log) => log.date === selectedDate);
          const trackingEntry: HabitTrackingEntry = {
            habit_id: habitId,
            amount: nextValue,
            metric_type: metric?.type ?? null,
            unit_label: metric?.unitLabel ?? null,
            relapse_factor: metadata?.relapseFactor ?? null,
          };

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
      };

      try {
        await executeMutation(
          '/api/habits/update-today',
          {
            habit_id: habitId,
            amount: nextValue,
            date: selectedDate,
            relapse_factor: metadata?.relapseFactor ?? null,
          },
          {
            optimisticUpdate: () => {
              hapticLight();
              updateStateLogs();
            },
            onSuccess: (data) => {
              hapticSuccess();
              if (data?.offline) return;
              const message = 'Guardado';
              setStatusMessage(message);
              toast.success(message);
            },
          }
        );
        // Dopamina visual: Check streak rewards
        try {
          const { data: updatedHabit } = await supabase
            .from('user_habits')
            .select('current_streak')
            .eq('id', habitId)
            .single();

          if (
            updatedHabit &&
            updatedHabit.current_streak > 0 &&
            updatedHabit.current_streak % 7 === 0
          ) {
            const { triggerStreakConfetti } = await import('@/utils/rewards');
            triggerStreakConfetti();
          }
        } catch (e) {
          console.warn('[useHabits] Could not fetch habit streak for reward:', e);
        }

        router.refresh();
      } catch (error) {
        hapticError();
        setValues((current) => ({ ...current, [habitId]: previousValue }));
        const message = getSafeMessage(error);
        if (isUnauthorizedError(message)) {
          window.location.href = '/login';
          return;
        }
        toast.error('No se pudo guardar el hábito.');
        throw error;
      }
    },
    [values, habits, executeMutation, router, selectedDate]
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

  const updateHabitSettings = useCallback(
    async (
      habitId: number,
      settings: {
        toleranceThreshold?: number;
        targetValue?: number;
        unit?: string | null;
        metricType?: HabitMetricType;
        unitLabel?: string | null;
        stepValue?: number;
        metricConfig?: HabitMetricConfig;
        slipAllowance?: number;
        slipWindowDays?: number;
        slipPenaltyHours?: number;
      }
    ) => {
      const token = await getTokenOrThrow();
      const previousHabits = habits;

      setHabits((current) =>
        current.map((habit) =>
          habit.id === habitId
            ? {
                ...habit,
                tolerance_threshold: settings.toleranceThreshold ?? habit.tolerance_threshold,
                target_value: settings.targetValue ?? habit.target_value,
                unit: settings.unit !== undefined ? settings.unit : habit.unit,
                metric_type: settings.metricType ?? habit.metric_type,
                unit_label:
                  settings.unitLabel !== undefined ? settings.unitLabel : habit.unit_label,
                step_value: settings.stepValue ?? habit.step_value,
                metric_config: settings.metricConfig ?? habit.metric_config,
                slip_allowance: settings.slipAllowance ?? habit.slip_allowance,
                slip_window_days: settings.slipWindowDays ?? habit.slip_window_days,
                slip_penalty_hours: settings.slipPenaltyHours ?? habit.slip_penalty_hours,
              }
            : habit
        )
      );

      try {
        const response = await fetch('/api/habits/update-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            habit_id: habitId,
            tolerance_threshold: settings.toleranceThreshold,
            target_value: settings.targetValue,
            unit: settings.unit,
            metric_type: settings.metricType,
            unit_label: settings.unitLabel,
            step_value: settings.stepValue,
            metric_config: settings.metricConfig,
            slip_allowance: settings.slipAllowance,
            slip_window_days: settings.slipWindowDays,
            slip_penalty_hours: settings.slipPenaltyHours,
          }),
        });
        const payload = await parseJsonResponse<{ data?: unknown; error?: string }>(response);
        if (!response.ok) throw new Error(payload?.error || 'Error guardando ajustes.');

        const updatedHabit = payload?.data;
        if (isHabitRow(updatedHabit)) {
          setHabits((current) =>
            current.map((habit) => (habit.id === habitId ? updatedHabit : habit))
          );
        }
        toast.success('Ajustes del hábito guardados');
      } catch (error) {
        setHabits(previousHabits);
        console.error('[useHabits] Error updating habit settings:', error);
        toast.error('No se pudieron guardar los ajustes.');
        throw error;
      }
    },
    [getTokenOrThrow, habits]
  );

  const createHabitQuick = useCallback(
    async (input: CreateHabitInput) => {
      try {
        const token = await getTokenOrThrow();
        const response = await fetch('/api/habits/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: input.name,
            type: input.type,
            target_number: input.targetValue,
            unit: input.unitLabel ?? null,
            tolerance: input.tolerance ?? 0,
            metric_type: input.metricType,
            unit_label: input.unitLabel ?? null,
            step_value: input.stepValue,
            metric_config: input.metricConfig,
          }),
        });

        const payload = await parseJsonResponse<{ data?: unknown; error?: string }>(response);
        if (!response.ok) {
          const message = 'Error creando hábito.';
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

        console.error('[useHabits] Error creating habit:', error);
        setStatusMessage('Error creando hábito.');
        toast.error('Error creando hábito.');
      }
    },
    [getTokenOrThrow, refreshUserData]
  );

  const updateHabitValue = useCallback((habitId: number, value: number) => {
    setValues((current) => ({ ...current, [habitId]: value }));
  }, []);

  const saveRecoveryCheckIn = useCallback(
    async (
      habitId: number,
      input:
        | { action: 'pledge'; pledgeText: string }
        | { action: 'skip_pledge' }
        | {
            action: 'review';
            keptPromise: boolean;
            difficulty: RecoveryDifficulty;
            triggerTags?: string[];
            notes?: string;
          }
    ) => {
      const previousCheckIns = recoveryCheckIns;
      const nowIso = new Date().toISOString();
      const optimisticRow: HabitRecoveryCheckIn = {
        habit_id: habitId,
        checkin_date: selectedDate,
        ...(previousCheckIns.find(
          (row) => row.habit_id === habitId && row.checkin_date === selectedDate
        ) ?? {}),
      };

      if (input.action === 'pledge') {
        optimisticRow.pledged_at = nowIso;
        optimisticRow.pledge_text = input.pledgeText;
        optimisticRow.pledge_status = 'pledged';
      } else if (input.action === 'skip_pledge') {
        optimisticRow.pledge_status = 'skipped';
      } else {
        optimisticRow.reviewed_at = nowIso;
        optimisticRow.kept_promise = input.keptPromise;
        optimisticRow.difficulty = input.difficulty;
        optimisticRow.trigger_tags = input.triggerTags ?? [];
        optimisticRow.notes = input.notes ?? null;
      }

      setRecoveryCheckIns((current) => [
        optimisticRow,
        ...current.filter(
          (row) => !(row.habit_id === habitId && row.checkin_date === selectedDate)
        ),
      ]);

      if (isE2EMockMode()) {
        toast.success('Check-in guardado');
        return;
      }

      try {
        const token = await getTokenOrThrow();
        const response = await fetch('/api/habits/recovery-checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            habit_id: habitId,
            date: selectedDate,
            action: input.action,
            pledge_text: input.action === 'pledge' ? input.pledgeText : undefined,
            kept_promise: input.action === 'review' ? input.keptPromise : undefined,
            difficulty: input.action === 'review' ? input.difficulty : undefined,
            trigger_tags: input.action === 'review' ? (input.triggerTags ?? []) : undefined,
            notes: input.action === 'review' ? input.notes : undefined,
          }),
        });
        const payload = await parseJsonResponse<{ data?: unknown; error?: string }>(response);
        if (!response.ok) throw new Error(payload?.error || 'No se pudo guardar el check-in.');
        if (isRecoveryCheckIn(payload?.data)) {
          setRecoveryCheckIns((current) => [
            payload.data as HabitRecoveryCheckIn,
            ...current.filter(
              (row) => !(row.habit_id === habitId && row.checkin_date === selectedDate)
            ),
          ]);
        }
        toast.success('Check-in guardado');
      } catch (error) {
        setRecoveryCheckIns(previousCheckIns);
        console.error('[useHabits] Error saving recovery check-in:', error);
        toast.error('No se pudo guardar el check-in.');
        throw error;
      }
    },
    [getTokenOrThrow, recoveryCheckIns, selectedDate]
  );

  return {
    habits,
    values,
    recentLogs,
    recoveryCheckIns,
    loading,
    authRequired,
    statusMessage,
    errorMessage,
    savingMap,
    saveHabit,
    saveHabitValue,
    createHabitQuick,
    updateHabitSettings,
    updateHabitValue,
    saveRecoveryCheckIn,
    selectedDate,
    setSelectedDate,
  };
}
