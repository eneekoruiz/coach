import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dailyLogSchema, type DailyLog } from '@/lib/schema';
import { getNormalizedDate } from '@/lib/date-utils';
import {
  enqueueDashboardMutation,
  listDashboardMutations,
  readDashboardCacheSync,
  removeDashboardMutation,
  writeDashboardSnapshot,
  type DashboardSnapshot,
} from '@/lib/local-dashboard-store';

const fallbackLog: DailyLog = {
  comidas: [],
  hidratacion_ml: 0,
  water_ml: 0,
  total_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fats_g: 0,
  habits_count: {},
  toxinas: [],
  bio_avatar: {
    estado_fisiologico: 'equilibrio estable',
    energia_fisica: 3,
    claridad_mental: 3,
  },
  metricas: {
    variacion_inercia: 0,
    aciertos: [],
    error_clave: 'sin datos todavía',
    accion_manana: 'registra el primer log para activar el seguimiento',
  },
};

const defaultDietTargets = {
  kcal: 2000,
  protein: 150,
  carbs: 200,
  fats: 70,
};

function waterFromLog(log: DailyLog | null) {
  return Number(log?.water_ml ?? log?.hidratacion_ml ?? 0);
}

function createTodayInsight(log: DailyLog | null, dailyWaterTarget: number) {
  if (!log) return 'HUD preparado. Registra una acción para activar el seguimiento de hoy.';

  const water = waterFromLog(log);
  const waterPct = dailyWaterTarget > 0 ? water / dailyWaterTarget : 0;

  if (waterPct < 0.35) return 'Ahora: prioriza hidratación. Un toque suma agua y sincroniza en segundo plano.';
  if ((log.total_kcal ?? 0) <= 0) return 'Ahora: registra la primera comida para calibrar el día.';
  if (log.metricas?.accion_manana) return log.metricas.accion_manana;
  return 'Hoy va en marcha. Mantén el foco en la siguiente acción simple.';
}

export function useDashboard() {
  const cachedSnapshot = useMemo(() => readDashboardCacheSync(), []);

  const [isLoading, setIsLoading] = useState(!cachedSnapshot);
  const [lastLog, setLastLog] = useState<DailyLog | null>(cachedSnapshot?.lastLog ?? fallbackLog);
  const [momentum, setMomentum] = useState(cachedSnapshot?.momentum ?? 100);
  const [insightText, setInsightText] = useState(
    cachedSnapshot?.insightText ?? 'HUD local listo. Sincronizando en segundo plano...'
  );
  const [dailyWaterTarget, setDailyWaterTarget] = useState(cachedSnapshot?.dailyWaterTarget ?? 2000);
  const [defaultGlassSize, setDefaultGlassSize] = useState(cachedSnapshot?.defaultGlassSize ?? 250);
  const [dietTargets, setDietTargets] = useState(cachedSnapshot?.dietTargets ?? defaultDietTargets);
  const [hasLoggedToday, setHasLoggedToday] = useState(cachedSnapshot?.hasLoggedToday ?? false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const persistSnapshot = useCallback(async (snapshot: Omit<DashboardSnapshot, 'updatedAt'>) => {
    await writeDashboardSnapshot({
      ...snapshot,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const syncWaterDelta = useCallback(async (delta: number, date: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado.');

    const { data: habits } = await supabase
      .from('user_habits')
      .select('id, name')
      .eq('user_id', user.id);

    let waterHabit = habits?.find((habit) => {
      const name = String(habit.name || '').toLowerCase();
      return name.includes('agua') || name.includes('hidratacion');
    });

    if (!waterHabit) {
      const { data: createdHabit, error: createError } = await supabase
        .from('user_habits')
        .insert({
          user_id: user.id,
          name: 'Agua',
          type: 'positive',
          is_custom: true,
          tolerance_threshold: 0,
          current_streak: 0,
          longest_streak: 0,
          shields: 0,
        })
        .select('id, name')
        .single();

      if (createError) throw createError;
      waterHabit = createdHabit;
    }

    if (!waterHabit) throw new Error('No se pudo preparar el hábito de agua.');

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) throw new Error('Sesión no disponible.');

    const response = await fetch('/api/habits/update-today', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        habit_id: waterHabit.id,
        delta,
        date,
      }),
    });

    if (!response.ok) {
      throw new Error('No se pudo sincronizar el agua.');
    }
  }, []);

  const flushQueuedMutations = useCallback(async () => {
    const queued = await listDashboardMutations();
    setPendingSyncCount(queued.length);

    for (const mutation of queued) {
      try {
        if (mutation.type === 'add_water') {
          await syncWaterDelta(mutation.payload.delta, mutation.payload.date);
        }
        await removeDashboardMutation(mutation.id);
      } catch {
        const remaining = await listDashboardMutations();
        setPendingSyncCount(remaining.length);
        return;
      }
    }

    setPendingSyncCount(0);
  }, [syncWaterDelta]);

  const loadDashboard = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        setInsightText('Inicia sesión para activar el HUD.');
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      const todayStr = getNormalizedDate(new Date());
      let nextWaterTarget = 2000;
      let nextGlassSize = 250;
      let nextDietTargets = defaultDietTargets;

      if (!user) {
        setInsightText('Inicia sesión para activar el HUD.');
        setIsLoading(false);
        return;
      }

      const metadata = user.user_metadata || {};
      nextWaterTarget = Number(metadata.daily_water_target_ml ?? 2000);
      nextGlassSize = Number(metadata.default_glass_size_ml ?? 250);
      setDailyWaterTarget(nextWaterTarget);
      setDefaultGlassSize(nextGlassSize);

      const { data: dietData } = await supabase
        .from('user_diet_plans')
        .select('target_kcal, target_protein, target_carbs, target_fats')
        .eq('user_id', user.id)
        .maybeSingle();

      if (dietData) {
        nextDietTargets = {
          kcal: Number(dietData.target_kcal ?? 2000),
          protein: Number(dietData.target_protein ?? 150),
          carbs: Number(dietData.target_carbs ?? 200),
          fats: Number(dietData.target_fats ?? 70),
        };
        setDietTargets(nextDietTargets);
      }

      await flushQueuedMutations();
      const remainingQueue = await listDashboardMutations();

      const { data: todayRecord, error } = await supabase
        .from('daily_logs')
        .select('health_momentum, ai_data, date')
        .eq('user_id', user.id)
        .eq('date', todayStr)
        .maybeSingle();

      if (error) throw error;

      const validated = todayRecord?.ai_data
        ? dailyLogSchema.safeParse(todayRecord.ai_data)
        : null;

      let nextLog = validated?.success ? validated.data : fallbackLog;

      if (remainingQueue.length > 0) {
        const cachedWater = waterFromLog(readDashboardCacheSync()?.lastLog ?? null);
        const remoteWater = waterFromLog(nextLog);
        const resolvedWater = Math.max(cachedWater, remoteWater);
        nextLog = {
          ...nextLog,
          water_ml: resolvedWater,
          hidratacion_ml: resolvedWater,
        };
      }

      const nextMomentum = typeof todayRecord?.health_momentum === 'number'
        ? todayRecord.health_momentum
        : 100;
      const nextInsight = createTodayInsight(nextLog, nextWaterTarget);

      setLastLog(nextLog);
      setHasLoggedToday(Boolean(todayRecord));
      setMomentum(nextMomentum);
      setInsightText(nextInsight);
      await persistSnapshot({
        lastLog: nextLog,
        momentum: nextMomentum,
        insightText: nextInsight,
        dailyWaterTarget: nextWaterTarget,
        defaultGlassSize: nextGlassSize,
        dietTargets: nextDietTargets,
        hasLoggedToday: Boolean(todayRecord),
      });
      setIsLoading(false);
    } catch (error) {
      console.warn('Dashboard sync failed; serving local HUD cache.', error);
      setIsLoading(false);
    }
  }, [flushQueuedMutations, persistSnapshot]);

  const updateWaterSettings = useCallback(async (target: number, glass: number) => {
    setDailyWaterTarget(target);
    setDefaultGlassSize(glass);
    await persistSnapshot({
      lastLog,
      momentum,
      insightText,
      dailyWaterTarget: target,
      defaultGlassSize: glass,
      dietTargets,
      hasLoggedToday,
    });

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          daily_water_target_ml: target,
          default_glass_size_ml: glass,
        },
      });
      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error updating user settings:', err);
      return false;
    }
  }, [dietTargets, hasLoggedToday, insightText, lastLog, momentum, persistSnapshot]);

  const addWaterIntake = useCallback(async () => {
    const todayStr = getNormalizedDate(new Date());
    const baseLog = lastLog ?? fallbackLog;
    const nextWater = waterFromLog(baseLog) + defaultGlassSize;
    const nextLog: DailyLog = {
      ...baseLog,
      water_ml: nextWater,
      hidratacion_ml: nextWater,
      habits_count: {
        ...(baseLog.habits_count || {}),
        agua: nextWater,
      },
    };
    const nextInsight = createTodayInsight(nextLog, dailyWaterTarget);

    setLastLog(nextLog);
    setInsightText(nextInsight);
    await persistSnapshot({
      lastLog: nextLog,
      momentum,
      insightText: nextInsight,
      dailyWaterTarget,
      defaultGlassSize,
      dietTargets,
      hasLoggedToday: true,
    });

    try {
      await syncWaterDelta(defaultGlassSize, todayStr);
      await flushQueuedMutations();
    } catch {
      await enqueueDashboardMutation({
        type: 'add_water',
        payload: {
          delta: defaultGlassSize,
          date: todayStr,
        },
      });
      const queued = await listDashboardMutations();
      setPendingSyncCount(queued.length);
    }
  }, [
    dailyWaterTarget,
    defaultGlassSize,
    dietTargets,
    flushQueuedMutations,
    hasLoggedToday,
    lastLog,
    momentum,
    persistSnapshot,
    syncWaterDelta,
  ]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const onOnline = () => {
      void flushQueuedMutations().then(() => loadDashboard());
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [flushQueuedMutations, loadDashboard]);

  return {
    isLoading,
    lastLog,
    momentum,
    insightText,
    dailyWaterTarget,
    defaultGlassSize,
    dietTargets,
    updateWaterSettings,
    addWaterIntake,
    reload: loadDashboard,
    hasLoggedToday,
    pendingSyncCount,
  };
}
